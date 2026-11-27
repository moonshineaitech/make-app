// Workspace generations are prepared separately and promoted only after a verified launch.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const leases = new Map();
async function read(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
async function atomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(temporary, file);
}
function within(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
function location(record, dataRoot) {
  const original = record.originRoot || record.root;
  const key = crypto.createHash('sha256').update(process.platform === 'win32' ? original.toLowerCase() : original).digest('hex').slice(0, 18);
  return path.join(dataRoot, 'projects', key);
}
async function acquire(folder) {
  await fs.mkdir(folder, { recursive: true });
  const lock = path.join(folder, 'operation.lock');
  const token = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await fs.mkdir(lock);
      await atomic(path.join(lock, 'owner.json'), { pid: process.pid, token });
      leases.set(token, { lock, folder });
      return token;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const owner = await read(path.join(lock, 'owner.json'));
      let alive = true;
      if (Number.isSafeInteger(owner?.pid) && owner.pid > 0) {
        try { process.kill(owner.pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
      }
      if (!owner && Date.now() - (await fs.stat(lock)).mtimeMs > 30000) alive = false;
      if (alive) throw new Error('Another AppDock operation owns this project. Stop it before preparing another environment.');
      if (!within(folder, lock)) throw new Error('Invalid workspace lock.');
      await fs.rm(lock, { recursive: true, force: true });
    }
  }
  throw new Error('Could not acquire the project workspace.');
}
async function release(record) {
  const token = record.workspaceLease, lease = leases.get(token);
  if (!lease) return;
  const owner = await read(path.join(lease.lock, 'owner.json'));
  if (owner?.token === token && within(lease.folder, lease.lock)) await fs.rm(lease.lock, { recursive: true, force: true });
  leases.delete(token);
  delete record.workspaceLease;
}
async function prepare(record, dataRoot, options, copy) {
  const original = record.originRoot || record.root;
  // Validate before creating directories, including when the cache is inside a symlinked source.
  const realOriginal = await fs.realpath(original);
  const relative = path.relative(path.toNamespacedPath(realOriginal), path.toNamespacedPath(path.resolve(dataRoot)));
  if (!relative || relative === '.' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('AppDock runtime data must be stored outside the selected source project.');
  const folder = location(record, dataRoot);
  const token = await acquire(folder);
  const leased = { ...record, workspaceLease: token };
  try {
    options.signal?.throwIfAborted();
    const fingerprint = await require('./core.cjs').fingerprint(original);
    const dependencyKey = await require('./setup-key.cjs').dependencyKey(record);
    const environment = crypto.createHash('sha256');
    if (options.copyEnvironment !== false) {
      for (const name of (await fs.readdir(original)).filter(n => n.startsWith('.env')).sort()) {
        const file = path.join(original, name);
        if ((await fs.lstat(file)).isFile()) environment.update(name).update(await fs.readFile(file));
      }
    }
    const identity = crypto.createHash('sha256').update(JSON.stringify({ contractVersion: 1, fingerprint, dependencyKey, plan: record.plan, settings: options.settingsFingerprint, environment: environment.digest('hex'), copyEnvironment: options.copyEnvironment !== false, target: record.selectedTarget, wrappers: record.wrappers })).digest('hex');
    const state = await read(path.join(folder, 'workspace.json'), { schemaVersion: 1 });
    const reusable = !options.forceFresh && [state.candidate, state.active].filter(Boolean);
    for (const candidate of reusable || []) {
      if (!within(folder, candidate)) throw new Error('Saved workspace escapes its project storage.');
      const metadata = await read(path.join(candidate, '.appdock', 'generation.json'));
      if (metadata?.identity === identity && ['prepared', 'verified'].includes(metadata.state)) {
        await require('./project-data.cjs').attach({ ...record, root: candidate, workspaceFolder: folder });
        options.onLog?.(candidate === state.active ? 'Using the verified project environment.\n' : 'Resuming the prepared project environment.\n');
        const source = path.join(candidate, path.relative(original, record.originSource || record.source || original));
        return { ...record, originRoot: original, originSource: record.originSource || record.source, root: candidate, source, staged: true, stateRoot:path.join(candidate,'.appdock'),workspaceMode:'copy',executionMode:'copy',workspaceFolder: folder, workspaceLease: token, workspaceGeneration: metadata.id, workspaceReused: candidate === state.active, workspaceVerified: candidate === state.active && metadata.state === 'verified', workspaceIdentity: identity };
      }
    }
    let root;
    const failed = state.failedGeneration && path.join(folder, 'generations', state.failedGeneration);
    for (const candidate of [state.candidate, failed].filter(Boolean)) {
      if (!within(path.join(folder, 'generations'), candidate) || candidate === state.active || candidate === state.previous) continue;
      if ((await fs.lstat(candidate).catch(() => null))?.isDirectory() && !(await fs.lstat(candidate)).isSymbolicLink()) { root = candidate; break; }
    }
    const id = root ? path.basename(root) : options.forceFresh ? Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') : identity.slice(0, 20);
    root ||= path.join(folder, 'generations', id);
    await atomic(path.join(root, '.appdock', 'generation.json'), { schemaVersion: 1, id, identity, fingerprint, dependencyKey, state: 'preparing' });
    await atomic(path.join(folder, 'workspace.json'), { ...state, candidate: root });
    let dependencySource;
    if (options.reuseDependencies !== false && record.nodeMajor && !record.workspaceFolders?.length && record.plan.setup.length === 1 && /^(?:npm|pnpm|yarn)$/.test(record.plan.setup[0].command[0])) {
      for (const previous of [state.active, path.join(folder, 'source')].filter(Boolean)) {
        if (!within(folder, previous)) continue;
        const marker = await read(path.join(previous, '.appdock', 'setup.json'));
        if (marker?.key === dependencyKey && await fs.stat(path.join(previous, 'node_modules')).then(s => s.isDirectory(), () => false)) { dependencySource = previous; break; }
      }

    }
    const staged = await copy(record, dataRoot, { ...options, workspaceRoot: root, dependencySource });
    if (dependencySource && staged.dependencyReused) {
      await atomic(path.join(root, '.appdock', 'setup.json'), { key: dependencyKey });
      options.onLog?.('Reusing matching prepared dependencies.\n');
    }
    if (await require('./core.cjs').fingerprint(original) !== fingerprint) throw new Error('Project source changed while preparing its environment. Retry with a stable project version.');
    const metadata = { schemaVersion: 1, id, identity, fingerprint, dependencyKey, selectedTarget: record.selectedTarget, createdAt: new Date().toISOString(), state: 'prepared' };
    await atomic(path.join(root, '.appdock', 'generation.json'), metadata);
    await require('./project-data.cjs').attach({...staged,workspaceFolder:folder});
    await atomic(path.join(folder, 'workspace.json'), { ...state, candidate: root });
    return { ...staged, stateRoot:path.join(root,'.appdock'),workspaceMode:'copy',executionMode:'copy',workspaceFolder: folder, workspaceLease: token, workspaceGeneration: id, workspaceReused: false, workspaceVerified: false, workspaceIdentity: identity, previousWorkspace: state.active || null };
  } catch (error) { await release(leased); throw error; }
}
async function commit(record) {
  if (!record.workspaceFolder) return;
  if (record.workspaceMode === 'project') {
    try {
      await atomic(path.join(record.stateRoot, 'verified.json'), { schemaVersion: 1, identity: record.workspaceIdentity, verifiedAt: new Date().toISOString() });
      record.workspaceVerified = true;
      record.workspaceReused = true;
    } finally { await release(record); }
    return;
  }
  try {
    const file = path.join(record.workspaceFolder, 'workspace.json');
    const state = await read(file, { schemaVersion: 1 });
    if (!within(record.workspaceFolder, record.root)) throw new Error('Workspace escapes its project storage.');
    const metadataFile = path.join(record.root, '.appdock', 'generation.json');
    const metadata = await read(metadataFile);
    if (!metadata || metadata.identity !== record.workspaceIdentity) throw new Error('Workspace identity changed before promotion.');
    if (!leases.has(record.workspaceLease)) {
      if (state.active === record.root && metadata.state === 'verified') return;
      throw new Error('Workspace promotion requires its active operation lease.');
    }
    await atomic(metadataFile, { ...metadata, state: 'verified', verifiedAt: new Date().toISOString() });
    await atomic(file, { schemaVersion: 1, active: record.root, previous: state.active === record.root ? state.previous : state.active || null, candidate: null, verifiedAt: new Date().toISOString() });
    record.previousWorkspace = state.active === record.root ? state.previous : state.active || null;
    record.workspaceVerified = true;
  } finally { await release(record); }
}
async function reject(record, error) {
  if (!record.workspaceFolder) return;
  if (record.workspaceMode === 'project') { await release(record); return; }
  try {
    if (!leases.has(record.workspaceLease)) return;
    const file = path.join(record.workspaceFolder, 'workspace.json'), state = await read(file, { schemaVersion: 1 });
    if (state.candidate === record.root) await atomic(file, { ...state, candidate: null, failedAt: new Date().toISOString(), failedGeneration: record.workspaceGeneration });
    record.workspaceVerified = state.active === record.root;
    record.previousWorkspace = state.active || null;
  } finally { await release(record); }
}
async function rollback(record) {
  if (!record.workspaceFolder) throw new Error('No saved environment is available for this project.');
  const token = await acquire(record.workspaceFolder), leased = { workspaceLease: token };
  try {
    const file = path.join(record.workspaceFolder, 'workspace.json'), state = await read(file);
    const target = record.workspaceVerified ? state?.previous : state?.active;
    if (!target || !within(record.workspaceFolder, target)) throw new Error('There is no earlier verified environment to restore.');
    const metadata = await read(path.join(target, '.appdock', 'generation.json'));
    if (metadata?.state !== 'verified') throw new Error('The earlier environment has not passed launch verification.');
    const source = path.join(target, path.relative(record.originRoot, record.originSource || record.originRoot));
    await atomic(file, { ...state, active: target, previous: state.active === target ? state.previous : state.active, candidate: null });
    const restored = await require('./core.cjs').detect(source, { target: metadata.selectedTarget });
    return { ...record, ...restored, id: record.id, name: record.name, originRoot: record.originRoot, originSource: record.originSource, root: target, source, staged: true, workspaceGeneration: metadata.id, workspaceIdentity: metadata.identity, workspaceVerified: true, usePreviousEnvironment: true, needsInstall: false };
  } finally { await release(leased); }
}
async function resume(record) {
  const token = await acquire(record.workspaceFolder);
  const leased = { ...record, workspaceLease: token };
  try {
    const metadata = await read(path.join(record.root, '.appdock', 'generation.json'));
    if (!within(record.workspaceFolder, record.root) || metadata?.state !== 'verified' || metadata.identity !== record.workspaceIdentity) throw new Error('Saved environment is no longer verified.');
    return leased;
  } catch (error) { await release(leased); throw error; }
}
async function existing(record, dataRoot, { settingsFingerprint, onLog = () => {}, signal } = {}) {
  const root = await fs.realpath(record.originRoot || record.root), source = record.originSource || record.source || root;
  const folder = location({ root }, dataRoot), token = await acquire(folder);
  const leased = { workspaceLease: token };
  try {
    signal?.throwIfAborted();
    const planKey = crypto.createHash('sha256').update(JSON.stringify({ plan: record.plan, target: record.selectedTarget })).digest('hex').slice(0, 16);
    const stateRoot = path.join(folder, 'direct', planKey);
    await fs.mkdir(path.join(folder, 'data'), { recursive: true });
    await fs.mkdir(stateRoot, { recursive: true });
    const identity = crypto.createHash('sha256').update(JSON.stringify({ source: await require('./core.cjs').fingerprint(root), dependencies: await require('./setup-key.cjs').dependencyKey({ ...record, root, originRoot: root }), settingsFingerprint })).digest('hex');
    const verified = await read(path.join(stateRoot, 'verified.json'));
    const result = { ...record, root, source, originRoot: root, originSource: source, stateRoot, workspaceFolder: folder, workspaceMode: 'project', workspaceGeneration: 'existing-folder', workspaceIdentity: identity, workspaceReused: verified?.identity === identity, workspaceVerified: verified?.identity === identity, workspaceLease: token, staged: false, executionMode: 'project' };
    delete result.previousWorkspace; delete result.usePreviousEnvironment;
    onLog('Using the existing project folder. No source copy is created.\n');
    await require('./managed.cjs').writeWrappers(result, root, stateRoot);
    return result;
  } catch (error) { await release(leased); throw error; }
}
module.exports = { prepare, existing, commit, reject, release, rollback, resume, atomic, read, within, location };

const fs = require('node:fs/promises');
const path = require('node:path');
async function exists(file) { return fs.access(file).then(() => true, () => false); }
async function installedTreeMatches(root) {
  try {
    const files = [path.join(root, 'pnpm-lock.yaml'), path.join(root, 'node_modules/.pnpm/lock.yaml')];
    const hashes = [];
    for (const file of files) {
      if ((await fs.stat(file)).size > 16 * 1024 * 1024) return false;
      hashes.push(require('node:crypto').createHash('sha256').update(await fs.readFile(file)).digest('hex'));
    }
    if (hashes[0] !== hashes[1]) return false;
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name) || !await exists(path.join(root, 'node_modules', name, 'package.json'))) return false;
    }
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function specification(root, pkg) {
  const declared = /^(npm|pnpm|yarn|bun)(?:@([^+]+)(?:\+.*)?)?$/.exec(pkg.packageManager || '');
  let manager = declared?.[1];
  if (!manager) manager = await exists(path.join(root, 'pnpm-workspace.yaml')) ? 'pnpm' : await exists(path.join(root, 'package-lock.json')) || await exists(path.join(root, 'npm-shrinkwrap.json')) ? 'npm' : await exists(path.join(root, 'pnpm-lock.yaml')) ? 'pnpm' : await exists(path.join(root, 'yarn.lock')) ? 'yarn' : await exists(path.join(root, 'bun.lock')) || await exists(path.join(root, 'bun.lockb')) ? 'bun' : 'npm';
  let version = declared?.[2];
  if (manager === 'yarn' && !version && await exists(path.join(root, 'yarn.lock')) && /^# yarn lockfile v1/m.test(await fs.readFile(path.join(root, 'yarn.lock'), 'utf8'))) version = '1.22.22';
  if (version && !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('packageManager must name an exact version, such as pnpm@10.17.1.');
  const locked = await exists(path.join(root, { npm: 'package-lock.json', pnpm: 'pnpm-lock.yaml', yarn: 'yarn.lock', bun: 'bun.lock' }[manager]));
  return { manager, version, locked };
}
function setup(spec) {
  if (spec.manager === 'npm') return spec.locked ? ['npm', 'ci', '--no-fund', '--no-audit'] : ['npm', 'install', '--no-fund', '--no-audit'];
  if (spec.manager === 'pnpm') return ['pnpm', 'install', ...(spec.locked ? ['--frozen-lockfile'] : [])];
  if (spec.manager === 'yarn') return ['yarn', 'install', ...(spec.locked ? [spec.version?.startsWith('1.') ? '--frozen-lockfile' : '--immutable'] : [])];
  return ['bun', 'install', ...(spec.locked ? ['--frozen-lockfile'] : [])];
}
function adapt(record, spec) {
  if (!record?.plan || spec.manager === 'npm') return record;
  const convert = task => {
    if (task.command[0] !== 'npm') return task;
    const command = task.command.slice(1), workspace = command.indexOf('--workspace');
    if (workspace >= 0) {
      const folder = command[workspace + 1]; command.splice(workspace, 2);
      if (spec.manager === 'pnpm') command.unshift('--filter', './' + folder.replaceAll('\\', '/'));
      else return { ...task, cwd: folder, command: [spec.manager, ...command.filter(value => value !== '--')] };
    }
    return { ...task, command: [spec.manager, ...command.filter(value => value !== '--')] };
  };
  const plan = { ...record.plan, requirements: record.plan.requirements.map(name => name === 'npm' ? spec.manager : name), setup: [{ command: setup(spec), cwd: '.' }], build: record.plan.build.map(convert), services: record.plan.services.map(convert), ...(record.plan.run ? { run: convert(record.plan.run) } : {}) };
  return { ...record, plan, packageManager: spec.manager, packageManagerVersion: spec.version || null, command: plan.run?.command || plan.services[0]?.command, toolchains: [...(record.toolchains || []), ...(['pnpm', 'yarn'].includes(spec.manager) ? [{ kind: 'package-manager', manager: spec.manager, version: spec.version }] : [])], evidence: [...(record.evidence || []), spec.version ? 'packageManager: ' + spec.manager + '@' + spec.version : spec.manager + ' lockfile/workspace'] };
}
async function prepare(spec, dataRoot, onLog, { signal, allowDownloads = true } = {}) {
  const manager = spec.manager;
  if (!['pnpm', 'yarn'].includes(manager)) throw new Error('Unsupported private package manager.');
  const node = await require('./managed.cjs').nodeRuntime(dataRoot, 24, onLog, { signal, allowDownloads });
  const folder = path.join(dataRoot, 'sdks', 'package-managers', manager + '-' + (spec.version || 'default'));
  const marker = path.join(folder, 'installed.json');
  let info = await require('./workspaces.cjs').read(marker);
  if (info && manager === 'pnpm') {
    const corepack = path.join(folder, 'node_modules/pnpm/bin/pnpm.mjs');
    if (!/\.[cm]?js$/.test(info.entry) && await exists(corepack)) {
      info = { ...info, entry: corepack };
      await require('./workspaces.cjs').atomic(marker, info);
    }
  }
  if (!info || !await exists(info.entry)) {
    if (!allowDownloads) throw new Error('Missing cached ' + manager + '. Allow private downloads for first use.');
    const packageName = manager === 'pnpm' ? 'pnpm' : spec.version?.startsWith('1.') ? 'yarn' : '@yarnpkg/cli-dist';
    let version = spec.version;
    if (!version) {
      const response = await fetch('https://registry.npmjs.org/' + packageName + '/latest', { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Could not resolve the official package manager release.');
      version = (await response.json()).version;
    }
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version || '')) throw new Error('Invalid package manager version.');
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'package.json'), JSON.stringify({ name: 'appdock-private-package-manager', private: true, dependencies: { [packageName]: version } }));
    onLog('Preparing private ' + manager + ' ' + version + '…\n');
    await require('./toolchains.cjs').run(node.node, [node.npm, 'install', '--prefix', folder, '--ignore-scripts', '--no-fund', '--no-audit', '--registry=https://registry.npmjs.org'], { onLog, signal });
    const packageRoot = path.join(folder, 'node_modules', packageName);
    const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
    const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[manager];
    if (typeof bin !== 'string') throw new Error('Package manager does not declare its executable.');
    let entry = path.resolve(packageRoot, bin);
    if (manager === 'pnpm' && !/\.[cm]?js$/.test(entry) && await exists(path.join(packageRoot, 'bin/pnpm.mjs'))) entry = path.join(packageRoot, 'bin/pnpm.mjs');
    if (!require('./workspaces.cjs').within(packageRoot, entry)) throw new Error('Package manager entry escapes its installation.');
    if (!await exists(entry)) throw new Error('Package manager installation is incomplete.');
    info = { kind: manager, version, entry, installedAt: new Date().toISOString() };
    await require('./workspaces.cjs').atomic(marker, info);
  }
  return { env: { APPDOCK_NODE: node.node, APPDOCK_NPM: node.npm, ['APPDOCK_PM_' + manager.toUpperCase()]: info.entry, PATH: node.directory + path.delimiter + process.env.PATH }, tool: { kind: manager, version: info.version } };
}
module.exports = { specification, setup, adapt, prepare, installedTreeMatches };

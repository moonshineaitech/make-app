const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { stage } = require('../src/managed.cjs');
const workspaces = require('../src/workspaces.cjs');
const { ProjectSession } = require('../src/engine.cjs');
async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'appdock-recovery-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const source = path.join(folder, 'original'), data = path.join(folder, 'data');
  await fs.mkdir(source); await fs.mkdir(data);
  await fs.writeFile(path.join(source, 'main.cjs'), 'console.log("working version")');
  return { source, data, record: { source, root: source, automatic: true, plan: { mode: 'tool', run: [process.execPath, 'main.cjs'] } } };
}
test('failed replacement preserves the working generation and rollback launches its actual code', async t => {
  const { source, data, record } = await fixture(t);
  const first = await stage(record, data);
  const run = new ProjectSession(first); await run.start(); await run.stop();
  await fs.writeFile(path.join(source, 'main.cjs'), 'throw new Error("bad replacement")');
  const next = await stage(record, data);
  assert.notEqual(first.root, next.root);
  await assert.rejects(new ProjectSession(next).start(), /exited with code/);
  const state = await workspaces.read(path.join(next.workspaceFolder, 'workspace.json'));
  assert.equal(state.active, first.root); assert.equal(state.candidate, null);
  assert.equal(await fs.readFile(path.join(first.root, 'main.cjs'), 'utf8'), 'console.log("working version")');
  const restored = await workspaces.rollback(next);
  let output = ''; const session = new ProjectSession(await workspaces.resume(restored), { onLog: text => output += text });
  await session.start(); await session.stop(); assert.match(output, /working version/);
  assert.match(await fs.readFile(path.join(source, 'main.cjs'), 'utf8'), /bad replacement/);
});
test('unchanged warm launches reuse the verified generation; changed environment creates a separate generation', async t => {
  const { source, data, record } = await fixture(t);
  await fs.writeFile(path.join(source, '.env'), 'KEY=one');
  const first = await stage(record, data); await new ProjectSession(first).start();
  const warm = await stage(record, data); assert.equal(warm.root, first.root); assert.equal(warm.workspaceReused, true); await workspaces.release(warm);
  await fs.writeFile(path.join(source, '.env'), 'KEY=two');
  const changed = await stage(record, data); assert.notEqual(changed.root, first.root); await workspaces.reject(changed);
  assert.equal(await fs.readFile(path.join(first.root, '.env'), 'utf8'), 'KEY=one');
});
test('workspace operations serialize and an interrupted owner can be recovered', async t => {
  const { data, record } = await fixture(t);
  const first = await stage(record, data); await assert.rejects(stage(record, data), /Another AppDock operation/);
  await workspaces.reject(first);
  const folder = workspaces.location(record, data), lock = path.join(folder, 'operation.lock');
  await fs.mkdir(lock); await workspaces.atomic(path.join(lock, 'owner.json'), { pid: 2147483647, token: 'interrupted-owner' });
  const recovered = await stage(record, data); await workspaces.reject(recovered);
  await fs.mkdir(lock); await fs.utimes(lock, new Date(0), new Date(0));
  const incompleteOwner = await stage(record, data); await workspaces.reject(incompleteOwner);
});
test('cancelled staging releases its operation lease and retains the previous environment', async t => {
  const { data, record } = await fixture(t), first = await stage(record, data);
  await new ProjectSession(first).start();
  const controller = new AbortController(); controller.abort(new Error('Operation cancelled.'));
  await assert.rejects(stage(record, data, { signal: controller.signal }), /cancelled/);
  const next = await stage(record, data); assert.equal(next.root, first.root); await workspaces.release(next);
});
test('functional readiness rejects a responding but incorrect app and never promotes it', async t => {
  const { record, data } = await fixture(t);
  record.plan = { mode: 'web', run: [process.execPath, '-e', 'require("http").createServer((q,s)=>s.end(JSON.stringify({healthy:false}))).listen(process.env.PORT,"127.0.0.1")'], verify: [{ url: 'http://127.0.0.1:{port}', json: { healthy: true }, timeoutMs: 350 }] };
  const staged = await stage(record, data), session = new ProjectSession(staged);
  await assert.rejects(session.start(), /Expected JSON field/);
  assert.equal(session.failureDetails.code, 'verification'); assert.equal(session.children.size, 0);
  const state = await workspaces.read(path.join(staged.workspaceFolder, 'workspace.json'));
  assert.ok(!state.active);
});
test('functional readiness and run receipts record real checks without secret values', async t => {
  const { record, data } = await fixture(t);
  record.plan = { mode: 'web', run: [process.execPath, '-e', 'require("http").createServer((q,s)=>s.end(JSON.stringify({status:{healthy:true}}))).listen(process.env.PORT,"127.0.0.1")'], verify: [{ url: 'http://127.0.0.1:{port}', status: 200, json: { 'status.healthy': true }, timeoutMs: 1000 }] };
  const staged = await stage(record, data), session = new ProjectSession(staged, { env: { MY_API_KEY: 'do-not-store-this' } }); t.after(() => session.stop());
  const result = await session.start(); assert.equal(result.readiness, 'verified');
  const receipt = await fs.readFile(path.join(staged.root, '.appdock', 'last-run.json'), 'utf8');
  assert.ok(!receipt.includes('do-not-store-this')); assert.equal(JSON.parse(receipt).outcome, 'running');
  await session.stop(); assert.equal((await workspaces.read(path.join(staged.root, '.appdock', 'last-run.json'))).outcome, 'stopped');
});
test('failure classification supplies specific actions for dependency conflicts, ports and full disks', () => {
  const { classify } = require('../src/failures.cjs');
  assert.equal(classify(new Error('setup exited 1'), { phase: 'setup', output: 'npm ERESOLVE conflict' }).code, 'dependency-conflict');
  assert.equal(classify(new Error('EADDRINUSE')).code, 'port-in-use');
  assert.equal(classify(new Error('ENOSPC')).code, 'disk-full');
});
test('persistent managed data survives a generation replacement and supports a stopped snapshot', async t => {
  const { source, data, record } = await fixture(t), first = await stage(record, data);
  await fs.writeFile(path.join(first.root, '.data', 'notes.json'), '{"saved":true}');
  await new ProjectSession(first).start();
  await fs.writeFile(path.join(source, 'main.cjs'), 'console.log("next version")');
  const next = await stage(record, data); await new ProjectSession(next).start();
  assert.equal(await fs.readFile(path.join(next.root, '.appdock/data/notes.json'), 'utf8'), '{"saved":true}');
  const snapshot = await require('../src/project-data.cjs').snapshot(next);
  assert.equal(await fs.readFile(path.join(snapshot, 'contents/notes.json'), 'utf8'), '{"saved":true}');
  assert.equal((await workspaces.read(path.join(snapshot, 'snapshot.json'))).completed, true);
});
test('readiness follows local application redirects and blocks redirects to another origin', async t => {
  const server = require('node:http').createServer((req, res) => {
    if (req.url === '/ok') res.end('{"ok":true}');
    else { res.writeHead(302, { location: req.url === '/outside' ? 'http://example.invalid/' : '/ok' }); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const url = 'http://127.0.0.1:' + server.address().port;
  const { probe } = require('../src/readiness.cjs');
  assert.equal((await probe({ url, json: { ok: true } }, value => value)).level, 'verified');
  await assert.rejects(probe({ url: url + '/outside' }, value => value), /leaves the local/);
});
test('Windows job memory limits prevent a program from allocating beyond its project budget', { skip: process.platform !== 'win32' }, async t => {
  const { record } = await fixture(t);
  record.plan = { mode: 'tool', limits: { memoryMB: 64, cpuPercent: 75 }, run: ['python', '-c', 'try:\n x=bytearray(256*1024*1024)\n print("UNEXPECTED_ALLOCATION")\nexcept MemoryError:\n print("MEMORY_LIMIT_ENFORCED")'] };
  let output = ''; const session = new ProjectSession(record, { onLog: text => output += text }); t.after(() => session.stop());
  await session.start(); assert.match(output, /MEMORY_LIMIT_ENFORCED/); assert.ok(!output.includes('[app] UNEXPECTED_ALLOCATION\n'));
});
test('disk-pressure preflight preserves a working version and resumes its unfinished replacement', async t => {
  const { source, data, record } = await fixture(t), first = await stage(record, data); await new ProjectSession(first).start();
  await fs.writeFile(path.join(source, 'main.cjs'), 'console.log("replacement")');
  const originalStatfs = fs.statfs;
  fs.statfs = async () => ({ bavail: 0, bsize: 4096 });
  try { await assert.rejects(stage(record, data), /ENOSPC: Workspace needs/); } finally { fs.statfs = originalStatfs; }
  const stateFile = path.join(first.workspaceFolder, 'workspace.json'), interrupted = await workspaces.read(stateFile);
  assert.equal(interrupted.active, first.root); assert.notEqual(interrupted.candidate, first.root);
  const resumed = await stage(record, data); assert.equal(resumed.root, interrupted.candidate);
  assert.equal(await fs.readFile(path.join(first.root, 'main.cjs'), 'utf8'), 'console.log("working version")');
  await new ProjectSession(resumed).start(); assert.equal((await workspaces.read(stateFile)).active, resumed.root);
});
test('inherited credentials are scoped to declared or inspected variable names',()=>{const {projectEnvironment,fingerprint}=require('../src/environment.cjs');const inherited={PATH:'tools',OPENAI_API_KEY:'unrelated-secret',SERVICE_TOKEN:'requested-secret',NODE_ENV:'development'};const record={plan:{requiredEnv:[]},requestedEnvironmentNames:['SERVICE_TOKEN']};const environment=projectEnvironment(record,{},inherited);assert.equal(environment.OPENAI_API_KEY,undefined);assert.equal(environment.SERVICE_TOKEN,'requested-secret');assert.equal(environment.PATH,'tools');assert.notEqual(fingerprint(record,{},inherited),fingerprint(record,{SERVICE_TOKEN:'changed'},inherited));assert.ok(!fingerprint(record,{},inherited).includes('requested-secret'));});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { existing, release } = require('../src/workspaces.cjs');
const { ProjectSession } = require('../src/engine.cjs');
async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'appdock-direct-'));
  const root = path.join(folder, 'project'), data = path.join(folder, 'state');
  await fs.mkdir(root); await fs.mkdir(data);
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  return { root: await fs.realpath(root), data };
}
test('existing-folder execution creates no source copy and keeps supported build outputs outside the project', async t => {
  const { root, data } = await fixture(t);
  await fs.writeFile(path.join(root, 'main.cjs'), 'console.log("READ="+require("fs").readFileSync(process.argv[2],"utf8"))');
  const record = { root, source: root, adapter: 'c', plan: { mode: 'tool', build: [[process.execPath, '-e', 'require("fs").writeFileSync(process.argv[1],"42")', '{root}/.appdock/bin/result.txt']], run: [process.execPath, 'main.cjs', '.appdock/bin/result.txt'] } };
  const prepared = await existing(record, data); assert.equal(prepared.root, root); assert.equal(prepared.staged, false);
  let output = ''; const session = new ProjectSession(prepared, { onLog: text => output += text });
  await session.start(); await session.stop(); assert.match(output, /READ=42/);
  assert.deepEqual(await fs.readdir(root), ['main.cjs']);
  assert.equal(await fs.readFile(path.join(prepared.stateRoot, 'bin/result.txt'), 'utf8'), '42');
  await assert.rejects(fs.access(path.join(prepared.workspaceFolder, 'generations')));
  assert.equal(JSON.parse(await fs.readFile(path.join(prepared.stateRoot, 'last-run.json'), 'utf8')).outcome, 'completed');
  const warm = await existing(record, data); assert.equal(warm.workspaceReused, true); await release(warm);
  await fs.writeFile(path.join(root, 'main.cjs'), 'console.log("updated")');
  const changed = await existing(record, data); assert.equal(changed.workspaceReused, false); await release(changed);
});
test('Vite wrappers outside source retain configuration and remap local backend ports', async t => {
  const { root, data } = await fixture(t);
  await fs.writeFile(path.join(root, 'vite.config.mjs'), 'export default {server:{strictPort:false,proxy:{"/api":"http://localhost:4000"}},custom:"kept"}');
  const record = { root, source: root, wrappers: [{ folder: '.', id: 'web' }], plan: { mode: 'tool', run: [process.execPath, '-e', ''] } };
  const prepared = await existing(record, data); t.after(() => release(prepared));
  const previousPort = process.env.PORT, previousProxy = process.env.APPDOCK_PROXY_4000;
  process.env.PORT = '45321'; process.env.APPDOCK_PROXY_4000 = 'http://127.0.0.1:45322';
  try {
    const config = await (await import(require('node:url').pathToFileURL(path.join(prepared.stateRoot, 'vite-web.mjs')).href)).default({});
    assert.equal(config.custom, 'kept'); assert.equal(config.server.strictPort, true); assert.equal(config.server.port, 45321);
    assert.equal(config.server.proxy['/api'], 'http://127.0.0.1:45322'); assert.ok(config.cacheDir.startsWith(prepared.stateRoot));
    assert.deepEqual(await fs.readdir(root), ['vite.config.mjs']);
  } finally {
    if (previousPort === undefined) delete process.env.PORT; else process.env.PORT = previousPort;
    if (previousProxy === undefined) delete process.env.APPDOCK_PROXY_4000; else process.env.APPDOCK_PROXY_4000 = previousProxy;
  }
});
test('existing Node workspace dependencies are discovered without invoking installers', async t => {
  const { root } = await fixture(t), folder = path.join(root, 'web'); await fs.mkdir(folder);
  await fs.writeFile(path.join(root, 'package.json'), '{}');
  await fs.writeFile(path.join(folder, 'package.json'), JSON.stringify({ dependencies: { 'example-dependency': '1.0.0' } }));
  const record = { root, nodeMajor: 24, workspaceFolders: ['web'] }, { nodeDependencies } = require('../src/installed.cjs');
  assert.equal(await nodeDependencies(record), false);
  await fs.mkdir(path.join(root, 'node_modules/example-dependency'), { recursive: true });
  await fs.writeFile(path.join(root, 'node_modules/example-dependency/package.json'), '{"name":"example-dependency","version":"1.0.0"}');
  assert.equal(await nodeDependencies(record), true);
});

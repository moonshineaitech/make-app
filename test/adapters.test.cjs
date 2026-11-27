const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
test('declarative adapters extend discovery and execution without running inspection hooks', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appdock-adapter-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source'), data = path.join(root, 'data'), directory = path.join(root, 'adapters'); await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'custom.project'), 'example');
  const file = path.join(root, 'adapter.json'); await fs.writeFile(file, JSON.stringify({ apiVersion: 1, id: 'example.custom', name: 'Custom framework', match: { files: ['custom.project'] }, plan: { mode: 'tool', run: [process.execPath, '-e', 'console.log("CUSTOM_ADAPTER_RAN")'] } }));
  await require('../src/adapters.cjs').install(file, directory);
  const record = await require('../src/core.cjs').detect(source, { adapterDirectory: directory }); assert.equal(record.adapter, 'example.custom');
  assert.equal(await fs.readdir(source).then(files => files.length), 1);
  const staged = await require('../src/managed.cjs').stage(record, data); let output = '';
  const session = new (require('../src/engine.cjs').ProjectSession)(staged, { onLog: text => output += text }); await session.start(); await session.stop(); assert.match(output, /CUSTOM_ADAPTER_RAN/);
});
test('adapter contracts reject escaping matches and unsupported versions', () => {
  const { validate } = require('../src/adapters.cjs');
  assert.throws(() => validate({ apiVersion: 2, id: 'a.b' }), /apiVersion/);
  assert.throws(() => validate({ apiVersion: 1, id: 'a.b', name: 'Bad', match: { files: ['../secrets'] } }), /inside/);
});

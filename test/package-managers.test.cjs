const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { detect } = require('../src/core.cjs');
test('pnpm workspace inference uses its declared manager and frozen lockfile', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appdock-pnpm-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries({ 'package.json': JSON.stringify({ packageManager: 'pnpm@10.17.1', scripts: { dev: 'node ignored-orchestrator.js' } }), 'pnpm-lock.yaml': 'lockfileVersion: 9.0', 'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n", 'packages/server/package.json': JSON.stringify({ scripts: { dev: 'node index.cjs' } }), 'packages/server/index.cjs': 'require("http").createServer().listen(process.env.PORT)', 'packages/web/package.json': JSON.stringify({ scripts: { dev: 'vite' } }) })) { const file = path.join(root, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); }
  const record = await detect(root);
  assert.equal(record.plan.services.length, 2);
  assert.deepEqual(record.plan.setup[0].command, ['pnpm', 'install', '--frozen-lockfile']);
  assert.deepEqual(record.plan.services.find(s => s.id === 'packages_web').command.slice(0, 5), ['pnpm', '--filter', './packages/web', 'run', 'dev']);
  assert.ok(record.plan.requirements.includes('pnpm')); assert.ok(!record.plan.requirements.includes('npm'));
  assert.equal(record.toolchains[0].manager, 'pnpm'); assert.equal(record.executionSummary.executionStarted, false);
});
test('Yarn modern projects retain package scripts for Plug’n’Play resolution', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appdock-yarn-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.9.2', scripts: { start: 'node index.cjs' } }));
  await fs.writeFile(path.join(root, 'index.cjs'), 'console.log(process.argv)'); await fs.writeFile(path.join(root, 'yarn.lock'), '');
  const record = await detect(root); assert.deepEqual(record.plan.run.command, ['yarn', 'run', 'start']); assert.deepEqual(record.plan.setup[0].command, ['yarn', 'install', '--immutable']);
});

test('npm lockfile wins over an incidental pnpm lockfile unless the manager is explicit',async t=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'appdock-locks-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'package-lock.json'),'{}');await fs.writeFile(path.join(root,'pnpm-lock.yaml'),'lockfileVersion: 9');const pm=require('../src/package-managers.cjs');assert.equal((await pm.specification(root,{})).manager,'npm');assert.equal((await pm.specification(root,{packageManager:'pnpm@10.17.1'})).manager,'pnpm');});

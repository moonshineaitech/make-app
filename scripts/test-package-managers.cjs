const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const { detect, fingerprint } = require('../src/core.cjs');
const { stage } = require('../src/managed.cjs');
const { ProjectSession, launch } = require('../src/engine.cjs');
const tools = require('../src/toolchains.cjs');
async function main() {
  const data = path.resolve(process.env.APPDOCK_DATA || '.language-test-data'), fixtures = path.join(data, 'package-manager-fixtures'), results = [];
  for (const [manager, version] of [['pnpm', '10.17.1'], ['yarn', '4.9.2']]) {
    let session, record; const onLog = text => process.stdout.write('[' + manager + '] ' + text);
    try {
      const root = path.join(fixtures, manager); await fs.mkdir(path.join(root, 'math'), { recursive: true });
      await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'pm-acceptance-' + manager, version: '1.0.0', private: true, packageManager: manager + '@' + version, scripts: { start: 'node index.cjs' }, dependencies: { 'local-math': 'file:./math' } }));
      await fs.writeFile(path.join(root, 'math/package.json'), JSON.stringify({ name: 'local-math', version: '1.0.0', main: 'index.cjs' }));
      await fs.writeFile(path.join(root, 'math/index.cjs'), 'exports.sum=(a,b)=>a+b');
      await fs.writeFile(path.join(root, 'index.cjs'), 'console.log("APPDOCK_SUM="+require("local-math").sum(19,23),process.argv.slice(2).join(" "))');
      const prepared = await require('../src/package-managers.cjs').prepare({ manager, version }, data, onLog);
      // Generate the test fixture's native lockfile, then require a frozen install in the staged copy.
      const child = await launch(manager, ['install'], { cwd: root, env: { ...process.env, ...prepared.env }, stdio: 'ignore', windowsHide: true });
      await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(new Error('Fixture lockfile generation timed out')); }, 120000); child.once('error', reject); child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('Fixture installation exited ' + code)); }); });
      const before = await fingerprint(root); record = await stage(await detect(root), data, { reuseDependencies: false, copyEnvironment: false, onLog });
      const runtime = await tools.prepare(record, data, onLog); let output = '';
      session = new ProjectSession(record, { env: runtime.env, onLog: text => { output += text; onLog(text); } });
      await session.tasks(session.plan.setup, 'setup'); await require('../src/setup-key.cjs').remember(record);
      const result = await session.start(['argument with spaces']); assert.equal(result.code, 0); assert.match(output, /APPDOCK_SUM=42 argument with spaces/); await session.stop();
      assert.equal(await fingerprint(root), before);
      results.push({ manager, version, passed: true, nativeLockfile: true, privateManager: true, localDependencyResolved: true, sourcePreserved: true });
    } catch (error) { await session?.stop(); if (record) await require('../src/workspaces.cjs').reject(record, error); results.push({ manager, passed: false, error: error.stack }); }
    await fs.writeFile(path.join(data, 'package-manager-results.json'), JSON.stringify({ passed: results.every(result => result.passed), results }, null, 2));
  }
  if (results.some(result => !result.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { detect } = require('./runtime/core.cjs');
const { projectPath } = require('./runtime/integration.cjs');
const platform = require('./runtime/platform.cjs');

async function inspect({ path: source, target }) {
  const root = await projectPath(source), record = await detect(root, { target }), plan = record.plan;
  return {
    path: root, desktop: platform.host(), webExportAvailable: !!await require('./runtime/web-export.cjs').webRoot(root),
    name: record.name, type: record.label, kind: record.kind, automatic: !!record.automatic,
    mode: plan?.mode || record.kind, configured: plan?.configured !== false,
    needsInstall: !!record.needsInstall, nodeMajor: record.nodeMajor || null,
    services: (plan?.services || []).map(s => ({ id: s.id })), setupTasks: plan?.setup?.length || 0,
    buildTasks: plan?.build?.length || 0, requiredEnvironment: plan?.requiredEnv || [],
    candidates: record.candidates?.map(c => ({ name: c.name, path: c.path, type: c.label })),
    language: record.language || record.framework, targets: record.targets || [],
    selectedTarget: record.selectedTarget || null, explanation: record.executionSummary, executionStarted: false
  };
}

async function builder() {
  const executable = process.env.APPDOCK_BUILDER || process.env.APPDOCK_EXECUTABLE ||
    path.join(__dirname, '../bin', platform.host().builderName);
  if (!path.isAbsolute(executable) || !await fs.stat(executable).catch(() => null)) {
    throw new Error('The Make App builder is missing. Use the complete bundle for your OS.');
  }
  return executable;
}

async function defaultOutput(root, format) {
  const directory = path.join(path.dirname(root), 'Make App Outputs');
  const name = path.basename(root).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/, '') || 'Project';
  const suffix = format === 'web' ? '-web' : platform.host().extension;
  for (let i = 0; i < 1000; i++) {
    const output = path.join(directory, name + (i ? '-' + (i + 1) : '') + suffix);
    try { await fs.lstat(output); } catch (error) { if (error.code === 'ENOENT') return output; throw error; }
  }
  throw new Error('Choose an output path; too many apps with this name already exist.');
}

async function make({ path: source, output, target, format = 'desktop' }) {
  if (!['desktop', 'web'].includes(format)) throw new Error('Choose desktop or web output.');
  const root = await projectPath(source);
  output ||= await defaultOutput(root, format);
  if (!path.isAbsolute(output)) throw new Error('Choose an absolute output path.');
  if (format === 'web') return { ...await require('./runtime/web-export.cjs').exportWeb(root, output, { name: path.basename(root) }), executionStarted: false };
  const info = platform.host();
  if (path.extname(output).toLowerCase() !== info.extension) throw new Error('Choose a ' + info.extension + ' output path for ' + info.name + '.');
  const executable = await builder();
  await fs.mkdir(path.dirname(output), { recursive: true });
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'make-app-result-'));
  const resultFile = path.join(temporary, 'result.json');
  try {
    await new Promise((resolve, reject) => {
      const invocation = platform.builderCommand(executable, ['--make-executable', root, '--output=' + output,
        '--result-file=' + resultFile, ...(target ? ['--target=' + target] : [])]);
      const child = spawn(invocation.command, invocation.args, {
        env: { ...process.env, ...(process.platform === 'linux' ? { APPIMAGE_EXTRACT_AND_RUN: '1' } : {}) },
        shell: false, windowsHide: true, stdio: 'ignore'
      });
      const timer = setTimeout(() => { child.kill(); reject(new Error('Executable creation exceeded two minutes.')); }, 120000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('Executable creation failed. Check that the project and output path are available.')); });
    });
    return { ...JSON.parse(await fs.readFile(resultFile, 'utf8')), executionStarted: false };
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}

async function open({ path: source }) {
  const root = await projectPath(source), executable = await builder();
  await new Promise((resolve, reject) => {
    const invocation = platform.builderCommand(executable, ['--open-project=' + root]);
    const child = spawn(invocation.command, invocation.args, {
      env: { ...process.env, ...(process.platform === 'linux' ? { APPIMAGE_EXTRACT_AND_RUN: '1' } : {}) },
      shell: false, windowsHide: true, detached: true, stdio: 'ignore'
    });
    child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
  });
  return { path: root, handoffRequested: true, executionStarted: false, message: 'Opened the converter with this project selected.' };
}

async function projects() { return { projects: await require('./runtime/managed.cjs').codexProjects(), executionStarted: false }; }
module.exports = { inspect, make, open, projects, defaultOutput, builder };

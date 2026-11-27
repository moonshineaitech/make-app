// Persistent state has a stable location independent of replaceable code generations.
const fs = require('node:fs/promises');
const path = require('node:path');
const { within, atomic } = require('./workspaces.cjs');
async function attach(record) {
  const directory = path.join(record.workspaceFolder, 'data');
  await fs.mkdir(directory, { recursive: true });
  const realDirectory = await fs.realpath(directory);
  for (const relative of ['.data', '.appdock/data']) {
    const link = path.join(record.root, relative);
    try {
      const stat = await fs.lstat(link);
      if (!stat.isSymbolicLink() || path.relative(await fs.realpath(link), realDirectory) !== '') throw new Error('Persistent data path conflicts with an existing project path: ' + relative);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.symlink(directory, link, process.platform === 'win32' ? 'junction' : 'dir');
    }
  }
  return directory;
}
async function snapshot(record) {
  if (!record.workspaceFolder) throw new Error('This project has no managed data directory.');
  const source = path.join(record.workspaceFolder, 'data');
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + require('node:crypto').randomBytes(3).toString('hex');
  const target = path.join(record.workspaceFolder, 'data-snapshots', id);
  if (!within(record.workspaceFolder, target)) throw new Error('Invalid snapshot location.');
  await fs.mkdir(target, { recursive: true });
  await fs.cp(source, path.join(target, 'contents'), { recursive: true, dereference: false, filter: async file => {
    if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('Snapshots do not follow data-directory symbolic links.');
    return true;
  } });
  await atomic(path.join(target, 'snapshot.json'), { schemaVersion: 1, createdAt: new Date().toISOString(), generation: record.workspaceGeneration, scope: 'AppDock managed data only; application data elsewhere is not included', completed: true });
  return target;
}
module.exports = { attach, snapshot };

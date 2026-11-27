const fs = require('node:fs/promises');
const path = require('node:path');
// This checks availability, not the integrity of an existing installation.
async function nodeDependencies(record) {
  if (!record.nodeMajor) return false;
  const root = record.originRoot || record.root;
  const folders = new Set(['.', ...(record.workspaceFolders || []), ...(record.wrappers || []).map(wrapper => wrapper.folder)]);
  for (const folder of folders) {
    let pkg;
    try { pkg = JSON.parse(await fs.readFile(path.join(root, folder, 'package.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name)) return false;
      let directory = path.resolve(root, folder), found = false;
      while (require('./core.cjs').inside(root, directory)) {
        try { await fs.access(path.join(directory, 'node_modules', name, 'package.json')); found = true; break; } catch {}
        if (directory === root) break;
        directory = path.dirname(directory);
      }
      if (!found) return false;
    }
  }
  return true;
}
module.exports = { nodeDependencies };

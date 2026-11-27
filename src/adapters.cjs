// Installed adapters are declarative data. Discovery cannot run their code.
const fs = require('node:fs/promises');
const path = require('node:path');
const { validate: validatePlan, record } = require('./projects.cjs');
const { atomic } = require('./workspaces.cjs');
function validate(input) {
  if (input?.apiVersion !== 1 || !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(input.id || '')) throw new Error('Adapter needs apiVersion 1 and a publisher.name id.');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120) throw new Error('Adapter needs a readable name.');
  if (!Array.isArray(input.match?.files) || !input.match.files.length || input.match.files.length > 20 || input.match.files.some(file => typeof file !== 'string' || !file || path.isAbsolute(file) || file.split(/[\\/]/).some(part => !part || part === '..') || /[*?\0]/.test(file))) throw new Error('Adapter match files must be literal paths inside the project.');
  return { apiVersion: 1, id: input.id, name: input.name, language: typeof input.language === 'string' ? input.language.slice(0, 50) : 'custom', match: { files: input.match.files }, plan: validatePlan(input.plan) };
}
async function load(file) {
  if ((await fs.stat(file)).size > 128 * 1024) throw new Error('Adapter exceeds 128 KB.');
  return validate(JSON.parse(await fs.readFile(file, 'utf8')));
}
async function install(file, directory) {
  const adapter = await load(file), destination = path.join(directory, adapter.id + '.json');
  await atomic(destination, adapter);
  return { id: adapter.id, installed: true, executionStarted: false };
}
async function discover(root, directory) {
  if (!directory) return null;
  let names; try { names = await fs.readdir(directory); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const matches = [];
  for (const name of names.filter(name => name.endsWith('.json')).sort().slice(0, 100)) {
    const adapter = await load(path.join(directory, name)); let matching = true;
    for (const file of adapter.match.files) {
      const target = path.resolve(root, file), real = await fs.realpath(target).catch(() => null);
      if (!real || !require('./core.cjs').inside(await fs.realpath(root), real)) { matching = false; break; }
    }
    if (matching) matches.push(adapter);
  }
  if (matches.length > 1) throw new Error('Several installed adapters match this project: ' + matches.map(adapter => adapter.id).join(', ') + '. Add an explicit launch recipe to choose its behavior.');
  if (!matches.length) return null;
  const adapter = matches[0];
  return { ...record(root, adapter.plan, adapter.name), automatic: true, adapter: adapter.id, adapterVersion: 1, language: adapter.language, evidence: adapter.match.files.map(file => adapter.id + ': ' + file) };
}
module.exports = { validate, load, install, discover };

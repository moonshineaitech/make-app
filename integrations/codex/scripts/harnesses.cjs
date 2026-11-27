const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const jsonc = require('jsonc-parser');
const toml = require('smol-toml');

const adapters = Object.freeze({
  codex: { name: 'Codex', files: ['.codex/config.toml'], keys: ['mcp_servers'], toml: true },
  claude: { name: 'Claude Code', files: ['.mcp.json'], keys: ['mcpServers'], type: 'stdio' },
  cursor: { name: 'Cursor', files: ['.cursor/mcp.json'], keys: ['mcpServers'] },
  vscode: { name: 'VS Code / Copilot', files: ['.mcp.json'], keys: ['mcpServers'], type: 'stdio' },
  'vscode-local': { name: 'VS Code Local (legacy)', files: ['.vscode/mcp.json'], keys: ['servers'], type: 'stdio' },
  gemini: { name: 'Gemini CLI', files: ['.gemini/settings.json'], keys: ['mcpServers'] },
  opencode: { name: 'OpenCode', files: ['opencode.jsonc', 'opencode.json'], keys: ['mcp', 'servers'], type: 'local' },
  generic: { name: 'Other MCP clients', files: ['make-app.mcp.json'], keys: ['mcpServers'] }
});
const key = 'make-app';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function adapter(id) {
  if (!Object.hasOwn(adapters, id)) throw new Error('Choose a harness: ' + Object.keys(adapters).join(', '));
  return adapters[id];
}
function configuration(id, { pluginRoot = path.resolve(__dirname, '..'), node = process.execPath } = {}) {
  const spec = adapter(id), args = [path.join(pluginRoot, 'server/index.cjs')];
  if (!path.isAbsolute(node) || !path.isAbsolute(pluginRoot)) throw new Error('The runtime and plugin paths must be absolute.');
  const entry = spec.type === 'local' ? { type: 'local', command: [node, ...args] } :
    { ...(spec.type ? { type: spec.type } : {}), command: node, args };
  let config = { [key]: entry };
  for (const part of [...spec.keys].reverse()) config = { [part]: config };
  return { entry, config, text: spec.toml ? toml.stringify(config) : JSON.stringify(config, null, 2) + '\n' };
}
function parse(text, spec) {
  if (spec.toml) return JSON.parse(JSON.stringify(toml.parse(text)));
  const errors = [], result = jsonc.parse(text, errors, { allowTrailingComma: true });
  if (errors.length || !result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Configuration is invalid; it was left unchanged.');
  function unique(node) {
    if (node.type === 'object') {
      const keys = new Set();
      for (const property of node.children || []) {
        const name = property.children[0].value;
        if (keys.has(name)) throw new Error('Configuration has duplicate keys; it was left unchanged.');
        keys.add(name); unique(property.children[1]);
      }
    } else if (node.type === 'array') for (const child of node.children || []) unique(child);
  }
  unique(jsonc.parseTree(text, [], { allowTrailingComma: true }));
  return result;
}
function getEntry(config, spec) {
  let value = config;
  for (const part of spec.keys) {
    if (value[part] === undefined) return undefined;
    if (!value[part] || typeof value[part] !== 'object' || Array.isArray(value[part])) throw new Error('The MCP configuration container must be an object.');
    value = value[part];
  }
  return value[key];
}
async function read(file) { try { return await fs.readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function safePath(root, relative) {
  const file = path.resolve(root, relative), rel = path.relative(root, file);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw new Error('Integration path escapes the project.');
  let current = root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (stat?.isSymbolicLink()) throw new Error('Integration paths must not contain symbolic links: ' + relative);
  }
  return file;
}
async function replace(root, relative, expected, next) {
  const file = await safePath(root, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lock = file + '.make-app.lock';
  const handle = await fs.open(lock, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new Error('Another integration update holds ' + path.basename(lock) + '. Retry after it finishes.');
    throw error;
  });
  const temporary = file + '.make-app-' + crypto.randomUUID();
  try {
    if (await read(file) !== expected) throw new Error('Configuration changed during setup; retry.');
    if (next === null) { await fs.unlink(file); return; }
    const previous = await fs.stat(file).catch(() => null);
    await fs.writeFile(temporary, next, { flag: 'wx', mode: previous ? previous.mode & 0o777 : 0o600 });
    await safePath(root, relative);
    if (await read(file) !== expected) throw new Error('Configuration changed during setup; retry.');
    await fs.rename(temporary, file);
  } finally {
    await handle.close(); await fs.rm(temporary, { force: true }); await fs.unlink(lock);
  }
}

async function update(id, { project = process.cwd(), pluginRoot = path.resolve(__dirname, '..'), node = process.execPath, operation = 'connect', dryRun = false } = {}) {
  const spec = adapter(id);
  if (!['connect', 'disconnect', 'status'].includes(operation)) throw new Error('Choose connect, disconnect or status.');
  const root = await fs.realpath(project);
  if (!(await fs.stat(root)).isDirectory()) throw new Error('Choose a project directory.');
  let relative = spec.files[0];
  const existingFiles = [];
  for (const name of spec.files) if (await read(await safePath(root, name)) !== null) existingFiles.push(name);
  if (existingFiles.length > 1) throw new Error('Both OpenCode config formats exist. Choose one before connecting; neither was changed.');
  if (existingFiles.length) relative = existingFiles[0];
  const file = await safePath(root, relative), original = await read(file);
  const stateRelative = '.make-app/integrations/' + id + '.json', stateFile = await safePath(root, stateRelative);
  const stateText = await read(stateFile), state = stateText ? JSON.parse(stateText) : null;
  const { entry, text } = configuration(id, { pluginRoot, node });
  const config = original === null ? {} : parse(original, spec), current = getEntry(config, spec);
  if (operation === 'status') return { harness: id, project: root, config: file, connected: current !== undefined, managed: !!state && isDeepStrictEqual(current, state.entry), profileChanged: false };
  if (operation === 'connect' && current !== undefined) {
    if (isDeepStrictEqual(current, entry)) return { harness: id, config: file, connected: true, changed: false, managed: !!state,
      message: 'This project already has the same connection. Claude Code and Copilot can share .mcp.json.' };
    throw new Error('A make-app connection already exists. Disconnect its original bundle or review it before replacing it.');
  }
  if (operation === 'disconnect' && current === undefined && !state) return { harness: id, config: file, connected: false, changed: false };
  if (operation === 'disconnect' && (!state || state.file !== relative || !isDeepStrictEqual(current, state.entry))) {
    throw new Error('The Make App connection was changed or is not managed by this installer; it was left unchanged.');
  }
  let next, block;
  if (spec.toml) {
    if (operation === 'connect') {
      block = '# Make App connection\n' + text + '# End Make App connection\n';
      next = (original || '') + ((original && !original.endsWith('\n')) ? '\n' : '') + '\n' + block;
      // A trailing TOML table header would change the scope; validate the resulting document.
      if (!isDeepStrictEqual(getEntry(parse(next, spec), spec), entry)) throw new Error('Cannot append this MCP configuration safely.');
    } else {
      if (!state.block || !original.includes(state.block) || original.split(state.block).length !== 2) throw new Error('The installed TOML block was edited; it was left unchanged.');
      // Project receipts are untrusted input. They cannot authorize removal of other tables.
      const owned = { mcp_servers: { [key]: state.entry } };
      if (!isDeepStrictEqual(parse(state.block, spec), owned)) throw new Error('The setup receipt includes unrelated settings; it was left unchanged.');
      next = original.replace(state.block, '');
      if (getEntry(parse(next, spec), spec) !== undefined) throw new Error('Cannot remove this MCP block safely.');
    }
  } else {
    next = jsonc.applyEdits(original || '{}\n', jsonc.modify(original || '{}\n', [...spec.keys, key], operation === 'connect' ? entry : undefined,
      { formattingOptions: { insertSpaces: true, tabSize: 2, eol: original?.includes('\r\n') ? '\r\n' : '\n' } }));
    parse(next, spec);
  }
  if (dryRun) return { harness: id, config: file, operation, dryRun: true, profileChanged: false, entry: operation === 'connect' ? entry : undefined };
  if (operation === 'connect') {
    if (state) throw new Error('An earlier setup receipt remains. Review or disconnect it before reconnecting.');
    const receipt = JSON.stringify({ schemaVersion: 1, file: relative, entry, ...(block ? { block } : {}), originalMissing: original === null, installedHash: digest(next) }, null, 2) + '\n';
    await replace(root, stateRelative, null, receipt);
    try { await replace(root, relative, original, next); }
    catch (error) { await replace(root, stateRelative, receipt, null); throw error; }
  } else {
    // Delete a file created by us only if its entire contents still match our installed bytes.
    let owned = { [key]: state.entry };
    for (const part of [...spec.keys].reverse()) owned = { [part]: owned };
    await replace(root, relative, original, state.originalMissing && digest(original) === state.installedHash && isDeepStrictEqual(config, owned) ? null : next);
    await replace(root, stateRelative, stateText, null);
  }
  return { harness: id, project: root, config: file, connected: operation === 'connect', changed: true,
    message: operation === 'connect' ? 'Open a new session in this trusted project and ask: Make an app for this project. Keep the bundle in place.' : 'Removed this Make App connection. Other settings were preserved.' };
}
module.exports = { adapters, configuration, update, parse, getEntry };

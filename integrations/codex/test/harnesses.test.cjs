const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { adapters, configuration, update, parse, getEntry } = require('../scripts/harnesses.cjs');
const service = require('../server/service.cjs');
const { Client } = require('@modelcontextprotocol/client');
const { StdioClientTransport } = require('@modelcontextprotocol/client/stdio');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'make-app-harness-'));
  t.after(() => fs.rm(root, { recursive: true, force: true })); return root;
}
for (const id of Object.keys(adapters)) test(id + ' connects the real MCP server and removes only its own configuration', async t => {
  const root = await fixture(t), spec = adapters[id], file = path.join(root, spec.files[0]);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const original = spec.toml ? '# Keep this comment\nmodel = "test-model"\n[mcp_servers.other]\ncommand = "keep-other"\n' :
    '{\n  // Keep this comment\n  "unrelated": {"enabled": true},\n}\n';
  await fs.writeFile(file, original);
  const dry = await update(id, { project: root, dryRun: true });
  assert.equal(dry.profileChanged, false); assert.equal(await fs.readFile(file, 'utf8'), original);
  assert.equal((await update(id, { project: root })).connected, true);
  assert.equal((await update(id, { project: root })).changed, false);
  const installed = await fs.readFile(file, 'utf8'), entry = getEntry(parse(installed, spec), spec);
  assert.ok(installed.includes('Keep this comment'));
  const command = Array.isArray(entry.command) ? entry.command[0] : entry.command;
  const args = Array.isArray(entry.command) ? entry.command.slice(1) : entry.args;
  const client = new Client({ name: 'harness-' + id, version: '1.0.0' });
  try {
    await client.connect(new StdioClientTransport({ command, args }));
    assert.equal((await client.listTools()).tools.length, 4);
    assert.equal((await client.listPrompts()).prompts[0].name, 'make-app');
    const prompt = await client.getPrompt({ name: 'make-app', arguments: { path: root } });
    assert.ok(prompt.messages[0].content.text.includes('native desktop app'));
    const result = await client.callTool({ name: 'inspect_project', arguments: { path: root } });
    assert.notEqual(result.isError, true); assert.equal(result.structuredContent.executionStarted, false);
  } finally { await client.close(); }
  assert.equal((await update(id, { project: root, operation: 'status' })).managed, true);
  // An unrelated edit made after installation must survive disconnect.
  await fs.writeFile(file, installed + (spec.toml ? '# Later user comment\n' : '\n// Later user comment\n'));
  assert.equal((await update(id, { project: root, operation: 'disconnect' })).connected, false);
  const removed = await fs.readFile(file, 'utf8'); assert.ok(removed.includes('Later user comment'));
  assert.ok(removed.includes('Keep this comment')); assert.equal(getEntry(parse(removed, spec), spec), undefined);
});

test('fresh configuration is removed on disconnect; original files and other servers are preserved', async t => {
  const root = await fixture(t), file = path.join(root, '.cursor/mcp.json');
  await update('cursor', { project: root }); await update('cursor', { project: root, operation: 'disconnect' });
  await assert.rejects(fs.access(file));
  await fs.writeFile(file, '{"mcpServers":{"other":{"command":"keep"}}}');
  await update('cursor', { project: root }); await update('cursor', { project: root, operation: 'disconnect' });
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).mcpServers.other.command, 'keep');
});

test('existing conflicting or user-modified connections are left untouched', async t => {
  const root = await fixture(t), file = path.join(root, '.mcp.json');
  const existing = '{"mcpServers":{"make-app":{"command":"my-command"}}}'; await fs.writeFile(file, existing);
  await assert.rejects(update('claude', { project: root }), /already exists/); assert.equal(await fs.readFile(file, 'utf8'), existing);
  await fs.unlink(file); await update('claude', { project: root });
  const changed = (await fs.readFile(file, 'utf8')).replace('server/index.cjs', 'server/changed.cjs').replace('server\\\\index.cjs', 'server\\\\changed.cjs');
  await fs.writeFile(file, changed); await assert.rejects(update('claude', { project: root, operation: 'disconnect' }), /changed/);
  assert.equal(await fs.readFile(file, 'utf8'), changed);
});

test('Claude and current Copilot reuse their shared portable connection', async t => {
  const root = await fixture(t); await update('claude', { project: root });
  assert.equal((await update('vscode', { project: root })).changed, false);
  await assert.rejects(update('vscode', { project: root, operation: 'disconnect' }), /not managed/);
  await update('claude', { project: root, operation: 'disconnect' });
});

test('an untrusted setup receipt cannot delete unrelated TOML tables or JSON settings', async t => {
  const root = await fixture(t); await update('codex', { project: root });
  const tomlFile = path.join(root, '.codex/config.toml'), receiptFile = path.join(root, '.make-app/integrations/codex.json');
  const content = (await fs.readFile(tomlFile, 'utf8')) + '\n[other]\nkeep = true\n';
  const receipt = JSON.parse(await fs.readFile(receiptFile, 'utf8')); receipt.block = content;
  await fs.writeFile(tomlFile, content); await fs.writeFile(receiptFile, JSON.stringify(receipt));
  await assert.rejects(update('codex', { project: root, operation: 'disconnect' }), /unrelated settings/);
  assert.equal(await fs.readFile(tomlFile, 'utf8'), content);
  await update('cursor', { project: root });
  const jsonFile = path.join(root, '.cursor/mcp.json'), jsonReceiptFile = path.join(root, '.make-app/integrations/cursor.json');
  const json = JSON.parse(await fs.readFile(jsonFile, 'utf8')); json.unrelated = { keep: true };
  const changed = JSON.stringify(json), jsonReceipt = JSON.parse(await fs.readFile(jsonReceiptFile, 'utf8'));
  jsonReceipt.installedHash = require('node:crypto').createHash('sha256').update(changed).digest('hex');
  await fs.writeFile(jsonFile, changed); await fs.writeFile(jsonReceiptFile, JSON.stringify(jsonReceipt));
  await update('cursor', { project: root, operation: 'disconnect' });
  assert.equal(JSON.parse(await fs.readFile(jsonFile, 'utf8')).unrelated.keep, true);
});

test('invalid JSONC, duplicate keys and wrong container types fail without editing files', async t => {
  const root = await fixture(t), file = path.join(root, '.mcp.json');
  for (const text of ['{invalid', '{"mcpServers":[],}', '{"mcpServers":{},"mcpServers":{}}']) {
    await fs.writeFile(file, text); await assert.rejects(update('claude', { project: root })); assert.equal(await fs.readFile(file, 'utf8'), text);
  }
  await assert.rejects(update('__proto__', { project: root }), /Choose a harness/);
});

test('ambiguous OpenCode formats and an active configuration lock are preserved', async t => {
  const root = await fixture(t); await fs.writeFile(path.join(root, 'opencode.jsonc'), '{}'); await fs.writeFile(path.join(root, 'opencode.json'), '{}');
  await assert.rejects(update('opencode', { project: root }), /Both OpenCode/);
  await fs.writeFile(path.join(root, '.mcp.json.make-app.lock'), '');
  await assert.rejects(update('claude', { project: root }), /Another integration/);
  await assert.rejects(fs.access(path.join(root, '.make-app/integrations/claude.json')));
});

test('a linked configuration directory cannot redirect installation outside the project', async t => {
  const root = await fixture(t), outside = await fixture(t);
  try { await fs.symlink(outside, path.join(root, '.cursor'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (error.code === 'EPERM') { t.skip('This sandbox disallows creating links; native CI exercises this case.'); return; } throw error; }
  await assert.rejects(update('cursor', { project: root }), /symbolic links/);
  await assert.rejects(fs.access(path.join(outside, 'mcp.json')));
});

test('CLI inspects current directory with JSON output and rejects unknown flags', async t => {
  const root = await fixture(t), cli = path.resolve(__dirname, '../scripts/make-app.cjs');
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>Test</title>');
  const result = spawnSync(process.execPath, [cli, 'inspect'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).executionStarted, false);
  assert.equal(spawnSync(process.execPath, [cli, 'make', '--unknown'], { encoding: 'utf8' }).status, 1);
});

test('default web output uses a fresh sibling name and creation does not run project code', async t => {
  const parent = await fixture(t), root = path.join(parent, 'My Project'); await fs.mkdir(root);
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>Test</title>');
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { start: 'touch EXECUTED' } }));
  const first = await service.make({ path: root, format: 'web' }), second = await service.make({ path: root, format: 'web' });
  assert.equal(first.executionStarted, false); assert.notEqual(first.executable, second.executable);
  assert.equal(await fs.realpath(path.dirname(first.executable)), await fs.realpath(path.join(parent, 'Make App Outputs')));
  assert.equal((await fs.stat(path.join(first.executable, 'make-app.webmanifest'))).isFile(), true);
  await assert.rejects(fs.access(path.join(root, 'EXECUTED')));
  await assert.rejects(service.make({ path: root, format: 'remote' }), /desktop or web/);
});

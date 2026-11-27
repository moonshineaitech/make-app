#!/usr/bin/env node
const path = require('node:path');
const help = `Make App — local apps from any coding tool

  make-app inspect [project] [--target NAME]
  make-app make [project] [--format desktop|web] [--output PATH] [--target NAME]
  make-app open [project]
  make-app projects
  make-app mcp
  make-app connect [codex|claude|cursor|vscode|vscode-local|gemini|opencode|generic] [--project PATH] [--dry-run]
  make-app disconnect HARNESS [--project PATH] [--dry-run]
  make-app status HARNESS [--project PATH]
  make-app config HARNESS

Project defaults to the current directory. Output defaults to a fresh name in
the sibling Make App Outputs folder. Creation never runs project code.
Connect changes only the selected project's configuration; it preserves other
servers and comments. Hosts may require trust approval or a new session.
`;
function argumentsFor(argv) {
  const positional = [], options = {};
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (!value.startsWith('--')) { positional.push(value); continue; }
    const at = value.indexOf('='), name = value.slice(2, at < 0 ? undefined : at);
    if (['dry-run', 'help'].includes(name)) { options[name] = true; continue; }
    if (!['target', 'output', 'format', 'project'].includes(name)) throw new Error('Unknown option: --' + name);
    const content = at < 0 ? argv[++i] : value.slice(at + 1);
    if (!content || content.startsWith('--')) throw new Error('Provide a value for --' + name);
    options[name] = content;
  }
  return { positional, options };
}
async function wizard() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Choose a harness and --project PATH; interactive setup needs a terminal.');
  const { adapters } = require('./harnesses.cjs'), ids = Object.keys(adapters);
  const terminal = require('node:readline/promises').createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write('Connect Make App to a coding tool\n\n' + ids.map((id, i) => `${i + 1}. ${adapters[id].name}`).join('\n') + '\n\n');
    const id = ids[Number((await terminal.question('Coding tool number: ')).trim()) - 1];
    if (!id) throw new Error('Choose a listed coding tool.');
    const project = (await terminal.question('Project folder (absolute path): ')).trim().replace(/^"(.*)"$/, '$1');
    if (!path.isAbsolute(project)) throw new Error('Provide an absolute project folder.');
    return { id, project };
  } finally { terminal.close(); }
}
async function main(argv = process.argv.slice(2)) {
  const { positional, options } = argumentsFor(argv), [action, source, ...extra] = positional;
  if (!action || options.help || action === 'help') return { help };
  if (extra.length) throw new Error('Unexpected arguments. Use --help for usage.');
  if (action === 'mcp') { require('../server/index.cjs'); return; }
  if (action === 'config') return { configuration: require('./harnesses.cjs').configuration(source).text };
  if (['connect', 'disconnect', 'status'].includes(action)) {
    const selected = action === 'connect' && !source ? await wizard() : { id: source, project: options.project || process.cwd() };
    if (action === 'connect' && !options['dry-run']) {
      // A source checkout is also supported for development; release bundles are verified before registration.
      const fs = require('node:fs/promises'), root = path.resolve(__dirname, '..');
      if (await fs.stat(path.join(root, 'bundle-integrity.json')).catch(() => null)) await require('./install.cjs').verifyBundle(root);
    }
    return require('./harnesses.cjs').update(selected.id, { project: path.resolve(selected.project), operation: action, dryRun: !!options['dry-run'] });
  }
  const service = require('../server/service.cjs');
  if (action === 'projects') return service.projects();
  if (!['inspect', 'make', 'open'].includes(action)) throw new Error('Unknown command: ' + action + '. Use --help.');
  return service[action]({ path: path.resolve(source || '.'), ...(options.output ? { output: path.resolve(options.output) } : {}),
    target: options.target, format: options.format });
}
if (require.main === module) main().then(value => {
  if (value?.help) process.stdout.write(value.help);
  else if (value?.configuration) process.stdout.write(value.configuration);
  else if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}).catch(error => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; });
module.exports = { main, argumentsFor };

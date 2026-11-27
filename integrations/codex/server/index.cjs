#!/usr/bin/env node
const { McpServer } = require('@modelcontextprotocol/server');
const { StdioServerTransport } = require('@modelcontextprotocol/server/stdio');
const { z } = require('zod');
const service = require('./service.cjs');
const server = new McpServer({ name: 'appdock', version: require('../package.json').version });
const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
const guarded = handler => async args => {
  try { return result(await handler(args)); }
  catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
};
const localRead = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const localWrite = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
server.registerTool('inspect_project', {
  title: 'Inspect a local project',
  description: 'Detect launch requirements without running project code, installing packages or returning environment values. Use the current workspace root.',
  inputSchema: z.object({ path: z.string().min(1), target: z.string().optional() }), annotations: localRead
}, guarded(service.inspect));
server.registerTool('make_executable', {
  title: 'Make an app for this project',
  description: 'Create a native app for this host or export an existing static build with format web. Only path is required. Output defaults to a fresh name in the sibling Make App Outputs folder. Does not run project code. Desktop apps need the original source; web exports need HTTPS hosting.',
  inputSchema: z.object({ path: z.string().min(1), output: z.string().min(1).optional(), target: z.string().optional(), format: z.enum(['desktop', 'web']).optional() }),
  annotations: localWrite
}, guarded(service.make));
server.registerTool('list_projects', {
  title: 'Find saved local projects', description: 'Discover saved local Codex projects. Other harnesses can pass their workspace path directly.',
  inputSchema: z.object({}), annotations: localRead
}, guarded(service.projects));
server.registerTool('open_project', {
  title: 'Open the executable converter', description: 'Open Make App with a project selected; does not start project code.',
  inputSchema: z.object({ path: z.string().min(1) }), annotations: localWrite
}, guarded(service.open));
server.registerPrompt('make-app', {
  title: 'Make an app for this project', description: 'Inspect the workspace and create a native app or an installable static web export.',
  argsSchema: z.object({ path: z.string(), format: z.enum(['desktop', 'web']).optional() })
}, ({ path, format = 'desktop' }) => ({ messages: [{ role: 'user', content: { type: 'text', text:
  `Use Make App to inspect the local project at ${JSON.stringify(path)} and create ${format === 'web' ? 'an installable static web export' : 'a native desktop app'}. Use the default output unless I specified one. If several executable targets exist and my request does not select one, ask which to use. Return the saved path and prerequisites. Creating an app does not authorize publishing or running project code.`
} }] }));
server.connect(new StdioServerTransport()).catch(error => { console.error(error.message); process.exitCode = 1; });

const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
function supported() { return process.platform === 'win32' && process.arch === 'x64' && !!require('./process-broker.cjs').location(); }
function dimensions(columns = 100, rows = 30) {
  if (!Number.isInteger(columns) || columns < 20 || columns > 400 || !Number.isInteger(rows) || rows < 5 || rows > 200) throw new Error('Terminal size must be 20–400 columns and 5–200 rows.');
  return { columns, rows };
}
function spawn(command, args, options, size = {}) {
  if (!supported()) throw new Error('Interactive terminals currently require the Windows x64 process supervisor.');
  const { columns, rows } = dimensions(size.columns, size.rows);
  const broker = require('./process-broker.cjs').location();
  const pty = require('node-pty').spawn(broker, ['--terminal', ...(options.windowsVerbatimArguments ? ['--windows-verbatim'] : []), command, ...args], {
    name: 'xterm-256color', cols: columns, rows, cwd: options.cwd,
    env: { ...options.env, APPDOCK_OWNER_PID: String(process.pid), TERM: 'xterm-256color' }, useConpty: true, useConptyDll: true,
  });
  const child = new EventEmitter();
  Object.assign(child, { pid: pty.pid, exitCode: null, appdockSupervised: true, appdockTerminal: true, stdout: new PassThrough(), stderr: new PassThrough() });
  let ended = false, killRequested = false;
  const closeNative = () => { if (!killRequested) { killRequested = true; pty.kill(); } };
  child.stdin = new Writable({ write(chunk, encoding, done) { try { if (!ended) pty.write(chunk.toString('utf8')); done(); } catch (error) { done(error); } }, final(done) { child.kill(); done(); } });
  child.kill = () => { closeNative(); return true; };
  child.resize = (cols, lines) => { const checked = dimensions(cols, lines); if (!ended) pty.resize(checked.columns, checked.rows); };
  child.pause = () => { if (!ended) pty.pause(); };
  child.resume = () => { if (!ended) pty.resume(); };
  pty.onData(data => child.stdout.write(data));
  pty.onExit(({ exitCode, signal }) => {
    ended = true; closeNative(); child.exitCode = exitCode; child.stdout.end(); child.stderr.end();
    child.emit('exit', exitCode, signal); child.emit('close', exitCode, signal);
  });
  return child;
}
module.exports = { supported, dimensions, spawn };

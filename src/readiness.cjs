const net = require('node:net');
function validate(ready, localUrl) {
  if (!ready || typeof ready !== 'object' || Array.isArray(ready)) throw new Error('Readiness must be an object.');
  if (!!ready.url === !!ready.tcp) throw new Error('Readiness needs exactly one HTTP URL or TCP port.');
  if (ready.url) localUrl(ready.url);
  if (ready.tcp && !/^\{ports\.[a-zA-Z][\w-]*\}$/.test(String(ready.tcp)) && !(Number.isInteger(ready.tcp) && ready.tcp > 0 && ready.tcp <= 65535)) throw new Error('TCP readiness needs an integer port or {ports.service}.');
  if (ready.timeoutMs !== undefined && (!Number.isInteger(ready.timeoutMs) || ready.timeoutMs < 100 || ready.timeoutMs > 180000)) throw new Error('Readiness timeout must be 100–180000 ms.');
  if (ready.status !== undefined && (!Number.isInteger(ready.status) || ready.status < 200 || ready.status > 399)) throw new Error('Expected HTTP status must be 200–399.');
  if (ready.contains !== undefined && (typeof ready.contains !== 'string' || ready.contains.length > 4096)) throw new Error('Readiness text must be a string of up to 4096 characters.');
  if (ready.json !== undefined && (!ready.json || typeof ready.json !== 'object' || Array.isArray(ready.json) || Object.entries(ready.json).some(([k, v]) => !k || k.length > 200 || (v !== null && !['string', 'number', 'boolean'].includes(typeof v))))) throw new Error('Readiness JSON must map field paths to scalar values.');
  if (ready.tcp && (ready.json || ready.contains !== undefined || ready.status !== undefined)) throw new Error('HTTP assertions cannot be used with TCP readiness.');
  return ready;
}
async function probe(ready, interpolate, signal) {
  if (ready.tcp) {
    await new Promise((resolve, reject) => {
      const socket = net.connect({ host: '127.0.0.1', port: Number(interpolate(ready.tcp)) });
      const abort = () => { socket.destroy(); reject(signal.reason); };
      const finish = fn => value => { signal?.removeEventListener('abort', abort); socket.destroy(); fn(value); };
      socket.setTimeout(1000);
      socket.once('connect', finish(resolve)); socket.once('error', finish(reject));
      socket.once('timeout', finish(() => reject(new Error('TCP timeout'))));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
    return { level: 'listening', check: 'tcp' };
  }
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(3000)]) : AbortSignal.timeout(3000);
  let url = new URL(interpolate(ready.url));
  const origin = url.origin;
  let response;
  for (let redirects = 0; redirects <= 3; redirects++) {
    response = await fetch(url, { signal: requestSignal, redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) break;
    const destination = response.headers.get('location');
    await response.body?.cancel().catch(() => {});
    if (!destination || redirects === 3) throw new Error('Readiness redirect did not resolve.');
    const next = new URL(destination, url);
    if (next.origin !== origin || next.username || next.password) throw new Error('Readiness redirect leaves the local application origin.');
    url = next;
  }
  try {
    if (ready.status ? response.status !== ready.status : response.status < 200 || response.status >= 400) throw new Error('HTTP status ' + response.status);
    if (ready.contains === undefined && !ready.json) return { level: 'responding', check: 'http', status: response.status };
    let length = 0; const chunks = [];
    for await (const chunk of response.body || []) { length += chunk.length; if (length > 1024 * 1024) throw new Error('Readiness response exceeds 1 MB.'); chunks.push(chunk); }
    const text = Buffer.concat(chunks).toString('utf8');
    if (ready.contains !== undefined && !text.includes(ready.contains)) throw new Error('Expected response text is missing');
    if (ready.json) {
      const body = JSON.parse(text);
      for (const [field, expected] of Object.entries(ready.json)) {
        const actual = field.split('.').reduce((value, key) => value && Object.hasOwn(value, key) ? value[key] : undefined, body);
        if (actual !== expected) throw new Error('Expected JSON field did not match: ' + field);
      }
    }
    return { level: 'verified', check: 'http-assertion', status: response.status };
  } finally { await response.body?.cancel().catch(() => {}); }
}
module.exports = { validate, probe };

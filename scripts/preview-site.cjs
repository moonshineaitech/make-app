const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
function createServer() { return http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost'), route = decodeURIComponent(url.pathname);
    let base, relative;
    if (route.startsWith('/app/')) { base = path.join(root, 'src/ui'); relative = route.slice(5) || 'creator.html'; }
    else if (route === '/brand.png') { base = path.join(root, 'src'); relative = 'icon.png'; }
    else { base = path.join(root, 'site'); relative = route === '/' ? 'index.html' : route.slice(1); }
    const file = path.resolve(base, relative), rel = path.relative(base, file), type = types[path.extname(file)];
    if (!type || rel.startsWith('..') || path.isAbsolute(rel)) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', type); response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(await fs.readFile(file));
  } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Page unavailable'); }
}); }
if (require.main === module) {
  const server = createServer();
  const port = Number(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || 5175);
  server.listen(port, '127.0.0.1', () => console.log('Make App preview: http://127.0.0.1:' + server.address().port));
}
module.exports = { createServer };

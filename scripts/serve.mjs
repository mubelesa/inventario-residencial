import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname.replace(/\\/g, '/').replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || relative.split('/').some(part => part.startsWith('.')) || /^(src\/.*\.test|tests\/|scripts\/)/i.test(relative)) { res.writeHead(403); return res.end(); }
    if (!(await stat(file)).isFile()) { res.writeHead(404); return res.end(); }
    const buffer = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : buffer);
  } catch (_) { res.writeHead(404); res.end('Arquivo não encontrado'); }
});
server.listen(port, host, () => console.log(`Casa em Ordem: http://${host}:${port}/`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });

const fs = require('fs');
const http = require('http');
const path = require('path');
const { buildMenu } = require('./menu-utils');

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';
const shellRoot = __dirname;
const projectRoot = path.resolve(shellRoot, '..');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/shell/index.html';

  const fullPath = path.normalize(path.join(projectRoot, pathname.replace(/^\/+/, '')));
  if (!fullPath.startsWith(projectRoot)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(fullPath, (error, stat) => {
    if (error || !stat.isFile()) {
      send(res, 404, 'Not found');
      return;
    }

    const type = contentTypes[path.extname(fullPath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (requestUrl.pathname === '/api/menu') {
    send(res, 200, JSON.stringify(buildMenu(shellRoot), null, 2), 'application/json; charset=utf-8');
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Shell available at http://${HOST}:${PORT}/shell/index.html`);
});

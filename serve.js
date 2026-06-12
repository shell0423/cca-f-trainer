/* serve.js — 依存ライブラリ不要の静的ファイルサーバ
   使い方:  node serve.js          （ポート8000で起動）
            node serve.js 3000     （ポート指定）
   ブラウザで http://localhost:8000 を開く。停止は Ctrl + C。
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.argv[2], 10) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // ディレクトリトラバーサル防止
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('CCA-F 合格トレーナーを起動しました。');
  console.log('  → ブラウザで開く:  http://localhost:' + PORT);
  console.log('  → 停止: Ctrl + C');
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('ポート ' + PORT + ' は使用中です。別ポートで起動してください: node serve.js 8080');
  } else {
    console.error(e.message);
  }
  process.exit(1);
});

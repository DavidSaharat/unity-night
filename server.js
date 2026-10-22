const http = require('http');
const fs = require('fs');
const path = require('path');

const MAX = 80;
let count = 0;
const admins = new Set();

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const json = (res, data) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
const broadcast = () => admins.forEach((res) => res.write(`data: ${JSON.stringify({ count, max: MAX })}\n\n`));

// จุดเชื่อมต่อกับระบบพลุ (ยังไม่ทำ) — ถูกเรียกทุกครั้งที่มีคน swipe
const onFire = (n) => console.log(`fire #${n}`);

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/swipe') {
    if (count < MAX) onFire(++count);
    broadcast();
    return json(res, { count, max: MAX });
  }
  if (req.method === 'POST' && req.url === '/api/reset') {
    count = 0;
    broadcast();
    return json(res, { count, max: MAX });
  }
  if (req.url === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    admins.add(res);
    req.on('close', () => admins.delete(res));
    return broadcast();
  }

  const url = req.url.split('?')[0];
  const name = url === '/' ? '/index.html' : url === '/admin' ? '/admin.html' : url;
  const file = path.join(__dirname, 'public', path.normalize(name));
  if (!file.startsWith(path.join(__dirname, 'public'))) return res.writeHead(403).end();
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain' }).end(buf);
  });
}).listen(3000, () => console.log('http://localhost:3000  |  admin: http://localhost:3000/admin'));

import next from 'next';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';

const app = next({ dev: false, dir: '.' });
const handle = app.getRequestHandler();

await app.prepare();
const server = createServer((req, res) => handle(req, res));
await new Promise(r => server.listen(3463, r));
console.log('Ready on 3463');

const buf = readFileSync('./test_plain.pdf');
const base = 'http://localhost:3463/api';

// Test compress all levels
for (const level of ['low', 'recommended', 'extreme']) {
  const fd = new FormData();
  fd.set('file', new Blob([buf], { type: 'application/pdf' }), 'test.pdf');
  fd.set('level', level);
  const res = await fetch(base + '/compress', { method: 'POST', body: fd });
  const data = Buffer.from(await res.arrayBuffer());
  const pct = Math.round((1 - data.length / buf.length) * 100);
  console.log(`compress(${level}): ${buf.length} -> ${data.length} bytes (${pct}%)`);
}

// Test pdf-to-jpg
const fd = new FormData();
fd.set('file', new Blob([buf], { type: 'application/pdf' }), 'test.pdf');
fd.set('quality', '85');
const res = await fetch(base + '/pdf-to-jpg', { method: 'POST', body: fd });
console.log('pdf-to-jpg status:', res.status);
const jpg = Buffer.from(await res.arrayBuffer());
console.log('pdf-to-jpg size:', jpg.length, 'header:', jpg.slice(0, 8).toString('hex'));

server.close();
process.exit(0);

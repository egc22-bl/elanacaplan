import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createMailer } from './mail.js';
import { createService } from './service.js';
import { fileStore } from './store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 100_000) {
        reject(new Error('too big'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function createHandler({ service, cronSecret = '' }) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/classes') {
        json(res, 200, service.listClasses());
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/signups') {
        const result = await service.signUp(await readJson(req));
        json(res, result.ok ? 200 : 400, result);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/cancel/lookup') {
        json(res, 200, service.lookup(await readJson(req)));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/cancel') {
        const result = await service.cancel(await readJson(req));
        json(res, result.ok ? 200 : 400, result);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/roster') {
        const header = req.headers.authorization ?? '';
        if (!cronSecret || header !== `Bearer ${cronSecret}`) {
          json(res, 401, { ok: false });
          return;
        }
        const result = await service.digest();
        json(res, 200, { ok: true, ran: result.ran, delivered: result.delivered === true });
        return;
      }
      if (req.method === 'GET' && FILES[url.pathname]) {
        const item = FILES[url.pathname];
        const body = fs.readFileSync(path.join(publicDir, item.file));
        res.writeHead(200, { 'Content-Type': item.type, 'Content-Length': body.length });
        res.end(body);
        return;
      }
      json(res, 404, { ok: false, error: 'Not found.' });
    } catch {
      json(res, 400, { ok: false, error: 'Something went wrong. Try again.' });
    }
  };
}

export function startServer({ port = 8787, store, mail, cronSecret, schedule = false } = {}) {
  const service = createService({
    store: store ?? fileStore(path.join(root, 'data', 'signups.json')),
    mail: mail ?? createMailer(),
  });
  const handler = createHandler({ service, cronSecret: cronSecret ?? process.env.CRON_SECRET ?? '' });
  const server = http.createServer((req, res) => {
    handler(req, res);
  });
  let timer;
  if (schedule) {
    timer = setInterval(() => {
      service.digest().catch(() => {});
    }, 60_000);
    timer.unref();
  }
  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

const isDirect = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirect) {
  const port = Number(process.env.PORT || 8787);
  if (process.env.ATTITUDES_ALLOW_EMAIL !== 'true') {
    console.log('Studio email is off. No messages will be sent.');
  }
  const server = await startServer({ port, schedule: true });
  const address = server.address();
  console.log(`attitudesmasterclass listening on ${address.port}`);
}

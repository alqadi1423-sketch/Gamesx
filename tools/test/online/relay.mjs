// Local stand-in for the Cloudflare worker: serves public/ and runs the REAL worker/index.js Room class behind real
// WebSockets, so the online engine can be tested on one machine without Cloudflare.
// Env: PORT (default 8765), PUB (default public/ of this repository), WORKER (default worker/index.js of this repository),
//      LAT_MIN..LAT_MAX extra latency in ms per message (strict order kept per socket), LOGP=1 logs every presence size.
// The WebSocket server comes from the 'ws' package when it is installed, else from the copy inside Playwright.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const PUB = path.resolve(process.env.PUB || process.env.ROOT || path.join(REPO, 'public'));
const WORKER = path.resolve(process.env.WORKER || path.join(REPO, 'worker', 'index.js'));
let WSS;
try { WSS = require('ws').WebSocketServer; } catch (e) {
  const pw = path.dirname(require.resolve('playwright-core/package.json', { paths: [HERE, path.dirname(require.resolve('playwright'))] }));
  WSS = require(path.join(pw, 'lib', 'utilsBundle.js')).wsServer;
}
// the worker is an ES module with a .js name: import a copy named .mjs
const WCOPY = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'alaabna-relay-')), 'worker.mjs');
fs.copyFileSync(WORKER, WCOPY);
process.on('exit', () => { try { fs.rmSync(path.dirname(WCOPY), { recursive: true, force: true }); } catch (e) { } });
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => process.exit(0));

// fake Cloudflare runtime pieces used by Room.fetch
let lastPair = null;
globalThis.WebSocketPair = class { constructor() { const server = new FakeServer(); lastPair = server; this[0] = { client: true }; this[1] = server; } };
const RealResponse = globalThis.Response;
class FakeResponse { constructor(body, opt = {}) { this.status = opt.status; this.webSocket = opt.webSocket; this.body = body; } }
const { Room } = await import(pathToFileURL(WCOPY).href);

const LAT_MIN = +(process.env.LAT_MIN || 0), LAT_MAX = +(process.env.LAT_MAX || 0);
const lat = () => LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN);
const log = [];
// strict FIFO per channel: each item waits at least its own latency, never overtakes the previous one
function fifo() { const q = []; let busy = false;
  const pump = () => { if (!q.length) { busy = false; return; } busy = true; const it = q[0]; const w = Math.max(0, it.at - Date.now());
    setTimeout(() => { q.shift(); try { it.fn(); } catch (e) { console.error(e); } pump(); }, w); };
  return fn => { q.push({ fn, at: Date.now() + lat() }); if (!busy) pump(); }; }
class FakeServer {
  constructor() { this.att = null; this.real = null; this.queue = []; this.room = null; this.out = fifo(); }
  serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)); }
  deserializeAttachment() { return this.att; }
  // keep ordering per socket (like TCP) while adding latency
  send(s) { this.out(() => { if (!this.real) { this.queue.push(s); return; } try { if (this.real.readyState === 1) this.real.send(s); } catch {} }); }
  attach(ws) { this.real = ws; const q = this.queue; this.queue = []; for (const s of q) { try { ws.send(s); } catch {} } if (this.closeLater) setTimeout(() => { try { ws.close(); } catch {} }, 50); }
  accept() {}
  close() { const go = () => { try { this.real && this.real.close(); } catch {} }; if (this.real) this.out(go); else this.closeLater = true; }
}
const rooms = new Map();
function getRoom(name) {
  if (!rooms.has(name)) {
    const sockets = [];
    const store = new Map(); const ctx = { getWebSockets: () => sockets.filter(s => !s.closed), acceptWebSocket: s => sockets.push(s), storage: { get: async k => store.get(k), put: async (k, v) => { store.set(k, v); }, deleteAll: async () => store.clear(), setAlarm: async () => {} } };
    rooms.set(name, { room: new Room(ctx, {}), sockets });
  }
  return rooms.get(name);
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__stats') { res.end(JSON.stringify({ log: log.slice(-200), rooms: [...rooms.keys()] })); return; }
  let p = path.join(PUB, decodeURIComponent(u.pathname));
  if (!p.startsWith(PUB)) { res.statusCode = 403; res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.statusCode = 404; res.end('nf'); return; }
  res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream');
  res.end(fs.readFileSync(p));
});
const wss = new WSS({ noServer: true });
srv.on('upgrade', async (req, sock, head) => {
  const u = new URL(req.url, 'http://x');
  const m = u.pathname.match(/^\/ws\/([a-z0-9][a-z0-9_.-]{2,47})$/);
  if (!m) { sock.destroy(); return; }
  const R = getRoom(m[1]);
  globalThis.Response = FakeResponse;
  let resp;
  try { resp = await R.room.fetch({ url: 'http://x' + req.url, headers: { get: () => 'websocket' } }); } finally { globalThis.Response = RealResponse; }
  if (resp.status !== 101) { log.push({ full: m[1] }); sock.write('HTTP/1.1 429 Too Many\r\n\r\n'); sock.destroy(); return; }
  const fake = lastPair;
  wss.handleUpgrade(req, sock, head, ws => {
    fake.attach(ws); // flush anything Room sent before the upgrade completed (hello)
    const later = fifo();
    ws.on('message', (data) => {
      const s = data.toString();
      if (process.env.LOGP) log.push({ room: m[1], peer: fake.att && fake.att.peer, len: s.length, t: Date.now() });
      later(() => { if (!fake.closed) R.room.webSocketMessage(fake, s); });
    });
    ws.on('close', () => later(() => { if (fake.closed) return; fake.closed = true; R.room.webSocketClose(fake); }));
  });
});
const PORT = +(process.env.PORT || 8765);
srv.listen(PORT, () => console.log('listening ' + PORT));

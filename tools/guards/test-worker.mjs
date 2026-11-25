// Server guards for docs/rules.md: runs the real worker/index.js against stand-ins for the Durable Object runtime,
// locally, with no deploy.   node tools/guards/test-worker.mjs
//   1. a message in one room never reaches another room
//   2. a message over the size limit is dropped, and a phone over the rate limit is cut off
//   3. joining a code nobody opened is refused, and malformed room paths are refused
//   4. nothing a player sends (chat included) is written to the logs
//   5. failed joins from one source are counted across every code (one shared counter), and past the limit that source is
//      refused; joining an open room is untouched; the source's address is never stored
//   6. a request that says neither ?c=1 nor ?j=1 is refused
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// --- stand-ins for the Workers runtime (only what worker/index.js uses) ---
class FakeWS {
  constructor() { this.out = []; this.closed = null; this.att = null; this.peerSide = null; }
  accept() {} send(s) { this.out.push(s); } close(code, why) { this.closed = { code, why }; }
  serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)); } deserializeAttachment() { return this.att; }
  msgs() { return this.out.map(s => { try { return JSON.parse(s); } catch { return s; } }); }
}
globalThis.WebSocketPair = function () { const a = new FakeWS(), b = new FakeWS(); a.peerSide = b; b.peerSide = a; return { 0: a, 1: b }; };
globalThis.WebSocketRequestResponsePair = function (q, r) { this.q = q; this.r = r; };
globalThis.Response = class { constructor(body, init = {}) { this.status = init.status || 200; this.webSocket = init.webSocket; this.body = body;
  const h = new Map(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v])); this.headers = { get: k => h.get(String(k).toLowerCase()) ?? null }; }
  async json() { return JSON.parse(this.body); } };
function makeCtx() {
  const socks = [], store = new Map(); let alarm = null;
  return { socks, getWebSockets: () => socks.filter(w => !w.closed), acceptWebSocket: w => socks.push(w), setWebSocketAutoResponse() {}, getWebSocketAutoResponseTimestamp: () => null,
    storageDump: () => store.entries(),
    storage: { get: async k => store.get(k), put: async (k, v) => { store.set(k, v); }, deleteAll: async () => store.clear(), getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } } };
}

// load a copy of the worker as an ES module
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wk-')), copy = path.join(tmp, 'worker.mjs');
fs.copyFileSync(path.join(ROOT, process.env.WORKER || 'worker/index.js'), copy);
const logged = []; for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const o = console[k]; console[k] = (...a) => { logged.push(a.map(String).join(' ')); }; console['_' + k] = o; }
const { Room, default: worker } = await import(pathToFileURL(copy).href);
const say = (...a) => console._log(...a);

const rooms = new Map(); const env = { ROOMS: { idFromName: n => n, get: n => { if (!rooms.has(n)) rooms.set(n, new Room(makeCtx(), {})); return rooms.get(n); } } };
const req = (p, extra = {}) => ({ url: 'https://x' + p, headers: { get: h => (h === 'Upgrade' ? (extra.upgrade ?? 'websocket') : h === 'CF-Connecting-IP' ? (extra.ip ?? '198.51.100.1') : null) } });
async function join(code, q = '', ip) { const r = await worker.fetch(req(`/ws/g-${code}${q}`, ip ? { ip } : {}), env); const client = r.webSocket, server = client && client.peerSide; return { r, client, server, room: rooms.get('g-' + code) }; }

const fails = [];
const check = (name, ok, why) => { if (!ok) fails.push(`${name}: ${why}`); say(`${ok ? '✓' : '✗'} ${name}`); };

// 1. isolation
{ const a1 = await join('aaaa', '?c=1'), a2 = await join('aaaa', '?j=1'), b1 = await join('bbbb', '?c=1');
  await a1.room.webSocketMessage(a1.server, JSON.stringify({ t: 'p', p: { secret: 'ROOM-A-ONLY' } }));
  const leak = b1.server.out.some(s => s.includes('ROOM-A-ONLY')), got = a2.server.out.some(s => s.includes('ROOM-A-ONLY'));
  check('a room message stays in its room', got && !leak && a1.room !== b1.room, `other room got it: ${leak}, same room got it: ${got}`); }
// 2a. size limit
{ const r1 = await join('size1', '?c=1'), r2 = await join('size1', '?j=1'); const big = JSON.stringify({ t: 'p', p: { x: 'y'.repeat(40000) } });
  await r1.room.webSocketMessage(r1.server, big);
  check('a message over the size limit is dropped', !r2.server.out.some(s => s.length > 32768), 'the big message was passed on'); }
// 2b. rate limit
{ const r1 = await join('rate1', '?c=1'), r2 = await join('rate1', '?j=1');
  for (let i = 0; i < 130; i++) await r1.room.webSocketMessage(r1.server, JSON.stringify({ t: 'p', p: { i } }));
  const passed = r2.server.msgs().filter(m => m.t === 'p').length;
  check('a phone over the rate limit is cut off', r1.server.closed && r1.server.closed.code === 1008 && passed <= 120, `closed=${JSON.stringify(r1.server.closed)} passed=${passed}`); }
// 3. joining a code nobody opened, and malformed paths
{ const j = await join('none1', '?j=1'); const told = j.client && j.client.peerSide.out.concat(j.client.out).some(s => s.includes('noroom'));
  const closed = j.client && (j.client.closed || j.client.peerSide.closed);
  check('joining a code nobody opened is refused', told && closed && closed.code === 4004 && !(j.room.ctx.socks.length), `told=${told} closed=${JSON.stringify(closed)}`);
  const bad = await Promise.all(['/ws/g-ab', '/ws/g-abcdefg', '/ws/x-abcd', '/ws/g-AB$D'].map(p => worker.fetch(req(p), env)));
  check('malformed room paths are refused', bad.every(r => r.status === 404), bad.map(r => r.status).join(','));
  const nows = await worker.fetch(req('/ws/g-abcd', { upgrade: '' }), env); check('a room needs a WebSocket', nows.status === 426, String(nows.status)); }
// 4. nothing a player sends is logged
{ const r1 = await join('logs1', '?c=1'); await join('logs1', '?j=1'); const chat = 'CHAT-TEXT-' + Date.now();
  await r1.room.webSocketMessage(r1.server, JSON.stringify({ t: 'p', p: { ch: [{ x: chat }] } })); await r1.room.webSocketMessage(r1.server, 'not json ' + chat);
  await r1.room.webSocketClose(r1.server); await r1.room.alarm();
  const src = fs.readFileSync(copy, 'utf8').replace(/\/\/[^\n]*/g, '');
  check('nothing a player sends is written to the logs', !logged.some(l => l.includes(chat)) && !/\bconsole\.\w+\s*\(/.test(src), `logged=${logged.length} console in source=${/\bconsole\./.test(src)}`); }

// 5. guessing: failed joins from one source count across codes, past the limit the source is refused
{ const host = await join('real1', '?c=1', '203.0.113.9');
  const IP = '192.0.2.77'; const tell = j => (j.client ? j.client.peerSide.out.concat(j.client.out) : []).some(s => s.includes('noroom'));
  const before = await join('real1', '?j=1', IP); const okBefore = !tell(before) && before.server && !before.server.closed;
  let refusedUnknown = 0; for (let i = 0; i < 20; i++) if (tell(await join('zz' + String(i).padStart(3, '0'), '?j=1', IP))) refusedUnknown++;
  const after = await join('real1', '?j=1', IP); const blocked = tell(after);
  const other = await join('real1', '?j=1', '198.51.100.200'); const otherOk = !tell(other) && other.server && !other.server.closed;
  const stored = [...rooms.values()].some(r => [...(r.ctx.storageDump ? r.ctx.storageDump() : [])].some(v => JSON.stringify(v).includes(IP)));
  check('a source that failed 20 joins on different codes is refused', refusedUnknown === 20 && blocked, `unknown refused=${refusedUnknown} then real room refused=${blocked}`);
  check('joining an open room is untouched by the limit', okBefore && otherOk, `before=${okBefore} other source=${otherOk}`);
  check('the source address is never stored or logged', !stored && !logged.some(l => l.includes(IP)), `stored=${stored}`); }
// 6. a request that says neither ?c=1 nor ?j=1
{ const j = await join('noflag'); const told = j.client && j.client.peerSide.out.concat(j.client.out).some(s => s.includes('noroom'));
  check('a request with neither ?c=1 nor ?j=1 is refused', told && !(j.room.ctx.socks.length), `told=${told}`); }

fs.rmSync(tmp, { recursive: true, force: true });
if (fails.length) { say(`${fails.length} failed`); for (const f of fails) say('  ' + f); process.exit(1); }
say('all worker guards passed');

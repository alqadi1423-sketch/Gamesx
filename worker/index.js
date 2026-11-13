// Cloudflare Worker: serves the site from ./public and relays each private room over WebSockets.
// Every room code gets its own Durable Object. The server keeps nothing about the game:
// players send their state, and the room passes it on to everyone else in the same room.

// the app names every room 'g-' + its 4-6 letter code; nothing else gets a room
const ROOM_PATH = /^\/ws\/(g-[a-z0-9]{4,6})$/;
// the biggest real message is a drawing game near its end (about 15 KB); nearby rooms stop at 32 KB too
const MAX_MSG = 32768;
// a phone sends about one message per move (fast test play peaks at 40 in 10 s); more than this is a script
const RATE_MAX = 60, RATE_MS = 10000;

export class Room {
  constructor(ctx, env) { this.ctx = ctx; this.rate = new Map(); } // peer -> {t0, n, cut}; only lives while the room is awake

  peers() {
    return this.ctx.getWebSockets().map(ws => { try { return ws.deserializeAttachment()?.peer; } catch { return null; } }).filter(p => p && !this.rate.get(p)?.cut);
  }

  broadcast(obj, except) {
    const s = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws !== except) { try { ws.send(s); } catch {} }
  }

  async fetch(req) {
    if (this.ctx.getWebSockets().length >= 16) return new Response('room is full', { status: 429 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const peer = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer });
    server.send(JSON.stringify({ t: 'hello', peer, peers: this.peers().filter(p => p !== peer) }));
    this.broadcast({ t: 'join', peer }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment() || {};
    const now = Date.now(); let r = this.rate.get(a.peer);
    if (r?.cut) return;
    if (!r || now - r.t0 >= RATE_MS) this.rate.set(a.peer, r = { t0: now, n: 0 });
    if (++r.n > RATE_MAX) {
      r.cut = true;
      this.broadcast({ t: 'leave', peer: a.peer }, ws);
      try { ws.close(1008, 'too many messages'); } catch {}
      return;
    }
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    if (m.t === 'p') this.broadcast({ t: 'p', peer: a.peer, p: m.p ?? {} }, ws);
    else if (m.t === 'ping') { try { ws.send('{"t":"pong"}'); } catch {} }
  }

  async webSocketClose(ws) {
    const a = ws.deserializeAttachment() || {};
    this.rate.delete(a.peer);
    this.broadcast({ t: 'leave', peer: a.peer }, ws);
    try { ws.close(); } catch {}
  }

  async webSocketError(ws) { return this.webSocketClose(ws); }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/ws/')) {
      const m = url.pathname.match(ROOM_PATH);
      if (!m) return new Response('no such room', { status: 404 });
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    if (url.pathname === '/version.json') {
      // the Android app asks this from its own pages, so it needs to be readable from any origin
      // (wrangler.jsonc runs the Worker first for this path, or the static file would skip these headers)
      const r = await env.ASSETS.fetch(req);
      const h = new Headers(r.headers);
      h.set('Access-Control-Allow-Origin', '*');
      h.set('Cache-Control', 'no-store');
      return new Response(r.body, { status: r.status, headers: h });
    }
    return env.ASSETS.fetch(req);
  }
};

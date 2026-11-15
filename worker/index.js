// Cloudflare Worker: serves the site from ./public and relays each private room over WebSockets.
// Every room code gets its own Durable Object. The server keeps nothing about the game:
// players send their state, and the room passes it on to everyone else in the same room.

// the app names every room 'g-' + its 4-6 letter code; nothing else gets a room
const ROOM_PATH = /^\/ws\/(g-[a-z0-9]{4,6})$/;
// the biggest real message is a drawing game near its end (about 15 KB); nearby rooms stop at 32 KB too
const MAX_MSG = 32768;
// a phone sends about one message per move (fast test play peaks at 40 in 10 s); more than this is a script
const RATE_MAX = 120, RATE_MS = 10000;
// how long an empty room can still be joined (its players coming back after a break)
const ROOM_KEEP = 12 * 3600 * 1000;
// a phone that has sent nothing (no message, no ping) for SILENT is gone: its socket is closed and the others told it left.
// Without this a phone that lost its signal or changed networks stays in the room (a ghost) until Cloudflare's TCP gives up,
// and ghosts fill the room's 16 places. The app pings after 5 s of quiet (older ones every 20 s)
const SILENT = 45000, SWEEP = 20000;

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx; this.rate = new Map(); // peer -> {t0, n, cut}; only lives while the room is awake
    this.seen = new Map(); // peer -> the last time it sent a message (while awake; pings are answered without waking the room)
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}')); } catch {}
  }
  lastHeard(ws) {
    const a = ws.deserializeAttachment() || {}; let p = 0;
    try { const d = this.ctx.getWebSocketAutoResponseTimestamp(ws); if (d) p = d.getTime(); } catch {}
    return Math.max(a.at || 0, p, this.seen.get(a.peer) || 0);
  }
  async sweepSoon() { try { const al = await this.ctx.storage.getAlarm(); if (!al || al > Date.now() + SWEEP) await this.ctx.storage.setAlarm(Date.now() + SWEEP); } catch {} }

  // the sockets still in the room (one closed here for silence or flooding may linger until its phone answers the close)
  alive() { return this.ctx.getWebSockets().filter(ws => { try { const a = ws.deserializeAttachment(); return !a?.gone && !this.rate.get(a?.peer)?.cut; } catch { return false; } }); }
  peers() {
    return this.alive().map(ws => { try { return ws.deserializeAttachment()?.peer; } catch { return null; } }).filter(Boolean);
  }
  shut(ws, code, why) { const a = ws.deserializeAttachment() || {}; try { ws.serializeAttachment({ ...a, gone: true }); } catch {} try { ws.close(code, why); } catch {} }

  broadcast(obj, except) {
    const s = JSON.stringify(obj);
    for (const ws of this.alive()) if (ws !== except) { try { ws.send(s); } catch {} }
  }

  // a room exists once its owner opened it (?c=1). Joining a code nobody opened is refused before the player gets in,
  // so a typo or a random guess never makes a room. An empty room stays open for ROOM_KEEP so its players can come back.
  async isOpen() {
    const o = await this.ctx.storage.get('open');
    if (this.ctx.getWebSockets().length) { if (!o) await this.ctx.storage.put('open', { at: Date.now() }); return true; } // a room already live (opened before this rule)
    return !!o && Date.now() - o.at < ROOM_KEEP;
  }

  refuse(t, code) {
    const [c, s] = Object.values(new WebSocketPair());
    s.accept(); s.send(JSON.stringify({ t })); s.close(code, t);
    return new Response(null, { status: 101, webSocket: c });
  }

  async fetch(req) {
    const q = new URL(req.url || 'http://x/').searchParams;
    if (q.get('c') === '1') {
      // a new room's code is already in use: the app picks another code
      if (this.ctx.getWebSockets().length || await this.isOpen()) return this.refuse('taken', 4009);
      await this.ctx.storage.put('open', { at: Date.now() });
    } else if (q.get('j') === '1') { if (!await this.isOpen()) return this.refuse('noroom', 4004); }
    // an older app says neither: it opens the room as before
    else if (!await this.isOpen()) await this.ctx.storage.put('open', { at: Date.now() });
    if (this.alive().length >= 16) {
      // a browser can't read an HTTP error on a WebSocket upgrade, so accept it, say why, and close
      const [c, s] = Object.values(new WebSocketPair());
      s.accept(); s.send('{"t":"full"}'); s.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: c });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const peer = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer, at: Date.now() });
    server.send(JSON.stringify({ t: 'hello', peer, peers: this.peers().filter(p => p !== peer) }));
    this.broadcast({ t: 'join', peer }, server);
    await this.sweepSoon();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment() || {};
    const now = Date.now(); this.seen.set(a.peer, now); let r = this.rate.get(a.peer);
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
    // the last one out: the room stays open for ROOM_KEEP, then it is forgotten
    try { if (this.alive().filter(x => x !== ws).length === 0) { await this.ctx.storage.put('open', { at: Date.now() }); await this.ctx.storage.setAlarm(Date.now() + ROOM_KEEP + 60000); } } catch {}
    this.rate.delete(a.peer); this.seen.delete(a.peer);
    this.broadcast({ t: 'leave', peer: a.peer }, ws);
    try { ws.close(); } catch {}
  }

  async webSocketError(ws) { return this.webSocketClose(ws); }

  async alarm() {
    if (this.ctx.getWebSockets().length) {
      const now = Date.now();
      for (const ws of this.alive()) if (now - this.lastHeard(ws) > SILENT) {
        const a = ws.deserializeAttachment() || {};
        this.shut(ws, 4008, 'silent'); this.seen.delete(a.peer);
        this.broadcast({ t: 'leave', peer: a.peer }, ws);
      }
      // the last one out sets the long alarm (webSocketClose); until then the room is checked every SWEEP
      if (this.alive().length) await this.ctx.storage.setAlarm(Date.now() + SWEEP);
      else { await this.ctx.storage.put('open', { at: Date.now() }); await this.ctx.storage.setAlarm(Date.now() + ROOM_KEEP + 60000); }
      return;
    }
    const o = await this.ctx.storage.get('open');
    if (!o || Date.now() - o.at >= ROOM_KEEP) await this.ctx.storage.deleteAll();
  }
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

// Cloudflare Worker: serves the site from ./public and relays each private room over WebSockets.
// Every room code gets its own Durable Object. The server keeps nothing about the game:
// players send their state, and the room passes it on to everyone else in the same room.

export class Room {
  constructor(ctx, env) { this.ctx = ctx; }

  peers() {
    return this.ctx.getWebSockets().map(ws => { try { return ws.deserializeAttachment()?.peer; } catch { return null; } }).filter(Boolean);
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
    if (typeof msg !== 'string' || msg.length > 64000) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    const a = ws.deserializeAttachment() || {};
    if (m.t === 'p') this.broadcast({ t: 'p', peer: a.peer, p: m.p ?? {} }, ws);
    else if (m.t === 'ping') { try { ws.send('{"t":"pong"}'); } catch {} }
  }

  async webSocketClose(ws) {
    const a = ws.deserializeAttachment() || {};
    this.broadcast({ t: 'leave', peer: a.peer }, ws);
    try { ws.close(); } catch {}
  }

  async webSocketError(ws) { return this.webSocketClose(ws); }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/ws\/([a-z0-9][a-z0-9_.-]{2,47})$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    return env.ASSETS.fetch(req);
  }
};

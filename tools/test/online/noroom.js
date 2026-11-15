// Usage: node tools/test/online/noroom.js <port>   (about 40 s; ends with ALL OK or FAILS ...)
// 1) a random code is not a room; 2) two newcomers on the same random code: neither opens it; 3) a real room still works, and a guest takes over when the host leaves
const L = require('./lib'); const port = +process.argv[2]; const fails = [];
(async () => { const srv = await L.startServer(port, {}); const b = await L.newBrowser();
 try {
  const a = await L.newPlayer(b, port, 'A');
  await a.click('[data-a="lobby"]'); await a.fill('#code', 'zq7k');
  await a.evaluate(() => { window.__modes = []; setInterval(() => window.__modes.push(S.mode), 50); });
  await a.click('[data-a="join"]'); await L.sleep(3000);
  const ms = await a.evaluate(() => [...new Set(window.__modes)]); console.log('modes seen while joining', ms); if (ms.includes('online')) fails.push('random code entered the room');
  let r = await a.evaluate(() => ({ mode: S.mode, err: S.roomErr, host: typeof amHost === 'function' ? amHost() : null }));
  console.log('random code ->', JSON.stringify(r)); if (r.mode !== 'lobby' || !r.err) fails.push('random code not refused');
  const p = await L.newPlayer(b, port, 'P'), q = await L.newPlayer(b, port, 'Q');
  for (const x of [p, q]) { await x.click('[data-a="lobby"]'); await x.fill('#code', 'xw3m'); await x.click('[data-a="join"]'); }
  await L.sleep(3000);
  const rr = await Promise.all([p, q].map(x => x.evaluate(() => ({ mode: S.mode, host: amHost() }))));
  console.log('two newcomers ->', JSON.stringify(rr)); if (rr.some(x => x.mode !== 'lobby' || x.host)) fails.push('two newcomers opened a room');
  const h = await L.newPlayer(b, port, 'H'), g1 = await L.newPlayer(b, port, 'G1'), g2 = await L.newPlayer(b, port, 'G2');
  const code = await L.createRoom(h); await L.joinRoom(g1, code); await L.joinRoom(g2, code); await L.sleep(1500);
  await L.pickGame(h, 'uno'); await L.sleep(2000);
  await h.ctx.close(); await L.sleep(22000);
  const t = await Promise.all([g1, g2].map(x => x.evaluate(() => ({ mode: S.mode, host: amHost(), g: S.st.g }))));
  console.log('after host left ->', JSON.stringify(t)); if (!t.some(x => x.host) || t.some(x => x.mode !== 'online')) fails.push('no takeover');
  const late = await L.newPlayer(b, port, 'Late'); await L.joinRoom(late, code); await L.sleep(2000);
  const lt = await late.evaluate(() => ({ mode: S.mode, g: S.st.g, host: amHost() })); console.log('late joiner ->', JSON.stringify(lt)); if (lt.mode !== 'online' || lt.host) fails.push('late joiner wrong');
 } finally { await b.close(); srv.kill(); }
 console.log(fails.length ? 'FAILS ' + fails.join('; ') : 'ALL OK'); })();

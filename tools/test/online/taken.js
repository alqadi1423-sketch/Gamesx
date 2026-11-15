// Usage: node tools/test/online/taken.js <port>: creating a room on a code already open picks another code (prints OK or BAD)
const L = require('./lib'); const port = +process.argv[2];
(async () => { const srv = await L.startServer(port, {}); const b = await L.newBrowser();
 try { const h = await L.newPlayer(b, port, 'H'); const code = await L.createRoom(h);
  const x = await L.newPlayer(b, port, 'X'); await x.click('[data-a="lobby"]'); await L.sleep(300);
  await x.evaluate(c => enterRoom(c, true, null), code); await L.sleep(2500);
  const r = await x.evaluate(() => ({ mode: S.mode, code: S.code, host: amHost() })); console.log('first code', code, '->', JSON.stringify(r), r.code !== code && r.host ? 'OK' : 'BAD');
 } finally { await b.close(); srv.kill(); } })();

// Usage: node tools/test/online/reload.js <port>: a reload comes back to the same screen (local list, local game with the same board, home, room as host, game as guest)
const L = require('./lib'); const port = +process.argv[2]; const out = [];
(async () => { const srv = await L.startServer(port, {}); const b = await L.newBrowser();
 try { const p = await L.newPlayer(b, port, 'A');
  const where = () => p.evaluate(() => ({ mode: S.mode, g: S.st.g, browse: !!S.browse, code: S.code }));
  // local: game list, then a game, then the list from inside a game
  await p.click('[data-a=local]'); await L.sleep(300); await p.reload(); await L.sleep(700); out.push(['local grid', await where()]);
  await p.click('[data-a=pick][data-g="c4"]'); await L.sleep(500); const c = await p.$('.cover [data-a=reveal]'); if (c) await c.click();
  await p.evaluate(() => { const e = app.querySelector('.board [data-ga]'); e && e.click(); }); await L.sleep(400);
  const d0 = await p.evaluate(() => JSON.stringify(S.st.d.b || S.st.d)); await p.reload(); await L.sleep(800);
  const d1 = await p.evaluate(() => S.st.d && JSON.stringify(S.st.d.b || S.st.d)); out.push(['local game', await where(), d0 === d1 ? 'same board' : 'BOARD CHANGED']);
  await p.evaluate(() => { S.browse = true; render(); }); await L.sleep(200); await p.reload(); await L.sleep(800); out.push(['list from game', await where()]);
  // home stays home
  await p.evaluate(() => { S.mode = null; S.browse = false; render(); }); await L.sleep(200); await p.reload(); await L.sleep(600); out.push(['home', await where()]);
  // online: room lobby, then a game
  const g = await L.newPlayer(b, port, 'G'); const code = await L.createRoom(p); await L.joinRoom(g, code); await L.sleep(1000);
  await p.reload(); await L.sleep(4000); out.push(['host room', await where()]);
  await L.pickGame(p, 'uno'); await L.sleep(1500); await g.reload(); await L.sleep(4000); out.push(['guest in game', await g.evaluate(() => ({ mode: S.mode, g: S.st.g, code: S.code, me: S.me }))]);
 } finally { await b.close(); srv.kill(); } for (const o of out) console.log(JSON.stringify(o)); })();

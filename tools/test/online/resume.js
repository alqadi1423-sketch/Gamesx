// Usage: node tools/test/online/resume.js <port>: host and guest reload and come back to their room with «ارجع لغرفتك» (prints where each one is)
const L = require('./lib'); const port = +process.argv[2];
(async () => { const srv = await L.startServer(port, {}); const b = await L.newBrowser();
 try { const h = await L.newPlayer(b, port, 'H'), g = await L.newPlayer(b, port, 'G');
  const code = await L.createRoom(h); await L.joinRoom(g, code); await L.sleep(1200); await L.pickGame(h, 'ttt'); await L.sleep(1500);
  // host reloads alone in the room after the guest leaves too: both come back
  await h.reload(); await L.sleep(800); await h.click('[data-a=lobby]'); await L.sleep(400); const btn = await h.$('[data-a=resume]'); console.log('resume button', !!btn); if (btn) await btn.click(); await L.sleep(6000);
  console.log('host after reload', JSON.stringify(await h.evaluate(() => ({ mode: S.mode, host: amHost(), g: S.st.g }))));
  console.log('guest', JSON.stringify(await g.evaluate(() => ({ mode: S.mode, host: amHost(), g: S.st.g }))));
  // guest reloads and resumes
  await g.reload(); await L.sleep(800); await g.click('[data-a=lobby]'); await L.sleep(400); const b2 = await g.$('[data-a=resume]'); if (b2) await b2.click(); await L.sleep(5000);
  console.log('guest after reload', JSON.stringify(await g.evaluate(() => ({ mode: S.mode, host: amHost(), g: S.st.g }))));
 } finally { await b.close(); srv.kill(); } })();

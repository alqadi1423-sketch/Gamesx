// node tools/test/q-cell-shots.js <port> <outdir> : screens of «تحدي الخلية» on one phone and online (for the owner and the log)
const L = require('./online/lib'); const path = require('path');
const port = +process.argv[2], OUT = process.argv[3];
(async () => {
  const srv = await L.startServer(port); const b = await L.newBrowser();
  const shot = async (p, name) => { await p.evaluate(() => { S.modal = null; S.showResult = false; render(); }); await L.sleep(350); await p.screenshot({ path: path.join(OUT, name + '.png') }); };
  const fill = (p, k) => p.evaluate(k => { let d = S.st.d; const r = Math.random; for (let j = 0; j < k && d.ph === 'pick'; j++) { const free = [...d.o].map((c, i) => c === '.' ? i : -1).filter(i => i >= 0); const c = free[(j * 7) % free.length];
    d = QC.choose({ ...d, gm: 'host' }, -1, c, r, Date.now()); d = QC.judge(d, j % 3 === 2 ? 1 : j % 2, r, Date.now()); d = { ...d, gm: S.st.d.gm }; } act(d); }, k);
  for (const dark of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
    const p = await ctx.newPage(); await p.goto(`http://localhost:${port}/`); await p.waitForFunction(() => typeof S === 'object' && typeof GAMES === 'object' && GAMES.q_cell);
    await p.click('[data-a=local]'); await p.click('[data-a=inc]'); await p.click('[data-a=inc]');
    await p.evaluate(() => setGame('q_cell')); await L.sleep(500); const sx = dark ? '-dark' : '';
    await shot(p, 'local-set' + sx);
    await p.evaluate(() => { app.querySelector('[data-ga="so"][data-i="11"]').click(); }); await L.sleep(200); await p.evaluate(() => app.querySelector('[data-ga="go"]').click()); await L.sleep(300);
    await fill(p, 6); await shot(p, 'local-host-pick' + sx);
    await p.evaluate(() => { const b = app.querySelector('.qc-tap'); b.click(); }); await L.sleep(300); await shot(p, 'local-host-q' + sx);
    if (dark) { await ctx.close(); continue; }
    // turn mode
    await p.evaluate(() => { const d = QC.setOpt({ ...S.st.d, ph: 'set', gm: 'turn' }, 'gm', 'turn'); act(QC.begin({ ...d, rw: [1, 0], rn: 2 }, Math.random)); }); await L.sleep(300);
    await fill(p, 5); await p.evaluate(() => app.querySelector('.qc-tap').click()); await L.sleep(300); await shot(p, 'local-turn-q');
    await p.evaluate(() => { const d = S.st.d; const w = [0, 1, 2, 3].find(j => j !== d.q.A); app.querySelector(`[data-ga="a"][data-i="${w}"]`).click(); }); await L.sleep(300); await shot(p, 'local-turn-steal');
    // a round won
    await p.evaluate(() => { let d = S.st.d; d = QC.judge({ ...d, gm: 'host' }, -1, Math.random, Date.now()); const n = d.n; let o = d.o; for (let y = 0; y < n; y++) { const c = y * n + 1; o = o.slice(0, c) + '.' + o.slice(c + 1); }
      d = { ...d, o, gm: 'host' }; for (let y = 0; y < n && d.ph === 'pick'; y++) { d = QC.choose({ ...d, sd: 0 }, -1, y * n + 1, Math.random, Date.now()); d = QC.judge(d, 0, Math.random, Date.now()); } act({ ...d, rdl: Date.now() + 60000 }); }); await L.sleep(400); await shot(p, 'local-round');
    await ctx.close(); }
  // online: a host and a guest, buzz then answer
  const A = await L.newPlayer(b, port, 'سلمان', 'A'); const code = await L.createRoom(A); const G = await L.newPlayer(b, port, 'نورة', 'B'); await L.joinRoom(G, code);
  for (const p of [A, G]) await p.setViewportSize({ width: 390, height: 844 });
  await L.sleep(800); await L.pickGame(A, 'q_cell'); await L.sleep(900); await shot(G, 'online-set');
  await A.evaluate(() => { act(QC.begin(S.st.d, Math.random)); }); await L.sleep(600);
  await A.evaluate(() => { let d = S.st.d; const r = Math.random; for (let j = 0; j < 5; j++) { const free = [...d.o].map((c, i) => c === '.' ? i : -1).filter(i => i >= 0); d = QC.choose({ ...d, gm: 'host' }, -1, free[(j * 5) % free.length], r, Date.now()); d = QC.judge(d, j % 2, r, Date.now()); d = { ...d, gm: 'buzz' }; } act(d); }); await L.sleep(700);
  await shot(G, 'online-pick');
  await A.evaluate(() => { const d = S.st.d; const s = d.sx.indexOf(d.sd); const c = [...d.o].indexOf('.'); act(QC.choose(d, s, c, Math.random, Date.now())); }); await L.sleep(800);
  await shot(G, 'online-q');
  await G.click('[data-ga="bz"]'); await L.sleep(900); await shot(G, 'online-ans'); await shot(A, 'online-ans-host');
  await A.evaluate(() => { const d = S.st.d; const w = [0, 1, 2, 3].find(j => j !== d.q.A); act(QC.answer(d, d.q.by, w, Math.random, Date.now())); }); await L.sleep(800); await shot(A, 'online-steal');
  // typed
  await A.evaluate(() => { let d = S.st.d; d = QC.tick({ ...d, q: { ...d.q, dl: 1 } }, Math.random, Date.now()); act({ ...d, am: 'type' }); }); await L.sleep(500);
  await A.evaluate(() => { const d = S.st.d; const s = d.sx.indexOf(d.sd); const c = [...d.o].indexOf('.'); act(QC.choose(d, s, c, Math.random, Date.now())); }); await L.sleep(700);
  await G.click('[data-ga="bz"]'); await L.sleep(800); await G.fill('.qc-in', 'الرياض'); await shot(G, 'online-typed');
  await b.close(); srv.kill(); console.log('shots done');
})().catch(e => { console.error(e); process.exit(1); });

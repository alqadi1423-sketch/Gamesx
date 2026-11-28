'use strict';
// node tools/test/fitcheck.js [--w=390] [--h=844] [--n=3] [--games=a,b] [--taps=8] [--shots=dir]
// The owner's rule: one fixed screen. For every game (one phone, n players) it opens the game, taps a few legal-looking
// buttons, and measures how far the play area (.board) runs past the room the frame leaves it. Prints one line per game
// that does not fit, and FIT n/m at the end. --shots saves a picture of each game.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const net = require('net'); const path = require('path');
const A = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const W = +(A.w || 390), H = +(A.h || 844), N = +(A.n || 3), TAPS = +(A.taps || 8);
const ROOT = path.join(__dirname, '..', '..', 'public');
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
(async () => {
  const port = await freePort(); const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700)); const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H } }); const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.evaluate(() => localStorage.clear()); await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.waitForFunction(() => typeof S === 'object'); await p.click('[data-a=local]'); for (let k = 2; k < N; k++) await p.click('[data-a=inc]');
  await p.waitForFunction(() => typeof GAMES === 'object' && Object.keys(GAMES).length > 100, null, { timeout: 30000 });
  const games = A.games ? A.games.split(',') : await p.evaluate(n => Object.keys(GAMES).filter(g => { const G = GAMES[g]; return (G.minP || 2) <= n && (G.maxP || 8) >= n; }), N);
  const bad = []; let ok = 0;
  for (const g of games) {
    const r = await p.evaluate(async ({ g, taps }) => {
      try { S.modal = null; setGame(g); } catch (e) { return { err: String(e) }; }
      const sleep = ms => new Promise(r => setTimeout(r, ms)); let worst = 0;
      const measure = () => { const bd = app.querySelector('.board'); if (!bd) return 0; const page = document.scrollingElement.scrollHeight - innerHeight; return Math.max(bd.scrollHeight - bd.clientHeight, page, 0); };
      for (let t = 0; t <= taps; t++) {
        await sleep(t ? 160 : 400); if (app.querySelector('.cover')) { app.querySelector('.cover').click(); await sleep(150); }
        S.showResult = false; if (S.modal) { S.modal = null; render(); }
        worst = Math.max(worst, measure());
        const els = [...app.querySelectorAll('.board [data-ga]')].filter(e => !e.disabled); if (!els.length) continue;
        try { els[Math.floor(Math.random() * els.length)].click(); } catch (e) {}
      }
      return { over: worst };
    }, { g, taps: TAPS });
    if (A.shots) await p.screenshot({ path: path.join(A.shots, g + '.png') });
    if (r.err || r.over > 2) { bad.push([g, r.err || r.over]); console.log('OVER', g, r.err || r.over + 'px'); } else ok++;
  }
  console.log(`FIT ${ok}/${games.length} at ${W}x${H} with ${N} players`);
  console.log('OVERLIST', JSON.stringify(bad.sort((a, b) => (b[1] || 0) - (a[1] || 0))));
  await b.close(); srv.kill();
})();

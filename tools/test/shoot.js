'use strict';
// Screenshot games in local mode. Usage:
// [ROOT=<public>] node tools/test/shoot.js [--root=<public>] [--out=dir] --games=ttt,uno [--n=2] [--dark] [--moves=0,6,20] [--w=390] [--h=844] [--bots] [--screens]
// root defaults to public/ of this repository, out to tools/test/results/shots.
// Takes <out>/<game>-n<N>[-dark]-m<K>.png after K random legal-looking taps (passes covers, closes modals). --screens also shoots home/grid/settings.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const net = require('net');
const A = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const ROOT = require('path').resolve(A.root || process.env.ROOT || require('path').join(__dirname, '..', '..', 'public')), OUT = A.out || require('path').join(__dirname, 'results', 'shots'), N = +(A.n || 2), DARK = !!A.dark, MOVES = (A.moves || '0').split(',').map(Number), W = +(A.w || 390), H = +(A.h || 844);
require('fs').mkdirSync(OUT, { recursive: true });
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
(async () => {
  const port = await freePort(); const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  try {
    await new Promise(r => setTimeout(r, 700));
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: DARK ? 'dark' : 'light' });
    const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    p.on('pageerror', e => console.log('PAGEERROR', e.message));
    const base = `http://127.0.0.1:${port}/index.html`, sfx = `-n${N}${DARK ? '-dark' : ''}`;
    const setup = async () => {
      await p.goto(base); await p.evaluate(() => localStorage.clear()); await p.goto(base); await p.waitForTimeout(250);
      await p.click('[data-a=local]'); for (let k = 2; k < N; k++) await p.click('[data-a=inc]');
      if (A.bots) for (let s = 1; s < N; s++) { await p.click(`[data-a=botT][data-i="${s}"]`); }
    };
    if (A.screens) {
      await p.goto(base); await p.evaluate(() => localStorage.clear()); await p.goto(base); await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/screen-home${sfx}.png` });
      await setup(); await p.screenshot({ path: `${OUT}/screen-grid${sfx}.png` }); await p.screenshot({ path: `${OUT}/screen-gridfull${sfx}.png`, fullPage: true });
      await p.click('.top [data-a=m-settings]').catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/screen-settings${sfx}.png` });
    }
    for (const g of (A.games ? A.games.split(',') : [])) {
      try {
        await setup(); await p.locator(`[data-a=pick][data-g="${g}"]`).click(); await p.waitForTimeout(500);
        let done = 0;
        for (let step = 0; step <= Math.max(...MOVES); step++) {
          // pass the device / close sheets first
          for (let k = 0; k < 3; k++) { const c = await p.$('.cover [data-a=reveal]'); if (c) { await c.click(); await p.waitForTimeout(250); } }
          if (MOVES.includes(step)) { await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${g}${sfx}-m${step}.png` }); done++; }
          if (step === Math.max(...MOVES)) break;
          const ok = await p.evaluate(() => {
            const vis = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none'; };
            if (document.querySelector('.sheet.result')) return 'result';
            const els = [...document.querySelectorAll('.board button:not(:disabled), .board [data-ga], .board [data-a], .status button:not(:disabled)')].filter(e => vis(e) && !/^(again|grid|browse|m-help|closeres)$/.test(e.dataset.a || ''));
            if (!els.length) return 'none'; const e = els[Math.floor(Math.random() * els.length)]; e.click(); return 'ok';
          });
          if (ok === 'result') { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${g}${sfx}-result.png` }); break; }
          await p.waitForTimeout(ok === 'none' ? 600 : 180);
          // type something into empty inputs (word games)
          await p.evaluate(() => { const f = document.querySelector('.board input.field:not([disabled])'); if (f && !f.value) { f.value = 'كلمة'; f.dispatchEvent(new Event('input', { bubbles: true })); } });
        }
      } catch (e) { console.log(g, 'ERR', e.message.slice(0, 120)); }
    }
    await b.close();
  } finally { srv.kill(); }
})();

'use strict';
// Performance with CPU throttling (CDP Emulation.setCPUThrottlingRate): load, idle CPU on home and the game list, scrolling,
// and for each game the open time, idle CPU and tap-to-paint latency.
// node tools/test/perf.js [--root=<public>] --games=a,b [--taps=15] [--cpu=6] [--dark]   (root defaults to public/ of this repository)
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const net = require('net');
const A = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return [m[1], m[2] ?? '1']; }));
const ROOT = require('path').resolve(A.root || process.env.ROOT || require('path').join(__dirname, '..', '..', 'public')), CPU = +(A.cpu || 6), TAPS = +(A.taps || 15);
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
(async () => {
  const port = await freePort(); const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const out = {};
  try {
    await new Promise(r => setTimeout(r, 700));
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: A.dark ? 'dark' : 'light' });
    const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
    const met = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const diff = (a, b) => ({ task: +(1000 * (b.TaskDuration - a.TaskDuration)).toFixed(0), script: +(1000 * (b.ScriptDuration - a.ScriptDuration)).toFixed(0), style: +(1000 * (b.RecalcStyleDuration - a.RecalcStyleDuration)).toFixed(0), layout: +(1000 * (b.LayoutDuration - a.LayoutDuration)).toFixed(0) });
    const base = `http://127.0.0.1:${port}/index.html`;
    await p.goto(base); await p.evaluate(() => localStorage.clear());
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    let t0 = Date.now(); await p.goto(base); await p.waitForSelector('[data-a=local]'); out.load = Date.now() - t0;
    let m0 = await met(); await p.waitForTimeout(3000); out.idleHome = diff(m0, await met());
    t0 = Date.now(); await p.click('[data-a=local]'); await p.waitForSelector('[data-a=pick]'); out.openGrid = Date.now() - t0;
    m0 = await met(); await p.waitForTimeout(3000); out.idleGrid = diff(m0, await met());
    m0 = await met(); await p.mouse.wheel(0, 1500); await p.waitForTimeout(600); await p.mouse.wheel(0, -1500); await p.waitForTimeout(600); out.scrollGrid = diff(m0, await met());
    out.games = {};
    for (const g of A.games.split(',')) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await p.goto(base); await p.waitForTimeout(200); await p.click('[data-a=local]');
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
      t0 = Date.now(); await p.locator(`[data-a=pick][data-g="${g}"]`).click(); await p.waitForSelector('.board'); const open = Date.now() - t0;
      await p.waitForTimeout(800);
      m0 = await met(); await p.waitForTimeout(3000); const idle = diff(m0, await met());
      const lat = []; const mt0 = await met();
      for (let i = 0; i < TAPS; i++) {
        const c = await p.$('.cover [data-a=reveal]'); if (c) { await c.click(); await p.waitForTimeout(150); }
        const r = await p.evaluate(() => new Promise(res => {
          const vis = el => { const r = el.getBoundingClientRect(); return r.width && r.height && getComputedStyle(el).pointerEvents !== 'none'; };
          if (document.querySelector('.sheet.result')) return res(-1);
          const els = [...document.querySelectorAll('.board button:not(:disabled), .board [data-ga], .board [data-a]')].filter(e => vis(e) && !/^(again|grid|browse|m-help|closeres)$/.test(e.dataset.a || ''));
          if (!els.length) return res(-2);
          const e = els[Math.floor(Math.random() * els.length)]; const t = performance.now(); e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
          requestAnimationFrame(() => setTimeout(() => res(performance.now() - t), 0));
        }));
        if (r >= 0) lat.push(r); await p.waitForTimeout(250);
      }
      const mt = diff(mt0, await met());
      lat.sort((a, b) => a - b);
      out.games[g] = { open, idle, taps: lat.length, medTap: lat.length ? +lat[lat.length >> 1].toFixed(0) : null, maxTap: lat.length ? +lat[lat.length - 1].toFixed(0) : null, during: mt };
    }
    await b.close();
  } finally { srv.kill(); }
  console.log(JSON.stringify(out));
})();

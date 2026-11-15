// Harness helpers: start the local worker stand-in, open players, make rooms, play random legal moves.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const HERE = __dirname;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function startServer(port, env = {}) {
  const p = spawn('node', [path.join(HERE, 'relay.mjs')], { env: { ...process.env, PORT: String(port), ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { p.stdout.on('data', d => { if (/listening/.test(d)) ok(); }); p.stderr.on('data', d => process.stderr.write('[srv] ' + d)); setTimeout(() => no(new Error('server timeout')), 5000); });
  return p;
}

// every page records what it sends (presence frames) and any page errors / alerts
const INIT = `
  window.__sent=[];window.__errs=[];window.__alerts=[];
  const _send=WebSocket.prototype.send;WebSocket.prototype.send=function(s){try{const m=JSON.parse(s);if(m.t==='p')window.__sent.push(s);if(window.__sent.length>4000)window.__sent.shift();}catch(e){}if(window.__drop)return;return _send.call(this,s);};
  window.alert=function(x){window.__alerts.push(String(x));};
  window.__ws=[];const _WS=WebSocket;window.WebSocket=function(u,p){const w=p?new _WS(u,p):new _WS(u);window.__ws.push(w);return w;};window.WebSocket.prototype=_WS.prototype;Object.assign(window.WebSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});
  window.addEventListener('error',e=>window.__errs.push(String(e.message)));
`;

async function newPlayer(browser, port, name, label) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.label = label || name;
  page.pageErrors = [];
  page.on('pageerror', e => page.pageErrors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') page.pageErrors.push('console: ' + m.text()); });
  page.on('dialog', d => { page.pageErrors.push('DIALOG ' + d.message()); d.dismiss().catch(() => {}); });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => typeof S === 'object' && typeof GAMES === 'object');
  if (name != null) await page.evaluate(n => { S.myName = n; try { localStorage.setItem('alaabna.name', n); } catch (e) {} }, name);
  page.ctx = ctx;
  return page;
}

async function createRoom(page) {
  await page.click('[data-a="lobby"]');
  await page.click('[data-a="create"]');
  await page.waitForFunction(() => S.mode === 'online' && S.code && S.nr, null, { timeout: 15000 });
  await page.evaluate(() => { S.modal = null; render(); });
  return page.evaluate(() => S.code);
}
async function joinRoom(page, code) {
  await page.click('[data-a="lobby"]');
  await page.fill('#code', code);
  await page.click('[data-a="join"]');
  await page.waitForFunction(() => S.mode === 'online' && S.nr && !S.pending, null, { timeout: 15000 });
}
const snap = page => page.evaluate(() => ({ s: S.st.s, g: S.st.g, d: S.st.d, sc: S.st.sc, cfg: S.st.cfg, me: S.me, roles: [...S.roles].sort(), host: actingHost() }));

async function converge(pages, timeout = 6000) {
  const t0 = Date.now(); let last;
  while (Date.now() - t0 < timeout) {
    const ss = await Promise.all(pages.map(snap));
    const k = ss.map(x => JSON.stringify([x.s, x.g, x.d, x.sc, x.cfg]));
    if (k.every(v => v === k[0])) return { ok: true, s: ss[0].s, st: ss };
    last = ss; await sleep(100);
  }
  return { ok: false, st: last };
}

// whose move is it on this page? (mkCtx().my true and not just a spectator)
const canMove = page => page.evaluate(() => { try { if (S.mode !== 'online' || !S.st.g || !S.st.d || S.st.d.win != null || S.browse) return false; const c = mkCtx(); return !!c.my; } catch (e) { return 'ERR ' + e.message; } });

// click one random enabled game button; fill free-text inputs first with something
async function randomMove(page, opts = {}) {
  return page.evaluate((opts) => {
    if (S.modal) { S.modal = null; render(); }
    S.showResult = false;
    const inputs = [...app.querySelectorAll('.board input[data-draft], .board textarea[data-draft]')];
    for (const el of inputs) {
      if (el.type === 'range') { const mn = +el.min || 0, mx = +el.max || 10; const v = mn + Math.floor(Math.random() * (mx - mn + 1)); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); continue; }
      if (!el.value) { const W = opts.words || ['كتاب', 'باب', 'قلم', 'شمس', 'بحر', 'جمل']; el.value = W[Math.floor(Math.random() * W.length)]; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    const els = [...app.querySelectorAll('.board [data-ga], .status [data-ga]')].filter(e => !e.disabled && !e.hasAttribute('disabled'));
    if (!els.length) return null;
    let pool = els;
    if (opts.prefer) { const p = els.filter(e => opts.prefer.includes(e.dataset.ga)); if (p.length && Math.random() < 0.7) pool = p; }
    if (opts.avoid) { const p = pool.filter(e => !opts.avoid.includes(e.dataset.ga)); if (p.length) pool = p; }
    const e = pool[Math.floor(Math.random() * pool.length)];
    const desc = e.dataset.ga + (e.dataset.i != null ? ':' + e.dataset.i : '');
    if (typeof e.click === 'function') e.click(); else e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return desc;
  }, opts);
}

// a move chosen by the game's own bot logic, played from this page as its seat (as if the human tapped it)
async function botMove(page, lv = 2) {
  return page.evaluate((lv) => {
    const d = S.st.d, G = GAMES[S.st.g]; const s = d.pl.indexOf(S.me); if (s < 0) return null;
    if (isSimul(G, d)) { if (hasPicked(d, s)) return null; if (G.botPick) { const p = G.botPick(d, s, lv); simulPick(d, s, p == null ? NOPICK : p); return 'pick'; } botClick(G, d, s, lv, true); return 'pickclick'; }
    if (d.turn !== s) return null;
    let nd = G.bot ? G.bot(d, s, lv) : undefined; if (nd === undefined) nd = botClick(G, d, s, lv, false);
    if (nd && nd !== d) { act(nd); return 'bot'; } return null;
  }, lv);
}
async function pickGame(page, g) {
  await page.evaluate(g => { S.modal = null; setGame(g); }, g);
}

async function newBrowser() { return chromium.launch(); }
module.exports = { botMove, startServer, newPlayer, createRoom, joinRoom, snap, converge, canMove, randomMove, pickGame, newBrowser, sleep };

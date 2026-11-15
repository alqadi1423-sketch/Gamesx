'use strict';
// Smoke test every game in LOCAL mode. Usage:
//   [ROOT=<public folder>] node tools/test/smoke.js [--games=a,b] [--configs=p2,p3] [--workers=4] [--steps=200] [--out=file.json] [--verbose]
//   ROOT defaults to public/ of this repository; the report goes to tools/test/results/smoke.json. Needs python3 (http.server) and Playwright.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.ROOT || process.env.PUB || path.join(__dirname, '..', '..', 'public'));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const STEPS = +(args.steps || 200);
const WORKERS = +(args.workers || 4);
const VERBOSE = !!args.verbose;
const OUT = args.out || path.join(__dirname, 'results', 'smoke.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// configurations: n players, bots map {seat:level}, extra options
const CONFIGS = {
  p2: { n: 2, bots: {} },
  p3: { n: 3, bots: {}, dark: true },
  p5: { n: 5, bots: {} },
  p8: { n: 8, bots: {} },
  b13: { n: 3, bots: { 1: 1, 2: 3 } },
  tm4: { n: 4, bots: {}, teams: 2 },
  tm4b: { n: 4, bots: { 1: 2, 3: 3 }, teams: 2 },
  tm6: { n: 6, bots: { 2: 1, 4: 3 }, teams: 3 },     // one human + easy bot + hard bot
  b3: { n: 2, bots: { 1: 3 } },            // one human vs hard bot
  t3: { n: 3, bots: {}, timer: 15 },       // turn timer expiries
  b8: { n: 8, bots: { 1: 1, 2: 3, 3: 2, 4: 1, 5: 3, 6: 2, 7: 3 } }, // one human + seven bots
  t5b: { n: 5, bots: { 2: 2, 4: 3 }, timer: 15 }, // timer with bots
  a2: { n: 2, bots: { 1: 3 }, auto: true },
  a4: { n: 4, bots: { 1: 3, 2: 2, 3: 1 }, auto: true },
  a8: { n: 8, bots: { 1: 3, 2: 2, 3: 1, 4: 3, 5: 2, 6: 1, 7: 3 }, auto: true },
};

function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function freePort() { return new Promise(res => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); }); }

async function startServer() {
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let k = 0; k < 50; k++) {
    try { await new Promise((res, rej) => { const c = net.connect(port, '127.0.0.1', () => { c.end(); res(); }); c.on('error', rej); }); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); }
  }
  return { port, proc };
}

// in-page init: deterministic Math.random + error capture with stacks
function initScript(seed) {
  let a = seed >>> 0;
  Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__errs = [];
  const fmt = x => (x && x.stack) ? String(x.stack) : (typeof x === 'object' ? (() => { try { return JSON.stringify(x); } catch (e) { return String(x); } })() : String(x));
  const oe = console.error.bind(console);
  console.error = function (...a) { try { window.__errs.push({ kind: 'console.error', msg: a.map(fmt).join(' ') }); } catch (e) { } return oe(...a); };
  window.addEventListener('error', e => { window.__errs.push({ kind: 'pageerror', msg: (e.error && e.error.stack) || (e.message + ' @' + e.filename + ':' + e.lineno + ':' + e.colno) }); });
  setInterval(() => { try { if (typeof S !== 'undefined' && S.st && S.st.d && typeof cleanD === 'function') { const k = S.st.g + ':' + S.st.d.gid; try { cleanD(JSON.parse(JSON.stringify(S.st.d))); } catch (e) { if (!window.__cdk || window.__cdk !== k) { window.__cdk = k; console.error('CLEAND rejects ' + S.st.g + ' keys=' + Object.keys(S.st.d).join(',')); } } } } catch (e) {} }, 250);
  window.addEventListener('unhandledrejection', e => { window.__errs.push({ kind: 'unhandledrejection', msg: (e.reason && e.reason.stack) || String(e.reason) }); });
}

// wraps functions whose errors the engine swallows, so we still see them
function instrument() {
  for (const [k, G] of Object.entries(GAMES)) {
    for (const f of ['botSee', 'points', 'botEval', 'winExtra', 'after']) {
      if (typeof G[f] === 'function' && !G[f].__w) {
        const o = G[f]; const w = function (...a) { try { return o.apply(this, a); } catch (e) { window.__errs.push({ kind: 'thrown-in:' + k + '.' + f, msg: String(e && e.stack || e) }); throw e; } }; w.__w = 1; G[f] = w;
      }
    }
  }
  if (window.__traceHold) { let v = S.holdRender; window.__hr = []; Object.defineProperty(S, 'holdRender', { get() { return v; }, set(x) { if (x !== v) { window.__hr.push((x ? 'SET ' : 'CLR ') + Date.now() + ' ' + new Error().stack.split('\n').slice(2, 5).join(' | ')); if (window.__hr.length > 30) window.__hr.shift(); } v = x; }, configurable: true }); }
  return Object.keys(GAMES);
}

// progress = shared state number + how many seats have handed in a secret pick + who holds the phone
function progKey() { const d = S.st.d; let k = 0; try { if (d) d.pl.forEach((r, s) => { if (hasPicked(d, s)) k++; }); } catch (e) { } return S.st.s + ':' + k + ':' + S.seen; }

// one step inside the page: returns info and optionally acts on a candidate
function pageStep(o) {
  const out = {};
  const d = S.st.d, G = GAMES[S.st.g];
  const vis = el => { const r = el.getBoundingClientRect(); if (el instanceof SVGElement ? (!r.width && !r.height) : (!r.width || !r.height)) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') return false; let p = el; while (p && p !== document.body) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; p = p.parentElement; } return true; };
  const roots = [...app.querySelectorAll('.board, .status, .sheet.result')];
  let cands = [];
  for (const r of roots) for (const el of r.querySelectorAll('[data-ga], [data-a], button, input, svg.pad, select')) {
    if (el.disabled || el.hasAttribute('disabled')) continue; if (!vis(el)) continue;
    if (el.closest('[disabled]')) continue;
    cands.push(el);
  }
  cands = [...new Set(cands)];
  // drop wrappers whose only action is closing the result sheet background
  cands = cands.filter(el => !(el.classList.contains('sheet-bg')));
  const desc = el => { const t = el.tagName.toLowerCase(); let s = t; if (el.dataset.ga) s += `[ga=${el.dataset.ga}]`; if (el.dataset.a) s += `[a=${el.dataset.a}]`; if (el.dataset.i != null) s += `[i=${el.dataset.i}]`; if (el.dataset.draft) s += `[draft=${el.dataset.draft}]`; const tx = (el.textContent || '').trim().slice(0, 20); if (tx) s += `"${tx}"`; return s; };
  out.n = cands.length;
  out.s = S.st.s; out.g = S.st.g; out.mode = S.mode; out.modal = S.modal; out.win = d ? d.win : undefined; out.cover = !!app.querySelector('.cover'); out.result = !!app.querySelector('.sheet.result');
  out.turn = d ? d.turn : null; out.hold = !!S.holdRender; out.rp = !!S.renderPending; out.outs = d ? d.out : null;
  let simul = false; try { simul = !!(G && d && isSimul(G, d)); } catch (e) { }
  out.simul = simul;
  try { out.botWait = !!(d && d.win == null && hasBots() && (simul ? aliveSeats(d).some(s => isBot(d, s) && !hasPicked(d, s)) : isBot(d, d.turn))); } catch (e) { out.botWait = false; }
  out.ctxMy = null; try { if (d && G) out.ctxMy = mkCtx().my; } catch (e) { out.ctxErr = String(e.stack || e); }
  out.errEl = !!app.querySelector('.board .err');
  const txt = (app.querySelector('.board') || {}).innerText || '';
  const st = (app.querySelector('.status') || {}).innerText || '';
  const sb = (app.querySelector('.players') || {}).innerText || '';
  const m = /(NaN|undefined|\[object|null\b|Infinity)/.exec(txt + '\n' + st + '\n' + sb); if (m) out.weird = m[1] + ' :: ' + (txt + ' || ' + st + ' || ' + sb).replace(/\s+/g, ' ').slice(Math.max(0, m.index - 80), m.index + 80);
  // invariants
  if (d) {
    const n = d.pl.length; const inv = [];
    if (typeof d.out !== 'string' || d.out.length !== n) inv.push('out length ' + JSON.stringify(d.out) + ' n=' + n);
    if (d.win == null && !simul && !(Number.isInteger(d.turn) && d.turn >= 0 && d.turn < n)) inv.push('turn invalid ' + d.turn);
    if (d.win == null && !simul && d.out && d.out[d.turn] === '1' && aliveSeats(d).length > 0) inv.push('turn on eliminated seat ' + d.turn + ' out=' + d.out);
    if (typeof d.win === 'number' && !(d.win >= 0 && d.win < n)) inv.push('win invalid ' + d.win);
    if (d.win == null && aliveSeats(d).length < 1) inv.push('nobody alive and no winner out=' + d.out);
    if (inv.length) out.inv = inv;
  }
  if (o && o.act != null && cands.length) {
    const el = cands[Math.floor(o.act * cands.length)];
    out.did = desc(el);
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && el.type === 'range') {
      const min = +el.min || 0, max = +el.max || 100; el.value = String(Math.round(min + o.r2 * (max - min)));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      out.did += '=' + el.value;
    } else if (tag === 'input' || tag === 'textarea') {
      const numeric = el.inputMode === 'numeric' || el.classList.contains('code');
      const words = ['قطوة', 'بيت', 'سيارة', 'جمل', 'تفاحة', 'باب', 'كتاب', 'مدرسة', 'بحر', 'نخلة'];
      let v;
      if (numeric) v = String(Math.floor(o.r2 * 200));
      else if (el.dataset.draft === 'ty' && GAMES.typing && o.r3 < 0.5) { try { v = GAMES.typing.s(d); } catch (e) { v = 'x'; } }
      else v = words[Math.floor(o.r2 * words.length)] + (o.r3 < 0.3 ? '' : ' ' + words[Math.floor(o.r3 * words.length)]);
      el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
      out.did += '=' + v;
    } else if (tag === 'svg') {
      const r = el.getBoundingClientRect(); const pts = [[o.r2, o.r3], [o.r3, o.r2], [(o.r2 + o.r3) / 2, 0.5]];
      const ev = (type, p) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: r.left + p[0] * r.width, clientY: r.top + p[1] * r.height, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      ev('pointerdown', pts[0]); ev('pointermove', pts[1]); ev('pointermove', pts[2]); ev('pointerup', pts[2]);
      out.did += ' draw';
    } else {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && !el.contains(top) && !top.contains(el) && !(top.closest && top.closest('.toast'))) { out.covered = top.className && String(top.className).slice(0, 40); }
      if (typeof el.click === 'function') el.click();
      else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, view: window }));
    }
  }
  return out;
}

async function runOne(browser, base, game, cfgName, seed) {
  const C = CONFIGS[cfgName];
  const res = { game, cfg: cfgName, seed, errors: [], stuck: [], weird: [], inv: [], wins: 0, rounds: 1, steps: 0, help: null, back: null, resultSeen: null, log: [], notes: [] };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: C.dark ? 'dark' : 'light', hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', e => res.errors.push({ kind: 'pw-pageerror', msg: String(e.stack || e), step: res.steps, ctx: res.log.slice(-6) }));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.addInitScript(initScript, seed);
  if (args.tracehold) await page.addInitScript(() => { window.__traceHold = 1; });
  await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') });
  const rng = mulberry(seed ^ 0x9e3779b9);
  const drainErrs = async (where) => {
    const e = await page.evaluate(() => { const x = window.__errs || []; window.__errs = []; return x; });
    for (const x of e) {
      if (/Failed to load resource|net::ERR/.test(x.msg)) continue;
      res.errors.push({ ...x, step: res.steps, where, ctx: res.log.slice(-6) });
    }
  };
  const ev = (fn, a) => page.evaluate(fn, a);
  try {
    await page.goto(base + '/index.html', { waitUntil: 'load' });
    await page.clock.runFor(200);
    await ev(instrument);
    // enter local mode via real clicks
    await page.click('[data-a=local]');
    for (let k = 2; k < C.n; k++) await page.click('[data-a=inc]');
    for (const [seat, lv] of Object.entries(C.bots)) {
      await page.click(`[data-a=botT][data-i="${seat}"]`);
      await page.click(`[data-a=botL][data-i="${seat}"][data-v="${lv}"]`);
    }
    if (C.teams) { await page.click(`[data-a=teams][data-i="${C.teams}"]`); }
    if (C.timer) {
      await page.click('.top [data-a=m-settings]');
      await page.click(`[data-a=cfg][data-k=timer][data-v="${C.timer}"]`);
      await page.click('.sheet [data-a=closemodal].big');
    }
    const stp = await ev(() => ({ n: S.localN, bots: S.bots, timer: cfg().timer }));
    if (stp.n !== C.n) res.notes.push('localN mismatch ' + JSON.stringify(stp));
    await page.locator(`[data-a=pick][data-g="${game}"]`).click();
    await page.clock.runFor(100);
    if (C.teams) { const tm = await ev(() => S.st.d && S.st.d.tm ? S.st.d.tm.join('') : null); res.notes.push('teams ' + tm); }
    const g = await ev(() => S.st.g);
    if (g !== game) {
      const minP = await ev(id => GAMES[id].minP || 0, game);
      if (minP > C.n) { res.skipped = 'minP ' + minP; await drainErrs('pick'); return res; }
      res.notes.push('game did not start: S.st.g=' + g);
      await drainErrs('pick'); return res;
    }
    await drainErrs('start');
    // help modal
    await page.click('.top [data-a=m-help]');
    const help = await ev(id => { const h = app.querySelector('.sheet h2'); const p = app.querySelector('.sheet p'); return { title: h && h.textContent, has: typeof HELP !== 'undefined' && !!HELP[id], txt: p && p.textContent.slice(0, 60) }; }, game);
    res.help = help;
    await page.click('.sheet [data-a=closemodal].x');
    await drainErrs('help');

    let lastS = -1, still = 0, backTested = false;
    for (let step = 0; step < STEPS; step++) {
      res.steps = step;
      let info = await ev(pageStep, null);
      if (info.weird && res.weird.length < 5 && !res.weird.some(w => w.split(' :: ')[0] === info.weird.split(' :: ')[0])) res.weird.push(info.weird + ' @step' + step);
      if (info.inv && res.inv.length < 5) res.inv.push({ step, inv: info.inv, ctx: res.log.slice(-4) });
      if (info.errEl) { /* already logged as console.error */ }
      if (info.mode !== 'local') { res.notes.push('left local mode at step ' + step + ' mode=' + info.mode); break; }
      if (info.modal) { await page.click('.sheet [data-a=closemodal].x').catch(() => ev(() => { S.modal = null; render(); })); res.log.push('closemodal'); continue; }
      if (info.g == null) { res.notes.push('back at grid unexpectedly at step ' + step); break; }
      if (info.win != null && info.win !== undefined && !info.result && !info.cover) {
        // an animation may still hold the screen: give it time before looking for the result
        for (let k = 0; k < 8 && !info.result; k++) { await page.clock.runFor(1000); info = await ev(pageStep, null); }
        if (info.win == null) continue;
      }
      if (info.win != null && info.win !== undefined) {
        // result sheet should be visible after a win (unless covered)
        if (res.resultSeen == null) res.resultSeen = info.result;
        res.wins++;
        if (!backTested && (cfgName === 'p2' || cfgName === 'p3')) {
          backTested = true;
          // "قائمة الألعاب" from the result sheet, then pick the same game again
          const b = info.result ? '.sheet.result [data-a=grid]' : '.top [data-a=grid]';
          await page.click(b); await page.clock.runFor(100);
          const atGrid = await ev(() => S.st.g == null && !!app.querySelector('[data-a=pick]'));
          res.back = atGrid; res.log.push('back-to-menu ' + atGrid);
          await drainErrs('back');
          await page.locator(`[data-a=pick][data-g="${game}"]`).click(); await page.clock.runFor(100);
        } else {
          const sel = info.result ? '.sheet.result [data-a=again]' : '.status [data-a=again]';
          const ok = await page.click(sel, { timeout: 2000 }).then(() => true, () => false);
          if (!ok) { await ev(() => newRound()); res.notes.push('again button missing after win at step ' + step); }
          res.log.push('again');
        }
        res.rounds++; lastS = -1; still = 0;
        await page.clock.runFor(150); await drainErrs('again');
        continue;
      }
      if (info.cover) {
        await page.click('.cover [data-a=reveal]'); res.log.push('reveal'); await page.clock.runFor(50); await drainErrs('reveal'); continue;
      }
      if (info.botWait) {
        // games that a clock moves on (G.host: draw and guess, categories) may wait for it longer than a bot ever thinks
        const KW = (await ev(() => !!(GAMES[S.st.g] && GAMES[S.st.g].host))) ? 200 : 40;
        let k = 0, tot = 0, bs = info.s; for (; k < KW && tot < 600; k++, tot++) { await page.clock.runFor(700); const i2 = await ev(pageStep, null); if (!i2.botWait || i2.win != null || i2.cover || i2.modal) break; if (i2.s !== bs) { bs = i2.s; k = 0; } }
        await drainErrs('botwait');
        if (k >= KW) { if (args.tracehold) { const a1 = await ev(() => [Date.now(), (document.querySelector('#fx polyline')||{getAttribute:()=>''}).getAttribute('points').split(' ').length]); await page.clock.runFor(3000); const a2 = await ev(() => [Date.now(), (document.querySelector('#fx polyline')||{getAttribute:()=>''}).getAttribute('points').split(' ').length, S.holdRender]); res.notes.push('advance test ' + JSON.stringify([a1, a2])); }
          res.stuck.push({ step, kind: 'bot-never-moves', info, ctx: res.log.slice(-8), hr: await ev(() => window.__hr || null), extra: await ev(() => { const fx = document.getElementById('fx'); const d = S.st.d; return { now: Date.now(), trail: fx && fx.querySelector('polyline') ? fx.querySelector('polyline').getAttribute('points').split(' ').length : null, fx: fx ? fx.innerHTML.slice(0, 100) : null, fxConnected: fx ? fx.isConnected : null, pathLen: d && d.shot && d.shot.path ? d.shot.path.length : null, sid: d && d.sid, tkf: !!document.getElementById('tkf'), boardLen: (app.querySelector('.board')||{innerHTML:''}).innerHTML.length, lastVK: S.lastVK, holdVK: S.holdVK }; }), d: await ev(() => JSON.stringify(S.st.d).slice(0, 600)) }); break; }
        info = await ev(pageStep, null);
        if (info.win != null || info.cover) continue;
      }
      if (!info.n) {
        // nothing to press: wait for timers
        let moved = false;
        for (let k = 0; k < 20; k++) { await page.clock.runFor(1500); const i2 = await ev(pageStep, null); if (i2.s !== info.s || i2.n || i2.win != null || i2.cover) { moved = true; break; } }
        await drainErrs('wait');
        if (!moved) { res.stuck.push({ step, kind: 'no-interactive-element', info, ctx: res.log.slice(-8), html: await ev(() => app.querySelector('.board').innerHTML.slice(0, 600)) }); break; }
        res.log.push('waited');
        continue;
      }
      if (C.auto && rng() < 0.9) {
        // autopilot: the human seat is played by the engine's own bot code (runBot), so long games reach their end
        const a = await ev(() => { const d = S.st.d, G = GAMES[S.st.g]; const ctx = mkCtx(); const v = ctx.v; if (v == null || v < 0 || !ctx.my) return 'idle'; runBot(G, d, v); return 'auto seat ' + v; });
        res.log.push(a); res.auto = (res.auto || 0) + (a === 'idle' ? 0 : 1);
        await page.clock.runFor(a === 'idle' ? 1500 : 400); await drainErrs('auto');
        const s2 = await ev(progKey); if (s2 === lastS) still++; else { still = 0; lastS = s2; }
        if (still < 40) continue;
      }
      const r = await ev(pageStep, { act: rng(), r2: rng(), r3: rng() });
      res.log.push(r.did + (r.covered ? ' (covered by ' + r.covered + ')' : ''));
      if (VERBOSE) console.log(step, r.did, 's=' + r.s, 'turn=' + r.turn);
      // let short timers (simul resolve 60ms, animations) run
      await page.clock.runFor(C.timer && rng() < 0.08 ? (C.timer + 1) * 1000 : 350);
      await drainErrs('click');
      const s2 = await ev(progKey);
      if (s2 === lastS) still++; else { still = 0; lastS = s2; }
      if (still >= 40) {
        // probe: press every candidate once, then wait for timers
        let progressed = false;
        for (const dir of [1, -1]) {
          const nC = (await ev(pageStep, null)).n;
          for (let j = 0; j < Math.min(nC, 120) && !progressed; j++) {
            const jj = dir > 0 ? j : nC - 1 - j; const n2 = (await ev(pageStep, null)).n; if (!n2) break;
            await ev(pageStep, { act: Math.min(0.999, (jj + 0.5) / n2), r2: rng(), r3: rng() }); await page.clock.runFor(200);
            if ((await ev(progKey)) !== lastS) progressed = true;
          }
        }
        for (let j = 0; j < 150 && !progressed; j++) {
          const n2 = (await ev(pageStep, null)).n; if (!n2) break;
          const rr = await ev(pageStep, { act: rng(), r2: rng(), r3: rng() }); res.log.push('probe ' + rr.did); await page.clock.runFor(300);
          if ((await ev(progKey)) !== lastS) progressed = true;
        }
        if (!progressed) { const hostG = await ev(() => !!(GAMES[S.st.g] && GAMES[S.st.g].host)); await page.clock.runFor(hostG ? 130000 : 30000); if ((await ev(progKey)) !== lastS) progressed = true; }
        if (!progressed) {
          // oracle: ask the game's own bot whether a legal move exists for the current human seat
          const o = await ev(() => { const d = S.st.d, G = GAMES[S.st.g]; const ctx = mkCtx(); const v = ctx.v != null && ctx.v >= 0 ? ctx.v : d.turn;
            try { if (isSimul(G, d)) { if (G.botPick) { const p = G.botPick(d, v, 3); simulPick(d, v, p == null ? NOPICK : p); return 'oracle botPick seat ' + v; } return 'no oracle (simul)'; }
              if (G.bot) { const nd = G.bot(d, d.turn, 3); S.sel = []; S.tgt = null; if (nd && nd !== d) { act(nd); return 'oracle bot move seat ' + d.turn; } return 'oracle bot found no move'; } return 'no oracle'; }
            catch (e) { return 'oracle threw ' + (e.stack || e); } });
          res.notes.push('step ' + step + ': ' + o.replace(/\d+/g, 'N'));
          await page.clock.runFor(400);
          if ((await ev(progKey)) !== lastS) { progressed = true; res.oracle = (res.oracle || 0) + 1; }
        }
        await drainErrs('probe');
        if (!progressed) { res.stuck.push({ step, kind: 'no-progress-40-clicks', info: await ev(pageStep, null), ctx: res.log.slice(-12), html: await ev(() => app.querySelector('.board').innerHTML.slice(0, 800)), d: await ev(() => JSON.stringify(S.st.d).slice(0, 1500)), dbg: await ev(() => ({ dr: S.dr ? JSON.stringify(S.dr).slice(0, 300) : null, padOn: document.getElementById('pad') ? !!document.getElementById('pad')._on : null, ctxv: mkCtx().v, seen: S.seen })) }); break; }
        still = 0; lastS = -1;
      }
    }
    // back to menu from the game screen, then home
    if (res.back == null) {
      const hasSheet = await ev(() => !!app.querySelector('.sheet.result'));
      await page.click(hasSheet ? '.sheet.result [data-a=grid]' : '.top [data-a=grid]', { timeout: 5000 }).catch(e => res.notes.push('back click failed: ' + String(e).slice(0, 200)));
      await page.clock.runFor(100);
      res.back = await ev(() => S.st.g == null && !!app.querySelector('[data-a=pick]'));
    }
    await drainErrs('end');
  } catch (e) {
    res.errors.push({ kind: 'harness', msg: String(e.stack || e).slice(0, 1500), step: res.steps, ctx: res.log.slice(-6) });
  } finally {
    res.log = res.log.slice(-30);
    await ctx.close().catch(() => { });
  }
  return res;
}

(async () => {
  const { port, proc } = await startServer();
  const base = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch();
  try {
    // list games
    const p0 = await browser.newPage(); await p0.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await p0.goto(base + '/index.html');
    const all = await p0.evaluate(() => Object.keys(GAMES)); await p0.close();
    const games = args.games ? args.games.split(',') : all;
    const cfgs = args.configs ? args.configs.split(',') : ['p2','p3','p5','p8','b13','b3','t3'];
    const jobs = []; for (const g of games) for (const c of cfgs) jobs.push([g, c]);
    console.log(`games=${games.length} configs=${cfgs.join(',')} jobs=${jobs.length}`);
    const results = []; let done = 0; const t0 = Date.now();
    const worker = async () => { while (jobs.length) { const [g, c] = jobs.shift(); const seed = args.seed ? +args.seed : hashStr(g + ':' + c); const r = await runOne(browser, base, g, c, seed); results.push(r); done++;
      const bad = r.errors.length || r.stuck.length || r.inv.length;
      console.log(`[${done}] ${g} ${c} seed=${seed} steps=${r.steps} wins=${r.wins} err=${r.errors.length} stuck=${r.stuck.length} inv=${r.inv.length} weird=${r.weird.length}${r.skipped ? ' SKIP ' + r.skipped : ''} ${bad ? 'FAIL' : 'ok'} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      if (done % 10 === 0) fs.writeFileSync(OUT, JSON.stringify(results, null, 1)); } };
    await Promise.all(Array(WORKERS).fill(0).map(worker));
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  } finally { await browser.close(); proc.kill(); }
})();

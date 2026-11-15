'use strict';
// Chaos / fuzz QA for ألعابنا (local play, bots, shell UI). One browser, one page at a time.
// Usage: [ROOT=<public>] node tools/test/chaos.js [--phase=storage,shell,all,focus] [--games=a,b] [--n=40] [--focus-n=300] [--seed=1] [--out=report.json] [--port=19731]
//   ROOT defaults to public/ of this repository; the report goes to tools/test/results/chaos.json.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.ROOT || process.env.PUB || path.join(__dirname, '..', '..', 'public'));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const PORT = +(args.port || 19731);
const N = +(args.n || 40);
const FOCUS_N = +(args['focus-n'] || 300);
const OUT = args.out || path.join(__dirname, 'results', 'chaos.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const PHASES = (args.phase || 'storage,shell,all,focus').split(',');
const FOCUS = (args.focus || 'uno,baloot,hand,tarneeb,kout,chess,ludo,tavla,mafia,tele,cats,trivia,hide').split(',');
const VERB = !!args.verbose;

function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- report
const REP = { started: new Date().toISOString(), actions: 0, games: new Set(), runs: 0, findings: {}, phases: {}, stuckRuns: [] };
function finding(kind, where, msg, ctx) {
  const sig = kind + '|' + where + '|' + String(msg).split('\n')[0].replace(/\d+/g, 'N').slice(0, 160);
  const f = REP.findings[sig] || (REP.findings[sig] = { kind, where, msg: String(msg).slice(0, 1500), n: 0, ctx: ctx ? ctx.slice(-10) : null });
  f.n++;
  if (VERB || f.n === 1) console.log('  !! ' + kind + ' @' + where + ' :: ' + String(msg).split('\n').slice(0, 3).join(' | ').slice(0, 300));
}
function saveRep() {
  const o = { ...REP, games: [...REP.games], nGames: REP.games.size, findings: Object.values(REP.findings).sort((a, b) => b.n - a.n) };
  fs.writeFileSync(OUT, JSON.stringify(o, null, 1));
}

// ---------------------------------------------------------------- server
function startServer() {
  const proc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  return new Promise(async (res) => {
    for (let k = 0; k < 60; k++) {
      try { await new Promise((ok, no) => { const c = net.connect(PORT, '127.0.0.1', () => { c.end(); ok(); }); c.on('error', no); }); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); }
    }
    res(proc);
  });
}

// ---------------------------------------------------------------- in-page helpers
function initScript(seed) {
  let a = seed >>> 0;
  Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__errs = [];
  const fmt = x => (x && x.stack) ? String(x.stack) : (typeof x === 'object' ? (() => { try { return JSON.stringify(x); } catch (e) { return String(x); } })() : String(x));
  const oe = console.error.bind(console);
  console.error = function (...a) { try { window.__errs.push({ kind: 'console.error', msg: a.map(fmt).join(' ') }); } catch (e) { } return oe(...a); };
  window.addEventListener('error', e => { window.__errs.push({ kind: 'pageerror', msg: (e.error && e.error.stack) || (e.message + ' @' + e.filename + ':' + e.lineno + ':' + e.colno) }); });
  window.addEventListener('unhandledrejection', e => { window.__errs.push({ kind: 'unhandledrejection', msg: (e.reason && e.reason.stack) || String(e.reason) }); });
  window.alert = (m) => window.__errs.push({ kind: 'alert', msg: String(m) });
  setInterval(() => { try { if (typeof S !== 'undefined' && S.st && S.st.d && typeof cleanD === 'function') { const k = S.st.g + ':' + S.st.d.gid; try { cleanD(JSON.parse(JSON.stringify(S.st.d))); } catch (e) { if (window.__cdk !== k) { window.__cdk = k; console.error('CLEAND rejects ' + S.st.g + ' keys=' + Object.keys(S.st.d).join(',')); } } } } catch (e) { } }, 250);
}
function instrument() {
  if (typeof GAMES === 'undefined') return [];
  for (const [k, G] of Object.entries(GAMES)) for (const f of ['botSee', 'points', 'botEval', 'winExtra', 'after']) {
    if (typeof G[f] === 'function' && !G[f].__w) { const o = G[f]; const w = function (...a) { try { return o.apply(this, a); } catch (e) { window.__errs.push({ kind: 'thrown-in:' + k + '.' + f, msg: String(e && e.stack || e) }); throw e; } }; w.__w = 1; G[f] = w; }
  }
  return Object.keys(GAMES);
}
// what is on screen now, plus the invariant checks
function look() {
  const o = {};
  const d = S.st.d, G = GAMES[S.st.g];
  o.mode = S.mode; o.g = S.st.g; o.browse = !!S.browse; o.modal = S.modal; o.s = S.st.s;
  o.inGame = !!(S.st.g && d && G && !S.browse && (S.mode === 'local' || S.mode === 'online'));
  o.win = d ? d.win : null; o.cover = !!app.querySelector('.cover'); o.result = !!app.querySelector('.sheet.result');
  o.hold = !!S.holdRender;
  let simul = false; try { simul = !!(G && d && isSimul(G, d)); } catch (e) { }
  o.simul = simul;
  try { o.botWait = !!(o.inGame && d.win == null && hasBots() && (simul ? aliveSeats(d).some(s => isBot(d, s) && !hasPicked(d, s)) : isBot(d, d.turn))); } catch (e) { o.botWait = false; }
  try { if (o.inGame) { const c = mkCtx(); o.my = !!c.my; o.v = c.v; } } catch (e) { o.ctxErr = String(e.stack || e).slice(0, 300); }
  o.host = !!(G && G.host);
  // blank screen
  const txt = app.innerText || '';
  o.blank = !app.firstElementChild || (!txt.trim() && !app.querySelector('svg,canvas,img'));
  // weird text anywhere in the app or in toasts
  const toasts = [...document.querySelectorAll('.toast,.chatpop,.ytb')].map(e => e.innerText).join(' | ');
  const all = txt + '\n' + toasts;
  const m = /(\bundefined\b|\bNaN\b|\[object [A-Za-z]+\]|\bInfinity\b|TypeError|ReferenceError|SyntaxError|Cannot read|is not a function|=>|\$\{|&lt;|&gt;|&amp;|&quot;|&#39;|\bnull\b)/.exec(all);
  if (m) o.weird = m[1] + ' :: ' + all.replace(/\s+/g, ' ').slice(Math.max(0, m.index - 60), m.index + 60);
  // injected markup from typed text
  if (document.querySelector('[data-pwn]')) o.pwn = document.querySelector('[data-pwn]').outerHTML.slice(0, 200);
  // horizontal overflow
  const se = document.scrollingElement || document.documentElement;
  if (se.scrollWidth > se.clientWidth + 1) o.overflow = se.scrollWidth + '>' + se.clientWidth;
  else {
    // something wider than the screen inside the app (body may hide overflow)
    const W = innerWidth; let worst = null;
    for (const el of app.querySelectorAll('.top, .status, .players, .board, .sheet, .panel, .grid, .cover')) { const r = el.getBoundingClientRect(); const sec = el.closest('.gsec'); if (sec) { const q = sec.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight) continue; } if (r.width && (r.right > W + 2 || r.left < -2)) { worst = el.className.toString().slice(0, 40) + ' ' + Math.round(r.left) + '..' + Math.round(r.right); break; } }
    if (worst) o.overflow = 'el ' + worst + ' W=' + W;
  }
  if (d) {
    const n = d.pl.length; const inv = [];
    if (typeof d.out !== 'string' || d.out.length !== n) inv.push('out length');
    if (d.win == null && !simul && !(Number.isInteger(d.turn) && d.turn >= 0 && d.turn < n)) inv.push('turn invalid ' + d.turn);
    if (d.win == null && !simul && d.out && d.out[d.turn] === '1' && aliveSeats(d).length > 0) inv.push('turn on eliminated seat');
    if (d.win == null && aliveSeats(d).length < 1) inv.push('nobody alive and no winner');
    try { cleanD(JSON.parse(JSON.stringify(d))); } catch (e) { inv.push('cleanD rejects'); }
    if (inv.length) o.inv = inv;
  }
  o.errEl = !!app.querySelector('p.err') && /خطأ/.test((app.querySelector('p.err') || {}).textContent || '');
  return o;
}
function progKey() { const d = S.st.d; let k = 0; try { if (d) d.pl.forEach((r, s) => { if (hasPicked(d, s)) k++; }); } catch (e) { } return S.st.g + ':' + S.st.s + ':' + k + ':' + S.seen + ':' + (d && d.gid); }
// candidates for a tap; with all=true also disabled ones and the whole screen (top bar, sheets, cover)
function cands(all) {
  const vis = el => { const r = el.getBoundingClientRect(); if (el instanceof SVGElement ? (!r.width && !r.height) : (!r.width || !r.height)) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; return true; };
  const sel = all ? '[data-ga], [data-a], button, input, select, svg.pad' : '.board [data-ga], .board [data-a], .board button, .board input, .board svg.pad, .status [data-a], .status button, .sheet [data-a], .cover [data-a]';
  return [...app.querySelectorAll(sel)].filter(el => (all || !(el.disabled || el.closest('[disabled]'))) && vis(el));
}
function desc(el) { const t = el.tagName.toLowerCase(); let s = t; if (el.dataset.ga) s += `[ga=${el.dataset.ga}]`; if (el.dataset.a) s += `[a=${el.dataset.a}]`; if (el.dataset.i != null) s += `[i=${el.dataset.i}]`; if (el.dataset.draft) s += `[draft=${el.dataset.draft}]`; if (el.disabled) s += '(disabled)'; const tx = (el.textContent || '').trim().slice(0, 16); if (tx) s += `"${tx}"`; return s; }
// tap the k-th candidate (fraction r in [0,1)); text inputs get a value; range gets a value; svg pads get a stroke
function tapCand(o) {
  let cs = cands(o.all); if (!cs.length) return null;
  // liveness: the main buttons (ready, confirm, roll…) half of the time
  if (o.prefer) { const m = cs.filter(e => e.matches('.btn, .big, .go, [data-ga=ready], [data-ga=ok], [data-ga=go], [data-ga=done], [data-ga=roll]')); if (m.length && o.r2 < .5) cs = m; }
  const el = cs[Math.floor(o.r * cs.length)];
  const tag = el.tagName.toLowerCase(); let did = desc(el);
  if (tag === 'input' && el.type === 'range') { const min = +el.min || 0, max = +el.max || 100; el.value = String(Math.round(min + o.r2 * (max - min))); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); did += '=' + el.value; }
  else if (tag === 'input' || tag === 'textarea') {
    const numeric = el.inputMode === 'numeric' || el.type === 'number' || el.classList.contains('code');
    const words = ['قطوة', 'بيت', 'سيارة', 'جمل', 'تفاحة', 'باب', 'كتاب', 'بحر', 'نخلة', 'أسد'];
    const v = o.text != null ? o.text : numeric ? String(Math.floor(o.r2 * 200)) : words[Math.floor(o.r2 * words.length)];
    el.focus(); el.value = el.maxLength > 0 ? v.slice(0, el.maxLength) : v; el.dispatchEvent(new Event('input', { bubbles: true })); did += '=' + v.slice(0, 20);
    if (o.enter) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  } else if (tag === 'svg') {
    const r = el.getBoundingClientRect(); const ev = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: r.left + x * r.width, clientY: r.top + y * r.height, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', o.r2, o.r3); ev('pointermove', o.r3, o.r2); ev('pointerup', .5, .5); did += ' draw';
  } else if (tag === 'select') { const k = Math.floor(o.r2 * el.options.length); el.selectedIndex = k; el.dispatchEvent(new Event('change', { bubbles: true })); }
  else { if (typeof el.click === 'function') el.click(); else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); }
  return did;
}
function candPoint(o) { const cs = cands(true); if (!cs.length) return null; const el = cs[Math.floor(o.r * cs.length)]; const r = el.getBoundingClientRect(); return { x: r.left + r.width * (.2 + .6 * o.r2), y: r.top + r.height * (.2 + .6 * o.r3), d: desc(el) }; }

// ---------------------------------------------------------------- weird inputs
const TEXTS = [
  '<b data-pwn=1>', '<i data-pwn=1>', 'ا'.repeat(400), 'محمد'.repeat(60), '👨‍👩‍👧‍👦🏳️‍🌈🇸🇦👍🏽', 'abc عربي 123 mixed ‏RTL‎ LTR', '‮عكس‬ text', '<img src=x data-pwn=1>', '"><b data-pwn=1>x</b>',
  "'; DROP TABLE x;--", '{{x}} %s %d', '   ', '\n\t', 'ـــــ', 'ﷺ﷽', 'x'.repeat(5000), '<script>alert(1)</script>', '١٢٣٤٥٦٧٨٩٠', '0', '-1', '99999999999999999999', '1e400', '١٫٥', '😀'.repeat(40),
];
// corrupted saved states
function corruptions(realLgame) {
  const L = [
    ['alaabna.local', '{'], ['alaabna.local', 'null'], ['alaabna.local', '5'], ['alaabna.local', '"x"'], ['alaabna.local', '[]'],
    ['alaabna.local', '{"n":"abc","names":"xyz","bots":"q"}'], ['alaabna.local', '{"n":99,"names":[1,2,{"a":1}],"bots":{"0":5,"1":"x","7":9}}'], ['alaabna.local', '{"n":-3,"bots":null,"teams":7,"tm":{"9":5}}'],
    ['alaabna.local', '{"n":1.5,"names":null,"bots":[1,1,1,1]}'], ['alaabna.local', '{"n":8,"bots":{"0":2,"1":2,"2":2,"3":2,"4":2,"5":2,"6":2,"7":2}}'],
    ['alaabna.lgame', '{'], ['alaabna.lgame', '{"st":{"g":"uno","d":{"pl":[0,1],"win":null}}}'], ['alaabna.lgame', '{"st":{"g":"chess","d":{"pl":[0,1],"out":"00","turn":5,"win":null,"gid":"x"},"sc":"bad","cfg":"zz"},"priv":"zz","n":50}'],
    ['alaabna.lgame', '{"st":{"g":"__proto__","d":{"pl":[0,1],"win":null}}}'], ['alaabna.lgame', '{"st":{"g":"ttt","d":{"pl":[],"win":null}}}'], ['alaabna.lgame', '{"st":{"g":"ludo","d":null}}'],
    ['alaabna.lgame', '{"st":{"g":"ttt","s":"q","d":{"pl":[0,1,2,3,4,5,6,7,8,9],"out":"0","turn":0,"win":null,"gid":"a"}},"n":"x"}'],
    ['alaabna.v4', '{'], ['alaabna.v4', '{"code":"<b data-pwn=1>x</b>","via":"net"}'], ['alaabna.v4', '{"code":123}'], ['alaabna.v4', '[]'],
    ['alaabna.recent', '{'], ['alaabna.recent', '"uno"'], ['alaabna.recent', '[1,null,"nope","uno","uno",{"a":1},"__proto__","constructor"]'],
    ['alaabna.fav', '{'], ['alaabna.fav', '{"uno":1}'], ['alaabna.fav', '["chess","toString","hasOwnProperty",5]'],
    ['alaabna.meta', '{"n":"x","g":{"uno":{"n":"<img data-pwn=1 src=x>","i":"<b>"}}}'], ['alaabna.meta', '{'], ['alaabna.meta', '{"n":5,"g":[1,2]}'],
    ['alaabna.stats', '{"g":{"uno":"x","chess":[null,"a"],"ttt":[-5,9],"ludo":[1e308,1e308]},"ids":"q"}'], ['alaabna.stats', '{'], ['alaabna.stats', '{"g":null}'], ['alaabna.stats', '{"g":{"constructor":[1,1],"__proto__":[2,2]},"ids":[]}'],
    ['alaabna.lite', 'x'], ['alaabna.mute', '{'], ['alaabna.av', '999'], ['alaabna.av', 'abc'], ['alaabna.name', '<b data-pwn=1>' + 'x'.repeat(300)], ['alaabna.hide', '{'], ['alaabna.hide', '[1,2,{"a":1}]'],
    ['ss:alaabna.here', '{"m":"local","g":true,"b":true}'], ['ss:alaabna.here', '{"m":"zzz"}'], ['ss:alaabna.here', '[1]'], ['ss:alaabna.here', '"x"'], ['ss:alaabna.here', '{'], ['ss:alaabna.here', '{"m":"stats"}'], ['ss:alaabna.here', '{"m":"local","g":false,"b":true}'],
    ['ss:alaabna.here', '{"m":"online","c":"ZZZZZZ"}'],
  ];
  if (realLgame) {
    // the real saved game with one field broken at a time
    try {
      const l = JSON.parse(realLgame); const d = l.st.d;
      for (const k of Object.keys(d).slice(0, 30)) {
        if (['pl', 'out', 'win', 'gid'].includes(k)) continue;
        const c1 = JSON.parse(realLgame); delete c1.st.d[k]; L.push(['alaabna.lgame', JSON.stringify(c1), 'del ' + k]);
        const c2 = JSON.parse(realLgame); c2.st.d[k] = null; L.push(['alaabna.lgame', JSON.stringify(c2), 'null ' + k]);
      }
      const c3 = JSON.parse(realLgame); c3.st.d.turn = 7; L.push(['alaabna.lgame', JSON.stringify(c3), 'turn 7']);
      const c4 = JSON.parse(realLgame); c4.priv = null; L.push(['alaabna.lgame', JSON.stringify(c4), 'priv null']);
      const c5 = JSON.parse(realLgame); c5.bots = { 0: 3, 1: 3, 2: 3 }; L.push(['alaabna.lgame', JSON.stringify(c5), 'all bots']);
      const c6 = JSON.parse(realLgame); c6.st.d.out = '1'.repeat(c6.st.d.pl.length); L.push(['alaabna.lgame', JSON.stringify(c6), 'all out']);
    } catch (e) { }
  }
  return L;
}

// ---------------------------------------------------------------- page driver
class Run {
  constructor(browser, base, seed, where) { this.browser = browser; this.base = base; this.seed = seed; this.rng = mulberry(seed); this.where = where; this.log = []; this.vp = { width: 390, height: 844 }; }
  r() { return this.rng(); }
  pick(a) { return a[Math.floor(this.r() * a.length)]; }
  async open(opts = {}) {
    this.ctx = await this.browser.newContext({ viewport: opts.vp || this.vp, colorScheme: opts.dark ? 'dark' : 'light', hasTouch: false });
    this.page = await this.ctx.newPage();
    this.page.on('pageerror', e => this.err({ kind: 'pw-pageerror', msg: String(e.stack || e) }));
    this.page.on('dialog', d => { this.err({ kind: 'dialog', msg: d.message() }); d.dismiss().catch(() => { }); });
    await this.page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await this.page.addInitScript(initScript, this.seed);
    await this.page.addInitScript({ content: [cands, desc, look, progKey, tapCand, candPoint].map(f => 'window.' + f.name + '=' + f.toString() + ';').join('\n') });
    await this.page.clock.install({ time: new Date('2026-01-01T10:00:00Z') });
    // a fresh start: nothing kept from an earlier run
    await this.page.goto(this.base + '/index.html', { waitUntil: 'load' });
    await this.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    if (opts.ls) await this.page.evaluate(ls => { for (const [k, v] of ls) { if (k.startsWith('ss:')) sessionStorage.setItem(k.slice(3), v); else localStorage.setItem(k, v); } }, opts.ls);
    await this.page.goto(this.base + '/index.html', { waitUntil: 'load' });
    await this.settle(300);
    await this.page.evaluate(instrument).catch(() => { });
  }
  async close() { await this.ctx.close().catch(() => { }); }
  err(x) { if (/Failed to load resource|net::ERR|fonts\.googleapis/.test(x.msg)) return; finding(x.kind, this.where, x.msg, this.log); }
  async ev(fn, a) { return this.page.evaluate(fn, a); }
  async settle(ms) { await this.page.clock.runFor(ms); }
  async drain() { const e = await this.ev(() => { const x = window.__errs || []; window.__errs = []; return x; }).catch(() => []); for (const x of e) this.err(x); }
  async check(tag) {
    REP.actions++;
    await this.drain();
    let o; try { o = await this.ev(look); } catch (e) { finding('harness-look', this.where, String(e).slice(0, 300), this.log); return null; }
    const w = this.where + (o.g ? '/' + o.g : '');
    if (o.blank) finding('blank-screen', w, 'app empty after ' + tag + ' mode=' + o.mode, this.log);
    if (o.weird && !(/^&(lt|gt|amp);/.test(o.weird) && this.log.some(l => /&lt;b&gt;/.test(l)))) finding('weird-text', w, o.weird, this.log);
    if (o.pwn) finding('html-injection', w, o.pwn, this.log);
    if (o.overflow) finding('h-overflow', w + '@' + this.vp.width + 'x' + this.vp.height, o.overflow + ' after ' + tag, this.log);
    if (o.inv) finding('invariant', w, o.inv.join('; '), this.log);
    if (o.ctxErr) finding('ctx-error', w, o.ctxErr, this.log);
    if (o.errEl) finding('error-screen', w, 'shows «صار خطأ» after ' + tag, this.log);
    this.state = o;
    return o;
  }
  note(s) { this.log.push(s); if (this.log.length > 40) this.log.shift(); if (VERB) console.log('    ' + s); }

  // ---- getting into a game
  async enterLocal(n, bots, teams) {
    await this.ev(() => { S.modal = null; S.mode = null; render(); });
    await this.page.click('[data-a=local]'); await this.settle(50);
    const cur = await this.ev(() => S.localN);
    for (let k = cur; k < n; k++) await this.page.click('[data-a=inc]');
    for (let k = cur; k > n; k--) await this.page.click('[data-a=dec]');
    // drop the bots kept from earlier
    for (const r of await this.ev(() => Object.keys(S.bots).filter(r => S.bots[r]).map(Number))) if (r < n) await this.page.click(`[data-a=botT][data-i="${r}"]`);
    for (const [seat, lv] of Object.entries(bots || {})) { await this.page.click(`[data-a=botT][data-i="${seat}"]`); await this.page.click(`[data-a=botL][data-i="${seat}"][data-v="${lv}"]`); }
    if (teams) await this.page.click(`[data-a=teams][data-i="${teams}"]`).catch(() => { });
    await this.settle(50);
  }
  async pickGame(g) {
    // a search typed earlier (chaos typing) may hide the tile
    await this.ev(() => { if (S.draft && S.draft.q) { S.draft.q = ''; S.gcat = ''; render(); } else if (S.gcat) { S.gcat = ''; render(); } });
    await this.page.locator(`[data-a=pick][data-g="${g}"]`).click({ timeout: 5000 });
    await this.settle(120);
    REP.games.add(g);
  }
  async ensureGame(g, setup) {
    const o = await this.ev(look);
    if (o.inGame) return true;
    if (o.modal) { await this.ev(() => { S.modal = null; render(); }); }
    if (o.mode === 'local' && o.browse && o.g) { await this.page.click('[data-a=resumegame]').catch(() => { }); await this.settle(80); return (await this.ev(look)).inGame; }
    if (o.mode !== 'local') { await this.enterLocal(setup.n, setup.bots, setup.teams); }
    const ok = await this.pickGame(g).then(() => true, () => false);
    return ok && (await this.ev(look)).inGame;
  }

  // ---- the chaos actions
  async aTap() { const d = await this.ev(tapCand, { r: this.r(), r2: this.r(), r3: this.r(), all: false }); this.note('tap ' + d); await this.settle(this.pick([0, 50, 350, 350, 800])); }
  async aTapAny() { const d = await this.ev(tapCand, { r: this.r(), r2: this.r(), r3: this.r(), all: true }); this.note('tapany ' + d); await this.settle(this.pick([0, 120, 400])); }
  async aMouse() { const p = await this.ev(candPoint, { r: this.r(), r2: this.r(), r3: this.r() }); if (!p) return; this.note('mouse ' + p.d); await this.page.mouse.click(p.x, p.y); await this.settle(this.pick([0, 200, 500])); }
  async aBurst() { const k = 3 + Math.floor(this.r() * 5); const ds = []; for (let i = 0; i < k; i++) { ds.push(await this.ev(tapCand, { r: this.r(), r2: this.r(), r3: this.r(), all: false })); await this.settle(this.pick([0, 0, 16, 40])); } this.note('burst ' + ds.join(' ')); await this.settle(400); }
  async aDouble() { const o = { r: this.r(), r2: this.r(), r3: this.r(), all: false }; const d = await this.ev(tapCand, o); await this.ev(tapCand, o); this.note('double ' + d); await this.settle(300); }
  async aType() {
    const t = this.pick(TEXTS); const enter = this.r() < .6;
    const has = await this.ev(() => app.querySelectorAll('input:not([type=range]), textarea').length);
    if (!has) return this.aTap();
    const d = await this.ev(o => { const cs = [...app.querySelectorAll('input:not([type=range]), textarea')]; const el = cs[Math.floor(o.r * cs.length)]; el.focus(); el.value = el.maxLength > 0 ? o.text.slice(0, el.maxLength) : o.text; el.dispatchEvent(new Event('input', { bubbles: true })); if (o.enter) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return desc(el); }, { r: this.r(), text: t, enter });
    this.note('type ' + d + ' ' + JSON.stringify(t.slice(0, 16)) + (enter ? ' +enter' : ''));
    await this.settle(200);
    if (this.r() < .5) { const s = await this.ev(() => { const b = app.querySelector('.board button[data-ga]:not([disabled])'); if (b) { b.click(); return desc(b); } return null; }); if (s) this.note('submit ' + s); await this.settle(300); }
  }
  async aTopBack(g, setup) {
    await this.ev(() => { const b = app.querySelector('.top .ib'); if (b) b.click(); }); this.note('topback'); await this.settle(this.pick([0, 100]));
    await this.check('topback');
    if (this.r() < .75) { await this.ensureGame(g, setup); this.note('reenter'); }
  }
  async aHistBack(g, setup) {
    await this.page.goBack({ timeout: 3000 }).catch(() => { }); await this.settle(150);
    const url = this.page.url(); this.note('histback ' + url.slice(-20));
    if (!/index\.html/.test(url)) { await this.page.goto(this.base + '/index.html', { waitUntil: 'load' }); await this.settle(300); await this.ev(instrument).catch(() => { }); this.note('left the app, came back'); }
    else await this.ev(instrument).catch(() => { });
    await this.check('histback');
    if (this.r() < .7) await this.ensureGame(g, setup);
  }
  async aReload(g) {
    const before = await this.ev(() => ({ mode: S.mode, g: S.st.g, inGame: !!(S.st.g && S.st.d && !S.browse), win: S.st.d ? S.st.d.win : null, s: S.st.s, key: S.st.d && S.st.d.gid + ':' + S.st.d.pl.join('') }));
    await this.page.reload({ waitUntil: 'load' }); await this.settle(400); await this.ev(instrument).catch(() => { });
    const after = await this.ev(() => ({ mode: S.mode, g: S.st.g, inGame: !!(S.st.g && S.st.d && !S.browse), win: S.st.d ? S.st.d.win : null, key: S.st.d && S.st.d.gid + ':' + S.st.d.pl.join('') }));
    this.note('reload ' + JSON.stringify([before.mode, before.g, before.inGame, before.win]) + ' -> ' + JSON.stringify([after.mode, after.g, after.inGame]));
    // a local game not yet won comes back as it was
    if (before.mode === 'local' && before.inGame && before.win == null && !(after.mode === 'local' && after.g === before.g && after.inGame)) finding('reload-lost-game', this.where + '/' + before.g, 'reload during a game did not restore it: ' + JSON.stringify(after).slice(0, 200), this.log);
    else if (before.mode === 'local' && before.inGame && before.win == null && after.key !== before.key) finding('reload-changed-state', this.where + '/' + before.g, 'state differs after reload', this.log);
    if (before.mode === 'local' && after.mode == null) finding('reload-to-home', this.where + '/' + before.g, 'reload in local mode went home (was ' + JSON.stringify(before).slice(0, 120) + ')', this.log);
  }
  async aModal() {
    const which = this.pick(['m-help', 'm-settings', 'm-settings']);
    const ok = await this.ev(w => { const b = app.querySelector(`.top [data-a="${w}"]`); if (!b) return false; b.click(); return true; }, which);
    if (!ok) return;
    await this.settle(this.pick([0, 50, 300]));
    this.note('open ' + which);
    if (which === 'm-settings' && this.r() < .8) {
      const d = await this.ev(r => { const bs = [...app.querySelectorAll('.sheet [data-a=cfg], .sheet [data-a=lite], .sheet [data-a=mute], .sheet [data-a=resetsc]')]; if (!bs.length) return null; const b = bs[Math.floor(r * bs.length)]; b.click(); return desc(b) + ' k=' + (b.dataset.k || '') + ' v=' + (b.dataset.v || ''); }, this.r());
      this.note('setting ' + d); await this.settle(100);
    }
    // bots keep playing under the sheet? let time pass with it open
    if (this.r() < .4) { await this.settle(this.pick([1000, 3000, 8000])); this.note('waited with sheet open'); }
    const how = this.pick(['x', 'bg', 'back', 'done', 'hist']);
    if (how === 'x') await this.ev(() => { const b = app.querySelector('.sheet .x[data-a=closemodal]'); if (b) b.click(); });
    else if (how === 'bg') { await this.page.mouse.click(10, 10); }
    else if (how === 'done') await this.ev(() => { const b = app.querySelector('.sheet .big[data-a=closemodal]') || app.querySelector('.sheet .x[data-a=closemodal]'); if (b) b.click(); });
    else if (how === 'hist') { await this.page.goBack({ timeout: 3000 }).catch(() => { }); if (!/index\.html/.test(this.page.url())) { await this.page.goto(this.base + '/index.html', { waitUntil: 'load' }); await this.ev(instrument).catch(() => { }); } }
    else await this.ev(() => backAction(null));
    this.note('close ' + how); await this.settle(150);
    const still = await this.ev(() => S.modal);
    if (still && how !== 'bg') finding('modal-stuck', this.where, 'sheet ' + still + ' still open after close by ' + how, this.log);
    if (still) await this.ev(() => { S.modal = null; render(); });
  }
  async aSetup(g, setup) {
    // leave to the list, change the table, then come back (resume or start again)
    await this.ev(() => { const b = app.querySelector('.top .ib[data-a=grid], .top .ib[data-a=browse]'); if (b) b.click(); });
    await this.settle(50);
    const ops = [];
    for (let k = 0; k < 1 + Math.floor(this.r() * 3); k++) {
      const op = this.pick(['inc', 'dec', 'botT', 'botL', 'teams', 'name']);
      const d = await this.ev(o => {
        const q = s => [...app.querySelectorAll(s)]; let b;
        if (o.op === 'inc' || o.op === 'dec') b = q(`[data-a=${o.op}]`)[0];
        else if (o.op === 'botT') { const bs = q('[data-a=botT]'); b = bs[Math.floor(o.r * bs.length)]; }
        else if (o.op === 'botL') { const bs = q('[data-a=botL]'); b = bs[Math.floor(o.r * bs.length)]; }
        else if (o.op === 'teams') { const bs = q('[data-a=teams]'); b = bs[Math.floor(o.r * bs.length)]; }
        else if (o.op === 'name') { const bs = q('input[data-draft^=ln]'); const el = bs[Math.floor(o.r * bs.length)]; if (el) { el.focus(); el.value = o.t.slice(0, 14); el.dispatchEvent(new Event('input', { bubbles: true })); return 'name ' + el.dataset.draft; } }
        if (b) { b.click(); return desc(b); } return null;
      }, { op, r: this.r(), t: this.pick(TEXTS) });
      ops.push(d); await this.settle(30);
    }
    this.note('setup ' + ops.join(', '));
    await this.check('setup');
    const back = this.pick(['resume', 'resume', 'pick', 'other']);
    if (back === 'resume') { await this.ev(() => { const b = app.querySelector('[data-a=resumegame]'); if (b) b.click(); }); }
    else if (back === 'pick') { await this.page.locator(`[data-a=pick][data-g="${g}"]`).click({ timeout: 4000 }).catch(() => { }); }
    else {
      const others = await this.ev(() => Object.keys(GAMES)); const og = this.pick(others);
      await this.page.locator(`[data-a=pick][data-g="${og}"]`).click({ timeout: 4000 }).catch(() => { }); await this.settle(200); REP.games.add(og);
      this.note('switched to ' + og); await this.check('switch');
      for (let k = 0; k < 3; k++) { await this.aTap(); await this.check('tap-other'); }
      await this.ev(() => { const b = app.querySelector('.top .ib'); if (b) b.click(); }); await this.settle(30);
      await this.page.locator(`[data-a=pick][data-g="${g}"]`).click({ timeout: 4000 }).catch(() => { });
    }
    await this.settle(150); this.note('back via ' + back);
  }
  async aDisplay() {
    const k = this.pick(['lite', 'dark', 'size', 'size']);
    if (k === 'lite') { const v = this.r() < .5 ? '1' : '0'; await this.ev(v => { localStorage.setItem('alaabna.lite', v); applyLite(); render(); }, v); this.note('lite ' + v); }
    else if (k === 'dark') { const c = this.pick(['dark', 'light']); await this.page.emulateMedia({ colorScheme: c }); this.note('scheme ' + c); }
    else { this.vp = this.pick([{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 844, height: 390 }, { width: 640, height: 360 }, { width: 320, height: 568 }]); await this.page.setViewportSize(this.vp); this.note('viewport ' + this.vp.width + 'x' + this.vp.height); }
    await this.settle(200);
  }
  async aClock() { const ms = this.pick([700, 2000, 5000, 16000, 31000, 61000]); await this.settle(ms); this.note('clock +' + ms); }
  async aStorageClear() { await this.ev(() => localStorage.clear()); this.note('localStorage.clear()'); await this.settle(100); }
  async aFav() { await this.ev(() => { const b = app.querySelector('.top [data-a=fav]'); if (b) b.click(); }); this.note('fav'); await this.settle(50); }
  async aKey() { const k = this.pick(['Escape', 'Enter', 'Tab', 'Backspace', 'ArrowLeft', ' ']); await this.page.keyboard.press(k).catch(() => { }); this.note('key ' + k); await this.settle(100); }
  async aResult(g, setup) {
    // on a result sheet: the fast paths
    const w = this.pick(['again', 'again', 'closeres', 'grid', 'next', 'bg', 'statusAgain']);
    await this.ev(w => { const sel = { again: '.sheet.result [data-a=again]', closeres: '.sheet.result [data-a=closeres]', grid: '.sheet.result [data-a=grid]', next: '.sheet.result [data-a=next]', bg: '.sheet-bg[data-a=closeres]', statusAgain: '.status [data-a=again]' }[w]; const b = app.querySelector(sel); if (b) b.click(); }, w);
    this.note('result ' + w);
    // a second tap right away, while the sheet still animates
    if (this.r() < .4) { await this.ev(() => { const b = app.querySelector('[data-a=again]'); if (b) b.click(); }); this.note('again again'); }
    await this.settle(200);
    if (w === 'grid' || w === 'next') { const g2 = await this.ev(() => S.st.g); if (g2 && g2 !== g) REP.games.add(g2); if (this.r() < .6) await this.ensureGame(g, setup); }
  }

  // ---- liveness: drive the game to an end (or for a while) with the human seats on autopilot: a stall is a stuck state
  async liveness(maxIt = 160, want = 1) {
    let last = null, still = 0, rounds = 0; this.wins = 0;
    for (let it = 0; it < maxIt; it++) {
      const o = await this.ev(look);
      if (!o.inGame) return { ok: true, why: 'not in game' };
      if (o.modal) { await this.ev(() => { S.modal = null; render(); }); continue; }
      if (o.win != null) { rounds++; this.wins = rounds; if (rounds >= want) return { ok: true, why: 'win' };
        await this.ev(() => { const b = app.querySelector('.sheet.result [data-a=again]') || app.querySelector('.status [data-a=again]'); if (b) b.click(); else newRound(); }); await this.settle(200); last = null; still = 0; continue; }
      if (o.cover) { await this.ev(() => { const b = app.querySelector('.cover [data-a=reveal]'); if (b) b.click(); }); await this.settle(50); continue; }
      // a bot that holds the turn but has nothing to do in this phase (a review the person confirms): tap like a person too
      if (o.botWait && !(still > 5 && still % 2)) await this.settle(900);
      else if (o.botWait) { await this.ev(tapCand, { r: this.r(), r2: this.r(), r3: this.r(), all: false, prefer: true }); await this.settle(400); }
      else {
        // the game's own bot may have nothing for this phase (review, confirm…): then tap like a person
        const a = still > 2 && still % 2 ? 'idle' : await this.ev(() => { const d = S.st.d, G = GAMES[S.st.g]; const c = mkCtx(); const v = c.v == null && S.mode === 'local' && !isSimul(G, d) ? d.turn : c.v; if (v == null || v < 0 || !c.my) return 'idle'; try { runBot(G, d, v); } catch (e) { return 'auto threw ' + e; } return 'auto ' + v; });
        if (a === 'idle') { const t = await this.ev(tapCand, { r: this.r(), r2: this.r(), r3: this.r(), all: false, prefer: true }); await this.settle(t ? 400 : 1500); }
        else await this.settle(400);
      }
      await this.drain();
      const k = await this.ev(progKey);
      if (k === last) still++; else { still = 0; last = k; }
      if (still >= 45) {
        // last try: a long wait for clocks
        await this.settle(o.host ? 130000 : 35000); await this.drain();
        if ((await this.ev(progKey)) !== last) { still = 0; last = null; continue; }
        const info = await this.ev(() => { const o = look(); return { ...o, d: JSON.stringify(S.st.d).slice(0, 700), board: (app.querySelector('.board') || {}).innerText.slice(0, 200), status: (app.querySelector('.status') || {}).innerText.slice(0, 160), bots: S.bots, localN: S.localN }; });
        return { ok: false, info };
      }
    }
    return { ok: true, why: 'budget' };
  }
}

// ---------------------------------------------------------------- phases
async function chaosGame(browser, base, g, nAct, seed, where) {
  const R = new Run(browser, base, seed, where);
  const meta0 = { vp: R.r() < .15 ? R.pick([{ width: 360, height: 640 }, { width: 844, height: 390 }]) : { width: 390, height: 844 }, dark: R.r() < .3 };
  R.vp = meta0.vp;
  await R.open(meta0);
  REP.runs++;
  try {
    const gm = await R.ev(g => { const G = GAMES[g]; return G ? { minP: G.minP || 2, maxP: G.maxP || 8 } : null; }, g);
    if (!gm) { finding('missing-game', where, g + ' not in GAMES'); return; }
    let n = gm.minP + Math.floor(R.r() * (Math.min(gm.maxP, 6) - gm.minP + 1)); n = Math.max(2, Math.min(8, n));
    const bots = {}; const mode = R.r();
    if (mode < .45) { for (let s = 1; s < n; s++) bots[s] = 1 + Math.floor(R.r() * 3); }
    else if (mode < .7) { const s = 1 + Math.floor(R.r() * (n - 1)); bots[s] = 3; }
    const teams = n >= 4 && R.r() < .3 ? 2 : 0;
    const setup = { n, bots, teams };
    R.note('setup ' + JSON.stringify(setup));
    await R.enterLocal(n, bots, teams);
    if (R.r() < .2) { await R.ev(() => { const b = app.querySelector('.top [data-a=m-settings]'); if (b) b.click(); }); await R.settle(30); await R.ev(v => { const b = app.querySelector(`[data-a=cfg][data-k=timer][data-v="${v}"]`); if (b) b.click(); const c = app.querySelector('.sheet .big[data-a=closemodal]'); if (c) c.click(); }, R.pick([15, 30])); R.note('timer on'); }
    await R.pickGame(g);
    let o = await R.check('start');
    if (!o || !o.inGame) { finding('did-not-start', where + '/' + g, 'game did not start with ' + JSON.stringify(setup) + ' mode=' + (o && o.mode)); return; }
    const W = [
      [30, 'tap'], [6, 'tapany'], [8, 'mouse'], [6, 'burst'], [4, 'double'], [5, 'type'], [4, 'topback'], [3, 'histback'], [3, 'reload'], [5, 'modal'], [4, 'setup'],
      [4, 'display'], [5, 'clock'], [0.7, 'lsclear'], [1.5, 'fav'], [2, 'key'],
    ];
    const tot = W.reduce((a, x) => a + x[0], 0);
    let off = 0;
    for (let i = 0; i < nAct; i++) {
      o = R.state || o;
      if (!o.inGame) { off++; if (off > 2) { const ok = await R.ensureGame(g, setup).catch(() => false); off = 0; if (!ok) { R.note('could not get back into ' + g); } } }
      else off = 0;
      let name;
      if (o.result && R.r() < .6) name = 'result';
      else if (o.cover && R.r() < .7) name = R.r() < .8 ? 'reveal' : 'tapany';
      else { let x = R.r() * tot; for (const [w, nm] of W) { x -= w; if (x <= 0) { name = nm; break; } } name = name || 'tap'; }
      try {
        switch (name) {
          case 'tap': await R.aTap(); break; case 'tapany': await R.aTapAny(); break; case 'mouse': await R.aMouse(); break; case 'burst': await R.aBurst(); break;
          case 'double': await R.aDouble(); break; case 'type': await R.aType(); break; case 'topback': await R.aTopBack(g, setup); break; case 'histback': await R.aHistBack(g, setup); break;
          case 'reload': await R.aReload(g); break; case 'modal': await R.aModal(); break; case 'setup': await R.aSetup(g, setup); break; case 'display': await R.aDisplay(); break;
          case 'clock': await R.aClock(); break; case 'lsclear': await R.aStorageClear(); break; case 'fav': await R.aFav(); break; case 'key': await R.aKey(); break;
          case 'result': await R.aResult(g, setup); break;
          case 'reveal': await R.ev(() => { const b = app.querySelector('.cover [data-a=reveal]'); if (b) b.click(); }); R.note('reveal'); await R.settle(R.pick([0, 50])); break;
        }
      } catch (e) { finding('harness', where + '/' + g, name + ': ' + String(e).split('\n')[0].slice(0, 200), R.log); }
      o = await R.check(name) || o;
    }
    // after the chaos: the game must still be playable to an end
    if (await R.ensureGame(g, setup).catch(() => false)) {
      const lv = await R.liveness(nAct > 100 ? 400 : 160);
      if (!lv.ok) { finding('stuck', where + '/' + (lv.info && lv.info.g || g), 'no progress: ' + JSON.stringify(lv.info).slice(0, 1200), R.log); REP.stuckRuns.push({ g, seed, setup }); }
      await R.check('liveness');
      // a reload after the chaos lands somewhere sensible
      await R.aReload(g); await R.check('final-reload');
      const s = await R.ev(() => ({ mode: S.mode, g: S.st.g, txt: app.innerText.length }));
      if (!s.txt) finding('blank-after-reload', where + '/' + g, JSON.stringify(s), R.log);
    } else finding('could-not-reenter', where + '/' + g, 'after chaos the game could not be opened again', R.log);
  } catch (e) {
    finding('harness', where + '/' + g, String(e.stack || e).slice(0, 600), R.log);
  } finally { await R.close(); }
}

// corrupted storage: every case must give a working screen and a way into a game
async function storagePhase(browser, base) {
  // a real saved game to break field by field
  const real = {};
  for (const g of (args['real-games'] != null ? args['real-games'] : 'uno,chess,ludo,mafia,baloot,tele').split(',').filter(Boolean)) {
    const R = new Run(browser, base, 7, 'storage-prep'); await R.open();
    try { await R.enterLocal(4, { 2: 2 }); await R.pickGame(g); for (let k = 0; k < 6; k++) { await R.aTap(); } real[g] = await R.ev(() => localStorage.getItem('alaabna.lgame')); } catch (e) { } await R.close();
  }
  let cases = corruptions(null); const baseN = cases.length;
  if (args['storage-only']) cases = cases.filter(c => c[0] === args['storage-only']);
  for (const g in real) if (real[g]) cases = cases.concat(corruptions(real[g]).slice(baseN).map(c => [c[0], c[1], g + ' ' + (c[2] || '')]));
  console.log('storage cases: ' + cases.length);
  let i = 0;
  for (const [k, v, label] of cases) {
    i++;
    const R = new Run(browser, base, 1000 + i, 'storage:' + k + (label ? ' (' + label + ')' : ' ' + v.slice(0, 40)));
    const ls = [[k, v]];
    // the restore paths also need a 'here' note pointing at the local game
    if (k === 'alaabna.lgame') ls.push(['ss:alaabna.here', '{"m":"local","g":true,"b":false}']);
    try {
      await R.open({ ls });
      let o = await R.check('load');
      // home: resume card if any, else into local and a game
      const hasCont = await R.ev(() => !!app.querySelector('[data-a=lresume]'));
      if (hasCont) { await R.ev(() => app.querySelector('[data-a=lresume]').click()); await R.settle(300); o = await R.check('lresume'); }
      if (o && o.inGame) { for (let j = 0; j < 8; j++) { await R.aTap(); await R.check('tap'); } const lv = await R.liveness(60); if (!lv.ok) finding('stuck', R.where, JSON.stringify(lv.info).slice(0, 600)); await R.ev(() => { const b = app.querySelector('.top .ib'); if (b) b.click(); }); await R.settle(50); }
      // recovery: home -> local -> a game
      await R.ev(() => { S.modal = null; S.mode = null; render(); }); await R.settle(50);
      await R.page.click('[data-a=local]', { timeout: 3000 }); await R.settle(50); await R.check('local');
      await R.page.locator('[data-a=pick][data-g="ttt"]').click({ timeout: 4000 }); await R.settle(100);
      o = await R.check('pick');
      if (!o || !o.inGame) finding('no-recovery', R.where, 'could not start a game after corrupted ' + k + ': mode=' + (o && o.mode) + ' g=' + (o && o.g), R.log);
      // the home screen, game list (fav/recent rows), stats screen
      await R.ev(() => { S.mode = null; render(); }); await R.check('home');
      await R.ev(() => { S.mode = 'stats'; render(); }); await R.check('stats');
      await R.ev(() => { S.mode = null; render(); }); await R.page.click('[data-a=lobby]').catch(() => { }); await R.settle(200); await R.check('lobby');
      await R.page.reload({ waitUntil: 'load' }); await R.settle(300); await R.check('reload');
    } catch (e) { finding('harness', R.where, String(e).slice(0, 300), R.log); }
    await R.close();
    if (i % 20 === 0) { console.log(`  storage ${i}/${cases.length}`); saveRep(); }
  }
}

// shell: home, list, search, favourites, categories, stats, settings, back, reload
async function shellPhase(browser, base, nAct) {
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    const R = new Run(browser, base, hashStr('shell' + vp.width), 'shell'); R.vp = vp; await R.open({ vp, dark: vp.width === 360 });
    try {
      for (let i = 0; i < nAct; i++) {
        const k = R.pick(['tapany', 'tapany', 'tapany', 'mouse', 'search', 'search', 'cat', 'fav', 'back', 'hist', 'reload', 'display', 'clock', 'quick', 'rand', 'stats', 'lsclear']);
        try {
          if (k === 'tapany') await R.aTapAny();
          else if (k === 'mouse') await R.aMouse();
          else if (k === 'search') {
            const t = R.pick([...TEXTS, 'شطرنج', 'اونو', 'ال', 'الورق', 'chess', 'uno', 'زهر', 'ة', 'أ', 'لعبه', 'XYZ']);
            const ok = await R.ev(t => { const el = app.querySelector('[data-draft=q]'); if (!el) return false; el.focus(); el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); return true; }, t);
            if (!ok) { await R.ev(() => { S.mode = 'local'; S.st = { g: null, s: 0, d: null, sc: Array(MAXP).fill(0), cfg: { ...CFG0 } }; render(); }); }
            R.note('search ' + JSON.stringify(t.slice(0, 20)) + ' ' + ok);
            if (ok && R.r() < .5) { await R.ev(() => { const b = app.querySelector('[data-a=pick]'); if (b) b.click(); }); R.note('pick first result'); }
          }
          else if (k === 'cat') { await R.ev(r => { const bs = app.querySelectorAll('[data-a=gcat]'); if (bs.length) bs[Math.floor(r * bs.length)].click(); }, R.r()); R.note('cat'); }
          else if (k === 'fav') { await R.ev(r => { const bs = app.querySelectorAll('[data-a=fav]'); if (bs.length) bs[Math.floor(r * bs.length)].click(); }, R.r()); R.note('fav'); }
          else if (k === 'back') { await R.ev(() => backAction(() => { })); R.note('backAction'); }
          else if (k === 'hist') { await R.page.goBack({ timeout: 3000 }).catch(() => { }); if (!/index\.html/.test(R.page.url())) { await R.page.goto(base + '/index.html', { waitUntil: 'load' }); } await R.settle(200); await R.ev(instrument).catch(() => { }); R.note('hist'); }
          else if (k === 'reload') { await R.page.reload({ waitUntil: 'load' }); await R.settle(300); await R.ev(instrument).catch(() => { }); R.note('reload'); }
          else if (k === 'display') await R.aDisplay();
          else if (k === 'clock') await R.aClock();
          else if (k === 'quick') { await R.ev(() => { const b = app.querySelector('[data-a=quick], [data-a=rpick]'); if (b) b.click(); }); R.note('quick'); }
          else if (k === 'rand') { await R.ev(() => { const b = app.querySelector('[data-a=rand]'); if (b) b.click(); }); R.note('rand'); }
          else if (k === 'stats') { await R.ev(() => { S.mode = 'stats'; S.modal = null; render(); }); R.note('stats'); }
          else if (k === 'lsclear') await R.aStorageClear();
          await R.settle(150);
        } catch (e) { finding('harness', 'shell', k + ': ' + String(e).split('\n')[0].slice(0, 200), R.log); }
        await R.check(k);
      }
      // chat UI with odd messages (rendered from the room; here put straight into S.chat)
      await R.ev(() => { S.chat = {}; const xs = ['<img src=x data-pwn=1>', 'ا'.repeat(300), '👨‍👩‍👧‍👦'.repeat(20), 'abc ‏عربي‎ 123', 'x'.repeat(600)]; xs.forEach((x, i) => { S.chat['c' + i] = { i: 'c' + i, t: Date.now() - 1000 * (10 - i), x, r: i % 3, n: x.slice(0, 20), f: 'abcdefghijk' + i }; }); S.chat.k = { i: 'k', t: Date.now(), k: 5, r: 1 }; S.chat.bad = { i: 'bad', t: Date.now(), k: 99999, r: 9 }; S.mode = 'local'; S.modal = 'chat'; render(); });
      await R.check('chat-ui');
      await R.ev(() => { const el = app.querySelector('[data-draft=chat]'); if (el) { el.value = 'x'.repeat(400); el.dispatchEvent(new Event('input', { bubbles: true })); } });
      await R.check('chat-type');
      await R.ev(() => { S.modal = null; S.chat = {}; render(); });
    } catch (e) { finding('harness', 'shell', String(e.stack || e).slice(0, 400), R.log); }
    await R.close();
  }
}

// long runs with bots on every other seat (hard), the one person on autopilot: rounds must keep ending
async function marathon(browser, base, games) {
  for (const g of games) {
    const R = new Run(browser, base, hashStr('mara:' + g), 'marathon'); await R.open(); REP.runs++;
    try {
      const gm = await R.ev(g => { const G = GAMES[g]; return G ? { minP: G.minP || 2, maxP: G.maxP || 8 } : null; }, g);
      if (!gm) continue;
      const n = Math.min(gm.maxP, 6), bots = {}; for (let s = 1; s < n; s++) bots[s] = 3;
      await R.enterLocal(n, bots, 0); await R.pickGame(g);
      const t0 = Date.now();
      const lv = await R.liveness(+(args['mara-it'] || 1500), +(args['mara-rounds'] || 4));
      REP.actions += 1;
      console.log(`  marathon ${g} n=${n} wins=${R.wins} ok=${lv.ok} ${lv.why || ''} ${((Date.now() - t0) / 1000) | 0}s`);
      if (!lv.ok) { finding('stuck', 'marathon/' + g, 'no progress: ' + JSON.stringify(lv.info).slice(0, 1200), R.log); }
      else if (R.wins < 1) finding('no-round-end', 'marathon/' + g, 'no round ended in ' + (args['mara-it'] || 1500) + ' steps (' + lv.why + ')', R.log);
      await R.check('marathon');
    } catch (e) { finding('harness', 'marathon/' + g, String(e).slice(0, 300), R.log); }
    await R.close(); saveRep();
  }
}

// scripted abnormal paths, each with its expected outcome
async function scenarios(browser, base) {
  const T = async (name, fn) => {
    const R = new Run(browser, base, hashStr('scen:' + name), 'scen:' + name); await R.open(); REP.runs++;
    try { const r = await fn(R); console.log('  scen ' + name + ': ' + (r === true ? 'ok' : 'FAIL ' + r)); if (r !== true) finding('scenario', 'scen:' + name, String(r), R.log); }
    catch (e) { finding('harness', 'scen:' + name, String(e).slice(0, 400), R.log); console.log('  scen ' + name + ': harness ' + String(e).slice(0, 200)); }
    await R.check('end'); await R.close();
  };
  const timerOn = async (R, v) => { await R.ev(v => { app.querySelector('.top [data-a=m-settings]').click(); app.querySelector(`[data-a=cfg][data-k=timer][data-v="${v}"]`).click(); app.querySelector('.sheet .big[data-a=closemodal]').click(); }, v); };
  const autoWin = async (R) => { for (let k = 0; k < 400; k++) { const o = await R.ev(look); if (o.win != null) return true; if (o.cover) { await R.ev(() => app.querySelector('.cover [data-a=reveal]').click()); continue; } if (o.botWait) { await R.settle(900); continue; } await R.ev(() => { const d = S.st.d, G = GAMES[S.st.g]; const c = mkCtx(); const v = c.v == null ? d.turn : c.v; if (c.my && v >= 0) runBot(G, d, v); }); await R.settle(400); } return false; };
  // A: the turn clock does not run out while the cover hides the board; it does once the player looks
  await T('timer-under-cover', async R => {
    await R.enterLocal(3, {}); await timerOn(R, 15); await R.pickGame('uno');
    const a = await R.ev(() => ({ cover: !!app.querySelector('.cover'), turn: S.st.d.turn, s: S.st.s }));
    if (!a.cover) return 'no cover at start';
    await R.settle(40000); const b = await R.ev(() => ({ cover: !!app.querySelector('.cover'), turn: S.st.d.turn, s: S.st.s }));
    if (b.s !== a.s) return 'state moved under the cover ' + JSON.stringify([a, b]);
    await R.ev(() => app.querySelector('.cover [data-a=reveal]').click()); await R.settle(17000);
    const c = await R.ev(() => ({ cover: !!app.querySelector('.cover'), turn: S.st.d.turn, s: S.st.s }));
    if (c.s === a.s) return 'timer did not fire after reveal ' + JSON.stringify(c);
    return true; });
  // B: result sheet, back twice, the same game again starts a new round
  await T('result-back-back-pick', async R => {
    await R.enterLocal(2, { 1: 3 }); await R.pickGame('ttt'); if (!await autoWin(R)) return 'no win';
    const gid = await R.ev(() => S.st.d.gid); await R.settle(300);
    if (!await R.ev(() => !!app.querySelector('.sheet.result'))) return 'no result sheet';
    await R.page.goBack(); await R.settle(100); if (await R.ev(() => !!app.querySelector('.sheet.result'))) return 'back did not close the result';
    await R.page.goBack(); await R.settle(100); const o = await R.ev(look); if (o.inGame || o.mode !== 'local') return 'second back: ' + JSON.stringify([o.mode, o.inGame]);
    await R.pickGame('ttt'); const o2 = await R.ev(() => ({ gid: S.st.d && S.st.d.gid, win: S.st.d && S.st.d.win }));
    if (o2.gid === gid || o2.win != null) return 'same game did not start again ' + JSON.stringify(o2);
    return true; });
  // C: reload on the result comes back to it, and «again» works
  await T('reload-on-result', async R => {
    await R.enterLocal(2, { 1: 3 }); await R.pickGame('c4'); if (!await autoWin(R)) return 'no win';
    const sc = await R.ev(() => S.st.sc.join()); await R.page.reload({ waitUntil: 'load' }); await R.settle(400);
    const o = await R.ev(() => ({ mode: S.mode, g: S.st.g, win: S.st.d && S.st.d.win, res: !!app.querySelector('.sheet.result'), sc: S.st.sc.join() }));
    if (o.mode !== 'local' || o.g !== 'c4' || o.win == null) return 'after reload ' + JSON.stringify(o);
    if (o.sc !== sc) return 'session points lost ' + sc + ' -> ' + o.sc;
    await R.ev(() => { const b = app.querySelector('[data-a=again]'); b.click(); }); await R.settle(200);
    const o2 = await R.ev(() => ({ win: S.st.d.win, inGame: !!(S.st.g && S.st.d) })); if (o2.win != null || !o2.inGame) return 'again after reload ' + JSON.stringify(o2);
    return true; });
  // D: a stale «continue» card after the saved game was wiped
  await T('stale-continue', async R => {
    await R.enterLocal(2, {}); await R.pickGame('ludo'); await R.ev(() => { const b = app.querySelector('[data-ga=roll]'); if (b) b.click(); }); await R.settle(800);
    await R.ev(() => { S.mode = null; render(); }); if (!await R.ev(() => !!app.querySelector('[data-a=lresume]'))) return 'no continue card';
    await R.ev(() => localStorage.clear()); await R.ev(() => app.querySelector('[data-a=lresume]').click()); await R.settle(100);
    const o = await R.ev(() => ({ mode: S.mode, card: !!app.querySelector('[data-a=lresume]'), toast: [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|') }));
    if (o.card) return 'card still there ' + JSON.stringify(o);
    return true; });
  // E: pick, back and another pick in the same moment
  await T('rapid-switch', async R => {
    await R.enterLocal(3, { 2: 2 });
    await R.ev(() => { app.querySelector('[data-a=pick][data-g="uno"]').click(); app.querySelector('.top .ib').click(); app.querySelector('[data-a=pick][data-g="chess"]') && app.querySelector('[data-a=pick][data-g="chess"]').click(); });
    await R.settle(300); const o = await R.ev(look); if (!o.inGame) return 'not in a game: ' + JSON.stringify([o.mode, o.g, o.browse]);
    const lv = await R.liveness(120); return lv.ok ? true : 'stuck ' + JSON.stringify(lv.info).slice(0, 400); });
  // G: back while a move animates (holdRender), then resume: bots go on
  await T('back-mid-animation', async R => {
    await R.enterLocal(3, { 1: 3, 2: 3 }); await R.pickGame('mono');
    for (let k = 0; k < 6; k++) {
      await R.ev(() => { const b = app.querySelector('[data-ga=roll]'); if (b) b.click(); }); await R.settle(150);
      await R.ev(() => app.querySelector('.top .ib').click()); await R.settle(50); await R.ev(() => { const b = app.querySelector('[data-a=resumegame]'); if (b) b.click(); }); await R.settle(100);
    }
    if (await R.ev(() => S.holdRender)) return 'holdRender left on';
    const lv = await R.liveness(200); return lv.ok ? true : 'stuck ' + JSON.stringify(lv.info).slice(0, 400); });
  // H: reload while the cover is up, and with a sheet open
  await T('reload-cover-sheet', async R => {
    await R.enterLocal(3, {}); await R.pickGame('baloot').catch(() => { }); const g = await R.ev(() => S.st.g);
    if (!g) { await R.pickGame('tarneeb'); }
    await R.ev(() => app.querySelector('.top [data-a=m-help]').click()); await R.page.reload({ waitUntil: 'load' }); await R.settle(400);
    const o = await R.ev(() => ({ inGame: !!(S.st.g && S.st.d && !S.browse), cover: !!app.querySelector('.cover'), modal: S.modal }));
    if (!o.inGame) return 'not back in the game ' + JSON.stringify(o);
    return true; });
  // I: all bots but one person, the person leaves to the list: bots wait (browse) and go on after
  await T('bots-wait-in-list', async R => {
    await R.enterLocal(4, { 1: 3, 2: 3, 3: 3 }); await R.pickGame('ludo');
    await R.ev(() => app.querySelector('.top .ib').click()); const s0 = await R.ev(() => S.st.s); await R.settle(20000); const s1 = await R.ev(() => S.st.s);
    await R.ev(() => app.querySelector('[data-a=resumegame]').click()); const lv = await R.liveness(200);
    if (!lv.ok) return 'stuck after the list ' + JSON.stringify(lv.info).slice(0, 300); return true; });
  // J: lower the player count and make bots while a game runs, then go back to it
  await T('table-change-midgame', async R => {
    await R.enterLocal(5, { 2: 1 }); await R.pickGame('uno'); await R.ev(() => app.querySelector('.top .ib').click()); await R.settle(50);
    for (const a of ['dec', 'dec', 'dec']) await R.ev(a => app.querySelector(`[data-a=${a}]`).click(), a);
    await R.ev(() => { const b = app.querySelector('[data-a=botT][data-i="1"]'); if (b) b.click(); }); await R.settle(50);
    await R.ev(() => app.querySelector('[data-a=resumegame]').click()); await R.settle(100);
    const lv = await R.liveness(300); if (!lv.ok) return 'stuck ' + JSON.stringify(lv.info).slice(0, 400);
    await R.ev(() => { const b = app.querySelector('.sheet.result [data-a=again]') || app.querySelector('[data-a=again]'); if (b) b.click(); }); await R.settle(200);
    const n = await R.ev(() => S.st.d && S.st.d.pl.length); if (n !== 2) return 'new round has ' + n + ' players, table has 2';
    return true; });
}

(async () => {
  const proc = await startServer();
  const base = 'http://127.0.0.1:' + PORT;
  const browser = await chromium.launch();
  const t0 = Date.now();
  try {
    const p0 = await browser.newPage(); await p0.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await p0.goto(base + '/index.html', { waitUntil: 'load' });
    const all = await p0.evaluate(() => Object.keys(GAMES)); await p0.close();
    console.log('games: ' + all.length);
    const games = args.games ? args.games.split(',') : all;
    if (PHASES.includes('storage')) { const a0 = REP.actions; await storagePhase(browser, base); REP.phases.storage = REP.actions - a0; console.log('storage done ' + ((Date.now() - t0) / 1000 | 0) + 's'); saveRep(); }
    if (PHASES.includes('shell')) { const a0 = REP.actions; await shellPhase(browser, base, +(args['shell-n'] || 150)); REP.phases.shell = REP.actions - a0; console.log('shell done ' + ((Date.now() - t0) / 1000 | 0) + 's'); saveRep(); }
    if (PHASES.includes('all')) {
      const a0 = REP.actions; let i = 0;
      for (const g of games) { i++; const seed = hashStr('chaos:' + g + ':' + (args.seed || 1)); await chaosGame(browser, base, g, N, seed, 'all'); if (i % 10 === 0) { console.log(`  [${i}/${games.length}] ${g} actions=${REP.actions} findings=${Object.keys(REP.findings).length} ${((Date.now() - t0) / 1000) | 0}s`); saveRep(); } }
      REP.phases.all = REP.actions - a0; saveRep();
    }
    if (PHASES.includes('scen')) { const a0 = REP.actions; await scenarios(browser, base); REP.phases.scen = REP.actions - a0; saveRep(); }
    if (PHASES.includes('marathon')) await marathon(browser, base, args.games ? args.games.split(',') : FOCUS.filter(g => all.includes(g)));
    if (PHASES.includes('focus')) {
      const a0 = REP.actions;
      const fg = FOCUS.filter(g => all.includes(g));
      // plus a sample of the new games
      const neu = all.filter(k => /^[bcdgkprsuwz]_/.test(k));
      const R0 = mulberry(hashStr('focus' + (args.seed || 1))); const extra = []; while (extra.length < +(args['focus-new'] || 12) && neu.length) extra.push(neu.splice(Math.floor(R0() * neu.length), 1)[0]);
      for (const g of [...fg, ...extra]) for (let k = 0; k < +(args['focus-reps'] || 2); k++) { const seed = hashStr('focus:' + g + ':' + k + ':' + (args.seed || 1)); await chaosGame(browser, base, g, FOCUS_N, seed, 'focus'); console.log(`  focus ${g}#${k} actions=${REP.actions} findings=${Object.keys(REP.findings).length} ${((Date.now() - t0) / 1000) | 0}s`); saveRep(); }
      REP.phases.focus = REP.actions - a0;
    }
  } finally {
    REP.seconds = (Date.now() - t0) / 1000 | 0; saveRep();
    await browser.close(); proc.kill();
    console.log(`DONE actions=${REP.actions} games=${REP.games.size} runs=${REP.runs} findings=${Object.keys(REP.findings).length} in ${REP.seconds}s -> ${OUT}`);
  }
})();

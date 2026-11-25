// Research probe: run game functions (init via newD, click via ACT_CAP, bot, botPick, mask/privShow) outside the browser,
// timing each call and recording every touch of browser-only things (document, storage, navigator, timers, window sizes).
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = '/home/user/Gamesx/public';
const touches = {}; let rec = null;
const note = k => { if (rec) { touches[rec] = touches[rec] || {}; touches[rec][k] = (touches[rec][k] || 0) + 1; } };
function trap(name) { const f = function () { note(name + '()'); return trap(name + '()'); };
  return new Proxy(f, { get(t, k) { if (typeof k === 'symbol') return k === Symbol.toPrimitive ? () => '' : undefined; if (k === 'then') return undefined; note(name + '.' + String(k)); return trap(name + '.' + String(k)); }, set() { note(name + ' set'); return true; }, apply() { note(name + '()'); return trap(name + '()'); }, construct() { note('new ' + name); return trap('new ' + name); } }); }
const store = {}; const ls = new Proxy({}, { get(t, k) { note('storage.' + String(k)); return { getItem: k2 => store[k2] ?? null, setItem: (k2, v) => { store[k2] = String(v); }, removeItem: k2 => { delete store[k2]; }, clear() {} }[k] || (() => null); } });
const ctx = { console: { log() {}, error() {}, warn() {}, info() {} }, Math, Date, JSON, Object, Array, Number, String, Set, Map, Promise, Symbol, Error, RegExp, parseInt, parseFloat, isFinite, isNaN, Infinity, NaN, Uint8Array, Uint32Array, Float64Array, ArrayBuffer, DataView, structuredClone, queueMicrotask,
  setTimeout: (...a) => { note('setTimeout'); return 0; }, clearTimeout() {}, setInterval: () => { note('setInterval'); return 0; }, clearInterval() {}, requestAnimationFrame: () => { note('requestAnimationFrame'); return 0; },
  performance: { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 }, localStorage: ls, sessionStorage: ls, navigator: trap('navigator'), location: { search: '', hash: '', href: 'http://x/', hostname: 'x', protocol: 'http:' },
  document: trap('document'), crypto: require('crypto').webcrypto, TextEncoder, TextDecoder, URL, URLSearchParams, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
  fetch: () => Promise.reject(new Error('no')), Audio: function () { note('Audio'); return trap('audio'); }, Image: function () { return trap('img'); }, matchMedia: () => { note('matchMedia'); return { matches: false, addEventListener() {}, addListener() {} }; },
  getComputedStyle: () => { note('getComputedStyle'); return {}; }, CSS: { escape: s => s }, MutationObserver: function () { return { observe() {}, disconnect() {} }; }, ResizeObserver: function () { return { observe() {}, disconnect() {} }; }, IntersectionObserver: function () { return { observe() {}, disconnect() {} }; },
  scrollTo() {}, addEventListener() {}, removeEventListener() {}, history: { replaceState() {}, pushState() {} }, screen: { width: 390, height: 844 }, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
  HTMLElement: function () {}, Element: function () {}, Node: function () {}, Event: function () {}, CustomEvent: function () {}, WebSocket: function () { return trap('ws'); } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.app = trap('app'); vm.createContext(ctx);
const html = fs.readFileSync(ROOT + '/index.html', 'utf8'); let code = '';
for (const m of html.matchAll(/<script src="([^"?]+)/g)) { if (/capacitor|boot\.js/.test(m[1])) continue; code += `\n;/*FILE ${m[1]}*/\n` + fs.readFileSync(ROOT + '/' + m[1], 'utf8'); }
vm.runInContext(code, ctx, { filename: 'app.js' });
const run = s => vm.runInContext(s, ctx);
run(`S.mode='local';S.localN=4;stopGames&&stopGames();render=function(){};`);
if (process.env.COUNT) { console.log(JSON.stringify(run(`(()=>{const a=Object.entries(GAMES);return {games:a.length,
  turnNoBot:a.filter(([k,g])=>!g.bot).map(x=>x[0]).length, simul:a.filter(([k,g])=>g.resolve||g.simulNow).length, simulNoPick:a.filter(([k,g])=>(g.resolve||g.simulNow)&&!g.botPick).length,
  usesHost:a.filter(([k,g])=>g.host).length, hasPrivInit:a.filter(([k,g])=>g.privInit).length, hasHide:a.filter(([k,g])=>g.hide||g.mask||g.privShow).length}})()`))); process.exit(0); }
const SAMPLE = (process.argv[2] || 'ttt,chess,c4,uno,baloot,hand,cats,tele,mafia,trivia,sea,hide,taqiya,jakaro,ludo,yatzy').split(',');
const N = +(process.argv[3] || 4), STEPS = +(process.argv[4] || 200);
const out = {};
const hr = () => Number(process.hrtime.bigint()) / 1e6;
for (const g of SAMPLE) {
  const r = { calls: {}, errors: [], steps: 0, ended: false };
  const T = (k, f) => { rec = g + ':' + k; const t0 = hr(); let v; try { v = f(); } catch (e) { r.errors.push(k + ': ' + String(e).slice(0, 120) + (process.env.ST ? ' @ ' + String(e.stack).split('\n').slice(1,16).join(' | ') : '')); } const dt = hr() - t0; rec = null;
    const c = r.calls[k] || (r.calls[k] = { n: 0, sum: 0, max: 0, xs: [] }); c.n++; c.sum += dt; c.max = Math.max(c.max, dt); c.xs.push(dt); return v; };
  try {
    run(`S.bots={};for(let i=0;i<${N};i++)S.bots[i]=3;S.st={g:${JSON.stringify(g)},s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};S.priv=Array(MAXP).fill(null);`);
    const d0 = T('init', () => run(`(()=>{const pl=[...Array(${N}).keys()];S.st={...S.st,s:1,d:newD(${JSON.stringify(g)},0,pl)};if(typeof initPriv==='function')initPriv();return S.st.d;})()`));
    for (let k = 0; k < STEPS; k++) {
      const st = run(`(()=>{const d=S.st.d,G=GAMES[S.st.g];if(!d)return 'nod';if(d.win!=null)return 'win';return isSimul(G,d)?'sim':'turn';})()`);
      if (st === 'win') { r.ended = true; break; } if (st === 'nod') break;
      if (st === 'sim') { const res = T('botPick+resolve', () => run(`(()=>{const d=S.st.d,G=GAMES[S.st.g];for(const s of aliveSeats(d)){if(!hasPicked(S.st.d,s))runBot(G,S.st.d,s);}return 1;})()`)); }
      else { const s0 = run('S.st.s'); T('bot turn', () => run(`(()=>{const d=S.st.d,G=GAMES[S.st.g];runBot(G,d,d.turn);return 1;})()`)); if (run('S.st.s') === s0) { r.stalls = (r.stalls || 0) + 1; if (r.stalls > 20) break; } }
      // a human tap: pick an enabled button from the markup (string, no DOM) and capture the state it makes
      if (k % 5 === 0) T('click', () => run(`(()=>{const d=S.st.d,G=GAMES[S.st.g];if(!d||d.win!=null)return;const v=isSimul(G,d)?0:d.turn;const h=G.render(d,{local:true,v,priv:S.priv,my:true});
        const b=[...h.matchAll(/data-ga="([^"]+)"(?:[^>]*?data-i="(-?\\d+)")?[^>]*>/g)].filter(m=>!/disabled/.test(m[0]));if(!b.length)return;const m=b[k%b.length];
        ACT_CAP={v:null};const hold=S.holdRender;S.holdRender=true;try{G.click(m[1],m[2]!=null?+m[2]:null,d,{local:false,v,priv:S.priv,my:true});}finally{S.holdRender=hold;ACT_CAP=null;}})()`.replace('k%b.length', String(k) + '%b.length')));
      for (let s = 0; s < N; s++) T('mask per seat', () => run(`(()=>{const d=S.st.d,G=GAMES[S.st.g];if(G.mask)G.mask(d,${s});else if(G.hide&&typeof viewOf==='function')viewOf(G,d,${s});})()`));
      r.steps++;
      run(`(()=>{const d=S.st.d,G=GAMES[S.st.g];if(G.resolve&&isSimul(G,d)&&typeof G.simulNow==='function'&&G.simulNow(d)&&typeof doResolve==='function')doResolve();})()`);
    }
  } catch (e) { r.errors.push('setup: ' + String(e).slice(0, 160)); }
  for (const c of Object.values(r.calls)) { c.xs.sort((a, b) => a - b); c.p50 = c.xs[Math.floor(c.xs.length / 2)]; c.p95 = c.xs[Math.floor(c.xs.length * .95)]; c.mean = c.sum / c.n; delete c.xs; }
  r.touches = Object.fromEntries(Object.entries(touches).filter(([k]) => k.startsWith(g + ':')));
  out[g] = r;
}
console.log(JSON.stringify(out, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v, 1));

// Usage: node tools/test/online/tfull.js <port> <game,game,...> [players=3] [maxSteps=250] [teams=0]
//   Prints one line per game and ends with TFULL OK or TFULL FAILURES n. Starts its own relay.mjs on <port>, with 20-60 ms latency.
//   BOT=1 (env): bot-driven run instead of random taps (see botStep): maxSteps is then the number of moves allowed.
// Full online play: NP pages, each game to its end with random taps (host sometimes plays bot moves), checks views and convergence.
const L = require('./lib');
const port = +process.argv[2]; const TEAMS = +(process.argv[6] || 0); const GAMES_ = process.argv[3].split(','); const NP = +(process.argv[4] || 3); const MAXS = +(process.argv[5] || 250);
const BOT = process.env.BOT === '1';
const fails = []; const fail = (...a) => { fails.push(a.join(' ')); console.log('FAIL', ...a); };
const step = (p, opts) => p.evaluate((opts) => {
  try { if (S.mode !== 'online' || !S.st.g || !S.st.d || S.st.d.win != null) return null;
    if (S.modal) { S.modal = null; render(); } S.showResult = false;
    const c = mkCtx(); 
    if (S.st.g === 'sea') { const b = app.querySelector('[data-ga="ready"]'); if (b && Math.random() < .5) { b.click(); return 'ready'; } }
    // draw and guess, categories: everyone may act at once though only one seat has the turn
    const free = (S.st.g === 'cats' || S.st.g === 'tele') && S.me != null && S.st.d.pl.includes(S.me);
    if (!c.my && !free) return null;
    if (opts.bot && amHost() && !free) { const d = S.st.d, G = GAMES[S.st.g], s = d.pl.indexOf(S.me);
      if (isSimul(G, d)) { if (!hasPicked(d, s)) { botClick(G, d, s, 2, true); return 'hbotpick'; } }
      else if (d.turn === s) { let nd = G.bot ? G.bot(d, s, 2) : undefined; if (nd === undefined) nd = botClick(G, d, s, 2, false); if (nd && nd !== d) { act(nd); return 'hbot'; } } }
    if (S.st.g === 'cats' && S.st.d.ph === 'write') for (const el of app.querySelectorAll('.cform input[data-draft]')) if (!catOkL(el.value, S.st.d.L, +el.dataset.draft.split('_')[2]) && Math.random() < .6) { const k = +el.dataset.draft.split('_')[2]; const ws = catWords(k, S.st.d.L); el.value = ws.length ? ws[Math.floor(Math.random() * ws.length)] : 'x'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    // «طرف الخيط»: the clue-giver often gives a clue the check accepts (from what its own view shows), a picked tile is often confirmed
    // «تحدي الخلية»: buzz often, and a typed answer is sometimes one of the bank's answers for the letter
    if (S.st.g === 'q_cell') { const bz = app.querySelector('[data-ga="bz"]'); if (bz && Math.random() < .7) { bz.click(); return 'qc-buzz'; }
      const qi = app.querySelector('.qc-in'); if (qi && S.st.d.q) { const ks = QC.byLetter(S.st.d.q.L); qi.value = QC.bank()[ks[Math.floor(Math.random() * ks.length)]].a; qi.dispatchEvent(new Event('input', { bubbles: true })); const sb = app.querySelector('[data-ga="ty"]'); if (sb) { sb.click(); return 'qc-type'; } } }
    if (S.st.g === 'w_thread') { const wi = app.querySelector('.wth-in');
      if (wi && Math.random() < .6) { wi.value = WT.clueBot(S.st.d, Math.random).w; wi.dispatchEvent(new Event('input', { bubbles: true })); const sb = app.querySelector('.wth-send'); if (sb && !sb.disabled) { sb.click(); return 'wth-clue'; } }
      const pk = app.querySelector('.wth-pk.wth-can'); if (pk && Math.random() < .7) { pk.click(); return 'wth-confirm'; } }
    const inputs = [...app.querySelectorAll('.board input[data-draft], .board textarea[data-draft]')];
    for (const el of inputs) { if (el.type === 'range') { const mn = +el.min || 0, mx = +el.max || 10; el.value = mn + Math.floor(Math.random() * (mx - mn + 1)); el.dispatchEvent(new Event('input', { bubbles: true })); continue; }
      if (!el.value) { const W = ['كتاب', 'باب', 'قلم', 'شمس', 'بحر', 'جمل']; el.value = W[Math.floor(Math.random() * W.length)]; el.dispatchEvent(new Event('input', { bubbles: true })); } }
    let els = [...app.querySelectorAll('.board [data-ga], .status [data-ga]')].filter(e => !e.disabled && !e.hasAttribute('disabled'));
    const avoid = ['shuffle', 'gone', 'undo', 'clr'];
    const pe = els.filter(e => !avoid.includes(e.dataset.ga)); if (pe.length) els = pe;
    if (!els.length) return null;
    // tele pad: draw a stroke first
    if (S.st.g === 'tele') { const pad = document.getElementById('pad'); if (pad) { const b = pBuf(S.st.d); if (!b.st.length) { b.st.push({ c: 1, w: 1, p: [[3, 3], [20, 30], [40, 10]] }); pPub(S.st.d); } }
      // a guesser sometimes types the right word (only the host knows it: try a likely one)
      const inp = app.querySelector('.pguess input'); if (inp && Math.random() < .5) { inp.value = ['قطة', 'سيارة', 'بيت', 'شمس'][Math.floor(Math.random() * 4)]; inp.dispatchEvent(new Event('input', { bubbles: true })); const sb = app.querySelector('[data-ga="send"]'); if (sb) { sb.click(); return 'send'; } } }
    if (S.st.g === 'wasla' && Math.random() < .8) { S.draft.wl = WASLA[Math.floor(Math.random() * WASLA.length)]; const en = app.querySelector('[data-ga="ent"]'); if (en) { en.click(); return 'ent'; } }
    // prefer a button that makes a move (dry run on what this phone sees)
    const G = GAMES[S.st.g], d = S.st.d; let acting = [];
    if (Math.random() < 0.85) { const seen = new Set(); const tt = window.toast; window.toast = () => {}; const hr = S.holdRender; S.holdRender = true; const rr = window.render; window.render = () => {};
      for (const e of els.slice().sort(() => Math.random() - .5).slice(0, 14)) { const k = e.dataset.ga + ':' + e.dataset.i; if (seen.has(k)) continue; seen.add(k);
        const ui = uiSnap(G); NET_CAP = { v: undefined, pv: null }; try { G.click(e.dataset.ga, e.dataset.i != null ? +e.dataset.i : null, d, c); } catch (x) { } const cap = NET_CAP; NET_CAP = null; uiLoad(G, ui);
        if (cap.v !== undefined && cap.v !== d || cap.pv) acting.push(e); }
      window.toast = tt; S.holdRender = hr; window.render = rr; }
    const pool = acting.length ? acting : els;
    const e = pool[Math.floor(Math.random() * pool.length)];
    if (typeof e.click === 'function') e.click(); else e.dispatchEvent(new MouseEvent('click', { bubbles: true })); return e.dataset.ga;
  } catch (e) { return 'ERR ' + e.message; } }, opts);
/* BOT=1: every move is the game's own bot (level 2) choosing on the HOST's whole state for the seat that may move; the host
   then finds the taps on that seat's own buttons (its view, its phone's UI) that make exactly that move (sandboxClick on the
   whole state), and the seat's own phone taps them, so the move goes through the normal client path (ck/pv/nd intents).
   A move no short run of taps makes (a whole turn in one: draw, lay down, discard) is played by the host for the seat, as
   its own bots play; the summary counts both (phoneTaps, hostPlayed) */
// the roles that may move now (simultaneous rounds: every alive seat that has not picked; monopoly: the one a trade waits on)
const botActors = A => A.evaluate(() => { const d = S.st.d, G = GAMES[S.st.g]; if (!d || !G) return { roles: [] }; if (d.win != null) return { win: d.win };
  const roles = [];
  for (let s = 0; s < d.pl.length; s++) { if (d.out[s] === '1') continue; let my = false;
    try { my = ctxFor(viewOf(G, d, s), s, seatPriv(G, d, s)).my; } catch (e) { }
    if (S.st.g === 'mono' && d.offer && d.offer.to === s) { roles.unshift(d.pl[s]); continue; }
    if (my) roles.push(d.pl[s]); }
  return { s: S.st.s, roles }; });
// on the host: the bot's move for `role`, and the shortest taps from the phone's UI `ui` that make it (no bot: any tap that moves)
const botPlan = (A, role, ui) => A.evaluate(({ role, ui }) => { const G = GAMES[S.st.g], d = S.st.d, s = d.pl.indexOf(role), sim = isSimul(G, d);
  let want, pick, hasPick = false, err = null;
  try { if (sim) { if (G.botPick) { pick = asSeat(G, d, s, {}, () => G.botPick(d, s, 2)); if (pick == null) pick = NOPICK; hasPick = true; } }
    else { want = asSeat(G, d, s, {}, () => G.bot ? G.bot(d, s, 2) : undefined); if (want === d) return { s: S.st.s, wait: true }; if (want) want = teamFix(want); } }
  catch (e) { err = 'bot: ' + e.message; want = undefined; }
  const v = viewOf(G, d, s), pv = seatPriv(G, d, s), avoid = ['gone', 'undo'];
  const btns = u => asSeat(G, v, s, u, () => { let h = ''; try { const c = ctxFor(v, s, pv); h = G.render(v, c) + (G.status ? '<i>' + G.status(v, c) + '</i>' : ''); } catch (e) { return []; }
    TPL.innerHTML = h; const seen = new Set(), r = [];
    for (const e of TPL.content.querySelectorAll('[data-ga]')) { if (e.hasAttribute('disabled') || avoid.includes(e.dataset.ga)) continue; const b = { a: e.dataset.ga, i: e.dataset.i != null ? +e.dataset.i : null }, k = b.a + ':' + b.i; if (!seen.has(k)) { seen.add(k); r.push(b); } }
    TPL.innerHTML = ''; return r; });
  const score = R => { const mine = !!(R.pv && R.pv.role === role), moved = R.v !== undefined && !!R.v && R.v !== d;
    if (hasPick) return mine && jsEq(R.pv.p.pick, pick) ? 1e6 : mine && R.pv.p.pick != null || moved ? 1 + Math.random() * .5 : -1;
    if (!moved) return mine ? .5 : -1; if (!want) return 1 + Math.random() * .5; if (jsEq(R.v, want)) return 1e6;
    return 1 + Object.keys(want).filter(q => jsEq(R.v[q], want[q])).length + Math.random() * .5; };
  let best = null, evals = 0; const seenUi = new Set();
  const rec = (u, path, depth) => { const k = JSON.stringify(u); if (seenUi.has(k) || evals > 600) return; seenUi.add(k); const next = [];
    for (const b of btns(u)) { if (evals++ > 600) break; const R = sandboxClick(G, d, s, b.a, b.i, u), sc = score(R), p = [...path, b];
      if (sc > 0) { if (!best || sc > best.sc || sc === best.sc && p.length < best.path.length) best = { sc, path: p }; if (sc >= 1e6) return; }
      else if (R.u && Object.keys(R.u).length) { const nu = { ...u }; for (const q in R.u) { if (R.u[q] === null) delete nu[q]; else nu[q] = R.u[q]; } next.push({ u: nu, p }); } }
    if (depth < 4) for (const n of next) { rec(n.u, n.p, depth + 1); if (best && best.sc >= 1e6) return; } };
  rec(ui || {}, [], 1);
  // a bot move no taps make at once (a whole turn: draw, lay down, discard): the host plays it for the seat, as its own bots do
  if (!(best && best.sc >= 1e6) && (hasPick || want)) { const s0 = S.st.s; S.inIntent = true;
    try { if (hasPick) simulPick(d, s, pick); else act(want); } finally { S.inIntent = false; } return { s: s0, host: true, err }; }
  return { s: S.st.s, path: best ? best.path : null, want: want === undefined && !hasPick ? 'none' : 'bot', err }; }, { role, ui });
// one tap on this phone's own screen, as a player makes it
const tapOn = (p, b) => p.evaluate(({ a, i }) => { if (S.modal || S.showResult) { S.modal = null; S.showResult = false; render(); }
  const el = [...app.querySelectorAll('[data-ga]')].find(e => e.dataset.ga === a && (i == null ? e.dataset.i == null : +e.dataset.i === i) && !e.disabled && !e.hasAttribute('disabled'));
  if (!el) return 'nobtn ' + a + ':' + i; el.click(); return 'ok'; }, b);
const phoneState = p => p.evaluate(() => ({ s: S.st.s, q: S.outQ.length, pend: !!S.pend, ui: uiSnap(GAMES[S.st.g]) }));
// one bot move: 'moved', 'wait' (nobody can move now / the bot waits) or a reason it could not be made
async function botStep(A, P, st) {
  const ac = await botActors(A); if (ac.win != null || !ac.roles.length) return ac.win != null ? 'win' : 'wait';
  const role = ac.roles[st.k++ % ac.roles.length], p = P.find(x => x.role === role); if (!p) return 'no page for role ' + role;
  // the phone must be on the host's board with nothing waiting to be sent
  let ps; for (let t = 0; t < 40; t++) { ps = await phoneState(p); if (p === A || ps.s === ac.s && !ps.q && !ps.pend) break; await L.sleep(100); }
  if (p !== A && (ps.s !== ac.s || ps.q || ps.pend)) return 'phone behind';
  const pl = await botPlan(A, role, ps.ui); if (pl.err) st.botErr.push(pl.err); if (pl.s !== ac.s) return 'host moved';
  if (pl.wait) return 'wait'; if (pl.host) { st.host++; return 'moved'; } if (!pl.path) return 'no tap moves ' + p.label;
  if (pl.want === 'none') st.nobot++; st.taps++;
  for (const b of pl.path) { const r = await tapOn(p, b); if (r !== 'ok') return r + ' on ' + p.label; await L.sleep(30); }
  // a pick in a simultaneous round changes no board until every seat has picked: the host holding it is enough
  const took = () => A.evaluate(([s0, role]) => { const d = S.st.d, G = GAMES[S.st.g]; return S.st.s !== s0 || !!d && isSimul(G, d) && hasPicked(d, d.pl.indexOf(role)); }, [ac.s, role]);
  for (let t = 0; t < 40; t++) { if (await took()) return 'moved'; await L.sleep(100); }
  return 'host did not take the move of ' + p.label + ' ' + JSON.stringify(pl.path); }
// a part that changes without a new state (typing, drawing) reaches the others with the next publish: a mismatch counts only if it stays
const viewCheck = async (A, NH, g) => { const got = []; const n = await viewCheck1(A, NH, g, got); if (!got.length) return n;
  await L.sleep(1500); const again = []; await viewCheck1(A, NH, g, again); const keys = new Set(again.map(x => x.k));
  for (const x of got) if (keys.has(x.k)) fail(...x.a); return n; };
const viewCheck1 = async (A, NH, g, out) => { const fail = (...a) => out.push({ k: a.slice(0, 4).join(' '), a });
  const T = await A.evaluate(() => ({ s: S.st.s, gid: S.st.d && S.st.d.gid }));
  if (!T.gid) return 0; let n = 0;
  for (const p of NH) {
    const v = await p.evaluate(() => ({ s: S.st.s, d: S.st.d, priv: S.priv, me: S.me, q: S.outQ.length }));
    if (!v.d || v.s !== T.s || v.q) continue; const seat = v.d.pl.indexOf(v.me);
    const want = await A.evaluate(([seat, me, s]) => { if (S.st.s !== s) return null; const G = GAMES[S.st.g], d = S.st.d; return { d: JSON.parse(JSON.stringify(cleanD(viewOf(G, d, seat)))), priv: S.priv.map((x, r) => r === me ? null : (x && x.gid === d.gid ? privFor(G, d, seat, r, x) : null)) }; }, [seat, v.me, v.s]);
    if (!want) continue; n++;
    if (JSON.stringify(v.d) !== JSON.stringify(want.d)) { const keys = Object.keys({ ...v.d, ...want.d }).filter(k => JSON.stringify(v.d[k]) !== JSON.stringify(want.d[k])); fail(g, p.label, 'view differs keys', keys.join(','), keys.slice(0,1).map(k => JSON.stringify(v.d[k]).slice(0, 100) + ' vs ' + JSON.stringify(want.d[k]).slice(0, 100)).join()); }
    for (let r = 0; r < 8; r++) { if (r === v.me) continue; const x = v.priv[r], y = want.priv[r]; if (y == null) continue;
      if (JSON.stringify(x) !== JSON.stringify(y) && !(x && y && x.gid === y.gid && x.rd !== y.rd)) fail(g, p.label, 'priv', String(r), JSON.stringify(x).slice(0, 80), 'want', JSON.stringify(y).slice(0, 80)); }
  }
  return n; };
// what a player who is not the host holds: only its own secrets
const leakCheck = async (A, NH, g) => {
  const truth = await A.evaluate(() => ({ d: S.st.d, priv: S.priv, me: S.me, s: S.st.s }));
  const t = truth.d; if (!t || t.win != null) return 0; let n = 0;
  // states that never hold a secret at all
  if (g === 'hilo' && t.dk.length !== (t.p + 1) * 2) fail(g, 'hilo state holds unturned cards', t.dk.length, t.p);
  if (g === 'luck' && [...t.box].some((c, i) => t.op[i] === '.' && c !== '?')) fail(g, 'luck state holds closed boxes');
  for (const p of NH) {
    const v = await p.evaluate(() => ({ d: S.st.d, priv: S.priv, me: S.me, s: S.st.s }));
    const seat = v.d ? v.d.pl.indexOf(v.me) : -1; if (!v.d || v.d.gid !== t.gid || v.d.win != null || v.s !== truth.s) continue; n++;
    const J = JSON.stringify(v.d);
    if (g === 'uno') t.hands.forEach((h, s) => { if (s !== seat && v.d.hands[s] && /[^?]/.test(v.d.hands[s])) fail(g, p.label, 'hand not masked', s); });
    if (g === 'baloot' && Array.isArray(t.hands)) t.hands.forEach((h, k) => { if (t.ctl[k] !== seat && v.d.hands[k] && /[^?]/.test(v.d.hands[k])) fail(g, p.label, 'baloot hand visible', k); });
    if (g === 'mafia') [...t.roles].forEach((c, s) => { const ok = s === seat || t.out[s] === '1' || (t.roles[seat] === 'm' && c === 'm'); if (!ok && v.d.roles[s] !== '?') fail(g, p.label, 'sees role of', s); });
    if (g === 'bara' && t.bo >= 0 && t.ph !== 'end' && t.ph !== 'guess') { if (seat !== t.bo && v.d.bo >= 0 && v.d.bo !== seat) fail(g, p.label, 'sees who is out of the loop'); if (seat === t.bo && v.d.w >= 0) fail(g, p.label, 'outsider sees the word'); }
    if (g === 'sea') t.pl.forEach((r, s) => { if (s === seat || t.out[s] === '1') return; const tf = truth.priv[r] && truth.priv[r].f, x = v.priv[r], vf = x && x.f; if (tf && vf) for (let i = 0; i < 64; i++) if (vf[i] !== '.' && t.sh[s][i] !== 'o') { fail(g, p.label, 'sees unhit ship of', s); break; } if (x && x.pick != null && x.pick !== 1 && x.pick !== '~') fail(g, p.label, 'sees salvo of', s); });
    if (g === 'tele' && (t.ph === 'draw' || t.ph === 'pick')) { const dr = (t.st + t.q) % t.pl.length; const got = t.got.some(x => x[0] === seat);
      if (seat !== dr) { if (Array.isArray(v.d.ch) && v.d.ch.some(x => x !== -1)) fail(g, p.label, 'sees word choices'); if (t.ph === 'draw' && !got && v.d.w !== -1) fail(g, p.label, 'sees the word'); if (t.ph === 'draw' && !got && v.d.used && v.d.used.includes(t.w)) fail(g, p.label, 'sees the word in used'); }
      t.pl.forEach((r, s) => { if (s === seat) return; const x = v.priv[r]; if (x && x.gq) fail(g, p.label, 'sees guesses of', s); }); }
    if (g === 'cats' && t.ph === 'write') t.pl.forEach((r, s) => { if (s === seat) return; const x = v.priv[r]; if (x && x.ca && Array.isArray(x.ca.a) && x.ca.a.some(w => w && w !== '·')) fail(g, p.label, 'sees answers of', s, JSON.stringify(x.ca.a)); });
    if (g === 'wires') { if (v.d.bomb !== -1) fail(g, p.label, 'sees the bomb wire'); t.kn.forEach((k, s) => { if (s !== seat && v.d.kn[s] && v.d.kn[s].some(x => x !== -1)) fail(g, p.label, 'sees safe wires of', s); }); }
    // «طرف الخيط»: the secret map reaches the clue-givers only (duo: each player their own side), never a guesser
    // «تحدي الخلية»: the answer of an open question stays on the host
    if (g === 'q_cell' && t.q && v.d.q && (v.d.q.A !== -1 || v.d.q.a || (v.d.q.v || []).length || v.d.q.k !== -1)) fail(g, p.label, 'sees the answer');
    if (g === 'w_thread' && Array.isArray(t.k)) { const k = v.d.k || [], hidden = x => typeof x === 'string' && /^\?+$/.test(x);
      if (t.md === 'duo') { if (!hidden(k[1 - seat])) fail(g, p.label, 'sees the other side of the duo map'); if (k[seat] !== t.k[seat]) fail(g, p.label, 'misses its own side of the map'); }
      else if (t.cg.includes(seat)) { if (k[0] !== t.k[0]) fail(g, p.label, 'clue-giver misses the map'); }
      else if (!hidden(k[0])) fail(g, p.label, 'guesser sees the map'); }
    if (['trivia', 'islam', 'rps'].includes(g)) t.pl.forEach((r, s) => { if (s === seat) return; const x = v.priv[r]; if (x && x.pick != null && x.pick !== 1) fail(g, p.label, 'sees pick of', s); });
  }
  return n; };
// every frame: players send only sealed queues (and own public part); the host's public message hides the secrets
const frameCheck = async (P, A, g) => { let n = 0;
  for (const p of P) { const frames = await p.evaluate(() => window.__sent.map(s => JSON.parse(s).p));
    for (const f of frames) { if (!f) continue; n++;
      if (p !== A) { if (f.d != null || f.vw != null || f.ids != null) fail(g, p.label, 'non-host published host keys'); if (Array.isArray(f.q)) for (const q of f.q) if (!/^[\w-]{16}\.[\w-]+$/.test(q.c)) fail(g, p.label, 'q not sealed');
        if (f.pp != null && g !== 'tele') fail(g, p.label, 'non-host pp'); if (f.pp && f.pp.gq) fail(g, p.label, 'own pp shows guesses'); continue; }
      const d = f.d; if (!d || d.win != null) continue;
      if (g === 'uno' && (d.hands.some(h => /[^?]/.test(h)) || /[^?]/.test(d.draw))) fail(g, 'host frame shows hands/draw');
      if (g === 'mafia') [...d.roles].forEach((c, s) => { if (c !== '?' && d.out[s] !== '1') fail(g, 'host frame shows role', s); });
      if (g === 'baloot' && Array.isArray(d.hands) && d.hands.some(h => /[^?]/.test(h))) fail(g, 'host frame shows baloot hand');
      if (g === 'wires' && (d.bomb !== -1 || d.kn.some(k => k.some(x => x !== -1)))) fail(g, 'host frame shows bomb/known wires');
      if (g === 'tele' && (d.ph === 'draw' || d.ph === 'pick') && (d.w !== -1 && d.w != null || (d.ch || []).some(x => x !== -1))) fail(g, 'host frame shows the word');
      if (g === 'luck' && [...d.box].some((c, i) => d.op[i] === '.' && c !== '?')) fail(g, 'host frame shows boxes');
      if (g === 'hilo' && d.dk.length !== (d.p + 1) * 2) fail(g, 'host frame shows deck');
      if (g === 'w_thread' && Array.isArray(d.k) && d.k.some(x => /[^?]/.test(x))) fail(g, 'host frame shows the map');
      if (g === 'q_cell' && d.q && (d.q.A !== -1 || d.q.a)) fail(g, 'host frame shows the answer');
      if (f.pp) for (const r in f.pp) { const x = f.pp[r]; if (!x || x === '@') continue;
        if (x.pick != null && x.pick !== 1 && x.pick !== '~' && (x.rd == null || x.rd === d.rd)) fail(g, 'host frame pp shows pick', r, JSON.stringify(x.pick).slice(0, 40));
        if (x.gq) fail(g, 'host frame pp shows guesses', r);
        if (g === 'cats' && d.ph === 'write' && x.ca && x.ca.a.some(w => w && w !== '·')) fail(g, 'host frame pp shows answers', r);
        if (g === 'sea' && x.f) { const s = d.pl.indexOf(+r); if (s >= 0 && d.out[s] !== '1') for (let i = 0; i < 64; i++) if (x.f[i] !== '.' && d.sh[s][i] !== 'o') { fail(g, 'host frame pp shows ship', r); break; } } } } }
  return n; };
(async () => {
  const srv = await L.startServer(port, { LAT_MIN: 20, LAT_MAX: 60 }); const b = await L.newBrowser(); const summary = {};
  try {
    const A = await L.newPlayer(b, port, 'Ali', 'A'); const code = await L.createRoom(A); const P = [A];
    for (let i = 1; i < NP; i++) { const p = await L.newPlayer(b, port, 'P' + i, String.fromCharCode(65 + i)); await L.joinRoom(p, code); P.push(p); }
    const NH = P.slice(1); await L.sleep(1000);
    if (TEAMS) { await A.evaluate(k => setCfg({ teams: k, tm: {} }), TEAMS); await L.sleep(1200);
      const cf = await Promise.all(P.map(p => p.evaluate(() => S.st.cfg.teams))); if (cf.some(x => x !== TEAMS)) fail('teams cfg not on every page', JSON.stringify(cf)); else console.log('teams cfg on all pages', TEAMS); }
    for (const g of GAMES_) {
      const t0 = Date.now();
      await L.pickGame(A, g); await L.sleep(700);
      const gmin = await A.evaluate(() => S.st.g); if (gmin !== g) { summary[g] = 'not started (minP?)'; console.log(g, 'not started'); continue; }
      let moves = 0, end = null, checks = 0, idle = 0, errsIn = [], leaks = 0, botInfo = null;
      for (const p of P) await p.evaluate(() => { window.__sent.length = 0; });
      if (BOT) { const st = { k: 0, taps: 0, host: 0, nobot: 0, botErr: [], why: {} }; let k = 0;
        for (const p of P) p.role = await p.evaluate(() => S.me);
        for (; k < MAXS * 3 && moves < MAXS; k++) {
          let r; try { r = await botStep(A, P, st); } catch (e) { r = 'ERR ' + String(e.message).slice(0, 200); }
          if (r === 'moved') { moves++; idle = 0; } else if (r !== 'win') { st.why[r] = (st.why[r] || 0) + 1; if (/^ERR/.test(r)) errsIn.push(r); if (++idle > 40) break; await L.sleep(r === 'wait' ? 300 : 150); }
          if (k % 8 === 7) checks += await viewCheck(A, NH, g);
          if (k % 3 === 0) leaks += await leakCheck(A, NH, g);
          const w = await A.evaluate(() => S.st.d && S.st.d.win); if (w != null) { end = w; break; }
          if (k % 100 === 99) console.log('  ', g, 'step', k + 1, 'moves', moves, Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(st.why)); }
        botInfo = { phoneTaps: st.taps, hostPlayed: st.host, nobot: st.nobot, botErr: st.botErr.slice(0, 3), notMoved: st.why }; }
      else for (let k = 0; k < MAXS; k++) {
        let moved = 0;
        for (const p of P) { const r = await step(p, { bot: p === A && Math.random() < 0.5 }); if (r && /^ERR/.test(r)) errsIn.push(p.label + ' ' + r); if (r) moved++; }
        moves += moved; await L.sleep(120);
        if (k % 8 === 7) checks += await viewCheck(A, NH, g);
        if (k % 3 === 0) leaks += await leakCheck(A, NH, g);
        const w = await A.evaluate(() => S.st.d && S.st.d.win); if (w != null) { end = w; break; }
        if (!moved) { if (++idle > 40) break; await L.sleep(250); } else idle = 0;
      }
      await L.sleep(1200);
      // converged = every phone reaches the host's state. A real-time game (taqiya's walk) moves on every 200 ms on the host,
      // so a snapshot of all phones at one instant can catch the others one frame behind while that frame is on its way:
      // take the host's state, then every phone must reach it (same round, same or later step) within 3 s.
      const snap = () => Promise.all(P.map(p => p.evaluate(() => ({ s: S.st.s, gid: S.st.d && S.st.d.gid, win: S.st.d && S.st.d.win, q: S.outQ.length }))));
      let ii = await snap(); const h0 = ii[0]; let conv = false;
      for (let w = 0; w < 30 && !conv; w++) { conv = ii.every(x => x.gid === ii[0].gid && x.s >= h0.s) && ii.slice(1).every(x => x.gid === h0.gid || x.s > h0.s); if (!conv) { await L.sleep(100); ii = await snap(); } }
      if (!conv) fail(g, 'not converged', JSON.stringify({ host: h0, now: ii }));
      checks += await viewCheck(A, NH, g);
      const errs = []; for (const p of P) errs.push(...p.pageErrors.splice(0).map(e => p.label + ': ' + e));
      if (errs.length) fail(g, 'page errors', JSON.stringify(errs.slice(0, 4)).slice(0, 600));
      if (errsIn.length) fail(g, 'step errors', JSON.stringify(errsIn.slice(0, 3)));
      const fl = await frameCheck(P, A, g);
      if (TEAMS) { const tt = await Promise.all(P.map(p => p.evaluate(() => ({ tm: S.st.d && S.st.d.tm, win: S.st.d && S.st.d.win, wins: S.st.d && S.st.d.wins, wt: S.st.d && S.st.d.wt, sc: S.st.sc, strip: !!app.querySelector('.tstrip'), teamsG: GAMES[S.st.g].teams || null }))));
        const t0 = tt[0]; if (t0.teamsG !== 'none') { if (!Array.isArray(t0.tm)) fail(g, 'no d.tm with teams'); if (tt.some(x => JSON.stringify(x.tm) !== JSON.stringify(t0.tm))) fail(g, 'd.tm differs');
          if (tt.some(x => JSON.stringify(x.sc) !== JSON.stringify(t0.sc))) fail(g, 'team scores differ', JSON.stringify(tt.map(x => x.sc)));
          if (typeof t0.win === 'number' && t0.teamsG !== 'native') { const team = t0.tm.map((t, s) => t === t0.tm[t0.win] ? s : -1).filter(s => s >= 0); if (JSON.stringify(t0.wins) !== JSON.stringify(team)) fail(g, 'wins is not the whole team', JSON.stringify(t0.wins), JSON.stringify(team)); }
          const sbar = await NH[0].evaluate(() => { if (S.modal) { S.modal = null; } S.showResult = false; S.browse = false; render(); return !!app.querySelector('.tstrip'); }); if (!sbar) fail(g, 'no team strip on a player page'); }
        console.log(g, 'teams', JSON.stringify({ tm: t0.tm, win: t0.win, wins: t0.wins, wt: t0.wt, sc: t0.sc.slice(0, 4) })); }
      summary[g] = { moves, end, checks, leakChecks: leaks, frames: fl, conv, sec: Math.round((Date.now() - t0) / 1000), ...(botInfo ? { bot: botInfo } : {}) };
      if (end == null) { const st = await A.evaluate(() => ({ turn: S.st.d && S.st.d.turn, ph: S.st.d && S.st.d.ph })).catch(() => null); summary[g].stuckAt = st; }
      if (BOT && end == null) fail(g, 'bot run did not reach the end', JSON.stringify(summary[g].stuckAt), JSON.stringify(botInfo.notMoved).slice(0, 300));
      console.log(g, JSON.stringify(summary[g]));
    }
    // non-host asks for a new round and (pick:'all') a new game
    const g0 = await A.evaluate(() => S.st.g);
    const s0 = await A.evaluate(() => S.st.d && S.st.d.gid);
    const winNow = await A.evaluate(() => S.st.d && S.st.d.win != null);
    if (winNow) { await P[1].evaluate(() => { const b = app.querySelector('[data-a="again"]'); if (b) b.click(); else newRound(); }); await L.sleep(1500);
      const s1 = await A.evaluate(() => S.st.d && S.st.d.gid); if (s1 === s0) fail('non-host new round not applied'); else console.log('nonhost new round OK'); }
    await A.evaluate(() => setCfg({ pick: 'all' })); await L.sleep(800);
    await P[1].evaluate(() => setGame('c4')); await L.sleep(1500);
    if (await A.evaluate(() => S.st.g) !== 'c4') fail('non-host pick game not applied'); else console.log('nonhost pick OK');
  } catch (e) { fail('ERR', String(e).slice(0, 400)); } finally { await b.close(); srv.kill(); }
  console.log('SUMMARY', JSON.stringify(summary));
  console.log(fails.length ? 'TFULL FAILURES ' + fails.length : 'TFULL OK');
})();

// Usage: node tools/test/online/tfull.js <port> <game,game,...> [players=3] [maxSteps=250] [teams=0]
//   Prints one line per game and ends with TFULL OK or TFULL FAILURES n. Starts its own relay.mjs on <port>, with 20-60 ms latency.
// Full online play: NP pages, each game to its end with random taps (host sometimes plays bot moves), checks views and convergence.
const L = require('./lib');
const port = +process.argv[2]; const TEAMS = +(process.argv[6] || 0); const GAMES_ = process.argv[3].split(','); const NP = +(process.argv[4] || 3); const MAXS = +(process.argv[5] || 250);
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
      let moves = 0, end = null, checks = 0, idle = 0, errsIn = [], leaks = 0;
      for (const p of P) await p.evaluate(() => { window.__sent.length = 0; });
      for (let k = 0; k < MAXS; k++) {
        let moved = 0;
        for (const p of P) { const r = await step(p, { bot: p === A && Math.random() < 0.5 }); if (r && /^ERR/.test(r)) errsIn.push(p.label + ' ' + r); if (r) moved++; }
        moves += moved; await L.sleep(120);
        if (k % 8 === 7) checks += await viewCheck(A, NH, g);
        if (k % 3 === 0) leaks += await leakCheck(A, NH, g);
        const w = await A.evaluate(() => S.st.d && S.st.d.win); if (w != null) { end = w; break; }
        if (!moved) { if (++idle > 40) break; await L.sleep(250); } else idle = 0;
      }
      await L.sleep(1200);
      const ii = await Promise.all(P.map(p => p.evaluate(() => ({ s: S.st.s, gid: S.st.d && S.st.d.gid, win: S.st.d && S.st.d.win, q: S.outQ.length }))));
      const conv = ii.every(x => x.s === ii[0].s && x.gid === ii[0].gid);
      if (!conv) fail(g, 'not converged', JSON.stringify(ii));
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
      summary[g] = { moves, end, checks, leakChecks: leaks, frames: fl, conv, sec: Math.round((Date.now() - t0) / 1000) };
      if (end == null) { const st = await A.evaluate(() => ({ turn: S.st.d && S.st.d.turn, ph: S.st.d && S.st.d.ph })).catch(() => null); summary[g].stuckAt = st; }
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

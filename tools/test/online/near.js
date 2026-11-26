// Usage: node tools/test/online/near.js <port> [game,game,...] [players=3] [shots-dir]
//   Nearby rooms on plain Bluetooth (BtRoom) with no phones: every page gets a stand-in for the native plugin, and this
//   script is the air between them (rooms found by name, links, messages in order, cuts). It checks:
//     1. a room opens and the others find it in the list and join it;
//     2. each game plays to its end with bot moves and all phones agree;
//     3. a cut link comes back by the room's address even when the room can no longer be found (Android hid it);
//     4. «خلّ غرفتك تظهر» shows when the room's phone is hidden and goes away after a tap;
//     5. refusing Android's "let nearby devices see this phone" gives a clear line and no room.
//   Prints NEAR OK or NEAR FAILURES n. With a shots dir it saves the screens of 4 and 5.
//   Phones other than the room's play secret games by random taps (as net.js asks), so a long game (hand) may not end in time.
const L = require('./lib');
const path = require('path');
const port = +process.argv[2]; const GAMES_ = (process.argv[3] || 'c4,uno,k_fives').split(','); const NP = +(process.argv[4] || 3); const SHOTS = process.argv[5];
const fails = []; const fail = (...a) => { fails.push(a.join(' ')); console.log('FAIL', ...a); };

// the native plugin's calls and events (BtRoomPlugin.java), answered by the air below
const FAKE = () => {
  const Lsn = {};
  window.__btin = (ev, o) => { for (const f of (Lsn[ev] || []).slice()) { try { f(o); } catch (e) { console.error(e); } } };
  const air = m => window.__air(m);
  const F = {
    status: async () => ({ sdk: 34, via: 'bt', gmsOk: true, loc: true, locNeeded: false, hasBt: true, bt: true, perm: true, visible: false }),
    ensure: async () => ({ granted: true }), settings: async () => {},
    addListener: async (ev, fn) => { (Lsn[ev] = Lsn[ev] || []).push(fn); return { remove: async () => { Lsn[ev] = (Lsn[ev] || []).filter(x => x !== fn); } }; },
    advertise: async ({ name }) => { if (window.__refuse) { const e = new Error('DISCOVERABLE_REFUSED'); throw e; } await air({ t: 'adv', name }); return { visible: true }; },
    stopAdvertising: async () => { await air({ t: 'unadv' }); },
    show: async () => { await air({ t: 'show' }); return { visible: true }; },
    visible: async () => ({ visible: true }),
    discover: async () => { await air({ t: 'disc' }); },
    stopDiscovery: async () => { await air({ t: 'undisc' }); },
    connect: async ({ id }) => { await air({ t: 'conn', to: id }); },
    send: async ({ ids, data }) => { await air({ t: 'send', ids: ids || [], data }); },
    disconnect: async ({ id }) => { await air({ t: 'drop', id }); },
    stop: async () => { await air({ t: 'stop' }); },
  };
  Capacitor.isNativePlatform = () => true;
  Capacitor.isPluginAvailable = n => n === 'BtRoom';
  Capacitor.Plugins.BtRoom = F;
  NEARROOM._p = null; NEARROOM.via = null;
};

const phones = []; const links = new Set();
const key = (a, b) => [a, b].sort().join('|');
const byAddr = a => phones.find(p => p.addr === a);
// events reach each page in the order they were sent, like one Bluetooth link
const deliver = (p, ev, o) => { p.q = p.q.then(() => p.evaluate(([ev, o]) => window.__btin(ev, o), [ev, o]).catch(() => {})); };
const linked = p => [...links].filter(k => k.split('|').includes(p.addr)).map(k => byAddr(k.split('|').find(x => x !== p.addr))).filter(Boolean);
function cut(a, b) { if (!links.delete(key(a.addr, b.addr))) return; deliver(a, 'disconnected', { id: b.addr }); deliver(b, 'disconnected', { id: a.addr }); }
function onAir(p, m) {
  if (m.t === 'adv') { p.adv = m.name; p.hidden = false; for (const q of phones) if (q !== p && q.searching) deliver(q, 'found', { id: p.addr, name: p.adv }); }
  else if (m.t === 'unadv') { p.adv = null; for (const q of phones) if (q !== p && q.searching) deliver(q, 'lost', { id: p.addr }); }
  else if (m.t === 'show') { p.hidden = false; deliver(p, 'visible', { on: true }); if (p.adv) for (const q of phones) if (q !== p && q.searching) deliver(q, 'found', { id: p.addr, name: p.adv }); }
  else if (m.t === 'disc') { p.searching = true; for (const q of phones) if (q !== p && q.adv && !q.hidden) deliver(p, 'found', { id: q.addr, name: q.adv }); }
  else if (m.t === 'undisc') p.searching = false;
  else if (m.t === 'conn') { const q = byAddr(m.to); p.searching = false;
    // a hidden room still takes a link to its address (connectable, only not findable), as on Android
    if (q && q.adv && !p.block) { links.add(key(p.addr, q.addr)); setTimeout(() => { deliver(p, 'connected', { id: q.addr }); deliver(q, 'connected', { id: p.addr }); }, 40); }
    else setTimeout(() => deliver(p, 'failed', { id: m.to, code: -1, msg: 'CONNECT_FAILED no room' }), 300); }
  else if (m.t === 'send') { const to = m.ids.length ? m.ids.map(byAddr).filter(Boolean) : linked(p);
    for (const q of to) if (links.has(key(p.addr, q.addr))) deliver(q, 'message', { id: p.addr, data: m.data }); }
  else if (m.t === 'drop') { const q = byAddr(m.id); if (q && links.delete(key(p.addr, q.addr))) deliver(q, 'disconnected', { id: p.addr }); }
  else if (m.t === 'stop') { p.adv = null; p.searching = false; for (const q of linked(p)) { links.delete(key(p.addr, q.addr)); deliver(q, 'disconnected', { id: p.addr }); } }
}

async function phone(b, name, i) {
  const p = await L.newPlayer(b, port, name, String.fromCharCode(65 + i));
  p.addr = 'AA:BB:CC:00:00:' + String(10 + i); p.q = Promise.resolve(); p.adv = null; p.searching = false; p.hidden = false;
  await p.exposeBinding('__air', (src, m) => onAir(p, m));
  await p.evaluate(`(${FAKE})()`); await p.evaluate(() => render());
  phones.push(p); return p;
}
const errs = p => p.evaluate(() => window.__errs.slice()).then(e => e.concat(p.pageErrors));
const wait = (p, fn, arg, ms = 15000) => p.waitForFunction(fn, arg, { timeout: ms });

(async () => {
  const srv = await L.startServer(port); const b = await L.newBrowser();
  try {
    const A = await phone(b, 'Ali', 0); const P = [A];
    // 1. open a room, the others find it and come in
    await A.click('[data-a="near"]'); await wait(A, () => S.mode === 'near');
    await A.click('[data-a="ncreate"]'); await wait(A, () => S.mode === 'online' && S.via === 'near' && NEARROOM.hosting);
    await A.evaluate(() => { S.modal = null; render(); });
    for (let i = 1; i < NP; i++) { const p = await phone(b, 'P' + i, i); P.push(p);
      await p.click('[data-a="near"]'); await wait(p, () => app.querySelector('.nroom'));
      await p.click('.nroom'); await wait(p, () => S.mode === 'online' && S.via === 'near' && !S.pending && S.me != null); }
    const n = await A.evaluate(() => players().length); if (n !== NP) fail('join', 'host sees', n, 'players of', NP); else console.log('ok join', NP, 'phones');
    if (await P[1].evaluate(() => NEARROOM.via) !== 'bt') fail('via', 'not the Bluetooth plugin');

    // 2. games to their end with bot moves
    for (const g of GAMES_) {
      await L.pickGame(A, g); await L.sleep(800);
      let moves = 0, idle = 0;
      for (let t = 0; t < 600 * NP && idle < 60; t++) {
        const win = await A.evaluate(() => !!(S.st.d && S.st.d.win != null)); if (win) break;
        // a phone that is not the room's cannot hand a whole move to the host in a secret game (net.js): it taps instead
        let moved = 0; for (const p of P) {
          const tap = p !== A && await p.evaluate(() => isSecretG(GAMES[S.st.g]));
          const r = tap ? (await L.canMove(p) === true ? await L.randomMove(p) : null) : await L.botMove(p).catch(e => 'ERR ' + e.message);
          if (r && !/^ERR/.test(r)) moved++; else if (r) fail(g, p.label, r); }
        moves += moved; idle = moved ? 0 : idle + 1; await L.sleep(moved ? 60 : 200);
      }
      const win = await A.evaluate(() => !!(S.st.d && S.st.d.win != null));
      const cv = await L.converge(P, 8000);
      if (!win) fail(g, 'no end after', moves, 'moves'); if (!cv.ok) fail(g, 'phones disagree', JSON.stringify(cv.st.map(x => [x.s, x.g, x.me])));
      if (win && cv.ok) console.log('ok', g, moves, 'moves');
    }

    // 3. a cut while the room cannot be found: back by its address
    const C = P[1]; A.hidden = true; deliver(A, 'visible', { on: false });
    cut(A, C);
    await wait(C, () => S.offline, null, 5000).catch(() => fail('cut', 'the phone did not notice the cut'));
    await wait(C, () => !S.offline && S.nr, null, 20000).then(() => console.log('ok back after a cut, room hidden')).catch(() => fail('cut', 'not back within 20 s'));
    await L.pickGame(A, GAMES_[0]); await L.sleep(1500);
    // the same step, game and host on every phone (a secret game shows each phone its own view, so not the whole state)
    let cv = { ok: false }; for (let t = 0; t < 80 && !cv.ok; t++) { const ss = await Promise.all(P.map(L.snap)); cv = { ok: ss.every(x => x.s === ss[0].s && x.g === ss[0].g && x.host === ss[0].host), st: ss }; if (!cv.ok) await L.sleep(100); }
    if (!cv.ok) { fail('cut', 'phones disagree after coming back', JSON.stringify(cv.st.map(x => [x.s, x.g, x.me, x.host]))); console.log(JSON.stringify(await C.evaluate(() => ({ nl: NLOG.slice(-25).map(e => [e[0] % 100000, e[1], e[2], e[3]]), log: NEARROOM.log.slice(-12) })))); }

    // 4. hidden room: the room's phone gets the button, a tap shows it again
    await A.evaluate(() => { S.modal = null; setGame(null); render(); }).catch(() => {});
    await L.sleep(300);
    const has = await A.evaluate(() => !!app.querySelector('[data-a="nshow"]'));
    if (!has) fail('show', 'no button while hidden'); else {
      if (SHOTS) await A.screenshot({ path: path.join(SHOTS, 'near-hidden.png') });
      await A.click('[data-a="nshow"]'); await L.sleep(400);
      if (await A.evaluate(() => !!app.querySelector('[data-a="nshow"]'))) fail('show', 'button still there after showing', JSON.stringify(await A.evaluate(() => ({ h: NEARROOM.hidden, host: NEARROOM.hosting, log: NEARROOM.log.slice(-4) })))); else console.log('ok show button');
    }
    const others = await P[1].evaluate(() => !!app.querySelector('[data-a="nshow"]')); if (others) fail('show', 'a player who is not the room phone sees the button');

    // 5. refusing to be seen: a clear line, no room
    const R = await phone(b, 'Refuse', 9); await R.evaluate(() => { window.__refuse = true; });
    await R.click('[data-a="near"]'); await wait(R, () => S.mode === 'near'); await R.click('[data-a="ncreate"]');
    await wait(R, () => !S.joining && S.roomErr, null, 8000).catch(() => {});
    const re = await R.evaluate(() => ({ err: S.roomErr, mode: S.mode, hosting: NEARROOM.hosting }));
    if (!re.err || !/يظهر/.test(re.err) || re.mode !== 'near' || re.hosting) fail('refuse', JSON.stringify(re)); else console.log('ok refused:', re.err);
    if (SHOTS) await R.screenshot({ path: path.join(SHOTS, 'near-refused.png') });

    for (const p of phones) { const e = await errs(p); if (e.length) fail('errors', p.label, e.slice(0, 3).join(' | ')); }
  } catch (e) { fail('crash', e.stack || e); }
  await b.close(); srv.kill();
  console.log(fails.length ? 'NEAR FAILURES ' + fails.length : 'NEAR OK');
  process.exit(fails.length ? 1 : 0);
})();

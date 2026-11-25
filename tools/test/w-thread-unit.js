#!/usr/bin/env node
'use strict';
/* «طرف الخيط» (w_thread) unit tests, no browser: the rules module public/js/games/w-thread-core.js on its own.
     1. the clue check, Arabic cases written from the rule (not from the code): «ال», prefixes, plurals, parts
     2. the deal and the maps, 1000 seeded rounds per mode: 9/8/7/1, duo's 15 words with 3 shared and 1/1/1 scorpions
     3. the moves: who may clue and guess, the guess limit, a wrong guess ends the turn, the scorpion, a win on the
        other team's turn, the coop rival, the duo turns
     4. the map never reaches a seat that may not see it (WT.mask)
     5. the guessing bot: hard against easy with the same clues (seeded), and it never stalls
   Usage: node tools/test/w-thread-unit.js [--games=200]      exit 1 on any failure */
const WT = require('../../public/js/games/w-thread-core.js');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const GAMES_N = +(args.games || 200);
let fails = 0, checks = 0;
const ok = (c, ...m) => { checks++; if (!c) { fails++; console.log('FAIL', ...m); } };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const wi = w => { const i = WT.W.indexOf(w); if (i < 0) throw new Error('not in the bank: ' + w); return i; };

/* ---------- 1. the clue check ---------- */
{ const board = ['بحر', 'شمس', 'موجة', 'قلم', 'كتاب', 'طريق', 'دب', 'عين'].map(wi);
  // rejected: the word, with «ال», with a prefix, a broken plural from the bank, a sound plural, a part of it, it inside the clue
  const no = ['بحر', 'البحر', 'وبحر', 'بالبحر', 'للبحر', 'فالبحر', 'بحار', 'أبحر', 'بحرين', 'شمسية', 'الشمس', 'شموس', 'موجات', 'موج', 'أمواج', 'أقلام', 'القلم', 'كتب', 'الكتب', 'كتابه',
    'بطريق', 'طرق', 'الطريق', 'دب', 'الدب', 'دببة', 'عيون', 'العين', 'بَحْر', 'إقلام'];
  for (const c of no) ok(WT.clueErr(c, board) !== '', 'should reject', c);
  // the shape: one word, Arabic letters, 2..15 letters, no numbers
  for (const c of ['بحر كبير', '٣', '3', 'sea', 'ب', '', '  ', 'بحر2', 'كلمةطويلةجدااااا']) ok(WT.clueErr(c, board) !== '', 'should reject the shape', JSON.stringify(c));
  // accepted: a related word that is not a form or part of a board word
  for (const c of ['موج'.replace('موج', 'سمك'), 'ماء', 'حرارة', 'مدرسة', 'سيارة', 'غابة', 'نهار', 'رصاص', 'دفتر', 'مكتب', 'أدب']) ok(WT.clueErr(c, board) === '', 'should accept', c, WT.clueErr(c, board));
  // «موج» is fine with «بحر» alone, and «بحر» is fine once «بحر» is uncovered
  ok(WT.clueErr('موج', [wi('بحر')]) === '', 'موج with بحر');
  ok(WT.clueErr('بحر', [wi('شمس')]) === '', 'بحر after بحر is covered');
  // two letters inside a longer word is allowed (the part rule starts at 3 letters)
  ok(WT.clueErr('أدب', [wi('دب')]) === '', 'أدب with دب (2-letter part)');
  ok(WT.clueErr('عينة', [wi('عين')]) !== '', 'عينة with عين (3-letter part)');
  // openWords: a covered word no longer counts
  const d = { md: 'vs', b: board, r: 'x' + '.'.repeat(24) };
  ok(WT.clueErr('بحر', WT.openWords(d)) === '', 'openWords drops the uncovered');
}

/* ---------- 2. the deal and the maps ---------- */
{ const used = new Set(); let repeat = 0, clash = 0;
  for (let k = 0; k < 1000; k++) { const r = rng(1000 + k);
    const key = WT.keyTeams(k % 2, r), cnt = c => [...key].filter(x => x === c).length;
    ok(key.length === 25 && cnt(String(k % 2)) === 9 && cnt(String(1 - k % 2)) === 8 && cnt('n') === 7 && cnt('x') === 1, 'team key counts', key);
    const [a, b] = WT.keyDuo(r); let g = 0, both = 0, xa = 0, xb = 0, xx = 0, xg = 0, xn = 0;
    for (let i = 0; i < 25; i++) { if (a[i] === 'g' || b[i] === 'g') g++; if (a[i] === 'g' && b[i] === 'g') both++; if (a[i] === 'x') { xa++; if (b[i] === 'x') xx++; if (b[i] === 'g') xg++; if (b[i] === 'n') xn++; } if (b[i] === 'x') xb++; }
    ok(g === 15 && both === 3 && xa === 3 && xb === 3 && xx === 1 && xg === 1 && xn === 1 && [...a].filter(x => x === 'g').length === 9 && [...b].filter(x => x === 'g').length === 9, 'duo key', a, b);
    if (k < 16) { const bd = WT.deal(used, r); ok(bd.length === 25 && new Set(bd).size === 25, 'deal 25 different'); if (k < 15 && bd.some(w => used.has(w) && false)) repeat++;
      for (let x = 0; x < 25; x++) for (let y = x + 1; y < 25; y++) if (WT.clueErr(WT.W[bd[x]], [bd[y]]) === 'board') clash++; } }
  // no word comes back within a session (16 boards of 25 from 400 before the bank runs low)
  { const u = new Set(), seen = new Set(); let rep = 0; for (let k = 0; k < 12; k++) { const bd = WT.deal(u, rng(7 + k)); for (const w of bd) { if (seen.has(w)) rep++; seen.add(w); } } ok(rep === 0, 'a word came back within the session', rep); }
  ok(clash === 0, 'two forms of one word on a board', clash);
}

/* ---------- helpers: a state like the engine makes ---------- */
const mk = (n, md, seed, extra) => { const pl = [...Array(n).keys()]; const d = { gid: 'g' + seed, st: 0, turn: 0, pl, out: '0'.repeat(n), win: null, ...(extra || {}) }; return WT.setup(d, { md, used: new Set(), rnd: rng(seed) }); };
const giveBest = (d, r) => { const c = WT.clueBot(d, r); const R = WT.giveClue(d, WT.giver(d), c.w, c.n); if (!R.d) throw new Error('clue bot gave a clue the check refuses: ' + c.w + ' ' + R.err); return R.d; };

/* ---------- 3. the moves ---------- */
{ let d = mk(4, 'vs', 3); const g = WT.giver(d), side = d.sd, other = WT.guessers(d, side)[0];
  ok(d.ph === 'clue' && d.turn === g && d.sx.filter(x => x === side).length === 2, 'vs start');
  ok(WT.giveClue(d, other, 'ماء', 1).err === 'turn', 'a guesser cannot clue');
  ok(WT.giveClue(d, g, WT.W[d.b[0]], 1).err === 'board', 'a board word is refused even from a changed phone');
  const R = WT.giveClue(d, g, 'شيء', 2); ok(R.d && R.d.ph === 'guess' && R.d.gl === 3, 'clue gives n+1 guesses'); d = R.d;
  ok(!WT.canGuess(d, g), 'the clue-giver cannot guess'); ok(WT.guess(d, 0, g) === d, 'a guess from the clue-giver is ignored');
  const foe = d.pl.map((_, s) => s).find(s => d.sx[s] !== side); ok(WT.guess(d, 0, foe) === d && WT.pick(d, foe, 0) === d, 'the other team cannot guess');
  const mine = [...Array(25).keys()].filter(i => d.k[0][i] === String(side)), by = [...Array(25).keys()].find(i => d.k[0][i] === 'n');
  let x = WT.pick(d, other, mine[0]); ok(x.pk === mine[0] && x.pb === other, 'first tap picks');
  x = WT.guess(x, mine[0], other); ok(x.r[mine[0]] === String(side) && x.ph === 'guess' && x.gl === 2 && x.lg[x.lg.length - 1].h === 1, 'right guess goes on');
  ok(WT.guess(x, mine[0], other) === x, 'an uncovered tile cannot be guessed again');
  const y = WT.guess(x, by, other); ok(y.ph === 'clue' && y.sd === 1 - side && y.r[by] === 'n', 'a «جار» ends the turn');
  x = WT.guess(x, mine[1], other); x = WT.guess(x, mine[2], other); ok(x.ph === 'clue' && x.sd === 1 - side, 'the n+1 limit ends the turn');
  // stop only after one guess
  let s0 = WT.giveClue(mk(4, 'vs', 4), WT.giver(mk(4, 'vs', 4)), 'شيء', 0).d; const gs = WT.guessers(s0, s0.sd)[0]; ok(s0.gl === -1, '0 means no limit'); ok(WT.stop(s0, gs) === s0, 'stop needs a guess first');
  // the scorpion loses at once (the other team wins)
  const sc = [...Array(25).keys()].find(i => s0.k[0][i] === 'x'), z = WT.guess(s0, sc, gs); ok(z.win != null && z.wins.every(s => z.sx[s] === 1 - s0.sd) && z.en === 'x', 'scorpion');
  // a win on the other team's turn: the playing team uncovers the last word of the other team
  let w = mk(4, 'vs', 5); const os = 1 - w.sd, oth = [...Array(25).keys()].filter(i => w.k[0][i] === String(os));
  w = { ...w, r: [...w.r].map((c, i) => oth.slice(1).includes(i) ? String(os) : c).join('') }; w = WT.giveClue(w, WT.giver(w), 'شيء', 3).d;
  const ww = WT.guess(w, oth[0], WT.guessers(w, w.sd)[0]); ok(ww.win != null && ww.wins.every(s => ww.sx[s] === os) && ww.en === 'all', 'win on the other team\'s turn');
  // coop: the rival uncovers one of its words after each turn, and the team loses when the rival has all 8
  let c = mk(3, 'coop', 6); ok(c.sx.every(x => x === 0) && c.cg[0] >= 0 && WT.guessers(c, 0).length === 2, 'coop seats');
  c = WT.giveClue(c, WT.giver(c), 'شيء', 1).d; const cb = [...Array(25).keys()].find(i => c.k[0][i] === 'n'); const c2 = WT.guess(c, cb, WT.guessers(c, 0)[0], rng(1));
  ok(c2.ph === 'clue' && [...c2.r].filter(x => x === '1').length === 1 && c2.rv >= 0, 'coop rival uncovers one');
  let cc = { ...c, r: [...c.r].map((ch, i) => c.k[0][i] === '1' && [...c.k[0]].slice(0, i).filter(q => q === '1').length < 7 ? '1' : ch).join('') };
  const c3 = WT.guess(cc, cb, WT.guessers(cc, 0)[0], rng(2)); ok(c3.win === 'd' && c3.en === 'rv', 'coop: rival with all 8 wins');
  // duo: a right guess goes on without a limit, a «جار» marks it for that side and passes the clue, 9 turns
  let u = mk(2, 'duo', 8); ok(u.tk === 9 && u.sd === 0 && WT.giver(u) === 0 && WT.guessers(u, 0)[0] === 1, 'duo start');
  u = WT.giveClue(u, 0, 'شيء', 1).d; ok(u.gl === -1, 'duo: no limit');
  const ug = [...Array(25).keys()].filter(i => u.k[0][i] === 'g'); let u2 = WT.guess(u, ug[0], 1); u2 = WT.guess(u2, ug[1], 1); u2 = WT.guess(u2, ug[2], 1);
  ok(u2.ph === 'guess' && [...u2.r].filter(q => q === 'g').length === 3, 'duo goes on while right');
  const un = [...Array(25).keys()].find(i => u.k[0][i] === 'n' && u.k[1][i] !== 'x'); const u3 = WT.guess(u2, un, 1);
  ok(u3.ph === 'clue' && u3.sd === 1 && u3.tk === 8 && u3.mk[un] === 'a', 'duo «جار» passes the clue');
  let ut = { ...u3, tk: 1 }; ut = WT.giveClue(ut, 1, 'شيء', 1).d; const un2 = [...Array(25).keys()].find(i => ut.k[1][i] === 'n' && WT.pickable(ut, i)); const u4 = WT.guess(ut, un2, 0);
  ok(u4.win === 'd' && u4.en === 'tk', 'duo out of turns');
  // a player leaves: a new clue-giver, a team with nobody loses
  let l = mk(4, 'vs', 9); const lg = WT.giver(l); let lo = { ...l, out: [...l.out].map((q, s) => s === lg ? '1' : q).join('') }; lo = WT.onLeave(lo);
  ok(lo.cg[l.sd] !== lg && lo.win == null && lo.turn === lo.cg[l.sd], 'clue-giver left');
  const team = l.pl.map((_, s) => s).filter(s => l.sx[s] === l.sd); let lt = { ...l, out: [...l.out].map((q, s) => team.includes(s) ? '1' : q).join('') }; lt = WT.onLeave(lt);
  ok(lt.win != null && lt.wins.every(s => lt.sx[s] !== l.sd), 'a team with nobody left loses');
}

/* ---------- 4. the map never reaches the guessers ---------- */
{ for (const [n, md] of [[4, 'vs'], [6, 'vs'], [8, 'vs'], [3, 'coop'], [2, 'duo']]) { const d = mk(n, md, 11 + n);
    for (let s = -1; s < n; s++) { const v = WT.mask(d, s), J = JSON.stringify(v.k);
      if (md === 'duo') ok(s >= 0 ? v.k[s] === d.k[s] && /^\?+$/.test(v.k[1 - s]) : v.k.every(k => /^\?+$/.test(k)), 'duo mask', s);
      else if (s >= 0 && d.cg.includes(s)) ok(v.k[0] === d.k[0], 'clue-giver sees the map', md, s);
      else ok(/^\["\?+"\]$/.test(J), 'guesser sees no map', md, s, J); }
    const end = { ...d, win: 'd' }; ok(WT.mask(end, -1).k[0] === d.k[0], 'the end shows the map'); } }

/* ---------- 5. the guessing bot ---------- */
function playCoop(lv, seed) { const r = rng(seed); let d = mk(3, 'coop', seed); let steps = 0, clues = 0;
  while (d.win == null && steps < 400) { steps++;
    if (d.ph === 'clue') { d = giveBest(d, r); clues++; continue; }
    const s = WT.guessers(d, d.sd)[0], ch = WT.botChoose(WT.mask(d, s), lv, r);
    const nd = ch.stop ? WT.stop(d, s, r) : WT.guess(d, ch.i, s, r); if (nd === d) return { stuck: true }; d = nd; }
  return { win: typeof d.win === 'number', found: WT.foundOf(d, 0), clues, en: d.en, stuck: d.win == null }; }
function playVs(lvA, lvB, seed) { const r = rng(seed); let d = mk(4, 'vs', seed, { st: seed % 2 }); const lvOf = side => side === 0 ? lvA : lvB; let steps = 0;
  while (d.win == null && steps < 600) { steps++;
    if (d.ph === 'clue') { d = giveBest(d, r); continue; }
    const s = WT.guessers(d, d.sd)[0], ch = WT.botChoose(WT.mask(d, s), lvOf(d.sd), r);
    const nd = ch.stop ? WT.stop(d, s, r) : WT.guess(d, ch.i, s, r); if (nd === d) return { stuck: true }; d = nd; }
  return { side: d.win == null ? -1 : d.sx[d.win], en: d.en, stuck: d.win == null }; }
const res = {};
for (const lv of [1, 2, 3]) { let w = 0, f = 0, st = 0, x = 0; for (let k = 0; k < GAMES_N; k++) { const g = playCoop(lv, 5000 + k); if (g.stuck) st++; if (g.win) w++; f += g.found || 0; if (g.en === 'x') x++; }
  res['coop lv' + lv] = { wins: w, games: GAMES_N, winRate: +(w / GAMES_N).toFixed(3), avgFound: +(f / GAMES_N).toFixed(2), scorpion: x, stuck: st }; ok(st === 0, 'coop bot stalled', lv, st); }
{ let hard = 0, easy = 0, st = 0; for (let k = 0; k < GAMES_N; k++) { const swap = k % 2; const g = playVs(swap ? 1 : 3, swap ? 3 : 1, 9000 + k); if (g.stuck) st++; else if (g.side === (swap ? 1 : 0)) hard++; else easy++; }
  res['vs hard vs easy'] = { hard, easy, games: GAMES_N, stuck: st }; ok(st === 0, 'vs bot stalled', st); ok(hard > easy * 1.5, 'hard does not beat easy clearly', hard, easy); }
ok(res['coop lv3'].winRate > res['coop lv1'].winRate, 'hard coop not better than easy');
// an unknown clue: the bot still guesses one tile and never stalls
{ let d = mk(4, 'vs', 77); d = WT.giveClue(d, WT.giver(d), 'زقزقة', 2).d; const s = WT.guessers(d, d.sd)[0];
  for (const lv of [1, 2, 3]) { const ch = WT.botChoose(WT.mask(d, s), lv, rng(lv)); ok(Number.isInteger(ch.i) && WT.pickable(d, ch.i), 'unknown clue: bot guesses', lv); } }
console.log(JSON.stringify(res, null, 1));
console.log(fails ? `W-THREAD UNIT FAILURES ${fails} of ${checks}` : `W-THREAD UNIT OK (${checks} checks)`);
process.exit(fails ? 1 : 0);

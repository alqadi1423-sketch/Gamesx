// node tools/test/q-cell-unit.js : «تحدي الخلية» rules with no browser (q-cell-core.js, q-cell-data.js). Ends with QCELL OK.
'use strict';
global.QC_BANK = require('../../public/js/games/q-cell-data.js');
const QC = require('../../public/js/games/q-cell-core.js');
let fails = 0; const ok = (c, ...m) => { if (!c) { fails++; console.log('FAIL', ...m); } };
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const eng = n => ({ pl: [...Array(n).keys()], out: '0'.repeat(n), st: 0, gid: 1, turn: 0, win: null });

// 1. the bank: every letter has questions, every choice starts with its letter, one right choice, no answer twice
const B = QC.bank(); const per = {}; const seen = new Map();
const fl = s => { const f = QC.first(s); return 'أإآ'.includes(f) ? 'ا' : f; };
for (const [k, q] of B.entries()) { per[q.L] = (per[q.L] || 0) + 1;
  for (const o of [q.a, ...q.w]) ok(fl(o) === q.L, 'bank', k, o, 'does not start with', q.L);
  ok(new Set([q.a, ...q.w].map(QC.key)).size === 4, 'bank', k, 'choices repeat');
  ok(q.t.endsWith('؟'), 'bank', k, 'question mark'); ok(QC.typedOk(q.a, q.a, q.v, q.w), 'bank', k, 'answer fails itself');
  for (const w of q.w) ok(!QC.typedOk(w, q.a, q.v, q.w), 'bank', k, 'wrong choice passes', w);
  const ak = QC.key(q.a); ok(!seen.has(ak), 'bank', k, 'answer twice', q.a, seen.get(ak)); seen.set(ak, k); }
for (const L of QC.LETTERS) ok((per[L] || 0) >= 10, 'letter', L, 'has', per[L] || 0, 'questions');
console.log('bank', B.length, 'questions,', Object.keys(per).length, 'letters');

// 2. typed answers
ok(QC.typedOk('الرياض', 'الرياض', []), 'typed exact'); ok(QC.typedOk('رياض', 'الرياض', []), 'typed without ال');
ok(QC.typedOk('الرّياض', 'الرياض', []), 'typed with tashkeel'); ok(QC.typedOk('مكه', 'مكة', []), 'typed ه for ة');
ok(QC.typedOk('اسطنبول', 'إسطنبول', []), 'typed hamza'); ok(QC.typedOk('اسطمبول', 'إسطنبول', []), 'one slip in 5+ letters');
ok(!QC.typedOk('طريف', 'الطائف', [], ['طريف']), 'a wrong choice never passes'); ok(!QC.typedOk('', 'الرياض', []), 'empty');
ok(!QC.typedOk('جده', 'جدة', [], ['جازان']) === false, 'جده is جدة'); ok(!QC.typedOk('بيت', 'بنت', []), 'no slip in 3 letters');

// 3. the hex rule: a full board has exactly one joined side
for (const n of [4, 5]) for (let t = 0; t < 3000; t++) { let o = ''; for (let i = 0; i < n * n; i++) o += rnd() < .5 ? '0' : '1';
  const a = !!QC.path(o, n, 0), b = !!QC.path(o, n, 1); if (a === b) { ok(false, 'hex rule', n, o); break; } }
ok(QC.need('.'.repeat(25), 5, 0) === 5 && QC.need('.'.repeat(25), 5, 1) === 5, 'need on an empty board');

// 4. a buzz round, step by step
const T0 = 1e6; let d = QC.setup(eng(4), { md: 'buzz', rnd });
ok(d.ph === 'set' && d.sx.join('') === '0101', 'setup sides', d.sx);
d = QC.setOpt(d, 'n', 4); d = QC.setOpt(d, 'am', 'opt'); ok(d.n === 4, 'board 4'); ok(QC.setOpt(d, 'gm', 'host') === d, 'online has no presenter');
d = QC.begin(d, rnd); ok(d.ph === 'pick' && d.L.length === 16 && new Set(d.L).size === 16, 'board letters');
const pick = d.sd; const other = 1 - pick; const pSeat = d.sx.indexOf(pick), oSeat = d.sx.indexOf(other);
ok(QC.choose(d, oSeat, 0, rnd, T0) === d, 'the other side cannot pick');
d = QC.choose(d, pSeat, 5, rnd, T0); ok(d.ph === 'q' && d.q.c === 5 && d.q.o.length === 4 && d.q.o[d.q.A] === d.q.a, 'question open');
ok(fl(d.q.a) === d.L[5], 'question for the cell letter');
const m = QC.mask(d); ok(m.q.A === -1 && m.q.a === '' && m.q.k === -1 && m.q.v.length === 0, 'mask hides the answer');
ok(m.q.o.length === 4 && m.q.t === d.q.t, 'mask keeps the question and choices');
d = QC.buzz(d, oSeat, T0 + 100); ok(d.ph === 'ans' && d.q.by === oSeat && d.q.at === other, 'buzz');
ok(QC.buzz(d, pSeat, T0 + 120) === d, 'second buzz does nothing');
ok(QC.answer(d, pSeat, d.q.A, rnd, T0 + 200) === d, 'only the buzzer answers');
const wrong = [0, 1, 2, 3].find(j => j !== d.q.A);
d = QC.answer(d, oSeat, wrong, rnd, T0 + 300); ok(d.ph === 'ans' && d.q.at === pick && d.q.by === -1 && d.q.x.includes(wrong), 'steal to the other side');
ok(QC.answer(d, pSeat, wrong, rnd, T0 + 350) === d, 'a crossed choice cannot be tapped');
const A = d.q.A; d = QC.answer(d, pSeat, A, rnd, T0 + 400); ok(d.o[5] === String(pick) && d.ph === 'pick' && d.sd === pick, 'steal wins the cell, winner picks', d.o, d.sd);
ok(d.lg && d.lg.w === pick && d.lg.a, 'last question shown');
// nobody presses: the clock
d = QC.choose(d, pSeat, 6, rnd, T0 + 1000); d = QC.tick(d, rnd, T0 + 1000 + QC.T.buzz + 1); ok(d.ph === 'pick' && d.o[6] === '.' && d.lg.how === 'time', 'buzz clock');
ok(d.sd === 1 - pick, 'nobody won: the other side picks');
// a typed answer
let ty = QC.setOpt(QC.setup(eng(2), { md: 'buzz', rnd }), 'am', 'type'); ty = QC.begin(ty, rnd);
ty = QC.choose(ty, ty.sx.indexOf(ty.sd), 0, rnd, T0); ty = QC.buzz(ty, 0, T0); const tyAns = ty.q.a;
ty = QC.answer(ty, 0, tyAns.replace(/^ال/, ''), rnd, T0 + 10); ok(ty.o[0] === String(ty.sx[0]), 'typed right answer takes the cell');

// 5. turn mode: picking goes side by side; host mode: the presenter judges
let tu = QC.begin(QC.setup(eng(2), { md: 'turn', rnd }), rnd); const s0 = tu.sd;
tu = QC.choose(tu, tu.turn, 0, rnd, T0); ok(tu.ph === 'ans' && tu.q.at === s0 && tu.turn === tu.sx.indexOf(s0), 'turn: the picking side answers');
tu = QC.answer(tu, tu.turn, tu.q.A, rnd, T0 + 1); ok(tu.o[0] === String(s0) && tu.sd === 1 - s0, 'turn: the other side picks next even after a right answer');
let ho = QC.setOpt(QC.setup(eng(4), { md: 'turn', rnd }), 'gm', 'host'); ok(ho.gm === 'host', 'local presenter'); ho = QC.begin(ho, rnd);
ho = QC.choose(ho, -1, 3, rnd, T0); ok(ho.ph === 'ans' && !ho.q.dl, 'host: no clock');
const k1 = ho.q.k; ho = QC.another(ho, rnd, T0); ok(ho.q.c === 3 && ho.uk.length === 2, 'host: another question', k1, ho.q.k);
ho = QC.judge(ho, 1, rnd, T0); ok(ho.o[3] === '1' && ho.sd === 1, 'host: judged to side 1, it picks');
let hb = QC.setOpt(QC.setup(eng(2), { md: 'turn', bots: { 1: true }, rnd }), 'gm', 'host'); ok(hb.gm === 'turn', 'no presenter against bots');

// 6. rounds and the match: a side that joins its edges takes the round, two rounds the match
let r = QC.begin(QC.setup(eng(2), { md: 'host', rnd }), rnd); r = { ...r, gm: 'host' };
const fill = (d, side) => { const n = d.n; for (let y = 0; y < n; y++) { const c = side === 0 ? y * n : y; if (d.o[c] !== '.') continue; d = QC.choose({ ...d, sd: side }, -1, c, rnd, T0); d = QC.judge(d, side, rnd, T0); if (d.ph !== 'pick') break; } return d; };
r = fill(r, 0); ok(r.ph === 'rend' && r.rw[0] === 1 && r.hl && r.hl.length >= r.n, 'round to side 0', r.ph, r.rw);
r = QC.tick(r, rnd, T0 + QC.T.rend + 1); ok(r.ph === 'pick' && r.rn === 2 && r.sd === 1 && r.o === '.'.repeat(25), 'next round, the loser picks');
r = fill(r, 0); ok(r.win != null && r.wins.every(s => r.sx[s] === 0) && r.rw[0] === 2, 'match to side 0');

// 7. a player leaves
let lv = QC.begin(QC.setup(eng(2), { md: 'buzz', rnd }), rnd); lv = QC.onLeave({ ...lv, out: '10' }); ok(lv.win === 1 && lv.en === 'lf', 'side with nobody left loses');
let lv4 = QC.begin(QC.setup(eng(4), { md: 'buzz', rnd }), rnd); lv4 = QC.onLeave({ ...lv4, out: '1000' }); ok(lv4.win == null && lv4.turn !== 0, 'turn moves off a gone seat');

// 8. bots: whole matches end, and the hard bot beats the easy one
function botMatch(l0, l1, n) { let d = QC.begin(QC.setOpt(QC.setup(eng(2), { md: 'turn', bots: { 0: true, 1: true }, rnd }), 'n', n), rnd); let t = T0;
  for (let k = 0; k < 2000 && d.win == null; k++) { t += 3000; const s = d.turn, lv = d.sx[s] === 0 ? l0 : l1;
    if (d.ph === 'pick') d = QC.choose(d, s, QC.botCell(d, d.sd, lv, rnd), rnd, t);
    else if (d.ph === 'ans') d = QC.answer(d, s, QC.botAnswer(d, lv, rnd), rnd, t);
    else if (d.ph === 'rend') d = QC.next(d, rnd); }
  return d.win == null ? -1 : d.sx[d.win]; }
let w3 = 0, end = 0; const N = 300; for (let g = 0; g < N; g++) { const a = g % 2, w = botMatch(a ? 1 : 3, a ? 3 : 1, g % 3 ? 5 : 4); if (w >= 0) end++; if (w === (a ? 1 : 0)) w3++; }
ok(end === N, 'every bot match ends', end); ok(w3 / N >= .75, 'hard bot beats easy', w3 / N); console.log('hard vs easy', (w3 / N).toFixed(2));
let w2 = 0; for (let g = 0; g < N; g++) { const a = g % 2, w = botMatch(a ? 2 : 3, a ? 3 : 2, 5); if (w === (a ? 1 : 0)) w2++; } ok(w2 / N >= .55, 'hard bot beats medium', w2 / N); console.log('hard vs medium', (w2 / N).toFixed(2));

console.log(fails ? 'QCELL FAILURES ' + fails : 'QCELL OK'); process.exit(fails ? 1 : 0);

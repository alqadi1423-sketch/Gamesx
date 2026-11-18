#!/usr/bin/env node
// Proves check-games.js: each rule is broken on purpose in a scratch clone, the guard must fail, and pass again after.
//   node tools/guards/selftest-games.js [--repeat=N]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const N = +((process.argv.find(a => a.startsWith('--repeat=')) || '=1').split('=')[1]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guards-g-'));
execFileSync('git', ['clone', '-q', '--shared', ROOT, tmp]);
fs.mkdirSync(path.join(tmp, 'tools', 'guards'), { recursive: true });
for (const f of ['check-games.js', 'load.js']) fs.copyFileSync(path.join(__dirname, f), path.join(tmp, 'tools', 'guards', f));
const run = () => { try { execFileSync(process.execPath, ['tools/guards/check-games.js'], { cwd: tmp, stdio: 'pipe' }); return 0; } catch (e) { return e.status || 1; } };
const edit = (f, fn) => { const p = path.join(tmp, f); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
const reset = () => execFileSync('git', ['checkout', '-q', '--', '.'], { cwd: tmp });
const cases = [
  ['no rules in HELP', () => edit('public/js/games/classic.js', s => s + '\nHELP.ttt="";\n')],
  ['no game log', () => fs.renameSync(path.join(tmp, 'docs/games/ttt.md'), path.join(tmp, 'docs/games/ttt.bak'))],
  ['minP above 8', () => edit('public/js/games/classic.js', s => s + '\nGAMES.ttt.minP=9;\n')],
  ['maxP above 8', () => edit('public/js/games/classic.js', s => s + '\nGAMES.ttt.maxP=12;\n')],
  ['secret without a hook', () => edit('public/js/games/classic.js', s => s + '\nGAMES.ttt.viewer=()=>0;\n')],
  ['core.js names a game', () => edit('public/js/core.js', s => s + '\nconst ZZ_GUARD_TEST="uno";\n')] ];
let fail = 0;
for (let r = 0; r < N; r++) for (const [name, brk] of cases) {
  reset(); const a = run(); brk(); const b = run(); reset();
  if (fs.existsSync(path.join(tmp, 'docs/games/ttt.bak'))) fs.renameSync(path.join(tmp, 'docs/games/ttt.bak'), path.join(tmp, 'docs/games/ttt.md'));
  const c = run(), ok = a === 0 && b !== 0 && c === 0; if (!ok) fail++;
  if (r === 0 || !ok) console.log(`${ok ? '✓' : '✗'} ${name}: clean=${a} broken=${b} restored=${c}`); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} case(s) failed` : `all ${cases.length} cases x ${N} passed`); process.exit(fail ? 1 : 0);

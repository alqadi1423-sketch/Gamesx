#!/usr/bin/env node
// Proves check-ui.js: each rule broken on purpose in a scratch clone must fail, and pass again after.
//   node tools/guards/selftest-ui.js [--repeat=N]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), N = +((process.argv.find(a => a.startsWith('--repeat=')) || '=1').split('=')[1]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guards-ui-')); execFileSync('git', ['clone', '-q', '--shared', ROOT, tmp]);
const run = () => { try { execFileSync(process.execPath, ['tools/guards/check-ui.js'], { cwd: tmp, stdio: 'pipe' }); return 0; } catch (e) { return e.status || 1; } };
const add = (f, s) => fs.appendFileSync(path.join(tmp, f), s);
const reset = () => execFileSync('git', ['checkout', '-q', '--', '.'], { cwd: tmp });
const cases = [
  ['new innerHTML sink', () => add('public/js/core.js', '\nfunction zzGuard(el,x){el.innerHTML=x;}\n')],
  ['new insertAdjacentHTML', () => add('public/js/net.js', '\nfunction zzGuard2(el,x){el.insertAdjacentHTML("beforeend",x);}\n')],
  ['player name without escH', () => add('public/js/core.js', '\nconst zzGuard3=()=>`<b>${S.myName}</b>`;\n')],
  ['chat text without escH', () => add('public/js/core.js', '\nconst zzGuard4=m=>`<p>${m.x}</p>`;\n')],
  ['new margin-left', () => add('public/css/style.css', '\n.zz-guard{margin-left:4px}\n')],
  ['new right:', () => add('public/css/n-hide.css', '\n.zz-guard{position:absolute;right:0}\n')] ];
let fail = 0;
for (let r = 0; r < N; r++) for (const [name, brk] of cases) { reset(); const a = run(); brk(); const b = run(); reset(); const c = run();
  const ok = a === 0 && b !== 0 && c === 0; if (!ok) fail++; if (r === 0 || !ok) console.log(`${ok ? '✓' : '✗'} ${name}: clean=${a} broken=${b} restored=${c}`); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} case(s) failed` : `all ${cases.length} cases x ${N} passed`); process.exit(fail ? 1 : 0);

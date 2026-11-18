#!/usr/bin/env node
// Proves check-app.js: each rule broken on purpose in a scratch clone must fail, and pass again after.
//   node tools/guards/selftest-app.js [--repeat=N]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), N = +((process.argv.find(a => a.startsWith('--repeat=')) || '=1').split('=')[1]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guards-app-')); execFileSync('git', ['clone', '-q', '--shared', ROOT, tmp]);
const run = () => { try { execFileSync(process.execPath, ['tools/guards/check-app.js'], { cwd: tmp, stdio: 'pipe' }); return 0; } catch (e) { return e.status || 1; } };
const edit = (f, fn) => { const p = path.join(tmp, f); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
const reset = () => { execFileSync('git', ['checkout', '-q', '--', '.'], { cwd: tmp }); execFileSync('git', ['clean', '-qfd'], { cwd: tmp }); };
const MF = 'app/android/app/src/main/AndroidManifest.xml';
const cases = [
  ['new permission', () => edit(MF, s => s.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.READ_CONTACTS" />'))],
  ['package without a lock file', () => { fs.mkdirSync(path.join(tmp, 'tools/zz'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'tools/zz/package.json'), '{"name":"zz"}'); }],
  ['package with a disallowed license', () => edit('app/package-lock.json', s => s.replace('"license": "MIT"', '"license": "GPL-3.0"'))] ];
let fail = 0;
for (let r = 0; r < N; r++) for (const [name, brk] of cases) { reset(); const a = run(); brk(); const b = run(); reset(); const c = run();
  const ok = a === 0 && b !== 0 && c === 0; if (!ok) fail++; if (r === 0 || !ok) console.log(`${ok ? '✓' : '✗'} ${name}: clean=${a} broken=${b} restored=${c}`); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} case(s) failed` : `all ${cases.length} cases x ${N} passed`); process.exit(fail ? 1 : 0);

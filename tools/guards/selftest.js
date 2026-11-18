#!/usr/bin/env node
// Proves every guard in check-repo.js by breaking the rule on purpose in a scratch clone: the guard must fail on the
// broken copy and pass again once the break is undone.   node tools/guards/selftest.js [--repeat=N]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const N = +((process.argv.find(a => a.startsWith('--repeat=')) || '=1').split('=')[1]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guards-'));
const sh = (cmd, a, cwd = tmp) => execFileSync(cmd, a, { cwd, encoding: 'utf8', stdio: 'pipe' });
sh('git', ['clone', '-q', '--shared', ROOT, tmp], ROOT);
sh('git', ['config', 'user.email', 'guards@example.invalid']); sh('git', ['config', 'user.name', 'guards']);
const run = (only, base) => { try { sh(process.execPath, ['tools/guards/check-repo.js', `--only=${only}`, ...(base ? [`--base=${base}`] : [])]); return 0; } catch (e) { return e.status || 1; } };
const edit = (f, fn) => { const p = path.join(tmp, f), s = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, fn(s)); };
const reset = () => { sh('git', ['reset', '-q', '--hard', 'origin/HEAD']); sh('git', ['clean', '-qfd']); };
const commit = msg => { sh('git', ['add', '-A']); sh('git', ['commit', '-q', '-m', msg]); };
const K = 'gh' + 'p_' + 'x'.repeat(36); // built at run time so this file never holds a token-shaped string
const cases = [
  ['syntax', () => fs.writeFileSync(path.join(tmp, 'public/js/zz-broken.js'), 'let = ;')],
  ['docs', () => edit('docs/games.md', s => s + '\nhand edit\n')],
  ['css', () => fs.appendFileSync(path.join(tmp, 'public/css/n-hide.css'), '\n.card{width:100%}\n')],
  ['perfLast', () => edit('public/index.html', s => s.replace(/(<link[^>]+perf\.css[^>]*>)/, '$1\n<link rel="stylesheet" href="css/zz.css">'))],
  ['inline', () => edit('public/js/core.js', s => s + '\neval("1");\n')],
  ['inline', () => edit('public/index.html', s => s.replace('</body>', '<script>alert(1)</script></body>'))],
  ['csp', () => edit('public/_headers', s => s.replace("script-src 'self'", "script-src 'self' https://cdn.example.com"))],
  ['csp', () => edit('public/_headers', s => s.replace('https://fonts.gstatic.com', 'https://fonts.gstatic.com https://evil.example'))],
  ['version', () => { edit('public/css/perf.css', s => s + '\n'); commit('chore(test): touch public'); }, 'origin/HEAD'],
  ['migrations', () => { edit('wrangler.jsonc', s => s.replace('"tag": "v1"', '"tag": "v1b"')); commit('chore(test): edit migration'); }, 'origin/HEAD'],
  ['secrets', () => fs.writeFileSync(path.join(tmp, 'tools/leak.txt'), K)],
  ['secrets', () => fs.writeFileSync(path.join(tmp, 'app/release.p12'), 'x')],
  ['commits', () => { fs.writeFileSync(path.join(tmp, 'x.txt'), '1'); commit('Fixed stuff'); }, 'origin/HEAD'],
  ['commits', () => { fs.writeFileSync(path.join(tmp, 'x.txt'), '2'); commit('fix(core): ' + 'a'.repeat(70)); }, 'origin/HEAD'] ];
let fail = 0;
for (let r = 0; r < N; r++) for (const [only, brk, base] of cases) {
  reset(); const ok0 = run(only, base); brk(); const broken = run(only, base); reset(); const ok1 = run(only, base);
  const pass = ok0 === 0 && broken !== 0 && ok1 === 0; if (!pass) fail++;
  if (r === 0 || !pass) console.log(`${pass ? '✓' : '✗'} ${only}: clean=${ok0} broken=${broken} restored=${ok1}`); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} case(s) failed` : `all ${cases.length} cases x ${N} passed`); process.exit(fail ? 1 : 0);

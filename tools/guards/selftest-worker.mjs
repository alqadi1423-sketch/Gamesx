// Proves test-worker.mjs: each server rule is broken on purpose in a copy of worker/index.js; the tests must fail on
// the broken copy and pass on the real one.   node tools/guards/selftest-worker.mjs [--repeat=N]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const N = +((process.argv.find(a => a.startsWith('--repeat=')) || '=1').split('=')[1]);
const src = fs.readFileSync(path.join(ROOT, 'worker/index.js'), 'utf8'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wks-'));
const run = file => { try { execFileSync(process.execPath, [path.join(HERE, 'test-worker.mjs')], { cwd: ROOT, stdio: 'pipe', env: { ...process.env, WORKER: path.relative(ROOT, file) } }); return 0; } catch (e) { return e.status || 1; } };
const cases = [
  ['rooms share one object', s => s.replace('idFromName(m[1])', "idFromName('g-same')")],
  ['size limit raised', s => s.replace('const MAX_MSG = 32768', 'const MAX_MSG = 999999')],
  ['rate limit removed', s => s.replace('const RATE_MAX = 120', 'const RATE_MAX = 1e9')],
  ['unopened code accepted', s => s.replace("if (!await this.isOpen()) return this.refuse('noroom', 4004);", '')],
  ['message logged', s => s.replace('let m; try { m = JSON.parse(msg); }', 'console.log(msg); let m; try { m = JSON.parse(msg); }')],
  ['guess limit removed', s => s.replace('const FAIL_MAX = 20', 'const FAIL_MAX = 1e9')],
  ['counter kept per room, not shared', s => s.replace("env.ROOMS.idFromName(GATE)", "env.ROOMS.idFromName(m[1])")],
  ['limit also blocks open rooms for everyone', s => s.replace("return new Response(JSON.stringify({ blocked: !!e && e.n >= FAIL_MAX })", "return new Response(JSON.stringify({ blocked: f.size > 0 && [...f.values()].some(v => v.n >= FAIL_MAX) })")],
  ['address stored', s => s.replace("if (!e) f.set(ip, e = { t0: now, n: 0 }); e.n++;", "if (!e) f.set(ip, e = { t0: now, n: 0 }); e.n++; this.ctx.storage.put('ip-' + ip, e);")],
  ['no-flag request accepted', s => s.replace("    else return this.refuse('noroom', 4004);", "    else if (!await this.isOpen()) await this.ctx.storage.put('open', { at: Date.now() });")],
  ['malformed path accepted', s => s.replace('/^\\/ws\\/(g-[a-z0-9]{4,6})$/', '/^\\/ws\\/(.+)$/')] ];
let fail = 0;
for (let r = 0; r < N; r++) for (const [name, brk] of cases) {
  const broken = brk(src); if (broken === src) { console.log(`✗ ${name}: the break did not apply`); fail++; continue; }
  const f = path.join(ROOT, 'worker', `.guard-${process.pid}.js`); fs.writeFileSync(f, broken);
  const b = run(f); fs.rmSync(f); const ok0 = run(path.join(ROOT, 'worker/index.js')); const ok = b !== 0 && ok0 === 0; if (!ok) fail++;
  if (r === 0 || !ok) console.log(`${ok ? '✓' : '✗'} ${name}: broken=${b} real=${ok0}`); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} case(s) failed` : `all ${cases.length} cases x ${N} passed`); process.exit(fail ? 1 : 0);

#!/usr/bin/env node
// Runs a test command N times in a row; one failure means the test is flaky (docs/rules.md: a new or changed test runs
// 50 times before it is merged, 100 times when it fixes a flaky one).
//   node tools/guards/repeat.js --n=50 -- <command> [args...]
'use strict';
const { spawnSync } = require('child_process');
const i = process.argv.indexOf('--'); const opts = process.argv.slice(2, i < 0 ? undefined : i), cmd = i < 0 ? [] : process.argv.slice(i + 1);
const N = +((opts.find(o => o.startsWith('--n=')) || '--n=50').slice(4));
if (!cmd.length) { console.log('usage: repeat.js --n=50 -- <command> [args]'); process.exit(2); }
const t0 = Date.now();
for (let k = 1; k <= N; k++) { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: k === 1 ? 'inherit' : 'pipe', encoding: 'utf8' });
  if (r.status !== 0) { console.log(`✗ run ${k}/${N} failed (exit ${r.status}): ${cmd.join(' ')}`); if (k > 1) console.log(String(r.stdout || '').slice(-2000) + String(r.stderr || '').slice(-2000)); process.exit(1); } }
console.log(`✓ ${N}/${N} runs passed in ${Math.round((Date.now() - t0) / 1000)} s: ${cmd.join(' ')}`);

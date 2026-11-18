#!/usr/bin/env node
// App and library guards for docs/rules.md.
//  1. the Android app asks only for the permissions listed here (nearby play needs them); a new one fails
//  2. every package.json under app/ and tools/ has its lock file committed
//  3. every package in those lock files carries a license from the allowed list (commercial use, no duty to publish our code)
//   node tools/guards/check-app.js       (vulnerabilities: npm audit, run by the workflow when packages change and monthly)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), out = [];
const PERMS = new Set(['INTERNET', 'VIBRATE', 'ACCESS_WIFI_STATE', 'CHANGE_WIFI_STATE', 'ACCESS_NETWORK_STATE', 'CHANGE_NETWORK_STATE',
  'BLUETOOTH', 'BLUETOOTH_ADMIN', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'BLUETOOTH_SCAN', 'BLUETOOTH_ADVERTISE',
  'BLUETOOTH_CONNECT', 'NEARBY_WIFI_DEVICES'].map(p => 'android.permission.' + p));
const LICENSES = new Set(['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'Unlicense', 'CC0-1.0', 'Python-2.0', 'Zlib']);
const MANIFEST = 'app/android/app/src/main/AndroidManifest.xml';
const m = fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
for (const x of m.matchAll(/<uses-permission(?:-sdk-\d+)?\s[^>]*android:name="([^"]+)"/g)) if (!PERMS.has(x[1])) out.push(`${MANIFEST}: permission not on the allowed list: ${x[1]}`);
const pkgs = []; const walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === 'android' || e.name.startsWith('.')) continue;
  const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'package.json') pkgs.push(d); } };
walk('app'); walk('tools');
for (const d of pkgs) { const lock = path.join(ROOT, d, 'package-lock.json'); if (!fs.existsSync(lock)) { out.push(`${d}/package.json has no package-lock.json`); continue; }
  const L = JSON.parse(fs.readFileSync(lock, 'utf8')).packages || {};
  for (const [k, v] of Object.entries(L)) { if (!k) continue; const lic = String(v.license || ''); const ok = lic.replace(/[()]/g, '').split(/\s+OR\s+/).some(x => LICENSES.has(x.trim()));
    if (!ok) out.push(`${d}/package-lock.json: ${k.replace(/^.*node_modules\//, '')} has license "${lic || 'none'}"`); } }
if (out.length) { console.log(`✗ app: ${out.length}`); for (const x of out) console.log('    ' + x); process.exit(1); }
console.log(`✓ app: permissions on the list, ${pkgs.length} package file(s) locked, every license allowed`);

#!/usr/bin/env node
// Interface guards for docs/rules.md.
//  1. HTML sinks: every place that writes HTML straight into the page (innerHTML / outerHTML / insertAdjacentHTML /
//     document.write) is listed in tools/guards/baseline/ui-sinks.json; a new one fails until it is reviewed and added.
//     And a player's own text (names, chat, answers) is never put into HTML without escH().
//  2. Physical directions in CSS (left/right) where inline-start/inline-end works: the count per file may not grow
//     (tools/guards/baseline/ui-dirs.json holds today's counts, the debt).
//   node tools/guards/check-ui.js [--update]   (--update rewrites both baselines; only after a review)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), B = path.join(__dirname, 'baseline');
const UPDATE = process.argv.includes('--update');
const walk = (d, ext) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), ext) : e.name.endsWith(ext) ? [path.join(d, e.name)] : []);
const out = [];

// 1. sinks: a fingerprint is the file plus the trimmed source line, so moving code around does not trip it
const SINK = /\.(?:innerHTML|outerHTML)\s*=(?!=)|\.insertAdjacentHTML\s*\(|document\.write(?:ln)?\s*\(/;
// fields that hold a player's own text; inside a ${…} in markup they must pass through escH (nm/pname/chatName escape already)
const RAW = /\$\{[^}]*(?:S\.myName|localNames\[[^\]]*\]|\.names\[[^\]]*\]|\bm\.x\b|\bm\.n\b|\.draft\.[a-z]+)[^}]*\}/g;
const sinks = [];
for (const f of walk('public/js', '.js')) { const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
  lines.forEach((l, i) => { if (SINK.test(l) && !/^\s*\/\//.test(l)) sinks.push(`${f.replace(/\\/g, '/')} :: ${l.trim().slice(0, 160)}`);
    for (const m of l.matchAll(RAW)) if (!/escH\(/.test(m[0])) out.push(`${f}:${i + 1}: player text put into HTML without escH: ${m[0].slice(0, 80)}`); }); }
// 2. physical directions
const DIR = /(?:^|[;{\s])(?:left|right)\s*:|(?:margin|padding|border)-(?:left|right)\b|text-align\s*:\s*(?:left|right)\b|float\s*:\s*(?:left|right)\b/g;
const dirs = {};
for (const f of walk('public/css', '.css')) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); const n = (s.match(DIR) || []).length; if (n) dirs[f.replace(/\\/g, '/')] = n; }

if (UPDATE) { fs.mkdirSync(B, { recursive: true });
  fs.writeFileSync(path.join(B, 'ui-sinks.json'), JSON.stringify(sinks.sort(), null, 1) + '\n');
  fs.writeFileSync(path.join(B, 'ui-dirs.json'), JSON.stringify(dirs, null, 1) + '\n'); console.log(`baselines written: ${sinks.length} sinks, ${Object.values(dirs).reduce((a, b) => a + b, 0)} directions`); process.exit(0); }
const known = new Set(JSON.parse(fs.readFileSync(path.join(B, 'ui-sinks.json'), 'utf8')));
for (const s of sinks) if (!known.has(s)) out.push(`new HTML sink (review it, then run --update): ${s}`);
const bd = JSON.parse(fs.readFileSync(path.join(B, 'ui-dirs.json'), 'utf8'));
for (const [f, n] of Object.entries(dirs)) if (n > (bd[f] || 0)) out.push(`${f}: ${n} left/right directions, was ${bd[f] || 0}: use inline-start / inline-end (inset-inline-*, margin-inline-*, text-align: start/end)`);
if (out.length) { console.log(`✗ ui: ${out.length}`); for (const x of out) console.log('    ' + x); process.exit(1); }
console.log(`✓ ui: ${sinks.length} known HTML sinks, ${Object.values(dirs).reduce((a, b) => a + b, 0)} known left/right (debt), nothing new`);

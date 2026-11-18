#!/usr/bin/env node
// Game guards for docs/rules.md: loads every game the way the page does (tools/guards/load.js, no browser) and checks
//   1. each game has its rules in HELP and its log docs/games/<id>.md
//   2. player limits: minP between 2 and 8 (absent = 2), maxP absent or at most 8
//   3. a game with something hidden from other seats uses one of the engine's secrecy hooks
//   4. core.js names no game id outside the lists written below
// Games stopped by the owner (STOPPED in core.js) are outside every guard; the one check on them is that each still has
// its code and its log, so it can be brought back.
//   node tools/guards/check-games.js
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PUB = process.env.ROOT || path.join(ROOT, 'public');
const { load } = require('./load.js');

// How "it has a secret" is read from the engine (see docs/review-guards.md):
//  - viewer:  on one phone the screen is covered between players, so something must stay hidden online too
//  - privInit: the game keeps a private part per seat
//  - resolve / simulNow: players pick at the same time, the picks stay hidden until the reveal
// The engine keeps these secret through: privInit (each seat's part is sealed to it), resolve/simulNow (sealed picks),
// hide / mask / privShow / net (fields of the shared state hidden or shown per seat).
const SECRET_SIGNS = ['viewer', 'privInit', 'resolve', 'simulNow'];
const SECRET_HOOKS = ['privInit', 'resolve', 'simulNow', 'hide', 'mask', 'privShow', 'net'];

// core.js may name a game id only inside these declarations (the per-mode lists) ...
const CORE_LISTS = /^\s*const\s+(NOLOCAL|NOBOT|NEWG|UPG|STOPPED)\s*=/;
// ... or where the word is not a game: CSS class or modal names that happen to match a game id.
const CORE_WORDS = { cats: 'CSS class of the category chips', react: 'name of the quick-reaction sheet and its button' };

const out = [];
const coreSrc = fs.readFileSync(path.join(PUB, 'js', 'core.js'), 'utf8');
const sm = /const\s+STOPPED\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(coreSrc), STOPPED = new Set(sm ? [...sm[1].matchAll(/["']([a-z0-9_]+)["']/g)].map(m => m[1]) : []);
const gameSrc = fs.readdirSync(path.join(PUB, 'js', 'games')).map(f => fs.readFileSync(path.join(PUB, 'js', 'games', f), 'utf8')).join('\n');
for (const id of STOPPED) {
  if (!new RegExp(`GAMES\\.${id}\\s*=`).test(gameSrc)) out.push(`stopped game ${id}: its code is gone (GAMES.${id}= in public/js/games), it can no longer be brought back`);
  if (!fs.existsSync(path.join(ROOT, 'docs', 'games', id + '.md'))) out.push(`stopped game ${id}: its log docs/games/${id}.md is gone`); }
const ctx = load(), G = ctx.__G && ctx.__G.GAMES, H = (ctx.__G && ctx.__G.HELP) || {};
if (!G || !Object.keys(G).length) { console.log('✗ could not load the games'); process.exit(1); }
for (const [id, g] of Object.entries(G)) { if (STOPPED.has(id)) continue;
  if (!H[id] || !String(H[id]).trim()) out.push(`${id}: no rules in HELP`);
  if (!fs.existsSync(path.join(ROOT, 'docs', 'games', id + '.md'))) out.push(`${id}: no log docs/games/${id}.md`);
  const minP = g.minP == null ? 2 : g.minP;
  if (!(Number.isInteger(minP) && minP >= 2 && minP <= 8)) out.push(`${id}: minP ${g.minP} is not between 2 and 8`);
  if (g.maxP != null && !(Number.isInteger(g.maxP) && g.maxP >= minP && g.maxP <= 8)) out.push(`${id}: maxP ${g.maxP} is above 8 or below minP`);
  if (SECRET_SIGNS.some(k => g[k] != null) && !SECRET_HOOKS.some(k => g[k] != null)) out.push(`${id}: has a secret (${SECRET_SIGNS.filter(k => g[k] != null).join(', ')}) but no secrecy hook`);
}
const ids = new Set(Object.keys(G).filter(i => !STOPPED.has(i))), core = coreSrc.split('\n');
core.forEach((l, n) => { if (CORE_LISTS.test(l)) return;
  for (const m of l.matchAll(/['"`]([a-z][a-z0-9_]{1,11})['"`]/g)) if (ids.has(m[1]) && !CORE_WORDS[m[1]]) out.push(`public/js/core.js:${n + 1}: names the game "${m[1]}"`); });
if (out.length) { console.log(`✗ games: ${out.length}`); for (const x of out) console.log('    ' + x); process.exit(1); }
console.log(`✓ games: ${ids.size} games checked, ${STOPPED.size} stopped games still have their code and log`);

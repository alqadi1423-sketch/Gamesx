#!/usr/bin/env node
// Which games a change touches, for the test guards: prints JSON {smoke:[ids], online:[ids], why}.
//   node tools/guards/changed-games.js --base=<git ref> [--all]
// A game file -> the games it defines; a game stylesheet -> the games of its group; the engine or shared kits -> a fixed
// sample that covers cards, boards, secrets, simultaneous rounds and the street games. online = those with a secret.
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), fs = require('fs');
const a = Object.fromEntries(process.argv.slice(2).map(x => { const m = /^--([^=]+)(?:=(.*))?$/.exec(x); return m ? [m[1], m[2] ?? '1'] : [x, '1']; }));
const { load } = require('./load.js');
const coreSrc = fs.readFileSync(path.join(ROOT, 'public/js/core.js'), 'utf8');
// games stopped by the owner (STOPPED in core.js) are outside every test
const sm = /const\s+STOPPED\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(coreSrc), STOPPED = new Set(sm ? [...sm[1].matchAll(/["']([a-z0-9_]+)["']/g)].map(m => m[1]) : []);
const G = Object.fromEntries(Object.entries(load().__G.GAMES).filter(([i]) => !STOPPED.has(i))), ids = Object.keys(G);
const SAMPLE = ['ttt', 'uno', 'baloot', 'chess', 'ludo', 'cats', 'tele', 'mafia', 'hide', 'taqiya', 'jakaro', 'trivia', 'sea', 'guess'];
const SHARED = /^public\/(index\.html|js\/(core|net|views|seal|bots|help|kit-hara|cast-themes|emoji|transport-[a-z]+|boot)\.js|css\/(style|perf|kit-hara)\.css)$/;
const secret = id => ['viewer', 'privInit', 'resolve', 'simulNow'].some(k => G[id][k] != null);
const defined = f => { try { return [...fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/GAMES\.([a-z0-9_]+)\s*=/g)].map(m => m[1]).filter(i => G[i]); } catch (e) { return []; } };
const files = a.all ? [] : execFileSync('git', ['diff', '--name-only', a.base, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const set = new Set(a.all ? ids : []), why = [];
const gameFiles = fs.readdirSync(path.join(ROOT, 'public/js/games')).map(f => 'public/js/games/' + f);
for (const f of files) {
  if (SHARED.test(f)) { SAMPLE.forEach(i => G[i] && set.add(i)); why.push(`${f}: engine or shared file -> sample`); continue; }
  let m;
  if (/^public\/js\/games\/.+\.js$/.test(f)) { const d = defined(f); d.forEach(i => set.add(i)); why.push(`${f}: ${d.length} game(s)`); }
  else if ((m = /^public\/css\/(n-[a-z0-9]+?)(?:-[a-z]+)?\.css$/.exec(f))) { const grp = m[1]; gameFiles.filter(g => path.basename(g).startsWith(grp)).forEach(g => defined(g).forEach(i => set.add(i))); why.push(`${f}: group ${grp}`); }
  else if (/^public\/css\/g-[a-z]+\.css$/.test(f)) { SAMPLE.forEach(i => G[i] && set.add(i)); why.push(`${f}: shared game styles -> sample`); }
  else if (/^(worker\/|tools\/test\/)/.test(f)) { SAMPLE.forEach(i => G[i] && set.add(i)); why.push(`${f}: server or test tool -> sample`); }
}
const smoke = [...set].sort(); console.log(JSON.stringify({ smoke, online: smoke.filter(secret), why }));

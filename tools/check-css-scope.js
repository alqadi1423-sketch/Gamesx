#!/usr/bin/env node
'use strict';
/* Guard: a game group's stylesheet must not reach another game's markup, or the app's own screens.

   Every stylesheet loads on every page (public/css/style.css, g-*.css, n-*.css, ...), so a rule like
   `.s2{width:100%;display:flex;flex-direction:column}` in n-speed2.css also lands on any element of any other game that
   carries `class="s2"` (it did: the accepted-answer cards of «إنسان حيوان جماد» were `class="ca s2"`).

   For every selector in public/css/g-*.css and n-*.css it finds the selector's scope class: the first class that is not
   part of the app frame (the classes core.js / views.js write, such as .board, .btn, .on). Then:
     CLASH      the scope class is also written as a class token by a game file the stylesheet does not belong to.
                LIVE: that file also writes every other class the selector needs (it very likely lands there today);
                latent: only the scope class is shared (it lands as soon as that game nests the right element).
     FRAME      the selector has no class of its own: it restyles the app frame (every game, or the result screen).
     COMPONENT  a shared component (the card, the die, the quiz pieces) restyled outside its home sheet with no class of
                this group, so every game that shows the component gets it.
   A selector that starts at the board root by position (`.board>.x`) counts as scoped.
   A component a game calls on purpose is in COMPONENTS; a deliberate reuse of another group's markup, or a clash checked
   to change nothing, is in ALLOW with the reason. Neither is reported.

   Usage (repository root):  node tools/check-css-scope.js [--json]
   Exit code 1 when anything is reported. No dependencies. */
const fs = require('fs');
const path = require('path');

const PUB = path.resolve(process.env.PUB || path.join(__dirname, '..', 'public'));
const args = new Set(process.argv.slice(2));

// which game files each group stylesheet is written for (from the stylesheet headers)
const OWNERS = {
  'g-boards.css': ['classic', 'boards', 'chess', 'tavla'],
  'g-cards.css': ['cards', 'baloot', 'hand', 'extra', 'more'],
  'g-dice.css': ['dice', 'mono', 'combat', 'race'],
  'g-mind.css': ['mind', 'more'],
  'g-party.css': ['party', 'social', 'tele'],
  'g-quiz.css': ['quiz', 'speed'],
  'n-boards2.css': ['n-boards2', 'n-boards2b'], 'n-cards2.css': ['n-cards2', 'n-cards2b'], 'n-dice2.css': ['n-dice2'],
  'n-guess.css': ['n-guess'], 'n-hide.css': ['n-hide'], 'n-jakaro.css': ['n-jakaro', 'n-jakaro-ui'],
  'n-party2.css': ['n-party2', 'n-party2b'], 'n-pencil2.css': ['n-pencil2'],
  'n-puzzle2.css': ['n-puzzle2', 'n-puzzle2b', 'n-puzzle2c'], 'n-quiz2.css': ['n-quiz2', 'n-quiz2b', 'n-quiz2c'],
  'n-speed2.css': ['n-speed2', 'n-speed2b'], 'n-sport2.css': ['n-sport2', 'n-sport2b'], 'n-taqiya.css': ['n-taqiya'],
  'n-tiles2.css': ['n-tiles2', 'n-tiles2b'], 'n-words2.css': ['n-words2', 'n-words2b'],
  'n-thread.css': ['w-thread', 'w-thread-core', 'w-thread-data'],
  'n-cell.css': ['q-cell', 'q-cell-core', 'q-cell-data'],
};
// shared components: [home stylesheet, classes]. Any game may call them; outside the home sheet they may only be styled
// together with a class of the styling group (.k2rack .card), never on their own.
const COMPONENTS = [
  ['g-cards.css', /^(card|hand|bhand|hhand|uback|uno)$/, 'the playing card and the fanned hand (cardHTML / miniCard)'],
  ['g-dice.css', /^(dice|tapd|ldie|mdice|roll)$/, 'the die (diceSVG) and its roll state'],
  ['g-quiz.css', /^(qbox|opt|opts|key|wl|wordbox|qz(-[\w-]+)?|spd(-[\w-]+|t)?|spr(-[\w-]+)?|spbar|rpad|nmnum|cgrid|ocg|sudo|supad|tybox|rdyi)$/, 'the quiz board (makeQuiz) and the speed pieces (spdBase)'],
];
// allowed on purpose: [stylesheet, scope classes, game files, why]
const ALLOW = [
  ['g-cards.css', /^(blt|bsc|bcard|bopts|blast)$/, ['n-cards2', 'n-cards2b', 'n-tiles2', 'n-tiles2b'], 'the Gulf card games sit on the baloot table and hand on purpose'],
  ['g-cards.css', /^(htable|hpile|hstock|hdisc|hdk|hpend|hc|hact)$/, ['n-cards2b'], 'كونكان plays on the table of «هند» on purpose'],
  ['g-cards.css', /^(table|dom|chain|ends|bone|dhand|hlbl)$/, ['n-tiles2', 'n-tiles2b'], 'the domino games of n-tiles2 draw the tiles of cards.js on purpose'],
  ['g-boards.css', /^(chp)$/, ['n-boards2'], 'the queens of «الملكات والسهام» are the chess pieces'],
  ['g-boards.css', /^(bd-tv)$/, ['n-boards2b'], '«المحبوسة» is played on the backgammon board'],
  ['g-boards.css', /^(tttv)$/, ['cards', 'race'], 'the variant switch of «إكس أو» reused by «زهر المخاطرة» and «لودو»'],
  ['g-boards.css', /^(duel|mboard|su|marble)$/, ['combat', 'mono', 'speed', 'race'], 'g-boards.css gives these games a pressed state on purpose (QA pass)'],
  ['g-dice.css', /^(ytray|yroll|yleft)$/, ['n-dice2'], 'the n-dice2 games roll in the five-dice tray on purpose'],
  ['n-boards2.css', /^(chside|chact|bd-tv)$/, ['chess', 'tavla', 'n-pencil2'], 'n-boards2.css styles its own copies of the chess side chips; checked: chess, tavla and the pencil games look the same with these rules off'],
  ['g-dice.css', /^(lgrid)$/, ['more'], '«أصغر رقم فريد» also has .lgrid; checked: .gm-root.gm-lowu .lgrid overrides every property (pixel-identical with the rule off)'],
  ['g-dice.css', /^(hx|pw|tw)$/, ['n-boards2b', 'classic', 'n-jakaro-ui', 'n-pencil2'], 'checked: the selectors need markup these games do not have (pixel-identical with the rules off)'],
  ['n-dice2.css', /^(zero)$/, ['dice'], '.dice.zero: «خمس زهرات» puts .zero on score buttons, never on a die'],
  ['g-quiz.css', /^(cur|cg)$/, '*', 'quiz/speed state classes inside .spd/.qz pieces (checked: no other game nests them)'],
  ['g-cards.css', /^(hc)$/, ['classic'], '.hhand .hc: the sea battle has no hand'],
  ['g-boards.css', /^(cellgrid)$/, ['cards', 'extra', 'speed'], '.cellgrid is the shared grid of style.css; g-boards.css styles it only with a bd-* board class'],
  ['g-quiz.css', /^(tapbtn)$/, ['combat'], '«معركة الضغط» is built on the speed pieces (spdBase) on purpose'],
  ['g-quiz.css', /^(picked)$/, ['extra'], '.picked .opt: the extra.js games have no .opt'],
  ['n-taqiya.css', /^(ph-res)$/, ['n-hide'], '.ph-res .tq-dock: the hide game has no .tq-dock'],
];
// frame rules allowed on purpose: [stylesheet, selector, why]
const ALLOW_FRAME = [
  ['g-boards.css', '.tabs .tab[data-ga=tgt]', 'only the sea battle writes .tabs .tab with data-ga="tgt" (checked: the other data-ga="tgt" buttons are not .tab)'],
];
const allowed = (css, cls, file) => ALLOW.some(([c, re, users]) => c === css && re.test(cls) && (users === '*' || users.includes(file)));

// ---- class tokens written by a script's markup: class="..." (with ${...} parts), a class list kept in cls=`...`,
// className=..., classList.add/toggle(...). A word glued to ${...} (gm-${id}, p${k}) is kept as a dynamic prefix.
function classTokens(src, dyn) {
  const toks = new Set();
  const addWords = s => { for (const w of s.split(/\s+/)) if (/^[A-Za-z_][\w-]*$/.test(w) && !/-$/.test(w)) toks.add(w); };
  // string literals that can end up in the class: not one that is compared or used as a value ('hd'.includes(x), x==='a')
  const strings = s => { for (const m of s.matchAll(/'([^'\\$]*)'|"([^"\\$]*)"/g)) { const before = s.slice(0, m.index), after = s.slice(m.index + m[0].length);
    if (/^\s*(\.|\[|[=!]==?|[<>])/.test(after) || /([=!]==?|[<>]=?|\bin)\s*$/.test(before)) continue; addWords(m[1] ?? m[2]); } };
  const scan = (re) => { let m;
    while ((m = re.exec(src))) {
      const q = m[1]; let i = m.index + m[0].length, lit = '', depth = 0, code = '';
      while (i < src.length) {
        if (!depth && src.startsWith(q, i)) break;
        if (!depth && src.startsWith('${', i)) { depth = 1; i += 2; lit += '\u0000'; continue; }
        if (depth) { const ch = src[i]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) { strings(code); code = ''; i++; lit += '\u0001'; continue; } } code += ch; i++; continue; }
        lit += src[i++];
        if (lit.length > 400) break;
      }
      for (const w of lit.split(/\s+/)) { if (!w.includes('\u0000') && !w.includes('\u0001')) addWords(w); else if (dyn) { const p = /^([A-Za-z_][\w-]*)\u0000/.exec(w); if (p) dyn.add(p[1]); } }
      re.lastIndex = i;
    } };
  scan(/class=(\\?["'])/g); scan(/\bcls\s*=\s*(`)/g);
  for (const m of src.matchAll(/className\s*=\s*([^;\n]{0,120})/g)) strings(m[1]);
  for (const m of src.matchAll(/classList\.(?:add|toggle)\(([^)]{0,80})\)/g)) strings(m[1].split(',')[0]);
  return toks;
}
// a dynamic prefix matches the class it can make: a short one (p${k}) only with a number after it, a longer one with anything
const dynRe = p => new RegExp('^' + p.replace(/[-]/g, '\\-') + (p.length <= 2 ? '\\d+$' : '[\\w-]+$'));

// ---- selectors of a stylesheet (style rules, including those inside @media / @supports), with line numbers
function selectors(css) {
  const out = []; const src = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  let i = 0; const stack = [];
  const lineAt = k => src.slice(0, k).split('\n').length;
  while (i < src.length) {
    const open = src.indexOf('{', i), close = src.indexOf('}', i);
    if (close !== -1 && (open === -1 || close < open)) { stack.pop(); i = close + 1; continue; }
    if (open === -1) break;
    const head = src.slice(i, open).trim(); const at = lineAt(i + src.slice(i, open).search(/\S/));
    if (head.startsWith('@')) {
      if (/^@(media|supports|layer|container)/.test(head)) { stack.push(head); i = open + 1; continue; }
      // @keyframes / @font-face: skip the whole block
      let d = 1, k = open + 1; while (k < src.length && d) { if (src[k] === '{') d++; else if (src[k] === '}') d--; k++; } i = k; continue;
    }
    const end = src.indexOf('}', open); const body = src.slice(open + 1, end).trim();
    for (const s of splitList(head)) out.push({ sel: s, line: at, cond: stack.join(' '), body });
    i = end + 1;
  }
  return out;
}
function splitList(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--; if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
// classes the selector requires (not those inside :not(...) / :is(...) / :where(...) / :has(...)), left to right
function stripFns(sel) { let o = '', d = 0; for (const ch of sel) { if (ch === '(') { d++; continue; } if (ch === ')') { d--; continue; } if (!d) o += ch; } return o; }
function required(sel) { return [...stripFns(sel).matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]); }
const clsOf = p => [...p.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]);

// ---- go (required as a module it only lends its parsers)
if (require.main !== module) { module.exports = { classTokens, selectors, required, stripFns, splitList }; return; }
const jsDir = path.join(PUB, 'js');
const gameFiles = fs.readdirSync(path.join(jsDir, 'games')).filter(f => f.endsWith('.js')).map(f => ['games/' + f, f.replace(/\.js$/, '')]);
gameFiles.push(['kit-hara.js', 'kit-hara']);
const TOK = {}, DYN = {};
for (const [p, b] of gameFiles) { const d = new Set(); TOK[b] = classTokens(fs.readFileSync(path.join(jsDir, p), 'utf8'), d); DYN[b] = [...d].map(dynRe); }
const writes = (file, c) => TOK[file].has(c) || DYN[file].some(re => re.test(c));
// the app frame: classes the shell writes (core.js, views.js, ...), the html classes it toggles, and the shell part of style.css
const FRAME = new Set(['lite', 'dark', 'rm']); const FRAMEDYN = [];
for (const f of ['core.js', 'views.js', 'boot.js', 'net.js', 'help.js']) if (fs.existsSync(path.join(jsDir, f))) { const d = new Set(); for (const t of classTokens(fs.readFileSync(path.join(jsDir, f), 'utf8'), d)) FRAME.add(t); for (const p of d) FRAMEDYN.push(dynRe(p)); }
const style = fs.readFileSync(path.join(PUB, 'css', 'style.css'), 'utf8'); const shellAt = style.split('\n').findIndex(l => /shell: every screen around the game boards/.test(l)) + 1;
const gameWrites = c => gameFiles.some(([, b]) => TOK[b].has(c));
for (const S of selectors(style)) if (shellAt > 0 && S.line >= shellAt) for (const c of required(S.sel)) if (!gameWrites(c)) FRAME.add(c);
const compOf = c => COMPONENTS.find(([, re]) => re.test(c));
// generic words many games write for themselves (.wide, .sm, .on): they never scope a rule on their own
const GENERIC = new Set(); { const n = {}; for (const [, b] of gameFiles) for (const c of TOK[b]) n[c] = (n[c] || 0) + 1; for (const c in n) if (n[c] >= 8) GENERIC.add(c); }
const isFrame = c => !compOf(c) && (FRAME.has(c) || FRAMEDYN.some(re => re.test(c)));
// the component's own modifiers (.card.mini, .dice.held, .opt.ok): every class its home sheet writes next to the component class
const COMPMOD = new Set();
for (const [home, re] of COMPONENTS) for (const S of selectors(fs.readFileSync(path.join(PUB, 'css', home), 'utf8')))
  for (const part of stripFns(S.sel).split(/[\s>+~]+/)) { const cs = clsOf(part); if (cs.some(c => re.test(c))) cs.forEach(c => COMPMOD.add(c)); }

const sheets = fs.readdirSync(path.join(PUB, 'css')).filter(f => /^(g|n)-[\w-]+\.css$/.test(f)).sort();
const found = [], unknown = [], compRules = [], frameRules = [];
const short = S => ({ css: S.css, line: S.line, sel: S.sel, cond: S.cond, sets: S.body.replace(/\s+/g, ' ').slice(0, 140) });
for (const css of sheets) {
  const owners = OWNERS[css]; if (!owners) { unknown.push(css); continue; }
  for (const S0 of selectors(fs.readFileSync(path.join(PUB, 'css', css), 'utf8'))) {
    const S = { ...S0, css }; const req = required(S.sel); if (!req.length) continue;
    // leading frame-only compounds (.board, html.lite) do not scope; a child step from them (.board>.x) does, by position
    const parts = stripFns(S.sel).trim().split(/(\s*[>+~]\s*|\s+)/);
    let k = 0; while (k < parts.length && (k % 2 === 1 || (clsOf(parts[k]).length ? clsOf(parts[k]).every(isFrame) : /^(html|body|:root|\*)?$/.test(parts[k].replace(/[:[].*$/, ''))))) k++;
    if (k > 0 && k < parts.length && /^\s*>\s*$/.test(parts[k - 1]) && clsOf(parts.slice(0, k - 1).join('')).includes('board')) continue;
    let scope = req.find(c => compOf(c) || (!isFrame(c) && !GENERIC.has(c)));
    if (!scope) { if (!ALLOW_FRAME.some(([c, s]) => c === css && s === S.sel)) frameRules.push(short(S)); continue; }
    if (compOf(scope)) {
      // a component: the scope is a class of this group next to it, else one anywhere in the selector (.opt .zq-hn -> zq-hn)
      const mine = c => !isFrame(c) && !compOf(c) && !COMPMOD.has(c) && !GENERIC.has(c);
      const own = clsOf(parts.find(p => clsOf(p).includes(scope)) || '').find(mine) || req.find(mine);
      if (own) scope = own;
      else { if (compOf(scope)[0] !== css) compRules.push(short(S)); continue; }
    }
    for (const [, file] of gameFiles) {
      if (owners.includes(file) || !writes(file, scope) || allowed(css, scope, file)) continue;
      const rest = req.filter(c => c !== scope && !isFrame(c));
      found.push({ ...short(S), scope, file: 'js/' + (file === 'kit-hara' ? '' : 'games/') + file + '.js', live: rest.every(c => writes(file, c)) });
    }
  }
}
const fail = found.length || compRules.length || frameRules.length || unknown.length;
if (args.has('--json')) { console.log(JSON.stringify({ found, compRules, frameRules, unknown }, null, 1)); process.exit(fail ? 1 : 0); }
if (unknown.length) console.log(`stylesheets with no owner listed in OWNERS (add them): ${unknown.join(', ')}\n`);
const groups = new Map();
for (const h of found) { const k = `${h.css} .${h.scope}  ←  ${h.file}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(h); }
const line = h => `${h.css}:${h.line}  ${h.sel}${h.cond ? '  (' + h.cond + ')' : ''}  { ${h.sets} }`;
if (groups.size) { console.log('CLASH: a class of this stylesheet is written by a game file it does not belong to'); for (const [k, l] of groups) { console.log('  ' + k); for (const h of l.slice(0, 4)) console.log(`      ${h.live ? 'LIVE  ' : 'latent'} ${line(h)}`); if (l.length > 4) console.log(`      … ${l.length - 4} more selectors`); } console.log(''); }
if (frameRules.length) { console.log('FRAME: no class of its own; restyles the app frame in every game'); for (const h of frameRules) console.log('      ' + line(h)); console.log(''); }
if (compRules.length) { console.log('COMPONENT: a shared component restyled outside its home sheet with no class of this group'); for (const h of compRules) console.log('      ' + line(h)); console.log(''); }
console.log(`check-css-scope: ${sheets.length} stylesheets; ${groups.size} class clashes (${[...groups.values()].filter(l => l.some(h => h.live)).length} live, ${found.length} selectors), ${frameRules.length} frame rules, ${compRules.length} component restyles${fail ? '' : ': OK'}`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
'use strict';
/* Generates the per-game logs: docs/games/<id>.md (one file per game in GAMES) and their index docs/games/README.md.

   Each log mixes two kinds of text:
   - generated parts, between <!-- auto:start NAME --> and <!-- auto:end NAME -->: the header (name, id, category,
     players, teams, bot, secrets, files), which ways of playing the game suits and why, the rules (HELP), the design
     facts read from the code, and the change history read from git;
   - hand-written parts, everywhere else: design notes and images, decisions, proposals, open notes, and history from
     the conversations. The generator never touches them.

   A missing log is created from a template with empty hand-written sections. An existing log only gets its auto parts
   replaced, so running the generator twice changes nothing.

   Where the data comes from:
   - the app itself, through collect() in tools/gen-games-doc.js (GAMES, HELP, CATS, NOLOCAL, NOBOT…);
   - public/js/games/*.js and public/css/*.css (which file defines a game, whether it uses the street-games kit KH);
   - git: one pass over every commit's diff outside docs/ and tools/. A commit belongs to a game when it adds or removes
     its `GAMES.<id>=` or its rules line in help.js / `HELP.<id>=`, when it touches a file that holds only that game (or
     its family, see families in tools/game-logs/data.json), when its subject names the game («الاسم» or (id)), or when
     tools/game-logs/commits.json tags it with the game;
   - tools/game-logs/commits.json: a one-line Arabic summary for each commit ("ar"), the games it touches ("games"),
     optional per-game lines ("per": {id: "…"}), or "skip": true;
   - tools/game-logs/data.json: why a game is hidden from «على نفس الجهاز» or «ضد البوت» (modes), file families.

   Usage (from the repository root):
     node tools/gen-game-logs.js            writes docs/games/*.md
     node tools/gen-game-logs.js --check    exits 1 when a generated part is out of date (nothing is written)
     node tools/gen-game-logs.js --commits  prints the games each commit was given, and writes nothing
   Needs what tools/gen-games-doc.js needs (Node 18+, Playwright with Chromium) and git. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const G = require('./gen-games-doc.js');

const REPO = G.REPO;
const DIR = path.join(REPO, 'docs', 'games');
const IMG = path.join(DIR, 'img');
const DATA = path.join(REPO, 'tools', 'game-logs');
const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');

const readJson = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
const COMMITS = readJson(path.join(DATA, 'commits.json'));
const DATAJ = readJson(path.join(DATA, 'data.json'));
const MODEWHY = DATAJ.modes || {};
const FAMILIES = DATAJ.families || {};

const git = a => cp.execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 29 });
const md = G.md;
const coll = new Intl.Collator('ar');
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------- which file defines each game, and what it uses ---------- */
function sourceFiles(ids) {
  const gdir = path.join(REPO, 'public', 'js', 'games');
  const files = fs.readdirSync(gdir).filter(f => f.endsWith('.js')).sort();
  const text = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(gdir, f), 'utf8')]));
  const out = {};
  for (const id of ids) {
    let hit = files.filter(f => new RegExp('GAMES\\.' + esc(id) + '\\s*=(?!=)').test(text[f]));
    if (!hit.length) hit = files.filter(f => /GAMES\[/.test(text[f]) && new RegExp(`['"]${esc(id)}['"]`).test(text[f]));
    out[id] = hit.map(f => ({ f, kh: /\bKH\./.test(text[f]) }));
  }
  return out;
}
function cssFor(jsFile) {
  const c = jsFile.replace(/\.js$/, '.css');
  return fs.existsSync(path.join(REPO, 'public', 'css', c)) ? c : null;
}

/* ---------- git history: one pass over every commit ---------- */
function scanHistory(D, src) {
  const ids = new Set(D.games.map(g => g.id));
  const names = D.games.map(g => [g.id, g.name]);
  // files that hold one game (or one family): every change to them belongs to that game
  const own = {};
  const perFile = {};
  for (const [id, fl] of Object.entries(src)) for (const { f } of fl) (perFile[f] = perFile[f] || []).push(id);
  for (const [f, list] of Object.entries(perFile)) if (list.length === 1) own[f.replace(/\.js$/, '')] = list;
  for (const [base, list] of Object.entries(FAMILIES)) own[base] = list;

  const raw = git(['log', '--no-merges', '-p', '-U0', '--no-color', '--format=@@C %h %ad %s', '--date=short', '--', '.', ':(exclude)docs', ':(exclude)tools']);
  const commits = [];
  let cur = null, file = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('@@C ')) {
      const m = /^@@C (\S+) (\S+) (.*)$/.exec(line);
      cur = { h: m[1], date: m[2], subj: m[3], games: new Set(), born: {} };
      commits.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('diff --git ')) {
      file = line.replace(/^diff --git a\/\S+ b\//, '');
      const base = path.basename(file).replace(/\.(js|css)$/, '');
      if (/^(public\/)?(js\/games|css)\//.test(file) && own[base]) for (const id of own[base]) cur.games.add(id);
      continue;
    }
    if (!/^[+-]/.test(line) || /^(\+\+\+|---) /.test(line)) continue;
    for (const m of line.matchAll(/GAMES\.([A-Za-z0-9_]+)\s*=(?!=)/g)) if (ids.has(m[1])) {
      cur.games.add(m[1]);
      cur.born[m[1]] = (cur.born[m[1]] || 0) + (line[0] === '+' ? 1 : -1); // more added than removed: the game was born here
    }
    for (const m of line.matchAll(/HELP\.([A-Za-z0-9_]+)\s*=(?!=)/g)) if (ids.has(m[1])) {
      cur.games.add(m[1]);
      if (line[0] === '+') (cur.help = cur.help || new Set()).add(m[1]); // rules written: the birth of a game made by a factory (no GAMES.<id>= line)
    }
    if (/(^|\/)help\.js$/.test(file)) {
      const m = /^[+-]\s*([A-Za-z0-9_]+)\s*:\s*['"`]/.exec(line);
      if (m && ids.has(m[1])) cur.games.add(m[1]);
    }
  }
  // merges and anything else commits.json names but the pass above did not see (for example a merge that matters)
  const seen = new Set(commits.map(c => c.h));
  for (const [h, c] of Object.entries(COMMITS)) {
    if (seen.has(h) || c.skip || !(c.games || []).length) continue;
    let info;
    try { info = git(['show', '-s', '--format=%h %ad %s', '--date=short', h]).trim(); } catch (e) { continue; }
    const m = /^(\S+) (\S+) (.*)$/.exec(info);
    commits.push({ h: m[1], date: m[2], subj: m[3], games: new Set(), born: {} });
  }
  for (const c of commits) {
    const meta = COMMITS[c.h] || {};
    for (const id of meta.games || []) if (ids.has(id)) c.games.add(id);
    for (const [id, name] of names) if (c.subj.includes(`«${name}»`) || c.subj.includes(`(${id})`)) c.games.add(id);
    if (meta.skip || /^Bump version/i.test(c.subj)) c.games.clear();
  }
  // a game made by a factory (gsMake: GAMES[id]=…) is born where its rules first appear; a commit older than that touched
  // only its family's file, before the game existed, so it is not the game's
  const hasBorn = new Set(commits.flatMap(c => Object.keys(c.born).filter(id => c.born[id] > 0)));
  for (const id of ids) {
    if (hasBorn.has(id)) continue;
    let k = -1; commits.forEach((c, i) => { if (c.help && c.help.has(id) && !(COMMITS[c.h] || {}).skip) k = i; });
    if (k < 0) continue;
    commits[k].born[id] = 1;
    for (const c of commits.slice(k + 1)) c.games.delete(id);
  }
  commits.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0); // newest first, stable inside a day (git order)
  const byGame = {};
  const missing = new Set();
  for (const c of commits) for (const id of c.games) {
    const meta = COMMITS[c.h] || {};
    const ar = (meta.per && meta.per[id]) || meta.ar;
    if (!ar) missing.add(c.h + ' ' + c.subj);
    const born = c.born[id] > 0 ? '**انضافت اللعبة.** ' : '';
    (byGame[id] = byGame[id] || []).push({ h: c.h, date: c.date, ar: born + (ar || `(ما له ملخص عربي بعد) ${c.subj}`) });
  }
  return { byGame, missing: [...missing] };
}

/* ---------- the generated parts ---------- */
const AUTO_NOTE = '<!-- هذا الجزء يتولّد آليًا بالأمر node tools/gen-game-logs.js. لا تعدّل بين auto:start وauto:end، واكتب ملاحظاتك برا. -->';
const sentences = t => String(t || '').replace(/<[^>]+>/g, '').replace(/([.؟!])\s+/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);

function headerBlock(g, D, src) {
  const L = [];
  const cat = D.cats.find(c => c.id === g.cat);
  const local = !D.nolocal.includes(g.id), bot = !D.nobot.includes(g.id);
  const why = MODEWHY[g.id] || {};
  const files = (src[g.id] || []).map(({ f }) => [`\`public/js/games/${f}\``, cssFor(f) && `\`public/css/${cssFor(f)}\``]).flat().filter(Boolean);
  L.push(AUTO_NOTE, '');
  L.push('| | |', '|---|---|');
  L.push(`| **الاسم** | ${md(g.name)} |`);
  L.push(`| **المعرّف** | \`${g.id}\` |`);
  L.push(`| **القسم** | [${cat ? cat.label : g.cat}](README.md#cat-${g.cat}) |`);
  L.push(`| **اللاعبين** | ${g.minP === g.maxP ? g.minP : `من ${g.minP} إلى ${g.maxP}`} |`);
  L.push(`| **الفرق** | ${G.teamsTxt(g)}${g.teams === 'native' && D.teams.native ? ` (${md(D.teams.native)})` : ''} |`);
  L.push(`| **البوت** | ${G.botTxt(g, D)} |`);
  const sec = G.secretList(g);
  L.push(`| **معلومات مخفية أونلاين** | ${sec.length ? sec.join('؛ ') : 'لا، كل شي فيها مكشوف للكل'} |`);
  L.push(`| **الملفات** | ${files.join('، ') || '—'}، وقوانينها في \`HELP.${g.id}\` |`);
  L.push(`| **في الكتالوج** | [games.md](../games.md#g-${g.id.replace(/[^\w-]/g, '-')}) |`);
  L.push('');
  L.push('## يناسب أي طريقة لعب', '');
  L.push('| الطريقة | يناسب؟ | ليش |', '|---|---|---|');
  L.push(`| على نفس الجهاز | ${local ? '✅ نعم' : '❌ مخفية من القسم'} | ${local ? (why.local ? md(why.local) : 'تنلعب بالدور، والسر (إن وجد) يكفيه غطاء واحد بكل دور') : md(why.local || 'انشالت في فرز الأقسام (انظر القرارات تحت)')} |`);
  L.push(`| ضد البوت | ${bot ? '✅ نعم' : '❌ مخفية من القسم'} | ${bot ? (why.bot ? md(why.bot) : (g.bot || g.botPick ? 'لها بوت خاص بثلاث مستويات (سهل، متوسط، صعب)' : 'البوت العام يلعب أزرارها')) : md(why.bot || 'انشالت في فرز الأقسام (انظر القرارات تحت)')} |`);
  L.push(`| أونلاين / قريب بدون نت | ✅ نعم | ${why.online ? md(why.online) : 'كل الألعاب تنلعب أونلاين وقريب بدون نت'} |`);
  L.push('');
  L.push('القاعدة في [game-checklist.md](../game-checklist.md)، والقرار في [decisions.md](../decisions.md) (2026-11-14: «كل طريقة لعب لها ألعابها»).', '');
  L.push('## القوانين', '');
  L.push('من زر «؟» داخل اللعبة (`HELP`):', '');
  const s = sentences(g.help);
  if (s.length) for (const x of s) L.push(`- ${md(x)}`);
  else L.push('- (ما لها نص قوانين في `HELP`)');
  return L.join('\n');
}

function designBlock(g, src) {
  const L = [AUTO_NOTE, ''];
  const fl = src[g.id] || [];
  const kh = fl.some(x => x.kh);
  L.push('من الكود:', '');
  if (fl.length) L.push(`- **ملف اللعبة:** ${fl.map(({ f }) => `\`public/js/games/${f}\`` + (cssFor(f) ? ` وتنسيقه \`public/css/${cssFor(f)}\`` : '')).join('، ')}.`);
  L.push(kh ? '- **«عيال الحارة»:** ملف اللعبة يرسم بعدّة الحارة (`KH` في `public/js/kit-hara.js`)، يعني الشخصيات الثمان بلبسها. التفاصيل في [characters.md](../characters.md).'
    : '- **«عيال الحارة»:** ملف اللعبة ما يستخدم عدّة الحارة (`KH`) لين الحين. التعميم على كل الألعاب جاري ([roadmap.md](../roadmap.md)).');
  const extra = [];
  if (g.simul) extra.push(g.simulNow ? 'فيها مراحل اختيار سري بنفس الوقت' : 'كل جولة الكل يختار بالسر بنفس الوقت');
  if (g.viewer) extra.push('على جوال واحد فيها شاشة تغطية وتمرير للجوال');
  if (g.noTimer) extra.push('لها ساعتها الخاصة');
  if (extra.length) L.push(`- **طريقة اللعب:** ${extra.join('، ')}.`);
  const imgDir = path.join(IMG, g.id);
  const imgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f)) : [];
  if (imgs.length) L.push(`- **صور التصميم:** ${imgs.length} صورة في [img/${g.id}/](img/${g.id}/).`);
  return L.join('\n');
}

function historyBlock(g, H) {
  const L = [AUTO_NOTE, ''];
  const rows = H.byGame[g.id] || [];
  if (!rows.length) { L.push('ما لقيت تعديل في git يخص هاللعبة بالاسم.'); return L.join('\n'); }
  L.push('من git، الأحدث أول (الإصدارات والدمج العادي ما تنعرض):', '');
  L.push('| التاريخ | وش تغيّر | الكومت |', '|---|---|---|');
  for (const r of rows) L.push(`| ${r.date} | ${r.ar.replace(/\|/g, '\\|')} | \`${r.h}\` |`);
  return L.join('\n');
}

const PLACE = {
  decisions: 'ما فيه قرار مسجّل لهاللعبة لين الحين.',
  proposals: 'ما فيه اقتراح مسجّل لهاللعبة لين الحين.',
  open: 'ما فيه شي مفتوح لين الحين.',
};

function template(g) {
  return [`# ${md(g.name)}`, '',
    '<!-- auto:start header -->', '<!-- auto:end header -->', '',
    '## التصميم والشخصيات', '',
    '<!-- auto:start design -->', '<!-- auto:end design -->', '',
    '## السجل', '',
    '<!-- auto:start history -->', '<!-- auto:end history -->', '',
    '## القرارات', '', PLACE.decisions, '',
    '## الاقتراحات', '', '**الحالات:** ✅ معتمد • ❌ مرفوض • ⏸ معلّق • ❓ ينتظر قرار صاحب المشروع', '', PLACE.proposals, '',
    '## ملاحظات مفتوحة', '', PLACE.open, ''].join('\n');
}

// replace what sits between <!-- auto:start NAME --> and <!-- auto:end NAME -->, keep everything else
function fill(text, name, body, file) {
  const re = new RegExp(`(<!-- auto:start ${name} -->)[\\s\\S]*?(<!-- auto:end ${name} -->)`);
  if (!re.test(text)) { console.warn(`${path.relative(REPO, file)}: no auto block «${name}», left as it is`); return text; }
  return text.replace(re, (m, a, b) => `${a}\n${body}\n${b}`);
}

/* ---------- the index ---------- */
function section(text, title) {
  const i = text.indexOf(`\n## ${title}\n`);
  if (i < 0) return '';
  const j = text.indexOf('\n## ', i + 4);
  return text.slice(i, j < 0 ? text.length : j);
}
const handBytes = t => Buffer.byteLength(t.replace(/<!-- auto:start (\w+) -->[\s\S]*?<!-- auto:end \1 -->/g, ''));

function indexBlock(D, texts, H) {
  const L = [AUTO_NOTE, ''];
  const n = D.games.length;
  const rich = D.games.filter(g => handBytes(texts[g.id]) > 9000);
  const props = g => (section(texts[g.id], 'الاقتراحات').replace(/\*\*الحالات:\*\*.*\n/, '').match(/[✅❌⏸❓]/g) || []).length;
  const byCat = D.cats.map(c => ({ ...c, games: D.games.filter(g => g.cat === c.id).sort((a, b) => coll.compare(a.name, b.name)) })).filter(c => c.games.length);
  L.push(`**${n} لعبة** في ${byCat.length} قسم. منها ${rich.length} لها سجل مفصّل (📖): ${rich.sort((a, b) => coll.compare(a.name, b.name)).map(g => `[${md(g.name)}](${g.id}.md)`).join('، ')}.`, '');
  L.push('| القسم | العدد |', '|---|---|');
  for (const c of byCat) L.push(`| [${c.label}](#cat-${c.id}) | ${c.games.length} |`);
  L.push('');
  L.push('**الأعمدة:** «نفس الجهاز» و«ضد البوت» ✅ تنعرض فيه و❌ مخفية منه (أونلاين وقريب بدون نت فيهم كل الألعاب). «تعديلات» عدد التعديلات اللي لقاها المولّد في git، و«اقتراحات» عدد الاقتراحات المسجّلة في سجل اللعبة.', '');
  for (const c of byCat) {
    L.push(`<a id="cat-${c.id}"></a>`, '', `## ${c.label} (${c.games.length})`, '');
    L.push('| اللعبة | المعرّف | اللاعبين | نفس الجهاز | ضد البوت | تعديلات | اقتراحات |', '|---|---|---|---|---|---|---|');
    for (const g of c.games) {
      const r = handBytes(texts[g.id]) > 9000 ? ' 📖' : '';
      L.push(`| [${md(g.name)}](${g.id}.md)${r} | \`${g.id}\` | ${G.playersTxt(g)} | ${D.nolocal.includes(g.id) ? '❌' : '✅'} | ${D.nobot.includes(g.id) ? '❌' : '✅'} | ${(H.byGame[g.id] || []).length} | ${props(g) || '—'} |`);
    }
    L.push('');
  }
  return L.join('\n').trim();
}

const INDEX_TEMPLATE = ['# سجلات الألعاب', '',
  'لكل لعبة في «ألعابنا» سجلها هنا. طلب صاحب المشروع: «أهم شي كل التفاصيل توثق في مستودع المشروع حتى الاقتراحات، ولكل لعبه سجلها».', '',
  '<!-- auto:start index -->', '<!-- auto:end index -->', ''].join('\n');

/* ---------- main ---------- */
(async () => {
  const D = await G.collect();
  const ids = D.games.map(g => g.id);
  const src = sourceFiles(ids);
  const H = scanHistory(D, src);
  if (args.has('--commits')) { // which games each commit was given (to check tools/game-logs/commits.json)
    const m = {};
    for (const [id, rows] of Object.entries(H.byGame)) for (const r of rows) (m[r.h] = m[r.h] || { date: r.date, ids: [] }).ids.push(id);
    for (const [h, v] of Object.entries(m).sort((a, b) => a[1].date < b[1].date ? 1 : -1)) console.log(h, v.date, v.ids.join(' '));
    return;
  }
  if (H.missing.length) console.warn(`commits with no Arabic summary in tools/game-logs/commits.json (${H.missing.length}):\n  ` + H.missing.join('\n  '));
  for (const id of Object.keys(MODEWHY)) if (!ids.includes(id)) console.warn(`data.json modes: no game «${id}»`);
  const nowhy = D.games.filter(g => (D.nolocal.includes(g.id) && !(MODEWHY[g.id] || {}).local) || (D.nobot.includes(g.id) && !(MODEWHY[g.id] || {}).bot)).map(g => g.id);
  if (nowhy.length) console.warn('hidden from a mode with no reason in data.json: ' + nowhy.join(', '));

  const outs = {};
  const texts = {};
  for (const g of D.games) {
    const f = path.join(DIR, g.id + '.md');
    let t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : template(g);
    t = fill(t, 'header', headerBlock(g, D, src), f);
    t = fill(t, 'design', designBlock(g, src), f);
    t = fill(t, 'history', historyBlock(g, H), f);
    outs[f] = t;
    texts[g.id] = t;
  }
  const idx = path.join(DIR, 'README.md');
  outs[idx] = fill(fs.existsSync(idx) ? fs.readFileSync(idx, 'utf8') : INDEX_TEMPLATE, 'index', indexBlock(D, texts, H), idx);

  const stale = Object.entries(outs).filter(([f, t]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== t).map(([f]) => path.relative(REPO, f));
  const extra = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.md') && f !== 'README.md' && !ids.includes(f.slice(0, -3))) : [];
  if (extra.length) console.warn('logs with no game in GAMES (kept): ' + extra.join(', '));
  if (CHECK) {
    if (stale.length) { console.error(`${stale.length} file(s) out of date, run node tools/gen-game-logs.js:\n  ` + stale.slice(0, 20).join('\n  ')); process.exit(1); }
    console.log(`docs/games is up to date (${ids.length} games)`);
    return;
  }
  fs.mkdirSync(DIR, { recursive: true });
  for (const [f, t] of Object.entries(outs)) if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== t) fs.writeFileSync(f, t);
  console.log(`docs/games: ${ids.length} games, ${stale.length} file(s) written`);
})().catch(e => { console.error(e); process.exit(1); });

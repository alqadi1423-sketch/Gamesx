#!/usr/bin/env node
'use strict';
/* Generates docs/games.md: the catalogue of every game, read from the app itself.

   It serves public/ on a local port, opens the app headless (Playwright, Chromium), lets every game file load and reads
   GAMES, HELP, HELP_TEAMS, CATS / catOf and the NOLOCAL / NOBOT sets (core.js). Nothing is typed by hand, so the doc
   follows the code: run it again after adding or changing a game.

   Usage (from the repository root):
     node tools/gen-games-doc.js              writes docs/games.md
     node tools/gen-games-doc.js --check      exits 1 when docs/games.md is out of date (nothing is written)
     node tools/gen-games-doc.js --out=x.md   writes somewhere else
   Env: PUB=<folder with index.html> (default: public/ next to this tools folder).
   Needs: Node 18+ and Playwright with Chromium (npm i -D playwright && npx playwright install chromium). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..');
const PUB = path.resolve(process.env.PUB || path.join(REPO, 'public'));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const OUT = path.resolve(args.out || path.join(REPO, 'docs', 'games.md'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg' };

// a tiny static server for public/ (no dependencies)
function serve(root) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x/').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, path.normalize(p));
    if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

// everything the doc needs, read inside the page
function readApp() {
  /* global GAMES, HELP, HELP_TEAMS, CATS, catOf, NOLOCAL, NOBOT, MAXP */
  const out = { cats: CATS.map(([id, label]) => ({ id, label })), teams: typeof HELP_TEAMS === 'object' ? HELP_TEAMS : {}, maxp: MAXP,
    nolocal: [...NOLOCAL], nobot: [...NOBOT], games: [] };
  for (const id of Object.keys(GAMES)) {
    const G = GAMES[id];
    const hide = G.hide && typeof G.hide === 'object' ? { seat: G.hide.seat || [], all: G.hide.all || [], open: typeof G.hide.open === 'function' } : null;
    out.games.push({
      id, name: String(G.name || id), cat: catOf(id), ownCat: G.cat || null,
      minP: G.minP || 2, maxP: G.maxP || MAXP, teams: G.teams || null,
      bot: typeof G.bot === 'function', botPick: typeof G.botPick === 'function',
      simul: typeof G.resolve === 'function', simulNow: typeof G.simulNow === 'function',
      hide, mask: typeof G.mask === 'function', privShow: typeof G.privShow === 'function', net: !!G.net,
      viewer: typeof G.viewer === 'function', noTimer: !!G.noTimer, host: typeof G.host === 'function',
      help: typeof HELP === 'object' && typeof HELP[id] === 'string' ? HELP[id] : '' });
  }
  return out;
}

async function collect() {
  const srv = await serve(PUB);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
    // a clean start: no saved screen, room, game list or settings from an earlier run
    await ctx.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) { } });
    // the web font is not needed and the machine may have no internet
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e && e.message || e)));
    await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
    // under automation (navigator.webdriver) core.js loads every game file at once; wait until they are all in
    await page.waitForFunction(() => typeof GREADY !== 'undefined' && GREADY && typeof GAMES === 'object' && Object.keys(GAMES).length > 0 && typeof HELP === 'object', null, { timeout: 60000 });
    await page.waitForTimeout(300);
    const data = await page.evaluate(readApp);
    if (errs.length) console.warn('page errors while loading:\n  ' + errs.slice(0, 5).join('\n  '));
    return data;
  } finally { await browser.close(); srv.close(); }
}

/* ---------- writing the Markdown ---------- */
const md = t => String(t).replace(/\\/g, '\\\\').replace(/</g, '&lt;').replace(/([*_`|\[\]#])/g, '\\$1');
const coll = new Intl.Collator('ar');
const MODES = { L: 'على نفس الجهاز', B: 'ضد البوت', O: 'أونلاين', N: 'قريب بدون نت' };

function modesOf(g, D) {
  const m = [];
  if (!D.nolocal.includes(g.id)) m.push('L');
  if (!D.nobot.includes(g.id)) m.push('B');
  m.push('O', 'N');
  return m;
}
const playersTxt = g => g.minP === g.maxP ? `${g.minP}` : `${g.minP}–${g.maxP}`;
function botTxt(g, D) {
  if (D.nobot.includes(g.id)) return 'ما تنعرض ضد البوت';
  if (g.bot || g.botPick) return 'بوت خاص فيها (سهل، متوسط، صعب)';
  return 'بوت عام يجرب أزرار اللعبة';
}
function secretList(g) {
  const s = [];
  if (g.hide) {
    if (g.hide.seat.length) s.push(`\`hide.seat\`: ${g.hide.seat.map(f => '`' + f + '`').join('، ')} (كل لاعب يشوف حقه بس)`);
    if (g.hide.all.length) s.push(`\`hide.all\`: ${g.hide.all.map(f => '`' + f + '`').join('، ')} (مخفي عن الكل)`);
    if (g.hide.open) s.push('`hide.open`: تنكشف قبل نهاية الجولة في لحظة تحددها اللعبة');
  }
  if (g.mask) s.push('`mask`: اللعبة تحدد بنفسها وش يشوف كل مقعد');
  if (g.privShow) s.push('`privShow`: وش ينعرض من الجزء الخاص لكل لاعب');
  if (g.net) s.push('`net`: ضغطات تحتاج الحالة المخفية يلعبها صاحب الغرفة');
  if (g.simul && !g.privShow) s.push('اختيارات سرية بنفس الوقت: تنخفي لين يختار الكل (`resolve`)');
  return s;
}
const hasSecret = g => !!(g.hide || g.mask || g.privShow || g.net);
const teamsTxt = g => g.teams === 'native' ? 'فرقها من قوانينها' : g.teams === 'none' ? 'كل واحد لحاله (أو لها أطرافها الخاصة)' : 'تنلعب فرق من 4 لاعبين';
const anchor = id => 'g-' + id.replace(/[^\w-]/g, '-');

function write(D) {
  const games = D.games;
  const byCat = D.cats.map(c => ({ ...c, games: games.filter(g => g.cat === c.id).sort((a, b) => coll.compare(a.name, b.name)) })).filter(c => c.games.length);
  const n = games.length, nL = games.filter(g => !D.nolocal.includes(g.id)).length, nB = games.filter(g => !D.nobot.includes(g.id)).length;
  const nOwnBot = games.filter(g => !D.nobot.includes(g.id) && (g.bot || g.botPick)).length;
  const nSecret = games.filter(hasSecret).length, nSimul = games.filter(g => g.simul).length;
  const L = [];
  L.push('# كتالوج الألعاب', '');
  L.push('> **هذا الملف يتولّد آليًا، لا تعدّله باليد.** يتحدّث بالأمر `node tools/gen-games-doc.js` من جذر المستودع (يحتاج Playwright مع Chromium).',
    '> السكربت يفتح التطبيق نفسه بمتصفح بدون شاشة، ويقرأ `GAMES` و`HELP` و`CATS` و`NOLOCAL`/`NOBOT` من الكود، فالأرقام والقوانين هنا هي اللي في التطبيق بالضبط.', '');
  L.push('## الملخص', '');
  L.push('| | العدد |', '|---|---|');
  L.push(`| كل الألعاب | **${n}** |`);
  L.push(`| تنعرض في «${MODES.L}» | ${nL} (مخفية: ${n - nL}) |`);
  L.push(`| تنعرض في «${MODES.B}» | ${nB} (مخفية: ${n - nB})، منها ${nOwnBot} لها بوت خاص فيها |`);
  L.push(`| تنعرض في «${MODES.O}» و«${MODES.N}» | ${n} (كلها) |`);
  L.push(`| فيها معلومات مخفية أونلاين (\`hide\`/\`mask\`/\`privShow\`/\`net\`) | ${nSecret} |`);
  L.push(`| فيها اختيارات سرية بنفس الوقت (\`resolve\`) | ${nSimul} |`);
  L.push('');
  L.push('**طرق اللعب:** أي لعبة تنلعب أونلاين (غرفة برمز، أو غرف claude.ai) وقريب بدون نت (تطبيق أندرويد). أما «على نفس الجهاز» و«ضد البوت» فكل لعبة انقاست لحالها، والألعاب اللي ما تناسب الوضع تنشال من قائمته (`NOLOCAL` و`NOBOT` في `public/js/core.js`، والقاعدة في [game-checklist.md](game-checklist.md)). اختبارات المتصفح الآلية (`navigator.webdriver`) تشوف كل الألعاب في كل الأوضاع.', '');
  L.push('**الفرق:** من 4 لاعبين يقدر صاحب الغرفة يقسمهم فرق (فريقين أو 3 أو 4).');
  for (const [k, t] of [['all', 'أغلب الألعاب'], ['native', 'ألعاب فرقها من قوانينها'], ['none', 'ألعاب كل واحد فيها لحاله']]) if (D.teams[k]) L.push(`- ${t}: ${md(D.teams[k])}`);
  L.push('');
  L.push('**البوتات:** «بوت خاص فيها» يعني اللعبة كاتبة `bot` أو `botPick` بثلاث مستويات. «بوت عام» يعني المحرك يجرب أزرار اللعبة نفسها (`botClick` في `core.js`).', '');
  L.push('## الفهرس', '');
  L.push('| القسم | العدد |', '|---|---|');
  for (const c of byCat) L.push(`| [${c.label}](#cat-${c.id}) | ${c.games.length} |`);
  L.push('');
  for (const c of byCat) L.push(`- **[${c.label}](#cat-${c.id})**: ${c.games.map(g => `[${md(g.name)}](#${anchor(g.id)})`).join('، ')}`);
  L.push('');
  for (const c of byCat) {
    L.push(`<a id="cat-${c.id}"></a>`, '', `## ${c.label} (${c.games.length})`, '');
    L.push('| اللعبة | المعرّف | اللاعبين | طرق اللعب | البوت | أسرار أونلاين |', '|---|---|---|---|---|---|');
    for (const g of c.games) {
      const m = modesOf(g, D);
      L.push(`| [${md(g.name)}](#${anchor(g.id)}) | \`${g.id}\` | ${playersTxt(g)} | ${m.map(k => MODES[k]).join('، ')} | ${D.nobot.includes(g.id) ? '—' : g.bot || g.botPick ? 'خاص' : 'عام'} | ${hasSecret(g) ? 'نعم' : g.simul ? 'اختيارات سرية' : 'لا'} |`);
    }
    L.push('');
    for (const g of c.games) {
      const m = modesOf(g, D), sec = secretList(g);
      L.push(`<a id="${anchor(g.id)}"></a>`, '', `### ${md(g.name)}`, '');
      L.push(`- **المعرّف:** \`${g.id}\``);
      L.push(`- **عدد اللاعبين:** ${playersTxt(g)}`);
      L.push(`- **طرق اللعب:** ${m.map(k => MODES[k]).join('، ')}` +
        (m.includes('L') ? '' : ' (مخفية من «على نفس الجهاز»)') + (m.includes('B') ? '' : ' (مخفية من «ضد البوت»)'));
      L.push(`- **البوت:** ${botTxt(g, D)}`);
      L.push(`- **الفرق:** ${teamsTxt(g)}`);
      const extra = [];
      if (g.simul) extra.push(g.simulNow ? 'فيها مراحل اختيار سري بنفس الوقت' : 'كل جولة الكل يختار بالسر بنفس الوقت');
      if (g.viewer) extra.push('على جوال واحد فيها شاشة تغطية وتمرير للجوال');
      if (g.noTimer) extra.push('لها ساعتها الخاصة (ما تستخدم وقت الدور العام)');
      if (extra.length) L.push(`- **طريقة اللعب:** ${extra.join('، ')}`);
      L.push(`- **معلومات مخفية أونلاين:** ${sec.length ? sec.join('؛ ') : 'لا، كل شي فيها مكشوف للكل'}`);
      L.push('', '**القوانين** (من زر ؟ في اللعبة):', '');
      const sentences = g.help ? g.help.replace(/([.؟!])\s+/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean) : [];
      if (sentences.length) for (const s of sentences) L.push(`- ${md(s)}`);
      else L.push('- (ما لها نص قوانين في `HELP`)');
      L.push('');
    }
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

(async () => {
  if (!fs.existsSync(path.join(PUB, 'index.html'))) { console.error('no index.html in ' + PUB + ' (set PUB)'); process.exit(2); }
  const D = await collect();
  const text = write(D);
  const missing = D.games.filter(g => !g.help).map(g => g.id);
  if (missing.length) console.warn('games with no HELP text: ' + missing.join(', '));
  if (args.check) {
    const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (old !== text) { console.error(path.relative(REPO, OUT) + ' is out of date: run node tools/gen-games-doc.js'); process.exit(1); }
    console.log(path.relative(REPO, OUT) + ' is up to date (' + D.games.length + ' games)');
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log('wrote ' + path.relative(process.cwd(), OUT) + ': ' + D.games.length + ' games, ' + (Buffer.byteLength(text) / 1024).toFixed(0) + ' KB');
})().catch(e => { console.error(e); process.exit(1); });

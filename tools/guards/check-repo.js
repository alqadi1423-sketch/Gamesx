#!/usr/bin/env node
// Repository guards for docs/rules.md. Each check prints its name and either OK or the violations, and the
// process exits 1 when any check fails. No dependencies: plain Node and git.
//   node tools/guards/check-repo.js [--base=<git ref>] [--only=a,b] [--titles-file=<file>]
// --base is the commit to compare with (the PR base, or the commit before a push); checks that compare
// (version, migrations, commits) are skipped without it.
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const BASE = args.base || '';
const ONLY = args.only ? new Set(args.only.split(',')) : null;
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tracked = () => git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
const changed = () => BASE ? git('diff', '--name-only', BASE, 'HEAD').split('\n').filter(Boolean) : [];
const fileAt = (ref, f) => { try { return git('show', `${ref}:${f}`); } catch (e) { return null; } };
const node = (...a) => { try { execFileSync(process.execPath, a, { cwd: ROOT, stdio: 'pipe' }); return null; } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); } };

// The external sources the CSP may name (rules: only fonts). Adding one needs a written reason and the owner's decision.
const CSP_ALLOWED = new Set(["'self'", "'none'", "'unsafe-inline'", 'data:', 'blob:', 'wss:', 'https:',
  'https://fonts.googleapis.com', 'https://fonts.gstatic.com']);
// The CSP directives and the exact sources each may carry today; a new source anywhere fails.
const CSP_EXPECTED = {
  'default-src': ["'self'"], 'script-src': ["'self'"], 'object-src': ["'none'"], 'base-uri': ["'none'"], 'form-action': ["'none'"],
  'frame-ancestors': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'], 'img-src': ["'self'", 'data:', 'blob:'],
  'connect-src': ["'self'", 'wss:', 'https:'], 'media-src': ["'self'", 'data:', 'blob:'] };

// Secret patterns: key material and well-known token shapes. Files that may legitimately hold such words are not exempt;
// a test fixture must be built at run time instead.
const SECRET_RES = [
  [/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'], [/\bgithub_pat_[A-Za-z0-9_]{60,}\b/, 'GitHub token'],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/, 'Slack token'], [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic key'],
  [/\bsk-[A-Za-z0-9]{40,}\b/, 'API key'], [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\b(?:storePassword|keyPassword|KEYSTORE_PASSWORD|KEY_PASSWORD|CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\s*[=:]\s*["']?[^\s"'$<{][^\s"']{5,}/, 'password or token value']];
const SECRET_FILES = /\.(?:jks|keystore|p12|pfx|pem|key|der)$|(?:^|\/)\.env(?:\..*)?$|(?:^|\/)keystore\.properties$/i;

const checks = {
  // 1. every JS file parses
  syntax() { const out = []; for (const f of tracked()) if (/\.(?:m?js)$/.test(f) && !f.startsWith('app/android/')) { const e = node('--check', f); if (e) out.push(`${f}: ${e.split('\n').find(l => /Error/.test(l)) || 'syntax error'}`); } return out; },
  // 2. generated docs are current
  docs() { const out = []; for (const t of ['tools/gen-games-doc.js', 'tools/gen-game-logs.js']) { const e = node(t, '--check'); if (e) out.push(`${t} --check: ${e.trim().split('\n')[0]}`); } return out; },
  // 3. game stylesheets do not restyle other games
  css() { const e = node('tools/check-css-scope.js'); return e ? [e.trim().split('\n').slice(-3).join(' | ')] : []; },
  // 4. perf.css is the last stylesheet in index.html (including the lazy template)
  perfLast() { const h = read('public/index.html'), links = [...h.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)].map(m => m[0]);
    return links.length && /css\/perf\.css/.test(links[links.length - 1]) ? [] : ['the last stylesheet in public/index.html is not css/perf.css']; },
  // 5. no inline script in index.html, no eval / new Function / string timers in public/js
  inline() { const out = [], h = read('public/index.html');
    for (const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (!/\bsrc=/.test(m[1]) || m[2].trim()) out.push('public/index.html: inline <script>');
    for (const m of h.matchAll(/<[^>]+\son[a-z]+\s*=/gi)) out.push(`public/index.html: inline handler ${m[0].slice(0, 60)}`);
    if (/javascript:/i.test(h)) out.push('public/index.html: javascript: URL');
    for (const f of tracked()) if (/^public\/js\/.*\.js$/.test(f)) { const s = read(f).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
      if (/(^|[^\w.$])eval\s*\(/.test(s)) out.push(`${f}: eval(`); if (/\bnew\s+Function\s*\(/.test(s)) out.push(`${f}: new Function(`);
      if (/\bset(?:Timeout|Interval)\s*\(\s*['"`]/.test(s)) out.push(`${f}: string passed to a timer`); }
    return out; },
  // 6. the CSP names only the sources written here
  csp() { const s = read('public/_headers'), m = /Content-Security-Policy:\s*([^\n]+)/.exec(s); if (!m) return ['public/_headers: no Content-Security-Policy'];
    const out = [], seen = {};
    for (const part of m[1].split(';').map(x => x.trim()).filter(Boolean)) { const [d, ...src] = part.split(/\s+/); seen[d] = src;
      for (const x of src) if (!CSP_ALLOWED.has(x)) out.push(`CSP ${d}: source not on the allowed list: ${x}`);
      const exp = CSP_EXPECTED[d]; if (!exp) out.push(`CSP: new directive ${d}`); else for (const x of src) if (!exp.includes(x)) out.push(`CSP ${d}: new source ${x}`); }
    for (const d of Object.keys(CSP_EXPECTED)) if (!seen[d]) out.push(`CSP: directive removed: ${d}`);
    if ((seen['script-src'] || []).some(x => /unsafe|https?:|data:|\*/.test(x))) out.push('CSP script-src must stay self only');
    return out; },
  // 7. a change in public/ comes with a new public/version.json
  version() { if (!BASE) return null; const c = changed(); const pub = c.filter(f => f.startsWith('public/') && f !== 'public/version.json');
    return pub.length && !c.includes('public/version.json') ? [`public/ changed (${pub.length} files, e.g. ${pub[0]}) but public/version.json did not: run sh tools/bump.sh`] : []; },
  // 8. existing Durable Object migrations never change; a change is a new entry with a new tag
  migrations() { if (!BASE) return null; const parse = s => { try { return JSON.parse(String(s).replace(/^\s*\/\/.*$/gm, '')).migrations || []; } catch (e) { return null; } };
    const old = parse(fileAt(BASE, 'wrangler.jsonc')), now = parse(read('wrangler.jsonc')); if (!now) return ['wrangler.jsonc does not parse']; if (!old) return [];
    const out = []; old.forEach((m, i) => { if (JSON.stringify(m) !== JSON.stringify(now[i])) out.push(`wrangler.jsonc: migration ${m.tag} was changed or removed`); });
    const tags = now.map(m => m.tag); if (new Set(tags).size !== tags.length) out.push('wrangler.jsonc: duplicate migration tag'); return out; },
  // 9. no secrets or key files in the repository
  secrets() { const out = []; for (const f of tracked()) { if (SECRET_FILES.test(f)) { out.push(`${f}: key or secret file`); continue; }
      let b; try { b = fs.readFileSync(path.join(ROOT, f)); } catch (e) { continue; } if (b.length > 4e6 || b.includes(0)) continue; const s = b.toString('utf8');
      for (const [re, what] of SECRET_RES) if (re.test(s)) out.push(`${f}: looks like a ${what}`); } return out; },
  // 10. commit subjects (and the PR title) read type(scope): subject, at most 72 characters
  commits() { if (!BASE) return null; const out = [], re = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: \S.*$/;
    const subj = git('log', '--no-merges', '--format=%h %s', `${BASE}..HEAD`).split('\n').filter(Boolean);
    const titles = args['titles-file'] ? fs.readFileSync(args['titles-file'], 'utf8').split('\n').filter(Boolean).map(t => 'PR ' + t) : [];
    for (const l of [...subj, ...titles]) { const s = l.slice(l.indexOf(' ') + 1); if (!re.test(s)) out.push(`not type(scope): subject: ${l}`); else if ([...s].length > 72) out.push(`longer than 72: ${l}`); }
    return out; } };

let bad = 0;
for (const [name, fn] of Object.entries(checks)) { if (ONLY && !ONLY.has(name)) continue; const r = fn();
  if (r === null) { console.log(`- ${name}: skipped (no --base)`); continue; }
  if (r.length) { bad++; console.log(`✗ ${name}: ${r.length}`); for (const x of r.slice(0, 40)) console.log('    ' + x); } else console.log(`✓ ${name}`); }
process.exit(bad ? 1 : 0);

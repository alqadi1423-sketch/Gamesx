'use strict';
/* =====================================================================================================
   «طرف الخيط» (w_thread): the rules, the clue check and the guessing bot, as plain functions on the game state.
   No DOM, no engine globals (S, GAMES, act…): the state goes in, a new state comes out, and every draw takes a random
   function, so the same module runs on the page, under node (tools/test/w-thread-unit.js) and on the new foundation later.
   The page's game object (w-thread.js) only draws the board and turns taps into calls here.

   Modes (md):
     vs    4 to 8 players, two teams. The starting team has 9 words, the other 8, 7 «جار» and 1 «العقرب».
     coop  3 players (or any table with bots on one phone): one team against a simulated rival that uncovers one of its
           own 8 words after each of the team's turns (the official two/three-player variant). The rival's pick is
           random, drawn by the host (our choice: the rulebook lets the clue-giver choose it).
     duo   2 players, together (Codenames Duet's structure): each has a secret side of the map with 9 words for the
           other to find, 3 shared; 3 scorpions a side (one shared, one a word of the other side, one a bystander there);
           15 words to find in 9 turns. Guessing goes on while it is right, a «جار» ends the turn.
   State (beside the engine's own keys):
     md mode; b the 25 word numbers; k the secret map: [one string of 25] (vs, coop: '0' '1' side words, 'n' «جار»,
     'x' «العقرب») or [side of seat 0, side of seat 1] (duo: 'g' word, 'n', 'x'); r what is uncovered ('.' not yet, else
     the type, duo 'g' found or 'x'); mk duo «جار» marks ('.', 'a' from seat 0's side, 'b' from seat 1's, 'c' both);
     sx each seat's side; tc the engine team (TEAMS) of each side; sd the side playing; ph 'clue' | 'guess'; cg the
     clue-giver of each side; cl the clue {w,n} (n 0..9, 10 = no limit); gl guesses left (-1 no limit); gn guesses made
     this turn; pk/pb the tile picked (first tap) and who picked it; gi each side's guesser rotation; lg every clue
     {s,w,n,h} (h = right guesses); ls the last tile uncovered {i,t,s}; rv the rival's last tile (coop); tk turns left
     (duo); en how it ended ('all' 'x' 'rv' 'tk' 'lf'); last a line for the cover and the status.
   ===================================================================================================== */
const WT=(()=>{
  const DATA=typeof WT_DATA!=='undefined'?WT_DATA:require('./w-thread-data.js');
  /* ---------- words ---------- */
  // one spelling for comparing: no harakat or tatweel, one alef, ة as ه, ى/ئ as ي, ؤ as و (as normQ in core.js)
  const norm=t=>String(t==null?'':t).replace(/[ً-ْٰـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/\s+/g,' ').trim();
  const W=[],FORMS=[],REL=[];
  for(const line of DATA.split('\n')){if(!line.trim())continue;const [w,f,r]=line.split('|');W.push(w.trim());
    FORMS.push(f&&f.trim()!=='-'?f.trim().split(/\s+/):[]);REL.push(r?r.trim().split(/\s+/):[]);}
  const N=W.length,WN=W.map(norm);
  /* light stemming (after Light10, Larkey, Ballesteros and Connell): a leading و, then one of the article prefixes,
     then up to two suffixes, never below 3 letters (2 for a prefix cut) */
  const PRE=['وال','بال','كال','فال','لل','ال'],SUF=['ها','ان','ات','ون','ين','يه','ه','ي'];
  const sufCut=t=>{for(let k=0;k<2;k++){let cut=false;for(const s of SUF)if(t.endsWith(s)&&t.length-s.length>=3){t=t.slice(0,-s.length);cut=true;break;}if(!cut)break;}return t;};
  const preCut=t=>{if(t.length>3&&t[0]==='و'&&!t.startsWith('وال'))t=t.slice(1);for(const p of PRE)if(t.startsWith(p)&&t.length-p.length>=2)return t.slice(p.length);return t;};
  const stem=t=>sufCut(preCut(norm(t)));
  // the spellings a typed clue may stand for: as typed, without its prefixes, without its suffixes, without both
  const variants=c=>{const n=norm(c),p=preCut(n);return [...new Set([n,p,sufCut(n),sufCut(p)])].filter(x=>x.length>=2);};
  // a board word's spellings: itself, its stem, its forms and their stems
  const WSET=WN.map((w,i)=>new Set([w,sufCut(w),...FORMS[i].map(norm),...FORMS[i].map(f=>sufCut(norm(f)))].filter(x=>x.length>=2)));
  /* ---------- the clue check ----------
     A clue is one word of Arabic letters (2 to 15). It may not be a word still on the board, a form of one (with or
     without «ال» and the prefixes and suffixes above, or a broken plural from the bank), or part of one: one of the two
     inside the other, the inner one 3 letters or more. Anything else is left to the players (the rulebook: a wrong
     clue nobody noticed counts). Returns '' when the clue may be given, else why not: 'empty' 'one' 'board' 'part' */
  function clueErr(c,board){const raw=String(c==null?'':c).trim();if(!raw)return 'empty';const n=norm(raw);
    if(!/^[ء-غف-ي]{2,15}$/.test(n))return 'one';
    const V=variants(raw);
    for(const wi of board){const w=WN[wi],set=WSET[wi];
      for(const v of V)if(set.has(v))return 'board';
      for(const v of V){if(w.length>=3&&v.includes(w))return 'part';if(v.length>=3&&w.includes(v))return 'part';}}
    return '';}
  // the board words a clue is checked against: the ones still to find
  const openWords=d=>d.b.filter((_,i)=>d.md==='duo'?d.r[i]!=='g':d.r[i]==='.');
  /* ---------- the deal ---------- */
  // two bank words that must not share a board: the same word under another spelling, a form of the other, or inside it
  const clash=(a,b)=>{const A=WSET[a],B=WSET[b];for(const x of A)if(B.has(x))return true;const wa=WN[a],wb=WN[b];return wa.length>=3&&wb.includes(wa)||wb.length>=3&&wa.includes(wb);};
  // 25 words none of which was on a board this session (used: a Set of word numbers, kept by the caller); when fewer
  // than 25 are left the session starts over
  function deal(used,rnd){rnd=rnd||Math.random;let pool=[...Array(N).keys()].filter(i=>!used||!used.has(i));if(pool.length<40){if(used)used.clear();pool=[...Array(N).keys()];}
    const out=[];while(out.length<25&&pool.length){const j=Math.floor(rnd()*pool.length),w=pool[j];pool.splice(j,1);if(!out.some(o=>clash(o,w)))out.push(w);}
    if(used)out.forEach(w=>used.add(w));return out;}
  const shuffle=(a,rnd)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  // vs and coop: the starting side's 9, the other side's 8, 7 «جار» and the scorpion
  const keyTeams=(start,rnd)=>shuffle([...Array(9).fill(String(start)),...Array(8).fill(String(1-start)),...Array(7).fill('n'),'x'],rnd).join('');
  // duo: per tile [seat 0's side, seat 1's side]; 15 words in all, 3 of them on both sides
  const DUO=[['g','g',3],['g','x',1],['g','n',5],['x','g',1],['x','x',1],['x','n',1],['n','g',5],['n','x',1],['n','n',7]];
  function keyDuo(rnd){const t=shuffle(DUO.flatMap(([a,b,c])=>Array(c).fill([a,b])),rnd);return [t.map(x=>x[0]).join(''),t.map(x=>x[1]).join('')];}
  /* ---------- seats ---------- */
  const alive=(d,s)=>(d.out||'')[s]!=='1';
  const members=(d,side)=>d.pl.map((_,s)=>s).filter(s=>d.sx[s]===side&&alive(d,s));
  // the seats that guess for a side now (vs, coop): its members but the clue-giver; duo: the other seat
  const guessers=(d,side)=>d.md==='duo'?[1-d.sd].filter(s=>alive(d,s)):members(d,side).filter(s=>s!==d.cg[side]);
  const giver=d=>d.md==='duo'?d.sd:d.cg[d.sd];
  const guessTurn=(d)=>{const g=guessers(d,d.sd);return g.length?g[(d.gi[d.sd]||0)%g.length]:giver(d);};
  const canGuess=(d,s)=>d.win==null&&d.ph==='guess'&&Number.isInteger(s)&&s>=0&&guessers(d,d.sd).includes(s);
  // no guesser left for the side playing (the others left): the host's bot guesses for it (see host in w-thread.js)
  const needsGhost=d=>d.win==null&&d.ph==='guess'&&!guessers(d,d.sd).length;
  /* setup(d,o): the round on top of the engine's state d (pl, st, out, tm): o.md, o.used, o.rnd, o.human(s) */
  function setup(d,o){const rnd=o.rnd||Math.random,n=d.pl.length,md=o.md,human=o.human||(()=>true),b=deal(o.used,rnd);
    let sx,tc=[0,1],k,sd,cg=[-1,-1];
    if(md==='vs'){if(Array.isArray(d.tm)){const ts=[...new Set(d.tm)];tc=[ts[0],ts[1]];sx=d.tm.map(t=>t===ts[0]?0:1);}else sx=d.pl.map((_,s)=>s%2);
      sd=sx[(d.st||0)%n];k=[keyTeams(sd,rnd)];
      for(const side of [0,1]){const m=d.pl.map((_,s)=>s).filter(s=>sx[s]===side),h=m.filter(human),c=h.length?h:m;cg[side]=c[(d.st||0)%c.length];}}
    else if(md==='coop'){sx=d.pl.map(()=>0);sd=0;k=[keyTeams(0,rnd)];const m=d.pl.map((_,s)=>s),h=m.filter(human),c=h.length?h:m;cg=[c[(d.st||0)%c.length],-1];}
    else{sx=[0,1];sd=(d.st||0)%2;k=keyDuo(rnd);cg=[0,1];}
    const x={...d,md,b,k,r:'.'.repeat(25),mk:'.'.repeat(25),sx,tc,sd,ph:'clue',cg,cl:null,gl:0,gn:0,pk:-1,pb:-1,gi:[0,0],lg:[],ls:null,rv:-1,tk:md==='duo'?9:0,en:null,last:''};
    if(md==='vs'&&!Array.isArray(d.tm))x.tm=sx.slice();
    if(md!=='vs')delete x.tm;
    x.turn=giver(x);return x;}
  /* ---------- reading the state ---------- */
  const tileType=(d,i)=>{const key=d.k[d.md==='duo'?d.sd:0];return key&&key[i]&&key[i]!=='?'?key[i]:'?';};
  const own=d=>d.md==='duo'?'g':String(d.sd);
  // the tiles the guessers may still tap
  const markOf=s=>s===0?'a':'b';
  const pickable=(d,i)=>{if(!(i>=0&&i<25))return false;if(d.md==='duo'){const m=d.mk[i];return d.r[i]==='.'&&m!=='c'&&m!==markOf(d.sd);}return d.r[i]==='.';};
  // words of a side still hidden (vs, coop: '0'/'1'; duo: every word not found yet, on either side)
  const leftOf=(d,side)=>{if(d.md==='duo'){let n=0;for(let i=0;i<25;i++)if((d.k[0][i]==='g'||d.k[1][i]==='g')&&d.r[i]!=='g')n++;return n;}
    let n=0;const c=String(side),key=d.k[0];for(let i=0;i<25;i++)if(key[i]===c&&d.r[i]==='.')n++;return n;};
  // counts read from what everyone sees (the map may be hidden): the words of a side uncovered so far
  const foundOf=(d,side)=>{let n=0;for(let i=0;i<25;i++)if(d.r[i]===(d.md==='duo'?'g':String(side)))n++;return n;};
  const totalOf=(d,side)=>d.md==='duo'?15:(d.md==='coop'?(side===0?9:8):(side===firstSide(d)?9:8));
  const firstSide=d=>d.sx[(d.st||0)%d.pl.length];
  /* ---------- the end ---------- */
  const sideSeats=(d,side)=>d.pl.map((_,s)=>s).filter(s=>d.sx[s]===side);
  function winSide(d,side,en){const ws=sideSeats(d,side),al=ws.filter(s=>alive(d,s));return {...d,win:(al[0]??ws[0]),wins:ws,en,pk:-1,pb:-1};}
  const winAll=(d,en)=>({...d,win:d.pl.findIndex((_,s)=>alive(d,s))>=0?d.pl.findIndex((_,s)=>alive(d,s)):0,wins:d.pl.map((_,s)=>s),en,pk:-1,pb:-1});
  const lose=(d,en)=>({...d,win:'d',en,pk:-1,pb:-1});
  // after a tile is uncovered: has a side found all its words?
  function settle(d){if(d.md==='duo')return leftOf(d)===0?winAll(d,'all'):d;
    if(d.md==='coop'){if(leftOf(d,0)===0)return winAll(d,'all');if(leftOf(d,1)===0)return lose(d,'rv');return d;}
    if(leftOf(d,d.sd)===0)return winSide(d,d.sd,'all');if(leftOf(d,1-d.sd)===0)return winSide(d,1-d.sd,'all');return d;}
  /* ---------- moves ---------- */
  // the clue: from the clue-giver, in the clue phase, passing the check; n 0..9 or 10 (no limit)
  function giveClue(d,s,word,n){if(d.win!=null||d.ph!=='clue'||s!==giver(d))return {err:'turn'};
    n=Number(n);if(!Number.isInteger(n)||n<0||n>10)return {err:'num'};
    const e=clueErr(word,openWords(d));if(e)return {err:e};
    const w=String(word).trim().replace(/[ً-ْٰـ]/g,'');
    const x={...d,ph:'guess',cl:{w,n},gl:d.md==='duo'||n===0||n===10?-1:n+1,gn:0,pk:-1,pb:-1,lg:[...d.lg,{s:d.sd,w,n,h:0}].slice(-40),last:''};
    x.turn=guessTurn(x);return {d:x};}
  // the first tap on a tile marks it for the team (its picker's face shows on it); the second one guesses it
  function pick(d,s,i){if(!canGuess(d,s)&&s!==-2||!pickable(d,i))return d;return {...d,pk:i,pb:s};}
  // the turn passes: vs to the other team, coop through the rival's tile, duo to the other player (and a turn is spent)
  function endTurn(d,rnd){rnd=rnd||Math.random;if(d.win!=null)return d;let x={...d,ph:'clue',cl:null,gl:0,gn:0,pk:-1,pb:-1,gi:d.gi.slice()};x.gi[d.sd]=(x.gi[d.sd]||0)+1;
    if(d.md==='vs'){x.sd=1-d.sd;}
    else if(d.md==='coop'){const hid=[];for(let i=0;i<25;i++)if(x.k[0][i]==='1'&&x.r[i]==='.')hid.push(i);
      if(hid.length){const i=hid[Math.floor(rnd()*hid.length)];x.r=x.r.slice(0,i)+'1'+x.r.slice(i+1);x.rv=i;x.last=`الخصم كشف «${W[x.b[i]]}»`;if(leftOf(x,1)===0)return {...lose(x,'rv'),turn:giver(x)};}}
    else{x.tk=d.tk-1;if(x.tk<=0)return {...lose(x,'tk'),turn:giver(x)};
      // the next clue comes from the other player, unless all of their words are found already
      const o=1-d.sd,mine=[...Array(25).keys()].some(i=>x.k[o][i]==='g'&&x.r[i]!=='g');x.sd=mine?o:d.sd;}
    x.turn=giver(x);return x;}
  // a guess: the tile turns over; right goes on (within the limit), «جار» or the other team's word ends the turn,
  // the scorpion loses at once. s is the guessing seat (-2: the host's bot for a side with nobody left to guess)
  function guess(d,i,s,rnd){if(!(canGuess(d,s)||s===-2&&needsGhost(d))||!pickable(d,i))return d;
    const t=tileType(d,i),x={...d,pk:-1,pb:-1,gn:d.gn+1,ls:{i,t,s},rv:-1,last:''};
    const lg=x.lg.slice(),cur=lg.length?{...lg[lg.length-1]}:null;
    if(d.md==='duo'){
      if(t==='g'){x.r=x.r.slice(0,i)+'g'+x.r.slice(i+1);if(cur){cur.h++;lg[lg.length-1]=cur;}x.lg=lg;return settle(x);}
      if(t==='x'){x.r=x.r.slice(0,i)+'x'+x.r.slice(i+1);return lose(x,'x');}
      const m=x.mk[i],add=markOf(d.sd),nm=m==='.'?add:m!==add?'c':m;x.mk=x.mk.slice(0,i)+nm+x.mk.slice(i+1);x.last=`«${W[x.b[i]]}» جار`;return endTurn(x,rnd);}
    x.r=x.r.slice(0,i)+(t==='?'?'n':t)+x.r.slice(i+1);
    if(t==='x')return d.md==='coop'?lose(x,'x'):winSide(x,1-d.sd,'x');
    if(t===own(d)){if(cur){cur.h++;lg[lg.length-1]=cur;}x.lg=lg;const y=settle(x);if(y.win!=null)return y;
      if(x.gl>0){x.gl--;if(x.gl===0)return endTurn({...x,last:'خلصت تخميناتكم'},rnd);}return x;}
    const y=settle(x);if(y.win!=null)return y;
    x.last=t==='n'?`«${W[x.b[i]]}» جار`:`«${W[x.b[i]]}» للفريق الثاني`;return endTurn(x,rnd);}
  // «خلاص، نوقف»: after one guess at least
  const stop=(d,s,rnd)=>(canGuess(d,s)||s===-2&&needsGhost(d))&&d.gn>=1?endTurn({...d,last:'وقفوا'},rnd):d;
  // a player left (the engine took the seat out): a new clue-giver if the old one left, the turn on someone still here,
  // a team with nobody left loses, and two players together cannot go on with one
  function onLeave(nd){if(nd.md==='duo'){if(nd.pl.some((_,s)=>!alive(nd,s)))return lose({...nd},'lf');return nd;}
    let x={...nd,cg:nd.cg.slice(),win:null,wins:undefined};delete x.wins;
    if(x.md==='vs')for(const side of [0,1])if(!members(x,side).length)return winSide(x,1-side,'lf');
    if(!x.pl.some((_,s)=>alive(x,s)))return lose(x,'lf');
    for(const side of x.md==='vs'?[0,1]:[0]){if(!alive(x,x.cg[side])){const m=members(x,side);x.cg[side]=m[0];}}
    if(x.pb>=0&&!alive(x,x.pb)){x.pk=-1;x.pb=-1;}
    x.turn=x.ph==='clue'?giver(x):guessTurn(x);return x;}
  /* ---------- the guessing bot ----------
     It reads only what a guesser sees: the board, what is uncovered and the clues. A clue scores each word by our
     association table: the clue is one of the word's related words (stronger the earlier it is listed), or the clue is a
     bank word that lists this one (or shares related words with it), or the clue is listed by bank words that share
     related words with this one. A clue the table does not know scores nothing, and the bot still guesses one tile */
  const IDX=new Map();const addIdx=(t,wi,pos)=>{for(const v of new Set([norm(t),sufCut(norm(t))])){if(v.length<2)continue;let a=IDX.get(v);if(!a)IDX.set(v,a=[]);a.push([wi,pos]);}};
  REL.forEach((rs,wi)=>rs.forEach((t,p)=>addIdx(t,wi,p)));
  const RELSET=REL.map(rs=>new Set(rs.flatMap(t=>[norm(t),sufCut(norm(t))])));
  const BANK=new Map();WSET.forEach((s,wi)=>s.forEach(v=>{if(!BANK.has(v))BANK.set(v,wi);}));
  const simCache=new Map();
  // how strongly clue c points at bank word wi (0..1)
  function sim(c,wi){const key=c+'|'+wi;if(simCache.has(key))return simCache.get(key);const V=variants(c);let best=0;
    const nb=new Set();
    for(const v of V){for(const [w,p] of IDX.get(v)||[]){nb.add(w);if(w===wi)best=Math.max(best,1-.045*Math.min(p,12));}
      const bw=BANK.get(v);if(bw!=null&&bw!==wi){if(RELSET[bw].has(WN[wi])||RELSET[bw].has(sufCut(WN[wi])))best=Math.max(best,.85);
        let sh=0;for(const t of RELSET[wi])if(RELSET[bw].has(t))sh++;best=Math.max(best,Math.min(.6,sh*.15));}}
    if(best<.5&&nb.size&&!nb.has(wi)){let sh=0,dir=0;for(const w of nb){if(RELSET[w].has(WN[wi]))dir++;for(const t of RELSET[wi])if(RELSET[w].has(t))sh++;}
      best=Math.max(best,Math.min(.45,dir*.3+sh*.06));}
    if(simCache.size>20000)simCache.clear();simCache.set(key,best);return best;}
  /* the bot's next step on what its seat sees (v): {i} a tile, or {stop:true}. lv 1 easy (noisy, stops early),
     2 medium, 3 hard (uses the number and the extra guess on older clues it has not finished). It always guesses once */
  function botChoose(v,lv,rnd){rnd=rnd||Math.random;const tiles=[...Array(25).keys()].filter(i=>pickable(v,i));if(!tiles.length)return {stop:true};
    const cl=v.cl||{w:'',n:1},side=v.sd,n=cl.n,noise=[0,.55,.35,.04][lv]||.35;
    const olds=lv>=3?v.lg.slice(0,-1).filter(e=>e.s===side&&e.n>0&&e.n<10&&e.h<e.n):[];
    const sc=tiles.map(i=>{const w=v.b[i];let s=cl.w?sim(cl.w,w):0;let o=0;for(const e of olds)o=Math.max(o,sim(e.w,w));return {i,s,o,t:s+noise*rnd()};});
    sc.sort((a,b)=>b.t-a.t);const top=sc[0];
    if(v.gn===0){if(lv===1&&rnd()<.3)return {i:tiles[Math.floor(rnd()*tiles.length)]};return {i:top.i};}
    if(v.gl===0)return {stop:true};
    if(lv===1){if(rnd()<.55||top.s<.5)return {stop:true};return {i:top.i};}
    const lim=n===0||n===10?99:n;
    if(lv===2){if(v.gn<lim&&top.s>=.4&&rnd()>.15)return {i:top.i};return {stop:true};}
    if(v.gn<lim&&top.s>=.2)return {i:top.i};
    // hard: the extra guess goes to an older clue it has not finished
    const ob=sc.slice().sort((a,b)=>b.o-a.o)[0];if(ob&&ob.o>=.55&&(v.gl===-1||v.gl>0))return {i:ob.i};
    if((n===0||n===10)&&top.s>=.45)return {i:top.i};
    return {stop:true};}
  /* a clue for the side playing from what its clue-giver sees: not a mode of the game (phase 1 has no clue-giving bot),
     only for a seat whose player is away (the host's stand-in), the tests, and the fallback that keeps a round moving.
     It looks for a related word that points at several of its own words and at nothing dangerous */
  function clueBot(v,rnd){rnd=rnd||Math.random;const key=v.k[v.md==='duo'?v.sd:0]||'',me=own(v),open=openWords(v),hid=[...Array(25).keys()].filter(i=>pickable(v,i));
    const mine=hid.filter(i=>key[i]===me),bad=hid.filter(i=>key[i]!==me);if(!mine.length)return {w:'شي',n:1};
    const cands=new Set();for(const i of mine)for(const t of REL[v.b[i]])cands.add(t);
    let best=null;
    for(const t of cands){if(clueErr(t,open))continue;const m=mine.map(i=>sim(t,v.b[i])).sort((a,b)=>b-a);
      let worst=0,xs=0;for(const i of bad){const s=sim(t,v.b[i]);if(s>worst)worst=s;if(key[i]==='x')xs=Math.max(xs,s);}
      if(xs>=.4)continue;const cut=Math.max(.5,worst+.12);let k=0;while(k<m.length&&m[k]>=cut)k++;if(!k)continue;
      const val=k+m[k-1]*.5-worst*.3+rnd()*.05;if(!best||val>best.val)best={w:t,n:Math.min(k,4),val};}
    if(best)return {w:best.w,n:best.n};
    for(const i of mine)for(const t of REL[v.b[i]])if(!clueErr(t,open))return {w:t,n:1};
    for(const t of ['شي','لون','شكل','مكان','حاجة'])if(!clueErr(t,open))return {w:t,n:1};
    return {w:'شي',n:0};}
  /* ---------- the map hidden from a seat ---------- */
  // vs, coop: the clue-givers see the map, everyone else sees '?'; duo: each player sees their own side
  function mask(d,seat){if(d.win!=null||!Array.isArray(d.k))return d;
    if(d.md==='duo')return {...d,k:d.k.map((x,s)=>s===seat?x:'?'.repeat(x.length))};
    if(seat>=0&&d.cg.includes(seat))return d;return {...d,k:d.k.map(x=>'?'.repeat(x.length))};}
  const seesKey=(d,seat)=>d.md==='duo'?seat===0||seat===1:seat>=0&&d.cg.includes(seat);
  return {W,N,FORMS,REL,norm,stem,variants,clueErr,openWords,deal,setup,keyTeams,keyDuo,alive,members,guessers,giver,guessTurn,canGuess,needsGhost,
    tileType,pickable,leftOf,foundOf,totalOf,firstSide,giveClue,pick,guess,stop,endTurn,onLeave,sim,botChoose,clueBot,mask,seesKey,markOf};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WT;

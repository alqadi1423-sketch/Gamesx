'use strict';
/* bots for playing alone on one phone. Level 1 easy, 2 medium, 3 hard.
   G.bot(d,s,lv) returns the next state for a turn, G.botPick(d,s,lv) returns a pick in a simultaneous round. */

// runs a game button for the bot and returns the state it would make, without applying it.
// a button that throws gives undefined (the engine then falls back), and never leaves ACT_CAP set, which would swallow every later move
function botDo(d,s,a,i){const G=GAMES[S.st.g];ACT_CAP={v:null};const hold=S.holdRender;S.holdRender=true;let v;
  try{G.click(a,i,d,botCtx(d,s));v=ACT_CAP.v;}catch(e){console.error('bot',e);v=undefined;}finally{S.holdRender=hold;ACT_CAP=null;}return v;}
const pickR=a=>a[rnd(a.length)];
const foesOf=(d,s)=>aliveSeats(d).filter(o=>o!==s&&!sameTeam(d,o,s));
const lvRand=lv=>Math.random()<[0,.55,.2,.04][lv];   // how often a bot just plays at random
const numPts=(d,G,s)=>{try{const p=G.points?G.points(d):d.pts;const v=p?String(p[s]).match(/-?\d+/):null;return v?+v[0]:0;}catch(e){return 0;}};
// tries every button the bot can press and keeps the one that leaves it best placed
function botGreedy(G,d,s,lv){TPL.innerHTML=G.render(d,botCtx(d,s));const els=[...TPL.content.querySelectorAll('[data-ga]')].filter(e=>!e.hasAttribute('disabled'));
  const seen=new Set(),opts=[];for(const e of els){const k=e.dataset.ga+':'+e.dataset.i;if(seen.has(k))continue;seen.add(k);const nd=botDo(d,s,e.dataset.ga,e.dataset.i!=null?+e.dataset.i:null);if(nd)opts.push(nd);}
  if(!opts.length)return undefined;
  const sc=nd=>{if(nd.win===s||(nd.wins||[]).includes(s))return 1e9;if(nd.out&&nd.out[s]==='1')return -1e9;const me=G.botEval?G.botEval(nd,s):numPts(nd,G,s);return me+Math.random()*.5;};
  if(lvRand(lv))return pickR(opts);opts.sort((a,b)=>sc(b)-sc(a));return lv===2?opts[Math.min(opts.length-1,rnd(2))]:opts[0];}

/* ---------- lines: tic tac toe, five in a row, four in a row ---------- */
function lineScore(b,R,C,k,i,s,n){// value of putting s on cell i
  let best=0;const me=String(s);
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const r0=Math.floor(i/C),c0=i%C;
    for(let off=0;off<k;off++){const sr=r0-dr*off,sc=c0-dc*off;let mine=0,opp=0,ok=true,owner=null;
      for(let j=0;j<k;j++){const rr=sr+dr*j,cc=sc+dc*j;if(rr<0||rr>=R||cc<0||cc>=C){ok=false;break;}const v=b[rr*C+cc];if(v==='.')continue;if(v===me)mine++;else{if(owner!=null&&owner!==v)ok=false;owner=v;opp++;}}
      if(!ok)continue;if(opp&&mine)continue;
      if(mine===k-1)best+=1e7;else if(opp===k-1)best+=1e6;else best+=mine?Math.pow(9,mine):opp?Math.pow(7,opp)*.9:1;}}
  return best;}
function lineBot(d,s,lv,R,C,k,cells){const sc=cells.map(i=>({i,v:lineScore(d.b,R,C,k,i,s)+Math.random()}));
  if(lvRand(lv))return pickR(cells);sc.sort((a,b)=>b.v-a.v);
  // easy and medium bots sometimes miss a block
  if(lv===2&&sc.length>1&&sc[0].v<1e7&&Math.random()<.15)return sc[1].i;return sc[0].i;}
// two players on 3x3 (classic or vanishing): a full search with a cut-off, from the side to move (+ it wins, - it loses).
// The classic board is small enough to see to the end; the vanishing one looks a few marks ahead
function tttSearch(d,dep,a,z,memo){const k=d.b+d.turn+dep;if(!d.vr&&memo.has(k))return memo.get(k);let best=-99;
  for(let i=0;i<9;i++){if(d.b[i]!=='.')continue;const nd=tttPut(d,i);let v;
    if(nd.win===d.turn)v=20+dep;else if(nd.win==='d')v=0;else if(dep<=1)v=0;else v=-tttSearch({...nd,turn:1-d.turn},dep-1,d.vr?-z:-99,d.vr?-a:99,memo);
    if(v>best)best=v;if(v>a)a=v;if(d.vr&&a>=z)break;}
  if(best===-99)best=0;if(!d.vr)memo.set(k,best);return best;}
GAMES.ttt.bot=(d,s,lv)=>{const cells=[...d.b].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);let i;
  if(d.sz===3&&d.pl.length===2&&!(lv===1&&Math.random()<.6)&&!(lv===2&&Math.random()<.2)){
    // easy and medium look less far, so they walk into forks a person would see
    const dep=lv===3?(d.vr?7:9):lv===2?(d.vr?3:4):2,memo=new Map();let bv=-1e9;
    for(const c of cells){const nd=tttPut(d,c);const v=(nd.win===s?40:nd.win==='d'?0:-tttSearch({...nd,turn:1-s},dep-1,-99,99,memo))+Math.random()*.5;if(v>bv){bv=v;i=c;}}}
  else i=lineBot(d,s,lv,d.sz,d.sz,d.k,cells);return botDo(d,s,'m',i);};
GAMES.gomoku.bot=(d,s,lv)=>{const z=d.z;let cells=[...d.b].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);
  const near=cells.filter(i=>{const r=Math.floor(i/z),c=i%z;for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<z&&cc>=0&&cc<z&&d.b[rr*z+cc]!=='.')return true;}return false;});
  if(near.length)cells=near;else cells=[Math.floor(z/2)*z+Math.floor(z/2)];
  // hard also sees open fours (four in a row with both ends free cannot be stopped): it makes its own and blocks those of the others
  if(lv===3){const me=String(s),foes=d.pl.map((_,o)=>o).filter(o=>!sameTeam(d,o,s)).map(String);
    const four=(i,p)=>{const r0=Math.floor(i/z),c0=i%z;for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){let n=1,ends=0;
        for(const k of [1,-1]){let r=r0+dr*k,c=c0+dc*k;while(r>=0&&r<z&&c>=0&&c<z&&d.b[r*z+c]===p){n++;r+=dr*k;c+=dc*k;}if(r>=0&&r<z&&c>=0&&c<z&&d.b[r*z+c]==='.')ends++;}
        if(n>=4&&ends===2)return true;}return false;};
    const sc=cells.map(i=>({i,v:lineScore(d.b,z,z,5,i,s)}));if(!sc.some(x=>x.v>=1e6)){
      const mine=cells.filter(i=>four(i,me));if(mine.length)return botDo(d,s,'m',pickR(mine));
      const blk=cells.filter(i=>foes.some(p=>four(i,p)));if(blk.length)return botDo(d,s,'m',blk.sort((a,b)=>lineScore(d.b,z,z,5,b,s)-lineScore(d.b,z,z,5,a,s))[0]);}}
  return botDo(d,s,'m',lineBot(d,s,lv,z,z,5,cells));};
// two players: hard searches ahead (negamax, alpha-beta, middle columns first) for a short fixed time
function c4Think(d,s){const C=d.C,R=d.R,b=[...d.b].map(x=>x==='.'?-1:+x),h=[];for(let c=0;c<C;c++){let r=R-1;while(r>=0&&b[r*C+c]>=0)r--;h.push(r);}
  const ord=[...Array(C).keys()].sort((x,y)=>Math.abs(x-(C-1)/2)-Math.abs(y-(C-1)/2)),STOP={},t0=performance.now();let lim=Infinity,nodes=0;
  const at=(r,c)=>r<0||r>=R||c<0||c>=C?-2:b[r*C+c];
  const won=(r,c,p)=>{for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){let n=1;for(const k of [1,-1]){let rr=r+dr*k,cc=c+dc*k;while(at(rr,cc)===p){n++;rr+=dr*k;cc+=dc*k;}}if(n>=4)return true;}return false;};
  // every window of four that only one side uses: three of four counts a lot, two a little; the middle column a bit
  const ev=p=>{let v=0;for(let r=0;r<R;r++)for(let c=0;c<C;c++){if(b[r*C+c]===p&&Math.abs(c-(C-1)/2)<1)v+=3;
      for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){if(at(r+dr*3,c+dc*3)===-2)continue;let m=0,o=0;for(let k=0;k<4;k++){const x=b[(r+dr*k)*C+c+dc*k];if(x===p)m++;else if(x>=0)o++;}
        if(m&&!o)v+=m===3?40:m===2?5:0;else if(o&&!m)v-=o===3?45:o===2?5:0;}}return v;};
  function ng(p,dep,a,z,left){if(!(++nodes&255)&&(performance.now()>lim||lim<Infinity&&nodes>150000))throw STOP;if(!left)return 0;
    for(const c of ord){const r=h[c];if(r<0)continue;b[r*C+c]=p;const w=won(r,c,p);b[r*C+c]=-1;if(w)return 1e6+dep;}
    if(!dep)return ev(p);
    let best=-Infinity;for(const c of ord){const r=h[c];if(r<0)continue;b[r*C+c]=p;h[c]--;const v=-ng(1-p,dep-1,-z,-a,left-1);h[c]++;b[r*C+c]=-1;if(v>best)best=v;if(v>a)a=v;if(a>=z)break;}return best;}
  const free=b.filter(x=>x<0).length;let best=ord.find(c=>h[c]>=0);
  for(let dep=1;dep<=Math.min(12,free);dep++){lim=dep<=2?Infinity:t0+300;let bv=-Infinity,bm=null;
    try{for(const c of ord){const r=h[c];if(r<0)continue;b[r*C+c]=s;h[c]--;let v;try{v=won(r,c,s)?1e7:-ng(1-s,dep-1,-Infinity,-bv,free-1);}finally{h[c]++;b[r*C+c]=-1;}v+=Math.random()*.5;if(v>bv){bv=v;bm=c;}}}
    catch(e){if(e!==STOP)throw e;break;}best=bm;if(Math.abs(bv)>9e5||performance.now()-t0>120)break;}
  return best;}
GAMES.c4.bot=(d,s,lv)=>{const C=d.C,R=d.R;const cols=[],cells=[];for(let c=0;c<C;c++){for(let r=R-1;r>=0;r--)if(d.b[r*C+c]==='.'){cols.push(c);cells.push(r*C+c);break;}}
  if(lv===3&&d.pl.length===2){const c=c4Think(d,s);if(c!=null)return botDo(d,s,'m',c);}
  let pick=lineBot(d,s,lv,R,C,4,cells);
  // do not hand the cell above to someone who wins there
  if(lv>=2){const safe=cells.filter(i=>{const up=i-C;if(up<0)return true;const b2=setAt(d.b,i,String(s));return !d.pl.some((_,o)=>!sameTeam(d,o,s)&&lineScore(b2,R,C,4,up,o)>=1e7);});
    if(safe.length&&!safe.includes(pick)&&lineScore(d.b,R,C,4,pick,s)<1e6)pick=lineBot(d,s,lv,R,C,4,safe);}
  const col=cols[cells.indexOf(pick)];return botDo(d,s,'m',col)||botDo(d,s,'c',col)||GAMES.c4.onTimeout&&GAMES.c4.onTimeout(d);};

/* ---------- dots and boxes ---------- */
// lines are ['h',i] or ['v',i]; a board is {h,v}
function dtSides(B,g,r,c){return (g.h[r*B+c]!=='.')+(g.h[(r+1)*B+c]!=='.')+(g.v[r*(B+1)+c]!=='.')+(g.v[r*(B+1)+c+1]!=='.');}
function dtBoxes(B,[a,i]){const out=[];if(a==='h'){const r=Math.floor(i/B),c=i%B;if(r>0)out.push([r-1,c]);if(r<B)out.push([r,c]);}else{const r=Math.floor(i/(B+1)),c=i%(B+1);if(c>0)out.push([r,c-1]);if(c<B)out.push([r,c]);}return out;}
const dtDraw=(g,[a,i])=>a==='h'?{h:setAt(g.h,i,'x'),v:g.v}:{h:g.h,v:setAt(g.v,i,'x')};
function dtLines(g){const L=[];for(let i=0;i<g.h.length;i++)if(g.h[i]==='.')L.push(['h',i]);for(let i=0;i<g.v.length;i++)if(g.v[i]==='.')L.push(['v',i]);return L;}
const dtTakes=(B,g,l)=>dtBoxes(B,l).some(([r,c])=>dtSides(B,g,r,c)===3);
// the boxes a player takes in a row from here by closing every box he can, and the board he leaves
function dtGreedy(B,g){let n=0;for(let k=0;k<200;k++){const l=dtLines(g).find(x=>dtTakes(B,g,x));if(!l)break;n+=dtBoxes(B,l).filter(([r,c])=>dtSides(B,g,r,c)===3).length;g=dtDraw(g,l);}return {n,g};}
const dtSafe=(B,g)=>dtLines(g).filter(l=>dtBoxes(B,l).every(([r,c])=>dtSides(B,g,r,c)<2));
// the fewest boxes the other player can then take in a row, over the lines that close nothing
const dtGive=(B,g,l)=>dtGreedy(B,dtDraw(g,l)).n;
GAMES.dots.bot=(d,s,lv)=>{const B=d.B,g={h:d.h,v:d.v};const lines=dtLines(g);
  const take=lines.filter(l=>dtTakes(B,g,l)),safe=dtSafe(B,g);
  let l;if(lvRand(lv))l=pickR(lines);
  else if(take.length&&(lv>1||Math.random()<.6)){l=pickR(take);
    // hard keeps control at the end: with the last two boxes of a chain it hands them over with one line (a double-cross),
    // so the other player has to open the next long chain for it
    if(lv===3){const all=dtGreedy(B,g);if(all.n===2&&!dtSafe(B,all.g).length&&dtLines(all.g).length){
        const dd=lines.filter(x=>!dtTakes(B,g,x)&&(()=>{const g2=dtDraw(g,x);const r=dtGreedy(B,g2);return r.n===2&&dtLines(r.g).length===dtLines(all.g).length;})());
        const rest=dtLines(all.g);const worst=Math.min(...rest.map(x=>dtGive(B,all.g,x)));
        if(dd.length&&worst>=3)l=dd[0];}}}
  else if(safe.length&&(lv>1||Math.random()<.5))l=pickR(safe);
  // no safe line left: open the shortest chain (medium and hard count it out, easy only looks at the next box)
  else if(lv>1)l=lines.map(x=>({x,c:dtGive(B,g,x)+Math.random()*.5})).sort((a,b)=>a.c-b.c)[0].x;
  else l=lines.map(x=>({x,c:dtBoxes(B,x).filter(([r,c])=>dtSides(B,g,r,c)===2).length+Math.random()})).sort((a,b)=>a.c-b.c)[0].x;
  return botDo(d,s,l[0],l[1]);};

/* ---------- reversi: its bot is in games/extra.js ---------- */

/* ---------- board searches think for a short while only: the bot runs on the page itself, so a long search freezes the phone ---------- */
const BOTSTOP={},BOTBUDGET=250;let botEnd=Infinity,botN=0;
const botTick=()=>{if(!(++botN&31)&&performance.now()>botEnd)throw BOTSTOP;};
// iterative deepening: each depth that finishes in time replaces the choice, a depth cut short counts only if its best beat the last choice.
// val(m,depth,alpha) is exact when it is above alpha; each move gets a fixed random nudge ns so equal moves vary
function botDeep(ms,maxD,ns,val){if(ms.length===1)return ms[0];const t0=performance.now(),ord=ms.map(m=>({m,n:Math.random()*ns,v:0}));let best=ms[0];
  for(let dep=1;dep<=maxD;dep++){botEnd=dep===1?Infinity:t0+BOTBUDGET;let bv=-Infinity,bm=null;
    try{for(const o of ord){o.v=val(o.m,dep,bv-o.n)+o.n;if(o.v>bv){bv=o.v;bm=o.m;}}}
    catch(e){if(e!==BOTSTOP)throw e;if(bm)best=bm;break;}finally{botEnd=Infinity;}
    best=bm;ord.sort((a,b)=>b.v-a.v);if(performance.now()-t0>BOTBUDGET*.4)break;}
  return best;}

/* ---------- chess: the engine and its bot are in games/chess.js (chThink) ---------- */

/* ---------- dama: its bot is in games/chess.js (dmThink) ---------- */

/* ---------- backgammon: its bot is in games/tavla.js (tvPlans, tvJudge) ---------- */

/* ---------- baloot: its bot is in games/baloot.js ---------- */

/* ---------- hand (rummy): its bot is in games/hand.js ---------- */

/* ---------- old maid (uno and dominoes have their bots in games/cards.js, 99 and go fish in more.js) ---------- */
GAMES.oldmaid.bot=(d,s,lv)=>{const tg=nextSeat(d,s);const n=cardsOf(d.hands[tg]).length;return n?botDo(d,s,'take',rnd(n)):GAMES.oldmaid.onTimeout&&GAMES.oldmaid.onTimeout(d);};

/* ---------- dice ---------- */
// pig: a hard bot races: it banks later when behind and keeps rolling for the win when a rival is close to the goal
GAMES.pig.bot=(d,s,lv)=>{const goal=d.goal-d.sc[s],opp=Math.max(0,...d.sc.filter((_,o)=>o!==s&&d.out[o]!=='1'));
  let hold=[0,10+rnd(15),18,20][lv];if(lv===3){hold=Math.max(14,Math.min(34,21+Math.round((opp-d.sc[s])/8)));if(d.goal-opp<=15)hold=goal;}
  return botDo(d,s,(d.tot>=hold||d.tot>=goal)&&d.tot>0?'bank':'roll',0);};
// ten thousand (farkle): its bots are in speed.js
// yatzy: see dice.js
// liar: see dice.js
// shut: see dice.js
GAMES.bj.bot=(d,s,lv)=>{if(d.ph==='done')return bjNewRound(d);const h=d.hs[s][d.hi[s]];if(!h)return bjAct(d,'stand');const v=bjVal(h.c),up=Math.min(10,rv(d.dl)===1?11:rv(d.dl)>10?10:rv(d.dl));
  if(lv===1)return bjAct(d,v<15||Math.random()<.2&&v<19?'hit':'stand');
  const soft=cardsOf(h.c).some(c=>rv(c)===1)&&bjVal(h.c.replace(/A./,'2c'))!==v;
  if(lv===3&&h.c.length===4){const free=d.chips[s]-bjCommitted(d.hs[s]);if(bj10(h.c)===bj10(h.c.slice(2))&&d.hs[s].length===1&&free>=h.b&&(rv(h.c)===1||rv(h.c)===8))return bjAct(d,'split');
    if(free>=h.b&&(v===11||(v===10&&up<10)||(v===9&&up>=3&&up<=6)))return bjAct(d,'dbl');}
  if(soft)return bjAct(d,v<=17||(v===18&&up>=9)?'hit':'stand');
  return bjAct(d,v<=11||(v<=16&&up>=7)||(v===12&&up<=3)?'hit':'stand');};
// the dealer's cards and each hand's result stay on screen long enough to read
GAMES.bj.botDelay=(d,s,lv)=>d.ph==='done'?7000:BOTMS[lv]+rnd(d.ph==='bet'?2500:600);
// a hard bot bets for the standings: the minimum while level or ahead (its better play wins slowly), and while behind enough to pass the leader, spread over the rounds left
GAMES.bj.botPick=(d,s,lv)=>{const c=d.chips[s];let b=[0,50+rnd(150),100,Math.round(c*.1/10)*10][lv];
  if(lv===3){const top=Math.max(0,...d.chips.filter((_,o)=>o!==s&&d.out[o]!=='1')),left=Math.max(1,BJR-d.r+1);
    b=c>=top?10:Math.round((left===1?top-c+20:Math.max(b,(top-c+20)/left))/10)*10;}
  return Math.max(10,Math.min(c,b));};

/* monopoly: see mono.js */

/* ---------- small strategy games (matchsticks, 31, guess the number, code breaker and guess the word have their bots in mind.js) ---------- */
GAMES.hilo.bot=(d,s,lv)=>{const cur=d.dk.slice(d.p*2,d.p*2+2);const r=rv(cur);
  // hard bots count the cards already shown, the others assume a fresh deck
  const seen={};if(lv===3)for(let k=0;k<=d.p;k++){const x=rv(d.dk.slice(k*2,k*2+2));seen[x]=(seen[x]||0)+1;}
  const per=(d.pl.length>4?8:4);let hi=0,lo=0,tot=0;for(let x=1;x<=13;x++){const n=Math.max(0,per-(seen[x]||0));tot+=n;if(x>r)hi+=n;else if(x<r)lo+=n;}
  const ph=hi/tot,pl=lo/tot,best=Math.max(ph,pl);
  if(d.stk>0){const need=d.goal-d.pts[s];const risk=1-best;const stop=lv===1?d.stk>=1+rnd(4):lv===2?(d.stk>=3||risk>.42):(d.stk>=need||risk*(d.stk+1)>best*1.1||(d.stk>=4&&risk>.3));if(stop)return botDo(d,s,'bank',0);}
  return botDo(d,s,lvRand(lv)?(Math.random()<.5?'hi':'lo'):ph>=pl?'hi':'lo',0);};
GAMES.treasure.bot=(d,s,lv)=>{const z=d.z;const free=[...d.o].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);const ok=trFits(d);
  // the radar first while many cells still fit: hard puts it where it cuts them closest to half, medium now and then anywhere useful
  if(lv>1&&(d.rdr||'')[s]==='1'&&ok.length>=(lv===3?5:9)&&(lv===3||Math.random()<.5)){
    const v=c=>{const y=ok.filter(j=>trNear(z,j,c)).length;return Math.abs(ok.length/2-y)+(lv===3?Math.random()*.5:Math.random()*4);};
    const c=free.map(c=>[c,v(c)]).sort((a,b)=>a[1]-b[1])[0];if(c)return botDo(d,s,'r',c[0]);}
  if(lv===3&&ok.length>1){// every fitting cell wins as often; hard digs the one whose clue tells the next player the least
    const left=c=>{const g={};for(const j of ok)if(j!==c){const k=Math.abs(Math.floor(j/z)-Math.floor(c/z))+Math.abs(j%z-c%z);g[k]=(g[k]||0)+1;}return Object.values(g).reduce((a,x)=>a+x*x,0);};
    return botDo(d,s,'m',ok.map(c=>[c,left(c)+Math.random()]).sort((a,b)=>b[1]-a[1])[0][0]);}
  return botDo(d,s,'m',(ok.length&&!lvRand(lv)&&(lv===3||Math.random()<.6)?pickR(ok):pickR(free)));};
// each bot remembers the cards it has seen turned over; easy bots forget most of them
const memOf=(d,s)=>{if(!S.botMem||S.botMem.g!==d.gid)S.botMem={g:d.gid,m:{}};return S.botMem.m[s]||(S.botMem.m[s]={});};
GAMES.memory.botSee=nd=>{for(const i of nd.open||[])nd.pl.forEach((_,s)=>{if(isBot(nd,s)&&Math.random()<[0,.35,.7,.95][botLv(nd,s)])memOf(nd,s)[i]=nd.dk[i];});};
// pairs or threes (d.g): finish what is open from memory, else turn a whole set it remembers, else try a card it has not seen
GAMES.memory.bot=(d,s,lv)=>{const K=memOf(d,s),G=d.g===3?3:2;let op=d.open||[];if(op.length>=G||op.length>=2&&op.some(x=>d.dk[x]!==d.dk[op[0]]))op=[];
  const free=[...d.own].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);const known=free.filter(i=>i in K&&!op.includes(i)),unknown=free.filter(i=>!(i in K)&&!op.includes(i));
  if(op.length){const e=d.dk[op[0]];const m=known.find(i=>K[i]===e);return botDo(d,s,'m',m!=null?m:unknown.length?pickR(unknown):pickR(free.filter(i=>!op.includes(i))));}
  const by={};for(const i of known)(by[K[i]]=by[K[i]]||[]).push(i);const full=Object.values(by).find(a=>a.length>=G);if(full)return botDo(d,s,'m',full[0]);
  return botDo(d,s,'m',unknown.length?pickR(unknown):pickR(free));};
// a bot keeps each colour with a chance by level (lower backwards, a bit lower with six colours). A better memory gains from
// longer chains, so the hard bot adds two colours (🔥) once the chain is going, the medium one now and then
GAMES.simon.bot=(d,s,lv)=>{const n=d.seq.length;const per=[0,.9,.96,.99][lv]-(d.vr===2?[0,.05,.025,.01][lv]:0)-(d.vr===1?[0,.02,.01,.004][lv]:0);
  if(Math.random()<Math.pow(per,n)){const N=d.vr===1?6:4,two=n>=2&&(lv===3?n>=3:lv===2?Math.random()<.25:Math.random()<.05);
    const add=String(rnd(N))+(two?rnd(N):'');return {...d,seq:d.seq+add,turn:nextSeat(d,s),last:`${nm(d,s)} كرر ${n} وزاد ${two?'لونين 🔥':'لون'}`};}
  const out=setAt(d.out,s,'1');const al=aliveSeats(d,out);return {...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,s,out),last:`❌ ${nm(d,s)} غلط وطلع`};};
GAMES.tanks.bot=(d,s,lv)=>{let best=null,near=null;const foes=foesOf(d,s),me=d.tx[s],t0=performance.now();
  // aim toward the foes only, coarse first, then fine around the nearest miss; stop after ~120 ms so the page never freezes
  const rt=foes.some(f=>d.tx[f]>me),lf=foes.some(f=>d.tx[f]<me),A0=lf?(rt?5:70):5,A1=rt?(lf?179:110):179;
  const shot=(a,pw)=>{const r=tkFire(d,s,a,pw);if(r.hits.some(h=>h.s===s||sameTeam(d,h.s,s)))return;if(r.hits.some(h=>foes.includes(h.s)&&h.dmg>=10)){best=[a,pw];return;}
    if(r.hit){const e=Math.min(...foes.map(f=>Math.abs(r.hit.x-d.tx[f])));if(!near||e<near[2])near=[a,pw,e];}};
  const scan=(a0,a1,da,p0,p1,dp)=>{for(let a=Math.max(1,a0);a<=Math.min(179,a1)&&!best;a+=da)for(let pw=Math.max(10,p0);pw<=Math.min(100,p1)&&!best;pw+=dp){if(performance.now()-t0>120)return;shot(a,pw);}};
  scan(A0,A1,10,20,100,10);if(!best&&near)scan(near[0]-9,near[0]+9,lv===3?2:3,near[1]-9,near[1]+9,lv===3?2:3);if(!best)scan(A0,A1,lv===3?2:5,20,100,lv===3?2:6);
  const noise=[0,18,8,2][lv],aim=best||near;const a=aim?aim[0]+rnd(noise*2+1)-noise:rnd(180),pw=aim?aim[1]+rnd(noise+1)-noise/2:40+rnd(60);
  S.draft.angs=String(180-Math.max(1,Math.min(179,a)));S.draft.pow=String(Math.max(10,Math.min(100,pw)));return botDo(d,s,'fire',null);};
GAMES.dwars.bot=(d,s,lv)=>{const ts=String(s);const o=[];for(let i=0;i<d.own.length;i++)if(d.own[i]===ts&&+d.dice[i]>1)for(const b of dwNb(i))if(d.own[b]!=='.'&&d.own[b]!==ts&&!sameTeam(d,+d.own[b],s)&&+d.dice[i]>=+d.dice[b]+(lv===3?1:0))o.push([i,b]);
  if(!o.length||(lv===1&&Math.random()<.3)){return dwEnd(d);}const [a,b]=lv===1?pickR(o):o.sort((x,y)=>(+d.dice[y[0]]-+d.dice[y[1]])-(+d.dice[x[0]]-+d.dice[x[1]]))[0];
  const n1=botDo(d,s,'cell',a);if(!n1){S.dwSel=a;}const n2=botDo(n1||d,s,'cell',b);return n2||dwEnd(d);};
GAMES.arena.botPick=(d,s,lv)=>{const foes=foesOf(d,s);const weak=foes.sort((a,b)=>d.hp[a]-d.hp[b])[0];
  if(lvRand(lv))return {a:pickR(['atk','def','heal','spc'].filter(k=>k!=='spc'||d.en[s]>=3)),t:pickR(foes)};
  if(lv===2){if(d.hp[s]<35&&Math.random()<.7)return {a:Math.random()<.6?'heal':'def',t:weak};if(d.en[s]>=3)return {a:'spc',t:weak};return {a:'atk',t:weak};}
  // hard: finishes whoever it can, saves its special for a kill or a strong foe, and guards against what the foes can do this round
  const hp=d.hp[s],threat=foes.reduce((a,f)=>a+(d.en[f]>=3?33:18),0),spcFoe=foes.some(f=>d.en[f]>=3),last=d.rd+1>=d.maxRd;
  const kill=foes.filter(f=>d.hp[f]<=12).sort((a,b)=>d.hp[a]-d.hp[b])[0];
  if(d.en[s]>=3){const k=foes.find(f=>d.hp[f]<=28);return {a:'spc',t:k??(foes.length>1?foes.sort((a,b)=>d.en[b]-d.en[a]||d.hp[a]-d.hp[b])[0]:weak)};}
  if(kill!=null&&!(hp<=threat&&foes.length>1))return {a:'atk',t:kill};
  if(hp<=threat&&!last){if(spcFoe||hp+15>threat)return {a:hp<85?'heal':'def',t:weak};return {a:'def',t:weak};}
  if(hp<50&&!last&&Math.random()<.55)return {a:spcFoe?'heal':pickR(['heal','def']),t:weak};
  if(!spcFoe&&Math.random()<.2)return {a:'def',t:weak};
  return {a:'atk',t:weak};};
GAMES.tapwar.botPick=(d,s,lv)=>({ok:true,ms:[0,18,27,35][lv]+rnd(8)});

/* ---------- party and word games ---------- */
GAMES.wasla.botPick=(d,s,lv)=>{const mine=(d.gs||[])[s]||[];const ans=WNORM(WASLA[d.ans]);
  let c=WASLA.map(WNORM).filter(w=>mine.every(g=>wScore(g,w).join()===wScore(g,ans).join()));
  // the hint (one per player, it costs a try): an easy bot grabs it when stuck, a medium one when many words still fit
  if((d.hu||'')[s]!=='1'&&mine.length<5&&(lv===1&&mine.length>=2&&Math.random()<.3||lv===2&&mine.length>=3&&c.length>4))return '*';
  if(lvRand(lv)||!c.length||(lv===2&&Math.random()<.3))return WNORM(pickR(WASLA));return pickR(c);};
// برة السالفة: a bot in the loop checks the other bots' answers against the word; the one out of the loop blames someone
GAMES.bara.botPick=(d,s,lv)=>{if(d.ph==='see')return 1;const o=d.pl.map((_,x)=>x).filter(x=>x!==s&&d.out[x]!=='1');if(!o.length)return -1;
  if(s===d.bo){const hum=o.filter(x=>!isBot(d,x));return pickR(lv===3&&hum.length?hum:o)+200;}
  if(lv===1&&Math.random()<.3)return pickR(o)+200;const W=baraWord(d);const sc={},bad={},good={};
  for(const x of o){sc[x]=Math.random()*[0,8,3,1][lv];for(const h of d.hn||[])if(h[0]===x){if(bOk(d,h,W)){sc[x]-=1.5;good[x]=1;}else{sc[x]+=10;bad[x]=1;}}}
  const b=o.reduce((a,x)=>sc[x]>sc[a]?x:a,o[0]);return b+100*(bad[b]?1:good[b]?3:2);};
GAMES.bara.bot=(d,s,lv)=>{if(d.ph==='cat')return baraStart(d,rnd(BARA.length));if(d.ph==='ask')return baraAsked(d);
  if(d.ph==='more'){const W=baraWord(d);const caught=(d.hn||[]).some(h=>!bOk(d,h,W));return lv>1&&!d.q2&&!caught&&s!==d.bo&&Math.random()<.6?baraAgain(d):{...d,ph:'vote',rd:d.rd+1,last:'بدأ التصويت'};}
  // the guess: a bot out of the loop keeps the options that fit what the other bots answered
  if(d.ph==='guess'){const hs=(d.hn||[]).filter(h=>h[0]!==d.bo);const fit=d.opts.filter(i=>hs.every(h=>bOk(d,h,BARA[d.cat][1][i])));
    const i=lv===3&&fit.length?pickR(fit):lv===2&&fit.length&&Math.random()<.7?pickR(fit):pickR(d.opts);return baraGuess(d,i);}
  return GAMES.bara.onTimeout(d);};
// a bot knows how sure it is: the hard one spends a ×2 chip on a guess it knows is close (or on the last questions), the others guess when
GAMES.close.botPick=(d,s,lv)=>{const Q=GAMES.close.q(d,d.rd);const a=Q[1];const e=(Math.random()*2-1)*[0,.45,.22,.08][lv];const v=Math.max(0,Math.round(a*(1+e)));
  const x=d.x2?d.x2[s]:0,left=(d.rounds||8)-d.rd;let dbl=false;
  if(x>0){if(lv===3)dbl=Math.abs(e)<.035||left<=x&&Math.abs(e)<.07;else if(lv===2)dbl=Math.random()<.18;else dbl=Math.random()<.12;}
  return dbl?{v,x:1}:v;};

/* ---------- race games ---------- */
// rolling returns with roll set when there is a real choice; the bot picks its piece on the next tick
GAMES.ludo.bot=(d,s,lv)=>{if(d.roll==null)return luRoll(d);const r=d.roll,mv=luMovable(d,s,r);if(!mv.length)return GAMES.ludo.onTimeout(d);
  if(lvRand(lv))return luApply(d,s,pickR(mv),r);const n=d.pl.length,T=luT(d),F=T+4,K=d.T;
  const cell=(o,q)=>(armOf(n,o)*13+8+q)%T;
  const danger=(tk,q)=>{if(q<0||q>T-2)return 0;const g=cell(s,q);if(g%13===3||g%13===8)return 0;let x=0;// opponents up to six cells behind
    for(let o=0;o<n;o++){if(sameTeam(d,o,s))continue;for(let kk=0;kk<K;kk++){const p=tk[o*K+kk];if(p<0||p>T-2)continue;const dist=(g-cell(o,p)+T)%T;if(dist>=1&&dist<=6&&p+dist<=T-2)x++;}}return x;};
  const val=k=>{const nd=luApply(d,s,k,r);if(nd.win===s)return 1e9;const i=s*K+k,p0=d.tk[i],p1=nd.tk[i];let v=0;
    v+=nd.mv.cap.reduce((a,c)=>a+(sameTeam(d,c[0],s)?-40:60),0);if(p0<0)v+=35;v+=(p1-Math.max(0,p0))*.6;if(p1===F)v+=45;else if(p1>T-2)v+=20;
    if(lv===3){v-=danger(nd.tk,p1)*28;v+=danger(d.tk,p0)*22;}return v+Math.random();};
  return luApply(d,s,mv.sort((a,b)=>val(b)-val(a))[0],r);};
GAMES.ludo.botDelay=(d,s,lv)=>d.roll==null?700+rnd(400):900+rnd(500);
const JKCOST={A:3,K:3,J:3,7:2,4:1,Q:1,5:1};
GAMES.jakaro.bot=(d,s,lv)=>{const cs=jkCtl(d,s),cards=cardsOf(d.hd[s]),n=d.pl.length,L=jkL(d);const opts=[];
  cards.forEach((c,i)=>jkOpts(d,cs,c).forEach(o=>opts.push([i,o])));
  if(!opts.length){// no move: burn the least useful card
    const i=cards.map((c,i)=>[i,JKCOST[c[0]]||0]).sort((a,b)=>a[1]-b[1])[0][0];return jkPlay(d,i,null);}
  if(lvRand(lv))return jkPlay(d,...pickR(opts));const team=jkTeamOf(d,s);
  const pos=q=>q<0?-12:q>=L?L+25+(q-L)*3:q;
  // hard also counts how exposed its marbles end up: a foe marble 1 to 13 holes behind can land on it with one card
  const exposed=mb=>{let r=0;const occ={};for(let p=0;p<n;p++)for(let k=0;k<4;k++){const q=mb[p*4+k];if(q>=0&&q<L)occ[jkCell({...d,mb},p,q)]=p;}
    for(const p of team)for(let k=0;k<4;k++){const q=mb[p*4+k];if(q<=0||q>=L)continue;const c=jkCell({...d,mb},p,q);let hit=0;
      for(let t=1;t<=13;t++){const o=occ[(c-t+L)%L];if(o!=null&&!team.includes(o)&&d.out[o]!=='1'){hit++;}}if(hit)r+=(q+12)*Math.min(1,.35*hit);}return r;};
  const val=([i,o])=>{const nd=jkPlay(d,i,o);if(nd.win!=null&&(nd.win===s||(nd.wins||[]).includes(s)))return 1e9;let v=0;
    for(let p=0;p<n;p++)for(let k=0;k<4;k++){const x=pos(nd.mb[p*4+k])-pos(d.mb[p*4+k]);v+=team.includes(p)?x:-x*(lv===3?.9:.5);}
    if(lv===3)v-=.22*(exposed(nd.mb)-exposed(d.mb));
    return v-(JKCOST[cards[i][0]]||0)*(lv===3?1.5:.5)+Math.random();};
  const b=opts.sort((x,y)=>val(y)-val(x))[0];return jkPlay(d,b[0],b[1]);};

/* ---------- guess the person ---------- */
GAMES.guess.bot=(d,s,lv)=>{const ts=targets(d,s);if(!ts.length)return;
  const left=o=>[...elSeg(d,s,o)].map((c,k)=>c==='0'?k:-1).filter(k=>k>=0);
  const o=lv===1?pickR(ts):[...ts].sort((a,b)=>left(a).length-left(b).length)[0];S.tgt=o;const L=left(o);
  if(L.length===1||(lv===1&&L.length<=3&&Math.random()<.35)){S.gw=true;return botDo(d,s,'guess',pickR(L));}
  // the question that splits the people still standing most evenly
  let best=0,bv=1e9;QS.forEach((q,i)=>{const y=L.filter(k=>!!q[1](PEOPLE[k])).length;const v=Math.abs(L.length/2-y)+(y===0||y===L.length?1e6:0)+Math.random()*[0,8,2,.1][lv];if(v<bv){bv=v;best=i;}});
  return botDo(d,s,'ask',best);};

/* ---------- minefield ---------- */
GAMES.mines.bot=(d,s,lv)=>{const z=d.z,N=z*z;const unk=[];for(let i=0;i<N;i++)if(d.rv[i]==='.')unk.push(i);
  if(lvRand(lv))return botDo(d,s,'m',pickR(unk));
  const nb=i=>{const r=Math.floor(i/z),c=i%z,o=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if((dr||dc)&&rr>=0&&rr<z&&cc>=0&&cc<z)o.push(rr*z+cc);}return o;};
  const open=[];for(let i=0;i<N;i++)if(d.rv[i]!=='.'&&d.m[i]==='0')open.push(i);
  const mine=new Set(),safe=new Set();for(let i=0;i<N;i++)if(d.rv[i]!=='.'&&d.m[i]==='1')mine.add(i);
  for(let ch=true,g=0;ch&&g<50;g++){ch=false;for(const i of open){const k=mineCount(d.m,z,i),ns=nb(i);const u=ns.filter(j=>d.rv[j]==='.'&&!mine.has(j)&&!safe.has(j));if(!u.length)continue;
      const km=ns.filter(j=>mine.has(j)).length;if(km===k){u.forEach(j=>safe.add(j));ch=true;}else if(km+u.length===k){u.forEach(j=>mine.add(j));ch=true;}}}
  // a mine it is sure of is worth a flag (+3): hard always takes it, medium half the time
  const km=unk.filter(j=>mine.has(j));if(km.length&&(lv===3||lv===2&&Math.random()<.5))return botDo(d,s,'f',pickR(km));
  const sf=unk.filter(j=>safe.has(j));if(sf.length&&(lv===3||Math.random()<.75))return botDo(d,s,'m',pickR(sf));
  const total=(MNS[d.pl.length]||[10,20])[1];const rest=Math.max(0,total-[...mine].length),cand=unk.filter(j=>!mine.has(j));
  const p=j=>{let x=-1;for(const i of nb(j)){if(d.rv[i]==='.'||d.m[i]==='1')continue;const ns=nb(i);const u=ns.filter(q=>d.rv[q]==='.'&&!mine.has(q)).length;const km=ns.filter(q=>mine.has(q)).length;if(u)x=Math.max(x,(mineCount(d.m,z,i)-km)/u);}
    return x<0?rest/Math.max(1,cand.length):x;};
  if(!cand.length)return botDo(d,s,'m',pickR(unk));
  return botDo(d,s,'m',cand.map(j=>[j,p(j)+Math.random()*(lv===3?.02:.15)]).sort((a,b)=>a[1]-b[1])[0][0]);};

/* ---------- colour war: take the move that leaves the most of the board ---------- */
GAMES.cw.botEval=(nd,s)=>{const ts=String(s);let v=0;for(let i=0;i<nd.o.length;i++){if(nd.o[i]===ts)v+=3+ +nd.n[i]*.3;else if(nd.o[i]!=='.')v-=1;}return v;};
// every move a seat can make (first move: an empty cell, later: one of its own cells)
const cwOpts=(d,s)=>[...d.o].map((c,i)=>(d.mv[s]===0?c==='.':c===String(s))?i:-1).filter(i=>i>=0);
// hard looks one reply ahead: the move whose worst answer from the next player still leaves it best
GAMES.cw.bot=(d,s,lv)=>{if(lv<3||lvRand(lv))return botGreedy(GAMES.cw,d,s,lv);let best=null,bv=-Infinity;
  for(const i of cwOpts(d,s)){const nd=botDo(d,s,'m',i);if(!nd)continue;if(nd.win===s)return nd;let v=Infinity;
    if(nd.win==null&&nd.out[s]!=='1'){const o=nd.turn;for(const j of cwOpts(nd,o)){const n2=botDo(nd,o,'m',j);if(!n2)continue;const e=n2.out[s]==='1'?-1e6:GAMES.cw.botEval(n2,s);if(e<v)v=e;if(v<=bv)break;}}
    if(v===Infinity)v=GAMES.cw.botEval(nd,s);v+=Math.random()*.3;if(v>bv){bv=v;best=nd;}}
  return best||botGreedy(GAMES.cw,d,s,lv);};

/* ---------- ultimate tic tac toe: its bot is in more.js ---------- */

/* ---------- bingo ---------- */
GAMES.bingo.bot=(d,s,lv)=>{const open=[];for(let n=1;n<=25;n++)if(d.called[n-1]==='0')open.push(n);if(lvRand(lv))return botDo(d,s,'m',pickR(open));
  const L5=[];for(let r=0;r<5;r++){L5.push([0,1,2,3,4].map(c=>r*5+c));L5.push([0,1,2,3,4].map(c=>c*5+r));}L5.push([0,6,12,18,24],[4,8,12,16,20]);
  const gain=(card,n)=>{const p=card.indexOf(n);let v=0;for(const L of L5)if(L.includes(p)){const c=L.filter(q=>d.called[card[q]-1]==='1').length;v+=c===4?100:(c+1)*(c+1);}return v;};
  const mine=bingoCard(d,s);// only its own card: the others' cards are hidden from players
  const val=n=>gain(mine,n)+Math.random();
  return botDo(d,s,'m',open.sort((a,b)=>val(b)-val(a))[0]);};

/* ---------- number party games ---------- */
// لو خيروك: every question has a side most people lean to (drawn per question). A bot of any level votes its own taste, which
// follows that lean; the hard bot reads the lean well and goes with the crowd, or against it in a «جولة الأقلية»
GAMES.major.botPick=(d,s,lv)=>{const lean=.2+.6*srng(d,'mjl'+d.rd)(),pop=lean>=.5?0:1,taste=Math.random()<lean?0:1,mi=majMin(d,d.rd);
  if(lv===3)return mi?1-pop:pop;if(lv===2&&Math.random()<.6)return mi?(Math.random()<.5?1-pop:pop):pop;return taste;};

/* ---------- sea battle: hunt with a pattern, then finish the ship that was hit ---------- */
function seaAim(d,s,o,lv,avoid){const sh=d.sh[o],f=seaFleet(d,o)||'.'.repeat(64),sunk=seaSunk(f,sh);
  const ok=i=>i>=0&&i<64&&sh[i]==='.'&&!avoid.includes(i);
  const nb4=i=>{const r=Math.floor(i/8),c=i%8;return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>a>=0&&a<8&&b>=0&&b<8).map(([a,b])=>a*8+b);};
  const live=[...Array(64).keys()].filter(i=>sh[i]==='o'&&!sunk.has(f[i]));
  // ships never touch: around a sunk ship and on the corners of a hit there is only water
  const blocked=new Set();if(lv===3)for(let i=0;i<64;i++){if(sh[i]!=='o')continue;const r=Math.floor(i/8),c=i%8,dn=sunk.has(f[i]);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!dn&&(a===0||b===0))continue;const rr=r+a,cc=c+b;if(rr>=0&&rr<8&&cc>=0&&cc<8)blocked.add(rr*8+cc);}}
  if(live.length&&Math.random()<[0,.35,.85,1][lv]){const sc={};
    for(const h of live)for(const n of nb4(h)){if(!ok(n)||blocked.has(n))continue;sc[n]=(sc[n]||0)+1;const dl=n-h,bk=h-dl;
      if(bk>=0&&bk<64&&live.includes(bk)&&(Math.abs(dl)!==1||Math.floor(bk/8)===Math.floor(h/8)))sc[n]+=3;}
    const c=Object.keys(sc).map(Number);if(c.length)return c.sort((a,b)=>sc[b]-sc[a]+(Math.random()-.5)*.1)[0];}
  let free=[...Array(64).keys()].filter(i=>ok(i)&&!blocked.has(i));
  // hard hunts where the ships still afloat fit in the most ways (misses, sunk ships and the water around them ruled out)
  if(lv===3&&free.length){const left=SHIPS.filter((L,k)=>!sunk.has(SL[k])),cnt=Array(64).fill(0),open=i=>sh[i]==='.'&&!blocked.has(i);
    for(const L of left)for(let r=0;r<8;r++)for(let c=0;c<8;c++)for(const hz of [0,1]){if(hz?c+L>8:r+L>8)continue;const cs=[];for(let k=0;k<L;k++)cs.push(hz?r*8+c+k:(r+k)*8+c);
      if(cs.every(open))cs.forEach(x=>cnt[x]++);}
    const mx=Math.max(...free.map(i=>cnt[i]));if(mx>0){const top=free.filter(i=>cnt[i]>=mx-.5);return pickR(top);}}
  if(lv>=2){const par=free.filter(i=>(Math.floor(i/8)+i%8)%2===0);if(par.length)free=par;}
  if(!free.length)free=[...Array(64).keys()].filter(ok);return free.length?pickR(free):null;}
// the opponent worth shooting: one with a wounded ship, otherwise the one closest to sinking
function seaFoe(d,s,lv){const ts=targets(d,s);if(lv===1||ts.length<2)return pickR(ts);
  const w=o=>{const f=seaFleet(d,o)||'',sh=d.sh[o],sunk=seaSunk(f,sh);let live=0;for(let i=0;i<64;i++)if(sh[i]==='o'&&!sunk.has(f[i]))live++;return live*10-seaAfloat(f,sh)+Math.random();};
  return ts.sort((a,b)=>w(b)-w(a))[0];}
GAMES.sea.bot=(d,s,lv)=>{if(!allReady(d,S.priv)||seaSalvo(d))return d;const o=seaFoe(d,s,lv);if(o==null)return;S.tgt=o;const i=seaAim(d,s,o,lv,[]);return i==null?undefined:botDo(d,s,'fire',i);};
GAMES.sea.botPick=(d,s,lv)=>{const k=seaAfloat(seaFleet(d,s),d.sh[s]);const out=[],av={};
  for(let j=0;j<k;j++){const o=seaFoe(d,s,lv);if(o==null)break;const i=seaAim(d,s,o,lv,av[o]||[]);if(i==null)continue;(av[o]=av[o]||[]).push(i);out.push([o,i]);}return out;};

/* ---------- camel race: hard bots play out the rest of the leg many times before betting ---------- */
function camelOdds(d,runs){const win=[0,0,0,0,0],sec=[0,0,0,0,0];
  for(let k=0;k<runs;k++){let cam=d.cam.map(x=>[...x]);const left=shuffle([0,1,2,3,4].filter(c=>d.dl[c]==='0'));
    for(const c of left){cam=cMove(cam,c,1+rnd(3));if(cam[c][0]>=CTRACK)break;}const rk=cRank(cam);win[rk[0]]++;sec[rk[1]]++;}
  return {win:win.map(x=>x/runs),sec:sec.map(x=>x/runs)};}
GAMES.camel.bot=(d,s,lv)=>{const open=[0,1,2,3,4].filter(c=>CTILES[d.tk[c]]);
  if(lv===1){if(open.length&&Math.random()<.45)return botDo(d,s,'bet',pickR(open));return botDo(d,s,'roll',0);}
  const od=camelOdds(d,lv===3?400:60);let best=-1,bv=lv===3?1.05:1.5;
  for(const c of open){const v=CTILES[d.tk[c]];const ev=od.win[c]*v+od.sec[c]*1-(1-od.win[c]-od.sec[c]);if(ev>bv){bv=ev;best=c;}}
  return best>=0?botDo(d,s,'bet',best):botDo(d,s,'roll',0);};

/* ---------- lucky boxes: stop while the bag is worth more than the risk ---------- */
GAMES.luck.bot=(d,s,lv)=>{const {safe,bomb}=luckLeft(d);const p=bomb/(safe+bomb);
  if(d.bag>0){let stop;if(lv===1)stop=d.bag>=4+rnd(10);else if(lv===2)stop=d.bag>=9||p>.3;
    // hard: open again only while the coins it can win weigh more than the bag it can lose; behind near the end it pushes on
    else{const nx=Math.min(d.nx||0,safe),px=safe?nx/safe:0,gain=px*(Math.max(2,d.bag*2)-d.bag)+(1-px)*3.5;
      const lead=Math.max(...d.pts.filter((x,o)=>o!==s&&d.out[o]!=='1'))-(d.pts[s]+d.bag);const late=safe<=4&&lead>0;
      stop=!late&&p*d.bag>(1-p)*gain;}
    if(stop)return botDo(d,s,'bank',0);}
  const closed=[...d.op].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);return botDo(d,s,'m',pickR(closed));};

/* ---------- bomb wires: cut what you know is safe, pass when the odds turn bad ---------- */
// cut what you know is safe first (a scan that found the bomb makes every other wire safe). Once the known wires are gone and
// the odds turn bad, spend the one move of the bomb: the hard bot throws the bomb at whoever has no move left to throw it back,
// or, with many wires still in, scans one in secret and cuts a sure one
GAMES.wires.bot=(d,s,lv)=>{const left=[...Array(d.k).keys()].filter(i=>!d.cut.includes(i)),mine=d.kn[s]||[];
  const bad=mine.filter(i=>i<-0.5).map(i=>-i-1).find(i=>left.includes(i));const known=bad!=null?left.filter(i=>i!==bad):mine.filter(i=>i>=0&&left.includes(i));
  const unk=left.filter(i=>!known.includes(i)),risk=unk.length?1/unk.length:1,al=aliveSeats(d).filter(x=>x!==s),canPass=d.ps[s]!=='1';
  const cut=l=>botDo(d,s,'cut',pickR(l));
  const pass=()=>{let to=nextSeat(d,s);if(lv===3){const np=al.filter(x=>d.ps[x]==='1');to=np.length?pickR(np):(al.find(x=>!isBot(d,x))??to);}else if(lv===2&&Math.random()<.5)to=pickR(al);return botDo(d,s,'pass',to);};
  if(lv===1){if(known.length&&Math.random()<.5)return cut(known);if(canPass&&Math.random()<.12)return Math.random()<.5?pass():botDo(d,s,'scan',pickR(left));return cut(left);}
  if(known.length)return cut(known);
  if(canPass&&risk>(lv===3?.25:.4)){
    // a scan keeps the bomb with the others and may find it; the pass is better when only two or three wires are left
    if(lv===3&&(unk.length>3||al.every(x=>d.ps[x]!=='1'))||lv===2&&Math.random()<.3)return botDo(d,s,'scan',pickR(unk));
    return pass();}
  return cut(unk.length?unk:left);};

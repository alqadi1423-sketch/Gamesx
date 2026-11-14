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
function tttMinimax(b,me,turn,n){const w=lineWin(b,3,3);if(w)return w.w===me?10:-10;if(!b.includes('.'))return 0;let best=turn===me?-99:99;
  for(let i=0;i<9;i++)if(b[i]==='.'){const v=tttMinimax(setAt(b,i,String(turn)),me,(turn+1)%n,n);best=turn===me?Math.max(best,v):Math.min(best,v);}return best;}
GAMES.ttt.bot=(d,s,lv)=>{const cells=[...d.b].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);let i;
  if(lv===3&&d.sz===3&&d.pl.length===2){let bv=-99;for(const c of cells){const v=tttMinimax(setAt(d.b,c,String(s)),s,(s+1)%2,2)+Math.random()*.1;if(v>bv){bv=v;i=c;}}}
  else i=lineBot(d,s,lv,d.sz,d.sz,d.k,cells);return botDo(d,s,'m',i);};
GAMES.gomoku.bot=(d,s,lv)=>{const z=d.z;let cells=[...d.b].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);
  const near=cells.filter(i=>{const r=Math.floor(i/z),c=i%z;for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<z&&cc>=0&&cc<z&&d.b[rr*z+cc]!=='.')return true;}return false;});
  if(near.length)cells=near;else cells=[Math.floor(z/2)*z+Math.floor(z/2)];return botDo(d,s,'m',lineBot(d,s,lv,z,z,5,cells));};
GAMES.c4.bot=(d,s,lv)=>{const C=d.C,R=d.R;const cols=[],cells=[];for(let c=0;c<C;c++){for(let r=R-1;r>=0;r--)if(d.b[r*C+c]==='.'){cols.push(c);cells.push(r*C+c);break;}}
  let pick=lineBot(d,s,lv,R,C,4,cells);
  // do not hand the cell above to someone who wins there
  if(lv>=2){const safe=cells.filter(i=>{const up=i-C;if(up<0)return true;const b2=setAt(d.b,i,String(s));return !d.pl.some((_,o)=>!sameTeam(d,o,s)&&lineScore(b2,R,C,4,up,o)>=1e7);});
    if(safe.length&&!safe.includes(pick)&&lineScore(d.b,R,C,4,pick,s)<1e6)pick=lineBot(d,s,lv,R,C,4,safe);}
  const col=cols[cells.indexOf(pick)];return botDo(d,s,'m',col)||botDo(d,s,'c',col)||GAMES.c4.onTimeout&&GAMES.c4.onTimeout(d);};

/* ---------- dots and boxes ---------- */
GAMES.dots.bot=(d,s,lv)=>{const B=d.B;const lines=[];for(let i=0;i<d.h.length;i++)if(d.h[i]==='.')lines.push(['h',i]);for(let i=0;i<d.v.length;i++)if(d.v[i]==='.')lines.push(['v',i]);
  const sides=(h,v,r,c)=>(h[r*B+c]!=='.')+(h[(r+1)*B+c]!=='.')+(v[r*(B+1)+c]!=='.')+(v[r*(B+1)+c+1]!=='.');
  const boxesOf=([a,i])=>{const out=[];if(a==='h'){const r=Math.floor(i/B),c=i%B;if(r>0)out.push([r-1,c]);if(r<B)out.push([r,c]);}else{const r=Math.floor(i/(B+1)),c=i%(B+1);if(c>0)out.push([r,c-1]);if(c<B)out.push([r,c]);}return out;};
  const take=lines.filter(l=>boxesOf(l).some(([r,c])=>sides(d.h,d.v,r,c)===3));
  const safe=lines.filter(l=>boxesOf(l).every(([r,c])=>sides(d.h,d.v,r,c)<2));
  let l;if(lvRand(lv))l=pickR(lines);else if(take.length&&(lv>1||Math.random()<.6))l=pickR(take);else if(safe.length&&(lv>1||Math.random()<.5))l=pickR(safe);
  else{// give away the fewest boxes
    l=lines.map(x=>({x,c:boxesOf(x).filter(([r,c])=>sides(d.h,d.v,r,c)===2).length+Math.random()})).sort((a,b)=>a.c-b.c)[0].x;}
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

/* ---------- chess: alpha-beta search ---------- */
const CHVAL={p:100,n:310,b:330,r:500,q:900,k:0};
function chEval(b,side){let v=0;for(let i=0;i<64;i++){const p=b[i];if(p==='.')continue;const t=p.toLowerCase(),sd=chSide(p);let x=CHVAL[t];
    const r=i>>3,c=i&7;if(t==='p')x+=(sd?r-1:6-r)*8;if(t==='n'||t==='b')x+=(3.5-Math.abs(3.5-c))*4+(3.5-Math.abs(3.5-r))*4;v+=sd===side?x:-x;}return v;}
// big captures by small pieces first, then queen promotions
const chMvv=(b,m)=>{const t=b[m.t];return (t!=='.'?CHVAL[t.toLowerCase()]*10+1000-CHVAL[b[m.f].toLowerCase()]/10:m.ep?1990:0)+(m.pr==='q'?900:0);};
function chSearch(d,depth,a,b,side){botTick();const max=d.sd===side,ms=chPseudo(d,d.sd);let any=false;
  if(depth)ms.sort((x,y)=>chMvv(d.b,y)-chMvv(d.b,x));
  for(const m of ms){const ap=chApply(d,m);if(chCheck(ap.b,d.sd))continue;any=true;if(!depth)break;
    const v=chSearch({...d,...ap,sd:1-d.sd},depth-1,a,b,side);if(max){if(v>a)a=v;}else{if(v<b)b=v;}if(a>=b)break;}
  if(!any)return chCheck(d.b,d.sd)?(d.sd===side?-99999-depth:99999+depth):0;// a sooner mate counts more
  return depth?(max?a:b):chEval(d.b,side);}
GAMES.chess.bot=(d,s,lv)=>{const side=d.sd;if(d.offer!=null&&d.offer!==side){if(chEval(d.b,side)<-250)return {...d,win:'d',end:'agree'};}
  const ms=chLegal(d,side);if(!ms.length)return GAMES.chess.onTimeout(d);if(lv===1&&Math.random()<.5)return chMove(d,pickR(ms));
  const rm=ms.filter(m=>!m.pr||m.pr==='q').sort((x,y)=>chMvv(d.b,y)-chMvv(d.b,x));
  return chMove(d,botDeep(rm,lv===3?3:lv===2?2:1,lv===3?2:25,(m,dep,a)=>chSearch({...d,...chApply(d,m),sd:1-side},dep-1,a,1e9,side)));};
GAMES.chess.botDelay=(d,s,lv)=>600+rnd(500);

/* ---------- dama ---------- */
function dmEval(b,side){let v=0;for(const p of b){const sd=dmSide(p);if(sd<0)continue;v+=(dmKing(p)?3:1)*(sd===side?1:-1);}return v;}
function dmSearch(b,turn,depth,side,a,z){botTick();const ms=dmMoves(b,turn);if(!ms.length)return turn===side?-999-depth:999+depth;if(!depth)return dmEval(b,side);
  const max=turn===side;for(const m of ms){const v=dmSearch(dmApply({b},m).b,1-turn,depth-1,side,a,z);if(max){if(v>a)a=v;}else{if(v<z)z=v;}if(a>=z)break;}return max?a:z;}
GAMES.dama.bot=(d,s,lv)=>{const side=d.sd;const ms=dmMoves(d.b,side);if(lvRand(lv))return dmDo(d,pickR(ms));
  return dmDo(d,botDeep(ms,lv===3?4:2,.3,(m,dep,a)=>dmSearch(dmApply(d,m).b,1-side,dep-1,side,a,Infinity)));};

/* ---------- backgammon ---------- */
function tvEvalPos(t,s){let v=0;const one=s?-1:1;// fewer pips to go, more points made, fewer blots
  let pip=0,opp=0;for(let i=0;i<24;i++){const x=t.pts[i];if(tvOwn(x,s)){pip+=tvCnt(x)*(s?24-i:i+1);if(tvCnt(x)===1)v-=6;else v+=3;}else if(x){opp+=tvCnt(x)*(s?i+1:24-i);}}
  pip+=t.bar[s]*25;opp+=t.bar[1-s]*25;return v+(opp-pip)*1+t.off[s]*4;}
GAMES.tavla.bot=(d,s,lv)=>{const side=d.sd;
  if(d.ph==='open')return tvOpen(d,1+rnd(6));
  if(d.ph==='dbl'){const e=tvEvalPos(d,side===d.sd?1-d.sd:d.sd);return tvAnswer(d,lv===1||e>-25);}
  if(d.ph==='roll'){if(lv===3&&(d.own===-1||d.own===side)&&d.cube<8&&tvEvalPos(d,side)>40&&Math.random()<.5)return {...d,ph:'dbl',turn:tmNow(d,1-side),last:`${tmName(d,side)} طلب مضاعفة`};return tvRolled(d,[1+rnd(6),1+rnd(6)]);}
  if(d.ph==='move'){const al=tvAllowed(d,side,d.mv);if(!al.length)return tvAuto(d);if(lvRand(lv))return tvPlay(d,pickR(al));
    let best=al[0],bv=-1e9;for(const m of al){const t=tvMove(d,side,m.from,m.to);const v=tvEvalPos({...d,...t},side)+(t.hit?8:0)+Math.random();if(v>bv){bv=v;best=m;}}return tvPlay(d,best);}
  return tvAuto(d);};

/* ---------- baloot: its bot is in games/baloot.js ---------- */

/* ---------- hand (rummy): its bot is in games/hand.js ---------- */

/* ---------- old maid (uno and dominoes have their bots in games/cards.js, 99 and go fish in more.js) ---------- */
GAMES.oldmaid.bot=(d,s,lv)=>{const tg=nextSeat(d,s);const n=cardsOf(d.hands[tg]).length;return n?botDo(d,s,'take',rnd(n)):GAMES.oldmaid.onTimeout&&GAMES.oldmaid.onTimeout(d);};

/* ---------- dice ---------- */
// pig: a hard bot races: it banks later when behind and keeps rolling for the win when a rival is close to the goal
GAMES.pig.bot=(d,s,lv)=>{const goal=d.goal-d.sc[s],opp=Math.max(0,...d.sc.filter((_,o)=>o!==s&&d.out[o]!=='1'));
  let hold=[0,10+rnd(15),18,20][lv];if(lv===3){hold=Math.max(14,Math.min(34,21+Math.round((opp-d.sc[s])/8)));if(d.goal-opp<=15)hold=goal;}
  return botDo(d,s,(d.tot>=hold||d.tot>=goal)&&d.tot>0?'bank':'roll',0);};
GAMES.farkle.bot=(d,s,lv)=>{if(!d.rolled)return botDo(d,s,'roll',0);
  const free=[...d.dice].map((x,i)=>d.used[i]==='0'?i:-1).filter(i=>i>=0);
  // take every scoring die: triples first, then ones and fives
  const by={};free.forEach(i=>{(by[d.dice[i]]=by[d.dice[i]]||[]).push(i);});let sel=[];
  if(free.length===6&&fkScore(free.map(i=>+d.dice[i]))>=750)sel=free;else{for(const f in by)if(by[f].length>=3)sel.push(...by[f]);for(const f of ['1','5'])if(by[f]&&by[f].length<3)sel.push(...by[f]);}
  if(!sel.length)return GAMES.farkle.onTimeout(d);S.sel=sel;const sv=fkScore(sel.map(i=>+d.dice[i]));const left=free.length-sel.length;
  const bank=[0,350+rnd(300),350,300][lv];const go=left===0||(d.tot+sv<bank)||(lv===3&&left>=4&&d.tot+sv<600);
  return botDo(d,s,go?'keep':'keepbank',0);};
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
GAMES.treasure.bot=(d,s,lv)=>{const z=d.z;const free=[...d.o].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);
  const clues=[...d.o].map((c,i)=>c>='a'&&c<='z'?[i,c.charCodeAt(0)-97]:null).filter(Boolean);
  const ok=free.filter(i=>clues.every(([j,k])=>Math.abs(Math.floor(i/z)-Math.floor(j/z))+Math.abs(i%z-j%z)===k));
  return botDo(d,s,'m',(ok.length&&!lvRand(lv)&&(lv===3||Math.random()<.6)?pickR(ok):pickR(free)));};
// each bot remembers the cards it has seen turned over; easy bots forget most of them
const memOf=(d,s)=>{if(!S.botMem||S.botMem.g!==d.gid)S.botMem={g:d.gid,m:{}};return S.botMem.m[s]||(S.botMem.m[s]={});};
GAMES.memory.botSee=nd=>{for(const i of nd.open||[])nd.pl.forEach((_,s)=>{if(isBot(nd,s)&&Math.random()<[0,.35,.7,.95][botLv(nd,s)])memOf(nd,s)[i]=nd.dk[i];});};
GAMES.memory.bot=(d,s,lv)=>{const K=memOf(d,s);const op=(d.open||[]).length===2?[]:(d.open||[]);
  const free=[...d.own].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);const known=free.filter(i=>i in K),unknown=free.filter(i=>!(i in K)&&!op.includes(i));
  if(op.length===1){const f=op[0],e=d.dk[f];const m=known.find(i=>i!==f&&K[i]===e);return botDo(d,s,'m',m!=null?m:unknown.length?pickR(unknown):pickR(free.filter(i=>i!==f)));}
  for(const i of known)for(const j of known)if(i<j&&K[i]===K[j])return botDo(d,s,'m',i);
  return botDo(d,s,'m',unknown.length?pickR(unknown):pickR(free));};
GAMES.simon.bot=(d,s,lv)=>{const n=d.seq.length;const okP=Math.pow([0,.9,.96,.99][lv],n);
  if(Math.random()<okP)return {...d,seq:d.seq+rnd(4),turn:nextSeat(d,s),last:`${nm(d,s)} كرر ${n} وزاد لون`};
  const out=setAt(d.out,s,'1');const al=aliveSeats(d,out);return {...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,s,out),last:`${nm(d,s)} غلط وطلع`};};
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
GAMES.close.botPick=(d,s,lv)=>{const Q=GAMES.close.q(d,d.rd);const a=Q[1];const err=[0,.45,.22,.08][lv];return Math.max(0,Math.round(a*(1+(Math.random()*2-1)*err)));};
GAMES.rps.botPick=()=>rnd(3);

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
  const sf=unk.filter(j=>safe.has(j));if(sf.length&&(lv===3||Math.random()<.75))return botDo(d,s,'m',pickR(sf));
  const total=(MNS[d.pl.length]||[10,20])[1];const rest=Math.max(0,total-[...mine].length),cand=unk.filter(j=>!mine.has(j));
  const p=j=>{let x=-1;for(const i of nb(j)){if(d.rv[i]==='.'||d.m[i]==='1')continue;const ns=nb(i);const u=ns.filter(q=>d.rv[q]==='.'&&!mine.has(q)).length;const km=ns.filter(q=>mine.has(q)).length;if(u)x=Math.max(x,(mineCount(d.m,z,i)-km)/u);}
    return x<0?rest/Math.max(1,cand.length):x;};
  if(!cand.length)return botDo(d,s,'m',pickR(unk));
  return botDo(d,s,'m',cand.map(j=>[j,p(j)+Math.random()*(lv===3?.02:.15)]).sort((a,b)=>a[1]-b[1])[0][0]);};

/* ---------- colour war: take the move that leaves the most of the board ---------- */
GAMES.cw.botEval=(nd,s)=>{const ts=String(s);let v=0;for(let i=0;i<nd.o.length;i++){if(nd.o[i]===ts)v+=3+ +nd.n[i]*.3;else if(nd.o[i]!=='.')v-=1;}return v;};
GAMES.cw.bot=(d,s,lv)=>botGreedy(GAMES.cw,d,s,lv);

/* ---------- ultimate tic tac toe: its bot is in more.js ---------- */

/* ---------- bingo ---------- */
GAMES.bingo.bot=(d,s,lv)=>{const open=[];for(let n=1;n<=25;n++)if(d.called[n-1]==='0')open.push(n);if(lvRand(lv))return botDo(d,s,'m',pickR(open));
  const L5=[];for(let r=0;r<5;r++){L5.push([0,1,2,3,4].map(c=>r*5+c));L5.push([0,1,2,3,4].map(c=>c*5+r));}L5.push([0,6,12,18,24],[4,8,12,16,20]);
  const gain=(card,n)=>{const p=card.indexOf(n);let v=0;for(const L of L5)if(L.includes(p)){const c=L.filter(q=>d.called[card[q]-1]==='1').length;v+=c===4?100:(c+1)*(c+1);}return v;};
  const mine=bingoCard(d,s);// only its own card: the others' cards are hidden from players
  const val=n=>gain(mine,n)+Math.random();
  return botDo(d,s,'m',open.sort((a,b)=>val(b)-val(a))[0]);};

/* ---------- number party games ---------- */
// لو خيروك: the cleverer bots vote as one block (the same side for this question), so together they are the majority more often
GAMES.major.botPick=(d,s,lv)=>{const bloc=Math.floor(srng(d,'mjb'+d.rd)()*2);return lv===3?bloc:lv===2&&Math.random()<.75?bloc:rnd(2);};

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
GAMES.wires.bot=(d,s,lv)=>{const left=[...Array(d.k).keys()].filter(i=>!d.cut.includes(i));const known=(d.kn[s]||[]).filter(i=>left.includes(i));
  if(known.length&&(lv>1||Math.random()<.5))return botDo(d,s,'cut',pickR(known));
  if(d.ps[s]!=='1'&&lv>1&&1/left.length>(lv===3?.25:.4))return botDo(d,s,'pass',0);
  // wires that other players are known to know about are not marked, so guess among the rest
  return botDo(d,s,'cut',pickR(left));};

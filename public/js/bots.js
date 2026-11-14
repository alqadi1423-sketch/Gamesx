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
  function ng(p,dep,a,z,left){if(!(++nodes&255)&&performance.now()>lim)throw STOP;if(!left)return 0;if(!dep)return ev(p);
    for(const c of ord){const r=h[c];if(r<0)continue;b[r*C+c]=p;const w=won(r,c,p);b[r*C+c]=-1;if(w)return 1e6+dep;}
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

/* ---------- reversi ---------- */
GAMES.rev.bot=(d,s,lv)=>{const z=d.z;const mv=[];for(let i=0;i<z*z;i++){const f=revFlips(d.b,z,i,s);if(f.length)mv.push({i,f:f.length});}if(!mv.length)return GAMES.rev.onTimeout(d);
  if(lvRand(lv))return botDo(d,s,'m',pickR(mv).i);
  const val=({i,f})=>{const r=Math.floor(i/z),c=i%z,edge=r===0||c===0||r===z-1||c===z-1,corner=(r===0||r===z-1)&&(c===0||c===z-1),nearC=(r<=1||r>=z-2)&&(c<=1||c>=z-2)&&!corner;
    return f+(corner?50:0)+(edge?4:0)-(nearC&&lv===3?12:0)+Math.random();};
  mv.sort((a,b)=>val(b)-val(a));return botDo(d,s,'m',mv[0].i);};

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

/* ---------- baloot ---------- */
GAMES.baloot.bot=(d,s,lv)=>{if(d.ph==='sum')return bNext(d);const h=bActHand(d);const H=cardsOf(d.hands[h]);
  if(d.ph==='bid'){const o=bBidOpts(d);const su=d.pub[1];const n=x=>H.filter(c=>c[1]===x).length,has=c=>H.includes(c);
    const aces=H.filter(c=>c[0]==='A').length+(d.pub[0]==='A'?1:0),tens=H.filter(c=>c[0]==='T').length;
    if(lvRand(lv))return bBid(d,'pass');
    if(o.includes('sun')&&aces+tens/2>=(lv===3?2.5:3))return bBid(d,'sun');
    if(o.includes('hokm')&&(has('J'+su)||has('9'+su))&&n(su)>=2)return bBid(d,'hokm');
    if(o.includes('hokm2')){for(const x of 'shdc'){if(x===su)continue;if(H.includes('J'+x)&&H.includes('9'+x)&&n(x)>=3)return bBid(d,'hokm2',x);}}
    return bBid(d,'pass');}
  if(d.ph==='dbl')return bDbl(d,'no');
  let x=d;if(cardsOf(d.pd).length===0&&!d.bq){const bq=[0,1,2,3].map(y=>d.md==='h'&&cardsOf(d.hands[y]).includes('K'+d.tr)&&cardsOf(d.hands[y]).includes('Q'+d.tr));x={...d,bq};}
  if(cardsOf(x.pd).length<4&&!x.pj[h].length&&lv>1){const pj=bProjects(x.hands[h],x.md);if(pj.length){const p=[...x.pj];p[h]=pj;x={...x,pj:p,last:`${bName(x,h)} أعلن ${pj.map(bPName).join(' + ')}`};}}
  const L=bLegal(x,h);if(lvRand(lv))return bPlay(x,pickR(L));
  const tk=cardsOf(x.tk);const str=c=>bStr(x,c),val=c=>bVal(x,c);
  if(!tk.length){// lead the strongest sure card, otherwise the lowest
    const top=L.filter(c=>bIsTop(x,c)&&!(x.md==='h'&&c[1]===x.tr));if(top.length)return bPlay(x,top.sort((a,b)=>val(b)-val(a))[0]);return bPlay(x,L.sort((a,b)=>val(a)-val(b))[0]);}
  const wi=bTrickWin(x,tk);const partnerWins=(tk.length===2&&wi===0)||(tk.length===3&&wi===1);
  if(partnerWins)return bPlay(x,L.sort((a,b)=>val(b)-val(a))[0]);// feed points to the partner
  const beats=L.filter(c=>bTrickWin(x,[...tk,c])===tk.length);
  if(beats.length)return bPlay(x,beats.sort((a,b)=>str(a)-str(b))[0]);
  return bPlay(x,L.sort((a,b)=>val(a)-val(b))[0]);};

// the summary after a deal stays on screen long enough to read
GAMES.baloot.botDelay=(d,s,lv)=>d.ph==='sum'?8000:d.ph==='play'?700+rnd(700):1000+rnd(800);

/* ---------- hand (rummy) ---------- */
function handFind(hc){const res=[];let left=[...hc];
  for(const r of HRK){const cs=left.filter(c=>c[0]===r);const su=[],pick=[];for(const c of cs)if(!su.includes(c[1])){su.push(c[1]);pick.push(c);}if(pick.length>=3){const g=pick.slice(0,4);res.push(g);for(const c of g)left.splice(left.indexOf(c),1);}}
  for(const s of 'shdc'){const cs=[...new Set(left.filter(c=>c[1]===s).map(hRank))].sort((a,b)=>a-b);let run=[];
    const flush=()=>{if(run.length>=3){const g=run.map(v=>HRK[v-1]+s);res.push(g);for(const c of g)left.splice(left.indexOf(c),1);}run=[];};
    for(const v of cs){if(run.length&&v!==run[run.length-1]+1)flush();run.push(v);}flush();}
  for(const j of left.filter(hJ)){left.splice(left.indexOf(j),1);let done=false;
    for(let a=0;a<left.length&&!done;a++)for(let b=a+1;b<left.length&&!done;b++){const g=[left[a],left[b],j];if(hMeld(g)){res.push(g);const A=left[a],B=left[b];left.splice(left.indexOf(A),1);left.splice(left.indexOf(B),1);done=true;}}
    if(!done)left.push(j);}
  return {res,left};}
GAMES.hand.bot=(d,s,lv)=>{if(d.ph==='sum')return hNewRound({...d,r:d.r+1});
  let x=d;const t=d.turn;
  if(x.ph==='draw'){const top=x.disc.slice(-2);if(lv===3&&top&&x.op[t]==='1'){const hc=cardsOf(x.hands[t]),g=handFind([...hc,top]).res.find(g=>g.includes(top));if(g&&hc.length>=g.length)return hDraw(x,true);}return hDraw(x,false);}
  // the card taken from the ground goes down first; if it cannot, it goes back and the bot draws like everyone else
  if(x.took){const hc=cardsOf(x.hands[t]),g=handFind(hc).res.find(g=>g.includes(x.took));const r=g&&hc.length>g.length?hLay(x,[g]):null;
    if(r&&r.d)x=r.d;else{const back=[...x.hands];hc.splice(hc.indexOf(x.took),1);back[t]=hc.join('');x=hDraw({...x,hands:back,disc:x.disc+x.took,took:null,ph:'draw'},false);}}
  if(lv>1||Math.random()<.5){const hc=cardsOf(x.hands[t]);const {res}=handFind(hc);if(res.length){let tot=0,cnt=hc.length;const use=[];for(const g of res){if(cnt-g.length<1)break;use.push(g);cnt-=g.length;tot+=hValue(hMeld(g));}
      if(use.length&&(x.op[t]==='1'||tot>=x.req||cnt===1)){const r=hLay(x,use);if(r.d)x=r.d;}}
    if(x.op[t]==='1'){let ch=true,g=0;while(ch&&g++<20){ch=false;const h2=cardsOf(x.hands[t]);if(h2.length<=1)break;
      for(const c of h2){if(hJ(c)||c===x.took)continue;for(let i=0;i<x.melds.length;i++){const m2=hAdd(x.melds[i],c);if(m2){const melds=[...x.melds];melds[i]={...m2,o:x.melds[i].o};const h3=[...h2];h3.splice(h3.indexOf(c),1);const hands=[...x.hands];hands[t]=h3.join('');x={...x,melds,hands,tm:x.tm+1,lo:x.lo||x.melds[i].o!==t};ch=true;break;}}if(ch)break;}}}}
  const hc=cardsOf(x.hands[t]);const keep=new Set(handFind(hc).res.flat());const cand=hc.filter(c=>!hJ(c)&&!keep.has(c));
  const dc=(cand.length?cand:hc.filter(c=>!hJ(c)).length?hc.filter(c=>!hJ(c)):hc).sort((a,b)=>hPen(b)-hPen(a))[lv===1?rnd(Math.min(3,hc.length)):0]||hc[0];
  return hDiscard(x,dc)||x;};
// the round scores stay on screen long enough to read
GAMES.hand.botDelay=(d,s,lv)=>d.ph==='sum'?8000:BOTMS[lv]+rnd(600);

/* ---------- uno, domino, 99, old maid, go fish ---------- */
GAMES.uno.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);
  // first catch whoever went down to one card without saying «أونو»
  if(d.uno>=0&&d.uno!==s&&Math.random()<[0,.5,.8,1][lv])return botDo(d,s,'catch',0);
  // the bot says «أونو» (easy ones often forget) on its own move, not through the shared button flag
  const say=H.length===2&&Math.random()<[0,.5,.9,1][lv],uno=nd=>nd&&H.length===2&&cardsOf(nd.hands[s]).length===1?{...nd,uno:say?-1:s}:nd;
  const ok=H.map((c,i)=>uPlayable(c,d,H)?i:-1).filter(i=>i>=0);
  if(!ok.length)return botDo(d,s,d.drew?'pass':'draw',0);
  const next=uStep(d,s,1,d.dir),danger=cardsOf(d.hands[next]).length<=2;
  let i=ok[0];if(lvRand(lv))i=pickR(ok);else{const rank=c=>(c[0]==='k'?(c[1]==='F'?(danger?9:-3):-2):'DSR'.includes(c[1])?(danger?6:1):2)+(c[0]===d.color?.5:0);i=ok.sort((a,b)=>rank(H[b])-rank(H[a]))[0];}
  if(H[i][0]==='k'){const cnt={};H.forEach(c=>{if(c[0]!=='k')cnt[c[0]]=(cnt[c[0]]||0)+1;});const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||'rgby'[rnd(4)];S.wild=i;return uno(botDo(d,s,'wc','rgby'.indexOf(best)));}
  return uno(botDo(d,s,'play',i));};
GAMES.domino.bot=(d,s,lv)=>{const H=d.hands[s].match(/.{2}/g)||[];const ok=H.map((t,i)=>domFits(t,d).some(x=>x)?i:-1).filter(i=>i>=0);
  if(!ok.length)return botDo(d,s,d.bone.length?'draw':'pass',0);
  const i=lvRand(lv)?pickR(ok):ok.sort((a,b)=>(+H[b][0]+ +H[b][1]+(H[b][0]===H[b][1]?3:0))-(+H[a][0]+ +H[a][1]+(H[a][0]===H[a][1]?3:0)))[0];
  const [fl,fr]=domFits(H[i],d);if(fl&&fr&&d.ch&&d.ch[0]!==d.ch[d.ch.length-1]&&H[i][0]!==H[i][1])return botDo(d,s,Math.random()<.5?'L':'R',i);return botDo(d,s,'play',i);};
GAMES.n99.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);const ok=H.map((c,i)=>v99(c,d.tot)<=99?i:-1).filter(i=>i>=0);if(!ok.length)return GAMES.n99.play(d,-1);
  if(lvRand(lv))return GAMES.n99.play(d,pickR(ok));const special=c=>'K4T9'.includes(c[0]);
  ok.sort((a,b)=>(special(H[a])-special(H[b]))||(v99(H[b],d.tot)-v99(H[a],d.tot)));return GAMES.n99.play(d,ok[0]);};
GAMES.oldmaid.bot=(d,s,lv)=>{const tg=nextSeat(d,s);const n=cardsOf(d.hands[tg]).length;return n?botDo(d,s,'take',rnd(n)):GAMES.oldmaid.onTimeout&&GAMES.oldmaid.onTimeout(d);};
GAMES.fish.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);if(!H.length)return botDo(d,s,'draw',0);
  const ranks={};H.forEach(c=>{ranks[c[0]]=(ranks[c[0]]||0)+1;});const r=lvRand(lv)?pickR(Object.keys(ranks)):Object.keys(ranks).sort((a,b)=>ranks[b]-ranks[a])[0];
  const others=aliveSeats(d).filter(x=>x!==s&&cardsOf(d.hands[x]).length);if(!others.length)return botDo(d,s,'draw',0);
  S.tgt=lv===3?others.sort((a,b)=>cardsOf(d.hands[b]).length-cardsOf(d.hands[a]).length)[0]:pickR(others);return botDo(d,s,'ask',RANKS.indexOf(r));};

/* ---------- dice ---------- */
GAMES.pig.bot=(d,s,lv)=>{const hold=[0,10+rnd(15),18,20][lv];const goal=d.goal-d.sc[s];return botDo(d,s,(d.tot>=hold||d.tot>=goal)&&d.tot>0?'bank':'roll',0);};
GAMES.farkle.bot=(d,s,lv)=>{if(!d.rolled)return botDo(d,s,'roll',0);
  const free=[...d.dice].map((x,i)=>d.used[i]==='0'?i:-1).filter(i=>i>=0);
  // take every scoring die: triples first, then ones and fives
  const by={};free.forEach(i=>{(by[d.dice[i]]=by[d.dice[i]]||[]).push(i);});let sel=[];
  if(free.length===6&&fkScore(free.map(i=>+d.dice[i]))>=750)sel=free;else{for(const f in by)if(by[f].length>=3)sel.push(...by[f]);for(const f of ['1','5'])if(by[f]&&by[f].length<3)sel.push(...by[f]);}
  if(!sel.length)return GAMES.farkle.onTimeout(d);S.sel=sel;const sv=fkScore(sel.map(i=>+d.dice[i]));const left=free.length-sel.length;
  const bank=[0,350+rnd(300),350,300][lv];const go=left===0||(d.tot+sv<bank)||(lv===3&&left>=4&&d.tot+sv<600);
  return botDo(d,s,go?'keep':'keepbank',0);};
GAMES.yatzy.bot=(d,s,lv)=>{const card=d.cards[s];
  if(d.rolls===0)return botDo(d,s,'roll',0);
  const dice=[...d.dice].map(Number);const cnt=[0,0,0,0,0,0,0];dice.forEach(x=>cnt[x]++);
  const best=yOpts(card,d.dice).sort((a,b)=>b[1]-a[1])[0];
  const good=best&&((best[0]>=8&&best[1]>0)||best[1]>=25);
  if(d.rolls<3&&!good&&!lvRand(lv)){// keep the most common face (or a straight)
    let keep='00000';const f=cnt.indexOf(Math.max(...cnt.slice(1)));
    const st=[1,2,3,4,5,6].filter(x=>cnt[x]);const run=st.length>=4&&card[10]<0;
    keep=dice.map((x,i)=>run?(dice.indexOf(x)===i?'1':'0'):(x===f?'1':'0')).join('');
    if(keep!==d.held)return {...d,held:keep};return botDo(d,s,'roll',0);}
  if(d.rolls<3&&lvRand(lv)&&Math.random()<.5)return botDo(d,s,'roll',0);
  const o=yOpts(card,d.dice);const w=k=>k<6?(k+1)*3:[25,30,20,30,35,40,45,22][k-6]||20;
  const pick=o.sort((a,b)=>(b[1]-w(b[0])*.6)-(a[1]-w(a[0])*.6))[0];return botDo(d,s,'score',pick[0]);};
GAMES.liar.bot=(d,s,lv)=>{const p=S.priv[d.pl[s]];const mine=p&&p.r===d.r?[...p.dice].map(Number):[];
  const total=d.n.reduce((a,b,i)=>a+(d.out[i]==='1'?0:b),0),others=total-mine.length;
  const exp=f=>mine.filter(x=>x===f||(f!==1&&x===1)).length+others*(f===1?1/6:1/3);
  if(d.bid){const e=exp(d.bid.f);const doubt=d.bid.q-e;if(doubt>[0,2.5,1.4,.9][lv])return botDo(d,s,lv===3&&Math.abs(doubt)<.3&&Math.random()<.3?'calza':'call',0);}
  // bid on the face we hold most of
  const faces=[2,3,4,5,6].sort((a,b)=>exp(b)-exp(a));let f=faces[0],q=Math.max(1,Math.floor(exp(f)));
  if(d.bid){if(!liarOk(d.bid,q,f)){q=d.bid.f===1?d.bid.q*2+1:d.bid.q+(f>d.bid.f?0:1);if(!liarOk(d.bid,q,f))q=d.bid.q+1;}}
  if(!liarOk(d.bid,q,f)){f=d.bid?Math.max(2,d.bid.f):2;q=d.bid?d.bid.q+1:1;}
  S.lq=q;S.lf=f;return botDo(d,s,'bid',0)||(d.bid?botDo(d,s,'call',0):undefined);};
GAMES.shut.bot=(d,s,lv)=>{const b=d.boxes[s];if(!d.roll){const small=b.slice(6)==='000';return botDo(d,s,small&&lv>1?'roll1':'roll',0);}
  const open=[...b].map((c,k)=>c==='1'?k+1:0).filter(Boolean);let best=null;
  const go=(i,sum,set)=>{if(sum===d.roll){const key=lv===1?Math.random():set.length*-1;if(!best||key<best.k)best={set:[...set],k:key};return;}if(sum>d.roll||i<0)return;go(i-1,sum+open[i],[...set,open[i]]);go(i-1,sum,set);};
  go(open.length-1,0,[]);if(!best)return GAMES.shut.onTimeout(d);S.sel=best.set;return botDo(d,s,'ok',0);};
GAMES.bj.bot=(d,s,lv)=>{if(d.ph==='done')return bjNewRound(d);const h=d.hs[s][d.hi[s]];if(!h)return bjAct(d,'stand');const v=bjVal(h.c),up=Math.min(10,rv(d.dl)===1?11:rv(d.dl)>10?10:rv(d.dl));
  if(lv===1)return bjAct(d,v<15||Math.random()<.2&&v<19?'hit':'stand');
  const soft=cardsOf(h.c).some(c=>rv(c)===1)&&bjVal(h.c.replace(/A./,'2c'))!==v;
  if(lv===3&&h.c.length===4){const free=d.chips[s]-bjCommitted(d.hs[s]);if(bj10(h.c)===bj10(h.c.slice(2))&&d.hs[s].length===1&&free>=h.b&&(rv(h.c)===1||rv(h.c)===8))return bjAct(d,'split');
    if(free>=h.b&&(v===11||(v===10&&up<10)||(v===9&&up>=3&&up<=6)))return bjAct(d,'dbl');}
  if(soft)return bjAct(d,v<=17||(v===18&&up>=9)?'hit':'stand');
  return bjAct(d,v<=11||(v<=16&&up>=7)||(v===12&&up<=3)?'hit':'stand');};
// the dealer's cards and each hand's result stay on screen long enough to read
GAMES.bj.botDelay=(d,s,lv)=>d.ph==='done'?7000:BOTMS[lv]+rnd(d.ph==='bet'?2500:600);
GAMES.bj.botPick=(d,s,lv)=>Math.max(10,Math.min(d.chips[s],[0,50+rnd(150),100,Math.round(d.chips[s]*.1/10)*10][lv]));

/* ---------- monopoly ---------- */
GAMES.mono.bot=(d,s,lv)=>{const keep=[0,50,150,250][lv];
  if(d.offer&&d.offer.to===s){const nd=lv===1&&Math.random()<.4?mTrade(d):null;return nd||{...d,offer:null,last:`${nm(d,s)} رفض الصفقة`};}
  if(d.ph==='buy'){const i=d.pos[s];return d.cash[s]-mPrice(i)>=keep||(lv===1&&d.cash[s]>=mPrice(i))?mBuy(d):mSkip(d);}
  if(d.ph==='roll'){if(d.jail[s]&&d.free[s])return botDo(d,s,'free',0);if(d.jail[s]&&d.cash[s]>=50&&lv>1&&d.turns<12*d.pl.length)return botDo(d,s,'bail',0);
    // build when a colour is complete
    if(lv>1){for(let i=0;i<40;i++)if(mCanBuild(d,s,i)&&d.cash[s]-MP[i][5]>=keep)return botDo(d,s,'bld',i);for(let i=0;i<40;i++)if(mCanUnm(d,s,i)&&d.cash[s]-mUnmCost(i)>=keep*2)return botDo(d,s,'unm',i);}
    return mRoll(d);}
  if(d.ph==='end'){if(lv>1)for(let i=0;i<40;i++)if(mCanBuild(d,s,i)&&d.cash[s]-MP[i][5]>=keep)return botDo(d,s,'bld',i);return mEnd(d);}
  return mAuto(d);};
GAMES.mono.botPick=(d,s,lv)=>{const i=d.auc;if(i==null)return 0;const price=mPrice(i);const want=[0,.5+Math.random()*.6,.85,1.05][lv]*price;const own=MP[i][0]==='p'?MGRP[MP[i][3]].filter(j=>d.own[j]===String(s)).length:0;
  return Math.max(0,Math.min(d.cash[s]-[0,0,100,150][lv],Math.round(want*(1+own*.25)/10)*10));};

/* ---------- small strategy games ---------- */
GAMES.nim.bot=(d,s,lv)=>{const x=d.p.reduce((a,b)=>a^b,0);let pi=-1,j=0;
  if(x&&!lvRand(lv)&&(lv===3||d.pl.length===2)){for(let k=0;k<d.p.length;k++){const t=d.p[k]^x;if(t<d.p[k]){pi=k;j=t;break;}}}
  if(pi<0){const ne=d.p.map((v,k)=>v?k:-1).filter(k=>k>=0);pi=pickR(ne);j=rnd(d.p[pi]);}return botDo(d,s,'take',pi*100+j);};
GAMES.c31.bot=(d,s,lv)=>{// say tgt-1 to make the next player reach the target
  const need=(d.tgt-1-d.n)%4;let k=need>=1&&need<=3&&!lvRand(lv)?need:1+rnd(3);if(d.n+k>d.tgt)k=d.tgt-d.n;return botDo(d,s,'add',k);};
GAMES.num.bot=(d,s,lv)=>{const n=lvRand(lv)?d.lo+rnd(d.hi-d.lo+1):lv===3?Math.floor((d.lo+d.hi)/2):d.lo+Math.floor((d.hi-d.lo)*(0.3+Math.random()*.4));return botDo(d,s,'n',n);};
GAMES.mm.bot=(d,s,lv)=>{let cands=[];for(let i=0;i<1296;i++){const g=[i%6,Math.floor(i/6)%6,Math.floor(i/36)%6,Math.floor(i/216)%6].join('');if(d.h.every(x=>mmScore(g,x.g).join()===mmScore(d.code,x.g).join()))cands.push(g);}
  const g=lvRand(lv)||!cands.length?[0,0,0,0].map(()=>rnd(6)).join(''):(lv===2&&Math.random()<.4?[0,0,0,0].map(()=>rnd(6)).join(''):pickR(cands));S.mm=[...g].map(Number);return botDo(d,s,'go',0);};
GAMES.hilo.bot=(d,s,lv)=>{const cur=d.dk.slice(d.p*2,d.p*2+2);const r=rv(cur);
  // hard bots count the cards already shown, the others assume a fresh deck
  const seen={};if(lv===3)for(let k=0;k<=d.p;k++){const x=rv(d.dk.slice(k*2,k*2+2));seen[x]=(seen[x]||0)+1;}
  const per=(d.pl.length>4?8:4);let hi=0,lo=0,tot=0;for(let x=1;x<=13;x++){const n=Math.max(0,per-(seen[x]||0));tot+=n;if(x>r)hi+=n;else if(x<r)lo+=n;}
  const ph=hi/tot,pl=lo/tot,best=Math.max(ph,pl);
  if(d.stk>0){const need=d.goal-d.pts[s];const risk=1-best;const stop=lv===1?d.stk>=1+rnd(4):lv===2?(d.stk>=3||risk>.42):(d.stk>=need||risk*(d.stk+1)>best*1.1||(d.stk>=4&&risk>.3));if(stop)return botDo(d,s,'bank',0);}
  return botDo(d,s,lvRand(lv)?(Math.random()<.5?'hi':'lo'):ph>=pl?'hi':'lo',0);};
GAMES.war.botPick=(d,s,lv)=>{const used=(S.priv[d.pl[s]]||{}).used||[];const free=[1,2,3,4,5,6,7].filter(c=>!used.includes(c));if(!free.length)return null;
  // the prize of this round is d.prize (drawn when the round starts, see more.js)
  const pr=d.prize!=null?d.prize:4;const pick=lv===1?pickR(free):free.sort((a,b)=>Math.abs(a-pr-(lv===3?rnd(2):0))-Math.abs(b-pr-(lv===3?rnd(2):0)))[0];
  const p=S.priv[d.pl[s]]||{};S.priv[d.pl[s]]={...p,gid:d.gid,used:[...used,pick]};return pick;};
GAMES.word.bot=(d,s,lv)=>{const F='اليمنوتبرعهدسقكحفجشصطخثزغضذظ';const left=[...F].filter(c=>!d.g.includes(c)&&ALPHA.includes(c));const c=lvRand(lv)?pickR(left):left[0];return botDo(d,s,'k',ALPHA.indexOf(c));};
GAMES.treasure.bot=(d,s,lv)=>{const z=d.z;const free=[...d.o].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);
  const clues=[...d.o].map((c,i)=>c>='a'&&c<='z'?[i,c.charCodeAt(0)-97]:null).filter(Boolean);
  const ok=free.filter(i=>clues.every(([j,k])=>Math.abs(Math.floor(i/z)-Math.floor(j/z))+Math.abs(i%z-j%z)===k));
  if(lv===3&&ok.length>1){// every fitting cell wins as often; hard digs the one whose clue tells the next player the least
    const left=c=>{const g={};for(const j of ok)if(j!==c){const k=Math.abs(Math.floor(j/z)-Math.floor(c/z))+Math.abs(j%z-c%z);g[k]=(g[k]||0)+1;}return Object.values(g).reduce((a,x)=>a+x*x,0);};
    return botDo(d,s,'m',ok.map(c=>[c,left(c)+Math.random()]).sort((a,b)=>b[1]-a[1])[0][0]);}
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
  if(d.hp[s]<35&&lv>1&&Math.random()<.7)return {a:Math.random()<.6?'heal':'def',t:weak};if(d.en[s]>=3)return {a:'spc',t:weak};return {a:'atk',t:weak};};
GAMES.tapwar.botPick=(d,s,lv)=>({ok:true,ms:[0,18,27,35][lv]+rnd(8)});

/* ---------- party and word games ---------- */
GAMES.wasla.botPick=(d,s,lv)=>{const mine=(d.gs||[])[s]||[];const ans=WNORM(WASLA[d.ans]);
  let c=WASLA.map(WNORM).filter(w=>mine.every(g=>wScore(g,w).join()===wScore(g,ans).join()));
  if(lvRand(lv)||!c.length||(lv===2&&Math.random()<.3))return WNORM(pickR(WASLA));return pickR(c);};
GAMES.bara.botPick=(d,s,lv)=>{if(d.ph==='see')return 1;const o=d.pl.map((_,x)=>x).filter(x=>x!==s);return pickR(o);};
GAMES.bara.bot=(d,s,lv)=>{if(d.ph==='cat')return baraStart(d,rnd(BARA.length));if(d.ph==='ask')return baraAsked(d);if(d.ph==='more')return {...d,ph:'vote',rd:d.rd+1,last:'بدأ التصويت'};
  if(d.ph==='guess'){const right=Math.random()<[0,.25,.4,.55][lv];return baraGuess(d,right?d.w:pickR(d.opts.filter(i=>i!==d.w)));}return GAMES.bara.onTimeout(d);};
GAMES.mafia.botPick=(d,s,lv)=>{const r=d.roles[s];if(d.ph==='role')return 1;const al=aliveSeats(d).filter(x=>x!==s);
  // medium and hard mafia bots pick the same victim; the hard detective remembers everyone it checked
  const K=memOf(d,s),M=memOf(d,'m'),gang=l=>{if(lv<2||!l.length)return pickR(l);if(!l.includes(M[d.rd]))M[d.rd]=pickR(l);return M[d.rd];};
  if(d.inv&&d.inv.s===s)K['c'+d.inv.t]=d.inv.m;
  if(d.ph==='night'){if(r==='m')return gang(al.filter(x=>d.roles[x]!=='m'));if(r==='d')return pickR(aliveSeats(d).filter(x=>x!==d.ls));
    if(r==='t'){const nw=al.filter(x=>!('c'+x in K));return pickR(lv===3&&nw.length?nw:al);}return -1;}
  const bad=lv===3?al.find(x=>K['c'+x]===true):undefined;if(bad!=null)return bad;
  if(d.inv&&d.inv.s===s&&d.inv.m&&d.out[d.inv.t]!=='1')return d.inv.t;if(r==='m')return gang(al.filter(x=>d.roles[x]!=='m'))??pickR(al);return Math.random()<.15?-1:pickR(al);};
GAMES.close.botPick=(d,s,lv)=>{const Q=GAMES.close.q(d,d.rd);const a=Q[1];const err=[0,.45,.22,.08][lv];return Math.max(0,Math.round(a*(1+(Math.random()*2-1)*err)));};
GAMES.rps.botPick=()=>rnd(3);

/* ---------- race games ---------- */
// rolling returns with roll set when there is a real choice; the bot picks its piece on the next tick
GAMES.ludo.bot=(d,s,lv)=>{if(S.rolling)return d;if(d.roll==null)return luRoll(d);const r=d.roll,mv=luMovable(d,s,r);if(!mv.length)return GAMES.ludo.onTimeout(d);
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
  const val=([i,o])=>{const nd=jkPlay(d,i,o);if(nd.win!=null&&(nd.win===s||(nd.wins||[]).includes(s)))return 1e9;let v=0;
    for(let p=0;p<n;p++)for(let k=0;k<4;k++){const x=pos(nd.mb[p*4+k])-pos(d.mb[p*4+k]);v+=team.includes(p)?x:-x*(lv===3?.9:.5);}
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

/* ---------- ultimate tic tac toe ---------- */
GAMES.uxo.bot=(d,s,lv)=>{const legal=[];for(let i=0;i<81;i++){const k=Math.floor(i/9);if(d.b[i]==='.'&&d.w[k]==='.'&&(d.nb<0||d.nb===k))legal.push(i);}
  if(!legal.length)return;if(lvRand(lv))return botDo(d,s,'m',pickR(legal));const me=String(s);
  const winsAt=(str,ch)=>[...str].map((c,i)=>c==='.'&&line3(setAt(str,i,ch))===ch?i:-1).filter(i=>i>=0);
  const others=d.pl.map((_,o)=>o).filter(o=>!sameTeam(d,o,s)).map(String);
  const val=i=>{const k=Math.floor(i/9),j=i%9;const b=setAt(d.b,i,me),sm=small(b,k);let v=0,w=d.w;
    if(line3(sm)===me){w=setAt(w,k,me);v+=60;if(line3(w)===me)return 1e9;v+=winsAt(w,me).length*25;}
    if(others.some(o=>winsAt(small(d.b,k),o).includes(j)))v+=45;// block
    if(others.some(o=>winsAt(d.w,o).includes(k)))v+=40;
    // where the next player is sent
    const nw=w[j]!=='.'||!small(b,j).includes('.');if(nw)v-=lv===3?30:10;else{if(others.some(o=>winsAt(small(b,j),o).length))v-=lv===3?50:15;}
    v+=[3,1,3,1,4,1,3,1,3][j];return v+Math.random()*2;};
  return botDo(d,s,'m',legal.sort((a,b)=>val(b)-val(a))[0]);};

/* ---------- bingo ---------- */
GAMES.bingo.bot=(d,s,lv)=>{const open=[];for(let n=1;n<=25;n++)if(d.called[n-1]==='0')open.push(n);if(lvRand(lv))return botDo(d,s,'m',pickR(open));
  const L5=[];for(let r=0;r<5;r++){L5.push([0,1,2,3,4].map(c=>r*5+c));L5.push([0,1,2,3,4].map(c=>c*5+r));}L5.push([0,6,12,18,24],[4,8,12,16,20]);
  const gain=(card,n)=>{const p=card.indexOf(n);let v=0;for(const L of L5)if(L.includes(p)){const c=L.filter(q=>d.called[card[q]-1]==='1').length;v+=c===4?100:(c+1)*(c+1);}return v;};
  const mine=bingoCard(d,s);// only its own card: the others' cards are hidden from players
  const val=n=>gain(mine,n)+Math.random();
  return botDo(d,s,'m',open.sort((a,b)=>val(b)-val(a))[0]);};

/* ---------- number party games ---------- */
GAMES.lowu.botPick=(d,s,lv)=>{if(lv===1)return 1+rnd(d.max);const q=lv===3?.6:.75;let r=Math.random()*(1-Math.pow(q,d.max))/(1-q),k=1;for(let w=1;k<d.max&&r>w;k++){r-=w;w*=q;}return k;};
GAMES.two3.botPick=(d,s,lv)=>lv===1?15+rnd(60):lv===2?20+rnd(20):10+rnd(15);
GAMES.major.botPick=()=>rnd(2);

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
  if(d.bag>0){let stop;if(lv===1)stop=d.bag>=4+rnd(10);else if(lv===2)stop=d.bag>=9||p>.3;else{const gain=3.5*(1-p)*(safe-2)/Math.max(1,safe)+d.bag*(1-p)*2/Math.max(1,safe);stop=p*d.bag>gain;}
    if(stop)return botDo(d,s,'bank',0);}
  const closed=[...d.op].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);return botDo(d,s,'m',pickR(closed));};

/* ---------- bomb wires: cut what you know is safe, pass when the odds turn bad ---------- */
GAMES.wires.bot=(d,s,lv)=>{const left=[...Array(d.k).keys()].filter(i=>!d.cut.includes(i));const known=(d.kn[s]||[]).filter(i=>left.includes(i));
  if(known.length&&(lv>1||Math.random()<.5))return botDo(d,s,'cut',pickR(known));
  if(d.ps[s]!=='1'&&lv>1&&1/left.length>(lv===3?.25:.4))return botDo(d,s,'pass',0);
  // wires that other players are known to know about are not marked, so guess among the rest
  return botDo(d,s,'cut',pickR(left));};

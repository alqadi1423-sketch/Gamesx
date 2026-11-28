'use strict';
/* =====================================================================================================
   «تحدي الخلية» (q_cell): the rules, with no DOM, so tools/test/q-cell-unit.js runs them in node.
   A board of hexagon cells (n×n, rows offset), one Arabic letter in each. Two sides: side 0 joins the top edge to the
   bottom edge, side 1 the right edge to the left edge. A side picks a free cell, a question comes whose answer starts with
   its letter, and whoever answers it right takes the cell. The first side to join its two edges takes the round; two
   rounds take the match. A full board always has exactly one joined side (the hex rule), so a round never ends even.
   How a question is answered (d.gm):
     buzz  online and nearby: everyone sees the question, the first to press «أعرفها!» answers (four choices, or typed:
           d.am); a wrong answer or the clock gives the other side one try; the cell's winner picks next.
     turn  one phone, or against bots: the side that picked answers first, then the other side may steal; picking goes
           side by side whatever happens.
     host  one phone with a presenter: the question and its answer show to the one holding the phone, who reads it out
           and taps which side answered it; the cell's winner picks next.
   The answer (q.A, q.v, q.k) is the host's secret online: mask() takes it out of every other phone's view.
   ===================================================================================================== */
const QC=(()=>{
  const LETTERS=['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
  const disp=L=>L==='ا'?'أ':L;
  const NAME={'ا':'الألف','ب':'الباء','ت':'التاء','ث':'الثاء','ج':'الجيم','ح':'الحاء','خ':'الخاء','د':'الدال','ذ':'الذال','ر':'الراء','ز':'الزاي','س':'السين','ش':'الشين','ص':'الصاد','ض':'الضاد','ط':'الطاء','ظ':'الظاء','ع':'العين','غ':'الغين','ف':'الفاء','ق':'القاف','ك':'الكاف','ل':'اللام','م':'الميم','ن':'النون','ه':'الهاء','و':'الواو','ي':'الياء'};
  // the clocks, in ms
  const T={buzz:20000,opt:9000,type:20000,steal:12000,stealType:20000,turn:20000,rend:4500};
  const ROUNDS=2;   // rounds to win the match

  /* ---------- the question bank: «letter|question|answer|wrong|wrong|wrong|variants» per line ---------- */
  // the built-in questions (q-cell-data.js), then the big bank: one text file a letter (public/data/qcell/<index>.txt),
  // loaded in the background by the phone that runs the game (add). A question already in the bank is not added twice
  let BANK=null,IDX=null;const SEEN=new Set();
  function parse(text){const out=[];for(const line of String(text||'').split('\n')){const f=line.trim().split('|');if(f.length<7||!f[0])continue;
    const q={L:f[0].trim(),t:f[1].trim(),a:f[2].trim(),w:[f[3].trim(),f[4].trim(),f[5].trim()],v:f[6].split('/').map(x=>x.trim()).filter(Boolean)};
    if(!LETTERS.includes(q.L)||!q.t||!q.a||q.w.some(x=>!x)||SEEN.has(q.t))continue;SEEN.add(q.t);out.push(q);}return out;}
  function bank(){if(!BANK){BANK=parse(typeof QC_BANK==='string'?QC_BANK:'');IDX=null;}return BANK;}
  function add(text){const B=bank(),n=B.length;for(const q of parse(text))B.push(q);if(B.length!==n)IDX=null;return B.length-n;}
  const byLetter=L=>{const B=bank();if(!IDX){IDX={};for(let k=0;k<B.length;k++)(IDX[B[k].L]=IDX[B[k].L]||[]).push(k);}return IDX[L]||[];};

  /* ---------- Arabic text: the first letter, and a typed answer against the right one ---------- */
  const DIAC=/[ً-ٰٟـ]/g;
  function norm(s){return String(s||'').replace(DIAC,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/[^ء-ي0-9a-z ]/gi,' ').replace(/\s+/g,' ').trim();}
  // each word without its «ال» (and «وال»/«بال» are left alone: answers are names, not sentences)
  const noAl=s=>s.split(' ').map(w=>w.length>3&&w.startsWith('ال')?w.slice(2):w).join('');
  const key=s=>noAl(norm(s));
  // the first letter, without a leading article «ال» (a hamza alef is a letter: «ألمانيا» starts with ا)
  function first(s){const r=String(s||'').replace(DIAC,'').trim(),n=norm(r).replace(/\s/g,'');const x=n.length>3&&r.startsWith('ال')?n.slice(2):n;return x[0]||'';}
  function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m||n;let p=[...Array(n+1).keys()];
    for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
  // a typed answer counts when it is the answer or one of its listed forms, allowing one slip in 5+ letters and two in 9+;
  // never when it is one of the wrong choices (or as close to one as to the answer)
  function typedOk(txt,a,vars,wrong){const k=key(txt);if(!k)return false;const wk=(wrong||[]).map(key).filter(Boolean);if(wk.includes(k))return false;
    for(const x of [a,...(vars||[])]){const t=key(x);if(!t)continue;if(k===t)return true;const tol=t.length>=9?2:t.length>=5?1:0;
      if(tol&&Math.abs(k.length-t.length)<=tol){const dt=lev(k,t);if(dt<=tol&&!wk.some(w=>lev(k,w)<=dt))return true;}}
    return false;}

  /* ---------- the board: n×n hexagons, odd rows pushed half a cell to the right ---------- */
  function nb(n,i){const x=i%n,y=(i-x)/n,odd=y%2===1,out=[];
    const add=(a,b)=>{if(a>=0&&a<n&&b>=0&&b<n)out.push(b*n+a);};
    add(x-1,y);add(x+1,y);
    if(odd){add(x,y-1);add(x+1,y-1);add(x,y+1);add(x+1,y+1);}else{add(x-1,y-1);add(x,y-1);add(x-1,y+1);add(x,y+1);}
    return out;}
  // side 0 starts on the top row and ends on the bottom row; side 1 from the left column to the right column
  const isStart=(n,side,i)=>side===0?i<n:i%n===0;
  const isEnd=(n,side,i)=>side===0?i>=n*(n-1):i%n===n-1;
  // a joined path of the side's cells between its edges, or null
  function path(o,n,side){const ch=String(side),prev=new Map(),q=[];
    for(let i=0;i<n*n;i++)if(o[i]===ch&&isStart(n,side,i)){prev.set(i,-1);q.push(i);}
    while(q.length){const i=q.shift();if(isEnd(n,side,i)){const p=[];for(let j=i;j!==-1;j=prev.get(j))p.push(j);return p.reverse();}
      for(const j of nb(n,i))if(o[j]===ch&&!prev.has(j)){prev.set(j,i);q.push(j);}}
    return null;}
  // the fewest free cells the side still needs to join its edges (Infinity when the other side has cut it off)
  function need(o,n,side){const ch=String(side),N=n*n,dist=Array(N).fill(Infinity),dq=[];
    const cost=i=>o[i]===ch?0:o[i]==='.'?1:Infinity;
    for(let i=0;i<N;i++)if(isStart(n,side,i)){const c=cost(i);if(c<dist[i]){dist[i]=c;if(c===0)dq.unshift(i);else dq.push(i);}}
    while(dq.length){const i=dq.shift();for(const j of nb(n,i)){const c=cost(j);if(c===Infinity)continue;const v=dist[i]+c;if(v<dist[j]){dist[j]=v;if(c===0)dq.unshift(j);else dq.push(j);}}}
    let best=Infinity;for(let i=0;i<N;i++)if(isEnd(n,side,i))best=Math.min(best,dist[i]);return best;}

  const shuffle=(a,rnd)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  // letters for a board: every letter that has questions, n×n of them, in a random order
  function letters(n,rnd){const have=LETTERS.filter(L=>byLetter(L).length>0);let out=shuffle(have,rnd);while(out.length<n*n)out=out.concat(shuffle(have,rnd));return out.slice(0,n*n);}

  /* ---------- seats and sides ---------- */
  const alive=(d,s)=>!d.out||d.out[s]!=='1';
  const sideSeats=(d,side)=>d.pl.map((_,s)=>s).filter(s=>d.sx[s]===side);
  const sideAlive=(d,side)=>sideSeats(d,side).filter(s=>alive(d,s));
  // the seat that stands for a side now: a person before a bot (d.hu), taking turns inside the side
  function seatOf(d,side){const al=sideAlive(d,side),ss=al.length?al:sideSeats(d,side);if(!ss.length)return 0;
    const hu=ss.filter(s=>!d.bt||!d.bt[s]);const c=hu.length?hu:ss;return c[(d.rk[side]||0)%c.length];}
  const withTurn=(d,side)=>({...d,turn:seatOf(d,side)});

  /* ---------- the round ---------- */
  // o: md 'buzz'|'turn'|'host' default, bots (seat -> bool), host (seat whose name the session carries), rnd
  function setup(d,o){const rnd=o.rnd||Math.random,n=d.pl.length;let sx,tc=[0,1];
    if(Array.isArray(d.tm)&&d.tm.length===n){const ts=[...new Set(d.tm)];if(ts.length===2){tc=[ts[0],ts[1]];sx=d.tm.map(t=>t===ts[0]?0:1);}}
    if(!sx){const bots=o.bots||{};const hu=d.pl.map((_,s)=>s).filter(s=>!bots[s]);
      // against bots: the people on one side, the bots on the other; else seats alternate
      sx=hu.length&&hu.length<n?d.pl.map((_,s)=>bots[s]?1:0):d.pl.map((_,s)=>s%2);}
    const sd=(d.st||0)%2;
    const nd={...d,gm:o.md||'buzz',am:'opt',n:5,sx,tc,bt:o.bots||{},hs:o.host??0,ph:'set',sd,L:[],o:'',q:null,rw:[0,0],rn:1,rk:[0,0],lg:null,hl:null,uk:[],last:''};
    return withTurn(nd,sd);}
  // the choices before the first cell: board size, local mode, online answers
  function setOpt(d,k,v){if(d.ph!=='set')return d;
    if(k==='n'&&(v===4||v===5))return {...d,n:v};
    if(k==='gm'&&(v==='turn'||v==='host')&&d.gm!=='buzz'&&!Object.values(d.bt||{}).some(Boolean))return {...d,gm:v};
    if(k==='am'&&(v==='opt'||v==='type')&&d.gm==='buzz')return {...d,am:v};
    return d;}
  function board(d,rnd){const L=letters(d.n,rnd);return {...d,L,o:'.'.repeat(d.n*d.n),q:null,hl:null};}
  function begin(d,rnd){if(d.ph!=='set')return d;return withTurn({...board(d,rnd),ph:'pick',last:''},d.sd);}

  // a question for the letter: one this match has not had (then any)
  function ask(d,c,rnd,now){const L=d.L[c],ks=byLetter(L);let pool=ks.filter(k=>!d.uk.includes(k));if(!pool.length)pool=ks;
    const k=pool[Math.floor(rnd()*pool.length)],Q=bank()[k];const ord=shuffle([0,1,2,3],rnd);const opts=ord.map(j=>j===0?Q.a:Q.w[j-1]);
    return {c,L,t:Q.t,o:opts,A:ord.indexOf(0),v:Q.v,k,a:Q.a,at:-1,by:-1,x:[],tr:[],dl:0,sd0:d.sd,t0:now};}
  // the picking side takes a cell: the question opens
  function choose(d,seat,c,rnd,now){if(d.ph!=='pick'||d.win!=null)return d;if(seat!=null&&seat>=0&&d.sx[seat]!==d.sd&&d.gm!=='host')return d;
    if(!Number.isInteger(c)||c<0||c>=d.o.length||d.o[c]!=='.')return d;
    const q=ask(d,c,rnd,now);let nd={...d,q,uk:[...d.uk,q.k],lg:null};
    if(d.gm==='buzz')nd={...nd,ph:'q',q:{...q,dl:now+T.buzz}};
    else if(d.gm==='turn')nd=withTurn({...nd,ph:'ans',q:{...q,at:d.sd,tr:[d.sd],dl:now+T.turn}},d.sd);
    else nd={...nd,ph:'ans',q:{...q,at:-1}};
    return nd;}
  // the first to press «أعرفها!» answers
  function buzz(d,seat,now){if(d.ph!=='q'||!d.q||!alive(d,seat)||seat<0||seat>=d.pl.length)return d;const side=d.sx[seat];
    return {...d,ph:'ans',turn:seat,q:{...d.q,at:side,by:seat,tr:[side],dl:now+(d.am==='type'?T.type:T.opt)}};}
  const canAnswer=(d,seat)=>!!(d.q&&d.ph==='ans'&&d.gm!=='host'&&seat>=0&&seat<d.pl.length&&alive(d,seat)&&d.sx[seat]===d.q.at&&(d.q.by<0||d.q.by===seat));
  const canBuzz=(d,seat)=>!!(d.q&&d.ph==='q'&&seat>=0&&seat<d.pl.length&&alive(d,seat));
  const canPick=(d,seat)=>d.ph==='pick'&&d.win==null&&(d.gm==='host'||seat>=0&&d.sx[seat]===d.sd&&alive(d,seat));

  // the side that picks after this question: the cell's winner (buzz, host), else the other side
  const nextSide=(d,won)=>d.gm!=='turn'&&won>=0?won:1-d.q.sd0;
  // a question is over: the cell to `won` (or to nobody), then the next pick or the round's end
  function settle(d,won,how,seat,rnd,now){const q=d.q;let o=d.o;if(won===0||won===1)o=o.slice(0,q.c)+won+o.slice(q.c+1);
    const lg={c:q.c,L:q.L,t:q.t,a:q.a,w:won,by:seat,how};const by=seat>=0?seat:-1;
    let nd={...d,o,q:null,lg,last:''};
    if(won===0||won===1){const p=path(o,d.n,won);if(p){const rw=d.rw.slice();rw[won]++;nd={...nd,rw,hl:p,ph:'rend',rdl:now+T.rend};
        if(rw[won]>=ROUNDS)return winSide(nd,won);return withTurn(nd,1-won);}}
    const sd=nextSide(d,won);const rk=d.rk.slice();rk[d.q.sd0]=(rk[d.q.sd0]||0)+1;
    void by;return withTurn({...nd,ph:'pick',sd,rk},sd);}
  // a wrong answer or the clock: the other side gets one try, unless it had it
  function miss(d,how,seat,rnd,now,opt){const q=d.q,other=1-q.at;const x=Number.isInteger(opt)&&!q.x.includes(opt)?[...q.x,opt]:q.x;
    if(q.tr.includes(other)||!sideAlive(d,other).length)return settle({...d,q:{...q,x}},-1,how,seat,rnd,now);
    const steal=d.am==='type'?T.stealType:T.steal;
    return withTurn({...d,ph:'ans',q:{...q,x,at:other,by:-1,tr:[...q.tr,other],dl:now+steal,miss:{by:seat,how}}},other);}
  // an answer: a choice (number) or typed text
  function answer(d,seat,v,rnd,now){if(!canAnswer(d,seat))return d;const q=d.q;
    let ok;if(typeof v==='number'){if(!Number.isInteger(v)||v<0||v>3||q.x.includes(v))return d;ok=v===q.A;}
    else{const t=String(v||'').trim();if(!t)return d;ok=typedOk(t,q.a,q.v,q.o.filter((_,j)=>j!==q.A));}
    if(ok)return settle(d,q.at,'ok',seat,rnd,now);
    return miss(d,'bad',seat,rnd,now,typeof v==='number'?v:null);}
  // the presenter's tap: which side answered (0, 1) or nobody (-1)
  function judge(d,w,rnd,now){if(d.gm!=='host'||d.ph!=='ans'||!d.q)return d;if(w!==0&&w!==1&&w!==-1)return d;return settle(d,w,w<0?'none':'ok',-1,rnd,now);}
  // the presenter asks another question for the same cell
  function another(d,rnd,now){if(d.gm!=='host'||d.ph!=='ans'||!d.q)return d;const q=ask(d,d.q.c,rnd,now);return {...d,q:{...q,sd0:d.q.sd0},uk:[...d.uk,q.k]};}
  // the clocks: nobody pressed, or the one answering ran out of time; and the pause after a round
  function tick(d,rnd,now){if(d.win!=null)return d;
    if(d.ph==='rend'&&d.rdl&&now>=d.rdl)return next(d,rnd);
    if(!d.q||!d.q.dl||now<d.q.dl)return d;
    if(d.ph==='q')return settle(d,-1,'time',-1,rnd,now);
    if(d.ph==='ans')return miss(d,'time',d.q.by,rnd,now,null);
    return d;}
  // the next round: a new board, the side that lost it picks first
  function next(d,rnd){if(d.ph!=='rend'||d.win!=null)return d;const lost=d.lg&&d.lg.w>=0?1-d.lg.w:1-d.sd;
    return withTurn({...board(d,rnd),ph:'pick',sd:lost,rn:d.rn+1,rdl:0,lg:null,last:''},lost);}
  function winSide(d,side){const ws=sideSeats(d,side),al=ws.filter(s=>alive(d,s));
    return {...d,win:al[0]??ws[0],wins:ws,wt:d.tc[side],rdl:0};}
  // a player left: a side with nobody left loses; else the turn moves to someone who is still here
  function onLeave(d){if(d.win!=null)return d;for(const side of [0,1])if(!sideAlive(d,side).length&&sideSeats(d,side).length)return {...winSide(d,1-side),en:'lf'};
    let nd=d;if(d.q&&d.q.by>=0&&!alive(d,d.q.by))nd={...d,q:{...d.q,by:-1}};
    const side=nd.ph==='ans'&&nd.q?(nd.q.at>=0?nd.q.at:nd.sd):nd.sd;return alive(nd,nd.turn)?nd:withTurn(nd,side);}

  // what another phone may see: never the answer of a question still open
  function mask(d){if(!d||!d.q)return d;return {...d,q:{...d.q,A:-1,v:[],k:-1,a:''}};}

  /* ---------- the bot ---------- */
  const ACC=[0,.45,.66,.86];
  // a cell: level 1 any; levels 2 and 3 weigh what it does for this side and against the other
  function botCell(d,side,lv,rnd){const free=[];for(let i=0;i<d.o.length;i++)if(d.o[i]==='.')free.push(i);if(!free.length)return -1;
    if(lv<=1||rnd()<(lv===2?.35:.05))return free[Math.floor(rnd()*free.length)];
    let best=-1,bv=-Infinity;for(const i of free){const mine=d.o.slice(0,i)+side+d.o.slice(i+1),theirs=d.o.slice(0,i)+(1-side)+d.o.slice(i+1);
      const v=-need(mine,d.n,side)+0.9*need(theirs,d.n,1-side)+rnd()*0.3;if(v>bv){bv=v;best=i;}}return best;}
  // an answer: right with a chance that grows with the level, else a wrong choice still on the board
  function botAnswer(d,lv,rnd){const q=d.q;const ok=rnd()<ACC[Math.max(1,Math.min(3,lv))];if(ok&&q.A>=0)return q.A;
    const wr=[0,1,2,3].filter(j=>j!==q.A&&!q.x.includes(j));return wr.length?wr[Math.floor(rnd()*wr.length)]:q.A;}

  return {LETTERS,NAME,T,ROUNDS,disp,bank,add,byLetter,norm,key,first,typedOk,nb,path,need,letters,setup,setOpt,begin,choose,buzz,answer,judge,another,tick,next,
    onLeave,mask,canAnswer,canBuzz,canPick,sideSeats,sideAlive,seatOf,botCell,botAnswer,alive};
})();
if(typeof module!=='undefined')module.exports=QC;

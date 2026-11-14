'use strict';
/* dice, second set: thirteen traditional dice games (and one original, dice football).
   Online every throw is made on the host's phone (net.host), so nobody picks their own numbers.
   Everything lives inside one closure so no name here can clash with another game file. */
(()=>{
const R6=()=>1+rnd(6);
const rollN=k=>Array.from({length:k},R6);
const dsum=a=>a.reduce((x,y)=>x+y,0);
const cnt6=a=>{const c=[0,0,0,0,0,0,0];for(const x of a)c[x]++;return c;};
// one die: a held die lifts, a fresh one tumbles in, an empty one is a ghost
function dieH(n,o){o=o||{};const b=!!o.ga;
  return `<${b?'button':'div'} class="dice ${o.held?'held':''} ${n?'':'ghost'} ${o.roll?'roll':''} ${o.cls||''}"${b?` data-ga="${o.ga}" data-i="${o.i}"`:''}${o.dis?' disabled':''}${o.st?` style="${o.st}"`:''}>${diceSVG(n||5)}</${b?'button':'div'}>`;}
const miniD=a=>`<span class="d2-md">${a.map(x=>`<i class="dice">${diceSVG(x)}</i>`).join('')}</span>`;
const rollBtn=(d,ok,txt,ga,cls)=>`<button class="btn d2-roll ${cls||''}" style="background:${col(d,d.turn)}" data-ga="${ga||'roll'}" ${ok?'':'disabled'}>🎲 ${txt||'ارمِ'}</button>`;
const lastSt=(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);
const alive=(d,s)=>d.out[s]!=='1';

/* the winner by points (null entries cannot win); with teams the team totals decide (the average when the lowest wins,
   so a bigger team is not punished). Returns a seat, or 'd' for a tie */
function bestOf(d,pts,low){const better=(a,b)=>low?a<b:a>b;
  const tm=Array.isArray(d.tm)&&d.tm.length===pts.length?d.tm:null;
  if(tm){const tot={},cn={};pts.forEach((v,s)=>{if(v==null)return;tot[tm[s]]=(tot[tm[s]]||0)+v;cn[tm[s]]=(cn[tm[s]]||0)+1;});
    const ts=Object.keys(tot).map(Number);if(!ts.length)return 'd';const val=t=>low?tot[t]/cn[t]:tot[t];
    let b=ts[0];for(const t of ts)if(better(val(t),val(b)))b=t;if(ts.filter(t=>val(t)===val(b)).length>1)return 'd';
    return pts.findIndex((v,s)=>v!=null&&tm[s]===b);}
  let b=-1;pts.forEach((v,s)=>{if(v!=null&&(b<0||better(v,pts[b])))b=s;});if(b<0)return 'd';
  return pts.filter(v=>v===pts[b]).length>1?'d':b;}

/* ---------- rounds: every player takes one turn per round, the round is scored, and after R rounds the totals decide ----------
   C = {R, low, fresh(x) per-turn fields, rate(x) -> {gain:[per seat], msg}}. A tie at the end plays one more round (at most 4) */
const nextUp=(d,pd,from)=>{const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(d.out[s]!=='1'&&pd[s]!=='1')return s;}return -1;};
const rgInit=n=>({rn:1,pd:'0'.repeat(n),res:Array(n).fill(null),pr:Array(n).fill(null),tot:Array(n).fill(0),rc:0,lt:null,last:''});
function rgRound(x,C){const r=C.rate(x);const tot=x.tot.map((v,s)=>v+(r.gain[s]||0));const rn=x.rn+1;let win=null,msg=r.msg;
  if(rn>C.R){win=bestOf(x,tot.map((v,s)=>x.out[s]==='1'?null:v),C.low);if(win==='d'&&rn<=C.R+4){win=null;msg+=' • تعادل! جولة فاصلة';}}
  // the next round opens with the player after the one who opened this one
  const ld=nextSeat(x,x.ld!=null?x.ld:x.turn);
  const nx={...x,tot,rn,pr:x.res,res:x.res.map(()=>null),pd:'0'.repeat(x.pl.length),ld,turn:ld,win,last:msg,...C.fresh(x)};
  return C.after?C.after(nx,x):nx;}
// seat t is done (its result is in x.res[t]): the next player who has not played, or the round's score
function rgNext(x,t,C){x={...x,pd:setAt(x.pd,t,'1')};const nx=nextUp(x,x.pd,t);if(nx>=0)return {...x,...C.fresh(x),turn:nx};return rgRound(x,C);}
// a player left (or was skipped): a turn that was going on is dropped, and a round nobody else still owes is scored
function rgSkip(nd,d,C){if(nd.win!=null)return nd;let x=nd;if(x.turn!==d.turn)x={...x,...C.fresh(x)};
  if(aliveSeats(x).length<2)return x;
  if(x.pd[x.turn]==='1'||x.out[x.turn]==='1'){const nx=nextUp(x,x.pd,x.turn);if(nx<0)return rgRound(x,C);x={...x,...C.fresh(x),turn:nx};}
  return x;}
const rgHead=(d,R,extra)=>`<div class="d2-hd"><span>${d.rn>R?'<b>جولة فاصلة</b>':`الجولة <b>${d.rn}</b> من ${R}`}</span>${extra||''}</div>`;
// this round's results so far, one chip per player
const rgRow=(d,fmt)=>`<div class="d2-rr ${d.pl.length>4?'many':''}">${d.pl.map((r,s)=>alive(d,s)?`<div class="d2-rc ${s===d.turn&&d.win==null?'on':''} ${d.pd[s]==='1'?'done':''}" style="--c:${col(d,s)}"><i>${nm(d,s)}</i><b>${d.pd[s]==='1'?fmt(s):s===d.turn&&d.win==null?'🎲':'…'}</b></div>`:'').join('')}</div>`;
// what the player before did, kept on the table after the turn has passed
const ltBox=(d,html)=>d.lt&&html?`<div class="d2-lt" style="--c:${col(d,d.lt.s)}"><small>${nm(d,d.lt.s)}</small>${html}</div>`:'';
// the best result of the others who already played this round, and how many still play after this seat
const rgTarget=(d,s,val)=>{let T=null;d.pl.forEach((_,x)=>{if(x!==s&&alive(d,x)&&d.pd[x]==='1'&&d.res[x]!=null){const v=val?val(d.res[x]):d.res[x];if(T==null||v>T)T=v;}});return T;};
const rgRem=(d,s)=>d.pl.filter((_,x)=>x!==s&&alive(d,x)&&d.pd[x]!=='1').length;
// round points: every player on the top result of the round gets one (a round where nobody scored gives nothing)
function topGain(x,v,none){const vs=x.res.map((r,s)=>alive(x,s)&&r!=null?v(r):null);const ok=vs.filter(z=>z!=null);const mx=ok.length?Math.max(...ok):null;
  const gain=vs.map(z=>z!=null&&z===mx&&mx>(none==null?-Infinity:none)?1:0);const w=gain.map((g,s)=>g?s:-1).filter(s=>s>=0);
  return {gain,w};}
const winMsg=(x,w,what)=>w.length?`الجولة لـ${w.map(s=>nm(x,s)).join(' و')}${what?' '+what:''}`:'ما أحد كسب الجولة';

/* ======================= 1. ship, captain and crew ======================= */
/* five dice, three throws. A 6 (the ship) must come first, then a 5 (the captain), then a 4 (the crew); they are set aside
   by themselves as soon as they can be. With all three the other two dice are the cargo: their sum is the score, and the
   cargo may be thrown again (both dice) with the throws left. Without a crew after three throws the score is 0.
   The best cargo takes the round; three rounds, most rounds wins */
const SCC_R=3;
const sccFresh=()=>({dv:[],hv:0,rl:0,nw:0});
function sccRoll(dv,hv){const got=[];let a=[...dv];for(const [need,lv] of [[6,0],[5,1],[4,2]])if(hv===lv&&a.includes(need)){a.splice(a.indexOf(need),1);hv++;got.push(need);}return {dv:a,hv,got};}
const SCC={R:SCC_R,fresh:sccFresh,rate:x=>{const {gain,w}=topGain(x,v=>v,0);return {gain,msg:winMsg(x,w,`بحمولة ${Math.max(...x.res.map(v=>v||0))}`)};}};
function sccEnd(d,t){const v=d.hv===3?dsum(d.dv):0;
  const x={...d,res:d.res.map((r,s)=>s===t?v:r),lt:{s:t,dv:d.dv,hv:d.hv,v},last:d.hv===3?`${nm(d,t)} حمّل ${v}`:`${nm(d,t)} غرقت سفينته 🌊 (0)`};
  return rgNext(x,t,SCC);}
// how a whole turn usually ends (the cargo a player stands on), from a few thousand quick turns; for the hard bot's odds
let SCCF=null;function sccDist(){if(SCCF)return SCCF;const f=Array(13).fill(0),N=6000;
  for(let k=0;k<N;k++){let hv=0,dv=[],rl=0;while(rl<3){const r=sccRoll(hv<3?rollN(5-hv):rollN(2),hv);hv=r.hv;dv=r.dv;rl++;if(hv===3&&dsum(dv)>=(rl===1?9:8))break;}f[hv===3?dsum(dv):0]++;}
  let c=0;SCCF=f.map(x=>(c+=x)/N);return SCCF;}
const P2=[0,0,1,2,3,4,5,6,5,4,3,2,1].map(x=>x/36);
GAMES.d_ship={name:'السفينة والقبطان',cat:'dice',lbc:'#1E5F8C',net:{host:['roll','stop']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2C7FB8"/><path d="M0 72Q12 66 25 72T50 72T75 72T100 72V100H0Z" fill="#1B5E8C"/><path d="M18 62H82L72 78H28Z" fill="#7A4A26"/><path d="M50 20V62" stroke="#5B3518" stroke-width="4"/><path d="M52 22L76 56H52Z" fill="#fff"/><path d="M48 28L28 56H48Z" fill="#F2E6CF"/><rect x="58" y="64" width="13" height="13" rx="3" fill="#fff"/><circle cx="61.5" cy="67.5" r="1.6" fill="#2D4763"/><circle cx="67.5" cy="67.5" r="1.6" fill="#2D4763"/><circle cx="61.5" cy="73.5" r="1.6" fill="#2D4763"/><circle cx="67.5" cy="73.5" r="1.6" fill="#2D4763"/><circle cx="61.5" cy="70.5" r="1.6" fill="#2D4763"/><circle cx="67.5" cy="70.5" r="1.6" fill="#2D4763"/><path d="M50 14l6 4h-6z" fill="#E5483F"/></svg>`,
  init:n=>({...rgInit(n),...sccFresh(),ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'الجولات: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout:d=>sccEnd(d,d.turn),
  onSkip:(nd,d)=>rgSkip(nd,d,SCC),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null;const fr=d.rl>0&&once(`sc${d.gid}_${d.rc}`);
    const slot=(k,lab,face)=>{const got=d.hv>k;return `<div class="d2-slot ${got?'got':''}">${dieH(got?face:0,{roll:got&&fr&&d.hv-d.nw<=k})}<small>${lab}</small></div>`;};
    let s=rgHead(d,SCC_R,`<span>الرمية <b>${d.rl}</b> من 3</span>`);
    s+=`<div class="d2-scc">${slot(0,'السفينة ⛵',6)}${slot(1,'القبطان 🧭',5)}${slot(2,'البحارة 👥',4)}</div>`;
    const cargo=d.hv===3;
    s+=`<div class="ytray d2-tray ${cargo?'cargo':''}">${d.rl?d.dv.map(x=>dieH(x,{roll:fr,cls:cargo?'d2cg':''})).join(''):[0,0,0,0,0].slice(d.hv).map(()=>dieH(0)).join('')}${cargo?`<b class="d2-sum">📦 ${dsum(d.dv)}</b>`:''}</div>`;
    s+=`<div class="acts">${rollBtn(d,my&&d.rl<3,d.hv===3?'ارمِ الحمولة':'ارمِ')}${cargo?`<button class="btn navy" data-ga="stop" ${my&&d.rl<3?'':'disabled'}>⚓ أثبّت ${dsum(d.dv)}</button>`:''}</div>`;
    const T=rgTarget(d,t);if(T&&d.win==null)s+=`<p class="note">أعلى حمولة بالجولة: <b>${T}</b></p>`;
    s+=rgRow(d,v=>v?'📦 '+v:'🌊 0');
    if(d.lt&&d.lt.s!==t)s+=ltBox(d,`${miniD([6,5,4].slice(0,d.lt.hv))}${d.lt.hv===3?miniD(d.lt.dv):''}<b>${d.lt.v}</b>`);
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='roll'){if(d.rl>=3)return;const r=sccRoll(d.hv<3?rollN(5-d.hv):rollN(2),d.hv);const x={...d,dv:r.dv,hv:r.hv,nw:r.hv-d.hv,rl:d.rl+1,rc:d.rc+1,
        last:r.got.length?`${nm(d,t)} ثبّت ${r.got.map(v=>({6:'السفينة',5:'القبطان',4:'البحارة'})[v]).join(' و')}`:d.last};
      act(x.rl>=3?sccEnd(x,t):x);return;}
    if(a==='stop'){if(d.hv<3||!d.rl)return;act(sccEnd(d,t));}}
};
GAMES.d_ship.bot=(d,s,lv)=>{if(d.hv<3||d.rl===0)return botDo(d,s,'roll',0);const c=dsum(d.dv),left=3-d.rl;if(!left)return botDo(d,s,'stop',0);
  if(lv===1)return botDo(d,s,c>=5+rnd(6)?'stop':'roll',0);
  if(lv===2)return botDo(d,s,c>=(left===2?8:7)?'stop':'roll',0);
  // hard: the chance to take the round: beat the best cargo so far, and stay ahead of the players still to come
  const T=rgTarget(d,s),rem=rgRem(d,s),F=sccDist();
  const hold=v=>(T==null||v>T?1:v===T?.5:0)*Math.pow(F[v],rem);
  const V=(v,l)=>{const st=hold(v);if(!l)return st;let r=0;for(let x=2;x<=12;x++)r+=P2[x]*V(x,l-1);return Math.max(st,r);};
  let roll=0;for(let x=2;x<=12;x++)roll+=P2[x]*V(x,left-1);return botDo(d,s,roll>hold(c)+1e-9?'roll':'stop',0);};
HELP.d_ship='لعبة السفينة والقبطان والبحارة بخمس زهرات: عندك 3 رميات بالدور. لازم تجيب 6 (السفينة) أول، بعدها 5 (القبطان)، بعدها 4 (البحارة)، وتنحط على جنب لحالها أول ما تطلع بالترتيب (لو طلع 6 و5 مع بعض ينحطون الاثنين). إذا كمّلت 6 و5 و4، الزهرتين الباقية هي الحمولة ومجموعها نتيجتك، وتقدر تثبّت أو ترمي الحمولة (الزهرتين مع بعض) بالرميات اللي باقية. إذا خلصت الثلاث رميات وما كمّلت، سفينتك غرقت ونتيجتك صفر. أعلى حمولة بالجولة تاخذ نقطة (والتعادل كلهم ياخذون)، وبعد 3 جولات يفوز صاحب أكثر نقاط، ولو تعادلوا فيه جولة فاصلة. مع الفرق تنجمع نقاط الفريق.';

/* ======================= 2. mexico (Mäxchen): two dice under a cup, and a bluff ======================= */
/* two dice read high-low (5 and 3 = 53); doubles beat every plain roll and 21 (مكسيكو) beats everything.
   Throw under the cup, look, and announce a value higher than the last one, true or not. The next player either believes it
   and throws to beat it, or lifts the cup: a true claim (the dice at least as high) costs the doubter a life, a lie costs the
   one who said it. A claimed مكسيكو cannot be beaten: lift it (2 lives if it is real) or give up one life. Last one alive wins */
const MX=['31','32','41','42','43','51','52','53','54','61','62','63','64','65','11','22','33','44','55','66','21'];
const MXP=MX.map(k=>(k[0]===k[1]?1:2)/36);
const mxRank=c=>{if(!c||c.length!==2||c.includes('?'))return -1;const a=+c[0],b=+c[1];return MX.indexOf(''+Math.max(a,b)+Math.min(a,b));};
const mxName=i=>i===20?'مكسيكو':MX[i][0]===MX[i][1]?`دبل ${MX[i][0]}`:MX[i];
const MXL=3;
function mxLose(d,s,k,msg,rv){const lv=[...d.lv];lv[s]=Math.max(0,lv[s]-k);let out=d.out;if(lv[s]<=0)out=setAt(out,s,'1');const al=aliveSeats(d,out);
  return {...d,lv,out,cup:d.cup.map(()=>''),cl:null,ph:'roll',rv,rd:d.rd+1,turn:out[s]==='1'?nextSeat(d,s,out):s,win:al.length===1?al[0]:null,last:msg};}
const mxRoll=d=>{const a=R6(),b=R6();return {...d,cup:d.cup.map((c,s)=>s===d.turn?''+Math.max(a,b)+Math.min(a,b):''),ph:'claim',rc:d.rc+1,last:`${nm(d,d.turn)} رمى تحت الكاسة 🤫`};};
const mxClaim=(d,v)=>({...d,cl:{v,s:d.turn,p:d.cl?d.cl.v:-1},ph:'roll',rv:null,turn:nextSeat(d,d.turn),last:`${nm(d,d.turn)} يقول: ${mxName(v)}`});
function mxDoubt(d){const t=d.turn,c=d.cl,real=mxRank(d.cup[c.s]),ok=real>=c.v;const loser=ok?t:c.s,k=ok&&c.v===20?2:1;
  const rv={s:c.s,dv:d.cup[c.s],v:c.v,by:t,ok,ls:loser,k};
  return mxLose(d,loser,k,`${nm(d,t)} كشف الكاسة: ${nm(d,c.s)} قال ${mxName(c.v)} وطلع ${mxName(real)}، ${ok?'صادق':'كذاب'}! ${nm(d,loser)} خسر ${k===2?'حياتين':'حياة'}`,rv);}
const mxGive=d=>mxLose(d,d.turn,1,`${nm(d,d.turn)} سلّم لمكسيكو وخسر حياة`,null);
GAMES.d_mex={name:'مكسيكو',cat:'dice',lbc:'#8E3B2F',
  // the dice under the cup are seen only by the one who threw them; the lift shows them to everyone
  hide:{seat:['cup']},net:{host:['roll','claim','doubt','give']},
  redeal:d=>({...d,cup:d.cup.map(()=>''),cl:null,ph:'roll',rv:null,rd:d.rd+1,last:'صاحب الغرفة طلع، نبدأ الجولة من جديد'}),
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B4473A"/><path d="M8 84H92" stroke="#7E2C22" stroke-width="5" stroke-linecap="round"/><path d="M24 80L32 26Q50 20 68 26L76 80Q50 88 24 80Z" fill="#F2C14E"/><path d="M32 26Q50 20 68 26L67 33Q50 27 33 33Z" fill="#C9962A"/><path d="M38 36L35 70" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/><text x="51" y="66" font-size="24" font-weight="900" fill="#7E2C22" text-anchor="middle">21</text><text x="80" y="22" font-size="22" font-weight="900" fill="#fff" text-anchor="middle">؟</text></svg>`,
  init:n=>({lv:Array(n).fill(MXL),cup:Array(n).fill(''),cl:null,ph:'roll',rv:null,rd:0,rc:0,last:''}),
  points:d=>d.lv.map((x,s)=>alive(d,s)?'❤️'.repeat(x):'💀'),status:lastSt,
  winExtra:d=>'الأرواح: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.lv[s]}`).join('، '),
  onTimeout:d=>d.ph==='claim'?mxClaim(d,Math.max(d.cl?d.cl.v+1:0,mxRank(d.cup[d.turn]))):d.cl&&d.cl.v===20?mxGive(d):mxRoll(d),
  onSkip(nd,d){if(nd.win!=null)return nd;
    // the claim of a player who left cannot be lifted any more (a fresh round); a player who left takes his own throw with him,
    // and the next one answers the claim still on the table
    const cl=d.cl&&nd.out[d.cl.s]!=='1'?d.cl:null;
    if(!cl)return {...nd,cl:null,cup:nd.cup.map(()=>''),ph:'roll'};
    if(nd.turn!==d.turn)return {...nd,ph:'roll',cup:nd.cup.map((c,s)=>s===cl.s?c:'')};return nd;},
  render(d,ctx){const v=ctx.v,t=d.turn,my=ctx.my&&d.win==null;let s='';
    s+=`<div class="d2-cups ${d.pl.length>4?'many':''}">${d.pl.map((r,i)=>{const c=col(d,i),dead=!alive(d,i),hc=!!d.cup[i]||(d.cl&&d.cl.s===i);
      return `<div class="d2-cup ${dead?'out':''} ${t===i&&d.win==null?'on':''} ${hc?'full':''}" style="--c:${c}"><svg viewBox="0 0 60 56"><ellipse cx="30" cy="51" rx="24" ry="4" fill="rgba(0,0,0,.25)"/><path d="M10 46L16 8Q30 3 44 8L50 46Q30 53 10 46Z" fill="${c}"/><path d="M16 8Q30 3 44 8L43.3 14Q30 9 16.7 14Z" fill="${shade(c,-.3)}"/><path d="M20 17L17 40" stroke="rgba(255,255,255,.45)" stroke-width="3.5" stroke-linecap="round"/></svg><i>${nm(d,i)}</i><b>${dead?'💀':'❤️'.repeat(d.lv[i])}</b></div>`;}).join('')}</div>`;
    if(d.cl)s+=`<div class="d2-claim" style="--c:${col(d,d.cl.s)}"><small>${nm(d,d.cl.s)} يقول</small><b>${mxName(d.cl.v)}</b></div>`;
    else if(d.rv){const R=d.rv;s+=`<div class="d2-claim rv ${R.ok?'ok':'no'}" style="--c:${col(d,R.s)}"><small>${nm(d,R.s)} قال ${mxName(R.v)} وتحت الكاسة</small><span class="d2-pair">${[...R.dv].map(x=>dieH(+x,{roll:once(`mxr${d.gid}_${d.rd}`)})).join('')}</span><b>${R.ok?'صادق ✓':'كذاب ✗'}</b></div>`;}
    else s+=`<div class="d2-claim none"><small>جولة جديدة: ${nm(d,t)} يبدأ</small></div>`;
    // my own dice under my cup (only mine)
    const mine=v>=0&&d.cup[v]&&!d.cup[v].includes('?')?d.cup[v]:'';
    if(mine){const fr=once(`mx${d.gid}_${d.rc}_${v}`);s+=`<div class="d2-under"><small>تحت كاستك (أنت بس تشوفها)</small><span class="d2-pair">${[...mine].map(x=>dieH(+x,{roll:fr})).join('')}</span><b>${mxName(mxRank(mine))}</b></div>`;}
    if(!my)return s;
    if(d.ph==='roll'){
      if(!d.cl)s+=`<div class="acts">${rollBtn(d,true,'ارمِ تحت الكاسة')}</div>`;
      else if(d.cl.v===20)s+=`<div class="acts"><button class="btn navy" data-ga="give">أسلّم (−1 ❤️)</button><button class="btn red" data-ga="doubt">اكشف! 🔍</button></div><p class="note">لو كانت مكسيكو صدق تخسر حياتين</p>`;
      else s+=`<div class="acts">${rollBtn(d,true,'أصدّقك وأرمي')}<button class="btn red" data-ga="doubt">كذاب! اكشف 🔍</button></div>`;}
    else{const lo=d.cl?d.cl.v+1:0,real=mxRank(mine);
      s+=`<p class="lbl" style="text-align:center">وش تقول؟ لازم أعلى من ${d.cl?mxName(d.cl.v):'لا شي'}</p><div class="d2-mx">${MX.map((k,i)=>`<button class="d2-mxv ${i===real?'tru':''} ${i>=14?'dbl':''} ${i===20?'mx':''}" data-ga="claim" data-i="${i}" ${i>=lo?'':'disabled'}>${i===20?'مكسيكو':i>=14?k[0]+'·'+k[1]:k}</button>`).join('')}</div>`;}
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='roll'){if(d.ph!=='roll'||(d.cl&&d.cl.v===20))return;act(mxRoll(d));return;}
    if(a==='claim'){if(d.ph!=='claim'||!Number.isInteger(i)||i<0||i>20||(d.cl&&i<=d.cl.v))return;act(mxClaim(d,i));return;}
    if(a==='doubt'){if(d.ph!=='roll'||!d.cl)return;act(mxDoubt(d));return;}
    if(a==='give'){if(d.ph!=='roll'||!d.cl||d.cl.v!==20)return;act(mxGive(d));}}
};
// the chance that a fresh throw is at least rank i, and higher than rank i
const MXGE=MX.map((_,i)=>MXP.slice(i).reduce((a,b)=>a+b,0)),MXGT=MX.map((_,i)=>MXP.slice(i+1).reduce((a,b)=>a+b,0));
GAMES.d_mex.bot=(d,s,lv)=>{
  if(d.ph==='claim'){const real=mxRank(d.cup[s]),lo=d.cl?d.cl.v+1:0;let v;
    if(real>=lo)v=lv===1&&Math.random()<.3?Math.min(20,real+rnd(2)):real;
    // a lie: hard and medium stay just above the last claim, where a lie looks most like the truth
    else v=lv===1?Math.min(20,lo+rnd(4)):Math.min(20,lo+(Math.random()<(lv===3?.25:.4)?1:0));
    if(v===20&&real!==20&&lv>1&&lo<20&&Math.random()<.7)v=lo;
    return botDo(d,s,'claim',v);}
  if(!d.cl)return botDo(d,s,'roll',0);const c=d.cl.v;
  if(lv===1){if(c===20)return botDo(d,s,Math.random()<.5?'give':'doubt',0);return botDo(d,s,Math.random()<.25||MXGE[c]<.2?'doubt':'roll',0);}
  /* the chance the claim is true, from the claim before it (lo is the least that could be said): a player who threw at least lo
     mostly says what he has (now and then more), one who threw less has to lie, and a lie lands mostly right above lo */
  const lo=(d.cl.p==null?-1:d.cl.p)+1,lt=k=>MXP.slice(0,Math.max(0,k)).reduce((a,b)=>a+b,0);
  const q=k=>k===0?.65:k===1?.22:.13/Math.max(1,19-lo);
  const truth=(c>=lo?MXP[c]:0)+MXGT[c]*.1,lie=lt(lo)*q(c-lo)+Math.max(0,lt(c)-lt(lo))*.15;
  const pTrue=truth/(truth+lie+1e-9);
  // a claimed مكسيكو is true about one time in eleven: lifting costs 2 lives that rarely, giving up costs 1 for sure
  if(c===20)return botDo(d,s,2*pTrue<1?'doubt':'give',0);
  // believing means throwing to beat it: honest when the throw is higher, otherwise a lie that may well be lifted
  const loseBelieve=(1-MXGT[c])*.42;
  // medium only asks how likely any throw is to reach the claim
  if(lv===2)return botDo(d,s,MXGE[c]<.3?'doubt':'roll',0);
  return botDo(d,s,pTrue<loseBelieve?'doubt':'roll',0);};
HELP.d_mex='لعبة مكسيكو (Mäxchen): زهرتين تحت كاسة. الرقم يُقرأ الكبير أول: 5 و3 = 53. الترتيب من الأقل: 31، 32، 41… إلى 65، بعدها الدبلات من دبل 1 إلى دبل 6، وأعلى شي 21 «مكسيكو». بدورك ترمي تحت الكاسة وتشوف لحالك، وبعدين تقول رقم لازم يكون أعلى من اللي قبلك، صادق أو كذاب. اللي بعدك يا يصدّقك ويرمي هو (ولازم يقول أعلى منك)، يا يكشف الكاسة: إذا الزهر نفس اللي قلت أو أعلى يخسر هو حياة، وإذا كذبت تخسر أنت. لو أحد قال مكسيكو ما ينغلب: يا تسلّم وتخسر حياة، يا تكشف وإذا كانت صدق تخسر حياتين. اللي خسر يبدأ الجولة الجاية. لكل واحد 3 أرواح، وآخر واحد يبقى يفوز. مع الفرق يفوز الفريق اللي يبقى منه أحد.';

/* ======================= 3. chicago ======================= */
/* eleven rounds, aiming at 2, 3 … 12 in turn: one throw of two dice each, and the throw scores the round's number when it hits it */
const CHI_R=11;
const CHI={R:CHI_R,fresh:()=>({}),rate:x=>{const t=x.rn+1,hit=x.pl.map((_,s)=>x.res[s]===t?s:-1).filter(s=>s>=0);
  return {gain:x.res.map(v=>v===t?t:0),msg:hit.length?`أصاب الـ${t}: ${hit.map(s=>nm(x,s)).join('، ')}`:`ما أحد جاب ${t}`};}};
GAMES.d_chi={name:'شيكاغو',cat:'dice',lbc:'#3B4C8C',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F57A8"/><circle cx="50" cy="52" r="34" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="52" r="20" fill="none" stroke="#F2C14E" stroke-width="5"/><circle cx="50" cy="52" r="7" fill="#E5483F"/><text x="50" y="22" font-size="15" font-weight="900" fill="#fff" text-anchor="middle">2-12</text><rect x="66" y="64" width="22" height="22" rx="5" fill="#fff" transform="rotate(12 77 75)"/><circle cx="72" cy="70" r="2.4" fill="#2D4763"/><circle cx="82" cy="80" r="2.4" fill="#2D4763"/><circle cx="77" cy="75" r="2.4" fill="#2D4763"/></svg>`,
  init:n=>({...rgInit(n),dv:[],hs:Array(n).fill('.'.repeat(CHI_R)),ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'المجموع: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout:d=>GAMES.d_chi.go(d),onSkip:(nd,d)=>rgSkip(nd,d,CHI),
  go(d){const t=d.turn,dv=rollN(2),v=dsum(dv),tg=Math.min(d.rn,CHI_R)+1,ok=d.rn<=CHI_R&&v===tg;
    const hs=d.rn<=CHI_R?d.hs.map((h,s)=>s===t?setAt(h,d.rn-1,ok?'1':'0'):h):d.hs;
    return rgNext({...d,dv,hs,rc:d.rc+1,res:d.res.map((r,s)=>s===t?v:r),lt:{s:t,dv,v,ok},last:ok?`${nm(d,t)} جاب ${tg}! +${tg} 🎯`:`${nm(d,t)} طلع ${v}`},t,CHI);},
  render(d,ctx){const my=ctx.my&&d.win==null,tg=Math.min(d.rn,CHI_R)+1;
    let s=`<div class="d2-chi">${[...Array(CHI_R)].map((_,k)=>`<span class="${k+1===d.rn?'on':k+1<d.rn?'past':''}">${k+2}</span>`).join('')}</div>`;
    s+=`<div class="d2-hd"><span>${d.rn>CHI_R?'<b>جولة فاصلة</b>: أعلى رمية':`الهدف <b class="d2-big">${tg}</b>`}</span><span>الجولة ${Math.min(d.rn,CHI_R)} من ${CHI_R}</span></div>`;
    const L=d.lt;const fr=L&&once(`chi${d.gid}_${d.rc}`);
    s+=`<div class="ytray d2-tray">${L?L.dv.map(x=>dieH(x,{roll:fr})).join('')+`<b class="d2-sum ${L.ok?'hit':''}">${L.v}${L.ok?' 🎯':''}</b>`:dieH(0)+dieH(0)}</div>`;
    if(L)s+=`<p class="note" style="--c:${col(d,L.s)}">رمية ${nm(d,L.s)}</p>`;
    s+=`<div class="acts">${rollBtn(d,my,d.rn>CHI_R?'ارمِ':`ارمِ على ${tg}`)}</div>`;
    s+=rgRow(d,v=>`${v}${d.rn<=CHI_R&&v===d.rn+1?' 🎯':''}`);
    s+=`<div class="d2-chit">${d.pl.map((r,p)=>alive(d,p)?`<div style="--c:${col(d,p)}"><i>${nm(d,p)}</i><span>${[...d.hs[p]].map((h,k)=>`<u class="${h==='1'?'y':h==='0'?'n':''}">${h==='1'?k+2:''}</u>`).join('')}</span><b>${d.tot[p]}</b></div>`:'').join('')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null||a!=='roll')return;act(GAMES.d_chi.go(d));}
};
// a tie-break round aims at 12 again
// a tie-break round: the highest throw gets a point
CHI.rate=(f=>x=>{if(x.rn<=CHI_R)return f(x);const {gain,w}=topGain(x,v=>v);return {gain,msg:winMsg(x,w,'بأعلى رمية')};})(CHI.rate);
GAMES.d_chi.bot=(d,s)=>botDo(d,s,'roll',0);
HELP.d_chi='شيكاغو: 11 جولة، وكل جولة لها رقم هدف بالترتيب من 2 إلى 12. بدورك ترمي زهرتين مرة وحدة، وإذا مجموعهم نفس هدف الجولة تاخذ نقاط بقدره (مثلاً بجولة الـ8 تاخذ 8). بعد الـ11 جولة يفوز صاحب أعلى مجموع، ولو تعادلوا فيه جولة فاصلة: أعلى رمية تاخذ نقطة. مع الفرق ينجمع مجموع الفريق.';

/* five-dice odds for the bots: the 252 sets of five dice and what every keep can turn into (yatzy's table, YB in dice.js).
   dpV(key,left,v0) is the value of each set with `left` throws to come when v0 values a set scored now */
const DPC={};
function dpV(key,left,v0){const k=key+'|'+left;if(DPC[k])return DPC[k];const T=YB();let V;
  if(!left)V=T.str.map(x=>v0([...x].map(Number)));else{const P=dpV(key,left-1,v0);V=T.keeps.map(ks=>{let b=-Infinity;for(const K of ks){let v=0;for(const [j,p] of K.t)v+=p*P[j];if(v>b)b=v;}return b;});}
  const ks=Object.keys(DPC);if(ks.length>40)for(const q of ks)delete DPC[q];return DPC[k]=V;}
// the odds table takes a while to build the first time: build it while the players look at a fresh board, not inside a bot's turn
function dpWarm(){if(dpWarm.k||typeof hasBots!=='function'||!hasBots())return;dpWarm.k=1;(window.requestIdleCallback||(f=>setTimeout(f,400)))(()=>{try{YB();}catch(e){}},{timeout:1500});}
// which dice to keep (1 = keep) for the best value after the throws left; all kept means stop
function dpKeep(key,dv,left,v0){const T=YB(),c=[0,0,0,0,0,0];for(const x of dv)c[x-1]++;const P=dpV(key,left-1,v0);let best=null;
  for(const K of T.keeps[T.id.get(c.join(''))]){let v=0;for(const [j,p] of K.t)v+=p*P[j];if(!best||v>best.v+1e-9)best={v,k:K.k};}
  const need=[...best.k];return dv.map(x=>need[x-1]-->0?'1':'0').join('');}
// the tray of five: dice you can hold, the throw button with the throws left
function trayHold(d,ctx,canHold,fr){return `<div class="ytray d2-tray">${d.dv.map((x,i)=>dieH(d.rl?x:0,{held:d.rl>0&&d.hd[i]==='1',roll:fr&&d.hd[i]!=='1',...(canHold?{ga:'hold',i}:{})})).join('')}</div>`;}
const rollsLeft=(n,used)=>`<span class="yleft">${[...Array(n)].map((_,k)=>`<i class="${k<n-used?'on':''}"></i>`).join('')}</span>`;
function hold(d,i){if(!d.rl||!Number.isInteger(i)||i<0||i>4)return null;return {...d,hd:setAt(d.hd,i,d.hd[i]==='1'?'0':'1')};}
const reroll=d=>d.dv.map((x,k)=>d.rl&&d.hd[k]==='1'?x:R6());

/* ======================= 4. balut ======================= */
/* five dice, three throws, and a card of seven combinations with four boxes each (28 turns). The winner has the most
   points: bonuses for each combination and points for the total score */
const BLC=['الأربعات','الخمسات','الستات','التسلسل','فل هاوس','الاختيار','بالوت'];
const BLI=['4','5','6','↗','⌂','✋','★'];
function blScore(k,dv){const c=cnt6(dv),sm=dsum(dv),srt=[...dv].sort().join('');
  if(k<3)return c[k+4]*(k+4);
  if(k===3)return srt==='12345'?15:srt==='23456'?20:0;
  if(k===4)return c.slice(1).filter(x=>x).sort().join('')==='23'?sm:0;
  if(k===5)return sm;return Math.max(...c)===5?20+sm:0;}
const blBox=(card,k)=>card.slice(k*4,k*4+4);
const blSum=a=>a.reduce((x,y)=>x+Math.max(0,y),0);
const BLT=[52,65,78,0,0,100];
function blPts(card){const score=blSum(card);
  const P=[0,1,2].map(k=>blSum(blBox(card,k))>=BLT[k]?2:0).concat([blBox(card,3).every(v=>v>0)?4:0,blBox(card,4).every(v=>v>0)?3:0,blSum(blBox(card,5))>=100?2:0,blBox(card,6).filter(v=>v>0).length*2]);
  const sp=score<300?-2:Math.floor((score-300)/50)-1;return {score,P,sp,pts:dsum(P)+sp};}
const blFull=c=>c.every(v=>v>=0);
const blWin=(d,cards)=>cards.every((c,s)=>!alive(d,s)||blFull(c))?bestOf(d,cards.map((c,s)=>alive(d,s)?(blPts(c).pts+10)*10000+blPts(c).score:null)):null;
// the next seat that still has empty boxes
const blNext=(d,cards,t)=>nextSeat(d,t,d.out.split('').map((o,s)=>o==='1'||blFull(cards[s])?'1':'0').join(''));
function blPut(d,k){const t=d.turn,card=[...d.cards[t]];const j=card.slice(k*4,k*4+4).indexOf(-1);if(j<0||!d.rl)return null;const v=blScore(k,d.dv);card[k*4+j]=v;
  const cards=d.cards.map((c,s)=>s===t?card:c);const win=blWin(d,cards);
  return {...d,cards,dv:[0,0,0,0,0],hd:'00000',rl:0,turn:win!=null?t:blNext(d,cards,t),win,last:`${nm(d,t)} سجّل ${v} في ${BLC[k]}${k===6&&v?' 🎉':!v?' 😬':''}`};}
GAMES.d_balut={name:'بالوت النرد',cat:'dice',lbc:'#6E2C6B',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7B3A78"/><rect x="14" y="12" width="44" height="76" rx="6" fill="#FFF7E6"/>${[0,1,2,3,4,5,6].map(k=>`<path d="M20 ${22+k*9.5}H52" stroke="#D9C9A8" stroke-width="2"/>`).join('')}<rect x="20" y="17" width="9" height="5" rx="1.5" fill="#7B3A78"/><rect x="56" y="44" width="30" height="30" rx="7" fill="#fff" transform="rotate(10 71 59)"/>${[[64,51],[78,51],[71,59],[64,67],[78,67]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="#2D4763" transform="rotate(10 71 59)"/>`).join('')}<text x="72" y="32" font-size="20" fill="#F2C14E" text-anchor="middle">★</text></svg>`,
  init:n=>({dv:[0,0,0,0,0],hd:'00000',rl:0,rc:0,cards:Array(n).fill(0).map(()=>Array(28).fill(-1)),last:''}),
  points:d=>d.cards.map(c=>blPts(c).score),status:lastSt,
  winExtra:d=>'النقاط: '+d.pl.map((r,s)=>{const p=blPts(d.cards[s]);return `${nm(d,s)} ${p.pts} (${p.score})`;}).join('، '),
  onTimeout(d){const t=d.turn,card=d.cards[t];if(blFull(card))return {...d,turn:blNext(d,d.cards,t)};
    if(!d.rl){const dv=rollN(5);d={...d,dv,rl:1,rc:d.rc+1};}
    let b=-1,bv=-1;for(let k=0;k<7;k++)if(blBox(card,k).includes(-1)){const v=blScore(k,d.dv);if(v>bv){bv=v;b=k;}}return blPut(d,b);},
  onSkip(nd,d){let x=nd.turn!==d.turn?{...nd,dv:[0,0,0,0,0],hd:'00000',rl:0}:nd;if(x.win!=null)return x;const w=blWin(x,x.cards);if(w!=null)return {...x,win:w};
    if(blFull(x.cards[x.turn]))x={...x,turn:blNext(x,x.cards,x.turn)};return x;},
  render(d,ctx){dpWarm();const t=d.turn,card=d.cards[t],my=ctx.my&&d.win==null,fr=d.rl>0&&once(`bl${d.gid}_${d.rc}`);
    let s=trayHold(d,ctx,my&&d.rl>0&&d.rl<3,fr);
    s+=`<div class="acts"><button class="btn yroll" style="background:${col(d,t)}" data-ga="roll" ${my&&d.rl<3?'':'disabled'}>🎲 ارمِ ${rollsLeft(3,d.rl)}</button></div>`;
    const pp=blPts(card),filled=card.filter(v=>v>=0).length;
    const opts=d.rl?[0,1,2,3,4,5,6].map(k=>blBox(card,k).includes(-1)?blScore(k,d.dv):null):[];
    const best=opts.length?Math.max(...opts.filter(v=>v!=null)):0;
    const bon=k=>{const b=blBox(card,k);if(k<3||k===5){const sm=blSum(b);return sm>=BLT[k]?'<em class="ok">+2</em>':`<em>${sm}/${BLT[k]}</em>`;}
      if(k===6)return pp.P[6]?`<em class="ok">+${pp.P[6]}</em>`:'<em>+2 لكل</em>';
      const z=b.some(v=>v===0);return pp.P[k]?`<em class="ok">+${pp.P[k]}</em>`:z?'<em class="no">✗</em>':`<em>+${k===3?4:3}</em>`;};
    s+=`<div class="d2-bl" style="--c:${col(d,t)}"><div class="d2-blh"><span>${nm(d,t)} • الدور ${Math.min(28,filled+1)} من 28</span></div>${[0,1,2,3,4,5,6].map(k=>{const b=blBox(card,k),op=opts[k];const can=my&&d.rl&&op!=null;
      return `<button class="d2-blr ${op!=null&&d.rl?(op?(op===best?'d2pv top':'d2pv'):'zero'):''}" data-ga="sc" data-i="${k}" ${can?'':'disabled'}><span class="d2-bln"><i>${BLI[k]}</i>${BLC[k]}</span><span class="d2-blb">${b.map(v=>`<u class="${v>=0?'f':''} ${v===0?'z':''}">${v>=0?v:''}</u>`).join('')}</span><b class="d2-blp">${op!=null&&d.rl?op:''}</b>${bon(k)}</button>`;}).join('')}
      <div class="d2-blt"><span>المجموع <b>${pp.score}</b></span><span>نقاط المجموع <b dir="ltr">${pp.sp>0?'+':''}${pp.sp}</b></span><span>النقاط <b class="d2-big" dir="ltr">${pp.pts}</b></span></div></div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='hold'){if(d.rl>=3)return;const x=hold(d,i);if(x)act(x);return;}
    if(a==='roll'){if(d.rl>=3)return;act({...d,dv:reroll(d),rl:d.rl+1,rc:d.rc+1});return;}
    if(a==='sc'){const x=blPut(d,i);if(x)act(x);}}
};
// what a box usually brings when it is played for; the bots weigh a score against it
const BLPAR=[9,11,13,10,17,23,8];
function blEff(card,k,v){const b=blBox(card,k),f=b.filter(x=>x>=0),rem=4-f.length,cur=blSum(f);let e=v-BLPAR[k];
  // one point is worth about 50 on the score (that is how the total turns into points)
  if(k<3||k===5){const T=BLT[k];if(cur<T){if(cur+v>=T)e+=100;else if(rem>1){const left=(T-cur-v)/(rem-1);e+=left<=T/4*1.3?2.2*(v-T/4):0;}}}
  else if(k===3||k===4){if(f.every(x=>x>0)){if(!v)e-=k===3?150:110;else if(rem===1)e+=k===3?200:150;else e+=20;}}
  else if(k===6&&v)e+=100;
  return e;}
function blBest(card,dv){let b=null;for(let k=0;k<7;k++)if(blBox(card,k).includes(-1)){const e=blEff(card,k,blScore(k,dv));if(!b||e>b[1])b=[k,e];}return b;}
GAMES.d_balut.bot=(d,s,lv)=>{const card=d.cards[s];if(!d.rl)return botDo(d,s,'roll',0);
  if(lv>1&&!(lv===2&&Math.random()<.2)){
    if(d.rl<3){const v0=dv=>blBest(card,dv)[1];const keep=dpKeep('bl'+card.join(','),d.dv,lv===3?3-d.rl:1,v0);
      if(keep!=='11111'){if(keep!==d.hd)return {...d,hd:keep};return botDo(d,s,'roll',0);}}
    return botDo(d,s,'sc',blBest(card,d.dv)[0]);}
  // easy: keeps the face it has most of, then scores where the number is biggest
  const c=cnt6(d.dv);if(d.rl<3&&Math.random()<.75){const f=c.indexOf(Math.max(...c.slice(1)));const keep=d.dv.map(x=>x===f?'1':'0').join('');if(keep!=='11111'){if(keep!==d.hd)return {...d,hd:keep};return botDo(d,s,'roll',0);}}
  let b=-1,bv=-1;for(let k=0;k<7;k++)if(blBox(card,k).includes(-1)){const v=blScore(k,d.dv)+Math.random()*6;if(v>bv){bv=v;b=k;}}return botDo(d,s,'sc',b);};
HELP.d_balut='بالوت بخمس زهرات: بدورك عندك 3 رميات، تثبّت اللي تبيه بالضغط عليه وترمي الباقي، وبعدها لازم تسجل في خانة فاضية (ولو بصفر). فيه 7 تشكيلات ولكل وحدة 4 خانات (28 دور): الأربعات والخمسات والستات (مجموع الزهر من هالرقم)، التسلسل (1-5 = 15، 2-6 = 20)، فل هاوس (ثلاثة وزوج: مجموع الزهر)، الاختيار (مجموع الزهر)، وبالوت (خمسة متشابهة: 20 + المجموع). بالنهاية تنحسب النقاط: الأربعات 52 أو أكثر +2، الخمسات 65 +2، الستات 78 +2، أربع تسلسلات كلها +4، أربع فل هاوس كلها +3، الاختيار 100 +2، وكل بالوت +2. وعلى المجموع: أقل من 300 = −2، من 300 = −1، من 350 = 0، ومن 400 +1 وكل 50 زيادة نقطة. يفوز صاحب أكثر نقاط، ولو تعادلوا فالأعلى مجموع. مع الفرق تنجمع نقاط الفريق.';

/* ======================= 5. bunco ======================= */
/* six rounds aiming at 1 to 6. Three dice: a point for each die showing the round's number, 5 for three of a kind of another
   number, and 21 (بونكو) for three of the round's number. Keep throwing while you score. The first side to reach 21 takes the
   round. Sides: partners sitting opposite each other with 4, 6 or 8 players, each one alone otherwise, or the room's teams */
const BU_R=6;
const buUnit=(d,s)=>Array.isArray(d.tm)?d.tm[s]:d.pl.length>=4&&d.pl.length%2===0?s%(d.pl.length/2):s;
const buSeats=(d,u)=>d.pl.map((_,s)=>s).filter(s=>buUnit(d,s)===u);
const buUnits=d=>[...new Set(d.pl.map((_,s)=>buUnit(d,s)))].filter(u=>buSeats(d,u).some(s=>alive(d,s)));
const buName=(d,u)=>{const m=buSeats(d,u).filter(s=>alive(d,s));return m.map(s=>nm(d,s)).join(' و');};
function buEnd(d){const us=buUnits(d);const key=u=>{const m=buSeats(d,u);return d.rw[m[0]]*1000+m.reduce((a,s)=>a+d.pts[s],0);};
  const mx=Math.max(...us.map(key)),top=us.filter(u=>key(u)===mx);if(top.length!==1)return {win:'d'};
  const m=buSeats(d,top[0]).filter(s=>alive(d,s));return m.length>1&&!Array.isArray(d.tm)?{win:m[0],wins:m}:{win:m[0]};}
function buRoll(d){const t=d.turn,u=buUnit(d,t),dv=rollN(3),tg=d.rd,c=cnt6(dv);let g,kind='';
  if(c[tg]===3){g=21;kind='bunco';}else if(Math.max(...c)===3){g=5;kind='mini';}else g=c[tg];
  const rp=[...d.rp];rp[u]=(rp[u]||0)+g;const pts=d.pts.map((v,s)=>s===t?v+g:v),bk=d.bk.map((v,s)=>s===t&&kind==='bunco'?v+1:v);
  let x={...d,dv,rc:d.rc+1,rp,pts,bk,lt:{s:t,g,kind},last:kind==='bunco'?`${nm(d,t)} بونكو!! +21 🎉`:kind==='mini'?`${nm(d,t)} ثلاثة متشابهة +5`:g?`${nm(d,t)} +${g}`:`${nm(d,t)} ما جاب شي، الدور للي بعده`};
  if(rp[u]>=21){const m=buSeats(d,u);const rw=d.rw.map((v,s)=>m.includes(s)?v+1:v);x={...x,rw,last:x.last+` • الجولة ${tg} لـ${buName(d,u)} 🏆`};
    if(tg>=BU_R)return {...x,...buEnd(x)};return {...x,rd:tg+1,rp:Array(d.pl.length).fill(0),turn:nextSeat(d,t)};}
  return g?x:{...x,turn:nextSeat(d,t)};}
GAMES.d_bunco={name:'بونكو',cat:'dice',lbc:'#C2457A',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D9568F"/><circle cx="50" cy="50" r="38" fill="#B83A73"/>${[[22,26,-12],[52,20,8],[36,52,-4]].map(([x,y,r],k)=>`<g transform="rotate(${r} ${x+13} ${y+13})"><rect x="${x}" y="${y}" width="26" height="26" rx="6" fill="#fff"/>${[[7,7],[19,19],[13,13]].slice(0,k+1).map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="2.8" fill="#2D4763"/>`).join('')}</g>`).join('')}<text x="50" y="94" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">21!</text></svg>`,
  init:n=>({rd:1,rp:Array(n).fill(0),dv:[],rw:Array(n).fill(0),pts:Array(n).fill(0),bk:Array(n).fill(0),rc:0,lt:null,last:''}),
  points:d=>d.rw,status:lastSt,
  winExtra:d=>'الجولات: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.rw[s]}${d.bk[s]?` (بونكو ×${d.bk[s]})`:''}`).join('، '),
  onTimeout:d=>buRoll(d),
  render(d,ctx){const my=ctx.my&&d.win==null,fr=d.dv.length&&once(`bu${d.gid}_${d.rc}`),tg=d.rd;
    let s=`<div class="d2-hd"><span>الجولة <b>${tg}</b> من ${BU_R}</span><span>الرقم المطلوب ${dieH(tg,{cls:'d2-tg'})}</span></div>`;
    s+=`<div class="ytray d2-tray ${d.lt&&d.lt.kind==='bunco'&&fr?'d2-bunco':''}">${d.dv.length?d.dv.map(x=>dieH(x,{roll:fr,cls:x===tg?'hit':''})).join(''):dieH(0)+dieH(0)+dieH(0)}${d.lt&&d.dv.length?`<b class="d2-sum">${d.lt.kind==='bunco'?'بونكو!':'+'+d.lt.g}</b>`:''}</div>`;
    s+=`<div class="acts">${rollBtn(d,my,d.lt&&d.lt.s===d.turn&&d.lt.g?'كمّل ارمِ':'ارمِ')}</div>`;
    s+=`<div class="d2-bu">${buUnits(d).map(u=>{const m=buSeats(d,u),v=d.rp[u]||0,on=m.includes(d.turn)&&d.win==null;
      return `<div class="d2-bur ${on?'on':''}" style="--c:${col(d,m[0])}"><i>${buName(d,u)}</i><span><u style="transform:scaleX(${Math.min(1,v/21)})"></u></span><b>${Math.min(v,99)}/21</b><em>${'🏆'.repeat(d.rw[m[0]])}</em></div>`;}).join('')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null||a!=='roll')return;act(buRoll(d));}
};
GAMES.d_bunco.bot=(d,s)=>botDo(d,s,'roll',0);
HELP.d_bunco='بونكو: 6 جولات، وكل جولة لها رقم من 1 إلى 6 بالترتيب. بدورك ترمي 3 زهرات: كل زهرة تطلع رقم الجولة بنقطة، وثلاث زهرات متشابهة من رقم ثاني بـ5، وثلاث زهرات كلها رقم الجولة «بونكو» بـ21. إذا جبت نقاط تكمل ترمي، وإذا ما جبت شي الدور للي بعدك. أول طرف يوصل 21 بالجولة ياخذها. الأطراف: مع 4 أو 6 أو 8 لاعبين كل اثنين متقابلين شركاء (الأول مع اللي بنص الدائرة)، وبباقي الأعداد كل واحد لحاله، ولو شغّلتوا الفرق كل فريق طرف. بعد 6 جولات يفوز صاحب أكثر جولات، ولو تعادلوا فالأكثر نقاط.';

/* ======================= 6. knucklebones ======================= */
/* two sides, a 3×3 board each. Throw one die and put it in a column of yours: the other side loses every die of the same
   number in that column. A column scores each number × how many times it is there × that count again (two 4s = 16, three = 36).
   When a side's board is full the bigger total wins. More players: two sides (even and odd seats) that take turns */
const kbCol=(g,c)=>[g[c*3],g[c*3+1],g[c*3+2]].map(Number).filter(x=>x);
const kbColSc=a=>{const c=cnt6(a);let t=0;for(let v=1;v<=6;v++)t+=v*c[v]*c[v];return t;};
const kbSc=g=>[0,1,2].reduce((a,c)=>a+kbColSc(kbCol(g,c)),0);
const kbPack=a=>a.join('').padEnd(3,'0');
const kbSet=(g,c,a)=>g.slice(0,c*3)+kbPack(a)+g.slice(c*3+3);
function kbPlace(G2,sd,c,v){const me=kbCol(G2[sd],c);if(me.length>=3)return null;const op=kbCol(G2[1-sd],c),kill=op.filter(x=>x===v).length;
  const g=[...G2];g[sd]=kbSet(G2[sd],c,[...me,v]);g[1-sd]=kbSet(G2[1-sd],c,op.filter(x=>x!==v));return {g,kill};}
const kbFull=g=>!g.includes('0');
const kbSide=(d,s)=>s%2;
GAMES.d_knuck={teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,name:'عظام الكعب',cat:'dice',lbc:'#5A4632',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6B533A"/><rect x="14" y="10" width="72" height="36" rx="6" fill="#3E2E1F"/><rect x="14" y="54" width="72" height="36" rx="6" fill="#3E2E1F"/>${[0,1,2].map(c=>`<rect x="${19+c*23}" y="15" width="18" height="26" rx="3" fill="#8C6B47"/><rect x="${19+c*23}" y="59" width="18" height="26" rx="3" fill="#8C6B47"/>`).join('')}<rect x="21" y="62" width="14" height="14" rx="3" fill="#fff"/><circle cx="28" cy="69" r="2.4" fill="#2D4763"/><rect x="44" y="62" width="14" height="14" rx="3" fill="#F2C14E"/><circle cx="48" cy="66" r="2" fill="#2D4763"/><circle cx="54" cy="72" r="2" fill="#2D4763"/><path d="M44 20l16 16M60 20L44 36" stroke="#E5483F" stroke-width="5" stroke-linecap="round"/></svg>`,
  init:()=>({g:['000000000','000000000'],dv:0,sd:0,tr:[0,0],rc:0,lm:null,last:''}),
  start:d=>({...d,sd:d.turn%2,turn:tmNow({...d,sd:d.turn%2},d.turn%2)}),
  points:d=>d.pl.map((r,s)=>kbSc(d.g[s%2])),status:lastSt,
  winExtra:d=>`${tmName(d,0)} ${kbSc(d.g[0])} • ${tmName(d,1)} ${kbSc(d.g[1])}`,
  onTimeout(d){let x=d;if(!x.dv)x={...x,dv:R6(),rc:x.rc+1};const c=[0,1,2].find(c=>kbCol(x.g[x.sd],c).length<3);return GAMES.d_knuck.put(x,c);},
  onSkip:(nd,d)=>tmSkip(nd,d),
  put(d,c){const sd=d.sd,r=kbPlace(d.g,sd,c,d.dv);if(!r)return null;const t=d.turn;
    let x={...d,g:r.g,dv:0,lm:{sd,c,v:d.dv,k:r.kill,rc:d.rc},last:`${nm(d,t)} حط ${d.dv} بالعمود ${c+1}${r.kill?` وكسر ${r.kill} 💥`:''}`};
    if(kbFull(r.g[sd])){const a=kbSc(r.g[0]),b=kbSc(r.g[1]);return {...x,...(a===b?{win:'d'}:tmWin(x,a>b?0:1))};}
    const tr=[...d.tr];tr[sd]=(tr[sd]+1)%(tmSeats(d,sd).length||1);x={...x,tr,sd:1-sd};return {...x,turn:tmNow(x,1-sd)};},
  render(d,ctx){const my=ctx.my&&d.win==null,meS=ctx.local||ctx.v<0?d.sd:kbSide(d,ctx.v),opS=1-meS;
    const fr=d.dv&&once(`kb${d.gid}_${d.rc}`),lm=d.lm,lmNew=lm&&once(`kbl${d.gid}_${lm.rc}`);
    const board=(sd,flip)=>{const g=d.g[sd],cs=[0,1,2].map(c=>kbCol(g,c));const can=my&&sd===d.sd&&d.dv;
      return `<div class="d2-kb ${flip?'d2-up':''} ${sd===d.sd&&d.win==null?'on':''}" style="--c:${col(d,tmSeats(d,sd)[0]??sd)}"><div class="d2-kbn"><span>${tmSeats(d,sd).map(x=>nm(d,x)).join(' و')||'—'}</span><b>${kbSc(g)}</b></div><div class="d2-kbg">${[0,1,2].map(c=>{const a=cs[c],cc=cnt6(a);
        const cells=[0,1,2].map(r=>{const v=a[r]||0;const isNew=lmNew&&lm.sd===sd&&lm.c===c&&r===a.length-1;return `<div class="d2-kc">${v?dieH(v,{roll:isNew,cls:cc[v]>1?'m'+cc[v]:''}):''}</div>`;});
        const hit=lm&&lm.sd!==sd&&lm.c===c&&lm.k&&lmNew;
        return `<${can&&a.length<3?'button':'div'} class="d2-kcol ${hit?'hit':''} ${can&&a.length<3?'can':''}" ${can&&a.length<3?`data-ga="put" data-i="${c}"`:''}>${cells.join('')}<em>${kbColSc(a)}</em></${can&&a.length<3?'button':'div'}>`;}).join('')}</div></div>`;};
    let s=board(opS,true);
    s+=`<div class="d2-kbm">${d.dv?dieH(d.dv,{roll:fr,cls:'d2-kbd'}):my?`<button class="btn d2-roll" style="background:${col(d,d.turn)}" data-ga="roll">🎲 ارمِ</button>`:dieH(0,{cls:'d2-kbd'})}${d.dv&&my?'<small>اختر عمود</small>':''}</div>`;
    s+=board(meS,false);
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='roll'){if(d.dv)return;act({...d,dv:R6(),rc:d.rc+1});return;}
    if(a==='put'){if(!d.dv||![0,1,2].includes(i))return;const x=GAMES.d_knuck.put(d,i);if(x)act(x);}}
};
// knucklebones bots: hard looks one throw ahead (the other side's die and its best answer); medium takes the best move now
function kbGain(g2,sd,c,v){const r=kbPlace(g2,sd,c,v);if(!r)return null;return {g:r.g,e:kbSc(r.g[sd])-kbSc(r.g[1-sd])-(kbSc(g2[sd])-kbSc(g2[1-sd]))};}
function kbEval(g2,sd){let e=kbSc(g2[sd])-kbSc(g2[1-sd]);if(kbFull(g2[sd]))e+=e>0?500:e<0?-500:0;return e;}
GAMES.d_knuck.bot=(d,s,lv)=>{if(!d.dv)return botDo(d,s,'roll',0);const sd=d.sd,cols=[0,1,2].filter(c=>kbCol(d.g[sd],c).length<3);
  if(lv===1&&Math.random()<.5)return botDo(d,s,'put',pickR(cols));
  let best=cols[0],bv=-Infinity;
  for(const c of cols){const r=kbPlace(d.g,sd,c,d.dv);let v=kbEval(r.g,sd);
    if(lv===3&&!kbFull(r.g[sd])){let ex=0;for(let o=1;o<=6;o++){let w=Infinity;for(let oc=0;oc<3;oc++){const q=kbPlace(r.g,1-sd,oc,o);if(!q)continue;const e=kbEval(q.g,sd)-(kbFull(q.g[1-sd])?(kbSc(q.g[1-sd])>kbSc(q.g[sd])?500:0):0);if(e<w)w=e;}ex+=(w===Infinity?v:w)/6;}v=ex;}
    v+=Math.random()*.01;if(v>bv){bv=v;best=c;}}
  return botDo(d,s,'put',best);};
HELP.d_knuck='عظام الكعب (Knucklebones): كل طرف عنده لوح 3×3. بدورك ترمي زهرة وحدة وتحطها بأي عمود فيه مكان عندك. إذا الخصم عنده بنفس العمود زهرات بنفس الرقم تنكسر كلها وتطير من لوحه. نقاط العمود: كل رقم × عدد مرات تكراره × عدد مرات تكراره مرة ثانية، يعني 4 لحالها = 4، زوج 4 = 16، ثلاث 4 = 36. أول ما يمتلي لوح أي طرف تخلص اللعبة ويفوز الأعلى مجموع. لو أكثر من لاعبين: طرفين (المقاعد الفردية ضد الزوجية، أو الفريقين لو شغلتوا الفرق) وأعضاء الطرف يتناوبون الرمي.';

/* ======================= 7. poker dice ======================= */
/* five dice, up to three throws, keeping any. Hands from the top: five of a kind, four, full house, straight (2-6 over 1-5),
   three, two pairs, a pair, nothing; equal hands compare their numbers. The player who opens the round sets how many
   throws everyone else may take (the traditional rule). Three rounds, most rounds won wins */
const PK_R=3;
const PKN=['ولا شي','زوج','زوجين','ثلاثة','ستريت','فل هاوس','أربعة','خمسة'];
function pkEval(dv){const c=cnt6(dv);const g=[1,2,3,4,5,6].filter(f=>c[f]).sort((a,b)=>c[b]-c[a]||b-a),sh=g.map(f=>c[f]),srt=[...dv].sort().join('');
  const cat=sh[0]===5?7:sh[0]===4?6:sh[0]===3&&sh[1]===2?5:srt==='12345'||srt==='23456'?4:sh[0]===3?3:sh[0]===2&&sh[1]===2?2:sh[0]===2?1:0;
  let tb=0;g.forEach((f,i)=>tb+=f*Math.pow(7,4-i));return cat*16807+tb;}
const pkCat=v=>Math.floor(v/16807);
const pkFresh=()=>({dv:[0,0,0,0,0],hd:'00000',rl:0});
const PK={R:PK_R,fresh:pkFresh,rate:x=>{const {gain,w}=topGain(x,v=>v);const b=Math.max(...x.res.filter(v=>v!=null));return {gain,msg:winMsg(x,w,`بـ${PKN[pkCat(b)]}`)};},
  after:nx=>({...nx,cap:3})};
function pkEnd(d,t){const v=pkEval(d.dv);let x={...d,res:d.res.map((r,s)=>s===t?v:r),lt:{s:t,dv:d.dv,v},last:`${nm(d,t)}: ${PKN[pkCat(v)]}`};
  if(t===d.ld)x={...x,cap:d.rl,last:x.last+(d.rl<3?` • الحد ${d.rl} ${d.rl===1?'رمية':'رميات'} للباقين`:'')};
  return rgNext(x,t,PK);}
// the hands the others usually end with (a quick model: keep the biggest group, three throws), for the hard bot's odds
let PKD=null;function pkDist(){if(PKD)return PKD;const a=[];for(let k=0;k<2500;k++){let dv=rollN(5);for(let r=1;r<3;r++){const c=cnt6(dv),f=c.indexOf(Math.max(...c.slice(1)),1);const keep=Math.max(...c.slice(1))>1?dv.filter(x=>x===f):[Math.max(...dv)];dv=[...keep,...rollN(5-keep.length)];}a.push(pkEval(dv));}
  return PKD=a.sort((x,y)=>x-y);}
const pkPc=v=>{const a=pkDist();let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m;}let eq=lo;while(eq<a.length&&a[eq]===v)eq++;return (lo+(eq-lo)/2)/a.length;};
GAMES.d_poker={name:'بوكر النرد',cat:'dice',lbc:'#1F6B4A',net:{host:['roll','stop']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#23845A"/><ellipse cx="50" cy="58" rx="44" ry="30" fill="#1B6B48"/>${[[12,40,-14,'A'],[34,32,-4,'K'],[56,32,6,'Q'],[76,42,16,'J']].map(([x,y,r,t])=>`<g transform="rotate(${r} ${x+11} ${y+11})"><rect x="${x}" y="${y}" width="22" height="22" rx="5" fill="#fff"/><text x="${x+11}" y="${y+17}" font-size="15" font-weight="900" fill="${t==='K'||t==='J'?'#2D4763':'#D23B3B'}" text-anchor="middle">${t}</text></g>`).join('')}<path d="M36 76l14-6 14 6-14 8z" fill="#F2C14E"/></svg>`,
  init:n=>({...rgInit(n),...pkFresh(),cap:3,ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'الجولات: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout:d=>d.rl?pkEnd(d,d.turn):pkEnd({...d,dv:rollN(5),rl:1,rc:d.rc+1},d.turn),onSkip:(nd,d)=>rgSkip(nd,d,PK),
  render(d,ctx){dpWarm();const t=d.turn,my=ctx.my&&d.win==null,cap=t===d.ld?3:d.cap,fr=d.rl>0&&once(`pk${d.gid}_${d.rc}`);
    let s=rgHead(d,PK_R,`<span>${t===d.ld?'يبدأ ويحدد عدد الرميات':`الحد: <b>${cap}</b> ${cap===1?'رمية':'رميات'}`}</span>`);
    s+=trayHold(d,ctx,my&&d.rl>0&&d.rl<cap,fr);
    if(d.rl)s+=`<p class="d2-hand">${PKN[pkCat(pkEval(d.dv))]}</p>`;
    s+=`<div class="acts"><button class="btn yroll" style="background:${col(d,t)}" data-ga="roll" ${my&&d.rl<cap?'':'disabled'}>🎲 ارمِ ${rollsLeft(cap,d.rl)}</button><button class="btn navy" data-ga="stop" ${my&&d.rl>0&&d.rl<cap?'':'disabled'}>✋ أكتفي</button></div>`;
    s+=rgRow(d,v=>PKN[pkCat(v)]);
    if(d.lt&&d.lt.s!==t)s+=ltBox(d,`${miniD(d.lt.dv)}<b>${PKN[pkCat(d.lt.v)]}</b>`);
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn,cap=t===d.ld?3:d.cap;
    if(a==='hold'){if(d.rl>=cap)return;const x=hold(d,i);if(x)act(x);return;}
    if(a==='roll'){if(d.rl>=cap)return;const x={...d,dv:reroll(d),rl:d.rl+1,rc:d.rc+1};act(x.rl>=cap?pkEnd(x,t):x);return;}
    if(a==='stop'){if(!d.rl)return;act(pkEnd(d,t));}}
};
GAMES.d_poker.bot=(d,s,lv)=>{if(!d.rl)return botDo(d,s,'roll',0);const cap=s===d.ld?3:d.cap,left=cap-d.rl;if(left<=0)return botDo(d,s,'stop',0);
  if(lv===1){const c=cnt6(d.dv),mx=Math.max(...c.slice(1));if(pkCat(pkEval(d.dv))>=4&&Math.random()<.8||Math.random()<.15)return botDo(d,s,'stop',0);
    const f=c.indexOf(mx,1);const keep=d.dv.map(x=>mx>1&&x===f?'1':'0').join('');if(keep!==d.hd)return {...d,hd:keep};return botDo(d,s,'roll',0);}
  const T=rgTarget(d,s),rem=rgRem(d,s);
  const v0=lv===3?dv=>{const v=pkEval(dv);return (T==null||v>T?1:v===T?.5:0)*Math.pow(pkPc(v),rem);}:dv=>{const v=pkEval(dv);return T!=null&&v<=T?pkCat(v)*.01:pkCat(v)+1;};
  const keep=dpKeep(`pk${lv}_${T}_${rem}`,d.dv,lv===3?left:1,v0);
  if(keep==='11111')return botDo(d,s,'stop',0);if(keep!==d.hd)return {...d,hd:keep};return botDo(d,s,'roll',0);};
HELP.d_poker='بوكر النرد بخمس زهرات: بدورك عندك لين 3 رميات، تثبّت اللي تبيه وترمي الباقي، أو تكتفي باللي معك. الأيادي من الأقوى: خمسة متشابهة، أربعة، فل هاوس (ثلاثة وزوج)، ستريت (2-6 أقوى من 1-5)، ثلاثة، زوجين، زوج، ولا شي. إذا تساوت اليد تنقارن الأرقام (الأكبر يفوز، والست أعلى رقم). اللي يبدأ الجولة يحدد عدد الرميات: إذا اكتفى برميتين، الباقين ما يرمون أكثر من رميتين. أقوى يد تاخذ الجولة (والتعادل الكل ياخذ)، وبعد 3 جولات يفوز صاحب أكثر جولات، ولو تعادلوا جولة فاصلة. مع الفرق تنجمع جولات الفريق.';

/* ======================= 8. cee-lo ======================= */
/* three dice, thrown again until they say something: 4-5-6 is the best, then three of a kind (6-6-6 highest), then a point
   (a pair and the odd die is the point, 6 down to 1), and 1-2-3 is the worst. Highest takes the round; three rounds */
const CL_R=3;
function clRank(dv){const s=[...dv].sort().join('');if(s==='456')return 20;if(s==='123')return 0;const c=cnt6(dv);const m=c.indexOf(3);if(m>0)return 10+m;
  if(c.indexOf(2)>0)return c.findIndex((x,i)=>i>0&&x===1);return -1;}
const clName=r=>r===20?'4-5-6 سي لو!':r>10?`ثلاثة ${r-10}`:r>0?`نقطة ${r}`:'1-2-3';
const CL={R:CL_R,fresh:()=>({dv:[],tr:0}),rate:x=>{const {gain,w}=topGain(x,v=>v,0);return {gain,msg:winMsg(x,w,`بـ${clName(Math.max(...x.res.filter(v=>v!=null)))}`)};}};
function clRoll(d){const t=d.turn,dv=rollN(3),r=clRank(dv);const x={...d,dv,tr:d.tr+1,rc:d.rc+1};
  if(r<0)return {...x,last:`${nm(d,t)}: ما لها معنى، يرمي مرة ثانية`};
  return rgNext({...x,res:x.res.map((v,s)=>s===t?r:v),lt:{s:t,dv,v:r},last:`${nm(d,t)}: ${clName(r)}${r===20?' 🔥':r===0?' 😬':''}`},t,CL);}
GAMES.d_ceelo={name:'سي لو',cat:'dice',lbc:'#9A2B2B',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B23434"/><circle cx="50" cy="56" r="40" fill="#8E2424"/>${[[16,40,-10,4],[38,30,4,5],[60,40,14,6]].map(([x,y,r,n])=>`<g transform="rotate(${r} ${x+12} ${y+12})"><rect x="${x}" y="${y}" width="24" height="24" rx="5" fill="#fff"/>${({4:[[6,6],[18,6],[6,18],[18,18]],5:[[6,6],[18,6],[12,12],[6,18],[18,18]],6:[[6,5],[18,5],[6,12],[18,12],[6,19],[18,19]]})[n].map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="2.4" fill="#2D4763"/>`).join('')}</g>`).join('')}<text x="50" y="88" font-size="14" font-weight="900" fill="#F2C14E" text-anchor="middle">4·5·6</text></svg>`,
  init:n=>({...rgInit(n),dv:[],tr:0,ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'الجولات: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout(d){let x=d;for(let k=0;k<40&&x.turn===d.turn&&x.rn===d.rn&&x.win==null;k++)x=clRoll(x);return x;},onSkip:(nd,d)=>rgSkip(nd,d,CL),
  render(d,ctx){const my=ctx.my&&d.win==null;const L=d.dv.length?{dv:d.dv,v:clRank(d.dv)}:null;
    let s=rgHead(d,CL_R,d.tr?`<span>رمية رقم <b>${d.tr+1}</b></span>`:'');
    const show=d.dv.length?d.dv:d.lt?d.lt.dv:[],fr=show.length&&once(`cl${d.gid}_${d.rc}`);
    s+=`<div class="ytray d2-tray">${show.length?show.map(x=>dieH(x,{roll:fr})).join(''):dieH(0)+dieH(0)+dieH(0)}${show.length?`<b class="d2-sum">${L&&L.v<0?'؟':clName(d.dv.length?L.v:d.lt.v)}</b>`:''}</div>`;
    s+=`<div class="acts">${rollBtn(d,my,d.tr?'ارمِ مرة ثانية':'ارمِ')}</div>`;
    s+=rgRow(d,clName);
    s+=`<div class="d2-ladder"><span>4-5-6</span><span>ثلاثة</span><span>نقطة 6…1</span><span>1-2-3</span></div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null||a!=='roll')return;act(clRoll(d));}
};
// cee-lo bots have nothing to choose: they throw
GAMES.d_ceelo.bot=(d,s)=>botDo(d,s,'roll',0);
HELP.d_ceelo='سي لو بثلاث زهرات: بدورك ترمي لين تطلع لك تشكيلة لها معنى (غيرها ترمي مرة ثانية). من الأقوى: 4-5-6 «سي لو»، بعدها ثلاثة متشابهة (ثلاث ستات الأعلى)، بعدها «نقطة»: زوج وزهرة ثالثة والنقطة هي رقم الزهرة الثالثة (6 أقوى نقطة)، والأضعف 1-2-3. أعلى رمية تاخذ الجولة (والتعادل الكل ياخذ). بعد 3 جولات يفوز صاحب أكثر جولات، ولو تعادلوا جولة فاصلة. مع الفرق تنجمع جولات الفريق.';

/* ======================= 9. threes ======================= */
/* five dice: after every throw keep at least one die, throw the rest, until all five are kept. Threes count 0, the other dice
   their number; the lowest total wins. Three rounds, lowest sum over the rounds wins */
const TH_R=3;
const thv=x=>x===3?0:x;
const thSum=a=>a.reduce((s,x)=>s+thv(x),0);
const thFresh=()=>({dv:[],hd:'',kp:[],rl:0});
const TH={R:TH_R,low:true,fresh:thFresh,rate:x=>{const vs=x.res.map((v,s)=>alive(x,s)&&v!=null?v:null),ok=vs.filter(v=>v!=null),mn=Math.min(...ok);
  const w=vs.map((v,s)=>v===mn?s:-1).filter(s=>s>=0);return {gain:x.res.map(v=>v||0),msg:`أقل مجموع بالجولة ${mn}: ${w.map(s=>nm(x,s)).join(' و')}`};}};
function thDone(d,t,kp){const v=thSum(kp);return rgNext({...d,kp,dv:[],hd:'',res:d.res.map((r,s)=>s===t?v:r),lt:{s:t,kp,v},last:`${nm(d,t)} خلّص بـ${v}${v===0?' 🎯':''}`},t,TH);}
// throw the dice not kept; a last single die is kept by itself
function thRoll(d,kp){const dv=rollN(5-kp.length);const x={...d,kp,dv,hd:'0'.repeat(dv.length),rl:d.rl+1,rc:d.rc+1};return dv.length===1?thDone(x,d.turn,[...kp,dv[0]]):x;}
GAMES.d_three={name:'الثلاثات',cat:'dice',lbc:'#2E6F73',net:{host:['roll','keep']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#32858A"/>${[[14,16,-8],[56,14,10],[34,54,-2]].map(([x,y,r])=>`<g transform="rotate(${r} ${x+15} ${y+15})"><rect x="${x}" y="${y}" width="30" height="30" rx="7" fill="#fff"/>${[[7,7],[15,15],[23,23]].map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="3.2" fill="#2D4763"/>`).join('')}</g>`).join('')}<text x="80" y="88" font-size="26" font-weight="900" fill="#F2C14E" text-anchor="middle">=0</text></svg>`,
  init:n=>({...rgInit(n),...thFresh(),ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'المجموع (الأقل يفوز): '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout(d){const t=d.turn;if(!d.rl){const x=thRoll(d,d.kp);if(x.turn!==t||x.rn!==d.rn)return x;d=x;}return thDone(d,t,[...d.kp,...d.dv]);},
  onSkip:(nd,d)=>rgSkip(nd,d,TH),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,fr=d.dv.length&&once(`th${d.gid}_${d.rc}`),sel=[...d.hd].filter(x=>x==='1').length;
    let s=rgHead(d,TH_R,`<span>مجموعك <b>${thSum(d.kp)}</b></span>`);
    s+=`<div class="d2-kept"><small>اللي ثبّتها</small>${d.kp.length?d.kp.map(x=>dieH(x,{cls:x===3?'zero':''})).join(''):'<em>ولا وحدة للحين</em>'}</div>`;
    s+=`<div class="ytray d2-tray">${d.dv.length?d.dv.map((x,i)=>dieH(x,{held:d.hd[i]==='1',roll:fr,cls:x===3?'zero':'',...(my?{ga:'hold',i}:{})})).join(''):[...Array(5-d.kp.length)].map(()=>dieH(0)).join('')}</div>`;
    s+=`<div class="acts">${d.dv.length?`<button class="btn d2-roll" style="background:${col(d,t)}" data-ga="keep" ${my&&sel?'':'disabled'}>${sel===d.dv.length?'✓ ثبّت وخلّص':`ثبّت ${sel||''} وارمِ الباقي`}</button>`:rollBtn(d,my)}</div>`;
    if(my&&d.dv.length)s+='<p class="note">اختر زهرة وحدة على الأقل تثبّتها، والثلاثة تنحسب صفر</p>';
    s+=rgRow(d,v=>v);
    if(d.lt&&d.lt.s!==t)s+=ltBox(d,`${miniD(d.lt.kp)}<b>${d.lt.v}</b>`);
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='roll'){if(d.dv.length)return;act(thRoll(d,d.kp));return;}
    if(a==='hold'){if(!d.dv.length||!Number.isInteger(i)||i<0||i>=d.dv.length)return;act({...d,hd:setAt(d.hd,i,d.hd[i]==='1'?'0':'1')});return;}
    if(a==='keep'){if(!d.dv.length||!d.hd.includes('1'))return;const kp=[...d.kp,...d.dv.filter((x,k)=>d.hd[k]==='1')];
      act(kp.length>=5?thDone(d,t,kp):thRoll(d,kp));}}
};
/* threes odds: TE[k] is the expected final sum of k dice still to throw when one plays for the lowest sum; THD[k] the spread of
   that sum (for the hard bot, which plays for the chance to finish under the best total so far and under those still to come) */
let THX=null;function thOdds(){if(THX)return THX;const outs=k=>{const o=[];const rec=(a)=>{if(a.length===k){o.push(a.map(thv).sort((x,y)=>x-y));return;}for(let f=1;f<=6;f++)rec([...a,f]);};rec([]);return o;};
  const TE=[0],THD=[[1]],O=[null];
  for(let k=1;k<=5;k++){const os=outs(k);O.push(os);let e=0;const dist=[];
    for(const w of os){let best=null;let pre=0;for(let j=1;j<=k;j++){pre+=w[j-1];const v=pre+TE[k-j];if(best==null||v<best.v)best={v,j,pre};}e+=best.v;
      THD[k-best.j].forEach((p,x)=>{dist[x+best.pre]=(dist[x+best.pre]||0)+p/os.length;});}
    TE.push(e/os.length);THD.push(Array.from(dist,x=>x||0));}
  // others' final sums: cumulative, so P(other >= v) is easy
  const ge=[];const D=THD[5];for(let v=31;v>=0;v--)ge[v]=(ge[v+1]||0)+(D[v]||0);
  return THX={TE,O,ge};}
GAMES.d_three.bot=(d,s,lv)=>{if(!d.dv.length)return botDo(d,s,'roll',0);const k=d.dv.length,w=d.dv.map((x,i)=>[thv(x),i]).sort((a,b)=>a[0]-b[0]);const X=thOdds();let j;
  if(lv===1){j=1+w.filter(([v],q)=>q>0&&v<=1+rnd(3)).length;if(Math.random()<.3)j=1+rnd(k);}
  else if(lv===2||rgTarget(d,s)==null&&rgRem(d,s)===0){let b=null,pre=0;for(let q=1;q<=k;q++){pre+=w[q-1][0];const v=pre+X.TE[k-q];if(b==null||v<b.v)b={v,q};}j=b.q;}
  else{// hard: the chance to win the round from here, over every way the rest can go
    const T=rgTarget(d,s),rem=rgRem(d,s),base=thSum(d.kp);const memo={};
    const fin=v=>(T==null||v<T?1:v===T?.5:0)*Math.pow((X.ge[v+1]||0)+.5*((X.ge[v]||0)-(X.ge[v+1]||0)),rem);
    const U=(m,sum)=>{if(!m)return fin(sum);const key=m+':'+sum;if(memo[key]!=null)return memo[key];let e=0;for(const o of X.O[m]){let b=-1,pre=0;for(let q=1;q<=m;q++){pre+=o[q-1];const v=U(m-q,sum+pre);if(v>b)b=v;}e+=b;}return memo[key]=e/X.O[m].length;};
    let b=null,pre=0;for(let q=1;q<=k;q++){pre+=w[q-1][0];const v=U(k-q,base+pre);if(b==null||v>b.v+1e-12)b={v,q};}j=b.q;}
  const keep=new Set(w.slice(0,j).map(x=>x[1]));const hd=d.dv.map((x,i)=>keep.has(i)?'1':'0').join('');
  if(hd!==d.hd)return {...d,hd};return botDo(d,s,'keep',0);};
HELP.d_three='الثلاثات بخمس زهرات: الهدف أقل مجموع. ترمي الخمس، ولازم تثبّت زهرة وحدة على الأقل بكل رمية، وترمي الباقي، لين تثبّت الخمس كلها. الثلاثة تنحسب صفر، وباقي الأرقام بقيمتها (يعني أحسن شي خمس ثلاثات = صفر). كل جولة ينضاف مجموعك، وبعد 3 جولات يفوز الأقل مجموع، ولو تعادلوا جولة فاصلة. مع الفرق ينحسب متوسط الفريق.';

/* ======================= 10. dice golf ======================= */
/* nine holes. On a hole throw three dice again and again until two of them match: the number of throws is your strokes.
   Lowest total after nine holes wins */
const GF_R=9;
const GF={R:GF_R,low:true,fresh:()=>({dv:[],st:0}),rate:x=>{const vs=x.res.map((v,s)=>alive(x,s)&&v!=null?v:null),mn=Math.min(...vs.filter(v=>v!=null));
  const w=vs.map((v,s)=>v===mn?s:-1).filter(s=>s>=0);return {gain:x.res.map(v=>v||0),msg:`أحسن ضربة بالحفرة ${mn}: ${w.map(s=>nm(x,s)).join(' و')}${mn===1?' ⛳':''}`};}};
const gfDbl=dv=>new Set(dv).size<3;
function gfRoll(d){const t=d.turn,dv=rollN(3),st=d.st+1,x={...d,dv,st,rc:d.rc+1};
  if(!gfDbl(dv))return {...x,last:`${nm(d,t)}: ضربة ${st}`};
  const hs=d.hs.map((h,s)=>s===t&&d.rn<=GF_R?[...h,st]:h);
  return rgNext({...x,hs,res:x.res.map((v,s)=>s===t?st:v),lt:{s:t,dv,v:st},last:`${nm(d,t)} دخّلها بـ${st} ${st===1?'ضربة ⛳':'ضربات'}`},t,GF);}
GAMES.d_golf={name:'غولف النرد',cat:'dice',lbc:'#3E8E41',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#58B05C"/><ellipse cx="50" cy="74" rx="40" ry="16" fill="#3E8E41"/><ellipse cx="62" cy="74" rx="6" ry="2.6" fill="#1E3B1F"/><path d="M62 74V18" stroke="#fff" stroke-width="3"/><path d="M62 18L84 26L62 34Z" fill="#E5483F"/><rect x="18" y="52" width="22" height="22" rx="5" fill="#fff" transform="rotate(-10 29 63)"/><circle cx="24" cy="58" r="2.4" fill="#2D4763"/><circle cx="34" cy="68" r="2.4" fill="#2D4763"/><circle cx="34" cy="58" r="2.4" fill="#2D4763"/><circle cx="24" cy="68" r="2.4" fill="#2D4763"/></svg>`,
  init:n=>({...rgInit(n),dv:[],st:0,hs:Array(n).fill(0).map(()=>[]),ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'الضربات (الأقل يفوز): '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout(d){let x=d;for(let k=0;k<60&&x.turn===d.turn&&x.rn===d.rn&&x.win==null;k++)x=gfRoll(x);return x;},onSkip:(nd,d)=>rgSkip(nd,d,GF),
  render(d,ctx){const my=ctx.my&&d.win==null,show=d.dv.length?d.dv:d.lt?d.lt.dv:[],fr=show.length&&once(`gf${d.gid}_${d.rc}`);const c=cnt6(show);
    let s=`<div class="d2-hd"><span>${d.rn>GF_R?'<b>حفرة فاصلة</b>':`الحفرة <b>${d.rn}</b> من ${GF_R}`}</span><span>ضربات هالحفرة <b>${d.st}</b></span></div>`;
    s+=`<div class="ytray d2-tray d2-green">${show.length?show.map(x=>dieH(x,{roll:fr,cls:c[x]>1?'hit':''})).join(''):dieH(0)+dieH(0)+dieH(0)}${show.length&&gfDbl(show)?'<b class="d2-sum">⛳</b>':''}</div>`;
    s+=`<div class="acts">${rollBtn(d,my,d.st?'اضرب مرة ثانية':'اضرب')}</div>`;
    s+=`<div class="d2-gf"><div class="d2-gfh"><i></i>${[...Array(GF_R)].map((_,k)=>`<u class="${k+1===d.rn?'on':''}">${k+1}</u>`).join('')}<b>Σ</b></div>${d.pl.map((r,p)=>alive(d,p)?`<div class="${p===d.turn&&d.win==null?'on':''}" style="--c:${col(d,p)}"><i>${nm(d,p)}</i>${[...Array(GF_R)].map((_,k)=>{const v=d.hs[p][k];return `<u class="${v===1?'ace':v>=5?'bad':''}">${v??''}</u>`;}).join('')}<b>${d.tot[p]}</b></div>`:'').join('')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null||a!=='roll')return;act(gfRoll(d));}
};
GAMES.d_golf.bot=(d,s)=>botDo(d,s,'roll',0);
HELP.d_golf='غولف النرد: 9 حفر. بدورك ترمي 3 زهرات، وإذا ما فيها زوج متشابه (رقمين نفس الشي) ترمي الثلاث من جديد، لين يطلع زوج. عدد الرميات هو عدد ضرباتك بالحفرة (رمية وحدة = هول إن ون ⛳). بعد 9 حفر يفوز صاحب أقل مجموع ضربات، ولو تعادلوا حفرة فاصلة. مع الفرق ينحسب متوسط الفريق.';

/* ======================= 11. dice twenty-one ======================= */
/* throw two dice and add them up, again and again; from 14 on you throw one die only. Stop when you like; over 21 you are bust.
   Closest to 21 takes the round, a tie is settled by one die each. Three rounds, most rounds wins */
const T21_R=3;
const T21={R:T21_R,fresh:()=>({tt:0,dv:[],rl:0}),rate(x){const vs=x.res.map((v,s)=>alive(x,s)&&v!=null&&v>=0?v:null),ok=vs.filter(v=>v!=null);
  if(!ok.length)return {gain:x.res.map(()=>0),msg:'الكل احترق! ما أحد كسب الجولة'};const mx=Math.max(...ok);let w=vs.map((v,s)=>v===mx?s:-1).filter(s=>s>=0);let tie='';
  // a tie at the top: one die each, again until one is higher
  for(let k=0;k<20&&w.length>1;k++){const r=w.map(()=>R6()),hi=Math.max(...r);tie+=` (${w.map((s,j)=>`${nm(x,s)} ${r[j]}`).join('، ')})`;w=w.filter((s,j)=>r[j]===hi);}
  const gain=x.res.map((_,s)=>w.length===1&&s===w[0]?1:0);return {gain,msg:w.length===1?`الجولة لـ${nm(x,w[0])} بـ${mx}${tie?' بعد زهرة الفصل'+tie:''}`:'تعادل بالجولة'};}};
function t21End(d,t,msg){return rgNext({...d,res:d.res.map((r,s)=>s===t?(d.tt>21?-1:d.tt):r),lt:{s:t,v:d.tt},last:msg},t,T21);}
function t21Roll(d){const t=d.turn,dv=rollN(d.tt>=14?1:2),tt=d.tt+dsum(dv),x={...d,dv,tt,rl:d.rl+1,rc:d.rc+1};
  if(tt>21)return t21End(x,t,`${nm(d,t)} طلع ${tt} واحترق 🔥`);if(tt===21)return t21End(x,t,`${nm(d,t)} جاب 21 بالضبط! 🎯`);return {...x,last:`${nm(d,t)}: ${tt}`};}
GAMES.d_21={name:'واحد وعشرين بالنرد',cat:'dice',lbc:'#24476B',net:{host:['roll','stop']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2B5A87"/><circle cx="50" cy="50" r="38" fill="#1E4469"/><text x="50" y="62" font-size="38" font-weight="900" fill="#F2C14E" text-anchor="middle">21</text><rect x="62" y="62" width="24" height="24" rx="5" fill="#fff" transform="rotate(14 74 74)"/><circle cx="69" cy="69" r="2.5" fill="#2D4763"/><circle cx="79" cy="79" r="2.5" fill="#2D4763"/><rect x="14" y="14" width="22" height="22" rx="5" fill="#fff" transform="rotate(-12 25 25)"/><circle cx="25" cy="25" r="2.6" fill="#D23B3B"/></svg>`,
  init:n=>({...rgInit(n),tt:0,dv:[],rl:0,ld:0}),start:d=>({...d,ld:d.turn}),
  points:d=>d.tot,status:lastSt,
  winExtra:d=>'الجولات: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout:d=>d.rl?t21End(d,d.turn,`${nm(d,d.turn)} وقف على ${d.tt}`):t21Roll(d),onSkip:(nd,d)=>rgSkip(nd,d,T21),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,fr=d.dv.length&&once(`t21${d.gid}_${d.rc}`),one=d.tt>=14;
    let s=rgHead(d,T21_R,`<span>${one?'زهرة وحدة':'زهرتين'} بالرمية</span>`);
    s+=`<div class="d2-21"><div class="ytray d2-tray">${d.dv.length?d.dv.map(x=>dieH(x,{roll:fr})).join(''):dieH(0)+(one?'':dieH(0))}</div><div class="d2-meter ${d.tt>=17?'hot':''}"><b>${d.tt}</b><span><u style="transform:scaleX(${Math.min(1,d.tt/21)})"></u></span><small>من 21</small></div></div>`;
    s+=`<div class="acts">${rollBtn(d,my,one?'ارمِ زهرة':'ارمِ زهرتين')}<button class="btn navy" data-ga="stop" ${my&&d.rl?'':'disabled'}>✋ أوقف على ${d.tt}</button></div>`;
    const T=rgTarget(d,t,v=>v);if(T!=null&&T>=0&&d.win==null)s+=`<p class="note">أعلى رقم بالجولة: <b>${T}</b></p>`;
    s+=rgRow(d,v=>v<0?'🔥':v);
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='roll'){act(t21Roll(d));return;}
    if(a==='stop'){if(!d.rl)return;act(t21End(d,t,`${nm(d,t)} وقف على ${d.tt}`));}}
};
// twenty-one odds: B(t) the chance a player still to come gets above t without going over, throwing until he does
const T21B={};function t21Beat(t){if(T21B[t]!=null)return T21B[t];const m={};const f=x=>{if(x>t)return x<=21?1:0;if(m[x]!=null)return m[x];let e=0;
  if(x>=14)for(let a=1;a<=6;a++)e+=f(x+a)/6;else for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)e+=f(x+a+b)/36;return m[x]=e;};return T21B[t]=f(0);}
GAMES.d_21.bot=(d,s,lv)=>{if(!d.rl)return botDo(d,s,'roll',0);const T=rgTarget(d,s),rem=rgRem(d,s),tt=d.tt;
  if(lv===1)return botDo(d,s,tt>=15+rnd(4)?'stop':'roll',0);
  if(lv===2)return botDo(d,s,(T!=null&&T>=0&&tt<=T)?'roll':tt>=17?'stop':'roll',0);
  const stopV=x=>(T==null||T<0||x>T?1:x===T?.5:0)*Math.pow(1-t21Beat(x),rem);const m={};
  const V=x=>{if(x>21)return 0;if(m[x]!=null)return m[x];let e=0;if(x>=14)for(let a=1;a<=6;a++)e+=V(x+a)/6;else for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)e+=V(x+a+b)/36;return m[x]=Math.max(stopV(x),e);};
  let roll=0;if(tt>=14)for(let a=1;a<=6;a++)roll+=V(tt+a)/6;else for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)roll+=V(tt+a+b)/36;
  return botDo(d,s,roll>stopV(tt)+1e-9?'roll':'stop',0);};
HELP.d_21='واحد وعشرين بالنرد: بدورك ترمي زهرتين وتجمعهم، وتكمل ترمي وتضيف على مجموعك. أول ما يوصل مجموعك 14 أو أكثر صرت ترمي زهرة وحدة بس. توقف متى ما تبي، وإذا عديت 21 احترقت. الأقرب لـ21 بدون ما يعدّي ياخذ الجولة، ولو تعادلوا كل واحد منهم يرمي زهرة والأعلى ياخذها. بعد 3 جولات يفوز صاحب أكثر جولات، ولو تعادلوا جولة فاصلة. مع الفرق تنجمع جولات الفريق.';

/* ======================= 12. dice football (an original game) ======================= */
/* two sides on a pitch of nine zones; the side with the ball picks a short pass (one die: 1 loses it, else one zone on),
   a long ball (one die: 1-2 the other side wins it two zones on, 3-5 two zones, 6 three zones) or, near goal, a shot
   (two dice: 6+ from the box, 8+ from the edge, 10+ from further out). A save gives the keeper the ball. Each move is a few
   minutes of a 90-minute match; a draw goes to penalties (two dice, 6+ scores, five each then sudden death) */
const FB_T=24,FB_H=12,FB_NEED=[0,6,8,10];
const fbDist=(sd,z)=>sd===0?9-z:z+1;
const fbAdv=(sd,z,k)=>sd===0?Math.min(8,z+k):Math.max(0,z-k);
const fbKeep=sd=>sd===0?1:7;
const P2GE=n=>{let p=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(a+b>=n)p++;return p/36;};
const fbPG=dist=>dist<=3?P2GE(FB_NEED[dist]):0;
const fbMin=tk=>Math.round(tk*90/FB_T);
const fbSideName=(d,sd)=>tmName(d,sd);
// after a move by side `sd`: that side's next member plays its next move, and the side with the ball plays now
function fbPass(x,sd){const tr=[...x.tr];tr[sd]=(tr[sd]+1)%(tmSeats(x,sd).length||1);const y={...x,tr};return {...y,turn:tmNow(y,y.sd)};}
function fbTick(x,sd){let y={...x,tk:x.tk+1};
  if(y.tk===FB_H)y={...y,z:4,sd:1-y.k0,last:y.last+' • نهاية الشوط الأول'};
  if(y.tk>=FB_T){if(y.sc[0]!==y.sc[1])return {...fbPass(y,sd),...tmWin(y,y.sc[0]>y.sc[1]?0:1),last:y.last+' • نهاية المباراة'};
    y={...y,ph:'pen',sd:y.k0,pk:['',''],last:y.last+' • تعادل! ركلات الترجيح'};}
  return fbPass(y,sd);}
function fbAct(d,a){const sd=d.sd,t=d.turn,z=d.z,dist=fbDist(sd,z);let x={...d,rc:d.rc+1},msg;
  if(a==='short'){const r=R6();x.lr={a,sd,dv:[r],ok:r>1};if(r>1){x.z=fbAdv(sd,z,1);msg=`${nm(d,t)} مرّر قصيرة ✓`;}else{x.sd=1-sd;msg=`${nm(d,t)} مرّر وانقطعت الكورة`;}}
  else if(a==='long'){const r=R6();x.lr={a,sd,dv:[r],ok:r>2};x.z=fbAdv(sd,z,r===6?3:2);if(r>2)msg=`${nm(d,t)} لعبها طويلة ✓${r===6?' (بينية!)':''}`;else{x.sd=1-sd;msg=`${nm(d,t)} لعبها طويلة وقطعها الخصم`;}}
  else{const dv=rollN(2),ok=dsum(dv)>=FB_NEED[dist];x.lr={a,sd,dv,ok};
    if(ok){const sc=[...d.sc];sc[sd]++;x={...x,sc,z:4,sd:1-sd,gl:{sd,rc:x.rc}};msg=`${nm(d,t)} سدّد… قووول! ⚽🎉`;}
    else{x.sd=1-sd;x.z=fbKeep(1-sd);msg=`${nm(d,t)} سدّد وصدّها الحارس 🧤`;}}
  x.last=msg;return fbTick(x,sd);}
function fbKick(d){const sd=d.sd,dv=rollN(2),ok=dsum(dv)>=6,pk=[...d.pk];pk[sd]+=ok?'o':'x';const t=d.turn;
  let x={...d,pk,rc:d.rc+1,lr:{a:'kick',sd,dv,ok},last:`${nm(d,t)} ${ok?'سجّل ركلته ⚽':'ضيّع ركلته ✗'}`};
  const g=pk.map(p=>[...p].filter(c=>c==='o').length),n=pk.map(p=>p.length);let w=null;
  if(n[0]<=5&&n[1]<=5){if(g[0]>g[1]+(5-n[1]))w=0;else if(g[1]>g[0]+(5-n[0]))w=1;}
  if(w==null&&n[0]===n[1]&&n[0]>=5&&g[0]!==g[1])w=g[0]>g[1]?0:1;
  if(w!=null)return {...fbPass(x,sd),...tmWin(x,w),last:x.last+` • ${fbSideName(x,w).replace(/<[^>]+>/g,'')} فاز بالترجيح`};
  if(n[0]===n[1]&&n[0]>=10)return {...x,win:'d',last:x.last+' • تعادل'};
  x={...x,sd:1-sd};return fbPass(x,sd);}
GAMES.d_foot={teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,name:'كورة بالنرد',cat:'dice',lbc:'#2E7D32',net:{host:['short','long','shot','kick']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3BA04A"/>${[0,1,2,3,4].map(k=>`<rect x="${k*20}" y="0" width="10" height="100" fill="#35923F"/>`).join('')}<rect x="6" y="14" width="88" height="72" fill="none" stroke="#fff" stroke-width="3"/><path d="M50 14V86" stroke="#fff" stroke-width="3"/><circle cx="50" cy="50" r="12" fill="none" stroke="#fff" stroke-width="3"/><rect x="6" y="36" width="10" height="28" fill="none" stroke="#fff" stroke-width="3"/><rect x="84" y="36" width="10" height="28" fill="none" stroke="#fff" stroke-width="3"/><circle cx="70" cy="56" r="9" fill="#fff"/><path d="M70 50l4 3-1.5 5h-5L66 53z" fill="#2D4763"/><rect x="22" y="40" width="18" height="18" rx="4" fill="#fff" transform="rotate(-10 31 49)"/><circle cx="27" cy="45" r="2" fill="#2D4763"/><circle cx="35" cy="53" r="2" fill="#2D4763"/><circle cx="31" cy="49" r="2" fill="#2D4763"/></svg>`,
  init:()=>({z:4,sd:0,k0:0,sc:[0,0],tk:0,tr:[0,0],ph:'play',pk:['',''],lr:null,gl:null,rc:0,last:''}),
  start:d=>{const sd=d.turn%2;return {...d,sd,k0:sd,turn:tmNow({...d,sd},sd)};},
  points:d=>d.pl.map((r,s)=>d.sc[s%2]),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+(d.pl.length>2&&d.ph==='play'?` <small>(فريق ${nm(d,d.sd)})</small>`:''),
  winExtra:d=>`${tmName(d,0)} ${d.sc[0]} - ${d.sc[1]} ${tmName(d,1)}`+(d.pk[0]||d.pk[1]?` • الترجيح ${[...d.pk[0]].filter(c=>c==='o').length}-${[...d.pk[1]].filter(c=>c==='o').length}`:''),
  onTimeout:d=>d.ph==='pen'?fbKick(d):fbAct(d,'short'),onSkip:(nd,d)=>tmSkip(nd,d),
  render(d,ctx){const my=ctx.my&&d.win==null,sd=d.sd,c0=col(d,0),c1=col(d,1),dist=fbDist(sd,d.z),fr=d.lr&&once(`fb${d.gid}_${d.rc}`);
    const gn=d.gl&&once(`fbg${d.gid}_${d.gl.rc}`);
    let s=`<div class="d2-fbs"><span style="--c:${c0}"><i>${tmName(d,0)}</i></span><b class="${gn?'gl':''}">${d.sc[0]} - ${d.sc[1]}</b><span style="--c:${c1}"><i>${tmName(d,1)}</i></span><em>${d.ph==='pen'?'ترجيح':d.tk>=FB_T?'90\'':fbMin(d.tk)+'\''}${d.ph==='play'?` • ${d.tk<FB_H?'الشوط الأول':'الشوط الثاني'}`:''}</em></div>`;
    s+=`<div class="d2-pitch" dir="ltr" style="--c0:${c0};--c1:${c1}"><i class="gl0"></i>${[...Array(9)].map((_,k)=>`<div class="d2-z ${k===4?'mid':''} ${k===d.z?'ball':''} ${d.ph==='play'&&fbDist(sd,k)<=3?'box'+sd:''}">${k===d.z&&d.ph==='play'?`<span class="d2-ball" style="--c:${sd?c1:c0}">⚽</span>`:''}</div>`).join('')}<i class="gl1"></i></div>`;
    if(d.lr){const L=d.lr;s+=`<div class="d2-fbl ${L.ok?'ok':'no'}" style="--c:${col(d,L.sd)}">${miniD(L.dv)}<span>${{short:'تمريرة قصيرة',long:'كورة طويلة',shot:'تسديدة',kick:'ركلة ترجيح'}[L.a]} ${L.ok?'✓':'✗'}</span></div>`.replace('class="d2-md"',`class="d2-md ${fr?'roll':''}"`);}
    if(d.ph==='pen'){s+=`<div class="d2-pens">${[0,1].map(q=>`<div style="--c:${q?c1:c0}"><i>${tmName(d,q)}</i><span>${[...d.pk[q]].map(c=>`<u class="${c==='o'?'d2o':'d2x'}">${c==='o'?'⚽':'✗'}</u>`).join('')}${'<u></u>'.repeat(Math.max(0,5-d.pk[q].length))}</span></div>`).join('')}</div>`;
      if(my)s+=`<div class="acts"><button class="btn d2-roll" style="background:${col(d,d.turn)}" data-ga="kick">🥅 سدّد الركلة <small>(6+ على زهرتين)</small></button></div>`;return s;}
    if(my){const pct=p=>Math.round(p*100)+'%';
      s+=`<div class="d2-fba"><button class="btn" data-ga="short" style="background:#3F8EDB">قصيرة <small>+1 • ${pct(5/6)}</small></button><button class="btn" data-ga="long" style="background:#8A5BD1">طويلة <small>+2/+3 • ${pct(4/6)}</small></button><button class="btn red" data-ga="shot" ${dist<=3?'':'disabled'}>سدّد ⚽ <small>${dist<=3?`${FB_NEED[dist]}+ • ${pct(fbPG(dist))}`:'بعيد'}</small></button></div>`;}
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='kick'){if(d.ph!=='pen')return;act(fbKick(d));return;}
    if(d.ph!=='play'||!['short','long','shot'].includes(a))return;if(a==='shot'&&fbDist(d.sd,d.z)>3)return;act(fbAct(d,a));}
};
/* football bots. Hard plays a table of the exact chance to win from every minute, zone, possession and score
   (a draw is a coin toss on penalties); medium shoots from close in and plays long from far; easy picks almost anything */
const FBV={};
function fbTable(k0){if(FBV[k0])return FBV[k0];const G=13,O=6;const V=[];// V[k][z][p][g+O]
  for(let k=0;k<=FB_T;k++){V.push([]);for(let z=0;z<9;z++){V[k].push([[],[]]);for(let p=0;p<2;p++)for(let g=0;g<G;g++){
    if(k===0){V[k][z][p][g]=g>O?1:g<O?0:.5;continue;}
    const nx=(z2,p2,g2)=>{g2=Math.max(0,Math.min(G-1,g2));const k2=k-1;if(FB_T-k2===FB_H)return V[k2][4][1-k0][g2];return V[k2][z2][p2][g2];};
    const vs=fbOpts(z,p).map(o=>o.r.reduce((a,[pr,z2,p2,dg])=>a+pr*nx(z2,p2,g+dg),0));V[k][z][p][g]=p===0?Math.max(...vs):Math.min(...vs);}}}
  return FBV[k0]=V;}
function fbOpts(z,p){const dist=fbDist(p,z),o=[{a:'short',r:[[1/6,z,1-p,0],[5/6,fbAdv(p,z,1),p,0]]},{a:'long',r:[[2/6,fbAdv(p,z,2),1-p,0],[3/6,fbAdv(p,z,2),p,0],[1/6,fbAdv(p,z,3),p,0]]}];
  if(dist<=3){const pg=fbPG(dist);o.push({a:'shot',r:[[pg,4,1-p,p===0?1:-1],[1-pg,fbKeep(1-p),1-p,0]]});}return o;}
GAMES.d_foot.bot=(d,s,lv)=>{if(d.ph==='pen')return botDo(d,s,'kick',0);const sd=d.sd,dist=fbDist(sd,d.z),os=fbOpts(d.z,sd);
  if(lv===1){const a=Math.random()<.5?pickR(os).a:dist<=2?'shot':'short';return botDo(d,s,os.some(o=>o.a===a)?a:'short',0);}
  if(lv===2)return botDo(d,s,dist===1||(dist===2&&Math.random()<.6)?'shot':dist>=5?'long':'short',0);
  const V=fbTable(d.k0),k=FB_T-d.tk,g=Math.max(0,Math.min(12,d.sc[0]-d.sc[1]+6));
  const nx=(z2,p2,g2)=>{g2=Math.max(0,Math.min(12,g2));const k2=k-1;if(FB_T-k2===FB_H)return V[k2][4][1-d.k0][g2];return V[k2][z2][p2][g2];};
  let best=null;for(const o of os){let v=o.r.reduce((a,[pr,z2,p2,dg])=>a+pr*nx(z2,p2,g+dg),0);if(sd===1)v=1-v;if(!best||v>best.v+1e-9)best={v,a:o.a};}
  return botDo(d,s,best.a,0);};
HELP.d_foot='كورة بالنرد (لعبة من تصميمنا): فريقين على ملعب من 9 مربعات، وكل حركة دقايق من مباراة 90 دقيقة. الفريق اللي معه الكورة يختار: تمريرة قصيرة (زهرة: 1 تنقطع، غيرها تتقدم مربع)، كورة طويلة (زهرة: 1 أو 2 يقطعها الخصم بعد مربعين، 3 إلى 5 تتقدم مربعين، 6 بينية ثلاث مربعات)، أو تسديدة إذا كنت قريب من المرمى (زهرتين: من المنطقة 6 أو أكثر، من حدود المنطقة 8+، من أبعد شوي 10+). الهدف يرجّع الكورة للنص للفريق الثاني، والتسديدة الضايعة ياخذها الحارس. بعد الشوط الأول يبدأ الفريق الثاني من النص. لو خلصت المباراة تعادل فيه ركلات ترجيح: كل ركلة زهرتين و6 أو أكثر قول، 5 لكل فريق وبعدها ركلة بركلة. لو أكثر من لاعبين: فريقين (المقاعد الفردية ضد الزوجية) والأعضاء يتناوبون.';

/* ======================= 13. draw the beetle ======================= */
/* one throw a turn: 6 the body, 5 the head, 4 a wing (two), 3 a leg (six), 2 an antenna (two), 1 an eye (two).
   The body comes first, the head before the antennae and the eyes. The first full beetle wins */
const BT=[{f:6,m:1,n:'الجسم'},{f:5,m:1,n:'الراس'},{f:4,m:2,n:'جناح'},{f:3,m:6,n:'رجل'},{f:2,m:2,n:'قرن'},{f:1,m:2,n:'عين'}];
const BTFULL='112622';
const btCan=(b,k)=>+b[k]<BT[k].m&&(k===0||b[0]==='1')&&(k<4||b[1]==='1');
const btParts=b=>[...b].reduce((a,c)=>a+ +c,0);
// the beetle in SVG: drawn parts in the player's colour, missing ones as a faint outline; the newest part pops in
function btSVG(b,c,nw,big){const on=k=>+b[k],P=(k,j,svg)=>`<g class="${j<on(k)?'on':'off'} ${nw&&nw[0]===k&&nw[1]===j?'nw':''}">${svg}</g>`;
  let s=`<svg viewBox="0 0 100 124" class="d2-bt ${big?'lg':''}" style="--c:${c}">`;
  // legs: three on each side
  const L=[[34,58,14,50],[32,74,12,78],[36,90,18,106],[66,58,86,50],[68,74,88,78],[64,90,82,106]];
  const legOrder=[0,3,1,4,2,5];
  L.forEach((l,j)=>{s+=P(3,legOrder.indexOf(j),`<path d="M${l[0]} ${l[1]}Q${(l[0]+l[2])/2} ${l[1]-6} ${l[2]} ${l[3]}" class="ln"/>`);});
  s+=P(0,0,`<ellipse cx="50" cy="76" rx="22" ry="30" class="bd"/>`);
  s+=P(2,0,`<path d="M49 50Q30 54 30 78Q32 100 49 104Z" class="wg"/>`)+P(2,1,`<path d="M51 50Q70 54 70 78Q68 100 51 104Z" class="wg"/>`);
  s+=P(4,0,`<path d="M44 28Q36 12 28 10" class="ln"/>`)+P(4,1,`<path d="M56 28Q64 12 72 10" class="ln"/>`);
  s+=P(1,0,`<circle cx="50" cy="38" r="13" class="hd"/>`);
  s+=P(5,0,`<circle cx="45" cy="36" r="3.6" class="ey"/>`)+P(5,1,`<circle cx="55" cy="36" r="3.6" class="ey"/>`);
  return s+'</svg>';}
function btRoll(d){const t=d.turn,v=R6(),k=6-v,b=d.bt[t];
  if(!btCan(b,k)){const why=+b[k]>=BT[k].m?'عنده كفاية':k>0&&b[0]!=='1'?'يبي الجسم أول (6)':'يبي الراس أول (5)';
    return {...d,dv:v,rc:d.rc+1,nw:null,lt:{s:t,v,k,ok:false},turn:nextSeat(d,t),last:`${nm(d,t)} طلع ${v}: ${BT[k].n}، بس ${why}`};}
  const nb=setAt(b,k,String(+b[k]+1)),bt=d.bt.map((x,s)=>s===t?nb:x),done=nb===BTFULL;
  return {...d,bt,dv:v,rc:d.rc+1,nw:[t,k,+b[k]],lt:{s:t,v,k,ok:true},turn:done?t:nextSeat(d,t),win:done?t:null,last:done?`${nm(d,t)} كمّل الخنفساء! 🪲`:`${nm(d,t)} طلع ${v} ورسم ${BT[k].n}`};}
GAMES.d_beetle={name:'ارسم الخنفساء',cat:'dice',lbc:'#3A7D44',net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FFF1C9"/><circle cx="18" cy="84" r="30" fill="#F7DC8E"/><g transform="translate(16 2) scale(.68 .76)" stroke="#1F4A27" stroke-width="4" stroke-linecap="round" fill="none"><path d="M34 58Q24 52 14 50M32 74Q22 72 12 78M36 90Q27 96 18 106M66 58Q76 52 86 50M68 74Q78 72 88 78M64 90Q73 96 82 106M44 28Q36 12 28 10M56 28Q64 12 72 10"/><ellipse cx="50" cy="76" rx="22" ry="30" fill="#2F8F45"/><path d="M50 50V104" stroke-width="3"/><path d="M49 50Q30 54 30 78Q32 100 49 104ZM51 50Q70 54 70 78Q68 100 51 104Z" fill="#49B25E" stroke-width="3"/><circle cx="50" cy="38" r="13" fill="#2F8F45"/><circle cx="45" cy="36" r="3" fill="#fff" stroke="none"/><circle cx="55" cy="36" r="3" fill="#fff" stroke="none"/></g><path d="M66 90l18-18 6 6-18 18-8 2z" fill="#E0A63D"/><path d="M84 72l6 6 3-3-6-6z" fill="#E5483F"/></svg>`,
  init:n=>({bt:Array(n).fill('000000'),dv:0,rc:0,nw:null,lt:null,last:''}),
  points:d=>d.bt.map(b=>btParts(b)+'/14'),status:lastSt,
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${btParts(d.bt[s])}/14`).join('، '),
  onTimeout:d=>btRoll(d),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,fr=d.dv&&once(`bt${d.gid}_${d.rc}`);const nw=fr&&d.nw?d.nw:null;
    const show=d.win!=null&&typeof d.win==='number'?d.win:t;
    let s=`<div class="d2-btm"><div class="d2-btb" style="--c:${col(d,show)}">${btSVG(d.bt[show],col(d,show),nw&&nw[0]===show?[nw[1],nw[2]]:null,true)}<small>خنفساء ${nm(d,show)} • ${btParts(d.bt[show])}/14</small></div>
      <div class="d2-btr">${d.dv?`<div class="d2-btd ${d.lt&&!d.lt.ok?'miss':''}">${dieH(d.dv,{roll:fr})}<small>${d.lt?`${nm(d,d.lt.s)}: ${BT[d.lt.k].n}${d.lt.ok?' ✓':' ✗'}`:''}</small></div>`:''}
      ${my?tapDie(d.dv||6,true,col(d,t),'d2-tap'):''}${my?'<small class="d2-hint">اضغط الزهرة وارمِ</small>':''}</div></div>`;
    s+=`<div class="d2-key">${BT.map((p,k)=>`<span class="${btCan(d.bt[t],k)?'can':''}"><i class="dice">${diceSVG(p.f)}</i>${p.n}${p.m>1?` ×${p.m}`:''}<b>${d.bt[t][k]}/${p.m}</b></span>`).join('')}</div>`;
    s+=`<div class="d2-bts ${d.pl.length>4?'many':''}">${d.pl.map((r,p)=>alive(d,p)?`<div class="${p===t&&d.win==null?'on':''}" style="--c:${col(d,p)}">${btSVG(d.bt[p],col(d,p),nw&&nw[0]===p?[nw[1],nw[2]]:null)}<i>${nm(d,p)}</i><b>${btParts(d.bt[p])}/14</b></div>`:'').join('')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null||a!=='roll')return;act(btRoll(d));}
};
GAMES.d_beetle.bot=(d,s)=>botDo(d,s,'roll',0);
HELP.d_beetle='ارسم الخنفساء: كل دور ترمي زهرة وحدة، والرقم يقول وش ترسم: 6 الجسم، 5 الراس، 4 جناح (تحتاج 2)، 3 رجل (تحتاج 6)، 2 قرن استشعار (تحتاج 2)، 1 عين (تحتاج 2). لازم الجسم أول شي قبل أي جزء، والراس قبل القرون والعيون. إذا طلع لك رقم ما تقدر ترسمه يروح دورك. أول واحد يكمّل خنفساءه (14 جزء) يفوز. مع الفرق يفوز الفريق كله.';

})();

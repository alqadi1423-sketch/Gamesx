'use strict';
/* cards and dice: memory, higher or lower, blackjack, colours and numbers, dominoes, bingo, risky dice */

const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const RANKS='A23456789TJQK',SUITS='shdc',SUITCH={s:'♠',h:'♥',d:'♦',c:'♣'};
const deck52=(k=1)=>{const a=[];for(let n=0;n<k;n++)for(const s of SUITS)for(const r of RANKS)a.push(r+s);return a;};
const rv=c=>RANKS.indexOf(c[0])+1;
/* ---------- the playing card: one inline SVG face (corner indices, pips or a court emblem) on a paper card ---------- */
// suit shapes in a 10 by 10 box around 0,0, so the same shape serves as corner index, pip and ace
const SUITP={h:'M0 4.7C-1.7 3.3-4.9 1-4.9-1.7-4.9-3.4-3.7-4.7-2.3-4.7-1.2-4.7-.4-4 0-3.1.4-4 1.2-4.7 2.3-4.7 3.7-4.7 4.9-3.4 4.9-1.7 4.9 1 1.7 3.3 0 4.7Z',
  d:'M0-5.2C1.2-3.3 2.6-1.7 4.1 0 2.6 1.7 1.2 3.3 0 5.2-1.2 3.3-2.6 1.7-4.1 0-2.6-1.7-1.2-3.3 0-5.2Z',
  s:'M0-5C1.7-3.3 4.9-1.3 4.9 1.3 4.9 2.9 3.7 4 2.3 4 1.5 4 .8 3.6.4 3 .6 4 1.1 4.6 1.9 5.1H-1.9C-1.1 4.6-.6 4-.4 3-.8 3.6-1.5 4-2.3 4-3.7 4-4.9 2.9-4.9 1.3-4.9-1.3-1.7-3.3 0-5Z',
  c:'M-2.4-2.6a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0ZM-5 1.1a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0ZM.2 1.1a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0ZM-1.2-.6h2.4v2.4h-2.4ZM-.55 1C-.55 3-1 4.4-1.9 5.1H1.9C1 4.4.55 3 .55 1Z'};
const suitSVG=s=>`<svg class="sv" viewBox="-5.2 -5.2 10.4 10.4" aria-hidden="true"><path d="${SUITP[s]}" fill="currentColor"/></svg>`;
const cPip=(s,x,y,k,flip)=>`<path d="${SUITP[s]}" transform="translate(${x} ${y})${flip?' rotate(180)':''}${k!==1?` scale(${k})`:''}"/>`;
// pip layouts on the 60 by 84 face: three columns, pips in the lower half drawn upside down as on a real card
const PIPXY=(()=>{const L=20,C=30,R=40,T=16,B=68,M=42;const six=[[L,T],[R,T],[L,M],[R,M],[L,B],[R,B]];return {
  2:[[C,T],[C,B]],3:[[C,T],[C,M],[C,B]],4:[[L,T],[R,T],[L,B],[R,B]],5:[[L,T],[R,T],[C,M],[L,B],[R,B]],6:six,7:[...six,[C,29]],8:[...six,[C,29],[C,55]],
  9:[[L,T],[R,T],[L,33.3],[R,33.3],[C,M],[L,50.7],[R,50.7],[L,B],[R,B]],T:[[L,T],[R,T],[C,24.7],[L,33.3],[R,33.3],[L,50.7],[R,50.7],[C,59.3],[L,B],[R,B]]};})();
// court emblems for the upper half of the face (the lower half is the same turned round): crown, tiara with pearls, plumed cap
const COURT={K:'<path class="gd" d="M21 30 19.4 17.8 24.8 23 30 14.8 35.2 23 40.6 17.8 39 30Z"/><rect class="gd2" x="20.4" y="28.6" width="19.2" height="3.6" rx="1"/><circle cx="19.4" cy="17.6" r="1.5"/><circle cx="30" cy="14.6" r="1.7"/><circle cx="40.6" cy="17.6" r="1.5"/><circle class="wt" cx="30" cy="30.4" r="1"/>',
  Q:'<path class="gd" d="M21 30C21 24.5 22.8 21.6 25.4 21.8 26.4 24.6 27.8 25 30 18.6 32.2 25 33.6 24.6 34.6 21.8 37.2 21.6 39 24.5 39 30Z"/><rect class="gd2" x="20.6" y="28.6" width="18.8" height="3.6" rx="1.8"/><circle class="wt" cx="25.4" cy="20.8" r="1.5"/><circle class="wt" cx="30" cy="17.4" r="1.7"/><circle class="wt" cx="34.6" cy="20.8" r="1.5"/><circle cx="30" cy="25.6" r="1.6"/>',
  J:'<path class="pl" d="M35.5 22.5C38.5 18.2 41.8 15.4 45.6 14.2 43.8 17.6 41.2 20.8 37.8 24Z"/><path d="M20.8 30C20.8 23.4 25 20.2 30 20.2S39.2 23.4 39.2 30Z"/><rect class="gd2" x="19.8" y="28.4" width="20.4" height="3.6" rx="1.8"/><circle class="gd" cx="30" cy="20" r="1.6"/>'};
const CFACE={};
function cardFace(c){if(CFACE[c])return CFACE[c];const r=c[0],s=c[1],lab=r==='T'?'10':r;
  const ix=`<text x="7.2" y="15.2" text-anchor="middle" font-size="${r==='T'?11:13.5}"${r==='T'?' letter-spacing="-1.2"':''}>${lab}</text>${cPip(s,7.2,22.6,.6)}`;
  let f;
  if(r==='A')f=s==='s'?`<circle class="ar" cx="30" cy="42" r="17"/>${cPip(s,30,42,2.7)}`:cPip(s,30,42,2.3);
  else if(COURT[r]){const half=COURT[r]+cPip(s,30,37.4,.66);f=`<rect class="cp" x="14" y="10.5" width="32" height="63" rx="3"/><g>${half}</g><g transform="rotate(180 30 42)">${half}</g><path class="cl" d="M14.8 42H45.2"/>`;}
  else f=PIPXY[r].map(([x,y])=>cPip(s,x,y,1,y>42)).join('');
  return CFACE[c]=`<svg class="cf" viewBox="0 0 60 84" aria-hidden="true">${ix}<g transform="rotate(180 30 42)">${ix}</g>${f}</svg>`;}
// '??' is a card nobody may see (a masked card online keeps its length): drawn face down, still clickable when extra makes it a button.
// extra goes last in the class attribute (some callers close the attribute in it to add data-ga); the card holds no inner div
const cardHTML=(c,big,extra)=>c==='??'?`<div class="card back ${big?'big':''} ${extra||''}"></div>`:
  `<div class="card ${'hd'.includes(c[1])?'red':'blk'} ${big?'big':''} ${extra||''}" aria-label="${c[0]==='T'?'10':c[0]}${SUITCH[c[1]]}">${cardFace(c)}</div>`;
const cardsOf=s=>s.match(/.{2}/g)||[];

/* ---------- memory ---------- */
const MEMP={2:8,3:10,4:10,5:12,6:12,7:15,8:15},MEMC={8:4,10:5,12:6,15:6};
const EMO=['🍎','🐪','⚽','🌙','🚗','🎈','🐟','🌴','⭐','☕','🎁','🦅','🍉','🏠','🔑'];
// picture sets: each game draws one set (d.th) and its pairs from it in a random order (d.em, letters into the set). Both are public:
// they say which pictures are in play, never where they lie
const MEMT=[['فواكه',['🍎','🍌','🍇','🍉','🍓','🍒','🍍','🥝','🍑','🍋','🥥','🍐','🥭','🍏','🍈','🌽']],
  ['حيوانات',['🐪','🐎','🦅','🐑','🐐','🦁','🐢','🐬','🦒','🐘','🦉','🐇','🦊','🐧','🐝','🦋']],
  ['رياضة',['⚽','🏀','🏐','🎾','🏓','🏸','🥊','🏹','🎳','⛳','🏆','🥇','🛹','🚴','🏊','🎯']],
  ['مواصلات',['🚗','🚌','🚑','🚒','🚓','🚕','✈️','🚁','🚂','🚢','⛵','🚲','🛵','🚀','🚚','🚜']],
  ['طبيعة',['🌙','⭐','☀️','🌈','⛅','❄️','⚡','🌊','🌋','🏜️','🌴','🌵','🌹','🌻','🍁','🍄']],
  ['أكل',['☕','🍵','🍞','🧀','🍕','🍔','🌮','🍩','🍪','🎂','🍿','🥛','🍯','🥚','🍗','🍚']],
  ['أشياء',['🎈','🎁','🔑','📚','✏️','⏰','📷','🎨','🧸','🪁','🎒','💡','🧭','🔭','⚓','🎲']]];
const memE=(d,e)=>{const k=e.charCodeAt(0)-97;const T=MEMT[d.th];return T&&typeof d.em==='string'?T[1][d.em.charCodeAt(k)-97]:EMO[k];};
GAMES.memory={name:'لعبة الذاكرة',cat:'cards',lbc:'#3D8A7A',onTimeout:d=>({...d,open:[],turn:nextSeat(d,d.turn)}),
  // a player who leaves mid-turn takes their open card with them
  onSkip:(nd,d)=>nd.turn!==d.turn?{...nd,open:[]}:nd,
  icon:iconE('#4FB09B','🃏'),
  // '?' is a card nobody has turned over yet: its face is drawn when it is first turned (see click), so the layout is not in the shared state
  init:n=>{const p=MEMP[n]||15,th=rnd(MEMT.length);return {p,th,em:shuffle([...Array(MEMT[th][1].length).keys()]).slice(0,p).map(k=>String.fromCharCode(97+k)).join(''),dk:'?'.repeat(p*2),own:'.'.repeat(p*2),open:[]};},
  points:d=>cntSeat(d.own,d.pl.length).map(x=>x/2),status:(d,ctx)=>turnTxt(d,ctx)+(MEMT[d.th]?`<br><small>صور ${MEMT[d.th][0]} • باقي ${[...d.own].filter(c=>c==='.').length/2} أزواج</small>`:''),
  winExtra(d){const c=cntSeat(d.own,d.pl.length);return 'الأزواج: '+c.map((x,s)=>`${nm(d,s)} ${x/2}`).join('، ');},
  render(d,ctx){const op=d.open||[];const miss=op.length===2&&d.dk[op[0]]!==d.dk[op[1]];
    return `<div class="cellgrid memg c${MEMC[d.p]}" style="grid-template-columns:repeat(${MEMC[d.p]},minmax(0,1fr))">${[...d.dk].map((e,i)=>{
      const own=d.own[i];if(own!=='.')return `<div class="cg mm own" style="--c:${col(d,+own)};--l:${lit(d,+own)}"><span>${memE(d,e)}</span></div>`;
      if(op.includes(i))return `<div class="cg mm up ${miss?'miss':''}"><span>${memE(d,e)}</span></div>`;
      return `<button class="cg mm dn" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'} aria-label="ورقة مقلوبة"></button>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.own[i]!=='.')return;let op=d.open||[];if(op.length===2)op=[];if(op.includes(i))return;op=[...op,i];
    let dk=d.dk;if(dk[i]==='?'){const left=[];for(let k=0;k<d.p;k++){const e=String.fromCharCode(97+k);for(let m=dk.split(e).length-1;m<2;m++)left.push(e);}dk=setAt(dk,i,left[rnd(left.length)]);}
    if(op.length<2){act({...d,dk,open:op});return;}
    const t=d.turn;if(dk[op[0]]===dk[op[1]]){let own=setAt(setAt(d.own,op[0],String(t)),op[1],String(t));let win=null;
      if(!own.includes('.'))win=mostPts(cntSeat(own,d.pl.length).map((x,s)=>d.out[s]==='1'?-1:x));act({...d,dk,own,open:[],win});}
    else act({...d,dk,open:op,turn:nextSeat(d,t)});
  }
};

/* ---------- higher or lower ---------- */
const hiloSw=d=>d.win==null&&d.sw?d.sw[d.turn]||0:0;
const hiloLeft=d=>{const a=deck52(d.pl.length>4?2:1);for(const c of cardsOf(d.dk.slice(0,d.p*2+2)))a.splice(a.indexOf(c),1);return a;};
GAMES.hilo={name:'أعلى أو أقل',cat:'cards',lbc:'#3B5B8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4F78B5"/><rect x="18" y="20" width="36" height="52" rx="6" fill="#fff" transform="rotate(-8 36 46)"/><rect x="44" y="24" width="36" height="52" rx="6" fill="#fff" transform="rotate(8 62 50)"/><text x="60" y="58" font-size="22" font-weight="800" fill="#D43C33" text-anchor="middle">K</text><path d="M28 34l6-8 6 8M28 58l6 8 6-8" stroke="#2D4763" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  /* push your luck: keep guessing to build a streak, bank it whenever you like, a wrong guess (or the same card) loses it.
     dk holds only the cards turned over so far (the current one last): the next card is drawn from the rest when it is turned */
  // sw: swaps each player has left: turn a fresh card over the current one without guessing (a middle card is a bad bet)
  init:n=>{const a=deck52(n>4?2:1);return {dk:a[rnd(a.length)],p:0,pts:Array(n).fill(0),stk:0,last:'',goal:12,sw:Array(n).fill(2)};},
  // online the next card is turned on the host's phone, so no player can pick it
  net:{host:['hi','lo','bank','sw']},
  points:d=>d.pts,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>أول واحد يوصل ${d.goal} يفوز</small>`,
  winExtra:d=>d.last,
  render(d,ctx){const c=d.dk.slice(d.p*2,d.p*2+2);const my=ctx.my&&d.win==null;
    const prev=cardsOf(d.dk.slice(Math.max(0,d.p-3)*2,d.p*2));
    return `<div class="hilo"><div class="hl-cur">${prev.length?`<div class="hl-prev">${prev.map(x=>cardHTML(x)).join('')}</div>`:''}<span class="hl-top" data-k="h${d.p}">${cardHTML(c,true)}</span></div><div class="hl-next">${cardHTML('??',true)}<small>باقي ${hiloLeft(d).length}</small></div></div>
      <div class="hstreak ${d.stk?'on':''}"><small>السلسلة</small><b data-k="s${d.stk}">${d.stk} 🔥</b><span class="hs-goal">${d.win==null?`${escH(d.pts[d.turn])} + ${d.stk} من ${d.goal}`:''}</span></div>
      <div class="acts"><button class="btn blue" data-ga="hi" ${my?'':'disabled'}>أعلى ⬆</button><button class="btn red" data-ga="lo" ${my?'':'disabled'}>أقل ⬇</button></div>
      ${my&&(d.stk||hiloSw(d))?`<div class="acts">${d.stk?`<button class="btn green" data-ga="bank">💰 ثبّت ${d.stk} نقاط</button>`:''}${hiloSw(d)?`<button class="btn navy" data-ga="sw">🔄 بدّل الورقة <small>(باقي ${hiloSw(d)})</small></button>`:''}</div>`:''}`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='bank'){if(!d.stk)return;const pts=[...d.pts];pts[t]+=d.stk;act({...d,pts,stk:0,win:pts[t]>=d.goal?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} ثبّت ${d.stk} نقاط 💰`});return;}
    if(a!=='hi'&&a!=='lo'&&a!=='sw')return;if(a==='sw'&&!hiloSw(d))return;
    // every card was turned: a fresh deck under the current card
    let dk=d.dk,p=d.p,left=hiloLeft(d);if(!left.length){dk=dk.slice(p*2,p*2+2);p=0;left=hiloLeft({...d,dk,p});}
    const c=dk.slice(p*2,p*2+2),nx=left[rnd(left.length)];
    if(a==='sw'){const sw=[...d.sw];sw[t]--;act({...d,dk:dk.slice(0,p*2+2)+nx,p:p+1,sw,last:`${nm(d,t)} بدّل الورقة 🔄`});return;}const ok=a==='hi'?rv(nx)>rv(c):rv(nx)<rv(c);const shown=`${nx[0]==='T'?'10':nx[0]}${SUITCH[nx[1]]}`;
    dk=dk.slice(0,p*2+2)+nx;
    if(!ok){act({...d,dk,p:p+1,stk:0,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${a==='hi'?'أعلى':'أقل'} وطلعت ${shown}، خطأ ✗${d.stk?` وضاعت سلسلة ${d.stk}`:''}`});return;}
    const stk=d.stk+1;const pts=[...d.pts];
    if(pts[t]+stk>=d.goal){pts[t]+=stk;act({...d,dk,p:p+1,pts,stk:0,win:t,last:`${nm(d,t)} وصل ${pts[t]} 🎉`});return;}
    act({...d,dk,p:p+1,stk,last:`${nm(d,t)} قال ${a==='hi'?'أعلى':'أقل'} وطلعت ${shown}، صح ✓`});
  },
  onTimeout:d=>{const pts=[...d.pts];pts[d.turn]+=d.stk;return {...d,pts,stk:0,win:pts[d.turn]>=d.goal?d.turn:null,turn:nextSeat(d,d.turn)};}
};

/* ---------- blackjack: chips and bets, five rounds; naturals pay 3 to 2, double, split, surrender, dealer peeks and stands on 17 ---------- */
const bjVal=h=>{let s=0,a=0;for(const c of cardsOf(h)){const r=rv(c);s+=r>10?10:r===1?11:r;if(r===1)a++;}while(s>21&&a){s-=10;a--;}return s;};
const bjNat=(h,split)=>!split&&h.length===4&&bjVal(h)===21;
const BJR=5,BJ0=1000;
const bj10=c=>rv(c)>=10?10:rv(c);
/* the shoe (dk) has no order: every card is drawn at random from what is left, and the dealer's hole card is only drawn when it is
   turned over, so neither is in the shared state. While the hole card is face down (dl holds only the up card) a draw first sets aside
   one card that would not give the dealer blackjack, as the real hole card would be; hole=1 draws the hole card itself from those cards */
function bjTake(dk,up,hole){const r=cardsOf(dk),ok=up?r.map((c,i)=>bjNat(up+c)?-1:i).filter(i=>i>=0):[];let j;
  if(hole)j=ok.length?ok[rnd(ok.length)]:rnd(r.length);else{const k=ok.length?ok[rnd(ok.length)]:-1;j=rnd(r.length-(k<0?0:1));if(k>=0&&j>=k)j++;}
  const c=r[j]||'';r.splice(j,1);return [c,r.join('')];}
function bjDeal(d){let dk=deck52(d.pl.length>4?2:1).join('');const take=()=>{const [c,r]=bjTake(dk);dk=r;return c;};
  const hs=d.pl.map((_,s)=>d.out[s]==='1'||!d.bet[s]?[]:[{c:'',b:d.bet[s],st:0,dbl:0,sp:0}]);
  for(let k=0;k<2;k++){hs.forEach(h=>{if(h[0])h[0].c+=take();});}
  // the dealer peeks with an ace or a ten showing: a hole card that makes blackjack is shown now, any other goes back until the end
  let dl=take();const hole=take();if(bjNat(dl+hole))dl+=hole;else dk+=hole;
  hs.forEach(h=>{if(h[0]&&bjNat(h[0].c))h[0].st=1;});
  let nd={...d,dk,hs,hi:d.pl.map(()=>0),dl,ph:'play'};
  if(dl.length===4)return bjSettle({...nd,peek:1});
  const nx=bjNextSeat(nd,-1);return nx<0?bjSettle(nd):{...nd,turn:nx};}
// next seat after `from` (no wrapping) that still has a hand to play
function bjNextSeat(d,from){for(let s=from+1;s<d.pl.length;s++){if(d.out[s]==='1')continue;if((d.hs[s]||[]).some(h=>!h.st))return s;}return -1;}
function bjSettle(d){let dk=d.dk,dl=d.dl;const take=h=>{const [c,r]=bjTake(dk,h?dl:null,h);dk=r;return c;};
  if(dl.length===2)dl+=take(1);
  const live=d.hs.some(hs=>hs.some(h=>!h.sur&&bjVal(h.c)<=21&&!bjNat(h.c,h.sp)));
  if(!d.peek&&live)while(bjVal(dl)<17){const c=take(0);if(!c)break;dl+=c;}
  const dv=bjVal(dl),dn=bjNat(dl);const chips=[...d.chips];const res=d.hs.map((hs,s)=>hs.map(h=>{const v=bjVal(h.c),n=bjNat(h.c,h.sp);let w;
      if(h.sur)w=-Math.floor(h.b/2);else if(v>21)w=-h.b;else if(dn)w=n?0:-h.b;else if(n)w=Math.floor(h.b*1.5);else if(dv>21||v>dv)w=h.b;else if(v===dv)w=0;else w=-h.b;chips[s]+=w;return w;}));
  return {...d,dk,dl,chips,res,ph:'done'};}
function bjNewRound(d){const r=d.r+1;const out=d.out.split('').map((c,s)=>c==='1'||d.chips[s]<10?'1':'0').join('');
  // a seat that was out before this round (left the room, or went broke earlier) cannot win on chips; one that just went broke still counts
  if(r>BJR||out.split('').filter(c=>c==='0').length<2){const w=mostPts(d.chips.map((c,s)=>d.out[s]==='1'?-1:c));return {...d,out,win:w,wins:w==='d'?null:undefined};}
  return {...d,r,out,ph:'bet',rd:(d.rd||0)+1,bet:d.pl.map(()=>0),hs:d.pl.map(()=>[]),res:null,peek:0,dl:''};}
// hand the turn to the first seat that still has a hand to play, or settle the round when nobody has
const bjGo=d=>{const nx=bjNextSeat(d,-1);return nx<0?bjSettle(d):{...d,turn:nx};};
function bjAct(d,a){const t=d.turn,hs=d.hs.map(x=>x.map(h=>({...h})));const k=d.hi[t];const h=hs[t][k];if(!h)return bjGo(d);let dk=d.dk;const take=()=>{const [c,r]=bjTake(dk,d.dl.length===2?d.dl:null);dk=r;return c;};const chips=[...d.chips];
  if(a==='hit'){h.c+=take();if(bjVal(h.c)>=21)h.st=1;}
  else if(a==='stand')h.st=1;
  // late surrender: on the first two cards of an unsplit hand, give up half the bet and keep the other half
  else if(a==='sur'){if(hs[t].length!==1||h.c.length!==4)return d;h.sur=1;h.st=1;}
  else if(a==='dbl'){if(h.c.length!==4||chips[t]<bjCommitted(hs[t])+h.b)return d;h.b*=2;h.dbl=1;h.c+=take();h.st=1;}
  else if(a==='split'){if(hs[t].length!==1||h.c.length!==4||bj10(h.c)!==bj10(h.c.slice(2))||chips[t]<bjCommitted(hs[t])+h.b)return d;
    const c1=h.c.slice(0,2),c2=h.c.slice(2);const aces=rv(c1)===1;const h1={c:c1+take(),b:h.b,st:aces?1:0,dbl:0,sp:1},h2={c:c2+take(),b:h.b,st:aces?1:0,dbl:0,sp:1};
    [h1,h2].forEach(x=>{if(bjVal(x.c)>=21)x.st=1;});hs[t]=[h1,h2];}
  const hi=[...d.hi];while(hi[t]<hs[t].length&&hs[t][hi[t]].st)hi[t]++;
  let nd={...d,dk,hs,hi,chips};if(hi[t]<hs[t].length)return nd;
  const nx=bjNextSeat(nd,t);return nx<0?bjSettle(nd):{...nd,turn:nx};}
const bjCommitted=hs=>hs.reduce((x,h)=>x+h.b,0);
GAMES.bj={name:'بلاك جاك 21',cat:'cards',lbc:'#1E6B45',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E8B57"/><rect x="20" y="22" width="34" height="50" rx="6" fill="#fff" transform="rotate(-10 37 47)"/><rect x="46" y="26" width="34" height="50" rx="6" fill="#fff" transform="rotate(8 63 51)"/><text x="34" y="54" font-size="20" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(-10 37 47)">A</text><text x="63" y="58" font-size="20" font-weight="800" fill="#D43C33" text-anchor="middle" transform="rotate(8 63 51)">K</text></svg>`,
  init:n=>({r:1,chips:Array(n).fill(BJ0),bet:Array(n).fill(0),hs:Array(n).fill(0).map(()=>[]),hi:Array(n).fill(0),dl:'',dk:'',ph:'bet',rd:0,res:null,peek:0}),
  simulNow:d=>d.ph==='bet',
  viewer:d=>d.win==null&&d.ph==='bet'?simulViewer(d):null,
  resolve(d,picks){const bet=picks.map((p,s)=>d.out[s]==='1'?0:Math.max(10,Math.min(+p||10,d.chips[s])));return bjDeal({...d,bet});},
  onTimeout(d){if(d.ph==='play')return bjAct(d,'stand');if(d.ph==='done')return bjNewRound(d);return d;},
  // a player who leaves mid-round drops their hands; play goes on with the next unfinished hand, or the dealer plays
  onSkip(nd){if(nd.win!=null||nd.ph!=='play')return nd;return bjGo({...nd,hs:nd.hs.map((h,s)=>nd.out[s]==='1'?[]:h)});},
  // with 5+ players the score tiles are narrow: no coin, and 10000 and up as 12.5k
  points:d=>d.chips.map(c=>d.pl.length<=4?'🪙'+c:c<10000?String(c):(c/1000).toFixed(c<100000?1:0).replace(/\.0$/,'')+'k'),
  winText:d=>d.win==='d'?'تعادل بالرصيد':null,
  winExtra:d=>'الرصيد: '+d.pl.map((_,s)=>`${nm(d,s)} ${d.chips[s]}`).join('، '),
  status(d,ctx){const r=`<small>الجولة ${d.r} من ${BJR}</small><br>`;if(d.ph==='bet')return r+'كل واحد يحدد رهانه';if(d.ph==='done')return r+(d.peek?'الديلر عنده بلاك جاك!':'انتهت الجولة');return r+turnTxt(d,ctx);},
  render(d,ctx){const done=d.ph==='done';
    if(d.ph==='bet'){const v=ctx.v;if(v==null||v<0)return '<p class="note">ننتظر الرهانات…</p>';if(!ctx.my)return '<p class="note">ننتظر رهانات الباقين…</p>';
      const b=Math.max(10,Math.min(+(S.draft.bet||50),d.chips[v]));
      return `<div class="bjd bjbet"><b>رصيدك 🪙 ${d.chips[v]}</b><div class="bjchip" data-k="${b}"><span>${b}</span></div><div class="mbid"><button class="sm" data-ga="bm" data-i="50">−50</button><button class="sm" data-ga="bm" data-i="10">−10</button><b>${b}</b><button class="sm" data-ga="bp" data-i="10">+10</button><button class="sm" data-ga="bp" data-i="50">+50</button></div></div><div class="acts"><button class="btn red" data-ga="bet">راهن بـ ${b}</button><button class="btn navy" data-ga="allin">كل الرصيد</button></div>`;}
    const dc=cardsOf(d.dl).map((c,i)=>!done&&i===1?'??':c);if(!done&&d.dl.length===2)dc.push('??');
    let s=`<div class="bjt"><div class="bjd"><b>الديلر ${done?`<em>${bjVal(d.dl)}</em>`:''}</b><div class="hand" data-k="r${d.rd}">${dc.map(c=>`<span class="bjc" data-k="${c}">${cardHTML(c)}</span>`).join('')}</div></div>`;
    const nh=d.pl.reduce((x,_,i)=>x+(d.out[i]==='1'?0:(d.hs[i]||[]).length),0);
    s+=`<div class="bjp" style="grid-template-columns:repeat(${nh>4?3:nh===1?1:2},minmax(0,1fr))">${d.pl.map((r,i)=>{if(d.out[i]==='1'||!(d.hs[i]||[]).length)return '';return (d.hs[i]).map((h,k)=>{const v=bjVal(h.c),act=!done&&d.turn===i&&d.hi[i]===k;const w=done&&d.res?d.res[i][k]:null;
      const st=h.sur?'سلّم 🏳️':v>21?'تعدّى':bjNat(h.c,h.sp)?'بلاك جاك!':h.dbl?'دبل':h.st&&!done?'وقف':'';
      return `<div class="bjh ${act?'on':''} ${v>21?'bust':''}" style="--c:${col(d,i)}"><b>${!ctx.local&&i===ctx.v?'أنت':nm(d,i)}${d.hs[i].length>1?` ${k+1}`:''}<em>${v}</em></b><div class="hand" data-k="r${d.rd}">${cardsOf(h.c).map(c=>cardHTML(c)).join('')}</div><small>🪙 ${h.b}${st?' • '+st:''}${w!=null?` • ${w>0?'+':''}${w}`:''}</small></div>`;}).join('');}).join('')}</div></div>`;
    if(ctx.my&&d.ph==='play'){const t=d.turn,h=d.hs[t][d.hi[t]];const free=d.chips[t]-bjCommitted(d.hs[t]);
      const canD=h&&h.c.length===4&&free>=h.b,canS=h&&d.hs[t].length===1&&h.c.length===4&&bj10(h.c)===bj10(h.c.slice(2))&&free>=h.b;
      const canR=h&&d.hs[t].length===1&&h.c.length===4;
      s+=`<div class="acts"><button class="btn blue" data-ga="hit">اسحب</button><button class="btn navy" data-ga="stand">اكتفيت</button>${canD?'<button class="btn red" data-ga="dbl">دبل</button>':''}${canS?'<button class="btn green" data-ga="split">قسّم</button>':''}${canR?`<button class="btn bjsur" data-ga="sur">🏳️ سلّم <small>(ترجع ${Math.ceil(h.b/2)})</small></button>`:''}</div>`;}
    if(done&&d.win==null&&(ctx.local||ctx.v===d.turn||ctx.v===aliveSeats(d)[0]))s+=`<button class="big green" data-ga="next">${d.r>=BJR?'شوف النتيجة':'الجولة التالية'}</button>`;
    return s;},
  click(a,i,d,ctx){
    if(a==='bp'||a==='bm'){S.draft.bet=String(Math.max(10,(+(S.draft.bet||50))+(a==='bp'?i:-i)));render();return;}
    if(d.ph==='bet'&&ctx.my&&(a==='bet'||a==='allin')){const v=ctx.v;const b=a==='allin'?d.chips[v]:Math.max(10,Math.min(+(S.draft.bet||50),d.chips[v]));S.draft.bet=null;simulPick(d,v,b);return;}
    if(a==='next'&&d.ph==='done'&&(ctx.local||ctx.v===d.turn||ctx.v===aliveSeats(d)[0])){act(bjNewRound(d));return;}
    if(!ctx.my||d.ph!=='play')return;if(['hit','stand','dbl','split','sur'].includes(a))act(bjAct(d,a));}
};

/* ---------- colours and numbers (shedding card game) ---------- */
const UC={r:'#E5483F',g:'#3FAE5C',b:'#3D8FD8',y:'#F0B429',k:'#2D4763'},UCN={r:'الأحمر',g:'الأخضر',b:'الأزرق',y:'الأصفر'};
function unoDeck(){const a=[];for(const c of 'rgby'){a.push(c+'0');for(const v of '123456789SRD')a.push(c+v,c+v);}for(let k=0;k<4;k++)a.push('kW','kF');return shuffle(a);}
const uLabel=v=>({S:'⊘',R:'⇄',D:'<span class="ltr">+2</span>',W:'🎨',F:'<span class="ltr">+4</span>'})[v]||v;
// the card: colour body in a white margin, the tilted white oval, the value in the middle with a dark drop and small corner labels
const UDK='#1B2838';
const uOval=(rx,ry)=>{const q=[[`M0 0H${rx}A${rx} ${ry} 0 0 1 0 ${ry}Z`,'b'],[`M0 0V${ry}A${rx} ${ry} 0 0 1 -${rx} 0Z`,'y'],[`M0 0H-${rx}A${rx} ${ry} 0 0 1 0 -${ry}Z`,'g'],[`M0 0V-${ry}A${rx} ${ry} 0 0 1 ${rx} 0Z`,'r']];
  return q.map(([d,c])=>`<path d="${d}" fill="${UC[c]}"/>`).join('')+`<ellipse rx="${rx}" ry="${ry}" fill="none" stroke="#fff" stroke-width="${rx/10}"/>`;};
// a symbol drawn around 0,0 in colour f (the middle one gets a dark copy under it)
function uSym(v,f){const st=`stroke="${f}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  if(v==='S')return `<circle r="9" ${st} stroke-width="3.6"/><path d="M-6.2 6.2 6.2-6.2" ${st} stroke-width="3.6"/>`;
  if(v==='R')return `<g transform="rotate(-45)" fill="${f}"><path d="M-10.5-7.2H1.5V-12.4L10.5-4.8 1.5 2.8V-2.4H-10.5Z"/><path d="M10.5 7.2H-1.5V12.4L-10.5 4.8-1.5-2.8V2.4H10.5Z"/></g>`;
  if(v==='D')return `<rect x="-10" y="-11" width="12" height="17" rx="2.4" fill="${f}" stroke="#fff" stroke-width="1.6" transform="rotate(-12)"/><rect x="-2" y="-5" width="12" height="17" rx="2.4" fill="${f}" stroke="#fff" stroke-width="1.6" transform="rotate(-12)"/>`;
  if(v==='F')return ['g','b','r','y'].map((c,k)=>`<rect x="${-13+k*5.4}" y="${-10+k*2.6}" width="10" height="14" rx="2" fill="${f===UDK?UDK:UC[c]}" stroke="#fff" stroke-width="1.3" transform="rotate(-14)"/>`).join('');
  return '';}
const uTxt=(v,x,y,fs,f,sw)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" fill="${f}"${sw?` stroke="${UDK}" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"`:''}>${v}</text>`;
const UFACE={};
function uFace(c){if(UFACE[c])return UFACE[c];const v=c[1],wild=c[0]==='k',f=wild?UDK:UC[c[0]];
  const lab=v==='D'?'+2':v==='F'?'+4':v;
  // corner label: the number, +2/+4, a small symbol, or a small four-colour oval for the wild card
  const corner=/[0-9]/.test(v)||v==='D'||v==='F'?uTxt(lab,10,15.5,lab.length>1?10.5:13,'#fff',1.1):v==='W'?`<g transform="translate(10 11.5) rotate(32)">${uOval(3.6,6)}</g>`:`<g transform="translate(10 11) scale(.42)">${uSym(v,'#fff')}</g>`;
  let mid;
  if(wild)mid=`<g transform="translate(30 42) rotate(32)">${uOval(19,31.5)}</g>`+(v==='F'?`<g transform="translate(31.4 43.6)">${uSym('F',UDK)}</g><g transform="translate(30 42)">${uSym('F','')}</g>`:'');
  else{mid=`<ellipse cx="30" cy="42" rx="19" ry="31.5" transform="rotate(32 30 42)" fill="#fff"/>`;
    if(/[0-9]/.test(v))mid+=uTxt(v,31.2,55.4,35,UDK)+uTxt(v,30,54,35,f)+('69'.includes(v)?`<rect x="23.6" y="57" width="12.8" height="2.6" rx="1.3" fill="${f}"/>`:'');
    else mid+=`<g transform="translate(31.2 43.4)">${uSym(v,UDK)}</g><g transform="translate(30 42)">${uSym(v,f)}</g>`;}
  return UFACE[c]=`<svg class="cf" viewBox="0 0 60 84" aria-hidden="true"><rect x="2.6" y="2.6" width="54.8" height="78.8" rx="5" fill="${f}"/>${mid}${corner}<g transform="rotate(180 30 42)">${corner}</g></svg>`;}
const uCard=(c,cls,attrs)=>`<${attrs?'button':'div'} class="card uno ${cls||''}" ${attrs||''}>${uFace(c)}</${attrs?'button':'div'}>`;
// a stable id for each card of a hand (the same card twice gets 2, 3…), so the screen keeps a card's node while the hand changes
// and only a card that is new in the hand (dealt or drawn) flies in
const handIds=(cs,pre)=>{const k={};return cs.map(c=>{k[c]=(k[c]||0)+1;return pre+c+k[c];});};
// the back of the pile: dark card, red oval with the game's name
const uBack=cls=>`<div class="card uback ${cls||''}"><svg class="cf" viewBox="0 0 60 84" aria-hidden="true"><rect x="2.6" y="2.6" width="54.8" height="78.8" rx="5" fill="${UDK}"/><ellipse cx="30" cy="42" rx="19" ry="31.5" transform="rotate(32 30 42)" fill="#E5483F" stroke="#fff" stroke-width="1.6"/><text x="30" y="47" text-anchor="middle" font-size="15" fill="#FFD84D" stroke="${UDK}" stroke-width="2.4" paint-order="stroke" transform="rotate(-24 30 42)">ألوان</text></svg></div>`;
const uPlayable=(c,d,hand)=>{const top=d.disc.slice(-2);if(d.drew&&typeof d.drew==='string'&&c!==d.drew)return false;
  if(c==='kF'&&hand&&hand.some(x=>x[0]===d.color))return false;return c[0]==='k'||c[0]===d.color||c[1]===top[1];};
const uPts=c=>c[0]==='k'?50:/[0-9]/.test(c[1])?+c[1]:20;
function uStep(d,from,k,dir,out){out=out||d.out;const n=d.pl.length;let s=from;for(let m=0;m<k;m++){for(let q=0;q<n;q++){s=((s+dir)%n+n)%n;if(out[s]!=='1')break;}}return s;}
// each card is drawn at random from the pile, so the pile's order in the shared state tells nobody what comes next
function uDraw(d,k){let dr=d.draw,disc=d.disc,got='';for(let m=0;m<k;m++){if(!dr.length){const top=disc.slice(-2);dr=disc.slice(0,-2);disc=top;}if(!dr.length)break;const j=rnd(dr.length/2)*2;got+=dr.slice(j,j+2);dr=dr.slice(0,j)+dr.slice(j+2);}return [got,{...d,draw:dr,disc}];}
GAMES.uno={name:'ألوان وأرقام',cat:'cards',lbc:'#C2362F',points:d=>d.hands.map(h=>h.length/2+' ورق'),
  // online each phone sees only its own hand and not the pile; the card just drawn (drew) is shown only to the one who drew it
  hide:{seat:['hands'],all:['draw']},
  mask:(d,seat)=>{const v=viewOf({hide:GAMES.uno.hide},d,seat);return v!==d&&typeof d.drew==='string'&&seat!==d.turn?{...v,drew:maskVal(d.drew)}:v;},
  // a 'said UNO' on this phone belongs to the player whose turn just ended, never to the next one
  onTimeout:d=>{S.unoSaid=null;return {...d,drew:false,uno:-1,turn:uStep(d,d.turn,1,d.dir)};},
  // a player who leaves mid-turn takes a drawn card's turn with them, and the turn goes on in the game's direction
  onSkip(nd,d){if(nd.win!=null)return nd;const uno=nd.uno>=0&&nd.out[nd.uno]==='1'?-1:nd.uno;
    return nd.out[d.turn]==='1'?{...nd,uno,drew:false,turn:uStep(d,d.turn,1,d.dir,nd.out)}:{...nd,uno};},
  winExtra:d=>typeof d.win==='number'?`حصّل ${d.pl.reduce((x,_,s)=>x+cardsOf(d.hands[s]).reduce((y,c)=>y+uPts(c),0),0)} نقطة من ورق الباقين`:'',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2D4763"/>${[['#E5483F',-16,22],['#F0B429',-5,34],['#3FAE5C',6,46],['#3D8FD8',17,58]].map(([c,r,x])=>`<rect x="${x-14}" y="26" width="30" height="46" rx="6" fill="${c}" stroke="#fff" stroke-width="3" transform="rotate(${r} ${x} 50)"/>`).join('')}<text x="62" y="58" font-size="18" font-weight="800" fill="#fff" text-anchor="middle" direction="ltr" transform="rotate(17 58 50)">+2</text></svg>`,
  init:n=>{let a=unoDeck();const hands=[];for(let s=0;s<n;s++){hands.push(a.slice(0,7).join(''));a=a.slice(7);}
    let i=a.findIndex(c=>/[0-9]/.test(c[1]));const top=a.splice(i,1)[0];return {hands,draw:a.join(''),disc:top,color:top[0],dir:1,drew:false,uno:-1,lp:-1,last:''};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>اللون الحالي: <b style="color:${UC[d.color]}">${UCN[d.color]}</b>، والدور ${d.dir>0?'⟲':'⟳'}</small>`,
  render(d,ctx){
    const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;const top=d.disc.slice(-2);
    let s='';const my=v>=0&&ctx.my&&d.turn===v;const canDraw=my&&!d.drew;
    // the table: draw pile with depth, the discard pile (the cards under it slightly turned), a ring in the current colour
    // that shows the direction of play; the top card is keyed by the pile's length so a new one lands
    const under=cardsOf(d.disc).slice(-3,-1),nd=d.disc.length/2;
    s+=`<div class="utable" style="--uc:${UC[d.color]}"><div class="udeck">${canDraw?'<button class="ustack" data-ga="draw" aria-label="اسحب ورقة">':'<div class="ustack">'}${uBack('big')}${canDraw?'</button>':'</div>'}<small>${d.draw.length/2}</small></div>
      <div class="upile"><svg class="uring ${d.dir>0?'':'ccw'}" viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-43.2-15.7A46 46 0 0 1 39.8-23"/><path d="M43.2 15.7A46 46 0 0 1-39.8 23"/><path class="ah" d="M43.3-16.9 44.1-25.5 35.5-20.5Z"/><path class="ah" d="M-43.3 16.9-44.1 25.5-35.5 20.5Z"/></svg>${under.map((c,k)=>`<div class="uold" style="--r:${((nd-under.length+k)*47)%26-13}deg">${uCard(c,'big')}</div>`).join('')}<div class="utop ${d.lp==null||d.lp<0?'':d.lp===v?'fm':'fo'}" data-k="u${nd}">${uCard(top,'big')}</div></div>
      ${d.lp>=0&&d.pl[d.lp]!=null?`<span class="ulp" style="--c:${col(d,d.lp)}" data-k="l${nd}">${d.lp===v&&!ctx.local?'أنت':nm(d,d.lp)}</span>`:''}<span class="ucol"><i></i>${UCN[d.color]}</span></div>`;
    if(v<0)return s;
    const hand=cardsOf(d.hands[v]);
    if(my&&S.wild!=null&&(hand[S.wild]||'')[0]==='k')s+=`<div class="uwild"><p class="lbl">اختر اللون</p><div class="row">${'rgby'.split('').map((c,k)=>`<button class="btn swatch" style="--sw:${UC[c]}" data-ga="wc" data-i="${k}" aria-label="${UCN[c]}"></button>`).join('')}</div></div>`;
    if(d.uno>=0&&d.win==null&&(ctx.local||ctx.v!==d.uno))s+=`<div class="row"><button class="btn red" data-ga="catch">${nm(d,d.uno)} ما قال أونو! امسكه (+2)</button></div>`;
    // every card is a button (a played-out one is disabled), so a hand that becomes playable keeps its nodes and does not fly in again
    const ids=handIds(hand,'uc'+v+'-');
    s+=`<p class="lbl hlbl">أوراقك</p><div class="hand uhand ${my?'my':''}">${hand.map((c,i)=>my&&uPlayable(c,d,hand)?uCard(c,'pick'+(S.wild===i?' sel':'')+(d.drew===c?' took':''),`id="${ids[i]}" data-ga="play" data-i="${i}"`):uCard(c,my?'dim':'',`id="${ids[i]}" disabled`)).join('')}</div>`;
    if(my)s+=`<div class="row">${d.drew?'<button class="btn navy" data-ga="pass">مرّر الدور</button>':'<button class="btn blue" data-ga="draw">اسحب ورقة</button>'}${hand.length===2?`<button class="btn ${S.unoSaid===d.gid+':'+d.disc.length?'green':'red'}" data-ga="say">أونو!</button>`:''}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(a==='catch'&&d.uno>=0&&d.win==null&&(ctx.local||ctx.v!==d.uno)){const o=d.uno;const [g,nd]=uDraw(d,2);const hands=[...nd.hands];hands[o]+=g;act({...nd,hands,uno:-1,last:`${nm(d,o)} نسي يقول أونو وسحب 2`});return;}
    if(!ctx.my)return;const t=d.turn;
    if(a==='say'){S.unoSaid=d.gid+':'+d.disc.length;toast('قلت أونو! 📣');render();return;}
    if(a==='draw'){if(d.drew)return;const [g,nd]=uDraw(d,1);const hands=[...nd.hands];hands[t]+=g;const can=g&&uPlayable(g,{...nd,drew:false},cardsOf(hands[t]));if(!can)S.unoSaid=null;
      act({...nd,hands,drew:can?g:false,uno:-1,turn:can?t:uStep(nd,t,1,nd.dir),last:`${nm(d,t)} سحب ورقة`+(can?'':' ومرّر')});return;}
    if(a==='pass'){S.unoSaid=null;act({...d,drew:false,uno:-1,turn:uStep(d,t,1,d.dir),last:`${nm(d,t)} مرّر`});return;}
    let idx=i,color=null;
    if(a==='play'){const c=cardsOf(d.hands[t])[i];if(!c||!uPlayable(c,d,cardsOf(d.hands[t])))return;if(c[0]==='k'){S.wild=i;render();return;}}
    // a colour choice left over from an earlier turn (that turn ended on the timer) no longer points at a wild card
    if(a==='wc'){const w=cardsOf(d.hands[t])[S.wild];if(S.wild==null||!w||w[0]!=='k'||!'rgby'[i]){S.wild=null;render();return;}idx=S.wild;color='rgby'[i];}
    S.wild=null;const said=S.unoSaid===d.gid+':'+d.disc.length;const hand=cardsOf(d.hands[t]);const c=hand.splice(idx,1)[0];let nd={...d,hands:[...d.hands],disc:d.disc+c,color:color||c[0],drew:false,lp:t,uno:hand.length===1&&!said?t:-1};nd.hands[t]=hand.join('');
    let msg=`${nm(d,t)} لعب ${c[0]==='k'?(c[1]==='F'?'+4':'ورقة ألوان')+' واختار '+UCN[nd.color]:uLabel(c[1])}`;
    const alive=aliveSeats(d).length;let turn;
    if(c[1]==='S')turn=uStep(nd,t,2,nd.dir);
    else if(c[1]==='R'){nd.dir=-d.dir;turn=alive===2?t:uStep(nd,t,1,nd.dir);}
    else if(c[1]==='D'||c[1]==='F'){const k=c[1]==='D'?2:4,tg=uStep(nd,t,1,nd.dir);const [g,n2]=uDraw(nd,k);nd={...n2,hands:[...n2.hands]};nd.hands[tg]+=g;msg+=`، و${nm(d,tg)} سحب ${k}`;turn=uStep(nd,t,2,nd.dir);}
    else turn=uStep(nd,t,1,nd.dir);
    if(!nd.hands[t].length){act({...nd,win:t,last:msg+'، وخلّصت أوراقه!'});return;}
    act({...nd,turn,last:msg});
  }
};

/* the bot: keeps its colour cards for when it needs them, sends +2, skips and +4 at whoever is about to finish, sheds its high
   numbers, and turns the colour to the one it holds most. A hard bot also remembers the colour a player drew on (he had none of it)
   and plays toward it; it only sees what a player at the table would see */
const unoMem=d=>{if(!S.unoM||S.unoM.g!==d.gid)S.unoM={g:d.gid,lack:{}};return S.unoM;};
GAMES.uno.botSee=nd=>{const d=S.st.d;if(!d||!nd||d.gid!==nd.gid||!Array.isArray(d.hands)||!Array.isArray(nd.hands))return;const t=d.turn,M=unoMem(nd);
  if(nd.disc.length>d.disc.length){const c=nd.disc.slice(-2);if(M.lack[t])delete M.lack[t][c[0]];return;}
  if(nd.disc.slice(-2)===d.disc.slice(-2)&&!d.drew&&nd.hands[t].length===d.hands[t].length+2)(M.lack[t]=M.lack[t]||{})[d.color]=1;};
GAMES.uno.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);
  // first catch whoever went down to one card without saying «أونو»
  if(d.uno>=0&&d.uno!==s&&Math.random()<[0,.5,.8,1][lv])return botDo(d,s,'catch',0);
  // the bot says «أونو» (easy ones often forget) on its own move, not through the shared button flag
  const say=H.length===2&&Math.random()<[0,.5,.9,1][lv],uno=nd=>nd&&H.length===2&&cardsOf(nd.hands[s]).length===1?{...nd,uno:say?-1:s}:nd;
  const ok=H.map((c,i)=>uPlayable(c,d,H)?i:-1).filter(i=>i>=0);
  if(!ok.length)return botDo(d,s,d.drew?'pass':'draw',0);
  const n1=uStep(d,s,1,d.dir),danger=!sameTeam(d,n1,s)&&d.hands[n1].length/2<=2,two=aliveSeats(d).length===2;
  const lack=lv===3?(unoMem(d).lack[n1]||{}):{};
  const C={r:0,g:0,b:0,y:0};H.forEach(x=>{if(x[0]!=='k')C[x[0]]++;});
  const score=i=>{const c=H[i],v=c[1],left=H.length-1;let sc;
    if(c[0]==='k')sc=left<=1?8:danger?(v==='F'?7:3):left<=3?1:(v==='F'?-2:-4);
    else{sc=4+(C[c[0]]-1)*.6+(lack[c[0]]?2.5:0)+(c[0]!==d.color?(C[c[0]]>C[d.color]?1:-.5):0);
      if('SRD'.includes(v))sc+=danger?5+(v==='D'?1:0):two?2.5:left<=3?1:-.5;else sc+=+v/10;}
    return sc+Math.random()*(lv===3?.3:1);};
  let i;if(lvRand(lv))i=pickR(ok);else{ok.sort((a,b)=>score(b)-score(a));i=ok[0];
    // a drawn colour card is kept for later when the hand is still long
    if(d.drew&&lv>1&&H[i][0]==='k'&&H.length>4&&!danger)return botDo(d,s,'pass',0);}
  if(H[i][0]==='k'){const cs='rgby'.split('').sort((a,b)=>(C[b]+(lack[b]?1.5:0))-(C[a]+(lack[a]?1.5:0)));
    const pick=C[cs[0]]||lack[cs[0]]?cs[0]:'rgby'[rnd(4)];S.wild=i;return uno(botDo(d,s,'wc','rgby'.indexOf(pick)));}
  return uno(botDo(d,s,'play',i));};

/* ---------- dominoes ---------- */
const DOMH={2:7,3:6,4:6,5:4,6:4,7:3,8:3};
const PIP={0:[],1:[[10,10]],2:[[5,5],[15,15]],3:[[5,5],[10,10],[15,15]],4:[[5,5],[15,5],[5,15],[15,15]],5:[[5,5],[15,5],[10,10],[5,15],[15,15]],6:[[5,4],[15,4],[5,10],[15,10],[5,16],[15,16]]};
const half=(n,x)=>PIP[n].map(([a,b])=>`<circle cx="${a+x}" cy="${b}" r="1.95"/>`).join('');
const domSVG=(t,w)=>`<svg class="dsv" viewBox="0 0 40 20" width="${w||52}" aria-hidden="true"><path class="dl" d="M20 2.6V17.4"/><circle class="dp" cx="20" cy="10" r="1.15"/><g class="dpp">${half(+t[0],0)}${half(+t[1],20)}</g></svg>`;
const halfV=(n,y)=>PIP[n].map(([a,b])=>`<circle cx="${a}" cy="${b+y}" r="1.95"/>`).join('');
const domV=(t,h)=>`<svg class="dsv" viewBox="0 0 20 40" height="${h||84}" aria-hidden="true"><path class="dl" d="M2.6 20H17.4"/><circle class="dp" cx="10" cy="20" r="1.15"/><g class="dpp">${halfV(+t[0],0)}${halfV(+t[1],20)}</g></svg>`;
function domEnds(d){if(!d.ch)return null;return [d.ch[0],d.ch[d.ch.length-1]];}
const domFits=(t,d)=>{const e=domEnds(d);if(!e)return [true,true];return [t.includes(e[0]),t.includes(e[1])];};
GAMES.domino={name:'دومينو',cat:'cards',lbc:'#5B4636',hide:{seat:['hands'],all:['bone']},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A5C45"/><g transform="rotate(-20 50 50)"><rect x="18" y="36" width="64" height="32" rx="6" fill="#fff" stroke="#2D4763" stroke-width="3"/><line x1="50" y1="40" x2="50" y2="64" stroke="#2D4763" stroke-width="2.5"/>${[[28,44],[40,60],[34,52]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#2D4763"/>`).join('')}${[[60,44],[72,44],[60,60],[72,60]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#2D4763"/>`).join('')}</g></svg>`,
  init:n=>{const all=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)all.push(''+a+b);const s=shuffle(all);const k=DOMH[n]||3;const hands=[];for(let p=0;p<n;p++)hands.push(s.slice(p*k,p*k+k).join(''));
    return {hands,bone:s.slice(n*k).join(''),ch:'',pass:0,lp:-1,ls:'',last:''};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  points:d=>d.hands.map(h=>h.length/2+' قطع'),
  winExtra:d=>{const pip=s=>[...d.hands[s]].reduce((x,c)=>x+ +c,0);const w=typeof d.win==='number'?d.win:null;return (w!=null?`${nm(d,w)} حصّل ${d.pl.reduce((x,_,s)=>s===w?x:x+pip(s),0)} نقطة من قطع الباقين • `:'')+d.pl.map((r,s)=>`${nm(d,s)} ${pip(s)}`).join('، ');},
  render(d,ctx){
    const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    let s='';
    const ch=d.ch.match(/.{2}/g)||[];
    // the chain is drawn left to right, so its end labels and the side buttons are laid out left to right too
    // the tile just laid (d.ls: which end it went on) comes from its player's side and keeps a ring in their colour
    const e=domEnds(d),li=d.lp>=0&&ch.length?(d.ls==='L'?0:ch.length-1):-1,from=d.lp===v&&!ctx.local?'fm':'fo';
    s+=`<div class="table">${ch.length?`<div class="chain">${ch.map((t,i)=>`<span class="dom ${t[0]===t[1]?'dbl':''} ${i===0||i===ch.length-1?'end':''} ${i===li?'lp '+from:''}" data-k="${t}"${i===li?` style="--c:${col(d,d.lp)}"`:''}>${t[0]===t[1]?domV(t,54):domSVG(t,56)}</span>`).join('')}</div><div class="ends" style="direction:ltr"><span>اليسار: <b>${e[0]}</b></span><span>اليمين: <b>${e[1]}</b></span></div>`:'<p class="note" style="margin:24px 0">أول قطعة تفتح اللعب</p>'}<span class="bone"><i></i>المخزن ${d.bone.length/2}</span></div>`;
    if(v<0)return s;const my=ctx.my&&d.turn===v;const hand=d.hands[v].match(/.{2}/g)||[];
    const any=hand.some(t=>domFits(t,d).some(x=>x));
    if(my&&S.dside!=null&&e)s+=`<div class="acts" style="direction:ltr"><button class="btn navy" data-ga="L" data-i="${S.dside}">⬅ على طرف ${e[0]}</button><button class="btn navy" data-ga="R" data-i="${S.dside}">على طرف ${e[1]} ➡</button></div>`;
    // each tile keeps its node (id), so only a tile drawn from the boneyard comes in
    s+=`<p class="lbl hlbl">قطعك</p><div class="hand dhand">${hand.map((t,i)=>{const f=domFits(t,d).some(x=>x);return my&&f?`<button class="dom pick" id="dt${t}" data-ga="play" data-i="${i}">${domV(t)}</button>`:`<button class="dom ${my?'dim':''}" id="dt${t}" disabled>${domV(t)}</button>`;}).join('')}</div>`;
    if(my&&!any)s+=`<div class="row">${d.bone.length?'<button class="btn blue" data-ga="draw">اسحب من المخزن</button>':'<button class="btn navy" data-ga="pass">مرّر الدور</button>'}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;const hand=d.hands[t].match(/.{2}/g)||[];
    // a random tile from the boneyard, so its order in the shared state tells nobody what comes next
    if(a==='draw'){if(!d.bone.length)return;const j=rnd(d.bone.length/2)*2;const hands=[...d.hands];hands[t]+=d.bone.slice(j,j+2);act({...d,hands,bone:d.bone.slice(0,j)+d.bone.slice(j+2),last:`${nm(d,t)} سحب من المخزن`});return;}
    if(a==='pass'){const pass=d.pass+1;let win=null;
      if(pass>=aliveSeats(d).length){const sums=d.hands.map((h,s)=>d.out[s]==='1'?999:[...h].reduce((x,c)=>x+ +c,0));const mn=Math.min(...sums);const top=sums.map((x,s)=>x===mn?s:-1).filter(s=>s>=0);win=top.length===1?top[0]:'d';}
      act({...d,pass,turn:nextSeat(d,t),win,last:win!=null?'اللعب انقفل، والأقل نقاط فاز':`${nm(d,t)} مرّر`});return;}
    const tile=hand[i];if(!tile)return;const [fl,fr]=domFits(tile,d);let side=a==='L'?'L':a==='R'?'R':null;
    if(!side){if(!d.ch){side='R';}else if(fl&&fr&&d.ch[0]!==d.ch[d.ch.length-1]&&tile[0]!==tile[1]){S.dside=i;render();return;}else side=fr?'R':'L';}
    S.dside=null;let ch=d.ch;
    if(!ch)ch=tile;else if(side==='R'){const e=ch[ch.length-1];if(!tile.includes(e))return;ch+=tile[0]===e?tile:tile[1]+tile[0];}
    else{const e=ch[0];if(!tile.includes(e))return;ch=(tile[1]===e?tile:tile[1]+tile[0])+ch;}
    hand.splice(i,1);const hands=[...d.hands];hands[t]=hand.join('');
    act({...d,hands,ch,pass:0,lp:t,ls:d.ch?side:'R',turn:nextSeat(d,t),win:hand.length?null:t,last:`${nm(d,t)} نزّل ${tile[0]}|${tile[1]}`});
  }
};

/* the bot: weighs every tile on every end. It sheds heavy tiles and doubles, keeps ends it can answer itself, counts the
   numbers already down, and (hard) remembers the numbers a player drew or passed on, to leave him ends he cannot play */
const domMem=d=>{if(!S.domM||S.domM.g!==d.gid)S.domM={g:d.gid,lack:{}};return S.domM;};
GAMES.domino.botSee=nd=>{const d=S.st.d;if(!d||!nd||d.gid!==nd.gid||!d.ch||!Array.isArray(d.hands))return;const t=d.turn;
  if(nd.ch===d.ch&&(nd.hands[t].length>d.hands[t].length||nd.pass>d.pass)){const L=domMem(nd).lack[t]=domMem(nd).lack[t]||{};L[d.ch[0]]=1;L[d.ch[d.ch.length-1]]=1;}};
GAMES.domino.bot=(d,s,lv)=>{const H=d.hands[s].match(/.{2}/g)||[];const ok=H.map((t,i)=>domFits(t,d).some(x=>x)?i:-1).filter(i=>i>=0);
  if(!ok.length)return botDo(d,s,d.bone.length?'draw':'pass',0);
  if(!d.ch){// the opening: the heaviest double, else the heaviest tile
    const i=lvRand(lv)?pickR(ok):ok.sort((a,b)=>(+H[b][0]+ +H[b][1]+(H[b][0]===H[b][1]?20:0))-(+H[a][0]+ +H[a][1]+(H[a][0]===H[a][1]?20:0)))[0];return botDo(d,s,'play',i);}
  const n1=nextSeat(d,s),lack=lv===3&&!sameTeam(d,n1,s)?(domMem(d).lack[n1]||{}):{};
  // how many tiles with each number nobody has shown yet (not on the table, not in this hand)
  const unseen=[0,0,0,0,0,0,0];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++){const t=''+a+b;if(domHas(d.ch,t))continue;if(H.includes(t))continue;unseen[a]++;if(b!==a)unseen[b]++;}
  const opts=[];for(const i of ok){const t=H[i];const [fl,fr]=domFits(t,d);for(const side of ['L','R']){if(side==='L'?!fl:!fr)continue;
    const e=side==='L'?d.ch[0]:d.ch[d.ch.length-1],o=t[0]===e?t[1]:t[0];const ends=side==='L'?[o,d.ch[d.ch.length-1]]:[d.ch[0],o];
    const rest=H.filter((_,j)=>j!==i);let v=(+t[0]+ +t[1])*.3+(t[0]===t[1]?2:0);
    v+=ends.reduce((x,n)=>x+(rest.some(r=>r.includes(n))?1.5:0)+(lv>1?(4-Math.min(4,unseen[n]))*.45:0)+(lack[n]?3:0),0);
    opts.push({i,side,v:v+Math.random()*(lv===3?.2:1)});}}
  const m=lvRand(lv)?pickR(opts):opts.sort((a,b)=>b.v-a.v)[0];return botDo(d,s,m.side,m.i);};
// is tile t (either way round) in the chain string ch (read two by two)?
const domHas=(ch,t)=>{const r=t[1]+t[0];for(let k=0;k<ch.length;k+=2){const x=ch.slice(k,k+2);if(x===t||x===r)return true;}return false;};

/* ---------- bingo ---------- */
function seedOf(str){let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
// each seat's card comes from its own random seed (d.bs), hidden online; old states without bs fall back to gid and role
// sw[s]: the two places a seat swapped on its card (its one swap of the game), hidden with the card
function bingoCard(d,s){const R=mulberry(seedOf(d.bs?d.bs[s]:d.gid+':'+d.pl[s]));const a=[...Array(25).keys()].map(x=>x+1);for(let i=24;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  const w=d.sw&&d.sw[s];if(Array.isArray(w)&&w.length===2&&w[0]>=0&&w[1]>=0&&w[0]<25&&w[1]<25)[a[w[0]],a[w[1]]]=[a[w[1]],a[w[0]]];return a;}
const bgSwapped=(d,s)=>!!(d.sw&&Array.isArray(d.sw[s])&&d.sw[s].length);
const BLINES=(()=>{const L=[];for(let k=0;k<5;k++){L.push([0,1,2,3,4].map(c=>k*5+c));L.push([0,1,2,3,4].map(r=>r*5+k));}L.push([0,6,12,18,24]);L.push([4,8,12,16,20]);return L;})();
const bingoLines=(card,called)=>BLINES.filter(L=>L.every(i=>called[card[i]-1]==='1')).length;
GAMES.bingo={name:'بنقو',cat:'cards',lbc:'#B5486E',onTimeout:d=>({...d,turn:nextSeat(d,d.turn)}),hide:{seat:['bs','sw']},
  // the swap mode and the first place picked belong to the phone; the swap itself carries both places in its number
  net:{local:['bwm','bs']},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D45D87"/>${[0,1,2,3,4].map(r=>[0,1,2,3,4].map(c=>`<rect x="${12+c*16}" y="${12+r*16}" width="14" height="14" rx="3" fill="${(r===c)?'#ffd84d':'#fff'}"/>`).join('')).join('')}<path d="M14 14L86 86" stroke="#2D4763" stroke-width="4" stroke-linecap="round"/></svg>`,
  // ln: lines each seat has made, kept in the state so the scores show without the hidden cards
  // once a game each player may, instead of calling, swap two places on their own card (to finish a line with a number already called)
  init:n=>({called:'0'.repeat(25),bs:Array(n).fill(0).map(()=>rid()+rid()),sw:Array(n).fill(0).map(()=>[]),ln:Array(n).fill(0),lc:0,last:''}),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((r,s)=>(d.ln?d.ln[s]:bingoLines(bingoCard(d,s),d.called))+'/5'),status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;if(v<0)return '';
    const card=bingoCard(d,v);const lines=BLINES.filter(L=>L.every(i=>d.called[card[i]-1]==='1')).flat();
    const ln=bingoLines(card,d.called),wm=ctx.my&&!bgSwapped(d,v)&&S.bgW===d.gid+':'+d.turn,f=wm&&S.bgF!=null?S.bgF:-1;
    const canW=ctx.my&&!bgSwapped(d,v)&&d.win==null;return `<div class="bingo ${wm?'bswap':''}" style="--c:${col(d,v)};--l:${lit(d,v)}"><div class="bprog">${d.lc?`<span class="bball" data-k="b${d.lc}"><small>آخر رقم</small>${d.lc}</span>`:''}<div><i style="width:${ln*20}%"></i></div><b>${'بنقو'.split('').map((ch,k)=>`<span class="${k<Math.min(ln,4)||ln>=5?'on':''}">${ch}</span>`).join('')}</b></div>
    <div class="cellgrid bgrid" style="grid-template-columns:repeat(5,minmax(0,1fr))">${card.map((n,i)=>{const c=d.called[n-1]==='1';
      const ga=wm?(f<0||f===i?`data-ga="bs" data-i="${i}"`:`data-ga="bw" data-i="${f*25+i}"`):c?'':`data-ga="m" data-i="${n}"`;
      return `<button class="cg ${c?'bc':''} ${c&&lines.includes(i)?'ln':''} ${i===f?'bsel':''}" ${ga} ${ga&&ctx.my?'':'disabled'}>${c?`<span>${n}</span>`:n}</button>`;}).join('')}</div></div>
    ${canW?`<div class="acts"><button class="btn ${wm?'red':'navy'}" data-ga="bwm">${wm?(f<0?'اختر أول خانة… (إلغاء)':'اختر الخانة الثانية… (إلغاء)'):'🔁 بدّل خانتين (مرة بالجولة)'}</button></div>`:''}`;},
  click(a,n,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='bwm'){if(bgSwapped(d,t))return;const k=d.gid+':'+t;S.bgW=S.bgW===k?null:k;S.bgF=null;render();return;}
    if(a==='bs'){if(!(n>=0&&n<25))return;S.bgF=S.bgF===n?null:n;render();return;}
    if(a==='bw'){const x=Math.floor(n/25),y=n%25;if(bgSwapped(d,t)||!(x>=0&&x<25&&y>=0&&y<25)||x===y)return;S.bgW=null;S.bgF=null;
      const sw=d.pl.map((_,s)=>d.sw&&Array.isArray(d.sw[s])?[...d.sw[s]]:[]);sw[t]=[x,y];const nd={...d,sw};
      const ln=d.pl.map((r,s)=>bingoLines(bingoCard(nd,s),d.called));const got=ln[t]>(d.ln?d.ln[t]:0);
      act({...nd,ln,win:d.out[t]!=='1'&&ln[t]>=5?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} بدّل خانتين في ورقته 🔁`+(got?` وكمّل خط ${ln[t]>=5?'🎉':'✓'}`:'')});return;}
    if(a!=='m'||!(n>=1&&n<=25)||d.called[n-1]==='1')return;const called=setAt(d.called,n-1,'1');
    const ln=d.pl.map((r,s)=>bingoLines(bingoCard(d,s),called));
    const done=d.pl.map((r,s)=>d.out[s]!=='1'&&ln[s]>=5?s:-1).filter(s=>s>=0);
    let win=null;if(done.length)win=done.includes(t)?t:done.length===1?done[0]:'d';
    act({...d,called,ln,lc:n,win,turn:nextSeat(d,t),last:`${nm(d,t)} اختار ${n}`+(ln[t]>(d.ln?d.ln[t]:0)?` وكمّل خط ${ln[t]>=5?'🎉':'✓'}`:'')});
  }
};

/* ---------- risky dice ---------- */
/* vr 1 (two dice): a single 1 loses the turn total, two 1s wipe the whole score; any other throw adds both dice.
   Online every throw is made on the host's phone (rs counts the throws, so every phone tumbles the dice once) */
let PGV=0;// the last choice on this phone, kept for the next rounds
const pigNew=(d,k)=>{const T=S.pgT;if(!T||T.k!==k){S.pgT={k,t:Date.now()};return true;}return Date.now()-T.t<450;};
GAMES.pig={points:d=>d.sc,name:'زهر المخاطرة',cat:'cards',lbc:'#A0522D',onTimeout:d=>({...d,tot:0,dice:0,d2:0,turn:nextSeat(d,d.turn)}),
  // the turn total of a player who leaves goes with them
  onSkip:(nd,d)=>nd.turn!==d.turn?{...nd,tot:0,dice:0,d2:0}:nd,
  net:{host:['roll','hold','vr']},redeal:d=>d,
  icon:iconE('#D7774A','🎲'),
  init:n=>({sc:Array(n).fill(0),tot:0,dice:0,d2:0,goal:100,last:'',vr:PGV,rs:0}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+(d.vr&&d.win==null?'<br><small>زهرتين: وحدة 1 تضيّع جمع الدور، و1 مع 1 تصفّر نقاطك كلها</small>':''),
  render(d,ctx){const anim=d.rs&&pigNew('pig'+d.gid+':'+d.rs),fresh=!ctx.bot&&!d.rs&&d.sc.every(x=>!x)&&d.win==null;
    const sc=d.sc[d.turn]||0,g=d.goal||100,can=ctx.my&&d.win==null,c=col(d,d.turn),bust=(d.dice===1||d.d2===1)&&!d.tot;
    const dice=d.vr?`<span class="pig2">${tapDie(d.dice,can,c,anim?'roll':'')}${tapDie(d.d2,can,c,anim?'roll r2':'')}</span>`:tapDie(d.dice,can,c,anim?'roll':'');
    return `${fresh?`<div class="segs tttv">${[['0','زهرة وحدة'],['1','زهرتين']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:''}
    <div class="pigp ${bust?'bust':''} ${d.wipe&&d.wipe===d.rs?'wipe':''}" style="--c:${c}"><div class="row" style="align-items:center;gap:22px;margin:0">${dice}<div class="pigpot"><div class="lbl" style="margin:0">جمع الدور</div><div class="big-num" data-k="t${d.tot}">${d.tot}</div></div></div>
    <div class="pigbar" aria-hidden="true"><i style="width:${Math.min(100,sc/g*100)}%"></i><u style="left:${Math.min(100,sc/g*100)}%;width:${Math.max(0,Math.min(100,(sc+d.tot)/g*100)-Math.min(100,sc/g*100))}%"></u><span>${sc}${d.tot?` + ${d.tot}`:''} / ${g}</span></div></div>
    <div class="acts"><button class="btn navy" data-ga="hold" ${ctx.my&&d.tot>0?'':'disabled'}>احفظ النقاط${d.tot?` (${d.tot})`:''}</button></div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.win!=null)return;const t=d.turn,rs=(d.rs||0)+1;
    if(a==='vr'){if(d.rs||d.sc.some(x=>x))return;PGV=i?1:0;act({...d,vr:PGV});return;}
    if(a==='roll'){const r=1+rnd(6),r2=d.vr?1+rnd(6):0;
      if(d.vr&&r===1&&r2===1){const sc=[...d.sc];const lost=sc[t];sc[t]=0;act({...d,sc,dice:1,d2:1,tot:0,rs,wipe:rs,turn:nextSeat(d,t),last:`${nm(d,t)} طلع له 1 و1 وراحت نقاطه كلها (${lost}) 💀`});return;}
      if(r===1||r2===1){act({...d,dice:r,d2:r2,tot:0,rs,turn:nextSeat(d,t),last:`${nm(d,t)} طلع له 1 وراح جمع الدور`});return;}
      act({...d,dice:r,d2:r2,tot:d.tot+r+r2,rs,last:''});return;}
    if(a!=='hold'&&a!=='bank')return;
    if(d.tot<=0)return;const sc=[...d.sc];sc[t]+=d.tot;
    act({...d,sc,tot:0,dice:0,d2:0,win:sc[t]>=d.goal?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} حفظ ${d.tot}`});
  }
};

'use strict';
/* cards and dice: memory, higher or lower, blackjack, colours and numbers, dominoes, bingo, risky dice */

const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const RANKS='A23456789TJQK',SUITS='shdc',SUITCH={s:'♠',h:'♥',d:'♦',c:'♣'};
const deck52=(k=1)=>{const a=[];for(let n=0;n<k;n++)for(const s of SUITS)for(const r of RANKS)a.push(r+s);return a;};
const rv=c=>RANKS.indexOf(c[0])+1;
// '??' is a card nobody may see (a masked card online keeps its length): drawn face down, still clickable when extra makes it a button
const cardHTML=(c,big,extra)=>c==='??'?`<div class="card back ${big?'big':''} ${extra||''}"></div>`:
  `<div class="card ${'hd'.includes(c[1])?'red':'blk'} ${big?'big':''} ${extra||''}"><span class="ci">${c[0]==='T'?'10':c[0]}<br>${SUITCH[c[1]]}</span>${'JQK'.includes(c[0])?`<span class="fc">${c[0]}<small>${SUITCH[c[1]]}</small></span>`:`<span class="cs">${SUITCH[c[1]]}</span>`}<span class="ci b">${c[0]==='T'?'10':c[0]}<br>${SUITCH[c[1]]}</span></div>`;
const cardsOf=s=>s.match(/.{2}/g)||[];

/* ---------- memory ---------- */
const MEMP={2:8,3:10,4:10,5:12,6:12,7:15,8:15},MEMC={8:4,10:5,12:6,15:6};
const EMO=['🍎','🐪','⚽','🌙','🚗','🎈','🐟','🌴','⭐','☕','🎁','🦅','🍉','🏠','🔑'];
GAMES.memory={name:'لعبة الذاكرة',cat:'cards',lbc:'#3D8A7A',onTimeout:d=>({...d,open:[],turn:nextSeat(d,d.turn)}),
  // a player who leaves mid-turn takes their open card with them
  onSkip:(nd,d)=>nd.turn!==d.turn?{...nd,open:[]}:nd,
  icon:iconE('#4FB09B','🃏'),
  // '?' is a card nobody has turned over yet: its face is drawn when it is first turned (see click), so the layout is not in the shared state
  init:n=>{const p=MEMP[n]||15;return {p,dk:'?'.repeat(p*2),own:'.'.repeat(p*2),open:[]};},
  points:d=>cntSeat(d.own,d.pl.length).map(x=>x/2),status:(d,ctx)=>turnTxt(d,ctx),
  winExtra(d){const c=cntSeat(d.own,d.pl.length);return 'الأزواج: '+c.map((x,s)=>`${nm(d,s)} ${x/2}`).join('، ');},
  render(d,ctx){const op=d.open||[];
    return `<div class="cellgrid" style="grid-template-columns:repeat(${MEMC[d.p]},minmax(0,1fr));background:#2F6E62">${[...d.dk].map((e,i)=>{
      const own=d.own[i];if(own!=='.')return `<div class="cg" style="background:${lit(d,+own)};font-size:26px;box-shadow:inset 0 0 0 3px ${col(d,+own)}">${EMO[e.charCodeAt(0)-97]}</div>`;
      if(op.includes(i))return `<div class="cg" style="background:#fff;font-size:26px">${EMO[e.charCodeAt(0)-97]}</div>`;
      return `<button class="cg" style="background:#7FCBB9" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}>❔</button>`;}).join('')}</div>`;},
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
const hiloLeft=d=>{const a=deck52(d.pl.length>4?2:1);for(const c of cardsOf(d.dk.slice(0,d.p*2+2)))a.splice(a.indexOf(c),1);return a;};
GAMES.hilo={name:'أعلى أو أقل',cat:'cards',lbc:'#3B5B8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4F78B5"/><rect x="18" y="20" width="36" height="52" rx="6" fill="#fff" transform="rotate(-8 36 46)"/><rect x="44" y="24" width="36" height="52" rx="6" fill="#fff" transform="rotate(8 62 50)"/><text x="60" y="58" font-size="22" font-weight="800" fill="#D43C33" text-anchor="middle">K</text><path d="M28 34l6-8 6 8M28 58l6 8 6-8" stroke="#2D4763" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  // dk holds only the cards turned over so far (the current one last): the next card is drawn from the rest when it is turned
  init:n=>{const a=deck52(n>4?2:1);return {dk:a[rnd(a.length)],p:0,pts:Array(n).fill(0),last:'',goal:5};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>d.last,
  render(d,ctx){const c=d.dk.slice(d.p*2,d.p*2+2);
    return `<div class="hilo">${cardHTML(c,true)}<div class="hl-next">${cardHTML('??',true)}<small>باقي ${hiloLeft(d).length}</small></div></div><div class="acts"><button class="btn blue" data-ga="hi" ${ctx.my?'':'disabled'}>أعلى ⬆</button><button class="btn red" data-ga="lo" ${ctx.my?'':'disabled'}>أقل ⬇</button></div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,c=d.dk.slice(d.p*2,d.p*2+2),left=hiloLeft(d);if(!left.length)return;const n=left[rnd(left.length)];
    const ok=a==='hi'?rv(n)>rv(c):rv(n)<rv(c);const pts=[...d.pts];if(ok)pts[t]++;
    const p=d.p+1,end=left.length<=1;let win=null;if(pts[t]>=d.goal)win=t;else if(end)win=mostPts(pts.map((x,s)=>d.out[s]==='1'?-1:x));
    act({...d,dk:d.dk.slice(0,p*2)+n,p,pts,win,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${a==='hi'?'أعلى':'أقل'} وطلعت ${n[0]==='T'?'10':n[0]}${SUITCH[n[1]]}، ${ok?'صح ✓':'خطأ ✗'}`});
  }
};

/* ---------- blackjack: chips and bets, five rounds; naturals pay 3 to 2, double, split, dealer peeks and stands on 17 ---------- */
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
  const live=d.hs.some(hs=>hs.some(h=>bjVal(h.c)<=21&&!bjNat(h.c,h.sp)));
  if(!d.peek&&live)while(bjVal(dl)<17){const c=take(0);if(!c)break;dl+=c;}
  const dv=bjVal(dl),dn=bjNat(dl);const chips=[...d.chips];const res=d.hs.map((hs,s)=>hs.map(h=>{const v=bjVal(h.c),n=bjNat(h.c,h.sp);let w;
      if(v>21)w=-h.b;else if(dn)w=n?0:-h.b;else if(n)w=Math.floor(h.b*1.5);else if(dv>21||v>dv)w=h.b;else if(v===dv)w=0;else w=-h.b;chips[s]+=w;return w;}));
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
      return `<div class="bjd"><b>رصيدك 🪙 ${d.chips[v]}</b><div class="mbid"><button class="sm" data-ga="bm" data-i="50">−50</button><button class="sm" data-ga="bm" data-i="10">−10</button><b>${b}</b><button class="sm" data-ga="bp" data-i="10">+10</button><button class="sm" data-ga="bp" data-i="50">+50</button></div></div><div class="acts"><button class="btn red" data-ga="bet">راهن بـ ${b}</button><button class="btn navy" data-ga="allin">كل الرصيد</button></div>`;}
    let s=`<div class="bjd"><b>الديلر ${done?`<em>${bjVal(d.dl)}</em>`:''}</b><div class="hand">${cardsOf(d.dl).map((c,i)=>cardHTML(!done&&i===1?'??':c)).join('')}${!done&&d.dl.length===2?cardHTML('??'):''}</div></div>`;
    s+=`<div class="bjp">${d.pl.map((r,i)=>{if(d.out[i]==='1'||!(d.hs[i]||[]).length)return '';return (d.hs[i]).map((h,k)=>{const v=bjVal(h.c),act=!done&&d.turn===i&&d.hi[i]===k;const w=done&&d.res?d.res[i][k]:null;
      const st=v>21?'تعدّى':bjNat(h.c,h.sp)?'بلاك جاك!':h.dbl?'دبل':h.st&&!done?'وقف':'';
      return `<div class="bjh ${act?'on':''} ${v>21?'bust':''}" style="--c:${col(d,i)}"><b>${!ctx.local&&i===ctx.v?'أنت':nm(d,i)}${d.hs[i].length>1?` ${k+1}`:''}<em>${v}</em></b><div class="hand">${cardsOf(h.c).map(c=>cardHTML(c)).join('')}</div><small>🪙 ${h.b}${st?' • '+st:''}${w!=null?` • ${w>0?'+':''}${w}`:''}</small></div>`;}).join('');}).join('')}</div>`;
    if(ctx.my&&d.ph==='play'){const t=d.turn,h=d.hs[t][d.hi[t]];const free=d.chips[t]-bjCommitted(d.hs[t]);
      const canD=h&&h.c.length===4&&free>=h.b,canS=h&&d.hs[t].length===1&&h.c.length===4&&bj10(h.c)===bj10(h.c.slice(2))&&free>=h.b;
      s+=`<div class="acts"><button class="btn blue" data-ga="hit">اسحب</button><button class="btn navy" data-ga="stand">اكتفيت</button>${canD?'<button class="btn red" data-ga="dbl">دبل</button>':''}${canS?'<button class="btn green" data-ga="split">قسّم</button>':''}</div>`;}
    if(done&&d.win==null&&(ctx.local||ctx.v===d.turn||ctx.v===aliveSeats(d)[0]))s+=`<button class="big green" data-ga="next">${d.r>=BJR?'شوف النتيجة':'الجولة التالية'}</button>`;
    return s;},
  click(a,i,d,ctx){
    if(a==='bp'||a==='bm'){S.draft.bet=String(Math.max(10,(+(S.draft.bet||50))+(a==='bp'?i:-i)));render();return;}
    if(d.ph==='bet'&&ctx.my&&(a==='bet'||a==='allin')){const v=ctx.v;const b=a==='allin'?d.chips[v]:Math.max(10,Math.min(+(S.draft.bet||50),d.chips[v]));S.draft.bet=null;simulPick(d,v,b);return;}
    if(a==='next'&&d.ph==='done'&&(ctx.local||ctx.v===d.turn||ctx.v===aliveSeats(d)[0])){act(bjNewRound(d));return;}
    if(!ctx.my||d.ph!=='play')return;if(['hit','stand','dbl','split'].includes(a))act(bjAct(d,a));}
};

/* ---------- colours and numbers (shedding card game) ---------- */
const UC={r:'#E5483F',g:'#3FAE5C',b:'#3D8FD8',y:'#F0B429',k:'#2D4763'},UCN={r:'الأحمر',g:'الأخضر',b:'الأزرق',y:'الأصفر'};
function unoDeck(){const a=[];for(const c of 'rgby'){a.push(c+'0');for(const v of '123456789SRD')a.push(c+v,c+v);}for(let k=0;k<4;k++)a.push('kW','kF');return shuffle(a);}
const uLabel=v=>({S:'⊘',R:'⇄',D:'<span class="ltr">+2</span>',W:'🎨',F:'<span class="ltr">+4</span>'})[v]||v;
const uCard=(c,cls,attrs)=>`<${attrs?'button':'div'} class="card ${cls||''}" style="background:${UC[c[0]]};color:#fff;font-size:${c[1].length>1||'DF'.includes(c[1])?18:24}px" ${attrs||''}>${uLabel(c[1])}</${attrs?'button':'div'}>`;
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
    let i=a.findIndex(c=>/[0-9]/.test(c[1]));const top=a.splice(i,1)[0];return {hands,draw:a.join(''),disc:top,color:top[0],dir:1,drew:false,uno:-1,last:''};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>اللون الحالي: <b style="color:${UC[d.color]}">${UCN[d.color]}</b>، والدور ${d.dir>0?'⟲':'⟳'}</small>`,
  render(d,ctx){
    const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;const top=d.disc.slice(-2);
    let s='';
    s+=`<div class="row" style="align-items:center">${uCard(top,'big')}<div class="card big back"></div></div>`;
    if(v<0)return s;
    const my=ctx.my&&d.turn===v;const hand=cardsOf(d.hands[v]);
    if(my&&S.wild!=null&&(hand[S.wild]||'')[0]==='k')s+=`<p class="lbl" style="text-align:center">اختر اللون</p><div class="row">${'rgby'.split('').map((c,k)=>`<button class="btn swatch" style="background:${UC[c]}" data-ga="wc" data-i="${k}"></button>`).join('')}</div>`;
    if(d.uno>=0&&d.win==null&&(ctx.local||ctx.v!==d.uno))s+=`<div class="row"><button class="btn red" data-ga="catch">${nm(d,d.uno)} ما قال أونو! امسكه (+2)</button></div>`;
    s+=`<p class="lbl" style="text-align:center">أوراقك</p><div class="hand">${hand.map((c,i)=>my&&uPlayable(c,d,hand)?uCard(c,'pick',`data-ga="play" data-i="${i}"`):uCard(c,my?'dim':'')).join('')}</div>`;
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
    S.wild=null;const said=S.unoSaid===d.gid+':'+d.disc.length;const hand=cardsOf(d.hands[t]);const c=hand.splice(idx,1)[0];let nd={...d,hands:[...d.hands],disc:d.disc+c,color:color||c[0],drew:false,uno:hand.length===1&&!said?t:-1};nd.hands[t]=hand.join('');
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

/* ---------- dominoes ---------- */
const DOMH={2:7,3:6,4:6,5:4,6:4,7:3,8:3};
const PIP={0:[],1:[[10,10]],2:[[5,5],[15,15]],3:[[5,5],[10,10],[15,15]],4:[[5,5],[15,5],[5,15],[15,15]],5:[[5,5],[15,5],[10,10],[5,15],[15,15]],6:[[5,4],[15,4],[5,10],[15,10],[5,16],[15,16]]};
const half=(n,x)=>PIP[n].map(([a,b])=>`<circle cx="${a+x}" cy="${b}" r="1.9" fill="#2D4763"/>`).join('');
const domSVG=(t,w)=>`<svg viewBox="0 0 40 20" width="${w||52}"><line x1="20" y1="3" x2="20" y2="17" stroke="#2D4763" stroke-width="1"/>${half(+t[0],0)}${half(+t[1],20)}</svg>`;
const halfV=(n,y)=>PIP[n].map(([a,b])=>`<circle cx="${a}" cy="${b+y}" r="1.9" fill="#2D4763"/>`).join('');
const domV=(t,h)=>`<svg viewBox="0 0 20 40" height="${h||84}"><line x1="3" y1="20" x2="17" y2="20" stroke="#2D4763" stroke-width="1"/>${halfV(+t[0],0)}${halfV(+t[1],20)}</svg>`;
function domEnds(d){if(!d.ch)return null;return [d.ch[0],d.ch[d.ch.length-1]];}
const domFits=(t,d)=>{const e=domEnds(d);if(!e)return [true,true];return [t.includes(e[0]),t.includes(e[1])];};
GAMES.domino={name:'دومينو',cat:'cards',lbc:'#5B4636',hide:{seat:['hands'],all:['bone']},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A5C45"/><g transform="rotate(-20 50 50)"><rect x="18" y="36" width="64" height="32" rx="6" fill="#fff" stroke="#2D4763" stroke-width="3"/><line x1="50" y1="40" x2="50" y2="64" stroke="#2D4763" stroke-width="2.5"/>${[[28,44],[40,60],[34,52]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#2D4763"/>`).join('')}${[[60,44],[72,44],[60,60],[72,60]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#2D4763"/>`).join('')}</g></svg>`,
  init:n=>{const all=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)all.push(''+a+b);const s=shuffle(all);const k=DOMH[n]||3;const hands=[];for(let p=0;p<n;p++)hands.push(s.slice(p*k,p*k+k).join(''));
    return {hands,bone:s.slice(n*k).join(''),ch:'',pass:0,last:''};},
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
    const e=domEnds(d);s+=`<div class="table">${ch.length?`<div class="chain">${ch.map((t,i)=>`<span class="dom ${i===0||i===ch.length-1?'end':''}">${t[0]===t[1]?domV(t,54):domSVG(t,56)}</span>`).join('')}</div><div class="ends" style="direction:ltr"><span>اليسار: <b>${e[0]}</b></span><span>اليمين: <b>${e[1]}</b></span></div>`:'<p class="note" style="margin:24px 0">أول قطعة تفتح اللعب</p>'}<span class="bone">المخزن ${d.bone.length/2}</span></div>`;
    if(v<0)return s;const my=ctx.my&&d.turn===v;const hand=d.hands[v].match(/.{2}/g)||[];
    const any=hand.some(t=>domFits(t,d).some(x=>x));
    if(my&&S.dside!=null&&e)s+=`<div class="acts" style="direction:ltr"><button class="btn navy" data-ga="L" data-i="${S.dside}">⬅ على طرف ${e[0]}</button><button class="btn navy" data-ga="R" data-i="${S.dside}">على طرف ${e[1]} ➡</button></div>`;
    s+=`<p class="lbl" style="text-align:center">قطعك</p><div class="hand">${hand.map((t,i)=>{const f=domFits(t,d).some(x=>x);return my&&f?`<button class="dom pick" data-ga="play" data-i="${i}">${domV(t)}</button>`:`<span class="dom ${my?'dim':''}">${domV(t)}</span>`;}).join('')}</div>`;
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
    act({...d,hands,ch,pass:0,turn:nextSeat(d,t),win:hand.length?null:t,last:`${nm(d,t)} نزّل ${tile[0]}|${tile[1]}`});
  }
};

/* ---------- bingo ---------- */
function seedOf(str){let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
// each seat's card comes from its own random seed (d.bs), hidden online; old states without bs fall back to gid and role
function bingoCard(d,s){const R=mulberry(seedOf(d.bs?d.bs[s]:d.gid+':'+d.pl[s]));const a=[...Array(25).keys()].map(x=>x+1);for(let i=24;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const BLINES=(()=>{const L=[];for(let k=0;k<5;k++){L.push([0,1,2,3,4].map(c=>k*5+c));L.push([0,1,2,3,4].map(r=>r*5+k));}L.push([0,6,12,18,24]);L.push([4,8,12,16,20]);return L;})();
const bingoLines=(card,called)=>BLINES.filter(L=>L.every(i=>called[card[i]-1]==='1')).length;
GAMES.bingo={name:'بنقو',cat:'cards',lbc:'#B5486E',onTimeout:d=>({...d,turn:nextSeat(d,d.turn)}),hide:{seat:['bs']},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D45D87"/>${[0,1,2,3,4].map(r=>[0,1,2,3,4].map(c=>`<rect x="${12+c*16}" y="${12+r*16}" width="14" height="14" rx="3" fill="${(r===c)?'#ffd84d':'#fff'}"/>`).join('')).join('')}<path d="M14 14L86 86" stroke="#2D4763" stroke-width="4" stroke-linecap="round"/></svg>`,
  // ln: lines each seat has made, kept in the state so the scores show without the hidden cards
  init:n=>({called:'0'.repeat(25),bs:Array(n).fill(0).map(()=>rid()+rid()),ln:Array(n).fill(0),last:''}),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((r,s)=>(d.ln?d.ln[s]:bingoLines(bingoCard(d,s),d.called))+'/5'),status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;if(v<0)return '';
    const card=bingoCard(d,v);const lines=BLINES.filter(L=>L.every(i=>d.called[card[i]-1]==='1')).flat();
    const ln=bingoLines(card,d.called);return `<div class="bprog"><div><i style="width:${ln*20}%;background:${col(d,v)}"></i></div></div>
    <div class="cellgrid" style="grid-template-columns:repeat(5,minmax(0,1fr));background:${col(d,v)};max-width:360px">${card.map((n,i)=>{const c=d.called[n-1]==='1';
      return c?`<div class="cg" style="background:${lines.includes(i)?'#ffd84d':lit(d,v)};text-decoration:line-through;font-size:22px">${n}</div>`:`<button class="cg" style="font-size:22px" data-ga="m" data-i="${n}" ${ctx.my?'':'disabled'}>${n}</button>`;}).join('')}</div>`;},
  click(a,n,d,ctx){
    if(!ctx.my||!(n>=1&&n<=25)||d.called[n-1]==='1')return;const t=d.turn;const called=setAt(d.called,n-1,'1');
    const ln=d.pl.map((r,s)=>bingoLines(bingoCard(d,s),called));
    const done=d.pl.map((r,s)=>d.out[s]!=='1'&&ln[s]>=5?s:-1).filter(s=>s>=0);
    let win=null;if(done.length)win=done.includes(t)?t:done.length===1?done[0]:'d';
    act({...d,called,ln,win,turn:nextSeat(d,t),last:`${nm(d,t)} اختار ${n}`});
  }
};

/* ---------- risky dice ---------- */
GAMES.pig={points:d=>d.sc,name:'زهر المخاطرة',cat:'cards',lbc:'#A0522D',onTimeout:d=>({...d,tot:0,dice:0,turn:nextSeat(d,d.turn)}),
  // the turn total of a player who leaves goes with them
  onSkip:(nd,d)=>nd.turn!==d.turn?{...nd,tot:0,dice:0}:nd,
  icon:iconE('#D7774A','🎲'),
  init:n=>({sc:Array(n).fill(0),tot:0,dice:0,goal:100,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const anim=S.rolled;S.rolled=false;
    return `<div class="row" style="align-items:center;gap:22px">${tapDie(d.dice,ctx.my&&d.win==null,col(d,d.turn),anim?'roll':'')}<div style="text-align:center"><div class="lbl" style="margin:0">جمع الدور</div><div class="big-num" style="color:${col(d,d.turn)}">${d.tot}</div></div></div>
    <div class="acts"><button class="btn navy" data-ga="hold" ${ctx.my&&d.tot>0?'':'disabled'}>احفظ النقاط${d.tot?` (${d.tot})`:''}</button></div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='roll'){const r=1+rnd(6);S.rolled=true;
      if(r===1){act({...d,dice:1,tot:0,turn:nextSeat(d,t),last:`${nm(d,t)} طلع له 1 وراح جمع الدور`});return;}
      act({...d,dice:r,tot:d.tot+r,last:''});return;}
    if(d.tot<=0)return;const sc=[...d.sc];sc[t]+=d.tot;
    act({...d,sc,tot:0,dice:0,win:sc[t]>=d.goal?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} حفظ ${d.tot}`});
  }
};

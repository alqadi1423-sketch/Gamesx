'use strict';
/* n-cards2b: Arab fishing, shedding and rummy card games: باصرة، شكبة، الثمانيات، الكذاب، واحد وثلاثين، الرئيس والوزير، كونكان.
   Uses the shared helpers of n-cards2.js (c2Card, c2Hide, c2Sel…). Online every seat sees only its own hand; the pack is hidden. */

/* ---------- shared: sides (who scores together), the pack, the deal ---------- */
// a side: the engine's teams when on, else partners across a table of four in the fishing games, else every seat alone
const fsSide=(d,s)=>d.tm?d.tm[s]:d.pairs?s%2:s;
const fsSides=d=>[...new Set(d.pl.map((_,s)=>fsSide(d,s)))];
const fsSideName=(d,t)=>d.pl.map((_,s)=>s).filter(s=>fsSide(d,s)===t).map(s=>nameTag(d,s)).join(' و');
function fsWinSide(d,t){const ws=d.pl.map((_,s)=>s).filter(s=>fsSide(d,s)===t&&d.out[s]!=='1');const all=ws.length?ws:d.pl.map((_,s)=>s).filter(s=>fsSide(d,s)===t);return {...d,win:all[0],wins:all,...(d.tm?{}:{})};}
// hands are hidden from other seats online, the stock from everybody
function shMask(d,v){if(!d||d.win!=null||!Array.isArray(d.hands))return d;const o={...d,hands:d.hands.map((x,s)=>s===v?x:c2Hide(x))};
  if(typeof d.dk==='string')o.dk=c2Hide(d.dk);if(typeof d.pile==='string')o.pile=c2Hide(d.pile);return o;}
// deal k cards to every seat still in, from the seat after the dealer; when the stock runs short the rest goes round one by one
function fsDealRound(d,k){let dk=d.dk;const hands=[...d.hands],n=d.pl.length,al=d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1');
  const ord=[...Array(n)].map((_,j)=>(d.dl+1+j)%n).filter(s=>al.includes(s));const need=k*ord.length;
  if(dk.length/2>=need){for(const s of ord){hands[s]=dk.slice(0,k*2);dk=dk.slice(k*2);}}
  else{for(const s of ord)hands[s]='';let j=0;while(dk.length){hands[ord[j%ord.length]]+=dk.slice(0,2);dk=dk.slice(2);j++;}}
  return {...d,hands,dk};}

/* =================================================================
   باصرة (Egyptian basra): 4 cards each and 4 on the floor (no jack or 7♦ there), then 4 more each until the pack is out.
   A numeral takes the floor cards of its rank and every group that adds up to it (ace 1); a queen takes queens, a king kings;
   a jack takes the whole floor; the 7♦ (الكومي) takes the whole floor too. Clearing the floor is a basra (+10), except with a
   jack, with the 7♦ when the floor held a picture or more than 10, and with the last card of the deal. Leftovers go to the
   last taker. Score: most cards 30 (a tie carries it on), each jack and ace 1, 2♣ 2, 10♦ 3, each basra 10. 101 wins.
   ================================================================= */
const bsVal=c=>c[0]==='A'?1:c[0]==='T'?10:'JQK'.includes(c[0])?0:+c[0];
const bsPts=c=>(c[0]==='J'||c[0]==='A'?1:0)+(c==='2c'?2:0)+(c==='Td'?3:0);
// the biggest set of disjoint groups of floor numerals that each make v (a lone card of rank v is such a group)
function bsSets(fl,v){const nums=fl.filter(c=>bsVal(c)>0&&c[0]!=='J'),subs=[];const N=nums.length;
  for(let m=1;m<(1<<N)&&N<=14;m++){let s=0;for(let i=0;i<N;i++)if(m&(1<<i))s+=bsVal(nums[i]);if(s===v)subs.push(m);}
  let best=0,bv=-1,nodes=0;const go=(i,used,cnt,pts)=>{if(++nodes>20000)return;const sc=cnt*10+pts;if(sc>bv){bv=sc;best=used;}
    for(let j=i;j<subs.length;j++){if(subs[j]&used)continue;let c=0,p=0;for(let k=0;k<N;k++)if(subs[j]&(1<<k)){c++;p+=bsPts(nums[k]);}go(j+1,used|subs[j],cnt+c,pts+p);}};
  go(0,0,0,0);return nums.filter((_,k)=>best&(1<<k));}
// what card c takes from floor fl, and whether it is a basra
function bsTake(fl,c,lastCard){if(!fl.length)return {cap:[],b:false};
  if(c[0]==='J')return {cap:[...fl],b:false};
  if(c==='7d'){const allNum=fl.every(x=>bsVal(x)>0),tot=fl.reduce((a,x)=>a+bsVal(x),0);return {cap:[...fl],b:!lastCard&&allNum&&tot<=10};}
  let cap;if('QK'.includes(c[0]))cap=fl.filter(x=>x[0]===c[0]);else cap=bsSets(fl,bsVal(c));
  return {cap,b:!!cap.length&&cap.length===fl.length&&!lastCard};}
function bsNewDeal(d){let dk=shuffle(c2Deck()).join('');let fl=[];
  while(fl.length<4){const c=dk.slice(0,2);dk=dk.slice(2);if(c[0]==='J'||c==='7d'){const at=2*(4+rnd(dk.length/2-4));dk=dk.slice(0,at)+c+dk.slice(at);}else fl.push(c);}
  const nd=fsDealRound({...d,dk,fl:fl.join(''),caps:fsSides(d).map(()=>''),bas:fsSides(d).map(()=>0),lc:-1,lm:null,sum:null,ph:'play'},4);
  const st=nextSeat(nd,nd.dl);return {...nd,turn:st};}
const bsIdx=(d,t)=>fsSides(d).indexOf(t);
function bsPlay(d,c){const s=d.turn,hands=[...d.hands];hands[s]=c2Rm(hands[s],c);const fl=cardsOf(d.fl);
  const lastCard=!d.dk.length&&hands.every(h=>!h.length);const {cap,b}=bsTake(fl,c,lastCard);
  let nd={...d,hands,lm:{s,c,cap,b}};const t=bsIdx(d,fsSide(d,s));
  if(cap.length){const caps=[...d.caps],bas=[...d.bas];caps[t]+=c+cap.join('');if(b)bas[t]++;let rest=fl;for(const x of cap)rest=cardsOf(c2Rm(rest.join(''),x));
    nd={...nd,caps,bas,fl:rest.join(''),lc:s,last:`${nameTag(d,s)} أكل ${cap.length} ${b?'وصارت باصرة! 🎉':''}`};}
  else nd={...nd,fl:d.fl+c,last:`${nameTag(d,s)} نزّل ورقة`};
  if(hands.some((h,k)=>h.length&&d.out[k]!=='1'))return {...nd,turn:nextSeat(nd,s)};
  if(nd.dk.length){const x=fsDealRound(nd,4);return {...x,turn:nextSeat(x,s)};}
  return bsScore(nd);}
function bsScore(d){const sides=fsSides(d),caps=[...d.caps];if(d.fl&&d.lc>=0){caps[bsIdx(d,fsSide(d,d.lc))]+=d.fl;}
  const cnt=caps.map(x=>cardsOf(x).length),mx=Math.max(...cnt),top=cnt.filter(x=>x===mx).length===1?cnt.indexOf(mx):-1;
  const add=sides.map((_,i)=>cardsOf(caps[i]).reduce((a,c)=>a+bsPts(c),0)+d.bas[i]*10+(i===top?30+(d.carry||0):0));
  const sc=d.sc.map((x,i)=>x+add[i]);const nd={...d,caps,fl:'',sc,carry:top<0?(d.carry||0)+30:0,ph:'sum',sum:{add,cnt,top},turn:nextSeat(d,d.dl),last:'انتهت الجولة'};
  const hi=Math.max(...sc);if(hi>=101&&sc.filter(x=>x===hi).length===1)return fsWinSide(nd,sides[sc.indexOf(hi)]);
  return nd;}
const bsNext=d=>({...bsNewDeal({...d,dl:nextSeat(d,d.dl)}),last:''});
// the floor, the last move (the card played and what it took) and every side's pile
function fsFloor(d,v,o){const lm=d.lm,fl=cardsOf(d.fl);
  let h=`<div class="fs-floor">${lm?`<div class="fs-play" data-k="lm${d.dk.length}-${fl.length}-${lm.c}"><span>${nameTag(d,lm.s)}</span>${c2Mini(lm.c)}${lm.cap.length?`← ${lm.cap.map(c2Mini).join('')}`:''}</div>`:''}`;
  h+=fl.length?fl.map(c=>`<div class="fsc ${o&&o.hl&&o.hl.includes(c)?'tk':''}" data-k="f${c}">${c2Card(c)}</div>`).join(''):'<p class="note">الأرض فاضية</p>';
  if(lm&&lm.b)h+=`<div class="fs-basra" data-k="b${d.dk.length}${lm.c}"><b>${o&&o.bw||'باصرة!'}</b></div>`;
  return h+'</div>';}
function fsPiles(d,o){return `<div class="fs-piles">${fsSides(d).map((t,i)=>{const ss=d.pl.map((_,s)=>s).filter(s=>fsSide(d,s)===t);
  return `<span class="fs-pile ${ss.includes(d.turn)&&d.ph==='play'?'on':''}" style="--c:${col(d,ss[0])}"><i>${cardsOf(d.caps[i]).length}</i>${ss.map(s=>nm(d,s)).join(' و')}${d.bas[i]?` <u>${o.bn} ×${d.bas[i]}</u>`:''}<em>${d.sc[i]}</em></span>`;}).join('')}</div>`;}
function fsHand(d,v,can,sel){const hc=cardsOf(d.hands[v]||'');const ids=handIds(hc,'fs'+v+'-');
  return `<div class="bhand c2hand">${hc.map((c,i)=>can?`<button class="bcard ${sel===c?'sel':''}" id="${ids[i]}" data-ga="card" data-i="${i}">${c2Card(c)}</button>`:`<button class="bcard" id="${ids[i]}" disabled>${c2Card(c)}</button>`).join('')}</div>`;}
const fsInit=(n,extra)=>({pairs:n===4,dl:n-1,hands:Array(n).fill(''),sc:[],carry:0,last:'',...extra});
const fsStart=deal=>(d,base)=>{const x={...d,pairs:!d.tm&&d.pl.length===4};const k=fsSides(x).length;return deal({...x,sc:Array(k).fill(0)});};
const fsPoints=d=>d.pl.map((_,s)=>d.sc[fsSides(d).indexOf(fsSide(d,s))]??0);
GAMES.c_basra={name:'باصرة',cat:'cards',lbc:'#1F7A4D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1F7A4D"/><ellipse cx="50" cy="56" rx="42" ry="32" fill="#27925D"/><g transform="rotate(-10 30 56)"><rect x="14" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="29" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#D43C33">7♦</text></g><g transform="rotate(8 70 56)"><rect x="56" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="71" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#2D4763">J♣</text></g><rect x="30" y="10" width="40" height="18" rx="9" fill="#F0B429"/><text x="50" y="24" font-size="12" font-weight="900" text-anchor="middle" fill="#1F5E3C">+10</text></svg>`,
  init:n=>fsInit(n,{dk:'',fl:'',caps:[],bas:[],lm:null,lc:-1,ph:'play'}),
  start:fsStart(bsNewDeal),
  mask:shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...bsNewDeal({...d,carry:d.carry}),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:fsPoints,
  winText:d=>d.win!=null?`فاز ${fsSideName(d,fsSide(d,d.win))} بـ${d.sc[bsIdx(d,fsSide(d,d.win))]} نقطة`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;const s=d.turn;if(nd.out[s]==='1'&&nd.hands[s]){const hands=[...nd.hands];const fl=nd.fl+hands[s];hands[s]='';
      const x={...nd,hands,fl};if(!hands.some((h,k)=>h.length&&x.out[k]!=='1'))return x.dk.length?{...fsDealRound(x,4),turn:nextSeat(x,s)}:bsScore(x);return {...x,turn:nextSeat(x,s)};}return nd;},
  onTimeout(d){if(d.ph==='sum')return bsNext(d);const H=cardsOf(d.hands[d.turn]);return bsPlay(d,H[rnd(H.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+(me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`)+` <small>• باقي في الكوتشينة ${d.dk.length/2}</small>`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v;let h=`<div class="c2">${fsFloor(d,v,{bw:'باصرة! +10'})}${fsPiles(d,{bn:'باصرة'})}`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>نتيجة الجولة</h3>${fsSides(d).map((t,i)=>`<div class="bsr"><span>${fsSideName(d,t)}</span><em>${r.cnt[i]} ورقة${i===r.top?' 🏆':''}</em><b>+${r.add[i]} → ${d.sc[i]}</b></div>`).join('')}
      ${r.top<0?'<p class="note">تعادلتوا بعدد الورق: الـ30 تنتقل للجولة الجاية</p>':''}${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    if(v>=0&&d.hands[v]!=null)h+=fsHand(d,v,ctx.my&&d.turn===v);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(bsNext(d));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.turn])[i];if(c)act(bsPlay(d,c));}}};
HELP.c_basra='الباصرة المصرية. كل لاعب ياخذ 4 أوراق وتنحط 4 مكشوفة في الأرض (ما يكون فيها ولد ولا سبعة ديناري)، ولما تخلص الأوراق يتوزع 4 ثانية لين تخلص الكوتشينة. في دورك تنزل ورقة: الرقم ياكل من الأرض كل ورقة بنفس رقمه وكل مجموعة مجموعها رقمه (الإكة بواحد)، والبنت تاكل البنات بس، والشايب ياكل الشياب بس. الولد ياكل كل الأرض، والسبعة الديناري (الكومي) بعد تاكل كل الأرض. إذا كنست الأرض كلها بورقة تصير «باصرة» وتاخذ 10، إلا بالولد، وبالكومي إذا كان في الأرض صورة أو المجموع فوق 10، وبآخر ورقة بالجولة. اللي يبقى في الأرض بالآخر ياخذه آخر واحد أكل. النقاط: أكثر ورق 30 (ولو تعادل تنتقل للجولة الجاية)، كل ولد وكل إكة نقطة، الاثنين السباتي 2، العشرة الديناري 3، وكل باصرة 10. أول من يوصل 101 يفوز. مع 4 لاعبين: كل اثنين متقابلين فريق. ومع 5 لاعبين وأكثر: آخر توزيعة تنقسم واحدة واحدة لين تخلص.';
// the bot: takes the most (and the richest) it can, aims at basras, keeps the jack and the 7♦ for a full floor, and never leaves
// a floor the next player can sweep with one card when it can help it
GAMES.c_basra.bot=(d,s,lv)=>{if(d.ph==='sum')return bsNext(d);const H=cardsOf(d.hands[s]),fl=cardsOf(d.fl);
  if(lv===1&&Math.random()<.45)return bsPlay(d,H[rnd(H.length)]);
  const seen=new Set([...H,...fl]);const last=!d.dk.length&&d.hands.every((h,k)=>k===s||!h.length)&&H.length===1;
  const sc=c=>{const {cap,b}=bsTake(fl,c,last);let v=cap.length*2+cap.reduce((a,x)=>a+bsPts(x),0)*4+(cap.length?bsPts(c)*4:0)+(b?40:0);
    let rest=fl;for(const x of cap)rest=cardsOf(c2Rm(rest.join(''),x));if(!cap.length)rest=[...fl,c];
    if((c[0]==='J'||c==='7d')&&fl.length<3&&!b)v-=8;
    if(!cap.length)v-=bsPts(c)*5+(c[0]==='J'||c==='7d'?12:0);
    if(lv>=2&&rest.length){const tot=rest.reduce((a,x)=>a+bsVal(x),0),one=rest.length===1||(rest.every(x=>bsVal(x)>0)&&tot<=10);if(one)v-=lv===3?14:8;
      v-=rest.reduce((a,x)=>a+bsPts(x),0)*1.5;}
    return v+(lv===2?Math.random()*2:0);};
  return bsPlay(d,H.slice().sort((a,b)=>sc(b)-sc(a))[0]);};
GAMES.c_basra.botDelay=(d,s,lv)=>d.ph==='sum'?7000:900+rnd(700);

/* =================================================================
   شكبة (chkobba, the Levant and North Africa scopa): 40 cards (no 8, 9, 10); K 10, J 9, Q 8, ace 1. Three each and four on
   the table (a redeal when three of one value show), then three more each. A card that equals a table card must take one
   (you choose which); else it must take a group that adds up to it (you choose); else it stays. Clearing the table is a
   chkobba (+1), not with the very last card. Points: most cards (الكارطة) 1, most diamonds (الديناري) 1, most sevens, then
   sixes (البرميلة) 1, the 7♦ (السبعة الحية) 1, each chkobba 1. First to 21 wins.
   ================================================================= */
const SKR='A234567QJK',skVal=c=>({A:1,Q:8,J:9,K:10})[c[0]]||+c[0];
const skDeck=()=>{const a=[];for(const s of 'shdc')for(const r of SKR)a.push(r+s);return a;};
// every legal capture of card c: the single cards of its value, else the groups that add up to it
function skOpts(fl,c){const v=skVal(c),one=fl.filter(x=>skVal(x)===v);if(one.length)return one.map(x=>[x]);
  const N=fl.length,o=[];for(let m=1;m<(1<<N)&&N<=14;m++){let s=0,k=0;for(let i=0;i<N;i++)if(m&(1<<i)){s+=skVal(fl[i]);k++;}if(s===v&&k>=2)o.push(fl.filter((_,i)=>m&(1<<i)));}return o;}
function skNewDeal(d){let dk,fl;for(let g=0;g<50;g++){const a=shuffle(skDeck());fl=a.slice(0,4);dk=a.slice(4).join('');const cnt={};fl.forEach(c=>cnt[skVal(c)]=(cnt[skVal(c)]||0)+1);if(Math.max(...Object.values(cnt))<3)break;}
  const nd=fsDealRound({...d,dk,fl:fl.join(''),caps:fsSides(d).map(()=>''),bas:fsSides(d).map(()=>0),lc:-1,lm:null,sum:null,ph:'play'},3);return {...nd,turn:nextSeat(nd,nd.dl)};}
function skPlay(d,c,cap){const s=d.turn,hands=[...d.hands];hands[s]=c2Rm(hands[s],c);const fl=cardsOf(d.fl);
  const lastCard=!d.dk.length&&hands.every(h=>!h.length);const t=bsIdx(d,fsSide(d,s));let nd={...d,hands};
  if(cap&&cap.length){let rest=fl;for(const x of cap)rest=cardsOf(c2Rm(rest.join(''),x));const b=!rest.length&&!lastCard;const caps=[...d.caps],bas=[...d.bas];caps[t]+=c+cap.join('');if(b)bas[t]++;
    nd={...nd,caps,bas,fl:rest.join(''),lc:s,lm:{s,c,cap,b},last:`${nameTag(d,s)} أكل ${cap.length}${b?' وصارت شكبة! 🎉':''}`};}
  else nd={...nd,fl:d.fl+c,lm:{s,c,cap:[],b:false},last:`${nameTag(d,s)} نزّل ورقة`};
  if(hands.some((h,k)=>h.length&&d.out[k]!=='1'))return {...nd,turn:nextSeat(nd,s)};
  if(nd.dk.length){const x=fsDealRound(nd,3);return {...x,turn:nextSeat(x,s)};}
  return skScore(nd);}
function skScore(d){const sides=fsSides(d),caps=[...d.caps];if(d.fl&&d.lc>=0)caps[bsIdx(d,fsSide(d,d.lc))]+=d.fl;
  const C=caps.map(x=>cardsOf(x)),uniq=a=>{const m=Math.max(...a);return a.filter(x=>x===m).length===1?a.indexOf(m):-1;};
  const kar=uniq(C.map(x=>x.length)),din=uniq(C.map(x=>x.filter(c=>c[1]==='d').length));
  let bar=-1;{const s7=C.map(x=>x.filter(c=>c[0]==='7').length),m=Math.max(...s7),t=s7.map((x,i)=>x===m?i:-1).filter(i=>i>=0);
    if(t.length===1)bar=t[0];else{const s6=t.map(i=>C[i].filter(c=>c[0]==='6').length),m6=Math.max(...s6);if(s6.filter(x=>x===m6).length===1)bar=t[s6.indexOf(m6)];}}
  const hay=C.findIndex(x=>x.includes('7d'));
  const add=sides.map((_,i)=>(i===kar)+(i===din)+(i===bar)+(i===hay)+d.bas[i]);
  const sc=d.sc.map((x,i)=>x+add[i]);const nd={...d,caps,fl:'',sc,ph:'sum',sum:{add,kar,din,bar,hay,cnt:C.map(x=>x.length)},turn:nextSeat(d,d.dl),last:'انتهت الجولة'};
  const hi=Math.max(...sc);if(hi>=21&&sc.filter(x=>x===hi).length===1)return fsWinSide(nd,sides[sc.indexOf(hi)]);
  return nd;}
const skNext=d=>({...skNewDeal({...d,dl:nextSeat(d,d.dl)}),last:''});
const skSelKey=d=>'sk:'+d.gid+':'+d.dk.length+':'+d.fl+':'+d.turn;
GAMES.c_shakba={name:'شكبة',cat:'cards',lbc:'#A0522D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#A0522D"/><ellipse cx="50" cy="56" rx="42" ry="32" fill="#B5643A"/><g transform="rotate(-12 34 56)"><rect x="18" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="33" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#D43C33">7♦</text></g><g transform="rotate(10 66 56)"><rect x="52" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="67" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#2D4763">K♠</text></g><path d="M22 22h56" stroke="#F0B429" stroke-width="6" stroke-linecap="round"/><path d="M30 14l-8 8 8 8M70 14l8 8-8 8" stroke="#F0B429" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  init:n=>fsInit(n,{dk:'',fl:'',caps:[],bas:[],lm:null,lc:-1,ph:'play'}),
  start:fsStart(skNewDeal),
  mask:shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...skNewDeal(d),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:fsPoints,
  winText:d=>d.win!=null?`فاز ${fsSideName(d,fsSide(d,d.win))} بـ${d.sc[bsIdx(d,fsSide(d,d.win))]} نقطة`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;const s=d.turn;if(nd.out[s]==='1'&&nd.hands[s]){const hands=[...nd.hands];const fl=nd.fl+hands[s];hands[s]='';
      const x={...nd,hands,fl};if(!hands.some((h,k)=>h.length&&x.out[k]!=='1'))return x.dk.length?{...fsDealRound(x,3),turn:nextSeat(x,s)}:skScore(x);return {...x,turn:nextSeat(x,s)};}return nd;},
  onTimeout(d){if(d.ph==='sum')return skNext(d);const H=cardsOf(d.hands[d.turn]),c=H[rnd(H.length)],o=skOpts(cardsOf(d.fl),c);return skPlay(d,c,o[0]||null);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+(me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`)+` <small>• باقي ${d.dk.length/2}</small>`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v;const pend=my&&Array.isArray(S.sel)&&S.sel[0]===skSelKey(d)?S.sel[1]:null;
    const opts=pend?skOpts(cardsOf(d.fl),pend):[];
    let h=`<div class="c2">${fsFloor(d,v,{bw:'شكبة! +1',hl:opts.flat()})}${fsPiles(d,{bn:'شكبة'})}`;
    if(d.ph==='sum'){const r=d.sum,nmS=i=>i<0?'تعادل':fsSideName(d,fsSides(d)[i]);h+=`<div class="panel bsum"><h3>نتيجة الجولة</h3>
      <div class="bsr"><span>الكارطة (أكثر ورق)</span><em>${r.cnt.join(' / ')}</em><b>${nmS(r.kar)}</b></div><div class="bsr"><span>الديناري</span><em></em><b>${nmS(r.din)}</b></div>
      <div class="bsr"><span>البرميلة (السبعات)</span><em></em><b>${nmS(r.bar)}</b></div><div class="bsr"><span>السبعة الحية 7♦</span><em></em><b>${nmS(r.hay)}</b></div>
      ${fsSides(d).map((t,i)=>`<div class="bsr tot"><span>${fsSideName(d,t)}</span><em>+${r.add[i]}</em><b>${d.sc[i]}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    if(pend&&opts.length>1)h+=`<p class="lbl c2lb">وش تاكل بـ ${c2Mini(pend)}؟</p><div class="fs-opts">${opts.map((o,i)=>`<button class="btn navy" data-ga="take" data-i="${i}">${o.map(c2Mini).join('')}</button>`).join('')}<button class="btn" data-ga="take" data-i="-1">رجوع</button></div>`;
    if(v>=0&&d.hands[v]!=null)h+=fsHand(d,v,my,pend);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(skNext(d));return;}if(d.ph!=='play')return;
    if(a==='card'){const c=cardsOf(d.hands[d.turn])[i];if(!c)return;const o=skOpts(cardsOf(d.fl),c);if(o.length>1){S.sel=[skSelKey(d),c];render();return;}S.sel=[];act(skPlay(d,c,o[0]||null));return;}
    if(a==='take'){const c=Array.isArray(S.sel)&&S.sel[0]===skSelKey(d)?S.sel[1]:null;S.sel=[];if(!c||i<0||!cardsOf(d.hands[d.turn]).includes(c)){render();return;}const o=skOpts(cardsOf(d.fl),c)[i];if(!o){render();return;}act(skPlay(d,c,o));}}};
HELP.c_shakba='الشكبة لعبة صيد مثل السكوبا، بـ40 ورقة (بدون 8 و9 و10): الشايب بـ10، الولد بـ9، البنت بـ8، والإكة بواحد. كل لاعب ياخذ 3 أوراق وتنحط 4 مكشوفة في الأرض، ولما تخلص يتوزع 3 ثانية لين تخلص الكوتشينة. في دورك تنزل ورقة: إذا في الأرض ورقة بنفس قيمتها لازم تاكلها (وتختار أي وحدة لو فيه أكثر)، وإذا ما فيه وفيه مجموعة مجموعها نفس قيمتها لازم تاكلها (وتختار المجموعة)، وإذا لا تبقى ورقتك في الأرض. إذا كنست الأرض كلها تصير «شكبة» ونقطة، إلا بآخر ورقة في الجولة. اللي يبقى في الأرض بالآخر ياخذه آخر واحد أكل. النقاط بآخر كل جولة: الكارطة (أكثر ورق) نقطة، الديناري (أكثر ديناري) نقطة، البرميلة (أكثر سبعات، ولو تعادلتوا أكثر ستات) نقطة، السبعة الحية (7 الديناري) نقطة، وكل شكبة نقطة. أول من يوصل 21 يفوز. مع 4 لاعبين: كل اثنين متقابلين فريق.';
GAMES.c_shakba.bot=(d,s,lv)=>{if(d.ph==='sum')return skNext(d);const H=cardsOf(d.hands[s]),fl=cardsOf(d.fl);
  const val=c=>1+(c[1]==='d'?1.2:0)+(c[0]==='7'?2:c[0]==='6'?1:0)+(c==='7d'?5:0);
  let best=null,bv=-1e9;const last=!d.dk.length&&d.hands.every((h,k)=>k===s||!h.length)&&H.length===1;
  const gone=new Set([...H,...fl,...d.caps.flatMap(x=>cardsOf(x))]),un=skDeck().filter(x=>!gone.has(x));
  for(const c of H){const os=skOpts(fl,c);const tries=os.length?os:[null];
    for(const o of tries){let v=0,rest=fl;if(o){v+=val(c)+o.reduce((a,x)=>a+val(x),0);for(const x of o)rest=cardsOf(c2Rm(rest.join(''),x));if(!rest.length&&!last)v+=8;}
      else{rest=[...fl,c];v-=val(c)*.8;}
      if(lv>=2&&rest.length){const tot=rest.reduce((a,x)=>a+skVal(x),0);
        if(tot<=10){const k=un.filter(x=>skVal(x)===tot).length,p=1-Math.pow(1-k/Math.max(1,un.length),3*(lv===3?1:.6));v-=p*(8+rest.reduce((a,x)=>a+val(x),0));}
        if(lv===3)for(const x of rest){const k=un.filter(y=>skVal(y)===skVal(x)).length;v-=val(x)*.5*(1-Math.pow(1-k/Math.max(1,un.length),3));}}
      if(lv===1)v+=Math.random()*6;if(v>bv){bv=v;best=[c,o];}}}
  return skPlay(d,best[0],best[1]);};
GAMES.c_shakba.botDelay=(d,s,lv)=>d.ph==='sum'?7000:900+rnd(700);

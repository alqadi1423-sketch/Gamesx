'use strict';
/* n-cards2b: Arab fishing, shedding and rummy card games: باصرة، شكبة، الثمانيات، الكذاب، واحد وثلاثين، الرئيس والوزير، كونكان.
   Uses the shared helpers of n-cards2.js (c2Card, c2Hide, c2Sel…). Online every seat sees only its own hand; the pack is hidden. */

/* ---------- shared: sides (who scores together), the pack, the deal ---------- */
// a side: the engine's teams when on, else partners across a table of four in the fishing games, else every seat alone
const c2fsSide=(d,s)=>d.tm?d.tm[s]:d.pairs?s%2:s;
const c2fsSides=d=>[...new Set(d.pl.map((_,s)=>c2fsSide(d,s)))];
const c2fsSideName=(d,t)=>d.pl.map((_,s)=>s).filter(s=>c2fsSide(d,s)===t).map(s=>nameTag(d,s)).join(' و');
function c2fsWinSide(d,t){const ws=d.pl.map((_,s)=>s).filter(s=>c2fsSide(d,s)===t&&d.out[s]!=='1');const all=ws.length?ws:d.pl.map((_,s)=>s).filter(s=>c2fsSide(d,s)===t);return {...d,win:all[0],wins:all,...(d.tm?{}:{})};}
// hands are hidden from other seats online, the stock from everybody
function c2shMask(d,v){if(!d||d.win!=null||!Array.isArray(d.hands))return d;const o={...d,hands:d.hands.map((x,s)=>s===v?x:c2Hide(x))};
  if(typeof d.dk==='string')o.dk=c2Hide(d.dk);if(typeof d.pile==='string')o.pile=c2Hide(d.pile);return o;}
// deal k cards to every seat still in, from the seat after the dealer; when the stock runs short the rest goes round one by one
function c2fsDealRound(d,k){let dk=d.dk;const hands=[...d.hands],n=d.pl.length,al=d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1');
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
const c2bsVal=c=>c[0]==='A'?1:c[0]==='T'?10:'JQK'.includes(c[0])?0:+c[0];
const c2bsPts=c=>(c[0]==='J'||c[0]==='A'?1:0)+(c==='2c'?2:0)+(c==='Td'?3:0);
// the biggest set of disjoint groups of floor numerals that each make v (a lone card of rank v is such a group)
function c2bsSets(fl,v){const nums=fl.filter(c=>c2bsVal(c)>0&&c[0]!=='J'),subs=[];const N=nums.length;
  for(let m=1;m<(1<<N)&&N<=14;m++){let s=0;for(let i=0;i<N;i++)if(m&(1<<i))s+=c2bsVal(nums[i]);if(s===v)subs.push(m);}
  let best=0,bv=-1,nodes=0;const go=(i,used,cnt,pts)=>{if(++nodes>20000)return;const sc=cnt*10+pts;if(sc>bv){bv=sc;best=used;}
    for(let j=i;j<subs.length;j++){if(subs[j]&used)continue;let c=0,p=0;for(let k=0;k<N;k++)if(subs[j]&(1<<k)){c++;p+=c2bsPts(nums[k]);}go(j+1,used|subs[j],cnt+c,pts+p);}};
  go(0,0,0,0);return nums.filter((_,k)=>best&(1<<k));}
// what card c takes from floor fl, and whether it is a basra
function c2bsTake(fl,c,lastCard){if(!fl.length)return {cap:[],b:false};
  if(c[0]==='J')return {cap:[...fl],b:false};
  if(c==='7d'){const allNum=fl.every(x=>c2bsVal(x)>0),tot=fl.reduce((a,x)=>a+c2bsVal(x),0);return {cap:[...fl],b:!lastCard&&allNum&&tot<=10};}
  let cap;if('QK'.includes(c[0]))cap=fl.filter(x=>x[0]===c[0]);else cap=c2bsSets(fl,c2bsVal(c));
  return {cap,b:!!cap.length&&cap.length===fl.length&&!lastCard};}
function c2bsNewDeal(d){let dk=shuffle(c2Deck()).join('');let fl=[];
  while(fl.length<4){const c=dk.slice(0,2);dk=dk.slice(2);if(c[0]==='J'||c==='7d'){const at=2*(4+rnd(dk.length/2-4));dk=dk.slice(0,at)+c+dk.slice(at);}else fl.push(c);}
  const nd=c2fsDealRound({...d,dk,fl:fl.join(''),caps:c2fsSides(d).map(()=>''),bas:c2fsSides(d).map(()=>0),lc:-1,lm:null,sum:null,ph:'play'},4);
  const st=nextSeat(nd,nd.dl);return {...nd,turn:st};}
const c2bsIdx=(d,t)=>c2fsSides(d).indexOf(t);
function c2bsPlay(d,c){const s=d.turn,hands=[...d.hands];hands[s]=c2Rm(hands[s],c);const fl=cardsOf(d.fl);
  const lastCard=!d.dk.length&&hands.every(h=>!h.length);const {cap,b}=c2bsTake(fl,c,lastCard);
  let nd={...d,hands,lm:{s,c,cap,b}};const t=c2bsIdx(d,c2fsSide(d,s));
  if(cap.length){const caps=[...d.caps],bas=[...d.bas];caps[t]+=c+cap.join('');if(b)bas[t]++;let rest=fl;for(const x of cap)rest=cardsOf(c2Rm(rest.join(''),x));
    nd={...nd,caps,bas,fl:rest.join(''),lc:s,last:`${nameTag(d,s)} أكل ${cap.length} ${b?'وصارت باصرة! 🎉':''}`};}
  else nd={...nd,fl:d.fl+c,last:`${nameTag(d,s)} نزّل ورقة`};
  if(hands.some((h,k)=>h.length&&d.out[k]!=='1'))return {...nd,turn:nextSeat(nd,s)};
  if(nd.dk.length){const x=c2fsDealRound(nd,4);return {...x,turn:nextSeat(x,s)};}
  return c2bsScore(nd);}
function c2bsScore(d){const sides=c2fsSides(d),caps=[...d.caps];if(d.fl&&d.lc>=0){caps[c2bsIdx(d,c2fsSide(d,d.lc))]+=d.fl;}
  const cnt=caps.map(x=>cardsOf(x).length),mx=Math.max(...cnt),top=cnt.filter(x=>x===mx).length===1?cnt.indexOf(mx):-1;
  const add=sides.map((_,i)=>cardsOf(caps[i]).reduce((a,c)=>a+c2bsPts(c),0)+d.bas[i]*10+(i===top?30+(d.carry||0):0));
  const sc=d.sc.map((x,i)=>x+add[i]);const nd={...d,caps,fl:'',sc,carry:top<0?(d.carry||0)+30:0,ph:'sum',sum:{add,cnt,top},turn:nextSeat(d,d.dl),last:'انتهت الجولة'};
  const hi=Math.max(...sc);if(hi>=101&&sc.filter(x=>x===hi).length===1)return c2fsWinSide(nd,sides[sc.indexOf(hi)]);
  return nd;}
const c2bsNext=d=>({...c2bsNewDeal({...d,dl:nextSeat(d,d.dl)}),last:''});
// the floor, the last move (the card played and what it took) and every side's pile
function c2fsFloor(d,v,o){const lm=d.lm,fl=cardsOf(d.fl);
  let h=`<div class="fs-floor">${lm?`<div class="fs-play" data-k="lm${d.dk.length}-${fl.length}-${lm.c}"><span>${nameTag(d,lm.s)}</span>${c2Mini(lm.c)}${lm.cap.length?`← ${lm.cap.map(c2Mini).join('')}`:''}</div>`:''}`;
  h+=fl.length?fl.map(c=>`<div class="fsc ${o&&o.hl&&o.hl.includes(c)?'tk':''}" data-k="f${c}">${c2Card(c)}</div>`).join(''):'<p class="note">الأرض فاضية</p>';
  if(lm&&lm.b)h+=`<div class="fs-basra" data-k="b${d.dk.length}${lm.c}"><b>${o&&o.bw||'باصرة!'}</b></div>`;
  return h+'</div>';}
function c2fsPiles(d,o){return `<div class="fs-piles">${c2fsSides(d).map((t,i)=>{const ss=d.pl.map((_,s)=>s).filter(s=>c2fsSide(d,s)===t);
  return `<span class="fs-pile ${ss.includes(d.turn)&&d.ph==='play'?'on':''}" style="--c:${col(d,ss[0])}"><i>${cardsOf(d.caps[i]).length}</i>${ss.map(s=>nm(d,s)).join(' و')}${d.bas[i]?` <u>${o.bn} ×${d.bas[i]}</u>`:''}<em>${d.sc[i]}</em></span>`;}).join('')}</div>`;}
function c2fsHand(d,v,can,sel){const hc=cardsOf(d.hands[v]||'');const ids=handIds(hc,'fs'+v+'-');
  return `<div class="bhand c2hand">${hc.map((c,i)=>can?`<button class="bcard ${sel===c?'sel':''}" id="${ids[i]}" data-ga="card" data-i="${i}">${c2Card(c)}</button>`:`<button class="bcard" id="${ids[i]}" disabled>${c2Card(c)}</button>`).join('')}</div>`;}
const c2fsInit=(n,extra)=>({pairs:n===4,dl:n-1,hands:Array(n).fill(''),sc:[],carry:0,last:'',...extra});
const c2fsStart=deal=>(d,base)=>{const x={...d,pairs:!d.tm&&d.pl.length===4};const k=c2fsSides(x).length;return deal({...x,sc:Array(k).fill(0)});};
const c2fsPoints=d=>d.pl.map((_,s)=>d.sc[c2fsSides(d).indexOf(c2fsSide(d,s))]??0);
GAMES.c_basra={name:'باصرة',cat:'cards',lbc:'#1F7A4D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1F7A4D"/><ellipse cx="50" cy="56" rx="42" ry="32" fill="#27925D"/><g transform="rotate(-10 30 56)"><rect x="14" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="29" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#D43C33">7♦</text></g><g transform="rotate(8 70 56)"><rect x="56" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="71" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#2D4763">J♣</text></g><rect x="30" y="10" width="40" height="18" rx="9" fill="#F0B429"/><text x="50" y="24" font-size="12" font-weight="900" text-anchor="middle" fill="#1F5E3C">+10</text></svg>`,
  init:n=>c2fsInit(n,{dk:'',fl:'',caps:[],bas:[],lm:null,lc:-1,ph:'play'}),
  start:c2fsStart(c2bsNewDeal),
  mask:c2shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2bsNewDeal({...d,carry:d.carry}),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:c2fsPoints,
  winText:d=>d.win!=null?`فاز ${c2fsSideName(d,c2fsSide(d,d.win))} بـ${d.sc[c2bsIdx(d,c2fsSide(d,d.win))]} نقطة`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;const s=d.turn;if(nd.out[s]==='1'&&nd.hands[s]){const hands=[...nd.hands];const fl=nd.fl+hands[s];hands[s]='';
      const x={...nd,hands,fl};if(!hands.some((h,k)=>h.length&&x.out[k]!=='1'))return x.dk.length?{...c2fsDealRound(x,4),turn:nextSeat(x,s)}:c2bsScore(x);return {...x,turn:nextSeat(x,s)};}return nd;},
  onTimeout(d){if(d.ph==='sum')return c2bsNext(d);const H=cardsOf(d.hands[d.turn]);return c2bsPlay(d,H[rnd(H.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+(me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`)+` <small>• باقي في الكوتشينة ${d.dk.length/2}</small>`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v;let h=`<div class="c2">${c2fsFloor(d,v,{bw:'باصرة! +10'})}${c2fsPiles(d,{bn:'باصرة'})}`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>نتيجة الجولة</h3>${c2fsSides(d).map((t,i)=>`<div class="bsr"><span>${c2fsSideName(d,t)}</span><em>${r.cnt[i]} ورقة${i===r.top?' 🏆':''}</em><b>+${r.add[i]} → ${d.sc[i]}</b></div>`).join('')}
      ${r.top<0?'<p class="note">تعادلتوا بعدد الورق: الـ30 تنتقل للجولة الجاية</p>':''}${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    if(v>=0&&d.hands[v]!=null)h+=c2fsHand(d,v,ctx.my&&d.turn===v);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2bsNext(d));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.turn])[i];if(c)act(c2bsPlay(d,c));}}};
HELP.c_basra='الباصرة المصرية. كل لاعب ياخذ 4 أوراق وتنحط 4 مكشوفة في الأرض (ما يكون فيها ولد ولا سبعة ديناري)، ولما تخلص الأوراق يتوزع 4 ثانية لين تخلص الكوتشينة. في دورك تنزل ورقة: الرقم ياكل من الأرض كل ورقة بنفس رقمه وكل مجموعة مجموعها رقمه (الإكة بواحد)، والبنت تاكل البنات بس، والشايب ياكل الشياب بس. الولد ياكل كل الأرض، والسبعة الديناري (الكومي) بعد تاكل كل الأرض. إذا كنست الأرض كلها بورقة تصير «باصرة» وتاخذ 10، إلا بالولد، وبالكومي إذا كان في الأرض صورة أو المجموع فوق 10، وبآخر ورقة بالجولة. اللي يبقى في الأرض بالآخر ياخذه آخر واحد أكل. النقاط: أكثر ورق 30 (ولو تعادل تنتقل للجولة الجاية)، كل ولد وكل إكة نقطة، الاثنين السباتي 2، العشرة الديناري 3، وكل باصرة 10. أول من يوصل 101 يفوز. مع 4 لاعبين: كل اثنين متقابلين فريق. ومع 5 لاعبين وأكثر: آخر توزيعة تنقسم واحدة واحدة لين تخلص.';
// the bot: takes the most (and the richest) it can, aims at basras, keeps the jack and the 7♦ for a full floor, and never leaves
// a floor the next player can sweep with one card when it can help it
GAMES.c_basra.bot=(d,s,lv)=>{if(d.ph==='sum')return c2bsNext(d);const H=cardsOf(d.hands[s]),fl=cardsOf(d.fl);
  if(lv===1&&Math.random()<.45)return c2bsPlay(d,H[rnd(H.length)]);
  const seen=new Set([...H,...fl]);const last=!d.dk.length&&d.hands.every((h,k)=>k===s||!h.length)&&H.length===1;
  const sc=c=>{const {cap,b}=c2bsTake(fl,c,last);let v=cap.length*2+cap.reduce((a,x)=>a+c2bsPts(x),0)*4+(cap.length?c2bsPts(c)*4:0)+(b?40:0);
    let rest=fl;for(const x of cap)rest=cardsOf(c2Rm(rest.join(''),x));if(!cap.length)rest=[...fl,c];
    if((c[0]==='J'||c==='7d')&&fl.length<3&&!b)v-=8;
    if(!cap.length)v-=c2bsPts(c)*5+(c[0]==='J'||c==='7d'?12:0);
    if(lv>=2&&rest.length){const tot=rest.reduce((a,x)=>a+c2bsVal(x),0),one=rest.length===1||(rest.every(x=>c2bsVal(x)>0)&&tot<=10);if(one)v-=lv===3?14:8;
      v-=rest.reduce((a,x)=>a+c2bsPts(x),0)*1.5;}
    return v+(lv===2?Math.random()*2:0);};
  return c2bsPlay(d,H.slice().sort((a,b)=>sc(b)-sc(a))[0]);};
GAMES.c_basra.botDelay=(d,s,lv)=>d.ph==='sum'?7000:900+rnd(700);

/* =================================================================
   شكبة (chkobba, the Levant and North Africa scopa): 40 cards (no 8, 9, 10); K 10, J 9, Q 8, ace 1. Three each and four on
   the table (a redeal when three of one value show), then three more each. A card that equals a table card must take one
   (you choose which); else it must take a group that adds up to it (you choose); else it stays. Clearing the table is a
   chkobba (+1), not with the very last card. Points: most cards (الكارطة) 1, most diamonds (الديناري) 1, most sevens, then
   sixes (البرميلة) 1, the 7♦ (السبعة الحية) 1, each chkobba 1. First to 21 wins.
   ================================================================= */
const C2SKR='A234567QJK',skVal=c=>({A:1,Q:8,J:9,K:10})[c[0]]||+c[0];
const c2skDeck=()=>{const a=[];for(const s of 'shdc')for(const r of C2SKR)a.push(r+s);return a;};
// every legal capture of card c: the single cards of its value, else the groups that add up to it
function c2skOpts(fl,c){const v=skVal(c),one=fl.filter(x=>skVal(x)===v);if(one.length)return one.map(x=>[x]);
  const N=fl.length,o=[];for(let m=1;m<(1<<N)&&N<=14;m++){let s=0,k=0;for(let i=0;i<N;i++)if(m&(1<<i)){s+=skVal(fl[i]);k++;}if(s===v&&k>=2)o.push(fl.filter((_,i)=>m&(1<<i)));}return o;}
function c2skNewDeal(d){let dk,fl;for(let g=0;g<50;g++){const a=shuffle(c2skDeck());fl=a.slice(0,4);dk=a.slice(4).join('');const cnt={};fl.forEach(c=>cnt[skVal(c)]=(cnt[skVal(c)]||0)+1);if(Math.max(...Object.values(cnt))<3)break;}
  const nd=c2fsDealRound({...d,dk,fl:fl.join(''),caps:c2fsSides(d).map(()=>''),bas:c2fsSides(d).map(()=>0),lc:-1,lm:null,sum:null,ph:'play'},3);return {...nd,turn:nextSeat(nd,nd.dl)};}
function c2skPlay(d,c,cap){const s=d.turn,hands=[...d.hands];hands[s]=c2Rm(hands[s],c);const fl=cardsOf(d.fl);
  const lastCard=!d.dk.length&&hands.every(h=>!h.length);const t=c2bsIdx(d,c2fsSide(d,s));let nd={...d,hands};
  if(cap&&cap.length){let rest=fl;for(const x of cap)rest=cardsOf(c2Rm(rest.join(''),x));const b=!rest.length&&!lastCard;const caps=[...d.caps],bas=[...d.bas];caps[t]+=c+cap.join('');if(b)bas[t]++;
    nd={...nd,caps,bas,fl:rest.join(''),lc:s,lm:{s,c,cap,b},last:`${nameTag(d,s)} أكل ${cap.length}${b?' وصارت شكبة! 🎉':''}`};}
  else nd={...nd,fl:d.fl+c,lm:{s,c,cap:[],b:false},last:`${nameTag(d,s)} نزّل ورقة`};
  if(hands.some((h,k)=>h.length&&d.out[k]!=='1'))return {...nd,turn:nextSeat(nd,s)};
  if(nd.dk.length){const x=c2fsDealRound(nd,3);return {...x,turn:nextSeat(x,s)};}
  return c2skScore(nd);}
function c2skScore(d){const sides=c2fsSides(d),caps=[...d.caps];if(d.fl&&d.lc>=0)caps[c2bsIdx(d,c2fsSide(d,d.lc))]+=d.fl;
  const C=caps.map(x=>cardsOf(x)),uniq=a=>{const m=Math.max(...a);return a.filter(x=>x===m).length===1?a.indexOf(m):-1;};
  const kar=uniq(C.map(x=>x.length)),din=uniq(C.map(x=>x.filter(c=>c[1]==='d').length));
  let bar=-1;{const s7=C.map(x=>x.filter(c=>c[0]==='7').length),m=Math.max(...s7),t=s7.map((x,i)=>x===m?i:-1).filter(i=>i>=0);
    if(t.length===1)bar=t[0];else{const s6=t.map(i=>C[i].filter(c=>c[0]==='6').length),m6=Math.max(...s6);if(s6.filter(x=>x===m6).length===1)bar=t[s6.indexOf(m6)];}}
  const hay=C.findIndex(x=>x.includes('7d'));
  const add=sides.map((_,i)=>(i===kar)+(i===din)+(i===bar)+(i===hay)+d.bas[i]);
  const sc=d.sc.map((x,i)=>x+add[i]);const nd={...d,caps,fl:'',sc,ph:'sum',sum:{add,kar,din,bar,hay,cnt:C.map(x=>x.length)},turn:nextSeat(d,d.dl),last:'انتهت الجولة'};
  const hi=Math.max(...sc);if(hi>=21&&sc.filter(x=>x===hi).length===1)return c2fsWinSide(nd,sides[sc.indexOf(hi)]);
  return nd;}
const c2skNext=d=>({...c2skNewDeal({...d,dl:nextSeat(d,d.dl)}),last:''});
const c2skSelKey=d=>'sk:'+d.gid+':'+d.dk.length+':'+d.fl+':'+d.turn;
GAMES.c_shakba={name:'شكبة',cat:'cards',lbc:'#A0522D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#A0522D"/><ellipse cx="50" cy="56" rx="42" ry="32" fill="#B5643A"/><g transform="rotate(-12 34 56)"><rect x="18" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="33" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#D43C33">7♦</text></g><g transform="rotate(10 66 56)"><rect x="52" y="34" width="30" height="42" rx="4" fill="#fff"/><text x="67" y="61" font-size="17" font-weight="800" text-anchor="middle" fill="#2D4763">K♠</text></g><path d="M22 22h56" stroke="#F0B429" stroke-width="6" stroke-linecap="round"/><path d="M30 14l-8 8 8 8M70 14l8 8-8 8" stroke="#F0B429" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  init:n=>c2fsInit(n,{dk:'',fl:'',caps:[],bas:[],lm:null,lc:-1,ph:'play'}),
  start:c2fsStart(c2skNewDeal),
  mask:c2shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2skNewDeal(d),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:c2fsPoints,
  winText:d=>d.win!=null?`فاز ${c2fsSideName(d,c2fsSide(d,d.win))} بـ${d.sc[c2bsIdx(d,c2fsSide(d,d.win))]} نقطة`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;const s=d.turn;if(nd.out[s]==='1'&&nd.hands[s]){const hands=[...nd.hands];const fl=nd.fl+hands[s];hands[s]='';
      const x={...nd,hands,fl};if(!hands.some((h,k)=>h.length&&x.out[k]!=='1'))return x.dk.length?{...c2fsDealRound(x,3),turn:nextSeat(x,s)}:c2skScore(x);return {...x,turn:nextSeat(x,s)};}return nd;},
  onTimeout(d){if(d.ph==='sum')return c2skNext(d);const H=cardsOf(d.hands[d.turn]),c=H[rnd(H.length)],o=c2skOpts(cardsOf(d.fl),c);return c2skPlay(d,c,o[0]||null);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+(me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`)+` <small>• باقي ${d.dk.length/2}</small>`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v;const pend=my&&Array.isArray(S.sel)&&S.sel[0]===c2skSelKey(d)?S.sel[1]:null;
    const opts=pend?c2skOpts(cardsOf(d.fl),pend):[];
    let h=`<div class="c2">${c2fsFloor(d,v,{bw:'شكبة! +1',hl:opts.flat()})}${c2fsPiles(d,{bn:'شكبة'})}`;
    if(d.ph==='sum'){const r=d.sum,nmS=i=>i<0?'تعادل':c2fsSideName(d,c2fsSides(d)[i]);h+=`<div class="panel bsum"><h3>نتيجة الجولة</h3>
      <div class="bsr"><span>الكارطة (أكثر ورق)</span><em>${r.cnt.join(' / ')}</em><b>${nmS(r.kar)}</b></div><div class="bsr"><span>الديناري</span><em></em><b>${nmS(r.din)}</b></div>
      <div class="bsr"><span>البرميلة (السبعات)</span><em></em><b>${nmS(r.bar)}</b></div><div class="bsr"><span>السبعة الحية 7♦</span><em></em><b>${nmS(r.hay)}</b></div>
      ${c2fsSides(d).map((t,i)=>`<div class="bsr tot"><span>${c2fsSideName(d,t)}</span><em>+${r.add[i]}</em><b>${d.sc[i]}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    if(pend&&opts.length>1)h+=`<p class="lbl c2lb">وش تاكل بـ ${c2Mini(pend)}؟</p><div class="fs-opts">${opts.map((o,i)=>`<button class="btn navy" data-ga="take" data-i="${i}">${o.map(c2Mini).join('')}</button>`).join('')}<button class="btn" data-ga="take" data-i="-1">رجوع</button></div>`;
    if(v>=0&&d.hands[v]!=null)h+=c2fsHand(d,v,my,pend);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2skNext(d));return;}if(d.ph!=='play')return;
    if(a==='card'){const c=cardsOf(d.hands[d.turn])[i];if(!c)return;const o=c2skOpts(cardsOf(d.fl),c);if(o.length>1){S.sel=[c2skSelKey(d),c];render();return;}S.sel=[];act(c2skPlay(d,c,o[0]||null));return;}
    if(a==='take'){const c=Array.isArray(S.sel)&&S.sel[0]===c2skSelKey(d)?S.sel[1]:null;S.sel=[];if(!c||i<0||!cardsOf(d.hands[d.turn]).includes(c)){render();return;}const o=c2skOpts(cardsOf(d.fl),c)[i];if(!o){render();return;}act(c2skPlay(d,c,o));}}};
HELP.c_shakba='الشكبة لعبة صيد مثل السكوبا، بـ40 ورقة (بدون 8 و9 و10): الشايب بـ10، الولد بـ9، البنت بـ8، والإكة بواحد. كل لاعب ياخذ 3 أوراق وتنحط 4 مكشوفة في الأرض، ولما تخلص يتوزع 3 ثانية لين تخلص الكوتشينة. في دورك تنزل ورقة: إذا في الأرض ورقة بنفس قيمتها لازم تاكلها (وتختار أي وحدة لو فيه أكثر)، وإذا ما فيه وفيه مجموعة مجموعها نفس قيمتها لازم تاكلها (وتختار المجموعة)، وإذا لا تبقى ورقتك في الأرض. إذا كنست الأرض كلها تصير «شكبة» ونقطة، إلا بآخر ورقة في الجولة. اللي يبقى في الأرض بالآخر ياخذه آخر واحد أكل. النقاط بآخر كل جولة: الكارطة (أكثر ورق) نقطة، الديناري (أكثر ديناري) نقطة، البرميلة (أكثر سبعات، ولو تعادلتوا أكثر ستات) نقطة، السبعة الحية (7 الديناري) نقطة، وكل شكبة نقطة. أول من يوصل 21 يفوز. مع 4 لاعبين: كل اثنين متقابلين فريق.';
GAMES.c_shakba.bot=(d,s,lv)=>{if(d.ph==='sum')return c2skNext(d);const H=cardsOf(d.hands[s]),fl=cardsOf(d.fl);
  const val=c=>1+(c[1]==='d'?1.2:0)+(c[0]==='7'?2:c[0]==='6'?1:0)+(c==='7d'?5:0);
  let best=null,bv=-1e9;const last=!d.dk.length&&d.hands.every((h,k)=>k===s||!h.length)&&H.length===1;
  const gone=new Set([...H,...fl,...d.caps.flatMap(x=>cardsOf(x))]),un=c2skDeck().filter(x=>!gone.has(x));
  for(const c of H){const os=c2skOpts(fl,c);const tries=os.length?os:[null];
    for(const o of tries){let v=0,rest=fl;if(o){v+=val(c)+o.reduce((a,x)=>a+val(x),0);for(const x of o)rest=cardsOf(c2Rm(rest.join(''),x));if(!rest.length&&!last)v+=8;}
      else{rest=[...fl,c];v-=val(c)*.8;}
      if(lv>=2&&rest.length){const tot=rest.reduce((a,x)=>a+skVal(x),0);
        if(tot<=10){const k=un.filter(x=>skVal(x)===tot).length,p=1-Math.pow(1-k/Math.max(1,un.length),3*(lv===3?1:.6));v-=p*(8+rest.reduce((a,x)=>a+val(x),0));}
        if(lv===3)for(const x of rest){const k=un.filter(y=>skVal(y)===skVal(x)).length;v-=val(x)*.5*(1-Math.pow(1-k/Math.max(1,un.length),3));}}
      if(lv===1)v+=Math.random()*6;if(v>bv){bv=v;best=[c,o];}}}
  return c2skPlay(d,best[0],best[1]);};
GAMES.c_shakba.botDelay=(d,s,lv)=>d.ph==='sum'?7000:900+rnd(700);

/* ---------- shedding games: the seats with their card counts, the hand ---------- */
function c2shSeats(d,o){return `<div class="sh-seats">${d.pl.map((_,s)=>`<span class="sh-seat ${d.turn===s&&d.win==null&&d.ph!=='sum'?'on':''} ${d.out[s]==='1'||(o.done&&o.done(s))?'done':''}" style="--c:${col(d,s)}"><i>${o.cnt?o.cnt(s):cardsOf(d.hands[s]).length}</i>${nm(d,s)}${o.x?o.x(s):''}</span>`).join('')}</div>`;}
// a hand of buttons: playable cards rise, a selection is raised further
function c2shHand(d,v,L,can,sel,big){const hc=cardsOf(d.hands[v]||'');const ids=handIds(hc,'sh'+v+'-');
  return `<div class="bhand c2hand ${hc.length>13||big?'big':''}">${hc.map((c,i)=>can&&L.includes(c)?`<button class="bcard ${sel&&sel.includes(c)?'sel':''}" id="${ids[i]}" data-ga="card" data-i="${i}">${c2Card(c)}</button>`:`<button class="bcard ${can?'dim':''}" id="${ids[i]}" disabled>${c2Card(c)}</button>`).join('')}</div>`;}
const c2shWho=(d,ctx)=>!ctx.local&&d.turn===ctx.v?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
const c2shKey=(d,t)=>[t,d.gid,d.turn,(d.hands[d.turn]||'').length,(d.dk||'').length,(d.disc||d.pile||'').length].join(':');
const c2shSel=(d,t)=>Array.isArray(S.sel)&&S.sel[0]===c2shKey(d,t)?S.sel.slice(1).filter(c=>cardsOf(d.hands[d.turn]).includes(c)):[];
function c2shToggle(d,t,c,ok){let s=c2shSel(d,t);s=s.includes(c)?s.filter(x=>x!==c):ok(s,c)?[...s,c]:[c];S.sel=[c2shKey(d,t),...s];render();}
function c2shDeal(d,k){const n=d.pl.length;let dk=shuffle(c2Deck()).join('');const hands=Array(n).fill('');
  for(let j=0;j<k;j++)for(let q=1;q<=n;q++){const s=(d.dl+q)%n;if(d.out[s]==='1')continue;hands[s]+=dk.slice(0,2);dk=dk.slice(2);}
  return {...d,hands:hands.map(h=>c2Sort(h)),dk};}

/* =================================================================
   الثمانيات (crazy eights): 5 cards each (7 with two players), one turned up. Play a card of the suit or rank on top; an 8
   goes on anything and names the suit. You may draw from the stock instead (one at a time); with the stock empty and no
   card to play you pass. The first out wins the hand and scores what the others hold: 8 = 50, picture = 10, ace = 1,
   others their number. A blocked hand goes to the lowest hand. First to 100 wins.
   ================================================================= */
const c2e8Pen=c=>c[0]==='8'?50:'TJQK'.includes(c[0])?10:c[0]==='A'?1:+c[0];
function c2e8Deal(d){const n=d.pl.length,al=aliveSeats(d).length;let x=c2shDeal(d,al===2?7:5),dk=x.dk;
  let top=dk.slice(0,2);dk=dk.slice(2);while(top[0]==='8'){const at=2*rnd(dk.length/2);dk=dk.slice(0,at)+top+dk.slice(at);top=dk.slice(0,2);dk=dk.slice(2);}
  return {...x,dk,disc:top,su:top[1],ph:'play',ps:0,drew:0,sum:null,lp:-1,turn:nextSeat(x,x.dl)};}
const c2e8Ok=(d,c)=>c[0]==='8'||c[1]===d.su||c[0]===d.disc.slice(-2)[0];
const c2e8Legal=(d,s)=>cardsOf(d.hands[s]).filter(c=>c2e8Ok(d,c));
function c2e8Play(d,c,su){const s=d.turn,hands=[...d.hands];hands[s]=c2Rm(hands[s],c);
  const nd={...d,hands,disc:d.disc+c,su:c[0]==='8'?su:c[1],ps:0,drew:0,lp:s,last:`${nameTag(d,s)} نزّل ${c[0]==='8'?'ثمانية وطلب '+C2SN[su]:c2Mini(c).replace(/<[^>]+>/g,'')+C2SN[c[1]]}`};
  if(!hands[s])return c2e8End(nd,s);return {...nd,turn:nextSeat(nd,s)};}
function c2e8Draw(d){const s=d.turn,hands=[...d.hands];hands[s]=c2Sort(hands[s]+d.dk.slice(0,2));return {...d,hands,dk:d.dk.slice(2),drew:d.drew+1,last:`${nameTag(d,s)} سحب`};}
function c2e8Pass(d){const s=d.turn,ps=d.ps+1,nd={...d,ps,drew:0,last:`${nameTag(d,s)} مرّر`};
  if(ps>=aliveSeats(d).length){const al=aliveSeats(d),v=al.map(x=>cardsOf(d.hands[x]).reduce((a,c)=>a+c2e8Pen(c),0)),mn=Math.min(...v);return c2e8End(nd,al[v.indexOf(mn)],true);}
  return {...nd,turn:nextSeat(nd,s)};}
function c2e8End(d,w,blocked){const pen=d.pl.map((_,s)=>s===w||d.out[s]==='1'?0:cardsOf(d.hands[s]).reduce((a,c)=>a+c2e8Pen(c),0));const got=pen.reduce((a,x)=>a+x,0);
  const sc=[...d.sc];sc[w]+=got;const nd={...d,sc,ph:'sum',sum:{w,pen,got,blocked:!!blocked},turn:w,last:blocked?`انقفلت اللعبة، ${nameTag(d,w)} أقل ورق`:`${nameTag(d,w)} خلّص ورقه`};
  if(sc[w]>=100)return {...nd,win:w};return nd;}
const c2e8Next=d=>({...c2e8Deal({...d,dl:nextSeat(d,d.dl)}),last:''});
const c2e8Key=d=>c2shKey(d,'e8');
GAMES.c_eights={name:'الثمانيات',cat:'cards',lbc:'#2E7D9A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E7D9A"/><circle cx="50" cy="50" r="40" fill="#3792B3"/><g transform="rotate(-10 40 52)"><rect x="24" y="26" width="34" height="50" rx="5" fill="#fff"/><text x="41" y="60" font-size="26" font-weight="900" text-anchor="middle" fill="#D43C33">8</text></g>${['s','h','d','c'].map((s,i)=>`<circle cx="${70+(i%2)*14}" cy="${34+Math.floor(i/2)*14}" r="7" fill="#fff"/><text x="${70+(i%2)*14}" y="${38.5+Math.floor(i/2)*14}" font-size="10" text-anchor="middle" fill="${'hd'.includes(s)?'#D43C33':'#2D4763'}">${C2SN[s]}</text>`).join('')}<rect x="60" y="66" width="34" height="14" rx="7" fill="#F0B429"/><text x="77" y="77" font-size="10" font-weight="900" text-anchor="middle" fill="#245F75">100</text></svg>`,
  init:n=>({dl:n-1,hands:Array(n).fill(''),dk:'',disc:'',su:'s',ps:0,drew:0,lp:-1,sc:Array(n).fill(0),ph:'play',last:''}),
  start:(d,base)=>c2e8Deal(d),
  mask:c2shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2e8Deal(d),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.sc.map(x=>x),
  winText:d=>d.win!=null?`فاز ${nm(d,d.win)} بـ${d.sc[d.win]} نقطة`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;return nd.out[d.turn]==='1'?{...nd,drew:0}:nd;},
  onTimeout(d){if(d.ph==='sum')return c2e8Next(d);const L=c2e8Legal(d,d.turn);if(L.length){const c=L[0];return c2e8Play(d,c,c[1]);}return d.dk.length?{...c2e8Draw(d),turn:nextSeat(d,d.turn)}:c2e8Pass(d);},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';return s+c2shWho(d,ctx)+`: نزّل ${C2SN[d.su]} أو ${d.disc.slice(-2)[0]==='T'?'10':d.disc.slice(-2)[0]} أو ثمانية`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v&&d.ph==='play';const top=d.disc.slice(-2);
    let h=`<div class="c2">${c2shSeats(d,{x:s=>` <em>${d.sc[s]}</em>`})}<div class="sh-tab"><${my&&d.dk.length?'button data-ga="draw"':'div'} class="sh-stk">${cardHTML('??',true)}<small>${d.dk.length/2}</small></${my&&d.dk.length?'button':'div'}>
      <div class="sh-pile"><span class="sh-top" data-k="e${d.disc.length}">${c2Card(top,true)}</span></div><span class="sh-suit">الطلب <em class="${'hd'.includes(d.su)?'rs':''}">${C2SN[d.su]}</em></span></div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>${nameTag(d,r.w)} ياخذ ${r.got} نقطة${r.blocked?' (انقفلت)':''}</h3>${d.pl.map((_,s)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>${s===r.w?'🏆':r.pen[s]}</em><b>${d.sc[s]}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    const pend=my&&Array.isArray(S.sel)&&S.sel[0]===c2e8Key(d)?S.sel[1]:null;
    if(pend)h+=`<p class="lbl c2lb">اختر النوع اللي تطلبه</p>`+c2Btns([...'shdc'.split('').map((s,i)=>[i,C2SN[s],'bsuit '+('hd'.includes(s)?'rs':'')]),[9,'رجوع','']],'suit');
    else if(my){const L=c2e8Legal(d,v);h+=`<div class="row bopts">${d.dk.length?'<button class="btn blue" data-ga="draw">اسحب ورقة</button>':L.length?'':'<button class="btn navy" data-ga="pass">مرّر</button>'}</div>`;}
    if(v>=0&&d.hands[v]!=null)h+=c2shHand(d,v,my?c2e8Legal(d,v):[],my&&!pend,pend?[pend]:null);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2e8Next(d));return;}if(d.ph!=='play')return;const s=d.turn;
    if(a==='draw'){if(!d.dk.length)return;S.sel=[];act(c2e8Draw(d));return;}
    if(a==='pass'){if(d.dk.length||c2e8Legal(d,s).length)return;act(c2e8Pass(d));return;}
    if(a==='card'){const c=cardsOf(d.hands[s])[i];if(!c||!c2e8Ok(d,c))return;if(c[0]==='8'){S.sel=[c2e8Key(d),c];render();return;}act(c2e8Play(d,c));return;}
    if(a==='suit'){const c=Array.isArray(S.sel)&&S.sel[0]===c2e8Key(d)?S.sel[1]:null;S.sel=[];if(i===9||!c||!cardsOf(d.hands[s]).includes(c)||!'shdc'[i]){render();return;}act(c2e8Play(d,c,'shdc'[i]));}}};
HELP.c_eights='كل لاعب ياخذ 5 أوراق (7 لو كنتوا اثنين)، وتنقلب ورقة في الوسط. في دورك نزّل ورقة من نفس نوع الورقة اللي فوق أو نفس رقمها. الثمانية تنزل على أي شي، واللي ينزلها يختار النوع اللي بعدها. تقدر تسحب من الكومة ورقة ورقة بدل ما تنزل، ولو خلصت الكومة وما عندك ورقة تنفع تمرّر. أول من يخلص ورقه ياخذ نقاط اللي باقي عند الباقين: الثمانية 50، الصور 10، الإكة 1، والباقي برقمها. ولو انقفلت اللعبة (الكل مرّر) ياخذها صاحب أقل ورق. أول من يوصل 100 يفوز.';
// the bot: sheds the costly cards first, keeps its eights for when it is stuck (or someone is about to go out), and names its longest suit
GAMES.c_eights.bot=(d,s,lv)=>{if(d.ph==='sum')return c2e8Next(d);const H=cardsOf(d.hands[s]),L=c2e8Legal(d,s);
  if(!L.length)return d.dk.length?c2e8Draw(d):c2e8Pass(d);
  if(lv===1&&Math.random()<.4){const c=L[rnd(L.length)];return c2e8Play(d,c,c[0]==='8'?'shdc'[rnd(4)]:null);}
  const nx=nextSeat(d,s),danger=cardsOf(d.hands[nx]).length<=2;const nonE=L.filter(c=>c[0]!=='8');
  const cnt=x=>H.filter(c=>c[1]===x&&c[0]!=='8').length;
  const pick=(nonE.length&&!(danger&&lv===3&&L.some(c=>c[0]==='8')&&!nonE.some(c=>c[1]!==d.su)))?nonE.slice().sort((a,b)=>c2e8Pen(b)+cnt(b[1])*2-(c2e8Pen(a)+cnt(a[1])*2))[0]:L.find(c=>c[0]==='8')||L[0];
  if(pick[0]==='8'){const rest=H.filter(c=>c!==pick);const su='shdc'.split('').sort((a,b)=>rest.filter(c=>c[1]===b).length-rest.filter(c=>c[1]===a).length)[0];return c2e8Play(d,pick,su);}
  return c2e8Play(d,pick);};
GAMES.c_eights.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(600);

/* =================================================================
   الكذاب (cheat / I doubt it): the whole pack is dealt. In turn each player puts 1 to 4 cards face down and says they are
   of the rank in order (ace, 2, 3 … king, then ace again). The next player either calls «كذاب!» or plays on (believing).
   A call turns the cards up: a lie sends the whole pile to the liar, the truth sends it to the caller. A player who goes out
   wins once the next player believes him (or calls wrongly).
   ================================================================= */
const C2CH_R='A23456789TJQK',chRn=r=>({A:'إكة',T:'عشرة',J:'ولد',Q:'بنت',K:'شايب'})[r]||r;
function c2chDeal(d){const n=d.pl.length;const dk=shuffle(c2Deck());const hands=Array(n).fill('');let j=0;for(const c of dk){let s=(d.dl+1+j)%n;while(d.out[s]==='1'){j++;s=(d.dl+1+j)%n;}hands[s]+=c;j++;}
  return {...d,hands:hands.map(h=>c2Sort(h)),pile:'',rk:0,lp:null,fin:-1,rv:null,ph:'play',turn:nextSeat(d,d.dl)};}
function c2chPlay(d,cs){const s=d.turn,hands=[...d.hands];for(const c of cs)hands[s]=c2Rm(hands[s],c);const r=C2CH_R[d.rk];
  const nd={...d,hands,pile:d.pile+cs.join(''),lp:{s,n:cs.length,r},rk:(d.rk+1)%13,fin:hands[s]?-1:s,rv:null,last:`${nameTag(d,s)}: ${cs.length} × ${chRn(r)}`};
  return {...nd,turn:nextSeat(nd,s)};}
function c2chCall(d){const s=d.turn,lp=d.lp,cs=cardsOf(d.pile).slice(-lp.n),lie=cs.some(c=>c[0]!==lp.r),lo=lie?lp.s:s;
  const hands=[...d.hands];hands[lo]=c2Sort(hands[lo]+d.pile);
  const nd={...d,hands,pile:'',lp:null,fin:-1,rv:{c:cs,by:lp.s,ch:s,lie,n:cardsOf(d.pile).length},last:lie?`${nameTag(d,s)} كشف ${nameTag(d,lp.s)}: كذاب! ياخذ ${cardsOf(d.pile).length} ورقة`:`${nameTag(d,lp.s)} كان صادق! ${nameTag(d,s)} ياخذ ${cardsOf(d.pile).length} ورقة`};
  if(!lie&&d.fin===lp.s)return {...nd,win:lp.s};return nd;}
const c2chBelieve=d=>d.fin>=0?{...d,win:d.fin,last:`${nameTag(d,d.turn)} صدّق، و${nameTag(d,d.fin)} خلّص ورقه`}:d;
const c2chKeyT='ch';
GAMES.c_cheat={name:'الكذاب',cat:'cards',lbc:'#7A3E9D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A3E9D"/><circle cx="50" cy="50" r="40" fill="#8C4FB0"/>${[0,1,2].map(k=>`<g transform="rotate(${-14+k*14} 50 80)"><rect x="34" y="28" width="32" height="46" rx="5" fill="#fff" stroke="#5B2C78" stroke-width="1.5"/><rect x="38" y="32" width="24" height="38" rx="3" fill="#2D4763"/><circle cx="50" cy="51" r="5" fill="#EC6158"/></g>`).join('')}<circle cx="74" cy="26" r="15" fill="#F0B429"/><text x="74" y="33" font-size="20" font-weight="900" text-anchor="middle" fill="#5B2C78">?</text></svg>`,
  init:n=>({dl:n-1,hands:Array(n).fill(''),pile:'',rk:0,lp:null,fin:-1,rv:null,ph:'play',last:''}),
  start:(d,base)=>c2chDeal(d),
  mask:c2shMask,
  redeal:d=>d.win!=null?d:{...c2chDeal(d),last:'انعادت اللعبة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.hands.map(h=>cardsOf(h).length+' ورقة'),
  winText:d=>d.win!=null?`فاز ${nm(d,d.win)}، خلّص ورقه أول واحد`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;// the cards of a player who left go under the pile; a claim waiting on him is believed
    const s=d.turn,hands=[...nd.hands];let pile=nd.pile;if(nd.out[s]==='1'&&hands[s]){pile=hands[s]+pile;hands[s]='';}let x={...nd,hands,pile};
    if(x.lp&&x.out[x.lp.s]==='1')x={...x,lp:null,fin:-1};if(x.fin>=0&&x.out[x.fin]!=='1'&&x.turn!==d.turn)return x;return x;},
  onTimeout(d){if(d.lp&&d.fin>=0)return c2chBelieve(d);const H=cardsOf(d.hands[d.turn]);const m=H.filter(c=>c[0]===C2CH_R[d.rk]);return c2chPlay(d,m.length?m:[H[0]]);},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';return s+c2shWho(d,ctx)+(d.lp?(d.fin>=0?`: ${nm(d,d.fin)} خلّص ورقه، تصدّقه؟`:`: تصدّق ${nm(d,d.lp.s)}؟ وإلا نزّل ${chRn(C2CH_R[d.rk])}`):`: نزّل ${chRn(C2CH_R[d.rk])}`);},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v;const sel=my?c2shSel(d,c2chKeyT):[];
    let h=`<div class="c2">${c2shSeats(d,{})}<div class="sh-tab"><div class="sh-pile">${d.pile?`<span class="sh-top" data-k="p${d.pile.length}">${cardHTML('??',true)}</span>`:'<div class="card big hempty"></div>'}</div>`;
    h+=`<div class="sh-stk"><small>${cardsOf(d.pile).length} ورقة</small></div>`;
    if(d.rv)h+=`<span class="sh-msg ${d.rv.lie?'bad':'ok'}" data-k="rv${d.rv.n}">${d.rv.lie?'كذب! 🤥':'صادق 😇'}</span><div class="sh-reveal" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);--cwm:26px">${d.rv.c.map(c2Mini).join('')}</div>`;
    else if(d.lp)h+=`<span class="sh-claim" data-k="c${d.pile.length}">${nm(d,d.lp.s)}: ${d.lp.n} × ${chRn(d.lp.r)}</span>`;
    h+=`<span class="sh-msg">المطلوب: ${chRn(C2CH_R[d.rk])}</span></div>`;
    if(my){h+=`<div class="row bopts">${d.lp?`<button class="btn red" data-ga="call">كذاب! 🤥</button>`:''}${d.lp&&d.fin>=0?'<button class="btn green" data-ga="believe">أصدّقه</button>':`<button class="btn green" data-ga="play" ${sel.length?'':'disabled'}>نزّل ${sel.length||''} وقل ${chRn(C2CH_R[d.rk])}</button>`}</div>`;}
    if(v>=0&&d.hands[v]!=null)h+=c2shHand(d,v,cardsOf(d.hands[v]),my&&!(d.lp&&d.fin>=0),sel);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='call'&&d.lp){S.sel=[];act(c2chCall(d));return;}
    if(a==='believe'&&d.lp&&d.fin>=0){act(c2chBelieve(d));return;}
    if(d.lp&&d.fin>=0)return;
    if(a==='card'){const c=cardsOf(d.hands[d.turn])[i];if(c)c2shToggle(d,c2chKeyT,c,s=>s.length<4);return;}
    if(a==='play'){const cs=c2shSel(d,c2chKeyT);if(!cs.length||cs.length>4)return;S.sel=[];act(c2chPlay(d,cs));}}};
HELP.c_cheat='الورق كله يتوزع. بالدور كل واحد ينزّل من ورقة إلى 4 مقلوبة ويقول إنها من الرقم المطلوب، والأرقام تمشي بالترتيب: إكة، 2، 3… لين الشايب وترجع للإكة. تقدر تكذب وتنزّل غيرها! اللي بعدك يا يقول «كذاب!» يا يصدّق ويكمل وينزّل الرقم اللي بعده. إذا قال كذاب تنكشف الأوراق: لو طلعت كذبة ياخذ الكذاب كل الكومة، ولو طلعت صادقة ياخذها اللي اتهمك، وبعدها يكمل اللي قال كذاب. أول من يخلص ورقه يفوز، بس لازم اللي بعده يصدّقه (أو يتهمه وتطلع صادقة).';
// the bot: tells the truth when it can, bluffs with the cards it needs last, and calls when the claim cannot be true
// (it holds too many of that rank), when a rival would go out, or when a big claim looks unlikely
GAMES.c_cheat.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);
  if(d.lp){const r=d.lp.r,have=H.filter(c=>c[0]===r).length,imp=have+d.lp.n>4;const claimHand=cardsOf(d.hands[d.lp.s]).length+d.lp.n;
    let call=imp&&lv>1;if(d.fin>=0)call=imp||Math.random()<[0,.4,.65,.75][lv];
    else if(!call){const unk=4-have,p=lv===1?.15:Math.min(.9,(d.lp.n>unk?1:0)+(d.lp.n>=3?.35:d.lp.n===2?.18:.08)*(lv===3?1.2:1)+(claimHand<=3?.2:0)-cardsOf(d.pile).length*.012);call=Math.random()<p;}
    if(call)return c2chCall(d);if(d.fin>=0)return c2chBelieve(d);}
  const r=C2CH_R[d.rk],m=H.filter(c=>c[0]===r);if(m.length&&(lv>1||Math.random()<.7))return c2chPlay(d,m);
  // a bluff: the card whose rank comes round last
  const far=c=>(C2CH_R.indexOf(c[0])-d.rk+13)%13;const pool=H.slice().sort((a,b)=>far(b)-far(a));
  const k=lv===3&&H.length>6&&Math.random()<.3?2:1;return c2chPlay(d,pool.slice(0,Math.min(k,pool.length)));};
GAMES.c_cheat.botDelay=(d,s,lv)=>900+rnd(900);

/* =================================================================
   واحد وثلاثين (31 / scat): 3 cards each and one turned up; everyone has 3 lives. On your turn draw from the stock or take
   the top discard, then throw one; or knock instead (the others get one more turn each). A hand counts its best suit:
   ace 11, pictures 10. Then the lowest hand loses a life (a knocker who is lowest loses two; on a tie the knocker is safe).
   31 at once ends the deal and everyone else loses a life. No lives left: out. The last one in wins.
   ================================================================= */
const c2scV=c=>c[0]==='A'?11:'TJQK'.includes(c[0])?10:+c[0];
const c2scVal=h=>{const cs=cardsOf(h);return Math.max(0,...'shdc'.split('').map(s=>cs.filter(c=>c[1]===s).reduce((a,c)=>a+c2scV(c),0)));};
function c2scDeal(d){const x=c2shDeal(d,3);const disc=x.dk.slice(0,2);const nd={...x,dk:x.dk.slice(2),disc,kn:-1,left:0,ph:'draw',took:'',sum:null,last:'',turn:nextSeat(x,x.dl)};
  const b=aliveSeats(nd).find(s=>c2scVal(nd.hands[s])===31);return b!=null?c2scShow(nd,b):nd;}
function c2scDraw(d,disc){const s=d.turn,hands=[...d.hands];let dk=d.dk,ds=d.disc,c;
  if(disc){c=ds.slice(-2);ds=ds.slice(0,-2);}else{if(!dk.length){dk=shuffle(cardsOf(ds.slice(0,-2))).join('');ds=ds.slice(-2);}c=dk.slice(0,2);dk=dk.slice(2);}
  hands[s]=hands[s]+c;return {...d,hands,dk,disc:ds,ph:'disc',took:disc?c:'',last:`${nameTag(d,s)} ${disc?'أخذ الورقة المكشوفة':'سحب'}`};}
function c2scThrow(d,c){const s=d.turn,hands=[...d.hands];hands[s]=c2Rm(hands[s],c);let nd={...d,hands,disc:d.disc+c,ph:'draw',took:'',last:`${nameTag(d,s)} رمى ورقة`};
  if(c2scVal(hands[s])===31)return c2scShow(nd,s);return c2scAfter(nd,s);}
function c2scAfter(d,s){if(d.kn>=0){const left=d.left-1;if(left<=0)return c2scShow({...d,left:0},-1);return {...d,left,turn:nextSeat(d,s)};}return {...d,turn:nextSeat(d,s)};}
function c2scKnock(d){const s=d.turn,al=aliveSeats(d).length;return {...d,kn:s,left:al-1,last:`${nameTag(d,s)} دق! 👊 الباقين لهم دور واحد`,turn:nextSeat(d,s)};}
function c2scShow(d,b31){const al=aliveSeats(d),val=d.pl.map((_,s)=>d.out[s]==='1'?-1:c2scVal(d.hands[s]));const loss=Array(d.pl.length).fill(0);
  if(b31>=0)al.forEach(s=>{if(s!==b31)loss[s]=1;});
  else{const mn=Math.min(...al.map(s=>val[s])),lo=al.filter(s=>val[s]===mn);if(lo.includes(d.kn)){if(lo.length===1)loss[d.kn]=2;else lo.forEach(s=>{if(s!==d.kn)loss[s]=1;});}else lo.forEach(s=>loss[s]=1);}
  const lives=d.lives.map((x,s)=>Math.max(0,x-loss[s]));let out=d.out;lives.forEach((x,s)=>{if(!x&&out[s]!=='1')out=setAt(out,s,'1');});
  const alive=d.pl.map((_,s)=>s).filter(s=>out[s]!=='1');
  const nd={...d,lives,ph:'sum',sum:{val,loss,b31},out:d.out,dead:out,turn:al.includes(d.turn)?d.turn:al[0],last:b31>=0?`${nameTag(d,b31)} جاب 31! 🎉`:'كشفنا الورق'};
  if(alive.length<=1){const w=alive.length?alive[0]:al.sort((a,b)=>val[b]-val[a])[0];return {...nd,win:w};}
  return nd;}
// the next deal: the seats with no lives left are taken out (d.out) only now, so the summary still shows everybody
function c2scNext(d){const out=d.dead||d.out;const x={...d,out,dead:null};return {...c2scDeal({...x,dl:nextSeat(x,x.dl)}),last:''};}
GAMES.c_scat={name:'واحد وثلاثين',cat:'cards',lbc:'#C7662B',outDone:false,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C7662B"/><circle cx="50" cy="50" r="40" fill="#D97A3E"/>${['A','K','T'].map((r,k)=>`<g transform="rotate(${-16+k*16} 50 84)"><rect x="35" y="26" width="30" height="44" rx="5" fill="#fff"/><text x="50" y="52" font-size="15" font-weight="800" text-anchor="middle" fill="#D43C33">${r==='T'?'10':r}♥</text></g>`).join('')}<rect x="30" y="74" width="40" height="18" rx="9" fill="#2D4763"/><text x="50" y="88" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">31</text></svg>`,
  init:n=>({dl:n-1,hands:Array(n).fill(''),dk:'',disc:'',lives:Array(n).fill(3),kn:-1,left:0,ph:'draw',took:'',last:''}),
  start:(d,base)=>c2scDeal(d),
  mask:c2shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2scDeal(d),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.lives.map(x=>x?'❤️'.repeat(x):'💀'),
  winText:d=>d.win!=null?`فاز ${nm(d,d.win)}، آخر واحد باقي`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;let x=nd;if(d.ph==='disc'&&nd.out[d.turn]==='1')x={...x,ph:'draw',took:''};if(x.kn>=0&&x.out[x.kn]==='1')x={...x,kn:-1,left:0};
    if(x.kn>=0){x={...x,left:Math.max(1,x.left-1)};}return x;},
  onTimeout(d){if(d.ph==='sum')return c2scNext(d);if(d.ph==='draw')return c2scDraw(d,false);const H=cardsOf(d.hands[d.turn]).filter(c=>c!==d.took);return c2scThrow(d,H.sort((a,b)=>c2scV(a)-c2scV(b))[0]);},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+c2shWho(d,ctx)+(d.ph==='draw'?`: اسحب، خذ المكشوفة${d.kn<0?'، أو دق':''}`:': ارمِ ورقة')+(d.kn>=0?` <small>• ${nm(d,d.kn)} داق</small>`:'');},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v;const top=d.disc.slice(-2);const can=my&&d.ph==='draw';
    let h=`<div class="c2">${c2shSeats(d,{cnt:s=>d.lives[s],done:s=>!d.lives[s],x:s=>s===d.kn?' 👊':''})}<div class="sh-tab"><${can?'button data-ga="stock"':'div'} class="sh-stk">${cardHTML('??',true)}<small>${d.dk.length/2}</small></${can?'button':'div'}>
      <${can&&top?'button data-ga="take"':'div'} class="sh-stk sh-pile"><span class="sh-top" data-k="s${d.disc.length}">${top?c2Card(top,true):'<div class="card big hempty"></div>'}</span><small>المكشوفة</small></${can&&top?'button':'div'}></div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>${r.b31>=0?`${nameTag(d,r.b31)} جاب 31!`:'النتيجة'}</h3>${d.pl.map((_,s)=>r.val[s]<0?'':`<div class="bsr"><span>${nameTag(d,s)}${s===d.kn?' 👊':''}</span><em>${cardsOf(d.hands[s]).map(c2Mini).join('')} ${r.val[s]}</em><b>${r.loss[s]?'‎-'+r.loss[s]+' 💔':'✓'} ${'❤️'.repeat(d.lives[s])||'💀'}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    if(my&&d.ph==='draw'&&d.kn<0)h+=`<div class="row bopts"><button class="btn red" data-ga="knock">دق 👊</button></div>`;
    if(v>=0&&d.hands[v]!=null&&d.out[v]!=='1'){const L=my&&d.ph==='disc'?cardsOf(d.hands[v]).filter(c=>c!==d.took):[];h+=`<p class="lbl c2lb">مجموعك ${c2scVal(d.hands[v])}</p>`+c2shHand(d,v,L,my&&d.ph==='disc',null);}
    return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2scNext(d));return;}
    if(d.ph==='draw'){if(a==='stock'){act(c2scDraw(d,false));return;}if(a==='take'&&d.disc){act(c2scDraw(d,true));return;}if(a==='knock'&&d.kn<0){act(c2scKnock(d));return;}return;}
    if(d.ph==='disc'&&a==='card'){const c=cardsOf(d.hands[d.turn])[i];if(!c||c===d.took)return;act(c2scThrow(d,c));}}};
HELP.c_scat='كل لاعب ياخذ 3 أوراق وعنده 3 أرواح، وتنقلب ورقة في الوسط. في دورك تسحب من الكومة أو تاخذ الورقة المكشوفة، وبعدها ترمي ورقة (مو نفس الورقة اللي أخذتها من الأرض). يدك تنحسب بأعلى مجموع من نوع واحد: الإكة 11، الصور 10، والباقي برقمها، والهدف توصل 31. بدل السحب تقدر «تدق» إذا حسيت إن يدك قوية: الباقين لهم دور واحد بعدها نكشف. صاحب أقل مجموع يخسر روح، ولو كان الداق هو الأقل يخسر روحين، ولو تعادل الداق مع غيره يسلم الداق ويخسر الثاني. اللي يجيب 31 بالضبط يكشف على طول وكل الباقين يخسرون روح. اللي تخلص أرواحه يطلع، وآخر واحد باقي يفوز.';
GAMES.c_scat.bot=(d,s,lv)=>{if(d.ph==='sum')return c2scNext(d);const H=cardsOf(d.hands[s]);
  const best3=cs=>{let b=-1,bc=null;for(const c of cs){const r=cs.filter(x=>x!==c).join('');const v=c2scVal(r);if(v>b){b=v;bc=c;}}return [b,bc];};
  if(d.ph==='draw'){const cur=c2scVal(d.hands[s]),al=aliveSeats(d).length;
    const kt=lv===1?26+rnd(5):lv===2?25:(al>3?24:26)-(d.lives[s]===1?-2:0);
    if(d.kn<0&&cur>=kt&&Math.random()<(lv===1?.5:1))return c2scKnock(d);
    const top=d.disc.slice(-2);if(top){const [v]=best3([...H,top]);if(v>cur+(lv===1?0:2)||(v>=cur+1&&c2scV(top)>=10))return c2scDraw(d,true);}return c2scDraw(d,false);}
  const cs=H.filter(c=>c!==d.took);if(lv===1&&Math.random()<.3)return c2scThrow(d,cs[rnd(cs.length)]);
  let bc=cs[0],bv=-1;for(const c of cs){const v=c2scVal(H.filter(x=>x!==c).join(''))*10-c2scV(c)*.1;if(v>bv){bv=v;bc=c;}}return c2scThrow(d,bc);};
GAMES.c_scat.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(600);

/* =================================================================
   الرئيس والوزير (president): the whole pack is dealt; 3 is lowest, then up to ace and 2 the highest. The leader plays one card
   or a set of the same rank; each next player beats it with as many cards of a higher rank, or passes (out of that trick).
   When all pass, the last to play leads again. The order of going out gives the titles: الرئيس، الوزير … الشعب.
   Next round the last gives his 2 best cards to the president, who gives back 2 of his choice (the second last and the
   minister swap 1). Five rounds; points by finishing place, the most points win.
   ================================================================= */
const C2PR_R='3456789TJQKA2',prR=c=>C2PR_R.indexOf(c[0]);
const c2prSort=h=>cardsOf(h).sort((a,b)=>prR(a)-prR(b)||'cdhs'.indexOf(a[1])-'cdhs'.indexOf(b[1])).join('');
const c2prTitle=(n,i)=>i===0?'الرئيس':i===n-1?'الشعب':i===1&&n>=4?'الوزير':i===n-2&&n>=4?'نائب الشعب':'مواطن';
function c2prDeal(d){const n=d.pl.length,al=aliveSeats(d);const dk=shuffle(c2Deck());const h0=Array(n).fill('');
  let j=0;for(const c of dk){h0[al[j%al.length]]+=c;j++;}const hs=h0.map(c2prSort);
  const nd={...d,hands:hs,tp:'',tc:0,tr:-1,lead:-1,pa:'0'.repeat(n),fin:'',ph:'play',sw:null,sum:null};
  // the first round: the holder of 3♣ leads; later the last of the round before leads after the swaps
  if(!d.order){const s=hs.findIndex(h=>cardsOf(h).includes('3c'));return {...nd,turn:s};}
  const ord=d.order.split('').map(Number).filter(s=>d.out[s]!=='1'),k=ord.length>=3?2:1,pres=ord[0],scum=ord[ord.length-1];
  const take=(h,m)=>cardsOf(h).sort((a,b)=>prR(b)-prR(a)).slice(0,m);
  const hands=[...hs];const give=(from,to,cs)=>{for(const c of cs)hands[from]=c2Rm(hands[from],c);hands[to]=c2prSort(hands[to]+cs.join(''));};
  if(ord.length>=2){give(scum,pres,take(hands[scum],k));}
  const vic=ord.length>=4?[ord[1],ord[ord.length-2]]:null;if(vic)give(vic[1],vic[0],take(hands[vic[1]],1));
  const sw=[{s:pres,to:scum,k}];if(vic)sw.push({s:vic[0],to:vic[1],k:1});
  return {...nd,hands,ph:'swap',sw,turn:pres,last:`${nm(d,scum)} عطى الرئيس أفضل ${k===2?'ورقتين':'ورقة'}`};}
function c2prGive(d,cs){const w=d.sw[0],hands=[...d.hands];for(const c of cs)hands[w.s]=c2Rm(hands[w.s],c);hands[w.to]=c2prSort(hands[w.to]+cs.join(''));
  const sw=d.sw.slice(1),nd={...d,hands,sw:sw.length?sw:null,last:`${nameTag(d,w.s)} رجّع ${cs.length===2?'ورقتين':'ورقة'} لـ${nameTag(d,w.to)}`};
  if(sw.length)return {...nd,turn:sw[0].s};const ord=d.order.split('').map(Number).filter(s=>d.out[s]!=='1');return {...nd,ph:'play',turn:ord[ord.length-1]};}
const c2prActive=(d,s)=>d.out[s]!=='1'&&cardsOf(d.hands[s]).length>0;
// the next seat that still plays this trick
function c2prNext(d,from){const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(c2prActive(d,s)&&d.pa[s]!=='1')return s;}return -1;}
function c2prOk(d,cs){if(!cs.length||cs.length>4||cs.some(c=>c[0]!==cs[0][0]))return false;if(!d.tc)return true;return cs.length===d.tc&&prR(cs[0])>d.tr;}
function c2prPlay(d,cs){const s=d.turn,hands=[...d.hands];for(const c of cs)hands[s]=c2Rm(hands[s],c);
  let nd={...d,hands,tp:cs.join(''),tc:cs.length,tr:prR(cs[0]),lead:s,last:`${nameTag(d,s)} نزّل ${cs.length>1?cs.length+' × ':''}${cs[0][0]==='T'?'10':cs[0][0]}`};
  if(!hands[s]){nd.fin+=s;nd.last+=` وخلّص ${c2prTitle(d.pl.length,nd.fin.length-1)==='الرئيس'?'(الرئيس 👑)':''}`;const left=nd.pl.map((_,x)=>x).filter(x=>c2prActive(nd,x));if(left.length<=1)return c2prEnd({...nd,fin:nd.fin+left.join('')});}
  return c2prTurn(nd,s);}
function c2prPass(d){const s=d.turn;return c2prTurn({...d,pa:setAt(d.pa,s,'1'),last:`${nameTag(d,s)} باس`},s);}
// after a play or a pass: the next one still in the trick, or a new trick for the last to play (the next one if he is out)
function c2prTurn(d,s){const nx=c2prNext(d,s);
  if(nx>=0&&!(nx===d.lead&&d.tc)){return {...d,turn:nx};}
  let ld=d.lead;if(!c2prActive(d,ld)){ld=c2prNext({...d,pa:'0'.repeat(d.pl.length)},ld);}
  return {...d,tp:'',tc:0,tr:-1,pa:'0'.repeat(d.pl.length),turn:ld,last:d.last+' • لمّة جديدة'};}
function c2prEnd(d){const n=d.pl.length,ord=d.fin.split('').map(Number),sc=[...d.sc];ord.forEach((s,i)=>sc[s]+=ord.length-1-i);
  const nd={...d,sc,order:d.fin,ph:'sum',sum:{ord},rd:d.rd+1,turn:ord[0],last:`${nameTag(d,ord[0])} صار الرئيس 👑`};
  if(nd.rd>=5){const al=aliveSeats(nd),mx=Math.max(...al.map(s=>sc[s]));const ws=al.filter(s=>sc[s]===mx).sort((a,b)=>ord.indexOf(a)-ord.indexOf(b));return {...nd,win:ws[0],wins:[ws[0]]};}
  return nd;}
const c2prNextR=d=>({...c2prDeal(d),last:d.last});
const c2prKeyT='pr';
GAMES.c_pres={name:'الرئيس والوزير',cat:'cards',lbc:'#9C7A1E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#9C7A1E"/><circle cx="50" cy="54" r="38" fill="#B38F2A"/><g transform="rotate(-12 38 60)"><rect x="22" y="38" width="30" height="42" rx="4" fill="#fff"/><text x="37" y="65" font-size="17" font-weight="800" text-anchor="middle" fill="#2D4763">2♠</text></g><g transform="rotate(10 62 60)"><rect x="48" y="38" width="30" height="42" rx="4" fill="#fff"/><text x="63" y="65" font-size="17" font-weight="800" text-anchor="middle" fill="#D43C33">2♥</text></g><path d="M30 30l7-14 13 10 13-10 7 14z" fill="#F7CF5A" stroke="#7A5C10" stroke-width="2" stroke-linejoin="round"/><rect x="30" y="29" width="40" height="7" rx="2" fill="#E5A81F"/></svg>`,
  init:n=>({dl:n-1,hands:Array(n).fill(''),tp:'',tc:0,tr:-1,lead:-1,pa:'0'.repeat(n),fin:'',order:'',ph:'play',sw:null,sc:Array(n).fill(0),rd:0,last:''}),
  start:(d,base)=>c2prDeal(d),
  mask:c2shMask,
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2prDeal(d),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.sc.map(x=>x),
  winText:d=>d.win!=null?`فاز ${nm(d,d.win)} بـ${d.sc[d.win]} نقطة بعد 5 جولات`:null,
  onSkip(nd,d){if(nd.win!=null)return nd;let x=nd;if(x.ph==='swap'){return {...x,sw:null,ph:'play',turn:nextSeat(x,d.turn)};}
    if(x.ph==='play'){if(x.out[d.turn]==='1'){const left=x.pl.map((_,s)=>s).filter(s=>c2prActive(x,s));if(left.length<=1)return c2prEnd({...x,fin:x.fin+left.join('')});return c2prTurn(x,d.turn);}}return x;},
  onTimeout(d){if(d.ph==='sum')return c2prNextR(d);if(d.ph==='swap'){const H=cardsOf(d.hands[d.turn]);return c2prGive(d,H.slice(0,d.sw[0].k));}
    if(d.tc)return c2prPass(d);const H=cardsOf(d.hands[d.turn]);return c2prPlay(d,[H[0]]);},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+`انتهت الجولة ${d.rd} من 5`;
    if(d.ph==='swap')return s+c2shWho(d,ctx)+`: اختر ${d.sw[0].k===2?'ورقتين':'ورقة'} تعطيها لـ${nm(d,d.sw[0].to)}`;
    return s+c2shWho(d,ctx)+(d.tc?`: اغلب ${d.tc>1?d.tc+' × ':''}${d.tp[0]==='T'?'10':d.tp[0]} أو باس`:': ابدأ لمّة جديدة')+` <small>• جولة ${d.rd+1} من 5</small>`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v;const sel=my?c2shSel(d,c2prKeyT):[];const n=d.pl.length;
    const tl=s=>{const i=d.order?d.order.indexOf(String(s)):-1;return i>=0?` <u>${c2prTitle(n,i)}</u>`:'';};
    let h=`<div class="c2">${c2shSeats(d,{x:s=>`${d.fin.includes(String(s))?' ✓':d.pa[s]==='1'?' <em>باس</em>':''}${tl(s)}`,done:s=>d.fin.includes(String(s))})}
      <div class="sh-tab"><div class="sh-pile">${d.tp?cardsOf(d.tp).map(c=>`<span class="sh-top" data-k="t${c}">${c2Card(c,true)}</span>`).join(''):'<p class="note" style="color:#fff">لمّة جديدة</p>'}</div>${d.tp&&d.lead>=0?`<span class="sh-suit">${nm(d,d.lead)}</span>`:''}</div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>نتيجة الجولة ${d.rd}</h3>${r.ord.map((s,i)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>${c2prTitle(r.ord.length,i)}</em><b>+${r.ord.length-1-i} → ${d.sc[s]}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;return h+'</div>';}
    if(my&&d.ph==='swap'){const k=d.sw[0].k;h+=`<div class="row bopts"><button class="btn green" data-ga="give" ${sel.length===k?'':'disabled'}>أعطِ ${nm(d,d.sw[0].to)} (${sel.length}/${k})</button></div>`;}
    else if(my)h+=`<div class="row bopts"><button class="btn green" data-ga="play" ${c2prOk(d,sel)?'':'disabled'}>نزّل${sel.length?' ('+sel.length+')':''}</button>${d.tc?'<button class="btn navy" data-ga="pass">باس</button>':''}</div>`;
    if(v>=0&&d.hands[v]!=null&&d.hands[v]){const H=cardsOf(d.hands[v]);const L=d.ph==='swap'?H:H.filter(c=>{if(!d.tc)return true;return prR(c)>d.tr&&H.filter(x=>x[0]===c[0]).length>=d.tc;});h+=c2shHand(d,v,L,my,sel);}
    return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2prNextR(d));return;}const s=d.turn;
    if(a==='card'){const c=cardsOf(d.hands[s])[i];if(!c)return;if(d.ph==='swap'){const k=d.sw[0].k;c2shToggle(d,c2prKeyT,c,sl=>sl.length<k);return;}c2shToggle(d,c2prKeyT,c,sl=>sl.length<4&&sl.every(x=>x[0]===c[0]));return;}
    if(a==='give'&&d.ph==='swap'){const cs=c2shSel(d,c2prKeyT);if(cs.length!==d.sw[0].k)return;S.sel=[];act(c2prGive(d,cs));return;}
    if(a==='pass'&&d.ph==='play'&&d.tc){S.sel=[];act(c2prPass(d));return;}
    if(a==='play'&&d.ph==='play'){const cs=c2shSel(d,c2prKeyT);if(!c2prOk(d,cs))return;S.sel=[];act(c2prPlay(d,cs));}}};
HELP.c_pres='الورق كله يتوزع. الترتيب من الأصغر: 3، 4 … الشايب، الإكة، وأكبر ورقة الاثنين. في أول جولة يبدأ اللي معه 3 سباتي. اللي يبدأ ينزّل ورقة وحدة أو أكثر من نفس الرقم (لين 4)، واللي بعده لازم ينزّل نفس العدد من رقم أعلى أو يقول باس (وما يرجع لهالمّة). لما الكل يقول باس، آخر واحد نزّل يبدأ لمّة جديدة. ترتيب الخلاص يحدد الألقاب: الأول الرئيس، الثاني الوزير، والأخير الشعب. من الجولة الثانية: الشعب يعطي الرئيس أفضل ورقتين عنده والرئيس يرجّع له ورقتين يختارها، ونائب الشعب يعطي الوزير أفضل ورقة والوزير يرجّع له ورقة (مع 4 لاعبين وأكثر). والشعب يبدأ اللعب. كل جولة تاخذ نقاط حسب ترتيبك (الأول أكثر)، وبعد 5 جولات يفوز صاحب أكثر نقاط.';
// the bot: leads its lowest set, beats with the smallest set that does not break a bigger one, keeps 2s and aces for the end,
// and gives back its lowest cards
GAMES.c_pres.bot=(d,s,lv)=>{if(d.ph==='sum')return c2prNextR(d);const H=cardsOf(d.hands[s]);
  if(d.ph==='swap')return c2prGive(d,H.slice(0,d.sw[0].k));
  const by={};for(const c of H)(by[c[0]]=by[c[0]]||[]).push(c);const ranks=Object.keys(by).sort((a,b)=>C2PR_R.indexOf(a)-C2PR_R.indexOf(b));
  if(lv===1&&Math.random()<.3){if(d.tc)return c2prPass(d);return c2prPlay(d,by[ranks[0]]);}
  if(!d.tc){// lead the lowest rank as a whole set; near the end a high card first so the last cards are not stuck
    if(ranks.length===2&&lv>1&&C2PR_R.indexOf(ranks[1])>=11)return c2prPlay(d,by[ranks[1]]);return c2prPlay(d,by[ranks[0]]);}
  const ok=ranks.filter(r=>C2PR_R.indexOf(r)>d.tr&&by[r].length>=d.tc);if(!ok.length)return c2prPass(d);
  const exact=ok.filter(r=>by[r].length===d.tc),r=(exact.length&&lv>1?exact:ok)[0];
  const hi=C2PR_R.indexOf(r)>=11,many=H.length>6;if(hi&&many&&lv>1&&cardsOf(d.hands[d.lead]||'').length>3&&Math.random()<.6)return c2prPass(d);
  return c2prPlay(d,by[r].slice(0,d.tc));};
GAMES.c_pres.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(600);

/* =================================================================
   كونكان (Gulf rummy, the rules Jawaker plays): two packs and two jokers (three of each from 6 players), 14 cards each;
   the starter draws first. Draw from the stock or take the top discard (only to put it down at once in a meld). Melds are
   runs of one suit (3+, ace low or high) or groups of one rank in different suits (3 or 4), one joker at most each.
   The first laydown must reach 51 and hold at least one run; after that you may lay any meld, add to anyone's melds and
   swap a joker for the card it stands for. Every turn ends with a discard; the first out wins the round.
   Score: the winner -30, an unopened hand +100, the others the cards they hold (ace 11, pictures 10, joker 15).
   A full hand (all down at once, nothing laid before) doubles it, and so does a «كونكان» (a run of 10 and a group of 4,
   or a run of 11 and a group of 3); a كونكان in the fifth round wins the game outright. Five rounds, lowest total wins.
   ================================================================= */
const C2KK_REQ=51;
function c2kkDealCore(n){const dk=hDeck(n);const hands=[];let k=0;for(let s=0;s<n;s++){hands.push(hSortHand(dk.slice(k,k+14).join('')));k+=14;}
  return {hands,dk:dk.slice(k).join(''),disc:'',melds:[],op:'0'.repeat(n),ph:'draw',took:'',ld:-1,tc:0,lo:false,op0:-1,sum:null};}
function c2kkRound(d){const n=d.pl.length;let st=(d.dl+1)%n;if(d.out[st]==='1')st=nextSeat(d,st);
  return {...d,...c2kkDealCore(n),turn:st,last:`الجولة ${d.r} من 5: ${nm(d,st)} يبدأ`};}
// a konkan: the cards laid this turn are one run of 10 with a group of 4, or one run of 11 with a group of 3
const c2kkIsKonkan=groups=>{if(groups.length!==2)return false;const m=groups.map(hMeld);if(m.some(x=>!x))return false;const r=m.find(x=>x.t==='r'),g=m.find(x=>x.t==='g');
  return !!r&&!!g&&((r.c.length===10&&g.c.length===4)||(r.c.length===11&&g.c.length===3));};
function c2kkEnd(d,w,full,konkan){const n=d.pl.length,mul=full||konkan?2:1;
  const pts=d.pl.map((_,s)=>{if(d.out[s]==='1')return 0;if(s===w)return -30*mul;if(d.op[s]!=='1')return 100*mul;return cardsOf(d.hands[s]).reduce((x,c)=>x+hPen(c),0)*mul;});
  const tot=d.tot.map((x,s)=>x+pts[s]);
  const nd={...d,tot,ph:'sum',sum:{w,full:!!full,konkan:!!konkan,pts},turn:w,last:`${nm(d,w)} خلّص${konkan?' بكونكان! 👑':full?' هند كامل! 🔥':''}`};
  if(konkan&&d.r>=5)return {...nd,win:w,wins:[w]};
  if(d.r>=5){const al=d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1');if(d.tm){const ts=[...new Set(al.map(s=>d.tm[s]))],tt=ts.map(t=>al.filter(s=>d.tm[s]===t).reduce((a,s)=>a+tot[s],0)),mn=Math.min(...tt);const t=ts[tt.indexOf(mn)];const ws=al.filter(s=>d.tm[s]===t);return {...nd,win:ws[0],wins:ws};}
    const mn=Math.min(...al.map(s=>tot[s])),ws=al.filter(s=>tot[s]===mn);return {...nd,win:ws[0],wins:ws};}
  return nd;}
function c2kkDraw(d,fromDisc){const t=d.turn;let dk=d.dk,disc=d.disc,last;const hands=[...d.hands];
  if(fromDisc){const c=disc.slice(-2);hands[t]=hSortHand(hands[t]+c);return {...d,hands,disc:disc.slice(0,-2),ph:'play',took:c,last:`${nm(d,t)} أخذ ${hJ(c)?'الجوكر':'ورقة الأرض'}`};}
  if(!dk.length){const top=disc.slice(-2);dk=shuffle(cardsOf(disc.slice(0,-2))).join('');disc=top;last='خلص السحب، انخلطت الأرض من جديد';}
  const c=dk.slice(0,2);hands[t]=hSortHand(hands[t]+c);return {...d,hands,dk:dk.slice(2),disc,ph:'play',took:'',last:last||`${nm(d,t)} سحب`};}
function c2kkDiscard(d,c){const t=d.turn,hc=cardsOf(d.hands[t]),i=hc.indexOf(c);if(i<0)return null;hc.splice(i,1);
  const hands=[...d.hands];hands[t]=hc.join('');const nd={...d,hands,disc:d.disc+c,took:'',ld:t};
  if(!hc.length)return c2kkEnd(nd,t,d.op0===0&&!d.lo,!!d.kk);
  return {...nd,ph:'draw',turn:nextSeat(d,t),tc:0,lo:false,op0:-1,kk:false,last:`${nm(d,t)} رمى ${hJ(c)?'جوكر':''}`.trim()};}
// lay meld groups from the hand (the opening rules checked here)
function c2kkLay(d,groups){const t=d.turn;let hc=cardsOf(d.hands[t]);const melds=[...d.melds];let val=0,run=false;
  for(const g of groups){for(const c of g){const i=hc.indexOf(c);if(i<0)return {err:'الورق مو عندك'};hc.splice(i,1);}
    const m=hMeld(g);if(!m)return {err:'هذي مو مجموعة صحيحة'};melds.push({...m,o:t});val+=hValue(m);if(m.t==='r')run=true;}
  if(!hc.length)return {err:'لازم تخلي ورقة ترميها'};
  const opening=d.op[t]!=='1';
  if(opening&&val<C2KK_REQ)return {err:`أول نزول لازم يكون ${C2KK_REQ} أو أكثر (مجموعك ${val})`};
  if(opening&&!run)return {err:'أول نزول لازم يكون فيه تسلسل واحد على الأقل'};
  if(d.took&&!groups.some(g=>g.includes(d.took)))return {err:'لازم تنزّل ورقة الأرض اللي أخذتها'};
  const hands=[...d.hands];hands[t]=hc.join('');
  return {d:{...d,hands,melds,op:setAt(d.op,t,'1'),tc:(d.tc||0)+1,op0:d.op0<0?(opening?0:1):d.op0,kk:opening&&hc.length===1&&c2kkIsKonkan(groups),
    took:d.took&&groups.some(g=>g.includes(d.took))?'':d.took,last:`${nm(d,t)} نزّل ${groups.length===1?'مجموعة':groups.length+' مجموعات'}${opening?` بـ ${val}`:''}`}};}
const c2kkKey=d=>d.gid+':'+d.r+':'+d.turn+':'+d.hands[d.turn]+d.melds.length;
GAMES.c_konkan={name:'كونكان',cat:'cards',lbc:'#7B2D4F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7B2D4F"/><circle cx="50" cy="50" r="40" fill="#8E3A5E"/>${[0,1,2,3].map(k=>`<rect x="${14+k*18}" y="${30+k*3}" width="22" height="32" rx="3" fill="#fff" stroke="#5A1F39" stroke-width="1.2"/><text x="${25+k*18}" y="${51+k*3}" font-size="13" font-weight="800" text-anchor="middle" fill="${k%2?'#D43C33':'#2D4763'}">${['9','10','J','Q'][k]}</text>`).join('')}<rect x="28" y="74" width="44" height="14" rx="7" fill="#F0B429"/><text x="50" y="85" font-size="11" font-weight="900" text-anchor="middle" fill="#5A1F39">51</text></svg>`,
  init:n=>({dl:n-1,...c2kkDealCore(n),tot:Array(n).fill(0),r:1,last:'الجولة 1 من 5'}),
  start:(d,base)=>c2kkRound({...d,dl:(base.turn+d.pl.length-1)%d.pl.length}),
  hide:{seat:['hands'],all:['dk']},net:{ui:['kk']},
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2kkRound(d),last:`انعادت الجولة ${d.r} من جديد`},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.pl.map((_,s)=>`${cardsOf(d.hands[s]).length} ورقة${d.tot[s]?` • ${d.tot[s]}`:''}`),
  winText:d=>d.win!=null?`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')}${d.sum&&d.sum.konkan&&d.r>=5?' بالكونكان 👑':' بأقل مجموع'}`:null,
  winExtra:d=>d.pl.map((_,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout(d){if(d.ph==='sum')return c2kkRound({...d,r:d.r+1,dl:nextSeat(d,d.dl)});let x=d;if(x.ph==='draw')x=c2kkDraw(x,false);
    if(x.took){const back=[...x.hands];const hc=cardsOf(back[x.turn]);const i=hc.indexOf(x.took);if(i>=0){hc.splice(i,1);back[x.turn]=hc.join('');x=c2kkDraw({...x,hands:back,disc:x.disc+x.took,took:''},false);}}
    const hc=cardsOf(x.hands[x.turn]);const c=hc.find(c=>!hJ(c))||hc[0];return c2kkDiscard(x,c);},
  onSkip(nd,d){if(nd.win!=null||nd.turn===d.turn||d.ph==='sum')return nd;const t=d.turn,hands=[...nd.hands];let disc=nd.disc;
    if(d.took){const hc=cardsOf(hands[t]);const i=hc.indexOf(d.took);if(i>=0){hc.splice(i,1);hands[t]=hc.join('');disc+=d.took;}}
    return {...nd,hands,disc,ph:'draw',took:'',tc:0,lo:false,op0:-1,kk:false,last:`${nm(d,t)} طلع`};},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='sum')return s+`انتهت الجولة ${d.r}`;
    return s+`${who}: ${d.ph==='draw'?'اسحب من الكومة أو خذ ورقة الأرض':d.took?'نزّل ورقة الأرض بمجموعة، وبعدها ارمِ ورقة':'نزّل أو أضف، وبعدها ارمِ ورقة'}<br><small>الجولة ${d.r} من 5 • أول نزول ${C2KK_REQ} أو أكثر وفيه تسلسل</small>`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my;const k=c2kkKey(d);
    if(!S.kk||S.kk.k!==k)S.kk={k,sel:[],pend:[]};const U=S.kk;let h='';
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>${nm(d,r.w)} خلّص الجولة ${d.r}${r.konkan?' بكونكان 👑':r.full?' بهند كامل':''}</h3>${d.pl.map((_,s)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>${r.pts[s]>0?'+':''}${r.pts[s]}${d.op[s]!=='1'&&s!==r.w?' <small>ما نزّل</small>':''}</em><b>${d.tot[s]}</b></div>`).join('')}
      ${my&&d.win==null?'<button class="big green" data-ga="nextr">الجولة التالية</button>':''}</div>`;return h;}
    const top=d.disc.slice(-2);const canDraw=my&&d.ph==='draw';
    h+=`<div class="htable"><div class="hpile"><button class="hstock" data-ga="stock" ${canDraw?'':'disabled'}><div class="card back"></div><small>${d.dk.length/2}</small></button>
      <${canDraw&&top?'button':'div'} class="hdisc" ${canDraw&&top?'data-ga="take"':''}><span class="hdk" data-k="h${d.disc.length}">${top?hCard(top):'<div class="card hempty"></div>'}</span><small>${d.ld>=0&&top&&d.pl[d.ld]!=null?`رماها ${nm(d,d.ld)}`:'الأرض'}</small></${canDraw&&top?'button':'div'}></div>`;
    if(d.melds.length){const selC=U.sel.map(i=>cardsOf(d.hands[d.turn])[i]);const canAdd=my&&d.ph==='play'&&d.op[d.turn]==='1'&&!d.took&&selC.length;
      h+=`<div class="hmelds">${d.melds.map((m,i)=>{const ok=canAdd&&((selC.length===1&&hAdd(m,selC[0]))||hSwap(m,selC));
        return `<${ok?'button':'div'} class="hm ${ok?'can':''}" style="--c:${col(d,m.o)}" ${ok?`data-ga="add" data-i="${i}"`:''}>${m.c.map((c,j)=>hMini(j===m.jk?'XX':c)).join('')}</${ok?'button':'div'}>`;}).join('')}</div>`;}
    h+='</div>';
    if(my&&U.pend.length){const val=U.pend.reduce((x,g)=>x+hValue(hMeld(g)),0),run=U.pend.some(g=>hMeld(g).t==='r');
      h+=`<div class="panel hpend"><div class="hmelds">${U.pend.map(g=>`<div class="hm">${hMeld(g).c.map((c,j)=>hMini(j===hMeld(g).jk?'XX':c)).join('')}</div>`).join('')}</div>
        <p class="note">المجموع ${val} من ${C2KK_REQ}${run?'':' • يبي تسلسل'}</p><div class="row"><button class="btn green" data-ga="confirm">ثبّت النزول</button><button class="btn" data-ga="cancel">تراجع</button></div></div>`;}
    const show=v>=0?v:null;if(show==null)return h;
    const all=cardsOf(d.hands[show]);const taken=all.map(()=>false);
    if(show===d.turn)for(const g of U.pend)for(const c of g){const i=all.findIndex((x,j)=>x===c&&!taken[j]);if(i>=0)taken[i]=true;}
    const idx=all.map((_,i)=>i).filter(i=>!taken[i]);const act2=my&&show===d.turn&&d.ph==='play';const ids=handIds(all,'kk'+show+'-');
    h+=`<p class="lbl" style="text-align:center">ورقك ${d.op[show]==='1'?'<small>(نزّلت)</small>':''}</p><div class="hand hhand">${idx.map(i=>`<button class="hc ${U.sel.includes(i)?'sel':''} ${d.took&&all[i]===d.took&&show===d.turn?'took':''}" id="${ids[i]}" ${act2?`data-ga="sel" data-i="${i}"`:'disabled'}>${hCard(all[i])}</button>`).join('')}</div>`;
    if(act2){const sel=U.sel.map(i=>all[i]);const m=sel.length>=3?hMeld(sel):null;
      h+=`<div class="row hact"><button class="btn green" data-ga="meld" ${m?'':'disabled'}>نزّل${m?` (${hValue(m)})`:''}</button><button class="btn red" data-ga="disc" ${sel.length===1&&!U.pend.length?'':'disabled'}>ارمِ</button>${d.took&&d.tc===0&&!U.pend.length?'<button class="btn" data-ga="back">رجّع ورقة الأرض</button>':''}</div>`;}
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;const t=d.turn;const U=S.kk&&S.kk.k===c2kkKey(d)?S.kk:(S.kk={k:c2kkKey(d),sel:[],pend:[]});
    if(a==='nextr'&&d.ph==='sum'&&d.win==null){act(c2kkRound({...d,r:d.r+1,dl:nextSeat(d,d.dl)}));return;}
    if(a==='stock'&&d.ph==='draw'){act(c2kkDraw(d,false));return;}
    if(a==='take'&&d.ph==='draw'&&d.disc){act(c2kkDraw(d,true));return;}
    if(d.ph!=='play')return;const all=cardsOf(d.hands[t]);
    if(a==='sel'){if(!all[i])return;const j=U.sel.indexOf(i);if(j>=0)U.sel.splice(j,1);else U.sel.push(i);render();return;}
    if(a==='back'&&d.took&&d.tc===0){const hands=[...d.hands];const hc=cardsOf(hands[t]);if(hc.indexOf(d.took)<0)return;hc.splice(hc.indexOf(d.took),1);hands[t]=hc.join('');S.kk=null;act({...d,hands,disc:d.disc+d.took,took:'',ph:'draw',last:`${nm(d,t)} رجّع ورقة الأرض`});return;}
    if(a==='cancel'){U.pend=[];U.sel=[];render();return;}
    if(a==='meld'){const sel=U.sel.map(x=>all[x]);if(sel.some(c=>!c)||!hMeld(sel))return;
      if(d.op[t]==='1'){const r=c2kkLay(d,[sel]);if(r.err){toast(r.err);return;}S.kk=null;act(r.d);return;}
      U.pend.push(sel);U.sel=[];render();return;}
    if(a==='confirm'){const r=c2kkLay(d,U.pend);if(r.err){toast(r.err);return;}S.kk=null;act(r.d);return;}
    if(a==='add'){const sel=U.sel.map(x=>all[x]);const m=d.melds[i];if(!m||d.op[t]!=='1'||sel.some(c=>!c))return;
      if(d.took){toast(sel.includes(d.took)?'ورقة الأرض تنزل بمجموعة جديدة، ما تنضاف':'نزّل ورقة الأرض أول');return;}
      let nm2=sel.length===1?hAdd(m,sel[0]):null;let gain=[];if(!nm2){nm2=hSwap(m,sel);if(nm2)gain=['XX'];}
      if(!nm2)return;const hc=[...all];for(const c of sel)hc.splice(hc.indexOf(c),1);hc.push(...gain);
      if(!hc.length){toast('لازم تخلي ورقة ترميها');return;}
      const melds=[...d.melds];melds[i]={...nm2,o:m.o};const hands=[...d.hands];hands[t]=hSortHand(hc.join(''));
      S.kk=null;act({...d,hands,melds,tc:(d.tc||0)+1,lo:d.lo||m.o!==t,last:gain.length?`${nm(d,t)} أخذ الجوكر`:`${nm(d,t)} أضاف ورقة`});return;}
    if(a==='disc'){if(U.pend.length){toast('ثبّت النزول أو تراجع عنه أول');return;}if(d.took){toast('لازم تنزّل ورقة الأرض اللي أخذتها');return;}
      const c=all[U.sel[0]];if(!c)return;const nd=c2kkDiscard(d,c);if(nd){S.kk=null;act(nd);}}}};
HELP.c_konkan='كونكان بقوانين الخليج: كوتشينتين مع جوكرين (ومن 6 لاعبين ثلاث كوتشينات وثلاث جواكر)، وكل لاعب ياخذ 14 ورقة، واللي يبدأ يسحب أول. في دورك تسحب من الكومة أو تاخذ آخر ورقة مرمية (بس إذا بتنزلها على طول في مجموعة). المجموعات: تسلسل من نفس النوع (3 أوراق أو أكثر، والإكة تجي قبل 2 أو بعد الشايب) أو نفس الرقم من أنواع مختلفة (3 أو 4)، والجوكر يعوّض ورقة وحدة بالمجموعة. أول نزول لازم مجموعه 51 أو أكثر (الإكة 11 والصور 10) ولازم يكون فيه تسلسل واحد على الأقل. بعد ما تنزل تقدر تنزّل أي مجموعة، وتضيف على مجموعاتك ومجموعات غيرك، وتبدّل الجوكر بالورقة اللي يمثلها. كل دور تخلصه برمي ورقة، وأول من يخلص ورقه يفوز بالجولة. الحساب: الفايز ‎-30، اللي ما نزّل +100، والباقين مجموع ورقهم (الإكة 11، الصور 10، الجوكر 15). الهند (تنزل كل ورقك مرة وحدة بدون ما نزّلت قبل) يضاعف الحساب، والكونكان (تسلسل 10 أوراق مع أربع متشابهة، أو تسلسل 11 مع ثلاث متشابهة) بعد يضاعفه، وإذا جبت الكونكان في الجولة الخامسة تفوز باللعبة على طول. بعد 5 جولات يفوز صاحب أقل مجموع.';
// the bot: hand.js's meld finder, with the opening bar of 51 and a run in it
function c2kkBest(cs,must,needRun){const b=hBest(cs,must);if(!needRun||b.sets.some(z=>hMeld(z.g).t==='r'))return b;
  // the richest split that keeps a run: try each run candidate first
  const runs=hCands(cs).filter(x=>hMeld(x.g)&&hMeld(x.g).t==='r');let best={p:0,sets:[],v:0};
  for(const r of runs.slice(0,30)){const rest=[...cs];let ok=true;for(const c of r.g){const i=rest.indexOf(c);if(i<0){ok=false;break;}rest.splice(i,1);}if(!ok||rest.length<1)continue;
    const b2=hBest(rest,must&&!r.g.includes(must)?must:undefined);const tot={p:b2.p+r.p,sets:[r,...b2.sets],v:b2.v+r.v};if(tot.p>best.p)best=tot;}
  return best;}
GAMES.c_konkan.bot=(d,s,lv)=>{if(d.ph==='sum')return c2kkRound({...d,r:d.r+1,dl:nextSeat(d,d.dl)});
  let x=d;const t=d.turn,opened=()=>x.op[t]==='1';
  if(x.ph==='draw'){const top=x.disc.slice(-2);
    if(top&&Math.random()<[0,.4,.85,1][lv]&&(!hJ(top)||lv>1)){const b=c2kkBest([...cardsOf(x.hands[t]),top],top,!opened());if(b.sets.length&&(opened()||b.v>=C2KK_REQ))return c2kkDraw(x,true);}
    return c2kkDraw(x,false);}
  if(x.took){const b=c2kkBest(cardsOf(x.hands[t]),x.took,!opened());const r=b.sets.length&&(opened()||b.v>=C2KK_REQ)?c2kkLay(x,b.sets.map(z=>z.g)):null;
    if(r&&r.d)x=r.d;else{const hc=cardsOf(x.hands[t]),back=[...x.hands];hc.splice(hc.indexOf(x.took),1);back[t]=hc.join('');x=c2kkDraw({...x,hands:back,disc:x.disc+x.took,took:'',ph:'draw'},false);}}
  const play=lv>1||Math.random()<.6;
  if(play&&opened()&&!x.took)for(let i=0;i<x.melds.length;i++){const m=x.melds[i];if(m.jk<0)continue;const hc=cardsOf(x.hands[t]);
    const tries=m.t==='r'?[[m.c[m.jk]]]:(()=>{const nat=m.c.filter((_,j)=>j!==m.jk),miss='shdc'.split('').filter(q=>!nat.some(c=>c[1]===q)).map(q=>nat[0][0]+q);return nat.length===2?[miss]:miss.map(c=>[c]);})();
    for(const cs of tries){if(!cs.every(c=>hc.includes(c))||hc.length-cs.length<1)continue;const nm2=hSwap(m,cs);if(!nm2)continue;
      const h2=[...hc];cs.forEach(c=>h2.splice(h2.indexOf(c),1));h2.push('XX');const melds=[...x.melds];melds[i]={...nm2,o:m.o};const hands=[...x.hands];hands[t]=hSortHand(h2.join(''));
      x={...x,melds,hands,tc:(x.tc||0)+1,lo:x.lo||m.o!==t,last:`${nm(x,t)} أخذ الجوكر`};break;}}
  if(play&&!x.took){const b=c2kkBest(cardsOf(x.hands[t]),undefined,!opened());if(b.sets.length&&(opened()||b.v>=C2KK_REQ)){const r=c2kkLay(x,b.sets.map(z=>z.g));if(r.d)x=r.d;}}
  if(play&&opened()){let ch=true,g=0;while(ch&&g++<20){ch=false;const h2=cardsOf(x.hands[t]);if(h2.length<=1)break;
    for(const c of h2){if(hJ(c)||c===x.took)continue;for(let i=0;i<x.melds.length;i++){const m2=hAdd(x.melds[i],c);if(!m2)continue;
      const melds=[...x.melds];melds[i]={...m2,o:x.melds[i].o};const h3=[...h2];h3.splice(h3.indexOf(c),1);const hands=[...x.hands];hands[t]=h3.join('');
      x={...x,melds,hands,tc:(x.tc||0)+1,lo:x.lo||x.melds[i].o!==t,last:`${nm(x,t)} أضاف ورقة`};ch=true;break;}if(ch)break;}}}
  const hc=cardsOf(x.hands[t]);const keep=opened()?[]:c2kkBest(hc,undefined,true).sets.flatMap(z=>z.g);const kc=hCnt(keep);
  const free=hc.filter(c=>{if(kc[c]){kc[c]--;return false;}return !hJ(c);});const pool=free.length?free:hc.filter(c=>!hJ(c)).length?hc.filter(c=>!hJ(c)):hc;
  const rush=x.pl.some((_,o)=>o!==t&&x.out[o]!=='1'&&x.op[o]==='1'&&cardsOf(x.hands[o]).length<=4);
  const cost=c=>hNear(c,hc.filter((_,j)=>j!==hc.indexOf(c)))*5-hPen(c)*(rush?.6:.25)+(lv===1?Math.random()*6:0);
  const dc=pool.slice().sort((a,b)=>cost(a)-cost(b))[0]||hc[0];
  return c2kkDiscard(x,dc)||x;};
GAMES.c_konkan.botDelay=(d,s,lv)=>d.ph==='sum'?8000:BOTMS[lv]+rnd(600);

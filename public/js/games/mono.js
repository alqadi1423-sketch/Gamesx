'use strict';
/* monopoly with saudi cities: buy, rent, build, jail, cards, bankruptcy */
const MP=[['go','انطلاق'],['p','الزلفي',60,0,[2,10,30,90,160,250],50],['cc','صندوق'],['p','الخرج',60,0,[4,20,60,180,320,450],50],['tax','ضريبة الدخل',200],
['rr','محطة الرياض',200],['p','حائل',100,1,[6,30,90,270,400,550],50],['ch','حظ'],['p','تبوك',100,1,[6,30,90,270,400,550],50],['p','الجوف',120,1,[8,40,100,300,450,600],50],
['jail','السجن'],['p','نجران',140,2,[10,50,150,450,625,750],100],['ut','الكهرباء',150],['p','جازان',140,2,[10,50,150,450,625,750],100],['p','أبها',160,2,[12,60,180,500,700,900],100],
['rr','محطة القصيم',200],['p','بريدة',180,3,[14,70,200,550,750,950],100],['cc','صندوق'],['p','الأحساء',180,3,[14,70,200,550,750,950],100],['p','الطائف',200,3,[16,80,220,600,800,1000],100],
['fp','استراحة'],['p','ينبع',220,4,[18,90,250,700,875,1050],150],['ch','حظ'],['p','الجبيل',220,4,[18,90,250,700,875,1050],150],['p','الخبر',240,4,[20,100,300,750,925,1100],150],
['rr','محطة الدمام',200],['p','الدمام',260,5,[22,110,330,800,975,1150],150],['p','العلا',260,5,[22,110,330,800,975,1150],150],['ut','المياه',150],['p','الظهران',280,5,[24,120,360,850,1025,1200],150],
['gtj','روح السجن'],['p','أبحر',300,6,[26,130,390,900,1100,1275],200],['p','جدة',300,6,[26,130,390,900,1100,1275],200],['cc','صندوق'],['p','القدية',320,6,[28,150,450,1000,1200,1400],200],
['rr','محطة جدة',200],['ch','حظ'],['p','الرياض',350,7,[35,175,500,1100,1300,1500],200],['tax','ضريبة الرفاهية',100],['p','نيوم',400,7,[50,200,600,1400,1700,2000],200]];
const MGC=['#8B5A2B','#7CC6F2','#D3549E','#F08A24','#E5483F','#F2C230','#2FA35B','#2D4FA0'];
const MGRP=MGC.map((_,g)=>MP.map((q,i)=>q[0]==='p'&&q[3]===g?i:-1).filter(i=>i>=0));
const MRR=[5,15,25,35],MUT=[12,28];
/* the two official decks, adapted to the Saudi board (Boardwalk = نيوم, Illinois = الخبر, St. Charles = نجران, Reading = محطة الرياض) */
const MCH=[['تقدّم إلى نيوم',{to:39}],['تقدّم إلى الانطلاق وخذ 200',{to:0}],['تقدّم إلى الخبر، وإذا مريت الانطلاق خذ 200',{to:24}],['تقدّم إلى نجران، وإذا مريت الانطلاق خذ 200',{to:11}],
['تقدّم إلى أقرب محطة، وإذا كانت مملوكة ادفع ضعف إيجارها',{near:'rr',x2:1}],['تقدّم إلى أقرب محطة، وإذا كانت مملوكة ادفع ضعف إيجارها',{near:'rr',x2:1}],
['تقدّم إلى أقرب شركة، وإذا كانت مملوكة ارمِ الزهر وادفع 10 أضعافه',{near:'ut',u10:1}],['البنك يصرف لك أرباح 50',{cash:50}],['بطاقة خروج من السجن مجانًا 🎫',{free:1}],
['ارجع 3 خانات',{back:3}],['روح السجن مباشرة 🚔',{jail:1}],['صيانة عامة: ادفع 25 عن كل بيت و100 عن كل فندق',{repair:[25,100]}],['مخالفة سرعة: ادفع 15',{cash:-15}],
['رحلة إلى محطة الرياض، وإذا مريت الانطلاق خذ 200',{to:5}],['انتخبوك رئيس مجلس الإدارة: ادفع لكل لاعب 50',{each:-50}],['استحق قرضك العقاري: خذ 150',{cash:150}]];
const MCC=[['تقدّم إلى الانطلاق وخذ 200',{to:0}],['خطأ بنكي لصالحك: خذ 200',{cash:200}],['أتعاب طبيب: ادفع 50',{cash:-50}],['بعت أسهم: خذ 50',{cash:50}],['بطاقة خروج من السجن مجانًا 🎫',{free:1}],
['روح السجن مباشرة 🚔',{jail:1}],['استحق صندوق الإجازة: خذ 100',{cash:100}],['استرجاع ضريبة: خذ 20',{cash:20}],['عيد ميلادك: كل لاعب يعطيك 10',{each:10}],['استحق التأمين: خذ 100',{cash:100}],
['فاتورة مستشفى: ادفع 100',{cash:-100}],['رسوم مدرسة: ادفع 50',{cash:-50}],['أتعاب استشارة: خذ 25',{cash:25}],['صيانة الشوارع: ادفع 40 عن كل بيت و115 عن كل فندق',{repair:[40,115]}],
['فزت بالمركز الثاني في مسابقة: خذ 10',{cash:10}],['ورثت 100',{cash:100}]];
const MHOUSES=32,MHOTELS=12;
const mHousesOut=d=>[...d.hs].reduce((x,h)=>x+(h!=='5'?+h:0),0),mHotelsOut=d=>[...d.hs].filter(h=>h==='5').length;
const isProp=i=>['p','rr','ut'].includes(MP[i][0]);
const mPrice=i=>MP[i][2];
function mDraft(d){return {...d,pos:[...d.pos],cash:[...d.cash],jail:[...d.jail],free:[...d.free],fr:{...(d.fr||{ch:-1,cc:-1})},dk:{...(d.dk||mDecks())},log:[]};}
/* only the cards already drawn from each deck are kept; the next card is picked at random when it is drawn, so the state never tells what comes next */
function mDecks(){return {ch:[],cc:[]};}
function mDrawCard(x,t){const D=t==='ch'?MCH:MCC,held=j=>D[j][1].free&&x.fr[t]>=0;let used=(x.dk[t]||[]).filter(j=>j<D.length);
  let left=[...D.keys()].filter(j=>!used.includes(j)&&!held(j));if(!left.length){used=[];left=[...D.keys()].filter(j=>!held(j));}
  const idx=left[rnd(left.length)];x.dk={...x.dk,[t]:[...used,idx]};return idx;}
function mRent(d,i,dice,mod){const sq=MP[i],o=d.own[i];if(d.mg[i]==='1')return 0;
  if(sq[0]==='rr')return 25*2**(MRR.filter(j=>d.own[j]===o).length-1)*(mod&&mod.x2?2:1);
  if(sq[0]==='ut')return mod&&mod.u10?mod.u10*10:dice*(MUT.every(j=>d.own[j]===o)?10:4);
  const h=+d.hs[i];if(h)return sq[4][h];return sq[4][0]*(MGRP[sq[3]].every(j=>d.own[j]===o)?2:1);}
function mBust(x,s,to){x.out=setAt(x.out,s,'1');let own=x.own,hs=x.hs,mg=x.mg;const heir=to!=null&&x.out[to]!=='1'?to:null;
  for(let i=0;i<40;i++)if(own[i]===String(s)){own=setAt(own,i,heir!=null?String(heir):'.');hs=setAt(hs,i,'0');if(heir==null)mg=setAt(mg,i,'0');}
  for(const k of ['ch','cc'])if(x.fr&&x.fr[k]===s){x.fr[k]=heir!=null?heir:-1;if(heir!=null)x.free[heir]++;}x.free[s]=0;
  x.own=own;x.hs=hs;x.mg=mg;x.cash[s]=0;x.log.push(`${nm(x,s)} أفلس 💸${heir!=null?` وراحت أملاكه لـ${nm(x,heir)}`:''}`);}
function mLiq(x,s){let guard=0;while(x.cash[s]<0&&guard++<80){let best=-1,bh=0;for(let i=0;i<40;i++)if(x.own[i]===String(s)&&+x.hs[i]>bh){bh=+x.hs[i];best=i;}
    if(best>=0){if(bh===5&&MHOUSES-mHousesOut(x)<4){x.hs=setAt(x.hs,best,'0');x.cash[s]+=MP[best][5]*5/2;continue;}x.hs=setAt(x.hs,best,String(bh-1));x.cash[s]+=MP[best][5]/2;continue;}
    const m=[...Array(40).keys()].find(i=>x.own[i]===String(s)&&x.mg[i]==='0');if(m==null)break;x.mg=setAt(x.mg,m,'1');x.cash[s]+=mPrice(m)/2;}
  }
function mPay(x,s,amt,to){if(amt<=0||x.out[s]==='1')return;x.cash[s]-=amt;mLiq(x,s);let paid=amt;if(x.cash[s]<0){paid=amt+x.cash[s];if(to!=null&&x.out[to]!=='1')x.cash[to]+=paid;mBust(x,s,to);return;}if(to!=null&&x.out[to]!=='1')x.cash[to]+=paid;}
function mGo(x,s,steps,path){let p=x.pos[s];for(let k=0;k<steps;k++){p=(p+1)%40;path.push(p);if(p===0){x.cash[s]+=200;x.log.push('مرّ على الانطلاق وأخذ 200');}}x.pos[s]=p;}
function mJail(x,s,path){x.pos[s]=10;path.push(10);x.jail[s]=1;x.dbl=0;x.jailed=true;}
function mLand(x,s,dice,path,depth,mod){if(x.out[s]==='1')return;const i=x.pos[s],sq=MP[i],t=sq[0];
  if(isProp(i)){const o=x.own[i];if(o==='.'){x.ph='buy';return;}const oi=+o;if(oi!==s&&x.out[oi]!=='1'){if(mod&&mod.u10&&sq[0]==='ut'){x.log.push(`رمى للشركة ${mod.u10}`);}const r=mRent(x,i,dice,mod);if(r>0){x.log.push(`دفع إيجار ${r} لـ${nm(x,oi)}`);mPay(x,s,r,oi);}else x.log.push('العقار مرهون، ما فيه إيجار');}}
  else if(t==='tax'){x.log.push(`دفع ${sq[1]} ${sq[2]}`);mPay(x,s,sq[2],null);}
  else if(t==='gtj'){x.log.push('على السجن 🚔');mJail(x,s,path);}
  else if(t==='cc'||t==='ch'){const D=t==='ch'?MCH:MCC,idx=mDrawCard(x,t);const c=D[idx],e=c[1];x.card=(t==='ch'?'حظ: ':'صندوق: ')+c[0];x.log.push('🃏 '+c[0]);
    if(e.to!=null){mGo(x,s,(e.to-x.pos[s]+40)%40,path);if(depth<3)mLand(x,s,dice,path,depth+1);}
    else if(e.back){x.pos[s]=(x.pos[s]+37)%40;path.push(x.pos[s]);if(depth<3)mLand(x,s,dice,path,depth+1);}
    else if(e.near){let st=1;while(MP[(x.pos[s]+st)%40][0]!==e.near)st++;mGo(x,s,st,path);if(depth<3)mLand(x,s,dice,path,depth+1,e.x2?{x2:1}:e.u10?{u10:2+rnd(6)+rnd(6)}:null);}
    else if(e.jail)mJail(x,s,path);
    else if(e.cash){if(e.cash>0)x.cash[s]+=e.cash;else mPay(x,s,-e.cash,null);}
    else if(e.each){for(const o of aliveSeats(x))if(o!==s){if(e.each>0)mPay(x,o,e.each,s);else mPay(x,s,-e.each,o);}}
    else if(e.free){x.free[s]++;x.fr[t]=s;}
    else if(e.repair){let h=0,ho=0;for(let j=0;j<40;j++)if(x.own[j]===String(s)){const v=+x.hs[j];if(v===5)ho++;else h+=v;}mPay(x,s,h*e.repair[0]+ho*e.repair[1],null);}}
}
function mWorth(d,s){let w=d.cash[s];for(let i=0;i<40;i++)if(d.own[i]===String(s))w+=(d.mg[i]==='1'?mPrice(i)/2:mPrice(i))+(+d.hs[i])*(MP[i][5]||0);return w;}
function mFin(x,d,s,path){if(x.out[s]==='1'&&d.out[s]!=='1'){x.ph='roll';x.again=false;x.dbl=0;x.turn=nextSeat(x,s,x.out);}
  const al=aliveSeats(x);if(al.length===1)x.win=al[0];
  x.last=x.log.join('، ');delete x.log;x.mv=path.length>1?{s,path,sid:(d.mv?d.mv.sid:0)+1}:d.mv;return x;}
function mRoll(d){const x=mDraft(d),s=d.turn,a=1+rnd(6),b=1+rnd(6),dbl=a===b,path=[d.pos[s]];x.dice=[a,b];x.rid=d.rid+1;x.card=null;x.jailed=false;
  x.log.push(`${nm(d,s)} رمى ${a} و${b}`);
  if(x.jail[s]){
    if(dbl){x.jail[s]=0;x.log.push('وطلع من السجن بالدبل');mGo(x,s,a+b,path);mLand(x,s,a+b,path,0);x.again=false;}
    else if(x.jail[s]>=3){x.log.push('ودفع 50 وطلع من السجن');mPay(x,s,50,null);x.jail[s]=0;if(x.out[s]!=='1'){mGo(x,s,a+b,path);mLand(x,s,a+b,path,0);}x.again=false;}
    else{x.jail[s]++;x.log.push('وما جاب دبل، باقي في السجن');x.again=false;x.ph='end';return mFin(x,d,s,path);}}
  else if(dbl&&d.dbl>=2){x.log.push('ثالث دبل! على السجن 🚔');mJail(x,s,path);x.again=false;}
  else{x.dbl=dbl?d.dbl+1:0;if(dbl)x.log.push('دبل!');mGo(x,s,a+b,path);mLand(x,s,a+b,path,0);x.again=dbl&&!x.jailed;}
  if(x.ph!=='buy')x.ph=x.again?'roll':'end';
  return mFin(x,d,s,path);}
function mAfterBuy(x){x.ph=x.again?'roll':'end';return x;}
function mBuy(d){const s=d.turn,i=d.pos[s];if(d.own[i]!=='.'||d.cash[s]<mPrice(i))return d;const x=mDraft(d);x.cash[s]-=mPrice(i);x.own=setAt(x.own,i,String(s));x.log=undefined;
  return mAfterBuy({...x,last:`${nm(d,s)} اشترى ${MP[i][1]} بـ ${mPrice(i)} 🏷️`,buyfx:(d.buyfx||0)+1});}
function mSkip(d){const i=d.pos[d.turn];return {...d,ph:'auc',auc:i,rd:(d.rd||0)+1,last:`${nm(d,d.turn)} ما اشترى ${MP[i][1]}، صار مزاد`};}
// sealed bids from everyone still playing; the highest pays, ties go to the first after the player whose turn it is
function mAuction(d,picks){const i=d.auc,n=d.pl.length;let best=-1,bw=0;
  for(let k=0;k<n;k++){const s=(d.turn+k)%n;if(d.out[s]==='1')continue;const b=Math.max(0,Math.min(+picks[s]||0,d.cash[s]));if(b>bw){bw=b;best=s;}}
  const bids=d.pl.map((_,s)=>d.out[s]==='1'?null:Math.max(0,Math.min(+picks[s]||0,d.cash[s])));
  if(best<0)return mAfterBuy({...d,auc:null,bids,last:`ما أحد زايد على ${MP[i][1]}، بقي للبنك`});
  const cash=[...d.cash];cash[best]-=bw;return mAfterBuy({...d,cash,own:setAt(d.own,i,String(best)),auc:null,bids,buyfx:(d.buyfx||0)+1,last:`${nm(d,best)} كسب المزاد على ${MP[i][1]} بـ ${bw} 🔨`});}
// trades: properties without buildings and cash, the other player accepts or refuses
const mTradeable=(d,s,i)=>isProp(i)&&d.own[i]===String(s)&&(MP[i][0]!=='p'||MGRP[MP[i][3]].every(j=>d.hs[j]==='0'));
function mTrade(d){const o=d.offer;const x={...d,cash:[...d.cash]};let own=d.own,cost=[0,0];
  for(const i of o.give){if(!mTradeable(d,o.from,i))return null;own=setAt(own,i,String(o.to));if(d.mg[i]==='1')cost[1]+=Math.ceil(mPrice(i)*.1);}
  for(const i of o.get){if(!mTradeable(d,o.to,i))return null;own=setAt(own,i,String(o.from));if(d.mg[i]==='1')cost[0]+=Math.ceil(mPrice(i)*.1);}
  x.cash[o.from]-=o.cash+cost[0];x.cash[o.to]+=o.cash-cost[1];if(x.cash[o.from]<0||x.cash[o.to]<0)return null;
  return {...x,own,offer:null,last:`صفقة بين ${nm(d,o.from)} و${nm(d,o.to)} 🤝`};}
// a bot only moves on its own turn, so it answers an offer at once: it takes it when what it gets is worth more than what it gives
// (a city counts double when the trade completes its colour for whoever gets it, or breaks a colour the bot already has)
function mBotTrade(d){const o=d.offer,b=o.to,nd=mTrade(d),no={...d,offer:null,last:`${nm(d,b)} رفض الصفقة`};if(!nd)return no;
  const full=(own,i,s)=>MP[i][0]==='p'&&MGRP[MP[i][3]].every(j=>own[j]===String(s)),val=i=>d.mg[i]==='1'?mPrice(i)/2:mPrice(i);
  const gain=nd.cash[b]-d.cash[b]+o.give.reduce((a,i)=>a+val(i)*(full(nd.own,i,b)?2:1),0)-o.get.reduce((a,i)=>a+val(i)*(full(nd.own,i,o.from)||full(d.own,i,b)?2:1),0);
  return gain>=[0,-60,10,60][botLv(d,b)]?nd:no;}
function mEnd(d){const turns=d.turns+1;let win=null;if(turns>=30*d.pl.length){const w=d.pl.map((r,s)=>d.out[s]==='1'?-1:mWorth(d,s));win=mostPts(w);}
  return {...d,turn:nextSeat(d,d.turn),ph:'roll',dbl:0,again:false,card:null,offer:null,turns,win,last:win!=null?'خلصت الجولات، الفايز الأغنى':''};}
function mAuto(d){if(d.ph==='buy')return mSkip(d);if(d.ph==='end')return mEnd(d);return mRoll(d);}
const mGroupOwned=(d,s,g)=>MGRP[g].every(j=>d.own[j]===String(s));
function mCanBuild(d,s,i){const q=MP[i];if(q[0]!=='p'||d.own[i]!==String(s))return false;const g=MGRP[q[3]];if(!g.every(j=>d.own[j]===String(s)&&d.mg[j]==='0'))return false;const h=+d.hs[i];
  if(h<4&&mHousesOut(d)>=MHOUSES)return false;if(h===4&&mHotelsOut(d)>=MHOTELS)return false;return h<5&&h<=Math.min(...g.map(j=>+d.hs[j]))&&d.cash[s]>=q[5];}
function mCanSell(d,s,i){const q=MP[i];if(q[0]!=='p'||d.own[i]!==String(s))return false;const h=+d.hs[i];if(h===5&&MHOUSES-mHousesOut(d)<4)return false;return h>0&&h>=Math.max(...MGRP[q[3]].map(j=>+d.hs[j]));}
function mCanMort(d,s,i){if(d.own[i]!==String(s)||d.mg[i]==='1')return false;return MP[i][0]!=='p'||MGRP[MP[i][3]].every(j=>d.hs[j]==='0');}
const mUnmCost=i=>Math.ceil(mPrice(i)*.55);
function mCanUnm(d,s,i){return d.own[i]===String(s)&&d.mg[i]==='1'&&d.cash[s]>=mUnmCost(i);}
const MPOS=i=>i<=10?[11,11-i]:i<=20?[11-(i-10),1]:i<=30?[1,1+(i-20)]:[1+(i-30),11];
const MSIDE=i=>i%10===0?'k':i<10?'b':i<20?'l':i<30?'t':'r';
const MICO={go:'⬅️',cc:'📦',ch:'❓',tax:'💸',rr:'🚆',jail:'🚔',fp:'☕',gtj:'👮'};
const money=v=>`<span class="mny">${v}</span>`;
function mCellHTML(d,i){const q=MP[i],t=q[0],side=MSIDE(i),[r,c]=MPOS(i),o=d.own[i],oc=o!=='.'?COLS[d.pl[+o]]:'';const h=+d.hs[i];
  const toks=d.pl.map((rr,s)=>d.out[s]!=='1'&&d.pos[s]===i?`<i id="mt${s}" class="${d.jail[s]&&i===10?'jl':''} ${s===d.turn?'cur':''}" style="--c:${col(d,s)}"></i>`:'').join('');
  // a bought place shows its owner (colour and shape) where the price was
  const pr=o!=='.'?`<span class="pr ow" style="--o:${oc}"><svg viewBox="0 0 40 40">${SHP[d.pl[+o]]('#fff')}</svg></span>`:`<span class="pr">${q[2]}</span>`;
  let inner='';
  if(t==='p')inner=`<b class="bar" style="background:${MGC[q[3]]}">${h===5?'<u class="ho"></u>':'<u class="hs"></u>'.repeat(h)}</b><span class="nm">${q[1]}</span>${pr}`;
  else if(t==='rr'||t==='ut')inner=`<span class="ic">${t==='rr'?'🚆':i===12?'⚡':'💧'}</span><span class="nm">${t==='rr'?q[1].replace('محطة ',''):q[1]}</span>${pr}`;
  else if(t==='tax')inner=`<span class="ic">💸</span><span class="nm">ضريبة</span><span class="pr">${q[2]}</span>`;
  else inner=`<span class="ic">${MICO[t]}</span><span class="nm">${q[1]}</span>`;
  return `<button class="mc ms${side} mt-${t} ${o!=='.'?'own':''} ${d.mg[i]==='1'?'mort':''} ${S.mcell===i?'pick':''}" data-ga="cell" data-i="${i}" data-c="${i}" style="grid-row:${r};grid-column:${c};${oc?`--o:${oc}`:''}">${inner}<span class="tks">${toks}</span></button>`;}
function mDetail(d,i){const q=MP[i],t=q[0],o=d.own[i];let s=`<div class="mdet"><button class="x" data-ga="cell" data-i="${i}">✕</button>`;
  if(t==='p'){s+=`<div class="dh" style="background:${MGC[q[3]]}">${q[1]}</div><table>${['الإيجار','مع بيت','بيتين','3 بيوت','4 بيوت','فندق'].map((l,k)=>`<tr ${+d.hs[i]===k&&o!=='.'?'class="on"':''}><td>${l}</td><td>${q[4][k]}</td></tr>`).join('')}</table><small>سعر البيت ${q[5]} • السعر ${q[2]}<br>لو ملكت كل اللون يتضاعف الإيجار</small>`;}
  else if(t==='rr')s+=`<div class="dh" style="background:#2D4763">🚆 ${q[1]}</div><table>${[1,2,3,4].map(k=>`<tr><td>${k} محطة</td><td>${25*2**(k-1)}</td></tr>`).join('')}</table><small>السعر ${q[2]}</small>`;
  else if(t==='ut')s+=`<div class="dh" style="background:#7F8C8D">${i===12?'⚡':'💧'} ${q[1]}</div><small>الإيجار: مجموع الزهر × 4<br>ولو تملك الثنتين: × 10<br>السعر ${q[2]}</small>`;
  else s+=`<div class="dh" style="background:#2D4763">${MICO[t]} ${q[1]}</div><small>${t==='go'?'كل ما تمر عليه تأخذ 200':t==='jail'?'تطلع بدبل، أو تدفع 50، أو ببطاقة الخروج':t==='gtj'?'تروح السجن مباشرة':t==='fp'?'خانة راحة، ما يصير فيها شي':t==='tax'?`تدفع ${q[2]}`:'تسحب بطاقة'}</small>`;
  if(isProp(i))s+=`<p class="own">${o==='.'?'متاح للشراء':`المالك: ${nameTag(d,+o)}${d.mg[i]==='1'?' (مرهون)':''}`}</p>`;
  return s+'</div>';}
function mProps(d,s,my){const mine=[...Array(40).keys()].filter(i=>d.own[i]===String(s));if(!mine.length)return '<p class="note" style="text-align:center">ما عندك عقارات للحين</p>';
  return `<div class="mprops">${mine.map(i=>{const q=MP[i],h=+d.hs[i];const c=q[0]==='p'?MGC[q[3]]:q[0]==='rr'?'#2D4763':'#7F8C8D';
    const b=[];if(my){if(mCanBuild(d,s,i))b.push(`<button class="sm" data-ga="bld" data-i="${i}">+ ${h===4?'فندق':'بيت'} ${q[5]}</button>`);if(mCanSell(d,s,i))b.push(`<button class="sm" data-ga="sel" data-i="${i}">بيع ${q[5]/2}</button>`);
      if(mCanMort(d,s,i))b.push(`<button class="sm" data-ga="mrt" data-i="${i}">رهن +${mPrice(i)/2}</button>`);if(d.mg[i]==='1')b.push(`<button class="sm" data-ga="unm" data-i="${i}" ${mCanUnm(d,s,i)?'':'disabled'}>فك الرهن ${mUnmCost(i)}</button>`);}
    return `<div class="mp ${d.mg[i]==='1'?'mort':''}" style="--g:${c}"><b>${q[0]==='rr'?'🚆 ':q[0]==='ut'?(i===12?'⚡ ':'💧 '):''}${q[1]}</b><span>${h===5?'🏨':'🏠'.repeat(h)}${q[0]==='p'&&mGroupOwned(d,s,q[3])?' <small>✓ اللون كامل</small>':''}</span><div>${b.join('')}</div></div>`;}).join('')}</div>`;}
// the trade panel belongs to one turn of one game, so it never carries over to the next player or a new game
const mTrKey=d=>d.gid+':'+d.turn+':'+d.turns,mTr=d=>{if(S.mtr&&S.mtr.key!==mTrKey(d))S.mtr=null;return S.mtr;};
// on one phone with bots the other human answers on the same screen; a bot answers at once (mBotTrade)
const mCanAns=(d,ctx)=>ctx.local||ctx.v===d.offer.to||!!ctx.bots&&!isBot(d,d.offer.to);
function mTradePanel(d,s){const T=S.mtr;const others=aliveSeats(d).filter(x=>x!==s);if(!others.includes(T.to))T.to=others[0];
  const lst=(who,k)=>{const L=[...Array(40).keys()].filter(i=>mTradeable(d,who,i));return L.length?`<div class="mtl">${L.map(i=>`<button class="sm ${T[k].includes(i)?'go':''}" data-ga="${k==='give'?'tgive':'tget'}" data-i="${i}">${MP[i][1]}${d.mg[i]==='1'?' (مرهون)':''}</button>`).join('')}</div>`:'<p class="note">ما فيه شي يتبادل</p>';};
  return `<div class="mpanel"><div class="mph"><b>🤝 صفقة مع</b><button class="sm" data-ga="trade">إغلاق</button></div>
  <div class="tabs">${others.map(o=>`<button class="tab ${o===T.to?'sel':''}" style="background:${col(d,o)}" data-ga="tto" data-i="${o}">${nm(d,o)}</button>`).join('')}</div>
  <p class="lbl">تعطيه</p>${lst(s,'give')}<p class="lbl">تأخذ منه</p>${lst(T.to,'get')}
  <p class="lbl">الفلوس ${T.cash>0?`(تدفع له ${T.cash})`:T.cash<0?`(يدفع لك ${-T.cash})`:''}</p><div class="mbid"><button class="sm" data-ga="tcash" data-i="-100">−100</button><button class="sm" data-ga="tcash" data-i="-10">−10</button><b>${T.cash}</b><button class="sm" data-ga="tcash" data-i="10">+10</button><button class="sm" data-ga="tcash" data-i="100">+100</button></div>
  <p class="note">العقار المرهون ينتقل مرهون، واللي ياخذه يدفع 10٪ فايدة</p>
  <button class="btn red wide" data-ga="tsend">أرسل العرض</button></div>`;}
GAMES.mono={name:'مونوبولي',cat:'board',lbc:'#C0392B',noTimer:false,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#CDE8D6"/><rect x="18" y="18" width="64" height="64" fill="#E8F4EC" stroke="#2D4763" stroke-width="1.5"/>${[0,1,2,3,4].map(k=>`<rect x="${18+k*12.8}" y="8" width="12.8" height="10" fill="${MGC[[4,4,5,5,6][k]]}" stroke="#2D4763" stroke-width="1"/><rect x="82" y="${18+k*12.8}" width="10" height="12.8" fill="${MGC[[6,6,7,7,7][k]]}" stroke="#2D4763" stroke-width="1"/>`).join('')}<rect x="22" y="40" width="56" height="20" rx="3" fill="#E5483F" transform="rotate(-20 50 50)"/><text x="50" y="55" font-size="13" font-weight="800" fill="#fff" text-anchor="middle" transform="rotate(-20 50 50)">مونوبولي</text><circle cx="30" cy="72" r="5" fill="#4AB1E8"/><circle cx="42" cy="72" r="5" fill="#F0B429"/></svg>`,
  init:n=>({pos:Array(n).fill(0),cash:Array(n).fill(1500),jail:Array(n).fill(0),free:Array(n).fill(0),fr:{ch:-1,cc:-1},dk:mDecks(),auc:null,offer:null,rd:0,own:'.'.repeat(40),hs:'0'.repeat(40),mg:'0'.repeat(40),ph:'roll',dice:[0,0],rid:0,dbl:0,again:false,card:null,turns:0,mv:null,last:''}),
  points:d=>d.cash.map(c=>'💰'+c),
  simulNow:d=>d.ph==='auc',
  viewer:d=>d.win==null&&d.ph==='auc'?simulViewer(d):null,
  resolve:(d,picks)=>mAuction(d,picks),
  status(d,ctx){if(d.ph==='auc')return (d.last?`<small>${d.last}</small><br>`:'')+`مزاد على ${MP[d.auc][1]} 🔨 كل واحد يكتب مبلغه بالسر`;return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  onTimeout:d=>mAuto(d),
  onSkip(nd){let own=nd.own,hs=nd.hs,mg=nd.mg;for(let i=0;i<40;i++)if(own[i]!=='.'&&nd.out[+own[i]]==='1'){own=setAt(own,i,'.');hs=setAt(hs,i,'0');mg=setAt(mg,i,'0');}
    const o=nd.offer,offer=o&&(nd.out[o.from]==='1'||nd.out[o.to]==='1')?null:o;
    const moved=S.st.d&&S.st.d.turn!==nd.turn;return {...nd,own,hs,mg,offer,...(moved?{ph:'roll',dbl:0,again:false}:{})};},
  render(d,ctx){const s=d.turn,my=ctx.my,v=ctx.local?s:ctx.v;
    let c='';
    if(S.mcell!=null)c=mDetail(d,S.mcell);
    else{const fresh=d.rid&&once('md'+d.gid+'_'+d.rid);
      c=`<div class="mlogo">مونوبولي</div>`;
      if(d.card)c+=`<div class="mcard ${fresh?'in':''}">🃏 ${d.card}</div>`;
      const canR=d.win==null&&my&&d.ph==='roll'&&!S.rolling;
      if(d.ph!=='auc')c+=`<${canR?'button data-ga="roll" aria-label="ارمِ"':'div'} class="mdice ${canR?'can':''}">${(d.dice[0]?d.dice:[6,6]).map(x=>`<span class="dice ${S.rolling?'spin':fresh?'land':''}">${diceSVG(x)}</span>`).join('')}</${canR?'button':'div'}>`;
      if(d.ph!=='auc')c+=`<div class="mwho" style="--c:${col(d,s)}"><i></i>${!ctx.local&&s===ctx.v?'دورك':nm(d,s)} • ${money(d.cash[s])}${d.jail[s]?' • 🚔 في السجن':''}${d.free[s]?' • 🎫':''}</div>`;
      if(d.ph==='auc'){const i=d.auc;c+=`<div class="mbuy">🔨 مزاد: <b>${MP[i][1]}</b> (سعره ${MP[i][2]})</div>`;
        if(ctx.my&&ctx.v!=null&&ctx.v>=0){const b=Math.max(0,Math.min(+(S.draft.bid||0),d.cash[ctx.v]));
          c+=`<div class="mbid"><button class="sm" data-ga="bidm" data-i="50">−50</button><button class="sm" data-ga="bidm" data-i="10">−10</button><b>${b}</b><button class="sm" data-ga="bidp" data-i="10">+10</button><button class="sm" data-ga="bidp" data-i="50">+50</button></div><div class="macts"><button class="btn red" data-ga="bidgo" ${b>0?'':'disabled'}>زايد بـ ${b}</button><button class="btn navy" data-ga="bidno">ما أبي</button></div>`;}
        else c+='<p class="mwait">ننتظر مزايدات الباقين…</p>';}
      else{if(d.offer){const o=d.offer;const lst=a=>a.map(i=>MP[i][1]).join('، ')||'لا شي';
        c+=`<div class="moffer"><b>🤝 ${nm(d,o.from)} يعرض على ${nm(d,o.to)}</b><small>يعطيه: ${lst(o.give)}${o.cash>0?` + ${o.cash} ريال`:''}</small><small>ويأخذ: ${lst(o.get)}${o.cash<0?` + ${-o.cash} ريال`:''}</small></div>`;
        if(mCanAns(d,ctx))c+=`<div class="macts"><button class="btn red" data-ga="tacc">أقبل</button><button class="btn navy" data-ga="trej">أرفض</button></div>`;
        else if(ctx.v===o.from)c+=`<div class="macts"><button class="btn navy" data-ga="trej">إلغاء العرض</button></div>`;}
      // the player whose turn it is keeps their buttons while an offer waits for an answer
      if(d.win==null&&my){
        if(d.ph==='roll'){if(d.jail[s])c+=`<div class="macts"><button class="btn navy" data-ga="bail" ${d.cash[s]<50?'disabled':''}>ادفع 50 واطلع</button>${d.free[s]?'<button class="btn blue" data-ga="free">🎫 البطاقة</button>':''}</div>`;}
        else if(d.ph==='buy'){const i=d.pos[s];c+=`<div class="mbuy"><b>${MP[i][1]}</b> متاح بـ ${MP[i][2]}</div><div class="macts"><button class="btn red" data-ga="buy" ${d.cash[s]<mPrice(i)?'disabled':''}>🏷️ اشترِ</button><button class="btn navy" data-ga="skip">لا</button></div>`;}
        else c+=`<div class="macts"><button class="btn blue" data-ga="end">إنهاء الدور ⏭</button></div>`;}
      else if(d.win==null&&!d.offer)c+=`<p class="mwait">ننتظر ${nm(d,s)}</p>`;}
      c+=`<button class="mtab" data-ga="props">🏠 عقاراتي</button>${d.win==null&&my&&!d.offer&&(d.ph==='roll'||d.ph==='end')?'<button class="mtab" data-ga="trade">🤝 صفقة</button>':''}`;}
    let b=`<div class="mboard" id="mboard">${MP.map((q,i)=>mCellHTML(d,i)).join('')}<div class="mcenter">${c}</div></div>`;
    if(mTr(d)&&my&&!d.offer&&(d.ph==='roll'||d.ph==='end'))b+=mTradePanel(d,s);
    if(S.mprops&&v>=0)b+=`<div class="mpanel"><div class="mph"><b>عقاراتك</b> ${money(d.cash[v])}<button class="sm" data-ga="props">إغلاق</button></div>${mProps(d,v,my&&d.ph!=='buy'&&v===s)}</div>`;
    return b;},
  click(a,i,d,ctx){
    if(a==='cell'){S.mcell=S.mcell===i?null:i;render();return;}
    if(a==='props'){S.mprops=!S.mprops;render();return;}
    if(a==='bidp'||a==='bidm'){S.draft.bid=String(Math.max(0,(+(S.draft.bid||0))+(a==='bidp'?i:-i)));render();return;}
    if((a==='bidgo'||a==='bidno')&&d.ph==='auc'&&ctx.my){const b=a==='bidno'?0:Math.max(0,Math.min(+(S.draft.bid||0),d.cash[ctx.v]));S.draft.bid='0';simulPick(d,ctx.v,b);return;}
    if((a==='tacc'||a==='trej')&&d.offer&&(mCanAns(d,ctx)||(a==='trej'&&ctx.v===d.offer.from))){
      if(a==='trej'){act({...d,offer:null,last:ctx.v===d.offer.from?'انلغى العرض':`${nm(d,d.offer.to)} رفض الصفقة`});return;}
      const nd=mTrade(d);if(!nd){toast('الصفقة ما تنفع الحين');act({...d,offer:null});return;}act(nd);return;}
    if(!ctx.my)return;const s=d.turn;
    if(a==='roll'&&d.ph==='roll'&&!S.rolling){const g=d.gid,t=d.turn,r=d.rid;S.mcell=null;S.rolling=true;render();S.holdRender=true;
      const iv=setInterval(()=>{document.querySelectorAll('.mdice .dice').forEach(el=>{el.innerHTML=diceSVG(1+rnd(6));});},70);
      setTimeout(()=>{clearInterval(iv);S.holdRender=false;S.rolling=false;const nd=S.st.d;if(!nd||nd.gid!==g||nd.turn!==t||nd.rid!==r||nd.ph!=='roll'){render();return;}act(mRoll(nd));},440);return;}
    if(a==='bail'&&d.ph==='roll'&&d.jail[s]&&d.cash[s]>=50){const cash=[...d.cash];cash[s]-=50;const jail=[...d.jail];jail[s]=0;act({...d,cash,jail,last:`${nm(d,s)} دفع 50 وطلع من السجن`});return;}
    if(a==='free'&&d.ph==='roll'&&d.jail[s]&&d.free[s]){const free=[...d.free];free[s]--;const jail=[...d.jail];jail[s]=0;const fr={...(d.fr||{})};if(fr.ch===s)fr.ch=-1;else if(fr.cc===s)fr.cc=-1;act({...d,free,jail,fr,last:`${nm(d,s)} استخدم بطاقة الخروج 🎫`});return;}
    if(a==='buy'&&d.ph==='buy'){act(mBuy(d));return;}
    if(a==='skip'&&d.ph==='buy'){act(mSkip(d));return;}
    if(a==='end'&&d.ph==='end'){S.mcell=null;act(mEnd(d));return;}
    const T=mTr(d);
    if(a==='trade'){S.mtr=T?null:{key:mTrKey(d),to:aliveSeats(d).find(x=>x!==s),give:[],get:[],cash:0};render();return;}
    if(T&&a==='tto'){S.mtr={key:mTrKey(d),to:i,give:[],get:[],cash:0};render();return;}
    if(T&&(a==='tgive'||a==='tget')){const k=a==='tgive'?'give':'get';const L=T[k];const j=L.indexOf(i);if(j>=0)L.splice(j,1);else L.push(i);render();return;}
    if(T&&a==='tcash'){T.cash+=i;render();return;}
    if(T&&a==='tsend'&&!d.offer){const give=T.give.filter(j=>mTradeable(d,s,j)),get=T.get.filter(j=>mTradeable(d,T.to,j));if(T.to===s||d.out[T.to]==='1'||!give.length&&!get.length&&!T.cash)return;S.mtr=null;
      const nd={...d,offer:{from:s,to:T.to,give,get,cash:T.cash},last:`${nm(d,s)} أرسل عرض صفقة لـ${nm(d,T.to)}`};act(isBot(d,T.to)?mBotTrade(nd):nd);return;}
    if(d.ph==='buy')return;
    if(a==='bld'&&mCanBuild(d,s,i)){const cash=[...d.cash];cash[s]-=MP[i][5];const h=+d.hs[i]+1;act({...d,cash,hs:setAt(d.hs,i,String(h)),last:`${nm(d,s)} بنى ${h===5?'فندق 🏨':'بيت 🏠'} في ${MP[i][1]}`});return;}
    if(a==='sel'&&mCanSell(d,s,i)){const cash=[...d.cash];cash[s]+=MP[i][5]/2;act({...d,cash,hs:setAt(d.hs,i,String(+d.hs[i]-1)),last:`${nm(d,s)} باع بيت في ${MP[i][1]}`});return;}
    if(a==='mrt'&&mCanMort(d,s,i)){const cash=[...d.cash];cash[s]+=mPrice(i)/2;act({...d,cash,mg:setAt(d.mg,i,'1'),last:`${nm(d,s)} رهن ${MP[i][1]}`});return;}
    if(a==='unm'&&mCanUnm(d,s,i)){const cash=[...d.cash];cash[s]-=mUnmCost(i);act({...d,cash,mg:setAt(d.mg,i,'0'),last:`${nm(d,s)} فك رهن ${MP[i][1]}`});}},
  after(d){const m=d.mv;if(!m||!once('mo'+d.gid+'_'+m.sid))return;const bd=document.getElementById('mboard'),tok=document.getElementById('mt'+m.s);if(!bd||!tok)return;
    S.holdRender=true;const br=bd.getBoundingClientRect();const cell=i=>bd.querySelector(`[data-c="${i}"]`).getBoundingClientRect();
    tok.style.visibility='hidden';const f=document.createElement('div');f.className='mfly';f.style.setProperty('--c',col(d,m.s));bd.appendChild(f);
    const place=(i,ms)=>{const r=cell(i);f.style.transition=ms?`transform ${ms}ms cubic-bezier(.3,.7,.4,1)`:'none';f.style.transform=`translate(${r.left-br.left+r.width/2-9}px,${r.top-br.top+r.height/2-9}px)`;};
    const st=Math.max(60,Math.min(150,2400/m.path.length));place(m.path[0],0);void f.offsetWidth;let k=1;
    const step=()=>{if(k<m.path.length){const prev=m.path[k-1],nx=m.path[k++];place(nx,(nx-prev+40)%40>1?450:st-10);setTimeout(step,(nx-prev+40)%40>1?460:st);}else setTimeout(()=>{f.remove();tok.style.visibility='';sfx('pop');S.holdRender=false;if(S.renderPending)render();},120);};
    setTimeout(step,60);}
};

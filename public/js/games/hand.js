'use strict';
/* هند (Saudi rules): two packs with two jokers (three packs with three jokers for 6 players and more), 14 cards each and 15 for
   the starter. Draw from the stock or take the top discard (only to meld it at once), meld runs (3+ of a suit, ace low or high)
   and groups (3 or 4 of a rank, all different suits), one joker at most per meld. The first laydown must reach 51, and every
   later first laydown must beat the previous one by 1. After opening you may add to any meld and swap a joker for the card
   it stands for. Going out: winner -30, players who never opened +100, the rest pay the cards left (ace 11, faces 10, joker 15).
   A full "hand" (all down in one turn, nothing melded before) doubles everything. Five rounds, lowest total wins. */

const HRK='A23456789TJQK';
const hRank=c=>HRK.indexOf(c[0])+1;                 // A=1 .. K=13
const hJ=c=>c==='XX';
const hPen=c=>hJ(c)?15:c[0]==='A'?11:'TJQK'.includes(c[0])?10:+c[0];
const hCard=(c,cls)=>hJ(c)?`<div class="card jk ${cls||''}"><span>🃏</span></div>`:cardHTML(c,false,cls);
// small card for melds on the table: rank over suit, readable even when overlapped
const hMini=c=>hJ(c)?'<div class="card mini jk">🃏</div>':miniCard(c);
function hDeck(n){const k=n>5?3:2;const a=[];for(let i=0;i<k;i++){for(const s of 'shdc')for(const r of HRK)a.push(r+s);a.push('XX');}return shuffle(a);}
function hSortHand(h){const cs=cardsOf(h);const so='shcd';return cs.sort((a,b)=>hJ(a)-hJ(b)||(hJ(a)?0:so.indexOf(a[1])-so.indexOf(b[1])||hRank(a)-hRank(b))).join('');}
// checks a set of cards as one meld. Returns {t,c,jk} with the joker written as the card it stands for, or null
function hMeld(cards){if(cards.length<3)return null;const jk=cards.filter(hJ).length;if(jk>1)return null;const nat=cards.filter(c=>!hJ(c));
  // group
  if(nat.every(c=>c[0]===nat[0][0])&&cards.length<=4){const su=nat.map(c=>c[1]);if(new Set(su).size===su.length){
    const c=[...nat];let j=-1;if(jk){const miss='shdc'.split('').find(s=>!su.includes(s));c.push(nat[0][0]+miss);j=c.length-1;}return {t:'g',c,jk:j};}}
  // run
  const s=nat[0][1];if(!nat.every(c=>c[1]===s))return null;
  for(const aceHigh of [false,true]){const v=nat.map(c=>c[0]==='A'&&aceHigh?14:hRank(c)).sort((a,b)=>a-b);
    if(new Set(v).size!==v.length)continue;let gaps=0,gapAt=-1;for(let i=1;i<v.length;i++){const g=v[i]-v[i-1]-1;if(g>0){gaps+=g;gapAt=v[i-1]+1;}}
    if(gaps>jk)continue;let lo=v[0],hi=v[v.length-1],jv=-1;
    if(jk){if(gaps===1)jv=gapAt;else if(hi<(aceHigh?14:13))jv=++hi;else if(lo>1)jv=--lo;else continue;}
    if(lo<1||hi>14||(hi===14&&lo===1))continue;
    const c=[];let j=-1;for(let x=lo;x<=hi;x++){const r=x===14||x===1?'A':HRK[x-1];c.push(r+s);if(x===jv)j=c.length-1;}
    return {t:'r',c,jk:j};}
  return null;}
const hRunLow=m=>m.t==='r'&&m.c[0][0]==='A'&&m.c[1]&&m.c[1][0]==='2';
function hValue(m){return m.c.reduce((x,c,i)=>x+(c[0]==='A'?(hRunLow(m)&&i===0?1:11):'TJQK'.includes(c[0])?10:+c[0]),0);}
// adding one card (or a joker) to a meld on the table
function hAdd(m,card){
  if(hJ(card)){if(m.jk>=0)return null;if(m.t==='g'){if(m.c.length>=4)return null;const miss='shdc'.split('').find(s=>!m.c.some(c=>c[1]===s));return {...m,c:[...m.c,m.c[0][0]+miss],jk:m.c.length};}
    const r=hRunTry([...m.c.filter((_,i)=>i!==m.jk),'XX']);return r&&r.c.length===m.c.length+1?r:null;}
  if(m.t==='g'){if(card[0]!==m.c[0][0])return null;const nat=m.c.filter((_,i)=>i!==m.jk);if(nat.some(c=>c[1]===card[1]))return null;
    if(m.jk>=0&&m.c[m.jk][1]===card[1])return null;// that is a swap, not an add
    if(m.c.length>=4)return null;return {...m,c:[...m.c,card]};}
  if(m.jk>=0&&card===m.c[m.jk])return null;// that is a swap, not an add
  const nat=m.c.map((c,i)=>i===m.jk?'XX':c);const r=hRunTry([...nat,card]);
  if(!r||r.c.length!==m.c.length+1)return null;return r;}
const hRunTry=cards=>{const x=hMeld(cards);return x&&x.t==='r'?x:null;};
// swapping the natural card in and taking the joker out
function hSwap(m,cards){if(m.jk<0)return null;const rep=m.c[m.jk];
  if(m.t==='r'){if(cards.length!==1||cards[0]!==rep)return null;return {...m,jk:-1};}
  const nat=m.c.filter((_,i)=>i!==m.jk);
  if(nat.length===2){// two equal cards and a joker: both missing suits are needed
    const miss='shdc'.split('').filter(s=>!nat.some(c=>c[1]===s));if(cards.length!==2)return null;
    if(!miss.every(s=>cards.includes(nat[0][0]+s)))return null;return {...m,c:[...nat,...cards],jk:-1};}
  if(cards.length!==1||cards[0][0]!==nat[0][0]||nat.some(c=>c[1]===cards[0][1]))return null;return {...m,c:[...nat,cards[0]],jk:-1};}
// everyone gets 14; the starter opens by drawing (that is the 15th card) and then throws one
function hDealCore(n){const dk=hDeck(n);const hands=[];let k=0;for(let s=0;s<n;s++){hands.push(hSortHand(dk.slice(k,k+14).join('')));k+=14;}
  return {hands,stock:dk.slice(k).join(''),disc:'',melds:[],op:'0'.repeat(n),req:51,ph:'draw',took:null,tm:0,lo:false,op0:null,sum:null};}
function hNewRound(d){const n=d.pl.length;let st=(d.st+d.r-1)%n;if(d.out[st]==='1')st=nextSeat(d,st);
  return {...d,...hDealCore(n),turn:st,last:`الجولة ${d.r} من 5: ${nm(d,st)} يبدأ`};}
function hEndRound(d,w,full){const n=d.pl.length;const pts=d.pl.map((_,s)=>{if(s===w)return full?-60:-30;
    if(d.op[s]!=='1')return full?200:100;const v=cardsOf(d.hands[s]).reduce((x,c)=>x+hPen(c),0);return full?v*2:v;});
  const tot=d.tot.map((x,s)=>x+pts[s]);const nd={...d,tot,ph:'sum',sum:{w,full,pts},turn:w,last:`${nm(d,w)} خلّص${full?' هند كامل! 🔥':''}`};
  if(d.r>=5){const mn=Math.min(...tot.filter((_,s)=>d.out[s]!=='1'));const ws=tot.map((x,s)=>x===mn&&d.out[s]!=='1'?s:-1).filter(s=>s>=0);return {...nd,win:ws[0],wins:ws};}
  return nd;}
function hDraw(d,fromDisc){const t=d.turn;let stock=d.stock,disc=d.disc,last;
  if(fromDisc){const c=disc.slice(-2);disc=disc.slice(0,-2);const hands=[...d.hands];hands[t]=hSortHand(hands[t]+c);return {...d,hands,disc,ph:'play',took:c,last:`${nm(d,t)} أخذ ${hJ(c)?'الجوكر':'ورقة الأرض'}`};}
  if(!stock.length){const top=disc.slice(-2);stock=shuffle(cardsOf(disc.slice(0,-2))).join('');disc=top;last='خلص السحب، انخلطت الأرض من جديد';}
  const c=stock.slice(0,2);stock=stock.slice(2);const hands=[...d.hands];hands[t]=hSortHand(hands[t]+c);
  return {...d,hands,stock,disc,ph:'play',took:null,last:last||`${nm(d,t)} سحب`};}
function hDiscard(d,c){const t=d.turn,n=d.pl.length;const hc=cardsOf(d.hands[t]);const i=hc.indexOf(c);if(i<0)return null;hc.splice(i,1);
  const hands=[...d.hands];hands[t]=hc.join('');const nd={...d,hands,disc:d.disc+c,took:null};
  if(!hc.length)return hEndRound(nd,t,d.op0===false&&!d.lo);
  return {...nd,ph:'draw',turn:nextSeat(d,t),tm:0,lo:false,op0:null,last:`${nm(d,t)} رمى ${hJ(c)?'جوكر':''}`.trim()};}
// meld cards from the hand: list of card groups, all checked; opening rules applied
function hLay(d,groups){const t=d.turn;let hc=cardsOf(d.hands[t]);const melds=[...d.melds];let val=0;
  for(const g of groups){for(const c of g){const i=hc.indexOf(c);if(i<0)return {err:'الورق مو عندك'};hc.splice(i,1);}
    const m=hMeld(g);if(!m)return {err:'هذي مو مجموعة صحيحة'};melds.push({...m,o:t});val+=hValue(m);}
  if(!hc.length)return {err:'لازم تخلي ورقة ترميها'};
  const opening=d.op[t]!=='1';
  if(opening&&val<d.req&&hc.length>1)return {err:`أول نزول لازم يكون ${d.req} أو أكثر (مجموعك ${val})`};
  if(d.took&&!groups.some(g=>g.includes(d.took)))return {err:'لازم تنزّل ورقة الأرض اللي أخذتها'};
  const hands=[...d.hands];hands[t]=hc.join('');
  const nd={...d,hands,melds,op:setAt(d.op,t,'1'),tm:d.tm+1,op0:d.op0==null?!opening:d.op0,
    took:d.took&&groups.some(g=>g.includes(d.took))?null:d.took,last:`${nm(d,t)} نزّل ${groups.length===1?'مجموعة':groups.length+' مجموعات'}${opening?` بـ ${val}`:''}`};
  if(opening)nd.req=Math.max(d.req,val+1);
  return {d:nd};}
GAMES.hand={name:'هند',cat:'cards',lbc:'#5A2D82',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6A3A96"/>${[0,1,2,3].map(k=>`<g transform="rotate(${-24+k*16} 50 92)"><rect x="36" y="24" width="28" height="42" rx="4" fill="#fff" stroke="#4A2370" stroke-width="1.5"/><text x="50" y="${50}" font-size="15" font-weight="800" text-anchor="middle" fill="${k%2?'#D43C33':'#2D4763'}">${['7','8','9','🃏'][k]}</text></g>`).join('')}</svg>`,
  init:n=>({...hDealCore(n),tot:Array(n).fill(0),r:1,last:'الجولة 1 من 5'}),
  // online: each player sees only his own hand, nobody sees the stock; all opens at the win (the round summary shows no hands, so it stays hidden there)
  hide:{seat:['hands'],all:['stock']},
  // the room's host left with nobody holding the hidden cards: this round is dealt again, the totals stay
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...hNewRound(d),last:`انعادت الجولة ${d.r} من جديد`},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((_,s)=>`${cardsOf(d.hands[s]).length} ورقة${d.tot[s]?` • ${d.tot[s]}`:''}`),
  winText:d=>d.win!=null?`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بأقل مجموع`:null,
  winExtra:d=>d.pl.map((_,s)=>`${nm(d,s)} ${d.tot[s]}`).join('، '),
  onTimeout(d){
    if(d.ph==='sum')return {...hNewRound({...d,r:d.r+1})};
    let x=d;if(x.ph==='draw')x=hDraw(x,false);
    if(x.took){const back=[...x.hands];const hc=cardsOf(back[x.turn]);const i=hc.indexOf(x.took);if(i>=0){hc.splice(i,1);back[x.turn]=hc.join('');x=hDraw({...x,hands:back,disc:x.disc+x.took,took:null},false);}x={...x,took:null};}
    const hc=cardsOf(x.hands[x.turn]);const c=hc.find(c=>!hJ(c))||hc[0];return hDiscard(x,c);},
  // the absent player's half-done turn: the discard he took goes back to the pile and the next player starts by drawing
  onSkip(nd,d){if(nd.win!=null||nd.turn===d.turn||d.ph==='sum')return nd;const t=d.turn,hands=[...nd.hands];let disc=nd.disc;
    if(d.took){const hc=cardsOf(hands[t]);const i=hc.indexOf(d.took);if(i>=0){hc.splice(i,1);hands[t]=hc.join('');disc+=d.took;}}
    return {...nd,hands,disc,ph:'draw',took:null,tm:0,lo:false,op0:null,last:`${nm(d,t)} طلع`};},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='sum')return s+`انتهت الجولة ${d.r}`;
    s+=`${who}: ${d.ph==='draw'?'اسحب من الكومة أو خذ ورقة الأرض':d.took?'نزّل ورقة الأرض بمجموعة، وبعدها ارمِ ورقة':'نزّل أو أضف، وبعدها ارمِ ورقة'}`;
    s+=`<br><small>${String(d.last||'').startsWith(`الجولة ${d.r} `)?'':`الجولة ${d.r} من 5 • `}أول نزول لازم ${d.req} أو أكثر</small>`;return s;},
  render(d,ctx){
    const v=ctx.local?d.turn:ctx.v,my=ctx.my;const k=d.gid+':'+d.r+':'+d.turn+':'+d.hands[d.turn]+d.melds.length;
    if(!S.hd||S.hd.k!==k)S.hd={k,sel:[],pend:[]};const U=S.hd;
    let h='';
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>${nm(d,r.w)} خلّص الجولة ${d.r}${r.full?' بهند كامل':''}</h3>${d.pl.map((_,s)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>${r.pts[s]>0?'+':''}${r.pts[s]}</em><b>${d.tot[s]}</b></div>`).join('')}
      ${my&&d.win==null?'<button class="big green" data-ga="nextr">الجولة التالية</button>':''}</div>`;return h;}
    // stock and discard
    const top=d.disc.slice(-2);const canDraw=my&&d.ph==='draw';
    h+=`<div class="hpile"><button class="hstock" data-ga="stock" ${canDraw?'':'disabled'}><div class="card back"></div><small>${d.stock.length/2}</small></button>
      <${canDraw&&top?'button':'div'} class="hdisc" ${canDraw&&top?'data-ga="take"':''}>${top?hCard(top):'<div class="card hempty"></div>'}<small>الأرض</small></${canDraw&&top?'button':'div'}></div>`;
    // melds on the table
    if(d.melds.length){const selC=U.sel.map(i=>cardsOf(d.hands[d.turn])[i]);const canAdd=my&&d.ph==='play'&&d.op[d.turn]==='1'&&!d.took&&selC.length;
      h+=`<div class="hmelds">${d.melds.map((m,i)=>{const ok=canAdd&&((selC.length===1&&hAdd(m,selC[0]))||hSwap(m,selC));
        return `<${ok?'button':'div'} class="hm ${ok?'can':''}" style="--c:${col(d,m.o)}" ${ok?`data-ga="add" data-i="${i}"`:''}>${m.c.map((c,j)=>hMini(j===m.jk?'XX':c)).join('')}</${ok?'button':'div'}>`;}).join('')}</div>`;}
    // what this player is building before opening
    if(my&&U.pend.length){const val=U.pend.reduce((x,g)=>x+hValue(hMeld(g)),0);
      h+=`<div class="panel hpend"><div class="hmelds">${U.pend.map(g=>`<div class="hm">${hMeld(g).c.map((c,j)=>hMini(j===hMeld(g).jk?'XX':c)).join('')}</div>`).join('')}</div>
        <p class="note">المجموع ${val} من ${d.req}</p><div class="row"><button class="btn green" data-ga="confirm">ثبّت النزول</button><button class="btn" data-ga="cancel">تراجع</button></div></div>`;}
    // the hand
    const show=v>=0?v:null;if(show==null)return h;
    const all=cardsOf(d.hands[show]);const taken=all.map(()=>false);
    if(show===d.turn)for(const g of U.pend)for(const c of g){const i=all.findIndex((x,j)=>x===c&&!taken[j]);if(i>=0)taken[i]=true;}
    const idx=all.map((_,i)=>i).filter(i=>!taken[i]);
    const act2=my&&show===d.turn&&d.ph==='play';
    h+=`<p class="lbl" style="text-align:center">ورقك ${d.op[show]==='1'?'<small>(نزّلت)</small>':''}</p><div class="hand hhand">${idx.map(i=>`<${act2?'button':'div'} class="hc ${U.sel.includes(i)?'sel':''} ${d.took&&all[i]===d.took&&show===d.turn?'took':''}" ${act2?`data-ga="sel" data-i="${i}"`:''}>${hCard(all[i])}</${act2?'button':'div'}>`).join('')}</div>`;
    if(act2){const sel=U.sel.map(i=>all[i]);const m=sel.length>=3?hMeld(sel):null;
      h+=`<div class="row hact"><button class="btn green" data-ga="meld" ${m?'':'disabled'}>نزّل${m?` (${hValue(m)})`:''}</button><button class="btn red" data-ga="disc" ${sel.length===1&&!U.pend.length?'':'disabled'}>ارمِ</button>${d.took&&d.tm===0&&!U.pend.length?'<button class="btn" data-ga="back">رجّع ورقة الأرض</button>':''}</div>`;}
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;const t=d.turn;const U=S.hd;
    if(a==='nextr'&&d.ph==='sum'&&d.win==null){act(hNewRound({...d,r:d.r+1}));return;}
    if(a==='stock'&&d.ph==='draw'){act(hDraw(d,false));return;}
    if(a==='take'&&d.ph==='draw'&&d.disc){act(hDraw(d,true));return;}
    if(d.ph!=='play'||!U)return;const all=cardsOf(d.hands[t]);
    if(a==='sel'){const j=U.sel.indexOf(i);if(j>=0)U.sel.splice(j,1);else U.sel.push(i);render();return;}
    if(a==='back'&&d.took&&d.tm===0){const hands=[...d.hands];const hc=cardsOf(hands[t]);if(hc.indexOf(d.took)<0)return;hc.splice(hc.indexOf(d.took),1);hands[t]=hc.join('');S.hd=null;act({...d,hands,disc:d.disc+d.took,took:null,ph:'draw',last:`${nm(d,t)} رجّع ورقة الأرض`});return;}
    if(a==='cancel'){U.pend=[];U.sel=[];render();return;}
    if(a==='meld'){const sel=U.sel.map(x=>all[x]);if(!hMeld(sel))return;
      if(d.op[t]==='1'){const r=hLay(d,[sel]);if(r.err){toast(r.err);return;}S.hd=null;act(r.d);return;}
      U.pend.push(sel);U.sel=[];render();return;}
    if(a==='confirm'){const r=hLay(d,U.pend);if(r.err){toast(r.err);return;}S.hd=null;act(r.d);return;}
    if(a==='add'){const sel=U.sel.map(x=>all[x]);const m=d.melds[i];if(!m||d.op[t]!=='1')return;
      if(d.took){toast(sel.includes(d.took)?'ورقة الأرض تنزل بمجموعة جديدة، ما تنضاف':'نزّل ورقة الأرض أول');return;}
      let nm2=sel.length===1?hAdd(m,sel[0]):null;let gain=[];if(!nm2){nm2=hSwap(m,sel);if(nm2)gain=['XX'];}
      if(!nm2)return;const hc=[...all];for(const c of sel)hc.splice(hc.indexOf(c),1);hc.push(...gain);
      if(!hc.length){toast('لازم تخلي ورقة ترميها');return;}
      const melds=[...d.melds];melds[i]={...nm2,o:m.o};const hands=[...d.hands];hands[t]=hSortHand(hc.join(''));
      S.hd=null;act({...d,hands,melds,tm:d.tm+1,lo:d.lo||m.o!==t,took:d.took,last:gain.length?`${nm(d,t)} أخذ الجوكر`:`${nm(d,t)} أضاف ورقة`});return;}
    if(a==='disc'){if(U.pend.length){toast('ثبّت النزول أو تراجع عنه أول');return;}if(d.took){toast('لازم تنزّل ورقة الأرض اللي أخذتها');return;}
      const c=all[U.sel[0]];if(!c)return;const nd=hDiscard(d,c);if(nd){S.hd=null;act(nd);}}}
};

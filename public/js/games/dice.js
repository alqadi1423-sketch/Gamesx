'use strict';
/* dice and luck: five dice, liar's dice, shut the box, camel race, lucky boxes */

const dieBtn=(n,held,attrs)=>`<${attrs?'button':'div'} class="dice" style="width:54px;height:54px;${held?'box-shadow:0 0 0 4px #ffd84d':''}" ${attrs||''}>${n?diceSVG(n).replace('<svg ','<svg style="width:42px;height:42px" '):''}</${attrs?'button':'div'}>`;

/* ---------- five dice ---------- */
const YC=['الآحاد','الاثنينات','الثلاثات','الأربعات','الخمسات','الستات','ثلاثة متشابهة','أربعة متشابهة','فل هاوس','تسلسل صغير','تسلسل كبير','خمسة متشابهة','الحظ'];
function yScore(k,dice){const d=[...dice].map(Number);const c=[0,0,0,0,0,0,0];d.forEach(x=>c[x]++);const sum=d.reduce((a,b)=>a+b,0);const mx=Math.max(...c);
  const has=s=>s.every(x=>c[x]>0);
  if(k<6)return c[k+1]*(k+1);
  if(k===6)return mx>=3?sum:0;if(k===7)return mx>=4?sum:0;
  if(k===8)return c.includes(3)&&c.includes(2)?25:0;
  if(k===9)return has([1,2,3,4])||has([2,3,4,5])||has([3,4,5,6])?30:0;
  if(k===10)return has([1,2,3,4,5])||has([2,3,4,5,6])?40:0;
  if(k===11)return mx===5?50:0;return sum;}
const yTotal=card=>{const up=card.slice(0,6).reduce((a,b)=>a+Math.max(b,0),0);return card.slice(0,13).reduce((a,b)=>a+Math.max(b,0),0)+(up>=63?35:0)+100*(card[13]||0);};
// official Yahtzee extras: a further Yahtzee earns 100 when the Yahtzee box holds 50, and it plays as a joker
const yIsY=dice=>dice!=='00000'&&[...dice].every(x=>x===dice[0]);
function yOpts(card,dice){const free=[...Array(13).keys()].filter(k=>card[k]<0);if(!yIsY(dice)||card[11]<0)return free.map(k=>[k,yScore(k,dice)]);
  const f=+dice[0]-1;if(card[f]<0)return [[f,yScore(f,dice)]];
  const low=free.filter(k=>k>=6);if(low.length)return low.map(k=>[k,k===8?25:k===9?30:k===10?40:yScore(k,dice)]);
  return free.map(k=>[k,0]);}
function yPut(card,k,dice){const c=[...card];const o=yOpts(card,dice).find(x=>x[0]===k);if(!o)return null;if(yIsY(dice)&&card[11]===50)c[13]=(c[13]||0)+1;c[k]=o[1];return c;}
GAMES.yatzy={name:'خمس زهرات',cat:'cards',lbc:'#B03A48',onTimeout:d=>{const t=d.turn;const cards=d.cards.map(c=>[...c]);const empty=cards[t].map((v,k)=>k<13&&v<0?k:-1).filter(k=>k>=0);let best=empty[0];if(d.rolls){const o=yOpts(cards[t],d.dice);const b=o.reduce((x,y)=>y[1]>x[1]?y:x);cards[t]=yPut(cards[t],b[0],d.dice);}else cards[t][best]=0;const done=cards.every((c,s)=>d.out[s]==='1'||c.slice(0,13).every(x=>x>=0));return {...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:done?mostPts(cards.map((c,s)=>d.out[s]==='1'?-1:yTotal(c))):null};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D5505F"/>${[[14,16],[52,12],[30,50],[64,48],[22,78]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="26" height="26" rx="6" fill="#fff" transform="rotate(${k*9-18} ${x+13} ${y+13})"/><circle cx="${x+13}" cy="${y+13}" r="4" fill="#2D4763"/>`).join('')}</svg>`,
  init:n=>({dice:'00000',held:'00000',rolls:0,cards:Array(n).fill(0).map(()=>Array(13).fill(-1))}),
  points:d=>d.cards.map(yTotal),status:(d,ctx)=>turnTxt(d,ctx),
  winExtra:d=>'المجموع: '+d.cards.map((c,s)=>`${nm(d,s)} ${yTotal(c)}`).join('، '),
  render(d,ctx){const t=d.turn;const card=d.cards[t];const anim=S.rolled;S.rolled=false;
    let s=`<div class="row ${anim?'':''}">${[...d.dice].map((x,i)=>dieBtn(+x,d.held[i]==='1',ctx.my&&d.rolls>0&&d.rolls<3?`data-ga="hold" data-i="${i}"`:'')).join('')}</div>`;
    s+=`<div class="acts"><button class="btn" style="background:${col(d,t)}" data-ga="roll" ${ctx.my&&d.rolls<3?'':'disabled'}>ارمِ (${3-d.rolls} باقي)</button></div>`;
    const up=card.slice(0,6).reduce((a,b)=>a+Math.max(b,0),0);const opts=d.rolls?yOpts(card,d.dice):[];
    if(d.rolls&&yIsY(d.dice)&&card[11]>=0)s+=`<p class="hint" style="text-align:center">خمسة متشابهة مرة ثانية!${card[11]===50?' +100 مكافأة،':''} وتنحسب جوكر</p>`;
    s+=`<div class="ysheet">${YC.map((n,k)=>{const v=card[k];const op=opts.find(x=>x[0]===k);const pv=op?op[1]:0;
      return v>=0?`<div class="yc done"><span>${n}</span><b>${v}</b></div>`:`<button class="yc" data-ga="score" data-i="${k}" ${ctx.my&&d.rolls&&op?'':'disabled'}><span>${n}</span><b class="${d.rolls&&pv?'pv':''}">${d.rolls?pv:'·'}</b></button>`;}).join('')}<div class="yc tot"><span>المكافأة ${up}/63</span><b>${up>=63?'+35':''}</b></div>${card[13]?`<div class="yc tot"><span>مكافأة الخمسة</span><b>+${card[13]*100}</b></div>`:''}<div class="yc tot"><span>المجموع</span><b>${yTotal(card)}</b></div></div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='hold'){if(!d.rolls||d.rolls>=3)return;act({...d,held:setAt(d.held,i,d.held[i]==='1'?'0':'1')});return;}
    if(a==='roll'){if(d.rolls>=3)return;S.rolled=true;const dice=[...d.dice].map((x,k)=>d.held[k]==='1'&&d.rolls?x:String(1+rnd(6))).join('');act({...d,dice,rolls:d.rolls+1});return;}
    if(a==='score'){if(!d.rolls||d.cards[t][i]>=0)return;const cards=d.cards.map(c=>[...c]);const nc=yPut(cards[t],i,d.dice);if(!nc)return;cards[t]=nc;
      const done=cards.every((c,s)=>d.out[s]==='1'||c.slice(0,13).every(x=>x>=0));
      act({...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:done?mostPts(cards.map((c,s)=>d.out[s]==='1'?-1:yTotal(c))):null});}
  }
};

/* ---------- liar's dice ---------- */
// Perudo rules: ones are wild; to switch to ones you may halve the count (rounded up), to leave ones you need double plus one
function liarOk(prev,q,f){if(!prev)return f!==1&&q>=1;if(prev.f!==1){if(f===1)return q>=Math.ceil(prev.q/2);return q>prev.q||(q===prev.q&&f>prev.f);}
  if(f===1)return q>prev.q;return q>=prev.q*2+1;}
GAMES.liar={name:'زهر الكذب',cat:'cards',lbc:'#4A3A6B',points:d=>d.n.map(x=>x+' 🎲'),onTimeout:d=>{const b=d.bid?(d.bid.f===1?{q:d.bid.q+1,f:1,s:d.turn}:{q:d.bid.q+1,f:d.bid.f,s:d.turn}):{q:1,f:2,s:d.turn};return {...d,bid:b,turn:nextSeat(d,d.turn)};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5E4A8A"/><path d="M20 70Q50 20 80 70Z" fill="#3B2D59"/><rect x="30" y="56" width="18" height="18" rx="4" fill="#fff"/><rect x="52" y="56" width="18" height="18" rx="4" fill="#fff"/><circle cx="39" cy="65" r="3" fill="#2D4763"/><circle cx="57" cy="61" r="2.5" fill="#2D4763"/><circle cx="65" cy="69" r="2.5" fill="#2D4763"/><text x="50" y="40" font-size="22" font-weight="800" fill="#FFD84D" text-anchor="middle">؟</text></svg>`,
  init:n=>({r:0,n:Array(n).fill(n>4?4:5),bid:null,last:''}),
  privInit:(d,r)=>{const s=d.pl.indexOf(r);const k=s>=0?d.n[s]:0;return {r:d.r,dice:Array(k).fill(0).map(()=>1+rnd(6)).join('')};},
  privStale:(d,p)=>p.r!==d.r,
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s='';
    s+=d.bid?`<div class="qbox">المزايدة: ${d.bid.q} × ${diceSVG(d.bid.f).replace('<svg ','<svg style="width:34px;height:34px;vertical-align:middle;background:#fff;border-radius:6px" ')}<br><small style="font-size:14px">من ${nm(d,d.bid.s)}</small></div>`:'<div class="qbox">ما فيه مزايدة للحين</div>';
    if(v<0)return s;const p=ctx.priv[d.pl[v]];
    if(p&&p.r===d.r)s+=`<p class="lbl">زهراتك</p><div class="row">${[...p.dice].map(x=>dieBtn(+x)).join('')}</div>`;
    if(ctx.my){const total=d.n.reduce((a,b,i)=>a+(d.out[i]==='1'?0:b),0);const minQ=d.bid?(d.bid.f===1?d.bid.q:Math.ceil(d.bid.q/2)):1;S.lq=Math.max(S.lq||minQ,minQ);S.lq=Math.min(S.lq,total);S.lf=S.lf||(d.bid?d.bid.f:1);
      s+=`<div class="stepper"><span>العدد</span><button data-ga="qd">−</button><b>${S.lq}</b><button data-ga="qu">+</button></div><div class="row">${[1,2,3,4,5,6].map(f=>`<button class="dice" style="width:46px;height:46px;${S.lf===f?'box-shadow:0 0 0 4px #ffd84d':''}" data-ga="f" data-i="${f}">${diceSVG(f).replace('<svg ','<svg style="width:36px;height:36px" ')}</button>`).join('')}</div>
      <div class="acts"><button class="btn blue" data-ga="bid">زايد</button>${d.bid?'<button class="btn red" data-ga="call">كذاب!</button><button class="btn navy" data-ga="calza">بالضبط!</button>':''}</div><p class="note">الواحد جوكر يحسب مع أي وجه</p>`;}
    return s;},
  click(a,i,d,ctx){
    if(a==='qu'){S.lq=(S.lq||1)+1;render();return;}if(a==='qd'){S.lq=Math.max(1,(S.lq||1)-1);render();return;}if(a==='f'){S.lf=i;render();return;}
    if(!ctx.my)return;const t=d.turn;
    if(a==='bid'){const q=S.lq,f=S.lf;if(!liarOk(d.bid,q,f)){toast(!d.bid&&f===1?'ما تبدأ المزايدة على الواحد':d.bid&&d.bid.f===1&&f!==1?`من الواحد لازم ${d.bid.q*2+1} أو أكثر`:'لازم تزايد أعلى من اللي قبلك');return;}
      S.lq=null;S.lf=null;act({...d,bid:{q,f,s:t},turn:nextSeat(d,t),last:`${nm(d,t)} زايد: ${q} زهرات وجهها ${f}`});return;}
    if((a==='call'||a==='calza')&&d.bid){let cnt=0,missing=false;const all=[];d.pl.forEach((r,s)=>{if(d.out[s]==='1')return;const p=S.priv[r];if(!p||p.r!==d.r){missing=true;return;}cnt+=[...p.dice].filter(x=>+x===d.bid.f||(d.bid.f!==1&&+x===1)).length;all.push(`${nm(d,s)} ${p.dice}`);});
      if(missing){toast('انتظر الباقين');return;}
      if(a==='calza'){const n=[...d.n],start=d.pl.length>4?4:5,hit=cnt===d.bid.q;let out=d.out;if(hit)n[t]=Math.min(start,n[t]+1);else{n[t]--;if(n[t]<=0)out=setAt(out,t,'1');}const al=aliveSeats(d,out);S.lq=null;S.lf=null;
        act({...d,n,out,r:d.r+1,bid:null,turn:out[t]==='1'?nextSeat(d,t,out):t,win:al.length===1?al[0]:null,last:`${nm(d,t)} قال بالضبط! كان فيه ${cnt}، ${hit?'وصدق ورجعت له زهرة 🎯':'وغلط وخسر زهرة'}. (${all.join('، ')})`});return;}
      const loser=cnt>=d.bid.q?t:d.bid.s;const n=[...d.n];n[loser]--;let out=d.out;if(n[loser]<=0)out=setAt(out,loser,'1');const al=aliveSeats(d,out);
      S.lq=null;S.lf=null;
      act({...d,n,out,r:d.r+1,bid:null,turn:out[loser]==='1'?nextSeat(d,loser,out):loser,win:al.length===1?al[0]:null,
        last:`${nm(d,t)} قال كذاب! كان فيه ${cnt} من وجه ${d.bid.f}، فخسر ${nm(d,loser)} زهرة. (${all.join('، ')})`});}
  }
};

/* ---------- shut the box ---------- */
function canMake(open,sum){const a=[];for(let k=1;k<=9;k++)if(open[k-1]==='1')a.push(k);const f=(i,s)=>s===0||(i<a.length&&s>0&&(f(i+1,s-a[i])||f(i+1,s)));return f(0,sum);}
const boxScore=b=>[...b].reduce((x,c,k)=>x+(c==='1'?k+1:0),0);
GAMES.shut={name:'أغلق الصندوق',cat:'cards',lbc:'#6B4226',onTimeout:d=>{const t=d.turn;const done=setAt(d.done,t,'1');const fin=d.pl.every((r,s)=>d.out[s]==='1'||done[s]==='1');const o2=d.out.split('').map((c,s)=>c==='1'||done[s]==='1'?'1':'0').join('');let win=null;if(fin){const sc=d.boxes.map((bb,s)=>d.out[s]==='1'?99:boxScore(bb));const mn=Math.min(...sc);const top=sc.map((x,s)=>x===mn?s:-1).filter(s=>s>=0);win=top.length===1?top[0]:'d';}return {...d,done,roll:0,dice:'',turn:nextSeat(d,t,o2),win};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8C5A34"/><rect x="8" y="30" width="84" height="40" rx="6" fill="#5B3A20"/>${[1,2,3,4,5,6,7,8,9].map(k=>`<rect x="${10+(k-1)*9}" y="${k%3?34:44}" width="7.5" height="${k%3?30:20}" rx="2" fill="${k%3?'#F3D9AE':'#C9A15B'}"/>`).join('')}</svg>`,
  init:n=>({boxes:Array(n).fill('111111111'),done:'0'.repeat(n),roll:0,dice:'',last:''}),
  points:d=>d.boxes.map((b,s)=>d.done[s]==='1'?boxScore(b):'…'),status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>d.boxes.map((b,s)=>`${nm(d,s)} ${boxScore(b)}`).join('، '),
  render(d,ctx){const t=d.turn,b=d.boxes[t];S.sel=S.sel||[];const sel=S.sel.reduce((a,x)=>a+x,0);const small=b.slice(6)==='000';const anim=S.rolled;S.rolled=false;
    let s=`<p class="lbl" style="text-align:center">صندوق ${nameTag(d,t)}</p><div class="sbox">${[...b].map((c,k)=>c==='1'?`<button class="stile ${S.sel.includes(k+1)?'sel':''}" data-ga="tile" data-i="${k+1}" ${ctx.my&&d.roll?'':'disabled'}>${k+1}</button>`:`<div class="stile shut"></div>`).join('')}</div>`;
    const dv=d.dice?[...d.dice].map(Number):[5,2];const canR=ctx.my&&!d.roll&&d.win==null;
    s+=`<div class="row" style="align-items:center;gap:12px">${dv.map(x=>tapDie(x,canR,col(d,t),anim?'roll':'')).join('')}${d.roll?`<b class="rollsum">= ${d.roll}</b>`:''}</div>`;
    if(ctx.my){if(!d.roll){if(small)s+=`<div class="acts"><button class="btn navy" data-ga="roll1">ارمِ زهرة وحدة بس</button></div>`;}
      else s+=`<div class="acts"><button class="btn blue" data-ga="ok" ${sel===d.roll?'':'disabled'}>اقفلها (${sel} من ${d.roll})</button></div>`;}
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,b=d.boxes[t];
    if(a==='tile'){S.sel=S.sel||[];S.sel=S.sel.includes(i)?S.sel.filter(x=>x!==i):[...S.sel,i];render();return;}
    if(a==='roll'||a==='roll1'){if(d.roll)return;S.rolled=true;S.sel=[];const dice=a==='roll'?String(1+rnd(6))+String(1+rnd(6)):String(1+rnd(6));const roll=[...dice].reduce((x,c)=>x+ +c,0);
      if(!canMake(b,roll)){const done=setAt(d.done,t,'1');const fin=d.pl.every((r,s)=>d.out[s]==='1'||done[s]==='1');
        act({...d,dice,roll:0,done,turn:nextSeat(d,t,d.out.split('').map((c,s)=>c==='1'||done[s]==='1'?'1':'0').join('')),last:`${nm(d,t)} طلع ${roll} وما يقدر يقفل، نتيجته ${boxScore(b)}`,
          win:fin?(()=>{const sc=d.boxes.map((bb,s)=>d.out[s]==='1'?99:boxScore(bb));const mn=Math.min(...sc);const top=sc.map((x,s)=>x===mn?s:-1).filter(s=>s>=0);return top.length===1?top[0]:'d';})():null});return;}
      act({...d,dice,roll});return;}
    if(a==='ok'){S.sel=S.sel||[];if(S.sel.reduce((x,y)=>x+y,0)!==d.roll)return;let nb=b;S.sel.forEach(k=>nb=setAt(nb,k-1,'0'));S.sel=[];const boxes=[...d.boxes];boxes[t]=nb;
      if(nb==='000000000'){act({...d,boxes,roll:0,dice:'',win:t,last:`${nm(d,t)} قفل الصندوق كامل!`});return;}
      act({...d,boxes,roll:0});}
  }
};

/* ---------- camel race: five racing camels, bet on the leg, the coins decide ----------
   On your turn either shake the pyramid (a random camel that has not moved this leg runs 1 to 3 steps
   and you earn a coin) or take the best betting card left for a camel. A camel that lands on others climbs
   on top, and a camel carries every camel riding on it. When all five have moved the leg is scored:
   a card on the leader pays its value, on the second camel 1, on any other camel it costs 1.
   The race ends when a camel crosses the finish; the richest player wins. */
const CML=[['#E5483F','الأحمر'],['#3D8FD8','الأزرق'],['#3FAE5C','الأخضر'],['#F0B429','الأصفر'],['#ECEFF1','الأبيض']];
const CTRACK=16,CTILES=[5,3,2];
// camel order on the track: furthest first, and on the same square the one on top first
const cRank=cam=>[0,1,2,3,4].sort((a,b)=>cam[b][0]-cam[a][0]||cam[b][1]-cam[a][1]);
function cMove(cam,c,r){const [p,h]=cam[c];const ride=[0,1,2,3,4].filter(x=>cam[x][0]===p&&cam[x][1]>=h).sort((a,b)=>cam[a][1]-cam[b][1]);
  const to=p+r;const base=[0,1,2,3,4].filter(x=>!ride.includes(x)&&cam[x][0]===to).length;const n=cam.map(x=>[...x]);ride.forEach((x,k)=>{n[x]=[to,base+k];});return n;}
function cLegScore(d,cam){const rk=cRank(cam);const co=[...d.co];const lines=[];
  for(const [s,c,v] of d.bt){const g=rk[0]===c?v:rk[1]===c?1:-1;co[s]=Math.max(0,co[s]+g);lines.push(`${nm(d,s)} ${g>0?'+':''}${g}`);}
  return {co,msg:`انتهى الشوط، المتصدر ${CML[rk[0]][1]}`+(lines.length?`: ${lines.join('، ')}`:'')};}
function cNewLeg(d){return {dl:'00000',tk:[0,0,0,0,0],bt:[],lg:(d.lg||0)+1};}
GAMES.camel={name:'سباق الهجن',cat:'cards',lbc:'#B8860B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8C16A"/><path d="M0 74Q25 64 50 74T100 74V100H0Z" fill="#D9A441"/><text x="50" y="66" font-size="44" text-anchor="middle">🐪</text></svg>`,
  init:n=>{let cam=[0,1,2,3,4].map(()=>[0,0]);const ord=shuffle([0,1,2,3,4]);for(const c of ord){const p=rnd(3);const h=cam.filter((x,k)=>k!==c&&ord.indexOf(k)<ord.indexOf(c)&&x[0]===p).length;cam[c]=[p,h];}
    return {cam,co:Array(n).fill(3),...cNewLeg({}),ld:null,last:''};},
  points:d=>d.co,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+(d.win==null?`<small>الشوط ${d.lg}</small> • `:'')+turnTxt(d,ctx),
  winExtra:d=>'الفلوس: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.co[s]} 🪙`).join('، '),
  render(d,ctx){const my=ctx.my&&d.win==null;const rk=cRank(d.cam);
    const chip=(c,big)=>`<span class="cm ${big?'big':''}" style="--c:${CML[c][0]}">🐪</span>`;
    // the track bends: squares 1 to 8 on the top row, 9 to 16 back along the bottom row
    const cell=p=>{const here=[0,1,2,3,4].filter(c=>d.cam[c][0]===p).sort((a,b)=>d.cam[a][1]-d.cam[b][1]);const moved=d.ld&&here.includes(d.ld[0]);
      return `<div class="ct ${moved?'mv':''}"><small>${p+1}</small><div class="cst">${here.map(c=>chip(c)).join('')}</div></div>`;};
    const top=[...Array(8).keys()].map(cell).join(''),bot=[...Array(8).keys()].map(k=>cell(15-k)).join('');
    const over=[0,1,2,3,4].filter(c=>d.cam[c][0]>=CTRACK);
    let s=`<div class="ctrack"><div class="crow">${top}</div><div class="crow">${bot}</div><div class="cfin">🏁 ${over.length?over.sort((a,b)=>d.cam[b][1]-d.cam[a][1]).map(c=>chip(c)).join(''):'خط النهاية'}</div></div>`;
    s+=`<div class="cpyr">${[0,1,2,3,4].map(c=>{const v=d.dl[c];return `<span class="cd ${v!=='0'?'done':''} ${d.ld&&d.ld[0]===c?'last':''}" style="--c:${CML[c][0]}">${v==='0'?'?':v}</span>`;}).join('')}
      <button class="btn red" data-ga="roll" ${my?'':'disabled'}>🎲 هز الهرم <small>+1 🪙</small></button></div>`;
    s+=`<p class="lbl" style="text-align:center;margin:8px 0 4px">راهن على مين يتصدر الشوط</p><div class="cbets">${[0,1,2,3,4].map(c=>{const t=d.tk[c];const v=CTILES[t];const pos=rk.indexOf(c)+1;
      return `<button class="cbet" style="--c:${CML[c][0]}" data-ga="bet" data-i="${c}" ${my&&v?'':'disabled'}>${chip(c,1)}<b>${v?v:'—'}</b><small>${pos===1?'الأول':pos===2?'الثاني':'المركز '+pos}</small></button>`;}).join('')}</div>`;
    const mine=d.bt.filter(b=>b[0]===(ctx.local?d.turn:ctx.v));
    if(d.bt.length)s+=`<div class="cmine">${d.bt.map(([x,c,v])=>`<span style="--c:${col(d,x)}">${nm(d,x)} ${chip(c)} ${v}</span>`).join('')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='bet'){const v=CTILES[d.tk[i]];if(!v)return;const tk=[...d.tk];tk[i]++;act({...d,tk,bt:[...d.bt,[t,i,v]],ld:null,turn:nextSeat(d,t),last:`${nm(d,t)} راهن على ${CML[i][1]} بـ${v}`});return;}
    if(a!=='roll')return;const left=[0,1,2,3,4].filter(c=>d.dl[c]==='0');const c=left[rnd(left.length)],r=1+rnd(3);
    const cam=cMove(d.cam,c,r);const co=[...d.co];co[t]++;let x={...d,cam,co,dl:setAt(d.dl,c,String(r)),ld:[c,r],last:`${nm(d,t)} هز الهرم: ${CML[c][1]} مشى ${r}`};
    const fin=[0,1,2,3,4].some(k=>cam[k][0]>=CTRACK);
    if(fin||!x.dl.includes('0')){const sc=cLegScore(x,cam);x={...x,co:sc.co,last:x.last+' • '+sc.msg};
      if(fin){act({...x,win:mostPts(x.co),last:x.last+` • ${CML[cRank(cam)[0]][1]} فاز بالسباق 🏁`});return;}x={...x,...cNewLeg(x)};}
    act({...x,turn:nextSeat(d,t)});},
  onTimeout:d=>{const left=[0,1,2,3,4].filter(c=>d.dl[c]==='0');return {...d,turn:nextSeat(d,d.turn),last:`${nm(d,d.turn)} فوّت دوره`};}
};

/* ---------- lucky boxes: push your luck ----------
   Open boxes one by one and collect their coins in your bag; a ×2 box doubles the bag.
   Stop whenever you like and keep the bag, but a bomb empties it and ends your turn.
   When only bombs are left the richest player wins. */
const luckLeft=d=>{let safe=0,bomb=0;for(let i=0;i<d.box.length;i++)if(d.op[i]==='.'){if(d.box[i]==='b')bomb++;else safe++;}return {safe,bomb};};
function luckEnd(d){const {safe}=luckLeft(d);return safe?d:{...d,win:mostPts(d.pts)};}
function luckBank(d){const t=d.turn,pts=[...d.pts];pts[t]+=d.bag;return luckEnd({...d,pts,bag:0,turn:nextSeat(d,t),last:`${nm(d,t)} أخذ غنيمته ${d.bag} 💰`});}
GAMES.luck={name:'صناديق الحظ',cat:'cards',lbc:'#A5373F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9464F"/>${[[14,20],[54,20],[14,58],[54,58]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="32" height="26" rx="4" fill="${k===3?'#2D4763':'#F2C14E'}"/><rect x="${x+13}" y="${y}" width="6" height="26" fill="${k===3?'#1d2f44':'#D9A441'}"/>`).join('')}<text x="70" y="78" font-size="16" text-anchor="middle">💣</text></svg>`,
  init:n=>{const k=16+2*n,b=3+Math.floor(n/2);const a=[];for(let i=0;i<k;i++)a.push(i<b?'b':i<b+2?'x':String(1+rnd(6)));return {box:shuffle(a).join(''),op:'.'.repeat(k),pts:Array(n).fill(0),bag:0,last:''};},
  points:d=>d.pts,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const k=d.box.length,c=k<=20?5:6;const {safe,bomb}=luckLeft(d);const my=ctx.my&&d.win==null;
    let s=`<div class="lbag"><div><small>الكيس</small><b>${d.bag} 💰</b></div><div><small>باقي</small><b>${safe+bomb} 🎁</b></div><div><small>القنابل</small><b>${bomb} 💣</b></div></div>`;
    s+=`<div class="cellgrid lbox" style="grid-template-columns:repeat(${c},minmax(0,1fr))">${[...d.box].map((v,i)=>{const o=d.op[i];
      if(o==='.')return `<button class="cg" data-ga="m" data-i="${i}" ${my?'':'disabled'}>${d.win!=null&&v==='b'?'💣':'🎁'}</button>`;
      return `<div class="cg op ${v==='b'?'bm':''} ${once('lb'+d.gid+i)?'pop':''}" style="--c:${col(d,+o)}">${v==='b'?'💥':v==='x'?'×2':'+'+v}</div>`;}).join('')}</div>`;
    if(my)s+=`<div class="acts"><button class="btn green" data-ga="bank" ${d.bag?'':'disabled'}>💰 خذ الغنيمة ${d.bag?`(+${d.bag})`:''}</button></div><p class="note" style="text-align:center">افتح صندوق كمان أو خذ اللي في الكيس. القنبلة تضيّع الكيس كله</p>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='bank'){if(d.bag)act(luckBank(d));return;}
    if(d.op[i]!=='.')return;const v=d.box[i];const op=setAt(d.op,i,String(t));
    if(v==='b'){act(luckEnd({...d,op,bag:0,turn:nextSeat(d,t),last:`💥 ${nm(d,t)} فتح قنبلة وضاع كيسه (${d.bag})`}));return;}
    const bag=v==='x'?Math.max(2,d.bag*2):d.bag+ +v;const nd={...d,op,bag,last:`${nm(d,t)} ${v==='x'?'ضاعف كيسه ×2':'لقى '+v}`};
    if(!luckLeft(nd).safe){act(luckBank(nd));return;}act(nd);},
  onTimeout:d=>d.bag?luckBank(d):{...d,turn:nextSeat(d,d.turn)}
};

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
// the game ends when every seat still playing has filled all 13 boxes; seats that left never win
const yWin=(d,cards)=>cards.every((c,s)=>d.out[s]==='1'||c.slice(0,13).every(x=>x>=0))?mostPts(cards.map((c,s)=>d.out[s]==='1'?-1:yTotal(c))):null;
function yPut(card,k,dice){const c=[...card];const o=yOpts(card,dice).find(x=>x[0]===k);if(!o)return null;if(yIsY(dice)&&card[11]===50)c[13]=(c[13]||0)+1;c[k]=o[1];return c;}
GAMES.yatzy={name:'خمس زهرات',cat:'cards',lbc:'#B03A48',onTimeout:d=>{const t=d.turn;const cards=d.cards.map(c=>[...c]);const empty=cards[t].map((v,k)=>k<13&&v<0?k:-1).filter(k=>k>=0);let best=empty[0];if(!empty.length)return {...d,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:yWin(d,cards)};if(d.rolls){const o=yOpts(cards[t],d.dice);const b=o.reduce((x,y)=>y[1]>x[1]?y:x);cards[t]=yPut(cards[t],b[0],d.dice);}else cards[t][best]=0;return {...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:yWin(d,cards)};},
  // a player who leaves takes his roll with him, and if he was the last one still playing the game ends
  onSkip(nd,d){let x=nd.turn!==d.turn?{...nd,dice:'00000',held:'00000',rolls:0}:nd;if(x.win!=null)return x;const win=yWin(x,x.cards);if(win!=null)return {...x,win};
    if(x.cards[x.turn].slice(0,13).every(v=>v>=0))x={...x,turn:nextSeat(x,x.turn,x.out.split('').map((c,s)=>c==='1'||x.cards[s].slice(0,13).every(v=>v>=0)?'1':'0').join(''))};return x;},
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
      act({...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:yWin(d,cards)});}
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
  // online, the dice stay with the host and their owner: «كذاب» and «بالضبط» count them on the host; nobody sets their own dice
  net:{host:['call','calza'],local:['qu','qd','f']},privOk:()=>false,
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s='';
    s+=d.bid?`<div class="qbox">المزايدة: ${d.bid.q} × ${diceSVG(d.bid.f).replace('<svg ','<svg style="width:34px;height:34px;vertical-align:middle;background:#fff;border-radius:6px" ')}<br><small style="font-size:14px">من ${nm(d,d.bid.s)}</small></div>`:'<div class="qbox">ما فيه مزايدة للحين</div>';
    if(v<0)return s;const p=ctx.priv[d.pl[v]];
    if(p&&p.r===d.r)s+=`<p class="lbl">زهراتك</p><div class="row">${[...p.dice].map(x=>dieBtn(+x)).join('')}</div>`;
    if(ctx.my){const total=d.n.reduce((a,b,i)=>a+(d.out[i]==='1'?0:b),0);const minQ=d.bid?(d.bid.f===1?d.bid.q:Math.ceil(d.bid.q/2)):1;S.lq=Math.max(S.lq||minQ,minQ);S.lq=Math.min(S.lq,total);S.lf=S.lf||(d.bid?d.bid.f:2);
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
// everyone has finished: lowest box wins, seats that left count as 99
const shutWin=d=>{const sc=d.boxes.map((bb,s)=>d.out[s]==='1'?99:boxScore(bb));const mn=Math.min(...sc);const top=sc.map((x,s)=>x===mn?s:-1).filter(s=>s>=0);return top.length===1?top[0]:'d';};
const shutOut=(d,done)=>d.out.split('').map((c,s)=>c==='1'||done[s]==='1'?'1':'0').join('');
GAMES.shut={name:'أغلق الصندوق',cat:'cards',lbc:'#6B4226',onTimeout:d=>{const t=d.turn;const done=setAt(d.done,t,'1');const o2=shutOut(d,done);return {...d,done,roll:0,dice:'',turn:nextSeat(d,t,o2),win:o2.includes('0')?null:shutWin(d)};},
  // the next player never inherits the roll of a player who left, finished players get no extra turn, and the game ends when nobody is left to play
  onSkip(nd,d){let x=nd.turn!==d.turn?{...nd,roll:0,dice:''}:nd;if(x.win!=null)return x;const o2=shutOut(x,x.done);if(!o2.includes('0'))return {...x,roll:0,dice:'',win:shutWin(x)};
    if(o2[x.turn]==='1')x={...x,roll:0,dice:'',turn:nextSeat(x,x.turn,o2)};return x;},
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
      if(!canMake(b,roll)){const done=setAt(d.done,t,'1');const o2=shutOut(d,done);
        act({...d,dice,roll:0,done,turn:nextSeat(d,t,o2),last:`${nm(d,t)} طلع ${roll} وما يقدر يقفل، نتيجته ${boxScore(b)}`,win:o2.includes('0')?null:shutWin(d)});return;}
      act({...d,dice,roll});return;}
    if(a==='ok'){S.sel=S.sel||[];if(S.sel.reduce((x,y)=>x+y,0)!==d.roll)return;let nb=b;S.sel.forEach(k=>nb=setAt(nb,k-1,'0'));S.sel=[];const boxes=[...d.boxes];boxes[t]=nb;
      if(nb==='000000000'){act({...d,boxes,roll:0,dice:'',win:t,last:`${nm(d,t)} قفل الصندوق كامل!`});return;}
      act({...d,boxes,roll:0});}
  }
};

/* ---------- camel race ---------- */
const TRACK=30,BOOST={5:3,12:3,19:3,25:2},TRAP={9:-3,16:-4,22:-3,28:-5};
GAMES.camel={name:'سباق الهجن',cat:'cards',lbc:'#B8860B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8C16A"/><path d="M0 74Q25 64 50 74T100 74V100H0Z" fill="#D9A441"/><text x="50" y="66" font-size="44" text-anchor="middle">🐪</text></svg>`,
  init:n=>({pos:Array(n).fill(0),dice:0,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const anim=S.rolled;S.rolled=false;
    const mk=k=>BOOST[k]?'⚡':TRAP[k]?'🌵':'';
    let s=`<div class="race">${d.pl.map((r,i)=>{const p=Math.min(d.pos[i],TRACK);const pct=p/TRACK*100;
      return `<div class="lane ${d.turn===i&&d.win==null?'on':''}" style="--c:${col(d,i)};--l:${lit(d,i)}"><div class="lname"><i>${shapeW(d.pl[i])}</i><span>${!ctx.local&&i===ctx.v?'أنت':nm(d,i)}</span><b>${p}/${TRACK}</b></div>
      <div class="track"><div class="fill" style="width:${pct}%"></div>${Array(TRACK).fill(0).map((_,k)=>mk(k+1)?`<span class="mk" style="inset-inline-start:${(k+1)/TRACK*100}%">${mk(k+1)}</span>`:'').join('')}<span class="camelp" style="inset-inline-start:${pct}%">🐪</span><span class="flag">🏁</span></div></div>`;}).join('')}</div>`;
    s+=`<div class="row">${tapDie(d.dice,ctx.my&&d.win==null,col(d,d.turn),anim?'roll':'')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my)return;const t=d.turn,r=1+rnd(6);S.rolled=true;let p=d.pos[t]+r,msg=`طلع ${r}`;
    if(BOOST[p]){const b=BOOST[p];p+=b;msg+=`، ⚡ تقدّم ${b}`;}else if(TRAP[p]){p=Math.max(0,p+TRAP[p]);msg+='، 🌵 رجع';}
    const pos=[...d.pos];pos[t]=p;act({...d,pos,dice:r,win:p>=TRACK?t:null,turn:nextSeat(d,t),last:`${nm(d,t)}: ${msg}`});}
};

/* ---------- lucky boxes ---------- */
GAMES.luck={name:'صناديق الحظ',cat:'cards',lbc:'#A5373F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9464F"/>${[[14,20],[54,20],[14,58],[54,58]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="32" height="26" rx="4" fill="${k===3?'#2D4763':'#F2C14E'}"/><rect x="${x+13}" y="${y}" width="6" height="26" fill="${k===3?'#1d2f44':'#D9A441'}"/>`).join('')}<text x="70" y="78" font-size="16" text-anchor="middle">💣</text></svg>`,
  // what is inside a box is decided only when it is opened (nb bombs are still hidden among the closed boxes), so the shared state never holds the bomb positions
  init:n=>{const k=10+2*n;return {box:'?'.repeat(k),nb:Math.max(1,Math.floor(n/2)),op:'.'.repeat(k),pts:Array(n).fill(0),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const k=d.box.length,c=k<=16?4:k<=20?5:6;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${c},minmax(0,1fr));background:#7A2B31">${[...d.box].map((v,i)=>{const o=d.op[i];
      if(o==='.')return `<button class="cg" style="background:#F2C14E;font-size:24px" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}>${d.win!=null&&v==='b'?'💣':'🎁'}</button>`;
      return `<div class="cg" style="background:${lit(d,+o)};font-size:${v==='b'?24:22}px;box-shadow:inset 0 0 0 3px ${col(d,+o)}">${v==='b'?'💥':'<span class="ltr">+'+v+'</span>'}</div>`;}).join('')}</div>`;},
  click(a,i,d,ctx){if(!ctx.my||d.op[i]!=='.')return;const t=d.turn,shut=[...d.op].filter(c=>c==='.').length;
    const v=d.nb==null?d.box[i]:rnd(shut)<d.nb?'b':String(1+rnd(5));let nb=d.nb==null?null:d.nb-(v==='b'?1:0),box=setAt(d.box,i,v);
    const op=setAt(d.op,i,String(t));let out=d.out,pts=[...d.pts],last;
    if(v==='b'){out=setAt(out,t,'1');last=`${nm(d,t)} فتح صندوق 💣 وطلع`;}else{pts[t]+=+v;last=`${nm(d,t)} أخذ ${v} نقاط`;}
    const al=aliveSeats(d,out);const left=nb==null?[...box].some((x,k)=>op[k]==='.'&&x!=='b'):shut-1>nb;let win=null;
    if(al.length===1)win=al[0];else if(!left)win=mostPts(pts.map((x,s)=>out[s]==='1'?-1:x));
    // at the end the closed boxes show where the remaining bombs were
    if(win!=null&&nb!=null){const cl=shuffle([...op].map((c,k)=>c==='.'?k:-1).filter(k=>k>=0));cl.forEach((k,j)=>{box=setAt(box,k,j<nb?'b':String(1+rnd(5)));});nb=0;}
    act({...d,box,nb,op,out,pts,last,win,turn:nextSeat(d,t,out)});}
};

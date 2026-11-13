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
const yTotal=card=>{const up=card.slice(0,6).reduce((a,b)=>a+Math.max(b,0),0);return card.reduce((a,b)=>a+Math.max(b,0),0)+(up>=63?35:0);};
GAMES.yatzy={name:'خمس زهرات',cat:'cards',lbc:'#B03A48',onTimeout:d=>{const t=d.turn;const cards=d.cards.map(c=>[...c]);const empty=cards[t].map((v,k)=>v<0?k:-1).filter(k=>k>=0);let best=empty[0];if(d.rolls){let bv=-1;for(const k of empty){const v=yScore(k,d.dice);if(v>bv){bv=v;best=k;}}cards[t][best]=bv;}else cards[t][best]=0;const done=cards.every((c,s)=>d.out[s]==='1'||c.every(x=>x>=0));return {...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:done?mostPts(cards.map((c,s)=>d.out[s]==='1'?-1:yTotal(c))):null};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D5505F"/>${[[14,16],[52,12],[30,50],[64,48],[22,78]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="26" height="26" rx="6" fill="#fff" transform="rotate(${k*9-18} ${x+13} ${y+13})"/><circle cx="${x+13}" cy="${y+13}" r="4" fill="#2D4763"/>`).join('')}</svg>`,
  init:n=>({dice:'00000',held:'00000',rolls:0,cards:Array(n).fill(0).map(()=>Array(13).fill(-1))}),
  status:(d,ctx)=>turnTxt(d,ctx)+'<br>'+d.cards.map((c,s)=>`<span class="mini" style="background:${col(d,s)}">${yTotal(c)}</span>`).join('')+`<br><small>3 رميات بالدور، ثبّت الزهر اللي تبيه واختر خانة تسجل فيها</small>`,
  winExtra:d=>'المجموع: '+d.cards.map((c,s)=>`${nm(d,s)} ${yTotal(c)}`).join('، '),
  render(d,ctx){const t=d.turn;const card=d.cards[t];const anim=S.rolled;S.rolled=false;
    let s=`<div class="row ${anim?'':''}">${[...d.dice].map((x,i)=>dieBtn(+x,d.held[i]==='1',ctx.my&&d.rolls>0&&d.rolls<3?`data-ga="hold" data-i="${i}"`:'')).join('')}</div>`;
    s+=`<div class="row"><button class="big" style="width:auto;margin:0;background:${col(d,t)}" data-ga="roll" ${ctx.my&&d.rolls<3?'':'disabled'}>ارمِ (${3-d.rolls} باقي)</button></div>`;
    s+=`<p class="lbl" style="text-align:center">بطاقة ${nameTag(d,t)}</p><div style="width:100%;max-width:420px">${YC.map((n,k)=>{const v=card[k];const pv=d.rolls?yScore(k,d.dice):0;
      return v>=0?`<div class="opt" style="display:flex;justify-content:space-between;opacity:.6;padding:8px 12px"><span>${n}</span><b>${v}</b></div>`:`<button class="opt" style="display:flex;justify-content:space-between;padding:8px 12px" data-ga="score" data-i="${k}" ${ctx.my&&d.rolls?'':'disabled'}><span>${n}</span><b style="color:var(--blue)">${d.rolls?pv:''}</b></button>`;}).join('')}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='hold'){if(!d.rolls||d.rolls>=3)return;act({...d,held:setAt(d.held,i,d.held[i]==='1'?'0':'1')});return;}
    if(a==='roll'){if(d.rolls>=3)return;S.rolled=true;const dice=[...d.dice].map((x,k)=>d.held[k]==='1'&&d.rolls?x:String(1+rnd(6))).join('');act({...d,dice,rolls:d.rolls+1});return;}
    if(a==='score'){if(!d.rolls||d.cards[t][i]>=0)return;const cards=d.cards.map(c=>[...c]);cards[t][i]=yScore(i,d.dice);
      const done=cards.every((c,s)=>d.out[s]==='1'||c.every(x=>x>=0));
      act({...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:done?mostPts(cards.map((c,s)=>d.out[s]==='1'?-1:yTotal(c))):null});}
  }
};

/* ---------- liar's dice ---------- */
GAMES.liar={name:'زهر الكذب',cat:'cards',lbc:'#4A3A6B',onTimeout:d=>{const b=d.bid?{q:d.bid.q+1,f:d.bid.f,s:d.turn}:{q:1,f:1,s:d.turn};return {...d,bid:b,turn:nextSeat(d,d.turn)};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5E4A8A"/><path d="M20 70Q50 20 80 70Z" fill="#3B2D59"/><rect x="30" y="56" width="18" height="18" rx="4" fill="#fff"/><rect x="52" y="56" width="18" height="18" rx="4" fill="#fff"/><circle cx="39" cy="65" r="3" fill="#2D4763"/><circle cx="57" cy="61" r="2.5" fill="#2D4763"/><circle cx="65" cy="69" r="2.5" fill="#2D4763"/><text x="50" y="40" font-size="22" font-weight="800" fill="#FFD84D" text-anchor="middle">؟</text></svg>`,
  init:n=>({r:0,n:Array(n).fill(n>4?4:5),bid:null,last:''}),
  privInit:(d,r)=>{const s=d.pl.indexOf(r);const k=s>=0?d.n[s]:0;return {r:d.r,dice:Array(k).fill(0).map(()=>1+rnd(6)).join('')};},
  privStale:(d,p)=>p.r!==d.r,
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+'<br><small>زايد على عدد زهرات وجه معيّن عند الكل، أو قل «كذاب». اللي يغلط يخسر زهرة</small>',
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s=`<div class="score" style="gap:4px">${d.pl.map((r,i)=>d.out[i]==='1'?'':`<span class="chip" style="background:${col(d,i)}">${!ctx.local&&i===ctx.v?'أنت':nm(d,i)} 🎲${d.n[i]}</span>`).join('')}</div>`;
    s+=d.bid?`<div class="qbox">المزايدة: ${d.bid.q} × ${diceSVG(d.bid.f).replace('<svg ','<svg style="width:34px;height:34px;vertical-align:middle;background:#fff;border-radius:6px" ')}<br><small style="font-size:14px">من ${nm(d,d.bid.s)}</small></div>`:'<div class="qbox">ما فيه مزايدة للحين</div>';
    if(v<0)return s;const p=ctx.priv[d.pl[v]];
    if(p&&p.r===d.r)s+=`<p class="lbl">زهراتك</p><div class="row">${[...p.dice].map(x=>dieBtn(+x)).join('')}</div>`;
    if(ctx.my){const total=d.n.reduce((a,b,i)=>a+(d.out[i]==='1'?0:b),0);const minQ=d.bid?d.bid.q:1;S.lq=Math.max(S.lq||minQ,minQ);S.lq=Math.min(S.lq,total);S.lf=S.lf||(d.bid?d.bid.f:1);
      s+=`<div class="stepper"><span>العدد</span><button data-ga="qd">−</button><b>${S.lq}</b><button data-ga="qu">+</button></div><div class="row">${[1,2,3,4,5,6].map(f=>`<button class="dice" style="width:46px;height:46px;${S.lf===f?'box-shadow:0 0 0 4px #ffd84d':''}" data-ga="f" data-i="${f}">${diceSVG(f).replace('<svg ','<svg style="width:36px;height:36px" ')}</button>`).join('')}</div>
      <div class="row"><button class="big blue" style="width:auto;margin:0" data-ga="bid">زايد</button>${d.bid?'<button class="big red" style="width:auto;margin:0" data-ga="call">كذاب!</button>':''}</div>`;}
    return s;},
  click(a,i,d,ctx){
    if(a==='qu'){S.lq=(S.lq||1)+1;render();return;}if(a==='qd'){S.lq=Math.max(1,(S.lq||1)-1);render();return;}if(a==='f'){S.lf=i;render();return;}
    if(!ctx.my)return;const t=d.turn;
    if(a==='bid'){const q=S.lq,f=S.lf;if(d.bid&&!(q>d.bid.q||(q===d.bid.q&&f>d.bid.f))){toast('لازم تزايد أعلى من اللي قبلك');return;}
      S.lq=null;S.lf=null;act({...d,bid:{q,f,s:t},turn:nextSeat(d,t),last:`${nm(d,t)} زايد: ${q} زهرات وجهها ${f}`});return;}
    if(a==='call'&&d.bid){let cnt=0,missing=false;const all=[];d.pl.forEach((r,s)=>{if(d.out[s]==='1')return;const p=S.priv[r];if(!p||p.r!==d.r){missing=true;return;}cnt+=[...p.dice].filter(x=>+x===d.bid.f).length;all.push(`${nm(d,s)} ${p.dice}`);});
      if(missing){toast('انتظر الباقين');return;}
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
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+'<br>'+d.boxes.map((b,s)=>`<span class="mini" style="background:${col(d,s)}">${d.done[s]==='1'?boxScore(b):'…'}</span>`).join('')+'<br><small>ارمِ واقفل أرقام مجموعها نفس الرمية. الأقل مجموع في الآخر يفوز</small>',
  winExtra:d=>d.boxes.map((b,s)=>`${nm(d,s)} ${boxScore(b)}`).join('، '),
  render(d,ctx){const t=d.turn,b=d.boxes[t];S.sel=S.sel||[];const sel=S.sel.reduce((a,x)=>a+x,0);const small=b.slice(6)==='000';const anim=S.rolled;S.rolled=false;
    let s=`<div class="row">${[...b].map((c,k)=>c==='1'?`<button class="dice" style="width:36px;height:60px;font-size:22px;font-weight:800;${S.sel.includes(k+1)?'background:#ffd84d':''}" data-ga="tile" data-i="${k+1}" ${ctx.my&&d.roll?'':'disabled'}>${k+1}</button>`:`<div class="dice" style="width:36px;height:60px;background:#8C5A34;opacity:.5"></div>`).join('')}</div>`;
    s+=`<div class="row" style="align-items:center">${[...d.dice].map(x=>dieBtn(+x)).join('')}${d.roll?`<b style="font-size:24px">= ${d.roll}</b>`:''}</div>`;
    if(ctx.my){if(!d.roll)s+=`<div class="row"><button class="big" style="width:auto;margin:0;background:${col(d,t)}" data-ga="roll">ارمِ زهرتين</button>${small?'<button class="big navy" style="width:auto;margin:0" data-ga="roll1">ارمِ زهرة وحدة</button>':''}</div>`;
      else s+=`<div class="row"><button class="big blue" style="width:auto;margin:0" data-ga="ok" ${sel===d.roll?'':'disabled'}>اقفلها (${sel} من ${d.roll})</button></div>`;}
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

/* ---------- camel race ---------- */
const TRACK=30,BOOST={5:3,12:3,19:3,25:2},TRAP={9:-3,16:-4,22:-3,28:-5};
GAMES.camel={name:'سباق الهجن',cat:'cards',lbc:'#B8860B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8C16A"/><path d="M0 74Q25 64 50 74T100 74V100H0Z" fill="#D9A441"/><text x="50" y="66" font-size="44" text-anchor="middle">🐪</text></svg>`,
  init:n=>({pos:Array(n).fill(0),dice:0,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>أول ناقة توصل ${TRACK} تفوز. ⚡ يقدّمك، 🌵 يرجّعك</small>`,
  render(d,ctx){const anim=S.rolled;S.rolled=false;
    let s=`<div style="width:100%;background:#F3DFA8;border-radius:18px;padding:8px">${d.pl.map((r,i)=>{const p=d.pos[i];
      return `<div style="position:relative;height:40px;margin:4px 0;background:repeating-linear-gradient(90deg,#EBCF8C 0 calc(100%/${TRACK}),#E2C47E calc(100%/${TRACK}) calc(200%/${TRACK}));border-radius:10px;border-inline-start:6px solid ${col(d,i)}">
      ${Object.keys(BOOST).map(k=>`<span style="position:absolute;inset-inline-start:${k/TRACK*94}%;top:10px;font-size:14px">⚡</span>`).join('')}${Object.keys(TRAP).map(k=>`<span style="position:absolute;inset-inline-start:${k/TRACK*94}%;top:10px;font-size:14px">🌵</span>`).join('')}
      <span style="position:absolute;inset-inline-start:${Math.min(p,TRACK)/TRACK*92}%;top:2px;font-size:28px;transition:inset-inline-start .4s;transform:scaleX(-1);filter:drop-shadow(0 0 2px ${col(d,i)})">🐪</span><span style="position:absolute;inset-inline-end:4px;top:10px;font-size:14px">🏁</span></div>`;}).join('')}</div>`;
    s+=`<div class="row" style="align-items:center"><div class="dice ${anim?'roll':''}">${d.dice?diceSVG(d.dice):''}</div><button class="big" style="width:auto;margin:0;background:${col(d,d.turn)}" data-ga="roll" ${ctx.my?'':'disabled'}>ارمِ</button></div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my)return;const t=d.turn,r=1+rnd(6);S.rolled=true;let p=d.pos[t]+r,msg=`طلع ${r}`;
    if(BOOST[p]){const b=BOOST[p];p+=b;msg+=`، ⚡ تقدّم ${b}`;}else if(TRAP[p]){p=Math.max(0,p+TRAP[p]);msg+='، 🌵 رجع';}
    const pos=[...d.pos];pos[t]=p;act({...d,pos,dice:r,win:p>=TRACK?t:null,turn:nextSeat(d,t),last:`${nm(d,t)}: ${msg}`});}
};

/* ---------- lucky boxes ---------- */
GAMES.luck={name:'صناديق الحظ',cat:'cards',lbc:'#A5373F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9464F"/>${[[14,20],[54,20],[14,58],[54,58]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="32" height="26" rx="4" fill="${k===3?'#2D4763':'#F2C14E'}"/><rect x="${x+13}" y="${y}" width="6" height="26" fill="${k===3?'#1d2f44':'#D9A441'}"/>`).join('')}<text x="70" y="78" font-size="16" text-anchor="middle">💣</text></svg>`,
  init:n=>{const k=10+2*n,b=Math.max(1,Math.floor(n/2));const a=[];for(let i=0;i<k;i++)a.push(i<b?'b':String(1+rnd(5)));return {box:shuffle(a).join(''),op:'.'.repeat(k),pts:Array(n).fill(0),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+'<br>'+ptsBadges(d,d.pts)+'<br><small>افتح صندوق وخذ نقاطه، واللي يطلع له 💣 يطلع من اللعبة</small>',
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const k=d.box.length,c=k<=16?4:k<=20?5:6;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${c},1fr);background:#7A2B31">${[...d.box].map((v,i)=>{const o=d.op[i];
      if(o==='.')return `<button class="cg" style="background:#F2C14E;font-size:24px" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}>${d.win!=null&&v==='b'?'💣':'🎁'}</button>`;
      return `<div class="cg" style="background:${lit(d,+o)};font-size:${v==='b'?24:22}px;box-shadow:inset 0 0 0 3px ${col(d,+o)}">${v==='b'?'💥':'+'+v}</div>`;}).join('')}</div>`;},
  click(a,i,d,ctx){if(!ctx.my||d.op[i]!=='.')return;const t=d.turn,v=d.box[i];const op=setAt(d.op,i,String(t));let out=d.out,pts=[...d.pts],last;
    if(v==='b'){out=setAt(out,t,'1');last=`${nm(d,t)} فتح صندوق 💣 وطلع`;}else{pts[t]+=+v;last=`${nm(d,t)} أخذ ${v} نقاط`;}
    const al=aliveSeats(d,out);const left=[...d.box].some((x,k)=>op[k]==='.'&&x!=='b');let win=null;
    if(al.length===1)win=al[0];else if(!left)win=mostPts(pts.map((x,s)=>out[s]==='1'?-1:x));
    act({...d,op,out,pts,last,win,turn:nextSeat(d,t,out)});}
};

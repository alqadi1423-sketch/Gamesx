'use strict';
/* cards and dice: memory, higher or lower, blackjack, colours and numbers, dominoes, bingo, risky dice */

const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const RANKS='A23456789TJQK',SUITS='shdc',SUITCH={s:'♠',h:'♥',d:'♦',c:'♣'};
const deck52=(k=1)=>{const a=[];for(let n=0;n<k;n++)for(const s of SUITS)for(const r of RANKS)a.push(r+s);return a;};
const rv=c=>RANKS.indexOf(c[0])+1;
const cardHTML=(c,big,extra)=>c==='??'?`<div class="card back ${big?'big':''}"></div>`:
  `<div class="card ${'hd'.includes(c[1])?'red':'blk'} ${big?'big':''} ${extra||''}">${c[0]==='T'?'10':c[0]}<small style="font-size:60%">${SUITCH[c[1]]}</small></div>`;
const cardsOf=s=>s.match(/.{2}/g)||[];

/* ---------- memory ---------- */
const MEMP={2:8,3:10,4:10,5:12,6:12,7:15,8:15},MEMC={8:4,10:5,12:6,15:6};
const EMO=['🍎','🐪','⚽','🌙','🚗','🎈','🐟','🌴','⭐','☕','🎁','🦅','🍉','🏠','🔑'];
GAMES.memory={name:'لعبة الذاكرة',cat:'cards',lbc:'#3D8A7A',onTimeout:d=>({...d,open:[],turn:nextSeat(d,d.turn)}),
  icon:iconE('#4FB09B','🃏'),
  init:n=>{const p=MEMP[n]||15;const a=[];for(let k=0;k<p;k++)a.push(String.fromCharCode(97+k),String.fromCharCode(97+k));return {p,dk:shuffle(a).join(''),own:'.'.repeat(p*2),open:[]};},
  points:d=>cntSeat(d.own,d.pl.length).map(x=>x/2),status:(d,ctx)=>turnTxt(d,ctx),
  winExtra(d){const c=cntSeat(d.own,d.pl.length);return 'الأزواج: '+c.map((x,s)=>`${nm(d,s)} ${x/2}`).join('، ');},
  render(d,ctx){const op=d.open||[];
    return `<div class="cellgrid" style="grid-template-columns:repeat(${MEMC[d.p]},minmax(0,1fr));background:#2F6E62">${[...d.dk].map((e,i)=>{
      const own=d.own[i];if(own!=='.')return `<div class="cg" style="background:${lit(d,+own)};font-size:26px;box-shadow:inset 0 0 0 3px ${col(d,+own)}">${EMO[e.charCodeAt(0)-97]}</div>`;
      if(op.includes(i))return `<div class="cg" style="background:#fff;font-size:26px">${EMO[e.charCodeAt(0)-97]}</div>`;
      return `<button class="cg" style="background:#7FCBB9" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}>❔</button>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.own[i]!=='.')return;let op=d.open||[];if(op.length===2)op=[];if(op.includes(i))return;op=[...op,i];
    if(op.length<2){act({...d,open:op});return;}
    const t=d.turn;if(d.dk[op[0]]===d.dk[op[1]]){let own=setAt(setAt(d.own,op[0],String(t)),op[1],String(t));let win=null;
      if(!own.includes('.'))win=mostPts(cntSeat(own,d.pl.length));act({...d,own,open:[],win});}
    else act({...d,open:op,turn:nextSeat(d,t)});
  }
};

/* ---------- higher or lower ---------- */
GAMES.hilo={name:'أعلى أو أقل',cat:'cards',lbc:'#3B5B8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4F78B5"/><rect x="18" y="20" width="36" height="52" rx="6" fill="#fff" transform="rotate(-8 36 46)"/><rect x="44" y="24" width="36" height="52" rx="6" fill="#fff" transform="rotate(8 62 50)"/><text x="60" y="58" font-size="22" font-weight="800" fill="#D43C33" text-anchor="middle">K</text><path d="M28 34l6-8 6 8M28 58l6 8 6-8" stroke="#2D4763" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  init:n=>({dk:shuffle(deck52(n>4?2:1)).join(''),p:0,pts:Array(n).fill(0),last:'',goal:5}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>d.last,
  render(d,ctx){const c=d.dk.slice(d.p*2,d.p*2+2);
    return `<div class="row">${cardHTML(c,true)}</div><div class="acts"><button class="btn blue" data-ga="hi" ${ctx.my?'':'disabled'}>أعلى ⬆</button><button class="btn red" data-ga="lo" ${ctx.my?'':'disabled'}>أقل ⬇</button></div><p class="note">الآس أصغر ورقة والشايب أكبرها، والمساوي يعتبر خطأ</p>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,c=d.dk.slice(d.p*2,d.p*2+2),n=d.dk.slice(d.p*2+2,d.p*2+4);if(!n)return;
    const ok=a==='hi'?rv(n)>rv(c):rv(n)<rv(c);const pts=[...d.pts];if(ok)pts[t]++;
    const p=d.p+1,end=p*2+2>=d.dk.length;let win=null;if(pts[t]>=d.goal)win=t;else if(end)win=mostPts(pts);
    act({...d,p,pts,win,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${a==='hi'?'أعلى':'أقل'} وطلعت ${n[0]==='T'?'10':n[0]}${SUITCH[n[1]]}، ${ok?'صح ✓':'خطأ ✗'}`});
  }
};

/* ---------- blackjack ---------- */
const bjVal=h=>{let s=0,a=0;for(const c of cardsOf(h)){const r=rv(c);s+=r>10?10:r===1?11:r;if(r===1)a++;}while(s>21&&a){s-=10;a--;}return s;};
function bjNext(d,from,stood){const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(d.out[s]!=='1'&&stood[s]!=='1')return s;}return -1;}
function bjFinish(d){let dk=d.dk,dl=d.dl;while(bjVal(dl)<17){dl+=dk.slice(0,2);dk=dk.slice(2);}
  const dv=bjVal(dl),res=d.hands.map((h,s)=>{if(d.out[s]==='1')return 'x';const v=bjVal(h);return v>21?'b':dv>21||v>dv?'w':v===dv?'p':'l';});
  const best=Math.max(...d.hands.map((h,s)=>res[s]==='w'?bjVal(h):-1));const top=res.map((r,s)=>r==='w'&&bjVal(d.hands[s])===best?s:-1).filter(s=>s>=0);
  return {...d,dk,dl,res:res.join(''),phase:'done',win:top.length===1?top[0]:top.length?'d':'h'};}
GAMES.bj={name:'بلاك جاك 21',cat:'cards',lbc:'#1E6B45',onTimeout:d=>{const sd=setAt(d.sd,d.turn,'1');const nd={...d,sd};const nx=bjNext(nd,d.turn,sd);return nx<0?bjFinish(nd):{...nd,turn:nx};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E8B57"/><rect x="20" y="22" width="34" height="50" rx="6" fill="#fff" transform="rotate(-10 37 47)"/><rect x="46" y="26" width="34" height="50" rx="6" fill="#fff" transform="rotate(8 63 51)"/><text x="34" y="54" font-size="20" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(-10 37 47)">A</text><text x="63" y="58" font-size="20" font-weight="800" fill="#D43C33" text-anchor="middle" transform="rotate(8 63 51)">K</text><text x="50" y="92" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">21</text></svg>`,
  init:n=>{let dk=shuffle(deck52(n>4?2:1)).join('');const hands=[];for(let s=0;s<n;s++){hands.push(dk.slice(0,4));dk=dk.slice(4);}const dl=dk.slice(0,4);dk=dk.slice(4);
    return {dk,hands,dl,sd:'0'.repeat(n),phase:'play',res:''};},
  winText:d=>d.win==='h'?'الديلر فاز على الكل':null,
  status(d,ctx){return d.phase==='play'?turnTxt(d,ctx):'';},
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${bjVal(d.hands[s])} ${({w:'فاز',l:'خسر',p:'تعادل',b:'تعدّى 21',x:'طلع'})[d.res[s]]}`).join('، ')+`، والديلر ${bjVal(d.dl)}`,
  render(d,ctx){const done=d.phase==='done';
    let s=`<p class="lbl">الديلر ${done?bjVal(d.dl):''}</p><div class="hand">${cardsOf(d.dl).map((c,i)=>cardHTML(!done&&i===1?'??':c)).join('')}</div>`;
    s+=d.pl.map((r,i)=>{if(d.out[i]==='1')return '';const v=bjVal(d.hands[i]);return `<p class="lbl" style="color:${col(d,i)}">${!ctx.local&&i===ctx.v?'أنت':nm(d,i)}: ${v}${v>21?' تعدّى':d.sd[i]==='1'&&!done?' وقف':''}</p><div class="hand">${cardsOf(d.hands[i]).map(c=>cardHTML(c)).join('')}</div>`;}).join('');
    if(ctx.my)s+=`<div class="acts"><button class="btn blue" data-ga="hit">اسحب ورقة</button><button class="btn navy" data-ga="stand">اكتفيت</button></div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my||d.phase!=='play')return;const t=d.turn;let {dk,hands,sd:st}=d;hands=[...hands];
    if(a==='hit'){hands[t]+=dk.slice(0,2);dk=dk.slice(2);if(bjVal(hands[t])>=21)st=setAt(st,t,'1');}
    else st=setAt(st,t,'1');
    let nd={...d,dk,hands,sd:st};const nx=st[t]==='1'?bjNext(nd,t,st):t;
    if(nx<0)nd=bjFinish(nd);else nd.turn=nx;act(nd);
  },
  onSkip(nd){if(nd.phase!=='play'||nd.win!=null)return nd;const nx=nd.out[nd.turn]==='1'||nd.sd[nd.turn]==='1'?bjNext(nd,nd.turn,nd.sd):nd.turn;return nx<0?bjFinish(nd):{...nd,turn:nx};}
};

/* ---------- colours and numbers (shedding card game) ---------- */
const UC={r:'#E5483F',g:'#3FAE5C',b:'#3D8FD8',y:'#F0B429',k:'#2D4763'},UCN={r:'الأحمر',g:'الأخضر',b:'الأزرق',y:'الأصفر'};
function unoDeck(){const a=[];for(const c of 'rgby'){a.push(c+'0');for(const v of '123456789SRD')a.push(c+v,c+v);}for(let k=0;k<4;k++)a.push('kW','kF');return shuffle(a);}
const uLabel=v=>({S:'⊘',R:'⇄',D:'+2',W:'🎨',F:'+4'})[v]||v;
const uCard=(c,cls,attrs)=>`<${attrs?'button':'div'} class="card ${cls||''}" style="background:${UC[c[0]]};color:#fff;font-size:${c[1].length>1||'DF'.includes(c[1])?18:24}px" ${attrs||''}>${uLabel(c[1])}</${attrs?'button':'div'}>`;
const uPlayable=(c,d)=>{const top=d.disc.slice(-2);return c[0]==='k'||c[0]===d.color||c[1]===top[1];};
function uStep(d,from,k,dir,out){out=out||d.out;const n=d.pl.length;let s=from;for(let m=0;m<k;m++){for(let q=0;q<n;q++){s=((s+dir)%n+n)%n;if(out[s]!=='1')break;}}return s;}
function uDraw(d,k){let dr=d.draw,disc=d.disc,got='';for(let m=0;m<k;m++){if(!dr.length){const top=disc.slice(-2);dr=shuffle(cardsOf(disc.slice(0,-2))).join('');disc=top;}if(!dr.length)break;got+=dr.slice(0,2);dr=dr.slice(2);}return [got,{...d,draw:dr,disc}];}
GAMES.uno={name:'ألوان وأرقام',cat:'cards',lbc:'#C2362F',onTimeout:d=>({...d,drew:false,turn:uStep(d,d.turn,1,d.dir)}),
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2D4763"/>${[['#E5483F',-16,22],['#F0B429',-5,34],['#3FAE5C',6,46],['#3D8FD8',17,58]].map(([c,r,x])=>`<rect x="${x-14}" y="26" width="30" height="46" rx="6" fill="${c}" stroke="#fff" stroke-width="3" transform="rotate(${r} ${x} 50)"/>`).join('')}<text x="62" y="58" font-size="18" font-weight="800" fill="#fff" text-anchor="middle" transform="rotate(17 58 50)">+2</text></svg>`,
  init:n=>{let a=unoDeck();const hands=[];for(let s=0;s<n;s++){hands.push(a.slice(0,7).join(''));a=a.slice(7);}
    let i=a.findIndex(c=>/[0-9]/.test(c[1]));const top=a.splice(i,1)[0];return {hands,draw:a.join(''),disc:top,color:top[0],dir:1,drew:false,last:''};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>اللون الحالي: <b style="color:${UC[d.color]}">${UCN[d.color]}</b>، والدور ${d.dir>0?'⟲':'⟳'}</small>`,
  render(d,ctx){
    const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;const top=d.disc.slice(-2);
    let s=`<div class="score" style="gap:4px">${d.pl.map((r,i)=>d.out[i]==='1'?'':`<span class="chip" style="background:${col(d,i)}">${!ctx.local&&i===ctx.v?'أنت':nm(d,i)} ${d.hands[i].length/2} 🂠</span>`).join('')}</div>`;
    s+=`<div class="row" style="align-items:center">${uCard(top,'big')}<div class="card big back"></div></div>`;
    if(v<0)return s;
    const my=ctx.my&&d.turn===v;const hand=cardsOf(d.hands[v]);
    if(my&&S.wild!=null)s+=`<p class="lbl" style="text-align:center">اختر اللون</p><div class="row">${'rgby'.split('').map((c,k)=>`<button class="btn swatch" style="background:${UC[c]}" data-ga="wc" data-i="${k}"></button>`).join('')}</div>`;
    s+=`<p class="lbl" style="text-align:center">أوراقك</p><div class="hand">${hand.map((c,i)=>my&&uPlayable(c,d)?uCard(c,'pick',`data-ga="play" data-i="${i}"`):uCard(c,my?'dim':'')).join('')}</div>`;
    if(my)s+=`<div class="row">${d.drew?'<button class="btn navy" data-ga="pass">مرّر الدور</button>':'<button class="btn blue" data-ga="draw">اسحب ورقة</button>'}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='draw'){if(d.drew)return;const [g,nd]=uDraw(d,1);const hands=[...nd.hands];hands[t]+=g;const can=g&&uPlayable(g,nd);
      act({...nd,hands,drew:can,turn:can?t:uStep(nd,t,1,nd.dir),last:`${nm(d,t)} سحب ورقة`+(can?'':' ومرّر')});return;}
    if(a==='pass'){act({...d,drew:false,turn:uStep(d,t,1,d.dir),last:`${nm(d,t)} مرّر`});return;}
    let idx=i,color=null;
    if(a==='play'){const c=cardsOf(d.hands[t])[i];if(!c||!uPlayable(c,d))return;if(c[0]==='k'){S.wild=i;render();return;}}
    if(a==='wc'){if(S.wild==null)return;idx=S.wild;color='rgby'[i];}
    S.wild=null;const hand=cardsOf(d.hands[t]);const c=hand.splice(idx,1)[0];let nd={...d,hands:[...d.hands],disc:d.disc+c,color:color||c[0],drew:false};nd.hands[t]=hand.join('');
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
GAMES.domino={name:'دومينو',cat:'cards',lbc:'#5B4636',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A5C45"/><g transform="rotate(-20 50 50)"><rect x="18" y="36" width="64" height="32" rx="6" fill="#fff" stroke="#2D4763" stroke-width="3"/><line x1="50" y1="40" x2="50" y2="64" stroke="#2D4763" stroke-width="2.5"/>${[[28,44],[40,60],[34,52]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#2D4763"/>`).join('')}${[[60,44],[72,44],[60,60],[72,60]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#2D4763"/>`).join('')}</g></svg>`,
  init:n=>{const all=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)all.push(''+a+b);const s=shuffle(all);const k=DOMH[n]||3;const hands=[];for(let p=0;p<n;p++)hands.push(s.slice(p*k,p*k+k).join(''));
    return {hands,bone:s.slice(n*k).join(''),ch:'',pass:0,last:''};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>المخزن: ${d.bone.length/2} قطع</small>`,
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.hands[s].length/2} قطع`).join('، '),
  render(d,ctx){
    const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    let s=`<div class="score" style="gap:4px">${d.pl.map((r,i)=>d.out[i]==='1'?'':`<span class="chip" style="background:${col(d,i)}">${!ctx.local&&i===ctx.v?'أنت':nm(d,i)} ${d.hands[i].length/2}</span>`).join('')}</div>`;
    const ch=d.ch.match(/.{2}/g)||[];
    s+=`<div class="table">${ch.length?`<div class="chain">${ch.map((t,i)=>`<span class="dom ${i===0||i===ch.length-1?'end':''}">${t[0]===t[1]?domV(t,54):domSVG(t,56)}</span>`).join('')}</div><div class="ends"><span>اليسار: <b>${d.ch[0]}</b></span><span>اليمين: <b>${d.ch[d.ch.length-1]}</b></span></div>`:'<p class="note" style="margin:24px 0">أول قطعة تفتح اللعب</p>'}<span class="bone">المخزن ${d.bone.length/2}</span></div>`;
    if(v<0)return s;const my=ctx.my&&d.turn===v;const hand=d.hands[v].match(/.{2}/g)||[];
    const any=hand.some(t=>domFits(t,d).some(x=>x));
    if(my&&S.dside!=null){const t=hand[S.dside];s+=`<div class="row"><button class="sm go" data-ga="L" data-i="${S.dside}">على اليسار (${d.ch[0]})</button><button class="sm go" data-ga="R" data-i="${S.dside}">على اليمين (${d.ch[d.ch.length-1]})</button></div>`;}
    s+=`<p class="lbl" style="text-align:center">قطعك</p><div class="hand">${hand.map((t,i)=>{const f=domFits(t,d).some(x=>x);return my&&f?`<button class="dom pick" data-ga="play" data-i="${i}">${domV(t)}</button>`:`<span class="dom ${my?'dim':''}">${domV(t)}</span>`;}).join('')}</div>`;
    if(my&&!any)s+=`<div class="row">${d.bone.length?'<button class="btn blue" data-ga="draw">اسحب من المخزن</button>':'<button class="btn navy" data-ga="pass">مرّر الدور</button>'}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;const hand=d.hands[t].match(/.{2}/g)||[];
    if(a==='draw'){if(!d.bone.length)return;const hands=[...d.hands];hands[t]+=d.bone.slice(0,2);act({...d,hands,bone:d.bone.slice(2),last:`${nm(d,t)} سحب من المخزن`});return;}
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
function bingoCard(d,s){const R=mulberry(seedOf(d.gid+':'+d.pl[s]));const a=[...Array(25).keys()].map(x=>x+1);for(let i=24;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const BLINES=(()=>{const L=[];for(let k=0;k<5;k++){L.push([0,1,2,3,4].map(c=>k*5+c));L.push([0,1,2,3,4].map(r=>r*5+k));}L.push([0,6,12,18,24]);L.push([4,8,12,16,20]);return L;})();
const bingoLines=(card,called)=>BLINES.filter(L=>L.every(i=>called[card[i]-1]==='1')).length;
GAMES.bingo={name:'بنقو',cat:'cards',lbc:'#B5486E',onTimeout:d=>({...d,turn:nextSeat(d,d.turn)}),
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D45D87"/>${[0,1,2,3,4].map(r=>[0,1,2,3,4].map(c=>`<rect x="${12+c*16}" y="${12+r*16}" width="14" height="14" rx="3" fill="${(r===c)?'#ffd84d':'#fff'}"/>`).join('')).join('')}<path d="M14 14L86 86" stroke="#2D4763" stroke-width="4" stroke-linecap="round"/></svg>`,
  init:()=>({called:'0'.repeat(25),last:''}),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((r,s)=>bingoLines(bingoCard(d,s),d.called)+'/5'),status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;if(v<0)return '';
    const card=bingoCard(d,v);const lines=BLINES.filter(L=>L.every(i=>d.called[card[i]-1]==='1')).flat();
    const ln=bingoLines(card,d.called);return `<div class="bprog"><b>خطوطك ${ln}/5</b><div><i style="width:${ln*20}%;background:${col(d,v)}"></i></div></div>
    <div class="cellgrid" style="grid-template-columns:repeat(5,minmax(0,1fr));background:${col(d,v)};max-width:360px">${card.map((n,i)=>{const c=d.called[n-1]==='1';
      return c?`<div class="cg" style="background:${lines.includes(i)?'#ffd84d':lit(d,v)};text-decoration:line-through;font-size:22px">${n}</div>`:`<button class="cg" style="font-size:22px" data-ga="m" data-i="${n}" ${ctx.my?'':'disabled'}>${n}</button>`;}).join('')}</div>`;},
  click(a,n,d,ctx){
    if(!ctx.my||d.called[n-1]==='1')return;const t=d.turn;const called=setAt(d.called,n-1,'1');
    const done=d.pl.map((r,s)=>d.out[s]!=='1'&&bingoLines(bingoCard(d,s),called)>=5?s:-1).filter(s=>s>=0);
    let win=null;if(done.length)win=done.includes(t)?t:done.length===1?done[0]:'d';
    act({...d,called,win,turn:nextSeat(d,t),last:`${nm(d,t)} اختار ${n}`});
  }
};

/* ---------- risky dice ---------- */
GAMES.pig={points:d=>d.sc,name:'زهر المخاطرة',cat:'cards',lbc:'#A0522D',onTimeout:d=>({...d,tot:0,dice:0,turn:nextSeat(d,d.turn)}),
  icon:iconE('#D7774A','🎲'),
  init:n=>({sc:Array(n).fill(0),tot:0,dice:0,goal:50,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const anim=S.rolled;S.rolled=false;
    return `<div class="row" style="align-items:center;gap:14px"><div class="dice ${anim?'roll':''}">${d.dice?diceSVG(d.dice):''}</div><div><div class="note">جمع الدور</div><div class="big-num" style="color:${col(d,d.turn)}">${d.tot}</div></div></div>
    <div class="acts"><button class="btn" style="background:${col(d,d.turn)}" data-ga="roll" ${ctx.my?'':'disabled'}>ارمِ</button><button class="btn navy" data-ga="hold" ${ctx.my&&d.tot>0?'':'disabled'}>احفظ النقاط</button></div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='roll'){const r=1+rnd(6);S.rolled=true;
      if(r===1){act({...d,dice:1,tot:0,turn:nextSeat(d,t),last:`${nm(d,t)} طلع له 1 وراح جمع الدور`});return;}
      act({...d,dice:r,tot:d.tot+r,last:''});return;}
    if(d.tot<=0)return;const sc=[...d.sc];sc[t]+=d.tot;
    act({...d,sc,tot:0,dice:0,win:sc[t]>=d.goal?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} حفظ ${d.tot}`});
  }
};

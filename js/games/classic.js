'use strict';
/* ================= game: tic tac toe ================= */
const TTS={2:[3,3],3:[5,4],4:[6,4],5:[7,4],6:[7,4],7:[8,4],8:[8,4]};
function lineWin(b,sz,k){for(let r=0;r<sz;r++)for(let c=0;c<sz;c++){const v=b[r*sz+c];if(v==='.')continue;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[];for(let j=0;j<k;j++){const rr=r+dr*j,cc=c+dc*j;if(rr<0||rr>=sz||cc<0||cc>=sz||b[rr*sz+cc]!==v)break;cells.push(rr*sz+cc);}
    if(cells.length===k)return {w:+v,ln:cells};}}return null;}
GAMES.ttt={name:'إكس أو',cat:'board',lbc:'#B9483F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E36A5E"/><path d="M38 12V72M62 12V72M14 30H86M14 54H86" stroke="#2D4763" stroke-width="5" stroke-linecap="round"/><path d="M19 37L32 49M32 37L19 49" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="42" r="7" stroke="#4AB1E8" stroke-width="5" fill="none"/><circle cx="74" cy="19" r="6" stroke="#4AB1E8" stroke-width="5" fill="none"/></svg>`,
  init:n=>{const [sz,k]=TTS[n]||[8,4];return {sz,k,b:'.'.repeat(sz*sz),ln:null};},
  status:(d,ctx)=>turnTxt(d,ctx)+(d.pl.length>2?`<br><small>أول واحد يصف ${d.k} ورا بعض يفوز</small>`:''),
  render(d,ctx){const g=d.sz>5?4:d.sz>3?5:8;return `<div class="ttt" style="grid-template-columns:repeat(${d.sz},1fr);gap:${g}px">${[...d.b].map((c,i)=>`<button class="tc ${d.ln&&d.ln.includes(i)?'hl':''}" data-ga="m" data-i="${i}" ${c!=='.'||!ctx.my?'disabled':''}>${c!=='.'?shape(d.pl[+c]):''}</button>`).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.b[i]!=='.')return;
    const b=setAt(d.b,i,String(d.turn));const r=lineWin(b,d.sz,d.k);let win=null,ln=null;
    if(r){win=r.w;ln=r.ln;}else if(!b.includes('.'))win='d';
    act({...d,b,turn:nextSeat(d,d.turn),win,ln});
  }
};

/* ================= game: dots and boxes ================= */
const cntSeat=(s,n)=>{const a=Array(n).fill(0);for(const c of s)if(c!=='.')a[+c]++;return a;};
GAMES.dots={name:'نقاط ومربعات',cat:'board',lbc:'#8F86C9',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D8D2F6"/><rect x="22" y="22" width="28" height="28" fill="#F6B3AC"/><path d="M22 22H50V50H22Z" stroke="#EC6158" stroke-width="4" fill="none"/><path d="M50 50H78M78 22V50" stroke="#4AB1E8" stroke-width="4"/>${[22,50,78].map(y=>[22,50,78].map(x=>`<circle cx="${x}" cy="${y}" r="5" fill="#2D4763"/>`).join('')).join('')}</svg>`,
  init:n=>{const B=n===2?4:n<=4?5:6;return {B,h:'.'.repeat((B+1)*B),v:'.'.repeat(B*(B+1)),bx:'.'.repeat(B*B)};},
  status(d,ctx){const c=cntSeat(d.bx,d.pl.length);return `${turnTxt(d,ctx)}<br>${c.map((x,s)=>`<span class="mini" style="background:${col(d,s)}">${x}</span>`).join('')}`;},
  winExtra(d){const c=cntSeat(d.bx,d.pl.length);return 'المربعات: '+c.map((x,s)=>`${nm(d,s)} ${x}`).join('، ');},
  render(d,ctx){
    const B=d.B,st=80/B,P=k=>10+k*st,sw=B>4?2.6:3.2,hw=B>4?7:9;let bx='',hits='',lines='',dots='';
    for(let r=0;r<B;r++)for(let c=0;c<B;c++){const o=d.bx[r*B+c];if(o!=='.')bx+=`<rect x="${P(c)}" y="${P(r)}" width="${st}" height="${st}" fill="${lit(d,+o)}"/>`;}
    const seg=(x1,y1,x2,y2,val,a,i)=>{
      if(val!=='.')return [false,`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col(d,+val)}" stroke-width="${sw}" stroke-linecap="round"/>`];
      return [true,`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ghost" stroke-width="1.4"/>`+(ctx.my?`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="hit" stroke-width="${hw}" data-ga="${a}" data-i="${i}"/>`:'')];};
    const add=([e,s])=>{if(e)hits+=s;else lines+=s;};
    for(let r=0;r<=B;r++)for(let c=0;c<B;c++){const k=r*B+c;add(seg(P(c),P(r),P(c+1),P(r),d.h[k],'h',k));}
    for(let r=0;r<B;r++)for(let c=0;c<=B;c++){const k=r*(B+1)+c;add(seg(P(c),P(r),P(c),P(r+1),d.v[k],'v',k));}
    for(let r=0;r<=B;r++)for(let c=0;c<=B;c++)dots+=`<circle cx="${P(c)}" cy="${P(r)}" r="${B>4?1.9:2.3}" fill="#2D4763" pointer-events="none"/>`;
    return `<svg class="dots" viewBox="0 0 100 100">${bx}${hits}${lines}${dots}</svg><p class="note">اضغط بين نقطتين ترسم خط. تقفل مربع؟ تلعب مرة ثانية</p>`;
  },
  click(a,i,d,ctx){
    if(!ctx.my)return;let {h,v,bx}=d;const B=d.B,t=String(d.turn);
    if(a==='h'){if(h[i]!=='.')return;h=setAt(h,i,t);}else{if(v[i]!=='.')return;v=setAt(v,i,t);}
    let got=false;
    for(let r=0;r<B;r++)for(let c=0;c<B;c++){const k=r*B+c;if(bx[k]!=='.')continue;
      if(h[r*B+c]!=='.'&&h[(r+1)*B+c]!=='.'&&v[r*(B+1)+c]!=='.'&&v[r*(B+1)+c+1]!=='.'){bx=setAt(bx,k,t);got=true;}}
    let win=null;if(!bx.includes('.')){const n=cntSeat(bx,d.pl.length);const mx=Math.max(...n);const top=n.map((x,s)=>x===mx?s:-1).filter(s=>s>=0);win=top.length===1?top[0]:'d';}
    act({...d,h,v,bx,turn:got?d.turn:nextSeat(d,d.turn),win});
  }
};

/* ================= game: snakes and ladders ================= */
const LAD={4:25,13:46,33:49,42:63,50:69,62:81,74:92},SNK={27:5,40:3,43:18,54:31,66:45,76:58,89:53,99:41};
const cellXY=n=>{const r=Math.floor((n-1)/10),c=r%2===0?(n-1)%10:9-(n-1)%10;return [c*10+5,(9-r)*10+5];};
const PIPS={1:[[50,50]],2:[[28,28],[72,72]],3:[[26,26],[50,50],[74,74]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[26,26],[74,26],[50,50],[26,74],[74,74]],6:[[28,24],[72,24],[28,50],[72,50],[28,76],[72,76]]};
const diceSVG=n=>`<svg viewBox="0 0 100 100">${(PIPS[n]||[]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="#2D4763"/>`).join('')}</svg>`;
function ladderSVG(a,b){const [x1,y1]=cellXY(a),[x2,y2]=cellXY(b);const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),nx=-dy/L*2,ny=dx/L*2;
  let s=`<line class="rail" x1="${x1+nx}" y1="${y1+ny}" x2="${x2+nx}" y2="${y2+ny}"/><line class="rail" x1="${x1-nx}" y1="${y1-ny}" x2="${x2-nx}" y2="${y2-ny}"/>`;
  const k=Math.max(2,Math.floor(L/3.5));for(let j=1;j<k;j++){const t=j/k,x=x1+dx*t,y=y1+dy*t;s+=`<line class="rung" x1="${x+nx}" y1="${y+ny}" x2="${x-nx}" y2="${y-ny}"/>`;}return s;}
const SC=['#5CC08C','#E8746B','#9C7BD6','#F2A93B'];
function snakeSVG(a,b,k){const [x1,y1]=cellXY(a),[x2,y2]=cellXY(b);const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),nx=-dy/L*5,ny=dx/L*5;const c=SC[k%4];
  const p=`M${x1} ${y1} C ${x1+dx*.33+nx} ${y1+dy*.33+ny}, ${x1+dx*.66-nx} ${y1+dy*.66-ny}, ${x2} ${y2}`;
  return `<path d="${p}" stroke="#2D4763" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="${p}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="2.6" fill="${c}" stroke="#2D4763" stroke-width=".6"/><circle cx="${x1-.9}" cy="${y1-.6}" r=".7" fill="#fff"/><circle cx="${x1+.9}" cy="${y1-.6}" r=".7" fill="#fff"/>`;}
GAMES.snakes={name:'السلم والثعبان',cat:'board',lbc:'#A8743F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FBEFD9"/><path d="M0 0H33V33H0ZM66 0H100V33H66ZM33 33H66V66H33ZM0 66H33V100H0ZM66 66H100V100H66Z" fill="#F3D9AE"/><path d="M60 8L80 70M70 6L90 68" stroke="#8a5a2b" stroke-width="4"/><path d="M63 20L74 17M66 32L78 29M70 44L82 41M74 56L86 53" stroke="#8a5a2b" stroke-width="3"/><path d="M22 22C40 35 6 50 26 70" stroke="#2D4763" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M22 22C40 35 6 50 26 70" stroke="#5CC08C" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="22" cy="22" r="8" fill="#5CC08C" stroke="#2D4763" stroke-width="2.5"/><circle cx="19" cy="20" r="2" fill="#fff"/><circle cx="25" cy="20" r="2" fill="#fff"/><circle cx="40" cy="84" r="7" fill="#EC6158" stroke="#2D4763" stroke-width="2.5"/><circle cx="58" cy="84" r="7" fill="#4AB1E8" stroke="#2D4763" stroke-width="2.5"/></svg>`,
  init:n=>({pos:Array(n).fill(0),dice:0,msg:''}),
  render(d,ctx){
    let cells='';for(let row=9;row>=0;row--)for(let c=0;c<10;c++){const n=row%2===0?row*10+c+1:row*10+(9-c)+1;cells+=`<div class="cl ${(row+c)%2?'b':'a'}">${n}</div>`;}
    let ov=Object.entries(LAD).map(([a,b])=>ladderSVG(+a,b)).join('')+Object.entries(SNK).map(([a,b],k)=>snakeSVG(+a,b,k)).join('');
    const r=d.pl.length>4?2.4:3.1;
    d.pos.forEach((p,s)=>{if(p>0&&d.out[s]!=='1'){const [x,y]=cellXY(p);const same=d.pos.map((q,k)=>q===p&&d.out[k]!=='1'?k:-1).filter(k=>k>=0);const m=same.length,j=same.indexOf(s);
      const ox=m>1?Math.cos(2*Math.PI*j/m)*2.4:0,oy=m>1?Math.sin(2*Math.PI*j/m)*2.4:0;
      ov+=`<circle cx="${x+ox}" cy="${y+1+oy}" r="${r}" fill="${col(d,s)}" stroke="#2D4763" stroke-width=".8"/>`;}});
    const off=d.pl.map((_,s)=>s).filter(s=>d.pos[s]===0&&d.out[s]!=='1');
    const anim=S.rolled;S.rolled=false;
    return `<div class="sl"><div class="cells">${cells}</div><svg viewBox="0 0 100 100">${ov}</svg></div>
      ${off.length?`<div class="start">قبل البداية: ${off.map(s=>`<span class="mini" style="background:${col(d,s)}">${nm(d,s)}</span>`).join('')}</div>`:''}
      <div class="row" style="align-items:center"><div class="dice ${anim?'roll':''}">${d.dice?diceSVG(d.dice):''}</div><button class="big" style="width:auto;margin:0;background:${col(d,d.turn)}" data-ga="roll" ${ctx.my?'':'disabled'}>ارمِ النرد</button></div>
      <div class="slmsg">${d.msg||''}</div>`;
  },
  click(a,i,d,ctx){
    if(!ctx.my)return;const r=1+rnd(6),t=d.turn;let p=d.pos[t]+r,msg;
    if(p>100){p=d.pos[t];msg=`طلع ${r}، يحتاج ${100-p} بالضبط`;}
    else if(LAD[p]){msg=`طلع ${r}، سلّم من ${p} إلى ${LAD[p]}! 🪜`;p=LAD[p];}
    else if(SNK[p]){msg=`طلع ${r}، الثعبان نزّله من ${p} إلى ${SNK[p]} 🐍`;p=SNK[p];}
    else msg=`طلع ${r}، وصل ${p}`;
    const pos=[...d.pos];pos[t]=p;const win=p===100?t:null;const extra=r===6&&win==null;
    if(extra)msg+='، ستة! يرمي مرة ثانية';
    S.rolled=true;
    act({...d,pos,dice:r,msg:`${nm(d,t)}: ${msg}`,turn:extra?t:nextSeat(d,t),win});
  }
};

/* ================= game: color wars ================= */
const CWS={2:5,3:6,4:6,5:7,6:7,7:8,8:8};
const NB=(i,Z)=>{const r=Math.floor(i/Z),c=i%Z,o=[];if(r>0)o.push(i-Z);if(r<Z-1)o.push(i+Z);if(c>0)o.push(i-1);if(c<Z-1)o.push(i+1);return o;};
const CP={1:[[50,50]],2:[[34,34],[66,66]],3:[[50,30],[31,64],[69,64]]};
function cwCell(c,n){const pts=CP[n]||[];
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${c}"/>${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="#fff"/>`).join('')}${n>3?`<text x="50" y="62" text-anchor="middle" font-size="36" fill="#fff" font-weight="800">${n}</text>`:''}</svg>`;}
GAMES.cw={name:'حرب الألوان',cat:'board',lbc:'#4B3A62',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4B3A62"/>${[0,1,2].map(r=>[0,1,2].map(c=>{const x=6+c*31,y=6+r*31;const k=(r*3+c)%4;const bg=k===0?'#FAD2CE':k===1?'#CDEAFA':'#EFE8DD';const dot=k===0?'#EC6158':k===1?'#4AB1E8':'';return `<rect x="${x}" y="${y}" width="27" height="27" rx="7" fill="${bg}"/>`+(dot?`<circle cx="${x+13.5}" cy="${y+13.5}" r="10" fill="${dot}"/><circle cx="${x+10}" cy="${y+10}" r="2.6" fill="#fff"/><circle cx="${x+17}" cy="${y+17}" r="2.6" fill="#fff"/>`:'');}).join('')).join('')}</svg>`,
  init:n=>{const Z=CWS[n]||8;return {Z,o:'.'.repeat(Z*Z),n:'0'.repeat(Z*Z),mv:Array(n).fill(0)};},
  status(d,ctx){return turnTxt(d,ctx)+(d.mv[d.turn]===0?'<br><small>أول حركة: اختر أي خانة فاضية</small>':'<br><small>اضغط على خانة من لونك، توصل 4 تنفجر</small>');},
  render(d,ctx){
    const t=String(d.turn),first=d.mv[d.turn]===0,Z=d.Z;
    return `<div class="cw" style="grid-template-columns:repeat(${Z},1fr);gap:${Z>6?4:6}px">${[...d.o].map((o,i)=>{const can=ctx.my&&(first?o==='.':o===t);
      return `<button class="cc ${can?'can':''}" style="${o!=='.'?`background:${lit(d,+o)}`:''}" data-ga="m" data-i="${i}" ${can?'':'disabled'}>${o!=='.'?cwCell(col(d,+o),+d.n[i]):''}</button>`;}).join('')}</div>`;
  },
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,ts=String(t),Z=d.Z,N=d.pl.length;const o=[...d.o],n=[...d.n].map(Number);
    if(d.mv[t]===0){if(o[i]!=='.')return;o[i]=ts;n[i]=3;}else{if(o[i]!==ts)return;n[i]++;}
    const othersMoved=d.mv.every((m,s)=>s===t||m>0||d.out[s]==='1');
    for(let g=0;g<5000;g++){
      const k=n.findIndex(x=>x>=4);if(k<0)break;
      n[k]-=4;if(n[k]===0)o[k]='.';
      for(const b of NB(k,Z)){o[b]=ts;n[b]++;}
      if(othersMoved&&o.every(c=>c==='.'||c===ts))break;
    }
    const mv=[...d.mv];mv[t]++;let out=d.out;
    for(let s=0;s<N;s++)if(out[s]!=='1'&&mv[s]>0&&!o.includes(String(s)))out=setAt(out,s,'1');
    const al=aliveSeats(d,out);const win=al.length===1?al[0]:null;
    act({...d,o:o.join(''),n:n.map(x=>Math.min(x,9)).join(''),mv,out,turn:nextSeat(d,t,out),win});
  }
};

/* ================= game: sea battle ================= */
const SHIPS=[4,3,3,2,2],SL='abcde';
function near(f,x){const r=Math.floor(x/8),c=x%8;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<8&&cc>=0&&cc<8&&f[rr*8+cc]!=='.')return true;}return false;}
function randFleet(){
  for(let tr=0;tr<500;tr++){const f=Array(64).fill('.');let ok=true;
    for(let s=0;s<SHIPS.length&&ok;s++){const L=SHIPS[s];let placed=false;
      for(let a=0;a<200&&!placed;a++){const hz=rnd(2),r=rnd(hz?8:9-L),c=rnd(hz?9-L:8);const cells=[];
        for(let k=0;k<L;k++)cells.push(hz?r*8+c+k:(r+k)*8+c);
        if(cells.every(x=>!near(f,x))){cells.forEach(x=>f[x]=SL[s]);placed=true;}}
      if(!placed)ok=false;}
    if(ok)return f.join('');}
  return '.'.repeat(64);
}
const seaReady=(p,d)=>!!(p&&p.gid===d.gid&&p.ready&&p.f);
const allReady=(d,pr)=>d.pl.every((r,s)=>d.out[s]==='1'||seaReady(pr[r],d));
function seaGrid(f,sh,show,click,small){
  const sunk=new Set();
  if(f)for(const L of SL){const cs=[];for(let i=0;i<64;i++)if(f[i]===L)cs.push(i);if(cs.length&&cs.every(i=>sh[i]==='o'))sunk.add(L);}
  let s=`<div class="sea ${small?'small':''}">`;
  for(let i=0;i<64;i++){const c=f?f[i]:'.';const ship=c!=='.'&&(show||sunk.has(c));const st=sh[i];
    const cls=`sc ${ship?'ship':''} ${sunk.has(c)?'sunk':''} ${st==='o'?'hit':st==='x'?'miss':''}`;
    s+=click&&st==='.'?`<button class="${cls} can" data-ga="fire" data-i="${i}"></button>`:`<div class="${cls}"></div>`;}
  return s+'</div>';
}
GAMES.sea={name:'معركة السفن',cat:'board',lbc:'#245F8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E8FC4"/><path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" stroke="#5FAEDF" stroke-width="2"/><path d="M8 46H74L84 52L74 60H14Z" fill="#E8746B" stroke="#2D4763" stroke-width="3"/><path d="M22 48l6 5M32 48l6 5M42 48l6 5" stroke="#2D4763" stroke-width="3"/><path d="M72 52l-9-9 4-2-5-7 9 4 1-6 4 8 6-2-3 7 7 3-7 3" fill="#fff"/><circle cx="72" cy="52" r="7" fill="#2D4763"/><circle cx="70" cy="50" r="2" fill="#fff"/><path d="M14 82l8-8M22 82l-8-8" stroke="#2D4763" stroke-width="4" stroke-linecap="round"/></svg>`,
  init:n=>({sh:Array(n).fill('.'.repeat(64)),last:''}),
  privInit:()=>({f:randFleet(),ready:false}),
  canAct:(d,pr)=>allReady(d,pr),
  viewer(d,pr){if(d.win!=null)return null;for(let s=0;s<d.pl.length;s++)if(d.out[s]!=='1'&&!seaReady(pr[d.pl[s]],d))return s;return d.turn;},
  coverMsg:d=>d.last||'',
  status(d,ctx){const pr=ctx.priv;
    if(!allReady(d,pr)){
      if(ctx.local)return `${nameTag(d,ctx.v)}: رتّب سفنك واضغط جاهز`;
      const rd=d.pl.filter((r,s)=>seaReady(pr[r],d)).length;
      return (ctx.v>=0&&seaReady(pr[S.me],d)?'بانتظار الباقين يجهّزون سفنهم':'رتّب سفنك واضغط جاهز')+`<br><small>جاهز ${rd} من ${d.pl.length}</small>`;}
    return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  winExtra:d=>d.last||'',
  render(d,ctx){
    const pr=ctx.priv;const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    if(v<0){return `<p class="lbl">بحر ${nm(d,d.turn)}</p>${seaGrid(pr[d.pl[d.turn]]?.f,d.sh[d.turn],false,false)}`;}
    const mine=pr[d.pl[v]];if(!mine)return '<p class="note">جاري التجهيز…</p>';
    if(!allReady(d,pr)){
      return `<p class="lbl">بحرك (${SHIPS.length} سفن)</p>${seaGrid(mine.f,d.sh[v],true,false)}`+
        (seaReady(mine,d)?'<p class="hint">جاهز ✓</p>':`<div class="row"><button class="sm" data-ga="shuffle">وزّعها من جديد</button><button class="sm go" data-ga="ready">جاهز</button></div>`);}
    const myTurn=ctx.my&&d.turn===v;const o=curTarget(d,v);if(o==null)return '';
    const of=pr[d.pl[o]]?pr[d.pl[o]].f:null;
    return `${tabsHTML(d,v,myTurn?'اختر مين تضرب':'شوف بحور الباقين')}<p class="lbl">بحر ${nameTag(d,o)}${myTurn?'، اضغط مربع تضربه':''}</p>${seaGrid(of,d.sh[o],d.win!=null||d.out[o]==='1',myTurn&&d.out[v]!=='1')}<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false,true)}`;
  },
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;render();return;}
    if(a==='shuffle'||a==='ready'){const v=ctx.v;if(v==null||v<0)return;const r=d.pl[v];const p=S.priv[r];if(!p||seaReady(p,d))return;
      setPriv(r,a==='shuffle'?{...p,f:randFleet()}:{...p,ready:true});return;}
    if(!ctx.my)return;const t=d.turn,o=curTarget(d,t);if(o==null)return;const f=S.priv[d.pl[o]]&&S.priv[d.pl[o]].f;
    if(!f){toast('انتظر اللاعب');return;}if(d.sh[o][i]!=='.')return;
    const hit=f[i]!=='.';const sh=[...d.sh];sh[o]=setAt(sh[o],i,hit?'o':'x');let last,win=null,out=d.out;
    if(hit){const L=f[i];const sunk=[...f].every((c,k)=>c!==L||sh[o][k]==='o');last=`أصاب ${nm(d,o)}`+(sunk?' وأغرق سفينة! 💥':'! 🎯')+' ويضرب مرة ثانية';
      if([...f].every((c,k)=>c==='.'||sh[o][k]==='o')){out=setAt(out,o,'1');last=`أغرق كل سفن ${nm(d,o)}!`;const al=aliveSeats(d,out);if(al.length===1)win=al[0];}}
    else last=`ضرب بحر ${nm(d,o)} وطاحت في الماء 💦`;
    act({...d,sh,out,last:`${nm(d,t)}: ${last}`,turn:hit?t:nextSeat(d,t,out),win});
  }
};

/* ================= game: guess the person ================= */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const MN=['أحمد','خالد','فهد','سعد','ناصر','عمر','يوسف','سلطان','ماجد','تركي','بدر','حمد'],FN=['سارة','نورة','ريم','هند','لمى','دانة','جود','مها','عبير','لينا','رهف','شهد'];
const HC={black:'#2B2B2B',brown:'#7A4A2A',blond:'#E8C15A',red:'#C8512E',gray:'#B9B9B9'};
const SKIN=['#F6D6B8','#E7B98F','#C9905F','#8E5B3A'],SHIRT=['#5CC08C','#F2A93B','#9C7BD6','#4AB1E8','#E8746B','#3D5A80'],HIJ=['#3D5A80','#9C7BD6','#2D4763','#C76A8A','#5C8D89'];
const PEOPLE=(()=>{const R=mulberry(20261112);const pick=a=>a[Math.floor(R()*a.length)];const out=[];const seen=new Set();
  const make=(m,name)=>{for(let k=0;k<200;k++){const p={m,name,gl:R()<.3,sm:R()<.5,sk:pick(SKIN),shirt:pick(SHIRT)};
      if(m){p.sh=R()<.3;p.hj=false;p.hair=p.sh?'none':pick(['black','brown','blond','red','gray','bald','black']);p.bd=R()<.4;p.mu=p.bd||R()<.35;p.er=false;}
      else{p.hj=R()<.35;p.sh=false;p.hair=p.hj?'none':pick(['black','brown','blond','red','gray']);p.bd=false;p.mu=false;p.er=!p.hj&&R()<.5;p.hjc=pick(HIJ);}
      const sig=[p.m,p.gl,p.sm,p.sh,p.hj,p.hair,p.bd,p.mu,p.er].join();if(!seen.has(sig)){seen.add(sig);return p;}}};
  for(let i=0;i<12;i++){out.push(make(true,MN[i]));out.push(make(false,FN[i]));}return out;})();
function faceSVG(p){
  const hc=HC[p.hair]||'#2B2B2B';let s=`<svg viewBox="0 0 60 66">`;
  s+=`<path d="M8 66C8 52 18 47 30 47S52 52 52 66Z" fill="${p.shirt}" stroke="#2D4763" stroke-width="1.2"/><rect x="25" y="40" width="10" height="9" fill="${p.sk}"/>`;
  if(p.hj)s+=`<path d="M12 30C12 14 20 9 30 9S48 14 48 30C48 40 46 48 52 58H8C14 48 12 40 12 30Z" fill="${p.hjc}" stroke="#2D4763" stroke-width="1.2"/>`;
  if(!p.m&&!p.hj&&p.hair!=='none')s+=`<path d="M15 28C15 12 22 9 30 9S45 12 45 28V50H15Z" fill="${hc}" stroke="#2D4763" stroke-width="1.2"/>`;
  if(p.sh)s+=`<path d="M13 30C13 14 20 9 30 9S47 14 47 30L50 52H10Z" fill="url(#shm)" stroke="#2D4763" stroke-width="1.2"/>`;
  s+=`<ellipse cx="30" cy="30" rx="12" ry="14" fill="${p.sk}" stroke="#2D4763" stroke-width="1.2"/>`;
  if(p.er)s+=`<circle cx="18" cy="35" r="1.8" fill="#F2C14E" stroke="#2D4763" stroke-width=".5"/><circle cx="42" cy="35" r="1.8" fill="#F2C14E" stroke="#2D4763" stroke-width=".5"/>`;
  if(p.m&&p.hair!=='none'&&p.hair!=='bald')s+=`<path d="M18 26C17 14 24 12 30 12S43 14 42 26C40 20 36 18 30 18S20 20 18 26Z" fill="${hc}" stroke="#2D4763" stroke-width="1"/>`;
  if(p.m&&p.hair==='bald')s+=`<path d="M18 30C17 27 18 25 19 24M42 30C43 27 42 25 41 24" stroke="#8b8b8b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  if(!p.m&&!p.hj&&p.hair!=='none')s+=`<path d="M18 25C19 15 26 13 31 14S41 17 42 24C36 21 28 22 18 25Z" fill="${hc}"/>`;
  if(p.sh)s+=`<path d="M16 19C20 13 40 13 44 19" stroke="#1d1d1d" stroke-width="2.6" fill="none"/><path d="M17 22C21 17 39 17 43 22" stroke="#1d1d1d" stroke-width="2" fill="none"/>`;
  s+=`<circle cx="25" cy="29" r="1.6" fill="#2D4763"/><circle cx="35" cy="29" r="1.6" fill="#2D4763"/>`;
  if(p.gl)s+=`<circle cx="25" cy="29" r="4.2" fill="none" stroke="#2D4763" stroke-width="1.3"/><circle cx="35" cy="29" r="4.2" fill="none" stroke="#2D4763" stroke-width="1.3"/><path d="M29.2 29H30.8" stroke="#2D4763" stroke-width="1.3"/>`;
  const bc=p.hair==='gray'||p.hair==='bald'?'#7d7d7d':(p.hair==='none'?'#2B2B2B':hc);
  if(p.bd)s+=`<path d="M18 31C18 44 24 45 30 45S42 44 42 31C40 38 36 39 30 39S20 38 18 31Z" fill="${bc}" stroke="#2D4763" stroke-width=".8"/>`;
  if(p.mu)s+=`<path d="M24 36.5C27 34.5 33 34.5 36 36.5C33 36 27 36 24 36.5Z" fill="${bc}" stroke="${bc}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s+=p.sm?`<path d="M26 38.5Q30 42 34 38.5" stroke="#2D4763" stroke-width="1.3" fill="none" stroke-linecap="round"/>`:`<path d="M27 39.5H33" stroke="#2D4763" stroke-width="1.3" stroke-linecap="round"/>`;
  return s+'</svg>';
}
const FACES=PEOPLE.map(faceSVG);
const QS=[['رجل',p=>p.m],['امرأة',p=>!p.m],['شماغ',p=>p.sh],['حجاب',p=>p.hj],['نظارة',p=>p.gl],['لحية',p=>p.bd],['شنب',p=>p.mu],['مبتسم',p=>p.sm],['شعر أسود',p=>p.hair==='black'],['شعر بني',p=>p.hair==='brown'],['شعر أشقر',p=>p.hair==='blond'],['شعر أحمر',p=>p.hair==='red'],['شعر رمادي',p=>p.hair==='gray'],['أصلع',p=>p.hair==='bald'],['حلق',p=>p.er]];
const pc=(i,cls,attrs)=>`<${attrs?'button':'div'} class="pc ${cls}" ${attrs||''}>${FACES[i]}${PEOPLE[i].name}</${attrs?'button':'div'}>`;
const elSeg=(d,a,t)=>d.el[a].slice(t*24,t*24+24);
GAMES.guess={name:'خمّن الشخص',cat:'mind',lbc:'#6E4C8B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8C5BA8"/>${[[4,4,0],[36,4,1],[68,4,2],[4,36,3],[36,36,4],[68,36,6],[4,68,9],[36,68,10],[68,68,13]].map(([x,y,k])=>`<g transform="translate(${x} ${y}) scale(.47)"><rect width="60" height="66" rx="8" fill="#fff"/>${FACES[k].replace(/^<svg[^>]*>|<\/svg>$/g,'')}</g>`).join('')}</svg>`,
  init:n=>({el:Array(n).fill('0'.repeat(24*n)),last:''}),
  privInit:()=>({sec:rnd(24)}),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status(d,ctx){return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+(d.pl.length>2?'<br><small>تخمين صح يطلّع صاحب الشخصية، وتخمين غلط يطلّعك</small>':'');},
  winExtra(d,ctx){const p=ctx.priv;return `${d.last}<br>`+d.pl.map((r,s)=>`${nm(d,s)}: ${p[r]&&p[r].gid===d.gid?PEOPLE[p[r].sec].name:'؟'}`).join('، ');},
  render(d,ctx){
    let v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    const spect=v<0;if(spect)v=d.turn;
    const mine=ctx.priv[d.pl[v]];const myTurn=ctx.my&&d.turn===v;const gm=myTurn&&S.gw;
    const o=curTarget(d,v);if(o==null)return '';
    let s=!spect&&mine&&mine.gid===d.gid?`<div class="secret">${pc(mine.sec,'')}<div><b>شخصيتك السرية</b><br><small class="note">الباقين يحاولون يعرفونها</small></div></div>`:'';
    s+=tabsHTML(d,v,myTurn?'اختر مين تسأل عنه':'لوحتك عن كل لاعب');
    s+=`<p class="lbl" style="text-align:center">شخصية ${nameTag(d,o)}</p>`;
    if(gm)s+=`<p class="hint" style="text-align:center">اضغط على الشخص اللي تتوقعه (لو غلطت تطلع)</p>`;
    const el=elSeg(d,v,o);
    s+=`<div class="gw">${PEOPLE.map((p,i)=>{const out=el[i]==='1';return gm&&!out?pc(i,'pick',`data-ga="guess" data-i="${i}"`):pc(i,out?'out':'');}).join('')}</div>`;
    if(myTurn){
      if(gm)s+=`<div class="row"><button class="sm" data-ga="gmode">رجوع للأسئلة</button></div>`;
      else s+=`<p class="lbl" style="text-align:center">اسأل: هل شخصية ${nm(d,o)} فيها…</p><div class="qs">${QS.map((q,k)=>`<button class="q" data-ga="ask" data-i="${k}">${q[0]}؟</button>`).join('')}</div><div class="row"><button class="big navy" style="width:auto;margin:0" data-ga="gmode">أعرفه! أبي أخمّن</button></div>`;
    }
    return s;
  },
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;S.gw=false;render();return;}
    if(a==='gmode'){S.gw=!S.gw;render();return;}
    if(!ctx.my)return;const t=d.turn,o=curTarget(d,t);if(o==null)return;const op=S.priv[d.pl[o]];
    if(!op||op.gid!==d.gid){toast('انتظر اللاعب');return;}
    const P=PEOPLE[op.sec];
    if(a==='ask'){const f=QS[i][1];const ans=!!f(P);const el=[...d.el];const seg=[...elSeg(d,t,o)].map((c,k)=>c==='1'||!!f(PEOPLE[k])!==ans?'1':'0').join('');
      el[t]=el[t].slice(0,o*24)+seg+el[t].slice(o*24+24);
      act({...d,el,turn:nextSeat(d,t),last:`${nm(d,t)} سأل عن ${nm(d,o)} «${QS[i][0]}؟» والجواب: ${ans?'نعم ✓':'لا ✗'}`});}
    else if(a==='guess'&&S.gw){S.gw=false;const right=i===op.sec;const out=setAt(d.out,right?o:t,'1');const al=aliveSeats(d,out);
      act({...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),
        last:right?`${nm(d,t)} عرف شخصية ${nm(d,o)}: ${P.name} 🎉`:`${nm(d,t)} خمّن ${PEOPLE[i].name} لـ${nm(d,o)} وطلع غلط`});}
  }
};


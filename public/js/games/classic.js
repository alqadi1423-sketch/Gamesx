'use strict';
/* ================= game: tic tac toe ================= */
const TTS={2:[3,3],3:[5,4],4:[6,4],5:[7,4],6:[7,4],7:[8,4],8:[8,4]};
function lineWin(b,sz,k){for(let r=0;r<sz;r++)for(let c=0;c<sz;c++){const v=b[r*sz+c];if(v==='.')continue;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[];for(let j=0;j<k;j++){const rr=r+dr*j,cc=c+dc*j;if(rr<0||rr>=sz||cc<0||cc>=sz||b[rr*sz+cc]!==v)break;cells.push(rr*sz+cc);}
    if(cells.length===k)return {w:+v,ln:cells};}}return null;}
GAMES.ttt={name:'إكس أو',cat:'board',lbc:'#B9483F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E36A5E"/><path d="M38 12V72M62 12V72M14 30H86M14 54H86" stroke="#2D4763" stroke-width="5" stroke-linecap="round"/><path d="M19 37L32 49M32 37L19 49" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="42" r="7" stroke="#4AB1E8" stroke-width="5" fill="none"/><circle cx="74" cy="19" r="6" stroke="#4AB1E8" stroke-width="5" fill="none"/></svg>`,
  init:n=>{const [sz,k]=TTS[n]||[8,4];return {sz,k,b:'.'.repeat(sz*sz),ln:null};},
  status:(d,ctx)=>turnTxt(d,ctx),
  render(d,ctx){const g=d.sz>5?4:d.sz>3?5:8;return `<div class="ttt" style="grid-template-columns:repeat(${d.sz},minmax(0,1fr));gap:${g}px">${[...d.b].map((c,i)=>`<button class="tc ${d.ln&&d.ln.includes(i)?'hl':''}" data-ga="m" data-i="${i}" ${c!=='.'||!ctx.my?'disabled':''}>${c!=='.'?shape(d.pl[+c]):''}</button>`).join('')}</div>`;},
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
  points:d=>cntSeat(d.bx,d.pl.length),status:(d,ctx)=>turnTxt(d,ctx),
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
    return `<svg class="dots" viewBox="0 0 100 100">${bx}${hits}${lines}${dots}</svg>`;
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
  status:(d,ctx)=>(d.msg?`<small>${d.msg}</small><br>`:'')+turnTxt(d,ctx),
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
      <div class="row">${tapDie(d.dice,ctx.my&&d.win==null,col(d,d.turn),anim?'roll':'')}</div>`;
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
  status(d,ctx){return turnTxt(d,ctx);},
  render(d,ctx){
    const t=String(d.turn),first=d.mv[d.turn]===0,Z=d.Z;
    return `<div class="cw" style="grid-template-columns:repeat(${Z},minmax(0,1fr));gap:${Z>6?4:6}px">${[...d.o].map((o,i)=>{const can=ctx.my&&(first?o==='.':o===t);
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
const seaFleet=(d,s)=>{const p=S.priv[d.pl[s]];return p&&p.gid===d.gid?p.f:null;};
const seaSunk=(f,sh)=>{const out=new Set();if(f)for(const L of SL){let any=false,all=true;for(let i=0;i<64;i++)if(f[i]===L){any=true;if(sh[i]!=='o')all=false;}if(any&&all)out.add(L);}return out;};
const seaDead=(f,sh)=>!!f&&[...f].every((c,i)=>c==='.'||sh[i]==='o');
const seaAfloat=(f,sh)=>f?SL.split('').filter(L=>f.includes(L)&&!seaSunk(f,sh).has(L)).length:0;
// a ship may move or turn only onto free water that does not touch another ship
function seaPlace(f,L,head,hz){const len=[...f].filter(c=>c===L).length;const r=Math.floor(head/8),c=head%8;if(hz?c+len>8:r+len>8)return null;
  const g=[...f].map(x=>x===L?'.':x);const cells=[...Array(len).keys()].map(k=>hz?head+k:head+k*8);
  if(cells.some(x=>near(g,x)))return null;cells.forEach(x=>g[x]=L);return g.join('');}
const seaShip=(f,L)=>{const cs=[...f].map((c,i)=>c===L?i:-1).filter(i=>i>=0);return {head:cs[0],hz:cs.length>1&&cs[1]===cs[0]+1};};
function seaGrid(f,sh,show,click,small,marks,flash){
  const sunk=seaSunk(f,sh);
  let s=`<div class="sea ${small?'small':''}">`;
  for(let i=0;i<64;i++){const c=f?f[i]:'.';const ship=c!=='.'&&(show||sunk.has(c));const st=sh[i];const mk=marks&&marks.includes(i);
    const cls=`sc ${ship?'ship':''} ${sunk.has(c)?'sunk':''} ${st==='o'?'hit':st==='x'?'miss':''} ${mk?'mark':''} ${flash&&flash.includes(i)?'fl':''} ${click==='ed'&&S.seaSel===c&&c!=='.'?'sel':''}`;
    s+=click&&(click==='ed'||st==='.')?`<button class="${cls} can" data-ga="${click==='ed'?'ed':'fire'}" data-i="${i}"></button>`:`<div class="${cls}"></div>`;}
  return s+'</div>';
}
const seaSalvo=d=>d.pl.length>2;
GAMES.sea={name:'معركة السفن',cat:'board',lbc:'#245F8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E8FC4"/><path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" stroke="#5FAEDF" stroke-width="2"/><path d="M8 46H74L84 52L74 60H14Z" fill="#E8746B" stroke="#2D4763" stroke-width="3"/><path d="M22 48l6 5M32 48l6 5M42 48l6 5" stroke="#2D4763" stroke-width="3"/><path d="M72 52l-9-9 4-2-5-7 9 4 1-6 4 8 6-2-3 7 7 3-7 3" fill="#fff"/><circle cx="72" cy="52" r="7" fill="#2D4763"/><circle cx="70" cy="50" r="2" fill="#fff"/><path d="M14 82l8-8M22 82l-8-8" stroke="#2D4763" stroke-width="4" stroke-linecap="round"/></svg>`,
  init:n=>({sh:Array(n).fill('.'.repeat(64)),rd:0,last:'',rep:[],ls:[]}),
  privInit:(d,r)=>({f:randFleet(),ready:S.mode==='local'&&!!(S.bots||{})[r]}),
  canAct:(d,pr)=>allReady(d,pr),
  // two players take turns and a hit shoots again; three or more fire together, one shot for every ship still afloat
  simulNow:d=>seaSalvo(d)&&allReady(d,S.priv),
  viewer(d,pr){if(d.win!=null)return null;for(let s=0;s<d.pl.length;s++)if(d.out[s]!=='1'&&!seaReady(pr[d.pl[s]],d))return s;return seaSalvo(d)?simulViewer(d):d.turn;},
  coverMsg:d=>d.last||'',
  status(d,ctx){const pr=ctx.priv;
    if(!allReady(d,pr)){const rd=d.pl.filter((r,s)=>seaReady(pr[r],d)).length;
      if(ctx.local)return `${nameTag(d,ctx.v)}: رتّب سفنك واضغط جاهز`;
      return (ctx.v>=0&&seaReady(pr[d.pl[ctx.v]],d)?'بانتظار الباقين يجهّزون سفنهم':'رتّب سفنك: اضغط على سفينة ثم على مكان جديد، أو دوّرها')+`<br><small>جاهز ${rd} من ${d.pl.length}</small>`;}
    if(seaSalvo(d))return (d.last?`<small>${d.last}</small><br>`:'')+`الجولة ${d.rd+1}: الكل يطلق مع بعض`;
    return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  winExtra:d=>d.last||'',
  render(d,ctx){
    const pr=ctx.priv;const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    if(v==null||v<0){const o=d.win!=null&&typeof d.win==='number'?d.win:d.turn;return `<p class="lbl">بحر ${nm(d,o)}</p>${seaGrid(seaFleet(d,o),d.sh[o],d.win!=null,false)}`;}
    const mine=pr[d.pl[v]];if(!mine||mine.gid!==d.gid)return '<p class="note">جاري التجهيز…</p>';
    if(!allReady(d,pr)){
      if(seaReady(mine,d))return `<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false)}<p class="hint">جاهز ✓ ننتظر الباقين</p>`;
      return `<p class="lbl">رتّب سفنك (${SHIPS.length} سفن)</p>${seaGrid(mine.f,d.sh[v],true,'ed')}
        <div class="acts"><button class="btn navy" data-ga="rot" ${S.seaSel?'':'disabled'}>🔄 تدوير</button><button class="btn navy" data-ga="shuffle">🔀 عشوائي</button><button class="btn red" data-ga="ready">جاهز ✓</button></div>`;}
    const rep=d.rep&&d.rep.length?`<div class="srep">${d.rep.map(x=>`<p>${x}</p>`).join('')}</div>`:'';
    if(seaSalvo(d)){const dead=d.out[v]==='1';const k=dead?0:seaAfloat(mine.f,d.sh[v]);const marks=(S.salvo&&S.salvo.k===d.gid+':'+d.rd?S.salvo.l:[]);
      const o=curTarget(d,v);if(o==null)return rep;const picked=hasPicked(d,v);const can=ctx.my&&!picked&&!dead&&d.win==null;
      const om=marks.filter(m=>m[0]===o).map(m=>m[1]);const flash=(d.ls||[]).filter(x=>x[0]===o).map(x=>x[1]);
      let s=rep+tabsHTML(d,v,can?'اختار بحر وحط طلقاتك':'بحور الباقين');
      s+=`<p class="lbl">بحر ${nameTag(d,o)} <small>(${seaAfloat(seaFleet(d,o),d.sh[o])} سفن باقية)</small></p>${seaGrid(seaFleet(d,o),d.sh[o],d.win!=null||d.out[o]==='1',can?'fire':false,false,om,flash)}`;
      if(can)s+=`<div class="sbar"><span>🎯 ${marks.length} من ${k} طلقات</span><button class="btn red" data-ga="salvo" ${marks.length?'':'disabled'}>أطلق 🚀</button></div>`;
      else if(picked&&d.win==null)s+='<p class="hint">✓ أطلقت، ننتظر الباقين</p>';
      else if(dead)s+='<p class="note">غرقت سفنك، تقدر تتفرج</p>';
      return s+`<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false,true,null,(d.ls||[]).filter(x=>x[0]===v).map(x=>x[1]))}`;}
    const myTurn=ctx.my&&d.turn===v;const o=curTarget(d,v);if(o==null)return '';
    return `${tabsHTML(d,v,myTurn?'اختر مين تضرب':'شوف بحور الباقين')}<p class="lbl">بحر ${nameTag(d,o)}</p>${seaGrid(seaFleet(d,o),d.sh[o],d.win!=null||d.out[o]==='1',myTurn&&d.out[v]!=='1'?'fire':false)}<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false,true)}`;
  },
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;S.gw=false;render();return;}
    const v=ctx.v;if(v==null||v<0)return;const r=d.pl[v];const p=S.priv[r];
    if(['shuffle','ready','ed','rot'].includes(a)){if(!p||seaReady(p,d))return;
      if(a==='shuffle'){S.seaSel=null;setPriv(r,{...p,f:randFleet()});return;}
      if(a==='ready'){S.seaSel=null;setPriv(r,{...p,ready:true});return;}
      if(a==='ed'){const c=p.f[i];if(c!=='.'){S.seaSel=S.seaSel===c?null:c;render();return;}if(!S.seaSel)return;const {hz}=seaShip(p.f,S.seaSel);
        const nf=seaPlace(p.f,S.seaSel,i,hz);if(!nf){toast('ما تنحط هنا، لازم تبعد عن السفن الثانية');return;}setPriv(r,{...p,f:nf});return;}
      if(a==='rot'&&S.seaSel){const {head,hz}=seaShip(p.f,S.seaSel);const nf=seaPlace(p.f,S.seaSel,head,!hz);if(!nf){toast('ما تقدر تدورها هنا');return;}setPriv(r,{...p,f:nf});return;}
      return;}
    if(seaSalvo(d)){if(!ctx.my||hasPicked(d,v))return;const key=d.gid+':'+d.rd;if(!S.salvo||S.salvo.k!==key)S.salvo={k:key,l:[]};
      if(a==='fire'){const o=curTarget(d,v);if(o==null)return;const k=seaAfloat(p.f,d.sh[v]);const at=S.salvo.l.findIndex(m=>m[0]===o&&m[1]===i);
        if(at>=0)S.salvo.l.splice(at,1);else if(S.salvo.l.length<k)S.salvo.l.push([o,i]);else toast(`عندك ${k} طلقات بس`);render();return;}
      if(a==='salvo'&&S.salvo.l.length){const l=S.salvo.l;S.salvo=null;simulPick(d,v,l);}return;}
    if(!ctx.my)return;const t=d.turn,o=curTarget(d,t);if(o==null)return;const f=seaFleet(d,o);
    if(!f){toast('انتظر اللاعب');return;}if(d.sh[o][i]!=='.')return;
    const hit=f[i]!=='.';const sh=[...d.sh];sh[o]=setAt(sh[o],i,hit?'o':'x');let last,win=null,out=d.out;
    if(hit){const L=f[i];const sunk=[...f].every((c,k)=>c!==L||sh[o][k]==='o');last=`أصاب ${nm(d,o)}`+(sunk?' وأغرق سفينة! 💥':'! 🎯')+' ويضرب مرة ثانية';
      if(seaDead(f,sh[o])){out=setAt(out,o,'1');last=`أغرق كل سفن ${nm(d,o)}!`;const al=aliveSeats(d,out);if(al.length===1)win=al[0];}}
    else last=`ضرب بحر ${nm(d,o)} وطاحت في الماء 💦`;
    act({...d,sh,out,last:`${nm(d,t)}: ${last}`,ls:[[o,i]],turn:hit?t:nextSeat(d,t,out),win});
  },
  // all the shots of a round land together
  resolve(d,picks){const sh=[...d.sh],before=[...d.sh];const ls=[],rep=[];
    picks.forEach((l,s)=>{if(!Array.isArray(l)||d.out[s]==='1')return;const k=seaAfloat(seaFleet(d,s),before[s]);let hits=0;const sunkBy=new Set();
      for(const [o,i] of l.slice(0,k)){if(o===s||d.out[o]==='1'||sameTeam(d,o,s)||!(i>=0&&i<64)||before[o][i]!=='.')continue;const f=seaFleet(d,o);if(!f)continue;
        const hit=f[i]!=='.';if(sh[o][i]==='.')sh[o]=setAt(sh[o],i,hit?'o':'x');ls.push([o,i]);if(hit){hits++;if(seaSunk(f,sh[o]).has(f[i])&&!seaSunk(f,before[o]).has(f[i]))sunkBy.add(o);}}
      rep.push(`${nameTag(d,s)}: ${hits?`${hits} إصابة 🎯`:'كلها بالماء 💦'}${sunkBy.size?` وأغرق سفينة لـ${[...sunkBy].map(o=>nm(d,o)).join(' و')} 💥`:''}`);});
    let out=d.out;const gone=[];d.pl.forEach((_,o)=>{if(out[o]!=='1'&&seaDead(seaFleet(d,o),sh[o])){out=setAt(out,o,'1');gone.push(o);}});
    const al=aliveSeats(d,out);const win=al.length===1?al[0]:al.length===0?'d':null;
    return {...d,sh,out,rd:d.rd+1,ls,rep,win,last:gone.length?`غرقت كل سفن ${gone.map(o=>nm(d,o)).join(' و')} 🌊`:''};}
};

/* ================= game: guess the person ================= */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const MN=['أحمد','خالد','فهد','سعد','ناصر','عمر','يوسف','سلطان','ماجد','تركي','بدر','حمد'],FN=['سارة','نورة','ريم','هند','لمى','دانة','جود','مها','عبير','لينا','رهف','شهد'];
const HC={black:'#2B2B2B',brown:'#7A4A2A',blond:'#E8C15A',red:'#C8512E',gray:'#B9B9B9'};
const SKIN=['#F6D6B8','#EBC09A','#C9905F','#8E5B3A'],SHIRTS=[['#4CB97F','أخضر'],['#F2A93B','برتقالي'],['#9C7BD6','بنفسجي'],['#4AB1E8','أزرق'],['#E8574E','أحمر'],['#3D5A80','كحلي']],HIJ=['#3D5A80','#9C7BD6','#2D4763','#C76A8A','#5C8D89','#A0522D'];
const CARDBG=['#FDECEA','#E8F4FD','#EAF7EF','#FFF6DD','#F1ECFA','#FDEFE4'],CAPC=['#2D4763','#E5483F','#2F7F86','#F0B429'];
const PEOPLE=(()=>{const R=mulberry(20261113);const pick=a=>a[Math.floor(R()*a.length)];const out=[];const seen=new Set();
  const make=(m,name)=>{for(let k=0;k<400;k++){const sh=pick(SHIRTS);const p={m,name,gl:R()<.3,sm:R()<.5,sk:pick(SKIN),shirt:sh[0],shn:sh[1],bg:pick(CARDBG)};
      if(m){p.sh=R()<.28;p.cap=!p.sh&&R()<.25;p.hj=false;p.hair=p.sh?'none':pick(['black','brown','blond','red','gray','bald','black']);if(p.cap&&p.hair==='bald')p.hair='black';p.hs=pick(['short','curly','spiky']);p.bd=R()<.4;p.mu=p.bd||R()<.35;p.er=false;p.capc=pick(CAPC);}
      else{p.hj=R()<.35;p.sh=false;p.cap=false;p.hair=p.hj?'none':pick(['black','brown','blond','red','gray']);p.hs=p.hj?'none':pick(['long','bob','bun','long']);p.bd=false;p.mu=false;p.er=!p.hj&&R()<.5;p.hjc=pick(HIJ);}
      const sig=[p.m,p.gl,p.sm,p.sh,p.cap,p.hj,p.hair,p.hs==='long',p.bd,p.mu,p.er,p.shn].join();if(!seen.has(sig)){seen.add(sig);return p;}}};
  for(let i=0;i<12;i++){out.push(make(true,MN[i]));out.push(make(false,FN[i]));}return out;})();
function faceSVG(p){
  const hc=HC[p.hair]||'#2B2B2B',sk=p.sk,dk=shade(sk,-.2),O='stroke="#2D4763" stroke-width=".9"';let s=`<svg viewBox="0 0 60 66"><rect width="60" height="66" fill="${p.bg}"/><circle cx="30" cy="70" r="34" fill="#fff" opacity=".45"/>`;
  if(!p.m&&!p.hj&&p.hs==='long')s+=`<path d="M13 31C13 13 21 8 30 8S47 13 47 31V59C42 61 18 61 13 59Z" fill="${hc}" ${O}/>`;
  if(!p.m&&!p.hj&&p.hs==='bob')s+=`<path d="M14 30C14 13 21 9 30 9S46 13 46 30V43C46 46 43 47 41 45H19C17 47 14 46 14 43Z" fill="${hc}" ${O}/>`;
  if(!p.m&&!p.hj&&p.hs==='bun')s+=`<circle cx="30" cy="9" r="6" fill="${hc}" ${O}/>`;
  if(p.hj)s+=`<path d="M11 31C11 13 19 7 30 7S49 13 49 31C49 42 47 51 53 66H7C13 51 11 42 11 31Z" fill="${p.hjc}" ${O}/>`;
  if(p.sh)s+=`<path d="M12 30C12 14 20 9 30 9S48 14 48 30L52 56C45 51 38 50 30 50S15 51 8 56Z" fill="url(#shm)" ${O}/>`;
  s+=`<path d="M6 66C6 53 17 47 30 47S54 53 54 66Z" fill="${p.shirt}" ${O}/><path d="M6 66C6 60 9 56 13 53" stroke="rgba(0,0,0,.12)" stroke-width="3" fill="none"/>`;
  s+=`<path d="M25 39H35V49C33 51.5 27 51.5 25 49Z" fill="${dk}"/>`;
  if(!p.hj)s+=p.m&&!p.sh?`<path d="M23 47L30 54L37 47" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.6"/>`:'';
  if(!p.hj&&!p.sh)s+=`<ellipse cx="17.6" cy="31" rx="2.6" ry="3.6" fill="${sk}" ${O}/><ellipse cx="42.4" cy="31" rx="2.6" ry="3.6" fill="${sk}" ${O}/>`;
  s+=`<ellipse cx="30" cy="30" rx="12.5" ry="14.5" fill="${sk}" ${O}/>`;
  if(p.er)s+=`<circle cx="17.4" cy="36.2" r="1.6" fill="#F2C14E" stroke="#B8860B" stroke-width=".5"/><circle cx="42.6" cy="36.2" r="1.6" fill="#F2C14E" stroke="#B8860B" stroke-width=".5"/>`;
  if(p.m&&p.hair==='bald')s+=`<path d="M18 29C17 26 18 24 19.5 23M42 29C43 26 42 24 40.5 23" stroke="#8b8b8b" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M24 18Q27 16.5 30 17" stroke="#fff" stroke-width="1.2" opacity=".6" fill="none" stroke-linecap="round"/>`;
  else if(p.m&&p.hair!=='none'){if(p.hs==='curly')s+=`<path d="M17.5 27C15.5 22 17 16 21 15C22 11.5 26 11 28 12.5C30 10.5 34 11 35.5 13C39.5 12.5 43.5 17 42.5 27C41 21.5 37 19 30 19S19 21.5 17.5 27Z" fill="${hc}" ${O}/>`;
    else if(p.hs==='spiky')s+=`<path d="M17.5 27C17 19 19 15 21 15L22 10.5L25.5 13.5L28 9.5L30.5 13L34 10L35.5 14L39 12.5L39.5 16C42 18 43 22 42.5 27C41 21.5 37 19 30 19S19 21.5 17.5 27Z" fill="${hc}" ${O}/>`;
    else s+=`<path d="M17.5 27C17 15 23 12.5 30 12.5S43 15 42.5 27C41 21 37 18.5 30 18.5S19 21 17.5 27Z" fill="${hc}" ${O}/>`;}
  if(!p.m&&!p.hj&&p.hair!=='none')s+=p.hs==='bun'?`<path d="M17.5 27C17 16 23 13 30 13S43 16 42.5 27C40 21 36 19 30 19S20 21 17.5 27Z" fill="${hc}" ${O}/>`:`<path d="M17.5 28C18 16 24 13 31 14S42 18 42.5 26C37 20 28 22 17.5 28Z" fill="${hc}" ${O}/>`;
  if(p.hj)s+=`<path d="M16.5 30C16.5 19 22 14.5 30 14.5S43.5 19 43.5 30" fill="none" stroke="${p.hjc}" stroke-width="3.4"/><path d="M16.5 30C16.5 19 22 14.5 30 14.5S43.5 19 43.5 30" fill="none" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>`;
  if(p.sh)s+=`<path d="M17 21.5C17 16 22 14 30 14S43 16 43 21.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M15.5 18C20 12.5 40 12.5 44.5 18" stroke="#1d1d1d" stroke-width="2.4" fill="none"/><path d="M16.5 20.8C21 16 39 16 43.5 20.8" stroke="#1d1d1d" stroke-width="1.8" fill="none"/>`;
  if(p.cap)s+=`<path d="M17 22C17 12.5 23 10.5 30 10.5S43 12.5 43 22Z" fill="${p.capc}" ${O}/><path d="M29 21.5H48C48 24 45 25.5 41 25H29Z" fill="${shade(p.capc,-.25)}" ${O}/><circle cx="30" cy="11" r="1.3" fill="${shade(p.capc,.3)}"/>`;
  const bw=p.hair==='blond'||p.hair==='gray'||p.hair==='none'||p.hair==='bald'?'#5a4636':shade(hc,-.2);
  s+=`<path d="M21.5 24.6Q25 22.6 28 24.4M32 24.4Q35 22.6 38.5 24.6" stroke="${bw}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  s+=`<ellipse cx="25" cy="29" rx="2.5" ry="2" fill="#fff"/><ellipse cx="35" cy="29" rx="2.5" ry="2" fill="#fff"/><circle cx="25.3" cy="29.2" r="1.3" fill="#2D2D2D"/><circle cx="35.3" cy="29.2" r="1.3" fill="#2D2D2D"/><circle cx="25.8" cy="28.7" r=".45" fill="#fff"/><circle cx="35.8" cy="28.7" r=".45" fill="#fff"/>`;
  s+=`<path d="M30 30.5Q28.4 34.6 30.4 35.2" stroke="${dk}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  if(!p.m||p.sm)s+=`<ellipse cx="21.5" cy="35" rx="2.2" ry="1.2" fill="#F08080" opacity=".35"/><ellipse cx="38.5" cy="35" rx="2.2" ry="1.2" fill="#F08080" opacity=".35"/>`;
  if(p.gl)s+=`<rect x="20.4" y="26" width="9" height="6.4" rx="2.4" fill="rgba(255,255,255,.18)" stroke="#2D4763" stroke-width="1.2"/><rect x="30.6" y="26" width="9" height="6.4" rx="2.4" fill="rgba(255,255,255,.18)" stroke="#2D4763" stroke-width="1.2"/><path d="M29.4 28.4H30.6M20.4 28.6L17.8 27.6M39.6 28.6L42.2 27.6" stroke="#2D4763" stroke-width="1.1"/>`;
  const bc=p.hair==='gray'||p.hair==='bald'?'#7d7d7d':(p.hair==='none'?'#2B2B2B':hc);
  if(p.bd)s+=`<path d="M17.8 31C17.8 45 24 46.5 30 46.5S42.2 45 42.2 31C40 38.5 36 39.5 30 39.5S20 38.5 17.8 31Z" fill="${bc}" ${O}/>`;
  if(p.mu)s+=`<path d="M24 37C26.5 35 33.5 35 36 37C33.5 36.4 26.5 36.4 24 37Z" fill="${bc}" stroke="${bc}" stroke-width="1.8" stroke-linejoin="round"/>`;
  s+=p.sm?`<path d="M25.6 38.6Q30 43 34.4 38.6Z" fill="#fff" stroke="#2D4763" stroke-width="1.1" stroke-linejoin="round"/>`:`<path d="M27 40H33" stroke="#2D4763" stroke-width="1.3" stroke-linecap="round"/>`;
  return s+'</svg>';
}
const FACES=PEOPLE.map(faceSVG);
const QS=[['رجل',p=>p.m,0],['امرأة',p=>!p.m,0],['مبتسم',p=>p.sm,0],['نظارة',p=>p.gl,0],['حلق',p=>p.er,0],
  ['شماغ',p=>p.sh,1],['حجاب',p=>p.hj,1],['كاب',p=>p.cap,1],['أصلع',p=>p.hair==='bald',1],['شعر طويل',p=>p.hs==='long',1],['لحية',p=>p.bd,1],['شنب',p=>p.mu,1],
  ['شعر أسود',p=>p.hair==='black',2],['شعر بني',p=>p.hair==='brown',2],['شعر أشقر',p=>p.hair==='blond',2],['شعر أحمر',p=>p.hair==='red',2],['شعر رمادي',p=>p.hair==='gray',2],
  ...SHIRTS.map(([c,n])=>['لبس '+n,p=>p.shn===n,3,c])];
const QCAT=['الشخص','الرأس والوجه','لون الشعر','لون اللبس'];
const pc=(i,cls,attrs)=>`<${attrs?'button':'div'} class="pc ${cls}" ${attrs||''}><div class="fr">${FACES[i]}<b>${PEOPLE[i].name}</b></div><div class="bk"><span>؟</span><b>${PEOPLE[i].name}</b></div></${attrs?'button':'div'}>`;
const elSeg=(d,a,t)=>d.el[a].slice(t*24,t*24+24);
GAMES.guess={name:'خمّن الشخص',cat:'mind',lbc:'#6E4C8B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7B4FA0"/>${[[4,4,0],[36,4,1],[68,4,2],[4,36,3],[36,36,4],[68,36,6],[4,68,9],[36,68,10],[68,68,13]].map(([x,y,k])=>`<g transform="translate(${x} ${y}) scale(.47)"><rect width="60" height="66" rx="8" fill="#fff"/>${FACES[k].replace(/^<svg[^>]*>|<\/svg>$/g,'')}</g>`).join('')}</svg>`,
  init:n=>({el:Array(n).fill('0'.repeat(24*n)),last:'',qa:[]}),
  privInit:()=>({sec:rnd(24)}),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status(d,ctx){return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  winExtra(d,ctx){const p=ctx.priv;return `${d.last}<br>`+d.pl.map((r,s)=>`${nm(d,s)}: ${p[r]&&p[r].gid===d.gid?PEOPLE[p[r].sec].name:'؟'}`).join('، ');},
  render(d,ctx){
    let v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    const spect=v<0;if(spect)v=d.turn;
    const mine=ctx.priv[d.pl[v]];const myTurn=ctx.my&&d.turn===v;const gm=myTurn&&S.gw;
    const o=curTarget(d,v);if(o==null)return '';
    let s=!spect&&mine&&mine.gid===d.gid?`<div class="secret">${pc(mine.sec,'')}<div><b>شخصيتك السرية: ${PEOPLE[mine.sec].name}</b><br><small class="note">الباقين يحاولون يعرفونها</small></div></div>`:'';
    s+=tabsHTML(d,v,myTurn?'اختر مين تسأل عنه':'لوحتك عن كل لاعب');
    const el=elSeg(d,v,o);const left=[...el].filter(c=>c==='0').length;
    const key=d.gid+'_'+v+'_'+o;S.gPrev=S.gPrev||{};const prev=S.gPrev[key]||el;S.gPrev[key]=el;
    s+=`<div class="gwh"><span>شخصية ${nameTag(d,o)}</span><b>باقي ${left} من 24</b></div>`;
    if(gm)s+=`<p class="hint" style="text-align:center">اضغط على الشخص اللي تتوقعه (لو غلطت تطلع من الجولة)</p>`;
    s+=`<div class="gw ${gm?'gm':''}">${PEOPLE.map((p,i)=>{const out=el[i]==='1';const nw=out&&prev[i]!=='1'?' flip':'';return gm&&!out?pc(i,'pick',`data-ga="guess" data-i="${i}"`):pc(i,(out?'out':'')+nw);}).join('')}</div>`;
    const log=(d.qa||[]).filter(q=>q[0]===v&&q[1]===o);
    if(log.length)s+=`<div class="qlog">${log.map(q=>`<span class="${q[3]?'y':'n'}">${QS[q[2]][0]}؟ ${q[3]?'✓':'✗'}</span>`).join('')}</div>`;
    if(myTurn){
      if(gm)s+=`<div class="acts"><button class="btn navy" data-ga="gmode">رجوع للأسئلة</button></div>`;
      else{const rem=PEOPLE.filter((p,i)=>el[i]==='0');
        s+=`<p class="lbl" style="text-align:center">اسأل: هل شخصية ${nm(d,o)} فيها…</p>`+QCAT.map((cn,ci)=>{const qs=QS.map((q,k)=>[q,k]).filter(([q])=>q[2]===ci);
          return `<div class="qcat"><small>${cn}</small><div class="qs">${qs.map(([q,k])=>{const y=rem.filter(q[1]).length;const useful=y>0&&y<rem.length;return `<button class="q" data-ga="ask" data-i="${k}" ${useful?'':'disabled'}>${q[3]?`<i style="background:${q[3]}"></i>`:''}${q[0]}؟</button>`;}).join('')}</div></div>`;}).join('')+
          `<div class="acts"><button class="btn red" data-ga="gmode">🎯 أعرفه! أبي أخمّن</button></div>`;}
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
      el[t]=el[t].slice(0,o*24)+seg+el[t].slice(o*24+24);const qa=[...(d.qa||[]),[t,o,i,ans?1:0]].slice(-60);
      act({...d,el,qa,turn:nextSeat(d,t),last:`${nm(d,t)} سأل عن ${nm(d,o)}: «${QS[i][0]}؟» والجواب ${ans?'نعم ✓':'لا ✗'}`});}
    else if(a==='guess'&&S.gw){S.gw=false;const right=i===op.sec;const out=setAt(d.out,right?o:t,'1');const al=aliveSeats(d,out);
      act({...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),
        last:right?`${nm(d,t)} عرف شخصية ${nm(d,o)}: ${P.name} 🎉`:`${nm(d,t)} خمّن ${PEOPLE[i].name} لـ${nm(d,o)} وطلع غلط`});}
  }
};


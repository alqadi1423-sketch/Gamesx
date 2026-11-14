'use strict';
/* ================= game: tic tac toe ================= */
const TTS={2:[3,3],3:[5,4],4:[6,4],5:[7,4],6:[7,4],7:[8,4],8:[8,4]};
function lineWin(b,sz,k){for(let r=0;r<sz;r++)for(let c=0;c<sz;c++){const v=b[r*sz+c];if(v==='.')continue;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[];for(let j=0;j<k;j++){const rr=r+dr*j,cc=c+dc*j;if(rr<0||rr>=sz||cc<0||cc>=sz||b[rr*sz+cc]!==v)break;cells.push(rr*sz+cc);}
    if(cells.length===k)return {w:+v,ln:cells};}}return null;}
// look only: the one cell a move changed, found by comparing with the board this phone saw before (kept in S, never in d); -1 when unknown
function bdLast(key,d,b){const L=S.bdL||(S.bdL={});const o=L[key];
  if(!o||o.gid!==d.gid||o.b.length!==b.length){L[key]={gid:d.gid,b,i:-1};return -1;}
  if(o.b!==b){let k=-1,n=0;for(let j=0;j<b.length;j++)if(b[j]!==o.b[j]){k=j;n++;}o.i=n===1?k:-1;o.b=b;}return o.i;}
// look only: no hand-driven motion in light mode or when the phone asks for less motion
const bdStill=()=>{try{return document.documentElement.classList.contains('lite')||matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return true;}};
/* look only: a piece already drawn on its new square slides there from the earlier squares `via` (elements, first = where it
   started), moving by transform only. Its square is lifted above the others while it flies. Nothing waits for it */
function bdFly(el,via,ms){if(!el||!el.animate||!via.length||bdStill())return;const b=el.getBoundingClientRect();if(!b.width)return;
  const fr=via.map(v=>{const a=v.getBoundingClientRect();return `translate(${(a.left+a.width/2-b.left-b.width/2).toFixed(1)}px,${(a.top+a.height/2-b.top-b.height/2).toFixed(1)}px) scale(1.1)`;});
  const host=el.parentElement;if(host&&host.classList){host.classList.add('bd-fly');setTimeout(()=>host.classList.remove('bd-fly'),ms+60);}
  try{el.animate([...fr.map(transform=>({transform})),{transform:'none'}],{duration:ms,easing:'cubic-bezier(.3,.75,.35,1)'});}catch(e){}}
GAMES.ttt={name:'إكس أو',cat:'board',lbc:'#B9483F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E36A5E"/><path d="M38 12V72M62 12V72M14 30H86M14 54H86" stroke="#2D4763" stroke-width="5" stroke-linecap="round"/><path d="M19 37L32 49M32 37L19 49" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="42" r="7" stroke="#4AB1E8" stroke-width="5" fill="none"/><circle cx="74" cy="19" r="6" stroke="#4AB1E8" stroke-width="5" fill="none"/></svg>`,
  // vr 1 (two players): each keeps only three marks, and a fourth one wipes the oldest, so nobody can just block to a draw
  init:n=>{const [sz,k]=TTS[n]||[8,4];const vr=n===2?TTTV:0;return {sz,k,b:'.'.repeat(sz*sz),ln:null,vr,q:vr?Array(n).fill(0).map(()=>[]):null,nmv:0};},
  status:(d,ctx)=>turnTxt(d,ctx)+(d.vr?'<br><small>كل واحد له 3 علامات بس، والرابعة تمسح أقدمها</small>':''),
  render(d,ctx){const g=d.sz>5?4:d.sz>3?5:8,lm=d.ln?-1:bdLast('ttt',d,d.b);
    // the mark that goes with the next move of whoever plays now
    const old=d.vr&&d.win==null&&d.q&&d.q[d.turn]&&d.q[d.turn].length>=d.k?d.q[d.turn][0]:-1;
    const fresh=d.pl.length===2&&!/[0-9]/.test(d.b)&&d.win==null;
    let h=fresh?`<div class="segs tttv">${[['0','كلاسيكية'],['1','تختفي القديمة']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:'';
    let ln='';if(d.ln){const [x0,y0]=[d.ln[0]%d.sz,Math.floor(d.ln[0]/d.sz)],[x1,y1]=[d.ln[d.ln.length-1]%d.sz,Math.floor(d.ln[d.ln.length-1]/d.sz)];
      ln=`<svg class="tln" viewBox="0 0 ${d.sz} ${d.sz}" preserveAspectRatio="none" aria-hidden="true"><line x1="${x0+.5}" y1="${y0+.5}" x2="${x1+.5}" y2="${y1+.5}" pathLength="1" stroke="${col(d,d.win)}" stroke-width="${.16}" stroke-linecap="round"/></svg>`;}
    return h+`<div class="ttt bd-ttt ${ctx.my?'my':''}" style="grid-template-columns:repeat(${d.sz},minmax(0,1fr));gap:${g}px;--c:${col(d,d.turn)}">${[...d.b].map((c,i)=>`<button class="tc ${d.ln&&d.ln.includes(i)?'hl':''} ${i===lm?'lm':''} ${i===old?'old':''}" ${c!=='.'?`style="--c:${col(d,+c)}"`:''} data-ga="m" data-i="${i}" ${c!=='.'||!ctx.my?'disabled':''}>${c!=='.'?shape(d.pl[+c]):''}</button>`).join('')}${ln}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;
    if(a==='vr'){if(/[0-9]/.test(d.b)||d.pl.length!==2)return;TTTV=i?1:0;act({...d,vr:TTTV,q:TTTV?d.pl.map(()=>[]):null});return;}
    if(d.b[i]!=='.')return;const nd=tttPut(d,i);
    act({...nd,turn:nextSeat(d,d.turn)});
  }
};
// a mark of whoever plays now on cell i: the board, the marks' order, the winner (the turn is left as it was)
function tttPut(d,i){let b=d.b,q=d.q;const t=d.turn;
  if(d.vr){q=q.map(x=>[...x]);if(q[t].length>=d.k)b=setAt(b,q[t].shift(),'.');q[t].push(i);}
  b=setAt(b,i,String(t));const r=lineWin(b,d.sz,d.k);const nmv=(d.nmv||0)+1;
  // the vanishing game cannot fill up: after 60 marks it is a draw
  const win=r?r.w:(d.vr?(nmv>=60?'d':null):(b.includes('.')?null:'d'));
  return {...d,b,q,nmv,win,ln:r?r.ln:null};}
let TTTV=0;// the last choice on this phone, kept for the next rounds

/* ================= game: dots and boxes ================= */
const cntSeat=(s,n)=>{const a=Array(n).fill(0);for(const c of s)if(c!=='.')a[+c]++;return a;};
let DTV=1;// the last size chosen on this phone, kept for the next rounds
function dtBoard(n,sz){const B0=n===2?4:n<=4?5:6,B=sz===0?B0-1:sz===2?Math.min(7,B0+2):B0;return {B,sz,h:'.'.repeat((B+1)*B),v:'.'.repeat(B*(B+1)),bx:'.'.repeat(B*B)};}
GAMES.dots={name:'نقاط ومربعات',cat:'board',lbc:'#8F86C9',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D8D2F6"/><rect x="22" y="22" width="28" height="28" fill="#F6B3AC"/><path d="M22 22H50V50H22Z" stroke="#EC6158" stroke-width="4" fill="none"/><path d="M50 50H78M78 22V50" stroke="#4AB1E8" stroke-width="4"/>${[22,50,78].map(y=>[22,50,78].map(x=>`<circle cx="${x}" cy="${y}" r="5" fill="#2D4763"/>`).join('')).join('')}</svg>`,
  // sz: the board size chosen before the first line (0 small, 1 normal, 2 big: longer chains, a longer fight for control)
  init:n=>dtBoard(n,DTV),
  points:d=>cntSeat(d.bx,d.pl.length),status:(d,ctx)=>turnTxt(d,ctx),
  winExtra(d){const c=cntSeat(d.bx,d.pl.length);return 'المربعات: '+c.map((x,s)=>`${nm(d,s)} ${x}`).join('، ');},
  render(d,ctx){
    const B=d.B,st=80/B,P=k=>10+k*st,sw=B>4?2.6:3.2,hw=B>4?7:9;let bx='',segs='',dots='';
    // every box and every line keeps its own slot, so only what was just drawn is new and plays its animation
    for(let r=0;r<B;r++)for(let c=0;c<B;c++){const o=d.bx[r*B+c];
      bx+=o==='.'?'<g></g>':`<g><rect class="bx" x="${P(c)+.6}" y="${P(r)+.6}" width="${st-1.2}" height="${st-1.2}" rx="1.6" fill="${lit(d,+o)}"/><g class="bxs"><g transform="translate(${P(c)+st*.3} ${P(r)+st*.3}) scale(${st*.4/40})">${SHP[d.pl[+o]](col(d,+o))}</g></g></g>`;}
    const seg=(x1,y1,x2,y2,val,a,i)=>{const xy=`x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`;
      if(val!=='.')return `<g><line ${xy} class="ln" pathLength="1" stroke="${col(d,+val)}" stroke-width="${sw}" stroke-linecap="round"/></g>`;
      return `<g><line ${xy} class="ghost" stroke-width="1.4"/>${ctx.my?`<line ${xy} class="hit" stroke-width="${hw}" stroke-linecap="round" data-ga="${a}" data-i="${i}"/>`:''}</g>`;};
    for(let r=0;r<=B;r++)for(let c=0;c<B;c++){const k=r*B+c;segs+=seg(P(c),P(r),P(c+1),P(r),d.h[k],'h',k);}
    for(let r=0;r<B;r++)for(let c=0;c<=B;c++){const k=r*(B+1)+c;segs+=seg(P(c),P(r),P(c),P(r+1),d.v[k],'v',k);}
    for(let r=0;r<=B;r++)for(let c=0;c<=B;c++)dots+=`<circle cx="${P(c)}" cy="${P(r)}" r="${B>4?1.9:2.3}" class="dt" pointer-events="none"/>`;
    const fresh=!ctx.bot&&!/[0-9]/.test(d.h+d.v)&&d.win==null;
    return `${fresh?`<div class="segs tttv">${[['0','صغيرة'],['1','عادية'],['2','كبيرة']].map(([k,t])=>`<button class="seg ${+k===(d.sz??1)?'on':''}" data-ga="sz" data-i="${k}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:''}<svg class="dots bd-dots" viewBox="0 0 100 100" style="--c:${col(d,d.turn)}">${bx}${segs}${dots}</svg>`;
  },
  click(a,i,d,ctx){
    if(!ctx.my)return;
    if(a==='sz'){if(/[0-9]/.test(d.h+d.v)||![0,1,2].includes(i))return;DTV=i;act({...d,...dtBoard(d.pl.length,i)});return;}
    let {h,v,bx}=d;const B=d.B,t=String(d.turn);
    if(a==='h'){if(h[i]!=='.')return;h=setAt(h,i,t);}else{if(v[i]!=='.')return;v=setAt(v,i,t);}
    let got=false;
    for(let r=0;r<B;r++)for(let c=0;c<B;c++){const k=r*B+c;if(bx[k]!=='.')continue;
      if(h[r*B+c]!=='.'&&h[(r+1)*B+c]!=='.'&&v[r*(B+1)+c]!=='.'&&v[r*(B+1)+c+1]!=='.'){bx=setAt(bx,k,t);got=true;}}
    let win=null;if(!bx.includes('.')){const n=cntSeat(bx,d.pl.length).map((x,s)=>d.out[s]==='1'?-1:x);const mx=Math.max(...n);const top=n.map((x,s)=>x===mx?s:-1).filter(s=>s>=0);win=top.length===1?top[0]:'d';}
    act({...d,h,v,bx,turn:got?d.turn:nextSeat(d,d.turn),win});
  }
};

/* ================= game: snakes and ladders ================= */
const LAD={4:25,13:46,33:49,42:63,50:69,62:81,74:92},SNK={27:5,40:3,43:18,54:31,66:45,76:58,89:53,99:41};
const cellXY=n=>{const r=Math.floor((n-1)/10),c=r%2===0?(n-1)%10:9-(n-1)%10;return [c*10+5,(9-r)*10+5];};
const PIPS={1:[[50,50]],2:[[29,29],[71,71]],3:[[27,27],[50,50],[73,73]],4:[[29,29],[71,29],[29,71],[71,71]],5:[[27,27],[73,27],[50,50],[27,73],[73,73]],6:[[29,25],[71,25],[29,50],[71,50],[29,75],[71,75]]};
const diceSVG=n=>`<svg viewBox="0 0 100 100" class="dsv">${(PIPS[n]||[]).map(([x,y])=>`<circle class="pw" cx="${x}" cy="${y}" r="${n===1?13:10.5}" fill="#13253A"/><circle class="pf" cx="${x+.9}" cy="${y+1.4}" r="${n===1?11:8.8}" fill="#34557A"/>`).join('')}</svg>`;
function ladderSVG(a,b){const [x1,y1]=cellXY(a),[x2,y2]=cellXY(b);const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),nx=-dy/L*2,ny=dx/L*2;
  const rl=(o,cls)=>`<line class="${cls}" x1="${x1+nx*o}" y1="${y1+ny*o}" x2="${x2+nx*o}" y2="${y2+ny*o}"/>`;
  let s=`<g class="lad">${rl(1,'rail')}${rl(-1,'rail')}`;
  const k=Math.max(2,Math.floor(L/3.5));for(let j=1;j<k;j++){const t=j/k,x=x1+dx*t,y=y1+dy*t;s+=`<line class="rung" x1="${x+nx}" y1="${y+ny}" x2="${x-nx}" y2="${y-ny}"/>`;}
  return s+`${rl(1,'rail hi')}${rl(-1,'rail hi')}</g>`;}
const SC=['#5CC08C','#E8746B','#9C7BD6','#F2A93B'];
function snakeSVG(a,b,k){const [x1,y1]=cellXY(a),[x2,y2]=cellXY(b);const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),nx=-dy/L*5,ny=dx/L*5;const c=SC[k%4];
  const p=`M${x1} ${y1} C ${x1+dx*.33+nx} ${y1+dy*.33+ny}, ${x1+dx*.66-nx} ${y1+dy*.66-ny}, ${x2} ${y2}`;
  // the head looks away from the body: along the curve's first handle, backwards
  const hx=dx*.33+nx,hy=dy*.33+ny,hl=Math.hypot(hx,hy)||1,ux=-hx/hl,uy=-hy/hl;
  return `<path d="${p}" stroke="#2D4763" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="${p}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="${p}" stroke="${shade(c,-.28)}" stroke-width="1.1" stroke-dasharray="1.2 2.2" fill="none" stroke-linecap="round" opacity=".7"/><path d="${p}" stroke="#fff" stroke-width=".5" fill="none" opacity=".35" transform="translate(-.45 -.45)"/>`+
    `<path d="M${x1+ux*2.4} ${y1+uy*2.4}l${ux*1.6} ${uy*1.6}m0 0l${ux*.6-uy*.6} ${uy*.6+ux*.6}m${-ux*.6+uy*.6} ${-uy*.6-ux*.6}l${ux*.6+uy*.6} ${uy*.6-ux*.6}" stroke="#E5483F" stroke-width=".45" fill="none" stroke-linecap="round"/>`+
    `<circle cx="${x1}" cy="${y1}" r="2.6" fill="${c}" stroke="#2D4763" stroke-width=".6"/><circle cx="${x1-.9}" cy="${y1-.6}" r=".7" fill="#fff"/><circle cx="${x1+.9}" cy="${y1-.6}" r=".7" fill="#fff"/><circle cx="${x1-.8}" cy="${y1-.5}" r=".32" fill="#2D4763"/><circle cx="${x1+1}" cy="${y1-.5}" r=".32" fill="#2D4763"/>`;}
GAMES.snakes={name:'السلم والثعبان',cat:'board',lbc:'#A8743F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FBEFD9"/><path d="M0 0H33V33H0ZM66 0H100V33H66ZM33 33H66V66H33ZM0 66H33V100H0ZM66 66H100V100H66Z" fill="#F3D9AE"/><path d="M60 8L80 70M70 6L90 68" stroke="#8a5a2b" stroke-width="4"/><path d="M63 20L74 17M66 32L78 29M70 44L82 41M74 56L86 53" stroke="#8a5a2b" stroke-width="3"/><path d="M22 22C40 35 6 50 26 70" stroke="#2D4763" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M22 22C40 35 6 50 26 70" stroke="#5CC08C" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="22" cy="22" r="8" fill="#5CC08C" stroke="#2D4763" stroke-width="2.5"/><circle cx="19" cy="20" r="2" fill="#fff"/><circle cx="25" cy="20" r="2" fill="#fff"/><circle cx="40" cy="84" r="7" fill="#EC6158" stroke="#2D4763" stroke-width="2.5"/><circle cx="58" cy="84" r="7" fill="#4AB1E8" stroke="#2D4763" stroke-width="2.5"/></svg>`,
  // vr 1: two dice each turn and the player picks which one to walk (a real choice: dodge a snake head, aim for a ladder)
  init:n=>({pos:Array(n).fill(0),dice:0,msg:'',vr:SNV,ph:'roll',dd:null,mvf:null}),
  status:(d,ctx)=>(d.msg?`<small>${d.msg}</small><br>`:'')+turnTxt(d,ctx)+(d.vr&&d.ph==='pick'&&d.win==null?': اختر زهرة':''),
  onTimeout:d=>d.ph==='pick'?snUse(d,snBest(d)):{...d,turn:nextSeat(d,d.turn)},
  // a player who left while choosing: the dice he rolled go with him
  onSkip:(nd,d)=>nd.turn!==d.turn?{...nd,ph:'roll',dd:null}:nd,
  render(d,ctx){
    let cells='';for(let row=9;row>=0;row--)for(let c=0;c<10;c++){const n=row%2===0?row*10+c+1:row*10+(9-c)+1;cells+=`<div class="cl ${(row+c)%2?'b':'a'}">${n}</div>`;}
    let ov=Object.entries(LAD).map(([a,b])=>ladderSVG(+a,b)).join('')+Object.entries(SNK).map(([a,b],k)=>snakeSVG(+a,b,k)).join('');
    const r=d.pl.length>4?2.4:3.1;
    // every seat keeps its own token node (hidden off the board), so a move slides it from cell to cell
    d.pos.forEach((p,s)=>{const [x,y]=snXY(d,s,p);const on=p>0&&d.out[s]!=='1';
      const c=col(d,s);
      ov+=`<g class="tk ${on?'':'off'} ${s===d.turn&&d.win==null?'on':''}" data-s="${s}" style="transform:translate(${x.toFixed(2)}px,${y.toFixed(2)}px)"><ellipse cy="${r*.62}" rx="${r*.95}" ry="${r*.45}" fill="rgba(0,0,0,.28)"/><circle r="${r}" fill="${c}" stroke="${shade(c,-.45)}" stroke-width=".7"/><circle r="${r*.62}" fill="none" stroke="${shade(c,.35)}" stroke-width=".5"/><ellipse cx="${-r*.32}" cy="${-r*.38}" rx="${r*.42}" ry="${r*.26}" fill="#fff" opacity=".6"/></g>`;});
    const off=d.pl.map((_,s)=>s).filter(s=>d.pos[s]===0&&d.out[s]!=='1');
    const anim=S.rolled;S.rolled=false;const fresh=d.pos.every(x=>x===0)&&!d.dice&&d.win==null;
    let foot;
    if(d.vr&&d.ph==='pick'&&d.dd){const t=d.turn;
      foot=`<div class="row snpick">${d.dd.map((v,j)=>{const to=snLand(d.pos[t],v);const tag=to.to>to.land?'🪜':to.to<to.land?'🐍':'';
        return `<button class="snd" data-ga="use" data-i="${j}" ${ctx.my?'':'disabled'} style="--c:${col(d,t)}"><span class="tapd ${anim?'roll':''}">${diceSVG(v)}</span><b>${to.stay?'ما يمشي':`إلى ${to.to} ${tag}`}</b></button>`;}).join('')}</div>`;}
    else foot=`<div class="row">${tapDie(d.dice,ctx.my&&d.win==null,col(d,d.turn),anim?'roll':'')}</div>`;
    return `${fresh?`<div class="segs tttv">${[['0','زهرة وحدة'],['1','زهرتين وتختار']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:''}<div class="sl bd-sl"><div class="cells">${cells}</div><svg viewBox="0 0 100 100">${ov}</svg></div>
      ${off.length?`<div class="start">قبل البداية: ${off.map(s=>`<span class="mini" style="background:${col(d,s)}">${nm(d,s)}</span>`).join('')}</div>`:''}
      ${foot}`;
  },
  // the token walks cell by cell, then rides the ladder or slides down the snake (look only)
  after(d){const m=d.mvf;if(!m)return;const k=d.gid+':'+m.join(',');if(S.snFx===k)return;S.snFx=k;if(bdStill())return;
    const el=app.querySelector(`.bd-sl .tk[data-s="${m[0]}"]`);if(!el||!el.animate)return;const [s,from,land,to]=m;
    const pts=[];for(let c=from;c!==land;c+=from<land?1:-1)pts.push(c);pts.push(land);if(to!==land)pts.push(to);if(pts.length<2)return;
    const walk=to!==land?.7:1,n=pts.length-(to!==land?2:1);
    const fr=pts.map((c,j)=>{const [x,y]=snXY(d,s,c,true);return {transform:`translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`,offset:j<=n?(n?j/n*walk:0):1};});
    try{el.animate(fr,{duration:Math.min(450,120+60*pts.length),easing:'linear'});}catch(e){}},
  click(a,i,d,ctx){
    if(!ctx.my)return;
    if(a==='vr'){if(!(d.pos.every(x=>x===0)&&!d.dice))return;SNV=i?1:0;act({...d,vr:SNV});return;}
    if(a==='use'){if(d.ph!=='pick'||!d.dd||!d.dd[i])return;act(snUse(d,i));return;}
    if(a!=='roll'||d.ph==='pick')return;const r=1+rnd(6),t=d.turn;S.rolled=true;
    if(d.vr){const r2=1+rnd(6);act({...d,ph:'pick',dd:[r,r2],dice:r,msg:`${nm(d,t)} رمى ${r} و${r2}`});return;}
    act(snGo(d,r));
  }
};
let SNV=0;// the last dice choice on this phone, kept for the next rounds
// where a walk of r from p ends: the cell it lands on, and where the ladder or snake there takes it
function snLand(p,r){const land=p+r;if(land>100)return {stay:true,land:p,to:p};return {land,to:LAD[land]||SNK[land]||land};}
// a token's place on the board (spread a little when several share a cell); at=true: the cell's centre for seat s only
function snXY(d,s,p,at){if(p<=0)return [-6,106];const [cx,cy]=cellXY(p);if(at)return [cx,cy+1];
  const same=d.pos.map((q,k)=>q===p&&d.out[k]!=='1'?k:-1).filter(k=>k>=0);const m=same.length,j=same.indexOf(s);
  return [cx+(m>1?Math.cos(2*Math.PI*j/m)*2.4:0),cy+1+(m>1?Math.sin(2*Math.PI*j/m)*2.4:0)];}
function snGo(d,r){const t=d.turn,L=snLand(d.pos[t],r);let msg;const p0=d.pos[t];
  if(L.stay)msg=`طلع ${r}، يحتاج ${100-p0} بالضبط`;
  else if(L.to>L.land)msg=`طلع ${r}، سلّم من ${L.land} إلى ${L.to}! 🪜`;
  else if(L.to<L.land)msg=`طلع ${r}، الثعبان نزّله من ${L.land} إلى ${L.to} 🐍`;
  else msg=`طلع ${r}، وصل ${L.to}`;
  const pos=[...d.pos];pos[t]=L.to;const win=L.to===100?t:null;const extra=r===6&&win==null;
  if(extra)msg+='، ستة! يرمي مرة ثانية';
  return {...d,pos,dice:r,ph:'roll',dd:null,mvf:L.stay?d.mvf:[t,p0,L.land,L.to,(d.mvf?d.mvf[4]:0)+1],msg:`${nm(d,t)}: ${msg}`,turn:extra?t:nextSeat(d,t),win};}
const snUse=(d,i)=>snGo(d,d.dd[i]);
// the die that leaves the token furthest on (a ladder counts, a snake head does not)
// deep: also what the next pair of dice is worth from there (a cell just under a ladder is better than one under a snake head)
function snBest(d,deep){const p=d.pos[d.turn];const one=(q,r)=>{const L=snLand(q,r);return L.stay?q-.5:L.to===100?1e3:L.to;};
  const nx=q=>{let t=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)t+=Math.max(one(q,a),one(q,b))-q;return t/36;};
  const v=r=>{const L=snLand(p,r);if(L.to===100)return 1e4;const at=L.stay?p:L.to;return one(p,r)+(r===6?3.5:0)+(deep?.6*nx(at):0);};
  return v(d.dd[1])>v(d.dd[0])?1:0;}
GAMES.snakes.bot=(d,s,lv)=>{S.rolled=true;
  if(d.ph==='pick'&&d.dd)return snUse(d,lv===1&&Math.random()<.5?rnd(2):snBest(d,lv===3));
  const r=1+rnd(6);if(d.vr){const r2=1+rnd(6);return {...d,ph:'pick',dd:[r,r2],dice:r,msg:`${nm(d,s)} رمى ${r} و${r2}`};}
  return snGo(d,r);};

/* ================= game: color wars ================= */
const CWS={2:5,3:6,4:6,5:7,6:7,7:8,8:8};
const NB=(i,Z)=>{const r=Math.floor(i/Z),c=i%Z,o=[];if(r>0)o.push(i-Z);if(r<Z-1)o.push(i+Z);if(c>0)o.push(i-1);if(c<Z-1)o.push(i+1);return o;};
const CP={1:[[50,50]],2:[[34,34],[66,66]],3:[[50,30],[31,64],[69,64]]};
function cwCell(c,n){const pts=CP[n]||[];
  return `<svg viewBox="0 0 100 100" class="blob"><circle cx="50" cy="53" r="44" fill="${shade(c,-.3)}"/><circle cx="50" cy="49" r="44" fill="${c}"/><ellipse cx="40" cy="27" rx="22" ry="11" fill="#fff" opacity=".28"/>${pts.map(([x,y])=>`<g class="pip"><circle cx="${x}" cy="${y+2}" r="9.5" fill="rgba(0,0,0,.18)"/><circle cx="${x}" cy="${y}" r="9.5" fill="#fff"/></g>`).join('')}${n>3?`<text x="50" y="62" text-anchor="middle" font-size="36" fill="#fff" font-weight="800">${n}</text>`:''}</svg>`;}
let CWV=0;// the last choice on this phone, kept for the next rounds
// how many dots make cell i burst: always 4 in the classic game, the number of its neighbours in the chain reaction
const cwCap=(i,d)=>d.vr?NB(i,d.Z).length:4;
GAMES.cw={name:'حرب الألوان',cat:'board',lbc:'#4B3A62',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4B3A62"/>${[0,1,2].map(r=>[0,1,2].map(c=>{const x=6+c*31,y=6+r*31;const k=(r*3+c)%4;const bg=k===0?'#FAD2CE':k===1?'#CDEAFA':'#EFE8DD';const dot=k===0?'#EC6158':k===1?'#4AB1E8':'';return `<rect x="${x}" y="${y}" width="27" height="27" rx="7" fill="${bg}"/>`+(dot?`<circle cx="${x+13.5}" cy="${y+13.5}" r="10" fill="${dot}"/><circle cx="${x+10}" cy="${y+10}" r="2.6" fill="#fff"/><circle cx="${x+17}" cy="${y+17}" r="2.6" fill="#fff"/>`:'');}).join('')).join('')}</svg>`,
  // vr 1 (chain reaction): one dot at a time on an empty cell or your own, and a cell bursts when its dots reach its neighbours
  // (two in a corner, three on an edge, four inside), so corners are quick and the middle is slow
  init:n=>{const Z=CWS[n]||8;return {Z,o:'.'.repeat(Z*Z),n:'0'.repeat(Z*Z),mv:Array(n).fill(0),vr:CWV};},
  status(d,ctx){return turnTxt(d,ctx)+(d.vr&&d.win==null?'<br><small>نقطة وحدة بكل دور، والخانة تنفجر لما تساوي نقاطها عدد جيرانها</small>':'');},
  render(d,ctx){
    const t=String(d.turn),first=d.mv[d.turn]===0,Z=d.Z,ex=new Set(d.ex||[]),fresh=!ctx.bot&&d.mv.every(m=>!m)&&d.win==null;
    // the dots a cell sends to its neighbours when it bursts (the first few bursts only, so a long chain stays light)
    const fly=new Set((d.ex||[]).slice(0,10)),dir={[-Z]:[0,-1],[Z]:[0,1],[-1]:[-1,0],[1]:[1,0]},by=d.xb!=null?d.xb:d.turn;
    const h=fresh?`<div class="segs tttv">${[['0','كلاسيكية'],['1','تفاعل متسلسل']].map(([v,tx])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${tx}</button>`).join('')}</div>`:'';
    return h+`<div class="cw bd-cw ${d.vr?'cr':''}" style="grid-template-columns:repeat(${Z},minmax(0,1fr));gap:${Z>6?4:6}px;--c:${col(d,d.turn)}">${[...d.o].map((o,i)=>{const can=ctx.my&&(d.vr?o==='.'||o===t:first?o==='.':o===t);
      const sp=fly.has(i)?NB(i,Z).map((b,k)=>{const [x,y]=dir[b-i]||[0,0];return `<i class="cwo" data-k="o${d.xn}_${k}" style="--x:${x*100}%;--y:${y*100}%;--c:${col(d,by)}"></i>`;}).join(''):'';
      return `<button class="cc ${can?'can':''} ${o!=='.'?'own':''} ${d.vr&&o!=='.'&&+d.n[i]===cwCap(i,d)-1?'hot':''}" style="${o!=='.'?`background:${lit(d,+o)}`:''}" data-ga="m" data-i="${i}" ${can?'':'disabled'}>${o!=='.'?cwCell(col(d,+o),+d.n[i]):''}${ex.has(i)?`<i class="cwx" data-k="x${d.xn}"></i>`:''}${sp}</button>`;}).join('')}</div>`;
  },
  click(a,i,d,ctx){
    if(!ctx.my)return;
    if(a==='vr'){if(d.mv.some(m=>m))return;CWV=i?1:0;act({...d,vr:CWV});return;}
    if(!Number.isInteger(i)||i<0||i>=d.o.length)return;
    const t=d.turn,ts=String(t),Z=d.Z,N=d.pl.length;const o=[...d.o],n=[...d.n].map(Number);
    if(d.vr){if(o[i]!=='.'&&o[i]!==ts)return;o[i]=ts;n[i]++;}
    else if(d.mv[t]===0){if(o[i]!=='.')return;o[i]=ts;n[i]=3;}else{if(o[i]!==ts)return;n[i]++;}
    const othersMoved=d.mv.every((m,s)=>s===t||m>0||d.out[s]==='1');const ex=[];const cap=k=>cwCap(k,d);
    for(let g=0;g<5000;g++){
      const k=n.findIndex((x,j)=>x>=cap(j));if(k<0)break;
      n[k]-=cap(k);if(n[k]===0)o[k]='.';if(!ex.includes(k))ex.push(k);
      for(const b of NB(k,Z)){o[b]=ts;n[b]++;}
      if(othersMoved&&o.every(c=>c==='.'||c===ts))break;
    }
    const mv=[...d.mv];mv[t]++;let out=d.out;
    for(let s=0;s<N;s++)if(out[s]!=='1'&&mv[s]>0&&!o.includes(String(s)))out=setAt(out,s,'1');
    const al=aliveSeats(d,out);const win=al.length===1?al[0]:null;
    act({...d,o:o.join(''),n:n.map(x=>Math.min(x,9)).join(''),mv,out,turn:nextSeat(d,t,out),win,ex:ex.slice(0,40),xn:(d.xn||0)+1,xb:t});
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
// d.auto: the turn timer ran out while ships were being placed, so every fleet laid out so far counts as ready
const seaReady=(p,d)=>!!(p&&p.gid===d.gid&&(p.ready||d.auto)&&p.f);
const allReady=(d,pr)=>d.pl.every((r,s)=>d.out[s]==='1'||seaReady(pr[r],d));
// online, seats still placing ships whose player has left; the turn seat is left to the room's own skip button
const seaGone=(d,pr)=>S.mode!=='online'||d.win!=null?[]:aliveSeats(d).filter(s=>s!==d.turn&&!S.roles.has(d.pl[s])&&Date.now()-((S.goneAt||{})[d.pl[s]]??S.joinT??0)>=GRACE&&!seaReady(pr[d.pl[s]],d));
// a seat's fleet as this phone may see it: pass ctx.priv when drawing (online it holds only the sunk ships of the others)
const seaFleet=(d,s,pr=S.priv)=>{const p=pr[d.pl[s]];return p&&p.gid===d.gid&&typeof p.f==='string'?p.f:null;};
// ships still afloat: counted from the fleet, or from the count the host sends with a hidden fleet
const seaLeft=(d,s,pr=S.priv)=>{const p=pr[d.pl[s]];return p&&p.gid===d.gid&&Number.isInteger(p.af)?p.af:seaAfloat(seaFleet(d,s,pr),d.sh[s]);};
const seaSunk=(f,sh)=>{const out=new Set();if(f)for(const L of SL){let any=false,all=true;for(let i=0;i<64;i++)if(f[i]===L){any=true;if(sh[i]!=='o')all=false;}if(any&&all)out.add(L);}return out;};
const seaDead=(f,sh)=>!!f&&[...f].every((c,i)=>c==='.'||sh[i]==='o');
const seaAfloat=(f,sh)=>f?SL.split('').filter(L=>f.includes(L)&&!seaSunk(f,sh).has(L)).length:0;
// a ship may move or turn only onto free water that does not touch another ship
function seaPlace(f,L,head,hz){const len=[...f].filter(c=>c===L).length;const r=Math.floor(head/8),c=head%8;if(hz?c+len>8:r+len>8)return null;
  const g=[...f].map(x=>x===L?'.':x);const cells=[...Array(len).keys()].map(k=>hz?head+k:head+k*8);
  if(cells.some(x=>near(g,x)))return null;cells.forEach(x=>g[x]=L);return g.join('');}
const seaShip=(f,L)=>{const cs=[...f].map((c,i)=>c===L?i:-1).filter(i=>i>=0);return {head:cs[0],hz:cs.length>1&&cs[1]===cs[0]+1};};
// ships are drawn as hulls under the grid; every cell then shows splash, fire or smoke on top
function seaHull(cells,cls){const n=cells.length,h=cells[0],r=Math.floor(h/8),c=h%8,hz=n>1&&cells[1]===h+1;
  const tf=hz?`translate(${c} ${r})`:`translate(${c+1} ${r}) rotate(90)`;
  const tur=[...Array(Math.max(1,n-1)).keys()].map(k=>`<circle cx="${.75+k*(n-1.1)/Math.max(1,n-1)}" cy=".5" r=".13"/>`).join('');
  return `<g class="hull ${cls}" transform="${tf}"><path class="hb" d="M.1 .32Q.1 .17 .3 .17L${n-.6} .17Q${n-.12} .22 ${n-.05} .5Q${n-.12} .78 ${n-.6} .83L.3 .83Q.1 .83 .1 .68Z"/>
    <rect class="hd" x=".32" y=".36" width="${Math.max(.2,n-1.05)}" height=".28" rx=".12"/><rect class="hc" x="${n*.42-.18}" y=".3" width=".42" height=".4" rx=".08"/><g class="ht">${tur}</g></g>`;}
const SEAFX={};// when each shot was first seen, so its animation survives quick redraws
function seaNew(key){const now=Date.now();if(!SEAFX[key])SEAFX[key]=now;return now-SEAFX[key]<1600;}
function seaGrid(f,sh,show,click,small,marks,flash,fk){
  const sunk=seaSunk(f,sh);let ships='';
  if(f)for(const L of SL){const cs=[...f].map((x,i)=>x===L?i:-1).filter(i=>i>=0);if(!cs.length)continue;const dn=sunk.has(L);if(!show&&!dn)continue;
    ships+=seaHull(cs,dn?'wreck':click==='ed'&&S.seaSel===L?'sel':'');}
  let s=`<div class="sea bd-sea ${small?'small':''} ${click==='fire'||click==='aim'?'aim':''} ${click==='ed'?'edit':''}"><svg class="ships" viewBox="0 0 8 8" preserveAspectRatio="none">${ships}</svg>`;
  for(let i=0;i<64;i++){const c=f?f[i]:'.';const st=sh[i];const mk=marks&&marks.includes(i);const dn=c!=='.'&&sunk.has(c);
    const nw=!!(fk&&flash&&flash.includes(i)&&seaNew(fk+':'+i));
    let fx='';if(st==='x')fx=`<i class="spl"></i>${nw?'<b class="drop"></b><i class="wave"></i><i class="wave w2"></i>':''}`;
    else if(st==='o')fx=dn?`<i class="smk"></i>${nw?'<b class="drop"></b><i class="boom"></i>':''}`:`<i class="fire">🔥</i>${nw?'<b class="drop"></b><i class="boom sm"></i>':''}`;
    const cls=`sc ${st==='o'?'hit':st==='x'?'miss':''} ${mk?'mark':''} ${nw?'new':''}`;
    s+=click&&(click==='ed'||st==='.')?`<button class="${cls} can" data-ga="${click}" data-i="${i}">${fx}</button>`:`<div class="${cls}">${fx}</div>`;}
  return s+'</div>';
}
// short sounds made on the spot: a dull boom for a hit, a splash for the water
let seaAC=null;
function seaSound(kind){if(S.mute)return;try{seaAC=seaAC||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  const ac=seaAC,t=ac.currentTime,len=kind==='boom'?.9:kind==='hit'?.5:.45;const buf=ac.createBuffer(1,Math.floor(ac.sampleRate*len),ac.sampleRate);const ch=buf.getChannelData(0);
  for(let i=0;i<ch.length;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/ch.length,kind==='splash'?1.5:2.5);
  const src=ac.createBufferSource();src.buffer=buf;const flt=ac.createBiquadFilter();flt.type=kind==='splash'?'bandpass':'lowpass';flt.frequency.value=kind==='splash'?1400:kind==='boom'?380:700;
  const g=ac.createGain();g.gain.value=kind==='boom'?.9:.55;src.connect(flt);flt.connect(g);g.connect(ac.destination);src.start(t+.4);}
// three or more always fire salvos; two players choose before the battle (vr 1: a salvo of one shot for every ship still afloat)
const seaSalvo=d=>d.pl.length>2||!!d.vr;
let SEAV=0;// the last choice on this phone, kept for the next rounds
// the choice shows while the fleets are being placed (public: it changes no fleet)
const seaVrSeg=(d,ctx)=>d.pl.length!==2||ctx.bot?'':`<div class="segs tttv">${[['0','طلقة بالدور'],['1','طلقة لكل سفينة']].map(([k,t])=>`<button class="seg ${+k===(d.vr||0)?'on':''}" data-ga="vr" data-i="${k}">${t}</button>`).join('')}</div>`;
GAMES.sea={name:'معركة السفن',cat:'board',lbc:'#245F8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E8FC4"/><path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" stroke="#5FAEDF" stroke-width="2"/><path d="M8 46H74L84 52L74 60H14Z" fill="#E8746B" stroke="#2D4763" stroke-width="3"/><path d="M22 48l6 5M32 48l6 5M42 48l6 5" stroke="#2D4763" stroke-width="3"/><path d="M72 52l-9-9 4-2-5-7 9 4 1-6 4 8 6-2-3 7 7 3-7 3" fill="#fff"/><circle cx="72" cy="52" r="7" fill="#2D4763"/><circle cx="70" cy="50" r="2" fill="#fff"/><path d="M14 82l8-8M22 82l-8-8" stroke="#2D4763" stroke-width="4" stroke-linecap="round"/></svg>`,
  init:n=>({sh:Array(n).fill('.'.repeat(64)),rd:0,last:'',rep:[],ls:[],vr:n===2?SEAV:0}),
  // bots keep the random fleet they are dealt, so a game against bots only waits for the people
  privInit:(d,r)=>{const s=d.pl.indexOf(r);return {f:randFleet(),ready:s>=0&&isBot(d,s)};},
  canAct:(d,pr)=>allReady(d,pr),
  // two players take turns and a hit shoots again; three or more fire together, one shot for every ship still afloat
  simulNow:d=>seaSalvo(d)&&allReady(d,S.priv),
  /* online, the others see a fleet only as «ready» plus the ships already sunk and how many still float (all of it once its owner is out
     or the game ends); a salvo stays secret until the round lands (only «picked»). Shots are checked on the host */
  privShow:(d,seat,role,p,own)=>{const s=d.pl.indexOf(role);if(own||d.win!=null)return p;
    // a fleet that is all gone is shown whole; a salvo of this round never is
    if(s<0||d.out[s]==='1'||typeof p.f!=='string')return p.pick!=null&&p.rd===d.rd?{...p,pick:1}:p;
    const sh=d.sh[s]||'',f=[...p.f],sunk=L=>f.every((c,k)=>c!==L||sh[k]==='o');
    return {gid:p.gid,ready:!!p.ready,f:f.map(c=>c!=='.'&&sunk(c)?c:'.').join(''),af:seaAfloat(p.f,sh),...(p.rd!=null?{rd:p.rd}:{}),...(p.pick!=null?{pick:1}:{})};},
  // a fleet is five whole ships, and it stays as it was once its owner said ready; a salvo is a short list of cells
  privOk:(d,r,o,p)=>typeof p.f==='string'&&/^[.a-e]{64}$/.test(p.f)&&SHIPS.every((L,k)=>p.f.split(SL[k]).length-1===L)&&!(o&&o.gid===d.gid&&o.ready&&(!p.ready||o.f!==p.f))&&
    (p.pick==null||p.pick==='~'||Array.isArray(p.pick)&&p.pick.length<=SHIPS.length&&p.pick.every(x=>Array.isArray(x)&&x.length===2&&x.every(Number.isInteger))),
  net:{host:['fire','gone'],local:['tgt','aim','salvo','ed','rot','shuffle','ready']},
  // online, time ran out while placing ships: fleets laid out so far are locked in, and a seat with no fleet at all (its player never came) is out.
  // On one phone everybody is here, so nobody is pushed: the turn just moves on (a bot's turn passes to the people, see 'ready')
  onTimeout(d){const pr=S.priv;if(S.mode!=='online'||allReady(d,pr))return {...d,turn:nextSeat(d,d.turn)};let out=d.out;
    d.pl.forEach((r,s)=>{const p=pr[r];if(!(p&&p.gid===d.gid&&p.f))out=setAt(out,s,'1');});const al=aliveSeats(d,out);
    return {...d,auto:1,out,win:al.length===1?al[0]:al.length?null:'d',turn:out[d.turn]==='1'?nextSeat(d,d.turn,out):d.turn};},
  viewer(d,pr){if(d.win!=null)return null;for(let s=0;s<d.pl.length;s++)if(d.out[s]!=='1'&&!seaReady(pr[d.pl[s]],d))return s;return seaSalvo(d)?simulViewer(d):d.turn;},
  coverMsg:d=>d.last||'',
  status(d,ctx){const pr=ctx.priv;
    if(!allReady(d,pr)){const rd=d.pl.filter((r,s)=>seaReady(pr[r],d)).length;
      if(ctx.local)return `${nameTag(d,ctx.v)}: رتّب سفنك واضغط جاهز`;
      const al=aliveSeats(d),gone=seaGone(d,pr);
      return (ctx.v>=0&&seaReady(pr[d.pl[ctx.v]],d)?'بانتظار الباقين يجهّزون سفنهم':'رتّب سفنك: اضغط على سفينة ثم على مكان جديد، أو دوّرها')+`<br><small>جاهز ${al.filter(s=>seaReady(pr[d.pl[s]],d)).length} من ${al.length}</small>`+
        (gone.length?`<br><span class="gone">${gone.map(x=>nm(d,x)).join('، ')} طلع <button class="sm" data-ga="gone">تخطّاه</button></span>`:'');}
    if(seaSalvo(d))return (d.last?`<small>${d.last}</small><br>`:'')+`الجولة ${d.rd+1}: الكل يطلق مع بعض`;
    return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  winExtra:d=>d.last||'',
  after(d){const k=d.gid+':'+(d.sn||0)+':'+d.rd;if(!d.ls||!d.ls.length||!once('seasnd'+k))return;let hit=false,sink=false;
    for(const [o,i] of d.ls){const f=seaFleet(d,o);if(f&&f[i]!=='.'){hit=true;if(seaSunk(f,d.sh[o]).has(f[i]))sink=true;}}
    seaSound(sink?'boom':hit?'hit':'splash');if(hit)setTimeout(()=>buzz(),420);},
  render(d,ctx){
    const pr=ctx.priv;const v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    if(v==null||v<0){const o=d.win!=null&&typeof d.win==='number'?d.win:d.turn;return `<p class="lbl">بحر ${nm(d,o)}</p>${seaGrid(seaFleet(d,o,pr),d.sh[o],d.win!=null,false)}`;}
    const mine=pr[d.pl[v]];if(!mine||mine.gid!==d.gid)return '<p class="note">جاري التجهيز…</p>';
    if(!allReady(d,pr)){
      if(seaReady(mine,d))return `${seaVrSeg(d,ctx)}<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false)}<p class="hint">جاهز ✓ ننتظر الباقين</p>`;
      return `${seaVrSeg(d,ctx)}<p class="lbl">رتّب سفنك (${SHIPS.length} سفن)</p>${seaGrid(mine.f,d.sh[v],true,'ed')}
        <div class="acts"><button class="btn navy" data-ga="rot" ${S.seaSel?'':'disabled'}>🔄 تدوير</button><button class="btn navy" data-ga="shuffle">🔀 عشوائي</button><button class="btn red" data-ga="ready">جاهز ✓</button></div>`;}
    const rep=d.rep&&d.rep.length?`<div class="srep">${d.rep.map(x=>`<p>${x}</p>`).join('')}</div>`:'';
    if(seaSalvo(d)){const dead=d.out[v]==='1';const k=dead?0:seaAfloat(mine.f,d.sh[v]);const marks=(S.salvo&&S.salvo.k===d.gid+':'+d.rd?S.salvo.l:[]);
      const o=curTarget(d,v);if(o==null)return rep;const picked=hasPicked(d,v);const can=ctx.my&&!picked&&!dead&&d.win==null;
      const om=marks.filter(m=>m[0]===o).map(m=>m[1]);const flash=(d.ls||[]).filter(x=>x[0]===o).map(x=>x[1]);
      let s=rep+tabsHTML(d,v,can?'اختار بحر وحط طلقاتك':'بحور الباقين');
      s+=`<p class="lbl">بحر ${nameTag(d,o)} <small>(${seaLeft(d,o,pr)} سفن باقية)</small></p>${seaGrid(seaFleet(d,o,pr),d.sh[o],d.win!=null||d.out[o]==='1',can?'aim':false,false,om,flash,d.gid+':'+d.rd+':'+o)}`;
      if(can)s+=`<div class="sbar"><span>🎯 ${marks.length} من ${k} طلقات</span><button class="btn red" data-ga="salvo" ${marks.length?'':'disabled'}>أطلق 🚀</button></div>`;
      else if(picked&&d.win==null)s+='<p class="hint">✓ أطلقت، ننتظر الباقين</p>';
      else if(dead)s+='<p class="note">غرقت سفنك، تقدر تتفرج</p>';
      return s+`<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false,true,null,(d.ls||[]).filter(x=>x[0]===v).map(x=>x[1]),d.gid+':'+d.rd+':'+v)}`;}
    const myTurn=ctx.my&&d.turn===v;const o=curTarget(d,v);if(o==null)return '';
    const lso=(d.ls||[]).filter(x=>x[0]===o).map(x=>x[1]),lsv=(d.ls||[]).filter(x=>x[0]===v).map(x=>x[1]);const k2=d.gid+':'+(d.sn||0);
    return `${tabsHTML(d,v,myTurn?'اختر مين تضرب':'شوف بحور الباقين')}<p class="lbl">بحر ${nameTag(d,o)}</p>${seaGrid(seaFleet(d,o,pr),d.sh[o],d.win!=null||d.out[o]==='1',myTurn&&d.out[v]!=='1'?'fire':false,false,null,lso,k2+':'+o)}<p class="lbl">بحرك</p>${seaGrid(mine.f,d.sh[v],true,false,true,null,lsv,k2+':'+v)}`;
  },
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;S.gw=false;render();return;}
    if(a==='gone'){const g=seaGone(d,S.priv);if(!g.length)return;let out=d.out;for(const s of g)out=setAt(out,s,'1');const al=aliveSeats(d,out);act({...d,out,win:al.length===1?al[0]:null});return;}
    const v=ctx.v;if(v==null||v<0)return;const r=d.pl[v];const p=S.priv[r];
    if(a==='vr'){if(d.pl.length!==2||allReady(d,S.priv)||d.rd||/[ox]/.test(d.sh.join('')))return;SEAV=i?1:0;act({...d,vr:SEAV});return;}
    if(['shuffle','ready','ed','rot'].includes(a)){if(!p||seaReady(p,d))return;
      if(a==='shuffle'){S.seaSel=null;setPriv(r,{...p,f:randFleet()});return;}
      if(a==='ready'){S.seaSel=null;setPriv(r,{...p,ready:true});
        // with bots on one phone the screen follows the turn: pass it to the next person still placing ships, then back to the starter
        if(ctx.bots){const nx=humanSeats(d).find(s=>!seaReady(S.priv[d.pl[s]],d));const tu=nx!=null?nx:d.st;if(tu!==d.turn)act({...d,turn:tu});}return;}
      if(a==='ed'){const c=p.f[i];if(c!=='.'){S.seaSel=S.seaSel===c?null:c;render();return;}if(!S.seaSel)return;const {hz}=seaShip(p.f,S.seaSel);
        const nf=seaPlace(p.f,S.seaSel,i,hz);if(!nf){toast('ما تنحط هنا، لازم تبعد عن السفن الثانية');return;}setPriv(r,{...p,f:nf});return;}
      if(a==='rot'&&S.seaSel){const {head,hz}=seaShip(p.f,S.seaSel);const nf=seaPlace(p.f,S.seaSel,head,!hz);if(!nf){toast('ما تقدر تدورها هنا');return;}setPriv(r,{...p,f:nf});return;}
      return;}
    if(seaSalvo(d)){if(!ctx.my||hasPicked(d,v))return;const key=d.gid+':'+d.rd;if(!S.salvo||S.salvo.k!==key)S.salvo={k:key,l:[]};
      if(a==='aim'){const o=curTarget(d,v);if(o==null)return;const k=seaAfloat(p.f,d.sh[v]);const at=S.salvo.l.findIndex(m=>m[0]===o&&m[1]===i);
        if(at>=0)S.salvo.l.splice(at,1);else if(S.salvo.l.length<k)S.salvo.l.push([o,i]);else toast(`عندك ${k} طلقات بس`);render();return;}
      if(a==='salvo'&&S.salvo.l.length){const l=S.salvo.l;S.salvo=null;simulPick(d,v,l);}return;}
    if(!ctx.my)return;const t=d.turn,o=curTarget(d,t);if(o==null)return;const f=seaFleet(d,o);
    if(!f){toast('انتظر اللاعب');return;}if(d.sh[o][i]!=='.')return;
    const hit=f[i]!=='.';const sh=[...d.sh];sh[o]=setAt(sh[o],i,hit?'o':'x');let last,win=null,out=d.out;
    if(hit){const L=f[i];const sunk=[...f].every((c,k)=>c!==L||sh[o][k]==='o');last=`أصاب ${nm(d,o)}`+(sunk?' وأغرق سفينة! 💥':'! 🎯')+' ويضرب مرة ثانية';
      if(seaDead(f,sh[o])){out=setAt(out,o,'1');last=`أغرق كل سفن ${nm(d,o)}!`;const al=aliveSeats(d,out);if(al.length===1)win=al[0];}}
    else last=`ضرب بحر ${nm(d,o)} وطاحت في الماء 💦`;
    act({...d,sh,out,last:`${nm(d,t)}: ${last}`,ls:[[o,i]],sn:(d.sn||0)+1,turn:hit?t:nextSeat(d,t,out),win});
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
// more people: each game puts 24 of them on the board (12 men, 12 women), so the faces change from game to game
const MN2=['عبدالله','محمد','فيصل','نواف','راشد','مشاري','سعود','حسن','وليد','طلال','هشام','سامي','عادل','منصور','جاسم','عمار','ياسر','حمزة'],
  FN2=['منى','أمل','هيا','غادة','بشاير','العنود','ليلى','أسماء','سلمى','رنا','وعد','جواهر','لولوة','دلال','شيماء','حنان','مريم','فاطمة'];
const HC={black:'#2B2B2B',brown:'#7A4A2A',blond:'#E8C15A',red:'#C8512E',gray:'#B9B9B9'};
const SKIN=['#F6D6B8','#EBC09A','#C9905F','#8E5B3A'],SHIRTS=[['#4CB97F','أخضر'],['#F2A93B','برتقالي'],['#9C7BD6','بنفسجي'],['#4AB1E8','أزرق'],['#E8574E','أحمر'],['#3D5A80','كحلي']],HIJ=['#3D5A80','#9C7BD6','#2D4763','#C76A8A','#5C8D89','#A0522D'];
const CARDBG=['#FDECEA','#E8F4FD','#EAF7EF','#FFF6DD','#F1ECFA','#FDEFE4'],CAPC=['#2D4763','#E5483F','#2F7F86','#F0B429'];
const PEOPLE=(()=>{const R=mulberry(20261113);const pick=a=>a[Math.floor(R()*a.length)];const out=[];const seen=new Set();
  const make=(m,name)=>{for(let k=0;k<400;k++){const sh=pick(SHIRTS);const p={m,name,gl:R()<.3,sm:R()<.5,sk:pick(SKIN),shirt:sh[0],shn:sh[1],bg:pick(CARDBG)};
      if(m){p.sh=R()<.28;p.cap=!p.sh&&R()<.25;p.hj=false;p.hair=p.sh?'none':pick(['black','brown','blond','red','gray','bald','black']);if(p.cap&&p.hair==='bald')p.hair='black';p.hs=pick(['short','curly','spiky']);p.bd=R()<.4;p.mu=p.bd||R()<.35;p.er=false;p.capc=pick(CAPC);}
      else{p.hj=R()<.35;p.sh=false;p.cap=false;p.hair=p.hj?'none':pick(['black','brown','blond','red','gray']);p.hs=p.hj?'none':pick(['long','bob','bun','long']);p.bd=false;p.mu=false;p.er=!p.hj&&R()<.5;p.hjc=pick(HIJ);}
      const sig=[p.m,p.gl,p.sm,p.sh,p.cap,p.hj,p.hair,p.hs==='long',p.bd,p.mu,p.er,p.shn].join();if(!seen.has(sig)){seen.add(sig);return p;}}};
  for(let i=0;i<12;i++){out.push(make(true,MN[i]));out.push(make(false,FN[i]));}
  for(let i=0;i<MN2.length;i++){out.push(make(true,MN2[i]));out.push(make(false,FN2[i]));}return out.filter(Boolean);})();
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
const FACES=[];// drawn when first needed
const faceOf=k=>FACES[k]||(FACES[k]=faceSVG(PEOPLE[k]));
const QS=[['رجل',p=>p.m,0],['امرأة',p=>!p.m,0],['مبتسم',p=>p.sm,0],['نظارة',p=>p.gl,0],['حلق',p=>p.er,0],
  ['شماغ',p=>p.sh,1],['حجاب',p=>p.hj,1],['كاب',p=>p.cap,1],['أصلع',p=>p.hair==='bald',1],['شعر طويل',p=>p.hs==='long',1],['لحية',p=>p.bd,1],['شنب',p=>p.mu,1],
  ['شعر أسود',p=>p.hair==='black',2],['شعر بني',p=>p.hair==='brown',2],['شعر أشقر',p=>p.hair==='blond',2],['شعر أحمر',p=>p.hair==='red',2],['شعر رمادي',p=>p.hair==='gray',2],
  ...SHIRTS.map(([c,n])=>['لبس '+n,p=>p.shn===n,3,c])];
const QCAT=['الشخص','الرأس والوجه','لون الشعر','لون اللبس'];
/* the animals deck: what each one is (m mammal, b bird, r reptile, i insect), how it lives (f flies, w lives in the sea and never
   leaves it, l four legs), e eats meat or other animals, g heavier than a person, h horns, d people raise it, o lays eggs, z black and white */
const ANIM=[['أسد','🦁','melgx'],['نمر','🐅','melgs'],['فيل','🐘','mlgk'],['زرافة','🦒','mlghu'],['حمار وحشي','🦓','mlgzs'],['دب','🐻','melg'],['باندا','🐼','mlgz'],
  ['جمل','🐪','mlgdy'],['حصان','🐎','mlgd'],['ثور','🐂','mlghd'],['ماعز','🐐','mlhd'],['خروف','🐑','mldp'],['قطة','🐈','meld'],['كلب','🐕','meldj'],['أرنب','🐇','mld'],
  ['قنفذ','🦔','melq'],['حوت','🐳','mwegt'],['دلفين','🐬','mweg'],['ثعلب','🦊','melj'],['فرس النهر','🦛','mlg'],['وحيد القرن','🦏','mlgh'],['كوالا','🐨','ml'],
  ['نسر','🦅','bfeo'],['بومة','🦉','bfeon'],['ببغاء','🦜','bfdov'],['بطريق','🐧','beoz'],['حمامة','🕊️','bfdo'],['تمساح','🐊','relgo'],['ثعبان','🐍','reo'],['ضفدع','🐸','elo'],
  ['نحلة','🐝','ifdos'],['فراشة','🦋','ifo'],['دعسوقة','🐞','ifeo'],['عقرب','🦂','e'],['عنكبوت','🕷️','eo'],['أخطبوط','🐙','weo'],['حلزون','🐌','o']].map(([name,em,f],k)=>({name,em,f,bg:CARDBG[k%CARDBG.length]}));
// the last group is one marked trait each (a trunk, a hump, a mane…), so every animal on the board can be told apart
const AQS=[['ثديي',0,'m'],['طائر',0,'b'],['زاحف',0,'r'],['حشرة',0,'i'],['يطير',1,'f'],['يعيش في البحر وما يطلع منه',1,'w'],['عنده أربع أرجل',1,'l'],
  ['ياكل لحم أو حيوانات',2,'e'],['أثقل من الإنسان',2,'g'],['أكبر من الباص',2,'t'],['له قرون',3,'h'],['الناس يربّونه',3,'d'],['يبيض',3,'o'],['لونه أبيض وأسود',3,'z'],['عليه خطوط',3,'s'],
  ['له خرطوم',4,'k'],['أطول حيوان في العالم',4,'u'],['عنده سنام',4,'y'],['له لبدة حول راسه',4,'x'],['له صوف',4,'p'],['جسمه شوك',4,'q'],['يقدر يلف راسه لورا',4,'n'],['يقلّد كلام الناس',4,'v'],['ينبح',4,'j']].map(([t,c,k])=>[t,a=>a.f.includes(k),c]);
const ACAT=['النوع','الحركة والمكان','الأكل والحجم','صفات ثانية','علامات مميزة'];
const animSVG=a=>`<svg viewBox="0 0 60 66"><rect width="60" height="66" fill="${a.bg}"/><circle cx="30" cy="70" r="34" fill="#fff" opacity=".45"/><text x="30" y="44" font-size="34" text-anchor="middle">${a.em}</text></svg>`;
// deck 0 people, 1 animals; d.bd lists the 24 on the board (old games without it: the first 24 people)
const GDK=[{n:'أشخاص',it:PEOPLE,Q:QS,cat:QCAT,face:k=>faceOf(k),ask:'هل شخصية',ttl:'شخصية',sec:'شخصيتك السرية',it2:'يعرفونها'},{n:'حيوانات',it:ANIM,Q:AQS,cat:ACAT,face:k=>animSVG(ANIM[k]),ask:'هل حيوان',ttl:'حيوان',sec:'حيوانك السري',it2:'يعرفونه'}];
const gDeck=d=>GDK[d.dk]||GDK[0];
const gItem=(d,k)=>gDeck(d).it[d.bd?d.bd[k]:k];
function gBoard(dk){if(dk===1)return shuffle([...ANIM.keys()]).slice(0,24);const m=[],f=[];PEOPLE.forEach((p,k)=>(p.m?m:f).push(k));return shuffle([...shuffle(m).slice(0,12),...shuffle(f).slice(0,12)]);}
const pc=(d,i,cls,attrs)=>{const it=gItem(d,i),k=d.bd?d.bd[i]:i;return `<${attrs?'button':'div'} class="pc ${cls}" ${attrs||''}><div class="fr">${gDeck(d).face(k)}<b>${it.name}</b></div><div class="bk"><span>؟</span><b>${it.name}</b></div></${attrs?'button':'div'}>`;};
const elSeg=(d,a,t)=>d.el[a].slice(t*24,t*24+24);
let GSV=0;// the last deck chosen on this phone, kept for the next rounds
GAMES.guess={name:'خمّن الشخص',cat:'mind',lbc:'#6E4C8B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7B4FA0"/>${[[4,4,0],[36,4,1],[68,4,2],[4,36,3],[36,36,4],[68,36,6],[4,68,9],[36,68,10],[68,68,13]].map(([x,y,k])=>`<g transform="translate(${x} ${y}) scale(.47)"><rect width="60" height="66" rx="8" fill="#fff"/>${faceOf(k).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</g>`).join('')}</svg>`,
  // the secret (sec) is a place on the board, 0 to 23, so choosing the deck never touches it
  init:n=>({el:Array(n).fill('0'.repeat(24*n)),last:'',qa:[],dk:GSV,bd:gBoard(GSV)}),
  privInit:()=>({sec:rnd(24)}),
  // online, the secret people stay with the host and their owners: questions and guesses are answered on the host
  net:{host:['ask','guess','dk'],local:['tgt','gmode']},privOk:()=>false,
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status(d,ctx){return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  winExtra(d,ctx){const p=ctx.priv;return `${d.last}<br>`+d.pl.map((r,s)=>`${nm(d,s)}: ${p[r]&&p[r].gid===d.gid&&p[r].sec>=0&&p[r].sec<24?gItem(d,p[r].sec).name:'؟'}`).join('، ');},
  render(d,ctx){
    let v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;
    const spect=v<0;if(spect)v=d.turn;
    const mine=ctx.priv[d.pl[v]];const myTurn=ctx.my&&d.turn===v;const gm=myTurn&&S.gw;
    const o=curTarget(d,v);if(o==null)return '';
    const D=gDeck(d),fresh=!(d.qa||[]).length&&d.out.indexOf('1')<0&&d.win==null&&!ctx.bot;
    let s=fresh?`<div class="segs tttv">${GDK.map((x,k)=>`<button class="seg ${k===(d.dk||0)?'on':''}" data-ga="dk" data-i="${k}" ${myTurn?'':'disabled'}>${k?'🐾 ':'🙂 '}${x.n}</button>`).join('')}</div>`:'';
    s+=!spect&&mine&&mine.gid===d.gid?`<div class="secret">${pc(d,mine.sec,'')}<div><b>${D.sec}: ${gItem(d,mine.sec).name}</b><br><small class="note">الباقين يحاولون ${D.it2}</small></div></div>`:'';
    s+=tabsHTML(d,v,myTurn?'اختر مين تسأل عنه':'لوحتك عن كل لاعب');
    const el=elSeg(d,v,o);const left=[...el].filter(c=>c==='0').length;
    const key=d.gid+'_'+v+'_'+o;S.gPrev=S.gPrev||{};const prev=S.gPrev[key]||el;S.gPrev[key]=el;
    s+=`<div class="gwh"><span>${D.ttl} ${nameTag(d,o)}</span><b>باقي ${left} من 24</b></div>`;
    if(gm)s+=`<p class="hint" style="text-align:center">اضغط على الشخص اللي تتوقعه (لو غلطت تطلع من الجولة)</p>`;
    s+=`<div class="gw ${gm?'gm':''} ${d.dk===1?'an':''}">${[...Array(24).keys()].map(i=>{const out=el[i]==='1';const nw=out&&prev[i]!=='1'?' flip':'';return gm&&!out?pc(d,i,'pick',`data-ga="guess" data-i="${i}"`):pc(d,i,(out?'out':'')+nw);}).join('')}</div>`;
    const log=(d.qa||[]).filter(q=>q[0]===v&&q[1]===o);
    if(log.length)s+=`<div class="qlog">${log.map(q=>`<span class="${q[3]?'y':'n'}">${(D.Q[q[2]]||['؟'])[0]}؟ ${q[3]?'✓':'✗'}</span>`).join('')}</div>`;
    if(myTurn){
      if(gm)s+=`<div class="acts"><button class="btn navy" data-ga="gmode">رجوع للأسئلة</button></div>`;
      else{const rem=[...Array(24).keys()].filter(i=>el[i]==='0').map(i=>gItem(d,i));
        s+=`<p class="lbl" style="text-align:center">اسأل: ${D.ask} ${nm(d,o)}${d.dk===1?'…':' فيها…'}</p>`+D.cat.map((cn,ci)=>{const qs=D.Q.map((q,k)=>[q,k]).filter(([q])=>q[2]===ci);
          return `<div class="qcat"><small>${cn}</small><div class="qs">${qs.map(([q,k])=>{const y=rem.filter(q[1]).length;const useful=y>0&&y<rem.length;return `<button class="q" data-ga="ask" data-i="${k}" ${useful?'':'disabled'}>${q[3]?`<i style="background:${q[3]}"></i>`:''}${q[0]}؟</button>`;}).join('')}</div></div>`;}).join('')+
          `<div class="acts"><button class="btn red" data-ga="gmode">🎯 أعرفه! أبي أخمّن</button></div>`;}
    }
    return s;
  },
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;S.gw=false;render();return;}
    if(a==='gmode'){S.gw=!S.gw;render();return;}
    if(!ctx.my)return;
    if(a==='dk'){if((d.qa||[]).length||!GDK[i])return;GSV=i;act({...d,dk:i,bd:gBoard(i),last:''});return;}const t=d.turn,o=curTarget(d,t);if(o==null)return;const op=S.priv[d.pl[o]];
    if(!op||op.gid!==d.gid){toast('انتظر اللاعب');return;}
    const P=gItem(d,op.sec),D=gDeck(d);
    if(a==='ask'){if(!D.Q[i])return;const f=D.Q[i][1];const ans=!!f(P);const el=[...d.el];const seg=[...elSeg(d,t,o)].map((c,k)=>c==='1'||!!f(gItem(d,k))!==ans?'1':'0').join('');
      el[t]=el[t].slice(0,o*24)+seg+el[t].slice(o*24+24);const qa=[...(d.qa||[]),[t,o,i,ans?1:0]].slice(-60);
      act({...d,el,qa,turn:nextSeat(d,t),last:`${nm(d,t)} سأل عن ${nm(d,o)}: «${D.Q[i][0]}؟» والجواب ${ans?'نعم ✓':'لا ✗'}`});}
    else if(a==='guess'&&S.gw){S.gw=false;const right=i===op.sec;const out=setAt(d.out,right?o:t,'1');const al=aliveSeats(d,out);
      act({...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),
        last:right?`${nm(d,t)} عرف ${D.ttl} ${nm(d,o)}: ${P.name} 🎉`:`${nm(d,t)} خمّن ${gItem(d,i).name} لـ${nm(d,o)} وطلع غلط`});}
  }
};


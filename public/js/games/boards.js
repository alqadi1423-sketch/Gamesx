'use strict';
/* board games: connect four, five in a row, treasure hunt, minesweeper party */

function lineWinRC(b,R,C,k){
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const v=b[r*C+c];if(v==='.')continue;
    for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[];
      for(let j=0;j<k;j++){const rr=r+dr*j,cc=c+dc*j;if(rr<0||rr>=R||cc<0||cc>=C||b[rr*C+cc]!==v)break;cells.push(rr*C+cc);}
      if(cells.length===k)return {w:+v,ln:cells};}}
  return null;
}
const disc=(c,hl)=>`<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${c}" stroke="${hl?'#ffd84d':'rgba(0,0,0,.18)'}" stroke-width="${hl?5:2}"/></svg>`;
// the winner by points; with teams the team totals decide (a negative entry means that seat cannot win)
const mostPts=pts=>{const d=S.st.d,G=GAMES[S.st.g];
  if(d&&d.tm&&d.tm.length===pts.length&&G&&G.teams!=='native'){const tot={};pts.forEach((x,s)=>{if(x<0)return;const t=d.tm[s];tot[t]=(tot[t]||0)+x;});
    const ts=Object.keys(tot).map(Number);if(!ts.length)return 'd';const mx=Math.max(...ts.map(t=>tot[t]));const top=ts.filter(t=>tot[t]===mx);
    return top.length===1?d.tm.indexOf(top[0]):'d';}
  const mx=Math.max(...pts);const top=pts.map((x,s)=>x===mx?s:-1).filter(s=>s>=0);return top.length===1?top[0]:'d';};
const ptsBadges=()=>'';

/* ---------- connect four ---------- */
const CF={2:[7,6],3:[8,7],4:[9,7],5:[10,8],6:[11,8],7:[12,9],8:[12,9]};
GAMES.c4={name:'أربعة في صف',cat:'board',lbc:'#2F6FB5',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3A7FCB"/>${[0,1,2,3].map(r=>[0,1,2,3].map(c=>{const k=(r*4+c)%5;const f=r<1?'#2a5f9c':k===0||k===3?'#EC6158':k===1?'#F2C14E':'#2a5f9c';return `<circle cx="${17+c*22}" cy="${17+r*22}" r="8.5" fill="${f}"/>`;}).join('')).join('')}</svg>`,
  init:n=>{const [C,R]=CF[n]||[12,9];return {C,R,b:'.'.repeat(C*R),ln:null};},
  status:(d,ctx)=>turnTxt(d,ctx),
  render(d,ctx){const {C,R}=d,lm=d.ln?-1:bdLast('c4',d,d.b);
    // where a disc dropped in each column would land: shown as a soft ghost while it is your turn
    const nx=new Set();if(ctx.my)for(let c=0;c<C;c++){let r=R-1;while(r>=0&&d.b[r*C+c]!=='.')r--;if(r>=0)nx.add(r*C+c);}
    return `<div class="cellgrid bd-c4" style="grid-template-columns:repeat(${C},minmax(0,1fr));gap:${C>9?3:4}px;--c:${col(d,d.turn)}">${[...d.b].map((v,i)=>{const c=i%C;
      return `<button class="cg ${nx.has(i)?'nx':''}" data-ga="m" data-i="${c}" ${ctx.my&&d.b[c]==='.'?'':'disabled'}>${v==='.'?'<i class="hole"></i>':`<i class="dk ${d.ln&&d.ln.includes(i)?'won':''} ${i===lm?'lm':''}" style="--c:${col(d,+v)};--r:${(i-c)/C+1}"></i>`}</button>`;}).join('')}</div>`;},
  click(a,c,d,ctx){
    if(!ctx.my)return;const {C,R}=d;let r=R-1;while(r>=0&&d.b[r*C+c]!=='.')r--;if(r<0)return;
    const b=setAt(d.b,r*C+c,String(d.turn));const w=lineWinRC(b,R,C,4);
    act({...d,b,ln:w?w.ln:null,win:w?w.w:(b.includes('.')?null:'d'),turn:nextSeat(d,d.turn)});
  }
};

/* ---------- five in a row ---------- */
const GMS={2:11,3:13,4:13,5:15,6:15,7:15,8:15};
GAMES.gomoku={name:'خمسة على التوالي',cat:'board',lbc:'#9A6B3C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E9C48F"/>${[1,2,3,4,5,6,7,8].map(k=>`<path d="M${k*11} 4V96M4 ${k*11}H96" stroke="#9A6B3C" stroke-width="1.5"/>`).join('')}${[[2,2],[3,3],[4,4],[5,5],[6,6]].map(([x,y])=>`<circle cx="${x*11}" cy="${y*11}" r="4.6" fill="#2D4763"/>`).join('')}${[[3,5],[4,6],[6,3],[2,6]].map(([x,y])=>`<circle cx="${x*11}" cy="${y*11}" r="4.6" fill="#EC6158"/>`).join('')}</svg>`,
  init:n=>{const z=GMS[n]||15;return {z,b:'.'.repeat(z*z),ln:null};},
  status:(d,ctx)=>turnTxt(d,ctx),
  render(d,ctx){const z=d.z,lm=d.ln?-1:bdLast('gomoku',d,d.b),e=3,m=z-4,h=(z-1)/2;
    // star points, as on a real board: the centre and the four 4-4 points
    const star=new Set([[e,e],[e,m],[m,e],[m,m],[h,h]].map(([r,c])=>r*z+c));
    return `<div class="cellgrid bd-gm ${ctx.my?'my':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr));--z:${z};--c:${col(d,d.turn)}">${[...d.b].map((v,i)=>
      `<button class="cg ${star.has(i)?'hs':''}" data-ga="m" data-i="${i}" ${ctx.my&&v==='.'?'':'disabled'}>${v==='.'?'':`<i class="st ${d.ln&&d.ln.includes(i)?'won':''} ${i===lm?'lm':''}" style="--c:${col(d,+v)}"></i>`}</button>`).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.b[i]!=='.')return;const b=setAt(d.b,i,String(d.turn));const w=lineWinRC(b,d.z,d.z,5);
    act({...d,b,ln:w?w.ln:null,win:w?w.w:(b.includes('.')?null:'d'),turn:nextSeat(d,d.turn)});
  }
};

/* ---------- treasure hunt ---------- */
const TRS={2:6,3:7,4:7,5:8,6:8,7:8,8:8};
const heat=k=>['#E8473E','#F07A3C','#F2A93B','#E9CD52','#B7D36A','#7FC8A9','#6BB2DA','#5A8FD0','#5872B8','#555A99'][Math.min(k,9)];
GAMES.treasure={name:'الكنز المدفون',cat:'mind',lbc:'#B07B2A',
  icon:iconE('#E6B65C','💰','rgba(255,255,255,.35)'),
  // the treasure is not placed in advance: each dig draws its spot from the cells that still fit every clue, so it is never in the shared state
  init:n=>{const z=TRS[n]||8;return {z,o:'.'.repeat(z*z),by:'.'.repeat(z*z),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const z=d.z,lm=bdLast('treasure',d,d.o);
    return `<div class="cellgrid bd-tr ${ctx.my?'my':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr))">${[...d.o].map((v,i)=>{
      if(v==='.')return `<button class="cg sand" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}></button>`;
      if(v==='*')return `<div class="cg gold"><span>💰</span></div>`;
      const k=v.charCodeAt(0)-97;return `<div class="cg dug ${i===lm?'lm':''}" style="--h:${heat(k)};--c:${col(d,+d.by[i])}"><b>${k}</b><i></i></div>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.o[i]!=='.')return;const z=d.z,t=d.turn,far=(a,b)=>Math.abs(Math.floor(a/z)-Math.floor(b/z))+Math.abs(a%z-b%z);
    let tc=d.t;if(tc==null){const ok=[];for(let j=0;j<z*z;j++)if(d.o[j]==='.'&&[...d.o].every((v,c)=>v<'a'||far(j,c)===v.charCodeAt(0)-97))ok.push(j);tc=ok.length?ok[rnd(ok.length)]:i;}
    if(i===tc){act({...d,o:setAt(d.o,i,'*'),by:setAt(d.by,i,String(t)),win:t,last:`${nm(d,t)} لقى الكنز!`});return;}
    const k=far(i,tc);
    act({...d,o:setAt(d.o,i,String.fromCharCode(97+k)),by:setAt(d.by,i,String(t)),turn:nextSeat(d,t),last:`${nm(d,t)} حفر وطلع الكنز يبعد ${k} خطوات`});
  }
};

/* ---------- minesweeper party ---------- */
const MINE='<svg viewBox="0 0 40 40" class="mi"><path d="M20 7v6M20 31v6M7 22h6M27 22h6M11 13l4 4M25 27l4 4M11 31l4-4M25 17l4-4" stroke="#2B333D" stroke-width="3.2" stroke-linecap="round"/><circle cx="20" cy="22" r="10" fill="#2B333D"/><circle cx="16.4" cy="18.4" r="3.2" fill="#fff" opacity=".6"/></svg>';
const MNS={2:[8,10],3:[9,13],4:[9,14],5:[10,17],6:[10,18],7:[10,19],8:[10,20]};
function mineCount(m,z,i){const r=Math.floor(i/z),c=i%z;let n=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if((dr||dc)&&rr>=0&&rr<z&&cc>=0&&cc<z&&m[rr*z+cc]==='1')n++;}return n;}
GAMES.mines={name:'حقل الألغام',cat:'mind',lbc:'#4E6A57',
  icon:iconE('#6E8F77','💣','rgba(255,255,255,.3)'),
  init:n=>{const [z,k]=MNS[n]||[10,20];const m=Array(z*z).fill('0');let p=0;while(p<k){const i=rnd(z*z);if(m[i]==='0'){m[i]='1';p++;}}
    return {z,m:m.join(''),rv:'.'.repeat(z*z),k:'.'.repeat(z*z),pts:Array(n).fill(0),last:''};},
  // online, the mines stay with the host until the end: the others see only opened cells and their counts (k)
  mask:(d,seat)=>d.win!=null?d:{...d,m:[...d.m].map((c,i)=>d.rv[i]!=='.'?c:'?').join('')},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const z=d.z,end=d.win!=null;
    return `<div class="cellgrid bd-mn ${ctx.my?'my':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr))">${[...d.rv].map((v,i)=>{
      if(v==='.')return `<button class="cg tile ${end&&d.m[i]==='1'?'mine':''}" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}>${end&&d.m[i]==='1'?MINE:''}</button>`;
      if(d.m[i]==='1')return `<div class="cg boom" style="--c:${col(d,+v)}">${MINE}</div>`;
      const k=d.k&&d.k[i]!=='.'?+d.k[i]:mineCount(d.m,z,i);return `<div class="cg open n${k}" style="--l:${lit(d,+v)}">${k||''}</div>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.rv[i]!=='.')return;const z=d.z,t=d.turn,ts=String(t);let rv=d.rv,out=d.out,kk=d.k||'.'.repeat(z*z);const pts=[...d.pts];let last;
    if(d.m[i]==='1'){rv=setAt(rv,i,ts);out=setAt(out,t,'1');last=`${nm(d,t)} داس على لغم وطلع 💥`;}
    else{const st=[i];let got=0;while(st.length){const k=st.pop();if(rv[k]!=='.'||d.m[k]==='1')continue;rv=setAt(rv,k,ts);got++;const mc=mineCount(d.m,z,k);kk=setAt(kk,k,String(mc));
        if(mc===0){const r=Math.floor(k/z),c=k%z;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<z&&cc>=0&&cc<z)st.push(rr*z+cc);}}}
      pts[t]+=got;last=`${nm(d,t)} فتح ${got} خانة`;}
    const al=aliveSeats(d,out);const safeLeft=[...rv].some((v,k)=>v==='.'&&d.m[k]==='0');let win=null;
    if(al.length===1)win=al[0];else if(!al.length)win='d';else if(!safeLeft)win=mostPts(pts.map((x,s)=>out[s]==='1'?-1:x));
    act({...d,rv,k:kk,out,pts,last,win,turn:nextSeat(d,t,out)});
  }
};

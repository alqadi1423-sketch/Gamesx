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
const mostPts=pts=>{const mx=Math.max(...pts);const top=pts.map((x,s)=>x===mx?s:-1).filter(s=>s>=0);return top.length===1?top[0]:'d';};
const ptsBadges=(d,pts)=>pts.map((x,s)=>d.out[s]==='1'?'':`<span class="mini" style="background:${col(d,s)}">${x}</span>`).join('');

/* ---------- connect four ---------- */
const CF={2:[7,6],3:[8,7],4:[9,7],5:[10,8],6:[11,8],7:[12,9],8:[12,9]};
GAMES.c4={name:'أربعة في صف',cat:'board',lbc:'#2F6FB5',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3A7FCB"/>${[0,1,2,3].map(r=>[0,1,2,3].map(c=>{const k=(r*4+c)%5;const f=r<1?'#2a5f9c':k===0||k===3?'#EC6158':k===1?'#F2C14E':'#2a5f9c';return `<circle cx="${17+c*22}" cy="${17+r*22}" r="8.5" fill="${f}"/>`;}).join('')).join('')}</svg>`,
  init:n=>{const [C,R]=CF[n]||[12,9];return {C,R,b:'.'.repeat(C*R),ln:null};},
  status:(d,ctx)=>turnTxt(d,ctx)+'<br><small>اضغط على عمود تنزل قطعتك فيه</small>',
  render(d,ctx){const {C,R}=d;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${C},1fr);background:#2F6FB5;gap:${C>9?3:4}px">${[...d.b].map((v,i)=>{const c=i%C;
      return `<button class="cg" style="background:transparent;padding:0" data-ga="m" data-i="${c}" ${ctx.my&&d.b[c]==='.'?'':'disabled'}>${disc(v==='.'?'#EAF2FB':col(d,+v),d.ln&&d.ln.includes(i))}</button>`;}).join('')}</div>`;},
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
  status:(d,ctx)=>turnTxt(d,ctx)+'<br><small>أول واحد يصف 5 ورا بعض يفوز</small>',
  render(d,ctx){const z=d.z;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${z},1fr);background:#E9C48F;gap:1px;padding:4px">${[...d.b].map((v,i)=>
      `<button class="cg" style="background:${d.ln&&d.ln.includes(i)?'#fff4c9':'#F6DDB5'};border-radius:3px;padding:8%" data-ga="m" data-i="${i}" ${ctx.my&&v==='.'?'':'disabled'}>${v==='.'?'':disc(col(d,+v))}</button>`).join('')}</div>`;},
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
  init:n=>{const z=TRS[n]||8;return {z,t:rnd(z*z),o:'.'.repeat(z*z),by:'.'.repeat(z*z),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+'<br><small>الرقم يقول كم خطوة بينك وبين الكنز</small>',
  render(d,ctx){const z=d.z;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${z},1fr);background:#C9A15B">${[...d.o].map((v,i)=>{
      if(v==='.')return `<button class="cg" style="background:#E8D2A6" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}></button>`;
      if(v==='*')return `<div class="cg" style="background:#ffd84d;font-size:22px">💰</div>`;
      const k=v.charCodeAt(0)-97;return `<div class="cg" style="background:${heat(k)};color:#fff;box-shadow:inset 0 0 0 3px ${col(d,+d.by[i])}">${k}</div>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.o[i]!=='.')return;const z=d.z,t=d.turn;
    if(i===d.t){act({...d,o:setAt(d.o,i,'*'),by:setAt(d.by,i,String(t)),win:t,last:`${nm(d,t)} لقى الكنز!`});return;}
    const k=Math.abs(Math.floor(i/z)-Math.floor(d.t/z))+Math.abs(i%z-d.t%z);
    act({...d,o:setAt(d.o,i,String.fromCharCode(97+k)),by:setAt(d.by,i,String(t)),turn:nextSeat(d,t),last:`${nm(d,t)} حفر وطلع الكنز يبعد ${k} خطوات`});
  }
};

/* ---------- minesweeper party ---------- */
const MNS={2:[8,10],3:[9,13],4:[9,14],5:[10,17],6:[10,18],7:[10,19],8:[10,20]};
function mineCount(m,z,i){const r=Math.floor(i/z),c=i%z;let n=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if((dr||dc)&&rr>=0&&rr<z&&cc>=0&&cc<z&&m[rr*z+cc]==='1')n++;}return n;}
GAMES.mines={name:'حقل الألغام',cat:'mind',lbc:'#4E6A57',
  icon:iconE('#6E8F77','💣','rgba(255,255,255,.3)'),
  init:n=>{const [z,k]=MNS[n]||[10,20];const m=Array(z*z).fill('0');let p=0;while(p<k){const i=rnd(z*z);if(m[i]==='0'){m[i]='1';p++;}}
    return {z,m:m.join(''),rv:'.'.repeat(z*z),pts:Array(n).fill(0),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br>${ptsBadges(d,d.pts)}<br><small>افتح خانة آمنة تاخذ نقاطها، واللي يدوس لغم يطلع</small>`,
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const z=d.z;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${z},1fr);background:#4E6A57;gap:3px">${[...d.rv].map((v,i)=>{
      if(v==='.')return `<button class="cg" style="background:${d.win!=null&&d.m[i]==='1'?'#c9d3cb':'#A9C3AE'}" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}>${d.win!=null&&d.m[i]==='1'?'💣':''}</button>`;
      if(d.m[i]==='1')return `<div class="cg" style="background:${col(d,+v)}">💥</div>`;
      const k=mineCount(d.m,z,i);return `<div class="cg" style="background:${lit(d,+v)};color:${['transparent','#2F6FB5','#2E8B57','#D43C33','#6A3FA0','#9A3B1D','#1F8A8A','#333','#777'][k]}">${k||''}</div>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||d.rv[i]!=='.')return;const z=d.z,t=d.turn,ts=String(t);let rv=d.rv,out=d.out;const pts=[...d.pts];let last;
    if(d.m[i]==='1'){rv=setAt(rv,i,ts);out=setAt(out,t,'1');last=`${nm(d,t)} داس على لغم وطلع 💥`;}
    else{const st=[i];let got=0;while(st.length){const k=st.pop();if(rv[k]!=='.'||d.m[k]==='1')continue;rv=setAt(rv,k,ts);got++;
        if(mineCount(d.m,z,k)===0){const r=Math.floor(k/z),c=k%z;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<z&&cc>=0&&cc<z)st.push(rr*z+cc);}}}
      pts[t]+=got;last=`${nm(d,t)} فتح ${got} خانة`;}
    const al=aliveSeats(d,out);const safeLeft=[...rv].some((v,k)=>v==='.'&&d.m[k]==='0');let win=null;
    if(al.length===1)win=al[0];else if(!al.length)win='d';else if(!safeLeft)win=mostPts(pts.map((x,s)=>out[s]==='1'?-1:x));
    act({...d,rv,out,pts,last,win,turn:nextSeat(d,t,out)});
  }
};

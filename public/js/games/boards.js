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
// the four of seat p on board b (or null)
function c4Line(b,R,C,p){const v=String(p);for(let r=0;r<R;r++)for(let c=0;c<C;c++){if(b[r*C+c]!==v)continue;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[];for(let j=0;j<4;j++){const rr=r+dr*j,cc=c+dc*j;if(rr<0||rr>=R||cc<0||cc>=C||b[rr*C+cc]!==v)break;cells.push(rr*C+cc);}
    if(cells.length===4)return cells;}}return null;}
/* vr 1 (pull from below): on your turn drop a disc, or pull one of your own discs out of the bottom row and the column slides down.
   A pull that makes four for you wins even if it makes four for someone else too; one that makes only someone else's four loses */
function c4Pop(d,c){const {C,R}=d,t=d.turn;if(d.b[(R-1)*C+c]!==String(t))return null;const a=[...d.b];
  for(let r=R-1;r>0;r--)a[r*C+c]=a[(r-1)*C+c];a[c]='.';const b=a.join('');
  let ln=c4Line(b,R,C,t),win=ln?t:null;if(!ln)for(let k=1;k<d.pl.length&&!ln;k++){const o=(t+k)%d.pl.length;if(d.out[o]==='1')continue;const l=c4Line(b,R,C,o);if(l){ln=l;win=o;}}
  return {b,ln,win};}
let C4V=0;// the last choice on this phone, kept for the next rounds
// a full board ends the game, unless the next player can still pull a disc
const c4Stuck=(d,b,t)=>!b.includes('.')&&!(d.vr&&b.slice((d.R-1)*d.C).includes(String(t)));
GAMES.c4={name:'أربعة في صف',cat:'board',lbc:'#2F6FB5',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3A7FCB"/>${[0,1,2,3].map(r=>[0,1,2,3].map(c=>{const k=(r*4+c)%5;const f=r<1?'#2a5f9c':k===0||k===3?'#EC6158':k===1?'#F2C14E':'#2a5f9c';return `<circle cx="${17+c*22}" cy="${17+r*22}" r="8.5" fill="${f}"/>`;}).join('')).join('')}</svg>`,
  init:n=>{const [C,R]=CF[n]||[12,9];return {C,R,b:'.'.repeat(C*R),ln:null,vr:C4V,nmv:0,lp:null};},
  status:(d,ctx)=>turnTxt(d,ctx)+(d.vr&&d.win==null?'<br><small>حط قرص، أو اسحب قرص لك من الصف التحتي ⬇</small>':''),
  render(d,ctx){const {C,R}=d,lm=d.ln?-1:bdLast('c4',d,d.b),fresh=!ctx.bot&&!/[0-9]/.test(d.b)&&d.win==null;
    // where a disc dropped in each column would land: shown as a soft ghost while it is your turn
    const nx=new Set();if(ctx.my)for(let c=0;c<C;c++){let r=R-1;while(r>=0&&d.b[r*C+c]!=='.')r--;if(r>=0)nx.add(r*C+c);}
    // the column just pulled: its discs are new nodes and slide down one hole
    const lp=d.lp&&d.lp[1]===(d.nmv||0)?d.lp[0]:-1;
    let h=fresh?`<div class="segs tttv">${[['0','كلاسيكية'],['1','تقدر تسحب من تحت']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:'';
    h+=`<div class="cellgrid bd-c4" style="grid-template-columns:repeat(${C},minmax(0,1fr));gap:${C>9?3:4}px;--c:${col(d,d.turn)}">${[...d.b].map((v,i)=>{const c=i%C;
      return `<button class="cg ${nx.has(i)?'nx':''}" data-ga="m" data-i="${c}" ${ctx.my&&d.b[c]==='.'?'':'disabled'}>${v==='.'?'<i class="hole"></i>':`<i class="dk ${d.ln&&d.ln.includes(i)?'won':''} ${i===lm?'lm':''} ${c===lp?'pp':''}" ${c===lp?`data-k="p${d.nmv}_${i}"`:''} style="--c:${col(d,+v)};--r:${(i-c)/C+1}"></i>`}</button>`;}).join('')}</div>`;
    // the pull buttons sit under the columns whose bottom disc is yours
    if(d.vr&&ctx.my&&d.win==null){const me=String(d.turn),row=d.b.slice((R-1)*C);
      h+=`<div class="c4pull" style="grid-template-columns:repeat(${C},minmax(0,1fr));gap:${C>9?3:4}px">${[...row].map((v,c)=>v===me?`<button class="c4p" data-ga="pop" data-i="${c}" aria-label="اسحب" style="--c:${col(d,d.turn)}">⬇</button>`:'<i></i>').join('')}</div>`;}
    return h;},
  click(a,c,d,ctx){
    if(!ctx.my)return;const {C,R}=d,t=d.turn,nmv=(d.nmv||0)+1;
    if(a==='vr'){if(/[0-9]/.test(d.b))return;C4V=c?1:0;act({...d,vr:C4V});return;}
    // a long pulling game ends in a draw
    const cap=!!d.vr&&nmv>=C*R*3;
    if(a==='pop'){if(!d.vr||!Number.isInteger(c))return;const p=c4Pop(d,c);if(!p)return;
      let win=p.win;if(win==null&&(cap||c4Stuck(d,p.b,nextSeat(d,t))))win='d';
      act({...d,b:p.b,ln:p.ln,win,nmv,lp:[c,nmv],turn:nextSeat(d,t)});return;}
    if(!Number.isInteger(c)||c<0||c>=C)return;let r=R-1;while(r>=0&&d.b[r*C+c]!=='.')r--;if(r<0)return;
    const b=setAt(d.b,r*C+c,String(t));const w=lineWinRC(b,R,C,4);
    act({...d,b,nmv,ln:w?w.ln:null,win:w?w.w:(cap||(d.vr?c4Stuck(d,b,nextSeat(d,t)):!b.includes('.')))?'d':null,turn:nextSeat(d,t)});
  }
};

/* ---------- five in a row ---------- */
const GMS={2:11,3:13,4:13,5:15,6:15,7:15,8:15};
const GMD=[[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];
/* vr 1 (with captures, an old Japanese way of playing): a stone that closes in exactly two stones of one other player
   in a line (you, them, them, you) takes both off the board. Five captures (ten stones) also win */
function gmCaps(b,z,i,t,d){const me=String(t),out=[],r0=Math.floor(i/z),c0=i%z;
  for(const [dr,dc] of GMD){const at=k=>{const r=r0+dr*k,c=c0+dc*k;return r<0||r>=z||c<0||c>=z?-1:r*z+c;};
    const a=at(1),b2=at(2),e=at(3);if(a<0||b2<0||e<0)continue;const va=b[a];
    if(va==='.'||va===me||b[b2]!==va||b[e]!==me||(d&&sameTeam(d,+va,t)))continue;out.push(a,b2);}
  return out;}
let GMV=0;// the last choice on this phone, kept for the next rounds
GAMES.gomoku={name:'خمسة على التوالي',cat:'board',lbc:'#9A6B3C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E9C48F"/>${[1,2,3,4,5,6,7,8].map(k=>`<path d="M${k*11} 4V96M4 ${k*11}H96" stroke="#9A6B3C" stroke-width="1.5"/>`).join('')}${[[2,2],[3,3],[4,4],[5,5],[6,6]].map(([x,y])=>`<circle cx="${x*11}" cy="${y*11}" r="4.6" fill="#2D4763"/>`).join('')}${[[3,5],[4,6],[6,3],[2,6]].map(([x,y])=>`<circle cx="${x*11}" cy="${y*11}" r="4.6" fill="#EC6158"/>`).join('')}</svg>`,
  init:n=>{const z=GMS[n]||15;return {z,b:'.'.repeat(z*z),ln:null,vr:GMV,cp:Array(n).fill(0),cx:[],lm:-1,nmv:0};},
  status:(d,ctx)=>turnTxt(d,ctx)+(d.vr?`<br><small>الأسر: ${d.pl.map((_,s)=>`${nm(d,s)} ${(d.cp||[])[s]||0}/5`).join('، ')}</small>`:''),
  winExtra:d=>d.vr&&!d.ln&&typeof d.win==='number'?`${nm(d,d.win)} أسر خمس مرات`:'',
  render(d,ctx){const z=d.z,lm=d.ln?-1:d.lm>=0?d.lm:bdLast('gomoku',d,d.b),e=3,m=z-4,h=(z-1)/2,fresh=!ctx.bot&&!/[0-9]/.test(d.b)&&!d.nmv&&d.win==null;
    // star points, as on a real board: the centre and the four 4-4 points
    const star=new Set([[e,e],[e,m],[m,e],[m,m],[h,h]].map(([r,c])=>r*z+c));
    // the stones just taken fade out where they stood (new nodes keyed by the move, so they play once)
    const gone={};for(const [c,o] of d.cx||[])gone[c]=o;
    let s=fresh?`<div class="segs tttv">${[['0','كلاسيكية'],['1','بالأسر']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:'';
    if(d.vr&&!fresh)s+=`<div class="gmcap">${d.pl.map((_,o)=>d.out[o]==='1'?'':`<span style="--c:${col(d,o)}"><i></i>${'●'.repeat(Math.min(5,(d.cp||[])[o]||0))}<small>${'○'.repeat(Math.max(0,5-((d.cp||[])[o]||0)))}</small></span>`).join('')}</div>`;
    return s+`<div class="cellgrid bd-gm ${ctx.my?'my':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr));--z:${z};--c:${col(d,d.turn)}">${[...d.b].map((v,i)=>
      `<button class="cg ${star.has(i)?'hs':''}" data-ga="m" data-i="${i}" ${ctx.my&&v==='.'?'':'disabled'}>${v==='.'?(i in gone?`<i class="st gone" data-k="x${d.nmv}" style="--c:${col(d,gone[i])}"></i>`:''):`<i class="st ${d.ln&&d.ln.includes(i)?'won':''} ${i===lm?'lm':''}" style="--c:${col(d,+v)}"></i>`}</button>`).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='vr'){if(/[0-9]/.test(d.b)||d.nmv)return;GMV=i?1:0;act({...d,vr:GMV,cp:d.pl.map(()=>0)});return;}
    if(!Number.isInteger(i)||d.b[i]!=='.')return;let b=setAt(d.b,i,String(t));const cp=[...(d.cp||d.pl.map(()=>0))],cx=[];
    if(d.vr){const k=gmCaps(b,d.z,i,t,d);for(const c of k){cx.push([c,+b[c]]);b=setAt(b,c,'.');}cp[t]+=k.length/2;}
    const w=lineWinRC(b,d.z,d.z,5);const win=w?w.w:d.vr&&cp[t]>=5?t:(b.includes('.')?null:'d');
    if(cx.length&&!w)sfx('pop');
    act({...d,b,cp,cx,lm:i,nmv:(d.nmv||0)+1,ln:w?w.ln:null,win,turn:nextSeat(d,t)});
  }
};

/* ---------- treasure hunt ---------- */
const TRS={2:6,3:7,4:7,5:8,6:8,7:8,8:8};
const heat=k=>['#E8473E','#F07A3C','#F2A93B','#E9CD52','#B7D36A','#7FC8A9','#6BB2DA','#5A8FD0','#5872B8','#555A99'][Math.min(k,9)];
GAMES.treasure={name:'الكنز المدفون',cat:'mind',lbc:'#B07B2A',
  icon:iconE('#E6B65C','💰','rgba(255,255,255,.35)'),
  // the treasure is not placed in advance: each dig draws its spot from the cells that still fit every clue, so it is never in the shared state
  // every player also has one radar (rdr): before digging it tells whether the treasure is in a 3×3 square (sc keeps the answers)
  init:n=>{const z=TRS[n]||8;return {z,o:'.'.repeat(z*z),by:'.'.repeat(z*z),last:'',rdr:'1'.repeat(n),sc:[]};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const z=d.z,lm=bdLast('treasure',d,d.o),t=d.turn,rm=ctx.my&&S.trR===d.gid+d.o+t&&(d.rdr||'')[t]==='1';
    const yes=new Set(),no=new Set();for(const [c,y] of d.sc||[])for(let j=0;j<z*z;j++)if(trNear(z,j,c))(y?yes:no).add(j);
    let h=`<div class="cellgrid bd-tr ${ctx.my?'my':''} ${rm?'radar':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr))">${[...d.o].map((v,i)=>{
      const sc=no.has(i)?'sn':yes.has(i)?'sy':'';
      if(v==='.')return `<button class="cg sand ${sc}" data-ga="${rm?'r':'m'}" data-i="${i}" ${ctx.my?'':'disabled'}></button>`;
      if(v==='*')return `<div class="cg gold"><span>💰</span></div>`;
      const k=v.charCodeAt(0)-97;return `<div class="cg dug ${i===lm?'lm':''}" style="--h:${heat(k)};--c:${col(d,+d.by[i])}"><b>${k}</b><i></i></div>`;}).join('')}</div>`;
    if(ctx.my&&d.win==null&&(d.rdr||'')[t]==='1')h+=`<div class="row mnbar"><button class="btn ${rm?'red':'navy'}" data-ga="rad">${rm?'📡 اختر وسط المربع':'📡 الرادار (مرة وحدة)'}</button><small>يقول لك هل الكنز في مربع 3×3، وبعدها تحفر</small></div>`;
    return h;},
  click(a,i,d,ctx){
    if(a==='rad'){if(!ctx.my||(d.rdr||'')[d.turn]!=='1')return;const k=d.gid+d.o+d.turn;S.trR=S.trR===k?null:k;render();return;}
    if(!ctx.my||d.o[i]!=='.')return;const z=d.z,t=d.turn,far=(a,b)=>Math.abs(Math.floor(a/z)-Math.floor(b/z))+Math.abs(a%z-b%z);
    const ok=trFits(d);let tc=d.t;if(tc==null)tc=ok.length?ok[rnd(ok.length)]:i;
    // the radar: the answer comes from a spot that still fits, and the same player digs right after
    if(a==='r'){if((d.rdr||'')[t]!=='1')return;S.trR=null;const y=trNear(z,tc,i)?1:0;
      act({...d,rdr:setAt(d.rdr,t,'0'),sc:[...(d.sc||[]),[i,y]],last:`${nm(d,t)} شغّل الرادار: الكنز ${y?'داخل المربع 📡✓':'مو في المربع 📡✗'}، الحين يحفر`});return;}
    if(a!=='m')return;
    if(i===tc){act({...d,o:setAt(d.o,i,'*'),by:setAt(d.by,i,String(t)),win:t,last:`${nm(d,t)} لقى الكنز!`});return;}
    const k=far(i,tc);
    act({...d,o:setAt(d.o,i,String.fromCharCode(97+k)),by:setAt(d.by,i,String(t)),turn:nextSeat(d,t),last:`${nm(d,t)} حفر وطلع الكنز يبعد ${k} خطوات`});
  }
};
// cell j is in the 3×3 square around c
const trNear=(z,j,c)=>Math.abs(Math.floor(j/z)-Math.floor(c/z))<=1&&Math.abs(j%z-c%z)<=1;
// the cells the treasure can still be in: every dug number and every radar answer fits
function trFits(d){const z=d.z,far=(a,b)=>Math.abs(Math.floor(a/z)-Math.floor(b/z))+Math.abs(a%z-b%z),ok=[];
  for(let j=0;j<z*z;j++)if(d.o[j]==='.'&&[...d.o].every((v,c)=>v<'a'||far(j,c)===v.charCodeAt(0)-97)&&(d.sc||[]).every(([c,y])=>trNear(z,j,c)===!!y))ok.push(j);return ok;}

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
  // the flag switch belongs to the phone; the flag itself is checked on the host like any tap
  net:{local:['fm']},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const z=d.z,end=d.win!=null,fl=ctx.my&&S.mnF===d.gid+d.rv+d.turn,kk=d.k||'';
    const flags=[...kk].filter(c=>c==='f').length,total=(MNS[d.pl.length]||[10,20])[1];
    let h=`<div class="cellgrid bd-mn ${ctx.my?'my':''} ${fl?'flag':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr))">${[...d.rv].map((v,i)=>{
      if(v==='.')return `<button class="cg tile ${end&&d.m[i]==='1'?'mine':''}" data-ga="${fl?'f':'m'}" data-i="${i}" ${ctx.my?'':'disabled'}>${end&&d.m[i]==='1'?MINE:''}</button>`;
      if(kk[i]==='f')return `<div class="cg flg" style="--c:${col(d,+v)}"><span>🚩</span></div>`;
      if(d.m[i]==='1')return `<div class="cg boom" style="--c:${col(d,+v)}">${MINE}</div>`;
      const k=kk[i]&&kk[i]!=='.'&&kk[i]!=='x'?+kk[i]:mineCount(d.m,z,i);return `<div class="cg open n${k} ${kk[i]==='x'||d.wf&&d.wf===i+1?'miss':''}" style="--l:${lit(d,+v)}">${k||''}</div>`;}).join('')}</div>`;
    if(ctx.my&&!end)h+=`<div class="row mnbar"><button class="btn ${fl?'red':'navy'}" data-ga="fm">${fl?'🚩 علّم: اضغط على اللغم':'🚩 علّم لغم (+3)'}</button><small>💣 ${total} لغم، علّمتوا ${flags}</small></div>`;
    return h;},
  click(a,i,d,ctx){
    if(a==='fm'){const k=d.gid+d.rv+d.turn;S.mnF=S.mnF===k?null:k;render();return;}
    if(!ctx.my||d.rv[i]!=='.')return;const z=d.z,t=d.turn,ts=String(t);let rv=d.rv,out=d.out,kk=d.k||'.'.repeat(z*z);const pts=[...d.pts];let last,wf=null;
    // a flag: right is +3 and the mine is out of the game, wrong costs 2 and opens that cell for everyone
    if(a==='f'){S.mnF=null;rv=setAt(rv,i,ts);
      if(d.m[i]==='1'){kk=setAt(kk,i,'f');pts[t]+=3;last=`${nm(d,t)} علّم لغم صح 🚩 +3`;}
      else{kk=setAt(kk,i,String(mineCount(d.m,z,i)));pts[t]=Math.max(0,pts[t]-2);wf=i+1;last=`${nm(d,t)} علّم خانة سليمة ❌ −2`;}}
    else if(a!=='m')return;
    else if(d.m[i]==='1'){rv=setAt(rv,i,ts);out=setAt(out,t,'1');last=`${nm(d,t)} داس على لغم وطلع 💥`;}
    else{const st=[i];let got=0;while(st.length){const k=st.pop();if(rv[k]!=='.'||d.m[k]==='1')continue;rv=setAt(rv,k,ts);got++;const mc=mineCount(d.m,z,k);kk=setAt(kk,k,String(mc));
        if(mc===0){const r=Math.floor(k/z),c=k%z;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<z&&cc>=0&&cc<z)st.push(rr*z+cc);}}}
      pts[t]+=got;last=`${nm(d,t)} فتح ${got} خانة`;}
    const al=aliveSeats(d,out);const safeLeft=[...rv].some((v,k)=>v==='.'&&d.m[k]==='0');let win=null;
    if(al.length===1)win=al[0];else if(!al.length)win='d';else if(!safeLeft)win=mostPts(pts.map((x,s)=>out[s]==='1'?-1:x));
    act({...d,rv,k:kk,out,pts,last,wf,win,turn:nextSeat(d,t,out)});
  }
};

'use strict';
/* puzzles2: solving races. Everyone gets the same puzzle (made on the host, stored in d.pz without its solution), each player
   solves it on their own phone (or in turn on one phone), and the fastest right solution wins the round. The host checks every
   solution it is handed against the puzzle's rules. Part 1: the shared race, nonogram, binary grid, lights out, sliding tiles, maze.
   Every puzzle generator here is pure (no DOM), so tools can run it on its own. */

/* ---------- small helpers ---------- */
const u2R=n=>Math.floor(Math.random()*n);
const u2Sh=a=>{for(let i=a.length-1;i>0;i--){const j=u2R(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const u2Rng=(n,f)=>Array.from({length:n},(_,i)=>f?f(i):i);
const U2LV=['','سهل','متوسط','صعب'];
const U2NR=[1,3,5];
// a session never deals the same bank puzzle twice until the bank runs out
const U2USED={};
function u2Pick(key,n){const u=U2USED[key]||(U2USED[key]=new Set());if(u.size>=n)u.clear();let i;do{i=u2R(n);}while(u.has(i));u.add(i);return i;}
// the 8 ways to turn or mirror a square grid: index i of the new grid reads cell t(i) of the old one
function u2Sym(n,k){return u2Rng(n*n,i=>{let r=Math.floor(i/n),c=i%n;if(k&4)[r,c]=[c,r];if(k&1)c=n-1-c;if(k&2)r=n-1-r;return r*n+c;});}
const u2Min=ms=>{const m=Math.round(ms/60000);return m===1?'دقيقة':m===2?'دقيقتين':m<=10?m+' دقايق':m+' دقيقة';};
const u2Fmt=ms=>{const s=Math.max(0,Math.round(ms/1000));return s<60?s+' ث':Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

/* ---------- the race every puzzle game shares ----------
   d.ph: 'lv' the starter picks the level and the number of rounds, 'gen' the host makes the puzzle, 'go' everyone solves.
   d.pz the puzzle (never its solution), d.lr last round per seat (ms, -1 wrong or gave up, -2 no answer), d.pts, d.tt total time */
const U2={};
function u2St(d,v){const k=d.gid+':'+d.rd+':'+v;
  if(!S.u2||S.u2.key!==k){let o=null;try{const j=JSON.parse(sessionStorage.getItem('u2pz')||'null');if(j&&j.key===k)o=j;}catch(e){}S.u2=o||{key:k,ph:'ready',seen:Date.now()};}
  return S.u2;}
function u2Save(){try{sessionStorage.setItem('u2pz',JSON.stringify(S.u2));}catch(e){}}
// hand in this phone's answer once
function u2Send(d,v,pick){const st=u2St(d,v);if(st.ph==='sent')return;st.ph='sent';st.pick=pick;u2Save();const cur=S.st.d;
  try{sfx(pick.s?'win':'lose');}catch(e){}
  if(!cur||cur.gid!==d.gid||cur.rd!==d.rd)return;simulPick(cur,v,pick);}
// an answer handed in that never reached the round (a reload, a new host) is handed in again
function u2Again(d,ctx,st){if(st.ph==='sent'&&ctx.my&&!hasPicked(d,ctx.v)&&st.pick)setTimeout(()=>{const cur=S.st.d;if(S.u2===st&&cur&&cur.gid===d.gid&&cur.rd===d.rd&&!hasPicked(cur,ctx.v))simulPick(cur,ctx.v,st.pick);},0);}
const u2Cap=(o,d)=>o.cap(d.pz,d.lv);
// the clock of this phone: when the time is up the round is handed in as not solved
const u2Left=t=>{const l=Math.max(0,Math.ceil((t-Date.now())/1000));return Math.floor(l/60)+':'+String(l%60).padStart(2,'0');};
setInterval(()=>{if(typeof document!=='undefined')for(const e of document.querySelectorAll('[data-u2end]')){const t=u2Left(+e.dataset.u2end);if(e.textContent!==t)e.textContent=t;}},1000);
setInterval(()=>{try{const st=S.u2,d=S.st.d,G=GAMES[S.st.g];if(!st||st.ph!=='go'||!d||!G||!G.u2||d.win!=null||d.ph!=='go')return;
  if(!st.key.startsWith(d.gid+':'+d.rd+':'))return;if(Date.now()>st.t0+st.cap){const v=+st.key.split(':')[2];u2Send(d,v,{s:'',ms:st.cap});toast('خلص الوقت');render();}}catch(e){}},1000);
// the winner: most points, then the least time spent on solved puzzles; with teams the team totals
function u2Win(d,pts,tt){const tm=d.tm&&GAMES[S.st.g]&&GAMES[S.st.g].teams!=='none'?d.tm:null;
  const key=tm?[...new Set(tm)].map(t=>{const ss=d.pl.map((_,s)=>s).filter(s=>tm[s]===t);return {s:ss[0],p:ss.reduce((a,s)=>a+pts[s],0),t:Math.min(...ss.map(s=>tt[s]))};})
    :d.pl.map((_,s)=>({s,p:pts[s],t:tt[s]})).filter(x=>d.out[x.s]!=='1'||x.p>0);
  key.sort((a,b)=>b.p-a.p||a.t-b.t);if(!key.length)return 'd';if(key.length>1&&key[0].p===key[1].p&&key[0].t===key[1].t)return 'd';return key[0].s;}
// last round, a row per seat, fastest right answer first
function u2Board(d){if(!Array.isArray(d.lr))return '';const rows=d.pl.map((_,s)=>({s,t:d.lr[s]})).filter(r=>r.t!==-2||d.out[r.s]!=='1');
  rows.sort((a,b)=>(b.t>=0)-(a.t>=0)||a.t-b.t);const ok=rows.filter(r=>r.t>=0),mx=Math.max(1,...ok.map(r=>r.t));const w=ok.length&&(ok.length===1||ok[0].t<ok[1].t)?ok[0].s:-1;
  return `<div class="spr u2res" id="u2r${d.rd}"><div class="spr-h">${d.win!=null?'الجولة الأخيرة':'نتيجة الجولة '+d.rd}</div>${rows.map((r,j)=>`<div class="spr-r ${r.s===w?'w':''} ${r.t<0?'nt':''}" style="--c:${col(d,r.s)};--j:${j}"><i class="spr-m">${r.s===w?'⚡':r.t>=0?j+1:''}</i><b>${nm(d,r.s)}</b><span class="spr-bar">${r.t>=0?`<i style="width:${Math.max(8,Math.round(r.t/mx*100))}%"></i>`:''}</span><em>${r.t>=0?u2Fmt(r.t):r.t===-1?'✗ ما حلّها':'—'}</em>${d.sg&&d.sg[r.s]?`<u class="spr-g">+${d.sg[r.s]}</u>`:''}</div>`).join('')}</div>`;}
const u2LvTag=(o,d)=>`<span class="u2tag">${U2LV[d.lv]||''} • ${o.size(d.pz)}</span>`;
// a solution a bot hands in: right, or (by its level) wrong now and then; the time is decided when the round starts
const U2BOT={},U2SOL={};
function u2BotPlan(o,d,s,lv){const k=d.gid+':'+d.rd+':'+s;if(U2BOT[k])return U2BOT[k];const ks=Object.keys(U2BOT);if(ks.length>40)delete U2BOT[ks[0]];
  // a bot never takes much over two minutes, so the levels keep their gap on big boards too
  const base=Math.min(o.botT(d.pz),62)*1000,f=[0,1.7,1.05,.62][lv]*(.8+Math.random()*.45);
  return U2BOT[k]={ms:Math.round(Math.min(118000,Math.max(6000,base*f))),ok:Math.random()>[0,.22,.1,.03][lv]};}
function u2Sol(o,d){const k=d.gid+':'+d.rd;if(k in U2SOL)return U2SOL[k];const ks=Object.keys(U2SOL);if(ks.length>12)delete U2SOL[ks[0]];let s=null;try{s=o.solve(d.pz);}catch(e){console.error(e);}return U2SOL[k]=s;}

function u2Game(o){
  const G={name:o.name,cat:'puzzle',lbc:o.lbc,icon:o.icon,u2:o,noTimer:true,
    init:n=>({ph:'lv',lv:0,nr:3,rd:0,pz:null,pts:Array(n).fill(0),tt:Array(n).fill(0),lr:null,sg:null,dl:0}),
    simulNow:d=>d.ph==='go',
    viewer:d=>d.ph==='go'?simulViewer(d):null,
    coverMsg:d=>d.ph==='go'?`جولة ${d.rd+1} من ${d.nr}`:'',
    points:d=>d.pts,
    status(d,ctx){if(d.win!=null)return '';
      if(d.ph==='lv')return ctx.my?'<b>اختر المستوى وعدد الجولات</b>':`${nameTag(d,d.turn)} يختار المستوى`;
      if(d.ph==='gen')return '<b>نجهّز اللغز…</b>';
      const me=ctx.v,sub=`<small>جولة ${Math.min(d.rd+1,d.nr)} من ${d.nr} • ${U2LV[d.lv]}</small><br>`;
      if(ctx.local)return sub+(me!=null&&me>=0?`دور ${nameTag(d,me)} يحل`:'');
      return sub+(me>=0?hasPicked(d,me)?'<b>أرسلت، ننتظر الباقين</b>':'<b>حلّها قبل الكل!</b>':'');},
    winExtra:d=>'النقاط: '+d.pl.map((_,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، '),
    // the host makes the puzzle; online it also closes a round nobody finishes (the players' own clocks normally do)
    // a maker that gives up is asked again, then at a lower level; with no puzzle yet the host simply tries on its next tick
    host(d){if(d.ph==='gen'){let pz=null;for(let l=d.lv;l>=1&&!pz;l--)for(let k=0;k<3&&!pz;k++){try{pz=o.gen(l);}catch(e){pz=null;}}
        if(!pz)return null;return {...d,ph:'go',pz,dl:S.mode==='online'?Date.now()+o.cap(pz,d.lv)+150000:0};}
      if(d.ph==='go'&&d.dl&&S.mode==='online'&&Date.now()>d.dl)return G.resolve(d,simulPicks(d).map(x=>x===undefined?null:x));
      return null;},
    resolve(d,picks){const cap=o.cap(d.pz,d.lv);
      const lr=picks.map((p,s)=>{if(p==null||d.out[s]==='1')return -2;if(typeof p!=='object'||typeof p.s!=='string'||!p.s||p.s.length>8000||typeof p.ms!=='number'||!isFinite(p.ms))return -1;
        let ok=false;try{ok=!!o.check(d.pz,p.s);}catch(e){ok=false;}return ok?Math.max(1000,Math.min(cap,Math.round(p.ms))):-1;});
      const ok=lr.map((t,s)=>t>=0?{s,t}:null).filter(Boolean).sort((a,b)=>a.t-b.t);const sg=Array(d.pl.length).fill(0);
      ok.forEach(x=>{sg[x.s]=x.t===ok[0].t?2:1;});
      const pts=d.pts.map((x,s)=>x+sg[s]),tt=d.tt.map((x,s)=>x+(lr[s]>=0?lr[s]:cap)),rd=d.rd+1,end=rd>=d.nr;
      return {...d,pts,tt,lr,sg,rd,ph:end?'go':'gen',dl:0,win:end?u2Win(d,pts,tt):null};},
    // the starter's choice; a bot takes the middle level
    bot(d,s,lv){if(d.ph!=='lv')return d;return {...d,ph:'gen',lv:2,nr:3};},
    botDelay(d,s,lv){if(d.ph!=='go')return 900+u2R(700);return u2BotPlan(o,d,s,lv).ms;},
    botPick(d,s,lv){const P=u2BotPlan(o,d,s,lv),sol=u2Sol(o,d);if(!sol)return {s:'',ms:P.ms};return {s:P.ok?sol:o.spoil(d.pz,sol),ms:P.ms};},
    render(d,ctx){
      if(d.win!=null)return `<div class="u2 u2end">${u2Board(d)}</div>`;
      if(d.ph==='lv'){if(!ctx.my)return `<div class="u2"><div class="spd-card u2pick"><div class="rdyi">${o.icon}</div><div class="spdt">${o.title}</div><p class="note">${nm(d,d.turn)} يختار المستوى…</p></div></div>`;
        const nr=U2NR.includes(S.u2nr)?S.u2nr:3;
        return `<div class="u2"><div class="spd-card u2pick"><div class="rdyi">${o.icon}</div><div class="spdt">${o.title}</div>
          <p class="lbl">عدد الجولات</p><div class="u2seg">${U2NR.map(n=>`<button class="${n===nr?'on':''}" data-ga="nr" data-i="${n}">${n}</button>`).join('')}</div>
          <p class="lbl">المستوى</p><div class="u2lvs">${[1,2,3].map(l=>`<button class="btn ${['','blue','navy','red'][l]}" data-ga="lv" data-i="${l}"><b>${U2LV[l]}</b><small>${o.lvTxt[l]}</small></button>`).join('')}</div></div></div>`;}
      if(d.ph==='gen'||!d.pz)return `<div class="u2"><div class="spd-card u2pick"><div class="rdyi">${o.icon}</div><div class="spdt">نجهّز اللغز…</div></div>${u2Board(d)}</div>`;
      if(!ctx.my){const mine=ctx.v>=0&&hasPicked(d,ctx.v);let me='';if(mine){const p=seatPick(d,ctx,ctx.v,d.rd);if(p&&typeof p==='object')me=p.s?`<div class="spd-me">وقتك <b>${u2Fmt(p.ms)}</b></div>`:'<div class="spd-me no">ما حليتها هالمرة</div>';}
        return `<div class="u2">${mine?`<div class="spd spd-sent"><div class="spd-ck">✓</div><div class="spdt">أرسلت</div>${me}<p class="note">ننتظر الباقين</p></div>`:''}${qzWho(d,ctx)}${u2Board(d)}</div>`;}
      const st=u2St(d,ctx.v);u2Again(d,ctx,st);
      if(st.ph==='ready')return `<div class="u2"><div class="spd-card u2ready"><div class="rdyi">${o.icon}</div><div class="spdt">${o.title}</div><div class="u2tags"><span class="spd-rd">جولة ${d.rd+1} من ${d.nr}</span>${u2LvTag(o,d)}</div><p class="note">عندك ${u2Min(u2Cap(o,d))}. ${o.goal||''}</p><button class="btn red wide" data-ga="start">جاهز، ابدأ</button></div>${u2Board(d)}</div>`;
      if(st.ph==='sent')return `<div class="u2"><div class="spd spd-sent"><div class="spd-ck ${st.pick&&st.pick.s?'':'no'}">${st.pick&&st.pick.s?'✓':'✗'}</div><div class="spdt">${st.pick&&st.pick.s?'حليتها!':'ما انحلّت'}</div>${st.pick&&st.pick.s?`<div class="spd-me">وقتك <b>${u2Fmt(st.pick.ms)}</b></div>`:''}<p class="note">ننتظر الباقين</p>${qzWho(d,ctx)}</div></div>`;
      const left=st.t0+st.cap;
      return `<div class="u2 u2go u2-${o.cls}"><div class="u2bar"><span class="u2clk">⏱ <b data-u2end="${left}">${u2Left(left)}</b></span>${u2LvTag(o,d)}</div>${o.view(d.pz,st.w,st,ctx)}
        <div class="u2acts">${o.noUndo?'':`<button class="btn soft" data-ga="undo" ${st.h&&st.h.length?'':'disabled'}>↶ تراجع</button>`}<button class="btn soft" data-ga="clr">مسح</button><button class="btn soft u2quit ${st.q?'sure':''}" data-ga="quit">${st.q?'متأكد؟ استسلم':'استسلم'}</button></div></div>`;},
    click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
      if(d.ph==='lv'){if(a==='nr'&&U2NR.includes(i)){S.u2nr=i;render();return;}if(a==='lv'&&i>=1&&i<=3)act({...d,ph:'gen',lv:i,nr:U2NR.includes(S.u2nr)?S.u2nr:3});return;}
      if(d.ph!=='go'||!d.pz)return;const st=u2St(d,ctx.v);
      // online the host closes the round 150 s after the puzzle's own time: a player who waits on «ابدأ» longer than two minutes
      // has the clock already running, so the time shown is the time really left
      if(a==='start'){if(st.ph!=='ready')return;st.ph='go';st.t0=S.mode==='online'&&st.seen?Math.min(Date.now(),st.seen+120000):Date.now();st.cap=u2Cap(o,d);st.w=o.init(d.pz);st.h=[];u2Save();render();return;}
      if(st.ph!=='go')return;
      if(a==='quit'){if(!st.q){st.q=1;render();setTimeout(()=>{if(S.u2===st&&st.q){st.q=0;render();}},3000);return;}u2Send(d,ctx.v,{s:'',ms:Date.now()-st.t0});render();return;}
      if(a==='undo'){if(st.h&&st.h.length){st.w=st.h.pop();u2Save();render();}return;}
      if(a==='clr'){u2Push(st);st.w=o.init(d.pz);u2Save();render();return;}
      const r=o.tap(a,i,d.pz,st);if(r===true)u2Done(o,d,ctx,st);else{u2Save();render();}},
    // a drag on the board (data-ud): o.drag gets 'down' | 'move' | 'up' with the cell under the finger
    u2ptr(kind,c,d,ctx,tag){if(d.win!=null||d.ph!=='go'||!d.pz)return;const st=u2St(d,ctx.v);if(st.ph!=='go'||!o.drag)return;const r=o.drag(kind,c,d.pz,st,tag);if(r===true)u2Done(o,d,ctx,st);else if(r)render();}};
  U2[o.cls]=o;return G;}
// keep the board before a change, for «تراجع»
function u2Push(st){st.h=st.h||[];st.h.push(JSON.parse(JSON.stringify(st.w)));if(st.h.length>40)st.h.shift();}
// after every change: a solved board is handed in at once (the same check the host makes)
function u2Done(o,d,ctx,st){let ok=false;try{const sub=o.sub(d.pz,st.w);ok=!!sub&&o.check(d.pz,sub);if(ok){u2Send(d,ctx.v,{s:sub,ms:Date.now()-st.t0});render();return;}}catch(e){console.error(e);}
  u2Save();render();}

/* ---------- drag surfaces: a board with data-ud maps the finger to a cell (the board is drawn left to right) ---------- */
let U2P=null;
function u2Cell(el,e){const r=el.getBoundingClientRect(),w=+el.dataset.w,h=+el.dataset.h;const x=(e.clientX-r.left)/r.width*w,y=(e.clientY-r.top)/r.height*h;
  return {x,y,i:x<0||y<0||x>=w||y>=h?-1:Math.floor(y)*w+Math.floor(x)};}
function u2Ptr(kind,el,e){const G=GAMES[S.st.g],d=S.st.d;if(!G||!G.u2||!d||d.win!=null||S.mode==null)return;let ctx;try{ctx=mkCtx();}catch(x){return;}if(!ctx.my)return;G.u2ptr(kind,u2Cell(el,e),d,ctx,el.dataset.ud);}
if(typeof app!=='undefined'&&app&&app.addEventListener){
  app.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest('[data-ud]');if(!el||e.button>0)return;e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(x){}U2P={el,id:e.pointerId,last:-2};u2Ptr('down',el,e);});
  app.addEventListener('pointermove',e=>{if(!U2P||e.pointerId!==U2P.id)return;const el=U2P.el.isConnected?U2P.el:app.querySelector('[data-ud="'+U2P.el.dataset.ud+'"]');if(!el)return;U2P.el=el;u2Ptr('move',el,e);});
  const up=e=>{if(!U2P||e.pointerId!==U2P.id)return;const el=U2P.el;U2P=null;u2Ptr('up',el,e);};
  app.addEventListener('pointerup',up);app.addEventListener('pointercancel',up);}
// a square grid of cells inside a drag surface; cell(i) gives [class, content]
function u2Grid(tag,w,h,cell,cls,extra){let s='';for(let i=0;i<w*h;i++){const [c,t]=cell(i);s+=`<i class="${c}">${t==null?'':t}</i>`;}
  return `<div class="u2grid ${cls||''}" id="u2g-${tag}" data-ud="${tag}" data-w="${w}" data-h="${h}" style="--w:${w};--h:${h}">${s}${extra||''}</div>`;}
// a tool switch (fill / mark, digits…)
const u2Seg=(ga,opts,cur)=>`<div class="u2seg u2tools">${opts.map(([v,t])=>`<button class="${v===cur?'on':''}" data-ga="${ga}" data-i="${v}">${t}</button>`).join('')}</div>`;

/* ========== 1. نونوغرام (nonogram): shade cells so every row and column shows its number clues ========== */
const NN_SZ=[0,[5,5],[8,8],[10,10]];
// clues of a line of 0/1
function nnClue(a){const o=[];let k=0;for(const x of a){if(x===1)k++;else if(k){o.push(k);k=0;}}if(k)o.push(k);return o.length?o:[0];}
// what a line forces: every arrangement of the blocks that fits the known cells (-1 unknown) is walked once (forward and backward reach)
function nnLine(c,clue){const L=c.length,b=clue[0]===0?[]:clue,k=b.length;
  const F=u2Rng(L+2,()=>new Uint8Array(k+1)),B=u2Rng(L+2,()=>new Uint8Array(k+1));
  const fit=(i,j)=>{const n=b[j];if(i+n>L)return false;for(let x=i;x<i+n;x++)if(c[x]===0)return false;return !(i+n<L&&c[i+n]===1);};
  const nx=(i,j)=>{const n=b[j];return i+n<L?i+n+1:L;};
  F[0][0]=1;for(let i=0;i<L;i++)for(let j=0;j<=k;j++){if(!F[i][j])continue;if(c[i]!==1)F[i+1][j]=1;if(j<k&&fit(i,j))F[nx(i,j)][j+1]=1;}
  B[L][k]=1;for(let i=L-1;i>=0;i--)for(let j=k;j>=0;j--){let v=0;if(c[i]!==1&&B[i+1][j])v=1;if(!v&&j<k&&fit(i,j)&&B[nx(i,j)][j+1])v=1;B[i][j]=v;}
  if(!B[0][0])return null;const c0=new Uint8Array(L),c1=new Uint8Array(L);
  for(let i=0;i<L;i++)for(let j=0;j<=k;j++){if(!F[i][j])continue;if(c[i]!==1&&B[i+1][j])c0[i]=1;if(j<k&&fit(i,j)&&B[nx(i,j)][j+1]){const n=b[j];for(let x=i;x<i+n;x++)c1[x]=1;if(i+n<L)c0[i+n]=1;}}
  return c.map((x,i)=>x!==-1?x:c0[i]&&!c1[i]?0:c1[i]&&!c0[i]?1:-1);}
// line by line until nothing moves: a full board means the clues allow this one picture only
function nnSolve(w,h,R,C){const g=Array(w*h).fill(-1);let ch=true,n=0;
  while(ch&&n++<200){ch=false;
    for(let r=0;r<h;r++){const a=u2Rng(w,c=>g[r*w+c]);const z=nnLine(a,R[r]);if(!z)return null;z.forEach((x,c)=>{if(x!==a[c]){g[r*w+c]=x;ch=true;}});}
    for(let c=0;c<w;c++){const a=u2Rng(h,r=>g[r*w+c]);const z=nnLine(a,C[c]);if(!z)return null;z.forEach((x,r)=>{if(x!==a[r]){g[r*w+c]=x;ch=true;}});}}
  return g.includes(-1)?null:g;}
const nnPz=pz=>({R:pz.r.map(s=>s.split('.').map(Number)),C:pz.c.map(s=>s.split('.').map(Number))});
function nnGen(lv){const [w,h]=NN_SZ[lv];for(let t=0;t<400;t++){const p=[0,.6,.56,.55][lv];const g=u2Rng(w*h,()=>Math.random()<p?1:0);
    const R=u2Rng(h,r=>nnClue(g.slice(r*w,r*w+w))),C=u2Rng(w,c=>nnClue(u2Rng(h,r=>g[r*w+c])));
    if(R.some(x=>x[0]===0)&&lv>1||C.some(x=>x[0]===0)&&lv>1)continue;
    if(nnSolve(w,h,R,C))return {w,h,r:R.map(x=>x.join('.')),c:C.map(x=>x.join('.'))};}
  return null;}
function nnCheck(pz,s){const {R,C}=nnPz(pz),w=pz.w,h=pz.h;if(!/^[01]+$/.test(s)||s.length!==w*h)return false;const g=[...s].map(Number);
  for(let r=0;r<h;r++)if(nnClue(g.slice(r*w,r*w+w)).join('.')!==pz.r[r])return false;
  for(let c=0;c<w;c++)if(nnClue(u2Rng(h,r=>g[r*w+c])).join('.')!==pz.c[c])return false;return true;}
// a line shows green when it matches its clue, red when it has too much shaded
function nnLineSt(a,clue){const sh=a.filter(x=>x===1).length,sum=clue.reduce((x,y)=>x+y,0),mx=Math.max(...clue);
  const runs=nnClue(a.map(x=>x===1?1:0));if(runs.join('.')===clue.join('.'))return 'ok';if(sh>sum||runs.some(x=>x>mx))return 'bad';return '';}
GAMES.u_nono=u2Game({name:'نونوغرام',cls:'nn',lbc:'#3B5B7A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E6587"/><rect x="30" y="30" width="58" height="58" rx="5" fill="#F7F1E3"/>${[[0,1],[0,2],[1,0],[1,1],[1,2],[1,3],[2,1],[2,2],[3,0],[3,3]].map(([r,c])=>`<rect x="${32+c*14}" y="${32+r*14}" width="12" height="12" rx="2" fill="#2D4763"/>`).join('')}<g fill="#FFE08A" font-size="11" font-weight="800" text-anchor="middle"><text x="20" y="42">2</text><text x="20" y="56">4</text><text x="20" y="70">2</text><text x="20" y="84">1 1</text><text x="39" y="24">1</text><text x="53" y="24">3</text><text x="67" y="24">3</text><text x="81" y="24">2</text></g></svg>`,
  title:'ظلّل الخانات حسب أرقام كل صف وعمود',goal:'الأرقام تقول طول كل مجموعة مظللة وترتيبها.',lvTxt:['','5×5','8×8','10×10'],
  size:pz=>pz.w+'×'+pz.h,cap:(pz)=>pz.w<=5?240000:pz.w<=8?480000:720000,botT:pz=>pz.w*pz.h*1.5,
  gen:nnGen,check:nnCheck,
  solve(pz){const {R,C}=nnPz(pz);const g=nnSolve(pz.w,pz.h,R,C);return g?g.join(''):null;},
  spoil:(pz,s)=>{const i=u2R(s.length);return s.slice(0,i)+(s[i]==='1'?'0':'1')+s.slice(i+1);},
  init:pz=>'0'.repeat(pz.w*pz.h),sub:(pz,w)=>w.replace(/2/g,'0'),
  tap(a,i,pz,st){if(a==='md'&&(i===1||i===2)){st.md=i;return false;}return false;},
  // a drag paints the cells it crosses the way the first cell turned; it stays on the row or column it started along,
  // and a quick finger that skips cells still paints the ones between
  drag(kind,c,pz,st){if(kind==='up'){const was=st.pv!=null;st.pv=null;return was;}if(c.i<0)return false;const md=st.md||1,W=pz.w;
    const paint=i=>{const cur=st.w[i];if(cur===st.pv||st.pv!=='0'&&cur!=='0')return;st.w=setAt(st.w,i,st.pv);};
    if(kind==='down'){u2Push(st);const cur=st.w[c.i];st.pv=cur===String(md)?'0':String(md);st.w=setAt(st.w,c.i,st.pv);st.a=c.i;st.ax=null;st.lc=c.i;return 'r';}
    if(st.pv==null||c.i===st.lc)return false;const a=st.a,ar=Math.floor(a/W),ac=a%W;let r=Math.floor(c.i/W),cc=c.i%W;
    if(st.ax==null)st.ax=r===ar?'r':cc===ac?'c':Math.abs(cc-ac)>=Math.abs(r-ar)?'r':'c';if(st.ax==='r')r=ar;else cc=ac;
    const j=r*W+cc,lr=Math.floor(st.lc/W),lcc=st.lc%W;if(j===st.lc)return false;
    if(st.ax==='r')for(let x=Math.min(lcc,cc);x<=Math.max(lcc,cc);x++)paint(ar*W+x);else for(let y=Math.min(lr,r);y<=Math.max(lr,r);y++)paint(y*W+ac);
    st.lc=j;return 'r';},
  view(pz,w,st){const {R,C}=nnPz(pz),W=pz.w,H=pz.h,g=[...w].map(Number);
    const rs=u2Rng(H,r=>nnLineSt(g.slice(r*W,r*W+W),R[r])),cs=u2Rng(W,c=>nnLineSt(u2Rng(H,r=>g[r*W+c]),C[c]));
    const mx=Math.max(...R.map(x=>x.length)),my=Math.max(...C.map(x=>x.length));
    return `<div class="u2nn" style="--w:${W};--h:${H};--mx:${mx};--my:${my}"><i class="u2nn-k"></i>
      <div class="u2nn-cc">${C.map((x,c)=>`<span class="${cs[c]}">${x.map(n=>`<b>${n}</b>`).join('')}</span>`).join('')}</div>
      <div class="u2nn-rc">${R.map((x,r)=>`<span class="${rs[r]}">${x.map(n=>`<b>${n}</b>`).join('')}</span>`).join('')}</div>
      ${u2Grid('nn',W,H,i=>{const r=Math.floor(i/W),c=i%W;return [`c${w[i]}${c%5===4&&c<W-1?' er':''}${r%5===4&&r<H-1?' eb':''}`,w[i]==='2'?'×':''];})}</div>
      ${u2Seg('md',[[1,'⬛ ظلّل'],[2,'✕ علامة']],st.md||1)}`;}});
HELP.u_nono='لغز صور بالأرقام. الكل ياخذ نفس اللوحة بنفس الوقت، كل واحد على جواله (أو بالدور على نفس الجوال). الأرقام جنب كل صف وفوق كل عمود تقول أطوال المجموعات المظللة فيه بالترتيب، وبين كل مجموعتين خانة فاضية على الأقل (مثلًا «3 1»: ثلاث خانات مظللة ورا بعض، بعدين فراغ، بعدين خانة). اختار «ظلّل» أو «علامة ✕» (للخانات اللي متأكد إنها فاضية) والمس الخانات أو اسحب إصبعك عليها. الصف اللي يطابق أرقامه يصير أخضر، واللي فيه تظليل زايد يصير أحمر. أول ما تكمل الصورة الصح تنرسل لحالها. اللي عليه الدور يختار المستوى (5×5 أو 8×8 أو 10×10) وعدد الجولات. كل جولة: اللي حلّها ياخذ نقطة، والأسرع ياخذ نقطتين. الأكثر نقاط يفوز، وإذا تعادلوا يفوز الأقل وقت. ومع الفرق تنجمع نقاط الفريق.';

/* ========== 2. صفر وواحد (takuzu / binairo): fill 0 and 1, no three alike in a row, halves in every line, no two lines alike ========== */
// solutions of a board (-1 empty), up to lim; propagation first (pairs, gaps, full halves), then a guess on an empty cell
function bnCount(n,g0,lim,cap,rand){const h=n/2;let nodes=0;const sols=[];
  const L=[];for(let r=0;r<n;r++)L.push(u2Rng(n,c=>r*n+c));for(let c=0;c<n;c++)L.push(u2Rng(n,r=>r*n+c));
  function prop(g){let ch=true;while(ch){ch=false;
      for(const ln of L){let z=0,o=0;for(const i of ln){if(g[i]===0)z++;else if(g[i]===1)o++;}if(z>h||o>h)return false;
        if((z===h)!==(o===h)){const v=z===h?1:0;for(const i of ln)if(g[i]<0){g[i]=v;ch=true;}}
        for(let k=0;k+2<n;k++){const a=g[ln[k]],b=g[ln[k+1]],c=g[ln[k+2]];
          if(a>=0&&a===b&&a===c)return false;
          if(a>=0&&a===b&&c<0){g[ln[k+2]]=1-a;ch=true;}else if(b>=0&&b===c&&a<0){g[ln[k]]=1-b;ch=true;}else if(a>=0&&a===c&&b<0){g[ln[k+1]]=1-a;ch=true;}}}}
    // full lines of the same kind must differ
    const seen=new Set();for(let k=0;k<2*n;k++){const ln=L[k];if(ln.some(i=>g[i]<0))continue;const key=(k<n?'r':'c')+ln.map(i=>g[i]).join('');if(seen.has(key))return false;seen.add(key);}
    return true;}
  (function go(g){if(sols.length>=lim||++nodes>cap)return;if(!prop(g))return;const i=g.indexOf(-1);if(i<0){sols.push(g.join(''));return;}
    const vs=rand&&Math.random()<.5?[1,0]:[0,1];for(const v of vs){const x=g.slice();x[i]=v;go(x);if(sols.length>=lim)return;}})(g0.slice());
  return {sols,nodes,cut:nodes>cap};}
const bnArr=s=>[...s].map(x=>x==='.'?-1:+x);
function bnGen(lv){const n=[0,6,8,10][lv];
  for(;;){const full=bnCount(n,Array(n*n).fill(-1),1,3000,true).sols[0];if(!full)continue;const g=bnArr(full);
    // a cell is taken out only when the board still has one answer; on 10×10 that answer must come out by reasoning with very
    // little guessing (a small search cap), which keeps the board fair and makes it quick to deal on a slow phone
    const keep=[0,.5,.36,0][lv],order=u2Sh(u2Rng(n*n)),cap=lv===3?20:4000;let holes=0;
    for(const i of order){if(holes>=n*n*(1-keep))break;const v=g[i];g[i]=-1;const r=bnCount(n,g,2,cap);if(r.sols.length===1&&!r.cut)holes++;else g[i]=v;}
    return {n,g:g.map(x=>x<0?'.':x).join('')};}}
function bnCheck(pz,s){const n=pz.n;if(s.length!==n*n||!/^[01]+$/.test(s))return false;for(let i=0;i<n*n;i++)if(pz.g[i]!=='.'&&pz.g[i]!==s[i])return false;
  const r=bnCount(n,bnArr(s),1,10);return r.sols.length===1;}
// cells that break a rule: three alike, too many of one kind, a full line equal to another
function bnBad(n,w){const bad=new Set(),g=bnArr(w);const L=[];for(let r=0;r<n;r++)L.push(u2Rng(n,c=>r*n+c));for(let c=0;c<n;c++)L.push(u2Rng(n,r=>r*n+c));
  const full={};L.forEach((ln,k)=>{let z=0,o=0;ln.forEach(i=>{if(g[i]===0)z++;if(g[i]===1)o++;});if(z>n/2)ln.forEach(i=>{if(g[i]===0)bad.add(i);});if(o>n/2)ln.forEach(i=>{if(g[i]===1)bad.add(i);});
    for(let j=0;j+2<n;j++){const a=g[ln[j]];if(a>=0&&a===g[ln[j+1]]&&a===g[ln[j+2]])[0,1,2].forEach(x=>bad.add(ln[j+x]));}
    if(z+o===n){const key=(k<n?'r':'c')+ln.map(i=>g[i]).join('');if(full[key])[...full[key],...ln].forEach(i=>bad.add(i));else full[key]=ln;}});
  return bad;}
GAMES.u_bin=u2Game({name:'صفر وواحد',cls:'bn',lbc:'#C0603A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D97A4E"/><rect x="14" y="14" width="72" height="72" rx="8" fill="#FBF3E6"/>${[[0,0,1],[0,1,0],[0,2,0],[1,0,0],[1,2,1],[2,1,1],[2,2,0],[2,0,1]].map(([r,c,v])=>`<circle cx="${30+c*20}" cy="${30+r*20}" r="8" fill="${v?'#2D4763':'#F2A33A'}"/><text x="${30+c*20}" y="${34+r*20}" font-size="10" font-weight="900" fill="#fff" text-anchor="middle">${v}</text>`).join('')}</svg>`,
  title:'عبّ الخانات بصفر وواحد بدون ثلاثة ورا بعض',goal:'كل صف وعمود نصه أصفار ونصه آحاد، وما فيه صفين أو عمودين متطابقين.',lvTxt:['','6×6','8×8','10×10'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=6?240000:pz.n<=8?480000:720000,botT:pz=>[...pz.g].filter(x=>x==='.').length*1.7,
  gen:bnGen,check:bnCheck,solve:pz=>bnCount(pz.n,bnArr(pz.g),1,200000).sols[0]||null,
  spoil:(pz,s)=>{const i=[...pz.g].findIndex(x=>x==='.');return i<0?'':s.slice(0,i)+(s[i]==='1'?'0':'1')+s.slice(i+1);},
  init:pz=>pz.g,sub:(pz,w)=>w.includes('.')?'':w,
  tap:()=>false,
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0||pz.g[c.i]!=='.')return false;u2Push(st);const v=st.w[c.i];st.w=setAt(st.w,c.i,v==='.'?'0':v==='0'?'1':'.');return true;},
  view(pz,w){const n=pz.n,bad=bnBad(n,w);const left=[...w].filter(x=>x==='.').length;
    return u2Grid('bn',n,n,i=>{const v=w[i];return [`${pz.g[i]!=='.'?'fx':''} ${v==='.'?'':'v'+v} ${bad.has(i)?'bad':''}`,v==='.'?'':`<s>${v}</s>`];})+`<p class="note u2n">${left?`باقي ${left} خانة`:bad.size?'فيه غلط بالخانات الحمرا':''}</p>`;}});
HELP.u_bin='الكل ياخذ نفس اللوحة بنفس الوقت. المس الخانة الفاضية: لمسة تحط 0، الثانية 1، والثالثة تفضّيها (الخانات اللي بدت معك ثابتة). القواعد: (1) ما يجي ثلاث أصفار أو ثلاث آحاد ورا بعض لا بالصف ولا بالعمود، (2) كل صف وكل عمود نصه أصفار ونصه آحاد، (3) ما فيه صفين متطابقين ولا عمودين متطابقين. الخانات اللي تكسر قاعدة تصير حمرا. أول ما تكمل اللوحة صح تنرسل لحالها. المستويات 6×6 و8×8 و10×10. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 3. أطفئ الأنوار (lights out): a press flips a light and its four neighbours, put them all out ========== */
const LO_N=[0,4,5,6];
function loApply(n,g,p){const a=[...g].map(Number);for(let i=0;i<n*n;i++)if(p[i]==='1'){const r=Math.floor(i/n),c=i%n;for(const [dr,dc] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n)a[rr*n+cc]^=1;}}return a.join('');}
// presses that clear the board: Gauss elimination over GF(2)
function loSolve(n,g){const N=n*n,M=u2Rng(N,i=>{const row=new Uint8Array(N+1);const r=Math.floor(i/n),c=i%n;for(const [dr,dc] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n)row[rr*n+cc]=1;}row[N]=+g[i];return row;});
  const piv=[];let r=0;for(let c=0;c<N&&r<N;c++){let k=r;while(k<N&&!M[k][c])k++;if(k===N)continue;[M[r],M[k]]=[M[k],M[r]];for(let j=0;j<N;j++)if(j!==r&&M[j][c])for(let x=c;x<=N;x++)M[j][x]^=M[r][x];piv.push(c);r++;}
  for(let j=r;j<N;j++)if(M[j][N])return null;const x=Array(N).fill(0);piv.forEach((c,k)=>{x[c]=M[k][N];});return x.join('');}
function loGen(lv){const n=LO_N[lv],k=[0,4,7,12][lv];for(;;){const p=Array(n*n).fill('0');u2Sh(u2Rng(n*n)).slice(0,k+u2R(3)).forEach(i=>{p[i]='1';});const g=loApply(n,'0'.repeat(n*n),p.join(''));if(g.split('1').length>4)return {n,g};}}
GAMES.u_light=u2Game({name:'أطفئ الأنوار',cls:'lo',lbc:'#2B3A55',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#26334D"/>${u2Rng(16,i=>{const r=Math.floor(i/4),c=i%4,on=[1,4,5,6,9,14].includes(i);return `<rect x="${13+c*19}" y="${13+r*19}" width="16" height="16" rx="4" fill="${on?'#FFD54A':'#3D4F70'}"/>${on?`<circle cx="${21+c*19}" cy="${21+r*19}" r="4" fill="#FFF6C2"/>`:''}`;}).join('')}</svg>`,
  title:'طفّ كل الأنوار',goal:'كل لمسة تقلب اللمبة واللي جنبها فوق وتحت ويمين ويسار.',lvTxt:['','4×4','5×5','6×6'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>[0,0,0,0,180000,300000,420000][pz.n],botT:pz=>pz.n*pz.n*1.5+[...pz.g].filter(x=>x==='1').length*2,
  gen:loGen,check:(pz,s)=>s.length===pz.n*pz.n&&/^[01]+$/.test(s)&&!loApply(pz.n,pz.g,s).includes('1'),solve:pz=>loSolve(pz.n,pz.g),
  spoil:(pz,s)=>{const i=u2R(s.length);return s.slice(0,i)+(s[i]==='1'?'0':'1')+s.slice(i+1);},
  init:pz=>({p:'0'.repeat(pz.n*pz.n),m:0,l:-1}),sub:(pz,w)=>w.p,tap:()=>false,
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0)return false;u2Push(st);st.w={p:setAt(st.w.p,c.i,st.w.p[c.i]==='1'?'0':'1'),m:st.w.m+1,l:c.i};return true;},
  view(pz,w){const n=pz.n,g=loApply(n,pz.g,w.p),on=[...g].filter(x=>x==='1').length;
    return u2Grid('lo',n,n,i=>[`${g[i]==='1'?'on':''} ${w.l===i?'last':''}`,'<s></s>'])+`<p class="note u2n">💡 ${on} شغّالة • ${w.m} لمسة</p>`;}});
HELP.u_light='الكل ياخذ نفس اللوحة بنفس الوقت. فيها لمبات شغالة، وهدفك تطفيها كلها. كل لمسة على مربع تقلب حالته وحالة المربعات اللي تلاصقه من فوق وتحت ويمين ويسار (الشغالة تطفى والطافية تشتغل). فكّر قبل تلمس، ولمستين على نفس المربع كأنك ما لمسته. أول ما تطفى كلها تنرسل لحالها. المستويات 4×4 و5×5 و6×6. كل جولة: اللي طفاها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 4. لغز الخمسطعش (sliding tiles): only shuffles that can be solved ========== */
const SL_CH='0123456789abcdefghijklmno';
// the blank moves: U D L R (the tile on that side slides into the blank)
const SLD={U:[-1,0],D:[1,0],L:[0,-1],R:[0,1]};
function slPlay(n,g,mv){const a=[...g];let z=a.indexOf('0');for(const m of mv){const d=SLD[m];if(!d)return null;const r=Math.floor(z/n)+d[0],c=z%n+d[1];if(r<0||c<0||r>=n||c>=n)return null;const j=r*n+c;a[z]=a[j];a[j]='0';z=j;}return a.join('');}
const slGoal=n=>SL_CH.slice(1,n*n)+'0';
// solvable: the inversions (and, on even sizes, the blank's row from the bottom) have the right parity
function slOk(n,a){let inv=0;const t=a.filter(x=>x!=='0').map(x=>SL_CH.indexOf(x));for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++)if(t[i]>t[j])inv++;
  if(n%2)return inv%2===0;const zr=n-Math.floor(a.indexOf('0')/n);return (inv+zr)%2===1;}
function slDist(n,g){let s=0;for(let i=0;i<n*n;i++){const v=SL_CH.indexOf(g[i]);if(!v)continue;s+=Math.abs(Math.floor(i/n)-Math.floor((v-1)/n))+Math.abs(i%n-(v-1)%n);}return s;}
function slGen(lv){const n=lv===1?3:4;
  if(lv===2){for(;;){let g=slGoal(n),last='';for(let k=0;k<44;k++){const opts='UDLR'.split('').filter(m=>m!=={U:'D',D:'U',L:'R',R:'L'}[last]&&slPlay(n,g,m));last=opts[u2R(opts.length)];g=slPlay(n,g,last);}if(slDist(n,g)>=22)return {n,g};}}
  for(;;){const a=u2Sh([...slGoal(n)]);if(slOk(n,a)&&slDist(n,a.join(''))>=(n===3?12:30))return {n,g:a.join('')};}}
// distance plus linear conflicts (two tiles in their own row or column but in the wrong order must pass each other)
function slH(n,g){let s=0;const pos=[];for(let i=0;i<n*n;i++){const v=SL_CH.indexOf(g[i]);if(!v)continue;const gr=Math.floor((v-1)/n),gc=(v-1)%n;s+=Math.abs(Math.floor(i/n)-gr)+Math.abs(i%n-gc);pos[i]=[gr,gc];}
  for(let r=0;r<n;r++)for(let a=0;a<n;a++){const pa=pos[r*n+a];if(!pa||pa[0]!==r)continue;for(let b=a+1;b<n;b++){const pb=pos[r*n+b];if(pb&&pb[0]===r&&pb[1]<pa[1])s+=2;}}
  for(let c=0;c<n;c++)for(let a=0;a<n;a++){const pa=pos[a*n+c];if(!pa||pa[1]!==c)continue;for(let b=a+1;b<n;b++){const pb=pos[b*n+c];if(pb&&pb[1]===c&&pb[0]<pa[0])s+=2;}}
  return s;}
// a bot's way through: best-first search (weighted, so it is quick, not shortest), capped by nodes
function slSolve(n,g){const goal=slGoal(n),W=n===3?2:3,H=slH;const seen=new Set([g]);const open=[[H(n,g)*W,g,'']];let nodes=0;
  const push=x=>{open.push(x);let i=open.length-1;while(i>0){const p=(i-1)>>1;if(open[p][0]<=open[i][0])break;[open[p],open[i]]=[open[i],open[p]];i=p;}};
  const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<open.length&&open[l][0]<open[m][0])m=l;if(r<open.length&&open[r][0]<open[m][0])m=r;if(m===i)break;[open[m],open[i]]=[open[i],open[m]];i=m;}}return top;};
  while(open.length&&nodes++<60000){const [,s,p]=pop();if(s===goal)return p;for(const m of 'UDLR'){const t=slPlay(n,s,m);if(!t||seen.has(t))continue;seen.add(t);push([p.length+1+H(n,t)*W,t,p+m]);}}
  return null;}
GAMES.u_slide=u2Game({name:'لغز الخمسطعش',cls:'sl',lbc:'#8B5A2B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#A06A38"/><rect x="10" y="10" width="80" height="80" rx="9" fill="#6E4422"/>${u2Rng(15,i=>{const r=Math.floor(i/4),c=i%4;return `<rect x="${13+c*19}" y="${13+r*19}" width="17" height="17" rx="4" fill="#F3D9A6"/><text x="${21.5+c*19}" y="${26+r*19}" font-size="10" font-weight="900" fill="#6E4422" text-anchor="middle">${[3,1,7,4,9,2,15,8,5,13,10,12,14,6,11][i]}</text>`;}).join('')}</svg>`,
  title:'رتّب البلاطات من 1 للآخر',goal:'المس بلاطة بنفس صف أو عمود الفراغ عشان تزحلقها.',lvTxt:['','3×3','4×4','4×4 لخبطة'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n===3?240000:600000,botT:pz=>pz.n===3?40:slDist(pz.n,pz.g)*3.2,
  gen:slGen,check:(pz,s)=>/^[UDLR]+$/.test(s)&&slPlay(pz.n,pz.g,s)===slGoal(pz.n),solve:pz=>slSolve(pz.n,pz.g),
  spoil:(pz,s)=>s.slice(0,-1),
  init:pz=>({g:pz.g,m:''}),sub:(pz,w)=>w.m,tap:()=>false,
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0)return false;const n=pz.n,z=st.w.g.indexOf('0'),zr=Math.floor(z/n),zc=z%n,r=Math.floor(c.i/n),cc=c.i%n;
    if(c.i===z||(r!==zr&&cc!==zc))return false;const mv=r===zr?(cc>zc?'R':'L').repeat(Math.abs(cc-zc)):(r>zr?'D':'U').repeat(Math.abs(r-zr));
    const g=slPlay(n,st.w.g,mv);if(!g)return false;u2Push(st);st.w={g,m:(st.w.m+mv).slice(0,7000)};return true;},
  view(pz,w){const n=pz.n,goal=slGoal(n);const t=[];for(let i=0;i<n*n;i++){const v=w.g[i];if(v==='0')continue;const k=SL_CH.indexOf(v);
      t[k]=`<b data-k="t${k}" class="${goal[i]===v?'ok':''}" style="transform:translate(${i%n*100}%,${Math.floor(i/n)*100}%)">${k}</b>`;}
    return `<div class="u2sl" id="u2g-sl" data-ud="sl" data-w="${n}" data-h="${n}" style="--w:${n}">${t.join('')}</div><p class="note u2n">${w.m.length} حركة</p>`;}});
HELP.u_slide='اللغز المشهور: بلاطات مرقمة ومربع فاضي واحد. الكل ياخذ نفس اللخبطة بنفس الوقت. المس أي بلاطة بنفس صف أو عمود الفراغ وتتزحلق هي واللي بينها وبين الفراغ. رتّبها من 1 للآخر صف صف (من فوق، ومن اليسار لليمين) والفراغ بالزاوية تحت. اللخبطة دايم ممكن تنحل. البلاطة اللي بمكانها الصح تتلون. المستويات: 3×3، و4×4 لخبطة خفيفة، و4×4 لخبطة كاملة. كل جولة: اللي رتبها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 5. سباق المتاهة (maze race): a perfect maze, so exactly one way out ========== */
const MZ_SZ=[0,8,11,14];
// walls per cell: 1 east, 2 south (the outer frame is always closed); start top right, exit bottom left
function mzGen(lv){const n=MZ_SZ[lv],N=n*n,w=Array(N).fill(3),seen=new Uint8Array(N),st=[n-1];seen[n-1]=1;
  while(st.length){const i=st[st.length-1],r=Math.floor(i/n),c=i%n;const nb=[];if(r>0&&!seen[i-n])nb.push(i-n);if(r<n-1&&!seen[i+n])nb.push(i+n);if(c>0&&!seen[i-1])nb.push(i-1);if(c<n-1&&!seen[i+1])nb.push(i+1);
    if(!nb.length){st.pop();continue;}const j=nb[u2R(nb.length)];if(j===i+1)w[i]&=~1;else if(j===i-1)w[j]&=~1;else if(j===i+n)w[i]&=~2;else w[j]&=~2;seen[j]=1;st.push(j);}
  return {n,m:w.join('')};}
function mzOpen(pz,i,m){const n=pz.n,r=Math.floor(i/n),c=i%n,W=k=>+pz.m[k];
  if(m==='R')return c<n-1&&!(W(i)&1)?i+1:-1;if(m==='L')return c>0&&!(W(i-1)&1)?i-1:-1;if(m==='D')return r<n-1&&!(W(i)&2)?i+n:-1;if(m==='U')return r>0&&!(W(i-n)&2)?i-n:-1;return -1;}
const mzStart=pz=>pz.n-1,mzEnd=pz=>pz.n*(pz.n-1);
function mzCheck(pz,s){if(!/^[UDLR]+$/.test(s))return false;let i=mzStart(pz);for(const m of s){i=mzOpen(pz,i,m);if(i<0)return false;}return i===mzEnd(pz);}
function mzSolve(pz){const from=new Map([[mzStart(pz),'']]),q=[mzStart(pz)];while(q.length){const i=q.shift();if(i===mzEnd(pz))return from.get(i);for(const m of 'UDLR'){const j=mzOpen(pz,i,m);if(j>=0&&!from.has(j)){from.set(j,from.get(i)+m);q.push(j);}}}return null;}
const MZBK={U:'D',D:'U',L:'R',R:'L'};
// a step: back over the last step, or on to an open cell next to the head (a loop back onto the trail cuts it there)
function mzStep(pz,w,m){const p=w.p,head=p[p.length-1],j=mzOpen(pz,head,m);if(j<0)return false;const k=p.indexOf(j);if(k>=0)p.length=k+1;else p.push(j);return true;}
function mzMoves(pz,p){let s='';for(let k=1;k<p.length;k++){const a=p[k-1],b=p[k];s+=b===a+1?'R':b===a-1?'L':b===a+pz.n?'D':'U';}return s;}
// moves the ball to cell j: a neighbour, or along a straight open line
function mzRun(pz,w,j){const n=pz.n,head=w.p[w.p.length-1];if(j===head)return false;const r=Math.floor(head/n),c=head%n,jr=Math.floor(j/n),jc=j%n;if(r!==jr&&c!==jc)return false;
  const m=r===jr?(jc>c?'R':'L'):(jr>r?'D':'U');let i=head;const steps=[];while(i!==j){const k=mzOpen(pz,i,m);if(k<0)return false;steps.push(m);i=k;}for(const s of steps)mzStep(pz,w,s);return true;}
GAMES.u_maze=u2Game({name:'سباق المتاهة',cls:'mz',lbc:'#2E7D5B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2F8A63"/><rect x="12" y="12" width="76" height="76" rx="6" fill="#E9F5DF"/><path d="M12 12H88V88H12V12M31 12V50M50 31V69H31M69 12V31M88 50H69V88M12 69H31V88M50 88V69" stroke="#1E5A40" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M78 22H59V40H40V59H22V78" stroke="#F2A33A" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="1 7"/><circle cx="78" cy="22" r="6" fill="#EC6158"/><path d="M17 74l5 6 5-6" stroke="#EC6158" stroke-width="3" fill="none"/></svg>`,
  title:'اطلع من المتاهة قبل الكل',goal:'اسحب الكرة من الزاوية فوق يمين لين المخرج تحت يسار.',lvTxt:['','8×8','11×11','14×14'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=8?180000:pz.n<=11?300000:420000,botT:pz=>pz.n*pz.n*.38,
  gen:mzGen,check:mzCheck,solve:mzSolve,spoil:(pz,s)=>s.slice(0,-2),
  init:pz=>({p:[mzStart(pz)]}),sub:(pz,w)=>w.p[w.p.length-1]===mzEnd(pz)?mzMoves(pz,w.p):'',
  tap(a,i,pz,st){if(a!=='mv'||!'UDLR'[i])return false;u2Push(st);let k=0;const m='UDLR'[i];
    // an arrow runs along a corridor until it turns or splits
    for(;k<60;){if(!mzStep(pz,st.w,m))break;k++;const h=st.w.p[st.w.p.length-1];const ex='UDLR'.split('').filter(x=>x!==MZBK[m]&&mzOpen(pz,h,x)>=0);if(ex.length!==1||ex[0]!==m||h===mzEnd(pz))break;}
    if(!k)st.h.pop();return k>0;},
  // a drag walks the ball cell by cell (a jump along a straight open line counts); back over the trail undoes it
  drag(kind,c,pz,st){if(kind==='up'){const was=st.dg;st.dg=false;return was?true:false;}if(c.i<0)return false;const w=st.w,head=w.p[w.p.length-1];
    if(kind==='down'){u2Push(st);if(w.p.includes(c.i)){st.dg=true;if(c.i!==head){w.p.length=w.p.indexOf(c.i)+1;return true;}return false;}
      if(mzRun(pz,w,c.i))return true;st.h.pop();return false;}
    if(!st.dg||c.i===head)return false;return mzRun(pz,w,c.i)?'r':false;},
  view(pz,w){const n=pz.n,U=10,p=w.p,head=p[p.length-1];let d='';
    for(let i=0;i<n*n;i++){const r=Math.floor(i/n),c=i%n,v=+pz.m[i];if(v&1&&c<n-1)d+=`M${(c+1)*U} ${r*U}v${U}`;if(v&2&&r<n-1)d+=`M${c*U} ${(r+1)*U}h${U}`;}
    const X=i=>(i%n+.5)*U,Y=i=>(Math.floor(i/n)+.5)*U;const e=mzEnd(pz);
    return `<div class="u2mzw"><svg class="u2mz" id="u2g-mz" data-ud="mz" data-w="${n}" data-h="${n}" viewBox="0 0 ${n*U} ${n*U}">
      <rect x="${(e%n)*U}" y="${Math.floor(e/n)*U}" width="${U}" height="${U}" class="ex"/><path class="wl" d="M0 0H${n*U}V${n*U}H0Z${d}"/>
      <polyline class="tr" points="${p.map(i=>X(i)+','+Y(i)).join(' ')}"/><circle class="bl" cx="${X(head)}" cy="${Y(head)}" r="${U*.32}"/></svg></div>
      <div class="u2pad">${[['L','◀',2],['U','▲',0],['D','▼',1],['R','▶',3]].map(([m,t,k])=>`<button class="btn soft u2p${m}" data-ga="mv" data-i="${k}">${t}</button>`).join('')}</div>`;}});
HELP.u_maze='الكل ياخذ نفس المتاهة بنفس الوقت. الكرة الحمرا تبدأ بالزاوية فوق على اليمين، والمخرج المظلل بالزاوية تحت على اليسار، وفيه طريق واحد بس يوصل له. اسحب الكرة بإصبعك بين الممرات (أو المس خانة بخط مستقيم مفتوح، أو استخدم الأسهم: السهم يمشي بالممر لين أول لفة أو مفترق). ارجع على خطك عشان تمسحه. أول ما توصل المخرج تنرسل لحالها. المستويات 8×8 و11×11 و14×14. كل جولة: اللي طلع نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

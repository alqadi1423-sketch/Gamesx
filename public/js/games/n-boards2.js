'use strict';
/* boards2: traditional board games. Two-sided games use the side rotation of chess.js (tmSeats, tmNow, tmPass, tmName,
   tmWin, tmSkip): with more than two players even seats play one side and odd seats the other, and the members of a side
   take turns moving for it. Every top-level name here starts with b2 so it never meets another file's names. */

/* ================= shared ================= */
const B2W=1e6;
// UI-only selection, dropped by itself once the board changes
const b2K=d=>d.gid+':'+(d.mvn||0);
const b2Sel=d=>S.b2&&S.b2.k===b2K(d)?S.b2:null;
function b2Pick(d,o){S.b2=o?{...o,k:b2K(d)}:null;render();}
// side s moved: the other side plays next (its member due now), the move counter goes on
const b2Pass=(d,s,x)=>({...d,...x,sd:1-s,...tmPass(d,s),mvn:(d.mvn||0)+1});
const b2Won=(d,s,end,x)=>({...d,...x,...tmWin(d,s),end,mvn:(d.mvn||0)+1});
const b2Rnd=a=>a[rnd(a.length)];
function b2Stat(d,ctx,names,tail){let s=d.last?`<small>${d.last}</small><br>`:'';const me=!ctx.local&&d.turn===ctx.v;
  s+=`${me?'<b class="yt">دورك</b>':`دور ${tmName(d,d.sd)}`} <span class="chside ${d.sd?'bk':''}">${names[d.sd]}</span>`;
  return s+(tail?' '+tail:'');}
function b2Resign(d){if(!S.b2Sure){S.b2Sure=1;toast('اضغط استسلم مرة ثانية للتأكيد');setTimeout(()=>{S.b2Sure=0;},2500);return;}
  S.b2Sure=0;const s=d.sd;act(b2Won(d,1-s,'resign',{last:`${tmName(d,s)} استسلم`}));}
const b2ResignBtn=ctx=>ctx.my?'<div class="row chact"><button class="btn" data-ga="resign">استسلم</button></div>':'';
function b2WinTxt(d,names,why){if(d.win==='d')return (why&&why[d.end])||'تعادل';const sd=d.win%2;
  return `فاز ${names[sd]}${d.end==='resign'?' بالاستسلام':d.end==='left'?'، الخصم طلع':why&&why[d.end]?'، '+why[d.end]:''}`;}
// the side whose view is drawn at the bottom: online a side-1 player sees the board turned round
const b2Flip=(d,ctx)=>!ctx.local&&tmMySide(d,ctx)===1;
const b2Rep=(hist,k)=>hist.filter(x=>x===k).length;
function b2Hash(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}

/* the board of points: a drawing (svg, board units W×H) under one element per point, placed at its (x,y).
   Every point is always drawn in the same order, so a patch never moves a piece from one point to another */
function b2Board(cls,W,H,sz,bg,pts,flip,my){
  let h=`<div class="b2bd ${cls} ${my?'my':''}" style="aspect-ratio:${W}/${H};--pw:${(sz/W*100).toFixed(2)}%;--ph:${(sz/H*100).toFixed(2)}%">${bg}`;
  for(const p of pts){const x=flip?W-p.x:p.x,y=flip?H-p.y:p.y,tap=p.i!=null;
    h+=`<${tap?'button':'div'} class="b2pt ${p.c||''}" data-q="${p.q}" style="left:${((x-sz/2)/W*100).toFixed(2)}%;top:${((y-sz/2)/H*100).toFixed(2)}%"${tap?` data-ga="${p.ga||'pt'}" data-i="${p.i}"`:''}>${p.p||''}</${tap?'button':'div'}>`;}
  return h+'</div>';}
const b2Stone=(side,cls,x)=>`<i class="b2s s${side} ${cls||''}">${x||''}</i>`;
// a piece taken by the last move fades where it stood (invisible without motion)
const b2Ghost=(d,q)=>{for(const [c,s] of d.lc||[])if(c===q)return `<i class="b2s s${s} b2gh" data-k="g${d.mvn||0}"></i>`;return '';};
// the classes every point shares: last move (lm the landing point, lmf the way there), selected, legal target, movable
function b2Cls(d,q,o){const L=d.lm||[];const c=[];if(L.length&&L[L.length-1]===q)c.push('lm','lmt');else if(L.includes(q))c.push('lmf');
  if(o){if(o.sel===q)c.push('sel');if(o.to&&o.to.has(q))c.push('to');if(o.cap&&o.cap.has(q))c.push('cap');if(o.mv&&o.mv.has(q))c.push('mv');}return c.join(' ');}
// motion: the piece on the last point of d.lm slides along the earlier points (look only, nothing waits for it)
function b2Fly(tag,d){const L=d.lm;const k=tag+d.gid+':'+(d.mvn||0);if(S.b2Fx===k)return;S.b2Fx=k;if(!L||L.length<2)return;
  const q=x=>app.querySelector(`.b2bd [data-q="${x}"]`);const el=q(L[L.length-1]),via=L.slice(0,-1).map(q);
  if(el&&via.every(Boolean))bdFly(el.querySelector('.b2s'),via,Math.min(450,230+80*(L.length-2)));}
const b2Dots=(xy,r)=>`<g class="b2dt">${xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
const b2Line=(a,b,c)=>`<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}"${c?` class="${c}"`:''}/>`;

/* the search: negamax with alpha-beta and iterative deepening over whole turns, capped by a node budget (never by time
   alone). P.moves(p), P.play(p,m) -> position, P.ev(p) for the side to move p.sd, P.end(p,ply) null or a final value.
   A move after which the same side moves again keeps the window. Each level has its own depth, budget and noise */
const B2STOP={};
function b2Think(p0,P,lv,cfg){const cap=cfg.cap[lv],maxD=cfg.dep[lv],ns=cfg.ns[lv];let nodes=0,lim=Infinity;
  function nega(p,dep,a,b,ply){if(++nodes>lim)throw B2STOP;const e=P.end(p,ply);if(e!=null)return e;if(dep<=0)return P.ev(p);
    let ms=P.moves(p);if(!ms.length)return P.stuck?P.stuck(p,ply):-(B2W-ply);if(P.order)ms=P.order(p,ms);
    let best=-Infinity;for(const m of ms){const q=P.play(p,m);const v=q.sd===p.sd?nega(q,dep-1,a,b,ply+1):-nega(q,dep-1,-b,-a,ply+1);
      if(v>best)best=v;if(v>a)a=v;if(a>=b)break;}return best;}
  let ms=P.moves(p0);if(!ms.length)return null;if(ms.length===1)return ms[0];if(P.order)ms=P.order(p0,ms);
  const root=ms.map(m=>({m,q:P.play(p0,m),n:Math.random()*ns,v:0}));let best=root[0].m;
  for(let dep=1;dep<=maxD;dep++){lim=dep===1?Infinity:cap;let bv=-Infinity,bm=null;
    try{for(const o of root){const q=o.q;o.v=(q.sd===p0.sd?nega(q,dep-1,bv-o.n,Infinity,1):-nega(q,dep-1,-Infinity,-(bv-o.n),1))+o.n;if(o.v>bv){bv=o.v;bm=o.m;}}}
    catch(e){if(e!==B2STOP)throw e;if(bm)best=bm;break;}
    best=bm;root.sort((x,y)=>y.v-x.v);if(Math.abs(bv)>B2W/2)break;}
  return best;}
const b2End=(p,ply)=>p.w==null?null:p.w==='d'?0:p.w===p.sd?B2W-ply:-(B2W-ply);
const B2TEAM={teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,start:d=>({...d,turn:0}),onSkip:tmSkip};

/* ================= المنقلة: oware abapa ================= */
// pits 0..5 are side 0's row (left to right from its seat), 6..11 side 1's; seeds go round with the index (counter-clockwise)
const b2owRow=(p,s)=>{let n=0;for(let k=0;k<6;k++)n+=p[s*6+k];return n;};
function b2owSow(pits,i){const p=[...pits];let n=p[i],j=i;p[i]=0;const got=[];while(n){j=(j+1)%12;if(j===i)continue;p[j]++;n--;got.push(j);}return {p,j,got};}
// one move: sow, then take 2s and 3s backwards on the other side; a move that would take all its seeds takes nothing
function b2owMove(pits,s,i){const r=b2owSow(pits,i),p=r.p;let j=r.j;const o=1-s,caps=[];
  while(Math.floor(j/6)===o&&(p[j]===2||p[j]===3)){caps.push(j);j=(j+11)%12;}
  let n=0;if(caps.length){const q=[...p];caps.forEach(c=>{n+=q[c];q[c]=0;});if(b2owRow(q,o))return {p:q,caps,n,got:r.got};}
  return {p,caps:[],n:0,got:r.got,slam:caps.length>0};}
// when the other side has no seeds, only a move that gives it some is allowed
function b2owLegal(p,s){const mine=[0,1,2,3,4,5].map(k=>s*6+k).filter(i=>p[i]>0);if(b2owRow(p,1-s))return mine;return mine.filter(i=>b2owRow(b2owSow(p,i).p,1-s)>0);}
function b2owFinish(nd,why){const kp=[...nd.kp],p=[...nd.p];for(const s of [0,1]){kp[s]+=b2owRow(p,s);for(let k=0;k<6;k++)p[s*6+k]=0;}
  const x={...nd,p,kp};if(kp[0]===kp[1])return {...x,win:'d',end:why};return {...x,...tmWin(nd,kp[0]>kp[1]?0:1),end:why};}
function b2owDo(d,i){const s=d.sd,r=b2owMove(d.p,s,i);const kp=[...d.kp];kp[s]+=r.n;const quiet=r.n?0:(d.quiet||0)+1;
  const key=r.p.join(',')+(1-s);const hist=r.n?[key]:[...(d.hist||[]),key].slice(-60);
  let nd=b2Pass(d,s,{p:r.p,kp,quiet,hist,lm:[i],got:r.got,cp:r.caps,last:`${tmName(d,s)} وزّع ${d.p[i]} حبة${r.n?` وأخذ ${r.n}`:r.slam?' (ما ياخذ كل حب الخصم)':''}`});
  if(kp[s]>24)return {...nd,...tmWin(d,s),end:'more'};if(kp[0]===24&&kp[1]===24)return {...nd,win:'d',end:'half'};
  if(!b2owLegal(r.p,1-s).length)return b2owFinish(nd,'stuck');
  if(quiet>=100||b2Rep(hist,key)>=3)return b2owFinish(nd,'loop');
  return nd;}
const B2OWP={moves:p=>b2owLegal(p.p,p.sd),play(p,i){const s=p.sd,r=b2owMove(p.p,s,i);const kp=[...p.kp];kp[s]+=r.n;let w=null;
    if(kp[s]>24)w=s;else if(kp[0]===24&&kp[1]===24)w='d';else if(!b2owLegal(r.p,1-s).length){const t=[kp[0]+b2owRow(r.p,0),kp[1]+b2owRow(r.p,1)];w=t[0]===t[1]?'d':t[0]>t[1]?0:1;}
    return {p:r.p,kp,sd:1-s,w};},
  ev:p=>{const s=p.sd;return (p.kp[s]-p.kp[1-s])*10+(b2owRow(p.p,s)-b2owRow(p.p,1-s))*.6;},end:b2End,
  stuck:()=>0};
// 14 seed spots inside a pit (percent of the pit)
const B2SEED=[[50,50],[34,40],[64,38],[40,66],[62,64],[50,26],[26,56],[74,52],[50,76],[30,28],[70,26],[28,74],[72,74],[50,40]];
GAMES.b_mancala={...B2TEAM,name:'المنقلة',cat:'board',lbc:'#8A5A2B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F7D5A"/><rect x="8" y="22" width="84" height="56" rx="26" fill="#B47A43"/><rect x="8" y="22" width="84" height="56" rx="26" fill="none" stroke="#7A4A22" stroke-width="3"/>${[0,1,2].map(c=>[0,1].map(r=>`<ellipse cx="${30+c*20}" cy="${39+r*22}" rx="8.5" ry="8" fill="#6E4120"/>`).join('')).join('')}${[[28,38],[32,41],[50,60],[47,57],[53,62],[70,38],[68,42],[72,40]].map(([x,y],k)=>`<circle cx="${x}" cy="${y}" r="2.6" fill="${['#F2E6C9','#E7C86F','#C8D9E8'][k%3]}"/>`).join('')}</svg>`,
  init:()=>({p:Array(12).fill(4),kp:[0,0],sd:0,tr:[0,0],quiet:0,hist:[],lm:null,got:[],cp:[],mvn:0,last:''}),
  onTimeout(d){return b2owDo(d,b2Rnd(b2owLegal(d.p,d.sd)));},
  points:d=>d.pl.map((_,s)=>`${s%2?'فوق':'تحت'} ${d.kp[s%2]}`),
  winText:d=>b2WinTxt(d,['اللي تحت','اللي فوق'],{half:'تعادل 24 و24',more:'جمع أكثر من 24',stuck:'الخصم ما يقدر يعطيه، وكل واحد أخذ اللي في جهته',loop:'اللعب صار يدور، وكل واحد أخذ اللي في جهته',d:'تعادل'}),
  status:(d,ctx)=>b2Stat(d,ctx,['اللي تحت','اللي فوق'],b2owRow(d.p,1-d.sd)?'':'<br><small>جهة الخصم فاضية: لازم تعطيه حب</small>'),
  render(d,ctx){const flip=b2Flip(d,ctx),my=ctx.my,lg=my?new Set(b2owLegal(d.p,d.sd)):new Set();
    const got=new Map((d.got||[]).map((j,k)=>[j,k]));const cp=new Set(d.cp||[]);
    const pit=i=>{const n=d.p[i],can=lg.has(i),k=got.get(i);let seeds='';for(let j=0;j<Math.min(n,14);j++){const [x,y]=B2SEED[j];seeds+=`<i class="sd c${(i*7+j)%4}" style="left:${x}%;top:${y}%"></i>`;}
      return `<${can?'button':'div'} class="owp ${can?'can':''} ${d.lm&&d.lm[0]===i?'lmf':''} ${cp.has(i)?'cpt':''}" ${can?`data-ga="pit" data-i="${i}"`:''}>${seeds}<b class="${k!=null?'got':''}"${k!=null?` data-k="c${d.mvn}" style="--dl:${Math.min(k*25,250)}ms"`:''}>${n}</b></${can?'button':'div'}>`;};
    const top=flip?[0,1,2,3,4,5].reverse():[6,7,8,9,10,11].reverse(),bot=flip?[6,7,8,9,10,11]:[0,1,2,3,4,5];
    const tray=s=>`<div class="owt ${s?'t1':'t0'}"><b>${d.kp[s]}</b><small>${s?'فوق':'تحت'}</small></div>`;
    return `<div class="b2ow bd-b2"><div class="owbd">${tray(flip?0:1)}<div class="owrw">${top.map(pit).join('')}${bot.map(pit).join('')}</div>${tray(flip?1:0)}</div></div>`;},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='pit'&&b2owLegal(d.p,d.sd).includes(i))act(b2owDo(d,i));},
  bot(d,s,lv){const ms=b2owLegal(d.p,d.sd);if(lv===1&&Math.random()<.3)return b2owDo(d,b2Rnd(ms));
    const m=b2Think({p:d.p,kp:d.kp,sd:d.sd,w:null},B2OWP,lv,{dep:[0,2,5,12],cap:[0,2000,20000,90000],ns:[0,14,4,.5]});return b2owDo(d,m!=null?m:b2Rnd(ms));},
  botDelay:()=>500+rnd(400)};
HELP.b_mancala='المنقلة على قواعد «الأوارِه» المشهورة: لوحة صفين، كل صف 6 حفر وفي كل حفرة 4 حبات. صفك هو اللي قدامك. في دورك اختار حفرة من صفك فيها حب، وتوزع حبها حبة حبة على الحفر اللي بعدها عكس عقارب الساعة (وإذا كانت 12 حبة أو أكثر تتخطى الحفرة اللي بديت منها). إذا آخر حبة نزلت في صف الخصم وصار فيها 2 أو 3 تاخذها، وتاخذ معها اللي قبلها في صف الخصم إذا فيها 2 أو 3 بعد. ما يجوز تاخذ كل حب الخصم مرة وحدة: الحركة تنلعب بدون أخذ. وإذا صف الخصم فاضي لازم تلعب حركة توصّل له حب، وإذا ما تقدر تخلص اللعبة وتاخذ الحب اللي في جهتك. أول واحد يجمع أكثر من 24 حبة يفوز، و24 و24 تعادل. إذا صار اللعب يدور بدون أخذ، كل واحد ياخذ اللي في جهته والأكثر يفوز. إذا أكثر من لاعبين: فريقين (تحت وفوق) وأعضاء الفريق يتناوبون على الحركات.';

/* ================= التسعة: nine men's morris ================= */
// 24 points: ring r (0 outer) and place k (0..7 clockwise from the top-left corner); odd k are the mid points
const B2M9XY=(()=>{const o=[];for(let r=0;r<3;r++){const a=r,b=3,c=6-r;for(const [x,y] of [[a,a],[b,a],[c,a],[c,b],[c,c],[b,c],[a,c],[a,b]])o.push([x*10+6,y*10+6]);}return o;})();
const B2M9A=(()=>{const a=[...Array(24)].map(()=>[]);for(let r=0;r<3;r++)for(let k=0;k<8;k++){const i=r*8+k;a[i].push(r*8+(k+1)%8,r*8+(k+7)%8);if(k%2){if(r>0)a[i].push(i-8);if(r<2)a[i].push(i+8);}}return a;})();
const B2M9L=(()=>{const l=[];for(let r=0;r<3;r++)for(const k of [0,2,4,6])l.push([r*8+k,r*8+k+1,r*8+(k+2)%8]);for(const k of [1,3,5,7])l.push([k,8+k,16+k]);return l;})();
const b2m9In=(b,i,c)=>B2M9L.some(L=>L.includes(i)&&L.every(x=>b[x]===c));
const b2m9Cnt=(b,s)=>{let n=0;for(const x of b)if(x===String(s))n++;return n;};
// the opponent pieces that may be taken: those outside a mill, or any when all are in mills
function b2m9Rm(b,o){const c=String(o),all=[];for(let i=0;i<24;i++)if(b[i]===c)all.push(i);const free=all.filter(i=>!b2m9In(b,i,c));return free.length?free:all;}
// steps of side s: [from,to]; with three pieces left (and none in hand) a piece flies anywhere
function b2m9Steps(b,s,hand){const c=String(s),o=[];if(hand[s]>0){for(let i=0;i<24;i++)if(b[i]==='.')o.push([-1,i]);return o;}
  const fly=b2m9Cnt(b,s)===3;for(let f=0;f<24;f++){if(b[f]!==c)continue;for(const t of fly?[...Array(24).keys()]:B2M9A[f])if(b[t]==='.')o.push([f,t]);}return o;}
// whole moves (with the piece taken when a mill closes): {f,t,x}
function b2m9Moves(b,s,hand){const o=[],c=String(s);for(const [f,t] of b2m9Steps(b,s,hand)){const nb=b2m9Set(b,f,t,c);
    if(b2m9In(nb,t,c)){const rm=b2m9Rm(nb,1-s);if(rm.length){for(const x of rm)o.push({f,t,x});continue;}}o.push({f,t,x:-1});}return o;}
function b2m9Set(b,f,t,c){const a=[...b];if(f>=0)a[f]='.';a[t]=c;return a.join('');}
const b2m9Lost=(b,o,hand)=>b2m9Cnt(b,o)+hand[o]<3||!b2m9Steps(b,o,hand).length;
// a step by the side to move; after it, either a piece must be taken (rm) or the turn passes
function b2m9Step(d,f,t){const s=d.sd,c=String(s),b=b2m9Set(d.b,f,t,c),hand=[...d.hand];if(f<0)hand[s]--;
  const mill=b2m9In(b,t,c)&&b2m9Cnt(b,1-s)>0;const lm=f<0?[t]:[f,t];
  const x={...d,b,hand,lm,lc:[],mvn:(d.mvn||0)+1,last:`${tmName(d,s)} ${f<0?'حط حجر':'حرّك حجر'}${mill?' وسكّر خط! يشيل حجر':''}`};
  if(mill)return {...x,rm:1};return b2m9Turn(x,s,false);}
function b2m9Take(d,i){const s=d.sd,b=setAt(d.b,i,'.');return b2m9Turn({...d,b,rm:0,lc:[[i,1-s]],mvn:(d.mvn||0)+1,last:`${tmName(d,s)} سكّر خط وشال حجر`},s,true);}
function b2m9Turn(x,s,took){const quiet=took?0:(x.quiet||0)+1,mov=!x.hand[0]&&!x.hand[1];const key=x.b+(1-s);const hist=mov&&!took?[...(x.hist||[]),key].slice(-80):[key];
  const nd=b2Pass(x,s,{quiet,hist,mvn:x.mvn});
  if(b2m9Lost(x.b,1-s,x.hand))return {...nd,...tmWin(x,s),end:b2m9Cnt(x.b,1-s)+x.hand[1-s]<3?'two':'block'};
  if(mov&&(quiet>=100||b2Rep(hist,key)>=3))return {...nd,win:'d',end:quiet>=100?'q':'rep'};return nd;}
function b2m9Do(d,m){let x=b2m9Step(d,m.f,m.t);if(x.rm&&x.win==null)x=b2m9Take(x,m.x>=0?m.x:b2Rnd(b2m9Rm(x.b,1-d.sd)));return x;}
const B2M9P={moves:p=>p.rm?b2m9Rm(p.b,1-p.sd).map(x=>({f:-2,t:-2,x})):b2m9Moves(p.b,p.sd,p.hand),
  play(p,m){const s=p.sd,c=String(s);let b=p.b,hand=p.hand;if(m.f!==-2){b=b2m9Set(b,m.f,m.t,c);if(m.f<0){hand=[...hand];hand[s]--;}}if(m.x>=0)b=setAt(b,m.x,'.');
    return {b,hand,sd:1-s,w:b2m9Lost(b,1-s,hand)?s:null};},
  ev(p){const s=p.sd,o=1-s,b=p.b,c=String(s),e=String(o);let v=(b2m9Cnt(b,s)+p.hand[s]-b2m9Cnt(b,o)-p.hand[o])*100;
    for(const L of B2M9L){let m=0,t=0,n=0;for(const x of L){if(b[x]===c)m++;else if(b[x]===e)t++;else n++;}if(m===2&&n===1)v+=14;if(t===2&&n===1)v-=16;if(m===3)v+=6;if(t===3)v-=6;}
    if(!p.hand[0]&&!p.hand[1])v+=(b2m9Steps(b,s,p.hand).length-b2m9Steps(b,o,p.hand).length)*3;return v;},
  end:b2End,order:(p,ms)=>ms};
const B2M9BG=`<svg viewBox="0 0 72 72" aria-hidden="true"><rect x="1" y="1" width="70" height="70" rx="5" class="b2wd"/><g class="b2ln">${[0,1,2].map(r=>`<rect x="${6+r*10}" y="${6+r*10}" width="${60-r*20}" height="${60-r*20}" fill="none"/>`).join('')}${b2Line([36,6],[36,26])}${b2Line([36,46],[36,66])}${b2Line([6,36],[26,36])}${b2Line([46,36],[66,36])}</g>${b2Dots(B2M9XY,1.5)}</svg>`;
const B2M9N=['الأبيض','الأسود'];
GAMES.b_morris9={...B2TEAM,name:'التسعة',cat:'board',lbc:'#6B4E2E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D9B27C"/><g fill="none" stroke="#5A3A1C" stroke-width="3">${[0,1,2].map(r=>`<rect x="${12+r*13}" y="${12+r*13}" width="${76-r*26}" height="${76-r*26}"/>`).join('')}<path d="M50 12V38M50 62V88M12 50H38M62 50H88"/></g>${[[12,12],[50,12],[25,25],[25,50]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#FBF6EC" stroke="#5A3A1C" stroke-width="1.5"/>`).join('')}${[[88,88],[75,75],[50,88],[62,62]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#2D3B4C"/>`).join('')}</svg>`,
  init:()=>({b:'.'.repeat(24),hand:[9,9],rm:0,sd:0,tr:[0,0],quiet:0,hist:[],lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){if(d.rm)return b2m9Take(d,b2Rnd(b2m9Rm(d.b,1-d.sd)));return b2m9Do(d,b2Rnd(b2m9Moves(d.b,d.sd,d.hand)));},
  points:d=>d.pl.map((_,s)=>`${s%2?'⚫':'⚪'} ${b2m9Cnt(d.b,s%2)+d.hand[s%2]}`),
  winText:d=>b2WinTxt(d,B2M9N,{two:'الخصم بقى عنده حجرين',block:'الخصم انحبس وما عنده حركة',q:'تعادل: 50 حركة لكل واحد بدون خط',rep:'تعادل: نفس الوضع تكرر 3 مرات'}),
  status(d,ctx){const s=d.sd;const t=d.rm?'شيل حجر من الخصم':d.hand[s]?`حط حجر (باقي ${d.hand[s]})`:b2m9Cnt(d.b,s)===3?'عندك 3 حجار: تطير لأي مكان':'حرّك حجر';return b2Stat(d,ctx,B2M9N,'• '+t);},
  render(d,ctx){const my=ctx.my,s=d.sd,c=String(s),flip=b2Flip(d,ctx);const P=b2Sel(d);const st=my&&!d.rm?b2m9Steps(d.b,s,d.hand):[];
    const rm=my&&d.rm?new Set(b2m9Rm(d.b,1-s)):new Set();const mv=new Set(st.filter(x=>x[0]>=0).map(x=>x[0]));
    const to=new Set(st.filter(x=>x[0]===(P?P.f:-1)).map(x=>x[1]));const pts=[];
    for(let i=0;i<24;i++){const v=d.b[i];const [x,y]=B2M9XY[i];const tap=my&&(rm.has(i)||mv.has(i)||to.has(i)||(P&&v===c));
      pts.push({q:i,x,y,c:b2Cls(d,i,{sel:P&&P.f,to,mv:P?null:mv,cap:rm}),i:tap?i:null,
        p:v!=='.'?b2Stone(+v,b2m9In(d.b,i,v)?'inm':''):b2Ghost(d,i)});}
    return b2Board('b2m9 bd-b2',72,72,8.6,B2M9BG,pts,flip,my)+`<div class="b2hand">${[0,1].map(x=>`<span class="${x===s?'on':''}">${b2Stone(x)}<b>${d.hand[x]}</b></span>`).join('')}</div>`+b2ResignBtn(ctx);},
  after:d=>b2Fly('m9',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);if(a!=='pt')return;const s=d.sd;
    if(d.rm){if(b2m9Rm(d.b,1-s).includes(i)){S.b2=null;act(b2m9Take(d,i));}return;}
    const st=b2m9Steps(d.b,s,d.hand),P=b2Sel(d);
    if(d.hand[s]>0){if(st.some(x=>x[1]===i)){S.b2=null;act(b2m9Step(d,-1,i));}return;}
    if(P&&st.some(x=>x[0]===P.f&&x[1]===i)){S.b2=null;act(b2m9Step(d,P.f,i));return;}
    b2Pick(d,st.some(x=>x[0]===i)&&(!P||P.f!==i)?{f:i}:null);},
  bot(d,s,lv){if(d.rm){const r=b2m9Rm(d.b,1-d.sd);const m=b2Think({b:d.b,hand:d.hand,sd:d.sd,rm:1,w:null},B2M9P,lv,{dep:[0,1,2,4],cap:[0,500,6000,30000],ns:[0,60,10,1]});return b2m9Take(d,m?m.x:b2Rnd(r));}
    const ms=b2m9Moves(d.b,d.sd,d.hand);if(lv===1&&Math.random()<.25)return b2m9Do(d,b2Rnd(ms));
    const m=b2Think({b:d.b,hand:d.hand,sd:d.sd,w:null},B2M9P,lv,{dep:[0,1,3,6],cap:[0,1500,10000,25000],ns:[0,70,12,1]});return b2m9Do(d,m||b2Rnd(ms));},
  botDelay:()=>500+rnd(400)};
HELP.b_morris9='التسعة (الطاحونة): كل واحد عنده 9 حجار. أول شي تتناوبون تحطون الحجار على النقاط الفاضية. إذا سويت 3 حجار على خط واحد (طاحونة) تشيل حجر من الخصم، بس مو من طاحونة إلا إذا كل حجاره في طواحين. بعد ما تخلص الحجار تحرّك حجر لنقطة جارة فاضية على الخطوط، وكل طاحونة جديدة تشيل فيها حجر. إذا بقى عندك 3 حجار بس تقدر تطير بحجرك لأي نقطة فاضية. يخسر اللي يبقى عنده حجرين أو ما عنده حركة. تعادل إذا مرت 50 حركة لكل واحد بدون شيل، أو تكرر نفس الوضع 3 مرات. الأبيض يبدأ. إذا أكثر من لاعبين: فريقين يتناوبون على الحركات.';

/* ================= الثلاثة: three men's morris ================= */
// 3×3 points joined by rows, columns and the two long diagonals; three in a line wins at any time
const B2M3A=[[1,3,4],[0,2,4],[1,5,4],[0,6,4],[0,1,2,3,5,6,7,8],[2,8,4],[3,7,4],[6,8,4],[7,5,4]];
const B2M3L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const b2m3Line=(b,c)=>B2M3L.find(L=>L.every(x=>b[x]===c));
function b2m3Steps(b,s){const c=String(s),n=[...b].filter(x=>x===c).length,o=[];
  if(n<3){const first=b==='.........';for(let i=0;i<9;i++)if(b[i]==='.'&&!(first&&i===4))o.push([-1,i]);return o;}
  for(let f=0;f<9;f++)if(b[f]===c)for(const t of B2M3A[f])if(b[t]==='.')o.push([f,t]);return o;}
function b2m3Do(d,f,t){const s=d.sd,c=String(s),b=b2m9Set(d.b,f,t,c);const L=b2m3Line(b,c);const lm=f<0?[t]:[f,t];
  const x={...d,b,lm,ln:L||null,last:`${tmName(d,s)} ${f<0?'حط حجر':'حرّك حجر'}`};
  if(L)return b2Won(x,s,'line');const key=b+(1-s),mov=[...b].filter(v=>v!=='.').length===6;const hist=mov?[...(d.hist||[]),key].slice(-60):[];
  const nd=b2Pass(x,s,{hist,nmv:(d.nmv||0)+1});if(!b2m3Steps(b,1-s).length)return {...nd,...tmWin(d,s),end:'block'};
  if(b2Rep(hist,key)>=3||nd.nmv>=80)return {...nd,win:'d',end:'rep'};return nd;}
const B2M3P={moves:p=>b2m3Steps(p.b,p.sd),play(p,m){const s=p.sd,c=String(s),b=b2m9Set(p.b,m[0],m[1],c);return {b,sd:1-s,w:b2m3Line(b,c)?s:!b2m3Steps(b,1-s).length?s:null};},
  ev(p){const c=String(p.sd),e=String(1-p.sd);let v=0;for(const L of B2M3L){let m=0,t=0,n=0;for(const x of L){if(p.b[x]===c)m++;else if(p.b[x]===e)t++;else n++;}if(m===2&&n===1)v+=10;if(t===2&&n===1)v-=12;}
    if(p.b[4]===c)v+=6;else if(p.b[4]===e)v-=6;return v;},end:b2End};
const B2M3XY=[...Array(9)].map((_,i)=>[10+(i%3)*25,10+Math.floor(i/3)*25]);
const B2M3BG=`<svg viewBox="0 0 70 70" aria-hidden="true"><rect x="1" y="1" width="68" height="68" rx="6" class="b2wd"/><g class="b2ln"><rect x="10" y="10" width="50" height="50" fill="none"/>${b2Line([35,10],[35,60])}${b2Line([10,35],[60,35])}${b2Line([10,10],[60,60])}${b2Line([60,10],[10,60])}</g>${b2Dots(B2M3XY,2.2)}</svg>`;
GAMES.b_morris3={...B2TEAM,name:'الثلاثة',cat:'board',lbc:'#3F6E8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5B93B8"/><rect x="12" y="12" width="76" height="76" rx="8" fill="#E8CFA0"/><g stroke="#6B4A24" stroke-width="3.5" fill="none"><rect x="22" y="22" width="56" height="56"/><path d="M50 22V78M22 50H78M22 22L78 78M78 22L22 78"/></g><circle cx="22" cy="22" r="8" fill="#C9473E"/><circle cx="50" cy="50" r="8" fill="#C9473E"/><circle cx="78" cy="78" r="8" fill="#C9473E" stroke="#FFD84D" stroke-width="3"/><circle cx="78" cy="22" r="8" fill="#2D3B4C"/><circle cx="22" cy="78" r="8" fill="#2D3B4C"/></svg>`,
  init:()=>({b:'.........',sd:0,tr:[0,0],hist:[],nmv:0,lm:null,ln:null,mvn:0,last:''}),
  onTimeout(d){const m=b2Rnd(b2m3Steps(d.b,d.sd));return b2m3Do(d,m[0],m[1]);},
  points:d=>d.pl.map((_,s)=>s%2?'⚫ الأسود':'🔴 الأحمر'),
  winText:d=>b2WinTxt(d,['الأحمر','الأسود'],{line:'ثلاثة على خط',block:'الخصم انحبس',rep:'تعادل: اللعب صار يتكرر'}),
  status(d,ctx){const n=[...d.b].filter(x=>x===String(d.sd)).length;return b2Stat(d,ctx,['الأحمر','الأسود'],n<3?`• حط حجر${d.b==='.........'?' (مو بالوسط)':''}`:'• حرّك حجر على الخط');},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=b2Flip(d,ctx),P=b2Sel(d),st=my?b2m3Steps(d.b,s):[];const mv=new Set(st.filter(x=>x[0]>=0).map(x=>x[0]));
    const to=new Set(st.filter(x=>x[0]===(P?P.f:-1)).map(x=>x[1]));const ln=new Set(d.ln||[]);
    const pts=B2M3XY.map(([x,y],i)=>{const v=d.b[i];const tap=my&&(mv.has(i)||to.has(i));return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel:P&&P.f,to,mv:P?null:mv})+(ln.has(i)?' won':''),p:v!=='.'?b2Stone(+v,'red'):''};});
    return b2Board('b2m3 bd-b2',70,70,12,B2M3BG,pts,flip,my);},
  after:d=>b2Fly('m3',d),
  click(a,i,d,ctx){if(!ctx.my||a!=='pt')return;const st=b2m3Steps(d.b,d.sd),P=b2Sel(d);
    if(st.some(x=>x[0]===-1&&x[1]===i)){S.b2=null;act(b2m3Do(d,-1,i));return;}
    if(P&&st.some(x=>x[0]===P.f&&x[1]===i)){S.b2=null;act(b2m3Do(d,P.f,i));return;}
    b2Pick(d,st.some(x=>x[0]===i)&&(!P||P.f!==i)?{f:i}:null);},
  bot(d,s,lv){const st=b2m3Steps(d.b,d.sd);if(lv===1&&Math.random()<.35){const m=b2Rnd(st);return b2m3Do(d,m[0],m[1]);}
    const m=b2Think({b:d.b,sd:d.sd,w:null},B2M3P,lv,{dep:[0,1,3,10],cap:[0,300,4000,60000],ns:[0,12,5,.5]})||b2Rnd(st);return b2m3Do(d,m[0],m[1]);},
  botDelay:()=>450+rnd(350)};
HELP.b_morris3='الثلاثة: لوحة 3×3 بخطوطها (الصفوف والأعمدة والقطرين). كل واحد عنده 3 حجار، تتناوبون تحطونها على النقاط الفاضية (أول حجر في اللعبة ما ينحط بالوسط). بعد ما تنحط كلها، في دورك تحرّك حجر واحد لنقطة جارة فاضية على خط. أول واحد يسوي 3 حجار على خط واحد يفوز. إذا الخصم ما عنده حركة تفوز، وإذا اللعب تكرر وطال تعادل. الأحمر يبدأ. إذا أكثر من لاعبين: فريقين يتناوبون على الحركات.';

/* ================= القِرْق: alquerque ================= */
// 5×5 points; the diagonal lines pass through the points where row+column is even
const B2AQD=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const b2aqDirs=i=>((i/5|0)+i%5)%2?B2AQD.slice(0,4):B2AQD;
const b2aqAt=(i,dr,dc,k)=>{const r=(i/5|0)+dr*k,c=i%5+dc*k;return r<0||r>4||c<0||c>4?-1:r*5+c;};
// capture chains from f (the piece leaves its point and every jumped piece goes at once); a chain goes on while it can
function b2aqJumps(b,f,c){const e=c==='0'?'1':'0',out=[];
  const rec=(bb,at,path,caps)=>{let more=false;for(const [dr,dc] of b2aqDirs(at)){const m=b2aqAt(at,dr,dc,1),t=b2aqAt(at,dr,dc,2);if(t<0||bb[m]!==e||bb[t]!=='.')continue;
      more=true;const nb=[...bb];nb[at]='.';nb[m]='.';nb[t]=c;rec(nb,t,[...path,t],[...caps,m]);}
    if(!more&&caps.length)out.push({f,path,caps});};
  rec([...b],f,[],[]);return out;}
// simple moves go forward or sideways only; a capture (any way along the lines) must be made, and a chain followed to its end
function b2aqMoves(b,s){const c=String(s),caps=[],simple=[];const fw=s?1:-1;
  for(let f=0;f<25;f++){if(b[f]!==c)continue;caps.push(...b2aqJumps(b,f,c));
    for(const [dr,dc] of b2aqDirs(f)){if(dr===-fw)continue;const t=b2aqAt(f,dr,dc,1);if(t>=0&&b[t]==='.')simple.push({f,path:[t],caps:[]});}}
  return caps.length?caps:simple;}
function b2aqApply(b,m,c){const a=[...b];a[m.f]='.';m.caps.forEach(x=>{a[x]='.';});a[m.path[m.path.length-1]]=c;return a.join('');}
const b2aqCnt=(b,s)=>{let n=0;const c=String(s);for(const x of b)if(x===c)n++;return n;};
const B2AQ0='11111'+'11111'+'11.00'+'00000'+'00000';
function b2aqDo(d,m){const s=d.sd,b=b2aqApply(d.b,m,String(s));const quiet=m.caps.length?0:(d.quiet||0)+1;
  const nd=b2Pass(d,s,{b,quiet,lm:[m.f,...m.path],lc:m.caps.map(x=>[x,1-s]),last:`${tmName(d,s)}${m.caps.length?` أكل ${m.caps.length}`:' تحرّك'}`});
  if(!b2aqMoves(b,1-s).length)return {...nd,...tmWin(d,s),end:b2aqCnt(b,1-s)?'block':'all'};
  if(quiet>=60){const a=b2aqCnt(b,0),z=b2aqCnt(b,1);return a===z?{...nd,win:'d',end:'q'}:{...nd,...tmWin(d,a>z?0:1),end:'more'};}
  return nd;}
const B2AQP={moves:p=>b2aqMoves(p.b,p.sd),play(p,m){const s=p.sd,b=b2aqApply(p.b,m,String(s));return {b,sd:1-s,w:b2aqMoves(b,1-s).length?null:s};},
  ev(p){const s=p.sd;let v=(b2aqCnt(p.b,s)-b2aqCnt(p.b,1-s))*100;for(let i=0;i<25;i++){const x=p.b[i];if(x==='.')continue;const r=i/5|0,adv=x==='0'?4-r:r,k=(i%5===0||i%5===4)?3:0;v+=(+x===s?1:-1)*(adv*2+k);}return v;},
  end:b2End,order:(p,ms)=>ms};
const B2AQXY=[...Array(25)].map((_,i)=>[8+(i%5)*16,8+(i/5|0)*16]);
const B2AQBG=(()=>{let g='';for(let i=0;i<25;i++)for(const [dr,dc] of b2aqDirs(i)){if(dr<0||(dr===0&&dc<0))continue;const t=b2aqAt(i,dr,dc,1);if(t>=0)g+=b2Line(B2AQXY[i],B2AQXY[t]);}
  return `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="1" y="1" width="78" height="78" rx="5" class="b2wd"/><g class="b2ln">${g}</g>${b2Dots(B2AQXY,1.6)}</svg>`;})();
// the step-by-step selection of a capture chain (like dama): P.f the piece, P.path the points chosen so far
function b2Chain(d,ms,i){const P=b2Sel(d);
  if(!P||!P.path.length){if(ms.some(m=>m.f===i)&&(!P||P.f!==i)){b2Pick(d,{f:i,path:[]});return null;}if(!P)return null;}
  const ok=ms.filter(m=>m.f===P.f&&P.path.every((x,j)=>m.path[j]===x)&&m.path[P.path.length]===i);
  if(!ok.length){if(!P.path.length)b2Pick(d,null);return null;}
  const path=[...P.path,i];const done=ok.find(m=>m.path.length===path.length);
  if(done&&ok.every(m=>m.path.length===path.length)){S.b2=null;return done;}
  b2Pick(d,{f:P.f,path});return null;}
function b2ChainView(d,ms){const P=b2Sel(d);const now=P?ms.filter(m=>m.f===P.f&&P.path.every((x,j)=>m.path[j]===x)):[];
  const at=P?(P.path.length?P.path[P.path.length-1]:P.f):null;const to=new Set(now.map(m=>m.path[P.path.length]).filter(x=>x!=null));
  const gone=new Set();if(P&&now[0])now[0].caps.slice(0,P.path.length).forEach(x=>gone.add(x));return {P,at,to,gone,starts:new Set(ms.map(m=>m.f))};}
GAMES.b_alquerq={...B2TEAM,name:'القِرْق',cat:'board',lbc:'#A0522D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C97B4A"/><rect x="10" y="10" width="80" height="80" rx="6" fill="#F0D9A8"/><g stroke="#7A4A22" stroke-width="2.4"><path d="M20 20H80M20 40H80M20 60H80M20 80H80M20 20V80M40 20V80M60 20V80M80 20V80M20 20L80 80M80 20L20 80M50 20L20 50L50 80L80 50Z" fill="none"/></g>${[[20,20],[40,20],[60,20],[80,20],[20,40]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6.5" fill="#2D3B4C"/>`).join('')}${[[20,80],[40,80],[60,80],[80,60],[60,60]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6.5" fill="#FBF6EC" stroke="#7A4A22" stroke-width="1.5"/>`).join('')}</svg>`,
  init:()=>({b:B2AQ0,sd:0,tr:[0,0],quiet:0,lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){return b2aqDo(d,b2Rnd(b2aqMoves(d.b,d.sd)));},
  points:d=>d.pl.map((_,s)=>`${s%2?'⚫':'⚪'} ${b2aqCnt(d.b,s%2)}`),
  winText:d=>b2WinTxt(d,B2M9N,{all:'أكل كل حجار الخصم',block:'الخصم ما عنده حركة',more:'30 حركة لكل واحد بدون أكل، وعنده حجار أكثر',q:'تعادل: 30 حركة لكل واحد بدون أكل والحجار متساوية'}),
  status(d,ctx){const ms=b2aqMoves(d.b,d.sd);return b2Stat(d,ctx,B2M9N,ms[0]&&ms[0].caps.length?'<br><small>الأكل إجباري، وكمّل القفز لين ما تقدر</small>':'');},
  render(d,ctx){const my=ctx.my,flip=b2Flip(d,ctx),ms=my?b2aqMoves(d.b,d.sd):[];const V=b2ChainView(d,ms);
    const pts=B2AQXY.map(([x,y],i)=>{let v=d.b[i];if(V.P&&V.P.path.length){if(i===V.P.f)v='.';if(i===V.at)v=d.b[V.P.f];}
      const tap=my&&(V.to.has(i)||(!V.P||!V.P.path.length)&&V.starts.has(i));
      return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel:V.at,to:V.to,mv:V.P?null:V.starts})+(V.gone.has(i)?' gone':''),p:v!=='.'?b2Stone(+v):b2Ghost(d,i)};});
    let h=b2Board('b2aq bd-b2',80,80,12,B2AQBG,pts,flip,my);if(my&&V.P&&V.P.path.length)h+='<div class="row chact"><button class="btn" data-ga="undo">تراجع عن القفزة</button></div>';return h+b2ResignBtn(ctx);},
  after:d=>b2Fly('aq',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);if(a==='undo'){b2Pick(d,null);return;}if(a!=='pt')return;
    const m=b2Chain(d,b2aqMoves(d.b,d.sd),i);if(m)act(b2aqDo(d,m));},
  bot(d,s,lv){const ms=b2aqMoves(d.b,d.sd);if(lv===1&&Math.random()<.3)return b2aqDo(d,b2Rnd(ms));
    return b2aqDo(d,b2Think({b:d.b,sd:d.sd,w:null},B2AQP,lv,{dep:[0,1,3,7],cap:[0,800,10000,50000],ns:[0,80,15,1]})||b2Rnd(ms));},
  botDelay:()=>500+rnd(400)};
HELP.b_alquerq='القِرْق (القرقة): لوحة 5×5 نقاط بخطوطها، وكل واحد عنده 12 حجر والنقطة اللي بالوسط فاضية. في دورك تحرّك حجر لنقطة جارة فاضية على خط، لقدام أو يمين أو يسار (ما ترجع لورا). الأكل بالقفز فوق حجر الخصم لنقطة فاضية وراه على نفس الخط، بأي اتجاه، وتكمل القفز إذا تقدر. الأكل إجباري. يفوز اللي ياكل كل حجار الخصم أو يخليه بدون حركة. إذا مرت 30 حركة لكل واحد بدون أكل يفوز اللي حجاره أكثر، وإذا متساوية تعادل. الأبيض يبدأ. إذا أكثر من لاعبين: فريقين يتناوبون على الحركات.';

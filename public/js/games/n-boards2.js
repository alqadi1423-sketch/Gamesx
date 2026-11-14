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
function b2Stat(d,ctx,names,tail,dk){let s=d.last?`<small>${d.last}</small><br>`:'';const me=!ctx.local&&d.turn===ctx.v;
  s+=`${me?'<b class="yt">دورك</b>':`دور ${tmName(d,d.sd)}`} <span class="chside ${d.sd===(dk==null?1:dk)?'bk':''}">${names[d.sd]}</span>`;
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
      return `<${can?'button':'div'} class="owp ${can?'can':''} ${d.lm&&d.lm[0]===i?'lmf':''} ${cp.has(i)?'cpt':''}" ${can?`data-ga="pit" data-i="${i}"`:''}>${seeds}<b class="${k!=null?'got':''}"${k!=null?` data-k="c${d.mvn}" style="--dl:${Math.min(k*20,200)}ms"`:''}>${n}</b></${can?'button':'div'}>`;};
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

/* ================= السيجة: seega ================= */
// 5×5 squares, 12 pieces each. Placing: two pieces a turn on any empty square but the centre (12). Moving: one square
// across or up and down; a piece between the one that moved and another piece of the mover is taken (not on the centre)
const B2SGD=[[-1,0],[1,0],[0,-1],[0,1]];
const b2sgAt=(i,dr,dc,k)=>{const r=(i/5|0)+dr*k,c=i%5+dc*k;return r<0||r>4||c<0||c>4?-1:r*5+c;};
const b2sgCnt=(b,s)=>{let n=0;const c=String(s);for(const x of b)if(x===c)n++;return n;};
function b2sgCaps(b,t,c){const e=c==='0'?'1':'0',o=[];for(const [dr,dc] of B2SGD){const m=b2sgAt(t,dr,dc,1),f=b2sgAt(t,dr,dc,2);if(f>=0&&m!==12&&b[m]===e&&b[f]===c)o.push(m);}return o;}
// moves {f,t,caps}; while a chain goes on (ch) only that piece moves and only to take again
function b2sgMoves(b,s,ch){const c=String(s),o=[];for(let f=0;f<25;f++){if(b[f]!==c||(ch>=0&&f!==ch))continue;
    for(const [dr,dc] of B2SGD){const t=b2sgAt(f,dr,dc,1);if(t<0||b[t]!=='.')continue;const caps=b2sgCaps(b,t,c);if(ch>=0&&!caps.length)continue;o.push({f,t,caps});}}return o;}
function b2sgApply(b,m,c){const a=[...b];a[m.f]='.';a[m.t]=c;m.caps.forEach(x=>{a[x]='.';});return a.join('');}
function b2sgEnd(nd,b){const a=b2sgCnt(b,0),z=b2sgCnt(b,1);return a===z?{...nd,win:'d',end:'eq'}:{...nd,...tmWin(nd,a>z?0:1),end:'more'};}
// after side s moved: taken all, the other side blocked (s moves again), both blocked, or too long without a take
function b2sgAfter(x,s,took){const b=x.b,o=1-s;const quiet=took?0:(x.quiet||0)+1;
  if(!b2sgCnt(b,o))return b2Won({...x,quiet},s,'all');
  if(!b2sgMoves(b,o,-1).length){if(!b2sgMoves(b,s,-1).length||quiet>=60)return b2sgEnd({...x,quiet,mvn:(x.mvn||0)+1},b);return {...x,quiet,ch:-1,mvn:(x.mvn||0)+1,last:x.last+'، والخصم محبوس فيلعب مرة ثانية'};}
  const nd=b2Pass(x,s,{quiet,ch:-1});if(quiet>=60)return b2sgEnd(nd,b);return nd;}
function b2sgPlace(d,i){const s=d.sd,b=setAt(d.b,i,String(s)),hand=[...d.hand];hand[s]--;const pp=(d.pp||0)+1;
  const x={...d,b,hand,lm:[i],lc:[],last:`${tmName(d,s)} حط حجر`};
  if(!hand[0]&&!hand[1]){const tr=[...d.tr];tr[1]=(tr[1]+1)%(tmSeats(d,1).length||1);const y={...x,tr,pp:0,ph:'move',sd:1,mvn:(d.mvn||0)+1,last:'خلص التحطيط، الأسود يبدأ يحرّك'};
    y.turn=tmNow(y,1);if(!b2sgMoves(b,1,-1).length){if(!b2sgMoves(b,0,-1).length)return b2sgEnd(y,b);return {...y,sd:0,turn:tmNow(y,0),last:'خلص التحطيط، والأسود محبوس فيبدأ الأبيض'};}return y;}
  if(pp<2&&hand[s])return {...x,pp,mvn:(d.mvn||0)+1};return b2Pass(x,s,{pp:0});}
function b2sgDo(d,m){const s=d.sd,c=String(s);if(m.stop)return b2sgAfter({...d,last:`${tmName(d,s)} وقف الأكل`},s,true);
  const b=b2sgApply(d.b,m,c);const x={...d,b,lm:d.ch>=0&&d.lm?[...d.lm,m.t]:[m.f,m.t],lc:m.caps.map(q=>[q,1-s]),last:`${tmName(d,s)}${m.caps.length?` أكل ${m.caps.length}`:' تحرّك'}`};
  if(m.caps.length&&b2sgCnt(b,1-s)&&b2sgMoves(b,s,m.t).length)return {...x,ch:m.t,quiet:0,mvn:(d.mvn||0)+1,last:x.last+'، ويقدر يكمّل بنفس الحجر'};
  return b2sgAfter(x,s,m.caps.length>0);}
function b2sgNext(b,s,took,q){const o=1-s;q=took?0:(q||0)+1;if(!b2sgCnt(b,o))return {b,sd:o,ch:-1,q,w:s};
  if(!b2sgMoves(b,o,-1).length){if(!b2sgMoves(b,s,-1).length||q>=60){const a=b2sgCnt(b,0),z=b2sgCnt(b,1);return {b,sd:o,ch:-1,q,w:a===z?'d':a>z?0:1};}return {b,sd:s,ch:-1,q,w:null};}
  if(q>=60){const a=b2sgCnt(b,0),z=b2sgCnt(b,1);return {b,sd:o,ch:-1,q,w:a===z?'d':a>z?0:1};}return {b,sd:o,ch:-1,q,w:null};}
const B2SGP={moves:p=>{const ms=b2sgMoves(p.b,p.sd,p.ch);return p.ch>=0?[...ms,{stop:1}]:ms;},
  play(p,m){const s=p.sd,o=1-s;if(m.stop)return b2sgNext(p.b,s,true,p.q);const b=b2sgApply(p.b,m,String(s));
    if(m.caps.length&&b2sgCnt(b,o)&&b2sgMoves(b,s,m.t).length)return {b,sd:s,ch:m.t,q:0,w:null};return b2sgNext(b,s,m.caps.length>0,p.q);},
  ev(p){const s=p.sd;let v=(b2sgCnt(p.b,s)-b2sgCnt(p.b,1-s))*100;if(p.b[12]===String(s))v+=8;else if(p.b[12]===String(1-s))v-=8;
    return v+(b2sgMob(p.b,s)-b2sgMob(p.b,1-s))*2;},end:b2End};
function b2sgMob(b,s){const c=String(s);let n=0;for(let f=0;f<25;f++){if(b[f]!==c)continue;const r=f/5|0,k=f%5;if(r>0&&b[f-5]==='.')n++;if(r<4&&b[f+5]==='.')n++;if(k>0&&b[f-1]==='.')n++;if(k<4&&b[f+1]==='.')n++;}return n;}
// where a bot puts a piece: next to its own (pairs are hard to take), on the edges, not where it can be squeezed
function b2sgPlaceScore(b,s,i){const c=String(s),e=String(1-s);let v=Math.random()*3;const r=i/5|0,cl=i%5;if(r===0||r===4||cl===0||cl===4)v+=3;
  for(const [dr,dc] of B2SGD){const n=b2sgAt(i,dr,dc,1);if(n<0)continue;if(b[n]===c)v+=2;if(b[n]===e){const f=b2sgAt(i,-dr,-dc,1);if(f>=0&&b[f]==='.')v-=1.5;}}return v;}
const B2SGXY=[...Array(25)].map((_,i)=>[10+(i%5)*20,10+(i/5|0)*20]);
const B2SGBG=`<svg viewBox="0 0 100 100" aria-hidden="true"><g class="b2ln">${[0,1,2,3,4,5].map(k=>b2Line([k*20,0],[k*20,100])+b2Line([0,k*20],[100,k*20])).join('')}</g><g class="b2mid">${b2Line([44,44],[56,56])}${b2Line([56,44],[44,56])}</g></svg>`;
GAMES.b_seega={...B2TEAM,name:'السيجة',cat:'board',lbc:'#9B6A2F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D49A4A"/><rect x="10" y="10" width="80" height="80" fill="#F2DDB0"/><g stroke="#7A4A22" stroke-width="2.2">${[0,1,2,3,4,5].map(k=>`<path d="M${10+k*16} 10V90M10 ${10+k*16}H90"/>`).join('')}</g><path d="M46 46l8 8M54 46l-8 8" stroke="#B5462F" stroke-width="2.5"/>${[[18,18],[34,18],[82,34],[66,50]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="#2D3B4C"/>`).join('')}${[[18,82],[34,66],[82,82],[18,50]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="#FBF6EC" stroke="#7A4A22" stroke-width="1.4"/>`).join('')}</svg>`,
  init:()=>({b:'.'.repeat(25),hand:[12,12],ph:'place',pp:0,ch:-1,sd:0,tr:[0,0],quiet:0,lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){if(d.ph==='place'){let x=d;const s=d.sd;for(let k=0;k<2&&x.ph==='place'&&x.sd===s&&x.win==null;k++){const e=[...x.b].map((v,i)=>v==='.'&&i!==12?i:-1).filter(i=>i>=0);x=b2sgPlace(x,b2Rnd(e));}return x;}
    if(d.ch>=0)return b2sgDo(d,{stop:1});const ms=b2sgMoves(d.b,d.sd,-1);return ms.length?b2sgDo(d,b2Rnd(ms)):b2sgAfter(d,1-d.sd,false);},
  points:d=>d.pl.map((_,s)=>`${s%2?'⚫':'⚪'} ${b2sgCnt(d.b,s%2)+d.hand[s%2]}`),
  winText:d=>b2WinTxt(d,B2M9N,{all:'أكل كل حجار الخصم',more:'عنده حجار أكثر لما وقف الأكل',eq:'تعادل: الحجار متساوية'}),
  status(d,ctx){const t=d.ph==='place'?`• حط حجر ${d.pp?'ثاني':'(حجرين بالدور)'}، الوسط يبقى فاضي`:d.ch>=0?'• كمّل الأكل بنفس الحجر أو اضغط خلاص':'• حرّك حجر مربع واحد';return b2Stat(d,ctx,B2M9N,t);},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=b2Flip(d,ctx),P=b2Sel(d);const place=d.ph==='place';
    const ms=my&&!place?b2sgMoves(d.b,s,d.ch):[];const f=d.ch>=0?d.ch:P?P.f:-1;const mv=new Set(ms.map(m=>m.f));const to=new Set(ms.filter(m=>m.f===f).map(m=>m.t));
    const pts=B2SGXY.map(([x,y],i)=>{const v=d.b[i];const tap=my&&(place?v==='.'&&i!==12:mv.has(i)||to.has(i));
      return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel:f,to:place?null:to,mv:f>=0?null:mv})+(place&&tap?' to':''),p:v!=='.'?b2Stone(+v):b2Ghost(d,i)};});
    let h=b2Board('b2sg bd-b2',100,100,17,B2SGBG,pts,flip,my);
    if(place)h+=`<div class="b2hand">${[0,1].map(x=>`<span class="${x===s?'on':''}">${b2Stone(x)}<b>${d.hand[x]}</b></span>`).join('')}</div>`;
    if(my&&d.ch>=0)h+='<div class="row chact"><button class="btn green" data-ga="stop">خلاص، أنهي دوري</button></div>';return h+(place?'':b2ResignBtn(ctx));},
  after:d=>b2Fly('sg',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);if(a==='stop'){if(d.ch>=0)act(b2sgDo(d,{stop:1}));return;}if(a!=='pt')return;
    if(d.ph==='place'){if(d.b[i]==='.'&&i!==12)act(b2sgPlace(d,i));return;}
    const ms=b2sgMoves(d.b,d.sd,d.ch),P=b2Sel(d),f=d.ch>=0?d.ch:P?P.f:-1;const m=ms.find(x=>x.f===f&&x.t===i);if(m){S.b2=null;act(b2sgDo(d,m));return;}
    if(d.ch<0)b2Pick(d,ms.some(x=>x.f===i)&&f!==i?{f:i}:null);},
  bot(d,s,lv){const side=d.sd;
    if(d.ph==='place'){const e=[...d.b].map((v,i)=>v==='.'&&i!==12?i:-1).filter(i=>i>=0);if(lv===1)return b2sgPlace(d,b2Rnd(e));
      let bi=e[0],bv=-1e9;for(const i of e){const v=b2sgPlaceScore(d.b,side,i);if(v>bv){bv=v;bi=i;}}return b2sgPlace(d,bi);}
    const ms=b2sgMoves(d.b,side,d.ch);if(!ms.length)return d.ch>=0?b2sgDo(d,{stop:1}):b2sgAfter(d,1-side,false);
    if(lv===1&&Math.random()<.3)return b2sgDo(d,b2Rnd(d.ch>=0?[...ms,{stop:1}]:ms));
    const m=b2Think({b:d.b,sd:side,ch:d.ch,q:d.quiet||0,w:null},B2SGP,lv,{dep:[0,1,3,7],cap:[0,800,6000,20000],ns:[0,60,12,1]});return b2sgDo(d,m||ms[0]);},
  botDelay:()=>450+rnd(400)};
HELP.b_seega='السيجة: لوحة 5×5 وكل واحد عنده 12 حجر. أول شي تتناوبون تحطون الحجار، كل دور حجرين في أي مربع فاضي إلا اللي بالوسط. لما تخلص الحجار يبدأ الثاني (الأسود) بالتحريك: الحجر يمشي مربع واحد لقدام أو ورا أو يمين أو يسار. إذا حجرك اللي تحرك صار حجر الخصم بينه وبين حجر ثاني لك على نفس الخط تاكله (وتقدر تاكل أكثر من واحد بنفس الحركة). الحجر اللي بالوسط ما ينأكل، والحجر اللي يدخل بنفسه بين حجرين ما ينأكل. إذا أكلت تقدر تكمّل بنفس الحجر إذا عنده أكل ثاني، أو توقف. إذا الخصم محبوس ما يقدر يتحرك تلعب مرة ثانية لين ينفتح له طريق. يفوز اللي ياكل كل حجار الخصم، وإذا مرت 30 حركة لكل واحد بدون أكل أو انحبس الاثنين يفوز صاحب الحجار الأكثر. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= فانورونا: fanorona ================= */
// 9×5 points; diagonals through the points where row+column is even. A capture is made by approach (moving towards a
// line of enemy pieces) or by withdrawal (moving away from one); the whole touching line of enemy pieces is taken
const B2FND=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const b2fnAt=(i,dr,dc,k)=>{const r=(i/9|0)+dr*k,c=i%9+dc*k;return r<0||r>4||c<0||c>8?-1:r*9+c;};
const b2fnDirs=i=>((i/9|0)+i%9)%2?[0,1,2,3]:[0,1,2,3,4,5,6,7];
const B2FN0='111111111'+'111111111'+'1010.1010'+'000000000'+'000000000';
const b2fnCnt=(b,s)=>{let n=0;const c=String(s);for(const x of b)if(x===c)n++;return n;};
function b2fnLine(b,i,dr,dc,e){const o=[];for(let k=0;;k++){const q=b2fnAt(i,dr,dc,k);if(q<0||b[q]!==e)break;o.push(q);}return o;}
// capturing moves of side s ({f,t,k:'a'|'w',dir,caps}); ch: the chain going on (piece, last direction, points visited)
function b2fnCaps(b,s,ch){const c=String(s),e=String(1-s),o=[];
  for(let f=0;f<45;f++){if(b[f]!==c||(ch&&f!==ch.at))continue;for(const k of b2fnDirs(f)){if(ch&&k===ch.ld)continue;const [dr,dc]=B2FND[k];const t=b2fnAt(f,dr,dc,1);
      if(t<0||b[t]!=='.'||(ch&&ch.vis.includes(t)))continue;const a=b2fnAt(t,dr,dc,1),w=b2fnAt(f,-dr,-dc,1);
      if(a>=0&&b[a]===e)o.push({f,t,k:'a',dir:k,caps:b2fnLine(b,a,dr,dc,e)});if(w>=0&&b[w]===e)o.push({f,t,k:'w',dir:k,caps:b2fnLine(b,w,-dr,-dc,e)});}}return o;}
function b2fnMoves(b,s,ch){const caps=b2fnCaps(b,s,ch);if(caps.length||ch)return caps;const c=String(s),o=[];
  for(let f=0;f<45;f++){if(b[f]!==c)continue;for(const k of b2fnDirs(f)){const [dr,dc]=B2FND[k];const t=b2fnAt(f,dr,dc,1);if(t>=0&&b[t]==='.')o.push({f,t,k:'p',dir:k,caps:[]});}}return o;}
function b2fnApply(b,m,c){const a=[...b];a[m.f]='.';a[m.t]=c;m.caps.forEach(x=>{a[x]='.';});return a.join('');}
function b2fnPass(x,s,took){const o=1-s,b=x.b,quiet=took?0:(x.quiet||0)+1;const nd=b2Pass(x,s,{ch:null,quiet,nt:(x.nt||0)+1});
  if(!b2fnCnt(b,o))return {...nd,...tmWin(x,s),end:'all'};if(!b2fnMoves(b,o,null).length)return {...nd,...tmWin(x,s),end:'block'};
  if(quiet>=60){const a=b2fnCnt(b,0),z=b2fnCnt(b,1);return a===z?{...nd,win:'d',end:'q'}:{...nd,...tmWin(x,a>z?0:1),end:'more'};}return nd;}
function b2fnDo(d,m){const s=d.sd,c=String(s);if(m.stop)return b2fnPass({...d,last:`${tmName(d,s)} وقف الأكل`},s,true);
  const b=b2fnApply(d.b,m,c);const vis=d.ch?[...d.ch.vis,m.t]:[m.f,m.t];
  const x={...d,b,lm:d.ch&&d.lm?[...d.lm,m.t]:[m.f,m.t],lc:m.caps.map(q=>[q,1-s]),last:`${tmName(d,s)}${m.caps.length?` أكل ${m.caps.length} ${m.k==='a'?'بالتقدّم':'بالتراجع'}`:' تحرّك'}`};
  // the very first turn of the game takes one capture only
  if(m.caps.length&&(d.nt||0)>0&&b2fnCnt(b,1-s)){const ch={at:m.t,ld:m.dir,vis};if(b2fnCaps(b,s,ch).length)return {...x,ch,mvn:(d.mvn||0)+1,last:x.last+'، ويقدر يكمّل'};}
  return b2fnPass(x,s,m.caps.length>0);}
const B2FNP={moves:p=>{const ms=b2fnMoves(p.b,p.sd,p.ch);return p.ch?[...ms,{stop:1}]:ms;},
  play(p,m){const s=p.sd,o=1-s;let b=p.b;
    if(!m.stop){b=b2fnApply(b,m,String(s));if(m.caps.length&&p.nt>0&&b2fnCnt(b,o)){const ch={at:m.t,ld:m.dir,vis:p.ch?[...p.ch.vis,m.t]:[m.f,m.t]};if(b2fnCaps(b,s,ch).length)return {b,sd:s,ch,nt:p.nt,w:null};}}
    return {b,sd:o,ch:null,nt:p.nt+1,w:!b2fnCnt(b,o)?s:null};},
  ev(p){const s=p.sd;return (b2fnCnt(p.b,s)-b2fnCnt(p.b,1-s))*100+(p.ch?0:b2fnCaps(p.b,s,null).length>0?30:0);},end:b2End,
  order:(p,ms)=>ms.sort((a,b)=>(b.caps?b.caps.length:0)-(a.caps?a.caps.length:0))};
const B2FNXY=[...Array(45)].map((_,i)=>[6+(i%9)*11,6+(i/9|0)*11]);
const B2FNBG=(()=>{let g='';for(let i=0;i<45;i++)for(const k of b2fnDirs(i)){const [dr,dc]=B2FND[k];if(dr<0||(dr===0&&dc<0))continue;const t=b2fnAt(i,dr,dc,1);if(t>=0)g+=b2Line(B2FNXY[i],B2FNXY[t]);}
  return `<svg viewBox="0 0 100 56" aria-hidden="true"><g class="b2ln">${g}</g>${b2Dots(B2FNXY,1.1)}</svg>`;})();
GAMES.b_fanoron={...B2TEAM,name:'فانورونا',cat:'board',lbc:'#4E7A3A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6FA35A"/><rect x="6" y="24" width="88" height="52" rx="5" fill="#EFD7A6"/><g stroke="#6B4A24" stroke-width="1.8" fill="none"><path d="M14 32H86M14 50H86M14 68H86M14 32V68M32 32V68M50 32V68M68 32V68M86 32V68M14 32L50 68L86 32M14 68L50 32L86 68"/></g>${[14,32,50,68,86].map(x=>`<circle cx="${x}" cy="32" r="5.5" fill="#2D3B4C"/><circle cx="${x}" cy="68" r="5.5" fill="#FBF6EC" stroke="#6B4A24" stroke-width="1.3"/>`).join('')}<circle cx="32" cy="50" r="5.5" fill="#FBF6EC" stroke="#6B4A24" stroke-width="1.3"/><circle cx="68" cy="50" r="5.5" fill="#2D3B4C"/></svg>`,
  init:()=>({b:B2FN0,sd:0,tr:[0,0],ch:null,nt:0,quiet:0,lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){if(d.ch)return b2fnDo(d,{stop:1});return b2fnDo(d,b2Rnd(b2fnMoves(d.b,d.sd,null)));},
  points:d=>d.pl.map((_,s)=>`${s%2?'⚫':'⚪'} ${b2fnCnt(d.b,s%2)}`),
  winText:d=>b2WinTxt(d,B2M9N,{all:'أكل كل حجار الخصم',block:'الخصم ما عنده حركة',more:'30 حركة لكل واحد بدون أكل، وعنده حجار أكثر',q:'تعادل: 30 حركة لكل واحد بدون أكل'}),
  status(d,ctx){const caps=b2fnCaps(d.b,d.sd,d.ch);return b2Stat(d,ctx,B2M9N,d.ch?'• كمّل الأكل بنفس الحجر أو اضغط خلاص':caps.length?'<br><small>الأكل إجباري: تقدّم لحجر الخصم أو ابتعد عنه</small>':'');},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=b2Flip(d,ctx),P=b2Sel(d),ms=my?b2fnMoves(d.b,s,d.ch):[];
    const f=d.ch?d.ch.at:P&&P.f!=null?P.f:-1;const mv=new Set(ms.map(m=>m.f));const to=new Set(ms.filter(m=>m.f===f).map(m=>m.t));
    // a landing point with both kinds of capture: the player taps the first piece of the line to take
    const two=P&&P.t!=null?ms.filter(m=>m.f===f&&m.t===P.t):[];const cap=new Set(two.map(m=>m.caps[0]));const vis=new Set(d.ch?d.ch.vis:[]);
    const pts=B2FNXY.map(([x,y],i)=>{const v=d.b[i];const tap=my&&(cap.size?cap.has(i):mv.has(i)||to.has(i));
      return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel:f,to:cap.size?new Set([P.t]):to,mv:f>=0?null:mv,cap})+(vis.has(i)&&i!==f?' vis':''),p:v!=='.'?b2Stone(+v):b2Ghost(d,i)};});
    let h=b2Board('b2fn bd-b2',100,56,9.4,B2FNBG,pts,flip,my);
    if(my&&cap.size)h+='<p class="note">تقدر تاكل بطريقتين: اضغط أول حجر من الخط اللي تبي تاكله</p>';
    if(my&&d.ch)h+='<div class="row chact"><button class="btn green" data-ga="stop">خلاص، أنهي دوري</button></div>';return h+b2ResignBtn(ctx);},
  after:d=>b2Fly('fn',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);if(a==='stop'){if(d.ch)act(b2fnDo(d,{stop:1}));return;}if(a!=='pt')return;
    const ms=b2fnMoves(d.b,d.sd,d.ch),P=b2Sel(d),f=d.ch?d.ch.at:P&&P.f!=null?P.f:-1;
    if(P&&P.t!=null){const m=ms.find(x=>x.f===f&&x.t===P.t&&x.caps[0]===i);if(m){S.b2=null;act(b2fnDo(d,m));return;}b2Pick(d,null);return;}
    const at=ms.filter(x=>x.f===f&&x.t===i);if(at.length===1){S.b2=null;act(b2fnDo(d,at[0]));return;}if(at.length>1){b2Pick(d,{f,t:i});return;}
    if(!d.ch)b2Pick(d,ms.some(x=>x.f===i)&&f!==i?{f:i}:null);},
  bot(d,s,lv){const ms=b2fnMoves(d.b,d.sd,d.ch);if(!ms.length)return b2fnDo(d,{stop:1});
    if(lv===1&&Math.random()<.3)return b2fnDo(d,b2Rnd(d.ch?[...ms,{stop:1}]:ms));
    const m=b2Think({b:d.b,sd:d.sd,ch:d.ch,nt:d.nt||0,w:null},B2FNP,lv,{dep:[0,1,3,6],cap:[0,800,8000,40000],ns:[0,90,20,1]});return b2fnDo(d,m||ms[0]);},
  botDelay:()=>450+rnd(400)};
HELP.b_fanoron='فانورونا (لعبة من مدغشقر): لوحة 9×5 نقاط بخطوطها، وكل واحد عنده 22 حجر والنقطة اللي بالوسط فاضية. الحجر يمشي لنقطة جارة فاضية على خط. الأكل بطريقتين: تتقدّم باتجاه حجر للخصم (يكون في النقطة اللي بعد نقطة وصولك على نفس الخط)، أو تبتعد عن حجر للخصم لاصق فيك من الجهة الثانية. وتاكل الحجر هذا وكل حجار الخصم اللي وراه على نفس الخط بدون فراغ. إذا الحركة تقدر تاكل بالطريقتين تختار وحدة. الأكل إجباري. بعد ما تاكل تقدر تكمّل بنفس الحجر أكلة ثانية، بس مو بنفس الاتجاه اللي قبلها ولا لنقطة مريت عليها في نفس الدور، وتقدر توقف متى ما تبي (أول دور في اللعبة أكلة وحدة بس). يفوز اللي ياكل كل حجار الخصم أو يخليه بدون حركة. إذا مرت 30 حركة لكل واحد بدون أكل يفوز صاحب الحجار الأكثر، وإذا متساوية تعادل. الأبيض يبدأ. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= حصار الملك: tablut (hnefatafl 9×9) ================= */
// 'a' attackers (side 0, they open), 'd' defenders and 'k' their king (side 1). Every piece moves like a rook; only the
// king may stop on the throne (40) and nobody else passes over it. A piece between two enemies (or an enemy and the empty
// throne) is taken; the king is armed. The king is taken on four sides on the throne, on three next to it, else on two
const B2TB0=(()=>{const b=Array(81).fill('.');for(const [r,c] of [[0,3],[0,4],[0,5],[1,4],[8,3],[8,4],[8,5],[7,4],[3,0],[4,0],[5,0],[4,1],[3,8],[4,8],[5,8],[4,7]])b[r*9+c]='a';
  for(const [r,c] of [[2,4],[3,4],[5,4],[6,4],[4,2],[4,3],[4,5],[4,6]])b[r*9+c]='d';b[40]='k';return b.join('');})();
const b2tbOwn=(x,s)=>s===0?x==='a':x==='d'||x==='k';
const b2tbEdge=i=>{const r=i/9|0,c=i%9;return r===0||r===8||c===0||c===8;};
const b2tbNb=i=>{const r=i/9|0,c=i%9,o=[];for(const [dr,dc] of B2SGD){const rr=r+dr,cc=c+dc;o.push(rr<0||rr>8||cc<0||cc>8?-1:rr*9+cc);}return o;};
function b2tbMoves(b,s){const o=[];for(let f=0;f<81;f++){if(!b2tbOwn(b[f],s))continue;const k=b[f]==='k';
    for(const [dr,dc] of B2SGD){let r=(f/9|0)+dr,c=f%9+dc;while(r>=0&&r<9&&c>=0&&c<9){const t=r*9+c;if(b[t]!=='.')break;
        if(t===40&&!k)break;o.push({f,t});r+=dr;c+=dc;}}}return o;}
function b2tbKingDead(a,K,t){const nb=b2tbNb(K);if(!nb.includes(t))return false;
  if(K===40)return nb.every(q=>a[q]==='a');if(nb.includes(40))return nb.every(q=>q===40||a[q]==='a');
  const o=2*K-t;return a[o]==='a'||(o===40&&a[40]==='.');}
// the board after a move, the pieces it took, and whether the king was taken
function b2tbApply(b,m){const a=[...b],p=a[m.f];a[m.f]='.';a[m.t]=p;const s=p==='a'?0:1,caps=[];let kd=false;
  for(const [dr,dc] of B2SGD){const r=(m.t/9|0)+dr,c=m.t%9+dc,r2=r+dr,c2=c+dc;if(r2<0||r2>8||c2<0||c2>8)continue;const q=r*9+c,e=r2*9+c2,v=a[q];
    if(v==='.'||v==='k'||b2tbOwn(v,s))continue;if(b2tbOwn(a[e],s)||(e===40&&a[40]==='.')){a[q]='.';caps.push(q);}}
  if(s===0){const K=a.indexOf('k');if(K>=0&&b2tbKingDead(a,K,m.t)){a[K]='.';kd=K;}}
  return {b:a.join(''),caps,kd,esc:p==='k'&&b2tbEdge(m.t)};}
const b2tbCnt=(b,c)=>{let n=0;for(const x of b)if(x===c)n++;return n;};
function b2tbDo(d,m){const s=d.sd,r=b2tbApply(d.b,m);const key=r.b+(1-s);const hist=r.caps.length?[key]:[...(d.hist||[]),key].slice(-90);
  const lc=r.caps.map(q=>[q,s]);if(r.kd!==false)lc.push([r.kd,2]);
  const nd=b2Pass(d,s,{b:r.b,hist,lm:[m.f,m.t],lc,nmv:(d.nmv||0)+1,last:`${tmName(d,s)} ${d.b[m.f]==='k'?'حرّك الملك':'تحرّك'}${r.caps.length?` وأكل ${r.caps.length}`:''}`});
  if(r.esc)return {...nd,...tmWin(d,1),end:'esc'};if(r.kd!==false)return {...nd,...tmWin(d,0),end:'king'};
  if(!b2tbMoves(r.b,1-s).length)return {...nd,...tmWin(d,s),end:'block'};
  if(b2Rep(hist,key)>=3||nd.nmv>=200)return {...nd,win:'d',end:nd.nmv>=200?'long':'rep'};return nd;}
// open lines from the king to the edge
function b2tbOpen(b,K){let n=0;for(const [dr,dc] of B2SGD){let r=(K/9|0)+dr,c=K%9+dc,ok=true;while(r>=0&&r<9&&c>=0&&c<9){const t=r*9+c;if(b[t]!=='.'||t===40){ok=false;break;}r+=dr;c+=dc;}if(ok)n++;}return n;}
function b2tbEv(b,sd){const K=b.indexOf('k');if(K<0)return sd?-B2W/2:B2W/2;const na=b2tbCnt(b,'a'),nd=b2tbCnt(b,'d');
  let v=nd*45-na*30;const open=b2tbOpen(b,K);if(open)v+=sd===1?20000:open>1?12000:350;
  // squares the king reaches in one move from where a line to the edge is open
  for(const m of b2tbMoves(b,1))if(b[m.f]==='k'&&b2tbOpen(b,m.t))v+=45;
  for(const q of b2tbNb(K))if(q>=0&&b[q]==='a')v-=55;const r=K/9|0,c=K%9;v-=Math.min(r,8-r,c,8-c)*18;
  // attackers on the diagonals around the king make a cordon
  for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<9&&cc>=0&&cc<9&&b[rr*9+cc]==='a')v-=18;}
  return sd===1?v:-v;}
const B2TBP={moves:p=>b2tbMoves(p.b,p.sd),play(p,m){const s=p.sd,r=b2tbApply(p.b,m);return {b:r.b,sd:1-s,w:r.esc?1:r.kd!==false?0:null};},
  ev:p=>b2tbEv(p.b,p.sd),end:b2End,
  order(p,ms){const b=p.b,K=b.indexOf('k');for(const m of ms){let o=0;if(b[m.f]==='k')o+=b2tbEdge(m.t)?1e4:30;
      if(K>=0&&b2tbNb(K).includes(m.t))o+=40;for(const q of b2tbNb(m.t))if(q>=0&&b[q]!=='.'&&!b2tbOwn(b[q],p.sd))o+=15;m.o=o;}return ms.sort((x,y)=>y.o-x.o);}};
const B2TBXY=[...Array(81)].map((_,i)=>[5+(i%9)*10,5+(i/9|0)*10]);
const B2TBBG=(()=>{let g='';for(let i=0;i<81;i++){const [x,y]=B2TBXY[i];if(b2tbEdge(i))g+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" class="b2edge"/>`;}
  return `<svg viewBox="0 0 90 90" aria-hidden="true">${g}<rect x="40" y="40" width="10" height="10" class="b2thr"/><path d="M42.5 42.5l5 5M47.5 42.5l-5 5" class="b2thx"/><g class="b2ln">${[...Array(10)].map((_,k)=>b2Line([k*10,0],[k*10,90])+b2Line([0,k*10],[90,k*10])).join('')}</g></svg>`;})();
const B2CROWN='<svg viewBox="0 0 24 24" class="b2cr"><path d="M3.5 8.5l4.3 3.8L12 5.2l4.2 7.1 4.3-3.8-1.9 9.7H5.4z" fill="#F4C542" stroke="#8C5E0C" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const B2TBN=['المهاجمين','المدافعين'];
GAMES.b_tablut={...B2TEAM,name:'حصار الملك',cat:'board',lbc:'#5C4A8A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A64B0"/><rect x="10" y="10" width="80" height="80" rx="4" fill="#E9D3A4"/><g stroke="#8A6236" stroke-width="1.2">${[1,2,3,4,5,6,7].map(k=>`<path d="M${10+k*10} 10V90M10 ${10+k*10}H90"/>`).join('')}</g><rect x="40" y="40" width="20" height="20" fill="#C9A15B" opacity=".6"/>${[[50,15],[15,50],[85,50],[50,85],[40,15],[60,15]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.6" fill="#2D3B4C"/>`).join('')}${[[50,35],[35,50],[65,50],[50,65]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.6" fill="#FBF6EC" stroke="#8A6236" stroke-width="1.2"/>`).join('')}<circle cx="50" cy="50" r="6.5" fill="#FBF6EC" stroke="#8A6236" stroke-width="1.4"/><path d="M45 49l2.2 2 2.8-4.4 2.8 4.4 2.2-2-1 5.4h-8z" fill="#F4C542" stroke="#8C5E0C" stroke-width=".8"/></svg>`,
  init:()=>({b:B2TB0,sd:0,tr:[0,0],hist:[],nmv:0,lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){return b2tbDo(d,b2Rnd(b2tbMoves(d.b,d.sd)));},
  points:d=>d.pl.map((_,s)=>s%2?`⚪ ${b2tbCnt(d.b,'d')}+👑`:`⚫ ${b2tbCnt(d.b,'a')}`),
  winText:d=>b2WinTxt(d,B2TBN,{esc:'الملك هرب للطرف',king:'حاصروا الملك',block:'الخصم ما عنده حركة',rep:'تعادل: نفس الوضع تكرر 3 مرات',long:'تعادل: طالت اللعبة 200 حركة'}),
  status(d,ctx){const K=d.b.indexOf('k');return b2Stat(d,ctx,B2TBN,d.sd===0&&K>=0&&b2tbOpen(d.b,K)?'<br><small>انتبه! الملك عنده طريق مفتوح للطرف</small>':'',0);},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=b2Flip(d,ctx),P=b2Sel(d),ms=my?b2tbMoves(d.b,s):[];const f=P?P.f:-1;
    const mv=new Set(ms.map(m=>m.f)),to=new Set(ms.filter(m=>m.f===f).map(m=>m.t));
    const pts=B2TBXY.map(([x,y],i)=>{const v=d.b[i];const tap=my&&(mv.has(i)||to.has(i));
      const p=v==='.'?b2Ghost(d,i).replace('s2','s0 kg'):v==='a'?b2Stone(1):v==='d'?b2Stone(0):b2Stone(0,'kg',B2CROWN);return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel:f,to,mv:P?null:mv}),p};});
    return b2Board('b2tb bd-b2',90,90,10,B2TBBG,pts,flip,my)+b2ResignBtn(ctx);},
  after:d=>b2Fly('tb',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);if(a!=='pt')return;const ms=b2tbMoves(d.b,d.sd),P=b2Sel(d);
    if(P){const m=ms.find(x=>x.f===P.f&&x.t===i);if(m){S.b2=null;act(b2tbDo(d,m));return;}}b2Pick(d,ms.some(x=>x.f===i)&&(!P||P.f!==i)?{f:i}:null);},
  bot(d,s,lv){const ms=b2tbMoves(d.b,d.sd);if(lv===1&&Math.random()<.25)return b2tbDo(d,b2Rnd(ms));
    // a king that can reach the edge always goes, and an attacker always blocks the last open line it can
    const m=b2Think({b:d.b,sd:d.sd,w:null},B2TBP,lv,{dep:[0,1,2,4],cap:[0,1500,8000,22000],ns:[0,140,30,2]});return b2tbDo(d,m||b2Rnd(ms));},
  botDelay:()=>500+rnd(400)};
HELP.b_tablut='حصار الملك (تابلوت، من ألعاب الشمال القديمة): لوحة 9×9. المهاجمين (16 حجر أسود) يحاصرون، والمدافعين (8 حجار بيض) يحمون الملك اللي بالوسط على العرش. المهاجمين يبدأون. كل حجر يمشي أي عدد من المربعات بخط مستقيم مثل القلعة في الشطرنج، بدون ما يقفز. العرش (المربع اللي بالوسط) للملك بس، وما أحد يعدّي من فوقه. تاكل حجر الخصم إذا حطيته بين حجرك وحجر ثاني لك على نفس الخط (والعرش الفاضي يحسب كأنه حجر ضده)، والملك يشارك في الأكل. يفوز المدافعين إذا وصل الملك لأي مربع على طرف اللوحة. يفوز المهاجمين إذا حاصروا الملك: من الجهات الأربع وهو على العرش، ومن الثلاث جهات الباقية إذا كان جنب العرش، وبين حجرين إذا كان بعيد. اللي ما عنده حركة يخسر. تعادل إذا تكرر نفس الوضع 3 مرات أو طالت اللعبة 200 حركة. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= الملكات والسهام: game of the amazons ================= */
// four queens each; a turn moves one queen like a chess queen, then shoots an arrow from where it landed, also like a
// queen. Arrows stay for good. The side that cannot move loses
const B2Q8=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
function b2azInit(n){const b=Array(n*n).fill('.');const P=n===10?[[[6,0],[9,3],[9,6],[6,9]],[[3,0],[0,3],[0,6],[3,9]]]:[[[5,0],[7,2],[7,5],[5,7]],[[2,0],[0,2],[0,5],[2,7]]];
  P.forEach((L,s)=>L.forEach(([r,c])=>{b[r*n+c]=String(s);}));return b.join('');}
function b2azRay(b,n,f){const o=[],r0=f/n|0,c0=f%n;for(const [dr,dc] of B2Q8){let r=r0+dr,c=c0+dc;while(r>=0&&r<n&&c>=0&&c<n&&b[r*n+c]==='.'){o.push(r*n+c);r+=dr;c+=dc;}}return o;}
const b2azMine=(b,s)=>{const c=String(s),o=[];for(let i=0;i<b.length;i++)if(b[i]===c)o.push(i);return o;};
// a queen with an empty square next to it can always move there and shoot back where it stood
function b2azCan(b,n,s){for(const f of b2azMine(b,s)){const r=f/n|0,c=f%n;for(const [dr,dc] of B2Q8){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n&&b[rr*n+cc]==='.')return true;}}return false;}
function b2azMoves(b,n,s){const o=[],c=String(s);for(const f of b2azMine(b,s))for(const t of b2azRay(b,n,f)){const nb=b2m9Set(b,f,t,c);for(const a of b2azRay(nb,n,t))o.push({f,t,a});}return o;}
const b2azApply=(b,m,c)=>setAt(b2m9Set(b,m.f,m.t,c),m.a,'x');
// queen distance: the fewest queen moves from any queen of side s to each square
function b2azDist(b,n,s){const N=n*n,D=new Int8Array(N).fill(99);let fr=b2azMine(b,s);let lv=0;
  while(fr.length){lv++;const nx=[];for(const f of fr){const r0=f/n|0,c0=f%n;for(const [dr,dc] of B2Q8){let r=r0+dr,c=c0+dc;while(r>=0&&r<n&&c>=0&&c<n){const q=r*n+c;if(b[q]!=='.')break;if(D[q]>lv){D[q]=lv;nx.push(q);}r+=dr;c+=dc;}}}fr=nx;}return D;}
// the squares each side reaches first, and how free its queens are; ties count a little for the side to move
function b2azEv(b,n,sd){const A=b2azDist(b,n,sd),B=b2azDist(b,n,1-sd);let t=0;for(let i=0;i<n*n;i++){if(b[i]!=='.')continue;const x=A[i],y=B[i];if(x<y)t+=1;else if(y<x)t-=1;else if(x<99)t+=.15;}
  let mob=0;for(const f of b2azMine(b,sd))mob+=Math.min(b2azRay(b,n,f).length,10);for(const f of b2azMine(b,1-sd))mob-=Math.min(b2azRay(b,n,f).length,10);return t*10+mob*1.5;}
// once no empty area is shared, each side keeps the squares it can still fill: the larger area wins (on a tie the side
// to move runs out first)
function b2azSplit(b,n){const N=n*n,seen=new Uint8Array(N),area=[0,0];
  for(let i=0;i<N;i++){if(b[i]!=='.'||seen[i])continue;const st=[i];seen[i]=1;let sz=0;const who=new Set();
    while(st.length){const q=st.pop();sz++;const r=q/n|0,c=q%n;for(const [dr,dc] of B2Q8){const rr=r+dr,cc=c+dc;if(rr<0||rr>=n||cc<0||cc>=n)continue;const x=rr*n+cc;if(b[x]==='0'||b[x]==='1')who.add(+b[x]);if(b[x]==='.'&&!seen[x]){seen[x]=1;st.push(x);}}}
    if(who.size>1)return null;for(const s of who)area[s]+=sz;}
  return area;}
function b2azDo(d,m){const s=d.sd,c=String(s),n=d.n,b=b2azApply(d.b,m,c);
  const nd=b2Pass(d,s,{b,ph:'move',at:-1,lm:[m.f,m.t],ar:m.a,nmv:(d.nmv||0)+1,last:`${tmName(d,s)} حرّك ملكة ورمى سهم`});
  if(!b2azCan(b,n,1-s))return {...nd,...tmWin(d,s),end:'block'};
  const ar=b2azSplit(b,n);if(ar){const w=ar[0]===ar[1]?s:ar[0]>ar[1]?0:1;return {...nd,...tmWin(d,w),end:'area',area:ar};}
  return nd;}
function b2azThink(d,lv){const n=d.n,s=d.sd,c=String(s);let ms=b2azMoves(d.b,n,s);if(!ms.length)return null;
  const cap=[0,90,600,2200][lv]||600;if(ms.length>cap){for(let i=ms.length-1;i>0;i--){const j=rnd(i+1);[ms[i],ms[j]]=[ms[j],ms[i]];}ms=ms.slice(0,cap);}
  const ns=[0,25,6,.5][lv];for(const m of ms){const b=b2azApply(d.b,m,c);m.v=b2azCan(b,n,1-s)?-b2azEv(b,n,1-s)+Math.random()*ns:1e6;}
  ms.sort((x,y)=>y.v-x.v);if(lv<3||ms[0].v>=1e6)return ms[0];
  // hard: the best few, each against the strongest of a sample of the other side's answers
  let best=ms[0],bv=-Infinity;for(const m of ms.slice(0,6)){const b=b2azApply(d.b,m,c);let rs=b2azMoves(b,n,1-s);
    if(rs.length>220){for(let i=rs.length-1;i>0;i--){const j=rnd(i+1);[rs[i],rs[j]]=[rs[j],rs[i]];}rs=rs.slice(0,220);}
    let worst=Infinity;for(const r of rs){const b2=b2azApply(b,r,String(1-s));const v=b2azCan(b2,n,s)?b2azEv(b2,n,s):-1e6;if(v<worst)worst=v;}
    if(worst>bv){bv=worst;best=m;}}return best;}
const b2azXY=n=>[...Array(n*n)].map((_,i)=>[5+(i%n)*10,5+(i/n|0)*10]);
const b2azBG=n=>{let g='';for(let i=0;i<n*n;i++)if(((i/n|0)+i%n)%2)g+=`<rect x="${(i%n)*10}" y="${(i/n|0)*10}" width="10" height="10"/>`;return `<svg viewBox="0 0 ${n*10} ${n*10}" aria-hidden="true"><g class="b2dk">${g}</g></svg>`;};
const B2AZN=['الأبيض','الأسود'];
const b2azQ=s=>`<i class="b2s b2q s${s}"><svg viewBox="0 0 40 40" class="chp ${s?'bk':'wh'}">${CHP.q}</svg></i>`;
GAMES.b_amazons={...B2TEAM,name:'الملكات والسهام',cat:'board',lbc:'#2E7D6B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E9C86"/>${[0,1,2,3].map(r=>[0,1,2,3].map(c=>`<rect x="${10+c*20}" y="${10+r*20}" width="20" height="20" fill="${(r+c)%2?'#B98A55':'#EED6AC'}"/>`).join('')).join('')}<g transform="translate(12 12) scale(.9)" fill="#fff" stroke="#2D4763" stroke-width="1.6" stroke-linejoin="round">${CHP.q}</g><circle cx="70" cy="70" r="6" fill="#7A3B22"/><path d="M46 54L66 34M60 34h6v6" stroke="#E5534B" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`,
  init:()=>({n:10,b:b2azInit(10),ph:'move',at:-1,ar:-1,sd:0,tr:[0,0],nmv:0,lm:null,mvn:0,last:''}),
  onTimeout(d){const n=d.n,c=String(d.sd);if(d.ph==='shoot'){const f=d.lm[0],nb=b2m9Set(d.b,d.at,f,c);return b2azDo({...d,b:nb},{f,t:d.at,a:b2Rnd(b2azRay(d.b,n,d.at))});}
    return b2azDo(d,b2Rnd(b2azMoves(d.b,n,d.sd)));},
  points:d=>d.pl.map((_,s)=>s%2?'♛ الأسود':'♕ الأبيض'),
  winText:d=>b2WinTxt(d,B2AZN,{block:'الخصم ما عنده حركة',area:d.area?`انفصلوا، ومساحته أكبر (${d.area[d.win%2]} مقابل ${d.area[1-d.win%2]})`:'انفصلوا ومساحته أكبر'}),
  status:(d,ctx)=>b2Stat(d,ctx,B2AZN,d.ph==='shoot'?'• ارمِ سهم من الملكة':'• حرّك ملكة'),
  render(d,ctx){const my=ctx.my,s=d.sd,n=d.n,flip=b2Flip(d,ctx),P=b2Sel(d),c=String(s);
    let mv=new Set(),to=new Set();const sel=d.ph==='shoot'?d.at:P?P.f:-1;
    if(my&&d.ph==='move'){for(const f of b2azMine(d.b,s))if(b2azRay(d.b,n,f).length)mv.add(f);if(P)to=new Set(b2azRay(d.b,n,P.f));}
    if(my&&d.ph==='shoot')to=new Set(b2azRay(d.b,n,d.at));
    const pts=b2azXY(n).map(([x,y],i)=>{const v=d.b[i];const tap=my&&(to.has(i)||d.ph==='move'&&mv.has(i));
      return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel,to,mv:sel>=0?null:mv})+(d.ph==='shoot'&&to.has(i)?' shoot':'')+(i===d.ar?' arl':''),p:v==='x'?'<i class="b2ar"></i>':v!=='.'?b2azQ(+v):''};});
    let h=b2Board('b2az bd-b2',n*10,n*10,10,b2azBG(n),pts,flip,my);
    if(my&&!d.nmv&&d.ph==='move')h+=`<div class="row chact"><button class="btn ${n===10?'green':''}" data-ga="size" data-i="10">لوحة 10×10</button><button class="btn ${n===8?'green':''}" data-ga="size" data-i="8">لوحة 8×8</button></div>`;
    return CHDEFS+h+b2ResignBtn(ctx);},
  after:d=>b2Fly('az',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);const n=d.n,s=d.sd,c=String(s);
    if(a==='size'){if(!d.nmv&&d.ph==='move'&&(i===8||i===10)&&i!==n){S.b2=null;act({...d,n:i,b:b2azInit(i),mvn:(d.mvn||0)+1,last:`صارت اللوحة ${i}×${i}`});}return;}
    if(a!=='pt')return;
    if(d.ph==='shoot'){if(b2azRay(d.b,n,d.at).includes(i)){const f=d.lm[0];act(b2azDo({...d,b:b2m9Set(d.b,d.at,f,c)},{f,t:d.at,a:i}));}return;}
    const P=b2Sel(d);if(P&&b2azRay(d.b,n,P.f).includes(i)){S.b2=null;act({...d,b:b2m9Set(d.b,P.f,i,c),ph:'shoot',at:i,lm:[P.f,i],ar:-1,mvn:(d.mvn||0)+1,last:`${tmName(d,s)} حرّك ملكة، الحين يرمي سهم`});return;}
    b2Pick(d,d.b[i]===c&&b2azRay(d.b,n,i).length&&(!P||P.f!==i)?{f:i}:null);},
  bot(d,s,lv){const n=d.n,c=String(d.sd);
    if(d.ph==='shoot'){// a half-played turn (a human's timer or a seat change): shoot at the best square from here
      const f=d.lm[0],base=b2m9Set(d.b,d.at,f,c);let best=null,bv=-Infinity;for(const a of b2azRay(d.b,n,d.at)){const b=setAt(d.b,a,'x');const v=-b2azEv(b,n,1-d.sd);if(v>bv){bv=v;best=a;}}
      return b2azDo({...d,b:base},{f,t:d.at,a:best});}
    const m=b2azThink(d,lv);return m?b2azDo(d,m):GAMES.b_amazons.onTimeout(d);},
  botDelay:()=>500+rnd(400)};
HELP.b_amazons='الملكات والسهام: كل واحد عنده 4 ملكات على لوحة 10×10 (أو 8×8 تختارونها قبل أول حركة). في دورك تسوي شيئين: تحرّك ملكة من ملكاتك مثل الوزير في الشطرنج (أي عدد مربعات بخط مستقيم أو مائل بدون ما تقفز)، وبعدين ترمي من مكانها الجديد سهم بنفس الطريقة لأي مربع فاضي (حتى المربع اللي جت منه). السهم يقفل مربعه للأبد، وما أحد يعدّي من فوقه. ما فيه أكل. اللي ما يقدر يحرّك ولا ملكة في دوره يخسر. إذا انفصلت ملكات الطرفين ولا صار فيه مكان مشترك، اللعبة تنحسب: اللي مساحته الفاضية أكبر يفوز، وإذا تساوت يخسر اللي عليه الدور. الأبيض يبدأ. إذا أكثر من لاعبين: فريقين يتناوبون.';

'use strict';
/* pencil2: pencil-and-paper and combinatorial strategy games. The two-sided ones use the side rotation of chess.js
   (tmSeats, tmNow, tmPass, tmName, tmWin, tmSkip): with more than two players even seats play one side and odd seats the
   other, and the members of a side take turns moving for it. The side that opens changes every round.
   Every top-level name here starts with pn so it never meets another file's names. */

/* ================= shared ================= */
const PNW=1e6;
// UI-only selection, dropped by itself once the board changes
const pnK=d=>d.gid+':'+(d.mvn||0);
const pnSel=d=>S.pn&&S.pn.k===pnK(d)?S.pn:null;
function pnPick(d,o){S.pn=o?{...o,k:pnK(d)}:null;render();}
const pnRnd=a=>a[rnd(a.length)];
const pnShuf=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=rnd(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;};
// side s moved: the other side plays next (its member due now)
const pnPass=(d,s,x)=>({...d,...x,sd:1-s,...tmPass(d,s),mvn:(d.mvn||0)+1});
const pnWon=(d,s,end,x)=>({...d,...x,...tmWin(d,s),end,mvn:(d.mvn||0)+1});
const pnFresh=d=>!d.mvn&&d.win==null;
// the two sides open in turn, round after round
const PNTEAM={teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,onSkip:tmSkip,
  start:d=>{const s0=(d.st||0)%2;return {...d,sd:s0,s0,turn:tmNow(d,s0)};}};
const pnChip=(s,names)=>`<span class="pnchip c${s}">${names[s]}</span>`;
function pnStat(d,ctx,names,tail){let s=d.last?`<small>${d.last}</small><br>`:'';const me=!ctx.local&&d.turn===ctx.v;
  s+=`${me?'<b class="yt">دورك</b>':`دور ${tmName(d,d.sd)}`} ${pnChip(d.sd,names)}`;return s+(tail?' '+tail:'');}
function pnWinTxt(d,names,why){if(d.win==='d')return (why&&why.d)||'تعادل';const sd=d.win%2;
  return `فاز ${names[sd]}${d.end==='resign'?' بالاستسلام':d.end==='left'?'، الخصم طلع':why&&why[d.end]?'، '+why[d.end]:''}`;}
const pnPts=names=>d=>d.pl.map((_,s)=>names[s%2]);
// the option row shown before the first move (sizes, number of boards ...)
const pnOpts=(d,ctx,ga,list,cur)=>pnFresh(d)&&!ctx.bot?`<div class="segs pnopt">${list.map(([v,t])=>`<button class="seg ${v===cur?'on':''}" data-ga="${ga}" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:'';

/* the search: negamax with alpha-beta and iterative deepening over whole moves, capped by a node budget (never by time
   alone). P.moves(p), P.play(p,m) -> position, P.ev(p) for the side to move p.sd, P.end(p,ply) null or a final value.
   A position with no move is lost for the side to move unless P.stuck says otherwise */
const PNSTOP={};
function pnThink(p0,P,lv,cfg){const cap=cfg.cap[lv],maxD=cfg.dep[lv],ns=cfg.ns[lv];let nodes=0,lim=Infinity;
  function nega(p,dep,a,b,ply){if(++nodes>lim)throw PNSTOP;const e=P.end(p,ply);if(e!=null)return e;if(dep<=0)return P.ev(p);
    let ms=P.moves(p);if(!ms.length)return P.stuck?P.stuck(p,ply):-(PNW-ply);if(P.order)ms=P.order(p,ms);
    let best=-Infinity;for(const m of ms){const q=P.play(p,m);const v=q.sd===p.sd?nega(q,dep-1,a,b,ply+1):-nega(q,dep-1,-b,-a,ply+1);
      if(v>best)best=v;if(v>a)a=v;if(a>=b)break;}return best;}
  let ms=P.moves(p0);if(!ms.length)return null;if(ms.length===1)return ms[0];if(P.order)ms=P.order(p0,ms);
  const root=ms.map(m=>({m,q:P.play(p0,m),n:Math.random()*ns,v:0}));let best=root[0].m;
  for(let dep=1;dep<=maxD;dep++){lim=dep===1?Infinity:nodes+cap;let bv=-Infinity,bm=null;
    try{for(const o of root){const q=o.q;o.v=(q.sd===p0.sd?nega(q,dep-1,bv-o.n,Infinity,1):-nega(q,dep-1,-Infinity,-(bv-o.n),1))+o.n;if(o.v>bv){bv=o.v;bm=o.m;}}}
    catch(e){if(e!==PNSTOP)throw e;if(bm)best=bm;break;}
    best=bm;root.sort((x,y)=>y.v-x.v);if(Math.abs(bv)>PNW/2)break;}
  return best;}
const pnEnd=(p,ply)=>p.w==null?null:p.w==='d'?0:p.w===p.sd?PNW-ply:-(PNW-ply);
// mex of a set of small numbers
const pnMex=a=>{const s=new Set(a);let g=0;while(s.has(g))g++;return g;};

/* ================= المثلثات: the game of Sim ================= */
// six dots on a ring, 15 lines; each side colours lines in its colour, and whoever closes a triangle of its own colour loses
const PNSE=(()=>{const e=[];for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)e.push([i,j]);return e;})();
const pnsEi=(a,b)=>PNSE.findIndex(([x,y])=>x===Math.min(a,b)&&y===Math.max(a,b));
const PNST=(()=>{const t=[];for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)for(let c=b+1;c<6;c++)t.push({e:[pnsEi(a,b),pnsEi(a,c),pnsEi(b,c)],v:[a,b,c]});return t;})();
const PNSTE=PNSE.map((_,e)=>PNST.filter(t=>t.e.includes(e)));
const PNSXY=[0,1,2,3,4,5].map(k=>[50+38*Math.sin(k*Math.PI/3),50-38*Math.cos(k*Math.PI/3)]);
// the triangle colouring e in c would close (or null)
function pnsTri(b,e,c){for(const t of PNSTE[e]){let ok=true;for(const x of t.e)if(x!==e&&b[x]!==c){ok=false;break;}if(ok)return t;}return null;}
const pnsSafe=(b,c)=>{let n=0;for(let e=0;e<15;e++)if(b[e]==='.'&&!pnsTri(b,e,c))n++;return n;};
function pnsDo(d,e){const s=d.sd,c=String(s),t=pnsTri(d.b,e,c),b=setAt(d.b,e,c);
  if(t)return pnWon(d,1-s,'tri',{b,lm:e,tri:t.v,last:`${tmName(d,s)} سكّر مثلث بلونه`});
  return pnPass(d,s,{b,lm:e,tri:null,last:`${tmName(d,s)} لوّن خط`});}
const PNSP={moves:p=>{const o=[];for(let e=0;e<15;e++)if(p.b[e]==='.')o.push(e);return o;},
  play(p,e){const c=String(p.sd);return {b:setAt(p.b,e,c),sd:1-p.sd,w:pnsTri(p.b,e,c)?1-p.sd:null};},
  ev(p){return (pnsSafe(p.b,String(p.sd))-pnsSafe(p.b,String(1-p.sd)))*10;},end:pnEnd,
  // safe lines first, and among them the ones that make the fewest new two-line corners of one's own colour
  order(p,ms){const c=String(p.sd);return ms.map(e=>{let k=pnsTri(p.b,e,c)?100:0;for(const t of PNSTE[e])for(const x of t.e)if(x!==e&&p.b[x]===c)k++;return [k,e];}).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);}};
const PNSN=['الأحمر','الأزرق'];
GAMES.g_sim={...PNTEAM,name:'المثلثات',cat:'mind',lbc:'#B23A48',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F6E7D2"/>${(()=>{const P=[0,1,2,3,4,5].map(k=>[50+34*Math.sin(k*Math.PI/3),50-34*Math.cos(k*Math.PI/3)]);
    const L=[[0,1,'#E5483F'],[1,2,'#2F80ED'],[0,2,'#E5483F'],[2,4,'#E5483F'],[3,4,'#2F80ED'],[0,3,'#2F80ED'],[4,5,'#E5483F'],[1,4,'#2F80ED'],[5,1,'#C9BBA5']];
    return `<path d="M${P[0]}L${P[1]}L${P[2]}Z" fill="#E5483F" opacity=".22"/>`+L.map(([a,b,c])=>`<path d="M${P[a]}L${P[b]}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`).join('')+P.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6.5" fill="#2D3B4C"/><circle cx="${x-1.5}" cy="${y-1.5}" r="2" fill="#fff" opacity=".5"/>`).join('');})()}</svg>`,
  init:()=>({b:'.'.repeat(15),sd:0,tr:[0,0],lm:-1,tri:null,mvn:0,last:''}),
  onTimeout(d){const c=String(d.sd),ms=PNSP.moves(d),ok=ms.filter(e=>!pnsTri(d.b,e,c));return pnsDo(d,pnRnd(ok.length?ok:ms));},
  points:pnPts(['🔴 الأحمر','🔵 الأزرق']),
  winText:d=>pnWinTxt(d,PNSN,{tri:'الخصم سكّر مثلث بلونه'}),
  status:(d,ctx)=>pnStat(d,ctx,PNSN),
  render(d,ctx){const my=ctx.my,c=String(d.sd),P=pnSel(d);let ln='',hit='';
    for(let e=0;e<15;e++){const [a,b]=PNSE[e],[x1,y1]=PNSXY[a],[x2,y2]=PNSXY[b],xy=`x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`,v=d.b[e];
      if(v!=='.'){ln+=`<g>${e===d.lm?`<line ${xy} class="pnslm"/>`:''}<line ${xy} class="pnsl s${v} ${e===d.lm?'nw':''}" data-k="l${e}"/></g>`;continue;}
      const dz=my&&!!pnsTri(d.b,e,c),sel=P&&P.e===e;
      ln+=`<g><line ${xy} class="pnsg ${dz?'dz':''} ${sel?'sel':''}"/></g>`;
      if(my)hit+=`<line ${xy} class="pnsh" data-ga="e" data-i="${e}"/>`;}
    const tri=d.tri?`<path class="pnstri s${d.win==null?0:1-d.win%2}" d="M${d.tri.map(k=>PNSXY[k].map(v=>v.toFixed(1)).join(' ')).join('L')}Z"/>`:'';
    const dots=PNSXY.map(([x,y],k)=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" class="pnsd ${d.tri&&d.tri.includes(k)?'tr':''}"/>`).join('');
    return `<div class="pnsim ${my?'my':''} t${d.sd}"><svg viewBox="0 0 100 100">${tri}${ln}${dots}${hit}</svg></div>
      <div class="pnleg"><span>${pnChip(0,PNSN)} ${tmName(d,0)}</span><span>${pnChip(1,PNSN)} ${tmName(d,1)}</span></div>${d.win==null?`<p class="pnnote">${(n=>n?`${PNSN[d.sd]}: باقي ${n} خط بدون خطر`:`${PNSN[d.sd]}: كل الخطوط الباقية تسكّر مثلث!`)(pnsSafe(d.b,c))}</p>`:''}`;},
  click(a,i,d,ctx){if(!ctx.my||a!=='e'||!(i>=0&&i<15)||d.b[i]!=='.')return;
    if(pnsTri(d.b,i,String(d.sd))&&pnsSafe(d.b,String(d.sd))){const P=pnSel(d);if(!P||P.e!==i){toast('هذا الخط يسكّر مثلث بلونك! اضغطه مرة ثانية إذا متأكد');pnPick(d,{e:i});return;}}
    S.pn=null;act(pnsDo(d,i));},
  bot(d,s,lv){const c=String(d.sd),ms=PNSP.moves(d),ok=ms.filter(e=>!pnsTri(d.b,e,c));
    if(lv===1)return pnsDo(d,pnRnd(ok.length&&Math.random()<.9?ok:ms));
    const m=pnThink({b:d.b,sd:d.sd,w:null},PNSP,lv,{dep:[0,2,4,15],cap:[0,0,2500,60000],ns:[0,0,6,.5]});return pnsDo(d,m!=null?m:pnRnd(ok.length?ok:ms));},
  botDelay:()=>500+rnd(400)};
HELP.g_sim='المثلثات (لعبة «سِم»): ست نقاط على شكل دائرة، وبينها 15 خط. فريق أحمر وفريق أزرق. كل دور تلوّن خط واحد فاضي بلونك. اللي يسكّر مثلث كامل بلونه (ثلاث نقاط كل الخطوط بينها بلونه) يخسر، ومثلثات الخصم ما تضرك. ما فيه تعادل: لازم أحد يسكّر مثلث قبل ما تخلص الخطوط. الخطوط الخطرة عليك (تسكّر مثلث بلونك) تبان منقطة، ولو ضغطتها يطلب منك تأكيد. الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون على الحركات.';

/* ================= الدومينو المتقاطع: domineering ================= */
// side 0 lays its pieces up and down, side 1 across; a piece covers two empty squares; whoever cannot lay a piece loses
let PNDZ=6;// the last size chosen on this phone
function pndMoves(b,z,s){const o=[];for(let i=0;i<z*z;i++){if(b[i]!=='.')continue;const j=s?i+1:i+z;if(s?(i%z<z-1&&b[j]==='.'):(j<z*z&&b[j]==='.'))o.push(i);}return o;}
// placements of side s the other side can never break (each of its squares is closed across the other way), counted apart
function pndSafe(b,z,s){let n=0;const used=new Set();const open=q=>q>=0&&q<z*z&&b[q]==='.';
  for(const i of pndMoves(b,z,s)){const j=s?i+1:i+z;if(used.has(i)||used.has(j))continue;let ok=true;
    for(const k of [i,j]){if(s){if(open(k-z)||open(k+z))ok=false;}else{const c=k%z;if((c>0&&open(k-1))||(c<z-1&&open(k+1)))ok=false;}}
    if(ok){n++;used.add(i);used.add(j);}}return n;}
function pndDo(d,i){const s=d.sd,z=d.z,j=s?i+1:i+z,b=setAt(setAt(d.b,i,String(s)),j,String(s));const dm=[...d.dm,[i,s]];
  const x={b,dm,lm:d.dm.length,last:`${tmName(d,s)} حط قطعة ${s?'بالعرض':'بالطول'}`};
  if(!pndMoves(b,z,1-s).length)return pnWon(d,s,'block',x);return pnPass(d,s,x);}
const PNDP={moves:p=>pndMoves(p.b,p.z,p.sd),
  play(p,i){const s=p.sd,j=s?i+1:i+p.z;const b=setAt(setAt(p.b,i,String(s)),j,String(s));return {b,z:p.z,sd:1-s,w:null};},
  ev(p){const s=p.sd;return (pndMoves(p.b,p.z,s).length-pndMoves(p.b,p.z,1-s).length)*4+(pndSafe(p.b,p.z,s)-pndSafe(p.b,p.z,1-s))*9;},end:pnEnd,
  // the pieces that break the most places of the other side first
  order(p,ms){const s=p.sd,z=p.z,oo=s?z:1;const om=new Set(pndMoves(p.b,z,1-s));const hit=k=>(om.has(k)?1:0)+(k-oo>=0&&om.has(k-oo)&&(oo===z||k%z>0)?1:0);
    return ms.map(i=>[hit(i)+hit(s?i+1:i+z),i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);}};
const PNDN=['الطول','العرض'];
GAMES.g_domin={...PNTEAM,name:'الدومينو المتقاطع',cat:'board',lbc:'#2F6E73',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3C8D93"/><rect x="12" y="12" width="76" height="76" rx="6" fill="#F3E3C3"/><g stroke="#C9B48E" stroke-width="1.5">${[1,2,3].map(k=>`<path d="M${12+k*19} 12V88M12 ${12+k*19}H88"/>`).join('')}</g>
    <rect x="14" y="14" width="15" height="34" rx="4" fill="#E5483F"/><rect x="52" y="33" width="15" height="34" rx="4" fill="#E5483F"/><rect x="14" y="71" width="34" height="15" rx="4" fill="#2F80ED"/><rect x="52" y="14" width="34" height="15" rx="4" fill="#2F80ED"/><rect x="71" y="52" width="15" height="34" rx="4" fill="#E5483F" opacity=".35"/></svg>`,
  init:n=>{const z=PNDZ;return {z,b:'.'.repeat(z*z),dm:[],sd:0,tr:[0,0],lm:-1,mvn:0,last:''};},
  onTimeout(d){return pndDo(d,pnRnd(pndMoves(d.b,d.z,d.sd)));},
  points:pnPts(['🟥 بالطول','🟦 بالعرض']),
  winText:d=>pnWinTxt(d,PNDN,{block:'الخصم ما بقى له مكان'}),
  status:(d,ctx)=>pnStat(d,ctx,PNDN,d.sd?'↔':'↕'),
  render(d,ctx){const z=d.z,s=d.sd,my=ctx.my,P=pnSel(d);const anc=my?new Set(pndMoves(d.b,z,s)):new Set();const part=new Set();anc.forEach(i=>{part.add(i);part.add(s?i+1:i+z);});
    const opt=P?P.c.map(x=>x===P.i?x+(s?1:z):x):null;let h=pnOpts(d,ctx,'sz',[[5,'5×5'],[6,'6×6'],[8,'8×8']],z);
    h+=`<div class="pndm ${my?'my':''} t${s}" style="--z:${z}"><div class="pndg" style="grid-template-columns:repeat(${z},minmax(0,1fr))">`;
    for(let i=0;i<z*z;i++){const tap=my&&part.has(i);const o=opt&&opt.includes(i);
      h+=`<${tap?'button':'div'} class="pndc ${tap?'can':''} ${o?'to':''} ${P&&P.i===i?'sel':''}"${tap?` data-ga="c" data-i="${i}"`:''}></${tap?'button':'div'}>`;}
    h+='</div>';d.dm.forEach(([i,ps],k)=>{const r=i/z|0,c=i%z;h+=`<i class="pndp s${ps} ${k===d.lm?'lm':''}" data-k="p${k}" style="left:${(c/z*100).toFixed(3)}%;top:${(r/z*100).toFixed(3)}%;width:${((ps?2:1)/z*100).toFixed(3)}%;height:${((ps?1:2)/z*100).toFixed(3)}%"></i>`;});
    h+='</div>';if(d.win==null)h+=`<p class="pnnote">أماكن ${PNDN[0]} ${pndMoves(d.b,z,0).length} • أماكن ${PNDN[1]} ${pndMoves(d.b,z,1).length}</p>`;return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='sz'){if(!pnFresh(d)||![5,6,8].includes(i))return;PNDZ=i;act({...d,z:i,b:'.'.repeat(i*i),dm:[]});return;}
    if(a!=='c')return;const s=d.sd,z=d.z,off=s?1:z,ms=pndMoves(d.b,z,s),P=pnSel(d);
    if(P){if(i===P.i){S.pn=null;act(pndDo(d,P.c[0]));return;}const m=P.c.find(x=>x===i||x+off===i);if(m!=null){S.pn=null;act(pndDo(d,m));return;}}
    const c=[];if(ms.includes(i))c.push(i);const up=i-off;if(up>=0&&(s?i%z>0:true)&&ms.includes(up))c.push(up);
    if(!c.length){pnPick(d,null);return;}if(c.length===1){S.pn=null;act(pndDo(d,c[0]));return;}
    pnPick(d,{i,c});},
  bot(d,s,lv){const ms=pndMoves(d.b,d.z,d.sd);if(lv===1&&Math.random()<.35)return pndDo(d,pnRnd(ms));
    const m=pnThink({b:d.b,z:d.z,sd:d.sd,w:null},PNDP,lv,{dep:[0,1,2,14],cap:[0,400,3000,25000],ns:[0,10,5,.5]});return pndDo(d,m!=null?m:pnRnd(ms));},
  botDelay:()=>500+rnd(400)};
HELP.g_domin='الدومينو المتقاطع: لوحة مربعات فاضية. فريق يحط قطعه بالطول (تغطي مربعين فوق بعض) وفريق يحط بالعرض (مربعين جنب بعض). كل دور تحط قطعة وحدة على مربعين فاضيين. اللي يجي دوره وما يلقى مكان لقطعته يخسر. اضغط على أي مربع ينفع لقطعة: إذا فيه طريقة وحدة تنحط على طول، وإذا فيه طريقتين يبين لك المربعين واختار. قبل أول حركة تختارون حجم اللوحة. الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون على الحركات.';

/* ================= القناني: Kayles ================= */
// a row of pins; a throw knocks one pin, or two pins standing side by side; whoever knocks the last pin wins
let PNKN=13;// the last row length chosen on this phone
const PNKG=(()=>{const g=[0];for(let n=1;n<=60;n++){const o=[];for(const t of [1,2])for(let a=0;a+t<=n;a++)o.push(g[a]^g[n-t-a]);g.push(pnMex(o));}return g;})();
const pnkRuns=p=>p.split('0').filter(Boolean).map(x=>x.length);
const pnkNim=p=>pnkRuns(p).reduce((x,n)=>x^PNKG[n],0);
// moves: [i,k] knocks k pins from i
function pnkMoves(p){const o=[];for(let i=0;i<p.length;i++){if(p[i]!=='1')continue;o.push([i,1]);if(p[i+1]==='1')o.push([i,2]);}return o;}
const pnkApply=(p,m)=>m[1]===2?setAt(setAt(p,m[0],'0'),m[0]+1,'0'):setAt(p,m[0],'0');
function pnkDo(d,m){const s=d.sd,p=pnkApply(d.p,m);const x={p,lm:m[1]===2?[m[0],m[0]+1]:[m[0]],last:`${tmName(d,s)} طرح ${m[1]===2?'قنينتين':'قنينة'}`};
  if(!p.includes('1'))return pnWon(d,s,'last',x);return pnPass(d,s,x);}
// the hard player leaves a position worth 0; when there is none it plays to keep the game long
function pnkBest(p,lv){const ms=pnkMoves(p);const fin=ms.find(m=>!pnkApply(p,m).includes('1'));
  if(lv===1)return fin&&Math.random()<.75?fin:pnRnd(ms);
  const win=ms.filter(m=>pnkNim(pnkApply(p,m))===0);if(win.length&&(lv===3||Math.random()<.65))return pnRnd(win);
  if(fin)return fin;const one=ms.filter(m=>m[1]===1);return pnRnd(one.length?one:ms);}
const PNKN2=['الأحمر','الأزرق'];
GAMES.g_kayles={...PNTEAM,name:'القناني',cat:'mind',lbc:'#7C4A9E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8E5DB5"/><rect x="0" y="66" width="100" height="34" fill="#E2B477"/><path d="M0 66H100" stroke="#B5844A" stroke-width="2"/>${[18,34,50,66,82].map((x,k)=>k===2?`<g transform="rotate(70 ${x} 74)"><path d="M${x-5} 74Q${x-7} 54 ${x-3} 46Q${x-6} 36 ${x} 30Q${x+6} 36 ${x+3} 46Q${x+7} 54 ${x+5} 74Z" fill="#FBF6EC" opacity=".55"/></g>`:`<path d="M${x-6} 74Q${x-8} 52 ${x-3} 44Q${x-6} 32 ${x} 26Q${x+6} 32 ${x+3} 44Q${x+8} 52 ${x+6} 74Z" fill="#FBF6EC"/><path d="M${x-4.2} 42H${x+4.2}M${x-4.6} 47H${x+4.6}" stroke="#E5483F" stroke-width="2.4"/>`).join('')}<circle cx="57" cy="83" r="9" fill="#2D3B4C"/><circle cx="54" cy="80" r="1.6" fill="#8899AA"/><circle cx="59" cy="79" r="1.6" fill="#8899AA"/></svg>`,
  init:()=>({p:'1'.repeat(PNKN),sd:0,tr:[0,0],lm:[],mvn:0,last:''}),
  onTimeout(d){return pnkDo(d,pnRnd(pnkMoves(d.p)));},
  points:pnPts(['🔴 الأحمر','🔵 الأزرق']),
  winText:d=>pnWinTxt(d,PNKN2,{last:'طرح آخر قنينة'}),
  status:(d,ctx)=>pnStat(d,ctx,PNKN2),
  render(d,ctx){const my=ctx.my,P=pnSel(d),N=d.p.length;const lm=new Set(d.lm||[]);let h=pnOpts(d,ctx,'n',[[9,'9 قناني'],[13,'13'],[17,'17']],N);
    const to=P?[P.i-1,P.i+1].filter(j=>d.p[j]==='1'):[];
    h+=`<div class="pnkl ${my?'my':''}" style="--n:${N}"><div class="pnkr">`;
    for(let i=0;i<N;i++){const up=d.p[i]==='1',tap=my&&up;
      h+=`<${tap?'button':'div'} class="pnkp ${up?'up':'dn'} ${lm.has(i)?'lm':''} ${P&&P.i===i?'sel':''} ${to.includes(i)?'to':''}"${tap?` data-ga="p" data-i="${i}"`:''}><i${!up&&lm.has(i)?` data-k="f${d.mvn}"`:''}></i></${tap?'button':'div'}>`;}
    h+='</div></div>';if(d.win==null&&!(my&&P))h+=`<p class="pnnote">باقي ${[...d.p].filter(x=>x==='1').length} قنينة واقفة • اطرح وحدة أو ثنتين جنب بعض</p>`;
    if(my&&P)h+=`<div class="row chact"><button class="btn" data-ga="one">اطرح هذي بس</button>${to.length?'<small class="pnhint">أو اضغط القنينة اللي جنبها تطرح ثنتين</small>':''}</div>`;
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='n'){if(!pnFresh(d)||![9,13,17].includes(i))return;PNKN=i;act({...d,p:'1'.repeat(i)});return;}
    const P=pnSel(d);
    if(a==='one'){if(P&&d.p[P.i]==='1'){S.pn=null;act(pnkDo(d,[P.i,1]));}return;}
    if(a!=='p'||d.p[i]!=='1')return;
    if(P&&P.i===i){S.pn=null;act(pnkDo(d,[i,1]));return;}
    if(P&&Math.abs(P.i-i)===1){S.pn=null;act(pnkDo(d,[Math.min(P.i,i),2]));return;}
    if(d.p[i-1]!=='1'&&d.p[i+1]!=='1'){S.pn=null;act(pnkDo(d,[i,1]));return;}
    pnPick(d,{i});},
  bot:(d,s,lv)=>pnkDo(d,pnkBest(d.p,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_kayles='القناني (لعبة «كايلز» القديمة): صف قناني بولينغ واقفة ورا بعض. في دورك ترمي الكرة وتطرح قنينة وحدة، أو قنينتين واقفات جنب بعض بالضبط (ما بينهم فراغ). اللي يطرح آخر قنينة يفوز. اضغط قنينة تختارها، وبعدها اضغطها مرة ثانية (أو «اطرح هذي بس») تطرحها لحالها، أو اضغط اللي جنبها تطرح ثنتين. إذا القنينة لحالها تنطرح على طول. قبل أول رمية تختارون طول الصف. الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون على الرميات.';

/* ================= الدراجات: light cycles, everyone moves at once ================= */
// each round every rider plans three steps in secret (up, right, down, left; never straight back), then all ride together.
// A rider that hits a wall, a trail, or the square another rider enters at the same step crashes and is out
const PNCZ={2:13,3:15,4:15,5:17,6:17,7:19,8:19};
const PNCDR=[-1,0,1,0],PNCDC=[0,1,0,-1],PNCL='URDL',PNCA=['↑','→','↓','←'];
function pncStarts(n,z){const c=(z-1)/2,r=Math.floor(z*.36),o=[];
  for(let k=0;k<n;k++){const a=Math.PI+2*Math.PI*k/n;let x=Math.round(c+r*Math.cos(a)),y=Math.round(c+r*Math.sin(a));
    while(o.some(q=>q.i===y*z+x))x=(x+1)%z;const dx=c-x,dy=c-y;const dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);o.push({i:y*z+x,dir});}
  return o;}
const pncStep=(i,k,z)=>{const r=(i/z|0)+PNCDR[k],c=i%z+PNCDC[k];return r<0||r>=z||c<0||c>=z?-1:r*z+c;};
// a plan as three directions; a missing or backwards step goes straight on
function pncPlan(pk,dir){const o=[];let k=dir;for(let t=0;t<3;t++){const x=typeof pk==='string'?PNCL.indexOf(pk[t]):-1;if(x>=0&&x!==(k+2)%4)k=x;o.push(k);}return o;}
const pncOk=pk=>typeof pk==='string'&&/^[URDL]{3}$/.test(pk);
function pncResolve(d,picks){const z=d.z;const occ=new Set();d.pth.forEach(p=>p.forEach(c=>occ.add(c)));
  let out=d.out;const hd=[...d.hd],dr=[...d.dr],pth=d.pth.map(p=>[...p]),add=d.pl.map(()=>0),cr=[];
  const plan=d.pl.map((_,s)=>pncPlan(picks[s],d.dr[s]));
  for(let t=0;t<3;t++){const al=aliveSeats(d,out);if(al.length<=1)break;const nx={},cnt={};
    for(const s of al){const k=plan[s][t];dr[s]=k;const c=pncStep(hd[s],k,z);nx[s]=c;if(c>=0)cnt[c]=(cnt[c]||0)+1;}
    const dead=al.filter(s=>nx[s]<0||occ.has(nx[s])||cnt[nx[s]]>1);
    for(const s of al)if(!dead.includes(s)){occ.add(nx[s]);hd[s]=nx[s];pth[s].push(nx[s]);add[s]++;}
    for(const s of dead){out=setAt(out,s,'1');cr.push([nx[s]>=0?nx[s]:hd[s],s]);}}
  const al=aliveSeats(d,out);const rd=d.rd+1;let win=null;
  if(al.length===1)win=al[0];else if(!al.length)win='d';
  const res=cr.length?`💥 ${cr.map(([,s])=>nm(d,s)).join(' و')} ${cr.length>1?'اصطدموا':'اصطدم'}`:'كل الدراجات سليمة';
  return {...d,out,hd,dr,pth,add,cr,rd,res,win};}
// the rider's view of a plan: the squares it rides and the step it would crash on (-1 none), the others standing still
function pncTrace(d,s,pl,occ){const z=d.z,o=[];let h=d.hd[s];for(let t=0;t<pl.length;t++){const c=pncStep(h,pl[t],z);if(c<0||occ.has(c)||o.includes(c))return {cells:o,crash:t,at:c<0?h:c};o.push(c);h=c;}return {cells:o,crash:-1};}
// squares closer to seat s than to any other rider (others counted where they stand now)
function pncArea(d,s,occ,from){const z=d.z,N=z*z,dist=new Int16Array(N).fill(-1),own=new Int8Array(N).fill(-1);const q=[];
  for(const o of aliveSeats(d)){const h=o===s?from:d.hd[o];if(h<0||dist[h]===0)continue;dist[h]=0;own[h]=o;q.push(h);}
  let n=0;for(let qi=0;qi<q.length;qi++){const c=q[qi];if(own[c]===s)n++;for(let k=0;k<4;k++){const x=pncStep(c,k,z);if(x<0||occ.has(x))continue;
      if(dist[x]<0){dist[x]=dist[c]+1;own[x]=own[c];q.push(x);}else if(dist[x]===dist[c]+1&&own[x]!==own[c])own[x]=-2;}}
  return n;}
function pncFlood(d,from,occ,cap){const z=d.z,seen=new Set([from]),q=[from];for(let qi=0;qi<q.length&&seen.size<cap;qi++){for(let k=0;k<4;k++){const x=pncStep(q[qi],k,z);if(x>=0&&!occ.has(x)&&!seen.has(x)){seen.add(x);q.push(x);}}}return seen.size;}
// the bots try every three-step plan: a crash is the worst, then the squares where another rider could arrive too,
// then the room left (the hard one counts the squares it reaches before anybody else)
function pncBot(d,s,lv){const z=d.z,occ=new Set();d.pth.forEach(p=>p.forEach(c=>occ.add(c)));const dir=d.dr[s];
  const others=aliveSeats(d).filter(o=>o!==s).map(o=>d.hd[o]);const md=(a,b)=>Math.abs((a/z|0)-(b/z|0))+Math.abs(a%z-b%z);
  const plans=[];for(const a of [0,1,3])for(const b of [0,1,3])for(const c of [0,1,3]){const p1=(dir+a)%4,p2=(p1+b)%4,p3=(p2+c)%4;plans.push([p1,p2,p3]);}
  let best=plans[0],bv=-Infinity;
  for(const pl of plans){const tr=pncTrace(d,s,pl,occ);let v;
    if(tr.crash>=0)v=-1e5+tr.crash*1000+Math.random();
    else{let risk=0;tr.cells.forEach((c,t)=>{for(const h of others){const m=md(h,c);if(m<=t+1)risk+=m===t+1?3:1;}});
      const o2=new Set(occ);tr.cells.forEach(c=>o2.add(c));const end=tr.cells[2];
      const room=pncFlood(d,end,o2,z*z);const area=lv===3?pncArea(d,s,o2,end):room;
      v=(lv===1?Math.random()*40:area*2)+Math.min(room,30)*(lv===3?3:1)-risk*(lv===3?35:lv===2?14:4)+Math.random()*(lv===1?20:2);}
    if(v>bv){bv=v;best=pl;}}
  return best.map(k=>PNCL[k]).join('');}
const pncKey=(d,v)=>d.gid+':'+d.rd+':'+v;
const pncDraft=(d,v)=>S.pnc&&S.pnc.k===pncKey(d,v)?S.pnc.p:'';
GAMES.g_cycles={name:'الدراجات',cat:'board',lbc:'#1D2B4F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#152238"/><g stroke="#23365A" stroke-width="1">${[1,2,3,4,5,6,7,8,9].map(k=>`<path d="M${k*10} 0V100M0 ${k*10}H100"/>`).join('')}</g>
    <path d="M10 80H40V50H60V30" stroke="#36C5F0" stroke-width="6" fill="none" stroke-linejoin="round"/><path d="M90 20H70V60H50V75" stroke="#F2994A" stroke-width="6" fill="none" stroke-linejoin="round"/>
    <rect x="54" y="20" width="12" height="16" rx="4" fill="#BFF0FF"/><rect x="44" y="70" width="12" height="16" rx="4" fill="#FFE0C2"/><circle cx="60" cy="24" r="2" fill="#36C5F0"/><circle cx="50" cy="82" r="2" fill="#F2994A"/></svg>`,
  init:n=>{const z=PNCZ[n]||19,st=pncStarts(n,z);return {z,hd:st.map(x=>x.i),dr:st.map(x=>x.dir),pth:st.map(x=>[x.i]),add:Array(n).fill(0),cr:[],rd:0,res:''};},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||pncOk(p.pick),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  points:d=>d.pl.map((_,s)=>d.out[s]==='1'?'💥':`${d.pth[s].length} 🛞`),
  status:(d,ctx)=>simulStatus(d,ctx,`<small>${d.res?d.res+' • ':''}جولة ${d.rd+1}</small><br>`,true),
  winText:d=>d.win==='d'?'تعادل: كل الباقين اصطدموا بنفس اللحظة':'',
  winExtra:d=>d.res,
  render(d,ctx){const z=d.z,U=10,W=z*U,v=ctx.v,me=v!=null&&v>=0&&d.out[v]!=='1'&&d.win==null;const P=c=>[c%z*U+U/2,(c/z|0)*U+U/2];const PS=c=>P(c).join(',');
    let g=`<rect width="${W}" height="${W}" class="pncbg"/><path class="pncgr" d="${[...Array(z-1)].map((_,k)=>`M${(k+1)*U} 0V${W}M0 ${(k+1)*U}H${W}`).join('')}"/>`;
    d.pl.forEach((_,s)=>{const p=d.pth[s],c=col(d,s),dead=d.out[s]==='1';
      g+=`<polyline class="pnct ${dead?'dead':''}" data-k="t${s}" points="${p.map(PS).join(' ')}" stroke="${c}"/>`;
      const a=(d.add||[])[s]||0;if(a&&p.length>1)g+=`<polyline class="pnct nw" data-k="n${s}-${d.rd}" points="${p.slice(-a-1).map(PS).join(' ')}" stroke="${c}"/>`;});
    // the plan being drawn (or already sent) by this rider, seen only by itself
    if(me){const pk=ctx.my?pncDraft(d,v):(seatPick(d,ctx,v,d.rd)||'');if(pk){const occ=new Set();d.pth.forEach(p=>p.forEach(c=>occ.add(c)));
        const pl=pncPlan(pk,d.dr[v]).slice(0,pk.length);const tr=pncTrace(d,v,pl,occ);
        g+=`<polyline class="pncpl" points="${[d.hd[v],...tr.cells].map(PS).join(' ')}" stroke="${col(d,v)}"/>`;
        if(tr.crash>=0){const [x,y]=P(tr.at);g+=`<path class="pncx" d="M${x-3} ${y-3}l6 6M${x+3} ${y-3}l-6 6"/>`;}}}
    d.pl.forEach((_,s)=>{if(d.out[s]==='1')return;const [x,y]=P(d.hd[s]);
      g+=`<g class="pnch ${s===v&&me?'me':''}" data-k="h${s}" transform="translate(${x} ${y}) rotate(${d.dr[s]*90})"><rect x="-3.4" y="-4.6" width="6.8" height="9.2" rx="2.6" fill="${col(d,s)}"/><rect x="-2" y="-3.6" width="4" height="2.6" rx="1" fill="#fff" opacity=".85"/></g>`;});
    (d.cr||[]).forEach(([c,s])=>{const [x,y]=P(c);g+=`<g class="pncb" data-k="b${d.rd}-${s}" transform="translate(${x} ${y})"><path d="M0 -6L1.6 -2L6 -2.6L2.6 .4L4.6 5L0 2.4L-4.6 5L-2.6 .4L-6 -2.6L-1.6 -2Z" fill="${col(d,s)}" stroke="#fff" stroke-width=".8"/></g>`;});
    let h=`<div class="pncy"><svg viewBox="0 0 ${W} ${W}">${g}</svg></div>`;
    if(ctx.my&&me){const pk=pncDraft(d,v),lastK=pk?PNCL.indexOf(pk[pk.length-1]):d.dr[v],full=pk.length>=3;
      h+=`<div class="pncc"><div class="pncs">${[0,1,2].map(t=>`<b class="${pk[t]?'on':''}" style="--c:${col(d,v)}">${pk[t]?PNCA[PNCL.indexOf(pk[t])]:t+1}</b>`).join('')}</div>
        <div class="pncpad">${[0,1,2,3].map(k=>`<button class="pncd k${k}" data-ga="dir" data-i="${k}" ${full||k===(lastK+2)%4?'disabled':''}>${PNCA[k]}</button>`).join('')}</div>
        <div class="row chact"><button class="btn" data-ga="clr" ${pk?'':'disabled'}>امسح</button><button class="btn pngo" data-ga="go">${pk.length<3?'كمّل على طول ✓':'انطلق ✓'}</button></div></div>`;}
    else if(me&&hasPicked(d,v))h+='<p class="note">✓ خطتك جاهزة، ننتظر الباقين</p>';
    return h;},
  click(a,i,d,ctx){const v=ctx.v;if(!ctx.my||v==null||v<0)return;const pk=pncDraft(d,v);
    if(a==='dir'){const last=pk?PNCL.indexOf(pk[pk.length-1]):d.dr[v];if(pk.length>=3||!(i>=0&&i<4)||i===(last+2)%4)return;S.pnc={k:pncKey(d,v),p:pk+PNCL[i]};render();return;}
    if(a==='clr'){S.pnc=null;render();return;}
    if(a==='go'){let p=pk;const last=p?p[p.length-1]:PNCL[d.dr[v]];while(p.length<3)p+=last;S.pnc=null;simulPick(d,v,p);}},
  resolve:pncResolve,
  botPick:(d,s,lv)=>pncBot(d,s,lv),
  botDelay:()=>700+rnd(900)};
HELP.g_cycles='الدراجات: كل لاعب عنده دراجة تترك وراها خط ما ينقطع. كل جولة الكل يخطط بالسر ثلاث خطوات (فوق، يمين، تحت، يسار، وما تقدر ترجع لورا على طول)، وبعدين كل الدراجات تمشي مع بعض خطوة خطوة. اللي يصدم الجدار أو أي خط (حتى خطه) يطلع، واللي يدخلون نفس المربع بنفس الخطوة يصطدمون ويطلعون كلهم. خطتك تبان لك على اللوحة، وإذا فيها اصطدام تشوف علامة ✗. «كمّل على طول» يكمل خطتك بنفس الاتجاه. آخر دراجة باقية تفوز، وإذا اصطدم الباقين كلهم مع بعض تعادل. مع الفرق: يفوز الفريق اللي تبقى له آخر دراجة.';

/* ================= حصار الفارس: knight isolation ================= */
// every player has one knight; a knight jumps like a chess knight to a square that is still there and free, and the square
// it leaves falls away. A player whose knight cannot jump is out; the last knight that can still jump wins
const PNNZ={2:7,3:8,4:8,5:9,6:9,7:10,8:10};
const PNNJ=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
function pnnStarts(n,z){const m=z-1,h=Math.floor(m/2);if(n===3)return [[0,0],[m,h],[0,m]].map(([r,k])=>r*z+k);
  return [[0,0],[m,m],[0,m],[m,0],[0,h],[m,m-h],[h,0],[m-h,m]].slice(0,n).map(([r,k])=>r*z+k);}
function pnnJumps(b,kn,f,z){if(f<0)return [];const r=f/z|0,c=f%z,o=[];for(const [dr,dc] of PNNJ){const rr=r+dr,cc=c+dc;if(rr<0||rr>=z||cc<0||cc>=z)continue;const t=rr*z+cc;if(b[t]==='.'&&!kn.includes(t))o.push(t);}return o;}
// after a move by seat t: the next seats that cannot jump drop out (their square falls too), until one can or one is left
function pnnNext(d,t,x){let out=x.out||d.out,b=x.b;const kn=[...x.kn],z=d.z,gone=[];let s=t;
  for(let k=0;k<d.pl.length;k++){if(aliveSeats(d,out).length<=1)break;s=nextSeat(d,s,out);
    if(pnnJumps(b,kn,kn[s],z).length)break;out=setAt(out,s,'1');if(kn[s]>=0)b=setAt(b,kn[s],'#');kn[s]=-1;gone.push(s);}
  const al=aliveSeats(d,out);const nd={...d,...x,out,b,kn,mvn:(d.mvn||0)+1,gone};
  if(gone.length)nd.last=(x.last?x.last+'، و':'')+`${gone.map(g=>nm(d,g)).join(' و')} انحاصر`;
  if(al.length===1)return {...nd,win:al[0],turn:al[0]};if(!al.length)return {...nd,win:'d'};return {...nd,turn:s};}
function pnnDo(d,to){const t=d.turn,f=d.kn[t],kn=[...d.kn];kn[t]=to;const b=setAt(d.b,f,'#');return pnnNext(d,t,{b,kn,lm:[f,to],last:`${nm(d,t)} نطّ`});}
const pnnMob=(b,kn,s,z)=>pnnJumps(b,kn,kn[s],z).length;
// two knights left: a full search; the eval is my jumps against more than the other's (chase it down), with room two jumps on
const PNNP={moves:p=>pnnJumps(p.b,p.kn,p.kn[p.sd],p.z),
  play(p,t){const s=p.sd,kn=[...p.kn];const b=setAt(p.b,kn[s],'#');kn[s]=t;return {b,kn,z:p.z,sd:1-s,w:null};},
  ev(p){const s=p.sd,o=1-s,z=p.z;const m=pnnJumps(p.b,p.kn,p.kn[s],z),e=pnnJumps(p.b,p.kn,p.kn[o],z);let v=(m.length-1.6*e.length)*10;
    for(const x of m)v+=pnnJumps(p.b,p.kn,x,z).length;for(const x of e)v-=pnnJumps(p.b,p.kn,x,z).length;return v;},end:pnEnd,
  order(p,ms){return ms.map(t=>[pnnJumps(p.b,p.kn,t,p.z).length,t]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);}};
const PNNTH=(p,lv)=>pnThink(p,PNNP,lv,{dep:[0,1,3,14],cap:[0,300,3000,30000],ns:[0,8,4,.5]});
function pnnBot(d,s,lv){const z=d.z,ms=pnnJumps(d.b,d.kn,d.kn[s],z);if(ms.length===1)return ms[0];
  if(lv===1&&Math.random()<.4)return pnRnd(ms);const al=aliveSeats(d);
  if(al.length===2&&lv>1){const o=al.find(x=>x!==s);const m=PNNTH({b:d.b,kn:[d.kn[s],d.kn[o]],z,sd:0,w:null},lv);if(m!=null)return m;}
  // several knights: room for me after the jump, less the room of the others (most of the one who plays next);
  // the hard one also looks at the worst jump the next player can answer with
  const nx=nextSeat(d,s);let best=ms[0],bv=-Infinity;
  for(const t of ms){const kn=[...d.kn];kn[s]=t;const b=setAt(d.b,d.kn[s],'#');let v=pnnJumps(b,kn,t,z).length*3;
    if(lv>1){for(const o of al)if(o!==s)v-=pnnJumps(b,kn,kn[o],z).length*(o===nx?2:.6);
      if(lv===3){let worst=99;for(const y of pnnJumps(b,kn,kn[nx],z)){const k2=[...kn];k2[nx]=y;worst=Math.min(worst,pnnJumps(setAt(b,kn[nx],'#'),k2,t,z).length);}v+=(worst===99?3:worst)*2;}}
    v+=Math.random()*(lv===1?6:.5);if(v>bv){bv=v;best=t;}}
  return best;}
const PNNK='<path d="M12 35h18l-1.6-6c-1-3.6.6-7 2.8-10.6 2.2-3.6 1.4-8.6-1.8-11.8C26 3.2 20.4 2.6 16 4.6l-2.4-2.8-1.4 4.4C8.6 8.4 6.4 12 5 16l-.8 3.4 3.2 2.2 3.6-1.8 3.8.6c-2.2 3.2-3.6 6.4-2.8 10.6Z"/>';
GAMES.g_knight={name:'حصار الفارس',cat:'board',lbc:'#5B3A8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6E4AA6"/>${[...Array(25)].map((_,i)=>{const r=i/5|0,c=i%5;const gone=[1,7,8,13,17,21].includes(i);return `<rect x="${10+c*16}" y="${10+r*16}" width="16" height="16" fill="${gone?'#3A2560':(r+c)%2?'#C9A7EB':'#EADCF8'}"/>`;}).join('')}
    <g transform="translate(36 36) scale(1.15)" fill="#F0B429" stroke="#7A4A00" stroke-width="1.6">${PNNK}</g></svg>`,
  init:n=>{const z=PNNZ[n]||10;return {z,b:'.'.repeat(z*z),kn:pnnStarts(n,z),lm:null,gone:[],mvn:0,last:''};},
  onTimeout(d){const ms=pnnJumps(d.b,d.kn,d.kn[d.turn],d.z);return ms.length?pnnDo(d,pnRnd(ms)):pnnNext(d,d.turn,{b:d.b,kn:d.kn});},
  // a player who leaves: the knight goes and its square falls; whoever is due next may already be shut in
  onSkip(nd){if(nd.win!=null)return nd;let b=nd.b;const kn=[...nd.kn];nd.pl.forEach((_,s)=>{if(nd.out[s]==='1'&&kn[s]>=0){b=setAt(b,kn[s],'#');kn[s]=-1;}});
    const x={...nd,b,kn};if(pnnJumps(b,kn,kn[x.turn],x.z).length)return x;const p=(x.turn+x.pl.length-1)%x.pl.length;return pnnNext(x,p,{b,kn,out:x.out});},
  points:d=>d.pl.map((_,s)=>d.out[s]==='1'?'محاصر':`${pnnMob(d.b,d.kn,s,d.z)} نطّة`),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const z=d.z,t=d.turn,my=ctx.my;const to=my?new Set(pnnJumps(d.b,d.kn,d.kn[t],z)):new Set();const lm=d.lm||[];
    const at={};d.kn.forEach((k,s)=>{if(k>=0)at[k]=s;});let h=`<div class="pnnb ${my?'my':''}" style="grid-template-columns:repeat(${z},minmax(0,1fr));--c:${col(d,t)}">`;
    for(let i=0;i<z*z;i++){const r=i/z|0,c=i%z,dk=(r+c)%2,gone=d.b[i]==='#',tap=to.has(i),s=at[i];
      h+=`<${tap?'button':'div'} class="pnnc ${dk?'dk':''} ${gone?'gone':''} ${tap?'to':''} ${lm[0]===i?'lmf':''} ${lm[1]===i?'lmt':''}"${tap?` data-ga="j" data-i="${i}"`:''}>${s!=null?`<svg class="pnnk ${s===t&&d.win==null?'on':''}" data-k="k${s}" viewBox="0 0 36 38" style="--c:${col(d,s)}">${PNNK}</svg>`:''}</${tap?'button':'div'}>`;}
    return h+'</div>';},
  after(d){const L=d.lm;if(!L)return;const k='nn'+d.gid+':'+d.mvn;if(S.pnFx===k)return;S.pnFx=k;const q=x=>app.querySelector(`.pnnb>:nth-child(${x+1})`);const el=q(L[1]),f=q(L[0]);if(el&&f)bdFly(el.querySelector('.pnnk'),[f],330);},
  click(a,i,d,ctx){if(!ctx.my||a!=='j')return;if(pnnJumps(d.b,d.kn,d.kn[d.turn],d.z).includes(i))act(pnnDo(d,i));},
  bot:(d,s,lv)=>pnnDo(d,pnnBot(d,s,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_knight='حصار الفارس: كل لاعب عنده فارس على اللوحة. في دورك تنط بفارسك نطة الحصان في الشطرنج (مربعين لقدام وبعدها مربع على الجنب) لمربع موجود وفاضي. المربع اللي تطلع منه يطيح ويختفي، وما أحد يقدر يرجع له. اللي يجي دوره وفارسه ما يقدر ينط لأي مكان ينحاصر ويطلع، ومربعه يطيح بعد. آخر فارس باقي يفوز. النقط على اللوحة تبين لك وين تقدر تنط. مع الفرق: الفريق اللي يبقى له آخر فارس يفوز.';

/* ================= سباق الملوك: race the kings across (an original game) ================= */
// every king starts on one side of the board and races to the side across. On your turn: step your king one square
// (up, down, left or right) to a free square, or lay one of your stone bars (two squares long) anywhere free. A bar may
// never shut any king off from its goal. The first king to reach its goal side wins
const PNRS={2:6,3:4,4:4,5:3,6:3,7:3,8:3};
const PNRD=[[-1,0],[1,0],[0,-1],[0,1]];
// side e of seat s: 0 starts at the bottom and goes up, 1 top -> bottom, 2 left -> right, 3 right -> left
function pnrStarts(n,z){const m=z-1,h=m/2,o=[];const cnt=[0,0,0,0];for(let s=0;s<n;s++)cnt[s%4]++;
  const at=[0,0,0,0];for(let s=0;s<n;s++){const e=s%4,k=at[e]++,two=cnt[e]>1;const p=two?(k?Math.round(m*2/3):Math.round(m/3)):h;
    const [r,c]=e===0?[m,p]:e===1?[0,m-p]:e===2?[m-p,0]:[p,m];o.push(r*z+c);}return o;}
const pnrGoal=(e,i,z)=>{const r=i/z|0,c=i%z;return e===0?r===0:e===1?r===z-1:e===2?c===z-1:c===0;};
// shortest number of steps from i to side e over free squares (kings do not block: they move); -1 when shut off
function pnrDist(b,z,e,i){if(pnrGoal(e,i,z))return 0;const D=new Int16Array(z*z).fill(-1);D[i]=0;const q=[i];
  for(let qi=0;qi<q.length;qi++){const c=q[qi],r=c/z|0,k=c%z;for(const [dr,dc] of PNRD){const rr=r+dr,cc=k+dc;if(rr<0||rr>=z||cc<0||cc>=z)continue;const x=rr*z+cc;if(b[x]!=='.'||D[x]>=0)continue;
      D[x]=D[c]+1;if(pnrGoal(e,x,z))return D[x];q.push(x);}}return -1;}
function pnrSteps(d,s,kg){kg=kg||d.kg;const z=d.z,i=kg[s],r=i/z|0,c=i%z,o=[];for(const [dr,dc] of PNRD){const rr=r+dr,cc=c+dc;if(rr<0||rr>=z||cc<0||cc>=z)continue;const x=rr*z+cc;if(d.b[x]==='.'&&!kg.includes(x))o.push(x);}return o;}
// a bar at i going across (o 0) or down (o 1): both squares free of stones and kings, and every king still has a way
function pnrBarOk(d,i,o,b0){const z=d.z,j=o?i+z:i+1;if(o?j>=z*z:i%z===z-1)return false;const b=b0||d.b;if(b[i]!=='.'||b[j]!=='.'||d.kg.includes(i)||d.kg.includes(j))return false;
  const nb=setAt(setAt(b,i,'#'),j,'#');return aliveSeats(d).every(s=>pnrDist(nb,z,s%4,d.kg[s])>=0);}
function pnrBars(d){const o=[];for(let i=0;i<d.z*d.z;i++)for(const k of [0,1])if(pnrBarOk(d,i,k))o.push([i,k]);return o;}
function pnrAfter(d,t,x){const nd={...d,...x,mvn:(d.mvn||0)+1,turn:nextSeat(d,t),np:(d.np||0)+1};
  // a player boxed in by kings with no bar left passes
  for(let k=0;k<d.pl.length;k++){const s=nd.turn;if(pnrSteps(nd,s).length||nd.wl[s]>0&&pnrBars(nd).length)break;nd.turn=nextSeat(nd,s);}
  // a very long race ends with the king nearest its goal (a draw when tied)
  if(nd.np>=40*d.pl.length){const ds=d.pl.map((_,s)=>d.out[s]==='1'?99:pnrDist(nd.b,d.z,s%4,nd.kg[s]));const mn=Math.min(...ds);const top=ds.map((v,s)=>v===mn?s:-1).filter(s=>s>=0);
    return {...nd,win:top.length===1?top[0]:'d',end:'long'};}
  return nd;}
function pnrMove(d,to){const t=d.turn,kg=[...d.kg],f=kg[t];kg[t]=to;const x={kg,lm:[f,to],last:`${nm(d,t)} مشى بملكه`};
  if(pnrGoal(t%4,to,d.z))return {...d,...x,win:t,end:'goal',mvn:(d.mvn||0)+1};return pnrAfter(d,t,x);}
function pnrBar(d,i,o){const t=d.turn,z=d.z,j=o?i+z:i+1;const b=setAt(setAt(d.b,i,'#'),j,'#');const wl=[...d.wl];wl[t]--;
  return pnrAfter(d,t,{b,wl,br:[...d.br,[i,o,t]],lm:[i,j],last:`${nm(d,t)} حط حاجز`});}
// the bots: how many steps each king still needs; on a lead it runs, behind it blocks the most dangerous king
// two kings left: a search over steps and the bars that cut into the other king's shortest way (both kings counted)
function pnrPath(b,z,e,i,kg){const D=new Int16Array(z*z).fill(-1),pr=new Int16Array(z*z).fill(-1);D[i]=0;const q=[i];
  for(let qi=0;qi<q.length;qi++){const c=q[qi];if(pnrGoal(e,c,z)){const o=[];let x=c;while(x!==i){o.push(x);x=pr[x];}return o.reverse();}
    const r=c/z|0,k=c%z;for(const [dr,dc] of PNRD){const rr=r+dr,cc=k+dc;if(rr<0||rr>=z||cc<0||cc>=z)continue;const x=rr*z+cc;if(b[x]!=='.'||D[x]>=0)continue;D[x]=D[c]+1;pr[x]=c;q.push(x);}}
  return [];}
const PNRP={moves(p){const s=p.sd,o=1-s,z=p.z,ms=[];const i=p.kg[s],r=i/z|0,c=i%z;
    for(const [dr,dc] of PNRD){const rr=r+dr,cc=c+dc;if(rr<0||rr>=z||cc<0||cc>=z)continue;const x=rr*z+cc;if(p.b[x]==='.'&&x!==p.kg[o])ms.push([0,x]);}
    if(p.wl[s]>0){const seen=new Set();for(const x of pnrPath(p.b,z,p.e[o],p.kg[o]).slice(0,4))for(const [a,k] of [[x,0],[x-1,0],[x,1],[x-z,1]]){const key=a*2+k;if(seen.has(key)||a<0)continue;seen.add(key);
        const j=k?a+z:a+1;if(k?j>=z*z:a%z===z-1)continue;if(p.b[a]!=='.'||p.b[j]!=='.'||p.kg.includes(a)||p.kg.includes(j))continue;
        const nb=setAt(setAt(p.b,a,'#'),j,'#');if(pnrDist(nb,z,p.e[0],p.kg[0])<0||pnrDist(nb,z,p.e[1],p.kg[1])<0)continue;ms.push([1,a,k]);}}
    return ms;},
  play(p,m){const s=p.sd;if(m[0]===0){const kg=[...p.kg];kg[s]=m[1];return {...p,kg,sd:1-s,w:pnrGoal(p.e[s],m[1],p.z)?s:null};}
    const j=m[2]?m[1]+p.z:m[1]+1;const wl=[...p.wl];wl[s]--;return {...p,b:setAt(setAt(p.b,m[1],'#'),j,'#'),wl,sd:1-s,w:null};},
  ev(p){const s=p.sd,o=1-s;const a=pnrDist(p.b,p.z,p.e[s],p.kg[s]),b=pnrDist(p.b,p.z,p.e[o],p.kg[o]);return (b-a)*10+5+(p.wl[s]-p.wl[o])*3;},
  end:pnEnd,order:(p,ms)=>ms};
function pnrBot(d,s,lv){const z=d.z,al=aliveSeats(d),e=s%4;const dist=(b,k)=>pnrDist(b,z,k%4,d.kg[k]);
  if(lv===3&&al.length===2){const o=al.find(x=>x!==s);const m=pnThink({b:d.b,z,kg:[d.kg[s],d.kg[o]],e:[e,o%4],wl:[d.wl[s],d.wl[o]],sd:0,w:null},PNRP,3,{dep:[0,0,0,5],cap:[0,0,0,8000],ns:[0,0,0,1]});
    if(m)return m[0]===0?['m',m[1]]:['b',m[1],m[2]];}
  const st=pnrSteps(d,s);const myD=dist(d.b,s);
  const bestStep=()=>{let bs=null,bv=99;for(const x of st){const kg=[...d.kg];kg[s]=x;const v=pnrGoal(e,x,z)?-1:pnrDist(d.b,z,e,x);if(v>=0&&(v<bv||v===bv&&Math.random()<.5)){bv=v;bs=x;}}return bs;};
  const win=st.find(x=>pnrGoal(e,x,z));if(win!=null)return ['m',win];
  if(lv===1){if(d.wl[s]>0&&Math.random()<.15){const bs=pnrBars(d);if(bs.length)return ['b',...pnRnd(bs)];}const m=Math.random()<.75?bestStep():null;return m!=null?['m',m]:st.length?['m',pnRnd(st)]:['b',...pnRnd(pnrBars(d))];}
  // the king that would arrive first, counting who moves before whom
  const order=[];let q=s;for(let k=0;k<al.length;k++){q=nextSeat(d,q);order.push(q);}
  const foes=al.filter(o=>o!==s).map(o=>({o,dd:dist(d.b,o),pos:order.indexOf(o)}));foes.sort((a,b)=>a.dd-b.dd||a.pos-b.pos);
  const th=foes[0];const ahead=!th||myD<th.dd||(myD===th.dd&&true);
  if((ahead&&(lv===3||Math.random()<.8))||d.wl[s]<=0){const m=bestStep();if(m!=null)return ['m',m];}
  // the bar that costs the threats the most steps and me the fewest
  let bb=null,bv=-99;const cand=pnrBars(d);const pool=lv===3?cand:pnShuf(cand).slice(0,40);
  for(const [i,o] of pool){const j=o?i+z:i+1;const nb=setAt(setAt(d.b,i,'#'),j,'#');let v=0;
    for(const f of foes.slice(0,lv===3?2:1)){const nd=pnrDist(nb,z,f.o%4,d.kg[f.o]);v+=(nd-f.dd)*(f===th?1:.4);}
    v-=(pnrDist(nb,z,e,d.kg[s])-myD)*1.2;v+=Math.random()*.2;if(v>bv){bv=v;bb=[i,o];}}
  if(bb&&bv>=(lv===3?.9:.5))return ['b',...bb];
  const m=bestStep();if(m!=null)return ['m',m];if(st.length)return ['m',pnRnd(st)];return bb?['b',...bb]:['b',...pnRnd(cand)];}
const pnrDoBot=(d,m)=>m[0]==='m'?pnrMove(d,m[1]):pnrBar(d,m[1],m[2]);
const PNRCR='<path d="M3 26 6 9l8 8 6-12 6 12 8-8 3 17Z"/><rect x="4" y="27" width="32" height="6" rx="2"/>';
const PNRM=['حرّك الملك','حاجز ↔','حاجز ↕'];
GAMES.g_kings={name:'سباق الملوك',cat:'board',lbc:'#A8541E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E7A55A"/><rect x="10" y="10" width="80" height="80" rx="6" fill="#FBE7C6"/><g stroke="#E2C493" stroke-width="1.5">${[1,2,3].map(k=>`<path d="M${10+k*20} 10V90M10 ${10+k*20}H90"/>`).join('')}</g>
    <rect x="10" y="4" width="80" height="5" rx="2.5" fill="#D9433A"/><rect x="10" y="91" width="80" height="5" rx="2.5" fill="#2F74D0"/><rect x="31" y="52" width="38" height="16" rx="4" fill="#7D7466"/><rect x="33" y="54" width="34" height="5" rx="2.5" fill="#9E9585"/>
    <g transform="translate(36 70) scale(.75)" fill="#D9433A" stroke="#7A1E18" stroke-width="2">${PNRCR}</g><g transform="translate(36 14) scale(.75)" fill="#2F74D0" stroke="#163C70" stroke-width="2">${PNRCR}</g></svg>`,
  init:n=>{const z=n<=4?9:11;return {z,b:'.'.repeat(z*z),kg:pnrStarts(n,z),wl:Array(n).fill(PNRS[n]||3),br:[],lm:null,np:0,mvn:0,last:''};},
  onTimeout(d){const st=pnrSteps(d,d.turn);if(st.length)return pnrMove(d,pnRnd(st));const bs=d.wl[d.turn]>0?pnrBars(d):[];return bs.length?pnrBar(d,...pnRnd(bs)):pnrAfter(d,d.turn,{});},
  onSkip(nd){const kg=nd.kg.map((k,s)=>nd.out[s]==='1'?-1:k);return {...nd,kg};},
  points:d=>d.pl.map((_,s)=>{const v=d.out[s]==='1'||d.kg[s]<0?-1:pnrDist(d.b,d.z,s%4,d.kg[s]);return `${v<0?'–':v} خطوة`;}),
  winText:d=>d.end==='long'?(d.win==='d'?'تعادل: طال السباق والملوك على نفس البعد':`فاز ${nm(d,d.win)}، ملكه الأقرب لما طال السباق`):'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const z=d.z,t=d.turn,my=ctx.my,P=pnSel(d);const mode=my&&P&&P.m?P.m:0;const can=d.wl[t]>0;
    const to=my&&mode===0?new Set(pnrSteps(d,t)):new Set();const lm=new Set(d.lm||[]);const at={};d.kg.forEach((k,s)=>{if(d.out[s]!=='1')at[k]=s;});
    let anc=new Set();if(my&&mode&&can)for(let i=0;i<z*z;i++)if(pnrBarOk(d,i,mode-1))anc.add(i);
    const ghost=P&&P.g!=null?[P.g,P.g+(mode===2?z:1)]:[];
    let h='';if(my)h+=`<div class="segs pnrm">${PNRM.map((x,k)=>`<button class="seg ${k===mode?'on':''}" data-ga="mode" data-i="${k}" ${k&&!can?'disabled':''}>${x}${k?` <small>${d.wl[t]}</small>`:''}</button>`).join('')}</div>`;
    // the goal sides: a strip in the colour of every king that runs to it
    const goals=[[],[],[],[]];d.pl.forEach((_,s)=>{if(d.out[s]!=='1')goals[[1,0,3,2][s%4]].push(col(d,s));});
    const strip=(k,cls)=>`<div class="pnrg ${cls}">${goals[k].map(c=>`<i style="background:${c}"></i>`).join('')}</div>`;
    h+=`<div class="pnrw">${strip(1,'gt')}${strip(0,'gb')}${strip(2,'gl')}${strip(3,'gr')}<div class="pnrb ${my?'my':''} m${mode}" style="--z:${z}"><div class="pnrgd" style="grid-template-columns:repeat(${z},minmax(0,1fr))">`;
    for(let i=0;i<z*z;i++){const tap=to.has(i)||anc.has(i),s=at[i];
      h+=`<${tap?'button':'div'} class="pnrc ${to.has(i)?'to':''} ${anc.has(i)?'an':''} ${ghost.includes(i)?'gh':''} ${lm.has(i)&&d.b[i]==='.'?'lm':''}"${tap?` data-ga="c" data-i="${i}"`:''}>${s!=null?`<svg class="pnrk ${s===t&&d.win==null?'on':''}" data-k="k${s}" viewBox="0 0 40 36" style="--c:${col(d,s)}">${PNRCR}</svg>`:''}</${tap?'button':'div'}>`;}
    h+='</div>';d.br.forEach(([i,o,s],k)=>{const r=i/z|0,c=i%z;h+=`<i class="pnrs ${k===d.br.length-1&&d.lm&&d.lm[0]===i?'nw':''}" data-k="s${k}" style="left:${(c/z*100).toFixed(3)}%;top:${(r/z*100).toFixed(3)}%;width:${((o?1:2)/z*100).toFixed(3)}%;height:${((o?2:1)/z*100).toFixed(3)}%;--c:${col(d,s)}"></i>`;});
    h+='</div></div>';
    if(my&&mode)h+=`<p class="pnnote">${P&&P.g!=null?'اضغط الحاجز مرة ثانية تثبّته':'اختار مكان الحاجز (ما يصير يسكّر طريق أحد)'} • باقي لك ${d.wl[t]}</p>`;
    return h;},
  after(d){const L=d.lm;if(!L||d.b[L[1]]!=='.')return;const k='nr'+d.gid+':'+d.mvn;if(S.pnFx===k)return;S.pnFx=k;const q=x=>app.querySelector(`.pnrgd>:nth-child(${x+1})`);const el=q(L[1]),f=q(L[0]);if(el&&f)bdFly(el.querySelector('.pnrk'),[f],260);},
  click(a,i,d,ctx){if(!ctx.my)return;const P=pnSel(d),t=d.turn;
    if(a==='mode'){if(!(i>=0&&i<3)||(i&&d.wl[t]<=0))return;pnPick(d,i?{m:i}:null);return;}
    if(a!=='c')return;const mode=P&&P.m?P.m:0;
    if(!mode){if(pnrSteps(d,t).includes(i)){S.pn=null;act(pnrMove(d,i));}return;}
    if(d.wl[t]<=0||!pnrBarOk(d,i,mode-1))return;
    if(P.g===i){S.pn=null;act(pnrBar(d,i,mode-1));return;}pnPick(d,{m:mode,g:i});},
  bot:(d,s,lv)=>pnrDoBot(d,pnrBot(d,s,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_kings='سباق الملوك (لعبة من تصميمنا): كل لاعب عنده ملك على طرف من اللوحة، وهدفه يوصل الطرف اللي قباله (الشريط الملوّن بلونه حول اللوحة يبين هدفه). في دورك سوّ وحدة من ثنتين: حرّك ملكك مربع واحد (فوق أو تحت أو يمين أو يسار) لمربع فاضي، أو حط حاجز حجر طوله مربعين في أي مكان فاضي عشان تأخر غيرك. كل لاعب عنده عدد محدود من الحواجز. ممنوع تحط حاجز يسكّر الطريق كله على أي ملك. أول ملك يوصل هدفه يفوز. لوحة 9×9 لين أربعة لاعبين، و11×11 لأكثر (ملكين على كل طرف). إذا طال السباق كثير يفوز الأقرب لهدفه. مع الفرق: إذا وصل ملك أي واحد منكم يفوز فريقه.';

/* ================= ستة في صف: Connect6 ================= */
// the side that opens plays black and lays one stone; from then on every turn lays two. Six (or more) in a line wins
let PN6Z=15;// the last size chosen on this phone
const pn6Win=(z)=>{const o=[];for(let r=0;r<z;r++)for(let c=0;c<z;c++)for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const rr=r+dr*5,cc=c+dc*5;if(rr<0||rr>=z||cc<0||cc>=z)continue;o.push([0,1,2,3,4,5].map(k=>(r+dr*k)*z+c+dc*k));}return o;};
const PN6W={};
// the windows of six and, for every square, the windows through it
function pn6Tab(z){if(PN6W[z])return PN6W[z];const w=pn6Win(z),by=[...Array(z*z)].map(()=>[]);w.forEach((x,k)=>x.forEach(i=>by[i].push(k)));return PN6W[z]={w,by};}
function pn6Line(b,z,i){const c=b[i],r=i/z|0,k=i%z;for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const o=[i];
    for(const sg of [1,-1]){let rr=r+dr*sg,cc=k+dc*sg;while(rr>=0&&rr<z&&cc>=0&&cc<z&&b[rr*z+cc]===c){o.push(rr*z+cc);rr+=dr*sg;cc+=dc*sg;}}if(o.length>=6)return o;}return null;}
const pn6Names=d=>d.s0?['الأبيض','الأسود']:['الأسود','الأبيض'];
function pn6Do(d,i){const s=d.sd,z=d.z,b=setAt(d.b,i,String(s));const lm=d.left===2||d.mvn===0?[i]:[...(d.lm||[]),i];const nmv=(d.nmv||0)+1;
  const ln=pn6Line(b,z,i);const x={b,lm,nmv,ln,last:`${tmName(d,s)} حط حجر`};
  if(ln)return pnWon(d,s,'six',x);if(!b.includes('.'))return {...d,...x,win:'d',end:'full',mvn:(d.mvn||0)+1};
  if(d.left===2)return {...d,...x,left:1,mvn:(d.mvn||0)+1};return pnPass(d,s,{...x,left:2});}
// how much a square is worth to side s: the open windows through it (with none of the other side), by how full they are
const PN6A=[1,6,30,160,900,5000],PN6D=[1,5,26,180,1200,6000];
function pn6Score(b,T,i,s){const c=String(s),e=String(1-s);let v=0;for(const k of T.by[i]){let m=0,o=0;for(const x of T.w[k]){if(b[x]===c)m++;else if(b[x]===e)o++;}if(!o)v+=PN6A[m];if(!m)v+=PN6D[o];}return v;}
function pn6Cands(b,z){const o=[];let any=false;for(let i=0;i<z*z;i++){if(b[i]!=='.'){any=true;continue;}const r=i/z|0,c=i%z;let near=false;
    for(let dr=-2;dr<=2&&!near;dr++)for(let dc=-2;dc<=2;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<z&&cc>=0&&cc<z&&b[rr*z+cc]!=='.'){near=true;break;}}if(near)o.push(i);}
  if(!any)o.push((z>>1)*z+(z>>1));return o;}
// a window side s can finish with k stones now (k = stones left this turn): those squares
function pn6Finish(b,T,s,k){const c=String(s);for(const w of T.w){let m=0,emp=[];for(const x of w){if(b[x]===c)m++;else if(b[x]==='.')emp.push(x);else{m=-9;break;}}if(m>=6-k&&m+emp.length===6)return emp;}return null;}
// the best square for side s; the hard one also weighs the strongest square left for the other side after it
function pn6Best(b,z,s,lv){const T=pn6Tab(z);const cs=pn6Cands(b,z);let sc=cs.map(i=>[pn6Score(b,T,i,s)*(lv===1?.6+Math.random()*.8:1)+Math.random(),i]).sort((x,y)=>y[0]-x[0]);
  if(lv<3)return sc[0][1];let best=sc[0][1],bv=-Infinity;
  for(const [v,i] of sc.slice(0,8)){const nb=setAt(b,i,String(s));let opp=0;for(const j of pn6Cands(nb,z)){const x=pn6Score(nb,T,j,1-s);if(x>opp)opp=x;}const t=v-opp*.45;if(t>bv){bv=t;best=i;}}
  return best;}
// threats: the windows side s could finish next turn (four or five of its stones, none of the other's); how many stones the
// other side needs to cut them all (greedy), and the squares inside them
function pn6Need(b,T,s){const c=String(s);const ws=[];for(const w of T.w){let m=0;const emp=[];let bad=false;for(const x of w){if(b[x]===c)m++;else if(b[x]==='.')emp.push(x);else{bad=true;break;}}if(!bad&&m>=4)ws.push(emp);}
  const sq=new Set();ws.forEach(e=>e.forEach(x=>sq.add(x)));let n=0;
  while(ws.length&&n<4){const cnt={};for(const e of ws)for(const x of e)cnt[x]=(cnt[x]||0)+1;let bx=-1,bv=0;for(const x in cnt)if(cnt[x]>bv){bv=cnt[x];bx=+x;}n++;for(let k=ws.length-1;k>=0;k--)if(ws[k].includes(bx))ws.splice(k,1);}
  return {n,sq:[...sq]};}
// the hard player plans the whole turn: first never leave the other side a finish, then make as many threats as it can
// (three that need three stones to cut cannot all be answered), then the strongest shape
let PN6K=250;
function pn6Hard(d,s){const z=d.z,b=d.b,T=pn6Tab(z),c=String(s);const opp=pn6Need(b,T,1-s);
  const sc=pn6Cands(b,z).map(i=>[pn6Score(b,T,i,s),i]).sort((x,y)=>y[0]-x[0]);const top=sc.slice(0,opp.n?6:12).map(x=>x[1]);
  const pool=[...new Set([...opp.sq,...top])].slice(0,18);const S1={};sc.forEach(([v,i])=>{S1[i]=v;});
  // live threes: windows with three of mine and none of the other's, the stuff of next turn's threats
  const live=nb=>{let n=0;for(const w of T.w){let m=0;for(const x of w){if(nb[x]===c)m++;else if(nb[x]!=='.'){m=-9;break;}}if(m===3)n++;}return n;};
  const val=nb=>{const o=pn6Need(nb,T,1-s).n;const m=pn6Need(nb,T,s).n;return (o?-1e6*o:0)+Math.min(m,3)*2e4+live(nb)*PN6K;};
  let best=pool[0],bv=-Infinity;
  if(d.left===1){for(const i of pool){const v=val(setAt(b,i,c))+(S1[i]||0)+Math.random();if(v>bv){bv=v;best=i;}}return best;}
  for(let a=0;a<pool.length;a++)for(let k=a+1;k<pool.length;k++){const i=pool[a],j=pool[k];const nb=setAt(setAt(b,i,c),j,c);
    const v=val(nb)+(S1[i]||0)+(S1[j]||0)+Math.random();if(v>bv){bv=v;best=(S1[i]||0)>=(S1[j]||0)?i:j;}}
  return best;}
function pn6Bot(d,s,lv){const z=d.z,b=d.b,T=pn6Tab(z);if(!/[01]/.test(b))return (z>>1)*z+(z>>1)+(lv===1?rnd(3)-1:0);
  if(lv===1&&Math.random()<.18)return pnRnd(pn6Cands(b,z));
  const f=pn6Finish(b,T,s,d.left);if(f&&(lv>1||Math.random()<.7))return f[0];
  if(lv===3)return pn6Hard(d,s);
  // the other side could finish a six next turn: block the square that cuts the most of those windows
  if(lv>1){const c=String(1-s);let thr={};let n=0;for(const w of T.w){let m=0,emp=[];for(const x of w){if(b[x]===c)m++;else if(b[x]==='.')emp.push(x);else{m=-9;break;}}if(m>=4&&m+emp.length===6){n++;emp.forEach(x=>thr[x]=(thr[x]||0)+1);}}
    if(n){let bi=-1,bv=-1;for(const x in thr)if(thr[x]>bv||thr[x]===bv&&Math.random()<.5){bv=thr[x];bi=+x;}if(bi>=0)return bi;}}
  return pn6Best(b,z,s,lv);}
GAMES.g_conn6={...PNTEAM,name:'ستة في صف',cat:'board',lbc:'#3B5B46',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D9B479"/>${[1,2,3,4,5,6,7,8].map(k=>`<path d="M${k*11} 4V96M4 ${k*11}H96" stroke="#8C6838" stroke-width="1.4"/>`).join('')}${[1,2,3,4,5,6].map(k=>`<circle cx="${k*11+5.5-5.5}" cy="${(7-k)*11+5.5-5.5+11}" r="4.8" fill="#23272E"/>`).join('')}<path d="M11 77L66 22" stroke="#F0B429" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>${[[3,5],[4,6],[6,3],[5,7],[2,3]].map(([x,y])=>`<circle cx="${x*11}" cy="${y*11}" r="4.8" fill="#FBF7EE" stroke="#8C6838" stroke-width="1"/>`).join('')}</svg>`,
  init:()=>{const z=PN6Z;return {z,b:'.'.repeat(z*z),sd:0,tr:[0,0],left:1,lm:[],ln:null,nmv:0,mvn:0,last:''};},
  onTimeout(d){let x=d;const s=d.sd;for(let k=0;k<2&&x.sd===s&&x.win==null;k++)x=pn6Do(x,pn6Bot(x,s,1));return x;},
  points:d=>d.pl.map((_,s)=>(s%2)===(d.s0||0)?'⚫ الأسود':'⚪ الأبيض'),
  winText:d=>d.end==='full'?'تعادل: امتلت اللوحة':pnWinTxt(d,pn6Names(d),{six:'ستة على خط'}),
  status:(d,ctx)=>pnStat(d,ctx,pn6Names(d),d.nmv?`• ${d.left===2?'حط حجرين':'حط الحجر الثاني'}`:'• أول حجر بس'),
  render(d,ctx){const z=d.z,my=ctx.my,lm=new Set(d.lm||[]),ln=new Set(d.ln||[]),bk=d.s0||0;const e=z>13?3:3,m=z-4,h=(z-1)/2;const star=new Set([[e,e],[e,m],[m,e],[m,m],[h,h]].map(([r,c])=>r*z+c));
    let s=pnOpts(d,ctx,'sz',[[13,'13×13'],[15,'15×15']],z);
    s+=`<div class="pn6 ${my?'my':''} ${d.sd===bk?'tb':'tw'}" style="--z:${z}"><div class="pn6g" style="grid-template-columns:repeat(${z},minmax(0,1fr))">`;
    for(let i=0;i<z*z;i++){const v=d.b[i],free=v==='.';
      s+=`<button class="pn6c ${star.has(i)?'hs':''}" ${free&&my?`data-ga="m" data-i="${i}"`:'disabled'}>${free?'':`<i class="pn6s ${+v===bk?'bk':'wh'} ${lm.has(i)?'lm':''} ${ln.has(i)?'won':''}"></i>`}</button>`;}
    return s+'</div></div>';},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='sz'){if(!pnFresh(d)||![13,15].includes(i))return;PN6Z=i;act({...d,z:i,b:'.'.repeat(i*i)});return;}
    if(a==='m'&&d.b[i]==='.')act(pn6Do(d,i));},
  bot:(d,s,lv)=>pn6Do(d,pn6Bot(d,d.sd,lv)),
  botDelay:()=>450+rnd(350)};
HELP.g_conn6='ستة في صف: لوحة كبيرة وفريقين أسود وأبيض. الأسود يبدأ بحجر واحد بس، وبعدها كل دور تحط حجرين (أي مربعين فاضيين تبيهم). أول واحد يصف ستة أحجار أو أكثر ورا بعض (بالطول أو بالعرض أو بالقطر) يفوز. لأن كل دور حجرين، الخصم إذا عنده أربعة مفتوحة يقدر يكملها: سكّرها قبل! إذا امتلت اللوحة تعادل. قبل أول حجر تختارون حجم اللوحة. الفريق اللي يلعب بالأسود يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون على الأدوار.';

/* ================= ابتلع المربعات: colour flood (an original game) ================= */
// a board of coloured squares; every player owns a corner. On your turn pick a colour (not the one your land wears now):
// your land takes that colour and swallows every square of it that touches your land, and so on through same-coloured
// squares. Gold stars count three. When nobody can swallow any more, the most land wins
const PNFC=['#FF9AA2','#FFD08A','#F8EF8A','#A8E6B4','#9CD3F7','#C9A8F2'];
const PNFZ={2:12,3:14,4:14,5:16,6:16,7:16,8:16};
function pnfStarts(n,z){const m=z-1,h=m>>1;const c=[[0,0],[m,m],[0,m],[m,0],[0,h],[m,m-h],[h,0],[m-h,m]];if(n===3)return [[0,0],[m,h],[0,m]].map(([r,k])=>r*z+k);return c.slice(0,n).map(([r,k])=>r*z+k);}
const pnfNb=(i,z)=>{const r=i/z|0,c=i%z,o=[];if(r>0)o.push(i-z);if(r<z-1)o.push(i+z);if(c>0)o.push(i-1);if(c<z-1)o.push(i+1);return o;};
// the squares seat s would swallow with colour k: free squares of k joined to its land
function pnfGain(c,o,z,s,k){const own=String(s),seen=new Set(),q=[];for(let i=0;i<z*z;i++)if(o[i]===own)for(const x of pnfNb(i,z))if(o[x]==='.'&&+c[x]===k&&!seen.has(x)){seen.add(x);q.push(x);}
  for(let qi=0;qi<q.length;qi++)for(const x of pnfNb(q[qi],z))if(o[x]==='.'&&+c[x]===k&&!seen.has(x)){seen.add(x);q.push(x);}return q;}
const pnfFront=(o,z,s)=>{const own=String(s);for(let i=0;i<z*z;i++)if(o[i]===own)for(const x of pnfNb(i,z))if(o[x]==='.')return true;return false;};
const pnfScore=(d,s)=>{let n=0;for(let i=0;i<d.z*d.z;i++)if(d.o[i]===String(s))n+=d.sr.includes(i)?3:1;return n;};
function pnfEnd(d){const al=aliveSeats(d);if(al.some(s=>pnfFront(d.o,d.z,s))&&d.np<d.z*d.z*2)return d;
  const pts=d.pl.map((_,s)=>d.out[s]==='1'?-1:pnfScore(d,s));return {...d,win:mostPts(pts),end:'full'};}
function pnfDo(d,k){const t=d.turn,z=d.z,g=pnfGain(d.c,d.o,z,t,k);const own=String(t);let c=d.c,o=d.o;
  for(let i=0;i<z*z;i++)if(o[i]===own)c=setAt(c,i,String(k));for(const x of g){o=setAt(o,x,own);c=setAt(c,x,String(k));}
  const pc=[...d.pc];pc[t]=k;const stars=g.filter(x=>d.sr.includes(x)).length;
  let nd={...d,c,o,pc,lm:g,np:(d.np||0)+1,mvn:(d.mvn||0)+1,last:`${nm(d,t)} ابتلع ${g.length}${stars?` ومعها ${stars} ⭐`:''}`};
  // whoever has nothing left to swallow is passed over
  let s=t;for(let j=0;j<d.pl.length;j++){s=nextSeat(nd,s);if(pnfFront(nd.o,z,s))break;}nd.turn=s;return pnfEnd(nd);}
// seat s paints its land k: the new board and what it swallowed
function pnfApply(c,o,z,s,k){const own=String(s),g=pnfGain(c,o,z,s,k);const C=[...c],O=[...o];for(let i=0;i<z*z;i++)if(O[i]===own)C[i]=String(k);for(const q of g){O[q]=own;C[q]=String(k);}return {c:C.join(''),o:O.join(''),g};}
function pnfBot(d,s,lv){const z=d.z,ks=[0,1,2,3,4,5].filter(k=>k!==d.pc[s]);const val=g=>g.reduce((a,x)=>a+(d.sr.includes(x)?3:1),0);
  const opts=ks.map(k=>{const g=pnfGain(d.c,d.o,z,s,k);return {k,g,v:val(g)};});
  if(lv===1){const ok=opts.filter(x=>x.v>0);if(!ok.length||Math.random()<.1)return pnRnd(ks);ok.sort((a,b)=>b.v-a.v);return (Math.random()<.5?ok[0]:pnRnd(ok)).k;}
  if(lv===2){let best=opts[0],bv=-Infinity;for(const x of opts){const v=x.v+Math.random()*.6;if(v>bv){bv=v;best=x;}}return best.k;}
  // hard: my colour, then the best answer of whoever plays next, then my best colour after that
  const nx=nextSeat(d,s);const pc=[...d.pc];let best=opts[0],bv=-Infinity;
  for(const x of opts){const A=pnfApply(d.c,d.o,z,s,x.k);let v=x.v;
    let ob=0,oc=null;if(nx!==s)for(const k2 of [0,1,2,3,4,5]){if(k2===pc[nx])continue;const B=pnfApply(A.c,A.o,z,nx,k2);const w=val(B.g);if(w>ob||!oc){ob=w;oc=B;}}
    const C=oc||A;let mb=0;for(const k3 of [0,1,2,3,4,5])if(k3!==x.k)mb=Math.max(mb,val(pnfGain(C.c,C.o,z,s,k3)));
    v+=mb*.7-ob*.8+Math.random()*.2;if(v>bv){bv=v;best=x;}}
  return best.k;}
GAMES.g_swallow={name:'ابتلع المربعات',cat:'mind',lbc:'#D65A8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FDF3E7"/>${[...Array(36)].map((_,i)=>{const r=i/6|0,c=i%6;const k=[2,4,1,0,5,3,4,1,3,2,0,5,0,5,2,4,1,3][(r*5+c*7)%18];return `<rect x="${5+c*15}" y="${5+r*15}" width="14" height="14" rx="3" fill="${PNFC[k]}"/>`;}).join('')}
    <path d="M5 5H50V20H35V35H20V50H5Z" fill="#EC6158"/><path d="M95 95H50V80H65V65H95Z" fill="#4AB1E8"/><path d="M42 57l3 6 6.5 1-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5-4.7-4.6 6.5-1z" fill="#F0B429" stroke="#9A6A00" stroke-width="1"/></svg>`,
  init:n=>{const z=PNFZ[n]||16;let c='';for(let i=0;i<z*z;i++)c+=rnd(6);const sp=pnfStarts(n,z);let o='.'.repeat(z*z);const pc=[];
    // every start square gets a different colour where it can, and the stars sit away from the corners
    sp.forEach((i,s)=>{o=setAt(o,i,String(s));const k=s%6;c=setAt(c,i,String(k));pc.push(k);});
    const sr=[];const want=Math.round(z*z/24);for(let t=0;sr.length<want&&t<500;t++){const i=rnd(z*z);if(o[i]!=='.'||sr.includes(i))continue;if(sp.some(p=>Math.abs((p/z|0)-(i/z|0))+Math.abs(p%z-i%z)<4))continue;sr.push(i);}
    return {z,c,o,pc,sr,lm:[],np:0,mvn:0,last:''};},
  onTimeout(d){return pnfDo(d,pnfBot(d,d.turn,1));},
  points:d=>d.pl.map((_,s)=>pnfScore(d,s)),
  winExtra:d=>d.pl.map((_,s)=>`${nm(d,s)} ${pnfScore(d,s)}`).join('، '),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const z=d.z,U=10,W=z*U,t=d.turn,my=ctx.my;const sq=i=>`M${i%z*U} ${(i/z|0)*U}h${U}v${U}h-${U}z`;const tile=i=>`M${i%z*U+.7} ${(i/z|0)*U+.7}h${U-1.4}v${U-1.4}h-${U-1.4}z`;
    const fr=[[],[],[],[],[],[]],own=d.pl.map(()=>[]);for(let i=0;i<z*z;i++){if(d.o[i]==='.')fr[+d.c[i]].push(tile(i));else own[+d.o[i]].push(sq(i));}
    const lm=new Set(d.lm||[]);let g=`<rect width="${W}" height="${W}" fill="#FDF6EC"/>`;
    fr.forEach((p,k)=>{if(p.length)g+=`<path d="${p.join('')}" fill="${PNFC[k]}"/>`;});
    own.forEach((p,s)=>{if(p.length)g+=`<path data-k="o${s}" d="${p.join('')}" fill="${col(d,s)}"/>`;});
    if(lm.size)g+=`<path class="pnfn" data-k="n${d.mvn}" d="${[...lm].map(sq).join('')}" fill="#fff"/>`;
    // borders between lands, so neighbours stay apart; every land wears a ring of the colour it holds now
    d.sr.forEach(i=>{const x=i%z*U+5,y=(i/z|0)*U+5;g+=`<path class="pnfs ${d.o[i]==='.'?'':'own'}" d="M${x} ${y-4}l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z"/>`;});
    pnfStarts(d.pl.length,z).forEach((i,s)=>{const x=i%z*U+5,y=(i/z|0)*U+5;g+=`<circle cx="${x}" cy="${y}" r="3.6" fill="${PNFC[d.pc[s]]}" stroke="#fff" stroke-width="1.4" class="${s===t&&d.win==null?'pnfon':''}"/>`;});
    let h=`<div class="pnfb"><svg viewBox="0 0 ${W} ${W}">${g}</svg></div>`;
    if(d.win==null){const gains=my?[0,1,2,3,4,5].map(k=>k===d.pc[t]?-1:pnfGain(d.c,d.o,z,t,k).length):null;
      h+=`<div class="pnfp">${PNFC.map((c,k)=>`<button class="pnfk ${k===d.pc[t]?'cur':''}" style="--k:${c}" data-ga="k" data-i="${k}" ${my&&k!==d.pc[t]?'':'disabled'}>${gains&&gains[k]>=0?`<b>+${gains[k]}</b>`:k===d.pc[t]?'<small>لونك</small>':''}</button>`).join('')}</div>`;}
    return h;},
  click(a,i,d,ctx){if(!ctx.my||a!=='k'||!(i>=0&&i<6)||i===d.pc[d.turn])return;act(pnfDo(d,i));},
  bot:(d,s,lv)=>pnfDo(d,pnfBot(d,s,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_swallow='ابتلع المربعات (لعبة من تصميمنا): لوحة مربعات ملونة، وكل لاعب يبدأ من زاوية (أرضه بلونه). في دورك اختار لون من الألوان تحت اللوحة (غير اللون اللي لابسته أرضك الحين): أرضك تلبس هاللون، وتبلع كل مربع بنفس اللون لازق في أرضك، واللي لازق فيه بعد من نفس اللون. الرقم على كل لون يقول لك كم مربع تبلع. النجمة الذهبية تحسب ثلاث مربعات. إذا ما بقى لك شي تبلعه ينتقل الدور للي بعدك. لما ما يقدر أحد يبلع أكثر، صاحب الأرض الأكبر يفوز. مع الفرق: تنجمع نقاط الفريق.';

/* ================= البرج: towers of blocks (an original take-away game) ================= */
// a few towers of wooden blocks. On your turn take 1, 2 or 3 blocks off the top of one tower; if two or more are left in it
// you may also split what is left into two towers. Whoever takes the very last block wins
const PNTG=(()=>{const g=[0];for(let n=1;n<=40;n++){const o=[];for(let k=1;k<=3&&k<=n;k++){const m=n-k;o.push(g[m]);for(let a=1;a+a<=m;a++)o.push(g[a]^g[m-a]);}g.push(pnMex(o));}return g;})();
const pntNim=t=>t.reduce((x,h)=>x^PNTG[h],0);
// moves: [tower, taken, split] (split 0 = keep one tower, else the height of the first part)
function pntMoves(t){const o=[];t.forEach((h,i)=>{for(let k=1;k<=3&&k<=h;k++){const m=h-k;o.push([i,k,0]);for(let a=1;a+a<=m;a++)o.push([i,k,a]);}});return o;}
function pntApply(t,m){const [i,k,a]=m,h=t[i]-k;const o=[...t];if(a){o.splice(i,1,a,h-a);}else o[i]=h;return o.filter(x=>x>0);}
function pntDo(d,m){const s=d.sd,[i,k,a]=m,h=d.t[i]-k;const t=pntApply(d.t,m);
  const x={t,lm:{i,k,a,h:d.t[i]},last:`${tmName(d,s)} أخذ ${k}${a?` وقسم الباقي ${a} و${h-a}`:''}`};
  if(!t.length)return pnWon(d,s,'last',x);return pnPass(d,s,x);}
function pntBot(d,lv){const ms=pntMoves(d.t);const fin=ms.find(m=>!pntApply(d.t,m).length);if(fin&&(lv>1||Math.random()<.8))return fin;
  if(lv===1)return pnRnd(ms);const win=ms.filter(m=>pntNim(pntApply(d.t,m))===0);if(win.length&&(lv===3||Math.random()<.6))return pnRnd(win);
  // no sure move: take one and keep the towers whole, so the game lasts and the other side has room to slip
  const small=ms.filter(m=>m[1]===1&&!m[2]);return pnRnd(small.length?small:ms);}
const PNTC=['#C98B4A','#B5652F','#D9A66B','#8E5A2B','#E0B97A','#A5743D'];
const pntDeal=()=>{const k=3+rnd(2);const t=[];for(let i=0;i<k;i++)t.push(3+rnd(6));return t;};
GAMES.g_tower={...PNTEAM,name:'البرج',cat:'mind',lbc:'#8E5A2B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7FB8D9"/><rect y="84" width="100" height="16" fill="#5E9C57"/>${[[18,5],[44,7],[70,3]].map(([x,n])=>[...Array(n)].map((_,k)=>`<rect x="${x}" y="${78-k*9}" width="20" height="8" rx="2" fill="${PNTC[(x+k)%6]}" stroke="#5A3818" stroke-width="1"/>`).join('')).join('')}<rect x="47" y="8" width="20" height="8" rx="2" fill="#F0B429" stroke="#7A4A00" stroke-width="1" transform="rotate(-14 57 12)"/></svg>`,
  init:()=>({t:pntDeal(),sd:0,tr:[0,0],lm:null,mvn:0,last:''}),
  onTimeout(d){return pntDo(d,pntBot(d,1));},
  points:pnPts(['🔴 الأحمر','🔵 الأزرق']),
  winText:d=>pnWinTxt(d,PNKN2,{last:'أخذ آخر قطعة'}),
  status:(d,ctx)=>pnStat(d,ctx,PNKN2),
  render(d,ctx){const my=ctx.my,P=pnSel(d);const sel=P&&P.i<d.t.length?P:null;
    let h=`<div class="pntw"><div class="pntr">${d.t.map((n,i)=>{let blk='';for(let j=n-1;j>=0;j--){const top=n-j;const take=sel&&sel.i===i&&top<=sel.k;const can=my&&top<=3;
        blk+=`<${can?'button':'div'} class="pntb ${take?'up':''} ${can?'can':''}" style="--c:${PNTC[(i*2+j)%6]}"${can?` data-ga="b" data-i="${i*100+top}"`:''}></${can?'button':'div'}>`;}
      return `<div class="pntt ${d.lm&&d.lm.i===i&&!d.lm.a?'lm':''}" data-k="t${i}-${n}"><div class="pnts">${blk}</div><b>${n}</b></div>`;}).join('')}</div></div>`;
    if(my&&sel){const m=d.t[sel.i]-sel.k;h+=`<div class="pntc"><p class="pnnote">تاخذ ${sel.k} من البرج، ويبقى فيه ${m}</p><div class="row chact"><button class="btn pngo" data-ga="go" data-i="0">${m?'خذ بدون تقسيم':'خذها'}</button>${[...Array(Math.floor(m/2))].map((_,a)=>`<button class="btn" data-ga="go" data-i="${a+1}">قسّم ${a+1} و${m-a-1}</button>`).join('')}</div></div>`;}
    else if(d.win==null)h+=`<p class="pnnote">${d.t.reduce((a,b)=>a+b,0)} قطعة في ${d.t.length} ${d.t.length>2?'أبراج':'برج'} • خذ من 1 إلى 3 من فوق</p>`;
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='b'){const ti=Math.floor(i/100),k=i%100;if(!(ti>=0&&ti<d.t.length)||k<1||k>3||k>d.t[ti])return;const P=pnSel(d);pnPick(d,P&&P.i===ti&&P.k===k?null:{i:ti,k});return;}
    if(a==='go'){const P=pnSel(d);if(!P||P.i>=d.t.length)return;const m=d.t[P.i]-P.k;if(!(i>=0&&i+i<=m)||(i&&m<2))return;S.pn=null;act(pntDo(d,[P.i,P.k,i]));}},
  bot:(d,s,lv)=>pntDo(d,pntBot(d,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_tower='البرج (لعبة من تصميمنا): على الطاولة كم برج من قطع خشب. في دورك اضغط قطعة من فوق أي برج: تاخذها هي واللي فوقها (من قطعة لين ثلاث). بعدها إذا بقى في البرج قطعتين أو أكثر تقدر تخليه مثل ما هو، أو تقسمه لبرجين (تختار كم في كل واحد). اللي ياخذ آخر قطعة على الطاولة يفوز. التقسيم يغيّر الحسبة كلها، فكّر قبل! الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= الخطوط: dots and lines, a grid take on Sprouts (original rules) ================= */
// dots on a grid; a move draws one short line between two neighbouring dots (across, up and down, or slanting). Every dot
// takes three lines at most, two slanting lines may not cross, and two dots are joined once. Whoever draws the last line wins
let PNLZ=1;// the last size chosen on this phone
const PNLS=[[3,4],[4,4],[4,5]];
const PNLT={};
function pnlTab(R,C){const k=R+'x'+C;if(PNLT[k])return PNLT[k];const E=[],id=(r,c)=>r*C+c;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){if(c<C-1)E.push([id(r,c),id(r,c+1),-1]);if(r<R-1)E.push([id(r,c),id(r+1,c),-1]);
    if(r<R-1&&c<C-1){E.push([id(r,c),id(r+1,c+1),r*C+c]);E.push([id(r,c+1),id(r+1,c),r*C+c]);}}
  const X=E.map((e,i)=>e[2]<0?-1:E.findIndex((f,j)=>j!==i&&f[2]===e[2]));const by=[...Array(R*C)].map(()=>[]);E.forEach((e,i)=>{by[e[0]].push(i);by[e[1]].push(i);});
  return PNLT[k]={E,X,by,N:R*C};}
function pnlDeg(e,T){const g=new Array(T.N).fill(0);for(let i=0;i<e.length;i++)if(e[i]!=='.'){g[T.E[i][0]]++;g[T.E[i][1]]++;}return g;}
function pnlMoves(e,T){const g=pnlDeg(e,T),o=[];for(let i=0;i<e.length;i++){if(e[i]!=='.')continue;const [a,b]=T.E[i];if(g[a]>=3||g[b]>=3)continue;if(T.X[i]>=0&&e[T.X[i]]!=='.')continue;o.push(i);}return o;}
function pnlDo(d,k){const s=d.sd,T=pnlTab(d.R,d.C),e=setAt(d.e,k,String(s));const x={e,lm:k,last:`${tmName(d,s)} رسم خط`};
  if(!pnlMoves(e,T).length)return pnWon(d,s,'last',x);return pnPass(d,s,x);}
// who wins from here, with a memory kept between turns (the lines' owners do not matter) and a node budget
const PNLM=new Map();
function pnlWin(e,T,bud){const k=e.replace(/[01]/g,'x');const m=PNLM.get(k);if(m!=null)return m;if(--bud.n<0)throw PNSTOP;
  let w=false;for(const i of pnlMoves(e,T)){if(!pnlWin(setAt(e,i,'x'),T,bud)){w=true;break;}}if(PNLM.size>400000)PNLM.clear();PNLM.set(k,w);return w;}
function pnlBot(d,lv){const T=pnlTab(d.R,d.C),ms=pnlMoves(d.e,T);if(lv===1&&Math.random()<.6)return pnRnd(ms);
  const bud={n:lv===3?160000:lv===2?6000:600};const good=[];
  try{for(const i of pnShuf(ms)){if(!pnlWin(setAt(d.e,i,'x'),T,bud)){good.push(i);break;}}}catch(x){if(x!==PNSTOP)throw x;}
  if(good.length)return good[0];
  // not worked out: keep the dots with many lines left (the game stays open), a little at random
  const g=pnlDeg(d.e,T);let best=ms[0],bv=-Infinity;for(const i of ms){const [a,b]=T.E[i];const v=-(g[a]+g[b])+(T.X[i]>=0?-.5:0)+Math.random()*1.5;if(v>bv){bv=v;best=i;}}return best;}
GAMES.g_lines={...PNTEAM,name:'الخطوط',cat:'mind',lbc:'#2E7D6B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E9F5EF"/><g stroke-width="5" stroke-linecap="round"><path d="M20 20H50M50 20L80 50M20 50V80M50 50H80" stroke="#D9433A"/><path d="M20 20V50M50 50L20 80M80 50V80M50 80H80" stroke="#2F74D0"/></g>${[20,50,80].map(y=>[20,50,80].map(x=>`<circle cx="${x}" cy="${y}" r="7" fill="#2D3B4C"/>`).join('')).join('')}${[[20,20,1],[50,50,0],[80,50,0]].map(([x,y,n])=>`<text x="${x}" y="${y+3.5}" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`).join('')}</svg>`,
  init:()=>{const [R,C]=PNLS[PNLZ]||PNLS[1];return {R,C,e:'.'.repeat(pnlTab(R,C).E.length),sd:0,tr:[0,0],lm:-1,mvn:0,last:''};},
  onTimeout(d){return pnlDo(d,pnRnd(pnlMoves(d.e,pnlTab(d.R,d.C))));},
  points:pnPts(['🔴 الأحمر','🔵 الأزرق']),
  winText:d=>pnWinTxt(d,PNKN2,{last:'رسم آخر خط'}),
  status:(d,ctx)=>pnStat(d,ctx,PNKN2),
  render(d,ctx){const R=d.R,C=d.C,T=pnlTab(R,C),my=ctx.my,P=pnSel(d);const W=(C-1)*20+20,H=(R-1)*20+20;const xy=i=>[10+i%C*20,10+(i/C|0)*20];
    const ms=my?pnlMoves(d.e,T):[];const g=pnlDeg(d.e,T);const can=new Set();ms.forEach(i=>{can.add(T.E[i][0]);can.add(T.E[i][1]);});
    const to=new Set();if(P)ms.forEach(i=>{const [a,b]=T.E[i];if(a===P.a)to.add(b);if(b===P.a)to.add(a);});
    let h=pnOpts(d,ctx,'sz',PNLS.map(([r,c],k)=>[k,`${r}×${c}`]),PNLS.findIndex(([r,c])=>r===R&&c===C));
    let sv=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    T.E.forEach(([a,b],i)=>{const [x1,y1]=xy(a),[x2,y2]=xy(b);const v=d.e[i];if(v==='.')return;sv+=`${i===d.lm?`<path class="pnllm" d="M${x1} ${y1}L${x2} ${y2}"/>`:''}<path class="pnll s${v} ${i===d.lm?'nw':''}" data-k="l${i}" d="M${x1} ${y1}L${x2} ${y2}"/>`;});
    if(P){const [x1,y1]=xy(P.a);to.forEach(b=>{const [x2,y2]=xy(b);sv+=`<path class="pnlgh" d="M${x1} ${y1}L${x2} ${y2}"/>`;});}
    sv+='</svg>';
    let pts='';for(let i=0;i<T.N;i++){const [x,y]=xy(i),lf=3-g[i];const tap=my&&(P?to.has(i)||i===P.a:can.has(i));
      pts+=`<${tap?'button':'div'} class="pnld l${lf} ${P&&P.a===i?'sel':''} ${to.has(i)?'to':''}" style="left:${(x/W*100).toFixed(2)}%;top:${(y/H*100).toFixed(2)}%"${tap?` data-ga="d" data-i="${i}"`:''}>${lf}</${tap?'button':'div'}>`;}
    h+=`<div class="pnlb ${my?'my':''}" style="aspect-ratio:${W}/${H}">${sv}${pts}</div>`;
    if(d.win==null)h+=`<p class="pnnote">الرقم على كل نقطة = كم خط باقي لها • باقي ${pnlMoves(d.e,T).length} خط ممكن</p>`;
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='sz'){if(!pnFresh(d)||!PNLS[i])return;PNLZ=i;const [R,C]=PNLS[i];act({...d,R,C,e:'.'.repeat(pnlTab(R,C).E.length)});return;}
    if(a!=='d')return;const T=pnlTab(d.R,d.C),ms=pnlMoves(d.e,T),P=pnSel(d);
    if(P){if(i===P.a){pnPick(d,null);return;}const k=ms.find(j=>{const [x,y]=T.E[j];return x===P.a&&y===i||y===P.a&&x===i;});if(k!=null){S.pn=null;act(pnlDo(d,k));return;}}
    const mine=ms.filter(j=>T.E[j][0]===i||T.E[j][1]===i);if(!mine.length){pnPick(d,null);return;}if(mine.length===1){S.pn=null;act(pnlDo(d,mine[0]));return;}pnPick(d,{a:i});},
  bot:(d,s,lv)=>pnlDo(d,pnlBot(d,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_lines='الخطوط (لعبة من تصميمنا على فكرة «البراعم»): نقاط على شكل شبكة. في دورك ارسم خط قصير بين نقطتين جيران: بالعرض أو بالطول أو مايل. كل نقطة تتحمل ثلاث خطوط بس (الرقم على النقطة يقول كم باقي لها)، والخطين المايلين في نفس المربع ما يتقاطعون، وما ترسم نفس الخط مرتين. اللي يرسم آخر خط ممكن يفوز، يعني اللي يجي دوره وما يلقى خط يخسر. اضغط نقطة وبعدها اضغط جارتها. قبل أول خط تختارون حجم الشبكة. الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= صندوق الألوان: Chomp ================= */
// a box of sweets; a turn eats one sweet and every sweet above it and to its right. The chilli sweet in the bottom corner
// is eaten last, and whoever has to eat it loses
let PNHZ=1;// the last size chosen on this phone
const PNHS=[[4,5],[5,6],[6,7]];
const PNHM=new Map();
// h: the height of every column (left to right, never growing); true when the side to move can win
function pnhWin(h){const k=h.join(',');const m=PNHM.get(k);if(m!=null)return m;let w=false;
  out:for(let c=0;c<h.length;c++)for(let r=0;r<h[c];r++){if(!c&&!r)continue;if(!pnhWin(pnhEat(h,c,r))){w=true;break out;}}PNHM.set(k,w);return w;}
const pnhEat=(h,c,r)=>h.map((x,i)=>i>=c?Math.min(x,r):x);
function pnhMoves(h){const o=[];for(let c=0;c<h.length;c++)for(let r=0;r<h[c];r++)if(c||r)o.push([c,r]);return o;}
function pnhDo(d,c,r){const s=d.sd,h=pnhEat(d.h,c,r);const n=d.h.reduce((a,x)=>a+x,0)-h.reduce((a,x)=>a+x,0);
  const x={h,lm:[c,r],ate:d.h,last:`${tmName(d,s)} أكل ${n} ${n>2&&n<11?'حبات':'حبة'}`};
  if(!c&&!r)return pnWon(d,1-s,'chili',{...x,last:`${tmName(d,s)} أكل الحبة الحارّة 🌶️`});return pnPass(d,s,x);}
function pnhBot(d,lv){const ms=pnhMoves(d.h);if(!ms.length)return [0,0];if(lv===1&&Math.random()<.7)return pnRnd(ms);
  const win=ms.filter(([c,r])=>!pnhWin(pnhEat(d.h,c,r)));if(win.length&&(lv===3||Math.random()<.6))return pnRnd(win);
  // no sure move: eat little, from the far corner
  const small=ms.filter(([c,r])=>pnhEat(d.h,c,r).reduce((a,x)=>a+x,0)>=d.h.reduce((a,x)=>a+x,0)-2);return pnRnd(small.length?small:ms);}
const PNHC=['#E5534B','#F0B429','#3FAE5C','#4AB1E8','#9C7BD6','#F2874B','#E57AAE'];
GAMES.g_chomp={...PNTEAM,name:'صندوق الألوان',cat:'mind',lbc:'#B5462F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6B3E26"/><rect x="10" y="14" width="80" height="72" rx="8" fill="#8A5636"/>${[...Array(12)].map((_,i)=>{const r=i/4|0,c=i%4;if(r===0&&c>1||r===1&&c===3)return '';return `<circle cx="${23+c*18}" cy="${30+r*20}" r="7.5" fill="${PNHC[(r*3+c)%7]}"/><circle cx="${21+c*18}" cy="${28+r*20}" r="2.2" fill="#fff" opacity=".5"/>`;}).join('')}<path d="M18 73c4-6 10-6 12-2 2 4-6 9-12 2z" fill="#2E8B3E"/><path d="M14 72c2 6 8 8 14 2" stroke="#2E8B3E" stroke-width="2.5" fill="none"/></svg>`,
  init:()=>{const [R,C]=PNHS[PNHZ]||PNHS[1];return {R,C,h:Array(C).fill(R),sd:0,tr:[0,0],lm:null,ate:null,mvn:0,last:''};},
  onTimeout(d){const [c,r]=pnhBot(d,1);return pnhDo(d,c,r);},
  points:pnPts(['🔴 الأحمر','🔵 الأزرق']),
  winText:d=>pnWinTxt(d,PNKN2,{chili:'الخصم أكل الحبة الحارّة'}),
  status:(d,ctx)=>pnStat(d,ctx,PNKN2),
  render(d,ctx){const R=d.R,C=d.C,my=ctx.my,P=pnSel(d);const ate=d.ate||d.h;let h=pnOpts(d,ctx,'sz',PNHS.map(([r,c],k)=>[k,`${r}×${c}`]),PNHS.findIndex(([r,c])=>r===R&&c===C));
    h+=`<div class="pnhb ${my?'my':''}"><div class="pnhg" style="grid-template-columns:repeat(${C},minmax(0,1fr))">`;
    for(let r=R-1;r>=0;r--)for(let c=0;c<C;c++){const here=r<d.h[c],was=r<ate[c];const chili=!c&&!r;const pre=P&&here&&c>=P.c&&r>=P.r;
      if(!here){h+=`<div class="pnhc e">${was&&d.mvn?`<i class="pnhs gone" data-k="g${d.mvn}" style="--k:${PNHC[(r*3+c)%7]}"></i>`:''}</div>`;continue;}
      h+=`<${my?'button':'div'} class="pnhc ${pre?'pre':''} ${P&&P.c===c&&P.r===r?'sel':''}"${my?` data-ga="e" data-i="${c*10+r}"`:''}>${chili?'<i class="pnhs chili">🌶️</i>':`<i class="pnhs" style="--k:${PNHC[(r*3+c)%7]}"></i>`}</${my?'button':'div'}>`;}
    h+='</div></div>';
    if(my&&P)h+=`<p class="pnnote">${!P.c&&!P.r?'هذي الحبة الحارّة! إذا أكلتها تخسر. اضغطها مرة ثانية إذا متأكد':'اضغط نفس الحبة مرة ثانية تاكلها هي وكل اللي فوقها ويمينها'}</p>`;
    else if(d.win==null)h+=`<p class="pnnote">باقي ${d.h.reduce((a,x)=>a+x,0)} حبة • لا تاكل الحبة الحارّة 🌶️</p>`;
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='sz'){if(!pnFresh(d)||!PNHS[i])return;PNHZ=i;const [R,C]=PNHS[i];act({...d,R,C,h:Array(C).fill(R)});return;}
    if(a!=='e')return;const c=Math.floor(i/10),r=i%10;if(!(c>=0&&c<d.C)||r>=d.h[c])return;const P=pnSel(d);
    if(P&&P.c===c&&P.r===r){S.pn=null;act(pnhDo(d,c,r));return;}pnPick(d,{c,r});},
  bot:(d,s,lv)=>{const [c,r]=pnhBot(d,lv);return pnhDo(d,c,r);},
  botDelay:()=>500+rnd(400)};
HELP.g_chomp='صندوق الألوان (لعبة «تشومب» المشهورة): صندوق حلاوة مصفوفة صفوف، والحبة اللي تحت في الزاوية حارّة 🌶️. في دورك اختار أي حبة وتاكلها هي وكل الحبات اللي فوقها واللي على يمينها (والفوق يمين). اللي يضطر ياكل الحبة الحارّة يخسر. اضغط حبة يبين لك وش بتاكل، واضغطها مرة ثانية للتأكيد. قبل أول لقمة تختارون حجم الصندوق. الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= العلامات: Notakto ================= */
// a few 3×3 boards; both sides mark X. A board with three in a line is finished; whoever finishes the last board loses
let PNXK=3;// the number of boards chosen last on this phone
const PNXL=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const PNXP=(()=>{const rot=[6,3,0,7,4,1,8,5,2],fl=[2,1,0,5,4,3,8,7,6];const o=[];let p=[0,1,2,3,4,5,6,7,8];for(let k=0;k<4;k++){o.push(p);o.push(p.map(i=>fl[i]));p=p.map(i=>rot[i]);}return o;})();
const pnxLine=m=>PNXL.find(L=>L.every(i=>m>>i&1));
const pnxCan=m=>{let b=512;for(const p of PNXP){let x=0;for(let i=0;i<9;i++)if(m>>i&1)x|=1<<p[i];if(x<b)b=x;}return b;};
const pnxMask=(b,k)=>{let m=0;for(let i=0;i<9;i++)if(b[k*9+i]!=='.')m|=1<<i;return m;};
const pnxDead=(b,k)=>!!pnxLine(pnxMask(b,k));
const PNXM=new Map();
// boards as sorted canonical masks of the live ones; true when the side to move can win
function pnxWin(ms,bud){const key=ms.join(',');const v=PNXM.get(key);if(v!=null)return v;if(--bud.n<0)throw PNSTOP;let w=false;
  const seen=new Set();out:for(let j=0;j<ms.length;j++){if(seen.has(ms[j]))continue;seen.add(ms[j]);const m=ms[j];const tried=new Set();
    for(let i=0;i<9;i++){if(m>>i&1)continue;const nm=m|1<<i;const c=pnxCan(nm);if(tried.has(c))continue;tried.add(c);
      const rest=ms.filter((_,q)=>q!==j);if(pnxLine(nm)){if(!rest.length)continue;if(!pnxWin(rest,bud)){w=true;break out;}}
      else if(!pnxWin([...rest,c].sort((a,b)=>a-b),bud)){w=true;break out;}}}
  if(PNXM.size>300000)PNXM.clear();PNXM.set(key,w);return w;}
function pnxMoves(b,K){const o=[];for(let k=0;k<K;k++)if(!pnxDead(b,k))for(let i=0;i<9;i++)if(b[k*9+i]==='.')o.push(k*9+i);return o;}
function pnxDo(d,i){const s=d.sd,b=setAt(d.b,i,String(s)),k=i/9|0;const L=pnxLine(pnxMask(b,k));
  const x={b,lm:i,last:`${tmName(d,s)} حط علامة${L?' وقفّل لوحة':''}`};if(L&&[...Array(d.K)].every((_,q)=>pnxDead(b,q)))return pnWon(d,1-s,'lastboard',x);return pnPass(d,s,x);}
function pnxBot(d,lv){const K=d.K,b=d.b,ms=pnxMoves(b,K);const kills=i=>!!pnxLine(pnxMask(setAt(b,i,'x'),i/9|0));
  const left=[...Array(K)].filter((_,k)=>!pnxDead(b,k)).length;const safe=ms.filter(i=>!(left===1&&kills(i)));
  if(lv===1){return pnRnd(safe.length&&Math.random()<.85?safe:ms);}
  const bud={n:lv===3?250000:4000};
  try{for(const i of pnShuf(ms)){const nb=setAt(b,i,'x');const live=[...Array(K)].map((_,k)=>k).filter(k=>!pnxDead(nb,k)).map(k=>pnxCan(pnxMask(nb,k))).sort((a,c)=>a-c);
      if(!live.length)continue;if(!pnxWin(live,bud))return i;}}catch(x){if(x!==PNSTOP)throw x;}
  // not worked out: the centre of a fresh board, else a mark that finishes nothing
  const quiet=safe.filter(i=>!kills(i));return pnRnd(quiet.length?quiet:safe.length?safe:ms);}
GAMES.g_notakto={...PNTEAM,name:'العلامات',cat:'mind',lbc:'#3D4E8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#EEF1FB"/>${[[6,8],[52,8],[29,52]].map(([x,y],k)=>`<g transform="translate(${x} ${y})"><rect width="42" height="42" rx="5" fill="#fff" stroke="#C5CBE6" stroke-width="1.5"/><path d="M14 4V38M28 4V38M4 14H38M4 28H38" stroke="#7B86B8" stroke-width="1.6"/>${(k===1?[0,4,8]:k===0?[1,3]:[4,2]).map(i=>`<path d="M${(i%3)*14+3} ${(i/3|0)*14+3}l8 8M${(i%3)*14+11} ${(i/3|0)*14+3}l-8 8" stroke="${k===1?'#9AA2C7':'#E5483F'}" stroke-width="2.6" stroke-linecap="round"/>`).join('')}${k===1?'<path d="M5 5L37 37" stroke="#3D4E8C" stroke-width="2.2" stroke-linecap="round"/>':''}</g>`).join('')}</svg>`,
  init:()=>({K:PNXK,b:'.'.repeat(9*PNXK),sd:0,tr:[0,0],lm:-1,mvn:0,last:''}),
  onTimeout(d){return pnxDo(d,pnxBot(d,1));},
  points:pnPts(['🔴 الأحمر','🔵 الأزرق']),
  winText:d=>pnWinTxt(d,PNKN2,{lastboard:'الخصم قفّل آخر لوحة'}),
  status:(d,ctx)=>pnStat(d,ctx,PNKN2),
  render(d,ctx){const K=d.K,my=ctx.my;let h=pnOpts(d,ctx,'k',[[1,'لوحة'],[2,'لوحتين'],[3,'3 لوحات'],[4,'4 لوحات']],K);
    const left=[...Array(K)].filter((_,k)=>!pnxDead(d.b,k)).length;
    h+=`<div class="pnxw k${K}">`;for(let k=0;k<K;k++){const L=pnxLine(pnxMask(d.b,k));
      h+=`<div class="pnxb ${L?'dead':''}" data-k="b${k}">`;for(let i=0;i<9;i++){const v=d.b[k*9+i],q=k*9+i,tap=my&&!L&&v==='.';
        h+=`<${tap?'button':'div'} class="pnxc ${q===d.lm?'lm':''}"${tap?` data-ga="x" data-i="${q}"`:''}>${v!=='.'?`<i class="pnxx s${v}"></i>`:''}</${tap?'button':'div'}>`;}
      if(L){const a=L[0],z=L[2];h+=`<svg class="pnxln" viewBox="0 0 3 3" data-k="ln${k}"><path d="M${a%3+.5} ${(a/3|0)+.5}L${z%3+.5} ${(z/3|0)+.5}"/></svg>`;}
      h+='</div>';}
    h+='</div>';if(d.win==null)h+=`<p class="pnnote">${left===1?'آخر لوحة! اللي يقفّلها يخسر':`باقي ${left} لوحات مفتوحة • اللي يقفّل آخر لوحة يخسر`}</p>`;return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='k'){if(!pnFresh(d)||![1,2,3,4].includes(i))return;PNXK=i;act({...d,K:i,b:'.'.repeat(9*i)});return;}
    if(a!=='x'||d.b[i]!=='.'||pnxDead(d.b,i/9|0))return;act(pnxDo(d,i));},
  bot:(d,s,lv)=>pnxDo(d,pnxBot(d,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_notakto='العلامات (لعبة «نوتاكتو»): كم لوحة إكس أو صغيرة، والفريقين يحطون نفس العلامة ✗. في دورك حط علامة في أي مربع فاضي في لوحة مفتوحة. اللوحة اللي يصير فيها ثلاث علامات على خط (بالعرض أو الطول أو القطر) تتقفل وما أحد يلعب فيها. اللي يقفّل آخر لوحة يخسر. يعني حاول تخلي خصمك هو اللي يضطر يقفّلها. قبل أول علامة تختارون كم لوحة. الفريق اللي يبدأ يتبدل كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= الشبكة الذهبية: red and blue Hackenbush ================= */
// red and blue sticks stand on a golden ground. The red side cuts one red stick a turn, the blue side one blue stick; every
// stick no longer joined to the ground falls too. Whoever has no stick of its colour left to cut loses
// the picture: nodes [x,y] (y 62 is the ground), sticks [a,b,colour 0 red / 1 blue]
function pngGen(){const N=[],E=[];const node=(x,y)=>{N.push([Math.round(x*10)/10,Math.round(y*10)/10]);return N.length-1;};const col=()=>rnd(2);
  const kinds=pnShuf(['stalk','fork','stalk','tree','arch','stalk']).slice(0,4);let x=12;
  for(const k of kinds){const w=k==='arch'?26:k==='fork'||k==='tree'?22:14;const cx=x+w/2;
    if(k==='arch'){const g1=node(x+3,62),g2=node(x+w-3,62),a=node(x+4,46),b=node(x+w-4,46),t=node(cx,33);E.push([g1,a,col()],[a,t,col()],[t,b,col()],[b,g2,col()]);}
    else{const g=node(cx,62);let p=g;const h=k==='stalk'?2+rnd(3):1+rnd(2);for(let j=0;j<h;j++){const q=node(cx+(j%2?2:-2)*(k==='stalk'?1:0),62-(j+1)*11);E.push([p,q,col()]);p=q;}
      if(k!=='stalk'){const top=N[p];const L=node(top[0]-8,top[1]-10),R=node(top[0]+8,top[1]-10);E.push([p,L,col()],[p,R,col()]);
        if(k==='tree'){const L2=node(top[0]-10,top[1]-21);E.push([L,L2,col()]);}}}
    x+=w+6;}
  // squeeze into the width
  const mx=Math.max(...N.map(n=>n[0]))+10;N.forEach(n=>{n[0]=Math.round(n[0]*100/Math.max(100,mx)*10)/10;});return {N,E};}
const pngGround=(N,i)=>N[i][1]>=62;
// alive mask (bit per stick) after cutting: only what still reaches the ground stays
function pngKeep(N,E,m){const seen=new Set();const q=[];N.forEach((n,i)=>{if(pngGround(N,i)){seen.add(i);q.push(i);}});let keep=0;
  for(let qi=0;qi<q.length;qi++){const a=q[qi];E.forEach(([x,y],k)=>{if(!(m>>k&1))return;if(x!==a&&y!==a)return;keep|=1<<k;const o=x===a?y:x;if(!seen.has(o)){seen.add(o);q.push(o);}});}return keep;}
const PNGM=new Map();
// side to move s (0 red, 1 blue) wins from mask m?
function pngWin(N,E,m,s,bud,key){const k=key+':'+m+':'+s;const v=PNGM.get(k);if(v!=null)return v;if(--bud.n<0)throw PNSTOP;let w=false;
  for(let j=0;j<E.length;j++){if(!(m>>j&1)||E[j][2]!==s)continue;if(!pngWin(N,E,pngKeep(N,E,m&~(1<<j)),1-s,bud,key)){w=true;break;}}
  if(PNGM.size>400000)PNGM.clear();PNGM.set(k,w);return w;}
const pngKey=E=>E.map(e=>e.join('.')).join('|');
function pngDo(d,j){const s=d.sd,m0=parseInt(d.m,36),m1=pngKeep(d.N,d.E,m0&~(1<<j));const fell=[];for(let k=0;k<d.E.length;k++)if((m0>>k&1)&&!(m1>>k&1)&&k!==j)fell.push(k);
  const x={m:m1.toString(36),lm:j,fell,last:`${tmName(d,s)} قطع عود${fell.length?` وطاح معه ${fell.length}`:''}`};
  if(!d.E.some((e,k)=>(m1>>k&1)&&e[2]===1-s))return pnWon(d,s,'none',x);return pnPass(d,s,x);}
const pngMine=(d,s)=>{const m=parseInt(d.m,36);return d.E.map((e,k)=>(m>>k&1)&&e[2]===s?k:-1).filter(k=>k>=0);};
function pngBot(d,lv){const s=d.sd,ms=pngMine(d,s),m=parseInt(d.m,36),key=pngKey(d.E);
  // height of a stick: how many sticks hang above it (cutting low loses them all)
  const above=j=>{const after=pngKeep(d.N,d.E,m&~(1<<j));let n=0;for(let k=0;k<d.E.length;k++)if((m>>k&1)&&!(after>>k&1)&&k!==j)n+=d.E[k][2]===s?1:-1;return n;};
  if(lv===1&&Math.random()<.6)return pnRnd(ms);
  const bud={n:lv===3?300000:lv===2?3000:300};
  try{for(const j of pnShuf(ms))if(!pngWin(d.N,d.E,pngKeep(d.N,d.E,m&~(1<<j)),1-s,bud,key))return j;}catch(x){if(x!==PNSTOP)throw x;}
  // not worked out (or lost anyway): cut the stick that drops the fewest of my own and the most of the other side's
  let best=ms[0],bv=Infinity;for(const j of ms){const v=above(j)+Math.random()*.5;if(v<bv){bv=v;best=j;}}return best;}
GAMES.g_hacken={...PNTEAM,name:'الشبكة الذهبية',cat:'mind',lbc:'#B8860B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FFF6DD"/><rect y="76" width="100" height="24" fill="#E8B730"/><path d="M0 76H100" stroke="#B8860B" stroke-width="2"/><g stroke-width="5.5" stroke-linecap="round" fill="none"><path d="M26 76L24 56" stroke="#D9433A"/><path d="M24 56L26 36" stroke="#2F74D0"/><path d="M26 36L14 22M26 36L38 22" stroke="#D9433A"/><path d="M70 76L60 58L72 44L84 58L80 76" stroke="#2F74D0"/><path d="M72 44L72 26" stroke="#D9433A"/></g>${[[24,56],[26,36],[14,22],[38,22],[60,58],[72,44],[84,58],[72,26]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.4" fill="#5A4316"/>`).join('')}<path d="M44 30l8 8M52 30l-8 8" stroke="#2D3B4C" stroke-width="3" stroke-linecap="round"/></svg>`,
  init:()=>{let G=pngGen(),best=null;
    // look for a fair picture (the side that opens loses with best play), and take the last try when none turns up
    for(let t=0;t<30;t++){const all=(1<<G.E.length)-1,key=pngKey(G.E),bud={n:60000};let w0,w1;
      try{w0=pngWin(G.N,G.E,all,0,bud,key);w1=pngWin(G.N,G.E,all,1,bud,key);}catch(x){if(x!==PNSTOP)throw x;w0=w1=null;}
      const nr=G.E.filter(e=>!e[2]).length;if(w0===false&&w1===false&&nr*2===G.E.length){best=G;break;}if(!best&&Math.abs(nr*2-G.E.length)<=2)best=G;G=pngGen();}
    best=best||G;return {N:best.N,E:best.E,m:((1<<best.E.length)-1).toString(36),sd:0,tr:[0,0],lm:-1,fell:[],mvn:0,last:''};},
  onTimeout(d){return pngDo(d,pngBot(d,1));},
  points:d=>{const m=parseInt(d.m,36);const n=[0,1].map(s=>d.E.filter((e,k)=>(m>>k&1)&&e[2]===s).length);return d.pl.map((_,s)=>`${s%2?'🔵':'🔴'} ${n[s%2]} عود`);},
  winText:d=>pnWinTxt(d,PNKN2,{none:'الخصم ما بقى له عود يقطعه'}),
  status:(d,ctx)=>pnStat(d,ctx,PNKN2,`• اقطع عود ${d.sd?'أزرق':'أحمر'}`),
  render(d,ctx){const my=ctx.my,s=d.sd,m=parseInt(d.m,36),N=d.N;const P=k=>N[k].join(' ');let g='<rect x="0" y="62" width="100" height="12" class="pngg"/><path d="M0 62H100" class="pnggl"/>';
    d.E.forEach(([a,b,c],k)=>{const on=m>>k&1;const dd=`M${P(a)}L${P(b)}`;
      if(on)g+=`<path class="pnge c${c} ${my&&c===s?'can':''}" data-k="e${k}" d="${dd}"/>`;
      else if(k===d.lm||(d.fell||[]).includes(k))g+=`<path class="pnge c${c} fall" data-k="f${k}-${d.mvn}" d="${dd}"/>`;});
    const used=new Set();d.E.forEach(([a,b],k)=>{if(m>>k&1){used.add(a);used.add(b);}});
    N.forEach(([x,y],i)=>{if(used.has(i)&&y<62)g+=`<circle cx="${x}" cy="${y}" r="1.6" class="pngn"/>`;});
    if(d.lm>=0){const [a,b]=d.E[d.lm];const x=(N[a][0]+N[b][0])/2,y=(N[a][1]+N[b][1])/2;g+=`<path class="pngx" data-k="x${d.mvn}" d="M${x-2} ${y-2}l4 4M${x+2} ${y-2}l-4 4"/>`;}
    if(my)d.E.forEach(([a,b,c],k)=>{if((m>>k&1)&&c===s)g+=`<path class="pngh" data-ga="cut" data-i="${k}" d="M${P(a)}L${P(b)}"/>`;});
    return `<div class="pngb ${my?'my':''}"><svg viewBox="0 0 100 74">${g}</svg></div><div class="pnleg"><span>${pnChip(0,PNKN2)} يقطع الأحمر</span><span>${pnChip(1,PNKN2)} يقطع الأزرق</span></div>`;},
  click(a,i,d,ctx){if(!ctx.my||a!=='cut')return;if(pngMine(d,d.sd).includes(i))act(pngDo(d,i));},
  bot:(d,s,lv)=>pngDo(d,pngBot(d,lv)),
  botDelay:()=>500+rnd(400)};
HELP.g_hacken='الشبكة الذهبية (على فكرة لعبة «هاكنبوش»): أعواد حمراء وزرقاء واقفة على أرض ذهبية، بعضها فوق بعض مثل الأشجار. فريق الأحمر يقطع في دوره عود أحمر واحد، وفريق الأزرق يقطع عود أزرق. أي عود ما عاد واصل للأرض (لا بنفسه ولا عن طريق عيدان ثانية) يطيح معه، حتى لو كان من لون خصمك. اللي يجي دوره وما بقى له عود بلونه يخسر. نصيحة: اقطع من فوق عشان ما تطيّح عيدانك، وحاول تقطع تحت عيدان خصمك. الفريق اللي يبدأ يتبدل كل جولة، والرسمة تتغير كل جولة. إذا أكثر من لاعبين: فريقين يتناوبون.';

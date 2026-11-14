'use strict';
/* speed and memory challenges (everyone plays at once, time is measured on each phone) and more quiz packs and ten thousand dice */

/* ---------- shared: timed challenge rounds ---------- */
const SPD_ROUNDS=5;
function spdKey(d,v){return d.gid+':'+d.rd+':'+v;}
function spdState(d,v){const k=spdKey(d,v);if(!S.sp||S.sp.key!==k)S.sp={key:k,phase:'ready'};return S.sp;}
// rank: the fastest right answer earns 2 and every other right answer 1 (without it only the fastest scores)
function spdResolve(d,picks,rank){
  picks=picks.map(p=>p&&typeof p==='object'&&typeof p.ms==='number'&&isFinite(p.ms)?{ok:!!p.ok,ms:Math.max(0,Math.round(p.ms))}:null);
  const pts=[...d.pts];const ok=picks.map((p,s)=>p&&p.ok?{s,ms:p.ms}:null).filter(Boolean).sort((a,b)=>a.ms-b.ms);const sg=Array(d.pl.length).fill(0);
  let w=-1;if(ok.length&&(ok.length===1||ok[0].ms<ok[1].ms)){w=ok[0].s;sg[w]=rank?2:1;}
  if(rank)ok.forEach(x=>{if(x.s!==w)sg[x.s]=1;});sg.forEach((g,s)=>pts[s]+=g);
  const fmt=p=>!p?'—':p.ok?(p.ms/1000).toFixed(2)+' ث':'✗';
  const res=d.pl.map((r,s)=>picks[s]===null&&d.out[s]==='1'?'':`${nm(d,s)} ${fmt(picks[s])}`).filter(Boolean).join('، ')+(w>=0?`. الأسرع: ${nm(d,w)}`:'. محد فاز بالجولة');
  const rd=d.rd+1;return {...d,pts,rd,res,...(rank?{sg}:{}),win:rd>=SPD_ROUNDS?mostPts(pts):null};
}
const spdSubmit=(d,ctx,ok)=>{const st=spdState(d,ctx.v);const ms=Math.round(performance.now()-st.t0);S.sp={...st,phase:'sent'};try{sfx(ok?'pop':'lose');}catch(e){}simulPick(d,ctx.v,{ok:!!ok,ms});};
// last round read back from d.res ("name 1.23 ث، name ✗. الأسرع: name"): a row per seat, fastest first
function spdRows(d){if(!d||!d.res)return null;const body=d.res.replace(/\. (الأسرع: .*|محد فاز بالجولة)$/,'');const es=body.split('، ');const rows=[];
  for(const s of seatsOf(d)){const n=nm(d,s)+' ';const e=es.find(x=>x.startsWith(n));if(!e)continue;const m=/^(?:(\d+(?:\.\d+)?) ث|(✗)|(—))$/.exec(e.slice(n.length));if(!m)continue;rows.push({s,t:m[1]?+m[1]:null,bad:!!m[2]});}
  if(!rows.length)return null;const w=/الأسرع: (.+)$/.exec(d.res);const ws=w?seatsOf(d).find(s=>nm(d,s)===w[1]):null;
  rows.sort((a,b)=>(a.t==null)-(b.t==null)||(a.t??0)-(b.t??0)||a.bad-b.bad);return {rows,w:ws??null};}
function spdBoard(d){const R=spdRows(d);if(!R)return '';const mx=Math.max(...R.rows.map(r=>r.t||0))||1;
  return `<div class="spr" id="spr${d.rd}"><div class="spr-h">نتيجة الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${R.rows.map((r,j)=>`<div class="spr-r ${r.s===R.w?'w':''} ${r.t==null?'nt':''}" style="--c:${col(d,r.s)};--j:${j}"><i class="spr-m">${r.s===R.w?'⚡':r.t==null?'':j+1}</i><b>${escH(nm(d,r.s))}</b><span class="spr-bar">${r.t!=null?`<i style="width:${Math.max(8,Math.round(r.t/mx*100))}%"></i>`:''}</span><em>${r.t!=null?r.t.toFixed(2)+' ث':r.bad?'✗ غلط':'—'}</em>${d.sg&&d.sg[r.s]?`<u class="spr-g">+${d.sg[r.s]}</u>`:''}</div>`).join('')}</div>`;}
// the start button comes first, so it stays on screen with eight players; last round's times sit under it
const readyCard=(title,art,d)=>`<div class="spd spd-ready"><div class="spd-card">${art||`<div class="rdyi">${(GAMES[S.st.g]||{}).icon||''}</div>`}<div class="spdt">${title}</div>${d?`<span class="spd-rd">جولة ${Math.min(d.rd+1,SPD_ROUNDS)} من ${SPD_ROUNDS}</span>`:''}<button class="btn red wide spd-go" data-ga="start">جاهز، ابدأ</button></div>${d?spdBoard(d):''}</div>`;
// sent: this phone's own result for the round, and who we still wait for
const waitCard=(d,ctx)=>{let me='',bad=false;if(d&&ctx&&ctx.v!=null&&ctx.v>=0){const p=seatPick(d,ctx,ctx.v,d.rd);if(p&&typeof p==='object'){bad=!p.ok;me=p.ok?`<div class="spd-me">وقتك <b>${(p.ms/1000).toFixed(2)}</b> ث</div>`:'<div class="spd-me no">ما ضبطت هالمرة</div>';}}
  return `<div class="spd spd-sent"><div class="spd-ck ${bad?'no':''}">${bad?'✗':'✓'}</div><div class="spdt">أرسلت</div>${me}<p class="note">ننتظر الباقين</p>${d?qzWho(d,ctx):''}</div>`;};
// a bar that empties while something is on screen for ms
const drainBar=ms=>`<div class="spbar"><i style="animation-duration:${ms}ms"></i></div>`;
function spdBase(o){return {name:o.name,cat:'quiz',lbc:o.lbc,icon:o.icon,
  // a bot answers right more often and faster on harder levels (a game can size it to its own round with o.bot)
  botPick(d,s,lv){if(o.bot)return o.bot(d,s,lv);const fast=o.name==='أسرع ضغطة'||o.name==='مبارزة السيوف';const R=fast?[0,[520,880],[360,560],[250,380]][lv]:[0,[5200,9000],[3200,5600],[2000,3600]][lv];
    return {ok:Math.random()<[0,.6,.8,.95][lv],ms:R[0]+rnd(R[1]-R[0])};},
  init:n=>({rd:0,pts:Array(n).fill(0),res:''}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,SPD_ROUNDS)} من ${SPD_ROUNDS}</small><br>`,true),
  winExtra:d=>d.res,resolve:(d,p)=>spdResolve(d,p,!!o.rank),noTimer:false,
  render(d,ctx){if(d.win!=null)return `<div class="spd">${spdBoard(d)}</div>`;if(!ctx.my)return ctx.v>=0&&hasPicked(d,ctx.v)?waitCard(d,ctx):'';const st=spdState(d,ctx.v);
    if(st.phase==='ready')return readyCard(o.title,o.art,d);return o.view(d,ctx,st);},
  click(a,i,d,ctx){if(!ctx.my)return;const st=spdState(d,ctx.v);
    if(a==='start'){o.start(d,st);render();return;}
    o.click(a,i,d,ctx,st);},
  after:o.after,q:o.q,num:o.num,s:o.s};}

/* ---------- reaction ---------- */
GAMES.react=spdBase({name:'أسرع ضغطة',lbc:'#C0392B',icon:iconE('#E74C3C','⚡'),title:'لما يصير المربع أخضر اضغط بأسرع ما يمكن',rank:true,
  // people press in about 0.25 to 0.4 s; an easy bot is slower and jumps the gun now and then
  bot:(d,s,lv)=>{const R=[0,[360,620],[280,430],[215,310]][lv];return {ok:Math.random()>[0,.1,.05,.015][lv],ms:R[0]+rnd(R[1]-R[0])};},
  start(d,st){st.phase='wait';const wait=1500+Math.random()*2500;st.timer=setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},wait);},
  view(d,ctx,st){if(st.phase==='wait')return '<button class="rpad wait" id="rpw" data-ga="tap"><span class="rp-i">✋</span>انتظر…<small>لا تضغط قبل الأخضر</small></button>';if(st.phase==='go')return '<button class="rpad go" id="rpg" data-ga="tap"><span class="rp-i">⚡</span>اضغط!</button>';return waitCard(d,ctx);},
  click(a,i,d,ctx,st){if(a!=='tap')return;if(st.phase==='wait'){clearTimeout(st.timer);st.t0=performance.now();toast('بدري! ضغطت قبل الأخضر');spdSubmit(d,ctx,false);return;}if(st.phase==='go')spdSubmit(d,ctx,true);}});

/* ---------- remember the number ---------- */
const nmShow=d=>2200+d.rd*350;
GAMES.nmem=spdBase({name:'تذكّر الرقم',lbc:'#2C6E8F',icon:iconE('#3A8DB8','🧠'),title:'يطلع لك رقم لثواني، احفظه واكتبه',rank:true,
  // longer numbers are harder to keep and slower to type
  bot:(d,s,lv)=>{const n=4+d.rd;return {ok:Math.random()<[0,.9-.12*d.rd,.96-.07*d.rd,.99-.03*d.rd][lv],ms:n*[0,620,460,330][lv]+600+rnd(900)};},
  num(d){const R=srng(d,'nm'+d.rd);let s='';for(let k=0;k<4+d.rd;k++)s+=Math.floor(R()*10);return s;},
  start(d,st){st.phase='show';setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},nmShow(d));},
  view(d,ctx,st){if(st.phase==='show')return `<div class="spd"><div class="spdt">احفظ الرقم</div><div class="nmnum">${[...GAMES.nmem.num(d)].map((c,k)=>`<i style="--k:${k}">${c}</i>`).join('')}</div>${drainBar(nmShow(d))}</div>`;
    const n=GAMES.nmem.num(d).length;
    return `<div class="spd"><div class="spdt">وش كان الرقم؟</div><p class="note">${n} أرقام</p><input class="code" inputmode="numeric" data-draft="nm" value="${escH(S.draft.nm||'')}" autocomplete="off" style="letter-spacing:4px" placeholder="${'•'.repeat(n)}"><button class="btn red wide" data-ga="go">أرسل</button></div>`;},
  click(a,i,d,ctx,st){if(a!=='go'||st.phase!=='go')return;const v=String(S.draft.nm||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[,٬\s]/g,'');delete S.draft.nm;spdSubmit(d,ctx,v===GAMES.nmem.num(d));}});

/* ---------- count the shapes ---------- */
const CNTE=['🍎','🍋','⭐','🐟','🎈','🌙'];
GAMES.cnt=spdBase({name:'عدّ الأشكال',lbc:'#7D5BA6',icon:iconE('#9B7BC7','🔍'),title:'تطلع أشكال لثواني، وبعدها نسألك كم واحد منها',rank:true,
  bot:(d,s,lv)=>({ok:Math.random()<[0,.55,.72,.9][lv]-d.rd*.03,ms:[0,2300,1600,1050][lv]+rnd([0,2200,1500,900][lv])}),
  q(d){const R=srng(d,'ct'+d.rd);const n=16+d.rd*4;const a=[];for(let k=0;k<n;k++)a.push(Math.floor(R()*4));const t=Math.floor(R()*4);const c=a.filter(x=>x===t).length;
    const off=[0,1,-1,2].map(x=>c+x).filter(x=>x>=0);while(off.length<4)off.push(c+off.length);const o=withOptions(R,String(c),off.slice(1,4).map(String));return {arr:a,t,c,...o,em:CNTE.slice(0,4).map((e,k)=>CNTE[(k+d.rd)%6])};},
  start(d,st){st.phase='show';setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},2600);},
  view(d,ctx,st){const Q=GAMES.cnt.q(d);if(st.phase==='show')return `<div class="spd"><div class="cgrid">${Q.arr.map((x,k)=>`<span style="--k:${k%9}">${Q.em[x]}</span>`).join('')}</div>${drainBar(2600)}</div>`;
    return `<div class="spd"><div class="qbox cnt-q">كم <span class="cnt-e">${Q.em[Q.t]}</span> كان فيه؟</div><div class="opts g2 qz-opts">${Q.o.map((t,k)=>qzOpt(t,k,'','')).join('')}</div></div>`;},
  click(a,k,d,ctx,st){if(a==='m'&&st.phase==='go')spdSubmit(d,ctx,k===GAMES.cnt.q(d).a);}});

/* ---------- odd colour ---------- */
GAMES.oddc=spdBase({name:'اللون المختلف',lbc:'#16816D',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1E9E86"/>${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${12+c*27}" y="${12+r*27}" width="23" height="23" rx="5" fill="${r===1&&c===2?'#5fd0bb':'#47c4ad'}"/>`).join('')).join('')}</svg>`,title:'لوح ألوان، فيه مربع لونه يختلف شوي. لقه بأسرع وقت',rank:true,
  // the board grows and the colours get closer every round
  bot:(d,s,lv)=>({ok:Math.random()<[0,.86,.93,.98][lv]-d.rd*.02,ms:[0,2100,1500,950][lv]+d.rd*[0,350,250,150][lv]+rnd([0,2000,1300,700][lv])}),
  q(d){const R=srng(d,'oc'+d.rd);const z=4+Math.min(d.rd,2);const h=Math.floor(R()*360),l=50;const dl=Math.max(5,16-d.rd*3);return {z,odd:Math.floor(R()*z*z),c:`hsl(${h} 65% ${l}%)`,o:`hsl(${h} 65% ${l+dl}%)`};},
  start(d,st){st.phase='go';st.t0=performance.now();},
  view(d,ctx,st){const Q=GAMES.oddc.q(d);return `<div class="spd"><div class="spdt oc-t">وين المربع المختلف؟</div><div class="cellgrid ocg" style="grid-template-columns:repeat(${Q.z},minmax(0,1fr))">${Array(Q.z*Q.z).fill(0).map((_,i)=>`<button class="cg" style="background:${i===Q.odd?Q.o:Q.c};--k:${(i%Q.z)+Math.floor(i/Q.z)}" data-ga="m" data-i="${i}"></button>`).join('')}</div></div>`;},
  click(a,i,d,ctx,st){if(a==='m'&&st.phase==='go')spdSubmit(d,ctx,i===GAMES.oddc.q(d).odd);}});

/* ---------- quick sudoku: five puzzles that grow from an easy 4×4 to a hard 6×6, each with one solution ---------- */
// size, box (rows × columns) and empty cells of each round
const SUL=[{n:4,br:2,bc:2,h:6,lv:'سهل'},{n:4,br:2,bc:2,h:10,lv:'متوسط'},{n:6,br:2,bc:3,h:14,lv:'متوسط'},{n:6,br:2,bc:3,h:18,lv:'صعب'},{n:6,br:2,bc:3,h:22,lv:'صعب جدًا'}];
const suL=rd=>SUL[Math.max(0,Math.min(rd,SUL.length-1))];
// the cells that share a row, column or box with each cell (per size)
const SUP={};
function suPeerList(L){const k=L.n+'x'+L.br;if(SUP[k])return SUP[k];const n=L.n,N=n*n,box=i=>Math.floor(Math.floor(i/n)/L.br)*(n/L.bc)+Math.floor(i%n/L.bc);
  return SUP[k]=[...Array(N).keys()].map(i=>[...Array(N).keys()].filter(j=>j!==i&&(Math.floor(j/n)===Math.floor(i/n)||j%n===i%n||box(j)===box(i))));}
// how many ways a board can be finished (stops at 2)
function suCount(L,b,P){let i=-1,best=99;for(let k=0;k<b.length;k++)if(!b[k]){let c=0;for(let v=1;v<=L.n;v++)if(!P[k].some(j=>b[j]===v))c++;if(c<best){best=c;i=k;if(c<2)break;}}
  if(i<0)return 1;let c=0;for(let v=1;v<=L.n&&c<2;v++){if(P[i].some(j=>b[j]===v))continue;b[i]=v;c+=suCount(L,b,P);b[i]=0;}return c;}
// a puzzle drawn from the game's seed: a shuffled full board, then cells emptied one by one while the solution stays the only one
const SUC={};
function sudoP(d,rd){rd=rd==null?d.rd:rd;const key=d.gid+':'+rd;if(SUC[key])return SUC[key];const L=suL(rd),n=L.n,R=srng(d,'su'+rd),P=suPeerList(L);
  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const dig=sh([...Array(n).keys()].map(x=>x+1));
  const rows=sh([...Array(n/L.br).keys()]).flatMap(b=>sh([...Array(L.br).keys()]).map(r=>b*L.br+r)),cols=sh([...Array(n/L.bc).keys()]).flatMap(b=>sh([...Array(L.bc).keys()]).map(c=>b*L.bc+c));
  const base=(r,c)=>((r%L.br)*L.bc+Math.floor(r/L.br)+c)%n;
  const sol=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)sol.push(dig[base(rows[r],cols[c])]);
  const b=sol.slice(),holes=[];for(const i of sh([...Array(n*n).keys()])){if(holes.length>=L.h)break;const v=b[i];b[i]=0;if(suCount(L,b.slice(),P)===1)holes.push(i);else b[i]=v;}
  const keys=Object.keys(SUC);if(keys.length>12)delete SUC[keys[0]];
  return SUC[key]={L,sol,holes};}
// every row, column and box holds 1 to n once
const sudoOk=(L,b)=>{const P=suPeerList(L);return b.every((x,i)=>x>=1&&x<=L.n&&!P[i].some(j=>b[j]===x));};
const suPeers=(L,i,j)=>suPeerList(L)[i].includes(j);
function suBad(L,b){const P=suPeerList(L),bad=new Set();b.forEach((x,i)=>{if(x&&P[i].some(j=>b[j]===x))bad.add(i);});return bad;}
GAMES.sudo=spdBase({name:'سودوكو سريع',lbc:'#34495E',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4A6582"/><rect x="14" y="14" width="72" height="72" rx="6" fill="#fff"/><path d="M50 14V86M14 50H86" stroke="#2D4763" stroke-width="3"/><path d="M32 14V86M68 14V86M14 32H86M14 68H86" stroke="#c9d6e4" stroke-width="1.5"/><text x="23" y="29" font-size="13" font-weight="800" fill="#2D4763" text-anchor="middle">1</text><text x="59" y="47" font-size="13" font-weight="800" fill="#EC6158" text-anchor="middle">4</text><text x="41" y="83" font-size="13" font-weight="800" fill="#2D4763" text-anchor="middle">3</text></svg>`,title:'كمّل اللوحة: كل صف وعمود ومربع فيه كل رقم مرة وحدة. تبدأ 4×4 سهلة وتكبر لين 6×6 صعبة',
  rank:true,
  // a bot needs a few seconds for each empty cell, more on bigger boards
  bot:(d,s,lv)=>{const P=sudoP(d);return {ok:Math.random()<[0,.78,.9,.97][lv],ms:P.holes.length*[0,2900,2000,1350][lv]*(P.L.n===6?1.25:1)+rnd(2500)};},
  start(d,st){st.phase='go';st.t0=performance.now();st.v={};st.cur=null;},
  view(d,ctx,st){const P=sudoP(d),L=P.L,n=L.n;const b=P.sol.map((x,i)=>P.holes.includes(i)?+(st.v[i]||0):x);const bad=suBad(L,b);const cv=st.cur!=null?b[st.cur]:0;const left=P.holes.filter(i=>!st.v[i]).length;
    const edge=i=>{const r=Math.floor(i/n),c=i%n;return (c%L.bc===L.bc-1&&c<n-1?' er':'')+(r%L.br===L.br-1&&r<n-1?' eb':'');};
    const cls=i=>[st.cur===i?'cur':'',st.cur!=null&&suPeers(L,i,st.cur)?'peer':'',cv&&b[i]===cv&&i!==st.cur?'same':'',bad.has(i)?'bad':''].join(' ')+(n===6?edge(i):'');
    return `<div class="su-lv"><span>${n}×${n}</span><b>${L.lv}</b></div><div class="sudo ${n===6?'s6':''}" id="su${d.rd}">${P.sol.map((x,i)=>P.holes.includes(i)?`<button class="su ${cls(i)}" data-ga="c" data-i="${i}">${st.v[i]||''}</button>`:`<div class="su fixed ${cls(i)}">${x}</div>`).join('')}</div>
    <p class="note su-n">${left?`باقي ${left} ${left>2&&left<11?'خانات':'خانة'}`:bad.size?'فيه رقم مكرر، صلّحه':'تمام! اضغط خلصت'}</p>
    <div class="acts supad ${n===6?'s6':''}">${[...Array(n).keys()].map(k=>`<button class="btn navy" data-ga="n" data-i="${k+1}">${k+1}</button>`).join('')}</div><button class="btn red wide" data-ga="go" ${P.holes.every(i=>st.v[i])?'':'disabled'}>خلصت</button>`;},
  click(a,i,d,ctx,st){if(st.phase!=='go')return;const P=sudoP(d);
    if(a==='c'){if(!P.holes.includes(i))return;st.cur=i;render();return;}if(a==='n'&&st.cur!=null&&i>=1&&i<=P.L.n){st.v[st.cur]=i;const nx=P.holes.find(h=>!st.v[h]);st.cur=nx??st.cur;render();return;}
    if(a==='go'&&P.holes.every(h=>st.v[h]))spdSubmit(d,ctx,sudoOk(P.L,P.sol.map((x,k)=>P.holes.includes(k)?+st.v[k]:x)));}});

/* ---------- typing race ---------- */
// sentences by length: the first rounds are short, the last ones long (proverbs and sayings, written as they are known)
const SENT=[
['العلم نور','الوقت من ذهب','الصبر مفتاح الفرج','الجار قبل الدار','الصديق وقت الضيق','في التأني السلامة','العقل زينة','لكل مجتهد نصيب','الجزاء من جنس العمل','خير الأمور أوسطها','الكلمة الطيبة صدقة','رب أخ لم تلده أمك','القناعة كنز لا يفنى','العلم في الصغر كالنقش على الحجر','من سار على الدرب وصل','الحاجة أم الاختراع','اتق شر الحليم إذا غضب','لكل مقام مقال','الوحدة خير من جليس السوء','درهم وقاية خير من قنطار علاج'],
['من جد وجد ومن زرع حصد','خير الكلام ما قل ودل','عامل الناس كما تحب أن يعاملوك','إذا كان الكلام من فضة فالسكوت من ذهب','لا تؤجل عمل اليوم إلى الغد','من حفر حفرة لأخيه وقع فيها','على قدر أهل العزم تأتي العزائم','اليد الواحدة لا تصفق','ما كل ما يتمنى المرء يدركه','خير جليس في الزمان كتاب','تجري الرياح بما لا تشتهي السفن','من طلب العلا سهر الليالي','أول الغيث قطرة','لا تؤخر الشكر إلى الغد','العقل السليم في الجسم السليم','لا تحقرن من المعروف شيئا','الطيور على أشكالها تقع','إن غدا لناظره قريب','من عاشر القوم أربعين يوما صار منهم','كل إناء بما فيه ينضح'],
['اطلبوا العلم من المهد إلى اللحد','إذا هبت رياحك فاغتنمها فإن لكل خافقة سكون','ليس الفتى من يقول كان أبي إن الفتى من يقول ها أنا ذا','أعز مكان في الدنى سرج سابح وخير جليس في الزمان كتاب','الوقت كالسيف إن لم تقطعه قطعك','إذا أنت أكرمت الكريم ملكته وإن أنت أكرمت اللئيم تمردا','من لم يذق مر التعلم ساعة تجرع ذل الجهل طول حياته','كن جميلا ترى الوجود جميلا','وما نيل المطالب بالتمني ولكن تؤخذ الدنيا غلابا','ومن يتهيب صعود الجبال يعش أبد الدهر بين الحفر','لا يلدغ المؤمن من جحر واحد مرتين','قيمة كل امرئ ما يحسنه','العاقل من اتعظ بغيره']];
const tyLv=rd=>rd<2?0:rd<4?1:2;
// the sentence split into what is typed right, the first wrong letter and what is left (letters compared like normAr does)
const tyN=c=>({'أ':'ا','إ':'ا','آ':'ا','ى':'ي','ة':'ه'}[c]||c);
function tyHTML(s,v){const a=[...s],b=[...String(v||'')];let k=0;while(k<a.length&&k<b.length&&tyN(a[k])===tyN(b[k]))k++;const err=k<b.length&&k<a.length;
  return `<span class="ty-ok">${escH(a.slice(0,k).join(''))}</span><span class="ty-bad">${escH(err?a[k]:'')}</span><span class="ty-rest">${escH(a.slice(k+(err?1:0)).join(''))}</span>`;}
const tyPct=(s,v)=>{const a=[...s],b=[...String(v||'')];let k=0;while(k<a.length&&k<b.length&&tyN(a[k])===tyN(b[k]))k++;return Math.round(k/a.length*100);};
GAMES.typing=spdBase({name:'أسرع كتابة',lbc:'#8E44AD',icon:iconE('#A55CC4','⌨️'),title:'تطلع جملة، اكتبها بالضبط بأسرع وقت',
  rank:true,
  // a sentence a round, from the list of its length; none repeats in one game
  s(d,rd){rd=rd==null?d.rd:rd;const L=SENT[tyLv(rd)],R=srng(d,'ty'+tyLv(rd));const o=[...L.keys()];for(let i=o.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[o[i],o[j]]=[o[j],o[i]];}return L[o[rd-[0,2,4][tyLv(rd)]]%L.length];},
  // a bot types two to four letters a second, faster on harder levels
  bot:(d,s,lv)=>{const n=[...GAMES.typing.s(d)].length;return {ok:Math.random()<[0,.8,.9,.97][lv],ms:Math.round(n/[0,1.9,2.7,3.8][lv]*1000)+700+rnd(1500)};},
  start(d,st){st.phase='go';st.t0=performance.now();},
  view(d,ctx,st){const s=GAMES.typing.s(d),v=S.draft.ty||'';return `<div class="qbox tybox"><div class="ty-s">${tyHTML(s,v)}</div><div class="ty-pr"><i style="width:${tyPct(s,v)}%"></i></div></div><input class="field" data-draft="ty" value="${escH(v)}" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="اكتب هنا…"><button class="btn red wide" data-ga="go">أرسل</button>`;},
  click(a,i,d,ctx,st){if(a!=='go'||st.phase!=='go')return;const v=normAr(S.draft.ty||'');delete S.draft.ty;spdSubmit(d,ctx,v===normAr(GAMES.typing.s(d)));}});
// live colouring while typing (typing does not redraw the screen)
document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.draft!=='ty'||S.st.g!=='typing'||!S.st.d)return;const b=document.querySelector('.tybox');if(!b)return;
  const s=GAMES.typing.s(S.st.d);const x=b.querySelector('.ty-s'),p=b.querySelector('.ty-pr i');if(x)x.innerHTML=tyHTML(s,t.value);if(p)p.style.width=tyPct(s,t.value)+'%';});
/* ---------- more quiz packs (their questions are in quiz.js) ---------- */
GAMES.islam=bankQuiz({name:'معلومات إسلامية',lbc:'#1F7A55',icon:iconE('#2E9C6E','🕌')},['islam']);
GAMES.sci=bankQuiz({name:'علوم وطبيعة',lbc:'#2C7DA0',icon:iconE('#3D97C0','🔬')},['sci']);
GAMES.geo=bankQuiz({name:'جغرافيا',lbc:'#B9770E',icon:iconE('#D68910','🗺️')},['geo']);

/* ---------- ten thousand (dice push your luck) ---------- */
function fkScore(a){if(!a.length)return 0;const c=[0,0,0,0,0,0,0];a.forEach(x=>c[x]++);
  if(a.length===6&&c.slice(1).every(x=>x===1))return 1500;if(a.length===6&&c.filter(x=>x===2).length===3)return 750;
  let s=0;for(let f=1;f<=6;f++){const n=c[f];if(!n)continue;if(n>=3){s+=(f===1?1000:f*100)*Math.pow(2,n-3);}else if(f===1)s+=100*n;else if(f===5)s+=50*n;else return 0;}return s;}
const fkAny=a=>{const c=[0,0,0,0,0,0,0];a.forEach(x=>c[x]++);return c[1]>0||c[5]>0||c.some(x=>x>=3)||(a.length===6&&(c.slice(1).every(x=>x===1)||c.filter(x=>x===2).length===3));};
// after someone reaches the goal, everyone else gets one last turn, then the highest wins
function fkPass(d,x,t){const n=d.pl.length,nx=nextSeat(x,t);let endAt=d.endAt;if(endAt==null&&x.sc&&x.sc[t]>=d.goal)endAt=t;
  let hit=false;if(endAt!=null)for(let s=(t+1)%n;;s=(s+1)%n){if(s===endAt){hit=true;break;}if(s===nx)break;}
  if(hit){const sc=x.sc||d.sc;return {...x,endAt,turn:nx,win:mostPts(sc.map((v,s)=>x.out[s]==='1'?-1:v)),last:(x.last||'')+' • انتهت الجولة الأخيرة'};}
  return {...x,endAt,turn:nx,last:(x.last||'')+(endAt!=null&&d.endAt==null?` • وصل الهدف! كل واحد باقي له دور أخير`:'')};}
GAMES.farkle={name:'عشرة آلاف',cat:'cards',lbc:'#7B241C',icon:iconE('#A93226','🎲'),
  init:n=>({dice:'',used:'000000',tot:0,sc:Array(n).fill(0),goal:10000,endAt:null,rolled:false,last:''}),
  points:d=>d.sc,
  onTimeout:d=>fkPass(d,{...d,dice:'',used:'000000',tot:0,rolled:false,lb:null},d.turn),
  onSkip(nd,d){if(nd.out[d.turn]!=='1')return nd;const x={...nd,dice:'',used:'000000',tot:0,rolled:false,lb:null,last:nm(d,d.turn)+' طلع'+(d.tot>0?' وراح جمع دوره':'')};return x.win!=null?x:fkPass(x,x,d.turn);},
  // the turn total and the goal are on the board
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const my=ctx.my;S.sel=S.sel||[];S.rolled=false;const sel=S.sel.map(i=>+d.dice[i]);const sv=fkScore(sel);
    // view only: the turn total and the goal bar, the dice on felt, the dice set aside in a tray, ghost dice before the first roll
    const t=d.turn,sc=d.sc[t]||0,g=d.goal,pc=x=>Math.max(0,Math.min(100,x/g*100));const bust=!d.rolled&&!!d.dice&&/ما يسجل/.test(d.last||'');
    // a fresh roll (also a bot's or another phone's) tumbles once: keyed by the game and the state number, so a redraw does not replay it
    const rk=d.gid+':'+S.st.s,fresh=!!d.dice&&(d.rolled||bust)&&S.fkRoll!==rk;if(fresh)S.fkRoll=rk;
    const held=d.dice?[...d.used].map((u,i)=>u==='1'?i:-1).filter(i=>i>=0):[];
    const row=d.dice?[...d.dice].map((x,i)=>d.used[i]==='1'?'':`<button class="dice ${d.rolled&&S.sel.includes(i)?'held':''} ${d.rolled||bust?'':'fk-stale'} ${fresh?'roll':''}" id="fkd${i}" data-ga="sel" data-i="${i}" ${my&&d.rolled?'':'disabled'}>${diceSVG(+x)}</button>`).join(''):Array(6).fill('<i class="fk-gh"></i>').join('');
    const lb=!d.dice&&Array.isArray(d.lb)&&d.lb[0]>=0&&d.lb[0]<d.pl.length?d.lb:null;
    let s=`<div class="fk" style="--c:${col(d,t)}">${lb?`<div class="fk-bk" id="fkb${d.bk||0}" style="--c:${col(d,lb[0])}"><span>💰 ${escH(nm(d,lb[0]))} حفظ</span><b dir="ltr">+${+lb[1]||0}</b><small dir="ltr">${d.sc[lb[0]]} / ${d.goal}</small></div>`:''}<div class="fk-sc"><div class="fk-tot"><small>جمع الدور</small><b>${d.tot}</b>${sv?`<em>+${sv}</em>`:''}</div>
      <div class="fk-goal"><div class="fk-gl"><span>${escH(nm(d,t))}</span><span dir="ltr"><b>${sc}</b> / ${g}</span></div><div class="fk-bar"><i style="width:${pc(sc)}%"></i><u style="width:${pc(Math.min(d.tot+sv,g-sc))}%"></u></div></div></div>
      <div class="fk-felt ${bust?'bust':''}">${bust?'<div class="fk-bust">💥 ما سجّل شي</div>':''}<div class="fk-row">${row}</div>
      ${held.length?`<div class="fk-held"><small>محجوزة</small>${held.map(i=>`<div class="dice used">${diceSVG(+d.dice[i])}</div>`).join('')}</div>`:''}</div>`;
    if(my){if(!d.rolled)s+=`<div class="acts"><button class="btn red" data-ga="roll">ارمِ ${6-[...d.used].filter(x=>x==='1').length||6} زهرات</button>${d.tot>0?`<button class="btn navy" data-ga="bank">احفظ ${d.tot}</button>`:''}</div>`;
      else s+=`<div class="acts"><button class="btn red" data-ga="keep" ${sv?'':'disabled'}>خذ ${sv||''} وارمِ الباقي</button><button class="btn navy" data-ga="keepbank" ${sv?'':'disabled'}>خذ واحفظ ${sv?d.tot+sv:''}</button></div>`;}
    else if(d.win==null)s+=`<p class="note fk-wait">${d.rolled?'يختار زهراته…':'ينتظر يرمي…'}</p>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const t=d.turn;S.sel=S.sel||[];
    if(a==='sel'){S.sel=S.sel.includes(i)?S.sel.filter(x=>x!==i):[...S.sel,i];render();return;}
    if(a==='roll'){let used=d.used;if(!used.includes('0'))used='000000';const dice=[...used].map((u,k)=>u==='1'?d.dice[k]:String(1+rnd(6))).join('');const free=[...dice].filter((x,k)=>used[k]==='0').map(Number);S.rolled=true;S.sel=[];
      if(!fkAny(free)){act(fkPass(d,{...d,dice,used:'000000',tot:0,rolled:false,last:`${nm(d,t)} طلع له زهر ما يسجل وراح جمع الدور 💥`},t));return;}
      act({...d,dice,used,rolled:true,last:''});return;}
    if(a==='bank'){if(d.tot<=0)return;const sc=[...d.sc];sc[t]+=d.tot;act(fkPass(d,{...d,sc,tot:0,dice:'',used:'000000',rolled:false,bk:(d.bk||0)+1,lb:[t,d.tot],last:`${nm(d,t)} حفظ ${d.tot}`},t));return;}
    if(a==='keep'||a==='keepbank'){const sv=fkScore(S.sel.map(k=>+d.dice[k]));if(!sv)return;let used=d.used;S.sel.forEach(k=>used=setAt(used,k,'1'));S.sel=[];const tot=d.tot+sv;
      if(a==='keepbank'){const sc=[...d.sc];sc[t]+=tot;act(fkPass(d,{...d,sc,tot:0,dice:'',used:'000000',rolled:false,bk:(d.bk||0)+1,lb:[t,tot],last:`${nm(d,t)} حفظ ${tot}`},t));return;}
      act({...d,used:used.includes('0')?used:'000000',tot,rolled:false,last:used.includes('0')?'':`${nm(d,t)} سجّل الستة كلها 🔥 يرمي الستة من جديد`});}
  }
};

/* ---------- ten thousand bots ----------
   hard plays the odds: a table, worked out once, of what a turn is worth on average from every turn total and number of dice
   (rolling on against banking, the best set of dice to keep from every roll); medium banks around 350; easy is timid or greedy at random */
const FKS=50,FKM=6000;let FKT=null;
function fkTable(){if(FKT)return FKT;const NT=FKM/FKS+1,fact=[1,1,2,6,24,120,720];
  // every roll of n dice as counts per face, its chance, and the ways to score from it: [points, dice used]
  const rolls=[null];for(let n=1;n<=6;n++){const L=[];
    const rec=(f,left,c)=>{if(f===6){c[6]=left;let p=fact[n];for(let k=1;k<=6;k++)p/=fact[c[k]];p/=Math.pow(6,n);
        const opts=new Map();const sub=(g,k)=>{if(g===7){const a=[];for(let x=1;x<=6;x++)for(let j=0;j<k[x];j++)a.push(x);if(!a.length)return;const sc=fkScore(a);if(sc>0){const u=a.length;if(!(opts.get(u)>=sc))opts.set(u,sc);}return;}
          for(let j=0;j<=c[g];j++){k[g]=j;sub(g+1,k);}};sub(1,[0,0,0,0,0,0,0]);
        L.push({p,o:[...opts].map(([u,sc])=>[sc,u])});return;}
      for(let j=0;j<=left;j++){c[f]=j;rec(f+1,left-j,c);}};
    rec(1,n,[0,0,0,0,0,0,0]);rolls.push(L);}
  // R[n][i]: the average a turn ends with from total i*50 when n dice are rolled now; B = the better of that and banking
  const R=[...Array(7)].map(()=>new Float64Array(NT)),B=[...Array(7)].map(()=>new Float64Array(NT));
  const bv=(t,n)=>{const i=t/FKS;return i>=NT?t:B[n][i];};
  for(let i=NT-1;i>=0;i--)for(let n=1;n<=6;n++){const t=i*FKS;let r=0;for(const x of rolls[n]){let best=0;for(const [sc,u] of x.o){const v=bv(t+sc,n-u||6);if(v>best)best=v;}r+=x.p*best;}R[n][i]=r;B[n][i]=Math.max(t,r);}
  return FKT={R,B,roll:(t,n)=>{const i=t/FKS;return i>=NT?t:R[n][i];}};}
// the sets of free dice that score, best first for the same number of dice used
function fkOpts(d){const free=[...d.dice].map((x,i)=>d.used[i]==='0'?i:-1).filter(i=>i>=0);const out=[];
  for(let m=1;m<(1<<free.length);m++){const sel=free.filter((_,j)=>m>>j&1);const sc=fkScore(sel.map(i=>+d.dice[i]));if(sc>0)out.push({sel,sc,left:free.length-sel.length});}
  return {free,out};}
GAMES.farkle.bot=(d,s,lv)=>{const me=d.sc[s]||0,foes=aliveSeats(d).filter(o=>!sameTeam(d,o,s)),top=Math.max(0,...foes.map(o=>d.sc[o]||0));
  // the last round: only a total above the leader is worth banking
  const need=d.endAt!=null?top-me+1:0;
  if(!d.rolled){if(d.tot<=0)return botDo(d,s,'roll',0);const n=6-[...d.used].filter(x=>x==='1').length||6;
    if(need>0&&d.tot<need)return botDo(d,s,'roll',0);if(me+d.tot>=d.goal)return botDo(d,s,'bank',0);
    if(lv===3)return botDo(d,s,fkTable().roll(d.tot,n)>d.tot+1?'roll':'bank',0);
    const hold=lv===2?(n<=2?300:n<=3?400:550):250+rnd(700);return botDo(d,s,d.tot>=hold?'bank':'roll',0);}
  const {out}=fkOpts(d);if(!out.length)return GAMES.farkle.onTimeout(d);
  const most=out.reduce((a,b)=>b.sc>a.sc||b.sc===a.sc&&b.left>a.left?b:a);let pick=most,bank=false;
  if(lv===3){const T=fkTable();let bestV=-1;
    for(const o of out){const t2=d.tot+o.sc,n2=o.left||6;let v=T.roll(t2,n2);
      if(need>0)v=t2>=need?Math.max(v,t2+1):v;else if(me+t2>=d.goal)v=Math.max(v,t2);
      if(v>bestV){bestV=v;pick=o;}}
    const t2=d.tot+most.sc,bankV=need>0?(t2>=need?t2+1:0):t2;
    if(bankV>=bestV){pick=most;bank=true;}}
  else{// medium takes every scoring die; easy sometimes keeps a single one to roll more dice
    if(lv===1&&Math.random()<.3){const one=out.filter(o=>o.sel.length===1).sort((a,b)=>b.sc-a.sc)[0];if(one)pick=one;}
    const t2=d.tot+pick.sc,n2=pick.left||6,hold=lv===2?(n2<=2?300:n2<=3?400:550):250+rnd(700);
    bank=pick.left>0&&(t2>=hold||need===0&&me+t2>=d.goal)&&!(need>0&&t2<need);}
  S.sel=pick.sel;return botDo(d,s,bank?'keepbank':'keep',0);};

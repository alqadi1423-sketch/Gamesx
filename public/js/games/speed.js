'use strict';
/* speed and memory challenges (everyone plays at once, time is measured on each phone) and more quiz packs and ten thousand dice */

/* ---------- shared: timed challenge rounds ---------- */
const SPD_ROUNDS=5;
function spdKey(d,v){return d.gid+':'+d.rd+':'+v;}
function spdState(d,v){const k=spdKey(d,v);if(!S.sp||S.sp.key!==k)S.sp={key:k,phase:'ready'};return S.sp;}
function spdResolve(d,picks){
  const pts=[...d.pts];const ok=picks.map((p,s)=>p&&p.ok?{s,ms:p.ms}:null).filter(Boolean).sort((a,b)=>a.ms-b.ms);
  let w=-1;if(ok.length&&(ok.length===1||ok[0].ms<ok[1].ms)){w=ok[0].s;pts[w]++;}
  const fmt=p=>!p?'—':p.ok?(p.ms/1000).toFixed(2)+' ث':'✗';
  const res=d.pl.map((r,s)=>picks[s]===null&&d.out[s]==='1'?'':`${nm(d,s)} ${fmt(picks[s])}`).filter(Boolean).join('، ')+(w>=0?`. الأسرع: ${nm(d,w)}`:'. محد فاز بالجولة');
  const rd=d.rd+1;return {...d,pts,rd,res,win:rd>=SPD_ROUNDS?mostPts(pts):null};
}
const spdSubmit=(d,ctx,ok)=>{const st=spdState(d,ctx.v);const ms=Math.round(performance.now()-st.t0);S.sp={...st,phase:'sent'};simulPick(d,ctx.v,{ok:!!ok,ms});};
// last round read back from d.res ("name 1.23 ث، name ✗. الأسرع: name"): a row per seat, fastest first
function spdRows(d){if(!d||!d.res)return null;const body=d.res.replace(/\. (الأسرع: .*|محد فاز بالجولة)$/,'');const es=body.split('، ');const rows=[];
  for(const s of seatsOf(d)){const n=nm(d,s)+' ';const e=es.find(x=>x.startsWith(n));if(!e)continue;const m=/^(?:(\d+(?:\.\d+)?) ث|(✗)|(—))$/.exec(e.slice(n.length));if(!m)continue;rows.push({s,t:m[1]?+m[1]:null,bad:!!m[2]});}
  if(!rows.length)return null;const w=/الأسرع: (.+)$/.exec(d.res);const ws=w?seatsOf(d).find(s=>nm(d,s)===w[1]):null;
  rows.sort((a,b)=>(a.t==null)-(b.t==null)||(a.t??0)-(b.t??0)||a.bad-b.bad);return {rows,w:ws??null};}
function spdBoard(d){const R=spdRows(d);if(!R)return '';const mx=Math.max(...R.rows.map(r=>r.t||0))||1;
  return `<div class="spr" id="spr${d.rd}"><div class="spr-h">نتيجة الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${R.rows.map((r,j)=>`<div class="spr-r ${r.s===R.w?'w':''} ${r.t==null?'nt':''}" style="--c:${col(d,r.s)};--j:${j}"><i class="spr-m">${r.s===R.w?'⚡':r.t==null?'':j+1}</i><b>${escH(nm(d,r.s))}</b><span class="spr-bar">${r.t!=null?`<i style="width:${Math.max(8,Math.round(r.t/mx*100))}%"></i>`:''}</span><em>${r.t!=null?r.t.toFixed(2)+' ث':r.bad?'✗ غلط':'—'}</em></div>`).join('')}</div>`;}
// the start button comes first, so it stays on screen with eight players; last round's times sit under it
const readyCard=(title,art,d)=>`<div class="spd spd-ready"><div class="spd-card">${art||`<div class="rdyi">${(GAMES[S.st.g]||{}).icon||''}</div>`}<div class="spdt">${title}</div>${d?`<span class="spd-rd">جولة ${Math.min(d.rd+1,SPD_ROUNDS)} من ${SPD_ROUNDS}</span>`:''}<button class="btn red wide spd-go" data-ga="start">جاهز، ابدأ</button></div>${d?spdBoard(d):''}</div>`;
// sent: this phone's own result for the round, and who we still wait for
const waitCard=(d,ctx)=>{let me='',bad=false;if(d&&ctx&&ctx.v!=null&&ctx.v>=0){const p=seatPick(d,ctx,ctx.v,d.rd);if(p&&typeof p==='object'){bad=!p.ok;me=p.ok?`<div class="spd-me">وقتك <b>${(p.ms/1000).toFixed(2)}</b> ث</div>`:'<div class="spd-me no">ما ضبطت هالمرة</div>';}}
  return `<div class="spd spd-sent"><div class="spd-ck ${bad?'no':''}">${bad?'✗':'✓'}</div><div class="spdt">أرسلت</div>${me}<p class="note">ننتظر الباقين</p>${d?qzWho(d,ctx):''}</div>`;};
// a bar that empties while something is on screen for ms
const drainBar=ms=>`<div class="spbar"><i style="animation-duration:${ms}ms"></i></div>`;
function spdBase(o){return {name:o.name,cat:'quiz',lbc:o.lbc,icon:o.icon,
  // a bot answers right more often and faster on harder levels
  botPick(d,s,lv){const fast=o.name==='أسرع ضغطة'||o.name==='مبارزة السيوف';const R=fast?[0,[520,880],[360,560],[250,380]][lv]:[0,[5200,9000],[3200,5600],[2000,3600]][lv];
    return {ok:Math.random()<[0,.6,.8,.95][lv],ms:R[0]+rnd(R[1]-R[0])};},
  init:n=>({rd:0,pts:Array(n).fill(0),res:''}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,SPD_ROUNDS)} من ${SPD_ROUNDS}</small><br>`,true),
  winExtra:d=>d.res,resolve:spdResolve,noTimer:false,
  render(d,ctx){if(d.win!=null)return `<div class="spd">${spdBoard(d)}</div>`;if(!ctx.my)return ctx.v>=0&&hasPicked(d,ctx.v)?waitCard(d,ctx):'';const st=spdState(d,ctx.v);
    if(st.phase==='ready')return readyCard(o.title,o.art,d);return o.view(d,ctx,st);},
  click(a,i,d,ctx){if(!ctx.my)return;const st=spdState(d,ctx.v);
    if(a==='start'){o.start(d,st);render();return;}
    o.click(a,i,d,ctx,st);},
  after:o.after,q:o.q,num:o.num,s:o.s};}

/* ---------- reaction ---------- */
GAMES.react=spdBase({name:'أسرع ضغطة',lbc:'#C0392B',icon:iconE('#E74C3C','⚡'),title:'لما يصير المربع أخضر اضغط بأسرع ما يمكن',
  start(d,st){st.phase='wait';const wait=1500+Math.random()*2500;st.timer=setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},wait);},
  view(d,ctx,st){if(st.phase==='wait')return '<button class="rpad wait" id="rpw" data-ga="tap"><span class="rp-i">✋</span>انتظر…<small>لا تضغط قبل الأخضر</small></button>';if(st.phase==='go')return '<button class="rpad go" id="rpg" data-ga="tap"><span class="rp-i">⚡</span>اضغط!</button>';return waitCard(d,ctx);},
  click(a,i,d,ctx,st){if(a!=='tap')return;if(st.phase==='wait'){clearTimeout(st.timer);st.t0=performance.now();toast('بدري! ضغطت قبل الأخضر');spdSubmit(d,ctx,false);return;}if(st.phase==='go')spdSubmit(d,ctx,true);}});

/* ---------- remember the number ---------- */
const nmShow=d=>2200+d.rd*350;
GAMES.nmem=spdBase({name:'تذكّر الرقم',lbc:'#2C6E8F',icon:iconE('#3A8DB8','🧠'),title:'يطلع لك رقم لثواني، احفظه واكتبه',
  num(d){const R=srng(d,'nm'+d.rd);let s='';for(let k=0;k<4+d.rd;k++)s+=Math.floor(R()*10);return s;},
  start(d,st){st.phase='show';setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},nmShow(d));},
  view(d,ctx,st){if(st.phase==='show')return `<div class="spd"><div class="spdt">احفظ الرقم</div><div class="nmnum">${[...GAMES.nmem.num(d)].map((c,k)=>`<i style="--k:${k}">${c}</i>`).join('')}</div>${drainBar(nmShow(d))}</div>`;
    const n=GAMES.nmem.num(d).length;
    return `<div class="spd"><div class="spdt">وش كان الرقم؟</div><p class="note">${n} أرقام</p><input class="code" inputmode="numeric" data-draft="nm" value="${escH(S.draft.nm||'')}" autocomplete="off" style="letter-spacing:4px" placeholder="${'•'.repeat(n)}"><button class="btn red wide" data-ga="go">أرسل</button></div>`;},
  click(a,i,d,ctx,st){if(a!=='go'||st.phase!=='go')return;const v=String(S.draft.nm||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[,٬\s]/g,'');delete S.draft.nm;spdSubmit(d,ctx,v===GAMES.nmem.num(d));}});

/* ---------- count the shapes ---------- */
const CNTE=['🍎','🍋','⭐','🐟','🎈','🌙'];
GAMES.cnt=spdBase({name:'عدّ الأشكال',lbc:'#7D5BA6',icon:iconE('#9B7BC7','🔍'),title:'تطلع أشكال لثواني، وبعدها نسألك كم واحد منها',
  q(d){const R=srng(d,'ct'+d.rd);const n=16+d.rd*4;const a=[];for(let k=0;k<n;k++)a.push(Math.floor(R()*4));const t=Math.floor(R()*4);const c=a.filter(x=>x===t).length;
    const off=[0,1,-1,2].map(x=>c+x).filter(x=>x>=0);while(off.length<4)off.push(c+off.length);const o=withOptions(R,String(c),off.slice(1,4).map(String));return {arr:a,t,c,...o,em:CNTE.slice(0,4).map((e,k)=>CNTE[(k+d.rd)%6])};},
  start(d,st){st.phase='show';setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},2600);},
  view(d,ctx,st){const Q=GAMES.cnt.q(d);if(st.phase==='show')return `<div class="spd"><div class="cgrid">${Q.arr.map((x,k)=>`<span style="--k:${k%9}">${Q.em[x]}</span>`).join('')}</div>${drainBar(2600)}</div>`;
    return `<div class="spd"><div class="qbox cnt-q">كم <span class="cnt-e">${Q.em[Q.t]}</span> كان فيه؟</div><div class="opts g2 qz-opts">${Q.o.map((t,k)=>qzOpt(t,k,'','')).join('')}</div></div>`;},
  click(a,k,d,ctx,st){if(a==='m'&&st.phase==='go')spdSubmit(d,ctx,k===GAMES.cnt.q(d).a);}});

/* ---------- odd colour ---------- */
GAMES.oddc=spdBase({name:'اللون المختلف',lbc:'#16816D',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1E9E86"/>${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${12+c*27}" y="${12+r*27}" width="23" height="23" rx="5" fill="${r===1&&c===2?'#5fd0bb':'#47c4ad'}"/>`).join('')).join('')}</svg>`,title:'لوح ألوان، فيه مربع لونه يختلف شوي. لقه بأسرع وقت',
  q(d){const R=srng(d,'oc'+d.rd);const z=4+Math.min(d.rd,2);const h=Math.floor(R()*360),l=50;const dl=Math.max(5,16-d.rd*3);return {z,odd:Math.floor(R()*z*z),c:`hsl(${h} 65% ${l}%)`,o:`hsl(${h} 65% ${l+dl}%)`};},
  start(d,st){st.phase='go';st.t0=performance.now();},
  view(d,ctx,st){const Q=GAMES.oddc.q(d);return `<div class="spd"><div class="spdt oc-t">وين المربع المختلف؟</div><div class="cellgrid ocg" style="grid-template-columns:repeat(${Q.z},minmax(0,1fr))">${Array(Q.z*Q.z).fill(0).map((_,i)=>`<button class="cg" style="background:${i===Q.odd?Q.o:Q.c};--k:${(i%Q.z)+Math.floor(i/Q.z)}" data-ga="m" data-i="${i}"></button>`).join('')}</div></div>`;},
  click(a,i,d,ctx,st){if(a==='m'&&st.phase==='go')spdSubmit(d,ctx,i===GAMES.oddc.q(d).odd);}});

/* ---------- quick sudoku ---------- */
function sudo4(d){const R=srng(d,'su'+d.rd);let g=[[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]];
  const p=[1,2,3,4];for(let i=3;i>0;i--){const j=Math.floor(R()*(i+1));[p[i],p[j]]=[p[j],p[i]];}g=g.map(r=>r.map(x=>p[x-1]));
  if(R()<.5)g=[g[1],g[0],g[2],g[3]];if(R()<.5)g=g.map(r=>[r[1],r[0],r[2],r[3]]);if(R()<.5)g=[g[2],g[3],g[0],g[1]];
  const sol=g.flat();const holes=new Set();while(holes.size<7+Math.min(d.rd,3))holes.add(Math.floor(R()*16));return {sol,holes:[...holes]};}
// every row, column and 2x2 box holds 1 to 4 once (a puzzle can have more than one right answer)
const sudoOk=b=>[0,1,2,3].every(k=>[[0,1,2,3].map(j=>b[k*4+j]),[0,4,8,12].map(j=>b[k+j]),[0,1,4,5].map(j=>b[(k>>1)*8+(k&1)*2+j])].every(g=>g.every(x=>x>=1&&x<=4)&&new Set(g).size===4));
// view helpers: the row, column and box of a cell, and the cells whose number repeats in one of them
const suPeers=(i,j)=>i!==j&&((i>>2)===(j>>2)||(i&3)===(j&3)||(((i>>3)<<1)|((i&3)>>1))===(((j>>3)<<1)|((j&3)>>1)));
function suBad(b){const bad=new Set();for(let i=0;i<16;i++)if(b[i])for(let j=0;j<16;j++)if(b[j]===b[i]&&suPeers(i,j))bad.add(i);return bad;}
GAMES.sudo=spdBase({name:'سودوكو سريع',lbc:'#34495E',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4A6582"/><rect x="14" y="14" width="72" height="72" rx="6" fill="#fff"/><path d="M50 14V86M14 50H86" stroke="#2D4763" stroke-width="3"/><path d="M32 14V86M68 14V86M14 32H86M14 68H86" stroke="#c9d6e4" stroke-width="1.5"/><text x="23" y="29" font-size="13" font-weight="800" fill="#2D4763" text-anchor="middle">1</text><text x="59" y="47" font-size="13" font-weight="800" fill="#EC6158" text-anchor="middle">4</text><text x="41" y="83" font-size="13" font-weight="800" fill="#2D4763" text-anchor="middle">3</text></svg>`,title:'كمّل لوحة 4×4: كل صف وعمود ومربع فيه 1 إلى 4 بدون تكرار',
  start(d,st){st.phase='go';st.t0=performance.now();st.v={};st.cur=null;},
  view(d,ctx,st){const P=sudo4(d);const b=P.sol.map((x,i)=>P.holes.includes(i)?+(st.v[i]||0):x);const bad=suBad(b);const cv=st.cur!=null?b[st.cur]:0;const left=P.holes.filter(i=>!st.v[i]).length;
    const cls=i=>[st.cur===i?'cur':'',st.cur!=null&&suPeers(i,st.cur)?'peer':'',cv&&b[i]===cv&&i!==st.cur?'same':'',bad.has(i)?'bad':''].join(' ');
    return `<div class="sudo">${P.sol.map((x,i)=>P.holes.includes(i)?`<button class="su ${cls(i)}" data-ga="c" data-i="${i}">${st.v[i]||''}</button>`:`<div class="su fixed ${cls(i)}">${x}</div>`).join('')}</div>
    <p class="note su-n">${left?`باقي ${left} ${left>2?'خانات':'خانة'}`:bad.size?'فيه رقم مكرر، صلّحه':'تمام! اضغط خلصت'}</p>
    <div class="acts supad">${[1,2,3,4].map(n=>`<button class="btn navy" data-ga="n" data-i="${n}">${n}</button>`).join('')}</div><button class="btn red wide" data-ga="go" ${P.holes.every(i=>st.v[i])?'':'disabled'}>خلصت</button>`;},
  click(a,i,d,ctx,st){if(st.phase!=='go')return;const P=sudo4(d);
    if(a==='c'){st.cur=i;render();return;}if(a==='n'&&st.cur!=null){st.v[st.cur]=i;const nx=P.holes.find(h=>!st.v[h]);st.cur=nx??st.cur;render();return;}
    if(a==='go'&&P.holes.every(h=>st.v[h]))spdSubmit(d,ctx,sudoOk(P.sol.map((x,k)=>P.holes.includes(k)?+st.v[k]:x)));}});

/* ---------- typing race ---------- */
const SENT=['الصبر مفتاح الفرج','من جد وجد ومن زرع حصد','العلم نور','خير الكلام ما قل ودل','الوقت من ذهب','القناعة كنز لا يفنى','الجار قبل الدار','الصديق وقت الضيق','في التأني السلامة','اطلبوا العلم من المهد إلى اللحد'];
// the sentence split into what is typed right, the first wrong letter and what is left (letters compared like normAr does)
const tyN=c=>({'أ':'ا','إ':'ا','آ':'ا','ى':'ي','ة':'ه'}[c]||c);
function tyHTML(s,v){const a=[...s],b=[...String(v||'')];let k=0;while(k<a.length&&k<b.length&&tyN(a[k])===tyN(b[k]))k++;const err=k<b.length&&k<a.length;
  return `<span class="ty-ok">${escH(a.slice(0,k).join(''))}</span><span class="ty-bad">${escH(err?a[k]:'')}</span><span class="ty-rest">${escH(a.slice(k+(err?1:0)).join(''))}</span>`;}
const tyPct=(s,v)=>{const a=[...s],b=[...String(v||'')];let k=0;while(k<a.length&&k<b.length&&tyN(a[k])===tyN(b[k]))k++;return Math.round(k/a.length*100);};
GAMES.typing=spdBase({name:'أسرع كتابة',lbc:'#8E44AD',icon:iconE('#A55CC4','⌨️'),title:'تطلع جملة، اكتبها بالضبط بأسرع وقت',
  s(d){return SENT[Math.floor(srng(d,'ty')()*1000+d.rd)%SENT.length];},
  start(d,st){st.phase='go';st.t0=performance.now();},
  view(d,ctx,st){const s=GAMES.typing.s(d),v=S.draft.ty||'';return `<div class="qbox tybox"><div class="ty-s">${tyHTML(s,v)}</div><div class="ty-pr"><i style="width:${tyPct(s,v)}%"></i></div></div><input class="field" data-draft="ty" value="${escH(v)}" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="اكتب هنا…"><button class="btn red wide" data-ga="go">أرسل</button>`;},
  click(a,i,d,ctx,st){if(a!=='go'||st.phase!=='go')return;const v=normAr(S.draft.ty||'');delete S.draft.ty;spdSubmit(d,ctx,v===normAr(GAMES.typing.s(d)));}});
// live colouring while typing (typing does not redraw the screen)
document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.draft!=='ty'||S.st.g!=='typing'||!S.st.d)return;const b=document.querySelector('.tybox');if(!b)return;
  const s=GAMES.typing.s(S.st.d);const x=b.querySelector('.ty-s'),p=b.querySelector('.ty-pr i');if(x)x.innerHTML=tyHTML(s,t.value);if(p)p.style.width=tyPct(s,t.value)+'%';});
/* ---------- more quiz packs ---------- */
const QPACK=(name,lbc,icon,list)=>makeQuiz({name,lbc,icon,gen(d,rd){const R=srng(d,name);const ord=[...list.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}const [q,right,wr]=list[ord[rd%ord.length]];return {q,...withOptions(srng(d,name+rd),right,wr)};}});
GAMES.islam=QPACK('معلومات إسلامية','#1F7A55',iconE('#2E9C6E','🕌'),[
['كم عدد أركان الإسلام؟','5',['4','6','7']],['كم عدد أركان الإيمان؟','6',['5','7','4']],['كم صلاة مفروضة في اليوم والليلة؟','5',['3','4','6']],
['ما أقصر سورة في القرآن الكريم؟','الكوثر',['الإخلاص','العصر','الناس']],['كم عدد أجزاء القرآن الكريم؟','30',['20','40','60']],['ما أول سورة في المصحف؟','الفاتحة',['البقرة','العلق','الناس']],
['ما آخر سورة في المصحف؟','الناس',['الفلق','الإخلاص','الكوثر']],['ما السورة التي لا تبدأ بالبسملة؟','التوبة',['الأنفال','يس','الملك']],['في أي مدينة وُلد النبي صلى الله عليه وسلم؟','مكة المكرمة',['المدينة المنورة','الطائف','القدس']],
['ما اسم والد النبي صلى الله عليه وسلم؟','عبدالله',['عبدالمطلب','أبو طالب','هاشم']],['ما أول مسجد بُني في الإسلام؟','مسجد قباء',['المسجد النبوي','المسجد الحرام','المسجد الأقصى']],['كم ركعة في صلاة المغرب؟','3',['2','4','5']],
['كم ركعة في صلاة الظهر؟','4',['2','3','5']],['في أي غار نزل الوحي أول مرة؟','غار حراء',['غار ثور','غار الكهف','غار أحد']],['أي نبي ابتلعه الحوت؟','يونس',['موسى','نوح','يوسف']],
['أي نبي رفع قواعد الكعبة مع ابنه إسماعيل؟','إبراهيم',['نوح','موسى','عيسى']],['أي نبي يُلقب بكليم الله؟','موسى',['عيسى','إبراهيم','محمد صلى الله عليه وسلم']],['في أي سنة هجرية كانت غزوة بدر؟','2',['1','3','5']],
['في أي شهر يصوم المسلمون؟','رمضان',['شعبان','رجب','شوال']],['أي سورة تسمى أم الكتاب؟','الفاتحة',['البقرة','يس','الإخلاص']],['ما أطول سورة في القرآن الكريم؟','البقرة',['آل عمران','النساء','الأعراف']],
['كم عدد سور القرآن الكريم؟','114',['110','112','120']],['إلى أي مدينة هاجر النبي صلى الله عليه وسلم؟','المدينة المنورة',['الطائف','الحبشة','مكة المكرمة']],['أي نبي صنع السفينة؟','نوح',['هود','صالح','لوط']]]);
GAMES.sci=QPACK('علوم وطبيعة','#2C7DA0',iconE('#3D97C0','🔬'),[
['ما الصيغة الكيميائية للماء؟','H₂O',['CO₂','O₂','H₂O₂']],['أي غاز نحتاجه للتنفس؟','الأكسجين',['النيتروجين','الهيليوم','ثاني أكسيد الكربون']],['كم عظمة في جسم الإنسان البالغ؟','206',['186','216','306']],
['بأي وحدة تقاس القوة؟','النيوتن',['الجول','الواط','الباسكال']],['بأي وحدة يقاس الجهد الكهربائي؟','الفولت',['الأمبير','الأوم','الواط']],['أيهما أسرع؟','الضوء',['الصوت','الرياح','الطائرة']],
['ما أقرب نجم إلى الأرض؟','الشمس',['سيريوس','القمر','المريخ']],['ما رمز عنصر الحديد؟','Fe',['Ir','Fi','Pb']],['ما رمز عنصر الذهب؟','Au',['Ag','Go','Gd']],
['ما أصغر وحدة بنائية في الكائن الحي؟','الخلية',['الذرة','النسيج','العضو']],['كم كروموسوم في خلية الإنسان عادة؟','46',['23','44','48']],['عند كم درجة مئوية يتجمد الماء؟','0',['10','-10','4']],
['ما اسم القوة التي تشدنا نحو الأرض؟','الجاذبية',['الاحتكاك','المغناطيسية','الطفو']],['أي عضو ينقي الدم من الفضلات؟','الكلية',['القلب','الرئة','المعدة']],['بماذا تتنفس الأسماك؟','الخياشيم',['الرئتين','الجلد','الزعانف']],
['أين يُمتص أغلب الغذاء في الجسم؟','الأمعاء الدقيقة',['المعدة','المريء','الكبد']],['ما اسم العملية التي تصنع بها النباتات غذاءها؟','البناء الضوئي',['التنفس','التبخر','الهضم']],['ما الذي يقيسه الترمومتر؟','الحرارة',['الضغط','الرطوبة','السرعة']],
['أي كوكب نعيش عليه؟','الأرض',['المريخ','الزهرة','عطارد']],['كم رجل للحشرة؟','6',['4','8','10']]]);
GAMES.geo=QPACK('جغرافيا','#B9770E',iconE('#D68910','🗺️'),[
['أكبر قارة في العالم مساحة؟','آسيا',['أفريقيا','أوروبا','أمريكا الشمالية']],['أكبر دولة في العالم مساحة؟','روسيا',['كندا','الصين','أمريكا']],['أعمق محيط في العالم؟','المحيط الهادي',['المحيط الأطلسي','المحيط الهندي','المحيط المتجمد الشمالي']],
['أكبر جزيرة في العالم؟','غرينلاند',['مدغشقر','بورنيو','آيسلندا']],['في أي قارة تقع مصر؟','أفريقيا',['آسيا','أوروبا','أستراليا']],['ما البحر الذي يفصل السعودية عن مصر؟','البحر الأحمر',['البحر المتوسط','بحر العرب','البحر الأسود']],
['أصغر دولة في العالم؟','الفاتيكان',['موناكو','مالطا','البحرين']],['في أي دولة تقع مدينة البتراء؟','الأردن',['مصر','سوريا','لبنان']],['في أي دولة يقع تاج محل؟','الهند',['باكستان','إيران','بنغلاديش']],
['أكبر بحيرة في العالم؟','بحر قزوين',['البحر الميت','بحيرة فكتوريا','بحيرة سوبيريور']],['أي دولة شكلها يشبه الحذاء؟','إيطاليا',['اليونان','إسبانيا','تشيلي']],['أي مضيق يفصل أوروبا عن أفريقيا؟','مضيق جبل طارق',['مضيق هرمز','مضيق باب المندب','مضيق البوسفور']],
['أعلى جبل في أفريقيا؟','كليمنجارو',['إيفرست','الأطلس','كينيا']],['أي دولة تسمى بلاد الشمس المشرقة؟','اليابان',['الصين','كوريا','تايلاند']],['أي نهر يمر في بغداد؟','دجلة',['الفرات','النيل','العاصي']],
['في أي دولة تقع جزيرة بالي؟','إندونيسيا',['ماليزيا','الفلبين','تايلاند']],['كم عدد دول مجلس التعاون الخليجي؟','6',['5','7','8']],['في أي قارة تقع الأرجنتين؟','أمريكا الجنوبية',['أفريقيا','أوروبا','أمريكا الشمالية']],
['أطول سلسلة جبال على اليابسة؟','الأنديز',['الهيمالايا','الألب','روكي']],['أكبر صحراء رملية متصلة في العالم؟','الربع الخالي',['صحراء النفود','صحراء سيناء','صحراء ثار']]]);

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
  onTimeout:d=>fkPass(d,{...d,dice:'',used:'000000',tot:0,rolled:false},d.turn),
  onSkip(nd,d){if(nd.out[d.turn]!=='1')return nd;const x={...nd,dice:'',used:'000000',tot:0,rolled:false,last:nm(d,d.turn)+' طلع'+(d.tot>0?' وراح جمع دوره':'')};return x.win!=null?x:fkPass(x,x,d.turn);},
  // the turn total and the goal are on the board
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const my=ctx.my;S.sel=S.sel||[];S.rolled=false;const sel=S.sel.map(i=>+d.dice[i]);const sv=fkScore(sel);
    // view only: the turn total and the goal bar, the dice on felt, the dice set aside in a tray, ghost dice before the first roll
    const t=d.turn,sc=d.sc[t]||0,g=d.goal,pc=x=>Math.max(0,Math.min(100,x/g*100));const bust=!d.rolled&&!!d.dice&&/ما يسجل/.test(d.last||'');
    // a fresh roll (also a bot's or another phone's) tumbles once: keyed by the game and the state number, so a redraw does not replay it
    const rk=d.gid+':'+S.st.s,fresh=!!d.dice&&(d.rolled||bust)&&S.fkRoll!==rk;if(fresh)S.fkRoll=rk;
    const held=d.dice?[...d.used].map((u,i)=>u==='1'?i:-1).filter(i=>i>=0):[];
    const row=d.dice?[...d.dice].map((x,i)=>d.used[i]==='1'?'':`<button class="dice ${d.rolled&&S.sel.includes(i)?'held':''} ${d.rolled||bust?'':'fk-stale'} ${fresh?'roll':''}" id="fkd${i}" data-ga="sel" data-i="${i}" ${my&&d.rolled?'':'disabled'}>${diceSVG(+x)}</button>`).join(''):Array(6).fill('<i class="fk-gh"></i>').join('');
    let s=`<div class="fk" style="--c:${col(d,t)}"><div class="fk-sc"><div class="fk-tot"><small>جمع الدور</small><b>${d.tot}</b>${sv?`<em>+${sv}</em>`:''}</div>
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
    if(a==='bank'){if(d.tot<=0)return;const sc=[...d.sc];sc[t]+=d.tot;act(fkPass(d,{...d,sc,tot:0,dice:'',used:'000000',rolled:false,last:`${nm(d,t)} حفظ ${d.tot}`},t));return;}
    if(a==='keep'||a==='keepbank'){const sv=fkScore(S.sel.map(k=>+d.dice[k]));if(!sv)return;let used=d.used;S.sel.forEach(k=>used=setAt(used,k,'1'));S.sel=[];const tot=d.tot+sv;
      if(a==='keepbank'){const sc=[...d.sc];sc[t]+=tot;act(fkPass(d,{...d,sc,tot:0,dice:'',used:'000000',rolled:false,last:`${nm(d,t)} حفظ ${tot}`},t));return;}
      act({...d,used:used.includes('0')?used:'000000',tot,rolled:false,last:used.includes('0')?'':`${nm(d,t)} سجّل الستة كلها 🔥 يرمي الستة من جديد`});}
  }
};

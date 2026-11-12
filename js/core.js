'use strict';
const app=document.getElementById('app');
const MAXP=8;
const COLS=['#EC6158','#4AB1E8','#4CB97F','#EDB02F','#9C7BD6','#F2874B','#E57AAE','#2FB3AA'];
const LIGHT=['#FAD2CE','#CDEAFA','#D0EFDD','#FBEAC2','#E5DAF6','#FCDCC6','#F8D5E7','#C9EEEA'];
const NAMES=['الأحمر','الأزرق','الأخضر','الأصفر','البنفسجي','البرتقالي','الوردي','الفيروزي'];
const rid=()=>Math.random().toString(36).slice(2,8);
const rnd=n=>Math.floor(Math.random()*n);
const setAt=(s,i,c)=>s.slice(0,i)+c+s.slice(i+1);
const BACK='<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PERSON='<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="5" fill="#fff"/><path d="M3 23c0-6 4-9 9-9s9 3 9 9z" fill="#fff"/></svg>';

/* seats: a game has d.pl = list of roles (colours) taking part; seat i plays role d.pl[i] */
const col=(d,s)=>COLS[d.pl[s]],lit=(d,s)=>LIGHT[d.pl[s]],nm=(d,s)=>NAMES[d.pl[s]];
const nameTag=(d,s)=>`<b style="color:${col(d,s)}">${nm(d,s)}</b>`;
function nextSeat(d,from,out){out=out||d.out;const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(out[s]!=='1')return s;}return from;}
const aliveSeats=(d,out)=>{out=out||d.out;return d.pl.map((_,s)=>s).filter(s=>out[s]!=='1');};

/* ================= state ================= */
const S={mode:null,localN:2,st:{g:null,s:0,d:null,sc:Array(MAXP).fill(0)},me:null,myPeer:null,code:null,nr:null,roles:new Set(),priv:Array(MAXP).fill(null),seen:null,roomErr:null,joining:false,gw:false,rolled:false,tgt:null,pending:false};
const GAMES={};

function players(){
  if(S.mode==='local')return [...Array(S.localN).keys()];
  return [...S.roles].filter(r=>typeof r==='number'&&r>=0&&r<MAXP).sort((a,b)=>a-b);
}
function newD(g,starter,pl){const n=pl.length;starter=starter%n;return {...GAMES[g].init(n),gid:rid(),st:starter,turn:starter,pl,out:'0'.repeat(n),win:null};}
function setGame(g){
  if(g){const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
    S.st={...S.st,g,s:S.st.s+1,d:newD(g,0,pl),sc:Array(MAXP).fill(0)};}
  else S.st={...S.st,g:null,s:S.st.s+1,d:null};
  S.seen=null;resetUI();afterChange();
}
function newRound(){const d=S.st.d;const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
  const st=d?(d.st||0)+1:0;S.st={...S.st,s:S.st.s+1,d:newD(S.st.g,st,pl)};S.seen=null;resetUI();afterChange();}
function resetUI(){S.gw=false;S.tgt=null;S.wild=null;S.dside=null;S.mm=[];}
function act(nd){S.wild=null;S.dside=null;const was=S.st.d&&S.st.d.win!=null;const sc=[...S.st.sc];if(!was&&typeof nd.win==='number')sc[nd.pl[nd.win]]++;S.st={...S.st,s:S.st.s+1,d:nd,sc};afterChange();}
function setPriv(role,p){S.priv[role]=p;afterChange();}
function afterChange(){ensurePriv();publish();render();queueSimul();}
/* simultaneous rounds: every alive seat stores {rd,pick} in its private part; one resolver applies G.resolve */
let simulT=null;
function queueSimul(){if(simulT)return;simulT=setTimeout(()=>{simulT=null;trySimul();},60);}
function simulPicks(d){return d.pl.map((r,s)=>{if(d.out[s]==='1')return null;const p=S.priv[r];return p&&p.gid===d.gid&&p.rd===d.rd&&p.pick!=null?p.pick:undefined;});}
function trySimul(){
  const {g,d}=S.st;if(!g||!d||d.win!=null)return;const G=GAMES[g];if(!G||!G.resolve)return;
  const picks=simulPicks(d);if(picks.some(x=>x===undefined))return;
  if(S.mode==='online'){const present=d.pl.filter((r,s)=>d.out[s]!=='1'&&S.roles.has(r));if(!present.length||Math.min(...present)!==S.me)return;}
  act(G.resolve(d,picks));
}
function simulPick(d,seat,pick){const r=d.pl[seat];const p=S.priv[r]||{gid:d.gid};setPriv(r,{...p,gid:d.gid,rd:d.rd,pick});}
const hasPicked=(d,seat)=>{const p=S.priv[d.pl[seat]];return !!(p&&p.gid===d.gid&&p.rd===d.rd&&p.pick!=null);};
function ensurePriv(){
  const {g,d}=S.st;if(!g||!d)return;const G=GAMES[g];if(!G||!(G.privInit||G.resolve))return;
  const roles=S.mode==='local'?d.pl:(S.me==null||!d.pl.includes(S.me)?[]:[S.me]);
  for(const r of roles){const p=S.priv[r];if(!p||p.gid!==d.gid)S.priv[r]={...(G.privInit?G.privInit(d):{}),gid:d.gid};}
}
function publish(){
  save();if(S.mode!=='online'||!S.nr)return;
  S.nr.presence({g:S.st.g,s:S.st.s,d:S.st.d,sc:S.st.sc,r:S.me,p:S.me==null?null:S.priv[S.me]}).catch(e=>console.warn('presence',e));
}
const LS='alaabna.v2';
function save(){if(S.mode!=='online'||!S.code)return;try{localStorage.setItem(LS,JSON.stringify({code:S.code,me:S.me,st:S.st,priv:S.me==null?null:S.priv[S.me]}));}catch(e){}}
function loadSaved(){try{return JSON.parse(localStorage.getItem(LS)||'null');}catch(e){return null;}}

/* ================= room ================= */
let roomP=null;
function getRoom(){
  if(!roomP)roomP=(async()=>{
    for(let k=0;k<(window.FB&&FB.ready()?0:40)&&!(window.claude&&window.claude.use);k++)await new Promise(r=>setTimeout(r,100));
    if(window.claude&&window.claude.use){try{const r=await window.claude.use('room');if(r)return r;}catch(e){}}
    if(window.FB&&FB.ready())return FB.room();
    return null;
  })();
  return roomP;
}
function genCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<4;i++)c+=A[rnd(A.length)];return c;}
let lastPeers=[];
function takenRoles(){const t=new Set();for(const p of lastPeers){if(p.sameTab||p.kind!=='viewer')continue;const r=(p.presence||{}).r;if(typeof r==='number')t.add(r);}return t;}
function pickRole(pref){const t=takenRoles();if(typeof pref==='number'&&pref>=0&&pref<MAXP&&!t.has(pref))return pref;for(let r=1;r<MAXP;r++)if(!t.has(r))return r;return t.has(0)?null:0;}
async function enterRoom(code,host,restore){
  S.joining=true;S.roomErr=null;render();
  const room=await getRoom();
  if(!room){S.joining=false;S.roomErr=window.FB&&FB.configured()?'لازم تسجّل دخول أول.':'اللعب أونلاين يحتاج ربط الموقع بخدمة الاتصال، أو تفتح الصفحة من claude.ai.';render();return;}
  let nr;
  try{nr=await room.join('g-'+code.toLowerCase());}
  catch(e){S.joining=false;S.roomErr='ما قدرت أدخل الغرفة، جرّب مرة ثانية.';render();return;}
  S.mode='online';S.code=code;S.nr=nr;S.joining=false;S.priv=Array(MAXP).fill(null);S.seen=null;S.roles=new Set();lastPeers=[];
  if(restore&&restore.st){S.st=restore.st;if(!Array.isArray(S.st.sc)||S.st.sc.length<MAXP)S.st.sc=Array(MAXP).fill(0);}
  else S.st={g:null,s:host?1:0,d:null,sc:Array(MAXP).fill(0)};
  if(host){S.me=0;S.pending=false;}
  else{S.me=null;S.pending=true;
    setTimeout(()=>{if(S.nr!==nr)return;S.me=pickRole(restore?restore.me:null);if(S.me!=null&&restore&&restore.me===S.me)S.priv[S.me]=restore.priv||null;S.pending=false;recomputeRoles();afterChange();},1500);}
  nr.onPeers(onPeers,()=>{S.roomErr='انقطع الاتصال بالغرفة.';render();});
  afterChange();
}
function recomputeRoles(){const s=new Set();if(S.me!=null)s.add(S.me);for(const p of lastPeers){if(p.sameTab||p.kind!=='viewer')continue;const r=(p.presence||{}).r;if(typeof r==='number')s.add(r);}S.roles=s;}
function onPeers(ch){
  if(S.mode!=='online')return;
  lastPeers=ch.peers;let adopt=null;
  for(const p of ch.peers){
    if(p.sameTab){S.myPeer=p.peer;continue;}
    if(p.kind!=='viewer')continue;const pr=p.presence||{};
    if(typeof pr.r==='number')S.priv[pr.r]=pr.p??S.priv[pr.r];
    if(S.me!=null&&pr.r===S.me&&String(p.peer)<String(S.myPeer)){S.me=pickRole(null);}
    if(typeof pr.s!=='number')continue;
    const better=pr.s>S.st.s||(pr.s===S.st.s&&pr.r===0&&S.me!==0&&JSON.stringify(pr.d??null)!==JSON.stringify(S.st.d));
    if(better&&(!adopt||pr.s>adopt.s))adopt=pr;
  }
  recomputeRoles();
  if(adopt){
    const oldGid=S.st.d&&S.st.d.gid,oldG=S.st.g;
    S.st={g:adopt.g??null,s:adopt.s,d:adopt.d??null,sc:Array.isArray(adopt.sc)?adopt.sc:Array(MAXP).fill(0)};
    if(S.st.g!==oldG||(S.st.d&&S.st.d.gid)!==oldGid)resetUI();
    ensurePriv();publish();
  }
  render();queueSimul();
}

/* ================= helpers ================= */
function toast(t){const el=document.createElement('div');el.className='toast';el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),1800);}
function mySeat(d){return S.mode==='local'?null:d.pl.indexOf(S.me);}
function mkCtx(){
  const d=S.st.d,G=GAMES[S.st.g],local=S.mode==='local';
  const v=local?(G.viewer?G.viewer(d,S.priv):d.turn):d.pl.indexOf(S.me);
  const extra=G.canAct?G.canAct(d,S.priv):true;
  if(G.resolve){const ok=v!=null&&v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v);return {local,v,priv:S.priv,my:ok&&extra,simul:true};}
  return {local,v,priv:S.priv,my:d.win==null&&extra&&(local||d.turn===v)};
}
function turnTxt(d,ctx){
  if(!ctx.local&&d.turn===ctx.v)return '<b>دورك</b>';
  return `دور ${nameTag(d,d.turn)}`;
}
function absentSeats(d,G){if(S.mode!=='online'||d.win!=null)return [];if(G.resolve)return aliveSeats(d).filter(s=>!S.roles.has(d.pl[s])&&!hasPicked(d,s));return S.roles.has(d.pl[d.turn])?[]:[d.turn];}
function statusHTML(d,G,ctx){
  if(d.win!=null){
    const t=G.winText&&G.winText(d)||(d.win==='d'?'تعادل!':(!ctx.local&&d.win===ctx.v?'فزت! 🎉':`فاز ${nm(d,d.win)}!`));
    const c=typeof d.win==='number'?col(d,d.win):'var(--ink)';
    return `<span class="w" style="color:${c}">${t}</span> <button class="sm go" data-a="again">جولة جديدة</button>`+(G.winExtra?`<br><small>${G.winExtra(d,ctx)}</small>`:'');
  }
  let s=G.status?G.status(d,ctx):turnTxt(d,ctx);
  if(!ctx.local&&ctx.v<0)s+='<br><small>تتفرج الحين، وتدخل معهم في الجولة الجاية</small>';
  const gone=absentSeats(d,G);
  if(!ctx.local&&gone.length)s+=`<br><small>${gone.map(x=>nm(d,x)).join('، ')} طلع من الغرفة</small> <button class="sm" data-a="skip">تخطّاه</button>`;
  return s;
}

/* ================= screens ================= */
function render(){
  if(window.FB&&FB.configured()&&!FB.ready())return renderLogin();
  if(S.mode===null)return renderHome();
  if(S.mode==='lobby')return renderLobby();
  if(!S.st.g||!GAMES[S.st.g]||!S.st.d)return renderGrid();
  renderGame();
}
function renderLogin(){
  app.innerHTML=`<div class="hero">${LOGO}<h1>ألعابنا</h1><p>موقع خاص</p></div>
  ${FB.state()==='denied'?`<p class="err">الحساب ${FB.email()} مو مسموح له يدخل. اطلب من صاحب الموقع يضيفه.</p><button class="big navy" data-a="signout">دخول بحساب ثاني</button>`:
   FB.state()==='loading'?'<p class="note">جاري التحقق…</p>':'<button class="big red" data-a="signin">دخول بحساب قوقل</button>'}`;
}
function renderHome(){
  app.innerHTML=`<div class="hero">${LOGO}<h1>ألعابنا</h1><p>من لاعبين اثنين إلى ${MAXP} لاعبين</p></div>
  <button class="big red" data-a="local">على نفس الجهاز<small>كلكم على جوال واحد</small></button>
  <button class="big blue" data-a="lobby">أونلاين<small>كل واحد من جهازه برمز غرفة</small></button>`;
}
function renderLobby(){
  const sv=loadSaved();
  app.innerHTML=`<div class="top"><button class="ib" data-a="home">${BACK}</button><h1>أونلاين</h1></div>
  <div class="panel"><h3>أنشئ غرفة</h3><p>تاخذ رمز وترسله لأصحابك، وتكون أنت الأحمر</p><button class="big red" data-a="create" ${S.joining?'disabled':''}>أنشئ غرفة</button></div>
  <div class="panel"><h3>ادخل غرفة</h3><p>اكتب الرمز اللي وصلك</p><input class="code" id="code" maxlength="4" autocomplete="off" placeholder="····"><button class="big blue" data-a="join" ${S.joining?'disabled':''}>ادخل</button></div>
  ${sv&&sv.code?`<button class="link" data-a="resume">ارجع لغرفتك ${sv.code}</button>`:''}
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}`;
}
function roomBar(){
  if(S.mode!=='online')return '';
  const pl=players();
  const me=S.pending?'<span class="chip" style="background:var(--mut)">جاري اختيار لونك…</span>':S.me==null?'<span class="chip" style="background:var(--mut)">الغرفة ممتلئة، تتفرج</span>':'';
  return `<div class="roombar"><span>الغرفة</span><b class="code">${S.code}</b><span class="sp"></span><button class="sm" data-a="copy">نسخ الرمز</button>
  <div style="flex-basis:100%;display:flex;gap:4px;flex-wrap:wrap;align-items:center">${me}${pl.map(r=>`<span class="chip" style="background:${COLS[r]}">${r===S.me?'أنت':NAMES[r]}</span>`).join('')}<span class="note" style="margin:0 4px">${pl.length} من ${MAXP}</span></div></div>`;
}
const CATS=[['board','ألعاب لوحة'],['cards','ورق وزهر'],['mind','ذكاء وتخمين'],['quiz','مسابقات وتحدي']];
const iconE=(bg,e,fg)=>`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="44" r="30" fill="${fg||'rgba(255,255,255,.22)'}"/><text x="50" y="58" text-anchor="middle" font-size="40">${e}</text></svg>`;
function renderGrid(){
  let mid='';
  if(S.mode==='local')mid=`<div class="stepper"><span>عدد اللاعبين</span><button data-a="dec">−</button><b>${S.localN}</b><button data-a="inc">+</button></div><div class="dotsrow">${[...Array(S.localN).keys()].map(r=>`<i style="background:${COLS[r]}"></i>`).join('')}</div>`;
  else mid=players().length<2?'<p class="note">بانتظار لاعب ثاني على الأقل. أرسل لهم رمز الغرفة</p>':'<p class="note">أي لعبة تختارها تنفتح عند الكل</p>';
  app.innerHTML=`<div class="top"><button class="ib" data-a="${S.mode==='online'?'leave':'home'}">${BACK}</button><h1>اختر لعبة</h1></div>${roomBar()}${mid}
  ${CATS.map(([c,t])=>{const ks=Object.keys(GAMES).filter(k=>(GAMES[k].cat||'board')===c);return ks.length?`<h2 class="cat">${t}</h2><div class="grid">${ks.map(k=>`<button class="gcard" data-a="pick" data-g="${k}">${GAMES[k].icon}<div class="lb" style="background:${GAMES[k].lbc}">${GAMES[k].name}</div></button>`).join('')}</div>`:'';}).join('')}`;
}
function scoreBar(sc,d){
  return `<div class="score">${d.pl.map((r,s)=>`<div class="pl ${d.win==null&&d.turn===s?'on':''} ${d.out[s]==='1'?'out':''}" style="background:${COLS[r]}">${PERSON}<b>${sc[r]||0}</b><span>${S.mode==='online'&&r===S.me?'أنت':NAMES[r]}</span></div>`).join('')}</div>`;
}
function renderGame(){
  const {g,d,sc}=S.st,G=GAMES[g];const ctx=mkCtx();let body=null,cover=false;
  if(S.mode==='local'&&G.viewer){
    const v=d.win==null?G.viewer(d,S.priv):null;
    if(v!=null&&S.seen!==v){cover=true;
      const m=G.coverMsg?G.coverMsg(d):'';
      body=`<div class="cover" style="background:${col(d,v)}">${m?`<div class="msg">${m}</div>`:''}<p>الجهاز الحين لـ</p><h2>${nm(d,v)}</h2><p>خل الباقين ما يشوفون الشاشة</p><button class="big" data-a="reveal" data-i="${v}">أنا ${nm(d,v)}، ورّني</button></div>`;}
  }
  if(!body){try{body=G.render(d,ctx);}catch(e){console.error(e);body='<p class="err">صار خطأ في عرض اللعبة.</p><button class="sm go" data-a="again">جولة جديدة</button>';}}
  app.innerHTML=`<div class="top"><button class="ib" data-a="grid">${BACK}</button><h1>${G.name}</h1></div>${roomBar()}${scoreBar(sc,d)}<div class="status">${cover?'':statusHTML(d,G,ctx)}</div><div class="board">${body}</div>`;
}

app.addEventListener('click',e=>{
  const t=e.target.closest('[data-a],[data-ga]');if(!t||t.disabled)return;
  const i=t.dataset.i!=null?+t.dataset.i:null;
  if(t.dataset.ga){const G=GAMES[S.st.g];if(G&&S.st.d)G.click(t.dataset.ga,i,S.st.d,mkCtx());return;}
  switch(t.dataset.a){
    case 'home':S.mode=null;render();break;
    case 'signin':FB.signIn();break;
    case 'signout':FB.signOut();break;
    case 'local':S.mode='local';S.me=null;S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0)};S.priv=Array(MAXP).fill(null);S.seen=null;render();break;
    case 'inc':S.localN=Math.min(MAXP,S.localN+1);render();break;
    case 'dec':S.localN=Math.max(2,S.localN-1);render();break;
    case 'lobby':S.mode='lobby';S.roomErr=null;render();getRoom();break;
    case 'create':enterRoom(genCode(),true,null);break;
    case 'join':{
      const c=(document.getElementById('code').value||'').trim().toUpperCase();
      if(!/^[A-Z0-9]{4}$/.test(c)){S.roomErr='اكتب الرمز كامل (4 خانات)';render();return;}
      const sv=loadSaved();const same=sv&&sv.code===c;
      if(same&&sv.me===0)enterRoom(c,true,sv);else enterRoom(c,false,same?sv:null);break;}
    case 'resume':{const sv=loadSaved();if(sv)enterRoom(sv.code,sv.me===0,sv);break;}
    case 'leave':if(S.nr)S.nr.leave().catch(()=>{});S.nr=null;S.mode=null;render();break;
    case 'grid':setGame(null);break;
    case 'pick':setGame(t.dataset.g);break;
    case 'again':newRound();break;
    case 'reveal':S.seen=i;S.tgt=null;render();break;
    case 'skip':{const d=S.st.d;if(!d||d.win!=null)return;const G=GAMES[S.st.g];let out=d.out;for(const x of absentSeats(d,G))out=setAt(out,x,'1');const al=aliveSeats(d,out);
      const nd={...d,out,turn:out[d.turn]==='1'?nextSeat(d,d.turn,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd):nd);break;}
    case 'copy':try{navigator.clipboard.writeText(S.code).then(()=>toast('انسخ الرمز: '+S.code)).catch(()=>toast('الرمز: '+S.code));}catch(err){toast('الرمز: '+S.code);}break;
  }
});
app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='code'){const b=app.querySelector('[data-a="join"]');if(b)b.click();}});

/* target picker used by sea battle and guess the person */
function targets(d,me){return aliveSeats(d).filter(s=>s!==me);}
function curTarget(d,me){const ts=targets(d,me);if(S.tgt==null||!ts.includes(S.tgt))S.tgt=ts[0]??null;return S.tgt;}
function tabsHTML(d,me,label){const ts=targets(d,me);if(ts.length<2)return '';const c=curTarget(d,me);
  return `<p class="lbl" style="text-align:center">${label}</p><div class="tabs">${ts.map(s=>`<button class="tab ${s===c?'sel':''}" style="background:${col(d,s)}" data-ga="tgt" data-i="${s}">${nm(d,s)}</button>`).join('')}</div>`;}

/* ================= icons ================= */
const LOGO=`<svg viewBox="0 0 120 70" width="150"><rect x="6" y="10" width="50" height="50" rx="14" fill="#EC6158"/><rect x="64" y="10" width="50" height="50" rx="14" fill="#4AB1E8"/><circle cx="22" cy="26" r="5" fill="#fff"/><circle cx="40" cy="44" r="5" fill="#fff"/><circle cx="80" cy="26" r="5" fill="#fff"/><circle cx="98" cy="26" r="5" fill="#fff"/><circle cx="80" cy="44" r="5" fill="#fff"/><circle cx="98" cy="44" r="5" fill="#fff"/></svg>`;
const SHP=[
 c=>`<path d="M8 8L32 32M32 8L8 32" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`,
 c=>`<circle cx="20" cy="20" r="12" stroke="${c}" stroke-width="7" fill="none"/>`,
 c=>`<path d="M20 6L34 32H6Z" stroke="${c}" stroke-width="6" fill="none" stroke-linejoin="round"/>`,
 c=>`<rect x="8" y="8" width="24" height="24" rx="3" stroke="${c}" stroke-width="6" fill="none"/>`,
 c=>`<path d="M20 4l4.7 10 10.8 1.2-8 7.3 2.3 10.6L20 27.8 10.2 33.1l2.3-10.6-8-7.3L15.3 14Z" fill="${c}"/>`,
 c=>`<path d="M20 5L35 20L20 35L5 20Z" stroke="${c}" stroke-width="6" fill="none" stroke-linejoin="round"/>`,
 c=>`<path d="M20 6V34M6 20H34" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`,
 c=>`<path d="M20 5L33 12.5V27.5L20 35L7 27.5V12.5Z" fill="${c}"/>`];
const shape=r=>`<svg viewBox="0 0 40 40">${SHP[r](COLS[r])}</svg>`;


function boot(){if(window.FB&&FB.configured())FB.init(()=>render());render();}

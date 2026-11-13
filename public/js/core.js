'use strict';
const app=document.getElementById('app');
const MAXP=8;
const COLS=['#EC6158','#4AB1E8','#4CB97F','#EDB02F','#9C7BD6','#F2874B','#E57AAE','#2FB3AA'];
const LIGHT=['#FAD2CE','#CDEAFA','#D0EFDD','#FBEAC2','#E5DAF6','#FCDCC6','#F8D5E7','#C9EEEA'];
const NAMES=['الأحمر','الأزرق','الأخضر','الأصفر','البنفسجي','البرتقالي','الوردي','الفيروزي'];
const rid=()=>Math.random().toString(36).slice(2,8);
const rnd=n=>Math.floor(Math.random()*n);
const setAt=(s,i,c)=>s.slice(0,i)+c+s.slice(i+1);
function shade(hex,f){const n=parseInt(hex.slice(1),16);const r=n>>16,g=n>>8&255,b=n&255;const m=v=>Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f)));return '#'+((1<<24)|(m(r)<<16)|(m(g)<<8)|m(b)).toString(16).slice(1);}
const onceSet=new Set();const once=k=>{if(onceSet.has(k))return false;onceSet.add(k);return true;};
const escH=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BACK='<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PERSON='<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="5" fill="#fff"/><path d="M3 23c0-6 4-9 9-9s9 3 9 9z" fill="#fff"/></svg>';
const LSK={room:'alaabna.v3',name:'alaabna.name',mute:'alaabna.mute',local:'alaabna.local'};
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};

/* ================= players and names ================= */
/* a game has d.pl = list of roles (colours) taking part; seat i plays role d.pl[i] */
function pname(r){const n=(S.mode==='local'?S.localNames[r]:(r===S.me?S.myName:S.names[r]))||'';return escH(String(n).trim().slice(0,14))||NAMES[r];}
const col=(d,s)=>COLS[d.pl[s]],lit=(d,s)=>LIGHT[d.pl[s]],nm=(d,s)=>pname(d.pl[s]);
const nameTag=(d,s)=>`<b style="color:${col(d,s)}">${nm(d,s)}</b>`;
function nextSeat(d,from,out){out=out||d.out;const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(out[s]!=='1')return s;}return from;}
const aliveSeats=(d,out)=>{out=out||d.out;return d.pl.map((_,s)=>s).filter(s=>out[s]!=='1');};

/* ================= state ================= */
const CFG0={pick:'host',timer:0,target:0,lock:false,kick:[],members:[]};
const S={draft:{},sel:[],mode:null,localN:2,localNames:[],myName:lsGet(LSK.name)||'',names:{},mute:lsGet(LSK.mute)==='1',
  st:{g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}},me:null,myPeer:null,code:null,nr:null,roles:new Set(),priv:Array(MAXP).fill(null),
  chat:{},myChat:[],chatSeen:Date.now(),seen:null,roomErr:null,joining:false,gw:false,rolled:false,tgt:null,pending:false,browse:false,modal:null,showResult:false,winKey:null,wasMy:false,rxSeen:{}};
try{const l=JSON.parse(lsGet(LSK.local)||'null');if(l){S.localN=l.n||2;S.localNames=l.names||[];}}catch(e){}
const GAMES={};
const cfg=()=>S.st.cfg||CFG0;

function players(){
  if(S.mode==='local')return [...Array(S.localN).keys()];
  const k=cfg().kick||[];
  return [...S.roles].filter(r=>typeof r==='number'&&r>=0&&r<MAXP&&!k.includes(r)).sort((a,b)=>a-b);
}
function actingHost(){if(S.mode!=='online')return null;const r=[...S.roles].filter(x=>typeof x==='number').sort((a,b)=>a-b);return r.length?r[0]:null;}
const isHost=()=>S.mode==='local'||(S.me!=null&&S.me===actingHost());
const canPick=()=>S.mode==='local'||isHost()||(cfg().pick==='all'&&S.me!=null);

function newD(g,starter,pl){const n=pl.length;starter=starter%n;return {...GAMES[g].init(n),gid:rid(),st:starter,turn:starter,pl,out:'0'.repeat(n),win:null};}
function setGame(g){
  if(g){const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
    S.st={...S.st,g,s:S.st.s+1,d:newD(g,0,pl)};}
  else S.st={...S.st,g:null,s:S.st.s+1,d:null};
  S.seen=null;S.browse=false;S.showResult=false;resetUI();afterChange();
}
function newRound(){const d=S.st.d;const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
  const st=d?(d.st||0)+1:0;S.st={...S.st,s:S.st.s+1,d:newD(S.st.g,st,pl)};S.seen=null;S.showResult=false;resetUI();afterChange();}
function resetUI(){S.gw=false;S.tgt=null;S.wild=null;S.dside=null;S.mm=[];S.draft={...(S.draft.q!=null?{q:S.draft.q}:{})};S.sel=[];S.simon=null;S.lq=null;S.lf=null;S.sp=null;S.mcell=null;S.mprops=false;S.jk=null;S.arA=null;S.dwSel=null;S.rolling=false;}
function act(nd){S.wild=null;S.dside=null;const was=S.st.d&&S.st.d.win!=null;const sc=[...S.st.sc];if(!was&&typeof nd.win==='number')(nd.wins||[nd.win]).forEach(w=>sc[nd.pl[w]]++);S.st={...S.st,s:S.st.s+1,d:nd,sc};sfx('tap');afterChange();}
function setCfg(patch){S.st={...S.st,cfg:{...cfg(),...patch},s:S.st.s+1};afterChange();}
function setPriv(role,p){S.priv[role]=p;afterChange();}
function afterChange(){ensurePriv();publish();render();queueSimul();}

/* simultaneous rounds: every alive seat stores {rd,pick} in its private part; one resolver applies G.resolve */
let simulT=null;
function queueSimul(){if(simulT)return;simulT=setTimeout(()=>{simulT=null;trySimul();},60);}
function simulPicks(d){return d.pl.map((r,s)=>{if(d.out[s]==='1')return null;const p=S.priv[r];return p&&p.gid===d.gid&&p.rd===d.rd&&p.pick!=null?p.pick:undefined;});}
const isEnforcer=()=>S.mode==='local'||(S.me!=null&&S.me===actingHost());
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
  for(const r of roles){const p=S.priv[r];if(!p||p.gid!==d.gid||(G.privStale&&G.privStale(d,p,r)))S.priv[r]={...(G.privInit?G.privInit(d,r):{}),gid:d.gid};}
}
function publish(rx){
  save();if(S.mode!=='online'||!S.nr)return;
  const o={g:S.st.g,s:S.st.s,d:S.st.d,sc:S.st.sc,cfg:S.st.cfg,r:S.me,p:S.me==null?null:S.priv[S.me],n:S.myName.slice(0,14),ch:S.myChat.slice(-10)};
  if(rx)o.rx=rx;
  // Claude rooms take 4 KB per player: drop the oldest chat lines first if the game state is large
  while(o.ch.length&&new Blob([JSON.stringify(o)]).size>3800)o.ch=o.ch.slice(1);
  S.nr.presence(o).catch(e=>console.warn('presence',e));
}
function save(){
  if(S.mode==='local')lsSet(LSK.local,JSON.stringify({n:S.localN,names:S.localNames}));
  if(S.mode!=='online'||!S.code)return;lsSet(LSK.room,JSON.stringify({code:S.code,via:S.via||'net',me:S.me,st:S.st,priv:S.me==null?null:S.priv[S.me]}));}
function loadSaved(){try{return JSON.parse(lsGet(LSK.room)||'null');}catch(e){return null;}}

/* ================= turn timer ================= */
const TK={key:null,t0:0,fired:false};
function timerKey(){const d=S.st.d;return S.st.g&&d?`${S.st.g}:${d.gid}:${S.st.s}:${S.mode==='local'?S.seen:''}`:null;}
function timeLeft(){const t=cfg().timer;if(!t||!S.st.d||S.st.d.win!=null)return null;const G=GAMES[S.st.g];if(!G||G.noTimer)return null;return Math.max(0,t-(Date.now()-TK.t0)/1000);}
setInterval(()=>{
  const k=timerKey();if(k!==TK.key){TK.key=k;TK.t0=Date.now();TK.fired=false;}
  const left=timeLeft();const bar=document.querySelector('.tbar i');
  if(bar){if(left==null)bar.parentNode.style.display='none';else{bar.parentNode.style.display='';bar.style.width=(left/cfg().timer*100)+'%';bar.style.background=left<5?'#EC6158':'#4CB97F';}}
  if(left===0&&!TK.fired&&isEnforcer()&&!app.querySelector('.cover')){TK.fired=true;doTimeout();}
},400);
function doTimeout(){
  const {g,d}=S.st;const G=GAMES[g];if(!G||!d||d.win!=null)return;
  if(G.resolve){act(G.resolve(d,simulPicks(d).map(x=>x===undefined?null:x)));return;}
  const who=nm(d,d.turn);let nd=G.onTimeout?G.onTimeout(d):{...d,turn:nextSeat(d,d.turn)};
  if('last' in d)nd={...nd,last:`انتهى وقت ${who}`};S.seen=null;act(nd);
}

/* ================= sound and alerts ================= */
let actx=null;
function sfx(kind){
  if(S.mute)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  const N={tap:[[660,.05]],turn:[[523,.09],[784,.12]],win:[[523,.1],[659,.1],[784,.1],[1047,.22]],lose:[[392,.14],[311,.22]],pop:[[880,.04]]}[kind]||[];
  let t=actx.currentTime;for(const [f,dur] of N){const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+dur+.02);t+=dur*.9;}
}
function buzz(){try{navigator.vibrate&&navigator.vibrate(120);}catch(e){}}
function confetti(){
  const c=document.createElement('canvas');c.className='confetti';document.body.appendChild(c);const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const P=Array(120).fill(0).map(()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.5,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,r:Math.random()*6,c:COLS[rnd(8)],a:Math.random()*6}));
  let f=0;const step=()=>{x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.a+=.1;x.fillStyle=p.c;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillRect(-4,-2,8,5);x.restore();});if(++f<160)requestAnimationFrame(step);else c.remove();};step();
}

/* ================= room ================= */
let roomP=null;
function getRoom(){
  if(!roomP)roomP=(async()=>{
    for(let k=0;k<(window.WSROOM&&WSROOM.available()?5:40)&&!(window.claude&&window.claude.use);k++)await new Promise(r=>setTimeout(r,100));
    if(window.claude&&window.claude.use){try{const r=await window.claude.use('room');if(r)return r;}catch(e){}}
    if(window.WSROOM&&WSROOM.available())return WSROOM.room();
    return null;
  })();
  return roomP;
}
function genCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<6;i++)c+=A[rnd(A.length)];return c;}
let lastPeers=[];
function takenRoles(){const t=new Set();for(const p of lastPeers){if(p.sameTab||p.kind!=='viewer')continue;const r=(p.presence||{}).r;if(typeof r==='number')t.add(r);}return t;}
function pickRole(pref){const t=takenRoles(),c=cfg(),k=c.kick||[];
  const okRole=r=>r>=0&&r<MAXP&&!t.has(r)&&!k.includes(r);
  if(c.lock)return typeof pref==='number'&&(c.members||[]).includes(pref)&&okRole(pref)?pref:null;
  if(typeof pref==='number'&&okRole(pref))return pref;for(let r=1;r<MAXP;r++)if(okRole(r))return r;return okRole(0)?0:null;}
async function enterRoom(code,host,restore,given){
  S.joining=true;S.roomErr=null;render();
  const room=given||await getRoom();
  if(!room){S.joining=false;S.roomErr='اللعب أونلاين يشتغل من رابط الموقع على Cloudflare، أو من صفحة claude.ai.';render();return;}
  let nr;
  try{nr=await room.join('g-'+code.toLowerCase());}
  catch(e){S.joining=false;S.roomErr=given?'ما قدرت أدخل الغرفة القريبة، قرّب من صاحب الغرفة وجرّب مرة ثانية.':'ما قدرت أتصل بالغرفة، تأكد من النت وجرّب مرة ثانية.';render();return;}
  S.mode='online';S.via=given?'near':'net';S.code=code;S.nr=nr;S.joining=false;S.chat={};S.myChat=[];S.chatReady=false;S.chatSeen=Date.now();S.priv=Array(MAXP).fill(null);S.seen=null;S.roles=new Set();S.names={};lastPeers=[];S.browse=false;S.modal=null;
  if(restore&&restore.st){S.st={cfg:{...CFG0},...restore.st};if(!Array.isArray(S.st.sc)||S.st.sc.length<MAXP)S.st.sc=Array(MAXP).fill(0);}
  else S.st={g:null,s:host?1:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};
  if(host){S.me=0;S.pending=false;if(!restore)S.modal='settings';}
  else{S.me=null;S.pending=true;
    setTimeout(()=>{if(S.nr!==nr)return;S.me=pickRole(restore?restore.me:null);if(S.me!=null&&restore&&restore.me===S.me)S.priv[S.me]=restore.priv||null;S.pending=false;recomputeRoles();afterChange();},1500);}
  nr.onPeers(onPeers,()=>{toast('انقطع الاتصال، نحاول نرجع…');});
  afterChange();
}
function leaveRoom(msg){if(S.nr)S.nr.leave().catch(()=>{});S.nr=null;S.via=null;S.mode=null;S.modal=null;if(msg)toast(msg);render();}
function recomputeRoles(){const s=new Set();if(S.me!=null)s.add(S.me);for(const p of lastPeers){if(p.sameTab||p.kind!=='viewer')continue;const r=(p.presence||{}).r;if(typeof r==='number')s.add(r);}S.roles=s;}
function onPeers(ch){
  if(S.mode!=='online')return;
  lastPeers=ch.peers;let adopt=null;
  for(const p of ch.peers){
    if(p.sameTab){S.myPeer=p.peer;continue;}
    if(p.kind!=='viewer')continue;const pr=p.presence||{};
    if(typeof pr.r==='number'){S.priv[pr.r]=pr.p??S.priv[pr.r];if(typeof pr.n==='string')S.names[pr.r]=pr.n;
      if(Array.isArray(pr.ch))for(const m of pr.ch){if(m&&m.i&&!S.chat[m.i]&&typeof m.x==='string'){S.chat[m.i]={i:m.i,r:pr.r,n:pr.n||'',t:+m.t||Date.now(),x:m.x.slice(0,200)};if(S.chatReady&&S.modal!=='chat'&&!(S.browse||!S.st.g)){chatPop(S.chat[m.i]);}}}
      if(pr.rx&&pr.rx.t>(S.rxSeen[pr.r]||0)){S.rxSeen[pr.r]=pr.rx.t;if(Date.now()-pr.rx.t<8000)setTimeout(()=>floatRx(pr.r,pr.rx.e),0);}}
    if(S.me!=null&&pr.r===S.me&&String(p.peer)<String(S.myPeer)){S.me=pickRole(null);}
    if(typeof pr.s!=='number')continue;
    const better=pr.s>S.st.s||(pr.s===S.st.s&&pr.r===0&&S.me!==0&&JSON.stringify(pr.d??null)!==JSON.stringify(S.st.d));
    if(better&&(!adopt||pr.s>adopt.s))adopt=pr;
  }
  recomputeRoles();S.chatReady=true;
  if(adopt){
    const oldGid=S.st.d&&S.st.d.gid,oldG=S.st.g;
    S.st={g:adopt.g??null,s:adopt.s,d:adopt.d??null,sc:Array.isArray(adopt.sc)?adopt.sc:Array(MAXP).fill(0),cfg:{...CFG0,...(adopt.cfg||{})}};
    if(S.st.g!==oldG){resetUI();S.browse=false;S.showResult=false;}else if((S.st.d&&S.st.d.gid)!==oldGid){resetUI();S.showResult=false;}
    if(S.me!=null&&(cfg().kick||[]).includes(S.me)){try{localStorage.removeItem(LSK.room);}catch(e){}leaveRoom('صاحب الغرفة طلّعك منها');return;}
    ensurePriv();publish();
  }
  render();queueSimul();
}

/* ================= helpers ================= */
function toast(t){const el=document.createElement('div');el.className='toast';el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2000);}
function mySeat(d){return S.mode==='local'?null:d.pl.indexOf(S.me);}
function mkCtx(){
  const d=S.st.d,G=GAMES[S.st.g],local=S.mode==='local';
  const v=local?(G.viewer?G.viewer(d,S.priv):d.turn):d.pl.indexOf(S.me);
  const extra=G.canAct?G.canAct(d,S.priv):true;
  if(G.resolve){const ok=v!=null&&v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v);return {local,v,priv:S.priv,my:ok&&extra,simul:true};}
  return {local,v,priv:S.priv,my:d.win==null&&extra&&(local||d.turn===v)};
}
function turnTxt(d,ctx){
  if(!ctx.local&&d.turn===ctx.v)return '<b class="yt">دورك</b>';
  return `دور ${nameTag(d,d.turn)}`;
}
function absentSeats(d,G){if(S.mode!=='online'||d.win!=null)return [];if(G.resolve)return aliveSeats(d).filter(s=>!S.roles.has(d.pl[s])&&!hasPicked(d,s));return S.roles.has(d.pl[d.turn])?[]:[d.turn];}
function winTitle(d,G,ctx){if(Array.isArray(d.wins)&&d.wins.length>1&&!(G.winText&&G.winText(d)))return !ctx.local&&d.wins.includes(ctx.v)?'فزتوا! 🎉':`فاز ${d.wins.map(w=>nm(d,w)).join(' و')}!`;return G.winText&&G.winText(d)||(d.win==='d'?'تعادل!':(!ctx.local&&d.win===ctx.v?'فزت! 🎉':`فاز ${nm(d,d.win)}!`));}
function statusHTML(d,G,ctx){
  if(d.win!=null){
    const c=typeof d.win==='number'?col(d,d.win):'var(--ink)';
    return `<span class="w" style="color:${c}">${winTitle(d,G,ctx)}</span> <button class="sm go" data-a="again">جولة جديدة</button>`+(G.winExtra?`<br><small>${G.winExtra(d,ctx)}</small>`:'');
  }
  let s=G.status?G.status(d,ctx):turnTxt(d,ctx);
  if(!ctx.local&&ctx.v<0)s+='<br><small>تتفرج الحين، وتدخل معهم في الجولة الجاية</small>';
  const gone=absentSeats(d,G);
  if(!ctx.local&&gone.length)s+=`<br><small>${gone.map(x=>nm(d,x)).join('، ')} طلع من الغرفة</small> <button class="sm" data-a="skip">تخطّاه</button>`;
  return s;
}
function matchLeader(){const t=cfg().target;if(!t)return null;const sc=S.st.sc;const mx=Math.max(...sc);return mx>=t?sc.indexOf(mx):null;}

/* ================= screens ================= */
function render(){
  const vk=S.mode+'|'+S.st.g+'|'+(S.st.d&&S.st.d.gid)+'|'+!!S.browse+'|'+(S.modal||'');
  if(S.holdRender){if(S.holdVK==null)S.holdVK=S.lastVK;if(vk===S.holdVK){S.renderPending=true;return;}S.holdRender=false;}
  S.holdVK=null;S.renderPending=false;S.lastVK=vk;
  const ae=document.activeElement,fid=ae&&ae.dataset&&ae.dataset.draft,cs=fid&&ae.selectionStart;
  if(S.mode===null)renderHome();
  else if(S.mode==='lobby')renderLobby();
  else if(S.mode==='near')renderNear();
  else if(!S.st.g||!GAMES[S.st.g]||!S.st.d||S.browse)renderGrid();
  else renderGame();
  if(S.modal)app.insertAdjacentHTML('beforeend',modalHTML());
  app.querySelectorAll('.msgs').forEach(b=>{b.scrollTop=b.scrollHeight;});
  if(fid){const el=app.querySelector(`[data-draft="${fid}"]`);if(el){el.focus();try{el.setSelectionRange(cs,cs);}catch(e){}}}
  const G=GAMES[S.st.g];if(G&&G.after&&S.st.d&&!S.browse&&(S.mode==='online'||S.mode==='local'))G.after(S.st.d,mkCtx());
}
function topBar(title,back,extra){
  return `<div class="top"><button class="ib" data-a="${back}" aria-label="رجوع">${BACK}</button><h1>${title}</h1>${extra||''}<button class="ib" data-a="mute" aria-label="الصوت">${S.mute?'🔇':'🔊'}</button></div>`;
}
function renderHome(){
  app.innerHTML=`<div class="hero">${LOGO}<h1>ألعابنا</h1><p>${Object.keys(GAMES).length} لعبة، من لاعبين اثنين إلى ${MAXP}</p></div>
  <button class="big red" data-a="local">على نفس الجهاز<small>كلكم على جوال واحد</small></button>
  <button class="big blue" data-a="lobby">أونلاين<small>كل واحد من جهازه بغرفة خاصة</small></button>
  ${window.NEARROOM&&NEARROOM.available()?'<button class="big green" data-a="near">قريب بدون إنترنت<small>بلوتوث، وكلكم في نفس المكان</small></button>':''}
  ${S.update?`<a class="upd" href="${S.update.apk}" target="_blank" rel="noopener">⬇️ فيه نسخة أحدث من التطبيق، اضغط وحمّلها</a>`:''}`;
}
function renderNear(){
  const L=S.nearList||[];
  app.innerHTML=`${topBar('قريب بدون إنترنت','home')}
  <div class="panel"><h3>اسمك</h3><input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="مثلًا: محمد" autocomplete="off"></div>
  <div class="panel"><h3>أنشئ غرفة قريبة</h3><p>أصحابك اللي جنبك يشوفون غرفتك عندهم ويدخلون بضغطة، بدون إنترنت</p><button class="big red" data-a="ncreate" ${S.joining?'disabled':''}>أنشئ غرفة</button></div>
  <div class="panel"><h3>الغرف القريبة</h3>${L.length?`<div class="nlist">${L.map((f,i)=>`<button class="nroom" data-a="njoin" data-i="${i}" ${S.joining?'disabled':''}><b>${escH(f.host)||'غرفة'}</b><span>${f.code}</span><i>ادخل</i></button>`).join('')}</div>`:`<p class="scan"><i></i>ندوّر على غرف قريبة…</p>`}
  <p class="note">خل البلوتوث شغّال، ووافق على صلاحية الأجهزة القريبة لو طلبها الجوال</p></div>
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}`;
}
async function startNear(){S.mode='near';S.roomErr=null;S.nearList=[];render();
  const ok=await NEARROOM.scan(list=>{S.nearList=list;if(S.mode==='near')render();});
  if(!ok&&S.mode==='near'){S.roomErr='ما قدرت أدوّر على الغرف القريبة. وافق على صلاحية الأجهزة القريبة وشغّل البلوتوث، وبعدها ارجع وادخل مرة ثانية.';render();}}
function renderLobby(){
  const sv=loadSaved();
  app.innerHTML=`${topBar('أونلاين','home')}
  <div class="panel"><h3>اسمك</h3><input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="مثلًا: محمد" autocomplete="off"></div>
  <div class="panel"><h3>أنشئ غرفة</h3><p>تاخذ رمز خاص وترسله لأصحابك، وما يدخلها إلا اللي معه الرمز. وتقدر تحدد قواعدها</p><button class="big red" data-a="create" ${S.joining?'disabled':''}>أنشئ غرفة</button></div>
  <div class="panel"><h3>ادخل غرفة</h3><p>اكتب الرمز اللي وصلك</p><input class="code" id="code" maxlength="6" autocomplete="off" placeholder="······"><button class="big blue" data-a="join" ${S.joining?'disabled':''}>ادخل</button></div>
  ${sv&&sv.code&&sv.via!=='near'?`<button class="link" data-a="resume">ارجع لغرفتك ${sv.code}</button>`:''}
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}`;
}
function roomBar(){
  if(S.mode!=='online')return '';
  const pl=players(),h=actingHost();
  const me=S.pending?'<span class="chip" style="background:var(--mut)">جاري اختيار لونك…</span>':S.me==null?'<span class="chip" style="background:var(--mut)">تتفرج</span>':'';
  return `<div class="roombar"><span>${S.via==='near'?'📶 غرفة قريبة':'الغرفة'}</span><b class="code">${S.code}</b>${cfg().lock?'<span title="مقفلة">🔒</span>':''}<span class="sp"></span>${S.via==='near'?'':'<button class="sm" data-a="copy">نسخ الرمز</button>'}<button class="sm" data-a="m-settings">⚙️</button>
  <div class="rbp">${me}${pl.map(r=>`<span class="chip" data-r="${r}" style="background:${COLS[r]}">${r===h?'👑 ':''}${r===S.me?'أنت':pname(r)}</span>`).join('')}<span class="note" style="margin:0 4px">${pl.length} من ${MAXP}</span></div></div>`;
}
const NEWG=['mono','ludo','jakaro','arena','tanks','dwars','duel','tapwar'];
const CATS=[['board','ألعاب لوحة'],['fight','ألعاب قتالية'],['cards','ورق وزهر'],['mind','ذكاء وتخمين'],['quiz','مسابقات وتحدي']];
const iconE=(bg,e,fg)=>`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="44" r="30" fill="${fg||'rgba(255,255,255,.22)'}"/><text x="50" y="58" text-anchor="middle" font-size="40">${e}</text></svg>`;
function standings(){
  const rs=S.mode==='local'?players():[...new Set([...players(),...S.st.sc.map((x,r)=>x>0?r:-1).filter(r=>r>=0)])];
  if(!rs.some(r=>S.st.sc[r]>0))return '';const t=cfg().target;
  return `<div class="panel standings"><b>نقاط الجلسة${t?` (الفوز بالمباراة عند ${t})`:''}</b><div class="score" style="margin:6px 0 0">${rs.sort((a,b)=>S.st.sc[b]-S.st.sc[a]).map(r=>`<div class="pl" style="background:${COLS[r]}">${PERSON}<b>${S.st.sc[r]}</b><span>${r===S.me?'أنت':pname(r)}</span></div>`).join('')}</div></div>`;
}
function renderGrid(){
  let mid='';
  if(S.mode==='local')mid=`<div class="panel"><div class="stepper" style="box-shadow:none;margin:0"><span>عدد اللاعبين</span><button data-a="dec">−</button><b>${S.localN}</b><button data-a="inc">+</button></div>
    <div class="names">${[...Array(S.localN).keys()].map(r=>`<input class="field nm" style="border-color:${COLS[r]}" data-draft="ln${r}" value="${escH(S.localNames[r]||'')}" placeholder="${NAMES[r]}" maxlength="14">`).join('')}</div></div>`;
  else{
    const live=S.st.g&&S.st.d&&GAMES[S.st.g];
    if(live)mid+=`<div class="panel live"><b>اللعبة الحالية: ${GAMES[S.st.g].name}</b><button class="sm go" data-a="resumegame">ارجع لها</button></div>`;
    mid+=`<div class="panel"><h3 style="margin:0 0 6px">💬 دردشة الغرفة</h3>${chatHTML()}</div>`;S.chatSeen=Date.now();
    mid+=players().length<2?'<p class="note">بانتظار لاعب ثاني على الأقل. أرسل لهم رمز الغرفة</p>':canPick()?'<p class="note">أي لعبة تختارها تنفتح عند الكل</p>':'<p class="note">صاحب الغرفة 👑 هو اللي يختار اللعبة</p>';
  }
  const q=normQ(S.draft.q||'');
  const list=k=>!q||normQ(GAMES[k].name).includes(q);
  app.innerHTML=`${topBar('اختر لعبة',S.mode==='online'?'leave':'home',S.mode==='local'?'<button class="ib" data-a="m-settings">⚙️</button>':'')}${roomBar()}${mid}${standings()}
  <input class="field search" data-draft="q" value="${escH(S.draft.q||'')}" placeholder="🔍 دوّر على لعبة" autocomplete="off">
  ${CATS.map(([c,t])=>{const ks=Object.keys(GAMES).filter(k=>(GAMES[k].cat||'board')===c&&list(k)).sort((a,b)=>NEWG.includes(b)-NEWG.includes(a));return ks.length?`<h2 class="cat">${t} <small>${ks.length}</small></h2><div class="grid">${ks.map(k=>`<button class="gcard" data-a="pick" data-g="${k}">${GAMES[k].icon}${NEWG.includes(k)?'<i class="newb">جديد</i>':''}<div class="lb" style="background:${GAMES[k].lbc}">${GAMES[k].name}</div></button>`).join('')}</div>`:'';}).join('')}`;
}
const normQ=t=>String(t).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ً-ْ]/g,'').trim();
function scoreBar(sc,d){
  const G=GAMES[S.st.g];let pts=null;try{pts=G.points?G.points(d):(Array.isArray(d.pts)?d.pts:null);}catch(e){}
  const simul=!!G.resolve;
  return `<div class="players">${d.pl.map((r,s)=>{const me=S.mode==='online'&&r===S.me;const label=me?'أنت':pname(r);const on=d.win==null&&!simul&&d.turn===s;
    const pk=simul&&d.win==null&&d.out[s]!=='1'?(hasPicked(d,s)?'<u>✓</u>':'<u class="w8">…</u>'):'';
    return `<div class="pchip ${on?'on':''} ${d.out[s]==='1'?'out':''}" data-r="${r}" style="--c:${COLS[r]}"><i>${pname(r).replace(/&[^;]+;/g,'').charAt(0)||'•'}</i><span>${label}</span>${pk}${pts?`<em>${pts[s]}</em>`:''}${sc[r]?`<b>🏆${sc[r]}</b>`:''}</div>`;}).join('')}</div>`;
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
  // alerts: your turn, results
  const myNow=!cover&&S.mode==='online'&&ctx.my;
  if(myNow&&!S.wasMy){sfx('turn');buzz();if(!G.resolve&&d.win==null){const b=document.createElement('div');b.className='ytb';b.style.setProperty('--c',col(d,ctx.v));b.textContent='دورك! 🎯';document.body.appendChild(b);setTimeout(()=>b.remove(),1700);}}S.wasMy=myNow;
  const enter=S.enterKey!==g+d.gid;S.enterKey=g+d.gid;
  if(d.win!=null&&S.winKey!==d.gid){S.winKey=d.gid;S.showResult=true;const mine=S.mode==='local'||d.win===ctx.v||(Array.isArray(d.wins)&&d.wins.includes(ctx.v));sfx(mine||d.win==='d'?'win':'lose');if(mine&&d.win!=='d')setTimeout(confetti,50);}
  const left=timeLeft();
  app.innerHTML=`${topBar(G.name,S.mode==='online'?'browse':'grid','<button class="ib" data-a="m-help" aria-label="القواعد">؟</button>')}${roomBar()}${scoreBar(sc,d)}
  <div class="tbar" style="${left==null?'display:none':''}"><i style="width:${left==null?0:left/cfg().timer*100}%"></i></div>
  <div class="status ${ctx.my&&!cover&&S.mode==='online'?'mine':''}">${cover?'':statusHTML(d,G,ctx)}</div><div class="board ${enter?'enter':''}">${body}</div>
  ${S.mode==='online'?`<div class="rx">${S.me!=null?'<button class="rxb" data-a="m-react">😊</button>':''}<button class="rxb" data-a="m-chat">💬${unread()?`<i class="badge">${unread()}</i>`:''}</button></div>`:''}
  ${d.win!=null&&S.showResult&&!cover?resultHTML(d,G,ctx):''}`;
}
function resultHTML(d,G,ctx){
  const c=typeof d.win==='number'?col(d,d.win):'var(--ink)';const ml=matchLeader();
  return `<div class="sheet-bg" data-a="closeres"><div class="sheet result">
    <div class="trophy">${d.win==='d'?'🤝':typeof d.win==='number'&&(S.mode==='local'||d.win===ctx.v||(Array.isArray(d.wins)&&d.wins.includes(ctx.v)))?'🏆':'🎖️'}</div>
    <h2 style="color:${c}">${winTitle(d,G,ctx)}</h2>${G.winExtra?`<p class="note">${G.winExtra(d,ctx)}</p>`:''}
    ${ml!=null?`<p class="hint">🏅 ${ml===S.me?'أنت فزت':pname(ml)+' فاز'} بالمباراة! (${S.st.sc[ml]} نقاط)</p>`:''}
    <div class="score">${d.pl.map(r=>`<div class="pl" style="background:${COLS[r]}">${PERSON}<b>${S.st.sc[r]}</b><span>${r===S.me?'أنت':pname(r)}</span></div>`).join('')}</div>
    <div class="acts"><button class="btn red" data-a="again">جولة جديدة</button><button class="btn navy" data-a="${S.mode==='online'?'browse':'grid'}">قائمة الألعاب</button></div>
    <button class="link" data-a="closeres">شوف اللوحة</button></div></div>`;
}
const RX=['👏','😂','😮','🔥','👍','❤️','😢','😡','🤔','🙏'];
function modalHTML(){
  const m=S.modal,c=cfg(),h=isHost();
  let inner='';
  if(m==='help'){const G=GAMES[S.st.g];inner=`<h2>${G?G.name:''}</h2><p style="line-height:1.9">${(typeof HELP!=='undefined'&&HELP[S.st.g])||'اتبع التعليمات اللي تطلع فوق اللوحة.'}</p>`;}
  else if(m==='chat'){S.chatSeen=Date.now();inner=`<h2>💬 دردشة الغرفة</h2>${chatHTML()}`;}
  else if(m==='react'){inner=`<h2>رد سريع</h2><div class="row">${RX.map((e,i)=>`<button class="rxe" data-a="rx" data-i="${i}">${e}</button>`).join('')}</div>`;}
  else if(m==='settings'){
    const opt=(key,val,label)=>`<button class="seg ${c[key]===val?'on':''}" data-a="cfg" data-k="${key}" data-v="${val}" ${h?'':'disabled'}>${label}</button>`;
    inner=`<h2>إعدادات ${S.mode==='online'?'الغرفة':'اللعب'}</h2>
    ${S.mode==='online'?`<label class="lab">اسمك</label><input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="${S.me!=null?NAMES[S.me]:''}">`:''}
    ${S.mode==='online'&&!h?'<p class="note">القواعد يحددها صاحب الغرفة 👑</p>':''}
    ${S.mode==='online'?`<label class="lab">مين يختار اللعبة</label><div class="segs">${opt('pick','host','صاحب الغرفة')}${opt('pick','all','الكل')}</div>`:''}
    <label class="lab">وقت كل دور</label><div class="segs">${opt('timer',0,'بدون')}${opt('timer',15,'15 ث')}${opt('timer',30,'30 ث')}${opt('timer',60,'دقيقة')}</div>
    <label class="lab">المباراة تنتهي عند</label><div class="segs">${opt('target',0,'مفتوحة')}${opt('target',3,'3 انتصارات')}${opt('target',5,'5')}${opt('target',10,'10')}</div>
    ${S.mode==='online'?`<label class="lab">قفل الغرفة</label><div class="segs">${opt('lock',false,'مفتوحة')}${opt('lock',true,'مقفلة على اللي فيها')}</div>
    ${h&&players().length>1?`<label class="lab">طرد لاعب</label><div class="segs">${players().filter(r=>r!==S.me).map(r=>`<button class="seg" style="background:${COLS[r]};color:#fff" data-a="kick" data-i="${r}">${pname(r)} ✕</button>`).join('')}</div>`:''}
    ${h&&(c.kick||[]).length?`<button class="link" data-a="unkick">السماح للمطرودين يرجعون</button>`:''}`:''}
    ${h?`<button class="link" data-a="resetsc" style="color:var(--red)">تصفير نقاط الجلسة</button>`:''}`;
  }
  return `<div class="sheet-bg" data-a="closemodal"><div class="sheet">${inner}<button class="big navy" data-a="closemodal">تم</button></div></div>`;
}
function chatList(){return Object.values(S.chat).sort((a,b)=>a.t-b.t).slice(-60);}
function unread(){return Object.values(S.chat).filter(m=>m.t>S.chatSeen&&m.r!==S.me).length;}
function chatName(m){return m.r===S.me?'أنت':(escH((S.names[m.r]||m.n||'').slice(0,14))||NAMES[m.r]||'لاعب');}
function chatHTML(){const L=chatList();
  return `<div class="chatbox"><div class="msgs">${L.length?L.map(m=>`<div class="msg ${m.r===S.me?'me':''}"><b style="color:${COLS[m.r]||'#888'}">${chatName(m)}</b><span>${escH(m.x)}</span></div>`).join(''):'<p class="note">ما فيه رسائل للحين. قول هلا 👋</p>'}</div>
  <div class="chatin"><input class="field" data-draft="chat" value="${escH(S.draft.chat||'')}" maxlength="200" placeholder="اكتب رسالة" autocomplete="off"><button class="sm go" data-a="send">إرسال</button></div></div>`;}
function sendChat(){const x=String(S.draft.chat||'').trim().slice(0,200);if(!x||S.mode!=='online')return;const m={i:rid()+rid(),t:Date.now(),x};S.myChat=[...S.myChat,m].slice(-10);S.chat[m.i]={...m,r:S.me,n:S.myName};S.draft.chat='';S.chatSeen=Date.now();publish();render();
  const el=app.querySelector('[data-draft="chat"]');if(el)el.focus();}
function chatPop(m){sfx('pop');const el=document.createElement('div');el.className='chatpop';el.innerHTML=`<b style="color:${COLS[m.r]||'#888'}">${chatName(m)}</b> ${escH(m.x)}`;el.addEventListener('click',()=>{S.modal='chat';S.chatSeen=Date.now();render();el.remove();});document.body.appendChild(el);setTimeout(()=>el.remove(),3500);}
function floatRx(r,i){
  const e=RX[i];if(!e)return;const ch=app.querySelector(`.pl[data-r="${r}"]`)||app.querySelector(`.chip[data-r="${r}"]`);
  const el=document.createElement('div');el.className='floatrx';el.textContent=e;
  const b=ch?ch.getBoundingClientRect():{left:innerWidth/2,top:120,width:0};el.style.left=(b.left+b.width/2-18)+'px';el.style.top=(b.top+scrollY-10)+'px';
  document.body.appendChild(el);sfx('pop');setTimeout(()=>el.remove(),2200);
}

app.addEventListener('click',e=>{
  const t=e.target.closest('[data-a],[data-ga]');if(!t||t.disabled)return;
  if(t.classList.contains('sheet-bg')&&e.target!==t)return;
  const i=t.dataset.i!=null?+t.dataset.i:null;
  if(t.dataset.ga){const G=GAMES[S.st.g];if(G&&S.st.d)G.click(t.dataset.ga,i,S.st.d,mkCtx());return;}
  switch(t.dataset.a){
    case 'home':if(S.mode==='near'&&window.NEARROOM)NEARROOM.stopAll();S.mode=null;render();break;
    case 'near':startNear();break;
    case 'ncreate':{const c=genCode();enterRoom(c,true,null,NEARROOM.room('host',{code:c,name:S.myName}));break;}
    case 'njoin':{const f=(S.nearList||[])[i];if(f)enterRoom(f.code,false,null,NEARROOM.room('join',{id:f.id,code:f.code,name:S.myName}));break;}
    case 'local':S.mode='local';S.me=null;S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;render();break;
    case 'inc':S.localN=Math.min(MAXP,S.localN+1);save();render();break;
    case 'dec':S.localN=Math.max(2,S.localN-1);save();render();break;
    case 'lobby':S.mode='lobby';S.roomErr=null;render();getRoom();break;
    case 'create':enterRoom(genCode(),true,null);break;
    case 'join':{
      const c=(document.getElementById('code').value||'').trim().toUpperCase();
      if(!/^[A-Z0-9]{4,6}$/.test(c)){S.roomErr='اكتب رمز الغرفة كامل';render();return;}
      const sv=loadSaved();const same=sv&&sv.code===c;
      if(same&&sv.me===0)enterRoom(c,true,sv);else enterRoom(c,false,same?sv:null);break;}
    case 'resume':{const sv=loadSaved();if(sv)enterRoom(sv.code,sv.me===0,sv);break;}
    case 'leave':leaveRoom();break;
    case 'grid':setGame(null);break;
    case 'browse':S.browse=true;S.showResult=false;render();break;
    case 'resumegame':S.browse=false;render();break;
    case 'pick':{const g=t.dataset.g;
      if(S.mode==='online'&&!canPick()){if(S.st.g===g&&S.st.d){S.browse=false;render();}else toast('صاحب الغرفة 👑 هو اللي يختار اللعبة');return;}
      if(S.mode==='online'&&S.st.g===g&&S.st.d&&S.st.d.win==null){S.browse=false;render();return;}
      setGame(g);break;}
    case 'again':newRound();break;
    case 'reveal':S.seen=i;S.tgt=null;render();break;
    case 'closeres':S.showResult=false;render();break;
    case 'skip':{const d=S.st.d;if(!d||d.win!=null)return;const G=GAMES[S.st.g];let out=d.out;for(const x of absentSeats(d,G))out=setAt(out,x,'1');const al=aliveSeats(d,out);
      const nd={...d,out,turn:out[d.turn]==='1'?nextSeat(d,d.turn,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd):nd);break;}
    case 'copy':try{navigator.clipboard.writeText(S.code).then(()=>toast('انسخ الرمز: '+S.code)).catch(()=>toast('الرمز: '+S.code));}catch(err){toast('الرمز: '+S.code);}break;
    case 'mute':S.mute=!S.mute;lsSet(LSK.mute,S.mute?'1':'0');if(!S.mute)sfx('pop');render();break;
    case 'm-settings':S.modal='settings';render();break;
    case 'm-help':S.modal='help';render();break;
    case 'm-react':S.modal='react';render();break;
    case 'm-chat':S.modal='chat';S.chatSeen=Date.now();render();setTimeout(()=>{const b=document.querySelector('.msgs');if(b)b.scrollTop=b.scrollHeight;},0);break;
    case 'send':sendChat();break;
    case 'closemodal':S.modal=null;render();break;
    case 'rx':{S.modal=null;const rx={e:i,t:Date.now()};S.rxSeen[S.me]=rx.t;render();floatRx(S.me,i);publish(rx);break;}
    case 'cfg':{if(!isHost())return;let v=t.dataset.v;v=v==='true'?true:v==='false'?false:/^\d+$/.test(v)?+v:v;const p={[t.dataset.k]:v};if(t.dataset.k==='lock'&&v)p.members=players();setCfg(p);break;}
    case 'kick':{if(!isHost())return;const r=i;setCfg({kick:[...new Set([...(cfg().kick||[]),r])]});const d=S.st.d;if(d&&d.win==null&&d.pl.includes(r)){const s=d.pl.indexOf(r);const out=setAt(d.out,s,'1');const al=aliveSeats(d,out);const G=GAMES[S.st.g];
      const nd={...d,out,turn:d.turn===s?nextSeat(d,s,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd):nd);}toast(pname(r)+' طلع من الغرفة');break;}
    case 'unkick':setCfg({kick:[]});break;
    case 'resetsc':if(!isHost())return;S.st={...S.st,sc:Array(MAXP).fill(0),s:S.st.s+1};afterChange();toast('تصفّرت النقاط');break;
  }
});
app.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.draft;if(!k)return;S.draft=S.draft||{};S.draft[k]=e.target.value;
  if(e.target.type==='range'){const bn=e.target.closest('.board')&&e.target.closest('.board').querySelector('.big-num');if(bn)bn.textContent=e.target.value;}
  if(k==='myname'){S.myName=e.target.value.trim().slice(0,14);lsSet(LSK.name,S.myName);clearTimeout(S.nmT);S.nmT=setTimeout(()=>publish(),400);}
  else if(/^ln\d$/.test(k)){S.localNames[+k[2]]=e.target.value;save();}
  else if(k==='q')render();});
app.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target.id==='code'){const b=app.querySelector('[data-a="join"]');if(b)b.click();}else if(e.target.dataset&&e.target.dataset.draft==='chat'){e.preventDefault();sendChat();}});

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

const SERVER='https://gamesx.alqadi1423.workers.dev';
const isApp=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
function appSetup(){
  const A=Capacitor.Plugins&&Capacitor.Plugins.App;let lastBack=0;
  if(A)A.addListener('backButton',()=>{
    if(S.modal){S.modal=null;render();return;}
    const b=app.querySelector('.top .ib');const act=b&&b.dataset.a;
    if(S.mode===null||act==='leave'){if(Date.now()-lastBack<2000){if(act==='leave')leaveRoom();else A.exitApp();return;}lastBack=Date.now();toast(act==='leave'?'اضغط رجوع مرة ثانية للخروج من الغرفة':'اضغط رجوع مرة ثانية للخروج');return;}
    if(b)b.click();});
  // tell the player when a newer app build is out
  const el=document.querySelector('script[src*="core.js"]');const mine=+((el&&/v=(\d+)/.exec(el.src)||[])[1]||0);
  fetch(SERVER+'/version.json',{cache:'no-store'}).then(r=>r.json()).then(j=>{if(j&&+j.v>mine&&j.apk){S.update=j;if(S.mode===null)render();}}).catch(()=>{});
}
function boot(){render();if(isApp())appSetup();}

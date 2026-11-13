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
/* a die you tap to roll: no separate roll button */
const tapDie=(n,can,c,cls,ga)=>`<${can?'button':'div'} class="tapd ${can?'can':''} ${cls||''}" ${can?`data-ga="${ga||'roll'}" aria-label="ارمِ"`:''} style="--c:${c||'var(--line)'}">${diceSVG(n||6)}</${can?'button':'div'}>`;
const onceSet=new Set();const once=k=>{if(onceSet.has(k))return false;onceSet.add(k);return true;};
const escH=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BACK='<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PERSON='<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="5" fill="#fff"/><path d="M3 23c0-6 4-9 9-9s9 3 9 9z" fill="#fff"/></svg>';
const LSK={room:'alaabna.v3',name:'alaabna.name',mute:'alaabna.mute',local:'alaabna.local'};
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};

/* ================= players and names ================= */
/* a game has d.pl = list of roles (colours) taking part; seat i plays role d.pl[i] */
function pname(r){const n=(S.mode==='local'?S.localNames[r]:(r===S.me?S.myName:S.names[r]))||'';return escH(String(n).trim().slice(0,14))||(S.mode==='local'&&S.bots[r]?'🤖 '+BOTL[S.bots[r]]:NAMES[r]);}
/* ================= bots: only on one phone (local mode) ================= */
const BOTL=['','سهل','متوسط','صعب'];
const hasBots=()=>S.mode==='local'&&Object.keys(S.bots||{}).some(r=>S.bots[r]&&+r<S.localN);
const isBot=(d,s)=>S.mode==='local'&&!!(S.bots||{})[d.pl[s]];
const botLv=(d,s)=>(S.bots||{})[d.pl[s]]||1;
const humanSeats=d=>d.pl.map((_,s)=>s).filter(s=>!isBot(d,s));
const col=(d,s)=>COLS[d.pl[s]],lit=(d,s)=>LIGHT[d.pl[s]],nm=(d,s)=>pname(d.pl[s]);
const nameTag=(d,s)=>`<b style="color:${col(d,s)}">${nm(d,s)}</b>`;
function nextSeat(d,from,out){out=out||d.out;const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(out[s]!=='1')return s;}return from;}
const aliveSeats=(d,out)=>{out=out||d.out;return d.pl.map((_,s)=>s).filter(s=>out[s]!=='1');};

/* ================= state ================= */
const CFG0={pick:'host',timer:0,target:0,lock:false,kick:[],members:[]};
const S={draft:{},sel:[],mode:null,localN:2,localNames:[],myName:lsGet(LSK.name)||'',names:{},mute:lsGet(LSK.mute)==='1',
  st:{g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}},me:null,myPeer:null,code:null,nr:null,roles:new Set(),priv:Array(MAXP).fill(null),
  chat:{},myChat:[],chatSeen:Date.now(),seen:null,roomErr:null,joining:false,gw:false,rolled:false,tgt:null,pending:false,browse:false,modal:null,showResult:false,winKey:null,wasMy:false,rxSeen:{}};
try{const l=JSON.parse(lsGet(LSK.local)||'null');if(l){S.localN=l.n||2;S.localNames=l.names||[];S.bots=l.bots||{};}}catch(e){}
S.bots=S.bots||{};
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

/* a game may set its own first mover with start(d,base): e.g. chess always opens with seat 0 (white) */
function newD(g,starter,pl){const n=pl.length;starter=starter%n;const G=GAMES[g],base=G.init(n);const d={...base,gid:rid(),st:starter,turn:starter,pl,out:'0'.repeat(n),win:null};return G.start?G.start(d,base):d;}
function setGame(g){
  if(g){const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
    if(GAMES[g].minP&&pl.length<GAMES[g].minP){toast(`${GAMES[g].name} تحتاج ${GAMES[g].minP} لاعبين أو أكثر`);return;}
    S.st={...S.st,g,s:S.st.s+1,d:newD(g,0,pl)};}
  else S.st={...S.st,g:null,s:S.st.s+1,d:null};
  S.seen=null;S.browse=false;S.showResult=false;resetUI();afterChange();
}
function newRound(){const d=S.st.d;const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
  const G0=GAMES[S.st.g];if(G0&&G0.minP&&pl.length<G0.minP){toast(`${G0.name} تحتاج ${G0.minP} لاعبين أو أكثر`);return;}
  const st=d?(d.st||0)+1:0;S.st={...S.st,s:S.st.s+1,d:newD(S.st.g,st,pl)};S.seen=null;S.showResult=false;resetUI();afterChange();}
function resetUI(){S.gw=false;S.tgt=null;S.wild=null;S.dside=null;S.mm=[];S.draft={...(S.draft.q!=null?{q:S.draft.q}:{})};S.sel=[];S.simon=null;S.lq=null;S.lf=null;S.sp=null;S.mcell=null;S.mprops=false;S.jk=null;S.arA=null;S.dwSel=null;S.rolling=false;}
let ACT_CAP=null;
function act(nd){if(ACT_CAP){ACT_CAP.v=nd;return;}if(hasBots()){const G=GAMES[S.st.g];if(G&&G.botSee)try{G.botSee(nd);}catch(e){}}S.wild=null;S.dside=null;const was=S.st.d&&S.st.d.win!=null;const sc=[...S.st.sc];if(!was&&typeof nd.win==='number')(nd.wins||[nd.win]).forEach(w=>sc[nd.pl[w]]+=(nd.wpts||1));S.st={...S.st,s:S.st.s+1,d:nd,sc};sfx('tap');afterChange();}
function setCfg(patch){S.st={...S.st,cfg:{...cfg(),...patch},s:S.st.s+1};afterChange();}
function setPriv(role,p){S.priv[role]=p;afterChange();}
function afterChange(){ensurePriv();publish();render();queueSimul();}

/* simultaneous rounds: every alive seat stores {rd,pick} in its private part; one resolver applies G.resolve.
   A game can mix both kinds: simulNow(d) says whether the current phase is a simultaneous one */
const isSimul=(G,d)=>!!G.resolve&&(!G.simulNow||!!G.simulNow(d));
let simulT=null;
function queueSimul(){if(simulT)return;simulT=setTimeout(()=>{simulT=null;trySimul();},60);}
// NOPICK marks a seat that chose to give no answer, so the round does not wait for it
const NOPICK='~';
function simulPicks(d){return d.pl.map((r,s)=>{if(d.out[s]==='1')return null;const p=S.priv[r];return p&&p.gid===d.gid&&p.rd===d.rd&&p.pick!=null?(p.pick===NOPICK?null:p.pick):undefined;});}
const isEnforcer=()=>S.mode==='local'||(S.me!=null&&S.me===actingHost());
function trySimul(){
  const {g,d}=S.st;if(!g||!d||d.win!=null)return;const G=GAMES[g];if(!G||!isSimul(G,d))return;
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
  if(S.mode==='local')lsSet(LSK.local,JSON.stringify({n:S.localN,names:S.localNames,bots:S.bots}));
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
  if(isSimul(G,d)){act(G.resolve(d,simulPicks(d).map(x=>x===undefined?null:x)));return;}
  const who=nm(d,d.turn);let nd=G.onTimeout?G.onTimeout(d):{...d,turn:nextSeat(d,d.turn)};
  if('last' in d)nd={...nd,last:`انتهى وقت ${who}`};S.seen=null;act(nd);
}

/* bots think for a moment, then play through the game's own rules */
const BOTMS=[0,1300,1000,800];const BOTQ={},BOTFB={};
setInterval(()=>{if(!hasBots()||!S.st.g||!S.st.d||S.browse||S.holdRender||S.mode!=='local')return;const d=S.st.d,G=GAMES[S.st.g];if(!G||d.win!=null)return;
  if(app.querySelector('.cover'))return;const now=Date.now(),sim=isSimul(G,d);
  // in a simultaneous round every bot thinks at the same time; in a turn only the bot whose turn it is
  const who=sim?aliveSeats(d).filter(s=>isBot(d,s)&&!hasPicked(d,s)):isBot(d,d.turn)?[d.turn]:[];
  const live=new Set();
  for(const s of who){const k=S.st.g+d.gid+':'+S.st.s+':'+s;live.add(k);
    if(!(k in BOTQ)){BOTQ[k]=now+(G.botDelay?G.botDelay(d,s,botLv(d,s)):BOTMS[botLv(d,s)]+rnd(sim?2500:600));continue;}
    if(now>=BOTQ[k]){delete BOTQ[k];runBot(G,d,s);return;}}
  for(const k in BOTQ)if(!live.has(k))delete BOTQ[k];},200);
const botCtx=(d,s)=>({local:false,v:s,priv:S.priv,my:true,bot:true});
function runBot(G,d,s){const lv=botLv(d,s);
  try{if(isSimul(G,d)){if(G.botPick){const p=G.botPick(d,s,lv);simulPick(d,s,p==null?NOPICK:p);}else botClick(G,d,s,lv,true);return;}
    let nd=G.bot?G.bot(d,s,lv):undefined;if(nd===undefined){if(G.bot)BOTFB[S.st.g]=(BOTFB[S.st.g]||0)+1;nd=botClick(G,d,s,lv,false);}if(nd&&nd!==d)act(nd);}
  catch(e){console.error('bot',e);if(!isSimul(G,d))act(G.onTimeout?G.onTimeout(d):{...d,turn:nextSeat(d,d.turn)});else simulPick(d,s,NOPICK);}
  finally{S.sel=[];S.tgt=null;S.wild=null;S.dside=null;}}
// a bot that taps the game's own buttons: used where a game has no smarter player
function botClick(G,d,s,lv,sim){const ctx=botCtx(d,s);
  for(let k=0;k<8;k++){TPL.innerHTML=G.render(d,ctx);const els=[...TPL.content.querySelectorAll('[data-ga]')].filter(e=>!e.hasAttribute('disabled'));if(!els.length)break;
    const e=els[rnd(els.length)];ACT_CAP={v:null};const hold=S.holdRender;S.holdRender=true;
    try{G.click(e.dataset.ga,e.dataset.i!=null?+e.dataset.i:null,d,ctx);}finally{S.holdRender=hold;}const nd=ACT_CAP.v;ACT_CAP=null;
    if(sim){if(hasPicked(S.st.d,s))return;}else if(nd)return nd;}
  if(sim){simulPick(d,s,NOPICK);return;}return G.onTimeout?G.onTimeout(d):{...d,turn:nextSeat(d,d.turn)};}

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
  catch(e){S.joining=false;S.roomErr=given?nearErr(e&&e.message):'ما قدرت أتصل بالغرفة، تأكد من النت وجرّب مرة ثانية.';render();return;}
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
  if(local&&hasBots()){const hs=humanSeats(d),sim=isSimul(G,d);let v;
    if(sim)v=hs.find(s=>d.out[s]!=='1'&&!hasPicked(d,s));else if(!isBot(d,d.turn))v=d.turn;
    if(v==null)v=hs.includes(S.lastHuman)?S.lastHuman:hs[0];if(v==null)v=-1;S.lastHuman=v;
    const extra=G.canAct?G.canAct(d,S.priv):true;
    if(sim)return {local:false,v,priv:S.priv,my:v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v)&&extra,simul:true,bots:true};
    return {local:false,v,priv:S.priv,my:d.win==null&&extra&&d.turn===v,bots:true};}
  const v=local?(G.viewer?G.viewer(d,S.priv):d.turn):d.pl.indexOf(S.me);
  const extra=G.canAct?G.canAct(d,S.priv):true;
  if(isSimul(G,d)){const ok=v!=null&&v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v);return {local,v,priv:S.priv,my:ok&&extra,simul:true};}
  return {local,v,priv:S.priv,my:d.win==null&&extra&&(local||d.turn===v)};
}
function turnTxt(d,ctx){
  if(!ctx.local&&d.turn===ctx.v)return '<b class="yt">دورك</b>';
  return `دور ${nameTag(d,d.turn)}`;
}
function absentSeats(d,G){if(S.mode!=='online'||d.win!=null)return [];if(isSimul(G,d))return aliveSeats(d).filter(s=>!S.roles.has(d.pl[s])&&!hasPicked(d,s));return S.roles.has(d.pl[d.turn])?[]:[d.turn];}
function winTitle(d,G,ctx){if(Array.isArray(d.wins)&&d.wins.length>1&&!(G.winText&&G.winText(d)))return !ctx.local&&d.wins.includes(ctx.v)?'فزتوا! 🎉':`فاز ${d.wins.map(w=>nm(d,w)).join(' و')}!`;return G.winText&&G.winText(d)||(d.win==='d'?'تعادل!':(!ctx.local&&d.win===ctx.v?'فزت! 🎉':`فاز ${nm(d,d.win)}!`));}
function statusHTML(d,G,ctx){
  if(d.win!=null){
    const c=typeof d.win==='number'?col(d,d.win):'var(--ink)';
    return `<span class="w" style="color:${c}">${winTitle(d,G,ctx)}</span> <button class="sm go" data-a="again">جولة جديدة</button>`+(G.winExtra?`<br><small>${String(G.winExtra(d,ctx)).replace(/<br\s*\/?>/g,' • ')}</small>`:'');
  }
  let s=G.status?G.status(d,ctx):turnTxt(d,ctx);
  if(!ctx.local&&ctx.v<0)s+='<br><small>تتفرج الحين، وتدخل معهم في الجولة الجاية</small>';
  const gone=absentSeats(d,G);
  if(!ctx.local&&gone.length)s+=`<br><span class="gone">${gone.map(x=>nm(d,x)).join('، ')} طلع <button class="sm" data-a="skip">تخطّاه</button></span>`;
  return s;
}
/* the status card always has the same height: one quiet line for what just happened, one line for what to do now */
function statusBox(html){
  const parts=String(html).split(/<br\s*\/?>/);const sub=[],main=[];
  for(const p of parts){const t=p.trim();if(!t)continue;if(/^<small>[\s\S]*<\/small>$/.test(t)&&!/<small>[\s\S]*<small>/.test(t))sub.push(t.slice(7,-8));else main.push(t);}
  return `<div class="st-sub">${sub.join(' • ')}</div><div class="st-main">${main.join(' ')}</div>`;
}
function matchLeader(){const t=cfg().target;if(!t)return null;const sc=S.st.sc;const mx=Math.max(...sc);return mx>=t?sc.indexOf(mx):null;}


/* ================= patching the screen in place ================= */
let OUT='';
const TPL=document.createElement('template');
function sameKind(a,b){if(a.nodeType!==b.nodeType||a.nodeName!==b.nodeName)return false;if(a.nodeType!==1)return true;
  return (a.id||'')===(b.id||'')&&(a.getAttribute('data-k')||'')===(b.getAttribute('data-k')||'');}
function patchNode(a,b){
  if(a.nodeType!==1){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;return;}
  const aa=a.attributes;for(let i=aa.length-1;i>=0;i--){const n=aa[i].name;if(!b.hasAttribute(n)&&!(n==='open'&&a.nodeName==='DETAILS'))a.removeAttribute(n);}
  for(const at of b.attributes){if(a.getAttribute(at.name)!==at.value)a.setAttribute(at.name,at.value);}
  const tag=a.nodeName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'){if(document.activeElement!==a&&(tag==='TEXTAREA'||b.hasAttribute('value'))){const v=tag==='TEXTAREA'?b.value:b.getAttribute('value');if(a.value!==v)a.value=v;}if(tag!=='TEXTAREA')return;return;}
  morphKids(a,b);
}
function morphKids(a,b){
  const want=[...b.childNodes];let ids=null;
  for(let j=0;j<want.length;j++){const nb=want[j];let cur=a.childNodes[j];
    if(nb.nodeType===1&&nb.id){if(!ids){ids=new Map();for(const c of a.childNodes)if(c.nodeType===1&&c.id)ids.set(c.id,c);}
      const m=ids.get(nb.id);if(m&&m!==cur&&sameKind(m,nb)){a.insertBefore(m,cur||null);cur=m;}}
    if(cur&&sameKind(cur,nb))patchNode(cur,nb);
    else a.insertBefore(nb,cur||null);
  }
  while(a.childNodes.length>want.length)a.removeChild(a.lastChild);
}
function morph(el,html){TPL.innerHTML=html;morphKids(el,TPL.content);}

/* ================= screens ================= */
function render(){
  const vk=S.mode+'|'+S.st.g+'|'+(S.st.d&&S.st.d.gid)+'|'+!!S.browse+'|'+(S.modal||'');
  if(S.holdRender){if(S.holdVK==null)S.holdVK=S.lastVK;if(vk===S.holdVK){S.renderPending=true;return;}S.holdRender=false;}
  S.holdVK=null;S.renderPending=false;S.lastVK=vk;
  const ae=document.activeElement,fid=ae&&ae.dataset&&ae.dataset.draft,cs=fid&&ae.selectionStart;
  OUT='';
  if(S.mode===null)renderHome();
  else if(S.mode==='lobby')renderLobby();
  else if(S.mode==='near')renderNear();
  else if(!S.st.g||!GAMES[S.st.g]||!S.st.d||S.browse)renderGrid();
  else renderGame();
  // the screen is patched in place: only what changed is touched, so the page does not jump and typing is not lost
  const screen=S.mode+'|'+(S.mode==='online'||S.mode==='local'?(S.st.g&&!S.browse&&S.st.d?'g:'+S.st.g:'grid'):'');
  if(screen!==S.lastScreen){S.lastScreen=screen;app.innerHTML='';window.scrollTo(0,0);}
  morph(app,OUT+(S.modal?modalHTML():''));
  const nm_=chatList().length;app.querySelectorAll('.msgs').forEach(b=>{if(b._n!==nm_||!b._s){b.scrollTop=b.scrollHeight;b._n=nm_;b._s=1;}});
  if(fid&&document.activeElement!==app.querySelector(`[data-draft="${fid}"]`)){const el=app.querySelector(`[data-draft="${fid}"]`);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(cs,cs);}catch(e){}}}
  const strip=app.querySelector('.players');if(strip&&strip.scrollWidth>strip.clientWidth+2){const on=strip.querySelector('.pt.on');const k=S.st.g+':'+(S.st.d&&S.st.d.turn);if(on&&S.stripKey!==k){S.stripKey=k;const c=strip.getBoundingClientRect(),e=on.getBoundingClientRect();strip.scrollBy({left:(e.left+e.width/2)-(c.left+c.width/2),behavior:'smooth'});}}
  const G=GAMES[S.st.g];if(G&&G.after&&S.st.d&&!S.browse&&(S.mode==='online'||S.mode==='local'))G.after(S.st.d,mkCtx());
}
function topBar(title,back,extra){
  return `<div class="top"><button class="ib" data-a="${back}" aria-label="رجوع">${BACK}</button><h1>${title}</h1>${extra||''}<button class="ib" data-a="mute" aria-label="الصوت">${S.mute?'🔇':'🔊'}</button></div>`;
}
function renderHome(){
  OUT=`<div class="hero">${LOGO}<h1>ألعابنا</h1><p>${Object.keys(GAMES).length} لعبة، من لاعبين اثنين إلى ${MAXP}</p></div>
  <button class="big red" data-a="local">على نفس الجهاز<small>كلكم على جوال واحد</small></button>
  <button class="big blue" data-a="lobby">أونلاين<small>كل واحد من جهازه بغرفة خاصة</small></button>
  <button class="big navy" data-a="vsbot">ضد البوت 🤖<small>العب لحالك، وتختار صعوبة البوت</small></button>
  ${window.NEARROOM&&NEARROOM.available()?'<button class="big green" data-a="near">قريب بدون إنترنت<small>بلوتوث، وكلكم في نفس المكان</small></button>':''}
  ${S.update?`<a class="upd" href="${S.update.apk}" target="_blank" rel="noopener">⬇️ فيه نسخة أحدث من التطبيق، اضغط وحمّلها</a>`:''}`;
}
function renderNear(){
  const L=S.nearList||[],D=S.nearDiag||[];
  OUT=`${topBar('قريب بدون إنترنت','home')}
  ${D.length?`<div class="panel ndiag"><h3>قبل ما تبدأ</h3>${D.map(x=>`<div class="nd"><p>${x.t}</p>${x.a?`<button class="btn" data-a="nset" data-w="${x.a}">${x.b}</button>`:''}</div>`).join('')}<button class="big green" data-a="near">حاول مرة ثانية</button></div>`:''}
  <div class="panel"><h3>اسمك</h3><input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="مثلًا: محمد" autocomplete="off"></div>
  <div class="panel"><h3>أنشئ غرفة قريبة</h3><p>أصحابك اللي جنبك يشوفون غرفتك عندهم ويدخلون بضغطة، بدون إنترنت</p><button class="big red" data-a="ncreate" ${S.joining?'disabled':''}>أنشئ غرفة</button></div>
  <div class="panel"><h3>الغرف القريبة</h3>${L.length?`<div class="nlist">${L.map((f,i)=>`<button class="nroom" data-a="njoin" data-i="${i}" ${S.joining?'disabled':''}><b>${escH(f.host)||'غرفة'}</b><span>${f.code}</span><i>ادخل</i></button>`).join('')}</div>`:S.nearScan?`<p class="scan"><i></i>ندوّر على غرف قريبة…</p>`:'<p class="note">البحث متوقف</p>'}</div>
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}
  ${NEARROOM.log.length?`<details class="nlog"><summary>تفاصيل الاتصال</summary><pre>${escH(NEARROOM.log.join('\n'))}</pre></details>`:''}`;
}
// turns a native error into a short Arabic hint, with the raw code kept for us
function nearErr(m){m=String(m||'');const raw=m&&m!=='perm'&&m!=='timeout'?`<small class="ltr nraw">${escH(m.slice(0,90))}</small>`:'';
  let t='ما قدرت أشغّل الغرف القريبة.';
  if(m==='perm'||/PERMISSION/i.test(m))t='الجوال ما أعطى التطبيق صلاحية الأجهزة القريبة أو الموقع.';
  else if(m==='timeout')t='ما رد صاحب الغرفة. قرّبوا من بعض وجرّب مرة ثانية.';
  else if(/LOCATION/i.test(m))t='شغّل الموقع في الجوال.';
  else if(/BLUETOOTH|RADIO/i.test(m))t='شغّل البلوتوث وجرّب مرة ثانية.';
  else if(/API_UNAVAILABLE|SERVICE_MISSING|not implemented/i.test(m))t='هذا الجوال ما فيه خدمات Google اللي يحتاجها اللعب القريب.';
  return t+raw;}
async function nearCheck(){
  const st=await NEARROOM.status(),D=[];
  if(st.fail)D.push({t:nearErr(st.fail)});
  else{
    if(st.gmsOk===false)D.push({t:'هذا الجوال ما فيه خدمات Google أو تحتاج تحديث، واللعب القريب يحتاجها.'});
    if(st.hasBt===false)D.push({t:'هذا الجوال ما فيه بلوتوث.'});
    else if(st.bt===false)D.push({t:'البلوتوث مقفل.',a:'bt',b:'افتح البلوتوث'});
    if(st.locNeeded&&st.loc===false)D.push({t:'الموقع مقفل، والجوال يحتاجه عشان يلقى الأجهزة القريبة.',a:'loc',b:'افتح الموقع'});
  }
  return D;}
async function startNear(){
  if(S.mode==='near'&&NEARROOM.scanning)await NEARROOM.stopAll();
  S.mode='near';S.roomErr=null;S.nearList=[];S.nearScan=false;S.nearDiag=[];
  NEARROOM.onLog=()=>{if(S.mode==='near')render();};render();
  const D=await nearCheck();if(S.mode!=='near')return;
  const r=await NEARROOM.scan(list=>{S.nearList=list;if(S.mode==='near')render();});
  if(S.mode!=='near')return;
  if(!r.ok){
    if(r.why==='perm')D.push({t:'وافق على صلاحية الأجهزة القريبة والموقع عشان تشوف الغرف.',a:'app',b:'افتح صلاحيات التطبيق'});
    else{const m=r.msg||'';D.push({t:nearErr(m),...(/PERMISSION/i.test(m)?{a:'app',b:'افتح صلاحيات التطبيق'}:/LOCATION/i.test(m)?{a:'loc',b:'افتح الموقع'}:/BLUETOOTH/i.test(m)?{a:'bt',b:'افتح البلوتوث'}:{})});}
  }
  S.nearScan=r.ok;S.nearDiag=D;render();}
function renderLobby(){
  const sv=loadSaved();
  OUT=`${topBar('أونلاين','home')}
  <div class="panel"><h3>اسمك</h3><input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="مثلًا: محمد" autocomplete="off"></div>
  <div class="panel"><h3>أنشئ غرفة</h3><p>تاخذ رمز خاص وترسله لأصحابك، وما يدخلها إلا اللي معه الرمز. وتقدر تحدد قواعدها</p><button class="big red" data-a="create" ${S.joining?'disabled':''}>أنشئ غرفة</button></div>
  <div class="panel"><h3>ادخل غرفة</h3><p>اكتب الرمز اللي وصلك</p><input class="code" id="code" maxlength="6" autocomplete="off" placeholder="······"><button class="big blue" data-a="join" ${S.joining?'disabled':''}>ادخل</button></div>
  ${sv&&sv.code&&sv.via!=='near'?`<button class="link" data-a="resume">ارجع لغرفتك ${sv.code}</button>`:''}
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}`;
}
function roomBar(full){
  if(S.mode!=='online')return '';
  const pl=players(),h=actingHost(),near=S.via==='near';
  const av=pl.map(r=>`<span class="av ${r===S.me?'me':''}" data-r="${r}" style="--c:${COLS[r]}">${shapeW(r)}${r===h?'<em>👑</em>':''}</span>`).join('');
  let s=`<div class="roombar"><div class="rb-code"><small>${near?'📶 غرفة قريبة':'رمز الغرفة'}${cfg().lock?' 🔒':''}</small><b class="code">${S.code}</b></div>${near?'':'<button class="rbb" data-a="copy" aria-label="نسخ الرمز">نسخ</button>'}<div class="rb-av">${av}</div><button class="rbb" data-a="m-settings" aria-label="الإعدادات">⚙️</button></div>`;
  if(full){const me=S.pending?'<p class="note">جاري اختيار لونك…</p>':S.me==null?'<p class="note">تتفرج الحين</p>':'';
    s+=`<div class="panel members"><div class="mh"><b>اللاعبين</b><small>${pl.length} من ${MAXP}</small></div>${me}<div class="mlist">${pl.map(r=>`<span class="mem" style="--c:${COLS[r]}"><i>${shapeW(r)}</i>${r===S.me?'أنت':pname(r)}${r===h?' 👑':''}</span>`).join('')}</div></div>`;}
  return s;
}
const NEWG=['baloot','hand','chess','tavla','dama','bara','mafia','wasla'];
const CATS=[['board','ألعاب لوحة'],['fight','ألعاب قتالية'],['cards','ورق وزهر'],['mind','ذكاء وتخمين'],['quiz','مسابقات وتحدي']];
const iconE=(bg,e)=>{const id='ie'+bg.replace(/[^0-9a-f]/gi,'')+[...e].length;const num=/^[0-9]+$/.test(e);
  return `<svg viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(bg,.22)}"/><stop offset="1" stop-color="${shade(bg,-.12)}"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id})"/><circle cx="84" cy="14" r="30" fill="#fff" opacity=".1"/><circle cx="8" cy="92" r="34" fill="#000" opacity=".06"/><circle cx="50" cy="44" r="27" fill="#fff" opacity=".16"/>${num?`<text x="50" y="57" text-anchor="middle" font-size="36" font-weight="900" fill="#fff">${e}</text>`:`<text x="50" y="61" text-anchor="middle" font-size="46">${e}</text>`}</svg>`;};
function standings(){
  const rs=S.mode==='local'?players():[...new Set([...players(),...S.st.sc.map((x,r)=>x>0?r:-1).filter(r=>r>=0)])];
  if(!rs.some(r=>S.st.sc[r]>0))return '';const t=cfg().target;
  return `<div class="panel standings"><b>نقاط الجلسة${t?` (الفوز بالمباراة عند ${t})`:''}</b><div class="mlist" style="margin-top:8px">${rs.sort((a,b)=>S.st.sc[b]-S.st.sc[a]).map(r=>`<span class="mem" style="--c:${COLS[r]}"><i>${shapeW(r)}</i>${r===S.me?'أنت':pname(r)} <b>${S.st.sc[r]}</b></span>`).join('')}</div></div>`;
}
function renderGrid(){
  let mid='';
  if(S.mode==='local')mid=`<div class="panel"><div class="stepper" style="box-shadow:none;margin:0"><span>عدد اللاعبين</span><button data-a="dec">−</button><b>${S.localN}</b><button data-a="inc">+</button></div>
    <div class="names">${[...Array(S.localN).keys()].map(r=>{const b=S.bots[r];return `<div class="lrow" style="--c:${COLS[r]}"><button class="lbt ${b?'on':''}" data-a="botT" data-i="${r}" aria-label="لاعب أو بوت">${b?'🤖':'👤'}</button>${b?`<div class="lvl">${[1,2,3].map(l=>`<button class="${b===l?'on':''}" data-a="botL" data-i="${r}" data-v="${l}">${BOTL[l]}</button>`).join('')}</div>`:`<input class="field nm" data-draft="ln${r}" value="${escH(S.localNames[r]||'')}" placeholder="${NAMES[r]}" maxlength="14">`}</div>`;}).join('')}</div></div>`;
  else{
    const live=S.st.g&&S.st.d&&GAMES[S.st.g];
    if(live)mid+=`<div class="panel live"><b>اللعبة الحالية: ${GAMES[S.st.g].name}</b><button class="sm go" data-a="resumegame">ارجع لها</button></div>`;
    mid+=players().length<2?'<p class="note">أرسل رمز الغرفة لأصحابك عشان يدخلون</p>':canPick()?'':'<p class="note">صاحب الغرفة 👑 يختار اللعبة</p>';
  }
  const q=normQ(S.draft.q||'');
  const list=k=>!q||normQ(GAMES[k].name).includes(q);
  OUT=`${topBar('اختر لعبة',S.mode==='online'?'leave':'home',S.mode==='local'?'<button class="ib" data-a="m-settings">⚙️</button>':'')}${roomBar(true)}${mid}${standings()}
  <input class="field search" data-draft="q" value="${escH(S.draft.q||'')}" placeholder="🔍 دوّر على لعبة" autocomplete="off">
  ${S.mode==='online'?fabs():''}
  ${CATS.map(([c,t])=>{const ks=Object.keys(GAMES).filter(k=>(GAMES[k].cat||'board')===c&&list(k)).sort((a,b)=>NEWG.includes(b)-NEWG.includes(a));return ks.length?`<h2 class="cat">${t} <small>${ks.length}</small></h2><div class="grid">${ks.map(k=>`<button class="gcard" data-a="pick" data-g="${k}">${GAMES[k].icon}${NEWG.includes(k)?'<i class="newb">جديد</i>':''}${GAMES[k].minP?`<i class="minb">${GAMES[k].minP}+</i>`:''}<div class="lb" style="background:${GAMES[k].lbc}">${GAMES[k].name}</div></button>`).join('')}</div>`:'';}).join('')}`;
}
const normQ=t=>String(t).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ً-ْ]/g,'').trim();
function scoreBar(sc,d){
  const G=GAMES[S.st.g];let pts=null;try{pts=G.points?G.points(d):(Array.isArray(d.pts)?d.pts:null);}catch(e){}
  const simul=isSimul(G,d);
  return `<div class="players ${d.pl.length>4?'two':''}" style="--n:${Math.min(d.pl.length,4)}">${d.pl.map((r,s)=>{const me=S.mode==='online'&&r===S.me;const label=me?'أنت':pname(r);const on=d.win==null&&!simul&&d.turn===s;
    const pk=simul&&d.win==null&&d.out[s]!=='1'?(hasPicked(d,s)?'<u class="pk ok">✓</u>':'<u class="pk">…</u>'):'';
    const won=typeof d.win==='number'&&(d.win===s||(Array.isArray(d.wins)&&d.wins.includes(s)));
    return `<div class="pt ${on?'on':''} ${won?'won':''} ${d.out[s]==='1'?(G.outDone?'done':'out'):''}" data-r="${r}" style="--c:${COLS[r]}"><i>${shapeW(r)}${sc[r]?`<b>${sc[r]}</b>`:''}</i><div class="tx"><span>${label}</span>${pts?`<em>${pts[s]}</em>`:''}</div>${pk}</div>`;}).join('')}</div>`;
}
function renderGame(){
  const {g,d,sc}=S.st,G=GAMES[g];const ctx=mkCtx();let body=null,cover=false;
  if(S.mode==='local'&&G.viewer&&hasBots()){const hs=humanSeats(d);const v=d.win==null&&hs.length>1&&ctx.v>=0?ctx.v:null;
    if(v!=null&&S.seen!==v){cover=true;body=`<div class="cover" style="background:${col(d,v)}"><p>الجهاز الحين لـ</p><h2>${nm(d,v)}</h2><p>خل الباقين ما يشوفون الشاشة</p><button class="big" data-a="reveal" data-i="${v}">أنا ${nm(d,v)}، ورّني</button></div>`;}}
  else if(S.mode==='local'&&G.viewer){
    const v=d.win==null?G.viewer(d,S.priv):null;
    if(v!=null&&S.seen!==v){cover=true;
      const m=G.coverMsg?G.coverMsg(d):'';
      body=`<div class="cover" style="background:${col(d,v)}">${m?`<div class="msg">${m}</div>`:''}<p>الجهاز الحين لـ</p><h2>${nm(d,v)}</h2><p>خل الباقين ما يشوفون الشاشة</p><button class="big" data-a="reveal" data-i="${v}">أنا ${nm(d,v)}، ورّني</button></div>`;}
  }
  if(!body){try{body=G.render(d,ctx);}catch(e){console.error(e);body='<p class="err">صار خطأ في عرض اللعبة.</p><button class="sm go" data-a="again">جولة جديدة</button>';}}
  // alerts: your turn, results
  const myNow=!cover&&S.mode==='online'&&ctx.my;
  if(myNow&&!S.wasMy){sfx('turn');buzz();if(!isSimul(G,d)&&d.win==null){const b=document.createElement('div');b.className='ytb';b.style.setProperty('--c',col(d,ctx.v));b.textContent='دورك! 🎯';document.body.appendChild(b);setTimeout(()=>b.remove(),1700);}}S.wasMy=myNow;
  const enter=S.enterKey!==g+d.gid;S.enterKey=g+d.gid;
  if(d.win!=null&&S.winKey!==d.gid){S.winKey=d.gid;S.showResult=true;const mine=S.mode==='local'||d.win===ctx.v||(Array.isArray(d.wins)&&d.wins.includes(ctx.v));sfx(mine||d.win==='d'?'win':'lose');if(mine&&d.win!=='d')setTimeout(confetti,50);}
  const left=timeLeft();
  OUT=`${topBar(G.name,S.mode==='online'?'browse':'grid','<button class="ib" data-a="m-help" aria-label="القواعد">؟</button>')}${roomBar()}${scoreBar(sc,d)}
  <div class="tbar" style="${left==null?'display:none':''}"><i style="width:${left==null?0:left/cfg().timer*100}%"></i></div>
  <div class="status ${ctx.my&&!cover&&S.mode==='online'?'mine':''}">${cover?'':statusBox(statusHTML(d,G,ctx))}</div><div class="board ${enter?'enter':''}">${body}</div>
  ${S.mode==='online'?fabs():''}
  ${d.win!=null&&S.showResult&&!cover?resultHTML(d,G,ctx):''}`;
}
function resultHTML(d,G,ctx){
  const c=typeof d.win==='number'?col(d,d.win):'var(--ink)';const ml=matchLeader();
  return `<div class="sheet-bg" data-a="closeres"><div class="sheet result">
    <div class="trophy">${d.win==='d'?'🤝':typeof d.win==='number'&&(S.mode==='local'||d.win===ctx.v||(Array.isArray(d.wins)&&d.wins.includes(ctx.v)))?'🏆':'🎖️'}</div>
    <h2 style="color:${c}">${winTitle(d,G,ctx)}</h2>${G.winExtra?`<p class="note">${G.winExtra(d,ctx)}</p>`:''}
    ${ml!=null?`<p class="hint">🏅 ${ml===S.me?'أنت فزت':pname(ml)+' فاز'} بالمباراة! (${S.st.sc[ml]} نقاط)</p>`:''}
    <p class="lbl" style="margin:10px 0 6px">نقاط الجلسة</p><div class="mlist" style="justify-content:center">${[...d.pl].sort((a,b)=>S.st.sc[b]-S.st.sc[a]).map(r=>`<span class="mem" style="--c:${COLS[r]}"><i>${shapeW(r)}</i>${r===S.me?'أنت':pname(r)} <b>${S.st.sc[r]}</b></span>`).join('')}</div>
    <div class="acts"><button class="btn red" data-a="again">جولة جديدة</button><button class="btn navy" data-a="${S.mode==='online'?'browse':'grid'}">قائمة الألعاب</button></div>
    <button class="link" data-a="closeres">شوف اللوحة</button></div></div>`;
}
const RX=['👏','😂','😮','🔥','👍','❤️','😢','😡','🤔','🙏'];
function modalHTML(){
  const m=S.modal,c=cfg(),h=isHost();
  let inner='';
  if(m==='help'){const G=GAMES[S.st.g];inner=`<h2>${G?G.name:''}</h2><p style="line-height:1.9">${(typeof HELP!=='undefined'&&HELP[S.st.g])||'اتبع التعليمات اللي تطلع فوق اللوحة.'}</p>`;}
  else if(m==='chat'){S.chatSeen=Date.now();return `<div class="sheet-bg" data-a="closemodal"><div class="sheet chat"><div class="sh-head"><h2>المحادثة</h2><button class="x" data-a="closemodal" aria-label="إغلاق">✕</button></div>${chatHTML()}</div></div>`;}
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
  return `<div class="sheet-bg" data-a="closemodal"><div class="sheet"><div class="sh-head"><span></span><button class="x" data-a="closemodal" aria-label="إغلاق">✕</button></div>${inner}${m==='settings'?'<button class="big navy" data-a="closemodal">تم</button>':''}</div></div>`;
}
function chatList(){return Object.values(S.chat).sort((a,b)=>a.t-b.t).slice(-60);}
function unread(){return Object.values(S.chat).filter(m=>m.t>S.chatSeen&&m.r!==S.me).length;}
function chatName(m){return m.r===S.me?'أنت':(escH((S.names[m.r]||m.n||'').slice(0,14))||NAMES[m.r]||'لاعب');}
const hhmm=t=>{const d=new Date(t);return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');};
function fabs(){const u=unread();return `<div class="rx">${S.me!=null?'<button class="rxb" data-a="m-react" aria-label="رد سريع">😊</button>':''}<button class="rxb" data-a="m-chat" aria-label="المحادثة">💬${u?`<i class="badge">${u}</i>`:''}</button></div>`;}
function chatHTML(){const L=chatList();let prev=null;
  const items=L.map(m=>{const mine=m.r===S.me,first=prev!==m.r;prev=m.r;
    return `<div class="msg ${mine?'me':''} ${first?'first':''}" style="--c:${COLS[m.r]||'#888'}">${first&&!mine?`<b>${chatName(m)}</b>`:''}<span>${escH(m.x)}</span><time>${hhmm(m.t)}</time></div>`;}).join('');
  return `<div class="msgs">${items||'<div class="chat-empty">👋<br>ما فيه رسائل للحين</div>'}</div>
  <div class="chatin"><input class="field" data-draft="chat" value="${escH(S.draft.chat||'')}" maxlength="200" placeholder="اكتب رسالة…" autocomplete="off" enterkeyhint="send"><button class="send" data-a="send" aria-label="إرسال"><svg viewBox="0 0 24 24"><path d="M20 12L4 4l3 8-3 8z" fill="currentColor"/></svg></button></div>`;}
function sendChat(){const x=String(S.draft.chat||'').trim().slice(0,200);if(!x||S.mode!=='online')return;const m={i:rid()+rid(),t:Date.now(),x};S.myChat=[...S.myChat,m].slice(-10);S.chat[m.i]={...m,r:S.me,n:S.myName};S.draft.chat='';S.chatSeen=Date.now();publish();const el=app.querySelector('[data-draft="chat"]');if(el)el.value='';render();if(el)el.focus({preventScroll:true});}
function chatPop(m){sfx('pop');const el=document.createElement('div');el.className='chatpop';el.innerHTML=`<b style="color:${COLS[m.r]||'#888'}">${chatName(m)}</b> ${escH(m.x)}`;el.addEventListener('click',()=>{S.modal='chat';S.chatSeen=Date.now();render();el.remove();});document.body.appendChild(el);setTimeout(()=>el.remove(),3500);}
function floatRx(r,i){
  const e=RX[i];if(!e)return;const ch=app.querySelector(`.pt[data-r="${r}"]`)||app.querySelector(`.av[data-r="${r}"]`)||app.querySelector(`.mem[style*="${COLS[r]}"]`);
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
    case 'nset':NEARROOM.settings(t.dataset.w);break;
    case 'ncreate':{const c=genCode();enterRoom(c,true,null,NEARROOM.room('host',{code:c,name:S.myName}));break;}
    case 'njoin':{const f=(S.nearList||[])[i];if(f)enterRoom(f.code,false,null,NEARROOM.room('join',{id:f.id,code:f.code,name:S.myName}));break;}
    case 'local':S.mode='local';S.me=null;S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;render();break;
    case 'inc':S.localN=Math.min(MAXP,S.localN+1);save();render();break;
    case 'botT':{const r=i;if(S.bots[r])delete S.bots[r];else{S.bots[r]=2;S.localNames[r]='';}if(!humanSeats({pl:[...Array(S.localN).keys()]}).length){delete S.bots[r];toast('لازم لاعب واحد على الأقل يكون إنسان');}save();render();break;}
    case 'botL':S.bots[i]=+t.dataset.v;save();render();break;
    case 'vsbot':S.mode='local';S.me=null;S.localN=2;S.bots={1:S.bots[1]||2};S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;save();render();break;
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
      const nd={...d,out,turn:out[d.turn]==='1'?nextSeat(d,d.turn,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd,d):nd);break;}
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
      const nd={...d,out,turn:d.turn===s?nextSeat(d,s,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd,d):nd);}toast(pname(r)+' طلع من الغرفة');break;}
    case 'unkick':setCfg({kick:[]});break;
    case 'resetsc':if(!isHost())return;S.st={...S.st,sc:Array(MAXP).fill(0),s:S.st.s+1};afterChange();toast('تصفّرت النقاط');break;
  }
});
app.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.draft;if(!k)return;S.draft=S.draft||{};S.draft[k]=e.target.value;
  if(e.target.type==='range'){const bn=e.target.closest('.board')&&e.target.closest('.board').querySelector('.big-num');if(bn)bn.textContent=e.target.value;}
  if(k==='myname'){S.myName=e.target.value.trim().slice(0,14);lsSet(LSK.name,S.myName);clearTimeout(S.nmT);S.nmT=setTimeout(()=>publish(),400);}
  else if(/^ln\d$/.test(k)){S.localNames[+k[2]]=e.target.value;save();}
  else if(k==='q')render();});
app.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('.send'))e.preventDefault();});
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
const shapeW=r=>`<svg viewBox="0 0 40 40">${SHP[r]('#fff')}</svg>`;

const SERVER='https://gamesx.alqadi1423.workers.dev';
const isApp=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
function appSetup(){
  let A=Capacitor.Plugins&&Capacitor.Plugins.App;try{if(!A&&Capacitor.registerPlugin)A=Capacitor.registerPlugin('App');}catch(e){}let lastBack=0;
  // back from the phone settings: look again for nearby rooms
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.mode==='near'&&(S.nearDiag||[]).length&&!S.joining)startNear();});
  if(A)A.addListener('backButton',()=>{
    if(S.modal){S.modal=null;render();return;}
    const b=app.querySelector('.top .ib');const act=b&&b.dataset.a;
    if(S.mode===null||act==='leave'){if(Date.now()-lastBack<2000){if(act==='leave')leaveRoom();else A.exitApp();return;}lastBack=Date.now();toast(act==='leave'?'اضغط رجوع مرة ثانية للخروج من الغرفة':'اضغط رجوع مرة ثانية للخروج');return;}
    if(b)b.click();});
  // tell the player when a newer app build is out
  const el=document.querySelector('script[src*="core.js"]');const mine=+((el&&/v=(\d+)/.exec(el.src)||[])[1]||0);
  fetch(SERVER+'/version.json',{cache:'no-store'}).then(r=>r.json()).then(j=>{if(j&&+j.v>mine&&j.apk){S.update=j;if(S.mode===null)render();}}).catch(()=>{});
}
function infoScreen(){
  const mq=q=>{try{return matchMedia(q).matches?'نعم':'لا';}catch(e){return '?';}};
  const sup=p=>{try{return CSS.supports(p)?'نعم':'لا';}catch(e){return '?';}};
  app.innerHTML=`<div class="panel" style="direction:ltr;text-align:left;font-size:14px;line-height:1.7;word-break:break-all"><b>${escH(navigator.userAgent)}</b><br>
  dark: ${mq('(prefers-color-scheme: dark)')} • light: ${mq('(prefers-color-scheme: light)')}<br>
  aspect-ratio: ${sup('aspect-ratio:1')} • color-mix: ${sup('color:color-mix(in srgb,red,blue)')}<br>
  screen: ${screen.width}x${screen.height} • dpr: ${devicePixelRatio} • font: ${getComputedStyle(document.documentElement).fontSize}<br>
  v: ${(document.querySelector('script[src*="core.js"]')||{}).src||''}</div>`;}
function boot(){if(/[?&]info\b/.test(location.search)){infoScreen();return;}render();if(isApp())appSetup();}

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
const LSK={room:'alaabna.v4',name:'alaabna.name',mute:'alaabna.mute',local:'alaabna.local',lgame:'alaabna.lgame',recent:'alaabna.recent',lite:'alaabna.lite',
  fav:'alaabna.fav',av:'alaabna.av',meta:'alaabna.meta',hide:'alaabna.hide',stats:'alaabna.stats'};
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
// light motion (css/perf.css html.lite): fewer animations and lighter shadows. On by itself on phones with little memory or
// few cores; the settings sheet switches it for this phone
const LITE_AUTO=(()=>{try{const m=navigator.deviceMemory,c=navigator.hardwareConcurrency;return !!((m&&m<=4)||(c&&c<=4));}catch(e){return false;}})();
function liteOn(){const v=lsGet(LSK.lite);return v==='1'?true:v==='0'?false:LITE_AUTO;}
function applyLite(){try{document.documentElement.classList.toggle('lite',liteOn());}catch(e){}}
applyLite();
/* the game files load right after the first screen (loadGames, index.html <template id="later-js">). Until then the home screen
   shows the names and icons it kept from the last visit (GMETA), and a tap that needs the games waits for them (whenGames) */
let GREADY=true;const GWAIT=[];
const GMETA=(()=>{try{const m=JSON.parse(lsGet(LSK.meta)||'null');return m&&typeof m==='object'&&m.g&&typeof m.g==='object'?m:{n:0,g:{}};}catch(e){return {n:0,g:{}};}})();
const hasG=g=>typeof g==='string'&&(Object.prototype.hasOwnProperty.call(GAMES,g)||(!GREADY&&Object.prototype.hasOwnProperty.call(GMETA.g,g)));
// a game's name and icon, also before its file has loaded
const gInfo=g=>GAMES[g]||(Object.prototype.hasOwnProperty.call(GMETA.g,g)?{name:GMETA.g[g].n,icon:GMETA.g[g].i}:{name:'',icon:''});
// the last games picked on this phone, newest first (home and game list show them)
function recentGames(){try{const a=JSON.parse(lsGet(LSK.recent)||'[]');return Array.isArray(a)?a.filter(hasG).slice(0,8):[];}catch(e){return [];}}
// favourites: a star on a tile or in a game's top bar
function favGames(){try{const a=JSON.parse(lsGet(LSK.fav)||'[]');return Array.isArray(a)?a.filter(hasG).slice(0,40):[];}catch(e){return [];}}
function toggleFav(g){if(!GAMES[g])return;const f=favGames(),on=f.includes(g);lsSet(LSK.fav,JSON.stringify(on?f.filter(x=>x!==g):[g,...f].slice(0,40)));toast(on?'شلناها من المفضلة':'انضافت للمفضلة ⭐');}
function noteRecent(g){try{lsSet(LSK.recent,JSON.stringify([g,...recentGames().filter(x=>x!==g)].slice(0,8)));saveMeta();}catch(e){}}
// an earlier version kept the recent games under 'alaabna_recent': fold them into the one list
try{const o=JSON.parse(lsGet('alaabna_recent')||'null');if(Array.isArray(o)){const a=JSON.parse(lsGet(LSK.recent)||'[]');const m=[...(Array.isArray(a)?a:[]),...o].filter((g,i,x)=>typeof g==='string'&&x.indexOf(g)===i).slice(0,8);lsSet(LSK.recent,JSON.stringify(m));}localStorage.removeItem('alaabna_recent');}catch(e){}
// rooms saved by the app before seats were tied to device keys cannot be resumed
try{localStorage.removeItem('alaabna.v3');}catch(e){}

/* ================= players and names ================= */
/* a game has d.pl = list of roles (colours) taking part; seat i plays role d.pl[i] */
// bots get a person's name in local mode (سالم، نوف…) unless the player typed one
const BOTN=['سالم','نوف','مشعل','غلا','بندر','جود','زياد','لين'];
function pnameText(r){const n=(S.mode==='local'?S.localNames[r]:(r===S.me?S.myName:S.names[r]))||'';return String(n).trim().slice(0,14)||(S.mode==='local'&&S.bots[r]?'🤖 '+BOTN[r]:NAMES[r]);}
// the same name, escaped for HTML (pnameText is for textContent, such as toasts)
function pname(r){return escH(pnameText(r));}
/* ================= bots: only on one phone (local mode) ================= */
const BOTL=['','سهل','متوسط','صعب'];
// a running game keeps its bots even if the player count was lowered under it afterwards
const hasBots=()=>S.mode==='local'&&(Object.keys(S.bots||{}).some(r=>S.bots[r]&&+r<S.localN)||!!(S.st.d&&S.st.d.win==null&&S.st.d.pl.some(r=>(S.bots||{})[r])));
const isBot=(d,s)=>S.mode==='local'&&!!(S.bots||{})[d.pl[s]];
const botLv=(d,s)=>(S.bots||{})[d.pl[s]]||1;
const humanSeats=d=>d.pl.map((_,s)=>s).filter(s=>!isBot(d,s));
const col=(d,s)=>COLS[d.pl[s]],lit=(d,s)=>LIGHT[d.pl[s]],nm=(d,s)=>pname(d.pl[s]);
const nameTag=(d,s)=>`<b style="color:${col(d,s)}">${nm(d,s)}</b>`;
function nextSeat(d,from,out){out=out||d.out;const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(out[s]!=='1')return s;}return from;}
const aliveSeats=(d,out)=>{out=out||d.out;return d.pl.map((_,s)=>s).filter(s=>out[s]!=='1');};

/* ================= state ================= */
const CFG0={pick:'host',timer:0,target:0,lock:false,kick:[],members:[],teams:0,tm:{},chat:true};
const S={draft:{},sel:[],mode:null,localN:2,localNames:[],myName:lsGet(LSK.name)||'',names:{},mute:lsGet(LSK.mute)==='1',
  st:{g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}},me:null,myPeer:null,code:null,nr:null,roles:new Set(),priv:Array(MAXP).fill(null),
  chat:{},myChat:[],chatSeen:Date.now(),chatSkip:new Set(),chatIn:{},avs:{},seen:null,roomErr:null,joining:false,gw:false,rolled:false,tgt:null,pending:false,browse:false,modal:null,showResult:false,winKey:null,wasMy:false,rxSeen:{}};
// while a game animates the screen by hand (holdRender), the next real render repaints it in full even if its HTML is unchanged
{let hr=!!S.holdRender;Object.defineProperty(S,'holdRender',{get:()=>hr,set:v=>{hr=v;S.lastHtml=null;},enumerable:true,configurable:true});}
try{const l=JSON.parse(lsGet(LSK.local)||'null');if(l){S.localN=l.n||2;S.localNames=l.names||[];S.bots=l.bots||{};}}catch(e){}
// the teams last chosen on this phone (local play keeps them between games)
function localTeams(){try{const l=JSON.parse(lsGet(LSK.local)||'null');const o={};if(l&&CFGOK.teams(l.teams))o.teams=l.teams;if(l&&tmOk(l.tm))o.tm={...l.tm};return o;}catch(e){return {};}}
S.bots=S.bots||{};
const GAMES={};
const cfg=()=>S.st.cfg||CFG0;
/* teams: cfg.teams is how many teams (0 = everyone for himself), cfg.tm moves a player to another team.
   Each game stores its teams in d.tm (team of every seat) when it starts, so leaving or joining mid-game changes nothing */
const TEAMS=[{n:'النمور',e:'🐯',c:'#E5483F'},{n:'الصقور',e:'🦅',c:'#2F80ED'},{n:'الذئاب',e:'🐺',c:'#6C7A89'},{n:'الفهود',e:'🐆',c:'#E8A33D'}];
function roleTeam(r,k,ps){const m=cfg().tm||{};if(m[r]!=null&&m[r]<k)return m[r];ps=ps||players();const i=ps.indexOf(r);return (i<0?r:i)%k;}
const teamOf=(d,s)=>d&&d.tm?d.tm[s]:s;
const teamSeats=(d,t)=>d.pl.map((_,s)=>s).filter(s=>teamOf(d,s)===t);
const sameTeam=(d,a,b)=>a===b||(!!(d&&d.tm)&&d.tm[a]===d.tm[b]);
const teamName=t=>`${TEAMS[t].e} ${TEAMS[t].n}`;
// what a game does with teams: 'native' games pair seats themselves, 'none' games are played alone
function teamPlan(g,pl){const k=cfg().teams||0,G=GAMES[g];if(!k||!G||G.teams==='none')return null;
  const by=[...Array(k)].map(()=>[]);pl.forEach(r=>by[roleTeam(r,k,pl)].push(r));const used=by.filter(x=>x.length);if(used.length<2)return null;
  if(G.teams==='native'&&!(G.teamsOk?G.teamsOk(used.map(x=>x.length),pl.length):used.length===2&&used.every(x=>x.length===pl.length/2)))return null;
  // seat the teams in turn: A B A B so the turns alternate between teams
  const order=[];for(let i=0;order.length<pl.length;i++)for(const t of by)if(t[i]!=null)order.push(t[i]);
  return {pl:order,tm:order.map(r=>roleTeam(r,k,pl))};}

function players(){
  if(S.mode==='local')return [...Array(S.localN).keys()];
  const k=cfg().kick||[];
  return [...S.roles].filter(r=>isRole(r)&&S.ids[r]&&!k.includes(S.ids[r])).sort((a,b)=>a-b);
}
// the role (colour) of the device that publishes the room's game, see net.js
function actingHost(){if(S.mode!=='online')return null;const r=roleOfFp(S.hostFp);return r<0?null:r;}
const isHost=()=>S.mode==='local'||amHost();
const canPick=()=>S.mode==='local'||isHost()||(cfg().pick==='all'&&S.me!=null);

/* a game may set its own first mover with start(d,base): e.g. chess always opens with seat 0 (white).
   With teams the seats are ordered A B A B and d.tm keeps every seat's team for the whole game */
function newD(g,starter,pl){const n=pl.length;starter=starter%n;const G=GAMES[g],base=G.init(n);const tp=teamPlan(g,pl);if(tp)pl=tp.pl;
  const d={...base,gid:rid(),st:starter,turn:starter,pl,out:'0'.repeat(n),win:null};if(tp)d.tm=tp.tm;return G.start?G.start(d,base):d;}
function setGame(g){if(netDown())return;
  if(S.mode==='online'&&!amHost()){if(g&&cfg().pick==='all'&&S.me!=null)queueIntent({t:'game',g});return;}
  if(g){const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
    if(GAMES[g].minP&&pl.length<GAMES[g].minP){toast(`${GAMES[g].name} تحتاج ${GAMES[g].minP} لاعبين أو أكثر`);return;}
    S.st={...S.st,g,s:S.st.s+1,d:newD(g,0,pl),sc:matchSc()};noteRecent(g);}
  else S.st={...S.st,g:null,s:S.st.s+1,d:null,sc:matchSc()};
  S.seen=null;S.browse=false;S.showResult=false;resetUI();afterChange();
}
function newRound(){if(netDown())return;if(S.mode==='online'&&!amHost()){queueIntent({t:'new'});return;}const d=S.st.d;const pl=players();if(pl.length<2){toast('تحتاجون لاعبين اثنين على الأقل');return;}
  const G0=GAMES[S.st.g];if(G0&&G0.minP&&pl.length<G0.minP){toast(`${G0.name} تحتاج ${G0.minP} لاعبين أو أكثر`);return;}
  if(d&&d.mw!=null)toast('مباراة جديدة! النقاط رجعت صفر');
  const st=d?(d.st||0)+1:0;S.st={...S.st,s:S.st.s+1,d:newD(S.st.g,st,pl),sc:matchSc()};S.seen=null;S.showResult=false;resetUI();afterChange();}
function resetUI(){S.gw=false;S.tgt=null;S.wild=null;S.dside=null;S.mm=[];S.draft={...(S.draft.q!=null?{q:S.draft.q}:{})};S.sel=[];S.simon=null;S.lq=null;S.lf=null;S.sp=null;S.mcell=null;S.mprops=false;S.jk=null;S.arA=null;S.dwSel=null;S.rolling=false;}
let ACT_CAP=null;
// with teams the whole team wins, and a team wins as soon as nobody from the other teams is left
function teamFix(nd){const G=GAMES[S.st.g];if(!nd||!nd.tm||!G||G.teams==='native')return nd;
  if(nd.win==null&&!G.outDone&&new Set(nd.tm).size>1){const al=aliveSeats(nd);const ts=new Set(al.map(s=>nd.tm[s]));if(al.length&&ts.size===1)nd={...nd,win:al[0]};}
  if(typeof nd.win==='number'){const t=nd.tm[nd.win];nd={...nd,wins:teamSeats(nd,t),wt:t};}
  return nd;}
function act(nd){if(ACT_CAP){ACT_CAP.v=nd;return;}nd=teamFix(nd);if(NET_CAP){NET_CAP.v=nd;return;}if(netDown())return;
  // online, only the acting host changes the game: a player's move goes to it (net.js)
  if(S.mode==='online'&&!amHost()){propose(nd);return;}
  if(hasBots()){const G=GAMES[S.st.g];if(G&&G.botSee)try{G.botSee(nd);}catch(e){}}if(!S.inIntent){S.wild=null;S.dside=null;}const was=S.st.d&&S.st.d.win!=null;const sc=[...S.st.sc];if(!was&&typeof nd.win==='number'){if(Array.isArray(nd.dsc))nd.dsc.forEach((x,w)=>{const r=nd.pl[w];if(r!=null&&Number.isFinite(x))sc[r]=Math.max(0,sc[r]+x);});else(nd.wins||[nd.win]).forEach(w=>sc[nd.pl[w]]+=(nd.wpts||1));nd=matchEnd(nd,sc);}S.st={...S.st,s:S.st.s+1,d:nd,sc};if(!S.inIntent)sfx('tap');afterChange();}
function setCfg(patch){if(netDown())return;if(S.mode==='online'&&!amHost())return;S.st={...S.st,cfg:{...cfg(),...patch},s:S.st.s+1};afterChange();}
function setPriv(role,p){if(NET_CAP){NET_CAP.pv={role,p};return;}if(netDown())return;
  if(S.mode==='online'&&!amHost()){if(role!==S.me||S.me==null)return;S.priv[role]=p;queueIntent({t:'pv',p});render();return;}
  S.priv[role]=p;afterChange();}
function afterChange(){ensurePriv();publish();render();queueSimul();}

/* simultaneous rounds: every alive seat stores {rd,pick} in its private part; one resolver applies G.resolve.
   A game can mix both kinds: simulNow(d) says whether the current phase is a simultaneous one */
const isSimul=(G,d)=>!!G.resolve&&(!G.simulNow||!!G.simulNow(d));
let simulT=null;
function queueSimul(){if(simulT)return;simulT=setTimeout(()=>{simulT=null;trySimul();tryHost();},60);}
// G.host(d) lets one device (the phone, or the room host online) move a game on: clocks, typed guesses, bots
function tryHost(){const {g,d}=S.st;if(!g||!d||d.win!=null)return;const G=GAMES[g];if(!G||!G.host)return;
  // online only the acting host runs it (never while its connection is down); the players see the result it publishes
  if(S.mode==='online'&&(!amHost()||S.offline))return;if(S.mode!=='online'&&S.mode!=='local')return;
  let nd=null;try{nd=G.host(d);}catch(e){console.error('host',e);return;}if(nd&&nd!==d)act(nd);}
setInterval(tryHost,400);
// any element with data-until shows the seconds left until that moment
setInterval(()=>{for(const e of document.querySelectorAll('[data-until]')){const l=Math.max(0,Math.ceil((+e.dataset.until-Date.now())/1000));if(e.textContent!==String(l))e.textContent=l;}},500);
// NOPICK marks a seat that chose to give no answer, so the round does not wait for it
const NOPICK='~';
function simulPicks(d){return d.pl.map((r,s)=>{if(d.out[s]==='1')return null;const p=S.priv[r];return p&&p.gid===d.gid&&p.rd===d.rd&&p.pick!=null?(p.pick===NOPICK?null:p.pick):undefined;});}
const isEnforcer=()=>S.mode==='local'||(amHost()&&!S.offline);
function trySimul(){
  const {g,d}=S.st;if(!g||!d||d.win!=null)return;const G=GAMES[g];if(!G||!isSimul(G,d))return;
  const picks=simulPicks(d);if(picks.some(x=>x===undefined))return;
  if(S.mode==='online'&&(!amHost()||S.offline))return;
  act(G.resolve(d,picks));
}
function simulPick(d,seat,pick){const r=d.pl[seat];const p=S.priv[r]||{gid:d.gid};setPriv(r,{...p,gid:d.gid,rd:d.rd,pick});}
const hasPicked=(d,seat)=>{const p=S.priv[d.pl[seat]];return !!(p&&p.gid===d.gid&&p.rd===d.rd&&p.pick!=null);};
function ensurePriv(){
  const {g,d}=S.st;if(!g||!d)return;const G=GAMES[g];if(!G||!(G.privInit||G.resolve))return;
  // online the host makes every seat's part (dice, secrets, first fleets); the players get theirs sealed from it
  const roles=S.mode==='local'||amHost()?d.pl:[];
  for(const r of roles){const p=S.priv[r];if(!p||p.gid!==d.gid||(G.privStale&&G.privStale(d,p,r)))S.priv[r]={...(G.privInit?G.privInit(d,r):{}),gid:d.gid};}
}
function publish(rx){save();if(S.mode!=='online'||!S.nr)return;schedulePublish(rx);}
function save(){
  if(S.mode==='local'){lsSet(LSK.local,JSON.stringify({n:S.localN,names:S.localNames,bots:S.bots,teams:cfg().teams||0,tm:cfg().tm||{}}));if(S.st.g&&S.st.d)lsSet(LSK.lgame,JSON.stringify({st:S.st,priv:S.priv,n:S.localN,names:S.localNames,bots:S.bots}));}
  if(S.mode!=='online'||!S.code)return;const h=amHost();
  lsSet(LSK.room,JSON.stringify({code:S.code,via:S.via||'net',ep:S.epoch,host:h,me:S.me,st:h?S.st:(S.hst||S.st),priv:h?S.priv:(S.me!=null?{[S.me]:S.priv[S.me]}:{}),ids:S.ids,lastN:h?S.lastN:{},n:S.sentN}));}
function loadSaved(){try{return JSON.parse(lsGet(LSK.room)||'null');}catch(e){return null;}}
// a local game that was not finished when the app closed or went home
function loadLocal(){try{const l=JSON.parse(lsGet(LSK.lgame)||'null');const d=l&&l.st&&l.st.d;return d&&d.win==null&&Array.isArray(d.pl)&&hasG(l.st.g)?l:null;}catch(e){return null;}}
function localResume(){const l=loadLocal();if(!l)return;S.mode='local';S.me=null;S.localN=Math.max(2,Math.min(MAXP,l.n||l.st.d.pl.length));S.localNames=l.names||[];S.bots=l.bots||{};
  S.st={...l.st,cfg:{...CFG0,...(l.st.cfg||{})},sc:Array.isArray(l.st.sc)&&l.st.sc.length>=MAXP?l.st.sc:Array(MAXP).fill(0)};S.priv=Array(MAXP).fill(null).map((x,r)=>(l.priv||[])[r]??null);
  S.seen=null;S.browse=false;S.showResult=false;resetUI();afterChange();}

/* ================= turn timer ================= */
const TK={key:null,t0:0,fired:false};
function timerKey(){const d=S.st.d;return S.st.g&&d?`${S.st.g}:${d.gid}:${S.st.s}:${S.mode==='local'?S.seen+':'+!!S.browse:''}`:null;}
function timeLeft(){const t=cfg().timer;if(!t||!S.st.d||S.st.d.win!=null)return null;const G=GAMES[S.st.g];if(!G||G.noTimer)return null;return Math.max(0,t-(Date.now()-TK.t0)/1000);}
setInterval(()=>{
  const k=timerKey();if(k!==TK.key){TK.key=k;TK.t0=Date.now();TK.fired=false;}
  const left=timeLeft();const bar=document.querySelector('.tbar i');
  if(bar){if(left==null)bar.parentNode.style.display='none';else{bar.parentNode.style.display='';bar.style.width=(left/cfg().timer*100)+'%';bar.style.background=left<5?'#EC6158':'#4CB97F';}}
  if(left===0&&!TK.fired&&isEnforcer()&&!app.querySelector('.cover')&&!(S.mode==='local'&&S.browse)){TK.fired=true;doTimeout();}
},400);
function doTimeout(){
  const {g,d}=S.st;const G=GAMES[g];if(!G||!d||d.win!=null)return;
  if(isSimul(G,d)){
    // one phone passed around: only the player holding it runs out of time; the players after them still get this question
    if(S.mode==='local'&&G.viewer){const v=mkCtx().v;if(v!=null&&v>=0&&d.out[v]!=='1'&&!hasPicked(d,v)){simulPick(d,v,NOPICK);return;}}
    act(G.resolve(d,simulPicks(d).map(x=>x===undefined?null:x)));return;}
  const who=nm(d,d.turn);let nd=G.onTimeout?G.onTimeout(d):{...d,turn:nextSeat(d,d.turn)};
  if('last' in d)nd={...nd,last:`انتهى وقت ${who}`+(nd.last&&nd.last!==d.last?'، '+nd.last:'')};S.seen=null;act(nd);
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
// a bot thinks on a blank copy of this phone's typing, drawing, selection and opponent tab, so it never reads, sends, wipes or resets what a human has there
function botUI(f){const sv={draft:S.draft,dr:S.dr,sel:S.sel,tgt:S.tgt,wild:S.wild,dside:S.dside},tt=window.toast;
  S.draft={};S.dr=null;S.sel=[];S.tgt=null;S.wild=null;S.dside=null;window.toast=()=>{};
  try{return f();}finally{Object.assign(S,sv);window.toast=tt;}}
function runBot(G,d,s){const lv=botLv(d,s),sim=isSimul(G,d);
  try{if(sim){if(G.botPick){const p=botUI(()=>G.botPick(d,s,lv));simulPick(d,s,p==null?NOPICK:p);}else botClick(G,d,s,lv,true);return;}
    let nd=botUI(()=>G.bot?G.bot(d,s,lv):undefined);if(nd===undefined){if(G.bot)BOTFB[S.st.g]=(BOTFB[S.st.g]||0)+1;nd=botClick(G,d,s,lv,false);}if(nd&&nd!==d)act(nd);}
  catch(e){console.error('bot',e);if(!sim)act(G.onTimeout?G.onTimeout(d):{...d,turn:nextSeat(d,d.turn)});else simulPick(d,s,NOPICK);}}
// a bot that taps the game's own buttons: used where a game has no smarter player
function botClick(G,d,s,lv,sim){const ctx=botCtx(d,s);
  const got=botUI(()=>{for(let k=0;k<8;k++){TPL.innerHTML=G.render(d,ctx);const els=[...TPL.content.querySelectorAll('[data-ga]')].filter(e=>!e.hasAttribute('disabled'));if(!els.length)break;
    const e=els[rnd(els.length)];ACT_CAP={v:null};const hold=S.holdRender;S.holdRender=true;let nd=null;
    try{G.click(e.dataset.ga,e.dataset.i!=null?+e.dataset.i:null,d,ctx);}finally{S.holdRender=hold;nd=ACT_CAP.v;ACT_CAP=null;}
    if(sim){if(hasPicked(S.st.d,s))return true;}else if(nd)return nd;}return null;});
  if(got){if(sim){render();return;}return got;}
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
  if(liteOn())return;
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
async function enterRoom(code,host,restore,given){
  S.joining=true;S.roomErr=null;render();
  await SEAL.ready;
  if(!SEAL.ok){S.joining=false;S.roomErr='حدّث المتصفح عشان تلعب أونلاين';render();return;}
  // the same browser holds one key: a room already open in another tab of it stays there
  if(otherTab(code)){S.joining=false;S.roomErr=TAB_MSG+'، كمّل فيه أو سكّره وارجع';render();return;}
  const room=given||await getRoom();
  if(!room){S.joining=false;S.roomErr='اللعب أونلاين مو متوفر هنا، جرّبه من تطبيق ألعابنا';render();return;}
  let nr;
  // a new room must get a free code, and joining someone's room needs a room that is open: both are checked before entering
  try{nr=await room.join('g-'+code.toLowerCase(),{create:!!(host&&!restore),need:!host&&!restore&&!given});}
  catch(e){const why=e&&e.message;
    if(why==='taken'&&host&&!restore&&(S.codeTries=(S.codeTries||0)+1)<5){S.joining=false;return enterRoom(genCode(),true);}
    S.codeTries=0;
    if(why==='noroom'){S.joining=false;S.roomErr='ما فيه غرفة بهالرمز. تأكد من الرمز، أو أنشئ غرفة جديدة.';render();return;}
    S.joining=false;S.roomErr=e&&e.message==='full'?'الغرفة مليانة، ما فيها مكان لك الحين.':given?nearErr(e&&e.message):'ما قدرت أتصل بالغرفة، تأكد من النت وجرّب مرة ثانية.';render();return;}
  netReset();S.codeTries=0;
  S.mode='online';S.via=given?'near':'net';S.code=code;S.nr=nr;S.joining=false;S.chat={};S.myChat=[];S.chatSkip=new Set();S.chatIn={};S.avs={};S.chatJump=false;S.chatTray=false;S.chatReady=false;S.chatSeen=Date.now();S.priv=Array(MAXP).fill(null);S.seen=null;S.roles=new Set();S.names={};lastPeers=[];S.browse=false;S.modal=null;
  S.offline=false;S.roomEmpty=false;S.goneAt={};S.joinT=Date.now();tabEnter(code);
  // a saved room: its state, the seat table and the epoch it was at; a saved host takes the room back only if nobody else did (net.js)
  if(restore&&restore.st){S.st={cfg:{...CFG0},...restore.st,cfg:cleanCfg(restore.st.cfg)};if(!cleanSc(S.st.sc))S.st.sc=Array(MAXP).fill(0);
    S.ids=validIds(restore.ids)||S.ids;S.epoch=Number.isInteger(restore.ep)?restore.ep:0;S.sentN=+restore.n||0;
    if(restore.host)S.restore=restore;else{S.hst={...S.st};const r=S.ids.indexOf(SEAL.fp),p=restore.priv&&restore.priv[r];if(r>=0&&p)S.priv[r]=p;}}
  else S.st={g:null,s:host?1:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};
  if(host&&!restore){S.me=0;S.pending=false;S.ids[0]=SEAL.fp;S.epoch=1;S.hostFp=SEAL.fp;S.hostK=SEAL.k;S.hostSince=Date.now();S.lostAt=0;S.modal='settings';}
  else{S.me=null;S.pending=true;
    // a code nobody opened (a typo, a random guess) is not a room: back to the lobby with a clear message.
    // Checked when nobody is there at all, and again later when only other newcomers are (nobody of them can open it either)
    const noRoom=late=>{if(S.nr!==nr||S.seenHost||S.hst||restore)return;if(!late&&lastPeers.some(p=>!p.sameTab))return;
      leaveRoom();S.mode='lobby';S.roomErr='ما فيه غرفة بهالرمز. تأكد من الرمز، أو أنشئ غرفة جديدة.';render();};
    setTimeout(()=>noRoom(false),3500);setTimeout(()=>noRoom(true),9000);}
  S.unsub=nr.onPeers(onPeers,st=>{if(S.nr===nr)netState(st);});
  setTimeout(()=>{if(S.nr===nr)render();},GRACE+200);
  afterChange();
}
function leaveRoom(msg){if(S.mode==='online')tabMark(null);if(S.unsub)try{S.unsub();}catch(e){}S.unsub=null;if(S.nr)S.nr.leave().catch(()=>{});S.nr=null;S.via=null;S.mode=null;S.modal=null;S.offline=false;S.roomEmpty=false;lastPeers=[];S.roles=new Set();netReset();S.me=null;if(msg)toast(msg);render();}
/* what the room transport says about the connection: 'lost' / 'back', 'full' while it tries to get back in,
   and for a nearby room 'gone' (the room's phone is no longer around) or 'bye' (its owner closed it) */
function netState(st){
  S.lostAt=Date.now();
  if(st==='back'){if(S.offline){S.offline=false;toast('رجع الاتصال 👍');}reseal();render();return;}
  if(st==='gone'||st==='bye'){leaveRoom(st==='bye'?'صاحب الغرفة قفلها':'ما عاد نلقى جوال صاحب الغرفة');return;}
  // Claude rooms only report trouble, never that it is over: there it stays a toast
  if(st!=='lost'&&st!=='full'){toast('انقطع الاتصال، نحاول نرجع…');return;}
  const was=S.offline;S.offline=st;if(!was)toast(st==='full'?'الغرفة مليانة، نحاول ندخل…':'انقطع الاتصال، نحاول نرجع…');render();}
// nothing is played while the connection is down: the move would stay on this phone only
function netDown(){if(S.mode!=='online'||!S.offline)return false;if(Date.now()-(S.offT||0)>1500){S.offT=Date.now();toast('انقطع الاتصال، استنى لين يرجع');}return true;}
// a player who dropped out gets GRACE ms before the others can skip them, so a short network cut does not cost the game
const GRACE=15000;
// online: a player whose phone has been out of the room for longer than GRACE (a short drop does not count)
const goneLong=r=>S.mode==='online'&&!S.roles.has(r)&&Date.now()-((S.goneAt||{})[r]??S.joinT??0)>=GRACE;
// the roles in the room: seats whose device key is here
// (a phone whose page is frozen or asleep, net.js freshFp, counts as gone for the round; it keeps its seat for HOLD)
function recomputeRoles(){const s=new Set();if(S.me!=null)s.add(S.me);for(let r=0;r<MAXP;r++)if(S.ids[r]&&S.peersByFp[S.ids[r]]&&freshFp(S.ids[r]))s.add(r);
  const now=Date.now();S.goneAt=S.goneAt||{};for(const r of S.roles)if(!s.has(r)&&S.goneAt[r]==null){S.goneAt[r]=now;setTimeout(()=>{if(S.mode==='online')render();},GRACE+200);}for(const r of s)delete S.goneAt[r];
  S.roles=s;}

/* ================= what a peer may send =================
   Every device takes the newest state from any peer, so nothing a peer sends is used as it is: roles are whole numbers 0..7,
   the room settings and the session scores follow the acting host only, and every string in the game state keeps only the
   few tags the games write themselves (a name in its colour, small notes, line breaks); anything else shows as plain text. */
function isRole(r){return Number.isInteger(r)&&r>=0&&r<MAXP;}
// kicked players and the members of a locked room are device keys (fp), so leaving and coming back does not undo them
const fpList=a=>Array.isArray(a)&&a.length<=16&&a.every(x=>typeof x==='string'&&/^[\w-]{12}$/.test(x));
// only the values the settings sheet offers
// teams: how many (0 = everyone alone), and tm = {role: team} for the players moved by hand
const tmOk=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=MAXP&&Object.keys(v).every(k=>/^[0-7]$/.test(k)&&Number.isInteger(v[k])&&v[k]>=0&&v[k]<4);
const CFGOK={pick:v=>v==='host'||v==='all',timer:v=>[0,15,30,60].includes(v),target:v=>[0,3,5,10].includes(v),lock:v=>typeof v==='boolean',kick:fpList,members:fpList,teams:v=>[0,2,3,4].includes(v),tm:tmOk,chat:v=>typeof v==='boolean'};
function cleanCfg(c,base){const o={...CFG0,...base};if(c&&typeof c==='object')for(const k in CFGOK)if(CFGOK[k](c[k]))o[k]=Array.isArray(c[k])?[...new Set(c[k])]:c[k]&&typeof c[k]==='object'?{...c[k]}:c[k];return o;}
const cleanSc=sc=>Array.isArray(sc)&&sc.length===MAXP&&sc.every(x=>typeof x==='number'&&isFinite(x))?sc.slice():null;
const TAGOK=/^<(?:\/(?:b|small|span|em|i|u|strong|bdi)|br\s*\/?|(?:b|small|span|em|i|u|strong|bdi)(?:\s+(?:class="[\w -]{0,40}"|dir="(?:ltr|rtl|auto)"|style="(?:(?:color|background|font-size|font-weight|--c):(?:#[0-9A-Fa-f]{3,8}|var\(--[\w-]+\)|\d{1,3}(?:px|%)?|bold);?)+"))*)\s*>$/;
function cleanStr(t){return t.split(/(<[^<>]*>)/).map((x,i)=>i%2&&TAGOK.test(x)?x:x.replace(/<(?=[A-Za-z\/!?])/g,'&lt;').replace(/"/g,'”')).join('');}
function cleanVal(v,k){if(typeof v==='string')return cleanStr(v);if(v==null||typeof v==='number'||typeof v==='boolean')return v;if(k>12||typeof v!=='object')throw 0;
  if(Array.isArray(v))return v.map(x=>cleanVal(x,k+1));const o={};for(const n of Object.keys(v))if(n!=='__proto__')o[cleanStr(n)]=cleanVal(v[n],k+1);return o;}
function cleanD(d){
  if(d==null)return null;if(typeof d!=='object'||Array.isArray(d))throw 0;
  const pl=d.pl,n=Array.isArray(pl)?pl.length:0,seat=x=>Number.isInteger(x)&&x>=0&&x<n;
  if(n<1||n>MAXP||!pl.every(isRole)||new Set(pl).size!==n||typeof d.out!=='string'||!/^[01]*$/.test(d.out)||d.out.length!==n)throw 0;
  if(!(d.turn==null||seat(d.turn))||!(d.win==null||d.win==='d'||seat(d.win))||!(d.mw==null||isRole(d.mw))||!(d.wins==null||Array.isArray(d.wins)&&d.wins.every(seat)))throw 0;
  // teams: one team number (0..3) for every seat, and the winning team
  if(!(d.tm==null||Array.isArray(d.tm)&&d.tm.length===n&&d.tm.every(t=>Number.isInteger(t)&&t>=0&&t<4))||!(d.wt==null||Number.isInteger(d.wt)&&d.wt>=0&&d.wt<4))throw 0;
  // dsc: a game that moves session points itself (one whole number per seat, applied once at the round's end, never below 0)
  if(!(d.dsc==null||Array.isArray(d.dsc)&&d.dsc.length===n&&d.dsc.every(x=>Number.isInteger(x)&&x>=-1000&&x<=1000)))throw 0;
  if(!(d.wpts==null||typeof d.wpts==='number'&&d.wpts>=0&&d.wpts<=1000)||!(d.st==null||Number.isInteger(d.st)&&d.st>=0)||typeof d.gid!=='string'||!/^\w{0,16}$/.test(d.gid))throw 0;
  return cleanVal(d,0);}
// a peer's {g,d} made safe, or null when it is not a state this app could have made
function cleanSt(pr){try{const g=pr.g==null?null:pr.g;if(g!==null&&!(typeof g==='string'&&Object.prototype.hasOwnProperty.call(GAMES,g)))return null;return {g,d:g==null?null:cleanD(pr.d)};}catch(e){return null;}}
// onPeers (reading the room) is in net.js

/* ================= helpers ================= */
function toast(t){const el=document.createElement('div');el.className='toast';el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2000);}
function mySeat(d){d=d||S.st.d;return S.mode==='local'||!d?null:d.pl.indexOf(S.me);}
// d and priv are what this phone may see (online: its own view, net.js dView/privView)
function mkCtx(d=dView(),priv=privView()){
  const G=GAMES[S.st.g],local=S.mode==='local';
  if(local&&hasBots()){const hs=humanSeats(d),sim=isSimul(G,d);let v;
    if(sim)v=hs.find(s=>d.out[s]!=='1'&&!hasPicked(d,s));else if(!isBot(d,d.turn))v=d.turn;
    if(v==null)v=hs.includes(S.lastHuman)?S.lastHuman:hs[0];if(v==null)v=-1;S.lastHuman=v;
    const extra=G.canAct?G.canAct(d,S.priv):true;
    if(sim)return {local:false,v,priv:S.priv,my:v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v)&&extra,simul:true,bots:true};
    return {local:false,v,priv:S.priv,my:d.win==null&&extra&&d.turn===v,bots:true};}
  if(!local)return ctxFor(d,d.pl.indexOf(S.me),priv);
  const v=G.viewer?G.viewer(d,S.priv):d.turn;
  const extra=G.canAct?G.canAct(d,S.priv):true;
  if(isSimul(G,d)){const ok=v!=null&&v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v);return {local,v,priv:S.priv,my:ok&&extra,simul:true};}
  return {local,v,priv:S.priv,my:d.win==null&&extra&&(local||d.turn===v)};
}
function turnTxt(d,ctx){
  if(!ctx.local&&d.turn===ctx.v)return '<b class="yt">دورك</b>';
  return `دور ${nameTag(d,d.turn)}`;
}
// seats whose player is not in the room; with all=false only those gone for longer than GRACE (they can be skipped)
function absentSeats(d,G,all,slack){if(S.mode!=='online'||d.win!=null)return [];const off=s=>{const r=d.pl[s];return !S.roles.has(r)&&(all||Date.now()-((S.goneAt||{})[r]??S.joinT??0)>=GRACE-(slack||0));};
  if(isSimul(G,d))return aliveSeats(d).filter(s=>off(s)&&!hasPicked(d,s));return off(d.turn)?[d.turn]:[];}
// the host (or the one phone) takes the players who are gone out of the round
// (slack: a player's phone asked for it after its own GRACE; this phone may have seen the seat go a few seconds later)
function skipAbsent(slack){const d=S.st.d;if(!d||d.win!=null)return;const G=GAMES[S.st.g];const gone=absentSeats(d,G,false,slack);if(!gone.length)return;let out=d.out;for(const x of gone)out=setAt(out,x,'1');const al=aliveSeats(d,out);
  const nd={...d,out,turn:out[d.turn]==='1'?nextSeat(d,d.turn,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd,d):nd);}
function winTitle(d,G,ctx){if(d.tm&&typeof d.win==='number'&&TEAMS[d.tm[d.win]]&&!(G.winText&&G.winText(d))){const t=d.tm[d.win];return !ctx.local&&ctx.v>=0&&d.tm[ctx.v]===t?'فاز فريقك! 🎉':`فاز فريق ${teamName(t)}!`;}
  if(Array.isArray(d.wins)&&d.wins.length>1&&!(G.winText&&G.winText(d)))return !ctx.local&&d.wins.includes(ctx.v)?'فزتوا! 🎉':`فاز ${d.wins.map(w=>nm(d,w)).join(' و')}!`;return G.winText&&G.winText(d)||(d.win==='d'?'تعادل!':(!ctx.local&&d.win===ctx.v?'فزت! 🎉':`فاز ${nm(d,d.win)}!`));}
function statusHTML(d,G,ctx){try{
  if(d.win!=null){
    const c=typeof d.win==='number'?col(d,d.win):'var(--ink)';
    return `<span class="w" style="color:${c}">${winTitle(d,G,ctx)}</span> ${againBtn('sm go')}`+(G.winExtra?`<br><small>${String(G.winExtra(d,ctx)).replace(/<br\s*\/?>/g,' • ')}</small>`:'');
  }
  let s=G.status?G.status(d,ctx):turnTxt(d,ctx);
  if(!ctx.local&&ctx.v<0)s+='<br><small>تتفرج الحين، وتدخل معهم في الجولة الجاية</small>';
  if(S.mode==='online'&&!hostHere())s+='<br><span class="gone">صاحب الغرفة طلع، ننتظر…</span>';
  const gone=absentSeats(d,G),wait=gone.length?[]:absentSeats(d,G,true);
  if(!ctx.local&&gone.length)s+=`<br><span class="gone">${gone.map(x=>nm(d,x)).join('، ')} طلع <button class="sm" data-a="skip">تخطّاه</button></span>`;
  else if(!ctx.local&&wait.length)s+=`<br><span class="gone">${wait.map(x=>nm(d,x)).join('، ')} انقطع، ننتظره شوي…</span>`;
  return s;}catch(e){console.error(e);return '';}
}
/* the status card always has the same height: one quiet line for what just happened, one line for what to do now */
function statusBox(html){
  const parts=String(html).split(/<br\s*\/?>/);const sub=[],main=[];
  for(const p of parts){const t=p.trim();if(!t)continue;if(/^<small>[\s\S]*<\/small>$/.test(t)&&!/<small>[\s\S]*<small>/.test(t))sub.push(t.slice(7,-8));else main.push(t);}
  return `<div class="st-sub">${sub.join(' • ')}</div><div class="st-main">${main.join(' ')}</div>`;
}
/* the match ends on the round that leaves one player alone at the top with the target or more (a tie at the top plays on).
   The winner is kept in that round's state (d.mw), so every device shows it on that result only, and the next round starts a new match */
// with teams the players of the winning team share the lead, so a lead held only by them ends the match too
function matchEnd(nd,sc){const t=cfg().target;if(!t)return nd;const mx=Math.max(...sc),top=sc.map((x,r)=>x===mx?r:-1).filter(r=>r>=0);
  const team=!!nd.tm&&Array.isArray(nd.wins)&&top.every(r=>nd.wins.includes(nd.pl.indexOf(r)));return mx>=t&&(top.length===1||team)?{...nd,mw:top[0]}:nd;}
const matchOver=()=>{const d=S.st.d;return !!(d&&d.win!=null&&d.mw!=null);};
const matchSc=()=>S.st.d&&S.st.d.mw!=null?Array(MAXP).fill(0):S.st.sc;
const matchTie=()=>{const t=cfg().target,sc=S.st.sc,mx=Math.max(...sc);return !!t&&mx>=t&&sc.filter(x=>x===mx).length>1;};
const againBtn=cls=>matchOver()?`<button class="${cls}" data-a="again" ${isHost()?'':'disabled'}>مباراة جديدة</button>`:`<button class="${cls}" data-a="again">جولة جديدة</button>`;


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
  OUT='';try{
  if(S.mode===null)renderHome();
  else if(S.mode==='lobby')renderLobby();
  else if(S.mode==='stats')renderStats();
  else if(S.mode==='near')renderNear();
  else if(!S.st.g||!GAMES[S.st.g]||!S.st.d||S.browse)renderGrid();
  else renderGame();}
  catch(e){console.error(e);const inGame=S.st.g&&S.st.d&&!S.browse&&(S.mode==='online'||S.mode==='local');OUT=`${topBar('ألعابنا',inGame?'browse':S.mode==='online'?'leave':'home')}${roomBar()}<p class="err">صار خطأ في عرض الشاشة.</p>`;}
  // the screen is patched in place: only what changed is touched, so the page does not jump and typing is not lost
  const screen=S.mode+'|'+(S.mode==='online'||S.mode==='local'?(S.st.g&&!S.browse&&S.st.d?'g:'+S.st.g:'grid'):'');
  // a new screen slides in once (style.css #app.scr-in); later patches of the same screen do not animate
  if(screen!==S.lastScreen){S.lastScreen=screen;app.innerHTML='';S.lastHtml=null;window.scrollTo(0,0);app.dataset.s=S.mode==null?'home':/\|g:/.test(screen)?'game':S.mode==='online'||S.mode==='local'?'grid':S.mode;app.classList.add('scr-in');clearTimeout(S.scrT);S.scrT=setTimeout(()=>app.classList.remove('scr-in'),300);if(app.dataset.s==='grid')gridWarm();}
  // the chat stays at the newest line unless its reader scrolled up (then a "new messages" button shows)
  const mb0=app.querySelector('.msgs'),atBot=!mb0||mb0.scrollHeight-mb0.scrollTop-mb0.clientHeight<60;
  // nothing changed on screen (a heartbeat, another player's message that does not show here): the page is left alone
  const html=OUT+(S.modal?modalHTML():'')+(S.gload?'<div class="gload" role="status"><i></i>نجهّز الألعاب…</div>':'');if(html!==S.lastHtml||app.childNodes.length!==S.lastKids){morph(app,html);S.lastHtml=html;S.lastKids=app.childNodes.length;}
  {const mb=app.querySelector('.msgs');if(mb){const L=chatList(),last=L[L.length-1],lk=last?last.i:'';
    if(mb._k!==lk||!mb._s){const first=!mb._s;mb._k=lk;mb._s=1;const j=app.querySelector('.jump');
      if(first||atBot||(last&&last.me)){mb.scrollTop=mb.scrollHeight;if(S.chatJump){S.chatJump=false;if(j)j.classList.remove('on');}}
      else if(!S.chatJump){S.chatJump=true;if(j)j.classList.add('on');}}}}
  navSync();
  if(fid&&document.activeElement!==app.querySelector(`[data-draft="${fid}"]`)){const el=app.querySelector(`[data-draft="${fid}"]`);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(cs,cs);}catch(e){}}}
  const strip=app.querySelector('.players');if(strip&&strip.scrollWidth>strip.clientWidth+2){const on=strip.querySelector('.pt.on');const k=S.st.g+':'+(S.st.d&&S.st.d.turn);if(on&&S.stripKey!==k){S.stripKey=k;const c=strip.getBoundingClientRect(),e=on.getBoundingClientRect();strip.scrollBy({left:(e.left+e.width/2)-(c.left+c.width/2),behavior:'smooth'});}}
  const G=GAMES[S.st.g];if(G&&G.after&&S.st.d&&!S.browse&&(S.mode==='online'||S.mode==='local'))try{G.after(dView(),mkCtx());}catch(e){console.error(e);}
  noteHere();
}
function topBar(title,back,extra){
  return `<div class="top"><button class="ib" data-a="${back}" aria-label="رجوع">${BACK}</button><h1>${title}</h1>${extra||''}<button class="ib" data-a="mute" aria-label="${S.mute?'شغّل الصوت':'اكتم الصوت'}" aria-pressed="${S.mute}">${S.mute?'🔇':'🔊'}</button></div>`;
}
const CHEV='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MODEI={
 local:'<svg viewBox="0 0 48 48"><rect x="13" y="4" width="22" height="40" rx="6" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="19.5" cy="20" r="3.6" fill="#fff"/><circle cx="28.5" cy="20" r="3.6" fill="#fff"/><path d="M14.5 32c.8-3.8 2.6-5.8 5-5.8s4.2 2 5 5.8M23.5 32c.8-3.8 2.6-5.8 5-5.8s4.2 2 5 5.8" fill="#fff"/></svg>',
 lobby:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="#fff" stroke-width="3.5"/><ellipse cx="24" cy="24" rx="7.5" ry="17" fill="none" stroke="#fff" stroke-width="3"/><path d="M8.5 17.5h31M8.5 30.5h31" stroke="#fff" stroke-width="3"/></svg>',
 vsbot:'<svg viewBox="0 0 48 48"><path d="M24 14V9" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="7.5" r="3.4" fill="#fff"/><rect x="9" y="14" width="30" height="24" rx="8" fill="#fff"/><circle cx="18" cy="25" r="3.6" fill="#2D4763"/><circle cx="30" cy="25" r="3.6" fill="#2D4763"/><path d="M19 32h10" stroke="#2D4763" stroke-width="3" stroke-linecap="round"/><path d="M5 22v8M43 22v8" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>',
 near:'<svg viewBox="0 0 48 48"><circle cx="24" cy="31" r="4.5" fill="#fff"/><path d="M15.5 23.5a12 12 0 0 1 17 0M9.5 17.5a20.5 20.5 0 0 1 29 0" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round"/></svg>'};
const PIC={me:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.6" fill="#fff"/><path d="M3.5 21c.6-4.6 4-7.2 8.5-7.2s7.9 2.6 8.5 7.2z" fill="#fff"/></svg>',
 add:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
 key:'<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.5" fill="none" stroke="#fff" stroke-width="3"/><path d="M12.5 12H21M18 12v3.5" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
 near:'<svg viewBox="0 0 24 24"><circle cx="12" cy="15.5" r="2.4" fill="#fff"/><path d="M7.8 11.6a6 6 0 0 1 8.4 0M4.8 8.6a10.2 10.2 0 0 1 14.4 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>'};
const pTitle=(ic,cls,t)=>`<h3 class="pt3"><i class="pic ${cls}">${PIC[ic]}</i>${t}</h3>`;
const modeBtn=(a,cls,t,sub)=>`<button class="mode ${cls}" data-a="${a}"><i class="mode-ic">${MODEI[a]}</i><span class="mode-tx"><b>${t}</b><small>${sub}</small></span><i class="mode-go">${CHEV}</i></button>`;
// small game tiles in a row that scrolls sideways (home: start right away on this phone; game list: pick)
const recRow=(ks,a)=>`<div class="recs">${ks.map(g=>{const G=gInfo(g);return `<button class="rec" data-a="${a}" data-v="${g}"><span class="gi">${G.icon}</span><span class="rn">${G.name}</span></button>`;}).join('')}</div>`;
const ICO_PLAY='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 5.5v13L17.5 12z" fill="currentColor"/></svg>';
// home: one screen that never scrolls on a phone. Logo, the four ways to play as equal tiles, one "continue" card when there is
// something to continue, and a one-line strip of the last games
const modeTile=(a,cls,t,sub,off)=>`<button class="tile ${cls}${off?' off':''}" data-a="${off?'nearoff':a}"${off?' aria-disabled="true"':''}><i class="mode-ic">${MODEI[a]}</i><b>${t}</b><small>${sub}</small></button>`;
function renderHome(){
  const l=loadLocal(),rec=recentGames().filter(g=>!l||g!==l.st.g).slice(0,5),n=GREADY?Object.keys(GAMES).length:GMETA.n,st=statsAll();
  const near=!!(window.NEARROOM&&NEARROOM.available());
  OUT=`<div class="hx-hero">${LOGO}<div class="hx-tt"><h1>ألعابنا</h1><p>${n?`${n} لعبة • `:''}من 2 إلى ${MAXP} لاعبين</p></div></div>
  ${S.update?`<a class="upd" href="${S.update.apk}" target="_blank" rel="noopener"><i>⬇️</i><span>فيه تحديث للتطبيق<small>اضغط وحمّله</small></span></a>`:''}
  ${l?`<button class="hx-cont" data-a="lresume"><span class="gi">${gInfo(l.st.g).icon}</span><span class="mode-tx"><small>كمّل اللعبة</small><b>${gInfo(l.st.g).name}</b></span><i class="hx-play">${ICO_PLAY}</i></button>`:''}
  <div class="hx-tiles">${modeTile('local','red','على نفس الجهاز','جوال واحد للكل')}${modeTile('lobby','blue','أونلاين','كل واحد بجواله')}${modeTile('vsbot','navy','ضد البوت','العب لحالك')}${modeTile('near','green','قريب بدون نت',near?'بلوتوث':'متوفر في التطبيق',!near)}</div>
  ${rec.length||st.n?`<div class="hx-foot">${rec.length?`<div class="hx-rec" role="group" aria-label="لعبت مؤخرًا">${rec.map(g=>{const G=gInfo(g);return `<button class="hr" data-a="quick" data-v="${g}" aria-label="${G.name}"><span class="gi">${G.icon}</span></button>`;}).join('')}</div>`:''}${st.n?`<button class="hx-st" data-a="stats" aria-label="إحصائياتي"><b>${st.w}</b><small>فوز</small></button>`:''}</div>`:''}`;
}
function renderNear(){
  const L=S.nearList||[],D=S.nearDiag||[];
  // what the phone must change (Bluetooth, location, permission) shows with its button; anything else is one short line, and the
  // technical details only for support (a long press on the title, S.nearLog)
  const act=D.filter(x=>x.a),other=D.length>act.length;
  OUT=`${topBar('قريب بدون نت','home')}
  ${D.length?`<div class="panel ndiag">${act.map(x=>`<div class="nd"><p>${x.t}</p><button class="btn" data-a="nset" data-w="${x.a}">${x.b}</button></div>`).join('')}${other&&!act.length?'<div class="nd"><p>ما قدرنا نشغّل اللعب القريب على هالجوال</p></div>':''}<button class="big green" data-a="near">حاول مرة ثانية</button></div>`:''}
  <div class="panel">${pTitle('me','navy','اسمك')}<input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="مثلًا: محمد" autocomplete="off"></div>
  <button class="big red mkroom" data-a="ncreate" ${S.joining?'disabled':''}>أنشئ غرفة</button>
  <div class="panel">${pTitle('near','green','الغرف القريبة')}${L.length?`<div class="nlist">${L.map((f,i)=>`<button class="nroom" data-a="njoin" data-i="${i}" ${S.joining?'disabled':''}><b>${escH(f.host)||'غرفة'}</b><i>ادخل</i></button>`).join('')}</div>`:S.nearScan?`<p class="scan"><i></i>ندوّر على غرف قريبة…</p>`:''}</div>
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}
  ${NEARROOM.debug&&NEARROOM.log.length?`<details class="nlog"><summary>تفاصيل الاتصال</summary><pre>${escH(NEARROOM.log.join('\n'))}</pre></details>`:''}`;
}
// turns a native error into a short Arabic hint (the raw code stays in NEARROOM.log, never on screen)
function nearErr(m){m=String(m||'');
  let t='ما قدرت أشغّل الغرف القريبة.';
  if(m==='perm'||/PERMISSION/i.test(m))t='الجوال ما أعطى التطبيق صلاحية الأجهزة القريبة أو الموقع.';
  else if(m==='timeout')t='ما رد صاحب الغرفة. قرّبوا من بعض وجرّب مرة ثانية.';
  else if(/LOCATION/i.test(m))t='شغّل الموقع في الجوال.';
  else if(/BLUETOOTH|RADIO/i.test(m))t='شغّل البلوتوث وجرّب مرة ثانية.';
  else if(/API_UNAVAILABLE|SERVICE_MISSING|not implemented/i.test(m))t='هذا الجوال ما فيه خدمات Google اللي يحتاجها اللعب القريب.';
  return t;}
async function nearCheck(){
  const st=await NEARROOM.status(),D=[];
  if(st.fail)D.push({t:nearErr(st.fail)});
  else{
    if(st.gmsOk===false)D.push({t:'هذا الجوال ما فيه خدمات Google أو تحتاج تحديث، واللعب القريب يحتاجها.',...(st.gmsFix?{a:'gms',b:'حدّث خدمات Google'}:{})});
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
    else{const m=r.msg||'';D.push({t:nearErr(m),...(/PERMISSION/i.test(m)?{a:'app',b:'افتح صلاحيات التطبيق'}:/LOCATION/i.test(m)?{a:'loc',b:'افتح الموقع'}:/BLUETOOTH|RADIO/i.test(m)?{a:'bt',b:'افتح البلوتوث'}:{})});}
  }
  S.nearScan=r.ok;S.nearDiag=D;render();}
function renderLobby(){
  const sv=loadSaved();
  OUT=`${topBar('أونلاين','home')}
  <div class="panel">${pTitle('me','navy','اسمك وصورتك')}<input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="مثلًا: محمد" autocomplete="off">${avPicker()}</div>
  <button class="big red mkroom" data-a="create" ${S.joining?'disabled':''}>أنشئ غرفة</button>
  <div class="panel">${pTitle('key','blue','عندك رمز؟')}<input class="code" id="code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="······" aria-label="رمز الغرفة"><button class="big blue" data-a="join" ${S.joining?'disabled':''}>ادخل</button></div>
  ${sv&&sv.code&&sv.via!=='near'?`<button class="hx-cont room" data-a="resume"><i class="pic blue">${PIC.key}</i><span class="mode-tx"><small>ارجع لغرفتك</small><b class="ltr">${sv.code}</b></span><i class="hx-play"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 5.5v13L17.5 12z" fill="currentColor"/></svg></i></button>`:''}
  ${S.joining?'<p class="note">جاري الاتصال…</p>':''}${S.roomErr?`<p class="err">${S.roomErr}</p>`:''}`;
}
function roomBar(full){try{
  if(S.mode!=='online')return '';
  const pl=players(),h=actingHost(),near=S.via==='near';
  const av=pl.map(r=>`<span class="av ${r===S.me?'me':''}" data-r="${r}" style="--c:${COLS[r]}">${avOf(r)||shapeW(r)}${r===h?'<em>👑</em>':''}</span>`).join('');
  let s=`<div class="roombar"><div class="rb-code"><small>${near?'📶 غرفة قريبة':'رمز الغرفة'}${cfg().lock?' 🔒':''}</small><b class="code">${S.code}</b></div>${near?'':'<button class="rbb" data-a="copy" aria-label="نسخ الرمز">نسخ</button>'}<div class="rb-av">${av}</div><button class="rbb" data-a="m-settings" aria-label="الإعدادات">⚙️</button></div>`;
  // the connection is down, or nobody else is in this room (most likely a mistyped code): say it where everyone looks
  if(S.needUpd)s+='<p class="updb" role="status">حدّث التطبيق عشان تلعب في هالغرفة</p>';
  if(S.offline)s+=`<p class="err" role="status">${S.offline==='full'?'الغرفة مليانة، نحاول ندخل مرة ثانية…':'انقطع الاتصال، نحاول نرجع…'}</p>`;
  else if(S.roomEmpty&&pl.length<2)s+=`<div class="panel"><p class="err">ما لقينا أحد في هذي الغرفة، تأكد من الرمز</p><div class="acts"><button class="btn" data-a="recode">عدّل الرمز</button><button class="btn navy" data-a="leave">اطلع</button></div></div>`;
  if(full){const me=S.pending?'<p class="note">جاري اختيار لونك…</p>':S.me==null?'<p class="note">تتفرج الحين</p>':'';
    s+=`<div class="panel members"><div class="mh"><b>اللاعبين</b><small>${pl.length} من ${MAXP}</small></div>${me}<div class="mlist">${pl.map(r=>`<span class="mem" style="--c:${COLS[r]}"><i>${avOf(r)||shapeW(r)}</i>${r===S.me?'أنت':pname(r)}${r===h?' 👑':''}</span>`).join('')}</div></div>`;}
  return s;}catch(e){console.error(e);return '';}
}
// tile ribbons («جديد» / «مطوّرة»): none for now, nearly every game is new or upgraded and the ribbons only cluttered the list
const NEWG=[];
// games rebuilt with new rules or a new look
const UPG=[];
// the sections of the game list; a game says its own (G.cat), CAT_OF files the older games into the newer, finer sections
const CATS=[['board','ألعاب لوحة'],['cards','ورق ودومينو'],['dice','زهر'],['party','جماعية'],['quiz','مسابقات'],['words','كلمات وحروف'],
  ['mind','ذكاء وتخمين'],['puzzle','ألغاز وتركيب'],['speed','سرعة وردة فعل'],['fight','قتالية'],['sport','رياضة ومهارة']];
const CATN=Object.fromEntries(CATS);
const CAT_OF={yatzy:'dice',liar:'dice',shut:'dice',pig:'dice',farkle:'dice',camel:'dice',
  word:'words',wasla:'words',scr:'words',cats:'words',prov:'words',
  mafia:'party',bara:'party',tele:'party',cups:'party',close:'party',major:'party',odd:'party',bingo:'party',luck:'party',rps:'party',
  react:'speed',stroop:'speed',typing:'speed',tapwar:'speed',cnt:'speed',oddc:'speed',simon:'speed',
  sudo:'puzzle',mines:'puzzle',memory:'puzzle',seq:'puzzle',nmem:'puzzle',
  trivia:'quiz',math:'quiz',caps:'quiz',islam:'quiz',sci:'quiz',geo:'quiz',tf:'quiz'};
const catOf=k=>{const c=CAT_OF[k]||(GAMES[k]&&GAMES[k].cat);return CATN[c]?c:'board';};
const iconE=(bg,e)=>{const id='ie'+bg.replace(/[^0-9a-f]/gi,'')+[...e].length;const num=/^[0-9]+$/.test(e);
  return `<svg viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(bg,.22)}"/><stop offset="1" stop-color="${shade(bg,-.12)}"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id})"/><circle cx="84" cy="14" r="30" fill="#fff" opacity=".1"/><circle cx="8" cy="92" r="34" fill="#000" opacity=".06"/><circle cx="50" cy="44" r="27" fill="#fff" opacity=".16"/>${num?`<text x="50" y="57" text-anchor="middle" font-size="36" font-weight="900" fill="#fff">${e}</text>`:`<text x="50" y="61" text-anchor="middle" font-size="46">${e}</text>`}</svg>`;};
function standings(){
  const rs=S.mode==='local'?players():[...new Set([...players(),...S.st.sc.map((x,r)=>x>0?r:-1).filter(r=>r>=0)])];
  if(!rs.some(r=>S.st.sc[r]>0))return '';const t=cfg().target;
  return `<div class="panel standings"><div class="ph"><b>نقاط الجلسة</b>${t?`<small>الفوز بالمباراة عند ${escH(t)}</small>`:''}</div><div class="mlist">${rs.sort((a,b)=>S.st.sc[b]-S.st.sc[a]).map(r=>`<span class="mem" style="--c:${COLS[r]}"><i>${shapeW(r)}</i>${r===S.me?'أنت':pname(r)} <b>${escH(S.st.sc[r])}</b></span>`).join('')}</div></div>`;
}
const liveCard=(g,a,t,btn)=>`<div class="panel live"><span class="gi">${GAMES[g].icon}</span><span class="lv-tx"><small>${t}</small><b>${GAMES[g].name}</b></span><button class="sm go" data-a="${a}">${btn}</button></div>`;
// local: the game left with back stays open here, and a game the app closed on can go on
function localLive(){const d=S.st.d;if(S.st.g&&d&&GAMES[S.st.g]&&d.win==null)return liveCard(S.st.g,'resumegame','اللعبة الحالية','ارجع لها');
  const l=!d&&loadLocal();return l?liveCard(l.st.g,'lresume','لعبة ما خلصت','كمّل اللعبة'):'';}
// a table always keeps one human seat: if none is left, the first bot seat becomes a person again
function keepHuman(){if(humanSeats({pl:[...Array(S.localN).keys()]}).length)return false;delete S.bots[[...Array(S.localN).keys()].find(r=>S.bots[r])];toast('لازم لاعب واحد على الأقل يكون إنسان');save();return true;}
/* teams: from four players up the host (or the one phone) splits the players into 2, 3 or 4 teams; a tap on a player's badge moves him on */
function teamK(){const k=cfg().teams||0;return k&&players().length>=k*2?k:0;}
function teamChip(r){const k=teamK();if(!k)return '';const t=roleTeam(r,k);return `<button class="tmc" style="--c:${TEAMS[t].c}" data-a="tmc" data-i="${r}" ${isHost()?'':'disabled'} aria-label="فريق ${TEAMS[t].n}، اضغط لتغييره">${TEAMS[t].e}</button>`;}
function teamSegs(){const n=players().length;if(n<4)return '';const k=teamK(),h=isHost();
  return `<div class="tmset"><label class="lab">طريقة اللعب</label><div class="segs">${[0,2,3,4].filter(x=>!x||n>=x*2).map(x=>`<button class="seg ${k===x?'on':''}" data-a="teams" data-i="${x}" ${h?'':'disabled'}>${x?(x===2?'فريقين':x+' فرق'):'كل واحد لحاله'}</button>`).join('')}</div>${k?`<div class="tmleg">${TEAMS.slice(0,k).map((t,i)=>`<span style="--c:${t.c}">${t.e} ${t.n} <b>${players().filter(r=>roleTeam(r,k)===i).length}</b></span>`).join('')}</div><p class="note">اضغط الشعار لتغيير الفريق</p>`:''}</div>`;}
function localSetup(){const n=S.localN,nb=[...Array(n).keys()].filter(r=>S.bots[r]).length;
  return `<div class="panel lsetup"><div class="ls-head"><span class="ph"><b>اللاعبين</b>${nb?`<small>${n-nb} ${n-nb>1?'أشخاص':'شخص'} و${nb} ${nb>1?'بوتات':'بوت'}</small>`:''}</span><div class="stepper"><button data-a="dec" aria-label="أقل" class="${n<=2?'dim':''}">−</button><b>${n}</b><button data-a="inc" aria-label="أكثر" class="${n>=MAXP?'dim':''}">+</button></div></div>
    <div class="names">${[...Array(n).keys()].map(r=>{const b=S.bots[r];return `<div class="lrow ${b?'bot':''}" style="--c:${COLS[r]}"><i class="lav">${shapeW(r)}</i>${b?`<div class="lvl">${[1,2,3].map(l=>`<button class="${b===l?'on':''}" data-a="botL" data-i="${r}" data-v="${l}">${BOTL[l]}</button>`).join('')}</div>`:`<input class="field nm" data-draft="ln${r}" value="${escH(S.localNames[r]||'')}" placeholder="${b?BOTN[r]:NAMES[r]}" maxlength="14">`}${teamChip(r)}<button class="lbt ${b?'on':''}" data-a="botT" data-i="${r}" aria-label="لاعب أو بوت"><span>👤</span><span>🤖</span></button></div>`;}).join('')}</div>${teamSegs()}</div>`;}
// how many play now: a game that needs more players (or fewer, G.maxP) is dimmed in the list
const hereN=()=>S.mode==='local'?S.localN:players().length;
const fitN=(k,n)=>{const G=GAMES[k];return !(G.minP&&n<G.minP)&&!(G.maxP&&n>G.maxP);};
const ICO_STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4l-5.8 3 1.1-6.4-4.7-4.6 6.5-.9z"/></svg>';
const ICO_DICE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="currentColor"/><g fill="var(--surface)"><circle cx="8" cy="8" r="1.9"/><circle cx="16" cy="8" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="8" cy="16" r="1.9"/><circle cx="16" cy="16" r="1.9"/></g></svg>';
const ICO_PPL='<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><circle cx="12" cy="7" r="5" fill="currentColor"/><path d="M2 23c0-6 4.5-9 10-9s10 3 10 9z" fill="currentColor"/></svg>';
// the sections of the game list are laid out only near the screen (style.css .gsec); once the list is up, the idle moments
// lay them out one by one (app data-gv), so a later fast scroll does not have to
function gridWarm(){app.dataset.gv='0';const ric=window.requestIdleCallback||(f=>setTimeout(f,150));
  const step=()=>{if(app.dataset.s!=='grid')return;const n=app.querySelectorAll('.gsec').length,v=+app.dataset.gv||0;if(v>=Math.min(n,14))return;app.dataset.gv=String(v+1);ric(step,{timeout:2000});};
  ric(step,{timeout:2000});}
// a tile is few nodes (its star and the players badge are drawn by CSS): 200 of them stay light
function tileHTML(k,fav,n){const G=GAMES[k],dim=!fitN(k,n);
  const b=NEWG.includes(k)?'<i class="newb">جديد</i>':UPG.includes(k)?'<i class="newb upg">مطوّرة</i>':'';
  return `<div class="gcard${dim?' dim':''}" data-k="t-${k}"><button class="gp" data-a="pick" data-g="${k}"><span class="gi">${G.icon}${b}${G.minP?`<i class="minb">${G.minP}+</i>`:''}</span><span class="lb">${G.name}</span></button><button class="fv${fav?' on':''}" data-a="fav" data-g="${k}" aria-label="${fav?'شيلها من المفضلة':'أضفها للمفضلة'}" aria-pressed="${fav}"></button></div>`;}
// the sections of tiles; kept between renders (a heartbeat online, a typed letter elsewhere) while nothing in them changed.
// Each section is skipped by the browser while it is off screen (style.css .gsec content-visibility)
function gridBody(q,cat,n){
  const fv=favGames(),key=[q,cat,n,fv.join(),Object.keys(GAMES).length].join('|');if(S.gridC&&S.gridC.k===key)return S.gridC.h;
  const all=Object.keys(GAMES),fav=new Set(fv),up=k=>NEWG.includes(k)||UPG.includes(k)?1:0;
  const sec=(t,ks)=>`<section class="gsec" style="contain-intrinsic-size:auto ${Math.ceil(ks.length/3)*172}px"><h2 class="cat">${t} <small>${ks.length}</small></h2><div class="grid">${ks.map(k=>tileHTML(k,fav.has(k),n)).join('')}</div></section>`;
  let h;
  if(q){const ks=all.filter(k=>gMatch(k,q));const st=k=>normQ(GAMES[k].name).startsWith(q)?0:1;ks.sort((a,b)=>st(a)-st(b));
    h=ks.length?sec('نتائج البحث',ks):`<div class="gempty"><p>ما لقينا لعبة بهالاسم 🤔</p><button class="btn soft" data-a="qclear">امسح البحث</button></div>`;}
  else h=CATS.filter(([c])=>!cat||c===cat).map(([c,t])=>{const ks=all.filter(k=>catOf(k)===c).sort((a,b)=>up(b)-up(a));return ks.length?sec(t,ks):'';}).join('');
  S.gridC={k:key,h};return h;}
function renderGrid(){
  let mid='';
  if(S.mode==='local')mid=localLive()+localSetup();
  else{
    const live=S.st.g&&S.st.d&&GAMES[S.st.g];
    if(live)mid+=liveCard(S.st.g,'resumegame','اللعبة الحالية','ارجع لها');
    mid+=players().length<2?(S.roomEmpty?'':'<p class="note">أرسل الرمز لأصحابك</p>'):canPick()?'':'<p class="note">صاحب الغرفة 👑 يختار اللعبة</p>';
  }
  const q=normQ(S.draft.q||''),cat=!q&&CATN[S.gcat]?S.gcat:'',n=hereN(),all=Object.keys(GAMES);
  const mine=S.mode==='local'||canPick(),rec=!q&&!cat&&mine?recentGames():[],fav=!q&&!cat&&mine?favGames():[];
  const cnt={};for(const k of all){const c=catOf(k);cnt[c]=(cnt[c]||0)+1;}

  OUT=`${topBar('اختر لعبة',S.mode==='online'?'leave':'home',S.mode==='local'?'<button class="ib" data-a="m-settings" aria-label="الإعدادات">⚙️</button>':'')}${roomBar(true)}${mid}${standings()}
  <div class="gsent"></div><div class="gtools"><div class="gsrow"><input class="field search" type="search" data-draft="q" value="${escH(S.draft.q||'')}" placeholder="🔍 دوّر على لعبة" autocomplete="off" enterkeyhint="search" aria-label="دوّر على لعبة"><button class="grnd" data-a="rand" aria-label="لعبة عشوائية">${ICO_DICE}<span>عشوائية</span></button></div>
  <div class="cats">${[['','الكل',all.length],...CATS.filter(([c])=>cnt[c]).map(([c,t])=>[c,t,cnt[c]])].map(([c,t,k])=>`<button class="cchip ${cat===c?'on':''}" data-a="gcat" data-v="${c}" aria-pressed="${cat===c}">${t}<small>${k}</small></button>`).join('')}</div></div>
  ${S.mode==='online'?fabs():''}
  ${fav.length?`<h2 class="cat">⭐ المفضلة</h2>${recRow(fav,'rpick')}`:''}
  ${rec.length?`<h2 class="cat">لعبت مؤخرًا</h2>${recRow(rec,'rpick')}`:''}

  ${gridBody(q,cat,n)}`;
}
// search: no diacritics or tatweel, one alef, ه for ة, ي for ى and ئ, و for ؤ; every word must match, with or without «ال»
const normQ=t=>String(t).toLowerCase().replace(/[ً-ٰٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/\s+/g,' ').trim();
const GQ_CACHE=new Map();
function gMatch(k,q){if(!q)return true;let h=GQ_CACHE.get(k);if(h==null){const G=GAMES[k];h=' '+normQ(G.name+' '+(CATN[catOf(k)]||'')+' '+k)+' ';GQ_CACHE.set(k,h);}
  return q.split(' ').every(w=>h.includes(w)||(w.startsWith('ال')&&w.length>3&&h.includes(w.slice(2)))||h.includes(' ال'+w));}
function scoreBar(sc,d){try{
  const G=GAMES[S.st.g];let pts=null;try{pts=G.points?G.points(d):(Array.isArray(d.pts)?d.pts:null);}catch(e){}
  const simul=isSimul(G,d),n=d.pl.length,tm=Array.isArray(d.tm)&&d.tm.length===n&&d.tm.every(t=>TEAMS[t])?d.tm:null;
  return `<div class="players ${n>4?'many':n>3?'four':''} ${tm?'teams':''}" style="--n:${Math.min(n,4)}">${d.pl.map((r,s)=>{const me=S.mode==='online'&&r===S.me;const label=me?'أنت':pname(r);const on=d.win==null&&!simul&&!(typeof G.noTurn==='function'?G.noTurn(d):G.noTurn)&&d.turn===s;
    const pk=simul&&d.win==null&&d.out[s]!=='1'?(hasPicked(d,s)?'<u class="pk ok">✓</u>':'<u class="pk">…</u>'):'';
    const won=typeof d.win==='number'&&(d.win===s||(Array.isArray(d.wins)&&d.wins.includes(s)));
    return `<div class="pt ${on?'on':''} ${me?'me':''} ${won?'won':''} ${d.out[s]==='1'?(G.outDone?'done':'out'):''}" data-r="${r}" style="--c:${COLS[r]}${tm?`;--tc:${TEAMS[tm[s]].c}`:''}"><i>${shapeW(r)}${sc[r]?`<b>${escH(sc[r])}</b>`:''}${tm?`<s class="tmb">${TEAMS[tm[s]].e}</s>`:''}</i><div class="tx"><span>${label}</span>${pts?`<em>${escH(pts[s])}</em>`:''}</div>${pk}</div>`;}).join('')}</div>${tm?teamStrip(d,pts):''}`;}catch(e){console.error(e);return '';}
}
// with teams: one chip per team under the players, with the team's total when the game counts points
function teamStrip(d,pts){const ts=[...new Set(d.tm)];const num=pts&&pts.every(x=>typeof x==='number'||/^-?\d+$/.test(String(x)));
  return `<div class="tstrip">${ts.map(t=>{const ss=teamSeats(d,t);const tot=num?ss.reduce((a,s)=>a+Math.max(0,+pts[s]||0),0):null;const won=d.win!=null&&d.wt===t;
    return `<span class="${won?'won':''}" style="--c:${TEAMS[t].c}"><i>${TEAMS[t].e}</i>${TEAMS[t].n}${tot!=null?` <b>${tot}</b>`:''}</span>`;}).join('')}</div>`;}
// pass the phone: the next player's colour, shape and name, and nothing of the game under it
const coverHTML=(d,v,m)=>`<div class="cover" style="--c:${col(d,v)}"><svg class="cv-bg" viewBox="0 0 40 40" aria-hidden="true">${SHP[d.pl[v]]('#fff')}</svg>${m?`<div class="msg">${m}</div>`:''}<i class="cv-av">${shapeW(d.pl[v])}</i><p>الجهاز الحين لـ</p><h2>${nm(d,v)}</h2>${d.tm&&TEAMS[d.tm[v]]?`<p class="cv-tm" style="--tc:${TEAMS[d.tm[v]].c}">${teamName(d.tm[v])}</p>`:''}<p class="cv-hint">خل الباقين ما يشوفون الشاشة 🙈</p><button class="big" data-a="reveal" data-i="${v}">أنا ${nm(d,v)}، ورّني</button></div>`;
function renderGame(){
  const {g,sc}=S.st,G=GAMES[g],d=dView();const ctx=mkCtx(d);let body=null,cover=false;
  if(S.mode==='local'&&G.viewer&&hasBots()){const hs=humanSeats(d);const v=d.win==null&&hs.length>1&&ctx.v>=0?ctx.v:null;
    if(v!=null&&S.seen!==v){cover=true;body=coverHTML(d,v,'');}}
  else if(S.mode==='local'&&G.viewer){
    const v=d.win==null?G.viewer(d,S.priv):null;
    if(v!=null&&S.seen!==v){cover=true;body=coverHTML(d,v,G.coverMsg?G.coverMsg(d):'');}
  }
  if(!body){try{body=G.render(d,ctx);}catch(e){console.error(e);body='<p class="err">صار خطأ في عرض اللعبة.</p><button class="sm go" data-a="again">جولة جديدة</button>';}}
  // alerts: your turn, results
  const myNow=!cover&&S.mode==='online'&&ctx.my;
  if(myNow&&!S.wasMy){sfx('turn');buzz();if(!isSimul(G,d)&&d.win==null){const b=document.createElement('div');b.className='ytb';b.style.setProperty('--c',col(d,ctx.v));b.textContent='دورك! 🎯';document.body.appendChild(b);setTimeout(()=>b.remove(),1700);}}S.wasMy=myNow;
  const enter=S.enterKey!==g+d.gid;S.enterKey=g+d.gid;
  if(d.win!=null&&S.winKey!==d.gid){S.winKey=d.gid;S.showResult=true;const mine=S.mode==='local'||d.win===ctx.v||(Array.isArray(d.wins)&&d.wins.includes(ctx.v));sfx(mine||d.win==='d'?'win':'lose');if(mine&&d.win!=='d')setTimeout(confetti,50);
    // this phone's stats: a win counts against bots (a person won) and online (this player won)
    const ws=typeof d.win==='number'?(Array.isArray(d.wins)?d.wins:[d.win]):[];try{noteStats(g,d,S.mode==='local'?hasBots()&&ws.some(s=>!isBot(d,s)):ws.includes(ctx.v));}catch(e){}}
  const left=timeLeft();
  // the status card takes the colour of whoever plays now (or of the winner)
  const acc=cover?null:d.win==null?(isSimul(G,d)?null:col(d,d.turn)):typeof d.win==='number'?col(d,d.win):null;
  const fv=favGames().includes(g);
  OUT=`${topBar(G.name,S.mode==='online'?'browse':'grid',`<button class="ib fvb ${fv?'on':''}" data-a="fav" data-g="${g}" aria-label="${fv?'شيلها من المفضلة':'أضفها للمفضلة'}" aria-pressed="${fv}">${ICO_STAR}</button><button class="ib" data-a="m-help" aria-label="القواعد">؟</button>`)}${roomBar()}${scoreBar(sc,d)}
  <div class="status ${cover?'nil':''} ${acc?'acc':''} ${d.win!=null?'over':''} ${ctx.my&&!cover&&S.mode==='online'?'mine':''} ${S.pend?'pend':''}"${acc?` style="--c:${acc}"`:''}>${cover?'':statusBox(statusHTML(d,G,ctx))}<div class="tbar" style="${left==null?'display:none':''}"><i style="width:${left==null?0:left/cfg().timer*100}%"></i></div></div><div class="board ${enter?'enter':''} ${S.pend?'wait':''}">${body}</div>
  ${S.mode==='online'?fabs():''}
  ${d.win!=null&&S.showResult&&!cover?resultHTML(d,G,ctx):''}`;
}
const TROPHY=`<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="tro" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7CF5A"/><stop offset=".45" stop-color="#FFE48A"/><stop offset="1" stop-color="#E09E14"/></linearGradient></defs>
<path d="M33 30H18c0 18 8 27 21 28M87 30h15c0 18-8 27-21 28" stroke="#E5A81F" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M32 18h56v24c0 19-12.5 32-28 32S32 61 32 42z" fill="url(#tro)"/><path d="M40 24v17c0 10 4 18 10 22" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/>
<path d="M60 31l4.2 8.6 9.4 1.3-6.8 6.6 1.6 9.3L60 52.4l-8.4 4.4 1.6-9.3-6.8-6.6 9.4-1.3z" fill="#fff" opacity=".9"/>
<rect x="53" y="72" width="14" height="14" fill="#E5A81F"/><rect x="40" y="85" width="40" height="9" rx="4" fill="#F0B429"/><rect x="34" y="93" width="52" height="15" rx="5" fill="#2D4763"/><rect x="48" y="98" width="24" height="5" rx="2.5" fill="#F0B429" opacity=".8"/></svg>`;
const MEDAL=`<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M38 8h18l12 40H50z" fill="#4AB1E8"/><path d="M82 8H64L52 48h18z" fill="#EC6158"/><circle cx="60" cy="74" r="30" fill="#C9D3DE"/><circle cx="60" cy="74" r="23" fill="#E6ECF2"/><path d="M60 59l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L60 82.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#A9B6C4"/></svg>`;
function resultHTML(d,G,ctx){
  const won=typeof d.win==='number',c=won?col(d,d.win):'var(--navy)';const ml=Number.isInteger(d.mw)&&d.mw>=0&&d.mw<MAXP?d.mw:null;
  const mine=won&&(S.mode==='local'||d.win===ctx.v||(Array.isArray(d.wins)&&d.wins.includes(ctx.v)));
  const sc=S.st.sc,rs=[...d.pl].sort((a,b)=>sc[b]-sc[a]),rank=r=>1+rs.filter(x=>sc[x]>sc[r]).length,who=r=>r===S.me?'أنت':pname(r);
  const ng=(S.mode==='local'||canPick())&&!matchOver()?suggestNext():null;
  const pod=rs.length>=3?`<div class="rs-pod">${[rs[1],rs[0],rs[2]].map((r,k)=>`<div class="rs-col p${k===1?1:k===0?2:3}" style="--c:${COLS[r]}"><i class="rs-av">${shapeW(r)}</i><span class="rs-nm">${who(r)}</span><div class="rs-blk"><b>${escH(sc[r])}</b></div></div>`).join('')}</div>`:'';
  const rows=(rs.length>=3?rs.slice(3):rs).map(r=>`<div class="rs-row ${rank(r)===1?'top':''}" style="--c:${COLS[r]}"><small>${rank(r)}</small><i class="rs-av">${shapeW(r)}</i><span>${who(r)}</span><b>${escH(sc[r])}</b></div>`).join('');
  return `<div class="sheet-bg" data-a="closeres"><div class="sheet result ${d.win==='d'?'draw':mine?'mine':'lost'}" style="--c:${c}">
    <div class="rs-top"><i class="rs-rays"></i><div class="trophy">${d.win==='d'?'<span class="rs-emo">🤝</span>':mine?TROPHY:MEDAL}</div></div>
    <div class="rs-ban"><h2>${winTitle(d,G,ctx)}</h2></div>${G.winExtra?`<p class="note">${G.winExtra(d,ctx)}</p>`:''}
    ${ml!=null?`<p class="hint rs-match">🏅 ${d.tm&&d.pl.includes(ml)&&TEAMS[d.tm[d.pl.indexOf(ml)]]?`فريق ${teamName(d.tm[d.pl.indexOf(ml)])} فاز`:ml===S.me?'أنت فزت':pname(ml)+' فاز'} بالمباراة! (${S.st.sc[ml]} نقاط)</p>`:matchTie()?'<p class="hint rs-match">🤝 تعادل على الصدارة، نكمل لين يتقدم واحد</p>':''}
    <div class="rs-st"><p class="lbl">نقاط الجلسة</p>${pod}${rows?`<div class="rs-list ${rs.length>4?'two':''}">${rows}</div>`:''}</div>
    <div class="rs-acts">${againBtn('btn red rs-main')}${ng?`<button class="btn soft rs-next" data-a="next" data-g="${ng}"><span class="gi">${GAMES[ng].icon}</span><span class="rs-nx"><small>العبوا بعدها</small><b>${GAMES[ng].name}</b></span></button>`:''}<div class="rs-sec"><button class="btn soft" data-a="${S.mode==='online'?'browse':'grid'}">قائمة الألعاب</button><button class="btn soft" data-a="closeres">شوف اللوحة</button></div></div></div></div>`;
}
/* ================= reactions, chat and avatars =================
   Reactions, stickers and avatars are our own emoji (emoji.js) and travel as an index into EMJ only; chat text is always escaped */
const RX=EMJ.map((_,i)=>i);
// a line is at most CHAT_MAX characters; a phone shows its last CHAT_N lines in its room message (net.js), the room trims more if it must
const CHAT_MAX=160,CHAT_N=8;
const CHAT_QP=['دورك!','يلا بسرعة','حظ أوفر','كفو!','ههههه','صبر صبر','لعبة حلوة','مرة ثانية؟','وش هالحظ!','أنا جاهز'];
const ICO_SEND='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12L4 4l3 8-3 8z" fill="currentColor"/></svg>';
const myAv=()=>{const v=lsGet(LSK.av);const i=v==null||v===''?-1:+v;return EMJ_AV.includes(i)?i:-1;};
// a player's emoji face (the avatar they picked), or '' when they have none
function avOf(r){const a=r===S.me&&r!=null?myAv():S.avs[r];return EMJ_AV.includes(a)?`<span class="eav">${EMJ[a].svg}</span>`:'';}
const chatFace=r=>avOf(r)||(isRole(r)?shapeW(r):PIC.me);
// the players whose messages this phone hides (their device keys)
function hideSet(){if(!S.hideSet){try{const a=JSON.parse(lsGet(LSK.hide)||'[]');S.hideSet=new Set(Array.isArray(a)?a.filter(isFpStr).slice(-32):[]);}catch(e){S.hideSet=new Set();}}return S.hideSet;}
const isFpStr=x=>typeof x==='string'&&/^[\w-]{12}$/.test(x);
const chatOn=()=>cfg().chat!==false;
function avPicker(){const a=myAv();return `<div class="avp" role="group" aria-label="صورتك">${[-1,...EMJ_AV].map(i=>`<button class="${a===i?'on':''}" data-a="setav" data-i="${i}" aria-label="${i<0?'بدون صورة':EMJ[i].n}" aria-pressed="${a===i}">${i<0?(S.me!=null?shapeW(S.me):PIC.me):EMJ[i].svg}</button>`).join('')}</div>`;}
function modalHTML(){
  const m=S.modal,c=cfg(),h=isHost();
  let inner='',title='';
  // the rules read as short steps: one paragraph for each sentence
  if(m==='help'){const G=GAMES[S.st.g],t=(typeof HELP!=='undefined'&&HELP[S.st.g])||'اتبع التعليمات اللي تطلع فوق اللوحة.';
    title=`${G?`<span class="sh-ic">${G.icon}</span>${G.name}`:'القواعد'}`;
    const d=S.st.d,tk=d&&d.tm?(G&&G.teams==='native'?'native':'all'):(G&&G.teams==='none'&&(cfg().teams||0)>0?'none':null);
    inner=`<div class="rules">${t.replace(/([.؟!])\s+/g,'$1\n').split('\n').map(x=>`<p>${x}</p>`).join('')}</div>${tk&&typeof HELP_TEAMS!=='undefined'?`<div class="rules tmrules"><p><b>👥 الفرق</b></p><p>${HELP_TEAMS[tk]}</p></div>`:''}`;}
  else if(m==='chat'){S.chatSeen=Date.now();
    const ppl=S.chatPpl?`<div class="cppl">${h?`<div class="segs">${['true','false'].map(v=>`<button class="seg ${String(chatOn())===v?'on':''}" data-a="cfg" data-k="chat" data-v="${v}">${v==='true'?'💬 المحادثة مفتوحة':'🔇 مقفلة للكل'}</button>`).join('')}</div>`:''}
      ${players().filter(r=>r!==S.me&&S.ids[r]).map(r=>{const hid=hideSet().has(S.ids[r]);return `<div class="cpr" style="--c:${COLS[r]}"><i class="cav">${chatFace(r)}</i><b>${pname(r)}</b><button class="sm ${hid?'go':''}" data-a="chathide" data-i="${r}">${hid?'أظهر رسائله':'اخفِ رسائله'}</button></div>`;}).join('')||'<p class="note">ما فيه أحد غيرك في الغرفة</p>'}
      </div>`:'';
    return `<div class="sheet-bg" data-a="closemodal"><div class="sheet chat"><div class="sh-head"><h2>المحادثة</h2><div class="sh-acts"><button class="x ${S.chatPpl?'on':''}" data-a="chatppl" aria-label="الأشخاص والإخفاء" aria-pressed="${!!S.chatPpl}">👥</button><button class="x" data-a="closemodal" aria-label="إغلاق">✕</button></div></div>${ppl}${chatHTML()}</div></div>`;}
  else if(m==='react'){title='رد سريع';inner=`<div class="rxs">${RX.map(i=>`<button class="rxe" data-a="rx" data-i="${i}" aria-label="${EMJ[i].n}">${EMJ[i].svg}</button>`).join('')}</div>`;}
  else if(m==='settings'){
    const opt=(key,val,label)=>`<button class="seg ${c[key]===val?'on':''}" data-a="cfg" data-k="${key}" data-v="${val}" ${h?'':'disabled'}>${label}</button>`;
    title=`إعدادات ${S.mode==='online'?'الغرفة':'اللعب'}`;inner=`
    ${S.mode==='online'?`<label class="lab">اسمك</label><input class="field" data-draft="myname" value="${escH(S.draft.myname??S.myName)}" maxlength="14" placeholder="${S.me!=null?NAMES[S.me]:''}"><label class="lab">صورتك</label>${avPicker()}`:''}
    ${S.mode==='online'&&!h?'<p class="note">القواعد يحددها صاحب الغرفة 👑</p>':''}
    ${S.mode==='online'?`<label class="lab">مين يختار اللعبة</label><div class="segs">${opt('pick','host','صاحب الغرفة')}${opt('pick','all','الكل')}</div>`:''}
    ${S.mode==='online'&&players().length>=4?`${teamSegs()}${teamK()?`<div class="tlist">${players().map(r=>`<span class="mem" style="--c:${COLS[r]}"><i>${shapeW(r)}</i>${r===S.me?'أنت':pname(r)} ${teamChip(r)}</span>`).join('')}</div>`:''}`:''}
    <label class="lab">وقت كل دور</label><div class="segs">${opt('timer',0,'بدون')}${opt('timer',15,'15 ث')}${opt('timer',30,'30 ث')}${opt('timer',60,'دقيقة')}</div>
    <label class="lab">المباراة تنتهي عند</label><div class="segs">${opt('target',0,'مفتوحة')}${opt('target',3,'3 انتصارات')}${opt('target',5,'5')}${opt('target',10,'10')}</div>
    ${S.mode==='online'?`<label class="lab">المحادثة</label><div class="segs">${opt('chat',true,'مفتوحة')}${opt('chat',false,'مقفلة للكل')}</div>
    <label class="lab">قفل الغرفة</label><div class="segs">${opt('lock',false,'مفتوحة')}${opt('lock',true,'مقفلة على اللي فيها')}</div>
    ${h&&players().length>1?`<label class="lab">طرد لاعب</label><div class="segs">${players().filter(r=>r!==S.me).map(r=>`<button class="seg kick" style="--c:${COLS[r]}" data-a="kick" data-i="${r}">${pname(r)} ✕</button>`).join('')}</div>`:''}
    ${h&&(c.kick||[]).length?`<button class="link" data-a="unkick">السماح للمطرودين يرجعون</button>`:''}`:''}
    <label class="lab">على هذا الجوال</label><div class="segs"><button class="seg ${liteOn()?'':'on'}" data-a="lite" data-v="0">حركات كاملة</button><button class="seg ${liteOn()?'on':''}" data-a="lite" data-v="1">خفيفة وأسرع</button></div>
    <div class="segs"><button class="seg ${S.mute?'':'on'}" data-a="mute" aria-pressed="${!S.mute}">🔊 الصوت</button><button class="seg ${S.mute?'on':''}" data-a="mute" aria-pressed="${S.mute}">🔇 بدون صوت</button></div>
    ${h?`<button class="link" data-a="resetsc" style="color:var(--red)">تصفير نقاط الجلسة</button>`:''}`;
  }
  return `<div class="sheet-bg" data-a="closemodal"><div class="sheet ${m==='help'?'help':m==='settings'?'set':m==='react'?'react':''}" role="dialog" aria-modal="true"><div class="sh-head"><h2>${title}</h2><button class="x" data-a="closemodal" aria-label="إغلاق">✕</button></div>${inner}${m==='settings'?'<button class="big navy" data-a="closemodal">تم</button>':''}</div></div>`;
}
function chatList(){const h=hideSet();return Object.values(S.chat).filter(m=>m.s!==1&&!(m.f&&h.has(m.f))).sort((a,b)=>a.t-b.t).slice(-60);}
function unread(){const h=hideSet();let n=0;for(const k in S.chat){const m=S.chat[k];if(m.t>S.chatSeen&&!m.me&&m.s!==1&&!(m.f&&h.has(m.f)))n++;}return n;}
function chatName(m){if(m.me)return 'أنت';const n=escH(((isRole(m.r)&&S.names[m.r])||m.n||'').slice(0,14));return m.r===-1?(n?n+' (متفرج)':'متفرج'):n||NAMES[m.r]||'لاعب';}
const hhmm=t=>{const d=new Date(t);return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');};
function fabs(){const u=unread();return `<div class="rx">${S.me!=null?`<button class="rxb" data-a="m-react" aria-label="رد سريع">${EMJ[0].svg}</button>`:''}<button class="rxb" data-a="m-chat" aria-label="المحادثة${u?`، ${u} رسائل جديدة`:''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 3.8c-.5.4-1.2 0-1.2-.6V16h0A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/></svg>${u?`<i class="badge">${u>9?'9+':u}</i>`:''}</button></div>`;}
// the messages, one group per sender (their colour and face), a sticker shows big without a bubble
function chatHTML(){const L=chatList(),gs=[];let g=null;
  for(const m of L){const k=m.me?'me':(m.f||'r'+m.r);if(!g||g.k!==k||m.t-g.t>180000){g={k,t:m.t,m,list:[]};gs.push(g);}g.t=m.t;g.list.push(m);}
  const items=gs.map(g=>{const mine=!!g.m.me,r=g.m.r,c=COLS[r]||'#8A99AA';
    return `<div class="chg ${mine?'me':''}" style="--c:${c}">${mine?'':`<i class="cav">${chatFace(r)}</i>`}<div class="chgb">${mine?'':`<b class="cnm">${chatName(g.m)}</b>`}${g.list.map(m=>m.k!=null?`<p class="msg stk" data-k="m${escH(m.i)}"><i class="emj">${emoSVG(m.k)}</i><time>${hhmm(m.t)}</time></p>`:`<p class="msg" data-k="m${escH(m.i)}"><span>${escH(m.x)}</span><time>${hhmm(m.t)}</time></p>`).join('')}</div></div>`;}).join('');
  const on=chatOn(),x=String(S.draft.chat||''),tray=!!S.chatTray;
  const comp=!on?'<p class="chat-off">🔇 المحادثة مقفلة</p>':
    `<div class="chatq ${tray?'tray':''}">${tray?RX.map(i=>`<button class="stkb" data-a="stk" data-i="${i}" aria-label="${EMJ[i].n}">${EMJ[i].svg}</button>`).join(''):CHAT_QP.map((t,i)=>`<button class="qp" data-a="chatq" data-i="${i}">${t}</button>`).join('')}</div>
    <div class="chatin"><button class="ctog ${tray?'on':''}" data-a="chattray" aria-label="${tray?'عبارات سريعة':'ستيكرات'}" aria-pressed="${tray}">${tray?'<b>أب</b>':EMJ[9].svg}</button><div class="cfield"><input class="field" data-draft="chat" value="${escH(x)}" maxlength="${CHAT_MAX}" placeholder="اكتب رسالة…" autocomplete="off" enterkeyhint="send" aria-label="رسالة"><small class="ccount ${x.length>CHAT_MAX-20?'near':''}" aria-hidden="true">${x.length}/${CHAT_MAX}</small></div><button class="send" data-a="send" aria-label="إرسال" ${x.trim()?'':'disabled'}>${ICO_SEND}</button></div>`;
  return `<div class="msgs" aria-live="polite">${items||'<div class="chat-empty"><i class="emj">'+EMJ[27].svg+'</i><br>ما فيه رسائل للحين، قل هلا!</div>'}</div><button class="jump ${S.chatJump?'on':''}" data-a="chatjump">رسائل جديدة ↓</button>${comp}`;}
// a phone sends at most 6 lines in 10 s (and one every 0.7 s): the room cuts a phone that floods it
function chatRateOk(){const now=Date.now();S.chatT=(S.chatT||[]).filter(t=>now-t<10000);if(S.chatT.length>=6||now-(S.chatT[S.chatT.length-1]||0)<700){toast('شوي شوي على الرسائل ✋');return false;}S.chatT.push(now);return true;}
function sendChat(b){if(S.mode!=='online'||!b)return false;if(!chatOn()){toast('صاحب الغرفة قفل المحادثة');return false;}
  if(b.k!=null){if(!emoOk(b.k))return false;b={k:b.k};}else{b={x:String(b.x||'').trim().slice(0,CHAT_MAX)};if(!b.x)return false;}
  if(!chatRateOk())return false;
  const m={i:rid()+rid(),t:Date.now(),...b};S.myChat=[...S.myChat,m].slice(-CHAT_N);S.chat[m.i]={...m,r:S.me,n:S.myName,me:1};S.chatSeen=Date.now();S.chatJump=false;publish();return true;}
// a new line while the chat is closed: a short note at the top (one at a time), tap it to open the chat
function chatPop(m){const now=Date.now();if(now-(S.popAt||0)>900)sfx('pop');S.popAt=now;document.querySelectorAll('.chatpop').forEach(e=>e.remove());
  const el=document.createElement('button');el.className='chatpop';el.style.setProperty('--c',COLS[m.r]||'#8A99AA');
  el.innerHTML=`<i class="cav">${chatFace(m.r)}</i><span><b>${chatName(m)}</b>${m.k!=null?`<i class="emj">${emoSVG(m.k)}</i>`:`<em>${escH(m.x)}</em>`}</span>`;
  el.addEventListener('click',()=>{S.modal='chat';S.chatSeen=Date.now();render();el.remove();});document.body.appendChild(el);setTimeout(()=>el.remove(),3500);}
// a reaction floats up from the player's badge (transform and opacity only); a phone that sends too many is shown less often
function floatRx(r,i){if(!emoOk(i))return;const now=Date.now();S.rxLast=S.rxLast||{};if(now-(S.rxLast[r]||0)<450||document.querySelectorAll('.floatrx').length>10)return;S.rxLast[r]=now;
  const ch=app.querySelector(`.pt[data-r="${r}"]`)||app.querySelector(`.av[data-r="${r}"]`)||app.querySelector(`.mem[style*="${COLS[r]}"]`);
  const el=document.createElement('div');el.className='floatrx';el.innerHTML=EMJ[i].svg;
  const b=ch?ch.getBoundingClientRect():{left:innerWidth/2,top:120,width:0};el.style.left=Math.max(4,Math.min(innerWidth-60,b.left+b.width/2-28))+'px';el.style.top=(b.top+scrollY-14)+'px';
  document.body.appendChild(el);sfx('pop');setTimeout(()=>el.remove(),1900);}
function rxRateOk(){const now=Date.now();S.rxT=(S.rxT||[]).filter(t=>now-t<10000);if(S.rxT.length>=8||now-(S.rxT[S.rxT.length-1]||0)<600)return false;S.rxT.push(now);return true;}
/* ================= this phone's stats ================= */
function statsGet(){try{const o=JSON.parse(lsGet(LSK.stats)||'null');if(o&&typeof o==='object'&&o.g&&typeof o.g==='object')return {g:o.g,ids:Array.isArray(o.ids)?o.ids:[]};}catch(e){}return {g:{},ids:[]};}
function noteStats(g,d,won){const o=statsGet();if(!d||o.ids.includes(d.gid))return;o.ids=[...o.ids,d.gid].slice(-30);const e=Array.isArray(o.g[g])?o.g[g]:[0,0];e[0]=(+e[0]||0)+1;if(won)e[1]=(+e[1]||0)+1;o.g[g]=e;lsSet(LSK.stats,JSON.stringify(o));}
function statsAll(){const o=statsGet();let n=0,w=0,k=0;for(const g in o.g){const e=o.g[g];if(!Array.isArray(e))continue;n+=+e[0]||0;w+=+e[1]||0;k++;}return {n,w,k};}
function renderStats(){const o=statsGet(),fav=new Set(favGames()),t=statsAll();
  const ks=Object.keys(o.g).filter(g=>GAMES[g]&&Array.isArray(o.g[g])).sort((a,b)=>o.g[b][0]-o.g[a][0]);
  OUT=`${topBar('إحصائياتي','home')}<div class="stt"><span><b>${t.n}</b><small>لعبة خلصت</small></span><span><b>${t.w}</b><small>فوز</small></span><span><b>${t.n?Math.round(t.w/t.n*100):0}٪</b><small>نسبة الفوز</small></span></div>

  ${ks.length?`<div class="stl">${ks.map(g=>{const p=+o.g[g][0]||0,w=+o.g[g][1]||0;return `<button class="str" data-a="quick" data-v="${g}"><span class="gi">${GAMES[g].icon}</span><span class="lv-tx"><b>${fav.has(g)?'⭐ ':''}${GAMES[g].name}</b><small>${p} مرة • ${w} فوز</small></span><i class="stb" aria-hidden="true"><i style="width:${p?Math.round(w/p*100):0}%"></i></i></button>`;}).join('')}</div><button class="link" data-a="statsreset">تصفير الإحصائيات</button>`:'<p class="gempty">ما خلصت ولا لعبة للحين</p>'}`;}
/* ================= back: the phone's back button and the browser's ================= */
// close a sheet, else go back one screen; leaving a room or the app takes two presses
let backAt=0;
function backAction(exit){
  if(S.modal){S.modal=null;S.chatPpl=false;render();return;}
  if(S.showResult&&app.querySelector('.sheet.result')){S.showResult=false;render();return;}
  const b=app.querySelector('.top .ib');const a=b&&b.dataset.a;
  if(S.mode===null||a==='leave'){if(!exit&&a!=='leave')return;if(Date.now()-backAt<2000){if(a==='leave')leaveRoom();else exit();return;}backAt=Date.now();toast(a==='leave'?'اضغط رجوع مرة ثانية للخروج من الغرفة':'اضغط رجوع مرة ثانية للخروج');return;}
  if(b)b.click();else{S.mode=null;render();}}
// in a browser one history step stands for "inside the app": back pops it (popstate), and it is pushed again while still inside
function navInit(){try{window.addEventListener('popstate',()=>{if(isApp()||S.mode===null&&!S.modal)return;backAction(null);navSync();});}catch(e){}}
function navSync(){if(isApp())return;try{const deep=S.mode!==null||!!S.modal,on=!!(history.state&&history.state.alb);if(deep&&!on)history.pushState({alb:1},'');else if(!deep&&on)history.replaceState(null,'');}catch(e){}}
// the result sheet suggests what to play next: a favourite or recent game for this many players, else a random one
function suggestNext(){const d=S.st.d,g=S.st.g;if(S.nextG&&S.nextG.gid===(d&&d.gid))return S.nextG.g;const n=d?d.pl.length:hereN();
  const ok=k=>k!==g&&GAMES[k]&&fitN(k,n);let pool=[...favGames(),...recentGames()].filter(ok);if(!pool.length)pool=Object.keys(GAMES).filter(ok);
  const x=pool.length?(pool.length>3?pool[0]:pool[rnd(pool.length)]):null;S.nextG={gid:d&&d.gid,g:x};return x;}

// what can be done before the game files have loaded; any other tap waits for them (whenGames shows a loading note)
const PRE_LOAD_OK=new Set(['nearoff','home','mute','lite','closemodal','lobby','near','nset','m-settings','statsreset']);
app.addEventListener('click',e=>{
  const t=e.target.closest('[data-a],[data-ga]');if(!t||t.disabled)return;
  if(t.classList.contains('sheet-bg')&&e.target!==t)return;
  const i=t.dataset.i!=null?+t.dataset.i:null;
  if(t.dataset.ga){if(netDown())return;if(S.needUpd){toast('حدّث التطبيق عشان تلعب في هالغرفة');return;}const G=GAMES[S.st.g],a=t.dataset.ga;if(!G||!S.st.d)return;
    // a secret game online: the host plays on the whole state, the others ask the host (net.js)
    // online a guest's move goes to the host first: the button answers at once so the tap never feels lost
    if(S.mode==='online'&&!amHost()){t.classList.add('tap-ok');setTimeout(()=>t.classList.remove('tap-ok'),220);}
    if(S.mode==='online'&&isSecretG(G)){if(amHost())G.click(a,i,S.st.d,mkCtx(S.st.d,S.priv));else netClick(G,a,i);return;}
    G.click(a,i,S.st.d,mkCtx());return;}
  if(!GREADY&&!PRE_LOAD_OK.has(t.dataset.a)){const snap={dataset:{...t.dataset}};whenGames(()=>shellAct(snap));return;}
  shellAct(t);});
function shellAct(t){const i=t.dataset.i!=null?+t.dataset.i:null;
  switch(t.dataset.a){
    case 'home':if(S.mode==='near'&&window.NEARROOM)NEARROOM.stopAll();S.mode=null;render();break;
    case 'near':startNear();break;
    case 'nearoff':toast('متوفر في تطبيق ألعابنا');break;
    case 'nset':NEARROOM.settings(t.dataset.w);break;
    case 'ncreate':{const c=genCode();enterRoom(c,true,null,NEARROOM.room('host',{code:c,name:S.myName}));break;}
    case 'njoin':{const f=(S.nearList||[])[i];if(f)enterRoom(f.code,false,null,NEARROOM.room('join',{id:f.id,code:f.code,name:S.myName}));break;}
    case 'local':S.mode='local';S.me=null;S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0,...localTeams()}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;render();break;
    case 'inc':S.localN=Math.min(MAXP,S.localN+1);save();render();break;
    case 'botT':{const r=i;if(S.bots[r])delete S.bots[r];else{S.bots[r]=2;S.localNames[r]='';}if(!humanSeats({pl:[...Array(S.localN).keys()]}).length){delete S.bots[r];toast('لازم لاعب واحد على الأقل يكون إنسان');}save();render();break;}
    case 'botL':S.bots[i]=+t.dataset.v;save();render();break;
    case 'teams':{if(!isHost())return;setCfg({teams:i,tm:{}});save();break;}
    case 'tmc':{if(!isHost())return;const k=teamK();if(!k)return;const tm={...(cfg().tm||{})};tm[i]=(roleTeam(i,k)+1)%k;setCfg({tm});save();break;}
    case 'vsbot':S.mode='local';S.me=null;S.localN=2;S.bots={1:S.bots[1]||2};S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;save();render();break;
    case 'dec':S.localN=Math.max(2,S.localN-1);keepHuman();save();render();break;
    case 'lobby':S.mode='lobby';S.roomErr=null;render();getRoom();break;
    case 'create':enterRoom(genCode(),true,null);break;
    case 'join':{
      const c=((document.getElementById('code')||{}).value||'').trim().toUpperCase();
      if(!/^[A-Z0-9]{4,6}$/.test(c)){S.roomErr='اكتب رمز الغرفة كامل';render();return;}
      if(/[^A-HJKMNP-Z2-9]/.test(c)){S.roomErr='الرموز ما فيها O ولا 0 ولا I ولا 1 ولا L، تأكد من الرمز';render();return;}
      const sv=loadSaved();const same=sv&&sv.code===c;
      enterRoom(c,false,same?sv:null);break;}
    case 'resume':{const sv=loadSaved();if(sv)enterRoom(sv.code,false,sv);break;}
    case 'leave':leaveRoom();break;
    case 'grid':if(S.mode==='local'&&S.st.d&&S.st.d.win==null&&!S.browse){S.browse=true;S.showResult=false;render();break;}setGame(null);break;
    case 'lresume':localResume();break;
    case 'browse':S.browse=true;S.showResult=false;render();break;
    case 'resumegame':S.browse=false;render();break;
    case 'gcat':S.gcat=t.dataset.v||'';if(S.draft.q)S.draft.q='';render();{const m=app.querySelector('.gsent');if(m&&scrollY>m.offsetTop)window.scrollTo(0,m.offsetTop);}break;
    case 'qclear':S.draft.q='';render();{const el=app.querySelector('[data-draft="q"]');if(el)el.focus({preventScroll:true});}break;
    case 'fav':{const g=t.dataset.g;if(!GAMES[g])break;toggleFav(g);render();break;}
    case 'rand':{const n=hereN(),q=normQ(S.draft.q||''),cat=!q&&CATN[S.gcat]?S.gcat:'';let ks=Object.keys(GAMES).filter(k=>fitN(k,n)&&gMatch(k,q)&&(!cat||catOf(k)===cat));
      if(!ks.length)ks=Object.keys(GAMES).filter(k=>fitN(k,n));if(!ks.length)break;const g=ks[rnd(ks.length)];toast('🎲 '+GAMES[g].name);shellAct({dataset:{a:'pick',g}});break;}
    case 'quick':{const g=t.dataset.v;if(!GAMES[g])break;S.mode='local';S.me=null;S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0,...localTeams()}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;
      if(keepHuman()){render();break;}setGame(g);if(!S.st.g)render();break;}
    case 'next':
    case 'rpick':
    case 'pick':{const g=t.dataset.g||t.dataset.v;if(!GAMES[g])break;
      if(S.mode==='online'&&!canPick()){if(S.st.g===g&&S.st.d){S.browse=false;render();}else toast('صاحب الغرفة 👑 هو اللي يختار اللعبة');return;}
      if(S.st.g===g&&S.st.d&&S.st.d.win==null){S.browse=false;render();return;}
      if(S.mode==='local'&&keepHuman()){render();return;}
      setGame(g);break;}
    case 'again':if(matchOver()&&!isHost())return;newRound();break;
    case 'reveal':S.seen=i;S.tgt=null;render();break;
    case 'closeres':S.showResult=false;render();break;
    case 'skip':if(S.mode==='online'&&!amHost()){if(!netDown())queueIntent({t:'skip'});break;}skipAbsent();break;
    case 'copy':try{navigator.clipboard.writeText(S.code).then(()=>toast('انسخ الرمز: '+S.code)).catch(()=>toast('الرمز: '+S.code));}catch(err){toast('الرمز: '+S.code);}break;
    case 'mute':S.mute=!S.mute;lsSet(LSK.mute,S.mute?'1':'0');if(!S.mute)sfx('pop');render();break;
    case 'm-settings':S.modal='settings';render();break;
    case 'lite':lsSet(LSK.lite,t.dataset.v==='1'?'1':'0');applyLite();render();break;
    case 'm-help':S.modal='help';render();break;
    case 'm-react':S.modal='react';render();break;
    case 'm-chat':S.modal='chat';S.chatSeen=Date.now();S.chatJump=false;render();setTimeout(()=>{const b=document.querySelector('.msgs');if(b)b.scrollTop=b.scrollHeight;},0);break;
    case 'send':{if(sendChat({x:S.draft.chat})){S.draft.chat='';const el=app.querySelector('[data-draft="chat"]');if(el)el.value='';}render();const el=app.querySelector('[data-draft="chat"]');if(el)el.focus({preventScroll:true});break;}
    case 'chatq':if(CHAT_QP[i])sendChat({x:CHAT_QP[i]});render();break;
    case 'stk':sendChat({k:i});render();break;
    case 'chattray':S.chatTray=!S.chatTray;render();break;
    case 'chatppl':S.chatPpl=!S.chatPpl;render();break;
    case 'chatjump':{S.chatJump=false;render();const b=app.querySelector('.msgs');if(b)b.scrollTop=b.scrollHeight;break;}
    case 'chathide':{const fp=S.ids&&S.ids[i];if(!isFpStr(fp))break;const h=hideSet();if(h.has(fp)){h.delete(fp);toast('رجعت رسائل '+pnameText(i));}else{h.add(fp);toast('ما راح تشوف رسائل '+pnameText(i));}lsSet(LSK.hide,JSON.stringify([...h].slice(-32)));render();break;}
    case 'setav':{const v=EMJ_AV.includes(i)?i:-1;lsSet(LSK.av,v<0?'':String(v));render();publish();break;}
    case 'closemodal':S.modal=null;S.chatPpl=false;render();break;
    case 'rx':{S.modal=null;if(!emoOk(i))break;if(!rxRateOk()){toast('شوي شوي على الردود ✋');render();break;}const rx={e:i,t:Date.now()};S.rxSeen[S.me]=rx.t;render();floatRx(S.me,i);publish(rx);break;}
    case 'cfg':{if(!isHost())return;let v=t.dataset.v;v=v==='true'?true:v==='false'?false:/^\d+$/.test(v)?+v:v;const p={[t.dataset.k]:v};if(t.dataset.k==='lock'&&v)p.members=players().map(r=>S.ids[r]).filter(Boolean);setCfg(p);if(t.dataset.k==='chat')toast(v?'المحادثة انفتحت 💬':'المحادثة انقفلت للكل 🔇');break;}
    case 'kick':{if(!isHost())return;const r=i,fp=S.ids[r];if(!fp||fp===SEAL.fp)return;S.ids[r]=null;recomputeRoles();setCfg({kick:[...new Set([...(cfg().kick||[]),fp])]});const d=S.st.d;if(d&&d.win==null&&d.pl.includes(r)){const s=d.pl.indexOf(r);const out=setAt(d.out,s,'1');const al=aliveSeats(d,out);const G=GAMES[S.st.g];
      const nd={...d,out,turn:d.turn===s?nextSeat(d,s,out):d.turn,win:al.length===1?al[0]:null};act(G.onSkip?G.onSkip(nd,d):nd);}toast(pnameText(r)+' طلع من الغرفة');break;}
    case 'unkick':if(!isHost())return;setCfg({kick:[]});break;
    case 'recode':{const c=S.code;leaveRoom();S.mode='lobby';render();const el=document.getElementById('code');if(el){el.value=c;el.focus();}break;}
    case 'resetsc':if(!isHost())return;S.st={...S.st,sc:Array(MAXP).fill(0),s:S.st.s+1};afterChange();toast('تصفّرت النقاط');break;
    case 'stats':S.mode='stats';render();break;
    case 'statsreset':lsSet(LSK.stats,JSON.stringify({g:{},ids:[]}));toast('تصفّرت الإحصائيات');render();break;
  }
}
app.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.draft;if(!k)return;S.draft=S.draft||{};S.draft[k]=e.target.value;
  if(e.target.type==='range'){const bn=e.target.closest('.board')&&e.target.closest('.board').querySelector('.big-num');if(bn)bn.textContent=e.target.value;}
  if(k==='myname'){S.myName=e.target.value.trim().slice(0,14);lsSet(LSK.name,S.myName);clearTimeout(S.nmT);S.nmT=setTimeout(()=>publish(),400);}
  else if(/^ln\d$/.test(k)){S.localNames[+k[2]]=e.target.value;save();}
  else if(k==='q')render();
  // the composer answers at once (send button, characters left) without drawing the screen again
  else if(k==='chat'){const v=e.target.value,b=app.querySelector('.chatin .send'),c=app.querySelector('.ccount');if(b)b.disabled=!v.trim();if(c){c.textContent=v.length+'/'+CHAT_MAX;c.classList.toggle('near',v.length>CHAT_MAX-20);}}
  else{const G=S.st.g&&GAMES[S.st.g];if(G&&G.onDraft)G.onDraft(k,e.target.value);}});
app.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('.send'))e.preventDefault();});
// support only: a long press on the nearby screen's title shows the connection details
app.addEventListener('pointerdown',e=>{if(S.mode!=='near'||!e.target.closest||!e.target.closest('.top h1'))return;clearTimeout(S.lpT);S.lpT=setTimeout(()=>{S.nearLog=!S.nearLog;try{NEARROOM.debug=S.nearLog;}catch(x){}render();},1200);});
['pointerup','pointercancel','pointerleave'].forEach(k=>app.addEventListener(k,()=>clearTimeout(S.lpT)));
app.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target.id==='code'){const b=app.querySelector('[data-a="join"]');if(b)b.click();}else if(e.target.dataset&&e.target.dataset.draft==='chat'){e.preventDefault();shellAct({dataset:{a:'send'}});}
  else if(e.target.dataset&&e.target.dataset.draft==='q'){e.preventDefault();e.target.blur();}
  else if(e.target.dataset&&e.target.dataset.enter){e.preventDefault();const b=app.querySelector(`[data-ga="${e.target.dataset.enter}"]`);if(b&&!b.disabled)b.click();}});
// the on-screen keyboard must not hide the field being typed in (room code, names): bring it into view once the keyboard is up
app.addEventListener('focusin',e=>{const el=e.target;if(!el||!/^(INPUT|TEXTAREA)$/.test(el.tagName)||el.closest('.sheet.chat'))return;setTimeout(()=>{try{if(document.activeElement===el)el.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(x){}},320);});
// scrolled back down to the newest line: the "new messages" button goes
app.addEventListener('scroll',e=>{const m=e.target;if(!S.chatJump||!m.classList||!m.classList.contains('msgs'))return;if(m.scrollHeight-m.scrollTop-m.clientHeight<40){S.chatJump=false;const j=app.querySelector('.jump');if(j)j.classList.remove('on');}},true);
/* target picker used by sea battle and guess the person */
function targets(d,me){return aliveSeats(d).filter(s=>s!==me&&!sameTeam(d,s,me));}
function curTarget(d,me){const ts=targets(d,me);if(S.tgt==null||!ts.includes(S.tgt))S.tgt=ts[0]??null;return S.tgt;}
function tabsHTML(d,me,label){const ts=targets(d,me);if(ts.length<2)return '';const c=curTarget(d,me);
  return `<p class="lbl" style="text-align:center">${label}</p><div class="tabs">${ts.map(s=>`<button class="tab ${s===c?'sel':''}" style="background:${col(d,s)}" data-ga="tgt" data-i="${s}">${nm(d,s)}</button>`).join('')}</div>`;}

/* ================= icons ================= */
const LOGO=`<svg class="logo" viewBox="0 0 128 84" width="168" aria-hidden="true"><defs><linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5837B"/><stop offset="1" stop-color="#DE5048"/></linearGradient><linearGradient id="lgb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6CC4F2"/><stop offset="1" stop-color="#349DD6"/></linearGradient></defs>
<ellipse class="lg-s lg-sa" cx="34" cy="73" rx="21" ry="3.2"/><ellipse class="lg-s lg-sb" cx="94" cy="73" rx="21" ry="3.2"/>
<g class="lg-d lg-a"><rect x="8" y="16" width="52" height="52" rx="15" fill="#C4433C"/><rect x="8" y="12" width="52" height="52" rx="15" fill="url(#lgr)"/><rect x="14" y="16" width="40" height="12" rx="6" fill="#fff" opacity=".18"/><circle cx="24" cy="28" r="5.2" fill="#fff"/><circle cx="44" cy="48" r="5.2" fill="#fff"/></g>
<g class="lg-d lg-b"><rect x="68" y="16" width="52" height="52" rx="15" fill="#2A86BC"/><rect x="68" y="12" width="52" height="52" rx="15" fill="url(#lgb)"/><rect x="74" y="16" width="40" height="12" rx="6" fill="#fff" opacity=".2"/><circle cx="84" cy="28" r="5.2" fill="#fff"/><circle cx="104" cy="28" r="5.2" fill="#fff"/><circle cx="84" cy="48" r="5.2" fill="#fff"/><circle cx="104" cy="48" r="5.2" fill="#fff"/></g></svg>`;
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
  let A=Capacitor.Plugins&&Capacitor.Plugins.App;try{if(!A&&Capacitor.registerPlugin)A=Capacitor.registerPlugin('App');}catch(e){}
  // back from the phone settings: look again for nearby rooms
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.mode==='near'&&(S.nearDiag||[]).length&&!S.joining)startNear();});
  if(A)A.addListener('backButton',()=>backAction(()=>A.exitApp()));
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
/* ================= loading the games after the first screen ==========   index.html keeps the game styles and scripts inert in <template id="later-css"> and <template id="later-js">. Right after the
   home screen is drawn they are added to the page: the styles before perf.css (the order they always had), the scripts in their
   order (async=false). Anything that needs a game (the game list, a room, a saved game) waits for them, with a loading note */
function loadGames(){if(S.gstart)return;S.gstart=true;
  const ts=['later-css','later-js'].map(id=>document.getElementById(id)).filter(Boolean);if(!ts.length){GREADY=true;return;}
  let left=1;const perf=document.querySelector('link[href*="css/perf.css"]');
  const done=()=>{if(--left>0)return;GREADY=true;S.gload=false;saveMeta();const q=GWAIT.splice(0);S.lastHtml=null;render();for(const f of q)try{f();}catch(e){console.error(e);}};
  for(const t of ts){for(const el of [...t.content.children]){let n=null;
      if(el.tagName==='LINK'&&el.getAttribute('href')){n=document.createElement('link');n.rel='stylesheet';n.href=el.getAttribute('href');}
      else if(el.tagName==='SCRIPT'&&el.getAttribute('src')){n=document.createElement('script');n.src=el.getAttribute('src');n.async=false;}
      if(!n)continue;left++;n.onload=n.onerror=done;
      if(n.tagName==='LINK'){if(perf)perf.before(n);else document.head.appendChild(n);}else document.body.appendChild(n);}
    t.remove();}
  done();}
function whenGames(f){if(GREADY){f();return;}GWAIT.push(f);if(!S.gload){S.gload=true;render();}}
// what the home screen shows before the games load next time: the count, and the names and icons of the games it lists
function saveMeta(){try{const ids=[...recentGames(),...favGames(),...NEWG];const l=loadLocal();if(l)ids.push(l.st.g);const g={};
  for(const k of new Set(ids))if(GAMES[k]){const ic=String(GAMES[k].icon||'');g[k]={n:GAMES[k].name,i:ic.length<8000?ic:''};}
  const m={n:Object.keys(GAMES).length,g};lsSet(LSK.meta,JSON.stringify(m));Object.assign(GMETA,m);}catch(e){}}
// where this tab is (home, lobby, the game list, a game, a room), kept for this tab only, so reloading the page comes back to it
const HEREK='alaabna.here';
function noteHere(){if(S.hereWait)return;try{const h=JSON.stringify({m:S.mode,b:!!S.browse,g:!!(S.st.g&&S.st.d),c:S.mode==='online'?S.code:null});if(h!==S.hereLast){S.hereLast=h;sessionStorage.setItem(HEREK,h);}}catch(e){}}
function restoreHere(){let h=null;try{h=JSON.parse(sessionStorage.getItem(HEREK)||'null');}catch(e){}if(!h||typeof h!=='object')return false;
  if(h.m==='local'){const l=h.g&&loadLocal();if(l){localResume();if(h.b){S.browse=true;render();}return true;}if(h.g)return false;
    S.mode='local';S.me=null;S.st={g:null,s:0,d:null,sc:Array(MAXP).fill(0),cfg:{...CFG0,...localTeams()}};S.priv=Array(MAXP).fill(null);S.seen=null;S.browse=false;render();return true;}
  if(h.m==='online'){const sv=loadSaved();if(sv&&sv.code&&sv.code===h.c&&sv.via!=='near'){S.mode='lobby';render();enterRoom(sv.code,false,sv);return true;}S.mode='lobby';render();getRoom();return true;}
  if(h.m==='lobby'){S.mode='lobby';render();getRoom();return true;}
  if(h.m==='stats'){S.mode='stats';render();return true;}
  return false;}
// a screen to come back to after a reload (it needs the games, so it waits for them)
function hereSaved(){try{const h=JSON.parse(sessionStorage.getItem(HEREK)||'null');return !!h&&['local','online','lobby','stats'].includes(h.m);}catch(e){return false;}}
function boot(){if(/[?&]info\b/.test(location.search)){infoScreen();return;}
  if(document.getElementById('later-js'))GREADY=false;
  // a screen to come back to after a reload waits for the games; meanwhile this tab keeps it noted
  const back=hereSaved();if(back)S.hereWait=true;
  navInit();render();
  // the games load once the home screen is painted (a frame, then a task; a second later at most, for a page opened in the
  // background). Under automation (navigator.webdriver) they load at once, so the page's load event still means every game is there
  if(navigator.webdriver)loadGames();else{requestAnimationFrame(()=>setTimeout(loadGames,0));setTimeout(loadGames,1500);}
  if(back)whenGames(()=>{S.hereWait=false;if(!restoreHere())render();});if(isApp())appSetup();}

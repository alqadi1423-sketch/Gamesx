'use strict';
/* ================= online room: one acting host, everyone else sends intents =================
   Only the acting host publishes the game (h = its epoch, g, s, d, sc, cfg, ids, pp, vw, bk, ack). Every other device
   publishes its name, chat, and a queue q of moves sealed to the host; the host plays them in order and acks each sender.
   Seats belong to device keys (ids[role] = fp), so a seat, its score and a kick follow the person, not the colour. */
const NETV=1,HOLD=180000,TAKE_FAST=4000,TAKE_SLOW=15000,JOIN_WAIT=4000,RESUME_WAIT=1500,PEND_MS=6000,PUB_MS=40,QMAX=6;
// every phone publishes at least every HB_MS (hb = its clock); a peer whose presence has not changed for HB_DEAD is taken as asleep
const HB_MS=4000,HB_DEAD=12000,TAKE_NEXT=6000;
const HOSTK=['h','g','s','d','sc','cfg','ids','pp','vw','bk','ack'];
const FPRE=/^[\w-]{12}$/;
const isFp=x=>typeof x==='string'&&FPRE.test(x);
function validIds(a){if(!Array.isArray(a)||a.length!==MAXP||!a.every(x=>x===null||isFp(x)))return null;const f=a.filter(Boolean);return new Set(f).size===f.length?a.slice():null;}
function netReset(){clearTimeout(S.takeT);clearTimeout(S.pubT);
  Object.assign(S,{ids:Array(MAXP).fill(null),epoch:0,hostFp:null,hostK:null,hst:null,pp:{},outQ:[],pend:false,lastN:{},rejN:{},ack:{},lastAck:{},bk:null,bkC:null,
    needUpd:false,hostGoneAt:null,vgen:0,peersByFp:{},qByFp:{},lostAt:Date.now(),hostSince:0,badC:new Set(),oldSeen:false,ackN:0,sentN:0,hostKeyC:null,vwC:{},bkCache:null,seatGone:{},
    restore:null,takeT:null,pubT:null,pubBusy:false,pubAgain:false,pubRx:null,procBusy:false,procAgain:false,sendTimes:[],bigWarn:false,
    hbSeen:{},vh:{},vtry:{},fpPeer:{},vwSig:null,lastPubAt:0,tickAt:Date.now(),rxAt:Date.now(),myPv:null,resend:null,selfPubLast:undefined});}
netReset();
const amHost=()=>S.mode==='online'&&!!S.hostFp&&S.hostFp===SEAL.fp;
const roleOfFp=fp=>fp?S.ids.indexOf(fp):-1;
const present=fp=>!!fp&&(fp===SEAL.fp||!!S.peersByFp[fp]);
const kickedFp=fp=>(cfg().kick||[]).includes(fp);
// a peer (relay connection) is awake while its presence keeps changing (heartbeat hb)
const fresh=peer=>{const x=S.hbSeen[String(peer)];return !!x&&Date.now()-x.at<HB_DEAD;};
const freshFp=fp=>fp===SEAL.fp||!!(S.peersByFp[fp]&&fresh(S.peersByFp[fp].peer));
/* host messages count only once verified: the view sealed to this phone opens with the sender's key and exactly the public
   fields next to it (hostAad), and its hb is newer than the last verified one from that key. S.vh[fp] = the newest such message.
   A copied key cannot make one, and an old one played again is not newer. A key is awake as a host while new verified ones come */
const vhLive=fp=>{const x=fp&&S.vh[fp];return !!x&&Date.now()-x.at<HB_DEAD&&lastPeers.some(p=>!p.sameTab&&String(p.peer)===x.peer);};
const hostLive=()=>!!S.hostFp&&vhLive(S.hostFp);
/* what the host's sealed views vouch for: every public field of its presence, in a canonical form (keys sorted), used as
   the AES-GCM additional data of each view. A copied key cannot publish other host fields: no view would open with them */
function canon(v){if(v===null||v===undefined)return 'null';if(Array.isArray(v))return '['+v.map(canon).join(',')+']';
  if(typeof v==='object')return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';return JSON.stringify(v);}
function hostAad(pr){let a;try{a=JSON.parse(JSON.stringify([pr.h,pr.g,pr.s,pr.d,pr.sc,pr.cfg,pr.ids,pr.pp,pr.ack,pr.hb]));}catch(e){return null;}return 'v'+S.code+canon(a);}
// the state this phone shows: the host shows its own seat's view of the whole state, the others already hold only theirs
function dView(){const d=S.st.d;if(!amHost()||!d)return d;const G=GAMES[S.st.g],seat=mySeat(d);
  const c=S.dvC;if(c&&c.d===d&&c.seat===seat&&c.g===S.st.g)return c.v;let v=d;try{v=viewOf(G,d,seat);}catch(e){console.error(e);}S.dvC={d,seat,g:S.st.g,v};return v;}
function privView(){if(!amHost()||!S.st.d)return S.priv;const G=GAMES[S.st.g],d=S.st.d,seat=mySeat(d);
  return S.priv.map((p,r)=>{try{return privFor(G,d,seat,r,p);}catch(e){return null;}});}
const lastPendingNdN=()=>{const x=S.outQ.filter(q=>q.m.t==='nd');return x.length?x[x.length-1].m.n:0;};
const nextN=()=>(S.sentN=Math.max(Date.now(),S.sentN+1));

/* ---------- a player's side ---------- */
// a move in a public game: shown at once, sent to the host as the change from the state it was made on
function propose(nd){
  const G=GAMES[S.st.g];if(isSecretG(G)){console.warn('act() in a secret game on a non-host phone');return;}
  if(!queueIntent({t:'nd',base:S.st.s,dep:lastPendingNdN(),dp:dPatch(S.st.d,nd)}))return;
  S.st={...S.st,s:S.st.s+1,d:nd};S.wild=null;S.dside=null;sfx('tap');render();}
function queueIntent(m){
  if(S.mode!=='online')return false;
  if(S.outQ.length>=QMAX){toast('استنى شوي، حركاتك ما وصلت للحين');return false;}
  m.n=nextN();S.outQ.push({m,c:null,k:null,at:Date.now()});if(m.t==='ck')S.pend=true;if(m.t==='pv')S.myPv=m.p;
  reseal();return true;}
// every waiting move sealed to the current host (again after a host change)
async function reseal(){const k=S.hostK;
  if(k&&!amHost())for(const it of S.outQ.slice()){if(it.k===k&&it.c)continue;let c=null;try{c=await SEAL.seal(k,it.m,'q'+S.code);}catch(e){}if(S.hostK!==k)return;if(c){it.c=c;it.k=k;}}
  publish();}
// a tap in a secret game: tried here first on this phone's view; what needs the hidden state is played by the host
function netClick(G,a,i){
  if(S.pend)return;const d=S.st.d,ctx=mkCtx(),net=G.net||{};
  if((net.local||[]).includes(a)){G.click(a,i,d,ctx);return;}
  const ui0=uiSnap(G),buf=[],tt=window.toast,cap0=NET_CAP;window.toast=t=>buf.push(t);NET_CAP={v:undefined,pv:null};let threw=false;
  try{G.click(a,i,d,ctx);}catch(e){threw=true;}finally{window.toast=tt;}
  const cap=NET_CAP;NET_CAP=cap0;const same=jsEq(ui0,uiSnap(G));
  const send=cap.v!==undefined||(net.host||[]).includes(a)||(ctx.my&&(threw||(!cap.pv&&same)));
  if(send){uiLoad(G,ui0);if(queueIntent({t:'ck',base:S.st.s,gid:d.gid,a:String(a).slice(0,20),i:Number.isFinite(i)?i:null,ui:ui0}))render();return;}
  buf.slice(0,3).forEach(t=>toast(t));
  if(cap.pv&&cap.pv.role===S.me){S.priv[S.me]=cap.pv.p;queueIntent({t:'pv',p:cap.pv.p});}
  render();}
// waiting moves the host never took: dropped after PEND_MS
function expireIntents(){if(S.mode!=='online'||amHost()||!S.outQ.length)return;const now=Date.now(),old=S.outQ.filter(x=>now-x.at>PEND_MS);if(!old.length)return;
  S.outQ=S.outQ.filter(x=>now-x.at<=PEND_MS);if(old.some(x=>x.m.t==='nd')){S.outQ=S.outQ.filter(x=>x.m.t!=='nd');if(S.hst)S.st={...S.hst};}
  S.pend=S.outQ.some(x=>x.m.t==='ck');toast('ما وصلت حركتك، جرّب مرة ثانية');publish();render();}

/* ---------- reading the room ---------- */
function onPeers(ch){
  if(S.mode!=='online')return;tickGap();if(S.mode!=='online')return;
  const peers=ch&&Array.isArray(ch.peers)?ch.peers:[];lastPeers=peers;const C={},Q={},now=Date.now(),live=new Set();let old=false;
  for(const p of peers){if(p.sameTab){S.myPeer=p.peer;continue;}if(p.kind!=='viewer')continue;const pr=p.presence;if(!pr||typeof pr!=='object')continue;
    if(pr.v!==NETV){if(pr.v==null&&('s' in pr||'r' in pr||'g' in pr))old=true;else if(Number.isInteger(pr.v)&&pr.v>NETV&&pr.h!=null&&!S.needUpd){S.needUpd=true;}continue;}
    const fp=SEAL.fpOf(pr.k);if(!fp||pr.id!==fp||fp===SEAL.fp)continue;
    // a key that is not a real P-256 point can never be sealed to: that peer is not in the room (checked once per key)
    if(SEAL.keyOk(pr.k,recheckPeers)!==true)continue;
    const pk=String(p.peer);live.add(pk);const sn=S.hbSeen[pk];if(!sn||sn.hb!==pr.hb||sn.fp!==fp){S.hbSeen[pk]={hb:pr.hb,fp,at:now};S.rxAt=now;}
    // a copied key may show up twice: the moves of both are tried, only the real device's ones open
    (Q[fp]=Q[fp]||[]).push(pr);(C[fp]=C[fp]||[]).push({peer:p.peer,pr});}
  for(const pk in S.hbSeen)if(!live.has(pk)){delete S.hbSeen[pk];delete S.vtry[pk];}
  // one connection per key: the one whose verified host message is the newest, then the one followed so far, then the lower peer id
  const P={};
  for(const fp in C){const cs=C[fp];
    for(const c of cs){if(Number.isInteger(c.pr.h)&&c.pr.h>0)verifyHost(c.peer,fp,c.pr);
      // the connection that was publishing the game no longer does (it stepped down): its last message no longer counts
      else if(S.vh[fp]&&S.vh[fp].peer===String(c.peer))delete S.vh[fp];}
    const sc=c=>[S.vh[fp]&&S.vh[fp].peer===String(c.peer)?1:0,S.fpPeer[fp]===c.peer?1:0,fresh(c.peer)?1:0];
    P[fp]=cs.length===1?cs[0]:cs.slice().sort((a,b)=>{const x=sc(a),y=sc(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return y[i]-x[i];return String(a.peer)<String(b.peer)?-1:1;})[0];
    S.fpPeer[fp]=P[fp].peer;}
  for(const fp in S.fpPeer)if(!C[fp])delete S.fpPeer[fp];
  S.peersByFp=P;S.qByFp=Q;
  // the host is the awake key with a verified host message of the highest epoch; at the same epoch the lower role, then the lower key
  // (the role is the one in this phone's seat table when it has one, so a peer cannot move itself up by its own table)
  const rank=fp=>{if(!vhLive(fp))return null;const pr=S.vh[fp].pr;if(!(Number.isInteger(pr.h)&&pr.h>0))return null;const ids=validIds(pr.ids);if(!ids||ids.indexOf(fp)<0)return null;const m=S.ids.indexOf(fp);return [pr.h,m>=0?m:ids.indexOf(fp),fp];};
  const better=(a,b)=>!b||a[0]>b[0]||a[0]===b[0]&&(a[1]<b[1]||a[1]===b[1]&&a[2]<b[2]);
  let H=null,hr=null;for(const fp in P){const r=rank(fp);if(r&&better(r,hr)){H=fp;hr=r;}}
  // a host that is here stays the host: someone takes over only while it is away (or asleep), and a newer host counts once the old one steps down
  if(!amHost()&&S.hostFp&&P[S.hostFp]){const r=rank(S.hostFp);if(r){H=S.hostFp;hr=r;}}
  // the host steps down only for a takeover that could have happened: it was cut off (or came back) lately, or two phones took over at once
  if(amHost()&&H){const mine=[S.epoch,roleOfFp(SEAL.fp),SEAL.fp];
    const could=hr[0]>S.epoch?now-(S.lostAt||0)<60000:hr[0]===S.epoch&&now-(S.hostSince||0)<30000;
    if(could&&better(hr,mine))demote();else H=null;}
  if(H&&!amHost())followHost(H);
  else if(!H&&!amHost())maybeTakeOver();
  if(S.mode!=='online')return;
  // names, reactions and chat; a peer speaks only for the seat its key holds
  for(const fp in P){const pr=P[fp].pr,r=roleOfFp(fp),n=typeof pr.n==='string'?pr.n.slice(0,14):'';
    if(r>=0){if(typeof pr.n==='string')S.names[r]=n;
      const rx=pr.rx;if(rx&&Number.isInteger(rx.e)&&typeof rx.t==='number'&&rx.t>(S.rxSeen[r]||0)){S.rxSeen[r]=rx.t;if(Date.now()-rx.t<8000)setTimeout(()=>floatRx(r,rx.e),0);}}
    if(Array.isArray(pr.ch))for(const m of pr.ch.slice(-10)){if(!m||typeof m.i!=='string'||m.i.length>40||typeof m.x!=='string'||m.s===1)continue;const o=S.chat[m.i];
      if(o){if(o.r===-1&&r>=0)o.r=r;continue;}
      S.chat[m.i]={i:m.i,r:r>=0?r:-1,n,t:typeof m.t==='number'&&isFinite(m.t)?m.t:Date.now(),x:m.x.slice(0,200)};if(S.chatReady&&S.modal!=='chat'&&!(S.browse||!S.st.g))chatPop(S.chat[m.i]);}}
  recomputeRoles();S.chatReady=true;if(peers.some(p=>!p.sameTab))S.roomEmpty=false;
  if(amHost()){seatPeers();processIntents();
    // a peer that came back (or changed its key) has no view in the last message: publish one for it now
    if(vwSigNow()!==S.vwSig)publish();
    if(old&&!S.oldSeen){S.oldSeen=true;S.myChat=[...S.myChat,{i:'upd'+rid(),t:Date.now(),x:'⚠️ فيه جهاز بنسخة قديمة من ألعابنا، حدّثوا التطبيق عشان تلعبون مع بعض',s:1}].slice(-10);toast('فيه جهاز بنسخة قديمة من ألعابنا');publish();}}
  render();queueSimul();
}
let recheckT=null;
function recheckPeers(){if(recheckT)return;recheckT=setTimeout(()=>{recheckT=null;if(S.mode==='online')onPeers({peers:lastPeers});},0);}
const vwSigNow=()=>Object.keys(S.peersByFp).map(fp=>fp+':'+S.peersByFp[fp].pr.k).sort().join();
function verifyHost(peer,fp,pr){const v=pr.vw&&typeof pr.vw==='object'?pr.vw[SEAL.fp]:null;peer=String(peer);
  if(typeof v!=='string'||S.vtry[peer]===v||!Number.isFinite(pr.hb))return;S.vtry[peer]=v;
  const aad=hostAad(pr),nr=S.nr,hb=pr.hb,h=pr.h;if(!aad)return;
  SEAL.open(pr.k,v,aad).then(o=>{if(S.nr!==nr||S.mode!=='online'||!o||typeof o!=='object')return;const x=S.vh[fp];
    if(x&&!(h>x.pr.h||h===x.pr.h&&hb>x.hb))return;S.vh[fp]={hb,at:Date.now(),peer,pr,o,v};recheckPeers();});}
// this page did not run for a while (frozen in the background, phone asleep): what it saw of the others is old, and if it was
// the host, someone may have taken over meanwhile, so it may step down
function tickGap(){const now=Date.now();if(now-(S.tickAt||now)>HB_DEAD){S.lostAt=now;for(const k in S.hbSeen)S.hbSeen[k].at=now;for(const k in S.vh)S.vh[k].at=now;S.tickAt=now;tabTick();}S.tickAt=now;}
function demote(){S.hostFp=null;S.hostK=null;S.hostKeyC=null;S.vwC={};S.bkCache=null;S.outQ=[];S.pend=false;publish();}
// the newest verified message of the host: what it says, and the view sealed to this phone in it
function followHost(fp){
  const V=S.vh[fp],pr=V.pr,ids=validIds(pr.ids),v=V.v;if(!ids)return;
  const newHost=S.hostFp!==fp||S.hostK!==pr.k;
  S.hostFp=fp;S.hostK=pr.k;S.hostGoneAt=null;S.epoch=pr.h;clearTimeout(S.takeT);S.restore=null;
  S.ids=ids;const me=ids.indexOf(SEAL.fp);S.me=me<0?null:me;if(S.me!=null||Date.now()-(S.joinT||0)>JOIN_WAIT)S.pending=false;
  const c=cleanCfg(pr.cfg);
  if((c.kick||[]).includes(SEAL.fp)){try{localStorage.removeItem(LSK.room);}catch(e){}leaveRoom('صاحب الغرفة طلّعك منها');return;}
  S.needUpd=pr.g!=null&&!(typeof pr.g==='string'&&Object.prototype.hasOwnProperty.call(GAMES,pr.g));
  if(pr.ack&&typeof pr.ack==='object')S.lastAck=pr.ack;
  if(newHost){S.hostKeyC=null;S.bk=null;S.bkC=null;
    // a new host may not have this phone's pick or own entry: offered again once its state is known (applyHost);
    // a part the host made (dice, cards, a character) is never sent back
    const mp=S.me!=null&&S.priv[S.me];S.resend=mp&&S.myPv&&jsEq(mp,S.myPv)?mp:null;reseal();}
  const bk=pr.bk;if(bk&&typeof bk==='object'&&bk.to===SEAL.fp&&typeof bk.c==='string'&&bk.c!==S.bkC){S.bkC=bk.c;const k=pr.k,ep=pr.h;
    SEAL.open(k,bk.c,'b'+S.code).then(o=>{if(o&&typeof o==='object'&&o.ep===ep&&S.hostK===k&&Number.isInteger(o.s))S.bk=o;});}
  // the parts the host marks '@' are read from their owners' own messages: a change there is a change of what this phone shows
  const at=pr.pp&&typeof pr.pp==='object'?Object.keys(pr.pp).filter(r=>pr.pp[r]==='@').map(r=>{const o=S.peersByFp[ids[r]];return o?o.pr.pp:null;}):[];
  const key=JSON.stringify([fp,pr.h,pr.s,pr.g,pr.d,pr.sc,pr.cfg,pr.ids,pr.pp,v,pr.ack&&pr.ack[SEAL.fp],at]);if(key===S.hostKeyC)return;S.hostKeyC=key;
  applyHost(pr,c,V.o,S.peersByFp);
}
function applyHost(pr,cf,view,P){
  const c=cleanSt(pr);const s=Number.isInteger(pr.s)&&pr.s>=0?pr.s:0;const sc=cleanSc(pr.sc)||S.st.sc;
  if(!c){S.st={...S.st,sc,cfg:cf};render();return;}
  let d=c.d;const vok=view&&typeof view==='object'&&view.s===s;
  if(d&&vok&&view.dp&&typeof view.dp==='object')try{d=cleanD(applyPatch(c.d,cleanVal(view.dp,0)));}catch(e){d=c.d;}
  S.hst={g:c.g,s,d,sc,cfg:cf};
  // the host's answer to this phone's waiting moves
  const a=pr.ack&&typeof pr.ack==='object'?pr.ack[SEAL.fp]:null;let rej=false;
  if(a&&typeof a==='object'&&Number.isInteger(a.n)&&a.n>S.ackN){S.ackN=a.n;const done=S.outQ.filter(x=>x.m.n<=a.n);S.outQ=S.outQ.filter(x=>x.m.n>a.n);
    if(a.x&&done.length){if(done.some(x=>x.m.t==='nd')||S.outQ.some(x=>x.m.t==='nd')){S.outQ=S.outQ.filter(x=>x.m.t!=='nd');rej=true;}toast('ما انحسبت حركتك');}
    if(done.some(x=>x.m.t==='ck')){if(Array.isArray(a.t))a.t.slice(0,3).forEach(t=>{if(typeof t==='string')toast(t.slice(0,120));});if(a.u)uiApply(GAMES[c.g],a.u);}
    S.pend=S.outQ.some(x=>x.m.t==='ck');publish();}
  // this phone's own public move stays on screen until the host has played it (or played something else first)
  const pend=S.outQ.filter(x=>x.m.t==='nd');
  const keep=!rej&&pend.length&&S.st.g===c.g&&S.st.d&&d&&S.st.d.gid===d.gid&&pend.some(x=>x.m.base>=s);
  const oldG=S.st.g,oldGid=S.st.d&&S.st.d.gid;
  S.st=keep?{...S.st,sc,cfg:cf}:{g:c.g,s,d,sc,cfg:cf};
  // private parts: the host's sealed ones for this seat, the public markers for the rest, the owner's own copy for '@'
  let pp={};try{pp=pr.pp&&typeof pr.pp==='object'&&!Array.isArray(pr.pp)?cleanVal(pr.pp,0):{};}catch(e){}S.pp=pp;
  const pv=vok&&view.pv&&typeof view.pv==='object'?view.pv:{},keepMine=S.outQ.some(x=>x.m.t==='pv');
  for(let r=0;r<MAXP;r++){if(r===S.me&&(keepMine||pp[r]==='@'&&pv[r]===undefined))continue;let x=pv[r];
    if(x===undefined){x=pp[r];if(x==='@'){const o=P[S.ids[r]];x=o&&o.pr.pp&&typeof o.pr.pp==='object'?o.pr.pp:null;}}
    try{S.priv[r]=x==null||typeof x!=='object'?null:cleanVal(x,0);}catch(e){S.priv[r]=null;}}
  // after a host change: this phone's own pick or entry, if the new host does not have it for this round
  const rs=S.resend;S.resend=null;
  if(rs&&S.me!=null&&d&&rs.gid===d.gid&&!jsEq(S.priv[S.me],rs)&&!S.outQ.some(x=>x.m.t==='pv')){S.priv[S.me]=rs;queueIntent({t:'pv',p:rs});}
  if(S.st.g!==oldG){resetUI();S.browse=false;S.showResult=false;}else if((S.st.d&&S.st.d.gid)!==oldGid){resetUI();S.showResult=false;}
  // a game whose players show their own part (selfPub): a new round changes what this phone shows of it
  const G=GAMES[S.st.g];if(G&&G.selfPub&&S.me!=null&&S.st.d){let x=null;try{x=S.priv[S.me]?privFor(G,S.st.d,-1,S.me,S.priv[S.me]):null;}catch(e){}if(!jsEq(x,S.selfPubLast))publish();}
  save();render();}

/* ---------- when the host is gone ---------- */
function maybeTakeOver(){
  if(S.mode!=='online'||amHost()||S.offline||S.needUpd)return;
  const now=Date.now();if(!S.hostGoneAt)S.hostGoneAt=S.hostFp?now:(S.joinT||now);
  // who takes over, in order: the seated phones by role, else (nobody seated here) any phone. Only phones that are awake count, and
  // never the key of the host that is gone (a copy of it, or the host's own page stuck, cannot take over). If the first one has
  // not taken over TAKE_NEXT after its turn came (asleep, or a copied key holding its place), the next one does
  const pres=[SEAL.fp,...Object.keys(S.peersByFp).filter(fp=>fp!==S.hostFp&&freshFp(fp))],bound=pres.filter(fp=>roleOfFp(fp)>=0);
  const order=bound.length?bound.sort((a,b)=>roleOfFp(a)-roleOfFp(b)):pres.length===1||now-S.hostGoneAt>2*TAKE_SLOW?pres.sort():[];
  const sv=S.restore,resume=!!(sv&&sv.host&&sv.st&&(sv.ep||0)>=S.epoch);
  const G=GAMES[S.st.g],d=S.hst?S.hst.d:S.st.d,secret=!resume&&isSecretG(G)&&!!d&&d.win==null;
  const bkOk=!!(S.bk&&S.hst&&S.bk.s===S.hst.s&&S.bk.ep===S.epoch);
  const i=order.indexOf(SEAL.fp),wait=(resume?RESUME_WAIT:(!secret||bkOk)?TAKE_FAST:TAKE_SLOW)+Math.max(0,i)*TAKE_NEXT,left=wait-(now-S.hostGoneAt);
  if(i<0||left>0){clearTimeout(S.takeT);S.takeT=setTimeout(()=>{if(S.mode==='online'&&!amHost())maybeTakeOver();},i<0?2000:Math.max(left,500)+60);if(i!==0)render();return;}
  takeOver(resume?'resume':bkOk?'bk':secret?'redeal':'public');
}
function takeOver(mode){
  clearTimeout(S.takeT);const sv=S.restore;S.restore=null;
  const prevAck=S.lastAck||{};
  if(mode==='resume'){S.epoch=Math.max(1,sv.ep||1);S.st={...sv.st,cfg:cleanCfg(sv.st.cfg),sc:cleanSc(sv.st.sc)||Array(MAXP).fill(0)};
    S.priv=Array(MAXP).fill(null).map((x,r)=>(Array.isArray(sv.priv)?sv.priv[r]:null)??null);S.lastN={...(sv.lastN||{})};S.ids=validIds(sv.ids)||S.ids;}
  else{S.epoch=(S.epoch||0)+1;if(S.hst)S.st={...S.hst};S.lastN={};for(const fp in prevAck)if(prevAck[fp]&&Number.isInteger(prevAck[fp].n))S.lastN[fp]=prevAck[fp].n;
    if(mode==='bk'){const b=S.bk;S.st={...S.st,g:b.g,s:b.s,d:b.d||S.st.d};S.priv=Array(MAXP).fill(null).map((x,r)=>(Array.isArray(b.priv)?b.priv[r]:null)??null);if(b.lastN&&typeof b.lastN==='object')S.lastN={...S.lastN,...b.lastN};}
    else{const mine=S.me!=null?S.priv[S.me]:null;S.priv=Array(MAXP).fill(null);if(mode==='public'&&S.me!=null)S.priv[S.me]=mine;}}
  S.hostFp=SEAL.fp;S.hostK=SEAL.k;S.hostSince=Date.now();S.hostGoneAt=null;S.hostKeyC=null;S.outQ=[];S.pend=false;S.bk=null;S.bkC=null;S.ack={};S.vwC={};S.bkCache=null;S.rejN={};
  if(S.ids.indexOf(SEAL.fp)<0){const r=[1,2,3,4,5,6,7,0].find(r=>!S.ids[r]||!present(S.ids[r]));if(r!=null){S.ids[r]=SEAL.fp;S.st.sc=[...S.st.sc];S.st.sc[r]=0;}}
  S.me=roleOfFp(SEAL.fp);if(S.me<0)S.me=null;S.pending=false;recomputeRoles();
  if(mode==='redeal'){const G=GAMES[S.st.g],d=S.st.d;let nd=null;
    if(G&&G.redeal&&d)try{nd=G.redeal(d);cleanD(nd);}catch(e){console.error(e);nd=null;}
    toast('صاحب الغرفة طلع، بدأنا الجولة من جديد');
    if(nd){S.st={...S.st,s:S.st.s+1,d:nd};resetUI();afterChange();return;}
    const gid=d&&d.gid;newRound();if(S.st.d&&S.st.d.gid===gid){S.st={...S.st,s:S.st.s+1,d:null};resetUI();afterChange();}return;}
  afterChange();
}

/* ---------- the host's side ---------- */
function seatPeers(){
  if(!amHost())return;const now=Date.now(),d=S.st.d,c=cfg();let ch=false;
  for(let r=0;r<MAXP;r++){const fp=S.ids[r];if(!fp||fp===SEAL.fp)continue;if(present(fp)){delete S.seatGone[fp];continue;}
    S.seatGone[fp]=S.seatGone[fp]||now;
    if(now-S.seatGone[fp]>=HOLD&&!(d&&d.win==null&&d.pl.includes(r))){S.ids[r]=null;delete S.seatGone[fp];S.st={...S.st,sc:[...S.st.sc]};S.st.sc[r]=0;ch=true;}}
  if(S.ids.indexOf(SEAL.fp)<0){const r=S.ids.indexOf(null);if(r>=0){S.ids[r]=SEAL.fp;S.me=r;ch=true;}}
  for(const fp of Object.keys(S.peersByFp).sort((a,b)=>String(S.peersByFp[a].peer)<String(S.peersByFp[b].peer)?-1:1)){
    if(S.ids.includes(fp)||kickedFp(fp)||c.lock&&!(c.members||[]).includes(fp))continue;
    const r=[1,2,3,4,5,6,7,0].find(r=>!S.ids[r]);if(r==null)break;
    S.ids[r]=fp;S.st={...S.st,sc:[...S.st.sc]};S.st.sc[r]=0;ch=true;}
  if(ch){recomputeRoles();save();publish();}}
// the moves waiting in the players' queues, oldest first, one at a time
async function processIntents(){
  if(!amHost())return;if(S.procBusy){S.procAgain=true;return;}S.procBusy=true;const nr=S.nr;
  try{do{S.procAgain=false;let any=false;const batch={};
    for(const fp of Object.keys(S.qByFp||{}))for(const pr of S.qByFp[fp]){if(!S.peersByFp[fp]||!Array.isArray(pr.q))continue;
      const items=pr.q.filter(x=>x&&Number.isInteger(x.n)&&x.n>(S.lastN[fp]||0)&&typeof x.c==='string'&&x.c.length<=60000&&!S.badC.has(x.c)).sort((a,b)=>a.n-b.n).slice(0,QMAX);
      for(const it of items){const m=await SEAL.open(pr.k,it.c,'q'+S.code);if(!amHost()||S.nr!==nr)return;if(it.n<=(S.lastN[fp]||0))continue;
        // what does not open with this key was not sealed by its device (or to another host): no ack, it does not move lastN
        if(!m||typeof m!=='object'||m.n!==it.n){S.badC.add(it.c);if(S.badC.size>200)S.badC.delete(S.badC.values().next().value);continue;}
        S.lastN[fp]=it.n;let res;
        {S.inIntent=true;try{res=handleIntent(fp,roleOfFp(fp),m)||{};}catch(e){console.error('intent',e);res={x:'err'};}finally{S.inIntent=false;}}
        const b=batch[fp]||(batch[fp]={t:[],u:{}});if(res.x)b.x=res.x;if(res.t)b.t.push(...res.t);if(res.u)Object.assign(b.u,res.u);
        S.ack[fp]={n:it.n,...(b.x?{x:b.x}:{}),...(b.t.length?{t:b.t.slice(0,3)}:{}),...(Object.keys(b.u).length?{u:b.u}:{})};any=true;}}
    if(any)afterChange();
  }while(S.procAgain&&amHost());}finally{S.procBusy=false;}}
const jsonLen=v=>{try{return JSON.stringify(v).length;}catch(e){return 1e9;}};
function rejectNd(fp,n,x){const a=S.rejN[fp]||(S.rejN[fp]=[]);a.push(n);if(a.length>8)a.shift();return {x};}
function handleIntent(fp,r,m){
  if(!isRole(r))return {x:'seat'};
  const G=GAMES[S.st.g],d=S.st.d;
  switch(m.t){
    case 'nd':{if(!G||!d)return rejectNd(fp,m.n,'stale');if((m.dep&&(S.rejN[fp]||[]).includes(m.dep))||m.base!==S.st.s)return rejectNd(fp,m.n,'stale');
      if(isSecretG(G))return rejectNd(fp,m.n,'secret');if(!m.dp||typeof m.dp!=='object'||jsonLen(m.dp)>40000)return rejectNd(fp,m.n,'bad');
      const c=cleanSt({g:S.st.g,d:applyPatch(d,m.dp)});if(!c||!c.d||!validateProposal(d,c.d,r))return rejectNd(fp,m.n,'bad');
      act(c.d);return {};}
    case 'pv':{if(!d||!d.pl.includes(r)||!m.p||typeof m.p!=='object'||jsonLen(m.p)>16384)return {x:'pv'};let p;try{p=cleanVal(m.p,0);}catch(e){return {x:'pv'};}
      if(p.gid!==d.gid)return {x:'pv'};const o=S.priv[r];if(o&&jsEq(o,p))return {};
      if(o&&o.gid===d.gid&&o.rd===d.rd&&o.pick!=null&&p.rd===d.rd&&!jsEq(o.pick,p.pick))return {x:'pick'};
      if(G&&G.privOk&&!G.privOk(d,r,o,p))return {x:'pv'};
      setPriv(r,p);return {};}
    case 'ck':{if(!G||!isSecretG(G))return {x:'pub'};if(!d||m.base!==S.st.s||m.gid!==d.gid)return {x:'stale'};const seat=d.pl.indexOf(r);if(seat<0)return {x:'seat'};
      let ui={};if(m.ui&&typeof m.ui==='object'&&jsonLen(m.ui)<=2048)try{ui=cleanVal(m.ui,0);}catch(e){ui={};}
      const R=sandboxClick(G,d,seat,String(m.a).slice(0,20),Number.isFinite(m.i)?m.i:null,ui);
      if(R.err)console.warn('sandbox click',R.err);
      if(R.pv&&R.pv.role===r)setPriv(r,R.pv.p);
      if(R.v!==undefined&&R.v&&R.v!==d){try{cleanD(R.v);act(R.v);}catch(e){return {x:'bad',t:R.toasts};}}
      return {t:R.toasts,u:R.u};}
    case 'skip':skipAbsent(6000);return {};
    case 'new':{if(!S.st.g)return {x:'new'};if(d&&d.win==null)return {x:'busy'};if(matchOver())return {x:'host'};newRound();return {};}
    case 'game':{const g=m.g;if(cfg().pick!=='all'||typeof g!=='string'||!Object.prototype.hasOwnProperty.call(GAMES,g))return {x:'pick'};
      if(S.st.g===g&&d&&d.win==null)return {};setGame(g);return {};}
  }
  return {x:'?'};}

/* ---------- publishing ---------- */
function schedulePublish(rx){if(rx)S.pubRx=rx;if(S.pubT)return;S.pubT=setTimeout(runPublish,PUB_MS);}
async function runPublish(){S.pubT=null;if(S.pubBusy){S.pubAgain=true;return;}S.pubBusy=true;
  try{await doPublish();}catch(e){console.warn('publish',e);}finally{S.pubBusy=false;if(S.pubAgain){S.pubAgain=false;schedulePublish();}}}
const RATE_N=100,RATE_W=10000;
async function doPublish(){
  const nr=S.nr;if(S.mode!=='online'||!nr)return;
  // this tab was asleep and the same browser opened the room in a newer tab meanwhile: give way before saying anything
  {const x=otherTab(S.code);if(x&&(x.since||0)>(S.tabSince||0)){tabMark(null);leaveRoom(TAB_MSG);return;}}
  const hb=Math.max(Date.now(),(S.lastHb||0)+1);S.lastHb=hb;
  const o={v:NETV,id:SEAL.fp,k:SEAL.k,n:S.myName.slice(0,14),ch:S.myChat.slice(-10),hb};
  if(S.pubRx){o.rx=S.pubRx;S.pubRx=null;}
  if(amHost()){const G=GAMES[S.st.g],d=S.st.d,me=SEAL.fp,small=(nr.max||3800)<8000;
    const pubD=d?viewOf(G,d,-1):null;const pp={},pubX={};
    // a part its owner shows in its own message (selfPub) is only marked '@' here: always in a small (Claude) room, where
    // carrying everyone's entry would not fit, otherwise once the owner's message already shows exactly it
    if(d)for(let r=0;r<MAXP;r++){const p=S.priv[r];if(!p||p.gid!==d.gid)continue;const x=privFor(G,d,-1,r,p);if(x==null)continue;pubX[r]=x;
      const own=G&&G.selfPub&&S.peersByFp[S.ids[r]];pp[r]=own&&(small||jsEq(own.pr.pp,x))?'@':x;}
    // an answer stays until its sender's queue no longer holds what it answers (the sender has seen it)
    const ack={};for(const fp in S.ack){if(!S.peersByFp[fp])continue;const n=S.ack[fp].n;if((S.qByFp[fp]||[]).some(pr=>Array.isArray(pr.q)&&pr.q.some(x=>x&&x.n<=n)))ack[fp]=S.ack[fp];}S.ack=ack;
    const pub={h:S.epoch,g:S.st.g,s:S.st.s,d:pubD,sc:S.st.sc,cfg:S.st.cfg,ids:S.ids.slice(),pp,ack,hb};
    const aad=hostAad(pub);if(!aad)return;
    // every phone here gets a view sealed to it, bound to all the public fields above (even when it holds nothing more than them)
    const vw={},sig=Object.keys(S.peersByFp).map(fp=>fp+':'+S.peersByFp[fp].pr.k).sort().join();
    for(const fp of Object.keys(S.peersByFp)){const r=roleOfFp(fp),pk=S.peersByFp[fp].pr.k,seat=d&&r>=0?d.pl.indexOf(r):-1;
      let dp={};if(d&&seat>=0)dp=dPatch(pubD,viewOf(G,d,seat));const pv={};
      if(d&&seat>=0)for(let q=0;q<MAXP;q++){const p=S.priv[q];if(!p||p.gid!==d.gid)continue;const x=privFor(G,d,seat,q,p);if(!jsEq(x,pubX[q]))pv[q]=x;}
      const view={s:S.st.s};if(Object.keys(dp).length)view.dp=dp;if(Object.keys(pv).length)view.pv=pv;
      // one peer that cannot be sealed to never stops the others getting theirs
      let ct=null;try{ct=await SEAL.seal(pk,view,aad);}catch(e){console.warn('seal view',e);}
      if(S.nr!==nr||!amHost())return;if(ct)vw[fp]=ct;}
    S.vwSig=sig;
    // a sealed copy of the whole game for the player who takes over if this phone leaves
    let bk=null;const succ=Object.keys(S.peersByFp).filter(fp=>roleOfFp(fp)>=0&&freshFp(fp)).sort((a,b)=>roleOfFp(a)-roleOfFp(b))[0];
    if(succ&&d){const plain=JSON.stringify({ep:S.epoch,s:S.st.s,g:S.st.g,d:isSecretG(G)?d:null,priv:S.priv,lastN:S.lastN}),pk=S.peersByFp[succ].pr.k,bc=S.bkCache;
      if(bc&&bc.plain===plain&&bc.pk===pk)bk=bc.bk;else{let c=null;try{c=await SEAL.seal(pk,JSON.parse(plain),'b'+S.code);}catch(e){console.warn('seal backup',e);}if(S.nr!==nr||!amHost())return;if(c){bk={to:succ,c};S.bkCache={plain,pk,bk};}}}
    Object.assign(o,{q:null,...pub,vw,bk});}
  else{for(const k of HOSTK)o[k]=null;o.q=S.outQ.filter(x=>x.c&&x.k===S.hostK).map(x=>({n:x.m.n,c:x.c}));
    const G=GAMES[S.st.g],d=S.st.d;o.pp=G&&G.selfPub&&d&&S.me!=null&&S.priv[S.me]?privFor(G,d,-1,S.me,S.priv[S.me]):null;S.selfPubLast=o.pp;}
  // Claude rooms take about 4 KB per player: drop the oldest chat lines, then the backup copy, then the self-published part
  const max=nr.max||3800;const size=()=>new Blob([JSON.stringify(o)]).size;let sz=size();
  while(sz>max&&o.ch.length){o.ch=o.ch.slice(1);sz=size();}
  if(sz>max&&o.bk){o.bk=null;sz=size();}
  if(sz>max&&o.pp&&!amHost()){o.pp=null;sz=size();}
  if(sz>max&&!S.bigWarn){S.bigWarn=true;console.warn('presence over the room limit',sz,max);toast('اللعبة صارت أكبر من حد الغرفة، يمكن ما توصل للباقين');}
  // stay under the room server's message rate (worker RATE_MAX): wait for the window instead of being cut off
  const now=Date.now();S.sendTimes=S.sendTimes.filter(t=>now-t<RATE_W);
  if(S.sendTimes.length>=RATE_N){S.pubAgain=true;await new Promise(r=>setTimeout(r,RATE_W-(now-S.sendTimes[0])+20));if(S.nr!==nr)return;S.pubAgain=false;return doPublish();}
  S.sendTimes.push(now);
  if(S.nr!==nr)return;S.lastPubAt=now;nr.presence(o).catch(e=>console.warn('presence',e));
}
// every 2 s: a host that left, seats to free, moves that never got through
// and a heartbeat: every phone publishes at least every HB_MS, so a frozen or asleep one is noticed (HB_DEAD)
setInterval(()=>{if(S.mode!=='online')return;tickGap();if(S.mode!=='online')return;expireIntents();if(S.pending&&S.hostFp&&Date.now()-(S.joinT||0)>JOIN_WAIT){S.pending=false;render();}
  {const r0=[...S.roles].join();recomputeRoles();if([...S.roles].join()!==r0)render();}
  if(amHost())seatPeers();else if(!hostLive()){const was=S.hostGoneAt;maybeTakeOver();if(!was&&S.hostGoneAt)render();}
  // the heartbeat says this phone hears the room too: one that has heard nothing from anyone for HB_DEAD (its page or
  // connection is stuck one way) stays quiet, so the others go on without it; it counts as cut off when it hears them again
  const deaf=Object.keys(S.peersByFp).length&&Date.now()-(S.rxAt||0)>HB_DEAD;if(deaf)S.lostAt=Date.now();
  if(S.nr&&!deaf&&Date.now()-(S.lastPubAt||0)>=HB_MS)schedulePublish();
  tabTick();},2000);
try{document.addEventListener('visibilitychange',()=>{if(S.mode==='online'&&!document.hidden){tickGap();tabTick();}});document.addEventListener('resume',()=>{if(S.mode==='online')tickGap();});}catch(e){}
// is the room's host here (this phone, or a peer publishing the game)?
const hostHere=()=>amHost()||hostLive()&&S.hostGoneAt==null;
/* ---------- the same browser in two tabs ----------
   Both tabs hold the same device key, so the room would see one player twice (and two hosts). Each tab in a room notes
   itself in localStorage every 2 s; a tab does not open a room another live tab of this browser is in, and if two find
   each other anyway (the older one was asleep when the new one came in), the one that came in first gives way. */
const TABK='alaabna.tabs',TAB_ID=Math.random().toString(36).slice(2,10),TAB_DEAD=5000;
function tabsRead(){try{const o=JSON.parse(localStorage.getItem(TABK)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}}
function tabMark(code){try{const o=tabsRead(),now=Date.now();for(const k in o)if(!o[k]||typeof o[k].t!=='number'||now-o[k].t>TAB_DEAD*4)delete o[k];
  if(code)o[TAB_ID]={c:code,t:now,since:S.tabSince||now};else delete o[TAB_ID];localStorage.setItem(TABK,JSON.stringify(o));}catch(e){}}
// another live tab of this browser in room `code`
function otherTab(code){const o=tabsRead(),now=Date.now();for(const k in o){const x=o[k];if(k!==TAB_ID&&x&&x.c===code&&typeof x.t==='number'&&now-x.t<TAB_DEAD)return x;}return null;}
function tabEnter(code){S.tabSince=Date.now();tabMark(code);}
function tabTick(){if(S.mode!=='online'||!S.code)return;const x=otherTab(S.code);
  if(x&&(x.since||0)>(S.tabSince||0)){tabMark(null);leaveRoom(TAB_MSG);return;}tabMark(S.code);}
const TAB_MSG='اللعبة مفتوحة في تبويب ثاني';
try{addEventListener('pagehide',()=>tabMark(null));}catch(e){}

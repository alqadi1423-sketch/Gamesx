'use strict';
/* ================= online room: one acting host, everyone else sends intents =================
   Only the acting host publishes the game (h = its epoch, g, s, d, sc, cfg, ids, pp, vw, bk, ack). Every other device
   publishes its name, chat, and a queue q of moves sealed to the host; the host plays them in order and acks each sender.
   Seats belong to device keys (ids[role] = fp), so a seat, its score and a kick follow the person, not the colour. */
const NETV=1,HOLD=180000,TAKE_FAST=4000,TAKE_SLOW=15000,JOIN_WAIT=4000,RESUME_WAIT=1500,PEND_MS=6000,PUB_MS=40,QMAX=6;
const HOSTK=['h','g','s','d','sc','cfg','ids','pp','vw','bk','ack'];
const FPRE=/^[\w-]{12}$/;
const isFp=x=>typeof x==='string'&&FPRE.test(x);
function validIds(a){if(!Array.isArray(a)||a.length!==MAXP||!a.every(x=>x===null||isFp(x)))return null;const f=a.filter(Boolean);return new Set(f).size===f.length?a.slice():null;}
function netReset(){clearTimeout(S.takeT);clearTimeout(S.pubT);
  Object.assign(S,{ids:Array(MAXP).fill(null),epoch:0,hostFp:null,hostK:null,hst:null,pp:{},outQ:[],pend:false,lastN:{},rejN:{},ack:{},lastAck:{},bk:null,bkC:null,
    needUpd:false,hostGoneAt:null,vgen:0,peersByFp:{},qByFp:{},lostAt:Date.now(),hostSince:0,badC:new Set(),oldSeen:false,ackN:0,sentN:0,hostKeyC:null,vwLast:{c:null,o:null},vwC:{},bkCache:null,seatGone:{},
    restore:null,takeT:null,pubT:null,pubBusy:false,pubAgain:false,pubRx:null,procBusy:false,procAgain:false,sendTimes:[],bigWarn:false});}
netReset();
const amHost=()=>S.mode==='online'&&!!S.hostFp&&S.hostFp===SEAL.fp;
const roleOfFp=fp=>fp?S.ids.indexOf(fp):-1;
const present=fp=>!!fp&&(fp===SEAL.fp||!!S.peersByFp[fp]);
const kickedFp=fp=>(cfg().kick||[]).includes(fp);
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
  m.n=nextN();S.outQ.push({m,c:null,k:null,at:Date.now()});if(m.t==='ck')S.pend=true;
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
  if(S.mode!=='online')return;
  const peers=ch&&Array.isArray(ch.peers)?ch.peers:[];lastPeers=peers;const P={},Q={};let old=false;
  for(const p of peers){if(p.sameTab){S.myPeer=p.peer;continue;}if(p.kind!=='viewer')continue;const pr=p.presence;if(!pr||typeof pr!=='object')continue;
    if(pr.v!==NETV){if(pr.v==null&&('s' in pr||'r' in pr||'g' in pr))old=true;else if(Number.isInteger(pr.v)&&pr.v>NETV&&pr.h!=null&&!S.needUpd){S.needUpd=true;}continue;}
    const fp=SEAL.fpOf(pr.k);if(!fp||pr.id!==fp||fp===SEAL.fp)continue;
    // a copied key may show up twice: the moves of both are tried, only the real device's ones open
    (Q[fp]=Q[fp]||[]).push(pr);
    if(P[fp]&&String(P[fp].peer)<String(p.peer))continue;P[fp]={peer:p.peer,pr};}
  S.peersByFp=P;S.qByFp=Q;
  // the host is the present peer with the highest epoch; at the same epoch the lower role, then the lower key
  // (the role is the one in this phone's seat table when it has one, so a peer cannot move itself up by its own table)
  const rank=(fp,pr)=>{if(!(Number.isInteger(pr.h)&&pr.h>0))return null;const ids=validIds(pr.ids);if(!ids||ids.indexOf(fp)<0)return null;const m=S.ids.indexOf(fp);return [pr.h,m>=0?m:ids.indexOf(fp),fp];};
  const better=(a,b)=>!b||a[0]>b[0]||a[0]===b[0]&&(a[1]<b[1]||a[1]===b[1]&&a[2]<b[2]);
  let H=null,hr=null;for(const fp in P){const r=rank(fp,P[fp].pr);if(r&&better(r,hr)){H=fp;hr=r;}}
  // a host that is here stays the host: someone takes over only while it is away, and a newer host counts once the old one steps down
  if(!amHost()&&S.hostFp&&P[S.hostFp]){const r=rank(S.hostFp,P[S.hostFp].pr);if(r){H=S.hostFp;hr=r;}}
  // the host steps down only for a takeover that could have happened: it was cut off (or came back) lately, or two phones took over at once
  if(amHost()&&H){const mine=[S.epoch,roleOfFp(SEAL.fp),SEAL.fp],now=Date.now();
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
    if(old&&!S.oldSeen){S.oldSeen=true;S.myChat=[...S.myChat,{i:'upd'+rid(),t:Date.now(),x:'⚠️ فيه جهاز بنسخة قديمة من ألعابنا، حدّثوا التطبيق عشان تلعبون مع بعض',s:1}].slice(-10);toast('فيه جهاز بنسخة قديمة من ألعابنا');publish();}}
  render();queueSimul();
}
function demote(){S.hostFp=null;S.hostK=null;S.hostKeyC=null;S.vwC={};S.bkCache=null;S.outQ=[];S.pend=false;publish();}
function followHost(fp){
  const pr=S.peersByFp[fp].pr,ids=validIds(pr.ids);
  const newHost=S.hostFp!==fp||S.hostK!==pr.k;
  S.hostFp=fp;S.hostK=pr.k;S.hostGoneAt=null;S.epoch=pr.h;clearTimeout(S.takeT);S.restore=null;
  S.ids=ids;const me=ids.indexOf(SEAL.fp);S.me=me<0?null:me;if(S.me!=null||Date.now()-(S.joinT||0)>JOIN_WAIT)S.pending=false;
  const c=cleanCfg(pr.cfg);
  if((c.kick||[]).includes(SEAL.fp)){try{localStorage.removeItem(LSK.room);}catch(e){}leaveRoom('صاحب الغرفة طلّعك منها');return;}
  S.needUpd=pr.g!=null&&!(typeof pr.g==='string'&&Object.prototype.hasOwnProperty.call(GAMES,pr.g));
  if(pr.ack&&typeof pr.ack==='object')S.lastAck=pr.ack;
  if(newHost){S.hostKeyC=null;S.bk=null;S.bkC=null;
    // a new host has not seen this phone's pick or secret part: send it again
    const mp=S.me!=null&&S.priv[S.me],hd=S.hst&&S.hst.d;if(mp&&hd&&mp.gid===hd.gid&&!S.outQ.some(x=>x.m.t==='pv'))queueIntent({t:'pv',p:mp});else reseal();}
  const bk=pr.bk;if(bk&&typeof bk==='object'&&bk.to===SEAL.fp&&typeof bk.c==='string'&&bk.c!==S.bkC){S.bkC=bk.c;const k=pr.k,ep=pr.h;
    SEAL.open(k,bk.c,'b'+S.code).then(o=>{if(o&&typeof o==='object'&&o.ep===ep&&S.hostK===k&&Number.isInteger(o.s))S.bk=o;});}
  const v=pr.vw&&typeof pr.vw==='object'&&typeof pr.vw[SEAL.fp]==='string'?pr.vw[SEAL.fp]:null;
  const key=JSON.stringify([fp,pr.h,pr.s,pr.g,pr.d,pr.sc,pr.cfg,pr.ids,pr.pp,v,pr.ack&&pr.ack[SEAL.fp]]);if(key===S.hostKeyC)return;S.hostKeyC=key;
  const gen=++S.vgen,P=S.peersByFp;
  if(v==null)applyHost(pr,c,null,P);
  else if(v===S.vwLast.c)applyHost(pr,c,S.vwLast.o,P);
  else SEAL.open(pr.k,v,'v'+S.code).then(o=>{if(gen!==S.vgen||S.mode!=='online'||S.hostFp!==fp)return;S.vwLast={c:v,o};applyHost(pr,c,o,P);render();});
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
  if(S.st.g!==oldG){resetUI();S.browse=false;S.showResult=false;}else if((S.st.d&&S.st.d.gid)!==oldGid){resetUI();S.showResult=false;}
  save();render();}

/* ---------- when the host is gone ---------- */
function maybeTakeOver(){
  if(S.mode!=='online'||amHost()||S.offline||S.needUpd)return;
  const now=Date.now();if(!S.hostGoneAt)S.hostGoneAt=S.hostFp?now:(S.joinT||now);
  const pres=[SEAL.fp,...Object.keys(S.peersByFp)],bound=pres.filter(fp=>roleOfFp(fp)>=0);
  let elect=null;
  if(bound.length)elect=bound.sort((a,b)=>roleOfFp(a)-roleOfFp(b))[0];
  else if(pres.length===1||now-S.hostGoneAt>2*TAKE_SLOW)elect=pres.sort()[0];
  const sv=S.restore,resume=!!(sv&&sv.host&&sv.st&&(sv.ep||0)>=S.epoch);
  const G=GAMES[S.st.g],d=S.hst?S.hst.d:S.st.d,secret=!resume&&isSecretG(G)&&!!d&&d.win==null;
  const bkOk=!!(S.bk&&S.hst&&S.bk.s===S.hst.s&&S.bk.ep===S.epoch);
  const wait=resume?RESUME_WAIT:(!secret||bkOk)?TAKE_FAST:TAKE_SLOW,left=wait-(now-S.hostGoneAt);
  if(elect!==SEAL.fp||left>0){clearTimeout(S.takeT);S.takeT=setTimeout(()=>{if(S.mode==='online'&&!amHost())maybeTakeOver();},Math.max(left,500)+60);if(elect!==SEAL.fp)render();return;}
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
      if(p.gid!==d.gid)return {x:'pv'};const o=S.priv[r];
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
    case 'skip':skipAbsent();return {};
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
  const o={v:NETV,id:SEAL.fp,k:SEAL.k,n:S.myName.slice(0,14),ch:S.myChat.slice(-10)};
  if(S.pubRx){o.rx=S.pubRx;S.pubRx=null;}
  if(amHost()){const G=GAMES[S.st.g],d=S.st.d,code=S.code,me=SEAL.fp;
    const pubD=d?viewOf(G,d,-1):null;const pp={};
    if(d)for(let r=0;r<MAXP;r++){const p=S.priv[r];if(!p||p.gid!==d.gid)continue;const x=privFor(G,d,-1,r,p);if(x==null)continue;
      const own=G&&G.selfPub&&S.peersByFp[S.ids[r]];pp[r]=own&&jsEq(own.pr.pp,x)?'@':x;}
    const vw={},want={};
    for(const fp of Object.keys(S.peersByFp)){const r=roleOfFp(fp);if(r<0)continue;const pk=S.peersByFp[fp].pr.k;const seat=d?d.pl.indexOf(r):-1;
      let dp={};if(d&&seat>=0)dp=dPatch(pubD,viewOf(G,d,seat));const pv={};
      if(d)for(let q=0;q<MAXP;q++){const p=S.priv[q];if(!p||p.gid!==d.gid)continue;const x=privFor(G,d,seat,q,p);const pub=pp[q]==='@'?S.peersByFp[S.ids[q]].pr.pp:pp[q];if(!jsEq(x,pub))pv[q]=x;}
      if(!Object.keys(dp).length&&!Object.keys(pv).length)continue;
      const plain=JSON.stringify({s:S.st.s,dp,pv});want[fp]={plain,pk};}
    for(const fp in want){const w=want[fp],c=S.vwC[fp];if(c&&c.plain===w.plain&&c.pk===w.pk){vw[fp]=c.c;continue;}
      const ct=await SEAL.seal(w.pk,JSON.parse(w.plain),'v'+code);if(S.nr!==nr||!amHost())return;S.vwC[fp]={plain:w.plain,pk:w.pk,c:ct};vw[fp]=ct;}
    for(const fp in S.vwC)if(!want[fp])delete S.vwC[fp];
    // a sealed copy of the whole game for the player who takes over if this phone leaves
    let bk=null;const succ=Object.keys(S.peersByFp).filter(fp=>roleOfFp(fp)>=0).sort((a,b)=>roleOfFp(a)-roleOfFp(b))[0];
    if(succ&&d){const plain=JSON.stringify({ep:S.epoch,s:S.st.s,g:S.st.g,d:isSecretG(G)?d:null,priv:S.priv,lastN:S.lastN}),pk=S.peersByFp[succ].pr.k,bc=S.bkCache;
      if(bc&&bc.plain===plain&&bc.pk===pk)bk=bc.bk;else{const c=await SEAL.seal(pk,JSON.parse(plain),'b'+code);if(S.nr!==nr||!amHost())return;bk={to:succ,c};S.bkCache={plain,pk,bk};}}
    // an answer stays until its sender's queue no longer holds what it answers (the sender has seen it)
    const ack={};for(const fp in S.ack){if(!S.peersByFp[fp])continue;const n=S.ack[fp].n;if((S.qByFp[fp]||[]).some(pr=>Array.isArray(pr.q)&&pr.q.some(x=>x&&x.n<=n)))ack[fp]=S.ack[fp];}S.ack=ack;
    Object.assign(o,{q:null,h:S.epoch,g:S.st.g,s:S.st.s,d:pubD,sc:S.st.sc,cfg:S.st.cfg,ids:S.ids.slice(),pp,vw,bk,ack});}
  else{for(const k of HOSTK)o[k]=null;o.q=S.outQ.filter(x=>x.c&&x.k===S.hostK).map(x=>({n:x.m.n,c:x.c}));
    const G=GAMES[S.st.g],d=S.st.d;o.pp=G&&G.selfPub&&d&&S.me!=null&&S.priv[S.me]?privFor(G,d,-1,S.me,S.priv[S.me]):null;}
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
  if(S.nr!==nr)return;nr.presence(o).catch(e=>console.warn('presence',e));
}
// every 2 s: a host that left, seats to free, moves that never got through
setInterval(()=>{if(S.mode!=='online')return;expireIntents();if(S.pending&&S.hostFp&&Date.now()-(S.joinT||0)>JOIN_WAIT){S.pending=false;render();}if(amHost())seatPeers();else if(!S.hostFp||!S.peersByFp[S.hostFp])maybeTakeOver();},2000);
// is the room's host here (this phone, or a peer publishing the game)?
const hostHere=()=>amHost()||!!(S.hostFp&&S.peersByFp[S.hostFp]&&S.hostGoneAt==null);

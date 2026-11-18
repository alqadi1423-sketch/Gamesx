'use strict';
/* Room transport for the private site on Cloudflare: one WebSocket per room code.
   It offers the same calls the engine uses from Claude rooms: join(name) -> presence / onPeers / leave.
   onPeers(h,state) also tells the engine when the connection drops ('lost'), comes back ('back'), or the room is full ('full'). */
window.WSROOM={
  // the Cloudflare address (workers.dev) or a local test server; add your own domain here if you link one
  available:()=>WSROOM.app()||/(\.workers\.dev|^localhost|^127\.0\.0\.1)$/.test(location.hostname),
  // inside the Android app the pages come from the phone, so rooms go to the Cloudflare address
  app:()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()),
  // opts.create: this phone opens a new room (the server refuses a code already in use: 'taken');
  // opts.need: joining someone's room, which must already be open (the server refuses a code nobody opened: 'noroom')
  room(){return {join:(name,opts={})=>new Promise((ok,no)=>{
    // in the app the address is SERVER (core.js), looked up again while the room cannot be reached
    const base=()=>WSROOM.app()?SERVER.replace(/^https:/,'wss:')+'/ws/'+name:(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/'+name;
    // once in, coming back after a cut is joining a room that is open: the one who made it must not ask to make it again
    // (the server answers a second ?c=1 with 'taken', which would put the room's own maker out of it)
    // (and not as a newcomer either: a room that was emptied meanwhile, by a deploy or everyone's signal dropping at once, would
    // answer 'noroom' and put everyone out of their own game)
    const url=()=>base()+(opened?'':opts.create?'?c=1':opts.need?'?j=1':'');
    /* a socket can die without either side being told (a phone that changed networks, slept, or lost signal): it stays open
       and nothing comes through. A room that has said nothing for QUIET is asked (ping) and must answer within PONG_MS; back
       in the app (screen on, back from another app, back online) it is asked at once and must answer within WAKE_MS. One
       that does not answer is replaced at once. Every TICK the socket is checked; DEAD without a word is dead whatever happens.
       (In a room with anyone else in it every phone publishes every 4 s, so a live socket is never quiet for QUIET) */
    const QUIET=5000,PONG_MS=3000,WAKE_MS=2500,DEAD=20000,TICK=2000;
    let ws=null,me=null,mine={},peers={},hs=[],sts=[],closed=false,opened=false,up=false,ping=null,again=null,tries=0,lastRx=0,probeT=null,probing=0,openAt=0;
    const NL=(...a)=>{try{window.NETLOG&&NETLOG(...a);}catch(e){}};
    const emit=()=>{const arr=[{peer:me||'me',sameTab:true,isMe:true,kind:'viewer',presence:mine}];
      for(const k in peers)arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:peers[k]});hs.forEach(h=>{try{h({peers:arr});}catch(e){console.error(e);}});};
    const tell=s=>sts.forEach(f=>{try{f(s);}catch(e){console.error(e);}});
    const send=o=>{if(ws&&ws.readyState===1)try{ws.send(JSON.stringify(o));}catch(e){}};
    // forget a socket: none of its late events can reach the engine any more
    const drop=()=>{const w=ws;ws=null;if(!w)return;w.onopen=w.onmessage=w.onclose=w.onerror=null;try{w.close();}catch(e){}};
    const WAKE=['online','focus','pageshow'],DWAKE=['visibilitychange','resume'];
    const stop=()=>{closed=true;clearInterval(ping);clearTimeout(again);clearTimeout(probeT);drop();try{WAKE.forEach(n=>removeEventListener(n,wake));DWAKE.forEach(n=>document.removeEventListener(n,wake));}catch(e){}};
    // the socket is gone: tell the engine once, then try again after about 1.5 s, 3 s, 6 s … up to 8 s on screen (30 s in the
    // background). A socket found dead (fast) is replaced at once: the network is there, only that socket is not
    const retry=(full,fast)=>{drop();clearTimeout(probeT);probing=0;if(closed)return;
      if(WSROOM.app()&&tries>0&&typeof findServer==='function')findServer();
      if(!opened){stop();no(new Error(full?'full':'ws'));return;}
      if(up||full){up=false;tell(full?'full':'lost');}
      clearTimeout(again);const cap=document.hidden?30000:8000,t=fast?150:Math.min(cap,1500*2**Math.min(tries++,5))*(.8+Math.random()*.4);
      NL('retry',Math.round(t),tries);again=setTimeout(connect,t);};
    // ask the room for an answer within ms; none: this socket is dead
    const probe=ms=>{const w=ws;if(!w||w.readyState!==1||closed)return;const t0=Date.now();probing=t0;try{w.send('{"t":"ping"}');}catch(e){}
      clearTimeout(probeT);probeT=setTimeout(()=>{if(w!==ws||closed||probing!==t0)return;probing=0;if(lastRx<t0){NL('silent',ms);retry(false,true);}},ms);};
    const api={name,max:32000,   // the room server drops messages over 32 768 characters (worker/index.js MAX_MSG)
      presence:async patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));send({t:'p',p:mine});emit();},
      onPeers:(h,st)=>{hs.push(h);if(st)sts.push(st);setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);sts=sts.filter(x=>x!==st);};},
      leave:async()=>{hs=[];sts=[];stop();},
      // when this socket last heard the room (any message, a pong too): the engine checks it before taking a room over
      heard:()=>ws&&ws.readyState===1?lastRx:0};
    const connect=()=>{
      if(closed)return;clearTimeout(again);drop();lastRx=Date.now();openAt=lastRx;NL('open',tries);
      let w;try{w=ws=new WebSocket(url());}catch(e){retry();return;}
      w.onmessage=e=>{if(w!==ws||closed)return;lastRx=Date.now();probing=0;let m;try{m=JSON.parse(e.data);}catch(x){return;}
        if(m.t==='noroom'||m.t==='taken'){if(!opened){stop();no(new Error(m.t));}else{stop();tell('bye');}return;}
        // nobody in the room at all: someone else's room this cannot be (also with a room server older than the 'noroom' rule)
        if(m.t==='hello'&&!opened&&opts.need&&!(m.peers||[]).length){stop();no(new Error('noroom'));return;}
        if(m.t==='hello'){me=m.peer;peers={};(m.peers||[]).forEach(p=>{peers[p]={};});tries=0;send({t:'p',p:mine});if(!opened){opened=true;up=true;ok(api);}else if(!up){up=true;tell('back');}emit();}
        else if(m.t==='full')retry(true);
        else if(m.t==='join'){peers[m.peer]=peers[m.peer]||{};send({t:'p',p:mine});emit();}
        else if(m.t==='p'){peers[m.peer]=m.p||{};emit();}
        else if(m.t==='leave'){delete peers[m.peer];emit();}};
      w.onclose=e=>{if(w===ws){NL('close',e&&e.code);retry(!!e&&(e.code===4001||e.code===4429));}};
      w.onerror=()=>{if(w===ws&&!opened)retry();};
    };
    // back on the network or back in the app: check at once instead of waiting for the next check, and a socket being
    // retried tries now (the wait was for a network that may be back)
    const wake=e=>{if(closed||document.hidden)return;NL('wake',e&&e.type);if(!ws){tries=0;connect();}else if(ws.readyState===1){if(Date.now()-lastRx>DEAD)retry(false,true);else if(!probing)probe(WAKE_MS);}
      else if(Date.now()-openAt>6000)retry(false,true);};
    try{WAKE.forEach(n=>addEventListener(n,wake));DWAKE.forEach(n=>document.addEventListener(n,wake));}catch(e){}
    connect();
    ping=setInterval(()=>{if(closed||!ws)return;const q=Date.now()-lastRx;
      if(ws.readyState===1){if(q>DEAD){NL('stale',q);retry(false,true);}else if(q>QUIET&&!probing)probe(PONG_MS);}
      else if(Date.now()-openAt>10000)retry();},TICK);
    setTimeout(()=>{if(!opened&&!closed){stop();no(new Error('timeout'));}},8000);
  })};}
};

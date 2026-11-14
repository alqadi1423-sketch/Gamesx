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
    const url=(WSROOM.app()?'wss://gamesx.alqadi1423.workers.dev/ws/'+name:(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/'+name)+(opts.create?'?c=1':opts.need?'?j=1':'');
    // a ping every PING ms; a socket that hears nothing for DEAD ms is taken as dead (a phone changing networks can keep one open for minutes)
    const PING=20000,DEAD=2*PING-5000;
    let ws=null,me=null,mine={},peers={},hs=[],sts=[],closed=false,opened=false,up=false,ping=null,again=null,tries=0,lastRx=0;
    const emit=()=>{const arr=[{peer:me||'me',sameTab:true,isMe:true,kind:'viewer',presence:mine}];
      for(const k in peers)arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:peers[k]});hs.forEach(h=>{try{h({peers:arr});}catch(e){console.error(e);}});};
    const tell=s=>sts.forEach(f=>{try{f(s);}catch(e){console.error(e);}});
    const send=o=>{if(ws&&ws.readyState===1)try{ws.send(JSON.stringify(o));}catch(e){}};
    // forget a socket: none of its late events can reach the engine any more
    const drop=()=>{const w=ws;ws=null;if(!w)return;w.onopen=w.onmessage=w.onclose=w.onerror=null;try{w.close();}catch(e){}};
    const stop=()=>{closed=true;clearInterval(ping);clearTimeout(again);drop();try{removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);}catch(e){}};
    // the socket is gone: tell the engine once, then try again after about 1.5 s, 3 s, 6 s … up to 30 s
    const retry=full=>{drop();if(closed)return;
      if(!opened){stop();no(new Error(full?'full':'ws'));return;}
      if(up||full){up=false;tell(full?'full':'lost');}
      clearTimeout(again);const t=Math.min(30000,1500*2**Math.min(tries++,5));again=setTimeout(connect,t*(.8+Math.random()*.4));};
    const api={name,max:32000,   // the room server drops messages over 32 768 characters (worker/index.js MAX_MSG)
      presence:async patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));send({t:'p',p:mine});emit();},
      onPeers:(h,st)=>{hs.push(h);if(st)sts.push(st);setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);sts=sts.filter(x=>x!==st);};},
      leave:async()=>{hs=[];sts=[];stop();}};
    const connect=()=>{
      if(closed)return;clearTimeout(again);drop();lastRx=Date.now();
      let w;try{w=ws=new WebSocket(url);}catch(e){retry();return;}
      w.onmessage=e=>{if(w!==ws||closed)return;lastRx=Date.now();let m;try{m=JSON.parse(e.data);}catch(x){return;}
        if(m.t==='noroom'||m.t==='taken'){if(!opened){stop();no(new Error(m.t));}else{stop();tell('bye');}return;}
        // nobody in the room at all: someone else's room this cannot be (also with a room server older than the 'noroom' rule)
        if(m.t==='hello'&&!opened&&opts.need&&!(m.peers||[]).length){stop();no(new Error('noroom'));return;}
        if(m.t==='hello'){me=m.peer;peers={};(m.peers||[]).forEach(p=>{peers[p]={};});tries=0;send({t:'p',p:mine});if(!opened){opened=true;up=true;ok(api);}else if(!up){up=true;tell('back');}emit();}
        else if(m.t==='full')retry(true);
        else if(m.t==='join'){peers[m.peer]=peers[m.peer]||{};send({t:'p',p:mine});emit();}
        else if(m.t==='p'){peers[m.peer]=m.p||{};emit();}
        else if(m.t==='leave'){delete peers[m.peer];emit();}};
      w.onclose=e=>{if(w===ws)retry(!!e&&(e.code===4001||e.code===4429));};
      w.onerror=()=>{if(w===ws&&!opened)retry();};
    };
    // back on the network or back in the app: check at once instead of waiting for the next ping
    const wake=()=>{if(closed||document.hidden)return;if(!ws){tries=0;connect();}else if(ws.readyState===1){if(Date.now()-lastRx>DEAD)retry();else send({t:'ping'});}};
    try{addEventListener('online',wake);document.addEventListener('visibilitychange',wake);}catch(e){}
    connect();
    ping=setInterval(()=>{if(closed||!ws)return;if(ws.readyState===1){if(Date.now()-lastRx>DEAD)retry();else send({t:'ping'});}else if(Date.now()-lastRx>15000)retry();},PING);
    setTimeout(()=>{if(!opened&&!closed){stop();no(new Error('timeout'));}},8000);
  })};}
};

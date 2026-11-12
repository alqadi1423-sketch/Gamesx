'use strict';
/* Room transport for the private site on Cloudflare: one WebSocket per room code.
   It offers the same calls the engine uses from Claude rooms: join(name) -> presence / onPeers / leave. */
window.WSROOM={
  available:()=>/^https?:$/.test(location.protocol)&&!/github\.io$/.test(location.hostname),
  room(){return {join:name=>new Promise((ok,no)=>{
    const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/'+name;
    let ws=null,me=null,mine={},peers={},hs=[],closed=false,opened=false,ping=null;
    const emit=()=>{const arr=[{peer:me||'me',sameTab:true,isMe:true,kind:'viewer',presence:mine}];
      for(const k in peers)arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:peers[k]});hs.forEach(h=>h({peers:arr}));};
    const send=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));};
    const api={name,
      presence:async patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));emit();send({t:'p',p:mine});},
      onPeers:h=>{hs.push(h);setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);};},
      leave:async()=>{closed=true;clearInterval(ping);try{ws.close();}catch(e){}}};
    const connect=()=>{
      try{ws=new WebSocket(url);}catch(e){if(!opened){closed=true;no(e);}return;}
      ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}
        if(m.t==='hello'){me=m.peer;peers={};(m.peers||[]).forEach(p=>{peers[p]={};});send({t:'p',p:mine});if(!opened){opened=true;ok(api);}emit();}
        else if(m.t==='join'){peers[m.peer]=peers[m.peer]||{};send({t:'p',p:mine});emit();}
        else if(m.t==='p'){peers[m.peer]=m.p||{};emit();}
        else if(m.t==='leave'){delete peers[m.peer];emit();}};
      ws.onclose=()=>{if(!closed)setTimeout(connect,1500);};
      ws.onerror=()=>{if(!opened){closed=true;no(new Error('ws'));}};
    };
    connect();ping=setInterval(()=>send({t:'ping'}),40000);
    setTimeout(()=>{if(!opened){closed=true;try{ws.close();}catch(e){}no(new Error('timeout'));}},8000);
  })};}
};

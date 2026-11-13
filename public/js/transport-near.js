'use strict';
/* Rooms between phones close to each other, inside the Android app only (Bluetooth or direct Wi-Fi, no internet).
   One phone is the hub of the room and relays messages, like the Cloudflare room does online.
   It offers the same calls the engine uses: join -> presence / onPeers / leave. */
window.NEARROOM={
  available:()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&Capacitor.Plugins&&Capacitor.Plugins.Nearby),
  P:()=>Capacitor.Plugins.Nearby,
  found:{},          // endpoint id -> {code, host}
  scanning:false,onList:null,subs:[],
  parse(name){const m=/^A1\|([A-Z0-9]{4,6})\|(.*)$/.exec(name||'');return m?{code:m[1],host:m[2]}:null;},
  async perms(){try{const r=await this.P().ensure();return !!(r&&r.granted);}catch(e){return false;}},
  async on(ev,fn){const h=await this.P().addListener(ev,fn);this.subs.push(h);return h;},
  async off(){const s=this.subs;this.subs=[];for(const h of s){try{await h.remove();}catch(e){}}},
  list(){return Object.entries(this.found).map(([id,v])=>({id,...v}));},
  async scan(onList){this.onList=onList;if(this.scanning){onList(this.list());return true;}
    if(!await this.perms())return false;
    this.found={};this.scanning=true;
    await this.on('found',e=>{const v=this.parse(e.name);if(v){this.found[e.id]=v;this.onList&&this.onList(this.list());}});
    await this.on('lost',e=>{delete this.found[e.id];this.onList&&this.onList(this.list());});
    try{await this.P().discover();}catch(e){this.scanning=false;return false;}
    return true;},
  async stopAll(){this.scanning=false;this.onList=null;this.found={};await this.off();try{await this.P().stop();}catch(e){}},
  // the engine asks for a room object; mode 'host' advertises a new room, mode 'join' connects to a found one
  room(mode,arg){const self=this;return {join:()=>mode==='host'?self.host(arg.code,arg.name):self.client(arg.id,arg.code,arg.name)};},
  base(){let mine={},peers={},hs=[],err=null;const me={id:null};
    const emit=()=>{const arr=[{peer:me.id||'me',sameTab:true,isMe:true,kind:'viewer',presence:mine}];for(const k in peers)arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:peers[k]});hs.forEach(h=>h({peers:arr}));};
    const setMine=patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));};
    return {me,peers:()=>peers,setPeers:p=>{peers=p;},mine:()=>mine,setMine,emit,onPeers:(h,e)=>{hs.push(h);if(e)err=e;setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);};},fail:()=>{err&&err();}};},
  async host(code,name){
    if(!await this.perms())throw new Error('perm');
    await this.stopAll();
    const b=this.base();b.me.id='H';const conns=new Set();const N=this.P();
    const send=(ids,o)=>{if(ids.length)N.send({ids,data:JSON.stringify(o)}).catch(()=>{});};
    const others=id=>[...conns].filter(x=>x!==id);
    await this.on('connected',e=>{const id=e.id;conns.add(id);const ps=b.peers();ps[id]=ps[id]||{};
      send([id],{t:'hello',peer:id,peers:['H',...others(id)]});send([id],{t:'p',peer:'H',p:b.mine()});
      for(const k of others(id))send([id],{t:'p',peer:k,p:ps[k]||{}});
      send(others(id),{t:'join',peer:id});b.emit();});
    await this.on('message',e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}if(m.t==='p'){b.peers()[e.id]=m.p||{};send(others(e.id),{t:'p',peer:e.id,p:m.p||{}});b.emit();}});
    await this.on('disconnected',e=>{conns.delete(e.id);delete b.peers()[e.id];send([...conns],{t:'leave',peer:e.id});b.emit();});
    await N.advertise({name:'A1|'+code+'|'+(name||'').slice(0,14)});
    return {name:code,near:true,
      presence:async patch=>{b.setMine(patch);b.emit();send([...conns],{t:'p',peer:'H',p:b.mine()});},
      onPeers:b.onPeers,
      leave:async()=>{await NEARROOM.stopAll();}};
  },
  async client(id,code,name){
    if(!await this.perms())throw new Error('perm');
    const b=this.base();const N=this.P();let host=id,opened=false,closed=false,retry=null;
    const send=o=>{if(host)N.send({ids:[host],data:JSON.stringify(o)}).catch(()=>{});};
    const api={name:code,near:true,
      presence:async patch=>{b.setMine(patch);b.emit();send({t:'p',p:b.mine()});},
      onPeers:b.onPeers,
      leave:async()=>{closed=true;clearInterval(retry);await NEARROOM.stopAll();}};
    // keep looking for the same room, so the phone can come back after a short cut
    this.onList=list=>{if(closed||host)return;const f=list.find(x=>x.code===code);if(f){host=f.id;N.connect({id:f.id,name:(name||'').slice(0,14)}).catch(()=>{host=null;});}};
    return await new Promise(async(ok,no)=>{
      await this.on('message',e=>{if(e.id!==host)return;let m;try{m=JSON.parse(e.data);}catch(x){return;}
        if(m.t==='hello'){b.me.id=m.peer;const p={};(m.peers||[]).forEach(k=>{p[k]={};});b.setPeers(p);send({t:'p',p:b.mine()});if(!opened){opened=true;ok(api);}b.emit();}
        else if(m.t==='join'){b.peers()[m.peer]=b.peers()[m.peer]||{};send({t:'p',p:b.mine()});b.emit();}
        else if(m.t==='p'){b.peers()[m.peer]=m.p||{};b.emit();}
        else if(m.t==='leave'){delete b.peers()[m.peer];b.emit();}});
      await this.on('disconnected',e=>{if(e.id!==host)return;host=null;b.setPeers({});b.emit();if(!closed){b.fail();this.P().discover().catch(()=>{});}});
      await this.on('failed',e=>{if(e.id===host)host=null;});
      await this.on('connected',e=>{if(e.id===host)N.stopDiscovery().catch(()=>{});});
      try{await N.connect({id,name:(name||'').slice(0,14)});}catch(e){host=null;}
      setTimeout(()=>{if(!opened){closed=true;NEARROOM.stopAll();no(new Error('timeout'));}},20000);
    });
  }
};

'use strict';
/* Rooms between phones close to each other, inside the Android app only (Bluetooth or direct Wi-Fi, no internet).
   One phone is the hub of the room and relays messages, like the Cloudflare room does online.
   It offers the same calls the engine uses: join -> presence / onPeers / leave. */
window.NEARROOM={
  native:()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()),
  // plain pages have no bundler, so the native plugin is registered here by name
  P(){const C=window.Capacitor;if(!C)return null;if(C.Plugins&&C.Plugins.Nearby)return C.Plugins.Nearby;return C.registerPlugin?C.registerPlugin('Nearby'):null;},
  available(){if(!this.native())return false;const C=window.Capacitor;return C.isPluginAvailable?C.isPluginAvailable('Nearby'):!!this.P();},
  found:{},          // endpoint id -> {code, host}
  log:[],onLog:null,logOn:false,
  note(t){const d=new Date(),z=n=>String(n).padStart(2,'0');this.log.push(z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds())+' '+t);if(this.log.length>40)this.log.shift();this.onLog&&this.onLog();},
  // listens once for every native event, only to write the log above
  async watch(){if(this.logOn)return;this.logOn=true;const P=this.P();
    const ev={found:e=>'found '+e.id+' "'+e.name+'"',lost:e=>'lost '+e.id,initiated:e=>'initiated '+e.id+' "'+e.name+'"',connected:e=>'connected '+e.id,failed:e=>'failed '+e.id+' code '+e.code,disconnected:e=>'disconnected '+e.id};
    for(const k in ev){try{await P.addListener(k,e=>this.note(ev[k](e||{})));}catch(x){this.note('listen '+k+' error '+this.errText(x));}}},
  scanning:false,onList:null,subs:[],
  parse(name){const m=/^A1\|([A-Z0-9]{4,6})\|(.*)$/.exec(name||'');return m?{code:m[1],host:m[2]}:null;},
  errText(e){return String((e&&(e.message||e.errorMessage))||e||'');},
  async status(){try{const r=await this.P().status();this.note('sdk '+r.sdk+' gms '+r.gms+' loc '+r.loc+' bt '+r.bt+' perm '+r.perm);return r;}catch(e){this.note('status error '+this.errText(e));return {fail:this.errText(e)};}},
  settings(which){try{this.P().settings({which});}catch(e){}},
  async perms(){try{const r=await this.P().ensure();this.note('permission '+(r&&r.granted));return !!(r&&r.granted);}catch(e){this.lastErr=this.errText(e);this.note('permission error '+this.lastErr);return false;}},
  async on(ev,fn){const h=await this.P().addListener(ev,fn);this.subs.push(h);return h;},
  async off(){const s=this.subs;this.subs=[];for(const h of s){try{await h.remove();}catch(e){}}},
  list(){return Object.entries(this.found).map(([id,v])=>({id,...v}));},
  // answers {ok} or {ok:false, why:'perm'|'err', msg}
  async scan(onList){this.onList=onList;this.lastErr='';if(this.scanning){onList(this.list());return {ok:true};}
    if(!await this.perms())return {ok:false,why:this.lastErr?'err':'perm',msg:this.lastErr};
    this.found={};this.scanning=true;
    await this.on('found',e=>{const v=this.parse(e.name);if(v){this.found[e.id]=v;this.onList&&this.onList(this.list());}});
    await this.on('lost',e=>{delete this.found[e.id];this.onList&&this.onList(this.list());});
    await this.watch();
    try{await this.P().discover();}catch(e){this.scanning=false;await this.off();this.note('discover error '+this.errText(e));return {ok:false,why:'err',msg:this.errText(e)};}
    this.note('discovering');return {ok:true};},
  async stopAll(){this.scanning=false;this.onList=null;this.found={};await this.off();try{await this.P().stop();}catch(e){}},
  // the engine asks for a room object; mode 'host' advertises a new room, mode 'join' connects to a found one
  room(mode,arg){const self=this;return {join:()=>mode==='host'?self.host(arg.code,arg.name):self.client(arg.id,arg.code,arg.name)};},
  base(){let mine={},peers={},hs=[],err=null;const me={id:null};
    const emit=()=>{const arr=[{peer:me.id||'me',sameTab:true,isMe:true,kind:'viewer',presence:mine}];for(const k in peers)arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:peers[k]});hs.forEach(h=>h({peers:arr}));};
    const setMine=patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));};
    return {me,peers:()=>peers,setPeers:p=>{peers=p;},mine:()=>mine,setMine,emit,onPeers:(h,e)=>{hs.push(h);if(e)err=e;setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);};},fail:()=>{err&&err();}};},
  async host(code,name){this.lastErr='';
    if(!await this.perms())throw new Error(this.lastErr||'perm');
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
    await this.watch();
    try{await N.advertise({name:'A1|'+code+'|'+(name||'').slice(0,14)});}catch(e){this.note('advertise error '+this.errText(e));await this.stopAll();throw new Error(this.errText(e));}
    this.note('advertising '+code);
    return {name:code,near:true,
      presence:async patch=>{b.setMine(patch);b.emit();send([...conns],{t:'p',peer:'H',p:b.mine()});},
      onPeers:b.onPeers,
      leave:async()=>{await NEARROOM.stopAll();}};
  },
  async client(id,code,name){this.lastErr='';
    if(!await this.perms())throw new Error(this.lastErr||'perm');
    const b=this.base();const N=this.P();let host=id,opened=false,closed=false,retry=null;
    const send=o=>{if(host)N.send({ids:[host],data:JSON.stringify(o)}).catch(()=>{});};
    const api={name:code,near:true,
      presence:async patch=>{b.setMine(patch);b.emit();send({t:'p',p:b.mine()});},
      onPeers:b.onPeers,
      leave:async()=>{closed=true;clearInterval(retry);await NEARROOM.stopAll();}};
    // keep looking for the same room, so the phone can come back after a short cut
    this.onList=list=>{if(closed||host)return;const f=list.find(x=>x.code===code);if(f){host=f.id;this.note('connect again '+f.id);N.connect({id:f.id,name:(name||'').slice(0,14)}).catch(e=>{host=null;this.note('connect error '+this.errText(e));});}};
    return await new Promise(async(ok,no)=>{
      await this.on('message',e=>{if(e.id!==host)return;let m;try{m=JSON.parse(e.data);}catch(x){return;}
        if(m.t==='hello'){this.note('hello, in the room');b.me.id=m.peer;const p={};(m.peers||[]).forEach(k=>{p[k]={};});b.setPeers(p);send({t:'p',p:b.mine()});if(!opened){opened=true;ok(api);}b.emit();}
        else if(m.t==='join'){b.peers()[m.peer]=b.peers()[m.peer]||{};send({t:'p',p:b.mine()});b.emit();}
        else if(m.t==='p'){b.peers()[m.peer]=m.p||{};b.emit();}
        else if(m.t==='leave'){delete b.peers()[m.peer];b.emit();}});
      await this.on('disconnected',e=>{if(e.id!==host)return;host=null;b.setPeers({});b.emit();if(!closed){b.fail();this.P().discover().catch(()=>{});}});
      await this.on('failed',e=>{if(e.id===host)host=null;});
      await this.on('connected',e=>{if(e.id===host)N.stopDiscovery().catch(()=>{});});
      this.note('connect '+id);
      try{await N.connect({id,name:(name||'').slice(0,14)});}catch(e){host=null;this.note('connect error '+this.errText(e));}
      setTimeout(()=>{if(!opened){this.note('no answer in 20s');closed=true;NEARROOM.stopAll();no(new Error('timeout'));}},20000);
    });
  }
};

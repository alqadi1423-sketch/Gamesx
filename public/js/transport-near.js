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
  // a short log for us (not shown to players): what the radio did, kept in memory only
  log:[],onLog:null,logOn:false,
  // the log shows on the nearby screen only after localStorage.neardebug='1' (for us, on a test phone)
  debug:(()=>{try{return localStorage.getItem('neardebug')==='1';}catch(e){return false;}})(),
  note(t){const d=new Date(),z=n=>String(n).padStart(2,'0');this.log.push(z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds())+' '+t);if(this.log.length>60)this.log.shift();this.onLog&&this.onLog();},
  // listens once for every native event, only to write the log above
  async watch(){if(this.logOn)return;this.logOn=true;const P=this.P();
    const ev={found:e=>'found '+e.id+' "'+e.name+'"',lost:e=>'lost '+e.id,initiated:e=>'initiated '+e.id+' "'+e.name+'"',connected:e=>'connected '+e.id,failed:e=>'failed '+e.id+' '+(e.msg||e.code),disconnected:e=>'disconnected '+e.id};
    for(const k in ev){try{await P.addListener(k,e=>this.note(ev[k](e||{})));}catch(x){this.note('listen '+k+' error '+this.errText(x));}}},
  scanning:false,onList:null,joinHook:null,
  // native listeners: the room list's (scan) and the open room's (room), so a failed try leaves the list working
  subs:{scan:[],room:[]},
  parse(name){const m=/^A1\|([A-Z0-9]{4,6})\|(.*)$/.exec(name||'');return m?{code:m[1],host:m[2]}:null;},
  // the native side answers "8034 MISSING_PERMISSION_…" style text, which core.js nearErr turns into a short Arabic hint
  errText(e){return String((e&&(e.message||e.errorMessage))||e||'');},
  async status(){try{const r=await this.P().status();this.note('sdk '+r.sdk+' gms '+r.gms+' loc '+r.loc+' bt '+r.bt+' perm '+r.perm);return r;}catch(e){this.note('status error '+this.errText(e));return {fail:this.errText(e)};}},
  settings(which){try{this.P().settings({which}).catch(()=>{});}catch(e){}},
  async perms(){try{const r=await this.P().ensure();this.note('permission '+(r&&r.granted));return !!(r&&r.granted);}catch(e){this.lastErr=this.errText(e);this.note('permission error '+this.lastErr);return false;}},
  async on(ev,fn,set){const h=await this.P().addListener(ev,fn);this.subs[set||'room'].push(h);return h;},
  async off(set){const s=this.subs[set];this.subs[set]=[];for(const h of s){try{await h.remove();}catch(e){}}},
  list(){return Object.entries(this.found).map(([id,v])=>({id,...v}));},
  changed(){const l=this.list();try{this.onList&&this.onList(l);}catch(e){console.error(e);}try{this.joinHook&&this.joinHook(l);}catch(e){console.error(e);}},
  // answers {ok} or {ok:false, why:'perm'|'err', msg}
  async scan(onList){this.onList=onList;this.lastErr='';if(this.scanning){onList(this.list());return {ok:true};}
    if(!await this.perms())return {ok:false,why:this.lastErr?'err':'perm',msg:this.lastErr};
    this.found={};this.scanning=true;await this.off('scan');
    await this.on('found',e=>{const v=this.parse(e.name);if(v){this.found[e.id]=v;this.changed();}},'scan');
    await this.on('lost',e=>{if(this.found[e.id]){delete this.found[e.id];this.changed();}},'scan');
    await this.watch();
    try{await this.P().discover();}catch(e){this.scanning=false;await this.off('scan');this.note('discover error '+this.errText(e));return {ok:false,why:'err',msg:this.errText(e)};}
    this.note('discovering');return {ok:true};},
  // look again from a clean list (after a try that did not get in, or after a cut): Nearby reports every room again
  async rescan(){if(!this.scanning)return;this.found={};this.changed();try{await this.P().discover();this.note('discovering again');}catch(e){this.note('discover error '+this.errText(e));}},
  async stopAll(){this.scanning=false;this.onList=null;this.joinHook=null;this.found={};await this.off('room');await this.off('scan');try{await this.P().stop();}catch(e){}},

  /* ---- messages: JSON text, cut into pieces when bigger than one native message ----
     a piece is "\u0001<id>|<i>|<n>|<text>" (no JSON escaping, so the size is known); pieces of one message go out in order */
  LIM:30000,      // bytes in one native message (old Play services took at most 32 KB)
  seq:0,parts:{},
  pieces(s){const L=this.LIM;let b=0;for(let i=0;i<s.length&&b<=L;i++){const c=s.charCodeAt(i);b+=c<128?1:c<2048?2:c>=0xD800&&c<0xDC00?(i++,4):3;}if(b<=L)return [s];
    const out=[],max=L-40;let st=0,n=0;
    for(let i=0;i<s.length;){const c=s.charCodeAt(i);const w=c<128?1:c<2048?2:c>=0xD800&&c<0xDC00&&i+1<s.length?4:3,u=w===4?2:1;
      if(n+w>max){out.push(s.slice(st,i));st=i;n=0;}n+=w;i+=u;}
    out.push(s.slice(st));const id=(Date.now()%1e8).toString(36)+'-'+(++this.seq);return out.map((x,i)=>'\u0001'+id+'|'+i+'|'+out.length+'|'+x);},
  out(ids,o){if(!ids.length)return Promise.resolve();const N=this.P();
    return Promise.all(this.pieces(JSON.stringify(o)).map(d=>N.send({ids,data:d}).catch(e=>{this.note('send error '+this.errText(e));})));},
  // a whole message from a phone, or null while its pieces are still coming
  inp(e){const d=e&&e.data;if(typeof d!=='string')return null;
    if(d.charCodeAt(0)!==1){try{return JSON.parse(d);}catch(x){return null;}}
    const m=/^\u0001([^|]{1,30})\|(\d{1,4})\|(\d{1,4})\|/.exec(d);if(!m)return null;
    const k=e.id+'/'+m[1],i=+m[2],n=+m[3],now=Date.now();if(!(n>1&&i<n&&n<=200))return null;
    for(const x in this.parts)if(now-this.parts[x].at>30000)delete this.parts[x];
    const p=this.parts[k]=this.parts[k]||{at:now,n,got:0,s:[]};if(p.s[i]==null){p.s[i]=d.slice(m[0].length);p.got++;}
    if(p.got<p.n)return null;delete this.parts[k];try{return JSON.parse(p.s.join(''));}catch(x){return null;}},

  // the engine asks for a room object; mode 'host' advertises a new room, mode 'join' connects to a found one
  room(mode,arg){const self=this;return {join:()=>mode==='host'?self.host(arg.code,arg.name):self.client(arg.id,arg.code,arg.name)};},
  base(){let mine={},peers={},hs=[],err=null;const me={id:null};
    const emit=()=>{const arr=[{peer:me.id||'me',sameTab:true,isMe:true,kind:'viewer',presence:mine}];for(const k in peers)arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:peers[k]});hs.forEach(h=>{try{h({peers:arr});}catch(e){console.error(e);}});};
    const setMine=patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));};
    return {me,peers:()=>peers,setPeers:p=>{peers=p;},mine:()=>mine,setMine,emit,onPeers:(h,e)=>{hs.push(h);if(e)err=e;setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);if(err===e)err=null;};},fail:st=>{try{err&&err(st||'lost');}catch(x){}},close:()=>{hs=[];err=null;}};},

  async host(code,name){this.lastErr='';
    if(!await this.perms())throw new Error(this.lastErr||'perm');
    const list=this.onList;await this.stopAll();
    const b=this.base();b.me.id='H';const conns=new Set();const N=this.P();
    const send=(ids,o)=>this.out(ids,o);
    const others=id=>[...conns].filter(x=>x!==id);
    await this.on('connected',e=>{const id=e.id;conns.add(id);const ps=b.peers();ps[id]=ps[id]||{};
      send([id],{t:'hello',peer:id,peers:['H',...others(id)]});send([id],{t:'p',peer:'H',p:b.mine()});
      for(const k of others(id))send([id],{t:'p',peer:k,p:ps[k]||{}});
      send(others(id),{t:'join',peer:id});b.emit();});
    await this.on('message',e=>{if(!conns.has(e.id))return;const m=this.inp(e);if(!m||m.t!=='p')return;const p=m.p&&typeof m.p==='object'?m.p:{};b.peers()[e.id]=p;send(others(e.id),{t:'p',peer:e.id,p});b.emit();});
    await this.on('disconnected',e=>{if(!conns.has(e.id))return;conns.delete(e.id);delete b.peers()[e.id];send([...conns],{t:'leave',peer:e.id});b.emit();});
    await this.watch();
    try{await N.advertise({name:'A1|'+code+'|'+(name||'').slice(0,14)});}
    catch(e){this.note('advertise error '+this.errText(e));await this.stopAll();if(list)this.scan(list);throw new Error(this.errText(e));}
    this.note('advertising '+code);
    return {name:code,near:true,
      presence:async patch=>{b.setMine(patch);send([...conns],{t:'p',peer:'H',p:b.mine()});b.emit();},
      onPeers:b.onPeers,max:30000,   // one presence stays about one native message; bigger ones still go, in pieces
      // tell the other phones the room is closed before the radio goes off
      leave:async()=>{b.close();if(conns.size)await Promise.race([send([...conns],{t:'bye'}),new Promise(r=>setTimeout(r,500))]);await NEARROOM.stopAll();}};
  },

  async client(id,code,name){this.lastErr='';
    if(!await this.perms())throw new Error(this.lastErr||'perm');
    await this.off('room');this.joinHook=null;
    const b=this.base(),N=this.P(),nm=(name||'').slice(0,14)||'player';
    let host=null,opened=false,closed=false,retry=null,lostAt=0,tryAt=0,live=false,why='',wait=null,lookAt=0,tries=0;
    const send=o=>{if(host&&live)this.out([host],o);};
    const api={name:code,near:true,max:30000,
      presence:async patch=>{b.setMine(patch);send({t:'p',p:b.mine()});b.emit();},
      onPeers:b.onPeers,
      leave:async()=>{closed=true;clearInterval(retry);clearTimeout(wait);b.close();await NEARROOM.stopAll();}};
    // the room's endpoint id as last seen (it changes when the room's phone was lost and found again)
    const where=()=>{const f=this.list().find(x=>x.code===code);return f?f.id:null;};
    // looking and connecting share the radio: stop looking first (as Google's samples do), it starts again when needed
    const join=eid=>{if(closed||!eid)return;host=eid;live=false;tryAt=Date.now();this.note('connect '+eid);
      N.stopDiscovery().catch(()=>{}).then(()=>{if(closed||host!==eid)return;
        N.connect({id:eid,name:nm}).catch(e=>{why=this.errText(e);this.note('connect error '+why);if(host===eid)host=null;soon();});});};
    // before the room opened: a try that did not get through is tried again a moment later, while time is left;
    // every second time the room is looked for again from scratch (a new 'found' brings it back)
    const soon=()=>{if(closed||opened)return;clearTimeout(wait);tries++;
      wait=setTimeout(()=>{if(closed||opened||host)return;if(tries%2===0)this.rescan();else join(where()||id);},1500);};
    this.joinHook=l=>{if(closed||host)return;const f=l.find(x=>x.code===code);if(f&&(opened?retry:true))join(f.id);};
    // after a cut, try again every 4 s, look again from scratch every 12 s, and give up after a minute
    const lookAgain=()=>{if(retry||closed)return;lostAt=Date.now();lookAt=0;retry=setInterval(()=>{if(closed||live){clearInterval(retry);retry=null;return;}
      if(Date.now()-lostAt>60000){clearInterval(retry);retry=null;this.note('room gone');closed=true;this.joinHook=null;b.fail('gone');return;}
      if(host&&Date.now()-tryAt>15000)host=null;if(host)return;
      const f=where();if(f)join(f);else if(Date.now()-lookAt>12000){lookAt=Date.now();this.rescan();}},4000);};
    // ends a try that never opened the room, leaving the list of rooms working
    const giveUp=async()=>{closed=true;clearTimeout(wait);this.joinHook=null;b.close();await this.off('room');
      if(host)try{await N.disconnect({id:host});}catch(e){}host=null;this.rescan();};
    return await new Promise(async(ok,no)=>{
      await this.on('message',e=>{if(closed||e.id!==host)return;const m=this.inp(e);if(!m)return;
        if(m.t==='hello'){this.note('hello, in the room');live=true;clearInterval(retry);retry=null;N.stopDiscovery().catch(()=>{});b.me.id=m.peer;const p={};(m.peers||[]).forEach(k=>{p[k]={};});b.setPeers(p);send({t:'p',p:b.mine()});if(!opened){opened=true;clearTimeout(wait);ok(api);}else b.fail('back');b.emit();}
        else if(m.t==='bye'){closed=true;clearInterval(retry);this.joinHook=null;b.fail('bye');}
        else if(m.t==='join'){b.peers()[m.peer]=b.peers()[m.peer]||{};send({t:'p',p:b.mine()});b.emit();}
        else if(m.t==='p'){b.peers()[m.peer]=m.p&&typeof m.p==='object'?m.p:{};b.emit();}
        else if(m.t==='leave'){delete b.peers()[m.peer];b.emit();}});
      await this.on('disconnected',e=>{if(closed||e.id!==host)return;host=null;const was=live;live=false;
        if(!opened){soon();return;}
        b.setPeers({});b.emit();if(was)b.fail('lost');this.rescan();lookAgain();});
      await this.on('failed',e=>{if(closed||e.id!==host)return;why=e.msg||String(e.code||'');host=null;if(!opened)soon();});
      await this.watch();
      join(id);
      // Bluetooth can take a while to pair the two phones: give it 25 s, with a few tries
      setTimeout(async()=>{if(opened||closed)return;this.note('no answer in 25s');await giveUp();no(new Error(/PERMISSION|LOCATION|BLUETOOTH|RADIO|SERVICE_MISSING|API_UNAVAILABLE/i.test(why)?why:'timeout'));},25000);
    });
  }
};

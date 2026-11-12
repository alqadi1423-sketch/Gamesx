'use strict';
/* Firebase transport: Google sign-in, an allow list, and rooms on the Realtime Database.
   It offers the same calls the engine uses from Claude rooms: join(name) -> presence / onPeers / leave. */
(function(){
  const V='10.12.2',BASE=`https://www.gstatic.com/firebasejs/${V}/`;
  let state='off',email='',onChange=()=>{};
  const cfg=()=>window.FIREBASE_CONFIG;
  const load=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s);});
  const key=e=>String(e||'').toLowerCase().replace(/\./g,',');
  async function init(cb){
    onChange=cb;state='loading';cb();
    try{await load(BASE+'firebase-app-compat.js');await load(BASE+'firebase-auth-compat.js');await load(BASE+'firebase-database-compat.js');}
    catch(e){state='error';cb();return;}
    firebase.initializeApp(cfg());
    firebase.auth().onAuthStateChanged(async u=>{
      if(!u){state='out';email='';onChange();return;}
      email=u.email||'';state='loading';onChange();
      try{const s=await firebase.database().ref('allow/'+key(email)).get();state=s.exists()?'in':'denied';}
      catch(e){state='denied';}
      onChange();
    });
  }
  function room(){
    const db=firebase.database(),uid=firebase.auth().currentUser.uid;
    return {join:async name=>{
      const peer=uid.slice(0,6)+'-'+Math.random().toString(36).slice(2,8);
      const ref=db.ref('rooms/'+name+'/peers'),me=ref.child(peer);
      let mine={},snap={},hs=[];
      const emit=()=>{const arr=[{peer,sameTab:true,isMe:true,kind:'viewer',presence:mine}];
        for(const k in snap){if(k===peer)continue;let p={};try{p=JSON.parse(snap[k].j||'{}');}catch(e){}arr.push({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:p});}
        hs.forEach(h=>h({peers:arr}));};
      const write=()=>me.set({j:JSON.stringify(mine),t:firebase.database.ServerValue.TIMESTAMP});
      const conn=db.ref('.info/connected');
      const onConn=s=>{if(s.val()===true){me.onDisconnect().remove();write();}};
      conn.on('value',onConn);
      const onVal=s=>{snap=s.val()||{};emit();};
      ref.on('value',onVal);
      return {name,
        presence:async patch=>{mine={...mine};for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine=JSON.parse(JSON.stringify(mine));emit();await write();},
        onPeers:h=>{hs.push(h);setTimeout(emit,0);return()=>{hs=hs.filter(x=>x!==h);};},
        leave:async()=>{ref.off('value',onVal);conn.off('value',onConn);await me.remove();}};
    }};
  }
  window.FB={configured:()=>!!cfg(),ready:()=>state==='in',state:()=>state,email:()=>email,init,room,
    signIn:()=>firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>console.warn(e)),
    signOut:()=>firebase.auth().signOut()};
})();

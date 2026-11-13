'use strict';
/* Each device has its own key pair (ECDH P-256), kept on the device. Its public key k is its name in a room (fp = a short
   piece of it), and two devices share a secret no one else in the room can compute: the host seals each player's own view
   with it, and each player seals its moves to the host. AES-GCM 256, a new 12-byte IV per message: "iv.ciphertext".
   Where storage is blocked (claude.ai), the key lives only as long as the page. */
window.SEAL={ok:false,fp:null,k:null,ready:null,_priv:null,_keys:new Map(),
  fpOf:k=>typeof k==='string'&&/^[A-Za-z0-9_-]{87}$/.test(k)?k.slice(2,14):null,
  b64u(buf){const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
  unb64u(t){t=String(t).replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';const s=atob(t),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;},
  async init(){
    try{const C=window.crypto&&crypto.subtle;if(!C||!window.TextEncoder)return;const A={name:'ECDH',namedCurve:'P-256'};let kp=null,sv=null;
      try{sv=JSON.parse(localStorage.getItem('alaabna.key')||'null');}catch(e){}
      if(sv&&sv.pub&&sv.priv)try{kp={publicKey:await C.importKey('jwk',sv.pub,A,true,[]),privateKey:await C.importKey('jwk',sv.priv,A,false,['deriveKey'])};}catch(e){kp=null;}
      if(!kp){kp=await C.generateKey(A,true,['deriveKey']);
        try{localStorage.setItem('alaabna.key',JSON.stringify({pub:await C.exportKey('jwk',kp.publicKey),priv:await C.exportKey('jwk',kp.privateKey)}));}catch(e){}}
      const k=this.b64u(await C.exportKey('raw',kp.publicKey));this._priv=kp.privateKey;this.k=k;this.fp=this.fpOf(k);this.ok=!!this.fp;
    }catch(e){console.warn('seal init',e);this.ok=false;}},
  // the AES key shared with the device whose public key is peerK (the same both ways), made once per peer
  key(peerK){let p=this._keys.get(peerK);
    if(!p){p=(async()=>{if(!this.ok||!this.fpOf(peerK))throw new Error('key');const C=crypto.subtle;
        const pub=await C.importKey('raw',this.unb64u(peerK),{name:'ECDH',namedCurve:'P-256'},false,[]);
        return C.deriveKey({name:'ECDH',public:pub},this._priv,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);})();
      this._keys.set(peerK,p);p.catch(()=>this._keys.delete(peerK));}
    return p;},
  async seal(peerK,obj,aad){const key=await this.key(peerK);const iv=crypto.getRandomValues(new Uint8Array(12));
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(String(aad||''))},key,new TextEncoder().encode(JSON.stringify(obj)));
    return this.b64u(iv)+'.'+this.b64u(ct);},
  // null for anything that is not a message sealed to this device with this label; never throws
  async open(peerK,str,aad){try{if(typeof str!=='string'||str.length>400000)return null;const i=str.indexOf('.');if(i!==16)return null;
      const key=await this.key(peerK);
      const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:this.unb64u(str.slice(0,i)),additionalData:new TextEncoder().encode(String(aad||''))},key,this.unb64u(str.slice(i+1)));
      return JSON.parse(new TextDecoder().decode(pt));}catch(e){return null;}}
};
SEAL.ready=SEAL.init();

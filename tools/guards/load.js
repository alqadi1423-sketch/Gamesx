// Loads the app scripts into a node vm with a stand-in DOM (no browser), so guards can read GAMES and HELP.
const vm=require('vm'),fs=require('fs');
const ROOT=process.env.ROOT||require('path').join(__dirname,'..','..','public');
function fake(name){const f=function(){return fake(name+'()');};return new Proxy(f,{get(t,k){if(k===Symbol.toPrimitive)return ()=>'';if(k==='then')return undefined;if(k==='length')return 0;if(k==='style')return {};if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false;}};if(k==='querySelectorAll'||k==='getElementsByTagName')return ()=>[];if(k==='querySelector')return ()=>null;if(k==='getElementById')return ()=>fake('el');if(k==='addEventListener')return ()=>{};return fake(name+'.'+String(k));},set(){return true;},apply(){return fake(name+'()');},construct(){return fake('new '+name);}});}
function load(){
  const store={};const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];},clear(){}};
  const ctx={console,Math,Date,JSON,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,performance:{now:()=>Date.now()},
    localStorage:ls,sessionStorage:ls,navigator:{userAgent:'node',language:'ar'},location:{search:'',hash:'',href:'http://x/',hostname:'x',protocol:'http:'},
    document:fake('document'),crypto:require('crypto').webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
    fetch:()=>Promise.reject(new Error('nofetch')),Audio:function(){return fake('audio');},Image:function(){return fake('img');},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
    getComputedStyle:()=>({}),CSS:{escape:s=>s},MutationObserver:function(){return {observe(){},disconnect(){}};},ResizeObserver:function(){return {observe(){},disconnect(){}};},IntersectionObserver:function(){return {observe(){},disconnect(){}};},
    scrollTo(){},scrollBy(){},scrollX:0,scrollY:0,pageYOffset:0,vibrate(){},addEventListener(){},removeEventListener(){},history:{replaceState(){},pushState(){}},screen:{width:390,height:844},innerWidth:390,innerHeight:844,devicePixelRatio:1,
    HTMLElement:function(){},Element:function(){},Node:function(){},Event:function(){},CustomEvent:function(){},KeyboardEvent:function(){},AudioContext:undefined,webkitAudioContext:undefined,
    speechSynthesis:undefined,Blob:function(){},FileReader:function(){},WebSocket:function(){return fake('ws');},BroadcastChannel:undefined,queueMicrotask,Promise,structuredClone};
  ctx.app=fake('app');ctx.shm=fake('shm');ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  const html=fs.readFileSync(ROOT+'/index.html','utf8');const srcs=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
  // classic scripts share one global scope: concatenate so top-level const/let are shared
  let code='';for(const s of srcs){if(/capacitor|boot\.js/.test(s))continue;code+=`\n;/*FILE ${s}*/\n`+fs.readFileSync(ROOT+'/'+s,'utf8');}
  code+='\n;globalThis.__G={GAMES,HELP,S};';
  try{vm.runInContext(code,ctx,{filename:'app.js'});}catch(e){console.error('LOAD ERROR',String(e),e.stack.split('\n').slice(0,4).join('\n'));}
  return ctx;}
module.exports={load};
if(require.main===module){const c=load();console.log(Object.keys(c.__G?c.__G.GAMES:{}).length,'games');}

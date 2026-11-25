'use strict';
/* =====================================================================================================
   «خمّن…»: one engine for the guess family and six games on it (people, animals, countries, landmarks, food, jobs).
   Everyone holds a secret card of the 24 on the board and asks yes/no questions.
   - «كل واحد سره» (md 0, the default; with 2 players the classic duel): a question goes to every rival at once and each
     one's answer is for the asker (and teammates) only; name a rival's secret to score (more for fewer questions),
     a right guess lets you guess again, a wrong one ends your turn. First to name every rival ends the game.
   - «الكل ضد واحد» (md 1, 3+ players, no teams): one keeper a round, everyone asks in turn, answers are for all, the
     first right guess takes the round; a wrong one sits you out of it. Every player keeps once.
   Secrets stay with their owner and the host (privInit/privOk); each seat's own boards and answers (el, lg) are hidden
   from the others (G.hide). Board classes all start with gsx- so no other stylesheet can reach the board's layout.
   ===================================================================================================== */
const GSN=24;
const GSX=(()=>{
  const OL='#17233A';
  const s=w=>` stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // templates (<g id="gsx-…">) shared by every card of a deck: injected once into the page
  // (a deck added after the first injection gets its templates appended next to the others)
  const XD={},IN=new Set();
  function defs(){if(typeof document==='undefined'||!document.body)return;if(IN.size&&!document.getElementById('gsx-defs'))IN.clear();
    const ks=Object.keys(XD).filter(k=>!IN.has(k));if(!ks.length)return;ks.forEach(k=>IN.add(k));
    try{const d=document.createElement('div');if(!document.getElementById('gsx-defs'))d.id='gsx-defs';d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML=`<svg width="0" height="0"><defs>${ks.map(k=>`<g id="gsx-${k}">${XD[k]}</g>`).join('')}</defs></svg>`;document.body.appendChild(d);}catch(e){}}
  const add=o=>Object.assign(XD,o);
  const u=(id,a)=>`<use href="#gsx-${id}"${a?' '+a:''}/>`;
  // a card picture: a soft background and the drawing (a -30..30 × -31..31 box)
  const card=(bg,inner)=>{defs();return `<svg class="gsx-art" viewBox="-30 -31 60 62" aria-hidden="true"><rect x="-30" y="-31" width="60" height="62" fill="${bg}"/><circle cy="44" r="36" fill="#fff" opacity=".35"/>${inner}</svg>`;};
  // a question icon (a -12..12 box)
  const ic=(bg,inner)=>{defs();return `<svg class="gsx-qi" viewBox="-12 -12 24 24" aria-hidden="true"><rect x="-12" y="-12" width="24" height="24" rx="6" fill="${bg}"/>${inner}</svg>`;};
  const BG=['#FFE8C2','#DDEFFC','#E3F5E6','#FDE3E1','#EEE6FB','#FFF2C9','#DFF3F1','#FCE5F1'];
  return {OL,s,defs,add,u,card,ic,BG};
})();
const GSD={};// the decks by game id
const gsSeg=(e,t)=>e.slice(t*GSN,t*GSN+GSN);
const gsSetSeg=(e,t,g)=>e.slice(0,t*GSN)+g+e.slice(t*GSN+GSN);
const gsItem=(D,d,k)=>D.it[d.bd[k]];
const gsMates=(d,s)=>d.pl.map((_,t)=>t).filter(t=>sameTeam(d,s,t));
const gsRivals=(d,s)=>d.pl.map((_,t)=>t).filter(t=>!sameTeam(d,s,t)&&d.out[t]!=='1');
const gsOpen=(d,s)=>gsRivals(d,s).filter(t=>d.sv[s][t]!=='1');
const gsLeft=(e,t)=>{const r=[];for(let k=0;k<GSN;k++)if(e[t*GSN+k]==='0')r.push(k);return r;};
const gsQ=(D,i)=>D.Q[i]||['؟',()=>false,0];
// the question in a sentence: «شخصيتك لابس نظارة؟»
const gsSay=(D,i)=>`${D.pre} ${gsQ(D,i)[0]}`;
// a legacy «خمّن الشخص» game (before the engine) carries on as a fresh board, same seats and secrets (secrets are board places)
function gsNorm(id,d){if(!d||d.gv===2)return d;const D=GSD[id],n=d.pl.length;const R=srng(d,'gsx');const {dk,qa,...o}=d;
  return {...o,gv:2,md:0,bd:D.deal(R),el:Array(n).fill('0'.repeat(GSN*n)),lg:Array(n).fill([]),sv:Array(n).fill('0'.repeat(n)),pt:Array(n).fill(0),qn:Array(n).fill(0),ph:0,lq:null,lqa:'',vt:Array(n).fill(-1),last:d.last||''};}
function gsInit(D,n){return {gv:2,md:0,bd:D.deal(),el:Array(n).fill('0'.repeat(GSN*n)),lg:Array(n).fill([]),sv:Array(n).fill('0'.repeat(n)),pt:Array(n).fill(0),qn:Array(n).fill(0),ph:0,lq:null,lqa:'',vt:Array(n).fill(-1),last:''};}
const gsSecret=(d,priv,t)=>{const p=priv&&priv[d.pl[t]];return p&&p.gid===d.gid&&p.sec>=0&&p.sec<GSN?p.sec:null;};
// whose turn comes next: «الكل ضد واحد» skips the keeper and whoever sat out the round (back to s when nobody else is left)
function gsNext(d,s){const n=d.pl.length;for(let k=1;k<=n;k++){const t=(s+k)%n;if(d.out[t]==='1')continue;if(d.md===1&&(t===d.kp||d.so[t]==='1'))continue;return t;}return null;}
function gsFinish(d,fin){const n=d.pl.length,pt=[...d.pt];if(fin!=null)pt[fin]+=3;
  const al=aliveSeats(d);let best=al[0];
  if(d.tm){const tot={};al.forEach(s=>tot[d.tm[s]]=(tot[d.tm[s]]||0)+pt[s]);const tb=Math.max(...Object.values(tot));
    const ts=al.filter(s=>tot[d.tm[s]]===tb);best=fin!=null&&ts.includes(fin)?fin:ts[0];return {...d,pt,ph:0,win:best,dsc:pt};}
  const top=Math.max(...al.map(s=>pt[s]));const ws=al.filter(s=>pt[s]===top);best=fin!=null&&ws.includes(fin)?fin:ws[0];
  const nd={...d,pt,ph:0,win:best,dsc:pt};if(ws.length>1&&!(fin!=null&&ws.includes(fin)))nd.wins=ws;return nd;}
/* ---------- «كل واحد سره» ---------- */
function gsAsk(D,d,s,i,priv){const n=d.pl.length,f=gsQ(D,i)[1];let ans='';
  for(let t=0;t<n;t++){if(sameTeam(d,s,t)||d.out[t]==='1'||d.sv[s][t]==='1'){ans+='-';continue;}const k=gsSecret(d,priv,t);if(k==null)return null;ans+=f(gsItem(D,d,k))?'y':'n';}
  const el=[...d.el],lg=[...d.lg],yes=[...Array(GSN).keys()].map(k=>!!f(gsItem(D,d,k)));
  for(const m of gsMates(d,s)){let e=el[m];for(let t=0;t<n;t++){const a=ans[t];if(a==='-')continue;const g=gsSeg(e,t);let ng='';for(let k=0;k<GSN;k++)ng+=g[k]==='1'||yes[k]!==(a==='y')?'1':'0';e=gsSetSeg(e,t,ng);}
    el[m]=e;lg[m]=[...lg[m],[i,ans]].slice(-40);}
  const qn=[...d.qn];qn[s]++;const rv=gsRivals(d,s);
  return {...d,el,lg,qn,ph:1,lq:[s,i],lqa:'',vt:d.vt.map(()=>-1),last:`${nm(d,s)} سأل ${rv.length>1?'الكل':nm(d,rv[0])}: «${gsSay(D,i)}»`};}
function gsGuess(D,d,s,t,k,priv){const sec=gsSecret(d,priv,t);if(sec==null)return null;if(sameTeam(d,s,t)||d.sv[s][t]==='1'||d.out[t]==='1'||!(k>=0&&k<GSN))return d;
  const el=[...d.el],pt=[...d.pt],ms=gsMates(d,s),it=gsItem(D,d,k).name;
  if(k===sec){const sv=[...d.sv],g=Math.max(1,6-d.qn[s]);for(const m of ms){el[m]=gsSetSeg(el[m],t,[...Array(GSN).keys()].map(x=>x===k?'0':'1').join(''));sv[m]=sv[m].slice(0,t)+'1'+sv[m].slice(t+1);}
    pt[s]+=g;const nd={...d,el,sv,pt,ph:1,last:`${nm(d,s)} عرف ${D.ttl} ${nm(d,t)} 🎉 +${g}`};
    return gsOpen(nd,s).length?nd:gsFinish({...nd,last:nd.last+` وكشف الكل!`},s);}
  for(const m of ms)el[m]=setAt(el[m],t*GSN+k,'1');pt[s]=Math.max(0,pt[s]-1);
  return {...d,el,pt,ph:0,turn:gsNext(d,s)??s,last:`${nm(d,s)} خمّن إن ${D.ttl} ${nm(d,t)} «${it}» وطلع غلط ✗`};}
/* ---------- «الكل ضد واحد» ---------- */
function gsRound(D,d,r){const n=d.pl.length;while(r<n&&d.out[(d.st+r)%n]==='1')r++;
  if(r>=n||aliveSeats(d).length<2)return gsFinish(d,null);
  const kp=(d.st+r)%n;const nd={...d,md:1,rd:r,kp,bd:D.deal(),kn:'0'.repeat(GSN),so:'0'.repeat(n),rq:0,hs:[],ph:0,lq:null,lqa:''};
  const t=gsNext(nd,kp);return t==null?gsFinish(nd,null):{...nd,turn:t};}
function gsAsk1(D,d,s,i,priv){const k=gsSecret(d,priv,d.kp);if(k==null)return null;const f=gsQ(D,i)[1],a=!!f(gsItem(D,d,k));
  let kn='';for(let x=0;x<GSN;x++)kn+=d.kn[x]==='1'||!!f(gsItem(D,d,x))!==a?'1':'0';const qn=[...d.qn];qn[s]++;
  return {...d,kn,qn,rq:d.rq+1,hs:[...d.hs,[i,a?1:0,s]].slice(-40),ph:1,lq:[s,i],lqa:a?'y':'n',last:`${nm(d,s)} سأل ${nm(d,d.kp)}: «${gsSay(D,i)}» ${a?'إيه ✓':'لا ✗'}`};}
function gsGuess1(D,d,s,k,priv){const sec=gsSecret(d,priv,d.kp);if(sec==null)return null;if(!(k>=0&&k<GSN))return d;const pt=[...d.pt],it=gsItem(D,d,k).name;
  if(k===sec){const g=Math.max(1,7-d.rq),kg=Math.min(4,d.rq>>1);pt[s]+=g;pt[d.kp]+=kg;
    return gsRound(D,{...d,pt,rv:[d.kp,d.bd[sec]],last:`${nm(d,s)} عرف ${D.ttl} ${nm(d,d.kp)}: ${it} 🎉 +${g}${kg?` (و${nm(d,d.kp)} +${kg})`:''}`},d.rd+1);}
  const so=setAt(d.so,s,'1'),kn=setAt(d.kn,k,'1'),nd={...d,so,kn,ph:0,last:`${nm(d,s)} خمّن «${it}» وطلع غلط، يتفرج لين آخر الجولة`};const t=gsNext(nd,s);
  if(t==null){pt[d.kp]+=5;return gsRound(D,{...nd,pt,rv:[d.kp,d.bd[sec]],last:`ما أحد عرف ${D.ttl} ${nm(d,d.kp)}: ${gsItem(D,d,sec).name}! +5 لـ${nm(d,d.kp)}`},d.rd+1);}
  return {...nd,turn:t};}
/* ---------- what each phone keeps for itself: the theme tab, guess mode, the confirm sheet, flip-by-hand notes ---------- */
const gsMan=()=>{try{return localStorage.getItem('gsx_man')==='1';}catch(e){return false;}};
const gsNoteKey=(d,v,t)=>d.gid+'|'+v+'|'+t+'|'+(d.md===1?d.rd:'');
function gsNote(d,v,t){S.gxN=S.gxN||{};return S.gxN[gsNoteKey(d,v,t)]||'0'.repeat(GSN);}
const gsFace=(d,s,sz)=>KH.face({who:d.pl[s],size:sz||26,ring:1});
// one card: front (picture and name) and back; flipped cards turn over, the newly flipped ones one after another
function gsCard(D,d,k,cls,attrs,st){const it=gsItem(D,d,k),tag=attrs?'button':'div',n=[...it.name].length,L=n>12?' class="x2"':n>9?' class="x1"':'';
  return `<${tag} class="gsx-c ${cls}" data-k="c${k}" ${attrs||''}${st?` style="${st}"`:''}><span class="gsx-f">${D.art(d.bd[k])}<i${L}>${it.name}</i></span><span class="gsx-b"><u>؟</u><i${L}>${it.name}</i></span></${tag}>`;}
function gsGrid(D,d,e,o){const prev=o.prev||e;let n=0;
  return `<div class="gsx-grid">${[...Array(GSN).keys()].map(k=>{const dn=e[k]==='1',nw=dn&&prev[k]!=='1';
    if(o.pick&&!dn)return gsCard(D,d,k,'pk','data-ga="gpick" data-i="'+k+'" aria-label="'+gsItem(D,d,k).name+'"');
    if(o.note&&!o.pick)return gsCard(D,d,k,dn?'dn':'','data-ga="note" data-i="'+k+'"');
    return gsCard(D,d,k,(dn?'dn':'')+(nw?' nw':'')+(o.me===k?' me':''),'',nw?`--dl:${380+40*(n++)}ms`:'');}).join('')}</div>`;}
// the asked questions of this board, newest first: «لابس نظارة؟ إيه»
const gsHist=(D,rows)=>rows.length?`<div class="gsx-hist">${rows.slice().reverse().map(([i,y,w])=>`<span>${D.qi(i)}${gsQ(D,i)[0]}<b class="${y?'y':'n'}">${y?'إيه':'لا'}</b>${w||''}</span>`).join('')}</div>`:'';
// the answer moment: the question bubble, then each rival's answer (two kids on a night street for a duel)
function gsScene(D,d,v,ctx){if(!d.lq)return '';const [a,i]=d.lq,n=d.pl.length,key=`sq${d.md===1?d.rd+'_'+d.rq:d.qn.reduce((x,y)=>x+y,0)}`;
  let ans=null;
  if(d.md===1)ans=[[d.kp,d.lqa==='y']];
  else if(v>=0&&sameTeam(d,a,v)){const lg=d.lg[v],r=lg&&lg[lg.length-1];if(r&&r[0]===i&&typeof r[1]==='string')ans=[...r[1]].map((c,t)=>c==='-'?null:[t,c==='y']).filter(Boolean);}
  const q=gsQ(D,i)[0];
  if(ans&&ans.length===1){const [t,y]=ans[0],ra=d.pl[a],rt=d.pl[t];
    return `<div class="gsx-scene" data-k="${key}"><svg viewBox="0 0 360 132" aria-hidden="true"><path d="M0 112H360V132H0z" fill="#22304C"/><path d="M0 112H360" stroke="#45567A" stroke-width="2"/>${KH.kid({who:ra,pose:'think',x:62,y:120,s:1.08})}${KH.kid({who:rt,pose:y?'cheer':'sad',x:298,y:120,s:1.08,mood:y?'g':'sad'})}<g class="gsx-ba">${KH.say(298,46,y?'إيه!':'لا!',{fs:19,fill:y?'#D9F5E1':'#FFE1DE'})}</g></svg><p><small>${nm(d,a)} يسأل ${nm(d,t)}</small>«${gsSay(D,i)}»</p></div>`;}
  const row=ans?`<div class="gsx-ans">${ans.map(([t,y],k)=>`<span style="--dl:${120+k*70}ms">${gsFace(d,t,34)}<em>${nm(d,t)}</em><b class="${y?'y':'n'}">${y?'إيه!':'لا!'}</b></span>`).join('')}</div>`:'';
  return `<div class="gsx-scene gsx-sc2" data-k="${key}"><p>${gsFace(d,a,30)}<span><small>${nm(d,a)} سأل ${d.md===1?nm(d,d.kp):'الكل'}</small>«${gsSay(D,i)}»</span></p>${row}</div>`;}
// the questions, by theme tab: a picture and a sentence each; asked ones show their answer (no hints before the answer)
function gsAskUI(D,d,v,o){const cat=Math.min(S.gxCat||0,D.cat.length-1);
  let s=`<div class="gsx-tabs">${D.cat.map((c,k)=>`<button class="${k===cat?'on':''}" data-ga="gcat" data-i="${k}">${D.ci(k)}<span>${c}</span></button>`).join('')}</div><div class="gsx-qs">`;
  D.Q.forEach((q,i)=>{if(q[2]!==cat)return;const a=o.asked(i);const vt=o.votes?o.votes(i):'';
    s+=`<button class="gsx-q ${a?'asked':''}" ${a||o.off?'disabled':`data-ga="${o.act||'ask'}" data-i="${i}"`}>${D.qi(i)}<span>${q[0]}${a?`<small class="${a==='y'?'y':'n'}">${a==='y'?'سألته: إيه':a==='n'?'سألته: لا':'سألته'}</small>`:''}</span>${vt}</button>`;});
  return s+'</div>';}
function gsMake(id,D,o){
  const G={name:o.name,cat:'mind',lbc:o.lbc,icon:o.icon,
    init:n=>gsInit(D,n),
    privInit:()=>({sec:rnd(GSN)}),
    // online every secret stays with its owner and the host: questions and guesses are answered on the host
    net:{host:['ask','guess','mode'],local:['tgt','gmode','gpick','gxno','gcat','man','note']},privOk:()=>false,
    hide:{seat:['el','lg']},
    viewer:d=>d.win!=null?null:d.turn,
    coverMsg:d=>d.last||'',
    points:d=>d.pt?d.pt.map(x=>x):null,
    status(d,ctx){d=gsNorm(id,d);return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
    winExtra(d,ctx){d=gsNorm(id,d);if(d.md===1)return d.last||'';const p=ctx.priv;return d.pl.map((r,s)=>{const k=p[r]&&p[r].gid===d.gid?p[r].sec:-1;return `${nm(d,s)}: ${k>=0&&k<GSN?gsItem(D,d,k).name:'؟'}`;}).join('، ');},
    onTimeout:d=>{d=gsNorm(id,d);const t=gsNext(d,d.turn);return {...d,ph:0,turn:t==null?d.turn:t};},
    onSkip:(nd,d)=>{nd=gsNorm(id,nd);if(nd.win!=null)return nd;
      if(nd.md===1&&nd.out[nd.kp]==='1')return gsRound(D,nd,nd.rd+1);
      if(nd.md===1){const t=nd.out[nd.turn]==='1'||nd.turn===nd.kp||nd.so[nd.turn]==='1'?gsNext(nd,nd.turn):nd.turn;if(t==null)return gsRound(D,nd,nd.rd+1);return {...nd,turn:t,ph:nd.turn===t?nd.ph:0};}
      if(nd.turn!==d.turn)nd={...nd,ph:0};
      // a rival who left: whoever has now named everyone left ends the game
      const done=aliveSeats(nd).find(s=>!gsOpen(nd,s).length&&nd.sv[s].includes('1'));return done!=null?gsFinish(nd,done):nd;},
    render(d,ctx){d=gsNorm(id,d);return gsRender(id,D,d,ctx);},
    click(a,i,d,ctx){d=gsNorm(id,d);gsClick(id,D,a,i,d,ctx);},
    bot(d,s,lv){d=gsNorm(id,d);return gsBot(D,d,s,lv);}};
  GSD[id]=D;GAMES[id]=G;return G;}
function gsRender(id,D,d,ctx){
  let v=ctx.local?(d.win!=null?(typeof d.win==='number'?d.win:0):ctx.v):ctx.v;const spect=v==null||v<0;if(spect)v=d.turn;
  const n=d.pl.length,myTurn=ctx.my&&d.turn===v&&d.win==null,B1=d.md===1;
  const fresh=d.win==null&&!d.qn.some(x=>x)&&!d.pt.some(x=>x)&&d.ph===0&&(B1?d.rd===0&&d.rq===0:d.turn===d.st);
  let s=`<div class="gsx gsx-${id}">`;
  if(fresh&&n>=3&&!d.tm)s+=`<div class="gsx-mode">${[['كل واحد سره','وسؤالك يروح للكل'],['الكل ضد واحد','سر واحد كل جولة']].map(([t,x],k)=>`<button class="${(d.md||0)===k?'on':''}" data-ga="mode" data-i="${k}" ${myTurn?'':'disabled'}><b>${t}</b><small>${x}</small></button>`).join('')}</div>`;
  const mine=!spect?gsSecret(d,ctx.priv,v):null;
  // B1: the keeper of this round
  if(B1){const kp=d.kp,meK=kp===v&&!spect;
    s+=`<div class="gsx-keep">${gsFace(d,kp,40)}<span><b>${meK?'السر عندك هالجولة 🤫':`السر عند ${nm(d,kp)} 🤫`}</b><small>الجولة ${d.rd+1} من ${n} · ${meK?'الباقين يسألونك، والجواب يطلع لحاله':'اسألوا بالدور، وأول واحد يعرفه يكسب'}</small></span>${meK&&mine!=null?gsCard(D,d,mine,'me'):''}</div>`;
    if(d.rv&&!d.hs.length)s+=`<p class="gsx-rv">آخر جولة: ${D.ttl} ${nm(d,d.rv[0])} كان «${D.it[d.rv[1]].name}»</p>`;}
  else if(mine!=null)s+=`<div class="gsx-sec">${gsCard(D,d,mine,'me')}<span><small>${D.sec}</small><b>${gsItem(D,d,mine).name}</b></span><button class="gsx-sw ${gsMan()?'':'on'}" data-ga="man" aria-pressed="${!gsMan()}"><i></i>قلب تلقائي</button></div>`;
  s+=gsScene(D,d,spect?-1:v,ctx);
  // the board: B1 one public board; B2 one board per rival (tabs), only for the player's own eyes
  let t=null,e=null,rows=[];
  if(B1){t=d.kp;e=d.kn;rows=d.hs.map(([i,y,w])=>[i,y,'']);}
  else if(!spect){const ts=gsRivals(d,v);if(S.tgt==null||!ts.includes(S.tgt))S.tgt=ts.find(x=>d.sv[v][x]!=='1')??ts[0]??null;t=S.tgt;
    if(t!=null){e=gsSeg(d.el[v],t);if(!/^[01]+$/.test(e))e=null;rows=(d.lg[v]||[]).filter(r=>typeof r[1]==='string'&&r[1][t]&&r[1][t]!=='-').map(r=>[r[0],r[1][t]==='y']);}
    if(ts.length>1)s+=`<div class="gsx-ot">${ts.map(x=>{const ok=d.sv[v][x]==='1',l=gsLeft(d.el[v],x).length;return `<button class="${x===t?'on':''} ${ok?'ok':''}" data-ga="tgt" data-i="${x}">${gsFace(d,x,22)}<span>${nm(d,x)}</span><b>${ok?'✔':l}</b></button>`;}).join('')}</div>`;}
  if(t!=null&&e){const man=!B1&&gsMan()&&d.sv[v][t]!=='1',shown=man?gsNote(d,v,t):e;const key=d.gid+'_'+v+'_'+t+'_'+(B1?d.rd:'')+(man?'m':'');
    S.gxPrev=S.gxPrev||{};const prev=S.gxPrev[key]||shown;S.gxPrev[key]=shown;const gm=myTurn&&S.gw&&(B1||d.sv[v][t]!=='1');
    const left=[...shown].filter(c=>c==='0').length;
    s+=`<div class="gsx-pan ${gm?'gm':''}"><div class="gsx-ph"><span>${gsFace(d,t,22)}${D.ttl} ${nm(d,t)}</span><b>${!B1&&d.sv[v][t]==='1'?'عرفته ✔':`باقي ${left} من ${GSN}`}</b></div>`;
    if(gm)s+=`<p class="gsx-gh">🎯 اضغط ${D.one} اللي تتوقعه حق ${nm(d,t)}</p>`;else if(man&&myTurn)s+=`<p class="gsx-gh soft">اقلب بنفسك: اضغط البطاقة اللي ما تنطبق</p>`;
    s+=gsGrid(D,d,shown,{prev,pick:gm,note:man&&!spect,me:B1&&d.kp===v?mine:null})+gsHist(D,rows)+`</div>`;}
  // the controls: ask (by theme), guess, end the turn; teammates vote while a mate has the turn (online)
  if(myTurn){
    if(S.gw)s+=`<div class="gsx-acts"><button class="btn soft" data-ga="gmode">رجوع</button></div>`;
    else{if(d.ph===0){const asked=B1?(i=>{const h=d.hs.find(x=>x[0]===i);return h?(h[1]?'y':'n'):'';}):(i=>{if(t==null)return '';const r=(d.lg[v]||[]).find(x=>x[0]===i);return r?(r[1][t]==='y'?'y':r[1][t]==='n'?'n':'a'):'';});
        const votes=d.tm&&!ctx.local?(i=>{const w=d.pl.map((_,m)=>m).filter(m=>m!==v&&sameTeam(d,m,v)&&d.vt[m]===i);return w.length?`<span class="gsx-vt">${w.map(m=>gsFace(d,m,18)).join('')}</span>`:'';}):null;
        s+=`<p class="gsx-lbl">${B1?`اسأل ${nm(d,d.kp)}`:`اسأل ${gsRivals(d,v).length>1?'الكل':nm(d,t)}`}: ${D.pre}…</p>`+gsAskUI(D,d,v,{asked,votes});}
      else s+=`<p class="gsx-lbl">${B1?'تبي تخمّن الحين؟':'شف الأجوبة: تبي تخمّن الحين؟'}</p>`;
      const canG=B1||(t!=null&&d.sv[v][t]!=='1');
      s+=`<div class="gsx-acts">${d.ph===1?`<button class="btn navy" data-ga="end">خلّصت دوري ⟵</button>`:''}<button class="btn gold" data-ga="gmode" ${canG?'':'disabled'}>🎯 ${d.ph===1?'أخمّن':'عرفته! أبي أخمّن'}</button></div>`;}}
  else if(!spect&&d.win==null&&d.tm&&!ctx.local&&sameTeam(d,d.turn,v)&&d.ph===0&&!B1){
    s+=`<p class="gsx-lbl">دور خويك ${nm(d,d.turn)}: صوّت على السؤال اللي تشوفه</p>`+gsAskUI(D,d,v,{asked:i=>{const r=(d.lg[v]||[]).find(x=>x[0]===i);return r?'a':'';},act:'vote',votes:i=>d.vt[v]===i?'<span class="gsx-vt me">✓</span>':''});}
  // the confirm sheet before a final guess
  if(myTurn&&S.gxConf!=null&&S.gw&&t!=null){const k=S.gxConf;if(k>=0&&k<GSN&&e&&e[k]==='0')s+=`<div class="gsx-cf" data-k="cf${k}"><div class="gsx-cfb">${gsCard(D,d,k,'')}<p>متأكد إن ${D.ttl} ${nm(d,t)} ${D.hu||'هو'}<b>«${gsItem(D,d,k).name}»؟</b><small>${B1?'لو غلطت تتفرج لين آخر الجولة':'لو غلطت يروح دورك وتنقص نقطة'}</small></p><div class="gsx-acts"><button class="btn soft" data-ga="gxno">لا، رجوع</button><button class="btn gold" data-ga="guess" data-i="${B1?k:t*GSN+k}">إيه، أخمّن</button></div></div></div>`;}
  return s+'</div>';}
function gsClick(id,D,a,i,d,ctx){
  if(a==='tgt'){S.tgt=i;S.gw=false;S.gxConf=null;render();return;}
  if(a==='gcat'){S.gxCat=i;render();return;}
  if(a==='gmode'){S.gw=!S.gw;S.gxConf=null;render();return;}
  if(a==='gpick'){S.gxConf=i;render();return;}
  if(a==='gxno'){S.gxConf=null;render();return;}
  if(a==='man'){try{localStorage.setItem('gsx_man',gsMan()?'0':'1');}catch(e){}render();return;}
  if(a==='note'){const v=ctx.v,t=S.tgt;if(v==null||v<0||t==null)return;const k=gsNoteKey(d,v,t),g=gsNote(d,v,t);S.gxN[k]=setAt(g,i,g[i]==='1'?'0':'1');render();return;}
  if(a==='vote'){const v=ctx.v;if(!(v>=0)||!d.tm||!sameTeam(d,v,d.turn)||v===d.turn||!D.Q[i])return;const vt=[...d.vt];vt[v]=vt[v]===i?-1:i;act({...d,vt});return;}
  if(!ctx.my)return;const s=d.turn;let nd=null;
  if(a==='mode'){if(d.qn.some(x=>x)||d.pt.some(x=>x)||d.md===1&&i===1||d.tm||d.pl.length<3)return;nd=i===1?gsRound(D,{...d,pt:Array(d.pl.length).fill(0)},0):{...gsInit(D,d.pl.length),...{pl:d.pl,out:d.out,turn:d.st,st:d.st,gid:d.gid,win:null}};}
  else if(a==='end'){if(d.ph!==1)return;const t=gsNext(d,s);nd={...d,ph:0,turn:t==null?s:t};}
  else if(a==='ask'){if(d.ph!==0||!D.Q[i])return;nd=d.md===1?gsAsk1(D,d,s,i,ctx.priv):gsAsk(D,d,s,i,ctx.priv);if(nd)S.gxCat=S.gxCat||0;}
  else if(a==='guess'){S.gw=false;S.gxConf=null;nd=d.md===1?gsGuess1(D,d,s,i,ctx.priv):gsGuess(D,d,s,Math.floor(i/GSN),i%GSN,ctx.priv);}
  if(nd===null){toast('انتظر اللاعبين');return;}if(nd&&nd!==d)act(nd);}
/* ---------- bots: the hard one asks what splits its boards best, the easy ones notice less and guess sooner ---------- */
function gsBot(D,d,s,lv){const end=()=>{const t=gsNext(d,s);return {...d,ph:0,turn:t==null?s:t};};
  const B1=d.md===1,priv=S.priv;
  const boards=B1?[[d.kp,gsLeft(d.kn,0)]]:gsOpen(d,s).map(t=>[t,gsLeft(d.el[s],t)]).filter(x=>x[1].length);
  const guess=(t,k)=>(B1?gsGuess1(D,d,s,k,priv):gsGuess(D,d,s,t,k,priv))||end();
  const one=boards.find(b=>b[1].length===1);if(one)return guess(one[0],one[1][0]);
  const small=boards.slice().sort((a,b)=>a[1].length-b[1].length)[0];
  if(small){const L=small[1].length;
    if(lv===1&&L<=3&&Math.random()<.35)return guess(small[0],pickR(small[1]));
    // «الكل ضد واحد»: after its own question (same turn) the next player would get the answer too, so a close board is worth a guess;
    // at the start of a turn the hard bot asks first (a question that splits two or three cards, then the guess)
    if(B1&&d.ph===1&&(lv===3?L<=3:lv===2&&L===2&&Math.random()<.6))return guess(small[0],pickR(small[1]));}
  if(d.ph===1)return end();
  const asked=new Set(B1?d.hs.map(h=>h[0]):(d.lg[s]||[]).map(r=>r[0]));
  const H=p=>p<=0||p>=1?0:-(p*Math.log2(p)+(1-p)*Math.log2(1-p));
  const val=i=>{const f=D.Q[i][1];let v=0;for(const [,L] of boards){if(L.length<2)continue;const y=L.filter(k=>!!f(gsItem(D,d,k))).length;v+=H(y/L.length)*Math.log2(L.length);}return v;};
  const qs=D.Q.map((_,i)=>i).filter(i=>!asked.has(i)).map(i=>[i,val(i)]);const useful=qs.filter(x=>x[1]>0);
  if(!useful.length)return small?guess(small[0],pickR(small[1])):end();
  if(lv===1&&Math.random()<.6)return (B1?gsAsk1:gsAsk)(D,d,s,pickR(qs)[0],priv)||end();
  // «الكل ضد واحد», hard: the answers help everyone, so it asks what most likely leaves one or two cards for its own guess right after
  if(B1&&lv===3){const L=boards[0][1],w=x=>x===1?1:x===2?.5:0;let bi=useful[0][0],bw=-1;for(const [i,v] of useful){const y=L.filter(k=>!!D.Q[i][1](gsItem(D,d,k))).length;const x=(y/L.length)*w(y)+((L.length-y)/L.length)*w(L.length-y)+v*.01;if(x>bw){bw=x;bi=i;}}
    return gsAsk1(D,d,s,bi,priv)||end();}
  const noise=[0,1.2,.5,0][lv];let best=useful[0][0],bv=-1;for(const [i,v] of useful){const x=v*(1+noise*(Math.random()-.3));if(x>bv){bv=x;best=i;}}
  return (B1?gsAsk1:gsAsk)(D,d,s,best,priv)||end();}
GSX.icon=(bg,arts)=>{GSX.defs();return `<svg viewBox="0 0 100 100"><defs><linearGradient id="gsi${bg.slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(bg,.2)}"/><stop offset="1" stop-color="${shade(bg,-.15)}"/></linearGradient></defs><rect width="100" height="100" fill="url(#gsi${bg.slice(1)})"/><circle cx="84" cy="14" r="30" fill="#fff" opacity=".1"/>`+
  arts.map((a,k)=>`<g transform="translate(${[8,52,30][k]} ${[14,14,44][k]}) rotate(${[-8,8,0][k]} 20 22)"><rect width="40" height="46" rx="7" fill="#fff" stroke="#17233A" stroke-width="2"/><svg x="3" y="3" width="34" height="35" viewBox="-30 -31 60 62">${a.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg></g>`).join('')+
  `<circle cx="78" cy="78" r="15" fill="#F0B429" stroke="#17233A" stroke-width="2.5"/><text x="78" y="85" font-size="20" font-weight="900" text-anchor="middle" fill="#17233A">؟</text></svg>`;};
/* ================= «خمّن الشخص»: the people (the original faces, moved here as they were) ================= */
const GSP=(()=>{
const MN=['أحمد','خالد','فهد','سعد','ناصر','عمر','يوسف','سلطان','ماجد','تركي','بدر','حمد'],FN=['سارة','نورة','ريم','هند','لمى','دانة','جود','مها','عبير','لينا','رهف','شهد'];
// more people: each game puts 24 of them on the board (12 men, 12 women), so the faces change from game to game
const MN2=['عبدالله','محمد','فيصل','نواف','راشد','مشاري','سعود','حسن','وليد','طلال','هشام','سامي','عادل','منصور','جاسم','عمار','ياسر','حمزة'],
  FN2=['منى','أمل','هيا','غادة','بشاير','العنود','ليلى','أسماء','سلمى','رنا','وعد','جواهر','لولوة','دلال','شيماء','حنان','مريم','فاطمة'];
const HC={black:'#2B2B2B',brown:'#7A4A2A',blond:'#E8C15A',red:'#C8512E',gray:'#B9B9B9'};
const SKIN=['#F6D6B8','#EBC09A','#C9905F','#8E5B3A'],SHIRTS=[['#4CB97F','أخضر'],['#F2A93B','برتقالي'],['#9C7BD6','بنفسجي'],['#4AB1E8','أزرق'],['#E8574E','أحمر'],['#3D5A80','كحلي']],HIJ=['#3D5A80','#9C7BD6','#2D4763','#C76A8A','#5C8D89','#A0522D'];
const CARDBG=['#FDECEA','#E8F4FD','#EAF7EF','#FFF6DD','#F1ECFA','#FDEFE4'],CAPC=['#2D4763','#E5483F','#2F7F86','#F0B429'];
const PEOPLE=(()=>{const R=mulberry(20261113);const pick=a=>a[Math.floor(R()*a.length)];const out=[];const seen=new Set();
  const make=(m,name)=>{for(let k=0;k<400;k++){const sh=pick(SHIRTS);const p={m,name,gl:R()<.3,sm:R()<.5,sk:pick(SKIN),shirt:sh[0],shn:sh[1],bg:pick(CARDBG)};
      if(m){p.sh=R()<.28;p.cap=!p.sh&&R()<.25;p.hj=false;p.hair=p.sh?'none':pick(['black','brown','blond','red','gray','bald','black']);if(p.cap&&p.hair==='bald')p.hair='black';p.hs=pick(['short','curly','spiky']);p.bd=R()<.4;p.mu=p.bd||R()<.35;p.er=false;p.capc=pick(CAPC);}
      else{p.hj=R()<.35;p.sh=false;p.cap=false;p.hair=p.hj?'none':pick(['black','brown','blond','red','gray']);p.hs=p.hj?'none':pick(['long','bob','bun','long']);p.bd=false;p.mu=false;p.er=!p.hj&&R()<.5;p.hjc=pick(HIJ);}
      const sig=[p.m,p.gl,p.sm,p.sh,p.cap,p.hj,p.hair,p.hs==='long',p.bd,p.mu,p.er,p.shn].join();if(!seen.has(sig)){seen.add(sig);return p;}}};
  for(let i=0;i<12;i++){out.push(make(true,MN[i]));out.push(make(false,FN[i]));}
  for(let i=0;i<MN2.length;i++){out.push(make(true,MN2[i]));out.push(make(false,FN2[i]));}return out.filter(Boolean);})();
function faceSVG(p){
  // a self-contained picture (it is drawn as an image): the shemagh's red and white checks are defined inside it
  const hc=HC[p.hair]||'#2B2B2B',sk=p.sk,dk=shade(sk,-.2),O='stroke="#2D4763" stroke-width=".9"';let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 66">${p.sh&&!p.gh?'<defs><pattern id="shm" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><rect width="2.5" height="2.5" fill="#D8423A"/><rect x="2.5" y="2.5" width="2.5" height="2.5" fill="#D8423A"/></pattern></defs>':''}<rect width="60" height="66" fill="${p.bg}"/><circle cx="30" cy="70" r="34" fill="#fff" opacity=".45"/>`;
  if(!p.m&&!p.hj&&p.hs==='long')s+=`<path d="M13 31C13 13 21 8 30 8S47 13 47 31V59C42 61 18 61 13 59Z" fill="${hc}" ${O}/>`;
  if(!p.m&&!p.hj&&p.hs==='bob')s+=`<path d="M14 30C14 13 21 9 30 9S46 13 46 30V43C46 46 43 47 41 45H19C17 47 14 46 14 43Z" fill="${hc}" ${O}/>`;
  if(!p.m&&!p.hj&&p.hs==='bun')s+=`<circle cx="30" cy="9" r="6" fill="${hc}" ${O}/>`;
  if(p.hj)s+=`<path d="M11 31C11 13 19 7 30 7S49 13 49 31C49 42 47 51 53 66H7C13 51 11 42 11 31Z" fill="${p.hjc}" ${O}/>`;
  if(p.sh)s+=`<path d="M12 30C12 14 20 9 30 9S48 14 48 30L52 56C45 51 38 50 30 50S15 51 8 56Z" fill="${p.gh?'#FAFBFD':'url(#shm)'}" ${O}/>`;
  s+=`<path d="M6 66C6 53 17 47 30 47S54 53 54 66Z" fill="${p.shirt}" ${O}/><path d="M6 66C6 60 9 56 13 53" stroke="rgba(0,0,0,.12)" stroke-width="3" fill="none"/>`;
  s+=`<path d="M25 39H35V49C33 51.5 27 51.5 25 49Z" fill="${dk}"/>`;
  if(!p.hj)s+=p.m&&!p.sh?`<path d="M23 47L30 54L37 47" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.6"/>`:'';
  if(!p.hj&&!p.sh)s+=`<ellipse cx="17.6" cy="31" rx="2.6" ry="3.6" fill="${sk}" ${O}/><ellipse cx="42.4" cy="31" rx="2.6" ry="3.6" fill="${sk}" ${O}/>`;
  s+=`<ellipse cx="30" cy="30" rx="12.5" ry="14.5" fill="${sk}" ${O}/>`;
  if(p.er)s+=`<circle cx="17.4" cy="36.2" r="1.6" fill="#F2C14E" stroke="#B8860B" stroke-width=".5"/><circle cx="42.6" cy="36.2" r="1.6" fill="#F2C14E" stroke="#B8860B" stroke-width=".5"/>`;
  if(p.m&&p.hair==='bald')s+=`<path d="M18 29C17 26 18 24 19.5 23M42 29C43 26 42 24 40.5 23" stroke="#8b8b8b" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M24 18Q27 16.5 30 17" stroke="#fff" stroke-width="1.2" opacity=".6" fill="none" stroke-linecap="round"/>`;
  else if(p.m&&p.hair!=='none'){if(p.hs==='curly')s+=`<path d="M17.5 27C15.5 22 17 16 21 15C22 11.5 26 11 28 12.5C30 10.5 34 11 35.5 13C39.5 12.5 43.5 17 42.5 27C41 21.5 37 19 30 19S19 21.5 17.5 27Z" fill="${hc}" ${O}/>`;
    else if(p.hs==='spiky')s+=`<path d="M17.5 27C17 19 19 15 21 15L22 10.5L25.5 13.5L28 9.5L30.5 13L34 10L35.5 14L39 12.5L39.5 16C42 18 43 22 42.5 27C41 21.5 37 19 30 19S19 21.5 17.5 27Z" fill="${hc}" ${O}/>`;
    else s+=`<path d="M17.5 27C17 15 23 12.5 30 12.5S43 15 42.5 27C41 21 37 18.5 30 18.5S19 21 17.5 27Z" fill="${hc}" ${O}/>`;}
  if(!p.m&&!p.hj&&p.hair!=='none')s+=p.hs==='bun'?`<path d="M17.5 27C17 16 23 13 30 13S43 16 42.5 27C40 21 36 19 30 19S20 21 17.5 27Z" fill="${hc}" ${O}/>`:`<path d="M17.5 28C18 16 24 13 31 14S42 18 42.5 26C37 20 28 22 17.5 28Z" fill="${hc}" ${O}/>`;
  if(p.hj)s+=`<path d="M16.5 30C16.5 19 22 14.5 30 14.5S43.5 19 43.5 30" fill="none" stroke="${p.hjc}" stroke-width="3.4"/><path d="M16.5 30C16.5 19 22 14.5 30 14.5S43.5 19 43.5 30" fill="none" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>`;
  if(p.sh)s+=`<path d="M17 21.5C17 16 22 14 30 14S43 16 43 21.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M15.5 18C20 12.5 40 12.5 44.5 18" stroke="#1d1d1d" stroke-width="2.4" fill="none"/><path d="M16.5 20.8C21 16 39 16 43.5 20.8" stroke="#1d1d1d" stroke-width="1.8" fill="none"/>`;
  if(p.cap)s+=`<path d="M17 22C17 12.5 23 10.5 30 10.5S43 12.5 43 22Z" fill="${p.capc}" ${O}/><path d="M29 21.5H48C48 24 45 25.5 41 25H29Z" fill="${shade(p.capc,-.25)}" ${O}/><circle cx="30" cy="11" r="1.3" fill="${shade(p.capc,.3)}"/>`;
  const bw=p.hair==='blond'||p.hair==='gray'||p.hair==='none'||p.hair==='bald'?'#5a4636':shade(hc,-.2);
  s+=`<path d="M21.5 24.6Q25 22.6 28 24.4M32 24.4Q35 22.6 38.5 24.6" stroke="${bw}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  s+=`<ellipse cx="25" cy="29" rx="2.5" ry="2" fill="#fff"/><ellipse cx="35" cy="29" rx="2.5" ry="2" fill="#fff"/><circle cx="25.3" cy="29.2" r="1.3" fill="#2D2D2D"/><circle cx="35.3" cy="29.2" r="1.3" fill="#2D2D2D"/><circle cx="25.8" cy="28.7" r=".45" fill="#fff"/><circle cx="35.8" cy="28.7" r=".45" fill="#fff"/>`;
  s+=`<path d="M30 30.5Q28.4 34.6 30.4 35.2" stroke="${dk}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  if(!p.m||p.sm)s+=`<ellipse cx="21.5" cy="35" rx="2.2" ry="1.2" fill="#F08080" opacity=".35"/><ellipse cx="38.5" cy="35" rx="2.2" ry="1.2" fill="#F08080" opacity=".35"/>`;
  if(p.gl)s+=`<rect x="20.4" y="26" width="9" height="6.4" rx="2.4" fill="rgba(255,255,255,.18)" stroke="#2D4763" stroke-width="1.2"/><rect x="30.6" y="26" width="9" height="6.4" rx="2.4" fill="rgba(255,255,255,.18)" stroke="#2D4763" stroke-width="1.2"/><path d="M29.4 28.4H30.6M20.4 28.6L17.8 27.6M39.6 28.6L42.2 27.6" stroke="#2D4763" stroke-width="1.1"/>`;
  const bc=p.hair==='gray'||p.hair==='bald'?'#7d7d7d':(p.hair==='none'?'#2B2B2B':hc);
  if(p.bd)s+=`<path d="M17.8 31C17.8 45 24 46.5 30 46.5S42.2 45 42.2 31C40 38.5 36 39.5 30 39.5S20 38.5 17.8 31Z" fill="${bc}" ${O}/>`;
  if(p.mu)s+=`<path d="M24 37C26.5 35 33.5 35 36 37C33.5 36.4 26.5 36.4 24 37Z" fill="${bc}" stroke="${bc}" stroke-width="1.8" stroke-linejoin="round"/>`;
  s+=p.sm?`<path d="M25.6 38.6Q30 43 34.4 38.6Z" fill="#fff" stroke="#2D4763" stroke-width="1.1" stroke-linejoin="round"/>`:`<path d="M27 40H33" stroke="#2D4763" stroke-width="1.3" stroke-linecap="round"/>`;
  return s+'</svg>';
}
  // new people for a bigger pool, drawn by the same face code: men in a white ghutra and thobe
  [['إبراهيم',0,1,1,2],['صالح',1,0,1,1],['مازن',0,1,0,0,1],['ثامر',1,1,0,3],['نايف',0,0,0,1,1],['معاذ',0,1,0,2],['أنس',1,0,0,0,1],['رائد',1,1,1,2]].forEach(([name,gl,sm,bd,sk,mu],k)=>
    PEOPLE.push({m:true,name,gl:!!gl,sm:!!sm,sk:SKIN[sk],shirt:'#F4F6FA',shn:'أبيض',bg:CARDBG[(k+2)%CARDBG.length],sh:true,gh:true,cap:false,hj:false,hair:'none',hs:'short',bd:!!bd,mu:!!(bd||mu),er:false,capc:CAPC[0]}));
  // each face is one image node (its SVG as a data URL): 24 faces on a board stay cheap to draw
  const IMG={};const img=(k,p,vb)=>IMG[k]||(IMG[k]=`<img class="${vb?'gsx-qi':'gsx-img'}" alt="" draggable="false" src="data:image/svg+xml,${encodeURIComponent(faceSVG(p).replace('viewBox="0 0 60 66"',vb?`viewBox="${vb}"`:'viewBox="0 0 60 66"'))}">`);
  const art=k=>img('p'+k,PEOPLE[k]);
  // the question icons: a face showing just that thing (cropped to the head)
  const base={m:true,gl:false,sm:true,sk:SKIN[1],shirt:'#4AB1E8',shn:'',bg:'#E8F4FD',sh:false,cap:false,hj:false,hair:'black',hs:'short',bd:false,mu:false,er:false,capc:'#E5483F'};
  const fem={...base,m:false,hair:'brown',hs:'long',bg:'#FDECEA',shirt:'#9C7BD6'};
  const head=(key,p)=>img('q'+key,{...p},'11 6 38 38');
  const sw=c=>GSX.ic('#F4F6FA',`<path d="M-9 10v-3q0-6 9-6t9 6v3z" fill="${c}"${GSX.s(1.3)}/><circle cy="-5" r="4.6" fill="#F2C29B"${GSX.s(1.3)}/>`);
  const QS=[['رجّال؟',p=>p.m,0,head('m',base)],['حرمة؟',p=>!p.m,0,head('f',fem)],['مبتسم؟',p=>p.sm,0,head('sm',{...base,hair:'brown',sk:SKIN[0]})],
    ['لابس شماغ أحمر؟',p=>p.sh&&!p.gh,1,head('sh',{...base,sh:true,hair:'none'})],['لابس غترة بيضا؟',p=>!!p.gh,1,head('gh',{...base,sh:true,gh:true,hair:'none',sk:SKIN[2]})],
    ['لابسة حجاب؟',p=>p.hj,1,head('hj',{...fem,hj:true,hair:'none',hs:'none',hjc:'#3D5A80'})],['لابس كاب؟',p=>p.cap,1,head('cap',{...base,cap:true})],['أصلع؟',p=>p.hair==='bald',1,head('bald',{...base,hair:'bald',sk:SKIN[2]})],
    ['لابس نظارة؟',p=>p.gl,2,head('gl',{...base,gl:true,hs:'curly'})],['عنده لحية؟',p=>p.bd,2,head('bd',{...base,bd:true,mu:true,sm:false})],['عنده شنب؟',p=>p.mu,2,head('mu',{...base,mu:true,sm:false,hair:'brown'})],['لابسة حلق؟',p=>p.er,2,head('er',{...fem,hs:'bun',er:true})],
    ['شعره طويل؟',p=>p.hs==='long',3,head('long',{...fem,hair:'black'})],['شعره أسود؟',p=>p.hair==='black',3,head('hk',{...base,hs:'spiky'})],['شعره بني؟',p=>p.hair==='brown',3,head('hn',{...base,hair:'brown',hs:'curly'})],
    ['شعره أشقر؟',p=>p.hair==='blond',3,head('hy',{...fem,hair:'blond',hs:'bob'})],['شعره أحمر؟',p=>p.hair==='red',3,head('hr',{...fem,hair:'red',hs:'bob'})],['شعره رمادي؟',p=>p.hair==='gray',3,head('hg',{...base,hair:'gray',sk:SKIN[0]})],
    ...SHIRTS.map(([c,n])=>[`لابس ${n}؟`,p=>p.shn===n,4,sw(c)])];
  const deal=R=>{R=R||Math.random;const m=[],f=[];PEOPLE.forEach((p,k)=>(p.m?m:f).push(k));const sh=a=>shuffleR(R,a);return sh([...sh(m).slice(0,12),...sh(f).slice(0,12)]);};
  return {PEOPLE,QS,art,deal,head,sw,faceSVG};
})();
gsMake('guess',{hu:'هي',ttl:'شخصية',one:'الشخص',sec:'شخصيتك السرية',pre:'شخصيتك',it:GSP.PEOPLE,Q:GSP.QS.map(q=>q.slice(0,3)),cat:['الناس','الراس','الوجه','الشعر','اللبس'],
  qi:i=>GSP.QS[i][3],ci:k=>[GSP.QS[0][3],GSP.QS[3][3],GSP.QS[8][3],GSP.QS[12][3],GSP.QS[18][3]][k],art:GSP.art,deal:GSP.deal},
  {name:'خمّن الشخص',lbc:'#6E4C8B',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7B4FA0"/>${[[4,4,0],[36,4,1],[68,4,2],[4,36,3],[36,36,4],[68,36,6],[4,68,9],[36,68,10],[68,68,13]].map(([x,y,k])=>`<rect x="${x}" y="${y}" width="28.2" height="31" rx="4" fill="#fff"/><image x="${x}" y="${y}" width="28.2" height="31" href="data:image/svg+xml,${encodeURIComponent(GSP.faceSVG(GSP.PEOPLE[k]))}"/>`).join('')}</svg>`});
HELP.guess='لكل واحد شخصية سرية من الـ24 اللي على اللوحة. في دورك اختار سؤال (شماغ؟ نظارة؟ لون الشعر؟…) ويروح لكل الباقين، وكل واحد يجاوب عن شخصيته: الجواب لك أنت بس، والبطاقات اللي ما تنطبق تنقلب لحالها (أو اقلبها بنفسك لو قفلت «قلب تلقائي»). بعد الأجوبة تقدر تخمّن، أو تخلّص دورك. اضغط «عرفته!» واختار البطاقة: صح = نقاط (أكثر كل ما سألت أقل) وتقدر تخمّن غيره، غلط = يروح دورك وتنقص نقطة. أول واحد يعرف أسرار الكل تخلص اللعبة وياخذ +3، والأكثر نقاط يفوز. مع ثلاثة أو أكثر تقدرون تختارون «الكل ضد واحد»: كل جولة واحد عنده السر والباقين يسألونه بالدور، وأول واحد يعرفه ياخذ الجولة. مع الفرق: البطاقات والأجوبة مشتركة بينك وبين خويك، وتصوّتون على السؤال.';
/* ================= «خمّن الدولة»: the flags of the flags quiz (n-quiz2.js ZFL), and Pakistan drawn here =================
   facts (checked): A Arab League · G Gulf (GCC) · continent as/af/eu/am · C has a coast · M on the Mediterranean · I all islands ·
   P more than 100 million people · K capital has the country's name · flag colours r (red or maroon) g b k y w ·
   flag marks S star · H crescent · X cross · O circle or sun. Transcontinental countries (Turkey, Russia, Egypt) are left out. */
const GSC=(()=>{
  const PK=['باكستان',2,'s','gw',1500,1000,`<rect width="1500" height="1000" fill="#fff"/><rect x="375" width="1125" height="1000" fill="#01411C"/><circle cx="937.5" cy="500" r="300" fill="#fff"/><circle cx="986.1" cy="456.8" r="275" fill="#01411C"/>${zStar(1072,380.4,100,'#fff',-41.6)}`];
  const FL=n=>n==='باكستان'?PK:ZFL.find(f=>f[0]===n);
  const L=`السعودية:A G as C gw|الإمارات:A G as C rgwk|الكويت:A G as C K rgwk|قطر:A G as C rw|البحرين:A G as C I rw|الأردن:A as C rgwk S|فلسطين:A as C M rgwk|اليمن:A as C rwk|لبنان:A as C M rgw|تونس:A af C M K rw S H O|الجزائر:A af C M K rgw S H|المغرب:A af C M rg S|السودان:A af C rgwk|الصومال:A af C bw S|جيبوتي:A af C K rgbw S|اليابان:as C I P rw O|الصين:as C P ry S|الهند:as C P gbw O|باكستان:as C P gw S H|بنغلاديش:as C P rg O|إندونيسيا:as C I P rw|تايلاند:as C rbw|أمريكا:am C P rbw S|كوبا:am C I rbw S|تشيلي:am C rbw S|كولومبيا:am C rby|الأرجنتين:am C bwy O|بوليفيا:am rgy|بريطانيا:eu C I rbw X|فرنسا:eu C M rbw|إيطاليا:eu C M rgw|ألمانيا:eu C rky|سويسرا:eu rw X|اليونان:eu C M bw X|هولندا:eu C rbw|السويد:eu C by X|النرويج:eu C rbw X|الدنمارك:eu C rw X|فنلندا:eu C bw X|بولندا:eu C rw|أوكرانيا:eu C by|النمسا:eu rw|نيجيريا:af C P gw|غانا:af C rgky S|السنغال:af C rgy S|مالي:af rgy`;
  const it=L.split('|').map((r,k)=>{const [name,f]=r.split(':'),t=f.split(' ');const cols=t.find(x=>/^[rgbkyw]+$/.test(x)&&x!=='as')||'';
    return {name,t:new Set(t),c:cols,bg:GSX.BG[k%8]};}).filter(x=>FL(x.name));
  const has=(x,k)=>x.t.has(k),col=(x,c)=>x.c.includes(c);
  // the flag on a card: its own shape, inside a 50×34 box, with a thin edge so white parts show
  const ART={};const art=k=>ART[k]||(ART[k]=(()=>{const x=it[k],F=FL(x.name),vw=F[4],vh=F[5],ar=(F[7]||vw)/(F[8]||vh);let w=50,h=w/ar;if(h>34){h=34;w=h*ar;}
    const X=-w/2,Y=-6-h/2;return GSX.card(x.bg,`<rect x="${X+1.2}" y="${Y+2}" width="${w}" height="${h}" rx="2" fill="#17233A" opacity=".25"/><svg x="${X}" y="${Y}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none">${F[6]}</svg><rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="#17233A" stroke-opacity=".55" stroke-width="1"/><path d="M${X+2} ${Y+h+9}h${w-4}" stroke="#17233A" stroke-opacity=".12" stroke-width="3" stroke-linecap="round"/>`);})());
  const O=GSX.OL,s=GSX.s;
  const globe=c=>GSX.ic('#DDEFFC',`<circle r="8.5" fill="#4FA3D8"${s(1.3)}/><path d="${c}" fill="#3FAE5C"${s(1)}/>`);
  const flagI=(fill,mark)=>GSX.ic('#F4F6FA',`<path d="M-8 -8v17" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/><path d="M-7 -8h14v10h-14z" fill="${fill}"${s(1.3)}/>${mark||''}`);
  const I={
    arab:GSX.ic('#E3F5E6',`<path d="M-9 6h18M-6 6v-6h12v6M0 0v-7M-3 -4.5q3-3 6 0" fill="none"${s(1.4)}/><circle cy="-8.6" r="1.4" fill="${O}"/>`),
    gulf:GSX.ic('#DFF3F1',`<path d="M-10 6q3-2.4 5 0t5 0 5 0 5 0" fill="none" stroke="#2F7DB3" stroke-width="1.8" stroke-linecap="round"/><path d="M-1 4v-9M-1 -5q-4-2-7 1M-1 -5q4-2 7 1M-1 -5q-2-4-5-4M-1 -5q2-4 5-4" fill="none" stroke="#2C7151" stroke-width="1.6" stroke-linecap="round"/>`),
    as:globe('M-2 -8q6 0 9 3t-1 6q-3 0-4 3q-2-3-5-2t-2-5q1-4 3-5z'),af:globe('M-4 -7h6q4 2 3 6t-3 8q-2-2-2-5t-4-4q-2-3 0-5z'),eu:globe('M-6 -7q4-1 6 1t4 0 2 3q-3 2-6 1t-5 2q-3-2-1-7z'),am:globe('M-6 -8q4 0 4 4t-1 4q2 2 2 5t-2 3q-2-4-2-7t-3-5z'),
    sea:GSX.ic('#DDEFFC',`<path d="M-10 -1q2.5-2 5 0t5 0 5 0 5 0M-10 5q2.5-2 5 0t5 0 5 0 5 0" fill="none" stroke="#2F7DB3" stroke-width="1.8" stroke-linecap="round"/>`),
    med:GSX.ic('#DDEFFC',`<path d="M-11 -6q5 3 11 1t11 1v4q-6-2-11 0t-11-1z" fill="#4FA3D8"/><path d="M-11 4q6 2 11 0t11 0" fill="none" stroke="#C98F58" stroke-width="3"/>`),
    isl:GSX.ic('#DDEFFC',`<ellipse cy="5" rx="8" ry="3" fill="#EED3A8"${s(1.2)}/><path d="M0 4v-9M0 -5q-4-2-7 1M0 -5q4-2 7 1" fill="none" stroke="#2C7151" stroke-width="1.6" stroke-linecap="round"/>`),
    pop:GSX.ic('#FFF2C9',`${[-6,0,6].map(x=>`<circle cx="${x}" cy="-3" r="2.6" fill="#F2C29B"${s(1)}/><path d="M${x-4} 7q0-6 4-6t4 6z" fill="${['#EC6158','#4AB1E8','#3FAE5C'][(x+6)/6]}"${s(1)}/>`).join('')}`),
    cap:GSX.ic('#EEE6FB',`<path d="M-8 7h16M-6 7v-7M-2 7v-7M2 7v-7M6 7v-7M-8 0h16L0 -7z" fill="none"${s(1.3)}/>`),
    r:flagI('#E5534B'),g:flagI('#3FAE5C'),b:flagI('#3D8FD1'),k:flagI('#262B3D'),y:flagI('#F0B429'),w:flagI('#FFFFFF'),
    S:flagI('#3D8FD1',zStar(0,-3,4,'#fff')),H:flagI('#3FAE5C','<circle cy="-3" r="3.6" fill="#fff"/><circle cx="1.4" cy="-3.8" r="3" fill="#3FAE5C"/>'),X:flagI('#E5534B','<path d="M-7 -4.5h14M-2 -8v10" stroke="#fff" stroke-width="2.4"/>'),O:flagI('#fff','<circle cy="-3" r="3" fill="#E5534B"/>')};
  const Q=[['عربية؟',x=>has(x,'A'),0,I.arab],['خليجية؟',x=>has(x,'G'),0,I.gulf],['في آسيا؟',x=>has(x,'as'),0,I.as],['في أفريقيا؟',x=>has(x,'af'),0,I.af],['في أوروبا؟',x=>has(x,'eu'),0,I.eu],['في قارة أمريكا؟',x=>has(x,'am'),0,I.am],
    ['تطل على بحر؟',x=>has(x,'C'),0,I.sea],['على البحر المتوسط؟',x=>has(x,'M'),0,I.med],['كلها جزر؟',x=>has(x,'I'),0,I.isl],
    ['علمها فيه أحمر أو عنابي؟',x=>col(x,'r'),1,I.r],['علمها فيه أخضر؟',x=>col(x,'g'),1,I.g],['علمها فيه أزرق؟',x=>col(x,'b'),1,I.b],['علمها فيه أسود؟',x=>col(x,'k'),1,I.k],['علمها فيه أصفر؟',x=>col(x,'y'),1,I.y],['علمها فيه أبيض؟',x=>col(x,'w'),1,I.w],
    ['علمها فيه نجمة؟',x=>has(x,'S'),2,I.S],['علمها فيه هلال؟',x=>has(x,'H'),2,I.H],['علمها فيه صليب؟',x=>has(x,'X'),2,I.X],['علمها فيه دائرة أو شمس؟',x=>has(x,'O'),2,I.O],
    ['سكانها أكثر من 100 مليون؟',x=>has(x,'P'),3,I.pop],['عاصمتها نفس اسمها؟',x=>has(x,'K'),3,I.cap]];
  // a board with the region mixed: 9 Arab countries and 15 from the rest of the world
  const deal=R=>{R=R||Math.random;const a=[],o=[];it.forEach((x,k)=>(has(x,'A')?a:o).push(k));return shuffleR(R,[...shuffleR(R,a).slice(0,9),...shuffleR(R,o).slice(0,15)]);};
  return {it,Q,art,deal,I};
})();
gsMake('gs_country',{hu:'هي',ttl:'دولة',one:'الدولة',sec:'دولتك السرية',pre:'دولتك',it:GSC.it,Q:GSC.Q.map(q=>q.slice(0,3)),cat:['المكان','ألوان العلم','شكل العلم','معلومات'],
  qi:i=>GSC.Q[i][3],ci:k=>[GSC.I.as,GSC.I.r,GSC.I.S,GSC.I.pop][k],art:GSC.art,deal:GSC.deal},
  {name:'خمّن الدولة',lbc:'#2F6DB5',icon:GSX.icon('#2F6DB5',[0,22,29].map(k=>GSC.art(k)))});
HELP.gs_country='لكل واحد دولة سرية من الـ24 اللي على اللوحة (تشوف علمها). في دورك اختار سؤال (عربية؟ في آسيا؟ علمها فيه أحمر؟ تطل على بحر؟…) ويروح لكل الباقين، وكل واحد يجاوب عن دولته، والجواب لك بس. الأعلام اللي ما تنطبق تنقلب. بعد الأجوبة تقدر تخمّن أو تخلّص دورك: صح = نقاط (أكثر كل ما سألت أقل) وتقدر تخمّن غيره، غلط = يروح دورك وتنقص نقطة. أول واحد يعرف دول الكل ياخذ +3 وتخلص، والأكثر نقاط يفوز. مع ثلاثة أو أكثر فيه «الكل ضد واحد»: كل جولة واحد عنده الدولة والباقين يسألونه.';
/* ================= «خمّن الحيوان» =================
   facts (checked, kept to what is not in doubt): m mammal, b bird, r reptile, i insect · f flies, W wings, w lives in the sea and
   never leaves it, l four legs, 8 eight legs · e eats meat or other animals · g bigger than a person, t bigger than a bus ·
   d people raise it · o lays eggs · h horns · c a shell · s stripes · z black and white · and one marked trait each:
   k trunk, u tallest, y hump, x mane, p wool, q spines, n turns its head right round, v copies people's words, j barks.
   Each drawing is one template (<use>), so a card is three nodes. */
const GSA=(()=>{
  const O=GSX.OL,s=GSX.s,P=(d,f,w=1.6)=>`<path d="${d}" fill="${f}"${s(w)}/>`,C=(x,y,r,f,w=1.6)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${s(w)}/>`,
    E=(x,y,rx,ry,f,w=1.6,rot)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${s(w)}${rot?` transform="rotate(${rot} ${x} ${y})"`:''}/>`,
    L=(d,c=O,w=1.6)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    eye=(x,y,r=2.2)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${O}"/><circle cx="${x+r*.35}" cy="${y-r*.4}" r="${r*.35}" fill="#fff"/>`,
    eyes=(x,y,r)=>eye(-x,y,r)+eye(x,y,r);
  // a wavy ring (a mane, wool, a cloud)
  const ring=(cx,cy,r,n,a,f)=>{let d='';for(let k=0;k<=n;k++){const t=k/n*Math.PI*2,t2=(k+.5)/n*Math.PI*2;const x=cx+Math.cos(t)*r,y=cy+Math.sin(t)*r,qx=cx+Math.cos(t2)*(r+a),qy=cy+Math.sin(t2)*(r+a);
    d+=k?`Q${qx.toFixed(1)} ${qy.toFixed(1)} ${(cx+Math.cos((k+1)/n*Math.PI*2)*r).toFixed(1)} ${(cy+Math.sin((k+1)/n*Math.PI*2)*r).toFixed(1)}`:`M${x.toFixed(1)} ${y.toFixed(1)}`;}return P(d+'Z',f);};
  const spikes=(n)=>{let d='M-20 16';for(let k=0;k<n;k++){const t=Math.PI*(1-(k+.5)/n),t2=Math.PI*(1-(k+1)/n);d+=`L${(Math.cos(t)*24).toFixed(1)} ${(14-Math.sin(t)*22).toFixed(1)}L${(Math.cos(t2)*17).toFixed(1)} ${(14-Math.sin(t2)*16).toFixed(1)}`;}return d+'Z';};
  const A=[
    ['أسد','mlegx',ring(0,-2,17,13,4,'#C97A2B')+C(-9.6,-10,4,'#F6C453')+C(9.6,-10,4,'#F6C453')+C(0,0,12.4,'#F6C453')+E(0,7,6.6,4.8,'#FDE7B0',1.3)+P('M-2.6 3.6h5.2l-2.6 3z',O,1)+L('M0 6.6v1.6M0 8.2q-2.2 2.2-4 .4M0 8.2q2.2 2.2 4 .4',O,1.3)+eyes(4.8,-2)],
    ['نمر','mlegs',C(-11,-11,5,'#F28C28')+C(11,-11,5,'#F28C28')+C(-11,-11,2.4,'#FFD9B3',0)+C(11,-11,2.4,'#FFD9B3',0)+E(0,1,16,14,'#F28C28')+E(-5.6,7.4,6.6,4.8,'#fff',1.2)+E(5.6,7.4,6.6,4.8,'#fff',1.2)+L('M0 -12.6v5M-5 -12l1.4 4M5 -12l-1.4 4M-16 -2h5.4M-15.4 3h4.4M16 -2h-5.4M15.4 3h-4.4',O,2.2)+P('M-2.6 3.8h5.2l-2.6 3z','#E26B6B',1)+L('M0 6.8v1.4M0 8.2q-2 2-3.6.4M0 8.2q2 2 3.6.4',O,1.2)+eyes(5.4,-2)],
    ['فيل','mlgk',E(-15,-1,10.4,13,'#9FB0C3')+E(15,-1,10.4,13,'#9FB0C3')+E(-15.6,0,6,8.4,'#C9B6C6',0)+E(15.6,0,6,8.4,'#C9B6C6',0)+C(0,-5,12.4,'#AEBCCC')+P('M-4.6 2q-1.4 10 1.6 17q2.4 5 7 1.4q-2.4-2.6-1.6-6q.8-6 1.4-12.4z','#AEBCCC')+L('M-7 4q-3.4 5 .4 9M7 4q3.4 5-.4 9','#fff',2.4)+eyes(5,-6)],
    ['زرافة','mlghu',P('M-8 31l3-31h11l4 31z','#F2C14E')+P('M-6 6l5 1-1 6-5-2zM2 16l5-1 1 7-6 0zM-5 22l4 1v6h-5z','#C17A2E',1)+L('M-3 -22l-1.6-6M4 -22.6l1.4-6','#8A5A2B',2.4)+C(-4.8,-28.6,2.1,'#8A5A2B',1.2)+C(5.6,-29,2.1,'#8A5A2B',1.2)+E(-9.6,-18,5,2.4,'#F2C14E',1.3,-25)+E(0,-14,10,9,'#F2C14E')+E(5,-8,7.6,5.4,'#EBC08A',1.3)+C(3,-8.6,.9,O,0)+C(7.4,-8.6,.9,O,0)+eyes(4.2,-16,1.9)],
    ['حمار وحشي','mlgsz',P('M-4 -18l1-7 2.4 5 2-6 2 5 2.4-4 .6 7z','#262B3D',1.3)+E(-9,-14,3.2,7,'#fff',1.4,-25)+E(9,-14,3.2,7,'#fff',1.4,25)+E(0,0,10.6,17,'#fff')+L('M-10 -6q5 2 10 1M10 -6q-5 2-10 1M-10.4 0q5 2.4 10 1.6M10.4 0q-5 2.4-10 1.6M-6 -14q3 2 6 1.6M6 -14q-3 2-6 1.6',O,2.2)+E(0,11.6,8,6.4,'#3A3A46')+C(-3,11,1.2,'#fff',0)+C(3,11,1.2,'#fff',0)+eyes(5,-4)],
    ['دب','mleg',C(-11,-12,5,'#8B5A2B')+C(11,-12,5,'#8B5A2B')+C(-11,-12,2.4,'#C98F58',0)+C(11,-12,2.4,'#C98F58',0)+C(0,0,15,'#8B5A2B')+E(0,6,7.6,6,'#D6A77A',1.3)+E(0,3,3.2,2.2,O,0)+L('M0 5v2.6M0 7.6q-2.2 2-4 .4M0 7.6q2.2 2 4 .4',O,1.2)+eyes(6,-3)],
    ['جمل','mlgdy',L('M-15 8v18M-10 8v18M8 8v18M13 8v18',O,4.8)+L('M-15 8v18M-10 8v18M8 8v18M13 8v18','#C98F4E',2.6)+P('M-20 8q-1-8 5-11q2-10 9-9q4-7 11 0q5 1 6 8q1 7-4 9h-23q-4 0-4-5z','#D8A35D')+P('M13 1q6-1 8-13','none')+L('M14 2q6-2 7-14',O,7.4)+L('M14 2q6-2 7-14','#D8A35D',4.6)+E(23,-15,6.4,4.4,'#D8A35D',1.5,-10)+E(19.6,-19.4,1.8,2.6,'#D8A35D',1.1)+eye(24,-16.6,1.4)+L('M-20 6q-4 2-4 8',O,1.6)],
    ['حصان','mlgd',P('M9 -24q-14 2-19 15q-3 8-2 14q1 5 6 5q4 0 5-4l3-6q6 2 9 8l3 23h14l-3-28q-2-20-16-27z','#A0612F')+P('M9 -24q8 3 12 13q5 11 4 27h4q2-18-6-32q-6-9-14-8z','#4A2E1C',1.4)+P('M6 -23l3-8 3 7z','#A0612F',1.3)+eye(2,-10,2)+C(-10,3,1.2,O,0)+L('M-8 8q2 1 4 0',O,1.2)],
    ['ثور','mlghd',P('M-10 -12q-12-2-15-13q7 7 15 6zM10 -12q12-2 15-13q-7 7-15 6z','#F4EBDD',1.4)+E(-15,-5,5.4,3,'#8E5A3A',1.4,20)+E(15,-5,5.4,3,'#8E5A3A',1.4,-20)+P('M-11.4 -14h22.8q2 14-2 26q-3 6-9.4 6t-9.4-6q-4-12-2-26z','#8E5A3A')+P('M-4 -14h8l-1 7h-6z','#fff',0)+E(0,13,9.6,6.4,'#F0B8A0',1.4)+E(-3.6,13,1.4,2,O,0)+E(3.6,13,1.4,2,O,0)+eyes(5.4,-3)],
    ['ماعز','mlhd',L('M-5 -15q-6-10-13-8M5 -15q6-10 13-8','#A08A64',3.2)+E(-13,-7,6.4,2.6,'#EDE6DA',1.3,15)+E(13,-7,6.4,2.6,'#EDE6DA',1.3,-15)+P('M-9 -14q9-6 18 0q2 12-3 22q-2 4-6 4t-6-4q-5-10-3-22z','#EDE6DA')+P('M-3 13l3 10 3-10z','#C9BFAE',1.2)+E(0,8,3,1.8,'#D9A9A0',1)+eyes(4.6,-4)],
    ['خروف','mlpd',ring(0,-3,15,12,3.4,'#F7F3EA')+E(-12.6,-1,5.4,2.6,'#E3C29A',1.3,-20)+E(12.6,-1,5.4,2.6,'#E3C29A',1.3,20)+E(0,3,8.6,10.6,'#E3C29A')+ring(0,-8,5,7,1.6,'#F7F3EA')+E(0,9.6,2.6,1.6,'#B07A5A',0)+eyes(3.6,1,1.9)],
    ['قطة','mled',P('M-13.6 -5l-1-15 9.4 7zM13.6 -5l1-15-9.4 7z','#F2A33A')+P('M-12 -8l-.6-8 5 4zM12 -8l.6-8-5 4z','#F8C4B4',0)+E(0,2,15.4,13,'#F2A33A')+L('M0 -10v4M-4 -9.6l1 3.4M4 -9.6l-1 3.4','#C9741E',1.8)+E(0,7.6,6,4,'#FFF1DF',1.2)+P('M-1.8 4.6h3.6l-1.8 2z','#E8838F',.8)+L('M-7 7h-8M-7 9.4l-7 2M7 7h8M7 9.4l7 2',O,.9)+E(-6,0,2.6,3.2,'#86C96B',1)+E(6,0,2.6,3.2,'#86C96B',1)+E(-6,0,.8,2.6,O,0)+E(6,0,.8,2.6,O,0)],
    ['كلب','mledj',P('M-10.4 -10q-10 1-9 16q4 4 8-1z','#8B5A2B')+P('M10.4 -10q10 1 9 16q-4 4-8-1z','#8B5A2B')+E(0,0,12,13,'#E0B07A')+P('M-3 -12.6q3 6 6 0','#fff',0)+E(0,7.4,7.4,5.6,'#FFF1DF',1.3)+P('M-1.8 10.4q1.8 6.6 3.6 0z','#EC6158',1)+E(0,4.4,3.2,2.4,O,0)+eyes(5,-2)],
    ['أرنب','mld',E(-5.4,-16,3.8,11.6,'#EEE8F0',1.5,-10)+E(5.4,-16,3.8,11.6,'#EEE8F0',1.5,10)+E(-5.4,-16,1.6,8,'#F4B8C6',0,-10)+E(5.4,-16,1.6,8,'#F4B8C6',0,10)+C(0,4,12.6,'#EEE8F0')+E(-3,8,4,3,'#fff',0)+E(3,8,4,3,'#fff',0)+P('M-1.6 5.4h3.2l-1.6 1.8z','#E8838F',.8)+P('M-1.8 9.6h3.6v3.4h-3.6z','#fff',1)+L('M0 9.6v3.4',O,.8)+eyes(5,1)+C(-8.6,6,2,'#F4B8C6',0)+C(8.6,6,2,'#F4B8C6',0)],
    ['قنفذ','mleq',P(spikes(11),'#7A5A3A',1.5)+E(12,9,9,6.6,'#E8C9A0',1.5)+C(20.4,8,1.8,O,0)+eye(13,6.4,1.6)+E(-8,15.6,3,2,'#C9A27A',1.2)+E(6,15.6,3,2,'#C9A27A',1.2)],
    ['حوت','mwegt',P('M-26 5q2-15 21-15q14 0 19 10l7-7q3 7-2 11q5 2 5 9q-7-2-10-4q-6 8-20 8q-20 0-20-12z','#3D7FC2')+P('M-24 9q8 7 20 6q11-1 16-6q-6 10-18 10q-14 0-18-10z','#BFE0F5',1.2)+eye(-15,0,1.9)+L('M-22 6q4 3 8 1',O,1.2)+L('M-8 -13q-3-6-6-8M-8 -13v-9M-8 -13q3-6 6-8','#6CC4F2',2.2)],
    ['دلفين','mweg',P('M-26 10q6-18 24-20q14-2 24 6q2-4 4-3q-1 4-2 7q4 4 2 8q-6-3-10-2q-8 7-22 5q-10-1-14 5q-4-2-6-6z','#7FA7C9')+P('M-6 -11q2-8 8-10q-1 6 2 10z','#7FA7C9',1.4)+P('M-18 8q10 2 22-2q-4 8-16 8z','#E6F0F8',1)+eye(-14,1,1.8)+L('M-23 7q3 2 6 0',O,1.1)+L('M-26 26q5-3 10 0t10 0 10 0 10 0','#4FA3D8',2)],
    ['ثعلب','mlej',P('M-14.6 -4l-2.4-19 12 9zM14.6 -4l2.4-19-12 9z','#E8742E')+P('M-13 -8l-1.6-10 6 5zM13 -8l1.6-10-6 5z','#262B3D',0)+P('M-17 -7q17-9 34 0q-2 13-17 23q-15-10-17-23z','#E8742E')+P('M-17 -7q9 1 13 10l4 13q-14-9-17-23zM17 -7q-9 1-13 10l-4 13q14-9 17-23z','#FFF4E6',1.2)+E(0,14.4,2.6,2,O,0)+eyes(6,-1)],
    ['فرس النهر','mlg',C(-10,-15,3.4,'#8E80A3')+C(10,-15,3.4,'#8E80A3')+E(0,-6,13.6,11,'#9C8FB0')+E(0,9,16.4,10.6,'#B3A6C6')+E(-5.4,4,1.8,2.4,O,0)+E(5.4,4,1.8,2.4,O,0)+L('M-11 13q11 5 22 0',O,1.4)+P('M-7 13.6v3h3v-2.4zM7 13.6v3h-3v-2.4z','#fff',1)+eyes(6,-9)],
    ['وحيد القرن','mlgh',P('M22 -9q-6-13-21-9q-12 4-19 13q-2 7 2 10q8 5 20 3q13-1 17-7z','#9AA7B4')+P('M-14 3q-7-13-2-20q4 11 7 15z','#E8E1D4',1.4)+P('M-2 -4q-3-6 0-10q2 5 3 8z','#E8E1D4',1.2)+P('M12 -16l1-7 4 6z','#9AA7B4',1.3)+eye(4,-6,1.8)+L('M-14 7q3 1 6 0',O,1.2)],
    ['كوالا','ml',C(-14,-8,9,'#9FA9B5')+C(14,-8,9,'#9FA9B5')+C(-14,-8,5,'#F0E6EC',0)+C(14,-8,5,'#F0E6EC',0)+E(0,3,15,13,'#B4BDC8')+E(0,5,4.6,6.2,'#3B3F4A')+C(-1.4,2.4,1.1,'#fff',0)+eyes(7,0,1.9)],
    ['غزال','mlh',L('M-4 -12q-7-14-2-23M4 -12q7-14 2-23','#4A3424',2.8)+L('M-7.6 -20h3M-8 -25h3M7.6 -20h-3M8 -25h-3','#E8D2A8',1)+E(-11,-8,6.4,2.6,'#D9A066',1.3,15)+E(11,-8,6.4,2.6,'#D9A066',1.3,-15)+P('M-8 -12q8-4 16 0q0 17-5 24q-3 3-6 0q-5-7-5-24z','#D9A066')+L('M-3.4 -9l1.4 13M3.4 -9l-1.4 13','#FFF4E0',2)+E(0,12,3,2.2,O,0)+eyes(5,-5,2.4)],
    ['نسر','bfeWo',P('M-22 31q0-20 13-26h20q13 6 13 26z','#5A3A22')+P('M-13 6q-6-22 10-25q15-1 17 12l-4 6q-6 7-23 7z','#fff')+P('M12 -11q11 0 13 8q-2 7-8 5q2-5-5-5z','#F0B429',1.4)+eye(5,-10,1.9)+L('M1 -13.6l7 1.4',O,1.6)],
    ['صقر','bfeWod',P('M-20 31q-2-18 10-25h18q10 6 12 25z','#7A6A5A')+L('M-12 16l5 4M-14 24l5 4M12 16l-5 4M14 24l-5 4','#4E4236',1.4)+P('M-12 6q-6-20 8-25q13-2 17 10l-3 8q-6 7-22 7z','#8A7F75')+P('M-6 2q-4-10 2-14l6 2q-2 8-1 14z','#2F2A26',1)+P('M-3 8q8 0 12-4q-2 6-12 8z','#F4EBDD',1)+P('M13 -10q8 1 9 8q-2 5-6 3q1-5-3-4z','#4A4F5A',1.3)+C(12.6,-8.6,1.8,'#F0B429',0)+C(5,-10,3,'#F0B429',1.2)+eye(5,-10,1.6)],
    ['بومة','bfeWon',P('M-14 -14l-3-10 9 6zM14 -14l3-10-9 6z','#8A5A2B')+E(0,4,17,20,'#A0703F')+E(0,11,10,11,'#E8D2A8',1.2)+L('M-4 6l2 2 2-2M2 6l2 2 2-2M-2 12l2 2 2-2M-5 16l2 2 2-2M1 16l2 2 2-2','#A0703F',1.2)+C(-7,-5,7.4,'#F2E2C2')+C(7,-5,7.4,'#F2E2C2')+C(-7,-5,4.6,'#F0B429',1.2)+C(7,-5,4.6,'#F0B429',1.2)+eye(-7,-5,2.6)+eye(7,-5,2.6)+P('M-2 0h4l-2 4z','#E8742E',1)],
    ['ببغاء','bfWodv',P('M-12 31q-9-26 4-41q9-9 17-2q6 6 2 15l-8 4q2 13 9 24z','#3FAE5C')+P('M-8 31q-4-14 2-24q4 12 12 24z','#2F7DB3',1.3)+P('M-6 20q2-8 6-12q0 8 6 12z','#F0B429',1.2)+P('M9 -13q11-2 12 9q-4-2-7 0q-1-6-5-7z','#F4F1E8',1.4)+P('M10 -6q3 4 7 2q-3 4-7 1z','#3A3A46',1)+C(4,-15,4.2,'#fff',1.2)+eye(4.4,-15,1.8)+P('M-2 -18q4-6 10-4','none')],
    ['بطريق','beWoz',E(-14,8,4,11,'#262B3D',1.4,15)+E(14,8,4,11,'#262B3D',1.4,-15)+E(0,4,15,23,'#262B3D')+E(0,9,10.4,17,'#fff',1.2)+E(-5,-9,3.4,4,'#fff',0)+E(5,-9,3.4,4,'#fff',0)+eyes(5,-9,1.9)+P('M-3.4 -4h6.8l-3.4 5z','#F28C28',1.2)+E(-6,26.6,5,2.4,'#F28C28',1.2)+E(6,26.6,5,2.4,'#F28C28',1.2)],
    ['حمامة','bfWod',L('M-4 24v5M4 24v5','#E8838F',2.2)+P('M-24 6q5-14 21-12q4-11 13-9q7 2 7 9l5 2-5 3q0 6-6 8q3 12-12 15q-17 2-23-16z','#B7C0CC')+P('M-18 6q10-6 22-2q-4 10-16 10q-6-1-6-8z','#9AA4B2',1.3)+L('M-12 2l9 2M-12 7l8 1','#5F6B7A',1.6)+P('M6 -4q4 4 10 2q-2 5-8 4z','#7FC4A5',0)+C(12,-10,2.4,'#F28C28',1)+eye(12,-10,1.2)+P('M18 -7l5 1-5 2z','#5F6B7A',1)],
    ['تمساح','rlego',P('M-27 6q2-10 14-12q10-6 21-4q6 2 18 2q5 2 2 7q-10 2-20 4q-14 6-35 3z','#4E9A55')+P('M-27 6q15 4 35-1q10-2 20-4q-8 8-20 9q-20 3-35-4z','#9CCB7A',1.2)+L('M-20 7l2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3','#fff',1.4)+C(-6,-8,5,'#4E9A55')+eye(-6,-9,2)+C(24,-1,1,O,0)+L('M-10 -2q4 -1 6 0M2 -4q4-1 6 0','#2F6B37',1.4)],
    ['ثعبان','reo',L('M-16 24q-10-6 2-12t16-8q10-6-2-14q-6-4 2-8',O,9.4)+L('M-16 24q-10-6 2-12t16-8q10-6-2-14q-6-4 2-8','#6DBB4F',6.6)+L('M-12 15l2 2M2 6l2 2M8 -6l2 2','#3F8A35',1.6)+E(7,-15,6.6,4.8,'#6DBB4F',1.5,-15)+eyes(2.6,-16.4,1.5)+L('M13 -12l4 3m-2-1.6l1.4 3','#E5483F',1.2)],
    ['سلحفاة','rlco',E(-15,13,4.4,3.4,'#9CCB7A',1.4)+E(13,13,4.4,3.4,'#9CCB7A',1.4)+C(22,2,6,'#9CCB7A')+eye(23.6,0,1.6)+L('M24 5q-2 1.4-4 .6',O,1)+P('M-21 10q0-22 20-22t20 22z','#5DA457')+L('M-9 -9l-3 9 3 9h12l3-9-3-9zM-12 0h-8M-9 9l-4 1M3 9l4 1M6 0h8M-9 -9l-3-2M3 -9l3-2','#2F6B37',1.4)+P('M-23 10h43q0 4-4 4h-35q-4 0-4-4z','#8BC06A',1.4)],
    ['ضفدع','lelo',C(-10,-7,7,'#6BC25A')+C(10,-7,7,'#6BC25A')+E(0,8,20,14,'#6BC25A')+C(-10,-7,4.6,'#fff',1.2)+C(10,-7,4.6,'#fff',1.2)+eye(-10,-7,2.4)+eye(10,-7,2.4)+L('M-12 8q12 10 24 0',O,1.6)+C(-14,10,2.4,'#F4A0A0',0)+C(14,10,2.4,'#F4A0A0',0)+E(-10,22,6,2.6,'#5AAE4A',1.3)+E(10,22,6,2.6,'#5AAE4A',1.3)],
    ['نحلة','ifWdos',E(-6,-12,6.6,10,'#E8F4FD',1.3,-25)+E(6,-12,6.6,10,'#E8F4FD',1.3,25)+E(3,5,15,11,'#F5C431')+L('M-2 -5.6q-2.4 10.6 0 21.2M6 -5q-2.2 10 0 20',O,4.4)+P('M18 5l7 0-7 3z',O,1)+C(-13,3,7.4,'#262B3D')+`<circle cx="-16" cy="1" r="1.8" fill="#fff"/><circle cx="-10.6" cy="1" r="1.8" fill="#fff"/>`+L('M-16 -3q-3-7-7-7M-12 -4q0-7 3-9',O,1.3)+C(-23,-10,1.4,O,0)+C(-9,-13,1.4,O,0)],
    ['فراشة','ifWo',E(-11,-8,11.6,9,'#9C7BD6',1.5,-25)+E(11,-8,11.6,9,'#9C7BD6',1.5,25)+E(-9,9,8,7,'#F28CBB',1.5,20)+E(9,9,8,7,'#F28CBB',1.5,-20)+C(-12,-9,3,'#fff',0)+C(12,-9,3,'#fff',0)+C(-9,10,2,'#F0B429',0)+C(9,10,2,'#F0B429',0)+E(0,2,2.8,14,'#262B3D',1.2)+L('M-1 -11q-3-7-8-8M1 -11q3-7 8-8',O,1.3)],
    ['دعسوقة','ifWeo',L('M-17 2h-6M-17 9l-6 3M17 2h6M17 9l6 3M-14 -4l-6-3M14 -4l6-3',O,1.8)+C(0,-13,8,'#262B3D')+C(-3,-15,1.6,'#fff',0)+C(3,-15,1.6,'#fff',0)+C(0,4,17,'#E5483F')+L('M0 -13v34',O,1.6)+C(-7,-3,3.2,'#262B3D',0)+C(7,-3,3.2,'#262B3D',0)+C(-9,8,3,'#262B3D',0)+C(9,8,3,'#262B3D',0)+C(-4,15,2.4,'#262B3D',0)+C(4,15,2.4,'#262B3D',0)],
    ['عقرب','e8',L('M-6 -2l-12-4M-6 3l-13 1M-6 8l-12 5M-5 12l-9 9M6 -2l12-4M6 3l13 1M6 8l12 5M5 12l9 9','#9A6A34',2)+L('M-6 -8q-7-6-12-12M6 -8q7-6 12-12','#9A6A34',2.6)+P('M-20 -22q-5-2-6 3l5 1zM-18 -24q2-4 6-1l-4 3zM20 -22q5-2 6 3l-5 1zM18 -24q-2-4-6-1l4 3z','#C98F4E',1.2)+E(0,4,7,11,'#C98F4E')+L('M0 15q0 8 6 10q8 2 8-6q0-5-5-5',O,5.6)+L('M0 15q0 8 6 10q8 2 8-6q0-5-5-5','#C98F4E',3.4)+P('M9 14l-3-4 5 1z',O,.8)+eyes(2.4,-4,1.2)],
    ['عنكبوت','eo8',L('M0 -31v20',O,1)+L('M-6 0q-10-8-16-4l-3 6M-6 4q-12-2-17 4l-2 6M-6 8q-10 4-13 11l1 6M-4 11q-6 8-6 14l3 4M6 0q10-8 16-4l3 6M6 4q12-2 17 4l2 6M6 8q10 4 13 11l-1 6M4 11q6 8 6 14l-3 4',O,2.2)+C(0,8,10,'#3A3A4A')+C(0,-7,7,'#2F2F3A')+C(-2.6,-8,2,'#fff',0)+C(2.6,-8,2,'#fff',0)+C(-2.4,-8,1,O,0)+C(2.8,-8,1,O,0)],
    ['حلزون','co',P('M-26 18q4-7 14-7h26q5 0 5 4t-5 5h-36q-4 0-4-2z','#B9D27A')+L('M-18 11l-4-10M-14 11l-1-11','#8FAE55',1.6)+C(-22,0,2,'#3A3A46',0)+C(-15,-1,2,'#3A3A46',0)+C(5,0,13,'#E8A25A')+L('M5 0q4-1 3 3t-6 1q-4-4 0-8t10 0q4 6-1 12',O,1.6)]];
  const has=(a,k)=>a.f.includes(k);
  const it=A.map(([name,f,art],k)=>{GSX.add({['an'+k]:art});return {name,f,bg:GSX.BG[k%8]};});
  const art=k=>GSX.card(it[k].bg,GSX.u('an'+k));
  const mini=(k,bg)=>GSX.ic(bg||'#F4F6FA',GSX.u('an'+k,'transform="scale(.36)"'));
  const N=n=>A.findIndex(a=>a[0]===n);
  const Q=[['ثديي؟','m',0,'أسد'],['طائر؟','b',0,'ببغاء'],['زاحف؟','r',0,'تمساح'],['حشرة؟','i',0,'نحلة'],
    ['يطير؟','f',1,'حمامة'],['عنده جناحين؟','W',1,'فراشة'],['يعيش في البحر وما يطلع منه؟','w',1,'دلفين'],['عنده أربع أرجل؟','l',1,'حصان'],['عنده ثمان أرجل؟','8',1,'عنكبوت'],
    ['ياكل لحم أو حيوانات؟','e',2,'ثعلب'],['أكبر من الإنسان؟','g',2,'دب'],['أكبر من الباص؟','t',2,'حوت'],['الناس يربّونه؟','d',2,'خروف'],['يبيض؟','o',2,'بطريق'],
    ['له قرون؟','h',3,'ثور'],['له صدفة أو درع؟','c',3,'سلحفاة'],['جسمه مخطط؟','s',3,'نمر'],['لونه أبيض وأسود؟','z',3,'حمار وحشي'],
    ['له خرطوم؟','k',4,'فيل'],['أطول حيوان بالعالم؟','u',4,'زرافة'],['عنده سنام؟','y',4,'جمل'],['له لبدة حول راسه؟','x',4,'أسد'],['جسمه صوف؟','p',4,'خروف'],['جسمه شوك؟','q',4,'قنفذ'],
    ['يلف راسه لورا؟','n',4,'بومة'],['يقلّد كلام الناس؟','v',4,'ببغاء'],['ينبح؟','j',4,'كلب']].map(([t,k,c,ic])=>[t,a=>has(a,k),c,mini(N(ic),GSX.BG[(N(ic)+2)%8])]);
  const deal=R=>shuffleR(R||Math.random,[...it.keys()]).slice(0,GSN);
  return {it,Q,art,deal,mini,N};
})();
gsMake('gs_animal',{ttl:'حيوان',one:'الحيوان',sec:'حيوانك السري',pre:'حيوانك',it:GSA.it,Q:GSA.Q.map(q=>q.slice(0,3)),cat:['النوع','الجسم والحركة','الأكل والحجم','الشكل','علامة مميزة'],
  qi:i=>GSA.Q[i][3],ci:k=>GSA.Q[[0,7,9,14,18][k]][3],art:GSA.art,deal:GSA.deal},
  {name:'خمّن الحيوان',lbc:'#3E8A4F',icon:GSX.icon('#3E8A4F',[0,26,2].map(k=>GSA.art(k)))});
HELP.gs_animal='لكل واحد حيوان سري من الـ24 اللي على اللوحة. في دورك اختار سؤال (ثديي؟ يطير؟ ياكل لحم؟ له قرون؟…) ويروح لكل الباقين، وكل واحد يجاوب عن حيوانه، والجواب لك بس. البطاقات اللي ما تنطبق تنقلب. بعد الأجوبة تقدر تخمّن أو تخلّص دورك: صح = نقاط (أكثر كل ما سألت أقل) وتقدر تخمّن غيره، غلط = يروح دورك وتنقص نقطة. أول واحد يعرف حيوانات الكل ياخذ +3 وتخلص، والأكثر نقاط يفوز. مع ثلاثة أو أكثر فيه «الكل ضد واحد»: كل جولة واحد عنده الحيوان والباقين يسألونه.';
/* ================= «خمّن المعلم»: simple original line drawings (no holy sites) =================
   facts (checked): SA in Saudi Arabia · AR in an Arab country · continent as/af/eu/am (Sydney is in none of the four) ·
   T tower or skyscraper · H taller than 300 m · D a dome · B a bridge · S a statue · R carved in rock · F palace, castle, fort or wall ·
   U built of mud brick · Y a theatre or a stadium · I in the sea or on an island · N made by nature · K a clock · P a pyramid ·
   built: A more than 1000 years ago, E before 1800, L after 1950 (natural places are not built). */
const GSL=(()=>{
  const O=GSX.OL,s=GSX.s,P=(d,f,w=1.5)=>`<path d="${d}" fill="${f}"${s(w)}/>`,C=(x,y,r,f,w=1.4)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${s(w)}/>`,
    L=(d,c=O,w=1.4)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    R=(x,y,w,h,f,sw=1.4)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${s(sw)}/>`;
  const sand=P('M-30 22q15-3 30 0t30 0v9h-60z','#E8C98E',1.2),grass=P('M-30 22q15-3 30 0t30 0v9h-60z','#9CCB7A',1.2),city=P('M-30 23h60v8h-60z','#C9D3DE',1.2),
    water=P('M-30 21q5-2 10 0t10 0 10 0 10 0 10 0 10 0v10h-60z','#7CC0EA',1.2),glass='#BFD9EE',mud='#D9B27C',stone='#E3D3B2';
  const A=[
    ['برج المملكة','SA AR as T H L',city+P('M-11 23L-5 -28L-1.4 -6Q0 -4.4 1.4 -6L5 -28L11 23z',glass)+L('M-3.4 -14.6h6.8',O,2.4)+L('M-6.8 4h13.6M-7.8 12h15.6M-5.4 -6h3M2.4 -6h3',O,.9)],
    ['برج الفيصلية','SA AR as T L',city+P('M-10 23L-2.4 -17h4.8L10 23z',glass)+C(0,-14,4.4,'#F0B429')+L('M0 -18.4V-30',O,1.4)+L('M-7 10h14M-5 0h10M-3.6 -8h7.2',O,.9)],
    ['قصر المصمك','SA AR as F U',sand+R(-20,-2,40,25,mud)+P('M-26 23v-25q3-3 6 0v25zM20 23v-25q3-3 6 0v25z',mud)+L('M-17 -2l2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4',O,1.1)+L('M-26 -2l1.5-3 1.5 3 1.5-3 1.5 3M20 -2l1.5-3 1.5 3 1.5-3 1.5 3',O,1)+P('M-5 23v-12q5-4 10 0v12z','#8A5A2B',1.3)+L('M-14 6h3M11 6h3M-23 4v3M23 4v3',O,1.6)],
    ['مدائن صالح','SA AR as A E R',sand+P('M-24 23q-4-30 6-42q10-6 18 0q10 10 4 42z','#D9A066')+P('M-11 23V-2h22V23z','#E7B985',1.3)+L('M-11 -2l2.6-3 2.6 3 2.6-3 2.6 3 2.6-3 2.6 3 2.6-3 2.6 3',O,1.1)+L('M-11 3h22',O,1.1)+P('M-4 23v-11h8v11z','#7A4A2A',1.2)+L('M-8 6v17M8 6v17',O,1)],
    ['الدرعية','SA AR as F U E',sand+R(-26,4,18,19,mud)+R(-10,-8,22,31,'#E3C08C')+R(12,-2,14,25,mud)+L('M-10 -8l2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3',O,1)+L('M-26 4l2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3',O,1)+P('M-3 -2l3-3 3 3v6h-6z','#fff',1)+L('M-21 12v3M-15 12v3M17 6v3M21 6v3M-4 10v4M4 10v4',O,1.6)],
    ['مرايا','SA AR as Y L',P('M-30 23q4-18 10-20t4 20zM30 23q-4-20-10-22t-4 22z','#C98A4E')+R(-17,-6,34,29,'#CFE6F5')+P('M-17 12l8-6 6 4 7-8 7 6 6-3v18h-34z','#E8B985',0)+L('M-17 -6h34M-17 23h34',O,1.2)+L('M-17 -6v29M17 -6v29',O,1.4)+sand.replace('M-30 22','M-30 24')],
    ['صخرة الفيل','SA AR as N',sand+P('M-22 23q-4-22 6-32q14-8 22 4q4 8 2 16l-2 12h-6l-1-8q-4-2-6 0v8z','#C98A4E')+P('M-1 23v-7q3-3 6 0v7z','#E8C98E',1.2)+L('M-14 -2q4 4 8 2',O,1)],
    ['برج خليفة','AR as T H L',city+P('M-9 23L-6.6 2L-4.4 -8L-2.4 -18L-1 -26L0 -31L1 -26L2.4 -18L4.4 -8L6.6 2L9 23z',glass)+L('M-6.6 2h13.2M-4.4 -8h8.8M-2.4 -18h4.8M0 23V-28',O,.9)],
    ['برج العرب','AR as T H I L',water+P('M-14 21q4-4 14-4t14 4z','#E8C98E',1.2)+P('M-8 18V-28q18 14 14 46z','#fff')+L('M-8 -28q-2 22 0 46M-8 -20q8 4 12 10M-8 -8q10 4 13 12M-8 4q10 3 13 10',O,.9)+P('M-8 -10h-6v2h6z','#F0B429',1)+L('M-8 18V-28',O,2)],
    ['أبراج الكويت','AR as T L',water+L('M-6 20V-29M8 20V-14M-16 20V-6',O,2.4)+C(-6,-14,6,'#3D8FD1')+C(-6,-24,3.6,'#3D8FD1')+C(8,-6,5,'#3D8FD1')+L('M-11 -14h10M-9.6 -24h7.2M3 -6h10','#9FD0F0',1)+L('M-16 20V-6',O,1.8)],
    ['اللوفر أبوظبي','AR as D L',water+R(-18,6,10,14,'#fff')+R(-6,4,12,16,'#fff')+R(8,8,10,12,'#fff')+P('M-27 4q27-22 54 0q-27-6-54 0z','#D6E2EE')+L('M-18 -1l4-4M-10 -5l4-3M-2 -7l4-1M6 -6l4 2M14 -3l4 3M-14 2l4-6M-6 -2l4-5M2 -4l4-3M10 -2l4-3',O,.7)],
    ['الأهرامات','AR af A E P',sand+P('M-26 23L-10 -6L6 23z','#E3B877')+P('M-10 -6L6 23H-2z','#C99A55',1)+P('M2 23L16 -14L30 23z','#E8C188')+P('M16 -14L30 23h-8z','#CFA265',1)],
    ['أبو الهول','AR af A E S',sand+P('M-26 23v-8q0-6 8-6h22q6 0 8 6v8z','#E3B877')+P('M8 9V-8q0-8 8-8t8 8V9z','#E3B877')+L('M9 -6l-3 10M23 -6l3 10M10 -2l-3 6M22 -2l3 6','#3D5A80',1.6)+C(16,-6,4.6,'#E8C188',1.2)+L('M14 -7h1M17 -7h1M15 -4h2',O,1)+L('M-26 23h-2M-12 14h10',O,1.2)],
    ['البتراء','AR as A E R',P('M-30 -31h60v62h-60z','#E59A86',0)+P('M-30 -31q6 20 2 54h56q-4-30 2-54z','#D8806C',0)+R(-17,-4,34,27,'#F1B3A0')+P('M-17 -4l17-10 17 10z','#F1B3A0')+R(-6,-24,12,10,'#F1B3A0')+P('M-7 -24q7-6 14 0z','#F1B3A0',1.2)+L('M-14 -2v25M-7 -2v25M7 -2v25M14 -2v25M-4 -22v8M4 -22v8',O,1.1)+P('M-3.4 23v-12h6.8v12z','#7A4A3A',1.2)],
    ['برج القاهرة','AR af T L',city+P('M-3.6 23V-14h7.2V23z','#E3C08C')+L('M-3.6 -10l7.2 6M3.6 -10l-7.2 6M-3.6 0l7.2 6M3.6 0l-7.2 6M-3.6 10l7.2 6M3.6 10l-7.2 6',O,.8)+P('M-7 -14q7-10 14 0z','#E3C08C')+L('M0 -20v-9',O,1.4)+L('M-30 23q8-2 14 0',O,1)],
    ['سور الصين','as A E F',P('M-30 20q10-20 22-12t18-6 20 2v27h-60z','#8FBF6A',1.2)+P('M-30 14q10-14 20-8t20-8 20 6v6q-10-6-20-4t-20 8-20 6z','#C9B79A')+L('M-28 11l1-3 2 2 1-3 2 2 1-3M-8 2l1-3 2 2 1-3 2 2M12 -4l1-3 2 2 1-3 2 2',O,1)+R(-2,-14,10,14,'#D6C7AA')+L('M-2 -14l2-3 2 3 2-3 2 3',O,1)+R(1,-8,4,5,'#7A5A3A',1)],
    ['تاج محل','as D E',P('M-30 23h60v8h-60z','#D6E2EE',1.2)+R(-22,6,44,17,'#fff')+P('M-11 6q-2-12 5-17q6-4 6-9q0 5 6 9q7 5 5 17z','#fff')+L('M0 -20v-5',O,1.2)+P('M-6 23v-11q6-6 12 0v11z','#E3E8F2',1.2)+L('M-26 23V-6M26 23V-6M-18 6v-6M18 6v-6',O,2.6)+L('M-26 23V-6M26 23V-6',"#fff",1)+C(-26,-7,1.8,'#fff',1.1)+C(26,-7,1.8,'#fff',1.1)+P('M-21 6q0-5 3-7q3 2 3 7zM15 6q0-5 3-7q3 2 3 7z','#fff',1.1)],
    ['أبراج بتروناس','as T H L',city+P('M-15 23V-14l3-6 3 6V23z',glass)+P('M9 23V-14l3-6 3 6V23z',glass)+L('M-12 -20v-9M12 -20v-9',O,1.2)+R(-9,-2,18,3,'#9FB3C8',1.1)+L('M-15 -6h6M-15 4h6M-15 14h6M9 -6h6M9 4h6M9 14h6',O,.8)],
    ['جبل فوجي','as H N',P('M-30 23L-6 -14q6-4 12 0L30 23z','#6E8CB5')+P('M-6 -14q6-4 12 0l6 9q-4-2-6 1q-3-3-6 0q-3-3-6 0q-2-3-6-1z','#fff',1.2)+grass],
    ['برج إيفل','eu T H',city+P('M-14 23Q-6 4 -2 -24h4Q6 4 14 23h-6q-2-10-8-10t-8 10z','#B07A4E')+L('M-9 4h18M-5 -10h10M0 -24v-6',O,1.6)+L('M-6 10l12-8M6 10l-12-8M-4 -4l8-6M4 -4l-8-6',O,.7)],
    ['برج بيزا المائل','eu T E',grass+`<g transform="rotate(7 0 23)">${R(-7,-24,14,47,'#F4F1E8')}${L('M-7 -16h14M-7 -8h14M-7 0h14M-7 8h14M-7 16h14',O,1)}${L('M-4 -14v4M0 -14v4M4 -14v4M-4 -6v4M0 -6v4M4 -6v4M-4 2v4M0 2v4M4 2v4M-4 10v4M0 10v4M4 10v4',O,1)}${R(-5,-29,10,5,'#F4F1E8')}</g>`],
    ['الكولوسيوم','eu A E Y',city+P('M-27 23V-2q10-8 27-8t27 8V23z','#E3C08C')+P('M8 -9q12 2 19 7V23H8z','#D6AE76',1.2)+L('M-27 6h54M-27 14h54',O,1)+L('M-22 23v-4q2-3 4 0v4M-14 23v-4q2-3 4 0v4M-6 23v-4q2-3 4 0v4M2 23v-4q2-3 4 0v4M10 23v-4q2-3 4 0v4M18 23v-4q2-3 4 0v4M-22 14v-4q2-3 4 0v4M-14 14v-4q2-3 4 0v4M-6 14v-4q2-3 4 0v4M2 14v-4q2-3 4 0v4M10 14v-4q2-3 4 0v4M18 14v-4q2-3 4 0v4M-22 6v-4q2-3 4 0v4M-14 6v-4q2-3 4 0v4M-6 6v-4q2-3 4 0v4',O,.9)],
    ['ساعة بيغ بن','eu T K',city+R(-7,-14,14,37,'#D9B27C')+P('M-8 -14l8-10 8 10z','#5F7590')+L('M0 -24v-6',O,1.4)+C(0,-6,5.4,'#fff',1.3)+L('M0 -6v-3.4M0 -6l2.4 1.4',O,1.2)+L('M-4 4v15M0 4v15M4 4v15',O,1)],
    ['جسر البرج','eu B',water+R(-24,-16,10,36,'#C9B79A')+R(14,-16,10,36,'#C9B79A')+P('M-25 -16l6-8 6 8zM13 -16l6-8 6 8z','#5F7590')+R(-14,-12,28,4,'#3D8FD1',1.2)+P('M-14 6h12l2-4 2 4h12v4h-28z','#3D8FD1',1.2)+L('M-30 4h6M24 4h6',O,1.4)+L('M-21 -8v3M-17 -8v3M17 -8v3M21 -8v3',O,1.4)],
    ['ستونهنج','eu A E',grass+R(-26,-4,8,26,'#A8A49A')+R(-10,-4,8,26,'#A8A49A')+R(-28,-10,28,6,'#B8B4AA')+R(6,-2,8,24,'#A8A49A')+R(19,4,8,18,'#A8A49A')+R(4,-8,24,6,'#B8B4AA')],
    ['قلعة نويشفانشتاين','eu F',P('M-30 23q10-14 30-14t30 14v8h-60z','#7FA86A',1.2)+R(-16,-4,26,18,'#F4F1E8')+R(10,-14,8,28,'#F4F1E8')+R(-22,0,7,14,'#F4F1E8')+P('M9 -14l5-14 5 14zM-23 0l4-10 4 10zM-12 -4l3-8 3 8zM0 -4l3-8 3 8z','#3D6FB0')+L('M13 -6v4M-19 4v3M-8 2v4M4 2v4',O,1.4)],
    ['قوس النصر','eu',city+P('M-20 23V-16h40V23H8V8q0-8-8-8t-8 8V23z','#E8DCC4')+R(-22,-22,44,6,'#E8DCC4')+L('M-20 -10h40',O,1)+L('M-16 -4h6M10 -4h6',O,1.2)],
    ['تمثال الحرية','am S I',water+R(-9,8,18,13,'#C9B79A')+P('M-6 8l1-20q-2-6 5-6t5 6l1 20z','#7FC4A5')+C(0,-16,3.6,'#7FC4A5',1.2)+L('M-4 -19l-2-4M0 -20v-4M4 -19l2-4',O,1.2)+L('M3 -10l5-14',O,2.6)+L('M3 -10l5-14','#7FC4A5',1.4)+P('M6 -24h4l-2-5z','#F0B429',1.1)+P('M-6 -2h-3v4h3z','#7FC4A5',1.1)],
    ['جسر البوابة الذهبية','am B',water+L('M-30 6h60',O,3.8)+L('M-30 6h60','#D9533E',2)+R(-17,-24,5,45,'#D9533E',1.2)+R(12,-24,5,45,'#D9533E',1.2)+L('M-30 -2q8 6 15-20q15 30 30 0q7 26 15 20',O,1.2)+L('M-8 -6v12M0 -4v10M8 -6v12M-24 2v4M24 2v4',O,.8)],
    ['إمباير ستيت','am T H',city+P('M-10 23V-2h3v-10h3v-8h2v-6h4v6h2v8h3v10h3V23z','#D6CDB8')+L('M0 -26v-5',O,1.4)+L('M-4 0v20M0 -10v30M4 0v20',O,.9)],
    ['برج سي إن','am T H L',city+P('M-3.4 23l1.6-38h3.6l1.6 38z','#D6E2EE')+P('M-6 -15h12l-2 5h-8z','#9FB3C8')+C(0,-21,2.6,'#D6E2EE',1.2)+L('M0 -23.6V-31',O,1.4)+L('M-6 23l4-14M6 23l-4-14',O,1.2)],
    ['شلالات نياغارا','am N',P('M-30 -8q15-4 30 0t30 0v6h-60z','#7FA86A',1.2)+P('M-30 -2h60v12h-60z','#9FD3F2',1.2)+L('M-24 -1v10M-16 -1v11M-8 -1v10M0 -1v11M8 -1v10M16 -1v11M24 -1v10','#fff',1.4)+water+C(-14,14,4,'#fff',0)+C(-4,13,5,'#fff',0)+C(8,14,4,'#fff',0)],
    ['ماتشو بيتشو','am E',P('M-30 23L-4 -10q4-12 8 0l6 -6q6-10 12 4L30 23z','#6FAE5C')+P('M-24 23v-6h48v6zM-20 17v-5h40v5zM-16 12v-4h32v4z','#C9B79A',1.1)+L('M-12 12v-4M-4 12v-4M4 12v-4M12 12v-4',O,.9)],
    ['أوبرا سيدني','Y L',water+R(-26,12,52,7,'#E8DCC4',1.2)+P('M-22 12q2-18 14-24q-2 14 2 24z','#fff')+P('M-10 12q2-20 16-27q-3 16 2 27z','#fff')+P('M4 12q3-16 14-20q-2 12 2 20z','#fff')+L('M-20 6l8 6M-7 2l10 10M7 4l8 8','#C9D3DE',1)]];
  const it=A.map(([name,f,art],k)=>{GSX.add({['ln'+k]:art});return {name,t:new Set(f.split(' ')),bg:['#DDEFFC','#FFF2C9','#E3F5E6','#FDE3E1','#EEE6FB','#DFF3F1'][k%6]};});
  const art=k=>GSX.card(it[k].bg,GSX.u('ln'+k));
  const N=n=>A.findIndex(a=>a[0]===n);
  const mini=k=>GSX.ic(it[k].bg,GSX.u('ln'+k,'transform="scale(.38)"'));
  const g=(i,c)=>GSX.ic('#DDEFFC',`<circle r="8.5" fill="#4FA3D8"${s(1.3)}/><path d="${c}" fill="#3FAE5C"${s(1)}/>`);
  const Q=[['في السعودية؟','SA',0,mini(N('قصر المصمك'))],['في دولة عربية؟','AR',0,mini(N('الأهرامات'))],['في آسيا؟','as',0,g(0,'M-2 -8q6 0 9 3t-1 6q-3 0-4 3q-2-3-5-2t-2-5q1-4 3-5z')],['في أفريقيا؟','af',0,g(0,'M-4 -7h6q4 2 3 6t-3 8q-2-2-2-5t-4-4q-2-3 0-5z')],['في أوروبا؟','eu',0,g(0,'M-6 -7q4-1 6 1t4 0 2 3q-3 2-6 1t-5 2q-3-2-1-7z')],['في قارة أمريكا؟','am',0,g(0,'M-6 -8q4 0 4 4t-1 4q2 2 2 5t-2 3q-2-4-2-7t-3-5z')],
    ['برج أو ناطحة سحاب؟','T',1,mini(N('برج خليفة'))],['أطول من 300 متر؟','H',1,mini(N('برج سي إن'))],['فيه قبة؟','D',1,mini(N('تاج محل'))],['جسر؟','B',1,mini(N('جسر البوابة الذهبية'))],['تمثال؟','S',1,mini(N('تمثال الحرية'))],['قصر أو قلعة أو سور؟','F',1,mini(N('قلعة نويشفانشتاين'))],['شكله هرم؟','P',1,mini(N('الأهرامات'))],['فيه ساعة؟','K',1,mini(N('ساعة بيغ بن'))],
    ['منحوت في الصخر؟','R',2,mini(N('البتراء'))],['مبني بالطين؟','U',2,mini(N('الدرعية'))],['مسرح أو ملعب؟','Y',2,mini(N('الكولوسيوم'))],['في البحر أو على جزيرة؟','I',2,mini(N('برج العرب'))],['من صنع الطبيعة؟','N',2,mini(N('جبل فوجي'))],
    ['عمره أكثر من ألف سنة؟','A',3,mini(N('ستونهنج'))],['انبنى قبل سنة 1800؟','E',3,mini(N('برج بيزا المائل'))],['انبنى بعد سنة 1950؟','L',3,mini(N('برج المملكة'))]].map(([t,k,c,ic])=>[t,x=>x.t.has(k),c,ic]);
  const deal=R=>{R=R||Math.random;const a=[],o=[];it.forEach((x,k)=>(x.t.has('AR')?a:o).push(k));return shuffleR(R,[...shuffleR(R,a).slice(0,10),...shuffleR(R,o).slice(0,14)]);};
  return {it,Q,art,deal};
})();
gsMake('gs_land',{ttl:'معلم',one:'المعلم',sec:'معلمك السري',pre:'معلمك',it:GSL.it,Q:GSL.Q.map(q=>q.slice(0,3)),cat:['المكان','الشكل','من إيش','العمر'],
  qi:i=>GSL.Q[i][3],ci:k=>GSL.Q[[2,6,14,19][k]][3],art:GSL.art,deal:GSL.deal},
  {name:'خمّن المعلم',lbc:'#B5762F',icon:GSX.icon('#B5762F',[0,11,19].map(k=>GSL.art(k)))});
HELP.gs_land='لكل واحد معلم سري من الـ24 اللي على اللوحة (أبراج وقصور وآثار وأماكن طبيعية من السعودية والعالم). في دورك اختار سؤال (في السعودية؟ برج؟ عمره أكثر من ألف سنة؟…) ويروح لكل الباقين، وكل واحد يجاوب عن معلمه، والجواب لك بس. البطاقات اللي ما تنطبق تنقلب. بعد الأجوبة تقدر تخمّن أو تخلّص دورك: صح = نقاط (أكثر كل ما سألت أقل) وتقدر تخمّن غيره، غلط = يروح دورك وتنقص نقطة. أول واحد يعرف معالم الكل ياخذ +3 وتخلص، والأكثر نقاط يفوز. مع ثلاثة أو أكثر فيه «الكل ضد واحد».';
/* ================= «خمّن الأكلة» =================
   facts are the usual home recipe of each dish, kept to what is not in doubt: R rice · W sweet · A from the Arabian Peninsula ·
   F fried in oil · M meat, chicken or fish · B bread or dough · C cheese · D dates · K eaten cold · Y syrup or honey · O baked in
   an oven · T tomato · N milk or laban · L small balls · Z round dough discs. (Kabsa: rice, meat, tomato; mandi: rice and meat, no
   tomato; saleeg: rice cooked in milk with chicken; jareesh: wheat in laban with meat; harees: wheat and meat; mutabbaq: meat and
   egg in fried dough; hneini: brown bread, dates and ghee; masoub: bread, banana, honey; samosa: the meat one; shawarma: chicken.) */
const GSF=(()=>{
  const O=GSX.OL,s=GSX.s,P=(d,f,w=1.5)=>`<path d="${d}" fill="${f}"${s(w)}/>`,C=(x,y,r,f,w=1.4)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${s(w)}/>`,
    E=(x,y,rx,ry,f,w=1.5,rot)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${s(w)}${rot?` transform="rotate(${rot} ${x} ${y})"`:''}/>`,
    L=(d,c=O,w=1.4)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    dots=(pts,c,r=1)=>pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
  const plate=E(0,16,27,9,'#fff')+E(0,15,21,6,'#EEF2F6',1),bowl=c=>P('M-22 2h44q-2 22-22 22t-22-22z','#F4F6FA')+E(0,2,22,6,c),pot=c=>P('M-22 0h44v14q0 10-10 10h-24q-10 0-10-10z','#7A8796')+E(0,0,22,6,c)+L('M-26 4h4M22 4h4',O,2.6),
    mound=c=>P('M-20 15q2-20 20-20t20 20z',c),grains=c=>dots([[-10,8],[-4,4],[3,6],[9,10],[-7,12],[6,1],[13,13],[-14,13],[0,11]],c,.9),
    leg=(x,y,c='#C9783A')=>`<g transform="translate(${x} ${y}) rotate(-25)">${P('M-8 -5q-4 5 0 10q7 3 13-1l7-1q3 2 4-1t-2-4q1-3-2-3t-3 2l-7-2q-6-3-10 0z',c,1.4)}</g>`,
    ball=(x,y,r,c)=>C(x,y,r,c)+`<circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.3}" fill="#fff" opacity=".45"/>`;
  const A=[
    ['كبسة','RAMT',plate+mound('#E39B4A')+grains('#F6C77F')+leg(2,-4)+dots([[-12,8],[12,9]],'#3FAE5C',1.6)+dots([[-6,6],[8,4]],'#F4EBDD',1.2)],
    ['مندي','RAM',plate+mound('#F4E3B5')+grains('#E8B04A')+P('M-12 -2q2-10 12-10q12 0 12 10q-2 5-12 5t-12-5z','#A0612F',1.4)+L('M-6 -6q6-3 12 0','#7A4A2A',1.2)],
    ['سليق','RAMN',bowl('#F7F1E0')+dots([[-12,2],[-6,0],[0,3],[7,1],[13,3],[-3,-1]],'#E8DCC0',1)+leg(4,-4,'#E3B877')],
    ['جريش','AMN',bowl('#E8D6B0')+dots([[-11,1],[-4,-1],[3,2],[10,0],[-7,4],[6,4],[0,-2],[13,3]],'#8A5A2B',1.2)+P('M-4 0q4-3 8 0q-4 2-8 0z','#F0B429',.8)],
    ['مرقوق','AMBT',pot('#D9533E')+P('M-14 -2l7-3 5 3-6 3zM2 -3l8-2 4 3-7 3z','#F4E3B5',1.1)+C(-2,2,2.6,'#3FAE5C',1)+C(10,2,2.2,'#F28C28',1)],
    ['مطازيز','AMBTZ',pot('#D9533E')+E(-9,-1,5,2.6,'#F4E3B5',1.1)+E(4,-2,5,2.6,'#F4E3B5',1.1)+E(12,2,4,2,'#F4E3B5',1.1)+C(-2,3,2.4,'#3FAE5C',1)],
    ['معصوب','WABY',bowl('#B07A4A')+E(-8,0,4,2.4,'#FFF2C9',1.1)+E(1,-1,4,2.4,'#FFF2C9',1.1)+E(10,1,4,2.4,'#FFF2C9',1.1)+L('M-14 3q6-6 12 0t12-2','#F0B429',2)],
    ['لقيمات','WAFBLY',plate+ball(-10,9,5,'#E8A33D')+ball(0,10,5,'#E8A33D')+ball(10,9,5,'#E8A33D')+ball(-5,2,5,'#EDB04E')+ball(5,2,5,'#EDB04E')+ball(0,-5,5,'#F0B95A')+L('M-12 4q6-4 10 2t10-2M-6 -4q6 2 12-2','#8A4A1C',1.6)],
    ['كليجا','WABDO',E(0,16,20,6,'#D9A066')+E(0,13,20,6,'#E8B972')+E(0,9,20,6,'#D9A066')+E(0,6,20,6,'#E8B972')+L('M-8 6l4-3 4 3 4-3 4 3M-12 6h-2M12 6h2',O,1)+E(0,-6,14,5,'#EDC283')+C(0,-6,4,'#B07A4A',1)],
    ['هريس','AM',bowl('#EFE3CC')+E(0,1,8,2.6,'#F0B429',1)+dots([[-12,1],[11,2],[-4,4]],'#B07A4A',1.1)],
    ['تمر','WAD',plate+[[-10,10,-20],[0,11,10],[10,9,25],[-5,3,-5],[5,3,15],[0,-4,0]].map(([x,y,r])=>E(x,y,7,4.4,'#7A3E1C',1.3,r)+E(x-1.5,y-1.4,2.6,1,'#B5683A',0,r)).join('')],
    ['مطبق','AFMB',plate+P('M-18 0l18-8 18 8-18 9z','#E8B04A')+P('M-18 0l18 9v6l-18-9z','#D99A35')+P('M18 0l-18 9v6l18-9z','#C98A2E')+L('M-9 -4l18 9M9 -4l-18 9','#B5782A',1.1)],
    ['حنيني','WABD',bowl('#7A4A2A')+E(-7,0,5,3,'#4A2814',1.1,-10)+E(5,1,5,3,'#4A2814',1.1,15)+dots([[-14,1],[13,2],[-1,-2]],'#C98F58',1.2)],
    ['سمبوسة','FMB',plate+P('M-22 12l12-20 10 20z','#E8A33D')+P('M0 12l12-20 10 20z','#EDB04E')+P('M-10 -2l10-16 10 16z','#F0B95A')+L('M-20 10h18M2 10h18M-8 -3h16',O,1)],
    ['كنافة','WBCYO',E(0,12,27,10,'#C9792E')+E(0,8,27,10,'#E8742E')+L('M-20 6q5 2 10 0M-6 10q5 2 10 0M8 4q5 2 10 0','#B85A1C',1.1)+dots([[-14,6],[-4,4],[6,8],[14,6],[0,10],[-10,10]],'#7DC27A',1.4)+P('M14 4l13 4v6l-13-4z','#fff',1.2)],
    ['بقلاوة','WBYO',plate+[[-10,8],[4,8],[-3,0],[11,0]].map(([x,y])=>P(`M${x} ${y-6}l7 6-7 6-7-6z`,'#E8B04A',1.3)+L(`M${x-4} ${y}h8`,'#C98A2E',1)+C(x,y-1,1.6,'#7DC27A',.8)).join('')],
    ['معمول','WBDO',plate+[[-11,8],[0,9],[11,8],[-5,1],[6,1]].map(([x,y])=>P(`M${x-6} ${y+3}q0-9 6-9t6 9z`,'#F2DFC0',1.3)+L(`M${x-3} ${y}l1.5-3M${x} ${y+1}v-4M${x+3} ${y}l-1.5-3`,'#C9A27A',1)).join('')],
    ['فلافل','FL',plate+ball(-10,9,6,'#8A5A2B')+ball(3,9,6,'#8A5A2B')+ball(-4,1,6,'#9A6A34')+ball(12,3,5,'#8A5A2B')+L('M14 12q4-4 8-3M16 10q2-5 6-6','#3FAE5C',1.8)],
    ['شاورما','MB',`<g transform="rotate(-20)">${P('M-24 -6h40q5 6 0 12h-40z','#F2DFC0')}${E(16,0,4,6,'#E3C08C',1.3)}${E(16,0,3,4.4,'#C9783A',0)}${L('M-16 -6v12M-6 -6v12M4 -6v12','#D9C09A',1.2)}${P('M-24 -6q-4 6 0 12','#fff',1.3)}</g>`+L('M-10 24h20','#CFD8E2',1)],
    ['بيتزا','BCOT',C(0,4,24,'#E8B04A')+C(0,4,20,'#D9533E',1.2)+[[-9,-3],[6,-6],[10,8],[-6,11],[1,2]].map(([x,y])=>C(x,y,3.6,'#FFF6E0',1)).join('')+P('M-12 6q3-5 6 0q-3 3-6 0zM8 -2q3-5 6 0q-3 3-6 0z','#3FAE5C',1)],
    ['برجر','MBCT',P('M-20 -2q0-16 20-16t20 16z','#E8A33D')+dots([[-8,-10],[0,-12],[8,-9],[-3,-6],[5,-5]],'#FFF2C9',1)+P('M-22 -2h44l-4 4h-36z','#7DC27A',1.2)+P('M-20 2h40v3h-40z','#E5534B',1.2)+P('M-20 5h40l-3 5-3-3-3 3h-28z','#F5C431',1.1)+P('M-21 9h42v6h-42z','#6B3E22',1.3)+P('M-20 15h40q0 8-20 8t-20-8z','#E8A33D')],
    ['سوشي','RMK',E(0,18,26,6,'#3D5A80',1.2)+P('M-20 4h16q2 0 2 2v10h-20v-10q0-2 2-2z','#FBF8F0')+P('M-22 0q9-4 18 0l2 6q-11-4-22 0z','#F28C5A',1.3)+L('M-18 1l4 3M-12 0l4 3','#fff',1)+P('M4 6h18v10h-18z','#262B3D')+E(13,6,9,3.4,'#FBF8F0',1.2)+E(13,6,4,1.8,'#F28C5A',0)],
    ['بطاطس مقلية','F',[...Array(7)].map((_,k)=>P(`M${-12+k*4} 0l${k%2?1:-1} -${18+k%3*4}h3l${k%2?-1:1} ${18+k%3*4}z`,'#F5C431',1.1)).join('')+P('M-15 -2h30l-3 26h-24z','#E5483F')+P('M-6 6q6 6 12 0','none')+C(0,10,4,'#F5C431',1.1)],
    ['دونات','WFB',E(0,4,22,17,'#D9A066')+P('M-20 2q0-15 20-15t20 15q-4 6-9 2t-9 4-11-2-11-4z','#F28CBB',1.4)+E(0,2,7,5,'#FDE3E1')+dots([[-12,-6],[-4,-10],[6,-9],[12,-3],[-15,0],[13,2]],'#3D8FD1',1.1)+dots([[-8,-3],[3,-11],[10,-6]],'#F0B429',1.1)],
    ['آيسكريم','WKN',P('M-9 4l9 26 9-26z','#E8B04A')+L('M-6 8l9 10M-1 6l8 10M5 6l-7 14',O,.9)+C(-5,-2,7.6,'#FDE3E1')+C(5,-2,7.6,'#FFF6E0')+C(0,-11,7.6,'#C98A5E')+C(2,-19,2.2,'#E5483F',1)],
    ['شكشوكة','T',E(0,4,24,14,'#4A4F5A')+E(0,3,20,11,'#D9533E',1.2)+L('M22 2h8',O,4)+E(-7,2,6.6,5,'#fff',1.1)+C(-7,2,2.6,'#F5B300',1)+E(7,4,6.6,5,'#fff',1.1)+C(7,4,2.6,'#F5B300',1)+dots([[-14,8],[14,-2],[0,10]],'#3FAE5C',1.3)],
    ['فتوش','BKT',bowl('#7DC27A')+P('M-14 -2l6-3 3 4-6 3zM6 -3l7-2 2 4-7 2z','#9CD47E',1)+C(-4,0,2.8,'#E5534B',1)+C(10,2,2.6,'#E5534B',1)+P('M-8 2h5v4h-5zM1 1h5v4h-5z','#E8B04A',1)],
    ['تبولة','KT',bowl('#5DA457')+dots([[-12,0],[-6,2],[0,-1],[6,2],[12,0],[-3,4],[9,4]],'#3F8A35',1.3)+P('M-8 -2h4v4h-4zM3 0h4v4h-4zM-1 3h4v3h-4z','#E5534B',1)],
    ['بروستد','FM',plate+leg(-6,6,'#D98E32')+leg(8,2,'#E8A33D')+leg(-2,-6,'#D98E32')],
    ['كباب','M',plate+L('M-26 8l52-10',O,1.6)+[-16,-6,4,14].map((x,k)=>E(x,6-k*2,5.4,4.6,'#8A4A2A',1.3,-11)).join('')+L('M-14 4l-2 4M-4 2l-2 4M6 0l-2 4M16 -2l-2 4','#5A2E16',1)],
    ['حلاوة طحينية','W',plate+P('M-16 -2l20-6 14 6v14l-20 6-14-6z','#E8D2A8')+P('M-16 -2l14 6v14l-14-6z','#D9BE8A',1.2)+P('M-2 4l20-6','none')+L('M-12 -1q6 2 12-3M-6 -4q6 2 12-2M4 6q4-2 8-3','#B0905E',1.1)],
    ['مسخن','MBO',E(0,10,26,12,'#C98A4E')+E(0,8,22,10,'#8E4A6E',1.2)+leg(-2,4,'#B5562E')+dots([[-14,8],[-8,12],[10,12],[14,6],[-2,14]],'#E8B0C8',1.6)+dots([[-10,4],[12,2]],'#4A1E2E',1)]];
  const it=A.map(([name,f,art],k)=>{GSX.add({['fd'+k]:art});return {name,f,bg:GSX.BG[(k+3)%8]};});
  const has=(x,k)=>x.f.includes(k);
  const art=k=>GSX.card(it[k].bg,GSX.u('fd'+k));
  const N=n=>A.findIndex(a=>a[0]===n);
  const mini=n=>{const k=N(n);return GSX.ic(it[k].bg,GSX.u('fd'+k,'transform="scale(.38)"'));};
  const Q=[['فيها رز؟','R',0,'كبسة'],['فيها لحم أو دجاج أو سمك؟','M',0,'بروستد'],['فيها خبز أو عجين؟','B',0,'مسخن'],['فيها جبن؟','C',0,'بيتزا'],['فيها تمر؟','D',0,'تمر'],['فيها طماطم؟','T',0,'شكشوكة'],['فيها حليب أو لبن؟','N',0,'آيسكريم'],['فيها شيرة أو عسل؟','Y',0,'لقيمات'],
    ['حلوة؟','W',1,'دونات'],['من أكلات الجزيرة العربية؟','A',1,'مندي'],['شكلها كور صغيرة؟','L',1,'فلافل'],['فيها أقراص عجين مدورة؟','Z',1,'مطازيز'],
    ['تنقلى بالزيت؟','F',2,'بطاطس مقلية'],['تنخبز بالفرن؟','O',2,'كليجا'],['تنأكل باردة؟','K',2,'سوشي']].map(([t,k,c,ic])=>[t,x=>has(x,k),c,mini(ic)]);
  const deal=R=>{R=R||Math.random;const a=[],o=[];it.forEach((x,k)=>(has(x,'A')?a:o).push(k));return shuffleR(R,[...shuffleR(R,a).slice(0,10),...shuffleR(R,o).slice(0,14)]);};
  return {it,Q,art,deal};
})();
gsMake('gs_food',{hu:'هي',ttl:'أكلة',one:'الأكلة',sec:'أكلتك السرية',pre:'أكلتك',it:GSF.it,Q:GSF.Q.map(q=>q.slice(0,3)),cat:['إيش فيها','نوعها','طبخها'],
  qi:i=>GSF.Q[i][3],ci:k=>GSF.Q[[0,8,12][k]][3],art:GSF.art,deal:GSF.deal},
  {name:'خمّن الأكلة',lbc:'#D2603A',icon:GSX.icon('#D2603A',[0,7,20].map(k=>GSF.art(k)))});
HELP.gs_food='لكل واحد أكلة سرية من الـ24 اللي على اللوحة (أكلاتنا وأكلات من العالم). في دورك اختار سؤال (فيها رز؟ حلوة؟ تنقلى؟ من أكلات الجزيرة العربية؟…) ويروح لكل الباقين، وكل واحد يجاوب عن أكلته على طبختها المعروفة، والجواب لك بس. البطاقات اللي ما تنطبق تنقلب. بعد الأجوبة تقدر تخمّن أو تخلّص دورك: صح = نقاط (أكثر كل ما سألت أقل) وتقدر تخمّن غيرها، غلط = يروح دورك وتنقص نقطة. أول واحد يعرف أكلات الكل ياخذ +3 وتخلص، والأكثر نقاط يفوز. مع ثلاثة أو أكثر فيه «الكل ضد واحد».';
/* ================= «خمّن المهنة»: the cast kids (KH) in work clothes =================
   Outfits and accessories are added to the kit under job- keys (KH.extend). The kid's shirt colour is the uniform colour.
   picture facts: g a girl · W white clothes · B blue · O red or orange · G green · H a helmet · P a hat or cap.
   work facts (kept to what is not in doubt): m treats people or animals · a looks after animals · s works at sea or in water ·
   f flies (plane or space) · v steers a plane, a ship or a bus · c cooks or bakes · x fixes or builds with tools ·
   r rescue or security · t at a school · p paints or takes photos · y sport · k at a computer · l in a lab · n on TV or radio ·
   z grows crops. */
const GSJ=(()=>{
  const O=GSX.OL,s=GSX.s,P=(d,f,w=1.4)=>`<path d="${d}" fill="${f}"${s(w)}/>`,C=(x,y,r,f,w=1.3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${s(w)}/>`,
    L=(d,c=O,w=1.4)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    R=(x,y,w,h,f,sw=1.3,rx=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${s(sw)}/>`;
  /* The work clothes are clothes on the kids' rig (KH.cloth; rig units: the neck at 0,-88, shoulders ±14,-83, the shirt's hem
     near -46, knees near -27): k the kind of top and bottom, v the colours, deco on the shirt, over on top of the body.
     The things they carry keep their old drawings, each put where it belongs: H on the head (old head coordinates, from the
     old body ones by the head's place 0,-45), h in the hand (from the old right hand at 12.5,-19), o on the chest */
  const {cl,ln,mir}=KH.cloth,
    H=x=>`<g transform="translate(0 45)">${x}</g>`,Hd=x=>`<g transform="translate(-12.5 19)">${x}</g>`,Ch=x=>`<g transform="translate(0 -21) scale(1.8)">${x}</g>`,
    coat=(c,len=-27)=>cl(`M-17.4 -86C-13 -89 -9 -89 -6.4 -87.6L-3.6 -62L-4.4 ${len}L-19.6 ${len}Z`,c)+cl(mir(`M-17.4 -86C-13 -89 -9 -89 -6.4 -87.6L-3.6 -62L-4.4 ${len}L-19.6 ${len}Z`),c),
    apron=c=>cl('M-12.6 -79L12.6 -79L14 -31Q0 -27.6 -14 -31Z',c)+ln('M-10.6 -79L-6.4 -89.4M10.6 -79L6.4 -89.4',1.6),
    cap=(c,b)=>P('M-12.4 -53q12.4-9 24.8 0v3.4h-24.8z',c)+P('M-13.6 -49.6h27.2l-2.4 3.4h-22.4z',b||O,1.1),
    hard=c=>P('M-14.4 -50q0-13 14.4-13t14.4 13z',c,1.5)+P('M-17 -50h34v2.6h-34z',c,1.3)+L('M0 -63v13M-6 -61l2 11M6 -61l-2 11',O,.9);
  const OUT={
    'job-coat':{k:{top:'long'},v:'--sl:#FAFBFD',over:coat('#FAFBFD')+ln('M7.4 -72h7v6h-7z')},
    'job-scrub':{k:{top:'tee',low:'pants'},v:'--lo:var(--kc)',deco:ln('M-6.6 -88.4L0 -78L6.6 -88.4',1.4)+ln('M5 -72h8v7h-8z')},
    'job-pilot':{k:{top:'long'},v:'--kc:#22385A;--kd:#18294A;--sl:#22385A',deco:cl('M-6.6 -89L0 -72L6.6 -89Z','#FFFFFF')+`<path d="M-15 -74h7M-15 -71h7" stroke="#F0B429" stroke-width="1.6"/><circle cy="-62" r="1.3" fill="#F0B429"/><circle cy="-53" r="1.3" fill="#F0B429"/>`},
    'job-suit':{k:{top:'long',low:'pants'},v:'--kc:#F4F6FA;--kd:#CDD6E1;--sl:#F4F6FA;--lo:#E9EEF4',deco:cl('M-20 -54h40v5h-40z','#9FB3C8')+cl('M5 -78h9v6h-9z','#3D8FD1')},
    'job-fire':{k:{top:'long'},v:'--kc:#C9372F;--kd:#A52A24;--sl:#C9372F',deco:`<path d="M-22 -66h44M-22 -54h44" stroke="#F5D33F" stroke-width="3.4"/>`+ln('M0 -88v42',1.2),
      over:cl('M-15.6 -48L-17.6 -30Q0 -27 17.6 -30L15.6 -48Z','#C9372F')+`<path d="M-17 -35.6q17 2.6 34 0" fill="none" stroke="#F5D33F" stroke-width="3"/>`},
    'job-police':{k:{low:'pants'},v:'--lo:#22385A',deco:cl('M-22 -51h44v4.6h-44z','#1E2230')+`<path d="M8 -78l1.6 3.2 3.4.4-2.6 2.2 1 3.4-3.4-2-3.4 2 1-3.4-2.6-2.2 3.4-.4z" fill="#F0B429" stroke="#22374F" stroke-width=".7"/>`+ln('M-6.6 -88.4L0 -82L6.6 -88.4',1.4)},
    'job-vest':{deco:cl('M-22 -92L-6 -88.6L-6 -40L-22 -40Z','#F28C28')+cl(mir('M-22 -92L-6 -88.6L-6 -40L-22 -40Z'),'#F28C28')+`<path d="M-22 -60h16M6 -60h16" stroke="#fff" stroke-width="3"/>`},
    'job-apronb':{over:apron('#8A5A2B')+ln('M-6 -58h12v7.6h-12z')},
    'job-apron':{over:apron('#FAFBFD')},
    'job-overall':{k:{low:'pants'},v:'--lo:#3D6FB0',over:cl('M-11 -70L11 -70L12 -46L-12 -46Z','#3D6FB0')+`<path d="M-9 -70L-11 -86M9 -70L11 -86" stroke="#3D6FB0" stroke-width="3.6" stroke-linecap="round"/><circle cx="-8" cy="-67" r="1.5" fill="#F0B429"/><circle cx="8" cy="-67" r="1.5" fill="#F0B429"/>`+ln('M-5 -64h10v6h-10z')},
    'job-smock':{over:cl('M-15.6 -84Q0 -79 15.6 -84L18.6 -35Q0 -31 -18.6 -35Z','#F4F1E8')+`<circle cx="-7" cy="-66" r="2.6" fill="#E5534B"/><circle cx="5" cy="-56" r="2.4" fill="#3D8FD1"/><circle cx="7" cy="-74" r="2.4" fill="#F0B429"/>`},
    'job-wet':{k:{top:'long',low:'pants'},v:'--kc:#262B3D;--kd:#1A1E2C;--sl:#262B3D;--lo:#262B3D',deco:`<path d="M-22 -66h44" stroke="#F28C28" stroke-width="3"/>`},
    'job-bag':{over:`<path d="M-12 -86L14 -48" stroke="#7A4A2A" stroke-width="3.6" stroke-linecap="round"/>`+cl('M8 -52h16v13h-16z','#A0703F')+ln('M8 -48h16')},
    'job-tape':{over:`<path d="M-8 -88q-3 14 0 30M8 -88q3 14 0 30" fill="none" stroke="#F0B429" stroke-width="3.6" stroke-linecap="round"/><path d="M-9 -78h1.6M-9.4 -70h1.6M9 -78h-1.6M9.4 -70h-1.6" stroke="#22374F" stroke-width="1"/>`}};
  const ACC={
    'job-steth':{o:Ch(L('M-5 -35q-3 8 2 13M5 -35q3 8-2 13M-3 -22q3 2 6 0M0 -21v3',O,1.2)+C(0,-17,2.2,'#9FB3C8',1))},
    'job-clip':{h:Hd(R(8,-27,9,12,'#A0703F',1.2)+R(9.6,-25.4,5.8,8.6,'#fff',.8,.5)+L('M10.6 -23h3.6M10.6 -21h3.6M10.6 -19h2.4',O,.7))},
    'job-tooth':{h:Hd(P('M10 -30q4-2 6 0q2-2 6 0q2 4-1 8l-1 7q-1 2-2 0l-1-4-1 4q-1 2-2 0l-1-7q-3-4-1-8z','#fff',1.3))},
    'job-cat':{o:Ch(P('M-6.6 -24l-1-6 4 3zM6.6 -24l1-6-4 3z','#F2A33A',1.1)+C(0,-21,7,'#F2A33A',1.3)+C(-2.6,-22,.9,O,0)+C(2.6,-22,.9,O,0)+L('M-1 -19.6h2',O,1))},
    'job-book':{h:Hd(R(9,-27,8,10,'#3D8FD1',1.2)+L('M13 -27v10','#fff',1))},
    'job-pcap':{H:H(cap('#22385A')+P('M-2.6 -55h5.2l-.6 2.6h-4z','#F0B429',.8))},
    'job-helmS':{H:H(C(0,-45,17,'rgba(190,225,255,.28)',1.6)+L('M-10 -55q4-4 9-5','#fff',2)),o:Ch(R(-6,-29,12,4,'#C9D3DE',1.1))},
    'job-fireH':{H:H(P('M-15 -50q0-14 15-14t15 14l4 3h-38z','#C9372F',1.5)+P('M-3 -62h6v6h-6z','#F5D33F',1)),h:Hd(L('M12 -19q8 4 6 14',O,4.6)+L('M12 -19q8 4 6 14','#4A4F5A',2.6))},
    'job-polH':{H:H(cap('#2F5E9E')+P('M-2.4 -56l2.4-2 2.4 2-2.4 2z','#F0B429',.8))},
    'job-ring':{h:Hd(C(16,-19,7,'#fff',1.4)+C(16,-19,3.4,'none',1.2)+L('M16 -26v3.6M16 -12v-3.6M9 -19h3.6M23 -19h-3.6','#E5483F',2.6))},
    'job-chefH':{H:H(P('M-10 -53v-5q-6-1-5-7t7-4q2-6 8-6t8 6q6-2 7 4t-5 7v5z','#fff',1.4)+L('M-10 -55h20','#C8D3E0',1)),h:Hd(L('M12 -19l3-12',O,1.6)+P('M13.6 -33q1-4 3-3t0 4z','#C9D3DE',1))},
    'job-bread':{h:P('M-9 -4q0-6 9-6t9 6q0 4-9 4t-9-4z','#E3A04E',1.3)+L('M-4 -7l1.6 3M1 -8l1.6 3','#B5702E',1.1)},
    'job-hardE':{H:H(hard('#F5C431')),h:Hd(P('M10 -25l10-4 2 4-10 4z','#DDEFFC',1.2)+L('M12 -24l7-3',O,.6))},
    'job-hardB':{H:H(hard('#F5C431')),h:Hd(R(9,-24,10,6,'#C9372F',1.2)+L('M9 -21h10M14 -24v3',O,.8))},
    'job-hardL':{H:H(hard('#FAFBFD')),h:Hd(C(16,-26,4.4,'#FFE38A',1.2)+R(14.4,-22,3.2,3,'#9FB3C8',.9)+L('M16 -33v-2M21 -30l1.4-1.4M11 -30l-1.4-1.4','#F0B429',1.2))},
    'job-saw':{h:Hd(P('M11 -22l14-6 2 5-14 6z','#C9D3DE',1.2)+L('M12 -17l1-2M15 -18l1-2M18 -20l1-2M21 -21l1-2',O,.7)+R(8,-24,5,5,'#8A5A2B',1.1))},
    'job-wrench':{h:Hd(L('M12 -19l7-12',O,3)+L('M12 -19l7-12','#C9D3DE',1.6)+P('M17 -33q2-4 6-2l-2 3 2 2 3-2q1 4-3 6z','#C9D3DE',1.1))},
    'job-plumb':{H:H(cap('#3D8FD1')),h:Hd(R(11,-28,4,14,'#9FB3C8',1.2)+R(9,-30,8,3,'#9FB3C8',1.1))},
    'job-farm':{h:Hd(L('M14 -10V-34',O,2.6)+L('M14 -10V-34','#B07A4A',1.4)+P('M10 -34q4-8 8 0q-4 3-8 0z','#E8B04A',1.1)+L('M12 -36l-2-4M16 -36l2-4M14 -37v-5','#E8B04A',1.2))},
    'job-staff':{h:L('M0 18V-12q0-5 4-5t3 4',O,2.8)+L('M0 18V-12q0-5 4-5t3 4','#B07A4A',1.4),b:C(-16,-6,5,'#F7F3EA',1.2)+C(-20,-8,3,'#E3C29A',1.1)},
    'job-beeH':{H:H(P('M-19 -50h38l-3-3h-32z','#F4F6FA',1.3)+P('M-11 -53q0-10 11-10t11 10z','#F4F6FA',1.3)+P('M-14 -50v14h28v-14z','rgba(60,70,90,.18)',.9)),h:Hd(R(9,-28,10,9,'#F5C431',1.2)+L('M11 -26h6M11 -23h6',O,.6))},
    'job-fish':{h:Hd(L('M12 -19L26 -48',O,1.6)+L('M26 -48v26','#9FB3C8',.8)+P('M21 -22q5-4 10 0q-5 4-10 0zM31 -22l3-3v6z','#4FA3D8',1))},
    'job-capt':{H:H(cap('#FAFBFD')+P('M-2.4 -55h4.8l-.4 2.4h-4z','#F0B429',.8)),h:Hd(C(14,-21,7,'none',2.4)+L('M14 -30v18M5 -21h18M8 -27l12 12M20 -27l-12 12','#8A5A2B',1.4)+C(14,-21,2,'#8A5A2B',1))},
    'job-mask':{H:H(R(-10,-50,20,8,'rgba(150,210,240,.6)',1.6,3)+L('M10 -46h4v-12','#F28C28',2.2))},
    'job-wheel':{o:Ch(C(0,-20,8,'none',2.6)+L('M0 -20v-8M0 -20l-7 4M0 -20l7 4',O,1.6)+C(0,-20,2,O,0))},
    'job-beret':{H:H(P('M-13 -55q2-8 13-8t13 6q-2 3-26 2z','#7A4FA0',1.3)+C(0,-63,1.4,'#7A4FA0',1)),h:Hd(L('M12 -19l5-13',O,1.4)+P('M16.4 -33l1.6-2 .6 2.4z','#E5534B',.8)),
      b:P('M-22 -19q0-6 6-7t8 4q-2 2-1 4t-4 3q-9 1-9-4z','#F4E3B5',1.2)+C(-18,-22,1.3,'#E5534B',0)+C(-14,-24,1.3,'#3D8FD1',0)+C(-17,-18,1.3,'#3FAE5C',0)},
    'job-cam':{o:Ch(R(-8,-27,16,11,'#3A3F4A',1.3)+C(0,-21.4,3.8,'#7FC4E8',1.2)+R(-6,-29,5,2.4,'#3A3F4A',1))},
    'job-laptop':{o:Ch(P('M-11 -14h22l2 3h-26z','#9FB3C8',1.2)+P('M-9 -28h18v14h-18z','#5F7590',1.3)+R(-7,-26,14,10,'#7FC4E8',.8)+P('M-5 -23l2 2-2 2M0 -19h4','none',1))},
    'job-lab':{H:H(R(-11,-49,22,7,'rgba(150,210,240,.55)',1.5,3)),h:Hd(P('M12 -30h4v6l4 8q1 3-2 3h-8q-3 0-2-3l4-8z','#DFF3F1',1.2)+P('M11.4 -18h9.2l1 2.6q.4 1.4-1.4 1.4h-8.4q-1.8 0-1.4-1.4z','#7DD38A',0))},
    'job-mail':{H:H(cap('#C9372F')),h:Hd(R(10,-27,10,7,'#fff',1.1)+L('M10 -27l5 4 5-4',O,.9))},
    'job-scis':{h:Hd(L('M13 -19l7-8M13 -27l7 8',O,1.6)+C(11.6,-17.6,1.8,'none',1.2)+C(11.6,-28.4,1.8,'none',1.2))},
    'job-ball':{h:Hd(C(16,-22,6.2,'#fff',1.3)+P('M16 -24.6l2.4 1.8-.9 2.8h-3l-.9-2.8z',O,0)+L('M16 -24.6v-3M18.4 -22.8l2.8-1M17.5 -20l1.8 2.4M14.5 -20l-1.8 2.4M13.6 -22.8l-2.8-1',O,.7))},
    'job-mic':{h:Hd(L('M12 -19l5-9',O,2)+C(18,-30,3.6,'#5F7590',1.3))}};
  KH.extend({outfit:OUT,acc:ACC});
  const J=`طبيب|1|#F4F6FA|job-coat|job-steth|W m
ممرضة|2|#3FAE5C|job-scrub|job-clip|g G m
طبيبة أسنان|6|#F4F6FA|job-coat|job-tooth|g W m
بيطرية|3|#F4F6FA|job-coat|job-cat|g W m a
معلم|7|#F4F6FA|thobe|job-book|W t
طيار|0|#22385A|job-pilot|job-pcap|B P f v
رائدة فضاء|4|#F4F6FA|job-suit|job-helmS|g W H f
إطفائي|5|#C9372F|job-fire|job-fireH|O H r
شرطي|0|#2F5E9E|job-police|job-polH|B P r
منقذة|4|#E5534B||job-ring|g O s r
طباخ|5|#F4F6FA|job-coat|job-chefH|W P c
خبازة|2|#9C7BD6|job-apron|job-bread|g c
مهندسة|6|#7FA7C9|job-vest|job-hardE|g O H
عامل بناء|0|#7FA7C9|job-vest|job-hardB|O H x
كهربائي|7|#F0B429||job-hardL|H x
نجار|5|#7FA7C9|job-apronb|job-saw|x
ميكانيكي|1|#3D6FB0|job-overall|job-wrench|B x
سباك|5|#3D8FD1|job-overall|job-plumb|B P x
مزارع|1|#F4F6FA|thobe|job-farm|W z
راعي غنم|7|#F4F6FA|thobe|job-staff|W a
نحّالة|6|#F4F6FA|job-coat|job-beeH|g W P a
صياد سمك|1|#3FAE5C||job-fish|G s
قبطان|0|#22385A|job-pilot|job-capt|B P s v
غواص|5|#262B3D|job-wet|job-mask|s
سائق باص|7|#3D8FD1||job-wheel|B v
رسامة|3|#F4E3B5|job-smock|job-beret|g P p
مصورة|2|#9C7BD6||job-cam|g p
لاعب كرة|0|#3FAE5C|sport|job-ball|G y
مبرمجة|3|#7A4FA0||job-laptop|g k
عالمة|4|#F4F6FA|job-coat|job-lab|g W l
ساعي بريد|5|#E5534B|job-bag|job-mail|O P
خياطة|6|#9C7BD6|job-tape|job-scis|g
مذيع|1|#F4F6FA|thobe|job-mic|W n`.split('\n').map((r,k)=>{const [name,who,c,outfit,acc,f]=r.split('|');return {name,who:+who,c,outfit,acc,t:new Set(f.split(' ')),bg:GSX.BG[k%8]};});
  const kid=(x,sc,ty)=>`<g transform="translate(0 ${ty})">${KH.kid({who:x.who,c:x.c,outfit:x.outfit||undefined,acc:x.acc,s:sc,mood:'s'})}</g>`;
  const ART={};const art=k=>ART[k]||(ART[k]=GSX.card(J[k].bg,kid(J[k],1.18,46)));
  const N=n=>J.findIndex(x=>x.name===n);
  const mini=n=>{const x=J[N(n)];return GSX.ic(x.bg,`<g transform="scale(.4)">${kid(x,1.2,49)}</g>`);};
  const sw=c=>GSX.ic('#F4F6FA',`<path d="M-9 10v-3q0-7 9-7t9 7v3z" fill="${c}"${s(1.3)}/><circle cy="-5" r="4.6" fill="#F2C29B"${s(1.3)}/>`);
  const Q=[['بنت؟','g',0,mini('مصورة')],['لبسه أبيض؟','W',0,mini('طبيب')],['لبسه أزرق؟','B',0,sw('#3D6FB0')],['لبسه أحمر أو برتقالي؟','O',0,sw('#E5534B')],['لبسه أخضر؟','G',0,sw('#3FAE5C')],['يلبس خوذة؟','H',0,mini('عامل بناء')],['يلبس قبعة أو كاب؟','P',0,mini('شرطي')],
    ['يعالج ناس أو حيوانات؟','m',1,mini('طبيبة أسنان')],['يهتم بحيوانات؟','a',1,mini('راعي غنم')],['شغله بالبحر أو بالماء؟','s',1,mini('غواص')],['يطير بطيارة أو للفضاء؟','f',1,mini('رائدة فضاء')],['يقود طيارة أو سفينة أو باص؟','v',1,mini('سائق باص')],
    ['يطبخ أو يخبز؟','c',1,mini('طباخ')],['يصلّح أو يبني بعدّته؟','x',1,mini('نجار')],['شغله إنقاذ أو أمن؟','r',1,mini('إطفائي')],
    ['يشتغل في مدرسة؟','t',2,mini('معلم')],['يرسم أو يصوّر؟','p',2,mini('رسامة')],['رياضي؟','y',2,mini('لاعب كرة')],['شغله على الكمبيوتر؟','k',2,mini('مبرمجة')],['يشتغل في مختبر؟','l',2,mini('عالمة')],['يطلع بالتلفزيون أو الراديو؟','n',2,mini('مذيع')],['يزرع؟','z',2,mini('مزارع')]].map(([t,k,c,ic])=>[t,x=>x.t.has(k),c,ic]);
  const deal=R=>shuffleR(R||Math.random,[...J.keys()]).slice(0,GSN);
  return {it:J,Q,art,deal};
})();
gsMake('gs_job',{hu:'هي',ttl:'مهنة',one:'المهنة',sec:'مهنتك السرية',pre:'مهنتك',it:GSJ.it,Q:GSJ.Q.map(q=>q.slice(0,3)),cat:['الشكل','الشغل','وين يشتغل'],
  qi:i=>GSJ.Q[i][3],ci:k=>GSJ.Q[[1,7,15][k]][3],art:GSJ.art,deal:GSJ.deal},
  {name:'خمّن المهنة',lbc:'#2F8F86',icon:GSX.icon('#2F8F86',[0,7,5].map(k=>GSJ.art(k)))});
HELP.gs_job='لكل واحد مهنة سرية من الـ24 اللي على اللوحة (عيال الحارة لابسين لبس الشغل). في دورك اختار سؤال (يلبس خوذة؟ لبسه أبيض؟ يعالج ناس؟ شغله بالبحر؟…) ويروح لكل الباقين، وكل واحد يجاوب عن مهنته، والجواب لك بس. البطاقات اللي ما تنطبق تنقلب. بعد الأجوبة تقدر تخمّن أو تخلّص دورك: صح = نقاط (أكثر كل ما سألت أقل) وتقدر تخمّن غيرها، غلط = يروح دورك وتنقص نقطة. أول واحد يعرف مهن الكل ياخذ +3 وتخلص، والأكثر نقاط يفوز. مع ثلاثة أو أكثر فيه «الكل ضد واحد».';

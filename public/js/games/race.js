'use strict';
/* race games on a star board that grows with the players: ludo and jakaro */

/* ---------- shared star board: one arm per player (4 arms minimum) ---------- */
const starArms=n=>n<4?4:n;
const armOf=(n,s)=>n===2?s*2:s;
const GEO={};
function starGeo(A){if(GEO[A])return GEO[A];
  const half=Math.PI/A,a0=1.5/Math.tan(half);
  const th=k=>-Math.PI/2+k*2*half;
  const P=(k,dist,lat)=>{const t=th(k),r=a0+0.5+dist;return {x:r*Math.cos(t)-lat*Math.sin(t),y:r*Math.sin(t)+lat*Math.cos(t),rot:t*180/Math.PI+90};};
  const track=[];for(let k=0;k<A;k++)for(let j=0;j<13;j++){const [dist,lat]=j<6?[j,-1]:j===6?[5,0]:[12-j,1];track.push({...P(k,dist,lat),k,j});}
  const homes=[];for(let k=0;k<A;k++)homes.push([4,3,2,1,0].map(dd=>P(k,dd,0)));
  const rb=3.75/Math.sin(half);
  const bases=[];for(let k=0;k<A;k++){const t=th(k)+half;bases.push({x:rb*Math.cos(t),y:rb*Math.sin(t)});}
  const slot=(k,i)=>{const b=bases[k];const o=[[-.62,-.62],[.62,-.62],[-.62,.62],[.62,.62]][i%4];return {x:b.x+o[0],y:b.y+o[1]};};
  const R0=a0/Math.cos(half);
  const poly=[];for(let k=0;k<A;k++)poly.push([R0*Math.cos(th(k)-half),R0*Math.sin(th(k)-half),R0*Math.cos(th(k)+half),R0*Math.sin(th(k)+half)]);
  const fin=(k,i)=>{const t=th(k),r=a0*.6,lat=(i-1.5)*.3*Math.min(1,a0/1.5);return {x:r*Math.cos(t)-lat*Math.sin(t),y:r*Math.sin(t)+lat*Math.cos(t)};};
  let m=0;for(const c of track)m=Math.max(m,Math.abs(c.x)+.7,Math.abs(c.y)+.7);for(const b of bases)m=Math.max(m,Math.abs(b.x)+2.25,Math.abs(b.y)+2.25);
  return GEO[A]={A,a0,th,track,homes,bases,slot,poly,fin,m:+(m+.2).toFixed(2)};}
const f2=v=>+v.toFixed(2);
const tr=p=>`translate(${f2(p.x)}px,${f2(p.y)}px)`;
function cellRect(c,fill,stroke,extra){return `<rect x="-.44" y="-.44" width=".88" height=".88" rx=".16" fill="${fill}" stroke="${stroke||'rgba(45,71,99,.25)'}" stroke-width=".05" transform="translate(${f2(c.x)} ${f2(c.y)}) rotate(${f2(c.rot)})" ${extra||''}/>`;}
/* step animation for pieces drawn as <g> with a css transform */
function animPieces(items,caps,stepMs){
  S.holdRender=true;const st=stepMs||150;
  const set=(e,p,ms)=>{e.style.transition=ms?`transform ${ms}ms cubic-bezier(.3,.7,.4,1)`:'none';e.style.transform=typeof p==='string'?p:tr(p);};
  items.forEach(it=>{it.fin=it.el.style.transform;set(it.el,it.start,0);});caps.forEach(c=>{c.fin=c.el.style.transform;set(c.el,c.from,0);});
  void document.body.offsetWidth;let n=0;
  const run=()=>{if(n>=items.length){
      caps.forEach(c=>{c.el.classList.add('zap');set(c.el,c.fin,520);});if(caps.length)sfx('lose');
      setTimeout(()=>{caps.forEach(c=>c.el.classList.remove('zap'));S.holdRender=false;if(S.renderPending)render();},caps.length?560:60);return;}
    const it=items[n++];it.el.classList.add('hop');let i=0;
    const step=()=>{if(i<it.pts.length){set(it.el,it.pts[i++],it.ms||st-10);setTimeout(step,it.ms||st);return;}
      set(it.el,it.fin,90);it.el.classList.remove('hop');sfx('pop');setTimeout(run,110);};
    step();};
  setTimeout(run,40);
}

/* ================= ludo ================= */
const LT=n=>n<=4?4:n<=6?3:2;
const luT=d=>13*starArms(d.pl.length);
function luXY(d,s,k,p){const n=d.pl.length,G=starGeo(starArms(n)),a=armOf(n,s),T=13*G.A;
  if(p<0)return G.slot(a,k);if(p<=T-2)return G.track[(a*13+8+p)%T];if(p<T+4)return G.homes[a][p-(T-1)];return G.fin(a,k);}
function luMovable(d,s,r){const F=luT(d)+4,o=[];for(let k=0;k<d.T;k++){const p=d.tk[s*d.T+k];if(p<0){if(r===6)o.push(k);}else if(p<F&&p+r<=F)o.push(k);}return o;}
function luApply(d,s,k,r){const n=d.pl.length,T=luT(d),F=T+4,tk=[...d.tk],i=s*d.T+k,from=tk[i],to=from<0?0:from+r;tk[i]=to;const cap=[];
  if(to<=T-2){const g=(armOf(n,s)*13+8+to)%T;if(g%13!==3&&g%13!==8)for(let o=0;o<n;o++){if(o===s)continue;for(let kk=0;kk<d.T;kk++){const q=tk[o*d.T+kk];if(q>=0&&q<=T-2&&(armOf(n,o)*13+8+q)%T===g){cap.push([o,kk,q]);tk[o*d.T+kk]=-1;}}}}
  let done=true;for(let kk=0;kk<d.T;kk++)if(tk[s*d.T+kk]!==F)done=false;
  const extra=!done&&(r===6||cap.length>0||to===F);
  const msg=`${nm(d,s)} ${from<0?'طلّع قطعة جديدة':'مشى '+r}`+(cap.length?`، وأكل قطعة ${cap.map(c=>nm(d,c[0])).join(' و')} 💥`:'')+(to===F?'، ووصّل قطعة للبيت 🏁':'')+(extra?'، ويلعب مرة ثانية':'');
  return {...d,tk,roll:null,six:extra&&r===6?d.six:0,mv:{s,k,from,to,cap,sid:(d.mv?d.mv.sid:0)+1},turn:done||extra?s:nextSeat(d,s),win:done?s:null,last:msg};}
function luRoll(d,auto){const s=d.turn,r=1+rnd(6),six=r===6?d.six+1:0;const b={...d,die:r,dsid:d.dsid+1};
  if(six>=3)return {...b,roll:null,six:0,mv:null,turn:nextSeat(d,s),last:`${nm(d,s)} جاب ثلاث ستات ورا بعض، راح دوره`};
  const mv=luMovable(d,s,r);
  if(!mv.length)return {...b,roll:null,six:0,mv:null,turn:nextSeat(d,s),last:`${nm(d,s)} جاب ${r} وما عنده حركة`};
  if(auto||new Set(mv.map(k=>d.tk[s*d.T+k])).size===1)return luApply({...b,six},s,mv[0],r);
  return {...b,roll:r,six,last:`${nm(d,s)} جاب ${r}، يختار القطعة`};}
function rollDie(after){S.rolling=true;render();S.holdRender=true;const iv=setInterval(()=>{const el=document.querySelector('.ldie');if(el)el.innerHTML=diceSVG(1+rnd(6));},70);
  setTimeout(()=>{clearInterval(iv);S.holdRender=false;S.rolling=false;after();},620);}
function dieBox(d,my,label,can){const fresh=d.dsid&&once('die'+d.gid+'_'+d.dsid);
  return `<div class="lupanel">${tapDie(d.die||6,can&&!S.rolling,col(d,d.turn),'ldie '+(S.rolling?'spin':fresh?'land':''))}${label}</div>`;}
GAMES.ludo={name:'لودو',cat:'board',lbc:'#B03A2E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><rect width="40" height="40" fill="#EC6158"/><rect x="60" width="40" height="40" fill="#4CB97F"/><rect y="60" width="40" height="40" fill="#4AB1E8"/><rect x="60" y="60" width="40" height="40" fill="#F0B429"/>${[[20,20],[80,20],[20,80],[80,80]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="#fff"/>`).join('')}<path d="M40 40L50 50L60 40Z" fill="#4CB97F"/><path d="M40 40L50 50L40 60Z" fill="#EC6158"/><path d="M60 60L50 50L40 60Z" fill="#4AB1E8"/><path d="M60 60L50 50L60 40Z" fill="#F0B429"/><rect x="40" y="0" width="20" height="40" fill="none" stroke="#c9d6e4" stroke-width="1.5"/><rect x="47" y="6" width="6" height="34" fill="#4CB97F" opacity=".5"/><circle cx="20" cy="20" r="7" fill="#EC6158"/><circle cx="80" cy="80" r="7" fill="#F0B429"/></svg>`,
  init:n=>({T:LT(n),tk:Array(n*LT(n)).fill(-1),roll:null,six:0,die:6,dsid:0,mv:null,last:''}),
  points:d=>d.pl.map((r,s)=>{let f=0;for(let k=0;k<d.T;k++)if(d.tk[s*d.T+k]===luT(d)+4)f++;return f+'/'+d.T;}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  onSkip:nd=>S.st.d&&S.st.d.turn!==nd.turn?{...nd,roll:null,six:0}:nd,
  onTimeout:d=>{if(d.roll!=null){const mv=luMovable(d,d.turn,d.roll);return mv.length?luApply(d,d.turn,mv[0],d.roll):{...d,roll:null,turn:nextSeat(d,d.turn)};}return luRoll(d,true);},
  render(d,ctx){const n=d.pl.length,A=starArms(n),G=starGeo(A),T=13*A,s0=d.turn,my=ctx.my;
    const mov=my&&d.roll!=null&&!S.rolling?new Set(luMovable(d,s0,d.roll)):new Set();
    const own=Array(A).fill(-1);for(let s=0;s<n;s++)own[armOf(n,s)]=s;
    const C=k=>own[k]>=0?col(d,own[k]):'#C5CFDA',Lc=k=>own[k]>=0?LIGHT[d.pl[own[k]]]:'#EEF2F6';
    let v=`<svg viewBox="${-G.m} ${-G.m} ${2*G.m} ${2*G.m}" class="lboard">`;
    v+=`<rect x="${-G.m}" y="${-G.m}" width="${2*G.m}" height="${2*G.m}" rx="1.2" fill="#FBFCFE"/>`;
    for(let k=0;k<A;k++){if(own[k]<0)continue;const b=G.bases[k];v+=`<circle cx="${f2(b.x)}" cy="${f2(b.y)}" r="2.05" fill="${C(k)}"/><circle cx="${f2(b.x)}" cy="${f2(b.y)}" r="1.55" fill="#fff"/>`;
      for(let i=0;i<d.T;i++){const q=G.slot(k,i);v+=`<circle cx="${f2(q.x)}" cy="${f2(q.y)}" r=".42" fill="${Lc(k)}" stroke="${C(k)}" stroke-width=".06"/>`;}
      if(own[k]===s0&&d.win==null)v+=`<circle cx="${f2(b.x)}" cy="${f2(b.y)}" r="2.05" fill="none" stroke="${C(k)}" stroke-width=".18" class="ring"/>`;}
    G.poly.forEach((p,k)=>{v+=`<path d="M0 0L${f2(p[0])} ${f2(p[1])}L${f2(p[2])} ${f2(p[3])}Z" fill="${C(k)}" stroke="#fff" stroke-width=".06"/>`;});
    G.track.forEach(c=>{const st=c.j===8&&own[c.k]>=0;v+=cellRect(c,st?C(c.k):'#fff');
      if(c.j===3||c.j===8)v+=`<text x="${f2(c.x)}" y="${f2(c.y+.22)}" font-size=".62" text-anchor="middle" fill="${st?'#fff':'#B8C4D0'}">★</text>`;});
    G.homes.forEach((h,k)=>h.forEach(c=>{v+=cellRect(c,own[k]>=0?C(k):'#E3E9EF','rgba(255,255,255,.6)');}));
    const pos={};const seq=[];
    for(let s=0;s<n;s++)for(let k=0;k<d.T;k++){const p=d.tk[s*d.T+k];const xy=luXY(d,s,k,p);const key=f2(xy.x)+','+f2(xy.y);(pos[key]=pos[key]||[]).push(1);seq.push({s,k,p,xy,key,i:pos[key].length-1});}
    seq.sort((a,b)=>(mov.has(a.k)&&a.s===s0)-(mov.has(b.k)&&b.s===s0));
    for(const t of seq){const m=pos[t.key].length;const off=m>1&&t.p>=0&&t.p<T+4?{x:t.xy.x+(t.i-(m-1)/2)*.22,y:t.xy.y-(t.i-(m-1)/2)*.12}:t.xy;const can=t.s===s0&&mov.has(t.k);const c=col(d,t.s);
      v+=`<g id="lt${t.s}_${t.k}" class="pawn ${can?'can':''}" style="transform:${tr(off)}" ${can?`data-ga="tok" data-i="${t.k}"`:''}>${can?'<circle r=".95" fill="transparent"/><circle r=".6" class="halo" fill="none" stroke="#fff" stroke-width=".12"/>':''}
        <ellipse cy=".3" rx=".36" ry=".13" fill="rgba(0,0,0,.22)"/><path d="M-.3 .25C-.3 -.05-.16-.12-.13-.22A.24 .24 0 1 1 .13 -.22C.16-.12 .3-.05 .3 .25Z" fill="${c}" stroke="#fff" stroke-width=".07"/><circle cy="-.38" r=".09" fill="rgba(255,255,255,.55)"/></g>`;}
    v+='</svg>';
    let lab='';
    if(d.win==null){if(my&&d.roll==null)lab='';
      else if(my)lab='<b class="hint">اختار القطعة</b>';
      else lab=`<span class="note">ينتظر ${nm(d,s0)}</span>`;}
    return v+dieBox(d,my,lab,my&&d.roll==null&&d.win==null);},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='roll'&&d.roll==null&&!S.rolling){const g=d.gid,t=d.turn;rollDie(()=>{const nd=S.st.d;if(!nd||nd.gid!==g||nd.turn!==t||nd.roll!=null)return;act(luRoll(nd));});return;}
    if(a==='tok'&&d.roll!=null&&luMovable(d,d.turn,d.roll).includes(i))act(luApply(d,d.turn,i,d.roll));},
  after(d){const m=d.mv;if(!m||!once('lu'+d.gid+'_'+m.sid))return;const el=document.getElementById(`lt${m.s}_${m.k}`);if(!el)return;
    const pts=[];if(m.from<0)pts.push(luXY(d,m.s,m.k,0));else for(let p=m.from+1;p<=m.to;p++)pts.push(luXY(d,m.s,m.k,p));
    const caps=m.cap.map(([o,kk,q])=>({el:document.getElementById(`lt${o}_${kk}`),from:luXY(d,o,kk,q)})).filter(c=>c.el);
    animPieces([{el,start:luXY(d,m.s,m.k,m.from),pts}],caps,150);}
};

/* ================= jakaro ================= */
const JRN={A:'إكة',K:'شايب',Q:'بنت',J:'ولد',T:'10'};
const jkL=d=>13*starArms(d.pl.length);
const jkStart=(d,s)=>armOf(d.pl.length,s)*13+8;
const jkCell=(d,s,p)=>(jkStart(d,s)+p)%jkL(d);
const jkTeamOf=(d,s)=>d.team?[s%(d.pl.length/2),s%(d.pl.length/2)+d.pl.length/2]:[s];
const jkHome=(d,s)=>{const L=jkL(d);for(let k=0;k<4;k++)if(d.mb[s*4+k]<L)return false;return true;};
const jkCtl=(d,s)=>d.team&&jkHome(d,s)?jkTeamOf(d,s).find(x=>x!==s):s;
function jkXY(d,s,k,p){const n=d.pl.length,G=starGeo(starArms(n)),a=armOf(n,s),L=13*G.A;if(p<0)return G.slot(a,k);if(p<L)return G.track[(a*13+8+p)%L];return G.homes[a][p-L];}
function jkOcc(d){const L=jkL(d),o={};for(let s=0;s<d.pl.length;s++)for(let k=0;k<4;k++){const p=d.mb[s*4+k];if(p>=0&&p<L)o[jkCell(d,s,p)]={s,k,p};}return o;}
function jkFwd(d,s,k,n,occ){const L=jkL(d),p=d.mb[s*4+k];if(p<0||p+n>L+3)return null;
  for(let t=1;t<=n;t++){const q=p+t;if(q<L){const m=occ[jkCell(d,s,q)];if(m&&m.p===0)return null;}else{if(q-L>3)return null;for(let kk=0;kk<4;kk++)if(d.mb[s*4+kk]===q)return null;}}
  const q=p+n;let kill=null;if(q<L){const m=occ[jkCell(d,s,q)];if(m){if(m.s===s)return null;kill=m;}}return {s,k,from:p,to:q,kill};}
function jkBack(d,s,k,occ){const L=jkL(d),p=d.mb[s*4+k];if(p<0||p>=L)return null;let q=p;
  for(let t=1;t<=4;t++){q=(p-t+L)%L;const m=occ[jkCell(d,s,q)];if(m&&m.p===0)return null;}
  const m=occ[jkCell(d,s,q)];if(m&&m.s===s)return null;return {s,k,from:p,to:q,kill:m||null,back:true};}
function jkOut(d,s,occ){const k=[0,1,2,3].find(k=>d.mb[s*4+k]<0);if(k==null)return null;const m=occ[jkStart(d,s)];if(m&&m.s===s)return null;return {s,k,from:-1,to:0,kill:m||null};}
function jkSwapOk(d,s,k,o,ok){const L=jkL(d),p=d.mb[s*4+k],q=d.mb[o*4+ok];return o!==s&&p>0&&p<L&&q>0&&q<L;}
function jkDo(d,m){const mb=[...d.mb];if(m.kill)mb[m.kill.s*4+m.kill.k]=-1;mb[m.s*4+m.k]=m.to;return {...d,mb};}
function jkOpts(d,cs,card){const r=card[0],occ=jkOcc(d),o=[];const fw=n=>{for(let k=0;k<4;k++)if(jkFwd(d,cs,k,n,occ))o.push({t:'f',k,n});};
  if((r==='A'||r==='K')&&jkOut(d,cs,occ))o.push({t:'o'});
  if(r==='A'){fw(1);fw(11);}else if(r==='K')fw(13);else if(r==='Q')fw(12);else if(r==='T')fw(10);
  else if(r==='4'){for(let k=0;k<4;k++)if(jkBack(d,cs,k,occ))o.push({t:'b',k});}
  else if(r==='J'){for(let k=0;k<4;k++)for(let s=0;s<d.pl.length;s++)for(let kk=0;kk<4;kk++)if(jkSwapOk(d,cs,k,s,kk))o.push({t:'j',k,o:s,ok:kk});}
  else if(r==='7'){for(let k=0;k<4;k++)for(let a=1;a<=7;a++){const m=jkFwd(d,cs,k,a,occ);if(!m)continue;if(a===7){o.push({t:'7',k,a});continue;}
      const d2=jkDo(d,m),occ2=jkOcc(d2);for(let k2=0;k2<4;k2++)if(k2!==k&&jkFwd(d2,cs,k2,7-a,occ2))o.push({t:'7',k,a,k2});}}
  else fw(+r);
  return o;}
const jkCardName=c=>(JRN[c[0]]||c[0]);
function jkPlay(d,ci,opt){const s=d.turn,n=d.pl.length,cs=jkCtl(d,s),L=jkL(d);const hd=[...d.hd];const cards=cardsOf(hd[s]);const card=cards.splice(ci,1)[0];hd[s]=cards.join('');
  let nd={...d,hd,top:card,np:d.np+1};const moves=[],kills=[];let swap=false,msg;
  const go=m=>{if(!m)return;moves.push({s:m.s,k:m.k,from:m.from,to:m.to,back:!!m.back});if(m.kill)kills.push({s:m.kill.s,k:m.kill.k,from:m.kill.p});nd=jkDo(nd,m);};
  if(!opt)msg=`${nm(d,s)} حرق ورقة ${jkCardName(card)} 🔥`;
  else{
    if(opt.t==='o')go(jkOut(nd,cs,jkOcc(nd)));
    else if(opt.t==='f')go(jkFwd(nd,cs,opt.k,opt.n,jkOcc(nd)));
    else if(opt.t==='b')go(jkBack(nd,cs,opt.k,jkOcc(nd)));
    else if(opt.t==='7'){go(jkFwd(nd,cs,opt.k,opt.a,jkOcc(nd)));if(opt.k2!=null)go(jkFwd(nd,cs,opt.k2,7-opt.a,jkOcc(nd)));}
    else if(opt.t==='j'){const mb=[...nd.mb];const A1=jkCell(nd,cs,mb[cs*4+opt.k]),B1=jkCell(nd,opt.o,mb[opt.o*4+opt.ok]);
      moves.push({s:cs,k:opt.k,from:mb[cs*4+opt.k],to:(B1-jkStart(nd,cs)+L)%L},{s:opt.o,k:opt.ok,from:mb[opt.o*4+opt.ok],to:(A1-jkStart(nd,opt.o)+L)%L});
      mb[cs*4+opt.k]=moves[0].to;mb[opt.o*4+opt.ok]=moves[1].to;nd={...nd,mb};swap=true;}
    msg=`${nm(d,s)} لعب ${jkCardName(card)}`+(opt.t==='o'?' وطلّع حبة':opt.t==='j'?` وبدّل مع ${nm(d,opt.o)}`:opt.t==='b'?' ورجع 4':opt.t==='7'&&opt.k2!=null?` وقسمها ${opt.a}+${7-opt.a}`:'')+(kills.length?`، وقتل حبة ${kills.map(x=>nm(d,x.s)).join(' و')} 💥`:'');}
  const team=jkTeamOf(nd,s);let win=null,wins=null;
  if(team.every(x=>jkHome(nd,x))){win=s;wins=team;}
  else if(nd.np>=150*n){let best=-1,bs=[];for(let x=0;x<(d.team?n/2:n);x++){const tm=jkTeamOf(nd,x);const sc=tm.reduce((a,y)=>a+[0,1,2,3].reduce((b,k)=>b+Math.max(0,nd.mb[y*4+k]+1),0),0);if(sc>best){best=sc;bs=tm;}}win=bs[0];wins=bs;}
  let turn=nextSeat(nd,s);const act_=aliveSeats(nd);
  if(win==null&&act_.every(x=>!nd.hd[x])){let deck=nd.deck;if(deck.length<8*n)deck=shuffle(deck52()).join('');const h2=[...nd.hd];for(const x of act_){h2[x]=deck.slice(0,8);deck=deck.slice(8);}nd={...nd,hd:h2,deck,deal:(nd.deal||0)+1};msg+='. وزّعنا ورق جديد 🃏';}
  else if(win==null){let g=0;while(!nd.hd[turn]&&g++<n)turn=nextSeat(nd,turn);}
  return {...nd,turn,win,wins,last:msg,mv:{sid:(d.mv?d.mv.sid:0)+1,moves,kills,swap}};}
function jkAuto(d){const s=d.turn,cs=jkCtl(d,s);const cards=cardsOf(d.hd[s]);for(let i=0;i<cards.length;i++){const o=jkOpts(d,cs,cards[i]);if(o.length)return jkPlay(d,i,o[0]);}return jkPlay(d,0,null);}
const jkSel=d=>{const key=d.gid+':'+d.np+':'+d.turn;if(!S.jk||S.jk.key!==key)S.jk={key,ci:null,k:null,a:null};return S.jk;};
GAMES.jakaro={name:'جكارو',cat:'board',lbc:'#7B4A2A',
  icon:`<svg viewBox="0 0 100 100"><defs><radialGradient id="jkw" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#D9A066"/><stop offset="1" stop-color="#8E5B2E"/></radialGradient></defs><rect width="100" height="100" fill="url(#jkw)"/>${[...Array(12).keys()].map(i=>{const t=i/12*Math.PI*2;return `<circle cx="${50+34*Math.cos(t)}" cy="${50+34*Math.sin(t)}" r="4" fill="#4A2C17"/>`;}).join('')}${[['#EC6158',0],['#4AB1E8',3],['#4CB97F',6],['#F0B429',9]].map(([c,i])=>{const t=i/12*Math.PI*2;return `<circle cx="${50+34*Math.cos(t)}" cy="${50+34*Math.sin(t)}" r="5.5" fill="${c}" stroke="#fff" stroke-width="1.2"/>`;}).join('')}<rect x="34" y="30" width="22" height="32" rx="3" fill="#fff" transform="rotate(-12 45 46)"/><rect x="46" y="34" width="22" height="32" rx="3" fill="#fff" transform="rotate(10 57 50)"/><text x="57" y="56" font-size="15" font-weight="800" fill="#E5483F" text-anchor="middle" transform="rotate(10 57 50)">K</text></svg>`,
  init:n=>{let deck=shuffle(deck52()).join('');const hd=[];for(let s=0;s<n;s++){hd.push(deck.slice(0,8));deck=deck.slice(8);}
    return {mb:Array(n*4).fill(-1),hd,deck,top:null,np:0,team:n>=4&&n%2===0,last:'',mv:null};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((r,s)=>{const L=jkL(d);let f=0;for(let k=0;k<4;k++)if(d.mb[s*4+k]>=L)f++;return f+'/4'+(d.team?' 🤝'+(s%(d.pl.length/2)+1):'');}),
  status(d,ctx){const s=d.turn;let t=(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);
    return t;},
  onTimeout:d=>jkAuto(d),
  render(d,ctx){const n=d.pl.length,A=starArms(n),G=starGeo(A),L=13*A,s0=d.turn,my=ctx.my,cs=jkCtl(d,s0);
    const v0=ctx.local?s0:ctx.v;const sel=jkSel(d);const cards=v0>=0?cardsOf(d.hd[v0]||''):[];
    const optsAll=my?cards.map(c=>jkOpts(d,cs,c)):[];const burn=my&&optsAll.every(o=>!o.length);
    const opts=my&&sel.ci!=null&&!burn?optsAll[sel.ci]||[]:[];
    // which marbles can be tapped now
    const tap=new Set();let choice='';
    if(opts.length){const r=cards[sel.ci][0];
      if(r==='7'&&sel.k!=null&&sel.a!=null)opts.filter(o=>o.k===sel.k&&o.a===sel.a&&o.k2!=null).forEach(o=>tap.add(cs*4+o.k2));
      else if(r==='7'&&sel.k!=null){const as=[...new Set(opts.filter(o=>o.k===sel.k).map(o=>o.a))].sort((x,y)=>x-y);choice=`<p class="hint" style="text-align:center">كم خطوة لهذي الحبة؟</p><div class="nums">${as.map(a=>`<button class="btn ${a===7?'red':'navy'}" data-ga="amt" data-i="${a}">${a}</button>`).join('')}</div>`;opts.forEach(o=>tap.add(cs*4+o.k));}
      else if(r==='J'&&sel.k!=null)opts.filter(o=>o.k===sel.k).forEach(o=>tap.add(o.o*4+o.ok));
      else{if(r==='A'&&sel.k!=null){const ns=opts.filter(o=>o.t==='f'&&o.k===sel.k).map(o=>o.n);if(ns.length>1)choice=`<p class="hint" style="text-align:center">كم تمشي؟</p><div class="nums">${ns.map(x=>`<button class="btn navy" data-ga="amt" data-i="${x}">${x}</button>`).join('')}</div>`;}
      opts.forEach(o=>{if(o.t==='o'){const k=[0,1,2,3].find(k=>d.mb[cs*4+k]<0);tap.add(cs*4+k);}else tap.add(cs*4+o.k);});}}
    const C=s=>col(d,s);
    let v=`<svg viewBox="${-G.m} ${-G.m} ${2*G.m} ${2*G.m}" class="jboard"><defs><radialGradient id="jwood" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#E2B07A"/><stop offset=".7" stop-color="#B97A44"/><stop offset="1" stop-color="#8A552B"/></radialGradient>
      <radialGradient id="jhole" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="#2E1A0C"/><stop offset="1" stop-color="#5C3A1F"/></radialGradient>
      ${d.pl.map((r,s)=>`<radialGradient id="jm${s}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".22" stop-color="${shade(C(s),.25)}"/><stop offset=".75" stop-color="${C(s)}"/><stop offset="1" stop-color="${shade(C(s),-.45)}"/></radialGradient>`).join('')}</defs>
      <rect x="${-G.m}" y="${-G.m}" width="${2*G.m}" height="${2*G.m}" rx="1.4" fill="url(#jwood)"/>
      <rect x="${-G.m+.25}" y="${-G.m+.25}" width="${2*G.m-.5}" height="${2*G.m-.5}" rx="1.2" fill="none" stroke="rgba(60,30,10,.35)" stroke-width=".12"/>`;
    const own=Array(A).fill(-1);for(let s=0;s<n;s++)own[armOf(n,s)]=s;
    G.poly.forEach((p,k)=>{v+=`<path d="M0 0L${f2(p[0])} ${f2(p[1])}L${f2(p[2])} ${f2(p[3])}Z" fill="${own[k]>=0?C(own[k]):'#8A552B'}" opacity=".35"/>`;});
    v+=`<circle r="${f2(G.a0*.55)}" fill="rgba(60,30,10,.25)"/><text y="${f2(G.a0*.12)}" font-size="${f2(G.a0*.36)}" text-anchor="middle" fill="#FBE7C6" font-weight="800">جكارو</text>`;
    for(let k=0;k<A;k++){if(own[k]<0)continue;const b=G.bases[k];v+=`<circle cx="${f2(b.x)}" cy="${f2(b.y)}" r="1.85" fill="${C(own[k])}" opacity=".28"/><circle cx="${f2(b.x)}" cy="${f2(b.y)}" r="1.85" fill="none" stroke="${C(own[k])}" stroke-width=".1"/>`;
      for(let i=0;i<4;i++){const q=G.slot(k,i);v+=`<circle cx="${f2(q.x)}" cy="${f2(q.y)}" r=".36" fill="url(#jhole)"/>`;}
      if(own[k]===s0&&d.win==null)v+=`<circle cx="${f2(b.x)}" cy="${f2(b.y)}" r="2.05" fill="none" stroke="#FFE08A" stroke-width=".14" class="ring"/>`;}
    G.track.forEach(c=>{const st=c.j===8&&own[c.k]>=0;v+=`<circle cx="${f2(c.x)}" cy="${f2(c.y)}" r=".34" fill="url(#jhole)" ${st?`stroke="${C(own[c.k])}" stroke-width=".14"`:''}/>`;});
    G.homes.forEach((h,k)=>{if(own[k]<0)return;h.slice(0,4).forEach(c=>{v+=`<circle cx="${f2(c.x)}" cy="${f2(c.y)}" r=".34" fill="url(#jhole)" stroke="${C(own[k])}" stroke-width=".1" stroke-dasharray=".2 .12"/>`;});});
    const order=[];for(let s=0;s<n;s++)for(let k=0;k<4;k++)order.push([s,k]);order.sort((a,b)=>tap.has(a[0]*4+a[1])-tap.has(b[0]*4+b[1]));
    for(const [s,k] of order){const p=d.mb[s*4+k],xy=jkXY(d,s,k,p),gi=s*4+k,can=tap.has(gi),isSel=my&&sel.k!=null&&s===cs&&k===sel.k&&sel.ci!=null;
      v+=`<g id="jm${s}_${k}" class="marble ${can?'can':''} ${isSel?'sel':''}" style="transform:${tr(xy)}" ${can?`data-ga="mb" data-i="${gi}"`:''}>${can?'<circle r=".9" fill="transparent"/><circle r=".52" class="halo" fill="none" stroke="#fff" stroke-width=".1"/>':''}${isSel?'<circle r=".55" fill="none" stroke="#FFE08A" stroke-width=".14"/>':''}<circle cy=".08" r=".36" fill="rgba(0,0,0,.3)"/><circle r=".34" fill="url(#jm${s})"/></g>`;}
    v+='</svg>';
    let h=`<div class="jside">${d.top?`<div class="jtop"><small>آخر ورقة</small>${cardHTML(d.top)}</div>`:''}<div class="jdeck"><small>الورق</small><b>${Math.round(d.deck.length/2)}</b></div></div>`;
    if(d.win==null&&v0>=0){
      const hint=!my?'':burn?'<p class="hint" style="text-align:center">ما عندك ورقة تمشي، اختر ورقة تحرقها 🔥</p>':sel.ci==null?'<p class="hint" style="text-align:center">اختر ورقة</p>':!opts.length?'<p class="note" style="text-align:center">هذي الورقة ما تمشي الحين</p>':
        cards[sel.ci][0]==='J'&&sel.k==null?'<p class="hint" style="text-align:center">اختر حبتك، وبعدها الحبة اللي تبدّل معها</p>':cards[sel.ci][0]==='J'?'<p class="hint" style="text-align:center">اختر الحبة اللي تبدّل معها</p>':
        cards[sel.ci][0]==='7'&&sel.a!=null?'<p class="hint" style="text-align:center">اختر الحبة الثانية للباقي</p>':cards[sel.ci][0]==='7'&&sel.k==null?'<p class="hint" style="text-align:center">اختر الحبة (تقدر تقسم السبعة على حبتين)</p>':
        (cards[sel.ci][0]==='A'||cards[sel.ci][0]==='K')&&opts.some(o=>o.t==='o')&&sel.k==null?'<p class="hint" style="text-align:center">اضغط حبة في بيتك تطلّعها، أو حبة في الطريق تمشيها</p>':sel.k==null?'<p class="hint" style="text-align:center">اختر الحبة</p>':'';
      if(my&&cs!==s0)h+=`<p class="hint" style="text-align:center">حبّاتك وصلت، تلعب الحين بحبّات ${nameTag(d,cs)}</p>`;
      h+=hint+choice+`<div class="jhand ${my?'':'wait'}">${cards.map((c,i)=>{const ok=my&&(burn||optsAll[i].length);return `<button class="jc ${sel.ci===i&&my?'up':''} ${my&&!ok?'no':''}" data-ga="card" data-i="${i}" ${my?'':'disabled'}>${cardHTML(c,true)}</button>`;}).join('')}</div>`;
      if(my&&burn&&sel.ci!=null)h+=`<button class="btn red wide" data-ga="burn">🔥 احرق الورقة</button>`;}
    return v+h;},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.turn,cs=jkCtl(d,s),sel=jkSel(d);const cards=cardsOf(d.hd[s]);
    if(a==='card'){const burn=cards.every(c=>!jkOpts(d,cs,c).length);S.jk={...sel,ci:sel.ci===i?null:i,k:null,a:null};
      if(!burn&&S.jk.ci!=null){const o=jkOpts(d,cs,cards[i]);if(o.length===1&&o[0].t==='o'){act(jkPlay(d,i,o[0]));return;}}
      render();return;}
    if(a==='burn'&&sel.ci!=null){act(jkPlay(d,sel.ci,null));return;}
    if(sel.ci==null)return;const opts=jkOpts(d,cs,cards[sel.ci]),r=cards[sel.ci][0];
    if(a==='amt'){if(r==='A'){const o=opts.find(o=>o.t==='f'&&o.k===sel.k&&o.n===i);if(o)act(jkPlay(d,sel.ci,o));return;}
      if(r==='7'){if(i===7){const o=opts.find(o=>o.k===sel.k&&o.a===7);if(o)act(jkPlay(d,sel.ci,o));return;}S.jk={...sel,a:i};render();}return;}
    if(a!=='mb')return;const ms=Math.floor(i/4),mk=i%4;
    if(r==='J'){if(sel.k==null){if(ms===cs&&opts.some(o=>o.k===mk)){S.jk={...sel,k:mk};render();}return;}const o=opts.find(o=>o.k===sel.k&&o.o===ms&&o.ok===mk);if(o)act(jkPlay(d,sel.ci,o));return;}
    if(ms!==cs)return;
    if(r==='7'){if(sel.k==null||sel.a==null){S.jk={...sel,k:mk,a:null};render();return;}const o=opts.find(o=>o.k===sel.k&&o.a===sel.a&&o.k2===mk);if(o)act(jkPlay(d,sel.ci,o));return;}
    if(d.mb[cs*4+mk]<0){const o=opts.find(o=>o.t==='o');if(o)act(jkPlay(d,sel.ci,o));return;}
    const mine=opts.filter(o=>o.k===mk&&o.t!=='o');if(!mine.length)return;
    if(r==='A'&&mine.length>1){S.jk={...sel,k:mk};render();return;}
    act(jkPlay(d,sel.ci,mine[0]));},
  after(d){const m=d.mv;if(!m||!once('jk'+d.gid+'_'+m.sid))return;const L=jkL(d);
    const items=m.moves.map(x=>{const el=document.getElementById(`jm${x.s}_${x.k}`);if(!el)return null;const start=jkXY(d,x.s,x.k,x.from);
      if(m.swap)return {el,start,pts:[jkXY(d,x.s,x.k,x.to)],ms:520};
      const pts=[];if(x.from<0)pts.push(jkXY(d,x.s,x.k,0));else if(x.back){for(let t=1;t<=4;t++)pts.push(jkXY(d,x.s,x.k,(x.from-t+L)%L));}else for(let p=x.from+1;p<=x.to;p++)pts.push(jkXY(d,x.s,x.k,p));
      return {el,start,pts};}).filter(Boolean);
    if(m.swap&&items.length===2){S.holdRender=true;items.forEach(it=>{it.fin=it.el.style.transform;it.el.style.transition='none';it.el.style.transform=tr(it.start);});void document.body.offsetWidth;
      setTimeout(()=>{items.forEach(it=>{it.el.style.transition='transform .55s cubic-bezier(.5,0,.3,1)';it.el.style.transform=it.fin;});sfx('pop');setTimeout(()=>{S.holdRender=false;if(S.renderPending)render();},600);},60);return;}
    const caps=m.kills.map(x=>({el:document.getElementById(`jm${x.s}_${x.k}`),from:jkXY(d,x.s,x.k,x.from)})).filter(c=>c.el);
    if(items.length)animPieces(items,caps,110);}
};

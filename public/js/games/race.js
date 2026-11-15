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
// a five-point star (safe squares and the centre of the ludo board)
const LSTAR=(()=>{let p='';for(let i=0;i<10;i++){const r=i%2?.13:.31,a=-Math.PI/2+i*Math.PI/5;p+=(i?'L':'M')+(+(r*Math.cos(a)).toFixed(3))+' '+(+(r*Math.sin(a)).toFixed(3));}return p+'Z';})();
const tr=p=>`translate(${f2(p.x)}px,${f2(p.y)}px)`;
function cellRect(c,fill,stroke,extra){return `<rect x="-.44" y="-.44" width=".88" height=".88" rx=".16" fill="${fill}" stroke="${stroke||'rgba(45,71,99,.25)'}" stroke-width=".05" transform="translate(${f2(c.x)} ${f2(c.y)}) rotate(${f2(c.rot)})" ${extra||''}/>`;}
/* step animation for pieces drawn as <g> with a css transform: each piece hops square by square to where it now stands.
   The whole walk stays under about a second (the steps get quicker on a long move); delay lets a die land first.
   Light mode (or reduced motion) skips it: the pieces are already drawn where they end */
const liteFx=()=>{try{return document.documentElement.classList.contains('lite')||matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
function animPieces(items,caps,stepMs,delay){
  if(liteFx()){if(caps.length)sfx('lose');else sfx('pop');return;}
  S.holdRender=true;const total=items.reduce((a,it)=>a+(it.ms?1:it.pts.length),0);const st=Math.max(55,Math.min(stepMs||150,Math.round(650/Math.max(1,total))));
  const set=(e,p,ms)=>{e.style.transition=ms?`transform ${ms}ms cubic-bezier(.3,.7,.4,1)`:'none';e.style.transform=typeof p==='string'?p:tr(p);};
  items.forEach(it=>{it.fin=it.el.style.transform;set(it.el,it.start,0);});caps.forEach(c=>{c.fin=c.el.style.transform;set(c.el,c.from,0);});
  void document.body.offsetWidth;let n=0;
  const done=()=>{S.holdRender=false;if(S.renderPending)render();};
  const run=()=>{if(n>=items.length){
      caps.forEach(c=>{c.el.classList.add('zap');set(c.el,c.fin,300);});if(caps.length)sfx('lose');
      setTimeout(()=>{caps.forEach(c=>c.el.classList.remove('zap'));done();},caps.length?320:40);return;}
    const it=items[n++];it.el.classList.add('hop');let i=0;
    const step=()=>{if(i<it.pts.length){set(it.el,it.pts[i++],it.ms||st-8);setTimeout(step,it.ms||st);return;}
      set(it.el,it.fin,80);it.el.classList.remove('hop');it.el.classList.add('land');setTimeout(()=>it.el.classList.remove('land'),340);sfx('pop');setTimeout(run,90);};
    step();};
  setTimeout(run,Math.max(30,delay||0));
}

/* ================= ludo ================= */
const LT=n=>n<=4?4:n<=6?3:2;
const luT=d=>13*starArms(d.pl.length);
function luXY(d,s,k,p){const n=d.pl.length,G=starGeo(starArms(n)),a=armOf(n,s),T=13*G.A;
  if(p<0)return G.slot(a,k);if(p<=T-2)return G.track[(a*13+8+p)%T];if(p<T+4)return G.homes[a][p-(T-1)];return G.fin(a,k);}
/* vr 1 (pairs): two pieces of one player on the same track square make a pair that nobody else may land on, so it cannot be taken */
let LUV=0;// the last choice on this phone, kept for the next rounds
const luCell=(d,s,p)=>(armOf(d.pl.length,s)*13+8+p)%luT(d);
function luPairAt(d,tk,g,s){const T=luT(d);for(let o=0;o<d.pl.length;o++){if(o===s)continue;let c=0;for(let k=0;k<d.T;k++){const q=tk[o*d.T+k];if(q>=0&&q<=T-2&&luCell(d,o,q)===g)c++;}if(c>=2)return true;}return false;}
function luMovable(d,s,r){const T=luT(d),F=T+4,o=[];for(let k=0;k<d.T;k++){const p=d.tk[s*d.T+k];let to;if(p<0){if(r!==6)continue;to=0;}else if(p<F&&p+r<=F)to=p+r;else continue;
    if(d.vr&&to<=T-2&&luPairAt(d,d.tk,luCell(d,s,to),s))continue;o.push(k);}return o;}
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
// the die: it tumbles in when a new throw shows (on every phone, also for bots and online players)
function dieBox(d,my,label,can){const fresh=d.dsid&&once('die'+d.gid+'_'+d.dsid);if(fresh)S.luDieAt=Date.now();
  return `<div class="lupanel">${tapDie(d.die||6,can,col(d,d.turn),'ldie '+(fresh?'land':''))}${label}</div>`;}
GAMES.ludo={name:'لودو',cat:'board',lbc:'#B03A2E',
  // online the die is thrown on the host's phone, so nobody picks their own number
  net:{host:['roll']},redeal:d=>d,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><rect width="40" height="40" fill="#EC6158"/><rect x="60" width="40" height="40" fill="#4CB97F"/><rect y="60" width="40" height="40" fill="#4AB1E8"/><rect x="60" y="60" width="40" height="40" fill="#F0B429"/>${[[20,20],[80,20],[20,80],[80,80]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="#fff"/>`).join('')}<path d="M40 40L50 50L60 40Z" fill="#4CB97F"/><path d="M40 40L50 50L40 60Z" fill="#EC6158"/><path d="M60 60L50 50L40 60Z" fill="#4AB1E8"/><path d="M60 60L50 50L60 40Z" fill="#F0B429"/><rect x="40" y="0" width="20" height="40" fill="none" stroke="#c9d6e4" stroke-width="1.5"/><rect x="47" y="6" width="6" height="34" fill="#4CB97F" opacity=".5"/><circle cx="20" cy="20" r="7" fill="#EC6158"/><circle cx="80" cy="80" r="7" fill="#F0B429"/></svg>`,
  init:n=>({T:LT(n),tk:Array(n*LT(n)).fill(-1),roll:null,six:0,die:6,dsid:0,mv:null,last:'',vr:LUV}),
  points:d=>d.pl.map((r,s)=>{let f=0;for(let k=0;k<d.T;k++)if(d.tk[s*d.T+k]===luT(d)+4)f++;return f+'/'+d.T;}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+(d.vr&&d.win==null?'<br><small>قطعتين لك بمربع = زوج محمي 🛡</small>':''),
  onSkip:nd=>S.st.d&&S.st.d.turn!==nd.turn?{...nd,roll:null,six:0}:nd,
  onTimeout:d=>{if(d.roll!=null){const mv=luMovable(d,d.turn,d.roll);return mv.length?luApply(d,d.turn,mv[0],d.roll):{...d,roll:null,turn:nextSeat(d,d.turn)};}return luRoll(d,true);},
  render(d,ctx){const n=d.pl.length,A=starArms(n),G=starGeo(A),T=13*A,s0=d.turn,my=ctx.my;
    const mov=my&&d.roll!=null?new Set(luMovable(d,s0,d.roll)):new Set();
    const own=Array(A).fill(-1);for(let s=0;s<n;s++)own[armOf(n,s)]=s;
    const C=k=>own[k]>=0?col(d,own[k]):'#C5CFDA',Lc=k=>own[k]>=0?LIGHT[d.pl[own[k]]]:'#EEF2F6';
    // board with depth: a soft vignette, yards with sunk slots, track cells that cast a little shadow, gold safe stars
    let v=`<svg viewBox="${-G.m} ${-G.m} ${2*G.m} ${2*G.m}" class="lboard"><defs><radialGradient id="lubg" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F3F7FB"/><stop offset="1" stop-color="#DDE6F0"/></radialGradient>
      <radialGradient id="lush" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
      <radialGradient id="luho" cx=".5" cy=".62" r=".6"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>
      ${d.pl.map((r,s)=>{const c=col(d,s);return `<linearGradient id="lup${s}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(c,.1)}"/><stop offset=".28" stop-color="${shade(c,.5)}"/><stop offset=".62" stop-color="${c}"/><stop offset="1" stop-color="${shade(c,-.38)}"/></linearGradient>`;}).join('')}</defs>`;
    v+=`<rect x="${-G.m}" y="${-G.m}" width="${2*G.m}" height="${2*G.m}" rx="1.2" fill="url(#lubg)"/><rect x="${f2(-G.m+.12)}" y="${f2(-G.m+.12)}" width="${f2(2*G.m-.24)}" height="${f2(2*G.m-.24)}" rx="1.1" fill="none" stroke="rgba(45,71,99,.12)" stroke-width=".1"/>`;
    for(let k=0;k<A;k++){if(own[k]<0)continue;const b=G.bases[k],bx=f2(b.x),by=f2(b.y);v+=`<circle cx="${bx}" cy="${f2(b.y+.12)}" r="2.05" fill="rgba(45,71,99,.18)"/><circle cx="${bx}" cy="${by}" r="2.05" fill="${C(k)}"/><circle cx="${bx}" cy="${by}" r="2.05" fill="url(#lush)"/><circle cx="${bx}" cy="${by}" r="1.55" fill="#fff"/><circle cx="${bx}" cy="${by}" r="1.55" fill="url(#luho)"/>`;
      for(let i=0;i<d.T;i++){const q=G.slot(k,i);v+=`<circle cx="${f2(q.x)}" cy="${f2(q.y)}" r=".42" fill="${Lc(k)}"/><circle cx="${f2(q.x)}" cy="${f2(q.y)}" r=".42" fill="url(#luho)" stroke="${C(k)}" stroke-width=".05"/>`;}
      if(own[k]===s0&&d.win==null)v+=`<circle cx="${bx}" cy="${by}" r="2.1" fill="none" stroke="${C(k)}" stroke-width=".18" class="ring"/>`;}
    G.poly.forEach((p,k)=>{const dd=`M0 0L${f2(p[0])} ${f2(p[1])}L${f2(p[2])} ${f2(p[3])}Z`;v+=`<path d="${dd}" fill="${C(k)}" stroke="#fff" stroke-width=".07"/><path d="${dd}" fill="url(#lush)"/>`;});
    v+=`<circle r="${f2(Math.min(.62,G.a0*.36))}" fill="#fff" stroke="rgba(45,71,99,.15)" stroke-width=".06"/><path d="${LSTAR}" transform="scale(${f2(Math.min(1.5,G.a0*.85))})" fill="#F0B429"/>`;
    G.track.forEach(c=>{v+=cellRect({...c,y:c.y+.07},'rgba(45,71,99,.16)','none');});
    G.track.forEach(c=>{const st=c.j===8&&own[c.k]>=0;v+=cellRect(c,st?C(c.k):'#fff',st?'rgba(0,0,0,.12)':'rgba(45,71,99,.2)');
      if(c.j===3||c.j===8)v+=`<path d="${LSTAR}" transform="translate(${f2(c.x)} ${f2(c.y)}) rotate(${f2(c.rot)})" fill="${st?'#fff':'#F0B429'}" ${st?'':'opacity=".85"'}/>`;});
    G.homes.forEach((h,k)=>h.forEach((c,i)=>{v+=cellRect(c,own[k]>=0?C(k):'#E3E9EF','rgba(255,255,255,.7)',own[k]>=0?`fill-opacity="${f2(.5+.12*i)}"`:'');}));
    // the last move: a soft ring in the mover's colour where the piece landed
    // pairs (with pairs on): a ring in the owner's colour round the square nobody may land on
    if(d.vr){const T2=T-2;for(let s=0;s<n;s++){const seen={};for(let k=0;k<d.T;k++){const p=d.tk[s*d.T+k];if(p<0||p>T2)continue;const g=luCell(d,s,p);seen[g]=(seen[g]||0)+1;}
      for(const g in seen)if(seen[g]>=2){const c=G.track[+g];v+=`<circle cx="${f2(c.x)}" cy="${f2(c.y)}" r=".56" fill="none" stroke="${col(d,s)}" stroke-width=".11" stroke-dasharray=".18 .1"/>`;}}}
    if(d.mv&&d.mv.to!=null&&d.mv.to>=0&&d.win==null){const m=d.mv,q=luXY(d,m.s,m.k,m.to);v+=`<circle cx="${f2(q.x)}" cy="${f2(q.y)}" r=".52" fill="${col(d,m.s)}" fill-opacity=".22" stroke="${col(d,m.s)}" stroke-width=".07" stroke-opacity=".6"/>`;}
    const pos={};const seq=[];
    for(let s=0;s<n;s++)for(let k=0;k<d.T;k++){const p=d.tk[s*d.T+k];const xy=luXY(d,s,k,p);const key=f2(xy.x)+','+f2(xy.y);(pos[key]=pos[key]||[]).push(1);seq.push({s,k,p,xy,key,i:pos[key].length-1});}
    seq.sort((a,b)=>(mov.has(a.k)&&a.s===s0)-(mov.has(b.k)&&b.s===s0));
    for(const t of seq){const m=pos[t.key].length;const off=m>1&&t.p>=0&&t.p<T+4?{x:t.xy.x+(t.i-(m-1)/2)*.22,y:t.xy.y-(t.i-(m-1)/2)*.12}:t.xy;const can=t.s===s0&&mov.has(t.k);const c=col(d,t.s);
      // a glossy pawn: shadow, a base disc, a shaded body and a shine on the head; pawns you can move bob gently above a pulsing halo
      v+=`<g id="lt${t.s}_${t.k}" class="pawn ${can?'can':''}" style="transform:${tr(off)}" ${can?`data-ga="tok" data-i="${t.k}"`:''}>${can?`<circle r=".95" fill="transparent"/><circle r=".5" class="halo" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width=".1"/>`:''}
        <ellipse cy=".3" rx=".38" ry=".13" fill="rgba(0,0,0,.28)"/><g class="pb"><ellipse cy=".24" rx=".33" ry=".11" fill="${shade(c,-.42)}"/><path d="M-.3 .22C-.3 -.05-.16-.12-.13-.22A.24 .24 0 1 1 .13 -.22C.16-.12 .3-.05 .3 .22Q0 .34-.3 .22Z" fill="url(#lup${t.s})" stroke="${shade(c,-.45)}" stroke-width=".04"/><path d="M-.18 .14C-.18 0-.11-.08-.08-.14" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".05" stroke-linecap="round"/><ellipse cx="-.07" cy="-.43" rx=".08" ry=".06" fill="rgba(255,255,255,.85)"/></g></g>`;}
    v+='</svg>';
    let lab='';
    if(d.win==null){if(my&&d.roll==null)lab='';
      else if(my)lab='<b class="hint">اختار القطعة</b>';
      else lab=`<span class="note">ينتظر ${nm(d,s0)}</span>`;}
    const fresh=!ctx.bot&&!d.dsid&&d.tk.every(x=>x<0)&&d.win==null;
    return (fresh?`<div class="segs tttv">${[['0','كلاسيكية'],['1','الزوج محمي']].map(([k,t])=>`<button class="seg ${+k===(d.vr||0)?'on':''}" data-ga="vr" data-i="${k}" ${my?'':'disabled'}>${t}</button>`).join('')}</div>`:'')+v+dieBox(d,my,lab,my&&d.roll==null&&d.win==null);},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='vr'){if(d.dsid||d.tk.some(x=>x>=0))return;LUV=i?1:0;act({...d,vr:LUV});return;}
    if(a==='roll'&&d.roll==null){act(luRoll(d));return;}
    if(a==='tok'&&d.roll!=null&&luMovable(d,d.turn,d.roll).includes(i))act(luApply(d,d.turn,i,d.roll));},
  after(d){const m=d.mv;if(!m||!once('lu'+d.gid+'_'+m.sid))return;const el=document.getElementById(`lt${m.s}_${m.k}`);if(!el)return;
    const pts=[];if(m.from<0)pts.push(luXY(d,m.s,m.k,0));else for(let p=m.from+1;p<=m.to;p++)pts.push(luXY(d,m.s,m.k,p));
    const caps=m.cap.map(([o,kk,q])=>({el:document.getElementById(`lt${o}_${kk}`),from:luXY(d,o,kk,q)})).filter(c=>c.el);
    // a piece moved by the throw that just showed waits for the die to land
    const wait=Math.max(0,300-(Date.now()-(S.luDieAt||0)));
    animPieces([{el,start:luXY(d,m.s,m.k,m.from),pts}],caps,150,wait);}
};

/* jakaro moved to n-jakaro.js and n-jakaro-ui.js (the real wooden board, cards, three rule levels) */

'use strict';
/* n-sport2: sport and skill games: ركلات الترجيح، السهام، البولينج، الغولف الصغير، السلة، الرماية بالقوس، البلياردو الصغير.
   (n-sport2b.js has the horse race, falconry, fishing, the dhow race, show jumping and hopscotch, and uses the helpers here.)
   Fair online: every shot is played on the host's phone from the player's input (the reading of the stop meter, the aim
   or the picks), and the luck in it (wind, a tremor, the pins, the race) is drawn there. The stop meter moves the same way
   on every phone: its pace comes from a seed in the state. */

/* ---------- shared: the stop meter ---------- */
// the needle sweeps 0..1000 and back; its pace wobbles in a pattern drawn from the seed (counted from when the meter shows)
function r2mPar(seed,ms){const R=mulberry(seedOf(seed));return {p:Math.round((ms||1200)*(.85+.3*R())),a:+(.05+.1*R()).toFixed(3),q:+(2.2+1.2*R()).toFixed(2),f:+(R()*6.28).toFixed(2)};}
function r2mVal(m,t){const u=t/m.p+m.a*(Math.sin(2*Math.PI*t/(m.p*m.q)+m.f)-Math.sin(m.f));const x=((u%2)+2)%2;return Math.round(1000*(x<1?x:2-x));}
// zones: [from,to,class] on the track; run: the needle moves; else it rests at v
function r2Meter(key,m,zones,run,v,lbl){
  return `<div class="r2m ${run?'run':''}" data-k="m${key}" data-mk="${key}" data-p="${m.p}" data-a="${m.a}" data-q="${m.q}" data-f="${m.f}">${lbl?`<small class="r2m-l">${lbl}</small>`:''}<div class="r2m-tr">${zones.map(([a,b,c])=>`<i class="${c}" style="left:${(a/10).toFixed(1)}%;width:${((b-a)/10).toFixed(1)}%"></i>`).join('')}</div><i class="r2m-nd"${run?'':` style="transform:translateX(${((v||0)/10).toFixed(1)}%)"`}></i></div>`;}
// the button that stops the meter: data-i is the reading, kept up to date while the needle moves
const r2Stop=(key,ga,txt,on)=>`<button class="btn red r2go" data-ga="${ga}" data-mkb="${key}" data-i="0" ${on?'':'disabled'}>${txt}</button>`;
let r2Raf=0;
function r2Spin(){if(r2Raf||!app.querySelector('.r2m.run'))return;
  const f=now=>{r2Raf=0;const ms=app.querySelectorAll('.r2m.run');if(!ms.length)return;
    for(const el of ms){const k=el.dataset.mk;if(el._k!==k){el._k=k;el._t0=now;el._m={p:+el.dataset.p||1200,a:+el.dataset.a||0,q:+el.dataset.q||3,f:+el.dataset.f||0};}
      const v=r2mVal(el._m,now-el._t0),nd=el.lastElementChild;if(nd)nd.style.transform=`translateX(${v/10}%)`;
      const b=app.querySelector(`[data-mkb="${k}"]`);if(b&&b.dataset.i!==String(v))b.dataset.i=String(v);}
    r2Raf=requestAnimationFrame(f);};
  r2Raf=requestAnimationFrame(f);}
// a stopped meter shows where it stopped while the host plays the shot (this phone only)
const r2Stopped=k=>S.r2stop&&S.r2stop.k===k?S.r2stop.v:null;
const r2Hold=(k,v,ctx)=>{if(ctx&&!ctx.bot&&Number.isFinite(v))S.r2stop={k,v};};
const r2Clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r2Read=i=>Number.isFinite(i)?r2Clamp(Math.round(i),0,1000):500;

/* ---------- shared: luck, bots, rounds, winners ---------- */
const r2N=()=>{let u=0;while(!u)u=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*Math.random());};
// how far a bot's stop lands from where it aims (a careful human is about 40)
const R2SIG=[0,170,85,38];
const r2BotStop=(c,lv)=>r2Clamp(Math.round(c+r2N()*R2SIG[lv||1]),0,1000);
// seats still in, in the order of the round (from the starter)
function r2Ord(d,out){const n=d.pl.length,st=d.st||0;return aliveSeats(d,out).sort((a,b)=>((a-st+n)%n)-((b-st+n)%n));}
// the seat after t in the round; past the last one a new round starts
function r2Adv(d,t,out){const n=d.pl.length,st=d.st||0,o=r2Ord(d,out);if(!o.length)return {turn:t,nr:false};const rel=s=>(s-st+n)%n;
  const nx=o.find(s=>rel(s)>rel(t));return nx==null?{turn:o[0],nr:true}:{turn:nx,nr:false};}
// a side: the team when teams are on, else the seat
const r2Side=(d,s)=>d.tm?d.tm[s]:s;
// every side's value: the average of its seats (the same order as the team total when the teams are even); null = cannot win
function r2Sides(d,vals){const g={};vals.forEach((x,s)=>{if(x==null||!isFinite(x))return;const k=r2Side(d,s);(g[k]=g[k]||[]).push(x);});
  const o={};for(const k in g)o[k]=g[k].reduce((a,b)=>a+b,0)/g[k].length;return o;}
// the winner: the best side (low: the lowest wins); a tie is a draw
function r2Best(d,vals,low){const o=r2Sides(d,vals),ks=Object.keys(o).map(Number);if(!ks.length)return 'd';
  const b=low?Math.min(...ks.map(k=>o[k])):Math.max(...ks.map(k=>o[k]));const top=ks.filter(k=>Math.abs(o[k]-b)<1e-9);if(top.length>1)return 'd';
  const s=d.pl.map((_,i)=>i).find(i=>r2Side(d,i)===top[0]&&vals[i]!=null);return s==null?'d':s;}
// the status of a simultaneous round: who picks now (one phone), or whether this phone has picked
function r2SimStat(d,ctx,extra,ask){if(d.win!=null)return '';let s=(d.last?`<small>${d.last}</small><br>`:'')+(extra||'');
  if(ctx.local)return s+(ctx.v!=null&&ctx.v>=0?`دور ${nameTag(d,ctx.v)} ${ask}`:'');
  return s+(ctx.v>=0&&d.out[ctx.v]!=='1'?(hasPicked(d,ctx.v)?'<b>اخترت، ننتظر الباقين…</b>':`<b class="yt">دورك ${ask}</b>`):'');}
const r2Stat=(d,ctx,extra)=>(d.last?`<small>${d.last}</small><br>`:'')+(extra||'')+turnTxt(d,ctx);
const R2TM=' ولو لعبتوا فرق، كل فريق يجمع نقاط لاعبينه (ولو الفرق مو متساوية ينحسب المعدّل)، والفريق الأعلى يفوز.';
// a small one-off move (transform/opacity only, 450 ms at most); light mode skips it
function r2Anim(el,frames,ms,delay,ease){if(!el||!el.animate||liteFx())return;try{el.animate(frames,{duration:Math.min(ms||380,450),delay:delay||0,easing:ease||'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});}catch(e){}}
// a hand-driven playback (ball paths): holds the screen for at most 1.2 s, and always lets it go
function r2Play(ms,f){if(liteFx())return;ms=Math.min(ms,1200);S.holdRender=true;try{f(ms);}catch(e){console.error(e);}
  clearTimeout(S.r2PlT);S.r2PlT=setTimeout(()=>{S.holdRender=false;if(S.renderPending)render();},ms+40);}
const r2Seg=(ga,opts,cur,on,cls)=>`<div class="segs r2seg ${cls||''}">${opts.map((t,k)=>`<button class="seg ${cur===k?'on':''}" data-ga="${ga}" data-i="${k}" ${on?'':'disabled'}>${t}</button>`).join('')}</div>`;
// a draft choice of this phone, read as a whole number in [a,b] (else the default)
const r2Dr=(k,a,b,def)=>{const v=S.draft&&S.draft[k]!=null?Math.round(+S.draft[k]):NaN;return Number.isFinite(v)&&v>=a&&v<=b?v:def;};

/* =================================================================
   ركلات الترجيح: every round all play at the same time: each one picks a kick (corner and power) at one keeper and a dive
   against one kicker. The pairs turn round every round. 5 kicks each, then sudden death among the leaders.
   ================================================================= */
const PEN_Z=['فوق يسار','فوق وسط','فوق يمين','تحت يسار','تحت وسط','تحت يمين'],PEN_P=['هادية','مركّزة','قوية'],PEN_D=['يسار','وسط','يمين'];
// a kick into zone z with power p when the keeper goes to column v: the chance it goes off target, then that it is saved
function penOdds(z,p,v){const c=z%3,top=z<3,miss=[[.14,.08,.14],[.06,.02,.06]][top?0:1][c]*[.45,1,1.9][p];let save=0;
  if(v===c)save=[.86,.64,.4][p]+(top?(c===1?-.12:-.24):(c===1?.08:0));else if(v===1&&!top&&c!==1)save=[.3,.14,.05][p];
  return {miss,save:r2Clamp(save,0,.97)};}
const penGoal=(z,p,v)=>{const o=penOdds(z,p,v);return (1-o.miss)*(1-o.save);};
// kicker → keeper pairs of round rd: the keeper is the seat a few places on, so the pairs change every round
// with teams the keeper is always from another team (one keeper may then face two kicks)
function penPairs(d){const o=aliveSeats(d),m=o.length;if(m<2)return [];
  if(d.tm&&new Set(o.map(s=>d.tm[s])).size>1)return o.map((s,i)=>{const c=[...o.slice(i+1),...o.slice(0,i)].filter(q=>d.tm[q]!==d.tm[s]);return [s,c[d.rd%c.length]];});
  const sh=1+(d.rd%(m-1));return o.map((s,i)=>[s,o[(i+sh)%m]]);}
const penOk=p=>Number.isInteger(p)&&p>=0&&p<54;
GAMES.r_pen={name:'ركلات الترجيح',cat:'sport',lbc:'#2E8B57',outDone:true,
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="r2pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5CC27E"/><stop offset="1" stop-color="#2E8B57"/></linearGradient></defs><rect width="100" height="100" fill="url(#r2pg)"/><path d="M0 70h100v30H0z" fill="#3FA466"/><rect x="14" y="20" width="72" height="40" fill="none" stroke="#fff" stroke-width="5"/><path d="M19 25h62M19 33h62M19 41h62M19 49h62M27 22v36M37 22v36M47 22v36M57 22v36M67 22v36M77 22v36" stroke="#fff" stroke-width="1" opacity=".45"/><g transform="rotate(-28 40 46)"><rect x="34" y="38" width="13" height="18" rx="4" fill="#F0B429"/><circle cx="40.5" cy="33" r="5" fill="#F2C9A0"/></g><circle cx="70" cy="80" r="11" fill="#fff"/><path d="M70 72l5 4-2 6h-6l-2-6zM59 78l4-2M81 78l-4-2M64 89l3-4M76 89l-3-4" fill="#2D4763" stroke="#2D4763" stroke-width="1.5"/></svg>`,
  init:n=>({rd:0,R:5,g:Array(n).fill(0),kr:Array(n).fill(''),kc:Array(n).fill(0).map(()=>[0,0,0]),dv:Array(n).fill(0).map(()=>[0,0,0]),sd:0,lr:null,last:''}),
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||penOk(p.pick),
  viewer:d=>simulViewer(d),coverMsg:d=>d.last||'',
  points:d=>d.g,
  status:(d,ctx)=>r2SimStat({...d,last:''},ctx,d.sd?`<small>ركلات الموت المفاجئ: ${d.sd}</small><br>`:`<small>الجولة ${Math.min(d.rd+1,d.R)} من ${d.R}</small><br>`,'تسدد وتصد'),
  winExtra:d=>d.last,
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&d.out[v]!=='1',P=penPairs(d),pr=me?P.find(x=>x[0]===v):null,kp=me?P.filter(x=>x[1]===v).map(x=>x[0]):[];
    const k=d.gid+':'+d.rd+':'+v;if(!S.r2pen||S.r2pen.k!==k)S.r2pen={k,z:null,p:1,v:null};const U=S.r2pen,pick=ctx.my&&d.win==null;
    // the replay: this phone's kick of last round (else the first one)
    const L=d.lr||[],fe=L.find(x=>x[0]===v)||L[0];
    let s=`<div class="r2 r2pen">`;
    // the shoot-out sheet: one row per player, a dot per kick
    const cols=Math.max(d.R,...d.kr.map(x=>x.length));
    s+=`<div class="pn-sheet">${d.pl.map((r,i)=>`<div class="pn-row ${d.out[i]==='1'?'off':''}"><b style="--c:${col(d,i)}">${nm(d,i)}</b><span>${Array(cols).fill(0).map((_,j)=>{const c=d.kr[i][j];return `<i class="${c==='o'?'ok':c==='x'?'no':''}"></i>`;}).join('')}</span><em>${d.g[i]}</em></div>`).join('')}</div>`;
    s+=penScene(d,fe,pick?U.z:null,pick);
    if(L.length)s+=`<div class="pn-res" data-k="pr${d.rd}">${L.map(([a,b,z,p,dv,r])=>`<span class="${r===0?'ok':'no'} ${a===v?'me':''}"><b style="color:${col(d,a)}">${nm(d,a)}</b> ${r===0?'⚽ هدف':r===1?`🧤 صدّها ${nm(d,b)}`:z<0?'⌛ ما سدد':'❌ برّا'}</span>`).join('')}</div>`;
    if(pick&&pr){const t=(a,arr)=>arr.map((x,j)=>`${a[j]} ${x}`).join(' • '),hk=[0,1,2].map(j=>kp.reduce((q,k)=>q+d.kc[k][j],0));
      s+=`<div class="pn-pick"><p class="r2lbl">⚽ ركلتك على الحارس ${nm(d,pr[1])}: اختر الزاوية من المرمى فوق</p>
        <small class="r2tip">${nm(d,pr[1])} يرمي نفسه: ${t(PEN_D,d.dv[pr[1]])}</small>
        ${r2Seg('pp',PEN_P,U.p,true)}
        ${kp.length?`<p class="r2lbl">🧤 وأنت حارس قدام ركلة ${kp.map(k=>nm(d,k)).join(' و')}: وين ترمي نفسك؟</p>
        <small class="r2tip">${kp.length>1?'يسددون':kp.map(k=>nm(d,k))+' يسدد'}: ${t(PEN_D,hk)}</small>
        ${r2Seg('pd',PEN_D.map((x,j)=>(j===0?'⬅ ':j===2?'':'⬆ ')+x+(j===2?' ➡':'')),U.v,true)}`:'<small class="r2tip">ما أحد يسدد عليك هالجولة</small>'}
        <button class="btn red wide" data-ga="go" ${U.z!=null&&(U.v!=null||!kp.length)?'':'disabled'}>ثبّت اختياري</button></div>`;}
    else if(me&&d.win==null)s+=`<p class="note">${hasPicked(d,v)?'اخترت، ننتظر الباقين…':''}</p>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const U=S.r2pen;if(!U||U.k!==d.gid+':'+d.rd+':'+ctx.v)return;
    if(a==='pz'&&i>=0&&i<6){U.z=i;render();return;}if(a==='pp'&&i>=0&&i<3){U.p=i;render();return;}if(a==='pd'&&i>=0&&i<3){U.v=i;render();return;}
    if(a==='go'&&U.z!=null){const kp=penPairs(d).filter(x=>x[1]===ctx.v);if(U.v==null&&kp.length)return;simulPick(d,ctx.v,U.z*9+U.p*3+(U.v==null?1:U.v));}},
  // online the picks reach the host sealed and the kicks are drawn there; a new host keeps the round going
  net:{local:['pz','pp','pd']},redeal:d=>d,
  resolve(d,picks){const P=penPairs(d),g=[...d.g],kr=[...d.kr],kc=d.kc.map(x=>[...x]),dv=d.dv.map(x=>[...x]),lr=[];
    for(const [s,k] of P){const a=picks[s],b=picks[k];let z=-1,p=1,v=1,r=2;if(penOk(a)){z=Math.floor(a/9);p=Math.floor(a/3)%3;}if(penOk(b)){v=b%3;dv[k][v]++;}
      if(z>=0){kc[s][z%3]++;const o=penOdds(z,p,v);r=Math.random()<o.miss?2:Math.random()<o.save?1:0;}
      if(r===0)g[s]++;kr[s]+=r===0?'o':'x';lr.push([s,k,z,p,v,r]);}
    let x={...d,g,kr,kc,dv,lr,rd:d.rd+1,sid:(d.sid||0)+1};const goals=lr.filter(q=>q[5]===0).length;
    x.last=`الجولة ${d.rd+1}: ${goals} ${goals===1?'هدف':'أهداف'} من ${lr.length}`;return penEnd(x);},
  botPick(d,s,lv){const P=penPairs(d),pr=P.find(x=>x[0]===s),kp=P.filter(x=>x[1]===s).map(x=>x[0]);if(!pr)return null;
    if(lv===1)return rnd(6)*9+rnd(3)*3+rnd(3);
    // the keeper's habits and the kicker's habits (+1 each so nothing is ruled out)
    const hd=d.dv[pr[1]].map(x=>x+1),hk=[0,1,2].map(j=>1+kp.reduce((q,k)=>q+d.kc[k][j],0)),sd=hd.reduce((a,b)=>a+b),sk=hk.reduce((a,b)=>a+b);
    const best=[];for(let z=0;z<6;z++)for(let p=0;p<3;p++){let e=0;for(let v=0;v<3;v++)e+=hd[v]/sd*penGoal(z,p,v);best.push([e+(lv===2?Math.random()*.08:Math.random()*.03),z,p]);}
    best.sort((a,b)=>b[0]-a[0]);const [,z,p]=best[lv===3?0:rnd(3)];
    // dive where the kicker scores least, mixed a little so the bot cannot be read
    const dv=[0,1,2].map(v=>{let e=0;for(let zz=0;zz<6;zz++)e+=hk[zz%3]/sk/2*penGoal(zz,1,v);return [e+Math.random()*(lv===3?.04:.12),v];}).sort((a,b)=>a[0]-b[0]);
    return z*9+p*3+dv[0][1];},
  onSkip:(nd,d)=>nd
};
// the end: early when nobody can catch the leader, after 5 when one side leads, else sudden death for the leading sides
function penEnd(x){const n=x.pl.length,al=aliveSeats(x);
  const cur=r2Sides(x,x.g.map((v,s)=>x.out[s]==='1'?null:v)),left=Math.max(0,x.R-x.rd);
  const mx=r2Sides(x,x.g.map((v,s)=>x.out[s]==='1'?null:v+left)),ks=Object.keys(cur).map(Number);
  if(ks.length<2)return {...x,win:al.length?al[0]:'d'};
  if(x.rd<x.R){for(const k of ks)if(ks.every(j=>j===k||cur[k]>mx[j]+1e-9)){const w=r2Best(x,x.g.map((v,s)=>x.out[s]==='1'?null:v));return {...x,win:w,last:x.last+' • ما أحد يقدر يلحق'};}return x;}
  const b=Math.max(...ks.map(k=>cur[k])),top=ks.filter(k=>Math.abs(cur[k]-b)<1e-9);
  if(top.length===1)return {...x,win:r2Best(x,x.g.map((v,s)=>x.out[s]==='1'?null:v))};
  if(x.sd>=10)return {...x,win:'d'};
  let out=x.out;for(let s=0;s<n;s++)if(out[s]!=='1'&&!top.includes(r2Side(x,s)))out=setAt(out,s,'1');
  return {...x,out,sd:x.sd+1,last:x.last+(x.sd?'':' • تعادل! ركلات الموت المفاجئ للمتصدرين')};}
// the goal from behind the kicker: six zones to aim at, the keeper (in the dive of the replayed kick) and the ball
const PEN_ZC=[[93,66],[160,66],[227,66],[93,122],[160,122],[227,122]];
function penScene(d,fe,zsel,pick){const dive=fe?fe[4]:1,r=fe?fe[5]:-1,z=fe?fe[2]:-1;
  const kt=dive===0?'translate(-62px,-18px) rotate(-68deg)':dive===2?'translate(62px,-18px) rotate(68deg)':'translateY(-6px)';
  let bx=160,by=176,bs=1;if(fe&&z>=0){[bx,by]=PEN_ZC[z];if(r===2){if(z<3)by=22;else bx=z%3===0?40:z%3===2?280:160;if(z===4){bx=262;by=142;}}
    if(r===1){bx=PEN_ZC[z][0]*.55+(dive===0?38:dive===2?262:160)*.45;by=by+18;}bs=.8;}
  const zones=pick?PEN_ZC.map(([x,y],k)=>`<rect class="pn-z ${zsel===k?'on':''}" x="${x-33}" y="${y-28}" width="66" height="56" rx="6" data-ga="pz" data-i="${k}"/>`).join(''):'';
  const key=d.gid+'s'+(d.sid||0);
  return `<svg class="pn-svg" viewBox="0 0 320 190" data-k="pns" data-key="${key}" aria-hidden="true"><defs><linearGradient id="pnsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F3B5A"/><stop offset="1" stop-color="#335A80"/></linearGradient><pattern id="pnnet" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 0L9 9M9 0L0 9" stroke="#fff" stroke-width=".7" opacity=".42"/></pattern></defs>
    <rect width="320" height="190" fill="url(#pnsky)"/><path d="M0 30h320v20H0z" fill="#2A4766"/>${[...Array(16)].map((_,k)=>`<circle cx="${10+k*20}" cy="40" r="3.4" fill="${['#EC6158','#F0B429','#fff','#4AB1E8'][k%4]}" opacity=".55"/>`).join('')}
    ${[0,1,2,3].map(k=>`<rect x="0" y="${150+k*10}" width="320" height="10" fill="${k%2?'#3FA466':'#46B070'}"/>`).join('')}<rect x="0" y="150" width="320" height="2" fill="#fff" opacity=".7"/>
    <rect x="60" y="40" width="200" height="110" fill="url(#pnnet)"/><rect x="60" y="40" width="200" height="110" fill="#fff" opacity=".06"/>
    <path d="M60 152V40h200v112" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <g class="pn-kp" style="transform:${kt};transform-origin:160px 150px"><rect x="150" y="104" width="20" height="30" rx="6" fill="#F0B429"/><rect x="151" y="132" width="8" height="18" rx="3" fill="#2D4763"/><rect x="161" y="132" width="8" height="18" rx="3" fill="#2D4763"/><path d="M151 110l-14-16M169 110l14-16" stroke="#F0B429" stroke-width="6" stroke-linecap="round"/><circle cx="136" cy="92" r="4.5" fill="#4CB97F"/><circle cx="184" cy="92" r="4.5" fill="#4CB97F"/><circle cx="160" cy="96" r="8" fill="#E8B88E"/><path d="M152 93q8-9 16 0" fill="#3A2A1E"/></g>
    <g class="pn-ball" style="transform:translate(${bx}px,${by}px) scale(${bs})"><circle r="8" fill="#fff" stroke="#2D4763" stroke-width="1"/><path d="M0-4l4 3-1.5 4.5h-5L-4-1z" fill="#2D4763"/></g>
    ${zones}
    ${fe&&r>=0?`<text class="pn-tag ${r===0?'ok':'no'}" x="160" y="24" text-anchor="middle">${r===0?'هدف!':r===1?'صدّها!':'برّا!'}</text>`:''}</svg>`;}
GAMES.r_pen.after=function(d){r2Spin();const el=app.querySelector('.pn-svg');if(!el||!d.lr)return;const key=el.dataset.key;if(!once('pn'+key))return;
  const b=el.querySelector('.pn-ball'),kp=el.querySelector('.pn-kp'),t=el.querySelector('.pn-tag');
  r2Anim(b,[{transform:'translate(160px,176px) scale(1.25)'},{transform:b.style.transform}],420);
  r2Anim(kp,[{transform:'translateY(0)'},{transform:kp.style.transform}],360,90);
  if(t)r2Anim(t,[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'none'}],300,420);};
HELP.r_pen='ركلات ترجيح للكل مع بعض: كل جولة كل لاعب يسدد ركلة على حارس، ويكون حارس قدام ركلة لاعب ثاني (الأزواج تتبدل كل جولة). اختر الزاوية من المرمى (فوق أو تحت، يسار أو وسط أو يمين) وقوة الركلة، واختر وين ترمي نفسك وأنت حارس، وثبّت. الكل يختار بالسر، وبعدين تنكشف الركلات. الركلة القوية صعب تنصد بس ممكن تطلع برّا، والهادية مضمونة على المرمى بس الحارس يمسكها لو عرف مكانها، والزوايا الفوق أصعب على الحارس وأسهل تطلع. تحت كل اسم تشوف وين يسدد ووين يرمي نفسه، استغلها. كل لاعب يسدد 5 ركلات، واللي يسجل أكثر يفوز، ولو تعادل المتصدرين يكملون ركلات موت مفاجئ لين يتقدم واحد.'+R2TM;

/* =================================================================
   السهام: 301 with a double out. Three darts a turn: tap where to aim on the board, then stop the steadiness meter;
   the nearer the middle, the tighter the throw. The scatter is drawn on the host. Bust (below 0, 1 left, or 0 not
   on a double) puts the score back to where the turn began. With teams a team shares one count.
   ================================================================= */
const DT_N=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
// rings in mm: bull 6.35, outer bull 15.9, treble 99..107, double 162..170
const DT_R=[57,103,134.5,166];
// aim index: seg*4+ring (ring 0 inner single, 1 treble, 2 outer single, 3 double), 80 the bull
const dtAimPt=a=>{if(a>=80)return [0,0];const sg=Math.floor(a/4),rg=a%4,t=(-90+18*sg)*Math.PI/180;return [DT_R[rg]*Math.cos(t),DT_R[rg]*Math.sin(t)];};
const dtAimTx=a=>a>=80?'البُل':(['','T','','D'][a%4]||'')+DT_N[Math.floor(a/4)]+(a%4===0||a%4===2?(a%4===0?' (داخل)':' (برّا)'):'');
// what a dart at (x,y) scores: [points, double?, label]
function dtScore(x,y){const r=Math.hypot(x,y);if(r<=6.35)return [50,true,'بُل 50'];if(r<=15.9)return [25,false,'25'];if(r>170)return [0,false,'برّا'];
  const th=Math.atan2(y,x)*180/Math.PI,sg=((Math.round((th+90)/18)%20)+20)%20,n=DT_N[sg];
  if(r>=99&&r<=107)return [3*n,false,'T'+n];if(r>=162)return [2*n,true,'D'+n];return [n,false,String(n)];}
const dtSig=v=>{const e=Math.abs(v-500)/500;return 10+52*Math.pow(e,1.45);};
const dtSide=(d,s)=>r2Side(d,s);
const dtRem=(d,s)=>d.rem[s];
// the throw itself (on the host): aim a, meter reading v
function dtThrow(d,t,a,v){const [ax,ay]=dtAimPt(a),sg=dtSig(v),x=ax+r2N()*sg,y=ay+r2N()*sg,[p,dbl,lb]=dtScore(x,y);
  const left=d.rem[t]-p,dar=[...d.dar,[+x.toFixed(1),+y.toFixed(1),p,lb]],sid=(d.sid||0)+1;const side=dtSide(d,t);
  const setRem=val=>d.rem.map((r,s)=>dtSide(d,s)===side?val:r);
  if(left<0||left===1||(left===0&&!dbl)){const rem=setRem(d.ts);return dtNext({...d,rem,dar,sid,last:`${nm(d,t)}: ${lb}… تجاوز! يرجع ${d.ts}`});}
  if(left===0)return {...d,rem:setRem(0),dar,sid,win:t,last:`${nm(d,t)} قفل بـ${lb}! 🎯`};
  const x2={...d,rem:setRem(left),dar,sid,last:`${nm(d,t)}: ${lb}${p?` (${p})`:''}`};
  return dar.length>=3?dtNext(x2):x2;}
function dtNext(d){const nx=r2Adv(d,d.turn),rn=d.rn+(nx.nr?1:0);
  if(rn>=d.RN){const w=r2Best(d,d.rem,true);return {...d,turn:nx.turn,rn,win:w,last:d.last+' • خلصت الجولات، الأقل باقي يفوز'};}
  return {...d,turn:nx.turn,rn,dar:[],ts:d.rem[nx.turn]};}
// the checkout a careful player would aim at with r left (null: score big)
function dtPlan(r){if(r===50)return 80;if(r<=40&&r%2===0)return DT_N.indexOf(r/2)*4+3;
  if(r<=41){for(const dd of [32,16,8,40,24,36,20,12,4]){const x=r-dd;if(x>=1&&x<=20)return DT_N.indexOf(x)*4+(x<=20?2:0);}return DT_N.indexOf(1)*4+2;}
  if(r<=60){for(const dd of [40,32,36,24,16]){const x=r-dd;if(x>=1&&x<=20)return DT_N.indexOf(x)*4+2;}}
  if(r<=100&&r-60>=2&&r-60<=40&&(r-60)%2===0)return 1;if(r<=100&&r-57>=2&&r-57<=40&&(r-57)%2===0)return DT_N.indexOf(19)*4+1;
  return 1;}
let R2_DT_SVG=null;
function r2DtBoard(){if(R2_DT_SVG)return R2_DT_SVG;const P=(r0,r1,a0,a1)=>{const c=Math.cos,s=Math.sin,f=x=>x.toFixed(1);a0*=Math.PI/180;a1*=Math.PI/180;
    return `M${f(r0*c(a0))} ${f(r0*s(a0))}L${f(r1*c(a0))} ${f(r1*s(a0))}A${r1} ${r1} 0 0 1 ${f(r1*c(a1))} ${f(r1*s(a1))}L${f(r0*c(a1))} ${f(r0*s(a1))}A${r0} ${r0} 0 0 0 ${f(r0*c(a0))} ${f(r0*s(a0))}Z`;};
  const RG=[[15.9,99],[99,107],[107,162],[162,170]];let s='';
  for(let k=0;k<20;k++){const a0=-99+18*k,a1=a0+18,dk=k%2===0;
    RG.forEach(([r0,r1],g)=>{const c=g%2?(dk?'#D64541':'#2E9A62'):(dk?'#1E2328':'#F3E6C8');s+=`<path class="dt-s" d="${P(r0,r1,a0,a1)}" fill="${c}" data-ga="aim" data-i="${k*4+g}"/>`;});
    const t=(-90+18*k)*Math.PI/180;s+=`<text x="${(188*Math.cos(t)).toFixed(1)}" y="${(188*Math.sin(t)+6).toFixed(1)}" text-anchor="middle" class="dt-n">${DT_N[k]}</text>`;}
  s+=`<circle r="15.9" fill="#2E9A62" data-ga="aim" data-i="80" class="dt-s"/><circle r="6.35" fill="#D64541" data-ga="aim" data-i="80" class="dt-s"/>`;
  return R2_DT_SVG=s;}
GAMES.r_darts={name:'السهام',cat:'sport',lbc:'#8E3B2F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3B2A22"/><circle cx="50" cy="52" r="38" fill="#1E2328"/>${[...Array(20)].map((_,k)=>{const a=(k*18-99)*Math.PI/180,b=a+18*Math.PI/180,c=k%2?'#F3E6C8':'#1E2328',r=33;return `<path d="M50 52L${(50+r*Math.cos(a)).toFixed(1)} ${(52+r*Math.sin(a)).toFixed(1)}A${r} ${r} 0 0 1 ${(50+r*Math.cos(b)).toFixed(1)} ${(52+r*Math.sin(b)).toFixed(1)}Z" fill="${c}"/>`;}).join('')}<circle cx="50" cy="52" r="33" fill="none" stroke="#D64541" stroke-width="4" stroke-dasharray="10.4 10.4"/><circle cx="50" cy="52" r="20" fill="none" stroke="#2E9A62" stroke-width="3.5" stroke-dasharray="6.3 6.3"/><circle cx="50" cy="52" r="5" fill="#D64541"/><path d="M53 49L82 16" stroke="#F0B429" stroke-width="3" stroke-linecap="round"/><path d="M80 13l9-2-3 8z" fill="#4AB1E8"/><path d="M78 19l10-1-6 7z" fill="#EC6158"/></svg>`,
  init:n=>({rem:Array(n).fill(301),ts:301,dar:[],rn:0,RN:15,sid:0,last:''}),
  start:d=>({...d,ts:d.rem[d.turn]}),
  net:{host:['throw'],local:['aim']},redeal:d=>d,
  points:d=>d.rem.map(r=>d.tm?'🎯'+r:r),
  status:(d,ctx)=>r2Stat(d,ctx,`<small>الجولة ${Math.min(d.rn+1,d.RN)} من ${d.RN} • السهم ${Math.min(d.dar.length+1,3)} من 3</small><br>`),
  winExtra:d=>'الباقي: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.rem[s]}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,a=r2Dr('da',0,80,1),key=d.gid+':'+(d.sid||0),sv=r2Stopped(key);
    const [ax,ay]=dtAimPt(a),r=d.rem[t],plan=r<=170?dtPlan(r):null;
    let s=`<div class="r2 r2dt"><div class="dt-top"><div class="dt-big" style="--c:${col(d,t)}"><small>باقي ${nm(d,t)}</small><b>${r}</b></div><div class="dt-turn">${[0,1,2].map(k=>{const x=d.dar[k];return `<span class="${x?'on':''}">${x?x[3]:'—'}</span>`;}).join('')}</div></div>`;
    s+=`<svg class="dt-svg ${my?'can':''}" viewBox="-205 -205 410 410" data-k="dts"><circle r="204" fill="#3B2A22"/><circle r="200" fill="#1E2328"/>${r2DtBoard()}
      ${d.dar.map((x,k)=>`<g class="dt-dart ${k===d.dar.length-1?'last':''}" data-k="dd${d.sid}-${k}" style="transform:translate(${x[0]}px,${x[1]}px)"><circle r="5" fill="#fff" stroke="#111" stroke-width="2"/><path d="M0 0l22-22" stroke="#F0B429" stroke-width="4"/><path d="M18-26l12-4-4 12z" fill="${col(d,t)}"/></g>`).join('')}
      ${my?`<g class="dt-aim" style="transform:translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px)"><circle r="13" fill="none" stroke="#FFD84D" stroke-width="3"/><path d="M-20 0h12M8 0h12M0-20v12M0 8v12" stroke="#FFD84D" stroke-width="3"/></g>`:''}</svg>`;
    if(my){const m=r2mPar(key,1150);
      s+=`<p class="r2lbl">🎯 تصوّب على: <b>${dtAimTx(a)}</b>${plan!=null&&plan!==a?` <button class="sm" data-ga="aim" data-i="${plan}">اقتراح: ${dtAimTx(plan)}</button>`:''}</p>
        ${r2Meter(key,m,[[0,1000,'z0'],[330,670,'z1'],[430,570,'z2']],sv==null,sv,'ثبات اليد: وقّف المؤشر في النص')}
        ${r2Stop(key,'throw','🎯 ارمِ',sv==null)}`;}
    s+=`<div class="dt-list">${d.pl.map((_,i)=>`<span class="${i===t?'on':''}" style="--c:${col(d,i)}">${nm(d,i)} <b>${d.rem[i]}</b></span>`).join('')}</div>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='aim'){if(!(Number.isInteger(i)&&i>=0&&i<=80))return;S.draft.da=String(i);render();return;}
    if(a!=='throw')return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(dtThrow(d,d.turn,r2Dr('da',0,80,1),v));},
  bot(d,s,lv){const r=d.rem[s];let a=lv===1&&!(r<=40&&Math.random()<.5)?(Math.random()<.6?2:rnd(20)*4+2):dtPlan(r);
    if(lv===2&&r>60&&Math.random()<.4)a=2;return dtThrow(d,s,a,r2BotStop(500,lv));},
  onTimeout:d=>{const rem=d.rem.map((r,s)=>dtSide(d,s)===dtSide(d,d.turn)?d.ts:r);return dtNext({...d,rem,last:`${nm(d,d.turn)} ما رمى`});},
  after(d){r2Spin();const g=app.querySelector('.dt-dart.last');if(g&&once('dt'+g.dataset.k))r2Anim(g,[{opacity:0,transform:g.style.transform+' scale(2.2)'},{opacity:1,transform:g.style.transform}],300);}
};
HELP.r_darts='سهام 301: كل لاعب يبدأ من 301 وينقص منها اللي يجيبه. بدورك 3 سهام: اضغط على المكان اللي تبي تصوّب عليه في اللوحة (الحلقة الرفيعة البرّانية دبل ×2، والداخلية تربل ×3، والنص بُل 25 و50)، وبعدين وقّف مؤشر ثبات اليد: كل ما وقّفته أقرب للنص كان سهمك أقرب للمكان اللي تبيه. لازم تقفل على صفر بالضبط وبآخر سهم على دبل (أو البُل 50). لو نزلت تحت الصفر أو بقى معك 1 أو وصلت صفر بدون دبل «تتجاوز» ويرجع رقمك مثل ما كان أول الدور. أول واحد يقفل يفوز، ولو خلصت 15 جولة يفوز الأقل باقي. فيه زر اقتراح يعطيك التشطيب المناسب. ولو لعبتوا فرق، الفريق يتشارك رقم واحد ويرمون بالتناوب.';

/* =================================================================
   البولينج: 10 frames with strikes, spares and the bonus balls of the 10th. Each ball: where to aim on the lane, how much
   hook, then the release meter. The ball runs where it is released; pins it meets fall and knock others on (a hook gives
   more pin action but swings more). Every player bowls a whole frame, then the next one.
   ================================================================= */
const BW_X=[0,-1,1,-2,0,2,-3,-1,1,3],BW_Y=[0,1,1,2,2,2,3,3,3,3];
const BW_SP=['مستقيمة','لفّة خفيفة','لفّة قوية'];
// one ball on the pins left (pn: '1' standing): aim in lane units (-4..4), spin 0..2, meter v; R the dice (host or a bot's guess)
function bwRoll(pn,aim,spin,v,R){const g=()=>{let u=0;while(!u)u=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*R());};
  const e=aim+(v-500)/500*3+g()*.18+g()*[0,.3,.55][spin];if(Math.abs(e)>4.4)return {e:+e.toFixed(2),down:'0000000000',gut:1};
  const st=[...pn].map(c=>c==='1'),dn=Array(10).fill(false),Q=[],ae=Math.abs(e),full=!pn.includes('0');
  // the pocket (between the head pin and the next) carries the pins on; full on the head pin they fly apart (splits)
  const pc=.62+[0,.1,.16][spin]+(full&&ae>.35&&ae<1.05?.14:0)-(full&&ae<.3?.12:0);
  for(let k=0;k<10;k++)if(st[k]&&Math.abs(BW_X[k]-e)<1.15){dn[k]=true;const dx=BW_X[k]-e;Q.push([k,Math.abs(dx)<.15?0:Math.sign(dx)]);}
  const at=(x,y)=>{for(let k=0;k<10;k++)if(BW_X[k]===x&&BW_Y[k]===y)return k;return -1;};
  const hit=(k,dir,p)=>{if(k<0||!st[k]||dn[k]||R()>=p)return;dn[k]=true;Q.push([k,dir]);};
  for(let q=0;q<Q.length&&q<40;q++){const [k,dir]=Q[q],x=BW_X[k],y=BW_Y[k];
    if(dir){hit(at(x+dir,y+1),dir,pc);hit(at(x+2*dir,y),dir,.2);hit(at(x,y+2),dir,.25);}
    else{hit(at(x-1,y+1),-1,pc*.85);hit(at(x+1,y+1),1,pc*.85);}}
  return {e:+e.toFixed(2),down:dn.map(x=>x?'1':'0').join('')};}
// the frames of a list of balls: [[balls…]…]; and whether frame f is finished
function bwFrames(r){const F=[];let i=0;for(let f=0;f<10&&i<r.length;f++){if(f<9){if(r[i]===10){F.push([10]);i++;}else{F.push(r.slice(i,i+2));i+=2;}}else{F.push(r.slice(i,i+3));i+=3;}}return F;}
const bwDone=(F,f)=>{const x=F[f];if(!x)return false;if(f<9)return x[0]===10||x.length===2;return x.length===3||(x.length===2&&x[0]!==10&&x[0]+x[1]<10);};
// the running total after each frame (null while a bonus is still to come)
function bwCum(r){const F=bwFrames(r),out=[];let tot=0,i=0,ok=true;
  for(let f=0;f<F.length;f++){const x=F[f];let v=null;
    if(f===9)v=bwDone(F,9)?x.reduce((a,b)=>a+b,0):null;
    else if(x[0]===10)v=r.length>=i+3?10+r[i+1]+r[i+2]:null;
    else if(x.length===2)v=x[0]+x[1]===10?(r.length>=i+3?10+r[i+2]:null):x[0]+x[1];
    i+=x.length;if(v==null)ok=false;if(ok){tot+=v;out.push(tot);}else out.push(null);}
  return out;}
const bwTotal=r=>{const c=bwCum(r).filter(x=>x!=null);return c.length?c[c.length-1]:0;};
// the marks of one frame: X, /, - or the number
function bwMarks(x,f){const o=[];for(let j=0;j<x.length;j++){const v=x[j],prev=j>0?x[j-1]:null;
    const fresh=j===0||(f===9&&(prev===10||(j===2&&x[0]!==10&&x[0]+x[1]===10)||(j===2&&x[0]===10&&x[1]===10)));
    o.push(v===10&&fresh?'X':!fresh&&prev+v===10?'/':v===0?'-':String(v));}return o;}
function bwPlay(d,t,aim,spin,v){const res=bwRoll(d.pn,aim,spin,v,Math.random),k=[...res.down].filter(c=>c==='1').length;
  const rolls=d.rolls.map((x,s)=>s===t?[...x,k]:x),F=bwFrames(rolls[t]),f=d.fr,x=F[f]||[];
  const pnLeft=[...d.pn].map((c,j)=>c==='1'&&res.down[j]!=='1'?'1':'0').join(''),full=d.pn==='1111111111';
  const tx=res.gut?'في القناة 😬':full&&k===10?'سترايك! 🎳':!pnLeft.includes('1')?'سبير! ✨':`${k} ${k===1?'قارورة':'قوارير'}`;
  const lx={e:res.e,down:res.down,pn:d.pn,aim,gut:res.gut?1:0,id:(d.sid||0)+1};
  const nd={...d,rolls,sid:(d.sid||0)+1,lx,last:`${nm(d,t)}: ${tx}`};
  if(!bwDone(F,f)){let pn=pnLeft;if(f===9){const a=x[0],b=x[1];if(x.length===1&&a===10)pn='1111111111';if(x.length===2&&((a===10&&b===10)||(a!==10&&a+b===10)))pn='1111111111';}
    return {...nd,pn};}
  const nx=r2Adv(d,t),fr=d.fr+(nx.nr?1:0);
  if(fr>=10)return {...nd,pn:'1111111111',win:r2Best(nd,nd.rolls.map((r,s)=>nd.out[s]==='1'?null:bwTotal(r)))};
  return {...nd,turn:nx.turn,fr,pn:'1111111111'};}
const bwAim=()=>r2Dr('ba',0,16,9),bwSpin=()=>r2Dr('bs',0,2,1);
// a bot tries every aim and hook on its own guess of how steady it is, and keeps the best (a strike counts extra on a full rack)
function bwBot(d,s,lv){if(lv===1)return [8+rnd(3),rnd(3)];const R=mulberry(seedOf(d.gid+s+':'+(d.sid||0))),full=d.pn==='1111111111',N=lv===3?14:5;let best=null;
  const g=()=>{let u=0;while(!u)u=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*R());};
  for(let a=0;a<=16;a++)for(let sp=0;sp<3;sp++){let e=0;for(let k=0;k<N;k++){const v=r2Clamp(500+g()*R2SIG[lv],0,1000),o=bwRoll(d.pn,(a-8)/2,sp,v,R);
      const c=[...o.down].filter(c=>c==='1').length,left=[...d.pn].filter((c,j)=>c==='1'&&o.down[j]!=='1').length;e+=c+(left===0?(full?4:2):0);}
    e=e/N+(lv===2?R()*.8:0);if(!best||e>best[0])best=[e,a,sp];}
  return [best[1],best[2]];}
GAMES.r_bowl={name:'البولينج',cat:'sport',lbc:'#5B3FA0',
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="r2bw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9C48C"/><stop offset="1" stop-color="#C9955A"/></linearGradient></defs><rect width="100" height="100" fill="#4A3290"/><path d="M28 100L40 0h20l12 100z" fill="url(#r2bw)"/>${[[50,22],[44,30],[56,30],[38,38],[50,38],[62,38]].map(([x,y])=>`<ellipse cx="${x}" cy="${y+5}" rx="4.6" ry="2" fill="rgba(0,0,0,.2)"/><path d="M${x-3} ${y+4}q-1-7 1.6-9.5q-1.2-3 1.4-4.5q2.6 1.5 1.4 4.5q2.6 2.5 1.6 9.5z" fill="#fff"/><rect x="${x-2.2}" y="${y-3}" width="4.4" height="1.4" fill="#E5534B"/>`).join('')}<circle cx="52" cy="78" r="13" fill="#2F80ED"/><circle cx="48" cy="73" r="2" fill="#173F78"/><circle cx="54" cy="72" r="2" fill="#173F78"/><circle cx="52" cy="78" r="2" fill="#173F78"/><circle cx="47" cy="72" r="6" fill="#fff" opacity=".18"/></svg>`,
  init:n=>({rolls:Array(n).fill(0).map(()=>[]),fr:0,pn:'1111111111',sid:0,lx:null,last:''}),
  net:{host:['roll'],local:['ba','bs']},redeal:d=>d,
  points:d=>d.rolls.map(r=>bwTotal(r)),
  status:(d,ctx)=>r2Stat(d,ctx,`<small>الإطار ${Math.min(d.fr+1,10)} من 10</small><br>`),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${bwTotal(d.rolls[s])}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,a=bwAim(),sp=bwSpin(),key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx;
    const X=x=>70+x*9,PY=k=>40+BW_Y[k]*13;
    // pins: the rack as it stood for the last ball, the ones it knocked shown lying down, the others standing
    const showPn=L&&L.pn&&!(my&&d.pn==='1111111111'&&L.pn!==d.pn)?L.pn:d.pn,fall=showPn===(L&&L.pn)?L.down:'0000000000';
    const pin=(k,dn)=>`<g class="bw-pin ${dn?'dn':''}" style="transform:translate(${X(BW_X[k])}px,${PY(k)}px)${dn?` rotate(${BW_X[k]<0?-70:70}deg)`:''}"><ellipse cx="0" cy="2.4" rx="4.6" ry="2.2" fill="rgba(0,0,0,.18)"/><circle r="4.4" fill="#fff" stroke="#C9D3DE" stroke-width=".8"/><circle r="2.5" fill="none" stroke="#E5534B" stroke-width="1.1"/></g>`;
    let s=`<div class="r2 r2bw"><svg class="bw-svg" viewBox="0 0 140 250" data-k="bws" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="bwl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9A86A"/><stop offset=".5" stop-color="#EBCB95"/><stop offset="1" stop-color="#D9A86A"/></linearGradient></defs>
      <rect width="140" height="250" fill="#2B2440"/><rect x="21" y="8" width="98" height="242" fill="#3E3557"/><rect x="21" y="8" width="9" height="242" fill="#575073"/><rect x="110" y="8" width="9" height="242" fill="#575073"/>
      <rect x="30" y="8" width="80" height="242" fill="url(#bwl)"/>${[...Array(9)].map((_,k)=>`<path d="M${38+k*8} 8V250" stroke="#B9874E" stroke-width=".5" opacity=".6"/>`).join('')}
      <rect x="30" y="8" width="80" height="16" fill="#1E1A2E" opacity=".5"/>${[-3,-2,-1,0,1,2,3].map(x=>`<path d="M${X(x)} 168l-2.4 5h4.8z" fill="#5B3FA0" opacity=".75"/>`).join('')}<path d="M30 222h80" stroke="#8B2E2E" stroke-width="1.4"/>
      ${my?`<path class="bw-line" d="M${X((a-8)/2)} 222V40" stroke="#FFD84D" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M${X((a-8)/2)} 228l-4 7h8z" fill="#FFD84D"/>`:''}
      ${[...Array(10).keys()].filter(k=>showPn[k]==='1'&&fall[k]!=='1').map(k=>pin(k,false)).join('')}${[...Array(10).keys()].filter(k=>fall[k]==='1').map(k=>pin(k,true)).join('')}
      ${L&&showPn===L.pn?`<g class="bw-ball" style="transform:translate(${r2Clamp(X(L.e),26,114)}px,${L.gut?100:26}px)"><circle r="6.2" fill="#2F80ED"/><circle cx="-1.6" cy="-2" r="1" fill="#173F78"/><circle cx="1.4" cy="-2.3" r="1" fill="#173F78"/><circle cx="0" cy=".4" r="1" fill="#173F78"/></g>`:''}</svg>`;
    // the score sheet: one row per bowler, ten frames, the running totals
    s+=`<div class="bw-sheet">${d.pl.map((_,i)=>{const F=bwFrames(d.rolls[i]),C=bwCum(d.rolls[i]);
      return `<div class="bw-row ${i===t&&d.win==null?'on':''}" style="--c:${col(d,i)}"><b>${nm(d,i)}</b>${[...Array(10).keys()].map(f=>{const x=F[f]||[],m=bwMarks(x,f);return `<span class="${f===9?'ten':''}"><i>${[0,1,2].slice(0,f===9?3:2).map(j=>`<u>${m[j]||''}</u>`).join('')}</i><em>${C[f]!=null?C[f]:''}</em></span>`;}).join('')}</div>`;}).join('')}</div>`;
    if(my){const m=r2mPar(key,1100);
      s+=`<div class="r2row"><button class="btn soft" data-ga="ba" data-i="${a-1}" ${a>0?'':'disabled'}>◀</button><span class="r2lbl">التصويب</span><button class="btn soft" data-ga="ba" data-i="${a+1}" ${a<16?'':'disabled'}>▶</button></div>
        ${r2Seg('bs',BW_SP,sp,true)}
        ${r2Meter(key,m,[[0,1000,'z0'],[300,700,'z1'],[410,590,'z2']],sv==null,sv,'الإطلاق: وقّف المؤشر في النص')}
        ${r2Stop(key,'roll','🎳 ارمِ الكرة',sv==null)}`;}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='ba'){if(Number.isInteger(i)&&i>=0&&i<=16){S.draft.ba=String(i);render();}return;}
    if(a==='bs'){if(Number.isInteger(i)&&i>=0&&i<3){S.draft.bs=String(i);render();}return;}
    if(a!=='roll')return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(bwPlay(d,d.turn,(bwAim()-8)/2,bwSpin(),v));},
  bot(d,s,lv){const [a,sp]=bwBot(d,s,lv);return bwPlay(d,s,(a-8)/2,sp,r2BotStop(500,lv));},
  onTimeout:d=>bwPlay(d,d.turn,0,0,0),
  after(d){r2Spin();const el=app.querySelector('.bw-svg');if(!el||!el.dataset.key||!once('bw'+el.dataset.key))return;const L=d.lx;if(!L)return;
    const b=el.querySelector('.bw-ball');if(b)r2Anim(b,[{transform:`translate(${70+L.aim*9}px,236px) scale(1.15)`},{transform:b.style.transform}],420,0,'cubic-bezier(.35,.1,.5,1)');
    el.querySelectorAll('.bw-pin.dn').forEach((p,k)=>r2Anim(p,[{opacity:1,transform:p.style.transform.replace(/ rotate\(.*$/,'')},{opacity:.4,transform:p.style.transform}],300,300+k*12));}
};
HELP.r_bowl='بولينج 10 إطارات. في كل إطار عندك رميتين تطيّح فيها العشر قوارير. قبل الرمية حرّك مكان التصويب بالأسهم، واختر الكرة: مستقيمة (أدق، زينة للسبير) أو بلفّة (تطيّح قوارير أكثر لما تضرب «الجيب» بين القارورة الأولى والثالثة، بس تميل أكثر)، وبعدين وقّف مؤشر الإطلاق في النص: كل ما بعد عن النص راحت الكرة يمين أو يسار عن تصويبك. سترايك (العشر من أول رمية) = 10 + الرميتين اللي بعدها، وسبير (العشر برميتين) = 10 + الرمية اللي بعدها. في الإطار العاشر لو جبت سترايك أو سبير تاخذ رميات زيادة. كل لاعب يلعب إطاره كامل وبعدين اللي بعده، والأعلى مجموع بعد 10 إطارات يفوز.'+R2TM;

/* =================================================================
   الغولف الصغير: a few generated holes with walls, sand and water. Aim (tap the green or turn the arrow), then stop the
   power meter. The roll is worked out on the host (a little tremor drawn there) and played back. Strokes alternate between
   the players still on the hole; 6 strokes at most (then it counts 7). The fewest strokes over all holes wins.
   ================================================================= */
const GL_W=100,GL_H=130,GL_BR=1.6;
// a hole: walls [x,y,w,h], sand, water, the tee and the cup, from the game's seed
function glHole(gid,h){const R=mulberry(seedOf(gid+':gl'+h)),T=(seedOf(gid+':glo')+h)%6,mir=R()<.5,W=[],SA=[],WA=[];let tee=[50,118],cup=[50,16];
  const f=r=>mir?[GL_W-r[0]-r[2],r[1],r[2],r[3]]:r;
  if(T===0){const x=28+R()*24;W.push([x,62,22,6]);if(R()<.6)SA.push([18,22,24,12]);}
  else if(T===1){W.push(f([0,64,60+R()*8,6]));tee=mir?[78,118]:[22,118];cup=mir?[78,18]:[22,18];SA.push(f([66,28,28,12]));}
  else if(T===2){W.push(f([0,88,58,6]));W.push(f([42,44,58,6]));tee=mir?[80,118]:[20,118];cup=mir?[20,18]:[80,18];}
  else if(T===3){SA.push([28,26+R()*6,44,12]);W.push(f([14+R()*10,72,16,6]));W.push(f([66,58,14,6]));}
  else if(T===4){const gx=16+R()*48;WA.push([0,64,gx,14]);WA.push([gx+20,64,GL_W-gx-20,14]);cup=[20+R()*60,18];}
  else{for(let k=0;k<4;k++)W.push([12+R()*66,30+k*20+R()*6,9,9]);}
  return {W,SA,WA,tee,cup};}
// the roll: from (x,y) at angle a (degrees, 0 = up the screen, clockwise) and power p (0..1000); n counts the steps (bots)
function glSim(c,x,y,a,p,rec,n){const t=a*Math.PI/180;let sp=.25+p/1000*3.1,ux=Math.sin(t),uy=-Math.cos(t);const path=rec?[[+x.toFixed(1),+y.toFixed(1)]]:null;
  const B=[[-10,-10,GL_W+20,10],[-10,GL_H,GL_W+20,10],[-10,0,10,GL_H],[GL_W,0,10,GL_H],...c.W];const inR=(r,px,py)=>px>r[0]&&px<r[0]+r[2]&&py>r[1]&&py<r[1]+r[3];
  let st=0,res=null;
  while(st<1500){st++;const sub=Math.max(1,Math.ceil(sp/.5));
    for(let k=0;k<sub;k++){x+=ux*sp/sub;y+=uy*sp/sub;
      for(const r of B){const cx=r2Clamp(x,r[0],r[0]+r[2]),cy=r2Clamp(y,r[1],r[1]+r[3]),dx=x-cx,dy=y-cy,dd=Math.hypot(dx,dy);
        if(dd<GL_BR){if(dd<1e-6){const l=x-r[0],rr=r[0]+r[2]-x,tp=y-r[1],bt=r[1]+r[3]-y,m=Math.min(l,rr,tp,bt);if(m===l||m===rr){ux=-ux;x+=m===l?-(l+GL_BR):rr+GL_BR;}else{uy=-uy;y+=m===tp?-(tp+GL_BR):bt+GL_BR;}}
          else{const nx=dx/dd,ny=dy/dd,dot=ux*nx+uy*ny;if(dot<0){ux-=2*dot*nx;uy-=2*dot*ny;sp*=.8;}x=cx+nx*GL_BR;y=cy+ny*GL_BR;}}}
      if(c.WA.some(r=>inR(r,x,y))){res={x,y,wat:1};break;}
      if(Math.hypot(x-c.cup[0],y-c.cup[1])<2.3&&sp<1.5){res={x:c.cup[0],y:c.cup[1],in:1};break;}}
    if(res)break;
    const sand=c.SA.some(r=>inR(r,x,y));sp=sp*(sand?.93:.985)-.006;if(rec&&st%5===0)path.push([+x.toFixed(1),+y.toFixed(1)]);if(sp<.02)break;}
  if(n)n.c+=st;res=res||{x,y};res.x=+r2Clamp(res.x,1,GL_W-1).toFixed(2);res.y=+r2Clamp(res.y,1,GL_H-1).toFixed(2);if(rec){path.push([res.x,res.y]);res.path=path;}return res;}
const glN=n=>n<=4?6:n<=6?4:3;
const glAng=(x,y,c)=>((Math.round(Math.atan2(c[0]-x,-(c[1]-y))*180/Math.PI)%360)+360)%360;
function glStart(d,h){const c=glHole(d.gid,h);return {...d,hl:h,bx:d.pl.map(()=>c.tee[0]),by:d.pl.map(()=>c.tee[1]),sk:Array(d.pl.length).fill(0),hin:d.out.replace(/0/g,'.').replace(/1/g,'x')};}
// one stroke on the host: a little tremor in the aim and the power
function glPlay(d,t,a,v){const c=glHole(d.gid,d.hl),aa=a+r2N()*.7,pp=r2Clamp(v*(1+r2N()*.015),0,1000);
  const r=glSim(c,d.bx[t],d.by[t],aa,pp,true);const bx=[...d.bx],by=[...d.by],sk=[...d.sk];let hin=d.hin,tx;sk[t]++;
  if(r.wat){sk[t]++;tx=`${nm(d,t)}: طاحت الكرة بالماي 💦 (+1)`;}else{bx[t]=r.x;by[t]=r.y;tx=r.in?`${nm(d,t)} دخّلها! ⛳ (${sk[t]} ${sk[t]===1?'ضربة':'ضربات'})`:`${nm(d,t)} ضرب`;}
  if(!r.in&&sk[t]>=6){sk[t]=7;hin=setAt(hin,t,'1');tx+=' • خلصت ضرباته (7)';}if(r.in)hin=setAt(hin,t,'1');
  const lx={s:t,path:r.path,id:(d.sid||0)+1};let x={...d,bx,by,sk,hin,lx,sid:(d.sid||0)+1,last:tx};
  if(hin[t]==='1')x={...x,sc:x.sc.map((q,s)=>s===t?[...q,sk[t]]:q)};
  return glNext(x,t);}
function glNext(x,t){const o=r2Ord(x).filter(s=>x.hin[s]==='.');
  if(!o.length){if(x.hl+1>=x.H)return {...x,win:r2Best(x,x.sc.map((q,s)=>x.out[s]==='1'?null:q.reduce((p,r)=>p+r,0)*1000+q.slice(Math.floor(q.length/2)).reduce((p,r)=>p+r,0)*20+(q[q.length-1]||0)),true)};
    const y=glStart(x,x.hl+1),st=r2Ord(y);return {...y,lx:null,turn:st[(x.hl+1)%st.length],last:x.last+` • الحفرة ${x.hl+2}`};}
  const n=x.pl.length,rel=s=>(s-t+n)%n;return {...x,turn:o.slice().sort((a,b)=>(rel(a)||n)-(rel(b)||n))[0]};}
// a bot tries many strokes (it counts the steps, so it never thinks for long) and keeps the one that ends nearest the cup
function glBot(d,s,lv){const c=glHole(d.gid,d.hl),x=d.bx[s],y=d.by[s],a0=glAng(x,y,c.cup),dist=Math.hypot(c.cup[0]-x,c.cup[1]-y);
  const cap={c:0},max=[0,12000,60000,160000][lv];let best=null;
  const tryS=(a,p)=>{if(cap.c>max)return;const r=glSim(c,x,y,a,p,false,cap);const sc=r.in?-100:r.wat?200:Math.hypot(r.x-c.cup[0],r.y-c.cup[1]);if(!best||sc<best[0])best=[sc,a,p];};
  const pd=r2Clamp(Math.round(dist*5.2+30),40,1000);
  for(const da of [0,-3,3,-8,8,-15,15,-25,25,-40,40,-60,60,-90,90,-120,120,180])for(const f of [1,.8,1.25,1.6,.6,2.2])tryS((a0+da+360)%360,r2Clamp(pd*f,0,1000));
  if(lv>1)for(let k=0;k<60&&cap.c<=max;k++)tryS((best[1]+r2N()*4+360)%360,r2Clamp(best[2]*(1+r2N()*.1),0,1000));
  const er=[0,7,3,1.2][lv];return [Math.round((best[1]+r2N()*er+720)%360),r2BotStop(best[2],lv)];}
const glA=(d,t)=>{const c=glHole(d.gid,d.hl);return r2Dr('ga',0,359,glAng(d.bx[t],d.by[t],c.cup));};
GAMES.r_golf={name:'الغولف الصغير',cat:'sport',lbc:'#3E9D4A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E7D3A"/><rect x="10" y="10" width="80" height="80" rx="10" fill="#5CC27E"/><path d="M10 50h44v8H10z" fill="#9B6B3D"/><rect x="58" y="22" width="22" height="12" rx="6" fill="#E9D7A6"/><circle cx="30" cy="28" r="5" fill="#173A1E"/><path d="M30 28V8" stroke="#fff" stroke-width="2.4"/><path d="M30 8l14 5-14 5z" fill="#EC6158"/><circle cx="66" cy="76" r="5" fill="#fff" stroke="#C9D3DE"/><path d="M66 76L38 34" stroke="#fff" stroke-width="2" stroke-dasharray="4 3" opacity=".8"/></svg>`,
  init:n=>({hl:0,H:glN(n),sc:Array(n).fill(0).map(()=>[]),bx:[],by:[],sk:[],hin:'',sid:0,lx:null,last:''}),
  start:d=>({...glStart(d,0),turn:d.turn}),
  net:{host:['hit'],local:['ga']},redeal:d=>d,
  points:d=>d.sc.map((q,s)=>q.reduce((p,r)=>p+r,0)+(d.hin[s]==='.'?d.sk[s]:0)),
  status:(d,ctx)=>r2Stat(d,ctx,`<small>الحفرة ${d.hl+1} من ${d.H}${d.win==null?` • الضربة ${(d.sk[d.turn]||0)+1}`:''}</small><br>`),
  winExtra:d=>'الضربات: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.sc[s].reduce((p,q)=>p+q,0)}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,c=glHole(d.gid,d.hl),key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),a=glA(d,t),L=d.lx;
    let s=`<div class="r2 r2gl"><svg class="gl-svg ${my?'can':''}" viewBox="-4 -4 108 138" data-k="gls${d.hl}" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="glg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63C77F"/><stop offset="1" stop-color="#47A862"/></linearGradient><pattern id="glw" width="8" height="5" patternUnits="userSpaceOnUse"><path d="M0 3q2-2 4 0t4 0" stroke="#fff" stroke-width=".5" fill="none" opacity=".5"/></pattern></defs>
      <rect x="-4" y="-4" width="108" height="138" rx="5" fill="#8A5A2B"/><rect x="-2" y="-2" width="104" height="134" rx="4" fill="#A8743F"/><rect width="100" height="130" fill="url(#glg)"/>${[0,1,2,3,4,5,6].map(k=>`<rect y="${k*20}" width="100" height="10" fill="#fff" opacity=".05"/>`).join('')}
      ${c.SA.map(r=>`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="5" fill="#E9D7A6" stroke="#D2BA7F" stroke-width=".6"/>`).join('')}
      ${c.WA.map(r=>`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="#3C8DCB"/><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="url(#glw)"/>`).join('')}
      ${c.W.map(r=>`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="1" fill="#9B6B3D"/><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="1.4" fill="#C49261"/>`).join('')}
      <rect x="${c.tee[0]-6}" y="${c.tee[1]-4}" width="12" height="8" rx="2" fill="#2E8B57" opacity=".7"/>
      <circle cx="${c.cup[0]}" cy="${c.cup[1]}" r="2.6" fill="#173A1E"/><path d="M${c.cup[0]} ${c.cup[1]}V${c.cup[1]-13}" stroke="#fff" stroke-width=".9"/><path d="M${c.cup[0]} ${c.cup[1]-13}l8 2.6-8 2.6z" fill="#EC6158"/>
      ${my?`<path class="gl-aim" d="M${d.bx[t]} ${d.by[t]}l${(Math.sin(a*Math.PI/180)*26).toFixed(1)} ${(-Math.cos(a*Math.PI/180)*26).toFixed(1)}" stroke="#fff" stroke-width="1" stroke-dasharray="2.4 2" stroke-linecap="round"/>`:''}
      ${d.pl.map((_,i)=>{const done=d.hin[i]==='1';if(d.hin[i]==='x'||(done&&!(L&&L.s===i)))return '';
        return `<g class="gl-ball ${i===t&&d.win==null?'on':''} ${L&&L.s===i?'mv':''}" style="transform:translate(${done?c.cup[0]:d.bx[i]}px,${done?c.cup[1]:d.by[i]}px)">${i===t&&d.win==null?'<circle r="3.6" fill="none" stroke="#FFD84D" stroke-width=".8"/>':''}<circle r="${GL_BR}" fill="#fff" stroke="${col(d,i)}" stroke-width="1"/></g>`;}).join('')}</svg>`;
    s+=`<div class="gl-card" style="--h:${d.H}"><span></span>${[...Array(d.H).keys()].map(h=>`<span class="hd ${h===d.hl?'on':''}">${h+1}</span>`).join('')}<span class="hd">∑</span>
      ${d.pl.map((_,i)=>`<b style="color:${col(d,i)}">${nm(d,i)}</b>${[...Array(d.H).keys()].map(h=>`<span class="${h===d.hl?'on':''}">${d.sc[i][h]!=null?d.sc[i][h]:h===d.hl&&d.sk[i]?`<i>${d.sk[i]}</i>`:''}</span>`).join('')}<span><b>${d.sc[i].reduce((p,q)=>p+q,0)}</b></span>`).join('')}</div>`;
    if(my){const m=r2mPar(key,1500);
      s+=`<p class="r2lbl">اضغط على الملعب عشان تصوّب، أو عدّل بالأسهم</p><div class="r2row">${[[-10,'⟲ 10'],[-2,'⟲ 2'],[2,'2 ⟳'],[10,'10 ⟳']].map(([k,tx])=>`<button class="btn soft" data-ga="ga" data-i="${(a+k+360)%360}">${tx}</button>`).join('')}</div>
        ${r2Meter(key,m,[[0,1000,'zl'],[0,250,'z2'],[250,550,'z1'],[550,1000,'z0']],sv==null,sv,'القوة: وقّف المؤشر على القوة اللي تبيها')}
        ${r2Stop(key,'hit','⛳ اضرب',sv==null)}`;}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='ga'){if(Number.isInteger(i)&&i>=0&&i<360){S.draft.ga=String(i);render();}return;}
    if(a!=='hit')return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(glPlay(d,d.turn,glA(d,d.turn),v));},
  bot(d,s,lv){const [a,v]=glBot(d,s,lv);return glPlay(d,s,a,v);},
  onTimeout:d=>{const t=d.turn,sk=[...d.sk];sk[t]++;let x={...d,sk,last:`${nm(d,t)} ما ضرب (+1)`};if(sk[t]>=6){sk[t]=7;x={...x,sk,hin:setAt(d.hin,t,'1'),sc:x.sc.map((q,s)=>s===t?[...q,7]:q)};}return glNext(x,t);},
  onSkip:(nd,d)=>{let hin=nd.hin;for(let s=0;s<nd.pl.length;s++)if(nd.out[s]==='1'&&hin[s]==='.')hin=setAt(hin,s,'x');const x={...nd,hin};if(x.win!=null)return x;return hin[x.turn]==='.'?x:glNext(x,x.turn);},
  after(d,ctx){r2Spin();const el=app.querySelector('.gl-svg');if(!el)return;
    // aiming by touch: the arrow turns toward the finger (this phone only, until the stroke)
    if(!el._b){el._b=1;el.addEventListener('pointerdown',e=>{const d=S.st.d,c=mkCtx();if(!d||d.win!=null||!c.my||!el.classList.contains('can')||!d.bx)return;const m=el.getScreenCTM();if(!m)return;const p=el.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(m.inverse()),t=d.turn;
      S.draft.ga=String(((Math.round(Math.atan2(q.x-d.bx[t],-(q.y-d.by[t]))*180/Math.PI)%360)+360)%360);render();});}
    const L=d.lx;if(!L||!L.path||!el.dataset.key||!once('gl'+el.dataset.key))return;const b=el.querySelector('.gl-ball.mv');if(!b)return;const P=L.path;
    const k=Math.max(1,Math.ceil(P.length/28)),fr=P.filter((_,j)=>j%k===0||j===P.length-1).map(([x,y])=>({transform:`translate(${x}px,${y}px)`}));
    r2Play(Math.min(1200,180+P.length*14),ms=>{b.animate(fr,{duration:ms,easing:'cubic-bezier(.2,.6,.4,1)'});});}
};
HELP.r_golf='غولف صغير على حفر جديدة كل مرة، فيها جدران تقدر ترتد عليها، ورمل يبطّي الكرة، ومويه لو طاحت فيها الكرة تنحسب عليك ضربة زيادة وترجع مكانك. بدورك صوّب: اضغط على الملعب بالاتجاه اللي تبيه أو عدّل بالأسهم، وبعدين وقّف مؤشر القوة على القوة اللي تبيها (الكرة السريعة تمر فوق الحفرة وما تدخل). اللاعبين يضربون بالتناوب، واللي دخّل كرته يستنى الباقين. أكثر شي 6 ضربات بالحفرة، ولو ما دخلت تنحسب 7. بعد آخر حفرة الأقل ضربات يفوز، ولو تعادلوا يفوز الأحسن في الحفر الأخيرة. ولو لعبتوا فرق، الفريق اللي معدّل ضرباته أقل يفوز.';

/* =================================================================
   السلة (عصفور): the leader picks a spot and shoots; if it goes in, every other player must make the same shot or take a
   letter of «عصفور». A miss by the leader passes the lead on. Five letters and you are out; the last one in wins.
   The same spot may not be set twice in a row. A shot: stop the meter in the green; the rim (yellow) is a coin toss on the host.
   ================================================================= */
const HP_W=['ع','ص','ف','و','ر'];
// spots: name, x, y on the court (hoop at 100,22), width of the green, meter pace
const HP_S=[['تحت السلة',100,44,250,1350],['الرمية الحرة',100,84,190,1250],['الكوع اليمين',134,84,165,1150],['الكوع اليسار',66,84,165,1150],
  ['الزاوية اليمين',190,30,120,1050],['الزاوية اليسار',10,30,120,1050],['رأس القوس',100,116,105,1000],['نص الملعب',100,162,45,850]];
const hpC=(d)=>250+Math.floor(mulberry(seedOf(d.gid+':hc'+(d.sid||0)))()*500);
// how a stop at v ends for a spot whose green is centred at c: 2 in, 1 on the rim, 0 off
const hpHit=(sp,c,v)=>{const w=HP_S[sp][3]/2,e=Math.abs(v-c);return e<=w?2:e<=w*1.6?1:0;};
// the chance to make a spot for a shooter whose stops scatter by sig
function hpP(sp,sig){const w=HP_S[sp][3]/2,F=x=>{const t=1/(1+.3275911*Math.abs(x)/Math.SQRT2),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x/2);return x>=0?(1+y)/2:(1-y)/2;};
  const pin=F(w/sig)-F(-w/sig),prim=F(w*1.6/sig)-F(-w*1.6/sig)-pin;return pin+.45*prim;}
function hpShoot(d,t,sp,v){const c=hpC(d),h=hpHit(sp,c,v),made=h===2||(h===1&&Math.random()<.45);
  let x={...d,sid:(d.sid||0)+1,shots:(d.shots||0)+1,lx:{s:t,sp,made:made?1:0,rim:h===1?1:0,id:(d.sid||0)+1}};const nmT=nm(d,t),spT=HP_S[sp][0];
  const nextL=s=>{const o=aliveSeats(x);if(!o.length)return s;const n=x.pl.length;for(let k=1;k<=n;k++){const q=(s+k)%n;if(x.out[q]!=='1')return q;}return s;};
  if(d.ph==='set'){
    if(made){const n=d.pl.length,q=aliveSeats(d).filter(s=>s!==t).sort((a,b)=>((a-t+n)%n)-((b-t+n)%n));x={...x,ph:'match',ch:sp,ls:sp,ldr:t,q,turn:q[0],last:`${nmT} دخّلها من ${spT}! 🏀 الكل لازم يسويها`};}
    else{const nl=nextL(t);x={...x,ph:'set',ch:-1,ldr:nl,q:[],turn:nl,last:`${nmT} ضيّعها من ${spT}${h===1?' (لمست الحلقة)':''}، القيادة لـ${nm(d,nl)}`};}}
  else{const lt=[...d.lt];let out=d.out,tx=`${nmT} ${made?'سواها ✓':(h===1?'لمست الحلقة وطلعت':'ضيّعها')}`;
    if(!made){lt[t]++;tx+=` ← ${HP_W.slice(0,lt[t]).join('')}`;if(lt[t]>=5){out=setAt(out,t,'1');tx+=' • طلع من اللعبة';}}
    x={...x,lt,out};const q=d.q.slice(1).filter(s=>out[s]!=='1');
    if(q.length)x={...x,q,turn:q[0],last:tx};
    else{const L=out[d.ldr]!=='1'?d.ldr:nextL(d.ldr);x={...x,q:[],ph:'set',ch:-1,ldr:L,turn:L,last:tx};}}
  const al=aliveSeats(x);if(al.length===1)return {...x,win:al[0]};if(!al.length)return {...x,win:'d'};
  if(x.shots>=25*x.pl.length)return {...x,win:r2Best(x,x.lt.map((l,s)=>x.out[s]==='1'?null:l),true),last:x.last+' • خلص الوقت، الأقل حروف يفوز'};
  return x;}
const hpOk=(d,sp)=>Number.isInteger(sp)&&sp>=0&&sp<HP_S.length&&(d.ph==='match'?sp===d.ch:sp!==d.ls);
// the leader's choice: how sure it is of the shot against how many letters it should hand out (with more weight on a
// player close to the end); a sure spot keeps the lead
function hpBotSpot(d,s,lv){const ok=HP_S.map((_,k)=>k).filter(k=>hpOk(d,k));if(lv===1)return ok[rnd(ok.length)];
  const me=R2SIG[lv],opp=aliveSeats(d).filter(o=>o!==s);let best=null;
  for(const k of ok){const ps=hpP(k,me);let gain=0;for(const o of opp){const so=isBot(d,o)?R2SIG[botLv(d,o)]:60;gain+=(1-hpP(k,so))*(1+Math.max(0,d.lt[o]-2)*.5)*(sameTeam(d,s,o)?-1:1);}
    const ev=ps*gain-(1-ps)*.6+(lv===2?Math.random()*.4:0);if(!best||ev>best[0])best=[ev,k];}
  return best[1];}
GAMES.r_hoops={name:'السلة',cat:'sport',lbc:'#D9662B',
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="r2hp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8B074"/><stop offset="1" stop-color="#C98446"/></linearGradient></defs><rect width="100" height="100" fill="url(#r2hp)"/>${[0,1,2,3,4].map(k=>`<path d="M${k*22} 0v100" stroke="#B87536" stroke-width="1" opacity=".5"/>`).join('')}<rect x="28" y="10" width="44" height="28" rx="3" fill="#fff" stroke="#2D4763" stroke-width="2.5"/><rect x="41" y="20" width="18" height="12" fill="none" stroke="#EC6158" stroke-width="2"/><ellipse cx="50" cy="40" rx="11" ry="3" fill="none" stroke="#E5534B" stroke-width="3"/><path d="M40 41l4 12h12l4-12M45 41l2 12M55 41l-2 12" stroke="#fff" stroke-width="1.4" fill="none"/><circle cx="68" cy="70" r="14" fill="#E8742B"/><path d="M54 70h28M68 56v28M58 60q10 10 0 20M78 60q-10 10 0 20" stroke="#5A2A0E" stroke-width="1.8" fill="none"/></svg>`,
  init:n=>({lt:Array(n).fill(0),ph:'set',ch:-1,ls:-1,ldr:0,q:[],sid:0,shots:0,lx:null,last:''}),
  start:d=>({...d,ldr:d.turn}),
  net:{host:['shoot'],local:['hs']},redeal:d=>d,
  points:d=>d.lt.map(l=>HP_W.slice(0,l).join('')||'—'),
  status:(d,ctx)=>r2Stat(d,ctx,d.ph==='match'?`<small>التحدي: ${HP_S[d.ch][0]} (حطّه ${nm(d,d.ldr)})</small><br>`:'<small>يختار مكان الرمية</small><br>'),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)}: ${HP_W.slice(0,d.lt[s]).join('')||'نظيف'}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx;
    const sel=d.ph==='match'?d.ch:r2Dr('hs',0,HP_S.length-1,-1),sp=hpOk(d,sel)?sel:-1;
    let s=`<div class="r2 r2hp"><svg class="hp-svg" viewBox="0 0 200 172" data-k="hps" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="hpw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B97E"/><stop offset="1" stop-color="#D49A5A"/></linearGradient></defs>
      <rect width="200" height="172" fill="url(#hpw)"/>${[...Array(10)].map((_,k)=>`<path d="M${k*20+10} 0V172" stroke="#C08447" stroke-width=".6" opacity=".55"/>`).join('')}
      <rect x="67" y="0" width="66" height="84" fill="#C9463D" opacity=".85"/><g fill="none" stroke="#fff" stroke-width="1.6"><rect x="1" y="1" width="198" height="170"/><rect x="67" y="0" width="66" height="84"/><circle cx="100" cy="84" r="20"/><path d="M20 0V22A80 80 0 0 0 180 22V0"/><path d="M84 170a16 16 0 0 1 32 0"/></g>
      <rect x="84" y="9" width="32" height="3" fill="#fff"/><circle cx="100" cy="20" r="5.5" fill="none" stroke="#E8742B" stroke-width="2"/>
      ${HP_S.map(([n0,x,y],k)=>{const ok=my&&d.ph==='set'&&hpOk(d,k),on=k===sp||(d.ph==='match'&&k===d.ch);return `<g class="hp-sp ${on?'on':''} ${ok?'can':''} ${d.ph==='set'&&k===d.ls?'ban':''}" ${ok?`data-ga="hs" data-i="${k}"`:''}><circle cx="${x}" cy="${y}" r="${ok?9:6.5}" fill="${on?'#FFD84D':'rgba(255,255,255,.75)'}" stroke="#2D4763" stroke-width="1.2"/><text x="${x}" y="${y+3.4}" text-anchor="middle">${k+1}</text></g>`;}).join('')}
      ${L?`<g class="hp-ball" style="transform:translate(${L.made?100:L.rim?109:118}px,${L.made?24:L.rim?17:30}px)"><circle r="5" fill="#E8742B"/><path d="M-5 0h10M0-5v10" stroke="#5A2A0E" stroke-width=".8"/></g>`:''}</svg>`;
    s+=`<div class="hp-board">${d.pl.map((_,i)=>`<div class="hp-row ${d.out[i]==='1'?'off':''} ${i===t&&d.win==null?'on':''}" style="--c:${col(d,i)}"><b>${nm(d,i)}${i===d.ldr&&d.win==null?' 👑':''}</b><span>${HP_W.map((c,j)=>`<i class="${j<d.lt[i]?'got':''}">${c}</i>`).join('')}</span></div>`).join('')}</div>`;
    if(my){const ok=sp>=0;
      s+=d.ph==='match'?`<p class="r2lbl">🏀 لازم تدخّلها من <b>${HP_S[d.ch][0]}</b> وإلا تاخذ حرف</p>`:`<p class="r2lbl">${ok?`🏀 الرمية من <b>${HP_S[sp][0]}</b>`:'اختر مكان الرمية من الملعب (1 أسهل، 8 أصعب)'}</p>${d.ls>=0?`<small class="r2tip">ما تقدر تعيد ${HP_S[d.ls][0]} مرتين ورا بعض</small>`:''}`;
      if(ok){const c=hpC(d),w=HP_S[sp][3]/2,m=r2mPar(key,HP_S[sp][4]);
        s+=`${r2Meter(key,m,[[0,1000,'z0'],[r2Clamp(c-w*1.6,0,1000),r2Clamp(c+w*1.6,0,1000),'z1'],[r2Clamp(c-w,0,1000),r2Clamp(c+w,0,1000),'z2']],sv==null,sv,'وقّف المؤشر في الأخضر')}${r2Stop(key,'shoot','🏀 ارمِ',sv==null)}`;}}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='hs'){if(d.ph==='set'&&hpOk(d,i)){S.draft.hs=String(i);render();}return;}
    if(a!=='shoot')return;const sp=d.ph==='match'?d.ch:r2Dr('hs',0,HP_S.length-1,-1);if(!hpOk(d,sp))return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);if(d.ph==='set')S.draft.hs=undefined;act(hpShoot(d,d.turn,sp,v));},
  bot(d,s,lv){const sp=d.ph==='match'?d.ch:hpBotSpot(d,s,lv);return hpShoot(d,s,sp,r2BotStop(hpC(d),lv));},
  onTimeout:d=>{const sp=d.ph==='match'?d.ch:HP_S.findIndex((_,k)=>hpOk(d,k));return hpShoot(d,d.turn,sp,d.ph==='match'?0:hpC(d)+(HP_S[sp][3]));},
  onSkip:(nd,d)=>{if(nd.win!=null)return nd;let x={...nd,q:(nd.q||[]).filter(s=>nd.out[s]!=='1')};
    if(x.ph==='match'&&!x.q.length){const L=x.out[x.ldr]!=='1'?x.ldr:nextSeat(x,x.ldr);x={...x,ph:'set',ch:-1,ldr:L,turn:L};}
    else if(x.ph==='match')x={...x,turn:x.q[0]};else if(x.out[x.ldr]==='1')x={...x,ldr:x.turn};return x;},
  after(d){r2Spin();const el=app.querySelector('.hp-svg');if(!el||!el.dataset.key||!once('hp'+el.dataset.key))return;const L=d.lx,b=el.querySelector('.hp-ball');if(!L||!b)return;
    const [,x,y]=HP_S[L.sp];r2Anim(b,[{transform:`translate(${x}px,${y}px) scale(1)`},{transform:`translate(${(x+100)/2}px,${Math.min(y,24)-26}px) scale(1.5)`,offset:.55},{transform:b.style.transform}],440,0,'linear');}
};
HELP.r_hoops='تحدي السلة على كلمة «عصفور». اللي معه القيادة 👑 يختار مكان من الملعب (1 تحت السلة سهل، و8 من نص الملعب صعبة) ويرمي: يوقّف المؤشر في الأخضر يدخل، وفي الأصفر تلمس الحلقة وممكن تدخل وممكن لا. لو دخّلها لازم كل الباقين يرمون من نفس المكان، واللي يضيّعها ياخذ حرف (ع ثم ص ثم ف ثم و ثم ر). لو ضيّعها صاحب القيادة تروح القيادة للي بعده. ما تقدر تختار نفس المكان مرتين ورا بعض. اللي يكمل «عصفور» يطلع، وآخر واحد يبقى يفوز. الحيلة: اختر رمية تضمنها أنت ويصعب على غيرك، خصوصًا على اللي قرّب يطلع. ولو لعبتوا فرق، الفريق اللي يبقى منه أحد آخر شي يفوز.';

/* =================================================================
   الرماية بالقوس: 4 ends of 3 arrows, one arrow each in turn. The wind is shown before the shot (it drifts the arrow);
   aim off the middle to make up for it, then stop the steadiness meter. A gust and the scatter are drawn on the host.
   10-ring scoring (the inner 10 is X); a tie goes to more X, then more 10s.
   ================================================================= */
const AR_N=12;
const arPts=(x,y)=>{const r=Math.hypot(x,y);return r>100?0:Math.min(10,11-Math.ceil(r/10||1));};
const arSig=v=>{const e=Math.abs(v-500)/500;return 4+40*Math.pow(e,1.4);};
function arShoot(d,t,ax,v,miss){const w=d.w+r2N()*.8,sg=arSig(v),x=miss?200:ax+w*9+r2N()*sg,y=miss?0:r2N()*sg,p=arPts(x,y),X=Math.hypot(x,y)<=5;
  const ar=d.ar.map((q,s)=>s===t?[...q,[+x.toFixed(1),+y.toFixed(1),p,X?1:0]]:q),sid=(d.sid||0)+1;
  const nw=r2Clamp(Math.round(d.w+r2N()*1.4),-5,5),nx=r2Adv(d,t),rn=d.rn+(nx.nr?1:0);
  const x2={...d,ar,sid,w:nw,last:miss?`${nm(d,t)} ما أطلق`:`${nm(d,t)}: ${p===0?'برّا الهدف':X?'X 🎯':p}`};
  if(rn>=AR_N)return {...x2,turn:nx.turn,rn,win:r2Best(x2,ar.map((q,s)=>x2.out[s]==='1'?null:arKey(q)))};
  return {...x2,turn:nx.turn,rn};}
const arTot=q=>q.reduce((a,b)=>a+b[2],0),arX=q=>q.filter(b=>b[3]).length,arKey=q=>arTot(q)*10000+arX(q)*100+q.filter(b=>b[2]===10).length;
GAMES.r_arch={name:'الرماية بالقوس',cat:'sport',lbc:'#B23A48',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8FCB72"/><rect width="100" height="46" fill="#9BD3F0"/>${[['#fff',40],['#1E2328',32],['#3B8FD9',24],['#E5534B',16],['#F2C230',8]].map(([c,r])=>`<circle cx="50" cy="50" r="${r}" fill="${c}"/>`).join('')}<path d="M50 50L86 18" stroke="#6B3E1F" stroke-width="3"/><path d="M84 13l9 1-6 8zM80 17l8 2-6 6z" fill="#EC6158"/><circle cx="50" cy="50" r="2.4" fill="#1E2328"/></svg>`,
  init:n=>({ar:Array(n).fill(0).map(()=>[]),rn:0,w:0,sid:0,last:''}),
  start:d=>({...d,w:rnd(7)-3}),
  net:{host:['shot'],local:['ax']},redeal:d=>d,
  points:d=>d.ar.map(q=>arTot(q)),
  status:(d,ctx)=>r2Stat(d,ctx,`<small>الجولة ${Math.min(Math.floor(d.rn/3)+1,4)} من 4 • السهم ${d.rn%3+1} من 3</small><br>`),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${arTot(d.ar[s])} (X ${arX(d.ar[s])})`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),ax=r2Dr('ax',-60,60,0),end=Math.floor(Math.min(d.rn,AR_N-1)/3);
    const RC=['#fff','#fff','#1E2328','#1E2328','#3B8FD9','#3B8FD9','#E5534B','#E5534B','#F2C230','#F2C230'],w=d.w;
    let s=`<div class="r2 r2ar"><svg class="ar-svg" viewBox="-120 -112 240 238" data-k="ars"><defs><linearGradient id="arsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC9EE"/><stop offset="1" stop-color="#D7EEF9"/></linearGradient></defs>
      <rect x="-120" y="-112" width="240" height="238" fill="url(#arsk)"/><path d="M-120 40q40-18 80-6t80-4 80 2V126h-240z" fill="#7DBE62"/><path d="M-120 70q60-12 120 0t120-4V126h-240z" fill="#69AD52"/>
      <path d="M-74 100l14-60M74 100l-14-60" stroke="#8A5A2B" stroke-width="5"/><rect x="-106" y="-106" width="212" height="212" rx="10" fill="#D8C49A"/>
      ${RC.map((c,k)=>`<circle r="${100-k*10}" fill="${c}" stroke="${k<2?'#C9D3DE':k<4?'#fff':'rgba(0,0,0,.25)'}" stroke-width=".7"/>`).join('')}<circle r="5" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".6"/><path d="M-3 0h6M0-3v6" stroke="#1E2328" stroke-width=".8"/>
      ${d.pl.map((_,i)=>d.ar[i].slice(end*3,end*3+3).map((b,k)=>`<g class="ar-hit ${i===d.lxS&&k===d.ar[i].length-1-end*3?'last':''}" data-k="ah${i}-${end}-${k}" style="transform:translate(${r2Clamp(b[0],-115,115)}px,${r2Clamp(b[1],-108,120)}px)"><circle r="3.4" fill="${col(d,i)}" stroke="#fff" stroke-width="1.2"/></g>`).join('')).join('')}
      ${my?`<g class="ar-aim" style="transform:translateX(${ax}px)"><circle r="9" fill="none" stroke="#1E2328" stroke-width="1.6"/><path d="M-15 0h10M5 0h10M0-15v10M0 5v10" stroke="#1E2328" stroke-width="1.6"/></g>`:''}
      <g transform="translate(-112 -100)"><rect width="66" height="22" rx="11" fill="rgba(255,255,255,.88)"/><text x="33" y="15.5" text-anchor="middle" class="ar-wt">💨 ${w===0?'هادي':(w>0?'→ ':'← ')+Math.abs(w)}</text></g>
      <g transform="translate(96 -98)"><path d="M0 0v34" stroke="#555" stroke-width="2"/><path d="M0 2l${w*3.4||1} ${3+Math.abs(w)*.4}l${-(w*3.4||1)} ${3+Math.abs(w)*.4}z" fill="#EC6158"/></g></svg>`;
    s+=`<div class="ar-tab"><span></span>${[1,2,3,4].map(e=>`<span class="hd ${e-1===end?'on':''}">${e}</span>`).join('')}<span class="hd">∑</span><span class="hd">X</span>
      ${d.pl.map((_,i)=>`<b style="color:${col(d,i)}">${nm(d,i)}</b>${[0,1,2,3].map(e=>{const q=d.ar[i].slice(e*3,e*3+3);return `<span class="${e===end?'on':''}">${q.length?arTot(q):''}</span>`;}).join('')}<span><b>${arTot(d.ar[i])}</b></span><span>${arX(d.ar[i])}</span>`).join('')}</div>`;
    if(my){const m=r2mPar(key,1100);
      s+=`<p class="r2lbl">صوّب عكس الريح (${w===0?'ما فيه ريح':w>0?'الريح تدفع لليمين':'الريح تدفع لليسار'})</p><div class="r2row"><button class="btn soft" data-ga="ax" data-i="${ax-9}" ${ax>-60?'':'disabled'}>◀◀</button><button class="btn soft" data-ga="ax" data-i="${ax-3}" ${ax>-60?'':'disabled'}>◀</button><button class="btn soft" data-ga="ax" data-i="0">⊙</button><button class="btn soft" data-ga="ax" data-i="${ax+3}" ${ax<60?'':'disabled'}>▶</button><button class="btn soft" data-ga="ax" data-i="${ax+9}" ${ax<60?'':'disabled'}>▶▶</button></div>
        ${r2Meter(key,m,[[0,1000,'z0'],[320,680,'z1'],[430,570,'z2']],sv==null,sv,'ثبات القوس: وقّف المؤشر في النص')}${r2Stop(key,'shot','🏹 أطلق',sv==null)}`;}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='ax'){if(Number.isInteger(i)){S.draft.ax=String(r2Clamp(i,-60,60));render();}return;}
    if(a!=='shot')return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act({...arShoot(d,d.turn,r2Dr('ax',-60,60,0),v),lxS:d.turn});},
  bot(d,s,lv){const comp=[0,.3,.8,1][lv]+r2N()*[0,.25,.12,.05][lv];return {...arShoot(d,s,r2Clamp(Math.round(-d.w*9*comp/3)*3,-60,60),r2BotStop(500,lv)),lxS:s};},
  onTimeout:d=>({...arShoot(d,d.turn,0,500,true),lxS:d.turn}),
  after(d){r2Spin();const g=app.querySelector('.ar-hit.last');if(g&&once('ar'+d.gid+(d.sid||0)))r2Anim(g,[{opacity:0,transform:g.style.transform+' scale(3)'},{opacity:1,transform:g.style.transform}],320);}
};
HELP.r_arch='رماية بالقوس: 4 جولات، في كل جولة كل لاعب يطلق 3 أسهم، سهم سهم بالدور. الهدف 10 حلقات: الأصفر 10 و9، الأحمر 8 و7، الأزرق 6 و5، الأسود 4 و3، والأبيض 2 و1، والدائرة الصغيرة في النص X (تنحسب 10 وتفيد بالتعادل). فوق تشوف الريح واتجاهها وقوتها: الريح تدفع السهم، فحرّك التصويب بالأسهم عكسها، وبعدين وقّف مؤشر ثبات القوس في النص. الريح تتغير بعد كل سهم، وفيها هبّات ما تنعرف. الأعلى مجموع يفوز، ولو تعادلوا يفوز اللي عنده X أكثر ثم 10 أكثر.'+R2TM;

/* =================================================================
   البلياردو الصغير: rotation with nine balls. You must hit the lowest ball on the table first; every ball you pot then
   scores its number and you shoot again. A foul (another ball first, no ball, or the white in a pocket) scores nothing,
   puts the potted balls back on the spot and passes the turn. When the table is empty the most points win.
   The shot is worked out on the host: equal balls, cushions, six pockets, a capped number of steps; then played back.
   ================================================================= */
const PL_R=4.2,PL_P=[[0,0,8.8],[100,-2.4,8],[200,0,8.8],[0,100,8.8],[100,102.4,8],[200,100,8.8]];
const PL_C=['#F7F3E8','#F2C230','#2F6FD6','#E5483F','#7A4FC9','#F28C28','#2E9A62','#8E2B2B','#1E2328','#F2C230'];
const plFree=(bl,x,y,skip)=>bl.every((b,k)=>k===skip||!b||Math.hypot(b[0]-x,b[1]-y)>2*PL_R+.2);
// a ball back on the table: the spot, else further along the line
function plSpot(bl,k,x0){for(let j=0;j<40;j++){const x=x0+(j%2?-1:1)*Math.ceil(j/2)*5.2;if(x>PL_R&&x<200-PL_R&&plFree(bl,x,50,k))return [x,50];}
  for(let y=10;y<=90;y+=6)for(let x=20;x<=180;x+=6)if(plFree(bl,x,y,k))return [x,y];return [x0,50];}
function plRack(gid){const R=mulberry(seedOf(gid+':rk')),mid=[2,3,4,5,6,7,8].sort(()=>R()-.5),dx=2*PL_R*Math.cos(Math.PI/6)+.06;
  const pos=[[0,0],[1,-1],[1,1],[2,-2],[2,0],[2,2],[3,-1],[3,1],[4,0]],num=[1,mid[0],mid[1],mid[2],9,mid[3],mid[4],mid[5],mid[6]];
  const bl=Array(10).fill(null);bl[0]=[50,50];pos.forEach(([c,r],k)=>{bl[num[k]]=[+(150+c*dx).toFixed(2),+(50+r*(PL_R+.03)).toFixed(2)];});return bl;}
// the shot: angle a (degrees, 0 = right, clockwise on screen), power p (0..1000). Returns where the balls end, what went
// in, which ball the white met first, and (rec) a short track of every ball that moved
function plSim(bl,a,p,rec,n){const B=bl.map(b=>b?{x:b[0],y:b[1],vx:0,vy:0,on:1}:null),t=a*Math.PI/180,v0=.6+p/1000*5.4;B[0].vx=Math.cos(t)*v0;B[0].vy=Math.sin(t)*v0;
  let first=-1,st=0,subs=0;const pot=[],F=rec?[]:null,E=.82;
  const snap=()=>F.push(B.map(b=>b?[+b.x.toFixed(1),+b.y.toFixed(1),b.on]:null));if(rec)snap();
  while(st<900&&subs<7000){st++;let mx=0;for(const b of B)if(b&&b.on)mx=Math.max(mx,Math.hypot(b.vx,b.vy));if(mx<.02)break;
    const sub=Math.max(1,Math.ceil(mx/.6));subs+=sub;
    for(let k=0;k<sub;k++){for(const b of B)if(b&&b.on){b.x+=b.vx/sub;b.y+=b.vy/sub;}
      for(let i=0;i<10;i++){const b=B[i];if(!b||!b.on)continue;
        for(const [px,py,pr] of PL_P)if(Math.hypot(b.x-px,b.y-py)<pr){b.on=0;b.vx=b.vy=0;b.x=px;b.y=py;pot.push(i);break;}if(!b.on)continue;
        if(b.x<PL_R&&!(b.y<13||b.y>87)){b.x=2*PL_R-b.x;b.vx=-b.vx*E;}if(b.x>200-PL_R&&!(b.y<13||b.y>87)){b.x=2*(200-PL_R)-b.x;b.vx=-b.vx*E;}
        if(b.y<PL_R&&!(b.x<13||b.x>187||Math.abs(b.x-100)<9)){b.y=2*PL_R-b.y;b.vy=-b.vy*E;}if(b.y>100-PL_R&&!(b.x<13||b.x>187||Math.abs(b.x-100)<9)){b.y=2*(100-PL_R)-b.y;b.vy=-b.vy*E;}
        if(b.x<-7||b.x>207||b.y<-7||b.y>107){b.on=0;b.vx=b.vy=0;const q=PL_P.reduce((m,P)=>Math.hypot(P[0]-b.x,P[1]-b.y)<Math.hypot(m[0]-b.x,m[1]-b.y)?P:m);b.x=q[0];b.y=q[1];pot.push(i);}}
      for(let i=0;i<10;i++){const a1=B[i];if(!a1||!a1.on)continue;for(let j=i+1;j<10;j++){const b=B[j];if(!b||!b.on)continue;
        const dx=b.x-a1.x,dy=b.y-a1.y,dd=Math.hypot(dx,dy);if(dd>=2*PL_R||dd<1e-9)continue;const nx=dx/dd,ny=dy/dd,vr=(a1.vx-b.vx)*nx+(a1.vy-b.vy)*ny;
        if(vr>0){const im=vr*.975;a1.vx-=im*nx;a1.vy-=im*ny;b.vx+=im*nx;b.vy+=im*ny;if(first<0&&(i===0||j===0))first=i===0?j:i;}
        const o=(2*PL_R-dd)/2;a1.x-=nx*o;a1.y-=ny*o;b.x+=nx*o;b.y+=ny*o;}}}
    for(const b of B)if(b&&b.on){const s=Math.hypot(b.vx,b.vy),ns=Math.max(0,s*.988-.004);if(ns<.02){b.vx=b.vy=0;}else{b.vx*=ns/s;b.vy*=ns/s;}}
    if(rec&&st%3===0)snap();}
  if(n)n.c+=subs;if(rec)snap();
  const out=B.map(b=>b&&b.on?[+r2Clamp(b.x,PL_R,200-PL_R).toFixed(2),+r2Clamp(b.y,PL_R,100-PL_R).toFixed(2)]:null);let tr=null;
  if(rec){const k=Math.max(1,Math.ceil(F.length/24)),G=F.filter((_,j)=>j%k===0||j===F.length-1);tr={};
    for(let i=0;i<10;i++){if(!bl[i])continue;const T=G.map(f=>f[i]?[f[i][0],f[i][1]]:null);if(T.some(q=>q&&(Math.abs(q[0]-bl[i][0])>.3||Math.abs(q[1]-bl[i][1])>.3)))tr[i]=T;}}
  return {bl:out,pot,first,tr};}
const plLow=bl=>{for(let k=1;k<10;k++)if(bl[k])return k;return -1;};
function plPlay(d,t,a,v){const aa=a+r2N()*.15,pp=r2Clamp(v*(1+r2N()*.01),0,1000),low=plLow(d.bl);
  const r=plSim(d.bl,aa,pp,true);let bl=r.bl,pts=[...d.pts],tx;const obj=r.pot.filter(k=>k>0),scr=r.pot.includes(0);
  const foul=scr||r.first!==low;
  if(foul){for(const k of obj)bl[k]=plSpot(bl,k,150);if(scr)bl[0]=plSpot(bl,0,50);
    tx=`${nm(d,t)}: خطأ! ${scr?'البيضاء طاحت':r.first<0?'ما لمس شي':`ضرب ${r.first} قبل ${low}`}${obj.length?' • ترجع الكرات':''}`;}
  else{const g=obj.reduce((x,y)=>x+y,0);pts[t]+=g;tx=obj.length?`${nm(d,t)} دخّل ${obj.join(' و')} (+${g}) ويكمل 🎱`:`${nm(d,t)} ما دخّل شي`;}
  const sid=(d.sid||0)+1,lx={tr:r.tr,pot:foul?r.pot.filter(k=>k===0):r.pot,id:sid};
  let x={...d,bl,pts,sid,lx,shots:(d.shots||0)+1,last:tx};
  if(plLow(bl)<0)return {...x,win:r2Best(x,pts.map((p,s)=>x.out[s]==='1'?null:p)),last:tx+' • خلصت الطاولة'};
  if(x.shots>=30*x.pl.length)return {...x,win:r2Best(x,pts.map((p,s)=>x.out[s]==='1'?null:p)),last:tx+' • خلصت الضربات'};
  if(foul||!obj.length)x={...x,turn:nextSeat(x,t)};
  return x;}
const plAimDef=d=>{const c=d.bl[0],l=d.bl[plLow(d.bl)];return l?((Math.round(Math.atan2(l[1]-c[1],l[0]-c[0])*1800/Math.PI)%3600)+3600)%3600:0;};
const plAim=d=>r2Dr('pa',0,3599,plAimDef(d));
// where the white meets a ball first along the aim (for the guide line): [x,y,ball] or the cushion
function plGhost(bl,a){const c=bl[0],ux=Math.cos(a*Math.PI/180),uy=Math.sin(a*Math.PI/180);let best=null;
  for(let k=1;k<10;k++){const b=bl[k];if(!b)continue;const px=b[0]-c[0],py=b[1]-c[1],along=px*ux+py*uy;if(along<=0)continue;const perp=Math.abs(px*uy-py*ux);if(perp>=2*PL_R)continue;
    const dd=along-Math.sqrt(4*PL_R*PL_R-perp*perp);if(!best||dd<best[0])best=[dd,k];}
  if(best)return [c[0]+ux*best[0],c[1]+uy*best[0],best[1]];
  let tm=1e9;if(ux>0)tm=Math.min(tm,(200-PL_R-c[0])/ux);if(ux<0)tm=Math.min(tm,(PL_R-c[0])/ux);if(uy>0)tm=Math.min(tm,(100-PL_R-c[1])/uy);if(uy<0)tm=Math.min(tm,(PL_R-c[1])/uy);
  return [c[0]+ux*tm,c[1]+uy*tm,-1];}
// a bot: cuts on the lowest ball into each pocket at a few strengths, all played out (the steps are counted); the best
// legal pot wins, else the safest legal touch
function plBot(d,s,lv){const bl=d.bl,c=bl[0],low=plLow(bl),L=bl[low];const cap={c:0},max=[0,30000,150000,400000][lv];let best=null;
  const deg=(x,y)=>((Math.atan2(y-c[1],x-c[0])*180/Math.PI)+360)%360;
  const tryS=(a,p)=>{if(cap.c>max)return;const r=plSim(bl,a,p,false,cap),obj=r.pot.filter(k=>k>0),foul=r.pot.includes(0)||r.first!==low;
    let sc=foul?-60:obj.length?40+obj.reduce((x,y)=>x+y,0)*3:0;if(!foul&&r.bl[0]){const nl=plLow(r.bl);if(nl>0){const g=plGhost(r.bl,deg(r.bl[nl][0],r.bl[nl][1]));sc+=g[2]===nl?6:0;}}
    if(!best||sc>best[0])best=[sc,a,p];};
  if(lv===1){best=[0,deg(L[0],L[1]),550];}
  else{for(const [px,py] of PL_P){const ux=px-L[0],uy=py-L[1],dl=Math.hypot(ux,uy),gx=L[0]-ux/dl*2*PL_R,gy=L[1]-uy/dl*2*PL_R;
      const ax=gx-c[0],ay=gy-c[1],cut=Math.acos(r2Clamp((ax*ux+ay*uy)/(Math.hypot(ax,ay)*dl||1),-1,1))*180/Math.PI;if(cut>78)continue;
      for(const p of lv===3?[320,520,760]:[450,700])tryS(deg(gx,gy),p);}
    tryS(deg(L[0],L[1]),500);if(lv===3)for(let k=0;k<10&&cap.c<=max;k++)tryS((deg(L[0],L[1])+r2N()*6+360)%360,300+rnd(500));
    if(!best)best=[0,deg(L[0],L[1]),550];}
  const er=[0,2.6,1,.35][lv];return [Math.round(((best[1]+r2N()*er+360)%360)*10)%3600,r2BotStop(best[2],lv)];}
GAMES.r_pool={name:'البلياردو الصغير',cat:'sport',lbc:'#1F7A4A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6E4522"/><rect x="8" y="16" width="84" height="68" rx="6" fill="#2E9A62"/>${[[8,16],[50,14],[92,16],[8,84],[50,86],[92,84]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="#111"/>`).join('')}${[[60,44,'#F2C230'],[66,40,'#2F6FD6'],[66,48,'#E5483F'],[72,36,'#7A4FC9'],[72,44,'#1E2328'],[72,52,'#F28C28']].map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>`).join('')}<circle cx="30" cy="50" r="4" fill="#fff"/><path d="M26 52L4 62" stroke="#E8C48C" stroke-width="3" stroke-linecap="round"/></svg>`,
  init:n=>({bl:[],pts:Array(n).fill(0),sid:0,shots:0,lx:null,last:''}),
  start:d=>({...d,bl:plRack(d.gid)}),
  net:{host:['cue'],local:['pa']},redeal:d=>d,
  points:d=>d.pts,
  status:(d,ctx)=>r2Stat(d,ctx,d.win==null?`<small>الكرة المطلوبة: ${plLow(d.bl)}</small><br>`:''),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),a=plAim(d)/10,L=d.lx,low=plLow(d.bl);
    const ball=(k,x,y,cls)=>`<g class="pl-b ${cls||''}" data-b="${k}" style="transform:translate(${x}px,${y}px)"><circle r="${PL_R}" fill="${PL_C[k]}" stroke="rgba(0,0,0,.35)" stroke-width=".3"/>${k===9?`<path d="M-4-1.7h8v3.4h-8z" fill="#fff" opacity=".9"/>`:''}${k?`<circle r="2.1" fill="#fff"/><text y="1" text-anchor="middle">${k}</text>`:'<circle cx="-1" cy="-1" r=".8" fill="#fff" opacity=".8"/>'}</g>`;
    let s=`<div class="r2 r2pl"><svg class="pl-svg ${my?'can':''}" viewBox="-12 -12 224 124" data-k="pls" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="plf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#33A86B"/><stop offset="1" stop-color="#23854F"/></linearGradient></defs>
      <rect x="-12" y="-12" width="224" height="124" rx="7" fill="#7A4A22"/><rect x="-10" y="-10" width="220" height="120" rx="6" fill="#94602F"/><rect x="-4" y="-4" width="208" height="108" rx="2" fill="#1C6B43"/><rect width="200" height="100" fill="url(#plf)"/>
      ${[25,50,75,125,150,175].map(x=>`<circle cx="${x}" cy="-7" r=".9" fill="#F3E6C8"/><circle cx="${x}" cy="107" r=".9" fill="#F3E6C8"/>`).join('')}${[25,50,75].map(y=>`<circle cx="-7" cy="${y}" r=".9" fill="#F3E6C8"/><circle cx="207" cy="${y}" r=".9" fill="#F3E6C8"/>`).join('')}
      <path d="M50 0V100" stroke="#fff" stroke-width=".3" opacity=".25"/><circle cx="150" cy="50" r=".7" fill="#fff" opacity=".5"/>
      ${PL_P.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#0E1A12"/>`).join('')}`;
    if(my&&d.bl[0]){const g=plGhost(d.bl,a),c=d.bl[0],ux=Math.cos(a*Math.PI/180),uy=Math.sin(a*Math.PI/180),ok=g[2]===low;
      s+=`<path d="M${c[0].toFixed(1)} ${c[1].toFixed(1)}L${g[0].toFixed(1)} ${g[1].toFixed(1)}" stroke="#fff" stroke-width=".5" stroke-dasharray="1.6 1.2" opacity=".85"/><circle cx="${g[0].toFixed(1)}" cy="${g[1].toFixed(1)}" r="${PL_R}" fill="none" stroke="${g[2]<0?'#fff':ok?'#7CE19B':'#FF8A80'}" stroke-width=".6"/>`;
      if(g[2]>0){const b=d.bl[g[2]],nx=b[0]-g[0],ny=b[1]-g[1],l=Math.hypot(nx,ny)||1;s+=`<path d="M${b[0].toFixed(1)} ${b[1].toFixed(1)}l${(nx/l*16).toFixed(1)} ${(ny/l*16).toFixed(1)}" stroke="${ok?'#7CE19B':'#FF8A80'}" stroke-width=".6" stroke-dasharray="1.2 1"/>`;}
      s+=`<path d="M${(c[0]-ux*4).toFixed(1)} ${(c[1]-uy*4).toFixed(1)}L${(c[0]-ux*70).toFixed(1)} ${(c[1]-uy*70).toFixed(1)}" stroke="#E8C48C" stroke-width="1.6" stroke-linecap="round"/><path d="M${(c[0]-ux*4).toFixed(1)} ${(c[1]-uy*4).toFixed(1)}l${(-ux*2).toFixed(1)} ${(-uy*2).toFixed(1)}" stroke="#4AB1E8" stroke-width="1.7"/>`;}
    d.bl.forEach((b,k)=>{if(b)s+=ball(k,b[0],b[1],k===low&&d.win==null?'low':'');});
    if(L&&L.pot)for(const k of L.pot)if(!d.bl[k]){const tr=L.tr&&L.tr[k],e=tr&&tr.filter(Boolean).pop();if(e&&!d.bl[k])s+=ball(k,e[0],e[1],'gone');}
    s+=`</svg><div class="pl-rack">${[1,2,3,4,5,6,7,8,9].map(k=>`<i class="${d.bl[k]?'':'off'} ${k===low&&d.win==null?'low':''}" style="--c:${PL_C[k]}">${k}</i>`).join('')}</div>`;
    if(my){const m=r2mPar(key,1400);
      s+=`<p class="r2lbl">صوّب على الكرة ${low} (اضغط على الطاولة أو عدّل بالأسهم)</p><div class="r2row pl-fine">${[[-50,'⟲5'],[-10,'⟲1'],[-2,'⟲.2'],[2,'.2⟳'],[10,'1⟳'],[50,'5⟳']].map(([k,tx])=>`<button class="btn soft" data-ga="pa" data-i="${(plAim(d)+k+3600)%3600}">${tx}</button>`).join('')}</div>
        ${r2Meter(key,m,[[0,1000,'zl'],[0,300,'z2'],[300,650,'z1'],[650,1000,'z0']],sv==null,sv,'قوة الضربة: وقّف المؤشر على القوة اللي تبيها')}${r2Stop(key,'cue','🎱 اضرب',sv==null)}`;}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='pa'){if(Number.isInteger(i)&&i>=0&&i<3600){S.draft.pa=String(i);render();}return;}
    if(a!=='cue')return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(plPlay(d,d.turn,plAim(d)/10,v));},
  bot(d,s,lv){const [a,v]=plBot(d,s,lv);return plPlay(d,s,a/10,v);},
  onTimeout:d=>({...d,turn:nextSeat(d,d.turn),shots:(d.shots||0)+1,last:`${nm(d,d.turn)} ما ضرب`}),
  after(d){r2Spin();const el=app.querySelector('.pl-svg');if(!el)return;
    if(!el._b){el._b=1;el.addEventListener('pointerdown',e=>{const d=S.st.d,c=mkCtx();if(!d||d.win!=null||!c.my||!el.classList.contains('can')||!d.bl||!d.bl[0])return;const m=el.getScreenCTM();if(!m)return;const p=el.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(m.inverse()),b=d.bl[0];
      S.draft.pa=String(((Math.round(Math.atan2(q.y-b[1],q.x-b[0])*1800/Math.PI)%3600)+3600)%3600);render();});}
    const L=d.lx;if(!L||!L.tr||!el.dataset.key||!once('pl'+el.dataset.key))return;const n=Math.max(...Object.values(L.tr).map(t=>t.length),2);
    r2Play(Math.min(1200,250+n*40),ms=>{for(const k in L.tr){const g=el.querySelector(`.pl-b[data-b="${k}"]`);if(!g)continue;const T=L.tr[k];let last=T.find(Boolean);
      const fr=T.map(q=>{if(q)last=q;return {transform:`translate(${(q||last)[0]}px,${(q||last)[1]}px)`,opacity:q?1:0};});fr.push({transform:g.style.transform,opacity:g.classList.contains('gone')?0:1});
      g.animate(fr,{duration:ms,easing:'cubic-bezier(.25,.6,.45,1)'});}});}
};
HELP.r_pool='بلياردو بتسع كرات بنظام «الروتيشن». بدورك صوّب العصا (اضغط على الطاولة بالاتجاه اللي تبيه أو عدّل بالأسهم، والخط المتقطع يوريك وين بتضرب البيضاء: أخضر يعني صح)، وبعدين وقّف مؤشر القوة. لازم البيضاء تلمس أول شي أصغر رقم على الطاولة. لو ضربتها صح ودخلت أي كرة، تاخذ نقاط بعدد رقم كل كرة دخلت وتكمل. لو ما دخلت شي يروح الدور للي بعدك. والخطأ (لمست كرة ثانية قبل المطلوبة، أو ما لمست شي، أو طاحت البيضاء) ما يحسب لك شي، والكرات اللي دخلت ترجع على الطاولة، والدور يروح. لما تخلص الكرات، الأكثر نقاط يفوز.'+R2TM;

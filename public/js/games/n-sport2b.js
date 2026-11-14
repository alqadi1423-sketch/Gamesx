'use strict';
/* n-sport2b: سباق الخيل، الصقور، الحداق، سباق السفن الشراعية، قفز الحواجز، الحجلة. Uses the helpers of n-sport2.js
   (the stop meter r2*, the round order, the winners with teams). The luck is drawn on the host, from the player's input. */

/* =================================================================
   سباق الخيل: 5 races. Before each race everyone bets at the same time (hidden until the race): a horse, win or place
   (first two), and how much. The book prices the horses on their rating and form only; the going suits some horses
   more than others, so a careful reader finds value. The race is run on the host. The richest after 5 races wins.
   ================================================================= */
const HR_NM=['البرق','الريح','الشهاب','الأصيل','العاصفة','السهم','النجم','الغزال','الفارس','الصقر','الوميض','الظافر','الكحيلة','الدهماء'];
const HR_C=['#E5483F','#2F80ED','#F2C230','#2E9A62','#9C7BD6','#F28C28','#E57AAE','#1E2328'];
const HR_G=['☀️ جاف','🌦️ لين','🌧️ ثقيل'];
const hrPerf=(h,tc,g)=>h[1]+h[2]+(h[3]===tc?5:Math.abs(h[3]-tc)===2?-4:0)+g*7;
// the chances of each horse to win and to be in the first two, played out a number of times (seeded, so the same everywhere)
function hrProb(hs,tc,R,N,book){const w=hs.map(()=>0),p=hs.map(()=>0);const g=()=>{let u=0;while(!u)u=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*R());};
  for(let k=0;k<N;k++){const pf=hs.map(h=>book?h[1]+h[2]+g()*7:hrPerf(h,tc,g()));const o=pf.map((_,i)=>i).sort((a,b)=>pf[b]-pf[a]);w[o[0]]++;p[o[0]]++;p[o[1]]++;}
  return {w:w.map(x=>x/N),p:p.map(x=>x/N)};}
function hrNew(d,rd){const R=Math.random,used=new Set(),hs=[];while(hs.length<6){const k=Math.floor(R()*HR_NM.length);if(used.has(k))continue;used.add(k);hs.push([k,62+Math.floor(R()*16),Math.floor(R()*5)-2,Math.floor(R()*3)]);}
  const tc=Math.floor(R()*3),B=hrProb(hs,tc,mulberry(seedOf(d.gid+':hb'+rd)),1500,true);
  return {hs,tc,od:B.w.map(p=>Math.max(12,Math.floor(9/Math.max(p,.01)))),po:B.p.map(p=>Math.max(11,Math.floor(9/Math.max(p,.01))))};}
const hrDec=p=>Number.isInteger(p)&&p>=0?{a:Math.floor(p/12),h:Math.floor(p%12/2),t:p%2}:null;
const hrMin=c=>Math.min(10,c);
GAMES.r_horse={name:'سباق الخيل',cat:'sport',lbc:'#7B4A2A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8FCB72"/><rect width="100" height="40" fill="#9BD3F0"/><path d="M0 62h100M0 80h100" stroke="#fff" stroke-width="2.5"/><path d="M78 40v60" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/><path d="M20 58q6-16 22-14l6-8 4 3-2 6q8 2 10 10l-6 1-3-5-14 3-6 8-5-1 4-8z" fill="#6B3E1F"/><path d="M33 44l6-6 6 3-2 5z" fill="#E5483F"/><circle cx="38" cy="36" r="3.4" fill="#F2C9A0"/><path d="M40 70q6-12 20-10l5-7 4 3-2 5q7 2 9 9l-5 1-3-4-12 2-5 7-5-1 3-7z" fill="#2B1B10"/><path d="M52 58l5-5 5 3-2 4z" fill="#2F80ED"/></svg>`,
  init:n=>({rd:0,R:5,co:Array(n).fill(100),hs:[],tc:0,od:[],po:[],lr:null,last:''}),
  start:d=>({...d,...hrNew(d,0)}),
  privOk:(d,r,o,p)=>{if(p.pick==null||p.pick===NOPICK)return true;const s=d.pl.indexOf(r),x=hrDec(p.pick);return !!x&&x.h<6&&(x.a===0?d.co[s]<1:x.a>=hrMin(d.co[s])&&x.a<=d.co[s]);},
  viewer:d=>simulViewer(d),coverMsg:d=>d.last||'',
  points:d=>d.co.map(c=>c+'🪙'),
  status:(d,ctx)=>simulStatus(d,ctx,`<small>الشوط ${Math.min(d.rd+1,d.R)} من ${d.R} • الأرض ${HR_G[d.tc]}</small><br>`),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.co[s]} 🪙`).join('، '),
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&d.out[v]!=='1',my=ctx.my&&d.win==null,L=d.lr;const k=d.gid+':'+d.rd+':'+v;if(!S.r2hr||S.r2hr.k!==k)S.r2hr={k,h:null,t:0,a:10};const U=S.r2hr;
    let s=`<div class="r2 r2hr">`;
    // the last race: lanes, the horses where they finished (they run there), the order
    if(L){s+=`<svg class="hr-svg" viewBox="0 0 300 ${16+L.hs.length*22}" data-k="hrs" data-key="${d.gid}r${d.rd}"><rect width="300" height="${16+L.hs.length*22}" fill="#7DBE62"/>${L.hs.map((h,i)=>`<rect x="0" y="${8+i*22}" width="300" height="22" fill="${i%2?'#C99C63':'#D4A86E'}"/>`).join('')}<path d="M270 4V${12+L.hs.length*22}" stroke="#fff" stroke-width="3" stroke-dasharray="6 4"/>
      ${L.hs.map((h,i)=>{const r=L.ord.indexOf(i);return `<g class="hr-h" data-i="${i}" style="transform:translate(${270-r*14}px,${19+i*22}px)"><path d="M-22 4q3-9 12-8l4-5 3 2-1 4q5 1 6 6l-4 1-2-3-8 2-3 5-4-1 2-4z" fill="#5A3A1E"/><path d="M-14-6l4-3 4 2-1 3z" fill="${HR_C[i]}"/><text x="-30" y="4" class="hr-n">${r+1}</text></g>`;}).join('')}</svg>
      <div class="hr-res">${L.bets.map(([s0,h,t,a,w])=>a?`<span class="${w>0?'ok':'no'}"><b style="color:${col(d,s0)}">${nm(d,s0)}</b> ${HR_NM[L.hs[h][0]]} ${t?'مركز':'فوز'} ${a} ← ${w>0?'+'+w:'−'+a}</span>`:'').join('')}</div>`;}
    if(d.win!=null)return s+'</div>';
    s+=`<div class="hr-card"><p class="r2lbl">الشوط ${d.rd+1}: الأرض ${HR_G[d.tc]}</p>${d.hs.map((h,i)=>`<button class="hr-row ${U.h===i?'on':''}" data-ga="hh" data-i="${i}" ${my?'':'disabled'} style="--c:${HR_C[i]}"><i class="hr-silk"></i><b>${HR_NM[h[0]]}</b><span class="hr-st">⭐${h[1]} ${h[2]>0?'📈'.repeat(h[2]):h[2]<0?'📉'.repeat(-h[2]):'➖'}</span><span class="hr-gp">يحب ${HR_G[h[3]].split(' ')[0]}</span><span class="hr-od"><b>${(d.od[i]/10).toFixed(1)}</b><small>${(d.po[i]/10).toFixed(1)}</small></span></button>`).join('')}<small class="r2tip">⭐ المستوى • 📈 الفورمة • الأرقام: ربح الفوز / ربح المركز (أول أو ثاني) لكل 1 🪙</small></div>`;
    if(my){const co=d.co[v],mn=hrMin(co),amts=[...new Set([10,25,50,100].filter(x=>x<=co&&x>=mn).concat(co>0?[co]:[]))];if(!amts.includes(U.a))U.a=amts[0]||0;
      s+=co>0?`<div class="pn-pick">${r2Seg('ht',['🏆 فوز','🥈 مركز'],U.t,true)}<div class="segs r2seg">${amts.map(a=>`<button class="seg ${U.a===a?'on':''}" data-ga="ha" data-i="${a}">${a===co&&co>100?'الكل '+a:a} 🪙</button>`).join('')}</div>
        <button class="btn red wide" data-ga="go" ${U.h!=null?'':'disabled'}>${U.h!=null?`راهن ${U.a} على ${HR_NM[d.hs[U.h][0]]} (${U.t?'مركز':'فوز'})`:'اختر حصان من فوق'}</button></div>`:`<button class="btn soft wide" data-ga="go">ما عندي فلوس، أتفرج على الشوط</button>`;}
    else if(me)s+=`<p class="note">${hasPicked(d,v)?'راهنت، ننتظر الباقين…':''}</p>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const U=S.r2hr;if(!U||U.k!==d.gid+':'+d.rd+':'+ctx.v)return;
    if(a==='hh'&&i>=0&&i<6){U.h=i;render();return;}if(a==='ht'&&(i===0||i===1)){U.t=i;render();return;}if(a==='ha'&&Number.isInteger(i)&&i>0&&i<=d.co[ctx.v]){U.a=i;render();return;}
    if(a==='go'){const co=d.co[ctx.v];if(co<1){simulPick(d,ctx.v,0);return;}if(U.h==null)return;const am=r2Clamp(U.a,hrMin(co),co);simulPick(d,ctx.v,am*12+U.h*2+U.t);}},
  net:{local:['hh','ht','ha']},
  resolve(d,picks){const pf=d.hs.map(h=>hrPerf(h,d.tc,r2N())),ord=pf.map((_,i)=>i).sort((a,b)=>pf[b]-pf[a]),co=[...d.co],bets=[];
    picks.forEach((p,s)=>{const x=hrDec(p);if(!x||d.out[s]==='1'||x.h>5)return;let a=r2Clamp(x.a,0,co[s]);if(co[s]>0&&a<hrMin(co[s]))a=hrMin(co[s]);if(!a){bets.push([s,0,0,0,0]);return;}
      const win=x.t?ord.indexOf(x.h)<2:ord[0]===x.h,got=win?Math.floor(a*(x.t?d.po[x.h]:d.od[x.h])/10):0;co[s]+=got-a;bets.push([s,x.h,x.t,a,got-a]);});
    const lr={hs:d.hs,ord,bets},rd=d.rd+1,last=`فاز ${HR_NM[d.hs[ord[0]][0]]}، والثاني ${HR_NM[d.hs[ord[1]][0]]}`;
    const x={...d,co,lr,rd,last};if(rd>=d.R||co.every((c,s)=>d.out[s]==='1'||c<1))return {...x,win:r2Best(x,co.map((c,s)=>x.out[s]==='1'?null:c))};
    return {...x,...hrNew(x,rd)};},
  // a bot: the hard one reads the going (its own chances), the middle one trusts the book now and then, the easy one guesses
  botPick(d,s,lv){const co=d.co[s];if(co<1)return 0;const mn=hrMin(co);if(lv===1)return r2Clamp([10,25,50][rnd(3)],mn,co)*12+rnd(6)*2+rnd(2);
    const P=hrProb(d.hs,d.tc,mulberry(seedOf(d.gid+s+':hp'+d.rd)),lv===3?700:300,lv===2&&Math.random()<.5);let best=null;
    for(let h=0;h<6;h++)for(const t of [0,1]){const p=t?P.p[h]:P.w[h],o=(t?d.po[h]:d.od[h])/10,ev=p*o-1;if(!best||ev>best[0])best=[ev,h,t,p,o];}
    const [ev,h,t,p,o]=best,left=d.R-d.rd,lead=Math.max(...d.co.filter((_,j)=>j!==s&&d.out[j]!=='1'));
    let f=ev>0?Math.min(.5,(p*o-1)/(o-1)*.6):0;if(lead>co&&left<=2)f=Math.max(f,lv===3?.6:.4);
    return r2Clamp(Math.round(co*f),mn,co)*12+h*2+t;},
  after(d){const el=app.querySelector('.hr-svg');if(!el||!once('hr'+el.dataset.key)||liteFx())return;const L=d.lr;if(!L)return;
    const R=mulberry(seedOf(el.dataset.key));r2Play(1150,ms=>{el.querySelectorAll('.hr-h').forEach(g=>{const i=+g.dataset.i,r=L.ord.indexOf(i),y=19+i*22,end=270-r*14;
      const mid=[.3,.55,.8].map(f=>Math.round(10+(end-10)*f+(R()-.5)*30));g.animate([{transform:`translate(10px,${y}px)`},...mid.map(x=>({transform:`translate(${x}px,${y}px)`})),{transform:`translate(${end}px,${y}px)`}],{duration:ms,easing:'linear'});});});}
};
HELP.r_horse='سباق خيل فيه 5 أشواط، وكل لاعب يبدأ بـ100 🪙. قبل كل شوط الكل يراهن بالسر مع بعض: اختر حصان، ونوع الرهان (فوز: لازم يجي الأول، أو مركز: يجي الأول أو الثاني بربح أقل)، وكم تحط (أقل شي 10). لو كسبت تاخذ رهانك مضروب في الرقم المكتوب، ولو خسرت يروح. الأرقام محسوبة على مستوى الحصان وفورمته بس، لكن كل حصان يحب نوع أرض (جاف أو لين أو ثقيل): الحصان اللي يحب أرض اليوم يركض أحسن من رقمه، واللي يحبها عكسها يركض أسوأ، وهنا الفرصة. السباق فيه حظ، فلا تحط كل شي إلا لو تحتاج تلحق. بعد 5 أشواط الأغنى يفوز.'+R2TM;

/* =================================================================
   الصقور: 5 days of hunting. On your turn you take the falcon out: three quarries show up, pick one and stop the release
   meter in its window. A catch goes in the day's bag and you may fly again (each flight after the first is harder) or
   go back to camp and keep the bag. A near miss ends the day (the bag is kept); a wild miss loses the falcon for the day,
   and the bag with it. Every flight tires the falcon; it gets 2 back each morning (5 at most).
   ================================================================= */
const FC_P=[['حبارى',7,110,950,2,'🪶'],['كروان',5,150,1050,1,'🐦'],['قطا',4,175,1100,1,'🕊️'],['أرنب بري',3,210,1200,1,'🐇'],['حمام',2,260,1300,1,'🕊️']];
const fcW=(d,k)=>Math.round(FC_P[k][2]*Math.pow(.85,d.fl));
const fcC=d=>230+Math.floor(mulberry(seedOf(d.gid+':fc'+(d.sid||0)))()*540);
function fcOpts(){const o=new Set();while(o.size<3)o.add(Math.min(4,Math.floor(Math.random()*5.6)));return [...o].sort((a,b)=>a-b);}
// the next falconer (a new day when the round ends: the falcons rest)
function fcNext(x,t){const nx=r2Adv(x,t),rn=x.rn+(nx.nr?1:0);if(rn>=x.D)return {...x,rn,bag:0,fl:0,win:r2Best(x,x.pts.map((p,s)=>x.out[s]==='1'?null:p))};
  const sta=nx.nr?x.sta.map(v=>Math.min(5,v+2)):x.sta;return {...x,rn,sta,turn:nx.turn,bag:0,fl:0,pr:fcOpts()};}
function fcFly(d,t,k,v){const c=fcC(d),w=fcW(d,k)/2,e=Math.abs(v-c),[n0,p0,,,cost]=FC_P[k],sta=[...d.sta],sid=(d.sid||0)+1;sta[t]=Math.max(0,sta[t]-cost);
  const lx={s:t,k,r:e<=w?0:e<=w*1.9?1:2,id:sid};
  if(lx.r===0){const x={...d,sta,sid,lx,bag:d.bag+p0,fl:d.fl+1,pr:fcOpts(),last:`${nm(d,t)}: الصقر صاد ${n0}! (+${p0})`};
    return Math.min(...x.pr.map(q=>FC_P[q][4]))>sta[t]?fcHome(x,t,' • الصقر تعب'):x;}
  if(lx.r===1)return fcHome({...d,sta,sid,lx,last:`${nm(d,t)}: فاته ${n0} ورجع`},t,'');
  sta[t]=Math.max(0,sta[t]-1);return fcNext({...d,sta,sid,lx,last:`${nm(d,t)}: الصقر لحق ${n0} بعيد وما رجع إلا بالليل! راحت الحصيلة (${d.bag})`},t);}
function fcHome(d,t,why){const pts=[...d.pts];pts[t]+=d.bag;return fcNext({...d,pts,last:d.last+why+(d.bag?` • رجع المخيم بـ${d.bag}`:'')},t);}
const fcOk=(d,t,k)=>Number.isInteger(k)&&d.pr.includes(k)&&FC_P[k][4]<=d.sta[t];
// the chance a stop lands in [0,w] off the centre for a hand that scatters by sig
const r2Pin=(w,sig)=>{const F=x=>{const t=1/(1+.3275911*Math.abs(x)/Math.SQRT2),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x/2);return x>=0?(1+y)/2:(1-y)/2;};return F(w/sig)-F(-w/sig);};
function fcBot(d,s,lv){const ok=d.pr.filter(k=>fcOk(d,s,k));if(!ok.length)return -1;
  if(lv===1)return d.fl>0&&Math.random()<.35?-1:ok[rnd(ok.length)];
  const sig=R2SIG[lv],daysLeft=d.D-d.rn-1;let best=[-.2-(d.fl?0:-.2),-1];
  for(const k of ok){const w=fcW(d,k)/2,pin=r2Pin(w,sig),pfar=1-r2Pin(w*1.9,sig),cost=FC_P[k][4],tire=d.sta[s]-cost<2&&daysLeft>0?.6*cost:0;
    const ev=pin*FC_P[k][1]-pfar*d.bag-tire+(lv===2?Math.random()*.8-.4:0);if(ev>best[0])best=[ev,k];}
  return best[1];}
GAMES.r_falcon={name:'الصقور',cat:'sport',lbc:'#A0522D',
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="r2fc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C27A"/><stop offset="1" stop-color="#E8955A"/></linearGradient></defs><rect width="100" height="100" fill="url(#r2fc)"/><circle cx="74" cy="26" r="11" fill="#FFF1C9"/><path d="M0 78q25-14 50-6t50-4V100H0z" fill="#C98B4E"/><path d="M0 88q30-8 60-2t40 0V100H0z" fill="#B0763D"/><path d="M30 46q10-14 26-10q10-12 26-8q-12 4-14 12q10 2 14 10q-14-4-22 2l-8 10-6-4 4-8q-10 0-20-4z" fill="#5A3A22"/><path d="M52 40l6-3 2 3-5 2z" fill="#F0B429"/><circle cx="55" cy="38" r="1.4" fill="#111"/></svg>`,
  init:n=>({rn:0,D:5,pts:Array(n).fill(0),sta:Array(n).fill(5),bag:0,fl:0,pr:[],sid:0,lx:null,last:''}),
  start:d=>({...d,pr:fcOpts()}),
  net:{host:['fly','home'],local:['fp']},redeal:d=>d,
  points:d=>d.pts,
  status:(d,ctx)=>r2Stat(d,ctx,`<small>اليوم ${Math.min(d.rn+1,d.D)} من ${d.D}${d.win==null&&d.bag?` • الحصيلة ${d.bag}`:''}</small><br>`),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx;
    const sel=r2Dr('fp',0,4,-1),k=fcOk(d,t,sel)?sel:-1;
    let s=`<div class="r2 r2fc"><svg class="fc-svg" viewBox="0 0 300 150" data-k="fcs" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="fcsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5B971"/><stop offset=".7" stop-color="#FBE3B3"/></linearGradient></defs>
      <rect width="300" height="150" fill="url(#fcsk)"/><circle cx="240" cy="40" r="16" fill="#FFF4D2"/><path d="M0 104q60-26 130-12t170-10V150H0z" fill="#D9A15E"/><path d="M0 124q80-18 160-6t140-4V150H0z" fill="#C78A48"/>
      <g transform="translate(40 104)"><path d="M-14 0l14-22 14 22z" fill="#8A5A2B"/><path d="M-6 0l6-10 6 10z" fill="#4A2E16"/></g><g transform="translate(70 112)"><circle r="4" fill="#F2C9A0"/><path d="M-5 4h10l2 16h-14z" fill="#fff"/><path d="M5 8l10-6" stroke="#fff" stroke-width="3"/></g>
      <g class="fc-bird" style="transform:translate(${L?(L.r===0?210:L.r===1?190:290):84}px,${L?(L.r===2?20:92):100}px)"><path d="M-12 0q6-8 12-4q6-6 14-4q-6 2-7 6q5 1 7 5q-7-2-11 1l-4 5-3-2 2-4q-5 0-10-3z" fill="#5A3A22"/></g>
      ${L&&L.r!==2?`<text class="fc-prey" x="${L.r===0?222:240}" y="${L.r===0?104:96}" text-anchor="middle">${FC_P[L.k][5]}</text>`:''}
      <g transform="translate(150 18)"><rect x="-58" y="-12" width="116" height="22" rx="11" fill="rgba(255,255,255,.8)"/><text y="4" text-anchor="middle" class="fc-st">${nm(d,t).replace(/<[^>]+>/g,'')}: ${'🔥'.repeat(d.sta[t])}${'·'.repeat(5-d.sta[t])}</text></g></svg>`;
    s+=`<div class="fc-bag"><span>حصيلة الطلعة: <b>${d.bag}</b></span><span>الطلعة رقم ${d.fl+1}${d.fl?' (أصعب)':''}</span></div>`;
    if(my){s+=`<div class="fc-pr">${d.pr.map(q=>{const [n0,p0,,,c0,e0]=FC_P[q],ok=fcOk(d,t,q);return `<button class="fc-q ${q===k?'on':''}" data-ga="fp" data-i="${q}" ${ok?'':'disabled'}><i>${e0}</i><b>${n0}</b><small>+${p0} • تعب ${c0}${'🔥'}</small></button>`;}).join('')}</div>`;
      if(k>=0){const c=fcC(d),w=fcW(d,k)/2,m=r2mPar(key,FC_P[k][3]);s+=`${r2Meter(key,m,[[0,1000,'z0'],[r2Clamp(c-w*1.9,0,1000),r2Clamp(c+w*1.9,0,1000),'z1'],[r2Clamp(c-w,0,1000),r2Clamp(c+w,0,1000),'z2']],sv==null,sv,'وقّف المؤشر في الأخضر: الأصفر يفوته، والأحمر يضيع الصقر')}${r2Stop(key,'fly','🦅 أطلق الصقر',sv==null)}`;}
      else s+=`<p class="r2lbl">اختر الطريدة</p>`;
      if(d.fl>0)s+=`<button class="btn navy wide" data-ga="home">⛺ ارجع للمخيم بـ${d.bag}</button>`;}
    s+=`<div class="dt-list">${d.pl.map((_,i)=>`<span class="${i===t?'on':''}" style="--c:${col(d,i)}">${nm(d,i)} <b>${d.pts[i]}</b> ${'🔥'.repeat(d.sta[i])}</span>`).join('')}</div>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='fp'){if(fcOk(d,t,i)){S.draft.fp=String(i);render();}return;}
    if(a==='home'){if(d.fl>0)act(fcHome({...d,last:nm(d,t)+' اكتفى'},t,''));return;}
    if(a!=='fly')return;const k=r2Dr('fp',0,4,-1);if(!fcOk(d,t,k))return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);S.draft.fp=undefined;act(fcFly(d,t,k,v));},
  bot(d,s,lv){const k=fcBot(d,s,lv);if(k<0)return d.fl>0?fcHome({...d,last:nm(d,s)+' اكتفى'},s,''):fcNext({...d,last:nm(d,s)+' ريّح صقره'},s);return fcFly(d,s,k,r2BotStop(fcC(d),lv));},
  onTimeout:d=>d.fl>0?fcHome({...d,last:nm(d,d.turn)+' رجع'},d.turn,''):fcNext({...d,last:`${nm(d,d.turn)} ما طلع`},d.turn),
  after(d){r2Spin();const el=app.querySelector('.fc-svg');if(!el||!el.dataset.key||!once('fc'+el.dataset.key))return;const b=el.querySelector('.fc-bird');if(b)r2Anim(b,[{transform:'translate(84px,100px) scale(.8)'},{transform:b.style.transform}],440);}
};
HELP.r_falcon='مقناص بالصقور 5 أيام. بدورك تطلع بصقرك: تطلع لك 3 طرائد، كل وحدة لها نقاط وتعب: الحبارى غالية وصعبة، والحمام سهل ورخيص. اختر الطريدة ووقّف مؤشر الإطلاق في الأخضر. لو صاد تنضاف للحصيلة، وتقدر تطلقه مرة ثانية (كل طلعة أصعب من اللي قبلها) أو ترجع للمخيم وتحفظ حصيلتك. لو وقّفت في الأصفر يفوته ويرجع، وتنحفظ حصيلتك ويخلص دورك. لكن لو وقّفت في الأحمر يلحق الطريدة بعيد ويضيع لين الليل: تروح حصيلة الطلعة كلها ويتعب أكثر. كل طلعة تتعب الصقر 🔥، وكل صبح يرتاح ويرجع له 2 (أكثر شي 5)، والصقر التعبان ما يطلع. بعد 5 أيام الأكثر نقاط يفوز.'+R2TM;

/* =================================================================
   الحداق: hand-line fishing in the Gulf. Each player has a few baits of three kinds. On your turn pick a spot and a bait
   and cast: what bites is drawn on the host (the spot, the bait, the tide and how much the spot has been fished decide
   it). If something bites, stop the strike meter in its window to land it. All baits used: the best catch wins.
   ================================================================= */
const FS_SP=['الشعب المرجانية','القاع العميق','عرض البحر'],FS_BA=['روبيان','حبّار','سردين'],FS_TD=['مدّ 🌊','جزر 🏝️','راكد 🌫️'];
// fish: name, value, window, meter pace, liking per spot, per bait
const FS_F=[['هامور',8,120,1000,[3,4,.5],[2,3,1]],['شعري',5,170,1150,[4,1.5,.5],[3,1.5,1]],['صافي',3,220,1250,[4,.5,.3],[3,.5,1]],
  ['كنعد',9,100,900,[.3,1,4],[.3,1.5,3]],['جش',6,140,1050,[.8,2,3],[.8,1.5,2.5]],['زبيدي',7,130,1000,[.5,3,1],[2,1,1.5]]];
const FS_TM=[[.8,1,1.4],[1.4,.9,.8],[.9,.9,.9]];
// what may bite at spot p with bait b: weights of nothing and of each fish
function fsW(d,p,b){const st=.3+.7*d.sk[p]/d.sk0;return [3.2,...FS_F.map(f=>f[4][p]*f[5][b]*FS_TM[d.td][p]*st)];}
const fsC=d=>260+Math.floor(mulberry(seedOf(d.gid+':fs'+(d.sid||0)))()*480);
const fsBaits=n=>n<=4?3:n<=6?2:2;
function fsNext(x,t){const left=s=>x.ba[s].reduce((a,b)=>a+b,0);const al=r2Ord(x).filter(s=>left(s)>0);
  if(!al.length)return {...x,ph:'cast',fi:-1,win:r2Best(x,x.kg.map((k,s)=>x.out[s]==='1'?null:k))};
  const nx=r2Adv(x,t);let tn=nx.turn,nr=nx.nr;for(let k=0;k<x.pl.length&&left(tn)<1;k++){const y=r2Adv(x,tn);nr=nr||y.nr;tn=y.turn;}
  return {...x,ph:'cast',fi:-1,turn:tn,rn:x.rn+(nr?1:0),td:nr?Math.floor(Math.random()*3):x.td};}
function fsCast(d,t,p,b){const ba=d.ba.map((q,s)=>s===t?q.map((v,j)=>j===b?v-1:v):q),W=fsW(d,p,b),tot=W.reduce((a,c)=>a+c,0);let r=Math.random()*tot,f=-1;
  for(let k=0;k<W.length;k++){r-=W[k];if(r<0){f=k-1;break;}}const sid=(d.sid||0)+1;
  if(f<0)return fsNext({...d,ba,sid,lx:{s:t,p,f:-1,r:0,id:sid},last:`${nm(d,t)} رمى في ${FS_SP[p]} بـ${FS_BA[b]}… وما أكل شي`},t);
  return {...d,ba,sid,ph:'bite',fi:f,fp:p,lx:{s:t,p,f,r:-1,id:sid},last:`${nm(d,t)}: فيه شي ماسك! 🎣 ${FS_F[f][0]}`};}
function fsPull(d,t,v){const f=d.fi,c=fsC(d),w=FS_F[f][2]/2,e=Math.abs(v-c),ok=e<=w||(e<=w*1.5&&Math.random()<.4),sid=(d.sid||0)+1;
  const kg=[...d.kg],sk=[...d.sk],nc=[...d.nc];if(ok){kg[t]+=FS_F[f][1];sk[d.fp]=Math.max(0,sk[d.fp]-1);nc[t]++;}
  return fsNext({...d,kg,sk,nc,sid,lx:{s:t,p:d.fp,f,r:ok?1:0,id:sid},last:`${nm(d,t)}: ${ok?`طلّع ${FS_F[f][0]}! (+${FS_F[f][1]})`:`${FS_F[f][0]} قطع الخيط وهرب`}`},t);}
const fsOk=(d,t,p,b)=>p>=0&&p<3&&b>=0&&b<3&&d.ba[t][b]>0;
function fsBot(d,s,lv){const opts=[];for(let p=0;p<3;p++)for(let b=0;b<3;b++)if(fsOk(d,s,p,b))opts.push([p,b]);if(lv===1)return opts[rnd(opts.length)];
  let best=null;for(const [p,b] of opts){const W=fsW(d,p,b),tot=W.reduce((a,c)=>a+c,0);let ev=0;FS_F.forEach((f,k)=>{ev+=W[k+1]/tot*f[1]*(r2Pin(f[2]/2,R2SIG[lv])+.4*(r2Pin(f[2]*.75,R2SIG[lv])-r2Pin(f[2]/2,R2SIG[lv])));});
    ev+=lv===2?Math.random()*.6:0;if(!best||ev>best[0])best=[ev,p,b];}
  return [best[1],best[2]];}
GAMES.r_fish={name:'الحداق',cat:'sport',lbc:'#1F6F8B',
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="r2fs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CCBEA"/><stop offset=".42" stop-color="#BFE6F5"/><stop offset=".43" stop-color="#2F86B8"/><stop offset="1" stop-color="#16557D"/></linearGradient></defs><rect width="100" height="100" fill="url(#r2fs)"/><path d="M14 40q20 8 40 0l-4 8H18z" fill="#8A5A2B"/><path d="M30 40V18" stroke="#6B3E1F" stroke-width="2"/><path d="M30 18l14 18" stroke="#fff" stroke-width="1"/><path d="M44 36q8 20 8 40" stroke="#fff" stroke-width="1" fill="none"/><path d="M40 78q12-10 24 0q-12 10-24 0zM64 78l8-6v12z" fill="#F0B429"/><circle cx="46" cy="76" r="1.4" fill="#111"/></svg>`,
  init:n=>({rn:0,td:0,ph:'cast',fi:-1,fp:0,ba:Array(n).fill(0).map(()=>Array(3).fill(fsBaits(n))),kg:Array(n).fill(0),nc:Array(n).fill(0),sk:[10+n,10+n,10+n],sk0:10+n,sid:0,lx:null,last:''}),
  start:d=>({...d,td:rnd(3)}),
  net:{host:['cast','pull'],local:['fsp','fsb']},redeal:d=>d,
  points:d=>d.kg,
  status:(d,ctx)=>r2Stat(d,ctx,d.win==null?`<small>${FS_TD[d.td]} • الطُعم الباقي ${d.ba[d.turn].reduce((a,b)=>a+b,0)}</small><br>`:''),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.kg[s]} (${d.nc[s]} سمكة)`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx,p=r2Dr('fsp',0,2,0),b0=r2Dr('fsb',0,2,0),b=d.ba[t][b0]>0?b0:d.ba[t].findIndex(x=>x>0);
    const SX=[60,150,240],hk=d.ph==='bite'?d.fp:L?L.p:p,fsh=(f,x,y,sc)=>`<g class="fs-f" style="transform:translate(${x}px,${y}px) scale(${sc})"><path d="M-14 0q12-10 24 0q-12 10-24 0zM10 0l8-6v12z" fill="${['#C0603A','#E0A04A','#8FA86B','#7C93A8','#B9C2C8','#C8C0B0'][f]}"/><circle cx="-8" cy="-1.5" r="1.4" fill="#111"/></g>`;
    let s=`<div class="r2 r2fs"><svg class="fs-svg" viewBox="0 0 300 170" data-k="fss" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="fsw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B9ACB"/><stop offset="1" stop-color="#0F4566"/></linearGradient><linearGradient id="fss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED7F0"/><stop offset="1" stop-color="#E3F4FB"/></linearGradient></defs>
      <rect width="300" height="54" fill="url(#fss)"/><rect y="54" width="300" height="116" fill="url(#fsw)"/><path d="M0 54q15-4 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6"/>
      <path d="M10 170q20-30 50-24t40 24z" fill="#E07A5F" opacity=".8"/><path d="M24 170q8-18 18-14M70 170q4-14 14-12" stroke="#F2B5A0" stroke-width="3" fill="none"/><path d="M200 170q50-8 100-4v4z" fill="#0A3249"/>
      ${SX.map((x,i)=>`<g class="fs-spot ${i===hk?'on':''}"><circle cx="${x}" cy="${i===1?140:i===0?120:96}" r="14" fill="#fff" opacity="${i===hk?.22:.08}"/><text x="${x}" y="70" text-anchor="middle">${FS_SP[i]}</text><text x="${x}" y="82" text-anchor="middle" class="fs-sk">${'🐟'.repeat(Math.ceil(d.sk[i]/d.sk0*4))}</text></g>`).join('')}
      <g class="fs-boat" style="transform:translateX(${SX[hk]-30}px)"><path d="M0 46h50l-8 12H8z" fill="#8A5A2B"/><path d="M8 46h34" stroke="#C49261" stroke-width="2"/><path d="M22 46V24" stroke="#6B3E1F" stroke-width="2"/><circle cx="30" cy="38" r="4" fill="#F2C9A0"/><path d="M26 42h8v6h-8z" fill="#fff"/><path d="M33 38l14-14" stroke="#4A2E16" stroke-width="1.5"/><path d="M47 24q2 50 -17 ${d.ph==='bite'?70:L&&L.p===hk?62:50}" stroke="#fff" stroke-width=".6" fill="none" opacity=".8"/></g>
      ${d.ph==='bite'?fsh(d.fi,SX[hk],126,1.2):L&&L.f>=0&&L.r===1?fsh(L.f,SX[hk],70,1.4):''}</svg>`;
    s+=`<div class="fs-info"><span>${FS_TD[d.td]}</span>${d.win==null?`<span>طُعمك: ${FS_BA.map((x,j)=>`${x} ${d.ba[t][j]}`).join(' • ')}</span>`:''}</div>`;
    if(my&&d.ph==='cast'){s+=`<p class="r2lbl">وين ترمي؟</p>${r2Seg('fsp',FS_SP,p,true)}<p class="r2lbl">بأي طُعم؟</p><div class="segs r2seg">${FS_BA.map((x,j)=>`<button class="seg ${j===b?'on':''}" data-ga="fsb" data-i="${j}" ${d.ba[t][j]>0?'':'disabled'}>${x} (${d.ba[t][j]})</button>`).join('')}</div>
      <button class="btn red wide" data-ga="cast" ${b>=0?'':'disabled'}>🎣 ارمِ الخيط</button>`;}
    if(my&&d.ph==='bite'){const f=FS_F[d.fi],c=fsC(d),w=f[2]/2,m=r2mPar(key,f[3]);
      s+=`<p class="r2lbl">${f[0]} ماسك الطُعم! شدّه في الوقت الصح</p>${r2Meter(key,m,[[0,1000,'z0'],[r2Clamp(c-w*1.5,0,1000),r2Clamp(c+w*1.5,0,1000),'z1'],[r2Clamp(c-w,0,1000),r2Clamp(c+w,0,1000),'z2']],sv==null,sv,'وقّف المؤشر في الأخضر')}${r2Stop(key,'pull','💪 شُد!',sv==null)}`;}
    s+=`<div class="dt-list">${d.pl.map((_,i)=>`<span class="${i===t?'on':''}" style="--c:${col(d,i)}">${nm(d,i)} <b>${d.kg[i]}</b> 🐟${d.nc[i]}</span>`).join('')}</div>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='fsp'){if(i>=0&&i<3){S.draft.fsp=String(i);render();}return;}
    if(a==='fsb'){if(i>=0&&i<3&&d.ba[t][i]>0){S.draft.fsb=String(i);render();}return;}
    if(a==='cast'&&d.ph==='cast'){const p=r2Dr('fsp',0,2,0),b0=r2Dr('fsb',0,2,0),b=d.ba[t][b0]>0?b0:d.ba[t].findIndex(x=>x>0);if(fsOk(d,t,p,b))act(fsCast(d,t,p,b));return;}
    if(a==='pull'&&d.ph==='bite'){const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(fsPull(d,t,v));}},
  bot(d,s,lv){if(d.ph==='bite')return fsPull(d,s,r2BotStop(fsC(d),lv));const [p,b]=fsBot(d,s,lv);return fsCast(d,s,p,b);},
  onTimeout:d=>{const t=d.turn;if(d.ph==='bite')return fsPull(d,t,0);const b=d.ba[t].findIndex(x=>x>0);const ba=d.ba.map((q,s)=>s===t?q.map((v,j)=>j===b?v-1:v):q);return fsNext({...d,ba,last:`${nm(d,t)} ضاع عليه دور`},t);},
  after(d){r2Spin();const el=app.querySelector('.fs-svg');if(!el||!el.dataset.key||!once('fs'+el.dataset.key))return;const f=el.querySelector('.fs-f');if(f)r2Anim(f,[{opacity:0,transform:f.style.transform.replace(/translate\(([^,]+),([^)]+)\)/,(m,x,y)=>`translate(${x},${parseFloat(y)+30}px)`)},{opacity:1,transform:f.style.transform}],380);}
};
HELP.r_fish='حداق (صيد بالخيط) في الخليج. كل لاعب معه كم طُعم من 3 أنواع: روبيان وحبّار وسردين. بدورك اختر المكان (الشعب المرجانية، القاع العميق، عرض البحر) ونوع الطُعم وارمِ الخيط. اللي يمسك يعتمد على المكان والطُعم والمد والجزر (يتغير كل جولة): الصافي والشعري يحبون الشعب والروبيان، والهامور والزبيدي في القاع، والكنعد والجش في عرض البحر ويحبون السردين. والمكان اللي ينصاد منه كثير يقل سمكه 🐟. لو مسك شي، وقّف المؤشر في الأخضر عشان تطلّعه (الأصفر يمكن). السمك الغالي مثل الكنعد والهامور أصعب. لما يخلص طُعم الكل، الأعلى قيمة صيد يفوز.'+R2TM;

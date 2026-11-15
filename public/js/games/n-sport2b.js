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
  status:(d,ctx)=>r2SimStat({...d,last:''},ctx,`<small>الشوط ${Math.min(d.rd+1,d.R)} من ${d.R} • الأرض ${HR_G[d.tc]}</small><br>`,'تراهن'),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.co[s]} 🪙`).join('، '),
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&d.out[v]!=='1',my=ctx.my&&d.win==null,L=d.lr;const k=d.gid+':'+d.rd+':'+v;if(!S.r2hr||S.r2hr.k!==k)S.r2hr={k,h:null,t:0,a:10};const U=S.r2hr;
    let s=`<div class="r2-root r2hr">`;
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
  net:{local:['hh','ht','ha']},redeal:d=>d,
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
  sta[t]=Math.max(0,sta[t]-1);return fcNext({...d,sta,sid,lx,last:`${nm(d,t)}: الصقر ما رجع إلا بالليل، راحت الحصيلة (${d.bag})`},t);}
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
  net:{host:['fly','home','rest'],local:['fp']},redeal:d=>d,
  points:d=>d.pts,
  status:(d,ctx)=>r2StatL(d,ctx,`<small>اليوم ${Math.min(d.rn+1,d.D)} من ${d.D}${d.win==null&&d.bag?` • الحصيلة ${d.bag}`:''}</small><br>`),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx;
    const sel=r2Dr('fp',0,4,-1),k=fcOk(d,t,sel)?sel:-1;
    let s=`<div class="r2-root r2fc"><svg class="fc-svg" viewBox="0 0 300 150" data-k="fcs" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="fcsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5B971"/><stop offset=".7" stop-color="#FBE3B3"/></linearGradient></defs>
      <rect width="300" height="150" fill="url(#fcsk)"/><circle cx="240" cy="40" r="16" fill="#FFF4D2"/><path d="M0 104q60-26 130-12t170-10V150H0z" fill="#D9A15E"/><path d="M0 124q80-18 160-6t140-4V150H0z" fill="#C78A48"/>
      <g transform="translate(40 104)"><path d="M-14 0l14-22 14 22z" fill="#8A5A2B"/><path d="M-6 0l6-10 6 10z" fill="#4A2E16"/></g><g transform="translate(70 112)"><circle r="4" fill="#F2C9A0"/><path d="M-5 4h10l2 16h-14z" fill="#fff"/><path d="M5 8l10-6" stroke="#fff" stroke-width="3"/></g>
      <g class="fc-bird" style="transform:translate(${L?(L.r===0?210:L.r===1?190:290):84}px,${L?(L.r===2?20:92):100}px)"><path d="M-12 0q6-8 12-4q6-6 14-4q-6 2-7 6q5 1 7 5q-7-2-11 1l-4 5-3-2 2-4q-5 0-10-3z" fill="#5A3A22"/></g>
      ${L&&L.r!==2?`<text class="fc-prey" x="${L.r===0?222:240}" y="${L.r===0?104:96}" text-anchor="middle">${FC_P[L.k][5]}</text>`:''}
      <g transform="translate(150 18)"><rect x="-58" y="-12" width="116" height="22" rx="11" fill="rgba(255,255,255,.8)"/><text y="4" text-anchor="middle" class="fc-st">${nm(d,t).replace(/<[^>]+>/g,'')}: ${'🔥'.repeat(d.sta[t])}${'·'.repeat(5-d.sta[t])}</text></g></svg>`;
    s+=`<div class="fc-bag"><span>حصيلة الطلعة: <b>${d.bag}</b></span><span>الطلعة رقم ${d.fl+1}${d.fl?' (أصعب)':''}</span></div>`;
    if(my){s+=`<div class="fc-pr">${d.pr.map(q=>{const [n0,p0,,,c0,e0]=FC_P[q],ok=fcOk(d,t,q);return `<button class="fc-q ${q===k?'on':''}" data-ga="fp" data-i="${q}" ${ok?'':'disabled'}><i>${e0}</i><b>${n0}</b><small>+${p0} • تعب ${c0}${'🔥'}</small></button>`;}).join('')}</div>`;
      if(k>=0){const c=fcC(d),w=fcW(d,k)/2,m=r2mPar(key,FC_P[k][3]);s+=`${r2Meter(key,m,[[0,1000,'z0'],[r2Clamp(c-w*1.9,0,1000),r2Clamp(c+w*1.9,0,1000),'z1'],[r2Clamp(c-w,0,1000),r2Clamp(c+w,0,1000),'z2']],sv==null,sv,'وقّف المؤشر في الأخضر: الأصفر يفوته، والأحمر يضيع الصقر')}${r2Stop(key,'fly','🦅 أطلق الصقر',sv==null)}`;}
      else s+=`<p class="r2lbl">اختر الطريدة</p>`;
      if(d.fl>0)s+=`<button class="btn navy wide" data-ga="home">⛺ ارجع للمخيم بـ${d.bag}</button>`;
      else if(!d.pr.some(q=>fcOk(d,t,q)))s+=`<p class="r2lbl">صقرك تعبان اليوم 😴</p><button class="btn navy wide" data-ga="rest">ريّحه للجولة الجاية</button>`;}
    s+=`<div class="dt-list">${d.pl.map((_,i)=>`<span class="${i===t?'on':''}" style="--c:${col(d,i)}">${nm(d,i)} <b>${d.pts[i]}</b> ${'🔥'.repeat(d.sta[i])}</span>`).join('')}</div>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='fp'){if(fcOk(d,t,i)){S.draft.fp=String(i);render();}return;}
    if(a==='home'){if(d.fl>0)act(fcHome({...d,last:nm(d,t)+' اكتفى'},t,''));return;}
    if(a==='rest'){if(!d.fl&&!d.pr.some(q=>fcOk(d,t,q)))act(fcNext({...d,last:nm(d,t)+' ريّح صقره'},t));return;}
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
  status:(d,ctx)=>r2StatL(d,ctx,d.win==null?`<small>${FS_TD[d.td]} • الطُعم الباقي ${d.ba[d.turn].reduce((a,b)=>a+b,0)}</small><br>`:''),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.kg[s]} (${d.nc[s]} سمكة)`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx,p=r2Dr('fsp',0,2,0),b0=r2Dr('fsb',0,2,0),b=d.ba[t][b0]>0?b0:d.ba[t].findIndex(x=>x>0);
    const SX=[60,150,240],hk=d.ph==='bite'?d.fp:L?L.p:p,fsh=(f,x,y,sc)=>`<g class="fs-f" style="transform:translate(${x}px,${y}px) scale(${sc})"><path d="M-14 0q12-10 24 0q-12 10-24 0zM10 0l8-6v12z" fill="${['#C0603A','#E0A04A','#8FA86B','#7C93A8','#B9C2C8','#C8C0B0'][f]}"/><circle cx="-8" cy="-1.5" r="1.4" fill="#111"/></g>`;
    let s=`<div class="r2-root r2fs"><svg class="fs-svg" viewBox="0 0 300 170" data-k="fss" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="fsw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B9ACB"/><stop offset="1" stop-color="#0F4566"/></linearGradient><linearGradient id="fss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED7F0"/><stop offset="1" stop-color="#E3F4FB"/></linearGradient></defs>
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

/* =================================================================
   سباق السفن الشراعية: a dhow race round a mark and back. Every round all skippers at once pick a heading (12 points of
   the compass) and trim the sail on the meter; the boats move together on the host. A boat cannot sail into the wind
   (its speed falls off near it), turning through the wind (a tack) or across it downwind (a gybe) costs speed, and the
   wind shifts every round. Round the mark, then the first back across the line wins.
   ================================================================= */
const DH_M=[50,36],DH_LY=116,DH_POL=[[0,0],[30,.05],[40,.55],[55,.82],[90,1],[120,1],[150,.88],[180,.7]];
const dhPol=a=>{for(let k=1;k<DH_POL.length;k++)if(a<=DH_POL[k][0]){const [a0,v0]=DH_POL[k-1],[a1,v1]=DH_POL[k];return v0+(v1-v0)*(a-a0)/(a1-a0);}return .7;};
const dhDiff=(a,b)=>((a-b)%360+540)%360-180;
// one boat's move: b=[x,y,heading,side,leg]; h the new heading (0..11), v the trim meter, wd where the wind comes from
function dhMove(b,h,v,wd){const hd=h*30,tw=dhDiff(hd,wd),al=Math.abs(tw),side=tw>=0?1:-1,trim=.6+.4*Math.max(0,1-Math.abs(v-500)/350);
  let sp=14*dhPol(al)*trim,turn='';if(b[3]&&side!==b[3]){const was=Math.abs(dhDiff(b[2]*30,wd));if(was<95||al<95){sp*=.55;turn='tack';}else{sp*=.8;turn='gybe';}}
  return {x:b[0]+Math.sin(hd*Math.PI/180)*sp,y:b[1]-Math.cos(hd*Math.PI/180)*sp,side,sp,turn};}
const dhTarget=b=>b[4]?[50,DH_LY+4]:DH_M;
// distance from the mark to the segment a→b
const dhSeg=(ax,ay,bx,by,px,py)=>{const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?r2Clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0;return Math.hypot(ax+dx*t-px,ay+dy*t-py);};
const dhOk=p=>Number.isInteger(p)&&p>=0&&p<12*1001&&p%1001<=1000;
GAMES.r_dhow={name:'سباق السفن الشراعية',cat:'sport',lbc:'#1D6FA3',
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="r2dh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ED0F2"/><stop offset=".55" stop-color="#CBEBF9"/><stop offset=".56" stop-color="#2F86B8"/><stop offset="1" stop-color="#16557D"/></linearGradient></defs><rect width="100" height="100" fill="url(#r2dh)"/><path d="M18 64h56l-8 12H28z" fill="#8A5A2B"/><path d="M46 64V14" stroke="#6B3E1F" stroke-width="2.5"/><path d="M47 16L76 58H47z" fill="#F7F1E1"/><path d="M30 22L70 12" stroke="#6B3E1F" stroke-width="2"/><path d="M0 84q12-4 25 0t25 0 25 0 25 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/><path d="M8 20h14M14 14l8 6-8 6" stroke="#fff" stroke-width="2.5" fill="none"/></svg>`,
  init:n=>({rd:0,bt:[],pv:[],wd:0,wn:0,last:''}),
  start:d=>{const n=d.pl.length,R=mulberry(seedOf(d.gid+':dh'));return {...d,wd:Math.round(R()*30-15),bt:d.pl.map((_,s)=>[+(30+(n>1?s*40/(n-1):20)).toFixed(1),DH_LY+6,0,0,0]),pv:d.pl.map(()=>null)};},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||dhOk(p.pick),
  viewer:d=>simulViewer(d),coverMsg:d=>d.last||'',
  points:d=>d.bt.map(b=>b[4]?'⛵ عودة':'⬆ المنارة'),
  status:(d,ctx)=>r2SimStat({...d,last:''},ctx,`<small>الجولة ${d.rd+1} • الريح من ${dhWind(d.wd)}</small><br>`,'تختار اتجاهك'),
  winExtra:d=>d.last,
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&d.out[v]!=='1',my=ctx.my&&d.win==null,key=d.gid+':'+d.rd+':'+v,sv=r2Stopped(key);
    const b=me?d.bt[v]:null,h=me?r2Dr('dh',0,11,b[2]):0;
    const boat=(s,bb,cls)=>{const hd=bb[2]*30,sd=bb[3]||1;return `<g class="dh-b ${cls||''}" data-s="${s}" style="transform:translate(${bb[0].toFixed(1)}px,${bb[1].toFixed(1)}px)"><g style="transform:rotate(${hd}deg)"><path d="M0-5.5q2.6 2.5 2.4 8.5H-2.4Q-2.6-3 0-5.5z" fill="#8A5A2B" stroke="#4A2E16" stroke-width=".4"/><path d="M0-4.5Q${sd*-5} 0 0 4" fill="${col(d,s)}" stroke="#fff" stroke-width=".4" opacity=".95"/></g></g>`;};
    const wa=d.wd*Math.PI/180;
    let s=`<div class="r2-root r2dh"><svg class="dh-svg" viewBox="0 0 100 130" data-k="dhs" data-key="${d.gid}r${d.rd}"><defs><linearGradient id="dhs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A97CD"/><stop offset="1" stop-color="#1C6A9C"/></linearGradient><pattern id="dhw" width="16" height="10" patternUnits="userSpaceOnUse"><path d="M0 6q4-3 8 0t8 0" stroke="#fff" stroke-width=".4" fill="none" opacity=".25"/></pattern></defs>
      <rect width="100" height="130" fill="url(#dhs)"/><rect width="100" height="130" fill="url(#dhw)"/><path d="M0 0h100v6q-25 4-50 0T0 6z" fill="#E9D7A6"/>
      <path d="M28 ${DH_LY}H72" stroke="#fff" stroke-width=".5" stroke-dasharray="2 1.5"/><circle cx="28" cy="${DH_LY}" r="1.6" fill="#F28C28"/><circle cx="72" cy="${DH_LY}" r="1.6" fill="#F28C28"/>
      <circle cx="${DH_M[0]}" cy="${DH_M[1]}" r="8" fill="none" stroke="#fff" stroke-width=".3" stroke-dasharray="1 1.4" opacity=".6"/><path d="M${DH_M[0]} ${DH_M[1]+2}l-2.4 3h4.8z" fill="#E5483F"/><path d="M${DH_M[0]} ${DH_M[1]-5}v7" stroke="#fff" stroke-width=".6"/><path d="M${DH_M[0]} ${DH_M[1]-5}l4 1.4-4 1.4z" fill="#F2C230"/>
      <g transform="translate(12 16)"><circle r="8" fill="rgba(255,255,255,.85)"/><g style="transform:rotate(${d.wd}deg)"><path d="M0-6V4" stroke="#1B4F72" stroke-width="1.4"/><path d="M0 6l-2.6-3.6h5.2z" fill="#1B4F72"/></g><text y="12.5" text-anchor="middle" class="dh-wt">الريح</text></g>
      ${d.pv.map((p,s)=>p&&d.out[s]!=='1'?`<path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${d.bt[s][0].toFixed(1)} ${d.bt[s][1].toFixed(1)}" stroke="#fff" stroke-width=".5" stroke-dasharray="1 1" opacity=".55"/>`:'').join('')}
      ${me&&my?`<path d="M${b[0].toFixed(1)} ${b[1].toFixed(1)}l${(Math.sin(h*Math.PI/6)*12).toFixed(1)} ${(-Math.cos(h*Math.PI/6)*12).toFixed(1)}" stroke="#FFD84D" stroke-width=".8" stroke-dasharray="1.6 1"/>`:''}
      ${d.bt.map((bb,s)=>d.out[s]==='1'?'':boat(s,bb,s===v?'me':'')).join('')}</svg>`;
    const ls=`<div class="dt-list">${d.pl.map((_,i)=>{const bb=d.bt[i],tg=dhTarget(bb);return `<span class="${i===v?'on':''}" style="--c:${col(d,i)}">${nm(d,i)} ${bb[4]?'⬇':'⬆'} <b>${Math.round(Math.hypot(bb[0]-tg[0],bb[1]-tg[1]))}</b></span>`;}).join('')}</div>`;
    if(my){const m=r2mPar(key,1150),cur=b[2];
      s+=`<p class="r2lbl">${b[4]?'ارجع لخط النهاية تحت':'روح للمنارة فوق ودور حولها'}: اختر اتجاهك</p><div class="dh-rose">${[...Array(12).keys()].map(k=>{const tw=Math.abs(dhDiff(k*30,d.wd)),sp=dhPol(tw),sd=dhDiff(k*30,d.wd)>=0?1:-1,tk=b[3]&&sd!==b[3];
        return `<button class="dh-h ${k===h?'on':''} ${sp<.3?'dead':''}" data-ga="dh" data-i="${k}" style="--a:${k*30}deg;--q:${Math.round(sp*100)}%"><i></i><small>${tw<30?'✋':Math.round(sp*10)}${tk?'↺':''}</small></button>`;}).join('')}<div class="dh-mid"><b>${h===cur?'نفس الاتجاه':'اتجاه جديد'}</b><small>↺ = تغيير جهة الشراع (يبطّي)</small></div></div>
        ${r2Meter(key,m,[[0,1000,'z0'],[220,780,'z1'],[380,620,'z2']],sv==null,sv,'ضبط الشراع: كل ما قربت للنص أسرع')}${r2Stop(key,'sail','⛵ أبحر',sv==null)}`;}
    else if(me&&d.win==null)s+=`<p class="note">${hasPicked(d,v)?'اخترت، ننتظر الباقين…':''}</p>`;
    return s+ls+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='dh'){if(Number.isInteger(i)&&i>=0&&i<12){S.draft.dh=String(i);render();}return;}
    if(a==='sail'){const v=r2Read(i);r2Hold(d.gid+':'+d.rd+':'+ctx.v,v,ctx);simulPick(d,ctx.v,r2Dr('dh',0,11,d.bt[ctx.v][2])*1001+v);S.draft.dh=undefined;}},
  net:{local:['dh']},redeal:d=>d,
  resolve(d,picks){const bt=d.bt.map(b=>[...b]),pv=d.bt.map(b=>[b[0],b[1]]),fin=[];
    picks.forEach((p,s)=>{if(d.out[s]==='1')return;const b=bt[s],h=dhOk(p)?Math.floor(p/1001):b[2],v=dhOk(p)?p%1001:250,m=dhMove(b,h,v,d.wd);
      let x=r2Clamp(m.x,3,97),y=r2Clamp(m.y,3,127);
      if(!b[4]&&dhSeg(b[0],b[1],x,y,DH_M[0],DH_M[1])<8)b[4]=1;
      else if(b[4]&&b[1]<DH_LY&&y>=DH_LY){const f=(DH_LY-b[1])/(y-b[1]),cx=b[0]+(x-b[0])*f;if(cx>=18&&cx<=82)fin.push([f,s]);}
      b[0]=+x.toFixed(2);b[1]=+y.toFixed(2);b[2]=h;b[3]=m.side;});
    const wn=r2Clamp((d.wn||0)+r2N()*3,-6,6),wd=Math.round(r2Clamp(d.wd+wn+r2N()*4,-45,45)),rd=d.rd+1;
    let x={...d,bt,pv,wn:+wn.toFixed(2),wd,rd,last:`الريح صارت من ${dhWind(wd)}`};
    if(fin.length){fin.sort((a,b)=>a[0]-b[0]);return {...x,win:fin[0][1],last:`${nm(d,fin[0][1])} قطع خط النهاية أول! ⛵`};}
    if(rd>=40)return {...x,win:r2Best(x,bt.map((b,s)=>x.out[s]==='1'?null:b[4]*1000-Math.hypot(b[0]-dhTarget(b)[0],b[1]-dhTarget(b)[1])))};
    return x;},
  // a skipper: every heading tried at a fair trim, the one that ends nearest the next target (the easy one is careless)
  botPick(d,s,lv){const b=d.bt[s],tg=dhTarget(b);let best=[];
    for(let h=0;h<12;h++){const m=dhMove(b,h,500,d.wd);let x=m.x,y=m.y,sc=-Math.hypot(x-tg[0],y-tg[1]);if(!b[4]&&dhSeg(b[0],b[1],x,y,DH_M[0],DH_M[1])<8)sc+=30;
      if(lv===3&&!b[4]){const nx=dhMove([x,y,h,m.side,0],h,500,d.wd);sc+=.4*(-Math.hypot(nx.x-tg[0],nx.y-tg[1])+Math.hypot(x-tg[0],y-tg[1]));}
      best.push([sc+(lv===2?Math.random()*3:lv===1?Math.random()*9:0),h]);}
    best.sort((p,q)=>q[0]-p[0]);return best[0][1]*1001+r2BotStop(500,lv);},
  after(d){r2Spin();const el=app.querySelector('.dh-svg');if(!el||!once('dh'+el.dataset.key)||!d.rd)return;
    el.querySelectorAll('.dh-b').forEach(g=>{const s=+g.dataset.s,p=d.pv[s];if(p)r2Anim(g,[{transform:`translate(${p[0]}px,${p[1]}px)`},{transform:g.style.transform}],440,0,'ease-out');});}
};
function dhWind(w){const a=((w%360)+360)%360;return a<23||a>337?'الشمال ⬇':a<68?'الشمال الشرقي ↙':a<113?'الشرق ⬅':a<158?'الجنوب الشرقي ↖':a<203?'الجنوب ⬆':a<248?'الجنوب الغربي ↗':a<293?'الغرب ➡':'الشمال الغربي ↘';}
HELP.r_dhow='سباق سفن شراعية (أبوام) حول المنارة. كل جولة الكل يختار مع بعض: اتجاه سفينته من 12 اتجاه، وبعدين يوقّف مؤشر ضبط الشراع (كل ما قرب للنص أسرع)، والسفن تتحرك كلها مع بعض. الريح هي كل شي: ما تقدر تبحر عكسها مباشرة (✋)، وأسرع شي لما تكون الريح على جنبك، والرقم على كل اتجاه يوريك السرعة. عشان تطلع عكس الريح لازم «تعرّج» يمين ويسار، وكل ما غيّرت جهة الشراع (↺) تبطّي جولة. الريح تتغير شوي كل جولة، فراقبها واستغلها. أول شي روح للمنارة فوق ودور حولها، وبعدين ارجع، وأول سفينة تقطع خط النهاية تفوز. ولو لعبتوا فرق، يفوز فريق السفينة الأولى.';

/* =================================================================
   قفز الحواجز: a course of 8 fences, all riders fence by fence. Pick a pace and stop the take-off meter: in the green a
   clean jump; in the yellow a rail (or a foot in the water) is likely, 4 faults; far out the horse refuses (4 faults and
   time, jump again; a second refusal eliminates). A slow pace is easier but the clock counts: one fault for each second
   over the time allowed. Fewest faults win, then the fastest time.
   ================================================================= */
const SJ_T=[['عمودي',150,'#E5483F'],['عريض',130,'#2F80ED'],['ثلاثي',140,'#F2C230'],['حوض ماء',120,'#4AB1E8'],['مزدوج',110,'#2E9A62']];
const SJ_P=[['🐢 هادي',1.25,56],['🐎 متوسط',1,48],['⚡ سريع',.75,40]];
const SJ_N=8,SJ_TA=49*SJ_N;
function sjCourse(gid){const R=mulberry(seedOf(gid+':sj')),a=[1,2,0,1,2,0].sort(()=>R()-.5);a.splice(2+Math.floor(R()*3),0,3);a.splice(5+Math.floor(R()*2),0,4);return [0,...a].slice(0,SJ_N);}
const sjC=d=>240+Math.floor(mulberry(seedOf(d.gid+':sjc'+(d.sid||0)))()*520);
const sjTF=t=>Math.max(0,Math.ceil((t-SJ_TA)/10));
const sjScore=(d,s)=>(d.ft[s]+sjTF(d.tt[s]))*100000+d.tt[s];
function sjJump(d,t,pc,v){const ty=d.cs[d.fx],w=SJ_T[ty][1]*SJ_P[pc][1]/2,e=Math.abs(v-sjC(d)),sid=(d.sid||0)+1;
  const r=e<=w?0:e<=w*2.3?(Math.random()<.7?1:0):2;const ft=[...d.ft],tt=[...d.tt],rf=[...d.rf];let out=d.out;
  // the clock: the pace, a little more for an awkward take-off, a few tenths of luck (drawn on the host)
  tt[t]+=SJ_P[pc][2]+Math.round(Math.min(e/w,3)*2)+rnd(3)+(r===2?60:0);let tx;
  if(r===0)tx=`${nm(d,t)} قفز ${SJ_T[ty][0]} نظيف ✓`;
  else if(r===1){ft[t]+=4;tx=`${nm(d,t)}: ${ty===3?'رجله في الماي 💦':'طاح العارض'} (+4)`;}
  else{ft[t]+=4;rf[t]++;tx=`${nm(d,t)}: الحصان رفض القفزة! (+4)`;if(rf[t]>=2){out=setAt(out,t,'1');tx+=' • ثاني رفض: خرج من المسابقة';}}
  const x={...d,ft,tt,rf,out,sid,lx:{s:t,f:d.fx,r,id:sid},last:tx};
  if(r===2&&out[t]!=='1')return {...x,last:tx+' • يعيد'};
  return sjNext(x,t);}
function sjNext(x,t){const al=aliveSeats(x);if(!al.length)return {...x,win:'d'};const nx=r2Adv(x,t),fx=x.fx+(nx.nr?1:0);
  if(fx>=SJ_N)return {...x,fx:SJ_N-1,win:r2Best(x,x.pl.map((_,s)=>x.out[s]==='1'?99e5+x.tt[s]:sjScore(x,s)),true)};
  return {...x,turn:nx.turn,fx};}
function sjBotPace(d,s,lv){if(lv===1)return rnd(3);const sig=R2SIG[lv],w0=SJ_T[d.cs[d.fx]][1],left=SJ_N-d.fx,spent=d.tt[s],need=(SJ_TA-spent)/left;let best=null;
  for(let p=0;p<3;p++){const w=w0*SJ_P[p][1]/2,pin=r2Pin(w,sig),pmid=r2Pin(w*2.3,sig)-pin,pref=1-pin-pmid;
    const cost=pmid*.7*4+pref*(d.rf[s]?40:10)+Math.max(0,SJ_P[p][2]-need)*.1+SJ_P[p][2]*.002+(lv===2?Math.random()*.6:0);if(!best||cost<best[0])best=[cost,p];}
  return best[1];}
GAMES.r_jump={name:'قفز الحواجز',cat:'sport',lbc:'#6E8B3D',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E7CF9C"/><rect width="100" height="40" fill="#9BD3F0"/><path d="M16 84V50M84 84V50" stroke="#fff" stroke-width="4"/><path d="M14 58h72M14 70h72" stroke="#E5483F" stroke-width="5" stroke-dasharray="10 8"/><path d="M28 50q8-18 26-16l8-10 5 4-3 7q10 3 12 13l-7 2-4-6-16 4-8 10-6-2 5-9z" fill="#6B3E1F"/><path d="M44 30l6-6 6 3-2 5z" fill="#2F80ED"/><circle cx="48" cy="22" r="3.6" fill="#F2C9A0"/></svg>`,
  init:n=>({cs:[],fx:0,ft:Array(n).fill(0),tt:Array(n).fill(0),rf:Array(n).fill(0),sid:0,lx:null,last:''}),
  start:d=>({...d,cs:sjCourse(d.gid)}),
  net:{host:['jump'],local:['jp']},redeal:d=>d,
  points:d=>d.ft.map((f,s)=>d.out[s]==='1'?'خرج':f+sjTF(d.tt[s])),
  status:(d,ctx)=>r2StatL(d,ctx,`<small>الحاجز ${d.fx+1} من ${SJ_N}: ${SJ_T[d.cs[d.fx]][0]} • الوقت المسموح ${SJ_TA/10} ث</small><br>`),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.out[s]==='1'?'خرج':`${d.ft[s]+sjTF(d.tt[s])} أخطاء، ${(d.tt[s]/10).toFixed(1)} ث`}`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx,pc=r2Dr('jp',0,2,1);
    const fi=L&&L.f!==d.fx&&!my?L.f:d.fx,ty=d.cs[fi],[tn,,tc]=SJ_T[ty],r=L&&L.f===fi?L.r:-1;
    const rail=(y,k)=>`<rect class="${r===1&&k===0?'sj-down':''}" x="118" y="${y}" width="64" height="5" rx="2" fill="${tc}" stroke="#fff" stroke-width="1"/>`;
    const fence=ty===3?`<rect x="104" y="114" width="92" height="12" rx="4" fill="#4AB1E8"/><path d="M110 120q6-3 12 0t12 0 12 0 12 0 12 0 12 0" stroke="#fff" fill="none" stroke-width="1"/><rect x="114" y="104" width="12" height="10" fill="#7DBE62"/>`
      :`<path d="M120 126V70M180 126V70" stroke="#fff" stroke-width="4"/>${ty===1?'<path d="M200 126V76" stroke="#fff" stroke-width="4"/>':''}${rail(78,0)}${rail(94,1)}${ty===1?`<rect x="140" y="80" width="64" height="5" rx="2" fill="${tc}" opacity=".85"/>`:ty===2?`<rect x="90" y="106" width="40" height="5" fill="${tc}"/><rect x="170" y="86" width="40" height="5" fill="${tc}"/>`:ty===4?'<path d="M240 126V82" stroke="#fff" stroke-width="4"/><rect x="228" y="88" width="28" height="5" fill="#2E9A62"/>':''}`;
    const hx=r===0?165:r===1?160:r===2?80:40,hy=r===0||r===1?52:96,rot=r===0||r===1?-12:0;
    let s=`<div class="r2-root r2sj"><svg class="sj-svg" viewBox="0 0 300 140" data-k="sjs" data-key="${L?d.gid+L.id:''}"><defs><linearGradient id="sjsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC9EE"/><stop offset="1" stop-color="#DDF0FA"/></linearGradient></defs>
      <rect width="300" height="140" fill="url(#sjsk)"/><path d="M0 52h300v24H0z" fill="#5E7A8C" opacity=".5"/>${[...Array(15)].map((_,k)=>`<circle cx="${10+k*20}" cy="60" r="3" fill="${['#EC6158','#F0B429','#fff','#4AB1E8'][k%4]}" opacity=".5"/>`).join('')}<rect y="72" width="300" height="4" fill="#fff" opacity=".8"/>
      <rect y="76" width="300" height="64" fill="#E2C48E"/><path d="M0 126h300" stroke="#CBA66A" stroke-width="1"/>${fence}
      <g class="sj-h" style="transform:translate(${hx}px,${hy}px) rotate(${rot}deg)"><path d="M-30 20q4-18 26-18l12-14 7 5-4 9q14 4 16 18l-9 2-5-8-22 4-10 16-8-2 6-14q-6 2-9 2z" fill="#6B3E1F"/><path d="M-30 20l-6 14M-22 22l-3 14M2 24l2 12M10 22l6 12" stroke="#4A2E16" stroke-width="3" stroke-linecap="round"/><path d="M-8 -6l8-8 8 4-3 6z" fill="${col(d,L&&L.f===fi?L.s:t)}"/><circle cx="-2" cy="-16" r="4.4" fill="#F2C9A0"/><path d="M-6-19h8v-3h-8z" fill="#1E2328"/></g>
      ${r>=0?`<text class="sj-tag ${r===0?'ok':'no'}" x="150" y="38" text-anchor="middle">${r===0?'نظيف!':r===1?(ty===3?'في الماي!':'طاح العارض!'):'رفض!'}</text>`:''}
      <text x="150" y="14" text-anchor="middle" class="sj-n">${fi+1}. ${tn}</text></svg>`;
    s+=`<div class="sj-course">${d.cs.map((c,k)=>`<i class="${k<d.fx?'done':k===d.fx?'on':''}" style="--c:${SJ_T[c][2]}">${k+1}</i>`).join('')}</div>`;
    s+=`<div class="sj-tab">${d.pl.map((_,i)=>`<span class="${i===t&&d.win==null?'on':''} ${d.out[i]==='1'?'off':''}" style="--c:${col(d,i)}"><b>${nm(d,i)}</b><em>${d.out[i]==='1'?'خرج':`${d.ft[i]} أخطاء`}</em><small>⏱ ${(d.tt[i]/10).toFixed(1)}${sjTF(d.tt[i])?` (+${sjTF(d.tt[i])})`:''}${d.rf[i]?' • رفض':''}</small></span>`).join('')}</div>`;
    if(my){const w=SJ_T[d.cs[d.fx]][1]*SJ_P[pc][1]/2,c=sjC(d),m=r2mPar(key,[1300,1100,900][pc]);
      s+=`<p class="r2lbl">الحاجز ${d.fx+1}: ${SJ_T[d.cs[d.fx]][0]}. اختر سرعتك</p>${r2Seg('jp',SJ_P.map(p=>`${p[0]} ${(p[2]/10).toFixed(1)}ث`),pc,true)}
        ${r2Meter(key,m,[[0,1000,'z0'],[r2Clamp(c-w*2.3,0,1000),r2Clamp(c+w*2.3,0,1000),'z1'],[r2Clamp(c-w,0,1000),r2Clamp(c+w,0,1000),'z2']],sv==null,sv,'لحظة النطّة: وقّف المؤشر في الأخضر')}${r2Stop(key,'jump','🐎 انقز',sv==null)}`;}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(a==='jp'){if(i>=0&&i<3){S.draft.jp=String(i);render();}return;}
    if(a!=='jump')return;const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(sjJump(d,d.turn,r2Dr('jp',0,2,1),v));},
  bot(d,s,lv){const p=sjBotPace(d,s,lv);return sjJump(d,s,p,r2BotStop(sjC(d),lv));},
  onTimeout:d=>sjJump(d,d.turn,1,sjC(d)+400>1000?sjC(d)-400:sjC(d)+400),
  onSkip:(nd,d)=>nd,
  after(d){r2Spin();const el=app.querySelector('.sj-svg');if(!el||!el.dataset.key||!once('sj'+el.dataset.key))return;const h=el.querySelector('.sj-h'),L=d.lx;if(!h||!L)return;
    r2Anim(h,[{transform:'translate(40px,96px) rotate(0deg)'},...(L.r===2?[]:[{transform:'translate(110px,64px) rotate(-18deg)',offset:.6}]),{transform:h.style.transform}],440,0,'ease-out');
    const rl=el.querySelector('.sj-down');if(rl)r2Anim(rl,[{transform:'none'},{transform:'none',offset:.6},{transform:'translate(0,30px) rotate(8deg)'}],440);
    const tg=el.querySelector('.sj-tag');if(tg)r2Anim(tg,[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'none'}],260,380);}
};
HELP.r_jump='قفز حواجز على مسار فيه 8 حواجز (عمودي، عريض، ثلاثي، حوض ماء، مزدوج)، والكل يقفز الحاجز نفسه بالدور وبعدين ينتقلون للي بعده. قبل كل قفزة اختر السرعة: الهادي أسهل (المنطقة الخضراء أعرض) بس ياخذ وقت أكثر، والسريع أصعب ويوفّر وقت. وبعدين وقّف مؤشر لحظة النطّة: في الأخضر قفزة نظيفة، وفي الأصفر غالبًا يطيح العارض أو تنزل رجله في الماي (4 أخطاء)، وبعيد يرفض الحصان القفزة (4 أخطاء وتضيع وقت وتعيد)، وثاني رفض يطلّعك من المسابقة. الوقت المسموح 39.2 ثانية، وكل ثانية زيادة عليها بخطأ. الأقل أخطاء يفوز، ولو تعادلوا الأسرع.'+' ولو لعبتوا فرق، الفريق اللي معدّل أخطائه أقل يفوز.';

/* =================================================================
   الحجلة: squares 1 to 10. Throw the stone onto the next square (stop the throw meter in its band; a line is a miss),
   then hop there and back (stop the balance meter in the window). Each success moves you on; up to 2 a turn. Bold: throw
   two squares on and hop both at once. Once a game you may make a square you just finished your house: the others must
   hop over it, which is harder for them, and easier for you. First past square 10 wins.
   ================================================================= */
const HS_XY=[[80,268],[80,232],[80,196],[54,160],[106,160],[80,124],[54,88],[106,88],[80,52],[80,2]];
const hsC=d=>200+Math.floor(mulberry(seedOf(d.gid+':hs'+(d.sid||0)))()*600);
// the hop window: narrower the further you go and for every other player's house on the way; your own house is a rest
function hsW(d,t,tg,bold){let w=270-16*tg-(bold?50:0);d.hs.forEach((h,s)=>{if(h&&h<=tg)w+=s===t?50:sameTeam(d,s,t)?0:-45;});return r2Clamp(w,80,330);}
const hsTg=(d,t,bold)=>Math.min(10,d.pr[t]+(bold?2:1));
function hsEnd(x,t,why){const nx=nextSeat(x,t),tn=(x.tn||0)+1;const y={...x,ph:'throw',ok:0,jc:-1,tg:0,turn:nx,tn,last:why};
  if(tn>=40*x.pl.length)return {...y,win:r2Best(y,y.pr.map((p,s)=>y.out[s]==='1'?null:p))};return y;}
function hsThrow(d,t,bold,v){const tg=hsTg(d,t,bold),vv=r2Clamp(v+r2N()*10,0,999),sq=Math.floor(vv/100)+1,inb=vv%100>=8&&vv%100<=92,sid=(d.sid||0)+1;
  const lx={s:t,sq:inb?sq:0,tg,k:'t',id:sid,v:Math.round(vv)};
  if(inb&&sq===tg)return {...d,sid,lx,ph:'hop',tg,last:`${nm(d,t)}: الحجر نزل في ${tg} ✓ الحين انقز`};
  return hsEnd({...d,sid,lx},t,`${nm(d,t)}: الحجر ${inb?`نزل في ${sq} بدل ${tg}`:'طاح على الخط'} ✗`);}
function hsHop(d,t,v){const w=hsW(d,t,d.tg,d.tg-d.pr[t]>1)/2,e=Math.abs(v-hsC(d)),sid=(d.sid||0)+1,ok=e<=w;const lx={s:t,sq:d.tg,k:'h',r:ok?1:0,id:sid};
  if(!ok)return hsEnd({...d,sid,lx},t,`${nm(d,t)} فقد توازنه وهو ينقز ✗`);
  const pr=[...d.pr];pr[t]=d.tg;const x={...d,pr,sid,lx,ok:d.ok+1,jc:d.tg,ph:'throw',last:`${nm(d,t)} خلّص المربع ${d.tg} 👣`};
  if(pr[t]>=10)return {...x,win:t,last:`${nm(d,t)} خلّص الحجلة كلها! 🏆`};
  if(x.ok>=2)return hsEnd(x,t,x.last+' • خلص دوره');return x;}
const hsCanHouse=(d,t)=>d.ph==='throw'&&d.jc>0&&!d.hs[t]&&!d.hs.includes(d.jc);
function hsBot(d,s,lv){if(lv===1)return [Math.random()<.3,Math.random()<.4];const sig=R2SIG[lv],thr=r2Pin(38,Math.hypot(sig,10));
  const val=b=>{const tg=hsTg(d,s,b);return thr*r2Pin(hsW(d,s,tg,b)/2,sig)*(tg-d.pr[s])*(b?1.05:1);};const bold=d.pr[s]<=8&&val(true)>val(false)+(lv===2?Math.random()*.1-.05:0);
  const house=hsCanHouse(d,s)&&d.jc>=3&&d.pr.some((p,o)=>o!==s&&d.out[o]!=='1'&&p<d.jc&&!sameTeam(d,s,o));return [bold,house];}
GAMES.r_hop={name:'الحجلة',cat:'sport',lbc:'#C2577A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B9C3CC"/><rect width="100" height="100" fill="#A9B4BE" opacity=".5"/>${[[38,78,24,18,'1'],[38,60,24,18,'2'],[26,42,24,18,'3'],[50,42,24,18,'4'],[38,24,24,18,'5']].map(([x,y,w,h,t])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#fff" stroke-width="2.4"/><text x="${x+w/2}" y="${y+13}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${t}</text>`).join('')}<path d="M38 24a12 10 0 0 1 24 0" fill="none" stroke="#fff" stroke-width="2.4"/><ellipse cx="62" cy="51" rx="5" ry="3.4" fill="#C2577A"/><path d="M70 92q2-12 8-14q4 6-2 14z" fill="#EC6158"/></svg>`,
  init:n=>({pr:Array(n).fill(0),hs:Array(n).fill(0),ph:'throw',tg:0,ok:0,jc:-1,tn:0,sid:0,lx:null,last:''}),
  net:{host:['throw','hop','house'],local:['hb']},redeal:d=>d,
  points:d=>d.pr.map(p=>p+'/10'),
  status:(d,ctx)=>r2StatL(d,ctx,d.win==null?`<small>${d.ph==='hop'?`انقز للمربع ${d.tg} وارجع`:`ارمِ الحجر`} • نجاحات هالدور ${d.ok} من 2</small><br>`:''),
  winExtra:d=>d.pl.map((r,s)=>`${nm(d,s)} ${d.pr[s]}/10`).join('، '),
  render(d,ctx){const t=d.turn,my=ctx.my&&d.win==null,key=d.gid+':'+(d.sid||0),sv=r2Stopped(key),L=d.lx,bold=r2Dr('hb',0,1,0)===1&&d.pr[t]<=8,tg=d.ph==='hop'?d.tg:hsTg(d,t,bold);
    const own=k=>d.hs.findIndex(h=>h===k);
    let s=`<div class="r2-root r2hs"><svg class="hs-svg" viewBox="0 0 160 300" data-k="hss" data-key="${L?d.gid+L.id:''}"><rect width="160" height="300" fill="#AEB8C2"/>${[...Array(12)].map((_,k)=>`<circle cx="${(k*37)%150+6}" cy="${(k*71)%290+5}" r="${1+k%3}" fill="#9AA5AF"/>`).join('')}
      ${HS_XY.map(([x,y],k)=>{const sq=k+1,o=own(sq),cls=sq===tg&&d.win==null?'tg':sq<=d.pr[t]?'done':'';return `<g class="hs-sq ${cls}"><${sq===10?`path d="M${x-26} ${y+33}V${y+16}a26 16 0 0 1 52 0V${y+33}z"`:`rect x="${x-26}" y="${y-17}" width="52" height="34"`} fill="${o>=0?col(d,o):'rgba(255,255,255,.08)'}" fill-opacity="${o>=0?.35:1}" stroke="#fff" stroke-width="2.4"/><text x="${x}" y="${y+(sq===10?25:5)}" text-anchor="middle">${sq}</text>${o>=0?`<text x="${x+16}" y="${y+(sq===10?26:-6)}" class="hs-h">🏠</text>`:''}</g>`;}).join('')}
      ${d.pl.map((_,i)=>{const p=d.pr[i],[x,y]=p?HS_XY[p-1]:[80,292];return d.out[i]==='1'?'':`<circle class="hs-p" cx="${x-18+i*5}" cy="${y+(p===10?24:10)}" r="4" fill="${col(d,i)}" stroke="#fff" stroke-width="1.2"/>`;}).join('')}
      ${L&&L.k==='t'?`<g class="hs-st" style="transform:translate(${L.sq?HS_XY[L.sq-1][0]+10:80+((L.v%100)-50)/2}px,${L.sq?HS_XY[L.sq-1][1]+(L.sq===10?22:0):r2Clamp(280-L.v*.27,20,280)}px)"><ellipse rx="6" ry="4" fill="#7A4A2A" stroke="#fff" stroke-width=".8"/></g>`:d.ph==='hop'?`<g class="hs-st" style="transform:translate(${HS_XY[d.tg-1][0]+10}px,${HS_XY[d.tg-1][1]+(d.tg===10?22:0)}px)"><ellipse rx="6" ry="4" fill="#7A4A2A" stroke="#fff" stroke-width=".8"/></g>`:''}</svg>`;
    s+=`<div class="dt-list">${d.pl.map((_,i)=>`<span class="${i===t?'on':''}" style="--c:${col(d,i)}">${nm(d,i)} <b>${d.pr[i]}/10</b>${d.hs[i]?' 🏠'+d.hs[i]:''}</span>`).join('')}</div>`;
    if(my){const m=r2mPar(key,d.ph==='hop'?1050:1900);
      if(d.ph==='throw'){s+=`${d.pr[t]<=8?r2Seg('hb',[`عادي: المربع ${hsTg(d,t,false)}`,`جريء: المربع ${hsTg(d,t,true)} مرة وحدة`],bold?1:0,true):''}
        ${hsCanHouse(d,t)?`<button class="btn navy wide" data-ga="house">🏠 خلّ المربع ${d.jc} بيتك (مرة باللعبة)</button>`:''}
        ${r2Meter(key,m,[[0,1000,'zl'],...[...Array(10).keys()].map(k=>[k*100+8,k*100+92,k+1===tg?'z2':'zx'])],sv==null,sv,`رمية الحجر: وقّف المؤشر على المربع ${tg} (1 يسار … 10 يمين)`)}${r2Stop(key,'throw','🪨 ارمِ الحجر',sv==null)}`;}
      else{const w=hsW(d,t,d.tg,d.tg-d.pr[t]>1)/2,c=hsC(d);s+=`${r2Meter(key,m,[[0,1000,'z0'],[r2Clamp(c-w,0,1000),r2Clamp(c+w,0,1000),'z2']],sv==null,sv,'التوازن: وقّف المؤشر في الأخضر')}${r2Stop(key,'hop','👣 انقز',sv==null)}`;}}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='hb'){if(i===0||i===1){S.draft.hb=String(i);render();}return;}
    if(a==='house'){if(hsCanHouse(d,t)){const hs=[...d.hs];hs[t]=d.jc;act({...d,hs,jc:-1,last:`${nm(d,t)} خلّى المربع ${d.jc} بيته 🏠`});}return;}
    if(a==='throw'&&d.ph==='throw'){const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(hsThrow(d,t,r2Dr('hb',0,1,0)===1&&d.pr[t]<=8,v));return;}
    if(a==='hop'&&d.ph==='hop'){const v=r2Read(i);r2Hold(d.gid+':'+(d.sid||0),v,ctx);act(hsHop(d,t,v));}},
  bot(d,s,lv){if(d.ph==='hop')return hsHop(d,s,r2BotStop(hsC(d),lv));const [bold,house]=hsBot(d,s,lv);
    if(house&&hsCanHouse(d,s)){const hs=[...d.hs];hs[s]=d.jc;return {...d,hs,jc:-1,last:`${nm(d,s)} خلّى المربع ${d.jc} بيته 🏠`};}
    const tg=hsTg(d,s,bold);return hsThrow(d,s,bold,r2BotStop((tg-1)*100+50,lv));},
  onTimeout:d=>hsEnd(d,d.turn,`${nm(d,d.turn)} ضاع عليه الدور`),
  after(d){r2Spin();const el=app.querySelector('.hs-svg');if(!el||!el.dataset.key||!once('hs'+el.dataset.key))return;const st=el.querySelector('.hs-st'),L=d.lx;
    if(st&&L&&L.k==='t')r2Anim(st,[{transform:'translate(80px,296px) scale(1.4)'},{transform:st.style.transform}],420,0,'cubic-bezier(.3,.7,.4,1)');}
};
HELP.r_hop='الحجلة: مربعات من 1 إلى 10. بدورك ارمِ الحجر على المربع اللي بعدك: المؤشر يمر على المربعات من 1 (يسار) إلى 10 (يمين)، وقّفه داخل مربعك الأخضر (لو وقف على الخط أو مربع ثاني تخسر الدور). لو نزل الحجر صح، وقّف مؤشر التوازن في الأخضر عشان تنقز وترجع، وتتقدم مربع. تقدر تنجح مرتين بالدور. «الجريء» ترمي على المربع اللي بعد اللي بعدك وتنقزهم مرة وحدة (تتقدم مربعين، بس الرمية والنقزة أصعب). ومرة باللعبة تقدر تخلي مربع خلّصته «بيتك» 🏠: الباقين لازم ينقزون فوقه فيصير توازنهم أصعب، وأنت ترتاح فيه. كل ما بعدت صار التوازن أصعب. أول واحد يخلّص المربع 10 يفوز. ولو لعبتوا فرق، يفوز فريق اللي يخلّص أول.';

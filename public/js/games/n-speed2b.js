'use strict';
/* speed2, part 2: the number table, the flash memory, stop the clock, the bigger one, the quick difference and the group
   reaction chain. Shared helpers (s2Base, s2T, s2Send…) are in n-speed2.js. */

/* ---------- 8. the number table: tap 1 to 25 in order on a shuffled 5×5 board ---------- */
const S2IND='٠١٢٣٤٥٦٧٨٩',s2Ind=n=>String(n).replace(/\d/g,c=>S2IND[+c]);
// round 3 and 5 write the numbers the eastern Arabic way (١٢٣), round 4 counts down from 25
function s2scQ(d){const R=srng(d,'sc'+d.rd);return {c:shuffleR(R,[...Array(25).keys()].map(x=>x+1)),rev:d.rd===3,ind:d.rd===2||d.rd===4};}
const s2scW=(Q,n)=>Q.rev?25-n:n+1;
GAMES.s_schulte=s2Base({name:'جدول الأرقام',cls:'s2sc',lbc:'#2471A3',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E86C1"/><rect x="10" y="10" width="80" height="80" rx="12" fill="#EAF4FB"/>${[7,2,9,4,1,6,3,8,5].map((n,i)=>`<rect x="${15+(i%3)*24}" y="${15+Math.floor(i/3)*24}" width="22" height="22" rx="5" fill="${n<4?'#AED6F1':'#fff'}"/><text x="${26+(i%3)*24}" y="${32+Math.floor(i/3)*24}" font-size="14" font-weight="900" text-anchor="middle" fill="#1B4F72">${n}</text>`).join('')}</svg>`,
  title:'أرقام من 1 لين 25 مخلوطة في لوحة: اضغطها بالترتيب بأسرع وقت',
  tip:d=>d.rd===3?'هالجولة بالعكس: من 25 نازل لين 1':d.rd===2||d.rd===4?'هالجولة الأرقام مكتوبة ١ ٢ ٣':'من 1 لين 25',
  legend:'كل ضغطة غلط تزيد ثانية، وخمس أغلاط تطلعك من الجولة',
  bot(d,s,lv){const Q=s2scQ(d),per=[0,1250,880,600][lv]*(Q.rev?1.1:1)*(Q.ind?1.06:1),bad=s2Bin(3,[0,.3,.15,.05][lv]);return {ok:Math.random()<[0,.93,.97,.995][lv],ms:Math.round(25*per+rnd(Math.round(25*per*.3))+1000*bad)};},
  start(d,st){st.n=0;st.bad=0;st.miss=-1;s2T(st,120000,st=>s2Send(st,{ok:false,ms:Math.round(s2Now()-st.t0+1000*st.bad)}));},
  view(d,ctx,st){const Q=s2scQ(d),w=s2scW(Q,st.n),f=x=>Q.ind?s2Ind(x):x,done=x=>Q.rev?x>w:x<w;
    return `<div class="s2sc-hd"><span>التالي</span><b class="s2sc-w" id="s2scw${st.n}">${f(w)}</b><span class="s2sc-p">${st.n} / 25</span>${st.bad?`<i>✗ ${st.bad}</i>`:''}</div>
      <div class="s2sc-g">${Q.c.map((x,i)=>`<button class="s2sc-c ${done(x)?'done':''} ${st.miss===i?'bad':''}" data-ga="c" data-i="${i}" ${done(x)?'disabled':''}>${f(x)}</button>`).join('')}</div>`;},
  click(a,i,d,ctx,st){if(a!=='c')return;const Q=s2scQ(d),x=Q.c[i];if(x==null)return;const w=s2scW(Q,st.n);if(Q.rev?x>w:x<w)return;
    if(x===w){st.n++;st.miss=-1;if(st.n>=25){s2Send(st,{ok:true,ms:Math.round(s2Now()-st.t0+1000*st.bad)});return;}render();return;}
    st.bad++;st.miss=i;try{sfx('lose');}catch(e){}if(st.bad>=5){s2Send(st,{ok:false,ms:Math.round(s2Now()-st.t0+1000*st.bad)});return;}render();}});
HELP.s_schulte='لوحة خمسة في خمسة فيها الأرقام من 1 لين 25 مخلوطة. اضغطها بالترتيب 1 ثم 2 ثم 3… بأسرع وقت، وفوق اللوحة مكتوب الرقم اللي عليه الدور. كل ضغطة غلط تزيد وقتك ثانية، وخمس أغلاط تطلعك من الجولة. الجولة الثالثة والخامسة الأرقام مكتوبة بالهندي (١ ٢ ٣)، والرابعة بالعكس من 25 لين 1. الأسرع ياخذ نقطتين وكل واحد كمّل ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 9. flash memory: some squares light up together for a moment, then tap the same squares ---------- */
function s2flQ(d){const R=srng(d,'fl'+d.rd),r=Math.min(d.rd,4),z=[4,4,5,5,5][r],k=[4,5,6,7,8][r];return {z,k,c:shuffleR(R,[...Array(z*z).keys()]).slice(0,k)};}
const S2FLT=1300;
GAMES.s_flash=s2Base({name:'ومضة الذاكرة',cls:'s2fl',lbc:'#6C3483',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7D3C98"/>${[...Array(16).keys()].map(i=>`<rect x="${13+(i%4)*19}" y="${13+Math.floor(i/4)*19}" width="16" height="16" rx="4" fill="${[1,6,8,15].includes(i)?'#F7DC6F':'#5B2C6F'}"/>`).join('')}<path d="M62 6l-6 12h7l-4 10 11-14h-7l4-8z" fill="#fff"/></svg>`,
  title:'مربعات تنوّر مع بعض لحظة وتنطفي: اضغط نفس المربعات بأي ترتيب',
  tip:d=>{const Q=s2flQ(d);return `لوحة ${Q.z}×${Q.z} وبينور ${Q.k} مربعات`;},
  legend:'ضغطة غلط وحدة تطلعك من الجولة',
  bot(d,s,lv){const Q=s2flQ(d),r=Math.min(d.rd,4);return {ok:Math.random()<[0,.92,.97,.995][lv]-r*[0,.13,.075,.035][lv],ms:Math.round(Q.k*[0,640,480,360][lv]+300+rnd([0,900,600,350][lv]))};},
  start(d,st){st.phase='show';st.sub='pre';st.got={};st.miss=-1;st.rev=false;
    s2T(st,600,st=>{st.sub='on';render();s2T(st,S2FLT,st=>{st.phase='go';st.sub='';st.t0=s2Now();render();});});},
  view(d,ctx,st){const Q=s2flQ(d),on=new Set(Q.c),show=st.phase==='show';
    const cls=i=>show?(st.sub==='on'&&on.has(i)?'on':''):st.got[i]?'got':st.miss===i?'bad':st.rev&&on.has(i)?'want':'';
    return `<div class="s2fl-hd">${show?(st.sub==='on'?'احفظ المربعات!':'ركّز…'):st.rev?'غلط! هذي كانت المربعات':`اضغط المربعات <b>${Object.keys(st.got).length} / ${Q.k}</b>`}</div>
      <div class="s2fl-g ${show?'show':''}" style="grid-template-columns:repeat(${Q.z},minmax(0,1fr))">${[...Array(Q.z*Q.z).keys()].map(i=>`<button class="s2fl-c ${cls(i)}" data-ga="c" data-i="${i}" ${show||st.got[i]||st.rev?'disabled':''}></button>`).join('')}</div>`;},
  click(a,i,d,ctx,st){if(a!=='c'||st.phase!=='go'||st.rev)return;const Q=s2flQ(d);if(i==null||i<0||i>=Q.z*Q.z||st.got[i])return;const ms=Math.round(s2Now()-st.t0);
    if(Q.c.includes(i)){st.got[i]=1;if(Object.keys(st.got).length>=Q.k){s2Send(st,{ok:true,ms});return;}try{sfx('tap');}catch(e){}render();return;}
    st.miss=i;st.rev=true;try{sfx('lose');}catch(e){}render();s2T(st,700,st=>s2Send(st,{ok:false,ms}));}});
HELP.s_flash='تطلع لوحة مربعات، وبعدها كم مربع ينوّرون مع بعض لحظة وينطفون. اضغط نفس المربعات اللي نوّرت بأي ترتيب. ضغطة غلط وحدة تطلعك من الجولة. كل جولة تكبر اللوحة أو يزيد عدد المربعات. الأسرع اللي ضبطها كلها ياخذ نقطتين، وكل واحد ضبطها ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 10. stop the clock: a timer starts, then hides; stop it as close to 10.00 seconds as you can ---------- */
const s2spV=d=>[5000,3000,2000,1000,0][Math.min(d.rd,4)],S2SPL=800;
const s2spF=ms=>(Math.max(0,ms)/1000).toFixed(2);
GAMES.s_stop=s2Base({name:'أوقف الساعة',cls:'s2sp',lbc:'#34495E',rank:true,best:'الأقرب',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F5A73"/><rect x="44" y="10" width="12" height="8" rx="2" fill="#F0B429"/><circle cx="50" cy="56" r="32" fill="#fff"/><circle cx="50" cy="56" r="26" fill="#EAF0F6"/><path d="M50 56V36" stroke="#EC6158" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="56" r="4" fill="#2D4763"/><text x="50" y="78" font-size="10" font-weight="900" fill="#2D4763" text-anchor="middle" direction="ltr">10.00</text></svg>`,
  title:'تبدأ ساعة تعد وبعدها تختفي: وقّفها على 10.00 ثانية بالضبط قد ما تقدر',
  tip:d=>s2spV(d)?`الساعة تبان أول ${s2spV(d)/1000} ثواني وبعدها تختفي`:'هالجولة الساعة مخفية من البداية!',
  legend:'الوقت هنا = كم بعدت عن 10.00 ثانية، كل ما قل أحسن',
  bot(d,s,lv){const sg=[0,700,420,220][lv]*(1+Math.min(d.rd,4)*.12),diff=Math.round(Math.abs(s2Gs())*sg);return {ok:diff<=1500,ms:diff};},
  start(d,st){st.on=false;st.stop=null;const V=s2spV(d);
    s2T(st,S2SPL,st=>{st.on=true;st.t0=s2Now();render();
      if(V){s2Loop(st,st=>{if(st.stop!=null)return false;const el=s2Now()-st.t0;if(el>=V){render();return false;}const e=document.getElementById('s2spt');if(e)e.textContent=s2spF(el);});
        s2T(st,V+30,st=>{if(st.stop==null)render();});}
      s2T(st,25000,st=>s2Send(st,{ok:false,ms:15000}));});},
  view(d,ctx,st){const V=s2spV(d),el=st.on?(st.stop??s2Now()-st.t0):0,hid=st.on&&st.stop==null&&el>=V;
    const face=st.stop!=null?s2spF(st.stop):!st.on?'0.00':hid?'؟؟.؟؟':s2spF(el);const df=st.stop!=null?Math.abs(st.stop-10000):0;
    return `<div class="s2sp-l">${!st.on?'استعد…':st.stop!=null?(df<50?'بالضبط تقريبًا! 🎯':st.stop<10000?`بدري بـ ${s2spF(df)} ث`:`متأخر بـ ${s2spF(df)} ث`):hid?'الساعة شغالة… عدّ في راسك':'الساعة شغالة'}</div>
      <div class="s2sp-w ${hid?'hid':''} ${st.stop!=null?'done':''}"><span class="s2sp-t" id="s2spt" dir="ltr">${face}</span><small>الهدف <b dir="ltr">10.00</b></small></div>
      <button class="s2sp-b" data-ga="stop" ${!st.on||st.stop!=null?'disabled':''}>وقّف ⏹</button>`;},
  click(a,i,d,ctx,st){if(a!=='stop'||!st.on||st.stop!=null)return;const t=s2Now()-st.t0;st.stop=t;const df=Math.round(Math.abs(t-10000));render();s2T(st,1100,st=>s2Send(st,{ok:df<=1500,ms:df}));}});
HELP.s_stop='اضغط «جاهز» وتبدأ ساعة تعد الثواني. هدفك توقفها على 10.00 ثانية بالضبط. المشكلة إن الساعة تختفي بعد شوي، فلازم تعد في راسك: أول جولة تبان خمس ثواني، وبعدها أقل وأقل، والجولة الأخيرة مخفية من البداية. ينحسب كم بعدت عن العشر ثواني (قبل أو بعد). الأقرب ياخذ نقطتين، وكل واحد ما بعد أكثر من ثانية ونص ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 11. the bigger one: tap the side with more, numbers or dots or sums ---------- */
const S2BN=10;
// kinds: 0 two numbers, 1 two groups of dots, 2 two sums, 3 numbers written ١٢٣; each pair differs a little
const s2bgQ=s2Memo(d=>{const R=srng(d,'bg'+d.rd),rd=d.rd,ks=rd<2?[0,1]:rd<3?[0,1,2]:[0,1,2,3],I=(a,b)=>a+s2I(R,b-a+1),a=[];
  for(let i=0;i<S2BN;i++){const k=ks[s2I(R,ks.length)];let v,s,dots=null;
    if(k===0||k===3){const three=k===3||rd>=2;let x,y;
      if(three){x=I(102,987);const ds=[...String(x)],p=I(0,1);[ds[p],ds[p+1]]=[ds[p+1],ds[p]];y=+ds.join('');if(y===x||y<100)y=x+(R()<.5?-1:1)*I(1,30);}
      else{x=I(12,98);y=x%10&&Math.floor(x/10)!==x%10&&R()<.6?(x%10)*10+Math.floor(x/10):x+(R()<.5?-1:1)*I(1,9);if(y<10||y>99||y===x)y=x>50?x-I(1,9):x+I(1,9);}
      v=[x,y];s=v.map(n=>k===3?s2Ind(n):String(n));}
    else if(k===1){const x=I(5,13),dl=I(1,rd>=2?2:3),y=Math.max(3,Math.min(15,x+(R()<.5?-dl:dl)));v=[x,y===x?x+1:y];s=null;
      dots=v.map(n=>shuffleR(R,[...Array(16).keys()]).slice(0,n).map(c=>[c%4*25+12.5+(R()-.5)*8,Math.floor(c/4)*25+12.5+(R()-.5)*8]));}
    else{const x1=I(4,15),y1=I(3,12),v1=x1+y1,dl=I(1,3),v2=Math.max(6,v1+(R()<.5?-dl:dl)),x2=I(2,v2-2);v=[v1,v2===v1?v1+1:v2];const x2b=Math.min(x2,v[1]-1);s=[`${x1} + ${y1}`,`${x2b} + ${v[1]-x2b}`];}
    if(R()<.5){v.reverse();if(s)s.reverse();if(dots)dots.reverse();}
    a.push({k,v,s,dots,ans:v[0]>v[1]?0:1});}
  return a;});
function s2bgNext(st,Q){st.k++;st.fb='';if(st.k>=Q.length){s2Send(st,{ok:st.bad<=2,ms:Math.round(st.sum+800*st.bad)});return;}st.wait=false;st.at=s2Now();render();}
GAMES.s_big=s2Base({name:'الأكبر أسرع',cls:'s2bg',lbc:'#C0392B',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D2483A"/><rect x="8" y="22" width="40" height="56" rx="12" fill="#fff"/><rect x="52" y="22" width="40" height="56" rx="12" fill="#FFE07A"/><text x="28" y="58" font-size="20" font-weight="900" text-anchor="middle" fill="#2D4763">68</text><text x="72" y="58" font-size="20" font-weight="900" text-anchor="middle" fill="#2D4763">86</text><path d="M72 84l-6 8h12z" fill="#fff"/></svg>`,
  title:'جهتين: اضغط على الأكبر بأسرع ما يمكن. أرقام، نقاط تعدها بعينك، أو عمليات جمع',
  tip:d=>d.rd<2?'أرقام ونقاط':d.rd<3?'أرقام ونقاط وعمليات جمع':'وفيه أرقام مكتوبة ١ ٢ ٣',
  legend:'الوقت = مجموع ردودك العشرة، وكل غلط يزيد 0.8 ثانية',
  bot(d,s,lv){const Q=s2bgQ(d);let sum=0,bad=0;for(const x of Q){sum+=[0,950,720,520][lv]+(x.k===1?[0,650,420,260][lv]:x.k===2?[0,750,480,300][lv]:x.k===3?[0,300,200,120][lv]:0)+rnd([0,500,300,180][lv]);if(Math.random()<[0,.09,.045,.015][lv]+(x.k===1?.03:0))bad++;}return {ok:bad<=2,ms:Math.round(sum+800*bad)};},
  start(d,st){const Q=s2bgQ(d);st.k=-1;st.sum=0;st.bad=0;st.wait=true;st.fb='';s2T(st,700,st=>s2bgNext(st,Q));},
  view(d,ctx,st){const Q=s2bgQ(d),x=st.k>=0&&!st.wait?Q[st.k]:null;
    const side=j=>x.k===1?`<svg viewBox="0 0 100 100" class="s2bg-d">${x.dots[j].map(([cx,cy])=>`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8"/>`).join('')}</svg>`:`<b class="${x.k===2?'sm':''}" dir="ltr">${x.s[j]}</b>`;
    return `<div class="s2bg-top"><span>${Math.max(1,Math.min(st.k+1,S2BN))} من ${S2BN}</span>${st.bad?`<i>✗ ${st.bad}</i>`:''}</div>
      <div class="s2bg-row ${st.fb}">${x?[0,1].map(j=>`<button class="s2bg-s" id="s2bg${st.k}_${j}" data-ga="pk" data-i="${j}">${side(j)}</button>`).join(''):`<div class="s2bg-m">${st.k<0?'استعد…':st.fb==='ok'?'✓':'✗'}</div>`}</div>
      <p class="note">اضغط الجهة الأكبر</p>`;},
  click(a,i,d,ctx,st){if(a!=='pk'||st.wait||st.k<0||(i!==0&&i!==1))return;const Q=s2bgQ(d),x=Q[st.k];if(!x)return;
    st.sum+=s2Now()-st.at;st.wait=true;if(i===x.ans)st.fb='ok';else{st.fb='bad';st.bad++;try{sfx('lose');}catch(e){}}render();s2T(st,240,st=>s2bgNext(st,Q));}});
HELP.s_big='تطلع لك جهتين، واضغط على الجهة الأكبر بأسرع ما يمكن. مرة رقمين متقاربين (68 و86)، ومرة مجموعتين نقاط تعدها بعينك، ومن الجولة الثالثة عمليات جمع (7 + 8 ولا 6 + 10؟)، وبعدها أرقام مكتوبة بالهندي. عشر مرات في الجولة: وقتك مجموع ردودك وكل غلط يزيده 0.8 ثانية، وأكثر من غلطتين تطلعك من الجولة. الأسرع ياخذ نقطتين وكل واحد ضبط ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 12. the quick difference: two small pictures, one thing is different ---------- */
const S2DC=['#E5483F','#2F86DA','#2EA44F','#F2C230','#A463D8','#F0832C'];
const S2DST=(()=>{let p='';for(let k=0;k<10;k++){const r=k%2?5:12.5,a=-Math.PI/2+k*Math.PI/5;p+=(k?'L':'M')+(r*Math.cos(a)).toFixed(1)+' '+(r*Math.sin(a)).toFixed(1);}return p+'Z';})();
const S2DSH=[`<circle r="11"/>`,`<rect x="-10" y="-10" width="20" height="20" rx="3"/>`,`<path d="M0 -12L11 9H-11Z"/>`,`<path d="M0 -13L11 0L0 13L-11 0Z"/>`,`<path d="${S2DST}"/>`];
const S2DK=[['col','gone'],['col','shp','gone'],['col','shp','gone','size'],['shp','gone','size','col'],['col','shp','gone','size','rot']];
const s2dfQ=s2Memo(d=>{const R=srng(d,'df'+d.rd),A=[];
  for(let i=0;i<9;i++)A.push({s:s2I(R,5),c:s2I(R,6),z:.8+s2I(R,3)*.1,dx:Math.round((R()-.5)*8),dy:Math.round((R()-.5)*8),r:s2I(R,4)*90,g:0});
  const ks=S2DK[Math.min(d.rd,4)],kind=ks[s2I(R,ks.length)],cell=s2I(R,9);if(kind==='rot'){A[cell].s=2;A[cell].r=0;}
  const B=A.map(x=>({...x})),x=B[cell];
  if(kind==='col')x.c=(x.c+1+s2I(R,5))%6;else if(kind==='shp')x.s=(x.s+1+s2I(R,4))%5;else if(kind==='gone')x.g=1;else if(kind==='size')x.z=x.z>=.9?.55:1.15;else x.r=180;
  return {p:R()<.5?[A,B]:[B,A],cell,kind};});
const s2dfPic=(P,pi,st,Q)=>`<svg viewBox="0 0 100 100" class="s2df-p">${P.map((o,i)=>o.g?'':`<g transform="translate(${18+(i%3)*32+o.dx} ${18+Math.floor(i/3)*32+o.dy}) rotate(${o.r}) scale(${o.z})" fill="${S2DC[o.c]}">${S2DSH[o.s]}</g>`).join('')}${st.hit?`<circle class="s2df-ok" cx="${18+(Q.cell%3)*32}" cy="${18+Math.floor(Q.cell/3)*32}" r="15"/>`:''}${st.miss&&st.miss[0]===pi?`<path class="s2df-no" transform="translate(${18+(st.miss[1]%3)*32} ${18+Math.floor(st.miss[1]/3)*32})" d="M-7 -7L7 7M7 -7L-7 7"/>`:''}${[...Array(9).keys()].map(i=>`<rect class="s2df-h" x="${2+(i%3)*32}" y="${2+Math.floor(i/3)*32}" width="32" height="32" fill="transparent" data-ga="t" data-i="${pi*9+i}"/>`).join('')}</svg>`;
GAMES.s_diff=s2Base({name:'الفرق السريع',cls:'s2df',lbc:'#117A65',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#148F77"/><rect x="7" y="20" width="41" height="54" rx="8" fill="#FFFBF0"/><rect x="52" y="20" width="41" height="54" rx="8" fill="#FFFBF0"/><circle cx="20" cy="36" r="6" fill="#E5483F"/><rect x="29" y="52" width="12" height="12" rx="2" fill="#2F86DA"/><circle cx="65" cy="36" r="6" fill="#E5483F"/><rect x="74" y="52" width="12" height="12" rx="2" fill="#F2C230"/><circle cx="80" cy="58" r="12" fill="none" stroke="#fff" stroke-width="3"/><text x="50" y="92" font-size="13" font-weight="900" fill="#fff" text-anchor="middle">؟</text></svg>`,
  title:'صورتين شبه بعض، وفيهم فرق واحد بس: لونه، شكله، حجمه أو ناقص. المسه في أي صورة',
  tip:d=>['الفرق لون أو شي ناقص','لون أو شكل أو شي ناقص','وصار فيه فرق بالحجم','الفروق كلها مخلوطة','وحتى شي مقلوب'][Math.min(d.rd,4)],
  legend:'كل لمسة غلط تزيد ثانية، وثلاث أغلاط تطلعك من الجولة',
  bot(d,s,lv){const bad=s2Bin(2,[0,.25,.12,.04][lv]);return {ok:Math.random()<[0,.88,.95,.985][lv],ms:Math.round([0,5200,3600,2300][lv]+Math.min(d.rd,4)*[0,450,300,200][lv]+rnd([0,3000,2000,1200][lv])+1000*bad)};},
  start(d,st){st.bad=0;st.miss=null;st.hit=false;s2T(st,90000,st=>s2Send(st,{ok:false,ms:Math.round(s2Now()-st.t0+1000*st.bad)}));},
  view(d,ctx,st){const Q=s2dfQ(d);
    return `<div class="s2df-hd"><span>وين الفرق؟</span>${st.bad?`<i>✗ ${st.bad}</i>`:''}</div><div class="s2df-row">${Q.p.map((P,pi)=>s2dfPic(P,pi,st,Q)).join('')}</div><p class="note">المس الشي المختلف في أي وحدة من الصورتين</p>`;},
  click(a,i,d,ctx,st){if(a!=='t'||st.hit||i==null||i<0||i>17)return;const Q=s2dfQ(d),c=i%9,pi=Math.floor(i/9),ms=Math.round(s2Now()-st.t0+1000*st.bad);
    if(c===Q.cell){st.hit=true;st.miss=null;render();s2T(st,500,st=>s2Send(st,{ok:true,ms}));return;}
    st.bad++;st.miss=[pi,c];try{sfx('lose');}catch(e){}if(st.bad>=3){render();s2T(st,500,st=>s2Send(st,{ok:false,ms:ms+1000}));return;}render();}});
HELP.s_diff='تطلع صورتين صغار شبه بعض، وبينهم فرق واحد بس: شي لونه تغير، أو شكله، أو حجمه، أو ناقص من وحدة، أو مقلوب. المس مكان الفرق في أي وحدة من الصورتين بأسرع وقت. كل لمسة غلط تزيد وقتك ثانية، وثلاث أغلاط تطلعك من الجولة. الأسرع ياخذ نقطتين وكل واحد لقاه ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 13. the group reaction chain: a spark hops around a ring of the players; catch it when it lands on you.
   The slowest catcher of the round loses a heart (the two slowest when five or more are left); no hearts, out of the game ---------- */
const S2CHR=12,s2chHp=n=>n<=4?3:2;
// the hops: every player still in gets the spark the same number of times, two bomb spots get it too; never the same spot twice in a row
const s2chQ=s2Memo(d=>{const R=srng(d,'ch'+d.rd),al=aliveSeats(d),m=al.length>4?2:3,rem=new Map(al.map(s=>[s,m]));rem.set(100,2);rem.set(101,1+(al.length>3?1:0));
  const a=[];let prev=-1;for(;;){const left=[...rem].filter(([k,c])=>c>0);if(!left.length)break;const tot=left.reduce((x,[k,c])=>x+c,0);
    const must=left.find(([k,c])=>c>(tot+1)/2&&k!==prev),pool=left.filter(([k])=>k!==prev);if(!pool.length)break;
    const k=must?must[0]:pool[s2I(R,pool.length)][0];a.push(k);rem.set(k,rem.get(k)-1);prev=k;}
  const base=[1250,1150,1050,950,880][Math.min(d.rd,4)];return {a,stay:a.map(()=>Math.max(560,base-s2I(R,480))),m,nodes:[...al,100,101]};});
const s2chMs=(sum,miss,bad,m)=>Math.round((sum+miss*1000)/Math.max(1,m)+300*bad);
function s2chBoard(d){if(!Array.isArray(d.hp))return '';const ls=Array.isArray(d.ls)?d.ls:[],lr=Array.isArray(d.lr)?d.lr:[];
  const rows=seatsOf(d).map(s=>({s,v:lr[s]})).sort((a,b)=>(d.out[a.s]==='1')-(d.out[b.s]==='1')||d.hp[b.s]-d.hp[a.s]||(a.v??1e9)-(b.v??1e9));
  return `<div class="spr s2ch-bd" id="s2chb${d.rd}"><div class="spr-h">${d.rd?`نتيجة الجولة ${d.win!=null?'الأخيرة':d.rd}`:'القلوب'}</div>${rows.map((r,j)=>`<div class="spr-r ${ls.includes(r.s)?'s2ch-lost':''} ${d.out[r.s]==='1'?'nt':''}" style="--c:${col(d,r.s)};--j:${j}"><i class="spr-m">${d.out[r.s]==='1'?'💔':j+1}</i><b>${escH(nm(d,r.s))}</b><span class="s2ch-hp">${'❤️'.repeat(Math.max(0,d.hp[r.s]))}${ls.includes(r.s)?'<s>💔</s>':''}</span><em>${d.rd&&lr.length?r.v==null?'—':(r.v/1000).toFixed(2)+' ث':''}</em></div>`).join('')}</div>`;}
GAMES.s_chain={...s2Base({name:'ردة الفعل الجماعية',cls:'s2ch',lbc:'#B9770E',rounds:S2CHR,board:s2chBoard,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C98A1B"/><circle cx="50" cy="50" r="32" fill="none" stroke="#FCE7B2" stroke-width="3" stroke-dasharray="4 5"/>${[['#EC6158',50,18],['#4AB1E8',80,50],['#4CB97F',50,82],['#9C7BD6',20,50]].map(([c,x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="#fff" stroke-width="3"/>`).join('')}<circle cx="80" cy="50" r="16" fill="none" stroke="#FFF3C4" stroke-width="3"/><path d="M52 36l-8 16h8l-4 12 12-18h-8l4-10z" fill="#fff"/></svg>`,
  title:'شرارة تتنقل بين اللاعبين: لما توصل عندك التقطها بسرعة، ولما تكون عند غيرك لا تضغط',
  tip:d=>{const al=aliveSeats(d).length;return `باقي ${al} لاعبين. ${al>=5?'أبطأ اثنين':'الأبطأ'} يخسر قلب ❤️`;},
  bot(d,s,lv){const Q=s2chQ(d);let sum=0,miss=0;for(let k=0;k<Q.m;k++){if(Math.random()<[0,.07,.03,.01][lv]){miss++;continue;}sum+=[0,430,350,280][lv]+rnd([0,240,150,90][lv]);}
    return {ok:true,ms:s2chMs(sum,miss,Math.random()<[0,.3,.15,.05][lv]?1:0,Q.m)};},
  start(d,st){const Q=s2chQ(d);st.k=-1;st.sum=0;st.miss=0;st.bad=0;st.got=false;st.fx='';
    const next=st=>{if(st.k>=0&&Q.a[st.k]===st.v&&!st.got)st.miss++;st.k++;st.got=false;st.fx='';if(st.k>=Q.a.length){s2Send(st,{ok:true,ms:s2chMs(st.sum,st.miss,st.bad,Q.m)});return;}
      st.at=s2Now();render();s2T(st,Q.stay[st.k],next);};
    s2T(st,1000,next);},
  view(d,ctx,st){const Q=s2chQ(d),N=Q.nodes.length,on=st.k>=0?Q.a[st.k]:null;
    const node=(x,j)=>{const an=-Math.PI/2+j*2*Math.PI/N,l=(50+38*Math.cos(an)).toFixed(1),t=(50+38*Math.sin(an)).toFixed(1),me=x===ctx.v,trap=x>=100;
      return `<i class="s2ch-n ${trap?'trap':''} ${me?'me':''} ${on===x?'on':''}" style="left:${l}%;top:${t}%;--c:${trap?'#5D6D7E':col(d,x)}"><u></u>${trap?'💣':me?'أنت':escH([...String(nm(d,x)).replace(/^\S*🤖\S*\s*/u,'')].slice(0,5).join(''))}</i>`;};
    return `<div class="s2ch-top"><span>${st.k<0?'استعد…':on===ctx.v?'عندك! التقطها ⚡':on>=100?'قنبلة! لا تضغط':'انتظر دورك'}</span><span>${'❤️'.repeat(Math.max(0,d.hp[ctx.v]))}</span></div>
      <div class="s2ch-ring ${st.fx}">${Q.nodes.map(node).join('')}<b class="s2ch-c">${Math.max(0,st.k+1)}/${Q.a.length}</b></div>
      <button class="s2ch-go ${on===ctx.v&&!st.got?'hot':''}" data-ga="tap">التقط ⚡</button>`;},
  click(a,i,d,ctx,st){if(a!=='tap'||st.k==null||st.k<0)return;const on=s2chQ(d).a[st.k];
    if(on===st.v&&!st.got){st.got=true;st.sum+=s2Now()-st.at;st.fx='ok';try{sfx('pop');}catch(e){}}
    else if(on!==st.v){st.bad++;st.fx='bad';try{sfx('lose');}catch(e){}}else return;render();}}),
  init:n=>({rd:0,hp:Array(n).fill(s2chHp(n)),tot:Array(n).fill(0),res:''}),
  points:d=>d.hp,
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${d.rd+1} • باقي ${aliveSeats(d).length} لاعبين</small><br>`,true),
  resolve(d,picks){const al=aliveSeats(d),sc=picks.map((p,s)=>d.out[s]!=='1'&&p&&typeof p==='object'&&Number.isFinite(p.ms)?Math.max(0,Math.min(99999,Math.round(p.ms))):null),val=s=>sc[s]==null?1e9:sc[s];
    const L=al.length>=5?2:1,srt=[...al].sort((x,y)=>val(y)-val(x)),cut=val(srt[Math.min(L,srt.length)-1]);let lose=al.filter(s=>val(s)>=cut);if(lose.length>=al.length)lose=[];
    const hp=[...d.hp];let out=d.out;lose.forEach(s=>{hp[s]=Math.max(0,hp[s]-1);if(!hp[s])out=setAt(out,s,'1');});
    const tot=d.tot.map((t,s)=>t+(al.includes(s)?Math.min(val(s),3000):0)),rd=d.rd+1,left=al.filter(s=>out[s]!=='1');
    const res=al.map(s=>`${nm(d,s)} ${sc[s]==null?'—':(sc[s]/1000).toFixed(2)+' ث'}`).join('، ')+(lose.length?`. خسر قلب: ${lose.map(s=>nm(d,s)).join(' و')}`:'. تعادل، محد خسر');
    let win=null;if(left.length<=1)win=left.length?left[0]:'d';else if(rd>=S2CHR)win=mostPts(hp.map((h,s)=>out[s]==='1'?-1:h*100000-Math.min(99999,Math.round(tot[s]/rd))));
    return {...d,hp,out,tot,rd,lr:sc,ls:lose,res,win};}};
HELP.s_chain='كل اللاعبين على دائرة، ومعهم مكانين فيهم قنبلة 💣. شرارة تنط من مكان لمكان: لما توصل عند نقطتك («أنت») اضغط «التقط» بأسرع ما يمكن، ولما تكون عند أحد ثاني أو عند القنبلة لا تضغط. كل واحد يجيه نفس العدد. وقتك معدل سرعتك، واللي تفوتك تنحسب ثانية كاملة، وكل ضغطة غلط تزيد 0.3 ثانية. آخر الجولة الأبطأ يخسر قلب ❤️ (وإذا باقي خمسة أو أكثر، أبطأ اثنين)، واللي تخلص قلوبه يطلع. آخر واحد يبقى يفوز، وإذا خلصت 12 جولة يفوز صاحب القلوب الأكثر ثم الأسرع. مع الفرق: آخر فريق يبقى فيه لاعب يفوز.';

'use strict';
/* speed2: speed and reflex games, part 1. Everyone plays the round at once and each phone times itself from the moment
   its round shows (spdState / spdSubmit / spdResolve / spdBoard from speed.js). The round's content is drawn from the game's
   seed and only drawn on screen after «جاهز، ابدأ», so nothing of it sits in the shared state. The host only collects
   each phone's result: a time ({ok,ms}, the fastest right one ranks first) or a score ({sc}, the highest ranks first). */

/* ---------- shared ---------- */
const s2I=(R,k)=>Math.floor(R()*k);
const s2Now=()=>performance.now();
const s2Gs=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const s2Bin=(n,p)=>{let k=0;for(let i=0;i<n;i++)if(Math.random()<p)k++;return k;};
/* this phone's round lives in S.sp (plain JSON: the engine may swap it for a copy of itself), marked with a run number.
   Timers and frame loops look the round up again when they fire and work on whatever object holds it now; once the
   round is sent, left or restarted they do nothing. */
let s2RunN=0;
const s2Is=(c,st)=>!!c&&c.key===st.key&&c.run===st.run&&c.phase!=='sent'&&c.phase!=='ready';
const s2T=(st,ms,fn)=>{const k={key:st.key,run:st.run};setTimeout(()=>{const c=S.sp;if(s2Is(c,k))fn(c);},Math.max(0,ms));};
const s2Loop=(st,fn)=>{const k={key:st.key,run:st.run};const f=()=>{const c=S.sp;if(s2Is(c,k)&&fn(c)!==false)requestAnimationFrame(f);};requestAnimationFrame(f);};
// a round's content, worked out once per round (every phone draws the same from the seed)
const s2Memo=f=>{let k0=null,v0=null;return d=>{const k=d.gid+':'+d.rd+':'+d.out;if(k!==k0){v0=f(d);k0=k;}return v0;};};
// hand this phone's result in (once); the round may have moved on meanwhile, then nothing is sent
function s2Send(st,pick){const c=S.sp;if(!s2Is(c,st))return;S.sp={key:c.key,phase:'sent'};try{sfx(pick.ok===false?'lose':'pop');}catch(e){}
  const d=S.st.d;if(d&&d.win==null&&spdKey(d,c.v)===c.key)simulPick(d,c.v,pick);else render();}
// score rounds: the highest score earns 2, every other positive score 1
function s2ScRes(d,picks,RN){const n=d.pl.length;
  const sc=picks.map(p=>p&&typeof p==='object'&&Number.isFinite(p.sc)?Math.max(-99,Math.min(999,Math.round(p.sc))):null);
  const v=sc.filter(x=>x!=null),mx=v.length?Math.max(...v):0,sg=Array(n).fill(0);
  sc.forEach((x,s)=>{if(x!=null&&x>0)sg[s]=x===mx?2:1;});
  const pts=d.pts.map((p,s)=>p+sg[s]),rd=d.rd+1,top=sc.map((x,s)=>x!=null&&x>0&&x===mx?s:-1).filter(s=>s>=0);
  const res=d.pl.map((r,s)=>sc[s]==null?(d.out[s]==='1'?'':`${nm(d,s)} —`):`${nm(d,s)} ${sc[s]}`).filter(Boolean).join('، ')+(top.length?`. الأعلى: ${top.map(s=>nm(d,s)).join(' و')}`:'. محد سجّل');
  return {...d,pts,rd,res,lr:sc,sg,win:rd>=RN?mostPts(pts):null};}
function s2ScBoard(d,unit){if(!Array.isArray(d.lr)||!Array.isArray(d.sg))return '';
  const rows=seatsOf(d).filter(s=>d.lr[s]!=null||d.out[s]!=='1').map(s=>({s,v:d.lr[s]})).sort((a,b)=>(b.v??-1e9)-(a.v??-1e9));if(!rows.length)return '';
  const mx=Math.max(1,...rows.map(r=>r.v||0));
  return `<div class="spr" id="spr${d.rd}"><div class="spr-h">نتيجة الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${rows.map((r,j)=>`<div class="spr-r ${d.sg[r.s]===2?'w':''} ${r.v==null?'nt':''}" style="--c:${col(d,r.s)};--j:${j}"><i class="spr-m">${d.sg[r.s]===2?'⭐':r.v==null?'':j+1}</i><b>${escH(nm(d,r.s))}</b><span class="spr-bar">${r.v>0?`<i style="width:${Math.max(8,Math.round(r.v/mx*100))}%"></i>`:''}</span><em>${r.v==null?'—':r.v+' '+unit}</em>${d.sg[r.s]?`<u class="spr-g">+${d.sg[r.s]}</u>`:''}</div>`).join('')}</div>`;}
// the board under the start button and at the end
const s2Board=(o,d)=>(o.board?o.board(d):o.score?s2ScBoard(d,o.unit):spdBoard(d))+(o.legend&&d.rd>0?`<p class="note s2leg">${o.legend}</p>`:'');
// what this phone sent, while it waits for the others
function s2Wait(o,d,ctx){if(!o.score)return waitCard(d,ctx);const p=ctx.v>=0?seatPick(d,ctx,ctx.v,d.rd):null;
  return `<div class="spd spd-sent"><div class="spd-ck">✓</div><div class="spdt">أرسلت</div>${p&&Number.isFinite(p.sc)?`<div class="spd-me">نتيجتك <b>${p.sc}</b> ${o.unit}</div>`:''}<p class="note">ننتظر الباقين</p>${qzWho(d,ctx)}</div>`;}
const s2Ready=(o,d,RN)=>`<div class="spd spd-ready"><div class="spd-card"><div class="rdyi">${o.icon}</div><div class="spdt">${o.title}</div>${o.tip?`<p class="s2tip">${o.tip(d)}</p>`:''}<span class="spd-rd">جولة ${Math.min(d.rd+1,RN)} من ${RN}</span><button class="btn red wide spd-go" data-ga="start">جاهز، ابدأ</button></div>${s2Board(o,d)}</div>`;
// a speed game: o.view / o.start / o.click play one round on this phone; o.bot gives a bot's result for the same round
function s2Base(o){const RN=o.rounds||5,box=h=>`<div class="s2 ${o.cls}">${h}</div>`;
  return {name:o.name,cat:'speed',lbc:o.lbc,icon:o.icon,
    botPick:(d,s,lv)=>o.bot(d,s,lv),
    init:n=>({rd:0,pts:Array(n).fill(0),res:''}),
    viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
    status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,RN)} من ${RN}</small><br>`,true),
    winExtra:d=>d.res,noTimer:false,
    resolve(d,p){if(o.score)return s2ScRes(d,p,RN);const x=spdResolve(d,p,o.rank!==false);return {...x,win:x.rd>=RN?mostPts(x.pts):null};},
    render(d,ctx){if(d.win!=null)return box(`<div class="spd">${s2Board(o,d)}</div>`);
      if(!ctx.my)return ctx.v>=0&&hasPicked(d,ctx.v)?box(s2Wait(o,d,ctx)):'';
      const st=spdState(d,ctx.v);if(st.phase==='ready')return box(s2Ready(o,d,RN));if(st.phase==='sent')return box(s2Wait(o,d,ctx));return box(o.view(d,ctx,st));},
    click(a,i,d,ctx){if(!ctx.my)return;const st=spdState(d,ctx.v);
      if(a==='start'){if(st.phase!=='ready')return;st.v=ctx.v;st.run=++s2RunN;st.phase='go';st.t0=s2Now();o.start(d,st);render();return;}
      if(st.phase!=='go'&&st.phase!=='show')return;o.click(a,i,d,ctx,st);}};}

/* ---------- 1. the quick colour word: words flash one by one, tap only when the ink is the colour the word names ---------- */
const S2CW=[['أحمر','#E5483F'],['أزرق','#2F86DA'],['أخضر','#2EA44F'],['أصفر','#F2C230'],['بنفسجي','#A463D8'],['برتقالي','#F0832C']];
const s2cwT=rd=>[1150,1000,880,780,700][Math.min(rd,4)];
// fourteen words; about a third match, at least four, never the first one and never the same card twice in a row
const s2cwQ=s2Memo(d=>{const R=srng(d,'cw'+d.rd),K=d.rd<2?4:6,N=14,a=[];
  for(let i=0;i<N;i++){let w,c,g=0;do{w=s2I(R,K);c=i>0&&R()<.3?w:s2I(R,K);g++;}while(g<30&&i&&a[i-1].w===w&&a[i-1].c===c);a.push({w,c});}
  let m=a.filter(x=>x.w===x.c).length;
  for(let g=0;m<4&&g<80;g++){const i=1+s2I(R,N-1),x=a[i];const p=a[i-1],q=a[i+1];if(x.w!==x.c&&!(p.w===x.w&&p.c===x.w)&&!(q&&q.w===x.w&&q.c===x.w)){x.c=x.w;m++;}}
  return a;});
// a missed match counts as the whole time it was shown, a wrong tap adds 0.4 s
const s2cwMs=(M,H,sum,bad,T)=>Math.round((sum+(M-H)*T)/Math.max(1,M)+400*bad);
GAMES.s_cword=s2Base({name:'لون الكلمة السريع',cls:'s2cw',lbc:'#7A2E8C',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A2E8C"/><rect x="12" y="16" width="76" height="46" rx="12" fill="#1F2A36"/><text x="50" y="49" font-size="24" font-weight="900" fill="#2EA44F" text-anchor="middle">أخضر</text><rect x="22" y="70" width="56" height="20" rx="10" fill="#F2C230"/><path d="M41 80l6 5 12-11" stroke="#1F2A36" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  title:'تطلع كلمات ألوان ورا بعض. اضغط «تطابق» بس إذا لون الخط هو نفس الكلمة',
  tip:d=>d.rd<2?'أربع ألوان، والكلمة تبقى ثانية تقريبًا':d.rd<4?'ست ألوان والكلمات أسرع':'أسرع جولة: الكلمة أقل من ثانية',
  legend:'الوقت = معدل سرعتك على الكلمات المطابقة، والغلط يزيده',
  bot(d,s,lv){const Q=s2cwQ(d),T=s2cwT(d.rd);let M=0,H=0,sum=0,bad=0;
    for(const x of Q){if(x.w===x.c){M++;if(Math.random()<[0,.8,.91,.97][lv]){const rt=[0,540,450,370][lv]+rnd([0,330,220,140][lv]);if(rt<T){H++;sum+=rt;}}}else if(Math.random()<[0,.07,.035,.01][lv])bad++;}
    return {ok:H>0&&M-H+bad<=2,ms:s2cwMs(M,H,sum,bad,T)};},
  start(d,st){const Q=s2cwQ(d),T=s2cwT(d.rd);st.k=-1;st.tap=[];st.sum=0;st.bad=0;st.fx='';st.blank=false;
    const fin=st=>{const M=Q.filter(x=>x.w===x.c).length,H=st.tap.filter(x=>x===1).length;s2Send(st,{ok:H>0&&M-H+st.bad<=2,ms:s2cwMs(M,H,st.sum,st.bad,T)});};
    const next=st=>{st.k++;st.fx='';st.blank=false;if(st.k>=Q.length){fin(st);return;}st.at=s2Now();render();s2T(st,T,st=>{st.blank=true;render();s2T(st,170,next);});};
    s2T(st,900,next);},
  view(d,ctx,st){const Q=s2cwQ(d),x=st.k>=0&&!st.blank?Q[st.k]:null,H=st.tap.filter(v=>v===1).length;
    return `<div class="s2cw-top"><span>كلمة ${Math.max(0,Math.min(st.k+1,Q.length))} من ${Q.length}</span><span class="s2cw-sc">✓ ${H}${st.bad?` <i>✗ ${st.bad}</i>`:''}</span></div>
      <div class="s2cw-card ${st.fx}">${st.k<0?'<span class="s2cw-rdy">استعد…</span>':x?`<b id="s2cww${st.k}" style="color:${S2CW[x.c][1]}">${S2CW[x.w][0]}</b>`:''}</div>
      <button class="s2cw-go" data-ga="hit"><b>تطابق!</b><small>اللون نفس الكلمة</small></button>`;},
  click(a,i,d,ctx,st){if(a!=='hit'||st.k<0||st.blank||st.tap[st.k]!=null)return;const x=s2cwQ(d)[st.k];
    if(x.w===x.c){st.tap[st.k]=1;st.sum+=s2Now()-st.at;st.fx='ok';}else{st.tap[st.k]=0;st.bad++;st.fx='bad';try{sfx('lose');}catch(e){}}render();}});
HELP.s_cword='تطلع كلمات ألوان وحدة ورا الثانية، وكل كلمة مكتوبة بلون. اضغط زر «تطابق» بس إذا لون الخط هو نفس الكلمة (مثلًا «أحمر» مكتوبة بالأحمر). كل ما اضغطت أسرع على الكلمات المطابقة قل وقتك، واللي تفوتك تنحسب عليك بوقتها كامل، والضغطة الغلط تزيد وقتك 0.4 ثانية. أكثر من غلطتين في الجولة وتطلع منها بدون نقاط. الأقل وقت ياخذ نقطتين وكل واحد ضبط ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز. مع الفرق تنجمع نقاط كل فريق.';

/* ---------- 2. balloon pop: balloons rise, pop only the ones in your own colour ---------- */
const S2PH=360;
// the round's balloons: lane, colour slot (0 = yours, 1..3 = others), when it leaves the ground and its sway
const s2poQ=s2Memo(d=>{const R=srng(d,'po'+d.rd),rd=d.rd,n=16+rd*2,U=3500-rd*280,gap=640-rd*45,a=[];let ln=-1;
  for(let i=0;i<n;i++){let l;do l=s2I(R,5);while(l===ln);ln=l;a.push({l,k:R()<.42?0:1+s2I(R,3),t:600+i*gap+s2I(R,180),w:s2I(R,628)/100});}
  let tg=a.filter(b=>!b.k).length;for(let g=0;tg<6&&g<60;g++){const b=a[s2I(R,n)];if(b.k){b.k=0;tg++;}}
  return {a,U,end:a[n-1].t+U+120};});
const s2hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
// your balloons wear your player colour; the three others are drawn from the colours furthest from it
function s2poCols(d,v){const me=col(d,v),m=s2hex(me),far=c=>{const x=s2hex(c);return Math.hypot(x[0]-m[0],x[1]-m[1],x[2]-m[2]);};
  const o=COLS.filter(c=>c!==me).sort((a,b)=>far(b)-far(a)).slice(0,4);return [me,...shuffleR(srng(d,'pc'+d.rd),o).slice(0,3)];}
const s2poTf=(b,el,U)=>{const p=Math.max(0,Math.min(1,(el-b.t)/U));return `translate(${Math.round(Math.sin(b.w+p*7)*10)}px,${Math.round(-(S2PH+96)*p)}px)`;};
const s2poFin=st=>s2Send(st,{ok:true,sc:st.got-st.bad});
GAMES.s_pop=s2Base({name:'فرقع البالونات',cls:'s2po',lbc:'#2F86DA',score:true,unit:'🎈',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5BB6EE"/><circle cx="20" cy="84" r="14" fill="#fff" opacity=".7"/><circle cx="84" cy="88" r="16" fill="#fff" opacity=".7"/><path d="M36 64q2 12-4 24M66 56q-2 12 4 26" stroke="#2D4763" stroke-width="1.6" fill="none"/><ellipse cx="36" cy="42" rx="17" ry="21" fill="#EC6158"/><ellipse cx="66" cy="36" rx="15" ry="19" fill="#F0B429"/><ellipse cx="30" cy="34" rx="4" ry="7" fill="#fff" opacity=".5"/><ellipse cx="61" cy="29" rx="3.5" ry="6" fill="#fff" opacity=".5"/><path d="M76 12l4 8 8-2-5 7 6 6-9-1-2 8-3-8-8 2 5-7z" fill="#fff"/></svg>`,
  title:'البالونات تطير لفوق: فرقع بس اللي بلونك. الغلط ينقص عليك',
  tip:d=>`فيه ${s2poQ(d).a.length} بالونة${d.rd>=2?' وتطير أسرع':''}`,
  legend:'النتيجة = بالوناتك اللي فرقعتها ناقص الغلط',
  bot(d,s,lv){const Q=s2poQ(d);let sc=0;for(const b of Q.a){if(!b.k){if(Math.random()<[0,.62,.8,.93][lv])sc++;}else if(Math.random()<[0,.12,.05,.015][lv])sc--;}return {ok:true,sc};},
  start(d,st){const Q=s2poQ(d);st.pop={};st.got=0;st.bad=0;st.vis='';st.bst=[];
    s2Loop(st,st=>{const el=s2Now()-st.t0;let vis='';const now=[];
      Q.a.forEach((b,i)=>{if(el>=b.t&&el<=b.t+Q.U&&!st.pop[i]){vis+=i+',';now.push(i);}});
      if(st.bst.length&&st.bst[0].e<el)st.bst=st.bst.filter(x=>x.e>=el),vis+='b';
      if(vis!==st.vis){st.vis=vis;render();}else now.forEach(i=>{const e=document.getElementById('s2b'+i);if(e)e.style.transform=s2poTf(Q.a[i],el,Q.U);});
      if(el>=Q.end){s2poFin(st);return false;}});
    // the clock still ends the round where frames do not run (a hidden tab)
    s2T(st,Q.end+400,s2poFin);},
  view(d,ctx,st){const Q=s2poQ(d),el=s2Now()-st.t0,C=s2poCols(d,ctx.v);
    const bl=Q.a.map((b,i)=>el>=b.t&&el<=b.t+Q.U&&!st.pop[i]?`<button class="s2bl" id="s2b${i}" data-ga="pop" data-i="${i}" aria-label="بالونة" style="--c:${C[b.k]};left:${10+b.l*20}%;transform:${s2poTf(b,el,Q.U)}"></button>`:'').join('');
    const bs=st.bst.map(x=>`<i class="s2po-x ${x.bad?'no':''}" id="s2x${x.i}" style="left:${x.x}%;top:${x.y}px">${x.bad?'✗':'+1'}</i>`).join('');
    return `<div class="s2po-hd"><span class="s2po-me"><i style="--c:${C[0]}"></i>بالوناتك بهاللون</span><b class="s2po-n">🎈 ${st.got}</b>${st.bad?`<b class="s2po-n no">✗ ${st.bad}</b>`:''}</div>
      <div class="s2po-sky"><i class="s2po-cl a"></i><i class="s2po-cl b"></i>${bl}${bs}<div class="s2po-gr"></div></div>`;},
  click(a,i,d,ctx,st){if(a!=='pop'||!st.pop)return;const Q=s2poQ(d),b=Q.a[i],el=s2Now()-st.t0;if(!b||st.pop[i]||el<b.t||el>b.t+Q.U)return;
    const bad=b.k!==0;st.pop[i]=1;if(bad){st.bad++;try{sfx('lose');}catch(e){}}else{st.got++;try{sfx('pop');}catch(e){}}
    const p=(el-b.t)/Q.U;st.bst.push({i,bad,x:10+b.l*20,y:Math.round(S2PH+36-(S2PH+96)*p),e:el+420});st.vis='';render();}});
HELP.s_pop='بالونات بألوان مختلفة تطير من تحت لفوق. فوق الشاشة تشوف لونك (لون لاعبك): فرقع بالوناتك بس بضغطة عليها. كل بالونة من لونك بنقطة، وكل بالونة لون ثاني تفرقعها تنقص نقطة، واللي تطير وتروح ما تنحسب. الكل يلعب نفس البالونات بنفس التوقيت. أعلى نتيجة في الجولة تاخذ نقطتين، وكل نتيجة فوق الصفر تاخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز. مع الفرق تنجمع نقاط كل فريق.';

/* ---------- 3. the beat: four beats to listen to with the eyes, then eight taps on the beat ---------- */
const s2btI=d=>{const R=srng(d,'bt'+d.rd);return 60000/([84,96,108,120,132][Math.min(d.rd,4)]+s2I(R,9)-4);};
// which beats light up: always the four to listen to; the tapped ones on early rounds, half of them on middle rounds
const s2btLit=(rd,j)=>j<4||rd<2||(rd<4&&j<8);
const s2btCl=e=>e==null?'':e<60?'g':e<130?'y':'r';
function s2btFin(st){const I=st.I,h=st.err.filter(x=>x!=null).length,m=st.err.reduce((a,x)=>a+(x==null?I/2:x),0)/8;s2Send(st,{ok:h>=5,ms:Math.round(m+40*st.ex)});}
GAMES.s_beat=s2Base({name:'نقرة الإيقاع',cls:'s2bt',lbc:'#D35400',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8762C"/><circle cx="50" cy="46" r="30" fill="#FFD9A8" opacity=".35"/><circle cx="50" cy="46" r="20" fill="#fff"/><circle cx="50" cy="46" r="9" fill="#E8762C"/>${[0,1,2,3,4,5,6,7].map(k=>`<circle cx="${22+k*8}" cy="86" r="3" fill="${k<5?'#fff':'#FFD9A8'}" opacity="${k<5?1:.6}"/>`).join('')}</svg>`,
  title:'الدائرة تنبض: عدّ معها أربع نبضات، وبعدها اضغط مع كل نبضة ثمان مرات',
  tip:d=>d.rd<2?'النبض يبان طول الجولة':d.rd<4?'النبض يختفي في نص الضغطات: كمّل على نفس الإيقاع':'بعد الأربع الأولى النبض يختفي كله: الإيقاع في راسك',
  legend:'الوقت هنا = معدل بعدك عن النبضة، كل ما قل أحسن',
  bot(d,s,lv){const hid=d.rd>=4?1:d.rd>=2?.5:0,base=[0,80,50,30][lv]*(1+hid*.5),I=s2btI(d);let sum=0,h=0;
    for(let k=0;k<8;k++){if(Math.random()<[0,.07,.03,.005][lv]){sum+=I/2;continue;}h++;sum+=Math.min(I/2,Math.abs(s2Gs())*base*1.25);}
    return {ok:h>=5,ms:Math.round(sum/8+(Math.random()<[0,.3,.1,0][lv]?40:0))};},
  start(d,st){const I=s2btI(d);st.I=I;st.b0=s2Now()+700;st.err=Array(8).fill(null);st.ex=0;st.j=-1;st.last=null;
    for(let j=0;j<12;j++)s2T(st,st.b0+j*I-s2Now(),st=>{st.j=j;
      if(j===0||j===4||j===8){render();}
      else{const c=document.getElementById('s2btc');if(c)c.textContent=j<4?String(j+1):'';}
      if(s2btLit(d.rd,j)){const e=document.getElementById('s2bp');if(e){e.classList.remove('on');void e.offsetWidth;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),130);}}});
    s2T(st,st.b0+11.5*I-s2Now(),s2btFin);},
  view(d,ctx,st){const lead=st.j<4,dark=!lead&&!s2btLit(d.rd,Math.max(4,st.j));
    return `<div class="s2bt-l">${lead?'تابع النبض… <b id="s2btc">'+(st.j>=0?st.j+1:'')+'</b>':dark?'النبض اختفى، كمّل على نفس الإيقاع':'اضغط مع كل نبضة!'}</div>
      <button class="s2bt-pad ${dark?'dark':''}" data-ga="tap" aria-label="اضغط"><i id="s2bp" class="s2bt-p"></i><i class="s2bt-c"></i></button>
      <div class="s2bt-dots">${st.err.map((e,k)=>`<i class="${s2btCl(e)} ${!lead&&st.j-4===k?'cur':''}"></i>`).join('')}</div>
      <p class="s2bt-fb">${st.last==null?'&nbsp;':Math.abs(st.last)<25?'بالضبط 👌':st.last<0?`بدري ${Math.round(-st.last)} م.ث`:`متأخر ${Math.round(st.last)} م.ث`}</p>`;},
  click(a,i,d,ctx,st){if(a!=='tap'||st.err==null)return;const t=s2Now(),I=st.I;let j=Math.round((t-st.b0)/I);
    if(j<4||j>11){st.ex++;st.last=null;render();return;}const e=t-(st.b0+j*I);
    if(st.err[j-4]!=null||Math.abs(e)>I/2){st.ex++;render();return;}st.err[j-4]=Math.abs(e);st.last=e;render();}});
HELP.s_beat='دائرة كبيرة تنبض على إيقاع ثابت. أول أربع نبضات بس تابعها بعينك وعدّ معها، وبعدها اضغط على الدائرة مع كل نبضة، ثمان ضغطات. ينحسب معدل بعد ضغطاتك عن النبض (بالجزء من الثانية)، والنبضة اللي تفوتها تنحسب عليك، والضغطات الزايدة تزيد الرقم. في الجولات المتوسطة النبض يختفي في النص، وفي الأخيرة يختفي بعد الأربع الأولى، فكمّل على الإيقاع اللي في راسك. لازم تضبط خمس نبضات على الأقل. الأدق ياخذ نقطتين وكل واحد ضبط ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 4. lightning sums: one sum a round, four answers, only the first right answer scores ---------- */
const S2SMR=8;
function s2smQ(d){const R=srng(d,'sm'+d.rd),I=(a,b)=>a+s2I(R,b-a+1),rd=d.rd;let t,v;
  if(rd<2){const a=I(12,49),b=I(3,9);t=`${a} + ${b}`;v=a+b;}
  else if(rd<4){const a=I(15,69),b=I(12,39);t=`${a} + ${b}`;v=a+b;}
  else if(rd<6){if(R()<.5){const a=I(41,95),b=I(12,38);t=`${a} − ${b}`;v=a-b;}else{const a=I(11,39),b=I(11,29),c=I(3,9);t=`${a} + ${b} + ${c}`;v=a+b+c;}}
  else{const a=I(25,69),b=I(14,39),c=I(6,19);t=`${a} + ${b} − ${c}`;v=a+b-c;}
  const off=new Set();for(const x of shuffleR(R,[1,-1,10,-10,2,-2,9,11]))if(off.size<3&&v+x>0)off.add(v+x);
  return {t,...withOptions(R,String(v),[...off].map(String))};}
GAMES.s_sum=s2Base({name:'حساب البرق',cls:'s2sm',lbc:'#1E8449',rank:false,rounds:S2SMR,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#239B56"/><rect x="12" y="14" width="76" height="40" rx="10" fill="#14532D"/><text x="50" y="42" font-size="22" font-weight="900" fill="#fff" text-anchor="middle" direction="ltr">27+8</text><path d="M58 56L40 80h12l-6 16 22-26H56l6-14z" fill="#F7DC6F"/></svg>`,
  title:'تطلع عملية حساب وأربع أجوبة: أول واحد يجاوب صح ياخذ الجولة',
  tip:d=>d.rd<2?'جمع رقمين، واحد منهم صغير':d.rd<4?'جمع رقمين من خانتين':d.rd<6?'طرح، أو جمع ثلاث أرقام':'جمع وطرح ثلاث أرقام',
  legend:'بس الأسرع بجواب صح ياخذ نقطة',
  bot(d,s,lv){return {ok:Math.random()<[0,.78,.9,.97][lv],ms:[0,4300,3100,2100][lv]+d.rd*[0,300,220,150][lv]+rnd([0,2600,1600,900][lv])};},
  start(d,st){},
  view(d,ctx,st){const Q=s2smQ(d);return `<div class="s2sm-q"><span dir="ltr">${Q.t} = <b>؟</b></span></div><div class="s2sm-o">${Q.o.map((x,k)=>`<button class="s2sm-b" data-ga="m" data-i="${k}" style="--i:${k}">${x}</button>`).join('')}</div>`;},
  click(a,i,d,ctx,st){if(a!=='m'||i==null||i<0||i>3)return;s2Send(st,{ok:i===s2smQ(d).a,ms:Math.round(s2Now()-st.t0)});}});
HELP.s_sum='كل جولة تطلع عملية حساب (جمع، وبعدين طرح، وبعدين ثلاث أرقام) ومعها أربع أجوبة. اختر الجواب الصح بأسرع ما يمكن: عندك فرصة وحدة بس، والجواب الغلط يطلعك من الجولة. أسرع واحد جاوب صح ياخذ نقطة، والباقين ما ياخذون شي. ثمان جولات، واللي نقاطه أكثر يفوز. مع الفرق تنجمع نقاط كل فريق.';

/* ---------- 5. arrows: answer where the middle arrow points, while the arrows beside it point elsewhere ---------- */
const S2AN=10,S2AP='M-15 -5H3V-13L17 0L3 13V5H-15Z';
// 0 right, 1 down, 2 left, 3 up (a quarter turn each); left and right only on the first two rounds
const s2arQ=s2Memo(d=>{const R=srng(d,'ar'+d.rd),four=d.rd>=2,dir=()=>four?s2I(R,4):s2I(R,2)*2,a=[];
  for(let i=0;i<S2AN;i++){const t=dir(),co=R()<.4;let f;const other=()=>{let x;do x=dir();while(x===t);return x;};
    if(co)f=[t,t,t,t];else if(d.rd>=3&&R()<.35)f=[other(),other(),other(),other()];else{const x=other();f=[x,x,x,x];}a.push({t,f,co});}
  return a;});
const s2arSvg=(c,cls)=>`<svg viewBox="-20 -20 40 40" class="${cls||''}"><path d="${S2AP}" transform="rotate(${c*90})"/></svg>`;
function s2arNext(st,Q){st.k++;st.fb='';if(st.k>=Q.length){s2Send(st,{ok:st.bad<=2,ms:Math.round(st.sum+800*st.bad)});return;}st.wait=false;st.at=s2Now();render();}
GAMES.s_arrow=s2Base({name:'الأسهم',cls:'s2ar',lbc:'#2C3E91',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#34449E"/><rect x="8" y="34" width="84" height="32" rx="12" fill="#26337A"/>${[0,1,2,3,4].map(j=>`<path d="${S2AP}" transform="translate(${18+j*16} 50) scale(.5) rotate(${j===2?180:0})" fill="${j===2?'#F7DC6F':'#9FB0F0'}"/>`).join('')}<circle cx="50" cy="76" r="4" fill="#F7DC6F"/></svg>`,
  title:'خمس أسهم في صف: جاوب بس على اتجاه السهم اللي في النص، والباقي يغشّك',
  tip:d=>d.rd<2?'يمين ويسار بس. تقدر تضغط السهم أو تسحب بإصبعك':d.rd<3?'الحين أربع اتجاهات':'الأسهم اللي على الجنب تتلخبط بعد',
  legend:'الوقت = مجموع ردودك العشرة، وكل غلط يزيد 0.8 ثانية',
  bot(d,s,lv){const Q=s2arQ(d);let sum=0,bad=0;for(const x of Q){sum+=[0,880,680,520][lv]+(x.co?0:[0,190,120,70][lv])+rnd([0,500,300,180][lv]);if(Math.random()<[0,.08,.04,.012][lv]+(x.co?0:[0,.07,.035,.012][lv]))bad++;}return {ok:bad<=2,ms:Math.round(sum+800*bad)};},
  start(d,st){const Q=s2arQ(d);st.k=-1;st.sum=0;st.bad=0;st.fb='';st.wait=true;s2T(st,700,st=>s2arNext(st,Q));},
  view(d,ctx,st){const Q=s2arQ(d),x=st.k>=0&&!st.wait?Q[st.k]:null,four=d.rd>=2;
    const row=x?`<div class="s2ar-row" id="s2arr${st.k}">${[x.f[0],x.f[1],x.t,x.f[2],x.f[3]].map((c,j)=>s2arSvg(c,j===2?'mid':'')).join('')}</div>`:`<div class="s2ar-row s2ar-b">${st.k<0?'استعد…':st.fb==='ok'?'✓':st.fb==='bad'?'✗':''}</div>`;
    const btn=c=>`<button class="s2ar-k k${c}" data-ga="dir" data-i="${c}" aria-label="${['يمين','تحت','يسار','فوق'][c]}">${s2arSvg(c)}</button>`;
    return `<div class="s2ar-top"><span>${Math.max(1,Math.min(st.k+1,S2AN))} من ${S2AN}</span>${st.bad?`<i>✗ ${st.bad}</i>`:''}</div>
      <div class="s2ar-sw ${st.fb}">${row}<i class="s2ar-dot"></i></div>
      <div class="s2ar-pad ${four?'four':''}">${four?[3,2,0,1].map(btn).join(''):[2,0].map(btn).join('')}</div>`;},
  click(a,i,d,ctx,st){if(a!=='dir'||st.wait||st.k<0)return;const Q=s2arQ(d),x=Q[st.k];if(!x||![0,1,2,3].includes(i)||(d.rd<2&&i%2))return;
    st.sum+=s2Now()-st.at;st.wait=true;if(i===x.t)st.fb='ok';else{st.fb='bad';st.bad++;try{sfx('lose');}catch(e){}}render();s2T(st,260,st=>s2arNext(st,Q));}});
// a swipe on the arrows answers too
let s2Sw=null;
document.addEventListener('pointerdown',e=>{s2Sw=e.target&&e.target.closest&&e.target.closest('.s2ar-sw')?{x:e.clientX,y:e.clientY}:null;},{passive:true});
document.addEventListener('pointerup',e=>{const p=s2Sw;s2Sw=null;if(!p||S.st.g!=='s_arrow'||!S.st.d)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.max(Math.abs(dx),Math.abs(dy))<28)return;
  const k=Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):(dy>0?1:3);try{GAMES.s_arrow.click('dir',k,S.st.d,mkCtx());}catch(err){console.error(err);}},{passive:true});
HELP.s_arrow='تطلع خمس أسهم في صف. جاوب بس على اتجاه السهم اللي في النص: اضغط زر نفس الاتجاه أو اسحب بإصبعك على الأسهم. الأسهم اللي على الجنب أحيانًا مع النص وأحيانًا عكسه عشان تلخبطك. عشر أسهم في الجولة: أول جولتين يمين ويسار بس، وبعدها أربع اتجاهات. وقتك مجموع ردودك، وكل غلط يزيده 0.8 ثانية، وأكثر من غلطتين تطلعك من الجولة. الأسرع ياخذ نقطتين وكل واحد ضبط ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 6. letter hunt: find every copy of a letter among its look-alikes ---------- */
const S2LG=[['ب','ت','ث','ن','ي'],['ج','ح','خ'],['د','ذ'],['ر','ز','و'],['س','ش'],['ص','ض'],['ط','ظ'],['ع','غ'],['ف','ق'],['ك','ل'],['م','ه','ة']];
const S2LA=S2LG.flat();
function s2ltQ(d){const R=srng(d,'lt'+d.rd),z=[5,5,6,6,6][Math.min(d.rd,4)],k=[3,3,4,4,5][Math.min(d.rd,4)];
  const gi=s2I(R,S2LG.length),g=S2LG[gi],t=g[s2I(R,g.length)],near=g.filter(x=>x!==t);
  const pos=new Set(shuffleR(R,[...Array(z*z).keys()]).slice(0,k));
  const c=[...Array(z*z)].map((_,i)=>{if(pos.has(i))return t;if(R()<.72)return near[s2I(R,near.length)];let x;do x=S2LA[s2I(R,S2LA.length)];while(x===t);return x;});
  return {z,t,c,k};}
GAMES.s_letter=s2Base({name:'صيد الحرف',cls:'s2lt',lbc:'#16A085',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1AAE91"/><rect x="12" y="12" width="76" height="76" rx="12" fill="#E8FFF8"/>${['ب','ت','ث','ن','ت','ب','ث','ت','ن'].map((c,i)=>`<text x="${28+(i%3)*22}" y="${38+Math.floor(i/3)*22}" font-size="17" font-weight="900" text-anchor="middle" fill="${c==='ث'?'#C0392B':'#1F4F46'}">${c}</text>`).join('')}<circle cx="72" cy="40" r="10" fill="none" stroke="#C0392B" stroke-width="3"/><path d="M79 47l9 9" stroke="#C0392B" stroke-width="4" stroke-linecap="round"/></svg>`,
  title:'نعطيك حرف، والقطه كله في اللوحة بين حروف تشبهه',
  tip:d=>{const z=[5,5,6,6,6][Math.min(d.rd,4)],k=[3,3,4,4,5][Math.min(d.rd,4)];return `لوحة ${z}×${z} وفيها الحرف ${k} مرات`;},
  legend:'كل ضغطة غلط تزيد ثانية، وثلاث أغلاط تطلعك من الجولة',
  bot(d,s,lv){const Q=s2ltQ(d);const bad=Math.random()<[0,.25,.12,.04][lv]?1:0;return {ok:Math.random()<[0,.9,.95,.99][lv],ms:Math.round(Q.k*[0,1650,1200,820][lv]*(Q.z/5)+rnd([0,2500,1500,800][lv])+1000*bad)};},
  start(d,st){st.got={};st.bad=0;st.miss=-1;},
  view(d,ctx,st){const Q=s2ltQ(d),n=Object.keys(st.got).length;
    return `<div class="s2lt-hd"><span>دوّر على</span><b class="s2lt-t">${Q.t}</b><span class="s2lt-n">${n} من ${Q.k}</span>${st.bad?`<i>✗ ${st.bad}</i>`:''}</div>
      <div class="s2lt-g" style="grid-template-columns:repeat(${Q.z},minmax(0,1fr))">${Q.c.map((x,i)=>`<button class="s2lt-c ${st.got[i]?'got':''} ${st.miss===i?'bad':''}" data-ga="c" data-i="${i}" ${st.got[i]?'disabled':''}>${x}</button>`).join('')}</div>`;},
  click(a,i,d,ctx,st){if(a!=='c')return;const Q=s2ltQ(d);if(i==null||i<0||i>=Q.c.length||st.got[i])return;
    if(Q.c[i]===Q.t){st.got[i]=1;st.miss=-1;if(Object.keys(st.got).length>=Q.k){s2Send(st,{ok:true,ms:Math.round(s2Now()-st.t0+1000*st.bad)});return;}try{sfx('tap');}catch(e){}render();return;}
    st.bad++;st.miss=i;try{sfx('lose');}catch(e){}if(st.bad>=3){s2Send(st,{ok:false,ms:Math.round(s2Now()-st.t0+1000*st.bad)});return;}render();}});
HELP.s_letter='فوق اللوحة يطلع حرف، واللوحة مليانة حروف تشبهه (مثل ب ت ث ن). الحرف موجود أكثر من مرة: القطه كله بأسرع وقت. كل ضغطة غلط تزيد وقتك ثانية، وثلاث أغلاط تطلعك من الجولة. اللوحة تكبر والحرف يتكرر أكثر كل جولة. الأسرع ياخذ نقطتين وكل واحد كمّل ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

/* ---------- 7. same shape: is the second shape the first one turned, or its mirror? ---------- */
const S2SN=8;
const s2shN=c=>{const mx=Math.min(...c.map(p=>p[0])),my=Math.min(...c.map(p=>p[1]));return c.map(p=>[p[0]-mx,p[1]-my]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);};
const s2shK=c=>s2shN(c).map(p=>p.join(',')).join(';');
const s2shRot=(c,r)=>{let x=c;for(let k=0;k<r;k++)x=x.map(([a,b])=>[-b,a]);return s2shN(x);};
const s2shMir=c=>s2shN(c.map(([a,b])=>[-a,b]));
// a random piece of m squares inside a 4×4 box whose mirror is a different piece (so «mirror» is really «different»)
function s2shPiece(R,m){for(let g=0;g<200;g++){const c=[[0,0]],has=(x,y)=>c.some(p=>p[0]===x&&p[1]===y);
    while(c.length<m){const p=c[s2I(R,c.length)],dd=[[1,0],[-1,0],[0,1],[0,-1]][s2I(R,4)],x=p[0]+dd[0],y=p[1]+dd[1];if(!has(x,y))c.push([x,y]);}
    const n=s2shN(c);if(Math.max(...n.map(p=>p[0]))>3||Math.max(...n.map(p=>p[1]))>3)continue;
    const mk=s2shK(s2shMir(n));if([0,1,2,3].some(r=>s2shK(s2shRot(n,r))===mk))continue;return n;}
  return s2shN([[0,0],[1,0],[2,0],[2,1],[3,1]]);}
const s2shQ=s2Memo(d=>{const R=srng(d,'sh'+d.rd),m=d.rd<2?5:d.rd<4?6:7,a=[];
  for(let i=0;i<S2SN;i++){const p=s2shPiece(R,m),same=R()<.5,r=s2I(R,4),q=s2shRot(same?p:s2shMir(p),r);a.push({p,q:s2shRot(q,0),same,r,c:s2I(R,5)});}
  return a;});
const S2SC=['#E5483F','#2F86DA','#2EA44F','#9B59D0','#F0832C'];
const s2shSvg=(c,fill,rot)=>{const w=Math.max(...c.map(p=>p[0]))+1,h=Math.max(...c.map(p=>p[1]))+1,ox=(4-w)/2,oy=(4-h)/2;
  return `<svg viewBox="-0.3 -0.3 4.6 4.6" class="s2sh-p"><g transform="rotate(${rot||0} 2 2)">${c.map(([x,y])=>`<rect x="${x+ox+.04}" y="${y+oy+.04}" width=".92" height=".92" rx=".16" fill="${fill}"/>`).join('')}</g></svg>`;};
function s2shNext(st,Q){st.k++;st.fb='';if(st.k>=Q.length){s2Send(st,{ok:st.bad<=2,ms:Math.round(st.sum+800*st.bad)});return;}st.wait=false;st.at=s2Now();render();}
GAMES.s_shape=s2Base({name:'طابق الشكل',cls:'s2sh',lbc:'#B03A6B',rank:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C2457A"/><rect x="8" y="22" width="40" height="56" rx="10" fill="#fff" opacity=".18"/><rect x="52" y="22" width="40" height="56" rx="10" fill="#fff" opacity=".18"/>${[[0,0],[1,0],[2,0],[2,1]].map(([x,y])=>`<rect x="${14+x*9}" y="${38+y*9}" width="8" height="8" rx="2" fill="#FFE07A"/>`).join('')}${[[0,0],[0,1],[0,2],[1,0]].map(([x,y])=>`<rect x="${64+x*9}" y="${32+y*9}" width="8" height="8" rx="2" fill="#FFE07A"/>`).join('')}<text x="50" y="94" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">؟ =</text></svg>`,
  title:'شكلين جنب بعض: هل الثاني هو نفس الأول بس ملفوف؟ ولا مقلوب بالمراية فهو مختلف؟',
  tip:d=>`${S2SN} أزواج، كل شكل ${d.rd<2?5:d.rd<4?6:7} مربعات`,
  legend:'الوقت = مجموع ردودك، وكل غلط يزيد 0.8 ثانية',
  bot(d,s,lv){const Q=s2shQ(d);let sum=0,bad=0;for(const x of Q){sum+=[0,2300,1650,1150][lv]+(x.r%2?[0,450,280,160][lv]:0)+d.rd*[0,150,100,60][lv]+rnd([0,1300,800,500][lv]);if(Math.random()<[0,.15,.08,.03][lv])bad++;}return {ok:bad<=2,ms:Math.round(sum+800*bad)};},
  start(d,st){const Q=s2shQ(d);st.k=-1;st.sum=0;st.bad=0;st.wait=true;st.fb='';s2T(st,700,st=>s2shNext(st,Q));},
  view(d,ctx,st){const Q=s2shQ(d),x=st.k>=0&&!st.wait?Q[st.k]:null;
    return `<div class="s2sh-top"><span>${Math.max(1,Math.min(st.k+1,S2SN))} من ${S2SN}</span>${st.bad?`<i>✗ ${st.bad}</i>`:''}</div>
      <div class="s2sh-pr ${st.fb}">${x?`<div class="s2sh-a" id="s2sha${st.k}">${s2shSvg(x.p,S2SC[x.c])}</div><div class="s2sh-b" id="s2shb${st.k}">${s2shSvg(x.q,S2SC[x.c])}</div>`:`<div class="s2sh-m">${st.k<0?'استعد…':st.fb==='ok'?'✓':'✗'}</div>`}</div>
      <div class="s2sh-k"><button class="s2sh-y" data-ga="ans" data-i="1"><b>✓</b>نفس الشكل</button><button class="s2sh-n" data-ga="ans" data-i="0"><b>✗</b>مختلف</button></div>`;},
  click(a,i,d,ctx,st){if(a!=='ans'||st.wait||st.k<0)return;const Q=s2shQ(d),x=Q[st.k];if(!x)return;
    st.sum+=s2Now()-st.at;st.wait=true;if((i===1)===x.same)st.fb='ok';else{st.fb='bad';st.bad++;try{sfx('lose');}catch(e){}}render();s2T(st,300,st=>s2shNext(st,Q));}});
HELP.s_shape='يطلع لك شكلين من مربعات. إذا الثاني هو نفس الأول بس ملفوف (ربع لفة أو نص لفة أو بدون لف) اضغط «نفس الشكل»، وإذا هو صورته في المراية فاضغط «مختلف»، لأن المقلوب ما يرجع مثل الأصل مهما لفيته. ثمان أزواج في الجولة، والأشكال تكبر كل جولتين. وقتك مجموع ردودك وكل غلط يزيده 0.8 ثانية، وأكثر من غلطتين تطلعك من الجولة. الأسرع ياخذ نقطتين وكل واحد ضبط ياخذ نقطة، وبعد خمس جولات اللي نقاطه أكثر يفوز.';

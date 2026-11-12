'use strict';
/* party games, everyone at once: categories, majority, closest guess, true or false, scramble, odd one out */

const normAr=t=>String(t||'').trim().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ');

/* ---------- categories ---------- */
const CATF=['إنسان','حيوان','نبات','جماد','بلاد'];
const CATL='ابتجحخدرزسشصطعفقكلمنهوي';
const catOk=(w,L)=>{w=normAr(w);if(!w)return false;if(w.startsWith('ال')&&w.length>2&&w[2]===L)return true;return w[0]===L;};
GAMES.cats={name:'إنسان حيوان جماد',cat:'quiz',lbc:'#8A5A2B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B7834F"/><rect x="16" y="14" width="68" height="72" rx="8" fill="#FFF7E8"/>${[0,1,2,3,4].map(k=>`<path d="M26 ${28+k*12}H74" stroke="#C9B08A" stroke-width="2"/>`).join('')}<circle cx="74" cy="22" r="13" fill="#EC6158"/><text x="74" y="28" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">م</text></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',prev:null,rounds:5,L:CATL[rnd(CATL.length)]}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)+`<br><small>جولة ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. الجواب لحاله 10، والمكرر 5</small><br>`),
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){let s='';
    if(d.prev){s+=`<div class="panel" style="width:100%;overflow:auto;padding:10px"><b>أجوبة حرف «${d.prev.L}»</b><table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:6px"><tr><td></td>${CATF.map(c=>`<th>${c}</th>`).join('')}</tr>${d.prev.a.map((row,si)=>row?`<tr><td style="color:${col(d,si)};font-weight:800">${nm(d,si)}</td>${row.map((w,k)=>`<td style="text-align:center;${d.prev.p[si][k]?'':'color:#c0392b;text-decoration:line-through'}">${esc(w)||'·'}<br><small>${d.prev.p[si][k]}</small></td>`).join('')}</tr>`:'').join('')}</table></div>`;}
    if(d.win!=null)return s;
    s+=pickedChips(d)+`<div class="qbox">الحرف: <span style="font-size:40px;color:var(--red)">${d.L}</span></div>`;
    if(ctx.my){s+=CATF.map((c,k)=>`<label style="display:block;width:100%;max-width:420px;margin:4px auto;font-weight:700">${c}<input class="code" style="font-size:20px;letter-spacing:0;text-align:right;direction:rtl;margin-top:2px" data-draft="c${k}" value="${esc((S.draft||{})['c'+k]||'')}" autocomplete="off"></label>`).join('')+`<button class="big red" style="max-width:420px;margin:12px auto" data-ga="go">خلصت</button>`;}
    return s;},
  click(a,i,d,ctx){if(!ctx.my)return;const ans=CATF.map((c,k)=>String((S.draft||{})['c'+k]||'').trim().slice(0,30));S.draft={};simulPick(d,ctx.v,ans);},
  resolve(d,picks){const L=d.L;const pts=[...d.pts];const n=d.pl.length;const got=picks.map(()=>Array(5).fill(0));
    for(let k=0;k<5;k++){const cnt={};picks.forEach(a=>{if(a&&catOk(a[k],L)){const w=normAr(a[k]).replace(/^ال/,'');cnt[w]=(cnt[w]||0)+1;}});
      picks.forEach((a,s)=>{if(a&&catOk(a[k],L)){const w=normAr(a[k]).replace(/^ال/,'');got[s][k]=cnt[w]>1?5:10;}});}
    got.forEach((g,s)=>pts[s]+=g.reduce((x,y)=>x+y,0));
    const rd=d.rd+1;const nL=CATL.replace(L,'');
    return {...d,pts,rd,prev:{L,a:picks,p:got},res:`انتهت جولة حرف «${L}»`,L:nL[rnd(nL.length)],win:rd>=d.rounds?mostPts(pts):null};}
};
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- majority ---------- */
const WYR=[['قهوة','شاي'],['البحر','البر'],['الصيف','الشتاء'],['كبسة','مندي'],['قطط','كلاب'],['السفر بالطيارة','السفر بالسيارة'],['تصحى بدري','تسهر'],['كرة القدم','كرة السلة'],['المدينة','القرية'],['الجبل','الصحراء'],['برجر','بيتزا'],['فيلم','مسلسل'],['رسالة صوتية','رسالة مكتوبة'],['آيفون','أندرويد'],['كتاب ورقي','كتاب إلكتروني'],['حلا','موالح'],['مطعم','أكل البيت'],['سباحة','ركض'],['تعرف المستقبل','ترجع للماضي'],['تطير','تختفي'],['تمر','شوكولاتة'],['رحلة بحرية','رحلة برية'],['كشتة','سفر'],['عصير برتقال','ليمون بالنعناع'],['ألعاب جماعية','ألعاب فردية']];
GAMES.major={name:'لو خيروك',cat:'quiz',lbc:'#2F7F86',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3FA2AA"/><rect x="10" y="30" width="36" height="40" rx="10" fill="#fff"/><rect x="54" y="30" width="36" height="40" rx="10" fill="#FFD84D"/><text x="50" y="58" font-size="16" font-weight="800" fill="#2D4763" text-anchor="middle">أو</text></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',rounds:8}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)+`<br><small>سؤال ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. اللي مع الأغلبية ياخذون نقطة</small><br>`),
  winExtra:d=>d.res,
  q(d,rd){const R=srng(d,'w');const ord=[...WYR.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}return WYR[ord[rd%ord.length]];},
  render(d,ctx){if(d.win!=null)return '';const Q=this.q(d,d.rd);
    return pickedChips(d)+`<div class="qbox">لو خيروك؟</div><div class="row">${Q.map((t,k)=>`<button class="big ${k?'blue':'red'}" style="width:auto;min-width:140px;margin:0" data-ga="m" data-i="${k}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`;},
  click(a,k,d,ctx){if(!ctx.my)return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const Q=this.q(d,d.rd);const c=[0,0];picks.forEach(p=>{if(p!=null)c[p]++;});const pts=[...d.pts];
    const maj=c[0]===c[1]?-1:c[0]>c[1]?0:1;if(maj>=0)picks.forEach((p,s)=>{if(p===maj)pts[s]++;});
    const rd=d.rd+1;return {...d,pts,rd,res:`${Q[0]} ${c[0]}، ${Q[1]} ${c[1]}. ${maj<0?'تعادل، محد أخذ نقطة':'الأغلبية اختارت '+Q[maj]}`,win:rd>=d.rounds?mostPts(pts):null};}
};

/* ---------- closest guess ---------- */
const CLOSE=[['كم عدد الدول الأعضاء في جامعة الدول العربية؟',22],['كم عظمة في جسم الإنسان البالغ؟',206],['كم ارتفاع برج خليفة بالمتر تقريبًا؟',828],['كم دولة في قارة أفريقيا؟',54],['كم يوم في السنة الهجرية تقريبًا؟',354],['كم مفتاح في البيانو القياسي؟',88],['كم كوكب في المجموعة الشمسية؟',8],['في أي سنة ميلادية توحدت المملكة العربية السعودية باسمها الحالي؟',1932],['كم درجة حرارة جسم الإنسان الطبيعية بالمئوية تقريبًا؟',37],['كم عنصر في الجدول الدوري؟',118],['كم دقيقة في اليوم؟',1440],['كم ثانية في الساعة؟',3600],['كم عدد حروف اللغة العربية؟',28],['كم سن لبني عند الطفل؟',20],['كم مربع في رقعة الشطرنج؟',64],['في أي سنة هبط الإنسان على القمر أول مرة؟',1969],['كم قلب للأخطبوط؟',3],['كم سرعة الصوت في الهواء بالمتر في الثانية تقريبًا؟',343],['كم يوم في السنة الميلادية العادية؟',365],['كم سورة في القرآن الكريم؟',114],['كم كيلومتر قطر الأرض تقريبًا؟',12742],['كم ساعة في الأسبوع؟',168]];
GAMES.close={name:'أقرب تخمين',cat:'quiz',lbc:'#6A4C93',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8B6BBE"/><circle cx="50" cy="50" r="34" fill="#fff"/><circle cx="50" cy="50" r="23" fill="#EC6158"/><circle cx="50" cy="50" r="12" fill="#fff"/><circle cx="50" cy="50" r="5" fill="#EC6158"/></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',rounds:8}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)+`<br><small>سؤال ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. الأقرب للجواب ياخذ نقطة</small><br>`),
  winExtra:d=>d.res,
  q(d,rd){const R=srng(d,'cl');const ord=[...CLOSE.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}return CLOSE[ord[rd%ord.length]];},
  render(d,ctx){if(d.win!=null)return '';const Q=this.q(d,d.rd);
    return pickedChips(d)+`<div class="qbox">${Q[0]}</div>`+(ctx.my?`<input class="code" inputmode="numeric" style="max-width:260px;letter-spacing:2px" data-draft="n" value="${esc((S.draft||{}).n||'')}" placeholder="رقمك" autocomplete="off"><button class="big red" style="max-width:260px;margin:12px auto" data-ga="go">أرسل</button>`:'');},
  click(a,i,d,ctx){if(!ctx.my)return;const v=parseFloat(String((S.draft||{}).n||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)));if(!isFinite(v)){toast('اكتب رقم');return;}S.draft={};simulPick(d,ctx.v,v);},
  resolve(d,picks){const Q=this.q(d,d.rd);const diff=picks.map(p=>p==null?Infinity:Math.abs(p-Q[1]));const mn=Math.min(...diff);const pts=[...d.pts];const w=[];
    diff.forEach((x,s)=>{if(x===mn&&isFinite(x)){pts[s]++;w.push(nm(d,s));}});
    const rd=d.rd+1;return {...d,pts,rd,res:`${Q[0]} الجواب ${Q[1]}. `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+`. الأقرب: ${w.join('، ')}`,win:rd>=d.rounds?mostPts(pts):null};}
};

/* ---------- true or false ---------- */
const TF=[['الشمس نجم',1],['القمر يضيء بنفسه',0],['الحوت من الأسماك',0],['الماء يغلي عند 100 درجة مئوية عند سطح البحر',1],['الخفاش من الطيور',0],['النعامة تطير',0],['المريخ أكبر من الأرض',0],['الذهب معدن',1],['العنكبوت حشرة',0],['البطريق طائر',1],['سور الصين العظيم يقع في اليابان',0],['الدلفين يتنفس بالرئة',1],['الطماطم تصنف نباتيًا كثمرة',1],['المحيط الأطلسي أكبر محيط في العالم',0],['الضوء أسرع من الصوت',1],['للأخطبوط ثلاثة قلوب',1],['الإبل تخزن الماء في سنامها',0],['رقبة الزرافة فيها 7 فقرات',1],['الجزائر أكبر دولة في أفريقيا مساحة',1],['نهر الأمازون يقع في أفريقيا',0],['الألماس من أصلب المواد الطبيعية',1],['النحل يصنع العسل من رحيق الأزهار',1],['الثعابين لها جفون',0],['كيلو الحديد أثقل من كيلو القطن',0],['الفيل أكبر حيوان بري',1],['الأرض أقرب كوكب للشمس',0],['الكوالا نوع من الدببة',0],['الثلج يطفو فوق الماء',1],['الصوت ينتقل في الفراغ',0],['النباتات تطلق الأكسجين',1],['شهر فبراير دائمًا 28 يوم',0],['الكويت تطل على الخليج العربي',1],['القطط تتذوق الطعم الحلو',0],['البرق أسخن من سطح الشمس',1],['الإنسان البالغ عنده 32 سن عادة',1],['الأسد يعيش في القطب الشمالي',0],['المشتري أكبر كواكب المجموعة الشمسية',1],['الدم في عروق الإنسان لونه أزرق',0]];
GAMES.tf=makeQuiz({name:'صح أو خطأ',lbc:'#2E8B57',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3BA56A"/><circle cx="32" cy="50" r="20" fill="#fff"/><path d="M23 50l7 7 12-14" stroke="#2E8B57" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="68" cy="50" r="20" fill="#fff"/><path d="M61 43l14 14M75 43L61 57" stroke="#D43C33" stroke-width="6" stroke-linecap="round"/></svg>`,
  gen(d,rd){const R=srng(d,'tf');const ord=[...TF.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}const [q,t]=TF[ord[rd%ord.length]];return {q,o:['صح ✓','خطأ ✗'],a:t?0:1};}});

/* ---------- scramble ---------- */
const ALLW=Object.values(WORDS).flat().filter(w=>w.length>=3);
GAMES.scr=makeQuiz({name:'رتّب الحروف',lbc:'#B5651D',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D98236"/>${['ق','ل','م'].map((c,k)=>`<rect x="${14+k*26}" y="${30+(k%2)*14}" width="22" height="26" rx="5" fill="#fff" transform="rotate(${(k-1)*12} ${25+k*26} ${43+(k%2)*14})"/><text x="${25+k*26}" y="${50+(k%2)*14}" font-size="18" font-weight="800" fill="#2D4763" text-anchor="middle">${c}</text>`).join('')}</svg>`,
  gen(d,rd){const R=srng(d,'sc'+rd);const w=ALLW[Math.floor(R()*ALLW.length)];let a=[...w];for(let t=0;t<10;t++){for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}if(a.join('')!==w)break;}
    const wr=new Set();let g=0;while(wr.size<3&&g++<500){const x=ALLW[Math.floor(R()*ALLW.length)];if(x!==w&&Math.abs(x.length-w.length)<=1)wr.add(x);}
    while(wr.size<3){const x=ALLW[Math.floor(R()*ALLW.length)];if(x!==w)wr.add(x);}
    return {rq:'رتّب الحروف:',q:`<div class="wordbox">${a.map(c=>`<div class="wl">${c}</div>`).join('')}</div>وش الكلمة؟`,...withOptions(R,w,[...wr])};}});

/* ---------- odd one out ---------- */
const ODD=[['🍎','🍌','🍇','🍉','🍓','🍍','🍒','🍑'],['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🦁'],['🚗','🚕','🚌','🚑','🚒','🚓','🚜','🚲'],['⚽','🏀','🏈','⚾','🎾','🏐','🏓'],['☀️','🌧️','⛈️','❄️','🌈','☁️'],['🐟','🐠','🐡','🦈','🐙','🦀','🐬','🐳'],['🎸','🎹','🥁','🎺','🎻','🎷']];
GAMES.odd=makeQuiz({name:'مين المختلف',lbc:'#C0507A',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#DD6E98"/><text x="30" y="44" font-size="26" text-anchor="middle">🍎</text><text x="70" y="44" font-size="26" text-anchor="middle">🍌</text><text x="30" y="80" font-size="26" text-anchor="middle">🍇</text><text x="70" y="80" font-size="26" text-anchor="middle">🚗</text></svg>`,
  gen(d,rd){const R=srng(d,'od'+rd);const a=Math.floor(R()*ODD.length);let b=Math.floor(R()*(ODD.length-1));if(b>=a)b++;
    const g=[...ODD[a]];for(let i=g.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[g[i],g[j]]=[g[j],g[i]];}const x=ODD[b][Math.floor(R()*ODD[b].length)];
    const o=withOptions(R,x,g.slice(0,3));return {q:'أي واحد مختلف عن الباقين؟',o:o.o,a:o.a,big:true};}});

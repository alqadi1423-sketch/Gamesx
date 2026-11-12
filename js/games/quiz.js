'use strict';
/* everyone answers at the same time: rock paper scissors, general knowledge, quick maths, capitals */

const simulViewer=d=>{if(d.win!=null)return null;for(let s=0;s<d.pl.length;s++)if(d.out[s]!=='1'&&!hasPicked(d,s))return s;return null;};
const srng=(d,k)=>mulberry(seedOf(d.gid+'#'+k));
const pickedChips=d=>`<div class="picks">${d.pl.map((r,s)=>d.out[s]==='1'?'':`<span class="chip" style="background:${col(d,s)};opacity:${hasPicked(d,s)?1:.4}">${nm(d,s)} ${hasPicked(d,s)?'✓':'…'}</span>`).join('')}</div>`;
function simulStatus(d,ctx,extra){
  if(d.win!=null)return '';
  const me=ctx.local?ctx.v:ctx.v;let s=(d.res?`<small>${d.res}</small><br>`:'')+(extra||'');
  if(!ctx.local&&me>=0)s+=hasPicked(d,me)?'<b>اخترت، ننتظر الباقين</b>':'<b>اختر جوابك</b>';
  else if(ctx.local&&me!=null)s+=`دور ${nameTag(d,me)} يختار`;
  return s;
}

/* ---------- rock paper scissors ---------- */
const RPS=['✊','✋','✌️'],RPSN=['حجرة','ورقة','مقص'];
GAMES.rps={name:'حجرة ورقة مقص',cat:'quiz',lbc:'#C76A2A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#EE8A3C"/><text x="28" y="48" font-size="30" text-anchor="middle">✊</text><text x="72" y="48" font-size="30" text-anchor="middle">✋</text><text x="50" y="84" font-size="30" text-anchor="middle">✌️</text></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',goal:5}),
  viewer:simulViewer,coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)+`<br><small>كل لاعب تغلبه تاخذ عليه نقطة، أول واحد يوصل ${d.goal} يفوز</small><br>`),
  winExtra:d=>d.res,
  render(d,ctx){return pickedChips(d)+`<div class="row">${RPS.map((e,k)=>`<button class="big" style="width:96px;margin:0;background:#fff;color:var(--ink);font-size:44px" data-ga="m" data-i="${k}" ${ctx.my?'':'disabled'}>${e}<small style="color:var(--ink)">${RPSN[k]}</small></button>`).join('')}</div>`;},
  click(a,k,d,ctx){if(!ctx.my)return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const pts=[...d.pts];const got=Array(d.pl.length).fill(0);
    for(let a=0;a<picks.length;a++)for(let b=0;b<picks.length;b++){if(picks[a]==null||picks[b]==null)continue;if((picks[a]+2)%3===picks[b])got[a]++;}
    got.forEach((g,s)=>pts[s]+=g);
    const res=d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${RPS[picks[s]]}${got[s]?` +${got[s]}`:''}`).filter(Boolean).join('، ');
    const mx=Math.max(...pts);let win=null;if(mx>=d.goal){const top=pts.map((x,s)=>x===mx?s:-1).filter(s=>s>=0);if(top.length===1)win=top[0];}
    return {...d,pts,rd:d.rd+1,res,win};}
};

/* ---------- quiz factory ---------- */
const ROUNDS=10;
function makeQuiz(o){return {name:o.name,cat:'quiz',lbc:o.lbc,icon:o.icon,
  init:n=>({rd:0,pts:Array(n).fill(0),res:''}),
  viewer:simulViewer,coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)+`<br><small>سؤال ${Math.min(d.rd+1,ROUNDS)} من ${ROUNDS}</small><br>`),
  winExtra:d=>d.res+'<br>النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){if(d.win!=null)return '';const Q=o.gen(d,d.rd);
    return pickedChips(d)+`<div class="qbox">${Q.q}</div>${Q.o.map((t,k)=>`<button class="opt" data-ga="m" data-i="${k}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}`;},
  click(a,k,d,ctx){if(!ctx.my)return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const Q=o.gen(d,d.rd);const pts=[...d.pts];const ok=[];
    picks.forEach((p,s)=>{if(p===Q.a){pts[s]++;ok.push(nm(d,s));}});
    const res=`${Q.q} الجواب: ${Q.o[Q.a]}. ${ok.length?'جاوب صح: '+ok.join('، '):'محد جاوب صح'}`;
    const rd=d.rd+1;return {...d,pts,rd,res,win:rd>=ROUNDS?mostPts(pts):null};}
};}
function withOptions(R,right,wrongs){const opts=[right,...wrongs];for(let i=opts.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}return {o:opts,a:opts.indexOf(right)};}

const TRIVIA=[
['أكبر كوكب في المجموعة الشمسية؟','المشتري',['زحل','الأرض','نبتون']],
['كم يوم في السنة الكبيسة؟','366',['365','364','360']],
['أطول نهر في قارة أفريقيا؟','النيل',['الكونغو','النيجر','الزمبيزي']],
['كم عدد ألوان قوس قزح المعروفة؟','7',['5','6','8']],
['أي غاز تمتصه النباتات في عملية البناء الضوئي؟','ثاني أكسيد الكربون',['الأكسجين','النيتروجين','الهيليوم']],
['أكبر محيط في العالم؟','المحيط الهادي',['المحيط الأطلسي','المحيط الهندي','المحيط المتجمد الشمالي']],
['أسرع حيوان بري؟','الفهد',['الأسد','الغزال','الحصان']],
['درجة غليان الماء عند سطح البحر بالمئوية؟','100',['90','80','120']],
['أكبر دولة عربية مساحة؟','الجزائر',['السعودية','السودان','مصر']],
['أقرب كوكب إلى الشمس؟','عطارد',['الزهرة','المريخ','الأرض']],
['كم لاعب لكل فريق داخل ملعب كرة القدم؟','11',['10','9','12']],
['أكبر عضو في جسم الإنسان؟','الجلد',['الكبد','القلب','الرئة']],
['ما عملة اليابان؟','الين',['اليوان','الوون','الروبية']],
['كم عدد سور القرآن الكريم؟','114',['110','120','112']],
['أطول سورة في القرآن الكريم؟','البقرة',['آل عمران','النساء','المائدة']],
['أي كوكب يسمى الكوكب الأحمر؟','المريخ',['المشتري','زحل','عطارد']],
['كم رجل للعنكبوت؟','8',['6','10','12']],
['أعلى جبل في العالم؟','إيفرست',['كليمنجارو','مون بلان','كي 2']],
['أصغر عدد أولي؟','2',['1','3','0']],
['في أي قارة تقع البرازيل؟','أمريكا الجنوبية',['أفريقيا','أوروبا','أمريكا الشمالية']],
['أي حيوان يلقب بسفينة الصحراء؟','الجمل',['الحصان','الفيل','الحمار']],
['كم عدد أسنان الإنسان البالغ عادة؟','32',['28','30','36']],
['أي معدن يكون سائلًا في حرارة الغرفة؟','الزئبق',['الحديد','الرصاص','النحاس']],
['أول شهر في السنة الهجرية؟','محرم',['رمضان','صفر','رجب']],
['كم ركعة في صلاة الفجر؟','2',['3','4','1']],
['الماء يتكون من الهيدروجين و…؟','الأكسجين',['النيتروجين','الكربون','الهيليوم']],
['أكبر صحراء حارة في العالم؟','الصحراء الكبرى',['الربع الخالي','صحراء غوبي','صحراء كالاهاري']],
['أكبر حيوان على وجه الأرض؟','الحوت الأزرق',['الفيل الأفريقي','الزرافة','القرش الأبيض']],
['في أي مدينة يقع برج إيفل؟','باريس',['لندن','روما','مدريد']],
['أين تقع أهرامات خوفو وخفرع ومنقرع؟','الجيزة',['الأقصر','أسوان','الإسكندرية']],
['أي كوكب مشهور بحلقاته الواضحة؟','زحل',['المريخ','عطارد','الزهرة']],
['كم لاعب لكل فريق داخل ملعب كرة السلة؟','5',['6','7','4']],
['أكبر طائر في العالم؟','النعامة',['البطريق','النسر','الطاووس']],
['كم ناتج 7 × 8؟','56',['54','48','64']],
['أصغر قارة في العالم؟','أستراليا',['أوروبا','أنتاركتيكا','أمريكا الجنوبية']],
['بأي وحدة تقاس شدة التيار الكهربائي؟','الأمبير',['الفولت','الواط','الأوم']],
['أي عضو يضخ الدم في الجسم؟','القلب',['الكبد','الرئة','الكلية']],
['كم جناح للنحلة؟','4',['2','6','8']],
['في أي مدينة يقع المسجد النبوي؟','المدينة المنورة',['مكة المكرمة','الطائف','القدس']],
['أي دولة تظهر ورقة القيقب على علمها؟','كندا',['أمريكا','السويد','النرويج']],
['أكثر غاز موجود في الغلاف الجوي للأرض؟','النيتروجين',['الأكسجين','ثاني أكسيد الكربون','الأرجون']],
['كم ضلع للشكل السداسي؟','6',['5','7','8']],
['كم دقيقة في الساعة؟','60',['100','50','30']],
['أي حاسة مرتبطة بالأنف؟','الشم',['التذوق','السمع','اللمس']],
['كم شهر في السنة؟','12',['10','11','13']],
['ما عاصمة المملكة العربية السعودية؟','الرياض',['جدة','مكة المكرمة','الدمام']],
['أي فصل يأتي بعد الشتاء؟','الربيع',['الصيف','الخريف','الشتاء']],
['كم عدد أركان الإسلام؟','5',['4','6','7']],
['أي هذه من الثدييات؟','الدلفين',['القرش','السلمون','التونة']],
['ما الشكل اللي له 4 أضلاع متساوية و4 زوايا قائمة؟','المربع',['المستطيل','المعين','شبه المنحرف']]
];
GAMES.trivia=makeQuiz({name:'مسابقة المعلومات',lbc:'#2E7D9A',icon:iconE('#3FA3C6','💡'),
  gen(d,rd){const R=srng(d,'order');const ord=[...TRIVIA.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}
    const [q,right,wr]=TRIVIA[ord[rd%ord.length]];return {q,...withOptions(srng(d,rd),right,wr)};}});

GAMES.math=makeQuiz({name:'سباق الحساب',lbc:'#3B6E2F',icon:iconE('#5C9E4A','➗'),
  gen(d,rd){const R=srng(d,'m'+rd);const op=Math.floor(R()*3);let a,b,ans,q;
    if(op===0){a=10+Math.floor(R()*90);b=10+Math.floor(R()*90);ans=a+b;q=`${a} + ${b}`;}
    else if(op===1){a=20+Math.floor(R()*80);b=1+Math.floor(R()*a);ans=a-b;q=`${a} − ${b}`;}
    else{a=2+Math.floor(R()*11);b=2+Math.floor(R()*11);ans=a*b;q=`${a} × ${b}`;}
    const w=new Set();const del=[1,2,10,-1,-2,-10,3,-3,11,9];while(w.size<3){const x=ans+del[Math.floor(R()*del.length)];if(x!==ans&&x>=0)w.add(x);}
    return {q:`<span dir="ltr">${q} = ؟</span>`,...withOptions(R,String(ans),[...w].map(String))};}});

const CAPS=[['السعودية','الرياض'],['مصر','القاهرة'],['الأردن','عمّان'],['الإمارات','أبوظبي'],['قطر','الدوحة'],['البحرين','المنامة'],['عُمان','مسقط'],['اليمن','صنعاء'],['العراق','بغداد'],['سوريا','دمشق'],['لبنان','بيروت'],['السودان','الخرطوم'],['ليبيا','طرابلس'],['المغرب','الرباط'],['موريتانيا','نواكشوط'],['الصومال','مقديشو'],['تركيا','أنقرة'],['إيران','طهران'],['باكستان','إسلام آباد'],['أفغانستان','كابل'],['الهند','نيودلهي'],['الصين','بكين'],['اليابان','طوكيو'],['كوريا الجنوبية','سيول'],['ماليزيا','كوالالمبور'],['تايلاند','بانكوك'],['الفلبين','مانيلا'],['فرنسا','باريس'],['ألمانيا','برلين'],['إيطاليا','روما'],['إسبانيا','مدريد'],['بريطانيا','لندن'],['روسيا','موسكو'],['أمريكا','واشنطن'],['كندا','أوتاوا'],['البرازيل','برازيليا'],['الأرجنتين','بوينس آيرس'],['أستراليا','كانبرا'],['نيجيريا','أبوجا'],['كينيا','نيروبي'],['إثيوبيا','أديس أبابا'],['اليونان','أثينا'],['السويد','ستوكهولم'],['النرويج','أوسلو'],['البرتغال','لشبونة'],['سويسرا','برن'],['النمسا','فيينا'],['بلجيكا','بروكسل'],['بولندا','وارسو']];
GAMES.caps=makeQuiz({name:'عواصم الدول',lbc:'#7A3E9D',icon:iconE('#9B5BC2','🌍'),
  gen(d,rd){const R=srng(d,'caps');const ord=[...CAPS.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}
    const k=ord[rd%ord.length];const R2=srng(d,'c'+rd);const w=new Set();while(w.size<3){const x=Math.floor(R2()*CAPS.length);if(x!==k)w.add(CAPS[x][1]);}
    return {q:`ما عاصمة ${CAPS[k][0]}؟`,...withOptions(R2,CAPS[k][1],[...w])};}});

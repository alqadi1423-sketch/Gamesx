'use strict';
/* ألعاب الجمعات (2), part one: تمثيل صامت، الكلمات الممنوعة، عشرين سؤال، البطاطا الحارة، مين أنا، ربط الكلمات.
   Shared helpers and word lists for both n-party2 files live here. */

/* ---------- shared helpers ---------- */
// text a player typed: no markup characters, one line, short
const p2T=(t,n)=>String(t==null?'':t).replace(/[<>"&'`\\{}~]/g,'').replace(/\s+/g,' ').trim().slice(0,n||40);
// spelling-tolerant form: hamza, ta marbuta, alef maqsura, «ال» and spaces do not matter
const p2N=t=>String(t||'').replace(/[ً-ْـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
  .replace(/[^ء-يa-z0-9 ]/gi,' ').replace(/\s+/g,' ').trim().split(' ').map(x=>x.length>3&&x.startsWith('ال')?x.slice(2):x).join('');
function p2Lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=[...Array(n+1).keys()];
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
// 2 = right, 1 = close, 0 = wrong
function p2Match(alts,g){g=p2N(g);if(!g)return 0;let best=9;for(const a of alts){const x=p2N(a);if(x===g)return 2;best=Math.min(best,p2Lev(x,g));}return best<=(g.length<=4?1:2)?1:0;}
// what this phone already drew in the session: a card does not come back until the whole list was used
const P2M={};
function p2Fresh(key,n,avoid){const m=P2M[key]||(P2M[key]=new Set());const bad=new Set(avoid||[]);let ok=[...Array(n).keys()].filter(i=>!m.has(i)&&!bad.has(i));
  if(!ok.length){m.clear();ok=[...Array(n).keys()].filter(i=>!bad.has(i));}if(!ok.length)ok=[...Array(n).keys()];const i=ok[rnd(ok.length)];m.add(i);return i;}
const p2Sh=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const p2Pick=a=>a[rnd(a.length)];
const p2Me=(ctx)=>ctx.v!=null&&ctx.v>=0?ctx.v:-1;
// a seat may act for itself; on one phone without bots the screen belongs to whoever holds it
const p2Can=(ctx,s)=>ctx.local||ctx.v===s;
const p2Lv=(d,s)=>botLv(d,s);
// player tiles: o={v,can(s),ga,badge(s),sub(s),cls(s)}
function p2Tiles(d,o){return `<div class="p2-pl n${d.pl.length}">${d.pl.map((r,s)=>{const ok=!!(o.can&&o.can(s));const t=ok?'button':'div';
  return `<${t} class="p2-pt ${d.out[s]==='1'?'out':''} ${ok?'can':''} ${s===o.v?'me':''} ${o.cls?o.cls(s):''}" style="--c:${COLS[r]}" ${ok?`data-ga="${o.ga}" data-i="${s}"`:''}><i>${shapeW(r)}${o.badge?o.badge(s):''}</i><span>${nm(d,s)}</span>${o.sub?`<em>${o.sub(s)}</em>`:''}</${t}>`;}).join('')}</div>`;}
// a countdown: the seconds and the bar follow the clock (updated twice a second below, never by an animation)
const p2Left=(end)=>Math.max(0,Math.ceil((end-Date.now())/1000));
function p2Clock(end,T,cls){const l=Math.max(0,(end-Date.now())/1000);const f=T>0?Math.min(1,l/T):0;
  return `<div class="p2-clk ${cls||''} ${l<=10?'low':''}" data-p2end="${end}" data-p2t="${T}"><b>${Math.ceil(l)}</b><span><i style="transform:scaleX(${f.toFixed(3)})"></i></span></div>`;}
setInterval(()=>{if(!S.st.g||String(S.st.g).slice(0,2)!=='p_')return;for(const e of document.querySelectorAll('[data-p2end]')){const end=+e.dataset.p2end,T=+e.dataset.p2t;
  const l=Math.max(0,(end-Date.now())/1000);const b=e.querySelector('b'),i=e.querySelector('i');const t=String(Math.ceil(l));if(b&&b.textContent!==t)b.textContent=t;
  if(i&&T>0)i.style.transform=`scaleX(${Math.min(1,l/T).toFixed(3)})`;e.classList.toggle('low',l<=10);}},500);
// answer chips for yes / no / sometimes / not sure
const P2A=['لا','نعم','أحيانًا','ما أدري'];
const P2AC=['no','yes','mid','idk'];
const p2Chip=a=>`<b class="p2-ans ${P2AC[a]||'idk'}">${P2A[a]??'…'}</b>`;
// points under the names, and the winner by points (with teams the team totals decide)
const p2Pts=d=>d.pts;
const p2WinX=d=>'النقاط: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، ');

/* ---------- word cards: «word/other spellings|emoji|four words that belong to it|three clues that use none of them» ---------- */
const P2WB={
'أكل وشرب':`قهوة|☕|دلة,فنجان,هيل,بن|نقدمها للضيف أول ما يدخل;تصحّيك الصبح;مرّة شوي ونحطها بالترمس
كبسة/كبسه|🍛|رز,دجاج,لحم,بهارات|أكلة الغدا المشهورة عندنا;تنطبخ بقدر كبير يوم الجمعة;طبق رئيسي بالعزايم
تمر|🌴|نخلة,رطب,سكري,قصيم|نفطر عليه برمضان;ينحط جنب الفنجال;ثمرة حلوة لونها بني
بيتزا|🍕|جبن,عجينة,فرن,إيطاليا|تنقطع مثلثات;تطلبها توصيل للبيت;فوقها صلصة وزيتون
شاي|🍵|إبريق,نعناع,سكر,بيالة|نشربه بعد الغدا;يغلي على النار;أحمر ويتصب وهو حار
عسل|🍯|نحل,حلو,سدر,شمع|ينحط على الفطور مع القشطة;ذهبي ولزج;يقولون فيه شفاء
آيس كريم/ايسكريم/ايس كريم|🍦|بارد,فانيلا,شوكولاتة,صيف|ينذاب بسرعة لو تأخرت عليه;تاكله بالملعقة أو ببسكوتة;الأطفال يركضون ورا سيارته
خبز/عيش|🍞|فرن,عجين,طحين,مخبز|تشتريه كل يوم;تسوي فيه ساندويتش;ينحط على السفرة مع كل أكلة
بيض/بيضة|🥚|دجاج,صفار,قشر,عجة|ينسلق أو ينقلى;ينكسر لو طاح;أكلة فطور مشهورة
شوكولاتة/شوكولاته/شوكلت|🍫|كاكاو,حلو,بني,مكسرات|تذوب بالحر;هدية يحبها الأطفال;تلقاها بالكيك والآيس كريم
برجر/برقر|🍔|لحم,خبز,جبن,مطعم|ساندويتش دائري;ينطلب مع بطاطس ومشروب;تاكله بيدينك
مندي|🍖|رز,لحم,حفرة,دخان|ينطبخ تحت الأرض;تشمّ ريحته من بعيد;أكلة الغدا بالعزايم`,
'حيوانات':`جمل/بعير|🐪|سنام,صحراء,ناقة,حليب|نركبه بالبر من زمان;يتحمل العطش أيام;نسوي له سباقات ومزاين
أسد|🦁|غابة,ملك,زئير,لبوة|حيوان مفترس شعره كثيف حول راسه;يسمونه سيد الحيوانات;تلقاه بحديقة الحيوان ورا قضبان
قطة/قطوة/بسة|🐱|مواء,فأر,شوارب,أليف|حيوان صغير نربيه بالبيت;تحب تنام بالشمس;تلحس يدها وتنظف نفسها
فيل|🐘|خرطوم,ضخم,ناب,أفريقيا|أكبر حيوان يمشي على الأرض;أذانه كبيرة مثل المراوح;يقولون ما ينسى أبد
حصان/خيل|🐴|سباق,فارس,سرج,صهيل|نركبه ويجري بسرعة;ياكل شعير;له ذيل طويل وشعر على رقبته
صقر/شاهين|🦅|يطير,مقناص,منقار,ريش|نصطاد فيه بالبر;يلبس برقع على عيونه;غالي وله مزاد خاص
بطريق|🐧|ثلج,بحر,أسود,أبيض|طير ما يقدر يحلق;يمشي يتمايل;يعيش بالقطب الجنوبي
دلفين/دولفين|🐬|بحر,ذكي,سباحة,زعانف|يحب يلعب مع الناس;يقفز من الماء;يتنفس هواء مع إنه يعيش تحت
زرافة|🦒|رقبة,طويلة,بقع,أشجار|أطول حيوان بالعالم;توصل لأعلى الأغصان;لونها أصفر وعليها بني
نحلة|🐝|عسل,لسعة,خلية,زهور|تطير وتطن;تشتغل طول اليوم;صفراء وسوداء ولها شوكة
ثعبان/حية|🐍|سم,زحف,جلد,فحيح|ما له رجول;يبدل ثوبه كل فترة;لسانه مشقوق
سلحفاة/سلحفاه|🐢|بطيئة,درع,قوقعة,أرنب|تشيل بيتها على ظهرها;تعيش سنين طويلة;تدخل راسها لا خافت
بقرة|🐄|حليب,مزرعة,خوار,عجل|ناكل لحمها ونشرب من خيرها;تاكل عشب طول اليوم;لونها أبيض وأسود أحيانًا`,
'أغراض البيت':`ثلاجة/ثلاجه|🧊|بارد,أكل,مطبخ,فريزر|تحفظ فيها الخضار;تفتحها كل شوي وما تلقى شي;صوتها يطن بالليل
مكيف|❄️|بارد,صيف,ريموت,هواء|بدونه الحر ما ينطاق;يشتغل طول الليل;نختلف على درجته
تلفزيون/تلفاز|📺|شاشة,ريموت,قنوات,مسلسل|نجتمع عنده بالليل;نشوف فيه المباريات;معلق على الجدار
سرير|🛏️|نوم,مخدة,بطانية,غرفة|تقعد عليه آخر اليوم;تحته تضيع الأغراض;له فراش ولحاف
مكنسة|🧹|تنظيف,غبار,أرض,كهرباء|تمرها على السجاد;صوتها عالي;تشفط كل شي صغير
مرآة/مراية/مرايه|🪞|انعكاس,وجه,زجاج,تسريحة|تشوف فيها نفسك;تنكسر لو طاحت;تلقاها فوق المغسلة
ساعة/ساعه|⏰|وقت,عقارب,منبه,دقيقة|تقولك متى تطلع;تتعلق بالجدار أو تلبسها;تك تك تك
مخدة/مخده|💤|نوم,راس,ريش,سرير|تحطها تحت خدك;نتضارب فيها وحنا صغار;ناعمة ونفوخة
مفتاح|🔑|باب,قفل,سيارة,ميدالية|يضيع دايم وقت الطلعة;تحطه بجيبك;بدونه ما تدخل البيت
شمعة/شمعه|🕯️|نار,كهرباء,ضوء,ميلاد|نولعها لا طفت الأنوار;تذوب شوي شوي;تنحط على الكيك
مكواة/مكواه|👔|ملابس,كوي,حار,ثوب|تخلي الشماغ مرتب;لا تلمسها وهي شغالة;يطلع منها بخار
جوال/موبايل/جوال|📱|اتصال,شاشة,شاحن,رسايل|ما يفارق يدك;تصور فيه وتكلم أهلك;بطاريته تخلص بسرعة`,
'أماكن':`مدرسة/مدرسه|🏫|طلاب,معلم,فصل,طابور|تروحها الصبح بدري;فيها فسحة ومقصف;تاخذ فيها شهادة آخر السنة
مستشفى|🏥|طبيب,مريض,ممرضة,إسعاف|تروحه لا تعبت;فيه مواعيد وانتظار;ريحته معقمات
مطار|🛫|طيارة,سفر,جواز,بوابة|تودع فيه أهلك;فيه شنط وسيور;تنتظر النداء على رحلتك
مسجد/جامع|🕌|صلاة,إمام,أذان,منارة|نروحه خمس مرات باليوم;نخلع الجزمة عند بابه;فيه سجاد ومصاحف
شاطئ/شاطي|🏖️|رمل,موج,بحر,سباحة|نروحه بالإجازة نتمشى;نبني فيه قلعة;الشمس تغرب عليه
حديقة/حديقه/منتزه|🌳|أشجار,عشب,مراجيح,نزهة|الأطفال يلعبون فيها العصر;نفرش ونجلس على الزرع;نتمشى فيها بالشتاء
مطعم|🍽️|أكل,منيو,جرسون,طاولة|تطلب وتنتظر;تدفع الحساب آخر شي;نروحه بالمناسبات
مول|🛍️|تسوق,محلات,ملابس,تخفيضات|نتمشى فيه نهاية الأسبوع;فيه منطقة ألعاب وسينما;يزحم بالأعياد
ملعب/استاد|🏟️|كورة,جمهور,مباراة,عشب|يتجمع فيه المشجعين;فيه مدرجات;يصفر فيه الحكم
مكتبة/مكتبه|📚|كتب,قراءة,هدوء,رفوف|تستعير منها وترجع;لازم تسكت فيها;فيها قسم للأطفال
صحراء/بر|🏜️|رمل,كثبان,جمل,خيمة|نروحها بالشتاء نكشت;فيها نجوم كثيرة بالليل;حارة بالنهار وباردة بالليل
فندق|🏨|غرفة,سفر,حجز,استقبال|تنام فيه لا سافرت;فيه موظف يعطيك الكرت;تلقى فيه فطور بوفيه`,
'مهن':`طبيب/دكتور|👨‍⚕️|مستشفى,مريض,سماعة,علاج|يكتب لك وصفة;يلبس أبيض;يسألك وش يعورك
معلم/أستاذ/مدرس|👨‍🏫|مدرسة,طلاب,سبورة,درس|يعطيك واجب;يصحح الاختبارات;يشرح قدام الفصل
شرطي/شرطة|👮|أمن,مخالفة,دورية,حرامي|يحمي الناس;ينظم السير بالزحمة;يلبس زي ومعه صفارة
طيار|👨‍✈️|طيارة,سماء,كابتن,مطار|يقعد قدام وما يشوفه الركاب;يسافر كل يوم بلد;يرحب فيكم بالمايك
طباخ/شيف|👨‍🍳|مطبخ,أكل,قدر,قبعة|يذوق قبل لا يقدّم;يلبس مريول أبيض;يشتغل ورا بالمطعم
نجار|🪚|خشب,منشار,مسامير,أبواب|يسوي الدواليب;يقيس ويقص;يستخدم الشاكوش كثير
إطفائي/مطافي|🧑‍🚒|حريق,نار,خرطوم,سلم|يجي بسيارة حمراء;يلبس خوذة;ينقذ الناس من الدخان
مزارع/فلاح|👨‍🌾|مزرعة,نخل,حصاد,تراكتور|يصحى قبل الشمس;يسقي الزرع;يبيع خضاره بالسوق
مصور|📸|كاميرا,صورة,فلاش,لقطة|يقولك ابتسم;يحضر الحفلات والمناسبات;يعدّل على الكمبيوتر
حلاق|💈|شعر,مقص,موس,كرسي|تقعد عنده وتسولف;يرش عليك ماء;يوريك المراية في الأخير
رائد فضاء|👨‍🚀|فضاء,صاروخ,قمر,محطة|يلبس بدلة منفوخة;يطفو لأن ما فيه جاذبية;يشوف الأرض من فوق
مذيع|🎙️|تلفزيون,أخبار,مايك,برنامج|صوته واضح;يقرأ من الشاشة اللي قدامه;يقول أهلًا بكم مشاهدينا`,
'أشياء':`مظلة/شمسية|☂️|مطر,شمس,تنفتح,ظل|تفتحها لا غيمت;تنسى وين حطيتها;لها مقبض معكوف
نظارة/نظاره|👓|عيون,نظر,عدسات,شمسية|تلبسها على خشمك;تساعدك تقرأ;تتغبش لا شربت شي حار
كاميرا|📷|صورة,فلاش,عدسة,مصور|تقولك ابتسم;تحفظ الذكريات;تعلقها على رقبتك بالسفر
بالون/بالونة|🎈|هواء,حفلة,ينفجر,ملون|تنفخه بفمك;يطير لو فلت;يزينون فيه أعياد الميلاد
شنطة/حقيبة|🎒|ظهر,مدرسة,سفر,سحاب|تشيل فيها أغراضك;لها جيوب كثير;تحطها على كتفك
قلم|✏️|كتابة,رصاص,حبر,ورقة|تكتب فيه الواجب;يضيع بالفصل;له ممحاة فوق أحيانًا
سجادة/زولية|🧶|أرض,صلاة,بساط,صوف|تفرشها بالمجلس;تنظفها بالمكنسة;فيها رسومات ونقوش
كتاب|📖|صفحات,قراءة,مكتبة,قصة|له غلاف;تفتحه وتقلّب;فيه كلمات كثيرة
مقص|✂️|قص,ورق,حاد,شعر|له فتحتين للأصابع;خطير على الأطفال;تفتح فيه الأكياس
هدية/هديه|🎁|تغليف,عيد,مفاجأة,شريطة|تتلف بورق ملون;تنعطى بالمناسبات;تفرح فيها لا فتحتها
شاحن|🔌|جوال,كهرباء,سلك,بطارية|يضيع كل شوي وكل واحد يبيه;توصله آخر الليل;له راس يدخل بالفتحة
مسبحة/سبحة|📿|خرز,ذكر,خيط,تسبيح|تمسكها بيدك وتحركها;لها ألوان وأحجام;يهدونها الحجاج`,
'طبيعة':`شمس|☀️|حرارة,نهار,ضوء,شروق|تطلع من الشرق;لا تطالعها مباشرة;بعيدة وصفراء وكبيرة
قمر|🌙|ليل,هلال,بدر,نجوم|يطلع لا غابت الشمس;يتغير شكله خلال الشهر;نترقبه نهاية رمضان
مطر|🌧️|غيم,ماء,شتاء,مظلة|نفرح فيه بالسعودية;يبلل الشوارع;ينزل من فوق
نخلة/نخله|🏝️|تمر,سعف,جذع,مزرعة|شجرة طويلة;ترمز لبلادنا;نطلع عليها نخرف
جبل|⛰️|قمة,صخور,تسلق,عالي|يكون مكسو بالثلج أحيانًا;أبها مليانة منه;صعب تطلعه بدون تعب
بحر|🌊|موج,ماء,سمك,سباحة|مالح;أزرق وكبير;السفن تمشي فيه
ثلج|⛄|بارد,أبيض,شتاء,تزلج|يذوب بالشمس;يسوون منه رجل;ينزل بتبوك أحيانًا
وردة/ورده|🌹|ريحة,شوك,حمرا,بستان|نهديها بالمناسبات;لها بتلات ناعمة;تذبل لو ما سقيتها
نار|🔥|حطب,دخان,حريق,شبة|ندفى عليها بالشتاء;خطيرة على الأطفال;نسوي عليها شاي بالبر
قوس قزح|🌈|ألوان,مطر,سبعة,غيم|يطلع بعد الزخة لا طلعت الشمس;شكله مثل الجسر;أحمر وبرتقالي وأصفر وأخضر
بركان|🌋|حمم,انفجار,جبل,نار|يطلع منه دخان;أرضه حارة جدًا;يثور فجأة
نجمة/نجمه|⭐|سماء,ليل,تلمع,خمسة|نشوفها بالبر بوضوح;بعيدة مرة;الأطفال يرسمونها على الدفتر`,
'رياضة':`كرة قدم/كورة|⚽|ملعب,هدف,حارس,مباراة|11 لاعب بكل فريق;أشهر رياضة بالعالم;الحكم يصفر فيها
سباحة|🏊|ماء,مسبح,بحر,غوص|تحرك يدينك ورجولك;تلبس نظارة خاصة;نعلمها الأطفال بالصيف
كرة سلة|🏀|سلة,قفز,طويل,تنطيط|ترمي الكرة لفوق;اللاعبين طوالهم كبار;الحلقة معلقة فوق
ملاكمة|🥊|قفازات,حلبة,ضرب,جولة|تحمي وجهك بيدينك;الحكم يعد للعشرة;فيها حزام للبطل
تنس|🎾|مضرب,شبكة,كرة,ملعب|الطابة صفرا وصغيرة;لاعب ضد لاعب بينهم حاجز;تنلعب على عشب أو تراب أحمر
جري|🏃|سرعة,ماراثون,عداء,سباق|تلبس جزمة رياضية وتنطلق;تتنفس بقوة وتعرق;أسهل رياضة تمارسها بالحارة
فروسية|🏇|خيل,سباق,فارس,قفز|تلبس خوذة وتمسك اللجام;فيها حواجز;رياضة الأجداد
شطرنج|♟️|ملك,وزير,حصان,رقعة|لعبة ذكاء;فيها أبيض وأسود;تكسب لا حاصرت الخصم
غوص|🤿|بحر,أكسجين,أسماك,مرجان|تلبس زعانف;تنزل لتحت وتشوف الأعماق;معك أنبوبة على ظهرك
بولينج|🎳|كرة,قوارير,ممر,ضربة|ترمي وتطيّح عشرة;تلبس جزمة خاصة;تتدحرج على أرض لامعة
رماية|🎯|هدف,سهم,بندقية,نشان|تغمض عين وحدة;تحتاج تركيز وثبات;الوسط فيه أعلى نقاط
تزلج|⛷️|ثلج,جبل,عصي,منحدر|تلبس ألواح برجولك;تنزل بسرعة من فوق;تحتاج ملابس دافية`,
'مواصلات':`سيارة/سياره|🚗|سواقة,كفرات,بنزين,طريق|تحتاج رخصة;فيها مكيف وراديو;تشيل أربعة أو خمسة
طيارة/طائرة|✈️|مطار,جناح,سماء,طيار|تحلق فوق الغيم;تربط الحزام فيها;فيها مضيف يوزع أكل
قطار|🚆|سكة,محطة,عربات,سريع|يمشي على خط ثابت;طويل ومقطع أجزاء;صوته توت توت
سفينة/سفينه|🚢|بحر,قبطان,ميناء,مرساة|تمشي فوق الموج;فيها كباين ينامون فيها;تشيل حاويات وبضايع
دراجة/سيكل|🚲|بدال,عجلتين,خوذة,جرس|تمشيها برجولك;نتعلمها وحنا صغار;لها سلسلة وفرامل باليد
باص/حافلة|🚌|ركاب,مدرسة,سواق,محطة|طويل وأصفر أحيانًا;يشيل ناس كثير;توقف تنتظره بالشارع
هليكوبتر/مروحية|🚁|مروحة,طيران,هبوط,إنقاذ|تطير بدون مدرج;صوتها طق طق طق;توقف بالهواء مكانها
صاروخ|🚀|فضاء,إطلاق,قمر,نار|عد تنازلي عشرة تسعة ثمانية;يطلع لفوق بسرعة خرافية;يطلع منه دخان كثير
إسعاف|🚑|مستشفى,مريض,صفارة,طوارئ|لونها أبيض وأحمر;لازم تفسح لها الطريق;فيها نقالة
دباب/دراجة نارية/موتر|🏍️|سرعة,خوذة,عجلتين,بنزين|تركبه وتمسك المقود;صوته عالي;نسوق فيه بالبر
تاكسي|🚕|أجرة,عداد,سواق,أصفر|توقفه بإشارة يدك;تدفع حسب المشوار;اليوم تطلبه من التطبيق
قارب|⛵|بحر,شراع,مجداف,صيد|صغير ويطفو;نروح فيه للجزيرة;يهتز مع الموج`,
'مناسبات':`عيد|🎉|عيدية,فطر,أضحى,ملابس|نلبس جديد ونعايد;الأطفال ياخذون فلوس;نزور الأهل بعد الصلاة
عرس/زواج|💍|عروس,حفلة,قاعة,زفة|يتجمع الأهل ويهنون;فيه عشا وكيكة كبيرة;الرجال يرقصون العرضة
رمضان|🏮|صيام,فطور,سحور,تمر|شهر في السنة;نجتمع على السفرة قبل المغرب;فيه تراويح
كشتة/كشته|🏕️|بر,خيمة,نار,شتاء|تطلع مع أهلك خارج المدينة;تسوي شاي على الجمر;تنام تحت النجوم
تخرج|🎓|شهادة,جامعة,قبعة,رداء|ترمي شي لفوق مع زملائك;تتصور مع أهلك;تفرح بعد سنين دراسة
عيد ميلاد|🎂|كيكة,شموع,هدايا,عمر|يغنون لك;تطفي بنفخة;يجي مرة بالسنة
سفر|🧳|شنطة,مطار,جواز,إجازة|تحجز تذاكر;تروح بلد ثاني;ترجع ومعك هدايا
مجلس|🛋️|ضيوف,قهوة,كنب,سوالف|مكان استقبال الزوار;فيه دلال وفناجيل;الرجال يجتمعون فيه
عزيمة/عزيمه|🥘|ضيوف,كبسة,دعوة,ذبيحة|تجهز لها من الصبح;يجون الأقارب;فيها أكل كثير يكفي الكل
يوم وطني/اليوم الوطني|🇸🇦|علم,أخضر,احتفال,سبتمبر|الشوارع تتزين وتتلون;فيه ألعاب نارية;نحتفل بتوحيد المملكة
تخييم|⛺|خيمة,بر,شبة,حطب|تنصب مكان نومك بنفسك;تطفي النار قبل لا تنام;تصحى على صوت الطيور
حفلة شاي|🫖|بيالة,إبريق,بسكويت,ضيوف|البنات يجتمعون العصر;فيها حلا ومعجنات;تصبّ للكل`}
;
const P2W=[];for(const [cat,list] of Object.entries(P2WB))for(const ln of list.split('\n')){const [w,em,f,c]=ln.split('|');const alts=w.split('/');P2W.push({w:alts[0],alts,em,cat,fb:f.split(','),cl:c.split(';')});}
const p2WbOf=i=>Number.isInteger(i)&&i>=0&&P2W[i]?P2W[i]:null;
// the shape of a hidden word: its category and how many letters, with the spaces kept
const p2WbPat=i=>{const E=P2W[i];return {c:E.cat,s:[...E.w].map(c=>c===' '?' ':'_').join('')};};
function p2Slots(s){return `<div class="p2-slots">${[...String(s||'')].map(c=>c===' '?'<i class="sp"></i>':`<b>${c==='_'?'':escH(c)}</b>`).join('')}</div>`;}

/* ---------- عشرين سؤال / مين أنا: things, the yes/no questions about them, and the answers (1 yes, 0 no, 2 depends) ---------- */
const P2Q=[
 {c:'حيوان',e:'🐾',q:['يطير؟','يعيش بالماء؟','أكبر من الإنسان؟','ياكل لحم؟','يمشي على أربع؟','نربيه بالبيت أو المزرعة؟','يبيض؟','يعيش بالصحراء؟','عليه ريش؟'],
  it:'أسد:🦁:001110000,فيل:🐘:001010000,جمل/بعير:🐪:001011010,قطة/بسة:🐱:000111000,حصان/خيل:🐴:001011000,صقر:🦅:100102121,بطريق:🐧:020100101,دلفين:🐬:011100000,ثعبان/حية:🐍:000100120,نحلة:🐝:100002100,سلحفاة:🐢:020212120,دجاجة:🐔:000201101'},
 {c:'أكل أو شرب',e:'🍽️',q:['ينشرب؟','طعمه حلو؟','ينأكل وهو حار (ساخن)؟','ثمرة من شجرة أو نبتة؟','مصدره حيوان (لحم أو حليب أو بيض)؟','نفطر فيه الصبح؟','أكلة أو شراب شعبي سعودي؟','طبخة فيها مكونات كثيرة؟','ينأكل وهو بارد مثلّج؟'],
  it:'كبسة:🍛:001010110,بيتزا:🍕:001020010,تمر:🌴:010102100,آيس كريم/ايسكريم:🍦:010010021,قهوة عربية/قهوة:☕:101201100,شاي:🍵:111201200,عصير برتقال/عصير:🧃:110101002,بيض/بيضة:🥚:001011000,خبز/عيش:🍞:002001220,شوكولاتة/شوكولاته:🍫:010020020,سمك:🐟:001010200,تفاحة/تفاح:🍎:010102000'},
 {c:'غرض من أغراض البيت',e:'🏠',q:['يشتغل بكهرباء أو بطارية؟','تقدر تشيله بيد وحدة؟','تلقاه بالمطبخ؟','تجلس أو تنام عليه؟','فيه شاشة؟','حاد ويقطع؟','نستخدمه للتنظيف؟','يبرّد؟','أكبر منك بالحجم؟'],
  it:'ثلاجة:🧊:101000011,تلفزيون/تلفاز:📺:100010002,مكيف:❄️:100000012,سرير:🛏️:000100001,كرسي:🪑:022100000,مكنسة:🧹:210000100,مرآة/مراية:🪞:020000000,ساعة حائط/ساعة:⏰:112000000,باب:🚪:002000001,جوال/موبايل:📱:110010000,مقص:✂️:012001000,ملعقة:🥄:011000000'},
 {c:'وسيلة مواصلات',e:'🚦',q:['يطير؟','يمشي بالماء؟','له كفرات؟','يشيل أكثر من 10 أشخاص؟','يحتاج بنزين أو وقود؟','يمشي على سكة؟','له عجلتين بس؟','له صفارة إنذار؟','ينقل بضائع؟','يوصل للفضاء؟'],
  it:'سيارة:🚗:0010100000,طيارة/طائرة:✈️:1011100020,قطار:🚆:0011210020,سفينة:🚢:0101100010,دراجة/سيكل:🚲:0010001000,دباب/دراجة نارية:🏍️:0010101000,باص/حافلة:🚌:0011100000,هليكوبتر/مروحية:🚁:1002100000,غواصة:🛥️:0101200000,صاروخ:🚀:1000100001,إسعاف:🚑:0010100100,شاحنة/تريلا:🚛:0010100010'},
 {c:'مكان',e:'📍',q:['مكان مفتوح بدون سقف؟','فيه محلات كثيرة؟','تاكل فيه؟','تنام فيه؟','فيه دكاترة؟','تتعلم أو تقرأ فيه؟','فيه طيارات؟','فيه بحر أو ماء؟','مخصص للصلاة؟','داخل المدينة؟','فيه أشجار؟'],
  it:'مسجد/جامع:🕌:00000200112,مدرسة:🏫:00100100012,مستشفى:🏥:00211000012,مطار:🛫:01100010020,مول:🛍️:01100000012,شاطئ/بحر:🏖️:10200001022,صحراء/بر:🏜️:10220000000,ملعب/استاد:🏟️:10200000010,مطعم:🍽️:00100000012,حديقة/منتزه:🌳:10200000011,مكتبة:📚:00000100012,فندق:🏨:00110002012'},
 {c:'مهنة',e:'💼',q:['يلبس زي رسمي؟','يشتغل برّا أغلب الوقت؟','يستخدم أدوات حادة؟','يتعامل مع ناس كثير كل يوم؟','يساعد بالطوارئ؟','يشتغل على الكمبيوتر كثير؟','له علاقة بالأكل؟','يسوق أو يقود شي؟','يشتغل بمدرسة أو مستشفى؟','يشتغل بالبحر؟'],
  it:'طبيب/دكتور:👨‍⚕️:1021120010,معلم/مدرس/أستاذ:👨‍🏫:0001020010,طيار:👨‍✈️:1000010100,شرطي/شرطة:👮:1101120100,طباخ/شيف:👨‍🍳:1012001000,مزارع/فلاح:👨‍🌾:0110001200,نجار:🪚:0210000000,رسام/فنان:🎨:0200000000,إطفائي:🧑‍🚒:1120100100,صياد سمك/صياد:🎣:0110001101,مبرمج:🧑‍💻:0000010000,حلاق:💈:2011000000'}];
P2Q.forEach(C=>{C.items=C.it.split(',').map(x=>{const [w,em,v]=x.split(':');const alts=w.split('/');return {w:alts[0],alts,em,v:[...v].map(Number)};});delete C.it;});
// an item is c*16+i: its category is public in مين أنا, never in عشرين سؤال
const p2TqIt=x=>Number.isInteger(x)&&x>=0&&P2Q[x>>4]&&P2Q[x>>4].items[x&15]?P2Q[x>>4].items[x&15]:null;
const p2TqAll=()=>{const o=[];P2Q.forEach((C,c)=>C.items.forEach((_,i)=>o.push(c*16+i)));return o;};
// does item x fit the answer a to a question? 2 (depends) and «ما أدري» fit everything
const p2TqFit=(v,a)=>v===2||a>=2||v===a;
// the question that splits these candidates best (null when none tells them apart)
function p2TqBest(cands,qs,valOf,avoid){let best=null,bs=0;for(const q of qs){if(avoid&&avoid.includes(q))continue;let y=0,n=0;for(const x of cands){const v=valOf(x,q);if(v===1)y++;else if(v===0)n++;}
  const s=Math.min(y,n);if(s>bs||s===bs&&s>0&&Math.random()<.4){bs=s;best=q;}}return best;}

/* =====================================================================================================
   تمثيل صامت (p_mime) and الكلمات الممنوعة (p_forbid): one player has a word card for a minute and makes the
   others guess as many words as possible. Teams: only the actor's team guesses (and in الكلمات الممنوعة the other
   teams watch the card and press the buzzer). Without teams the next player is the judge in الكلمات الممنوعة.
   One phone: the actor holds it and taps whoever got the word. Online: the others may also type their guesses.
   ===================================================================================================== */
const P2GTT=60;
const p2GtF=d=>d.kd==='f';
const p2GtTurnSeat=(d,k)=>{let s=(d.st+k)%d.pl.length;for(let j=0;j<d.pl.length&&d.out[s]==='1';j++)s=(s+1)%d.pl.length;return s;};
function p2GtMates(d){const a=d.ac;const all=aliveSeats(d).filter(s=>s!==a);if(d.tm){const m=all.filter(s=>d.tm[s]===d.tm[a]);if(m.length)return m;}return all;}
// who watches the card and may press the buzzer (الكلمات الممنوعة only)
function p2GtJudges(d){if(!p2GtF(d))return [];const a=d.ac;const all=aliveSeats(d).filter(s=>s!==a);
  if(d.tm&&all.some(s=>d.tm[s]===d.tm[a]))return all.filter(s=>d.tm[s]!==d.tm[a]);
  return all.length>=2?[nextSeat(d,a)]:[];}
function p2GtGuessers(d){const j=p2GtJudges(d);return p2GtMates(d).filter(s=>!j.includes(s));}
const p2GtSees=(d,s)=>s>=0&&(s===d.ac||p2GtJudges(d).includes(s));
function p2GtDraw(d){const used=[...(d.used||[]),d.w].filter(x=>x>=0);return p2Fresh('wb',P2W.length,used);}
// bots guessing: when each one gets the word (or never) and when it says a wrong word
function p2GtBots(d,now){const bt={};const botAct=isBot(d,d.ac);
  for(const s of p2GtGuessers(d))if(isBot(d,s)){const lv=p2Lv(d,s);const base=botAct?[0,24,16,10][lv]:[0,30,20,12][lv];
    bt[s]=[Math.random()<[0,.3,.15,.05][lv]?-1:now+(base+rnd(14))*1000,now+3000+rnd(6000)];}return bt;}
function p2GtWord(d,now){const w=p2GtDraw(d);const x={...d,w,wn:(d.wn||0)+1,ws:now,gn:{}};const bt=p2GtBots(x,now);if(Object.keys(bt).length)x.bt=bt;else delete x.bt;return x;}
function p2GtGo(d){const now=Date.now();return p2GtWord({...d,ph:'act',t0:now,got:[],feed:[],wn:0,last:''},now);}
// a word is done: r = guesser seat, -1 skipped, -2 forbidden word said
function p2GtDone(d,r){const P=[...d.pts];if(r>=0){P[r]++;P[d.ac]++;}else if(r===-2)P[d.ac]=Math.max(0,P[d.ac]-1);
  const x={...d,pts:P,got:[...d.got,[d.w,r]],used:[...d.used,d.w].slice(-90),feed:[]};
  return Date.now()-d.t0>=P2GTT*1000?p2GtSum(x):p2GtWord(x,Date.now());}
function p2GtSum(d){const x={...d,ph:'sum',ts:Date.now(),w:-1,turn:d.ac};delete x.bt;return x;}
function p2GtNext(d){const k=d.k+1;if(k>=d.K)return {...d,k,ph:'end',win:mostPts(d.pts)};const ac=p2GtTurnSeat(d,k);const x={...d,k,ac,turn:ac,ph:'ready',w:-1,got:[],feed:[],last:''};delete x.bt;return x;}
const p2GtKey=d=>d.gid+':'+d.k+':'+d.wn;
// what the bot actor shows so far: the category, the size, then its clues one by one (a mime or a description)
function p2GtBotLines(d){const E=p2WbOf(d.w);if(!E)return [];const el=(Date.now()-d.ws)/1000;const n=Math.min(5,1+Math.floor(el/6));
  const words=E.w.split(' ').length;const L=[`${E.cat} • ${words>1?`${words} كلمات`:'كلمة وحدة'} • ${[...E.w.replace(/ /g,'')].length} حروف`,...E.cl.map(c=>(p2GtF(d)?'💬 ':'🎭 ')+c),`${E.em}`];return L.slice(0,n);}
function p2GtMake(kd,def){return {name:def.name,cat:'party',lbc:def.lbc,noTimer:true,icon:def.icon,
  init:n=>({kd,ph:'ready',k:0,K:n*(n<=2?3:n===3?2:1),ac:0,w:-1,wn:0,ws:0,t0:0,got:[],used:[],feed:[],gn:{},pts:Array(n).fill(0),last:''}),
  start:d=>({...d,ac:d.st,turn:d.st}),
  points:p2Pts,winExtra:p2WinX,
  /* online the card stays with the actor (and in الكلمات الممنوعة with the judges); the others get its category and size */
  mask(d,seat){if(d.win!=null||d.ph!=='act')return d;const v={...d};delete v.bt;if(p2GtSees(d,seat))return v;v.w=-1;if(d.w>=0)v.wp=p2WbPat(d.w);return v;},
  privShow:(d,seat,role,p,own)=>own||!p?p:{gid:p.gid},
  privOk:(d,r,o,p)=>p.gq==null||typeof p.gq==='object'&&typeof p.gq.k==='string'&&p.gq.k.length<=40&&Number.isInteger(p.gq.n)&&Array.isArray(p.gq.l)&&p.gq.l.length<=3&&p.gq.l.every(x=>Array.isArray(x)&&Number.isInteger(x[0])&&typeof x[1]==='string'&&x[1].length<=24),
  net:{local:[]},
  viewer:d=>d.win==null&&(d.ph==='ready'||d.ph==='act')&&!isBot(d,d.ac)?d.ac:null,
  coverMsg:d=>d.ph==='ready'?(p2GtF(d)?'دورك توصف! لا تخلي أحد يشوف البطاقة':'دورك تمثّل! لا تخلي أحد يشوف الكلمة'):'',
  onSkip(nd){if(nd.win!=null)return nd;if(nd.out[nd.ac]==='1'&&nd.ph!=='end')return p2GtNext({...nd,last:`${nm(nd,nd.ac)} طلع`});return nd;},
  status(d,ctx){const who=ctx.v===d.ac&&!ctx.local?'<b class="yt">أنت</b>':nameTag(d,d.ac);const verb=p2GtF(d)?'يوصف':'يمثّل';const turn=`<small>الدور ${d.k+1} من ${d.K}${d.last?' • '+d.last:''}</small><br>`;
    if(d.ph==='ready')return turn+`${who} ${verb} الحين${d.tm?` لفريق ${teamName(d.tm[d.ac])}`:''}`;
    if(d.ph==='act')return turn+`${who} ${verb} • ${d.got.filter(g=>g[1]>=0).length} كلمات صح`;
    return turn+`خلص دور ${nameTag(d,d.ac)}: ${d.got.filter(g=>g[1]>=0).length} كلمات صح`;},
  render(d,ctx){return `<div class="p2 p2-gt ${kd==='f'?'forbid':'mime'}">${GAMES['p_'+(kd==='f'?'forbid':'mime')].view(d,ctx)}</div>`;},
  view(d,ctx){const v=ctx.v,E=p2WbOf(d.w),ac=d.ac,iAc=v===ac&&!isBot(d,ac);const gs=p2GtGuessers(d),js=p2GtJudges(d);const verb=p2GtF(d)?'توصف':'تمثّل';
    if(d.ph==='ready'){const ppl=`<div class="p2-row">${gs.map(s=>`<span class="p2-tag" style="--c:${col(d,s)}">${nm(d,s)}</span>`).join('')}</div>`;
      if(iAc||(ctx.local&&!isBot(d,ac)))return `<div class="p2-ready"><div class="p2-cardback ${kd}"><b>${p2GtF(d)?'🤐':'🎭'}</b><small>عندك ${P2GTT} ثانية</small></div><p class="p2-lead">${p2GtF(d)?'وصّف الكلمة بدون ما تقول ولا وحدة من الكلمات الممنوعة':'مثّل الكلمة بدون كلام ولا إشارة للحروف'}</p><p class="note">يخمّنون:</p>${ppl}${js.length?`<p class="note">🚨 الرقيب: ${js.map(s=>nm(d,s)).join('، ')}</p>`:''}<button class="big green" data-ga="go">جاهز، ابدأ ⏱</button></div>`;
      return `<div class="p2-wait"><div class="p2-cardback ${kd}"><b>${p2GtF(d)?'🤐':'🎭'}</b></div><p>${nameTag(d,ac)} بيبدأ ${verb==='تمثّل'?'يمثّل':'يوصف'} بعد شوي</p>${ppl}</div>`;}
    if(d.ph==='act'){const end=d.t0+P2GTT*1000;let h=p2Clock(end,P2GTT);
      const card=E?`<div class="p2-card ${kd}" data-k="w${d.wn}"><small class="p2-cat">${E.cat}</small><span class="p2-em">${E.em}</span><b>${E.w}</b>${p2GtF(d)?`<ul class="p2-fb">${E.fb.map(f=>`<li>${f}</li>`).join('')}</ul>`:''}</div>`:'';
      const feed=d.feed.length?`<div class="p2-feed">${d.feed.slice().reverse().map(([s,t,k])=>`<p class="${k===1?'ok':k===2?'cl':''}"><b style="color:${col(d,s)}">${nm(d,s)}</b> ${k===1?'عرفها! 🎉':k===2?`${escH(t)} <i>قريب 🔥</i>`:escH(t)}</p>`).join('')}</div>`:'';
      const score=`<div class="p2-score">${d.got.map(([w,r])=>`<i class="${r>=0?'ok':r===-2?'bz':''}" title="${P2W[w]?P2W[w].w:''}"></i>`).join('')}</div>`;
      if(isBot(d,ac)){// a bot acts on the screen everyone sees
        const L=p2GtBotLines(d);h+=`<div class="p2-botact" data-k="ba${d.wn}"><div class="p2-actor" style="--c:${col(d,ac)}"><i>${shapeW(d.pl[ac])}</i><b>${nm(d,ac)} ${p2GtF(d)?'يوصف':'يمثّل'}</b></div><ul>${L.map((t,k)=>`<li data-k="l${k}">${escH(t)}</li>`).join('')}</ul></div>`;
        const hs=gs.filter(s=>!isBot(d,s));
        if(hs.length&&(ctx.local||hs.includes(v)))h+=`<div class="p2-guess"><input class="field" data-draft="p2g" data-enter="${hs.length===1?'lg':''}" maxlength="24" value="${escH(S.draft.p2g||'')}" placeholder="وش الكلمة؟" autocomplete="off" enterkeyhint="send"></div><div class="p2-row">${(S.mode==='online'?[v]:hs).map(s=>`<button class="btn red p2-lg" style="--c:${col(d,s)}" data-ga="lg" data-i="${s}">${hs.length>1||S.mode==='online'?'خمّن: '+nm(d,s):'خمّن'}</button>`).join('')}</div>`;
        return h+score+feed;}
      if(iAc||p2GtSees(d,v)||(ctx.local&&!isBot(d,ac))){h+=card;
        if(iAc||ctx.local){h+=`<p class="p2-lead small">مين عرفها؟</p><div class="p2-row">${gs.map(s=>`<button class="p2-gsr" style="--c:${col(d,s)}" data-ga="ok" data-i="${s}">${nm(d,s)}</button>`).join('')}</div>
          <div class="p2-row"><button class="btn soft" data-ga="skip">تخطي ⏭</button>${p2GtF(d)&&(ctx.local||!js.length)?'<button class="btn p2-buzz" data-ga="buzz">🚨 قال ممنوعة</button>':''}</div>`;}
        else h+=`<p class="p2-lead small">أنت الرقيب: لو قال ${nm(d,ac)} كلمة ممنوعة اضغط</p><button class="big p2-buzzbig" data-ga="buzz">🚨 قال كلمة ممنوعة!</button>`;
        return h+score+feed;}
      // a guesser (online), or a player of another team who watches
      const wp=d.wp||{c:'',s:''};h+=`<div class="p2-hidden"><small class="p2-cat">${escH(wp.c)}</small>${p2Slots(wp.s)}</div>`;
      if(v>=0&&gs.includes(v))h+=`<div class="p2-guess"><input class="field" data-draft="p2g" data-enter="send" maxlength="24" value="${escH(S.draft.p2g||'')}" placeholder="اكتب تخمينك" autocomplete="off" enterkeyhint="send"><button class="btn red" data-ga="send">خمّن</button></div>`;
      else h+=`<p class="note">${d.tm?`فريق ${teamName(d.tm[ac])} يخمّن الحين`:'تتفرج على الجولة'}</p>`;
      return h+score+feed;}
    // the turn's words, then the next actor
    const rows=d.got.map(([w,r])=>`<li class="${r>=0?'ok':r===-2?'bz':r===-3?'to':''}"><span>${P2W[w]?P2W[w].em:''}</span><b>${P2W[w]?P2W[w].w:''}</b><em>${r>=0?'✓ '+nm(d,r):r===-2?'🚨 ممنوعة':r===-3?'⏱ انتهى الوقت':'⏭ تخطاها'}</em></li>`).join('');
    const can=ctx.local||ctx.v===d.turn;
    return `<div class="p2-sum"><h3>${nm(d,ac)}: ${d.got.filter(g=>g[1]>=0).length} كلمات صح</h3><ul>${rows||'<li>ما لحق كلمة</li>'}</ul>${d.win==null?(can?`<button class="big" data-ga="next">${d.k+1>=d.K?'النتيجة 🏆':'الدور اللي بعده ←'}</button>`:'<p class="note">الدور الجاي يبدأ بعد شوي</p>'):''}</div>`;},
  click(a,i,d,ctx){const v=ctx.v,ac=d.ac;const iAc=(ctx.local||v===ac)&&!isBot(d,ac);
    if(a==='go'&&d.ph==='ready'&&iAc){act(p2GtGo(d));return;}
    if(a==='next'&&d.ph==='sum'&&(ctx.local||v===d.turn)){act(p2GtNext(d));return;}
    if(d.ph!=='act')return;
    if(a==='ok'&&iAc&&p2GtGuessers(d).includes(i)){act(p2GtDone(d,i));return;}
    if(a==='skip'&&iAc){act(p2GtDone(d,-1));return;}
    if(a==='buzz'&&p2GtF(d)&&(ctx.local||p2GtJudges(d).includes(v)||(iAc&&!p2GtJudges(d).length))){act({...p2GtDone(d,-2),last:'🚨 كلمة ممنوعة! نقصت نقطة'});return;}
    // a typed guess: on one phone it is checked here, online the host checks it (the word is not on this phone)
    if((a==='send'||a==='lg')&&d.w>=0||a==='send'&&S.mode==='online'){const s=a==='lg'?i:v;if(s==null||s<0||!p2GtGuessers(d).includes(s))return;if(a==='lg'&&S.mode==='online'&&s!==v)return;
      const txt=p2T(S.draft.p2g,24);if(!txt)return;S.draft.p2g='';
      if(S.mode!=='online'){const E=p2WbOf(d.w);const m=E?p2Match(E.alts,txt):0;if(m===2){act(p2GtDone({...d,feed:[]},s));return;}act({...d,feed:[...d.feed,[s,txt,m===1?2:0]].slice(-6)});return;}
      const r=d.pl[s],p0=S.priv[r],p=p0&&p0.gid===d.gid?p0:{},k=p2GtKey(d);const gq=p.gq&&p.gq.k===k?p.gq:{k,n:0,l:[]};const n2=gq.n+1;
      setPriv(r,{...p,gid:d.gid,gq:{k,n:n2,l:[...gq.l,[n2,txt]].slice(-3)}});}},
  // one device runs the clock, reads typed guesses and plays the bots
  host(d){const now=Date.now();
    if(d.ph==='sum')return now-d.ts>9000?p2GtNext(d):null;
    if(d.ph==='ready'&&!isBot(d,d.ac)&&goneLong(d.pl[d.ac]))return p2GtNext(d);
    if(d.ph!=='act')return null;
    if(now-d.t0>=P2GTT*1000)return p2GtSum({...d,got:d.w>=0?[...d.got,[d.w,-3]]:d.got,used:d.w>=0?[...d.used,d.w].slice(-90):d.used});
    const E=p2WbOf(d.w);if(!E)return null;let x=d;const key=p2GtKey(d);
    for(const s of p2GtGuessers(d)){if(isBot(d,s))continue;const p=S.priv[d.pl[s]];if(!p||!p.gq||p.gq.k!==key)continue;
      for(const [n,t] of p.gq.l){if(n<=(x.gn[s]||0))continue;x={...x,gn:{...x.gn,[s]:n}};const m=p2Match(E.alts,t);if(m===2)return p2GtDone(x,s);x={...x,feed:[...x.feed,[s,p2T(t,24),m===1?2:0]].slice(-6)};}}
    if(x.bt)for(const k in x.bt){const s=+k;const [gt,nw]=x.bt[k];if(gt>0&&now>=gt)return p2GtDone(x,s);
      if(now>=nw){const wrong=P2W.filter(e=>e.cat===E.cat&&e!==E);x={...x,feed:[...x.feed,[s,p2Pick(wrong).w,0]].slice(-6),bt:{...x.bt,[k]:[gt,now+5000+rnd(8000)]}};}}
    // a bot actor gives up on a word nobody gets
    if(isBot(d,d.ac)&&now-d.ws>34000)return p2GtDone(x,-1);
    return x===d?null:x;},
  bot(d,s){if(d.ph==='ready'&&s===d.ac)return p2GtGo(d);if(d.ph==='sum'&&s===d.turn)return p2GtNext(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='sum'?4000:1200+rnd(800)};}

GAMES.p_mime=p2GtMake('m',{name:'تمثيل صامت',lbc:'#7D3C98',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8E44AD"/><circle cx="50" cy="28" r="12" fill="#fff"/><path d="M50 40v26M50 66l-12 20M50 66l12 20" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M50 48L28 32M50 48l22-16" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M44 27h3M53 27h3" stroke="#8E44AD" stroke-width="2.5" stroke-linecap="round"/><path d="M45 33q5 3 10 0" stroke="#8E44AD" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="66" y="56" width="22" height="28" rx="4" fill="#F5CBA7" transform="rotate(12 77 70)"/><text x="78" y="77" font-size="16" font-weight="800" text-anchor="middle" fill="#7D3C98" transform="rotate(12 77 70)">؟</text></svg>`});
HELP.p_mime='كل واحد له دور يمثّل فيه دقيقة كاملة. يطلع له كلمة سرية (أكل، حيوانات، أماكن، مهن، مناسبات…) ويمثّلها بدون ولا كلمة وبدون ما يأشر على حروف، والباقين يخمّنون بصوت عالي. اللي يعرفها يضغط الممثل على اسمه: هو ياخذ نقطة والممثل نقطة، وتطلع له الكلمة اللي بعدها. تقدر تتخطى الكلمة الصعبة. على جوال واحد الجوال مع الممثل بس. أونلاين تقدرون تكتبون تخميناتكم والجوال يصححها، والقريبة يقول عنها «قريب». البوت إذا جاه الدور يمثّل بتلميحات تطلع وحدة وحدة. مع الفرق: بس فريق الممثل يخمّن، ومجموع النقاط للفريق.';
GAMES.p_forbid=p2GtMake('f',{name:'الكلمات الممنوعة',lbc:'#C0392B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E74C3C"/><path d="M18 22h56a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H44l-16 14v-14H18a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8z" fill="#fff"/><path d="M24 36h44M24 46h30" stroke="#C0392B" stroke-width="5" stroke-linecap="round"/><circle cx="74" cy="70" r="17" fill="#fff" stroke="#2D4763" stroke-width="5"/><path d="M62 82l24-24" stroke="#2D4763" stroke-width="5"/></svg>`});
HELP.p_forbid='كل واحد له دور يوصف فيه دقيقة كاملة. تطلع له بطاقة فيها كلمة وتحتها أربع كلمات ممنوعة: يوصف الكلمة بالكلام بدون ما يقولها وبدون ولا وحدة من الممنوعة، والباقين يخمّنون. اللي يعرفها يضغط الواصف على اسمه: هو ياخذ نقطة والواصف نقطة. اللي جنب الواصف هو الرقيب يشوف البطاقة معه، ولو سمع كلمة ممنوعة يضغط «قال ممنوعة» وتنقص على الواصف نقطة. أونلاين تقدرون تكتبون تخميناتكم. البوت إذا وصّف يعطي تلميحات تطلع وحدة وحدة. مع الفرق: فريق الواصف يخمّن، والفريق الثاني كله رقباء يشوفون البطاقة.';

/* =====================================================================================================
   البطاطا الحارة (p_potato): a hot potato goes from hand to hand. Whoever holds it says a word of the round's
   category and passes it on; a fuse no one can see (drawn on the host) runs out and burns the one holding it.
   ===================================================================================================== */
const P2POTC=()=>typeof BARA!=='undefined'?BARA:[['حيوانات',['أسد','نمر','فيل','جمل','قط','كلب']]];
const P2POTSVG=`<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M62 4c4 8 2 14-4 18" stroke="#7a7a7a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="64" cy="6" r="5" fill="#F39C12"/><circle cx="64" cy="6" r="2.5" fill="#FFF3B0"/>
<path d="M22 52c0-20 18-32 40-30 26 2 40 16 38 36-2 22-22 34-44 32C34 88 22 74 22 52z" fill="#C68642"/><path d="M30 48c2-14 14-22 28-21" stroke="#E2B07A" stroke-width="5" fill="none" stroke-linecap="round"/>
<circle cx="44" cy="62" r="2.6" fill="#8B5A2B"/><circle cx="72" cy="46" r="2.2" fill="#8B5A2B"/><circle cx="80" cy="70" r="2.6" fill="#8B5A2B"/><circle cx="58" cy="76" r="2" fill="#8B5A2B"/>
<path d="M18 30q-6-8 0-14M104 34q6-8 0-14M10 54q-6-6-2-12" stroke="#E74C3C" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
function p2PotRound(d,now){const C=P2POTC();const c=p2Fresh('pot',C.length);return {...d,ph:'play',c,sd:[],fz:now+12000+rnd(23000),t0:now,rb:(d.rb||0)+1,last:''};}
function p2PotPass(d,s,w){return {...d,sd:[...d.sd,[s,w]].slice(-12),turn:nextSeat(d,s),pc:(d.pc||0)+1};}
function p2PotBoom(d){const s=d.turn;const lv=[...d.lv];lv[s]=Math.max(0,lv[s]-1);let out=d.out;if(!lv[s])out=setAt(out,s,'1');const al=aliveSeats(d,out);
  const x={...d,lv,out,ph:'boom',ex:s,t0:Date.now(),fz:-1,turn:out[s]==='1'?nextSeat(d,s,out):s,last:lv[s]?`💥 انفجرت في يد ${nm(d,s)}`:`💥 ${nm(d,s)} طلع من اللعبة`};
  if(al.length<=1)return {...x,ph:'end',win:al.length?al[0]:'d'};return x;}
const p2PotUsed=(d,w)=>d.sd.some(x=>x[1]&&p2N(x[1])===p2N(w));
GAMES.p_potato={name:'البطاطا الحارة',cat:'party',lbc:'#D35400',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F39C12"/><path d="M20 56c0-18 15-28 33-26 22 2 33 13 31 30-2 18-18 28-36 27-17-1-28-13-28-31z" fill="#C68642"/><path d="M27 52c2-11 12-17 23-16" stroke="#E2B07A" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="40" cy="64" r="2.6" fill="#8B5A2B"/><circle cx="66" cy="52" r="2.4" fill="#8B5A2B"/><circle cx="68" cy="72" r="2.6" fill="#8B5A2B"/><path d="M56 31c4-8 10-12 16-12" stroke="#5D4037" stroke-width="3" fill="none"/><circle cx="74" cy="18" r="7" fill="#FFF3B0"/><circle cx="74" cy="18" r="3.5" fill="#E74C3C"/><path d="M14 30q-5-7 0-13M88 40q6-7 1-13" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  init:n=>({ph:'pre',c:0,sd:[],lv:Array(n).fill(n<=4?2:1),L:n<=4?2:1,fz:-1,t0:0,rb:0,pc:0,ex:-1,last:''}),
  points:d=>d.lv.map((l,s)=>d.out[s]==='1'?'💀':'❤️'.repeat(l)),
  // the fuse is the host's alone: nobody sees when it goes off
  mask:(d,seat)=>d.win!=null?d:{...d,fz:-1},
  net:{local:[]},
  status(d,ctx){if(d.ph==='pre')return 'البطاطا تسخن…';if(d.ph==='boom')return `<b class="p2-red">${d.last}</b>`;
    const me=!ctx.local&&ctx.v===d.turn;const C=P2POTC()[d.c];return `${me?'<b class="yt">البطاطا عندك!</b>':`البطاطا عند ${nameTag(d,d.turn)}`}<br><small>قل كلمة من «${C?C[0]:''}» ومرّرها بسرعة</small>`;},
  render(d,ctx){const C=P2POTC()[d.c]||['',[]];let h=`<div class="p2 p2-pot">`;
    h+=`<div class="p2-potcat"><small>الفئة</small><b>${C[0]||'…'}</b></div>`;
    const hold=d.ph==='play'?d.turn:d.ex;
    h+=`<div class="p2-potring n${d.pl.length}">${d.pl.map((r,s)=>{const o=d.out[s]==='1';return `<div class="p2-ps ${o?'out':''} ${s===hold&&d.ph==='play'?'hot':''} ${s===d.ex&&d.ph==='boom'?'burn':''}" style="--c:${COLS[r]};--a:${(360/d.pl.length*s).toFixed(1)}deg"><i>${shapeW(r)}</i><span>${nm(d,s)}</span><em>${o?'💀':'❤️'.repeat(d.lv[s])}</em></div>`;}).join('')}
      <div class="p2-potmid">${d.ph==='boom'?`<div class="p2-boom" data-k="b${d.rb}">💥</div>`:`<div class="p2-potato ${d.ph==='play'?'live':''}" data-k="p${d.pc}">${P2POTSVG}</div>`}</div></div>`;
    if(d.ph==='play'){const me=ctx.local||ctx.v===d.turn,holder=d.turn;
      if(me&&!isBot(d,holder)){if(S.mode==='online')h+=`<div class="p2-guess"><input class="field" data-draft="p2pw" data-enter="say" maxlength="18" value="${escH(S.draft.p2pw||'')}" placeholder="${C[0]}…" autocomplete="off" enterkeyhint="send"><button class="btn red" data-ga="say">مرّر 🥔</button></div>`;
        else h+=`<button class="big p2-passb" data-ga="pass" style="--c:${col(d,holder)}">${nm(d,holder)} قال كلمة ✓ مرّر 🥔</button>`;}
      else h+=`<p class="p2-lead small">${nm(d,holder)} يفكر بكلمة…</p>`;}
    else if(d.ph==='boom')h+=`<p class="p2-lead p2-red">${d.last}</p>`;
    const sd=d.sd.filter(x=>x[1]);if(sd.length)h+=`<div class="p2-words">${sd.slice(-8).map(([s,w])=>`<span style="--c:${col(d,s)}">${escH(w)}</span>`).join('')}</div>`;
    return h+'</div>';},
  click(a,i,d,ctx){if(d.ph!=='play')return;const s=d.turn;if(!(ctx.local||ctx.v===s)||isBot(d,s))return;
    if(a==='pass'&&S.mode!=='online'){sfx('pop');act(p2PotPass(d,s,''));return;}
    if(a==='say'){const w=p2T(S.draft.p2pw,18);if([...w.replace(/ /g,'')].length<2){toast('اكتب كلمة أول');return;}if(p2PotUsed(d,w)){toast('انقالت قبل! جب غيرها');return;}S.draft.p2pw='';act(p2PotPass(d,s,w));}},
  host(d){const now=Date.now();if(d.ph==='pre')return p2PotRound(d,now);if(d.ph==='boom')return now-d.t0>2800?{...d,ph:'pre'}:null;
    if(d.ph==='play'&&d.fz>0&&now>=d.fz)return p2PotBoom(d);return null;},
  // a bot says a word of the category nobody said yet; an easy bot sometimes needs a moment longer
  bot(d,s,lv){if(d.ph!=='play'||d.turn!==s)return d;if(lv===1&&Math.random()<.3)return d;const C=P2POTC()[d.c];const ok=(C?C[1]:[]).filter(w=>!p2PotUsed(d,w));
    return p2PotPass(d,s,ok.length?p2Pick(ok):'…');},
  botDelay:(d,s,lv)=>[0,2600,1700,900][lv]+rnd([0,4000,2500,1400][lv]),
  after(d){const k=d.gid+':'+d.rb+':'+d.ph;if(S.p2potK===k)return;S.p2potK=k;if(d.ph==='boom'){sfx('lose');buzz();}}};
HELP.p_potato='البطاطا حارة وفيها فتيل محد يعرف متى يخلص! كل جولة تطلع فئة (حيوانات، أكلات، دول…). اللي البطاطا عنده يقول كلمة من الفئة ما انقالت قبل ويمرّرها للي بعده بسرعة. على جوال واحد قولوها بصوت عالي ومرّروا الجوال نفسه، وأونلاين تكتب الكلمة وتمرّر. لما ينتهي الفتيل تنفجر في يد اللي ماسكها ويخسر قلب (من 5 لاعبين وفوق قلب واحد بس). اللي تخلص قلوبه يطلع، وآخر واحد يبقى هو الفايز. مع الفرق: آخر فريق يبقى فيه لاعب يفوز.';

/* =====================================================================================================
   عشرين سؤال (p_20q): one player holds a secret thing; the others ask yes/no questions in turns (first which kind of
   thing it is, then that kind's own questions, or a question of their own) and may guess. Twenty questions at most.
   ===================================================================================================== */
const P2Q20=20;
// what the questions so far tell everyone: the kind that is sure (or -1) and the guesses that were wrong
function p2Q20Known(d){const no=new Set();for(const [,k,v,a] of d.ql){if(k==='c'&&a===1)return v;if(k==='c'&&a===0)no.add(v);}const left=P2Q.map((_,c)=>c).filter(c=>!no.has(c));return left.length===1?left[0]:-1;}
function p2Q20Fits(d,x){const c=x>>4,I=p2TqIt(x);if(!I)return -1;let bad=0;for(const [,k,v,a] of d.ql){if(k==='c'){if(a<2&&(c===v?1:0)!==a)bad++;}else if(k==='a'){const qc=v>>4,qi=v&15;if(qc===c&&!p2TqFit(I.v[qi],a))bad++;}else if(k==='g'&&v===x)return -1;}return bad;}
function p2Q20Cands(d){const sc=p2TqAll().map(x=>[x,p2Q20Fits(d,x)]).filter(e=>e[1]>=0);const mn=Math.min(...sc.map(e=>e[1]));return sc.filter(e=>e[1]===mn).map(e=>e[0]);}
const p2Q20Asked=(d,k,v)=>d.ql.find(e=>e[1]===k&&e[2]===v);
const p2Q20Asker=(d,from)=>{let s=from;for(let j=0;j<d.pl.length;j++){s=nextSeat(d,s);if(s!==d.h)return s;}return from;};
function p2Q20Ch(d){const cs=p2Sh(P2Q.map((_,c)=>c)).slice(0,3);return cs.map(c=>c*16+p2Fresh('tq'+c,P2Q[c].items.length));}
function p2Q20Hold(d,k){let h=(d.st+k)%d.pl.length;for(let j=0;j<d.pl.length&&d.out[h]==='1';j++)h=(h+1)%d.pl.length;return {...d,ph:'pick',k,h,turn:h,it:-1,ch:p2Q20Ch(d),qn:0,ql:[],cq:null,ak:h,gw:-1,last:''};}
function p2Q20After(d,e){const ql=[...d.ql,e],qn=d.qn+1;const x={...d,ql,qn,cq:null};if(qn>=P2Q20)return p2Q20Show(x,-1);const ak=p2Q20Asker(x,d.ak);return {...x,ph:'ask',ak,turn:ak};}
function p2Q20Show(d,gw){const P=[...d.pts];if(gw>=0){P[gw]+=3+(d.qn<10?1:0);if(d.qn>=10)P[d.h]+=1;}else P[d.h]+=3;return {...d,ph:'show',gw,pts:P,ts:Date.now(),turn:d.h,cq:null};}
function p2Q20Next(d){const k=d.k+1;if(k>=d.H)return {...d,ph:'end',win:mostPts(d.pts)};return p2Q20Hold(d,k);}
// a question as text: «هو حيوان؟», a kind's own question, a typed one or a guess
function p2Q20Txt(k,v){if(k==='c')return `هو ${P2Q[v]?P2Q[v].c:''}؟`;if(k==='a'){const C=P2Q[v>>4];return C?C.q[v&15]:'';}if(k==='g'){const I=p2TqIt(v);return I?`هو ${I.w}؟ ${I.em}`:'';}return escH(v);}
function p2Q20Bot(d,s,lv){const cands=p2Q20Cands(d);const kn=p2Q20Known(d);
  const qs=kn>=0?P2Q[kn].q.map((_,i)=>kn*16+i).filter(q=>!p2Q20Asked(d,'a',q)):P2Q.map((_,c)=>c).filter(c=>!p2Q20Asked(d,'c',c));
  const isC=kn<0;const val=(x,q)=>isC?((x>>4)===q?1:0):((x>>4)===(q>>4)?p2TqIt(x).v[q&15]:-1);
  const guess=x=>p2Q20Act(d,s,'g',x);
  if(d.qn>=P2Q20-1||cands.length===1&&lv>1)return guess(p2Pick(cands));
  if(lv===1){if((cands.length<=4&&Math.random()<.5)||Math.random()<.08)return guess(p2Pick(cands));return qs.length?p2Q20Act(d,s,isC?'c':'a',p2Pick(qs)):guess(p2Pick(cands));}
  // a guess among a few is worth more than a question the next asker profits from
  if(cands.length<=(lv===3?3:2))return guess(p2Pick(cands));
  const best=lv===2&&Math.random()<.3?p2Pick(qs):p2TqBest(cands,qs,val);
  if(best==null)return guess(p2Pick(cands));return p2Q20Act(d,s,isC?'c':'a',best);}
function p2Q20Act(d,s,k,v){if(k==='g'){if(v===d.it)return p2Q20Show({...d,ql:[...d.ql,[s,'g',v,1]],qn:d.qn+1},s);return {...p2Q20After(d,[s,'g',v,0]),last:`${nm(d,s)} خمّن غلط`};}
  return {...d,ph:'ans',cq:[s,k,v],turn:d.h,last:''};}
function p2Q20Ans(d,k,v){const I=p2TqIt(d.it);if(!I)return 3;if(k==='c')return (d.it>>4)===v?1:0;if(k==='a')return (v>>4)===(d.it>>4)?I.v[v&15]:0;return 3;}
GAMES.p_20q={name:'عشرين سؤال',cat:'party',lbc:'#16A085',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1ABC9C"/><circle cx="50" cy="52" r="34" fill="#fff"/><text x="50" y="66" font-size="38" font-weight="900" text-anchor="middle" fill="#117A65">20</text><text x="22" y="30" font-size="22" font-weight="900" fill="#F4D03F">؟</text><text x="80" y="88" font-size="20" font-weight="900" fill="#F4D03F">؟</text><path d="M28 80l-8 10M72 20l8-10" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  init:n=>({ph:'pick',k:0,H:n*(n<=2?2:1),h:0,it:-1,ch:[],qn:0,ql:[],cq:null,ak:0,gw:-1,pts:Array(n).fill(0),last:''}),
  start:d=>p2Q20Hold(d,0),
  points:p2Pts,winExtra:p2WinX,
  // online the thing (and the three it was picked from) stays with the one who holds it
  mask(d,seat){if(d.win!=null||d.ph==='show'||seat===d.h&&seat>=0)return d;return {...d,it:-1,ch:d.ch.map(()=>-1)};},
  net:{local:['tab','gc','peek'],ui:['p2tab','p2gc']},
  viewer:d=>d.win==null&&d.ph==='pick'&&!isBot(d,d.h)?d.h:null,
  coverMsg:()=>'دورك تختار الشي السري',
  onSkip(nd){if(nd.win!=null)return nd;if(nd.out[nd.h]==='1')return p2Q20Next({...nd,last:`${nm(nd,nd.h)} طلع`});
    if(nd.ph==='ask'&&nd.out[nd.ak]==='1'){const ak=p2Q20Asker(nd,nd.ak);return {...nd,ak,turn:ak};}return nd;},
  onTimeout(d){if(d.ph==='pick')return {...d,it:p2Pick(d.ch),ph:'ask',ak:p2Q20Asker(d,d.h),turn:p2Q20Asker(d,d.h)};if(d.ph==='ask')return {...p2Q20After(d,[d.ak,'t','(ما سأل)',3])};
    if(d.ph==='ans'){const [s,k,v]=d.cq;return p2Q20After(d,[s,k,v,3]);}if(d.ph==='show')return p2Q20Next(d);return d;},
  status(d,ctx){const hd=`<small>${nm(d,d.h)} ماسك الشي • سؤال ${Math.min(P2Q20,d.qn+(d.ph==='ans'?1:0))} من ${P2Q20}${d.last?' • '+d.last:''}</small><br>`;const me=s=>!ctx.local&&ctx.v===s;
    if(d.ph==='pick')return `${me(d.h)?'<b class="yt">أنت</b>':nameTag(d,d.h)} يختار شي سري`;
    if(d.ph==='ask')return hd+`${me(d.ak)?'<b class="yt">دورك تسأل</b>':`${nameTag(d,d.ak)} يسأل`}`;
    if(d.ph==='ans')return hd+`${me(d.h)?'<b class="yt">جاوب</b>':`${nameTag(d,d.h)} يجاوب`}`;
    const I=p2TqIt(d.it);return d.gw>=0?`${nameTag(d,d.gw)} عرفها: ${I?I.w:''} ${I?I.em:''}`:`ما عرفوها! كانت ${I?I.w:''} ${I?I.em:''}`;},
  render(d,ctx){const v=ctx.v,I=p2TqIt(d.it);let h='<div class="p2 p2-q20">';
    if(d.ph==='pick'){if(ctx.local&&!isBot(d,d.h)||v===d.h&&!isBot(d,d.h))return h+`<p class="p2-lead">اختر الشي السري، والباقين بيحاولون يعرفونه بـ ${P2Q20} سؤال</p><div class="p2-pick3">${d.ch.map((x,k)=>{const J=p2TqIt(x);return J?`<button class="p2-thing" data-ga="it" data-i="${k}"><span>${J.em}</span><b>${J.w}</b><small>${P2Q[x>>4].c}</small></button>`:'';}).join('')}</div></div>`;
      return h+`<div class="p2-wait"><div class="p2-cardback"><b>🤫</b></div><p>${nameTag(d,d.h)} يختار شي سري…</p></div></div>`;}
    h+=`<div class="p2-q20top"><div class="p2-holder" style="--c:${col(d,d.h)}"><i>${shapeW(d.pl[d.h])}</i><span>${nm(d,d.h)}</span></div><div class="p2-secret">${d.ph==='show'&&I?`<span>${I.em}</span><b>${I.w}</b>`:v===d.h&&I&&!ctx.local?`<span>${I.em}</span><b>${I.w}</b><small>شيّك السري</small>`:'<span>🤫</span><b>شي سري</b>'}</div>
      <div class="p2-dots">${Array.from({length:P2Q20},(_,k)=>`<i class="${k<d.qn?(d.ql[k]&&d.ql[k][3]===1?'y':d.ql[k]&&d.ql[k][3]===0?'n':'u'):''}"></i>`).join('')}</div></div>`;
    if(ctx.local&&d.ph!=='show'&&I&&!isBot(d,d.h))h+=`<button class="sm p2-peek" data-ga="peek">${S.p2peek&&Date.now()-S.p2peek<2500?`${I.em} ${I.w}`:`👁 ${nm(d,d.h)} يشيّك على الشي`}</button>`;
    const kn=p2Q20Known(d);
    if(d.ph==='ask'){const me=ctx.local&&!isBot(d,d.ak)||v===d.ak&&!isBot(d,d.ak);
      if(me){const tab=S.p2tab||'q';h+=`<div class="p2-tabs"><button class="${tab==='q'?'on':''}" data-ga="tab" data-i="0">❓ أسئلة</button>${isBot(d,d.h)?'':`<button class="${tab==='t'?'on':''}" data-ga="tab" data-i="1">✍️ سؤال من عندك</button>`}<button class="${tab==='g'?'on':''}" data-ga="tab" data-i="2">🎯 خمّن</button></div>`;
        if(tab==='t'&&!isBot(d,d.h))h+=`<div class="p2-guess"><input class="field" data-draft="p2q" data-enter="tq" maxlength="40" value="${escH(S.draft.p2q||'')}" placeholder="سؤال جوابه نعم أو لا" autocomplete="off"><button class="btn red" data-ga="tq">اسأل</button></div>`;
        else if(tab==='g'){const gc=kn>=0?kn:(S.p2gc!=null&&P2Q[S.p2gc]?S.p2gc:-1);
          if(kn<0)h+=`<div class="p2-chips">${P2Q.map((C,c)=>`<button class="${gc===c?'on':''}" data-ga="gc" data-i="${c}">${C.e} ${C.c}</button>`).join('')}</div>`;
          if(gc>=0)h+=`<div class="p2-things">${P2Q[gc].items.map((J,i)=>{const x=gc*16+i,wr=p2Q20Asked(d,'g',x);return `<button class="p2-thing sm2 ${wr?'no':''}" data-ga="g" data-i="${x}" ${wr?'disabled':''}><span>${J.em}</span><b>${J.w}</b></button>`;}).join('')}</div>`;
          else h+='<p class="note">اختر النوع وبعدها الشي</p>';}
        else{h+=`<div class="p2-qs">${P2Q.map((C,c)=>{const e=p2Q20Asked(d,'c',c);return `<button class="p2-q ${e?'done':''}" data-ga="q" data-i="${c}" ${e?'disabled':''}>هو ${C.c}؟ ${e?p2Chip(e[3]):''}</button>`;}).join('')}</div>`;
          if(kn>=0)h+=`<p class="p2-lead small">${P2Q[kn].e} أسئلة عن ${P2Q[kn].c}</p><div class="p2-qs">${P2Q[kn].q.map((q,i)=>{const x=kn*16+i,e=p2Q20Asked(d,'a',x);return `<button class="p2-q ${e?'done':''}" data-ga="q" data-i="${100+x}" ${e?'disabled':''}>${q} ${e?p2Chip(e[3]):''}</button>`;}).join('')}</div>`;
          else h+='<p class="note">لما تعرفون النوع تنفتح أسئلته</p>';}}
      else h+=`<p class="p2-lead small">${nm(d,d.ak)} يفكر بسؤال…</p>`;}
    if(d.ph==='ans'){const [s,k,val]=d.cq;h+=`<div class="p2-ask" style="--c:${col(d,s)}" data-k="q${d.qn}"><small>${nm(d,s)} يسأل</small><b>${p2Q20Txt(k,val)}</b></div>`;
      if((ctx.local||v===d.h)&&!isBot(d,d.h))h+=`<div class="p2-yn"><button class="yes" data-ga="a" data-i="1">نعم</button><button class="no" data-ga="a" data-i="0">لا</button><button class="mid" data-ga="a" data-i="2">أحيانًا</button><button class="idk" data-ga="a" data-i="3">ما أدري</button></div>`;
      else h+=`<p class="note">${nm(d,d.h)} يجاوب…</p>`;}
    if(d.ph==='show'){h+=`<div class="p2-reveal"><span>${I?I.em:''}</span><b>${I?I.w:''}</b><small>${I?P2Q[d.it>>4].c:''}</small><p>${d.gw>=0?`🎯 ${nm(d,d.gw)} عرفها بعد ${d.qn} سؤال`:`🏆 ${nm(d,d.h)} صمد ${P2Q20} سؤال`}</p></div>`;
      if(d.win==null)h+=(ctx.local||v===d.turn)?`<button class="big" data-ga="next">${d.k+1>=d.H?'النتيجة 🏆':'اللي بعده يمسك ←'}</button>`:'<p class="note">الجولة الجاية بعد شوي</p>';}
    // the questions so far, newest first
    if(d.ql.length)h+=`<ul class="p2-log">${d.ql.map((e,k)=>[e,k]).reverse().map(([[s,k,val,a],j])=>`<li data-k="lg${j}" style="--c:${col(d,s)}"><small>${nm(d,s)}</small><span>${p2Q20Txt(k,val)}</span>${k==='g'?(a===1?'<b class="p2-ans yes">صح 🎯</b>':'<b class="p2-ans no">غلط</b>'):p2Chip(a)}</li>`).join('')}</ul>`;
    return h+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='tab'){S.p2tab=['q','t','g'][i]||'q';render();return;}
    if(a==='gc'){S.p2gc=i;render();return;}
    if(a==='peek'){S.p2peek=Date.now();render();setTimeout(render,2600);return;}
    if(a==='it'&&d.ph==='pick'&&(ctx.local||v===d.h)&&d.ch[i]!=null&&d.ch[i]>=0){const ak=p2Q20Asker(d,d.h);act({...d,it:d.ch[i],ph:'ask',ak,turn:ak,last:''});return;}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(p2Q20Next(d));return;}
    if(d.ph==='ask'&&(ctx.local||v===d.ak)&&!isBot(d,d.ak)){const s=d.ak;
      if(a==='q'){if(i<100){if(!P2Q[i]||p2Q20Asked(d,'c',i))return;act(p2Q20Act(d,s,'c',i));return;}const x=i-100,kn=p2Q20Known(d);if((x>>4)!==kn||!P2Q[kn].q[x&15]||p2Q20Asked(d,'a',x))return;act(p2Q20Act(d,s,'a',x));return;}
      if(a==='tq'){if(isBot(d,d.h))return;const t=p2T(S.draft.p2q,40);if(t.length<3){toast('اكتب سؤالك أول');return;}S.draft.p2q='';act(p2Q20Act(d,s,'t',t));return;}
      if(a==='g'&&p2TqIt(i)&&!p2Q20Asked(d,'g',i)){S.p2tab='q';act(p2Q20Act(d,s,'g',i));return;}}
    if(a==='a'&&d.ph==='ans'&&(ctx.local||v===d.h)&&!isBot(d,d.h)&&[0,1,2,3].includes(i)){const [s,k,val]=d.cq;act(p2Q20After(d,[s,k,val,i]));}},
  bot(d,s,lv){if(d.ph==='pick'&&s===d.h){const ak=p2Q20Asker(d,d.h);return {...d,it:p2Pick(d.ch),ph:'ask',ak,turn:ak};}
    if(d.ph==='ans'&&s===d.h){const [a,k,v]=d.cq;return p2Q20After(d,[a,k,v,p2Q20Ans(d,k,v)]);}
    if(d.ph==='ask'&&s===d.ak)return p2Q20Bot(d,s,lv);
    if(d.ph==='show'&&s===d.turn)return p2Q20Next(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?3500:d.ph==='ans'?900:1400+rnd(1200),
  host(d){if(d.ph==='show'&&Date.now()-d.ts>12000)return p2Q20Next(d);return null;}};
HELP.p_20q='واحد يمسك شي سري (حيوان، أكل، غرض من البيت، وسيلة مواصلات، مكان أو مهنة) يختاره من ثلاث. الباقين يسألون بالدور أسئلة جوابها نعم أو لا: أول شي اسألوا عن النوع («هو حيوان؟»)، ولما ينعرف النوع تنفتح أسئلته الخاصة، وتقدر تكتب سؤال من عندك. اللي ماسك الشي يجاوب بالأزرار: نعم، لا، أحيانًا، ما أدري. في أي دور تقدر تخمّن الشي بدل السؤال، والتخمين الغلط ينحسب سؤال. اللي يعرفه ياخذ 3 نقاط (و4 لو قبل السؤال العاشر)، ولو خلصت العشرين سؤال بدون ما يعرفونه ياخذ الماسك 3 نقاط. كل واحد يمسك مرة (ومرتين لو كنتوا اثنين). مع الفرق: نقاط الفريق تنجمع.';

/* =====================================================================================================
   مين أنا (p_who): every player has a card everyone can see but its owner. In your turn ask one yes/no question
   about your own card (the next player answers) or guess it from the list. The first to name their own card wins.
   ===================================================================================================== */
const p2WhoAns=(d,s)=>nextSeat(d,s);
function p2WhoNextAsk(d,from){return {...d,ph:'ask',ask:nextSeat(d,from),turn:nextSeat(d,from),cq:-1};}
// what seat s may still be: not a card it sees on someone else, not a wrong guess, and fits the answers about it
function p2WhoCands(d,s){const C=P2Q[d.c];const seen=new Set(d.cd.filter((x,t)=>t!==s&&x>=0));const wr=new Set(d.wr.filter(e=>e[0]===s).map(e=>e[1]));
  const sc=C.items.map((I,i)=>{if(seen.has(i)||wr.has(i))return [i,-1];let bad=0;for(const [a,q,ans] of d.ql)if(a===s&&!p2TqFit(I.v[q],ans))bad++;return [i,bad];}).filter(e=>e[1]>=0);
  const mn=Math.min(...sc.map(e=>e[1]));return sc.filter(e=>e[1]===mn).map(e=>e[0]);}
function p2WhoGuess(d,s,i){if(d.cd[s]===i)return {...d,ph:'end',win:s,gs:[s,i],last:`${nm(d,s)} عرف نفسه!`};return {...p2WhoNextAsk({...d,wr:[...d.wr,[s,i]].slice(-40)},s),last:`${nm(d,s)} خمّن ${P2Q[d.c].items[i].w} وطلع غلط`};}
GAMES.p_who={name:'مين أنا',cat:'party',lbc:'#2E86C1',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3498DB"/><circle cx="50" cy="62" r="24" fill="#FAD7A0"/><path d="M26 92c2-10 12-14 24-14s22 4 24 14z" fill="#2D4763"/><rect x="30" y="14" width="40" height="30" rx="5" fill="#fff" stroke="#2D4763" stroke-width="3"/><text x="50" y="38" font-size="22" font-weight="900" text-anchor="middle" fill="#E74C3C">؟</text><path d="M28 42h44" stroke="#2D4763" stroke-width="3"/><circle cx="42" cy="62" r="3" fill="#2D4763"/><circle cx="58" cy="62" r="3" fill="#2D4763"/><path d="M44 72q6 4 12 0" stroke="#2D4763" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  init:n=>({ph:'ask',c:0,cd:Array(n).fill(-1),ql:[],wr:[],ask:0,cq:-1,gs:null,last:''}),
  start(d){const c=p2Fresh('whoc',P2Q.length);const cd=p2Sh(P2Q[c].items.map((_,i)=>i)).slice(0,d.pl.length);return {...d,c,cd,ask:d.st,turn:d.st};},
  // your own card is the one thing you never see; the public frame shows nobody's
  mask(d,seat){if(d.win!=null)return d;return {...d,cd:d.cd.map((x,s)=>seat>=0&&s!==seat?x:-1)};},
  net:{local:['wtab'],ui:['p2wt']},
  viewer:d=>d.win!=null?null:d.ph==='ask'?(isBot(d,d.ask)?null:d.ask):(isBot(d,d.turn)?null:d.turn),
  coverMsg:d=>d.ph==='ans'?`${nm(d,d.ask)} يسألك عن بطاقته`:'دورك تسأل عن بطاقتك',
  winText:d=>typeof d.win==='number'?`${nm(d,d.win)} عرف مين هو! 🎯`:null,
  winExtra:d=>d.pl.map((_,s)=>{const I=P2Q[d.c].items[d.cd[s]];return `${nm(d,s)}: ${I?I.em+' '+I.w:''}`;}).join('، '),
  onSkip(nd){if(nd.win!=null)return nd;if(nd.ph==='ans'&&(nd.out[nd.ask]==='1'||nd.out[nd.turn]==='1'))return p2WhoNextAsk(nd,nd.ask);if(nd.ph==='ask'&&nd.out[nd.ask]==='1')return p2WhoNextAsk(nd,nd.ask);return nd;},
  onTimeout(d){if(d.ph==='ask')return {...p2WhoNextAsk(d,d.ask),last:`${nm(d,d.ask)} ما لحق يسأل`};return {...p2WhoNextAsk({...d,ql:[...d.ql,[d.ask,d.cq,3]].slice(-60)},d.ask)};},
  status(d,ctx){const me=s=>!ctx.local&&ctx.v===s;const top=`<small>كلكم من نوع: ${P2Q[d.c].e} ${P2Q[d.c].c}${d.last?' • '+d.last:''}</small><br>`;
    if(d.ph==='ask')return top+(me(d.ask)?'<b class="yt">دورك: اسأل عن بطاقتك أو خمّنها</b>':`${nameTag(d,d.ask)} يسأل عن بطاقته`);
    return top+(me(d.turn)?`<b class="yt">جاوب ${nm(d,d.ask)}</b>`:`${nameTag(d,d.turn)} يجاوب ${nameTag(d,d.ask)}`);},
  render(d,ctx){const v=ctx.v,C=P2Q[d.c];let h='<div class="p2 p2-who">';const fin=d.win!=null;
    // everyone's cards on their foreheads: yours shows «؟»
    const look=fin?-9:d.ph==='ask'?(ctx.local?d.ask:v):(ctx.local?d.turn:v);
    h+=`<div class="p2-heads n${d.pl.length}">${d.pl.map((r,s)=>{const x=d.cd[s];const I=x>=0?C.items[x]:null;const mine=s===look||(!fin&&ctx.local&&d.ph==='ask'&&s===d.ask);
      const show=I&&(!mine||fin);return `<div class="p2-head ${s===d.ask&&!fin?'on':''} ${d.out[s]==='1'?'out':''} ${fin&&s===d.win?'won':''}" style="--c:${COLS[r]}"><div class="p2-fcard">${show?`<span>${I.em}</span><b>${I.w}</b>`:'<span>❓</span><b>؟؟</b>'}</div><i>${shapeW(r)}</i><small>${s===v&&!ctx.local?'أنت':nm(d,s)}</small></div>`;}).join('')}</div>`;
    if(fin)return h+'</div>';
    const myQ=s=>d.ql.filter(e=>e[0]===s);
    if(d.ph==='ask'){const s=d.ask;const me=(ctx.local||v===s)&&!isBot(d,s);
      if(me){const tab=S.p2wt||'q';h+=`<div class="p2-tabs"><button class="${tab==='q'?'on':''}" data-ga="wtab" data-i="0">❓ اسأل عن بطاقتي</button><button class="${tab==='g'?'on':''}" data-ga="wtab" data-i="1">🎯 أعرف مين أنا</button></div>`;
        if(tab==='g'){const seen=new Set(d.cd.filter((x,t)=>t!==s));h+=`<div class="p2-things">${C.items.map((I,i)=>{const wr=d.wr.some(e=>e[0]===s&&e[1]===i);const tk=seen.has(i);const who=tk?d.cd.indexOf(i):-1;
            return `<button class="p2-thing sm2 ${wr||tk?'no':''}" data-ga="wg" data-i="${i}" ${wr||tk?'disabled':''}><span>${I.em}</span><b>${I.w}</b>${tk?`<small>مع ${nm(d,who)}</small>`:wr?'<small>غلط ✗</small>':''}</button>`;}).join('')}</div>`;}
        else h+=`<div class="p2-qs">${C.q.map((q,i)=>{const e=myQ(s).find(x=>x[1]===i);return `<button class="p2-q ${e?'done':''}" data-ga="wq" data-i="${i}">${q} ${e?p2Chip(e[2]):''}</button>`;}).join('')}</div>`;}
      else h+=`<p class="p2-lead small">${nm(d,s)} يفكر…</p>`;}
    else{const s=d.ask,a=d.turn;h+=`<div class="p2-ask" style="--c:${col(d,s)}" data-k="wq${d.ql.length}"><small>${nm(d,s)} يسأل عن بطاقته</small><b>${C.q[d.cq]||''}</b></div>`;
      if((ctx.local||v===a)&&!isBot(d,a)){const I=C.items[d.cd[s]];h+=`${I?`<p class="p2-lead small">بطاقة ${nm(d,s)}: ${I.em} <b>${I.w}</b></p>`:''}<div class="p2-yn"><button class="yes" data-ga="wa" data-i="1">نعم</button><button class="no" data-ga="wa" data-i="0">لا</button><button class="mid" data-ga="wa" data-i="2">أحيانًا</button></div>`;}
      else h+=`<p class="note">${nm(d,a)} يجاوب…</p>`;}
    // what each one learned about their own card
    const rows=d.pl.map((_,s)=>{const q=myQ(s);if(!q.length&&!d.wr.some(e=>e[0]===s))return '';return `<li style="--c:${col(d,s)}"><small>${nm(d,s)}</small><span>${q.slice(-4).map(([,qi,a])=>`${C.q[qi]} ${p2Chip(a)}`).join(' ')}${d.wr.filter(e=>e[0]===s).map(e=>`<i class="p2-x">✗ ${C.items[e[1]].w}</i>`).join('')}</span></li>`;}).join('');
    if(rows)h+=`<ul class="p2-log">${rows}</ul>`;
    return h+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='wtab'){S.p2wt=i===1?'g':'q';render();return;}
    if(d.ph==='ask'&&(ctx.local||v===d.ask)&&!isBot(d,d.ask)){const s=d.ask;
      if(a==='wq'&&P2Q[d.c].q[i]){act({...d,ph:'ans',cq:i,turn:p2WhoAns(d,s),last:''});return;}
      if(a==='wg'&&P2Q[d.c].items[i]&&!d.cd.some((x,t)=>t!==s&&x===i)&&!d.wr.some(e=>e[0]===s&&e[1]===i)){S.p2wt='q';act(p2WhoGuess(d,s,i));return;}}
    if(a==='wa'&&d.ph==='ans'&&(ctx.local||v===d.turn)&&!isBot(d,d.turn)&&[0,1,2].includes(i)){act(p2WhoNextAsk({...d,ql:[...d.ql,[d.ask,d.cq,i]].slice(-60)},d.ask));}},
  bot(d,s,lv){const C=P2Q[d.c];
    if(d.ph==='ans'&&s===d.turn){const I=C.items[d.cd[d.ask]];let a=I?I.v[d.cq]:0;if(lv===1&&Math.random()<.08)a=1-Math.min(1,a);return p2WhoNextAsk({...d,ql:[...d.ql,[d.ask,d.cq,a]].slice(-60)},d.ask);}
    if(d.ph!=='ask'||s!==d.ask)return d;const cands=p2WhoCands(d,s);if(!cands.length)return p2WhoNextAsk(d,s);
    const lim=[0,3,2,1][lv];if(cands.length<=lim&&(lv>1||Math.random()<.6))return p2WhoGuess(d,s,p2Pick(cands));
    const asked=d.ql.filter(e=>e[0]===s).map(e=>e[1]);const qs=C.q.map((_,i)=>i);
    let q=lv===1&&Math.random()<.5?p2Pick(qs):p2TqBest(cands,qs,(x,qi)=>C.items[x].v[qi],asked);
    if(q==null)return p2WhoGuess(d,s,p2Pick(cands));return {...d,ph:'ans',cq:q,turn:p2WhoAns(d,s),last:''};},
  botDelay:(d,s,lv)=>d.ph==='ans'?1000:1400+rnd(1200)};
HELP.p_who='كل واحد تطلع له بطاقة (كلكم من نفس النوع: حيوانات أو أكل أو مهن…) يشوفها الكل إلا هو! بدورك اسأل سؤال عن بطاقتك جوابه نعم أو لا («يطير؟»)، واللي بعدك يجاوبك وهو شايف بطاقتك. أو إذا عرفت مين أنت اختارها من القائمة: البطاقات اللي مع غيرك مستحيل تكون لك، والتخمين الغلط يروح دورك. أول واحد يعرف بطاقته يفوز. على جوال واحد: اللي يسأل ما يشوف إلا بطاقات الباقين، وبعدها ينعطى الجوال للي يجاوب.';

/* =====================================================================================================
   ربط الكلمات (p_link): a hidden word comes with five linked words (the last one is its emoji). Players bid how few
   of them they need («أعرفها بثلاث!»); the lowest bidder opens up to that many and must name the word.
   Right: 6 minus the bid in points. Wrong: the points go to the one they outbid last.
   ===================================================================================================== */
const p2LkAs=w=>{const E=P2W[w];return E?[E.fb[3],E.fb[2],E.fb[1],E.fb[0],E.em]:[];};
function p2LkElig(d){return aliveSeats(d).filter(s=>d.by<0||!sameTeam(d,s,d.by));}
function p2LkNextBid(d,from){const el=p2LkElig(d).filter(s=>!d.ps.includes(s));let s=from;for(let j=0;j<d.pl.length;j++){s=nextSeat(d,s);if(el.includes(s))return s;}return -1;}
function p2LkCard(d,cn,sb){const w=p2Fresh('lk',P2W.length,d.used);return {...d,ph:'bid',cn,sb,turn:sb,w,bid:6,by:-1,pv:-1,ps:[],rv:0,ra:[],gs:null,used:[...(d.used||[]),w].slice(-90),last:''};}
function p2LkBid(d,s,b){if(b<1||b>=d.bid)return d;const x={...d,bid:b,pv:d.by>=0&&!sameTeam(d,d.by,s)?d.by:d.pv,by:s,ps:[],last:`${nm(d,s)} يقول: أعرفها بـ ${b}`};
  if(b===1)return p2LkPlay(x);const nx=p2LkNextBid(x,s);return nx<0?p2LkPlay(x):{...x,turn:nx};}
function p2LkPass(d,s){const x={...d,ps:[...d.ps,s],last:`${nm(d,s)} خلّاها له`};const nx=p2LkNextBid(x,s);return nx<0?p2LkPlay(x):{...x,turn:nx};}
function p2LkPlay(d){const x={...d,ph:'play',turn:d.by,rv:0,ra:[]};return p2LkReveal(x);}
function p2LkReveal(d){if(d.rv>=d.bid)return d;const A=p2LkAs(d.w);return {...d,rv:d.rv+1,ra:[...d.ra,A[d.rv]]};}
function p2LkGuess(d,txt){const E=P2W[d.w];const ok=!!E&&p2Match(E.alts,txt)===2;const P=[...d.pts];const pr=6-d.bid;let last;
  if(ok){P[d.by]+=pr;last=`${nm(d,d.by)} عرفها وأخذ ${pr}`;}else if(d.pv>=0&&d.out[d.pv]!=='1'){P[d.pv]+=pr;last=`غلط! النقاط (${pr}) راحت لـ ${nm(d,d.pv)}`;}else last='غلط! وما أحد ياخذ النقاط';
  return {...d,ph:'show',pts:P,gs:[p2T(txt,24),ok?1:0],ts:Date.now(),last};}
function p2LkNext(d){const cn=d.cn+1;if(cn>=d.C)return {...d,ph:'end',win:mostPts(d.pts)};return p2LkCard(d,cn,nextSeat(d,d.sb));}
// what a well-read bot makes of the linked words it has seen: the cards that share the most of them
function p2LkCands(ra){const R=ra.map(p2N);let best=-1,out=[];P2W.forEach((E,i)=>{const A=p2LkAs(i).map(p2N);const sc=R.filter(r=>A.includes(r)).length;if(sc>best){best=sc;out=[i];}else if(sc===best)out.push(i);});return {best,out};}
GAMES.p_link={name:'ربط الكلمات',cat:'party',lbc:'#1E8449',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#27AE60"/><rect x="8" y="16" width="38" height="24" rx="6" fill="#fff"/><rect x="54" y="60" width="38" height="24" rx="6" fill="#fff"/><path d="M22 28h10M68 72h10" stroke="#1E8449" stroke-width="5" stroke-linecap="round"/><rect x="34" y="40" width="20" height="12" rx="6" fill="none" stroke="#F4D03F" stroke-width="6" transform="rotate(40 44 46)"/><rect x="46" y="50" width="20" height="12" rx="6" fill="none" stroke="#F4D03F" stroke-width="6" transform="rotate(40 56 56)"/><text x="78" y="30" font-size="22" font-weight="900" fill="#fff">؟</text></svg>`,
  init:n=>({ph:'bid',cn:0,C:n<=3?8:n<=5?10:12,sb:0,w:-1,bid:6,by:-1,pv:-1,ps:[],rv:0,ra:[],gs:null,used:[],pts:Array(n).fill(0),last:''}),
  start:d=>p2LkCard(d,0,d.st),
  points:p2Pts,winExtra:p2WinX,
  // the hidden word is nobody's until the card is over (the linked words shown so far are in d.ra)
  mask(d,seat){if(d.win!=null||d.ph==='show')return d;return {...d,w:-1,used:d.used.map((x,i)=>i===d.used.length-1?-1:x)};},
  net:{local:[]},
  onSkip(nd){if(nd.win!=null)return nd;if(nd.ph==='play'&&nd.out[nd.by]==='1')return p2LkGuess(nd,'');if(nd.ph==='bid'&&nd.out[nd.turn]==='1')return nd.by>=0?p2LkPass(nd,nd.turn):p2LkCard(nd,nd.cn,nextSeat(nd,nd.sb));return nd;},
  onTimeout(d){if(d.ph==='bid')return d.by>=0?p2LkPass(d,d.turn):p2LkBid(d,d.turn,5);if(d.ph==='play')return p2LkGuess(d,'');return p2LkNext(d);},
  status(d,ctx){const me=s=>!ctx.local&&ctx.v===s;const top=`<small>البطاقة ${d.cn+1} من ${d.C}${d.last?' • '+d.last:''}</small><br>`;
    if(d.ph==='bid')return top+(me(d.turn)?'<b class="yt">دورك: كم كلمة تحتاج؟</b>':`${nameTag(d,d.turn)} يزايد`);
    if(d.ph==='play')return top+(me(d.by)?`<b class="yt">اكشف لين ${d.bid} وخمّن الكلمة</b>`:`${nameTag(d,d.by)} قال بـ ${d.bid}، ويكشف`);
    return top+(d.gs&&d.gs[1]?'✓ عرفها':'✗ ما عرفها');},
  render(d,ctx){const v=ctx.v,E=p2WbOf(d.w);let h='<div class="p2 p2-link">';const A=d.ph==='show'&&E?p2LkAs(d.w):d.ra;const tot=5;
    h+=`<div class="p2-chain">${Array.from({length:tot},(_,k)=>{const open=k<A.length;const lim=d.ph==='play'&&k<d.bid&&!open;return `<div class="p2-lnk ${open?'open':''} ${lim?'lim':''} ${k===4?'em':''}" data-k="lk${d.cn}_${k}"><small>${k+1}</small><b>${open?escH(A[k]):lim?'🔒':'؟'}</b></div>`;}).join('<i class="p2-ch"></i>')}</div>`;
    h+=`<div class="p2-target ${d.ph==='show'?(d.gs&&d.gs[1]?'ok':'no'):''}">${d.ph==='show'&&E?`<span>${E.em}</span><b>${E.w}</b><small>${E.cat}</small>`:'<span>🔗</span><b>الكلمة السرية</b>'}</div>`;
    if(d.ph==='bid'){const can=(ctx.local||v===d.turn)&&!isBot(d,d.turn);
      h+=`<div class="p2-bidnow">${d.by>=0?`<span style="--c:${col(d,d.by)}">${nm(d,d.by)}: أعرفها بـ <b>${d.bid}</b></span>`:'<span>ما أحد زايد للحين</span>'}</div>`;
      if(can)h+=`<p class="p2-lead small">${nm(d,d.turn)}، كم كلمة تحتاج عشان تعرفها؟</p><div class="p2-bids">${[5,4,3,2,1].map(b=>`<button data-ga="b" data-i="${b}" ${b<d.bid?'':'disabled'}><b>${b}</b><small><span class="p2-num">+${6-b}</span></small></button>`).join('')}</div>${d.by>=0?`<button class="btn soft wide" data-ga="pass">خلّها له 👋</button>`:''}`;
      else h+=`<p class="note">${nm(d,d.turn)} يفكر…</p>`;}
    if(d.ph==='play'){const can=(ctx.local||v===d.by)&&!isBot(d,d.by);
      if(can)h+=`<div class="p2-row"><button class="btn soft" data-ga="rv" ${d.rv<d.bid?'':'disabled'}>اكشف كلمة (${d.rv}/${d.bid})</button></div><div class="p2-guess"><input class="field" data-draft="p2lg" data-enter="lg" maxlength="24" value="${escH(S.draft.p2lg||'')}" placeholder="وش الكلمة؟" autocomplete="off" enterkeyhint="send"><button class="btn red" data-ga="lg">جاوب</button></div>`;
      else h+=`<p class="note">${nm(d,d.by)} يكشف ويفكر… (${d.rv} من ${d.bid})</p>`;}
    if(d.ph==='show'){h+=`<p class="p2-lead">${d.gs&&d.gs[0]?`جواب ${nm(d,d.by)}: «${escH(d.gs[0])}»`:''} ${d.gs&&d.gs[1]?'✓':'✗'}</p><p class="note">${escH(d.last)}</p>`;
      if(d.win==null)h+=(ctx.local||v===d.turn)&&!isBot(d,d.turn)?`<button class="big" data-ga="next">${d.cn+1>=d.C?'النتيجة 🏆':'البطاقة الجاية ←'}</button>`:'<p class="note">البطاقة الجاية بعد شوي</p>';}
    return h+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(d.ph==='bid'&&(ctx.local||v===d.turn)&&!isBot(d,d.turn)){if(a==='b'&&i>=1&&i<d.bid){act(p2LkBid(d,d.turn,i));return;}if(a==='pass'&&d.by>=0){act(p2LkPass(d,d.turn));return;}}
    if(d.ph==='play'&&(ctx.local||v===d.by)&&!isBot(d,d.by)){if(a==='rv'&&d.rv<d.bid){act(p2LkReveal(d));return;}
      if(a==='lg'){const t=p2T(S.draft.p2lg,24);if(!t){toast('اكتب الكلمة أول');return;}S.draft.p2lg='';act(p2LkGuess(d,t));return;}}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(p2LkNext(d));}},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>9000)return p2LkNext(d);return null;},
  bot(d,s,lv){
    if(d.ph==='bid'&&d.turn===s){// how few linked words it trusts itself with
      const floor=[0,2+rnd(4),3,2][lv];if(d.by<0)return p2LkBid(d,s,Math.min(5,floor+1+(lv===1?0:rnd(2))));if(d.bid-1>=floor&&(lv>1||Math.random()<.7))return p2LkBid(d,s,d.bid-1);return p2LkPass(d,s);}
    if(d.ph==='play'&&d.by===s){const {best,out}=p2LkCands(d.ra);const sure=out.length===1&&best>=1;
      if(!sure&&d.rv<d.bid)return p2LkReveal(d);let pick;if(lv===3)pick=p2Pick(out);else if(lv===2)pick=Math.random()<.75?p2Pick(out):rnd(P2W.length);else pick=Math.random()<.45?p2Pick(out):rnd(P2W.length);
      return p2LkGuess(d,P2W[pick].w);}
    if(d.ph==='show'&&d.turn===s)return p2LkNext(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?4000:1300+rnd(1000)};
HELP.p_link='كل بطاقة فيها كلمة سرية مربوطة بخمس كلمات تطلع وحدة وحدة (أبعدها أول، والخامسة إيموجي). قبل ما ينكشف شي تزايدون بالدور: كم كلمة تحتاج عشان تعرفها؟ كل مزايدة لازم تكون أقل من اللي قبلها، أو تقول «خلّها له». لما الكل يخلّيها، صاحب أقل رقم يكشف لين رقمه ويكتب الكلمة. إذا عرفها ياخذ 6 ناقص رقمه (اللي قال واحد ياخذ 5). وإذا غلط تروح النقاط للي زايد عليه قبله. على جوال واحد قولوها بصوت عالي واللي عليه الدور يضغط. مع الفرق: الفريق يتشاور، وما تزايد على زميلك.';

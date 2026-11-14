'use strict';
/* ارسم وخمّن: one player draws a secret word and the others race to guess it.
   Online and against bots everyone types guesses and the drawing appears live on every phone.
   On one phone with friends, the others shout their guesses and the drawer taps whoever got it.
   Faster guesses score more, the drawer scores for every player who gets it, letter hints appear as time runs out. */

// words to draw: «main spelling/other spellings:emoji»
const PWB={
'حيوانات':'قطة/قط/بسة/قطوة:🐱,كلب:🐶,أسد:🦁,نمر:🐯,فيل:🐘,زرافة:🦒,جمل/بعير/ناقة:🐪,حصان/خيل:🐴,بقرة:🐄,خروف/غنم:🐑,ماعز/تيس/عنز:🐐,دجاجة/دجاج:🐔,ديك:🐓,بطة:🦆,بطريق:🐧,بومة:🦉,صقر/نسر:🦅,حمامة:🕊️,ببغاء:🦜,طاووس:🦚,سمكة/سمك:🐟,قرش:🦈,حوت:🐋,دولفين:🐬,أخطبوط:🐙,سلحفاة/سلحفاه:🐢,تمساح:🐊,ثعبان/حية:🐍,ضفدع:🐸,فأر/فار:🐭,أرنب:🐰,سنجاب:🐿️,قرد:🐒,غوريلا:🦍,دب:🐻,باندا:🐼,ثعلب:🦊,ذئب:🐺,وحيد القرن:🦏,كنغر:🦘,غزال:🦌,حمار وحشي:🦓,نحلة:🐝,فراشة:🦋,نملة:🐜,عنكبوت:🕷️,عقرب:🦂,حلزون:🐌,دعسوقة/خنفساء:🐞,سرطان/سلطعون:🦀,روبيان/جمبري:🦐,ديناصور:🦖,تنين:🐉,خفاش:🦇,قنفذ:🦔,بعوضة/بعوض:🦟,جرادة/جراد:🦗,فرس النهر:🦛',
'أكل':'تفاحة/تفاح:🍎,موز/موزة:🍌,برتقالة/برتقال:🍊,عنب:🍇,بطيخ/حبحب:🍉,فراولة:🍓,أناناس:🍍,مانجو:🥭,كرز:🍒,ليمون/ليمونة:🍋,جزر:🥕,طماطم/طماط:🍅,بطاطس/بطاطا:🥔,خيار:🥒,باذنجان:🍆,ذرة:🌽,فلفل:🌶️,فطر/مشروم:🍄,خبز/عيش:🍞,جبن/جبنة:🧀,بيضة/بيض:🥚,بيتزا:🍕,برجر/همبرجر:🍔,بطاطس مقلية/فرايز:🍟,شاورما:🌯,ساندويتش/سندويش:🥪,رز/كبسة:🍛,نودلز/اندومي:🍜,سوشي:🍣,كيك/كيكة/كعكة:🍰,كب كيك:🧁,دونات:🍩,بسكويت:🍪,شوكولاتة/شوكلت:🍫,حلاو/حلوى:🍬,آيس كريم/ايسكريم:🍦,فشار:🍿,عسل:🍯,حليب:🥛,قهوة:☕,شاي:🍵,عصير:🧃,لحم:🥩,دجاج مشوي/فخذ دجاج:🍗,ملح:🧂,فطيرة/بان كيك:🥞,مقلاة/قلاية:🍳,ثلج/مكعب ثلج:🧊',
'أشياء':'ساعة:⌚,منبه:⏰,جوال/موبايل/هاتف:📱,لابتوب/كمبيوتر:💻,تلفزيون/تلفاز:📺,كاميرا:📷,راديو:📻,لمبة/مصباح:💡,مفتاح:🔑,قفل:🔒,مقص:✂️,قلم:✏️,كتاب:📖,ظرف/رسالة:✉️,هدية:🎁,بالون:🎈,شمعة:🕯️,شمسية/مظلة:☂️,نظارة:👓,شنطة/حقيبة:👜,تاج:👑,خاتم:💍,جرس:🔔,مغناطيس:🧲,مطرقة/شاكوش:🔨,منشار:🪚,سلم/درج:🪜,مكنسة:🧹,صابون:🧼,مرآة/مراية:🪞,كرسي:🪑,سرير:🛏️,باب:🚪,سكين:🔪,ملعقة:🥄,كوب/كاس:🥤,إبريق/براد:🫖,ميزان:⚖️,ساعة رملية:⏳,بوصلة:🧭,خريطة:🗺️,علم:🚩,صاروخ:🚀,مايك/ميكروفون:🎤,سماعة:🎧,جيتار/قيتار:🎸,طبل:🥁,كمان:🎻,بيانو:🎹,نرد/زهر:🎲,بطارية:🔋,قنبلة:💣,سيف:🗡️,درع:🛡️,فانوس:🏮,صندوق/كرتون:📦,تلسكوب:🔭,مجهر/ميكروسكوب:🔬,دواء/حبة دواء:💊,إبرة/حقنة:💉,لوحة ألوان:🎨,تلفون/هاتف أرضي:☎️,جريدة:📰,تقويم:📅,دبوس:📌,مشبك:📎,مسطرة:📏,طفاية حريق:🧯,سلة:🧺,خيط:🧵,إسفنج/اسفنجة:🧽,طائرة ورقية/طيارة ورق:🪁,دبدوب/دمية:🧸,بلايستيشن/يد تحكم:🎮,محفظة/بوك:👛,شنطة سفر:🧳,روج/أحمر شفاه:💄',
'ملابس':'تيشيرت/قميص:👕,بنطلون/جينز:👖,فستان:👗,جزمة/حذاء/جوتي:👟,كعب:👠,كاب/قبعة:🧢,شراب/جوارب:🧦,قفازات/كفوف:🧤,سكارف/وشاح:🧣,كرفتة/ربطة عنق:👔',
'أماكن':'بيت/منزل:🏠,مدرسة:🏫,مستشفى:🏥,مسجد:🕌,قلعة:🏰,خيمة:⛺,جبل:⛰️,بركان:🌋,جزيرة:🏝️,شاطئ/بحر:🏖️,صحراء:🏜️,برج:🗼,جسر/كوبري:🌉,نافورة:⛲,ملعب/استاد:🏟️,مصنع:🏭,بنك:🏦,فندق:🏨,الكعبة/كعبة:🕋,ملاهي/دولاب:🎡,سيرك:🎪,محطة بنزين/بنزينة:⛽',
'طبيعة':'شمس:☀️,هلال:🌙,قمر/بدر:🌕,نجمة/نجم:⭐,سحابة/غيمة:☁️,مطر:🌧️,رجل ثلج:⛄,برق:⚡,قوس قزح:🌈,إعصار/زوبعة:🌪️,موجة:🌊,نار:🔥,شجرة:🌳,نخلة:🌴,صبار:🌵,وردة/زهرة:🌹,دوار الشمس/عباد الشمس:🌻,ورقة شجر:🍁,قطرة/قطرة ماء:💧,كوكب/زحل:🪐,الأرض/الكرة الأرضية:🌍,نيزك/شهاب:☄️,صخرة/حجر:🪨,قمح/سنابل:🌾',
'مواصلات':'سيارة:🚗,تاكسي:🚕,باص/حافلة:🚌,إسعاف:🚑,مطافي/سيارة إطفاء:🚒,سيارة شرطة/دورية:🚓,شاحنة/تريلا:🚚,سيكل/دراجة:🚲,دباب/دراجة نارية/موتر:🏍️,قطار:🚆,طيارة/طائرة:✈️,هليكوبتر/مروحية:🚁,سفينة:🚢,قارب/سفينة شراعية:⛵,تراكتور/جرار:🚜,سكوتر:🛴,إشارة مرور/إشارة:🚦,باراشوت/مظلة هبوط:🪂',
'جسم':'عين:👁️,أذن/اذن:👂,خشم/أنف:👃,فم/شفايف:👄,يد/كف:✋,قدم/رجل:🦶,قلب:❤️,مخ/دماغ:🧠,سن/ضرس:🦷,عظمة:🦴,عضلة/عضلات:💪',
'شخصيات':'دكتور/طبيب:👨‍⚕️,شرطي/شرطة:👮,إطفائي/رجل إطفاء:🧑‍🚒,طباخ/شيف:👨‍🍳,مزارع/فلاح:👨‍🌾,رائد فضاء:👨‍🚀,طيار:👨‍✈️,معلم/أستاذ:👨‍🏫,نينجا:🥷,ملك:🤴,ملكة/أميرة:👸,عروس:👰,مهرج:🤡,ساحر:🧙,شبح:👻,روبوت:🤖,كائن فضائي/فضائي:👽,مارد/جني:🧞,حورية بحر:🧜‍♀️,بطل خارق/سوبرمان:🦸,زومبي:🧟,قرصان:🏴‍☠️',
'رياضة':'كرة قدم/كورة:⚽,كرة سلة:🏀,تنس:🎾,بولينج:🎳,جولف:⛳,سباحة:🏊,ملاكمة:🥊,كاراتيه:🥋,تزلج:⛷️,ركوب الأمواج/سيرف:🏄,صيد السمك/صنارة:🎣,قوس وسهم/سهم:🏹,كأس:🏆,ميدالية:🏅,بلياردو:🎱,تنس طاولة/بينج بونج:🏓,كرة طائرة:🏐,رفع أثقال/حديد:🏋️,سباق/علم السباق:🏁,ألعاب نارية:🎆'};
// more words, kept after the first list so a word's number stays the same
const PWB2={
'حيوانات':'لاما/ألبكة:🦙,كوالا:🐨,هامستر:🐹,فقمة:🦭,قندس:🦫,ثور:🐂,جاموس:🐃,بجعة:🦢,فلامنغو/نحام:🦩,ديك رومي/حبش:🦃,كتكوت/صوص:🐤,دودة:🪱,سمكة البالون/سمكة منتفخة:🐡,ماموث:🦣,راكون:🦝,فهد:🐆,ضب/سحلية:🦎,سمكة ملونة/سمكة استوائية:🐠',
'أكل':'خبز فرنسي/باقيت:🥖,كرواسون:🥐,هوت دوق/هوت دوج:🌭,فلافل:🧆,سلطة:🥗,شوربة/حساء:🍲,أفوكادو:🥑,جوز هند:🥥,كيوي:🥝,خوخ/دراق:🍑,كمثرى/إجاص:🍐,بروكلي:🥦,بصل:🧅,ثوم:🧄,فول سوداني:🥜,كستناء:🌰,بطاطا حلوة:🍠,زبدة:🧈,وافل:🧇,مصاصة/مصاص:🍭,فلفل رومي/فليفلة:🫑',
'أشياء':'مسبحة/سبحة:📿,دش:🚿,بانيو/حوض استحمام:🛁,مرساة:⚓,فلوس/ورقة نقدية:💵,بطاقة بنكية/كرت:💳,مفك:🪛,برغي/صامولة:🔩,مفتاح ربط/مفتاح انجليزي:🔧,فأس:🪓,سلسلة/جنزير:⛓️,أكياس تسوق/كيس:🛍️,عربة تسوق/عربية:🛒,نظارة شمسية:🕶️,ميزان حرارة/ترمومتر:🌡️,عدسة مكبرة/مكبر:🔍,كشاف/مصباح يدوي:🔦,معداد/عداد:🧮,قلم حبر/ريشة:🖋️,فرشاة رسم:🖌️,لاصق جروح/بلاستر:🩹,سماعة طبيب:🩺,رضاعة:🍼,سطل/دلو:🪣,ملف/مجلد:📁,كتب:📚,دفتر:📓,تذكرة:🎫,كاميرا فيديو:📹,يويو:🪀,قطعة شطرنج/شطرنج:♟️,بازل/أحجية:🧩,بوق/ترومبيت:🎺,ساكسفون:🎷',
'ملابس':'جاكيت/معطف:🧥,كيمونو:👘,خوذة:⛑️,قبعة تخرج:🎓,نعال/شبشب:🩴,بوت/جزمة طويلة:👢,شورت:🩳,ملابس سباحة/مايوه:🩱,شنطة ظهر/حقيبة ظهر:🎒,برنيطة/قبعة رسمية:🎩,سترة نجاة:🦺,نظارة غوص:🥽',
'أماكن':'محطة قطار:🚉,مطار:🛫,كوخ:🛖,مخيم/تخييم:🏕️,مدينة/ناطحات سحاب:🏙️,مول/مجمع تجاري:🏬,بقالة/دكان:🏪,بريد/مكتب بريد:🏤,حديقة/منتزه:🏞️,طريق/شارع:🛣️,سكة قطار/سكة حديد:🛤️,تمثال الحرية:🗽,حمام سباحة/مسبح:🏊‍♂️',
'طبيعة':'عشبة/نبتة:🌿,برسيم/نفل:☘️,توليب/زهرة توليب:🌷,أوراق الخريف/خريف:🍂,ضباب:🌫️,رياح/هواء:💨,شروق/شروق الشمس:🌅,غروب/غروب الشمس:🌇,مجرة/درب التبانة:🌌,جبل ثلجي:🗻,صدفة/محار:🐚,عاصفة رعدية/رعد:⛈️,غيوم وشمس/غائم:⛅',
'مواصلات':'تلفريك:🚡,قطار سريع:🚄,مترو:🚇,ترام:🚊,سيارة سباق:🏎️,باخرة/سفينة سياحية:🛳️,لنش/زورق سريع:🚤,كانو/قارب تجديف:🛶,قمر صناعي:🛰️,صحن طائر/طبق طائر:🛸,سكيت بورد/لوح تزلج:🛹,فان/باص صغير:🚐,جيب/سيارة دفع رباعي:🚙',
'جسم':'لسان:👅,عيون:👀,رئة/رئتين:🫁,إصبع/صبع:☝️,قبضة/بوكس:👊,تصفيق:👏,ابتسامة/ضحكة:😄',
'شخصيات':'موظف/رجل أعمال:🧑‍💼,عالم/باحث:🧑‍🔬,مبرمج:🧑‍💻,رسام/فنان:🧑‍🎨,ميكانيكي:🧑‍🔧,قاضي:🧑‍⚖️,حارس:💂,محقق/تحري:🕵️,عامل بناء:👷,طفل/بيبي:👶,جد/شايب:👴,جدة/عجوز:👵,عداء/راكض:🏃',
'رياضة':'سباق دراجات/دراجات:🚴,غوص:🤿,هوكي:🏒,كريكيت:🏏,بيسبول:⚾,كرة قدم أمريكية/رقبي:🏈,تزلج على الجليد:⛸️,مصارعة:🤼,مبارزة:🤺,رماية/هدف:🎯,ريشة طائرة/بادمنتون:🏸,تسلق:🧗,يوغا/تأمل:🧘,فروسية/سباق خيل:🏇,جمباز:🤸,كرة يد:🤾'};
const PW=[];for(const [cat,list] of [...Object.entries(PWB),...Object.entries(PWB2)])for(const e of list.split(',')){const k=e.lastIndexOf(':');const alts=e.slice(0,k).split('/');PW.push({w:alts[0],alts,em:e.slice(k+1),cat});}

// guesses count with or without «ال», hamza, ta marbuta and spaces
const PNORM=t=>String(t||'').replace(/[ً-ْـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
  .replace(/[^ء-يa-z0-9 ]/gi,' ').replace(/\s+/g,' ').trim().split(' ').map(x=>x.length>3&&x.startsWith('ال')?x.slice(2):x).join(' ');
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=[...Array(n+1).keys()];
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
// 2 = right, 1 = close, 0 = wrong
function pwMatch(e,g){g=PNORM(g);if(!g)return 0;const gs=g.replace(/ /g,'');let best=9;
  for(const a of e.alts){const x=PNORM(a),xs=x.replace(/ /g,'');if(xs===gs)return 2;best=Math.min(best,lev(xs,gs));}
  return best<=(PNORM(e.w).length<=4?1:2)?1:0;}

// drawing: points on a 63×63 grid, two letters a point; the stroke head holds colour and brush size
const PDC=['#2D4763','#E5483F','#3D8FD8','#3FAE5C','#F0B429','#8E44AD','#8B5A2B','#FFFFFF'];
const PDW=[1.1,2.2,4.4];
const PDA='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const PMAX=800;
// a Claude room carries about 4 KB a player: the drawing goes to the host and to everyone in the drawer's message, so it stays smaller there
const pMax=()=>S.mode==='online'&&S.nr&&(S.nr.max||3800)<8000?450:PMAX;
// a point on a straight line between its neighbours adds nothing to the picture
const pThin=p=>p.filter((q,i)=>{if(!i||i===p.length-1)return true;const a=p[i-1],b=p[i+1],ux=q[0]-a[0],uy=q[1]-a[1],vx=b[0]-q[0],vy=b[1]-q[1];return ux*vy!==uy*vx||ux*vx+uy*vy<0;});
const pdEnc=st=>st.filter(s=>s.p.length).map(s=>PDA[s.w*8+s.c]+s.p.map(([x,y])=>PDA[x]+PDA[y]).join('')).join('.');
const pdDec=str=>!str?[]:String(str).split('.').filter(Boolean).map(t=>{const h=Math.max(0,PDA.indexOf(t[0]));return {c:h%8,w:Math.floor(h/8)%3,p:(t.slice(1).match(/../g)||[]).map(q=>[PDA.indexOf(q[0]),PDA.indexOf(q[1])])};});
const pdSVG=s=>s.p.length===1?`<circle cx="${s.p[0][0]}" cy="${s.p[0][1]}" r="${PDW[s.w]/2+.25}" fill="${PDC[s.c]}"/>`:`<polyline points="${s.p.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${PDC[s.c]}" stroke-width="${PDW[s.w]}" stroke-linecap="round" stroke-linejoin="round"/>`;

const pKey=d=>d.gid+':'+d.q;
const pDrawer=d=>(d.st+d.q)%d.pl.length;
// the drawer's own strokes live on his phone until they are sent
function pBuf(d){const k=pKey(d);if(!S.pdr||S.pdr.k!==k)S.pdr={k,st:[],c:0,w:1};return S.pdr;}
function pStrokes(d,ctx){const dr=pDrawer(d);if(ctx.v===dr&&!isBot(d,dr))return pBuf(d).st;const p=S.priv[d.pl[dr]];return p&&p.dr&&p.dr.k===pKey(d)?pdDec(p.dr.s):(S.pdr&&S.pdr.k===pKey(d)?S.pdr.st:[]);}
// online a player who is not the host sends the drawing to the host (pv) and shows it in its own message (selfPub)
function pPub(d){const dr=pDrawer(d),r=d.pl[dr];const p=S.priv[r];S.priv[r]={...(p&&p.gid===d.gid?p:{}),gid:d.gid,dr:{k:pKey(d),s:pdEnc(pBuf(d).st)}};
  if(S.mode==='online'&&!amHost()){if(r===S.me)queueIntent({t:'pv',p:S.priv[r]});}else publish();}
// what a guesser may see of the word while it is being drawn: its category, its length and the letters given as hints
function pPat(d){const w=PW[d.w].w;return {c:PW[d.w].cat,s:[...w].map((c,i)=>c===' '?' ':d.hl.includes(i)?c:'_').join('')};}
const pWord=d=>Number.isInteger(d.w)&&d.w>=0&&PW[d.w]?PW[d.w]:null;
// how hard a word is to draw: 0 easy (a short animal, food, thing in nature…), 2 hard (people, sport, places, long words, two words), 1 the rest.
// The three words offered are one of each: a harder word is worth more for the drawer and for whoever gets it
const PTIER=e=>{const n=[...e.w.replace(/ /g,'')].length;if(e.w.includes(' ')||n>=7||e.cat==='شخصيات'||e.cat==='رياضة'||e.cat==='أماكن')return 2;
  if(n<=4&&['حيوانات','أكل','طبيعة','مواصلات','جسم','أشياء'].includes(e.cat))return 0;return 1;};
const PTM=[100,150,200],PTN=['سهلة','متوسطة','صعبة'];
const pTier=i=>PW[i]?PTIER(PW[i]):1;
function pwPick(used,k){const ok=PW.map((_,i)=>i).filter(i=>!used.includes(i));const out=[],cats=new Set();
  for(let t=0;t<Math.min(k,3);t++){const pool=ok.filter(i=>pTier(i)===t&&!out.includes(i));if(!pool.length)continue;
    let i=pool[rnd(pool.length)];for(let g=0;g<30&&cats.has(PW[i].cat);g++)i=pool[rnd(pool.length)];out.push(i);cats.add(PW[i].cat);}
  for(let g=0;out.length<k&&g<400;g++){const i=ok[rnd(ok.length)];if(out.includes(i)||(cats.has(PW[i].cat)&&g<200))continue;out.push(i);cats.add(PW[i].cat);}return out;}
const pGuessers=d=>d.pl.map((_,s)=>s).filter(s=>s!==pDrawer(d));
const pLeft=d=>Math.max(0,Math.ceil(d.T-(Date.now()-d.t0)/1000));
function pStart(d,wi){const now=Date.now(),tier=pTier(wi);const x={...d,ph:'draw',w:wi,wm:PTM[tier],t0:now,ts:now,used:[...d.used,wi].slice(-80),got:[],feed:[],gn:{},hl:[],last:`${nm(d,pDrawer(d))} بدأ يرسم ✏️ كلمة ${PTN[tier]}`};
  // bots guess on their own clock: quicker when they are harder, slower and more often lost on a hard word
  const bt={};for(const s of pGuessers(d))if(isBot(d,s)){const lv=botLv(d,s);const [a,b]=[0,[28,78],[18,52],[9,34]][lv],f=1+tier*.22;
    bt[s]=[Math.random()<[0,.22,.08,.02][lv]+tier*[0,.08,.05,.02][lv]?-1:now+Math.round((a+rnd(b-a))*f*1000),now+4000+rnd(7000)];}
  if(Object.keys(bt).length)x.bt=bt;else delete x.bt;return x;}
const pMul=(d,p)=>Math.round(p*((d.wm||100)/100));
function pGot(d,s,now){if(d.got.some(g=>g[0]===s))return d;const el=(now-d.t0)/1000;const pts=pMul(d,4+Math.ceil(6*Math.max(0,d.T-el)/d.T)+(d.got.length?0:2));
  const P=[...d.pts];P[s]+=pts;return {...d,pts:P,got:[...d.got,[s,pts]],feed:[...d.feed,[s,'',1]].slice(-7)};}
function pShow(d,why){const c=d.got.length,all=pGuessers(d).length;const dp=c?pMul(d,Math.min(12,3*c+(c===all?2:0))):0;const P=[...d.pts];P[pDrawer(d)]+=dp;
  return {...d,ph:'show',ts:Date.now(),dp,why,pts:P,last:''};}
function pNext(d){const q=d.q+1,n=d.pl.length;if(q>=n*d.R)return {...d,ph:'end',win:mostPts(d.pts)};
  const x={...d,q,ph:'pick',ch:pwPick(d.used,3),w:null,ts:Date.now(),got:[],feed:[],gn:{},hl:[],dp:0,turn:(d.st+q)%n,last:''};delete x.bt;return x;}
function pHint(d){const w=PW[d.w].w;const free=[...w].map((c,i)=>c===' '||d.hl.includes(i)?-1:i).filter(i=>i>=0);return free.length?{...d,hl:[...d.hl,free[rnd(free.length)]]}:d;}
function pSlots(d,show){const E=pWord(d);const w=E?E.w:String(d.wp&&d.wp.s||'');return `<div class="pslots">${[...w].map((c,i)=>c===' '?'<i class="sp"></i>':`<b>${E?(show||d.hl.includes(i)?c:''):(c==='_'?'':escH(c))}</b>`).join('')}</div>`;}
const PBOT_TILES=36;
function pTileOrder(d){const R=srng(d,'pt'+d.q);const a=[...Array(PBOT_TILES).keys()];for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const pShown=d=>d.ph!=='draw'?PBOT_TILES:Math.min(PBOT_TILES,4+Math.floor((PBOT_TILES-4)*((Date.now()-d.t0)/1000)/(d.T*.8)));

GAMES.tele={name:'ارسم وخمّن',cat:'quiz',lbc:'#D35400',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E67E22"/><rect x="14" y="16" width="72" height="56" rx="8" fill="#fff"/><path d="M24 58c8-20 16-22 22-8s14 10 20-12" stroke="#2D4763" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="66" cy="32" r="6" fill="#F0B429"/><path d="M60 80l22-22 6 6-22 22h-6z" fill="#2D4763"/></svg>`,
  init:n=>{const humans=S.mode==='local'?[...Array(n).keys()].filter(r=>!(S.bots||{})[r]).length:n;const tap=S.mode==='local'&&humans>=2;
    return {q:0,R:n<=3?3:n<=5?2:1,ph:'pick',ch:pwPick([],3),w:null,t0:0,ts:Date.now(),T:tap?90:80,tap,got:[],feed:[],gn:{},hl:[],used:[],dp:0,pts:Array(n).fill(0),last:''};},
  points:d=>d.pts,
  /* online the word and the three choices stay with the drawer (and with whoever already guessed it): the others get its
     category, its length and the hint letters (wp). The guesses go to the host only; the drawing is shown to all */
  mask(d,seat){if(!d||d.win!=null||d.ph==='show'||d.ph==='end')return d;const dr=pDrawer(d);if(seat>=0&&seat===dr)return d;
    const v={...d};if(Array.isArray(d.ch))v.ch=d.ch.map(()=>-1);
    // the word in play is also the last one in the list of used words
    if(pWord(d)){const got=seat>=0&&d.got.some(g=>g[0]===seat);v.wp=pPat(d);if(!got){v.w=-1;if(Array.isArray(d.used))v.used=d.used.map((x,i)=>i===d.used.length-1?-1:x);}}
    if(d.bt)delete v.bt;return v;},
  privShow:(d,seat,role,p,own)=>{if(own||!p)return p;const o={gid:p.gid};if(p.dr&&typeof p.dr==='object')o.dr=p.dr;return o;},
  privOk:(d,r,o,p)=>(p.dr==null||typeof p.dr==='object'&&typeof p.dr.s==='string'&&p.dr.s.length<=2*PMAX+400&&r===d.pl[pDrawer(d)])&&
    (p.gq==null||typeof p.gq==='object'&&Array.isArray(p.gq.l)&&p.gq.l.length<=3&&p.gq.l.every(x=>Array.isArray(x)&&Number.isInteger(x[0])&&typeof x[1]==='string'&&x[1].length<=24)),
  selfPub:true,
  net:{local:['col','sz','undo','clr','peek','send']},
  viewer:d=>isBot(d,pDrawer(d))?null:pDrawer(d),
  coverMsg:()=>'دورك ترسم! اختار كلمة بدون ما يشوفون',
  winExtra:d=>'النقاط: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، '),
  status(d,ctx){const dr=pDrawer(d),turn=`<small>الرسمة ${d.q+1} من ${d.pl.length*d.R}</small><br>`;
    if(d.ph==='pick')return turn+(ctx.v===dr&&!isBot(d,dr)?'اختار الكلمة اللي بترسمها':`${nameTag(d,dr)} يختار كلمة…`);
    if(d.ph==='draw')return turn+(ctx.v===dr&&!isBot(d,dr)?(d.tap?'ارسم، والباقين يخمنون بصوت عالي':'ارسم الكلمة، والباقين يخمنون'):`${nameTag(d,dr)} يرسم، وش هي؟`);
    return turn+(d.why==='skip'?'تخطى الرسام الكلمة':d.got.length?'انتهت الرسمة':'ما أحد عرفها');},
  render(d,ctx){return `<div class="pdraw">${GAMES.tele.view(d,ctx)}</div>`;},
  view(d,ctx){const dr=pDrawer(d),v=ctx.v,E=pWord(d);const iDraw=v===dr&&!isBot(d,dr);
    if(d.ph==='pick'){
      if(iDraw)return `<div class="ppick">${d.ch.map((i,k)=>{const t=pTier(i);return `<button class="pwc t${t}" data-ga="pw" data-i="${k}" style="--k:${k}"><span>${PW[i].em}</span><b>${PW[i].w}</b><small>${PW[i].cat}</small><em class="ptier">${PTN[t]}${t?` ×${PTM[t]/100}`:''}</em></button>`;}).join('')}</div><p class="note" style="text-align:center">الكلمة الأصعب نقاطها أكثر لك وللي يعرفها. ارسم أي شي يوضحها، بس بدون كتابة حروف</p>`;
      return `<div class="pwait"><div class="pen">✏️</div><p>${nameTag(d,dr)} يختار كلمة</p></div>`;}
    if(d.ph==='show'||d.win!=null){const st=pStrokes(d,ctx);if(!E)return '';
      return `<div class="pshow"><div class="pem">${E.em}</div><h3>${E.w}${d.wm>100?` <small class="ptier t${d.wm>150?2:1}">×${d.wm/100}</small>`:''}</h3>
        <div class="pres">${d.got.length?d.got.map(([s,p])=>`<span style="--c:${col(d,s)}">${nm(d,s)} <b>+${p}</b></span>`).join(''):'<span class="none">ما أحد عرفها</span>'}${d.dp?`<span class="dr" style="--c:${col(d,dr)}">✏️ ${nm(d,dr)} <b>+${d.dp}</b></span>`:''}</div>
        ${st.length?`<div class="polar"><svg viewBox="0 0 63 63" class="drw small">${st.map(pdSVG).join('')}</svg></div>`:''}${d.win==null?'<div class="pnext"><i></i></div>':''}</div>`;}
    // drawing
    const gotMe=v>=0&&d.got.some(g=>g[0]===v);const peek=S.pPeek&&Date.now()-S.pPeek<2500;
    let top=`<div class="ptop"><span class="ptime"><b>${pLeft(d)}</b>⏱</span>`;
    if(iDraw)top+=d.tap?`<button class="ppeek" data-ga="peek">${peek?`${E.em} ${E.w}`:'👁 شوف الكلمة'}</button>`:`<span class="pword">${E.em} ${E.w}</span>`;
    else top+=gotMe&&E?`<span class="pword ok">✓ ${E.w}</span>`:pSlots(d);
    top+=`<span class="pcat">${E?E.cat:escH(d.wp&&d.wp.c||'')}${d.wm>100?` <b class="ptier t${d.wm>150?2:1}">×${d.wm/100}</b>`:''}</span></div>`;
    let pad;
    if(isBot(d,dr)&&E){const ord=pTileOrder(d),k=pShown(d);pad=`<div class="preveal" data-k="${k}"><span>${E.em}</span><div class="ptiles">${[...Array(PBOT_TILES).keys()].map(i=>`<i class="${ord.indexOf(i)<k?'off':''}"></i>`).join('')}</div></div>`;}
    else{const st=pStrokes(d,ctx);pad=`<div class="easel ${iDraw?'live':''}"><svg viewBox="0 0 63 63" class="drw ${iDraw?'pad':''}" ${iDraw?'id="pad"':''}>${st.map(pdSVG).join('')}</svg></div>`;}
    let tools='';
    if(iDraw){const b=pBuf(d);tools=`<div class="ptools pcols">${PDC.slice(0,7).map((c,k)=>`<button class="tcol ${b.c===k?'on':''}" style="background:${c}" data-ga="col" data-i="${k}" aria-label="لون"></button>`).join('')}
      <button class="tcol er ${b.c===7?'on':''}" data-ga="col" data-i="7" aria-label="ممحاة">🧽</button></div>
      <div class="ptools">${PDW.map((w,k)=>`<button class="psz ${b.w===k?'on':''}" data-ga="sz" data-i="${k}" aria-label="حجم"><i style="width:${6+k*6}px;height:${6+k*6}px"></i></button>`).join('')}
      <button class="sm" data-ga="undo">↶ تراجع</button><button class="sm" data-ga="clr">🗑 مسح</button><button class="sm" data-ga="skip">تخطي</button></div>`;}
    let low='';
    if(d.tap&&(iDraw||isBot(d,dr))){const hs=pGuessers(d).filter(s=>!isBot(d,s));
      low=`<p class="lbl" style="text-align:center;margin:8px 0 4px">مين عرفها؟ اضغط على اسمه</p><div class="ptap">${hs.map(s=>{const g=d.got.find(x=>x[0]===s);return `<button class="${g?'on':''}" style="--c:${col(d,s)}" data-ga="tap" data-i="${s}" ${g?'disabled':''}>${g?'✓ ':''}${nm(d,s)}${g?` +${g[1]}`:''}</button>`;}).join('')}</div>`;}
    else if(!iDraw&&v>=0&&!gotMe&&!d.tap)low=`<div class="pguess"><input class="field" data-draft="pg" data-enter="send" maxlength="24" value="${escH(S.draft.pg||'')}" placeholder="اكتب تخمينك" autocomplete="off" enterkeyhint="send"><button class="btn red send" data-ga="send">خمّن</button></div>`;
    const feed=d.feed.length?`<div class="pfeed">${d.feed.slice().reverse().map(([s,t,k])=>`<p class="${k===1?'ok':k===2?'cl':''}"><b style="color:${col(d,s)}">${nm(d,s)}</b> ${k===1?'عرفها! 🎉':k===2?'قرّب 🔥':escH(t)}</p>`).join('')}</div>`:'';
    return top+pad+tools+low+feed;},
  click(a,i,d,ctx){const dr=pDrawer(d),v=ctx.v,iDraw=v===dr&&!isBot(d,dr);
    if(a==='pw'){if(d.ph==='pick'&&iDraw&&d.ch[i]!=null)act(pStart(d,d.ch[i]));return;}
    if(a==='peek'){S.pPeek=Date.now();render();setTimeout(render,2600);return;}
    if(d.ph!=='draw')return;
    if(iDraw){const b=pBuf(d);
      if(a==='col'){b.c=i;render();return;}
      if(a==='sz'){b.w=i;render();return;}
      if(a==='undo'){b.st.pop();pPub(d);render();return;}
      if(a==='clr'){b.st=[];pPub(d);render();return;}
      if(a==='skip'){act(pShow(d,'skip'));return;}}
    if(a==='tap'&&d.tap){let nd=pGot(d,i,Date.now());if(pGuessers(nd).every(s=>nd.got.some(g=>g[0]===s)))nd=pShow(nd,'all');act(nd);return;}
    if(a==='send'&&!iDraw&&v>=0&&!d.tap){const txt=String(S.draft.pg||'').trim().slice(0,24);if(!txt)return;S.draft.pg='';
      // online the word is not on this phone: the host says how close it was (in the feed)
      const E=pWord(d);if(E&&pwMatch(E,txt)===1)toast('قريب! 🔥');
      const r=d.pl[v],p0=S.priv[r],p=p0&&p0.gid===d.gid?p0:{},k=pKey(d);const gq=p.gq&&p.gq.k===k?p.gq:{k,n:0,l:[]};const n2=gq.n+1;
      setPriv(r,{...p,gid:d.gid,gq:{k,n:n2,l:[...gq.l,[n2,txt]].slice(-3)}});}},
  // one device runs the clock, reads the typed guesses and plays the bots
  host(d){const now=Date.now(),dr=pDrawer(d);
    // a drawer who left the room (not just a short drop) loses the turn
    if(d.ph==='pick'){if(goneLong(d.pl[dr]))return pNext(d);
      // a bot drawer: the hard one takes the hardest word (worth double), the medium one a middle or hard one
      if(now-d.ts>(isBot(d,dr)?1800:30000)){let i=d.ch[rnd(d.ch.length)];if(isBot(d,dr)){const lv=botLv(d,dr),by=t=>d.ch.find(x=>pTier(x)===t);
        if(lv===3)i=by(2)??i;else if(lv===2)i=(Math.random()<.5?by(1):by(2))??i;}return pStart(d,i);}return null;}
    if(d.ph==='show')return now-d.ts>6000?pNext(d):null;
    if(d.ph!=='draw')return null;
    let x=d;const key=pKey(d),W=PW[d.w];
    if(!d.tap)for(const s of pGuessers(d)){if(isBot(d,s)||x.got.some(g=>g[0]===s))continue;const p=S.priv[d.pl[s]];if(!p||!p.gq||p.gq.k!==key)continue;
      for(const [n,t] of p.gq.l){if(n<=(x.gn[s]||0))continue;x={...x,gn:{...x.gn,[s]:n}};const m=pwMatch(W,t);
        if(m===2){x=pGot(x,s,now);break;}x={...x,feed:[...x.feed,[s,m===1?'':String(t).slice(0,24),m===1?2:0]].slice(-7)};}}
    if(x.bt){const drawn=isBot(d,dr)||pStrokes(d,{v:-1}).length>0||(S.pdr&&S.pdr.k===key&&S.pdr.st.length>0);
      for(const s in x.bt){const [gt,nw]=x.bt[s];const si=+s;if(x.got.some(g=>g[0]===si))continue;
        if(gt>0&&now>=gt){if(drawn)x=pGot(x,si,now);else x={...x,bt:{...x.bt,[s]:[now+5000,nw]}};}
        else if(now>=nw){const wrong=PW.filter(e=>e.cat===W.cat&&e!==W);x={...x,feed:[...x.feed,[si,pickR(wrong).w,0]].slice(-7),bt:{...x.bt,[s]:[gt,now+6000+rnd(9000)]}};}}}
    const frac=(now-d.t0)/1000/d.T,L=[...W.w].filter(c=>c!==' ').length;const want=Math.min(Math.floor(L/2),[.45,.65,.82].filter(f=>frac>=f).length);
    if(want>x.hl.length)x=pHint(x);
    if(frac>=1)return pShow(x,'time');
    if(pGuessers(x).every(s=>x.got.some(g=>g[0]===s)))return pShow(x,'all');
    return x===d?null:x;},
  bot:d=>d,
  after(d,ctx){const pad=document.getElementById('pad');if(!pad||pad._on)return;const dr=pDrawer(d);if(ctx.v!==dr||d.ph!=='draw')return;pad._on=1;const b=pBuf(d);
    const total=()=>b.st.reduce((a,s)=>a+s.p.length+1,0);
    const pt=e=>{const r=pad.getBoundingClientRect();return [Math.max(0,Math.min(63,Math.round((e.clientX-r.left)/r.width*63))),Math.max(0,Math.min(63,Math.round((e.clientY-r.top)/r.height*63)))];};
    let cur=null,el=null,lastPub=0;
    pad.addEventListener('pointerdown',e=>{if(total()>=pMax()){toast('الرسمة وصلت حدها، امسح شي');return;}e.preventDefault();pad.setPointerCapture(e.pointerId);S.holdRender=true;
      cur={c:b.c,w:b.c===7?2:b.w,p:[pt(e)]};b.st.push(cur);el=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      el.setAttribute('fill','none');el.setAttribute('stroke',PDC[cur.c]);el.setAttribute('stroke-width',PDW[cur.w]);el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');
      el.setAttribute('points',cur.p.map(p=>p.join(',')).join(' '));pad.appendChild(el);});
    pad.addEventListener('pointermove',e=>{if(!cur)return;const p=pt(e),l=cur.p[cur.p.length-1];if(p[0]===l[0]&&p[1]===l[1])return;if(total()>=pMax())return;cur.p.push(p);el.setAttribute('points',cur.p.map(q=>q.join(',')).join(' '));
      const now=Date.now();if(S.mode==='online'&&now-lastPub>350){lastPub=now;pPub(S.st.d);}});
    const end=()=>{if(!cur)return;cur.p=pThin(cur.p);cur=null;el=null;S.holdRender=false;pPub(S.st.d);render();};
    pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);}
};
// the clock, the hints and the picture under the tiles move every half second without a full redraw
setInterval(()=>{if(S.st.g!=='tele')return;const d=S.st.d;if(!d||d.win!=null)return;
  if(d.ph==='draw'){const t=document.querySelector('.ptime b');if(t){const l=pLeft(d);t.textContent=l;t.parentNode.classList.toggle('low',l<=10);}
    const rv=document.querySelector('.preveal');if(rv){const k=pShown(d);if(+rv.dataset.k!==k){rv.dataset.k=k;const ord=pTileOrder(d);rv.querySelectorAll('.ptiles i').forEach((e,i)=>e.classList.toggle('off',ord.indexOf(i)<k));}}}},500);

// the places of the cups after the first i swaps
// a step is one swap [a,b] or, on later rounds, two at once [a,b,c,e]
function cupsAt(P,i){const pos=[...P.start];for(let k=0;k<i&&k<P.swaps.length;k++){const w=P.swaps[k];for(let j=0;j+1<w.length;j+=2){const a=w[j],b=w[j+1];const ka=pos.indexOf(a),kb=pos.indexOf(b);pos[ka]=b;pos[kb]=a;}}return pos;}
/* ---------- «وين شخصيتك؟»: every player's character hides under a cup, the cups shuffle, pick yours ---------- */
GAMES.cups={...spdBase({name:'وين شخصيتك؟',lbc:'#6C3483',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#884EA0"/>${[18,50,82].map((x,k)=>`<path d="M${x-13} 72L${x-9} 34H${x+9}L${x+13} 72Z" fill="${k===1?'#F5B041':'#F8C471'}" stroke="#6E2C00" stroke-width="2"/>`).join('')}<circle cx="50" cy="84" r="7" fill="#EC6158"/></svg>`,
  title:'شخصيتك بتنحط تحت كوب، والأكواب بتتحرك. ركّز ووين ما وقفت اختار كوبها. متأكد؟ اضغط 🎯 قبل وتاخذ الضعف',
  // a bot follows the cups less well when there are more of them, more swaps and two swaps at once; the hard one says
  // «متأكد» when it is sure (it never doubles a cup it lost track of), the easy one guesses at it
  bot(d,s,lv){const P=GAMES.cups.plan(d);const hard=P.m*.025+P.swaps.length*.008+P.swaps.filter(w=>w.length>2).length*.02;
    const ok=Math.random()<[0,.78,.9,.985][lv]-hard*[0,1.4,1,.5][lv];const x=lv===3?ok&&Math.random()<.8:lv===2?Math.random()<(ok?.45:.2):Math.random()<.3;
    return {ok,ms:[0,1500,1100,800][lv]+rnd([0,1500,900,600][lv]),x:x?1:0};},
  start(d,st){st.phase='show';st.run=false;st.i=0;st.lift=true;st.x=false;},
  /* the shuffle is drawn from st (how many swaps are done): every step is a normal render, the cups slide by transform,
     so nothing holds the screen and a redraw in the middle shows the same places */
  view(d,ctx,st){const P=GAMES.cups.plan(d);const m=P.m;
    const pos=st.phase==='go'?P.end:cupsAt(P,st.i||0);
    const dbl=P.swaps.some(w=>w.length>2);
    return `<div class="cupsw"><div class="cups ${st.phase==='show'&&st.lift?'lift':''}" id="cups" style="--sp:${P.speed}ms">${Array(m).fill(0).map((_,k)=>{const ch=k<d.pl.length?d.pl[k]:-1;
      return `<button class="cupb" data-ga="pick" data-i="${k}" style="width:${100/m}%;transform:translateX(${pos[k]*100}%)" ${st.phase==='go'?'':'disabled'}><span class="cupc">${ch>=0?`<i style="background:${COLS[ch]}">${shapeW(ch).replace('<svg ','<svg style="width:18px;height:18px" ')}</i>`:''}</span><span class="cup"></span></button>`;}).join('')}</div></div>
      <p class="note">${st.phase==='go'?'اختار الكوب اللي تحته شخصيتك':'ركّز على شخصيتك'} <b style="color:${col(d,ctx.v)}">●</b>${st.phase!=='go'&&dbl?'<br><small>⚠️ هالجولة فيها تبديلتين مع بعض</small>':''}</p>
      ${st.phase==='go'?`<button class="cupx ${st.x?'on':''}" data-ga="sure">🎯 ${st.x?'متأكد! صح ×2، غلط −1':'متأكد؟ اضغط قبل تختار'}</button>`:''}`;},
  click(a,k,d,ctx,st){if(st.phase!=='go')return;if(a==='sure'){st.x=!st.x;render();return;}if(a!=='pick')return;
    // like spdSubmit, with the «متأكد» mark
    const ms=Math.round(performance.now()-st.t0),ok=k===ctx.v;S.sp={...st,phase:'sent'};try{sfx(ok?'pop':'lose');}catch(e){}simulPick(d,ctx.v,{ok,ms,x:st.x?1:0});}}),
  plan(d){const m=d.pl.length+1+(d.rd>2?1:0);const R=srng(d,'cup'+d.rd);const start=[...Array(m).keys()];const pos=[...start];const swaps=[];
    const nsw=6+d.rd*3;for(let i=0;i<nsw;i++){let a=Math.floor(R()*m),b=Math.floor(R()*(m-1));if(b>=a)b++;const w=[a,b];
      // from the third round on, now and then two other cups swap at the same time
      if(d.rd>=2&&m>=4&&R()<.18+d.rd*.06){const rest=[...Array(m).keys()].filter(x=>x!==a&&x!==b);const c=rest[Math.floor(R()*rest.length)];const r2=rest.filter(x=>x!==c);w.push(c,r2[Math.floor(R()*r2.length)]);}
      swaps.push(w);for(let j=0;j<w.length;j+=2){const ka=pos.indexOf(w[j]),kb=pos.indexOf(w[j+1]);pos[ka]=w[j+1];pos[kb]=w[j];}}
    return {m,start,end:pos,swaps,speed:Math.max(220,520-d.rd*70)};},
  // a right cup is 1, the quickest right cup 1 more; «متأكد» doubles a right cup and costs 1 for a wrong one
  resolve(d,picks){const pts=[...d.pts];const ok=[],sg=Array(d.pl.length).fill(0);
    const P=picks.map(p=>p&&typeof p==='object'?{ok:!!p.ok,ms:typeof p.ms==='number'&&isFinite(p.ms)?Math.max(0,p.ms):9e9,x:p.x===1}:null);
    const right=P.map((p,s)=>p&&p.ok?s:-1).filter(s=>s>=0).sort((a,b)=>P[a].ms-P[b].ms);const fast=right.length&&(right.length===1||P[right[0]].ms<P[right[1]].ms)?right[0]:-1;
    P.forEach((p,s)=>{if(!p)return;if(p.ok){sg[s]=(p.x?2:1)+(s===fast?1:0);ok.push(nm(d,s)+(p.x?' 🎯':''));}else if(p.x)sg[s]=-Math.min(1,pts[s]);pts[s]+=sg[s];});
    const lost=P.map((p,s)=>p&&!p.ok&&p.x&&sg[s]<0?nm(d,s):'').filter(Boolean);const rd=d.rd+1;
    return {...d,pts,sg,rd,res:(ok.length?`لقوا شخصياتهم: ${ok.join('، ')}`:'محد لقى شخصيته 😅')+(fast>=0?`. الأسرع: ${nm(d,fast)}`:'')+(lost.length?`. خسر نقطة: ${lost.join('، ')}`:''),win:rd>=SPD_ROUNDS?mostPts(pts):null};},
  after(d,ctx){if(!ctx.my)return;const st=spdState(d,ctx.v);if(st.phase!=='show'||st.run)return;st.run=true;
    const P=GAMES.cups.plan(d),lite=document.documentElement.classList.contains('lite');const live=()=>S.sp===st;
    const step=()=>{if(!live())return;if(st.i>=P.swaps.length){setTimeout(()=>{if(!live())return;st.phase='go';st.t0=performance.now();render();},300);return;}
      st.i++;render();setTimeout(step,(lite?Math.max(P.speed,400):P.speed)+40);};
    setTimeout(()=>{if(!live())return;st.lift=false;render();setTimeout(step,500);},1600);}
};

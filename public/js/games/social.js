'use strict';
/* party games: برة السالفة, المافيا, وصلة */

/* ---------- برة السالفة ---------- */
const BARA=[
['أكلات','كبسة مندي مضغوط جريش قرصان مرقوق مطازيز هريس سليق مطبق شاورما برجر بيتزا سوشي معكرونة فلافل فول حمص سمبوسة كنافة لقيمات بسبوسة فطاير شكشوكة كبدة مشاوي مقلوبة سلطة شوربة مكرونة_بشاميل كباب كفتة سمك_مشوي روبيان دجاج_بروستد فتة معصوب متبل ورق_عنب محشي ساندويتش نودلز حنيني'],
['حيوانات','أسد نمر فيل زرافة جمل حصان غزال ذئب ثعلب أرنب قط كلب دب قرد تمساح ثعبان صقر نسر بطريق دلفين حوت قرش سلحفاة نعامة خروف ماعز بقرة ضبع فهد كنغر ببغاء حمار بومة ديك بطة سنجاب قنفذ فأر ضفدع أخطبوط باندا وحيد_القرن'],
['دول','السعودية مصر الإمارات الكويت قطر البحرين عمان اليمن الأردن المغرب تونس الجزائر العراق لبنان تركيا اليابان الصين الهند أمريكا بريطانيا فرنسا ألمانيا إيطاليا إسبانيا البرازيل روسيا كندا أستراليا ماليزيا إندونيسيا السودان سوريا ليبيا فلسطين موريتانيا الصومال باكستان كوريا_الجنوبية الأرجنتين المكسيك هولندا السويد سويسرا اليونان تايلاند'],
['مدن سعودية','الرياض جدة مكة المدينة الدمام الخبر أبها الطائف تبوك حائل بريدة عنيزة جازان نجران الباحة سكاكا عرعر الجبيل ينبع القطيف الأحساء خميس_مشيط بيشة الخرج المجمعة العلا القنفذة رابغ حفر_الباطن الدرعية الزلفي شقراء الدوادمي وادي_الدواسر الرس المذنب صبيا محايل_عسير النماص تيماء دومة_الجندل الوجه أملج القريات طريف رفحاء'],
['مهن','طبيب مهندس معلم طيار شرطي محامي نجار خباز طباخ حلاق ممرض صيدلي مزارع صياد رسام مصور مذيع سائق كهربائي سباك مبرمج محاسب قاضي جندي رائد_فضاء إطفائي بائع حارس مترجم صحفي خياط حداد ميكانيكي دهان بيطري طبيب_أسنان مضيف_طيران حكم_مباريات مدرب مرشد_سياحي'],
['أماكن','مستشفى مطار مدرسة جامعة مسجد سوق مول مطعم مقهى ملعب حديقة شاطئ صحراء مكتبة بنك فندق سينما صيدلية مخبز محطة_بنزين نادي_رياضي متحف حديقة_حيوانات مدينة_ملاهي استراحة مخيم مزرعة جبل جزيرة مغسلة_سيارات صالون_حلاقة مركز_شرطة سوبرماركت مختبر مصنع ميناء محكمة بقالة مسبح مكتب_بريد'],
['أغراض البيت','ثلاجة غسالة مكنسة فرن ميكروويف مروحة مكيف تلفزيون كنبة سرير دولاب مرآة مكواة خلاط دلة ترمس إبريق صحن ملعقة سكين مقص مخدة بطانية سجادة ستارة ساعة_حائط لمبة شاحن ريموت سخان غسالة_صحون كرسي طاولة رف سلة_مهملات شباك مزهرية برواز مبخرة جرس_الباب'],
['رياضات','كرة_قدم كرة_سلة كرة_طائرة تنس سباحة ملاكمة كاراتيه جري دراجات فروسية غوص تزلج جولف بولينج شطرنج بلياردو رماية مصارعة هوكي كريكيت رفع_أثقال تنس_طاولة تسلق قفز_بالمظلة سباق_سيارات ركوب_أمواج كرة_يد بادل يوغا رمي_الرمح مبارزة جمباز تجديف ماراثون قفز_طويل قفز_عالي كرة_الريشة رمي_السهام كرة_الماء تايكوندو'],
['وسائل نقل','سيارة طيارة قطار باص دراجة دباب سفينة قارب غواصة هليكوبتر تاكسي شاحنة مترو صاروخ منطاد عربة_خيل سكوتر إسعاف سيارة_إطفاء ونش تراكتور يخت جت_سكي تلفريك باص_مدرسة دراجة_نارية كرفان طائرة_شراعية سيارة_شرطة عبارة دباب_بر سيارة_سباق مكوك_فضاء زورق ترام قطار_سريع'],
['لبس وأغراض','ثوب شماغ غترة عقال بشت عباية طرحة فستان بنطلون قميص جاكيت شورت جزمة نعال شراب قبعة طاقية ساعة نظارة خاتم سلسال محفظة شنطة حزام كرفتة بيجاما معطف جوانتي كاب مظلة فروة صندل بدلة سديري وشاح حلق إسوارة'],
['فواكه وخضار','تفاح موز برتقال عنب بطيخ شمام فراولة مانجو أناناس رمان خوخ مشمش كيوي تين تمر ليمون جوافة طماطم خيار جزر بطاطس بصل ثوم فلفل باذنجان كوسة خس ملفوف ذرة فطر بروكلي سبانخ قرع فاصوليا بازلاء زيتون أفوكادو كرز توت جريب_فروت'],
['أغراض المدرسة','سبورة قلم دفتر كتاب مسطرة ممحاة شنطة طاولة كرسي طباشير فرجار آلة_حاسبة مقلمة ألوان صمغ مقص خريطة مجسم جرس مقصف ساحة فصل معمل مكتبة شهادة اختبار واجب طابور فسحة زي_مدرسي براية قلم_رصاص منقلة كراسة_رسم ملف'],
['حلويات','كيك دونات بسكويت شوكولاتة آيسكريم تشيز_كيك براونيز كب_كيك كريم_كراميل مهلبية أم_علي بقلاوة معمول غريبة حلاوة_طحينية قطايف ماكرون وافل بان_كيك كرواسون مارشملو جيلي مصاص علكة رز_بحليب سينابون تيراميسو كعك بلح_الشام لقيمات كنافة بسبوسة'],
['مشروبات','قهوة_عربية شاي حليب عصير_برتقال عصير_مانجو ليمون_بالنعناع كرك لبن سحلب زنجبيل كركديه كابتشينو لاتيه موكا ماء عصير_تفاح عصير_رمان عصير_فراولة ميلك_شيك شاي_أخضر يانسون بابونج شوكولاتة_ساخنة عرقسوس تمر_هندي سوبيا شاي_مثلج عصير_جزر قهوة_تركية حليب_بالزنجبيل'],
['أجهزة وتقنية','جوال لابتوب تابلت كمبيوتر طابعة كاميرا سماعات شاحن باور_بانك ساعة_ذكية تلفزيون بلايستيشن ريموت راوتر ماوس كيبورد شاشة مكبر_صوت ميكروفون فلاشة درون روبوت آلة_حاسبة نظارة_واقع_افتراضي بروجكتر هارديسك كيبل ماسح_ضوئي قارئ_بصمة'],
['جسم الإنسان','رأس عين أذن أنف فم لسان سن شعر رقبة كتف يد إصبع ظفر ركبة رجل قدم قلب رئة معدة كبد عظم جلد حاجب رمش خد ذقن جبهة ظهر بطن كوع'],
['الطبيعة والطقس','شمس قمر نجوم مطر رعد برق سحاب ثلج ضباب رياح عاصفة قوس_قزح بحر نهر بحيرة شلال جبل وادي كهف صحراء غابة بركان جزيرة رمل موج شروق غروب ندى غبار واحة'],
['ألعاب وتسالي','بلوت كيرم شطرنج دومينو ليدو سلم_وثعبان أونو ألغاز مكعب_روبيك بازل بلايستيشن مونوبولي حجرة_ورقة_مقص طائرة_ورقية دوامة نط_الحبل مراجيح زحليقة تنس_طاولة بولينج بلياردو الكراسي_الموسيقية ألعاب_الفيديو صيد_السمك مسابقة_أسئلة كلمات_متقاطعة سودوكو بالونات فقاعات_الصابون عجينة_صلصال'],
['معالم مشهورة','برج_خليفة برج_إيفل الأهرامات سور_الصين تمثال_الحرية برج_المملكة برج_الفيصلية مدائن_صالح تاج_محل الكولوسيوم برج_بيزا البتراء قصر_المصمك حافة_العالم الدرعية_التاريخية أبراج_البيت جزر_فرسان نافورة_الملك_فهد قصر_الحمراء برج_العرب جسر_الملك_فهد أوبرا_سيدني ساعة_بيغ_بن أبو_الهول برج_القاهرة جبل_الفيل قصر_القشلة'],
['أدوات المطبخ','قدر مقلاة صحن ملعقة شوكة سكين كوب فنجان دلة ترمس إبريق خلاط فرن ميكروويف ثلاجة غسالة_صحون لوح_تقطيع مصفاة مغرفة مبشرة قدر_ضغط محمصة_خبز مضرب_بيض صينية فتاحة_علب ميزان_مطبخ شواية موقد غلاية مطحنة_قهوة'],
].map(([t,w])=>[t,w.split(' ').map(x=>x.replace(/_/g,' '))]);
const baraWord=d=>BARA[d.cat][1][d.w];
/* a bot that is asked answers one checkable thing about the word (its letters, its last letter, one word or two);
   the one out of the loop has to bluff it. Everybody sees these answers in d.hn as [seat,type,value,question] */
const BHQ={n:'كم حرف فيها؟',l:'وش آخر حرف فيها؟',s:'اسمها كلمة وحدة ولا كلمتين؟'};
const BHT={n:v=>`كلمة من ${v} ${v>10?'حرف':'حروف'}`,l:v=>`آخرها حرف «${v}»`,s:v=>v>1?'اسمها من كلمتين':'اسمها كلمة وحدة'};
const BQS=['وين تلقاها عادة؟','تستخدمها كل يوم؟','كبيرة ولا صغيرة؟','وش لونها؟','تحبها؟','تلقاها بالبيت؟','متى آخر مرة شفتها؟','غالية ولا رخيصة؟','الأطفال يحبونها؟','توصفها بكلمة وحدة؟','لها ريحة؟','تلقاها بالسعودية؟'];
function bHv(w,t){const x=w.replace(/ /g,'');return t==='n'?[...x].length:t==='l'?[...x].pop():w.includes(' ')?2:1;}
const bQk=d=>d.qi+(d.q2?100:0);
// the question of this turn: drawn from the game id so every phone shows the same one
const bType=d=>['n','l','s','n','l'][Math.floor(srng(d,'bt'+bQk(d))()*5)];
function bBotHint(d,s){const lv=botLv(d,s),L=BARA[d.cat][1],t=bType(d);
  if(s!==d.bo)return [s,t,bHv(baraWord(d),t),bQk(d)];
  // a hard bluffer says what most words in the list would give; an easy one names any word's
  if(lv===3){const c={};L.forEach(w=>{const v=bHv(w,t);c[v]=(c[v]||0)+1;});const v=Object.keys(c).sort((a,b)=>c[b]-c[a]+Math.random()*.5)[0];return [s,t,t==='l'?v:+v,bQk(d)];}
  return [s,t,bHv(pickR(L),t),bQk(d)];}
// who answers and who has the turn: a bot asking a person waits for that person to answer
function baraEnter(d){if(d.ph!=='ask'||!d.pr.length)return d;const [a,b]=d.pr[d.qi];let x={...d,turn:isBot(d,a)&&!isBot(d,b)?b:a};
  if(isBot(d,b)&&!(d.hn||[]).some(h=>h[0]===b&&h[3]===bQk(d)))x.hn=[...(d.hn||[]),bBotHint(d,b)];return x;}
const bOk=(d,h,w)=>bHv(w,h[1])==h[2];
function baraPairs(d){const p=shuffle(aliveSeats(d));return p.map((a,i)=>[a,p[(i+1)%p.length]]);}
// drop seats that left from the question chain: whoever had to ask them asks the next one still playing
function baraFix(d){const o=s=>d.out[s]==='1',nx={};d.pr.forEach(([a,b])=>nx[a]=b);let qi=0;const pr=[];
  d.pr.forEach(([a,b],i)=>{if(o(a))return;for(let k=0;o(b)&&k<d.pl.length;k++)b=nx[b];if(b==null||b===a||o(b))return;if(i<d.qi)qi++;pr.push([a,b]);});return {...d,pr,qi};}
/* look: an emoji per category, vote counts from d.votes, the player tiles and the reveal of the one out of the loop */
const BARA_E=['🍲','🦁','🌍','🏙️','👷','📍','🛋️','⚽','🚗','👕','🍎','🎒','🍰','🥤','📱','💪','🌦️','🎲','🗼','🍳'];
// the answers the bots gave so far, for everyone to read
function baraHints(d){const l=d.hn||[];if(!l.length)return '';
  return `<div class="bhints"><small>أجوبة البوتات</small>${l.map(h=>`<p style="--c:${col(d,h[0])}"><b>${nm(d,h[0])}</b><span>${BHT[h[1]]?BHT[h[1]](h[2]):''}</span></p>`).join('')}</div>`;}
const BVW=['','جوابه ما يركب على السالفة','إحساسي يقول','جاوب صح، بس شكله يمثّل'];
function baraWhy(d){if(!d.vw||!d.votes)return '';const rows=d.votes.map((t,s)=>t>=0&&d.vw[s]?`<li style="--c:${col(d,s)}"><b>${nm(d,s)}</b> ← ${nm(d,t)}<small>«${BVW[d.vw[s]]||''}»</small></li>`:'').filter(Boolean);
  return rows.length?`<ul class="mfacc bwhy">${rows.join('')}</ul>`:'';}
const baraCount=d=>{const c=d.pl.map(()=>0);(d.votes||[]).forEach(x=>{if(x>=0&&x<c.length)c[x]++;});return c;};
function baraTiles(d,v,can,cnt){return `<div class="pvg n${d.pl.length}">${d.pl.map((r,s)=>{const out=d.out[s]==='1',ok=can(s),bo=!!cnt&&s===d.bo;
    const cls=`pv ${out?'out':ok?'can':cnt?'':'no'} ${s===v?'me':''} ${bo?'hot':''}`;
    const inner=`<i>${shapeW(r)}${cnt&&cnt[s]?`<u class="pvc">${cnt[s]}</u>`:''}${bo?'<u class="pvm">🕵️</u>':''}</i><span>${nm(d,s)}</span>${s===v?'<em>أنت</em>':bo?'<em>برة السالفة</em>':''}`;
    return ok?`<button class="${cls}" style="--c:${COLS[r]}" data-ga="v" data-i="${s}">${inner}</button>`:`<div class="${cls}" style="--c:${COLS[r]}">${inner}</div>`;}).join('')}</div>`;}
// the word shows only at the end: while they guess, the one out of the loop may be looking at this screen
function baraReveal(d,end){const g=d.guess!=null&&d.guess>=0?BARA[d.cat][1][d.guess]:null;
  return `<div class="breveal ${end?'end':''}"><div class="brv" style="--c:${col(d,d.bo)}"><i>${shapeW(d.pl[d.bo])}</i><div><small>${end?'اللي كان برة السالفة':'انكشف!'}</small><b>${nm(d,d.bo)}</b></div></div>`+
    (end?`<div class="brw"><small>${BARA_E[d.cat]||''} السالفة</small><b>${baraWord(d)}</b>${g?`<em class="${d.guess===d.w?'ok':'no'}">خمّن: ${g} ${d.guess===d.w?'✓':'✗'}</em>`:''}</div>`:'')+`</div>`;}
GAMES.bara={teams:'none',name:'برة السالفة',cat:'quiz',lbc:'#B5452B',minP:3,noTimer:false,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D9573A"/><circle cx="30" cy="40" r="11" fill="#fff"/><circle cx="50" cy="40" r="11" fill="#fff"/><circle cx="70" cy="40" r="11" fill="#2D4763"/><path d="M14 80c0-12 7-18 16-18s16 6 16 18zM34 80c0-12 7-18 16-18s16 6 16 18z" fill="#fff"/><path d="M54 80c0-12 7-18 16-18s16 6 16 18z" fill="#2D4763"/><text x="70" y="45" font-size="13" font-weight="800" text-anchor="middle" fill="#fff">؟</text></svg>`,
  init:n=>({ph:'cat',cat:-1,w:-1,bo:-1,pr:[],qi:0,q2:false,rd:0,votes:null,vw:null,opts:null,hn:[],res:'',last:''}),
  simulNow:d=>d.ph==='see'||d.ph==='vote',
  // online: until the guess only the one out of the loop knows it is them, and only the others get the word
  mask:(d,seat)=>d.ph==='guess'||d.ph==='end'||d.win!=null?d:{...d,bo:seat>=0&&seat===d.bo?d.bo:-1,w:seat>=0&&d.bo>=0&&seat!==d.bo?d.w:-1},
  net:{local:['ok','v']},
  viewer:d=>d.win!=null?null:(d.ph==='see'||d.ph==='vote')?simulViewer(d):d.ph==='guess'?d.bo:null,
  coverMsg:d=>d.res||'',
  winText(d){if(d.bo<0)return null;return d.win===d.bo?`${nm(d,d.bo)} كان برة السالفة وفاز!`:d.out[d.bo]==='1'&&d.guess==null?`${nm(d,d.bo)} طلع وهو برة السالفة`:`كشفتوا ${nm(d,d.bo)}، كان برة السالفة!`;},
  winExtra:d=>d.cat<0?'':`السالفة: ${baraWord(d)} (${BARA[d.cat][0]})${d.guess!=null&&d.guess>=0?` • خمّن: ${BARA[d.cat][1][d.guess]}`:''}`,
  points:d=>d.pl.map((_,s)=>d.votes&&d.votes[s]!=null&&d.ph!=='vote'?(d.votes[s]>=0?'صوّت لـ '+nm(d,d.votes[s]):'ما صوّت'):''),
  onTimeout(d){if(d.ph==='cat')return baraStart(d,rnd(BARA.length));if(d.ph==='ask')return baraAsked(d);if(d.ph==='more')return {...d,ph:'vote',rd:d.rd+1,last:'بدأ التصويت'};
    if(d.ph==='guess')return baraGuess(d,d.opts[rnd(d.opts.length)]);return d;},
  // a player left: if it was the one out of the loop the round ends, otherwise the questions go on without them
  onSkip(nd){const bo=nd.bo;if(bo>=0&&nd.out[bo]==='1'){if(nd.ph==='guess')return {...baraGuess(nd,-1),last:`${nm(nd,bo)} طلع وما خمّن`};
      const al=aliveSeats(nd);return {...nd,ph:'end',win:al.length?al[0]:'d',wins:al,last:`${nm(nd,bo)} طلع وهو برة السالفة`};}
    if(nd.win!=null||!nd.pr.length)return nd;const x=baraFix(nd);if(x.ph!=='ask'||!x.pr.length)return x;
    return x.qi<x.pr.length?baraEnter(x):{...x,ph:'more',turn:x.pr[0][0],last:'خلصت الأسئلة'};},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;const who=me?'<b class="yt">دورك</b>':`${nameTag(d,d.turn)}`;let s=d.last?`<small>${d.last}</small><br>`:'';
    if(d.ph==='cat')return s+`${who}: اختر نوع السالفة`;
    if(d.ph==='see')return s+'كل واحد يشوف بطاقته بدون ما يوريها أحد';
    if(d.ph==='ask'){const [a,b]=d.pr[d.qi];return s+`${!ctx.local&&a===ctx.v?'<b class="yt">أنت</b>':nameTag(d,a)} يسأل ${!ctx.local&&b===ctx.v?'<b class="yt">أنت</b>':nameTag(d,b)}<br><small>سؤال ${d.qi+1} من ${d.pr.length}${d.q2?' (الجولة الثانية)':''} • اسألوا بالصوت أو بالمحادثة</small>`;}
    if(d.ph==='more')return s+`${who}: جولة أسئلة ثانية ولا نصوّت؟`;
    if(d.ph==='vote')return s+'مين برة السالفة؟ صوّتوا';
    if(d.ph==='guess')return s+`انكشف ${nameTag(d,d.bo)}! باقي له فرصة: يخمّن السالفة`;return s;},
  render(d,ctx){const v=ctx.v,local=ctx.local;let h='';const myT=local||d.turn===v;
    if(d.ph==='cat'){h+=`<p class="bhead">اختر نوع السالفة</p><div class="bcats">${BARA.map(([t],i)=>`<button class="bct" data-ga="cat" data-i="${i}" ${myT?'':'disabled'}><span>${BARA_E[i]||'❓'}</span><b>${t}</b></button>`).join('')}<button class="bct rnd" data-ga="cat" data-i="-1" ${myT?'':'disabled'}><span>🎲</span><b>عشوائي</b></button></div>`;return h;}
    const card=s=>`<div class="bscard ${s===d.bo?'out':''}"><div class="mfin"><div class="bsback"><b>؟</b><small>برة السالفة</small></div>${s===d.bo?`<div class="bsfront"><small class="bchip">${BARA[d.cat][0]}</small><span class="bspy">🕵️</span><b>أنت برة السالفة!</b><p>حاول تفهم السالفة من أسئلتهم، ولا تنكشف</p></div>`:`<div class="bsfront"><small class="bchip">${BARA_E[d.cat]||''} ${BARA[d.cat][0]}</small><b>${baraWord(d)}</b><p>واحد منكم ما يعرفها، اكشفوه</p></div>`}</div></div>`;
    if(d.ph==='see'){if(v==null||v<0)return '<p class="note">ينتظرون الكل يشوف بطاقته</p>';return card(v)+(ctx.my?`<button class="big green bok" data-ga="ok">فهمت</button>`:'<p class="note">ننتظر الباقين…</p>');}
    const mine=v!=null&&v>=0&&!local&&d.win==null?`<details class="smine bmine"><summary>🃏 بطاقتي</summary>${card(v)}</details>`:'';
    if(d.ph==='ask'){const [a,b]=d.pr[d.qi];const who=s=>`<div class="bqp" style="--c:${col(d,s)}"><i>${shapeW(d.pl[s])}</i><b>${nm(d,s)}</b></div>`;
      h+=`<div class="bqa2">${who(a)}<div class="bqarrow"><small>يسأل</small><svg viewBox="0 0 60 16"><path d="M58 8H6M14 2L4 8l10 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>${who(b)}</div>`;
      const hb=(d.hn||[]).find(x=>x[0]===b&&x[3]===bQk(d));
      if(hb)h+=`<div class="bsay" id="bsay${d.rd}_${bQk(d)}"><p><b>${nm(d,a)}:</b> ${BHQ[hb[1]]}</p><p class="ans"><b>${nm(d,b)}:</b> ${BHT[hb[1]](hb[2])}</p></div>`;
      else if(isBot(d,a))h+=`<div class="bsay" id="bsay${d.rd}_${bQk(d)}"><p><b>${nm(d,a)}:</b> ${BQS[Math.floor(srng(d,'bq'+bQk(d))()*BQS.length)]}</p><p class="ans">جاوب بصوت عالي، وبعدها اضغط التالي</p></div>`;
      h+=`<div class="bdots">${d.pr.map((_,k)=>`<i class="${k<d.qi?'done':k===d.qi?'now':''}"></i>`).join('')}</div>`;
      if(local||a===v||(isBot(d,a)&&b===v))h+='<button class="big green" data-ga="asked">سأل وجاوب، التالي</button>';return h+baraHints(d)+mine;}
    if(d.ph==='more'){if(myT)h+=`<p class="bhead">جولة أسئلة ثانية ولا نصوّت؟</p><div class="bmore">${d.q2?'':'<button class="bmb again" data-ga="again"><span>🔁</span><b>جولة ثانية</b></button>'}<button class="bmb vote" data-ga="vote"><span>🗳️</span><b>نصوّت</b></button></div>`;return h+baraHints(d)+mine;}
    if(d.ph==='vote'){if(v==null||v<0||!ctx.my)return '<p class="note">ننتظر تصويت الباقين…</p>'+mine;
      return `<p class="bhead">مين تتوقع برة السالفة؟</p>`+baraTiles(d,v,s=>s!==v&&d.out[s]!=='1',null)+baraHints(d)+mine;}
    const cnt=baraCount(d);
    if(d.ph==='guess'){h+=baraReveal(d,false)+baraTiles(d,-1,()=>false,cnt)+baraWhy(d);if(!(local||v===d.bo))return h+`<p class="note">${nm(d,d.bo)} يخمّن السالفة الحين…</p>`;
      return h+`<p class="bhead">وش السالفة؟ <small>(${BARA[d.cat][0]})</small></p><div class="opts g2 bguess">${d.opts.map(i=>`<button class="opt" data-ga="g" data-i="${i}">${BARA[d.cat][1][i]}</button>`).join('')}</div>`+baraHints(d);}
    if(d.win!=null&&d.cat>=0&&d.bo>=0)return baraReveal(d,true)+baraTiles(d,-1,()=>false,cnt)+baraWhy(d)+baraHints(d);
    return h;},
  // the one out of the loop caught: a sound, once
  after(d){const k=d.gid+':'+d.rd;if(d.ph!=='guess'||S.brK===k)return;S.brK=k;sfx('turn');},
  click(a,i,d,ctx){const v=ctx.v,local=ctx.local,myT=local||d.turn===v;
    if(a==='ok'&&d.ph==='see'&&ctx.my){simulPick(d,v,1);return;}
    if(a==='v'&&d.ph==='vote'&&ctx.my&&i!==v&&d.out[i]!=='1'){simulPick(d,v,i);return;}
    if(a==='cat'&&d.ph==='cat'&&myT){act(baraStart(d,i<0?rnd(BARA.length):i));return;}
    if(a==='asked'&&d.ph==='ask'&&(local||d.pr[d.qi][0]===v||(isBot(d,d.pr[d.qi][0])&&d.pr[d.qi][1]===v))){act(baraAsked(d));return;}
    if(a==='again'&&d.ph==='more'&&myT&&!d.q2){act(baraAgain(d));return;}
    if(a==='vote'&&d.ph==='more'&&myT){act({...d,ph:'vote',rd:d.rd+1,last:'بدأ التصويت'});return;}
    if(a==='g'&&d.ph==='guess'&&(local||v===d.bo)){act(baraGuess(d,i));return;}},
  resolve(d,picks){if(d.ph==='see')return baraEnter({...d,ph:'ask',rd:d.rd+1,res:'',last:'كل واحد شاف بطاقته، بدأت الأسئلة'});
    // a bot's vote carries its reason: seat+100*reason
    const votes=picks.map((p,s)=>p==null||p<0||p%100===s||p%100>=d.pl.length?-1:p%100),vw=picks.map(p=>p==null||p<0?0:Math.floor(p/100)%BVW.length);const cnt=Array(d.pl.length).fill(0);votes.forEach(x=>{if(x>=0)cnt[x]++;});const mx=Math.max(...cnt);const top=cnt.map((c,s)=>c===mx?s:-1).filter(s=>s>=0);
    const acc=mx>0&&top.length===1?top[0]:-1;
    const tally=cnt.map((c,s)=>c?`${nm(d,s)} ${c}`:'').filter(Boolean).join('، ');
    if(acc===d.bo){const others=shuffle(BARA[d.cat][1].map((_,i)=>i).filter(i=>i!==d.w)).slice(0,7);
      return {...d,votes,vw,ph:'guess',turn:d.bo,opts:shuffle([d.w,...others]),res:`الأصوات: ${tally}`,last:`انكشف ${nm(d,d.bo)}!`};}
    const wins=[d.bo];return {...d,votes,vw,ph:'end',win:d.bo,wins,res:'',last:acc<0?'تعادل في الأصوات، وطلع اللي برة السالفة سالم':`طلّعتوا ${nm(d,acc)} وهو داخل السالفة`};}
};
function baraStart(d,cat){const al=aliveSeats(d);const pr=baraPairs(d);return {...d,ph:'see',cat,w:rnd(BARA[cat][1].length),bo:al[rnd(al.length)],pr,qi:0,q2:false,hn:[],rd:d.rd+1,last:`نوع السالفة: ${BARA[cat][0]}`};}
function baraAgain(d){return baraEnter({...d,ph:'ask',pr:baraPairs(d),qi:0,q2:true,last:'جولة أسئلة ثانية'});}
function baraAsked(d){const qi=d.qi+1;if(qi<d.pr.length)return baraEnter({...d,qi,last:''});return {...d,ph:'more',turn:d.pr[0][0],last:'خلصت الأسئلة'};}
function baraGuess(d,i){const ok=i===d.w;if(ok)return {...d,guess:i,ph:'end',win:d.bo,wins:[d.bo],last:`${nm(d,d.bo)} عرف السالفة!`};
  const right=d.votes.map((x,s)=>x===d.bo&&d.out[s]!=='1'?s:-1).filter(s=>s>=0);return {...d,guess:i,ph:'end',win:right.length?right[0]:'d',wins:right,last:`${nm(d,d.bo)} ما عرف السالفة`};}

/* ---------- المافيا ----------
   Phases: set (options, one player) → role → night → day (everyone accuses one suspect) → vote (on the most accused) → night…
   Roles: m mafia (d.gf: the boss, seen as clean by the detective), d doctor, t detective, s sniper (one bullet; shooting
   someone who is not mafia costs him his life too), j jester (wins alone if the town votes him out), c citizen.
   Public history the bots reason with: d.ah accusations per day, d.vh votes per day, d.nk night deaths. */
const MFR={m:'مافيا',d:'طبيب',t:'محقق',c:'مواطن',s:'قناص',j:'مهرج'};
const mfRN=(d,s)=>d.roles[s]==='m'&&s===d.gf?'زعيم المافيا':MFR[d.roles[s]]||'';
// options: s sniper, k mafia boss, j jester, rv show the role of who goes out
const MFO=[['s','🎯 قناص','رصاصة وحدة باللعبة',5],['k','🎩 زعيم المافيا','المحقق يشوفه بريء',7],['j','🤡 مهرج','يفوز لحاله لو طلّعتوه بالتصويت',5],['rv','🃏 كشف الدور','ينكشف دور اللي يطلع',4]];
const mfOpt0=n=>({s:n>=6?1:0,k:0,j:0,rv:1});
const mfOn=(d,k)=>{const o=MFO.find(x=>x[0]===k);return !!(d.op&&d.op[k]&&d.pl.length>=o[3]);};
const mfNM=n=>n>=7?2:1;
function mfRoles(d){const n=d.pl.length,m=mfNM(n);const r=['d','t',...Array(m).fill('m')];if(mfOn(d,'s'))r.push('s');if(mfOn(d,'j'))r.push('j');while(r.length<n)r.push('c');return shuffle(r).join('');}
function mfDeal(d){const roles=mfRoles(d);const ms=[...roles].map((c,s)=>c==='m'?s:-1).filter(s=>s>=0);
  return {...d,roles,gf:mfOn(d,'k')&&ms.length>1?ms[rnd(ms.length)]:-1,ph:'role',rd:d.rd+1,night:1,sb:mfOn(d,'s')?1:0,res:'',last:''};}
const mfAlive=(d,s)=>d.out[s]!=='1';
// may viewer v see the role of seat s (one phone shows the whole state, so the screen checks it too)
const mfShow=(d,s,v)=>d.win!=null||s===v||(!!d.op&&!!d.op.rv&&d.out[s]==='1')||(v>=0&&d.roles[v]==='m'&&d.roles[s]==='m');
const mfTeam=(d,side)=>d.pl.map((_,s)=>s).filter(s=>side==='m'?d.roles[s]==='m':d.roles[s]!=='m'&&d.roles[s]!=='j');
function mfCheck(d){if(d.win!=null)return d;const al=aliveSeats(d);const m=al.filter(s=>d.roles[s]==='m').length,o=al.length-m;
  if(!m){const w=mfTeam(d,'t');return {...d,win:w[0]??'d',wins:w,side:'t'};}
  if(m>=o){const w=mfTeam(d,'m');return {...d,win:w[0],wins:w,side:'m'};}
  return d;}
// the reasons an accusation can carry (a bot says why; a person just points)
const MFWHY=['','صوّت ضد واحد طلع بريء','ما صوّت ضد المافيا','أنا المحقق، وطلع مافيا!','ساكت وما اتهم أحد','اتهمني وأنا بريء','اللي انقتل كان يشك فيه','إحساسي يقول','المحقق قال إنه مافيا','اثنين يقولون إنهم المحقق، واحد منهم يكذب','أنا المحقق الحقيقي، وهذا يكذب!','ادّعى إنه المحقق واتهم واحد بريء'];
/* role emblems (inline SVG), the night sky / day sun band, and the player roster that doubles as the voting board */
const MF_SVG={m:'<path d="M18 35c0-9 3-17 6-19 3-2 5 1 8 1s5-3 8-1c3 2 6 10 6 19-8 2-20 2-28 0z" fill="#1d1d24"/><path d="M18 30c9 2 19 2 28 0v5c-9 2-19 2-28 0z" fill="#C0392B"/><path d="M9 35c9 4 37 4 46 0l-3 5c-9 3-31 3-40 0z" fill="#111"/><path d="M15 45c5-3 12-3 17 1 5-4 12-4 17-1-1 5-5 8-9 8-3 0-6-2-8-4-2 2-5 4-8 4-4 0-8-3-9-8z" fill="#111"/><ellipse cx="24" cy="48" rx="3.2" ry="2" fill="#F2E3A0"/><ellipse cx="40" cy="48" rx="3.2" ry="2" fill="#F2E3A0"/>',
  d:'<rect x="25" y="11" width="14" height="42" rx="4" fill="#fff"/><rect x="11" y="25" width="42" height="14" rx="4" fill="#fff"/><path d="M32 40c-6-4-8.5-6.5-8.5-9.5a4.3 4.3 0 0 1 8.5-1.6 4.3 4.3 0 0 1 8.5 1.6c0 3-2.5 5.5-8.5 9.5z" fill="#E5534B"/>',
  t:'<circle cx="27" cy="27" r="13" fill="#CFE9FF" stroke="#fff" stroke-width="5"/><path d="M21 22a8 8 0 0 1 7-4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M37 37l13 13" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
  c:'<path d="M17 31v20h30V31L32 17z" fill="#fff"/><path d="M11 33L32 14l21 19" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="28" y="38" width="8" height="13" rx="2" fill="#C98B4B"/>',
  s:'<circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="5" fill="#E5534B"/><path d="M32 8v12M32 44v12M8 32h12M44 32h12" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
  j:'<path d="M12 30c4-12 12-16 20-8 8-8 16-4 20 8l-8 4-4-8-8 6-8-6-4 8z" fill="#fff"/><circle cx="12" cy="30" r="4" fill="#F2E3A0"/><circle cx="52" cy="30" r="4" fill="#F2E3A0"/><circle cx="32" cy="18" r="4" fill="#F2E3A0"/><path d="M20 40c4 10 20 10 24 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>',
  '?':'<text x="32" y="45" font-size="36" font-weight="800" text-anchor="middle" fill="#fff">؟</text>'};
const MF_MOON='<svg viewBox="0 0 64 64" class="mfmoon"><path d="M38 8a24 24 0 1 0 18 38A20 20 0 0 1 38 8z" fill="#F2E3A0"/><circle cx="13" cy="14" r="1.6" fill="#fff"/><circle cx="54" cy="16" r="1.2" fill="#fff"/><circle cx="50" cy="56" r="1.4" fill="#fff"/></svg>';
const mfEmb=r=>`<i class="mfe r-${MF_SVG[r]&&r!=='?'?r:'q'}"><svg viewBox="0 0 64 64">${MF_SVG[r]||MF_SVG['?']}</svg></i>`;
const MF_SUN=`<svg viewBox="0 0 64 64" class="mfsun"><circle cx="32" cy="32" r="13" fill="#F0B429"/><g stroke="#F0B429" stroke-width="4" stroke-linecap="round">${[0,1,2,3,4,5,6,7].map(k=>{const a=k*Math.PI/4,c=Math.cos(a),s=Math.sin(a);return `<path d="M${(32+19*c).toFixed(1)} ${(32+19*s).toFixed(1)}L${(32+26*c).toFixed(1)} ${(32+26*s).toFixed(1)}"/>`;}).join('')}</g></svg>`;
function mfSky(d){const n=`<small>${aliveSeats(d).length} باقين</small>`;
  if(d.ph==='set')return `<div class="mfsky"><span>⚙️</span><b>إعداد اللعبة</b></div>`;
  if(d.ph==='role')return `<div class="mfsky"><span>🃏</span><b>توزيع الأدوار</b></div>`;
  if(d.ph==='night')return `<div class="mfsky">${MF_MOON}<b>الليلة ${d.night}</b>${n}</div>`;
  return `<div class="mfsky">${MF_SUN}<b>${d.ph==='vote'?'التصويت':'النهار'}</b>${n}</div><div class="mfsteps"><i class="${d.ph==='day'?'on':'ok'}">١ الاتهام</i><i class="${d.ph==='vote'?'on':''}">٢ التصويت</i></div>`;}
// every seat as a tile: the ones you can pick now are buttons (data-ga="p"), the ones that are out are greyed and show their role
function mfRoster(d,v,can,cnt){const meM=v>=0&&d.roles[v]==='m';
  return `<div class="pvg n${d.pl.length}">${d.pl.map((r,s)=>{const out=d.out[s]==='1',ok=!out&&can(s),mate=meM&&s!==v&&d.roles[s]==='m';
    const cls=`pv ${out?'out':ok?'can':'no'} ${s===v?'me':''} ${mate?'mate':''}`;const rn=out&&mfShow(d,s,v)?mfRN(d,s):'';
    const inner=`<i>${shapeW(r)}${out?'<u class="pvx">💀</u>':''}${mate?`<u class="pvm">${s===d.gf?'👑':'🎩'}</u>`:''}${cnt&&cnt[s]?`<u class="pvc">${cnt[s]}</u>`:''}</i><span>${nm(d,s)}</span>${rn?`<em>${rn}</em>`:s===v?'<em>أنت</em>':''}`;
    return ok?`<button class="${cls}" style="--c:${COLS[r]}" data-ga="p" data-i="${s}">${inner}</button>`:`<div class="${cls}" style="--c:${COLS[r]}">${inner}</div>`;}).join('')}</div>`;}
// what just happened: who died in the night (with their role turning over), or how the town voted
function mfEvent(d){const ev=d.ev;if(!ev)return '';const tile=(s,why)=>{const rv=!!d.op&&!!d.op.rv&&d.roles[s]&&d.roles[s]!=='?';
    return `<div class="mfdead" style="--c:${col(d,s)}"><i>${shapeW(d.pl[s])}</i><b>${nm(d,s)}</b><small>${why}</small><div class="mfrc ${rv?'r-'+d.roles[s]:''}"><div class="mfin">${rv?mfEmb(d.roles[s])+`<em>${mfRN(d,s)}</em>`:mfEmb('?')+'<em>دوره سري</em>'}</div></div></div>`;};
  const why={m:'قتلته المافيا 🔪',s:'رصاصة القناص 🎯',x:'القناص أخطأ ودفع الثمن',v:'طلّعه التصويت 🗳️'};
  let h=`<div class="mfev ${ev.k}" id="mfev${d.rd}">`;
  if(ev.k==='n'){h+=`<p class="mfevh">${ev.l.length?'صباح حزين…':'صباح الخير! ما مات أحد الليلة 🌤️'}</p>`;if(ev.l.length)h+=`<div class="mfdl">${ev.l.map(([s,c])=>tile(s,why[c]||'')).join('')}</div>`;}
  else{const c=ev.c||[],mx=Math.max(1,...c.map(x=>x[1]),ev.sk||0);
    h+=`<p class="mfevh">نتيجة التصويت</p><div class="mfbars">${c.map(([s,n])=>`<div class="mfbar ${s===ev.o?'hit':''}" style="--c:${col(d,s)}"><b>${nm(d,s)}</b><span><i style="transform:scaleX(${(n/mx).toFixed(3)})"></i></span><em>${n}</em></div>`).join('')}${ev.sk?`<div class="mfbar sk"><b>ما أطلّع</b><span><i style="transform:scaleX(${(ev.sk/mx).toFixed(3)})"></i></span><em>${ev.sk}</em></div>`:''}</div>`;
    h+=ev.o>=0?`<div class="mfdl">${tile(ev.o,why.v)}</div>`:`<p class="mfevh small">${c.length?'ما اتفقتوا، وما طلع أحد':'محد اتهم أحد، وما طلع أحد'}</p>`;}
  return h+'</div>';}
// the accusations of this day: who points at whom, and why (the bots say why)
function mfAccList(d){const a=d.acc;if(!a)return '';const rows=a.map((x,s)=>x&&x[0]>=0?`<li style="--c:${col(d,s)}"><b>${nm(d,s)}</b> يتهم <b style="color:${col(d,x[0])}">${nm(d,x[0])}</b>${x[1]&&MFWHY[x[1]]?`<small>«${MFWHY[x[1]]}»</small>`:''}</li>`:'').filter(Boolean);
  return rows.length?`<ul class="mfacc">${rows.join('')}</ul>`:'';}
GAMES.mafia={teams:'none',name:'المافيا',cat:'quiz',lbc:'#2B2F45',minP:4,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2B2F45"/><circle cx="78" cy="22" r="10" fill="#F2E3A0"/><circle cx="82" cy="19" r="9" fill="#2B2F45"/><path d="M26 44h48l-6-16H32z" fill="#111"/><rect x="18" y="42" width="64" height="7" rx="3" fill="#111"/><path d="M30 52c0 14 9 24 20 24s20-10 20-24z" fill="#E9C9A6"/><rect x="34" y="56" width="32" height="7" rx="3" fill="#111"/></svg>`,
  init:n=>({ph:'set',op:mfOpt0(n),roles:'c'.repeat(n),gf:-1,sb:0,rd:0,night:1,last:'',res:'',ls:-1,inv:null,log:[],ah:[],vh:[],nk:[],acc:null,cand:null,ev:null}),
  simulNow:d=>d.ph!=='set',
  /* online: you see your own role, your fellow mafia (and which of them is the boss) and the roles of the ones who are out
     (when that option is on); the doctor's last save and the detective's answer stay with them */
  mask(d,seat){if(d.win!=null)return d;const me=seat>=0?d.roles[seat]:null,rv=!!(d.op&&d.op.rv);
    const see=s=>s===seat||(rv&&d.out[s]==='1')||(me==='m'&&d.roles[s]==='m');
    return {...d,roles:[...d.roles].map((c,s)=>see(s)?c:'?').join(''),gf:d.gf>=0&&see(d.gf)?d.gf:-1,ls:me==='d'?d.ls:-1,inv:d.inv&&d.inv.s===seat?d.inv:null};},
  net:{local:['ok','p']},
  viewer:d=>d.ph==='set'?null:simulViewer(d),coverMsg:d=>d.res||'',
  winText:d=>d.side==='j'?`المهرج ${nm(d,d.win)} ضحك عليكم وفاز 🤡`:d.side==='m'?'فازت المافيا 🕵️':'فاز أهل المدينة 🎉',
  winExtra:d=>d.pl.map((_,s)=>`${nm(d,s)} ${mfRN(d,s)}`).join('، '),
  points:d=>d.pl.map((_,s)=>(d.out[s]==='1'&&d.op&&d.op.rv)||d.win!=null?mfRN(d,s):''),
  onTimeout:d=>d.ph==='set'?mfDeal(d):d,
  status(d,ctx){let s=d.res?`<small>${d.res}</small><br>`:'';
    if(d.ph==='set')return `${ctx.local||d.turn===ctx.v?'<b class="yt">أنت</b>':nameTag(d,d.turn)} يختار الأدوار`;
    if(d.ph==='role')return s+'كل واحد يشوف دوره بالسر';
    if(d.ph==='night')return s+`الليلة ${d.night} 🌙 كل واحد يسوي دوره`;
    if(d.ph==='day')return s+'النهار ☀️ تناقشوا، وكل واحد يتهم واحد يشك فيه';
    return 'صوّتوا: مين يطلع من المتهمين؟';},
  render(d,ctx){const v=ctx.v;const wrap=h=>`<div class="mfb ${d.ph==='vote'?'day':d.ph==='set'?'role':d.ph}">${mfSky(d)}${h}</div>`;
    if(d.ph==='set'){const my=ctx.local||d.turn===v;const n=d.pl.length,m=mfNM(n);
      const chips=[['m',`مافيا ×${m}`],['d','طبيب'],['t','محقق'],...MFO.slice(0,3).filter(o=>mfOn(d,o[0])).map(o=>[o[0]==='k'?'m':o[0],o[1].split(' ').slice(1).join(' ')])];
      const cit=n-2-m-(mfOn(d,'s')?1:0)-(mfOn(d,'j')?1:0);
      return wrap(`<div class="mfset"><div class="mfchips">${chips.map(([r,t])=>`<span class="r-${r}">${mfEmb(r)}<b>${t}</b></span>`).join('')}${cit>0?`<span class="r-c">${mfEmb('c')}<b>مواطن ×${cit}</b></span>`:''}</div>
        <div class="mfopts">${MFO.map(([k,t,x,mn],i)=>{const ok=n>=mn,on=mfOn(d,k);return `<button class="mfopt ${on?'on':''}" data-ga="opt" data-i="${i}" ${my&&ok?'':'disabled'}><b>${t}</b><small>${ok?x:`من ${mn} لاعبين`}</small><i>${on?'✓':''}</i></button>`;}).join('')}</div>
        ${my?'<button class="big green" data-ga="go">وزّع الأدوار 🃏</button>':'<p class="note">ننتظر يختار الأدوار…</p>'}</div>`);}
    const ev=d.ph==='day'||d.ph==='night'?mfEvent(d):'';
    if(v==null||v<0)return wrap(ev+mfRoster(d,-1,()=>false)+'<p class="note">ننتظر الباقين…</p>'+mfLog(d));
    const r=d.roles[v];const mates=d.pl.map((_,s)=>s).filter(s=>s!==v&&d.roles[s]==='m');
    const desc=({m:`تقتلون واحد كل ليلة${v===d.gf?'، وأنت الزعيم: المحقق يشوفك بريء':''}${mates.length?` • معك: ${mates.map(s=>nm(d,s)+(s===d.gf?' 👑':'')).join('، ')}`:''}`,d:'كل ليلة تنقذ واحد من القتل، وما تنقذ نفس الشخص ليلتين ورا بعض',t:'كل ليلة تسأل عن واحد وتعرف هل هو مافيا',
      s:'معك رصاصة وحدة: بالليل تقدر تقنص واحد. لو طلع مو مافيا تموت معه',j:'تبيهم يطلّعونك بالتصويت! لو صار تفوز لحالك',c:'نام بالليل، وبالنهار اكشف المافيا بالتصويت'})[r]||'';
    const card=`<div class="mfcard r-${r}"><div class="mfin"><div class="mfback">${MF_MOON}</div><div class="mffront"><small>دورك</small>${mfEmb(r)}<b>${mfRN(d,v)}</b><p>${desc}</p></div></div></div>`;
    if(!mfAlive(d,v))return wrap(ev+`<div class="mfgone">${mfEmb(r)}<p>أنت طلعت من اللعبة، تابع بصمت 🤐</p></div>`+mfRoster(d,v,()=>false)+mfAccList(d)+mfLog(d));
    if(!ctx.my)return wrap(ev+card+'<p class="note">ننتظر الباقين…</p>'+mfLog(d));
    if(d.ph==='role')return wrap(card+'<button class="big green" data-ga="ok">فهمت دوري</button>');
    const al=aliveSeats(d);let h=ev+`<details class="mfme r-${r}"><summary>${mfEmb(r)}<span>دوري: <b>${mfRN(d,v)}</b></span></summary>${card}</details>`;
    const pick=(lbl,list,extra,cnt)=>`<p class="mfq">${lbl}</p>`+mfRoster(d,v,s=>list.includes(s),cnt)+(extra||'');
    if(d.ph==='night'){
      if(r==='m')h+=pick('مين تقتلون الليلة؟',al.filter(s=>d.roles[s]!=='m'));
      else if(r==='d')h+=pick('مين تنقذ الليلة؟',al.filter(s=>s!==d.ls));
      else if(r==='t')h+=pick('مين تبي تكشف؟',al.filter(s=>s!==v));
      else if(r==='s'&&d.sb)h+=pick('تقنص أحد الليلة؟ 🎯',al.filter(s=>s!==v),'<button class="mfskip" data-ga="p" data-i="-1">أحتفظ بالرصاصة</button>');
      else h+=mfRoster(d,v,()=>false)+'<button class="big navy mfsleep" data-ga="p" data-i="-1">نام 😴</button>';}
    else{if(d.inv&&d.inv.s===v)h+=`<div class="mfinv ${d.inv.m?'bad':'ok'}">${mfEmb('t')}<span>${nm(d,d.inv.t)} ${d.inv.m?'<b>مافيا!</b>':'<b>مو مافيا</b>'}</span></div>`;
      if(d.ph==='day')h+=pick('مين تتهم؟',al.filter(s=>s!==v),'<button class="mfskip" data-ga="p" data-i="-1">ما أتهم أحد</button>');
      else{const cnt=d.pl.map(()=>0);(d.acc||[]).forEach(x=>{if(x&&x[0]>=0)cnt[x[0]]++;});
        h+=mfAccList(d)+pick('مين يطلع؟',(d.cand||[]).filter(s=>s!==v),'<button class="mfskip" data-ga="p" data-i="-1">ما أطلّع أحد</button>',cnt);}}
    return wrap(h+mfLog(d));},
  click(a,i,d,ctx){
    if(d.ph==='set'){if(!(ctx.local||d.turn===ctx.v))return;
      if(a==='opt'){const o=MFO[i];if(!o||d.pl.length<o[3])return;act({...d,op:{...d.op,[o[0]]:d.op[o[0]]?0:1}});return;}
      if(a==='go'){act(mfDeal(d));return;}return;}
    if(!ctx.my)return;if(a==='ok'&&d.ph==='role'){simulPick(d,ctx.v,1);return;}if(a==='p')simulPick(d,ctx.v,i);},
  bot:(d,s,lv)=>d.ph==='set'?mfDeal(d):undefined,
  // a sound for what just happened, once: a death at dawn, someone voted out
  after(d){const k=d.gid+':'+d.rd;if(!d.ev||S.mfEvK===k||(d.ph!=='day'&&d.ph!=='night'))return;S.mfEvK=k;sfx(d.ev.k==='n'?(d.ev.l.length?'lose':'pop'):(d.ev.o>=0?'turn':'pop'));},
  resolve(d,picks){
    if(d.ph==='role')return {...d,ph:'night',rd:d.rd+1,res:'جت الليلة الأولى 🌙'};
    const al=aliveSeats(d);
    if(d.ph==='night'){const mv=al.filter(s=>d.roles[s]==='m').map(s=>picks[s]).filter(x=>x!=null&&x>=0&&d.out[x]!=='1');
      const cnt={};mv.forEach(x=>cnt[x]=(cnt[x]||0)+1);const mx=Math.max(0,...Object.values(cnt));const top=Object.keys(cnt).filter(k=>cnt[k]===mx).map(Number);
      const kill=top.length?top[rnd(top.length)]:-1;const ds=al.find(s=>d.roles[s]==='d'),ts=al.find(s=>d.roles[s]==='t'),ss=al.find(s=>d.roles[s]==='s');
      const save=ds!=null&&picks[ds]!=null?picks[ds]:-1;const chk=ts!=null&&picks[ts]!=null?picks[ts]:-1;
      const shot=ss!=null&&d.sb&&picks[ss]!=null&&picks[ss]>=0&&d.out[picks[ss]]!=='1'?picks[ss]:-1;
      const dead=[];if(kill>=0&&kill!==save)dead.push([kill,'m']);
      if(shot>=0){if(shot!==save&&!dead.some(x=>x[0]===shot))dead.push([shot,'s']);if(d.roles[shot]!=='m'&&!dead.some(x=>x[0]===ss))dead.push([ss,'x']);}
      let out=d.out;dead.forEach(([s])=>out=setAt(out,s,'1'));const rv=d.op&&d.op.rv;
      const res=`الليلة ${d.night}: `+(dead.length?dead.map(([s,c])=>`${c==='m'?'المافيا قتلت':c==='s'?'القناص قنص':'القناص أخطأ ومات'} ${nm(d,s)}${rv?` وكان ${mfRN(d,s)}`:''}`).join('، '):'ما مات أحد');
      const nd={...d,out,ph:'day',rd:d.rd+1,ls:save,sb:shot>=0?0:d.sb,inv:chk>=0?{s:ts,t:chk,m:d.roles[chk]==='m'&&chk!==d.gf}:null,acc:null,cand:null,
        ev:{k:'n',l:dead},nk:[...d.nk,...dead.map(([s,c])=>[s,d.night,c])],res,log:[...d.log,res]};return mfCheck(nd);}
    if(d.ph==='day'){const acc=d.pl.map((_,s)=>{if(!al.includes(s))return null;const p=picks[s];if(p==null||p<0)return [-1,0];const t=p%100,w=Math.floor(p/100);return al.includes(t)&&t!==s?[t,w<MFWHY.length?w:0]:[-1,0];});
      const cnt=d.pl.map(()=>0);acc.forEach(x=>{if(x&&x[0]>=0)cnt[x[0]]++;});const ord=d.pl.map((_,s)=>s).filter(s=>cnt[s]>0).sort((a,b)=>cnt[b]-cnt[a]);
      const ah=[...d.ah,acc.map(x=>x?(x[0]>=0?x[0]+100*x[1]:-1):-2)];
      if(!ord.length){const res='محد اتهم أحد، وجا الليل';const nd={...d,ph:'night',night:d.night+1,rd:d.rd+1,inv:null,acc,ah,cand:null,vh:[...d.vh,{v:d.pl.map(()=>-1),k:-1}],ev:{k:'v',c:[],sk:0,o:-1},res,log:[...d.log,res]};return mfCheck(nd);}
      // the most accused go to the vote: two of them, or more when they tie
      const cut=cnt[ord[Math.min(1,ord.length-1)]];const cand=ord.filter(s=>cnt[s]>=cut).slice(0,4);
      return {...d,ph:'vote',rd:d.rd+1,acc,ah,cand,res:`المتهمين: ${cand.map(s=>`${nm(d,s)} (${cnt[s]})`).join('، ')}`};}
    // the vote: the one with the most votes goes, if he has more than the ones who would keep everybody
    const vs=d.pl.map((_,s)=>{if(!al.includes(s))return -2;const p=picks[s];return p!=null&&(d.cand||[]).includes(p)&&p!==s?p:-1;});
    const c=(d.cand||[]).map(s=>[s,vs.filter(x=>x===s).length]);const sk=vs.filter(x=>x===-1).length;const mx=Math.max(0,...c.map(x=>x[1]));const top=c.filter(x=>x[1]===mx);
    const o=mx>0&&top.length===1&&mx>=sk?top[0][0]:-1;let out=d.out,res;const rv=d.op&&d.op.rv;
    if(o>=0){out=setAt(out,o,'1');res=`طلّعتوا ${nm(d,o)}${rv?` وكان ${mfRN(d,o)}`:''} (${mx} أصوات)`;}else res=mx?'ما اتفقتوا، وما طلع أحد':'ما أحد صوّت';
    const nd={...d,out,ph:'night',night:d.night+1,rd:d.rd+1,inv:null,vh:[...d.vh,{v:vs,k:o}],ev:{k:'v',c,sk,o},res,log:[...d.log,res]};
    if(o>=0&&d.roles[o]==='j')return {...nd,win:o,wins:[o],side:'j'};
    return mfCheck(nd);}
};
const mfLog=d=>d.log.length?`<details class="mflogd"><summary>📜 اللي صار <small>${d.log.length}</small></summary><ul class="mflog">${d.log.map(x=>`<li>${x}</li>`).join('')}</ul></details>`:'';
/* the bots: they read only what everybody saw (accusations, votes, who died and the roles shown), plus their own role,
   their fellow mafia and what their own detective found. A harder bot weighs the clues more and guesses less */
function mfMem(d,s){if(!S.mfMem||S.mfMem.g!==d.gid)S.mfMem={g:d.gid,m:{}};return S.mfMem.m[s]||(S.mfMem.m[s]={});}
GAMES.mafia.botSee=nd=>{if(nd.inv&&nd.inv.s>=0&&isBot(nd,nd.inv.s))mfMem(nd,nd.inv.s)['c'+nd.inv.t]=nd.inv.m;};
// the public role of seat x as everybody knows it ('' while it is secret)
const mfPub=(d,x)=>d.out[x]==='1'&&d.op&&d.op.rv?d.roles[x]:'';
// d.ah keeps every day's accusations as target+100*reason (-1 nobody, -2 out)
const mfT=c=>c<0?c:c%100,mfW=c=>c<0?0:Math.floor(c/100);
// every «I am the detective» so far: [day, claimer, target]
function mfClaims(d){const l=[];d.ah.forEach((a,k)=>a.forEach((c,x)=>{if(mfW(c)===3)l.push([k,x,mfT(c)]);}));return l;}
// how much bot s suspects each seat, and the main reason
function mfSus(d,s,lv){const R=srng(d,'mfs'+s+'_'+d.night+d.ph);const al=aliveSeats(d);const K=mfMem(d,s);const me=d.roles[s];
  const sc={},why={};const add=(x,v,w)=>{if(!(x in sc))return;sc[x]+=v;if(w&&v>0&&(!why[x]||v>=why[x][1]))why[x]=[w,v];};
  al.forEach(x=>{if(x!==s){sc[x]=R()*[0,6,3,1.2][lv];why[x]=[7,0];}});
  const town=x=>{const r=mfPub(d,x);return !!r&&r!=='m';},maf=x=>mfPub(d,x)==='m';
  d.vh.forEach((h,k)=>{const acc=d.ah[k]||[];
    if(h.k>=0){if(town(h.k))h.v.forEach((t,x)=>{if(t===h.k)add(x,2,1);});if(maf(h.k))h.v.forEach((t,x)=>{if(t===h.k)add(x,-1.5);else if(t===-1)add(x,1.5,2);});}
    acc.forEach((c,x)=>{const t=mfT(c);if(t>=0&&town(t))add(x,.8,1);if(t>=0&&maf(t))add(x,-1);});});
  // the night's victims were often onto someone
  d.nk.forEach(([v,n,c])=>{if(c!=='m')return;const acc=d.ah[n-2];if(acc&&mfT(acc[v])>=0)add(mfT(acc[v]),1.5,6);});
  const last=d.ah[d.ah.length-1];
  if(last)last.forEach((c,x)=>{if(mfT(c)===s&&me!=='m')add(x,1,5);if(c===-1&&lv>1)add(x,.6,4);});
  // «I am the detective»: the real one knows a liar; a claim proven wrong marks the liar; an open one is believed,
  // by an easy bot blindly, by a hard one only when one person claims and he looks clean
  const cl=mfClaims(d);const open=cl.filter(([k,x,t])=>!mfPub(d,t)&&d.out[x]!=='1');const many=new Set(open.map(c=>c[1])).size>1;
  for(const [k,x,t] of cl){if(x===s)continue;
    if(me==='t'){add(x,30,10);continue;}
    if(town(t)){add(x,8,11);continue;}if(maf(t)){add(x,-6);continue;}
    if(d.out[x]==='1'){if(lv>1)add(t,2,8);continue;}
    if(lv===1){if(R()<.6)add(t,4,8);}
    else if(lv===2){if((sc[x]||0)<4)add(t,many?1.5:3.5,8);}
    else if(many)add(x,1.5,9);else if((sc[x]||0)<3)add(t,5,8);}
  for(const k in K){const x=+k.slice(1);if(K[k])add(x,50,3);else add(x,-50);}
  return {sc,why};}
function mfBest(sc,list){let b=-1,bv=-1e9;for(const x of list)if(sc[x]>bv){bv=sc[x];b=x;}return b;}
GAMES.mafia.botPick=(d,s,lv)=>{const r=d.roles[s];if(d.ph==='role')return 1;const al=aliveSeats(d).filter(x=>x!==s);const M=mfMem(d,'m');
  const nonM=al.filter(x=>d.roles[x]!=='m');const {sc,why}=mfSus(d,s,lv);const claimers=new Set(mfClaims(d).map(c=>c[1]));
  // the mafia's danger list: who accused one of them, and anyone who says he is the detective
  const threat=x=>{let t=Math.random()*[0,4,2,1][lv];d.ah.forEach(a=>{if(d.roles[mfT(a[x])]==='m')t+=1.5;});if(claimers.has(x))t+=lv===3?8:3;return t;};
  if(d.ph==='night'){
    if(r==='m'){if(lv<2||!nonM.length)return nonM.length?pickR(nonM):-1;const k='n'+d.night;
      // a hard mafia frames: it kills someone who pointed at a citizen (the town then looks at that citizen), not its own accuser
      const last=d.ah[d.ah.length-1]||[];const kv=x=>{if(lv<3)return threat(x);const t=mfT(last[x]);return Math.random()*2+(claimers.has(x)?8:0)+(t>=0?(d.roles[t]==='m'?-3:3):0);};
      if(!nonM.includes(M[k])){let b=nonM[0],bv=-1e9;for(const x of nonM){const t=kv(x);if(t>bv){bv=t;b=x;}}M[k]=b;}return M[k];}
    if(r==='d'){const ok=aliveSeats(d).filter(x=>x!==d.ls);if(lv===1)return pickR(ok);
      const cl=[...claimers].filter(x=>ok.includes(x)&&x!==s&&(sc[x]||0)<4);if(cl.length&&Math.random()<(lv===3?.85:.6))return cl[0];
      if(ok.includes(s)&&Math.random()<(lv===3?.35:.2))return s;return pickR(ok);}
    if(r==='t'){const K=mfMem(d,s);const nw=al.filter(x=>!('c'+x in K));if(lv===1||!nw.length)return pickR(al);return lv===3?mfBest(sc,nw):pickR(nw);}
    if(r==='s'&&d.sb){if(lv===1)return Math.random()<.15?pickR(al):-1;const b=mfBest(sc,al);return b>=0&&sc[b]>=(lv===3?4.5:6)?b:-1;}
    return -1;}
  if(d.ph==='day'){
    if(r==='m'){if(lv===1&&Math.random()<.3)return -1;
      // a bold mafia bot may pretend to be the detective
      // a hard one does not point at the one they will kill tonight: that would mark it when the victim turns out clean
      const fake=lv===3&&!claimers.size&&aliveSeats(d).length>=6&&Math.random()<.15;if(!nonM.length)return -1;
      const rk=nonM.map(x=>[x,threat(x)+(sc[x]||0)*.3]).sort((a,b)=>b[1]-a[1]);const b=rk[lv===3&&rk.length>1&&!fake?1:0][0];
      return b+100*(fake?3:claimers.has(b)?10:d.ah.some(a=>mfT(a[b])===s)?5:pickR([4,7,1]));}
    if(r==='j'){if(Math.random()<.3)return -1;return pickR(al)+100*7;}
    if(lv===1&&Math.random()<.3)return -1;const b=mfBest(sc,al);if(b<0)return -1;
    const w=why[b]&&why[b][0]||7;return b+100*(r!=='t'&&w===3?8:w);}
  // the vote
  const cand=(d.cand||[]).filter(x=>x!==s&&d.out[x]!=='1');if(!cand.length)return -1;
  if(r==='m'){const town=cand.filter(x=>d.roles[x]!=='m');const cnt=x=>(d.acc||[]).filter(a=>a&&a[0]===x).length;
    if(town.length){if(lv===1)return pickR(town);const b=town.sort((a,b)=>cnt(b)-cnt(a))[0];return lv===3&&cnt(b)*2>aliveSeats(d).length?-1:b;}
    // only mafia on the block: a hard bot joins the crowd when it is hopeless, to look clean
    const doomed=cand.find(x=>cnt(x)*2>aliveSeats(d).length);return lv===3&&doomed!=null?doomed:-1;}
  if(r==='j')return Math.random()<.5?-1:pickR(cand);
  if(lv===1&&Math.random()<.2)return -1;
  const b=mfBest(sc,cand);return sc[b]<(lv===3?-5:-20)?-1:b;};

/* ---------- وصلة: كلمة من خمس حروف بست محاولات، الكل يلعب بنفس الوقت ---------- */
const WNORM=w=>String(w).replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
const WASLA='مدرسة سيارة طائرة مكتبة حديقة ملعقة مروحة نافذة وسادة سفينة مدينة قبيلة جزيرة بحيرة صحراء خريطة رسالة قصيدة عائلة جامعة طاولة خزانة ثلاجة غسالة مكنسة فراشة زرافة غزالة دجاجة بطاطس فاكهة كنافة بسكوت عصفور حمامة تمساح دلفين ثعبان بطريق نعامة سنجاب تفاحة رمانة ليمون جوافة مانجو زيتون طماطم ملفوف بيتزا فطيرة مرقوق قرصان عصيدة زبادي شوربة مزرعة حظيرة بقالة منتزه ميناء عاصمة اليمن لبنان سوريا ليبيا الهند الصين تركيا ايران فرنسا روسيا جازان نجران الخبر بريدة عنيزة سكاكا الجوف بيروت بغداد باريس مدريد طوكيو مهندس محامي ممرضة مزارع سجادة ستارة مصباح ابريق فنجان مقلاة مكواة مفتاح حقيبة محفظة نظارة قلادة مسطرة ممحاة حاسوب تلفاز راديو سماعة بنطال فستان عباءة جاكيت جوارب طاقية سروال سحابة بركان زلزال عاصفة امطار اسنان جمجمة اظافر سباحة رماية شطرنج سعادة صداقة شجاعة كرامة امانة نظافة رمادي بنفسج سماوي كتابة قراءة رياضة سياحة تجارة زراعة صناعة هندسة ادارة سياسة ثقافة ترجمة حكاية رواية سينما اغنية مشكلة اجابة شهادة وظيفة اجازة تذكرة ضيافة ظهيرة اسبوع سنوات دقيقة ثانية الفجر العصر رمضان السبت الصيف دراجة حافلة شاحنة غواصة صاروخ مركبة اسعاف تاكسي ميزان مسمار مطرقة منشار فرشاة صابون معجون منشفة نعناع ريحان خزامى الماس ياقوت تطبيق رسائل جيران اخوان اطفال والدة اعمام اخوال معلمة طالبة تلميذ سبورة قاموس جريدة صحيفة اخبار اعلان البحر الشمس القمر النجم الورد مكتوب مشروع محطات مطاعم ملابس منازل مساجد مدارس أسواق شوارع حدائق أنهار كواكب أقلام دفاتر نوافذ أبواب كراسي فنادق عربات ممرات مطابخ أنفاق أبراج وديان غابات واحات سواحل شواطئ أمواج حجارة أوراق كرتون طاووس ببغاء حيتان أسماك ضفادع أغنام أبقار أرانب فئران ثعالب غزلان جرادة بعوضة ذبابة حلزون بطيخة كمثرى خيارة كاسات ملاعق شوكات أكواب مناشف مرايا ساعات خواتم أساور سلاسل حقائب أحذية قمصان أثواب معاطف قبعات أريكة خزائن أدراج ستائر وسائد مدفأة نشافة محمصة فنجال صينية مغرفة مصفاة مقالة بطاقة هدايا أشجار أغصان بستان صيدلي أقارب أبناء أولاد أجداد أحفاد أخوات بلدان كلمات صفحات تاريخ أحياء اثنين يناير أبريل يونيو يوليو أغسطس أضواء ألوان عنابي إعصار حرارة برودة رطوبة فيضان مسافر رحلات قائمة دولار دينار تعاون ترتيب أسئلة أجوبة أفكار أهداف خسارة تعادل بطولة جائزة جوائز ألعاب بالون'.split(' ');
const WKEYS=['ضصثقفغعهخحج','شسيبلاتنمكط','ءئؤرذدزظوة'];
let WDICT=null,WDLOAD=null,WDFAIL=0;
// a failed or odd answer (404, captive portal page) leaves no dictionary and is tried again a bit later
function wLoad(){if(WDICT||WDLOAD||Date.now()-WDFAIL<15000)return;WDLOAD=fetch('data/ar5.txt?v=1').then(r=>{if(!r.ok)throw 0;return r.text();}).then(t=>{if(!/^0[a-zA-E]{5}/.test(t))throw 0;const L='ءؤئابتثجحخدذرزسشصضطظعغفقكلمنهوي',A='abcdefghijklmnopqrstuvwxyzABCDE';const m={};[...A].forEach((c,i)=>m[c]=L[i]);
  const out=[];let prev='',i=0;while(i<t.length){const k=+t[i];i++;const w=prev.slice(0,k)+t.slice(i,i+5-k);i+=5-k;out.push(w);prev=w;}
  if(out.length<100000)throw 0;WDICT={s:out.join(''),n:out.length,m};}).catch(()=>{WDLOAD=null;WDFAIL=Date.now();});}
function wKnown(w){w=WNORM(w);if(WASLA.some(x=>WNORM(x)===w))return true;if(!WDICT)return true;
  const r={};const L='ءؤئابتثجحخدذرزسشصضطظعغفقكلمنهوي',A='abcdefghijklmnopqrstuvwxyzABCDE';const enc=[...w].map(c=>A[L.indexOf(c)]||'?').join('');
  let lo=0,hi=WDICT.n-1;while(lo<=hi){const mid=(lo+hi)>>1;const x=WDICT.s.substr(mid*5,5);if(x===enc)return true;if(x<enc)lo=mid+1;else hi=mid-1;}return false;}
function wEnd(nd){if(nd.out.includes('0'))return nd;const sv=nd.pl.map((_,s)=>(nd.solved||[])[s]||99);const mn=Math.min(...sv);if(mn===99)return {...nd,win:'d'};const w=sv.map((x,s)=>x===mn?s:-1).filter(s=>s>=0);return {...nd,win:w[0],wins:w};}
// the colours of seat s's try r: stored when the round resolved (a view online has no answer), worked out for an older state
const wSc=(d,s,r)=>{const c=d.gsc&&d.gsc[s]&&d.gsc[s][r];if(typeof c==='string'&&c.length===5)return [...c].map(Number);const g=d.gs&&d.gs[s]&&d.gs[s][r];return g&&d.ans>=0?wScore(g,WNORM(WASLA[d.ans])):null;};
function wScore(g,a){const res=Array(5).fill(0);const left={};for(let i=0;i<5;i++){if(g[i]===a[i])res[i]=2;else left[a[i]]=(left[a[i]]||0)+1;}
  for(let i=0;i<5;i++)if(res[i]!==2&&left[g[i]]){res[i]=1;left[g[i]]--;}return res;}
GAMES.wasla={name:'وصلة',cat:'mind',lbc:'#2E7D5B',noTimer:false,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E8B63"/>${[0,1,2].map(r=>[0,1,2,3,4].map(c=>`<rect x="${9+c*17}" y="${18+r*22}" width="15" height="18" rx="3" fill="${r===2?'#4CB97F':(r+c)%3===0?'#EDB02F':'#fff'}" opacity="${r===2||(r+c)%3===0?1:.35}"/>`).join('')).join('')}</svg>`,
  init:()=>({ans:rnd(WASLA.length),gs:null,gsc:null,rd:0,solved:null}),
  simulNow:()=>true,viewer:d=>simulViewer(d),coverMsg:()=>'',
  // online: the word stays hidden till the end and you only see your own tries; the others' colours come from gsc
  mask:(d,seat)=>d.win!=null?d:{...d,ans:-1,gs:d.gs&&d.gs.map((x,s)=>s===seat?x:x.map(w=>'?'.repeat(w.length)))},
  net:{local:['k','del','ent']},
  points:d=>d.pl.map((_,s)=>{const g=(d.gs||[])[s]||[];return d.solved&&d.solved[s]?`✓ ${g.length}`:`${g.length}/6`;}),
  winText(d){return d.win==='d'?`ما أحد عرفها! الكلمة: ${WASLA[d.ans]}`:null;},
  winExtra:d=>`الكلمة: ${WASLA[d.ans]}`,
  status(d,ctx){return `<small>كلمة من 5 حروف</small><br>المحاولة ${Math.min(6,(d.rd||0)+1)} من 6`;},
  outDone:true,
  render(d,ctx){const v=ctx.v;const gs=d.gs||d.pl.map(()=>[]);const sc=(s,r)=>wSc(d,s,r);
    const row=(w,sc,hide,c)=>`<div class="wrow ${c||''}">${[...Array(5)].map((_,i)=>`<i class="${sc?'w'+sc[i]:''} ${w&&w[i]&&!sc?'typed':''}" style="--i:${i}">${hide?'':(w&&w[i])||''}</i>`).join('')}</div>`;
    if(v==null||v<0)return '<p class="note">ننتظر الباقين…</p>';
    const mine=gs[v]||[];const draft=ctx.my?(S.draft.wl||''):'';
    // the newest scored row flips in; the row being typed is marked
    let h=`<div class="wasla"><div class="wgrid">`;for(let r=0;r<6;r++){if(r<mine.length)h+=row(mine[r],sc(v,r),false,r===mine.length-1?'new':'');else if(r===mine.length&&ctx.my)h+=row(draft,null,false,'cur');else h+=row('');}h+='</div><div class="wleg"><span><i class="w2"></i>بمكانه</span><span><i class="w1"></i>بمكان ثاني</span><span><i class="w0"></i>مو موجود</span></div>';
    // the others: colours only
    const others=d.pl.map((_,s)=>s).filter(s=>s!==v&&!ctx.local);
    if(others.length)h+=`<div class="wothers">${others.map(s=>`<div class="wo"><b style="color:${col(d,s)}">${nm(d,s)}</b>${(gs[s]||[]).map((g,r)=>row(g,sc(s,r),true)).join('')||'<small>…</small>'}</div>`).join('')}</div>`;
    if(!ctx.my)return h+'<p class="note">ننتظر الباقين…</p></div>';
    const st={};mine.forEach((g,r)=>{const x=sc(v,r);if(x)[...g].forEach((c,i)=>{st[c]=Math.max(st[c]??-1,x[i]);});});
    h+=`<div class="wkb">${WKEYS.map((r,ri)=>`<div>${ri===2?'<button class="wk wide" data-ga="ent">إدخال</button>':''}${[...r].map(c=>`<button class="wk ${st[WNORM(c)]!=null?'w'+st[WNORM(c)]:''}" data-ga="k" data-i="${'ضصثقفغعهخحجشسيبلاتنمكطءئؤرذدزظوة'.indexOf(c)}">${c}</button>`).join('')}${ri===2?'<button class="wk wide" data-ga="del">⌫</button>':''}</div>`).join('')}</div></div>`;
    return h;},
  after(){wLoad();},
  click(a,i,d,ctx){if(!ctx.my)return;let w=S.draft.wl||'';
    if(a==='k'){const c='ضصثقفغعهخحجشسيبلاتنمكطءئؤرذدزظوة'[i];if(w.length<5){S.draft.wl=w+WNORM(c);render();}return;}
    if(a==='del'){S.draft.wl=w.slice(0,-1);render();return;}
    if(a==='ent'){if(w.length<5){toast('الكلمة لازم 5 حروف');return;}if(!wKnown(w)){toast('هذي الكلمة مو بالقاموس');return;}S.draft.wl='';simulPick(d,ctx.v,w);}},
  resolve(d,picks){const ans=WNORM(WASLA[d.ans]);const gs=(d.gs||d.pl.map(()=>[])).map(x=>[...x]);const solved=[...(d.solved||d.pl.map(()=>0))];let out=d.out;
    picks.forEach((p,s)=>{if(p===null&&d.out[s]==='1')return;gs[s].push(p?WNORM(p):'؟؟؟؟؟');if(p&&WNORM(p)===ans){solved[s]=gs[s].length;out=setAt(out,s,'1');}else if(gs[s].length>=6)out=setAt(out,s,'1');});
    return wEnd({...d,gs,gsc:gs.map(x=>x.map(g=>wScore(g,ans).join(''))),solved,out,rd:d.rd+1});},
  // d.out also marks the ones who finished, so the engine's "last one left wins" does not apply here
  onSkip:nd=>wEnd({...nd,win:null,wins:undefined})
};

'use strict';
/* party games: برة السالفة, المافيا, وصلة */

/* ---------- برة السالفة ---------- */
const BARA=[
['أكلات','كبسة مندي مضغوط جريش قرصان مرقوق مطازيز هريس سليق مطبق شاورما برجر بيتزا سوشي معكرونة فلافل فول حمص سمبوسة كنافة لقيمات بسبوسة فطاير شكشوكة كبدة مشاوي مقلوبة سلطة شوربة مكرونة_بشاميل'],
['حيوانات','أسد نمر فيل زرافة جمل حصان غزال ذئب ثعلب أرنب قط كلب دب قرد تمساح ثعبان صقر نسر بطريق دلفين حوت قرش سلحفاة نعامة خروف ماعز بقرة ضبع فهد كنغر'],
['دول','السعودية مصر الإمارات الكويت قطر البحرين عمان اليمن الأردن المغرب تونس الجزائر العراق لبنان تركيا اليابان الصين الهند أمريكا بريطانيا فرنسا ألمانيا إيطاليا إسبانيا البرازيل روسيا كندا أستراليا ماليزيا إندونيسيا'],
['مدن سعودية','الرياض جدة مكة المدينة الدمام الخبر أبها الطائف تبوك حائل بريدة عنيزة جازان نجران الباحة سكاكا عرعر الجبيل ينبع القطيف الأحساء خميس_مشيط بيشة الخرج المجمعة العلا القنفذة رابغ حفر_الباطن الدرعية'],
['مهن','طبيب مهندس معلم طيار شرطي محامي نجار خباز طباخ حلاق ممرض صيدلي مزارع صياد رسام مصور مذيع سائق كهربائي سباك مبرمج محاسب قاضي جندي رائد_فضاء إطفائي بائع حارس مترجم صحفي'],
['أماكن','مستشفى مطار مدرسة جامعة مسجد سوق مول مطعم مقهى ملعب حديقة شاطئ صحراء مكتبة بنك فندق سينما صيدلية مخبز محطة_بنزين نادي_رياضي متحف حديقة_حيوانات مدينة_ملاهي استراحة مخيم مزرعة جبل جزيرة مغسلة_سيارات'],
['أغراض البيت','ثلاجة غسالة مكنسة فرن ميكروويف مروحة مكيف تلفزيون كنبة سرير دولاب مرآة مكواة خلاط دلة ترمس إبريق صحن ملعقة سكين مقص مخدة بطانية سجادة ستارة ساعة_حائط لمبة شاحن ريموت سخان'],
['رياضات','كرة_قدم كرة_سلة كرة_طائرة تنس سباحة ملاكمة كاراتيه جري دراجات فروسية غوص تزلج جولف بولينج شطرنج بلياردو رماية مصارعة هوكي كريكيت رفع_أثقال تنس_طاولة تسلق قفز_بالمظلة سباق_سيارات ركوب_أمواج كرة_يد بادل يوغا رمي_الرمح'],
['وسائل نقل','سيارة طيارة قطار باص دراجة دباب سفينة قارب غواصة هليكوبتر تاكسي شاحنة مترو صاروخ منطاد عربة_خيل سكوتر إسعاف سيارة_إطفاء ونش تراكتور يخت جت_سكي تلفريك باص_مدرسة دراجة_نارية كرفان طائرة_شراعية سيارة_شرطة عبارة'],
['لبس وأغراض شخصية','ثوب شماغ غترة عقال بشت عباية طرحة فستان بنطلون قميص جاكيت شورت جزمة نعال شراب قبعة طاقية ساعة نظارة خاتم سلسال محفظة شنطة حزام كرفتة بيجاما معطف جوانتي كاب مظلة'],
['فواكه وخضار','تفاح موز برتقال عنب بطيخ شمام فراولة مانجو أناناس رمان خوخ مشمش كيوي تين تمر ليمون جوافة طماطم خيار جزر بطاطس بصل ثوم فلفل باذنجان كوسة خس ملفوف ذرة فطر'],
['أغراض المدرسة','سبورة قلم دفتر كتاب مسطرة ممحاة شنطة طاولة كرسي طباشير فرجار آلة_حاسبة مقلمة ألوان صمغ مقص خريطة مجسم جرس مقصف ساحة فصل معمل مكتبة شهادة اختبار واجب طابور فسحة زي_مدرسي'],
].map(([t,w])=>[t,w.split(' ').map(x=>x.replace(/_/g,' '))]);
const baraWord=d=>BARA[d.cat][1][d.w];
function baraPairs(d){const p=shuffle(aliveSeats(d));return p.map((a,i)=>[a,p[(i+1)%p.length]]);}
// drop seats that left from the question chain: whoever had to ask them asks the next one still playing
function baraFix(d){const o=s=>d.out[s]==='1',nx={};d.pr.forEach(([a,b])=>nx[a]=b);let qi=0;const pr=[];
  d.pr.forEach(([a,b],i)=>{if(o(a))return;for(let k=0;o(b)&&k<d.pl.length;k++)b=nx[b];if(b==null||b===a||o(b))return;if(i<d.qi)qi++;pr.push([a,b]);});return {...d,pr,qi};}
/* look: an emoji per category, vote counts from d.votes, the player tiles and the reveal of the one out of the loop */
const BARA_E=['🍲','🦁','🌍','🏙️','👷','📍','🛋️','⚽','🚗','👕','🍎','🎒'];
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
  init:n=>({ph:'cat',cat:-1,w:-1,bo:-1,pr:[],qi:0,q2:false,rd:0,votes:null,opts:null,res:'',last:''}),
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
    return x.qi<x.pr.length?{...x,turn:x.pr[x.qi][0]}:{...x,ph:'more',turn:x.pr[0][0],last:'خلصت الأسئلة'};},
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
      h+=`<div class="bdots">${d.pr.map((_,k)=>`<i class="${k<d.qi?'done':k===d.qi?'now':''}"></i>`).join('')}</div>`;
      if(local||a===v)h+='<button class="big green" data-ga="asked">سأل وجاوب، التالي</button>';return h+mine;}
    if(d.ph==='more'){if(myT)h+=`<p class="bhead">جولة أسئلة ثانية ولا نصوّت؟</p><div class="bmore">${d.q2?'':'<button class="bmb again" data-ga="again"><span>🔁</span><b>جولة ثانية</b></button>'}<button class="bmb vote" data-ga="vote"><span>🗳️</span><b>نصوّت</b></button></div>`;return h+mine;}
    if(d.ph==='vote'){if(v==null||v<0||!ctx.my)return '<p class="note">ننتظر تصويت الباقين…</p>'+mine;
      return `<p class="bhead">مين تتوقع برة السالفة؟</p>`+baraTiles(d,v,s=>s!==v&&d.out[s]!=='1',null)+mine;}
    const cnt=baraCount(d);
    if(d.ph==='guess'){h+=baraReveal(d,false)+baraTiles(d,-1,()=>false,cnt);if(!(local||v===d.bo))return h+`<p class="note">${nm(d,d.bo)} يخمّن السالفة الحين…</p>`;
      return h+`<p class="bhead">وش السالفة؟ <small>(${BARA[d.cat][0]})</small></p><div class="opts g2 bguess">${d.opts.map(i=>`<button class="opt" data-ga="g" data-i="${i}">${BARA[d.cat][1][i]}</button>`).join('')}</div>`;}
    if(d.win!=null&&d.cat>=0&&d.bo>=0)return baraReveal(d,true)+baraTiles(d,-1,()=>false,cnt);
    return h;},
  click(a,i,d,ctx){const v=ctx.v,local=ctx.local,myT=local||d.turn===v;
    if(a==='ok'&&d.ph==='see'&&ctx.my){simulPick(d,v,1);return;}
    if(a==='v'&&d.ph==='vote'&&ctx.my&&i!==v&&d.out[i]!=='1'){simulPick(d,v,i);return;}
    if(a==='cat'&&d.ph==='cat'&&myT){act(baraStart(d,i<0?rnd(BARA.length):i));return;}
    if(a==='asked'&&d.ph==='ask'&&(local||d.pr[d.qi][0]===v)){act(baraAsked(d));return;}
    if(a==='again'&&d.ph==='more'&&myT&&!d.q2){{const pr=baraPairs(d);act({...d,ph:'ask',pr,qi:0,q2:true,turn:pr[0][0],last:'جولة أسئلة ثانية'});}return;}
    if(a==='vote'&&d.ph==='more'&&myT){act({...d,ph:'vote',rd:d.rd+1,last:'بدأ التصويت'});return;}
    if(a==='g'&&d.ph==='guess'&&(local||v===d.bo)){act(baraGuess(d,i));return;}},
  resolve(d,picks){if(d.ph==='see')return {...d,ph:'ask',rd:d.rd+1,turn:d.pr[0][0],res:'',last:'كل واحد شاف بطاقته، بدأت الأسئلة'};
    const votes=picks.map(p=>p==null?-1:p);const cnt=Array(d.pl.length).fill(0);votes.forEach(x=>{if(x>=0)cnt[x]++;});const mx=Math.max(...cnt);const top=cnt.map((c,s)=>c===mx?s:-1).filter(s=>s>=0);
    const acc=mx>0&&top.length===1?top[0]:-1;
    const tally=cnt.map((c,s)=>c?`${nm(d,s)} ${c}`:'').filter(Boolean).join('، ');
    if(acc===d.bo){const others=shuffle(BARA[d.cat][1].map((_,i)=>i).filter(i=>i!==d.w)).slice(0,7);
      return {...d,votes,ph:'guess',turn:d.bo,opts:shuffle([d.w,...others]),res:`الأصوات: ${tally}`,last:`انكشف ${nm(d,d.bo)}!`};}
    const wins=[d.bo];return {...d,votes,ph:'end',win:d.bo,wins,res:'',last:acc<0?'تعادل في الأصوات، وطلع اللي برة السالفة سالم':`طلّعتوا ${nm(d,acc)} وهو داخل السالفة`};}
};
function baraStart(d,cat){const al=aliveSeats(d);const pr=baraPairs(d);return {...d,ph:'see',cat,w:rnd(BARA[cat][1].length),bo:al[rnd(al.length)],pr,qi:0,rd:d.rd+1,last:`نوع السالفة: ${BARA[cat][0]}`};}
function baraAsked(d){const qi=d.qi+1;if(qi<d.pr.length)return {...d,qi,turn:d.pr[qi][0],last:''};return {...d,ph:'more',turn:d.pr[0][0],last:'خلصت الأسئلة'};}
function baraGuess(d,i){const ok=i===d.w;if(ok)return {...d,guess:i,ph:'end',win:d.bo,wins:[d.bo],last:`${nm(d,d.bo)} عرف السالفة!`};
  const right=d.votes.map((x,s)=>x===d.bo&&d.out[s]!=='1'?s:-1).filter(s=>s>=0);return {...d,guess:i,ph:'end',win:right.length?right[0]:'d',wins:right,last:`${nm(d,d.bo)} ما عرف السالفة`};}

/* ---------- المافيا ---------- */
const MFR={m:'مافيا',d:'طبيب',t:'محقق',c:'مواطن'},MFE={m:'🕵️',d:'🩺',t:'🔎',c:'🙂'};
function mfRoles(n){const m=n>=6?2:1;const r=['d','t',...Array(m).fill('m')];while(r.length<n)r.push('c');return shuffle(r).join('');}
const mfAlive=(d,s)=>d.out[s]!=='1';
function mfCheck(d){const al=aliveSeats(d);const m=al.filter(s=>d.roles[s]==='m').length,o=al.length-m;
  const team=t=>d.pl.map((_,s)=>s).filter(s=>(d.roles[s]==='m')===(t==='m'));
  if(!m){const w=team('t');return {...d,win:w[0],wins:w,side:'t'};}
  if(m>=o){const w=team('m');return {...d,win:w[0],wins:w,side:'m'};}
  return d;}
/* role emblems (inline SVG), the night sky / day sun band, and the player roster that doubles as the voting board */
const MF_SVG={m:'<path d="M18 35c0-9 3-17 6-19 3-2 5 1 8 1s5-3 8-1c3 2 6 10 6 19-8 2-20 2-28 0z" fill="#1d1d24"/><path d="M18 30c9 2 19 2 28 0v5c-9 2-19 2-28 0z" fill="#C0392B"/><path d="M9 35c9 4 37 4 46 0l-3 5c-9 3-31 3-40 0z" fill="#111"/><path d="M15 45c5-3 12-3 17 1 5-4 12-4 17-1-1 5-5 8-9 8-3 0-6-2-8-4-2 2-5 4-8 4-4 0-8-3-9-8z" fill="#111"/><ellipse cx="24" cy="48" rx="3.2" ry="2" fill="#F2E3A0"/><ellipse cx="40" cy="48" rx="3.2" ry="2" fill="#F2E3A0"/>',
  d:'<rect x="25" y="11" width="14" height="42" rx="4" fill="#fff"/><rect x="11" y="25" width="42" height="14" rx="4" fill="#fff"/><path d="M32 40c-6-4-8.5-6.5-8.5-9.5a4.3 4.3 0 0 1 8.5-1.6 4.3 4.3 0 0 1 8.5 1.6c0 3-2.5 5.5-8.5 9.5z" fill="#E5534B"/>',
  t:'<circle cx="27" cy="27" r="13" fill="#CFE9FF" stroke="#fff" stroke-width="5"/><path d="M21 22a8 8 0 0 1 7-4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M37 37l13 13" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
  c:'<path d="M17 31v20h30V31L32 17z" fill="#fff"/><path d="M11 33L32 14l21 19" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="28" y="38" width="8" height="13" rx="2" fill="#C98B4B"/>',
  '?':'<text x="32" y="45" font-size="36" font-weight="800" text-anchor="middle" fill="#fff">؟</text>'};
const MF_MOON='<svg viewBox="0 0 64 64" class="mfmoon"><path d="M38 8a24 24 0 1 0 18 38A20 20 0 0 1 38 8z" fill="#F2E3A0"/><circle cx="13" cy="14" r="1.6" fill="#fff"/><circle cx="54" cy="16" r="1.2" fill="#fff"/><circle cx="50" cy="56" r="1.4" fill="#fff"/></svg>';
const mfEmb=r=>`<i class="mfe r-${MF_SVG[r]?r:'q'}"><svg viewBox="0 0 64 64">${MF_SVG[r]||MF_SVG['?']}</svg></i>`;
function mfSky(d){if(d.ph==='role')return `<div class="mfsky"><span>🃏</span><b>توزيع الأدوار</b></div>`;
  return d.ph==='night'?`<div class="mfsky">${MF_MOON}<b>الليلة ${d.night}</b><small>${aliveSeats(d).length} باقين</small></div>`:`<div class="mfsky"><svg viewBox="0 0 64 64" class="mfsun"><circle cx="32" cy="32" r="13" fill="#F0B429"/><g stroke="#F0B429" stroke-width="4" stroke-linecap="round">${[0,1,2,3,4,5,6,7].map(k=>{const a=k*Math.PI/4,c=Math.cos(a),s=Math.sin(a);return `<path d="M${(32+19*c).toFixed(1)} ${(32+19*s).toFixed(1)}L${(32+26*c).toFixed(1)} ${(32+26*s).toFixed(1)}"/>`;}).join('')}</g></svg><b>النهار</b><small>${aliveSeats(d).length} باقين</small></div>`;}
// every seat as a tile: the ones you can pick now are buttons (data-ga="p"), the ones that are out are greyed and show their role
function mfRoster(d,v,can){const meM=v>=0&&d.roles[v]==='m';
  return `<div class="pvg n${d.pl.length}">${d.pl.map((r,s)=>{const out=d.out[s]==='1',ok=!out&&can(s),mate=meM&&s!==v&&d.roles[s]==='m';
    const cls=`pv ${out?'out':ok?'can':'no'} ${s===v?'me':''} ${mate?'mate':''}`;
    const inner=`<i>${shapeW(r)}${out?'<u class="pvx">💀</u>':''}${mate?'<u class="pvm">🎩</u>':''}</i><span>${nm(d,s)}</span>${out&&d.roles[s]!=='?'?`<em>${MFR[d.roles[s]]||''}</em>`:s===v?'<em>أنت</em>':''}`;
    return ok?`<button class="${cls}" style="--c:${COLS[r]}" data-ga="p" data-i="${s}">${inner}</button>`:`<div class="${cls}" style="--c:${COLS[r]}">${inner}</div>`;}).join('')}</div>`;}
GAMES.mafia={teams:'none',name:'المافيا',cat:'quiz',lbc:'#2B2F45',minP:4,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2B2F45"/><circle cx="78" cy="22" r="10" fill="#F2E3A0"/><circle cx="82" cy="19" r="9" fill="#2B2F45"/><path d="M26 44h48l-6-16H32z" fill="#111"/><rect x="18" y="42" width="64" height="7" rx="3" fill="#111"/><path d="M30 52c0 14 9 24 20 24s20-10 20-24z" fill="#E9C9A6"/><rect x="34" y="56" width="32" height="7" rx="3" fill="#111"/></svg>`,
  init:n=>({roles:mfRoles(n),ph:'role',rd:0,night:1,last:'',res:'',ls:-1,inv:null,log:[]}),
  simulNow:()=>true,
  // online: you see your own role, your fellow mafia and the ones who are out; the doctor's last save and the detective's answer stay with them
  mask(d,seat){if(d.win!=null)return d;const me=seat>=0?d.roles[seat]:null;
    return {...d,roles:[...d.roles].map((c,s)=>s===seat||d.out[s]==='1'||(me==='m'&&c==='m')?c:'?').join(''),ls:me==='d'?d.ls:-1,inv:d.inv&&d.inv.s===seat?d.inv:null};},
  net:{local:['ok','p']},
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  winText:d=>d.side==='m'?'فازت المافيا 🕵️':'فاز أهل المدينة 🎉',
  winExtra:d=>d.pl.map((_,s)=>`${nm(d,s)} ${MFR[d.roles[s]]}`).join('، '),
  points:d=>d.pl.map((_,s)=>d.out[s]==='1'||d.win!=null?MFR[d.roles[s]]:''),
  status(d,ctx){let s=d.res?`<small>${d.res}</small><br>`:'';
    if(d.ph==='role')return s+'كل واحد يشوف دوره بالسر';
    if(d.ph==='night')return s+`الليلة ${d.night} 🌙 كل واحد يسوي دوره`;
    return s+`النهار ☀️ تناقشوا وبعدها صوّتوا مين تطلّعون`;},
  render(d,ctx){const v=ctx.v;const ph=d.ph==='role'?'role':d.ph;const wrap=h=>`<div class="mfb ${ph}">${mfSky(d)}${h}</div>`;
    if(v==null||v<0)return wrap(mfRoster(d,-1,()=>false)+'<p class="note">ننتظر الباقين…</p>'+mfLog(d));
    const r=d.roles[v];const mates=d.pl.map((_,s)=>s).filter(s=>s!==v&&d.roles[s]==='m');
    const desc=({m:`تقتلون واحد كل ليلة${mates.length?` • معك: ${mates.map(s=>nm(d,s)).join('، ')}`:''}`,d:'كل ليلة تنقذ واحد من القتل، وما تنقذ نفس الشخص ليلتين ورا بعض',t:'كل ليلة تسأل عن واحد وتعرف هل هو مافيا',c:'نام بالليل، وبالنهار اكشف المافيا بالتصويت'})[r];
    const card=`<div class="mfcard r-${r}"><div class="mfin"><div class="mfback">${MF_MOON}</div><div class="mffront"><small>دورك</small>${mfEmb(r)}<b>${MFR[r]}</b><p>${desc}</p></div></div></div>`;
    if(!mfAlive(d,v))return wrap(`<div class="mfgone">${mfEmb(r)}<p>أنت طلعت من اللعبة، تابع بصمت 🤐</p></div>`+mfRoster(d,v,()=>false)+mfLog(d));
    if(!ctx.my)return wrap(card+'<p class="note">ننتظر الباقين…</p>'+mfLog(d));
    if(d.ph==='role')return wrap(card+'<button class="big green" data-ga="ok">فهمت دوري</button>');
    const al=aliveSeats(d);let h=`<details class="mfme r-${r}"><summary>${mfEmb(r)}<span>دوري: <b>${MFR[r]}</b></span></summary>${card}</details>`;
    const pick=(lbl,list,extra)=>`<p class="mfq">${lbl}</p>`+mfRoster(d,v,s=>list.includes(s))+(extra||'');
    if(d.ph==='night'){
      if(r==='m')h+=pick('مين تقتلون الليلة؟',al.filter(s=>d.roles[s]!=='m'));
      else if(r==='d')h+=pick('مين تنقذ الليلة؟',al.filter(s=>s!==d.ls));
      else if(r==='t')h+=pick('مين تبي تكشف؟',al.filter(s=>s!==v));
      else h+=mfRoster(d,v,()=>false)+'<button class="big navy mfsleep" data-ga="p" data-i="-1">نام 😴</button>';}
    else{if(d.inv&&d.inv.s===v)h+=`<div class="mfinv ${d.inv.m?'bad':'ok'}">${mfEmb('t')}<span>${nm(d,d.inv.t)} ${d.inv.m?'<b>مافيا!</b>':'<b>مو مافيا</b>'}</span></div>`;
      h+=pick('مين تطلّعون؟',al.filter(s=>s!==v),'<button class="mfskip" data-ga="p" data-i="-1">ما أصوّت</button>');}
    return wrap(h+mfLog(d));},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='ok'&&d.ph==='role'){simulPick(d,ctx.v,1);return;}if(a==='p')simulPick(d,ctx.v,i);},
  resolve(d,picks){
    if(d.ph==='role')return {...d,ph:'night',rd:d.rd+1,res:'جت الليلة الأولى 🌙'};
    if(d.ph==='night'){const al=aliveSeats(d);const mv=al.filter(s=>d.roles[s]==='m').map(s=>picks[s]).filter(x=>x!=null&&x>=0);
      const cnt={};mv.forEach(x=>cnt[x]=(cnt[x]||0)+1);const mx=Math.max(0,...Object.values(cnt));const top=Object.keys(cnt).filter(k=>cnt[k]===mx).map(Number);
      const kill=top.length?top[rnd(top.length)]:-1;const ds=al.find(s=>d.roles[s]==='d'),ts=al.find(s=>d.roles[s]==='t');
      const save=ds!=null&&picks[ds]!=null?picks[ds]:-1;const chk=ts!=null&&picks[ts]!=null?picks[ts]:-1;
      let out=d.out,res;if(kill>=0&&kill!==save){out=setAt(out,kill,'1');res=`الليلة ${d.night}: المافيا قتلت ${nm(d,kill)} وكان ${MFR[d.roles[kill]]}`;}else res=`الليلة ${d.night}: ما مات أحد`;
      const nd={...d,out,ph:'day',rd:d.rd+1,ls:save,inv:chk>=0?{s:ts,t:chk,m:d.roles[chk]==='m'}:null,res,log:[...d.log,res]};return mfCheck(nd);}
    const al=aliveSeats(d);const cnt=Array(d.pl.length).fill(0);al.forEach(s=>{const x=picks[s];if(x!=null&&x>=0)cnt[x]++;});
    const mx=Math.max(...cnt);const top=cnt.map((c,s)=>c===mx?s:-1).filter(s=>s>=0);let out=d.out,res;
    if(mx>0&&top.length===1){const k=top[0];out=setAt(out,k,'1');res=`طلّعتوا ${nm(d,k)} وكان ${MFR[d.roles[k]]} (${mx} أصوات)`;}else res=mx?'تعادلت الأصوات وما طلع أحد':'ما أحد صوّت';
    const nd={...d,out,ph:'night',night:d.night+1,rd:d.rd+1,inv:null,res,log:[...d.log,res]};return mfCheck(nd);}
};
const mfLog=d=>d.log.length?`<details class="mflogd"><summary>📜 اللي صار <small>${d.log.length}</small></summary><ul class="mflog">${d.log.map(x=>`<li>${x}</li>`).join('')}</ul></details>`:'';

/* ---------- وصلة: كلمة من خمس حروف بست محاولات، الكل يلعب بنفس الوقت ---------- */
const WNORM=w=>String(w).replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
const WASLA='مدرسة سيارة طائرة مكتبة حديقة ملعقة مروحة نافذة وسادة سفينة مدينة قبيلة جزيرة بحيرة صحراء خريطة رسالة قصيدة عائلة جامعة طاولة خزانة ثلاجة غسالة مكنسة فراشة زرافة غزالة دجاجة بطاطس فاكهة كنافة بسكوت عصفور حمامة تمساح دلفين ثعبان بطريق نعامة سنجاب تفاحة رمانة ليمون جوافة مانجو زيتون طماطم ملفوف بيتزا فطيرة مرقوق قرصان عصيدة زبادي شوربة مزرعة حظيرة بقالة منتزه ميناء عاصمة اليمن لبنان سوريا ليبيا الهند الصين تركيا ايران فرنسا روسيا جازان نجران الخبر بريدة عنيزة سكاكا الجوف بيروت بغداد باريس مدريد طوكيو مهندس محامي ممرضة مزارع سجادة ستارة مصباح ابريق فنجان مقلاة مكواة مفتاح حقيبة محفظة نظارة قلادة مسطرة ممحاة حاسوب تلفاز راديو سماعة بنطال فستان عباءة جاكيت جوارب طاقية سروال سحابة بركان زلزال عاصفة امطار اسنان جمجمة اظافر سباحة رماية شطرنج سعادة صداقة شجاعة كرامة امانة نظافة رمادي بنفسج سماوي كتابة قراءة رياضة سياحة تجارة زراعة صناعة هندسة ادارة سياسة ثقافة ترجمة حكاية رواية سينما اغنية مشكلة اجابة شهادة وظيفة اجازة تذكرة ضيافة ظهيرة اسبوع سنوات دقيقة ثانية الفجر العصر رمضان السبت الصيف دراجة حافلة شاحنة غواصة صاروخ مركبة اسعاف تاكسي ميزان مسمار مطرقة منشار فرشاة صابون معجون منشفة نعناع ريحان خزامى الماس ياقوت تطبيق رسائل جيران اخوان اطفال والدة اعمام اخوال معلمة طالبة تلميذ سبورة قاموس جريدة صحيفة اخبار اعلان البحر الشمس القمر النجم الورد'.split(' ');
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

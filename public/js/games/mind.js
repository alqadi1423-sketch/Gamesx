'use strict';
/* thinking and guessing: guess the word, guess the number, matchsticks, code breaker, do not say 31 */

/* ---------- guess the word ---------- */
const WORDS={
  'حيوان':['جمل','حصان','غزال','ثعلب','نمر','فيل','خروف','قنفذ','تمساح','دلفين','صقر','نسر','حمار','قرد','ثور','سنجاب','طاووس','كلب','قط','دب','فهد','ضبع','وشق','ماعز','حوت','قرش','سمك','بطريق','نعام','ضفدع','عقرب','ثعبان','حمام','عصفور','بلبل','غراب','هدهد','نحل','نمل','جراد','كنغر','باندا','كوالا','حلزون','خفاش',
    'غوريلا','شمبانزي','وعل','مها','جاموس','بغل','كركدن','نورس','بوم','لقلق','بجع','ضب','ورل','يربوع','حبار','تيس','كبش','عجل','ديك','دجاج','نمس','غرير','قندس','عنكبوت','ذباب','بعوض','صرصور','سنونو','كناري','حسون','شاهين','عقاب','فلامنجو','قعود','مهر'],
  'فاكهة أو خضار':['برتقال','تفاح','موز','عنب','رمان','بطيخ','خيار','طماطم','جزر','بصل','ليمون','مشمش','تمر','كيوي','توت','تين','خوخ','مانجو','شمام','كرز','بطاطس','باذنجان','فلفل','كوسا','ثوم','خس','ملفوف','قرنبيط','فجل','بقدونس','نعناع','سبانخ','فطر','زيتون','برقوق','يوسفي','ليم',
    'بابايا','ليتشي','نبق','قرع','لفت','شمندر','كراث','كرفس','جرجير','بروكلي','هليون','فاصوليا','لوبيا','بلح','رطب','نارنج','دراق'],
  'دولة':['مصر','اليمن','عمان','قطر','الكويت','البحرين','السودان','لبنان','سوريا','تونس','المغرب','العراق','اليابان','الصين','فرنسا','تركيا','البرازيل','كندا','روسيا','ليبيا','موريتانيا','الصومال','باكستان','ماليزيا','تايلاند','الفلبين','المكسيك','تشيلي','كولومبيا','بيرو','البرتغال','هولندا','بلجيكا','سويسرا','النمسا','السويد','النرويج','فنلندا','الدنمارك','بولندا','اليونان','كوريا','فيتنام','نيبال','كينيا','نيجيريا','غانا','السنغال','الهند',
    'فلسطين','بريطانيا','كوبا','فنزويلا','بنما','جامايكا','كرواتيا','صربيا','رومانيا','بلغاريا','المجر','التشيك','قبرص','مالطا','جورجيا','كازاخستان','طاجيكستان','تركمانستان','منغوليا','بنغلاديش','سريلانكا','ميانمار','كمبوديا','نيوزيلندا','تنزانيا','رواندا','زامبيا','زيمبابوي','موزمبيق','مدغشقر','الكاميرون','مالي','النيجر','تشاد','جيبوتي','غينيا','الكونغو','ناميبيا','بوليفيا','هندوراس','غواتيمالا','كوستاريكا','هايتي','بروناي'],
  'مدينة':['الرياض','الدمام','دبي','بغداد','دمشق','بيروت','تبوك','نجران','الخبر','ينبع','جازان','سكاكا','عرعر','الجبيل','القطيف','الخرج','رابغ','العلا','الرباط','مسقط','الخرطوم','طرابلس','لندن','باريس','روما','مدريد','برلين','موسكو','طوكيو','بكين','سيول','دلهي','نيويورك','تورنتو','سيدني','حلب','الموصل','حمص','صيدا',
    'الهفوف','الزلفي','الدوادمي','الوجه','ضبا','صبيا','طريف','القريات','الخفجي','عجمان','عدن','تعز','القدس','نابلس','الخليل','يافا','حيفا','عكا','طرطوس','صفاقس','القيروان','فاس','مراكش','وهران','نواكشوط','مقديشو','كراتشي','لاهور','مومباي','شنغهاي','بانكوك','جاكرتا','مانيلا','ميلانو','بروكسل','جنيف','فيينا','براغ','وارسو','هلسنكي','دبلن','شيكاغو','واشنطن','بوسطن','ميامي','هيوستن','مونتريال','فانكوفر','ليما','بوغوتا','كاراكاس','هافانا','نيروبي','لاغوس','داكار','ملبورن','طشقند','كابل','كاتماندو','هانوي','النجف','كركوك','بنغازي','مكناس','تطوان','تلمسان','صحار'],
  'شيء في البيت':['كرسي','مفتاح','قلم','كتاب','شباك','فنجان','حاسوب','سرير','مكتب','صحن','دفتر','تلفون','فرن','مكيف','تلفزيون','كنب','دولاب','خلاط','ترمس','سكين','مقص','سجاد','شاحن','ريموت','سخان','كوب','باب','درج','سلم','مطبخ','مجلس','صالون','مفرش','صابون','شامبو','مشط','جوال','راديو',
    'لحاف','قدر','كاس','مصباح','معجون','ميكروويف','جرس','قفل','شمعدان','بخور','برواز','منبه','مسمار','حوض','صنبور','دش','بانيو','فريزر','كمبيوتر','حصير','مرطبان','طبق','منخل','هاون','سطل'],
  'مهنة':['طبيب','مهندس','معلم','طيار','نجار','خباز','طباخ','حلاق','ممرض','صيدلي','مزارع','صياد','رسام','مصور','مذيع','سواق','سباك','مبرمج','محاسب','قاضي','جندي','شرطي','حارس','مترجم','صحفي','محامي','دكتور','مدرس','ميكانيكي',
    'حداد','خياط','فلاح','راعي','بحار','غواص','ممثل','خطاط','نحات','كاتب','شاعر','تاجر','موظف','مدير','مصمم','مخرج','مقاول','حطاب','جزار','بقال','حلواني','نادل','ضابط','مضيف','باحث','خطيب','مدرب','مرشد','سفير','وزير','بواب','فني','جراح','بيطري'],
  'رياضة':['جري','تنس','جودو','كاراتيه','غوص','تزلج','بولينج','غولف','هوكي','بيسبول','رجبي','سنوكر','بلياردو','تايكوندو','كريكيت','جمباز','تجديف','بادل','شطرنج'],
  'أكلة':['مندي','مظبي','جريش','مرقوق','مطازيز','قرصان','هريس','حنيني','معصوب','مطبق','سمبوسك','لقيمات','كليجا','فلافل','شاورما','فتوش','منسف','كشري','برياني','بيتزا','برجر','سليق','مضغوط','كباب','بلاليط','تميس','متبل','محشي','قطايف','معمول','دونات'],
  'في جسم الإنسان':['عين','فم','لسان','شعر','وجه','خد','جبين','حاجب','رموش','كتف','ذراع','كوع','معصم','كف','ظفر','صدر','بطن','ظهر','كعب','قلب','كبد','دماغ','عظم','جلد','ضرس','جفن','ساق','فخذ','عضلات','طحال','بنكرياس'],
  'وسيلة نقل':['قطار','باص','قارب','مركب','صاروخ','مترو','تاكسي','ونيت','جيب','هليكوبتر','منطاد','زورق','يخت','ترام','سكوتر','مكوك','حنطور','تلفريك','بلدوزر','موتوسيكل'],
  'لون':['برتقالي','بنفسجي','وردي','بني','رمادي','كحلي','فيروزي','ذهبي','فضي','زهري','عنابي','سماوي','زيتي','بيج','نيلي','ليلكي','خمري','كريمي','فستقي','نحاسي','رصاصي','عسلي','قرمزي','زعفراني','تركوازي'],
  'من الطبيعة':['جبل','نهر','بحر','وادي','شلال','بركان','كهف','رمل','نخل','غيم','مطر','برق','رعد','ثلج','قمر','شمس','نجم','ضباب','زلزال','كثبان','سهل','نبع','محيط','خليج','مرجان','صخر','غبار','نسيم','شروق','غروب','سراب','نيزك','كوكب']
};
const ALPHA='ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
GAMES.word={name:'خمّن الكلمة',cat:'mind',lbc:'#3E7C59',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#58A777"/>${[0,1,2,3].map(k=>`<rect x="${10+k*21}" y="34" width="17" height="24" rx="4" fill="#fff"/><rect x="${10+k*21}" y="58" width="17" height="4" fill="#2D4763"/>`).join('')}<text x="39" y="53" font-size="17" font-weight="800" fill="#2D4763" text-anchor="middle">م</text><text x="81" y="53" font-size="17" font-weight="800" fill="#2D4763" text-anchor="middle">ج</text></svg>`,
  init:n=>{const cats=Object.keys(WORDS);const cat=cats[rnd(cats.length)];const list=WORDS[cat];return {cat,w:list[rnd(list.length)],g:'',pts:Array(n).fill(0),last:''};},
  // online, the other players see only the letters already found (the host checks each guess and each try at the whole word)
  mask:(d,seat)=>d.win!=null?d:{...d,w:[...d.w].map(ch=>d.g.includes(ch)?ch:'·').join('')},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>`الكلمة: ${d.w}`,
  // a tile turns over when its letter is found (a new node, so the flip plays once); at the end the missed letters show greyed,
  // or gold when someone solved the whole word
  render(d,ctx){const end=d.win!=null,W=[...d.w],sol=d.sol!=null&&d.sol>=0;
    const hid=W.filter(ch=>!d.g.includes(ch)).length;
    let s=`<div class="gm gm-word"><p class="wcat"><span>التصنيف</span><b>${d.cat}</b><em class="wlen">${W.length===2?'حرفين':W.length<=10?W.length+' حروف':W.length+' حرف'}</em></p><div class="wordbox" style="--n:${W.length}">${W.map(ch=>{const o=d.g.includes(ch),sh=o||end;return `<div class="wl ${o?'on':sh?(sol?'sol':'miss'):''}" data-k="${sh?'o':''}">${sh?ch:''}</div>`;}).join('')}</div>
    <div class="kb">${[...ALPHA].map((ch,i)=>{const u=d.g.includes(ch);return `<button class="key ${u?(d.w.includes(ch)?'hit':'miss'):''}" data-ga="k" data-i="${i}" ${ctx.my&&!u?'':'disabled'}>${ch}</button>`;}).join('')}</div>`;
    // solving: type the whole word. Right gives a point for every hidden letter plus 3 and ends the round, wrong costs 2 and the turn
    if(ctx.my&&!end&&hid>1)s+=`<div class="wsolve"><input class="field" data-draft="wsol" data-enter="sol" maxlength="16" value="${escH((S.draft||{}).wsol||'')}" placeholder="تعرف الكلمة؟ اكتبها" autocomplete="off" enterkeyhint="done"><button class="btn red" data-ga="sol">حلّها (+${hid+3})</button></div>`;
    return s+'</div>';},
  click(a,i,d,ctx){
    if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='sol'){const x=wdNorm((S.draft||{}).wsol);if(!x)return;if(S.draft)delete S.draft.wsol;const pts=[...d.pts];
      if(wdNorm(d.w)===x){const hid=[...d.w].filter(ch=>!d.g.includes(ch)).length;pts[t]+=hid+3;
        act({...d,pts,sol:t,win:mostPts(pts),last:`${nm(d,t)} حلّ الكلمة «${d.w}» وأخذ ${hid+3} 🎯`});return;}
      pts[t]=Math.max(0,pts[t]-2);act({...d,pts,turn:nextSeat(d,t),last:`${nm(d,t)} حاول يحلها وغلط، نقص 2`});return;}
    const ch=ALPHA[i];if(!ch||d.g.includes(ch))return;const g=d.g+ch;const k=[...d.w].filter(x=>x===ch).length;const pts=[...d.pts];pts[t]+=k;
    const done=[...d.w].every(x=>g.includes(x));
    act({...d,g,pts,win:done?mostPts(pts):null,turn:k?t:nextSeat(d,t),last:k?`${nm(d,t)} اختار «${ch}» وموجود ${k} مرة`:`${nm(d,t)} اختار «${ch}» ومو موجود`});
  }
};
// a typed word as the game compares it: no vowel marks or spaces, plain alif, ة as ه, ى as ي, and «ال» at the start optional
const wdNorm=s=>String(s||'').replace(/[\u064B-\u0652\u0640\s]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/^ال/,'');
// the words of this category that fit the board as a player sees it: same length, found letters in place, no tried letter elsewhere
function wordFits(d){const W=[...d.w],pat=W.map(ch=>d.g.includes(ch)?ch:null);
  return (WORDS[d.cat]||[]).filter(c=>{const C=[...c];return C.length===W.length&&C.every((ch,k)=>pat[k]?ch===pat[k]:!d.g.includes(ch));});}
// letters by how common they are in Arabic words
const WFREQ='اليمنوتبرعهدسقكحفجشصطخثزغضذظ';
GAMES.word.bot=(d,s,lv)=>{const left=[...WFREQ].filter(c=>!d.g.includes(c));const fit=wordFits(d);
  const hid=[...d.w].filter(ch=>!d.g.includes(ch)).length,shown=1-hid/[...d.w].length;
  // solve once the list leaves one word: the hard bot at once, the others when most of it shows
  if(fit.length===1&&hid>1&&(lv===3||(lv===2&&shown>=.4)||(lv===1&&shown>=.7&&Math.random()<.5))){S.draft.wsol=fit[0];return botDo(d,s,'sol',0);}
  if(lv===1&&hid>1&&shown>=.6&&fit.length>1&&Math.random()<.15){S.draft.wsol=pickR(fit);return botDo(d,s,'sol',0);}
  let c;
  if(lvRand(lv))c=pickR(left);
  else if(lv===1||!fit.length)c=left[Math.random()<.7?0:rnd(Math.min(4,left.length))];
  // the letter found in the most words that still fit (each word counted once)
  else{const sc={};for(const w of fit)for(const ch of new Set(w))if(!d.g.includes(ch))sc[ch]=(sc[ch]||0)+1;
    const by=left.filter(ch=>sc[ch]).sort((x,y)=>sc[y]-sc[x]);c=by.length?(lv===2&&by.length>1&&Math.random()<.35?by[1]:by[0]):left[0];}
  return botDo(d,s,'k',ALPHA.indexOf(c));};

/* ---------- guess the number ---------- */
// vr 0 classic (whoever hits the secret wins), 1 «القنبلة» (whoever says it is out, a new bomb hides in 1 to 30, the last one left wins)
let NUMV=0;const numTop=d=>d.vr?30:100;
GAMES.num={name:'خمّن الرقم',cat:'mind',lbc:'#6B4FA0',
  icon:iconE('#8C6CC4','🔢'),
  init:n=>({sec:1+rnd(NUMV?30:100),lo:1,hi:NUMV?30:100,vr:NUMV,nb:0,ps:'0'.repeat(n),last:''}),
  hide:{all:['sec']},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>${d.vr?'💣 القنبلة':'الرقم السري'} بين ${d.lo} و ${d.hi}${d.vr?' • اللي يقولها يطلع':''}</small>`,
  winExtra:d=>d.vr?'آخر واحد سلم من القنابل':`الرقم كان ${d.sec}`,
  // the window still open is drawn as a bar; the two numbers just outside it were guesses, so they keep a mark
  // the last guess pops in as a big arrow (keyed by the window, so it plays once); a bomb that went off shakes the board in
  render(d,ctx){const end=d.win!=null,L=d.lo,H=d.hi,T=numTop(d),fresh=!d.last&&!d.nb;
    const lg=/(\d+)، (?:الرقم|القنبلة) (أكبر|أصغر)/.exec(d.last||''),boom=/^💥/.test(d.last||'');
    let s=`<div class="gm gm-num ${d.vr?'nbomb':''}">`;
    if(fresh)s+=`<div class="segs numv">${[['0','🎯 كلاسيكية'],['1','💣 القنبلة']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`;
    s+=`<div class="nrng"><b class="ltr">${L}</b><div class="nbar"><i style="inset-inline-start:${(L-1)/T*100}%;width:${(H-L+1)/T*100}%"></i></div><b class="ltr">${H}</b></div>`;
    s+=lg?`<p class="nhint ${lg[2]==='أكبر'?'up':'dn'}" data-k="h${L}-${H}"><b class="ltr">${lg[1]}</b><span>${lg[2]==='أكبر'?'▲ أكبر':'▼ أصغر'}</span></p>`:boom?`<p class="nhint nboom" data-k="b${d.nb}">💥 <span>انفجرت!</span></p>`:'';
    s+=`<div class="ngrid ${T<100?'g30':''} ${boom?'nboom':''}" data-k="g${d.nb||0}">`;
    for(let n=1;n<=T;n++){const ok=n>=L&&n<=H;const c=end&&n===d.sec&&!d.vr?'sec':ok?'':n===L-1?'out gs up':n===H+1?'out gs dn':'out';s+=`<button class="nc ${c}" data-ga="m" data-i="${n}" ${ctx.my&&ok?'':'disabled'}>${n}</button>`;}
    s+='</div>';
    // the bomb: one pass per player for every bomb
    if(d.vr&&ctx.my&&!end){const used=(d.ps||'')[d.turn]==='1';s+=`<div class="acts"><button class="btn navy" data-ga="pass" ${used?'disabled':''}>⏭ ${used?'استخدمت التمريرة':'مرّر الدور (مرة لكل قنبلة)'}</button></div>`;}
    return s+'</div>';},
  click(a,n,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='vr'){if(d.last||d.nb)return;NUMV=n?1:0;const T=NUMV?30:100;act({...d,vr:NUMV,lo:1,hi:T,sec:1+rnd(T)});return;}
    if(a==='pass'){const ps=d.ps||'0'.repeat(d.pl.length);if(!d.vr||ps[t]==='1')return;act({...d,ps:setAt(ps,t,'1'),turn:nextSeat(d,t),last:`${nm(d,t)} مرّر ⏭`});return;}
    if(!Number.isInteger(n)||n<d.lo||n>d.hi)return;
    if(n===d.sec){if(!d.vr){act({...d,win:t,last:`${nm(d,t)} قال ${n} وصاب!`});return;}
      // the bomb: whoever says it is out, and a fresh one hides for the rest
      const out=setAt(d.out,t,'1'),al=aliveSeats(d,out);const nd={...d,out,nb:(d.nb||0)+1,last:`💥 ${nm(d,t)} قال ${n} وانفجرت القنبلة!`};
      if(al.length<=1){act({...nd,win:al.length?al[0]:'d'});return;}
      act({...nd,lo:1,hi:30,sec:1+rnd(30),ps:'0'.repeat(d.pl.length),turn:nextSeat(d,t,out)});return;}
    const big=n<d.sec;act({...d,lo:big?n+1:d.lo,hi:big?d.hi:n-1,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${n}، ${d.vr?'القنبلة':'الرقم'} ${big?'أكبر':'أصغر'}`});
  }
};

/* ---------- matchsticks ---------- */
// vr 0 classic (who takes the last stick wins), 1 «آخر عود يخسر» (who takes it is out and the piles are laid again for the rest),
// 2 «ثلاثة بالكثير» (one to three sticks a turn, the last one wins)
let NIMV=0;const NIMVN=['🏆 كلاسيكية','🔥 آخر عود يخسر','✋ ثلاثة بالكثير'];
GAMES.nim={name:'أعواد الكبريت',cat:'mind',lbc:'#9C4A2F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9673F"/>${[0,1,2,3,4].map(k=>`<rect x="${20+k*13}" y="22" width="7" height="56" rx="3.5" fill="#E8C38E" transform="rotate(${(k-2)*5} 50 50)"/><rect x="${19+k*13}" y="18" width="9" height="13" rx="4.5" fill="#E8574E" transform="rotate(${(k-2)*5} 50 50)"/>`).join('')}</svg>`,
  init:n=>{const k=Math.min(3+Math.floor(n/2),7);const p=Array(k).fill(0).map(()=>3+rnd(5));return {p,p0:[...p],vr:NIMV,last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+(d.vr===1?'<br><small>اللي ياخذ آخر عود يطلع</small>':d.vr===2?'<br><small>تاخذ من عود إلى 3 من كومة وحدة</small>':''),
  // client side only (S.nimH, never in d): the piles as they were before the last move, so the sticks just taken
  // show as burnt ghosts, and the most each pile held, so earlier removals leave faint outlines
  render(d,ctx){let h=S.nimH;if(!h||h.gid!==d.gid)h=S.nimH={gid:d.gid,p:d.p.join(),lp:[...d.p],mx:[...d.p]};
    if(h.p!==d.p.join()){h.lp=h.p.split(',').map(Number);h.p=d.p.join();h.mx=h.mx.map((m,i)=>Math.max(m,d.p[i]||0));}
    const fresh=!d.last,lim=d.vr===2?3:99;
    const segs=fresh?`<div class="segs nimv">${NIMVN.map((t,v)=>`<button class="seg ${v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:'';
    return `<div class="gm gm-nim ${d.vr===1?'mis':''}">${segs}<div class="piles">${d.p.map((n,pi)=>{const tk=Math.max(0,(h.lp[pi]||0)-n),gone=Math.max(0,(h.mx[pi]||0)-n-tk);
      return `<div class="pilecard ${n?'':'empty'} ${tk?'lm':''}"><span class="pn">${pi+1}</span><div class="sticks">${Array(n).fill(0).map((_,j)=>`<button class="match ${n-j>lim?'far':''}" data-ga="m" data-i="${pi*100+j}" ${ctx.my&&n-j<=lim?'':'disabled'} aria-label="خذ ${n-j}"></button>`).join('')}${'<i class="mg tk"></i>'.repeat(tk)}${'<i class="mg"></i>'.repeat(gone)}${n||tk||gone?'':'<span class="note">فاضية</span>'}</div><b class="pc2">${n}</b></div>`;}).join('')}</div></div>`;},
  click(a,i,d,ctx){
    if(!ctx.my||!Number.isInteger(i))return;
    if(a==='vr'){if(d.last||i<0||i>2)return;NIMV=i;act({...d,vr:i});return;}
    const pi=Math.floor(i/100),j=i%100;if(!(pi>=0&&pi<d.p.length)||j>=d.p[pi])return;const t=d.turn;const take=d.p[pi]-j;if(d.vr===2&&take>3)return;const p=[...d.p];p[pi]=j;
    const empty=p.every(x=>x===0);
    // the last stick burns whoever takes it: out, and the piles are laid out as they started for the others
    if(empty&&d.vr===1){const out=setAt(d.out,t,'1'),al=aliveSeats(d,out);
      if(al.length<=1){act({...d,p,out,win:al.length?al[0]:'d',last:`🔥 ${nm(d,t)} أخذ آخر عود وخسر`});return;}
      act({...d,p:[...(d.p0||d.p.map(()=>5))],out,turn:nextSeat(d,t,out),last:`🔥 ${nm(d,t)} أخذ آخر عود وطلع، والأكوام رجعت`});return;}
    act({...d,p,win:empty?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} أخذ ${take} من الكومة ${pi+1}`});
  }
};

/* ---------- code breaker ---------- */
const MMC=['#E5483F','#3D8FD8','#3FAE5C','#F0B429','#9C7BD6','#F2874B'];
const mmScore=(code,g)=>{let b=0,w=0;const cc={},gc={};for(let k=0;k<4;k++){if(code[k]===g[k])b++;else{cc[code[k]]=(cc[code[k]]||0)+1;gc[g[k]]=(gc[g[k]]||0)+1;}}for(const k in gc)w+=Math.min(gc[k],cc[k]||0);return [b,w];};
// each try keeps its own feedback, so it shows while the code itself stays hidden
const mmFb=(d,x)=>x.b!=null?[x.b,x.w]:mmScore(d.code,x.g);
const pegs=(g)=>[...g].map(c=>`<span class="peg" style="--pc:${MMC[+c]}"></span>`).join('');
GAMES.mm={name:'كسر الشفرة',cat:'mind',lbc:'#2D4763',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F5D80"/>${[0,1,2].map(r=>[0,1,2,3].map(c=>`<circle cx="${20+c*17}" cy="${28+r*22}" r="7" fill="${MMC[(r*2+c*3)%6]}" stroke="#fff" stroke-width="2"/>`).join('')+`<circle cx="88" cy="${24+r*22}" r="3" fill="#fff"/><circle cx="88" cy="${33+r*22}" r="3" fill="#1d2f44"/>`).join('')}</svg>`,
  init:()=>({code:Array(4).fill(0).map(()=>rnd(6)).join(''),h:[],last:''}),
  hide:{all:['code']},net:{local:['add','clr']},
  status:(d,ctx)=>{const x=d.h[d.h.length-1];if(!x)return turnTxt(d,ctx);const [b,w]=mmFb(d,x);return `<small>${nm(d,x.s)}: ${b} بمكانها و${w} بغير مكانها</small><br>`+turnTxt(d,ctx);},
  winExtra:()=>'الشفرة ظاهرة تحت',
  // one board: the hidden code on top, then every try with its pins, the row being filled, and empty rows to come.
  // rows carry data-k so a new try is a new node (it pops in) and an empty hole turning into a peg pops too
  render(d,ctx){S.mm=S.mm||[];const end=d.win!=null,hole='<i class="hole"></i>';
    const fb=(b,w)=>`<span class="fb">${Array(4).fill(0).map((_,k)=>`<i class="${k<b?'b':k<b+w?'w':''}"></i>`).join('')}</span>`;
    let s=`<div class="gm gm-mm"><div class="mmb">`;
    s+=`<div class="mmr code ${end?'open':''}"><span class="fbl">الشفرة</span><span class="pegs">${end?pegs(d.code):'<i class="hole q">؟</i>'.repeat(4)}</span><span class="lock">${end?'🔓':'🔒'}</span></div><div class="mmh" id="mmh">`;
    s+=d.h.map((x,i)=>{const [b,w]=mmFb(d,x);return `<div class="mmr ${b===4?'win':''}" data-k="h${i}"><b class="n">${i+1}</b><i class="who" style="--c:${col(d,x.s)}"></i><span class="pegs">${pegs(x.g)}</span>${fb(b,w)}</div>`;}).join('');
    if(ctx.my)s+=`<div class="mmr cur" data-k="cur" style="--c:${col(d,d.turn)}"><b class="n">${d.h.length+1}</b><i class="who"></i><span class="pegs">${[0,1,2,3].map(k=>S.mm[k]!=null?`<span class="peg" style="--pc:${MMC[S.mm[k]]}"></span>`:hole).join('')}</span>${fb(0,0)}</div>`;
    if(!end)for(let i=d.h.length+(ctx.my?1:0);i<5;i++)s+=`<div class="mmr ghost" data-k="g"><b class="n">${i+1}</b><i class="who"></i><span class="pegs">${hole.repeat(4)}</span>${fb(0,0)}</div>`;
    s+=`</div></div><div class="mmleg"><span><i class="b"></i>بمكانها</span><span><i class="w"></i>بغير مكانها</span></div>`;
    if(ctx.my)s+=`<div class="mmpal">${MMC.map((c,k)=>`<button class="peg pbig" style="--pc:${c}" data-ga="add" data-i="${k}" ${S.mm.length>=4?'disabled':''} aria-label="لون"></button>`).join('')}</div>
      <div class="acts"><button class="btn navy" data-ga="clr" ${S.mm.length?'':'disabled'}>مسح</button><button class="btn red" data-ga="go" ${S.mm.length===4?'':'disabled'}>جرّب</button></div>`;
    return s+'</div>';},
  // keep the row being played (or the newest try) in view when the list scrolls
  after(d){const el=document.getElementById('mmh');if(!el)return;const k=d.gid+':'+d.h.length+':'+(d.win!=null);if(el._k===k)return;el._k=k;
    const r=el.querySelector('.cur')||el.querySelector('.mmr:not(.ghost):last-child')||el.lastElementChild;if(r)el.scrollTop=Math.max(0,r.offsetTop+r.offsetHeight-el.clientHeight+4);},
  click(a,i,d,ctx){
    if(!ctx.my)return;S.mm=S.mm||[];
    if(a==='add'){if(S.mm.length<4)S.mm.push(i);render();return;}
    if(a==='clr'){S.mm=[];render();return;}
    if(S.mm.length!==4)return;const g=S.mm.join('');S.mm=[];const t=d.turn;const [b,w]=mmScore(d.code,g);
    act({...d,h:[...d.h,{s:t,g,b,w}].slice(-30),win:b===4?t:null,turn:nextSeat(d,t)});
  }
};

/* ---------- do not say 31 ---------- */
// vr 1 «لا تكرر»: you may not add the step the player before you added (unless nothing else fits)
let C31V=0;
const c31Steps=d=>{const all=[1,2,3].filter(k=>d.n+k<=d.tgt);if(!d.vr||!d.lk)return all;const f=all.filter(k=>k!==d.lk);return f.length?f:all;};
GAMES.c31={name:'لا تقول 31',cat:'mind',lbc:'#C0392B',
  icon:iconE('#E35D4F','31','rgba(255,255,255,.25)').replace('font-size="40"','font-size="34" font-weight="800" fill="#fff"'),
  init:n=>({n:0,tgt:n>4?41:31,vr:C31V,lk:0,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+(d.vr?'<br><small>ممنوع تزيد نفس الرقم اللي زاده اللي قبلك</small>':''),
  // a counter in the colour of the player on turn; each step shows the number it would say, the losing one in red
  render(d,ctx){const ok=c31Steps(d),fresh=!d.last;
    return `<div class="gm gm-c31" style="--c:${col(d,d.turn)}">${fresh?`<div class="segs c31v">${[['0','🔢 كلاسيكية'],['1','🚫 لا تكرر']].map(([v,t])=>`<button class="seg ${+v===(d.vr||0)?'on':''}" data-ga="vr" data-i="${v}" ${ctx.my?'':'disabled'}>${t}</button>`).join('')}</div>`:''}<div class="cdial"><b class="cnum ltr" data-k="${d.n}">${d.n}</b><div class="ctrack"><i style="width:${d.n/d.tgt*100}%"></i><u style="inset-inline-start:${(d.tgt-3)/d.tgt*100}%"></u></div><p class="lbl">اللي يقول ${d.tgt} يخسر</p></div>
    <div class="csteps">${[1,2,3].map(k=>{const ban=d.n+k<=d.tgt&&!ok.includes(k);return `<button class="cstep ${d.n+k===d.tgt?'lose':''} ${ban?'ban':''}" data-ga="m" data-i="${k}" ${ctx.my&&ok.includes(k)?'':'disabled'}><b class="ltr">+${k}</b><small class="ltr">${ban?'🚫':d.n+k<=d.tgt?d.n+k:'—'}</small></button>`;}).join('')}</div></div>`;},
  click(a,k,d,ctx){
    if(!ctx.my)return;
    if(a==='vr'){if(d.last)return;C31V=k?1:0;act({...d,vr:C31V,lk:0});return;}
    if(!c31Steps(d).includes(k))return;const t=d.turn,n=d.n+k;
    if(n<d.tgt){act({...d,n,lk:k,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${n}`});return;}
    const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);
    act({...d,n:0,lk:0,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),last:`💥 ${nm(d,t)} وصل ${d.tgt} وطلع، والعدّ يبدأ من جديد`});
  }
};


/* ---------- bots of this file ---------- */
// guess the number: with m numbers left, V[m][j] is the chance that the player j places after the guesser wins, and B[m] the
// guesses (counted from the low end) that give the guesser the best chance. Halving is not best: with 3 left, an end number wins 2 in 3
// In «القنبلة» V[m][j] is the chance that player j is the one who says the bomb, and the guesser keeps its own chance lowest
// (with 3 left the middle loses only 1 in 3, with 5 left every guess loses 3 in 5 for two players, so the hard bot steers to those)
const numPlans={};
function numPlan(N,bomb){const key=N+(bomb?'b':'');if(numPlans[key])return numPlans[key];const V=[Array(N).fill(0)],B=[[]];
  for(let m=1;m<=100;m++){let best=bomb?2:-1,bk=[],bv=null;
    for(let k=1;k<=m;k++){const v=Array(N).fill(0);v[0]=1/m;
      for(const x of [k-1,m-k])if(x)for(let j=0;j<N;j++)v[(j+1)%N]+=x/m*V[x][j];
      const g=bomb?-v[0]:v[0],b=bomb?-best:best;
      if(g>b+1e-9){best=v[0];bk=[k];bv=v;}else if(g>b-1e-9)bk.push(k);}
    V.push(bv);B.push(bk);}
  return numPlans[key]={V,B};}
GAMES.num.bot=(d,s,lv)=>{const m=d.hi-d.lo+1;let n;
  // the pass: kept for a window that is bad to guess in (one number left is the bomb itself)
  if(d.vr&&(d.ps||'')[s]!=='1'){const L=numPlan(Math.max(2,aliveSeats(d).length),true).V[m][0];
    if(m===1&&lv>1||(lv===3&&L>.45&&m<=3)||(lv===1&&Math.random()<.12))return botDo(d,s,'pass',0);}
  if(lv===3||(lv===2&&d.vr&&m<=6&&Math.random()<.6)){const P=numPlan(Math.max(2,aliveSeats(d).length),!!d.vr);n=d.lo+pickR(P.B[m])-1;}
  else if(lvRand(lv))n=d.lo+rnd(m);
  // the bomb: the others nibble at the ends, an easy one anywhere
  else if(d.vr)n=lv===2?(Math.random()<.5?d.lo:d.hi)+(Math.random()<.3?(Math.random()<.5?1:-1):0):d.lo+rnd(m);
  else if(lv===2)n=Math.round((d.lo+d.hi)/2+(Math.random()-.5)*m*.2);
  else n=d.lo+Math.floor((m-1)*(0.25+Math.random()*.5));
  return botDo(d,s,'m',Math.max(d.lo,Math.min(d.hi,n)));};

// matchsticks: who wins from a set of piles when every player plays for themselves, worked out once for every position
// (the piles sorted, so a few thousand positions). The answer is counted from the player to move: 0 means the mover wins.
// With two players this is exactly the XOR rule of nim
// «آخر عود يخسر» (vr 1) keeps the same table but counts who is left with the last stick: the mover wants anyone but itself.
// «ثلاثة بالكثير» (vr 2) only looks at moves of one to three sticks
const nimMemo={};
const nimGood=(w,vr)=>vr===1?w!==0:w===0;
function nimWho(P,N,vr){vr=vr||0;const q=P.filter(v=>v).sort((a,b)=>a-b);if(!q.length)return 0;const k=vr+':'+N+':'+q.join();if(k in nimMemo)return nimMemo[k];
  let r=-1;for(let i=0;i<q.length;i++){if(i&&q[i]===q[i-1])continue;let hit=false;for(let j=vr===2?Math.max(0,q[i]-3):0;j<q[i];j++){const t=[...q];t[i]=j;
    const w=t.every(v=>!v)?0:(1+nimWho(t,N,vr))%N;if(nimGood(w,vr)){r=w;hit=true;break;}if(r<0)r=w;}if(hit)break;}
  return nimMemo[k]=r;}
GAMES.nim.bot=(d,s,lv)=>{const P=d.p,N=Math.max(2,aliveSeats(d).length),vr=d.vr||0,ne=P.map((v,k)=>v?k:-1).filter(k=>k>=0);
  const go=(pi,j)=>botDo(d,s,'m',pi*100+j);const lo=pi=>vr===2?Math.max(0,P[pi]-3):0;
  if(ne.length===1&&vr!==1&&P[ne[0]]<=(vr===2?3:99)&&(lv>1||Math.random()<.6))return go(ne[0],0);
  if(lv===1&&Math.random()<.65){const pi=pickR(ne);return go(pi,lo(pi)+rnd(P[pi]-lo(pi)));}
  const moves=[];for(const pi of ne)for(let j=lo(pi);j<P[pi];j++){const q=[...P];q[pi]=j;
    moves.push({pi,j,w:q.every(v=>!v)?0:(1+nimWho(q,N,vr))%N,one:q.filter(v=>v).length===1,take:P[pi]-j,last:q.every(v=>!v)});}
  const strong=lv===3||(lv===2&&Math.random()<.6);
  if(strong){const w=moves.filter(m=>nimGood(m.w,vr));if(w.length){const m=pickR(w);return go(m.pi,m.j);}}
  // «آخر عود يخسر»: never take the last stick while anything else is possible
  if(vr===1){const safe=moves.filter(m=>!m.last);if(safe.length&&lv>1||safe.length&&Math.random()<.8){const m=pickR(safe);return go(m.pi,m.j);}}
  // nothing wins for sure: do not hand over a single pile, and take little so the others have room to slip
  const ok=moves.filter(m=>!m.one),pool=ok.length?ok:moves,mn=Math.min(...pool.map(m=>m.take));
  const m=lv>1?pickR(pool.filter(m=>m.take===mn)):pickR(pool);return go(m.pi,m.j);};

// code breaker: the bots read only the pins on the board. The hard one plays the guess that leaves the fewest codes in the
// worst case (Knuth's rule), the medium one any code that fits every try, the easy one checks only the last try or two
const MMALL=[...Array(1296).keys()].map(i=>[i%6,Math.floor(i/6)%6,Math.floor(i/36)%6,Math.floor(i/216)%6].join(''));
function mmKey(a,b){let bl=0,w=0;const ca=[0,0,0,0,0,0],cb=[0,0,0,0,0,0];
  for(let k=0;k<4;k++){const x=a.charCodeAt(k)-48,y=b.charCodeAt(k)-48;if(x===y)bl++;else{ca[x]++;cb[y]++;}}
  for(let c=0;c<6;c++)w+=Math.min(ca[c],cb[c]);return bl*5+w;}
const mmFits=(d,tries)=>MMALL.filter(g=>tries.every(x=>{const [b,w]=mmFb(d,x);return mmKey(g,x.g)===b*5+w;}));
GAMES.mm.bot=(d,s,lv)=>{let g;
  if(!d.h.length){const a=rnd(6),b=(a+1+rnd(5))%6;g=lv===1?MMALL[rnd(1296)]:`${a}${a}${b}${b}`;}
  else if(lvRand(lv))g=MMALL[rnd(1296)];
  else if(lv===1){const c=mmFits(d,d.h.slice(-1-rnd(2)));g=c.length?pickR(c):MMALL[rnd(1296)];}
  else{const c=mmFits(d,d.h);
    if(!c.length)g=MMALL[rnd(1296)];
    else if(lv===2||c.length<=2)g=pickR(c);
    else{const pool=c.length>300?c:MMALL,inC=new Set(c);let best=1e9,bs=[];
      for(const q of pool){const cnt=new Array(25).fill(0);let mx=0;for(const x of c){const k=mmKey(q,x);if(++cnt[k]>mx)mx=cnt[k];}
        const v=mx*2-(inC.has(q)?1:0);if(v<best){best=v;bs=[q];}else if(v===best)bs.push(q);}
      g=pickR(bs);}}
  S.mm=[...g].map(Number);return botDo(d,s,'go',0);};

// do not say 31: from each count, the steps after which the player saying them is not the one forced to say the target
// (worked back from the target, each player avoiding it in turn). Two players: say tgt-1, tgt-5, … the classic winning line
// «لا تكرر» adds the last step to the position (count, step just added), so the table is worked back over both
const c31Plans={};
function c31Plan(tgt,N,vr){const k0=tgt+':'+N+':'+(vr?1:0);if(c31Plans[k0])return c31Plans[k0];const out={},ok={};
  for(let c=tgt-1;c>=0;c--)for(let lk=0;lk<=(vr?3:0);lk++){const st=c31Steps({n:c,tgt,vr,lk});const res=st.map(k=>[k,c+k===tgt?0:(1+out[(c+k)+':'+(vr?k:0)])%N]);
    const safe=res.filter(r=>r[1]!==0);ok[c+':'+lk]=safe.map(r=>r[0]);out[c+':'+lk]=(safe.length?safe[0]:res[0])[1];}
  return c31Plans[k0]=ok;}
GAMES.c31.bot=(d,s,lv)=>{const all=c31Steps(d),notT=all.filter(k=>d.n+k<d.tgt);
  const plan=c31Plan(d.tgt,Math.max(2,aliveSeats(d).length),d.vr)[d.n+':'+(d.vr?d.lk||0:0)]||[];let k;
  if(lv===3||(lv===2&&Math.random()<.6))k=plan.length?pickR(plan):(notT.includes(1)?1:all[0]);
  else k=notT.length&&Math.random()<(lv===1?.8:.95)?pickR(notT):pickR(all);
  return botDo(d,s,'m',k);};

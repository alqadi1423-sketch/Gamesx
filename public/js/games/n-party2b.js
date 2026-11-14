'use strict';
/* ألعاب الجمعات (2), part two: حقيقتين وكذبة، مين الأكثر، قصة متسلسلة، الرسام المزيف، توقع الأغلبية، سؤال وجواب، المزاد.
   Uses the helpers of n-party2.js (p2T, p2N, p2Fresh, p2Tiles, p2Pts…). */

// the seat that moves a shown result on (rotates every round, skips the ones who left)
const p2Rot=(d,k)=>{let s=(d.st+k)%d.pl.length;for(let j=0;j<d.pl.length&&d.out[s]==='1';j++)s=(s+1)%d.pl.length;return s;};
const p2Wait=(d)=>`<div class="p2-waitl">${aliveSeats(d).map(s=>`<span class="${hasPicked(d,s)?'ok':''}" style="--c:${col(d,s)}">${hasPicked(d,s)?'✓':'…'} ${nm(d,s)}</span>`).join('')}</div>`;
const p2Next=(d,ctx,last,label)=>d.win!=null?'':(ctx.local||ctx.v===d.turn)&&!isBot(d,d.turn)?`<button class="big" data-ga="next">${last?'النتيجة 🏆':label||'التالي ←'}</button>`:'<p class="note">نكمل بعد شوي…</p>';

/* =====================================================================================================
   حقيقتين وكذبة (p_2t1l): everyone writes three things about themselves, one of them a lie, and marks it.
   Then each player's three are shown in turn and the others vote which one is the lie.
   Find the lie: +1. Every player you fool: +1.
   ===================================================================================================== */
const P2TTT=['أحب الكبسة أكثر من أي أكلة','عمري ما ركبت قطار','زرت أبها في الصيف','أشرب قهوة كل صباح','أخاف من الصراصير','أصحى بدري حتى بالإجازة','أحب ريحة المطر','تعلمت السباحة وأنا صغير','عمري ما شفت الثلج','أحب الشاي أكثر من القهوة','عندي ثلاث إخوان','أحب ألعب بلوت مع أهلي','نمت مرة بالبر تحت النجوم','أعرف أطبخ كبسة','ما أحب الأكل الحار','قريت رواية كاملة بيوم واحد','ضعت مرة بالمول وأنا صغير','أحب الرسم من صغري','عندي قطة بالبيت','أفضّل الشتاء على الصيف','زرت المدينة أكثر من خمس مرات','أنام قبل الساعة عشر','أحب المشي بالكورنيش','جربت التزلج على الرمل','أكره صوت المنبه','أحب الحبحب البارد','ما أعرف أصفّر','أعرف أركب دراجة بيد وحدة'];
const P2TTL=['قابلت رائد فضاء بالمطار','ركبت جمل بسباق رسمي','أعرف أتكلم أربع لغات','فزت بمسابقة طبخ بالمدرسة','تسلقت جبل بأفريقيا','عندي سلحفاة عمرها ثلاثين سنة','نمت يومين ورا بعض','أكلت عشرين حبة تمر بجلسة وحدة','صدت سمكة أطول مني','طلعت بالتلفزيون وأنا صغير','ضيعت جوالي ولقيته بالثلاجة','شفت دلفين بالبحر الأحمر','حفظت جدول الضرب وأنا بالروضة','سافرت لخمس دول بشهر واحد','خبزت كيكة طولها متر','نطيت من طيارة بالمظلة','أعرف أقود قارب','عزمت عشرين شخص ببيتنا مرة'];
const P2TTCUE=/قابلت|مرة|عشرين|ثلاثين|أربع|خمس|متر|بطولة|فزت|ورا بعض|مسابقة|أطول|بشهر|رسمي|لغات/;
function p2TtBotWrite(lv){const bluff=Math.random()<[0,0,.2,.4][lv];const t=p2Sh(P2TTT).slice(0,bluff?1:2),l=p2Sh(P2TTL).slice(0,bluff?2:1);
  // usually two plain truths and one odd lie; a bluffing bot tells two odd truths and a plain lie
  const a=p2Sh([...t,...l]);return {a,l:a.indexOf(bluff?t[0]:l[0])};}
function p2TtSusp(x){return (P2TTL.includes(x)?3:P2TTT.includes(x)?0:0)+(P2TTCUE.test(x)?1:0)+(/\d/.test(x)?1:0)+(String(x).length>32?.4:0);}
const p2TtOk=p=>!!p&&typeof p==='object'&&Array.isArray(p.a)&&p.a.length===3&&p.a.every(x=>typeof x==='string'&&x.length>=1&&x.length<=45)&&[0,1,2].includes(p.l);
function p2TtVote(d,k){const q=d.ord[k];return {...d,ph:'vote',qi:k,q,vt:null,rd:d.rd+1,res:k?d.res:''};}
GAMES.p_2t1l={name:'حقيقتين وكذبة',cat:'party',lbc:'#C2185B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E91E63"/>${[0,1,2].map(k=>`<rect x="14" y="${12+k*27}" width="72" height="21" rx="6" fill="#fff"/><path d="M24 ${22.5+k*27}h34" stroke="#F8BBD0" stroke-width="5" stroke-linecap="round"/>`).join('')}<circle cx="74" cy="22.5" r="8" fill="#2ECC71"/><path d="M70 22.5l3 3 5-6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="74" cy="49.5" r="8" fill="#2ECC71"/><path d="M70 49.5l3 3 5-6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="74" cy="76.5" r="8" fill="#E74C3C"/><path d="M70.5 73l7 7M77.5 73l-7 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  init:n=>({ph:'write',rd:1,sm:Array(n).fill(null),lie:Array(n).fill(-1),ord:[],qi:0,q:-1,vt:null,pts:Array(n).fill(0),res:'',last:''}),
  simulNow:d=>d.ph==='write'||d.ph==='vote',
  points:p2Pts,winExtra:p2WinX,
  // online a player's three lines show only when it is their turn, and the lie only at the reveal (or to its writer)
  mask(d,seat){if(d.win!=null)return d;const open=s=>s===seat||s===d.q&&d.ph!=='write';
    return {...d,sm:d.sm.map((x,s)=>open(s)?x:null),lie:d.lie.map((x,s)=>s===seat||s===d.q&&d.ph==='show'?x:-1)};},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||(d.ph==='write'?p2TtOk(p.pick):d.ph==='vote'&&[0,1,2,9].includes(p.pick)),
  net:{local:['tl']},
  viewer:d=>d.win==null&&(d.ph==='write'||d.ph==='vote')?simulViewer(d):null,coverMsg:d=>d.res||'',
  status(d,ctx){const s=d.res?`<small>${d.res}</small><br>`:'';
    if(d.ph==='write')return s+'كل واحد يكتب حقيقتين وكذبة عن نفسه';
    if(d.ph==='vote')return s+`<small>${d.qi+1} من ${d.ord.length}</small><br>وين كذبة ${nameTag(d,d.q)}؟`;
    return s+`هذي كانت كذبة ${nameTag(d,d.q)}`;},
  render(d,ctx){const v=ctx.v;let h='<div class="p2 p2-tt">';
    if(d.ph==='write'){if(!ctx.my||v==null||v<0)return h+'<p class="p2-lead small">ننتظر الكل يكتب…</p>'+p2Wait(d)+'</div>';
      const tl=S.draft['p2tl'+v];h+=`<p class="p2-lead">${nm(d,v)}: اكتب ثلاث أشياء عنك، وحدة منها كذبة، وحدد الكذبة</p>`;
      h+=[0,1,2].map(k=>`<div class="p2-ttin ${String(tl)===String(k)?'lie':''}"><input class="field" data-draft="p2t${v}_${k}" maxlength="45" value="${escH(S.draft['p2t'+v+'_'+k]||'')}" placeholder="${['مثلًا: زرت أبها بالصيف','مثلًا: أخاف من القطط','مثلًا: أعرف أطبخ مندي'][k]}" autocomplete="off"><button class="p2-lie" data-ga="tl" data-i="${k}">${String(tl)===String(k)?'🤥 الكذبة':'كذبة؟'}</button></div>`).join('');
      return h+`<button class="big red" data-ga="send">سلّم ✓</button></div>`;}
    const q=d.q;const L=d.sm[q]||['','',''];
    h+=`<div class="p2-subj" style="--c:${col(d,q)}"><i>${shapeW(d.pl[q])}</i><b>${nm(d,q)}</b><small>${d.ph==='show'?'الكذبة انكشفت':'يقول عن نفسه:'}</small></div>`;
    if(d.ph==='vote'){const canV=ctx.my&&v!==q;
      h+=`<div class="p2-stm">${L.map((x,k)=>canV?`<button class="p2-st" data-ga="v" data-i="${k}"><small>${k+1}</small><span>${escH(x)}</span></button>`:`<div class="p2-st"><small>${k+1}</small><span>${escH(x)}</span></div>`).join('')}</div>`;
      if(canV)h+='<p class="note">اضغط على الجملة اللي تحسها كذبة</p>';
      else if(ctx.my&&v===q)h+=`<p class="p2-lead small">الكل يصوّتون على جملك 👀</p><button class="btn soft wide" data-ga="ok">تمام</button>`;
      else h+='<p class="note">ننتظر التصويت…</p>'+p2Wait(d);return h+'</div>';}
    // the reveal: the lie, and who fell for what
    const lie=d.lie[q];h+=`<div class="p2-stm">${L.map((x,k)=>{const who=(d.vt||[]).map((p,s)=>p===k&&s!==q?s:-1).filter(s=>s>=0);
      return `<div class="p2-st ${k===lie?'lie':'true'}" data-k="r${d.qi}_${k}"><small>${k===lie?'🤥':'✓'}</small><span>${escH(x)}</span><em>${who.map(s=>`<i style="--c:${col(d,s)}">${nm(d,s)}</i>`).join('')}</em></div>`;}).join('')}</div>`;
    return h+p2Next(d,ctx,d.qi+1>=d.ord.length)+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='tl'&&d.ph==='write'&&v>=0){S.draft['p2tl'+v]=String(i);render();return;}
    if(a==='send'&&d.ph==='write'&&ctx.my){const A=[0,1,2].map(k=>p2T(S.draft[`p2t${v}_${k}`],45));const l=+S.draft['p2tl'+v];
      if(A.some(x=>x.length<2)){toast('اكتب الثلاث جمل');return;}if(![0,1,2].includes(l)){toast('حدد أي وحدة الكذبة');return;}
      for(const k of [0,1,2])delete S.draft[`p2t${v}_${k}`];delete S.draft['p2tl'+v];simulPick(d,v,{a:A,l});return;}
    if(a==='v'&&d.ph==='vote'&&ctx.my&&v!==d.q&&[0,1,2].includes(i)){simulPick(d,v,i);return;}
    if(a==='ok'&&d.ph==='vote'&&ctx.my&&v===d.q){simulPick(d,v,9);return;}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(GAMES.p_2t1l.next(d));}},
  next(d){const k=d.qi+1;if(k>=d.ord.length)return {...d,ph:'end',win:mostPts(d.pts)};return p2TtVote(d,k);},
  resolve(d,picks){if(d.ph==='write'){const sm=d.pl.map(()=>null),lie=d.pl.map(()=>-1);picks.forEach((p,s)=>{if(p2TtOk(p)){sm[s]=p.a.map(x=>p2T(x,45));lie[s]=p.l;}});
      const ord=[];for(let k=0;k<d.pl.length;k++){const s=(d.st+k)%d.pl.length;if(sm[s])ord.push(s);}
      if(!ord.length)return {...d,sm,lie,ph:'end',win:'d'};return p2TtVote({...d,sm,lie,ord,res:'الكل كتب! نبدأ'},0);}
    const q=d.q,lie=d.lie[q];const P=[...d.pts];let ok=0,no=0;const vt=picks.map((p,s)=>s!==q&&[0,1,2].includes(p)?p:-1);
    vt.forEach((p,s)=>{if(p<0)return;if(p===lie){P[s]++;ok++;}else{P[q]++;no++;}});
    return {...d,ph:'show',vt,pts:P,turn:q,ts:Date.now(),res:`${ok} عرفوا الكذبة، و${no} انخدعوا`};},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>12000)return GAMES.p_2t1l.next(d);return null;},
  botPick(d,s,lv){if(d.ph==='write')return p2TtBotWrite(lv);if(s===d.q)return 9;const L=d.sm[d.q];if(!L)return rnd(3);
    if(lv===1||lv===2&&Math.random()<.4)return rnd(3);const sc=L.map(x=>p2TtSusp(x)+Math.random()*(lv===3?.5:1.2));return sc.indexOf(Math.max(...sc));},
  bot(d,s){if(d.ph==='show'&&d.turn===s)return GAMES.p_2t1l.next(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?4500:BOTMS[lv]+rnd(2500)};
HELP.p_2t1l='كل واحد يكتب ثلاث أشياء عن نفسه: اثنين صدق وواحد كذب، ويحدد الكذبة (محد يشوفها). بعدها تطلع جمل كل لاعب بالدور، والباقين يصوّتون بالسر: أي وحدة الكذبة؟ اللي يعرف الكذبة ياخذ نقطة، وصاحب الجمل ياخذ نقطة عن كل واحد انخدع. على جوال واحد كل واحد يكتب ويصوّت لحاله والجوال يتمرر. البوت عنده جمل جاهزة، والصعب منهم يحاول يكتشف الكذبة الغريبة ويخدعكم أحيانًا بكذبة عادية. مع الفرق: نقاط الفريق تنجمع.';

/* =====================================================================================================
   مين الأكثر (p_most): «who is most likely to…». Everyone votes in secret, then the votes are revealed.
   Vote for the one the most others chose: +1.
   ===================================================================================================== */
const P2MOSTQ=['ينسى جواله بالبيت','يتأخر عن الموعد','يضحك بموقف جدّي','يصير مشهور','ينام بالسيارة أول ما تمشي','ياكل آخر قطعة بالصحن','يرد على الرسالة بعد يومين','يسافر حول العالم','يشتري شي ما يحتاجه بالتخفيضات','يطبخ أحلى كبسة','يضيع بالمول','ينسى عيد ميلاد أحد','يصحى أبكر واحد','يسهر لين الفجر','يتأثر ويبكي بفيلم كرتون','يحفظ أرقام الجوالات','يتكلم مع نفسه','يغير رأيه بآخر لحظة','يزعل لا خسر باللعب','يصير مدير شركة','يصوّر أكله قبل لا ياكله','يطلب نفس الطلب كل مرة بالمطعم','يقول نكتة ما تضحك','يساعد الكل بدون ما ينطلب منه','يفوز بمسابقة معلومات','يروح للنادي كل يوم','يعرف أخبار العايلة قبل الكل','ينسى وين وقّف سيارته','يجيب هدايا للكل من السفر','يغني بصوت عالي بالسيارة','يرتب غرفته كل يوم','يكسب بكل الألعاب','يصلّح أي شي خربان','يخلص كتاب بأسبوع','يتحمس زيادة بالمباريات','يقنعك بأي شي','يسولف سالفة طويلة من لا شي','ينام أول واحد بالكشتة','يخاف من أفلام الرعب','يشرب قهوة أكثر من الكل','يعيش بالبر لو خيروه','يتعلم لغة جديدة','يطلع بالتلفزيون','يفتح محل حلويات','يوصل قبل الموعد بساعة','يضيع مفاتيحه','ينظّم الرحلة للكل','يصير أحسن معلم','يقدر يعيش أسبوع بدون جوال','يضحك أول واحد على أي نكتة'];
function p2MostQ(d){return {...d,ph:'vote',qi:p2Fresh('most',P2MOSTQ.length),rd:d.rd+1,vt:null,top:[]};}
GAMES.p_most={name:'مين الأكثر',cat:'party',lbc:'#B9770E',teams:'none',minP:3,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F1C40F"/><circle cx="50" cy="44" r="13" fill="#2D4763"/><path d="M28 86c0-14 10-22 22-22s22 8 22 22z" fill="#2D4763"/><path d="M38 24l6 6 6-10 6 10 6-6-2 12H40z" fill="#E67E22"/><path d="M6 64l18-6M94 64l-18-6M10 84l16-10M90 84l-16-10" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="8" cy="64" r="5" fill="#fff"/><circle cx="92" cy="64" r="5" fill="#fff"/></svg>`,
  init:n=>({ph:'vote',r:0,R:8,qi:0,rd:0,vt:null,top:[],hv:Array(n).fill(0),pts:Array(n).fill(0),res:'',last:''}),
  start:d=>p2MostQ(d),
  simulNow:d=>d.ph==='vote',
  points:p2Pts,winExtra:p2WinX,
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||Number.isInteger(p.pick)&&p.pick>=0&&p.pick<d.pl.length&&d.out[p.pick]!=='1',
  net:{local:[]},
  viewer:d=>d.win==null&&d.ph==='vote'?simulViewer(d):null,coverMsg:d=>d.res||'',
  status(d,ctx){const s=d.res?`<small>${d.res}</small><br>`:'';return s+`<small>السؤال ${d.r+1} من ${d.R}</small><br>`+(d.ph==='vote'?'صوّتوا بالسر':'النتيجة');},
  render(d,ctx){const v=ctx.v;let h=`<div class="p2 p2-most"><div class="p2-qcard" data-k="mq${d.r}"><small>مين أكثر واحد ممكن…</small><b>${P2MOSTQ[d.qi]}؟</b></div>`;
    if(d.ph==='vote'){if(!ctx.my||v==null||v<0)return h+'<p class="note">ننتظر الأصوات…</p>'+p2Wait(d)+'</div>';
      return h+`<p class="p2-lead small">${nm(d,v)}، مين تختار؟</p>`+p2Tiles(d,{v,ga:'v',can:s=>d.out[s]!=='1',sub:s=>s===v?'أنت':''})+'</div>';}
    const cnt=d.pl.map(()=>0);(d.vt||[]).forEach(x=>{if(x>=0)cnt[x]++;});
    h+=p2Tiles(d,{v,badge:s=>cnt[s]?`<u class="p2-cnt">${cnt[s]}</u>`:'',cls:s=>d.top.includes(s)?'crown':'',sub:s=>d.top.includes(s)?'👑':''});
    h+=`<ul class="p2-votes">${(d.vt||[]).map((t,s)=>t>=0?`<li><b style="color:${col(d,s)}">${nm(d,s)}</b> ← <b style="color:${col(d,t)}">${nm(d,t)}</b>${d.top.includes(t)?' <em>+1</em>':''}</li>`:'').join('')}</ul>`;
    return h+p2Next(d,ctx,d.r+1>=d.R,'السؤال الجاي ←')+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;if(a==='v'&&d.ph==='vote'&&ctx.my&&d.out[i]!=='1'){simulPick(d,v,i);return;}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(GAMES.p_most.next(d));}},
  next(d){const r=d.r+1;if(r>=d.R)return {...d,ph:'end',win:mostPts(d.pts)};return p2MostQ({...d,r});},
  resolve(d,picks){const vt=picks.map(p=>Number.isInteger(p)&&p>=0&&p<d.pl.length?p:-1);const cnt=d.pl.map(()=>0);vt.forEach(x=>{if(x>=0)cnt[x]++;});
    const mx=Math.max(...cnt);const top=mx>0?cnt.map((c,s)=>c===mx?s:-1).filter(s=>s>=0):[];const P=[...d.pts];vt.forEach((x,s)=>{if(top.includes(x))P[s]++;});
    const hv=d.hv.map((h,s)=>h+cnt[s]);return {...d,ph:'show',vt,top,hv,pts:P,turn:p2Rot(d,d.r),ts:Date.now(),res:top.length?`الأكثر: ${top.map(s=>nm(d,s)).join(' و')}`:'محد صوّت'};},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>11000)return GAMES.p_most.next(d);return null;},
  // a hard bot goes with the one the group keeps choosing; an easy one picks anybody
  botPick(d,s,lv){const al=aliveSeats(d);const others=al.filter(x=>x!==s);if(lv===1||lv===2&&Math.random()<.5||!d.hv.some(x=>x>0))return p2Pick(Math.random()<.1?al:others);
    const sc=al.map(x=>d.hv[x]+Math.random()*(lv===3?.6:1.5)-(x===s?1:0));return al[sc.indexOf(Math.max(...sc))];},
  bot(d,s){if(d.ph==='show'&&d.turn===s)return GAMES.p_most.next(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?4500:BOTMS[lv]+rnd(2500)};
HELP.p_most='يطلع سؤال «مين أكثر واحد ممكن…» (مثلًا: ينسى جواله بالبيت). كل واحد يصوّت بالسر لواحد من الموجودين (تقدر تصوّت لنفسك). بعدها تنكشف الأصوات: مين صوّت لمين، واللي جاب أكثر أصوات ياخذ التاج 👑. اللي صوّت مثل الأغلبية ياخذ نقطة. ثمان أسئلة، والأكثر نقاط يفوز. من 3 لاعبين وفوق، وكل واحد يلعب لحاله.';

/* =====================================================================================================
   قصة متسلسلة (p_story): a story starts with one line; each player adds the next sentence. Every writer also gets
   a secret word: putting it in the sentence is worth a point. After a round everyone votes for the best twist.
   ===================================================================================================== */
const P2STOP=['كان فيه ولد اسمه فهد يحب يجرب كل شي جديد.','في ليلة شتوية بالبر، سمعوا صوت غريب ورا الخيمة.','صحت نورة الصبح ولقت باب بيتهم مفتوح.','في رحلة المدرسة، ضاع الباص بطريق ما يعرفه أحد.','قرر جدي يسوي أكبر كبسة بتاريخ الحارة.','لقى سعد صندوق قديم بسطح البيت مكتوب عليه: لا تفتحه.','في يوم العيد، اختفت كل العيديات من المجلس.','وصلت رسالة غريبة لجوال ريم من رقم ما تعرفه.','قطوة الجيران دخلت بيتنا وهي لابسة طاقية.','في مباراة الحارة النهائية، طاحت الكورة فوق سطح بيت مهجور.','ركب خالد القطار، ولما وقف ما كان فيه أحد غيره.','في المطبخ، بدأ القدر يتكلم فجأة.','طار صقر أبوي الصبح وما رجع لين المغرب.','في المكتبة، طاح كتاب من الرف وانفتح على خريطة.','اشترى عمي سيارة قديمة، وأول ما شغّلها طلع منها دخان ملوّن.','في الكشتة، اختفت الدلة فجأة.'];
const P2STW=['جمل','صاروخ','بطريق','دلة','مظلة','كبسة','بالون','تاج','مفتاح','كنز','خريطة','ثلج','سلحفاة','روبوت','قطار','كيكة','صقر','جزيرة','بركان','مرآة','فانوس','حبحب','قارب','قطوة','مكنسة','ديناصور','نظارة','شماغ','تمر','نجمة','غيمة','صندوق','سمكة','بطاطس','زرافة','طيارة','حصان','دراجة','عصير','ساعة'];
const P2STB=['وفجأة طلع لهم {w} من ورا الباب!','وقرروا يدورون {w} قبل لا تغيب الشمس.','بس المشكلة إن {w} كان أكبر مما توقعوا.','وصاح واحد منهم: شوفوا {w} فوق السطح!','وما كان أحد يدري إن {w} هو الحل.','فجأة رن الجوال، وكان المتصل يسأل عن {w}.','وبعد ساعة لقوا {w} جنب الدلة.','وقرروا يبيعون {w} بالحراج.','ولما فتحوا الصندوق لقوا فيه {w}.','وطلع إن {w} هو السبب من البداية!','وراحوا يسألون الجيران: أحد شاف {w}؟','وقال الجد: هذا {w} عندي من وأنا صغير.','ورسموا خطة كاملة عشان يرجعون {w}.','وفي نص الطريق خرب كل شي بسبب {w}.','وفجأة صار {w} يتكلم!','فسووا مسابقة بالحارة، والجايزة {w}.','وطلع لهم {w} يلمع تحت ضوء القمر.'];
const p2StRound=d=>d.ln.slice(d.rs).map((x,k)=>[x,d.rs+k]);
const p2StHas=(t,w)=>p2N(t).includes(p2N(w));
function p2StWriter(d){const left=aliveSeats(d).filter(s=>!d.wr.includes(s));if(!left.length)return -1;let s=(d.st+d.r)%d.pl.length;for(let j=0;j<d.pl.length;j++){if(left.includes(s))return s;s=(s+1)%d.pl.length;}return left[0];}
function p2StWrite(d,s,txt){const tw=d.tw;const b=txt&&p2StHas(txt,P2STW[tw])?1:0;const P=[...d.pts];P[s]+=b;const x={...d,ln:[...d.ln,[s,txt,tw,b]],wr:[...d.wr,s],pts:P};
  const nx=p2StWriter(x);if(nx>=0)return {...x,turn:nx,tw:p2Fresh('stw',P2STW.length)};
  return p2StRound(x).filter(([l])=>l[1]).length>=2?{...x,ph:'vote',rd:x.rd+1,tw:-1,vt:null}:GAMES.p_story.next({...x,ph:'show',vt:null});}
GAMES.p_story={name:'قصة متسلسلة',cat:'party',lbc:'#6E2C00',teams:'none',minP:3,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#A0522D"/><path d="M16 14h56l10 10v62H16z" fill="#FDF2E0"/><path d="M72 14v10h10" fill="#E8D3B0"/>${[30,42,54,66].map((y,k)=>`<path d="M24 ${y}h${k===3?30:48}" stroke="${k===2?'#E74C3C':'#B08A5A'}" stroke-width="4" stroke-linecap="round"/>`).join('')}<path d="M64 84l22-36 6 4-22 36-8 2z" fill="#2D4763"/><path d="M86 48l4-6 6 4-4 6z" fill="#F4D03F"/></svg>`,
  init:n=>({ph:'write',op:0,ln:[],tw:-1,r:0,R:n<=3?3:n<=5?2:1,rs:0,wr:[],rd:0,vt:null,pts:Array(n).fill(0),last:''}),
  start:d=>({...d,op:p2Fresh('stop',P2STOP.length),tw:p2Fresh('stw',P2STW.length),turn:p2StWriter(d)}),
  simulNow:d=>d.ph==='vote',
  points:p2Pts,winExtra:p2WinX,
  // the secret word belongs to whoever writes now
  mask:(d,seat)=>d.win!=null||seat===d.turn&&d.ph==='write'?d:{...d,tw:-1},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||Number.isInteger(p.pick)&&p.pick>=d.rs&&p.pick<d.ln.length&&d.ln[p.pick][0]!==d.pl.indexOf(r),
  net:{local:[]},
  viewer:d=>d.win!=null?null:d.ph==='write'?(isBot(d,d.turn)?null:d.turn):d.ph==='vote'?simulViewer(d):null,
  coverMsg:d=>d.ph==='write'?'دورك تكمّل القصة، ومعك كلمة سرية':'صوّت لأحلى جملة',
  onSkip(nd){if(nd.win!=null)return nd;if(nd.ph==='write'&&nd.out[nd.turn]==='1'){const nx=p2StWriter(nd);return nx>=0?{...nd,turn:nx}:GAMES.p_story.next({...nd,ph:'show'});}return nd;},
  onTimeout:d=>d.ph==='write'?p2StWrite(d,d.turn,''):d.ph==='show'?GAMES.p_story.next(d):d,
  status(d,ctx){const top=`<small>الجولة ${d.r+1} من ${d.R}</small><br>`;if(d.ph==='write')return top+(!ctx.local&&ctx.v===d.turn?'<b class="yt">دورك تكمّل القصة</b>':`${nameTag(d,d.turn)} يكتب الجملة الجاية`);
    if(d.ph==='vote')return top+'صوّتوا لأحلى جملة بهالجولة';return top+'أحلى جملة';},
  render(d,ctx){const v=ctx.v;let h='<div class="p2 p2-story">';const cur=d.ph==='write'||d.ph==='vote';
    const cnt={};(d.vt||[]).forEach(x=>{if(x>=0)cnt[x]=(cnt[x]||0)+1;});const mx=Math.max(0,...Object.values(cnt));
    h+=`<div class="p2-paper"><p class="op">${P2STOP[d.op]}</p>${d.ln.map(([s,t,tw,b],k)=>t?`<p data-k="sl${k}" class="${k>=d.rs&&cur?'new':''} ${d.ph==='show'&&k>=d.rs&&cnt[k]===mx&&mx>0?'best':''}" style="--c:${col(d,s)}">${escH(t)} <small>— ${nm(d,s)}${k>=d.rs?` • 🔑 ${P2STW[tw]||''}${b?' ✓':''}`:''}${cnt[k]?` • ${cnt[k]} 👍`:''}</small></p>`:'').join('')}${d.ph==='write'?'<p class="dots">…</p>':''}</div>`;
    if(d.ph==='write'){const me=(ctx.local||v===d.turn)&&!isBot(d,d.turn);
      if(me&&d.tw>=0)h+=`<div class="p2-twist">🔑 كلمتك السرية: <b>${P2STW[d.tw]}</b><small>دخّلها بجملتك وتاخذ نقطة</small></div><div class="p2-guess col"><input class="field" data-draft="p2sl${d.turn}" data-enter="sl" maxlength="70" value="${escH(S.draft['p2sl'+d.turn]||'')}" placeholder="كمّل القصة بجملة وحدة…" autocomplete="off"><button class="btn red" data-ga="sl">أضف ✍️</button></div>`;
      else h+=`<p class="note">${isBot(d,d.turn)?'🤖 ':''}${nm(d,d.turn)} يكتب…</p>`;}
    if(d.ph==='vote'){if(!ctx.my||v==null||v<0)return h+'<p class="note">ننتظر الأصوات…</p>'+p2Wait(d)+'</div>';
      h+=`<p class="p2-lead small">${nm(d,v)}، أي جملة أحلى؟</p><div class="p2-stm">${p2StRound(d).filter(([l])=>l[1]&&l[0]!==v).map(([l,k])=>`<button class="p2-st" data-ga="v" data-i="${k}" style="--c:${col(d,l[0])}"><small>${nm(d,l[0])}</small><span>${escH(l[1])}</span></button>`).join('')}</div>`;}
    if(d.ph==='show')h+=p2Next(d,ctx,d.r+1>=d.R,'الجولة الجاية ←');
    return h+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='sl'&&d.ph==='write'&&(ctx.local||v===d.turn)&&!isBot(d,d.turn)){const s=d.turn;const t=p2T(S.draft['p2sl'+s],70);if(t.length<3){toast('اكتب جملة أول');return;}delete S.draft['p2sl'+s];act(p2StWrite(d,s,t));return;}
    if(a==='v'&&d.ph==='vote'&&ctx.my&&d.ln[i]&&i>=d.rs&&d.ln[i][0]!==v&&d.ln[i][1]){simulPick(d,v,i);return;}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(GAMES.p_story.next(d));}},
  next(d){const r=d.r+1;if(r>=d.R)return {...d,ph:'end',win:mostPts(d.pts)};const x={...d,r,rs:d.ln.length,wr:[],ph:'write',vt:null,tw:p2Fresh('stw',P2STW.length)};return {...x,turn:p2StWriter(x)};},
  resolve(d,picks){const vt=picks.map((p,s)=>Number.isInteger(p)&&d.ln[p]&&p>=d.rs&&d.ln[p][0]!==s?p:-1);const P=[...d.pts];vt.forEach(x=>{if(x>=0)P[d.ln[x][0]]++;});
    return {...d,ph:'show',vt,pts:P,turn:p2Rot(d,d.r),ts:Date.now()};},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>12000)return GAMES.p_story.next(d);return null;},
  bot(d,s,lv){if(d.ph==='write'&&d.turn===s){const w=P2STW[d.tw]||'';const t=lv===1&&Math.random()<.35?p2Pick(P2STB).replace('{w}','الشي'):p2Pick(P2STB).replace('{w}',w);return p2StWrite(d,s,t);}
    if(d.ph==='show'&&d.turn===s)return GAMES.p_story.next(d);return d;},
  botPick(d,s,lv){const L=p2StRound(d).filter(([l])=>l[1]&&l[0]!==s);if(!L.length)return null;if(lv===1)return p2Pick(L)[1];
    const sc=L.map(([l])=>(l[3]?2:0)+(isBot(d,l[0])?0:1)+l[1].length/40+Math.random()*(lv===3?1:2.5));return L[sc.indexOf(Math.max(...sc))][1];},
  botDelay:(d,s,lv)=>d.ph==='show'?4500:d.ph==='write'?2500+rnd(2000):BOTMS[lv]+rnd(2000)};
HELP.p_story='تبدأ القصة بجملة، وكل واحد بدوره يضيف الجملة اللي بعدها. كل واحد يطلع له بالسر «كلمة سرية» (مثل: جمل، صاروخ، مظلة)، لو دخّلها بجملته ياخذ نقطة. لما الكل يكتب، تصوّتون بالسر لأحلى جملة أو أقوى تحويلة بالقصة (ما تصوّت لنفسك)، وكل صوت بنقطة. من جولة إلى ثلاث حسب عددكم، والأكثر نقاط يفوز. البوت يكمّل بجمل جاهزة فيها كلمته السرية. من 3 لاعبين وفوق.';

/* =====================================================================================================
   الرسام المزيف (p_fake): everyone sees a word except the fake artist, who only knows its kind. Each adds one line
   to the shared drawing (two rounds), then all vote for the fake. Caught: the fake may still win by naming the word.
   ===================================================================================================== */
const P2FA='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const p2FkEnc=p=>p.map(([x,y])=>P2FA[Math.max(0,Math.min(62,Math.round(x)))]+P2FA[Math.max(0,Math.min(62,Math.round(y)))]).join('');
const p2FkDec=s=>(String(s||'').match(/../g)||[]).map(q=>[P2FA.indexOf(q[0]),P2FA.indexOf(q[1])]).filter(p=>p[0]>=0&&p[1]>=0);
const p2FkArc=(cx,cy,rx,ry,a0,a1)=>{const n=Math.max(6,Math.round(Math.abs(a1-a0)/24));return Array.from({length:n+1},(_,k)=>{const a=(a0+(a1-a0)*k/n)*Math.PI/180;return [cx+rx*Math.cos(a),cy+ry*Math.sin(a)];});};
// a sketch: strokes split by «;», each a polyline «x,y x,y» or c:cx,cy,r[,a0,a1] (circle or arc), e:cx,cy,rx,ry, s:cx,cy,r (spiral)
function p2FkParse(src){return src.split(';').map(t=>{t=t.trim();const m=/^([ces]):(.*)$/.exec(t);if(m){const a=m[2].split(',').map(Number);
    if(m[1]==='c')return p2FkEnc(p2FkArc(a[0],a[1],a[2],a[2],a[3]??0,a[4]??360));if(m[1]==='e')return p2FkEnc(p2FkArc(a[0],a[1],a[2],a[3],0,360));
    return p2FkEnc(Array.from({length:22},(_,k)=>{const r=a[2]*k/21,ang=k*0.62*Math.PI/2;return [a[0]+r*Math.cos(ang),a[1]+r*Math.sin(ang)];}));}
  return p2FkEnc(t.split(/\s+/).map(q=>q.split(',').map(Number)));});}
const P2FKW=[['طبيعة','شمس','☀️','c:31,31,11;31,4 31,14;31,48 31,58;4,31 14,31;48,31 58,31;12,12 19,19;50,50 43,43'],['طبيعة','قمر','🌙','c:31,31,22,60,300;c:44,31,16,90,270'],['طبيعة','شجرة','🌳','26,58 26,40 36,40 36,58;c:31,26,16'],['طبيعة','جبل','⛰️','2,56 22,20 32,36 42,14 60,56 2,56;16,30 22,20 28,30;36,25 42,14 48,25'],['طبيعة','غيمة','☁️','10,42 8,34 16,28 24,29 30,20 40,19 46,26 54,30 56,38 50,42 10,42;20,48 16,56;32,48 28,56;44,48 40,56'],['طبيعة','نجمة','⭐','31,4 38,24 58,24 42,36 48,56 31,44 14,56 20,36 4,24 24,24 31,4'],
 ['أشياء','مظلة','☂️','c:31,30,25,180,360;6,30 56,30;31,30 31,52 27,57 22,53'],['أشياء','مفتاح','🔑','c:15,31,9;24,31 57,31;48,31 48,40;55,31 55,38'],['أشياء','نظارة','👓','c:18,32,10;c:44,32,10;28,30 34,30;8,30 2,25;54,30 60,25'],['أشياء','كوب','☕','14,14 18,54 44,54 48,14;c:49,32,9,270,450;20,8 22,4;30,8 32,4'],['أشياء','ساعة','⏰','c:31,31,23;31,31 31,15;31,31 43,37'],['أشياء','بالون','🎈','e:31,22,14,17;31,39 27,46 34,52 29,60'],
 ['أكل','تفاحة','🍎','c:31,36,18;31,18 33,7;34,12 43,7 41,14 34,13'],['أكل','موز','🍌','8,18 12,34 24,46 40,50 54,44;8,18 18,32 30,40 44,42 54,44'],['أكل','بيتزا','🍕','8,12 54,12 31,58 8,12;8,12 12,6 50,6 54,12;c:22,20,3;c:38,22,3;c:31,36,3'],['أكل','آيس كريم','🍦','17,30 31,59 45,30;c:31,28,14,180,360;17,30 45,30'],['أكل','كيكة','🎂','10,34 52,34 52,55 10,55 10,34;10,44 52,44;31,34 31,22;c:31,18,3'],['أكل','بيضة','🥚','e:31,33,15,21'],
 ['حيوانات','سمكة','🐟','e:28,31,18,11;46,31 58,20 58,42 46,31;c:18,28,2'],['حيوانات','ثعبان','🐍','4,42 12,30 20,42 28,30 36,42 44,30 52,42 58,34;c:58,32,3'],['حيوانات','قطة','🐱','c:31,35,16;18,26 15,8 27,21;44,26 47,8 35,21;20,39 6,37;20,43 6,46;42,39 56,37;42,43 56,46'],['حيوانات','فراشة','🦋','31,14 31,50;31,24 14,8 5,22 14,32 31,30;31,24 48,8 57,22 48,32 31,30;31,32 14,38 11,50 24,50 31,40;31,32 48,38 51,50 38,50 31,40'],['حيوانات','عنكبوت','🕷️','c:31,32,9;22,28 10,20 4,27;22,36 10,42 4,36;40,28 52,20 58,27;40,36 52,42 58,36;31,23 31,3'],['حيوانات','حلزون','🐌','s:26,32,15;4,50 56,50 60,44;44,40 50,26;48,42 58,30'],
 ['مباني','بيت','🏠','12,30 12,56 50,56 50,30;5,33 31,8 57,33;26,56 26,42 36,42 36,56'],['مباني','خيمة','⛺','3,55 31,10 59,55 3,55;24,55 31,36 38,55'],['مباني','برج','🗼','17,59 31,3 45,59;22,45 40,45;25,30 37,30;28,17 34,17'],['مباني','مسجد','🕌','14,56 14,38 48,38 48,56 14,56;c:31,38,15,180,360;55,56 55,14;52,14 55,7 58,14 52,14'],['مباني','جسر','🌉','2,38 60,38;c:31,54,26,196,344;10,38 10,56;52,38 52,56'],['مباني','قلعة','🏰','8,56 8,20 14,20 14,26 20,26 20,20 26,20 26,26 32,26 32,20 38,20 38,26 44,26 44,20 50,20 50,26 54,26 54,56 8,56;c:31,48,6,180,360;25,48 25,56;37,48 37,56'],
 ['مواصلات','سيارة','🚗','5,43 5,32 16,32 22,20 42,20 50,32 58,32 58,43 5,43;c:18,45,6;c:46,45,6'],['مواصلات','قارب','⛵','5,40 57,40 48,52 14,52 5,40;31,40 31,5;31,8 52,34 31,34'],['مواصلات','طيارة','✈️','6,32 54,32 60,30 54,28 6,28;28,30 20,10;34,30 24,50;8,30 4,20'],['مواصلات','دراجة','🚲','c:14,42,10;c:48,42,10;14,42 26,26 42,26 48,42;26,26 30,42 14,42;42,26 40,18 46,18'],['مواصلات','صاروخ','🚀','31,3 41,18 41,46 21,46 21,18 31,3;21,38 13,52 21,46;41,38 49,52 41,46;c:31,24,4;26,48 31,59 36,48'],['مواصلات','قطار','🚆','8,22 44,22 44,46 8,46 8,22;44,30 56,30 56,46 44,46;c:16,50,5;c:34,50,5;c:50,50,5;48,30 48,18 54,18 54,30']];
const P2FK=P2FKW.map(([cat,w,em,src])=>({cat,w,em,sk:p2FkParse(src)}));
const p2FkSvg=(d,list)=>list.map(([s,e])=>{const p=p2FkDec(e);if(!p.length)return '';const c=s>=0&&d.pl[s]!=null?COLS[d.pl[s]]:'#2D4763';
  return p.length===1?`<circle cx="${p[0][0]}" cy="${p[0][1]}" r="1.4" fill="${c}"/>`:`<polyline points="${p.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;}).join('');
const p2FkOkStroke=e=>typeof e==='string'&&e.length>=2&&e.length<=100&&e.length%2===0&&[...e].every(c=>P2FA.includes(c));
const p2FkThin=p=>p.filter((q,i)=>{if(!i||i===p.length-1)return true;const a=p[i-1],b=p[i+1],ux=q[0]-a[0],uy=q[1]-a[1],vx=b[0]-q[0],vy=b[1]-q[1];return ux*vy!==uy*vx||ux*vx+uy*vy<0;});
// a fake artist's line: a small shape somewhere, or (a careful one) a copy of someone's line moved a little
function p2FkShape(d,lv){const prev=d.sk.filter(x=>x[0]>=0);if(lv>1&&prev.length&&Math.random()<(lv===3?.6:.35)){const p=p2FkDec(p2Pick(prev)[1]);const dx=rnd(13)-6,dy=rnd(13)-6;return p2FkEnc(p.map(([x,y])=>[x+dx,y+dy]));}
  const cx=12+rnd(39),cy=12+rnd(39),r=4+rnd(7);const k=rnd(3);if(k===0)return p2FkEnc(p2FkArc(cx,cy,r,r,0,360));if(k===1)return p2FkEnc([[cx-r,cy],[cx+r,cy+rnd(5)-2]]);return p2FkEnc([[cx-r,cy],[cx-r/2,cy-r/2],[cx,cy],[cx+r/2,cy-r/2],[cx+r,cy]]);}
const p2FkReal=(d,e)=>P2FK[d.w]&&P2FK[d.w].sk.includes(e);
function p2FkEnd(d,fakeWins,why){const al=aliveSeats(d);const wins=fakeWins?[d.fk]:al.filter(s=>s!==d.fk);return {...d,ph:'end',win:wins.length?wins[0]:'d',wins,why};}
GAMES.p_fake={name:'الرسام المزيف',cat:'party',lbc:'#5B2C6F',teams:'none',minP:3,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6C3483"/><path d="M28 92l14-30M72 92L58 62M50 62v30" stroke="#C8A27A" stroke-width="5" stroke-linecap="round"/><rect x="16" y="10" width="68" height="54" rx="4" fill="#fff" stroke="#C8A27A" stroke-width="4"/><path d="M26 48c8-18 16-20 22-8s14 8 22-14" stroke="#E74C3C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 24h12" stroke="#3498DB" stroke-width="4" stroke-linecap="round"/><circle cx="66" cy="72" r="15" fill="#2D4763"/><circle cx="60" cy="70" r="4.5" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="72" cy="70" r="4.5" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M64.5 70h3M58 78q8 5 16 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  init:n=>({ph:'see',w:-1,kc:'',fk:-1,sk:[],K:2*n,rd:1,vt:null,opts:[],gs:-1,why:'',last:''}),
  start(d){const al=aliveSeats(d);const w=p2Fresh('fk',P2FK.length);return {...d,w,kc:P2FK[w].cat,fk:al[rnd(al.length)]};},
  simulNow:d=>d.ph==='see'||d.ph==='vote',
  /* online: the fake never gets the word, and only the fake knows it is them, until the vote catches them */
  mask(d,seat){if(d.win!=null)return d;const v={...d};const isF=seat>=0&&seat===d.fk;if(isF||seat<0)v.w=-1;if(d.ph!=='guess'&&!isF)v.fk=-1;return v;},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||(d.ph==='see'?p.pick===1:d.ph==='vote'&&Number.isInteger(p.pick)&&p.pick>=0&&p.pick<d.pl.length&&p.pick!==d.pl.indexOf(r)),
  net:{local:['fclr','peek']},
  viewer:d=>d.win!=null?null:d.ph==='draw'?(isBot(d,d.turn)?null:d.turn):d.ph==='guess'?(isBot(d,d.fk)?null:d.fk):simulViewer(d),
  coverMsg:d=>d.ph==='draw'?'دورك ترسم خط واحد':d.ph==='guess'?'انكشفت! باقي لك فرصة':'',
  winText:d=>d.fk<0?null:d.wins&&d.wins[0]===d.fk?`الرسام المزيف ${nm(d,d.fk)} فاز! 🎭`:`كشفتوا ${nm(d,d.fk)}، فاز الرسامين 🎨`,
  winExtra:d=>P2FK[d.w]?`الكلمة: ${P2FK[d.w].em} ${P2FK[d.w].w}${d.why?' • '+d.why:''}`:'',
  onSkip(nd){if(nd.win!=null)return nd;if(nd.out[nd.fk]==='1')return p2FkEnd(nd,false,'المزيف طلع');if(nd.ph==='draw'&&nd.out[nd.turn]==='1')return {...nd,turn:nextSeat(nd,nd.turn)};return nd;},
  onTimeout:d=>d.ph==='draw'?GAMES.p_fake.add(d,d.turn,''):d.ph==='guess'?p2FkEnd(d,false,'ما لحق يخمّن'):d,
  status(d,ctx){const v=ctx.v;const kind=d.kc;if(d.ph==='see')return 'كل واحد يشوف بطاقته بالسر';
    if(d.ph==='draw')return `<small>الخط ${d.sk.length+1} من ${d.K} • النوع: ${kind||'…'}</small><br>`+(!ctx.local&&v===d.turn?'<b class="yt">دورك ترسم خط واحد</b>':`${nameTag(d,d.turn)} يرسم`);
    if(d.ph==='vote')return 'مين الرسام المزيف؟ صوّتوا بالسر';return `انكشف ${nameTag(d,d.fk)}! يحاول يعرف الكلمة`;},
  render(d,ctx){const v=ctx.v,E=P2FK[d.w];let h='<div class="p2 p2-fake">';const kind=d.kc;
    const card=s=>s===d.fk?`<div class="p2-card fake"><span class="p2-em">🎭</span><b>أنت الرسام المزيف!</b><p>ما تعرف الكلمة. ارسم مثلهم ولا تنكشف</p></div>`:E?`<div class="p2-card"><small class="p2-cat">${E.cat}</small><span class="p2-em">${E.em}</span><b>${E.w}</b><p>واحد منكم ما يعرفها، اكشفوه</p></div>`:'';
    if(d.ph==='see'){if(!ctx.my||v==null||v<0)return h+'<p class="note">كل واحد يشوف بطاقته…</p>'+p2Wait(d)+'</div>';return h+card(v)+'<button class="big green" data-ga="ok">شفت ✓</button></div>';}
    const fin=d.win!=null;const myCard=v!=null&&v>=0&&!fin?(v===d.fk?`<span class="p2-mine fake">🎭 أنت المزيف • النوع: ${kind}</span>`:E?`<span class="p2-mine">كلمتك: ${E.em} <b>${E.w}</b></span>`:''):'';
    const drawMe=d.ph==='draw'&&(ctx.local||v===d.turn)&&!isBot(d,d.turn);
    if(drawMe&&ctx.local&&(S.mode==='local'))h+=`<div class="p2-mine-row">${d.turn===d.fk?`<span class="p2-mine fake">🎭 أنت المزيف • النوع: ${kind}</span>`:`<button class="sm" data-ga="peek">${S.p2peek&&Date.now()-S.p2peek<2500&&E?`${E.em} ${E.w}`:'👁 كلمتي'}</button>`}</div>`;
    else if(myCard&&d.ph!=='guess')h+=`<div class="p2-mine-row">${myCard}</div>`;
    const cur=drawMe&&S.draft.p2fs&&p2FkOkStroke(S.draft.p2fs)?[[d.turn,S.draft.p2fs]]:[];
    h+=`<div class="p2-easel ${drawMe?'live':''}"><svg viewBox="0 0 63 63" class="p2-drw ${drawMe?'pad':''}" ${drawMe?'id="p2pad"':''}>${p2FkSvg(d,d.sk)}${p2FkSvg(d,cur)}</svg>${d.ph==='draw'?`<small class="p2-kind">${kind?'النوع: '+kind:''}</small>`:''}</div>`;
    h+=`<div class="p2-legend">${d.pl.map((r,s)=>`<span class="${d.ph==='draw'&&s===d.turn?'on':''}" style="--c:${COLS[r]}">${nm(d,s)} <b>${d.sk.filter(x=>x[0]===s).length}</b></span>`).join('')}</div>`;
    if(d.ph==='draw'){if(drawMe)h+=cur.length?`<div class="p2-row"><button class="btn red" data-ga="fok">✓ اعتمد الخط</button><button class="btn soft" data-ga="fclr">↶ أعد</button></div>`:'<p class="note">ارسم خط واحد بإصبعك (بدون ما ترفعه)</p><button class="sm p2-fskip" data-ga="fskip">ما عندي فكرة، عدّني ⏭</button>';
      else h+=`<p class="note">${isBot(d,d.turn)?'🤖 ':''}${nm(d,d.turn)} يرسم…</p>`;}
    if(d.ph==='vote'){if(!ctx.my||v==null||v<0)h+='<p class="note">ننتظر الأصوات…</p>'+p2Wait(d);
      else h+=`<p class="p2-lead small">${nm(d,v)}، مين المزيف؟</p>`+p2Tiles(d,{v,ga:'v',can:s=>s!==v&&d.out[s]!=='1'});}
    if(d.ph==='guess'){h+=`<p class="p2-lead">🎭 ${nm(d,d.fk)} هو المزيف! لو عرف الكلمة يفوز</p>`;
      if((ctx.local||v===d.fk)&&!isBot(d,d.fk))h+=`<div class="p2-things">${d.opts.map(i=>`<button class="p2-thing sm2" data-ga="g" data-i="${i}"><span>${P2FK[i].em}</span><b>${P2FK[i].w}</b></button>`).join('')}</div>`;
      else h+='<p class="note">يفكر…</p>';}
    if(fin){const cnt=d.pl.map(()=>0);(d.vt||[]).forEach(x=>{if(x>=0)cnt[x]++;});h+=p2Tiles(d,{v:-1,badge:s=>cnt[s]?`<u class="p2-cnt">${cnt[s]}</u>`:'',cls:s=>s===d.fk?'crown':'',sub:s=>s===d.fk?'🎭 المزيف':''});
      if(d.gs>=0&&P2FK[d.gs])h+=`<p class="p2-lead small">خمّن المزيف: ${P2FK[d.gs].em} ${P2FK[d.gs].w} ${d.gs===d.w?'✓':'✗'}</p>`;}
    return h+'</div>';},
  add(d,s,e){const x={...d,sk:[...d.sk,[s,e]]};if(x.sk.length>=d.K)return {...x,ph:'vote',rd:d.rd+1,vt:null};return {...x,turn:nextSeat(d,s)};},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='peek'){S.p2peek=Date.now();render();setTimeout(render,2600);return;}
    if(a==='ok'&&d.ph==='see'&&ctx.my){simulPick(d,v,1);return;}
    if(a==='fclr'){S.draft.p2fs='';render();return;}
    if(a==='fok'&&d.ph==='draw'&&(ctx.local||v===d.turn)&&!isBot(d,d.turn)){const e=String(S.draft.p2fs||'');if(!p2FkOkStroke(e)){toast('ارسم خط أول');return;}S.draft.p2fs='';act(GAMES.p_fake.add(d,d.turn,e));return;}
    if(a==='fskip'&&d.ph==='draw'&&(ctx.local||v===d.turn)&&!isBot(d,d.turn)){S.draft.p2fs='';act(GAMES.p_fake.add(d,d.turn,''));return;}
    if(a==='v'&&d.ph==='vote'&&ctx.my&&i!==v&&d.out[i]!=='1'){simulPick(d,v,i);return;}
    if(a==='g'&&d.ph==='guess'&&(ctx.local||v===d.fk)&&!isBot(d,d.fk)&&d.opts.includes(i)){act(p2FkEnd({...d,gs:i},i===d.w,i===d.w?'المزيف عرف الكلمة!':'المزيف ما عرف الكلمة'));}},
  resolve(d,picks){if(d.ph==='see')return {...d,ph:'draw',turn:d.st,rd:d.rd+1};
    const vt=picks.map((p,s)=>Number.isInteger(p)&&p!==s&&p>=0&&p<d.pl.length?p:-1);const cnt=d.pl.map(()=>0);vt.forEach(x=>{if(x>=0)cnt[x]++;});const mx=Math.max(...cnt);const top=cnt.map((c,s)=>c===mx?s:-1).filter(s=>s>=0);
    if(mx>0&&top.length===1&&top[0]===d.fk){const E=P2FK[d.w];const same=p2Sh(P2FK.map((_,i)=>i).filter(i=>i!==d.w&&P2FK[i].cat===E.cat));const oth=p2Sh(P2FK.map((_,i)=>i).filter(i=>P2FK[i].cat!==E.cat));
      return {...d,vt,ph:'guess',turn:d.fk,opts:p2Sh([d.w,...same.slice(0,5),...oth.slice(0,2)])};}
    return p2FkEnd({...d,vt},true,mx>0&&top.length===1?`طلّعتوا ${nm(d,top[0])} وهو رسام صادق`:'تعادلت الأصوات');},
  bot(d,s,lv){if(d.ph==='draw'&&d.turn===s){let e;if(s===d.fk)e=p2FkShape(d,lv);else{const sk=P2FK[d.w].sk;const mine=d.sk.filter(x=>p2FkReal(d,x[1])).length;e=sk[(mine+rnd(lv===1?3:1))%sk.length];}
      return GAMES.p_fake.add(d,s,e);}
    if(d.ph==='guess'&&d.fk===s){// the fake reads the drawing: a line it recognises from a sketch gives the word away
      let i=-1;if(lv>1&&Math.random()<(lv===3?.9:.5)){for(const [,e] of d.sk)for(const o of d.opts)if(P2FK[o].sk.includes(e))i=o;}if(i<0)i=p2Pick(d.opts);
      return p2FkEnd({...d,gs:i},i===d.w,i===d.w?'المزيف عرف الكلمة!':'المزيف ما عرف الكلمة');}
    return d;},
  botPick(d,s,lv){if(d.ph==='see')return 1;const oth=aliveSeats(d).filter(x=>x!==s);if(s===d.fk||lv===1)return p2Pick(oth);
    // an artist trusts the players whose lines belong to the real picture
    const sus=oth.filter(x=>!d.sk.some(([t,e])=>t===x&&p2FkReal(d,e)));return p2Pick(sus.length&&(lv===3||Math.random()<.6)?sus:oth);},
  botDelay:(d,s,lv)=>d.ph==='draw'?1800+rnd(1500):BOTMS[lv]+rnd(2500),
  // the pad: one line per turn, kept on this phone until it is confirmed
  after(d,ctx){const pad=document.getElementById('p2pad');if(!pad||pad._on||d.ph!=='draw')return;pad._on=1;
    const pt=e=>{const r=pad.getBoundingClientRect();return [Math.max(0,Math.min(62,Math.round((e.clientX-r.left)/r.width*63))),Math.max(0,Math.min(62,Math.round((e.clientY-r.top)/r.height*63)))];};
    let cur=null,el=null;
    pad.addEventListener('pointerdown',e=>{e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch(x){}S.holdRender=true;cur=[pt(e)];
      for(const o of pad.querySelectorAll('.p2cur'))o.remove();el=document.createElementNS('http://www.w3.org/2000/svg','polyline');el.setAttribute('class','p2cur');el.setAttribute('fill','none');
      el.setAttribute('stroke',col(S.st.d,S.st.d.turn));el.setAttribute('stroke-width','1.7');el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');el.setAttribute('points',cur.map(p=>p.join(',')).join(' '));pad.appendChild(el);});
    pad.addEventListener('pointermove',e=>{if(!cur)return;const p=pt(e),l=cur[cur.length-1];if(p[0]===l[0]&&p[1]===l[1])return;if(cur.length>=60)return;cur.push(p);el.setAttribute('points',cur.map(q=>q.join(',')).join(' '));});
    const end=()=>{if(!cur)return;const p=p2FkThin(cur).slice(0,50);cur=null;el=null;S.draft.p2fs=p2FkEnc(p);S.holdRender=false;render();};
    pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);}};
HELP.p_fake='كل واحد يشوف بطاقته بالسر: الكل يعرف الكلمة (شمس، بيت، سيارة…) إلا واحد «الرسام المزيف» يعرف نوعها بس. بالدور كل واحد يضيف خط واحد للرسمة بدون ما يرفع إصبعه، دورتين. لا ترسم واضح مرة عشان المزيف ما يفهم، ولا غامض مرة عشان ما يشكون فيك! بعدها تصوّتون بالسر: مين المزيف؟ إذا ما انكشف المزيف يفوز. وإذا انكشف عنده فرصة أخيرة: يختار الكلمة من ثمان، لو عرفها يفوز، وإلا يفوز الرسامين كلهم. من 3 لاعبين وفوق.';

/* =====================================================================================================
   توقع الأغلبية (p_major): a question with 3 or 4 answers. Everyone gives their own answer AND predicts the answer
   most of the group gave, with a confidence of 1 to 3. Right prediction: + confidence. Wrong: − (confidence − 1).
   ===================================================================================================== */
const P2MJQ=['وش أحسن وقت للكشتة؟|الشتاء:6,الربيع:4,الخريف:2,الصيف:1','وش أفضل أكلة للعزيمة؟|كبسة:6,مندي:5,مشاوي:3,مضغوط:2','وش تشرب مع الفطور؟|شاي:5,قهوة:4,حليب:2,عصير:3','وين تفضل تقضي الإجازة؟|البحر:4,الجبل:3,برّا السعودية:5,البيت:2','وش أحلى حلا؟|كنافة:4,تشيز كيك:4,لقيمات:4,آيس كريم:3','وش أكثر شي ينسى بالبيت؟|الجوال:3,المفاتيح:5,المحفظة:3,الشاحن:4','وش أفضل لعبة جماعية؟|بلوت:6,كيرم:3,ألعاب فيديو:4,شطرنج:1','متى تصحى بالإجازة؟|قبل 8:2,من 8 لـ 10:3,الظهر:5,العصر:2','وش أحسن مشروب بالشتاء؟|كرك:5,سحلب:3,قهوة:4,شوكولاتة حارة:3','وش الفاكهة المفضلة؟|مانجو:5,حبحب:4,عنب:3,فراولة:4','وش تطلب من المطعم؟|برجر:5,بيتزا:4,شاورما:5,سلطة:1','وين أحسن طلعة مع الربع؟|مقهى:5,استراحة:5,مول:3,البر:4','عندك يوم إجازة زيادة، وش تسوي؟|أنام:5,أطلع مع أهلي:4,أسافر:3,ألعب:3','وش أحلى فصل بالسنة؟|الشتاء:6,الربيع:4,الخريف:2,الصيف:1','كم مرة تشيك على جوالك بالساعة؟|مرة:1,من 2 لـ 5:3,أكثر من 5:5,ما أعد:4','وش أفضل وسيلة سفر؟|طيارة:6,سيارة:4,قطار:3,سفينة:1','وش أكثر شي يزعجك بالطريق؟|الزحمة:6,التحويلات:3,المطبات:3,اللي يقطع الإشارة:4','وش فطورك المفضل؟|فول وتميس:5,بيض:4,فطاير:3,شكشوكة:3','أي حيوان تربيه؟|قطة:5,طيور:3,سمك:3,حصان:2','وش أحسن نكهة آيس كريم؟|فانيلا:4,شوكولاتة:5,فراولة:3,مانجو:2','وش تسوي إذا ملّيت؟|الجوال:6,أنام:4,أطلع:3,آكل:3','وين تحب تجلس بالبيت؟|غرفتي:5,المجلس:3,الصالة:4,المطبخ:1','وش أحسن هدية؟|فلوس:5,عطر:4,ساعة:3,جوال:4','وش تقدر تقعد بدونه أطول؟|الجوال:2,القهوة:3,الحلا:4,التلفزيون:5','وش أحسن مكان بالسعودية بالصيف؟|أبها:6,الطائف:4,الباحة:3,العلا:2','أي رياضة تحب تتفرج عليها؟|كورة:7,سباقات:2,تنس:1,سلة:2','البحر ولا البر؟|البحر:4,البر:5,الاثنين:3','وش تاكل بالسينما؟|فشار:7,ناتشوز:3,حلاو:2,ما آكل:1','متى تبدأ تذاكر للاختبار؟|قبله بأسبوع:3,قبله بيومين:4,الليلة اللي قبله:5,ما أذاكر:1','وش أحلى لون للسيارة؟|أبيض:6,أسود:5,رمادي:3,أحمر:2','أي وجبة أهم؟|الفطور:4,الغدا:5,العشا:3','كيف تحب تتواصل؟|رسالة:5,اتصال:3,رسالة صوتية:4,أشوفه:2','وش أول شي تسويه إذا صحيت؟|أشيك الجوال:6,أغسل وجهي:3,أشرب قهوة:3,أرجع أنام:2','وش أحلى ريحة؟|المطر:5,البخور:5,القهوة:4,الخبز الحار:3','وش أحسن وقت للمشي؟|الصبح:3,العصر:3,بعد المغرب:6,الليل:3','لو خيّروك بقوة خارقة؟|الطيران:6,الاختفاء:4,قراءة الأفكار:3,السرعة:2'].map(x=>{const [q,o]=x.split('|');const op=o.split(',').map(t=>{const k=t.lastIndexOf(':');return [t.slice(0,k),+t.slice(k+1)];});return {q,o:op.map(p=>p[0]),w:op.map(p=>p[1])};});
const p2MjDec=p=>Number.isInteger(p)&&p>=0?{o:Math.floor(p/100),p:Math.floor(p/10)%10,c:p%10}:null;
const p2MjOk=(d,p)=>{const x=p2MjDec(p),n=P2MJQ[d.qi]?P2MJQ[d.qi].o.length:0;return !!x&&x.o<n&&x.p<n&&x.c>=1&&x.c<=3;};
const p2MjWPick=w=>{let t=w.reduce((a,b)=>a+b,0)*Math.random();for(let i=0;i<w.length;i++){t-=w[i];if(t<0)return i;}return w.length-1;};
function p2MjQ(d){return {...d,ph:'vote',qi:p2Fresh('mj',P2MJQ.length),rd:d.rd+1,pk:null,cnt:null,mj:[]};}
GAMES.p_major={name:'توقع الأغلبية',cat:'party',lbc:'#1F618D',minP:3,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2874A6"/><rect x="14" y="56" width="16" height="28" rx="3" fill="#AED6F1"/><rect x="36" y="26" width="16" height="58" rx="3" fill="#F4D03F"/><rect x="58" y="44" width="16" height="40" rx="3" fill="#AED6F1"/><path d="M44 8l3.5 7 7.5 1-5.5 5.3 1.3 7.7L44 25.4 37.2 29l1.3-7.7L33 16l7.5-1z" fill="#fff"/><circle cx="82" cy="30" r="10" fill="#fff"/><text x="82" y="35" font-size="14" font-weight="900" text-anchor="middle" fill="#2874A6">؟</text></svg>`,
  init:n=>({ph:'vote',r:0,R:8,qi:0,rd:0,pk:null,cnt:null,mj:[],pts:Array(n).fill(0),res:'',last:''}),
  start:d=>p2MjQ(d),
  simulNow:d=>d.ph==='vote',
  points:p2Pts,winExtra:p2WinX,
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||p2MjOk(d,p.pick),
  net:{local:['mo','mp','mc'],ui:['p2mj']},
  viewer:d=>d.win==null&&d.ph==='vote'?simulViewer(d):null,coverMsg:d=>d.res||'',
  status(d,ctx){const s=d.res?`<small>${d.res}</small><br>`:'';return s+`<small>السؤال ${d.r+1} من ${d.R}</small><br>`+(d.ph==='vote'?'جوابك، وتوقعك لجواب الأغلبية':'وش قالت الأغلبية؟');},
  render(d,ctx){const v=ctx.v,Q=P2MJQ[d.qi];let h=`<div class="p2 p2-maj"><div class="p2-qcard" data-k="mj${d.r}"><b>${Q.q}</b></div>`;
    if(d.ph==='vote'){if(!ctx.my||v==null||v<0)return h+'<p class="note">ننتظر الكل…</p>'+p2Wait(d)+'</div>';
      const k=d.gid+':'+d.rd+':'+v;if(!S.p2mj||S.p2mj.k!==k)S.p2mj={k,o:-1,p:-1,c:2};const M=S.p2mj;
      h+=`<p class="p2-step"><b>١</b> جوابك أنت</p><div class="p2-opts">${Q.o.map((o,i)=>`<button class="${M.o===i?'on':''}" data-ga="mo" data-i="${i}">${o}</button>`).join('')}</div>`;
      h+=`<p class="p2-step"><b>٢</b> وش تتوقع أكثر جواب بينكم؟</p><div class="p2-opts maj">${Q.o.map((o,i)=>`<button class="${M.p===i?'on':''}" data-ga="mp" data-i="${i}">${o}</button>`).join('')}</div>`;
      h+=`<p class="p2-step"><b>٣</b> كم أنت واثق؟</p><div class="p2-conf">${[1,2,3].map(c=>`<button class="${M.c===c?'on':''}" data-ga="mc" data-i="${c}">${'🔥'.repeat(c)}<small>+${c} / −${c-1}</small></button>`).join('')}</div>`;
      return h+`<button class="big red" data-ga="msend" ${M.o>=0&&M.p>=0?'':'disabled'}>تم ✓</button></div>`;}
    const mx=Math.max(1,...d.cnt);h+=`<div class="p2-bars">${Q.o.map((o,i)=>`<div class="p2-bar ${d.mj.includes(i)?'top':''}"><b>${o}</b><span><i style="transform:scaleX(${(d.cnt[i]/mx).toFixed(3)})"></i></span><em>${d.cnt[i]}</em></div>`).join('')}</div>`;
    h+=`<ul class="p2-votes">${(d.pk||[]).map((x,s)=>x?`<li><b style="color:${col(d,s)}">${nm(d,s)}</b> جاوب ${Q.o[x.o]} وتوقع ${Q.o[x.p]} ${'🔥'.repeat(x.c)} <em class="${x.g>0?'ok':x.g<0?'no':''}">${x.g>0?'+'+x.g:x.g<0?x.g:'0'}</em></li>`:'').join('')}</ul>`;
    return h+p2Next(d,ctx,d.r+1>=d.R,'السؤال الجاي ←')+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(['mo','mp','mc'].includes(a)&&d.ph==='vote'&&S.p2mj){if(a==='mo')S.p2mj.o=i;if(a==='mp')S.p2mj.p=i;if(a==='mc'&&i>=1&&i<=3)S.p2mj.c=i;render();return;}
    if(a==='msend'&&d.ph==='vote'&&ctx.my&&S.p2mj&&S.p2mj.k===d.gid+':'+d.rd+':'+v){const M=S.p2mj;const p=M.o*100+M.p*10+M.c;if(!p2MjOk(d,p)){toast('اختر جوابك وتوقعك');return;}simulPick(d,v,p);return;}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(GAMES.p_major.next(d));}},
  next(d){const r=d.r+1;if(r>=d.R)return {...d,ph:'end',win:mostPts(d.pts)};return p2MjQ({...d,r});},
  resolve(d,picks){const Q=P2MJQ[d.qi];const cnt=Q.o.map(()=>0);const pk=picks.map(p=>p2MjOk(d,p)?p2MjDec(p):null);pk.forEach(x=>{if(x)cnt[x.o]++;});
    const mx=Math.max(...cnt);const mj=mx>0?cnt.map((c,i)=>c===mx?i:-1).filter(i=>i>=0):[];const P=[...d.pts];
    pk.forEach((x,s)=>{if(!x)return;x.g=mj.includes(x.p)?x.c:-(x.c-1);P[s]=Math.max(0,P[s]+x.g);});
    return {...d,ph:'show',pk,cnt,mj,pts:P,turn:p2Rot(d,d.r),ts:Date.now(),res:mj.length?`الأغلبية: ${mj.map(i=>Q.o[i]).join(' و')}`:'محد جاوب'};},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>12000)return GAMES.p_major.next(d);return null;},
  // a bot answers like people usually do; a hard one predicts the usual favourite and bets more when it is clear
  botPick(d,s,lv){const Q=P2MJQ[d.qi];const o=p2MjWPick(Q.w);let p,c;
    if(lv===1){p=rnd(Q.o.length);c=1+rnd(3);}else{const srt=Q.w.map((w,i)=>[w,i]).sort((a,b)=>b[0]-a[0]);p=lv===3||Math.random()<.6?srt[0][1]:p2Pick(Q.o.map((_,i)=>i));const gap=srt[0][0]-srt[1][0];c=lv===3?(gap>=2?3:gap>=1?2:1):1+rnd(2);}
    return o*100+p*10+c;},
  bot(d,s){if(d.ph==='show'&&d.turn===s)return GAMES.p_major.next(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?4500:BOTMS[lv]+rnd(2500)};
HELP.p_major='يطلع سؤال له 3 أو 4 أجوبة (مثل: وش أحلى فصل بالسنة؟). كل واحد بالسر يختار جوابه هو، وبعدها يتوقع وش الجواب اللي بيختاره أكثركم، ويحدد ثقته من 1 إلى 3 🔥. لو توقعك طلع جواب الأغلبية تاخذ نقاط بعدد ثقتك، ولو غلطت تنقص ثقتك ناقص واحد (ثقة 1 ما تخسر شي). ثمان أسئلة والأكثر نقاط يفوز. الفرق عن «لو خيروك»: هنا جوابك شي، وتوقعك للناس شي ثاني. من 3 لاعبين وفوق. مع الفرق: نقاط الفريق تنجمع.';

/* =====================================================================================================
   سؤال وجواب (p_qa): one player asks the group a question; everyone else answers in secret. The answers come back
   shuffled with no names, and the asker matches each answer to its writer. A right match: +1 for the asker.
   An answer the asker got wrong: +1 for whoever wrote it.
   ===================================================================================================== */
const P2QAQ=['وش أكلتك المفضلة؟|كبسة,مندي,بيتزا,برجر,مشاوي,سوشي,مقلوبة,جريش','لو عندك مليون ريال وش أول شي تشتريه؟|بيت,سيارة,رحلة,هدية لأهلي,مشروع صغير,ساعة,جوال جديد','وين تحب تسافر؟|اليابان,تركيا,المالديف,أبها,إيطاليا,ماليزيا,سويسرا','وش أكثر شي تخاف منه؟|الصراصير,الظلام,المرتفعات,الثعابين,البحر,الإبر','وش الوظيفة اللي حلمت فيها وأنت صغير؟|طيار,طبيب,شرطي,لاعب كورة,رائد فضاء,مهندس,معلم','وش أول شي تسويه بالإجازة؟|أنام,أسافر,أطلع مع الربع,ألعب,أزور أهلي','وش الحيوان اللي يشبهك؟|أسد,قطة,بومة,دلفين,نحلة,صقر,سلحفاة','وش أحلى ذكرى من طفولتك؟|العيد,الكشتة,المدرسة,بيت جدي,أول سيكل,رحلة البحر','لو تاكل أكلة وحدة طول عمرك وش تختار؟|كبسة,رز,بيتزا,تمر,شاورما,مندي','وش أغرب شي أكلته؟|جراد,سوشي,ضب,حلزون,روبيان,كبدة نية','وش الموهبة اللي تتمناها؟|الرسم,الطبخ,اللغات,الطيران,الرياضة,الإنشاد','وش أكثر شي يضحكك؟|المقالب,النكت,الأطفال,القطط,المواقف المحرجة','لو صرت مشهور وش بيكون السبب؟|الطبخ,الرياضة,الضحك,الذكاء,الرسم,السفر','وش أكثر شي تحبه بالشتاء؟|الكشتة,الشبة,المطر,الكرك,البطانية','وش أحلى اسم لقطة؟|لولو,سمسم,كرملة,بسبوسة,زعتر,مشمش','لو سيارتك لها اسم وش تسميها؟|البرق,الغزال,الصاروخ,العجوز,الوحش,الحمامة','وش أكثر شي تكرهه الصبح؟|المنبه,الزحمة,البرد,الدوام,الاستعجال','لو تصير حيوان يوم واحد وش تختار؟|صقر,دلفين,قطة,أسد,حصان,فيل','أول كلمة تجي ببالك إذا سمعت «صيف»؟|حر,بحر,سفر,مكيف,آيس كريم,إجازة','وش أكثر شي تشتريه من البقالة؟|عصير,شيبس,حليب,خبز,ماء,شوكولاتة','وش أحلى مدينة سعودية؟|أبها,جدة,الرياض,العلا,الطائف,الخبر','وش الشي اللي ما تطلع من البيت بدونه؟|الجوال,المحفظة,المفاتيح,الشماغ,الساعة,العطر','وش تسوي لو انقطعت الكهرباء؟|أنام,أطلع,أسولف مع أهلي,أدور شمعة,أشغل كشاف الجوال','لو كتبت كتاب وش بيكون عنوانه؟|قصة حياتي,مغامرات بالبر,كيف تنام بدري,أسرار الكبسة,يوميات طالب','وش أكثر شي تفتقده من أيام المدرسة؟|الفسحة,الربع,المقصف,الإجازات,الرحلات','وش أكثر شي تحب تسويه مع العايلة؟|نسافر,ناكل,نلعب,نسولف,نطلع البر','وش أحلى صوت تحبه؟|المطر,الموج,الأذان,ضحكة الأطفال,صوت الدلة','وش أكثر شي تأجله دايم؟|الرياضة,المذاكرة,ترتيب الغرفة,النوم,الحلاق'].map(x=>{const [q,a]=x.split('|');return {q,a:a.split(',')};});
const P2QAG=['ما أدري والله','سؤال صعب!','يمكن… لا ما أدري','كل شي حلو','خلها مفاجأة','الله أعلم'];
const p2QaQ=d=>d.qc?d.qc:P2QAQ[d.q]?P2QAQ[d.q].q:'';
function p2QaAsk(d,k){let a=(d.st+k)%d.pl.length;for(let j=0;j<d.pl.length&&d.out[a]==='1';j++)a=(a+1)%d.pl.length;const qo=[];for(let j=0;j<3;j++)qo.push(p2Fresh('qa',P2QAQ.length,qo));return {...d,ph:'ask',k,a,turn:a,qo,q:-1,qc:'',an:[],ow:[],mt:[],res:k?d.res:''};}
const p2QaWriters=d=>aliveSeats(d).filter(s=>s!==d.a);
GAMES.p_qa={name:'سؤال وجواب',cat:'party',lbc:'#117864',teams:'none',minP:3,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#16A085"/><path d="M12 14h48a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H32l-12 10V48h-8a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="#fff"/><text x="36" y="40" font-size="24" font-weight="900" text-anchor="middle" fill="#16A085">؟</text><path d="M88 46H44a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h28l12 10V78h4a6 6 0 0 0 6-6V52a6 6 0 0 0-6-6z" fill="#F4D03F"/>${[52,62,72].map((x,k)=>`<circle cx="${x}" cy="64" r="4" fill="#117864"/>`).join('')}</svg>`,
  init:n=>({ph:'ask',k:0,K:n===3?6:n,a:0,qo:[],q:-1,qc:'',rd:0,an:[],ow:[],mt:[],pts:Array(n).fill(0),res:'',last:''}),
  start:d=>p2QaAsk(d,0),
  simulNow:d=>d.ph==='write',
  points:p2Pts,winExtra:p2WinX,
  // who wrote which answer stays with its writer until the reveal
  mask(d,seat){if(d.win!=null||d.ph==='show')return d;return {...d,ow:d.ow.map(x=>seat>=0&&x===seat?x:-1)};},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||p.pick===1||typeof p.pick==='string'&&p.pick.length>=1&&p.pick.length<=30,
  net:{local:['qsel'],ui:['p2qs']},
  viewer:d=>d.win!=null?null:d.ph==='write'?simulViewer(d):(d.ph==='ask'||d.ph==='match')&&!isBot(d,d.a)?d.a:null,
  coverMsg:d=>d.ph==='write'?`جاوب بالسر: ${p2QaQ(d)}`:d.ph==='match'?'دورك توزّع الأجوبة':'دورك تسأل',
  onSkip(nd){if(nd.win!=null)return nd;if(nd.out[nd.a]==='1')return GAMES.p_qa.next(nd);return nd;},
  onTimeout:d=>d.ph==='ask'?{...d,ph:'write',q:d.qo[0],rd:d.rd+1}:d.ph==='match'?GAMES.p_qa.score(d):d.ph==='show'?GAMES.p_qa.next(d):d,
  status(d,ctx){const me=!ctx.local&&ctx.v===d.a;const top=`<small>السائل ${d.k+1} من ${d.K}${d.res?' • '+d.res:''}</small><br>`;
    if(d.ph==='ask')return top+(me?'<b class="yt">اختر سؤالك للمجموعة</b>':`${nameTag(d,d.a)} يختار سؤال`);
    if(d.ph==='write')return top+'الكل يجاوب بالسر';if(d.ph==='match')return top+(me?'<b class="yt">مين كتب كل جواب؟</b>':`${nameTag(d,d.a)} يوزّع الأجوبة`);return top+'النتيجة';},
  render(d,ctx){const v=ctx.v;let h='<div class="p2 p2-qa">';const iA=(ctx.local||v===d.a)&&!isBot(d,d.a);
    h+=`<div class="p2-asker" style="--c:${col(d,d.a)}"><i>${shapeW(d.pl[d.a])}</i><b>${nm(d,d.a)}</b><small>يسأل</small></div>`;
    if(d.ph==='ask'){if(!iA)return h+'<p class="note">يختار سؤال…</p></div>';
      h+=`<div class="p2-stm">${d.qo.map(i=>`<button class="p2-st" data-ga="qq" data-i="${i}"><span>${P2QAQ[i].q}</span></button>`).join('')}</div>`;
      return h+`<p class="p2-lead small">أو اكتب سؤالك:</p><div class="p2-guess"><input class="field" data-draft="p2qc" data-enter="qc" maxlength="50" value="${escH(S.draft.p2qc||'')}" placeholder="سؤال للكل…" autocomplete="off"><button class="btn red" data-ga="qc">اسأل</button></div></div>`;}
    h+=`<div class="p2-qcard" data-k="qa${d.k}"><b>${escH(p2QaQ(d))}</b></div>`;
    if(d.ph==='write'){if(!ctx.my||v==null||v<0)return h+'<p class="note">ننتظر الأجوبة…</p>'+p2Wait(d)+'</div>';
      if(v===d.a)return h+`<p class="p2-lead small">الكل يجاوب الحين، وأنت بعدها تعرف مين كتب وش 🕵️</p><button class="btn soft wide" data-ga="ready">جاهز</button></div>`;
      return h+`<p class="p2-lead small">${nm(d,v)}، جوابك (محد بيعرف إنه لك):</p><div class="p2-guess"><input class="field" data-draft="p2qa${v}" data-enter="qa" maxlength="30" value="${escH(S.draft['p2qa'+v]||'')}" placeholder="جوابك…" autocomplete="off"><button class="btn red" data-ga="qa">أرسل</button></div></div>`;}
    const ws=p2QaWriters(d);const sel=S.p2qs!=null&&S.p2qs<d.an.length?S.p2qs:-1;const shown=d.ph==='show'||d.win!=null;
    h+=`<div class="p2-ansl">${d.an.map((t,k)=>{const m=d.mt[k],o=d.ow[k];const ok=shown&&m===o;
      return `<div class="p2-an ${sel===k&&iA&&!shown?'sel':''} ${shown?(ok?'ok':'no'):''}" data-k="an${d.k}_${k}"><${iA&&!shown?'button':'span'} class="p2-ant" ${iA&&!shown?`data-ga="qsel" data-i="${k}"`:''}>«${escH(t)}»</${iA&&!shown?'button':'span'}>
        <div class="p2-anw">${shown?`<i style="--c:${col(d,o)}">✍️ ${nm(d,o)}</i>${m>=0&&m!==o?`<i class="x" style="--c:${col(d,m)}">قال ${nm(d,m)}</i>`:''}`:m>=0?`<i style="--c:${col(d,m)}">${nm(d,m)}</i>`:'<i class="q">؟</i>'}</div></div>`;}).join('')}</div>`;
    if(d.ph==='match'){if(iA){h+=sel>=0?`<p class="p2-lead small">مين كتب «${escH(d.an[sel])}»؟</p><div class="p2-row">${ws.map(s=>`<button class="p2-who" style="--c:${col(d,s)}" data-ga="mt" data-i="${sel*8+s}">${nm(d,s)}</button>`).join('')}</div>`:'<p class="note">اضغط على جواب وبعدها على اللي تتوقعه كتبه</p>';
        h+=`<button class="big red" data-ga="done" ${d.mt.every(x=>x>=0)?'':'disabled'}>اكشف ✓</button>`;}
      else h+='<p class="note">يوزّع الأجوبة…</p>';}
    if(d.ph==='show')h+=p2Next(d,ctx,d.k+1>=d.K,'اللي بعده يسأل ←');
    return h+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;const iA=(ctx.local||v===d.a)&&!isBot(d,d.a);
    if(a==='qsel'){S.p2qs=i;render();return;}
    if(d.ph==='ask'&&iA){if(a==='qq'&&d.qo.includes(i)){act({...d,ph:'write',q:i,qc:'',rd:d.rd+1});return;}
      if(a==='qc'){const t=p2T(S.draft.p2qc,50);if(t.length<4){toast('اكتب سؤالك أول');return;}S.draft.p2qc='';act({...d,ph:'write',q:-1,qc:t,rd:d.rd+1});return;}}
    if(d.ph==='write'&&ctx.my){if(a==='ready'&&v===d.a){simulPick(d,v,1);return;}
      if(a==='qa'&&v!==d.a){const t=p2T(S.draft['p2qa'+v],30);if(!t){toast('اكتب جوابك');return;}delete S.draft['p2qa'+v];simulPick(d,v,t);return;}}
    if(d.ph==='match'&&iA){if(a==='mt'){const k=Math.floor(i/8),s=i%8;if(k>=d.an.length||!p2QaWriters(d).includes(s))return;const mt=d.mt.map((x,j)=>j===k?s:x===s?-1:x);S.p2qs=mt.indexOf(-1)>=0?mt.indexOf(-1):null;act({...d,mt});return;}
      if(a==='done'&&d.mt.every(x=>x>=0)){S.p2qs=null;act(GAMES.p_qa.score(d));return;}}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(GAMES.p_qa.next(d));}},
  score(d){const P=[...d.pts];let ok=0;d.an.forEach((_,k)=>{if(d.mt[k]===d.ow[k]){P[d.a]++;ok++;}else if(d.ow[k]>=0)P[d.ow[k]]++;});
    return {...d,ph:'show',pts:P,turn:d.a,ts:Date.now(),res:`${nm(d,d.a)} عرف ${ok} من ${d.an.length}`};},
  next(d){const k=d.k+1;if(k>=d.K)return {...d,ph:'end',win:mostPts(d.pts)};return p2QaAsk(d,k);},
  resolve(d,picks){const got=[];picks.forEach((p,s)=>{if(s!==d.a&&typeof p==='string'&&p.trim())got.push([s,p2T(p,30)]);});
    if(got.length<2)return GAMES.p_qa.next({...d,res:'ما وصل أجوبة كفاية'});const sh=p2Sh(got);
    return {...d,ph:'match',an:sh.map(x=>x[1]),ow:sh.map(x=>x[0]),mt:sh.map(()=>-1),turn:d.a};},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>12000)return GAMES.p_qa.next(d);return null;},
  botPick(d,s,lv){if(s===d.a)return 1;const Q=d.q>=0&&!d.qc?P2QAQ[d.q]:null;return Q?p2Pick(Q.a):p2Pick(P2QAG);},
  // a bot asker knows the answers bots like to give: those go to the bots, the rest to the people
  bot(d,s,lv){if(d.ph==='ask'&&d.a===s)return {...d,ph:'write',q:p2Pick(d.qo),qc:'',rd:d.rd+1};
    if(d.ph==='match'&&d.a===s){const ws=p2QaWriters(d);const Q=P2QAQ[d.q];const bank=k=>Q&&Q.a.includes(d.an[k])||P2QAG.includes(d.an[k]);
      let mt;if(lv===1)mt=p2Sh(ws).slice(0,d.an.length);else{const bs=p2Sh(ws.filter(x=>isBot(d,x))),hs=p2Sh(ws.filter(x=>!isBot(d,x)));mt=d.an.map(()=>-1);
        d.an.forEach((_,k)=>{if(lv===2&&Math.random()<.3)return;const pool=bank(k)?bs:hs;if(pool.length)mt[k]=pool.shift();});
        const rest=p2Sh(ws.filter(x=>!mt.includes(x)));mt=mt.map(x=>x>=0?x:rest.shift()??ws[0]);}
      return GAMES.p_qa.score({...d,mt});}
    if(d.ph==='show'&&d.turn===s)return GAMES.p_qa.next(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?4500:d.ph==='match'?3000:BOTMS[lv]+rnd(2500)};
HELP.p_qa='بالدور واحد يسأل المجموعة: يختار سؤال من ثلاث أو يكتب سؤاله. الباقين يجاوبون بالسر بكلمة أو جملة قصيرة. بعدها تطلع الأجوبة مخلوطة بدون أسماء، والسائل يحاول يعرف مين كتب كل جواب. كل جواب يعرف صاحبه ياخذ عليه السائل نقطة، وكل جواب يغلط فيه ياخذ صاحبه نقطة لأنه خدعه. على جوال واحد كل واحد يكتب جوابه لحاله والجوال يتمرر. من 3 لاعبين وفوق.';

/* =====================================================================================================
   المزاد (p_auction): mystery boxes are sold one by one in sealed bids. Everyone starts with 100 coins. Before each
   box one player (in turn) peeks inside. The highest bid pays and opens the box: coins, nothing, or a loss.
   The values in the boxes come from a list everyone knows. Most coins at the end wins.
   ===================================================================================================== */
const P2AUV=[-20,-10,0,5,10,15,20,25,30,40,50,60];
const P2AUB=[0,5,10,15,20,25,30,40,50,60,80,100,150];
const p2AuPk=(d,i)=>{let s=(d.st+i)%d.pl.length;for(let j=0;j<d.pl.length&&d.out[s]==='1';j++)s=(s+1)%d.pl.length;return s;};
const p2AuLeft=d=>{const left=[...P2AUV];d.bx.forEach((v,i)=>{if(i<d.i||(i===d.i&&d.ph==='show')){const k=left.indexOf(v);if(k>=0)left.splice(k,1);}});return left;};
const p2AuBox=v=>v>=40?'gold':v>=15?'good':v>0?'ok':v===0?'empty':'bad';
GAMES.p_auction={name:'المزاد',cat:'party',lbc:'#7E5109',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B9770E"/><rect x="12" y="44" width="46" height="40" rx="4" fill="#7E5109"/><rect x="12" y="44" width="46" height="12" fill="#A04000"/><rect x="31" y="44" width="8" height="40" fill="#F4D03F"/><text x="35" y="77" font-size="20" font-weight="900" text-anchor="middle" fill="#fff">؟</text><g transform="rotate(-35 70 34)"><rect x="56" y="22" width="30" height="14" rx="4" fill="#5D4037"/><rect x="68" y="36" width="6" height="34" rx="3" fill="#8D6E63"/></g><path d="M66 88h26" stroke="#5D4037" stroke-width="6" stroke-linecap="round"/><circle cx="80" cy="14" r="6" fill="#F4D03F"/></svg>`,
  init:n=>({ph:'bid',i:0,B:n<=4?8:10,bx:[],co:Array(n).fill(100),pk:0,rd:1,bids:null,wn:-1,last:'',res:''}),
  start(d){const bx=p2Sh(P2AUV).slice(0,d.B);return {...d,bx,pk:p2AuPk(d,0)};},
  simulNow:d=>d.ph==='bid',
  points:d=>d.co,
  winExtra:d=>'الفلوس: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.co[s]}`).join('، '),
  // what is in the boxes is the host's: only the peeker sees the box on sale, and an opened box is public
  mask(d,seat){if(d.win!=null)return d;return {...d,bx:d.bx.map((v,i)=>i<d.i||i===d.i&&(d.ph==='show'||seat>=0&&seat===d.pk&&d.ph==='bid')?v:-99)};},
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||p.rd!==d.rd||Number.isInteger(p.pick)&&p.pick>=0&&p.pick<=d.co[d.pl.indexOf(r)],
  net:{local:[]},
  viewer:d=>d.win==null&&d.ph==='bid'?simulViewer(d):null,coverMsg:d=>d.res||'',
  status(d,ctx){const s=d.res?`<small>${d.res}</small><br>`:'';return s+`<small>الصندوق ${d.i+1} من ${d.B} • 👁 ${nm(d,d.pk)} شاف داخله</small><br>`+(d.ph==='bid'?'زايدوا بالسر':'انفتح الصندوق');},
  render(d,ctx){const v=ctx.v;let h='<div class="p2 p2-auc">';
    h+=`<div class="p2-boxes">${d.bx.map((x,i)=>{const open=i<d.i||i===d.i&&d.ph==='show';return `<i class="${i===d.i?'now':''} ${open?'open '+p2AuBox(x):''}" data-k="bx${i}">${open?(x>0?'+'+x:x):i===d.i?'🎁':''}</i>`;}).join('')}</div>`;
    const left=p2AuLeft(d);h+=`<div class="p2-left"><small>القيم الباقية بالصناديق</small><span>${left.map(x=>`<b class="${p2AuBox(x)}">${x>0?'+'+x:x}</b>`).join('')}</span></div>`;
    if(d.ph==='bid'){const peek=v!=null&&v>=0&&v===d.pk&&d.bx[d.i]!=null&&d.bx[d.i]>-99;
      h+=`<div class="p2-bigbox ${peek?'peek '+p2AuBox(d.bx[d.i]):''}"><span>🎁</span>${peek?`<b>داخله: ${d.bx[d.i]>0?'+'+d.bx[d.i]:d.bx[d.i]}</b><small>أنت بس تشوفه 🤫</small>`:`<small>${nm(d,d.pk)} شاف داخله</small>`}</div>`;
      if(!ctx.my||v==null||v<0)return h+'<p class="note">ننتظر المزايدات…</p>'+p2Wait(d)+'</div>';
      return h+`<p class="p2-lead small">${nm(d,v)}، معك <b>${d.co[v]}</b> 🪙. كم تزايد؟</p><div class="p2-bids au">${P2AUB.filter(b=>b<=d.co[v]).map(b=>`<button data-ga="bid" data-i="${b}"><b>${b||'ما أبي'}</b></button>`).join('')}${P2AUB.includes(d.co[v])||d.co[v]<=0?'':`<button data-ga="bid" data-i="${d.co[v]}"><b>${d.co[v]}</b><small>كل اللي معي</small></button>`}</div></div>`;}
    const x=d.bx[d.i];h+=`<div class="p2-bigbox open ${p2AuBox(x)}"><span>📦</span><b>${x>0?'+'+x:x} 🪙</b><small>${d.wn>=0?`راح لـ ${nm(d,d.wn)} بـ ${d.bids[d.wn]}`:'محد زايد عليه'}</small></div>`;
    h+=`<ul class="p2-votes">${(d.bids||[]).map((b,s)=>b>=0?`<li><b style="color:${col(d,s)}">${nm(d,s)}</b> زايد ${b}${s===d.wn?' 🏆':''}</li>`:'').join('')}</ul>`;
    return h+p2Next(d,ctx,d.i+1>=d.B,'الصندوق الجاي ←')+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;if(a==='bid'&&d.ph==='bid'&&ctx.my&&Number.isInteger(i)&&i>=0&&i<=d.co[v]){simulPick(d,v,i);return;}
    if(a==='next'&&d.ph==='show'&&(ctx.local||v===d.turn)){act(GAMES.p_auction.next(d));}},
  next(d){const i=d.i+1;if(i>=d.B)return {...d,ph:'end',win:mostPts(d.co)};return {...d,i,ph:'bid',pk:p2AuPk(d,i),rd:d.rd+1,bids:null,wn:-1};},
  // the highest bid wins; a tie goes to the one with fewer coins, then to the first after the peeker
  resolve(d,picks){const bids=picks.map((p,s)=>Number.isInteger(p)&&p>=0&&p<=d.co[s]?p:-1);const mx=Math.max(...bids);const co=[...d.co];let wn=-1;const x=d.bx[d.i];
    if(mx>0){const top=bids.map((b,s)=>b===mx?s:-1).filter(s=>s>=0);const ord=[...Array(d.pl.length).keys()].map(k=>(d.pk+1+k)%d.pl.length);
      top.sort((a,b)=>co[a]-co[b]||ord.indexOf(a)-ord.indexOf(b));wn=top[0];co[wn]=Math.max(0,co[wn]-mx+x);}
    return {...d,ph:'show',bids,wn,co,turn:wn>=0?wn:p2Rot(d,d.i),ts:Date.now(),res:wn>=0?`${nm(d,wn)} فاز بالصندوق (${x>0?'+'+x:x})`:'محد زايد'};},
  host(d){if(d.ph==='show'&&Date.now()-d.ts>10000)return GAMES.p_auction.next(d);return null;},
  // a hard bot counts the values that are left; the one who peeked bids on what it saw
  botPick(d,s,lv){const co=d.co[s];const left=p2AuLeft(d);const ev=left.reduce((a,b)=>a+b,0)/Math.max(1,left.length);const peek=s===d.pk&&d.bx[d.i]>-99?d.bx[d.i]:null;
    let want;if(lv===1)want=Math.random()<.3?0:rnd(Math.max(1,Math.min(co,40)));
    else if(peek!=null)want=peek>0?Math.round(peek*(lv===3?.7:.55)):0;
    else want=Math.max(0,Math.round(ev*(lv===3?.6:.5)+(rnd(9)-4)));
    want=Math.min(co,want);const b=[...P2AUB,co].filter(x=>x<=co&&x<=want).sort((a,b)=>b-a)[0];return b==null?0:b;},
  bot(d,s){if(d.ph==='show'&&d.turn===s)return GAMES.p_auction.next(d);return d;},
  botDelay:(d,s,lv)=>d.ph==='show'?4500:BOTMS[lv]+rnd(2500)};
HELP.p_auction='كل واحد يبدأ بـ 100 عملة 🪙. فيه صناديق سرية تنباع واحد ورا الثاني، وداخل كل صندوق قيمة من قائمة معروفة للكل (من −20 إلى +60، والقيم اللي باقية تطلع فوق). قبل كل صندوق واحد بالدور يشوف داخله بالسر. الكل يزايد بالسر بنفس الوقت: أعلى مزايدة تدفع مزايدتها وتاخذ الصندوق بقيمته (ممكن تخسر لو طلع فاضي أو بالسالب). لو تعادلت المزايدات ياخذه اللي فلوسه أقل. بعد آخر صندوق، أكثر واحد عنده فلوس يفوز. راقب مين شاف الصندوق وكم يزايد! مع الفرق: فلوس الفريق تنجمع.';

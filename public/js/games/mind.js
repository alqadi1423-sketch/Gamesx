'use strict';
/* thinking and guessing: guess the word, guess the number, matchsticks, code breaker, do not say 31 */

/* ---------- guess the word ---------- */
const WORDS={
  'حيوان':['جمل','حصان','غزال','ثعلب','نمر','فيل','خروف','قنفذ','تمساح','دلفين','صقر','نسر','حمار','قرد','ثور','سنجاب','طاووس','كلب','قط','دب','فهد','ضبع','وشق','ماعز','حوت','قرش','سمك','بطريق','نعام','ضفدع','عقرب','ثعبان','حمام','عصفور','بلبل','غراب','هدهد','نحل','نمل','جراد','كنغر','باندا','كوالا','حلزون','خفاش'],
  'فاكهة أو خضار':['برتقال','تفاح','موز','عنب','رمان','بطيخ','خيار','طماطم','جزر','بصل','ليمون','مشمش','تمر','كيوي','توت','تين','خوخ','مانجو','شمام','كرز','بطاطس','باذنجان','فلفل','كوسا','ثوم','خس','ملفوف','قرنبيط','فجل','بقدونس','نعناع','سبانخ','فطر','زيتون','برقوق','يوسفي','ليم'],
  'دولة':['مصر','اليمن','عمان','قطر','الكويت','البحرين','السودان','لبنان','سوريا','تونس','المغرب','العراق','اليابان','الصين','فرنسا','تركيا','البرازيل','كندا','روسيا','ليبيا','موريتانيا','الصومال','باكستان','ماليزيا','تايلاند','الفلبين','المكسيك','تشيلي','كولومبيا','بيرو','البرتغال','هولندا','بلجيكا','سويسرا','النمسا','السويد','النرويج','فنلندا','الدنمارك','بولندا','اليونان','كوريا','فيتنام','نيبال','كينيا','نيجيريا','غانا','السنغال','الهند'],
  'مدينة':['الرياض','الدمام','دبي','بغداد','دمشق','بيروت','تبوك','نجران','الخبر','ينبع','جازان','القصيم','سكاكا','عرعر','الجبيل','القطيف','الخرج','رابغ','العلا','الرباط','مسقط','الخرطوم','طرابلس','لندن','باريس','روما','مدريد','برلين','موسكو','طوكيو','بكين','سيول','دلهي','نيويورك','تورنتو','سيدني','حلب','الموصل','حمص','صيدا'],
  'شيء في البيت':['كرسي','مفتاح','قلم','كتاب','شباك','فنجان','حاسوب','سرير','مكتب','صحن','دفتر','تلفون','فرن','مكيف','تلفزيون','كنب','دولاب','خلاط','ترمس','سكين','مقص','سجاد','شاحن','ريموت','سخان','كوب','باب','درج','سلم','مطبخ','مجلس','صالون','مفرش','صابون','شامبو','مشط','جوال','راديو'],
  'مهنة':['طبيب','مهندس','معلم','طيار','نجار','خباز','طباخ','حلاق','ممرض','صيدلي','مزارع','صياد','رسام','مصور','مذيع','سواق','سباك','مبرمج','محاسب','قاضي','جندي','شرطي','حارس','مترجم','صحفي','محامي','دكتور','مدرس','ميكانيكي']
};
const ALPHA='ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
GAMES.word={name:'خمّن الكلمة',cat:'mind',lbc:'#3E7C59',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#58A777"/>${[0,1,2,3].map(k=>`<rect x="${10+k*21}" y="34" width="17" height="24" rx="4" fill="#fff"/><rect x="${10+k*21}" y="58" width="17" height="4" fill="#2D4763"/>`).join('')}<text x="39" y="53" font-size="17" font-weight="800" fill="#2D4763" text-anchor="middle">م</text><text x="81" y="53" font-size="17" font-weight="800" fill="#2D4763" text-anchor="middle">ج</text></svg>`,
  init:n=>{const cats=Object.keys(WORDS);const cat=cats[rnd(cats.length)];const list=WORDS[cat];return {cat,w:list[rnd(list.length)],g:'',pts:Array(n).fill(0),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>`الكلمة: ${d.w}`,
  render(d,ctx){
    return `<p class="lbl">التصنيف: ${d.cat}</p><div class="wordbox">${[...d.w].map(ch=>`<div class="wl">${d.g.includes(ch)||d.win!=null?ch:''}</div>`).join('')}</div>
    <div class="kb">${[...ALPHA].map(ch=>`<button class="key" data-ga="k" data-i="${ALPHA.indexOf(ch)}" ${ctx.my&&!d.g.includes(ch)?'':'disabled'} style="${d.g.includes(ch)?(d.w.includes(ch)?'background:#d8f3e0':'background:#fbd5d1'):''}">${ch}</button>`).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const ch=ALPHA[i];if(d.g.includes(ch))return;const t=d.turn;const g=d.g+ch;const k=[...d.w].filter(x=>x===ch).length;const pts=[...d.pts];pts[t]+=k;
    const done=[...d.w].every(x=>g.includes(x));
    act({...d,g,pts,win:done?mostPts(pts):null,turn:k?t:nextSeat(d,t),last:k?`${nm(d,t)} اختار «${ch}» وموجود ${k} مرة`:`${nm(d,t)} اختار «${ch}» ومو موجود`});
  }
};

/* ---------- guess the number ---------- */
GAMES.num={name:'خمّن الرقم',cat:'mind',lbc:'#6B4FA0',
  icon:iconE('#8C6CC4','🔢'),
  init:()=>({sec:1+rnd(100),lo:1,hi:100,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>الرقم السري بين ${d.lo} و ${d.hi}</small>`,
  winExtra:d=>`الرقم كان ${d.sec}`,
  render(d,ctx){let s='<div class="cellgrid" style="grid-template-columns:repeat(10,minmax(0,1fr));background:#6B4FA0;gap:3px">';
    for(let n=1;n<=100;n++){const ok=n>=d.lo&&n<=d.hi;s+=`<button class="cg" style="font-size:13px;${ok?'':'opacity:.25'};${d.win!=null&&n===d.sec?'background:#ffd84d':''}" data-ga="m" data-i="${n}" ${ctx.my&&ok?'':'disabled'}>${n}</button>`;}
    return s+'</div>';},
  click(a,n,d,ctx){
    if(!ctx.my||n<d.lo||n>d.hi)return;const t=d.turn;
    if(n===d.sec){act({...d,win:t,last:`${nm(d,t)} قال ${n} وصاب!`});return;}
    const big=n<d.sec;act({...d,lo:big?n+1:d.lo,hi:big?d.hi:n-1,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${n}، الرقم ${big?'أكبر':'أصغر'}`});
  }
};

/* ---------- matchsticks ---------- */
GAMES.nim={name:'أعواد الكبريت',cat:'mind',lbc:'#9C4A2F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9673F"/>${[0,1,2,3,4].map(k=>`<rect x="${20+k*13}" y="22" width="7" height="56" rx="3.5" fill="#E8C38E" transform="rotate(${(k-2)*5} 50 50)"/><rect x="${19+k*13}" y="18" width="9" height="13" rx="4.5" fill="#E8574E" transform="rotate(${(k-2)*5} 50 50)"/>`).join('')}</svg>`,
  init:n=>{const k=Math.min(3+Math.floor(n/2),7);return {p:Array(k).fill(0).map(()=>3+rnd(5)),last:''};},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){return `<div class="piles">${d.p.map((n,pi)=>`<div class="pilecard ${n?'':'empty'}"><span class="pn">${pi+1}</span><div class="sticks">${n?Array(n).fill(0).map((_,j)=>`<button class="match" data-ga="m" data-i="${pi*100+j}" ${ctx.my?'':'disabled'} aria-label="خذ ${n-j}"></button>`).join(''):'<span class="note">فاضية</span>'}</div><b class="pc2">${n}</b></div>`).join('')}</div>${ctx.my?'':''}`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const pi=Math.floor(i/100),j=i%100;if(j>=d.p[pi])return;const t=d.turn;const take=d.p[pi]-j;const p=[...d.p];p[pi]=j;
    const empty=p.every(x=>x===0);act({...d,p,win:empty?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} أخذ ${take} من الكومة ${pi+1}`});
  }
};

/* ---------- code breaker ---------- */
const MMC=['#E5483F','#3D8FD8','#3FAE5C','#F0B429','#9C7BD6','#F2874B'];
const mmScore=(code,g)=>{let b=0,w=0;const cc={},gc={};for(let k=0;k<4;k++){if(code[k]===g[k])b++;else{cc[code[k]]=(cc[code[k]]||0)+1;gc[g[k]]=(gc[g[k]]||0)+1;}}for(const k in gc)w+=Math.min(gc[k],cc[k]||0);return [b,w];};
const pegs=(g)=>[...g].map(c=>`<span class="peg" style="background:${MMC[+c]}"></span>`).join('');
GAMES.mm={name:'كسر الشفرة',cat:'mind',lbc:'#2D4763',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F5D80"/>${[0,1,2].map(r=>[0,1,2,3].map(c=>`<circle cx="${20+c*17}" cy="${28+r*22}" r="7" fill="${MMC[(r*2+c*3)%6]}" stroke="#fff" stroke-width="2"/>`).join('')+`<circle cx="88" cy="${24+r*22}" r="3" fill="#fff"/><circle cx="88" cy="${33+r*22}" r="3" fill="#1d2f44"/>`).join('')}</svg>`,
  init:()=>({code:Array(4).fill(0).map(()=>rnd(6)).join(''),h:[],last:''}),
  status:(d,ctx)=>{const x=d.h[d.h.length-1];if(!x)return turnTxt(d,ctx);const [b,w]=mmScore(d.code,x.g);return `<small>${nm(d,x.s)}: ${b} بمكانها و${w} بغير مكانها</small><br>`+turnTxt(d,ctx);},
  winExtra:()=>'الشفرة ظاهرة تحت',
  render(d,ctx){S.mm=S.mm||[];
    const fb=(b,w)=>`<span class="fb">${Array(4).fill(0).map((_,k)=>`<i class="${k<b?'b':k<b+w?'w':''}"></i>`).join('')}</span>`;
    let s=`<div class="mmb">`;
    s+=`<div class="mmr code">${d.win!=null?pegs(d.code):'<span class="peg pq">؟</span>'.repeat(4)}<span class="fbl">الشفرة</span></div>`;
    s+=`<div class="mmh">${d.h.length?d.h.map(x=>{const [b,w]=mmScore(d.code,x.g);return `<div class="mmr"><i class="who" style="background:${col(d,x.s)}"></i>${pegs(x.g)}${fb(b,w)}</div>`;}).join(''):'<p class="mme">ما فيه محاولات للحين</p>'}</div>`;
    if(ctx.my)s+=`<div class="mmr cur"><i class="who" style="background:${col(d,d.turn)}"></i>${[0,1,2,3].map(k=>S.mm[k]!=null?`<span class="peg" style="background:${MMC[S.mm[k]]}"></span>`:'<span class="peg e"></span>').join('')}<span class="fb"></span></div>`;
    s+='</div>';
    if(ctx.my)s+=`<div class="mmpal">${MMC.map((c,k)=>`<button class="peg pbig" style="background:${c}" data-ga="add" data-i="${k}" ${S.mm.length>=4?'disabled':''} aria-label="لون"></button>`).join('')}</div>
      <div class="acts"><button class="btn navy" data-ga="clr" ${S.mm.length?'':'disabled'}>مسح</button><button class="btn red" data-ga="go" ${S.mm.length===4?'':'disabled'}>جرّب</button></div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;S.mm=S.mm||[];
    if(a==='add'){if(S.mm.length<4)S.mm.push(i);render();return;}
    if(a==='clr'){S.mm=[];render();return;}
    if(S.mm.length!==4)return;const g=S.mm.join('');S.mm=[];const t=d.turn;const [b]=mmScore(d.code,g);
    act({...d,h:[...d.h,{s:t,g}].slice(-30),win:b===4?t:null,turn:nextSeat(d,t)});
  }
};

/* ---------- do not say 31 ---------- */
GAMES.c31={name:'لا تقول 31',cat:'mind',lbc:'#C0392B',
  icon:iconE('#E35D4F','31','rgba(255,255,255,.25)').replace('font-size="40"','font-size="34" font-weight="800" fill="#fff"'),
  init:n=>({n:0,tgt:n>4?41:31,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){return `<div class="big-num" style="font-size:80px;color:${col(d,d.turn)}">${d.n}</div><p class="lbl" style="text-align:center">اللي يقول ${d.tgt} يخسر</p>
    <div class="row">${[1,2,3].map(k=>`<button class="btn" style="background:${col(d,d.turn)}" data-ga="m" data-i="${k}" ${ctx.my&&d.n+k<=d.tgt?'':'disabled'}><span class="ltr">+${k}</span></button>`).join('')}</div>`;},
  click(a,k,d,ctx){
    if(!ctx.my||d.n+k>d.tgt)return;const t=d.turn,n=d.n+k;
    if(n<d.tgt){act({...d,n,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${n}`});return;}
    const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);
    act({...d,n:0,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),last:`${nm(d,t)} وصل ${d.tgt} وطلع، والعدّ يبدأ من جديد`});
  }
};

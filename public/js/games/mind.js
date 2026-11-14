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
  // online, the other players see only the letters already found (the host checks each guess)
  mask:(d,seat)=>d.win!=null?d:{...d,w:[...d.w].map(ch=>d.g.includes(ch)?ch:'·').join('')},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>`الكلمة: ${d.w}`,
  // a tile turns over when its letter is found (a new node, so the flip plays once); at the end the missed letters show greyed
  render(d,ctx){const end=d.win!=null,W=[...d.w];
    return `<div class="gm gm-word"><p class="wcat"><span>التصنيف</span><b>${d.cat}</b></p><div class="wordbox" style="--n:${W.length}">${W.map(ch=>{const o=d.g.includes(ch),sh=o||end;return `<div class="wl ${o?'on':sh?'miss':''}" data-k="${sh?'o':''}">${sh?ch:''}</div>`;}).join('')}</div>
    <div class="kb">${[...ALPHA].map((ch,i)=>{const u=d.g.includes(ch);return `<button class="key ${u?(d.w.includes(ch)?'hit':'miss'):''}" data-ga="k" data-i="${i}" ${ctx.my&&!u?'':'disabled'}>${ch}</button>`;}).join('')}</div></div>`;},
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
  hide:{all:['sec']},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>الرقم السري بين ${d.lo} و ${d.hi}</small>`,
  winExtra:d=>`الرقم كان ${d.sec}`,
  // the window still open is drawn as a bar; the two numbers just outside it were guesses, so they keep a mark
  render(d,ctx){const end=d.win!=null,L=d.lo,H=d.hi;
    let s=`<div class="gm gm-num"><div class="nrng"><b class="ltr">${L}</b><div class="nbar"><i style="inset-inline-start:${L-1}%;width:${H-L+1}%"></i></div><b class="ltr">${H}</b></div><div class="ngrid">`;
    for(let n=1;n<=100;n++){const ok=n>=L&&n<=H;const c=end&&n===d.sec?'sec':ok?'':n===L-1?'out gs up':n===H+1?'out gs dn':'out';s+=`<button class="nc ${c}" data-ga="m" data-i="${n}" ${ctx.my&&ok?'':'disabled'}>${n}</button>`;}
    return s+'</div></div>';},
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
  // client side only (S.nimH, never in d): the piles as they were before the last move, so the sticks just taken
  // show as burnt ghosts, and the most each pile held, so earlier removals leave faint outlines
  render(d,ctx){let h=S.nimH;if(!h||h.gid!==d.gid)h=S.nimH={gid:d.gid,p:d.p.join(),lp:[...d.p],mx:[...d.p]};
    if(h.p!==d.p.join()){h.lp=h.p.split(',').map(Number);h.p=d.p.join();h.mx=h.mx.map((m,i)=>Math.max(m,d.p[i]||0));}
    return `<div class="gm gm-nim"><div class="piles">${d.p.map((n,pi)=>{const tk=Math.max(0,(h.lp[pi]||0)-n),gone=Math.max(0,(h.mx[pi]||0)-n-tk);
      return `<div class="pilecard ${n?'':'empty'} ${tk?'lm':''}"><span class="pn">${pi+1}</span><div class="sticks">${Array(n).fill(0).map((_,j)=>`<button class="match" data-ga="m" data-i="${pi*100+j}" ${ctx.my?'':'disabled'} aria-label="خذ ${n-j}"></button>`).join('')}${'<i class="mg tk"></i>'.repeat(tk)}${'<i class="mg"></i>'.repeat(gone)}${n||tk||gone?'':'<span class="note">فاضية</span>'}</div><b class="pc2">${n}</b></div>`;}).join('')}</div></div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const pi=Math.floor(i/100),j=i%100;if(j>=d.p[pi])return;const t=d.turn;const take=d.p[pi]-j;const p=[...d.p];p[pi]=j;
    const empty=p.every(x=>x===0);act({...d,p,win:empty?t:null,turn:nextSeat(d,t),last:`${nm(d,t)} أخذ ${take} من الكومة ${pi+1}`});
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
GAMES.c31={name:'لا تقول 31',cat:'mind',lbc:'#C0392B',
  icon:iconE('#E35D4F','31','rgba(255,255,255,.25)').replace('font-size="40"','font-size="34" font-weight="800" fill="#fff"'),
  init:n=>({n:0,tgt:n>4?41:31,last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  // a counter in the colour of the player on turn; each step shows the number it would say, the losing one in red
  render(d,ctx){return `<div class="gm gm-c31" style="--c:${col(d,d.turn)}"><div class="cdial"><b class="cnum ltr" data-k="${d.n}">${d.n}</b><div class="ctrack"><i style="width:${d.n/d.tgt*100}%"></i><u style="inset-inline-start:${(d.tgt-3)/d.tgt*100}%"></u></div><p class="lbl">اللي يقول ${d.tgt} يخسر</p></div>
    <div class="csteps">${[1,2,3].map(k=>`<button class="cstep ${d.n+k===d.tgt?'lose':''}" data-ga="m" data-i="${k}" ${ctx.my&&d.n+k<=d.tgt?'':'disabled'}><b class="ltr">+${k}</b><small class="ltr">${d.n+k<=d.tgt?d.n+k:'—'}</small></button>`).join('')}</div></div>`;},
  click(a,k,d,ctx){
    if(!ctx.my||d.n+k>d.tgt)return;const t=d.turn,n=d.n+k;
    if(n<d.tgt){act({...d,n,turn:nextSeat(d,t),last:`${nm(d,t)} قال ${n}`});return;}
    const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);
    act({...d,n:0,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),last:`${nm(d,t)} وصل ${d.tgt} وطلع، والعدّ يبدأ من جديد`});
  }
};

'use strict';
/* card war, lowest unique number, two thirds, ultimate X-O, proverbs, sequences, colour words, bomb wires, go fish, 99 */

const tbtn=(label,ga,i,on,extra)=>`<button class="btn ${extra||''}" data-ga="${ga}" data-i="${i}" ${on?'':'disabled'}>${label}</button>`;

/* ---------- card war (everyone holds 1 to 7, bid on a prize) ---------- */
GAMES.war={name:'حرب الأوراق',cat:'cards',lbc:'#3A5F8F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4F7FBF"/><rect x="14" y="26" width="30" height="44" rx="6" fill="#fff" transform="rotate(-14 29 48)"/><rect x="56" y="26" width="30" height="44" rx="6" fill="#fff" transform="rotate(14 71 48)"/><text x="29" y="56" font-size="20" font-weight="800" fill="#D43C33" text-anchor="middle" transform="rotate(-14 29 48)">7</text><text x="71" y="56" font-size="20" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(14 71 48)">5</text><text x="50" y="92" font-size="18" text-anchor="middle">⚔️</text></svg>`,
  init:n=>{const pr=1+rnd(7);return {rd:0,prize:pr,left:[1,2,3,4,5,6,7].filter(x=>x!==pr),pts:Array(n).fill(0),res:''};},
  privInit:()=>({used:[]}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)),
  winExtra:d=>d.res,
  render(d,ctx){if(d.win!=null)return '';const v=ctx.v;const p=v!=null&&v>=0?ctx.priv[d.pl[v]]:null;const used=(p&&p.used)||[];
    // the prize sits on the felt as a gold card (a new node each round, so it deals in), seven dots count the rounds
    return `<div class="gm gm-war">${pickedChips(d)}<div class="mtab wtab"><div class="wprize" data-k="p${d.rd}"><small>الجائزة</small><b class="ltr">${d.prize}</b></div>
    <div class="wrds"><span class="wrd">${[0,1,2,3,4,5,6].map(k=>`<i class="${k<d.rd?'done':k===d.rd?'on':''}"></i>`).join('')}</span><small>جولة ${d.rd+1} من 7</small></div></div>
    <div class="hand whand">${[1,2,3,4,5,6,7].map(c=>used.includes(c)?`<div class="card big wc dim">${c}</div>`:`<button class="card ${ctx.my?'pick':''} big wc" data-ga="m" data-i="${c}" ${ctx.my?'':'disabled'}>${c}</button>`).join('')}</div></div>`;},
  click(a,c,d,ctx){if(!ctx.my)return;const r=d.pl[ctx.v];const p=S.priv[r]||{used:[]};if((p.used||[]).includes(c))return;setPriv(r,{...p,gid:d.gid,used:[...(p.used||[]),c],rd:d.rd,pick:c});},
  resolve(d,picks){const pr=d.prize;const v=picks.map(x=>x==null?-1:x);const mx=Math.max(...v);const top=v.map((x,s)=>x===mx&&x>0?s:-1).filter(s=>s>=0);const pts=[...d.pts];
    if(top.length===1)pts[top[0]]+=pr;
    const res=`جائزة ${pr}: `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+(top.length===1?`، أخذها ${nm(d,top[0])}`:'، تعادل وراحت');
    const rd=d.rd+1;const nx=d.left.length?d.left[rnd(d.left.length)]:null;return {...d,pts,rd,res,prize:nx,left:d.left.filter(x=>x!==nx),win:rd>=7?mostPts(pts):null};}
};

/* ---------- lowest unique number ---------- */
GAMES.lowu={name:'أصغر رقم فريد',cat:'quiz',lbc:'#2E6F73',
  // its own picture (it used the same emoji as guess the number): number balls, the unique lowest one in gold
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E9298"/>${[[30,26,'2',0],[70,26,'2',0],[30,58,'3',0],[70,58,'1',1]].map(([x,y,t,g])=>`<circle cx="${x}" cy="${y+3}" r="15" fill="rgba(0,0,0,.18)"/><circle cx="${x}" cy="${y}" r="15" fill="${g?'#F0B429':'#fff'}"/><text x="${x}" y="${y+7}" font-size="20" font-weight="800" fill="${g?'#5A3B00':'#2E6F73'}" text-anchor="middle">${t}</text>`).join('')}</svg>`,
  init:n=>({rd:0,max:n>4?15:10,pts:Array(n).fill(0),res:'',rounds:8}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. أصغر رقم ما اختاره غيرك ياخذ نقطة</small><br>`),
  winExtra:d=>d.res,
  render(d,ctx){if(d.win!=null)return '';return `<div class="gm gm-lowu">${pickedChips(d)}<div class="lrds">${Array(d.rounds).fill(0).map((_,k)=>`<i class="${k<d.rd?'done':k===d.rd?'on':''}"></i>`).join('')}</div><div class="lgrid">${Array(d.max).fill(0).map((_,k)=>`<button class="lnum" data-ga="m" data-i="${k+1}" ${ctx.my?'':'disabled'}>${k+1}</button>`).join('')}</div></div>`;},
  click(a,k,d,ctx){if(!ctx.my)return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const cnt={};picks.forEach(x=>{if(x!=null)cnt[x]=(cnt[x]||0)+1;});const u=Object.keys(cnt).map(Number).filter(x=>cnt[x]===1).sort((a,b)=>a-b);const pts=[...d.pts];let w=-1;
    if(u.length){w=picks.indexOf(u[0]);pts[w]++;}
    const rd=d.rd+1;return {...d,pts,rd,res:d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+(w>=0?`. فاز ${nm(d,w)} بالرقم ${u[0]}`:'. ما فيه رقم فريد'),win:rd>=d.rounds?mostPts(pts):null};}
};

/* ---------- two thirds of the average ---------- */
GAMES.two3={name:'ثلثين المتوسط',cat:'quiz',lbc:'#5D4E9E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A69C4"/><text x="50" y="62" font-size="38" font-weight="800" fill="#fff" text-anchor="middle">⅔</text></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',rounds:6}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)),
  winExtra:d=>d.res,
  render(d,ctx){if(d.win!=null)return '';const v=+((S.draft||{}).t23??50);
    return `<div class="gm gm-two3">${pickedChips(d)}${ctx.my?`<div class="t3card"><span class="big-num ltr">${v}</span></div><div class="t3rng"><input type="range" class="t3r" min="0" max="100" value="${v}" data-draft="t23" style="--v:${v}"><div class="t3tk"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div><button class="btn red wide" data-ga="go">ثبّت رقمي</button>`:''}</div>`;},
  // the slider's filled part follows the thumb (core only updates the number)
  after(){const r=app.querySelector('.gm-two3 .t3r');if(r&&!r._t3){r._t3=1;r.addEventListener('input',()=>r.style.setProperty('--v',r.value));}},
  click(a,i,d,ctx){if(!ctx.my)return;const v=Math.max(0,Math.min(100,Math.round(+((S.draft||{}).t23??50))));delete S.draft.t23;simulPick(d,ctx.v,v);},
  resolve(d,picks){const vals=picks.filter(x=>x!=null);const sum=vals.reduce((a,b)=>a+b,0);const avg=vals.length?sum/vals.length:0;const tg=Math.round(avg*2/3*10)/10;
    const diff=picks.map(x=>x==null?Infinity:Math.abs(3*vals.length*x-2*sum));const mn=Math.min(...diff);const pts=[...d.pts];const w=[];diff.forEach((x,s)=>{if(x===mn&&isFinite(x)){pts[s]++;w.push(nm(d,s));}});
    const rd=d.rd+1;return {...d,pts,rd,res:`المتوسط ${Math.round(avg*10)/10}، والهدف ${tg}. `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+`. الأقرب: ${w.join('، ')}`,win:rd>=d.rounds?mostPts(pts):null};}
};

/* ---------- ultimate X-O ---------- */
const L3=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const small=(b,k)=>b.slice(k*9,k*9+9);
const line3=s=>{for(const L of L3)if(s[L[0]]!=='.'&&s[L[0]]!=='d'&&s[L[0]]===s[L[1]]&&s[L[1]]===s[L[2]])return s[L[0]];return null;};
GAMES.uxo={name:'إكس أو المضاعفة',cat:'board',lbc:'#8E3B46',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B4505C"/>${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${8+c*29}" y="${8+r*29}" width="26" height="26" rx="4" fill="${(r+c)%2?'#fff':'#FBE3E6'}"/>`).join('')).join('')}<path d="M14 14l14 14M28 14L14 28" stroke="#EC6158" stroke-width="4"/><circle cx="50" cy="50" r="7" stroke="#4AB1E8" stroke-width="4" fill="none"/></svg>`,
  init:()=>({b:'.'.repeat(81),w:'.'.repeat(9),nb:-1}),
  status:(d,ctx)=>turnTxt(d,ctx),
  winExtra:d=>'المربعات الكبيرة: '+cntSeat(d.w.replace(/d/g,'.'),d.pl.length).map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  // client side only (S.uxoH, never in d): the board before the last move, to mark the cell just played
  render(d,ctx){let h=S.uxoH;if(!h||h.gid!==d.gid)h=S.uxoH={gid:d.gid,b:d.b,lm:-1};
    if(h.b!==d.b){let i=-1;for(let x=0;x<81;x++)if(h.b[x]!==d.b[x]&&d.b[x]!=='.'){i=x;break;}h.lm=i;h.b=d.b;}
    let wl=[];if(d.win!=null){const L=L3.find(L=>d.w[L[0]]!=='.'&&d.w[L[0]]!=='d'&&d.w[L[0]]===d.w[L[1]]&&d.w[L[1]]===d.w[L[2]]);if(L)wl=L;}
    let s='<div class="gm gm-uxo"><div class="uxo">';
    for(let k=0;k<9;k++){const w=d.w[k],act=d.win==null&&w==='.'&&(d.nb<0||d.nb===k),won=w!=='.'&&w!=='d';
      s+=`<div class="ub ${act?'act':''} ${won?'won':''} ${w==='d'?'dr':''} ${wl.includes(k)?'uwin':''}" style="${won?`--c:${col(d,+w)};--l:${lit(d,+w)}`:''}">${[...small(d.b,k)].map((c,j)=>`<button class="uc ${k*9+j===h.lm?'lm':''} ${ctx.my&&act&&c==='.'?'can':''}" data-ga="m" data-i="${k*9+j}" ${ctx.my&&act&&c==='.'?'':'disabled'}>${c!=='.'?shape(d.pl[+c]):''}</button>`).join('')}${won?`<div class="ubw">${shape(d.pl[+w])}</div>`:''}</div>`;}
    return s+'</div></div>';},
  click(a,i,d,ctx){
    if(!ctx.my||d.b[i]!=='.')return;const k=Math.floor(i/9),j=i%9;if(d.w[k]!=='.'||(d.nb>=0&&d.nb!==k))return;const t=String(d.turn);
    const b=setAt(d.b,i,t);let w=d.w;const sw=line3(small(b,k));if(sw)w=setAt(w,k,sw);else if(!small(b,k).includes('.'))w=setAt(w,k,'d');
    let win=null;const mw=line3(w);if(mw)win=+mw;else if(!w.includes('.')){win=mostPts(cntSeat(w.replace(/d/g,'.'),d.pl.length));}
    const nb=w[j]==='.'?j:-1;act({...d,b,w,nb,win,turn:nextSeat(d,d.turn)});
  }
};

/* ---------- proverbs ---------- */
const PROV=[['الصبر مفتاح…','الفرج'],['من جد…','وجد'],['العلم في الصغر كالنقش في…','الحجر'],['القناعة كنز لا…','يفنى'],['الوقت كالسيف إن لم تقطعه…','قطعك'],['رب أخ لك لم…','تلده أمك'],['في التأني السلامة وفي العجلة…','الندامة'],['الجار قبل…','الدار'],['الرفيق قبل…','الطريق'],['إذا كان الكلام من فضة فالسكوت من…','ذهب'],['اللي ما يعرف الصقر…','يشويه'],['عصفور في اليد ولا عشرة على…','الشجرة'],['يا غريب كن…','أديب'],['درهم وقاية خير من قنطار…','علاج'],['الطيور على أشكالها…','تقع'],['لكل جواد…','كبوة'],['خير الكلام ما قل…','ودل'],['من حفر حفرة لأخيه…','وقع فيها'],['اتق شر من…','أحسنت إليه'],['إن غدًا لناظره…','قريب'],['الكتاب يبان من…','عنوانه'],['كل إناء بما فيه…','ينضح'],['يد وحدة ما…','تصفق'],['القرد في عين أمه…','غزال'],['مد رجولك على قد…','لحافك'],['الحركة…','بركة'],['اللي فات…','مات'],['الشق أكبر من…','الرقعة'],['ما طار طير وارتفع إلا كما طار…','وقع'],['اسأل مجرب ولا تسأل…','حكيم'],["ما كل ما يتمنى المرء…", "يدركه"],["تجري الرياح بما لا…", "تشتهي السفن"],["الصديق وقت…", "الضيق"],["لا تؤجل عمل اليوم إلى…", "الغد"],["من شب على شيء…", "شاب عليه"],["العقل السليم في…", "الجسم السليم"],["لكل مقام…", "مقال"],["رب ضارة…", "نافعة"],["الوحدة خير من جليس…", "السوء"],["على قدر أهل العزم تأتي…", "العزائم"],["خير الأمور…", "أوسطها"],["ليس كل ما يلمع…", "ذهبًا"],["السكوت علامة…", "الرضا"],["بلغ السيل…", "الزبى"],["سبق السيف…", "العذل"],["عند الامتحان يُكرم المرء أو…", "يُهان"],["ما حك جلدك مثل…", "ظفرك"],["أول الغيث…", "قطرة"],["الحاجة أم…", "الاختراع"],["كل ممنوع…", "مرغوب"],["القافلة تسير والكلاب…", "تنبح"],["لكل داء…", "دواء"],["لا يُلدغ المؤمن من جحر…", "مرتين"],["من راقب الناس مات…", "همًّا"],["يداك أوكتا وفوك…", "نفخ"],["وافق شنٌّ…", "طبقة"],["جنت على نفسها…", "براقش"],["عادت حليمة لعادتها…", "القديمة"],["رجع بخفي…", "حنين"],["أعطِ الخبز…", "لخبازه"],["الشمس ما تتغطى…", "بغربال"],["اللي ما يطول العنب يقول عنه…", "حامض"],["الباب اللي يجيك منه الريح…", "سده واستريح"],["إذا حضر الماء بطل…", "التيمم"],["اللي في القدر يطلعه…", "الملاس"],["من طق الباب سمع…", "الجواب"],["ما يمدح السوق إلا من…", "ربح فيه"],["الكلام اللين يغلب…", "الحق البين"],["اللي ما له أول ما له…", "تالي"],["كلٌّ يغني على…", "ليلاه"],["إن كنت ريحًا فقد لاقيت…", "إعصارًا"],["ومن الحب ما…", "قتل"],["الضرب في الميت…", "حرام"],["فاقد الشيء لا…", "يعطيه"],["لسانك حصانك إن صنته…", "صانك"],["ما كل بيضاء…", "شحمة"],["الدنيا يوم لك ويوم…", "عليك"],["لا يفلّ الحديد إلا…", "الحديد"],["الحر تكفيه…", "الإشارة"],["العين ما تعلى على…", "الحاجب"],["اللي ما يشوف من الغربال…", "أعمى"],["الطمع ضرّ ما…", "نفع"],["خذوا الحكمة من أفواه…", "المجانين"],["العجلة من…", "الشيطان"],["الكلمة الطيبة…", "صدقة"],["ابن الوز…", "عوام"],["حبل الكذب…", "قصير"],["التكرار يعلّم…", "الشطار"],["يا ما تحت السواهي…", "دواهي"],["مصائب قوم عند قوم…", "فوائد"],["كما تدين…", "تُدان"],["اللي يبي الدح ما يقول…", "أح"],["شين وقوي…", "عين"],["لكل زمان دولة…", "ورجال"],["إن كان صاحبك عسل لا…", "تلحسه كله"],["اللي ما يعرفك ما…", "يثمنك"],["المكتوب على الجبين لازم تشوفه…", "العين"],["كثرة الطق تفك…", "اللحام"],["اللي يتلفت ما…", "يوصل"],["كل شي بالغصب إلا…", "المحبة"],["الصيت ولا…", "الغنى"],["المال السايب يعلّم…", "السرقة"],["اربط الحمار مكان ما يبي…", "صاحبه"]];
// near twins (ذهب/ذهبًا، عين/العين، وقع/وقع فيها) never sit together as options
const pvN=s=>s.replace(/[\u064B-\u0652]/g,'').split(' ')[0].replace(/^ال/,'').replace(/ا$/,'');
GAMES.prov=makeQuiz({name:'أكمل المثل',lbc:'#7A5230',icon:iconE('#A06B3E','📜'),
  gen(d,rd){const R=srng(d,'pv');const ord=[...PROV.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}
    const k=ord[rd%ord.length];const R2=srng(d,'pv'+rd);const w=new Set();while(w.size<3){const x=Math.floor(R2()*PROV.length);if(x!==k&&![PROV[k][1],...w].some(y=>pvN(y)===pvN(PROV[x][1])))w.add(PROV[x][1]);}
    return {q:`<span class="pvq">${PROV[k][0].replace(/…$/,'')}<i class="pvb">…</i></span>`,...withOptions(R2,PROV[k][1],[...w])};}});

/* ---------- number sequences ---------- */
const seqA=R=>{const ty=Math.floor(R()*5);let a=[];
    if(ty===0){let x=1+Math.floor(R()*9),k=2+Math.floor(R()*8);for(let i=0;i<6;i++)a.push(x+k*i);}
    else if(ty===1){let x=1+Math.floor(R()*5),k=2+Math.floor(R()*3);for(let i=0;i<6;i++)a.push(x*Math.pow(k,i));}
    else if(ty===2){let o=1+Math.floor(R()*9);for(let i=0;i<6;i++)a.push((i+o)*(i+o));}
    else if(ty===3){let x=1+Math.floor(R()*3),y=x+1+Math.floor(R()*3);a=[x,y];for(let i=2;i<6;i++)a.push(a[i-1]+a[i-2]);}
    else{let x=50+Math.floor(R()*50),k=3+Math.floor(R()*7);for(let i=0;i<6;i++)a.push(x-k*i);}
    return a;};
GAMES.seq=makeQuiz({name:'أكمل التسلسل',lbc:'#2F6F4F',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F9468"/><text x="50" y="58" font-size="20" font-weight="800" fill="#fff" text-anchor="middle" direction="ltr">2 4 8 ?</text></svg>`,
  // replay the earlier rounds so a sequence never comes back in the same match
  gen(d,rd){let R,a;const seen=new Set();for(let r=0;r<=rd;r++){R=srng(d,'sq'+r);for(let t=0;t<30;t++){a=seqA(R);if(!seen.has(a.slice(0,5).join()))break;}seen.add(a.slice(0,5).join());}
    const ans=a[5];const w=new Set();const del=[1,-1,2,-2,a[5]-a[4],3,-3,10];while(w.size<3){const x=ans+del[Math.floor(R()*del.length)];if(x!==ans)w.add(x);}
    return {q:`<span class="sqs" dir="ltr">${a.slice(0,5).map(x=>`<b>${x}</b>`).join('')}<b class="sqq">؟</b></span>`,rq:a.slice(0,5).join(' ، ')+' ، ؟',...withOptions(R,String(ans),[...w].map(String))};}});

/* ---------- colour words ---------- */
const STC=[['أحمر','#E5483F'],['أزرق','#3D8FD8'],['أخضر','#3FAE5C'],['أصفر','#E9B21C'],['بنفسجي','#9C5BC7'],['برتقالي','#F07D2C']];
GAMES.stroop={name:'لون الكلمة',cat:'quiz',lbc:'#A33C77',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="40" font-size="22" font-weight="800" fill="#3D8FD8" text-anchor="middle">أحمر</text><text x="50" y="74" font-size="22" font-weight="800" fill="#3FAE5C" text-anchor="middle">أصفر</text></svg>`,
  ...(()=>{const q=makeQuiz({name:'',lbc:'',icon:'',gen(d,rd){let R,w,c;const seen=new Set();for(let r=0;r<=rd;r++){R=srng(d,'st'+r);for(let t=0;t<30;t++){w=Math.floor(R()*STC.length);c=Math.floor(R()*(STC.length-1));if(c>=w)c++;if(!seen.has(w*8+c))break;}seen.add(w*8+c);}
    const ws=new Set([w]);while(ws.size<3){const x=Math.floor(R()*STC.length);if(x!==c)ws.add(x);}const wr=[...ws].map(k=>STC[k][0]);
    return {q:`<span class="stw" style="color:${STC[c][1]}">${STC[w][0]}</span><small class="sth">وش لون الخط؟ (مو الكلمة)</small>`,rq:'لون الخط',...withOptions(R,STC[c][0],wr)};}});delete q.name;delete q.lbc;delete q.icon;delete q.cat;return q;})()
};

/* ---------- bomb wires ---------- */
const BOMB=`<svg class="bsvg" viewBox="0 0 64 64"><defs><radialGradient id="bmg" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="28" cy="38" r="21" fill="#1E242B"/><circle cx="28" cy="38" r="21" fill="url(#bmg)"/><rect x="33" y="13" width="12" height="9" rx="2" transform="rotate(40 39 17)" fill="#4A535E"/><path d="M42 12q6-9 14-5" stroke="#C9A06A" stroke-width="3" fill="none" stroke-linecap="round"/><g class="bspark"><circle cx="57" cy="7" r="5" fill="#F0B429"/><circle cx="57" cy="7" r="2.4" fill="#fff"/></g></svg>`;
const WC=['#E5483F','#3D8FD8','#3FAE5C','#F0B429','#9C7BD6','#F2874B','#E57AAE','#2FB3AA','#8B5A2B','#555','#C0C0C0','#1F7A8C'];
const WCOL=[['#E5483F','الأحمر'],['#3D8FD8','الأزرق'],['#3FAE5C','الأخضر'],['#F0B429','الأصفر'],['#8E44AD','البنفسجي'],['#F2874B','البرتقالي'],['#E57AAE','الوردي'],['#1ABC9C','الفيروزي'],['#ECF0F1','الأبيض'],['#8B5A2B','البني'],['#95A5A6','الرمادي'],['#2D4763','الكحلي']];
// a new bomb: one deadly wire, and two safe wires whispered to each player still in the game
function wNewBomb(d,n,alive){const k=Math.min(12,alive.length+5),bomb=rnd(k);const safe=[...Array(k).keys()].filter(i=>i!==bomb);
  const kn=[...Array(n).keys()].map(s=>alive.includes(s)?shuffle([...safe]).slice(0,2).sort((a,b)=>a-b):[]);
  return {...d,k,bomb,cut:[],kn,ps:'0'.repeat(n),nb:(d.nb||0)+1};}
function wCut(d,i){const t=d.turn;
  if(i===d.bomb){const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);const nd={...d,out,turn:nextSeat(d,t,out),last:`💥 ${nm(d,t)} قص السلك ${WCOL[i][1]} وانفجرت القنبلة!`};
    if(al.length<=1)return {...nd,cut:[...d.cut,i],win:al.length?al[0]:'d'};return wNewBomb(nd,d.pl.length,al);}
  return {...d,cut:[...d.cut,i],turn:nextSeat(d,t),last:`${nm(d,t)} قص ${WCOL[i][1]} وسلم ✂️`};}
GAMES.wires={name:'فك القنبلة',cat:'mind',lbc:'#3B3B3B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4A4A4A"/><circle cx="50" cy="56" r="26" fill="#1d1d1d"/><path d="M60 30q10-12 22-8" stroke="#E8C38E" stroke-width="4" fill="none"/><circle cx="83" cy="22" r="5" fill="#F0B429"/>${['#E5483F','#3D8FD8','#3FAE5C'].map((c,k)=>`<path d="M30 ${50+k*7}H70" stroke="${c}" stroke-width="4"/>`).join('')}</svg>`,
  /* every bomb has one deadly wire; each player secretly knows two wires that are safe.
     On your turn cut a wire, or pass once per bomb. Cut the deadly one and you are out, then a new bomb arrives.
     Online the deadly wire and the other players' safe wires stay on the host (hide); a cut is checked there */
  init:n=>wNewBomb({last:''},n,[...Array(n).keys()]),
  hide:{seat:['kn'],all:['bomb']},
  net:{host:['cut','pass']},
  viewer:d=>d.win==null?d.turn:null,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  // a bomb device: a counter of wires still in, then the wires between two terminal strips. A cut wire is a new node,
  // so its two halves spring apart once; a new bomb (someone went out) is a new device, so it shakes in
  render(d,ctx){const v=ctx.local?d.turn:ctx.v;const my=ctx.my&&d.win==null;const kn=v>=0&&Array.isArray(d.kn[v])?d.kn[v].filter(i=>i>=0):[];
    const left=[...Array(d.k).keys()].filter(i=>!d.cut.includes(i));const boom=!d.cut.length&&/^💥/.test(d.last||'');
    let s=`<div class="gm gm-wires"><div class="bombx ${boom?'boom':''}" data-k="b${d.nb}"><div class="bhd">${BOMB}<div class="blcd"><b class="ltr">${String(left.length).padStart(2,'0')}</b><small>أسلاك باقية</small></div><i class="bled"></i></div>
    <div class="wset">${[...Array(d.k).keys()].map(i=>{const c=WCOL[i][0];if(d.cut.includes(i))return `<div class="wire cut ${d.win!=null&&i===d.bomb?'deadly':''}" style="--c:${c}"><i class="wh a"></i><i class="wh b"></i></div>`;
      const known=kn.includes(i),tag=my?'button':'div';
      return `<${tag} class="wire ${known?'known':''} ${d.win!=null&&i===d.bomb?'deadly':''}" style="--c:${c}" ${my?`data-ga="cut" data-i="${i}" aria-label="قص السلك ${WCOL[i][1]}"`:''}><i class="wh"></i>${known?'<s class="wsafe">سليم ✓</s>':''}</${tag}>`;}).join('')}</div></div>`;
    if(v>=0&&d.out[v]!=='1'&&d.win==null){const k2=kn.filter(i=>!d.cut.includes(i));
      s+=`<p class="wsec">${k2.length?`🤫 سر بينك وبين نفسك: ${k2.map(i=>`<b style="color:${WCOL[i][0]}">${WCOL[i][1]}</b>`).join(' و')} سليم`:'الأسلاك اللي تعرفها انقصت، الحين حظك'}</p>`;}
    if(my&&d.ps[d.turn]!=='1')s+=`<div class="acts"><button class="btn navy" data-ga="pass">⏭ مرّر الدور (مرة وحدة لكل قنبلة)</button></div>`;
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='pass'){if(d.ps[t]==='1')return;act({...d,ps:setAt(d.ps,t,'1'),turn:nextSeat(d,t),last:`${nm(d,t)} مرّر دوره ⏭`});return;}
    if(a==='cut'&&Number.isInteger(i)&&i>=0&&i<d.k&&!d.cut.includes(i))act(wCut(d,i));},
  onTimeout:d=>{const left=[...Array(d.k).keys()].filter(i=>!d.cut.includes(i));const safe=left.filter(i=>i!==d.bomb);return wCut(d,safe.length?safe[rnd(safe.length)]:d.bomb);}
};

/* ---------- go fish ---------- */
const rk=c=>c[0];const RKN=r=>r==='T'?'10':r;
// draw a random card from what is left, so the stored pile order tells nothing
const dkPick=dk=>{const j=rnd(dk.length/2)*2;return [dk.slice(j,j+2),dk.slice(0,j)+dk.slice(j+2)];};
const fishBk=h=>{const by={};cardsOf(h).forEach(c=>{by[rk(c)]=(by[rk(c)]||0)+1;});let got='';for(const r in by)if(by[r]===4)got+=r;return [cardsOf(h).filter(c=>!got.includes(rk(c))).join(''),got];};
// out seats hold no cards and never win on books
const fishEnd=nd=>{const total=nd.books.reduce((x,b)=>x+b.length,0);
  if(total>=13||!nd.dk.length&&nd.hands.every((h,s)=>!h.length||nd.out[s]==='1'))nd.win=mostPts(nd.books.map((b,s)=>nd.out[s]==='1'?-1:b.length));return nd;};
GAMES.fish={name:'صيد السمك',cat:'cards',lbc:'#1F6F8B',hide:{seat:['hands'],all:['dk']},
  icon:iconE('#2E8FB3','🎣'),
  init:n=>{let dk=shuffle(deck52());const k=n<=3?7:5;const hands=[],books=[];for(let s=0;s<n;s++){const [h,b]=fishBk(dk.slice(0,k).join(''));hands.push(h);books.push(b);dk=dk.slice(k);}return {hands,dk:dk.join(''),books,last:''};},
  // a player who left puts their cards back in the pile, so nobody waits on a book they hold
  onSkip(nd){let dk=nd.dk;const hands=nd.hands.map((h,s)=>{if(nd.out[s]==='1'&&h){dk+=h;return '';}return h;});const r={...nd,hands,dk};return r.win!=null?r:fishEnd(r);},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',noTimer:false,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),points:d=>d.books.map(b=>b.length),
  winExtra:d=>'المجموعات: '+d.books.map((b,s)=>`${nm(d,s)} ${b.length}`).join('، '),
  // the table: every other player as a seat (cards held, books made; on your turn the seats are who you ask), and the pond
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;const nk=d.dk.length/2;
    const pond=`<div class="fpond"><div class="fstk ${nk?'':'none'}">${nk?cardHTML('??'):''}</div><small>باقي في المخزن ${nk}</small></div>`;
    const seat=(i,my,ts)=>{const n=d.hands[i].length/2,can=my&&ts.includes(i);const in_=`<b>${nm(d,i)}</b><span class="fbk">${'<i></i>'.repeat(Math.min(n,5))}<em>${n}</em></span><small>📚 ${d.books[i].length}</small>`;
      return can?`<button class="fseat can ${i===S.tgt?'sel':''}" style="--c:${col(d,i)}" data-ga="tgt" data-i="${i}">${in_}</button>`:`<div class="fseat ${d.out[i]==='1'?'out':''}" style="--c:${col(d,i)}">${in_}</div>`;};
    if(v<0||d.win!=null)return `<div class="gm gm-fish"><div class="mtab ftab"><div class="fseats">${d.pl.map((_,i)=>seat(i,false,[])).join('')}</div>${pond}</div></div>`;
    const hand=cardsOf(d.hands[v]).sort((a,b)=>rv(a)-rv(b));const my=ctx.my&&d.turn===v;let ts=[];
    if(my){ts=d.pl.map((_,i)=>i).filter(i=>i!==v&&d.hands[i].length);if(S.tgt==null||!ts.includes(S.tgt))S.tgt=ts[0]??null;}
    let s=`<div class="gm gm-fish">${my&&ts.length?'<p class="lbl">من تسأل؟</p>':''}<div class="mtab ftab"><div class="fseats">${d.pl.map((_,i)=>i).filter(i=>i!==v).map(i=>seat(i,my,ts)).join('')}</div>${pond}</div>`;
    s+=`<div class="hand fhand">${hand.map(c=>my&&S.tgt!=null?cardHTML(c,false,'pick" data-ga="ask" data-i="'+RANKS.indexOf(rk(c))):cardHTML(c)).join('')||'<span class="note">ما عندك أوراق</span>'}</div>`;
    if(d.books[v])s+=`<div class="fbooks"><small>📚</small>${[...d.books[v]].map(r=>`<b class="ltr">${RKN(r)}</b>`).join('')}</div>`;
    if(my&&(!hand.length||S.tgt==null))s+=`<div class="acts"><button class="btn blue" data-ga="draw">${d.dk.length?'اسحب ورقة':'مرّر الدور'}</button></div>`;
    return s+'</div>';},
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;render();return;}if(!ctx.my)return;const t=d.turn;
    const hands=[...d.hands],books=[...d.books];let dk=d.dk;
    const mkBooks=s=>{const [h,got]=fishBk(hands[s]);hands[s]=h;books[s]+=got;return got;};
    if(a==='draw'){let last=`${nm(d,t)} مرّر`;if(dk.length){let c;[c,dk]=dkPick(dk);hands[t]+=c;last=`${nm(d,t)} سحب ورقة`;mkBooks(t);}
      act(fishEnd({...d,hands,books,dk,turn:nextSeat(d,t),last}));return;}
    const r=RANKS[i],tg=S.tgt;if(tg==null||!cardsOf(hands[t]).some(c=>rk(c)===r))return;
    const th=cardsOf(hands[tg]);const got=th.filter(c=>rk(c)===r);let last,again=false;
    if(got.length){hands[tg]=th.filter(c=>rk(c)!==r).join('');hands[t]+=got.join('');again=true;last=`${nm(d,t)} طلب ${RKN(r)} من ${nm(d,tg)} وأخذ ${got.length}`;}
    else{last=`${nm(d,t)} طلب ${RKN(r)} من ${nm(d,tg)}، روح اصطد! 🎣`;if(dk.length){let c;[c,dk]=dkPick(dk);hands[t]+=c;if(rk(c)===r){again=true;last+=' وطلع له نفس الرقم';}}}
    const b=mkBooks(t);if(b)last+=`، وكمّل مجموعة ${[...b].map(RKN).join(' و')}`;
    act(fishEnd({...d,hands,books,dk,turn:again&&hands[t].length?t:nextSeat(d,t),last}));
  }
};

/* ---------- 99 ---------- */
const v99=(c,tot)=>{const r=c[0];if(r==='K')return 99;if(r==='T')return tot>=10?tot-10:tot+10;if(r==='4'||r==='9')return tot;if(r==='J'||r==='Q')return tot+10;if(r==='A')return tot+1;return tot+(+r);};
const lab99={K:'= 99',T:'±10','4':'عكس',9:'+0',J:'+10',Q:'+10'};
GAMES.n99={name:'لعبة 99',cat:'cards',lbc:'#5B2C6F',hide:{seat:['hands'],all:['dk']},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7D3C98"/><text x="50" y="64" font-size="40" font-weight="800" fill="#fff" text-anchor="middle">99</text></svg>`,
  init:n=>{let dk=shuffle(deck52(n>5?2:1));const hands=[];for(let s=0;s<n;s++){hands.push(dk.slice(0,3).join(''));dk=dk.slice(3);}return {hands,dk:dk.join(''),tot:0,dir:1,last:''};},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  // skipping the player on turn follows the current direction (a 4 may have reversed it)
  onSkip:(nd,d)=>d&&nd.win==null&&d.out[d.turn]!=='1'&&nd.out[d.turn]==='1'?{...nd,turn:uStep(nd,d.turn,1,nd.dir)}:nd,
  onTimeout:d=>{const t=d.turn;const h=cardsOf(d.hands[t]);const ok=h.map((c,i)=>v99(c,d.tot)<=99?i:-1).filter(i=>i>=0);return GAMES.n99.play(d,ok.length?ok[0]:-1);},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  // the running total as a meter on the felt (green, then orange, then red near 99), the pile beside it
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;const hot=d.tot>89?'hot':d.tot>69?'warm':'';const nk=d.dk.length/2;
    let s=`<div class="gm gm-n99"><div class="mtab n9tab"><div class="n9m ${hot}"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="42" pathLength="100"/><circle class="fl" cx="50" cy="50" r="42" pathLength="100" style="stroke-dasharray:${Math.round(Math.min(99,d.tot)/99*1000)/10} 100"/></svg><b class="ltr" data-k="${d.tot}">${d.tot}</b><small>لا تتعدى 99</small></div>
    <div class="n9side"><div class="n9dir"><span>${d.dir>0?'↻':'↺'}</span><small>الدور</small></div><div class="fstk ${nk?'':'none'}">${nk?cardHTML('??'):''}</div></div></div>`;
    if(v<0||d.win!=null)return s+'</div>';const my=ctx.my&&d.turn===v;const h=cardsOf(d.hands[v]);
    s+=`<p class="lbl">أوراقك</p><div class="hand n9hand">${h.map((c,i)=>{const ok=v99(c,d.tot)<=99;return `<div class="n9c ${my&&!ok?'no':''}">${my&&ok?cardHTML(c,true,'pick" data-ga="m" data-i="'+i):cardHTML(c,true,my?'dim':'')}<small class="ltr">${lab99[c[0]]||'+'+(c[0]==='A'?1:c[0])}</small></div>`;}).join('')}</div>`;
    s+=`<div class="legend"><span dir="ltr">K = 99</span><span dir="ltr">10 = ±10</span><span dir="ltr">J Q = +10</span><span dir="ltr">9 = +0</span><span>4 يعكس الدور</span></div>`;
    if(my&&!h.some(c=>v99(c,d.tot)<=99))s+=`<div class="acts"><button class="btn red" data-ga="m" data-i="-1">ما عندي ورقة 😵</button></div>`;
    return s+'</div>';},
  play(d,i){const t=d.turn;const h=cardsOf(d.hands[t]);
    if(i<0){const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);return {...d,out,win:al.length===1?al[0]:null,turn:uStep(d,t,1,d.dir,out),last:`${nm(d,t)} ما عنده ورقة وطلع 😵`};}
    const c=h.splice(i,1)[0];const tot=v99(c,d.tot);let dk=d.dk;if(dk.length){let c2;[c2,dk]=dkPick(dk);h.push(c2);}
    const hands=[...d.hands];hands[t]=h.join('');const dir=c[0]==='4'?-d.dir:d.dir;
    return {...d,hands,dk,tot,dir,turn:uStep(d,t,1,dir),last:`${nm(d,t)} نزّل ${RKN(c[0])} والمجموع ${tot}`};},
  click(a,i,d,ctx){if(!ctx.my)return;if(i>=0){const c=cardsOf(d.hands[d.turn])[i];if(!c||v99(c,d.tot)>99)return;}act(this.play(d,i));}
};

// the three quiz games of this file render inside .gm.gm-<id>, so their question card can be styled without touching other quizzes
['prov','seq','stroop'].forEach(id=>{const G=GAMES[id],r=G.render;G.render=function(d,ctx){const h=r.call(this,d,ctx);return h?`<div class="gm gm-${id}">${h}</div>`:h;};});

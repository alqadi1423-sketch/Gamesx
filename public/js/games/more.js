'use strict';
/* card war, lowest unique number, two thirds, ultimate X-O, proverbs, sequences, colour words, bomb wires, go fish, 99 */

const tbtn=(label,ga,i,on,extra)=>`<button class="btn ${extra||''}" data-ga="${ga}" data-i="${i}" ${on?'':'disabled'}>${label}</button>`;

/* ---------- card war (everyone holds 1 to 7, bid on a prize) ---------- */
GAMES.war={name:'حرب الأوراق',cat:'cards',lbc:'#3A5F8F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4F7FBF"/><rect x="14" y="26" width="30" height="44" rx="6" fill="#fff" transform="rotate(-14 29 48)"/><rect x="56" y="26" width="30" height="44" rx="6" fill="#fff" transform="rotate(14 71 48)"/><text x="29" y="56" font-size="20" font-weight="800" fill="#D43C33" text-anchor="middle" transform="rotate(-14 29 48)">7</text><text x="71" y="56" font-size="20" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(14 71 48)">5</text><text x="50" y="92" font-size="18" text-anchor="middle">⚔️</text></svg>`,
  init:n=>{const pr=shuffle([1,2,3,4,5,6,7]);return {rd:0,prizes:pr,pts:Array(n).fill(0),res:''};},
  privInit:()=>({used:[]}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)),
  winExtra:d=>d.res,
  render(d,ctx){if(d.win!=null)return '';const v=ctx.v;const p=v!=null&&v>=0?ctx.priv[d.pl[v]]:null;const used=(p&&p.used)||[];
    return pickedChips(d)+`<div class="qbox">الجائزة: <span class="big-num" style="color:#B8860B">${d.prizes[d.rd]}</span> <small style="font-size:14px">(جولة ${d.rd+1} من 7)</small></div>
    <div class="hand">${[1,2,3,4,5,6,7].map(c=>used.includes(c)?`<div class="card dim">${c}</div>`:`<button class="card ${ctx.my?'pick':''} big" data-ga="m" data-i="${c}" ${ctx.my?'':'disabled'}>${c}</button>`).join('')}</div>`;},
  click(a,c,d,ctx){if(!ctx.my)return;const r=d.pl[ctx.v];const p=S.priv[r]||{used:[]};if((p.used||[]).includes(c))return;setPriv(r,{...p,gid:d.gid,used:[...(p.used||[]),c],rd:d.rd,pick:c});},
  resolve(d,picks){const pr=d.prizes[d.rd];const v=picks.map(x=>x==null?-1:x);const mx=Math.max(...v);const top=v.map((x,s)=>x===mx&&x>0?s:-1).filter(s=>s>=0);const pts=[...d.pts];
    if(top.length===1)pts[top[0]]+=pr;
    const res=`جائزة ${pr}: `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+(top.length===1?`، أخذها ${nm(d,top[0])}`:'، تعادل وراحت');
    const rd=d.rd+1;return {...d,pts,rd,res,win:rd>=7?mostPts(pts):null};}
};

/* ---------- lowest unique number ---------- */
GAMES.lowu={name:'أصغر رقم فريد',cat:'quiz',lbc:'#2E6F73',
  icon:iconE('#3E9298','🔢'),
  init:n=>({rd:0,max:n>4?15:10,pts:Array(n).fill(0),res:'',rounds:8}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. أصغر رقم ما اختاره غيرك ياخذ نقطة</small><br>`),
  winExtra:d=>d.res,
  render(d,ctx){if(d.win!=null)return '';return pickedChips(d)+`<div class="cellgrid" style="grid-template-columns:repeat(5,minmax(0,1fr));background:#2E6F73;max-width:360px">${Array(d.max).fill(0).map((_,k)=>`<button class="cg" style="font-size:22px" data-ga="m" data-i="${k+1}" ${ctx.my?'':'disabled'}>${k+1}</button>`).join('')}</div>`;},
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
    return pickedChips(d)+(ctx.my?`<div class="qbox"><span class="big-num">${v}</span></div><input type="range" min="0" max="100" value="${v}" data-draft="t23" style="width:100%;max-width:420px"><button class="btn red wide" data-ga="go">ثبّت رقمي</button>`:'');},
  click(a,i,d,ctx){if(!ctx.my)return;const v=Math.max(0,Math.min(100,Math.round(+((S.draft||{}).t23??50))));delete S.draft.t23;simulPick(d,ctx.v,v);},
  resolve(d,picks){const vals=picks.filter(x=>x!=null);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;const tg=Math.round(avg*2/3*10)/10;
    const diff=picks.map(x=>x==null?Infinity:Math.abs(x-tg));const mn=Math.min(...diff);const pts=[...d.pts];const w=[];diff.forEach((x,s)=>{if(x===mn&&isFinite(x)){pts[s]++;w.push(nm(d,s));}});
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
  render(d,ctx){let s='<div class="uxo">';
    for(let k=0;k<9;k++){const w=d.w[k],act=d.win==null&&w==='.'&&(d.nb<0||d.nb===k);
      s+=`<div class="ub ${act?'act':''}" style="${w!=='.'&&w!=='d'?`background:${lit(d,+w)}`:''}">${w!=='.'&&w!=='d'?`<div class="ubw">${shape(d.pl[+w])}</div>`:''}${[...small(d.b,k)].map((c,j)=>`<button class="uc" data-ga="m" data-i="${k*9+j}" ${ctx.my&&act&&c==='.'?'':'disabled'}>${c!=='.'?shape(d.pl[+c]):''}</button>`).join('')}</div>`;}
    return s+'</div>';},
  click(a,i,d,ctx){
    if(!ctx.my||d.b[i]!=='.')return;const k=Math.floor(i/9),j=i%9;if(d.w[k]!=='.'||(d.nb>=0&&d.nb!==k))return;const t=String(d.turn);
    const b=setAt(d.b,i,t);let w=d.w;const sw=line3(small(b,k));if(sw)w=setAt(w,k,sw);else if(!small(b,k).includes('.'))w=setAt(w,k,'d');
    let win=null;const mw=line3(w);if(mw)win=+mw;else if(!w.includes('.')){win=mostPts(cntSeat(w.replace(/d/g,'.'),d.pl.length));}
    const nb=w[j]==='.'?j:-1;act({...d,b,w,nb,win,turn:nextSeat(d,d.turn)});
  }
};

/* ---------- proverbs ---------- */
const PROV=[['الصبر مفتاح…','الفرج'],['من جد…','وجد'],['العلم في الصغر كالنقش في…','الحجر'],['القناعة كنز لا…','يفنى'],['الوقت كالسيف إن لم تقطعه…','قطعك'],['رب أخ لك لم…','تلده أمك'],['في التأني السلامة وفي العجلة…','الندامة'],['الجار قبل…','الدار'],['الرفيق قبل…','الطريق'],['إذا كان الكلام من فضة فالسكوت من…','ذهب'],['اللي ما يعرف الصقر…','يشويه'],['عصفور في اليد ولا عشرة على…','الشجرة'],['يا غريب كن…','أديب'],['درهم وقاية خير من قنطار…','علاج'],['الطيور على أشكالها…','تقع'],['لكل جواد…','كبوة'],['خير الكلام ما قل…','ودل'],['من حفر حفرة لأخيه…','وقع فيها'],['اتق شر من…','أحسنت إليه'],['إن غدًا لناظره…','قريب'],['الكتاب يبان من…','عنوانه'],['كل إناء بما فيه…','ينضح'],['يد وحدة ما…','تصفق'],['القرد في عين أمه…','غزال'],['مد رجولك على قد…','لحافك'],['الحركة…','بركة'],['اللي فات…','مات'],['الشق أكبر من…','الرقعة'],['ما طار طير وارتفع إلا كما طار…','وقع'],['اسأل مجرب ولا تسأل…','حكيم']];
GAMES.prov=makeQuiz({name:'أكمل المثل',lbc:'#7A5230',icon:iconE('#A06B3E','📜'),
  gen(d,rd){const R=srng(d,'pv');const ord=[...PROV.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}
    const k=ord[rd%ord.length];const R2=srng(d,'pv'+rd);const w=new Set();while(w.size<3){const x=Math.floor(R2()*PROV.length);if(x!==k)w.add(PROV[x][1]);}
    return {q:PROV[k][0],...withOptions(R2,PROV[k][1],[...w])};}});

/* ---------- number sequences ---------- */
GAMES.seq=makeQuiz({name:'أكمل التسلسل',lbc:'#2F6F4F',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F9468"/><text x="50" y="58" font-size="20" font-weight="800" fill="#fff" text-anchor="middle" direction="ltr">2 4 8 ?</text></svg>`,
  gen(d,rd){const R=srng(d,'sq'+rd);const ty=Math.floor(R()*5);let a=[];
    if(ty===0){let x=1+Math.floor(R()*9),k=2+Math.floor(R()*8);for(let i=0;i<6;i++)a.push(x+k*i);}
    else if(ty===1){let x=1+Math.floor(R()*4),k=2+Math.floor(R()*2);for(let i=0;i<6;i++)a.push(x*Math.pow(k,i));}
    else if(ty===2){let o=1+Math.floor(R()*4);for(let i=0;i<6;i++)a.push((i+o)*(i+o));}
    else if(ty===3){let x=1+Math.floor(R()*3),y=x+1+Math.floor(R()*3);a=[x,y];for(let i=2;i<6;i++)a.push(a[i-1]+a[i-2]);}
    else{let x=50+Math.floor(R()*50),k=3+Math.floor(R()*7);for(let i=0;i<6;i++)a.push(x-k*i);}
    const ans=a[5];const w=new Set();const del=[1,-1,2,-2,a[5]-a[4],3,-3,10];while(w.size<3){const x=ans+del[Math.floor(R()*del.length)];if(x!==ans)w.add(x);}
    return {q:`<span dir="ltr">${a.slice(0,5).join(' ، ')} ، ؟</span>`,rq:a.slice(0,5).join(' ، ')+' ، ؟',...withOptions(R,String(ans),[...w].map(String))};}});

/* ---------- colour words ---------- */
const STC=[['أحمر','#E5483F'],['أزرق','#3D8FD8'],['أخضر','#3FAE5C'],['أصفر','#E9B21C'],['بنفسجي','#9C5BC7'],['برتقالي','#F07D2C']];
GAMES.stroop={name:'لون الكلمة',cat:'quiz',lbc:'#A33C77',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="40" font-size="22" font-weight="800" fill="#3D8FD8" text-anchor="middle">أحمر</text><text x="50" y="74" font-size="22" font-weight="800" fill="#3FAE5C" text-anchor="middle">أصفر</text></svg>`,
  ...(()=>{const q=makeQuiz({name:'',lbc:'',icon:'',gen(d,rd){const R=srng(d,'st'+rd);const w=Math.floor(R()*STC.length);let c=Math.floor(R()*(STC.length-1));if(c>=w)c++;
    const ws=new Set([w]);while(ws.size<3)ws.add(Math.floor(R()*STC.length));ws.delete(c);const wr=[...ws].slice(0,3).map(k=>STC[k][0]);
    return {q:`<span style="font-size:46px;color:${STC[c][1]}">${STC[w][0]}</span><br><small style="font-size:16px">وش لون الخط؟ (مو الكلمة)</small>`,rq:'لون الخط',...withOptions(R,STC[c][0],wr)};}});delete q.name;delete q.lbc;delete q.icon;delete q.cat;return q;})()
};

/* ---------- bomb wires ---------- */
const WC=['#E5483F','#3D8FD8','#3FAE5C','#F0B429','#9C7BD6','#F2874B','#E57AAE','#2FB3AA','#8B5A2B','#555','#C0C0C0','#1F7A8C'];
GAMES.wires={name:'فك القنبلة',cat:'mind',lbc:'#3B3B3B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4A4A4A"/><circle cx="50" cy="56" r="26" fill="#1d1d1d"/><path d="M60 30q10-12 22-8" stroke="#E8C38E" stroke-width="4" fill="none"/><circle cx="83" cy="22" r="5" fill="#F0B429"/>${['#E5483F','#3D8FD8','#3FAE5C'].map((c,k)=>`<path d="M30 ${50+k*7}H70" stroke="${c}" stroke-width="4"/>`).join('')}</svg>`,
  init:n=>({k:n+3,bomb:rnd(n+3),cut:'',last:''}),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){return `<div class="bomb">💣</div><div style="width:100%;max-width:420px">${Array(d.k).fill(0).map((_,i)=>d.cut.includes(String.fromCharCode(97+i))?`<div class="wire cut" style="--c:${WC[i]}"></div>`:`<button class="wire" style="--c:${WC[i]}" data-ga="m" data-i="${i}" ${ctx.my?'':'disabled'}></button>`).join('')}</div>`;},
  click(a,i,d,ctx){if(!ctx.my)return;const ch=String.fromCharCode(97+i);if(d.cut.includes(ch))return;const t=d.turn;
    if(i===d.bomb){const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);const k=al.length+3;
      act({...d,out,k,bomb:rnd(k),cut:'',win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),last:`💥 ${nm(d,t)} قص السلك الغلط وطلع. قنبلة جديدة!`});return;}
    act({...d,cut:d.cut+ch,turn:nextSeat(d,t),last:`${nm(d,t)} قص سلك وسلم`});}
};

/* ---------- go fish ---------- */
const rk=c=>c[0];const RKN=r=>r==='T'?'10':r;
GAMES.fish={name:'صيد السمك',cat:'cards',lbc:'#1F6F8B',
  icon:iconE('#2E8FB3','🎣'),
  init:n=>{let dk=shuffle(deck52());const k=n<=3?7:5;const hands=[];for(let s=0;s<n;s++){hands.push(dk.slice(0,k).join(''));dk=dk.slice(k);}return {hands,dk:dk.join(''),books:Array(n).fill(''),last:''};},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',noTimer:false,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),points:d=>d.books.map(b=>b.length),
  winExtra:d=>'المجموعات: '+d.books.map((b,s)=>`${nm(d,s)} ${b.length}`).join('، '),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s=`<p class="lbl" style="text-align:center">باقي في المخزن ${d.dk.length/2}</p>`;
    if(v<0||d.win!=null)return s;const hand=cardsOf(d.hands[v]).sort((a,b)=>rv(a)-rv(b));const my=ctx.my&&d.turn===v;
    if(my){const ts=d.pl.map((_,i)=>i).filter(i=>i!==v&&d.hands[i].length);if(S.tgt==null||!ts.includes(S.tgt))S.tgt=ts[0]??null;
      if(ts.length)s+=`<p class="lbl" style="text-align:center">من تسأل؟</p><div class="tabs">${ts.map(i=>`<button class="tab ${i===S.tgt?'sel':''}" style="background:${col(d,i)}" data-ga="tgt" data-i="${i}">${nm(d,i)}</button>`).join('')}</div>`;}
    s+=`<div class="hand">${hand.map(c=>my&&S.tgt!=null?cardHTML(c,false,'pick" data-ga="ask" data-i="'+RANKS.indexOf(rk(c))):cardHTML(c)).join('')||'<span class="note">ما عندك أوراق</span>'}</div>`;
    if(my&&(!hand.length||S.tgt==null))s+=`<div class="acts"><button class="btn blue" data-ga="draw">${d.dk.length?'اسحب ورقة':'مرّر الدور'}</button></div>`;
    return s;},
  click(a,i,d,ctx){
    if(a==='tgt'){S.tgt=i;render();return;}if(!ctx.my)return;const t=d.turn;
    const hands=[...d.hands],books=[...d.books];let dk=d.dk;
    const mkBooks=s=>{const h=cardsOf(hands[s]);const by={};h.forEach(c=>{(by[rk(c)]=by[rk(c)]||[]).push(c);});let got='';for(const r in by)if(by[r].length===4){got+=r;hands[s]=h.filter(c=>rk(c)!==r).join('');}books[s]+=got;return got;};
    const finish=nd=>{const total=nd.books.reduce((x,b)=>x+b.length,0);if(total>=13)nd.win=mostPts(nd.books.map(b=>b.length));
      else if(!nd.dk.length&&nd.hands.every(h=>!h.length))nd.win=mostPts(nd.books.map(b=>b.length));return nd;};
    if(a==='draw'){let last=`${nm(d,t)} مرّر`;if(dk.length){hands[t]+=dk.slice(0,2);dk=dk.slice(2);last=`${nm(d,t)} سحب ورقة`;mkBooks(t);}
      act(finish({...d,hands,books,dk,turn:nextSeat(d,t),last}));return;}
    const r=RANKS[i],tg=S.tgt;if(tg==null||!cardsOf(hands[t]).some(c=>rk(c)===r))return;
    const th=cardsOf(hands[tg]);const got=th.filter(c=>rk(c)===r);let last,again=false;
    if(got.length){hands[tg]=th.filter(c=>rk(c)!==r).join('');hands[t]+=got.join('');again=true;last=`${nm(d,t)} طلب ${RKN(r)} من ${nm(d,tg)} وأخذ ${got.length}`;}
    else{last=`${nm(d,t)} طلب ${RKN(r)} من ${nm(d,tg)}، روح اصطد! 🎣`;if(dk.length){const c=dk.slice(0,2);hands[t]+=c;dk=dk.slice(2);if(rk(c)===r){again=true;last+=' وطلع له نفس الرقم';}}}
    const b=mkBooks(t);if(b)last+=`، وكمّل مجموعة ${[...b].map(RKN).join(' و')}`;
    act(finish({...d,hands,books,dk,turn:again&&hands[t].length?t:nextSeat(d,t),last}));
  }
};

/* ---------- 99 ---------- */
const v99=(c,tot)=>{const r=c[0];if(r==='K')return 99;if(r==='T')return tot>=10?tot-10:tot+10;if(r==='4'||r==='9')return tot;if(r==='J'||r==='Q')return tot+10;if(r==='A')return tot+1;return tot+(+r);};
const lab99={K:'= 99',T:'±10','4':'عكس',9:'+0',J:'+10',Q:'+10'};
GAMES.n99={name:'لعبة 99',cat:'cards',lbc:'#5B2C6F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7D3C98"/><text x="50" y="64" font-size="40" font-weight="800" fill="#fff" text-anchor="middle">99</text></svg>`,
  init:n=>{let dk=shuffle(deck52(n>5?2:1));const hands=[];for(let s=0;s<n;s++){hands.push(dk.slice(0,3).join(''));dk=dk.slice(3);}return {hands,dk:dk.join(''),tot:0,dir:1,last:''};},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  onTimeout:d=>{const t=d.turn;const h=cardsOf(d.hands[t]);const ok=h.map((c,i)=>v99(c,d.tot)<=99?i:-1).filter(i=>i>=0);return GAMES.n99.play(d,ok.length?ok[0]:-1);},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s=`<div class="qbox"><span class="big-num ltr" style="color:${d.tot>89?'#D43C33':'var(--ink)'}">${d.tot}</span><br><small style="font-size:14px">لا تتعدى 99 • الدور ${d.dir>0?'↻':'↺'}</small></div>`;
    if(v<0||d.win!=null)return s;const my=ctx.my&&d.turn===v;const h=cardsOf(d.hands[v]);
    s+=`<p class="lbl" style="text-align:center">أوراقك</p><div class="hand">${h.map((c,i)=>{const ok=v99(c,d.tot)<=99;const b=lab99[c[0]]?`<small style="position:absolute;bottom:-18px;font-size:11px;color:var(--mut);white-space:nowrap">${lab99[c[0]]}</small>`:'';return (my&&ok?cardHTML(c,true,'pick" data-ga="m" data-i="'+i):cardHTML(c,true,my?'dim':'')).replace('</div>',b+'</div>');}).join('')}</div>`;
    s+=`<div class="legend"><span dir="ltr">K = 99</span><span dir="ltr">10 = ±10</span><span dir="ltr">J Q = +10</span><span dir="ltr">9 = +0</span><span>4 يعكس الدور</span></div>`;
    if(my&&!h.some(c=>v99(c,d.tot)<=99))s+=`<div class="acts"><button class="btn red" data-ga="m" data-i="-1">ما عندي ورقة 😵</button></div>`;
    return s;},
  play(d,i){const t=d.turn;const h=cardsOf(d.hands[t]);
    if(i<0){const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);return {...d,out,win:al.length===1?al[0]:null,turn:uStep(d,t,1,d.dir,out),last:`${nm(d,t)} ما عنده ورقة وطلع 😵`};}
    const c=h.splice(i,1)[0];const tot=v99(c,d.tot);let dk=d.dk;if(dk.length){h.push(dk.slice(0,2));dk=dk.slice(2);}
    const hands=[...d.hands];hands[t]=h.join('');const dir=c[0]==='4'?-d.dir:d.dir;
    return {...d,hands,dk,tot,dir,turn:uStep(d,t,1,dir),last:`${nm(d,t)} نزّل ${RKN(c[0])} والمجموع ${tot}`};},
  click(a,i,d,ctx){if(!ctx.my)return;if(i>=0){const c=cardsOf(d.hands[d.turn])[i];if(!c||v99(c,d.tot)>99)return;}act(this.play(d,i));}
};

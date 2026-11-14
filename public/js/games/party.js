'use strict';
/* party games, everyone at once: categories, majority, closest guess, true or false, scramble, odd one out */

const normAr=t=>String(t||'').trim().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ');

/* ---------- إنسان حيوان جماد: a letter, five words, «ستوب!», then everyone checks the answers ----------
   Online (and one player against bots) everyone writes at once; the first to fill all five can press «ستوب»
   and the others get ten seconds. On one phone with friends each player writes in turn behind a cover.
   Words in the dictionary count at once, unknown words count unless the other players turn them down.
   A category scores 20 when you are the only one with an answer, 10 for a unique answer and 5 for a shared one. */
const CATF=['إنسان','حيوان','نبات','جماد','بلاد'];
const CATI=['🧑','🐾','🌿','🪑','🗺️'];
const CATL='ابتجحخدرزسشصطعفقكلمنهوي';
const CWORDS={};// display forms of the dictionary, by category and first letter, for the bots
function catWords(k,L){const key=k+L;if(CWORDS[key])return CWORDS[key];const raw=(typeof DICT_RAW!=='undefined'&&DICT_RAW[CATF[k]])||'';
  return CWORDS[key]=raw.split(/\s+/).filter(Boolean).map(w=>w.replace(/_/g,' ')).filter(w=>catLetter(w)===L);}
// the letter a word counts for: the one after «ال» for places, otherwise the first one
function catLetter(w){w=normAr(w).replace(/[ً-ْـ]/g,'');if(!w)return '';if(w.startsWith('ال')&&w.length>3)return w[2];return w[0];}
const catOkL=(w,L,k)=>{const n=normAr(w);if(!n)return false;if(catLetter(n)===L)return true;return k===0&&n[0]===L;};
const inDict=(k,w)=>typeof DICT!=='undefined'&&DICT[CATF[k]]&&DICT[CATF[k]].has(normW(w));
const cKey=d=>d.gid+':'+d.r;
const cHumans=d=>d.pl.map((_,s)=>s).filter(s=>!isBot(d,s));
function cAns(d,s){if(d.bt&&d.bt[s])return d.bt[s].a;const p=S.priv[d.pl[s]];return p&&p.ca&&p.ca.k===cKey(d)?p.ca.a:['','','','',''];}
function cRound(d,r){const used=(d.used||[]).slice(-10);const ok=[...CATL].filter(l=>!used.includes(l));const L=ok[rnd(ok.length)];
  return {...d,r,L,used:[...(d.used||[]),L],ph:'spin',ts:Date.now(),t0:0,stop:null,ans:null,sa:null,rej:{},rs:null,wr:null,done:[],last:''};}
function cWrite(d){const now=Date.now();const x={...d,ph:'write',t0:now,ts:now};
  if(d.seq){const hs=cHumans(d);x.wr=hs[0];x.turn=hs[0];}
  // bots fill their sheet from the dictionary at their own pace; a quick bot may call «ستوب»
  const bt={};for(let s=0;s<d.pl.length;s++)if(isBot(d,s)){const lv=botLv(d,s);const a=CATF.map((_,k)=>{const ws=catWords(k,d.L);return ws.length&&Math.random()<[0,.5,.75,.93][lv]?pickR(ws):'';});
    const [lo,hi]=[0,[70,110],[45,75],[28,48]][lv];bt[s]={a,at:now+(lo+rnd(hi-lo))*1000,stop:lv>1&&a.every(Boolean)};}
  if(Object.keys(bt).length)x.bt=bt;else delete x.bt;return x;}
// end of writing: freeze the sheets and mark every answer: 2 in the dictionary, 1 unknown, 0 empty or wrong letter
function cCollect(d){const now=Date.now();const ans=d.pl.map((_,s)=>{let a=cAns(d,s).map(w=>String(w||'').trim().slice(0,18));
    if(d.bt&&d.bt[s]&&d.bt[s].at>now){const b=d.bt[s],done=Math.max(0,1-(b.at-now)/((b.at-d.t0)||1));a=a.map((w,k)=>k<Math.floor(5*done)?w:'');}return a;});
  const sa=ans.map(a=>a.map((w,k)=>!w?0:!catOkL(w,d.L,k)?0:inDict(k,w)?2:1));
  const x={...d,ph:'review',ts:now,ans,sa,rej:{},last:''};delete x.bt;return x;}
// objections: online every player sends his own list, on one phone the group taps together
function cRejected(d,s,k){const key=s+'_'+k;if(S.mode==='local')return !!d.rej[key];
  const voters=cHumans(d).filter(x=>x!==s);if(!voters.length)return false;let no=0;
  for(const v of voters){const p=S.priv[d.pl[v]];if(p&&p.ob&&p.ob.k===cKey(d)&&p.ob.l.includes(key))no++;}return no*2>voters.length;}
function cScore(d){const n=d.pl.length,rs=d.pl.map(()=>[0,0,0,0,0]);const solo=S.mode==='local'&&cHumans(d).length===1;const ok=(s,k)=>d.sa[s][k]===2||(d.sa[s][k]===1&&!cRejected(d,s,k));
  for(let k=0;k<5;k++){const good=d.pl.map((_,s)=>s).filter(s=>ok(s,k));const cnt={};good.forEach(s=>{const w=normW(d.ans[s][k]);cnt[w]=(cnt[w]||0)+1;});
    good.forEach(s=>{rs[s][k]=good.length===1?20:cnt[normW(d.ans[s][k])]>1?5:10;
      // alone against bots nobody can turn a word down, so a word the dictionary does not know scores 5
      if(solo&&d.sa[s][k]===1)rs[s][k]=Math.min(rs[s][k],5);});}
  const pts=[...d.pts];rs.forEach((r,s)=>pts[s]+=r.reduce((a,b)=>a+b,0));
  const fin=d.r+1>=d.R;return {...d,ph:'score',ts:Date.now(),rs,pts,rejF:d.pl.map((_,s)=>[0,1,2,3,4].map(k=>d.sa[s][k]===1&&!ok(s,k)?1:0)),win:fin?mostPts(pts):null};}
const cLeft=d=>{if(d.stop)return Math.max(0,Math.ceil((d.stop.at+10000-Date.now())/1000));return Math.max(0,Math.ceil(d.T-(Date.now()-d.t0)/1000));};
let cSaveT=null;
// a player's own part for this game (answers ca, objections ob), always tagged with the game's id
const cMine=(d,r)=>{const p=S.priv[r];return p&&p.gid===d.gid?p:{gid:d.gid};};
// online a player who is not the host hands the sheet to the host (pv); the host and one phone just publish
function cSend(d,r){if(S.mode==='online'&&!amHost()){if(r===S.me)queueIntent({t:'pv',p:S.priv[r]});}else publish();}
GAMES.cats={name:'إنسان حيوان جماد',cat:'quiz',lbc:'#8A5A2B',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B7834F"/><rect x="16" y="14" width="68" height="72" rx="8" fill="#FFF7E8"/>${[0,1,2,3,4].map(k=>`<path d="M26 ${28+k*12}H74" stroke="#C9B08A" stroke-width="2"/>`).join('')}<circle cx="74" cy="22" r="13" fill="#EC6158"/><text x="74" y="28" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">م</text></svg>`,
  init:n=>{const humans=S.mode==='local'?[...Array(n).keys()].filter(r=>!(S.bots||{})[r]).length:n;const seq=S.mode==='local'&&humans>=2;
    return cRound({R:5,pts:Array(n).fill(0),seq,T:seq?90:120,used:[]},0);},
  points:d=>d.pts,
  /* online, while the sheets are being written the others see only how many words each one has, and whether he called «ستوب»;
     the words go to the host and come out together at the review. Objections are public */
  privShow:(d,seat,role,p,own)=>{if(own||!p||d.win!=null)return p;const o={gid:p.gid};
    if(p.ca&&typeof p.ca==='object'){const live=d.ph==='write'&&p.ca.k===cKey(d);o.ca={k:p.ca.k,a:Array.isArray(p.ca.a)?p.ca.a.map(w=>live&&w?'·':''):[],stop:!!p.ca.stop};}
    if(p.ob&&typeof p.ob==='object')o.ob=p.ob;return o;},
  // five short words; a sheet handed in with «ستوب» or «خلصت» does not change any more
  privOk:(d,r,o,p)=>(p.ca==null||typeof p.ca==='object'&&Array.isArray(p.ca.a)&&p.ca.a.length===5&&p.ca.a.every(w=>typeof w==='string'&&w.length<=18))&&
    (p.ob==null||typeof p.ob==='object'&&Array.isArray(p.ob.l)&&p.ob.l.length<=40&&p.ob.l.every(x=>typeof x==='string'&&x.length<=4))&&
    !(o&&o.gid===p.gid&&o.ca&&p.ca&&o.ca.k===p.ca.k&&o.ca.stop&&JSON.stringify(o.ca.a)!==JSON.stringify(p.ca.a)),
  net:{local:['stop','done','ob','ok']},
  noTurn:d=>!(d.seq&&d.ph==='write'),
  viewer:d=>d.seq&&d.ph==='write'&&d.wr!=null?d.wr:null,
  coverMsg:d=>`حرف «${d.L}» • عندك ${d.T} ثانية`,
  winExtra:d=>'النقاط: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.pts[s]}`).join('، '),
  status(d,ctx){const rd=`<small>الجولة ${d.r+1} من ${d.R}</small><br>`;
    if(d.ph==='spin')return rd+'الحرف يتحدد…';
    if(d.ph==='write'){if(d.stop)return rd+`<b style="color:#E5483F">✋ ${nm(d,d.stop.by)} قال ستوب!</b> باقي <b data-until="${d.stop.at+10000}">${cLeft(d)}</b> ثواني`;
      return rd+(d.seq?`${nameTag(d,d.wr)} يكتب أجوبته`:'اكتبوا كلمة لكل خانة تبدأ بالحرف');}
    if(d.ph==='review')return rd+'راجعوا الأجوبة: الكلمة اللي فيها ؟ تقدرون ترفضونها';
    return rd+`نتيجة حرف «${d.L}»`;},
  render(d,ctx){return `<div class="catsb">${GAMES.cats.view(d,ctx)}</div>`;},
  view(d,ctx){const v=ctx.v;
    if(d.ph==='spin'){const pool=[...CATL].filter(l=>l!==d.L);const strip=[...Array(14)].map(()=>pool[rnd(pool.length)]).concat(d.L);
      return `<div class="cspin"><div class="creel"><div class="cstrip">${strip.map(l=>`<b>${l}</b>`).join('')}</div></div><p>الحرف الجاي</p></div>`;}
    if(d.ph==='write'){const me=d.seq?d.wr:v;const can=me!=null&&me>=0&&!isBot(d,me);
      const sent=can&&(d.seq?d.done.includes(me):(()=>{const p=S.priv[d.pl[me]];return !!(p&&p.ca&&p.ca.k===cKey(d)&&p.ca.stop);})());
      let s=`<div class="cletter"><span>الحرف</span><b>${d.L}</b><i class="ctime ${d.stop?'stop':''}">⏱ <b data-until="${d.stop?d.stop.at+10000:d.t0+d.T*1000}">${cLeft(d)}</b></i></div>`;
      if(can&&!sent){const a=CATF.map((_,k)=>String(S.draft[`c${d.r}_${me}_${k}`]??cAns(d,me)[k]??''));const full=a.every(w=>catOkL(w,d.L,0)||catOkL(w,d.L,1));
        s+=`<div class="cform">${CATF.map((c,k)=>{const w=a[k];const bad=w.trim()&&!catOkL(w,d.L,k);return `<label class="${bad?'bad':w.trim()?'ok':''}"><span>${CATI[k]} ${c}</span><input class="field" data-draft="c${d.r}_${me}_${k}" value="${escH(w)}" maxlength="18" autocomplete="off" placeholder="${c} بحرف ${d.L}"></label>`;}).join('')}</div>`;
        s+=d.seq?`<button class="btn red wide" data-ga="done">خلصت ✓</button>`:`<button class="btn red wide cstopb" data-ga="stop" ${full&&!d.stop?'':'disabled'}>${d.stop?'خلصوا الباقي…':'ستوب ✋'}</button>${!full&&!d.stop?'<p class="note" style="text-align:center;margin:4px 0">عبّ الخمس خانات عشان تقدر تقول ستوب</p>':''}`;}
      else if(can)s+='<p class="note" style="text-align:center">✓ سلّمت ورقتك، ننتظر الباقين</p>';
      // who is still writing
      s+=`<div class="cwho">${d.pl.map((_,x)=>{if(x===me)return '';let f;if(d.bt&&d.bt[x])f=Date.now()>=d.bt[x].at?'✓':'✍️';else if(d.seq)f=d.done.includes(x)?'✓':x===d.wr?'✍️':'⏳';else{const a=cAns(d,x);f=a.filter(Boolean).length+'/5';}
        return `<span style="--c:${col(d,x)}">${nm(d,x)} <b>${f}</b></span>`;}).join('')}</div>`;
      return s;}
    // review and score: one card per category
    const sc=d.ph==='score',canVote=!sc&&(d.seq||S.mode==='local'||v>=0);
    const myOb=(()=>{if(d.seq||S.mode==='local')return null;const p=v>=0?S.priv[d.pl[v]]:null;return p&&p.ob&&p.ob.k===cKey(d)?p.ob.l:[];})();
    let s=`<div class="cletter small"><span>الحرف</span><b>${d.L}</b></div>`;
    s+=CATF.map((c,k)=>`<div class="ccat"><h4>${CATI[k]} ${c}</h4><div class="cans">${d.pl.map((_,x)=>{const w=d.ans[x][k];const st=d.sa[x][k];const key=x+'_'+k;
        const rej=sc?d.rejF[x][k]:cRejected(d,x,k);const mine=myOb&&myOb.includes(key);const pts=sc?d.rs[x][k]:null;
        const icon=!w?'—':st===0?'✗':rej?'👎':st===2?'✓':'؟';const tap=canVote&&st===1&&x!==v;
        return `<${tap?'button':'span'} class="ca s${st} ${w?'':'none'} ${rej?'rej':''} ${mine?'mine':''}" style="--c:${col(d,x)}" ${tap?`data-ga="ob" data-i="${x*5+k}"`:''}><small>${nm(d,x)}</small><b>${w?escH(w):'ما كتب'}</b><i>${icon}${pts!=null?` ${pts?'+'+pts:'0'}`:''}</i></${tap?'button':'span'}>`;}).join('')}</div></div>`).join('');
    if(!sc){const done=d.seq||S.mode==='local'?false:(()=>{const p=v>=0?S.priv[d.pl[v]]:null;return !!(p&&p.ob&&p.ob.k===cKey(d)&&p.ob.ok);})();
      s+=d.seq||S.mode==='local'?`<button class="btn red wide" data-ga="calc">احسب النقاط ✓</button>`:v>=0?`<button class="btn red wide" data-ga="ok" ${done?'disabled':''}>${done?'✓ ننتظر الباقين':'تمام، احسبوا ✓'}</button>`:'';}
    else if(d.win==null){const tot=d.pl.map((_,x)=>[x,d.rs[x].reduce((a,b)=>a+b,0)]).sort((a,b)=>b[1]-a[1]);
      s=`<div class="cround">${tot.map(([x,p])=>`<span style="--c:${col(d,x)}">${nm(d,x)} <b>+${p}</b></span>`).join('')}</div>`+s+((d.seq||S.mode==='local'||S.me===actingHost())?`<button class="btn red wide" data-ga="next">الجولة الجاية ←</button>`:'<p class="note" style="text-align:center">الجولة الجاية تبدأ بعد شوي</p>');}
    return s;},
  onDraft(k,val){const m=/^c(\d+)_(\d+)_(\d)$/.exec(k);const d=S.st.d;if(!m||!d||d.ph!=='write'||+m[1]!==d.r)return;const s=+m[2];if(s!==mkCtx().v&&!(d.seq&&s===d.wr))return;
    // the sheet goes to the private part while typing, so the host has it when time is up
    const r=d.pl[s];const p=cMine(d,r);if(p.ca&&p.ca.k===cKey(d)&&p.ca.stop)return;const a=CATF.map((_,j)=>String(S.draft[`c${d.r}_${s}_${j}`]??(p.ca&&p.ca.k===cKey(d)?p.ca.a[j]:'')??'').slice(0,18));
    S.priv[r]={...p,ca:{k:cKey(d),a,stop:false}};clearTimeout(cSaveT);cSaveT=setTimeout(()=>{const d2=S.st.d;if(d2&&d2.gid===d.gid&&d2.ph==='write')cSend(d2,r);},400);
    const b=app.querySelector('.cstopb');if(b&&!d.stop){const full=a.every(w=>catOkL(w,d.L,0)||catOkL(w,d.L,1));b.disabled=!full;}
    const lab=app.querySelector(`[data-draft="${k}"]`);if(lab){const w=val.trim();lab.parentNode.className=w&&!catOkL(w,d.L,+m[3])?'bad':w?'ok':'';}},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='stop'||a==='done'){const me=d.seq?d.wr:v;if(me==null||me<0||d.ph!=='write')return;const r=d.pl[me];const p=cMine(d,r);
      const ans=CATF.map((_,k)=>String(S.draft[`c${d.r}_${me}_${k}`]??cAns(d,me)[k]??'').trim().slice(0,18));
      if(a==='stop'&&!ans.every(w=>catOkL(w,d.L,0)||catOkL(w,d.L,1))){toast('عبّ الخمس خانات أول');return;}
      S.priv[r]={...p,ca:{k:cKey(d),a:ans,stop:true}};
      if(d.seq){const done=[...d.done,me];const hs=cHumans(d).filter(x=>!done.includes(x));if(hs.length){act({...d,done,wr:hs[0],turn:hs[0],t0:Date.now()});return;}act(cCollect({...d,done}));return;}
      setPriv(r,S.priv[r]);return;}
    if(d.ph==='review'&&a==='ob'){const s=Math.floor(i/5),k=i%5,key=s+'_'+k;
      if(d.seq||S.mode==='local'){act({...d,rej:{...d.rej,[key]:!d.rej[key]}});return;}
      if(v<0)return;const r=d.pl[v],p=cMine(d,r);const l=p.ob&&p.ob.k===cKey(d)?p.ob.l:[];setPriv(r,{...p,ob:{k:cKey(d),l:l.includes(key)?l.filter(x=>x!==key):[...l,key],ok:false}});return;}
    if(d.ph==='review'&&a==='calc'){act(cScore(d));return;}
    if(d.ph==='review'&&a==='ok'&&v>=0){const r=d.pl[v],p=cMine(d,r);const l=p.ob&&p.ob.k===cKey(d)?p.ob.l:[];setPriv(r,{...p,ob:{k:cKey(d),l,ok:true}});return;}
    if(d.ph==='score'&&a==='next'&&d.win==null){act(cRound(d,d.r+1));return;}},
  host(d){const now=Date.now();
    if(d.ph==='spin')return now-d.ts>2700?cWrite(d):null;
    if(d.ph==='write'){let x=d;
      if(!d.seq&&!d.stop){// a player who pressed «ستوب», or a quick bot
        for(let s=0;s<d.pl.length;s++){if(isBot(d,s)){const b=d.bt&&d.bt[s];if(b&&b.stop&&now>=b.at){x={...x,stop:{by:s,at:now}};break;}continue;}
          const p=S.priv[d.pl[s]];if(p&&p.ca&&p.ca.k===cKey(d)&&p.ca.stop){x={...x,stop:{by:s,at:now}};break;}}}
      const end=x.stop?x.stop.at+11200:x.t0+x.T*1000+1200;
      if(d.seq){if(now>=x.t0+x.T*1000+800){const done=[...x.done,x.wr];const hs=cHumans(x).filter(s=>!done.includes(s));return hs.length?{...x,done,wr:hs[0],turn:hs[0],t0:now}:cCollect({...x,done});}return x===d?null:x;}
      if(now>=end)return cCollect(x);
      // everyone finished early: no need to wait for the clock
      const allIn=d.pl.every((_,s)=>isBot(d,s)?(d.bt[s]&&now>=d.bt[s].at):(()=>{const p=S.priv[d.pl[s]];return goneLong(d.pl[s])||!!(p&&p.ca&&p.ca.k===cKey(d)&&p.ca.stop);})());
      if(allIn&&!x.stop)return cCollect(x);
      return x===d?null:x;}
    if(d.ph==='review'&&!d.seq&&S.mode==='online'){const hs=cHumans(d).filter(s=>S.roles.has(d.pl[s]));const ok=hs.every(s=>{const p=S.priv[d.pl[s]];return p&&p.ob&&p.ob.k===cKey(d)&&p.ob.ok;});
      if(ok||now-d.ts>60000)return cScore(d);return null;}
    if(d.ph==='score'&&d.win==null&&S.mode==='online'&&now-d.ts>15000)return cRound(d,d.r+1);
    return null;},
  bot:d=>d
};
// a bot writes real words for the letter from the dictionary (more of them at higher levels) and votes yes on the others' words
GAMES.cats.botPick=(d,s,lv)=>{if(d.phase==='vote')return d.pend.map(()=>lv===1?rnd(2):1);const p=[0,.45,.7,.9][lv]||.7;
  return CATF.map(c=>{if(Math.random()>p||typeof DICT==='undefined'||!DICT[c])return '';const ws=[...DICT[c]].filter(w=>catOk(w,d.L)&&!catAl(w,d.L));return ws.length?ws[rnd(ws.length)]:'';});};
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- majority ---------- */
const WYR=[['قهوة','شاي'],['البحر','البر'],['الصيف','الشتاء'],['كبسة','مندي'],['قطط','كلاب'],['السفر بالطيارة','السفر بالسيارة'],['تصحى بدري','تسهر'],['كرة القدم','كرة السلة'],['المدينة','القرية'],['الجبل','الصحراء'],['برجر','بيتزا'],['فيلم','مسلسل'],['رسالة صوتية','رسالة مكتوبة'],['آيفون','أندرويد'],['كتاب ورقي','كتاب إلكتروني'],['حلا','موالح'],['مطعم','أكل البيت'],['سباحة','ركض'],['تعرف المستقبل','ترجع للماضي'],['تطير','تختفي'],['تمر','شوكولاتة'],['رحلة بحرية','رحلة برية'],['كشتة','سفر'],['عصير برتقال','ليمون بالنعناع'],['ألعاب جماعية','ألعاب فردية'],["قهوة عربية", "قهوة مختصة"],["شاهي أحمر", "شاهي بالحليب"],["كبسة لحم", "كبسة دجاج"],["شاورما", "برجر"],["بيتزا", "معكرونة"],["آيسكريم", "كيك"],["لقيمات", "كنافة"],["شوكولاتة داكنة", "شوكولاتة بالحليب"],["فشار", "مكسرات"],["مشاوي", "مقليات"],["رز", "خبز"],["شوربة", "سلطة"],["عصير مانجو", "عصير فراولة"],["تمر سكري", "تمر خلاص"],["عشاء برّا", "عشاء بالبيت"],["مطعم شعبي", "مطعم فاخر"],["فطور شعبي", "فطور فندق"],["مساء الخميس", "صباح الجمعة"],["العيد بالبيت", "العيد بالسفر"],["سفر لليابان", "سفر لإيطاليا"],["فيلا كبيرة", "شقة بأعلى برج"],["سيارة رياضية", "سيارة عائلية كبيرة"],["تسوق أونلاين", "تسوق بالمول"],["مكالمة فيديو", "مكالمة صوتية"],["تصوير صور", "تصوير فيديو"],["أسبوع بدون جوال", "أسبوع بدون قهوة"],["تقرأ أفكار الناس", "تشوف المستقبل"],["تتكلم كل اللغات", "تعزف كل الآلات"],["قوة خارقة", "ذكاء خارق"],["مطر", "شمس"],["كشتة بالبر", "شاليه بالبحر"],["خيمة بالبر", "فندق خمس نجوم"],["تطبخ", "تغسل الصحون"],["شغل من البيت", "شغل من المكتب"],["تتعلم طبخ", "تتعلم برمجة"],["لعب ورق", "ألعاب فيديو"],["بلوت", "كيرم"],["مباراة بالملعب", "مباراة بالبيت"],["مشي على البحر", "مشي في البر"],["قط", "طير"],["حصان", "جمل"],["صقر", "حمام"],["فيلم أكشن", "فيلم كوميدي"],["مسلسل قديم", "مسلسل جديد"],["ألغاز", "ألعاب سرعة"],["تحكي قصة", "تسمع قصة"],["تسافر لحالك", "تسافر مع العائلة"],["رحلة قصيرة كل شهر", "رحلة طويلة كل سنة"],["كتابة باليد", "كتابة بالجوال"],["الشروق", "الغروب"],["قطار", "طيارة"],["تطير مثل الطير", "تسبح مثل السمك"],["تعيش بالماضي", "تعيش بالمستقبل"],["تكون مشهور", "تكون غني"],["تكون أطول", "تكون أقوى"],["تفوز لحالك", "تفوز مع فريق"],["ألف صديق على النت", "صديق واحد حقيقي"],["الأكبر بين إخوانك", "الأصغر بين إخوانك"],["اسم قصير", "اسم طويل"],["ثوب أبيض", "ثوب ملون"],["نعال", "جزمة"],["ساعة يد", "ساعة الجوال"],["قير عادي", "قير أوتوماتيك"],["تسوق بالليل", "تسوق بالنهار"],["تكون رسام", "تكون مصور"],["تكون طبيب", "تكون مهندس"],["تكون معلم", "تكون طيار"],["البرد", "الحر"],["مكيف", "مروحة"],["تلعب بالمطر", "تتفرج على المطر"],["هدية تختارها", "هدية مفاجأة"],["تحفظ كل شي تقراه", "تفهم كل شي تسمعه"],["تعرف تطبخ كل الأكلات", "تعرف تصلح كل الأجهزة"],["بيت بالجبل", "بيت على البحر"],["حديقة كبيرة", "مسبح"],["يوم كامل نوم", "يوم كامل لعب"],["تعيش بدون حلا", "تعيش بدون موالح"],["تتكلم مع الحيوانات", "تتكلم كل لغات البشر"],["تزور الماضي يوم", "تزور المستقبل يوم"],["تكون أسرع إنسان", "تكون أقوى إنسان"],["تسافر بالفضاء", "تغوص لأعماق البحر"],["بيت ذكي كله أجهزة", "بيت بسيط هادي"]];
GAMES.major={name:'لو خيروك',cat:'quiz',lbc:'#2F7F86',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3FA2AA"/><rect x="10" y="30" width="36" height="40" rx="10" fill="#fff"/><rect x="54" y="30" width="36" height="40" rx="10" fill="#FFD84D"/><text x="50" y="58" font-size="16" font-weight="800" fill="#2D4763" text-anchor="middle">أو</text></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',rounds:8}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(majLast(d)?{...d,res:''}:d,ctx,`<small>سؤال ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}</small><br>`),
  winExtra:d=>d.res,
  q(d,rd){const R=srng(d,'w');const ord=[...WYR.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}return WYR[ord[rd%ord.length]];},
  render(d,ctx){const last=majLast(d);if(d.win!=null)return `<div class="pq">${last}</div>`;const Q=this.q(d,d.rd);
    return `<div class="pq pq-major">${last}<p class="lbl" style="text-align:center">لو خيروك بين…</p><div class="wyr">${Q.map((t,k)=>`<button class="wyrc ${k?'b':'a'}" data-ga="m" data-i="${k}" ${ctx.my?'':'disabled'}><span>${t}</span></button>`).join('<span class="or">أو</span>')}</div></div>`;},
  click(a,k,d,ctx){if(!ctx.my)return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const Q=this.q(d,d.rd);const c=[0,0];picks.forEach(p=>{if(p!=null)c[p]++;});const pts=[...d.pts];
    const maj=c[0]===c[1]?-1:c[0]>c[1]?0:1;if(maj>=0)picks.forEach((p,s)=>{if(p===maj)pts[s]++;});
    const rd=d.rd+1;return {...d,pts,rd,res:`${Q[0]} ${c[0]} • ${Q[1]} ${c[1]}${maj<0?' • تعادل':''}`,win:rd>=d.rounds?mostPts(pts):null};}
};

/* ---------- closest guess ---------- */
const CLOSE=[['كم عدد الدول الأعضاء في جامعة الدول العربية؟',22],['كم عظمة في جسم الإنسان البالغ؟',206],['كم ارتفاع برج خليفة بالمتر تقريبًا؟',828],['كم دولة في قارة أفريقيا؟',54],['كم يوم في السنة الهجرية تقريبًا؟',354],['كم مفتاح في البيانو القياسي؟',88],['كم كوكب في المجموعة الشمسية؟',8],['في أي سنة ميلادية توحدت المملكة العربية السعودية باسمها الحالي؟',1932],['كم درجة حرارة جسم الإنسان الطبيعية بالمئوية تقريبًا؟',37],['كم عنصر في الجدول الدوري؟',118],['كم دقيقة في اليوم؟',1440],['كم ثانية في الساعة؟',3600],['كم عدد حروف اللغة العربية؟',28],['كم سن لبني عند الطفل؟',20],['كم مربع في رقعة الشطرنج؟',64],['في أي سنة هبط الإنسان على القمر أول مرة؟',1969],['كم قلب للأخطبوط؟',3],['كم سرعة الصوت في الهواء بالمتر في الثانية تقريبًا؟',343],['كم يوم في السنة الميلادية العادية؟',365],['كم سورة في القرآن الكريم؟',114],['كم كيلومتر قطر الأرض تقريبًا؟',12742],['كم ساعة في الأسبوع؟',168],["كم ارتفاع قمة إيفرست بالمتر تقريبًا؟", 8849],["كم طول نهر النيل بالكيلومتر تقريبًا؟", 6650],["كم عدد آيات سورة البقرة؟", 286],["كم عدد آيات القرآن الكريم؟", 6236],["كم كيلومترًا تقريبًا بين الأرض والقمر؟", 384400],["كم مليون كيلومتر تقريبًا بين الأرض والشمس؟", 150],["كم درجة مئوية تقريبًا حرارة سطح الشمس؟", 5500],["كم يومًا تقريبًا يحتاج القمر ليدور دورة كاملة حول الأرض؟", 27],["في أي سنة ميلادية افتُتحت قناة السويس؟", 1869],["في أي سنة ميلادية بدأت الحرب العالمية الثانية؟", 1939],["في أي سنة ميلادية انتهت الحرب العالمية الأولى؟", 1918],["في أي سنة هجرية كانت غزوة بدر؟", 2],["في أي سنة ميلادية كانت الهجرة النبوية؟", 622],["في أي سنة ميلادية تدفق النفط تجاريًا من بئر الدمام 7؟", 1938],["في أي سنة ميلادية تأسست الدولة السعودية الأولى؟", 1727],["في أي سنة ميلادية استرد الملك عبدالعزيز الرياض؟", 1902],["كم مترًا تقريبًا ارتفاع برج إيفل؟", 330],["كم مترًا كان ارتفاع الهرم الأكبر عند بنائه تقريبًا؟", 146],["كم عظمة تقريبًا في يد الإنسان مع الرسغ؟", 27],["كم لترًا تقريبًا من الدم في جسم الإنسان البالغ؟", 5],["كم مرة تقريبًا ينبض قلب الإنسان البالغ في الدقيقة وهو مرتاح؟", 70],["كم كيلومترًا في الساعة تقريبًا السرعة القصوى للفهد؟", 110],["كم مترًا تقريبًا طول الزرافة البالغة؟", 5],["كم عدد الدول الأعضاء في الأمم المتحدة؟", 193],["كم ولاية في الولايات المتحدة الأمريكية؟", 50],["كم عدد المناطق الإدارية في المملكة العربية السعودية؟", 13],["كم لاعبًا في فريق الكريكيت داخل الملعب؟", 11],["كم مترًا تقريبًا طول ملعب كرة القدم الدولي؟", 105],["كم كيلومترًا تقريبًا طول سباق الماراثون؟", 42],["كم يومًا تقريبًا يحتاج المريخ ليدور حول الشمس؟", 687],["كم ساعة تقريبًا طول اليوم على كوكب المشتري؟", 10],["كم سنة أرضية تقريبًا يحتاج نبتون ليدور حول الشمس؟", 165],["كم كيلومترًا تقريبًا قطر القمر؟", 3474],["كم مرة تقريبًا قطر الشمس أكبر من قطر الأرض؟", 109],["كم درجة في الدائرة الكاملة؟", 360],["كم ثانية في اليوم؟", 86400],["كم دقيقة في الأسبوع؟", 10080],["كم ساعة في السنة العادية؟", 8760],["كم يومًا في أربع سنوات منها سنة كبيسة؟", 1461],["كم قطعة لكل لاعب في الشطرنج عند البداية؟", 16],["كم حجرًا لكل لاعب في طاولة الزهر؟", 15],["كم ورقة في الشدّة بدون الجوكر؟", 52],["كم ورقة تُستخدم في البلوت؟", 32],["كم قطعة في طقم الدومينو العادي؟", 28],["كم حرفًا في الأبجدية الإنجليزية؟", 26],["كم كيلومترًا تقريبًا المسافة بالطريق بين الرياض وجدة؟", 950],["كم كيلومترًا تقريبًا المسافة بالطريق بين مكة والمدينة؟", 450],["كم ألف كيلومتر مربع تقريبًا مساحة المملكة العربية السعودية؟", 2150],["كم ألف كيلومتر في الثانية تقريبًا سرعة الضوء؟", 300],["كم يومًا تقريبًا مدة حمل الإنسان؟", 280],["كم شهرًا تقريبًا مدة حمل الناقة؟", 13],["كم شهرًا تقريبًا مدة حمل الفيلة؟", 22],["كم ركعة مجموع الصلوات المفروضة في اليوم؟", 17],["كم نبيًا ورسولًا ذُكروا بالاسم في القرآن الكريم؟", 25],["كم كان عمر النبي ﷺ عند البعثة؟", 40],["كم كان عمر النبي ﷺ عند وفاته؟", 63],["كم سنة تقريبًا كانت مدة الدعوة في مكة قبل الهجرة؟", 13],["كم عدد الصحابة المبشرين بالجنة في الحديث المشهور؟", 10],["كم مترًا تقريبًا عمق أعمق نقطة في المحيط (خندق ماريانا)؟", 11000],["كم كيلومترًا تقريبًا طول قناة السويس؟", 193],["كم مفتاحًا تقريبًا في لوحة مفاتيح الكمبيوتر الكاملة؟", 104],["كم بِت في البايت؟", 8],["كم ميغابايت في الجيجابايت بالحساب الثنائي؟", 1024],["في أي سنة ميلادية أقيمت أول كأس عالم لكرة القدم؟", 1930],["في أي سنة ميلادية أقيمت أول ألعاب أولمبية حديثة؟", 1896],["في أي سنة ميلادية أُطلق أول آيفون؟", 2007],["في أي سنة ميلادية تأسست جامعة الدول العربية؟", 1945],["في أي سنة ميلادية تأسس مجلس التعاون الخليجي؟", 1981],["في أي سنة ميلادية سقطت غرناطة آخر ممالك الأندلس؟", 1492],["في أي سنة ميلادية فُتحت القسطنطينية؟", 1453],["في أي سنة ميلادية أُعلنت رؤية السعودية 2030؟", 2016],["في أي سنة ميلادية استضافت قطر كأس العالم؟", 2022],["كم منتخبًا يشارك في كأس العالم 2026؟", 48],["كم يومًا في شهر رمضان على الأكثر؟", 30],["كم حرفًا في كلمة «استغفار»؟", 7],["كم ضلعًا للشكل العشاري؟", 10],["كم قمرًا يدور حول المريخ؟", 2],["كم كوكبًا أصغر من الأرض في المجموعة الشمسية؟", 3],["كم رجلًا للأخطبوط؟", 8],["كم جناحًا للفراشة؟", 4],["كم مترًا تقريبًا ارتفاع برج المملكة في الرياض؟", 302],["كم مترًا تقريبًا ارتفاع برج الساعة في مكة؟", 601],["كم سنة تقريبًا عمر أهرامات الجيزة؟", 4500],["كم ميلًا في الماراثون تقريبًا؟", 26]];
GAMES.close={name:'أقرب تخمين',cat:'quiz',lbc:'#6A4C93',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8B6BBE"/><circle cx="50" cy="50" r="34" fill="#fff"/><circle cx="50" cy="50" r="23" fill="#EC6158"/><circle cx="50" cy="50" r="12" fill="#fff"/><circle cx="50" cy="50" r="5" fill="#EC6158"/></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',rounds:8}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(closeLast(d)?{...d,res:''}:d,ctx,`<small>سؤال ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. الأقرب للجواب ياخذ نقطة</small><br>`),
  winExtra:d=>d.res,
  q(d,rd){const R=srng(d,'cl');const ord=[...CLOSE.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}return CLOSE[ord[rd%ord.length]];},
  render(d,ctx){const last=closeLast(d);if(d.win!=null)return `<div class="pq">${last}</div>`;const Q=this.q(d,d.rd);
    return `<div class="pq pq-close">${last}`+pickedChips(d)+`<div class="pqq"><span>🎯</span><b>${Q[0]}</b></div>`+(ctx.my?`<input class="code" inputmode="numeric" style="max-width:260px;letter-spacing:2px" data-draft="n" value="${esc((S.draft||{}).n||'')}" placeholder="رقمك" autocomplete="off"><button class="btn red wide" data-ga="go">أرسل</button>`:'')+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const t=String((S.draft||{}).n||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/٫/g,'.').replace(/[,٬\s]/g,'');const v=/^-?\d+(\.\d+)?$/.test(t)?parseFloat(t):NaN;if(!isFinite(v)){toast('اكتب رقم');return;}S.draft={};simulPick(d,ctx.v,v);},
  resolve(d,picks){const Q=this.q(d,d.rd);const diff=picks.map(p=>p==null?Infinity:Math.abs(p-Q[1]));const mn=Math.min(...diff);const pts=[...d.pts];const w=[];
    diff.forEach((x,s)=>{if(x===mn&&isFinite(x)){pts[s]++;w.push(nm(d,s));}});
    const rd=d.rd+1;return {...d,pts,rd,res:`${Q[0]} الجواب ${Q[1]}. `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+`. الأقرب: ${w.join('، ')}`,win:rd>=d.rounds?mostPts(pts):null};}
};

/* ---------- true or false ---------- */
const TF=[['الشمس نجم',1],['القمر يضيء بنفسه',0],['الحوت من الأسماك',0],['الماء يغلي عند 100 درجة مئوية عند سطح البحر',1],['الخفاش من الطيور',0],['النعامة تطير',0],['المريخ أكبر من الأرض',0],['الذهب معدن',1],['العنكبوت حشرة',0],['البطريق طائر',1],['سور الصين العظيم يقع في اليابان',0],['الدلفين يتنفس بالرئة',1],['الطماطم تصنف نباتيًا كثمرة',1],['المحيط الأطلسي أكبر محيط في العالم',0],['الضوء أسرع من الصوت',1],['للأخطبوط ثلاثة قلوب',1],['الإبل تخزن الماء في سنامها',0],['رقبة الزرافة فيها 7 فقرات',1],['الجزائر أكبر دولة في أفريقيا مساحة',1],['نهر الأمازون يقع في أفريقيا',0],['الألماس من أصلب المواد الطبيعية',1],['النحل يصنع العسل من رحيق الأزهار',1],['الثعابين لها جفون',0],['كيلو الحديد أثقل من كيلو القطن',0],['الفيل أكبر حيوان بري',1],['الأرض أقرب كوكب للشمس',0],['الكوالا نوع من الدببة',0],['الثلج يطفو فوق الماء',1],['الصوت ينتقل في الفراغ',0],['النباتات تطلق الأكسجين',1],['شهر فبراير دائمًا 28 يوم',0],['الكويت تطل على الخليج العربي',1],['القطط تتذوق الطعم الحلو',0],['البرق أسخن من سطح الشمس',1],['الإنسان البالغ عنده 32 سن عادة',1],['الأسد يعيش في القطب الشمالي',0],['المشتري أكبر كواكب المجموعة الشمسية',1],['الدم في عروق الإنسان لونه أزرق',0],["القلب يضخ الدم إلى جميع أنحاء الجسم", 1],["الصوت ينتقل في الماء أسرع منه في الهواء", 1],["الماء يتكون من الهيدروجين والأكسجين", 1],["الإبل تقدر تعيش أيامًا طويلة بدون ماء", 1],["النملة تقدر تحمل أضعاف وزنها", 1],["القمر يدور حول الأرض", 1],["نهر النيل يمر بمصر والسودان", 1],["الكعبة المشرفة في المدينة المنورة", 0],["عدد أركان الإيمان ستة", 1],["القرآن الكريم نزل في شهر رمضان", 1],["غار حراء يقع في المدينة المنورة", 0],["أول سورة في المصحف هي سورة البقرة", 0],["الزرافة أطول حيوان في العالم", 1],["الدلفين من الثدييات", 1],["البطريق يعيش في القطب الشمالي", 0],["الدب القطبي يعيش في القطب الجنوبي", 0],["النعامة أكبر طائر في العالم", 1],["الخفاش من الثدييات", 1],["الحوت الأزرق أكبر حيوان معروف عاش على الأرض", 1],["للأخطبوط عشرة أذرع", 0],["العنكبوت له ستة أرجل", 0],["الحشرات لها ستة أرجل", 1],["الثعلب من فصيلة الكلبيات", 1],["الحصان يقدر ينام وهو واقف", 1],["السمك يتنفس بالخياشيم", 1],["الضفدع من الزواحف", 0],["التمساح من الزواحف", 1],["بذور الفراولة على سطحها الخارجي", 1],["الفول السوداني من البقوليات", 1],["البطاطس تنمو تحت الأرض", 1],["القهوة تُصنع من بذور ثمرة البن", 1],["العسل يبقى صالحًا مدة طويلة جدًا إذا حُفظ جيدًا", 1],["كوكب الزهرة أسخن من كوكب عطارد", 1],["لكوكب المريخ قمران", 1],["زحل هو الكوكب الوحيد اللي له حلقات", 0],["الجاذبية على القمر أقل من الجاذبية على الأرض", 1],["القمر أكبر من الأرض", 0],["الحديد يصدأ إذا تعرض للماء والهواء", 1],["الألمنيوم ينجذب للمغناطيس", 0],["النحاس موصل جيد للكهرباء", 1],["الخشب الجاف موصل جيد للكهرباء", 0],["النار تحتاج الأكسجين حتى تشتعل", 1],["الألماس مكون من الكربون", 1],["الزيت يذوب في الماء", 0],["الهواء ليس له وزن", 0],["قلب الإنسان يميل قليلًا لجهة اليسار من الصدر", 1],["الكبد يقدر يجدد نفسه", 1],["الأظافر تطول أسرع من الشعر", 0],["بصمة الإصبع تختلف من شخص لآخر", 1],["الإنسان يخرج الأكسجين مع الزفير أكثر مما يأخذه", 0],["مينا الأسنان أقسى مادة في جسم الإنسان", 1],["أفريقيا أكبر قارة في العالم", 0],["أستراليا قارة ودولة", 1],["تركيا تقع في قارتين", 1],["روسيا أكبر دولة في العالم مساحة", 1],["البحر الميت أخفض نقطة على اليابسة", 1],["البحر الأحمر يفصل بين السعودية ومصر", 1],["الخليج العربي يقع شرق السعودية", 1],["اليابان دولة مكونة من جزر", 1],["سويسرا تطل على البحر", 0],["جبل إيفرست في سلسلة جبال الهيمالايا", 1],["نهر الأمازون في أمريكا الجنوبية", 1],["سيدني عاصمة أستراليا", 0],["إسطنبول عاصمة تركيا", 0],["دبي عاصمة الإمارات", 0],["الرباط عاصمة المغرب", 1],["نيويورك عاصمة الولايات المتحدة", 0],["البرازيليون يتكلمون البرتغالية", 1],["اللغة الرسمية في إيران هي العربية", 0],["العربية من اللغات الرسمية في الأمم المتحدة", 1],["عدد الحروف الشمسية 14 حرفًا", 1],["الشطرنج يُلعب على رقعة 8 × 8", 1],["الوزير أقوى قطعة في الشطرنج", 1],["شعار الألعاب الأولمبية فيه خمس حلقات", 1],["الماراثون أطول من 40 كيلومترًا", 1],["قطر استضافت كأس العالم لكرة القدم 2022", 1],["السعودية استضافت كأس العالم لكرة القدم 2022", 0],["توماس أديسون هو مخترع الهاتف", 0],["الخوارزمي عالم رياضيات مسلم", 1],["ابن سينا اشتهر بالطب", 1],["الإنترنت اختُرع قبل التلفزيون", 0],["الأخوان رايت يُنسب لهم اختراع الطائرة", 1],["الدولة السعودية الأولى تأسست عام 1727", 1],["اليوم الوطني السعودي يوافق 23 سبتمبر", 1],["عملة السعودية هي الدينار", 0],["علم المملكة العربية السعودية فيه سيف", 1],["الريال السعودي فيه 100 هللة", 1],["السنة الهجرية أقصر من السنة الميلادية", 1],["رمضان هو الشهر التاسع في السنة الهجرية", 1],["الحج يكون في شهر شوال", 0],["عيد الأضحى يوم العاشر من ذي الحجة", 1],["صلاة الظهر ثلاث ركعات", 0],["صلاة الجمعة ركعتان", 1],["حاسة الشم عند الكلب أقوى منها عند الإنسان", 1],["البومة تقدر تلف رأسها أكثر من 180 درجة", 1],["كل الجمال لها سنامان", 0],["الفيل الأفريقي أكبر من الفيل الآسيوي", 1],["القرش من الثدييات", 0],["الحصان أسرع من الفهد", 0],["الدجاج ما يقدر يطير أبدًا", 0],["ذكر البعوض يمتص الدم", 0],["نحلة العسل العاملة تموت غالبًا بعد ما تلدغ", 1],["الحرباء تقدر تغير لونها", 1],["الأرنب من القوارض", 0],["الفأر من القوارض", 1],["الماء المالح يتجمد عند درجة أقل من الماء العذب", 1],["المطر يتكون من تكاثف بخار الماء", 1],["نشوف البرق قبل ما نسمع الرعد", 1],["أغلب الزلازل تحدث بسبب حركة الصفائح الأرضية", 1],["الصحراء الكبرى تقع في آسيا", 0],["أغلب الربع الخالي يقع في السعودية", 1],["النخلة تثمر التمر", 1],["ضوء القمر انعكاس لضوء الشمس", 1],["الأرض تحتاج حوالي 365 يومًا لتدور حول الشمس", 1],["الشمس تشرق من الغرب", 0],["الصوت يقدر ينتقل في الفضاء الخارجي", 0],["أصغر عدد أولي هو 1", 0],["مجموع زوايا المثلث 180 درجة", 1],["العدد 0 عدد زوجي", 1],["الصفر اخترعه علماء أوروبا في العصر الحديث", 0],["مكة المكرمة تقع غرب السعودية", 1],["الدمام تطل على البحر الأحمر", 0],["مدينة أبها في جنوب السعودية", 1],["تبوك في شمال السعودية", 1],["الكويت تحد السعودية من الشمال الشرقي", 1],["اليمن يحد السعودية من الجنوب", 1],["البحرين متصلة بالسعودية بجسر", 1],["اللؤلؤ يتكون داخل المحار", 1],["الملح يذوب في الماء", 1],["الطماطم تحتوي على الماء بنسبة كبيرة", 1],["البنفسجي من ألوان قوس قزح", 1],["الأسود من ألوان قوس قزح", 0]];
GAMES.tf=makeQuiz({name:'صح أو خطأ',lbc:'#2E8B57',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3BA56A"/><circle cx="32" cy="50" r="20" fill="#fff"/><path d="M23 50l7 7 12-14" stroke="#2E8B57" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="68" cy="50" r="20" fill="#fff"/><path d="M61 43l14 14M75 43L61 57" stroke="#D43C33" stroke-width="6" stroke-linecap="round"/></svg>`,
  gen(d,rd){const R=srng(d,'tf');const ord=[...TF.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}const [q,t]=TF[ord[rd%ord.length]];return {q,o:['صح ✓','خطأ ✗'],a:t?0:1};}});

/* ---------- scramble ---------- */
const ALLW=Object.values(WORDS).flat().filter(w=>w.length>=3);
GAMES.scr=makeQuiz({name:'رتّب الحروف',lbc:'#B5651D',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D98236"/>${['ق','ل','م'].map((c,k)=>`<rect x="${14+k*26}" y="${30+(k%2)*14}" width="22" height="26" rx="5" fill="#fff" transform="rotate(${(k-1)*12} ${25+k*26} ${43+(k%2)*14})"/><text x="${25+k*26}" y="${50+(k%2)*14}" font-size="18" font-weight="800" fill="#2D4763" text-anchor="middle">${c}</text>`).join('')}</svg>`,
  gen(d,rd){const R=srng(d,'sc'+rd);const w=ALLW[Math.floor(R()*ALLW.length)];let a=[...w];for(let t=0;t<10;t++){for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}if(a.join('')!==w)break;}
    const key=s=>[...s].sort().join(''),kw=key(w);const wr=new Set();let g=0;while(wr.size<3&&g++<500){const x=ALLW[Math.floor(R()*ALLW.length)];if(key(x)!==kw&&Math.abs(x.length-w.length)<=1)wr.add(x);}
    while(wr.size<3){const x=ALLW[Math.floor(R()*ALLW.length)];if(key(x)!==kw)wr.add(x);}
    return {rq:'رتّب الحروف:',q:`<div class="wordbox">${a.map(c=>`<div class="wl">${c}</div>`).join('')}</div>وش الكلمة؟`,...withOptions(R,w,[...wr])};}});

/* ---------- odd one out ---------- */
const ODD=[['🍎','🍌','🍇','🍉','🍓','🍍','🍒','🍑'],['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🦁'],['🚗','🚕','🚌','🚑','🚒','🚓','🚜','🚲'],['⚽','🏀','🏈','⚾','🎾','🏐','🏓'],['☀️','🌧️','⛈️','❄️','🌈','☁️'],['🐟','🐠','🐡','🦈','🐙','🦀','🐬','🐳'],['🎸','🎹','🥁','🎺','🎻','🎷'],['🥕','🌽','🍆','🥦','🥔','🥒','🍅','🌶️'],['👕','👖','👗','👔','🧥','👟','👒','🧢'],['🏠','🏢','🏫','🏥','🏦','🏨','🏪','🕌'],['🔨','🔧','🔩','⛏️','🧰','🪓'],['✏️','📏','📌','📎','✂️','📐','📒','🖍️'],['📱','💻','🖥️','⌨️','🖨️','📷','📺','⌚'],['🍩','🍪','🎂','🍰','🍫','🍬','🍭','🧁'],['☕','🍵','🥛','🧃','🥤','🍹'],['🦅','🦉','🦆','🐧','🦜','🕊️','🐓','🦚'],['🐝','🐞','🦋','🐜','🐛','🦗','🕷️'],['🌙','⭐','🌍','🪐','☄️','🚀','🛸']];
GAMES.odd=makeQuiz({name:'مين المختلف',lbc:'#C0507A',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#DD6E98"/><text x="30" y="44" font-size="26" text-anchor="middle">🍎</text><text x="70" y="44" font-size="26" text-anchor="middle">🍌</text><text x="30" y="80" font-size="26" text-anchor="middle">🍇</text><text x="70" y="80" font-size="26" text-anchor="middle">🚗</text></svg>`,
  gen(d,rd){const R=srng(d,'od'+rd);const a=Math.floor(R()*ODD.length);let b=Math.floor(R()*(ODD.length-1));if(b>=a)b++;
    const g=[...ODD[a]];for(let i=g.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[g[i],g[j]]=[g[j],g[i]];}const x=ODD[b][Math.floor(R()*ODD[b].length)];
    const o=withOptions(R,x,g.slice(0,3));return {q:'أي واحد مختلف عن الباقين؟',o:o.o,a:o.a,big:true};}});

/* ---------- look: the last round shown on the board (worked out from d.res, which the round's resolve wrote) ---------- */
const pqAv=(d,s)=>`<i class="pqav" style="--c:${col(d,s)}">${shapeW(d.pl[s])}</i>`;
const pqSeat=(d,name)=>{for(let s=0;s<d.pl.length;s++)if(nm(d,s)===name)return s;return -1;};
// أقرب تخمين: each player's number, closest first
function closeLast(d){if(!(d.rd>0)||!d.res)return '';const Q=GAMES.close.q(d,d.rd-1);const head=`${Q[0]} الجواب ${Q[1]}. `,k=d.res.lastIndexOf('. الأقرب: ');
  if(!d.res.startsWith(head)||k<head.length)return '';
  const rows=d.res.slice(head.length,k).split('، ').map(t=>{const j=t.lastIndexOf(' ');const s=pqSeat(d,t.slice(0,j)),v=parseFloat(t.slice(j+1));return s>=0&&isFinite(v)?{s,v,df:Math.abs(v-Q[1])}:null;}).filter(Boolean).sort((a,b)=>a.df-b.df);
  if(!rows.length)return '';const mn=rows[0].df;
  return `<div class="pql close"><div class="pqlh"><small>الجواب الصح</small><b>${Q[1]}</b></div><div class="pqlr">${rows.map(r=>`<span class="${r.df===mn?'win':''}" style="--c:${col(d,r.s)}">${pqAv(d,r.s)}<b>${esc(String(r.v))}</b><small>${r.df===0?'بالضبط!':'±'+(+r.df.toFixed(2))}</small></span>`).join('')}</div></div>`;}
// لو خيروك: how the votes split
function majLast(d){if(!(d.rd>0)||!d.res)return '';const Q=GAMES.major.q(d,d.rd-1);const a=Q[0]+' ',m=' • '+Q[1]+' ';
  if(!d.res.startsWith(a))return '';const j=d.res.indexOf(m,a.length);if(j<0)return '';const c0=parseInt(d.res.slice(a.length,j)),c1=parseInt(d.res.slice(j+m.length));
  if(!isFinite(c0)||!isFinite(c1))return '';const t=Math.max(1,c0+c1),p0=Math.round(c0/t*100);
  return `<div class="pql maj"><small>اللي فات</small><div class="pqlab"><span class="a ${c0>c1?'win':''}"><b>${Q[0]}</b><em>${c0}</em></span><span class="b ${c1>c0?'win':''}"><em>${c1}</em><b>${Q[1]}</b></span></div><div class="pqbar"><i class="a" style="width:${c0+c1?p0:50}%"></i><i class="b"></i></div><small>${c0===c1?'تعادل، محد أخذ نقطة':`الأغلبية أخذت نقطة (${c0>c1?p0:100-p0}%)`}</small></div>`;}
// the shared quiz board (quiz.js makeQuiz) already shows the last answer and who got it; this only adds the scope class
function pqWrap(id){const G=GAMES[id],r0=G.render;
  G.render=function(d,ctx){return `<div class="pq pq-${id}">${r0.call(this,d,ctx)}</div>`;};}
['tf','scr','odd'].forEach(pqWrap);

'use strict';
/* n-tiles2b: السرعة، اللقطة، الحرب الكبرى، سوليتير السباق، بشتي، الأزواج الصاعدة، ورق الحظ. Uses the k2 helpers of n-tiles2.js.
   The slap and speed games run in rounds everybody plays at once: each phone times its own tap, the host puts the taps in
   order of those times and resolves them (G.resolve), and a round no one taps closes on the host's clock (G.host). */

/* ---------- shared: timed taps in a round ---------- */
// when this phone first showed round rd (taps are timed from there); bots keep the time they will take
const K2T0={},K2BR={};
const k2Seen=d=>{const k=d.gid+':'+d.rd;if(!(k in K2T0)){K2T0[k]=Date.now();const ks=Object.keys(K2T0);if(ks.length>60)delete K2T0[ks[0]];}return K2T0[k];};
const k2Ms=d=>Math.max(0,Math.min(60000,Date.now()-k2Seen(d)));
const k2BotMs=(d,s,lo,hi)=>{const k=d.gid+':'+d.rd+':'+s;if(!(k in K2BR)){K2BR[k]=lo+rnd(hi-lo);const ks=Object.keys(K2BR);if(ks.length>80)delete K2BR[ks[0]];}return K2BR[k];};
const k2PickOk=p=>p.pick==null||p.pick===NOPICK||(p.pick&&typeof p.pick==='object'&&typeof p.pick.ms==='number'&&isFinite(p.pick.ms));
// who taps on this phone: online only this player; on one phone every human seat still in the round
const k2Tappers=(d,ctx)=>S.mode==='local'?d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1'&&!isBot(d,s)):ctx.v>=0&&d.out[ctx.v]!=='1'?[ctx.v]:[];
const k2TapSeat=(d,ctx,i)=>S.mode==='local'?(Number.isInteger(i)&&i>=0&&i<d.pl.length&&!isBot(d,i)?i:-1):ctx.v;
const k2Pad=(d,s,on,label,cls)=>`<button class="k2pad ${cls||''} ${on?'':'off'}" style="--c:${col(d,s)}" data-ga="slap" data-i="${s}" ${on?'':'disabled'}><b>${label}</b><small>${nm(d,s)}</small></button>`;
const k2Cnt=(d,s)=>(d.st[s]||'').length/2+((d.up&&d.up[s])||'').length/2;

/* =================================================================
   اللقطة (Snap). The whole pack is dealt face down (two packs from 5 players). In turn each player turns his top card onto his
   own face-up pile. As soon as two face-up piles show the same rank anyone may slap (لقطة!): the fastest takes both piles
   under his stack. A wrong slap pays one card to every other player. An empty stack turns its face-up pile over; a player
   with no cards at all is out. The last player with cards wins (after 260 turns: most cards).
   ================================================================= */
const K2SNW=1700;
const k2snMatch=d=>{const tops=d.pl.map((_,s)=>d.up[s]?d.up[s].slice(-2)[0]:null);const m={};tops.forEach((r,s)=>{if(r)(m[r]=m[r]||[]).push(s);});
  const r=Object.keys(m).find(k=>m[k].length>1);return r?m[r]:null;};
function k2snOut(d){let out=d.out;d.pl.forEach((_,s)=>{if(out[s]!=='1'&&!d.sk[s]&&!d.up[s])out=setAt(out,s,'1');});const nd={...d,out};const al=aliveSeats(nd);
  if(al.length===1)return k2Win(nd,al);if(nd.rd>=260){const c=nd.pl.map((_,s)=>nd.out[s]==='1'?-1:k2Cnt(nd,s));return k2Win(nd,k2Best(nd,c,true));}return nd;}
function k2snFlip(d){const s=d.turn;let st=d.sk[s],up=d.up[s];if(!st){st=up;up='';}// an empty stack: the face-up pile turns over
  const c=st.slice(0,2),nd={...d,sk:d.sk.map((x,k)=>k===s?st.slice(2):x),up:d.up.map((x,k)=>k===s?up+c:x),ph:'slap',rd:d.rd+1,t0:Date.now(),lc:{s,c},last:''};
  return nd;}
GAMES.k_snap={name:'اللقطة',cat:'cards',lbc:'#D9582B',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8693A"/><g transform="rotate(-12 34 50)"><rect x="16" y="28" width="34" height="48" rx="5" fill="#fff"/><text x="33" y="62" font-size="24" font-weight="900" text-anchor="middle" fill="#2D4763">Q</text></g><g transform="rotate(10 66 50)"><rect x="50" y="26" width="34" height="48" rx="5" fill="#fff"/><text x="67" y="60" font-size="24" font-weight="900" text-anchor="middle" fill="#D43C33">Q</text></g><path d="M38 16l6 10M50 12v12M62 16l-6 10" stroke="#FFE07A" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="84" r="9" fill="#FFE07A"/><text x="50" y="89" font-size="12" text-anchor="middle">✋</text></svg>`,
  init:n=>{const dk=shuffle(deck52(n>4?2:1)),st=Array(n).fill('');dk.forEach((c,i)=>st[i%n]+=c);return {sk:st,up:Array(n).fill(''),ph:'play',rd:0,t0:0,lc:null,rt:'',last:''};},
  hide:{all:['sk']},privOk:(d,r,o,p)=>k2PickOk(p),
  simulNow:d=>d.ph==='slap',
  points:d=>d.pl.map((_,s)=>d.out[s]==='1'?'—':k2Cnt(d,s)),
  winText:d=>`فاز ${nm(d,d.win)} بالورق كله!`,
  onTimeout(d){return d.ph==='play'?k2snFlip(d):null;},
  // the host closes a round nobody tapped once its time is up
  host(d){if(d.ph!=='slap')return null;if(Date.now()-d.t0<K2SNW)return null;return GAMES.k_snap.resolve(d,simulPicks(d).map(x=>x===undefined?null:x));},
  resolve(d,picks){const m=k2snMatch(d),sl=picks.map((p,s)=>p&&typeof p==='object'&&d.out[s]!=='1'?{s,ms:p.ms}:null).filter(Boolean).sort((a,b)=>a.ms-b.ms);
    let st=[...d.sk],up=[...d.up],msg='',ws=-1;
    if(m&&sl.length){ws=sl[0].s;let got='';for(const s of m){got+=up[s];up[s]='';}st[ws]=st[ws]+got;msg=`لقطة! ${nameTag(d,ws)} أخذ ${got.length/2} ورقة`;}
    else if(sl.length){for(const x of sl){for(const o of aliveSeats(d)){if(o===x.s)continue;let src=st[x.s]?'st':'up';const pile=src==='st'?st[x.s]:up[x.s];if(!pile)break;const c=pile.slice(0,2);
        if(src==='st')st[x.s]=st[x.s].slice(2);else up[x.s]=up[x.s].slice(2);st[o]+=c;}}msg=`${sl.map(x=>nameTag(d,x.s)).join(' و')} لقط غلط ودفع لكل واحد ورقة`;}
    const nd={...d,sk:st,up,ph:'play',rt:sl.length?sl.map(x=>`${nm(d,x.s)} ${(x.ms/1000).toFixed(2)}ث`).join('، '):'',lw:ws,last:msg};
    const x=k2snOut(nd);if(x.win!=null)return x;let t=d.turn;t=nextSeat(x,t);return {...x,turn:t};},
  botDelay:(d,s,lv)=>d.ph!=='slap'?700+rnd(500):k2snMatch(d)?k2BotMs(d,s,...[[0,0],[700,1300],[500,950],[380,700]][lv]):250+rnd(300),
  botPick(d,s,lv){const m=k2snMatch(d);if(m)return Math.random()<[0,.75,.9,.97][lv]?{ms:k2BotMs(d,s,...[[0,0],[700,1300],[500,950],[380,700]][lv])}:null;
    return Math.random()<[0,.06,.02,0][lv]?{ms:400+rnd(500)}:null;},
  bot(d,s){return d.ph==='play'?k2snFlip(d):undefined;},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='slap')return s+'<b class="yt">فيه لقطة؟ اضغط بسرعة!</b>';return s+k2Who(d,ctx)+': اقلب ورقة';},
  render(d,ctx){if(d.ph==='slap')k2Seen(d);const L=d.lc;
    let h=`<div class="k2 k2sn"><div class="k2felt k2snt ${d.n>4?'many':''}">${d.pl.map((_,s)=>{const top=d.up[s].slice(-2),out=d.out[s]==='1';
      return `<div class="k2snp ${d.turn===s&&d.ph==='play'?'on':''} ${out?'done':''} ${d.lw===s?'won':''}" style="--c:${col(d,s)}"><span class="k2snn">${nm(d,s)} <i>${k2Cnt(d,s)}</i></span>
        <div class="k2snc">${d.sk[s]?`<span class="k2snb">${cardHTML('??')}</span>`:'<i class="k2emp"></i>'}${top?`<span class="k2snu" data-k="u${s}-${d.up[s].length}">${cardHTML(top)}</span>`:'<i class="k2emp"></i>'}</div></div>`;}).join('')}</div>`;
    if(d.win!=null)return h+'</div>';
    if(d.ph==='slap'){const T=k2Tappers(d,ctx);h+=`<div class="k2pads">${T.map(s=>k2Pad(d,s,!hasPicked(d,s),hasPicked(d,s)?'✓':'لقطة! ✋')).join('')}</div>`;}
    else{const me=ctx.local?!isBot(d,d.turn):ctx.v===d.turn;h+=me&&ctx.my?`<div class="row"><button class="btn red k2flip" data-ga="flip">اقلب ورقتك 🂠</button></div>`:`<p class="note">${nm(d,d.turn)} يقلب…</p>`;}
    if(d.rt)h+=`<p class="note k2res">${d.rt}</p>`;return h+'</div>';},
  click(a,i,d,ctx){if(d.win!=null)return;
    if(a==='flip'){if(!ctx.my||d.ph!=='play')return;act(k2snFlip(d));return;}
    if(a==='slap'){if(d.ph!=='slap')return;const s=k2TapSeat(d,ctx,i);if(s<0||d.out[s]==='1'||hasPicked(d,s))return;simulPick(d,s,{ms:k2Ms(d)});render();}}};
HELP.k_snap='الورق كله يتوزع مقلوب (ولو كنتوا 5 وفوق كوتشينتين). بالدور كل واحد يقلب ورقة من كومته على كومته المكشوفة. أول ما تصير ورقتين مكشوفات فوق بنفس الرقم عند أي اثنين، اضغط «لقطة!» بسرعة: الأسرع ياخذ الكومتين المكشوفات ويحطها تحت كومته. اللي يضغط غلط (ما فيه ورقتين متشابهات) يدفع ورقة لكل واحد. لو خلصت كومتك تنقلب كومتك المكشوفة وتكمّل منها، واللي يخلص ورقه كله يطلع. آخر واحد يبقى معه ورق يفوز (ولو طالت مرة، بعد 260 قلبة يفوز صاحب أكثر ورق). على نفس الجوال كل واحد له زر بلونه.';

/* =================================================================
   الحرب الكبرى (Egyptian Ratscrew-style slap war). The pack is dealt face down. In turn each plays his top card onto the
   middle pile. A picture or an ace is a challenge: the next player must turn up to 4 cards for an ace, 3 for a king, 2 for a
   queen, 1 for a jack; a new picture passes the challenge on, and if none comes the challenger takes the pile. At any card
   anyone may slap the pile when it shows: a double (two of a rank together), a sandwich (same rank with one card between),
   ten (two cards in a row adding to 10, ace 1), or a wedding (king and queen together). The fastest right slap takes the pile
   and plays next; a wrong slap burns a card under the pile. Out of cards you may still slap back in (a wrong slap then puts
   you out). Whoever holds every card wins (after 400 cards: most cards).
   ================================================================= */
const K2ERW=1600,K2ERN={A:4,K:3,Q:2,J:1};
const k2erNum=c=>c[0]==='A'?1:'TJQK'.includes(c[0])?(c[0]==='T'?10:0):+c[0];
function k2erRule(p){const c=cardsOf(p);if(c.length<2)return null;const a=c[c.length-1],b=c[c.length-2],z=c[c.length-3];
  if(a[0]===b[0])return 'دبل';if(z&&a[0]===z[0])return 'سندويتش';const x=k2erNum(a),y=k2erNum(b);if(x&&y&&x+y===10)return 'عشرة';
  if((a[0]==='K'&&b[0]==='Q')||(a[0]==='Q'&&b[0]==='K'))return 'عرس';return null;}
const k2erHas=(d,s)=>d.out[s]!=='1'&&!!d.sk[s];
function k2erNextP(d,from){const n=d.pl.length;for(let k=1;k<=n;k++){const s=(from+k)%n;if(k2erHas(d,s))return s;}return -1;}
function k2erEnd(d){const al=d.pl.map((_,s)=>s).filter(s=>k2erHas(d,s));
  if(al.length===1&&!d.pot)return k2Win(d,al);
  if(d.rd>=400){const c=d.pl.map((_,s)=>d.out[s]==='1'?-1:d.sk[s].length/2);return k2Win(d,k2Best(d,c,true));}return null;}
function k2erPlay(d){const s=d.turn,c=d.sk[s].slice(0,2);const sk=d.sk.map((x,k)=>k===s?x.slice(2):x);let ch=d.ch;
  if(K2ERN[c[0]])ch={by:s,left:K2ERN[c[0]]};else if(ch)ch={...ch,left:ch.left-1};
  return {...d,sk,pot:d.pot+c,ch,ph:'slap',rd:d.rd+1,t0:Date.now(),lc:{s,c},last:''};}
// after a round nobody won by slapping: the challenge settles or play moves on
function k2erOn(d){const s=d.lc?d.lc.s:d.turn;
  if(d.ch&&d.ch.left<=0){const w=d.ch.by,n=d.pot.length/2;const nd={...d,sk:d.sk.map((x,k)=>k===w?x+d.pot:x),pot:'',ch:null,last:`${nameTag(d,w)} كسب التحدي وأخذ ${n} ورقة`};
    const e=k2erEnd(nd);if(e)return e;return {...nd,turn:k2erHas(nd,w)?w:k2erNextP(nd,w)};}
  // a challenge goes on with the same player until it ends or he turns a picture
  if(d.ch&&d.ch.by!==s&&k2erHas(d,s))return {...d,turn:s};
  const t=k2erNextP(d,s);
  // nobody holds a card any more: the last player keeps the pile
  if(t<0){const nd={...d,sk:d.sk.map((x,k)=>k===s?x+d.pot:x),pot:'',ch:null};return k2erEnd(nd)||{...nd,turn:s};}
  return {...d,turn:t};}
GAMES.k_ers={name:'الحرب الكبرى',cat:'cards',lbc:'#7B2D26',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8E342C"/><circle cx="50" cy="52" r="38" fill="#A8453B"/>${[-18,-6,6].map((r,i)=>`<g transform="rotate(${r} 50 60)"><rect x="34" y="${30-i*2}" width="32" height="44" rx="5" fill="#fff" stroke="#DCE3EC"/></g>`).join('')}<text x="52" y="62" font-size="22" font-weight="900" text-anchor="middle" fill="#2D4763" transform="rotate(6 50 60)">K</text><path d="M58 8c8 0 12 6 12 12v14l-8 6-6-6V22c0-3-2-4-4-4" fill="#FFD6A5" stroke="#8E342C" stroke-width="2"/><path d="M74 34l6-6M80 40l7-3M76 46l7 1" stroke="#FFE07A" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  init:n=>{const dk=shuffle(deck52(n>4?2:1)),st=Array(n).fill('');dk.forEach((c,i)=>st[i%n]+=c);return {sk:st,pot:'',ch:null,ph:'play',rd:0,t0:0,lc:null,rt:'',lw:-1,last:''};},
  hide:{all:['sk']},privOk:(d,r,o,p)=>k2PickOk(p),
  simulNow:d=>d.ph==='slap',
  points:d=>d.pl.map((_,s)=>d.out[s]==='1'?'—':d.sk[s].length/2),
  winText:d=>`فاز ${nm(d,d.win)}!`,
  onTimeout(d){return d.ph==='play'?k2erPlay(d):null;},
  onSkip(nd,d){if(nd.win!=null)return nd;return nd.ph==='play'&&!k2erHas(nd,nd.turn)?{...nd,turn:k2erNextP(nd,nd.turn)}:nd;},
  host(d){if(d.ph!=='slap')return null;if(Date.now()-d.t0<K2ERW)return null;return GAMES.k_ers.resolve(d,simulPicks(d).map(x=>x===undefined?null:x));},
  resolve(d,picks){const rule=k2erRule(d.pot),sl=picks.map((p,s)=>p&&typeof p==='object'&&d.out[s]!=='1'?{s,ms:p.ms}:null).filter(Boolean).sort((a,b)=>a.ms-b.ms);
    const res=sl.length?sl.map(x=>`${nm(d,x.s)} ${(x.ms/1000).toFixed(2)}ث`).join('، '):'';let nd={...d,ph:'play',rt:res,lw:-1};
    if(rule&&sl.length){const w=sl[0].s,n=d.pot.length/2;nd={...nd,sk:d.sk.map((x,k)=>k===w?x+d.pot:x),pot:'',ch:null,lw:w,last:`${rule}! ${nameTag(d,w)} ضرب أول وأخذ ${n} ورقة`};
      const e=k2erEnd(nd);if(e)return e;return {...nd,turn:w};}
    if(sl.length){let st=[...nd.sk],pot=nd.pot,out=nd.out;const bad=[];
      for(const x of sl){if(st[x.s]){pot=st[x.s].slice(0,2)+pot;st[x.s]=st[x.s].slice(2);}else out=setAt(out,x.s,'1');bad.push(nameTag(d,x.s));}
      nd={...nd,sk:st,pot,out,last:`${bad.join(' و')} ضرب غلط${sl.some(x=>!d.sk[x.s])?' (واللي بدون ورق طلع)':' ودفن ورقة'}`};
      const al=aliveSeats(nd);if(al.length===1)return k2Win(nd,al);}
    return k2erOn(nd);},
  botDelay:(d,s,lv)=>d.ph!=='slap'?650+rnd(500):k2erRule(d.pot)?k2BotMs(d,s,...[[0,0],[750,1350],[520,950],[380,720]][lv]):250+rnd(300),
  botPick(d,s,lv){if(k2erRule(d.pot))return Math.random()<[0,.7,.88,.97][lv]?{ms:k2BotMs(d,s,...[[0,0],[750,1350],[520,950],[380,720]][lv])}:null;
    return d.sk[s]&&Math.random()<[0,.05,.015,0][lv]?{ms:500+rnd(400)}:null;},
  bot(d){return d.ph==='play'?k2erPlay(d):undefined;},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='slap')return s+'<b class="yt">تضرب؟ بسرعة!</b>';
    return s+k2Who(d,ctx)+(d.ch?`: تحدي ${nm(d,d.ch.by)}، باقي ${d.ch.left}`:': نزّل ورقة');},
  render(d,ctx){if(d.ph==='slap')k2Seen(d);const P=cardsOf(d.pot),show=P.slice(-3);
    let h=`<div class="k2 k2er">${k2Seats(d,s=>`<i>${d.out[s]==='1'?'✗':d.sk[s].length/2}</i>${d.ch&&d.ch.by===s?'<u>👑</u>':''}`,s=>d.turn===s&&d.ph==='play'&&d.win==null)}
      <div class="k2felt k2ert"><div class="k2erpot">${show.length?show.map((c,j)=>`<span class="k2erc" style="--j:${j-show.length+1}" data-k="e${P.length-show.length+j}">${cardHTML(c,true)}</span>`).join(''):'<p class="note">الوسط فاضي</p>'}</div>
      <div class="k2erinf"><span>بالوسط ${P.length}</span>${d.ch?`<span class="k2ch">👑 ${nm(d,d.ch.by)} يتحدّى • باقي ${d.ch.left}</span>`:''}</div>
      <div class="k2rules"><span>دبل</span><span>سندويتش</span><span>عشرة</span><span>عرس 👑👸</span></div></div>`;
    if(d.win!=null)return h+'</div>';
    if(d.ph==='slap'){const T=k2Tappers(d,ctx);h+=`<div class="k2pads">${T.map(s=>k2Pad(d,s,!hasPicked(d,s),hasPicked(d,s)?'✓':'اضرب! ✋')).join('')}</div>`;}
    else{const me=ctx.local?!isBot(d,d.turn):ctx.v===d.turn;h+=me&&ctx.my?`<div class="row"><button class="btn red k2flip" data-ga="flip">نزّل ورقة</button></div>`:`<p class="note">${nm(d,d.turn)} ينزّل…</p>`;}
    if(d.rt)h+=`<p class="note k2res">${d.rt}</p>`;return h+'</div>';},
  click(a,i,d,ctx){if(d.win!=null)return;
    if(a==='flip'){if(!ctx.my||d.ph!=='play'||!d.sk[d.turn])return;act(k2erPlay(d));return;}
    if(a==='slap'){if(d.ph!=='slap')return;const s=k2TapSeat(d,ctx,i);if(s<0||d.out[s]==='1'||hasPicked(d,s))return;simulPick(d,s,{ms:k2Ms(d)});render();}}};
HELP.k_ers='الورق كله يتوزع مقلوب. بالدور كل واحد ينزّل ورقة من كومته على الوسط. لو نزلت صورة أو إكة صارت «تحدي»: اللي بعده لازم ينزّل لين 4 أوراق للإكة، 3 للشايب، 2 للبنت، 1 للولد، ولو طلعت له صورة ينتقل التحدي للي بعده، ولو ما طلعت ياخذ صاحب التحدي الوسط كله. ومع كل ورقة تقدر «تضرب» الوسط بسرعة لو صار فيه: «دبل» ورقتين نفس الرقم ورا بعض، «سندويتش» نفس الرقم وبينهم ورقة، «عشرة» ورقتين ورا بعض مجموعهم 10 (الإكة 1)، أو «عرس» شايب وبنت جنب بعض. أسرع ضربة صح تاخذ الوسط كله وصاحبها يبدأ. الضربة الغلط تدفن ورقة من كومتك تحت الوسط. لو خلص ورقك تقدر تضرب وترجع، بس لو ضربت غلط وأنت بدون ورق تطلع. اللي يجمع الورق كله يفوز (ولو طالت، بعد 400 ورقة يفوز صاحب أكثر ورق).';

/* =================================================================
   السرعة (Speed). Everyone plays at once. Each player holds five cards and a face-down pile; the middle has piles (2 for 2-3
   players, 3 for 4-5, 4 for 6-8) and a reserve. In each round every player may put one card on a middle pile one rank above
   or below its top (ace and king join); the host takes the taps in order of the time each phone measured, so a slower card
   that no longer fits goes back to the hand. Hands refill to five from the own pile. When nobody can play, a new card from
   the reserve goes on every middle pile. The first to get rid of every card wins (after 400 rounds: fewest cards).
   ================================================================= */
const K2SPW=9000;
const k2spAdj=(a,b)=>{const x=k2rv(a),y=k2rv(b),g=Math.abs(x-y);return g===1||g===12;};
const k2spLegal=(d,s)=>{const o=[];cardsOf(d.hands[s]).forEach((c,i)=>d.mid.forEach((p,j)=>{if(k2spAdj(c,p.slice(-2)))o.push([c,j]);}));return o;};
const k2spLeft=(d,s)=>d.hands[s].length/2+d.dk[s].length/2;
function k2spInit(n){const dk=shuffle(deck52(n>4?2:1)),P=n<=3?2:n<=5?3:4;const mid=dk.splice(0,P);const res=dk.splice(0,P*5);const per=Math.floor(dk.length/n);
  const hands=[],own=[];for(let s=0;s<n;s++){const c=dk.splice(0,per);hands.push(c.slice(0,5).join(''));own.push(c.slice(5).join(''));}
  return {hands,dk:own,mid,res:res.concat(dk).join(''),rd:0,t0:0,lp:[],res2:'',lt:''};}
function k2spStuck(d){let res=d.res,mid=d.mid;if(res.length/2<mid.length){const under=mid.flatMap(p=>cardsOf(p.slice(0,-2)));res=res+shuffle(under).join('');mid=mid.map(p=>p.slice(-2));}
  if(res.length/2<mid.length)return {...d,mid,res};mid=mid.map((p,j)=>p+res.slice(j*2,j*2+2));return {...d,mid,res:res.slice(mid.length*2),lt:'محد عنده لعب، انقلبت أوراق جديدة بالوسط'};}
GAMES.k_speed={name:'السرعة',cat:'cards',lbc:'#1F6FB2',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2A82C9"/><path d="M8 70l26-40h10L18 70z" fill="#5DA9E2"/><path d="M22 76l26-40h10L32 76z" fill="#8CC3EE"/><g transform="rotate(-8 64 50)"><rect x="46" y="26" width="34" height="48" rx="5" fill="#fff"/><text x="63" y="58" font-size="22" font-weight="900" text-anchor="middle" fill="#D43C33">7</text></g><g transform="rotate(12 76 56)"><rect x="60" y="34" width="30" height="42" rx="5" fill="#fff" stroke="#DCE3EC"/><text x="75" y="62" font-size="20" font-weight="900" text-anchor="middle" fill="#2D4763">8</text></g><path d="M40 14h22l-6 10h12L46 46l6-16H40z" fill="#FFE07A"/></svg>`,
  init:n=>k2spInit(n),start:d=>({...d,t0:Date.now()}),
  mask:(d,v)=>d.win!=null?d:{...d,hands:d.hands.map((h,s)=>s===v?h:k2Hide(h)),dk:k2Hide(d.dk),res:k2Hide(d.res)},
  privOk:(d,r,o,p)=>{if(p.pick==null||p.pick===NOPICK)return true;const x=p.pick;return !!x&&typeof x==='object'&&typeof x.ms==='number'&&typeof x.c==='string'&&Number.isInteger(x.p)&&cardsOf(d.hands[d.pl.indexOf(r)]).includes(x.c);},
  noTimer:true,
  points:d=>d.pl.map((_,s)=>k2spLeft(d,s)),
  winText:d=>`فاز ${nm(d,d.win)}، خلّص ورقه أول واحد! ⚡`,
  // the round closes as soon as everyone who can play has tapped, at once when nobody can, else when the time is up
  host(d){const pk=simulPicks(d),al=aliveSeats(d),can=al.filter(s=>k2spLegal(d,s).length);
    const close=can.every(s=>pk[s]!==undefined)&&(can.length||Date.now()-d.t0>900)||Date.now()-d.t0>K2SPW;
    return close?GAMES.k_speed.resolve(d,pk.map(x=>x===undefined?null:x)):null;},
  resolve(d,picks){let hands=[...d.hands],dk=[...d.dk],mid=[...d.mid];const lp=[],late=[];
    const ord=picks.map((p,s)=>p&&typeof p==='object'&&d.out[s]!=='1'?{s,...p}:null).filter(Boolean).sort((a,b)=>a.ms-b.ms);let win=null;
    for(const x of ord){if(win!=null)break;const p=mid[x.p];if(!p||!cardsOf(hands[x.s]).includes(x.c)||!k2spAdj(x.c,p.slice(-2))){late.push(x.s);continue;}
      mid[x.p]=p+x.c;hands[x.s]=k2Rm(hands[x.s],x.c);while(hands[x.s].length<10&&dk[x.s]){hands[x.s]+=dk[x.s].slice(0,2);dk[x.s]=dk[x.s].slice(2);}
      lp.push({s:x.s,c:x.c,p:x.p,ms:x.ms});if(!hands[x.s]&&!dk[x.s])win=x.s;}
    let nd={...d,hands,dk,mid,lp,rd:d.rd+1,t0:Date.now(),lt:lp.length?'':ord.length?'':'',res2:late.length?late.map(s=>nm(d,s)).join(' و')+' تأخر':''};
    if(win!=null)return k2Win(nd,[win]);
    if(!lp.length&&!aliveSeats(nd).some(s=>k2spLegal(nd,s).length))nd=k2spStuck(nd);
    if(nd.rd>=400){const c=nd.pl.map((_,s)=>k2spLeft(nd,s));return k2Win(nd,k2Best(nd,c,false));}
    return nd;},
  botDelay:(d,s,lv)=>k2spLegal(d,s).length?k2BotMs(d,s,...[[0,0],[1500,2700],[1000,1800],[650,1200]][lv]):300+rnd(300),
  botPick(d,s,lv){const L=k2spLegal(d,s);if(!L.length)return null;const ms=k2BotMs(d,s,...[[0,0],[1500,2700],[1000,1800],[650,1200]][lv]);
    if(lv===1||lvRand(lv)){const m=pickR(L);return {c:m[0],p:m[1],ms};}
    // the card that leaves another play after it (a run in the hand), and a pile the others are less likely to take
    const H=cardsOf(d.hands[s]);const sc=L.map(([c,j])=>({c,j,v:H.filter(x=>x!==c&&k2spAdj(x,c)).length*2+(lv===3?-d.lp.filter(q=>q.p===j).length:0)+Math.random()}));
    sc.sort((a,b)=>b.v-a.v);return {c:sc[0].c,p:sc[0].j,ms};},
  status(d,ctx){const ln=(d.lt||d.res2)?`<small>${[d.lt,d.res2].filter(Boolean).join(' • ')}</small><br>`:'';
    if(S.mode==='local')return ln+'<b class="yt">كل واحد يلعب ورقة بأسرع وقت!</b>';return ln+(ctx.v>=0&&hasPicked(d,ctx.v)?'<b>لعبت، ننتظر الجولة</b>':'<b class="yt">العب ورقة بسرعة!</b>');},
  render(d,ctx){k2Seen(d);const T=k2Tappers(d,ctx);
    let h=`<div class="k2 k2sp">${k2Seats(d,s=>`<i>${k2spLeft(d,s)}</i>`,s=>false)}<div class="k2felt k2spt"><div class="k2spm">${d.mid.map((p,j)=>{const lp=d.lp.find(q=>q.p===j);
      return `<div class="k2spp" ${lp?`style="--c:${col(d,lp.s)}"`:''}><span class="k2spc ${lp?'lp':''}" data-k="m${j}-${p.length}">${cardHTML(p.slice(-2),true)}</span><small>${cardsOf(p).length}</small></div>`;}).join('')}</div>
      <span class="k2spr">الاحتياط ${d.res.length/2}</span></div>`;
    if(d.win!=null)return h+'</div>';
    for(const s of T){const H=cardsOf(d.hands[s]),pk=hasPicked(d,s),sel=Array.isArray(S.k2sps)&&S.k2sps[0]===d.gid+':'+d.rd+':'+s?S.k2sps[1]:-1;
      h+=`<div class="k2sph ${pk?'done':''}" style="--c:${col(d,s)}"><div class="k2sphn"><b>${nm(d,s)}</b><small>بكومتك ${d.dk[s].length/2}</small>${pk?'<em>✓ لعبت</em>':!H.some(c=>d.mid.some(p=>k2spAdj(c,p.slice(-2))))?'<em class="no">ما عندك لعب، انتظر</em>':''}</div><div class="k2sphc">${H.map((c,i)=>{const fit=d.mid.some(p=>k2spAdj(c,p.slice(-2)));
        return !pk&&fit?`<button class="bcard ${sel===i?'sel':''}" data-ga="card" data-i="${s*10+i}">${cardHTML(c)}</button>`:`<span class="bcard ${pk?'':'dim'}">${cardHTML(c)}</span>`;}).join('')}</div>
        ${sel>=0&&!pk?`<div class="k2spto">${d.mid.map((p,j)=>k2spAdj(H[sel],p.slice(-2))?`<button class="btn navy" data-ga="to" data-i="${s*10+j}">على ${k2Lab(p.slice(-2))}</button>`:'').join('')}</div>`:''}</div>`;}
    if(!T.length)h+='<p class="note">تتفرج</p>';return h+'</div>';},
  click(a,i,d,ctx){if(d.win!=null||!Number.isInteger(i))return;const s=k2TapSeat(d,ctx,Math.floor(i/10)),k=i%10;if(s<0||d.out[s]==='1'||hasPicked(d,s))return;const H=cardsOf(d.hands[s]);
    if(a==='card'){const c=H[k];if(!c)return;const ps=d.mid.map((p,j)=>k2spAdj(c,p.slice(-2))?j:-1).filter(j=>j>=0);if(!ps.length)return;
      if(ps.length===1){S.k2sps=null;simulPick(d,s,{c,p:ps[0],ms:k2Ms(d)});render();return;}S.k2sps=[d.gid+':'+d.rd+':'+s,k];render();return;}
    if(a==='to'){const sel=Array.isArray(S.k2sps)&&S.k2sps[0]===d.gid+':'+d.rd+':'+s?S.k2sps[1]:-1;const c=H[sel];if(!c||!d.mid[k]||!k2spAdj(c,d.mid[k].slice(-2)))return;S.k2sps=null;simulPick(d,s,{c,p:k,ms:k2Ms(d)});render();}}};
GAMES.k_speed.net={local:['card'],ui:['k2sps']};
HELP.k_speed='لعبة السرعة: الكل يلعب بنفس الوقت. كل واحد معه 5 أوراق بيده وكومة مقلوبة له، وبالوسط كومات مكشوفة (2 لين 3 لاعبين، 3 لـ4 و5، و4 من 6 وفوق) واحتياط. بكل جولة كل واحد يقدر يحط ورقة وحدة على أي كومة بالوسط لو رقمها أعلى أو أقل بواحد من اللي فوق (الإكة تمشي مع الشايب ومع الاثنين). الجوال يحسب سرعتك، وصاحب الغرفة يرتب الأوراق حسب الأسرع: لو سبقك أحد وصارت ورقتك ما تمشي ترجع ليدك. بعد ما تلعب تكمّل يدك لين 5 من كومتك. لو محد عنده لعب تنقلب ورقة جديدة على كل كومة من الاحتياط. أول واحد يخلّص ورقه كله يفوز. على نفس الجوال كل واحد له صف بلونه ويلعب منه.';

/* =================================================================
   سوليتير السباق (a Klondike race). Everyone plays the same deal at once, each on his own board: seven columns (1 to 7 cards,
   the top one up), the stock turned one card at a time with no limit on passes. Build the columns down in alternating
   colours (only a king on an empty column), the four home piles up by suit from the ace. The first to bring all 52 home
   wins; when everyone stops (or after 10 minutes) the most cards home wins, then the fewer moves. Online each board lives
   in its player's private part on the host, its face-down cards and stock hidden even from him; every move is played by
   the host. On one phone the players take turns on the same deal and the most cards home (then the quicker) wins.
   ================================================================= */
const K2KL=600000,K2KS='shdc';
const k2kRed=c=>'hd'.includes(c[1]);
function k2kNew(dk){const cs=cardsOf(dk),t=[],dn=[];let k=0;for(let c=0;c<7;c++){t.push(cs.slice(k,k+c+1).join(''));dn.push(c);k+=c+1;}
  return {t,dn,sk:cs.slice(k).join(''),w:'',f:[0,0,0,0],mv:0,h:0,cy:0};}
const k2kTopF=(p,j)=>p.f[j]?K2R[p.f[j]-1]+K2KS[j]:null;
const k2kOnT=(p,c,col)=>{const T=p.t[col];if(!T)return c[0]==='K';const top=T.slice(-2);return k2kRed(top)!==k2kRed(c)&&k2rv(top)===k2rv(c)+1;};
const k2kOnF=(p,c)=>k2rv(c)===p.f[K2KS.indexOf(c[1])]+1;
// the cards a source holds: [col*100+k] a run in a column, 700 the waste top, 800+j a home pile top
function k2kSrc(p,src){if(src===700)return p.w?[p.w.slice(-2)]:null;if(src>=800){const c=k2kTopF(p,src-800);return c?[c]:null;}
  const c=Math.floor(src/100),k=src%100,T=cardsOf(p.t[c]||'');if(c>6||k<p.dn[c]||k>=T.length)return null;return T.slice(k);}
function k2kCan(p,src,dst){const cs=k2kSrc(p,src);if(!cs)return false;if(dst===8)return cs.length===1&&src<800&&k2kOnF(p,cs[0]);
  if(dst<0||dst>6||(src<700&&Math.floor(src/100)===dst))return false;return k2kOnT(p,cs[0],dst);}
function k2kMove(p,src,dst){if(!k2kCan(p,src,dst))return null;const cs=k2kSrc(p,src);const q={...p,t:[...p.t],dn:[...p.dn],f:[...p.f],mv:p.mv+1,cy:0};
  if(src===700)q.w=p.w.slice(0,-2);else if(src>=800)q.f[src-800]--;else{const c=Math.floor(src/100),k=src%100;q.t[c]=p.t[c].slice(0,k*2);if(q.dn[c]>0&&q.t[c].length/2<=q.dn[c])q.dn[c]=q.t[c].length/2-1;}
  if(dst===8)q.f[K2KS.indexOf(cs[0][1])]++;else q.t[dst]+=cs.join('');q.h=q.f.reduce((a,x)=>a+x,0);return q;}
function k2kStock(p){if(p.sk)return {...p,sk:p.sk.slice(2),w:p.w+p.sk.slice(0,2),mv:p.mv+1,cy:p.cy+1};if(!p.w)return null;return {...p,sk:p.w,w:'',mv:p.mv+1,cy:p.cy+1};}
// a tap on a card: home if it can, else the first column that takes it (a king to an empty column only if it frees a card)
function k2kAuto(p,src){if(k2kCan(p,src,8))return k2kMove(p,src,8);const k=src<700?src%100:0;
  for(let c=0;c<7;c++){if(!p.t[c]&&src<700&&k===0)continue;if(k2kCan(p,src,c))return k2kMove(p,src,c);}return null;}
// the moves a sensible player makes, best first (the bot)
function k2kHint(p,lv){const opts=[];
  for(let c=0;c<7;c++){const T=cardsOf(p.t[c]);if(!T.length)continue;const top=(c*100)+T.length-1;if(k2kCan(p,top,8))opts.push([top,8,lv===1?3:10+(13-k2rv(T[T.length-1]))*.1]);}
  if(p.w&&k2kCan(p,700,8))opts.push([700,8,lv===1?3:9.5]);
  for(let c=0;c<7;c++){const T=cardsOf(p.t[c]);if(!T.length)continue;const k=p.dn[c],src=c*100+k;if(k>=T.length)continue;
    for(let d=0;d<7;d++){if(d===c||!k2kCan(p,src,d))continue;if(!p.t[d]&&k===0)continue;opts.push([src,d,p.dn[c]>0?8+p.dn[c]*.1:!p.t[d]?0:k===0?6:0]);}}
  if(p.w){for(let d=0;d<7;d++)if(k2kCan(p,700,d))opts.push([700,d,p.t[d]?5:p.w.slice(-2)[0]==='K'?4.5:0]);}
  const good=opts.filter(o=>o[2]>0).sort((a,b)=>b[2]-a[2]);if(lv===1&&good.length>1&&Math.random()<.3)good.shift();return good[0]||null;}
const k2kStuck=p=>p.cy>p.sk.length/2+p.w.length/2+1;
function k2kResult(d,picks){const hs=d.pl.map((r,s)=>{const p=S.priv[r];const x=picks&&picks[s]&&typeof picks[s]==='object'?picks[s]:null;return {h:p&&p.gid===d.gid?p.h:x?x.h:0,mv:p&&p.gid===d.gid?p.mv:x?x.mv:999,ms:x&&x.ms||K2KL};});
  const al=aliveSeats(d);const best=al.slice().sort((a,b)=>hs[b].h-hs[a].h||hs[a].ms-hs[b].ms||hs[a].mv-hs[b].mv)[0];
  const ws=al.filter(s=>hs[s].h===hs[best].h&&hs[s].ms===hs[best].ms&&hs[s].mv===hs[best].mv);
  return {...k2Win(d,ws),rt:al.map(s=>`${nm(d,s)} ${hs[s].h}`).join('، ')};}
const k2kMine=(d,v,ctx)=>{const r=d.pl[v];const p=(S.mode==='local'?S.priv:ctx.priv||S.priv)[r];return p&&p.gid===d.gid&&p.t?p:null;};
const k2kMulti=d=>S.mode==='local'&&humanSeats(d).length>1;
function k2kDone(d,s,p){return {...p,pick:{h:p.h,mv:p.mv,ms:Math.max(1,Date.now()-(p.st||d.t0))}};}
GAMES.k_soli={name:'سوليتير السباق',cat:'cards',lbc:'#1E7A52',teams:'none',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#22885B"/>${[0,1,2,3].map(k=>`<rect x="${10+k*21}" y="10" width="17" height="24" rx="3" fill="${k===0?'#fff':'rgba(255,255,255,.25)'}"/>`).join('')}<text x="18.5" y="27" font-size="12" font-weight="900" text-anchor="middle" fill="#D43C33">A</text>${[0,1,2].map(c=>[0,1,2].map(r=>r<=c?`<rect x="${14+c*26}" y="${44+r*12}" width="20" height="28" rx="3" fill="${r===c?'#fff':'#2D4763'}" stroke="#fff" stroke-width="1"/>`:'').join('')).join('')}<path d="M70 82h22M82 74l10 8-10 8" stroke="#FFE07A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  init:n=>({dk:shuffle(deck52()).join(''),rd:0,t0:0,rt:''}),start:d=>({...d,t0:Date.now()}),
  hide:{all:['dk']},
  privInit:d=>({...k2kNew(d.dk),rd:d.rd}),
  privOk:()=>false,
  privShow:(d,seat,role,p,own)=>{if(!p||!p.t)return p;if(own||d.win!=null){const t=p.t.map((T,c)=>cardsOf(T).map((x,k)=>k<p.dn[c]?'??':x).join(''));return {...p,t,sk:k2Hide(p.sk)};}
    return {gid:p.gid,rd:p.rd,h:p.h,mv:p.mv,...(p.pick!=null?{pick:1}:{})};},
  net:{local:['c'],host:['to','auto','stk','done']},
  viewer:d=>simulViewer(d),coverMsg:()=>'نفس التوزيعة للكل، جاهز؟',
  points:d=>d.pl.map((r)=>{const p=S.priv[r];return p&&p.gid===d.gid&&p.h!=null?p.h+' 🏠':'—';}),
  winText:d=>`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')}!`,winExtra:d=>d.rt?'بالبيوت: '+d.rt:'',
  // the host ends the race: a full board (unless the players share one phone), or time
  host(d){const multi=k2kMulti(d);
    if(!multi&&d.pl.some(r=>S.priv[r]&&S.priv[r].gid===d.gid&&S.priv[r].h===52))return k2kResult(d,simulPicks(d));
    if(!multi&&Date.now()-d.t0>K2KL)return k2kResult(d,simulPicks(d));
    // bots on this phone move at their own pace
    if(S.mode==='local'){S.k2kb=S.k2kb||{};let moved=0;for(const s of aliveSeats(d)){if(!isBot(d,s)||hasPicked(d,s))continue;const r=d.pl[s],p=S.priv[r];if(!p||p.gid!==d.gid)continue;const lv=botLv(d,s),k=d.gid+s;
      if(!S.k2kb[k])S.k2kb[k]=Date.now()+1500;if(Date.now()<S.k2kb[k])continue;S.k2kb[k]=Date.now()+[0,1500,1000,700][lv]+rnd(300);
      const m=k2kHint(p,lv);let q=m?k2kMove(p,m[0],m[1]):null;if(!q){q=k2kStuck(p)?null:k2kStock(p);}
      if(!q||q.h===52)q=k2kDone(d,s,q||p);S.priv[r]={...q,gid:d.gid,rd:d.rd};moved=1;}
      // on one phone a bot's move is a new state too (the bots' boards live in their private parts)
      if(moved)return {...d,bm:(d.bm||0)+1};}
    return null;},
  resolve:(d,picks)=>k2kResult(d,picks),
  botPick:()=>undefined,botDelay:()=>1e9,
  status(d,ctx){if(d.win!=null)return '';const v=ctx.v,p=v>=0?k2kMine(d,v,ctx):null;const left=Math.max(0,K2KL-(Date.now()-d.t0));
    const others=d.pl.map((r,s)=>{const q=(ctx.priv||S.priv)[r];return s===v?'':`${nm(d,s)} ${q&&q.h!=null?q.h:0}${hasPicked(d,s)?'✓':''}`;}).filter(Boolean).join('، ');
    return `<small>${others}</small><br>`+(p?(hasPicked(d,v)?'<b>خلّصت، ننتظر الباقين</b>':`<b class="yt">بيوتك ${p.h} من 52</b>`):'تتفرج')+(k2kMulti(d)?'':` • <span data-until="${Date.now()+left}">${Math.ceil(left/1000)}</span> ث`);},
  render(d,ctx){const v=ctx.v;if(d.win!=null||v<0)return `<div class="k2 k2kl"><p class="note">${d.rt?'بالبيوت: '+d.rt:'تتفرج على السباق'}</p></div>`;
    const p=k2kMine(d,v,ctx);if(!p)return '<div class="k2 k2kl"><p class="note">نجهز التوزيعة…</p></div>';const my=ctx.my&&!hasPicked(d,v);
    const sel=Array.isArray(S.sel)&&S.sel[0]===d.gid+':kl'?S.sel[1]:null,cs=sel!=null?k2kSrc(p,sel):null;const src=cs?sel:null;
    const can=dst=>src!=null&&k2kCan(p,src,dst);
    const top=`<div class="k2kltop"><${my?'button data-ga="stk"':'div'} class="k2kls">${p.sk?cardHTML('??'):'<i class="k2kre">↻</i>'}<small>${p.sk.length/2}</small></${my?'button':'div'}>
      <div class="k2klw">${p.w?`<${my?`button data-ga="${src===700?'auto':'c'}" data-i="700"`:'div'} class="k2kc ${src===700?'sel':''}" data-k="w${p.w.length}">${cardHTML(p.w.slice(-2))}</${my?'button':'div'}>`:'<i class="k2kslot"></i>'}</div><span class="k2klg"></span>
      ${[0,1,2,3].map(j=>{const c=k2kTopF(p,j);return `<${my&&(can(8)&&cs[0][1]===K2KS[j]||c)?`button data-ga="${can(8)&&cs[0][1]===K2KS[j]?'to':'c'}" data-i="${can(8)&&cs[0][1]===K2KS[j]?8:800+j}"`:'div'} class="k2klf ${can(8)&&cs[0][1]===K2KS[j]?'tgt':''} ${src===800+j?'sel':''}">${c?cardHTML(c):`<i class="k2kslot">${K2SN[K2KS[j]]}</i>`}</${my&&(can(8)&&cs[0][1]===K2KS[j]||c)?'button':'div'}>`;}).join('')}</div>`;
    const cols=p.t.map((T,c)=>{const C=cardsOf(T);const tg=can(c);let y=0;
      const cards=C.map((x,k)=>{const down=k<p.dn[c],top=y;y+=down?9:20;const s0=c*100+k,isSel=src!=null&&src<700&&Math.floor(src/100)===c&&k>=src%100;
        const ga=tg?'to':down?null:isSel&&k===src%100?'auto':'c',i=tg?c:s0;
        return `<${my&&ga?`button data-ga="${ga}" data-i="${i}"`:'div'} class="k2kc ${isSel?'sel':''} ${tg&&k===C.length-1?'tgt':''}" style="top:${top}px" data-k="c${c}-${k}-${down?'d':x}">${cardHTML(down?'??':x)}</${my&&ga?'button':'div'}>`;}).join('');
      return `<div class="k2klc" style="height:${Math.max(70,y+54)}px">${!C.length?`<${tg&&my?`button data-ga="to" data-i="${c}"`:'div'} class="k2kslot ${tg?'tgt':''}">K</${tg&&my?'button':'div'}>`:''}${cards}</div>`;}).join('');
    let h=`<div class="k2 k2kl"><div class="k2felt k2klt">${top}<div class="k2klb">${cols}</div></div>`;
    if(my)h+=k2Btns([[0,'خلاص، ما عندي حركات','soft']],'done');return h+'</div>';},
  click(a,i,d,ctx){if(d.win!=null)return;const v=ctx.v;if(v<0||hasPicked(d,v))return;const r=d.pl[v],p=S.priv[r];if(!p||p.gid!==d.gid||!p.t)return;
    if(a==='c'){const cs=k2kSrc(p,i);if(!cs)return;S.sel=[d.gid+':kl',i];render();return;}
    const st=p.st||Date.now(),put=q=>{S.sel=[];setPriv(r,{...q,st,gid:d.gid,rd:d.rd,...(q.h===52?{pick:{h:52,mv:q.mv,ms:Math.max(1,Date.now()-st)}}:{})});};
    if(a==='stk'){const q=k2kStock(p);if(q)put(q);return;}
    if(a==='done'){S.sel=[];setPriv(r,{...k2kDone(d,v,p),st});return;}
    if(a==='auto'){const q=k2kAuto(p,i);if(q)put(q);else{S.sel=[];render();}return;}
    if(a==='to'){const src=Array.isArray(S.sel)&&S.sel[0]===d.gid+':kl'?S.sel[1]:null;if(src==null)return;const q=k2kMove(p,src,i);if(q)put(q);else{S.sel=[];render();}}}};
HELP.k_soli='سباق سوليتير (كلوندايك): الكل يلعب نفس التوزيعة بنفس الوقت، كل واحد على لوحه. فيه 7 أعمدة (من ورقة لين 7، اللي فوق مكشوفة) وكومة تقلب منها ورقة ورقة وتعيدها كل ما خلصت. رتّب الأعمدة نازل بألوان متبادلة (أحمر على أسود)، والعمود الفاضي ما ينحط فيه إلا شايب، وطلّع الأوراق للبيوت الأربعة فوق من الإكة لين الشايب بنفس النوع. اضغط ورقة عشان تختارها وبعدها اضغط مكانها، ولو ضغطتها مرتين تروح لأحسن مكان. أول واحد يطلّع الـ52 كلها للبيوت يفوز، ولو وقف الكل (زر «خلاص») أو خلص الوقت (10 دقايق) يفوز صاحب أكثر أوراق بالبيوت. على نفس الجوال كل واحد يلعب دوره على نفس التوزيعة، والأكثر بالبيوت (وبعده الأسرع) يفوز.';

/* ---------- sides that score together: the engine's teams, partners across a table of four, else each alone ---------- */
const k2Side=(d,s)=>d.tm?d.tm[s]:d.pairs?s%2:s;
const k2Sides=d=>[...new Set(d.pl.map((_,s)=>k2Side(d,s)))];
const k2Si=(d,s)=>k2Sides(d).indexOf(k2Side(d,s));
const k2SideWin=(d,t)=>k2Win(d,d.pl.map((_,s)=>s).filter(s=>k2Side(d,s)===t));

/* =================================================================
   بشتي (Pişti, the Turkish fishing game; pagat.com). One pack (two from 5 players). Four cards go to the middle, three face
   down and the top one up (never a jack); everyone gets four, and four more each time the hands are empty. Play a card on
   the pile: the same rank takes the whole pile, a jack takes it whatever it is; otherwise the card stays on top. Taking a
   lone card with its match is a pişti (10), a lone jack with a jack 20 (not with the very last card). At the end the pile
   left goes to the last taker. Each jack and ace 1, 2♣ 2, 10♦ 3, most cards 3 (none on a tie). Four players play in
   partnerships (opposite). 151 wins.
   ================================================================= */
const K2PV=151;
const k2piPts=c=>(c[0]==='J'||c[0]==='A'?1:0)+(c==='2c'?2:0)+(c==='Td'?3:0);
function k2piDeal4(d){let dk=d.dk;const hands=[...d.hands],ord=[...Array(d.pl.length)].map((_,j)=>(d.dl+1+j)%d.pl.length).filter(s=>d.out[s]!=='1');
  if(dk.length/2>=ord.length*4){for(const s of ord){hands[s]=dk.slice(0,8);dk=dk.slice(8);}}else{let j=0;while(dk.length){hands[ord[j%ord.length]]+=dk.slice(0,2);dk=dk.slice(2);j++;}}
  return {...d,hands,dk};}
function k2piDeal(d){const cs=shuffle(deck52(d.pl.length>4?2:1));const pot=cs.splice(0,4);while(pot[3][0]==='J'){const j=pot.pop();cs.splice(8+rnd(cs.length-8),0,j);pot.push(cs.shift());}
  const k=k2Sides(d).length;const nd=k2piDeal4({...d,dk:cs.join(''),pot:pot.join(''),hid:3,caps:Array(k).fill(''),pis:Array(k).fill(0),lc:-1,lm:null,ph:'play',sum:null,hands:d.hands.map(()=>'')});
  return {...nd,turn:nextSeat(nd,nd.dl)};}
function k2piPlay(d,c){const s=d.turn,hands=[...d.hands];hands[s]=k2Rm(hands[s],c);const P=cardsOf(d.pot),top=P[P.length-1];
  const lastCard=!d.dk&&hands.every(h=>!h);let nd={...d,hands},msg;
  if(top&&(c[0]===top[0]||c[0]==='J')){const t=k2Si(d,s),caps=[...d.caps],pis=[...d.pis];caps[t]+=d.pot+c;let p=0;
    if(P.length===1&&d.hid===0&&c[0]===top[0]&&!lastCard){p=c[0]==='J'?20:10;pis[t]+=p;}
    nd={...nd,caps,pis,pot:'',hid:0,lc:s,lm:{s,c,n:P.length,p}};msg=`${nameTag(d,s)} أخذ ${P.length+1} ورقة${p?` وصارت بشتي! +${p}`:''}`;}
  else{nd={...nd,pot:d.pot+c,lm:{s,c,n:0,p:0}};msg=`${nameTag(d,s)} نزّل ${k2Lab(c)}`;}
  nd.last=msg;
  if(hands.some((h,k)=>h&&d.out[k]!=='1'))return {...nd,turn:nextSeat(nd,s)};
  if(nd.dk){const x=k2piDeal4(nd);return {...x,turn:nextSeat(x,s)};}
  return k2piScore(nd);}
function k2piScore(d){const caps=[...d.caps];if(d.pot&&d.lc>=0)caps[k2Si(d,d.lc)]+=d.pot;const cnt=caps.map(x=>x.length/2),mx=Math.max(...cnt),top=cnt.filter(x=>x===mx).length===1?cnt.indexOf(mx):-1;
  const add=caps.map((x,i)=>cardsOf(x).reduce((a,c)=>a+k2piPts(c),0)+d.pis[i]+(i===top?3:0));const sc=d.sc.map((x,i)=>x+add[i]);
  const nd={...d,caps,pot:'',sc,ph:'sum',sum:{add,cnt,top},turn:nextSeat(d,d.dl),last:'انتهت الجولة'};
  const hi=Math.max(...sc);if(hi>=K2PV&&sc.filter(x=>x===hi).length===1)return k2SideWin(nd,k2Sides(d)[sc.indexOf(hi)]);return nd;}
const k2piNext=d=>({...k2piDeal({...d,dl:nextSeat(d,d.dl)}),last:''});
GAMES.k_pishti={name:'بشتي',cat:'cards',lbc:'#B03A48',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C24A57"/><circle cx="50" cy="52" r="38" fill="#2E9A62"/><g transform="rotate(-14 42 52)"><rect x="26" y="30" width="30" height="42" rx="5" fill="#fff"/><text x="41" y="58" font-size="20" font-weight="900" text-anchor="middle" fill="#2D4763">9</text></g><g transform="rotate(12 60 50)"><rect x="46" y="28" width="30" height="42" rx="5" fill="#fff" stroke="#F0B429" stroke-width="2.5"/><text x="61" y="56" font-size="20" font-weight="900" text-anchor="middle" fill="#D43C33">9</text></g><rect x="30" y="76" width="40" height="14" rx="7" fill="#F0B429"/><text x="50" y="87" font-size="11" font-weight="900" text-anchor="middle" fill="#5A3B00">+10</text></svg>`,
  init:n=>({pairs:n===4,dl:n-1,hands:Array(n).fill(''),dk:'',pot:'',hid:3,caps:[],pis:[],sc:[],lc:-1,lm:null,ph:'play',sum:null,last:''}),
  start:d=>{const x={...d,pairs:!d.tm&&d.pl.length===4};return k2piDeal({...x,sc:k2Sides(x).map(()=>0)});},
  mask:(d,v)=>d.win!=null?d:d.ph==='sum'?{...d,dk:k2Hide(d.dk)}:{...d,hands:d.hands.map((h,s)=>s===v?h:k2Hide(h)),dk:k2Hide(d.dk),pot:'??'.repeat(Math.min(d.hid,d.pot.length/2))+d.pot.slice(d.hid*2)},
  redeal:d=>d.win!=null?d:{...k2piDeal(d),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.pl.map((_,s)=>d.sc[k2Si(d,s)]),
  winText:d=>`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بـ${d.sc[k2Si(d,d.win)]} نقطة`,
  onTimeout(d){if(d.ph==='sum')return k2piNext(d);return k2piPlay(d,cardsOf(d.hands[d.turn])[0]);},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';return s+k2Who(d,ctx)+` • الهدف ${K2PV}`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v&&d.ph==='play';const P=cardsOf(d.pot),show=P.slice(-4);
    let h=`<div class="k2 k2pi">${k2Seats(d,s=>`<i>${cardsOf(d.hands[s]).length}</i><em>${d.sc[k2Si(d,s)]}</em>${d.pairs&&!d.tm?`<u>${s%2?'🔷':'🔶'}</u>`:''}`,s=>d.turn===s&&d.ph==='play'&&d.win==null)}
      <div class="k2felt k2pit"><div class="k2mid">${k2Stock(d.dk.length/2,false)}<div class="k2pipot">${show.length?show.map((c,j)=>{const at=P.length-show.length+j;return `<span class="k2pic" style="--j:${j-show.length+1}" data-k="p${at}${at<d.hid?"b":c}">${cardHTML(at<d.hid?"??":c,true)}</span>`;}).join(''):'<p class="note">فاضي</p>'}<small>بالوسط ${P.length}</small></div></div>
      ${d.lm&&d.lm.p?`<div class="k2piw" data-k="w${d.lm.c}${d.lm.n}"><b>بشتي! +${d.lm.p}</b></div>`:''}
      <div class="k2tot">${k2Sides(d).map((t,i)=>{const ss=d.pl.map((_,s)=>s).filter(s=>k2Side(d,s)===t);return `<span style="--c:${col(d,ss[0])}">${ss.map(s=>nm(d,s)).join(' و')}: ${d.caps[i].length/2} ورقة${d.pis[i]?` • بشتي ${d.pis[i]}`:''}</span>`;}).join('')}</div></div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel k2sum"><h3>نتيجة الجولة</h3>${k2Sides(d).map((t,i)=>{const ss=d.pl.map((_,s)=>s).filter(s=>k2Side(d,s)===t);return `<div class="bsr"><span>${ss.map(s=>nameTag(d,s)).join(' و')}</span><em>${r.cnt[i]} ورقة${r.top===i?' (الأكثر +3)':''} • +${r.add[i]}</em><b>${d.sc[i]}</b></div>`;}).join('')}${ctx.my?k2Next(d):''}</div>`;return h+'</div>';}
    if(v<0)return h+'</div>';const H=cardsOf(d.hands[v]);return h+k2Hand(d,v,H.map((_,i)=>i),my)+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'){if(d.ph==='sum')act(k2piNext(d));return;}if(d.ph!=='play'||a!=='card')return;const c=cardsOf(d.hands[d.turn])[i];if(c)act(k2piPlay(d,c));}};
HELP.k_pishti='بشتي لعبة صيد تركية. كل واحد ياخذ 4 أوراق، وبالوسط 4 أوراق: 3 مقلوبة وفوقها وحدة مكشوفة. بالدور نزّل ورقة على الكومة: لو نفس رقم اللي فوق تاخذ الكومة كلها، والولد ياخذ الكومة مهما كان اللي فوق، وغير كذا ورقتك تقعد فوق. لو أخذت ورقة وحدة لحالها بنفس رقمها هذي «بشتي» بـ10 نقاط، وولد على ولد لحاله 20 (إلا آخر ورقة باللعب). كل ما تخلص الأيادي تتوزع 4 ثانية، وبالأخير اللي بقى بالوسط ياخذه آخر واحد أخذ. النقاط: كل ولد وإكة 1، الاثنين سباتي 2، العشرة ديناري 3، والأكثر أوراق 3. الأربعة يلعبون فريقين: كل اثنين متقابلين (أو حسب الفرق). أول من يوصل 151 يفوز. لو كنتوا 5 وفوق نلعب بكوتشينتين.';
// the bot: counts the ranks gone; takes whenever it can (with a jack only for a pile worth it), and when it must lay a card
// it picks one whose rank is mostly gone, so the next player cannot make a pişti of it
GAMES.k_pishti.bot=(d,s,lv)=>{if(d.ph==='sum')return k2piNext(d);const H=cardsOf(d.hands[s]),P=cardsOf(d.pot),top=P[P.length-1];
  if(lv===1&&Math.random()<.45)return k2piPlay(d,pickR(H));
  const seen={};for(const c of [...P.slice(d.hid),...H,...d.caps.flatMap(cardsOf)])seen[c[0]]=(seen[c[0]]||0)+1;const per=d.pl.length>4?8:4;
  const val=P.reduce((a,c)=>a+k2piPts(c),0)+P.length*.25;
  const opts=H.map(c=>{let v=0;if(top&&c[0]===top[0])v=10+val+(P.length===1&&d.hid===0?12:0);else if(top&&c[0]==='J')v=val>2.5||P.length>=4?6+val:-4;
    else{v=-k2piPts(c)*2-(per-(seen[c[0]]||0))*(lv===3?1.2:.6)-(c[0]==='J'?6:0);if(!P.length)v-=(per-(seen[c[0]]||0))*1.5;}return {c,v:v+Math.random()*.2};});
  return k2piPlay(d,opts.sort((a,b)=>b.v-a.v)[0].c);};
GAMES.k_pishti.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(600);

/* =================================================================
   الأزواج الصاعدة (Rummy 500; pagat.com). One pack with two jokers (two packs and four jokers from 5 players); 13 cards
   each for two players, 7 for more. The discards lie spread out: draw the stock, or take any discard together with every
   card above it, but then the deepest card you took must go into a meld this turn (taking only the top card, you may not
   throw it back). Meld sets (3-4 of a rank, all suits different) and runs (3+ of a suit in order, ace low or high, not
   round the corner); a joker stands for any card. Lay off on anybody's meld; it scores for you. Then discard. Going out
   (meld or discard your last card) ends the hand, so does an empty stock nobody uses. Melded cards score: 2-9 their number,
   10-K 10, ace 15 (1 in A-2-3), joker 15; cards in hand count against you. First to 500 wins.
   ================================================================= */
const k2rmJ=c=>c==='XX';
const k2rmV=c=>k2rmJ(c)?15:c[0]==='A'?15:'TJQK'.includes(c[0])?10:+c[0];
const K2RMR='A23456789TJQKA';// run positions 1..14 (14: ace high)
// a set of cards as a meld: {g, f: the faces in order, j: which of them are jokers}, or null
function k2rmMeld(cs,two){if(cs.length<3)return null;const J=cs.filter(k2rmJ).length,nat=cs.filter(c=>!k2rmJ(c));if(!nat.length)return null;
  if(nat.every(c=>c[0]===nat[0][0])&&cs.length<=4&&new Set(nat.map(c=>c[1])).size===nat.length)return {g:1,f:[...nat,...Array(J).fill(nat[0][0]+'x')],j:'0'.repeat(nat.length)+'1'.repeat(J)};
  const su=nat[0][1];if(!nat.every(c=>c[1]===su))return null;
  for(const hiA of [false,true]){const v=nat.map(c=>c[0]==='A'?(hiA?14:1):k2rv(c)).sort((a,b)=>a-b);if(new Set(v).size!==v.length)continue;
    let lo=v[0],hi=v[v.length-1];const gaps=hi-lo+1-v.length;if(gaps>J)continue;let extra=J-gaps;while(extra>0&&hi<14&&!(lo===1&&hi===13)){hi++;extra--;}while(extra>0&&lo>1){lo--;extra--;}
    if(extra>0||(lo===1&&hi===14))continue;const f=[],j=[];for(let x=lo;x<=hi;x++){f.push(K2RMR[x-1]+su);j.push(v.includes(x)?'0':'1');}return {g:0,f,j:j.join(''),lo,hi};}
  return null;}
const k2rmLoHi=m=>{const a=m.f[0][0]==='A'&&m.f.length>1&&m.f[1][0]==='2'?1:K2RMR.indexOf(m.f[0][0])+1;return [a,a+m.f.length-1];};
// laying card c off on meld m: the meld it makes, or null
function k2rmAdd(m,c){if(m.g){if(m.f.length>=4)return null;if(k2rmJ(c))return {...m,f:[...m.f,m.f[0][0]+'x'],j:m.j+'1'};
    if(c[0]!==m.f[0][0]||m.f.some((x,i)=>m.j[i]==='0'&&x[1]===c[1]))return null;return {...m,f:[...m.f,c],j:m.j+'0'};}
  const [lo,hi]=k2rmLoHi(m),su=m.f.find((x,i)=>m.j[i]==='0')[1];
  if(k2rmJ(c)){if(hi<14&&!(lo===1&&hi===13))return {...m,f:[...m.f,K2RMR[hi]+su],j:m.j+'1'};if(lo>1)return {...m,f:[K2RMR[lo-2]+su,...m.f],j:'1'+m.j};return null;}
  if(c[1]!==su)return null;const r=k2rv(c);
  if((r===hi+1&&hi<13)||(c[0]==='A'&&hi===13&&lo>1))return {...m,f:[...m.f,c],j:m.j+'0'};
  if(r===lo-1)return {...m,f:[c,...m.f],j:'0'+m.j};return null;}
// what melded cards score: an ace low in a run 1
const k2rmMV=(m,i)=>m.j[i]==='1'?15:m.f[i][0]==='A'?(!m.g&&k2rmLoHi(m)[0]===1&&i===0?1:15):k2rmV(m.f[i]);
const k2rmHand=h=>cardsOf(h).reduce((a,c)=>a+k2rmV(c),0);
function k2rmDeck(n){const a=deck52(n>4?2:1);for(let k=0;k<(n>4?4:2);k++)a.push('XX');return shuffle(a);}
const k2rmSort=h=>cardsOf(h).sort((a,b)=>k2rmJ(a)-k2rmJ(b)||(k2rmJ(a)?0:'shdc'.indexOf(a[1])-'shdc'.indexOf(b[1])||k2rv(a)-k2rv(b))).join('');
function k2rmDeal(d){const n=d.pl.length,dk=k2rmDeck(n),k=aliveSeats(d).length===2?13:7,hands=Array(n).fill('');
  for(let s=0;s<n;s++)if(d.out[s]!=='1')hands[s]=k2rmSort(dk.splice(0,k).join(''));const up=dk.shift();
  return {...d,hands,dk:dk.join(''),disc:up,mel:[],mp:Array(n).fill(0),ph:'draw',must:'',tk:'',turn:nextSeat(d,d.dl),sum:null,lm:-1,last:''};}
const k2rmNext=d=>k2rmDeal({...d,dl:nextSeat(d,d.dl)});
function k2rmTake(d,j){const s=d.turn,D=cardsOf(d.disc);if(j<0||j>=D.length)return d;const got=D.slice(j),hands=[...d.hands];hands[s]=k2rmSort(hands[s]+got.join(''));
  return {...d,hands,disc:D.slice(0,j).join(''),ph:'play',must:j===D.length-1?'':D[j],tk:j===D.length-1?D[j]:'',last:`${nameTag(d,s)} أخذ ${got.length} من المرمي`};}
function k2rmDraw(d){const s=d.turn;if(!d.dk)return k2rmEnd(d,-1);const hands=[...d.hands];hands[s]=k2rmSort(hands[s]+d.dk.slice(0,2));return {...d,hands,dk:d.dk.slice(2),ph:'play',must:'',tk:'',last:`${nameTag(d,s)} سحب`};}
function k2rmPut(d,cs){const s=d.turn,m=k2rmMeld(cs,d.pl.length>4);if(!m)return d;let h=d.hands[s];for(const c of cs)h=k2Rm(h,c);const hands=[...d.hands];hands[s]=h;
  const mp=[...d.mp];mp[s]+=m.f.reduce((a,_,i)=>a+k2rmMV(m,i),0);const nd={...d,hands,mel:[...d.mel,{o:s,...m}],mp,must:cs.includes(d.must)?'':d.must,lm:d.mel.length,last:`${nameTag(d,s)} نزّل ملف`};
  return h?nd:k2rmEnd(nd,s);}
function k2rmOff(d,c,k){const s=d.turn,M=d.mel[k],m=M&&k2rmAdd(M,c);if(!m)return d;const hands=[...d.hands];hands[s]=k2Rm(hands[s],c);
  const i=!m.g&&m.f[0]!==M.f[0]?0:m.f.length-1;const mp=[...d.mp];mp[s]+=k2rmMV(m,i);
  const nd={...d,hands,mel:d.mel.map((x,q)=>q===k?{...x,f:m.f,j:m.j}:x),mp,must:c===d.must?'':d.must,lm:k,last:`${nameTag(d,s)} زاد على ملف`};return hands[s]?nd:k2rmEnd(nd,s);}
function k2rmDisc(d,c){const s=d.turn,hands=[...d.hands];hands[s]=k2Rm(hands[s],c);const nd={...d,hands,disc:d.disc+c,ph:'draw',must:'',tk:'',turn:nextSeat(d,s),last:`${nameTag(d,s)} رمى ${k2rmJ(c)?'جوكر':k2Lab(c)}`};
  return hands[s]?nd:k2rmEnd(nd,s);}
function k2rmEnd(d,w){const add=d.pl.map((_,s)=>d.out[s]==='1'?0:d.mp[s]-k2rmHand(d.hands[s]));const sc=d.sc.map((x,s)=>x+add[s]);
  const nd={...d,sc,ph:'sum',sum:{w,add},last:w>=0?`${nameTag(d,w)} خلّص ورقه`:'خلصت الكومة'};
  const hi=Math.max(...aliveSeats(d).map(s=>sc[s]));if(hi>=500){const top=aliveSeats(d).filter(s=>sc[s]===hi);if(top.length===1)return k2Win(nd,top);}return nd;}
// can the card that must be melded still go into a meld or onto one?
const k2rmCanUse=(d,H,c)=>k2rmFind(H,d.pl.length>4).some(m=>m.includes(c))||d.mel.some(m=>k2rmAdd(m,c));
const k2rmFree=(d,s)=>!d.must||!k2rmCanUse(d,cardsOf(d.hands[s]),d.must);
const k2rmMini=(f,j)=>j==='1'?`<div class="card mini jk k2rmj"><b>★</b><i>${f[0]==='T'?'10':f[0]}</i></div>`:miniCard(f);
const k2rmCard=c=>k2rmJ(c)?(typeof hCard==='function'?hCard(c):'<div class="card jk"></div>'):cardHTML(c);
GAMES.k_r500={name:'الأزواج الصاعدة',cat:'cards',lbc:'#5A3E8E',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#6B4CA6"/>${[0,1,2].map(k=>`<g transform="translate(${12+k*15} ${18+k*8})"><rect width="26" height="36" rx="4" fill="#fff" stroke="#DCE3EC"/><text x="13" y="24" font-size="15" font-weight="900" text-anchor="middle" fill="#2D4763">${5+k}</text></g>`).join('')}<path d="M66 64l14-24 8 5" stroke="#FFE07A" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="74" width="64" height="16" rx="8" fill="#F0B429"/><text x="50" y="86.5" font-size="12" font-weight="900" text-anchor="middle" fill="#3D2A63">500</text></svg>`,
  init:n=>({dl:n-1,hands:Array(n).fill(''),dk:'',disc:'',mel:[],mp:Array(n).fill(0),sc:Array(n).fill(0),ph:'draw',must:'',tk:'',lm:-1,sum:null,last:''}),
  start:d=>k2rmDeal(d),
  mask:(d,v)=>d.win!=null?d:d.ph==='sum'?{...d,dk:k2Hide(d.dk)}:{...d,hands:d.hands.map((h,s)=>s===v?h:k2Hide(h)),dk:k2Hide(d.dk)},
  redeal:d=>d.win!=null?d:{...k2rmDeal(d),last:'انعادت الجولة من جديد'},
  net:{local:['card','clr']},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.sc.slice(),
  winText:d=>`فاز ${nm(d,d.win)} بـ${d.sc[d.win]} نقطة`,
  onTimeout(d){if(d.ph==='sum')return k2rmNext(d);if(d.ph==='draw')return k2rmDraw(d);const s=d.turn;
    if(d.must){const B=GAMES.k_r500.botPlay(d,s,2);if(B!==d)return B;}const c=cardsOf(d.hands[s]).find(x=>x!==d.tk&&x!==d.must)||cardsOf(d.hands[s])[0];return k2rmDisc(d,c);},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';const me=!ctx.local&&d.turn===ctx.v;
    const w=d.ph==='draw'?'اسحب أو خذ من المرمي':d.must?`لازم تنزّل ${k2Lab(d.must)} بملف`:'نزّل ملفات أو ارمِ';return s+(me?`<b class="yt">${w}</b>`:`دور ${nameTag(d,d.turn)}`);},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v&&d.ph!=='sum';const D=cardsOf(d.disc);
    let h=`<div class="k2 k2rm">${k2Seats(d,s=>`<i>${cardsOf(d.hands[s]).length}</i><em>${d.sc[s]}</em>${d.mp[s]?`<u>+${d.mp[s]}</u>`:''}`,s=>d.turn===s&&d.ph!=='sum'&&d.win==null)}`;
    h+=`<div class="k2felt k2rmt"><div class="k2rmtop">${k2Stock(d.dk.length/2,my&&d.ph==='draw','draw')}<div class="k2rmd">${D.map((c,j)=>`<${my&&d.ph==='draw'?`button data-ga="take" data-i="${j}"`:'span'} class="k2rmdc" data-k="d${j}${c}">${k2rmJ(c)?k2rmMini('★x','1'):miniCard(c)}</${my&&d.ph==='draw'?'button':'span'}>`).join('')||'<small>المرمي فاضي</small>'}</div></div>
      <div class="k2rmm">${d.mel.map((m,k)=>`<span class="k2rmml ${k===d.lm?'lp':''}" style="--c:${col(d,m.o)}" data-k="m${k}">${m.f.map((f,i)=>k2rmMini(f,m.j[i])).join('')}</span>`).join('')||'<p class="note">ما فيه ملفات للحين</p>'}</div></div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel k2sum"><h3>${r.w>=0?nameTag(d,r.w)+' خلّص 🏆':'خلصت الكومة'}</h3>${d.pl.map((_,s)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>${r.add[s]>=0?'+':''}${r.add[s]}</em><b>${d.sc[s]}</b></div>`).join('')}${ctx.my?k2Next(d):''}</div>`;return h+'</div>';}
    if(v<0)return h+'</div>';const H=cardsOf(d.hands[v]),sel=my&&d.ph==='play'?k2Sel(d,'rm',d.hands[v]):[],cs=sel.map(i=>H[i]).filter(Boolean);
    if(my&&d.ph==='play'){const xs=[];const m=cs.length>=3?k2rmMeld(cs,d.pl.length>4):null;if(m)xs.push([0,'نزّل الملف','green']);
      if(cs.length===1){d.mel.forEach((M,k)=>{if(k2rmAdd(M,cs[0]))xs.push([10+k,`زِد على ملف ${nm(d,M.o)} (${M.f.map(f=>f[0]==='T'?'10':f[0]).join('')})`,'blue']);});
        if(cs[0]!==d.tk&&k2rmFree(d,v))xs.push([1,'ارمِ الورقة','navy']);}
      if(cs.length)xs.push([2,'إلغاء الاختيار','soft']);h+=k2Btns(xs,'do');if(d.must&&!k2rmFree(d,v))h+=`<p class="hint k2hint">لازم تنزّل ${k2Lab(d.must)} بملف أو تزيدها على ملف قبل ما ترمي</p>`;}
    else if(my&&d.ph==='draw'&&!d.dk)h+=k2Btns([[3,'خلصت الكومة، أنهِ الجولة','red']],'do');
    const ids=handIds(H,'kr'+v+'-');
    h+=`<p class="lbl hlbl">بيدك ${k2rmHand(d.hands[v])} نقطة • نزّلت ${d.mp[v]}</p><div class="bhand k2hand ${H.length>12?'big':''}">${H.map((c,i)=>`<button class="bcard ${sel.includes(i)?'sel':''} ${c===d.must?'k2new':''}" id="${ids[i]}" ${my&&d.ph==='play'?`data-ga="card" data-i="${i}"`:'disabled'}>${k2rmCard(c)}</button>`).join('')}</div>`;
    return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.turn;if(a==='next'){if(d.ph==='sum')act(k2rmNext(d));return;}if(d.ph==='sum')return;const hs=d.hands[s];
    if(a==='draw'){if(d.ph==='draw')act(k2rmDraw(d));return;}
    if(a==='take'){if(d.ph!=='draw')return;const D=cardsOf(d.disc);if(!D[i])return;if(i<D.length-1&&!k2rmCanUse(d,[...cardsOf(hs),...D.slice(i)],D[i])){toast('ما تقدر تاخذها: لازم تنزّلها بملف بنفس الدور');return;}act(k2rmTake(d,i));return;}
    if(d.ph!=='play')return;
    if(a==='card'){const H=cardsOf(hs);if(!H[i])return;const sel=k2Sel(d,'rm',hs);S.sel=[k2Key(d,'rm',hs),...(sel.includes(i)?sel.filter(x=>x!==i):[...sel,i])];render();return;}
    if(a==='do'){const H=cardsOf(hs),sel=k2Sel(d,'rm',hs),cs=sel.map(x=>H[x]).filter(Boolean);
      if(i===2){S.sel=[];render();return;}if(i===3){if(!d.dk)act(k2rmEnd(d,-1));return;}
      if(i===0){if(!k2rmMeld(cs,d.pl.length>4))return;S.sel=[];act(k2rmPut(d,cs));return;}
      if(i===1){if(cs.length!==1||cs[0]===d.tk||!k2rmFree(d,s))return;S.sel=[];act(k2rmDisc(d,cs[0]));return;}
      if(i>=10){if(cs.length!==1||!d.mel[i-10])return;S.sel=[];act(k2rmOff(d,cs[0],i-10));}}}};
HELP.k_r500='رمي 500: كوتشينة مع جوكرين (ومن 5 لاعبين وفوق كوتشينتين و4 جواكر). لو كنتوا اثنين كل واحد 13 ورقة، وأكثر 7. المرمي يكون مفروش وتشوفه كله: في دورك اسحب من الكومة، أو خذ أي ورقة من المرمي مع كل اللي فوقها، بس لازم تنزّل أعمق ورقة أخذتها بملف بنفس الدور (ولو أخذت آخر ورقة بس ما ترجع ترميها). الملفات: 3 أو 4 من نفس الرقم بأنواع مختلفة، أو 3 وفوق من نفس النوع بالتسلسل (الإكة تحت أو فوق بس ما تلف)، والجوكر يصير أي ورقة. تقدر تزيد على ملفات أي أحد والنقاط لك. بعدها ارمِ ورقة. اللي يخلّص ورقه (بملف أو برمية) تخلص الجولة، وكذلك لو خلصت الكومة ومحد يبي المرمي. الملفات تنحسب لك: من 2 لين 9 برقمها، 10 والصور 10، الإكة 15 (و1 في إكة 2 3)، الجوكر 15، واللي بيدك ينقص منك. أول من يوصل 500 يفوز.';
// the bot: melds every set and run it holds (jokers fill the gaps), lays off what fits, takes from the discards when the
// deepest card it needs makes a meld and the cards it picks up are worth it, and throws the card it can least use
// (hard: never one the next player could lay off)
function k2rmFind(H,two){const nat=H.filter(c=>!k2rmJ(c)),J=H.filter(k2rmJ),out=[];const byR={};nat.forEach(c=>{(byR[c[0]]=byR[c[0]]||[]).push(c);});
  for(const r in byR){const u=[];for(const c of byR[r])if(!u.some(x=>x[1]===c[1]))u.push(c);if(u.length>=3)out.push(u.slice(0,4));else if(u.length===2&&J.length)out.push([...u,J[0]]);}
  for(const su of 'shdc'){const cs=nat.filter(c=>c[1]===su);const rk=new Set(cs.map(k2rv));if(rk.has(1))rk.add(14);const R=[...rk].sort((a,b)=>a-b);
    for(let i=0;i<R.length;i++){let run=[R[i]];for(let j=i+1;j<R.length&&R[j]===run[run.length-1]+1;j++)run.push(R[j]);
      const card=x=>cs.find(c=>(x===14?1:x)===k2rv(c));if(run.length>=3){out.push(run.map(card));i+=run.length-1;continue;}
      if(J.length&&run.length===2)out.push([...run.map(card),J[0]]);else if(J.length&&R[i+1]===R[i]+2)out.push([card(R[i]),card(R[i+1]),J[0]]);}}
  return out.filter(m=>k2rmMeld(m,two));}
GAMES.k_r500.botPlay=(d,s,lv)=>{const two=d.pl.length>4;let H=cardsOf(d.hands[s]);
  let ms=k2rmFind(H,two);if(d.must)ms.sort((a,b)=>b.includes(d.must)-a.includes(d.must));if(lv===1)ms=ms.filter(()=>Math.random()<.7);
  if(ms.length&&(lv>1||!d.must||ms[0].includes(d.must)))return k2rmPut(d,ms[0]);
  for(const c of H){if(k2rmJ(c)&&lv>1&&H.length>2)continue;for(let k=0;k<d.mel.length;k++)if(k2rmAdd(d.mel[k],c))return k2rmOff(d,c,k);}
  return d;};
GAMES.k_r500.bot=(d,s,lv)=>{if(d.ph==='sum')return k2rmNext(d);const two=d.pl.length>4,H=cardsOf(d.hands[s]);
  if(d.ph==='draw'){if(!d.dk)return k2rmEnd(d,-1);const D=cardsOf(d.disc);let best=null;
    for(let j=D.length-1;j>=Math.max(0,D.length-(lv===1?1:8));j--){const got=D.slice(j),H2=[...H,...got],c=D[j];
      const ok=k2rmFind(H2,two).some(m=>m.includes(c))||d.mel.some(m=>k2rmAdd(m,c));if(!ok)continue;
      const v=k2rmV(c)+got.slice(1).reduce((a,x)=>a+(k2rmFind(H2,two).some(m=>m.includes(x))?k2rmV(x):-k2rmV(x)*.35),0)-(got.length-1)*(lv===3?1.5:1);
      if(v>(best?best.v:2))best={j,v};}
    return best?k2rmTake(d,best.j):k2rmDraw(d);}
  const B=GAMES.k_r500.botPlay(d,s,lv);if(B!==d)return B;
  if(d.must){// the needed card could not be used after all: lay anything that fits, else throw the must card rather than stall
    return k2rmDisc({...d,must:''},d.must);}
  const nx=nextSeat(d,s),danger=c=>d.mel.some(m=>k2rmAdd(m,c));
  const opts=H.filter(c=>c!==d.tk).map(c=>{const rest=H.filter(x=>x!==c);let keep=0;for(const x of rest){if(k2rmJ(c))keep+=5;if(x[0]===c[0])keep+=2;if(x[1]===c[1]&&Math.abs(k2rv(x)-k2rv(c))<=2)keep+=1.5;}
    return {c,v:keep-k2rmV(c)*.15+(lv===3&&danger(c)?6:0)+(lv===1?Math.random()*5:0)};});
  if(!opts.length)return k2rmDisc(d,H[0]);return k2rmDisc(d,opts.sort((a,b)=>a.v-b.v)[0].c);};
GAMES.k_r500.botDelay=(d,s,lv)=>d.ph==='sum'?7000:800+rnd(600);

/* =================================================================
   ورق الحظ (Pontoon, the British banking game; pagat.com). One player is the banker. Everyone gets a card face down and bets
   on it (2 to 10 chips), then a second card. A banker's pontoon (ace + a ten-card) takes double from everyone (single from
   a player's pontoon). Then each player in turn: declares a pontoon, splits a pair, buys a face-down card (paying again
   between the first bet and the last buy, at most twice the bet), twists a face-up card (free; no more buying after it),
   or sticks with 15 or more. Over 21 loses at once. Five cards without busting is a five-card trick. The banker then shows
   his hand and draws as he likes: bust pays everyone left, a five-card trick takes double from all but pontoons, otherwise
   he pays higher hands and takes equal or lower ones (pontoon and five-card trick are paid double). A player's pontoon
   (not from a split) takes the bank for the next deal. Used cards go under the pack; it is shuffled after a pontoon.
   8 deals; most chips wins. Each starts with 100.
   ================================================================= */
const K2PN=8,K2PB=[2,4,6,8,10];
const k2poTot=cs=>{let t=0,a=0;for(const c of cs){const r=k2rv(c);t+=r>10?10:r===1?1:r;if(r===1)a++;}return a&&t+10<=21?t+10:t;};
const k2poSoft=cs=>{let t=0,a=0;for(const c of cs){const r=k2rv(c);t+=r>10?10:r===1?1:r;if(r===1)a++;}return a>0&&t+10<=21;};
const k2poTen=c=>'TJQK'.includes(c[0]);
const k2poPon=(h)=>h.c.length===4&&!h.sp&&cardsOf(h.c).some(c=>c[0]==='A')&&cardsOf(h.c).some(k2poTen);
const k2poRank=h=>{const cs=cardsOf(h.c),t=k2poTot(cs);if(t>21)return 0;if(k2poPon(h))return 100;if(cs.length>=5)return 90;return t;};
const k2poPlayers=d=>{const n=d.pl.length,o=[];for(let k=1;k<n;k++){const s=(d.bk+k)%n;if(d.out[s]!=='1')o.push(s);}return o;};
function k2poDraw(d){let dk=d.dk;if(dk.length<2)dk=shuffle(deck52()).join('');return [dk.slice(0,2),dk.slice(2)];}
function k2poRound(d){let dk=d.dk,used='';d.hs.forEach(H=>(H||[]).forEach(h=>used+=h.c));dk=d.shuf?shuffle(cardsOf(dk+used)).join(''):dk+used;
  // players without chips sit out
  let out=d.out;d.pl.forEach((_,s)=>{if(s!==d.bk&&d.ch[s]<2)out=setAt(out,s,'1');});const nd={...d,out,dk,shuf:0};const hs=d.pl.map(()=>[]);
  for(const s of [...k2poPlayers(nd),d.bk]){const [c,r]=k2poDraw({dk:nd.dk});nd.dk=r;hs[s]=[{c,u:'0',b:0,st:'',tw:0,lb:0,sp:0}];}
  const P=k2poPlayers(nd);return {...nd,hs,hi:0,ph:'bet',turn:P[0],sum:null,last:`الجولة ${d.ro+1}: ${nm(d,d.bk)} هو البنك`};}
function k2poSecond(d){const hs=d.hs.map(H=>H.map(h=>({...h})));let dk=d.dk;for(const s of [...k2poPlayers(d),d.bk]){const [c,r]=k2poDraw({dk});dk=r;hs[s][0].c+=c;hs[s][0].u+='0';}
  let nd={...d,hs,dk};if(k2poPon(hs[d.bk][0])){// the banker's pontoon: shown at once, he takes double (single from a pontoon)
    const ch=[...d.ch];hs[d.bk][0].u='11';for(const s of k2poPlayers(d)){const h=hs[s][0],x=k2poPon(h)?h.b:h.b*2;ch[s]-=x;ch[d.bk]+=x;h.u='1'.repeat(h.c.length/2);}
    return k2poEnd({...nd,ch,shuf:1},'بنت بنك! البنك عنده بونتون وأخذ دبل');}
  const P=k2poPlayers(nd);return k2poNextHand({...nd,ph:'play',turn:P[0],hi:0},true);}
// moves to the next hand that still needs a decision (pontoons and five-card tricks stop by themselves)
function k2poNextHand(d,fresh){let s=d.turn,hi=fresh?0:d.hi+1;const P=k2poPlayers(d);let k=P.indexOf(s);
  while(k<P.length){s=P[k];const H=d.hs[s];while(hi<H.length){const h=H[hi];if(!h.st){if(k2poPon(h)){d={...d,hs:d.hs.map((X,q)=>q===s?X.map((y,j)=>j===hi?{...y,st:'pon',u:'1'.repeat(y.c.length/2)}:y):X)};hi++;continue;}return {...d,turn:s,hi};}hi++;}k++;hi=0;}
  const hs=d.hs.map((H,q)=>q===d.bk?H.map(h=>({...h,u:'1'.repeat(h.c.length/2)})):H);return {...d,hs,ph:'bank',turn:d.bk,hi:0};}
function k2poSet(d,s,hi,f){return {...d,hs:d.hs.map((H,q)=>q===s?H.map((h,j)=>j===hi?f({...h}):h):H)};}
function k2poCard(d,face){const s=d.turn,hi=d.hi,[c,dk]=k2poDraw(d);let nd=k2poSet({...d,dk},s,hi,h=>{h.c+=c;h.u+=face?'1':'0';return h;});const h=nd.hs[s][hi],cs=cardsOf(h.c),t=k2poTot(cs);
  if(t>21){const ch=[...nd.ch];ch[s]-=h.b;ch[nd.bk]+=h.b;nd=k2poSet({...nd,ch},s,hi,x=>({...x,st:'bust',u:'1'.repeat(x.c.length/2)}));return k2poNextHand({...nd,last:`${nameTag(d,s)} احترق (${t}) ودفع ${h.b}`});}
  if(cs.length>=5){nd=k2poSet(nd,s,hi,x=>({...x,st:'five'}));return k2poNextHand({...nd,last:`${nameTag(d,s)} جاب خمس أوراق! 🖐`});}
  return {...nd,last:`${nameTag(d,s)} ${face?'سحب مكشوف':'اشترى ورقة'}`};}
const k2poCanBuy=(d,h,amt)=>!h.tw&&cardsOf(h.c).length<5&&amt>=h.b0&&amt<=2*h.b0&&(!h.lb||amt<=h.lb)&&d.ch[d.turn]-k2poStake(d,d.turn)>=amt;
const k2poStake=(d,s)=>(d.hs[s]||[]).reduce((a,h)=>a+(h.st==='bust'?0:h.b),0);
function k2poBuy(d,amt){const s=d.turn,h=d.hs[s][d.hi];if(!k2poCanBuy(d,h,amt))return d;return k2poCard(k2poSet(d,s,d.hi,x=>({...x,b:x.b+amt,lb:amt})),false);}
const k2poTwist=d=>{const h=d.hs[d.turn][d.hi];if(cardsOf(h.c).length>=5||k2poTot(cardsOf(h.c))>=21&&false)return d;return k2poCard(k2poSet(d,d.turn,d.hi,x=>({...x,tw:1})),true);};
function k2poStick(d){const s=d.turn,h=d.hs[s][d.hi];if(k2poTot(cardsOf(h.c))<15)return d;return k2poNextHand({...k2poSet(d,s,d.hi,x=>({...x,st:'stick'})),last:`${nameTag(d,s)} وقف`});}
const k2poCanSplit=(d,h)=>{const cs=cardsOf(h.c);return cs.length===2&&cs[0][0]===cs[1][0]&&d.hs[d.turn].length<4&&d.ch[d.turn]-k2poStake(d,d.turn)>=h.b0;};
function k2poSplit(d){const s=d.turn,hi=d.hi,h=d.hs[s][hi];if(!k2poCanSplit(d,h))return d;const cs=cardsOf(h.c);let dk=d.dk;const mk=c=>{const [x,r]=k2poDraw({dk});dk=r;return {c:c+x,u:'00',b:h.b0,b0:h.b0,st:'',tw:0,lb:0,sp:1};};
  const H=[...d.hs[s]];H.splice(hi,1,mk(cs[0]),mk(cs[1]));return {...d,dk,hs:d.hs.map((X,q)=>q===s?H:X),last:`${nameTag(d,s)} قسم الزوج`};}
function k2poBankDone(d){const B=d.hs[d.bk][0],br=k2poRank(B),bc=cardsOf(B.c).length,ch=[...d.ch];let shuf=0;
  for(const s of k2poPlayers(d))for(const h of d.hs[s]){if(h.st==='bust')continue;const r=k2poRank(h),dbl=r>=90?2:1;if(r===100)shuf=1;
    let pay=0;if(br===0)pay=h.b*dbl;else if(br===90&&bc>=5)pay=r===100?h.b*2:-h.b*2;else pay=r>br?h.b*dbl:-h.b;ch[s]+=pay;ch[d.bk]-=pay;}
  const t=k2poTot(cardsOf(B.c));return k2poEnd({...d,ch,shuf},br===0?`البنك احترق (${t})`:bc>=5?'البنك جاب خمس أوراق':`البنك وقف على ${t}`);}
function k2poEnd(d,msg){// a player's pontoon (not split) takes the bank, the nearest to the banker's left first
  const hs=d.hs.map(H=>H.map(h=>({...h,u:'1'.repeat(h.c.length/2)})));const bp=k2poPon(d.hs[d.bk][0]);const nb=bp?-1:k2poPlayers(d).find(s=>d.hs[s].some(h=>k2poPon(h)));
  const nd={...d,hs,ph:'sum',sum:{nb:nb>=0?nb:-1,msg},turn:d.bk,last:msg};const al=d.pl.map((_,s)=>s).filter(s=>d.ch[s]>=2||s===d.bk);
  if(d.ro+1>=d.nr||al.length<2)return k2Win(nd,k2Best({...nd,out:'0'.repeat(d.pl.length)},d.ch,true));return nd;}
function k2poNext(d){let bk=d.sum&&d.sum.nb>=0?d.sum.nb:d.bk;if(d.ch[bk]<=0){const c=d.pl.map((_,s)=>s).filter(s=>d.ch[s]>0);bk=c.find(s=>s>bk)??c[0]??bk;}
  return k2poRound({...d,bk,ro:d.ro+1,out:d.pl.map((_,s)=>d.out[s]==='1'&&d.ch[s]<2?'1':'0').join('')});}
const k2poCards=(h,see)=>cardsOf(h.c).map((c,i)=>see||h.u[i]==='1'?c:'??');
GAMES.k_pont={name:'ورق الحظ',cat:'cards',lbc:'#14532D',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1D6B3B"/><ellipse cx="50" cy="56" rx="42" ry="34" fill="#27894D"/><g transform="rotate(-10 40 50)"><rect x="24" y="28" width="30" height="42" rx="5" fill="#fff"/><text x="39" y="56" font-size="20" font-weight="900" text-anchor="middle" fill="#2D4763">A</text></g><g transform="rotate(10 60 50)"><rect x="46" y="26" width="30" height="42" rx="5" fill="#fff"/><text x="61" y="54" font-size="20" font-weight="900" text-anchor="middle" fill="#D43C33">K</text></g>${[0,1,2].map(k=>`<ellipse cx="${24+k*4}" cy="${82-k*4}" rx="12" ry="4" fill="#F0B429" stroke="#9A6A00" stroke-width="1.2"/>`).join('')}<text x="72" y="86" font-size="14" font-weight="900" fill="#FFE07A">21</text></svg>`,
  init:n=>({bk:0,ro:0,nr:K2PN,ch:Array(n).fill(100),dk:shuffle(deck52()).join(''),hs:Array(n).fill(0).map(()=>[]),hi:0,ph:'bet',shuf:0,sum:null,last:''}),
  start:d=>k2poRound({...d,bk:d.turn}),
  mask:(d,v)=>d.win!=null?d:d.ph==='sum'?{...d,dk:k2Hide(d.dk)}:{...d,dk:k2Hide(d.dk),hs:d.hs.map((H,s)=>H.map(h=>s===v?h:{...h,c:k2poCards(h,false).join('')}))},
  redeal:d=>d.win!=null?d:{...k2poRound({...d,hs:d.pl.map(()=>[])}),last:'انعادت الجولة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.ch.slice(),
  winText:d=>`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بـ${d.ch[d.win]} فيشة`,
  onTimeout(d){if(d.ph==='sum')return k2poNext(d);if(d.ph==='bet')return GAMES.k_pont.doBet(d,2);if(d.ph==='bank')return k2poBankDone(d);
    const h=d.hs[d.turn][d.hi];return k2poTot(cardsOf(h.c))>=15?k2poStick(d):k2poTwist(d);},
  doBet(d,b){const s=d.turn;if(!K2PB.includes(b)||b>d.ch[s])b=Math.min(2,d.ch[s]);const nd=k2poSet(d,s,0,h=>({...h,b,b0:b}));const P=k2poPlayers(d),k=P.indexOf(s);
    if(k<P.length-1)return {...nd,turn:P[k+1],last:`${nameTag(d,s)} راهن بـ${b}`};return k2poSecond({...nd,last:`${nameTag(d,s)} راهن بـ${b}`});},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';const me=!ctx.local&&d.turn===ctx.v;
    const w=d.ph==='bet'?'راهن على ورقتك':d.ph==='bank'?'البنك يكشف ويسحب':'اسحب، اشترِ أو وقف';return s+(me?`<b class="yt">${w}</b>`:`دور ${nameTag(d,d.turn)}: ${w}`)+` • جولة ${d.ro+1} من ${d.nr}`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v&&d.ph!=='sum';
    let h=`<div class="k2 k2po">${k2Seats(d,s=>`<em>${d.ch[s]}🪙</em>${s===d.bk?'<u>🏦</u>':''}`,s=>d.turn===s&&d.ph!=='sum'&&d.win==null)}`;
    const hand=(s,see)=>(d.hs[s]||[]).map((x,j)=>{const cs=k2poCards(x,see),t=cs.includes('??')?null:k2poTot(cs);
      return `<div class="k2poh ${s===d.turn&&j===d.hi&&d.ph==='play'?'on':''} ${x.st}"><div class="k2poc">${cs.map((c,i)=>`<span data-k="h${s}-${j}-${i}">${cardHTML(c)}</span>`).join('')}</div><small>${t!=null?t:''}${x.b?` • ${x.b}🪙`:''}${x.st==='bust'?' • احترق':x.st==='pon'?' • بونتون!':x.st==='five'?' • خمسة':x.st==='stick'?' • وقف':''}</small></div>`;}).join('');
    const B=d.bk;h+=`<div class="k2felt k2pot"><div class="k2pob"><span class="k2pon" style="--c:${col(d,B)}">🏦 ${nm(d,B)}</span>${hand(B,v===B||d.ph==='bank'||d.ph==='sum')}</div>
      <div class="k2pop">${k2poPlayers(d).filter(s=>s!==v).map(s=>`<div class="k2pos ${d.turn===s?'on':''}" style="--c:${col(d,s)}"><span class="k2pon">${nm(d,s)}</span>${hand(s,d.ph==='sum')}</div>`).join('')}</div></div>`;
    if(d.ph==='sum'){h+=`<div class="panel k2sum"><h3>${d.sum.msg}</h3>${d.sum.nb>=0?`<p>${nameTag(d,d.sum.nb)} جاب بونتون وصار البنك 🏦</p>`:''}<div class="k2tot">${d.pl.map((_,s)=>`<span style="--c:${col(d,s)}">${nm(d,s)} <b>${d.ch[s]}</b></span>`).join('')}</div>${ctx.my?k2Next(d):''}</div>`;return h+'</div>';}
    if(v>=0&&v!==B&&d.hs[v]&&d.hs[v].length)h+=`<p class="lbl hlbl">ورقك</p><div class="k2pomine">${hand(v,true)}</div>`;
    if(!my)return h+'</div>';
    if(d.ph==='bet')h+=k2Btns(K2PB.map(b=>[b,`${b} 🪙`,'navy',b>d.ch[v]]),'bet');
    else if(d.ph==='bank'){const cs=cardsOf(d.hs[B][0].c);h+=k2Btns([[0,'اسحب ورقة','blue',cs.length>=5||k2poTot(cs)>=21],[1,`وقف على ${k2poTot(cs)}`,'navy']],'bank');}
    else{const x=d.hs[v][d.hi],cs=cardsOf(x.c),t=k2poTot(cs),xs=[];
      for(const amt of [...new Set([x.b0,Math.min(2*x.b0,x.lb||2*x.b0)])])if(k2poCanBuy(d,x,amt))xs.push([amt,`اشترِ بـ${amt}`,'blue']);
      if(cs.length<5&&t<21)xs.push([0,'اسحب مكشوف','navy']);if(t>=15)xs.push([-1,'وقف','green']);if(k2poCanSplit(d,x))xs.push([-2,'اقسم','soft']);h+=k2Btns(xs,'pl');}
    return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.turn;if(a==='next'){if(d.ph==='sum')act(k2poNext(d));return;}
    if(a==='bet'){if(d.ph==='bet'&&K2PB.includes(i)&&i<=d.ch[s])act(GAMES.k_pont.doBet(d,i));return;}
    if(a==='bank'){if(d.ph!=='bank')return;const cs=cardsOf(d.hs[d.bk][0].c);if(i===1){act(k2poBankDone(d));return;}if(cs.length>=5||k2poTot(cs)>=21)return;
      const [c,dk]=k2poDraw(d);const nd=k2poSet({...d,dk},d.bk,0,h=>({...h,c:h.c+c,u:h.u+'1'}));const n2=cardsOf(nd.hs[d.bk][0].c);act(k2poTot(n2)>21||n2.length>=5?k2poBankDone(nd):{...nd,last:'البنك سحب'});return;}
    if(a==='pl'){if(d.ph!=='play')return;const x=d.hs[s][d.hi];if(!x)return;let nd=d;
      if(i===-1)nd=k2poStick(d);else if(i===-2)nd=k2poSplit(d);else if(i===0){if(cardsOf(x.c).length<5&&k2poTot(cardsOf(x.c))<21)nd=k2poTwist(d);}else nd=k2poBuy(d,i);if(nd!==d)act(nd);}}};
HELP.k_pont='بونتون (البلاك جاك البريطاني). واحد منكم «البنك» والباقين يلعبون ضده، وكل واحد يبدأ بـ100 فيشة. كل واحد ياخذ ورقة مقلوبة ويراهن عليها (من 2 لين 10)، وبعدها ورقة ثانية. لو عند البنك «بونتون» (إكة مع عشرة أو صورة) ياخذ من الكل دبل (واللي معه بونتون يدفع مرة وحدة). بعدها كل لاعب بدوره: «اشترِ» ورقة مقلوبة وتزيد رهانك (بين رهانك الأول وآخر شراء، ولين ضعف الأول)، أو «اسحب مكشوف» ببلاش (وبعدها ما تقدر تشتري)، أو «وقف» لو مجموعك 15 وفوق، ولو عندك زوج تقدر «تقسم». الإكة 1 أو 11 والصور 10. لو زدت على 21 «احترقت» وتخسر رهانك على طول. لو جمعت خمس أوراق بدون ما تحترق هذي «خمسة» ودبل. بعدها البنك يكشف ويسحب على كيفه: لو احترق يدفع للكل، ولو جاب خمسة ياخذ دبل من الكل إلا البونتون، وغير كذا يدفع للأعلى منه وياخذ من المساوي والأقل (البونتون والخمسة ينحسبون دبل). اللي يجيب بونتون (مو من قسمة) يصير هو البنك بالجولة الجاية. 8 جولات، والأكثر فيش يفوز.';
// the bot: bets high on an ace or a ten-card, buys while it cannot bust and holds a good start, twists to 15, sticks on 17
// (hard: twists a soft 17 and a 15-16 when the banker shows strength), splits aces and eights; the banker draws to 17, or
// on hard beats what the open cards show
GAMES.k_pont.bot=(d,s,lv)=>{if(d.ph==='sum')return k2poNext(d);
  if(d.ph==='bet'){const c=cardsOf(d.hs[s][0].c)[0],r=k2rv(c);let b=r===1?10:r>=10?8:r>=7?4:2;if(lv===1)b=pickR(K2PB);if(lv===2&&b>4)b-=2;b=Math.min(b,d.ch[s]-(d.ch[s]%2));return GAMES.k_pont.doBet(d,Math.max(2,b));}
  if(d.ph==='bank'){const cs=cardsOf(d.hs[d.bk][0].c),t=k2poTot(cs);let want=17;
    if(lv===3){const live=k2poPlayers(d).flatMap(p=>d.hs[p].filter(h=>h.st!=='bust'));const strong=live.filter(h=>cardsOf(h.c).length>=3).length;if(live.length&&strong/live.length>.5&&t<19)want=19;if(!live.length)want=0;}
    if(lv===1)want=15+rnd(4);if(t>=want||cs.length>=5)return k2poBankDone(d);const [c,dk]=k2poDraw(d);const nd=k2poSet({...d,dk},d.bk,0,h=>({...h,c:h.c+c,u:h.u+'1'}));const n2=cardsOf(nd.hs[d.bk][0].c);return k2poTot(n2)>21||n2.length>=5?k2poBankDone(nd):nd;}
  const x=d.hs[s][d.hi],cs=cardsOf(x.c),t=k2poTot(cs),soft=k2poSoft(cs);
  if(k2poCanSplit(d,x)&&lv>1&&(cs[0][0]==='A'||cs[0][0]==='8'))return k2poSplit(d);
  if(lv===1&&t>=15&&Math.random()<.5)return k2poStick(d);
  if(t>=18||(t>=17&&!(lv===3&&soft&&cs.length<4)))return k2poStick(d);
  if(t>=15&&t<=16&&(lv<3||cs.length>=4))return k2poStick(d);
  if(!x.tw&&t<=11&&cs.length<4&&lv>1){const amt=x.lb?Math.min(x.lb,x.b0):x.b0;if(k2poCanBuy(d,x,amt)&&(k2rv(cs[0])===1||k2rv(cs[0])>=9||t<=10))return k2poBuy(d,amt);}
  return k2poTwist(d);};
GAMES.k_pont.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(600);

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
  init:n=>{const dk=shuffle(deck52(n>4?2:1)),st=Array(n).fill('');dk.forEach((c,i)=>st[i%n]+=c);return {sk:st,up:Array(n).fill(''),ph:'play',rd:0,t0:0,lc:null,res:'',last:''};},
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
    const nd={...d,sk:st,up,ph:'play',res:sl.length?sl.map(x=>`${nm(d,x.s)} ${(x.ms/1000).toFixed(2)}ث`).join('، '):'',lw:ws,last:msg};
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
    if(d.res)h+=`<p class="note k2res">${d.res}</p>`;return h+'</div>';},
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
  init:n=>{const dk=shuffle(deck52(n>4?2:1)),st=Array(n).fill('');dk.forEach((c,i)=>st[i%n]+=c);return {sk:st,pot:'',ch:null,ph:'play',rd:0,t0:0,lc:null,res:'',lw:-1,last:''};},
  hide:{all:['sk']},privOk:(d,r,o,p)=>k2PickOk(p),
  simulNow:d=>d.ph==='slap',
  points:d=>d.pl.map((_,s)=>d.out[s]==='1'?'—':d.sk[s].length/2),
  winText:d=>`فاز ${nm(d,d.win)}!`,
  onTimeout(d){return d.ph==='play'?k2erPlay(d):null;},
  onSkip(nd,d){if(nd.win!=null)return nd;return nd.ph==='play'&&!k2erHas(nd,nd.turn)?{...nd,turn:k2erNextP(nd,nd.turn)}:nd;},
  host(d){if(d.ph!=='slap')return null;if(Date.now()-d.t0<K2ERW)return null;return GAMES.k_ers.resolve(d,simulPicks(d).map(x=>x===undefined?null:x));},
  resolve(d,picks){const rule=k2erRule(d.pot),sl=picks.map((p,s)=>p&&typeof p==='object'&&d.out[s]!=='1'?{s,ms:p.ms}:null).filter(Boolean).sort((a,b)=>a.ms-b.ms);
    const res=sl.length?sl.map(x=>`${nm(d,x.s)} ${(x.ms/1000).toFixed(2)}ث`).join('، '):'';let nd={...d,ph:'play',res,lw:-1};
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
    if(d.res)h+=`<p class="note k2res">${d.res}</p>`;return h+'</div>';},
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
      h+=`<div class="k2sph ${pk?'done':''}" style="--c:${col(d,s)}"><div class="k2sphn"><b>${nm(d,s)}</b><small>بكومتك ${d.dk[s].length/2}</small>${pk?'<em>✓ لعبت</em>':''}</div><div class="k2sphc">${H.map((c,i)=>{const fit=d.mid.some(p=>k2spAdj(c,p.slice(-2)));
        return !pk&&fit?`<button class="bcard ${sel===i?'sel':''}" data-ga="card" data-i="${s*10+i}">${cardHTML(c)}</button>`:`<span class="bcard ${pk?'':'dim'}">${cardHTML(c)}</span>`;}).join('')}</div>
        ${sel>=0&&!pk?`<div class="k2spto">${d.mid.map((p,j)=>k2spAdj(H[sel],p.slice(-2))?`<button class="btn navy" data-ga="to" data-i="${s*10+j}">على ${k2Lab(p.slice(-2))}</button>`:'').join('')}</div>`:''}</div>`;}
    if(!T.length)h+='<p class="note">تتفرج</p>';return h+'</div>';},
  click(a,i,d,ctx){if(d.win!=null||!Number.isInteger(i))return;const s=k2TapSeat(d,ctx,Math.floor(i/10)),k=i%10;if(s<0||d.out[s]==='1'||hasPicked(d,s))return;const H=cardsOf(d.hands[s]);
    if(a==='card'){const c=H[k];if(!c)return;const ps=d.mid.map((p,j)=>k2spAdj(c,p.slice(-2))?j:-1).filter(j=>j>=0);if(!ps.length)return;
      if(ps.length===1){S.k2sps=null;simulPick(d,s,{c,p:ps[0],ms:k2Ms(d)});render();return;}S.k2sps=[d.gid+':'+d.rd+':'+s,k];render();return;}
    if(a==='to'){const sel=Array.isArray(S.k2sps)&&S.k2sps[0]===d.gid+':'+d.rd+':'+s?S.k2sps[1]:-1;const c=H[sel];if(!c||!d.mid[k]||!k2spAdj(c,d.mid[k].slice(-2)))return;S.k2sps=null;simulPick(d,s,{c,p:k,ms:k2Ms(d)});render();}}};
GAMES.k_speed.net={local:['card'],ui:['k2sps']};
HELP.k_speed='لعبة السرعة: الكل يلعب بنفس الوقت. كل واحد معه 5 أوراق بيده وكومة مقلوبة له، وبالوسط كومات مكشوفة (2 لين 3 لاعبين، 3 لـ4 و5، و4 من 6 وفوق) واحتياط. بكل جولة كل واحد يقدر يحط ورقة وحدة على أي كومة بالوسط لو رقمها أعلى أو أقل بواحد من اللي فوق (الإكة تمشي مع الشايب ومع الاثنين). الجوال يحسب سرعتك، وصاحب الغرفة يرتب الأوراق حسب الأسرع: لو سبقك أحد وصارت ورقتك ما تمشي ترجع ليدك. بعد ما تلعب تكمّل يدك لين 5 من كومتك. لو محد عنده لعب تنقلب ورقة جديدة على كل كومة من الاحتياط. أول واحد يخلّص ورقه كله يفوز. على نفس الجوال كل واحد له صف بلونه ويلعب منه.';

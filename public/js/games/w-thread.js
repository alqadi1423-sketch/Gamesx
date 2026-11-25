'use strict';
/* =====================================================================================================
   «طرف الخيط» (w_thread): the team word game of a clue and a number. The rules, the clue check, the deal and the
   guessing bot live in w-thread-core.js (WT, no DOM) and the words in w-thread-data.js; this file draws the board and
   turns taps into WT calls.
     Online and nearby: the secret map is hidden with mask (WT.mask): only the clue-givers (duo: each player their own
       side) get it; a guess needs the map, so the host plays it (net.host). The host's device holds the whole state
       (the known, accepted risk of every secret game: docs/games/w_thread.md).
     One phone: the engine's pass-the-phone cover (viewer = whoever acts: the clue-giver, then a guesser), so the map is
       gone from the screen before the phone moves on.
     Against bots (one phone): the people give the clues, the bots guess (a clue-giving bot is not built: phase 1).
   Classes are wth-* (css/n-thread.css).
   ===================================================================================================== */
// the boards dealt on this device this session: no word comes back until the bank runs low
const WT_USED=new Set();
// the clue-giver's notebook and pen (held), for the kid who is writing the clue
if(typeof KH!=='undefined')KH.extend({acc:{'wth-note':{h:`<g transform="rotate(-10)"><rect x="-8" y="-17" width="14" height="17" rx="1.6" fill="#FFF7E2" stroke="#17233A" stroke-width="1.3"/><path d="M-8 -17h3v17h-3z" fill="#EC6158" stroke="#17233A" stroke-width="1.1"/><path d="M-2.5 -12.5h6M-2.5 -9h6M-2.5 -5.5h4" stroke="#8DA2B8" stroke-width="1.1"/></g><g transform="translate(6 -4) rotate(28)"><rect x="-1.6" y="-14" width="3.2" height="12" fill="#F0B429" stroke="#17233A" stroke-width="1"/><path d="M-1.6 -14l1.6-3.6 1.6 3.6z" fill="#F2C29B" stroke="#17233A" stroke-width="1"/></g>`}}});
const WTH={
  // the side colours: the engine's teams (vs), or our team and the rival (coop); duo words are green
  col:(d,side)=>d.md==='duo'?'#2F9E55':d.md==='coop'&&side===1?'#7D8CA3':(TEAMS[d.tc[side]]||TEAMS[side]).c,
  emo:(d,side)=>d.md==='duo'?'✓':(TEAMS[d.tc[side]]||TEAMS[side]).e,
  tname:(d,side)=>d.md==='coop'?(side===0?'فريقكم':'الخصم'):(TEAMS[d.tc[side]]||TEAMS[side]).n,
  me:(d,ctx)=>{const v=ctx&&ctx.v;return Number.isInteger(v)&&v>=0&&v<d.pl.length?v:-1;},
  num:n=>n===10?'∞':String(n),
  // the guesses left, as the guessers read it
  left:d=>d.gl===-1?(d.md==='duo'?'خمّنوا ما دام صح':'خمّنوا قد ما تبون'):d.gl===1?'باقي لكم تخمين واحد':d.gl===2?'باقي لكم تخمينين':`باقي لكم ${d.gl} تخمينات`,
  ERR:{empty:'اكتب كلمة',one:'كلمة وحدة بحروف عربية، بدون مسافة ولا أرقام',board:'قريبة من كلمة على اللوحة، جرّب كلمة ثانية',part:'جزء من كلمة على اللوحة أو العكس، جرّب كلمة ثانية',num:'اختار رقم',turn:'مو دورك تلمّح'},
  // the mode of a round: two players together, a team against a simulated rival, or two teams
  mode:(d)=>{const bots=S.mode==='local'&&d.pl.some(r=>S.bots&&S.bots[r]);const n=d.pl.length;return n===2&&!bots?'duo':n>=4&&!bots?'vs':'coop';},
  human:(d,s)=>!(S.mode==='local'&&S.bots&&S.bots[d.pl[s]]),
  ghost:{k:'',t:0},
  // a small notebook beside the clue-giver's face
  NB:`<svg class="wth-nbi" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="1.5" width="10" height="13" rx="1.5" fill="#FFF7E2" stroke="#17233A"/><path d="M2.5 1.5h2.5v13H2.5z" fill="#EC6158"/><path d="M7 5h4M7 8h4M7 11h3" stroke="#8DA2B8"/></svg>`,
};
// one tile of the board
function wthTile(d,i,me,o){const r=d.r[i],w=WT.W[d.b[i]],fin=d.win!=null,cls=['wth-t'];let mark='',lab=w;
  const keyOf=k=>k&&k[i]&&k[i]!=='?'?k[i]:null;
  const kk=d.md==='duo'?(fin?null:keyOf(me>=0?d.k[me]:null)):keyOf(d.k[0]);
  const ic=t=>t==='0'||t==='1'?WTH.emo(d,+t):t==='g'?'✓':t==='n'?'●':t==='x'?'🦂':'';
  if(r!=='.'){cls.push('wth-r','wth-c-'+r);mark=`<i class="wth-ic" aria-hidden="true">${ic(r)}</i>`;lab+=r==='n'?'، جار':r==='x'?'، العقرب':r==='g'?'، لقيتوها':`، ${WTH.tname(d,+r)}`;}
  else if(fin){let t;if(d.md==='duo'){const a=d.k[0][i],b=d.k[1][i];t=a==='g'||b==='g'?'g':a==='x'||b==='x'?'x':'n';}else t=d.k[0][i];cls.push('wth-e','wth-h-'+t);mark=`<i class="wth-ic" aria-hidden="true">${ic(t)}</i>`;}
  else if(kk&&(WT.seesKey(d,me)||d.md==='duo')){cls.push('wth-h-'+kk);if(kk!=='n')mark=`<i class="wth-mk" aria-hidden="true">${ic(kk)}</i>`;lab+=kk==='n'?'، جار':kk==='x'?'، العقرب':kk==='g'?'، من كلماتك':`، ${WTH.tname(d,+kk)}`;}
  if(d.md==='duo'&&r==='.'&&d.mk[i]!=='.'){cls.push('wth-m-'+d.mk[i]);lab+='، جار عند '+(d.mk[i]==='c'?'الاثنين':nm(d,d.mk[i]==='a'?0:1));}
  if(o.ls===i)cls.push('wth-new');if(d.rv===i)cls.push('wth-new');
  const pk=!fin&&d.pk===i;if(pk)cls.push('wth-pk');
  const can=o.guess&&WT.pickable(d,i);if(can)cls.push('wth-can');
  return `<button class="${cls.join(' ')}" data-ga="g" data-i="${i}" ${can?'':'disabled'} aria-label="${escH(lab)}"${pk?' aria-pressed="true"':''}>${pk&&d.pb>=0?`<i class="wth-pf" aria-hidden="true">${kface(d.pl[d.pb])}</i>`:''}${mark}<span class="wth-w">${escH(w)}</span></button>`;}
// the team strip: each side, what it has left, its players (the clue-giver with a notebook)
function wthTeams(d){const fin=d.win!=null;
  if(d.md==='duo'){const f=WT.foundOf(d);return `<div class="wth-teams wth-one"><div class="wth-tm wth-on" style="--c:#2F9E55"><span class="wth-em" aria-hidden="true">🧵</span><div class="wth-tmx"><b class="wth-nm">لقيتوا ${f} من 15</b><div class="wth-tk" aria-label="باقي ${d.tk} أدوار">${[...Array(9).keys()].map(j=>`<u class="${j<d.tk?'on':''}"></u>`).join('')}</div></div><span class="wth-cnt">${d.tk}<small>أدوار</small></span></div></div>`;}
  const card=side=>{const ss=d.md==='coop'&&side===1?[]:d.pl.map((_,s)=>s).filter(s=>d.sx[s]===side);const now=!fin&&d.sd===side&&d.md==='vs';
    const left=WT.totalOf(d,side)-WT.foundOf(d,side);
    const kids=ss.map(s=>`<span class="wth-kd${s===d.cg[side]?' wth-cg':''}${WT.alive(d,s)?'':' wth-gone'}" title="${nm(d,s)}${s===d.cg[side]?'، الملمّح':''}">${kface(d.pl[s])}${s===d.cg[side]?WTH.NB:''}</span>`).join('');
    return `<div class="wth-tm${now?' wth-on':''}" style="--c:${WTH.col(d,side)}"><span class="wth-em" aria-hidden="true">${WTH.emo(d,side)}</span><div class="wth-tmx"><b class="wth-nm">${WTH.tname(d,side)}</b>${kids?`<div class="wth-kids">${kids}</div>`:'<small class="wth-sim">يكشف كلمة كل دور</small>'}</div><span class="wth-cnt" aria-label="باقي ${left}">${left}<small>باقي</small></span></div>`;};
  return `<div class="wth-teams">${card(0)}${card(1)}</div>`;}
// the clue form, for the clue-giver in the clue phase
function wthForm(d){const v=(S.draft&&S.draft.wthc)||'',n=Number.isInteger(S.wthN)?S.wthN:1,e=WT.clueErr(v,WT.openWords(d));
  return `<div class="wth-form"><label class="wth-lab" for="wthc">تلميحك: كلمة وحدة ورقم</label><div class="wth-row"><input id="wthc" class="wth-in" data-draft="wthc" data-enter="clue" value="${escH(v)}" maxlength="15" autocomplete="off" autocapitalize="off" spellcheck="false" dir="rtl" enterkeyhint="send" placeholder="مثلًا: بحر"><button class="wth-send" data-ga="clue" ${e?'disabled':''}>أرسل</button></div>
    <span class="wth-chk ${v.trim()?(e?'no':'ok'):''}" aria-live="polite">${v.trim()?(e?WTH.ERR[e]:'✓ تمام'):'الكلمة ما تكون من اللوحة ولا جزء منها'}</span>
    <div class="wth-nums" role="group" aria-label="كم كلمة؟">${[1,2,3,4,5,6,7,8,9,0,10].map(k=>`<button class="wth-n${k===n?' on':''}" data-ga="wn" data-i="${k}" aria-pressed="${k===n}" aria-label="${k===10?'بلا حد':k===0?'صفر: ولا كلمة':k}">${WTH.num(k)}</button>`).join('')}</div></div>`;}
// the line under the board
function wthDock(d,me,guess){const fin=d.win!=null,giv=WT.giver(d);
  if(fin){const lg=d.lg,best=lg.filter(e=>e.n>0&&e.n<10).sort((a,b)=>b.h-a.h||a.n-b.n)[0];
    return `<div class="wth-dock"><div class="wth-stats"><div>أحلى تلميح<b>${best?`${escH(best.w)} · ${WTH.num(best.n)} ${'✓'.repeat(Math.min(best.h,9))}`:'—'}</b></div><div>عدد التلميحات<b>${lg.length}</b></div></div></div>`;}
  if(d.ph==='clue'){if(me===giv)return `<div class="wth-dock">${wthForm(d)}</div>`;
    const kid=typeof KH!=='undefined'?KH.pkid(d.pl[giv],{pose:'think',acc:'wth-note'},{cls:'wth-kid',vb:'-27 -76 54 80'}):'';
    return `<div class="wth-dock"><div class="wth-wait" style="--c:${WTH.col(d,d.sd)}">${kid}<p><b>${nm(d,giv)}</b> يكتب تلميح…<small>${d.md==='vs'?`لفريق ${WTH.emo(d,d.sd)} ${WTH.tname(d,d.sd)}`:WT.seesKey(d,me)?'':'استنوا التلميح'}</small></p></div></div>`;}
  if(guess)return `<div class="wth-dock"><p class="wth-hint">${d.pk>=0?'اضغطها مرة ثانية عشان تثبّت التخمين':d.gn?'كمّلوا، أو وقفوا':'تشاوروا واختاروا كلمة. الضغطة الثانية تثبّت'}</p><button class="wth-stop" data-ga="stop" ${d.gn>=1?'':'disabled'}>خلاص، نوقف</button></div>`;
  if(me===giv)return `<div class="wth-dock"><p class="wth-hint">${WT.needsGhost(d)?'ما بقى أحد يخمّن معك، البوت يخمّن عنكم':'فريقك يخمّن. لا تعطيهم أي إشارة 🤐'}</p></div>`;
  return `<div class="wth-dock"><p class="wth-hint">${d.md==='vs'?`${WTH.emo(d,d.sd)} ${WTH.tname(d,d.sd)} يخمّنون`:`${nm(d,WT.guessers(d,d.sd)[0]??giv)} يخمّن`}</p></div>`;}

GAMES.w_thread={name:'طرف الخيط',cat:'words',lbc:'#24496B',minP:2,maxP:8,noTimer:true,
  teams:'native',teamsOk:z=>z.length===2&&z.every(x=>x>=2),
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#24496B"/>${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${14+c*25}" y="${14+r*25}" width="21" height="21" rx="4" fill="${['#FFFDF8','#E5483F','#FFFDF8','#FFFDF8','#FFFDF8','#2F80ED','#C9D3DE','#FFFDF8','#E5483F'][r*3+c]}"/>`).join('')).join('')}<path d="M8 86C28 70 30 92 50 78S78 60 92 70" fill="none" stroke="#F0B429" stroke-width="4" stroke-linecap="round"/><circle cx="92" cy="70" r="5" fill="#F0B429"/></svg>`,
  init:()=>({}),
  start(d){const md=WTH.mode(d);return WT.setup(d,{md,used:WT_USED,rnd:Math.random,human:s=>WTH.human(d,s)});},
  // the map: the clue-givers see it (duo: each player their own side), nobody else until the round ends
  mask:(d,seat)=>WT.mask(d,seat),
  net:{host:['g','stop','clue'],local:['wn'],ui:['wthN']},
  // one phone: the phone goes to whoever acts now (the clue-giver writes, then the team guesses)
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg(d){if(d.ph==='guess'&&d.cl)return `${d.last?escH(d.last)+'<br>':''}التلميح: <b>${escH(d.cl.w)} · ${WTH.num(d.cl.n)}</b>، الجوال للي يخمّنون`;
    return `${d.last?escH(d.last)+'<br>':''}دور الملمّح يكتب التلميح، والباقين لا يشوفون الشاشة`;},
  status(d,ctx){const me=WTH.me(d,ctx),giv=WT.giver(d);const tail=d.last?`<br><small>${escH(d.last)}</small>`:'';
    if(d.ph==='clue')return (me===giv?'<b class="yt">دورك تلمّح</b> <small>الخريطة قدامك بس</small>':`${nameTag(d,giv)} يفكر في تلميح…`)+tail;
    const cl=d.cl||{w:'',n:0};const who=WT.canGuess(d,me)?WTH.left(d):d.md==='vs'?`${WTH.emo(d,d.sd)} ${WTH.tname(d,d.sd)} يخمّنون`:WTH.left(d);
    return `<span class="wth-clue" style="--c:${WTH.col(d,d.sd)}"><b>${escH(cl.w)}</b><i>${WTH.num(cl.n)}</i></span> <small class="wth-gl">${who}</small>`;},
  render(d,ctx){const me=WTH.me(d,ctx);d=WT.mask(d,me);const fin=d.win!=null;
    const guess=!fin&&WT.canGuess(d,me)&&(ctx.local||ctx.bots?!isBot(d,me):true);
    const key=!fin&&WT.seesKey(d,me)&&(d.md==='duo'||d.k[0][0]!=='?');
    const o={guess,ls:d.ls?d.ls.i:-1};
    const legend=key&&d.md!=='duo'?`<div class="wth-leg"><span style="--c:${WTH.col(d,0)}"><i></i>${WTH.emo(d,0)} ${d.md==='coop'?'كلماتكم':WTH.tname(d,0)}</span><span style="--c:${WTH.col(d,1)}"><i></i>${WTH.emo(d,1)} ${WTH.tname(d,1)}</span><span class="wth-ln"><i></i>● جار</span><span class="wth-lx"><i></i>🦂 العقرب</span></div>`:
      key?`<div class="wth-leg"><span style="--c:#2F9E55"><i></i>✓ كلماتك لصاحبك</span><span class="wth-lx"><i></i>🦂 العقرب عندك</span></div>`:'';
    return `<div class="wth wth-md-${d.md}${key?' wth-key':''}${fin?' wth-fin':''}" style="--wa:${WTH.col(d,0)};--wb:${WTH.col(d,1)}">${wthTeams(d)}<div class="wth-grid">${[...Array(25).keys()].map(i=>wthTile(d,i,me,o)).join('')}</div>${legend}${wthDock(d,me,guess)}</div>`;},
  click(a,i,d,ctx){const me=WTH.me(d,ctx);
    if(a==='wn'){if(Number.isInteger(i)&&i>=0&&i<=10){S.wthN=i;render();}return;}
    if(a==='clue'){const v=(S.draft&&S.draft.wthc)||'',n=Number.isInteger(S.wthN)?S.wthN:1;const R=WT.giveClue(d,me,v,n);
      if(R.err){toast(WTH.ERR[R.err]||'ما ينفع هالتلميح');return;}S.draft={...S.draft,wthc:''};S.wthN=1;act(R.d);return;}
    if(a==='stop'){const nd=WT.stop(d,me,Math.random);if(nd!==d)act(nd);return;}
    if(a==='g'){if(!WT.canGuess(d,me)){if(d.ph==='guess'&&me===WT.giver(d))toast('أنت الملمّح، فريقك يخمّن');return;}
      if(!WT.pickable(d,i))return;act(d.pk===i?WT.guess(d,i,me,Math.random):WT.pick(d,me,i));}},
  onDraft(k,v){if(k!=='wthc')return;const d=S.st.d;if(!d||d.ph!=='clue')return;const e=WT.clueErr(v,WT.openWords(d));
    const c=app.querySelector('.wth-chk'),b=app.querySelector('.wth-send');if(c){c.textContent=v.trim()?(e?WTH.ERR[e]:'✓ تمام'):'الكلمة ما تكون من اللوحة ولا جزء منها';c.className='wth-chk '+(v.trim()?(e?'no':'ok'):'');}if(b)b.disabled=!!e;},
  onSkip:nd=>WT.onLeave(nd),
  // a side with nobody left to guess (the others left): the host's bot guesses for it, a tile every 1.6 seconds
  host(d){if(!WT.needsGhost(d))return null;const k=d.gid+':'+d.lg.length+':'+d.gn+':'+d.pk;if(WTH.ghost.k!==k){WTH.ghost={k,t:Date.now()};return null;}
    if(Date.now()-WTH.ghost.t<1600)return null;const ch=WT.botChoose(WT.mask(d,-1),2,Math.random);
    return ch.stop?WT.stop(d,-2,Math.random):WT.guess(d,ch.i,-2,Math.random);},
  // bots guess (two taps: the pick shows first); a bot is never the clue-giver while a person can be, and when it
  // must be (everyone at the table is a bot, or the player is away online) it gives a plain clue from the table
  bot(d,s,lv){if(d.win!=null)return undefined;const v=WT.mask(d,s);
    if(d.ph==='clue'){if(s!==WT.giver(d))return d;const c=WT.clueBot(v,Math.random);const R=WT.giveClue(d,s,c.w,c.n);return R.d||d;}
    if(!WT.canGuess(d,s))return d;const ch=WT.botChoose(v,lv,Math.random);
    if(ch.stop)return WT.stop(d,s,Math.random);return d.pk===ch.i?WT.guess(d,ch.i,s,Math.random):WT.pick(d,s,ch.i);},
  botDelay:(d,s,lv)=>d.ph==='clue'?2200:d.pk>=0?900:1300+rnd(700),
  winText(d){if(d.md==='vs')return d.en==='lf'&&typeof d.win==='number'?`فاز ${TEAMS[d.tc[d.sx[d.win]]]?teamName(d.tc[d.sx[d.win]]):''}، الفريق الثاني طلع`:'';
    if(typeof d.win==='number')return 'فزتوا! لقيتوا كل الكلمات 🎉';
    return d.en==='x'?'العقرب! 🦂 خسرتوا':d.en==='rv'?'الخصم لقى كلماته قبلكم':d.en==='tk'?'خلصت الأدوار قبل الكلمات':d.en==='lf'?'وقفت اللعبة، صاحبك طلع':'خسرتوا';},
  winExtra(d){const why=d.md==='vs'&&d.en==='x'&&typeof d.win==='number'?`${WTH.tname(d,1-d.sx[d.win])} كشفوا العقرب 🦂`:'';
    const sc=d.md==='coop'&&typeof d.win==='number'?`نقاطكم ${WT.totalOf(d,1)-WT.foundOf(d,1)}: كلمات الخصم اللي ما انكشفت`:'';
    return [why,sc,`عدد التلميحات ${d.lg.length}`].filter(Boolean).join(' • ');},
};
HELP.w_thread='طرف الخيط: فريقين، وكل فريق له «ملمّح» يشوف «الخريطة السرية»: يعرف وش كلمات فريقه من الـ25 كلمة، ووين «العقرب». الفريق اللي يبدأ له 9 كلمات، والثاني 8، و7 كلمات «جار» ما هي لأحد، وكلمة وحدة «العقرب». الملمّح يعطي فريقه كلمة وحدة ورقم، مثلًا «مطبخ · 2» يعني فيه كلمتين لها علاقة بالمطبخ، وما يقول شي غيرها ولا يكتب في المحادثة وقت دوره. ممنوع يكون التلميح كلمة من اللوحة، أو صيغة منها (مع «ال» أو الجمع)، أو جزء منها، واللعبة ترفضه لحالها. الفريق يتشاور ويختار كلمة: ضغطة تحددها، وضغطة ثانية تثبّت التخمين. إذا طلعت لكم كمّلوا، ولكم لين الرقم + 1 تخمين، وتقدرون توقفون متى ما بغيتوا بعد أول تخمين. إذا طلعت «جار» أو كلمة للفريق الثاني يخلص دوركم. إذا طلعت «العقرب» خسرتوا على طول! أول فريق يلقى كل كلماته يفوز، حتى لو الفريق الثاني هو اللي كشف آخر كلمة لكم. تلميح «0» يعني ولا كلمة من كلماتنا لها علاقة، و«∞» يعني خمّنوا قد ما تبون (وأقل شي تخمين واحد). الملمّح يتبدّل كل جولة. لاعبين اثنين: تلعبون سوا، وكل واحد عنده جهة من الخريطة فيها 9 كلمات يلمّح لها صاحبه، و3 منها مشتركة، يعني 15 كلمة لازم تلقونها قبل ما تخلص الأدوار التسعة. التخمين يكمل ما دام صح، و«جار» يخلص الدور، والعقرب يخسّركم. ثلاثة (أو ضد البوت): واحد يلمّح والباقين يخمّنون، وضدكم خصم وهمي يكشف كلمة من كلماته الثمان بعد كل دور لكم، وتخسرون إذا كشف كلماته كلها قبلكم. ضد البوت أنت الملمّح والبوتات تخمّن. على جوال واحد: الجوال يروح للملمّح لحاله وبعدين للي يخمّنون، والخريطة تختفي قبل كل تمريرة.';

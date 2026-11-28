'use strict';
/* =====================================================================================================
   «تحدي الخلية» (q_cell): the board, the question and the taps. The rules live in q-cell-core.js (QC, no DOM) and the
   questions in q-cell-data.js (QC_BANK).
     Online and nearby (gm buzz): the answer is the host's secret (mask), every tap goes to the host (net.host), who takes
       them in the order they come: the first «أعرفها!» answers.
     One phone (gm turn or host) and against bots (turn): nothing to hide, no pass-the-phone cover (no viewer).
   The session is «خلية <name>»: the room's host online, the first player on one phone. Classes are qc-* (css/n-cell.css).
   ===================================================================================================== */
const QCU={
  side:(d,s)=>Number.isInteger(s)&&s>=0&&s<d.pl.length?d.sx[s]:-1,
  team:(d,side)=>TEAMS[d.tc[side]]||TEAMS[side],
  col:(d,side)=>QCU.team(d,side).c,
  tn:(d,side)=>QCU.team(d,side).n,
  te:(d,side)=>QCU.team(d,side).e,
  // a bot seat on one phone (it acts by itself)
  bot:(d,s)=>S.mode==='local'&&!!(d.bt&&d.bt[s]),
  me:(d,ctx)=>{const v=ctx&&ctx.v;return Number.isInteger(v)&&v>=0&&v<d.pl.length?v:-1;},
  // the seat a tap is made as: online the phone's own seat; on one phone the seat whose turn it is (anyone at the table taps)
  seat:(d,ctx)=>S.mode==='local'&&!(d.bt&&Object.values(d.bt).some(Boolean))?d.turn:QCU.me(d,ctx),
  sec:ms=>Math.max(0,Math.ceil(ms/1000)),
};
// the board: hexagons placed in % of a box of the board's own shape, the two edges of each side drawn around it
function qcBoard(d,me,ctx,under){const n=d.n,w=100/(n+.5),h=w*2/Math.sqrt(3),H=(n-1)*.75*h+h,fin=d.win!=null;
  const canPick=!fin&&d.ph==='pick'&&!QCU.bot(d,d.turn)&&(S.mode==='local'?true:QC.canPick(d,me));
  const hl=new Set(d.hl||[]),cur=d.q?d.q.c:-1,last=d.lg?d.lg.c:-1;
  let cells='';
  for(let i=0;i<n*n;i++){const x=i%n,y=(i-x)/n,o=d.o[i];const left=x*w+(y%2?w/2:0),top=y*.75*h/H*100;
    const cls=['qc-c',o==='.'?'qc-f':'qc-o'+o];const tap=canPick&&o==='.';if(tap)cls.push('qc-tap');if(i===cur)cls.push('qc-cur');if(hl.has(i))cls.push('qc-hl');if(i===last&&o!=='.')cls.push('qc-new');
    const L=QC.disp(d.L[i]||'');
    cells+=`<button class="${cls.join(' ')}" style="left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;width:${w.toFixed(3)}%;height:${(h/H*100).toFixed(3)}%" data-ga="c" data-i="${i}" ${tap?'':'disabled'} aria-label="${escH('حرف '+(QC.NAME[d.L[i]]||L)+(o==='.'?'':'، '+QCU.tn(d,+o)))}"><span>${escH(L)}</span></button>`;}
  // the board takes the room the screen leaves (.qc-bw is a size container): as wide as fits, and as high as fits
  const bd=`<div class="qc-bd" style="--ca:${QCU.col(d,0)};--cb:${QCU.col(d,1)};--r:${(100/H).toFixed(4)};--n:${n}"><i class="qc-e qc-et"></i><i class="qc-e qc-eb"></i><i class="qc-e qc-el"></i><i class="qc-e qc-er"></i><div class="qc-gr" style="aspect-ratio:100/${H.toFixed(2)}">${cells}</div></div>`;
  // between questions the line under the board sits right under it, the two centred together in the space left
  return under!=null?`<div class="qc-bw qc-wd"><div class="qc-stk">${bd}<div class="qc-dock">${under}</div></div></div>`:`<div class="qc-bw">${bd}</div>`;}
// one row on top: side 0, the session's name and round, side 1 (each side: its sign, name, edges and rounds won; the
// players' faces show when it is that side's turn would be noise here, the room shows them in its settings)
function qcTeams(d,hn){const card=side=>{const on=d.win==null&&(d.ph==='pick'?d.sd===side:d.ph==='ans'&&d.q&&d.q.at===side);
    const who=QC.sideSeats(d,side).map(s=>nm(d,s)).join('، ');
    const dots=[...Array(QC.ROUNDS).keys()].map(j=>`<u class="${j<d.rw[side]?'on':''}"></u>`).join('');
    return `<div class="qc-tm${on?' qc-on':''}" style="--c:${QCU.col(d,side)}" title="${escH(who)}"><span class="qc-em" aria-hidden="true">${QCU.te(d,side)}</span><b>${escH(QCU.tn(d,side))}</b><i class="qc-dir" aria-label="${side===0?'يوصّل فوق بتحت':'يوصّل يمين بيسار'}">${side===0?'↕':'↔'}</i><span class="qc-rw" aria-label="كسب ${d.rw[side]} من ${QC.ROUNDS}">${dots}</span></div>`;};
  return `<div class="qc-teams">${card(0)}<div class="qc-mid"><b>🐝 خلية ${escH(hn)}</b><small>الجولة ${d.rn}</small></div>${card(1)}</div>`;}
// the question card: letter, question, clock
function qcQ(d,extra){const q=d.q,left=q.dl?q.dl-Date.now():0;
  return `<div class="qc-q"><div class="qc-ql"><span class="qc-lt">${escH(QC.disp(q.L))}</span><small>الجواب يبدأ بحرف ${escH(QC.NAME[q.L]||'')}</small>${q.dl?`<b class="qc-tk" data-until="${q.dl}">${QCU.sec(left)}</b>`:''}</div><p class="qc-qt">${escH(q.t)}</p>${extra||''}</div>`;}
// the four choices, or the box to type the answer
function qcAns(d,can){const q=d.q;
  if(d.am==='type'){if(!can)return '';const v=(S.draft&&S.draft.qct)||'';
    return `<div class="qc-type"><input class="qc-in" data-draft="qct" data-enter="ty" value="${escH(v)}" maxlength="30" autocomplete="off" autocapitalize="off" spellcheck="false" dir="rtl" enterkeyhint="send" placeholder="اكتب الجواب" aria-label="الجواب"><button class="qc-send" data-ga="ty">جاوب</button></div>`;}
  return `<div class="qc-opts">${q.o.map((o,j)=>{const x=q.x.includes(j);return `<button class="qc-op${x?' qc-x':''}" data-ga="a" data-i="${j}" ${can&&!x?'':'disabled'}>${escH(o)}</button>`;}).join('')}</div>`;}
// what happened to the last question
function qcLast(d){const g=d.lg;if(!g)return '';const who=g.by>=0?nm(d,g.by):'';
  const t=g.w>=0?`✓ ${who?escH(who)+' جاب':'جابوها'}: <b>${escH(g.a)}</b>`:`${g.how==='time'?'⏱ خلص الوقت':'✗ ما أحد جابها'}، الجواب: <b>${escH(g.a)}</b>`;
  return `<p class="qc-last${g.w>=0?' qc-ok':''}" style="--c:${g.w>=0?QCU.col(d,g.w):'var(--mut)'}">${t}</p>`;}
// the dock under the board, by phase
function qcDock(d,me,ctx){const fin=d.win!=null,local=S.mode==='local',seat=QCU.seat(d,ctx);
  if(fin)return qcLast(d);
  if(d.ph==='set'){const bots=Object.values(d.bt||{}).some(Boolean);
    const b=(i,on,t)=>`<button class="qc-ch${on?' on':''}" data-ga="so" data-i="${i}" aria-pressed="${on}">${t}</button>`;
    return `<div class="qc-set"><div class="qc-sr"><span>اللوحة</span>${b(5,d.n===5,'٥×٥ عادية')}${b(4,d.n===4,'٤×٤ سريعة')}</div>
      ${d.gm!=='buzz'&&!bots?`<div class="qc-sr"><span>طريقة اللعب</span>${b(10,d.gm==='turn','بالدور')}${b(11,d.gm==='host','فيه مقدّم')}</div><p class="qc-note">${d.gm==='host'?'واحد يمسك الجوال ويقرأ السؤال، والكل يجاوب بصوته، وهو يضغط مين جاوب صح':'الفريق اللي عليه الدور يجاوب من ٤ خيارات، وإذا غلط ينتقل السؤال للفريق الثاني'}</p>`:''}
      ${d.gm==='buzz'?`<div class="qc-sr"><span>الجواب</span>${b(20,d.am==='opt','٤ خيارات')}${b(21,d.am==='type','يكتبه')}</div><p class="qc-note">أسرع واحد يضغط «أعرفها!» يجاوب${d.am==='type'?' بالكتابة':' من ٤ خيارات'}، وإذا غلط تروح الفرصة للفريق الثاني</p>`:''}
      <button class="btn green qc-go" data-ga="go">ابدأ</button></div>`;}
  if(d.ph==='rend'){const w=d.lg?d.lg.w:-1;return `${qcLast(d)}<div class="qc-rend" style="--c:${w>=0?QCU.col(d,w):'var(--mut)'}"><b>${w>=0?`${QCU.te(d,w)} ${escH(QCU.tn(d,w))} كسبوا الجولة ${d.rn}!`:''}</b><button class="btn" data-ga="nx">الجولة الجاية</button></div>`;}
  if(d.ph==='pick'){const mine=local||QC.canPick(d,me);
    const t=d.gm==='host'?`خلّ ${QCU.te(d,d.sd)} ${escH(QCU.tn(d,d.sd))} يختارون حرف، واضغطه`:QCU.bot(d,d.turn)?`${QCU.te(d,d.sd)} ${escH(QCU.tn(d,d.sd))} يختارون حرف…`:mine?`${local?QCU.te(d,d.sd)+' '+escH(QCU.tn(d,d.sd))+': ':''}اختاروا حرف`:`${QCU.te(d,d.sd)} ${escH(QCU.tn(d,d.sd))} يختارون حرف…`;
    return `${qcLast(d)}<p class="qc-hint" style="--c:${QCU.col(d,d.sd)}">${t}</p>`;}
  const q=d.q;if(!q)return '';
  if(d.gm==='host')return qcQ(d,`<p class="qc-ans">الجواب: <b>${escH(q.a)}</b></p><div class="qc-pr"><button class="btn" style="background:${QCU.col(d,0)}" data-ga="pr" data-i="0" aria-label="${escH(QCU.tn(d,0))} جاوبوا صح">✓ ${QCU.te(d,0)} ${escH(QCU.tn(d,0))}</button><button class="btn" style="background:${QCU.col(d,1)}" data-ga="pr" data-i="1" aria-label="${escH(QCU.tn(d,1))} جاوبوا صح">✓ ${QCU.te(d,1)} ${escH(QCU.tn(d,1))}</button><div class="qc-pr2"><button class="btn soft" data-ga="pr" data-i="2">ما أحد عرفها</button><button class="btn soft" data-ga="nq">سؤال ثاني</button></div></div>`);
  if(d.ph==='q'){const can=QC.canBuzz(d,me)&&!local;
    return qcQ(d)+(can?`<button class="qc-bz" style="--c:${QCU.col(d,QCU.side(d,me))}" data-ga="bz">🔔 أعرفها!</button><p class="qc-note">أول واحد يضغط يجاوب، وإذا غلط تروح الفرصة للفريق الثاني</p>`:`<p class="qc-note">أول واحد يضغط «أعرفها!» يجاوب</p>`);}
  // ph 'ans'
  const can=!QCU.bot(d,seat)&&QC.canAnswer(d,seat);const at=q.at;
  const mi=q.miss?`<p class="qc-miss">${q.miss.how==='time'?'⏱ خلص الوقت':'✗ غلط'}${q.miss.by>=0?` (${escH(nm(d,q.miss.by))})`:''}، الفرصة الحين لـ ${QCU.te(d,at)} ${escH(QCU.tn(d,at))}</p>`:'';
  const who=q.by>=0?`<p class="qc-who" style="--c:${QCU.col(d,at)}">${can?'<b class="yt">جاوب!</b>':`${nameTag(d,q.by)} يجاوب…`}</p>`:`<p class="qc-who" style="--c:${QCU.col(d,at)}">${can?`<b class="yt">${local?QCU.te(d,at)+' '+escH(QCU.tn(d,at))+': ':''}جاوبوا!</b>`:`${QCU.te(d,at)} ${escH(QCU.tn(d,at))} يجاوبون…`}</p>`;
  return qcQ(d,mi+who+qcAns(d,can));}

GAMES.q_cell={name:'تحدي الخلية',cat:'quiz',lbc:'#B7791F',minP:2,maxP:8,noTimer:true,fit:true,
  teams:'native',teamsOk:z=>z.length===2&&z.every(x=>x>=1),
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FFF4DA"/><rect x="10" y="8" width="80" height="7" rx="3.5" fill="#E5483F"/><rect x="10" y="85" width="80" height="7" rx="3.5" fill="#E5483F"/><rect x="4" y="18" width="7" height="64" rx="3.5" fill="#2F80ED"/><rect x="89" y="18" width="7" height="64" rx="3.5" fill="#2F80ED"/>${[[30,32,'#E5483F','ح'],[54,32,'#fff','ر'],[42,52,'#E5483F','ف'],[66,52,'#2F80ED','خ'],[30,72,'#fff','ل'],[54,72,'#E5483F','ي']].map(([x,y,c,t])=>`<path d="M${x} ${y-12}l10.4 6v12l-10.4 6l-10.4-6v-12z" fill="${c}" stroke="#B7791F" stroke-width="1.6"/><text x="${x}" y="${y+4.5}" font-size="13" font-weight="800" text-anchor="middle" fill="${c==='#fff'?'#2D4763':'#fff'}" font-family="sans-serif">${t}</text>`).join('')}</svg>`,
  init:()=>({}),
  start(d){const bots={};if(S.mode==='local'&&S.bots)d.pl.forEach((r,s)=>{if(S.bots[r])bots[s]=true;});
    const host=S.mode==='online'?Math.max(0,d.pl.indexOf(S.me)):Math.max(0,d.pl.findIndex((_,s)=>!bots[s]));
    return QC.setup(d,{md:S.mode==='online'?'buzz':'turn',bots,host,rnd:Math.random});},
  // the answer of the question still open stays on the host's phone
  mask:d=>QC.mask(d),
  net:{host:['c','bz','a','ty','so','go','pr','nq','nx'],local:[],ui:[]},
  status(d,ctx){const me=QCU.me(d,ctx);
    if(d.ph==='set')return 'اختاروا الإعدادات واضغطوا «ابدأ»';
    if(d.ph==='rend')return `الجولة ${d.rn} خلصت`;
    if(d.ph==='pick')return `${QCU.te(d,d.sd)} دور ${escH(QCU.tn(d,d.sd))} يختارون حرف`;
    if(d.ph==='q')return 'سؤال! مين يعرفه؟';
    if(d.ph==='ans'&&d.q){if(d.gm==='host')return 'اقرأ السؤال بصوت عالي';const at=d.q.at;return d.q.by>=0?(d.q.by===me?'<b class="yt">دورك تجاوب</b>':`${nameTag(d,d.q.by)} يجاوب`):`${QCU.te(d,at)} ${escH(QCU.tn(d,at))} يجاوبون`;}
    return '';},
  render(d,ctx){const me=QCU.me(d,ctx);const hn=nm(d,Math.min(Math.max(0,d.hs||0),d.pl.length-1));
    // one fixed screen (fit): the board fills what the question and the bars leave, so nothing needs scrolling
    const asking=d.win==null&&(d.ph==='q'||d.ph==='ans');
    const dock=qcDock(d,me,ctx);
    if(d.ph==='set')return `<div class="qc">${qcTeams(d,hn)}<div class="qc-dock">${dock}</div></div>`;
    return asking?`<div class="qc qc-asking">${qcTeams(d,hn)}${qcBoard(d,me,ctx)}<div class="qc-dock">${dock}</div></div>`:`<div class="qc">${qcTeams(d,hn)}${qcBoard(d,me,ctx,dock)}</div>`;},
  click(a,i,d,ctx){const seat=QCU.seat(d,ctx),now=Date.now(),rnd=Math.random;let nd=d;
    if(a==='so'){const m={4:['n',4],5:['n',5],10:['gm','turn'],11:['gm','host'],20:['am','opt'],21:['am','type']}[i];if(m)nd=QC.setOpt(d,m[0],m[1]);}
    else if(a==='go')nd=QC.begin(d,rnd);
    else if(a==='c')nd=QC.choose(d,d.gm==='host'?-1:seat,i,rnd,now);
    else if(a==='bz'){if(S.mode==='local')return;nd=QC.buzz(d,seat,now);}
    else if(a==='a')nd=QC.answer(d,seat,i,rnd,now);
    else if(a==='ty'){const v=((S.draft&&S.draft.qct)||'').trim();if(!v){toast('اكتب الجواب');return;}nd=QC.answer(d,seat,v,rnd,now);if(nd!==d)S.draft={...S.draft,qct:''};}
    else if(a==='pr')nd=QC.judge(d,i===2?-1:i,rnd,now);
    else if(a==='nq')nd=QC.another(d,rnd,now);
    else if(a==='nx')nd=QC.next(d,rnd);
    if(nd!==d)act(nd);},
  // the clocks: run by the phone (one phone) or the room's host
  host:d=>{const nd=QC.tick(d,Math.random,Date.now());return nd===d?null:nd;},
  onSkip:nd=>QC.onLeave(nd),
  bot(d,s,lv){if(d.win!=null)return undefined;const rnd=Math.random,now=Date.now();
    if(d.ph==='set')return QC.begin(d,rnd);
    if(d.ph==='pick'&&d.sx[s]===d.sd)return QC.choose(d,s,QC.botCell(d,d.sd,lv,rnd),rnd,now);
    if(d.ph==='ans'&&QC.canAnswer(d,s)){const j=QC.botAnswer(d,lv,rnd);return QC.answer(d,s,d.am==='type'?d.q.o[j]:j,rnd,now);}
    return d;},
  botDelay:(d,s,lv)=>d.ph==='pick'?1300+rnd(900):d.ph==='ans'?2600+rnd(2600)-(lv||2)*350:900,
  winText(d){if(typeof d.win!=='number')return '';const side=d.sx[d.win];return `${QCU.te(d,side)} فاز ${escH(QCU.tn(d,side))}${d.en==='lf'?'، الفريق الثاني طلع':''}`;},
  winExtra:d=>`الجولات ${d.rw[0]}–${d.rw[1]}`,
};
HELP.q_cell='تحدي الخلية: فريقين ولوحة خلايا سداسية في كل خلية حرف. الفريق الأول يبي يوصّل فوق بتحت، والثاني يوصّل يمين بيسار، بخلايا متصلة من لونه. الفريق اللي عليه الدور يختار حرف، ويطلع سؤال جوابه يبدأ بهالحرف («ال» ما تنحسب، يعني «الرياض» من حرف الراء). اللي يجاوب صح ياخذ الخلية بلون فريقه. أول فريق يوصّل طرفيه يكسب الجولة، وأول فريق يكسب جولتين يفوز، وما فيه تعادل أبد لأن اللوحة دايم توصّل فريق. أونلاين وقريب بدون نت: الكل يشوف السؤال، وأسرع واحد يضغط «أعرفها!» يجاوب (من ٤ خيارات أو يكتب الجواب، تختارونها قبل البداية). إذا غلط أو خلص وقته تروح الفرصة للفريق الثاني، واللي ياخذ الخلية يختار الحرف اللي بعدها. على جوال واحد تختارون: «بالدور» (الفريق اللي اختار الحرف يجاوب من ٤ خيارات، وإذا غلط ينتقل السؤال للفريق الثاني، والاختيار بالدور) أو «فيه مقدّم» (واحد يمسك الجوال ويقرأ السؤال والكل يجاوب بصوته، والمقدّم يشوف الجواب ويضغط مين جاوب صح، ويقدر يطلب سؤال ثاني). ضد البوت: تلعبون بالدور ضد فريق البوت، وكل ما صعب المستوى جاوب صح أكثر واختار حروفه بذكاء يقطع دربكم. اللوحة ٥×٥ أو ٤×٤ للعبة أسرع.';

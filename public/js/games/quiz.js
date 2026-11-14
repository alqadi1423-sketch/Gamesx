'use strict';
/* everyone answers at the same time: rock paper scissors, general knowledge, quick maths, capitals */

const simulViewer=d=>{if(d.win!=null)return null;for(let s=0;s<d.pl.length;s++)if(d.out[s]!=='1'&&!hasPicked(d,s))return s;return null;};
const srng=(d,k)=>mulberry(seedOf(d.gid+'#'+k));
const pickedChips=()=>'';
// noRes: the board already shows the last round, so the status does not repeat it
function simulStatus(d,ctx,extra,noRes){
  if(d.win!=null)return '';
  const me=ctx.local?ctx.v:ctx.v;let s=(d.res&&!noRes?`<small>${d.res}</small><br>`:'')+(extra||'');
  if(!ctx.local&&me>=0)s+=hasPicked(d,me)?'<b>اخترت، ننتظر الباقين</b>':'<b>اختر جوابك</b>';
  else if(ctx.local&&me!=null)s+=`دور ${nameTag(d,me)} يختار`;
  return s;
}
/* ---------- shared look of the answer games (view only: everything is read from d, the private picks and d.res) ---------- */
const QL=['أ','ب','ج','د','هـ','و','ز','ح'];
const stripT=t=>String(t).replace(/<[^>]+>/g,'');
const chipT=t=>escH(stripT(t).replace(/\s*[✓✗]$/,''));
const seatsOf=d=>d.pl.map((r,s)=>s);
// the answer seat s gave in round rd, when this phone may see it (its own; every seat on one phone or after the end)
function seatPick(d,ctx,s,rd){const pv=(ctx&&ctx.priv)||S.priv;const p=pv&&pv[d.pl[s]];
  if(!p||p.gid!==d.gid||p.rd!==rd||p.pick==null||p.pick===NOPICK)return null;
  return S.mode==='local'||(ctx&&s===ctx.v)||d.win!=null?p.pick:null;}
// a player marker in the player's colour
const pDot=(d,s,cls)=>`<i class="pdot ${cls||''}" style="--c:${col(d,s)}" title="${escH(nm(d,s))}"></i>`;
// who has handed in an answer this round (filled) and who we still wait for (hollow)
function qzWho(d,ctx){if(d.win!=null)return '';const al=seatsOf(d).filter(s=>d.out[s]!=='1');if(al.length<2)return '';
  return `<div class="qz-who">${al.map(s=>pDot(d,s,hasPicked(d,s)?'on':'')).join('')}</div>`;}
// the seats that got last round right, read back from d.res ("… • ✓ name، name")
function resOk(d){const m=/• ✓ (.*)$/.exec(d.res||'');if(!m)return [];const ns=m[1].split('، ');return seatsOf(d).filter(s=>ns.includes(nm(d,s)));}
const qzOpt=(t,k,cls,dis,extra)=>`<button class="opt ${cls||''}" data-ga="m" data-i="${k}" ${dis?'disabled':''} style="--i:${k}"><i class="ol">${QL[k]||k+1}</i><span class="ot">${t}</span>${extra||''}</button>`;

/* ---------- rock paper scissors ---------- */
const RPS=['✊','✋','✌️'],RPSN=['حجرة','ورقة','مقص'];
// hand a beats hand b when b is (a+2)%3: rock beats scissors, paper beats rock, scissors beat paper
const rpsBeats=(a,b)=>(a+2)%3===b;
// last round read back from d.res ("name ✊ +1، name ✌️"): the hand and the points of each seat
function rpsLast(d){if(!d.res)return null;const es=d.res.split('، ');const out=[];
  for(const s of seatsOf(d)){const n=nm(d,s)+' ';const e=es.find(x=>x.startsWith(n));if(!e)continue;const r=e.slice(n.length);const k=RPS.findIndex(h=>r.startsWith(h));if(k<0)continue;
    out.push({s,k,got:+((/\+(\d+)/.exec(r)||[0,0])[1])});}
  return out.length?out:null;}
function rpsDuel(d){const L=rpsLast(d);if(!L)return '';const mx=Math.max(...L.map(x=>x.got));const two=L.length===2;const pg=d.pg;
  const hand=(x,j)=>`<div class="rps-p ${mx>0?(x.got===mx?'w':'l'):'t'}" style="--c:${col(d,x.s)};--j:${j}"><span class="rps-h k${x.k} ${two&&j===1?'mir':''} ${x.k===pg?'gold':''}">${RPS[x.k]}</span><b>${escH(nm(d,x.s))}</b>${x.got?`<em>+${x.got}</em>`:''}</div>`;
  return `<div class="rps-duel ${two?'two':''}" id="rpd${d.rd}"><div class="rps-hd">${d.win!=null?'الجولة الأخيرة':`الجولة ${d.rd}`}${mx>0?'':'<span>تعادل</span>'}</div>
    <div class="rps-row">${two?hand(L[0],0)+'<i class="rps-vs">VS</i>'+hand(L[1],1):L.map(hand).join('')}</div></div>`;}
// the last hands of every other player, newest first, so a player can read their habits
function rpsHist(d,v){const hs=d.hs||[];const rows=seatsOf(d).filter(s=>s!==v&&d.out[s]!=='1'&&(hs[s]||'').replace(/-/g,'').length);if(!rows.length)return '';
  return `<div class="rps-hist">${rows.map(s=>`<span class="rps-hr" style="--c:${col(d,s)}">${pDot(d,s,'on')}${[...hs[s].slice(-5)].reverse().map((c,j)=>`<i class="${j?'':'nw'}">${c==='-'?'·':RPS[+c]}</i>`).join('')}</span>`).join('')}</div>`;}
// a bot's guess of the hand seat o plays next: its habits (how often, and what it played after the same hand before) and the pull of the gold hand
function rpsGuess(d,o){const h=String((d.hs||[])[o]||'').replace(/[^012]/g,'');const p=[1,1,1];
  for(const c of h)p[+c]+=.6;
  if(h.length>=2){const last=h[h.length-1];for(let i=0;i+1<h.length;i++)if(h[i]===last)p[+h[i+1]]+=1.4;p[+last]+=.5;}
  if(d.gd!=null&&d.gd>=0)p[d.gd]+=1.2;
  const t=p[0]+p[1]+p[2];return p.map(x=>x/t);}
GAMES.rps={name:'حجرة ورقة مقص',cat:'quiz',lbc:'#C76A2A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#EE8A3C"/><text x="28" y="48" font-size="30" text-anchor="middle">✊</text><text x="72" y="48" font-size="30" text-anchor="middle">✋</text><text x="50" y="84" font-size="30" text-anchor="middle">✌️</text></svg>`,
  // gd: this round's gold hand (a win with it counts two), hs: the hands each seat played, oldest first
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',goal:n<=2?6:3*n,gd:rnd(3),hs:Array(n).fill('')}),
  viewer:simulViewer,coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts),true),
  winExtra:d=>d.res,
  render(d,ctx){const duel=rpsDuel(d);if(d.win!=null)return `<div class="rps">${duel}</div>`;
    const v=ctx.v,mp=v!=null&&v>=0?seatPick(d,ctx,v,d.rd):null,gd=d.gd!=null&&d.gd>=0?d.gd:-1;
    return `<div class="rps ${mp!=null?'picked':''}">${duel}${gd>=0?`<div class="rps-gold" id="rpg${d.rd}"><span class="rps-h k${gd} gold">${RPS[gd]}</span><span>${RPSN[gd]} هي الذهبية هالجولة: الفوز فيها بنقطتين</span></div>`:''}
      <p class="rps-goal">أول واحد يوصل ${d.goal} نقاط يفوز</p><div class="row rps-pick">${RPS.map((e,k)=>`<button class="rpsb k${k} ${mp===k?'sel':''} ${k===gd?'gold':''}" data-ga="m" data-i="${k}" ${ctx.my?'':'disabled'}><span class="rps-h">${e}</span><small>${RPSN[k]}</small>${k===gd?'<em class="rps-x2">×2</em>':''}</button>`).join('')}</div>${qzWho(d,ctx)}${rpsHist(d,v)}</div>`;},
  click(a,k,d,ctx){if(!ctx.my||!(k>=0&&k<3))return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const n=d.pl.length,pts=[...d.pts];const got=Array(n).fill(0);const gd=d.gd;
    picks=picks.map(p=>Number.isInteger(p)&&p>=0&&p<3?p:null);
    for(let a=0;a<n;a++)for(let b=0;b<n;b++){if(picks[a]==null||picks[b]==null)continue;if(rpsBeats(picks[a],picks[b]))got[a]+=picks[a]===gd?2:1;}
    got.forEach((g,s)=>pts[s]+=g);
    const res=d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${RPS[picks[s]]}${got[s]?` +${got[s]}`:''}`).filter(Boolean).join('، ');
    const hs=d.pl.map((r,s)=>(String((d.hs||[])[s]||'')+(picks[s]==null?'-':picks[s])).slice(-12));
    const mx=Math.max(...pts);let win=null;if(mx>=d.goal){const top=pts.map((x,s)=>x===mx?s:-1).filter(s=>s>=0);if(top.length===1)win=top[0];}
    return {...d,pts,rd:d.rd+1,res,hs,pg:gd,gd:Math.floor(srng(d,'gd'+(d.rd+1))()*3),win};},
  // easy plays like a casual player (loves the gold hand, repeats itself); medium half reads the table; hard reads every habit
  botPick(d,s,lv){const gd=d.gd,h=String((d.hs||[])[s]||'').replace(/[^012]/g,'');
    if(lv===1){if(gd!=null&&gd>=0&&Math.random()<.4)return gd;if(h&&Math.random()<.35)return +h[h.length-1];return rnd(3);}
    if(lv===2&&Math.random()<.5)return rnd(3);
    const opp=aliveSeats(d).filter(o=>o!==s);const ev=[0,1,2].map(m=>{let v=0;for(const o of opp){const P=rpsGuess(d,o);
      v+=P[(m+2)%3]*(m===gd?2:1)-.45*P[(m+1)%3]*((m+1)%3===gd?2:1);}return v+(Math.random()-.5)*(lv===3?.04:.2);});
    return ev.indexOf(Math.max(...ev));}
};

/* ---------- quiz factory ---------- */
const ROUNDS=10;
// the deeper quiz (o.deep): every round has a level (four easy for 1 point, four medium for 2, two hard for 3),
// three right answers in a row and every right answer after them earns a point more,
// and each player has two «×2» chips: a doubled answer earns twice the points when right and loses the round's points when wrong
const qTier=rd=>rd<4?1:rd<8?2:3;
const QTN=['','سهل','متوسط','صعب'],QTP=['','نقطة','نقطتين','3 نقاط'];
const pA=p=>Number.isInteger(p)&&p>=0?p%10:null,pX=p=>Number.isInteger(p)&&p>=10;
// the question card: game chip, "question n of 10" with a progress strip, the question, and who has answered
function qzCard(d,ctx,Q,rd,last,deep){const G=GAMES[S.st.g]||{};const t=deep?Q.t||qTier(rd):0;
  return `<div class="qz-card ${t?'t'+t:''}" id="qzc${rd}${last?'f':''}"><div class="qz-hd"><span class="qz-cat"><i class="qz-ic">${G.icon||''}</i><span>${G.name||''}</span></span>${t?`<span class="qz-lv l${t}">${QTN[t]} • ${QTP[t]}</span>`:''}<span class="qz-n">${last?'السؤال الأخير':`سؤال <b>${rd+1}</b> من ${ROUNDS}`}</span></div>
    <div class="qz-prog">${Array.from({length:ROUNDS},(_,k)=>`<i class="${k<rd||last?'done':k===rd?'cur':''} ${deep?'l'+qTier(k):''}"></i>`).join('')}</div>
    <div class="qbox qz-q">${Q.q}</div>${last?'':qzWho(d,ctx)}</div>`;}
const qzSgn=g=>g>0?'+'+g:g<0?'−'+(-g):'0';
// the answer of the round before: the right option, this player's own wrong one, and who got it (with the deeper quiz: what each one earned)
function qzRev(d,ctx,gen,deep){const rd=d.rd-1;if(rd<0)return '';const P=gen(d,rd);const ok=deep&&d.gain?seatsOf(d).filter(s=>d.gain[s]>0):resOk(d);const v=ctx.v;
  const mp=pA(v!=null&&v>=0?seatPick(d,ctx,v,rd):null);const me=mp==null?'':mp===P.a?'ok':'no';
  const gn=deep&&d.gain?seatsOf(d).filter(s=>d.gain[s]).sort((a,b)=>d.gain[b]-d.gain[a]).map(s=>`<span class="qz-g ${d.gain[s]>0?'up':'dn'}" style="--c:${col(d,s)}">${pDot(d,s,'on')}<b dir="ltr">${qzSgn(d.gain[s])}</b>${d.dx&&d.dx[s]==='1'?'<i>×2</i>':''}</span>`).join(''):'';
  return `<div class="qz-rev ${me}" id="qzr${d.rd}"><span class="qz-rl">${me==='ok'?'صح! ':me==='no'?'للأسف، ':''}جواب السؤال ${rd+1}</span>
    <span class="qz-chip ok"><i class="ol">${QL[P.a]}</i><span>${chipT(P.o[P.a])}</span><b>✓</b></span>${me==='no'?`<span class="qz-chip no"><i class="ol">${QL[mp]||''}</i><span>${chipT(P.o[mp])}</span><b>✗</b></span>`:''}
    ${deep?`<span class="qz-gns">${gn||'<small>محد جابها</small>'}</span>`:`<span class="qz-okp">${ok.length?ok.map(s=>pDot(d,s,'on')).join(''):'<small>محد جابها</small>'}</span>`}</div>`;}
// the moment the answer lands: a big ✓ or ✗ with what this player earned. It shows for 1.4 s (a redraw then takes it away,
// so it also shows in light motion), with a sound when one player holds the phone
function qzFx(d,ctx,rd,P,keep){const v=ctx.v;if(v==null||v<0)return '';const mp=pA(seatPick(d,ctx,v,rd));if(mp==null)return '';const ok=mp===P.a;
  const g=d.gain?d.gain[v]:ok?1:0;const k=d.gid+':'+rd+':'+v;
  if(S.qzFx!==k){S.qzFx=k;S.qzFxAt=Date.now();if(!keep)setTimeout(()=>{if(S.qzFx===k)render();},1450);
    if(S.mode!=='local'||!hasBots()||humanSeats(d).length===1)try{sfx(ok?'pop':'lose');}catch(e){}}
  if(!keep&&Date.now()-S.qzFxAt>1400)return '';
  return `<div class="qz-fx ${ok?'ok':'no'}" id="qzfx${rd}"><b>${ok?'✓':'✗'}</b>${d.gain?`<span dir="ltr">${qzSgn(g)}</span>`:''}</div>`;}
// the total under the reveal climbs to its new value (one short count; light motion shows the number at once)
const QZC=new Set();
function qzCount(){let lite=false;try{lite=document.documentElement.classList.contains('lite');}catch(e){}
  for(const e of document.querySelectorAll('.qz-tot[data-from]')){const k=e.id;if(QZC.has(k))continue;QZC.add(k);const a=+e.dataset.from,b=+e.dataset.to;if(a===b||lite)continue;
    const t0=performance.now();e.textContent=String(a);const step=()=>{const f=Math.min(1,(performance.now()-t0)/420);e.textContent=String(Math.round(a+(b-a)*f));if(f<1)requestAnimationFrame(step);};requestAnimationFrame(step);}}
// a bot is right more often on easier questions and on higher levels
const QACC=[0,[.62,.42,.28],[.82,.66,.5],[.96,.88,.76]];
function makeQuiz(o){const deep=!!o.deep;return {name:o.name,cat:'quiz',lbc:o.lbc,icon:o.icon,
  gen:o.gen,
  botPick(d,s,lv){const Q=o.gen(d,d.rd);if(!deep)return Math.random()<[0,.45,.72,.93][lv]?Q.a:rnd(Q.o.length);
    const t=Q.t||qTier(d.rd);const right=Math.random()<QACC[lv][t-1];const wr=Q.o.map((x,k)=>k).filter(k=>k!==Q.a);const k=right?Q.a:wr[rnd(wr.length)];
    // ×2: the hard bot doubles a medium or hard question it knows, and spends what is left near the end; the others guess when to
    const x=d.x2?d.x2[s]:0,left=ROUNDS-d.rd;let dbl=false;
    if(x>0){if(lv===3)dbl=right&&(t>=2&&Math.random()<.65||left<=x);else if(lv===2)dbl=t>=2&&Math.random()<(right?.35:.2);else dbl=Math.random()<.15;}
    return k+(dbl?10:0);},
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',...(deep?{x2:Array(n).fill(2),stk:Array(n).fill(0),gain:Array(n).fill(0),dx:'0'.repeat(n)}:{}),...(o.deal?{qs:o.deal()}:{})}),
  viewer:simulViewer,coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,'',true),
  winExtra:d=>d.res+'<br>النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const G=GAMES[S.st.g]||{};const sty=`style="--qc:${G.lbc||'#2E7D9A'}"`;
    const fin=d.win!=null,rd=fin?d.rd-1:d.rd;if(rd<0)return '';const Q=o.gen(d,rd);
    const g2=Q.big||Q.o.every(t=>stripT(t).length<=7);const cls=`opts qz-opts ${g2?'g2':''} ${Q.big?'emo':''}`;
    const v=ctx.v,me=v!=null&&v>=0;
    if(fin){// the last question with its answer on the buttons and every player's marker on what they chose
      const okS=deep&&d.gain?seatsOf(d).filter(s=>d.gain[s]>0):resOk(d);const mk=k=>{const ss=seatsOf(d).filter(s=>{const p=pA(seatPick(d,ctx,s,rd));return p===k||(p==null&&k===Q.a&&okS.includes(s));});return ss.length?`<span class="qz-mk">${ss.map(s=>pDot(d,s,'on')).join('')}</span>`:'';};
      const mp=pA(me?seatPick(d,ctx,v,rd):null);
      return `<div class="qz fin" ${sty}>${qzFx(d,ctx,rd,Q,true)}${qzCard(d,ctx,Q,rd,true,deep)}<div class="${cls}" id="qzo${rd}f">${Q.o.map((t,k)=>qzOpt(t,k,k===Q.a?'ok':k===mp?'no':'dim',true,mk(k))).join('')}</div></div>`;}
    const raw=me?seatPick(d,ctx,v,rd):null,mp=pA(raw);
    let bar='';
    if(deep&&me&&d.out[v]!=='1'){const key=d.gid+':'+rd+':'+v,on=S.qx===key&&ctx.my,x=d.x2?d.x2[v]:0,st=d.stk?d.stk[v]:0;
      const fire=st>=2?`<span class="qz-stk ${st>=3?'hot':''}" title="سلسلة">🔥 ${st}${st>=2?`<small>${st>=3?'+1 مع كل صح':'صح وحدة وتشتعل'}</small>`:''}</span>`:'';
      const xb=pX(raw)?'<span class="qz-x2 on done"><b>×2</b> ضاعفت</span>':ctx.my&&x>0?`<button class="qz-x2 ${on?'on':''}" data-ga="x2" aria-pressed="${on}"><b>×2</b> ${on?'مضاعف! اختر جوابك':'ضاعف'}<small>${x} باقي</small></button>`:'';
      if(fire||xb)bar=`<div class="qz-bar">${fire}${xb}</div>`;}
    if(me&&rd>0)setTimeout(qzCount,0);
    const tot=deep&&me&&rd>0?`<div class="qz-me"><span>نقاطك</span><b class="qz-tot" id="qzt${d.gid}${rd}" data-from="${d.pts[v]-(d.gain?d.gain[v]:0)}" data-to="${d.pts[v]}">${d.pts[v]}</b></div>`:'';
    return `<div class="qz ${mp!=null?'picked':''}" ${sty}>${rd>0?qzFx(d,ctx,rd-1,o.gen(d,rd-1)):''}${qzRev(d,ctx,o.gen,deep)}${tot}${qzCard(d,ctx,Q,rd,false,deep)}${bar}<div class="${cls}" id="qzo${rd}">${Q.o.map((t,k)=>qzOpt(t,k,mp===k?'sel':'',!ctx.my,mp===k&&pX(raw)?'<em class="qz-xm">×2</em>':'')).join('')}</div></div>`;},
  click(a,k,d,ctx){if(!ctx.my)return;
    if(a==='x2'){if(!deep||!d.x2||!(d.x2[ctx.v]>0))return;const key=d.gid+':'+d.rd+':'+ctx.v;S.qx=S.qx===key?null:key;render();return;}
    if(a!=='m'||!Number.isInteger(k))return;const dbl=deep&&S.qx===d.gid+':'+d.rd+':'+ctx.v&&d.x2&&d.x2[ctx.v]>0;S.qx=null;simulPick(d,ctx.v,k+(dbl?10:0));},
  resolve(d,picks){const Q=o.gen(d,d.rd);const n=d.pl.length,pts=[...d.pts];const ok=[];
    if(!deep){picks.forEach((p,s)=>{if(pA(p)===Q.a){pts[s]++;ok.push(nm(d,s));}});}
    const t=Q.t||qTier(d.rd),x2=deep?[...(d.x2||Array(n).fill(0))]:null,stk=deep?[...(d.stk||Array(n).fill(0))]:null,gain=Array(n).fill(0);let dx='';
    if(deep)picks.forEach((p,s)=>{const k=pA(p);const dbl=k!=null&&pX(p)&&x2[s]>0;if(dbl)x2[s]--;dx+=dbl?'1':'0';
      if(k==null||k>=Q.o.length){stk[s]=0;return;}
      if(k===Q.a){stk[s]++;const g=t*(dbl?2:1)+(stk[s]>=3?1:0);gain[s]=g;pts[s]+=g;ok.push(nm(d,s));}
      else{stk[s]=0;if(dbl){const g=-Math.min(t,pts[s]);gain[s]=g;pts[s]+=g;}}});
    const res=`الجواب: ${String(Q.o[Q.a]).replace(/<[^>]+>/g,'')} • ${ok.length?'✓ '+ok.join('، '):'محد جابها'}`;
    const rd=d.rd+1;return {...d,pts,rd,res,...(deep?{x2,stk,gain,dx}:{}),win:rd>=ROUNDS?mostPts(pts):null};}
};}
function withOptions(R,right,wrongs){const opts=[right,...wrongs];for(let i=opts.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}return {o:opts,a:opts.indexOf(right)};}

/* ---------- question banks ---------- */
// a bank is text: "question|right|wrong|wrong|wrong" lines under #1 (easy), #2 (medium) and #3 (hard)
function qbParse(txt){const out=[];let t=1;for(const l of txt.split('\n')){const s=l.trim();if(!s)continue;if(s[0]==='#'){t=+s.slice(1)||1;continue;}const p=s.split('|');if(p.length>=5)out.push({q:p[0],a:p[1],w:p.slice(2,5),t});}return out;}
const QBN=['gen','sci','geo','islam'],QB={};
const qItem=id=>Number.isInteger(id)&&id>=0?(QB[QBN[Math.floor(id/1000)]]||[])[id%1000]:null;
// the questions this phone has shown lately, so a new game deals ones not seen yet (kept between visits)
const QSK='alaabna.qseen';let QSEEN=null;
function qSeen(){if(!QSEEN){QSEEN={};try{const o=JSON.parse(lsGet(QSK)||'{}');for(const k in o)if(Array.isArray(o[k]))QSEEN[k]=new Set(o[k].filter(Number.isInteger));}catch(e){}}return QSEEN;}
function qSeenSave(){try{const o={};for(const k in QSEEN)o[k]=[...QSEEN[k]].slice(-700);lsSet(QSK,JSON.stringify(o));}catch(e){}}
// ten questions for a new game (drawn on the phone that starts it): one of each round's level, unseen ones first; a level whose questions were all seen starts over
function qDeal(key,byTier){const seen=qSeen();const sn=seen[key]||(seen[key]=new Set());const out=[];
  for(let rd=0;rd<ROUNDS;rd++){const all=byTier[qTier(rd)]||[];if(!all.length){out.push(-1);continue;}let pool=all.filter(id=>!sn.has(id)&&!out.includes(id));
    if(!pool.length){all.forEach(id=>sn.delete(id));pool=all.filter(id=>!out.includes(id));}
    const id=pool[rnd(pool.length)];out.push(id);sn.delete(id);sn.add(id);}
  qSeenSave();return out;}
const qTiers=banks=>{const T={1:[],2:[],3:[]};for(const b of banks){const bi=QBN.indexOf(b);(QB[b]||[]).forEach((it,i)=>T[it.t].push(bi*1000+i));}return T;};
// a bank question for round rd (a game saved before the banks had no deal: a fixed pick from its seed)
function bankQ(d,rd,banks){let it=qItem(d.qs&&d.qs[rd]);
  if(!it){const T=qTiers(banks)[qTier(rd)];it=qItem(T[Math.floor(srng(d,'f'+rd)()*T.length)]);}
  return {q:it.q,...withOptions(srng(d,'o'+rd),it.a,it.w),t:it.t};}
const bankQuiz=(o,banks)=>makeQuiz({...o,deep:true,deal:()=>qDeal('qb',qTiers(banks)),gen:(d,rd)=>bankQ(d,rd,banks)});

GAMES.trivia=bankQuiz({name:'مسابقة المعلومات',lbc:'#2E7D9A',icon:iconE('#3FA3C6','💡')},QBN);

/* ---------- quick maths: the level of the round sets the kind of sum ---------- */
GAMES.math=makeQuiz({name:'سباق الحساب',lbc:'#3B6E2F',icon:iconE('#5C9E4A','➗'),deep:true,
  gen(d,rd){const R=srng(d,'m'+rd),t=qTier(rd),ri=(a,b)=>a+Math.floor(R()*(b-a+1)),op=Math.floor(R()*4);let a,b,c,ans,q,near=[1,-1,2,-2,10,-10];
    if(t===1){if(op<2){a=ri(12,69);b=ri(6,39);ans=a+b;q=`${a} + ${b}`;}else if(op===2){a=ri(30,99);b=ri(4,a-10);ans=a-b;q=`${a} − ${b}`;}else{a=ri(2,9);b=ri(3,9);ans=a*b;q=`${a} × ${b}`;near=[a,-a,b,-b,1,-1];}}
    else if(t===2){if(op===0){a=ri(120,480);b=ri(110,470);ans=a+b;q=`${a} + ${b}`;near=[10,-10,100,-100,1,-1];}else if(op===1){a=ri(300,950);b=ri(120,a-50);ans=a-b;q=`${a} − ${b}`;near=[10,-10,100,-100,1,-1];}
      else if(op===2){a=ri(6,15);b=ri(6,15);ans=a*b;q=`${a} × ${b}`;near=[a,-a,b,-b,10,-10];}else{b=ri(3,12);ans=ri(4,15);a=b*ans;q=`${a} ÷ ${b}`;near=[1,-1,2,-2,b,-b];}}
    else{if(op===0){a=ri(4,12);b=ri(4,12);c=ri(6,45);ans=a*b+c;q=`${a} × ${b} + ${c}`;near=[a,-a,b,-b,10,-10];}
      else if(op===1){const p=[10,20,25,50,75][ri(0,4)];const base=p%20===0||p===50?ri(3,20)*10:ri(2,12)*20;ans=base*p/100;q=`<span dir="rtl">${p}٪ من ${base}</span>`;near=[5,-5,10,-10,ans,-Math.floor(ans/2)];}
      else if(op===2){a=ri(11,25);ans=a*a;q=`${a}²`;near=[a,-a,10,-10,2*a,1];}else{a=ri(13,49);b=ri(3,9);ans=a*b;q=`${a} × ${b}`;near=[b,-b,10,-10,a,-a];}}
    const w=new Set();for(let k=0;w.size<3&&k<40;k++){const x=ans+near[Math.floor(R()*near.length)];if(x!==ans&&x>=0)w.add(x);}for(let k=1;w.size<3;k++)if(ans+k*3!==ans)w.add(ans+k*3);
    return {q:`<span class="qz-eq" dir="ltr">${q} = <b>?</b></span>`,...withOptions(R,String(ans),[...w].map(String)),t};}});

/* ---------- capitals: country → capital, and on harder rounds capital → country; wrong options come from the same part of the world ---------- */
const CAPS=(t=>t.trim().split('\n').map(l=>{const p=l.trim().split('|');return {c:p[0],k:p[1],r:p[2],t:+p[3]||2,x:p[4]||''};}))(`
السعودية|الرياض|ar|1|جدة
مصر|القاهرة|ar|1|الإسكندرية
الأردن|عمّان|ar|1|إربد
الإمارات|أبوظبي|ar|1|دبي
قطر|الدوحة|ar|1|
البحرين|المنامة|ar|1|
عُمان|مسقط|ar|1|صلالة
الكويت|الكويت|ar|1|
اليمن|صنعاء|ar|1|
العراق|بغداد|ar|1|البصرة
سوريا|دمشق|ar|1|حلب
لبنان|بيروت|ar|1|صيدا
السودان|الخرطوم|ar|2|
ليبيا|طرابلس|ar|2|
المغرب|الرباط|ar|2|الدار البيضاء
تونس|تونس|ar|1|صفاقس
الجزائر|الجزائر|ar|1|وهران
موريتانيا|نواكشوط|ar|2|نواذيبو
الصومال|مقديشو|ar|2|
جيبوتي|جيبوتي|ar|2|
جزر القمر|موروني|ar|3|
تركيا|أنقرة|as|2|إسطنبول
إيران|طهران|as|1|أصفهان
باكستان|إسلام آباد|as|2|كراتشي
أفغانستان|كابل|as|2|قندهار
الهند|نيودلهي|as|1|مومباي
الصين|بكين|as|1|شنغهاي
اليابان|طوكيو|as|1|أوساكا
كوريا الجنوبية|سيول|as|1|بوسان
كوريا الشمالية|بيونغ يانغ|as|2|
ماليزيا|كوالالمبور|as|2|
تايلاند|بانكوك|as|2|
الفلبين|مانيلا|as|2|
سنغافورة|سنغافورة|as|2|
فيتنام|هانوي|as|2|هوشي منه
بنغلاديش|دكا|as|2|شيتاغونغ
نيبال|كاتماندو|as|3|
منغوليا|أولان باتور|as|3|
كازاخستان|أستانا|as|3|ألماتي
أوزبكستان|طشقند|as|3|سمرقند
أذربيجان|باكو|as|3|
جورجيا|تبليسي|as|3|
أرمينيا|يريفان|as|3|
قيرغيزستان|بيشكيك|as|3|
طاجيكستان|دوشنبه|as|3|
تركمانستان|عشق آباد|as|3|
كمبوديا|بنوم بنه|as|3|
لاوس|فيينتيان|as|3|
ميانمار|نايبيداو|as|3|يانغون
بروناي|بندر سري بغاوان|as|3|
المالديف|ماليه|as|3|
بوتان|تيمفو|as|3|
تيمور الشرقية|ديلي|as|3|
فرنسا|باريس|eu|1|مرسيليا
ألمانيا|برلين|eu|1|ميونخ
إيطاليا|روما|eu|1|ميلانو
إسبانيا|مدريد|eu|1|برشلونة
بريطانيا|لندن|eu|1|مانشستر
روسيا|موسكو|eu|1|سانت بطرسبرغ
اليونان|أثينا|eu|2|سالونيك
السويد|ستوكهولم|eu|2|غوتنبرغ
النرويج|أوسلو|eu|2|بيرغن
البرتغال|لشبونة|eu|2|بورتو
سويسرا|برن|eu|3|زيورخ
النمسا|فيينا|eu|2|سالزبورغ
بلجيكا|بروكسل|eu|2|أنتويرب
بولندا|وارسو|eu|2|كراكوف
هولندا|أمستردام|eu|2|روتردام
الدنمارك|كوبنهاغن|eu|2|
فنلندا|هلسنكي|eu|2|
أيرلندا|دبلن|eu|2|كورك
آيسلندا|ريكيافيك|eu|3|
التشيك|براغ|eu|2|
المجر|بودابست|eu|2|
رومانيا|بوخارست|eu|3|
بلغاريا|صوفيا|eu|3|
صربيا|بلغراد|eu|3|
كرواتيا|زغرب|eu|3|
أوكرانيا|كييف|eu|2|خاركيف
بيلاروسيا|مينسك|eu|3|
ألبانيا|تيرانا|eu|3|
البوسنة والهرسك|سراييفو|eu|3|
سلوفاكيا|براتيسلافا|eu|3|
سلوفينيا|ليوبليانا|eu|3|
لاتفيا|ريغا|eu|3|
ليتوانيا|فيلنيوس|eu|3|
إستونيا|تالين|eu|3|
لوكسمبورغ|لوكسمبورغ|eu|3|
مالطا|فاليتا|eu|3|
قبرص|نيقوسيا|eu|3|
مولدوفا|كيشيناو|eu|3|
مقدونيا الشمالية|سكوبيا|eu|3|
الجبل الأسود|بودغوريتسا|eu|3|
ليختنشتاين|فادوز|eu|3|
أمريكا|واشنطن|am|1|نيويورك
كندا|أوتاوا|am|2|تورونتو
البرازيل|برازيليا|am|2|ريو دي جانيرو
الأرجنتين|بوينس آيرس|am|2|قرطبة
المكسيك|مكسيكو سيتي|am|2|غوادالاخارا
كوبا|هافانا|am|2|
كولومبيا|بوغوتا|am|3|ميديلين
بيرو|ليما|am|3|
تشيلي|سانتياغو|am|3|
فنزويلا|كاراكاس|am|3|ماراكايبو
الإكوادور|كيتو|am|3|غواياكيل
الأوروغواي|مونتيفيديو|am|3|
الباراغواي|أسونسيون|am|3|
بنما|بنما|am|3|
جامايكا|كينغستون|am|3|
كوستاريكا|سان خوسيه|am|3|
هندوراس|تيغوسيغالبا|am|3|
نيكاراغوا|ماناغوا|am|3|
السلفادور|سان سلفادور|am|3|
هايتي|بورت أو برنس|am|3|
الدومينيكان|سانتو دومينغو|am|3|
الباهاما|ناساو|am|3|
أستراليا|كانبرا|oc|2|سيدني
نيوزيلندا|ويلينغتون|oc|3|أوكلاند
فيجي|سوفا|oc|3|
بابوا غينيا الجديدة|بورت مورسبي|oc|3|
نيجيريا|أبوجا|af|2|لاغوس
كينيا|نيروبي|af|2|مومباسا
إثيوبيا|أديس أبابا|af|2|
غانا|أكرا|af|3|كوماسي
السنغال|داكار|af|3|
مالي|باماكو|af|3|تمبكتو
النيجر|نيامي|af|3|
تشاد|إنجامينا|af|3|
الكاميرون|ياوندي|af|3|دوالا
أوغندا|كمبالا|af|3|
رواندا|كيغالي|af|3|
زيمبابوي|هراري|af|3|بولاوايو
زامبيا|لوساكا|af|3|
أنغولا|لواندا|af|3|
موزمبيق|مابوتو|af|3|
مدغشقر|أنتاناناريفو|af|3|
الكونغو الديمقراطية|كينشاسا|af|3|لوبومباشي
جمهورية الكونغو|برازافيل|af|3|
إريتريا|أسمرة|af|3|
جنوب السودان|جوبا|af|3|
تنزانيا|دودوما|af|3|دار السلام
ليبيريا|مونروفيا|af|3|
سيراليون|فريتاون|af|3|
غينيا|كوناكري|af|3|
بوركينا فاسو|واغادوغو|af|3|
توغو|لومي|af|3|
الغابون|ليبرفيل|af|3|
ناميبيا|ويندهوك|af|3|
بوتسوانا|غابورون|af|3|
ملاوي|ليلونغوي|af|3|بلانتاير
ليسوتو|ماسيرو|af|3|
موريشيوس|بورت لويس|af|3|
غامبيا|بانجول|af|3|
أفريقيا الوسطى|بانغي|af|3|
`);
const capReg=r=>r==='oc'?['oc','as']:[r];
GAMES.caps=makeQuiz({name:'عواصم الدول',lbc:'#7A3E9D',icon:iconE('#9B5BC2','🌍'),deep:true,
  // an id is the country's place in CAPS, plus 1000 when the question gives the capital and asks for the country
  deal:()=>{const T={1:[],2:[],3:[]};CAPS.forEach((C,i)=>{T[C.t].push(i);if(C.t>=2&&C.c!==C.k)T[Math.min(3,C.t+1)].push(1000+i);});return qDeal('caps',T);},
  gen(d,rd){let id=d.qs&&d.qs[rd];if(!(Number.isInteger(id)&&CAPS[id%1000])){const R0=srng(d,'caps');id=Math.floor(R0()*1000+rd*7)%CAPS.length;}
    const rev=id>=1000,i=id%1000,C=CAPS[i],R=srng(d,'c'+rd);const reg=capReg(C.r);
    const pool=CAPS.filter((x,j)=>j!==i&&reg.includes(x.r)).map(x=>rev?x.c:x.k).filter(x=>x!==(rev?C.c:C.k));
    const w=new Set();if(!rev&&C.x)w.add(C.x);for(let k=0;w.size<3&&k<60;k++)w.add(pool[Math.floor(R()*pool.length)]);
    for(let k=0;w.size<3;k++){const x=CAPS[(i+1+k)%CAPS.length];w.add(rev?x.c:x.k);}
    const t=rev?Math.min(3,C.t+1):C.t;
    return {q:rev?`<b class="qz-cap">${C.k}</b> عاصمة أي دولة؟`:`ما عاصمة ${C.c}؟`,...withOptions(R,rev?C.c:C.k,[...w].slice(0,3)),t};}});

QB.gen=qbParse(`
#1
كم يومًا في السنة الكبيسة؟|366|365|364|360
كم لاعبًا لكل فريق داخل ملعب كرة القدم؟|11|10|9|12
كم لاعبًا لكل فريق داخل ملعب كرة السلة؟|5|6|7|4
كم دقيقة في الساعة؟|60|100|50|30
كم ثانية في الدقيقة؟|60|100|30|120
كم ساعة في اليوم؟|24|12|20|48
كم يومًا في الأسبوع؟|7|5|6|10
كم شهرًا في السنة؟|12|10|11|13
أي فصل يأتي بعد الشتاء؟|الربيع|الصيف|الخريف|الشتاء
ما الشكل الذي له 4 أضلاع متساوية و4 زوايا قائمة؟|المربع|المستطيل|المعين|شبه المنحرف
كم ضلعًا للشكل السداسي؟|6|5|7|8
كم ضلعًا للشكل الخماسي؟|5|6|4|8
ما العملة الرسمية في السعودية؟|الريال|الدينار|الدرهم|الجنيه
كم هللة في الريال السعودي؟|100|10|50|1000
ما المشروب الذي يقدّم مع التمر في الضيافة السعودية؟|القهوة العربية|الشاي الأخضر|الحليب|العصير
ما اسم الإناء التقليدي لصب القهوة العربية؟|الدلة|الإبريق|الترمس|الفنجان
ما اسم الحبل الأسود الذي يوضع فوق الشماغ؟|العقال|البشت|الطاقية|الغترة
ما اسم الرداء الذي يلبسه الرجل فوق الثوب في المناسبات؟|البشت|العقال|الشماغ|الطاقية
ما الأكلة السعودية الشهيرة المصنوعة من الرز واللحم؟|الكبسة|الملوخية|الكسكسي|الفلافل
ما عملة الولايات المتحدة؟|الدولار|اليورو|الجنيه|الين
كم حلقة في شعار الألعاب الأولمبية؟|5|4|6|7
ما لون البطاقة التي يُطرد بها اللاعب في كرة القدم؟|الحمراء|الصفراء|الزرقاء|الخضراء
كم شوطًا في مباراة كرة القدم؟|2|3|4|1
في أي لعبة تُقال كلمة «كش ملك»؟|الشطرنج|الداما|البلوت|الكيرم
ما الطائر الذي يرمز للسلام؟|الحمامة|الصقر|الغراب|البومة
ما الطائر الذي اشتهر العرب بالصيد به؟|الصقر|الحمام|البطريق|الببغاء
ما الحيوان الذي يسمى «ملك الغابة»؟|الأسد|النمر|الفيل|الذئب
ما الحيوان الذي يُضرب به المثل في الصبر؟|الجمل|الحصان|الأسد|الصقر
ماذا يسمى صغير البقرة؟|عجل|حوار|جدي|مهر
ماذا يسمى صغير الكلب؟|جرو|شبل|مهر|حوار
ما اسم بيت الطائر؟|العش|العرين|الخلية|الإسطبل
ما المادة الأساسية التي يُصنع منها الخبز؟|الدقيق|السكر|الأرز|الملح
من أي نبات يُصنع الفشار؟|الذرة|القمح|الأرز|الشعير
ما الفاكهة التي يُصنع منها الزبيب؟|العنب|التين|التمر|المشمش
ما النبات الذي يُضاف حبه للقهوة العربية لإعطائها نكهة؟|الهيل|الكمون|الكركم|الكزبرة
ما ضد كلمة «طويل»؟|قصير|عريض|كبير|بعيد
ما ضد كلمة «نهار»؟|ليل|صباح|ظهر|عصر
ما مرادف كلمة «سعيد»؟|فرحان|حزين|غاضب|تعبان
ما مؤنث كلمة «ديك»؟|دجاجة|ديكة|بطة|حمامة
ما جمع كلمة «كتاب»؟|كتب|كتاتيب|كتّاب|مكاتب
ما مفرد كلمة «أقلام»؟|قلم|قلامة|مقلمة|أقلوم
ما نوع كلمة «يكتب»؟|فعل مضارع|فعل ماضٍ|فعل أمر|اسم
من مؤسس المملكة العربية السعودية الحديثة؟|الملك عبدالعزيز آل سعود|الملك سعود|الملك فيصل|الملك خالد
ما اسم رؤية السعودية التنموية التي أُطلقت عام 2016؟|رؤية 2030|رؤية 2020|رؤية 2040|رؤية 2050
ما لونا علم المملكة العربية السعودية؟|الأخضر والأبيض|الأحمر والأبيض|الأخضر والأحمر|الأسود والأخضر
ماذا كُتب على علم السعودية فوق السيف؟|الشهادتان|اسم المملكة|البسملة|تاريخ التأسيس
ما الشركة التي تصنع هاتف آيفون؟|أبل|سامسونج|هواوي|نوكيا
ما الجزء الذي يُعد «عقل» الحاسوب؟|المعالج|الشاشة|الفأرة|الطابعة
ما الأداة التي نحرك بها المؤشر على شاشة الحاسوب؟|الفأرة|لوحة المفاتيح|الطابعة|الماسح الضوئي
ما أطول برج في العالم؟|برج خليفة|برج إيفل|برج بيزا|برج المملكة
في أي مدينة يقع برج خليفة؟|دبي|أبوظبي|الدوحة|الرياض
ما نصف العدد 250؟|125|150|100|175
كم ناتج 7 × 8؟|56|54|48|64
كم وجهًا للمكعب؟|6|8|4|12
#2
أصغر عدد أولي؟|2|1|3|0
كم ناتج 12 × 12؟|144|124|132|154
كم ناتج 15 × 4؟|60|45|50|64
كم ناتج 125 ÷ 5؟|25|20|30|15
ما الجذر التربيعي للعدد 144؟|12|14|11|16
كم مجموع زوايا المثلث؟|180|90|270|360
كم مجموع زوايا المربع؟|360|180|270|540
كم سنتيمترًا في المتر؟|100|10|1000|60
كم جرامًا في الكيلوجرام؟|1000|100|500|10
كم ضلعًا للشكل الثماني؟|8|6|10|12
ماذا يسمى الألف مليون؟|مليار|تريليون|ألفية|عشرة ملايين
كم سنة في القرن؟|100|10|50|1000
كم يومًا في شهر فبراير في السنة الكبيسة؟|29|28|30|31
أي هذه الأشهر الميلادية فيه 30 يومًا؟|أبريل|يناير|مارس|مايو
كم دقيقة في اليوم؟|1440|1200|1000|2400
كم أسبوعًا في السنة تقريبًا؟|52|48|50|56
ما الرقم الروماني X؟|10|5|50|100
ما ربع العدد 1000؟|250|200|400|100
أي هذه الأعداد عدد أولي؟|17|21|27|15
كم بِت في البايت الواحد؟|8|4|10|16
أي وحدة تخزين هي الأكبر؟|تيرابايت|جيجابايت|ميجابايت|كيلوبايت
من شارك بول ألين في تأسيس شركة مايكروسوفت؟|بيل غيتس|ستيف جوبز|مارك زوكربيرغ|إيلون ماسك
في أي يوم يوافق اليوم الوطني السعودي؟|23 سبتمبر|22 فبراير|2 ديسمبر|1 يناير
في أي يوم يوافق يوم التأسيس السعودي؟|22 فبراير|23 سبتمبر|18 ديسمبر|10 مارس
في أي سنة ميلادية أُعلن توحيد المملكة العربية السعودية؟|1932|1902|1945|1953
في أي سنة ميلادية استرد الملك عبدالعزيز الرياض؟|1902|1932|1727|1920
ما شعار المملكة العربية السعودية؟|سيفان ونخلة|نسر|هلال ونجمة|صقر
ما أول عاصمة للدولة السعودية الأولى؟|الدرعية|الرياض|حائل|عنيزة
ما المشروع السعودي الذي تقع فيه مدينة «ذا لاين»؟|نيوم|القدية|العلا|الدرعية
ما الأكلة النجدية المصنوعة من القمح المجروش والمرق أو اللبن؟|الجريش|الفول|الكشري|الحريرة
ما الحلى الشعبي الصغير المقلي الذي يُغمس بالدبس أو العسل؟|اللقيمات|الكنافة|البسبوسة|المعمول
ما الحلوى الشعبية المصنوعة من الدقيق والتمر والمشهورة في القصيم؟|الكليجا|البسبوسة|الكنافة|المهلبية
ما الرقصة الشعبية الحربية التي تؤدى بالسيوف والطبول في نجد؟|العرضة|الدبكة|التنورة|السامري
ما أشهر صنف تمر في المدينة المنورة؟|العجوة|السكري|الخلاص|البرحي
ما الفاكهة التي يُصنع منها «قمر الدين»؟|المشمش|الخوخ|البرتقال|العنب
ما التوابل الأغلى ثمنًا في العالم؟|الزعفران|الهيل|القرفة|الفلفل الأسود
من أي نبات يُستخرج السكر غالبًا؟|قصب السكر|القمح|الذرة|الأرز
أي هذه الفواكه أغنى بفيتامين ج؟|البرتقال|الموز|التمر|العنب
كم دولة في مجلس التعاون الخليجي؟|6|5|7|8
أي هذه الدول ليست من دول الخليج العربي؟|الأردن|الكويت|قطر|البحرين
ما عملة الكويت؟|الدينار|الريال|الدرهم|الليرة
ما عملة الإمارات؟|الدرهم|الريال|الدينار|الجنيه
ما عملة مصر؟|الجنيه|الدينار|الريال|الليرة
ما عملة أغلب دول الاتحاد الأوروبي؟|اليورو|الدولار|الجنيه|الفرنك
ما عملة اليابان؟|الين|اليوان|الوون|الروبية
ما عملة الهند؟|الروبية|الين|اليوان|الدينار
ما عملة الصين؟|اليوان|الين|الوون|الروبية
ما عملة تركيا؟|الليرة|الدينار|الريال|الروبل
ما عملة روسيا؟|الروبل|الليرة|الزلوتي|الفرنك
ما عملة الأردن؟|الدينار|الجنيه|الريال|الدرهم
ما عملة المغرب؟|الدرهم|الدينار|الريال|الجنيه
ما عملة قطر؟|الريال|الدينار|الدرهم|الجنيه
ما عملة البحرين؟|الدينار|الريال|الدرهم|الليرة
ما عملة سلطنة عمان؟|الريال|الدينار|الدرهم|الجنيه
ما عملة بريطانيا؟|الجنيه الإسترليني|اليورو|الدولار|الفرنك
كم دقيقة مدة مباراة كرة القدم الرسمية بدون الوقت الإضافي؟|90|60|80|120
كم دقيقة مدة الشوط الواحد في كرة القدم؟|45|30|40|60
كم نقطة تُحتسب للرمية من خارج القوس في كرة السلة؟|3|2|1|4
كم لاعبًا لكل فريق داخل ملعب الكرة الطائرة؟|6|5|7|11
كم لاعبًا لكل فريق داخل ملعب كرة اليد؟|7|6|5|11
كل كم سنة تقام كأس العالم لكرة القدم؟|4|2|3|5
كل كم سنة تقام الألعاب الأولمبية الصيفية؟|4|2|3|5
أي قطعة شطرنج تتحرك على شكل حرف L؟|الحصان|الفيل|القلعة|الوزير
كم مربعًا في رقعة الشطرنج؟|64|36|81|100
ما أقوى قطعة في الشطرنج من حيث الحركة؟|الوزير|الملك|القلعة|الحصان
أي دولة استضافت كأس العالم لكرة القدم 2022؟|قطر|السعودية|الإمارات|روسيا
أي دولة ستستضيف كأس العالم لكرة القدم 2034؟|السعودية|قطر|المغرب|الإمارات
ما الدولة الأكثر فوزًا بكأس العالم لكرة القدم؟|البرازيل|ألمانيا|إيطاليا|الأرجنتين
ما لقب المنتخب السعودي لكرة القدم؟|الأخضر|الأبيض|النشامى|الفراعنة
ما لقب منتخب مصر لكرة القدم؟|الفراعنة|أسود الأطلس|النشامى|الأخضر
ما لقب منتخب المغرب لكرة القدم؟|أسود الأطلس|الفراعنة|نسور قرطاج|محاربو الصحراء
ما الرياضة التي تُلعب بمضرب وريشة؟|الريشة الطائرة|التنس|كرة الطاولة|الإسكواش
في أي مدينة يقع مقر الأمم المتحدة الرئيسي؟|نيويورك|جنيف|باريس|لندن
من رسم لوحة الموناليزا؟|ليوناردو دافنشي|بيكاسو|فان جوخ|مايكل أنجلو
ما اسم السفينة الشهيرة التي غرقت في رحلتها الأولى عام 1912؟|تيتانيك|كوين ماري|لوسيتانيا|بسمارك
من يُنسب إليهما اختراع الطائرة؟|الأخوان رايت|الأخوان لوميير|الأخوان غريم|الأخوان ماكدونالد
من أول رائد فضاء عربي؟|الأمير سلطان بن سلمان|محمد فارس|هزاع المنصوري|ريانة برناوي
من لُقّب بأمير الشعراء؟|أحمد شوقي|حافظ إبراهيم|المتنبي|نزار قباني
من الشاعر الجاهلي المشهور بالفروسية وحبه لعبلة؟|عنترة بن شداد|امرؤ القيس|الشنفرى|طرفة بن العبد
من الشاعر الملقب بشاعر الرسول ﷺ؟|حسان بن ثابت|امرؤ القيس|المتنبي|عنترة بن شداد
من مؤلف كتاب «البخلاء»؟|الجاحظ|ابن خلدون|المتنبي|الأصمعي
من مؤلف «المقدمة» الشهيرة في علم الاجتماع؟|ابن خلدون|ابن بطوطة|الجاحظ|الطبري
من الرحالة المغربي صاحب الرحلة الشهيرة؟|ابن بطوطة|ابن جبير|الإدريسي|ابن خلدون
ما علامة الرفع الأصلية في النحو العربي؟|الضمة|الفتحة|الكسرة|السكون
ما علامة النصب الأصلية في النحو العربي؟|الفتحة|الضمة|الكسرة|السكون
ما علامة الجر الأصلية في النحو العربي؟|الكسرة|الفتحة|الضمة|السكون
ما الحرف الذي يُكتب ولا يُنطق في اسم «عمرو»؟|الواو|الميم|الراء|العين
ما نوع كلمة «اكتبْ»؟|فعل أمر|فعل ماضٍ|فعل مضارع|حرف
ما مؤنث كلمة «أحمر»؟|حمراء|أحمرة|حمرى|محمرة
ما المثنى من كلمة «كتاب» في حالة الرفع؟|كتابان|كتابين|كتب|كتابات
ما جمع كلمة «شمس»؟|شموس|شمسات|أشماس|شماس
كم عدد حروف الهجاء العربية؟|28|24|26|32
ما آخر حرف في الترتيب الهجائي العربي؟|الياء|الواو|الهاء|الزاي
ما الخط العربي الأشهر في كتابة المصاحف المطبوعة؟|النسخ|الرقعة|الديواني|الكوفي
ماذا يسمى صغير الماعز؟|جدي|حمل|عجل|فلو
ماذا يسمى صغير الخروف؟|حمل|جدي|عجل|مهر
ما اسم صوت الذئب؟|العواء|النباح|الزئير|الصهيل
ما اسم صوت الحمار؟|النهيق|الصهيل|الزئير|الخوار
ما اسم صوت البقرة؟|الخوار|النهيق|الثغاء|العواء
ما اسم صوت الخروف؟|الثغاء|الخوار|النهيق|الصهيل
ما اسم بيت الأسد؟|العرين|الوكر|الخلية|الجحر
ما اسم بيت الحصان؟|الإسطبل|العرين|العش|القن
ما اسم بيت الدجاج؟|القن|الإسطبل|العرين|الخلية
#3
ما الرقم الروماني L؟|50|5|100|500
ما الرقم الروماني C؟|100|50|500|1000
كم عدد الأعداد الأولية الأصغر من 20؟|8|6|7|10
كم حافة للمكعب؟|12|8|6|10
كم رأسًا للمكعب؟|8|6|12|4
ما قيمة العدد باي (π) تقريبًا؟|3.14|2.71|1.41|3.41
كم ميجابايت في الجيجابايت بالنظام الثنائي؟|1024|1000|100|512
ما لغة البرمجة التي تحمل اسم جزيرة إندونيسية؟|جافا|بايثون|روبي|سويفت
في أي سنة ميلادية تأسست الدولة السعودية الأولى؟|1727|1902|1932|1818
كم ملكًا من أبناء الملك عبدالعزيز حكموا السعودية قبل الملك سلمان؟|5|4|6|7
من أي منطقة سعودية يشتهر تمر السكري؟|القصيم|الأحساء|المدينة المنورة|تبوك
من أي حبوب يُصنع الكسكسي؟|القمح|الأرز|الذرة|الشوفان
ما عملة كوريا الجنوبية؟|الوون|الين|اليوان|الروبية
ما عملة سويسرا؟|الفرنك|اليورو|الكرونة|المارك
كم كيلومترًا طول سباق الماراثون تقريبًا؟|42|21|50|30
كم نقطة يحتاج اللاعب للفوز بالشوط في كرة الطاولة عادة؟|11|21|15|10
ما الدولة التي استضافت أول كأس عالم لكرة القدم عام 1930؟|الأوروغواي|البرازيل|إيطاليا|فرنسا
ما أول منتخب عربي يصل إلى نصف نهائي كأس العالم لكرة القدم؟|المغرب|السعودية|تونس|الجزائر
أي منتخب فاز عليه المنتخب السعودي في أول مباراة له بكأس العالم 2022؟|الأرجنتين|المكسيك|بولندا|فرنسا
ما لقب منتخب تونس لكرة القدم؟|نسور قرطاج|أسود الأطلس|محاربو الصحراء|الفراعنة
ما لقب منتخب الجزائر لكرة القدم؟|محاربو الصحراء|نسور قرطاج|أسود الأطلس|الفراعنة
في أي رياضة تُستخدم كلمتا «بيردي» و«بوغي»؟|الجولف|التنس|البولينغ|الكريكيت
في أي متحف تُعرض لوحة الموناليزا؟|اللوفر|المتحف البريطاني|متحف برادو|متحف المتروبوليتان
من صاحب المعلقة التي مطلعها «قفا نبكِ من ذكرى حبيب ومنزل»؟|امرؤ القيس|عنترة بن شداد|زهير بن أبي سلمى|طرفة بن العبد
من الشاعر الذي قال: «الخيل والليل والبيداء تعرفني»؟|المتنبي|أبو تمام|البحتري|أبو فراس الحمداني
من ترجم كتاب «كليلة ودمنة» إلى العربية؟|ابن المقفع|الجاحظ|ابن قتيبة|المتنبي
من واضع علم النحو بحسب المشهور؟|أبو الأسود الدؤلي|سيبويه|الخليل بن أحمد|الكسائي
من واضع علم العروض؟|الخليل بن أحمد الفراهيدي|سيبويه|أبو الأسود الدؤلي|الأصمعي
ما اسم كتاب سيبويه المشهور في النحو؟|الكتاب|الأجرومية|الألفية|المقدمة
من صاحب الألفية المشهورة في النحو؟|ابن مالك|سيبويه|ابن هشام|ابن جني
ما علامة الجزم الأصلية في النحو العربي؟|السكون|الفتحة|الكسرة|الضمة
كم عدد الحروف الشمسية في العربية؟|14|10|12|16
كان وأخواتها ترفع المبتدأ وتنصب…؟|الخبر|الفاعل|المفعول به|الحال
إنّ وأخواتها تنصب المبتدأ وترفع…؟|الخبر|الفاعل|المفعول به|التمييز
ما اسم صوت الأفعى؟|الفحيح|النقيق|الزئير|الهديل
ما اسم صوت الضفدع؟|النقيق|الفحيح|الهديل|النعيق
ما اسم صوت الحمام؟|الهديل|النعيق|النقيق|الصهيل
ما اسم صوت الغراب؟|النعيق|الهديل|الفحيح|الثغاء
ما الحيوان الذي يُكنّى «أبو الحصين»؟|الثعلب|الذئب|الأسد|الضبع
`);
QB.sci=qbParse(`
#1
ما الصيغة الكيميائية للماء؟|H₂O|CO₂|O₂|H₂O₂
أي غاز نحتاجه للتنفس؟|الأكسجين|النيتروجين|الهيليوم|ثاني أكسيد الكربون
أيهما أسرع؟|الضوء|الصوت|الرياح|الطائرة
ما أقرب نجم إلى الأرض؟|الشمس|سهيل|الشعرى اليمانية|نجم القطب
ما أصغر وحدة بنائية في الكائن الحي؟|الخلية|الذرة|النسيج|العضو
عند كم درجة مئوية يتجمد الماء؟|0|10|-10|4
ما اسم القوة التي تشدنا نحو الأرض؟|الجاذبية|الاحتكاك|المغناطيسية|الطفو
بماذا تتنفس الأسماك؟|الخياشيم|الرئتين|الجلد|الزعانف
ما اسم العملية التي تصنع بها النباتات غذاءها؟|البناء الضوئي|التنفس|التبخر|الهضم
ما الذي يقيسه الترمومتر؟|درجة الحرارة|الضغط|الرطوبة|السرعة
كم رجلًا للحشرة؟|6|4|8|10
كم رجلًا للعنكبوت؟|8|6|10|4
ما أكبر كوكب في المجموعة الشمسية؟|المشتري|زحل|الأرض|نبتون
ما أقرب كوكب إلى الشمس؟|عطارد|الزهرة|المريخ|الأرض
ما الكوكب الملقب بالكوكب الأحمر؟|المريخ|الزهرة|المشتري|عطارد
ما الكوكب المشهور بحلقاته الواضحة؟|زحل|المشتري|عطارد|المريخ
كم عدد كواكب المجموعة الشمسية؟|8|7|9|10
كم تحتاج الأرض لتدور حول نفسها دورة كاملة تقريبًا؟|24 ساعة|12 ساعة|7 أيام|365 يومًا
كم تحتاج الأرض لتدور حول الشمس دورة كاملة تقريبًا؟|365 يومًا|30 يومًا|24 ساعة|100 يوم
عند كم درجة مئوية يغلي الماء عند سطح البحر؟|100|90|80|120
ما أصلب مادة طبيعية معروفة؟|الألماس|الحديد|الزجاج|الذهب
ما أكبر عضو في جسم الإنسان؟|الجلد|الكبد|الرئة|القلب
كم عدد حجرات قلب الإنسان؟|4|2|3|6
ما العضو الذي يضخ الدم في الجسم؟|القلب|الكبد|الرئة|الكلية
ما العضو الذي يتحكم في كل أجهزة الجسم؟|الدماغ|القلب|الكبد|المعدة
أي عنصر مهم لقوة العظام والأسنان؟|الكالسيوم|الحديد|الصوديوم|اليود
ما أسرع حيوان بري؟|الفهد|الأسد|الحصان|الغزال
ما أكبر حيوان على وجه الأرض؟|الحوت الأزرق|الفيل الأفريقي|قرش الحوت|الزرافة
ما أطول حيوان في العالم؟|الزرافة|الفيل|الجمل|النعامة
إلى أي مجموعة ينتمي الحوت؟|الثدييات|الأسماك|الزواحف|البرمائيات
ما الحيوان الذي يغير لونه ليتخفى؟|الحرباء|الضب|السلحفاة|الأرنب
أي حيوان ينام معلقًا ورأسه إلى الأسفل؟|الخفاش|البومة|القرد|السنجاب
ما أكبر طائر في العالم؟|النعامة|البطريق|النسر|الطاووس
ما الجزء الذي يمتص به النبات الماء من التربة؟|الجذر|الورقة|الزهرة|الساق
ما الحشرة التي تمر بطور الشرنقة ثم تطير بأجنحة ملونة؟|الفراشة|النملة|الذبابة|الجرادة
ما الجهاز الذي نرى به الأجسام الدقيقة جدًا؟|المجهر|التلسكوب|الباروميتر|الأميتر
ماذا يسمى تحول الماء من سائل إلى بخار؟|التبخر|التكثف|التجمد|الانصهار
ما مصدر الطاقة الرئيسي على الأرض؟|الشمس|القمر|البراكين|الرياح
أي هذه المعادن يجذبه المغناطيس؟|الحديد|الألمنيوم|النحاس|الذهب
أي هذه المواد موصل جيد للكهرباء؟|النحاس|الخشب|البلاستيك|الزجاج
ما الحيوان الذي يحمل صغيره في جيب؟|الكنغر|القرد|السنجاب|الأرنب
ما اسم بيت النحل؟|الخلية|الوكر|العرين|الجحر
ماذا يسمى صغير الأسد؟|شبل|جرو|مهر|حوار
ماذا يسمى صغير الناقة؟|حوار|مهر|شبل|خروف
ماذا يسمى صغير الحصان؟|مهر|عجل|جدي|حوار
ما اسم صوت الأسد؟|الزئير|الصهيل|العواء|النهيق
ما اسم صوت الحصان؟|الصهيل|الزئير|الثغاء|الخوار
ما الطائر الذي لا يطير ويعيش في القارة القطبية الجنوبية؟|البطريق|النعامة|الكيوي|الإيمو
ما الحاسة المرتبطة بالأنف؟|الشم|التذوق|السمع|اللمس
ما اللون الناتج من خلط الأزرق والأصفر؟|الأخضر|البرتقالي|البنفسجي|البني
ما اللون الناتج من خلط الأحمر والأصفر؟|البرتقالي|الأخضر|الوردي|البنفسجي
ما اللون الناتج من خلط الأحمر والأزرق؟|البنفسجي|الأخضر|البرتقالي|الرمادي
ما أسرع شيء في الكون؟|الضوء|الصوت|الصاروخ|البرق
ما المادة الأساسية في صناعة الزجاج؟|الرمل|الملح|الطين|الحديد
كم جناحًا للنحلة؟|4|2|6|8
ما الطبقة التي تحمي الأرض من الأشعة فوق البنفسجية؟|طبقة الأوزون|القشرة الأرضية|الوشاح|اللب
من أي شجرة يأتي التمر؟|النخلة|الزيتون|التين|السدر
ما الغاز الذي نخرجه مع الزفير بكمية أكبر مما نستنشق؟|ثاني أكسيد الكربون|الأكسجين|الهيليوم|الهيدروجين
ما الحيوان الذي يعيش في جحر بالصحراء ويشتهر في الجزيرة العربية؟|الضب|الكنغر|الباندا|الكوالا
ما التابع الطبيعي الوحيد للأرض؟|القمر|المريخ|الشمس|فوبوس
ما الكوكب الذي نعيش عليه؟|الأرض|المريخ|الزهرة|عطارد
أي حاسة يعتمد عليها الخفاش للتنقل في الظلام؟|السمع|البصر|الشم|اللمس
ما الحالة التي يكون عليها الماء إذا تجمد؟|صلبة|سائلة|غازية|بلازما
#2
كم عظمة في جسم الإنسان البالغ؟|206|186|216|306
بأي وحدة تقاس القوة؟|النيوتن|الجول|الواط|الباسكال
بأي وحدة يقاس الجهد الكهربائي؟|الفولت|الأمبير|الأوم|الواط
ما رمز عنصر الحديد؟|Fe|Ir|Fi|Pb
ما رمز عنصر الذهب؟|Au|Ag|Go|Gd
ما رمز عنصر الأكسجين؟|O|Ox|Og|Os
كم كروموسومًا في خلية الإنسان الجسمية عادة؟|46|23|44|48
أي عضو ينقي الدم من الفضلات ويكوّن البول؟|الكلية|القلب|الرئة|المعدة
أين يُمتص أغلب الغذاء في الجسم؟|الأمعاء الدقيقة|المعدة|المريء|الكبد
ما أشد كواكب المجموعة الشمسية حرارة؟|الزهرة|عطارد|المريخ|المشتري
كم سرعة الضوء في الفراغ تقريبًا؟|300 ألف كم في الثانية|30 ألف كم في الثانية|3 آلاف كم في الثانية|3 ملايين كم في الثانية
ما الغاز الأكثر وجودًا في الغلاف الجوي للأرض؟|النيتروجين|الأكسجين|ثاني أكسيد الكربون|الأرجون
ما الغاز الذي تأخذه النباتات من الهواء لتصنع غذاءها؟|ثاني أكسيد الكربون|الأكسجين|النيتروجين|الهيليوم
ما الغاز الذي يجعل البالونات ترتفع في الهواء؟|الهيليوم|الأكسجين|النيتروجين|ثاني أكسيد الكربون
ما أخف عنصر في الجدول الدوري؟|الهيدروجين|الهيليوم|الليثيوم|الأكسجين
ما الفلز الذي يكون سائلًا في درجة حرارة الغرفة؟|الزئبق|الحديد|النحاس|الألمنيوم
ما الصيغة الكيميائية لملح الطعام؟|NaCl|KCl|NaOH|CaCO₃
ما الصيغة الكيميائية لثاني أكسيد الكربون؟|CO₂|CO|O₂|C₂O
ما أكبر عضو داخلي في جسم الإنسان؟|الكبد|القلب|المعدة|الدماغ
ما أطول عظمة في جسم الإنسان؟|عظمة الفخذ|عظمة الساق|عظمة العضد|عظمة الترقوة
كم عدد أسنان الإنسان البالغ عادة؟|32|28|30|36
أي فيتامين يصنعه الجسم عند التعرض لأشعة الشمس؟|فيتامين د|فيتامين أ|فيتامين ج|فيتامين ب
نقص أي عنصر يسبب فقر الدم غالبًا؟|الحديد|الكالسيوم|الصوديوم|البوتاسيوم
ما الخلايا التي تنقل الأكسجين في الدم؟|كريات الدم الحمراء|كريات الدم البيضاء|الصفائح الدموية|البلازما
ما وظيفة كريات الدم البيضاء؟|الدفاع عن الجسم|نقل الأكسجين|تجلط الدم|هضم الطعام
أين يبدأ هضم النشويات في الجسم؟|الفم|المعدة|الأمعاء الغليظة|الكبد
ما العضو الذي يفرز هرمون الإنسولين؟|البنكرياس|الكبد|الكلية|المعدة
كم قلبًا للأخطبوط؟|3|1|2|4
ما اسم الصبغة الخضراء في أوراق النبات؟|الكلوروفيل|الهيموجلوبين|الميلانين|الكيراتين
ماذا تسمى صغار الضفادع؟|أبو ذنيبة|اليرقة|الحوصلة|الشرنقة
ما وحدة قياس الطاقة؟|الجول|النيوتن|الواط|الفولت
ما وحدة قياس القدرة الكهربائية؟|الواط|الجول|الأمبير|الأوم
ما وحدة قياس شدة التيار الكهربائي؟|الأمبير|الفولت|الأوم|الواط
ما وحدة قياس المقاومة الكهربائية؟|الأوم|الأمبير|الفولت|الهيرتز
من العالم الذي وضع قوانين الحركة والجاذبية المشهورة؟|نيوتن|أينشتاين|غاليليو|داروين
من صاحب النظرية النسبية؟|أينشتاين|نيوتن|تسلا|أديسون
من اشتهر باختراع المصباح الكهربائي؟|توماس أديسون|غراهام بيل|نيكولا تسلا|الأخوان رايت
من يُنسب إليه اختراع الهاتف؟|غراهام بيل|توماس أديسون|ماركوني|نيكولا تسلا
من العالم المسلم الذي يعد رائد علم البصريات؟|ابن الهيثم|ابن سينا|الخوارزمي|جابر بن حيان
من مؤلف كتاب «القانون في الطب»؟|ابن سينا|الرازي|ابن النفيس|الزهراوي
من اكتشف البنسلين؟|ألكسندر فليمنج|لويس باستور|إسحاق نيوتن|ماري كوري
ما الجهاز الذي يقيس الضغط الجوي؟|الباروميتر|الترمومتر|الهيجرومتر|الأميتر
على أي مقياس تقاس قوة الزلازل عادة؟|ريختر|بوفورت|سلسيوس|كلفن
ماذا يسمى تحول بخار الماء إلى قطرات سائلة؟|التكثف|التبخر|التسامي|الانصهار
ما اسم المجرة التي تقع فيها الأرض؟|درب التبانة|أندروميدا|الدب الأكبر|الثريا
ما الرقم الهيدروجيني للماء النقي؟|7|0|5|14
ما السبب الرئيسي لحدوث المد والجزر؟|جاذبية القمر|الرياح|الزلازل|حرارة الشمس
كم يحتاج ضوء الشمس تقريبًا ليصل إلى الأرض؟|8 دقائق|8 ثوانٍ|ساعة|يوم كامل
ما أبعد كوكب عن الشمس في المجموعة الشمسية؟|نبتون|أورانوس|زحل|المشتري
ما أصغر كوكب في المجموعة الشمسية؟|عطارد|المريخ|الزهرة|نبتون
ما اسم أول قمر صناعي أُطلق إلى الفضاء؟|سبوتنيك|أبولو|هابل|فوياجر
من أول إنسان مشى على سطح القمر؟|نيل آرمسترونغ|يوري غاغارين|باز ألدرين|مايكل كولينز
من أول إنسان سافر إلى الفضاء؟|يوري غاغارين|نيل آرمسترونغ|باز ألدرين|جون غلين
ما الجزء الملوّن من العين؟|القزحية|الشبكية|القرنية|العدسة
كم لترًا من الدم تقريبًا في جسم الإنسان البالغ؟|5|2|10|15
ما أسرع طائر عند الانقضاض؟|الشاهين|النسر|البومة|الحبارى
ماذا يسمى الحيوان الذي يعيش في الماء وعلى اليابسة مثل الضفدع؟|برمائي|زاحف|ثديي|قشري
أي هذه الحيوانات من الزواحف؟|التمساح|الضفدع|الدلفين|القرش
أي هذه الحيوانات من الثدييات؟|الدلفين|القرش|السلمون|التونة
ما أكبر سمكة في العالم؟|قرش الحوت|الحوت الأزرق|القرش الأبيض|سمك التونة
بأي وحدة تقاس شدة الصوت؟|الديسيبل|الهيرتز|الكلفن|اللومن
ما الذي يحدد جنس المولود عند الإنسان؟|كروموسومات الأب|كروموسومات الأم|فصيلة الدم|طول الأب
ما العضو الذي يخزن الصفراء؟|المرارة|الكبد|البنكرياس|الطحال
كم عدد الأسنان اللبنية عند الطفل؟|20|32|24|16
ما اسم أكبر شريان في جسم الإنسان؟|الأبهر|الوريد الأجوف|الشريان الرئوي|الشريان السباتي
ما الغاز الذي يتكون منه أغلب الشمس؟|الهيدروجين|الأكسجين|النيتروجين|الكربون
ما الكوكب الذي يدور حول نفسه بالعكس مقارنة بأغلب الكواكب؟|الزهرة|المريخ|المشتري|عطارد
ما الحيوان الذي له أكبر عين بين الحيوانات البرية؟|النعامة|الفيل|الزرافة|الأسد
ما اسم العملية التي تتحول فيها اليرقة إلى فراشة؟|التحول|التكاثر|الهجرة|البيات
ماذا يسمى نوم بعض الحيوانات طوال الشتاء؟|البيات الشتوي|السبات الصيفي|الهجرة|الانسلاخ
ما الحيوان الذي يُعد أطول الحيوانات عمرًا بين الزواحف المعروفة؟|السلحفاة|التمساح|الأفعى|الضب
ما اسم أقرب مجرة كبيرة لمجرتنا؟|أندروميدا|الدوامة|المثلث|السومبريرو
كم قمرًا يدور حول المريخ؟|2|1|0|4
ما أكبر قمر في المجموعة الشمسية؟|غانيميد|تيتان|قمر الأرض|يوروبا
ما المادة التي تعطي الجلد لونه؟|الميلانين|الكلوروفيل|الهيموجلوبين|الكيراتين
ما البروتين الذي يحمل الأكسجين في الدم؟|الهيموجلوبين|الإنسولين|الكيراتين|الكولاجين
ما الطاقة التي تنتجها الألواح الشمسية؟|الكهرباء|الصوت|المغناطيسية|الرياح
ما الحيوان الذي يُعد أسرع الحيوانات البحرية؟|سمك أبو شراع|الدلفين|القرش الأبيض|الحوت الأزرق
#3
ما رمز عنصر الصوديوم؟|Na|So|Sd|S
ما رمز عنصر الفضة؟|Ag|Si|Fe|Au
ما رمز عنصر البوتاسيوم؟|K|P|Po|Pt
ما رمز عنصر الرصاص؟|Pb|Ru|Re|Pl
ما رمز عنصر النحاس؟|Cu|Co|Cr|Ca
ما العدد الذري للهيدروجين؟|1|2|0|8
ما العدد الذري للكربون؟|6|12|4|8
ما أصغر عظمة في جسم الإنسان؟|عظمة الركاب في الأذن|عظمة الإصبع|عظمة الأنف|عظمة الترقوة
ما فصيلة الدم التي تسمى المعطي العام؟|O سالب|AB موجب|A موجب|B سالب
ما فصيلة الدم التي تسمى المستقبل العام؟|AB موجب|O سالب|A سالب|B موجب
ما الحمض الموجود في المعدة ويساعد على الهضم؟|حمض الهيدروكلوريك|حمض الكبريتيك|حمض الليمون|حمض الخل
ما وحدة قياس التردد؟|الهيرتز|الديسيبل|الواط|الجول
من اكتشف الدورة الدموية الصغرى؟|ابن النفيس|ابن سينا|الرازي|ابن الهيثم
من العالم المسلم الذي يُنسب إليه علم الجبر؟|الخوارزمي|ابن الهيثم|البيروني|الرازي
ما الجهاز الذي يرصد الزلازل؟|السيزموغراف|الباروميتر|الأنيمومتر|الجلفانومتر
ما الجهاز الذي يقيس سرعة الرياح؟|الأنيمومتر|الباروميتر|الترمومتر|السيزموغراف
ما الجهاز الذي يقيس الرطوبة في الهواء؟|الهيجرومتر|الباروميتر|الأنيمومتر|الألتيميتر
ماذا يسمى تحول المادة من الحالة الصلبة إلى الغازية مباشرة؟|التسامي|التبخر|الانصهار|التكثف
عند كم درجة مئوية تكون كثافة الماء أعلى ما يمكن؟|4|0|100|-4
ما الصفر المطلق بالدرجات المئوية تقريبًا؟|-273|-100|-460|0
كم تبلغ سرعة الصوت في الهواء تقريبًا؟|343 مترًا في الثانية|30 مترًا في الثانية|3000 متر في الثانية|300 ألف كم في الثانية
ما الجسيم الذي يحمل شحنة سالبة في الذرة؟|الإلكترون|البروتون|النيوترون|النواة
ما الجسيم الذي لا يحمل شحنة في نواة الذرة؟|النيوترون|البروتون|الإلكترون|الفوتون
ما أكثر عنصر وجودًا في القشرة الأرضية؟|الأكسجين|الحديد|السيليكون|الألمنيوم
ما أكثر فلز وجودًا في القشرة الأرضية؟|الألمنيوم|الحديد|النحاس|الذهب
ما الحيوان الوحيد من الثدييات الذي يطير طيرانًا حقيقيًا؟|الخفاش|السنجاب الطائر|البطريق|النعامة
كم عدد فقرات العنق في الزرافة؟|7|14|20|3
ما الغدة التي تُسمى «سيدة الغدد»؟|الغدة النخامية|الغدة الدرقية|البنكرياس|الغدة الكظرية
ما اسم الخلايا العصبية؟|العصبونات|الكريات|الصفائح|الألياف
ما العالِم الذي وضع الجدول الدوري للعناصر بصورته المشهورة؟|مندلييف|نيوتن|دالتون|رذرفورد
من العالمة التي فازت بجائزة نوبل في الفيزياء والكيمياء؟|ماري كوري|روزاليند فرانكلين|ليز مايتنر|إيرين كوري
من الطبيب المسلم الذي يُعد رائد الجراحة وصاحب كتاب «التصريف»؟|الزهراوي|ابن سينا|ابن رشد|الرازي
ما المادة التي تحفظ المعلومات الوراثية في الخلية؟|DNA|الكيراتين|الكولاجين|الجلوكوز
أين توجد المادة الوراثية في الخلية عادة؟|النواة|الغشاء|الفجوة|السيتوبلازم فقط
ما العضية التي تنتج الطاقة في الخلية؟|الميتوكوندريا|النواة|الريبوسوم|جهاز جولجي
ما الكوكب الذي يملك أكبر بركان معروف في المجموعة الشمسية؟|المريخ|الزهرة|الأرض|عطارد
كم يحتاج ضوء القمر المنعكس ليصل إلى الأرض تقريبًا؟|أقل من ثانيتين|8 دقائق|ساعة|يوم
ما الكوكب الذي يدور على جنبه تقريبًا؟|أورانوس|نبتون|زحل|المريخ
ما المعدن الذي يُستخدم في أسلاك الكهرباء المنزلية غالبًا؟|النحاس|الحديد|الذهب|الرصاص
ما الفيتامين الذي يساعد على تجلط الدم؟|فيتامين ك|فيتامين ج|فيتامين أ|فيتامين د
نقص أي فيتامين يسبب مرض الإسقربوط؟|فيتامين ج|فيتامين د|فيتامين أ|فيتامين ب12
ما العنصر الذي يضاف لملح الطعام لحماية الغدة الدرقية؟|اليود|الحديد|الفلور|الكالسيوم
كم تبلغ درجة حرارة جسم الإنسان الطبيعية تقريبًا؟|37 درجة مئوية|33 درجة مئوية|40 درجة مئوية|35 درجة مئوية
ما اسم الطبقة الخارجية الصلبة من الأرض؟|القشرة الأرضية|الوشاح|اللب الخارجي|اللب الداخلي
ما الغاز المسؤول بشكل رئيسي عن الاحتباس الحراري؟|ثاني أكسيد الكربون|الأكسجين|النيتروجين|الهيليوم
ما وحدة قياس الضغط؟|الباسكال|النيوتن|الجول|الواط
#1
ما الحيوان الذي يُعرف بأنه أكبر حيوان بري؟|الفيل الأفريقي|الزرافة|وحيد القرن|فرس النهر
ما الطائر الذي يستطيع الطيران إلى الخلف؟|الطائر الطنان|النسر|الحمامة|الصقر
من أي جزء من النبات تتكون الثمرة غالبًا؟|الزهرة|الجذر|الساق|الورقة
ما الحاسة التي نستخدم فيها اللسان؟|التذوق|الشم|السمع|البصر
ما العضو الذي نتنفس به؟|الرئتان|المعدة|الكبد|الكلى
كم عدد الحواس الخمس؟|5|4|6|7
#2
ما الكوكب الذي له أكبر عدد من الأقمار المعروفة تقريبًا؟|زحل|الأرض|المريخ|عطارد
ما اسم الغلاف الغازي المحيط بالأرض؟|الغلاف الجوي|الغلاف المائي|الغلاف الصخري|الغلاف الحيوي
ما اسم الصخور المنصهرة تحت سطح الأرض؟|الصهارة|البازلت|الجرانيت|الرخام
ماذا تسمى الصهارة عندما تخرج من البركان؟|الحمم|الرماد|الصخر الرسوبي|الكوارتز
ما نوع الطاقة المخزنة في البطارية؟|كيميائية|نووية|صوتية|حرارية
ما الذي يسبب ظهور قوس قزح؟|انكسار ضوء الشمس في قطرات الماء|انعكاس القمر|الرياح|السحب السوداء
ما العضو المسؤول عن السمع والتوازن معًا؟|الأذن|العين|الأنف|اللسان
ما المادة الصلبة التي تكوّن الأسنان من الخارج؟|المينا|العاج|اللب|الكالسيت
كم عدد عضلات جسم الإنسان تقريبًا؟|أكثر من 600|حوالي 100|حوالي 50|أكثر من 5000
ما اسم أكبر عضلة في جسم الإنسان؟|العضلة الألوية الكبرى|عضلة القلب|العضلة ذات الرأسين|عضلة اللسان
ما الحيوان الذي يُربّى لإنتاج الحرير؟|دودة القز|النحلة|النملة|الفراشة الملكية
ما الغاز الذي يُستخدم في إطفاء الحرائق ضمن بعض الطفايات؟|ثاني أكسيد الكربون|الأكسجين|الهيدروجين|الهيليوم
ما اسم الحيوانات التي تتغذى على النباتات فقط؟|العواشب|اللواحم|القوارت|المفترسات
#3
ما وحدة قياس كمية المادة في الكيمياء؟|المول|الجرام|اللتر|الكلفن
ما الكوكب الذي يملك أطول يوم في المجموعة الشمسية؟|الزهرة|المشتري|المريخ|نبتون
ما اسم أشهر تلسكوب فضائي أُطلق عام 1990؟|هابل|جيمس ويب|كبلر|سبيتزر
ما اسم التلسكوب الفضائي الذي أُطلق عام 2021 خلفًا لهابل؟|جيمس ويب|كبلر|هيرشل|تشاندرا
ما الرمز الكيميائي للزئبق؟|Hg|Me|Mr|Zn
ما الرمز الكيميائي للكالسيوم؟|Ca|C|Cl|Co
ما العنصر الذي رمزه He؟|الهيليوم|الهيدروجين|الحديد|الهافنيوم
ما أكثر غاز نبيل وجودًا في الهواء؟|الأرجون|النيون|الهيليوم|الكريبتون
`);
QB.geo=qbParse(`
#1
ما أكبر قارة في العالم مساحة؟|آسيا|أفريقيا|أوروبا|أمريكا الشمالية
ما أكبر دولة في العالم مساحة؟|روسيا|كندا|الصين|أمريكا
ما أكبر محيط في العالم؟|المحيط الهادئ|المحيط الأطلسي|المحيط الهندي|المحيط المتجمد الشمالي
في أي قارة تقع مصر؟|أفريقيا|آسيا|أوروبا|أستراليا
ما البحر الذي يفصل السعودية عن مصر؟|البحر الأحمر|البحر المتوسط|بحر العرب|البحر الأسود
ما أصغر دولة في العالم؟|الفاتيكان|موناكو|مالطا|البحرين
في أي دولة يقع تاج محل؟|الهند|باكستان|إيران|بنغلاديش
أي دولة يشبه شكلها الحذاء؟|إيطاليا|اليونان|إسبانيا|تشيلي
أي دولة تسمى بلاد الشمس المشرقة؟|اليابان|الصين|كوريا الجنوبية|تايلاند
كم عدد دول مجلس التعاون الخليجي؟|6|5|7|8
في أي قارة تقع الأرجنتين؟|أمريكا الجنوبية|أفريقيا|أوروبا|أمريكا الشمالية
ما أعلى قمة جبلية في العالم؟|إيفرست|كي 2|كليمنجارو|مون بلان
ما أكبر صحراء حارة في العالم؟|الصحراء الكبرى|صحراء غوبي|صحراء كالاهاري|صحراء أتاكاما
أي نهر يمر في مدينة القاهرة؟|النيل|الفرات|دجلة|الأردن
كم عدد قارات العالم؟|7|5|6|8
في أي دولة يقع برج إيفل؟|فرنسا|إيطاليا|بريطانيا|إسبانيا
في أي دولة تقع أهرامات الجيزة؟|مصر|السودان|العراق|المكسيك
في أي دولة يقع برج خليفة؟|الإمارات|قطر|السعودية|الكويت
في أي دولة يقع سور الصين العظيم؟|الصين|اليابان|منغوليا|كوريا الجنوبية
ما المدينة السعودية الملقبة بعروس البحر الأحمر؟|جدة|ينبع|جازان|الوجه
ما أكبر دول الخليج العربي مساحة؟|السعودية|عمان|الإمارات|الكويت
على أي بحر تقع مدينة جدة؟|البحر الأحمر|الخليج العربي|البحر المتوسط|بحر العرب
على أي خليج تطل مدينة الدمام؟|الخليج العربي|خليج عدن|خليج عمان|خليج العقبة
أي دولة تلقب ببلاد الأرز؟|لبنان|سوريا|الأردن|تركيا
أي دولة تلقب بأرض الكنانة؟|مصر|العراق|اليمن|سوريا
أي دولة تلقب ببلاد الرافدين؟|العراق|سوريا|مصر|الأردن
أي دولة تلقب ببلد المليون شهيد؟|الجزائر|ليبيا|المغرب|تونس
ما عاصمة المملكة العربية السعودية؟|الرياض|جدة|مكة المكرمة|الدمام
في أي قارة تقع البرازيل؟|أمريكا الجنوبية|أفريقيا|أوروبا|أمريكا الشمالية
في أي قارة تقع كينيا؟|أفريقيا|آسيا|أمريكا الجنوبية|أوقيانوسيا
ما أكبر دولة عربية مساحة؟|الجزائر|السعودية|السودان|ليبيا
ما الخط الوهمي الذي يقسم الأرض إلى نصف شمالي ونصف جنوبي؟|خط الاستواء|خط غرينتش|مدار السرطان|الدائرة القطبية
ما القارة المتجمدة عند القطب الجنوبي؟|أنتاركتيكا|أوقيانوسيا|غرينلاند|سيبيريا
في أي دولة تقع مدينة البتراء الأثرية؟|الأردن|مصر|سوريا|لبنان
ما المدينة السعودية الملقبة بمدينة الورد؟|الطائف|أبها|الباحة|تبوك
أي دولة تظهر ورقة القيقب على علمها؟|كندا|أمريكا|السويد|النرويج
في أي مدينة تقع ساعة بيغ بن؟|لندن|باريس|برلين|روما
في أي دولة يقع تمثال الحرية؟|أمريكا|فرنسا|كندا|بريطانيا
في أي دولة تقع مدينة إسطنبول؟|تركيا|اليونان|إيران|روسيا
ما أكبر قارة في عدد السكان؟|آسيا|أفريقيا|أوروبا|أمريكا الشمالية
في أي قارة تقع أستراليا؟|أوقيانوسيا|آسيا|أفريقيا|أمريكا الجنوبية
في أي منطقة سعودية تقع مدينة أبها؟|عسير|جازان|نجران|الباحة
في أي منطقة سعودية تقع مدينة الدمام؟|الشرقية|الرياض|القصيم|حائل
ما الدولة التي تقع شمال السعودية مباشرة ومن مدنها عمّان؟|الأردن|العراق|سوريا|لبنان
#2
ما أعمق محيط في العالم؟|المحيط الهادئ|المحيط الأطلسي|المحيط الهندي|المحيط المتجمد الشمالي
ما أكبر جزيرة في العالم؟|غرينلاند|مدغشقر|بورنيو|آيسلندا
ما أكبر بحيرة في العالم مساحة؟|بحر قزوين|البحر الميت|بحيرة فكتوريا|بحيرة سوبيريور
أي مضيق يفصل أوروبا عن أفريقيا؟|مضيق جبل طارق|مضيق هرمز|مضيق باب المندب|مضيق البوسفور
ما أعلى جبل في أفريقيا؟|كليمنجارو|إيفرست|توبقال|جبل كينيا
أي نهر يمر في بغداد؟|دجلة|الفرات|النيل|العاصي
في أي دولة تقع جزيرة بالي؟|إندونيسيا|ماليزيا|الفلبين|تايلاند
ما أطول سلسلة جبال على اليابسة؟|الأنديز|الهيمالايا|الألب|روكي
ما أكبر صحراء رملية متصلة في العالم؟|الربع الخالي|صحراء النفود|صحراء سيناء|صحراء ثار
ما أطول نهر في العالم؟|النيل|المسيسيبي|اليانغتسي|الفولغا
ما أكبر نهر في العالم من حيث كمية المياه؟|الأمازون|النيل|الكونغو|الفرات
في أي سلسلة جبلية تقع قمة إيفرست؟|الهيمالايا|الألب|الأنديز|الروكي
ما أصغر محيط في العالم؟|المحيط المتجمد الشمالي|المحيط الهندي|المحيط الأطلسي|المحيط الهادئ
في أي دولة يقع معظم الربع الخالي؟|السعودية|عمان|اليمن|الإمارات
أي نهر يمر في مدينة لندن؟|التايمز|السين|الراين|الدانوب
أي نهر يمر في مدينة باريس؟|السين|التايمز|الراين|اللوار
ما أكثر دولة في العالم سكانًا؟|الهند|أمريكا|إندونيسيا|البرازيل
ما أكثر دولة عربية سكانًا؟|مصر|السعودية|الجزائر|العراق
ما أكبر دولة في أمريكا الجنوبية مساحة؟|البرازيل|الأرجنتين|بيرو|كولومبيا
ما أكثر دولة إسلامية سكانًا؟|إندونيسيا|مصر|تركيا|إيران
ما المضيق الذي يربط البحر الأحمر بخليج عدن؟|باب المندب|هرمز|جبل طارق|البوسفور
ما المضيق الذي يربط الخليج العربي بخليج عمان؟|هرمز|باب المندب|جبل طارق|ملقا
أي قناة تربط البحر الأحمر بالبحر المتوسط؟|قناة السويس|قناة بنما|قناة كييل|قناة كورنث
أي قناة تربط المحيط الأطلسي بالمحيط الهادئ؟|قناة بنما|قناة السويس|قناة كييل|قناة كورنث
ما أخفض نقطة على سطح اليابسة؟|شاطئ البحر الميت|بحر قزوين|وادي الموت|منخفض القطارة
أي هذه البحار هو الأشد ملوحة؟|البحر الميت|البحر الأحمر|البحر المتوسط|بحر العرب
في أي دولة تقع مدينة ماتشو بيتشو الأثرية؟|بيرو|المكسيك|تشيلي|البرازيل
في أي دولة يقع تمثال المسيح الفادي الشهير؟|البرازيل|الأرجنتين|المكسيك|البرتغال
في أي دولة يقع مدرج الكولوسيوم؟|إيطاليا|اليونان|إسبانيا|تركيا
في أي منطقة سعودية تقع محافظة العلا؟|المدينة المنورة|تبوك|حائل|الجوف
في أي محافظة سعودية يقع موقع الحِجر (مدائن صالح)؟|العلا|تبوك|نجران|الأحساء
ما أكبر واحة نخيل في العالم وتقع في السعودية؟|الأحساء|القطيف|العلا|الخرج
في أي منطقة سعودية يقع مشروع نيوم؟|تبوك|جازان|الرياض|الشرقية
كم عدد المناطق الإدارية في السعودية؟|13|10|12|15
ما اسم الجسر الذي يربط السعودية بالبحرين؟|جسر الملك فهد|جسر الملك سلمان|جسر الملك عبدالله|جسر الخليج
على أي بحر تطل مدينة ينبع؟|البحر الأحمر|الخليج العربي|بحر العرب|البحر المتوسط
ما المدينة السعودية في جبال السروات التي تشتهر بالضباب والمطر؟|أبها|الدمام|حائل|بريدة
أي دولة تلقب بتونس الخضراء؟|تونس|المغرب|لبنان|الجزائر
ما عاصمة أستراليا؟|كانبرا|سيدني|ملبورن|بيرث
ما عاصمة كندا؟|أوتاوا|تورونتو|مونتريال|فانكوفر
ما عاصمة تركيا؟|أنقرة|إسطنبول|إزمير|بورصة
ما عاصمة البرازيل؟|برازيليا|ريو دي جانيرو|ساو باولو|سلفادور
ما خط الطول الرئيسي الذي يمر بلندن؟|غرينتش|الاستواء|مدار الجدي|خط التاريخ الدولي
أي مدار يمر عبر أراضي السعودية؟|مدار السرطان|مدار الجدي|خط الاستواء|الدائرة القطبية الشمالية
أي بركان دمر مدينة بومبي الرومانية؟|فيزوف|إتنا|فوجي|كراكاتوا
ما أعلى جبل في اليابان؟|فوجي|إيفرست|كليمنجارو|مون بلان
ما أكبر غابة مطيرة في العالم؟|الأمازون|غابات الكونغو|غابات بورنيو|الغابة السوداء
أي محيط يقع بين أفريقيا وأستراليا؟|المحيط الهندي|المحيط الأطلسي|المحيط الهادئ|المحيط المتجمد الشمالي
في أي قارة تقع جبال الأنديز؟|أمريكا الجنوبية|آسيا|أوروبا|أمريكا الشمالية
في أي قارة تقع جبال الألب؟|أوروبا|آسيا|أفريقيا|أمريكا الجنوبية
أي دولة صغيرة تقع داخل مدينة روما؟|الفاتيكان|موناكو|مالطا|أندورا
ما أكبر جزيرة في قارة أفريقيا؟|مدغشقر|زنجبار|موريشيوس|سقطرى
أي نهرين يكونان شط العرب عند التقائهما؟|دجلة والفرات|النيل والأمازون|الأردن والليطاني|العاصي والفرات
أي دولة يقع فيها جبل كليمنجارو؟|تنزانيا|كينيا|إثيوبيا|أوغندا
ما أطول نهر في قارة أفريقيا؟|النيل|الكونغو|النيجر|الزمبيزي
ما أطول نهر في قارة آسيا؟|اليانغتسي|الغانج|الميكونغ|الفرات
ما أطول نهر في قارة أوروبا؟|الفولغا|الدانوب|الراين|السين
ما أعلى شلال في العالم؟|شلال أنجل|شلالات نياغرا|شلالات فيكتوريا|شلالات إجوازو
ما أصغر قارة في العالم؟|أستراليا|أوروبا|أنتاركتيكا|أمريكا الجنوبية
في أي دولة تقع مدينة مراكش؟|المغرب|الجزائر|تونس|موريتانيا
في أي دولة تقع مدينة الإسكندرية؟|مصر|ليبيا|تونس|السودان
في أي دولة تقع مدينة صلالة؟|عمان|اليمن|الإمارات|السعودية
في أي دولة تقع مدينة البصرة؟|العراق|الكويت|إيران|سوريا
في أي دولة تقع مدينة حلب؟|سوريا|العراق|لبنان|تركيا
ما البحر الذي تطل عليه مدينة بيروت؟|البحر المتوسط|البحر الأحمر|البحر الأسود|بحر العرب
ما الدولة العربية التي تتكون من مجموعة جزر في الخليج العربي؟|البحرين|قطر|الكويت|الإمارات
ما الدولة العربية التي تتكون من جزر في المحيط الهندي؟|جزر القمر|البحرين|جيبوتي|الصومال
في أي منطقة سعودية تقع جزر فرسان؟|جازان|عسير|مكة المكرمة|تبوك
ما أعلى قمة في السعودية؟|جبل السودة|جبل أحد|جبل طويق|جبل اللوز
ما اسم الصحراء الكبيرة في شمال السعودية؟|النفود الكبير|الربع الخالي|الدهناء|صحراء سيناء
ما سلسلة الجبال الممتدة بشكل قوس عبر نجد ويقع عليها جزء من الرياض؟|جبال طويق|جبال السروات|جبال الحجاز|جبال أجا
ما الدولة الأوروبية المشهورة بطواحين الهواء والزهور (التوليب)؟|هولندا|بلجيكا|الدنمارك|سويسرا
#3
بين أي دولتين تقع شلالات فيكتوريا؟|زامبيا وزيمبابوي|كينيا وتنزانيا|مصر والسودان|البرازيل والأرجنتين
بين أي دولتين تقع شلالات نياغرا؟|كندا وأمريكا|البرازيل والأرجنتين|زامبيا وزيمبابوي|فرنسا وسويسرا
ما أكبر جزيرة في البحر الأبيض المتوسط؟|صقلية|قبرص|كريت|سردينيا
ما أطول وادٍ في الجزيرة العربية؟|وادي الرمة|وادي حنيفة|وادي فاطمة|وادي نجران
كم دولة تطل على الخليج العربي؟|8|6|7|9
أي دولة تلقب ببلاد الألف بحيرة؟|فنلندا|السويد|النرويج|كندا
أي دولة كانت تلقب قديمًا بالعربية السعيدة؟|اليمن|عمان|الحبشة|مصر
أي دولة لها أطول خط ساحلي في العالم؟|كندا|روسيا|أستراليا|إندونيسيا
ما أكبر بحيرة في قارة أفريقيا؟|بحيرة فكتوريا|بحيرة تنجانيقا|بحيرة ملاوي|بحيرة تشاد
أي دولة تحيط بها جنوب أفريقيا من كل الجهات؟|ليسوتو|بوتسوانا|ناميبيا|زيمبابوي
أي دولة عربية يمر بها خط الاستواء؟|الصومال|السودان|اليمن|موريتانيا
بين أي دولتين يقع مضيق باب المندب؟|اليمن وجيبوتي|مصر والسعودية|السودان والسعودية|عمان واليمن
إلى أي دولة تتبع جزيرة سقطرى؟|اليمن|عمان|الصومال|الإمارات
ما أعلى قمة في قارة أمريكا الجنوبية؟|أكونكاجوا|إيفرست|كليمنجارو|دينالي
ما أعلى قمة في قارة أوروبا؟|إلبروس|ماترهورن|إتنا|فيزوف
ما أعلى قمة في أمريكا الشمالية؟|دينالي|أكونكاجوا|ويتني|إلبروس
ما المضيق الذي يفصل آسيا عن أمريكا الشمالية؟|مضيق بيرينغ|مضيق ملقا|مضيق جبل طارق|مضيق هرمز
ما المضيق الذي يقسم مدينة إسطنبول بين قارتين؟|البوسفور|الدردنيل|جبل طارق|هرمز
ما أكبر دولة في قارة أفريقيا مساحة؟|الجزائر|الكونغو الديمقراطية|السودان|ليبيا
ما الدولة الأفريقية الأكثر سكانًا؟|نيجيريا|مصر|إثيوبيا|جنوب أفريقيا
ما أكبر جزيرة في قارة آسيا؟|بورنيو|سومطرة|هونشو|سريلانكا
ما الدولة التي تضم أكبر عدد من الجزر في العالم؟|السويد|إندونيسيا|الفلبين|اليابان
ما أعمق بحيرة في العالم؟|بحيرة بايكال|بحيرة تنجانيقا|بحر قزوين|بحيرة فكتوريا
ما الدولة التي تمتد على 11 منطقة زمنية؟|روسيا|كندا|أمريكا|الصين
ما الدولة الحبيسة (لا تطل على بحر) من هذه الدول؟|سويسرا|البرتغال|اليونان|الدنمارك
أي نهر يمر في مدينة دمشق؟|بردى|العاصي|الفرات|الليطاني
ما الدولة الأوروبية التي يمر بها نهر الدانوب وعاصمتها فيينا؟|النمسا|ألمانيا|المجر|سويسرا
أي من هذه الدول لا تطل على البحر المتوسط؟|الأردن|لبنان|سوريا|ليبيا
أي من هذه الدول لا تطل على البحر الأحمر؟|عمان|السودان|إريتريا|اليمن
أي دولة تطل على البحر الأحمر والخليج العربي معًا؟|السعودية|اليمن|عمان|الإمارات
في أي دولة تقع صحراء أتاكاما، من أجف صحاري العالم؟|تشيلي|بيرو|المكسيك|الأرجنتين
في أي دولة تقع مدينة سمرقند التاريخية؟|أوزبكستان|كازاخستان|إيران|أفغانستان
في أي دولة تقع مدينة قرطبة التاريخية الأندلسية؟|إسبانيا|البرتغال|المغرب|إيطاليا
في أي دولة يقع قصر الحمراء؟|إسبانيا|المغرب|تركيا|البرتغال
ما المدينة السعودية التي تقع على أعلى ارتفاع بين المدن الكبرى؟|أبها|الطائف|الرياض|حائل
ما أكبر بحيرة عذبة في العالم مساحة؟|بحيرة سوبيريور|بحيرة فكتوريا|بحيرة بايكال|بحر قزوين
ما اسم المحيط الذي يقع غرب أوروبا وأفريقيا؟|المحيط الأطلسي|المحيط الهندي|المحيط الهادئ|المحيط المتجمد الجنوبي
ما الخليج الذي تطل عليه مدينة العقبة؟|خليج العقبة|خليج السويس|خليج عدن|الخليج العربي
ما الدولة التي تحد السعودية من الجنوب الشرقي؟|عمان|اليمن|الإمارات|قطر
كم دولة تحد السعودية برًا؟|7|6|8|9
ما الدولة التي لا تحدها السعودية برًا من هذه الدول؟|البحرين|الكويت|قطر|الإمارات
ما الجبل الذي تقع عليه مدينة الطائف؟|جبال السروات|جبال طويق|جبل أجا|جبل شمر
في أي دولة تقع جزيرة زنجبار؟|تنزانيا|كينيا|مدغشقر|الصومال
ما الدولة التي يعبرها كل من خط الاستواء ومدار الجدي؟|البرازيل|مصر|الهند|السعودية
ما المدينة التي يمر بها خط غرينتش وتقع فيها ساعة بيغ بن؟|لندن|باريس|دبلن|أمستردام
#1
في أي قارة تقع اليابان؟|آسيا|أوروبا|أوقيانوسيا|أمريكا الشمالية
في أي قارة تقع فرنسا؟|أوروبا|آسيا|أفريقيا|أمريكا الشمالية
في أي قارة تقع المكسيك؟|أمريكا الشمالية|أمريكا الجنوبية|أوروبا|أفريقيا
في أي دولة تقع مدينة مكة المكرمة؟|السعودية|اليمن|الأردن|مصر
في أي دولة تقع مدينة دبي؟|الإمارات|قطر|عمان|البحرين
في أي دولة تقع مدينة الدوحة؟|قطر|البحرين|الكويت|الإمارات
في أي دولة تقع مدينة طوكيو؟|اليابان|الصين|كوريا الجنوبية|تايلاند
في أي دولة تقع مدينة موسكو؟|روسيا|أوكرانيا|بولندا|ألمانيا
أي هذه الدول جزيرة؟|اليابان|مصر|الأردن|سويسرا
ما المحيط الذي يقع بين أمريكا وأوروبا؟|المحيط الأطلسي|المحيط الهادئ|المحيط الهندي|المحيط المتجمد الشمالي
أي هذه المدن تقع على البحر المتوسط؟|الإسكندرية|جدة|مسقط|الكويت
ما الدولة التي يجري فيها نهرا دجلة والفرات معًا قبل التقائهما؟|العراق|مصر|الأردن|لبنان
كم دولة عربية في جامعة الدول العربية؟|22|20|18|25
ما أكبر مدينة في السعودية من حيث السكان؟|الرياض|جدة|مكة المكرمة|الدمام
في أي منطقة سعودية تقع مدينة بريدة؟|القصيم|حائل|الرياض|الجوف
ما الدولة التي تقع جنوب السعودية مباشرة؟|اليمن|عمان|الأردن|العراق
أي هذه الدول الخليجية تقع في أقصى الشمال؟|الكويت|قطر|البحرين|الإمارات
#2
ما الدولة التي تقع فيها جبال الأطلس بشكل رئيسي؟|المغرب|مصر|السودان|الصومال
في أي دولة تقع مدينة البندقية المشهورة بقنواتها؟|إيطاليا|فرنسا|إسبانيا|اليونان
في أي دولة تقع مدينة كيب تاون؟|جنوب أفريقيا|كينيا|نيجيريا|ناميبيا
في أي دولة تقع مدينة سيدني؟|أستراليا|نيوزيلندا|كندا|بريطانيا
ما أقرب قارة إلى شبه الجزيرة العربية من جهة الغرب؟|أفريقيا|أوروبا|أستراليا|أمريكا الجنوبية
في أي منطقة سعودية تقع مدينة تبوك؟|تبوك|المدينة المنورة|الجوف|حائل
في أي منطقة سعودية تقع مدينة الأحساء؟|الشرقية|الرياض|القصيم|نجران
ما الدولة التي يمر بها نهر الأمازون في معظم مجراه؟|البرازيل|الأرجنتين|المكسيك|تشيلي
ما الدولة التي تقع فيها مدينة نيويورك؟|أمريكا|كندا|بريطانيا|أستراليا
ما الدولة التي تحد مصر من الغرب؟|ليبيا|السودان|تشاد|تونس
ما الدولة التي تحد مصر من الجنوب؟|السودان|ليبيا|إثيوبيا|تشاد
ما الدولة التي تحد العراق من الشرق؟|إيران|سوريا|الأردن|تركيا
ما البحر الذي تطل عليه مدينة إسطنبول من الشمال؟|البحر الأسود|البحر الأحمر|بحر قزوين|بحر العرب
ما أكبر دولة في أوروبا مساحة بعد استثناء روسيا؟|أوكرانيا|فرنسا|ألمانيا|إسبانيا
ما أكثر دولة سكانًا في أمريكا الجنوبية؟|البرازيل|الأرجنتين|كولومبيا|بيرو
ما الدولة التي تشتهر بجبال الألب والساعات والشوكولاتة؟|سويسرا|هولندا|البرتغال|اليونان
ما المضيق الذي يربط بحر مرمرة ببحر إيجة؟|الدردنيل|البوسفور|جبل طارق|هرمز
ما المدينة التي تقع على قارتين؟|إسطنبول|القاهرة|موسكو|أثينا
ما أطول نهر في أمريكا الشمالية؟|المسيسيبي-ميزوري|نهر كولورادو|نهر سانت لورانس|نهر يوكون
ما الدولة الآسيوية المكونة من أكثر من 17 ألف جزيرة؟|إندونيسيا|اليابان|سريلانكا|تايلاند
في أي دولة يقع جبل إيفرست على الحدود مع الصين؟|نيبال|الهند|بوتان|باكستان
#3
كم تساوي دائرة العرض عند خط الاستواء؟|0 درجة|90 درجة|23.5 درجة|45 درجة
ما مقدار ميل محور الأرض تقريبًا؟|23.5 درجة|10 درجات|45 درجة|5 درجات
ما خط الطول الذي يمر بغرينتش؟|0 درجة|180 درجة|90 درجة|23.5 درجة
ما خط الطول الذي يقترب منه خط التاريخ الدولي؟|180 درجة|0 درجة|90 درجة|45 درجة
ما الدولة التي تحتوي على أكبر عدد من البراكين النشطة؟|إندونيسيا|اليابان|إيطاليا|آيسلندا
ما الدولة الأوروبية التي تُسمى أرض النار والجليد؟|آيسلندا|النرويج|فنلندا|الدنمارك
ما الخليج الذي يقع بين اليمن والصومال؟|خليج عدن|خليج عمان|الخليج العربي|خليج العقبة
ما اسم الصحراء الواقعة بين الربع الخالي والنفود الكبير؟|الدهناء|سيناء|الصحراء الكبرى|غوبي
ما اسم أطول نهر في فرنسا؟|اللوار|السين|الرون|الراين
ما الدولة التي تمتلك جزر الكناري؟|إسبانيا|البرتغال|المغرب|فرنسا
ما الدولة التي تمتلك جزيرة غرينلاند؟|الدنمارك|كندا|النرويج|آيسلندا
ما الدولة التي تحيط أراضيها بدولة الفاتيكان؟|إيطاليا|فرنسا|سويسرا|إسبانيا
ما الدولة الأفريقية التي كانت تسمى الحبشة؟|إثيوبيا|الصومال|إريتريا|السودان
ما الاسم القديم لدولة سريلانكا؟|سيلان|بورما|سيام|فارس
ما الاسم القديم لدولة تايلاند؟|سيام|سيلان|بورما|فارس
ما الاسم القديم لدولة ميانمار؟|بورما|سيام|سيلان|زائير
ما الاسم القديم لدولة إيران؟|فارس|سيام|بورما|الحبشة
ما الدولة التي يقع فيها منبع نهر النيل الأزرق؟|إثيوبيا|أوغندا|السودان|كينيا
ما البحيرة التي يخرج منها النيل الأبيض؟|بحيرة فكتوريا|بحيرة تشاد|بحيرة تانا|بحيرة ناصر
ما أكبر بحيرة صناعية في الوطن العربي؟|بحيرة ناصر|بحيرة الأسد|بحيرة قارون|بحيرة الثرثار
`);
QB.islam=qbParse(`
#1
كم عدد أركان الإسلام؟|5|4|6|7
كم عدد أركان الإيمان؟|6|5|7|4
كم صلاة مفروضة في اليوم والليلة؟|5|3|4|6
كم عدد أجزاء القرآن الكريم؟|30|20|40|60
ما أول سورة في المصحف؟|الفاتحة|البقرة|العلق|الناس
ما آخر سورة في المصحف؟|الناس|الفلق|الإخلاص|الكوثر
في أي مدينة وُلد النبي ﷺ؟|مكة المكرمة|المدينة المنورة|الطائف|القدس
كم ركعة في صلاة المغرب؟|3|2|4|5
كم ركعة في صلاة الظهر؟|4|2|3|5
كم ركعة في صلاة العصر؟|4|2|3|5
كم ركعة في صلاة الفجر؟|2|3|4|1
كم ركعة في صلاة العشاء؟|4|2|3|5
في أي غار نزل الوحي أول مرة؟|غار حراء|غار ثور|غار الكهف|غار أحد
أي نبي ابتلعه الحوت؟|يونس|موسى|نوح|يوسف
أي نبي رفع قواعد الكعبة مع ابنه إسماعيل؟|إبراهيم|نوح|موسى|عيسى
في أي شهر يصوم المسلمون؟|رمضان|شعبان|رجب|شوال
ما أطول سورة في القرآن الكريم؟|البقرة|آل عمران|النساء|الأعراف
إلى أي مدينة هاجر النبي ﷺ؟|المدينة المنورة|الطائف|الحبشة|مكة المكرمة
أي نبي صنع السفينة بأمر الله؟|نوح|هود|صالح|لوط
كم عدد آيات سورة الفاتحة؟|7|5|6|8
ما الركن الخامس من أركان الإسلام؟|الحج|الصوم|الزكاة|الصلاة
ما الركن الثاني من أركان الإسلام؟|الصلاة|الزكاة|الصوم|الحج
ما الركن الأول من أركان الإسلام؟|الشهادتان|الصلاة|الزكاة|الصوم
في أي شهر هجري يكون الحج؟|ذو الحجة|رمضان|شوال|محرم
كم عدد أشواط الطواف حول الكعبة؟|7|5|3|9
ما اسم البئر المباركة في المسجد الحرام؟|زمزم|بضاعة|رومة|أريس
ما أول شهر في السنة الهجرية؟|محرم|رمضان|صفر|ربيع الأول
ما آخر شهر في السنة الهجرية؟|ذو الحجة|ذو القعدة|شعبان|رمضان
في أي ليلة نزل القرآن الكريم؟|ليلة القدر|ليلة الإسراء|ليلة النصف من شعبان|ليلة العيد
ما اسم الملك الموكل بالوحي؟|جبريل|ميكائيل|إسرافيل|مالك
أي نبي ألقي في النار فكانت بردًا وسلامًا عليه؟|إبراهيم|موسى|يونس|لوط
أي نبي ألقاه إخوته في البئر؟|يوسف|يونس|إسماعيل|موسى
أي نبي تكلم في المهد؟|عيسى|يحيى|موسى|إسحاق
أي نبي اشتهر بالصبر على المرض؟|أيوب|يعقوب|يونس|زكريا
ما السورة التي يستحب قراءتها يوم الجمعة؟|الكهف|يس|الملك|الواقعة
في أي مدينة دُفن النبي ﷺ؟|المدينة المنورة|مكة المكرمة|الطائف|القدس
من أول الخلفاء الراشدين؟|أبو بكر الصديق|عمر بن الخطاب|عثمان بن عفان|علي بن أبي طالب
من الخليفة الراشد الثاني؟|عمر بن الخطاب|أبو بكر الصديق|عثمان بن عفان|علي بن أبي طالب
من الخليفة الراشد الثالث؟|عثمان بن عفان|عمر بن الخطاب|علي بن أبي طالب|أبو بكر الصديق
من الخليفة الراشد الرابع؟|علي بن أبي طالب|عثمان بن عفان|عمر بن الخطاب|أبو بكر الصديق
من مؤذن الرسول ﷺ المشهور؟|بلال بن رباح|عمار بن ياسر|زيد بن حارثة|أنس بن مالك
من رفيق النبي ﷺ في الهجرة إلى المدينة؟|أبو بكر الصديق|عمر بن الخطاب|علي بن أبي طالب|بلال بن رباح
ما اسم الكتاب الذي نزل على موسى عليه السلام؟|التوراة|الإنجيل|الزبور|القرآن
ما اسم الكتاب الذي نزل على عيسى عليه السلام؟|الإنجيل|التوراة|الزبور|القرآن
ما قبلة المسلمين في الصلاة؟|الكعبة المشرفة|المسجد الأقصى|المسجد النبوي|مسجد قباء
ما اسم العيد الذي يأتي بعد صيام رمضان؟|عيد الفطر|عيد الأضحى|يوم عرفة|يوم عاشوراء
من والدة نبي الله عيسى عليه السلام؟|مريم|آسيا|هاجر|سارة
من خاتم الأنبياء والمرسلين؟|محمد ﷺ|عيسى عليه السلام|موسى عليه السلام|إبراهيم عليه السلام
من أول زوجات النبي ﷺ؟|خديجة بنت خويلد|عائشة بنت أبي بكر|حفصة بنت عمر|سودة بنت زمعة
ما أول كلمة نزلت من القرآن الكريم؟|اقرأ|الحمد|قل|سبّح
من ابنة النبي ﷺ الملقبة بالزهراء؟|فاطمة|زينب|رقية|أم كلثوم
في أي مدينة يقع المسجد الأقصى؟|القدس|مكة المكرمة|دمشق|القاهرة
أي نبي ضرب البحر بعصاه فانفلق؟|موسى|عيسى|نوح|يونس
ما السورة التي تتكرر فيها آية «فبأي آلاء ربكما تكذبان»؟|الرحمن|الواقعة|القمر|الملك
أي سورة من هذه سميت باسم حشرة؟|النمل|البقرة|الفيل|العاديات
كم سجدة في كل ركعة من الصلاة؟|2|1|3|4
ما اسم الصلاة التي تصلى ركعتين يوم الجمعة بدل الظهر؟|صلاة الجمعة|صلاة الضحى|صلاة العيد|صلاة الاستسقاء
ما اسم الصلاة التي تصلى عند كسوف الشمس؟|صلاة الكسوف|صلاة الاستسقاء|صلاة الخوف|صلاة الضحى
ما اسم النداء الثاني الذي يكون قبل الصلاة مباشرة؟|الإقامة|الأذان|التكبير|التسبيح
ما اسم الزكاة التي تخرج في آخر رمضان؟|زكاة الفطر|زكاة المال|زكاة الذهب|زكاة الزروع
ما اسم اليوم العاشر من شهر محرم؟|يوم عاشوراء|يوم عرفة|يوم التروية|يوم النحر
ما الشهر الهجري الذي يأتي بعد رمضان؟|شوال|شعبان|ذو القعدة|محرم
ما الشهر الهجري الذي يسبق رمضان؟|شعبان|رجب|شوال|جمادى الآخرة
كم عدد الأشهر في السنة الهجرية؟|12|10|11|13
كم عدد أسماء الله الحسنى في الحديث المشهور؟|99|100|70|33
كم ركعة في صلاة العيد؟|2|4|3|1
متى يبدأ وقت صلاة المغرب؟|عند غروب الشمس|عند الزوال|بعد منتصف الليل|عند طلوع الشمس
ما اسم الحجر الذي في ركن الكعبة ويبدأ منه الطواف؟|الحجر الأسود|مقام إبراهيم|حجر إسماعيل|الصخرة
#2
ما أقصر سورة في القرآن الكريم؟|الكوثر|الإخلاص|العصر|الناس
ما السورة التي لا تبدأ بالبسملة؟|التوبة|الأنفال|يس|الملك
ما اسم والد النبي ﷺ؟|عبدالله|عبدالمطلب|أبو طالب|هاشم
ما أول مسجد بُني في الإسلام؟|مسجد قباء|المسجد النبوي|المسجد الحرام|المسجد الأقصى
أي نبي يُلقب بكليم الله؟|موسى|عيسى|إبراهيم|نوح
أي سورة تسمى أم الكتاب؟|الفاتحة|البقرة|يس|الإخلاص
كم عدد سور القرآن الكريم؟|114|110|112|120
ما السورة التي تعدل ثلث القرآن الكريم؟|الإخلاص|الفاتحة|الكوثر|الناس
ما أعظم آية في القرآن الكريم؟|آية الكرسي|آية الدين|آية النور|أول آية في سورة الحديد
في أي سورة توجد آية الكرسي؟|البقرة|آل عمران|النساء|المائدة
ما اسم أم النبي ﷺ؟|آمنة بنت وهب|حليمة السعدية|خديجة بنت خويلد|فاطمة بنت أسد
ما اسم مرضعة النبي ﷺ في بني سعد؟|حليمة السعدية|أم أيمن|آمنة بنت وهب|سمية بنت خياط
من أول من آمن من الرجال الأحرار؟|أبو بكر الصديق|عمر بن الخطاب|عثمان بن عفان|الزبير بن العوام
من أول من آمن من النساء؟|خديجة بنت خويلد|عائشة بنت أبي بكر|فاطمة الزهراء|سمية بنت خياط
من أول من أسلم من الصبيان؟|علي بن أبي طالب|عبدالله بن عباس|أنس بن مالك|أسامة بن زيد
من الملقب بالفاروق؟|عمر بن الخطاب|أبو بكر الصديق|عثمان بن عفان|علي بن أبي طالب
من الملقب بذي النورين؟|عثمان بن عفان|علي بن أبي طالب|عمر بن الخطاب|الزبير بن العوام
من الملقب بسيف الله المسلول؟|خالد بن الوليد|حمزة بن عبدالمطلب|سعد بن أبي وقاص|عمرو بن العاص
من الملقب بأسد الله؟|حمزة بن عبدالمطلب|خالد بن الوليد|الزبير بن العوام|سعد بن معاذ
من الصحابي الملقب بأمين هذه الأمة؟|أبو عبيدة بن الجراح|أبو بكر الصديق|سعد بن معاذ|معاذ بن جبل
في أي غزوة استشهد حمزة بن عبدالمطلب؟|أحد|بدر|حنين|تبوك
في أي غزوة حفر المسلمون الخندق؟|الأحزاب|بدر|أحد|تبوك
في أي شهر كانت غزوة بدر؟|رمضان|شوال|محرم|رجب
كم كان عمر النبي ﷺ حين نزل عليه الوحي؟|40|25|35|50
كم كان عمر النبي ﷺ حين توفي؟|63|60|65|70
ما الغار الذي اختبأ فيه النبي ﷺ وأبو بكر في الهجرة؟|غار ثور|غار حراء|غار أحد|غار الكهف
ما اسم الدابة التي ركبها النبي ﷺ في رحلة الإسراء؟|البراق|القصواء|العضباء|الدلدل
من أي مسجد بدأت رحلة الإسراء؟|المسجد الحرام|المسجد النبوي|مسجد قباء|المسجد الأقصى
ما أول قبلة للمسلمين؟|المسجد الأقصى|الكعبة المشرفة|مسجد قباء|المسجد النبوي
كم تكبيرة في صلاة الجنازة؟|4|3|5|6
ما اسم اليوم التاسع من ذي الحجة؟|يوم عرفة|يوم التروية|يوم النحر|يوم القر
ما اسم اليوم الثامن من ذي الحجة؟|يوم التروية|يوم عرفة|يوم النحر|يوم القر
ما اسم اليوم العاشر من ذي الحجة؟|يوم النحر|يوم عرفة|يوم التروية|يوم القر
بين أي جبلين يكون السعي؟|الصفا والمروة|عرفات ومزدلفة|أحد وثور|حراء وثور
من جعل بداية التاريخ الإسلامي من الهجرة؟|عمر بن الخطاب|أبو بكر الصديق|عثمان بن عفان|علي بن أبي طالب
ما اسم خازن النار؟|مالك|رضوان|جبريل|ميكائيل
كم عدد الأنبياء المذكورين بأسمائهم في القرآن الكريم؟|25|20|30|40
على أي نبي نزل الزبور؟|داود|سليمان|موسى|عيسى
أي نبي كان يفهم لغة الطير والنمل؟|سليمان|داود|يوسف|موسى
ما السورة الوحيدة التي سميت باسم امرأة؟|مريم|النساء|الطلاق|المجادلة
أي نبي أُرسل إلى قوم عاد؟|هود|صالح|شعيب|لوط
أي نبي أُرسل إلى قوم ثمود؟|صالح|هود|شعيب|نوح
أي نبي أُرسل إلى أهل مدين؟|شعيب|هود|صالح|لوط
ما معجزة نبي الله صالح عليه السلام؟|الناقة|العصا|السفينة|الحوت
ما اسم امرأة فرعون المؤمنة؟|آسيا|مريم|سارة|هاجر
كم عدد أبواب الجنة؟|8|7|6|10
ما اسم الباب الذي يدخل منه الصائمون الجنة؟|الريان|الفردوس|السلام|الرحمة
ما الصلاة التي ليس فيها ركوع ولا سجود؟|صلاة الجنازة|صلاة العيد|صلاة الاستسقاء|صلاة الكسوف
ما الصلاة التي تصلى لطلب نزول المطر؟|صلاة الاستسقاء|صلاة الاستخارة|صلاة الكسوف|صلاة الضحى
ما الصلاة التي تصلى عند التردد في أمر مباح؟|صلاة الاستخارة|صلاة الاستسقاء|صلاة الكسوف|صلاة الضحى
كم عدد الصلوات المفروضة التي يجهر فيها بالقراءة؟|3|2|4|5
من القائد الذي حرر بيت المقدس بعد معركة حطين؟|صلاح الدين الأيوبي|خالد بن الوليد|طارق بن زياد|محمد الفاتح
من القائد الذي عبر المضيق وفتح الأندلس؟|طارق بن زياد|عمرو بن العاص|عقبة بن نافع|صلاح الدين الأيوبي
من فتح القسطنطينية؟|محمد الفاتح|صلاح الدين الأيوبي|طارق بن زياد|قطز
في عهد أي خليفة جُمع المسلمون على مصحف واحد؟|عثمان بن عفان|أبو بكر الصديق|عمر بن الخطاب|علي بن أبي طالب
ما الركن الأعظم في الحج؟|الوقوف بعرفة|طواف الوداع|السعي|رمي الجمرات
في أي عام وُلد النبي ﷺ؟|عام الفيل|عام الحزن|عام الوفود|عام الرمادة
ما اسم العام الذي توفيت فيه خديجة وأبو طالب؟|عام الحزن|عام الفيل|عام الوفود|عام الرمادة
من عم النبي ﷺ الذي كفله بعد وفاة جده؟|أبو طالب|حمزة|العباس|أبو لهب
كم كان عمر النبي ﷺ حين توفيت أمه؟|6 سنوات|سنتان|10 سنوات|12 سنة
من الصحابي الذي نام في فراش النبي ﷺ ليلة الهجرة؟|علي بن أبي طالب|أبو بكر الصديق|زيد بن حارثة|عمر بن الخطاب
من الصحابية الملقبة بذات النطاقين؟|أسماء بنت أبي بكر|عائشة بنت أبي بكر|فاطمة الزهراء|خديجة بنت خويلد
كم سنة دعا النبي ﷺ في مكة قبل الهجرة؟|13|10|20|23
كم سنة عاش النبي ﷺ في المدينة بعد الهجرة؟|10|13|8|20
ما الصلح الذي عُقد بين المسلمين وقريش سنة 6 هـ؟|صلح الحديبية|بيعة العقبة|حلف الفضول|فتح مكة
ما اسم البيعة التي كانت تحت الشجرة؟|بيعة الرضوان|بيعة العقبة الأولى|بيعة العقبة الثانية|بيعة الحرب
كم مرة حج النبي ﷺ بعد الهجرة؟|مرة واحدة|مرتين|ثلاث مرات|أربع مرات
ما اسم حجة النبي ﷺ التي ودّع فيها الناس؟|حجة الوداع|حجة الفتح|حجة النصر|حجة الهجرة
ما آخر غزوة غزاها النبي ﷺ؟|تبوك|حنين|خيبر|بدر
في أي غزوة أعجبت المسلمين كثرتهم؟|حنين|بدر|أحد|تبوك
من الصحابي الملقب بحبر الأمة؟|عبدالله بن عباس|عبدالله بن عمر|عبدالله بن مسعود|أبو هريرة
من أكثر الصحابة رواية للحديث؟|أبو هريرة|عبدالله بن عمر|أنس بن مالك|جابر بن عبدالله
من الصحابي الذي أشار بحفر الخندق؟|سلمان الفارسي|عمار بن ياسر|أبو ذر الغفاري|صهيب الرومي
كم عدد المبشرين بالجنة في الحديث المشهور؟|10|7|12|4
من زوجة النبي ﷺ التي هي ابنة عمر بن الخطاب؟|حفصة|عائشة|زينب|سودة
أي نبي ألان الله له الحديد؟|داود|سليمان|موسى|إدريس
أي نبي سُخّرت له الريح؟|سليمان|داود|موسى|هود
من والد نبي الله يوسف عليه السلام؟|يعقوب|إسحاق|إبراهيم|إسماعيل
من والد نبي الله يعقوب عليه السلام؟|إسحاق|إبراهيم|إسماعيل|يوسف
من والدة نبي الله إسماعيل عليه السلام؟|هاجر|سارة|مريم|آسيا
ما اسم أخي موسى الذي كان نبيًا معه؟|هارون|يوشع|شعيب|يوسف
في أي سورة وردت قصة ذي القرنين؟|الكهف|مريم|طه|الأنبياء
كم عدد آيات سورة الإخلاص؟|4|3|5|6
كم عدد آيات سورة الكوثر؟|3|4|5|2
ما السورة التي تبدأ بـ«تبارك الذي بيده الملك»؟|الملك|الفرقان|الرحمن|الواقعة
ما السورتان المعروفتان بالمعوذتين؟|الفلق والناس|الإخلاص والناس|الفاتحة والإخلاص|الكافرون والإخلاص
ما اسم الطواف الذي يكون آخر عهد الحاج بالبيت قبل سفره؟|طواف الوداع|طواف الإفاضة|طواف القدوم|طواف العمرة
ما اسم المكان الذي يبيت فيه الحجاج ليلة العاشر من ذي الحجة؟|مزدلفة|منى|عرفات|التنعيم
في أي مكان ترمى الجمرات؟|منى|عرفات|مزدلفة|التنعيم
كم عدد الأشهر الحرم؟|4|3|2|6
أي هذه الأشهر من الأشهر الحرم؟|رجب|رمضان|شعبان|شوال
ما اسم الملك الموكل بالنفخ في الصور؟|إسرافيل|جبريل|ميكائيل|مالك
ما اسم الملك الموكل بالمطر؟|ميكائيل|جبريل|إسرافيل|مالك
أي مدينة تسمى «أم القرى»؟|مكة المكرمة|المدينة المنورة|القدس|الطائف
في أي مدينة يقع مسجد القبلتين؟|المدينة المنورة|مكة المكرمة|القدس|الطائف
في أي مدينة تقع مقبرة البقيع؟|المدينة المنورة|مكة المكرمة|الطائف|القدس
من الخليفة الملقب بخامس الخلفاء الراشدين؟|عمر بن عبدالعزيز|هارون الرشيد|معاوية بن أبي سفيان|عبدالملك بن مروان
في عهد أي خليفة فُتح بيت المقدس أول مرة؟|عمر بن الخطاب|أبو بكر الصديق|عثمان بن عفان|علي بن أبي طالب
من القائد المسلم الذي فتح مصر؟|عمرو بن العاص|خالد بن الوليد|سعد بن أبي وقاص|أبو عبيدة بن الجراح
كم عدد أبواب النار كما ذكر القرآن الكريم؟|7|8|5|10
ما اسم النهر الذي أعطاه الله لنبيه ﷺ في الجنة؟|الكوثر|السلسبيل|الفرات|الريان
ما أول ما يحاسب عليه العبد من عمله يوم القيامة؟|الصلاة|الزكاة|الصوم|الحج
ما اسم الحجر الذي عليه أثر قدمي إبراهيم عند الكعبة؟|مقام إبراهيم|الحجر الأسود|حجر إسماعيل|الملتزم
في أي جبل يقع غار حراء؟|جبل النور|جبل ثور|جبل أحد|جبل عرفات
من أول الأنبياء؟|آدم|نوح|إدريس|إبراهيم
أي نبي يلقب بأبي الأنبياء؟|إبراهيم|نوح|آدم|يعقوب
#3
في أي سنة هجرية كانت غزوة بدر؟|2|1|3|5
في أي سنة هجرية كانت غزوة أحد؟|3|2|5|8
في أي سنة هجرية كانت غزوة الأحزاب؟|5|3|7|9
في أي سنة هجرية كان فتح مكة؟|8|6|7|10
ما أطول آية في القرآن الكريم؟|آية الدين|آية الكرسي|آية النور|آية المواريث
ما السورة التي تكررت فيها البسملة مرتين؟|النمل|التوبة|الفاتحة|يس
من أول شهيدة في الإسلام؟|سمية بنت خياط|خديجة بنت خويلد|أم عمارة|أسماء بنت أبي بكر
كم عدد الخلفاء الراشدين؟|4|3|5|6
كم مقدار زكاة النقود إذا بلغت النصاب وحال عليها الحول؟|ربع العشر|العشر|نصف العشر|الخمس
كم سنة لبث نوح في قومه يدعوهم؟|950|500|1000|700
على أي جبل استقرت سفينة نوح؟|الجودي|أحد|الطور|حراء
في أي معركة انتصر المسلمون على الروم بقيادة خالد بن الوليد؟|اليرموك|القادسية|نهاوند|حطين
في أي معركة انتصر المسلمون على الفرس بقيادة سعد بن أبي وقاص؟|القادسية|اليرموك|حطين|ملاذكرد
من الصحابي الذي اهتز لموته عرش الرحمن؟|سعد بن معاذ|سعد بن أبي وقاص|معاذ بن جبل|حمزة بن عبدالمطلب
من الصحابي الذي جمع القرآن في عهد أبي بكر؟|زيد بن ثابت|أبي بن كعب|عبدالله بن مسعود|معاذ بن جبل
في أي سورة ذُكر اسم الصحابي زيد صراحة؟|الأحزاب|النور|التوبة|الحجرات
كم عدد السور التي تبدأ بـ«الحمد لله»؟|5|3|4|6
كم مرة وردت البسملة كاملة في المصحف؟|114|113|112|115
أي جمرة ترمى وحدها يوم النحر؟|جمرة العقبة|الجمرة الصغرى|الجمرة الوسطى|الجمرات الثلاث
ما الغزوة التي سماها القرآن الكريم «يوم الفرقان»؟|بدر|أحد|الأحزاب|حنين
كم كان عدد المسلمين في غزوة بدر تقريبًا؟|313|1000|700|3000
ما المعركة التي استشهد فيها زيد بن حارثة وجعفر بن أبي طالب وعبدالله بن رواحة؟|مؤتة|اليرموك|أحد|حنين
من الصحابي الملقب بذي الجناحين؟|جعفر بن أبي طالب|حمزة بن عبدالمطلب|زيد بن حارثة|مصعب بن عمير
من الصحابي الذي أرسله النبي ﷺ ليعلّم أهل المدينة قبل الهجرة؟|مصعب بن عمير|زيد بن حارثة|عمار بن ياسر|خباب بن الأرت
من الصحابي الذي قال عنه النبي ﷺ: «لكل نبي حواري، وحواريّ…»؟|الزبير بن العوام|طلحة بن عبيدالله|سعد بن أبي وقاص|أبو عبيدة بن الجراح
من أول من رمى بسهم في سبيل الله؟|سعد بن أبي وقاص|الزبير بن العوام|حمزة بن عبدالمطلب|علي بن أبي طالب
من أول من أسلم من الموالي؟|زيد بن حارثة|بلال بن رباح|سلمان الفارسي|عمار بن ياسر
من الصحابي الذي رأى الأذان في المنام فعلّمه بلالًا؟|عبدالله بن زيد|عبدالله بن عمر|أنس بن مالك|عبدالله بن مسعود
أي نبي كان نجارًا كما في الحديث الصحيح؟|زكريا|يوسف|داود|إدريس
أي هؤلاء ليس من أولي العزم من الرسل؟|يوسف|نوح|إبراهيم|موسى
من أول الرسل إلى أهل الأرض؟|نوح|آدم|إدريس|إبراهيم
ما السورة التي تسمى أيضًا سورة بني إسرائيل؟|الإسراء|البقرة|طه|القصص
ما ترتيب سورة يس في المصحف؟|36|18|67|55
كم عدد آيات سورة البقرة؟|286|200|250|300
ما ميقات أهل المدينة للإحرام؟|ذو الحليفة|الجحفة|يلملم|قرن المنازل
ما ميقات أهل نجد للإحرام؟|قرن المنازل|ذو الحليفة|يلملم|الجحفة
ما ميقات أهل اليمن للإحرام؟|يلملم|قرن المنازل|ذو الحليفة|الجحفة
ما ميقات أهل الشام للإحرام؟|الجحفة|يلملم|قرن المنازل|ذو الحليفة
ما الاسم الذي سمى به النبي ﷺ المدينة بدل يثرب؟|طيبة|بكة|البطحاء|أم القرى
من الخليفة الذي لُقب بالصديق؟|أبو بكر|عمر بن الخطاب|عثمان بن عفان|علي بن أبي طالب
من القائد الذي هزم المغول في معركة عين جالوت؟|قطز|صلاح الدين الأيوبي|محمد الفاتح|طارق بن زياد
في أي سنة هجرية كانت معركة حطين؟|583|492|656|711
من الصحابية الملقبة بأم المساكين؟|زينب بنت خزيمة|زينب بنت جحش|سودة بنت زمعة|ميمونة بنت الحارث
كم كان عمر النبي ﷺ حين توفي جده عبدالمطلب؟|8 سنوات|4 سنوات|12 سنة|15 سنة
ما اسم المرأة التي حضنت النبي ﷺ بعد وفاة أمه؟|أم أيمن|حليمة السعدية|ثويبة|فاطمة بنت أسد
`);

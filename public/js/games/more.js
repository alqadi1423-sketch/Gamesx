'use strict';
/* card war, lowest unique number, two thirds, ultimate X-O, proverbs, sequences, colour words, bomb wires, go fish, 99 */

const tbtn=(label,ga,i,on,extra)=>`<button class="btn ${extra||''}" data-ga="${ga}" data-i="${i}" ${on?'':'disabled'}>${label}</button>`;

/* ---------- card war (everyone holds 1 to 7, bid on a prize) ---------- */
// the cards a seat has played are public once the round shows them (d.used, one digit each), so everyone can count what is left
const warUsed=(d,s)=>((d.used||[])[s]||'');
const warFree=(d,s)=>[1,2,3,4,5,6,7].filter(c=>!warUsed(d,s).includes(String(c)));
// the round just played: every seat's card, the winner's in gold (a new node each round, so the cards deal onto the felt)
function warLast(d){if(!Array.isArray(d.lp))return '';
  return `<div class="wlast" data-k="l${d.rd}">${d.pl.map((_,s)=>d.lp[s]>0?`<span class="wl1 ${s===d.lw?'win':''}" style="--c:${col(d,s)};--j:${s}"><b class="ltr">${d.lp[s]}</b><small>${nm(d,s)}</small></span>`:'').join('')}</div>`;}
GAMES.war={name:'حرب الأوراق',cat:'cards',lbc:'#3A5F8F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4F7FBF"/><rect x="14" y="26" width="30" height="44" rx="6" fill="#fff" transform="rotate(-14 29 48)"/><rect x="56" y="26" width="30" height="44" rx="6" fill="#fff" transform="rotate(14 71 48)"/><text x="29" y="56" font-size="20" font-weight="800" fill="#D43C33" text-anchor="middle" transform="rotate(-14 29 48)">7</text><text x="71" y="56" font-size="20" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(14 71 48)">5</text><text x="50" y="92" font-size="18" text-anchor="middle">⚔️</text></svg>`,
  init:n=>{const pr=1+rnd(7);return {rd:0,prize:pr,left:[1,2,3,4,5,6,7].filter(x=>x!==pr),pts:Array(n).fill(0),res:'',used:Array(n).fill(''),pot:0};},
  // online the host takes a pick only if the seat still holds that card
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||Number.isInteger(p.pick)&&warFree(d,d.pl.indexOf(r)).includes(p.pick),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts)),
  winExtra:d=>d.res,
  render(d,ctx){if(d.win!=null)return `<div class="gm gm-war">${warLast(d)}</div>`;const v=ctx.v,me=v!=null&&v>=0;const free=me?warFree(d,v):[];const mp=me?seatPick(d,ctx,v,d.rd):null;
    const pot=d.pot||0;
    // the prize sits on the felt as a gold card (a new node each round, so it deals in), with a tie carried over on top;
    // beside it the rounds and the prizes still to come, then the last round's cards and what each other player still holds
    let s=`<div class="gm gm-war"><div class="mtab wtab"><div class="wprize" data-k="p${d.rd}"><small>الجائزة</small><b class="ltr">${d.prize+pot}</b>${pot?`<em>${d.prize} + ${pot} من التعادل</em>`:''}</div>
    <div class="wrds"><span class="wrd">${[0,1,2,3,4,5,6].map(k=>`<i class="${k<d.rd?'done':k===d.rd?'on':''}"></i>`).join('')}</span><small>جولة ${d.rd+1} من 7</small>
    ${d.left.length?`<span class="wnext"><small>الجوائز الجاية</small>${[...d.left].sort((a,b)=>b-a).map(x=>`<i>${x}</i>`).join('')}</span>`:''}</div></div>${warLast(d)}`;
    s+=`<div class="wfoes">${d.pl.map((_,o)=>o===v||d.out[o]==='1'?'':`<span style="--c:${col(d,o)}"><b>${nm(d,o)}</b>${warFree(d,o).map(c=>`<i>${c}</i>`).join('')}</span>`).join('')}</div>`;
    s+=`<div class="hand whand">${[1,2,3,4,5,6,7].map(c=>!free.includes(c)?`<div class="card big wc dim">${c}</div>`:c===mp?`<div class="card big wc sel">${c}</div>`:`<button class="card ${ctx.my?'pick':''} big wc" data-ga="m" data-i="${c}" ${ctx.my?'':'disabled'}>${c}</button>`).join('')}</div>`;
    return s+(me?`<p class="wmine">نقاطك <b class="ltr">${d.pts[v]}</b></p>`:'')+'</div>';},
  click(a,c,d,ctx){if(!ctx.my||!warFree(d,ctx.v).includes(c))return;simulPick(d,ctx.v,c);},
  // a tie keeps the prize on the table and it adds to the next one (on the last round it is lost)
  resolve(d,picks){const val=d.prize+(d.pot||0);const v=picks.map(x=>x==null?-1:x);const mx=Math.max(...v);const top=v.map((x,s)=>x===mx&&x>0?s:-1).filter(s=>s>=0);const pts=[...d.pts];
    const used=d.pl.map((_,s)=>warUsed(d,s)+(picks[s]!=null?String(picks[s]):''));const rd=d.rd+1,fin=rd>=7;
    if(top.length===1)pts[top[0]]+=val;
    const res=`جائزة ${val}: `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+(top.length===1?`، أخذها ${nm(d,top[0])}`:fin?'، تعادل وراحت':'، تعادل والجائزة تنتقل للجولة الجاية');
    const nx=d.left.length?d.left[rnd(d.left.length)]:null;
    return {...d,pts,rd,res,used,lp:v,lw:top.length===1?top[0]:-1,pot:top.length===1||fin?0:val,prize:nx,left:d.left.filter(x=>x!==nx),win:fin?mostPts(pts):null};}
};
// the bots: match the prize's rank among the prizes left with a card of the same rank among their own, throw the lowest card
// on a cheap prize, and when a card can no longer be beaten (every other player's cards are public) spend the cheapest such card
GAMES.war.botPick=(d,s,lv)=>{const free=warFree(d,s);if(!free.length)return null;if(lv===1||lvRand(lv))return pickR(free);
  const val=d.prize+(d.pot||0),prizes=[d.prize,...d.left],r=prizes.filter(p=>p>val).length,mine=[...free].sort((a,b)=>b-a);
  const fmax=Math.max(0,...aliveSeats(d).filter(o=>o!==s&&!sameTeam(d,o,s)).map(o=>Math.max(0,...warFree(d,o))));
  let c;if(prizes.length>1&&r>=Math.ceil(prizes.length/2))c=mine[mine.length-1];
  else{let k=Math.min(r,mine.length-1);if(lv===2&&Math.random()<.4)k=Math.max(0,Math.min(mine.length-1,k+rnd(3)-1));c=mine[k];}
  const sure=mine.filter(x=>x>fmax);if(sure.length&&(c>fmax||r===0))c=Math.min(...sure);
  return c;};

/* ---------- lowest unique number ---------- */
// every number can be played once a game (d.used: the numbers each seat has shown), and each round has a prize of 1 to 3;
// when no number is unique the prize stays and adds to the next round
const luFree=(d,s)=>{const u=(d.used||[])[s]||[];return Array.from({length:d.max},(_,k)=>k+1).filter(x=>!u.includes(x));};
const LUP=[1,1,2,2,3];
GAMES.lowu={name:'أصغر رقم فريد',cat:'quiz',lbc:'#2E6F73',
  // its own picture (it used the same emoji as guess the number): number balls, the unique lowest one in gold
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3E9298"/>${[[30,26,'2',0],[70,26,'2',0],[30,58,'3',0],[70,58,'1',1]].map(([x,y,t,g])=>`<circle cx="${x}" cy="${y+3}" r="15" fill="rgba(0,0,0,.18)"/><circle cx="${x}" cy="${y}" r="15" fill="${g?'#F0B429':'#fff'}"/><text x="${x}" y="${y+7}" font-size="20" font-weight="800" fill="${g?'#5A3B00':'#2E6F73'}" text-anchor="middle">${t}</text>`).join('')}</svg>`,
  init:n=>({rd:0,max:n>4?15:10,pts:Array(n).fill(0),res:'',rounds:8,used:Array(n).fill(0).map(()=>[]),prize:LUP[rnd(LUP.length)],pot:0}),
  privOk:(d,r,o,p)=>p.pick==null||p.pick===NOPICK||Number.isInteger(p.pick)&&luFree(d,d.pl.indexOf(r)).includes(p.pick),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,d.rounds)} من ${d.rounds}. أصغر رقم ما اختاره غيرك ياخذ الجائزة، وكل رقم مرة وحدة باللعبة</small><br>`),
  winExtra:d=>d.res,
  // the prize (with what a round without a winner left on it), the rounds, last round's numbers with the winner in gold,
  // and the numbers: the ones this player has used are spent
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0,free=me?luFree(d,v):[],mp=me?seatPick(d,ctx,v,d.rd):null,val=(d.prize||1)+(d.pot||0);
    const last=Array.isArray(d.lp)?`<div class="llast" data-k="l${d.rd}">${d.pl.map((_,s)=>d.lp[s]>0?`<span class="${s===d.lw?'win':''}" style="--c:${col(d,s)};--j:${s}"><b class="ltr">${d.lp[s]}</b><small>${nm(d,s)}</small></span>`:'').join('')}</div>`:'';
    if(d.win!=null)return `<div class="gm gm-lowu">${last}</div>`;
    return `<div class="gm gm-lowu"><div class="lhead"><div class="lprize" data-k="p${d.rd}"><small>الجائزة</small><b class="ltr">${val}</b>${d.pot?`<em>+${d.pot} من قبل</em>`:''}</div>
      <div class="lrds">${Array(d.rounds).fill(0).map((_,k)=>`<i class="${k<d.rd?'done':k===d.rd?'on':''}"></i>`).join('')}</div></div>${last}
      <div class="lgrid">${Array(d.max).fill(0).map((_,k)=>{const n=k+1,u=me&&!free.includes(n);return `<button class="lnum ${u?'used':''} ${mp===n?'sel':''}" data-ga="m" data-i="${n}" ${ctx.my&&!u?'':'disabled'}>${n}</button>`;}).join('')}</div>
      ${me?`<p class="lleft">باقي معك ${free.length} أرقام و${d.rounds-d.rd} جولات</p>`:''}</div>`;},
  click(a,k,d,ctx){if(!ctx.my||!luFree(d,ctx.v).includes(k))return;simulPick(d,ctx.v,k);},
  resolve(d,picks){const cnt={};picks.forEach(x=>{if(x!=null)cnt[x]=(cnt[x]||0)+1;});const u=Object.keys(cnt).map(Number).filter(x=>cnt[x]===1).sort((a,b)=>a-b);const pts=[...d.pts];let w=-1;
    const val=(d.prize||1)+(d.pot||0),rd=d.rd+1,fin=rd>=d.rounds;if(u.length){w=picks.indexOf(u[0]);pts[w]+=val;}
    const used=d.pl.map((_,s)=>[...((d.used||[])[s]||[]),...(picks[s]!=null?[picks[s]]:[])]);
    return {...d,pts,rd,used,lp:picks.map(x=>x==null?-1:x),lw:w,pot:w>=0||fin?0:val,prize:LUP[rnd(LUP.length)],
      res:d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+(w>=0?`. ${nm(d,w)} أخذ ${val} بالرقم ${u[0]}`:fin?'. ما فيه رقم فريد':'. ما فيه رقم فريد، والجائزة تنتقل'),win:fin?mostPts(pts):null};}
};
// the bots: the hard one plays the round out a few hundred times with the others picking low numbers more often, then
// weighs each number's chance to win against what keeping it is worth for the rounds left
GAMES.lowu.botPick=(d,s,lv)=>{const free=luFree(d,s);if(!free.length)return null;if(lv===1)return pickR(free);
  const val=(d.prize||1)+(d.pot||0),left=d.rounds-d.rd;
  const geo=(list,q)=>{let r=Math.random()*(1-Math.pow(q,list.length))/(1-q),k=0;for(let w=1;k<list.length-1&&r>w;k++){r-=w;w*=q;}return list[k];};
  if(lv===2)return val>=2||left<=free.length/3?geo(free,.65):free[Math.min(free.length-1,Math.floor(free.length/3)+rnd(Math.ceil(free.length/2)))];
  const foes=aliveSeats(d).filter(o=>o!==s),ff=foes.map(o=>luFree(d,o)),win={},T=300;free.forEach(x=>win[x]=0);
  for(let t=0;t<T;t++){const cnt={};ff.forEach(f=>{if(!f.length)return;const x=Math.random()<.25?pickR(f):geo(f,val>=3?.55:.7);cnt[x]=(cnt[x]||0)+1;});
    let fu=Infinity;for(const k in cnt)if(cnt[k]===1&&+k<fu)fu=+k;for(const x of free)if(!cnt[x]&&x<fu)win[x]++;}
  const keep=(left-1)/Math.max(1,free.length-1)*1.8;
  return free.map(x=>[x,win[x]/T*(val-keep)+Math.random()*.01]).sort((a,b)=>b[1]-a[1])[0][0];};

/* ---------- two thirds of the average ---------- */
// each round has its own fraction of the average to aim at; the first is always two thirds
const T3F=[[2,3],[2,3],[1,2],[3,4],[1,3],[1,1]];
const t3Txt=f=>f[0]===f[1]?'المتوسط نفسه':({'2/3':'ثلثين','1/2':'نص','3/4':'ثلاثة أرباع','1/3':'ثلث'}[f.join('/')]||'⅔')+' المتوسط';
GAMES.two3={name:'ثلثين المتوسط',cat:'quiz',lbc:'#5D4E9E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A69C4"/><text x="50" y="62" font-size="38" font-weight="800" fill="#fff" text-anchor="middle">⅔</text></svg>`,
  init:n=>({rd:0,pts:Array(n).fill(0),res:'',rounds:6,fr:[2,3]}),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,ptsBadges(d,d.pts),true),
  winExtra:d=>d.res,
  // last round on a 0 to 100 line: every pick as a dot in the player's colour, and the target as a gold flag (a new node each round)
  render(d,ctx){const v=+((S.draft||{}).t23??50),f=d.fr||[2,3];
    const line=Array.isArray(d.lp)?`<div class="t3line" data-k="l${d.rd}"><div class="t3bar">${d.tg!=null?`<i class="t3tg" style="right:${d.tg}%"><b class="ltr">${d.tg}</b></i>`:''}${d.pl.map((_,s)=>d.lp[s]>=0?`<i class="t3p ${(d.lw||[]).includes(s)?'win':''}" style="right:${d.lp[s]}%;--c:${col(d,s)};--j:${s}"></i>`:'').join('')}</div><p>${d.res||''}</p></div>`:'';
    if(d.win!=null)return `<div class="gm gm-two3">${line}</div>`;
    return `<div class="gm gm-two3"><div class="t3goal" data-k="g${d.rd}"><small>جولة ${d.rd+1} من ${d.rounds}، الهدف</small><b>${t3Txt(f)}</b></div>${line}${ctx.my?`<div class="t3card"><span class="big-num ltr">${v}</span></div><div class="t3rng"><input type="range" class="t3r" min="0" max="100" value="${v}" data-draft="t23" style="--v:${v}"><div class="t3tk"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div><button class="btn red wide" data-ga="go">ثبّت رقمي</button>`:''}</div>`;},
  // the slider's filled part follows the thumb (core only updates the number)
  after(){const r=app.querySelector('.gm-two3 .t3r');if(r&&!r._t3){r._t3=1;r.addEventListener('input',()=>r.style.setProperty('--v',r.value));}},
  click(a,i,d,ctx){if(!ctx.my)return;const v=Math.max(0,Math.min(100,Math.round(+((S.draft||{}).t23??50))));if(S.draft)delete S.draft.t23;simulPick(d,ctx.v,v);},
  // the closest takes a point, two when within one of the target; the next round's fraction is drawn here
  resolve(d,picks){const f=d.fr||[2,3];const vals=picks.filter(x=>x!=null);const sum=vals.reduce((a,b)=>a+b,0);const avg=vals.length?sum/vals.length:0;const tg=Math.round(avg*f[0]/f[1]*10)/10;
    const diff=picks.map(x=>x==null?Infinity:Math.abs(f[1]*vals.length*x-f[0]*sum));const mn=Math.min(...diff);const pts=[...d.pts];const w=[],lw=[];
    const hit=isFinite(mn)&&mn<=f[1]*vals.length;diff.forEach((x,s)=>{if(x===mn&&isFinite(x)){pts[s]+=hit?2:1;w.push(nm(d,s));lw.push(s);}});
    const rd=d.rd+1,pool=T3F.filter(x=>x[0]!==x[1]||aliveSeats(d).length>2);
    return {...d,pts,rd,lp:picks.map(x=>x==null?-1:x),tg:Math.min(100,tg),lw,fr:pool[rnd(pool.length)],res:`${t3Txt(f)}: المتوسط ${Math.round(avg*10)/10}، والهدف ${tg}. `+d.pl.map((r,s)=>picks[s]==null?'':`${nm(d,s)} ${picks[s]}`).filter(Boolean).join('، ')+`. الأقرب: ${w.join('، ')}${hit?' (إصابة! +2)':''}`,win:rd>=d.rounds?mostPts(pts):null};}
};
// the bots: the best reply to what the others are expected to pick (last round's picks drifting down, or a naive guess):
// x = f·S/(n−f) where S is the others' sum. Between two players with f < 1 the lower number always wins, so the hard bot goes low
GAMES.two3.botPick=(d,s,lv)=>{const f=(d.fr||[2,3])[0]/(d.fr||[2,3])[1],n=Math.max(2,aliveSeats(d).length);
  if(lv===1)return f<1?10+rnd(60):30+rnd(50);
  if(f<1&&n===2)return lv===3?rnd(4):rnd(20);
  const lp=(Array.isArray(d.lp)?d.lp:[]).filter((x,o)=>o!==s&&x>=0),m=lp.length?lp.reduce((x,y)=>x+y,0)/lp.length:50;
  const est=lv===3?(lp.length?m*(f<1?.8:1):45*f):(lp.length?m:50*f*1.1);
  let x=f*est*(n-1)/(n-f)+(Math.random()-.5)*(lv===3?3:14);return Math.max(0,Math.min(100,Math.round(x)));};

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

// the bots: every level scores a move by what it wins, blocks and where it sends the next player; the hard bot against
// one opponent also looks at every reply and keeps the move whose best reply hurts least
const uxoLegal=(b,w,nb)=>{const L=[];for(let i=0;i<81;i++){const k=Math.floor(i/9);if(b[i]==='.'&&w[k]==='.'&&(nb<0||nb===k))L.push(i);}return L;};
function uxoApply(b,w,i,ch){const k=Math.floor(i/9),j=i%9;b=setAt(b,i,ch);const sw=line3(small(b,k));if(sw)w=setAt(w,k,sw);else if(!small(b,k).includes('.'))w=setAt(w,k,'d');
  return {b,w,nb:w[j]==='.'?j:-1,won:line3(w)};}
// the position for `me` against `op`: big boards and lines on the big board count most, then two-in-a-rows on open small boards
const UXW=[1.2,1,1.2,1,1.5,1,1.2,1,1.2];
function uxoEval(b,w,me,op){let v=0;
  for(const L of L3){let m=0,o=0,x=0;for(const k of L){const c=w[k];if(c===me)m++;else if(c===op)o++;else if(c!=='.')x++;}
    if(!x){if(!o)v+=[0,6,30][m]||0;if(!m)v-=[0,6,30][o]||0;}}
  for(let k=0;k<9;k++){const c=w[k];if(c===me){v+=20*UXW[k];continue;}if(c===op){v-=20*UXW[k];continue;}if(c!=='.')continue;const sm=small(b,k);
    for(const L of L3){let m=0,o=0;for(const q of L){if(sm[q]===me)m++;else if(sm[q]===op)o++;}if(!o&&m)v+=(m===2?3:.5)*UXW[k];if(!m&&o)v-=(o===2?3:.5)*UXW[k];}}
  return v;}
GAMES.uxo.bot=(d,s,lv)=>{const legal=uxoLegal(d.b,d.w,d.nb);
  if(!legal.length)return;if(lvRand(lv))return botDo(d,s,'m',pickR(legal));const me=String(s);
  const foes=d.pl.map((_,o)=>o).filter(o=>!sameTeam(d,o,s)&&d.out[o]!=='1');
  if(lv===3&&foes.length===1&&aliveSeats(d).length===2){const op=String(foes[0]);let best=-1e9,bm=[];
    for(const i of legal){const A=uxoApply(d.b,d.w,i,me);let v;
      if(A.won===me)v=1e8;
      else{const R=uxoLegal(A.b,A.w,A.nb);if(!R.length)v=uxoEval(A.b,A.w,me,op);
        else{v=1e9;for(const r of R){const B=uxoApply(A.b,A.w,r,op);const e=B.won===op?-1e8:uxoEval(B.b,B.w,me,op)+(B.nb<0?4:0);if(e<v)v=e;if(v<best-1e-9)break;}}}
      if(v>best+1e-9){best=v;bm=[i];}else if(v>best-1e-9)bm.push(i);}
    return botDo(d,s,'m',pickR(bm));}
  const winsAt=(str,ch)=>[...str].map((c,i)=>c==='.'&&line3(setAt(str,i,ch))===ch?i:-1).filter(i=>i>=0);
  const others=d.pl.map((_,o)=>o).filter(o=>!sameTeam(d,o,s)).map(String);
  const val=i=>{const k=Math.floor(i/9),j=i%9;const b=setAt(d.b,i,me),sm=small(b,k);let v=0,w=d.w;
    if(line3(sm)===me){w=setAt(w,k,me);v+=60;if(line3(w)===me)return 1e9;v+=winsAt(w,me).length*25;}
    if(others.some(o=>winsAt(small(d.b,k),o).includes(j)))v+=45;// block
    if(others.some(o=>winsAt(d.w,o).includes(k)))v+=40;
    // where the next player is sent
    const nw=w[j]!=='.'||!small(b,j).includes('.');if(nw)v-=lv===3?30:10;else{if(others.some(o=>winsAt(small(b,j),o).length))v-=lv===3?50:15;}
    v+=[3,1,3,1,4,1,3,1,3][j];return v+Math.random()*2;};
  return botDo(d,s,'m',legal.sort((a,b)=>val(b)-val(a))[0]);};

/* ---------- proverbs ---------- */
const PROV=[['الصبر مفتاح…','الفرج'],['من جد…','وجد'],['العلم في الصغر كالنقش في…','الحجر'],['القناعة كنز لا…','يفنى'],['الوقت كالسيف إن لم تقطعه…','قطعك'],['رب أخ لك لم…','تلده أمك'],['في التأني السلامة وفي العجلة…','الندامة'],['الجار قبل…','الدار'],['الرفيق قبل…','الطريق'],['إذا كان الكلام من فضة فالسكوت من…','ذهب'],['اللي ما يعرف الصقر…','يشويه'],['عصفور في اليد ولا عشرة على…','الشجرة'],['يا غريب كن…','أديب'],['درهم وقاية خير من قنطار…','علاج'],['الطيور على أشكالها…','تقع'],['لكل جواد…','كبوة'],['خير الكلام ما قل…','ودل'],['من حفر حفرة لأخيه…','وقع فيها'],['اتق شر من…','أحسنت إليه'],['إن غدًا لناظره…','قريب'],['الكتاب يبان من…','عنوانه'],['كل إناء بما فيه…','ينضح'],['يد وحدة ما…','تصفق'],['القرد في عين أمه…','غزال'],['مد رجولك على قد…','لحافك'],['الحركة…','بركة'],['اللي فات…','مات'],['الشق أكبر من…','الرقعة'],['ما طار طير وارتفع إلا كما طار…','وقع'],['اسأل مجرب ولا تسأل…','حكيم'],["ما كل ما يتمنى المرء…", "يدركه"],["تجري الرياح بما لا…", "تشتهي السفن"],["الصديق وقت…", "الضيق"],["لا تؤجل عمل اليوم إلى…", "الغد"],["من شب على شيء…", "شاب عليه"],["العقل السليم في…", "الجسم السليم"],["لكل مقام…", "مقال"],["رب ضارة…", "نافعة"],["الوحدة خير من جليس…", "السوء"],["على قدر أهل العزم تأتي…", "العزائم"],["خير الأمور…", "أوسطها"],["ليس كل ما يلمع…", "ذهبًا"],["السكوت علامة…", "الرضا"],["بلغ السيل…", "الزبى"],["سبق السيف…", "العذل"],["عند الامتحان يُكرم المرء أو…", "يُهان"],["ما حك جلدك مثل…", "ظفرك"],["أول الغيث…", "قطرة"],["الحاجة أم…", "الاختراع"],["كل ممنوع…", "مرغوب"],["القافلة تسير والكلاب…", "تنبح"],["لكل داء…", "دواء"],["لا يُلدغ المؤمن من جحر…", "مرتين"],["من راقب الناس مات…", "همًّا"],["يداك أوكتا وفوك…", "نفخ"],["وافق شنٌّ…", "طبقة"],["جنت على نفسها…", "براقش"],["عادت حليمة لعادتها…", "القديمة"],["رجع بخفي…", "حنين"],["أعطِ الخبز…", "لخبازه"],["الشمس ما تتغطى…", "بغربال"],["اللي ما يطول العنب يقول عنه…", "حامض"],["الباب اللي يجيك منه الريح…", "سده واستريح"],["إذا حضر الماء بطل…", "التيمم"],["اللي في القدر يطلعه…", "الملاس"],["من طق الباب سمع…", "الجواب"],["ما يمدح السوق إلا من…", "ربح فيه"],["الكلام اللين يغلب…", "الحق البين"],["اللي ما له أول ما له…", "تالي"],["كلٌّ يغني على…", "ليلاه"],["إن كنت ريحًا فقد لاقيت…", "إعصارًا"],["ومن الحب ما…", "قتل"],["الضرب في الميت…", "حرام"],["فاقد الشيء لا…", "يعطيه"],["لسانك حصانك إن صنته…", "صانك"],["ما كل بيضاء…", "شحمة"],["الدنيا يوم لك ويوم…", "عليك"],["لا يفلّ الحديد إلا…", "الحديد"],["الحر تكفيه…", "الإشارة"],["العين ما تعلى على…", "الحاجب"],["اللي ما يشوف من الغربال…", "أعمى"],["الطمع ضرّ ما…", "نفع"],["خذوا الحكمة من أفواه…", "المجانين"],["العجلة من…", "الشيطان"],["الكلمة الطيبة…", "صدقة"],["ابن الوز…", "عوام"],["حبل الكذب…", "قصير"],["التكرار يعلّم…", "الشطار"],["يا ما تحت السواهي…", "دواهي"],["مصائب قوم عند قوم…", "فوائد"],["كما تدين…", "تُدان"],["اللي يبي الدح ما يقول…", "أح"],["شين وقوي…", "عين"],["لكل زمان دولة…", "ورجال"],["إن كان صاحبك عسل لا…", "تلحسه كله"],["اللي ما يعرفك ما…", "يثمنك"],["المكتوب على الجبين لازم تشوفه…", "العين"],["كثرة الطق تفك…", "اللحام"],["اللي يتلفت ما…", "يوصل"],["كل شي بالغصب إلا…", "المحبة"],["الصيت ولا…", "الغنى"],["المال السايب يعلّم…", "السرقة"],["اربط الحمار مكان ما يبي…", "صاحبه"],
  // more sayings, old Arabic and Gulf ones
  ["من سار على الدرب…", "وصل"],
  ["من زرع…", "حصد"],
  ["الجزاء من جنس…", "العمل"],
  ["البعيد عن العين بعيد عن…", "القلب"],
  ["من شابه أباه فما…", "ظلم"],
  ["أهل مكة أدرى…", "بشعابها"],
  ["لا دخان بلا…", "نار"],
  ["ما لا يُدرك كله لا يُترك…", "جله"],
  ["خير البر…", "عاجله"],
  ["قطعت جهيزة قول كل…", "خطيب"],
  ["الصيفَ ضيّعتِ…", "اللبن"],
  ["كالمستجير من الرمضاء…", "بالنار"],
  ["أسمع جعجعة ولا أرى…", "طحنًا"],
  ["إن البُغاث بأرضنا…", "يستنسر"],
  ["تسمع بالمعيدي خير من أن…", "تراه"],
  ["لا ناقة لي فيها ولا…", "جمل"],
  ["يا خبر اليوم بفلوس بكرة…", "ببلاش"],
  ["جا يكحلها…", "عماها"],
  ["زيادة الخير…", "خيرين"],
  ["الوقاية خير من…", "العلاج"],
  ["الأقربون أولى…", "بالمعروف"],
  ["ما ضاع حق وراءه…", "مطالب"],
  ["إذا كثر الطباخون فسدت…", "الطبخة"],
  ["يوم عسل ويوم…", "بصل"],
  ["كل تأخيرة فيها…", "خيرة"],
  ["اللي يحتاجه البيت يحرم على…", "الجامع"],
  ["الجنة بلا ناس ما…", "تنداس"],
  ["صاحب بالين…", "كذاب"],
  ["الطول طول نخلة والعقل عقل…", "سخلة"],
  ["من قدّم السبت لقى…", "الأحد"],
  ["مو كل من صف الصواني قال…", "أنا حلواني"],
  ["إياك أعني واسمعي…", "يا جارة"],
  ["اللي تحسبه موسى يطلع…", "فرعون"],
  ["مو كل مرة تسلم…", "الجرة"],
  ["الجود من…", "الموجود"],
  ["لا تبع جلد الدب قبل…", "أن تصطاده"],
  ["أن تصل متأخرًا خير من…", "ألا تصل أبدًا"],
  ["من طلب العلا سهر…", "الليالي"],
  ["العلم نور والجهل…", "ظلام"],
  ["المرء بأصغريه: قلبه…", "ولسانه"],
  ["كل فتاة بأبيها…", "معجبة"],
  ["قد أعذر من…", "أنذر"],
  ["رب رمية من غير…", "رامٍ"],
  ["قبل الرماء تُملأ…", "الكنائن"],
  ["أخوك من…", "صدقك"],
  ["إذا عُرف السبب بطل…", "العجب"],
  ["خالف…", "تُعرف"],
  ["لكل مجتهد…", "نصيب"],
  ["من أمن العقوبة أساء…", "الأدب"],
  ["الإنسان عدو ما…", "يجهل"],
  ["ما أشبه الليلة…", "بالبارحة"],
  ["أعطِ القوس…", "باريها"],
  ["ما يجيبها إلا…", "رجالها"],
  ["الشيوخ…", "أبخص"],
  ["كلام الليل يمحوه…", "النهار"],
  ["الضيف في حكم…", "المضيف"],
  ["العين بصيرة واليد…", "قصيرة"],
  ["مشيناها خطى كُتبت علينا ومن كُتبت عليه خطى…", "مشاها"],
  ["كل الطرق تؤدي إلى…", "روما"],
  ["من عاشر القوم أربعين يومًا صار…", "منهم"],
  ["الجار للجار ولو…", "جار"],
  ["اللي له ظهر ما ينضرب على…", "بطنه"],
  ["جوّع كلبك…", "يتبعك"],
  ["بيدي لا بيد…", "عمرو"],
  ["سمّن كلبك…", "يأكلك"],
  ["ما هكذا تورد يا سعد…", "الإبل"],
  ["يصطاد في الماء…", "العكر"],
  ["أُكلت يوم أُكل الثور…", "الأبيض"],
  ["ذهب أدراج…", "الرياح"],
  ["لا يضر السحاب…", "نبح الكلاب"],
  ["بين حانا ومانا ضاعت…", "لحانا"],
  ["القرش الأبيض ينفع في اليوم…", "الأسود"],
  ["اسمع كلام اللي يبكيك ولا تسمع كلام اللي…", "يضحكك"],
  ["الميّة تكذّب…", "الغطاس"],
  ["يا ما جاب الغراب…", "لأمه"],
  ["الصاحب…", "ساحب"],
  ["عند البطون تعمى…", "العيون"],
  ["كل عقدة ولها…", "حلّال"],
  ["البركة في…", "البكور"],
  ["لا تقول فول حتى يصير في…", "المكيول"],
  ["ما يحس بالجمرة إلا…", "اللي واطيها"],
  ["قيراط حظ ولا فدان…", "شطارة"],
  ["من برّه هالله هالله ومن جوّه…", "يعلم الله"],
  ["وعد الحر…", "دين عليه"],
  ["الطبع يغلب…", "التطبع"],
  ["لا تكن لينًا فتُعصر ولا يابسًا…", "فتُكسر"],
  ["اتق شر الحليم إذا…", "غضب"],
  ["آفة العلم…", "النسيان"],
  ["زامر الحي لا…", "يُطرب"],
  ["البلاء موكّل…", "بالمنطق"],
  ["ما كل طير يتاكل…", "لحمه"],
  ["القلم أحد…", "اللسانين"],
  ["أنا وأخوي على ابن عمي وأنا وابن عمي على…", "الغريب"],
  ["الرجال مخابر مو…", "مناظر"],
  ["الدراهم…", "مراهم"]];
// near twins (ذهب/ذهبًا، عين/العين، وقع/وقع فيها) never sit together as options
const pvN=s=>s.replace(/[\u064B-\u0652]/g,'').split(' ')[0].replace(/^ال/,'').replace(/ا$/,'');
GAMES.prov=makeQuiz({name:'أكمل المثل',lbc:'#7A5230',icon:iconE('#A06B3E','📜'),
  gen(d,rd){const R=srng(d,'pv');const ord=[...PROV.keys()];for(let i=ord.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}
    const k=ord[rd%ord.length];const R2=srng(d,'pv'+rd);const w=new Set();while(w.size<3){const x=Math.floor(R2()*PROV.length);if(x!==k&&![PROV[k][1],...w].some(y=>pvN(y)===pvN(PROV[x][1])))w.add(PROV[x][1]);}
    return {q:`<span class="pvq">${PROV[k][0].replace(/…$/,'')}<i class="pvb">…</i></span>`,...withOptions(R2,PROV[k][1],[...w])};}});

/* ---------- number sequences ---------- */
const PRIMES=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53];
// fifteen kinds of sequence; each has one clear rule that the five numbers shown pin down
const seqA=R=>{const I=(a,b)=>a+Math.floor(R()*(b-a+1));const ty=Math.floor(R()*15);let a=[];
    if(ty===0){const x=I(1,9),k=I(2,9);for(let i=0;i<6;i++)a.push(x+k*i);}                        // +k
    else if(ty===1){const x=I(1,5),k=I(2,3);for(let i=0;i<6;i++)a.push(x*Math.pow(k,i));}          // ×k
    else if(ty===2){const o=I(1,9);for(let i=0;i<6;i++)a.push((i+o)*(i+o));}                         // squares
    else if(ty===3){const x=I(1,3),y=x+I(1,3);a=[x,y];for(let i=2;i<6;i++)a.push(a[i-1]+a[i-2]);}   // each is the sum of the two before
    else if(ty===4){const x=I(50,99),k=I(3,9);for(let i=0;i<6;i++)a.push(x-k*i);}                    // −k
    else if(ty===5){const o=I(1,4);for(let i=0;i<6;i++)a.push((i+o)*(i+o)*(i+o));}                   // cubes
    else if(ty===6){const k=I(1,4);a=[I(1,9)];for(let i=1;i<6;i++)a.push(a[i-1]+k+i-1);}            // the step grows by one
    else if(ty===7){const x=I(1,9),k=I(2,5),y=I(20,40),m=I(1,4);for(let i=0;i<6;i++)a.push(i%2?y-m*(i-1)/2:x+k*i/2);} // two sequences in turn
    else if(ty===8){a=[I(1,4)];for(let i=1;i<6;i++)a.push(a[i-1]*2+1);}                               // ×2 then +1
    else if(ty===9){const k=I(1,5);a=[I(1,5)];for(let i=1;i<6;i++)a.push(i%2?a[i-1]*2:a[i-1]+k);}    // ×2, +k, ×2, +k
    else if(ty===10){const o=I(0,7);a=PRIMES.slice(o,o+6);}                                          // primes
    else if(ty===11){const o=I(1,8);for(let i=0;i<6;i++){const n=i+o;a.push(n*(n+1)/2);}}            // triangle numbers
    else if(ty===12){const k=I(4,9),m=I(1,k-1);a=[I(5,20)];for(let i=1;i<6;i++)a.push(i%2?a[i-1]+k:a[i-1]-m);} // +k, −m
    else if(ty===13){const x=I(1,5);for(let i=5;i>=0;i--)a.push(x*Math.pow(2,i));}                   // halves
    else{const k=I(1,3);a=[I(1,9)];for(let i=1;i<6;i++)a.push(a[i-1]+k*Math.pow(2,i-1));}           // the step doubles
    return a;};
GAMES.seq=makeQuiz({name:'أكمل التسلسل',lbc:'#2F6F4F',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3F9468"/><text x="50" y="58" font-size="20" font-weight="800" fill="#fff" text-anchor="middle" direction="ltr">2 4 8 ?</text></svg>`,
  // replay the earlier rounds so a sequence never comes back in the same match; the wrong answers include the plain
  // "same step again" guess, the usual slip
  gen(d,rd){let R,a;const seen=new Set();for(let r=0;r<=rd;r++){R=srng(d,'sq'+r);for(let t=0;t<30;t++){a=seqA(R);if(!seen.has(a.slice(0,5).join()))break;}seen.add(a.slice(0,5).join());}
    const ans=a[5];const w=new Set();const lin=2*a[4]-a[3];if(lin!==ans&&lin>=0)w.add(lin);
    const del=[1,-1,2,-2,a[5]-a[4],3,-3,10,-10];for(let g=0;w.size<3&&g<200;g++){const x=ans+del[Math.floor(R()*del.length)];if(x!==ans&&x>=0)w.add(x);}
    for(let k=11;w.size<3;k++)w.add(ans+k);
    return {q:`<span class="sqs" dir="ltr">${a.slice(0,5).map(x=>`<b>${x}</b>`).join('')}<b class="sqq">؟</b></span>`,rq:a.slice(0,5).join(' ، ')+' ، ؟',...withOptions(R,String(ans),[...w].map(String))};}});

/* ---------- colour words ---------- */
const STC=[['أحمر','#E5483F'],['أزرق','#3D8FD8'],['أخضر','#3FAE5C'],['أصفر','#E9B21C'],['بنفسجي','#9C5BC7'],['برتقالي','#F07D2C'],['وردي','#E5609F'],['بني','#8B5A2B']];
GAMES.stroop={name:'لون الكلمة',cat:'quiz',lbc:'#A33C77',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="40" font-size="22" font-weight="800" fill="#3D8FD8" text-anchor="middle">أحمر</text><text x="50" y="74" font-size="22" font-weight="800" fill="#3FAE5C" text-anchor="middle">أصفر</text></svg>`,
  // three kinds of question after the first two rounds: the ink (0), the written word (1), or the ink with the answer
  // buttons painted in the wrong colours (2). Every answer button of kind 2 wears another option's colour, never its own
  ...(()=>{const q=makeQuiz({name:'',lbc:'',icon:'',gen(d,rd){let R,w,c,k;const seen=new Set();for(let r=0;r<=rd;r++){R=srng(d,'st'+r);for(let t=0;t<40;t++){w=Math.floor(R()*STC.length);c=Math.floor(R()*(STC.length-1));if(c>=w)c++;k=r<2?0:Math.floor(R()*3);if(!seen.has(k*64+w*8+c))break;}seen.add(k*64+w*8+c);}
    const ask=k===1?w:c,other=k===1?c:w;const ws=new Set([other]);while(ws.size<3){const x=Math.floor(R()*STC.length);if(x!==ask)ws.add(x);}
    const ids=[ask,...ws],lab=(x,i)=>k===2?`<b style="color:${STC[ids[(i+1)%4]][1]}">${STC[x][0]}</b>`:STC[x][0];const L=ids.map(lab);
    return {q:`<span class="stw" style="color:${STC[c][1]}">${STC[w][0]}</span><small class="sth ${k===1?'alt':''}">${k===1?'وش الكلمة المكتوبة؟ (مو لونها)':'وش لون الخط؟ (مو الكلمة)'}</small>`,rq:k===1?'الكلمة':'لون الخط',...withOptions(R,L[0],L.slice(1))};}});delete q.name;delete q.lbc;delete q.icon;delete q.cat;return q;})()
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
  // time ran out: a random wire is cut for you (never a safe one on purpose, or waiting out the clock would be the best move)
  onTimeout:d=>{const left=[...Array(d.k).keys()].filter(i=>!d.cut.includes(i));return wCut(d,left[rnd(left.length)]);}
};

/* ---------- go fish ---------- */
const rk=c=>c[0];const RKN=r=>r==='T'?'10':r;
// draw a random card from what is left, so the stored pile order tells nothing
const dkPick=dk=>{const j=rnd(dk.length/2)*2;return [dk.slice(j,j+2),dk.slice(0,j)+dk.slice(j+2)];};
const fishBk=h=>{const by={};cardsOf(h).forEach(c=>{by[rk(c)]=(by[rk(c)]||0)+1;});let got='';for(const r in by)if(by[r]===4)got+=r;return [cardsOf(h).filter(c=>!got.includes(rk(c))).join(''),got];};
// out seats hold no cards and never win on books
// what the table knows from the asking (public, anyone could remember it): kn[s] the ranks seat s is known to hold
// (it asked for them), nh[s] the ranks it was asked for and did not have since it last got a card
const fishMem=d=>({kn:[...(d.kn||d.pl.map(()=>''))],nh:[...(d.nh||d.pl.map(()=>''))]});
const fishEnd=nd=>{const total=nd.books.reduce((x,b)=>x+b.length,0);
  if(total>=13||!nd.dk.length&&nd.hands.every((h,s)=>!h.length||nd.out[s]==='1'))nd.win=mostPts(nd.books.map((b,s)=>nd.out[s]==='1'?-1:b.length));return nd;};
GAMES.fish={name:'صيد السمك',cat:'cards',lbc:'#1F6F8B',hide:{seat:['hands'],all:['dk']},
  icon:iconE('#2E8FB3','🎣'),
  init:n=>{let dk=shuffle(deck52());const k=n<=3?7:5;const hands=[],books=[];for(let s=0;s<n;s++){const [h,b]=fishBk(dk.slice(0,k).join(''));hands.push(h);books.push(b);dk=dk.slice(k);}return {hands,dk:dk.join(''),books,last:''};},
  // a player who left puts their cards back in the pile, so nobody waits on a book they hold
  onSkip(nd){let dk=nd.dk;const {kn,nh}=fishMem(nd);const hands=nd.hands.map((h,s)=>{if(nd.out[s]==='1'){kn[s]='';nh[s]='';if(h){dk+=h;return '';}}return h;});const r={...nd,hands,dk,kn,nh};return r.win!=null?r:fishEnd(r);},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',noTimer:false,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),points:d=>d.books.map(b=>b.length),
  winExtra:d=>'المجموعات: '+d.books.map((b,s)=>`${nm(d,s)} ${b.length}`).join('، '),
  // the table: every other player as a seat (cards held, books made; on your turn the seats are who you ask), and the pond
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;const nk=d.dk.length/2;
    const pond=`<div class="fpond"><div class="fstk ${nk?'':'none'}">${nk?cardHTML('??'):''}</div><small>باقي في المخزن ${nk}</small></div>`;
    const seat=(i,my,ts)=>{const n=d.hands[i].length/2,can=my&&ts.includes(i);const in_=`<b>${nm(d,i)}</b><span class="fbk">${'<i></i>'.repeat(Math.min(n,5))}<em>${n}</em></span><small>📚 ${d.books[i].length}</small>${((d.kn||[])[i]||'')?`<span class="fkn">عنده ${[...d.kn[i]].map(r=>`<b class="ltr">${RKN(r)}</b>`).join('')}</span>`:''}`;
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
    const {kn,nh}=fishMem(d),drop=(m,s,r)=>{m[s]=m[s].split(r).join('');},add=(m,s,r)=>{if(!m[s].includes(r))m[s]+=r;};
    const mkBooks=s=>{const [h,got]=fishBk(hands[s]);hands[s]=h;books[s]+=got;for(const r of got)drop(kn,s,r);if(!h)kn[s]='';return got;};
    if(a==='draw'){let last=`${nm(d,t)} مرّر`;if(dk.length){let c;[c,dk]=dkPick(dk);hands[t]+=c;nh[t]='';last=`${nm(d,t)} سحب ورقة`;mkBooks(t);}
      act(fishEnd({...d,hands,books,dk,kn,nh,turn:nextSeat(d,t),last}));return;}
    const r=RANKS[i],tg=S.tgt;if(tg==null||!cardsOf(hands[t]).some(c=>rk(c)===r))return;
    const th=cardsOf(hands[tg]);const got=th.filter(c=>rk(c)===r);let last,again=false;add(kn,t,r);add(nh,tg,r);drop(kn,tg,r);
    if(got.length){hands[tg]=th.filter(c=>rk(c)!==r).join('');hands[t]+=got.join('');nh[t]='';again=true;last=`${nm(d,t)} طلب ${RKN(r)} من ${nm(d,tg)} وأخذ ${got.length}`;}
    else{last=`${nm(d,t)} طلب ${RKN(r)} من ${nm(d,tg)}، روح اصطد! 🎣`;if(dk.length){let c;[c,dk]=dkPick(dk);hands[t]+=c;nh[t]='';if(rk(c)===r){again=true;last+=' وطلع له نفس الرقم';}}}
    const b=mkBooks(t);if(b)last+=`، وكمّل مجموعة ${[...b].map(RKN).join(' و')}`;
    act(fishEnd({...d,hands,books,dk,kn,nh,turn:again&&hands[t].length?t:nextSeat(d,t),last}));
  }
};
// the bots: the hard one remembers the table (who asked for what, who had nothing), so it asks where a card surely is and
// never repeats an ask that just failed; the easy one asks at random
GAMES.fish.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);if(!H.length)return botDo(d,s,'draw',0);
  const cnt={};H.forEach(c=>{cnt[rk(c)]=(cnt[rk(c)]||0)+1;});const myR=Object.keys(cnt);const kn=d.kn||[],nh=d.nh||[];
  const others=aliveSeats(d).filter(x=>x!==s&&d.hands[x].length);if(!others.length)return botDo(d,s,'draw',0);
  const mem=lv===3||(lv===2&&Math.random()<.6);let tg=null,r=null;
  if(mem){const sure=[];for(const o of others)for(const x of (kn[o]||''))if(cnt[x])sure.push([o,x,cnt[x]+Math.random()*.1]);
    if(sure.length){sure.sort((a,b)=>b[2]-a[2]);[tg,r]=sure[0];}}
  if(tg==null){if(lv===1&&Math.random()<.6){r=pickR(myR);tg=pickR(others);}
    else{const opts=[];for(const o of others)for(const x of myR){if(mem&&(nh[o]||'').includes(x))continue;opts.push([o,x,cnt[x]*2+d.hands[o].length/6+Math.random()]);}
      if(!opts.length)for(const o of others)for(const x of myR)opts.push([o,x,Math.random()]);
      opts.sort((a,b)=>b[2]-a[2]);[tg,r]=opts[0];}}
  S.tgt=tg;return botDo(d,s,'ask',RANKS.indexOf(r));};

/* ---------- 99 ---------- */
// an ace counts 1 or 11, a 10 takes off 10 or adds 10 (below 10 it can only add): the player picks (alt is the second way)
function v99(c,tot,alt){const r=c[0];if(r==='K')return 99;if(r==='4'||r==='9')return tot;if(r==='J'||r==='Q')return tot+10;
  if(r==='A')return tot+(alt?11:1);if(r==='T')return tot>=10&&!alt?tot-10:tot+10;return tot+(+r);}
const alt99=(c,tot)=>c[0]==='A'||(c[0]==='T'&&tot>=10);
const lab99=(c,tot,alt)=>c[0]==='K'?'= 99':c[0]==='4'?'عكس':c[0]==='9'?'+0':c[0]==='A'?(alt?'+11':'+1'):c[0]==='T'?(tot>=10&&!alt?'−10':'+10'):'+'+(c[0]==='J'||c[0]==='Q'?10:c[0]);
// up to four players everyone has two lives: who cannot play loses one and a fresh hand is dealt from a full deck
const lives99=n=>n<=4?2:1;
function deal99(d){let dk=shuffle(deck52(d.pl.length>5?2:1));const hands=d.pl.map((_,s)=>{if(d.out[s]==='1')return '';const h=dk.slice(0,3).join('');dk=dk.slice(3);return h;});return {hands,dk:dk.join('')};}
GAMES.n99={name:'لعبة 99',cat:'cards',lbc:'#5B2C6F',hide:{seat:['hands'],all:['dk']},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7D3C98"/><text x="50" y="64" font-size="40" font-weight="800" fill="#fff" text-anchor="middle">99</text></svg>`,
  init:n=>{let dk=shuffle(deck52(n>5?2:1));const hands=[];for(let s=0;s<n;s++){hands.push(dk.slice(0,3).join(''));dk=dk.slice(3);}return {hands,dk:dk.join(''),tot:0,dir:1,last:'',lv:Array(n).fill(lives99(n)),pc:0,lc:''};},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  // skipping the player on turn follows the current direction (a 4 may have reversed it)
  onSkip:(nd,d)=>d&&nd.win==null&&d.out[d.turn]!=='1'&&nd.out[d.turn]==='1'?{...nd,turn:uStep(nd,d.turn,1,nd.dir)}:nd,
  onTimeout:d=>{const t=d.turn;const h=cardsOf(d.hands[t]);const ok=h.map((c,i)=>v99(c,d.tot)<=99?i:-1).filter(i=>i>=0);return GAMES.n99.play(d,ok.length?ok[0]:-1);},
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  // the running total as a meter on the felt (green, then orange, then red near 99); beside it the direction, the pile and the
  // card just played (a new node each play, so it lands on the pile); the players with their lives under it
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;const hot=d.tot>89?'hot':d.tot>69?'warm':'';const nk=d.dk.length/2;const lv=d.lv||d.pl.map(()=>1);const L=Math.max(...lv,1)>1||lives99(d.pl.length)>1;
    let s=`<div class="gm gm-n99"><div class="mtab n9tab"><div class="n9m ${hot}"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="42" pathLength="100"/><circle class="fl" cx="50" cy="50" r="42" pathLength="100" style="stroke-dasharray:${Math.round(Math.min(99,d.tot)/99*1000)/10} 100"/></svg><b class="ltr" data-k="${d.tot}">${d.tot}</b><small>لا تتعدى 99</small></div>
    <div class="n9side"><div class="n9dir"><span>${d.dir>0?'↻':'↺'}</span><small>الدور</small></div><div class="n9pile">${d.lc?`<div class="n9last" data-k="c${d.pc}">${cardHTML(d.lc)}</div>`:''}</div><div class="fstk ${nk?'':'none'}">${nk?cardHTML('??'):''}</div></div></div>
    <div class="n9lv">${d.pl.map((_,o)=>`<span class="${o===d.turn&&d.win==null?'on':''} ${d.out[o]==='1'?'out':''}" style="--c:${col(d,o)}"><b>${nm(d,o)}</b>${L?`<em>${'❤'.repeat(lv[o])}${'<u>❤</u>'.repeat(Math.max(0,lives99(d.pl.length)-lv[o]))}</em>`:''}</span>`).join('')}</div>`;
    if(v<0||d.win!=null)return s+'</div>';const my=ctx.my&&d.turn===v;const h=cardsOf(d.hands[v]);
    // a card with two ways to play gets two small buttons under it; the card itself plays the first way
    s+=`<p class="lbl">أوراقك</p><div class="hand n9hand">${h.map((c,i)=>{const ok=v99(c,d.tot)<=99,two=my&&ok&&alt99(c,d.tot)&&v99(c,d.tot,1)<=99;
      return `<div class="n9c ${my&&!ok?'no':''}">${my&&ok?cardHTML(c,true,'pick" data-ga="m" data-i="'+i):cardHTML(c,true,my?'dim':'')}${two?`<span class="n9two"><button class="ltr" data-ga="m" data-i="${i}">${lab99(c,d.tot)}</button><button class="ltr" data-ga="alt" data-i="${i}">${lab99(c,d.tot,1)}</button></span>`:`<small class="ltr">${c[0]==='T'?'±10':c[0]==='A'?'+1 / +11':lab99(c,d.tot)}</small>`}</div>`;}).join('')}</div>`;
    s+=`<div class="legend"><span dir="ltr">K = 99</span><span dir="ltr">10 = −10 / +10</span><span dir="ltr">A = +1 / +11</span><span dir="ltr">J Q = +10</span><span dir="ltr">9 = +0</span><span>4 يعكس الدور</span></div>`;
    if(my&&!h.some(c=>v99(c,d.tot)<=99))s+=`<div class="acts"><button class="btn red" data-ga="m" data-i="-1">ما عندي ورقة 😵</button></div>`;
    return s+'</div>';},
  play(d,i,alt){const t=d.turn;const h=cardsOf(d.hands[t]);
    if(i<0){const lv=[...(d.lv||d.pl.map(()=>1))];lv[t]=Math.max(0,lv[t]-1);const out=lv[t]?d.out:setAt(d.out,t,'1');const al=aliveSeats(d,out);
      const nd={...d,lv,out,win:al.length===1?al[0]:null,turn:uStep(d,t,1,d.dir,out),last:lv[t]?`${nm(d,t)} ما عنده ورقة وخسر روح 💔، وتوزعت أوراق جديدة`:`${nm(d,t)} ما عنده ورقة وطلع 😵`};
      // with lives a new hand starts from 0 with a full deck, the next player first; without them the game goes on as it is
      if(nd.win==null&&lives99(d.pl.length)>1)return {...nd,...deal99(nd),tot:0,dir:1,lc:'',pc:(d.pc||0)+1,turn:uStep(d,t,1,1,out)};
      return nd;}
    alt=!!alt&&alt99(h[i],d.tot);const c=h.splice(i,1)[0];const tot=v99(c,d.tot,alt);let dk=d.dk;if(dk.length){let c2;[c2,dk]=dkPick(dk);h.push(c2);}
    const hands=[...d.hands];hands[t]=h.join('');const dir=c[0]==='4'?-d.dir:d.dir;
    return {...d,hands,dk,tot,dir,lc:c,pc:(d.pc||0)+1,turn:uStep(d,t,1,dir),last:`${nm(d,t)} نزّل ${RKN(c[0])}${'AT'.includes(c[0])?` (${lab99(c,d.tot,alt)})`:''} والمجموع ${tot}`};},
  click(a,i,d,ctx){if(!ctx.my)return;const h=cardsOf(d.hands[d.turn]);
    if(i>=0){const c=h[i],alt=a==='alt';if(!c||(alt&&!alt99(c,d.tot))||v99(c,d.tot,alt)>99)return;act(this.play(d,i,alt));return;}
    if(h.some(c=>v99(c,d.tot)<=99))return;act(this.play(d,-1));}
};
// the bots: the hard one weighs how likely the next player is stuck at the new total (three unknown cards) against
// spending its safe cards (K, 4, 9, 10), and otherwise keeps the total low
GAMES.n99.bot=(d,s,lv)=>{const H=cardsOf(d.hands[s]);const opts=[];
  H.forEach((c,i)=>{if(v99(c,d.tot)<=99)opts.push({i,alt:false,c,t:v99(c,d.tot)});if(alt99(c,d.tot)&&v99(c,d.tot,1)<=99)opts.push({i,alt:true,c,t:v99(c,d.tot,1)});});
  if(!opts.length)return GAMES.n99.play(d,-1);
  if(lvRand(lv)||(lv===1&&Math.random()<.4)){const o=pickR(opts);return GAMES.n99.play(d,o.i,o.alt);}
  const R13='A23456789TJQK',stuck=T=>Math.pow(1-[...R13].filter(r=>v99(r+'s',T)<=99).length/13,3);
  const cost={K:2.5,'4':1.4,'9':1.4,T:1.2,A:.3},w=lv===3?8:lv===2?3:0;
  const sc=o=>w*stuck(o.t)-(cost[o.c[0]]||0)-o.t/99*.8+Math.random()*(lv===3?.05:.4);
  const o=opts.map(o=>[o,sc(o)]).sort((a,b)=>b[1]-a[1])[0][0];return GAMES.n99.play(d,o.i,o.alt);};

// the three quiz games of this file render inside .gm.gm-<id>, so their question card can be styled without touching other quizzes
['prov','seq','stroop'].forEach(id=>{const G=GAMES[id],r=G.render;G.render=function(d,ctx){const h=r.call(this,d,ctx);return h?`<div class="gm gm-${id}">${h}</div>`:h;};});

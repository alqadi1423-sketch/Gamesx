'use strict';
/* backgammon (طاولة الزهر), full rules: opening roll, bar and entering, hitting, bearing off,
   using both dice when possible (or the larger one), doubles played four times, doubling cube, gammon and backgammon.
   With more than two players the seats make two teams that take turns (see tmSeats in chess.js). */

// pts[i] is point i+1: positive = side 0 checkers (moves 24 -> 1), negative = side 1 (moves 1 -> 24)
const TV0=(()=>{const p=Array(24).fill(0);p[23]=2;p[12]=5;p[7]=3;p[5]=5;p[0]=-2;p[11]=-5;p[16]=-3;p[18]=-5;return p;})();
const tvOwn=(v,s)=>s?v<0:v>0,tvCnt=v=>Math.abs(v);
function tvHomeAll(t,s){if(t.bar[s])return false;for(let i=0;i<24;i++){const v=t.pts[i];if(tvOwn(v,s)&&(s?i<18:i>5))return false;}return true;}
// one checker moved with one die: from 0 = bar, 1..24 = point; to 1..24 or 25 = borne off. null if illegal
function tvStep(t,s,from,die){
  if(t.bar[s]&&from!==0)return null;if(from===0&&!t.bar[s])return null;
  if(from>0&&!tvOwn(t.pts[from-1],s))return null;
  let to;if(from===0)to=s?die:25-die;else to=s?from+die:from-die;
  if(to>=1&&to<=24){const v=t.pts[to-1];if(tvOwn(v,1-s)&&tvCnt(v)>=2)return null;return to;}
  if(!tvHomeAll(t,s))return null;
  const exact=s?to===25:to===0;if(exact)return 25;
  // a higher die may bear off only the farthest checker
  for(let i=0;i<24;i++){const v=t.pts[i];if(!tvOwn(v,s))continue;const p=i+1;if(s?p<from:p>from)return null;}
  return 25;}
function tvMove(t,s,from,to){const pts=[...t.pts],bar=[...t.bar],off=[...t.off];let hit=false;const one=s?-1:1;
  if(from===0)bar[s]--;else pts[from-1]-=one;
  if(to===25)off[s]++;else{const v=pts[to-1];if(tvOwn(v,1-s)&&tvCnt(v)===1){pts[to-1]=0;bar[1-s]++;hit=true;}pts[to-1]+=one;}
  return {pts,bar,off,hit};}
function tvSingles(t,s,dice){const out=[];const seen=new Set();for(let k=0;k<dice.length;k++){const die=dice[k];if(seen.has(die))continue;seen.add(die);
  for(const from of t.bar[s]?[0]:[...Array(24).keys()].map(i=>i+1)){const to=tvStep(t,s,from,die);if(to!=null)out.push({from,to,die});}}return out;}
// longest number of dice that can be used from here
function tvDepth(t,s,dice,memo){if(!dice.length)return 0;const key=t.pts.join(',')+'|'+t.bar+'|'+dice.join('');if(memo.has(key))return memo.get(key);
  let best=0;for(const m of tvSingles(t,s,dice)){const nt=tvMove(t,s,m.from,m.to);const rest=[...dice];rest.splice(rest.indexOf(m.die),1);best=Math.max(best,1+tvDepth(nt,s,rest,memo));if(best===dice.length)break;}
  memo.set(key,best);return best;}
// single moves allowed now: they must keep the most dice playable, and with one die playable the larger one wins
function tvAllowed(t,s,dice){const memo=new Map();const mx=tvDepth(t,s,dice,memo);if(!mx)return [];
  let c=tvSingles(t,s,dice).filter(m=>{const nt=tvMove(t,s,m.from,m.to);const rest=[...dice];rest.splice(rest.indexOf(m.die),1);return 1+tvDepth(nt,s,rest,memo)===mx;});
  if(mx===1&&dice.length===2&&dice[0]!==dice[1]){const big=Math.max(...dice);if(c.some(m=>m.die===big))c=c.filter(m=>m.die===big);}
  return c;}
function tvNoMove(d,s,dice,why){const nd={...d,ph:'roll',dice,mv:[],sd:1-s,...tmPass(d,s),last:`${tmName(d,s)} رمى ${dice[0]} و${dice[1]}${why||' وما عنده حركة'}`};return nd;}
function tvRolled(d,dice){const s=d.sd;const mv=dice[0]===dice[1]?[dice[0],dice[0],dice[0],dice[0]]:[...dice];
  if(!tvAllowed(d,s,mv).length)return tvNoMove(d,s,dice);
  return {...d,ph:'move',dice,mv,last:`${tmName(d,s)} رمى ${dice[0]} و${dice[1]}`};}
function tvEnd(d,s){// side s bore off everything
  const l=1-s;let k=1,how='';if(!d.off[l]){k=2;how='مارس';const homeOfS=i=>s?i>=18:i<=5;
    if(d.bar[l]||d.pts.some((v,i)=>tvOwn(v,l)&&homeOfS(i))){k=3;how='مارس كبير';}}
  return {...d,...tmWin(d,s),wpts:k*d.cube,end:how,ph:'end'};}
function tvPlay(d,m){const s=d.sd;const t=tvMove(d,s,m.from,m.to);const mv=[...d.mv];mv.splice(mv.indexOf(m.die),1);
  let nd={...d,...t,mv,lm:[m.from,m.to]};
  if(t.off[s]===15)return tvEnd(nd,s);
  const left=mv.length?tvAllowed(nd,s,mv):[];
  if(!left.length)nd={...nd,ph:'roll',mv:[],sd:1-s,...tmPass(d,s)};
  nd.last=`${tmName(d,s)} لعب ${d.dice[0]} و${d.dice[1]}${t.hit?' وضرب حجر':''}`;
  return nd;}
function tvAuto(d){// used by the turn timer: acts only for the side that ran out of time, until its turn ends
  const me=d.ph==='dbl'?1-d.sd:d.sd;let x=d,guard=0;while(guard++<8&&x.win==null){
    if(x.ph==='open'){x=tvOpen(x,1+rnd(6));if(x.ph!=='move'||x.sd!==me)break;continue;}
    if(x.ph==='dbl'){x=tvAnswer(x,true);break;}
    if(x.sd!==me)break;
    if(x.ph==='roll'){x=tvRolled(x,[1+rnd(6),1+rnd(6)]);if(x.ph!=='move')break;continue;}
    if(x.ph==='move'){const a=tvAllowed(x,me,x.mv);if(!a.length)break;x=tvPlay(x,a[rnd(a.length)]);if(x.sd!==me)break;continue;}
    break;}
  return x;}
function tvOpen(d,r){const o=[...d.op];o[d.sd]=r;
  if(d.sd===0)return {...d,op:o,sd:1,turn:tmNow(d,1),last:`${tmName(d,0)} رمى ${r}`};
  if(o[0]===o[1])return {...d,op:[0,0],sd:0,turn:tmNow(d,0),last:`تعادل ${r} و${r}، ارموا مرة ثانية`};
  const s=o[0]>o[1]?0:1;const dice=[o[0],o[1]];
  const nd={...d,op:o,sd:s,turn:tmNow(d,s),ph:'move',dice,mv:dice,last:`${tmName(d,s)} يبدأ بـ ${o[0]} و${o[1]}`};
  return tvAllowed(nd,s,dice).length?nd:tvNoMove(nd,s,dice);}
function tvAnswer(d,take){const s=d.sd,o=1-s;// side o was asked
  if(!take)return {...d,...tmWin(d,s),wpts:d.cube,end:'drop',ph:'end',last:`${tmName(d,o)} رفض المضاعفة`};
  return {...d,cube:d.cube*2,own:o,ph:'roll',turn:tmNow(d,s),last:`${tmName(d,o)} قبل المضاعفة، صارت ${d.cube*2}`};}
GAMES.tavla={name:'طاولة الزهر',cat:'board',lbc:'#6B3D1F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A4A26"/><rect x="6" y="8" width="88" height="84" rx="4" fill="#E9CF9E"/><rect x="47" y="8" width="6" height="84" fill="#7A4A26"/>${[0,1,2].map(k=>`<path d="M${9+k*13} 10l6 34 6-34z" fill="${k%2?'#2D4763':'#C9473E'}"/><path d="M${56+k*13} 90l6-34 6 34z" fill="${k%2?'#C9473E':'#2D4763'}"/>`).join('')}<circle cx="70" cy="30" r="8" fill="#fff" stroke="#2D4763" stroke-width="2"/><circle cx="30" cy="70" r="8" fill="#2D4763"/></svg>`,
  init:()=>({pts:[...TV0],bar:[0,0],off:[0,0],sd:0,tr:[0,0],ph:'open',op:[0,0],dice:[0,0],mv:[],cube:1,own:-1,lm:null,last:''}),
  start:d=>({...d,turn:0}),// white (seat 0) always rolls the first opening die
  onSkip(nd,d){const x=tmSkip(nd,d);return x.win!=null?{...x,ph:'end',wpts:x.cube}:x;},
  onTimeout:d=>tvAuto(d),
  points:d=>d.pl.map((_,s)=>`${s%2?'⚫':'⚪'} برّا ${d.off[s%2]}`),
  winText(d){const side=d.win%2;const nm2=side?'الأسود':'الأبيض';const x=d.wpts||1;
    return d.end==='drop'?`فاز ${nm2}، الخصم رفض المضاعفة`:d.end==='left'?`فاز ${nm2}، الخصم طلع`:`فاز ${nm2}${d.end?' '+d.end:''}${x>1?` (${x} نقاط)`:''}`;},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';const me=!ctx.local&&d.turn===ctx.v;
    const who=me?'<b class="yt">دورك</b>':`دور ${tmName(d,d.sd)}`;const side=`<span class="chside ${d.sd?'bk':''}">${d.sd?'الأسود':'الأبيض'}</span>`;
    if(d.ph==='open')s+=`${who} ${side}: ارمِ زهرة وحدة، الأعلى يبدأ`;
    else if(d.ph==='dbl')s+=`${me?'<b class="yt">دورك</b>':`دور ${tmName(d,1-d.sd)}`}: ${tmName(d,d.sd)} يبي يضاعف إلى ${d.cube*2}`;
    else if(d.ph==='roll')s+=`${who} ${side}: ارمِ الزهر`;
    else s+=`${who} ${side}: باقي ${d.mv.join(' و')}${d.bar[d.sd]?' • لازم تدخّل حجرك المضروب أول':''}`;
    if(d.cube>1)s+=` <span class="tvcube">×${d.cube}</span>`;return s;},
  render(d,ctx){const s=d.sd,my=ctx.my,flip=!ctx.local&&tmMySide(d,ctx)===1;
    const asked=d.ph==='dbl';const myAct=asked?(ctx.local||(ctx.v>=0&&ctx.v===tmNow(d,1-s))):my;
    const k=d.pts.join(',')+d.bar+d.mv.join('');const al=d.ph==='move'&&my?tvAllowed(d,s,d.mv):[];
    const sel=S.tv&&S.tv.k===k?S.tv.f:null;const dests=new Set(al.filter(m=>m.from===sel).map(m=>m.to));const srcs=new Set(al.map(m=>m.from));
    let h=tvBoard(d,flip,srcs,sel,dests,my);
    // dice and actions
    h+='<div class="tvbar">';
    if(d.ph==='open'){h+=`<div class="tvop">${[0,1].map(x=>`<div><small>${x?'الأسود':'الأبيض'}</small>${tapDie(d.op[x]||6,my&&s===x,COLS[d.pl[tmNow(d,x)]],'tvs','open')}</div>`).join('')}</div>`;}
    else if(d.ph==='roll'){h+=`${tapDie(d.dice[0]||6,my,col(d,d.turn))}${tapDie(d.dice[1]||6,my,col(d,d.turn))}`;
      if(my&&(d.own===-1||d.own===s)&&d.cube<64)h+=`<button class="btn" data-ga="dbl">ضاعف إلى ${d.cube*2}</button>`;}
    else if(d.ph==='move'){const used=d.dice[0]===d.dice[1]?4-d.mv.length:2-d.mv.length;
      h+=(d.dice[0]===d.dice[1]?[0,1,2,3]:[0,1]).map(j=>`<div class="tapd ${j<used?'used':''}" style="--c:${col(d,d.turn)}">${diceSVG(d.dice[d.dice[0]===d.dice[1]?0:j])}</div>`).join('');}
    else if(d.ph==='dbl'&&myAct)h+=`<button class="btn green" data-ga="take">أقبل (×${d.cube*2})</button><button class="btn" data-ga="drop">أرفض وأخسر ${d.cube}</button>`;
    h+='</div>';
    return h;},
  click(a,i,d,ctx){const s=d.sd;
    if(a==='take'||a==='drop'){if(d.ph!=='dbl')return;if(!ctx.local&&ctx.v!==tmNow(d,1-s))return;act(tvAnswer(d,a==='take'));return;}
    if(!ctx.my)return;
    if(a==='open'&&d.ph==='open'){act(tvOpen(d,1+rnd(6)));return;}
    if(a==='roll'&&d.ph==='roll'){S.tv=null;act(tvRolled(d,[1+rnd(6),1+rnd(6)]));return;}
    if(a==='dbl'&&d.ph==='roll'&&(d.own===-1||d.own===s)){act({...d,ph:'dbl',turn:tmNow(d,1-s),last:`${tmName(d,s)} طلب مضاعفة`});return;}
    if(a!=='pt'||d.ph!=='move')return;const k=d.pts.join(',')+d.bar+d.mv.join('');const al=tvAllowed(d,s,d.mv);
    const sel=S.tv&&S.tv.k===k?S.tv.f:null;
    if(sel!=null){const ms=al.filter(m=>m.from===sel&&m.to===i);if(ms.length){const m=ms.reduce((x,y)=>y.die<x.die?y:x);S.tv=null;act(tvPlay(d,m));return;}}
    S.tv=al.some(m=>m.from===i)&&sel!==i?{k,f:i}:null;
    // one tap is enough when the checker has a single destination
    if(S.tv){const ds=[...new Set(al.filter(m=>m.from===i).map(m=>m.to))];if(ds.length===1){const m=al.filter(m=>m.from===i&&m.to===ds[0]).reduce((x,y)=>y.die<x.die?y:x);S.tv=null;act(tvPlay(d,m));return;}}
    render();}
};
// the board as SVG. Side 0 sees its home at the bottom right; side 1 sees the mirror so its home is there too
function tvBoard(d,flip,srcs,sel,dests,my){
  const W=340,H=280,PW=24,TH=112,L=6,BAR=20,OFF=26,TOP=8;
  const view=p=>flip?25-p:p;// displayed point number
  const xOf=q=>{// q displayed point 1..24
    const bottom=q<=12;const k=bottom?12-q:q-13;const half=k<6?0:1;return L+k*PW+half*BAR;};
  const C=['#F4F0E6','#2D4763'];const stroke=['#2D4763','#fff'];
  let g=`<svg viewBox="0 0 ${W} ${H}" class="tvb"><rect width="${W}" height="${H}" rx="12" fill="#7A4A26"/><rect x="${L-2}" y="${TOP-2}" width="${12*PW+BAR+4}" height="${H-2*TOP+4}" rx="6" fill="#E9CF9E"/>`;
  g+=`<rect x="${L+6*PW}" y="${TOP-2}" width="${BAR}" height="${H-2*TOP+4}" fill="#7A4A26"/>`;
  const offX=L+12*PW+BAR+8;g+=`<rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="#5C3519"/>`;
  for(let q=1;q<=24;q++){const x=xOf(q),bottom=q<=12,y0=bottom?H-TOP:TOP,y1=bottom?H-TOP-TH:TOP+TH;
    g+=`<path d="M${x} ${y0}L${x+PW/2} ${y1}L${x+PW} ${y0}Z" fill="${q%2?'#C9473E':'#3F6E8F'}" opacity=".9"/>`;}
  // checkers
  const chk=(cx,cy,side,n,hl)=>`<circle cx="${cx}" cy="${cy}" r="10.5" fill="${C[side]}" stroke="${hl?'#ffd84d':stroke[side]}" stroke-width="${hl?3.2:1.6}"/>${n?`<text x="${cx}" y="${cy+4.5}" font-size="12" font-weight="800" text-anchor="middle" fill="${stroke[side]}">${n}</text>`:''}`;
  for(let p=1;p<=24;p++){const v=d.pts[p-1];if(!v)continue;const side=v>0?0:1,n=Math.abs(v),q=view(p),x=xOf(q)+PW/2,bottom=q<=12;
    const shown=Math.min(n,5);for(let j=0;j<shown;j++){const cy=bottom?H-TOP-11-j*21:TOP+11+j*21;g+=chk(x,cy,side,j===shown-1&&n>5?n:0,sel===p&&j===shown-1);}}
  // bar: side 0 checkers sit low, side 1 high (mirrored for side 1 viewers)
  const bx=L+6*PW+BAR/2;for(const side of [0,1]){const n=d.bar[side];if(!n)continue;const low=(side===0)!==flip;
    for(let j=0;j<Math.min(n,3);j++){const cy=low?H/2+22+j*21:H/2-22-j*21;g+=chk(bx,cy,side,j===Math.min(n,3)-1&&n>1?n:0,sel===0&&side===d.sd);}}
  // borne off
  for(const side of [0,1]){const n=d.off[side];if(!n)continue;const low=(side===0)!==flip;const ox=offX+(OFF-6)/2;
    for(let j=0;j<n;j++){const y=low?H-TOP-6-j*7:TOP+2+j*7;g+=`<rect x="${ox-9}" y="${y}" width="18" height="5" rx="2" fill="${C[side]}" stroke="${stroke[side]}" stroke-width=".8"/>`;}}
  // what can be tapped
  if(my){for(const p of srcs){if(p===0){g+=`<rect x="${L+6*PW}" y="${TOP}" width="${BAR}" height="${H-2*TOP}" fill="#ffd84d" opacity=".25" data-ga="pt" data-i="0"/>`;continue;}
      const q=view(p),x=xOf(q),bottom=q<=12;g+=`<rect x="${x}" y="${bottom?H/2:TOP}" width="${PW}" height="${H/2-TOP}" fill="#ffd84d" opacity="${sel===p?.35:.14}" data-ga="pt" data-i="${p}"/>`;}
    for(const p of dests){if(p===25){g+=`<rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="#4CB97F" opacity=".75" data-ga="pt" data-i="25"/>`;continue;}
      const q=view(p),x=xOf(q),bottom=q<=12;g+=`<rect x="${x}" y="${bottom?H/2:TOP}" width="${PW}" height="${H/2-TOP}" fill="#4CB97F" opacity=".35" data-ga="pt" data-i="${p}"/><circle cx="${x+PW/2}" cy="${bottom?H/2+16:H/2-16}" r="5" fill="#4CB97F" data-ga="pt" data-i="${p}"/>`;}}
  if(d.lm){const [f,t]=d.lm;if(t>=1&&t<=24){const q=view(t),x=xOf(q),bottom=q<=12;g+=`<path d="M${x+3} ${bottom?H-TOP+1:TOP-1}h${PW-6}" stroke="#ffd84d" stroke-width="3"/>`;}}
  return g+'</svg>';}

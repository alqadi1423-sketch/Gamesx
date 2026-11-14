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
  let nd={...d,...t,mv,lm:[m.from,m.to,s]};
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
GAMES.tavla={teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,name:'طاولة الزهر',cat:'board',lbc:'#6B3D1F',
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
      h+=(d.dice[0]===d.dice[1]?[0,1,2,3]:[0,1]).map(j=>`<div class="tapd ${j<used?'used':''} ${used?'':'roll'}" style="--c:${col(d,d.turn)}">${diceSVG(d.dice[d.dice[0]===d.dice[1]?0:j])}</div>`).join('');}
    else if(d.ph==='dbl'&&myAct)h+=`<button class="btn green" data-ga="take">أقبل (×${d.cube*2})</button><button class="btn" data-ga="drop">أرفض وأخسر ${d.cube}</button>`;
    h+='</div>';
    return h;},
  // the checker that just moved slides from where it stood; a checker it hit flies to the bar
  after(d,ctx){const k=d.gid+':'+d.pts.join(',')+':'+d.bar+':'+d.off;if(S.tvFx===k)return;S.tvFx=k;const L=d.lm;if(!L||L[2]==null||bdStill())return;
    const svg=app.querySelector('svg.tvb');if(!svg)return;const flip=!ctx.local&&tmMySide(d,ctx)===1,[f,t,s]=L;
    const own=p=>p>=1&&p<=24&&tvOwn(d.pts[p-1],s)?tvCnt(d.pts[p-1]):0;
    const fly=(el,a,b)=>{if(!el||!el.animate)return;try{el.animate([{transform:`translate(${(a[0]-b[0]).toFixed(1)}px,${(a[1]-b[1]).toFixed(1)}px)`},{transform:'none'}],{duration:300,easing:'cubic-bezier(.3,.75,.35,1)'});}catch(e){}};
    const to=t===25?tvXY(flip,25,s,d.off[s]-1):tvXY(flip,t,s,own(t)-1),from=f===0?tvXY(flip,0,s,d.bar[s]):tvXY(flip,f,s,own(f));
    fly(svg.querySelector(`[data-q="${t===25?'o'+s:t}"]`),from,to);
    if(d.hit&&t<25)fly(svg.querySelector(`[data-q="b${1-s}"]`),tvXY(flip,t,1-s,0),tvXY(flip,0,1-s,d.bar[1-s]-1));},
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
// where the j-th checker of `side` sits at a place (1..24 a point, 0 the bar, 25 borne off), in board units (same layout as tvBoard)
function tvXY(flip,p,side,j){const H=280,PW=24,L=6,BAR=20,OFF=26,TOP=8,CR=10.5,fw=6*PW,offX=L+12*PW+BAR+8;j=Math.max(0,j);
  if(p===0){const low=(side===0)!==flip;j=Math.min(j,2);return [L+fw+BAR/2,low?H/2+24+j*21:H/2-24-j*21];}
  if(p===25){const low=(side===0)!==flip;return [offX+(OFF-6)/2,(low?H-TOP-6-j*7:TOP+2+j*7)+2.7];}
  const q=flip?25-p:p,bottom=q<=12,k=bottom?12-q:q-13;j=Math.min(j,4);
  return [L+k*PW+(k<6?0:BAR)+PW/2,bottom?H-TOP-CR-.5-j*21:TOP+CR+.5+j*21];}
// the board as SVG. Side 0 sees its home at the bottom right; side 1 sees the mirror so its home is there too
function tvBoard(d,flip,srcs,sel,dests,my){
  const W=340,H=280,PW=24,TH=112,L=6,BAR=20,OFF=26,TOP=8,CR=10.5;
  const view=p=>flip?25-p:p;// displayed point number
  const xOf=q=>{// q displayed point 1..24
    const bottom=q<=12;const k=bottom?12-q:q-13;const half=k<6?0:1;return L+k*PW+half*BAR;};
  const stroke=['#6E5A3E','#0E151F'],ink=['#2D4763','#F4F0E6'];
  const sy=(bottom,j)=>bottom?H-TOP-CR-.5-j*21:TOP+CR+.5+j*21;// centre of the j-th checker of a stack
  let g=`<svg viewBox="0 0 ${W} ${H}" class="tvb bd-tv"><defs>`+
    `<linearGradient id="tvw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5530"/><stop offset=".5" stop-color="#6E3F20"/><stop offset="1" stop-color="#5A3218"/></linearGradient>`+
    `<linearGradient id="tvf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2DDB4"/><stop offset="1" stop-color="#E2C48F"/></linearGradient>`+
    `<linearGradient id="tvr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D2564B"/><stop offset=".5" stop-color="#B93E35"/><stop offset="1" stop-color="#A3352D"/></linearGradient>`+
    `<linearGradient id="tvn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#47698A"/><stop offset=".5" stop-color="#34536F"/><stop offset="1" stop-color="#2A455D"/></linearGradient>`+
    `<radialGradient id="tvc0" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F1EADB"/><stop offset="1" stop-color="#CDBF9F"/></radialGradient>`+
    `<radialGradient id="tvc1" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#5D7491"/><stop offset=".55" stop-color="#2D4058"/><stop offset="1" stop-color="#18222F"/></radialGradient></defs>`;
  // frame, the two fields, the bar and the tray
  const fw=6*PW,offX=L+12*PW+BAR+8;
  g+=`<rect width="${W}" height="${H}" rx="12" fill="url(#tvw)"/><rect x="1.5" y="1.5" width="${W-3}" height="${H-3}" rx="11" fill="none" stroke="rgba(255,255,255,.14)"/>`;
  for(const x of [L,L+fw+BAR])g+=`<rect x="${x}" y="${TOP}" width="${fw}" height="${H-2*TOP}" rx="3" fill="url(#tvf)"/><rect x="${x}" y="${TOP}" width="${fw}" height="${H-2*TOP}" rx="3" fill="none" stroke="rgba(60,30,10,.35)" stroke-width="1.2"/>`;
  g+=`<rect x="${L+fw+3}" y="${TOP}" width="${BAR-6}" height="${H-2*TOP}" rx="3" fill="rgba(0,0,0,.18)"/><rect x="${L+fw+BAR/2-3}" y="${H/2-16}" width="6" height="10" rx="1.5" fill="#C9A15B" opacity=".8"/><rect x="${L+fw+BAR/2-3}" y="${H/2+6}" width="6" height="10" rx="1.5" fill="#C9A15B" opacity=".8"/>`;
  g+=`<rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="#4A2913"/><rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><path d="M${offX+3} ${H/2}h${OFF-12}" stroke="rgba(255,255,255,.12)"/>`;
  for(let q=1;q<=24;q++){const x=xOf(q),bottom=q<=12,y0=bottom?H-TOP:TOP,y1=bottom?H-TOP-TH:TOP+TH;
    g+=`<path d="M${x+.8} ${y0}L${x+PW/2} ${y1}L${x+PW-.8} ${y0}Z" fill="url(#${q%2?'tvr':'tvn'})"/>`;}
  // a checker: drop shadow, glossy body, the turned rim and its count
  const chk=(cx,cy,side,n,cls,q)=>`<g class="tvk ${cls||''}"${q!=null?` data-q="${q}"`:''}><circle cx="${cx}" cy="${cy+1.6}" r="${CR}" fill="rgba(0,0,0,.28)"/><circle cx="${cx}" cy="${cy}" r="${CR}" fill="url(#tvc${side})" stroke="${stroke[side]}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${CR-3.4}" fill="none" stroke="${side?'rgba(255,255,255,.16)':'rgba(110,90,62,.32)'}" stroke-width="1.2"/>${n?`<text x="${cx}" y="${cy+4.3}" font-size="12" font-weight="800" text-anchor="middle" fill="${ink[side]}">${n}</text>`:''}</g>`;
  const lmTo=d.lm?d.lm[1]:null,lmFrom=d.lm?d.lm[0]:null;
  for(let p=1;p<=24;p++){const v=d.pts[p-1];if(!v)continue;const side=v>0?0:1,n=Math.abs(v),q=view(p),x=xOf(q)+PW/2,bottom=q<=12;
    const shown=Math.min(n,5);for(let j=0;j<shown;j++){const top=j===shown-1;
      const cls=top?(sel===p?'sel':my&&srcs.has(p)&&sel==null?'mv':lmTo===p?'lmc':''):'';g+=chk(x,sy(bottom,j),side,top&&n>5?n:0,cls,top?p:null);}}
  // bar: side 0 checkers sit low, side 1 high (mirrored for side 1 viewers)
  const bx=L+fw+BAR/2;for(const side of [0,1]){const n=d.bar[side];if(!n)continue;const low=(side===0)!==flip;
    for(let j=0;j<Math.min(n,3);j++){const top=j===Math.min(n,3)-1,cy=low?H/2+24+j*21:H/2-24-j*21;
      g+=chk(bx,cy,side,top&&n>1?n:0,top&&side===d.sd?(sel===0?'sel':my&&srcs.has(0)&&sel==null?'mv':''):'',top?'b'+side:null);}}
  // borne off: chips seen from the side, stacked in the tray
  for(const side of [0,1]){const n=d.off[side];if(!n)continue;const low=(side===0)!==flip;const ox=offX+(OFF-6)/2;
    for(let j=0;j<n;j++){const y=low?H-TOP-6-j*7:TOP+2+j*7;g+=`<rect ${j===n-1?`data-q="o${side}" `:''}x="${ox-8.5}" y="${y}" width="17" height="5.4" rx="2.2" fill="url(#tvc${side})" stroke="${stroke[side]}" stroke-width=".8"/>`;}}
  // doubling cube: in the middle of the tray until someone owns it, then on the owner's side
  {const own=d.own,cy=own<0?H/2:((own===0)!==flip?H/2+30:H/2-30),cx=offX+(OFF-6)/2,v=d.cube>1?d.cube:64;
    g+=`<g class="tvcb"><rect x="${cx-9}" y="${cy-7.5}" width="18" height="18" rx="4" fill="rgba(0,0,0,.35)"/><rect x="${cx-9}" y="${cy-9}" width="18" height="18" rx="4" fill="#FBF7EE" stroke="#8B6B43" stroke-width="1"/><text x="${cx}" y="${cy+(v>9?3.4:4.2)}" font-size="${v>9?9.5:12}" font-weight="900" text-anchor="middle" fill="#2D4763">${v}</text></g>`;}
  // last move: a faint ring where the checker came from
  if(lmFrom>=1&&lmFrom<=24&&!d.pts[lmFrom-1]){const q=view(lmFrom),bottom=q<=12;g+=`<circle cx="${xOf(q)+PW/2}" cy="${sy(bottom,0)}" r="${CR-1}" fill="none" stroke="#F0B429" stroke-width="1.6" stroke-dasharray="3 2.4" opacity=".75"/>`;}
  // what can be tapped: the whole half-column of a point, the bar or the tray
  if(my){for(const p of srcs){if(p===0){g+=`<rect x="${L+fw}" y="${TOP}" width="${BAR}" height="${H-2*TOP}" fill="#FFD84D" opacity="${sel===0?.22:.1}" class="tvhit" data-ga="pt" data-i="0"/>`;continue;}
      const q=view(p),x=xOf(q),bottom=q<=12;g+=`<rect x="${x}" y="${bottom?H/2:TOP}" width="${PW}" height="${H/2-TOP}" fill="#FFD84D" opacity="${sel===p?.22:.07}" class="tvhit" data-ga="pt" data-i="${p}"/>`;}
    for(const p of dests){if(p===25){g+=`<rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="#4CB97F" opacity=".55" class="tvhit tvto" data-ga="pt" data-i="25"/>`;continue;}
      const q=view(p),x=xOf(q),bottom=q<=12,v=d.pts[p-1],j=tvOwn(v,d.sd)?Math.min(tvCnt(v),4):0;
      g+=`<rect x="${x}" y="${bottom?H/2:TOP}" width="${PW}" height="${H/2-TOP}" fill="#4CB97F" opacity=".16" class="tvhit" data-ga="pt" data-i="${p}"/><circle cx="${x+PW/2}" cy="${sy(bottom,j)}" r="${CR-.5}" fill="#4CB97F" fill-opacity=".45" stroke="#fff" stroke-width="1.6" stroke-dasharray="3.2 2.2" class="tvgh" data-ga="pt" data-i="${p}"/>`;}}
  return g+'</svg>';}

/* ---------- backgammon bot: it plans the whole roll (every order of the dice), then judges where the checkers end up:
   the race, made points and primes, blots by how many of the 36 rolls hit them, and checkers on the bar.
   Easy moves one checker at a time and often carelessly; medium plans the roll but worries less about blots ---------- */
const TVR=(()=>{const r=[];for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)r.push(a===b?[a,2*a,3*a,4*a]:[a,b,a+b]);return r;})();
function tvPips(t,s){let p=t.bar[s]*25;for(let i=0;i<24;i++)if(tvOwn(t.pts[i],s))p+=tvCnt(t.pts[i])*(s?24-i:i+1);return p;}
// side s still has to pass the other side's checkers
function tvContact(t){if(t.bar[0]||t.bar[1])return true;let lo1=99,hi0=-1;for(let i=0;i<24;i++){if(t.pts[i]>0)hi0=Math.max(hi0,i);if(t.pts[i]<0)lo1=Math.min(lo1,i);}return lo1<hi0;}
function tvJudge(t,s,lv){const o=1-s,me=tvPips(t,s),op=tvPips(t,o);let v=op-me+t.off[s]*2-t.off[o]*2;
  if(!tvContact(t))return v;
  const home=(x,i)=>x?i>=18:i<=5,made=x=>{let n=0;for(let i=0;i<24;i++)if(home(x,i)&&tvOwn(t.pts[i],x)&&tvCnt(t.pts[i])>=2)n++;return n;};
  const myHome=made(s),opHome=made(o);
  // made points, the home board and long walls (primes)
  let run=0,best=0;for(let k=0;k<24;k++){const i=s?23-k:k,x=t.pts[i],n=tvOwn(x,s)?tvCnt(x):0;
    if(n>=2){v+=3+(home(s,i)?4:0);run++;best=Math.max(best,run);}else run=0;if(n>5)v-=(n-5)*2;
    // a point held deep in the other home is an anchor
    if(n>=2&&home(o,i))v+=4;}
  if(best>=3)v+=(best-2)*(best-2)*4;
  // the other side on the bar against a strong home board
  v+=t.bar[o]*(4+myHome*3)-t.bar[s]*(2+opHome*3);
  // blots: the share of the 36 rolls that hit them, times what they would lose
  const wt=lv===3?1:.45;const src=[];for(let i=0;i<24;i++)if(tvOwn(t.pts[i],o))src.push(i+1);
  for(let i=0;i<24;i++){if(!(tvOwn(t.pts[i],s)&&tvCnt(t.pts[i])===1))continue;const p=i+1;
    const ds=src.map(q=>s?p-q:q-p).filter(x=>x>0&&x<=24);if(t.bar[o])ds.push(s?p:25-p);if(!ds.length)continue;
    let hits=0;for(const r of TVR)if(r.some(x=>ds.includes(x)))hits++;
    v-=wt*hits/36*((s?p:25-p)+10)*(1+opHome*.15);}
  return v;}
// every way to play the whole roll: the end positions (one per distinct board) and the first single move that leads there
function tvPlans(d,s){const out=new Map();
  const rec=(t,dice,first,dep)=>{const al=dice.length?tvAllowed(t,s,dice):[];
    if(!al.length||dep>=4){const k=t.pts.join(',')+'|'+t.bar+'|'+t.off;if(!out.has(k))out.set(k,{t,first});return;}
    const seen=new Set();for(const m of al){const sk=m.from+':'+m.die;if(seen.has(sk))continue;seen.add(sk);
      const nt=tvMove(t,s,m.from,m.to),rest=[...dice];rest.splice(rest.indexOf(m.die),1);rec(nt,rest,first||m,dep+1);}};
  rec({pts:d.pts,bar:d.bar,off:d.off},d.mv,null,0);return [...out.values()].filter(x=>x.first);}
// how likely side s wins from here, roughly (a lead of about a tenth of the race is a good double)
const tvWinP=(t,s,lv)=>{const sc=8+(tvPips(t,0)+tvPips(t,1))/14;return 1/(1+Math.exp(-tvJudge(t,s,lv)/sc));};
GAMES.tavla.bot=(d,s,lv)=>{const side=d.sd;
  if(d.ph==='open')return tvOpen(d,1+rnd(6));
  if(d.ph==='dbl'){const p=tvWinP(d,1-side,3);return tvAnswer(d,lv===1?Math.random()<.85:p>(lv===3?.24:.3));}
  if(d.ph==='roll'){const p=tvWinP(d,side,3);
    if(lv>1&&(d.own===-1||d.own===side)&&d.cube<16&&p>(lv===3?.7:.76)&&p<.94&&(lv===3||Math.random()<.5))return {...d,ph:'dbl',turn:tmNow(d,1-side),last:`${tmName(d,side)} طلب مضاعفة`};
    return tvRolled(d,[1+rnd(6),1+rnd(6)]);}
  if(d.ph==='move'){const al=tvAllowed(d,side,d.mv);if(!al.length)return tvAuto(d);
    if(lv===1){if(Math.random()<.4)return tvPlay(d,pickR(al));let best=al[0],bv=-1e9;
      for(const m of al){const t=tvMove(d,side,m.from,m.to);const v=tvPips(d,side)-tvPips(t,side)+(t.hit?10:0)+(tvCnt(t.pts[m.to-1]||0)>=2?4:0)+Math.random()*6;if(v>bv){bv=v;best=m;}}return tvPlay(d,best);}
    // the plan made for this roll stays while the board is the one it expected
    const k=d.gid+':'+d.pts.join(',')+'|'+d.bar+'|'+d.mv.join('');const P=S.tvPlan;
    if(P&&P.k===k){const m=al.find(x=>x.from===P.m.from&&x.to===P.m.to&&x.die===P.m.die);if(m)return tvPlay(d,m);}
    const ns=lv===3?.5:4;let best=null,bv=-1e9;for(const x of tvPlans(d,side)){const v=tvJudge(x.t,side,lv)+Math.random()*ns;if(v>bv){bv=v;best=x;}}
    if(!best)return tvPlay(d,al[0]);const m=best.first;const nd=tvPlay(d,m);
    // the rest of the plan: replayed from the board after this move
    S.tvPlan=null;if(nd.ph==='move'&&nd.sd===side){const rest=tvPlans(nd,side).find(x=>x.t.pts.join(',')===best.t.pts.join(',')&&x.t.bar+''===best.t.bar+''&&x.t.off+''===best.t.off+'');
      if(rest)S.tvPlan={k:nd.gid+':'+nd.pts.join(',')+'|'+nd.bar+'|'+nd.mv.join(''),m:rest.first};}
    return nd;}
  return tvAuto(d);};
GAMES.tavla.botDelay=(d,s,lv)=>d.ph==='move'?450+rnd(300):700+rnd(500);

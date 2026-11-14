'use strict';
/* =====================================================================================================
   «غميضة الحارة» (hide): the owner's own design. Street hide-and-seek on a 4×4 neighbourhood, all in turns and taps.
   One seat seeks («الغمّاض», the next seat next round), the others hide in secret, one hider per place.
   Each turn: the seeker secretly searches a place or guards the house; then the hiders still hidden secretly stay or
   run home; then all is revealed. Runners reach the house (+20) unless the house was guarded (caught, −15). A hider found
   in the searched place is caught (seeker +15, hider −15). An empty search gives a public hot/cold hint about the nearest
   hider still hidden (Chebyshev distance 1/2/3). Once per game the seeker may «اسمع» a 2×2 square (public yes/no).
   Searches: min(12, 6 + hiders). The game lasts 3 minutes, every step 15 seconds, hiding 25 seconds.
   Points move with d.dsc at the round's end (the engine floors totals at 0); d.pd shows them live during the round.

   Secrets online: d.at (every hider's place) is masked per seat: a hider sees their own, with 4+ players also their
   team-mates' (the hiders are one team), a caught hider's place is public; the seeker sees none. d.ch (the seeker's
   choice this turn) is the seeker's alone until the reveal. d.tk (the place a colliding hider learnt is taken) is the
   colliding hider's alone. Picks (places, stay/run) travel as private picks of a simultaneous round.
   ===================================================================================================== */
const HD_T={hide:25000,step:15000,game:180000};
const HDN=['سطح','حوش','ورا السيارة','برميل','بقالة','دكان','صندوق','بيت مهجور','مزرعة','استراحة','خزان','تحت الدرج','مخزن','ورا التريلة','حديقة','ورا الباب'];
const HDH=['','حار','دافي','بارد'];
const HDHE=['','🔥','🌤','❄️'];
const hdDist=(a,b)=>Math.max(Math.abs((a>>2)-(b>>2)),Math.abs((a&3)-(b&3)));
// the 9 squares of 2×2 places, by their top-right place (row r, column c in reading order)
const hdSq=k=>{const p=Math.floor(k/3)*4+k%3;return [p,p+1,p+4,p+5];};
const hdMaxN=n=>Math.min(12,6+(n-1));
const hdFmt=ms=>{const t=Math.ceil(Math.max(0,ms)/1000);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const hdClock=d=>d.end>0?Math.max(0,d.end-Date.now()):Math.max(0,d.gl);
const hdHidden=d=>d.pl.map((_,s)=>s).filter(s=>s!==d.sk&&d.hs[s]==='h');
const hdLocal=()=>S.mode==='local';

/* ---------- the little drawings of the neighbourhood (40×40 each, a few shapes) ---------- */
const HDI=[
  // سطح: a roof with its parapet, a dish and the moon
  '<path d="M3 31h34v6H3z" fill="#B97A43"/><path d="M5 19h30v12H5z" fill="#EBC995"/><path d="M5 15h5v4H5zm8.3 0h5v4h-5zm8.4 0h5v4h-5zm8.3 0h5v4h-5z" fill="#C98B4E"/><path d="M9 25h7v6H9z" fill="#8A5A2B"/><path d="M27 13a5 5 0 0 1 7-6" stroke="#9AA5B1" stroke-width="2.4" fill="none"/><circle cx="33" cy="6" r="3" fill="#F7D774"/>',
  // حوش: a courtyard wall with an arched gate and a tree over it
  '<circle cx="29" cy="11" r="7" fill="#5DAA5A"/><path d="M3 15h34v22H3z" fill="#E2B57A"/><path d="M3 15h34v3H3z" fill="#C98B4E"/><path d="M14 37V26a6 6 0 0 1 12 0v11z" fill="#6E4524"/><path d="M20 26v11" stroke="#8A5A2B" stroke-width="1.5"/>',
  // ورا السيارة: a red car
  '<path d="M3 29v-7l6-8h19l7 8h2v7z" fill="#E5534B"/><path d="M11 16h7v6H8zm10 0h5.5l4.5 6H21z" fill="#CFEAF8"/><path d="M3 25h34" stroke="#B83A33" stroke-width="1.5"/><circle cx="11" cy="30" r="4.2" fill="#2D3640"/><circle cx="29" cy="30" r="4.2" fill="#2D3640"/><circle cx="11" cy="30" r="1.6" fill="#AEB9C4"/><circle cx="29" cy="30" r="1.6" fill="#AEB9C4"/>',
  // برميل: a blue barrel
  '<rect x="10" y="7" width="20" height="29" rx="5" fill="#3E7CB1"/><path d="M10 15h20M10 28h20" stroke="#2C5A84" stroke-width="2.6"/><ellipse cx="20" cy="8.5" rx="9.5" ry="2.6" fill="#6BA6D8"/><path d="M14 18v8" stroke="#79B2E2" stroke-width="2" stroke-linecap="round"/>',
  // بقالة: a grocery with a striped awning
  '<rect x="5" y="16" width="30" height="21" fill="#F6E7C8"/><path d="M3 9h34l-2 8H5z" fill="#3FAE5C"/><path d="M10 9l-1 8m8-8v8m7-8l1 8m7-8l1.5 8" stroke="#fff" stroke-width="2.4"/><rect x="8" y="22" width="9" height="15" fill="#7A4E2A"/><rect x="20" y="22" width="12" height="8" fill="#BFE3F5"/><path d="M22 27h8" stroke="#E5534B" stroke-width="2"/>',
  // دكان: a small shop with its shutter half down and a yellow sign
  '<rect x="5" y="13" width="30" height="24" fill="#D9A86A"/><rect x="8" y="19" width="24" height="18" fill="#3B2F2A"/><path d="M8 19h24v9H8z" fill="#9AA5B1"/><path d="M8 22h24M8 25h24" stroke="#7D8894" stroke-width="1.4"/><rect x="9" y="6" width="22" height="7" rx="1.5" fill="#F0B429"/><path d="M13 9.5h14" stroke="#8A5A2B" stroke-width="1.6"/>',
  // صندوق: a wooden crate
  '<rect x="7" y="12" width="26" height="23" fill="#D69A5C"/><path d="M8 13l24 21M32 13L8 34" stroke="#9A6532" stroke-width="2.6"/><rect x="7" y="12" width="26" height="23" fill="none" stroke="#8A5A2B" stroke-width="3"/>',
  // بيت مهجور: a cracked old house, a boarded window
  '<path d="M5 37V18L20 7l15 11v19z" fill="#A89584"/><path d="M5 18L20 7l15 11" stroke="#6B5B4E" stroke-width="2.2" fill="none"/><path d="M10 21h8v7h-8z" fill="#3B2F2A"/><path d="M9 22l10 5M9 27l10-5" stroke="#C9B49B" stroke-width="1.8"/><path d="M24 26h7v11h-7z" fill="#5A463A"/><path d="M28 12l-2 5 3 3" stroke="#6B5B4E" stroke-width="1.4" fill="none"/>',
  // مزرعة: a palm over a green field
  '<path d="M2 33h36v5H2z" fill="#8DBF55"/><path d="M19.5 34c1.2-8 1.2-15 0-21" stroke="#8A5A2B" stroke-width="3.2" fill="none"/><path d="M19.5 13c-6-4-12-3-15.5 1.5 5-1.2 10.5 0 15.5 2zm0 0c6-4 12-3 15.5 1.5-5-1.2-10.5 0-15.5 2zm0 0c-3-6-8-8.5-12.5-7.5 4.5 1 8.5 4 12.5 8.5zm0 0c3-6 8-8.5 12.5-7.5-4.5 1-8.5 4-12.5 8.5z" fill="#3FAE5C"/><circle cx="18" cy="15" r="1.6" fill="#B9742F"/><circle cx="21" cy="15.5" r="1.6" fill="#B9742F"/>',
  // استراحة: a tent with string lights
  '<path d="M3 35L20 9l17 26z" fill="#F2E3C6"/><path d="M20 9l-6 26h12z" fill="#C98B4E"/><path d="M6 21q14 9 28 0" stroke="#6E4524" stroke-width="1.2" fill="none"/><circle cx="11" cy="24" r="1.9" fill="#F7D774"/><circle cx="20" cy="25.6" r="1.9" fill="#EC6158"/><circle cx="29" cy="24" r="1.9" fill="#4AB1E8"/>',
  // خزان: a water tank on legs
  '<path d="M11 24l-4 13M29 24l4 13M15 24l-1 13M25 24l1 13M9 31h22" stroke="#7A8794" stroke-width="2.2"/><rect x="7" y="7" width="26" height="18" rx="9" fill="#E3EAF1"/><path d="M7 16h26" stroke="#AEB9C4" stroke-width="2"/><path d="M12 11h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  // تحت الدرج: stairs and the dark nook under them
  '<path d="M3 37h34V7h-8v7.5h-8.7V22h-8.6v7.5H3z" fill="#DDB07A"/><path d="M3 37h17.3V22h-8.6v7.5H3z" fill="#4A3424" opacity=".55"/><path d="M29 7h8M20.3 14.5h8.7M11.7 22h8.6M3 29.5h8.7" stroke="#8A5A2B" stroke-width="2.4"/>',
  // مخزن: a store-house with a rolling door
  '<path d="M3 37V16l17-9 17 9v21z" fill="#B7C3CF"/><path d="M3 16l17-9 17 9" stroke="#7D8894" stroke-width="2.2" fill="none"/><rect x="10" y="20" width="20" height="17" fill="#7D8894"/><path d="M10 24h20M10 28h20M10 32h20" stroke="#5E6873" stroke-width="1.5"/>',
  // ورا التريلة: a truck with its trailer
  '<rect x="2" y="11" width="25" height="17" rx="1.5" fill="#F0B429"/><path d="M5 15h19" stroke="#D99A14" stroke-width="2"/><path d="M27 17h6l5 6v5H27z" fill="#2F80ED"/><rect x="29" y="18.5" width="4.5" height="4.5" fill="#CFEAF8"/><circle cx="8" cy="30" r="3.6" fill="#2D3640"/><circle cx="19" cy="30" r="3.6" fill="#2D3640"/><circle cx="32" cy="30" r="3.6" fill="#2D3640"/>',
  // حديقة: a tree, a bench and a flower
  '<circle cx="13" cy="14" r="9.5" fill="#4CB97F"/><circle cx="9" cy="11" r="3" fill="#6FD09A"/><rect x="11.5" y="20" width="3" height="16" fill="#8A5A2B"/><rect x="20" y="25" width="17" height="3.2" rx="1" fill="#C98B4E"/><path d="M22 28v8M35 28v8" stroke="#8A5A2B" stroke-width="2.2"/><circle cx="31" cy="12" r="2.6" fill="#E57AAE"/><path d="M31 15v7" stroke="#3FAE5C" stroke-width="1.8"/>',
  // ورا الباب: a wooden door left ajar
  '<rect x="9" y="3" width="22" height="34" rx="2" fill="#5A3A1E"/><path d="M11 5h18v32H11z" fill="#9A6532"/><rect x="13.5" y="8" width="13" height="11" rx="1" fill="#B47A40"/><rect x="13.5" y="22" width="13" height="12" rx="1" fill="#B47A40"/><circle cx="26" cy="21" r="1.7" fill="#F0B429"/>'];
const hdIco=p=>`<svg viewBox="0 0 40 40" aria-hidden="true">${HDI[p]}</svg>`;
const HD_HOUSE='<svg viewBox="0 0 64 44" aria-hidden="true"><path d="M6 42V19L32 4l26 15v23z" fill="#F3D9A8"/><path d="M2 21L32 3l30 18" stroke="#B97A43" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="25" y="22" width="14" height="20" rx="7" fill="#FFD36B"/><rect x="27.5" y="25" width="9" height="17" rx="4.5" fill="#FFE9A8"/><rect x="10" y="24" width="9" height="8" rx="1.5" fill="#FFD36B"/><rect x="45" y="24" width="9" height="8" rx="1.5" fill="#FFD36B"/></svg>';
const HD_EYE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" fill="#fff"/><circle cx="12" cy="12" r="3.6" fill="#2D3640"/><circle cx="13.2" cy="10.8" r="1.1" fill="#fff"/></svg>';

/* ---------- who sees what ---------- */
// may seat `me` see where seat s hides? (the seeker never; a hider their own place and, with 4+ players, their team-mates')
function hdSees(d,me,s){if(d.win!=null)return true;if(s===d.sk)return false;if(d.hs[s]==='c')return true;if(me<0||me>=d.pl.length)return false;
  if(s===me)return true;return me!==d.sk&&d.pl.length>=4;}
// must seat s hand in a pick in this simultaneous step?
function hdNeed(d,s){if(d.win!=null||s===d.sk||d.out[s]==='1'||d.hs[s]!=='h')return false;return d.ph==='hide'?d.at[s]<0:d.ph==='rn';}
// a seat with nothing to choose in a simultaneous step passes by itself (the seeker, a placed hider, one already home)
const hdAuto=(d,s)=>d.win==null&&(d.ph==='hide'||d.ph==='rn')&&d.out[s]!=='1'&&!hdNeed(d,s);

/* ---------- the clocks ---------- */
// online the host fixes the step's deadline now; on one phone it starts when the player holding it sees the screen
const hdArm=(d,T)=>hdLocal()?{...d,dl:0,dv:-2,T}:{...d,dl:Date.now()+T,dv:-1,T};
// on one phone the 3 minutes run only while the seeker chooses
const hdPause=d=>hdLocal()&&d.end>0?{...d,gl:Math.max(0,d.end-Date.now()),end:0}:d;

/* ---------- the rules ---------- */
function hdSeek(d){const x={...d,ph:'sk',turn:d.sk,ch:-1};if(!hdLocal()&&!(x.end>0))x.end=Date.now()+HD_T.game;return hdArm(x,HD_T.step);}
// the hiding step: lower seats keep a place two hiders chose; the other one is told (only them) and picks again
function hdPlace(d,picks){const n=d.pl.length,at=d.at.slice(),tk=Array(n).fill(-1);let again=false;const used=new Set(at.filter(p=>p>=0));
  const need=d.pl.map((_,s)=>hdNeed(d,s));
  for(let s=0;s<n;s++){if(!need[s])continue;const p=picks[s];if(!(Number.isInteger(p)&&p>=0&&p<16))continue;if(used.has(p)){tk[s]=p;again=true;}else{at[s]=p;used.add(p);}}
  // a hider who gave no place (time ran out) gets a free one at random
  for(let s=0;s<n;s++)if(need[s]&&at[s]<0&&tk[s]<0){const free=[...Array(16).keys()].filter(p=>!used.has(p));const p=free[rnd(free.length)];at[s]=p;used.add(p);}
  const nd={...d,at,tk,rd:d.rd+1};
  if(again)return hdArm(nd,HD_T.step);
  return hdSeek(nd);}
// the seeker decides (a place 0..15, the house 16): secret until the hiders still hidden choose
function hdChoose(d,ch){const x=hdPause(d);return hdArm({...x,ph:'rn',ch,rd:d.rd+1,turn:d.sk},HD_T.step);}
// «اسمع»: is anyone hiding in this 2×2 square? (public; the seeker still has to search or guard)
function hdListen(d,k){const q=hdSq(k);const hid=hdHidden(d);return {...d,lq:k,lr:hid.some(s=>q.includes(d.at[s]))?1:0,lh:hid.length,lk:d.ek+1};}
// the reveal: runners first, then the search, then the hint
function hdTurn(d,ch,runs){const sk=d.sk,pd=d.pd.slice();let hs=d.hs,out=d.out,lg=d.lg;const ev={k:d.ek+1,p:ch,f:-1,s:[],g:[],h:0};
  if(ch>=0)d.pl.forEach((_,s)=>{if(!runs[s]||!hdNeed(d,s))return;
    if(ch===16){hs=setAt(hs,s,'g');out=setAt(out,s,'1');pd[sk]+=15;pd[s]-=15;ev.g.push(s);}else{hs=setAt(hs,s,'s');pd[s]+=20;ev.s.push(s);}});
  if(ch>=0&&ch<16){const f=d.pl.findIndex((_,s)=>s!==sk&&hs[s]==='h'&&d.at[s]===ch);
    if(f>=0){hs=setAt(hs,f,'c');out=setAt(out,f,'1');pd[sk]+=15;pd[f]-=15;ev.f=f;}
    else{const left=d.pl.map((_,s)=>s).filter(s=>s!==sk&&hs[s]==='h'&&d.at[s]>=0);ev.h=left.length?Math.min(3,...left.map(s=>hdDist(ch,d.at[s]))):4;}
    lg=[...lg,[ch,f>=0?0:ev.h,d.pl.filter((_,s)=>s!==sk&&hs[s]==='h').length]];}
  const nd={...d,hs,out,pd,lg,ev,ek:ev.k,n:d.n+1,ch:-1,gc:d.gc+(ch===16?1:0),gs:ch===16&&!ev.g.length?(d.gs||0)+1:0,to:d.to+(ch<0?1:0)};
  if(!hdHidden(nd).length)return hdEnd(nd,'');
  if(nd.n>=nd.N)return hdEnd(nd,'خلصت الفتشات');
  return hdSeek(nd);}
/* the round's end: the seeker who caught everyone gets +10 more; else every hider still hidden gets +15 and the hiders
   win (with 4+ players the whole team, with 3 the ones not caught). d.dsc moves the session points */
function hdEnd(d,why){const sk=d.sk,pd=d.pd.slice(),H=d.pl.map((_,s)=>s).filter(s=>s!==sk);
  const alive=H.filter(s=>d.hs[s]==='h'||d.hs[s]==='s'),caught=H.filter(s=>d.hs[s]==='c'||d.hs[s]==='g');let win,wins;
  if(!alive.length){if(!caught.length)return {...d,ph:'end',win:'d',why,dl:0,end:0};pd[sk]+=10;win=sk;wins=[sk];}
  else{H.forEach(s=>{if(d.hs[s]==='h')pd[s]+=15;});wins=d.pl.length>=4?H.filter(s=>d.hs[s]!=='x'):alive;win=alive[0];}
  return {...d,ph:'end',pd,dsc:pd,win,wins,why,dl:0,end:0,ch:-1};}

/* ---------- bots ---------- */
// this phone's memory for the session: where each seeker searched, how often they guard, where each hider hid, how often hiders run
function hdMem(){return S.hdMem||(S.hdMem={sk:{},hp:{},run:{n:0,r:0},seen:{},ns:0});}
/* the seeker's map: for every place the chance that a hider still hidden is there, from what everyone can see
   (empty searches, hot/cold, «اسمع»). Every hint says all the hiders hidden then are at least that far, and one of them
   exactly that far (sure while nobody has left since). The hard seeker also leans on where these hiders liked to hide */
function hdProb(d,lv){const key=d.gid+':'+d.n+':'+d.lq+':'+d.hs+':'+lv;if(S.hdPC&&S.hdPC.k===key)return S.hdPC.r;const r=hdProb0(d,lv);S.hdPC={k:key,r};return r;}
function hdProb0(d,lv){const hid=hdHidden(d),h=hid.length,P=Array(16).fill(0);if(!h)return {P,A:[],h};
  const done=new Set(d.lg.map(e=>e[0])),hints=d.lg.filter(e=>e[1]>=1&&e[1]<=3),sq=d.lq>=0?hdSq(d.lq):null;
  let A=[];for(let p=0;p<16;p++){if(done.has(p))continue;if(hints.some(e=>hdDist(e[0],p)<e[1]))continue;if(sq&&!d.lr&&sq.includes(p))continue;A.push(p);}
  if(A.length<h)A=[...Array(16).keys()].filter(p=>!done.has(p));
  const w=Array(16).fill(1);
  if(lv>=3){const M=hdMem();hid.forEach(s=>{const hp=M.hp[d.pl[s]];if(!hp)return;const t=hp.reduce((a,b)=>a+b,0);if(t>=2)for(let p=0;p<16;p++)w[p]+=1.2*hp[p]/t;});}
  const wit=hints.map(e=>({set:A.filter(p=>hdDist(p,e[0])===e[1]),hard:e[2]===h}));
  if(sq&&d.lr)wit.push({set:A.filter(p=>sq.includes(p)),hard:d.lh===h});
  let tot=0,nodes=0;const acc=Array(16).fill(0),cur=[];
  const rec=(i,wt)=>{if(++nodes>60000)return;
    if(cur.length===h){let f=wt;for(const W of wit)if(!cur.some(p=>W.set.includes(p))){if(W.hard)return;f*=.3;}tot+=f;for(const p of cur)acc[p]+=f;return;}
    for(let j=i;j<=A.length-(h-cur.length);j++){cur.push(A[j]);rec(j+1,wt*w[A[j]]);cur.pop();}};
  rec(0,1);
  if(tot>0)for(let p=0;p<16;p++)P[p]=acc[p]/tot;else A.forEach(p=>{P[p]=h/A.length;});
  return {P,A,h};}
const hdArgmax=(xs,f)=>{let b=-Infinity,o=[];for(const x of xs){const v=f(x);if(v>b+1e-9){b=v;o=[x];}else if(Math.abs(v-b)<=1e-9)o.push(x);}return o.length?o[rnd(o.length)]:null;};
const hdWPick=(xs,f)=>{const w=xs.map(f),t=w.reduce((a,b)=>a+b,0);if(!(t>0))return xs[rnd(xs.length)];let r=Math.random()*t;for(let i=0;i<xs.length;i++){r-=w[i];if(r<=0)return xs[i];}return xs[xs.length-1];};
// how likely this seeker guards the house this turn, as a hider reads it: more while many hiders still have their run,
// and what this seeker did this round and in earlier rounds on this phone
function hdGuardP(d){const m=hdMem().sk[d.pl[d.sk]],h=hdHidden(d).length;let g=.08+.06*Math.min(h,6);
  if(m&&m.t){const w=m.t/(m.t+5);g=(1-w)*g+w*(m.g+.3)/(m.t+.6);}if(d.n)g=.7*g+.3*d.gc/d.n;if(d.N-d.n<=1)g+=.06;return Math.max(.04,Math.min(.85,g));}
// the hiders' rule for running now (q: the chance the seeker searches their place now, g: that it guards). Staying keeps
// the run for later, so mid-round a hider thinks of running only when the seeker is closing in (and then a sharp one
// runs only half the time); on the last search it weighs +20/−15 for running against +15 for lasting
const hdRunX=(q,g,last,lv)=>last?(20-35*g)-(15-30*q*(1-g)):q*(1-g)-g*(lv===3?.9:1.1);
const hdAim=(P,C)=>{const sum=C.reduce((a,p)=>a+Math.pow(P[p],3),0)||1;return p=>C.includes(p)?Math.pow(P[p],3)/sum:0;};
/* the seeker bot: «اسمع» while its map is flat. The hard one reads the hiders' minds: from the same public facts it
   predicts which places hold a hider about to run, and weighs guarding the house (the runners it would catch) against
   searching (a hider who stays). It does not keep guarding when guarding caught nobody */
function hdSeekBot(d,s,lv){const v=GAMES.hide.mask(d,s),{P,A,h}=hdProb(v,lv),rem=v.N-v.n;
  const C=A.length?A:[...Array(16).keys()].filter(p=>!v.lg.some(e=>e[0]===p));const mx=Math.max(0,...C.map(p=>P[p]));
  if(v.lq<0&&rem>=2&&C.length>4){const flat=mx<1.35*h/C.length;
    if(lv===1?Math.random()<.15:flat&&Math.random()<(lv===3?.9:.5)){
      const k=lv===1?rnd(9):hdArgmax([...Array(9).keys()],k=>-Math.abs(.5-(1-hdSq(k).reduce((a,p)=>a*(1-Math.min(.98,P[p])),1)))+Math.random()*.02);
      return hdListen(d,k);}}
  if(lv===1){if(h>=1&&Math.random()<.07)return hdChoose(d,16);const p=Math.random()<.5?C[rnd(C.length)]:hdWPick(C,x=>P[x]+1e-6);return hdChoose(d,p==null?C[0]:p);}
  const M=hdMem(),g=hdGuardP(v),aim=hdAim(P,C),last=rem<=1||hdClock(v)<16000;
  const base=Math.max(.03,Math.min(.5,(M.run.r+.5)/(M.run.n+8)))*(last?1.6:1);
  const rp=p=>Math.min(.9,hdRunX(aim(p),g,last,3)>0?(last?.8:.5):base);
  let gv=C.reduce((a,p)=>a+P[p]*rp(p),0);if((v.gs||0)>=2)gv*=.45;
  const best=hdArgmax(C,p=>P[p]*(1-rp(p))+(lv===2?Math.random()*.08:0));const sv=best==null?0:P[best]*(1-rp(best))+(rem>2?.06:0);
  if(h>=1&&(lv===3?gv>sv:gv>sv*1.35)!==(Math.random()<(lv===3?.08:.15)))return hdChoose(d,16);
  return hdChoose(d,best==null?C[0]:best);}
// a hider bot hides away from where this seeker likes to search, varies its own habits and spreads from its team-mates
function hdHideBot(d,s,lv){const v=GAMES.hide.mask(d,s),M=hdMem(),m=M.sk[d.pl[d.sk]],mine=M.hp[d.pl[s]];
  const busy=new Set(v.at.filter((p,x)=>p>=0&&x!==s));if(v.tk[s]>=0)busy.add(v.tk[s]);
  const free=[...Array(16).keys()].filter(p=>!busy.has(p));if(!free.length)return rnd(16);if(lv===1)return free[rnd(free.length)];
  const mates=v.at.filter((p,x)=>p>=0&&x!==s&&x!==d.sk),mt=mine?mine.reduce((a,b)=>a+b,0):0;
  return hdArgmax(free,p=>{let x=Math.random()*(lv===3?1:3);if(m&&m.t)x-=(lv===3?7:3)*m.p[p]/m.t;if(mt)x-=(lv===3?3:1.5)*mine[p]/mt;
    if(mates.length)x+=.3*Math.min(...mates.map(q=>hdDist(p,q)));return x;});}
// a hider bot stays or runs by the rule above, reading the seeker's map from the public facts
function hdRunBot(d,s,lv){const v=GAMES.hide.mask(d,s),my=v.at[s];if(my<0)return 0;if(lv===1)return Math.random()<.13?1:0;
  const {P,A}=hdProb(v,2),C=A.length?A:[my],rem=v.N-v.n,last=rem<=1||hdClock(v)<16000;
  let x=hdRunX(hdAim(P,C)(my),hdGuardP(v),last,lv);if(lv===2)x+=(Math.random()-.5)*(last?10:.3);
  // cornered mid-round, a sharp hider keeps the seeker guessing: a seeker who expects the run guards the house
  return x>0&&(last||Math.random()<(lv===3?.5:.75))?1:0;}

/* ---------- drawing ---------- */
const hdName=p=>p===16?'البيت':HDN[p]||'';
function hdKid(d,s,cls){return `<i class="hd-kid ${cls||''}" style="--c:${col(d,s)}">${shapeW(d.pl[s])}</i>`;}
// the evening sky over the map: the 3 minutes, the searches used, «اسمع», and the step's shrinking bar
function hdSky(d){const fin=d.win!=null,l=hdClock(d),run=(d.ph==='sk'||d.ph==='rn')&&!fin,on=!fin&&d.dl>0;
  const step=on?Math.max(0,Math.min(1,(d.dl-Date.now())/(d.T||HD_T.step))):1;
  return `<div class="hd-sky"><span class="hd-clk ${run&&l<=30000?'low':''} ${d.end>0&&!fin?'on':''}" aria-label="وقت اللعبة"><i>⏱</i><b>${hdFmt(l)}</b></span>
    <span class="hd-pips" aria-label="الفتشات ${d.n} من ${d.N}"><small>🔦</small>${[...Array(d.N)].map((_,k)=>`<i class="${k<d.n?'u':''}"></i>`).join('')}</span>
    <span class="hd-sec ${on?'':'off'}" aria-label="ثواني الخطوة"><b ${on?`data-until="${d.dl}"`:''}>${on?Math.ceil(Math.max(0,d.dl-Date.now())/1000):Math.round((d.T||HD_T.step)/1000)}</b><small>ث</small></span>
    <span class="hd-ear ${d.lq>=0?'u':''}" aria-label="${d.lq>=0?'اسمع انستخدم':'اسمع متاح'}">👂</span></div>
    <div class="hd-bar ${on?'':'idle'}"><i style="transform:scaleX(${step.toFixed(3)})"></i></div>`;}
// what just happened, for everyone
function hdEvTxt(d,html){const e=d.ev,sk=d.sk,N=s=>html?nameTag(d,s):pname(d.pl[s]);if(!e)return '';const parts=[];
  if(e.p<0)parts.push(`⏱ راحت الفتشة على ${N(sk)}، ما اختار بالوقت`);
  else if(e.p===16)parts.push(e.g.length?`🛡 ${N(sk)} حرس البيت ومسك ${e.g.map(N).join(' و')} وهو يركض!`:`🛡 ${N(sk)} حرس البيت… وما ركض أحد`);
  else if(e.f>=0)parts.push(`🔦 فتّش «${HDN[e.p]}» ولقى ${N(e.f)}! لقيتك!`);
  else parts.push(`🔦 فتّش «${HDN[e.p]}»: فاضي${e.h>=1&&e.h<=3?` • ${HDHE[e.h]} ${HDH[e.h]}`:''}`);
  if(e.s.length)parts.push(`🏃 ${e.s.map(N).join(' و')} وصل البيت! +20`);
  return parts.join(html?'<br>':' • ');}
function hdBanner(d,me){const e=d.ev;if(d.win!=null)return '';
  if(d.lq>=0&&d.lk===d.ek+1&&(d.ph==='sk'||d.ph==='rn'))return `<div class="hd-ev ls" data-k="ls${d.lk}"><i>👂</i><span>${nameTag(d,d.sk)} سمع… <b>${d.lr?'فيه أحد بالمربع!':'ما فيه أحد بالمربع'}</b></span></div>`;
  if(!e){if(d.ph==='hide')return `<div class="hd-ev"><i>🙈</i><span>${me===d.sk?'غمّض عيونك… الكل يتخبّى':'تخبّوا بسرعة قبل ما يفتّح!'}</span></div>`;return '';}
  const cls=e.p<0?'to':e.p===16?(e.g.length?'got':'gd'):e.f>=0?'got':'h'+e.h;
  return `<div class="hd-ev ${cls}" data-k="ev${e.k}"><i>${e.p<0?'⏱':e.p===16?'🛡':e.f>=0?'🎯':HDHE[e.h]||'🔦'}</i><span>${hdEvTxt(d,true)}</span></div>`;}
/* the map: 16 places and the house. o.me = the seat whose eyes we use, o.pick = what is selectable, o.sel = the selection */
function hdMap(d,ctx,o){const me=o.me,fin=d.win!=null,e=d.ev,n=d.pl.length;
  const occ=Array.from({length:16},()=>[]);d.at.forEach((p,s)=>{if(p>=0&&p<16&&hdSees(d,me,s))occ[p].push(s);});
  const srch={};d.lg.forEach(([p,c])=>{srch[p]=c;});
  const myP=me>=0&&me!==d.sk?d.at[me]:-1;const hot=!fin&&myP>=0&&d.hs[me]==='h'&&e&&e.p>=0&&e.p<16&&hdDist(e.p,myP)===1;
  const sq=d.lq>=0?d.lq:-1,pv=o.lsn&&o.sel>=100?o.sel-100:-1;
  const tiles=HDN.map((nmP,p)=>{const can=o.pick(p),sel=o.sel===p,c=srch[p];const who=occ[p];let badge='',kids='',cls=[];
    if(can)cls.push('can');if(sel)cls.push('sel');if(c!=null)cls.push(c===0?'found':'done');
    if(who.length)cls.push('occ');if(myP===p)cls.push('mine');if(o.ch===p)cls.push('aim');if(o.tk===p)cls.push('tk');
    if(c!=null&&c>=1&&c<=3)badge=`<u class="hd-hb h${c}">${HDHE[c]} ${HDH[c]}</u>`;
    if(c!=null&&c!==0)badge+='<svg class="hd-dust" viewBox="0 0 30 14" aria-hidden="true"><path d="M3 12c-2-4 2-7 5-5 1-4 7-5 9-1 3-2 8 0 7 4 3 0 4 3 2 4z" fill="currentColor"/></svg>';
    for(const s of who){const st=d.hs[s];kids+=hdKid(d,s,(st==='c'?'got ':st==='s'||st==='g'?'gone ':'')+(s===me?'me':'mate'));}
    if(o.tk===p)badge+='<u class="hd-x">مأخوذ</u>';
    if(o.ch===p)badge+='<u class="hd-aim">🔦</u>';
    const fx=e&&e.p===p&&!fin?`<i class="hd-fx" data-k="fx${e.k}"></i>${e.f>=0?`<i class="hd-pop" data-k="pop${e.k}" style="--c:${col(d,e.f)}">لقيتك!</i>`:''}`:'';
    const beat=hot&&myP===p?`<i class="hd-beat" data-k="bt${e.k}"></i>`:'';
    return `<button class="hd-t ${cls.join(' ')}" data-ga="sel" data-i="${p}" ${can?'':'disabled'} aria-label="${nmP}${c===0?'، انمسك فيه أحد':c!=null?'، انفتّش':''}"><span class="hd-ic">${hdIco(p)}</span><b>${nmP}</b>${badge}${kids?`<span class="hd-kids">${kids}</span>`:''}${fx}${beat}</button>`;}).join('');
  const box=(k,cls,inner)=>{const r=Math.floor(k/3),c=k%3;return `<div class="hd-sq ${cls}" style="top:calc(${r*25}% + ${r*1.5}px);inset-inline-start:calc(${c*25}% + ${c*1.5}px)">${inner||''}</div>`;};
  let over='';
  if(sq>=0)over+=box(sq,'ls '+(d.lr?'yes':'no'),`<span>👂 ${d.lr?'فيه أحد':'ما فيه أحد'}</span>`);
  if(o.lsn){for(let k=0;k<9;k++)if(k!==pv)over+=box(k,'jn',`<button class="hd-jn" data-ga="lsel" data-i="${k}" aria-label="المربع ${k+1}">👂</button>`);if(pv>=0)over+=box(pv,'pv',`<span>👂 هنا؟</span>`);}
  // the house: who reached it, who was caught at its door, the seeker on guard
  const home=d.pl.map((_,s)=>s).filter(s=>d.hs[s]==='s'),door=d.pl.map((_,s)=>s).filter(s=>d.hs[s]==='g');
  const guard=(o.ch===16)||(e&&e.p===16&&!fin&&d.ph!=='hide');const hcan=o.pick(16),hsel=o.sel===16;
  const house=`<button class="hd-home ${hcan?'can':''} ${hsel?'sel':''} ${guard?'guard':''}" data-ga="sel" data-i="16" ${hcan?'':'disabled'} aria-label="البيت">
    <span class="hd-hs">${HD_HOUSE}</span><span class="hd-ht"><b>البيت</b><small>${guard&&o.ch===16?'بتحرسه 🛡':guard?'الغمّاض كان يحرسه 🛡':'المكان الآمن، اركض له وخذ +20'}</small></span>
    <span class="hd-kids">${home.map(s=>hdKid(d,s,'safe'+(s===me?' me':''))).join('')}${door.map(s=>hdKid(d,s,'got')).join('')}${guard?`<i class="hd-kid sk" style="--c:${col(d,d.sk)}">${HD_EYE}</i>`:''}</span>
    ${e&&e.p===16&&!fin?`<i class="hd-fx" data-k="hfx${e.k}"></i>`:''}${e&&e.s.length&&!fin?`<i class="hd-pop safe" data-k="hp${e.k}">وصل! +20</i>`:''}</button>`;
  return `<div class="hd-map ${o.lsn?'lsn':''} ${o.seek?'seek':''}"><div class="hd-grid">${tiles}${over}</div>${house}</div>`;}
// the line with this player's own role and live points
function hdMe(d,me){if(me<0||me>=d.pl.length)return '';const x=d.pd[me],st=d.hs[me],p=d.at[me];
  const t=me===d.sk?'أنت الغمّاض 👀':st==='c'?'انمسكت 😵':st==='g'?'انمسكت وأنت تركض 😵':st==='s'?'وصلت البيت 🏠':st==='x'?'':p>=0?`متخبّي في «${HDN[p]}» 🙈`:'ما تخبيت للحين';
  const team=d.pl.length>=4&&me!==d.sk?'<small>فريق المتخبّين: تشوف أماكن ربعك</small>':'';
  return `<div class="hd-me ${me===d.sk?'sk':''}" style="--c:${col(d,me)}"><i>${me===d.sk?HD_EYE:shapeW(d.pl[me])}</i><span><b>${t}</b>${team}</span>${x?`<em class="${x>0?'up':'dn'}">${x>0?'+':'−'}${Math.abs(x)}</em>`:''}</div>`;}
// the round's end: everyone's place, what happened to them and the points they moved
function hdSum(d){const out=s=>s===d.sk?'الغمّاض 👀':({h:'صمد للآخر 🙈',c:'انمسك 😵',g:'انمسك وهو يركض 😵',s:'وصل البيت 🏠',x:'طلع'})[d.hs[s]]||'';
  return `<div class="hd-sum">${d.pl.map((r,s)=>{const x=(d.dsc||d.pd)[s]||0;return `<div class="hd-sr ${s===d.sk?'sk':d.hs[s]}" style="--c:${col(d,s)}"><i>${s===d.sk?HD_EYE:shapeW(r)}</i><b>${nm(d,s)}</b><span>${out(s)}${s!==d.sk&&d.at[s]>=0?` • «${HDN[d.at[s]]}»`:''}</span><em class="${x>0?'up':x<0?'dn':''}">${x>0?'+'+x:x<0?'−'+(-x):'0'}</em></div>`;}).join('')}</div>`;}

GAMES.hide={name:'غميضة الحارة',cat:'party',lbc:'#C0612B',minP:3,teams:'none',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="hdsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B3F8C"/><stop offset=".55" stop-color="#E0736A"/><stop offset="1" stop-color="#F6B26B"/></linearGradient></defs><rect width="100" height="100" fill="url(#hdsk)"/><circle cx="78" cy="20" r="8" fill="#FFE9A8"/><circle cx="82" cy="17" r="7" fill="#7A4F98"/><path d="M14 64c2-14 2-26 0-38" stroke="#5A3A1E" stroke-width="4" fill="none"/><path d="M14 27c-8-6-15-4-18 1 6-1 12 0 18 2zm0 0c8-6 15-4 18 1-6-1-12 0-18 2zm0 0c-4-7-10-9-15-8 5 1 10 5 15 9zm0 0c4-7 10-9 15-8-5 1-10 5-15 9z" fill="#2E7D4F"/><rect x="0" y="62" width="100" height="38" fill="#C98B4E"/><path d="M8 52h60v48H8z" fill="#EBC995"/><path d="M8 52h60v6H8z" fill="#D4A56A"/><path d="M8 70h60M8 86h60M28 58v12M48 58v12M18 70v16M38 70v16M58 70v16M28 86v14M48 86v14" stroke="#D4A56A" stroke-width="2"/><circle cx="74" cy="56" r="13" fill="#F5C9A0"/><path d="M61 52c1-9 8-14 15-13 7 1 11 6 11 12-5-3-12-4-18-2-3 1-6 2-8 3z" fill="#3B2A1E"/><circle cx="69" cy="57" r="2.6" fill="#2D3640"/><circle cx="78" cy="57" r="2.6" fill="#2D3640"/><circle cx="68.2" cy="56" r=".9" fill="#fff"/><circle cx="77.2" cy="56" r=".9" fill="#fff"/><path d="M70 64q4 2.5 7 0" stroke="#B5654A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M66 70c0-4 2-6 5-6h3c3 0 4 2 4 5v4H66z" fill="#F5C9A0"/><path d="M64 67h-3c-2 0-3 1-3 3s1 3 3 3h7z" fill="#F5C9A0"/><rect x="64" y="61" width="5" height="12" rx="2.5" fill="#F5C9A0"/></svg>`,
  init:n=>({ph:'hide',sk:0,hs:'',at:Array(n).fill(-1),tk:Array(n).fill(-1),ch:-1,n:0,N:hdMaxN(n),lg:[],gc:0,to:0,lq:-1,lr:0,lh:0,lk:0,gs:0,ev:null,ek:0,pd:Array(n).fill(0),dl:0,dv:-2,T:HD_T.hide,end:0,gl:HD_T.game,rd:0,why:''}),
  // the seeker is the round's starter: «جولة جديدة» moves it to the next seat
  start(d){const n=d.pl.length,sk=d.st%n;return hdArm({...d,sk,turn:sk,hs:d.pl.map((_,s)=>s===sk?'k':'h').join(''),ph:'hide',rd:1},HD_T.hide);},
  simulNow:d=>d.ph==='hide'||d.ph==='rn',
  mask(d,seat){if(d.win!=null)return d;return {...d,at:d.at.map((p,s)=>hdSees(d,seat,s)?p:-1),tk:d.tk.map((x,s)=>s===seat?x:-1),ch:seat>=0&&seat===d.sk?d.ch:-1};},
  privInit:(d,r)=>{const s=d.pl.indexOf(r);return s>=0&&hdAuto(d,s)?{rd:d.rd,pick:NOPICK}:{};},
  privStale:(d,p,r)=>{const s=d.pl.indexOf(r);return s>=0&&hdAuto(d,s)&&!(p.rd===d.rd&&p.pick===NOPICK);},
  privOk:(d,r,o,p)=>{if(p.pick==null||p.pick===NOPICK||p.rd!==d.rd)return true;const s=d.pl.indexOf(r);if(s<0||!hdNeed(d,s))return false;
    return d.ph==='hide'?Number.isInteger(p.pick)&&p.pick>=0&&p.pick<16:p.pick===0||p.pick===1;},
  net:{local:['sel','lsn','lsel'],ui:['hdSel','hdL']},
  viewer:d=>d.win!=null?null:d.ph==='sk'?(isBot(d,d.sk)?null:d.sk):simulViewer(d),
  coverMsg:d=>d.ph==='sk'?(d.ev?hdEvTxt(d,false)+' — ':'خلصوا التخبية! ')+'دورك تدوّر 👀':d.ph==='rn'?'الغمّاض اختار بالسر… تبقى ولا تركض؟':d.ph==='hide'?(d.rd>1?'تخبّى بالسر 🙈 (اللي انأخذ مكانه يختار غيره)':'تخبّى بالسر 🙈'):'',
  points:d=>d.pl.map((_,s)=>{const x=d.pd[s],st=d.hs[s];const ic=s===d.sk?'👀':st==='c'||st==='g'?'😵':st==='s'?'🏠':st==='x'?'':'🙈';return (ic+(x?' '+(x>0?'+'+x:'−'+(-x)):'')).trim();}),
  winText:d=>d.win==='d'?'انتهت الجولة':d.win===d.sk?`${nm(d,d.sk)} لقاهم كلهم! 👀`:d.pl.length>=4?'فاز فريق المتخبّين! 🙈':`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')}! 🙈`,
  winExtra:d=>`${d.why?d.why+' • ':''}`+d.pl.map((_,s)=>{const x=(d.dsc||d.pd)[s]||0;return `${nm(d,s)} ${x>0?'+'+x:x<0?'−'+(-x):'0'}`;}).join('، '),
  status(d,ctx){const v=ctx.v,iSk=v===d.sk,sk=nameTag(d,d.sk);
    if(d.ph==='hide')return `<small>${sk} الغمّاض هالجولة</small><br>`+(iSk?'<b class="yt">غمّض عيونك! 🙈</b>':ctx.my?`<b class="yt">${d.tk[v]>=0?'المكان مأخوذ، اختر غيره':'تخبّى بالسر'}</b>`:'الكل يتخبّى…');
    const top=`<small>الفتشة ${Math.min(d.n+1,d.N)} من ${d.N}</small><br>`;
    if(d.ph==='sk')return top+(iSk&&ctx.my?'<b class="yt">دورك: فتّش مكان أو احرس البيت</b>':`${sk} يدوّر 👀`);
    if(d.ph==='rn')return top+(ctx.my?'<b class="yt">تبقى ولا تركض للبيت؟</b>':iSk?'اخترت… ننتظرهم يقررون':'المتخبّين يقررون…');
    return '';},
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1,fin=d.win!=null,iSk=me===d.sk;
    // a selection belongs to one step
    const key=d.gid+':'+d.ph+':'+d.rd+':'+d.n+':'+me;if(S.hdKey!==key){S.hdKey=key;S.hdSel=-1;S.hdL=false;}
    const sel=Number.isInteger(S.hdSel)?S.hdSel:-1,lsn=!!S.hdL&&d.ph==='sk'&&iSk&&ctx.my&&d.lq<0;
    const done=new Set(d.lg.map(e=>e[0]));const myPick=me>=0&&ctx.priv&&ctx.priv[d.pl[me]]&&ctx.priv[d.pl[me]].rd===d.rd?ctx.priv[d.pl[me]].pick:null;
    const mates=new Set(d.at.filter((p,s)=>p>=0&&s!==me&&hdSees(d,me,s)));
    let pick=()=>false;
    if(!fin&&ctx.my&&d.ph==='hide'&&me>=0&&!iSk)pick=p=>p<16&&!mates.has(p)&&d.tk[me]!==p;
    if(!fin&&ctx.my&&d.ph==='sk'&&iSk&&!lsn)pick=p=>p===16||!done.has(p);
    if(!fin&&sel>=0&&!pick(sel)&&!(lsn&&sel>=100)){S.hdSel=-1;}
    const sl=Number.isInteger(S.hdSel)?S.hdSel:-1;
    // a sound for what just happened (once per event, on the phone that shows it)
    if(d.ev&&!fin){const k=d.gid+':'+d.ev.k;if(S.hdSnd!==k){S.hdSnd=k;if(d.ev.f>=0||d.ev.g.length)sfx(me>=0&&(me===d.ev.f||d.ev.g.includes(me))?'lose':'pop');else if(d.ev.s.length)sfx('turn');}}
    let h=`<div class="hd ${iSk?'is-sk':me>=0?'is-hd':''} ph-${d.ph}" style="--me:${me>=0?col(d,me):'#C0612B'}">`+hdSky(d)+hdBanner(d,me);
    if(d.ph==='hide'&&iSk&&!fin){h+=`${hdMe(d,me)}<div class="hd-blind"><div class="hd-eyes">🙈</div><b>غمّض عيونك وعدّ!</b><p>الباقين يتخبّون الحين بالحارة… بعدها تبدأ تدوّر، وعندك ${d.N} فتشات</p><div class="hd-blind-map">${HDN.map((x,p)=>`<i>${hdIco(p)}</i>`).join('')}</div></div></div>`;return h;}
    h+=hdMap(d,ctx,{me,pick,sel:sl,lsn,seek:iSk,ch:iSk&&d.ph==='rn'?d.ch:-1,tk:me>=0&&!iSk&&d.ph==='hide'?d.tk[me]:-1});
    if(fin)return h+hdSum(d)+'</div>';
    h+=hdMe(d,me);
    if(d.ph==='hide'){
      if(me>=0&&!iSk&&ctx.my){const ok=sl>=0&&sl<16;h+=`<button class="big hd-go hide" data-ga="hp" data-i="${ok?sl:0}" ${ok?'':'disabled'}>${ok?`اختبي في «${HDN[sl]}» 🤫`:d.tk[me]>=0?`«${HDN[d.tk[me]]}» مأخوذ، اختر غيره`:'اختر مخباك من الخريطة'}</button>`;}
      else if(me>=0&&!iSk)h+=`<p class="hd-wait">${myPick!=null&&myPick!==NOPICK&&d.at[me]<0?`اخترت «${HDN[myPick]}» ✓ `:''}ننتظر الباقين يتخبّون…</p>`;
      else h+='<p class="hd-wait">الكل يتخبّى…</p>';}
    else if(d.ph==='sk'){
      if(iSk&&ctx.my){
        if(lsn){const k=sl>=100?sl-100:-1;h+=`<div class="hd-acts"><button class="big hd-go ear" data-ga="ls" data-i="${k>=0?k:0}" ${k>=0?'':'disabled'}>${k>=0?'👂 اسمع هنا':'اختر مربع على الخريطة'}</button><button class="sm hd-back" data-ga="lsn">رجوع</button></div><p class="hd-tip">تعرف هل فيه أحد بالمربع (بدون المكان بالضبط)، والكل يشوف النتيجة</p>`;}
        else{const ok=sl>=0&&sl<=16;h+=`<div class="hd-acts"><button class="big hd-go ${sl===16?'guard':''}" data-ga="go" data-i="${ok?sl:0}" ${ok?'':'disabled'}>${sl===16?'🛡 احرس البيت':ok?`🔦 فتّش «${HDN[sl]}»`:'اختر مكان تفتّشه أو البيت'}</button>${d.lq<0?'<button class="sm hd-lsn" data-ga="lsn">👂 اسمع<small>مرة وحدة</small></button>':''}</div>`;}}
      else h+=`<p class="hd-wait">${nameTag(d,d.sk)} يختار بالسر… بعدها ${me>=0&&!iSk&&d.hs[me]==='h'?'تقرر: تبقى ولا تركض':'يقرر المتخبّين'}</p>`;}
    else if(d.ph==='rn'){
      if(ctx.my&&me>=0&&!iSk){const g=hdGuardP(d);h+=`<div class="hd-two"><button class="big hd-stay" data-ga="st">🤫 أبقى مكاني<small>تصمد للآخر +15</small></button><button class="big hd-run" data-ga="run">🏃 أركض للبيت<small>+20، ولو حارس −15</small></button></div><p class="hd-tip">باقي ${d.N-d.n} فتشات${d.n?` • حرس البيت ${d.gc} من ${d.n}`:''}</p>`;void g;}
      else if(iSk)h+=`<p class="hd-wait">اخترت ${d.ch===16?'تحرس البيت 🛡':d.ch>=0?`تفتّش «${HDN[d.ch]}» 🔦`:''}… ننتظرهم يقررون</p>`;
      else if(me>=0&&d.hs[me]==='h')h+=`<p class="hd-wait">${myPick===1?'قررت تركض 🏃':myPick===0?'قررت تبقى 🤫':''} ننتظر الباقين…</p>`;
      else h+='<p class="hd-wait">المتخبّين يقررون…</p>';}
    return h+'</div>';},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='sel'){if(!ctx.my||d.win!=null)return;S.hdSel=S.hdSel===i?-1:i;S.hdL=false;render();return;}
    if(a==='lsn'){if(!ctx.my||d.ph!=='sk'||v!==d.sk||d.lq>=0)return;S.hdL=!S.hdL;S.hdSel=-1;render();return;}
    if(a==='lsel'){if(!ctx.my||d.ph!=='sk'||v!==d.sk||!(i>=0&&i<9))return;S.hdSel=100+i;render();return;}
    if(a==='hp'){if(d.ph!=='hide'||!ctx.my||v==null||v<0||v===d.sk||!(Number.isInteger(i)&&i>=0&&i<16)||d.tk[v]===i)return;S.hdSel=-1;simulPick(d,v,i);return;}
    if(a==='go'){if(d.ph!=='sk'||!ctx.my||v!==d.sk||!(Number.isInteger(i)&&i>=0&&i<=16)||(i<16&&d.lg.some(e=>e[0]===i)))return;S.hdSel=-1;act(hdChoose(d,i));return;}
    if(a==='ls'){if(d.ph!=='sk'||!ctx.my||v!==d.sk||d.lq>=0||!(Number.isInteger(i)&&i>=0&&i<9))return;S.hdSel=-1;S.hdL=false;act(hdListen(d,i));return;}
    if(a==='st'||a==='run'){if(d.ph!=='rn'||!ctx.my||v==null||v<0||v===d.sk)return;simulPick(d,v,a==='run'?1:0);}},
  resolve(d,picks){if(d.ph==='hide')return hdPlace(d,picks);if(d.ph==='rn')return hdTurn(d,d.ch,picks.map(p=>p===1));return d;},
  onSkip(nd,d){let x={...nd,win:null,wins:undefined,turn:d.sk};delete x.wins;let hs=x.hs;
    for(let s=0;s<d.pl.length;s++)if(nd.out[s]==='1'&&d.out[s]!=='1'){if(s===d.sk)return hdEnd({...x,hs},'الغمّاض طلع');hs=setAt(hs,s,'x');}
    x.hs=hs;if(!hdHidden(x).length)return hdEnd(x,'');return x;},
  bot(d,s,lv){if(d.win!=null||d.ph!=='sk'||s!==d.sk)return d;return hdSeekBot(d,s,lv);},
  botPick(d,s,lv){if(!hdNeed(d,s))return NOPICK;return d.ph==='hide'?hdHideBot(d,s,lv):hdRunBot(d,s,lv);},
  botDelay:(d,s,lv)=>d.ph==='sk'?900+rnd(900):BOTMS[lv]+rnd(d.ph==='hide'?1800:1300)};
// the bots' memory: every reveal and every round's end, as this phone saw them
GAMES.hide.botSee=nd=>{try{const M=hdMem();if(M.ns>400){M.seen={};M.ns=0;}
  const e=nd.ev,k=nd.gid+':'+nd.ek;if(e&&!M.seen[k]){M.seen[k]=1;M.ns++;const r=nd.pl[nd.sk],m=M.sk[r]||(M.sk[r]={p:Array(16).fill(0),g:0,t:0});
    if(e.p>=0){m.t++;if(e.p<16)m.p[e.p]++;else m.g++;const had=hdHidden(nd).length+(e.f>=0?1:0)+e.s.length+e.g.length;M.run.n+=had;M.run.r+=e.s.length+e.g.length;}}
  if(nd.win!=null&&!M.seen['w'+nd.gid]){M.seen['w'+nd.gid]=1;M.ns++;nd.at.forEach((p,s)=>{if(s===nd.sk||!(p>=0&&p<16))return;const r=nd.pl[s];(M.hp[r]=M.hp[r]||Array(16).fill(0))[p]++;});}}catch(e){}};

/* the clocks: the 3 minutes and the step's bar move every half second, and only the enforcer (this phone, or the room's
   host) acts when a deadline passes. On one phone a step's 15 seconds start when its player sees the screen */
function hdTick(d,now){const local=hdLocal();
  if(local&&(S.browse||S.modal||app.querySelector('.cover')))return;
  if((d.ph==='sk'||d.ph==='rn')&&d.end>0&&now>=d.end){act(hdEnd(hdPause(d),'خلص الوقت ⏱'));return;}
  if(local){const ctx=mkCtx();const who=d.ph==='sk'?d.sk:(ctx.my&&ctx.v>=0?ctx.v:-1);
    if(d.dl===0||who!==d.dv){const nd={...d,dl:now+(d.T||HD_T.step),dv:who};if(d.ph==='sk'&&!(d.end>0))nd.end=now+Math.max(0,d.gl);
      // arming a clock is not a move: it does not tap, bump the round or wake the bots
      S.st={...S.st,d:nd};save();render();return;}}
  if(!(d.dl>0)||now<d.dl)return;
  if(d.ph==='sk'){act(hdTurn(hdPause(d),-1,[]));return;}
  if(local&&d.dv>=0){const v=d.dv;if(d.out[v]!=='1'&&!hasPicked(d,v)&&hdNeed(d,v)){S.st={...S.st,d:{...d,dl:0,dv:-2}};simulPick(S.st.d,v,d.ph==='rn'?0:NOPICK);return;}}
  act(GAMES.hide.resolve(d,simulPicks(d).map(x=>x===undefined?null:x)));}
setInterval(()=>{if(S.st.g!=='hide')return;const d=S.st.d;if(!d||d.win!=null||!GAMES.hide)return;const now=Date.now();
  const ck=document.querySelector('.hd-clk b');if(ck){const l=hdClock(d),t=hdFmt(l);if(ck.textContent!==t)ck.textContent=t;ck.parentNode.classList.toggle('low',(d.ph==='sk'||d.ph==='rn')&&l<=30000);}
  const bar=document.querySelector('.hd-bar i');if(bar){const f=d.dl>0?Math.max(0,Math.min(1,(d.dl-now)/(d.T||HD_T.step))):1;bar.style.transform=`scaleX(${f.toFixed(3)})`;bar.parentNode.classList.toggle('low',d.dl>0&&d.dl-now<5000);}
  if(!isEnforcer()||S.holdRender||(S.mode!=='local'&&S.mode!=='online'))return;
  try{hdTick(d,now);}catch(e){console.error('hide tick',e);}},500);

HELP.hide='واحد «الغمّاض» يدوّر والباقين يتخبّون، وكل جولة يصير الغمّاض اللي بعده. الحارة فيها 16 مخبأ (سطح، حوش، ورا السيارة، برميل، بقالة…) و«البيت» برّاها، وهو المكان الآمن. أول شي كل متخبّي يختار مكانه بالسر وعنده 25 ثانية، وما يتخبّى اثنين بمكان واحد: اللي اختاره بعده يختار غيره. عند الغمّاض فتشات بعدد 6 + عدد المتخبّين (أقصاها 12). كل دور الغمّاض يختار بالسر: يفتّش مكان، أو يحرس البيت 🛡. بعده كل متخبّي يقرر بالسر: يبقى مكانه 🤫 ولا يركض للبيت 🏃. ركضت والغمّاض حارس البيت؟ انمسكت! ركضت وهو يفتّش؟ وصلت البيت بأمان. وإذا فتّش مكانك وأنت باقي فيه: لقيتك! وإذا فتّش مكان فاضي يطلع للكل تلميح عن أقرب متخبّي: 🔥 حار يعني جنبه، 🌤 دافي قريب، ❄️ بارد بعيد. وعند الغمّاض «اسمع 👂» مرة وحدة: يختار مربع 2×2 ويعرف هل فيه أحد ولا لا، والكل يشوف النتيجة. كل خطوة لها 15 ثانية (اللي ما يختار: الغمّاض تروح عليه الفتشة، والمتخبّي يبقى مكانه)، واللعبة كلها 3 دقايق، إذا خلصت وفيه أحد ما انمسك يفوز المتخبّين. النقاط: يلقى الغمّاض واحد = +15 له و−15 على اللي انمسك (وما تنزل نقاطك تحت الصفر). توصل البيت = +20. تصمد للآخر بدون ما تنمسك = +15. لو لقاهم كلهم ياخذ الغمّاض +10 زيادة ويفوز، ولو صمد واحد أو وصل البيت يفوزون المتخبّين. من 4 لاعبين وفوق المتخبّين فريق واحد: يفوزون سوا ويشوف كل واحد أماكن ربعه. على جوال واحد مرّروا الجوال وغطّوا الشاشة، والوقت يوقف وقت التمرير. من 3 لاعبين وفوق.';

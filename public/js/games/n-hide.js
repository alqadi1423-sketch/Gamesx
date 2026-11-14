'use strict';
/* =====================================================================================================
   «غميضة الحارة» (hide): the owner's street hide-and-seek, played on an illustrated night map of a Saudi حارة.
   Built on the shared kit KH (js/kit-hara.js): the art, the kids, the footpaths, the walking and the sounds.

   One seat seeks («الغمّاض», the next seat next round); the others hide in secret, one hider per place.
   العدّ: the seeker covers their eyes and counts to ten while the hiders pick a spot and walk to it (25 s).
   التفتيش, each turn: the seeker secretly searches a place, guards the house, or (once) lights a zone with «الكشاف»;
   then every hider still hidden secretly stays, sneaks to a free neighbouring spot on the footpaths, or runs home;
   then all is revealed: runners first (guarded: caught −15, else safe +20), then sneaks (a sneak can be heard: the
   zone is told; near the cat it meows), then the search (found: +15/−15) and a public hot/cold hint about the nearest
   hider by footpath steps (1 حار, 2 دافي, 3+ بارد). «اسمع» (once) tells whether anyone hides in a zone.
   Surprises drawn by the host, each at most once a round: the cat (meows at a sneak near it), the dog (barks when the
   seeker's secret choice is near it: a warning), «أبو سعد» at the grocery (the first search there finds nobody).
   In the last 40 s the mother calls «العشا جاهز!»: the steps get shorter. النهاية: everyone's path on the map.
   Searches min(12, 6 + hiders); 3 minutes; 15 s a step (10 s after the call). Points move through d.dsc.

   Secrets online: d.at (places) and d.hp (each hider's walked path) are masked per seat: a hider sees their own and,
   with 4+ players, their team-mates'; caught places are public; the seeker sees none. d.ch (the seeker's choice) is the
   seeker's alone until the reveal. d.tk (a place taken while hiding) and d.bl (a blocked sneak) only their hider's.
   ===================================================================================================== */
const HD_T={hide:25000,step:15000,fast:10000,game:180000,mom:40000};
const HDN=['سطح','حوش','ورا السيارة','برميل','بقالة','دكان','صندوق','بيت مهجور','مزرعة','استراحة','خزان','تحت الدرج','مخزن','ورا التريلة','حديقة','ورا الباب'];
const HD_HOME=16;
const HDH=['','حار','دافي','بارد'];
/* ---------- the map: where each place is, where its name goes, the footpaths, the zones ---------- */
const HDP=[[240,50],[288,96],[262,212],[140,224],[64,168],[137,168],[18,212],[181,410],[66,422],[58,326],[252,312],[349,150],[325,314],[64,240],[298,422],[252,166],[180,272]];
const HDLB=[[240,26],[288,134],[262,252],[140,198],[60,84],[137,108],[24,234],[181,466],[66,466],[58,374],[252,348],[322,192],[325,366],[64,284],[298,466],[238,192],[180,326]];
const HDE=[[0,1],[0,11,[[349,60]]],[1,15],[1,11,[[330,104]]],[11,15,[[349,182],[252,182]]],[11,2,[[349,190],[300,206]]],[15,2,[[252,190]]],
  [2,10,[[262,262]]],[2,16,[[220,244]]],[4,5,[[100,180]]],[4,6],[5,6,[[90,190]]],[5,3,[[137,200]]],[6,3,[[80,214]]],[6,13,[[30,232]]],[3,13,[[100,232]]],
  [3,16,[[160,246]]],[13,9,[[64,290]]],[13,16,[[130,262]]],[9,8,[[24,374]]],[9,7,[[120,374]]],[8,7,[[124,428]]],[7,14,[[240,420]]],[7,16,[[230,376],[230,292]]],
  [14,12,[[325,374]]],[12,10,[[290,330]]],[10,16,[[214,290]]]];
const HG=KH.graph({pos:HDP,edges:HDE});
const HDZ=[{n:'بيت الجيران',p:[0,1,11,15],poly:[[206,6],[358,6],[358,200],[206,200]]},
  {n:'جهة البقالة',p:[4,5,6],poly:[[4,6],[156,6],[156,190],[44,190],[44,222],[4,222]]},
  {n:'الشارع العام',p:[2,3,13],poly:[[4,228],[110,228],[110,208],[300,208],[300,236],[160,236],[160,262],[4,262]]},
  {n:'جهة المزارع',p:[7,8,9],poly:[[4,290],[118,290],[118,378],[232,378],[232,480],[4,480]]},
  {n:'جهة الخزان',p:[10,12,14],poly:[[226,290],[358,290],[358,480],[244,480],[244,378],[226,378]]}];
const HDZC=[[282,100],[80,100],[200,250],[92,420],[300,420]];
const hdZoneOf=p=>HDZ.findIndex(z=>z.p.includes(p));
const hdDist=(a,b)=>HG.D[a][b];
const hdHint=x=>x<=1?1:x===2?2:3;
const hdMaxN=n=>Math.min(12,6+(n-1));
const hdFmt=ms=>{const t=Math.ceil(Math.max(0,ms)/1000);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const hdClock=d=>d.end>0?Math.max(0,d.end-Date.now()):Math.max(0,d.gl);
const hdHidden=d=>d.pl.map((_,s)=>s).filter(s=>s!==d.sk&&d.hs[s]==='h');
const hdLocal=()=>S.mode==='local';
const hdStepT=d=>d.mo?HD_T.fast:HD_T.step;

/* ---------- who sees what ---------- */
function hdSees(d,me,s){if(d.win!=null)return true;if(s===d.sk)return false;if(d.hs[s]==='c'||d.hs[s]==='g'||d.hs[s]==='s')return true;if(me<0||me>=d.pl.length)return false;
  if(s===me)return true;return me!==d.sk&&d.pl.length>=4;}
function hdNeed(d,s){if(d.win!=null||s===d.sk||d.out[s]==='1'||d.hs[s]!=='h')return false;return d.ph==='hide'?d.at[s]<0:d.ph==='rn';}
const hdAuto=(d,s)=>d.win==null&&(d.ph==='hide'||d.ph==='rn')&&d.out[s]!=='1'&&!hdNeed(d,s);
// where hider s may sneak to: a neighbour on the footpaths (never the house; the house is a run)
const hdNbr=p=>p>=0&&p<16?HG.adj[p].filter(q=>q<16):[];

/* ---------- the clocks ---------- */
const hdArm=(d,T)=>hdLocal()?{...d,dl:0,dv:-2,T}:{...d,dl:Date.now()+T,dv:-1,T};
const hdPause=d=>hdLocal()&&d.end>0?{...d,gl:Math.max(0,d.end-Date.now()),end:0}:d;

/* ---------- the rules ---------- */
function hdSeek(d){const x={...d,ph:'sk',turn:d.sk,ch:-1};if(!hdLocal()&&!(x.end>0))x.end=Date.now()+HD_T.game;return hdArm(x,hdStepT(x));}
function hdPlace(d,picks){const n=d.pl.length,at=d.at.slice(),tk=Array(n).fill(-1),hp=d.hp.map(x=>x.slice());let again=false;const used=new Set(at.filter(p=>p>=0));
  const need=d.pl.map((_,s)=>hdNeed(d,s));
  for(let s=0;s<n;s++){if(!need[s])continue;const p=picks[s];if(!(Number.isInteger(p)&&p>=0&&p<16))continue;if(used.has(p)){tk[s]=p;again=true;}else{at[s]=p;used.add(p);}}
  for(let s=0;s<n;s++)if(need[s]&&at[s]<0&&tk[s]<0){const free=[...Array(16).keys()].filter(p=>!used.has(p));const p=free[rnd(free.length)];at[s]=p;used.add(p);}
  for(let s=0;s<n;s++)if(need[s]&&at[s]>=0)hp[s]=[HD_HOME,at[s]];
  const nd={...d,at,tk,hp,rd:d.rd+1};
  if(again)return hdArm(nd,HD_T.step);
  return hdSeek(nd);}
// the seeker decides: a place 0..15, the house 16, «الكشاف» on zone z = 100+z. The dog barks once when the choice is near it
function hdChoose(d,ch){const x=hdPause(d);let bk=-1,dk=d.dk;
  if(ch>=0&&ch<16&&!d.dk&&d.dg>=0&&hdDist(ch,d.dg)<=1){bk=hdZoneOf(d.dg);dk=1;}
  return hdArm({...x,ph:'rn',ch,bk,dk,rd:d.rd+1,turn:d.sk},hdStepT(d));}
// «اسمع»: is anyone hiding in this zone? (public; the seeker still has to choose)
function hdListen(d,z){const hid=hdHidden(d);return {...d,lq:z,lr:hid.some(s=>HDZ[z].p.includes(d.at[s]))?1:0,lh:hid.length,lk:d.ek+1,lt:d.n};}
/* the reveal. picks per seat: 0 stay, 1 run home, 2+p sneak to p. Runners first, then sneaks, then the search */
function hdTurn(d,ch,picks){const sk=d.sk,n=d.pl.length,pd=d.pd.slice(),at=d.at.slice(),hp=d.hp.map(x=>x.slice()),bl=Array(n).fill(-1);let hs=d.hs,out=d.out,lg=d.lg,cu=d.cu,gu=d.gu,tc=d.tc,sil=-1,sp=d.sp;
  const ev={k:d.ek+1,p:ch,f:-1,s:[],g:[],h:0,fs:-1,ft:'',gr:0,tz:-1,tp:-1,bk:d.bk,mv:0};
  const pk=s=>picks&&Number.isInteger(picks[s])?picks[s]:0;
  if(ch>=0){
    // runners
    for(let s=0;s<n;s++){if(!hdNeed(d,s)||pk(s)!==1)continue;hp[s].push(HD_HOME);
      if(ch===HD_HOME){hs=setAt(hs,s,'g');out=setAt(out,s,'1');pd[sk]+=15;pd[s]-=15;ev.g.push(s);}else{hs=setAt(hs,s,'s');pd[s]+=20;ev.s.push(s);}}
    // sneaks: to a free neighbouring place (a place someone stays in, or another sneaker claimed first, blocks it)
    const stay=new Set(),claim=new Set(),noisy=[];
    for(let s=0;s<n;s++)if(s!==sk&&hs[s]==='h'&&at[s]>=0)stay.add(at[s]);
    for(let s=0;s<n;s++){const q=pk(s)-2;if(!hdNeed(d,s)||hs[s]!=='h'||q<0)continue;const from=at[s];
      if(!hdNbr(from).includes(q)||stay.has(q)||claim.has(q)){bl[s]=q;continue;}
      claim.add(q);at[s]=q;hp[s].push(q);ev.mv++;
      const nearCat=d.ct>=0&&!cu&&(hdDist(from,d.ct)<=1||hdDist(q,d.ct)<=1);
      if(nearCat&&Math.random()<.75){cu=1;noisy.push([q,'cat']);}else if(Math.random()<.35)noisy.push([q,'step']);}
    if(noisy.length){const c=noisy.find(x=>x[1]==='cat')||noisy[rnd(noisy.length)];ev.fs=hdZoneOf(c[0]);ev.ft=c[1];}
    // the search, the guard or the torch
    if(ch===HD_HOME)sp=HD_HOME;
    else if(ch>=100){const z=ch-100;tc=1;const inz=d.pl.map((_,s)=>s).filter(s=>s!==sk&&hs[s]==='h'&&HDZ[z].p.includes(at[s]));ev.tz=z;
      if(inz.length){ev.tp=at[inz[rnd(inz.length)]];sil=ev.tp;}}
    else if(ch<16){sp=ch;const hid=d.pl.map((_,s)=>s).filter(s=>s!==sk&&hs[s]==='h');
      if(ch===4&&d.gr&&!gu){gu=1;ev.gr=1;lg=[...lg,[ch,-2,hid.length,d.n]];}
      else{const f=hid.find(s=>at[s]===ch);
        if(f!=null){hs=setAt(hs,f,'c');out=setAt(out,f,'1');pd[sk]+=15;pd[f]-=15;ev.f=f;}
        else{const left=hid;ev.h=left.length?hdHint(Math.min(...left.map(s=>hdDist(ch,at[s])))):4;}
        lg=[...lg,[ch,f!=null?0:ev.h,hid.length,d.n]];}}}
  const nd={...d,at,hp,bl,hs,out,pd,lg,ev,ek:ev.k,cu,gu,tc,sil,sp,bk:-1,n:d.n+1,ch:-1,gc:d.gc+(ch===HD_HOME?1:0),gs:ch===HD_HOME&&!ev.g.length?(d.gs||0)+1:0,to:d.to+(ch<0?1:0)};
  if(!hdHidden(nd).length)return hdEnd(nd,'');
  if(nd.n>=nd.N)return hdEnd(nd,'خلصت الفتشات');
  return hdSeek(nd);}
function hdEnd(d,why){const sk=d.sk,pd=d.pd.slice(),H=d.pl.map((_,s)=>s).filter(s=>s!==sk);
  const alive=H.filter(s=>d.hs[s]==='h'||d.hs[s]==='s'),caught=H.filter(s=>d.hs[s]==='c'||d.hs[s]==='g');let win,wins;
  if(!alive.length){if(!caught.length)return {...d,ph:'end',win:'d',why,dl:0,end:0};pd[sk]+=10;win=sk;wins=[sk];}
  else{H.forEach(s=>{if(d.hs[s]==='h')pd[s]+=15;});wins=d.pl.length>=4?H.filter(s=>d.hs[s]!=='x'):alive;win=alive[0];}
  return {...d,ph:'end',pd,dsc:pd,win,wins,why,dl:0,end:0,ch:-1,bk:-1};}

/* ---------- bots (they read only GAMES.hide.mask(d, seat)) ---------- */
function hdMem(){return S.hdMem||(S.hdMem={sk:{},hp:{},run:{n:0,r:0},seen:{},ns:0});}
/* what the public facts say: for every place, how likely a hider still hidden is there (summing to the hiders left).
   Hints age: hiders can sneak one step a turn, so an old hint allows that many steps of slack */
function hdBelief(v,lv){const key=v.gid+':'+v.n+':'+v.lq+':'+v.hs+':'+v.sil+':'+(v.ev&&v.ev.k)+':'+lv;if(S.hdPC&&S.hdPC.k===key)return S.hdPC.r;
  const hid=hdHidden(v),h=hid.length,w=Array(16).fill(1);
  for(const [p,code,hh,t] of v.lg){const age=Math.max(1,v.n-t),slack=age-1;
    if(code===-2){w[p]*=1.5;continue;}if(code===0)continue;
    w[p]*=slack===0?.03:Math.min(1,.2+.25*slack);
    for(let q=0;q<16;q++){if(q===p)continue;const dd=hdDist(p,q);
      if(dd<code-slack)w[q]*=.05;else if(code<3&&Math.abs(dd-code)<=slack)w[q]*=1+2.4/(Math.max(1,hh)*(1+slack));else if(code===3&&dd<3)w[q]*=.4;}}
  if(v.lq>=0){const age=v.n-(v.lt||0),zp=HDZ[v.lq].p;for(let q=0;q<16;q++){if(zp.includes(q))w[q]*=v.lr?1+3/(h||1)/(1+age):Math.min(1,.05+.3*age);}}
  const e=v.ev;if(e&&e.k===v.ek&&e.fs>=0)for(const q of HDZ[e.fs].p)w[q]*=2.4;
  if(v.sil>=0){w[v.sil]*=30;for(const q of hdNbr(v.sil))w[q]*=3;}
  if(lv>=3){const M=hdMem();hid.forEach(s=>{const hp=M.hp[v.pl[s]];if(!hp)return;const t=hp.reduce((a,b)=>a+b,0);if(t>=2)for(let p=0;p<16;p++)w[p]*=1+1.2*hp[p]/t;});}
  const tot=w.reduce((a,b)=>a+b,0),P=w.map(x=>tot>0?Math.min(1,x/tot*h):0);const r={P,h};S.hdPC={k:key,r};return r;}
const hdArgmax=(xs,f)=>{let b=-Infinity,o=[];for(const x of xs){const v=f(x);if(v>b+1e-9){b=v;o=[x];}else if(Math.abs(v-b)<=1e-9)o.push(x);}return o.length?o[rnd(o.length)]:null;};
const hdWPick=(xs,f)=>{const w=xs.map(f),t=w.reduce((a,b)=>a+b,0);if(!(t>0))return xs[rnd(xs.length)];let r=Math.random()*t;for(let i=0;i<xs.length;i++){r-=w[i];if(r<=0)return xs[i];}return xs[xs.length-1];};
function hdGuardP(d){const m=hdMem().sk[d.pl[d.sk]],h=hdHidden(d).length;let g=.08+.06*Math.min(h,6);
  if(m&&m.t){const w=m.t/(m.t+5);g=(1-w)*g+w*(m.g+.3)/(m.t+.6);}if(d.n)g=.7*g+.3*d.gc/d.n;if(d.N-d.n<=1)g+=.06;return Math.max(.04,Math.min(.85,g));}
const hdRunX=(q,g,last,lv)=>last?(20-35*g)-(15-30*q*(1-g)):q*(1-g)-g*(lv===3?.9:1.1);
const hdAim=P=>{const sum=P.reduce((a,x)=>a+Math.pow(x,3),0)||1;return p=>Math.pow(P[p],3)/sum;};
const hdZoneMass=(P,z)=>1-HDZ[z].p.reduce((a,p)=>a*(1-Math.min(.98,P[p])),1);
function hdSeekBot(d,s,lv){const v=GAMES.hide.mask(d,s),{P,h}=hdBelief(v,lv),rem=v.N-v.n,all=[...Array(16).keys()];
  const mx=Math.max(...P),flat=mx<1.5*h/16;
  if(v.lq<0&&rem>=2&&(lv===1?Math.random()<.12:flat&&Math.random()<(lv===3?.85:.5))){
    const z=lv===1?rnd(HDZ.length):hdArgmax([...HDZ.keys()],z=>-Math.abs(.5-hdZoneMass(P,z))+Math.random()*.02);return hdListen(d,z);}
  if(!v.tc&&rem>=3&&h>=1){const zb=hdArgmax([...HDZ.keys()],z=>hdZoneMass(P,z));
    if(lv===1?Math.random()<.06:lv===2?(flat&&Math.random()<.25):(mx<.45&&hdZoneMass(P,zb)>.6&&Math.random()<.7))return hdChoose(d,100+zb);}
  if(lv===1){if(h>=1&&Math.random()<.07)return hdChoose(d,HD_HOME);const p=Math.random()<.5?rnd(16):hdWPick(all,x=>P[x]+1e-6);return hdChoose(d,p);}
  const M=hdMem(),g=hdGuardP(v),aim=hdAim(P),last=rem<=1||hdClock(v)<16000;
  const base=Math.max(.03,Math.min(.5,(M.run.r+.5)/(M.run.n+8)))*(last?1.6:1);
  const rp=p=>Math.min(.9,hdRunX(aim(p),g,last,3)>0?(last?.8:.5):base);
  let gv=all.reduce((a,p)=>a+P[p]*rp(p),0);if((v.gs||0)>=2)gv*=.45;
  const best=hdArgmax(all,p=>P[p]*(1-rp(p))+(lv===2?Math.random()*.08:0));const sv=P[best]*(1-rp(best))+(rem>2?.06:0);
  if(h>=1&&(lv===3?gv>sv:gv>sv*1.35)!==(Math.random()<(lv===3?.08:.15)))return hdChoose(d,HD_HOME);
  return hdChoose(d,best);}
function hdHideBot(d,s,lv){const v=GAMES.hide.mask(d,s),M=hdMem(),m=M.sk[d.pl[d.sk]],mine=M.hp[d.pl[s]];
  const busy=new Set(v.at.filter((p,x)=>p>=0&&x!==s));if(v.tk[s]>=0)busy.add(v.tk[s]);
  const free=[...Array(16).keys()].filter(p=>!busy.has(p));if(!free.length)return rnd(16);if(lv===1)return free[rnd(free.length)];
  const mates=v.at.filter((p,x)=>p>=0&&x!==s&&x!==d.sk),mt=mine?mine.reduce((a,b)=>a+b,0):0;
  return hdArgmax(free,p=>{let x=Math.random()*(lv===3?1:3);if(m&&m.t)x-=(lv===3?7:3)*m.p[p]/m.t;if(mt)x-=(lv===3?3:1.5)*mine[p]/mt;
    if(mates.length)x+=.3*Math.min(...mates.map(q=>hdDist(p,q)));if(lv===3){x+=.15*hdNbr(p).length;if(p===4&&v.gr)x+=.6;if(v.ct>=0&&hdDist(p,v.ct)<=1)x-=.4;}return x;});}
// stay (0), run (1) or sneak (2+p): a bot sneaks away when the seeker gets warm around it
function hdRunBot(d,s,lv){const v=GAMES.hide.mask(d,s),my=v.at[s];if(my<0)return 0;
  const known=new Set(v.at.filter((p,x)=>p>=0&&x!==s&&x!==v.sk&&v.hs[x]==='h'));const opts=hdNbr(my).filter(q=>!known.has(q));
  if(lv===1){const r=Math.random();if(r<.12)return 1;if(r<.24&&opts.length)return 2+opts[rnd(opts.length)];return 0;}
  const {P}=hdBelief(v,2),rem=v.N-v.n,last=rem<=1||hdClock(v)<16000;
  let x=hdRunX(hdAim(P)(my),hdGuardP(v),last,lv);if(lv===2)x+=(Math.random()-.5)*(last?10:.3);
  if(x>0&&(last||Math.random()<(lv===3?.5:.75)))return 1;
  const warm=(v.sp>=0&&v.sp<16&&hdDist(v.sp,my)<=1)||(v.bk>=0&&HDZ[v.bk].p.includes(my))||v.sil===my||P[my]>.45;
  if(warm&&opts.length&&Math.random()<(lv===3?.85:.6)){
    const q=hdArgmax(opts,q=>-P[q]*3+(v.sp>=0?.4*hdDist(v.sp,q):0)-(v.ct>=0&&!v.cu&&hdDist(q,v.ct)<=1?1.2:0)-(v.sil===q?5:0)+Math.random()*(lv===3?.2:.8));return 2+q;}
  return 0;}

/* ---------- drawing ---------- */
const hdName=p=>p===HD_HOME?'البيت':p>=100?'«'+HDZ[p-100].n+'»':HDN[p]||'';
const HDW=360,HDHt=484;
function hdArt(){const A=KH.art;let s=A.defs()+`<rect width="${HDW}" height="${HDHt}" fill="${KH.C.ground}"/>`;
  const blk=(x,y,w,h)=>`<rect x="${x-4}" y="${y-4}" width="${w+8}" height="${h+8}" rx="12" fill="${KH.C.walk}"/><rect x="${x-4}" y="${y-4}" width="${w+8}" height="${h+8}" rx="12" fill="none" stroke="#F0B429" stroke-width="3" stroke-dasharray="8 8" opacity=".7"/><rect x="${x+5}" y="${y+5}" width="${w-10}" height="${h-10}" rx="8" fill="${KH.C.yard}"/>`;
  s+=blk(0,-20,156,222)+blk(202,-20,158,222)+blk(0,278,360,226);
  s+=`<rect x="160" y="0" width="38" height="210" fill="${KH.C.asph}"/><rect x="0" y="206" width="360" height="66" fill="${KH.C.asph}"/><path d="M0 239H360" stroke="#8C9BB6" stroke-opacity=".4" stroke-width="2.4" stroke-dasharray="12 10"/>`+
    `<path d="M170 210v58M178 210v58M186 210v58" stroke="#fff" stroke-opacity=".08" stroke-width="4"/>`;
  s+=A.pool(158,204,80)+A.pool(206,276,74)+A.pool(330,206,60)+A.pool(40,276,60)+A.pool(110,372,54)+A.pool(250,372,54);
  // the faint footpaths
  s+=`<g fill="none" stroke="#E9D9B8" stroke-opacity=".28" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 6">${HDE.map(([a,b])=>`<path d="M${HG.edge(a,b).map(p=>p.join(' ')).join('L')}"/>`).join('')}</g>`;
  // neighbours' Najdi house: roof, courtyard, door, stairs
  s+=A.roof(208,18,138,120,{face:20,wins:[18,98,122],doors:[[44,'#7A4A2A']]})+A.court(258,64,60,58)+A.tree(288,93,13)+`<rect x="222" y="34" width="16" height="10" rx="2" fill="#7F93A8" stroke="${KH.OL}" stroke-width="1.2"/><circle cx="326" cy="34" r="8" fill="#E7EEF6" stroke="${KH.OL}" stroke-width="1.4"/>`;
  let steps='';for(let i=0;i<9;i++)steps+=`<rect x="347" y="${70+i*10}" width="13" height="10" fill="${i%2?'#C9A57A':'#DDBE92'}" stroke="${KH.OL}"/>`;s+=`<rect x="349" y="76" width="11" height="92" fill="#060B16" opacity=".55"/>`+steps;
  // grocery, دكان, crates
  s+=A.shop(8,24,104,110,{awning:1})+A.roof(118,62,38,72,{roof:'#93785A',face:24})+`<rect x="122" y="138" width="30" height="16" rx="2" fill="#8EA0B8" stroke="${KH.OL}" stroke-width="1.3"/><path d="M124 142h26M124 146h26M124 150h26" stroke="#5D6E86" stroke-width="1.2"/>`;
  s+=A.crate(16,200)+A.crate(32,208,14,18)+A.crate(20,216,12,-10);
  // street: barrels, car, trailer
  s+=A.barrel(130,226)+A.barrel(150,232,'#2E6FB0')+A.barrel(140,244)+A.car(262,226,'#F4F6FA',1.05)+A.trailer(60,254,.9);
  // the house (البيت): safe mat, roof, door, flag
  s+=`<circle cx="180" cy="270" r="26" fill="#3FAE5C" opacity=".25"/><circle cx="180" cy="270" r="26" fill="none" stroke="#7BEA9C" stroke-width="2.6" stroke-dasharray="6 5"/>`;
  s+=A.roof(138,292,84,70,{par:'#E6C89E',roof:'#BC986D'})+A.door(180,292,18)+A.court(166,312,28,24)+`<path d="M212 298v-16" stroke="${KH.OL}" stroke-width="2"/><path d="M212 282l14 4-14 4z" fill="#3FAE5C" stroke="${KH.OL}" stroke-width="1.2"/>`;
  // استراحة, خزان, مخزن
  s+=A.tent(8,292,100,72)+A.tank(252,312)+A.shed(296,288,58,46);
  // مزرعة, بيت مهجور, حديقة
  s+=A.field(8,386,120,92)+A.palm(30,406,.85)+A.palm(104,430,.95,20)+A.palm(52,458,.75,40);
  s+=A.ruin(136,384,92,64);
  s+=`<rect x="238" y="386" width="116" height="92" rx="16" fill="${KH.C.green}"/><path d="M238 460q40-6 54-40t62-26" fill="none" stroke="#C9B48E" stroke-width="8" stroke-linecap="round"/>`+A.tree(258,404,14)+A.tree(336,452,16,'#43A06E')+A.tree(258,456,11)+`<rect x="304" y="400" width="22" height="7" rx="2" fill="#C98F58" stroke="${KH.OL}" stroke-width="1.2"/><circle cx="282" cy="436" r="2.6" fill="#EE7FB3"/><circle cx="289" cy="443" r="2.6" fill="#F0B429"/>`;
  s+=A.palm(186,40,.7,20)+A.palm(352,250,.75)+A.palm(232,284,.62,15)+A.palm(126,286,.6,40);
  s+=`<rect width="${HDW}" height="${HDHt}" fill="url(#v)"/>`;
  s+=A.lamp(158,204)+A.lamp(206,276)+A.lamp(330,206)+A.lamp(40,276)+A.lamp(110,372)+A.lamp(250,372);
  return s;}
let HD_BG='';
const hdBg=()=>HD_BG||(HD_BG=KH.bg('hide',HDW,HDHt,hdArt()));
// a name on a solid pill (13 px or more on a phone); o.sel bigger and gold
function hdPill(x,y,t,o={}){const fs=o.fs||14,w=KH.tw(t,fs)+14,h=fs+10;const c=o.cls||'';x=Math.max(w/2*(o.sel?1.2:1)+3,Math.min(HDW-3-w/2*(o.sel?1.2:1),x));
  return `<g class="hd-pl ${c}" transform="translate(${x} ${y})${o.sel?' scale(1.2)':''}"><rect x="${KH.f(-w/2)}" y="${-h/2}" width="${KH.f(w)}" height="${h}" rx="${h/2}"/><text y="${KH.f(fs*.36)}" font-size="${fs}">${t}</text></g>`;}
function hdHintBadge(x,y,c){const m={1:['حار','#E5484D'],2:['دافي','#F28C38'],3:['بارد','#3D8FD1'],[-2]:['أبو سعد','#8A5A2B']}[c];if(!m)return '';
  return `<g class="hd-hb" transform="translate(${x} ${y})"><rect x="-22" y="-10" width="44" height="20" rx="10" fill="${m[1]}" stroke="#fff" stroke-width="2"/><text y="4.6" font-size="12.5">${m[0]}</text></g>`;}
// one character, positioned with a CSS transform so it can walk (KH.walk) along the footpaths
const hdCh=(k,node,x,y,inner,o={})=>`<g class="kh-ch ${o.cls||''}" data-k="${k}" data-n="${node}"${o.from!=null?` data-f="${o.from}"`:''} data-ox="${KH.f(x-HDP[node][0])}" data-oy="${KH.f(y-HDP[node][1])}" style="transform:translate(${KH.f(x)}px,${KH.f(y)}px)">${inner}</g>`;
const BANTER={found:['ياخي لقيتني!','حظي زفت!','كان بغيت أركض!'],safe:['أمان! أمان!','وصلت البيت!','ما لحقتني!'],hot:['قرّب منا… اسكت!','لا تتنفس!','وش ذا القرب!'],cold:['بعيد عنا، ارتاح','هو ضايع!','ما يدري وينّا'],guard:['ما أحد ركض؟','حارس البيت يطالع…'],bark:['اششش يا الكلب!','الكلب بيفضحنا!'],meow:['القطوة فضحتنا!','بس يا قطوة!'],steps:['سمعت خطوات!','فيه أحد يتحرك…'],grocer:['أبو سعد ستر عليه!','أبو سعد: ما عندي أحد'],torch:['نوّر الكشاف!','وش هالضو!']};
const hdLine=(kind,k)=>{const L=BANTER[kind];return L?L[k%L.length]:'';};

/* the map, as seat `me` may see it. o: pick(p) selectable, sel, mode ('lsn'|'torch'|'sneak'), zsel */
function hdMapSVG(d,ctx,o){const me=o.me,fin=d.win!=null,e=d.ev,n=d.pl.length,P=HDP;let s='';
  const zoneP=z=>`M${HDZ[z].poly.map(p=>p.join(' ')).join('L')}Z`;
  // zones: tappable in «اسمع»/«الكشاف» mode; the last «اسمع» answer; the torch's zone
  let znames='';if(o.mode==='lsn'||o.mode==='torch')HDZ.forEach((z,i)=>{s+=`<path class="hd-zn ${o.zsel===i?'on':''} ${o.mode}" d="${zoneP(i)}" data-ga="zsel" data-i="${i}"/>`;znames+=`<g class="hd-zl" data-ga="zsel" data-i="${i}">${hdPill(HDZC[i][0],HDZC[i][1],z.n,{fs:15,cls:'zone '+(o.zsel===i?'sel':'')})}</g>`;});
  else{if(d.lq>=0&&!fin&&d.lk>=d.ek)s+=`<path class="hd-zn res ${d.lr?'yes':'no'}" d="${zoneP(d.lq)}"/>`;
    if(e&&e.tz>=0&&!fin&&e.k===d.ek)s+=`<path class="hd-zn torch on" d="${zoneP(e.tz)}"/>`;
    if(e&&e.fs>=0&&!fin&&e.k===d.ek)s+=`<path class="hd-zn heard" d="${zoneP(e.fs)}"/>`;
    if(d.bk>=0&&!fin)s+=`<path class="hd-zn heard" d="${zoneP(d.bk)}"/>`;}
  // bright paths: my sneak options, my run home, the seeker's last walk, everyone's path at the end
  const line=(pts,cls,c)=>`<path class="hd-path ${cls}" d="M${pts.map(p=>p.map(KH.f).join(' ')).join('L')}"${c?` style="--c:${c}"`:''}/>`;
  if(o.mode==='sneak'&&o.from>=0)for(const q of hdNbr(o.from))if(o.pick(q))s+=line(HG.edge(o.from,q),'sneak'+(o.sel===q?' on':''));
  if(o.runFrom>=0)s+=line(HG.pts(o.runFrom,HD_HOME),'run');
  if(!fin&&e&&e.k===d.ek&&o.walkFrom!=null&&o.walkFrom!==d.sp)s+=line(HG.pts(o.walkFrom,d.sp),'seek');
  if(fin)d.pl.forEach((_,sx)=>{const h=d.hp[sx];if(sx===d.sk||!h||h.length<2)return;const pts=[];for(let i=1;i<h.length;i++)pts.push(...HG.pts(h[i-1],h[i]).slice(i>1?1:0));s+=line(pts,'trail',col(d,sx));});
  // searched spots and their hints (the last search of each place)
  const last={};d.lg.forEach(([p,c])=>{last[p]=c;});
  for(const p in last){const [x,y]=P[p];const c=last[p];s+=`<g class="hd-dust" transform="translate(${x} ${y+8})"><path d="M-12 4c-2-4 2-7 5-5 1-4 7-5 9-1 3-2 8 0 7 4 3 0 4 3 2 4z"/></g>`;if(c!==0)s+=hdHintBadge(x+(x>300?-18:18),y-18,c);}
  // the cat, the dog, the grocer
  if(d.ct>=0){const [x,y]=P[d.ct];s+=KH.sprite('cat',x+22,y+10,{s:.75});}
  if(d.dg>=0){const [x,y]=P[d.dg];s+=KH.sprite('dog',x-22,y+14,{s:.7,flip:x>180});}
  if(d.gr){s+=KH.sprite('grocer',P[4][0]-26,P[4][1]-6,{s:.55});if(d.gu)s+=`<text class="hd-tag" x="${P[4][0]-26}" y="${P[4][1]+12}">✓</text>`;}
  // the hiders this seat may see
  const kids=[];
  d.pl.forEach((_,sx)=>{if(sx===d.sk)return;const st=d.hs[sx],p=d.at[sx];const c=col(d,sx),k='ch'+sx;
    if(st==='s'){kids.push(hdCh(k,HD_HOME,P[16][0]-30+sx*9,P[16][1]+6,KH.sprite('cheer',0,0,{who:d.pl[sx],c,s:.62})+(sx===me?hdMeTag(0,-44):''),{cls:'safe'}));return;}
    if(st==='g'){kids.push(hdCh(k,HD_HOME,P[16][0]+24-sx*7,P[16][1]+10,KH.sprite('caught',0,0,{who:d.pl[sx],c,s:.62}),{cls:'got'}));return;}
    if(p<0||!hdSees(d,me,sx)){if(d.ph==='hide'&&hdSees(d,me,sx)&&st==='h')kids.push(hdCh(k,HD_HOME,P[16][0]-36+sx*10,P[16][1]+12,KH.sprite('stand',0,0,{who:d.pl[sx],c,s:.6})+(sx===me?hdMeTag(0,-40):'')));return;}
    const [x,y]=P[p];
    if(st==='c')kids.push(hdCh(k,p,x,y+4,KH.sprite('caught',0,0,{who:d.pl[sx],c,s:.7}),{cls:'got'}));
    else kids.push(hdCh(k,p,x,y,KH.sprite('peek',0,0,{who:d.pl[sx],c,s:1.05,flip:x>200})+(sx===me?hdMeTag(0,-20):''),{cls:sx===me?'me':'mate',from:d.n===0||d.hp[sx].length<=2?HD_HOME:null}));});
  if(d.sil>=0&&!fin){const [x,y]=P[d.sil];s+=`<g class="hd-sil" data-k="sil${d.ek}">${KH.sprite('sil',x,y,{s:1.1})}<text x="${x}" y="${y-18}">؟</text></g>`;}
  s+=kids.join('');
  // the seeker: counting at the house, walking with the torch, guarding the door
  {const c=col(d,d.sk),sp=d.ph==='hide'?HD_HOME:d.sp;const [x,y]=P[sp];const ox=sp===HD_HOME?0:16,oy=sp===HD_HOME?-2:16;const flip=x>200;
    let inner;
    if(d.ph==='hide'&&!fin)inner=KH.sprite('count',0,0,{who:d.pl[d.sk],c,s:.85})+`<g class="hd-cnt">${KH.say(8,-52,'واحد…',{fs:14,w:104,dx:44})}</g>`;
    else inner=(fin?'':KH.beam(flip?-14:14,-24*.8,flip?200:-20,80,26))+KH.sprite(fin?'stand':'torch',0,0,{who:d.pl[d.sk],c,s:.8,flip});
    s+=hdCh('chsk',sp,x+ox,y+oy,inner,{cls:'sk'});}
  if(d.mo&&!fin)s+=KH.sprite('mom',P[16][0]+38,P[16][1]+30,{s:.75})+`<g class="hd-mom" data-k="mom">${KH.say(P[16][0]+48,P[16][1]-2,'العشا جاهز!',{fs:13,dx:-10})}</g>`;
  // the names (every place, the house), the selection bigger and gold
  const pill=p=>p===HD_HOME?hdPill(HDLB[16][0],HDLB[16][1],'البيت',{fs:15,sel:o.sel===HD_HOME,cls:'home '+(o.sel===HD_HOME?'sel ':'')+(o.pick(HD_HOME)?'can':'')}):hdPill(HDLB[p][0],HDLB[p][1],HDN[p],{sel:o.sel===p,cls:(o.sel===p?'sel ':'')+(o.pick(p)?'can':'')+(o.mode==='sneak'&&o.sel!==p&&o.pick(p)?' sn':'')});
  for(let p=0;p<=16;p++)if(p!==o.sel)s+=pill(p);if(o.sel>=0&&o.sel<=16)s+=pill(o.sel);
  // what just happened on the map
  if(e&&e.k===d.ek&&!fin){
    if(e.f>=0){const [x,y]=P[e.p];s+=`<g class="hd-fx" data-k="fx${e.k}">${KH.burst(x,y-34,'لقيتك!',{c:'#EC6158',s:.72})}</g>`;}
    if(e.s.length)s+=`<g class="hd-fx" data-k="sf${e.k}">${KH.say(P[16][0]-30,P[16][1]-14,'أمان!',{fill:'#3FAE5C',col:'#fff',fs:14})}</g>`;
    if(e.g.length)s+=`<g class="hd-fx" data-k="gd${e.k}">${KH.burst(P[16][0]+30,P[16][1]-30,'لقيتك!',{s:.62})}</g>`;
    if(e.ft==='cat'&&d.ct>=0)s+=`<g class="hd-fx" data-k="mw${e.k}">${KH.say(P[d.ct][0]+22,P[d.ct][1]-6,'مياو!',{fs:12})}</g>`;
    if(e.gr)s+=`<g class="hd-fx" data-k="gr${e.k}">${KH.say(P[4][0]-20,P[4][1]-26,'ما عندي أحد!',{fs:12,dx:16})}</g>`;}
  if(d.bk>=0&&d.dg>=0&&!fin)s+=`<g class="hd-fx" data-k="bk${d.rd}">${KH.say(P[d.dg][0]-20,P[d.dg][1]-6,'هاو هاو!',{fs:12})}</g>`;
  s+=znames;
  // tap areas: 48×48 around each selectable place and on its name
  for(let p=0;p<=16;p++){if(!o.pick(p))continue;const [x,y]=P[p],[lx,ly]=HDLB[p];
    s+=`<g class="hd-tap" data-ga="sel" data-i="${p}"><rect x="${x-24}" y="${y-24}" width="48" height="48"/><rect x="${lx-30}" y="${ly-14}" width="60" height="28"/></g>`;}
  if(o.sel>=0&&o.sel<=16&&o.pick(o.sel)){const [x,y]=P[o.sel];s+=`<circle class="hd-ring" cx="${x}" cy="${y}" r="22"/>`;}
  return `<div class="hd-map ${hdBg()} ${o.mode?'m-'+o.mode:''}" data-k="map"><svg viewBox="0 0 ${HDW} ${HDHt}" aria-label="خريطة الحارة">${s}</svg></div>`;}
const hdMeTag=(x,y)=>`<g class="hd-me-tag" transform="translate(${x} ${y})"><rect x="-14" y="-9" width="28" height="18" rx="9"/><text y="4.4">أنا</text></g>`;

/* the HUD: the 3 minutes, the searches left, the step's seconds, the powers */
function hdHud(d,me,near){const fin=d.win!=null,l=hdClock(d),run=(d.ph==='sk'||d.ph==='rn')&&!fin,on=!fin&&d.dl>0;
  const frac=Math.max(0,Math.min(1,l/HD_T.game)),C=2*Math.PI*15;const left=d.N-d.n;
  const step=on?Math.max(0,Math.min(1,(d.dl-Date.now())/(d.T||HD_T.step))):1;
  const role=near?`<span class="hd-role beat" data-k="bt${d.ek}">💓 قريب منك!</span>`:me<0||me===d.sk||d.hs[me]==='h'?'':d.hs[me]==='s'?`<span class="hd-role ok">🏠 بأمان</span>`:d.hs[me]==='c'||d.hs[me]==='g'?`<span class="hd-role out">😵 انمسكت</span>`:'';
  return `<div class="hd-hud"><span class="hd-clk ${run&&l<=HD_T.mom?'low':''}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="tr"/><circle cx="18" cy="18" r="15" class="fg" stroke-dasharray="${KH.f(C*frac)} ${KH.f(C)}" transform="rotate(-90 18 18)"/></svg><b>${hdFmt(l)}</b></span>
    <span class="hd-left" aria-label="باقي ${left} فتشات"><b>${left}</b><small>فتشات</small><i class="hd-pips">${[...Array(d.N)].map((_,k)=>`<u class="${k<left?'on':''}"></u>`).join('')}</i></span>
    <span class="hd-pw ${d.lq>=0?'used':''}" title="اسمع">👂</span><span class="hd-pw ${d.tc?'used':''}" title="الكشاف">🔦</span>${role}
    <span class="hd-sec ${on?'':'off'}"><b ${on?`data-until="${d.dl}"`:''}>${on?Math.ceil(Math.max(0,d.dl-Date.now())/1000):Math.round((d.T||HD_T.step)/1000)}</b></span></div>
    <div class="hd-bar ${on?'':'idle'}"><i style="transform:scaleX(${step.toFixed(3)})"></i></div>`;}
// what just happened (shown in the status card): {i:icon, t:title, x:detail, c:class}
function hdEvent(d,me){const e=d.ev,N=s=>pname(d.pl[s]);
  if(d.ph==='hide')return {i:'🙈',t:me===d.sk?'غمّض عيونك وعدّ للعشرة!':'العدّ بدأ! تخبّى قبل «عشرة»',x:`${N(d.sk)} الغمّاض هالجولة`,c:'count'};
  if(d.mo&&d.mk===d.ek)return {i:'🍲',t:'«العشا جاهز!» الأم تنادي',x:'آخر الوقت، الخطوات أقصر',c:'mom'};
  if(d.bk>=0&&d.ph==='rn')return {i:'🐕',t:'الكلب ينبح!',x:`في «${HDZ[d.bk].n}»: الغمّاض قريب منه`,c:'bark'};
  if(d.lq>=0&&d.lk===d.ek+1)return {i:'👂',t:`${d.lr?'فيه أحد':'ما فيه أحد'} في «${HDZ[d.lq].n}»`,x:`${N(d.sk)} تسمّع`,c:'ls '+(d.lr?'yes':'no')};
  if(!e)return {i:'🔦',t:'خلص العدّ! التفتيش بدأ',x:`${d.N} فتشات و3 دقايق`,c:'go'};
  let i='🔦',t='',x='',c='h'+e.h;
  if(e.p<0){i='⏱';t=`راحت الفتشة على ${N(d.sk)}`;x='ما اختار بالوقت';c='to';}
  else if(e.p===HD_HOME){i='🛡';t=e.g.length?`حرس البيت ومسك ${e.g.map(N).join(' و')}!`:'حرس البيت… وما ركض أحد';x=hdLine(e.g.length?'found':'guard',e.k);c=e.g.length?'got':'gd';}
  else if(e.p>=100){i='🔦';t=e.tp>=0?`الكشاف نوّر «${HDZ[e.tz].n}»: فيه ظل!`:`الكشاف نوّر «${HDZ[e.tz].n}»: ما فيه أحد`;x=hdLine('torch',e.k);c='tz';}
  else if(e.gr){i='🏪';t='أبو سعد: «ما عندي أحد!»';x='يستر مرة وحدة بالجولة';c='gr';}
  else if(e.f>=0){i='🎯';t=`لقيتك يا ${N(e.f)}!`;x=`في «${HDN[e.p]}» +15`;c='got';}
  else{i=e.h===1?'🔥':e.h===2?'🌤':'❄️';t=`«${HDN[e.p]}» فاضي: ${HDH[e.h]||''}`;x=hdLine(e.h===1?'hot':'cold',e.k);}
  if(e.s.length)x=`🏠 ${e.s.map(N).join(' و')} وصل البيت +20`+(x?' • '+x:'');
  if(e.fs>=0)x=(e.ft==='cat'?'🐈 القطوة ماوت في ':'👣 سمع خطوات في ')+`«${HDZ[e.fs].n}»`;
  return {i,t,x,c};}
// the round's end: everyone, what happened, and the points
function hdSum(d){const out=s=>s===d.sk?'الغمّاض 👀':({h:'صمد للآخر 🙈',c:'انمسك 😵',g:'انمسك وهو يركض 😵',s:'وصل البيت 🏠',x:'طلع'})[d.hs[s]]||'';
  return `<div class="hd-sum">${d.pl.map((r,s)=>{const x=(d.dsc||d.pd)[s]||0;const h=d.hp[s]||[];return `<div class="hd-sr ${s===d.sk?'sk':d.hs[s]}" style="--c:${col(d,s)}"><i>${KH.face({who:r,ring:1,size:30,mood:s===d.sk?(d.win===d.sk?'g':'sad'):d.hs[s]==='c'||d.hs[s]==='g'?'sad':'g'})}</i><b>${nm(d,s)}</b><span>${out(s)}${s!==d.sk&&h.length>1?` • ${h.slice(1).map(hdName).join(' ← ')}`:''}</span><em class="${x>0?'up':x<0?'dn':''}">${x>0?'+'+x:x<0?'−'+(-x):'0'}</em></div>`;}).join('')}</div>`;}

GAMES.hide={name:'غميضة الحارة',cat:'party',lbc:'#C0612B',minP:3,teams:'none',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#22324F"/><circle cx="80" cy="18" r="9" fill="#FFF1C2"/><circle cx="85" cy="14" r="8" fill="#22324F"/><circle cx="20" cy="14" r="1.4" fill="#fff"/><circle cx="48" cy="9" r="1.1" fill="#fff"/><ellipse cx="28" cy="70" rx="34" ry="22" fill="#FFD873" opacity=".22"/><path d="M28 34v-8q0-4 4-4h6" stroke="#3A4860" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="38" cy="24" r="4" fill="#FFE7A0"/><rect y="84" width="100" height="16" fill="#1B2537"/><path d="M0 92h100" stroke="#8C9BB6" stroke-width="2" stroke-dasharray="7 6" opacity=".6"/><path d="M58 100V78c0-8 6-12 13-12s13 4 13 12v22z" fill="#EC6158"/><circle cx="71" cy="56" r="13" fill="#F2C29B" stroke="#17233A" stroke-width="2"/><path d="M57.5 54a13.5 13.5 0 0 1 27 0z" fill="#EC6158" stroke="#17233A" stroke-width="2"/><path d="M71 51h16a3 3 0 0 1 0 6H71z" fill="#EC6158" stroke="#17233A" stroke-width="2"/><ellipse cx="66" cy="59" rx="3.4" ry="4" fill="#fff"/><ellipse cx="75" cy="59" rx="3.4" ry="4" fill="#fff"/><circle cx="67.5" cy="60" r="2" fill="#17233A"/><circle cx="76.5" cy="60" r="2" fill="#17233A"/><rect x="2" y="40" width="62" height="60" fill="#D6B588" stroke="#17233A" stroke-width="2"/><path d="M2 40h62" stroke="#EED7AE" stroke-width="5" stroke-dasharray="6 4"/><path d="M10 54l4-6 4 6zM22 54l4-6 4 6zM34 54l4-6 4 6zM46 54l4-6 4 6z" fill="#4A3424" opacity=".7"/><rect x="22" y="66" width="20" height="34" rx="2" fill="#7A4A2A" stroke="#17233A" stroke-width="2"/><g fill="#F2C29B" stroke="#17233A" stroke-width="1.6"><circle cx="61" cy="66" r="4"/><circle cx="61" cy="74" r="4"/></g></svg>`,
  init:n=>({ph:'hide',sk:0,hs:'',at:Array(n).fill(-1),tk:Array(n).fill(-1),bl:Array(n).fill(-1),hp:Array.from({length:n},()=>[]),ch:-1,n:0,N:hdMaxN(n),lg:[],gc:0,to:0,lq:-1,lr:0,lh:0,lk:0,lt:0,gs:0,ev:null,ek:0,pd:Array(n).fill(0),dl:0,dv:-2,T:HD_T.hide,end:0,gl:HD_T.game,rd:0,why:'',
    ct:-1,cu:0,dg:-1,dk:0,bk:-1,gr:0,gu:0,tc:0,sil:-1,sp:HD_HOME,mo:0,mk:-1}),
  // the seeker is the round's starter; the host draws where the cat and the dog are, and whether أبو سعد is in his shop
  start(d){const n=d.pl.length,sk=d.st%n;const pl=[...Array(16).keys()],ct=pl.splice(rnd(16),1)[0],dg=pl.filter(p=>hdDist(p,ct)>=2)[rnd(pl.filter(p=>hdDist(p,ct)>=2).length)];
    return hdArm({...d,sk,turn:sk,hs:d.pl.map((_,s)=>s===sk?'k':'h').join(''),ph:'hide',rd:1,ct,dg:dg==null?-1:dg,gr:Math.random()<.7?1:0},HD_T.hide);},
  simulNow:d=>d.ph==='hide'||d.ph==='rn',
  mask(d,seat){if(d.win!=null)return d;const sees=s=>hdSees(d,seat,s);
    return {...d,at:d.at.map((p,s)=>sees(s)?p:-1),hp:d.hp.map((h,s)=>sees(s)?h:[]),tk:d.tk.map((x,s)=>s===seat?x:-1),bl:d.bl.map((x,s)=>s===seat?x:-1),ch:seat>=0&&seat===d.sk?d.ch:-1};},
  privInit:(d,r)=>{const s=d.pl.indexOf(r);return s>=0&&hdAuto(d,s)?{rd:d.rd,pick:NOPICK}:{};},
  privStale:(d,p,r)=>{const s=d.pl.indexOf(r);return s>=0&&hdAuto(d,s)&&!(p.rd===d.rd&&p.pick===NOPICK);},
  privOk:(d,r,o,p)=>{if(p.pick==null||p.pick===NOPICK||p.rd!==d.rd)return true;const s=d.pl.indexOf(r);if(s<0||!hdNeed(d,s))return false;
    if(d.ph==='hide')return Number.isInteger(p.pick)&&p.pick>=0&&p.pick<16;
    return p.pick===0||p.pick===1||(Number.isInteger(p.pick)&&hdNbr(d.at[s]).includes(p.pick-2));},
  net:{local:['sel','mode','zsel','back'],ui:['hdSel','hdM','hdZ']},
  viewer:d=>d.win!=null?null:d.ph==='sk'?(isBot(d,d.sk)?null:d.sk):simulViewer(d),
  coverMsg:d=>d.ph==='hide'?`<span class="hd-cv">الغمّاض يعدّ: <b class="hd-cnt-t">واحد…</b></span>${d.rd>1?'<br>اللي انأخذ مكانه يختار غيره':''}`:d.ph==='sk'?(d.ev?hdEvTxt(d)+' — ':'خلص العدّ! ')+'دورك تدوّر 👀':d.ph==='rn'?'الغمّاض اختار بالسر… تبقى، تتسلّل، ولا تركض؟':'',
  points:d=>d.pl.map((_,s)=>{const x=d.pd[s],st=d.hs[s];const ic=s===d.sk?'👀':st==='c'||st==='g'?'😵':st==='s'?'🏠':st==='x'?'':'🙈';return (ic+(x?' '+(x>0?'+'+x:'−'+(-x)):'')).trim();}),
  winText:d=>d.win==='d'?'انتهت الجولة':d.win===d.sk?`${nm(d,d.sk)} لقاهم كلهم! 👀`:d.pl.length>=4?'فاز فريق المتخبّين! 🙈':`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')}! 🙈`,
  winExtra:d=>`${d.why?d.why+' • ':''}`+d.pl.map((_,s)=>{const x=(d.dsc||d.pd)[s]||0;return `${nm(d,s)} ${x>0?'+'+x:x<0?'−'+(-x):'0'}`;}).join('، '),
  status(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1,iSk=me===d.sk,e=hdEvent(d,me),hidden=me>=0&&!iSk&&d.hs[me]==='h';
    let todo='';
    if(d.ph==='hide')todo=iSk?'عيونك مسكّرة… الكل يتخبّى':ctx.my?(d.tk[v]>=0?'المكان مأخوذ، اختر غيره':'اختر مخباك من الخريطة'):'الكل يتخبّى…';
    else if(d.ph==='sk')todo=iSk&&ctx.my?'دورك: فتّش مكان، احرس البيت، أو نوّر جهة':`${pname(d.pl[d.sk])} يدوّر بالسر 👀`;
    else if(d.ph==='rn')todo=ctx.my&&hidden?'تبقى، تتسلّل، ولا تركض للبيت؟':iSk?'اخترت… ننتظرهم يقررون':'المتخبّين يقررون…';
    return `<div class="hd-st ${e.c}"><i>${e.i}</i><span><b>${e.t}</b>${e.x?`<small>${e.x}</small>`:''}</span></div>`+(todo?`<p class="hd-todo ${ctx.my?'yt':''}">${todo}</p>`:'');},
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1,fin=d.win!=null,iSk=me===d.sk;
    const key=d.gid+':'+d.ph+':'+d.rd+':'+d.n+':'+me;if(S.hdKey!==key){S.hdKey=key;S.hdSel=-1;S.hdM='';S.hdZ=-1;}
    let sel=Number.isInteger(S.hdSel)?S.hdSel:-1,mode=S.hdM||'',zsel=Number.isInteger(S.hdZ)?S.hdZ:-1;
    const myP=me>=0&&!iSk?d.at[me]:-1,hidden=me>=0&&!iSk&&d.hs[me]==='h';
    const mates=new Set(d.at.filter((p,s)=>p>=0&&s!==me&&s!==d.sk&&hdSees(d,me,s)&&d.hs[s]==='h'));
    const myPick=me>=0&&ctx.priv&&ctx.priv[d.pl[me]]&&ctx.priv[d.pl[me]].rd===d.rd?ctx.priv[d.pl[me]].pick:null;
    let pick=()=>false;
    if(!fin&&ctx.my&&d.ph==='hide'&&me>=0&&!iSk)pick=p=>p<16&&!mates.has(p)&&d.tk[me]!==p;
    if(!fin&&ctx.my&&d.ph==='sk'&&iSk&&!mode)pick=p=>p<=16;
    if(!fin&&ctx.my&&d.ph==='rn'&&hidden&&mode==='sneak')pick=p=>hdNbr(myP).includes(p)&&!mates.has(p);
    if(sel>=0&&!pick(sel)){sel=-1;S.hdSel=-1;}
    // sounds, once per event on the phone that shows it
    this.sounds(d,me);
    const near=hidden&&myP>=0&&(d.ph==='sk'||d.ph==='rn')&&d.sp>=0&&hdDist(d.sp,myP)<=1&&d.n>0;
    let h=`<div class="hd kh ${iSk?'is-sk':me>=0?'is-hd':''} ph-${d.ph} ${d.mo?'late':''}" style="--me:${me>=0?col(d,me):'#C0612B'}">`+hdHud(d,me,near);
    h+=`<div class="hd-stage">`;
    const sw=S.hdSw&&S.hdSw.gid===d.gid?S.hdSw:(S.hdSw={gid:d.gid,sp:d.sp,ek:d.ek,from:null});if(sw.ek!==d.ek){sw.from=sw.sp!==d.sp?sw.sp:null;sw.sp=d.sp;sw.ek=d.ek;}const walkFrom=sw.from;
    h+=hdMapSVG(d,ctx,{me,pick,sel,mode,zsel,from:myP,runFrom:ctx.my&&d.ph==='rn'&&hidden&&S.hdRunPv?myP:-1,walkFrom});
    h+='</div>';
    if(fin)return h+hdSum(d)+'</div>';
    // the action bar
    let a='';
    if(d.ph==='hide'){
      if(me>=0&&!iSk&&ctx.my){const ok=sel>=0&&sel<16;a=`<button class="big hd-go hide" data-ga="hp" data-i="${ok?sel:-1}" ${ok?'':'disabled'}>${ok?`اختبي في «${HDN[sel]}» 🤫`:d.tk[me]>=0?`«${HDN[d.tk[me]]}» مأخوذ، اختر غيره`:'اختر مخباك من الخريطة'}</button>`;}
      else if(iSk)a=`<p class="hd-wait">🙈 عيونك مسكّرة… <b class="hd-cnt-t">واحد…</b></p>`;
      else a=`<p class="hd-wait">${myPick!=null&&myPick!==NOPICK&&d.at[me]<0?`اخترت «${HDN[myPick]}» ✓ `:''}الكل يتخبّى…</p>`;}
    else if(d.ph==='sk'){
      if(iSk&&ctx.my){
        if(mode==='lsn'||mode==='torch'){const ok=zsel>=0;a=`<div class="hd-acts"><button class="big hd-go ${mode}" data-ga="${mode==='lsn'?'ls':'tz'}" data-i="${ok?zsel:-1}" ${ok?'':'disabled'}>${ok?(mode==='lsn'?`👂 اسمع «${HDZ[zsel].n}»`:`🔦 نوّر «${HDZ[zsel].n}»`):'اختر جهة من الخريطة'}<small>${mode==='lsn'?'تعرف فيها أحد ولا لا • ما تروح فتشة':'يبين ظل واحد فيها • ياخذ فتشة'}</small></button><button class="sm hd-back" data-ga="back">رجوع</button></div>`;}
        else{const ok=sel>=0&&sel<16;a=`<div class="hd-acts sk"><button class="big hd-go" data-ga="go" data-i="${ok?sel:-1}" ${ok?'':'disabled'}>🔦 فتّش<small>${ok?`«${HDN[sel]}»`:'اختر مكان'}</small></button><button class="big hd-guard ${sel===HD_HOME?'on':''}" data-ga="go" data-i="16">🛡 احرس<small>البيت</small></button>`+
          `<button class="big hd-pw2" data-ga="mode" data-i="1" ${d.lq>=0?'disabled':''} aria-label="اسمع">👂<small>${d.lq>=0?'انستخدم':'اسمع'}</small></button><button class="big hd-pw2" data-ga="mode" data-i="2" ${d.tc?'disabled':''} aria-label="الكشاف">🔦<small>${d.tc?'انستخدم':'الكشاف'}</small></button></div>`;}}
      else a=`<p class="hd-wait">${nameTag(d,d.sk)} يختار بالسر… ${hidden?'بعدها تقرر: تبقى، تتسلّل، ولا تركض':''}</p>`;}
    else if(d.ph==='rn'){
      if(ctx.my&&hidden){
        if(mode==='sneak'){const ok=sel>=0&&sel<16;a=`<div class="hd-acts"><button class="big hd-go sneak" data-ga="sn" data-i="${ok?sel:-1}" ${ok?'':'disabled'}>${ok?`👣 تسلّل لـ«${HDN[sel]}»`:'اختر مكان جنبك'}<small>ممكن ينسمع صوتك${d.ct>=0&&!d.cu?' • انتبه للقطوة':''}</small></button><button class="sm hd-back" data-ga="back">رجوع</button></div>`;}
        else a=`<div class="hd-three"><button class="big hd-stay" data-ga="st">🤫 أبقى<small>اسكت ولا تتحرك</small></button><button class="big hd-sneak" data-ga="mode" data-i="3" ${hdNbr(myP).some(q=>!mates.has(q))?'':'disabled'}>👣 تسلّل<small>لمكان جنبك</small></button><button class="big hd-run" data-ga="run">🏃 أركض للبيت<small>+20، ولو حارس −15</small></button></div>${d.bl[me]>=0?`<p class="hd-tip">«${HDN[d.bl[me]]}» كان مشغول، رجعت مكانك</p>`:''}`;}
      else if(iSk)a=`<p class="hd-wait">اخترت ${d.ch===HD_HOME?'تحرس البيت 🛡':d.ch>=100?`تنوّر «${HDZ[d.ch-100].n}» 🔦`:d.ch>=0?`تفتّش «${HDN[d.ch]}» 🔦`:''}… ننتظرهم يقررون</p>`;
      else if(hidden)a=`<p class="hd-wait">${myPick===1?'قررت تركض 🏃':myPick===0?'قررت تبقى 🤫':myPick>=2?`قررت تتسلّل لـ«${HDN[myPick-2]}» 👣`:''} ننتظر الباقين…</p>`;
      else a='<p class="hd-wait">المتخبّين يقررون…</p>';}
    return h+`<div class="hd-dock">${a}</div></div>`;},
  sounds(d,me){if(d.win!=null)return;const e=d.ev;
    if(e){const k=d.gid+':'+e.k;if(S.hdSnd!==k){S.hdSnd=k;if(e.f>=0||e.g.length){KH.snd('found');}else if(e.s.length)KH.snd('safe');if(e.ft==='cat')setTimeout(()=>KH.snd('meow'),300);
      const myP=me>=0&&me!==d.sk?d.at[me]:-1;if(myP>=0&&d.hs[me]==='h'&&d.sp>=0&&hdDist(d.sp,myP)<=1)setTimeout(()=>KH.snd('heart'),700);}}
    if(d.bk>=0){const k=d.gid+':bk';if(S.hdSndB!==k){S.hdSndB=k;KH.snd('bark');}}
    if(d.mo){const k=d.gid+':mo';if(S.hdSndM!==k){S.hdSndM=k;KH.snd('call');}}},
  // walking: a character whose place changed walks there along the footpaths
  after(d,ctx){const box=document.querySelector('.hd-map svg');if(!box)return;const pos=S.hdPos&&S.hdPos.gid===d.gid?S.hdPos:(S.hdPos={gid:d.gid,m:{}});let delay=0;
    for(const el of box.querySelectorAll('.kh-ch')){const k=el.getAttribute('data-k'),n=+el.getAttribute('data-n'),f0=el.getAttribute('data-f');const prev=pos.m[k];pos.m[k]=n;
      const from=prev!=null?prev:(f0!=null&&f0!==''?+f0:null);if(from==null||from===n||!(from>=0&&from<=16))continue;
      const ox=+el.getAttribute('data-ox')||0,oy=+el.getAttribute('data-oy')||0;const pts=HG.pts(from,n).map(([x,y])=>[x+ox,y+oy]);
      KH.walk(el,pts,{delay,step:()=>KH.snd('step')});delay+=120;}},
  click(a,i,d,ctx){const v=ctx.v;
    if(a==='sel'){if(!ctx.my||d.win!=null)return;
      // a second tap on the chosen place confirms it
      if(S.hdSel===i){if(d.ph==='hide')return this.click('hp',i,d,ctx);if(d.ph==='sk'&&v===d.sk)return this.click('go',i,d,ctx);if(d.ph==='rn'&&S.hdM==='sneak')return this.click('sn',i,d,ctx);}
      S.hdSel=i;render();return;}
    if(a==='mode'){if(!ctx.my)return;const m=i===1?'lsn':i===2?'torch':i===3?'sneak':'';if(m==='lsn'&&d.lq>=0||m==='torch'&&d.tc)return;S.hdM=S.hdM===m?'':m;S.hdSel=-1;S.hdZ=-1;render();return;}
    if(a==='zsel'){if(!ctx.my||d.ph!=='sk'||v!==d.sk||!(i>=0&&i<HDZ.length))return;if(S.hdZ===i)return this.click(S.hdM==='lsn'?'ls':'tz',i,d,ctx);S.hdZ=i;render();return;}
    if(a==='back'){S.hdM='';S.hdSel=-1;S.hdZ=-1;render();return;}
    if(a==='hp'){if(d.ph!=='hide'||!ctx.my||v==null||v<0||v===d.sk||!(Number.isInteger(i)&&i>=0&&i<16)||d.tk[v]===i)return;S.hdSel=-1;simulPick(d,v,i);return;}
    if(a==='go'){if(d.ph!=='sk'||!ctx.my||v!==d.sk||!(Number.isInteger(i)&&i>=0&&i<=16))return;S.hdSel=-1;act(hdChoose(d,i));return;}
    if(a==='ls'){if(d.ph!=='sk'||!ctx.my||v!==d.sk||d.lq>=0||!(Number.isInteger(i)&&i>=0&&i<HDZ.length))return;S.hdM='';S.hdZ=-1;act(hdListen(d,i));return;}
    if(a==='tz'){if(d.ph!=='sk'||!ctx.my||v!==d.sk||d.tc||!(Number.isInteger(i)&&i>=0&&i<HDZ.length))return;S.hdM='';S.hdZ=-1;act(hdChoose(d,100+i));return;}
    if(a==='st'||a==='run'){if(d.ph!=='rn'||!ctx.my||v==null||v<0||v===d.sk)return;simulPick(d,v,a==='run'?1:0);return;}
    if(a==='sn'){if(d.ph!=='rn'||!ctx.my||v==null||v<0||v===d.sk||!hdNbr(d.at[v]).includes(i))return;S.hdM='';S.hdSel=-1;simulPick(d,v,2+i);}},
  resolve(d,picks){if(d.ph==='hide')return hdPlace(d,picks);if(d.ph==='rn')return hdTurn(d,d.ch,picks);return d;},
  onSkip(nd,d){let x={...nd,win:null,turn:d.sk};delete x.wins;let hs=x.hs;
    for(let s=0;s<d.pl.length;s++)if(nd.out[s]==='1'&&d.out[s]!=='1'){if(s===d.sk)return hdEnd({...x,hs},'الغمّاض طلع');hs=setAt(hs,s,'x');}
    x.hs=hs;if(!hdHidden(x).length)return hdEnd(x,'');return x;},
  bot(d,s,lv){if(d.win!=null||d.ph!=='sk'||s!==d.sk)return d;return hdSeekBot(d,s,lv);},
  botPick(d,s,lv){if(!hdNeed(d,s))return NOPICK;return d.ph==='hide'?hdHideBot(d,s,lv):hdRunBot(d,s,lv);},
  botDelay:(d,s,lv)=>d.ph==='sk'?900+rnd(900):BOTMS[lv]+rnd(d.ph==='hide'?1800:1300)};
function hdEvTxt(d){const e=d.ev,N=s=>pname(d.pl[s]);if(!e)return '';
  if(e.p<0)return `راحت الفتشة على ${N(d.sk)}`;if(e.p===HD_HOME)return e.g.length?`${N(d.sk)} حرس البيت ومسك ${e.g.map(N).join(' و')}`:`${N(d.sk)} حرس البيت`;
  if(e.p>=100)return `الكشاف نوّر «${HDZ[e.tz].n}»`;if(e.gr)return 'أبو سعد ستر على البقالة';
  return e.f>=0?`لقى ${N(e.f)} في «${HDN[e.p]}»!`:`«${HDN[e.p]}» فاضي • ${HDH[e.h]||''}`;}
GAMES.hide.botSee=nd=>{try{const M=hdMem();if(M.ns>400){M.seen={};M.ns=0;}
  const e=nd.ev,k=nd.gid+':'+nd.ek;if(e&&!M.seen[k]){M.seen[k]=1;M.ns++;const r=nd.pl[nd.sk],m=M.sk[r]||(M.sk[r]={p:Array(16).fill(0),g:0,t:0});
    if(e.p>=0&&e.p<=16){m.t++;if(e.p<16)m.p[e.p]++;else m.g++;const had=hdHidden(nd).length+(e.f>=0?1:0)+e.s.length+e.g.length;M.run.n+=had;M.run.r+=e.s.length+e.g.length;}}
  if(nd.win!=null&&!M.seen['w'+nd.gid]){M.seen['w'+nd.gid]=1;M.ns++;nd.at.forEach((p,s)=>{if(s===nd.sk||!(p>=0&&p<16))return;const r=nd.pl[s];(M.hp[r]=M.hp[r]||Array(16).fill(0))[(nd.hp[s]&&nd.hp[s][1]!=null&&nd.hp[s][1]<16)?nd.hp[s][1]:p]++;});}}catch(e){}};

/* the clocks: only the enforcer (this phone, or the room's host) acts when a deadline passes */
const HD_NUM=['واحد…','اثنين…','ثلاثة…','أربعة…','خمسة…','ستة…','سبعة…','ثمانية…','تسعة…','عشرة!'];
function hdTick(d,now){const local=hdLocal();
  if(local&&(S.browse||S.modal||app.querySelector('.cover')))return;
  if((d.ph==='sk'||d.ph==='rn')&&d.end>0&&now>=d.end){act(hdEnd(hdPause(d),'خلص الوقت ⏱'));return;}
  // the mother calls in the last 40 seconds
  if((d.ph==='sk'||d.ph==='rn')&&!d.mo&&hdClock(d)<=HD_T.mom&&(d.end>0||!local)){act({...d,mo:1,mk:d.ek});return;}
  if(local){const ctx=mkCtx();const who=d.ph==='sk'?d.sk:(ctx.my&&ctx.v>=0?ctx.v:-1);
    if(d.dl===0||who!==d.dv){const nd={...d,dl:now+(d.T||HD_T.step),dv:who};if(d.ph==='sk'&&!(d.end>0))nd.end=now+Math.max(0,d.gl);
      S.st={...S.st,d:nd};save();render();return;}}
  if(!(d.dl>0)||now<d.dl)return;
  if(d.ph==='sk'){act(hdTurn(hdPause(d),-1,[]));return;}
  if(local&&d.dv>=0){const v=d.dv;if(d.out[v]!=='1'&&!hasPicked(d,v)&&hdNeed(d,v)){S.st={...S.st,d:{...d,dl:0,dv:-2}};simulPick(S.st.d,v,d.ph==='rn'?0:NOPICK);return;}}
  act(GAMES.hide.resolve(d,simulPicks(d).map(x=>x===undefined?null:x)));}
setInterval(()=>{if(S.st.g!=='hide')return;const d=S.st.d;if(!d||d.win!=null||!GAMES.hide)return;const now=Date.now();
  const ck=document.querySelector('.hd-clk b');if(ck){const l=hdClock(d),t=hdFmt(l);if(ck.textContent!==t)ck.textContent=t;}
  const bar=document.querySelector('.hd-bar i');if(bar){const f=d.dl>0?Math.max(0,Math.min(1,(d.dl-now)/(d.T||HD_T.step))):1;bar.style.transform=`scaleX(${f.toFixed(3)})`;bar.parentNode.classList.toggle('low',d.dl>0&&d.dl-now<5000);}
  // the seeker's count, «واحد… عشرة!», during the hiding (on the map, the cover and the seeker's own screen)
  if(d.ph==='hide'){const k=d.gid;if(!S.hdCnt||S.hdCnt.k!==k)S.hdCnt={k,t0:now,last:-1};const i=Math.min(9,Math.floor((now-S.hdCnt.t0)/1000));const t=i>=9&&now-S.hdCnt.t0>12000?'جاهزين؟ جاي!':HD_NUM[i];
    for(const el of document.querySelectorAll('.hd-cnt text,.hd-cnt-t'))if(el.textContent!==t)el.textContent=t;if(i!==S.hdCnt.last){S.hdCnt.last=i;if(document.querySelector('.hd-cnt,.hd-cnt-t'))KH.snd('count');}}
  if(!isEnforcer()||S.holdRender||(S.mode!=='local'&&S.mode!=='online'))return;
  try{hdTick(d,now);}catch(e){console.error('hide tick',e);}},500);

HELP.hide='غميضة الحارة بالليل: واحد «الغمّاض» والباقين يتخبّون، وكل جولة يصير الغمّاض اللي بعده. 1) العدّ: الغمّاض يغمّض ويعدّ للعشرة، وكل متخبّي يختار مخباه بالسر من 16 مكان بالخريطة (مكان لكل واحد) ويمشي له. «البيت» هو المكان الآمن. 2) التفتيش: عند الغمّاض فتشات بعدد 6 + عدد المتخبّين (أقصاها 12). كل دور يختار بالسر: يفتّش مكان 🔦، أو يحرس البيت 🛡، أو مرة وحدة يشغّل «الكشاف» على جهة ويبين ظل واحد متخبّي فيها (ياخذ فتشة). 3) بعدها كل متخبّي يقرر بالسر: يبقى 🤫، أو يتسلّل 👣 لمكان جنبه على الممرات، أو يركض للبيت 🏃. الركض والبيت محروس = تنمسك، والبيت مو محروس = توصل بأمان. التسلّل يسوي صوت: أحيانا يسمع الغمّاض خطوات بالجهة، والقطوة اللي بالخريطة إذا مريت جنبها تموء وتفضحك. 4) المكان الفاضي يعطي الكل تلميح عن أقرب متخبّي بعدد خطوات الممرات: 🔥 حار خطوة، 🌤 دافي خطوتين، ❄️ بارد أبعد. 5) «اسمع 👂» مرة وحدة: يختار جهة من 5 جهات (بيت الجيران، جهة البقالة، الشارع العام، جهة المزارع، جهة الخزان) ويعرف فيها أحد ولا لا، والكل يشوف الجواب. 6) مفاجآت: الكلب ينبح إذا الغمّاض اختار مكان قريب منه (تحذير للمتخبّين)، وأبو سعد صاحب البقالة يستر على اللي عنده أول مرة تنفتّش. آخر 40 ثانية تنادي الأم «العشا جاهز!» والوقت يقصر. كل خطوة 15 ثانية واللعبة 3 دقايق؛ إذا خلص الوقت وفيه أحد ما انمسك يفوزون المتخبّين. النقاط: يلقى الغمّاض واحد = +15 له و−15 على اللي انمسك (ما تنزل تحت الصفر)، توصل البيت = +20، تصمد للآخر = +15، يلقاهم كلهم = +10 زيادة للغمّاض. من 4 لاعبين وفوق المتخبّين فريق: يفوزون سوا ويشوف كل واحد أماكن ربعه. على جوال واحد مرّروا الجوال وغطّوا الشاشة. من 3 لاعبين وفوق.';

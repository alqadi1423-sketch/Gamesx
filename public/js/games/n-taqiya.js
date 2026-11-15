'use strict';
/* =====================================================================================================
   «طاق طاق طاقية – دائرة الحارة» (taqiya): the kids sit in a circle in a courtyard at night; one of them, «اللفّاف»,
   walks round the circle with the cap and drops it behind somebody. Built on the shared kit KH (js/kit-hara.js).

   A round:
   1. الخطة (plan): the لفّاف picks in secret behind whom (the target), how many laps (1/2/3, worth 10/15/20 points), a real
      cap or a fake (2 fakes a player a game, counted in public), and maybe the golden cap (doubles the points, once a game)
      and «غفلة» (the target's screen blurs for 2 s, once a game).
   2. اللف (walk): he walks round the ring, lap by lap. Every lap after the first leaves a public trace: «حسّيت إنه بطّأ ورا
      X وY»: one name is the target, the other a decoy drawn on the host (three names when the light is out). Meanwhile every
      sitter guesses the target in secret (+5 when right) and may spend their one «صرخة» a game on a name: right, the target
      gets 2 s more and a warning; wrong, the shouter loses 5.
   3. الانتباه (alert): only the target sees the cap glowing behind them, with a heartbeat. 4 s (+2 shouted, −1 when the
      round's cat crossed behind them), timed on the target's own phone from the moment the cap appears. «شفتها!» or wait.
      «تحسّس» (once a game) costs 2 s and says whether the cap is real.
        real, missed: the لفّاف sits in the target's place and takes the lap points from them; the target goes round next.
        fake, spotted: the target loses 5. fake, ignored: nothing; the لفّاف goes round again.
        real, spotted: the chase.
   4. المطاردة (chase): both pick a route in secret: «طريق الشارع / الحوش / السطح» (everyone's route habits are shown; the
      light going out closes the roof). Different routes: the لفّاف gets away (takes the lap points, the target goes round).
      The same route: a 3-second tap race on both phones decides: the target taps more (or as many): caught, the target takes
      the lap points from the لفّاف, who goes round again; the لفّاف taps more: he gets away. The faster tapper gets +5.
   Every round the host draws one event: a cat crosses behind a sitter (their alert is 1 s shorter), the light goes out (the
   roof route is closed, the traces name three), or the ice-cream seller passes (the next round is one lap only).
   The game: 5 minutes (online) or 2 × players rounds, whichever comes first; anyone who never went round gets a last turn.
   Points never go below 0 and move through d.dsc; the most points wins.

   Secrets online (mask): the plan (target, laps, fake, gold, غفلة) is the لفّاف's alone until the alert ends; the target
   learns only that they are the target (az: their time, warned, blurred, what «تحسّس» said). Guesses and shouts are each
   sitter's own (private part, then d.gs/d.sh masked) until the round's result. The walk's end time (we) would tell the laps:
   the لفّاف's only. Private parts are never shown to others (privShow), so nobody learns who is the target from who answered.
   ===================================================================================================== */
const TQ_T={plan:25000,lap:5000,alert:4000,shout:2000,cat:1000,feel:2000,grace:2500,route:12000,race:3000,rgrace:3500,res:9000,game:300000};
const TQ_LAPV=[0,10,15,20];
const TQ_RT=['طريق الشارع','طريق الحوش','طريق السطح'],TQ_RS=['الشارع','الحوش','السطح'];
const TQ_EVK=['cat','light','ice'];
const tqLocal=()=>S.mode==='local';
const tqAlive=d=>d.cr.filter(s=>d.out[s]!=='1');
const tqV=pt=>pt?TQ_LAPV[pt.l]*(pt.g?2:1):0;
const tqFmt=ms=>{const t=Math.ceil(Math.max(0,ms)/1000);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const tqClosed=d=>d.ev&&d.ev.k==='light'?2:-1;
// the chase is a simultaneous round (both runners are public by then); the alert is not: who answers would tell who the target is
const tqSimul=d=>d.ph==='route'||d.ph==='race';
// who must answer in a simultaneous phase: the target in the alert, the لفّاف and the target in the chase
function tqNeed(d,s){if(d.win!=null||d.out[s]==='1')return false;if(d.ph==='route'||d.ph==='race')return s===d.lf||s===d.tg;return false;}
// the target's answer to the alert, kept in its private part (ans: {s: 1 «شفتها!» | 0, ms on its own clock})
const tqAns=d=>{const p=d.tg>=0?S.priv[d.pl[d.tg]]:null;return p&&p.gid===d.gid&&p.k===d.rk&&p.ans&&typeof p.ans==='object'?p.ans:null;};
const tqAuto=(d,s)=>tqSimul(d)&&d.win==null&&d.out[s]!=='1'&&!tqNeed(d,s);
// the target's seconds in the alert (the target's own view knows them; the host checks against them)
const tqLim=d=>d.az?d.az.lim:TQ_T.alert;
// can sitter s guess / shout g?
const tqCanGuess=(d,s,g)=>Number.isInteger(g)&&g!==s&&g!==d.lf&&d.cr.includes(g)&&d.out[g]!=='1';

/* ---------- the circle: n−1 sitters in seat order, the لفّاف walks a ring outside them ---------- */
const TQW=360,TQH=440,TQCX=180,TQCY=262,TQRX=118,TQRY=84,TQOUT=40,TQKY=.6,TQA0=Math.PI;
const tqOff=m=>m%2?0:Math.PI/m;
const tqAng=(d,s)=>{const m=d.cr.length,i=d.cr.indexOf(s);return i<0?0:i/m*2*Math.PI+tqOff(m);};
const tqXY=(a,out=0)=>[TQCX-(TQRX+out)*Math.sin(a),TQCY+(TQRY+out*TQKY)*Math.cos(a)];
// the walk: a laps of the ring from the back, then on to the target: lap k starts at w0+(k−1)·lap
function tqWalkMs(d,t,l){const aT=tqAng(d,t);let fr=(((aT-TQA0)%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/(2*Math.PI);if(fr<.08)fr+=.08;return Math.round(((l-1)+fr)*TQ_T.lap);}

/* ---------- the clocks: online the host's deadlines; on one phone they start when the right player holds it ---------- */
const tqArm=(d,T)=>tqLocal()?{...d,dl:0,T}:{...d,dl:Date.now()+T,T};

/* ---------- the rules ---------- */
function tqRound(d,lf){const n=d.pl.length;
  const sit=tqAlive(d).filter(s=>s!==lf),k=TQ_EVK[rnd(3)],ev={k,v:k==='cat'&&sit.length?sit[rnd(sit.length)]:-1};
  const bl=d.bl.slice();bl[lf]++;
  return tqArm({...d,ph:'plan',lf,turn:lf,rk:d.rk+1,rd:d.rd+1,tg:-1,pt:null,w0:0,we:0,lp:0,tr:[],gs:Array(n).fill(-1),sh:Array(n).fill(-1),az:null,a0:0,
    ev,one:d.nx1?1:0,nx1:0,rt:[-1,-1],rc:[-1,-1],ms:-1,bl},TQ_T.plan);}
// the plan {t,l,f,g,b} made legal; the walk starts
function tqGo(d,p){const lf=d.lf,sit=tqAlive(d).filter(s=>s!==lf);
  const t=sit.includes(p.t)?p.t:sit[rnd(sit.length)],l=d.one?1:[1,2,3].includes(p.l)?p.l:1,f=p.f&&d.fk[lf]>0?1:0,g=!f&&p.g&&!d.gu[lf]?1:0,b=p.b&&!d.gh[lf]?1:0;
  const wd=tqWalkMs(d,t,l),now=Date.now(),loc=tqLocal();
  return {...d,ph:'walk',turn:lf,tg:t,pt:{t,l,f,g,b,wd},w0:loc?0:now,we:loc?0:now+wd,lp:1,dl:0,T:0};}
// a new lap: the trace of the one before (the target and a decoy; two decoys when the light is out)
function tqLap(d,k){const sit=tqAlive(d).filter(s=>s!==d.lf&&s!==d.tg),nd=d.ev&&d.ev.k==='light'?2:1,dec=[];
  while(dec.length<nd&&dec.length<sit.length){const x=sit[rnd(sit.length)];if(!dec.includes(x))dec.push(x);}
  const s=[d.tg,...dec].sort(()=>Math.random()-.5);return {...d,lp:k,tr:[...d.tr,{l:k-1,s}]};}
// the drop: the guesses and shouts are read (private parts on the host; bots think now), the target's alert begins
function tqDrop(d){const n=d.pl.length,gs=Array(n).fill(-1),sh=Array(n).fill(-1);
  for(const s of tqAlive(d)){if(s===d.lf)continue;let g=-1,x=-1;
    if(isBot(d,s)){const b=tqBotGuess(d,s,botLv(d,s));g=b.g;x=b.s;}
    else{const p=S.priv[d.pl[s]];if(p&&p.gid===d.gid&&p.k===d.rk){g=p.g;x=p.s;}}
    if(tqCanGuess(d,s,g))gs[s]=g;if(!d.su[s]&&tqCanGuess(d,s,x))sh[s]=x;}
  const wr=sh.some(x=>x===d.tg)?1:0,cat=d.ev&&d.ev.k==='cat'&&d.ev.v===d.tg?1:0;
  const lim=TQ_T.alert+(wr?TQ_T.shout:0)-(cat?TQ_T.cat:0);
  return tqArm({...d,ph:'alert',rd:d.rd+1,gs,sh,az:{lim,wr,cat,bz:d.pt.b,fz:0,fr:0},a0:tqLocal()?0:Date.now()},TQ_T.alert+TQ_T.shout+TQ_T.grace);}
// «تحسّس»: 2 s less, and the target learns real (1) or fake (2)
function tqFeel(d){if(d.ph!=='alert'||!d.az||d.az.fz||d.fu[d.tg])return d;return {...d,az:{...d.az,fz:1,fr:d.pt.f?2:1,lim:Math.max(600,d.az.lim-TQ_T.feel)}};}
function tqAlertEnd(d,p){const seen=!!(p&&p.s===1&&Number.isFinite(p.ms)&&p.ms<=tqLim(d)+150),ms=p&&Number.isFinite(p.ms)?Math.round(p.ms):-1;
  if(!d.pt.f&&seen)return tqArm({...d,ph:'route',rd:d.rd+1,ms},TQ_T.route);
  return tqFinish({...d,ms},d.pt.f?(seen?'fs':'fi'):'miss',{});}
function tqRouteEnd(d,picks){const op=[0,1,2].filter(r=>r!==tqClosed(d)),ok=r=>Number.isInteger(r)&&op.includes(r);
  const rl=ok(picks[d.lf])?picks[d.lf]:op[rnd(op.length)],rg=ok(picks[d.tg])?picks[d.tg]:op[rnd(op.length)];
  const nd={...d,rt:[rl,rg]};if(rl!==rg)return tqFinish(nd,'esc',{});
  return tqArm({...nd,ph:'race',rd:d.rd+1},TQ_T.race+TQ_T.rgrace);}
function tqRaceEnd(d,picks){const c=s=>{const p=picks[s];return p&&Number.isInteger(p.n)?Math.max(0,Math.min(60,p.n)):0;};const nl=c(d.lf),nt=c(d.tg);
  const rb=nl>nt?d.lf:nt>nl?d.tg:-1;return tqFinish({...d,rc:[nl,nt]},nt>=nl?'catch':'esc',{rb});}
/* the round's points and who sits where: miss/esc the لفّاف takes the target's place; catch/fs/fi he goes round again */
function tqFinish(d,o,x){const n=d.pl.length,lf=d.lf,tg=d.tg,pt=d.pt,V=tqV(pt),dl=Array(n).fill(0);
  if(o==='miss'||o==='esc'){dl[lf]+=V;dl[tg]-=V;}else if(o==='catch'){dl[tg]+=V;dl[lf]-=V;}else if(o==='fs')dl[tg]-=5;
  if(x.rb>=0)dl[x.rb]+=5;
  for(let s=0;s<n;s++){if(d.gs[s]>=0&&d.gs[s]===tg)dl[s]+=5;if(d.sh[s]>=0&&d.sh[s]!==tg)dl[s]-=5;}
  const pd=d.pd.map((v,s)=>Math.max(0,Math.min(999,v+dl[s]))),dp=pd.map((v,s)=>v-d.pd[s]);
  const gr=d.gr.slice();for(let s=0;s<n;s++)if(d.gs[s]>=0&&d.gs[s]===tg)gr[s]++;
  const fk=d.fk.slice(),gu=d.gu.slice(),gh=d.gh.slice(),su=d.su.slice(),fu=d.fu.slice(),hb=d.hb.map(h=>h.slice());
  if(pt.f)fk[lf]=Math.max(0,fk[lf]-1);if(pt.g)gu[lf]=1;if(pt.b)gh[lf]=1;if(d.az&&d.az.fz)fu[tg]=1;
  d.sh.forEach((v,s)=>{if(v>=0)su[s]=1;});
  if(d.rt[0]>=0){hb[lf][d.rt[0]]++;hb[tg][d.rt[1]]++;}
  const nl=o==='miss'||o==='esc'?tg:lf,cr=d.cr.slice();if(nl===tg){const i=cr.indexOf(tg);if(i>=0)cr[i]=lf;}
  const rr={k:d.rk,o,lf,tg,l:pt.l,f:pt.f,g:pt.g,b:pt.b,V,dp,gs:d.gs.slice(),sh:d.sh.slice(),rt:d.rt.slice(),rc:d.rc.slice(),ms:d.ms??-1,fz:d.az&&d.az.fz?1:0,wr:d.az?d.az.wr:0,ev:d.ev?d.ev.k:'',rb:x.rb>=0?x.rb:-1,nl};
  return tqArm({...d,ph:'res',turn:lf,pd,gr,fk,gu,gh,su,fu,hb,cr,rr,nx1:d.ev&&d.ev.k==='ice'?1:0},TQ_T.res);}
// the next round, or the end (time or rounds up; anyone who never went round gets their turn first)
function tqNext(d){const rn=d.rn+1,over=rn>=d.RN||(d.end>0&&Date.now()>=d.end);let nl=d.rr?d.rr.nl:d.lf,cr=d.cr.slice();
  if(nl!==d.lf&&d.out[nl]==='1')nl=d.lf;
  if(over){const al=aliveSeats(d),pend=al.filter(s=>!d.bl[s]);if(!pend.length||al.length<3)return tqEnd(d,d.end>0&&Date.now()>=d.end?'خلص الوقت ⏱':'خلصت الجولات');
    if(!pend.includes(nl)){const n=d.pl.length,p=pend.slice().sort((a,b)=>((a-nl+n)%n)-((b-nl+n)%n))[0];const i=cr.indexOf(p);if(i>=0)cr[i]=nl;nl=p;}}
  return tqRound({...d,rn,cr,fin:over?1:0},nl);}
function tqEnd(d,why){const pd=d.pd.slice(),al=aliveSeats(d),mx=Math.max(...al.map(s=>pd[s])),top=al.filter(s=>pd[s]===mx);
  return {...d,ph:'end',dsc:pd,win:top[0],wins:top,why,dl:0,end:0,turn:d.lf};}

/* ---------- bots: they read only GAMES.taqiya.mask(d, seat), plus what every phone saw (S.tqMem, from public results) ---------- */
function tqMem(){return S.tqMem||(S.tqMem={seen:{},n:0,r:{}});}
const tqSt=(d,s)=>tqMem().r[d.pl[s]]||{sp:0,mi:0,fc:0,fi:0};
// how often this player missed a real cap (smoothed): the لفّاف's favourite targets
const tqLate=(d,s)=>{const x=tqSt(d,s);return (x.mi+.6)/(x.sp+x.mi+1.2);};
const tqArgmax=(xs,f)=>{let b=-Infinity,o=xs[0];for(const x of xs){const v=f(x);if(v>b){b=v;o=x;}}return o;};
function tqBotPlan(d,lv){const v=GAMES.taqiya.mask(d,d.lf),lf=v.lf,sit=tqAlive(v).filter(s=>s!==lf);if(!sit.length)return tqGo(d,{});
  const mx=Math.max(1,...v.pd),cat=s=>v.ev&&v.ev.k==='cat'&&v.ev.v===s;let t;
  if(lv===1)t=sit[rnd(sit.length)];
  else t=tqArgmax(sit,s=>tqLate(v,s)*(lv===3?2.2:1.2)+(cat(s)?(lv===3?.7:.3):0)+(lv===3?.35*v.pd[s]/mx:0)+Math.random()*(lv===3?.35:.8));
  const late=tqLate(v,t),light=v.ev&&v.ev.k==='light',rl=v.RN-v.rn;
  let l=lv===1?1+rnd(3):lv===2?(light?3:Math.random()<.55?2:1+rnd(3)):(light||late>.55?3:sit.length>=4?2:Math.random()<.5?2:1);
  const fakeP=v.fk[lf]>0?(lv===1?.2:lv===2?.3:(tqSt(v,t).fc>tqSt(v,t).fi?.45:.28)):0,f=Math.random()<fakeP?1:0;
  const g=!f&&!v.gu[lf]&&(lv===1?Math.random()<.1:lv===2?(late>.5&&Math.random()<.5)||rl<=2:late>.55||rl<=2||v.fin)?1:0;
  const b=!v.gh[lf]&&(lv===1?Math.random()<.08:lv===2?Math.random()<.25:late<.4||g)?1:0;
  return tqGo(d,{t,l,f,g,b});}
// a sitter's guess (and maybe its shout) at the drop, from the public traces
function tqBotGuess(d,s,lv){const v=GAMES.taqiya.mask(d,s),cand=tqAlive(v).filter(x=>x!==s&&x!==v.lf);if(!cand.length)return {g:-1,s:-1};
  let pool=cand;for(const t of v.tr){const q=pool.filter(x=>t.s.includes(x));if(q.length)pool=q;}
  const any=a=>a[rnd(a.length)];let g;
  if(lv===1)g=Math.random()<.5?any(cand):any(pool);
  else if(!v.tr.length&&lv===3)g=tqArgmax(cand,x=>tqLate(v,x)+(v.ev&&v.ev.k==='cat'&&v.ev.v===x?.4:0)+Math.random()*.5);
  else g=any(pool);
  const sure=v.tr.length>0&&pool.length===1;let sh=-1;
  if(!v.su[s]){if(lv===3&&sure&&v.pd[v.lf]>=v.pd[s])sh=pool[0];else if(lv===2&&sure&&Math.random()<.5)sh=pool[0];else if(lv===1&&Math.random()<.06)sh=any(cand);}
  return {g,s:sh};}
// the target's reaction (fixed per round, so the bot's delay and its answer agree)
function tqReact(d,s,lv){const k=d.gid+':'+d.rk+':'+s+':'+(d.az&&d.az.fz?1:0);
  if(!S.tqBR||S.tqBR.k!==k)S.tqBR={k,r:(lv===1?1500+rnd(3600):lv===2?1000+rnd(2600):650+rnd(1500))+(d.az&&d.az.bz?900:0)+(d.az&&d.az.fz?250:0)};return S.tqBR.r;}
function tqBotAlert(d,s,lv){const v=GAMES.taqiya.mask(d,s),R=tqReact(v,s,lv),lim=tqLim(v);
  if(v.az&&v.az.fr===2)return {s:lv===1&&Math.random()<.3?1:0,ms:Math.min(R,lim)};
  return R<=lim?{s:1,ms:R}:{s:0,ms:lim};}
// «تحسّس» when the لفّاف still has fakes and there is time for it
function tqBotFeels(d,lv){const v=GAMES.taqiya.mask(d,d.tg);if(!v.az||v.az.fz||v.fu[d.tg]||!(v.fk[v.lf]>0))return false;
  return lv===1?Math.random()<.1:lv===2?Math.random()<.35:v.az.lim>=3000&&Math.random()<.75;}
function tqBotRoute(d,s,lv){const op=[0,1,2].filter(r=>r!==tqClosed(d));if(lv===1)return op[rnd(op.length)];
  const P=x=>{const h=d.hb[x],t=h.reduce((a,b)=>a+b,0)+3;return r=>(h[r]+1)/t;},pL=P(d.lf),pT=P(d.tg);
  if(Math.random()<(lv===3?.22:.4))return op[rnd(op.length)];
  // the target follows the لفّاف's habit; the لفّاف avoids his own habit and the target's
  return s===d.tg?tqArgmax(op,r=>pL(r)+Math.random()*.05):tqArgmax(op,r=>-(pL(r)+pT(r))+Math.random()*.05);}
const tqBotTaps=lv=>lv===1?10+rnd(7):lv===2?13+rnd(7):16+rnd(8);

/* ---------- drawing: the courtyard at night (a CSS background made once) ---------- */
const TQ_SKY=40,TQ_TOP=88,TQ_WIN=[52,96,264,308],TQ_DOOR=180,TQ_GATE=TQH-62;
function tqStars(){let a='',b='',r=7;const R=()=>(r=(r*9301+49297)%233280)/233280;for(let i=0;i<22;i++){const x=KH.f(R()*TQW),y=KH.f(R()*(TQ_SKY-4)),k=R();if(k>.5)a+=`M${x} ${y}h0`;else b+=`M${x} ${y}h0`;}
  return `<path d="${a}" stroke="#FFF4D6" stroke-width="2.2" stroke-linecap="round" opacity=".8"/><path d="${b}" stroke="#FFF4D6" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`;}
function tqArt(){const A=KH.art,OL=KH.OL,W=TQW,H=TQH,sky=TQ_SKY,top=TQ_TOP;
  let s=A.defs()+A.defs2()+`<defs><linearGradient id="tqs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1222"/><stop offset="1" stop-color="#1D2C4A"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#594634"/>`;
  let tl='';for(let y=top+18;y<H;y+=30)tl+=`M0 ${y}H${W}`;for(let x=15;x<W;x+=34)tl+=`M${x} ${top}V${H}`;s+=`<path d="${tl}" stroke="#46362A" stroke-width="1.4"/>`;
  s+=`<rect width="${W}" height="${sky+6}" fill="url(#tqs)"/>`+tqStars()+A.moon(300,22);
  let cr='';for(let x=4;x<W;x+=13)cr+=`M${x} ${sky}l4.5-7 4.5 7z`;
  s+=`<path d="${cr}" fill="#C9A577" stroke="${OL}" stroke-width="1.2"/><rect x="-2" y="${sky}" width="${W+4}" height="12" fill="#D6B588" stroke="${OL}" stroke-width="1.6"/><path d="M0 ${sky+6}H${W}" stroke="#EED7AE" stroke-width="2.4" stroke-dasharray="5 3.5"/>`;
  s+=`<rect x="-2" y="${sky+12}" width="${W+4}" height="${top-sky-12}" fill="#A9835B" stroke="${OL}" stroke-width="1.6"/><path d="M0 ${top-3}H${W}" stroke="#8E6B48" stroke-width="5"/>`;
  let tri='';for(let x=10;x<W-6;x+=10)tri+=`M${x} ${sky+19}l3-4 3 4z`;s+=`<path d="${tri}" fill="#4A3424" opacity=".6"/>`;
  const fh=top-sky-22;for(const wx of TQ_WIN)s+=A.pool(wx,sky+24+fh/2,22)+`<rect x="${wx-6}" y="${sky+22}" width="12" height="${fh-2}" rx="5" fill="#FFD27A" stroke="${OL}" stroke-width="1.3"/><path d="M${wx} ${sky+23}v${fh-4}M${wx-6} ${sky+22+fh/2}h12" stroke="#C98F1A" stroke-width="1.2"/>`;
  const dx=TQ_DOOR;s+=`<rect x="${dx-11}" y="${sky+18}" width="22" height="${top-sky-18}" rx="3" fill="#2E8B6A" stroke="${OL}" stroke-width="1.5"/><path d="M${dx} ${sky+20}v${top-sky-22}" stroke="#000" stroke-opacity=".25"/><circle cx="${dx-4}" cy="${(sky+top)/2+6}" r="1.3" fill="#F0B429"/><circle cx="${dx+4}" cy="${(sky+top)/2+6}" r="1.3" fill="#F0B429"/><path d="M${dx-13} ${sky+17}h26" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`;
  s+=A.stairs(12,sky+8,44,top-sky-6);
  s+=`<rect x="-4" y="${top}" width="14" height="${H-top+4}" fill="#D6B588" stroke="${OL}" stroke-width="1.6"/><rect x="${W-10}" y="${top}" width="14" height="${H-top+4}" fill="#D6B588" stroke="${OL}" stroke-width="1.6"/><path d="M3 ${top}V${H}M${W-3} ${top}V${H}" stroke="#EED7AE" stroke-width="2.4" stroke-dasharray="5 3.5"/>`;
  s+=A.pool(W-18,TQ_GATE,30)+`<rect x="${W-12}" y="${TQ_GATE-20}" width="10" height="40" rx="2" fill="#2E8B6A" stroke="${OL}" stroke-width="1.4"/><circle cx="${W-7}" cy="${TQ_GATE}" r="1.4" fill="#F0B429"/>`;
  s+=`<ellipse cx="${W-34}" cy="${top+34}" rx="16" ry="6" fill="#000" opacity=".3"/><path d="M${W-46} ${top+20}h24l-3 15h-18z" fill="#B5652A" stroke="${OL}" stroke-width="1.4"/>`+A.palm(W-34,top+14,.8).replace(/<ellipse[^>]*\/>/,'')+A.jar(32,top+22);
  s+=A.rug(TQCX,TQCY,TQRX+30,TQRY+22);
  s+=`<rect width="${W}" height="${H}" fill="url(#v)" opacity=".45"/>`;
  s+=A.lights(-2,sky+10,W*.52,sky+14,54,9,0)+A.lights(W*.52,sky+14,W+2,sky+8,48,8,2);
  return s;}
let TQ_BG='';const tqBg=()=>TQ_BG||(TQ_BG=KH.bg('taqiya',TQW,TQH,tqArt()));
/* the chase map: the house and its roof, the courtyard, the street outside */
const TQMW=360,TQMH=420,TQM={cx:143,cy:250,rx:74,ry:50},TQM_GY=300;
function tqMapArt(){const A=KH.art,OL=KH.OL,W=TQMW,H=TQMH,B=410,GY=TQM_GY;
  let s=A.defs()+`<rect width="${W}" height="${H}" fill="#2B3852"/><rect x="286" y="0" width="${W-286}" height="${H}" fill="#1B2537"/><path d="M324 0V${H}" stroke="#F4F6FA" stroke-opacity=".35" stroke-width="2.4" stroke-dasharray="12 10"/><path d="M286 0V${H}" stroke="#45567A" stroke-width="5"/>`;
  s+=`<g transform="rotate(90 338 372)">${A.car(338,372,'#4AB1E8',.8)}</g>`+A.pool(298,170,46)+A.lamp(296,170);
  s+=A.roof(12,10,264,58,{face:20,wins:[36,76,192,236],doors:[[143,'#2E8B6A']]});
  let tl='';for(let y=118;y<B;y+=32)tl+=`M12 ${y}H276`;for(let x=44;x<276;x+=34)tl+=`M${x} 88V${B}`;
  s+=`<rect x="12" y="88" width="264" height="${B-88}" fill="#5E4A38"/><path d="${tl}" stroke="#4C3C2E" stroke-width="1.2"/><path d="M6 88V${B+6}H282V88" fill="none" stroke="#D6B588" stroke-width="10"/><path d="M6 88V${B+6}H282V88" fill="none" stroke="#EED7AE" stroke-width="2.4" stroke-dasharray="5 3.5"/>`;
  s+=`<rect x="277" y="${GY-19}" width="10" height="38" rx="2" fill="#2E8B6A" stroke="${OL}" stroke-width="1.4"/>`+A.pool(264,GY,30)+`<rect x="277" y="22" width="10" height="30" rx="2" fill="#7A4A2A" stroke="${OL}" stroke-width="1.4"/>`;
  s+=A.stairs(16,90,40,36)+`<path d="M246 70v40M260 70v40M246 78h14M246 88h14M246 98h14" stroke="#C98F58" stroke-width="3"/>`;
  s+=`<ellipse cx="${TQM.cx}" cy="${TQM.cy}" rx="${TQM.rx+18}" ry="${TQM.ry+14}" fill="#7E2A33" stroke="${OL}" stroke-width="1.6"/><ellipse cx="${TQM.cx}" cy="${TQM.cy}" rx="${TQM.rx+12}" ry="${TQM.ry+9}" fill="none" stroke="#E2B65A" stroke-width="1.6" stroke-dasharray="2 4"/>`;
  return s;}
let TQ_MBG='';const tqMbg=()=>TQ_MBG||(TQ_MBG=KH.bg('tqmap',TQMW,TQMH,tqMapArt()));
const tqMXY=(d,s)=>{const m=d.cr.length,i=d.cr.indexOf(s),a=i<0?0:i/m*2*Math.PI+tqOff(m);return [TQM.cx-TQM.rx*Math.sin(a),TQM.cy+TQM.ry*Math.cos(a)];};
// the three routes, each from the target's empty place S and back to it
function tqRoutes(S0){const [x,y]=S0.map(KH.f);return [`M${x} ${y}L256 ${TQM_GY}H306V40H256L245 52Q157 58 143 76V100Q206 120 240 180T${x} ${y}`,
  (()=>{const a=Math.atan2(-(x-TQM.cx)/112,(y-TQM.cy)/88),P=b=>[KH.f(TQM.cx-112*Math.sin(b)),KH.f(TQM.cy+88*Math.cos(b))],p1=P(a),p2=P(a-.12);return `M${x} ${y}L${p1[0]} ${p1[1]}A112 88 0 1 1 ${p2[0]} ${p2[1]}L${x} ${y}`;})(),
  `M${x} ${y}Q118 390 39 340V140L35 96V40Q137 22 252 40V108Q256 200 ${x} ${y}`];}

/* ---------- drawing: pills, kids, the scene as seat `me` may see it ---------- */
function tqPill(x,y,t,o={}){const fs=o.fs||12.5,w=o.w||KH.tw(t,fs)+(o.pad??14),h=o.h||fs+9;x=Math.max(w/2+3,Math.min((o.W||TQW)-3-w/2,x));
  return `<g class="tq-pl ${o.cls||''}" transform="translate(${KH.f(x)} ${KH.f(y)})"><rect x="${KH.f(-w/2)}" y="${KH.f(-h/2)}" width="${KH.f(w)}" height="${h}" rx="${KH.f(h/2)}"/><text y="${KH.f(fs*.36)}" font-size="${fs}">${t}</text></g>`;}
const tqNm=(d,s)=>escH(pnameText(d.pl[s]));
// footprints on the ring behind a sitter
const tqSteps=(x,y,c='#7FD3FF')=>`<path d="M${KH.f(x-5)} ${KH.f(y+5)}h0M${KH.f(x+3)} ${KH.f(y+1)}h0M${KH.f(x-3)} ${KH.f(y-4)}h0M${KH.f(x+5)} ${KH.f(y-8)}h0" stroke="${c}" stroke-width="5.5" stroke-linecap="round" opacity=".8"/>`;
// the walker: its place on the ring comes from the clock (tqTickDom moves it); rendered at its last place
function tqWalker(d,inner,label){const a=S.tqWa&&S.tqWa.gid===d.gid?S.tqWa.a:TQA0,[x,y]=tqXY(a,TQOUT);
  return `<g class="tq-w ${Math.cos(a)>0?'fl':''}" data-k="walker" style="transform:translate(${KH.f(x)}px,${KH.f(y)}px)"><g class="tq-wi">${inner}</g>${label}</g>`;}
function tqScene(d,me,ctx,o){const fin=d.win!=null,ph=d.ph,n=d.pl.length,sit=tqAlive(d),isL=me===d.lf,items=[];let s='',top='',wk='';
  const aOf=x=>tqAng(d,x);
  s+=`<ellipse class="tq-ring" cx="${TQCX}" cy="${TQCY}" rx="${TQRX+TQOUT}" ry="${KH.f(TQRY+TQOUT*TQKY)}"/>`;
  // the round's event on the map
  const ev=d.ev;
  if(ev&&ev.k==='light'&&!fin&&ph!=='res')s+=TQ_WIN.map(x=>`<rect x="${x-7}" y="${TQ_SKY+21}" width="14" height="${TQ_TOP-TQ_SKY-23}" rx="5" fill="#141C2E"/>`).join('')+`<rect y="${TQ_SKY}" width="${TQW}" height="${TQH-TQ_SKY}" fill="#050A14" opacity=".28"/>`;
  if(ev&&ev.k==='cat'&&ev.v>=0&&d.cr.includes(ev.v)&&!fin&&ph!=='res'){const [x,y]=tqXY(aOf(ev.v)-.34,TQOUT+14);items.push({y:y-1,s:KH.sprite('cat',x,y+6,{s:.8,flip:x>TQCX})+tqPill(x,y+18,'🐈 قطو',{fs:10.5,h:17,cls:'ev'})});}
  // traces: the newest one named on pills, the older ones as faint footprints
  if((ph==='walk'||ph==='alert')&&!fin)d.tr.forEach((t,i)=>{const last=i===d.tr.length-1;for(const x of t.s){const a=aOf(x),[px,py]=tqXY(a,TQOUT);s+=tqSteps(px,py,last?'#7FD3FF':'#9FB3C8');if(last)top+=tqPill(px,py+(Math.cos(a)<-.3?-18:18),'👣 بطّأ',{fs:10.5,h:18,cls:'tr'});}});
  // my secret guess / shout while he walks
  const myP=me>=0&&ctx.priv&&ctx.priv[d.pl[me]]&&ctx.priv[d.pl[me]].k===d.rk?ctx.priv[d.pl[me]]:null;
  const myG=ph==='walk'&&myP&&tqCanGuess(d,me,myP.g)?myP.g:ph==='alert'||ph==='route'||ph==='race'?(d.gs[me]??-1):-1,myS=ph==='walk'&&myP&&tqCanGuess(d,me,myP.s)?myP.s:ph==='alert'?(d.sh[me]??-1):-1;
  // the plan, on the لفّاف's own screen: where the cap goes and how many laps
  const plan=ph==='plan'&&isL&&ctx.my&&!fin,selT=plan&&Number.isInteger(S.tqT)&&sit.includes(S.tqT)&&S.tqT!==d.lf?S.tqT:-1;
  if(plan){const L=d.one?1:Number.isInteger(S.tqL)?S.tqL:1;for(let k=0;k<L;k++)s+=`<ellipse class="tq-lane" cx="${TQCX}" cy="${TQCY}" rx="${TQRX+TQOUT+8-k*8}" ry="${KH.f(TQRY+(TQOUT+8-k*8)*TQKY)}"/>`;
    if(selT>=0){const [x,y]=tqXY(aOf(selT),TQOUT+10);items.push({y:y-2,s:`<circle cx="${KH.f(x)}" cy="${KH.f(y-2)}" r="24" fill="url(#kh-glow)" opacity=".8"/>`+KH.cap(x,y-3,S.tqF?'fake':S.tqG?'gold':'cap',1.05)});}}
  // the cap on the ground: behind the target (the لفّاف sees it; the target sees it glow)
  const iTg=ph==='alert'&&me===d.tg&&me>=0;
  if(ph==='alert'&&d.tg>=0&&(isL||iTg)){const [x,y]=tqXY(aOf(d.tg),TQOUT+10);
    if(iTg)items.push({y:y-1,s:`<circle cx="${KH.f(x)}" cy="${KH.f(y-3)}" r="46" fill="url(#kh-glow)"/>`+[30,44].map((r,i)=>`<ellipse class="kh-beat" cx="${KH.f(x)}" cy="${KH.f(y)}" rx="${r}" ry="${KH.f(r*.55)}" fill="none" stroke="#FFD84D" stroke-width="${3-i}"/>`).join('')+KH.cap(x,y-3,'cap',1.5)});
    else items.push({y:y-1,s:KH.cap(x,y-3,d.pt&&d.pt.f?'fake':d.pt&&d.pt.g?'gold':'cap',1.1)});}
  // the sitters
  const rr=ph==='res'||fin?d.rr:null;
  for(const x of sit){const [px,py]=tqXY(aOf(x),0);let pose='sit',mood,t='';
    if(plan&&x===selT){pose='sitlook';mood='s';}
    if(iTg&&x===me){pose='sitlook';mood='o';}
    if(rr&&!fin){const dp=rr.dp[x]||0;if(x===rr.lf&&(rr.o==='miss'||rr.o==='esc')){pose='sitcheer';}else if(dp>0){pose='situp';mood='g';}else if(dp<0)mood='sad';}
    if(fin&&(d.wins||[d.win]).includes(x)){pose='sitcheer';}
    if(plan)t+=`<ellipse cx="${KH.f(px)}" cy="${KH.f(py-1)}" rx="26" ry="11" class="tq-sel ${x===selT?'on':''}"/>`;
    if(x===myG)t+=`<ellipse cx="${KH.f(px)}" cy="${KH.f(py-1)}" rx="29" ry="13" class="tq-gs"/>`;
    if(iTg&&x===me)t+=`<ellipse cx="${KH.f(px)}" cy="${KH.f(py-2)}" rx="34" ry="14" class="tq-pulse"/>`;
    t+=KH.sit({who:d.pl[x],c:col(d,x),pose,mood,x:px,y:py,s:.9});
    const nmT=tqNm(d,x);t+=tqPill(px,py+13,x===me?nmT+' · أنا':nmT,{fs:11.5,h:19,cls:(x===me?'me ':'')+(plan&&x===selT?'gold':'')});
    if(x===myG)t+=tqPill(px,py-56,'🎯'+(x===myS?' 📣':''),{fs:11,h:19,cls:'gs'});
    if(rr&&!fin&&rr.dp[x])top+=tqPill(px,py-58,(rr.dp[x]>0?'+':'−')+Math.abs(rr.dp[x]),{fs:14,h:24,w:46,cls:'dp '+(rr.dp[x]>0?'up':'dn')});
    if(plan||(ph==='walk'&&me>=0&&me!==d.lf&&x!==me&&ctx.sit))t+=`<rect class="tq-tap" x="${KH.f(px-26)}" y="${KH.f(py-46)}" width="52" height="66" rx="10" data-ga="sel" data-i="${x}"/>`;
    items.push({y:py,s:t});}
  // the لفّاف: standing at the back while planning, walking the ring, the next one standing at the end of a round
  if(!fin&&d.out[d.lf]!=='1'){const L=d.lf,who=d.pl[L],c=col(d,L);
    if(ph==='plan'){const [x,y]=tqXY(TQA0,TQOUT+30);items.push({y,s:KH.kid({who,c,pose:isL?'think':'stand',mood:'k',x,y,s:.92})+KH.cap(x+(isL?-15:15),y-24,'cap',.82)+tqPill(x,y+13,isL?'أنا · اللفّاف':tqNm(d,L),{fs:11,h:18,cls:isL?'me':'lf'})});}
    else if(ph==='walk'||ph==='alert'){const run=ph==='alert';
      wk=(tqWalker(d,KH.kid({who,c,pose:'walk',mood:run?'g':'k',s:.94})+(run?'':KH.cap(15,-24,isL&&d.pt?(d.pt.f?'fake':d.pt.g?'gold':'cap'):'cap',.82))+`<path d="M-30 -40h-12M-28 -30h-16M-30 -20h-10" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>`,tqPill(0,13,isL?'أنا':tqNm(d,L),{fs:11,h:18,cls:isL?'me':'lf',W:1e4})));}
    else if(ph==='res'&&rr){const nl=rr.nl,[x,y]=tqXY(TQA0,TQOUT+30);items.push({y,s:KH.kid({who:d.pl[nl],c:col(d,nl),pose:'stand',mood:nl===rr.lf?'k':'sad',x,y,s:.92})+KH.cap(x+15,y-24,'cap',.82)+tqPill(x,y-58,(nl===me?'أنا':tqNm(d,nl))+' · يلف الحين',{fs:11,h:18,cls:'lf'})});}}
  const wBack=Math.cos(S.tqWa&&S.tqWa.gid===d.gid?S.tqWa.a:TQA0)<0;
  s+=`<g class="tq-wb">${wk&&wBack?wk:''}</g>`+items.sort((a,b)=>a.y-b.y).map(i=>i.s).join('')+`<g class="tq-wf">${wk&&!wBack?wk:''}</g>`;
  s+=KH.sprite('sleepcat',TQCX,TQCY)+`<text class="tq-z" x="${TQCX+14}" y="${TQCY-14}">z</text>`;
  // the events' pieces drawn last: the ice-cream cart at the gate, the light-out sign
  if(ev&&ev.k==='ice'&&(ph==='res'||ph==='plan'||ph==='walk')&&!fin)top+=KH.art.icecart(TQW-40,TQ_GATE+34)+KH.sprite('grocer',TQW-74,TQ_GATE+14,{s:.6})+(ph==='res'?KH.say(TQW-78,TQ_GATE-4,'آيس كريم! 🍦',{fs:12,dx:-24}):'');
  // the target's timer arc round their kid (tqTickDom shortens it)
  let zs='',zg='';
  if(iTg){const [x,y]=tqXY(aOf(me),0),[cx,cy]=tqXY(aOf(me),TQOUT+10),R=40,C=2*Math.PI*R,ax=(x+cx)/2,ay=(y+cy)/2-22;
    top+=`<circle cx="${KH.f(ax)}" cy="${KH.f(ay)}" r="${R}" class="tq-arcb"/><circle cx="${KH.f(ax)}" cy="${KH.f(ay)}" r="${R}" class="tq-arc" stroke-dasharray="${KH.f(C)} ${KH.f(C)}" data-c="${KH.f(C)}" transform="rotate(-90 ${KH.f(ax)} ${KH.f(ay)})"/>`+
      (d.az&&d.az.wr?KH.say(ax,ay-R-2,'📣 صرخوا باسمك!',{fs:9,fill:'#FFD84D'}):KH.say(ax,ay-R-2,'وراك!',{fs:10,fill:'#FFD84D'}));
    // the camera comes close: the SVG and its background zoom on my place and the cap
    const Z=1.85,vw=TQW/Z,vh=TQH/Z,vx=Math.max(0,Math.min(TQW-vw,ax-vw/2)),vy=Math.max(0,Math.min(TQH-vh,ay-vh*.2));
    zg=`transform="scale(${Z}) translate(${KH.f(-vx)} ${KH.f(-vy)})"`;zs=` style="background-size:${KH.f(Z*100)}% ${KH.f(Z*100)}%;background-position:${KH.f(vx/(TQW-vw)*100)}% ${KH.f(vy/(TQH-vh)*100)}%"`;}
  s+=top;
  return `<div class="tq-map ${tqBg()} ${iTg?'zoom':''}" data-k="map"${zs}><svg viewBox="0 0 ${TQW} ${TQH}" aria-label="حوش الحارة"><g ${zg}>${s}</g></svg></div>`;}
// the chase on the map: the routes (the closed one crossed out), the two kids at the target's empty place
function tqChase(d,me){const S0=tqMXY(d,d.tg),P=tqRoutes(S0),cl=tqClosed(d),C=['#7FD3FF','#7BEA9C','#FFB37A'];let s='';
  const mine=Number.isInteger(S.tqRt)?S.tqRt:-1,race=d.ph==='race';
  P.forEach((p,r)=>{const on=race?r===d.rt[0]:mine===r;s+=`<path class="tq-rt ${r===cl?'off':''} ${on?'on':''}" d="${p}" style="--c:${C[r]}"/>`;});
  if(cl===2)s+=`<rect x="12" y="10" width="264" height="78" rx="4" fill="#050A14" opacity=".62"/>`+KH.T(80,40,`<circle r="12" fill="#0E1626" stroke="#EC6158" stroke-width="2.4"/><path d="M-4.5 -4.5l9 9M4.5 -4.5l-9 9" stroke="#EC6158" stroke-width="3" stroke-linecap="round"/>`);
  for(const x of tqAlive(d)){if(x===d.lf)continue;if(x===d.tg){const [px,py]=S0;s+=`<ellipse cx="${KH.f(px)}" cy="${KH.f(py)}" rx="14" ry="10" fill="#FFD84D" fill-opacity=".2" stroke="#FFD84D" stroke-width="2" stroke-dasharray="4 3"/>`;continue;}
    const [px,py]=tqMXY(d,x),K=KH.CAST[d.pl[x]];s+=`<g transform="translate(${KH.f(px)} ${KH.f(py)}) scale(.66)">${KH.face({who:d.pl[x],ring:1,size:34,mood:'o'}).replace(/^<svg[^>]*>/,'<g transform="translate(0 1)">').replace(/<\/svg>$/,'</g>')}</g>`;}
  s+=KH.sprite('sleepcat',TQM.cx,TQM.cy,{s:.75});
  const [x,y]=S0;s+=KH.kid({who:d.pl[d.lf],c:col(d,d.lf),pose:'walk',s:.72,mood:'g',x:x+36,y:y+44})+KH.kid({who:d.pl[d.tg],c:col(d,d.tg),pose:'walk',s:.72,mood:'k',flip:true,x:x+4,y:y+42})+KH.cap(x+18,y+16,'cap',.8);
  s+=tqPill(x+38,y+56,me===d.lf?'أنا':tqNm(d,d.lf),{fs:10.5,h:17,cls:'lf',W:TQMW})+tqPill(x-2,y+56,me===d.tg?'أنا':tqNm(d,d.tg),{fs:10.5,h:17,cls:me===d.tg?'me':'tg',W:TQMW});
  s+=tqPill(78,382,TQ_RT[1],{fs:11.5,h:20,cls:'rt1',W:TQMW})+tqPill(323,120,TQ_RT[0],{fs:11.5,h:20,cls:'rt0',W:TQMW})+tqPill(168,40,TQ_RT[2]+(cl===2?' · مسكّر':''),{fs:11.5,h:20,cls:'rt2 '+(cl===2?'off':''),W:TQMW})+tqPill(66,132,'درج',{fs:10,h:16,W:TQMW});
  if(race)s+=KH.burst(180,200,'سباق!',{c:'#F0B429',s:.8});
  return `<div class="tq-map tq-cmap ${tqMbg()}" data-k="cmap"><svg viewBox="0 0 ${TQMW} ${TQMH}" aria-label="خريطة المطاردة">${s}</svg></div>`;}

/* ---------- the HUD, the dock, what just happened ---------- */
const tqCapI=(k,sz=24)=>`<svg viewBox="-13 -12 26 20" width="${sz}" height="${KH.f(sz*20/26)}" aria-hidden="true">${KH.cap(0,0,k)}</svg>`;
const tqProp='<i class="tq-prop">✦ مقترح</i>';
function tqHud(d,me){const fin=d.win!=null,ph=d.ph;let h=`<span class="tq-c">الجولة <b>${Math.min(d.rn+1,d.RN)}</b> <small>من ${d.RN}</small></span>`;
  if(d.end>0&&!fin){const l=Math.max(0,d.end-Date.now());h+=`<span class="tq-c tq-clk ${l<45000?'low':''}" dir="ltr">⏱ <b>${tqFmt(l)}</b></span>`;}
  if(ph==='walk')h+=`<span class="tq-c tq-lapc"><small>اللفّة</small><b>${d.lp}</b><i>${[1,2,3].map(k=>`<u class="${k<=d.lp?'on':''}">${k>d.lp?'؟':''}</u>`).join('')}</i></span>`;
  if(!fin&&d.lf>=0&&ph!=='end')h+=`<span class="tq-c tq-fk" title="المزيّفات الباقية لـ${tqNm(d,d.lf)}">${tqCapI('fake',18)}<b>${d.fk[d.lf]}</b></span>`;
  const ev=d.ev;if(ev&&!fin)h+=`<span class="tq-c tq-ev">${ev.k==='cat'?'🐈':ev.k==='light'?'🌑':'🍦'}</span>`;
  if(d.fin&&!fin)h+=`<span class="tq-c tq-last">آخر الأدوار</span>`;
  return `<div class="tq-hud">${h}</div>`;}
const tqEvTxt=(d,ev)=>!ev?'':ev.k==='cat'?`🐈 قطو يعدّي ورا ${ev.v>=0?tqNm(d,ev.v):'واحد'}: انتباهه أقصر بثانية`:ev.k==='light'?'🌑 انطفى النور: طريق السطح مسكّر والآثار أغمض':'🍦 بيّاع الآيس كريم: الجولة الجاية لفّة وحدة';
function tqOutTxt(d,r){const N=s=>tqNm(d,s);
  return ({miss:{i:'🧢',t:`${N(r.lf)} قعد مكان ${N(r.tg)}!`,x:`ما انتبه للطاقية · ${r.V} نقطة`},esc:{i:'🏃',t:`${N(r.lf)} فلت وقعد مكان ${N(r.tg)}!`,x:r.rc[0]>=0?`سباق الضغط ${r.rc[0]} مقابل ${r.rc[1]}`:`${TQ_RS[r.rt[0]]} مقابل ${TQ_RS[r.rt[1]]}`},
    catch:{i:'✋',t:`${N(r.tg)} مسك ${N(r.lf)}!`,x:`${TQ_RS[r.rt[0]]}: سباق الضغط ${r.rc[1]} مقابل ${r.rc[0]}`},fs:{i:'🎭',t:`مزيّفة! ${N(r.tg)} طاح بالفخ`,x:'−5 عليه، واللفّاف يلف مرة ثانية'},
    fi:{i:'🎭',t:`${N(r.tg)} طنّش… وكانت مزيّفة`,x:'ولا شي صار، واللفّاف يلف مرة ثانية'}})[r.o]||{i:'🧢',t:'',x:''};}
function tqEvent(d,me){const N=s=>tqNm(d,s),isL=me===d.lf;
  if(d.win!=null)return {i:'🏆',t:'خلصت اللعبة',x:d.why||'',c:'qgo'};
  if(d.ph==='plan')return {i:'🤫',t:isL?'أنت اللفّاف! خطّط بالسر':`${N(d.lf)} يخطط بالسر…`,x:tqEvTxt(d,d.ev),c:'qpl'};
  if(d.ph==='walk')return {i:'🧢',t:isL?`تلف… ورا ${N(d.tg)} 🤫`:`${N(d.lf)} يلف وبيده الطاقية`,x:d.tr.length?`أثر اللفّة ${d.tr[d.tr.length-1].l}: حسّيت إنه بطّأ ورا ${d.tr[d.tr.length-1].s.map(N).join(' و')}`:'طاق طاق طاقية… ورا مين بيحطها؟',c:'qwk'};
  if(d.ph==='alert')return me===d.tg?{i:'💓',t:'حسّيت بشي وراك؟',x:d.az&&d.az.wr?'📣 أحد صرخ باسمك: معك ثانيتين زيادة':'اضغط «شفتها!» قبل ما يخلص الوقت',c:'qal'}:{i:'🧢',t:isL?`نزّلتها ورا ${N(d.tg)}!`:'نزّل الطاقية!',x:'مين بينتبه؟',c:'qwk'};
  if(d.ph==='route')return {i:'🏃',t:`${N(d.tg)} شافها! مطاردة`,x:`كل واحد يختار طريقه بالسر · ${d.rt[0]<0?'':''}الرهان ${tqV(d.pt)} نقطة`,c:'qch'};
  if(d.ph==='race')return {i:'⚡',t:`نفس الطريق: ${TQ_RT[d.rt[0]]}!`,x:'سباق ضغط 3 ثواني: الأسرع يكسب',c:'qch'};
  if(d.ph==='res'&&d.rr){const o=tqOutTxt(d,d.rr);return {i:o.i,t:o.t,x:o.x,c:'qrs q'+d.rr.o};}
  return {i:'🧢',t:'',x:'',c:''};}
// the round's result: the secrets told, who got what
function tqResRows(d){const r=d.rr;if(!r)return '';const N=s=>tqNm(d,s);
  const line=s=>{const x=[];if(s===r.lf)x.push('اللفّاف');if(s===r.tg)x.push('الطاقية وراه');if(r.gs[s]>=0)x.push(`خمّن ${N(r.gs[s])} ${r.gs[s]===r.tg?'✓':'✗'}`);if(r.sh[s]>=0)x.push(`📣 صرخ ${N(r.sh[s])} ${r.sh[s]===r.tg?'✓':'✗'}`);if(s===r.rb)x.push('⚡ أسرع بالضغط');return x.join(' · ');};
  const rows=d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1').sort((a,b)=>Math.abs(r.dp[b])-Math.abs(r.dp[a])||(b===r.lf)-(a===r.lf));
  const tell=`<div class="tq-tell">${tqCapI(r.f?'fake':r.g?'gold':'cap',26)}<span><b>${r.f?'طاقية مزيّفة':r.g?'الطاقية الذهبية ✨':'طاقية حقيقية'} · ${r.l===1?'لفّة وحدة':r.l===2?'لفّتين':'ثلاث لفّات'}</b><small>${[r.V?`الرهان ${r.V} نقطة`:'',r.b?'😵 غفلة':'',r.fz?'🖐 تحسّس':'',r.wr?'📣 انصرخ باسمه':'',r.ms>=0&&r.o!=='fi'&&r.o!=='miss'?`انتبه بعد ${(r.ms/1000).toFixed(1)} ث`:''].filter(Boolean).join(' · ')}</small></span></div>`;
  return tell+`<div class="tq-rows">${rows.map(s=>{const x=r.dp[s];return `<div class="tq-row" style="--c:${col(d,s)}">${KH.face({who:d.pl[s],ring:1,size:28,mood:x>0?'g':x<0?'sad':undefined})}<span><b>${N(s)}</b><small>${line(s)}</small></span><em class="${x>0?'up':x<0?'dn':''}" dir="ltr">${x>0?'+'+x:x<0?'−'+(-x):'0'}</em><i>${d.pd[s]}</i></div>`;}).join('')}</div>`;}
function tqSum(d){const al=d.pl.map((_,s)=>s).sort((a,b)=>d.pd[b]-d.pd[a]);
  return `<div class="tq-rows tq-final">${al.map((s,i)=>`<div class="tq-row ${(d.wins||[d.win]).includes(s)?'won':''}" style="--c:${col(d,s)}">${KH.face({who:d.pl[s],ring:1,size:30,mood:i===0?'g':undefined})}<span><b>${tqNm(d,s)}</b><small>لفّ ${d.bl[s]} · خمّن صح ${d.gr[s]}</small></span><i>${d.pd[s]}</i></div>`).join('')}</div>`;}

const tqAK=d=>d.gid+':'+d.rk;
const tqMyPriv=(d,me,priv)=>{const p=me>=0&&priv?priv[d.pl[me]]:null;return p&&p.k===d.rk?p:null;};
GAMES.taqiya={name:'طاق طاق طاقية',cat:'party',lbc:'#8E2F3A',minP:4,teams:'none',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1D2C4A"/><rect y="64" width="100" height="36" fill="#594634"/><path d="M0 64h100" stroke="#8E6B48" stroke-width="3"/><circle cx="80" cy="16" r="9" fill="#FFF1C1"/><circle cx="16" cy="12" r="1.3" fill="#fff"/><circle cx="44" cy="8" r="1.1" fill="#fff"/><path d="M-2 26Q50 52 102 24" fill="none" stroke="#0A101C" stroke-width="1.4"/><circle cx="14" cy="34" r="3" fill="#FFD873"/><circle cx="32" cy="40" r="3" fill="#EC6158"/><circle cx="50" cy="42" r="3" fill="#7FD3FF"/><circle cx="68" cy="40" r="3" fill="#7BEA9C"/><circle cx="86" cy="34" r="3" fill="#FFB37A"/><ellipse cx="50" cy="86" rx="46" ry="12" fill="#7E2A33" stroke="#17233A" stroke-width="2"/><ellipse cx="50" cy="86" rx="40" ry="9" fill="none" stroke="#E2B65A" stroke-width="1.6" stroke-dasharray="2 4"/>`+
    `<path d="M24 100V82c0-7 5-11 11-11s11 4 11 11v18z" fill="#4AB1E8" stroke="#17233A" stroke-width="2"/><circle cx="35" cy="62" r="11" fill="#E0A577" stroke="#17233A" stroke-width="2"/><path d="M24 62a11 11 0 0 1 22 0q-5-3-11-3t-11 3z" fill="#3A2A22"/><circle cx="31" cy="63" r="1.6" fill="#17233A"/><circle cx="39" cy="63" r="1.6" fill="#17233A"/><ellipse cx="35" cy="68" rx="2" ry="2.4" fill="#17233A"/>`+
    `<path d="M58 100V80c0-8 6-13 13-13s13 5 13 13v20z" fill="#EC6158" stroke="#17233A" stroke-width="2"/><circle cx="71" cy="54" r="12" fill="#F2C29B" stroke="#17233A" stroke-width="2"/><path d="M58.5 52a12.5 12.5 0 0 1 25 0z" fill="#EC6158" stroke="#17233A" stroke-width="2"/><circle cx="67" cy="56" r="1.7" fill="#17233A"/><circle cx="75" cy="56" r="1.7" fill="#17233A"/><path d="M67 60q4 3 8 0" fill="none" stroke="#17233A" stroke-width="1.8" stroke-linecap="round"/>`+
    `<path d="M84 74l8-6" stroke="#EC6158" stroke-width="5" stroke-linecap="round"/><circle cx="92" cy="66" r="5" fill="#FFD873" opacity=".55"/><path d="M84 64a9 8 0 0 1 18 0q-9 3.5-18 0z" fill="#FAFBFD" stroke="#17233A" stroke-width="1.8"/><path d="M86 61q7 2.5 14 0" fill="none" stroke="#B9C6D6" stroke-width="1.4" stroke-dasharray="1.6 1.6"/></svg>`,
  init:n=>({ph:'plan',lf:0,cr:[],pd:Array(n).fill(0),gr:Array(n).fill(0),rn:0,RN:2*n,rk:0,rd:0,tg:-1,pt:null,w0:0,we:0,lp:0,tr:[],gs:Array(n).fill(-1),sh:Array(n).fill(-1),az:null,a0:0,
    ev:null,one:0,nx1:0,fin:0,fk:Array(n).fill(2),gu:Array(n).fill(0),gh:Array(n).fill(0),su:Array(n).fill(0),fu:Array(n).fill(0),bl:Array(n).fill(0),hb:Array.from({length:n},()=>[0,0,0]),
    rt:[-1,-1],rc:[-1,-1],ms:-1,rr:null,dl:0,dv:-2,T:0,end:0,why:''}),
  // the first لفّاف is the round's starter; the others sit round the rug in seat order after him
  start(d){const n=d.pl.length,lf=(d.st||0)%n,cr=[];for(let k=1;k<n;k++)cr.push((lf+k)%n);return tqRound({...d,cr,end:tqLocal()?0:Date.now()+TQ_T.game},lf);},
  simulNow:d=>d.win==null&&tqSimul(d),
  mask(d,seat){if(d.win!=null)return d;const ph=d.ph,isL=seat>=0&&seat===d.lf,pub=ph==='route'||ph==='race'||ph==='res',v={...d};
    if(!isL&&!pub){v.tg=ph==='alert'&&seat>=0&&seat===d.tg?d.tg:-1;v.pt=null;}
    v.we=isL?d.we:0;
    if(ph!=='res'){v.gs=d.gs.map((g,s)=>s===seat?g:-1);v.sh=d.sh.map((x,s)=>s===seat?x:-1);}
    v.az=ph==='alert'&&seat>=0&&seat===d.tg?d.az:null;
    return v;},
  privInit:(d,r)=>{const s=d.pl.indexOf(r);return s>=0&&tqAuto(d,s)?{k:d.rk,rd:d.rd,pick:NOPICK}:{k:d.rk};},
  privStale:(d,p,r)=>{const s=d.pl.indexOf(r);return p.k!==d.rk||(s>=0&&tqAuto(d,s)&&!(p.rd===d.rd&&p.pick===NOPICK));},
  // nobody sees anybody's private part (who answered would tell who the target is) until the game ends
  privShow:(d,seat,role,p,own)=>own||(d&&d.win!=null)?p:{gid:p.gid},
  privOk:(d,r,o,p)=>{const s=d.pl.indexOf(r);if(s<0||!p||typeof p!=='object')return false;if(p.k!==d.rk)return true;
    const okX=x=>x==null||x===-1||tqCanGuess(d,s,x);
    if(p.g!=null||p.s!=null){const same=o&&o.k===p.k&&o.g===p.g&&o.s===p.s;if(!same&&(d.ph!=='walk'||s===d.lf||d.out[s]==='1'))return false;if(!okX(p.g)||!okX(p.s))return false;if(!same&&p.s!=null&&p.s!==-1&&d.su[s])return false;}
    if(p.ans!=null){const a=p.ans,same=o&&o.k===p.k&&JSON.stringify(o.ans)===JSON.stringify(a);if(!same&&(d.ph!=='alert'||s!==d.tg||!a||typeof a!=='object'||!(a.s===0||a.s===1)||!Number.isInteger(a.ms)||a.ms<0||a.ms>30000))return false;
      if(!same&&o&&o.k===p.k&&o.ans)return false;}
    if(p.pick==null||p.pick===NOPICK||p.rd!==d.rd)return true;if(!tqNeed(d,s))return false;const x=p.pick;
    if(d.ph==='route')return [0,1,2].includes(x)&&x!==tqClosed(d);
    if(d.ph==='race')return !!x&&typeof x==='object'&&Number.isInteger(x.n)&&x.n>=0&&x.n<=60;
    return false;},
  net:{local:['sel','lap','cap','gold','gfl','tap'],host:['go','feel','next'],ui:['tqT','tqL','tqF','tqG','tqB']},
  viewer:d=>d.win!=null?null:d.ph==='plan'?d.lf:d.ph==='alert'?d.tg:d.ph==='route'||d.ph==='race'?simulViewer(d):null,
  coverMsg:d=>d.ph==='plan'?'أنت اللفّاف: خطّط بالسر 🤫':d.ph==='alert'?'💓 حسّيت بشي وراك؟ خذ الجوال بسرعة':d.ph==='route'?'مطاردة! اختر طريقك بالسر 🏃':d.ph==='race'?'سباق ضغط! 3 ثواني ⚡':'',
  points:d=>d.pl.map((_,s)=>(s===d.lf&&d.win==null?'🧢 ':'')+d.pd[s]),
  winText:d=>{const w=d.wins||[d.win];return `${w.map(s=>nm(d,s)).join(' و')} ${w.length>1?'فازوا':'فاز'} بأكثر نقاط! 🧢`;},
  winExtra:d=>`${d.why?d.why+' • ':''}`+d.pl.map((_,s)=>`${nm(d,s)} ${d.pd[s]}`).join('، '),
  status(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1;d=this.mask(d,me);const e=tqEvent(d,me);let todo='';
    if(d.win==null){const isL=me===d.lf,sitMe=me>=0&&!isL&&d.cr.includes(me);
      if(d.ph==='plan')todo=isL&&ctx.my?'اختر ورا مين، كم لفّة، وحقيقية ولا مزيّفة':'';
      
      else if(d.ph==='route')todo=(isL||me===d.tg)&&ctx.my?'اختر طريقك بالسر!':'';
      else if(d.ph==='race')todo=(isL||me===d.tg)&&ctx.my?'اضغط بأسرع ما تقدر!':'';}
    return `<div class="tq-st ${e.c}"><i>${e.i}</i><span><b>${e.t}</b>${e.x?`<small>${e.x}</small>`:''}</span></div>`+(todo?`<p class="tq-todo">${todo}</p>`:'');},
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1;d=this.mask(d,me);const fin=d.win!=null,ph=d.ph,isL=me===d.lf,N=s=>tqNm(d,s);
    const key=tqAK(d)+':'+ph+':'+me;if(S.tqKey!==key){S.tqKey=key;if(ph==='plan'){S.tqT=-1;S.tqL=d.one?1:2;S.tqF=0;S.tqG=0;S.tqB=0;}S.tqRt=-1;}
    this.sounds(d,me);
    const sitMe=me>=0&&!isL&&d.cr.includes(me)&&d.out[me]!=='1',my=tqMyPriv(d,me,ctx.priv);
    // the target's own clock starts when the cap first shows on this phone (as the speed games time a tap)
    const myAns=my&&my.ans?my.ans:null,iTg=!fin&&ph==='alert'&&me>=0&&me===d.tg&&!myAns;
    if(iTg&&(!S.tqA||S.tqA.k!==tqAK(d))){const t0=performance.now();S.tqA={k:tqAK(d),t0,bu:d.az&&d.az.bz?t0+2000:0,sent:0};try{KH.snd('heart');buzz();}catch(e){}}
    const racer=!fin&&ph==='race'&&(me===d.lf||me===d.tg)&&ctx.my;
    if(racer&&(!S.tqR||S.tqR.k!==tqAK(d)+':'+d.rd+':'+me))S.tqR={k:tqAK(d)+':'+d.rd+':'+me,t0:performance.now(),n:0,sent:0};
    const blur=iTg&&S.tqA&&S.tqA.bu>performance.now();
    let h=`<div class="tq kh ph-${ph}">`+tqHud(d,me)+`<div class="tq-stage ${blur?'gf':''}">`;
    h+=(ph==='route'||ph==='race')&&!fin?tqChase(d,me):tqScene(d,me,{...ctx,sit:sitMe},{});
    h+='</div>';
    if(fin)return h+tqSum(d)+'</div>';
    let a='',flow='';
    if(ph==='plan'){
      if(isL&&ctx.my){const t=S.tqT,ok=Number.isInteger(t)&&t>=0&&tqAlive(d).includes(t)&&t!==d.lf,L=d.one?1:[1,2,3].includes(S.tqL)?S.tqL:1,F=S.tqF&&d.fk[me]>0?1:0,G=!F&&S.tqG&&!d.gu[me]?1:0,B=S.tqB&&!d.gh[me]?1:0;
        a=`<div class="tq-seg tq-laps">${[1,2,3].map(k=>`<button class="tq-o ${L===k?'on':''}" data-ga="lap" data-i="${k}" ${d.one&&k>1?'disabled':''}><b>${k}</b><span>${['','لفّة','لفّتين','لفّات'][k]}</span><em dir="ltr">+${TQ_LAPV[k]*(G?2:1)}</em></button>`).join('')}</div>`+
          `<div class="tq-seg tq-caps"><button class="tq-o ${F?'':'on'}" data-ga="cap" data-i="0">${tqCapI('cap')}<span><b>حقيقية</b><small>بالجد</small></span></button>`+
          `<button class="tq-o ${F?'on':''}" data-ga="cap" data-i="1" ${d.fk[me]>0?'':'disabled'}>${tqCapI('fake')}<span><b>مزيّفة</b><small>باقي ${d.fk[me]}</small></span></button>`+
          `<button class="tq-o tq-gold ${G?'on':''}" data-ga="gold" ${d.gu[me]||F?'disabled':''}>${tqCapI('gold')}<span><b>ذهبية</b><small>${d.gu[me]?'انستخدمت':'النقاط ×٢'}</small></span></button>`+
          `<button class="tq-o tq-gfl ${B?'on':''}" data-ga="gfl" ${d.gh[me]?'disabled':''}><i>😵</i><span><b>غفلة</b><small>${d.gh[me]?'انستخدمت':'تغبّش شاشته'}</small></span></button></div>`+
          `<button class="big tq-go" data-ga="go" data-i="${ok?t:-1}" ${ok?'':'disabled'}>${ok?`ابدأ اللف ورا ${N(t)}`:'اختر ورا مين من الدائرة'}<small>${[L===1?'لفّة وحدة':L===2?'لفّتين':'ثلاث لفّات',F?'مزيّفة 🎭':G?'ذهبية ✨':'حقيقية',B?'غفلة 😵':'',d.one?'🍦 لفّة وحدة بس':''].filter(Boolean).join(' · ')}</small></button>`;}
      else a=`<p class="tq-wait">${nameTag(d,d.lf)} يخطط بالسر… 🤫</p>`;}
    else if(ph==='walk'){
      if(sitMe){const g=my&&tqCanGuess(d,me,my.g)?my.g:-1,sh=my&&tqCanGuess(d,me,my.s)?my.s:-1,last=d.tr[d.tr.length-1];
        a=(last?`<div class="tq-hint"><i>👣</i><span><b>أثر اللفّة ${last.l}</b><small>«حسّيت إنه بطّأ ورا ${last.s.map(N).join(' و')}»</small></span>${tqProp}</div>`:'')+
          `<div class="tq-two"><div class="big tq-gs ${g>=0?'on':''}">${g>=0?KH.face({who:d.pl[g],ring:1,size:34}):'<i>🎯</i>'}<span>${g>=0?`تخمينك: ${N(g)}`:'خمّن ورا مين'}<small>${g>=0?'+5 لو صح · تقدر تغيّر':'اضغط على واحد بالدائرة'}</small></span></div>`+
          `<button class="big tq-sc ${sh>=0?'on':''}" data-ga="shout" ${d.su[me]||g<0?'disabled':''}><i>📣</i><span>${sh>=0?'صرخت!':'صرخة'}<small>${d.su[me]?'انستخدمت':sh>=0?`على ${N(sh)} · اضغط تلغي`:g>=0?`على ${N(g)} · مرة باللعبة`:'مرة باللعبة'}</small></span></button></div>`;}
      else if(isL)a=`<p class="tq-wait">تلف ورا ${N(d.tg)}… ${d.pt?['','لفّة وحدة','لفّتين','ثلاث لفّات'][d.pt.l]:''} 🤫</p>`;
      else a=`<p class="tq-wait">${nameTag(d,d.lf)} يلف… والكل يخمّن بالسر</p>`;}
    else if(ph==='alert'){
      if(iTg){const fz=d.az&&d.az.fz,fr=d.az?d.az.fr:0;
        a=`<button class="big tq-saw" data-ga="see"><svg class="tq-cd" viewBox="0 0 64 64" width="60" height="60" aria-hidden="true"><circle cx="32" cy="32" r="27" class="tq-cdb"/><circle cx="32" cy="32" r="27" class="tq-cdf" stroke-dasharray="169.6 169.6" transform="rotate(-90 32 32)"/><text x="32" y="39" class="tq-cdt">${(tqLim(d)/1000).toFixed(1)}</text></svg><span>شفتها!<small>اضغط قبل ما يخلص الوقت</small></span></button>`+
          `<div class="tq-two"><button class="big tq-feel ${fz?'on':''}" data-ga="feel" ${d.fu[me]||fz?'disabled':''}><i>🖐</i><span>تحسّس<small>${fz?(fr===2?'مزيّفة! لا تضغط 🎭':'حقيقية! اضغط بسرعة'):d.fu[me]?'انستخدم':'حقيقية ولا مزيّفة؟ · −2ث'}</small></span>${tqProp}</button><div class="tq-risk"><b>مزيّفة وضغطت؟</b><small>تخسر 5</small></div></div>`;}
      else if(me===d.tg)a=`<p class="tq-wait">${myAns&&myAns.s?'ضغطت «شفتها!» ✓':'فاتتك… 😬'}</p>`;
      else a=`<p class="tq-wait">${isL?`نزّلتها ورا ${N(d.tg)}… هل بينتبه؟`:'نزّل الطاقية… مين بينتبه؟ 👀'}</p>`;}
    else if(ph==='route'){const iR=(isL||me===d.tg)&&me>=0,op=isL?d.tg:d.lf,cl=tqClosed(d);
      if(iR&&ctx.my){const hb=d.hb[op],tot=hb.reduce((x,y)=>x+y,0);
        a=`<p class="tq-lbl2">اختر طريقك بالسر · <span>عادات ${N(op)} ${tqProp}</span></p><div class="tq-routes">${[0,1,2].map(r=>`<button class="tq-rb rt${r} ${S.tqRt===r?'on':''}" data-ga="route" data-i="${r}" ${r===cl?'disabled':''}><b>${TQ_RS[r]}</b><small>${r===cl?'🌑 مسكّر':`${N(op)} <i class="tq-hbp">${[0,1,2].map(k=>`<u class="${k<hb[r]?'on':''}"></u>`).join('')}</i>`}</small>${r!==cl&&tot&&hb[r]===Math.max(...hb)&&hb[r]>0?'<em>عادته!</em>':''}</button>`).join('')}</div>`+
          `<p class="tq-tip">${isL?'لو اختار نفس طريقك: سباق ضغط. غيره: تفلت':'لو اخترت نفس طريقه: سباق ضغط. غيره: يفلت'}</p>`;}
      else if(iR)a=`<p class="tq-wait">اخترت ${Number.isInteger(my&&my.pick)?TQ_RT[my.pick]:''}… ننتظر ${N(op)}</p>`;
      else a=`<p class="tq-wait">مطاردة! ${nameTag(d,d.tg)} و${nameTag(d,d.lf)} يختارون طريقهم بالسر</p>`;}
    else if(ph==='race'){const iR=(isL||me===d.tg)&&me>=0;
      if(racer)a=`<div class="tq-race"><div class="tq-rbar"><i></i></div><button class="big tq-tap" data-ga="tap"><b class="tq-tapn">${S.tqR?S.tqR.n:0}</b><span>اضغط! اضغط!</span></button></div>`;
      else if(iR)a=`<p class="tq-wait">خلصت! ضغطت ${my&&my.pick&&my.pick.n!=null?my.pick.n:'…'} مرة</p>`;
      else a=`<p class="tq-wait">⚡ سباق ضغط بين ${nameTag(d,d.tg)} و${nameTag(d,d.lf)}</p>`;}
    else if(ph==='res'&&d.rr){flow=tqResRows(d);const nl=d.rr.nl;
      a=`<button class="big tq-next" data-ga="next">الجولة الجاية · ${nl===me?'أنت تلف':N(nl)+' يلف'}<small>${tqEvTxt(d,d.ev)&&d.nx1?'🍦 الجولة الجاية لفّة وحدة بس':'تبدأ لحالها بعد ثواني'}</small></button>`;}
    return h+flow+`<div class="tq-dock">${a}</div></div>`;},
  sounds(d,me){try{const k=tqAK(d)+':'+d.ph+':'+d.lp;if(S.tqSnd===k)return;S.tqSnd=k;
    if(d.ph==='walk')KH.snd('step');else if(d.ph==='alert'&&me!==d.tg)KH.snd('whoosh');else if(d.ph==='route')KH.snd('call');
    else if(d.ph==='res'&&d.rr){const o=d.rr.o;KH.snd(o==='catch'?'found':o==='esc'||o==='miss'?'safe':'meow');}}catch(e){}},
  click(a,i,d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1;if(d.win!=null)return;
    if(a==='sel'){if(d.ph==='plan'){if(me!==d.lf||!ctx.my||!tqAlive(d).includes(i)||i===d.lf)return;S.tqT=i;render();return;}
      if(d.ph==='walk'){if(me<0||me===d.lf||!d.cr.includes(me)||!tqCanGuess(d,me,i))return;const r=d.pl[me],p=tqMyPriv(d,me,S.priv)||{};const np={...p,gid:d.gid,k:d.rk,g:i};if(Number.isInteger(p.s)&&p.s>=0)np.s=i;setPriv(r,np);}return;}
    if(a==='lap'){if(d.ph!=='plan'||!(i>=1&&i<=3)||d.one&&i>1)return;S.tqL=i;render();return;}
    if(a==='cap'){if(d.ph!=='plan')return;S.tqF=i===1&&me>=0&&d.fk[me]>0?1:0;if(S.tqF)S.tqG=0;render();return;}
    if(a==='gold'){if(d.ph!=='plan'||me<0||d.gu[me]||S.tqF)return;S.tqG=S.tqG?0:1;render();return;}
    if(a==='gfl'){if(d.ph!=='plan'||me<0||d.gh[me])return;S.tqB=S.tqB?0:1;render();return;}
    if(a==='go'){if(d.ph!=='plan'||me!==d.lf||!ctx.my||!tqAlive(d).includes(i)||i===d.lf)return;act(tqGo(d,{t:i,l:S.tqL,f:S.tqF,g:S.tqG,b:S.tqB}));return;}
    if(a==='shout'){if(d.ph!=='walk'||me<0||me===d.lf||!d.cr.includes(me)||d.su[me])return;const r=d.pl[me],p=tqMyPriv(d,me,S.priv);if(!p||!tqCanGuess(d,me,p.g))return;
      setPriv(r,{...p,gid:d.gid,k:d.rk,s:Number.isInteger(p.s)&&p.s>=0?-1:p.g});return;}
    if(a==='see'){if(d.ph!=='alert'||me<0||me!==d.tg)return;const A=S.tqA&&S.tqA.k===tqAK(d)?S.tqA:null;if(A&&A.sent)return;const ms=A?Math.round(performance.now()-A.t0):0;if(A)A.sent=1;tqAnswer(d,me,1,ms);return;}
    if(a==='feel'){if(d.ph!=='alert'||me<0||me!==d.tg||!d.pt||!d.az||d.az.fz||d.fu[me])return;act(tqFeel(d));return;}
    if(a==='route'){if(d.ph!=='route'||(me!==d.lf&&me!==d.tg)||me<0||!ctx.my||![0,1,2].includes(i)||i===tqClosed(d))return;S.tqRt=i;simulPick(d,me,i);return;}
    if(a==='tap'){if(d.ph!=='race'||!S.tqR||S.tqR.sent||performance.now()-S.tqR.t0>TQ_T.race)return;S.tqR.n=Math.min(60,S.tqR.n+1);const el=document.querySelector('.tq-tapn');if(el)el.textContent=S.tqR.n;try{KH.snd('tick');}catch(e){}return;}
    if(a==='next'){if(d.ph!=='res'||(me>=0&&d.out[me]==='1'))return;act(tqNext(d));}},
  resolve(d,picks){if(d.ph==='route')return tqRouteEnd(d,picks);if(d.ph==='race')return tqRaceEnd(d,picks);return d;},
  // a player who left: out of the circle; the round starts over when it was the لفّاف or the target
  onSkip(nd,d){let x={...nd,win:null,turn:d.lf};delete x.wins;const al=aliveSeats(x);
    if(al.length<3)return tqEnd(x,'ما بقى لاعبين كفاية');
    x.cr=x.cr.filter(s=>x.out[s]!=='1');
    const lfGone=x.out[d.lf]==='1',tgGone=d.tg>=0&&x.out[d.tg]==='1'&&['walk','alert','route','race'].includes(d.ph);
    if(lfGone){const nl=x.cr[0];x.cr=x.cr.slice(1);return tqRound(x,nl);}
    if(tgGone)return tqRound(x,d.lf);
    return x;},
  bot(d,s,lv){if(d.win!=null||d.ph!=='plan'||s!==d.lf)return d;return tqBotPlan(d,lv);},
  botPick(d,s,lv){if(!tqNeed(d,s))return NOPICK;if(d.ph==='route')return tqBotRoute(d,s,lv);if(d.ph==='race')return {n:tqBotTaps(lv)};return NOPICK;},
  botDelay:(d,s,lv)=>d.ph==='plan'?1400+rnd(1600):d.ph==='route'?1500+rnd(2500):d.ph==='race'?TQ_T.race+rnd(400):BOTMS[lv]+rnd(800),
  // what every phone learns at a round's result: who misses real caps, who chases fakes
  botSee(nd){try{if(nd.ph!=='res'||!nd.rr)return;const M=tqMem(),k=nd.gid+':'+nd.rr.k;if(M.seen[k])return;M.seen[k]=1;if(++M.n>400){M.seen={};M.n=0;}
    const r=nd.rr,x=M.r[nd.pl[r.tg]]||(M.r[nd.pl[r.tg]]={sp:0,mi:0,fc:0,fi:0});if(r.o==='miss')x.mi++;else if(r.o==='esc'||r.o==='catch')x.sp++;else if(r.o==='fs')x.fc++;else if(r.o==='fi')x.fi++;}catch(e){}}};

// the target answers on its own phone; the host reads it from its private part
function tqAnswer(d,me,s,ms){const r=d.pl[me],p=tqMyPriv(d,me,S.priv)||{};setPriv(r,{...p,gid:d.gid,k:d.rk,ans:{s,ms:Math.max(0,Math.min(30000,Math.round(ms)))}});}
/* ---------- the clocks and the moving parts: only the enforcer (this phone, or the room's host) moves the game on ---------- */
function tqSetD(nd){S.st={...S.st,d:nd};save();render();}
function tqTick(d,now){const local=tqLocal();
  if(local&&(S.browse||S.modal||app.querySelector('.cover')))return;
  if(local){if(d.ph==='walk'){if(!d.w0){tqSetD({...d,w0:now,we:now+d.pt.wd});return;}}
    else{const who=mkCtx().v;const w=who==null?-1:who;if(d.dl===0||w!==d.dv){tqSetD({...d,dl:now+(d.T||5000),dv:w,...(d.ph==='alert'&&!d.a0?{a0:now}:{})});return;}}}
  const res=()=>act(GAMES.taqiya.resolve(d,simulPicks(d).map(x=>x===undefined?null:x)));
  switch(d.ph){
    case 'plan':if(d.dl>0&&now>=d.dl)act(tqGo(d,{}));return;
    case 'walk':if(now>=d.we){act(tqDrop(d));return;}{const k=Math.floor((now-d.w0)/TQ_T.lap)+1;if(k>d.lp)act(tqLap(d,k));}return;
    case 'alert':{const key=tqAK(d),ans=tqAns(d);if(ans){act(tqAlertEnd(d,ans));return;}
      if(isBot(d,d.tg)&&d.az){const lv=botLv(d,d.tg);if(!d.az.fz&&S.tqBF!==key){S.tqBF=key;if(tqBotFeels(d,lv)){act(tqFeel(d));return;}}
        const R=Math.min(tqReact(GAMES.taqiya.mask(d,d.tg),d.tg,lv),tqLim(d));if(d.a0>0&&now-d.a0>=R){act(tqAlertEnd(d,tqBotAlert(d,d.tg,lv)));return;}}
      if(d.dl>0&&now>=d.dl)act(tqAlertEnd(d,null));return;}
    case 'route':case 'race':if(d.dl>0&&now>=d.dl)res();return;
    case 'res':if(d.dl>0&&now>=d.dl)act(tqNext(d));return;}}
// this phone's own view: the walker on the ring, the target's arc and its own timeout, the blur, the race's 3 seconds
function tqDom(d,now){const ctx=mkCtx(),me=ctx.v!=null&&ctx.v>=0?ctx.v:-1,v=GAMES.taqiya.mask(d,me),t=performance.now();
  const ck=document.querySelector('.tq-clk b');if(ck&&v.end>0){const x=tqFmt(v.end-now);if(ck.textContent!==x)ck.textContent=x;}
  const w=document.querySelector('.tq-w');
  if(w&&(v.ph==='walk'||v.ph==='alert')){let a;
    if(v.ph==='walk'){const k=tqAK(v)+':'+v.lp;if(!S.tqWs||S.tqWs.k!==k)S.tqWs={k,t:now};a=TQA0+2*Math.PI*(v.lp-1)+2*Math.PI*Math.min(.97,(now-S.tqWs.t)/TQ_T.lap);
      if(me===v.lf&&v.pt&&v.pt.wd)a=Math.min(a,TQA0+2*Math.PI*v.pt.wd/TQ_T.lap);}
    else{const k=tqAK(v);if(!S.tqWal||S.tqWal.k!==k)S.tqWal={k,t:now,a:v.tg>=0?tqAng(v,v.tg)+.55:(S.tqWa&&S.tqWa.gid===v.gid?S.tqWa.a:TQA0)};a=S.tqWal.a+2*Math.PI*1.4*(now-S.tqWal.t)/TQ_T.lap;}
    S.tqWa={gid:v.gid,a};const [x,y]=tqXY(a,TQOUT);w.style.transform=`translate(${KH.f(x)}px,${KH.f(y)}px)`;w.classList.toggle('fl',Math.cos(a)>0);
    const L=document.querySelector(Math.cos(a)<0?'.tq-wb':'.tq-wf');if(L&&w.parentNode!==L)L.appendChild(w);}
  // the target: the arc, the seconds, «فاتتك» when the time is up on this phone
  if(v.ph==='alert'&&me>=0&&me===v.tg&&S.tqA&&S.tqA.k===tqAK(v)){const lim=tqLim(v),el=t-S.tqA.t0,fr=Math.max(0,Math.min(1,1-el/lim));
    for(const c of document.querySelectorAll('.tq-arc,.tq-cdf')){const C=c.classList.contains('tq-cdf')?169.6:+c.getAttribute('data-c');c.setAttribute('stroke-dasharray',`${KH.f(C*fr)} ${KH.f(C)}`);}
    const tx=document.querySelector('.tq-cdt');if(tx)tx.textContent=(Math.max(0,lim-el)/1000).toFixed(1);
    const st=document.querySelector('.tq-stage');if(st){st.classList.toggle('gf',S.tqA.bu>t);
      // a short phone: the stage comes up above the buttons, once
      if(!S.tqA.sc){S.tqA.sc=1;const r=st.getBoundingClientRect(),dk=document.querySelector('.tq-dock'),lim=dk?dk.getBoundingClientRect().top:innerHeight;if(r.bottom>lim)try{scrollBy({top:Math.min(r.top,r.bottom-lim+6),behavior:'instant'});}catch(e){}}}
    if(el>=lim&&!S.tqA.sent){S.tqA.sent=1;tqAnswer(d,me,0,Math.round(lim));}}
  if(v.ph==='race'&&me>=0&&(me===v.lf||me===v.tg)&&ctx.my&&S.tqR&&S.tqR.k===tqAK(v)+':'+v.rd+':'+me&&!S.tqR.sent){const el=t-S.tqR.t0,b=document.querySelector('.tq-rbar i');if(b)b.style.transform=`scaleX(${Math.max(0,1-el/TQ_T.race).toFixed(3)})`;
    if(el>=TQ_T.race){S.tqR.sent=1;simulPick(d,me,{n:S.tqR.n});}}}
setInterval(()=>{if(S.st.g!=='taqiya'||!GAMES.taqiya)return;const d=S.st.d;if(!d||d.win!=null)return;const now=Date.now();
  if(S.mode==='local'&&(S.browse||app.querySelector('.cover')))return;
  try{tqDom(d,now);}catch(e){console.error('taqiya dom',e);}
  if(!isEnforcer()||S.holdRender||(S.mode!=='local'&&S.mode!=='online'))return;
  if(now-(S.tqTk||0)<380)return;S.tqTk=now;
  try{tqTick(d,now);}catch(e){console.error('taqiya tick',e);}},150);

HELP.taqiya='طاق طاق طاقية بالليل في الحوش: الكل قاعدين بدائرة، وواحد «اللفّاف» يلف حولهم وبيده الطاقية. 1) الخطة بالسر: يختار ورا مين بيحطها، وكم لفّة يلف (لفّة +10، لفّتين +15، ثلاث +20)، وحقيقية ولا مزيّفة (لكل واحد طاقيتين مزيّفة باللعبة، وعدّادها ظاهر للكل). ومرة باللعبة يقدر يخليها «ذهبية» (النقاط ضعف)، ومرة يسوي «غفلة» (شاشة اللي وراه تتغبّش ثانيتين). 2) اللف: كل لفّة بعد الأولى تترك أثر للكل: «حسّيت إنه بطّأ ورا فلان وفلان»، واحد منهم هو المقصود. الجالسين يخمّنون بالسر ورا مين (+5 للي يصيب)، وكل واحد عنده «صرخة» وحدة باللعبة: لو صرخ باسم اللي وراه صح ياخذ ثانيتين زيادة وينتبه، ولو غلط −5 على اللي صرخ. 3) الانتباه: اللي وراه الطاقية بس يشوفها تلمع، وعنده 4 ثواني يضغط «شفتها!». «تحسّس» مرة باللعبة: ياكل ثانيتين ويقولك حقيقية ولا مزيّفة. لو ما انتبه للحقيقية: اللفّاف يقعد مكانه وياخذ نقاط اللفّات منه، وهو يصير اللفّاف. لو ضغط على مزيّفة −5، ولو طنّشها ما صار شي واللفّاف يلف مرة ثانية. 4) المطاردة لو شاف الحقيقية: كل واحد يختار بالسر «طريق الشارع» أو «الحوش» أو «السطح» (وعادات كل واحد ظاهرة). لو اختلفوا: اللفّاف يفلت وياخذ النقاط والثاني يصير اللفّاف. لو نفس الطريق: سباق ضغط 3 ثواني، الأسرع ياخذ +5: لو اللي وراه ضغط أكثر (أو تعادلوا) يمسك اللفّاف وياخذ النقاط منه واللفّاف يلف مرة ثانية، ولو اللفّاف أسرع يفلت. كل جولة فيها حدث: 🐈 قطو يعدّي ورا واحد (انتباهه أقصر بثانية)، 🌑 النور ينطفي (السطح مسكّر والآثار أغمض: ثلاث أسماء)، 🍦 بيّاع الآيس كريم (الجولة الجاية لفّة وحدة). اللعبة 5 دقايق أو جولتين لكل لاعب، واللي ما لفّ ياخذ دوره قبل النهاية. النقاط ما تنزل تحت الصفر، والأكثر نقاط يفوز.';

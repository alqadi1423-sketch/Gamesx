'use strict';
/* =====================================================================================================
   «طاق طاق طاقية» (taqiya), v2: the real circle game, felt with the hands and the ears.
   One goal: don't get caught napping. If the cap lands behind you, catch the one who dropped it.

   The walker («اللفّاف») drags their kid round the ring with a finger; every step moves the chant on
   («طاق طاق طاقية… شبّاك ورا شبّاك…», sung by a synth; a real recording plays instead once audio/taqiya.json names it). A flick (or the cap button) drops the cap behind the sitter they are passing.
   They keep walking to bluff; when they come right round to the cap again, that sitter is «شرب»: −1, and they swap.
   Every sitter sees the circle from their own place: the others in front, nothing behind. They hear the steps behind
   them (stereo, nearer and louder), see the walker's shadow sweep over the floor, feel the heartbeat when he is right
   behind. A quick twist of the phone (or the «التفت» button, or a swipe down) turns round: 3 looks a round. The cap
   there: grab it and chase. The chase is run by drawing circles with a finger (the speed is capped and checked on the
   host): the walker races for the empty place, the chaser tries to touch him first.
   Points: +1 the walker who takes a place, +1 the chaser who touches, −1 the one caught napping (never below 0).
   5 minutes; the most points wins.

   Online: the walker's steps, drop and the runners' distances go in their private parts (hidden from all others);
   the host clamps and checks them and publishes positions. Where the cap lies (dp) is the walker's alone until it is
   found or the lap comes round; a look is answered by the host. Bots (and absent players) are moved by the host.
   ===================================================================================================== */
const TQ={VW:300,VR:520,VA:110,LOOKS:3,GAME:300000,RES:3200,CHASE:9000,TICK:200,TAG:60,DROP2:2000,WALKMAX:40000};
// the chant, a word a step (a real recording at audio/taqiya-chant.mp3 plays instead of the sung melody if it is there)
const TQ_CHANT=['طاق','طاق','طاقية','شبّاك','ورا','شبّاك','رنّ','رنّ','يا جرس','حوّل','واركب','الفرس'];
const TQ_STEP=40; // milli-laps a step
const tqLocal=()=>S.mode==='local';
const tqMod=x=>((x%1000)+1000)%1000;
const tqW=x=>{x=tqMod(x);return x>500?x-1000:x;};   // −500..500
const tqSlot=(d,i)=>{const m=d.cr.length;return Math.round(1000*(i+(m%2?0:.5))/m);};
const tqTh=(d,s)=>{const i=d.cr.indexOf(s);return i<0?0:tqSlot(d,i);};
const tqNm=(d,s)=>escH(pnameText(d.pl[s]));
// a bot plays this seat: a bot on this phone, or the host's bot for a player who left the room
const tqIsBot=(d,s)=>isBot(d,s)||(S.mode==='online'&&typeof abOn==='function'&&abOn(d.pl[s]));
const tqPriv=(d,s)=>{const p=S.priv[d.pl[s]];return p&&p.gid===d.gid&&p.k===d.rk?p:null;};

/* ---------- the rules (pure; the host runs them) ---------- */
// a round: walker L stands up behind the place at milli-lap th
function tqRound(d,L,th,now){return {...d,ph:'walk',lf:L,turn:L,rk:d.rk+1,wp:th,w0:th,t0:now,ht:now,mv:now,dp:null,lk:d.pl.map(()=>0),lr:null,ch:null,rs:null,dl:0};}
// the slot nearest to a milli-lap position; and the drop behind seat s while passing (else the nearest)
function tqNearest(d,wp){let b=0,bd=1e9;d.cr.forEach((s,i)=>{const x=Math.abs(tqW(tqSlot(d,i)-wp));if(x<bd){bd=x;b=i;}});return b;}
function tqDrop(d,s){if(d.ph!=='walk'||d.dp)return d;const m=d.cr.length,half=Math.round(600/m);let i=d.cr.indexOf(s);
  if(i<0||d.out[s]==='1'||Math.abs(tqW(tqSlot(d,i)-d.wp))>half)i=tqNearest(d,d.wp);const at=d.wp-tqW(d.wp-tqSlot(d,i));
  return {...d,dp:{s:d.cr[i],p:at}};}
// a sitter turns round: the host answers; the cap behind them starts the chase
function tqLook(d,s,now){if(d.ph!=='walk'||s===d.lf||!d.cr.includes(s)||d.out[s]==='1'||d.lk[s]>=TQ.LOOKS)return d;
  const lk=d.lk.slice();lk[s]++;const hit=!!(d.dp&&d.dp.s===s);const lr={s,hit:hit?1:0,k:(d.lr?d.lr.k:0)+1,at:d.wp};
  const nd={...d,lk,lr};if(!hit)return nd;
  return {...nd,ph:'chase',ch:{c:s,w:d.wp,c0:d.dp.p,cc:d.dp.p,w0:d.wp,goal:d.dp.p+1000,t0:now},ht:now,dl:now+TQ.CHASE};}
// the end of a round. o: nap (the lap came round: «شرب»), esc (the walker reached the place), tag (the chaser touched him)
function tqFinish(d,o,now){const L=d.lf,t=d.dp?d.dp.s:-1,dl=d.pl.map(()=>0);
  if(o==='nap'){dl[L]++;dl[t]--;}else if(o==='esc')dl[L]++;else if(o==='tag')dl[t]++;
  const pd=d.pd.map((v,s)=>Math.max(0,v+dl[s])),dp=pd.map((v,s)=>v-d.pd[s]),cr=d.cr.slice();let nl=L;
  if(o==='nap'||o==='esc'){const i=cr.indexOf(t);if(i>=0)cr[i]=L;nl=t;}
  const nth=o==='tag'?tqMod(d.ch?d.ch.w:d.wp):(d.dp?tqMod(d.dp.p):tqMod(d.wp));
  return {...d,ph:'res',pd,cr,rs:{o,w:L,t,dp,nl,th:nth},dl:now+TQ.RES,ht:now};}
function tqNext(d,now){if(d.end>0&&now>=d.end)return tqEnd(d,'خلص الوقت ⏱');const al=aliveSeats(d);if(al.length<3)return tqEnd(d,'ما بقى لاعبين كفاية');
  const r=d.rs||{nl:d.lf,th:tqMod(d.wp)};let L=r.nl;if(d.out[L]==='1'){L=d.cr.find(s=>d.out[s]!=='1');d={...d,cr:d.cr.filter(s=>s!==L)};}
  return tqRound({...d,rn:d.rn+1},L,r.th,now);}
function tqEnd(d,why){const pd=d.pd.slice(),al=aliveSeats(d),mx=Math.max(...al.map(s=>pd[s])),top=al.filter(s=>pd[s]===mx);
  return {...d,ph:'end',dsc:pd,win:top[0],wins:top,why,dl:0,turn:d.lf};}
// one host step of the walk: the walker's new place (clamped to a walking pace), the drop, «شرب»
function tqWalk(d,now,want,drop,auto){const dt=Math.max(1,Math.min(1000,now-d.ht));let wp=d.wp,mv=d.mv;
  const hi=wp+Math.ceil(TQ.VW*dt/1000*1.3)+15;if(Number.isFinite(want)&&want>wp){wp=Math.min(Math.round(want),hi);if(!auto)mv=now;}
  let nd={...d,wp,ht:now,mv};if(drop!=null&&!nd.dp&&wp-d.w0>=60)nd=tqDrop(nd,drop);
  // nobody may stall the circle: no drop after two laps (or 40 s): it falls behind the next one passed
  if(!nd.dp&&(wp-d.w0>=TQ.DROP2||now-d.t0>TQ.WALKMAX))nd=tqDrop(nd,nd.cr[tqNearest(nd,wp)]);
  if(nd.dp&&nd.wp>=nd.dp.p+1000)return tqFinish({...nd,wp:nd.dp.p+1000},'nap',now);
  return nd;}
// one host step of the chase: each runner's distance (clamped to a running pace)
function tqRun(d,now,wantW,wantC){const ch=d.ch,dt=Math.max(1,Math.min(1000,now-d.ht)),cap=Math.ceil(TQ.VR*dt/1000*1.25)+10;
  const w=Number.isFinite(wantW)&&wantW>ch.w?Math.min(Math.round(wantW),ch.w+cap):ch.w,cc=Number.isFinite(wantC)&&wantC>ch.cc?Math.min(Math.round(wantC),ch.cc+cap):ch.cc;
  const nd={...d,ch:{...ch,w,cc},wp:w,ht:now};
  if(cc>=w-TQ.TAG)return tqFinish(nd,'tag',now);
  if(w>=ch.goal)return tqFinish(nd,'esc',now);
  if(now>=d.dl){const left=(ch.goal-w)/1000,gap=(w-cc)/1000;return tqFinish(nd,left<=gap?'esc':'tag',now);}
  return nd;}

/* ---------- bots (and players who left the room): moved by the host, reading only what their seat sees ---------- */
const tqLv=(d,s)=>isBot(d,s)?botLv(d,s):2;
// the walker: its own pace, a bluff (lingering behind someone), then the drop behind its pick while passing
function tqBotWalk(d,now,lv){const k=d.gid+':'+d.rk;let B=S.tqBW;
  if(!B||B.k!==k){const sit=d.cr.filter(s=>d.out[s]!=='1');B=S.tqBW={k,t:sit[rnd(sit.length)],v:(lv===1?150:lv===2?150:150)+rnd(lv===1?80:lv===2?110:150),run:lv===1?rnd(200):lv===2?rnd(700):250+rnd(900),ling:0,next:now+800+rnd(1500)};}
  const dt=Math.max(1,Math.min(1000,now-d.ht));let v=d.dp?(lv===3?270:lv===2?235:190):B.v,drop=null;
  if(now<B.ling)v=40;else if(!d.dp&&lv>=2&&now>B.next){B.next=now+1500+rnd(2500);const near=d.cr.some(s=>Math.abs(tqW(d.wp-tqTh(d,s)))<45);if(near&&Math.random()<(lv===3?.7:.45))B.ling=now+500+rnd(800);}
  if(!d.dp&&d.wp-d.w0>=B.run&&Math.abs(tqW(d.wp-tqTh(d,B.t)))<40)drop=B.t;
  return {want:d.wp+v*dt/1000,drop};}
// a sitter: after the steps pass right behind, a look now and then (more when he lingered there), 3 a round
function tqBotLooks(d,nd,now){const m=S.tqBL&&S.tqBL.k===d.gid+':'+d.rk?S.tqBL:(S.tqBL={k:d.gid+':'+d.rk,at:{},ling:{}});let x=nd;
  for(const s of d.cr){if(d.out[s]==='1'||!tqIsBot(d,s)||x.lk[s]>=TQ.LOOKS||x.ph!=='walk')continue;const lv=tqLv(d,s),th=tqTh(d,s),a=tqW(d.wp-th),b=tqW(x.wp-th);
    if(Math.abs(b)<45&&x.wp-d.wp<12)m.ling[s]=(m.ling[s]||0)+1;
    if(a<0&&b>=0&&!(m.at[s]>now)){const long=x.wp-x.w0>700?.15:0,lg=(m.ling[s]||0)>=2?.3:0;m.ling[s]=0;
      const P=(lv===1?.2:lv===2?.32:.42)+lg+long+(lv===3&&x.lk[s]===0?.08:0);if(Math.random()<P)m.at[s]=now+(lv===1?900+rnd(1300):lv===2?500+rnd(900):280+rnd(600));}
    // the walker comes round again after a long walk: a careful sitter checks before the lap closes
    if(lv>=2&&b<0&&b>-120&&x.wp-x.w0>900&&x.lk[s]<TQ.LOOKS-1&&!(m.at[s]>0)&&Math.random()<(lv===3?.08:.04))m.at[s]=now+300;
    if(m.at[s]>0&&now>=m.at[s]){m.at[s]=0;x=tqLook(x,s,now);if(x.ph!=='walk')return x;}}
  return x;}
const tqBotRun=lv=>TQ.VR*(lv===1?.7+Math.random()*.15:lv===2?.78+Math.random()*.14:.86+Math.random()*.11);

/* ---------- the host: every 200 ms it moves the round on from the phones' private parts, the bots and the clocks ---------- */
function tqHost(d,now){
  if(d.ph==='walk'){const L=d.lf;let want,drop=null;
    let auto=false;
    if(tqIsBot(d,L)){const b=tqBotWalk(d,now,tqLv(d,L));want=b.want;drop=b.drop;}
    else{const p=tqPriv(d,L);if(p){if(Number.isFinite(p.wp))want=p.wp;if(p.dr&&Number.isInteger(p.dr.s))drop=p.dr.s;}
      // a walker who stands still: the host walks them on slowly, so the circle never stops
      if(!(want>d.wp)&&now-d.mv>3500){want=d.wp+TQ.VA*Math.min(1000,now-d.ht)/1000;auto=true;}}
    let nd=tqWalk(d,now,want,drop,auto);if(nd.ph==='walk')nd=tqBotLooks(d,nd,now);return nd;}
  if(d.ph==='chase'){const ch=d.ch,dt=Math.min(1000,now-d.ht)/1000,run=(s,base,cur)=>{if(tqIsBot(d,s))return cur+tqBotRun(tqLv(d,s))*dt;const p=tqPriv(d,s);return p&&Number.isFinite(p.rn)?base+p.rn:cur;};
    return tqRun(d,now,run(d.lf,ch.w0,ch.w),run(ch.c,ch.c0,ch.cc));}
  if(d.ph==='res'&&now>=d.dl)return tqNext(d,now);
  return d;}
function tqPush(nd){const was=S.inIntent;S.inIntent=true;try{act(nd);}finally{S.inIntent=was;}}
function tqHostTick(now){const d=S.st.d;if(!d||d.win!=null)return;const nd=tqHost(d,now);if(!nd||nd===d)return;
  // only what others can see is sent: the host's own clock (ht) alone is not worth a message
  if(nd.ph===d.ph&&nd.wp===d.wp&&nd.dp===d.dp&&nd.lk===d.lk&&nd.ch===d.ch&&nd.lr===d.lr)return;tqPush(nd);}

/* ---------- real sounds, made here with Web Audio (silent when muted) ---------- */
const TQA={ctx:null,nb:null,rec:null,recOk:false,tried:false};
function tqAC(){if(S.mute)return null;try{const c=(typeof actx!=='undefined'&&actx)||TQA.ctx||(TQA.ctx=new (window.AudioContext||window.webkitAudioContext)());if(c.state==='suspended')c.resume();return c;}catch(e){return null;}}
function tqNoise(c){if(!TQA.nb||TQA.nb.sampleRate!==c.sampleRate){const n=c.sampleRate,b=c.createBuffer(1,n,c.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;TQA.nb=b;}return TQA.nb;}
function tqOut(c,pan,vol){const g=c.createGain();g.gain.value=vol;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));g.connect(p).connect(c.destination);}else g.connect(c.destination);return g;}
function tqEnv(c,g,t,a,v,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
function tqBurst(c,o,t,{f=900,q=1,type='bandpass',v=.5,a=.005,d=.1,off}={}){const s=c.createBufferSource();s.buffer=tqNoise(c);const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();tqEnv(c,g,t,a,v,d);s.connect(fl).connect(g).connect(o);s.start(t,off??Math.random()*.8,a+d+.05);}
function tqTone(c,o,t,f,{f2,type='sine',v=.4,a=.008,d=.12}={}){const k=c.createOscillator(),g=c.createGain();k.type=type;k.frequency.setValueAtTime(f,t);if(f2)k.frequency.exponentialRampToValueAtTime(f2,t+a+d);tqEnv(c,g,t,a,v,d);k.connect(g).connect(o);k.start(t);k.stop(t+a+d+.05);}
const TQS={
  // a step on dirt: a short crunch and a soft knock; louder and panned by where the walker is
  step(vol=.5,pan=0,run=0){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,pan,vol);tqBurst(c,o,t,{f:run?1500:800+Math.random()*500,q:.8,v:.9,d:run?.06:.1});tqBurst(c,o,t+.012,{f:3200,q:1.2,v:.25,d:.04});tqTone(c,o,t,run?130:105,{f2:52,v:.45,d:.09});},
  thud(){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,0,.7);tqBurst(c,o,t,{type:'lowpass',f:500,q:.5,v:.9,a:.004,d:.16});tqTone(c,o,t,90,{f2:45,v:.6,d:.18});},
  whoosh(){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,0,.5),s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=tqNoise(c);fl.type='bandpass';fl.Q.value=1.4;fl.frequency.setValueAtTime(400,t);fl.frequency.exponentialRampToValueAtTime(2600,t+.3);tqEnv(c,g,t,.08,.8,.3);s.connect(fl).connect(g).connect(o);s.start(t,0,.5);},
  heart(vol=.6){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,0,vol);tqTone(c,o,t,62,{f2:48,v:.9,a:.01,d:.13});tqTone(c,o,t+.2,56,{f2:44,v:.7,a:.01,d:.15});},
  clap(vol=.5,pan=0){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,pan,vol);for(let i=0;i<3;i++)tqBurst(c,o,t+i*.009,{type:'highpass',f:1100,q:.7,v:.8,a:.002,d:.05});},
  // a crowd of kids: bands of noise swelling, a few high voices, and claps
  cheer(){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,0,.35);for(const f of [700,1100,1700])tqBurst(c,o,t,{f,q:2.5,v:.5,a:.18,d:.9});
    for(let i=0;i<4;i++){const k=c.createOscillator(),g=c.createGain(),lf=c.createOscillator(),lg=c.createGain();k.type='triangle';const f0=520+rnd(380);k.frequency.value=f0;lf.frequency.value=5+Math.random()*3;lg.gain.value=f0*.03;lf.connect(lg).connect(k.frequency);tqEnv(c,g,t+i*.05,.15,.1,.8);k.connect(g).connect(o);k.start(t);lf.start(t);k.stop(t+1.2);lf.stop(t+1.2);}
    for(let i=0;i<8;i++)setTimeout(()=>TQS.clap(.35,Math.random()*1.4-.7),120+i*130+rnd(60));},
  // the chant: a clap and a sung syllable (a soft voice with vibrato and a vowel formant)
  word(i){const c=tqAC();if(!c)return;const t=c.currentTime,o=tqOut(c,0,.32),N=[659,659,784,880,784,659,587,587,659,784,659,587],f0=N[i%N.length];
    tqBurst(c,o,t,{type:'highpass',f:1300,q:.7,v:.6,a:.002,d:.05});if(TQA.recOk)return;
    const k=c.createOscillator(),k2=c.createOscillator(),fl=c.createBiquadFilter(),g=c.createGain(),lf=c.createOscillator(),lg=c.createGain();
    k.type='triangle';k2.type='sine';k.frequency.value=f0;k2.frequency.value=f0*2;lf.frequency.value=5.6;lg.gain.value=f0*.012;lf.connect(lg);lg.connect(k.frequency);lg.connect(k2.frequency);
    fl.type='bandpass';fl.frequency.value=1000;fl.Q.value=1.1;tqEnv(c,g,t,.03,.5,.24);k.connect(fl);k2.connect(fl);fl.connect(g).connect(o);for(const x of [k,k2,lf]){x.start(t);x.stop(t+.32);}}};
// a real recording dropped in later (public/audio/, named in audio/taqiya.json) plays during the walk; else the synth
// the hook: audio/taqiya.json names the file ({"chant":"taqiya-chant.mp3"}); null (as shipped) asks for nothing, so no 404
function tqRec(on,rate){try{if(!TQA.tried){TQA.tried=true;fetch('audio/taqiya.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{const f=j&&typeof j.chant==='string'&&/^[\w.-]+\.(mp3|ogg|m4a)$/.test(j.chant)?j.chant:null;if(!f)return;
    const a=new Audio();a.loop=true;a.preload='auto';a.addEventListener('canplaythrough',()=>{TQA.recOk=true;},{once:true});a.addEventListener('error',()=>{TQA.recOk=false;},{once:true});a.src='audio/'+f;TQA.rec=a;}).catch(()=>{});}
  const a=TQA.rec;if(!a||!TQA.recOk)return;if(on&&!S.mute){a.playbackRate=Math.max(.7,Math.min(1.4,rate||1));if(a.paused)a.play().catch(()=>{});}else if(!a.paused)a.pause();}catch(e){}}

/* ---------- drawing: the courtyard from above (the walker, the chase, the watchers) ---------- */
const TQW=360,TQH=440,TQCX=180,TQCY=262,TQRX=118,TQRY=84,TQOUT=40,TQKY=.6,TQ_SKY=40,TQ_TOP=88,TQ_WIN=[52,96,264,308],TQ_GATE=TQH-62;
const tqXY=(m,out=0)=>{const a=2*Math.PI*m/1000;return [TQCX-(TQRX+out)*Math.sin(a),TQCY+(TQRY+out*TQKY)*Math.cos(a)];};
function tqStars(w,h,n,seed){let a='',b='',r=seed||7;const R=()=>(r=(r*9301+49297)%233280)/233280;for(let i=0;i<n;i++){const x=KH.f(R()*w),y=KH.f(R()*h),k=R();if(k>.5)a+=`M${x} ${y}h0`;else b+=`M${x} ${y}h0`;}
  return `<path d="${a}" stroke="#FFF4D6" stroke-width="2.2" stroke-linecap="round" opacity=".8"/><path d="${b}" stroke="#FFF4D6" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`;}
// the far house: crenellated parapet, lit windows, the green door
function tqFacade(W,top,h,wins,door,OL){let s='',cr='';for(let x=4;x<W;x+=13)cr+=`M${x} ${top}l4.5-7 4.5 7z`;
  s+=`<path d="${cr}" fill="#C9A577" stroke="${OL}" stroke-width="1.2"/><rect x="-2" y="${top}" width="${W+4}" height="12" fill="#D6B588" stroke="${OL}" stroke-width="1.6"/><path d="M0 ${top+6}H${W}" stroke="#EED7AE" stroke-width="2.4" stroke-dasharray="5 3.5"/>`;
  s+=`<rect x="-2" y="${top+12}" width="${W+4}" height="${h-12}" fill="#A9835B" stroke="${OL}" stroke-width="1.6"/><path d="M0 ${top+h-3}H${W}" stroke="#8E6B48" stroke-width="5"/>`;
  const fh=h-22;for(const wx of wins)s+=KH.art.pool(wx,top+24+fh/2,24)+`<rect x="${wx-6}" y="${top+22}" width="12" height="${fh-2}" rx="5" fill="#FFD27A" stroke="${OL}" stroke-width="1.3"/><path d="M${wx} ${top+23}v${fh-4}M${wx-6} ${top+22+fh/2}h12" stroke="#C98F1A" stroke-width="1.2"/>`;
  if(door)s+=`<rect x="${door-11}" y="${top+18}" width="22" height="${h-18}" rx="3" fill="#2E8B6A" stroke="${OL}" stroke-width="1.5"/><path d="M${door} ${top+20}v${h-22}" stroke="#000" stroke-opacity=".25"/><circle cx="${door-4}" cy="${top+h/2+6}" r="1.3" fill="#F0B429"/><circle cx="${door+4}" cy="${top+h/2+6}" r="1.3" fill="#F0B429"/>`;
  return s;}
function tqArt(){const A=KH.art,OL=KH.OL,W=TQW,H=TQH,sky=TQ_SKY,top=TQ_TOP;
  let s=A.defs()+A.defs2()+`<defs><linearGradient id="tqs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1222"/><stop offset="1" stop-color="#1D2C4A"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#594634"/>`;
  let tl='';for(let y=top+18;y<H;y+=30)tl+=`M0 ${y}H${W}`;for(let x=15;x<W;x+=34)tl+=`M${x} ${top}V${H}`;s+=`<path d="${tl}" stroke="#46362A" stroke-width="1.4"/>`;
  s+=`<rect width="${W}" height="${sky+6}" fill="url(#tqs)"/>`+tqStars(W,sky-4,22)+A.moon(300,22)+tqFacade(W,sky,top-sky,TQ_WIN,180,OL)+A.stairs(12,sky+8,44,top-sky-6);
  s+=`<rect x="-4" y="${top}" width="14" height="${H-top+4}" fill="#D6B588" stroke="${OL}" stroke-width="1.6"/><rect x="${W-10}" y="${top}" width="14" height="${H-top+4}" fill="#D6B588" stroke="${OL}" stroke-width="1.6"/><path d="M3 ${top}V${H}M${W-3} ${top}V${H}" stroke="#EED7AE" stroke-width="2.4" stroke-dasharray="5 3.5"/>`;
  s+=A.pool(W-18,TQ_GATE,30)+`<rect x="${W-12}" y="${TQ_GATE-20}" width="10" height="40" rx="2" fill="#2E8B6A" stroke="${OL}" stroke-width="1.4"/>`;
  s+=`<ellipse cx="${W-34}" cy="${top+34}" rx="16" ry="6" fill="#000" opacity=".3"/><path d="M${W-46} ${top+20}h24l-3 15h-18z" fill="#B5652A" stroke="${OL}" stroke-width="1.4"/>`+A.palm(W-34,top+14,.8).replace(/<ellipse[^>]*\/>/,'')+A.jar(32,top+22);
  s+=A.rug(TQCX,TQCY,TQRX+30,TQRY+22)+`<rect width="${W}" height="${H}" fill="url(#v)" opacity=".45"/>`+A.lights(-2,sky+10,W*.52,sky+14,54,9,0)+A.lights(W*.52,sky+14,W+2,sky+8,48,8,2);
  return s;}
/* ---------- drawing: a sitter's own eyes. The others across the rug; the house beyond; my knees at the bottom ---------- */
const TQFW=360,TQFH=500,TQFY=296;
const tqFP=(phi)=>{const a=2*Math.PI*phi;return [180-158*Math.sin(a),TQFY+96*Math.cos(a),.74+.52*(1+Math.cos(a))/2];};
const tqFPout=(phi)=>{const a=2*Math.PI*phi;return [180-215*Math.sin(a),TQFY-8+140*Math.cos(a),.68+.5*(1+Math.cos(a))/2];};
function tqFpArt(){const A=KH.art,OL=KH.OL,W=TQFW,H=TQFH;
  let s=A.defs()+A.defs2()+`<defs><linearGradient id="tqs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1222"/><stop offset="1" stop-color="#22325A"/></linearGradient><linearGradient id="tqf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46372A"/><stop offset="1" stop-color="#6E5640"/></linearGradient><radialGradient id="tql" cx=".5" cy="1.1" r=".9"><stop offset="0" stop-color="#FFD873" stop-opacity=".32"/><stop offset="1" stop-color="#FFD873" stop-opacity="0"/></radialGradient></defs>`;
  s+=`<rect width="${W}" height="${H}" fill="url(#tqf)"/><rect width="${W}" height="120" fill="url(#tqs)"/>`+tqStars(W,90,24,5)+A.moon(62,58)+tqFacade(W,104,76,[40,92,268,320],180,OL);
  let tl='';for(let i=-8;i<=8;i++)tl+=`M${180+i*28} 180L${180+i*110} ${H}`;for(const y of [192,210,234,264,302,350,412,490])tl+=`M0 ${y}H${W}`;s+=`<path d="${tl}" stroke="#3A2D22" stroke-width="1.3" opacity=".8"/>`;
  s+=A.lights(-4,98,W*.55,106,64,10,0)+A.lights(W*.55,106,W+4,96,56,8,2);
  s+=`<ellipse cx="180" cy="${TQFY+8}" rx="236" ry="120" fill="url(#khrug)" stroke="${OL}" stroke-width="2"/><ellipse cx="180" cy="${TQFY+8}" rx="218" ry="108" fill="none" stroke="#E2B65A" stroke-width="2.4" stroke-dasharray="3 6"/><ellipse cx="180" cy="${TQFY-14}" rx="112" ry="42" fill="#2D3E66" opacity=".5"/><ellipse cx="180" cy="${TQFY-14}" rx="122" ry="48" fill="none" stroke="#E2B65A" stroke-opacity=".6" stroke-width="1.6"/>`;
  s+=`<rect width="${W}" height="${H}" fill="url(#tql)"/>`;return s;}
// what is behind me when I turn: the courtyard's other wall with the gate, the lamp, the floor where a cap could be
function tqBkArt(){const A=KH.art,OL=KH.OL,W=TQFW,H=TQFH;
  let s=A.defs()+A.defs2()+`<defs><linearGradient id="tqs2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1222"/><stop offset="1" stop-color="#22325A"/></linearGradient><linearGradient id="tqf2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E3D2E"/><stop offset="1" stop-color="#7A6047"/></linearGradient></defs>`;
  s+=`<rect width="${W}" height="${H}" fill="url(#tqf2)"/><rect width="${W}" height="150" fill="url(#tqs2)"/>`+tqStars(W,110,20,11)+tqFacade(W,132,84,[60,300],0,OL);
  s+=`<rect x="150" y="150" width="60" height="66" rx="4" fill="#2E8B6A" stroke="${OL}" stroke-width="2"/><path d="M180 152v62" stroke="#000" stroke-opacity=".25"/>`+A.pool(180,250,90)+A.lamp(180,140);
  let tl='';for(let i=-8;i<=8;i++)tl+=`M${180+i*28} 216L${180+i*110} ${H}`;for(const y of [228,250,280,320,372,440])tl+=`M0 ${y}H${W}`;s+=`<path d="${tl}" stroke="#3A2D22" stroke-width="1.3" opacity=".8"/>`;
  return s;}
let TQ_BG='',TQ_FBG='',TQ_KBG='';
const tqBg=()=>TQ_BG||(TQ_BG=KH.bg('taqiya',TQW,TQH,tqArt())),tqFbg=()=>TQ_FBG||(TQ_FBG=KH.bg('tqfp',TQFW,TQFH,tqFpArt())),tqKbg=()=>TQ_KBG||(TQ_KBG=KH.bg('tqbk',TQFW,TQFH,tqBkArt()));
function tqPill(x,y,t,o={}){const fs=o.fs||12.5,w=o.w||KH.tw(t,fs)+(o.pad??14),h=o.h||fs+9;if(!o.free)x=Math.max(w/2+3,Math.min((o.W||TQW)-3-w/2,x));
  return `<g class="tq-pl ${o.cls||''}" transform="translate(${KH.f(x)} ${KH.f(y)})"><rect x="${KH.f(-w/2)}" y="${KH.f(-h/2)}" width="${KH.f(w)}" height="${h}" rx="${KH.f(h/2)}"/><text y="${KH.f(fs*.36)}" font-size="${fs}">${t}</text></g>`;}
const tqDust=(x,y,s=1)=>`<g class="tq-dust" opacity=".8">${[[14,4,9],[26,0,7],[36,6,5]].map(([dx,dy,r])=>`<circle cx="${KH.f(x+dx*s)}" cy="${KH.f(y+dy*s)}" r="${KH.f(r*s)}" fill="#D9C4A0"/>`).join('')}</g>`;

/* ---------- the views ---------- */
const tqAK=d=>d.gid+':'+d.rk;
// where the walker is shown now on this phone: the walker's own finger is ahead of the host; the others ease to it
function tqDisp(d,me,now){if(d.ph==='chase')return null;const k=tqAK(d);
  if(me===d.lf&&S.tqMy&&S.tqMy.k===k)return Math.max(S.tqMy.wp,d.wp);
  let I=S.tqIP;if(!I||I.k!==k){I=S.tqIP={k,from:d.wp,to:d.wp,t0:now};}if(I.to!==d.wp){I.from=tqDispOf(I,now);I.to=d.wp;I.t0=now;}return tqDispOf(I,now);}
const tqDispOf=(I,now)=>I.from+(I.to-I.from)*Math.min(1,(now-I.t0)/230);
function tqRunDisp(d,now){const ch=d.ch;if(!ch)return null;const k=tqAK(d)+'c';let I=S.tqIPc;if(!I||I.k!==k)I=S.tqIPc={k,w:[ch.w,ch.w,now],c:[ch.cc,ch.cc,now]};
  const step=(v,to)=>{if(v[1]!==to){v[0]=v[0]+(v[1]-v[0])*Math.min(1,(now-v[2])/230);v[1]=to;v[2]=now;}return v[0]+(v[1]-v[0])*Math.min(1,(now-v[2])/230);};return {w:step(I.w,ch.w),c:step(I.c,ch.cc)};}
// a look that just happened, by anyone: 👀 over that kid for a moment
const tqLooked=(d,s)=>{const r=d.lr;if(!r||r.s!==s)return false;const k=tqAK(d)+':'+r.k;if(!S.tqLrS||S.tqLrS.k!==k)S.tqLrS={k,t:performance.now()};return performance.now()-S.tqLrS.t<1800;};
function tqTop(d,me,mode){const fin=d.win!=null,ph=d.ph,isL=me===d.lf;let s='',top='',items=[];const now=Date.now();
  s+=`<ellipse class="tq-ring" cx="${TQCX}" cy="${TQCY}" rx="${TQRX+TQOUT}" ry="${KH.f(TQRY+TQOUT*TQKY)}"/>`;
  // the walker's own walked arc and footprints
  if(ph==='walk'&&isL){const wp=tqDisp(d,me,now),a=Math.max(d.w0,wp-700);let p='';for(let i=0;i<=24;i++){const [x,y]=tqXY(a+(wp-a)*i/24,TQOUT);p+=(i?'L':'M')+KH.f(x)+' '+KH.f(y);}
    s+=`<path class="tq-arc1" d="${p}"/><path class="tq-arc2" d="${p}"/>`;}
  // the cap on the ground: the walker sees where he dropped it; everyone once it is found
  const cap=d.dp&&ph!=='res'&&!fin&&(isL||ph!=='walk');if(cap){const [x,y]=tqXY(d.dp.p,24);items.push({y:y-1,s:(ph==='chase'?'':KH.cap(x,y-2,'cap',1.25))+(ph==='walk'?tqPill(x,y+16,'🧢 هنا',{fs:11,h:18,cls:'gold'}):'')});}
  const empty=ph==='chase'?d.ch.c:-1;
  d.cr.forEach((x,i)=>{if(d.out[x]==='1')return;const [px,py]=tqXY(tqSlot(d,i));
    if(x===empty){top+=`<ellipse cx="${KH.f(px)}" cy="${KH.f(py-2)}" rx="25" ry="10" class="tq-empty"/>`+tqPill(px,py+12,'المكان الفاضي',{fs:11,h:19,cls:'grn'});return;}
    let pose='sit',mood;if(ph==='chase'){pose=i%2?'sitcheer':'situp';mood='g';}
    if(ph==='res'&&d.rs){const v=d.rs.dp[x];if(v>0){pose='sitcheer';}else if(v<0)mood='sad';}
    if(fin&&(d.wins||[d.win]).includes(x))pose='sitcheer';
    let t=KH.sit({who:d.pl[x],pose,mood,x:px,y:py,s:.9})+tqPill(px,py+13,x===me?'أنا':tqNm(d,x),{fs:11.5,h:19,cls:x===me?'me':''});
    if(tqLooked(d,x))t+=tqPill(px,py-56,d.lr.hit?'🧢!':'👀',{fs:14,h:24,cls:'gold'});
    if(ph==='res'&&d.rs&&d.rs.dp[x])top+=tqPill(px,py-58,(d.rs.dp[x]>0?'+':'−')+Math.abs(d.rs.dp[x]),{fs:15,h:25,w:42,cls:'dp '+(d.rs.dp[x]>0?'up':'dn')});
    items.push({y:py,s:t});});
  // the walker, moved every tick by tqDom along the ring (behind the circle at the back, in front of it at the front)
  let wk='',wkc='';
  if(!fin&&(ph==='walk'||ph==='chase')&&d.out[d.lf]!=='1'){const held=ph==='walk'&&!(isL&&(d.dp||(S.tqMy&&S.tqMy.k===tqAK(d)&&S.tqMy.dr!=null)));
    const inner=KH.kid({who:d.pl[d.lf],pose:'walk',mood:ph==='chase'?'g':'k',s:.98})+(held&&isL?KH.cap(15,-24,'cap',.85):'')+(ph==='chase'?tqDust(0,-2):'');
    wk=`<g class="tq-w" data-k="wk"><g class="tq-wi">${inner}</g>${tqPill(0,14,isL?'أنا':tqNm(d,d.lf),{fs:11,h:18,cls:isL?'me':'lf',free:1})}</g>`;
    if(ph==='chase'){const C=d.ch.c;wkc=`<g class="tq-w tq-cz" data-k="wc"><g class="tq-wi">${KH.kid({who:d.pl[C],pose:'walk',mood:'o',s:.98})+KH.cap(15,-24,'cap',.85)+tqDust(0,-2)}</g>${tqPill(0,14,C===me?'أنا':tqNm(d,C),{fs:11,h:18,cls:C===me?'me':'tg',free:1})}</g>`;}}
  if(ph==='res'&&d.rs&&!fin){const r=d.rs,[x,y]=tqXY(r.th+75,TQOUT+8),v=r.dp[r.nl];items.push({y,s:KH.kid({who:d.pl[r.nl],pose:'stand',mood:r.nl===r.w?'k':'sad',x,y,s:.95})+KH.cap(x+15,y-24,'cap',.85)+tqPill(x,y+14,(r.nl===me?'أنا':tqNm(d,r.nl))+' · يلف',{fs:11,h:18,cls:'lf'})});
    if(v)top+=tqPill(x,y-60,(v>0?'+':'−')+Math.abs(v),{fs:15,h:25,w:42,cls:'dp '+(v>0?'up':'dn')});}
  s+=`<g class="tq-wb">${wk}${wkc}</g>`+items.sort((a,b)=>a.y-b.y).map(i=>i.s).join('')+`<g class="tq-wf"></g>`;
  s+=KH.sprite('sleepcat',TQCX,TQCY)+`<text class="tq-z" x="${TQCX+14}" y="${TQCY-14}">z</text>`+top;
  if(ph==='chase')s+=tqCheers(d);
  if(ph==='res'&&d.rs){const r=d.rs,[x,y]=r.o==='tag'?tqXY(d.ch?d.ch.w:d.wp,TQOUT):tqXY(r.th);s+=KH.burst(x,Math.max(70,y-96),r.o==='nap'?'شرب! 😵':r.o==='esc'?'قعد!':'مسكه!',{c:r.o==='nap'?'#9C7BD6':r.o==='esc'?'#EC6158':'#3FAE5C',s:.78});}
  return `<div class="tq-map ${tqBg()} ${mode||''}" data-k="map"><svg viewBox="0 0 ${TQW} ${TQH}" aria-label="حوش الحارة">${s}</svg></div>`;}
function tqCheers(d){const L=['يلااا!','اركض!','👏👏','الحقه!','قرّب!'],k=d.rk;let s='';d.cr.filter(x=>x!==d.ch.c&&d.out[x]!=='1').slice(0,3).forEach((x,j)=>{const [px,py]=tqXY(tqTh(d,x));s+=KH.say(px,py-48,L[(k+j)%L.length],{fs:11,dx:j%2?10:-10});});return s;}
// the sitter's own eyes
function tqFirst(d,me){const th=tqTh(d,me),K=KH.CAST[d.pl[me]],OL=KH.OL;let s='',items=[];
  // the walker across the circle (moved by tqDom) and his shadow when he is behind me
  s+=`<g class="tq-fw" data-k="fw" style="opacity:0"><g>${KH.kid({who:d.pl[d.lf],pose:'walk',mood:'k',s:1})}</g></g>`;
  for(const x of d.cr){if(x===me||d.out[x]==='1')continue;const phi=tqMod(tqTh(d,x)-th)/1000,[px,py,sc]=tqFP(phi);
    let t=KH.sit({who:d.pl[x],x:px,y:py,s:sc*1.05,mood:tqLooked(d,x)?'o':undefined})+tqPill(px,py+15*sc,tqNm(d,x),{fs:12,h:20,W:TQFW});
    if(tqLooked(d,x))t+=tqPill(px,py-58*sc,'👀',{fs:15,h:25,cls:'gold',W:TQFW});items.push({y:py,s:t});}
  s+=`<g class="tq-sh" data-k="sh" style="opacity:0"><g transform="skewX(-12)"><path d="M-34 0q-8-120 4-220q20-20 44 0q14 110 8 220z" fill="url(#tqsh)"/><path d="M-30 -40l-18 40M26 -40l14 40" stroke="#05080F" stroke-opacity=".45" stroke-width="16" stroke-linecap="round"/><ellipse cx="0" cy="-252" rx="30" ry="36" fill="#05080F" opacity=".45"/><path d="M-30 -270q30-34 60 0q-30 6-60 0z" fill="#05080F" opacity=".45"/><path d="M22 -150q40-30 56-60" stroke="#05080F" stroke-opacity=".4" stroke-width="18" stroke-linecap="round" fill="none"/></g></g>`;
  s+=KH.sprite('sleepcat',180,TQFY-14,{s:1.35})+items.sort((a,b)=>a.y-b.y).map(i=>i.s).join('');
  // my knees and hands
  const H=TQFH;s+=`<path d="M-30 ${H}q40-112 150-104q48 6 60 50q12-44 60-50q110-8 150 104z" fill="#2D4763" stroke="${OL}" stroke-width="2.4"/><path d="M120 ${H-56}q40 16 60 44M240 ${H-56}q-40 16-60 44" fill="none" stroke="#22374F" stroke-width="3"/>`+
    `<path d="M64 ${H}q8-64 52-80" fill="none" stroke="${K.c}" stroke-width="28" stroke-linecap="round"/><path d="M296 ${H}q-8-64-52-80" fill="none" stroke="${K.c}" stroke-width="28" stroke-linecap="round"/>`+
    `<ellipse cx="120" cy="${H-86}" rx="22" ry="17" fill="${K.skin}" stroke="${OL}" stroke-width="2.4"/><ellipse cx="240" cy="${H-86}" rx="22" ry="17" fill="${K.skin}" stroke="${OL}" stroke-width="2.4"/>`;
  s+=`<rect class="tq-hb" width="${TQFW}" height="${TQFH}" fill="url(#tqhb)" style="opacity:0"/>`;
  const ear=(x,dir)=>`<g class="tq-ear ${dir}" transform="translate(${x} ${H-128})">${[0,1,2].map(i=>`<path d="M${dir==='l'?-14-i*8:14+i*8} -11q${dir==='l'?-7:7} 11 0 22" fill="none" stroke="#FFD84D" stroke-width="3" stroke-linecap="round" class="w${i}"/>`).join('')}<text y="6" font-size="17">👂</text></g>`;
  s+=ear(52,'l')+ear(308,'r');
  const defs=`<defs><linearGradient id="tqsh" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#05080F" stop-opacity=".75"/><stop offset="1" stop-color="#05080F" stop-opacity=".25"/></linearGradient><radialGradient id="tqhb" cx=".5" cy=".55" r=".7"><stop offset=".7" stop-color="#EC6158" stop-opacity="0"/><stop offset="1" stop-color="#EC6158" stop-opacity=".5"/></radialGradient></defs>`;
  return `<div class="tq-fp ${tqFbg()}" data-k="fp"><svg viewBox="0 0 ${TQFW} ${TQFH}" aria-label="الدائرة من مكانك">${defs}${s}</svg><div class="tq-pull" data-ga="look">⌄ اسحب لتحت: ترى وراك ⌄</div></div>`;}
// what I see behind me: the floor, and whoever is there
function tqBehind(d,me,res){const th=tqTh(d,me),phi=tqW(d.wp-th)/1000;let s='';
  if(Math.abs(phi)<.18){const x=180-phi/.18*190;s+=KH.kid({who:d.pl[d.lf],pose:'walk',x,y:380,s:2.1,mood:'k'})+KH.say(x,250,'😏',{fs:18});}
  s+=res==null?'':res?KH.cap(180,420,'cap',3):tqPill(180,420,'ما فيه شي…',{fs:17,h:32,W:TQFW});
  return `<div class="tq-fp tq-bk ${tqKbg()}" data-k="bk"><svg viewBox="0 0 ${TQFW} ${TQFH}">${s}</svg></div>`;}

/* ---------- the HUD, the dock ---------- */
const tqFmt=ms=>{const t=Math.ceil(Math.max(0,ms)/1000);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const TQ_PHONE='<svg viewBox="0 0 52 52" width="40" height="40" aria-hidden="true"><rect x="17" y="8" width="18" height="34" rx="5" fill="#E7EEF6" stroke="#17233A" stroke-width="2" transform="rotate(-18 26 25)"/><path d="M8 34q-4-16 10-24M44 18q4 16-10 24" fill="none" stroke="#FFD84D" stroke-width="3" stroke-linecap="round"/><path d="M15 9l3 2-3 3M37 42l-3-2 3-3" fill="none" stroke="#FFD84D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function tqRole(d,me){if(me<0||d.out[me]==='1'||d.win!=null)return 'watch';if(d.ph==='walk')return me===d.lf?'laf':d.cr.includes(me)?'sit':'watch';if(d.ph==='chase')return me===d.lf||me===d.ch.c?'run':'watch';return 'watch';}
function tqHud(d,me,role){let h='';if(d.end>0&&d.win==null){const l=d.end-Date.now();h+=`<span class="tq-c tq-clk ${l<30000?'low':''}" dir="ltr">⏱ <b>${tqFmt(l)}</b></span>`;}
  if(me>=0)h+=`<span class="tq-c">نقاطك <b>${d.pd[me]}</b></span>`;
  if(role==='sit'){const left=TQ.LOOKS-d.lk[me];h+=`<span class="tq-c tq-looks">نظرات ${[0,1,2].map(i=>`<u class="${i<left?'on':''}"></u>`).join('')}</span>`;}
  if(d.ph==='walk'&&role!=='laf')h+=`<span class="tq-c tq-who">🧢 ${tqNm(d,d.lf)} يلف</span>`;
  if(d.ph==='chase')h+=`<span class="tq-c tq-run">🏃 مطاردة!</span>`;
  return `<div class="tq-hud">${h}</div>`;}
const tqChant=d=>`<div class="tq-chant" data-k="chant"><em>🎵</em>${TQ_CHANT.slice(0,6).map((w,i)=>`<span data-i="${i}">${w}</span>`).join(' ')}</div>`;
function tqMotBtn(){if(S.tqMot!=='need')return '';return `<button class="sm tq-mot" data-ga="mot">📱 فعّل الحركة: تلتفت بلفّة الجوال</button>`;}
function tqDock(d,me,role){const N=s=>tqNm(d,s);
  if(d.ph==='walk'&&role==='sit'){const left=TQ.LOOKS-d.lk[me];
    return tqMotBtn()+`<div class="tq-two"><div class="tq-hint"><i>${TQ_PHONE}</i><span><b>${left?'لفّ جوالك بسرعة عشان تلتفت':'خلصت نظراتك هالجولة'}</b><small>${left?`أو اسحب الشاشة لتحت · باقي ${left} من ${TQ.LOOKS}`:'اسمع الخطوات… وانتظر'}</small></span></div><button class="big tq-look" data-ga="look" ${left?'':'disabled'}><i>👀</i><small>التفت</small></button></div>`;}
  if(d.ph==='walk'&&role==='laf'){const dropped=d.dp||(S.tqMy&&S.tqMy.k===tqAK(d)&&S.tqMy.dr!=null);
    if(!dropped)return `<div class="tq-two"><div class="tq-hint"><i>👆</i><span><b>مرّر إصبعك على الدائرة تمشي</b><small>واسحب لتحت بسرعة: ترمي الطاقية ورا اللي تمرّ وراه</small></span></div><button class="big tq-drop" data-ga="drop"><i>🧢</i><small>ارمها</small></button></div>`;
    return `<div class="tq-prog"><b>كمّل لين ترجع لها… قبل لا يلتفت ${d.dp?N(d.dp.s):''}!</b><div class="tq-bar"><i></i></div><small>كمّل المشي بإصبعك · تقدر تبطّئ ورا غيره تخدعهم</small></div>`;}
  if(d.ph==='chase'&&role==='run'){const W=me===d.lf;
    return `<div class="tq-runw"><div class="tq-pad" data-k="pad"><svg viewBox="-100 -100 200 200" aria-label="دوّر إصبعك"><circle r="94" class="tq-pr"/><circle r="58" class="tq-pi"/><path class="tq-ptr" d="M74 0"/><circle class="tq-pf" r="13" cx="74" cy="0"/><text y="0" class="tq-pt">⟲</text><text y="26" class="tq-ps">دوّر إصبعك!</text></svg></div>`+
      `<div class="tq-side"><b>${W?'اركض للمكان الفاضي!':`المسه قبل لا يقعد!`}</b><span class="tq-spd">سرعتك <em>0٪</em></span><span class="tq-gap"></span><small>كل ما دوّرت أسرع ركضت أسرع (فيه حد أعلى للكل)</small></div></div>`;}
  if(d.ph==='chase')return `<button class="big tq-cheer" data-ga="cheer">👏 شجّع</button>`;
  if(d.ph==='res'&&d.rs){const r=d.rs;return `<p class="tq-wait">${r.o==='nap'?`😵 ${N(r.t)} شرب! ما انتبه للطاقية`:r.o==='esc'?`🏃 ${N(r.w)} قعد مكان ${N(r.t)}`:`✋ ${N(r.t)} مسك ${N(r.w)}!`} · الجولة الجاية…</p>`;}
  return '';}
function tqSum(d){const al=d.pl.map((_,s)=>s).sort((a,b)=>d.pd[b]-d.pd[a]);
  return `<div class="tq-rows">${al.map(s=>`<div class="tq-row ${(d.wins||[d.win]).includes(s)?'won':''}" style="--c:${col(d,s)}">${KH.face({who:d.pl[s],ring:1,size:30})}<span><b>${tqNm(d,s)}</b></span><i>${d.pd[s]}</i></div>`).join('')}</div>`;}
// a game action from a gesture (a twist, a swipe): the same road as a tap on a button
function tqAct(a,i){const G=GAMES.taqiya;if(typeof netDown==='function'&&netDown())return;if(S.mode==='online'&&!amHost())netClick(G,a,i);else G.click(a,i,S.st.d,S.mode==='online'?mkCtx(S.st.d,S.priv):mkCtx());}

GAMES.taqiya={name:'طاق طاق طاقية',cat:'party',lbc:'#8E2F3A',minP:3,teams:'none',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1D2C4A"/><rect y="62" width="100" height="38" fill="#594634"/><path d="M0 62h100" stroke="#8E6B48" stroke-width="3"/><circle cx="82" cy="16" r="9" fill="#FFF1C1"/><circle cx="16" cy="12" r="1.3" fill="#fff"/><circle cx="44" cy="8" r="1.1" fill="#fff"/><path d="M-2 24Q50 50 102 22" fill="none" stroke="#0A101C" stroke-width="1.4"/><circle cx="14" cy="32" r="3" fill="#FFD873"/><circle cx="32" cy="38" r="3" fill="#EC6158"/><circle cx="50" cy="40" r="3" fill="#7FD3FF"/><circle cx="68" cy="38" r="3" fill="#7BEA9C"/><circle cx="86" cy="32" r="3" fill="#FFB37A"/>`+
    `<path d="M10 100q8-30 30-28t26 28z" fill="#05080F" opacity=".35"/><ellipse cx="50" cy="88" rx="46" ry="11" fill="#7E2A33" stroke="#17233A" stroke-width="2"/>`+
    `<path d="M22 100V84c0-6 5-10 10-10s10 4 10 10v16z" fill="#4AB1E8" stroke="#17233A" stroke-width="2"/><circle cx="32" cy="64" r="10" fill="#E0A577" stroke="#17233A" stroke-width="2"/><path d="M22 64a10 10 0 0 1 20 0q-5-3-10-3t-10 3z" fill="#3A2A22"/><ellipse cx="29" cy="65" rx="1.8" ry="2.2" fill="#17233A"/><ellipse cx="35" cy="65" rx="1.8" ry="2.2" fill="#17233A"/><ellipse cx="32" cy="70" rx="1.8" ry="2" fill="#17233A"/>`+
    `<path d="M60 100l4-22c1-6 6-9 11-8s9 5 8 11l-4 19z" fill="#EC6158" stroke="#17233A" stroke-width="2"/><circle cx="74" cy="56" r="11" fill="#F2C29B" stroke="#17233A" stroke-width="2"/><path d="M62.5 54a11.5 11.5 0 0 1 23 0z" fill="#EC6158" stroke="#17233A" stroke-width="2"/><circle cx="70" cy="58" r="1.6" fill="#17233A"/><circle cx="78" cy="58" r="1.6" fill="#17233A"/><path d="M70 62q4 3 8 0" fill="none" stroke="#17233A" stroke-width="1.8" stroke-linecap="round"/>`+
    `<path d="M48 82a8 7 0 0 1 16 0q-8 3-16 0z" fill="#FAFBFD" stroke="#17233A" stroke-width="1.8"/><path d="M50 79q6 2 12 0" fill="none" stroke="#B9C6D6" stroke-width="1.3" stroke-dasharray="1.6 1.6"/><path d="M56 72v-6M50 74l-3-4M62 74l3-4" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  init:n=>({ph:'walk',lf:0,cr:[],pd:Array(n).fill(0),rk:0,rn:0,wp:0,w0:0,t0:0,ht:0,mv:0,dp:null,lk:Array(n).fill(0),lr:null,ch:null,rs:null,dl:0,end:0,why:''}),
  // the first walker is the round's starter; the others sit round the rug in seat order after them
  start(d){const n=d.pl.length,L=(d.st||0)%n,cr=[];for(let k=1;k<n;k++)cr.push((L+k)%n);const now=Date.now();return tqRound({...d,cr,end:now+TQ.GAME},L,tqMod(tqSlot({cr},0)-Math.round(500/(n-1))),now);},
  // where the cap lies is the walker's until it is found or the lap comes round
  mask(d,seat){if(d.win!=null||d.ph!=='walk'||seat===d.lf)return d;return d.dp?{...d,dp:null}:d;},
  privInit:d=>({k:d.rk}),
  privStale:(d,p)=>p.k!==d.rk,
  privShow:(d,seat,role,p,own)=>own||(d&&d.win!=null)?p:{gid:p.gid},
  privOk:(d,r,o,p)=>{const s=d.pl.indexOf(r);if(s<0||!p||typeof p!=='object')return false;if(p.k!==d.rk)return true;
    const int=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
    if(p.wp!=null&&!(s===d.lf&&int(p.wp,0,1e7)))return false;
    if(p.dr!=null&&!(s===d.lf&&p.dr&&typeof p.dr==='object'&&int(p.dr.s,0,d.pl.length-1)))return false;
    if(p.rn!=null&&!(int(p.rn,0,1e6)&&(s===d.lf||(d.ch&&s===d.ch.c))))return false;
    return true;},
  net:{local:['drop','cheer','mot'],host:['look'],ui:[]},
  viewer:()=>null,
  points:d=>d.pl.map((_,s)=>(s===d.lf&&d.win==null?'🧢 ':'')+d.pd[s]),
  winText:d=>{const w=d.wins||[d.win];return `${w.map(s=>nm(d,s)).join(' و')} ${w.length>1?'فازوا':'فاز'}! 🧢`;},
  winExtra:d=>`${d.why?d.why+' • ':''}`+d.pl.map((_,s)=>`${nm(d,s)} ${d.pd[s]}`).join('، '),
  status(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1;d=this.mask(d,me);const role=tqRole(d,me),N=s=>tqNm(d,s);let i='🧢',t='',x='';
    if(d.win!=null){i='🏆';t='خلصت اللعبة';x=d.why||'';}
    else if(d.ph==='walk'){if(role==='laf'){i='🚶';t='أنت اللفّاف!';x=d.dp?`نزّلتها ورا ${N(d.dp.s)}: كمّل اللفّة وارجع لها`:'امشِ حول الدائرة وارمِ الطاقية ورا أحد';}
      else if(role==='sit'){i='👂';t='اسمع الخطوات وراك…';x='لا يشربك! لو الطاقية وراك التفت والحقه';}else{t=`${N(d.lf)} يلف بالطاقية`;x='طاق طاق طاقية…';}}
    else if(d.ph==='chase'){i='🏃';t=`${N(d.ch.c)} لقاها! يلحق ${N(d.lf)}`;x=role==='run'?'دوّر إصبعك بسرعة!':'مين بيوصل أول؟';}
    else if(d.ph==='res'&&d.rs){const r=d.rs;i=r.o==='nap'?'😵':r.o==='esc'?'🏃':'✋';t=r.o==='nap'?`${N(r.t)} شرب!`:r.o==='esc'?`${N(r.w)} قعد مكان ${N(r.t)}`:`${N(r.t)} مسك ${N(r.w)}!`;x=r.o==='nap'?`${N(r.t)} −1 · ${N(r.w)} +1`:r.o==='esc'?`${N(r.w)} +1`:`${N(r.t)} +1`;}
    return `<div class="tq-st"><i>${i}</i><span><b>${t}</b>${x?`<small>${x}</small>`:''}</span></div>`;},
  render(d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1;d=this.mask(d,me);const fin=d.win!=null,role=tqRole(d,me),now=Date.now(),k=tqAK(d);
    if(role==='laf'&&(!S.tqMy||S.tqMy.k!==k))S.tqMy={k,wp:d.wp,dr:null,ts:0,sent:d.wp};
    if(role==='run'&&(!S.tqRn||S.tqRn.k!==k))S.tqRn={k,rn:0,ts:0,sent:0,sp:0};
    // my own look: the camera swings round for a moment, then the host's answer
    let lk=S.tqLk&&S.tqLk.k===k&&role==='sit'?S.tqLk:null,res=null;
    if(lk&&d.lr&&d.lr.s===me&&d.lr.k>lk.k0){res=d.lr.hit;if(!lk.got){lk.got=performance.now();lk.until=lk.got+1300;}}
    let view;
    if(fin||d.ph==='res')view=tqTop(d,me,'');
    else if(role==='sit')view=lk?tqBehind(d,me,res):tqFirst(d,me);
    else if(role==='laf')view=tqTop(d,me,'drag');
    else if(role==='run')view=tqTop(d,me,'short');
    else view=tqTop(d,me,d.ph==='chase'?'short':'');
    let h=`<div class="tq kh ph-${d.ph} r-${role}">`+tqHud(d,me,role)+`<div class="tq-stage ${lk?'turn':''}">${view}${d.ph==='walk'&&!fin?tqChant(d):''}</div>`;
    if(fin)return h+tqSum(d)+'</div>';
    return h+`<div class="tq-dock">${tqDock(d,me,role)}</div></div>`;},
  click(a,i,d,ctx){const v=ctx.v,me=v!=null&&v>=0&&v<d.pl.length?v:-1;if(d.win!=null)return;const mine=!S.inIntent;
    if(a==='look'){if(d.ph!=='walk'||me<0||me===d.lf||!d.cr.includes(me)||d.lk[me]>=TQ.LOOKS)return;
      if(mine){S.tqLk={k:tqAK(d),t:performance.now(),k0:d.lr?d.lr.k:0,until:performance.now()+2500};TQS.whoosh();try{navigator.vibrate&&navigator.vibrate(25);}catch(e){}}
      act(tqLook(d,me,Date.now()));return;}
    if(a==='drop'){if(d.ph!=='walk'||me!==d.lf||d.dp)return;const My=S.tqMy;if(!My||My.k!==tqAK(d)||My.dr!=null)return;const wp=Math.max(My.wp,d.wp);if(wp-d.w0<60){toast('امشِ شوي أول');return;}
      My.dr=d.cr[tqNearest(d,wp)];My.ts=0;TQS.thud();try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}tqStream(d,me,Date.now(),true);render();return;}
    if(a==='cheer'){TQS.cheer();return;}
    if(a==='mot'){tqAskMotion();}},
  onSkip(nd,d){let x={...nd,win:null,turn:d.lf};delete x.wins;const al=aliveSeats(x),now=Date.now();if(al.length<3)return tqEnd(x,'ما بقى لاعبين كفاية');
    x.cr=x.cr.filter(s=>x.out[s]!=='1');if(x.out[d.lf]==='1'){const L=x.cr[0];x.cr=x.cr.slice(1);return tqRound(x,L,tqMod(d.wp),now);}
    if((d.ph==='walk'&&d.dp&&x.out[d.dp.s]==='1')||(d.ph==='chase'&&x.out[d.ch.c]==='1'))return tqRound(x,d.lf,tqMod(d.wp),now);
    return x;},
  // the host moves the bots (and the absent players) itself, in tqHost
  bot:d=>d};

/* ---------- this phone: the walker on the ring, the shadow, the steps and the chant, gestures, sending my moves ---------- */
function tqStream(d,me,now,force){const r=d.pl[me],k=tqAK(d),base=S.priv[r]&&S.priv[r].k===d.rk?S.priv[r]:{};
  const My=S.tqMy,Rn=S.tqRn;
  if(me===d.lf&&d.ph==='walk'&&My&&My.k===k&&(force||now-My.ts>=150)&&(Math.round(My.wp)>My.sent+1||(My.dr!=null&&!My.drs))){My.ts=now;My.sent=Math.round(My.wp);const p={...base,gid:d.gid,k:d.rk,wp:My.sent};if(My.dr!=null){p.dr={s:My.dr};My.drs=1;}setPriv(r,p);}
  if(d.ph==='chase'&&(me===d.lf||me===d.ch.c)&&Rn&&Rn.k===k&&now-Rn.ts>=140&&Math.round(Rn.rn)>Rn.sent){Rn.ts=now;Rn.sent=Math.round(Rn.rn);setPriv(r,{...base,gid:d.gid,k:d.rk,rn:Rn.sent});}}
function tqDom(d,now){const ctx=mkCtx(),me=ctx.v!=null&&ctx.v>=0&&ctx.v<d.pl.length?ctx.v:-1,v=GAMES.taqiya.mask(d,me),role=tqRole(v,me),pn=performance.now(),q=s=>document.querySelector(s);
  const ck=q('.tq-clk b');if(ck&&v.end>0){const x=tqFmt(v.end-now);if(ck.textContent!==x)ck.textContent=x;}
  if(S.tqLk&&S.tqLk.k===tqAK(v)&&pn>S.tqLk.until){S.tqLk=null;render();return;}
  if(v.ph==='walk'){const wp=tqDisp(v,me,now),a=2*Math.PI*wp/1000,w=q('.tq-map .tq-w');
    if(w){const [x,y]=tqXY(wp,TQOUT);w.style.transform=`translate(${KH.f(x)}px,${KH.f(y)}px)`;w.classList.toggle('fl',Math.cos(a)>0);const L=q(Math.cos(a)<0?'.tq-wb':'.tq-wf');if(L&&w.parentNode!==L)L.appendChild(w);}
    let pan=0,vol=role==='laf'?.42:.28;
    if(role==='sit'){const th=tqTh(v,me),phi=tqW(wp-th)/1000,c=(1+Math.cos(2*Math.PI*phi))/2;pan=-Math.sin(2*Math.PI*phi)*.9;vol=.05+.75*c*c*c;
      const fw=q('.tq-fw');if(fw){if(Math.abs(phi)>.12){const [x,y,sc]=tqFPout(tqMod(wp-th)/1000);fw.style.opacity=1;fw.style.transform=`translate(${KH.f(x)}px,${KH.f(y)}px) scale(${KH.f(sc*(Math.cos(2*Math.PI*phi)>0?-1:1))},${KH.f(sc)})`;}else fw.style.opacity=0;}
      const sh=q('.tq-sh');if(sh){const o=Math.abs(phi)<.16?(1-Math.abs(phi)/.16)*.9:0;sh.style.opacity=KH.f(o);if(o>0)sh.style.transform=`translate(${KH.f(180-phi/.16*190)}px,${TQFH}px)`;}
      const hb=q('.tq-hb');const near=Math.abs(phi)<.07;if(hb)hb.style.opacity=near?.95:Math.abs(phi)<.13?.4:0;
      if(near&&pn-(S.tqHb||0)>680){S.tqHb=pn;TQS.heart(.55);try{navigator.vibrate&&navigator.vibrate(18);}catch(e){}}
      const L=q('.tq-ear.l'),R=q('.tq-ear.r');if(L&&R){const lv=c*(1+pan)/2,rv=c*(1-pan)/2;[[L,rv],[R,lv]].forEach(([el,x])=>{el.style.opacity=KH.f(.25+.75*Math.min(1,x*1.6));});}}
    // a step: footsteps, and the chant a word every second step, on every phone
    const st=Math.floor((wp-v.w0)/TQ_STEP),K=tqAK(v);if(!S.tqStp||S.tqStp.k!==K)S.tqStp={k:K,i:st};
    if(st>S.tqStp.i){S.tqStp.i=st;TQS.step(vol,pan);if(st%2===0){const wi=(st/2)%TQ_CHANT.length;TQS.word(wi);const ch=q('.tq-chant');if(ch){const sp=ch.querySelectorAll('span'),six=wi%6,base=wi-six;sp.forEach((e,j)=>{e.textContent=TQ_CHANT[base+j];e.className=j<six?'done':j===six?'on':'';});}}}
    tqRec(true,Math.max(.7,Math.min(1.4,(wp-(S.tqRw||wp))*12/TQ.VW+.8)));S.tqRw=wp;
    const bar=q('.tq-bar i');if(bar&&v.dp)bar.style.transform=`scaleX(${Math.max(0,Math.min(1,(wp-v.dp.p)/1000)).toFixed(3)})`;}
  else tqRec(false);
  if(v.ph==='chase'&&v.ch){const r=tqRunDisp(v,now);for(const [sel,pos] of [['.tq-map .tq-w:not(.tq-cz)',r.w],['.tq-map .tq-cz',r.c]]){const e=q(sel);if(!e)continue;const [x,y]=tqXY(pos,TQOUT),a=2*Math.PI*pos/1000;e.style.transform=`translate(${KH.f(x)}px,${KH.f(y)}px)`;e.classList.toggle('fl',Math.cos(a)>0);const L=q(Math.cos(a)<0?'.tq-wb':'.tq-wf');if(L&&e.parentNode!==L)L.appendChild(e);}
    const K=tqAK(v)+'r',sw=Math.floor(r.w/70)+Math.floor(r.c/70);if(!S.tqRs||S.tqRs.k!==K)S.tqRs={k:K,i:sw};if(sw>S.tqRs.i){S.tqRs.i=sw;TQS.step(.4,0,1);}
    const gp=q('.tq-gap');if(gp){const gap=Math.max(0,(r.w-r.c)/1000),left=Math.max(0,(v.ch.goal-r.w)/1000);const x=me===v.lf?`باقي لك ${Math.round(left*100)}٪ من اللفّة`:`بينك وبينه ${Math.round(gap*100)}٪`;if(gp.textContent!==x)gp.textContent=x;}
    const Rn=S.tqRn;if(Rn&&Rn.k===tqAK(v)){Rn.sp*=.86;const e=q('.tq-spd em');if(e)e.textContent=Math.round(Math.min(1,Rn.sp)*100)+'٪';}}
  if(me>=0)tqStream(v,me,now);}
// the walker's finger on the ring, the runners' circles on the pad, a swipe down to look back
const tqAngOf=(x,y)=>{const a=Math.atan2(-(x-TQCX)/(TQRX+TQOUT),(y-TQCY)/(TQRY+TQOUT*TQKY));return tqMod(a/(2*Math.PI)*1000);};
function tqPt(el,e,W,H){const r=el.getBoundingClientRect();return [(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H];}
function tqDown(e){if(S.st.g!=='taqiya'||!S.st.d||S.st.d.win!=null)return;const t=e.target;if(!t||!t.closest)return;const pn=performance.now();
  const map=t.closest('.tq-map.drag');if(map&&S.tqMy){const [x,y]=tqPt(map,e,TQW,TQH);S.tqDr={id:e.pointerId,m:tqAngOf(x,y),t:pn,t0:pn,x0:e.clientX,y0:e.clientY,el:map,mv:0};try{map.setPointerCapture(e.pointerId);}catch(x){}e.preventDefault();return;}
  const pad=t.closest('.tq-pad');if(pad&&S.tqRn){const r=pad.getBoundingClientRect();S.tqPd={id:e.pointerId,a:Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2),t:pn,el:pad};try{pad.setPointerCapture(e.pointerId);}catch(x){}e.preventDefault();return;}
  if(t.closest('.tq-fp:not(.tq-bk)'))S.tqSw={id:e.pointerId,y0:e.clientY,x0:e.clientX,t0:pn};}
function tqMove(e){const pn=performance.now(),d=S.st.d;if(!d||S.st.g!=='taqiya')return;
  const D=S.tqDr;if(D&&D.id===e.pointerId&&S.tqMy){const [x,y]=tqPt(D.el,e,TQW,TQH),m=tqAngOf(x,y),dm=tqW(m-D.m),dt=Math.max(1,pn-D.t);D.m=m;D.t=pn;
    if(dm>0&&dm<250){const My=S.tqMy,step=Math.min(dm,TQ.VW*dt/1000*1.15+3);My.wp=Math.max(My.wp,d.wp)+step;D.mv+=step;}e.preventDefault();return;}
  const P=S.tqPd;if(P&&P.id===e.pointerId&&S.tqRn){const r=P.el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,a=Math.atan2(e.clientY-cy,e.clientX-cx),dt=Math.max(1,pn-P.t);let da=a-P.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;P.a=a;P.t=pn;
    // 2.6 finger turns a second is the top speed; faster counts the same
    const add=Math.min(Math.abs(da)/(2*Math.PI)*TQ.VR/2.6,TQ.VR*dt/1000*1.02);S.tqRn.rn+=add;S.tqRn.sp=S.tqRn.sp*.7+.3*Math.min(1,add/(TQ.VR*dt/1000));
    const f=P.el.querySelector('.tq-pf');if(f){f.setAttribute('cx',KH.f(74*Math.cos(a)));f.setAttribute('cy',KH.f(74*Math.sin(a)));}
    const tr=P.el.querySelector('.tq-ptr');if(tr){const a0=a-Math.sign(da||1)*Math.min(2.6,.6+S.tqRn.sp*2.2);tr.setAttribute('d',`M${KH.f(74*Math.cos(a0))} ${KH.f(74*Math.sin(a0))}A74 74 0 0 ${da>=0?1:0} ${KH.f(74*Math.cos(a))} ${KH.f(74*Math.sin(a))}`);}
    e.preventDefault();}}
function tqUp(e){const pn=performance.now(),D=S.tqDr;
  // a quick flick down while walking drops the cap
  if(D&&D.id===e.pointerId){S.tqDr=null;const dy=e.clientY-D.y0,dx=e.clientX-D.x0,dt=pn-D.t0;if(dy>45&&dy>Math.abs(dx)*1.2&&dt<380&&D.mv<45)tqAct('drop');return;}
  if(S.tqPd&&S.tqPd.id===e.pointerId){S.tqPd=null;return;}
  const W=S.tqSw;if(W&&W.id===e.pointerId){S.tqSw=null;const dy=e.clientY-W.y0;if(dy>70&&Math.abs(e.clientX-W.x0)<dy&&pn-W.t0<700)tqAct('look');}}
// turning round with the phone: a quick twist; iPhones ask once («فعّل الحركة»)
function tqMotion(e){const r=e&&e.rotationRate;if(!r||S.st.g!=='taqiya')return;const x=Math.abs(r.alpha||0)+Math.abs(r.beta||0)+Math.abs(r.gamma||0);if(x>0)S.tqMotSeen=1;
  const pn=performance.now();if(x<420||pn-(S.tqMotT||0)<1600)return;S.tqMotT=pn;const d=S.st.d;if(!d||d.win!=null||d.ph!=='walk')return;const ctx=mkCtx();if(tqRole(d,ctx.v)!=='sit')return;tqAct('look');}
function tqAskMotion(){try{DeviceMotionEvent.requestPermission().then(r=>{S.tqMot=r==='granted'?'on':'no';try{lsSet('tq.mot',S.tqMot);}catch(e){}render();}).catch(()=>{S.tqMot='no';render();});}catch(e){S.tqMot='no';render();}}
(()=>{try{let saved=null;try{saved=lsGet('tq.mot');}catch(e){}S.tqMot=typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'?(saved==='on'?'on':saved==='no'?'no':'need'):'on';}catch(e){S.tqMot='no';}
  document.addEventListener('pointerdown',tqDown,{passive:false});document.addEventListener('pointermove',tqMove,{passive:false});document.addEventListener('pointerup',tqUp);document.addEventListener('pointercancel',tqUp);
  window.addEventListener('devicemotion',tqMotion);})();
// on one phone, the clocks wait while the menu is open
function tqPause(d,ms){const sh=x=>x>0?x+ms:x;return {...d,end:sh(d.end),t0:sh(d.t0),ht:sh(d.ht),mv:sh(d.mv),dl:sh(d.dl),ch:d.ch?{...d.ch,t0:sh(d.ch.t0)}:null};}
setInterval(()=>{if(S.st.g!=='taqiya'||!GAMES.taqiya)return;const d=S.st.d;if(!d||d.win!=null)return;const now=Date.now();
  if(S.mode==='local'&&S.browse){if(!S.tqPz)S.tqPz=now;return;}
  if(S.tqPz){const ms=now-S.tqPz;S.tqPz=0;if(S.mode==='local'&&ms>500){S.st={...S.st,d:tqPause(d,ms)};save();return;}}
  try{tqDom(d,now);}catch(e){console.error('taqiya dom',e);}
  if(!isEnforcer()||S.holdRender||(S.mode!=='local'&&S.mode!=='online'))return;
  if(now-(S.tqTk||0)<TQ.TICK)return;S.tqTk=now;
  try{tqHostTick(now);}catch(e){console.error('taqiya tick',e);}},90);

HELP.taqiya='طاق طاق طاقية بالليل في الحوش. الهدف واحد: لا تنغفل! لو صارت الطاقية وراك، الحق اللي حطها. واحد «اللفّاف» يمشي حول الدائرة: يمرّر إصبعه على الدائرة ويمشي خطوة خطوة، والكل يغنّي «طاق طاق طاقية… شبّاك ورا شبّاك». يرمي الطاقية ورا أي واحد يمرّ وراه (يسحب لتحت بسرعة، أو زر «ارمها»)، ويكمل يمشي عشان يخدعهم. الجالسين يشوفون الدائرة من مكانهم بس، وما يشوفون ورا ظهورهم: يسمعون الخطوات وراهم (يمين ويسار، تقرب وتبعد)، ويشوفون ظله يمر على الأرض قدامهم، والقلب يدق لو صار وراهم تمامًا. تلتفت بلفّة سريعة للجوال (أو اسحب الشاشة لتحت، أو زر «التفت»)، وعندك 3 نظرات بالجولة بس. لو الطاقية وراك: تاخذها وتبدأ المطاردة! وكل واحد يركض بإنه يدوّر إصبعه دوائر على الشاشة: كل ما دوّر أسرع ركض أسرع (فيه حد أعلى للكل). اللفّاف يركض لمكانك الفاضي، وأنت تحاول تلمسه قبل لا يقعد. لو اللفّاف كمّل لفّة كاملة ورجع لمكان الطاقية وأنت ما انتبهت: «شربت»، وتصير أنت اللفّاف. النقاط: اللفّاف اللي يقعد بالمكان +1، اللي يلمس اللفّاف +1، اللي يشرب −1 (ما تنزل تحت الصفر). اللعب 5 دقايق، والأكثر نقاط يفوز. تلعب أونلاين أو ضد البوت، كل واحد بجواله.';

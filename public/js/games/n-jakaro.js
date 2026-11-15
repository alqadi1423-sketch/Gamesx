'use strict';
/* «جكارو» (id jakaro): the Saudi wooden board, cards move glass marbles, partners sit opposite.
   One family of boards: 4 sides (76 holes), 6 sides (114), 8 sides (152); every corner is the same: the ✹ base, a 2×2 pen,
   the safe lane of 4. Three rule levels (JK_RULES): «كلاسيكي», «مخمخة», «الحريف». Replaces the old jakaro of race.js. */
(()=>{
/* =================================================================================================================
   rules: one flags object per level, read by the engine and the bots
   ================================================================================================================= */
const JK_RULES={
  c:{name:'كلاسيكي',ic:'🪵',fiveAny:true,tenBurn:true,jSwapPartner:true,noJumpOwn:true,twoBlock:true,entryKills:true,
     kTramples:false,redQueenBurn:false,redJack11:false,partnerPass:false,jokers:0,events:false,powerCard:false,luckCard:false,killBonus:false},
  m:{name:'مخمخة',ic:'🧠',fiveAny:true,tenBurn:true,jSwapPartner:true,noJumpOwn:true,twoBlock:true,entryKills:true,
     kTramples:true,redQueenBurn:true,redJack11:true,partnerPass:true,jokers:2,events:false,powerCard:false,luckCard:false,killBonus:false},
  h:{name:'الحريف',ic:'🔥',fiveAny:true,tenBurn:true,jSwapPartner:true,noJumpOwn:true,twoBlock:true,entryKills:true,
     kTramples:true,redQueenBurn:true,redJack11:true,partnerPass:true,jokers:2,events:true,powerCard:true,luckCard:true,killBonus:true}};
window.JK_RULES=JK_RULES;
const LVS=['c','m','h'];
const EVK=[[6,'boost'],[10,'shield'],[14,'trap']];// event holes on every side (الحريف): +3, a shield, back 4
const POWERS={push2:'دفعة +٢',guard:'ترس',reverse:'عكس'};
const LUCK={sevenTramples:'السبعة تدعس اللي في طريقها',fourIsEight:'الأربعة ترجع ٨',freeEntry:'كل واحد يطلّع حبة ببلاش',longQueen:'البنت تمشي ١٥'};
const RANKS='A23456789TJQK';
const SU={s:'♠',h:'♥',d:'♦',c:'♣'};
const isRed=c=>c[1]==='h'||c[1]==='d'||c==='Xr';

/* =================================================================================================================
   geometry (board units; the 4-player board spans about -450..450)
   ================================================================================================================= */
const SP=35,HR=11.5,MR=13.5,D2R=Math.PI/180;
const rot=(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return {x:p.x*c-p.y*s,y:p.x*s+p.y*c};};
const add=(a,b,k=1)=>({x:a.x+b.x*k,y:a.y+b.y*k});
const unit=v=>{const l=Math.hypot(v.x,v.y)||1;return {x:v.x/l,y:v.y/l};};
const lft=d=>({x:d.y,y:-d.x}),rgt=d=>({x:-d.y,y:d.x});
const r1=v=>Math.round(v*10)/10;
const GEO={};
function geo(B){if(GEO[B])return GEO[B];const th=2*Math.PI/B;let A;
  if(B===4)A={x:202,y:350};else{const a=(105-th/D2R/2)*D2R,R=571.5/(2*Math.sin(th/2));A={x:R*Math.cos(a),y:R*Math.sin(a)};}
  const track=[],lanes=[],pens=[];
  const side=(A0,B0,e,n)=>{const h=[{...A0,no:0}],d1=unit(add(e,n)),d3=unit(add(e,n,-1));
    for(let i=1;i<=5;i++)h.push({...add(A0,d1,SP*i),no:i});for(let i=6;i<=10;i++)h.push({...add(h[5],e,SP*(i-5)),no:i});
    for(let i=11;i<=15;i++)h.push({...add(h[10],d3,SP*(i-10)),no:i});for(let i=16;i<=18;i++){const t=(i-15)/4;h.push({x:h[15].x+(B0.x-h[15].x)*t,y:h[15].y+(B0.y-h[15].y)*t,no:i});}return h;};
  for(let k=0;k<B;k++){const a=k*th,Ak=rot(A,a),Bk=rot(A,a+th),e=rot({x:-1,y:0},a),n=rot({x:0,y:-1},a);
    side(Ak,Bk,e,n).forEach(p=>track.push({...p,k}));
    const pc=add(add(Ak,e,108),n,-30);pens.push({c:pc,a:Math.atan2(e.y,e.x)/D2R,holes:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([u,v])=>add(add(pc,e,15*u),n,15*v))});}
  const L=19*B;for(let k=0;k<B;k++){const t18=track[(k*19-1+L)%L],t17=track[(k*19-2+L)%L],d=rgt(unit({x:t18.x-t17.x,y:t18.y-t17.y}));lanes.push([0,1,2,3].map(j=>add(t18,d,SP*(.85+j))));}
  let ap=0,dc=0;if(B===4){ap=440;dc=463.2;}else for(let k=0;k<B;k++){const su=rot({x:0,y:1},k*th),cu=rot({x:0,y:1},k*th+th/2),pr=(p,u)=>p.x*u.x+p.y*u.y;
    for(const p of track.concat(...lanes)){ap=Math.max(ap,pr(p,su)+45);dc=Math.max(dc,pr(p,cu)+60);}for(const pn of pens){ap=Math.max(ap,pr(pn.c,su)+60);dc=Math.max(dc,pr(pn.c,cu)+74);}}
  const poly=chamfer(B,th,ap,dc);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of poly){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return GEO[B]={B,th,A,L,track,lanes,pens,ap,dc,poly,vb:[x0-14,y0-10,x1-x0+28,y1-y0+34]};}
function chamfer(B,th,a,dc){const ls=[];for(let k=0;k<B;k++){const s=90*D2R+k*th;ls.push([Math.cos(s),Math.sin(s),a]);const c=s+th/2;ls.push([Math.cos(c),Math.sin(c),dc]);}
  const pts=[];for(let i=0;i<ls.length;i++){const [ux,uy,d1]=ls[i],[vx,vy,d2]=ls[(i+1)%ls.length],det=ux*vy-uy*vx;pts.push([(d1*vy-d2*uy)/det,(ux*d2-vx*d1)/det]);}return pts;}
// seats on board sides: 2 players face each other, odd counts leave sides empty, 4/6/8 fill the board
const sidesOf=n=>n<=4?4:n<=6?6:8;
function armOf(n,s){const B=sidesOf(n);if(n===2)return s*2;if(n===3)return [0,1,2][s];return s;}
const partner=(d,s)=>d.team?(s+d.pl.length/2)%d.pl.length:-1;
const teamOf=(d,s)=>d.team?[s%(d.pl.length/2),s%(d.pl.length/2)+d.pl.length/2]:[s];
const Lg=d=>19*sidesOf(d.pl.length);
const cellOf=(d,s,p)=>(armOf(d.pl.length,s)*19+p)%Lg(d);
function xy(d,s,k,p){const n=d.pl.length,G=geo(sidesOf(n)),a=armOf(n,s);if(p<0)return G.pens[a].holes[k];if(p<G.L)return G.track[(a*19+p)%G.L];return G.lanes[a][p-G.L];}
const R=d=>JK_RULES[d.lv]||JK_RULES.c;

/* =================================================================================================================
   cards, deals
   ================================================================================================================= */
function shoe(d){const n=d.pl.length,decks=n<=4?1:2,a=[];for(let k=0;k<decks;k++){for(const s of 'shdc')for(const r of RANKS)a.push(r+s);for(let j=0;j<R(d).jokers;j++)a.push(j%2?'Xb':'Xr');}
  if(n===6)for(let i=0;i<8;i++)a.splice(rnd(a.length),1);// the 6-player board plays two decks less 8 cards: 96, dealt 5-5-6
  for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const pattern=n=>n===6?[5,5,6]:[4,4,5];
function deal(d){const al=aliveSeats(d),pat=pattern(d.pl.length);let deck=d.deck.slice(),di=d.di||0;const need=pat[di%3]*al.length;
  if(deck.length<need){deck=shoe(d);di=0;}const k=pat[di%3];const hd=d.hd.map(h=>h.slice());
  for(let i=0;i<k;i++)for(const s of al)hd[s].push(deck.pop());
  let nd={...d,hd,deck,di:di+1,deal:(d.deal||0)+1,xb:0};
  if(R(d).luckCard){const ks=Object.keys(LUCK);const lk=ks[rnd(ks.length)];nd={...nd,luck:lk};if(lk==='freeEntry')nd=freeEntry(nd);}
  if(R(d).partnerPass&&d.team&&teamPass(nd).length)nd={...nd,ph:'pass',pp:nd.pl.map(()=>'')};else nd={...nd,ph:'play'};
  return nd;}
function freeEntry(d){let mb=d.mb.slice();for(const s of aliveSeats(d)){const k=[0,1,2,3].find(k=>mb[s*4+k]<0);if(k==null)continue;
    const c=cellOf(d,s,0);if(occOf({...d,mb})[c])continue;mb[s*4+k]=0;}return {...d,mb};}
// the seats that still pass a card to their partner this deal (both partners in the game)
function teamPass(d){return aliveSeats(d).filter(s=>{const p=partner(d,s);return p>=0&&d.out[p]!=='1';});}

/* =================================================================================================================
   the board as the rules see it
   ================================================================================================================= */
function occOf(d){const L=Lg(d),o={};for(let s=0;s<d.pl.length;s++)for(let k=0;k<4;k++){const p=d.mb[s*4+k];if(p>=0&&p<L)o[cellOf(d,s,p)]={s,k,p};}return o;}
const onBase=(d,m)=>m&&m.p===0&&d.out[m.s]!=='1';
const shielded=(d,m)=>!!(m&&d.sh&&d.sh[m.s*4+m.k]==='1');
const homeAll=(d,s)=>{const L=Lg(d);for(let k=0;k<4;k++)if(d.mb[s*4+k]<L)return false;return true;};
const ctl=(d,s)=>d.team&&homeAll(d,s)?partner(d,s):s;
// a forward walk of marble (o,k): n holes, as owner o's marble. Opponent marbles moved by a 5 keep going round past their lane.
function fwd(d,o,k,n,occ,mode){const L=Lg(d),p=d.mb[o*4+k],Rl=R(d);if(p<0||p>=L+4)return null;const wrap=mode&&mode.wrap,tr=mode&&mode.tr;const kills=[];
  for(let i=1;i<=n;i++){let q=p+i;if(wrap&&q>=L)q-=L;
    if(q<L){const m=occ[cellOf(d,o,q)];if(!m)continue;
      if(onBase(d,m))return null;
      if(i<n){if(tr){if(shielded(d,m))return null;kills.push(m);continue;}
        if(m.s===o&&Rl.noJumpOwn)return null;
        if(Rl.twoBlock){let q2=q+1;if(wrap&&q2>=L)q2-=L;if(q2<L&&occ[cellOf(d,o,q2)]&&i+1<=n)return null;}
        continue;}
      if(m.s===o||shielded(d,m))return null;kills.push(m);}
    else{if(q-L>3)return null;for(let kk=0;kk<4;kk++)if(d.mb[o*4+kk]===q)return null;}}
  let to=p+n;if(wrap&&to>=L)to-=L;if(to>=L+4)return null;return {s:o,k,from:p,to,kills};}
function back(d,o,k,n,occ){const L=Lg(d),p=d.mb[o*4+k],Rl=R(d);if(p<0||p>=L)return null;const kills=[];
  for(let i=1;i<=n;i++){const q=((p-i)%L+L)%L,m=occ[cellOf(d,o,q)];if(!m)continue;if(onBase(d,m))return null;
    if(i<n){if(m.s===o&&Rl.noJumpOwn)return null;if(Rl.twoBlock&&i+1<=n){const q2=((p-i-1)%L+L)%L;if(occ[cellOf(d,o,q2)])return null;}continue;}
    if(m.s===o||shielded(d,m))return null;kills.push(m);}
  return {s:o,k,from:p,to:((p-n)%L+L)%L,kills,back:true};}
function outMove(d,o,occ){const k=[0,1,2,3].find(k=>d.mb[o*4+k]<0);if(k==null)return null;const m=occ[cellOf(d,o,0)];
  if(m&&(m.s===o||!R(d).entryKills||shielded(d,m)))return null;return {s:o,k,from:-1,to:0,kills:m?[m]:[]};}
function swapOk(d,o,k,t,tk){const L=Lg(d),p=d.mb[o*4+k],q=d.mb[t*4+tk];if(t===o||p<=0||p>=L||q<0||q>=L)return false;
  if(q===0&&d.out[t]!=='1')return false;if(shielded(d,{s:t,k:tk}))return false;if(!R(d).jSwapPartner&&d.team&&partner(d,o)===t)return false;return true;}
function doMove(d,m){const mb=d.mb.slice();for(const x of m.kills||[])mb[x.s*4+x.k]=-1;mb[m.s*4+m.k]=m.to;return {...d,mb};}
// the power of a card for this player, as a list of options (cs: the seat whose marbles the player moves)
function cardOpts(d,s,card,o={}){const cs=ctl(d,s),Rl=R(d),occ=occOf(d),out=[];let r=card[0];
  if(r==='X'){if(!o.as)return RANKS.split('').flatMap(rr=>cardOpts(d,s,rr+'s',{...o,as:rr}).map(x=>({...x,as:rr})));r=o.as;}
  const pw=o.pw,fw=n=>{for(let k=0;k<4;k++){if(pw==='reverse'){if(back(d,cs,k,n,occ))out.push({t:'b',k,n,pw});continue;}const nn=pw==='push2'?n+2:n;if(fwd(d,cs,k,nn,occ))out.push({t:'f',k,n:nn,...(pw?{pw}:{})});}};
  const red=o.as?false:isRed(card);
  if((r==='A'||r==='K')&&!pw&&outMove(d,cs,occ))out.push({t:'o'});
  if(r==='A'){fw(1);fw(11);}
  else if(r==='K'){if(Rl.kTramples&&!pw){for(let k=0;k<4;k++)if(fwd(d,cs,k,13,occ,{tr:1}))out.push({t:'f',k,n:13,tr:1});}else fw(13);}
  else if(r==='Q'){if(Rl.redQueenBurn&&red&&!pw){const t=nextHolder(d,s);if(t>=0)out.push({t:'rq',to:t});}else fw(d.luck==='longQueen'?15:12);}
  else if(r==='J'){if(Rl.redJack11&&red)fw(11);else if(!pw){for(let k=0;k<4;k++)for(let t=0;t<d.pl.length;t++)for(let tk=0;tk<4;tk++)if(swapOk(d,cs,k,t,tk))out.push({t:'j',k,o:t,ok:tk});}}
  else if(r==='T'){fw(10);if(Rl.tenBurn&&!pw){const t=nextHolder(d,s);if(t>=0)out.push({t:'tb',to:t});}}
  else if(r==='4'){if(!pw)for(let k=0;k<4;k++)if(back(d,cs,k,d.luck==='fourIsEight'?8:4,occ))out.push({t:'b',k,n:d.luck==='fourIsEight'?8:4});}
  else if(r==='5'){fw(5);if(Rl.fiveAny&&!pw){const team=teamOf(d,cs);for(let t=0;t<d.pl.length;t++){if(t===cs)continue;for(let k=0;k<4;k++){const p=d.mb[t*4+k];if(p<=0||p>=Lg(d))continue;
        if(fwd(d,t,k,5,occ,{wrap:!team.includes(t)}))out.push({t:'f5',o:t,k});}}}}
  else if(r==='7'){if(!pw){const tr=d.luck==='sevenTramples';for(let k=0;k<4;k++)for(let a=1;a<=7;a++){const m=fwd(d,cs,k,a,occ,tr?{tr:1}:null);if(!m)continue;if(a===7){out.push({t:'7',k,a});continue;}
        const d2=doMove(d,m),occ2=occOf(d2);for(let k2=0;k2<4;k2++)if(k2!==k&&fwd(d2,cs,k2,7-a,occ2,tr?{tr:1}:null))out.push({t:'7',k,a,k2});}}}
  else fw(+r);
  return out;}
// the next seat (in turn order) that still holds cards: the target of a 10 or a red queen
function nextHolder(d,s){let t=s;for(let i=0;i<d.pl.length;i++){t=nextSeat(d,t);if(t===s)return -1;if(d.hd[t]&&d.hd[t].length)return t;}return -1;}
// every legal play of seat s: [card index, option]; with the power card of الحريف, its variants too
function allPlays(d,s,withPw){const hd=d.hd[s]||[],out=[];hd.forEach((c,i)=>{for(const o of cardOpts(d,s,c))out.push([i,o]);
    if(withPw&&R(d).powerCard&&d.pw&&!d.pu[s]&&(d.pw[s]==='push2'||d.pw[s]==='reverse'))for(const o of cardOpts(d,s,c,{pw:d.pw[s]}))out.push([i,o]);});return out;}

/* =================================================================================================================
   playing a card: the whole move, events, captures, the next turn, deals, the win
   ================================================================================================================= */
const CN=c=>c[0]==='X'?'جوكر':({A:'إكة',K:'شايب',Q:'بنت',J:'ولد',T:'عشرة'}[c[0]]||c[0])+SU[c[1]];
function partOf(d,s,opt){const occ=occOf(d),cs=ctl(d,s);
  if(opt.t==='o')return outMove(d,cs,occ);
  if(opt.t==='f')return fwd(d,cs,opt.k,opt.n,occ,opt.tr?{tr:1}:null);
  if(opt.t==='b')return back(d,cs,opt.k,opt.n,occ);
  if(opt.t==='f5')return fwd(d,opt.o,opt.k,5,occ,{wrap:!teamOf(d,cs).includes(opt.o)});
  return null;}
function landEvent(d,m,evs){if(!R(d).events||m.to<0||m.to>=Lg(d))return d;const c=cellOf(d,m.s,m.to),side=Math.floor(c/19),no=c%19,ev=EVK.find(e=>e[0]===no);if(!ev)return d;const kind=ev[1];
  if(kind==='shield'){const sh=d.sh.split('');sh[m.s*4+m.k]='1';evs.push({t:'shield',s:m.s,k:m.k});return {...d,sh:sh.join('')};}
  const occ=occOf(d);const mm=kind==='boost'?fwd(d,m.s,m.k,3,occ,{wrap:false}):back(d,m.s,m.k,4,occ);
  evs.push({t:kind,s:m.s,k:m.k,ok:!!mm,from:m.to,to:mm?mm.to:m.to,kills:mm?mm.kills.map(x=>({s:x.s,k:x.k,from:x.p})):[]});
  return mm?doMove(d,mm):d;}
function playCard(d,ci,opt){const s=d.turn,n=d.pl.length,hd=d.hd.map(h=>h.slice()),card=hd[s].splice(ci,1)[0];
  let nd={...d,hd,np:(d.np||0)+1,pile:[...(d.pile||[]).slice(-2),[card,s]]};const moves=[],kills=[],evs=[];let swap=false,msg,extraTurn=false,skipT=-1;
  const go=m=>{if(!m)return;moves.push({s:m.s,k:m.k,from:m.from,to:m.to,back:!!m.back});for(const x of m.kills)kills.push({s:x.s,k:x.k,from:x.p});nd=doMove(nd,m);nd=landEvent(nd,m,evs);};
  const pwUse=opt&&opt.pw&&nd.pw&&nd.pw[s]===opt.pw&&!nd.pu[s];
  if(pwUse){const pu=nd.pu.slice();pu[s]=1;nd={...nd,pu};}
  const who=nm(d,s),cn=CN(card)+(opt&&opt.as?' كـ'+CN(opt.as+'s').replace(/[♠♥♦♣]/,''):'');
  if(!opt){msg=`${who} حرق ${cn} 🔥`;nd={...nd,nb:(nd.nb||0)+1};}
  else if(opt.t==='7'){const cs=ctl(nd,s),tr=nd.luck==='sevenTramples'?{tr:1}:null;go(fwd(nd,cs,opt.k,opt.a,occOf(nd),tr));if(opt.k2!=null)go(fwd(nd,cs,opt.k2,7-opt.a,occOf(nd),tr));msg=`${who} لعب ${cn}`+(opt.k2!=null?` وقسمها ${opt.a}+${7-opt.a}`:'');}
  else if(opt.t==='j'){const cs=ctl(nd,s),mb=nd.mb.slice(),L=Lg(nd);const A1=cellOf(nd,cs,mb[cs*4+opt.k]),B1=cellOf(nd,opt.o,mb[opt.o*4+opt.ok]);
    const ta=((B1-armOf(n,cs)*19)%L+L)%L,tb=((A1-armOf(n,opt.o)*19)%L+L)%L;
    moves.push({s:cs,k:opt.k,from:mb[cs*4+opt.k],to:ta,sw:1},{s:opt.o,k:opt.ok,from:mb[opt.o*4+opt.ok],to:tb,sw:1});
    mb[cs*4+opt.k]=ta;mb[opt.o*4+opt.ok]=tb;nd={...nd,mb};swap=true;msg=`${who} لعب ${cn} وبدّل مع ${nm(d,opt.o)}`;}
  else if(opt.t==='tb'||opt.t==='rq'){const t=opt.to;
    if(opt.t==='rq'){const h2=nd.hd.map(h=>h.slice());const c2=h2[t].splice(rnd(h2[t].length),1)[0];nd={...nd,hd:h2,nb:(nd.nb||0)+1,pile:[...nd.pile.slice(-2),[c2,t]]};skipT=t;msg=`${who} لعب البنت الحمرا وحرق ${CN(c2)} من ${nm(d,t)} 🔥`;}
    else{nd={...nd,ph:'throw',tb:t,ret:s};msg=`${who} لعب العشرة على ${nm(d,t)} 🔥`;}}
  else{go(partOf(nd,s,opt));const kind={o:' وطلّع حبة',b:' ورجع '+(opt.n||4),f5:' وحرّك حبة '+nm(d,opt.o)}[opt.t]||'';msg=`${who} لعب ${cn}${kind}`;}
  if(pwUse)msg+=` ⚡ ${POWERS[opt.pw]}`;
  if(kills.length)msg+=`، وقتل ${kills.map(x=>'حبة '+nm(d,x.s)).join(' و')} 💥`;
  for(const e of evs){for(const x of e.kills||[])kills.push(x);if(e.ok!==false)moves.push(...(e.t==='shield'?[]:[{s:e.s,k:e.k,from:e.from,to:e.to,back:e.t==='trap',ev:e.t}]));msg+={boost:'، 🌀 دفعة +٣',trap:'، 🪤 فخ ورجع ٤',shield:'، 🛡 درع'}[e.t];}
  if(R(nd).killBonus&&kills.some(x=>!teamOf(nd,s).includes(x.s))&&!nd.xb&&nd.hd[s].length&&nd.ph!=='throw'){extraTurn=true;msg+='، وله ورقة زيادة';}
  return finish(nd,s,{msg,moves,kills,swap,evs,card,extraTurn,skipT});}
// after a play: the win, the next turn (skipping empty hands), a new deal when everybody is out of cards
function finish(nd,s,o){const n=nd.pl.length;const mv={sid:((nd.mv&&nd.mv.sid)||0)+1,moves:o.moves||[],kills:o.kills||[],swap:!!o.swap,evs:o.evs||[],card:o.card||null,by:s};
  const team=teamOf(nd,s);let win=null,wins=null;
  if(team.every(x=>homeAll(nd,x))){win=s;wins=team;}
  else if(nd.np>=150*n){let best=-1,bs=[];for(let x=0;x<(nd.team?n/2:n);x++){const tm=teamOf(nd,x).filter(y=>nd.out[y]!=='1');if(!tm.length)continue;const sc=tm.reduce((a,y)=>a+[0,1,2,3].reduce((b,k)=>b+Math.max(0,nd.mb[y*4+k]+1),0),0);if(sc>best){best=sc;bs=tm;}}win=bs[0];wins=bs;}
  if(win!=null)return {...nd,win,wins,last:o.msg,mv,ph:'play'};
  if(nd.ph==='throw')return {...nd,turn:nd.tb,last:o.msg,mv};
  if(o.extraTurn)return {...nd,xb:1,turn:s,last:o.msg,mv};
  let t=nextSeat(nd,s);if(o.skipT>=0&&t===o.skipT)t=nextSeat(nd,t);
  return {...nextTurn({...nd,xb:0},t,o.msg),mv};}
function nextTurn(nd,t,msg){const n=nd.pl.length,al=aliveSeats(nd);if(nd.out[t]==='1')t=nextSeat(nd,t);
  let m=msg||nd.last||'';
  if(al.every(x=>!nd.hd[x].length)){nd={...deal(nd),dst:t};m+=(m?'. ':'')+'وزّعنا ورق جديد 🃏';if(nd.luck&&R(nd).luckCard)m+=`. 🍀 ورقة الحظ: ${LUCK[nd.luck]}`;
    if(nd.ph==='pass'){const ps=teamPass(nd);t=ps.includes(t)?t:ps[0];return clearSh({...nd,turn:t,last:m},t);}}
  let g=0;while(!nd.hd[t].length&&g++<n)t=nextSeat(nd,t);return clearSh({...nd,turn:t,last:m},t);}
// a shield lasts until its owner's next turn
function clearSh(nd,t){if(!nd.sh||nd.sh.indexOf('1')<0)return nd;const sh=nd.sh.split('');for(let k=0;k<4;k++)sh[t*4+k]='0';return {...nd,sh:sh.join('')};}
// the 10 played on a seat: it throws one card of its choice, and its turn is gone
function throwCard(d,ci){const s=d.turn,hd=d.hd.map(h=>h.slice()),c=hd[s].splice(ci,1)[0];let nd={...d,hd,ph:'play',tb:-1,nb:(d.nb||0)+1,pile:[...(d.pile||[]).slice(-2),[c,s]]};
  const msg=`${nm(d,s)} رمى ${CN(c)} 🔥`;return {...nextTurn(nd,nextSeat(nd,s),msg),mv:{sid:((d.mv&&d.mv.sid)||0)+1,moves:[],kills:[],evs:[],card:c,by:s}};}
// مخمخة: each partner passes one card face down; they reach the partner when everybody has passed
function passCard(d,ci){const s=d.turn,hd=d.hd.map(h=>h.slice()),c=hd[s].splice(ci,1)[0];const pp=d.pp.slice();pp[s]=c;let nd={...d,hd,pp};
  const ps=teamPass(nd),left=ps.filter(x=>!pp[x]);
  if(left.length){let t=s;for(let i=0;i<nd.pl.length;i++){t=nextSeat(nd,t);if(left.includes(t))break;}return {...nd,turn:t,last:`${nm(d,s)} عطى شريكه ورقة 🤝`};}
  const h2=hd.map(h=>h.slice());for(const x of ps)h2[partner(nd,x)].push(pp[x]);
  nd={...nd,hd:h2,pp:nd.pl.map(()=>''),ph:'play'};const st=nd.dst!=null?nd.dst:0;let t=nd.out[st]==='1'?nextSeat(nd,st):st;
  return clearSh({...nd,turn:t,last:'وصلت ورقة كل شريك لشريكه 🤝'},t);}
// الحريف: the guard power, a free action before the card
function guard(d,k){const s=d.turn,cs=ctl(d,s),sh=d.sh.split('');sh[cs*4+k]='1';const pu=d.pu.slice();pu[s]=1;
  return {...d,sh:sh.join(''),pu,last:`⚡ ${nm(d,s)} استخدم كرت الحريف: ترس على حبته 🛡`,mv:{sid:((d.mv&&d.mv.sid)||0)+1,moves:[],kills:[],evs:[{t:'shield',s:cs,k}],by:s,pw:'guard'}};}

/* =================================================================================================================
   a new game
   ================================================================================================================= */
let JKLV=null;try{JKLV=localStorage.getItem('jk-lv');}catch(e){}
function levelPref(){let v=null;try{v=typeof cfg==='function'?cfg().jklv:null;}catch(e){}if(!LVS.includes(v))v=JKLV;return LVS.includes(v)?v:'c';}
function jkInit(n,lv){const team=n>=4&&n%2===0;let d={mb:Array(n*4).fill(-1),hd:Array.from({length:n},()=>[]),deck:[],di:0,deal:0,lv,team,np:0,nb:0,pile:[],ph:'play',tb:-1,
    pp:Array(n).fill(''),sh:'0'.repeat(n*4),pw:Array(n).fill(''),pu:Array(n).fill(0),luck:'',xb:0,last:'',mv:null,dst:0,
    pl:Array.from({length:n},(_,i)=>i),out:'0'.repeat(n),turn:0};
  if(JK_RULES[lv].powerCard){const ks=Object.keys(POWERS);d.pw=d.pw.map(()=>ks[rnd(ks.length)]);}
  d=deal(d);d.last=d.luck?`🍀 ورقة الحظ: ${LUCK[d.luck]}`:'';
  const{pl,out,turn,...rest}=d;return rest;}
// the engine's starter opens; with the partner pass of مخمخة the passing round comes first
function jkStart(d){const nd={...d,dst:d.st};if(nd.ph==='pass'){const ps=teamPass(nd);let t=nd.st;for(let i=0;i<nd.pl.length&&!ps.includes(t);i++)t=(t+1)%nd.pl.length;return {...nd,turn:t};}return nd;}

/* exported for the render/bot parts below */
Object.assign(window,{JKX:{JK_RULES,LVS,EVK,POWERS,LUCK,RANKS,SU,isRed,SP,HR,MR,D2R,rot,add,unit,lft,rgt,r1,geo,sidesOf,armOf,partner,teamOf,Lg,cellOf,xy,R,
  occOf,onBase,shielded,homeAll,ctl,fwd,back,outMove,swapOk,doMove,cardOpts,nextHolder,allPlays,CN,playCard,throwCard,passCard,guard,nextTurn,finish,deal,jkInit,levelPref,
  jkStart,setPref:v=>{JKLV=v;try{localStorage.setItem('jk-lv',v);}catch(e){}},teamPass}});
})();

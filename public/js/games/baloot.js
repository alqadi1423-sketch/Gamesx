'use strict';
/* بلوت: Saudi Baloot with the full rules (deal of 5 and the exposed card, two bidding rounds with Hokm, Sun and Ashkal,
   double / three / four / gahwa with locked or open play, projects and Baloot, must-follow / must-trump / overtrump rules,
   card points to game points with the official rounding and tie rules, kaboot, game to 152).
   Four hands always play: 0 and 2 against 1 and 3. Players are spread over the hands:
   2 players play two hands each, 3 players give the lone player both hands of his team,
   5 to 8 players split into two teams whose members take the hands in turn, deal after deal. */

const BR='789TJQKA';
const BSEQ='AKQJT987';                       // order for projects
const BSUN='ATKQJ987';                      // strength without trumps: A 10 K Q J 9 8 7
const BTR='J9ATKQ87';                       // trump strength
const BPT={A:11,T:10,K:4,Q:3,J:2,9:0,8:0,7:0},BPTT={J:20,9:14,A:11,T:10,K:4,Q:3,8:0,7:0};
const BSN={s:'♠',h:'♥',d:'♦',c:'♣'},BSA={s:'شريا',h:'هاص',d:'ديمن',c:'سبيت'};
const bTeam=h=>h%2;
// small card: rank over suit, readable even when cards overlap
const miniCard=c=>`<div class="card mini ${'hd'.includes(c[1])?'red':'blk'}"><b>${c[0]==='T'?'10':c[0]}</b>${suitSVG(c[1])}</div>`;
const bDeck=()=>{const a=[];for(const s of 'shdc')for(const r of BR)a.push(r+s);return a;};
function bCtl(n,k,out){// which seat controls each hand in deal k (seats that left are out)
  const m=[[],[]];for(let s=0;s<n;s++)if((out||'')[s]!=='1')m[s%2].push(s);
  const c=[0,0,0,0];for(const t of [0,1]){const L=m[t].length;if(L===1){c[t]=c[t+2]=m[t][0];}else{c[t]=m[t][(2*k)%L];c[t+2]=m[t][(2*k+1)%L];}}
  return c;}
const bOrd=d=>[1,2,3,4].map(k=>(d.dl+k)%4);   // dealer's right first, dealer last
const bName=(d,h)=>nameTag(d,d.ctl[h])+(d.ctl[h]===d.ctl[(h+2)%4]?`<small class="bhn">${h<2?' (يد 1)':' (يد 2)'}</small>`:'');
const bTeamName=(d,t)=>{const s=[...new Set([d.ctl[t],d.ctl[t+2]])];return s.map(x=>nameTag(d,x)).join(' و');};
const bStr=(d,c)=>d.md==='h'&&c[1]===d.tr?100+(8-BTR.indexOf(c[0])):(8-BSUN.indexOf(c[0]));
const bVal=(d,c)=>d.md==='h'&&c[1]===d.tr?BPTT[c[0]]:BPT[c[0]];

function bDeal(d){const dk=shuffle(bDeck());const ord=bOrd(d);const hands=['','','',''];let k=0;
  for(const h of ord){hands[h]=dk.slice(k,k+5).join('');k+=5;}
  const pub=dk[k];k++;
  return {...d,ph:'bid',hands,pub,rest:dk.slice(k).join(''),bd:{r:1,st:'main',ord:[0,1,2,3],i:0,best:null},md:null,tr:null,decl:null,mult:1,lock:false,dq:null,
    tk:'',tl:null,pd:'',ab:[0,0],tc:[0,0],lt:null,pj:[[],[],[],[]],pjw:null,blt:null,bq:null,ekka:false,sum:null,turn:d.ctl[ord[0]]};}
function bInit(n){return bDeal({ctl:bCtl(n,0),k:0,dl:3,sc:[0,0],last:''});}
// whose prompt it is in the bidding: hand
const bBidHand=d=>bOrd(d)[d.bd.ord[d.bd.i]];
function bBidOpts(d){const b=d.bd,pos=b.ord[b.i],ace=d.pub[0]==='A';
  if(b.st==='over')return ['sun','pass'];
  if(b.r===1){if(!b.best)return ['pass','hokm','sun',...(pos>=2&&!ace?['ashkal']:[])];return ['pass','sun',...(pos>=2&&!ace?['ashkal']:[])];}
  if(!b.best)return ['pass','hokm2','sun'];return ['pass','sun'];}
const BOPT={pass:'بس',hokm:'حكم',hokm2:'حكم ثاني',sun:'صن',ashkal:'أشكل'};
function bBid(d,o,suit){const b={...d.bd},pos=b.ord[b.i],h=bOrd(d)[pos];const say=`${bName(d,h)}: ${o==='hokm2'?'حكم '+BSN[suit]:BOPT[o]}`;
  const fin=best=>bFinish({...d,last:say},best);
  if(b.st==='over'){if(o==='sun')return fin({t:'s',pos});b.i++;if(b.i>=b.ord.length)return fin(b.best);return {...d,bd:b,turn:d.ctl[bOrd(d)[b.ord[b.i]]],last:say};}
  if(o==='sun'||o==='ashkal'){const best={t:o==='sun'?'s':'a',pos};
    if(b.r===2)return fin(best);
    const earlier=[0,1,2,3].filter(p=>p<pos);if(!earlier.length)return fin(best);
    const nb={r:1,st:'over',ord:earlier,i:0,best};return {...d,bd:nb,turn:d.ctl[bOrd(d)[earlier[0]]],last:say};}
  if(o==='hokm')b.best={t:'h',pos,suit:d.pub[1]};
  if(o==='hokm2')b.best={t:'h',pos,suit};
  b.i++;
  if(b.i<4)return {...d,bd:b,turn:d.ctl[bOrd(d)[b.ord[b.i]]],last:say};
  // end of a round
  if(b.r===1){if(b.best){const earlier=[0,1,2,3].filter(p=>p<b.best.pos);if(!earlier.length)return fin(b.best);
      return {...d,bd:{r:1,st:'over',ord:earlier,i:0,best:b.best},turn:d.ctl[bOrd(d)[earlier[0]]],last:say};}
    return {...d,bd:{r:2,st:'main',ord:[0,1,2,3],i:0,best:null},turn:d.ctl[bOrd(d)[0]],last:say+' • الكل قال بس، الدور الثاني'};}
  if(b.best)return fin(b.best);
  // nobody bought: the deal passes on
  const nd={...d,dl:(d.dl+1)%4};return {...bDeal(nd),last:'الكل قال بس مرتين، توزيعة جديدة'};}
function bFinish(d,best){const ord=bOrd(d),bh=ord[best.pos];const decl=best.t==='a'?(bh+2)%4:bh;
  const hands=[...d.hands];let rest=d.rest,k=0;hands[decl]+=d.pub;
  for(const h of ord){const m=h===decl?2:3;hands[h]+=rest.slice(k*2,k*2+m*2);k+=m;}
  for(let h=0;h<4;h++)hands[h]=bSort(hands[h],best.t==='h'?best.suit:null);
  const md=best.t==='h'?'h':'s';
  let nd={...d,hands,rest:'',md,tr:best.t==='h'?best.suit:null,decl,bt:best.t,ph:'play',tl:ord[0],tk:''};
  nd.last=`${bName(d,bh)} اشترى ${best.t==='h'?'حكم '+BSN[best.suit]:best.t==='a'?'أشكل لخويه':'صن'}`;
  // doubling: Hokm always, Sun only when one team is over 100 and the other under
  const t=bTeam(decl),o=1-t;const sunOk=(d.sc[t]>100&&d.sc[o]<100)||(d.sc[o]>100&&d.sc[t]<100);
  if(md==='h'||sunOk){const opp=ord.filter(h=>bTeam(h)===o);nd={...nd,ph:'dbl',dq:{lv:1,ask:opp,i:0},turn:d.ctl[opp[0]]};}
  else nd.turn=d.ctl[ord[0]];
  return nd;}
function bSort(h,tr){const cs=cardsOf(h);const so=['s','h','c','d'];return cs.sort((a,b)=>a[1]!==b[1]?(a[1]===tr?-1:b[1]===tr?1:so.indexOf(a[1])-so.indexOf(b[1])):(tr&&a[1]===tr?BTR.indexOf(a[0])-BTR.indexOf(b[0]):BSUN.indexOf(a[0])-BSUN.indexOf(b[0]))).join('');}
// doubling answers
const bDblHand=d=>d.dq.ask[d.dq.i];
function bDblOpts(d){const lv=d.dq.lv;if(d.md==='s')return ['dbl','no'];return lv===1?['dblL','dblO','no']:lv===2?['three','no']:lv===3?['fourL','fourO','no']:['gahwa','no'];}
const BDN={dbl:'دبل',dblL:'دبل مقفول',dblO:'دبل مفتوح',three:'ثري',fourL:'فور مقفول',fourO:'فور مفتوح',gahwa:'قهوة',no:'لا'};
function bDbl(d,o){const q={...d.dq},h=q.ask[q.i],say=`${bName(d,h)}: ${BDN[o]}`;const ord=bOrd(d);
  const play=x=>({...x,ph:'play',dq:null,turn:x.ctl[ord[0]],last:say});
  if(o==='no'){q.i++;if(q.i<q.ask.length)return {...d,dq:q,turn:d.ctl[q.ask[q.i]],last:say};return play(d);}
  if(d.md==='s')return play({...d,mult:2});
  const t=bTeam(d.decl);
  if(q.lv===1){return {...d,mult:2,lock:o==='dblL',dq:{lv:2,ask:[d.decl],i:0,by:h},turn:d.ctl[d.decl],last:say};}
  if(q.lv===2){return {...d,mult:3,lock:false,dq:{lv:3,ask:[q.by!=null?q.by:d.dq.by],i:0,by:q.by},turn:d.ctl[q.by],last:say};}
  if(q.lv===3){return {...d,mult:4,lock:o==='fourL',dq:{lv:4,ask:[d.decl],i:0,by:q.by},turn:d.ctl[d.decl],last:say};}
  return play({...d,mult:5,lock:false});}
// projects in a hand: up to two that do not share cards, best first
function bProjects(hand,md){const cs=cardsOf(hand);const out=[];
  for(const r of 'AKQJT'){if(cs.filter(c=>c[0]===r).length===4){if(r==='A')out.push({k:md==='s'?400:100,q:1,top:r,cards:cs.filter(c=>c[0]===r)});else out.push({k:100,q:1,top:r,cards:cs.filter(c=>c[0]===r)});}}
  for(const s of 'shdc'){const has=BSEQ.split('').map(r=>cs.includes(r+s));
    for(let i=0;i<8;i++)for(let L=3;L<=5;L++){if(i+L>8)break;let ok=true;for(let j=0;j<L;j++)if(!has[i+j]){ok=false;break;}
      if(ok)out.push({k:L===3?20:L===4?50:100,q:0,top:BSEQ[i],cards:BSEQ.slice(i,i+L).split('').map(r=>r+s)});}}
  let best=[],bv=-1;const val=p=>p.k*10+(p.q?5:0);
  for(let a=0;a<out.length;a++){if(val(out[a])>bv){bv=val(out[a]);best=[out[a]];}
    for(let b=a+1;b<out.length;b++){if(out[a].cards.some(c=>out[b].cards.includes(c)))continue;const v=val(out[a])+val(out[b]);if(v>bv){bv=v;best=[out[a],out[b]].sort((x,y)=>bCmpP(y,x));}}}
  return best;}
function bCmpP(a,b){if(a.k!==b.k)return a.k-b.k;if(a.q!==b.q)return a.q-b.q;return BSEQ.indexOf(b.top)-BSEQ.indexOf(a.top);}
const bPName=p=>p.k===400?'أربعمية':p.k===100?'مية':p.k===50?'خمسين':'سرا';
const bPGame=(p,md)=>md==='s'?({20:4,50:10,100:20,400:40})[p.k]:({20:2,50:5,100:10,400:10})[p.k];
// which cards may be played now
function bLegal(d,h){const H=cardsOf(d.hands[h]);const tk=cardsOf(d.tk);const T=d.md==='h'?d.tr:null;
  if(!tk.length){if(T&&d.lock){const nt=H.filter(c=>c[1]!==T);if(nt.length)return nt;}return H;}
  const L=tk[0][1];const fol=H.filter(c=>c[1]===L);const pos=tk.length;// 1..3 = second..fourth player
  const win=bTrickWin(d,tk);const partnerWins=pos>=2&&win===pos-2;// the partner played the card two places back
  if(!T)return fol.length?fol:H;
  const trumps=H.filter(c=>c[1]===T);const topT=Math.max(-1,...tk.filter(c=>c[1]===T).map(c=>bStr(d,c)));
  const higher=trumps.filter(c=>bStr(d,c)>topT);
  if(fol.length){if(L!==T)return fol;if(partnerWins)return fol;return higher.length?higher:fol;}
  if(L===T||!trumps.length)return H;
  if(partnerWins){if(pos===3)return H;// fourth player: partner winning, free
    // third player with the leader (partner) winning: free only after an Ace or Ekka lead
    if(d.ekka||tk[0][0]==='A')return H;return trumps;}
  return higher.length?higher:H;}
const bTrickWin=(d,tk)=>{let w=0;for(let i=1;i<tk.length;i++){const a=tk[w],b=tk[i];const at=d.md==='h'&&a[1]===d.tr,bt=d.md==='h'&&b[1]===d.tr;
  if(bt&&!at)w=i;else if(b[1]===a[1]&&bStr(d,b)>bStr(d,a))w=i;}return w;};
function bIsTop(d,c){// highest card of its suit still out
  const gone=cardsOf(d.pd);return !BSUN.split('').some(r=>BSUN.indexOf(r)<BSUN.indexOf(c[0])&&!gone.includes(r+c[1]));}
// which hands hold K and Q of trumps, noted before the first card so every path (tap, bot, timer) counts Baloot
const bQ=d=>[0,1,2,3].map(x=>d.md==='h'&&cardsOf(d.hands[x]).includes('K'+d.tr)&&cardsOf(d.hands[x]).includes('Q'+d.tr));
function bPlay(d,c){if(!d.pd&&!d.bq)d={...d,bq:bQ(d)};const h=(d.tl+cardsOf(d.tk).length)%4;let hands=[...d.hands];hands[h]=cardsOf(hands[h]).filter((x,i,a)=>!(x===c&&a.indexOf(x)===i)).join('');
  let nd={...d,hands,tk:d.tk+c,pd:d.pd+c,lm:null};
  if(d.tk==='')nd.ekka=d.md==='h'&&c[1]!==d.tr&&c[0]!=='A'&&bIsTop(d,c);
  // Baloot: king and queen of trumps in one hand, counted when the second one is played
  if(d.md==='h'&&c[1]===d.tr&&'KQ'.includes(c[0])){const other=(c[0]==='K'?'Q':'K')+d.tr;const mine=cardsOf(d.pd).filter(x=>x===other).length&&d.bq&&d.bq[h];
    if(mine&&d.blt==null)nd.blt=h;}
  const tk=cardsOf(nd.tk);
  if(tk.length<4)return {...nd,turn:d.ctl[(h+1)%4]};
  const w=(d.tl+bTrickWin(d,tk))%4;const ab=[...d.ab],tc=[...d.tc];const t=bTeam(w);ab[t]+=tk.reduce((x,y)=>x+bVal(d,y),0);tc[t]++;
  nd={...nd,ab,tc,tl:w,tk:'',lt:{c:tk,from:d.tl,w},ekka:false,turn:d.ctl[w],last:`${bName(d,w)} أكل اللمّة${tk.reduce((x,y)=>x+bVal(d,y),0)?` (${tk.reduce((x,y)=>x+bVal(d,y),0)})`:''}`};
  if(tc[0]+tc[1]===1)nd=bProjWinner(nd);
  if(tc[0]+tc[1]===8){ab[t]+=10;return bScore({...nd,ab});}
  return nd;}
function bProjWinner(d){// after the first trick: the team with the best single project scores all of its declared projects
  let best=null,bh=null;const ord=bOrd(d);
  for(const h of ord)for(const p of d.pj[h]){if(!best||bCmpP(p,best)>0){best=p;bh=h;}}
  return {...d,pjw:best?bTeam(bh):null,last:d.last+(best?` • المشاريع لفريق ${bTeamName(d,bTeam(bh))}`:'')};}
function bScore(d){const t=bTeam(d.decl),o=1-t,mult=d.mult,hk=d.md==='h';const TOT=hk?16:26;
  const projPts=[0,0];if(d.pjw!=null){for(let h=0;h<4;h++)if(bTeam(h)===d.pjw)for(const p of d.pj[h])projPts[d.pjw]+=bPGame(p,d.md);}
  // Baloot is lost when both cards sit in a counted hundred of trumps or four kings / queens
  let blt=[0,0];if(d.blt!=null){const h=d.blt;const blocked=d.pjw===bTeam(h)&&d.pj[h].some(p=>p.k===100&&p.cards.includes('K'+d.tr)&&p.cards.includes('Q'+d.tr));if(!blocked)blt[bTeam(h)]=2;}
  let res={gp:[0,0],add:[0,0],win:null,kab:null};
  const kab=d.tc[t]===8?t:d.tc[o]===8?o:null;
  if(kab!=null){const base=hk?[25,50,75,100,100][mult-1]:(mult>1?88:44);const pj=projPts[kab]*(mult>1?2:1);res.add[kab]=base+pj+(hk?blt[kab]:0);res.win=kab;res.kab=kab;}
  else{const count=mult===2||mult===4?t:o;const C=d.ab[count];
    const g=hk?Math.floor((C+4)/10):(C%10===5?C/5:Math.round(C/10)*2);
    res.gp[count]=g;res.gp[1-count]=TOT-g;
    const tot=[res.gp[0]+projPts[0]+blt[0],res.gp[1]+projPts[1]+blt[1]];
    let wt;if(tot[t]!==tot[o])wt=tot[t]>tot[o]?t:o;
    else{const u=C%10;if(hk)wt=u>=2&&u<=5?count:u===1?t:1-count;else wt=u>=1&&u<=4?count:(u===0||u===5)?t:1-count;}
    res.win=wt;
    if(mult===1&&wt===t)res.add=tot;
    else if(mult===1){res.add[wt]=TOT+projPts[0]+projPts[1]+blt[0]+blt[1];}
    else{res.add[wt]=(hk?16:26)*Math.min(mult,4)+2*(projPts[0]+projPts[1])+blt[0]+blt[1];}}
  const sc=[d.sc[0]+res.add[0],d.sc[1]+res.add[1]];
  const nd={...d,ph:'sum',sum:{...res,ab:[...d.ab],pp:projPts,blt},sc,turn:d.ctl[(d.dl+1)%4]};
  if(mult===5)return bWin(nd,res.win);
  if(sc[0]>=152||sc[1]>=152){if(sc[0]!==sc[1])return bWin(nd,sc[0]>sc[1]?0:1);}
  return nd;}
function bWin(d,t){let seats=[...new Set([d.ctl[t],d.ctl[t+2],...d.pl.map((_,s)=>s).filter(s=>s%2===t)])];const al=seats.filter(s=>(d.out||'')[s]!=='1');if(al.length)seats=al;return {...d,win:seats[0],wins:seats,wt:t};}
function bNext(d){const k=d.k+1,ctl=bCtl(d.pl.length,k,d.out);return {...bDeal({...d,k,ctl,dl:(d.dl+1)%4}),last:''};}
// a seat left (skip or kick): its hands go to a teammate who sits out this deal, else to the one playing the partner hand.
// A team with nobody left loses the game
function bSkip(nd){const al=s=>nd.out[s]!=='1',team=t=>nd.pl.map((_,s)=>s).filter(s=>s%2===t&&al(s));
  for(const t of [0,1])if(!team(t).length)return bWin(nd,1-t);
  const ctl=[...nd.ctl];
  for(let h=0;h<4;h++){if(al(ctl[h]))continue;const free=team(h%2).filter(s=>!ctl.includes(s)),p=ctl[(h+2)%4];ctl[h]=free.length?free[0]:al(p)?p:team(h%2)[0];}
  const x={...nd,ctl};const h=x.ph==='sum'?(x.dl+1)%4:bActHand(x);return h==null?x:{...x,turn:ctl[h]};}
// the suit picker of 'حكم ثاني' belongs to one bidding prompt only
const bSuitKey=d=>[d.gid,d.k,d.dl,d.pub,d.bd&&d.bd.r,d.bd&&d.bd.st,d.bd&&d.bd.i].join(':');
// whose screen shows which hand
function bMine(d,v){return [0,1,2,3].filter(h=>d.ctl[h]===v);}
function bActHand(d){if(d.ph==='bid')return bBidHand(d);if(d.ph==='dbl')return bDblHand(d);if(d.ph==='play')return (d.tl+cardsOf(d.tk).length)%4;return null;}
/* online, what seat v sees (v −1 = a spectator): only the hands it plays this deal; the rest of the pack, the note of who holds K and Q of trumps
   and the cards behind other hands' projects stay hidden (the team that wins the projects shows them after the first trick, as at a real table).
   Lengths stay, so the backs still count right. All of it opens at the win; at the deal summary every hand is already empty */
const bHide=x=>typeof x==='string'?'?'.repeat(x.length):x;
function bMask(d,v){if(!d||d.win!=null||!Array.isArray(d.hands)||!Array.isArray(d.ctl))return d;const own=k=>v>=0&&d.ctl[k]===v;
  return {...d,hands:d.hands.map((x,k)=>own(k)?x:bHide(x)),rest:bHide(d.rest),bq:Array.isArray(d.bq)?d.bq.map((x,k)=>own(k)?x:false):d.bq,
    pj:Array.isArray(d.pj)?d.pj.map((ps,k)=>own(k)||(d.pjw!=null&&bTeam(k)===d.pjw)||!Array.isArray(ps)?ps:ps.map(p=>({k:p.k,q:0,top:'?',cards:(p.cards||[]).map(bHide)}))):d.pj};}
GAMES.baloot={teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,name:'بلوت',cat:'cards',lbc:'#1E6B52',noTimer:false,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1E7A5C"/><ellipse cx="50" cy="56" rx="40" ry="30" fill="#249170"/><g transform="rotate(-14 38 52)"><rect x="22" y="26" width="32" height="46" rx="5" fill="#fff"/><text x="38" y="56" font-size="22" font-weight="800" text-anchor="middle" fill="#2D4763">J♠</text></g><g transform="rotate(12 62 52)"><rect x="46" y="26" width="32" height="46" rx="5" fill="#fff"/><text x="62" y="56" font-size="22" font-weight="800" text-anchor="middle" fill="#D43C33">9♥</text></g></svg>`,
  init:n=>bInit(n),
  start:(d,base)=>({...d,turn:base.turn}),// the first bidder is the dealer's right, as bDeal set
  onSkip:nd=>bSkip(nd),
  mask:(d,v)=>bMask(d,v),
  // the room's host left with nobody holding the hidden cards: this deal is dealt again, the score and who plays which hand stay
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...bDeal(d),last:'انعادت التوزيعة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((_,s)=>`${d.sc[s%2]}`),
  winText:d=>d.win!=null?`فاز فريق ${bTeamName(d,d.wt)} ${d.sc[d.wt]} مقابل ${d.sc[1-d.wt]}${d.mult===5?' بالقهوة ☕':''}`:null,
  onTimeout(d){const h=bActHand(d);
    if(d.ph==='bid')return bBid(d,'pass');
    if(d.ph==='dbl')return bDbl(d,'no');
    if(d.ph==='sum')return bNext(d);
    const L=bLegal(d,h);return bPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')s+=`${who}: ${d.bd.st==='over'?'تبي صن؟':d.bd.r===1?'الشراء، الدور الأول':'الشراء، الدور الثاني'}`;
    else if(d.ph==='dbl')s+=`${who}: ${({1:'تبي تدبل؟',2:'تبي ثري؟',3:'تبي فور؟',4:'تبي قهوة؟'})[d.dq.lv]}`;
    else if(d.ph==='play')s+=`${who}${d.ctl.filter(x=>x===d.turn).length>1?` <small>(${bActHand(d)<2?'اليد 1':'اليد 2'})</small>`:''}`;
    else s+=`انتهت الصكة • ${who} يوزّع التالية`;
    return s;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v;const mine=bMine(d,v);const ah=bActHand(d);
    // the hand drawn at the bottom; a spectator or a member sitting out this deal sees it face down
    const watch=!mine.length,me=mine.includes(ah)?ah:mine[0]!=null?mine[0]:(v>=0?v%2:0);
    const pos=h=>({0:'b',1:'r',2:'t',3:'l'})[(h-me+4)%4];
    let h=`<div class="blt"><div class="bsc"><span class="t0 ${bTeam(me)===0?'us':''}"><i>${bTeam(me)===0?'لنا':'لهم'}</i><b>${d.sc[0]}</b></span><span class="bmode">${d.md?`${d.md==='h'?`حكم <em class="${'hd'.includes(d.tr)?'rs':''}">${BSN[d.tr]}</em>`:d.bt==='a'?'أشكل':'صن'}${d.mult>1?` <u>${({2:'دبل',3:'ثري',4:'فور',5:'قهوة'})[d.mult]}${d.lock?' مقفول':''}</u>`:''}`:`<em class="${'hd'.includes(d.pub[1])?'rs':''}">${BSN[d.pub[1]]}</em> الشراء`}</span><span class="t1 ${bTeam(me)===1?'us':''}"><i>${bTeam(me)===1?'لنا':'لهم'}</i><b>${d.sc[1]}</b></span></div>`;
    h+='<div class="btable">';
    for(let k=0;k<4;k++){const p=pos(k);const isMine=mine.includes(k);const cnt=cardsOf(d.hands[k]).length;
      h+=`<div class="bseat ${p} ${ah===k&&d.ph!=='sum'?'on':''} ${d.decl===k?'decl':''}" style="--c:${col(d,d.ctl[k])}"><span class="bnm">${bName(d,k)}${d.decl===k?' 👑':''}${d.dl===k?' <small>موزّع</small>':''}</span>`;
      if(p!=='b')h+=isMine?`<div class="bmini">${cardsOf(d.hands[k]).map(miniCard).join('')}</div>`:`<div class="bbacks">${'<i></i>'.repeat(Math.min(cnt,8))}</div>`;
      if(d.ph==='play'&&d.pj[k].length&&cardsOf(d.pd).length<8)h+=`<span class="bpj">${d.pj[k].map(bPName).join(' + ')}</span>`;
      h+='</div>';}
    // middle: exposed card while buying, the trick while playing
    h+='<div class="bmid">';
    if(d.ph==='bid'||(d.ph==='dbl'&&false))h+=`<div class="bpub">${cardHTML(d.pub,true)}</div>`;
    else if(d.ph==='play'||d.ph==='dbl'){const tk=cardsOf(d.tk);const show=tk.length?tk.map((c,i)=>[(d.tl+i)%4,c]):(d.lt?d.lt.c.map((c,i)=>[(d.lt.from+i)%4,c]):[]);
      // each trick card is keyed by the card, so one just played is a new node and slides in from its seat; the last trick marks its winner
      for(const [hh,c] of show)h+=`<div class="btk ${pos(hh)} ${!tk.length?'old':''} ${!tk.length&&d.lt&&d.lt.w===hh?'win':''}" data-k="${c}">${cardHTML(c)}</div>`;}
    h+='</div></div>';
    // actions
    const my=ctx.my;
    if(d.ph==='bid'&&my){const o=bBidOpts(d);
      if(S.blSuit===bSuitKey(d))h+=`<p class="lbl" style="text-align:center">اختر الحكم</p><div class="row bopts">${'shdc'.split('').filter(x=>x!==d.pub[1]).map(x=>`<button class="btn ${'hd'.includes(x)?'rs':''} bsuit" data-ga="suit" data-i="${'shdc'.indexOf(x)}">${BSN[x]}</button>`).join('')}<button class="btn" data-ga="suit" data-i="-1">رجوع</button></div>`;
      else h+=`<div class="row bopts">${o.map(x=>`<button class="btn ${x==='pass'?'':x==='sun'?'navy':'green'}" data-ga="bid" data-i="${['pass','hokm','sun','ashkal','hokm2'].indexOf(x)}">${BOPT[x]}</button>`).join('')}</div>`;}
    if(d.ph==='dbl'&&my)h+=`<div class="row bopts">${bDblOpts(d).map(x=>`<button class="btn ${x==='no'?'':'red'}" data-ga="dbl" data-i="${['dbl','dblL','dblO','three','fourL','fourO','gahwa','no'].indexOf(x)}">${BDN[x]}</button>`).join('')}</div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel bsum"><h3>${r.kab!=null?`كبوت لفريق ${bTeamName(d,r.kab)}! 🔥`:`الصكة لفريق ${bTeamName(d,r.win)}`}</h3>
      <div class="bsr"><span></span><b>${bTeamName(d,0)}</b><b>${bTeamName(d,1)}</b></div>
      <div class="bsr"><span>الأبناط</span><em>${r.ab[0]}</em><em>${r.ab[1]}</em></div>
      ${r.pp[0]||r.pp[1]?`<div class="bsr"><span>المشاريع</span><em>${r.pp[0]}</em><em>${r.pp[1]}</em></div>`:''}
      ${r.blt[0]||r.blt[1]?`<div class="bsr"><span>بلوت</span><em>${r.blt[0]}</em><em>${r.blt[1]}</em></div>`:''}
      <div class="bsr tot"><span>يضاف</span><em>+${r.add[0]}</em><em>+${r.add[1]}</em></div>
      ${my?'<button class="big green" data-ga="next">وزّع الصكة التالية</button>':''}</div>`;}
    // the hand(s) of this player
    if(d.ph!=='sum'&&watch)h+=`<div class="bhand">${cardsOf(d.hands[me]).map(()=>`<div class="bcard">${cardHTML('??')}</div>`).join('')}</div><p class="note" style="text-align:center">تتفرج هالصكة</p>`;
    else if(d.ph!=='sum'){const hc=cardsOf(d.hands[me]);const can=my&&d.ph==='play'&&ah===me;const L=can?bLegal(d,me):[];
      const pj=d.ph==='play'&&cardsOf(d.pd).length<4&&can&&!d.pj[me].length?bProjects(d.hands[me],d.md):[];
      if(pj.length)h+=`<div class="row bopts"><button class="btn green" data-ga="proj">أعلن: ${pj.map(bPName).join(' + ')}</button></div>`;
      h+=`<div class="bhand">${hc.map(c=>L.includes(c)?`<button class="bcard" data-ga="card" data-i="${hc.indexOf(c)}">${cardHTML(c)}</button>`:`<div class="bcard ${can?'dim':''}">${cardHTML(c)}</div>`).join('')}</div>`;}
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='next'&&d.ph==='sum'){act(bNext(d));return;}
    if(d.ph!=='sum'&&d.ctl[bActHand(d)]!==d.turn)return;
    if(a==='suit'){const ok=S.blSuit===bSuitKey(d),su='shdc'[i];S.blSuit=null;
      if(!ok||i<0||!su||d.ph!=='bid'||!bBidOpts(d).includes('hokm2')||su===d.pub[1]){render();return;}act(bBid(d,'hokm2',su));return;}
    if(a==='bid'&&d.ph==='bid'){const o=['pass','hokm','sun','ashkal','hokm2'][i];if(!bBidOpts(d).includes(o))return;if(o==='hokm2'){S.blSuit=bSuitKey(d);render();return;}act(bBid(d,o));return;}
    if(a==='dbl'&&d.ph==='dbl'){const o=['dbl','dblL','dblO','three','fourL','fourO','gahwa','no'][i];if(!bDblOpts(d).includes(o))return;act(bDbl(d,o));return;}
    if(d.ph!=='play')return;const h=bActHand(d);
    if(a==='proj'){const pj=bProjects(d.hands[h],d.md);if(!pj.length)return;const p=[...d.pj];p[h]=pj;act({...d,pj:p,last:`${bName(d,h)} أعلن ${pj.map(bPName).join(' + ')}`});return;}
    if(a==='card'){const c=cardsOf(d.hands[h])[i];if(!c||!bLegal(d,h).includes(c))return;act(bPlay(d,c));}}
};

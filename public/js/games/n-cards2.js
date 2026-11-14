'use strict';
/* n-cards2: Arab and Gulf trick games on one shared table: طرنيب، كوت، سبيتة، القلوب، تركس، استيميشن.
   Every game deals a fixed number of hands (d.H). A hand is played by the seat d.ctl[h]:
   - partnership games (d.team): hands 0,2,(4) against 1,3,(5); with fewer players a player holds both hands of his side,
     with more players the members of a side take the hands in turn, deal after deal (as in بلوت);
   - games played alone: one hand per seat.
   Online every seat sees only the hands it plays (mask); the shuffle runs on the host, in the click it replays. */

/* ---------- cards ---------- */
const C2R='23456789TJQKA';
const c2r=c=>C2R.indexOf(c[0]);                       // 0 = two .. 12 = ace
const C2SN={s:'♠',h:'♥',d:'♦',c:'♣'};
const C2SO='shcd';                                     // hand order: black, red, black, red
const c2IsJ=c=>c[0]==='X';                             // جوكر: XR the big (coloured) one, XB the small (black) one
const c2Deck=rk=>{rk=rk||C2R;const a=[];for(const s of 'shdc')for(const r of rk)a.push(r+s);return a;};
const c2Rm=(h,c)=>{const a=cardsOf(h),i=a.indexOf(c);if(i>=0)a.splice(i,1);return a.join('');};
const c2Su=(s,cls)=>`<em class="c2s ${'hd'.includes(s)?'rs':''} ${cls||''}">${C2SN[s]}</em>`;
function c2Sort(h,tr){const a=cardsOf(h),so=c=>c2IsJ(c)?-1:c[1]===tr?0:1+C2SO.indexOf(c[1]);
  return a.sort((x,y)=>so(x)-so(y)||(c2IsJ(x)&&c2IsJ(y)?(x==='XR'?-1:1):c2r(y)-c2r(x))).join('');}
const c2Card=(c,big,extra)=>c2IsJ(c)?`<div class="card jk c2jk ${c==='XB'?'b':''} ${big?'big':''} ${extra||''}" aria-label="جوكر ${c==='XR'?'كبير':'صغير'}">${typeof HJKF!=='undefined'?HJKF:''}<i class="c2jl">${c==='XR'?'كبير':'صغير'}</i></div>`:cardHTML(c,big,extra);
const c2Mini=c=>c2IsJ(c)?`<div class="card mini jk ${c==='XB'?'c2jb':''}"><b>★</b></div>`:miniCard(c);

/* ---------- who plays which hand ---------- */
function c2Ctl(n,H,k,out,team){if(!team)return [...Array(H)].map((_,h)=>h%n);
  const al=s=>(out||'')[s]!=='1',c=Array(H).fill(0);
  for(const t of [0,1]){const m=[];for(let s=0;s<n;s++)if(s%2===t&&al(s))m.push(s);const hs=[];for(let h=t;h<H;h+=2)hs.push(h);const L=m.length;if(!L)continue;
    if(L>=hs.length){const st=(k*hs.length)%L;hs.forEach((h,j)=>c[h]=m[(st+j)%L]);}else hs.forEach((h,j)=>c[h]=m[j%L]);}
  return c;}
// a seat that left: its hands go to a teammate who sits out this deal, else to the one playing the partner hand (or the next player)
function c2Fix(d){const al=s=>d.out[s]!=='1',ctl=[...d.ctl];
  for(let h=0;h<d.H;h++){if(al(ctl[h]))continue;
    if(d.team){const tm=d.pl.map((_,s)=>s).filter(s=>s%2===h%2&&al(s));if(!tm.length)return null;const free=tm.filter(s=>!ctl.includes(s));ctl[h]=free.length?free[0]:tm[0];}
    else ctl[h]=nextSeat(d,ctl[h]);}
  return ctl;}
const c2Mine=(d,v)=>[...Array(d.H)].map((_,h)=>h).filter(h=>d.ctl[h]===v);
function c2Name(d,h){const s=d.ctl[h],mine=c2Mine(d,s);return nameTag(d,s)+(mine.length>1?`<small class="bhn"> (يد ${mine.indexOf(h)+1})</small>`:'');}
const c2TeamName=(d,t)=>{const s=[...new Set(d.ctl.filter((_,h)=>h%2===t))];return s.map(x=>nameTag(d,x)).join(' و');};
function c2WinTeam(d,t){let seats=[...new Set([...d.ctl.filter((_,h)=>h%2===t),...d.pl.map((_,s)=>s).filter(s=>s%2===t)])];const al=seats.filter(s=>d.out[s]!=='1');if(al.length)seats=al;return {...d,win:seats[0],wins:seats,wt:t};}
// the hands other seats hold, the pack and cards passed face down are hidden online; lengths stay so the backs still count right
const c2Hide=x=>typeof x==='string'?'?'.repeat(x.length):x;
function c2Mask(d,v){if(!d||d.win!=null||!Array.isArray(d.hands)||!Array.isArray(d.ctl))return d;const own=k=>v>=0&&d.ctl[k]===v;
  const o={...d,hands:d.hands.map((x,k)=>own(k)?x:c2Hide(x))};if(typeof d.dk==='string')o.dk=c2Hide(d.dk);
  if(Array.isArray(d.ps))o.ps=d.ps.map((x,k)=>own(k)?x:c2Hide(x));return o;}

/* ---------- tricks ---------- */
const c2Su0=c=>c[1];
function c2Follow(hand,tk,suit){suit=suit||c2Su0;const H=cardsOf(hand);if(!tk.length)return H;const L=suit(tk[0]);const f=H.filter(c=>suit(c)===L);return f.length?f:H;}
// index of the card winning the trick: the best trump, else the best card of the suit led
function c2Win(tk,T,str,suit){suit=suit||c2Su0;str=str||c2r;let w=0;
  for(let i=1;i<tk.length;i++){const a=tk[w],b=tk[i],at=!!T&&suit(a)===T,bt=!!T&&suit(b)===T;if(bt&&!at)w=i;else if(suit(b)===suit(a)&&str(b)>str(a))w=i;}return w;}
// one card to the trick; after the last card the trick goes to its winner and o.after(nd,w,tk) moves the deal on
function c2Put(d,c,win,after){const h=d.ah,H=d.H,hands=[...d.hands];hands[h]=c2Rm(hands[h],c);let nd={...d,hands,tk:d.tk+c,pd:d.pd+c};
  const tk=cardsOf(nd.tk);if(tk.length<H){const nx=(h+1)%H;return {...nd,ah:nx,turn:nd.ctl[nx]};}
  const w=(d.tl+win(nd,tk))%H,tw=[...d.tw];tw[w]++;
  nd={...nd,tw,tl:w,ah:w,tk:'',lt:{c:tk,f:d.tl,w},tlog:d.tlog+w,turn:nd.ctl[w],last:`${c2Name(d,w)} أكل اللمّة`};
  return after(nd,w,tk);}
// which suits each hand has shown out of, read from the tricks on the table (what every player at the table saw)
function c2Voids(d,suit){suit=suit||c2Su0;const H=d.H,vd=[...Array(H)].map(()=>({})),pd=cardsOf(d.pd),lg=d.tlog||'';
  const mark=(tk,L)=>tk.forEach((c,i)=>{if(!i)return;const led=suit(tk[0]);if(suit(c)!==led&&!c2IsJ(c))vd[(L+i)%H][led]=1;});
  for(let j=0;j<lg.length;j++)mark(pd.slice(j*H,(j+1)*H),j?+lg[j-1]:d.t0);mark(cardsOf(d.tk),d.tl);return vd;}

/* ---------- the felt: seats round an oval, the trick in the middle, each card flies in from its player ---------- */
function c2Pos(H,r){const a=(90-r*360/H)*Math.PI/180;return [Math.cos(a),Math.sin(a)];}
function c2Trick(d,me){const H=d.H,tk=cardsOf(d.tk);const show=tk.length?tk.map((c,i)=>[(d.tl+i)%H,c]):(d.lt?d.lt.c.map((c,i)=>[(d.lt.f+i)%H,c]):[]);
  const R=H>4?[24,24]:[15,19];let s='';
  for(const [hh,c] of show){const r=(hh-me+H)%H,[x,y]=c2Pos(H,r),old=!tk.length;
    s+=`<div class="c2tk ${old?'old':''} ${old&&d.lt.w===hh?'win':''}" data-k="${c}" style="left:${(50+R[0]*x).toFixed(1)}%;top:${(50+R[1]*y).toFixed(1)}%;--fx:${Math.round(x*120)}px;--fy:${Math.round(y*110)}px">${c2Card(c)}</div>`;}
  return s;}
function c2Table(d,me,o){const H=d.H;let h=`<div class="c2felt ${H>4?'many':''} ${o.cls||''}">`;
  for(let k=0;k<H;k++){const r=(k-me+H)%H,[x,y]=c2Pos(H,r),cnt=cardsOf(d.hands[k]).length;
    h+=`<div class="c2seat ${r===0?'me':''} ${o.on===k?'on':''} ${o.mark&&o.mark(k)?'mk':''}" style="left:${(50+41*x).toFixed(1)}%;top:${(50+(r===0?43:39)*y).toFixed(1)}%;--c:${col(d,d.ctl[k])}"><span class="c2nm">${c2Name(d,k)}</span><span class="c2inf">${o.info?o.info(k):''}${r&&cnt?`<i class="c2bk">${cnt}</i>`:''}</span></div>`;}
  return h+`<div class="c2mid">${o.center!=null?o.center:c2Trick(d,me)}</div></div>`;}
// the last trick stays readable while the next one is played
function c2Last(d,extra){if(!d.lt||!d.tk)return '';return `<div class="blast"><small>آخر لمّة</small><span class="lc">${d.lt.c.map((c,i)=>`<span class="${(d.lt.f+i)%d.H===d.lt.w?'w':''}">${c2Mini(c)}</span>`).join('')}</span><b>${c2Name(d,d.lt.w)}</b>${extra||''}</div>`;}
// the hand: every card keeps its node (id), so only new cards fly in
function c2Hand(d,me,L,can,sel){const hc=cardsOf(d.hands[me]),ids=handIds(hc,'c2'+me+'-');
  return `<div class="bhand c2hand ${hc.length>13?'big':''}">${hc.map((c,i)=>L.includes(c)&&can?`<button class="bcard ${sel&&sel.includes(i)?'sel':''}" id="${ids[i]}" data-ga="card" data-i="${i}">${c2Card(c)}</button>`:`<button class="bcard ${can?'dim':''}" id="${ids[i]}" disabled>${c2Card(c)}</button>`).join('')}</div>`;}
const c2Backs=(n,msg)=>`<div class="bhand c2hand">${Array(n).fill('<div class="bcard">'+cardHTML('??')+'</div>').join('')}</div><p class="note" style="text-align:center">${msg||'تتفرج هالجولة'}</p>`;
// the hand drawn at the bottom for viewer v: the one playing now when it is his, else his first; a spectator sees seat 0's side face down
function c2Me(d,v){const mine=c2Mine(d,v);return {mine,me:mine.includes(d.ah)?d.ah:mine.length?mine[0]:Math.max(0,v)%d.H,watch:!mine.length};}
const c2Head=(d,me,mid)=>`<div class="bsc c2sc"><span class="t0 ${me%2===0?'us':''}"><i>${me%2===0?'لنا':'لهم'}</i><b>${d.sc[0]}</b></span><span class="bmode">${mid}</span><span class="t1 ${me%2===1?'us':''}"><i>${me%2===1?'لنا':'لهم'}</i><b>${d.sc[1]}</b></span></div>`;
const c2Btns=(xs,ga)=>`<div class="row bopts c2opts">${xs.map(([i,t,cls])=>`<button class="btn ${cls||''}" data-ga="${ga}" data-i="${i}">${t}</button>`).join('')}</div>`;

/* ---------- the bot for games where tricks are wanted: counts the cards, plays with its partner, keeps its trumps ----------
   o: T trump (or null), str(c) strength that ranks trumps over the rest, suit(c), win(tk) index, mate(a,b), deck,
   want (false: this hand tries to lose the trick), draw (the side that should pull the trumps) */
function c2BotWin(d,h,L,lv,o){if(L.length===1)return L[0];
  if(Math.random()<[0,.45,.12,0][lv])return L[rnd(L.length)];
  const T=o.T,suit=o.suit||c2Su0,str=o.str,H=d.H,me=cardsOf(d.hands[h]);
  const seen=new Set([...cardsOf(d.pd),...me]),unseen=o.deck.filter(c=>!seen.has(c));
  const vd=lv>=2?c2Voids(d,suit):[...Array(H)].map(()=>({}));
  const master=c=>!unseen.some(u=>suit(u)===suit(c)&&str(u)>str(c));
  const opp=x=>!o.mate(h,x),tk=cardsOf(d.tk),pos=tk.length,after=[...Array(H-1-pos)].map((_,i)=>(h+1+i)%H);
  const trLeft=!!T&&unseen.some(u=>suit(u)===T);
  const canRuff=(x,s)=>!!T&&s!==T&&!!vd[x][s]&&!vd[x][T]&&trLeft;
  const lowS=a=>a.slice().sort((x,y)=>(suit(x)===T)-(suit(y)===T)||str(x)-str(y))[0];
  const highS=a=>a.slice().sort((x,y)=>str(y)-str(x))[0];
  const len=s=>me.filter(c=>suit(c)===s).length;
  if(o.want===false){// shed: never win when it can be helped, throw the biggest card that stays under
    if(!pos)return lowS(L);const beats=L.filter(c=>o.win([...tk,c])===pos),safe=L.filter(c=>!beats.includes(c));
    return safe.length?highS(safe):(after.length?lowS(beats):highS(beats));}
  if(!pos){
    if(T&&o.draw&&trLeft&&H===4){const mt=L.filter(c=>suit(c)===T&&master(c));if(mt.length&&lv>=2)return highS(mt);}
    const sure=L.filter(c=>suit(c)!==T&&master(c)&&!after.some(x=>opp(x)&&canRuff(x,suit(c))));if(sure.length)return highS(sure);
    if(T){const pr=L.filter(c=>suit(c)!==T&&[...Array(H-1)].some((_,i)=>{const x=(h+1+i)%H;return !opp(x)&&canRuff(x,suit(c));})&&!after.some(x=>opp(x)&&canRuff(x,suit(c))));if(pr.length)return lowS(pr);}
    // a low card from the longest side suit, not from under an honour that is still covered
    const side=L.filter(c=>suit(c)!==T);const pool=side.length?side:L;
    return pool.slice().sort((a,b)=>len(suit(b))-len(suit(a))||str(a)-str(b))[0];}
  const wi=o.win(tk),wh=(d.tl+wi)%H,pw=!opp(wh),wc=tk[wi],led=suit(tk[0]);
  const beats=L.filter(c=>o.win([...tk,c])===pos);
  const oppAfter=after.filter(opp);
  const holds=c=>master(c)&&(suit(c)===T||!oppAfter.some(x=>canRuff(x,led)));
  if(pw&&(!oppAfter.length||holds(wc)))return lowS(L);
  if(beats.length){
    if(!oppAfter.length)return lowS(beats.slice().sort((a,b)=>str(a)-str(b)));
    const sureB=beats.filter(holds);if(sureB.length)return sureB.slice().sort((a,b)=>str(a)-str(b))[0];
    const ruff=beats.filter(c=>suit(c)===T&&led!==T);if(ruff.length&&!pw)return ruff.slice().sort((a,b)=>str(a)-str(b))[0];
    if(!pw&&pos>=H/2&&lv>=2)return beats.slice().sort((a,b)=>str(a)-str(b))[0];}
  return lowS(L);}
// what a 13-card hand may take by itself with T as trumps (an estimate for bids)
function c2Est(cs,T){const by={s:[],h:[],d:[],c:[]};for(const c of cs)if(!c2IsJ(c))by[c[1]].push(c2r(c));let v=0;
  for(const s of 'shdc'){const r=by[s],n=r.length,has=x=>r.includes(x);
    if(s===T){v+=(has(12)?1:0)+(has(11)?(n>=2?.9:.35):0)+(has(10)?(n>=3?.7:.2):0)+(has(9)&&n>=4?.4:0)+Math.max(0,n-3)*.85;}
    else{v+=(has(12)?.95:0)+(has(11)?(has(12)?.8:n>=2?.45:.1):0)+(has(10)&&n>=3&&(has(12)||has(11))?.3:0);
      if(T){const t=by[T].length;if(n===0&&t>=3)v+=Math.min(2,t-2)*.55;else if(n===1&&t>=3)v+=.4;}}}
  return v;}
// the same for any table: each card wins when the unseen higher cards of its suit that sit in other hands are used up by my higher ones
function c2EstP(cs,T,H,Tn){const q=Math.min(1,(H-1)*Tn/Math.max(1,52-Tn))*.7,mine=new Set(cs);let v=0;
  const cdf=(u,i)=>{let p=0,c=1;for(let k=0;k<=Math.min(i,u);k++){p+=c*Math.pow(q,k)*Math.pow(1-q,u-k);c=c*(u-k)/(k+1);}return p;};
  for(const s of 'shdc'){const m=cs.filter(c=>c[1]===s).sort((a,b)=>c2r(b)-c2r(a));
    m.forEach((c,i)=>{const u=C2R.slice(c2r(c)+1).split('').filter(r=>!mine.has(r+s)).length;let p=cdf(u,i);
      if(s===T){if(i>=3)p=Math.max(p,.8);}else{if(i>=2)p*=T?.55:.8;if(i>=3)p*=.7;}v+=p;});
    if(T&&s!==T){const t=cs.filter(c=>c[1]===T).length;if(t>=2&&m.length<=1)v+=(2-m.length)*.35*Math.min(1,(t-1)/2);}}
  return v;}
const c2Lv=lv=>lv===1?Math.random()*3-1.5:lv===2?Math.random()*1.2-.6:0;

/* =================================================================
   طرنيب: four hands in two teams, 13 cards each. Bids 7 to 13 go round until three pass; the buyer names the trump
   (the tarneeb) and leads. Made: the team scores its tricks (16 for all 13, 26 for a bid of 13); failed: it loses the bid
   and the other team scores its tricks (13 bid and failed: -16, the others double). First team to 31 wins.
   ================================================================= */
function c2tnDeal(d){const dk=shuffle(c2Deck()),ah=(d.dl+1)%4;
  return {...d,ph:'bid',hands:[0,1,2,3].map(h=>c2Sort(dk.slice(h*13,h*13+13).join(''))),pa:'0000',best:null,bids:[-1,-1,-1,-1],tr:null,
    t0:ah,tl:ah,tk:'',lt:null,tw:[0,0,0,0],pd:'',tlog:'',sum:null,ah,turn:d.ctl[ah]};}
function c2tnBid(d,v){const h=d.ah,bids=[...d.bids];bids[h]=v;let pa=d.pa,best=d.best;if(!v)pa=setAt(pa,h,'1');else best={h,v};
  const say=`${c2Name(d,h)}: ${v||'باس'}`,live=[0,1,2,3].filter(x=>pa[x]!=='1');
  if(best&&(best.v===13||(live.length===1&&live[0]===best.h)))return {...d,pa,best,bids,ph:'trump',ah:best.h,turn:d.ctl[best.h],last:say+` • ${c2Name(d,best.h)} اشترى بـ ${best.v}`};
  if(!live.length)return {...c2tnDeal(d),last:'الكل قال باس، نعيد التوزيع'};
  let x=h;do x=(x+1)%4;while(pa[x]==='1');return {...d,pa,best,bids,ah:x,turn:d.ctl[x],last:say};}
const c2tnOpts=d=>[0,...[7,8,9,10,11,12,13].filter(v=>!d.best||v>d.best.v)];
function c2tnTrump(d,s){const h=d.best.h,hands=d.hands.map(x=>c2Sort(x,s));return {...d,hands,tr:s,ph:'play',t0:h,tl:h,ah:h,turn:d.ctl[h],last:`${c2Name(d,h)} اختار الطرنيب ${C2SN[s]}`};}
const c2tnWinF=d=>(nd,tk)=>c2Win(tk,d.tr);
function c2tnPlay(d,c){return c2Put(d,c,c2tnWinF(d),nd=>nd.tlog.length===13?c2tnScore(nd):nd);}
function c2tnScore(d){const b=d.best,t=b.h%2,o=1-t,won=d.tw[t]+d.tw[t+2],opp=13-won,add=[0,0],made=won>=b.v;
  if(made)add[t]=b.v===13?26:won===13?16:won;else if(b.v===13){add[t]=-16;add[o]=opp*2;}else{add[t]=-b.v;add[o]=opp;}
  const sc=[d.sc[0]+add[0],d.sc[1]+add[1]],nx=(d.dl+1)%4;
  const nd={...d,ph:'sum',sc,sum:{add,tr:[d.tw[0]+d.tw[2],d.tw[1]+d.tw[3]],made},ah:nx,turn:d.ctl[nx],last:made?`${c2TeamName(d,t)} جابوا ${won} من ${b.v}`:`${c2TeamName(d,t)} انكسروا: ${won} من ${b.v}`};
  for(const x of [t,o])if(sc[x]>=31&&sc[x]>sc[1-x])return c2WinTeam(nd,x);
  return nd;}
function c2NextTeam(d,deal){const k=d.k+1,H=d.H;return {...deal({...d,k,ctl:c2Ctl(d.pl.length,H,k,d.out,1),dl:(d.dl+1)%H}),last:''};}
function c2SkipTeam(nd,deal){for(const t of [0,1])if(!nd.pl.some((_,s)=>s%2===t&&nd.out[s]!=='1'))return c2WinTeam(nd,1-t);
  const ctl=c2Fix(nd);if(!ctl)return nd;return {...nd,ctl,turn:ctl[nd.ah]};}
// the parts every partnership game shares
function c2TeamGame(o){return {teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,cat:'cards',
  start:(d,base)=>({...d,turn:base.turn}),
  onSkip:nd=>nd.win!=null?nd:c2SkipTeam(nd,o.deal),
  mask:(d,v)=>c2Mask(d,v),
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...o.deal(d),last:'انعادت التوزيعة من جديد'},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  points:d=>d.pl.map((_,s)=>`${d.sc[s%2]}`),
  winText:d=>d.win!=null&&d.wt!=null?`فاز فريق ${c2TeamName(d,d.wt)} ${d.sc[d.wt]} مقابل ${d.sc[1-d.wt]}`:null,
  ...o.G};}
// shared render frame: score bar, felt, last trick, the phase panel, the hand
function c2Frame(d,ctx,o){const v=ctx.local?d.turn:ctx.v,{mine,me,watch}=c2Me(d,v),ah=d.ah;
  let h=`<div class="blt c2 ${o.cls||''}">${o.head(d,me)}`;
  h+=c2Table(d,me,{on:d.ph==='sum'?-1:ah,info:k=>o.info(d,k),mark:o.mark?k=>o.mark(d,k):null,center:o.center?o.center(d,me):null});
  if(d.ph==='play'&&d.lt&&d.tk)h+=c2Last(d,o.lastX?o.lastX(d):'');
  const my=ctx.my&&mine.includes(ah)&&d.ctl[ah]===d.turn;
  if(d.ph==='sum')h+=o.sum(d,ctx,me);
  else{if(my&&o.panel)h+=o.panel(d,ctx,me)||'';else if(o.wait)h+=o.wait(d,me)||'';
    if(watch)h+=c2Backs(cardsOf(d.hands[me]).length);
    else{const can=my&&o.canCard(d,me);const L=can?o.legal(d,me):[];h+=c2Hand(d,me,L,can,o.sel?o.sel(d,me):null);}}
  return h+'</div>';}

GAMES.c_tarneeb=c2TeamGame({deal:c2tnDeal,G:{name:'طرنيب',lbc:'#8C2F39',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8C2F39"/><circle cx="50" cy="54" r="38" fill="#A63D47"/><g transform="rotate(-16 36 54)"><rect x="18" y="28" width="34" height="48" rx="5" fill="#fff"/><text direction="ltr" x="35" y="57" font-size="18" font-weight="800" text-anchor="middle" fill="#2D4763">A♠</text></g><g transform="rotate(14 64 54)"><rect x="48" y="28" width="34" height="48" rx="5" fill="#fff"/><text direction="ltr" x="65" y="57" font-size="18" font-weight="800" text-anchor="middle" fill="#D43C33">K♥</text></g><circle cx="78" cy="22" r="14" fill="#F0B429"/><text direction="ltr" x="78" y="28" font-size="16" font-weight="900" text-anchor="middle" fill="#7A2430">13</text></svg>`,
  init:n=>c2tnDeal({H:4,team:1,ctl:c2Ctl(n,4,0,'',1),k:0,dl:3,sc:[0,0],last:''}),
  onTimeout(d){if(d.ph==='bid')return c2tnBid(d,0);if(d.ph==='trump')return c2tnTrump(d,'shdc'[rnd(4)]);if(d.ph==='sum')return c2NextTeam(d,c2tnDeal);
    const L=c2Follow(d.hands[d.ah],cardsOf(d.tk));return c2tnPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')return s+`${who}: المزايدة من 7 إلى 13${d.best?` • أعلى طلب ${d.best.v}`:''}`;
    if(d.ph==='trump')return s+`${who}: اختر الطرنيب`;
    if(d.ph==='play')return s+who;return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{
    head:(d,me)=>c2Head(d,me,d.tr?`طرنيب ${c2Su(d.tr)}${d.best?` <u>${d.best.v}</u>`:''}`:'<small>المزايدة</small>'),
    info:(d,k)=>d.ph==='bid'||d.ph==='trump'?(d.bids[k]>0?`<b class="c2bid">${d.bids[k]}</b>`:d.bids[k]===0?'<small>باس</small>':''):d.ph==='sum'?'':`<b class="c2tw">${d.tw[k]}</b>${d.best&&d.best.h===k?' 👑':''}`,
    panel(d,ctx,me){if(d.ph==='bid')return c2Btns(c2tnOpts(d).map(v=>[v,v?String(v):'باس',v?'green':'']),'bid');
      if(d.ph==='trump')return `<p class="lbl c2lb">اختر الطرنيب</p>`+c2Btns('shdc'.split('').map((s,i)=>[i,C2SN[s],'bsuit '+('hd'.includes(s)?'rs':'')]),'trump');},
    canCard:d=>d.ph==='play',legal:(d,h)=>c2Follow(d.hands[h],cardsOf(d.tk)),
    sum(d,ctx){const r=d.sum,t=d.best.h%2;return `<div class="panel bsum"><h3>${r.made?`${c2TeamName(d,t)} جابوا طلبهم (${d.best.v}) ✅`:`${c2TeamName(d,t)} انكسروا ❌`}</h3>
      <div class="bsr"><span></span><b>${c2TeamName(d,0)}</b><b>${c2TeamName(d,1)}</b></div>
      <div class="bsr"><span>اللمّات</span><em>${r.tr[0]}</em><em>${r.tr[1]}</em></div>
      <div class="bsr tot"><span>النقاط</span><em>${r.add[0]>0?'+':''}${r.add[0]}</em><em>${r.add[1]>0?'+':''}${r.add[1]}</em></div>
      <div class="bsr"><span>المجموع</span><b>${d.sc[0]}</b><b>${d.sc[1]}</b></div>
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2NextTeam(d,c2tnDeal));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='bid'&&d.ph==='bid'){if(!c2tnOpts(d).includes(i))return;act(c2tnBid(d,i));return;}
    if(a==='trump'&&d.ph==='trump'){const s='shdc'[i];if(!s)return;act(c2tnTrump(d,s));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!c2Follow(d.hands[d.ah],cardsOf(d.tk)).includes(c))return;act(c2tnPlay(d,c));}}}});
HELP.c_tarneeb='أربع أيادي: كل اثنين متقابلين فريق، وكل يد تاخذ 13 ورقة. المزايدة تبدأ من يمين الموزّع وتلف عكس عقارب الساعة: كل واحد يطلب عدد لمّات (من 7 إلى 13) أعلى من اللي قبله أو يقول باس، واللي يقول باس يطلع من المزايدة. لو الكل قال باس تنعاد التوزيعة. آخر واحد باقي يشتري ويختار الطرنيب (الحكم) ويبدأ اللعب. لازم تنزل من نفس النوع اللي نزل أول، وإذا ما عندك تقدر تطرنب أو ترمي أي ورقة. أعلى طرنيب ياكل اللمّة، وإذا ما نزل طرنيب ياكلها أعلى ورقة من النوع الأول. إذا جاب الفريق المشتري طلبه ياخذ عدد لمّاته (والكبوت 13 لمّة = 16، وطلب 13 وجابه = 26) والخصم ما ياخذ شي. وإذا انكسر ينخصم منه طلبه والخصم ياخذ لمّاته (طلب 13 وانكسر: ‎-16 والخصم ياخذ ضعف لمّاته). أول فريق يوصل 31 يفوز. لاعبين اثنين: كل واحد يلعب يدين فريقه. ثلاثة: اللي لحاله يلعب يدين فريقه. من 5 لاعبين: أعضاء الفريق يتناوبون على أياديه جولة بعد جولة.';

/* the bot: bids from what its hand can take with its best suit as trumps plus a share for its partner, and plays to win
   the tricks its team needs (draws the trumps when it bought, feeds its partner, ruffs) */
GAMES.c_tarneeb.bot=(d,s,lv)=>{if(d.ph==='sum')return c2NextTeam(d,c2tnDeal);const h=d.ah,H=cardsOf(d.hands[h]);
  if(d.ph==='bid'||d.ph==='trump'){let bs='s',bv=-1;for(const x of 'shdc'){const v=c2Est(H,x);if(v>bv){bv=v;bs=x;}}
    if(d.ph==='trump')return c2tnTrump(d,bs);
    const mate=d.best&&d.best.h%2===h%2;const team=bv+[0,3,3.2,3.3][lv]+c2Lv(lv)+(d.bids[(h+2)%4]>0?.8:0);
    const want=Math.min(13,Math.floor(team));const o=c2tnOpts(d);if(mate&&want<d.best.v+2)return c2tnBid(d,0);
    const nx=o.find(v=>v>0&&v<=want);return c2tnBid(d,nx||0);}
  const L=c2Follow(d.hands[h],cardsOf(d.tk));
  return c2tnPlay(d,c2BotWin(d,h,L,lv,{T:d.tr,str:c=>(c[1]===d.tr?100:0)+c2r(c),win:tk=>c2Win(tk,d.tr),mate:(a,b)=>a%2===b%2,deck:c2Deck(),draw:d.best.h%2===h%2}));};
GAMES.c_tarneeb.botDelay=(d,s,lv)=>d.ph==='sum'?7000:d.ph==='play'?650+rnd(600):900+rnd(700);

/* =================================================================
   سبيتة (spades): partnership, spades always trumps. Every hand bids 0 (nil) to 13; a team's contract is the sum of its
   non-nil bids. Made: 10 a trick of the contract + 1 a trick over (bags; every 10 bags cost 100). Failed: -10 a trick.
   Nil: +100 when that hand takes nothing, else -100. Spades may not be led before one was played on another suit.
   First team to 500 wins; a team down to -200 loses.
   ================================================================= */
function c2spDeal(d){const dk=shuffle(c2Deck()),ah=(d.dl+1)%4;
  return {...d,ph:'bid',hands:[0,1,2,3].map(h=>c2Sort(dk.slice(h*13,h*13+13).join(''),'s')),bids:[-1,-1,-1,-1],tr:'s',brk:false,
    t0:ah,tl:ah,tk:'',lt:null,tw:[0,0,0,0],pd:'',tlog:'',sum:null,ah,turn:d.ctl[ah]};}
function c2spBid(d,v){const h=d.ah,bids=[...d.bids];bids[h]=v;const say=`${c2Name(d,h)}: ${v?v:'نِل (صفر)'}`;
  if(bids.every(x=>x>=0)){const f=d.t0;return {...d,bids,ph:'play',ah:f,tl:f,turn:d.ctl[f],last:say};}
  const nx=(h+1)%4;return {...d,bids,ah:nx,turn:d.ctl[nx],last:say};}
function c2spLegal(d,h){const H=cardsOf(d.hands[h]),tk=cardsOf(d.tk);if(tk.length)return c2Follow(d.hands[h],tk);
  if(d.brk)return H;const ns=H.filter(c=>c[1]!=='s');return ns.length?ns:H;}
function c2spPlay(d,c){const tk=cardsOf(d.tk);const brk=d.brk||(c[1]==='s'&&tk.length&&tk[0][1]!=='s')||(c[1]==='s'&&!tk.length);
  return c2Put({...d,brk},c,(nd,t)=>c2Win(t,'s'),nd=>nd.tlog.length===13?c2spScore(nd):nd);}
function c2spScore(d){const add=[0,0],bags=[...(d.bags||[0,0])],det=[[],[]];
  for(const t of [0,1]){const hs=[t,t+2],con=hs.reduce((x,h)=>x+(d.bids[h]>0?d.bids[h]:0),0),got=hs.reduce((x,h)=>x+(d.bids[h]>0?d.tw[h]:0),0);
    for(const h of hs)if(d.bids[h]===0){const ok=!d.tw[h];add[t]+=ok?100:-100;det[t].push(ok?'نِل ✅ +100':'نِل ❌ ‎-100');bags[t]+=d.tw[h];add[t]+=d.tw[h];}
    if(con>0){if(got>=con){add[t]+=10*con+(got-con);bags[t]+=got-con;det[t].push(`${got}/${con} ✅`);}else{add[t]-=10*con;det[t].push(`${got}/${con} ❌`);}}
    else if(got){add[t]+=got;bags[t]+=got;}
    while(bags[t]>=10){bags[t]-=10;add[t]-=100;det[t].push('10 زيادات ‎-100');}}
  const sc=[d.sc[0]+add[0],d.sc[1]+add[1]],nx=(d.dl+1)%4;
  const nd={...d,ph:'sum',sc,bags,sum:{add,det,tr:[d.tw[0]+d.tw[2],d.tw[1]+d.tw[3]]},ah:nx,turn:d.ctl[nx],last:'انتهت الجولة'};
  const hi=sc[0]>=500||sc[1]>=500;if(hi&&sc[0]!==sc[1])return c2WinTeam(nd,sc[0]>sc[1]?0:1);
  if(sc[0]<=-200||sc[1]<=-200){if(sc[0]!==sc[1])return c2WinTeam(nd,sc[0]>sc[1]?0:1);}
  return nd;}
const c2spOpts=()=>[0,1,2,3,4,5,6,7,8,9,10,11,12,13];
GAMES.c_spades=c2TeamGame({deal:c2spDeal,G:{name:'سبيتة',lbc:'#24324A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#24324A"/><circle cx="50" cy="50" r="40" fill="#2F4363"/><path transform="translate(50 47) scale(5.2)" d="${SUITP.s}" fill="#fff"/><rect x="26" y="74" width="48" height="14" rx="7" fill="#F0B429"/><text direction="ltr" x="50" y="85" font-size="11" font-weight="900" text-anchor="middle" fill="#24324A">500</text></svg>`,
  init:n=>c2spDeal({H:4,team:1,ctl:c2Ctl(n,4,0,'',1),k:0,dl:3,sc:[0,0],bags:[0,0],last:''}),
  onTimeout(d){if(d.ph==='bid')return c2spBid(d,Math.max(1,Math.round(c2Est(cardsOf(d.hands[d.ah]),'s'))));if(d.ph==='sum')return c2NextTeam(d,c2spDeal);
    const L=c2spLegal(d,d.ah);return c2spPlay(d,L[rnd(L.length)]);},
  points:d=>d.pl.map((_,s)=>`${d.sc[s%2]}`),
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')return s+`${who}: كم لمّة تطلب؟`;if(d.ph==='play')return s+who+(d.brk?'':' <small>• الأسباتي ما انكسر</small>');return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{
    head:(d,me)=>c2Head(d,me,`${c2Su('s')} <small>زيادات ${(d.bags||[0,0])[me%2]}</small>`),
    info:(d,k)=>d.bids[k]<0?'':`<b class="c2bid">${d.ph==='play'?`${d.tw[k]}/`:''}${d.bids[k]===0?'نِل':d.bids[k]}</b>`,
    panel(d){if(d.ph==='bid')return `<p class="lbl c2lb">كم لمّة بتاخذ؟ (صفر = نِل)</p>`+c2Btns(c2spOpts().map(v=>[v,v?String(v):'نِل',v?'green':'navy']),'bid');},
    canCard:d=>d.ph==='play',legal:(d,h)=>c2spLegal(d,h),
    sum(d,ctx){const r=d.sum;return `<div class="panel bsum"><h3>نتيجة الجولة</h3>
      <div class="bsr"><span></span><b>${c2TeamName(d,0)}</b><b>${c2TeamName(d,1)}</b></div>
      <div class="bsr"><span>اللمّات</span><em>${r.tr[0]}</em><em>${r.tr[1]}</em></div>
      <div class="bsr"><span>العقد</span><em>${r.det[0].join('<br>')||'-'}</em><em>${r.det[1].join('<br>')||'-'}</em></div>
      <div class="bsr tot"><span>النقاط</span><em>${r.add[0]>0?'+':''}${r.add[0]}</em><em>${r.add[1]>0?'+':''}${r.add[1]}</em></div>
      <div class="bsr"><span>المجموع</span><b>${d.sc[0]}</b><b>${d.sc[1]}</b></div>
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2NextTeam(d,c2spDeal));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='bid'&&d.ph==='bid'){if(!(i>=0&&i<=13))return;act(c2spBid(d,i));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!c2spLegal(d,d.ah).includes(c))return;act(c2spPlay(d,c));}}}});
HELP.c_spades='أربع أيادي: كل اثنين متقابلين فريق، والأسباتي ♠ دايم هو الحكم. كل يد تاخذ 13 ورقة، وكل واحد يطلب كم لمّة بياخذ (من 0 إلى 13)، وطلب الفريق مجموع طلبات اللاعبين. الصفر اسمه «نِل»: إذا ما أخذ صاحبه ولا لمّة ياخذ فريقه 100، وإذا أخذ ولو وحدة ينخصم 100. لازم تنزل من النوع الأول، وإذا ما عندك تقدر تقطع بالأسباتي. ما تبدأ بالأسباتي لين ينكسر (ينزل أسباتي على نوع ثاني) إلا إذا ما عندك غيره. إذا جاب الفريق طلبه ياخذ 10 عن كل لمّة طلبها، وكل لمّة زيادة بنقطة، وكل 10 زيادات تنخصم 100. وإذا ما جابه ينخصم 10 عن كل لمّة طلبها. أول فريق يوصل 500 يفوز، واللي ينزل إلى ‎-200 يخسر. لاعبين اثنين: كل واحد يلعب يدين فريقه. ثلاثة: اللي لحاله يلعب يدين فريقه. من 5 لاعبين: أعضاء الفريق يتناوبون على أياديه.';
GAMES.c_spades.bot=(d,s,lv)=>{if(d.ph==='sum')return c2NextTeam(d,c2spDeal);const h=d.ah,H=cardsOf(d.hands[h]);
  if(d.ph==='bid'){const e=c2Est(H,'s')+c2Lv(lv)*.7;const hiS=H.some(c=>c[1]==='s'&&c2r(c)>=10);
    if(lv>=2&&e<.7&&!hiS&&H.filter(c=>c[1]==='s').length<=3&&d.bids[(h+2)%4]!==0)return c2spBid(d,0);return c2spBid(d,Math.max(1,Math.min(13,Math.round(e))));}
  const L=c2spLegal(d,h),t=h%2,con=[t,t+2].reduce((x,y)=>x+(d.bids[y]>0?d.bids[y]:0),0),got=[t,t+2].reduce((x,y)=>x+(d.bids[y]>0?d.tw[y]:0),0);
  const nil=d.bids[h]===0,want=!nil&&!(lv===3&&got>=con&&con>0);
  return c2spPlay(d,c2BotWin(d,h,L,lv,{T:'s',str:c=>(c[1]==='s'?100:0)+c2r(c),win:tk=>c2Win(tk,'s'),mate:(a,b)=>a%2===b%2&&d.bids[b]!==0,deck:c2Deck(),want,draw:false}));};
GAMES.c_spades.botDelay=GAMES.c_tarneeb.botDelay;

/* =================================================================
   كوت: Kuwaiti plain-trick game. Up to 4 players: 4 hands of 9 (كوت بو أربعة: 6 to ace, no red sixes, two jokers);
   5 players and up: 6 hands of 9 (كوت بو ستة: the full pack and two jokers), three against three.
   Order: big joker, ace of trumps, small joker, the other trumps. Bids go once round from the dealer's right: 5 (باب),
   6, 7, 8, 9 (بوان); if all pass the dealer must take 5 (ملزوم). The buyer names the trump and leads. Jokers may be
   played on any trick; a joker may be led only after J Q K A of trumps fell, or by the buying side with 9 (either) or 8 (the big one).
   Made: the bid (بوان 36); failed: the other side takes twice the bid (ملزوم 5). 101 wins, or 51 with the other side on 0,
   or a بوان made in the first deal.
   ================================================================= */
const C2KT_RK4={s:'6789TJQKA',c:'6789TJQKA',h:'789TJQKA',d:'789TJQKA'};
const c2ktDeck=H=>H===4?[...'shdc'].flatMap(s=>[...C2KT_RK4[s]].map(r=>r+s)).concat(['XR','XB']):c2Deck().concat(['XR','XB']);
const c2ktSuit=(d,c)=>c2IsJ(c)?d.tr:c[1];
const c2ktStr=(d,c)=>c==='XR'?1000:c==='XB'?998:c[1]===d.tr?(c[0]==='A'?999:500+c2r(c)):c2r(c);
function c2ktWin(d,tk){const led=c2ktSuit(d,tk[0]);let w=-1,bv=-1;tk.forEach((c,i)=>{const s=c2ktSuit(d,c);const v=s===d.tr||c2IsJ(c)?c2ktStr(d,c):s===led?c2ktStr(d,c):-1;if(v>bv){bv=v;w=i;}});return w;}
function c2ktDeal(d){const dk=shuffle(c2ktDeck(d.H)),ah=(d.dl+1)%d.H;
  return {...d,ph:'bid',hands:[...Array(d.H)].map((_,h)=>c2Sort(dk.slice(h*9,h*9+9).join(''))),bids:Array(d.H).fill(-1),best:null,tr:null,
    t0:ah,tl:ah,tk:'',lt:null,tw:Array(d.H).fill(0),pd:'',tlog:'',sum:null,ah,turn:d.ctl[ah]};}
const C2KT_N={5:'باب',6:'ستة',7:'سبعة',8:'ثمانية',9:'بوان'};
function c2ktOpts(d){const last=d.ah===d.dl,b=d.best?d.best.v:4,o=[5,6,7,8,9].filter(v=>v>b);return last&&!d.best?o:[0,...o];}
function c2ktBid(d,v){const h=d.ah,bids=[...d.bids];bids[h]=v;let best=d.best;if(v)best={h,v,mz:h===d.dl&&!d.best&&v===5};
  const say=`${c2Name(d,h)}: ${v?C2KT_N[v]+(best.mz&&best.h===h?' (ملزوم)':''):'طاف'}`;
  if(h===d.dl)return {...d,bids,best,ph:'trump',ah:best.h,turn:d.ctl[best.h],last:say+` • ${c2Name(d,best.h)} اشترى ${C2KT_N[best.v]}`};
  const nx=(h+1)%d.H;return {...d,bids,best,ah:nx,turn:d.ctl[nx],last:say};}
function c2ktTrump(d,s){const h=d.best.h;return {...d,hands:d.hands.map(x=>c2Sort(x,s)),tr:s,ph:'play',t0:h,tl:h,ah:h,turn:d.ctl[h],last:`${c2Name(d,h)} اختار الحكم ${C2SN[s]}`};}
function c2ktLegal(d,h){const H=cardsOf(d.hands[h]),tk=cardsOf(d.tk),T=d.tr;
  if(!tk.length){const side=h%2===d.best.h%2,pd=cardsOf(d.pd),open=['A','K','Q','J'].every(r=>pd.includes(r+T));
    const ok=c=>!c2IsJ(c)||open||(side&&d.best.v===9)||(side&&d.best.v===8&&c==='XR');const L=H.filter(ok);return L.length?L:H;}
  const led=c2ktSuit(d,tk[0]),f=H.filter(c=>!c2IsJ(c)&&c[1]===led);return f.length?[...f,...H.filter(c2IsJ)]:H;}
function c2ktPlay(d,c){return c2Put(d,c,(nd,tk)=>c2ktWin(nd,tk),nd=>{const t=nd.best.h%2,got=nd.tw.reduce((x,n,h)=>x+(h%2===t?n:0),0),lost=nd.tlog.length-got;
  return got>=nd.best.v||lost>9-nd.best.v?c2ktScore(nd,got>=nd.best.v):nd;});}
function c2ktScore(d,made){const b=d.best,t=b.h%2,o=1-t,add=[0,0];if(made)add[t]=b.v===9?36:b.v;else add[o]=b.mz?5:2*b.v;
  const sc=[d.sc[0]+add[0],d.sc[1]+add[1]],nx=(d.dl+1)%d.H;
  const nd={...d,ph:'sum',sc,sum:{add,made,tr:[0,1].map(x=>d.tw.reduce((a,n,h)=>a+(h%2===x?n:0),0))},ah:nx,turn:d.ctl[nx],last:made?`${c2TeamName(d,t)} جابوا ${C2KT_N[b.v]}`:`${c2TeamName(d,t)} انكسروا`};
  if(made&&b.v===9&&d.k===0)return c2WinTeam(nd,t);
  for(const x of [0,1])if((sc[x]>=101&&sc[x]>sc[1-x])||(sc[x]>=51&&sc[1-x]===0))return c2WinTeam(nd,x);
  return nd;}
GAMES.c_kout=c2TeamGame({deal:c2ktDeal,G:{name:'كوت',lbc:'#0F6E6E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#0F6E6E"/><circle cx="50" cy="54" r="38" fill="#168383"/><g transform="rotate(-14 36 52)"><rect x="18" y="26" width="34" height="48" rx="5" fill="#fff"/><path d="M27 58c0-9 4-15 8-20 4 5 8 11 8 20z" fill="#4AB1E8"/><circle cx="35" cy="37" r="2.6" fill="#F0B429"/><rect x="26" y="57" width="18" height="4" rx="2" fill="#F0B429"/></g><g transform="rotate(12 64 52)"><rect x="48" y="26" width="34" height="48" rx="5" fill="#fff"/><text direction="ltr" x="65" y="57" font-size="22" font-weight="800" text-anchor="middle" fill="#D43C33">A♥</text></g><text direction="ltr" x="50" y="94" font-size="13" font-weight="900" text-anchor="middle" fill="#fff">بوان</text></svg>`,
  init:n=>{const H=n<=4?4:6;return c2ktDeal({H,team:1,ctl:c2Ctl(n,H,0,'',1),k:0,dl:H-1,sc:[0,0],last:''});},
  onTimeout(d){if(d.ph==='bid'){const o=c2ktOpts(d);return c2ktBid(d,o[0]);}if(d.ph==='trump')return c2ktTrump(d,'shdc'[rnd(4)]);if(d.ph==='sum')return c2NextTeam(d,c2ktDeal);
    const L=c2ktLegal(d,d.ah);return c2ktPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')return s+`${who}: الشراء${d.best?` • أعلى طلب ${C2KT_N[d.best.v]}`:''}${d.ah===d.dl&&!d.best?' (لازم تشتري)':''}`;
    if(d.ph==='trump')return s+`${who}: اختر الحكم`;if(d.ph==='play')return s+who;return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{cls:d.H>4?'kt6':'',
    head:(d,me)=>c2Head(d,me,d.tr?`حكم ${c2Su(d.tr)} <u>${C2KT_N[d.best.v]}</u>`:`<small>كوت بو ${d.H===4?'أربعة':'ستة'}</small>`),
    info:(d,k)=>d.ph==='bid'||d.ph==='trump'?(d.bids[k]>0?`<b class="c2bid">${C2KT_N[d.bids[k]]}</b>`:d.bids[k]===0?'<small>طاف</small>':''):d.ph==='sum'?'':`<b class="c2tw">${d.tw[k]}</b>${d.best&&d.best.h===k?' 👑':''}`,
    panel(d){if(d.ph==='bid')return c2Btns(c2ktOpts(d).map(v=>[v,v?C2KT_N[v]:'طاف',v?'green':'']),'bid');
      if(d.ph==='trump')return `<p class="lbl c2lb">اختر الحكم</p>`+c2Btns('shdc'.split('').map((s,i)=>[i,C2SN[s],'bsuit '+('hd'.includes(s)?'rs':'')]),'trump');},
    lastX:d=>{const t=d.best.h%2,got=d.tw.reduce((x,n,h)=>x+(h%2===t?n:0),0);return `<em>${got}/${d.best.v}</em>`;},
    canCard:d=>d.ph==='play',legal:(d,h)=>c2ktLegal(d,h),
    sum(d,ctx){const r=d.sum,t=d.best.h%2;return `<div class="panel bsum"><h3>${r.made?`${c2TeamName(d,t)} جابوا ${C2KT_N[d.best.v]} ✅`:`${c2TeamName(d,t)} انكسروا ❌`}</h3>
      <div class="bsr"><span></span><b>${c2TeamName(d,0)}</b><b>${c2TeamName(d,1)}</b></div>
      <div class="bsr"><span>اللمّات</span><em>${r.tr[0]}</em><em>${r.tr[1]}</em></div>
      <div class="bsr tot"><span>النقاط</span><em>+${r.add[0]}</em><em>+${r.add[1]}</em></div>
      <div class="bsr"><span>المجموع</span><b>${d.sc[0]}</b><b>${d.sc[1]}</b></div>
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2NextTeam(d,c2ktDeal));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='bid'&&d.ph==='bid'){if(!c2ktOpts(d).includes(i))return;act(c2ktBid(d,i));return;}
    if(a==='trump'&&d.ph==='trump'){const s='shdc'[i];if(!s)return;act(c2ktTrump(d,s));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!c2ktLegal(d,d.ah).includes(c))return;act(c2ktPlay(d,c));}}}});
HELP.c_kout='الكوت لعبة كويتية بفريقين. لين 4 لاعبين: «كوت بو أربعة» بأربع أيادي (كل اثنين متقابلين فريق) والورق من الستة للإكة بدون الستة الحمر ومعها جوكرين. من 5 لاعبين: «كوت بو ستة» بست أيادي، ثلاثة ضد ثلاثة، والكوتشينة كاملة مع جوكرين. كل يد تاخذ 9 أوراق. الشراء يبدأ من يمين الموزّع ويلف مرة وحدة: باب (5) أو ستة أو سبعة أو ثمانية أو بوان (9)، وكل طلب لازم يكون أعلى من اللي قبله، أو تقول طاف. إذا الكل طاف لازم الموزّع يشتري (ملزوم). اللي اشترى يختار الحكم ويبدأ. الترتيب: الجوكر الكبير، بعده إكة الحكم، بعدها الجوكر الصغير، وبعدها باقي الحكم. لازم تنزل من النوع الأول، والجوكر تقدر تنزله في أي لمّة. ما تبدأ بالجوكر إلا إذا نزلت الإكة والشايب والبنت والولد من الحكم، أو إذا فريقك شاري بوان (أي جوكر) أو ثمانية (الكبير بس)، وإذا بدأت فيه لازم الباقين ينزلون حكم. إذا جاب الفريق طلبه ياخذه (البوان بـ36)، وإذا انكسر ياخذ الخصم ضعف الطلب (والملزوم 5). الجولة تخلص أول ما يبان الفوز أو الكسر. يفوز اللي يوصل 101، أو 51 والخصم صفر، أو اللي يجيب بوان في أول جولة. مع لاعبين أو ثلاثة: الواحد يلعب أكثر من يد لفريقه، ومع أكثر من 6 يتناوبون على الأيادي.';
GAMES.c_kout.bot=(d,s,lv)=>{if(d.ph==='sum')return c2NextTeam(d,c2ktDeal);const h=d.ah,H=cardsOf(d.hands[h]);
  const est=T=>{let v=0;for(const c of H){if(c==='XR')v+=1;else if(c==='XB')v+=.85;else if(c[1]===T)v+=c[0]==='A'?.95:c[0]==='K'?.7:c[0]==='Q'?.5:.35;else v+=c[0]==='A'?.75:c[0]==='K'?.3:0;}
    const n=H.filter(c=>c[1]===T).length;return v+Math.max(0,n-3)*.3;};
  if(d.ph==='bid'||d.ph==='trump'){let bs='s',bv=-1;for(const x of 'shdc'){const v=est(x);if(v>bv){bv=v;bs=x;}}
    if(d.ph==='trump')return c2ktTrump(d,bs);
    const o=c2ktOpts(d),team=bv+(d.H===4?[0,2,2.2,2.3][lv]:[0,3.6,3.8,4][lv])+c2Lv(lv);const mate=d.best&&d.best.h%2===h%2;
    const pick=o.filter(v=>v>0&&v<=Math.floor(team));if(!pick.length||(mate&&pick[0]<d.best.v+2))return c2ktBid(d,o[0]);return c2ktBid(d,pick[0]);}
  const L=c2ktLegal(d,h);
  return c2ktPlay(d,c2BotWin(d,h,L,lv,{T:d.tr,suit:c=>c2ktSuit(d,c),str:c=>{const v=c2ktStr(d,c);return c2ktSuit(d,c)===d.tr?v+2000:v;},win:tk=>c2ktWin(d,tk),mate:(a,b)=>a%2===b%2,deck:c2ktDeck(d.H),draw:d.best.h%2===h%2}));};
GAMES.c_kout.botDelay=GAMES.c_tarneeb.botDelay;

/* ---------- shared parts of the games scored hand by hand (hearts, trix, estimation) ---------- */
const c2HeadMid=mid=>`<div class="bsc c2sc"><span class="bmode" style="flex:1;justify-content:center">${mid}</span></div>`;
// the score of every seat: the hands it plays (one hand each, or a team's sum)
const c2SeatPts=(d,arr)=>d.pl.map((_,s)=>d.team?arr.reduce((x,v,h)=>x+(h%2===s%2?v:0),0):arr[s]);
// the end: in a partnership the team with the better sum, else the best hand (several on a tie)
function c2EndBy(d,arr,low){if(d.team){const t=[0,1].map(x=>arr.reduce((a,v,h)=>a+(h%2===x?v:0),0));if(t[0]===t[1])return null;return c2WinTeam(d,(low?t[0]<t[1]:t[0]>t[1])?0:1);}
  const al=d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1');const b=low?Math.min(...al.map(s=>arr[s])):Math.max(...al.map(s=>arr[s]));const ws=al.filter(s=>arr[s]===b);return {...d,win:ws[0],wins:ws};}
// a card selection kept on this phone for one prompt (S.sel: the prompt's key, then the chosen cards)
const c2SelKey=d=>[d.gid,d.k,d.ah,d.ph].join(':');
const c2Sel=d=>Array.isArray(S.sel)&&S.sel[0]===c2SelKey(d)?S.sel.slice(1).filter(c=>cardsOf(d.hands[d.ah]).includes(c)):[];
function c2Toggle(d,c,max){let s=c2Sel(d);s=s.includes(c)?s.filter(x=>x!==c):s.length<max?[...s,c]:s;S.sel=[c2SelKey(d),...s];render();}
function c2IndGame(o){return {cat:'cards',teams:o.teams||'none',
  onSkip:nd=>{if(nd.win!=null)return nd;if(nd.team){for(const t of [0,1])if(!nd.pl.some((_,s)=>s%2===t&&nd.out[s]!=='1'))return c2WinTeam(nd,1-t);}
    const ctl=c2Fix(nd);if(!ctl)return nd;return {...nd,ctl,turn:ctl[nd.ah]};},
  mask:(d,v)=>c2Mask(d,v),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  ...o};}
/* the bot for games where points are to be avoided: o.pen(c) what a card costs its taker, o.tp what a trick costs,
   o.mine(c) a doubled card this hand would like someone else to take */
function c2BotAvoid(d,h,L,lv,o){if(L.length===1)return L[0];if(Math.random()<[0,.4,.1,0][lv])return L[rnd(L.length)];
  const tk=cardsOf(d.tk),pos=tk.length,H=d.H,me=cardsOf(d.hands[h]),pen=o.pen,tp=o.tp||0;
  const seen=new Set([...cardsOf(d.pd),...me]),unseen=(o.deck||c2Deck()).filter(c=>!seen.has(c));
  const lowR=a=>a.slice().sort((x,y)=>c2r(x)-c2r(y))[0],highR=a=>a.slice().sort((x,y)=>c2r(y)-c2r(x)||pen(y)-pen(x))[0];
  const len=s=>me.filter(c=>c[1]===s).length;
  if(!pos){// lead: a low card nobody has to go under, from a suit where the dangerous cards are not mine
    const sc=c=>{const s=c[1],under=unseen.filter(u=>u[1]===s&&c2r(u)<c2r(c)).length,over=unseen.filter(u=>u[1]===s&&c2r(u)>c2r(c)).length;
      return (over?0:30)+under*2-over*.5+pen(c)*3+(lv>=2&&o.risk?o.risk(c,unseen):0)+(len(s)<=2?-1.5:0);};
    return L.slice().sort((a,b)=>sc(a)-sc(b))[0];}
  const led=tk[0][1],follow=me.some(c=>c[1]===led);
  const pts=tk.reduce((x,c)=>x+pen(c),0)+tp;
  if(follow){const top=tk.filter(c=>c[1]===led).reduce((a,c)=>c2r(c)>c2r(a)?c:a,tk[0]);
    const under=L.filter(c=>c2r(c)<c2r(top));
    if(under.length)return under.slice().sort((a,b)=>pen(b)-pen(a)||c2r(b)-c2r(a))[0];
    // every card wins: the last player takes it with the biggest card when it costs little, else the smallest
    if(pos===H-1&&pts+Math.max(...L.map(pen))<=(lv===3?4:8))return highR(L.filter(c=>!pen(c)).length?L.filter(c=>!pen(c)):L);
    const safe=L.filter(c=>!pen(c));return lowR(safe.length?safe:L);}
  // out of the suit: unload the costliest card (a doubled one of mine first), then the highest
  return L.slice().sort((a,b)=>(o.mine&&o.mine(b)?50:0)-(o.mine&&o.mine(a)?50:0)||pen(b)-pen(a)||c2r(b)-c2r(a)||len(a[1])-len(b[1]))[0];}

/* =================================================================
   القلوب (hearts): every heart costs 1 and the queen of spades 13; lowest total when someone reaches 100 wins.
   3 to 8 players one hand each (low diamonds and clubs are taken out so the pack shares evenly); 2 players play
   two hands each as partners. Before each deal 3 cards are passed (right, left, across with 4 hands, then a deal without).
   The lowest club leads the first trick, where no points may be thrown; hearts may not be led before one was thrown.
   Taking all 26 (shooting the moon) gives 26 to every other hand instead.
   ================================================================= */
const C2HT_RM=['2d','2c','3d','3c','4d','4c','5d'];
const c2htDeck=H=>{const k=52%H;return c2Deck().filter(c=>!C2HT_RM.slice(0,k).includes(c));};
const c2htPen=c=>c[1]==='h'?1:c==='Qs'?13:0;
const c2htCyc=H=>H===4?[1,3,2,0]:[1,H-1,0];
const c2htDir=(H,o)=>o===0?'بدون تمرير':o===1?'تمرير لليمين':o===H-1?'تمرير لليسار':'تمرير للي قدامك';
function c2htDeal(d){const H=d.H,dk=shuffle(c2htDeck(H)),m=dk.length/H,off=c2htCyc(H)[d.k%c2htCyc(H).length],ah=(d.dl+1)%H;
  const nd={...d,hands:[...Array(H)].map((_,h)=>c2Sort(dk.slice(h*m,h*m+m).join(''))),off,ps:Array(H).fill(''),tk:'',lt:null,tw:Array(H).fill(0),pd:'',tlog:'',
    pts:Array(H).fill(0),brk:false,sum:null,ah,tl:ah,t0:ah,turn:d.ctl[ah]};
  return off?{...nd,ph:'pass'}:c2htStart(nd);}
function c2htLow(d){for(const r of C2R){const c=r+'c';const h=d.hands.findIndex(x=>cardsOf(x).includes(c));if(h>=0)return [c,h];}return ['',0];}
function c2htStart(d){const [c,h]=c2htLow(d);return {...d,ph:'play',ah:h,tl:h,t0:h,lc:c,turn:d.ctl[h]};}
function c2htPass(d,cs){const h=d.ah,ps=[...d.ps];ps[h]=cs.join('');const hands=[...d.hands];hands[h]=cs.reduce((x,c)=>c2Rm(x,c),hands[h]);
  let nd={...d,ps,hands,last:`${c2Name(d,h)} اختار أوراقه`};const nx=(h+1)%d.H;
  if(ps.every(x=>x.length===6)){const hs=[...hands];ps.forEach((x,k)=>{const to=(k+d.off)%d.H;hs[to]=c2Sort(hs[to]+x);});
    return c2htStart({...nd,hands:hs,ps:Array(d.H).fill(''),last:'تبادلتوا الأوراق'});}
  return {...nd,ah:nx,turn:d.ctl[nx]};}
function c2htLegal(d,h){const H=cardsOf(d.hands[h]),tk=cardsOf(d.tk),first=!d.tlog.length;
  if(!tk.length){if(first&&H.includes(d.lc))return [d.lc];if(d.brk)return H;const nh=H.filter(c=>c[1]!=='h');return nh.length?nh:H;}
  const f=H.filter(c=>c[1]===tk[0][1]);if(f.length)return f;
  if(first){const ok=H.filter(c=>!c2htPen(c));if(ok.length)return ok;}return H;}
function c2htPlay(d,c){const brk=d.brk||c[1]==='h';return c2Put({...d,brk},c,(nd,tk)=>c2Win(tk,null),(nd,w,tk)=>{const pts=[...nd.pts];pts[w]+=tk.reduce((x,y)=>x+c2htPen(y),0);
  nd={...nd,pts};return cardsOf(nd.hands[0]).length?nd:c2htScore(nd);});}
function c2htScore(d){let add=[...d.pts];const moon=add.findIndex(x=>x===26);if(moon>=0)add=add.map((x,h)=>h===moon?0:26);
  const sc=d.sc.map((x,h)=>x+add[h]),nx=(d.dl+1)%d.H;
  let nd={...d,ph:'sum',sc,sum:{add,moon},ah:nx,turn:d.ctl[nx],last:moon>=0?`${c2Name(d,moon)} أخذ كل النقاط! 🌙`:'انتهت الجولة'};
  if(sc.some(x=>x>=100)){const w=c2EndBy(nd,sc,true);if(w)return w;}
  return nd;}
function c2htNext(d){const k=d.k+1;return {...c2htDeal({...d,k,dl:(d.dl+1)%d.H,ctl:d.team?c2Ctl(d.pl.length,d.H,k,d.out,1):d.ctl}),last:''};}
GAMES.c_hearts=c2IndGame({name:'القلوب',lbc:'#B23A5A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B23A5A"/><circle cx="50" cy="52" r="38" fill="#C44D6C"/><path transform="translate(38 46) scale(4.4)" d="${SUITP.h}" fill="#fff"/><g transform="rotate(14 66 58)"><rect x="50" y="34" width="32" height="46" rx="5" fill="#fff"/><text direction="ltr" x="66" y="63" font-size="20" font-weight="800" text-anchor="middle" fill="#2D4763">Q♠</text></g></svg>`,
  init:n=>{const team=n===2?1:0,H=team?4:n;return c2htDeal({H,team,ctl:c2Ctl(n,H,0,'',team),k:0,dl:H-1,sc:Array(H).fill(0),last:''});},
  start:(d,base)=>({...d,turn:base.turn}),
  redeal:d=>d.win!=null||d.ph==='sum'?d:{...c2htDeal(d),last:'انعادت التوزيعة من جديد'},
  points:d=>c2SeatPts(d,d.sc),
  winText:d=>d.win!=null?`فاز ${d.wt!=null&&d.team?'فريق '+c2TeamName(d,d.wt):(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بأقل نقاط`:null,
  onTimeout(d){if(d.ph==='sum')return c2htNext(d);if(d.ph==='pass')return c2htPass(d,cardsOf(d.hands[d.ah]).slice(-3));const L=c2htLegal(d,d.ah);return c2htPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='pass')return s+`${who}: اختر 3 أوراق (${c2htDir(d.H,d.off)})`;if(d.ph==='play')return s+who+(!d.tlog.length&&!d.tk?' <small>• ابدأ بأصغر سباتي</small>':'');return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{
    head:(d,me)=>c2HeadMid(`${c2Su('h')} <small>${d.ph==='pass'?c2htDir(d.H,d.off):d.brk?'القلوب انكسرت':'القلوب مقفلة'}</small>`),
    info:(d,k)=>d.ph==='sum'?'':`${d.ps[k]&&d.ph==='pass'?'<small>✓</small>':''}<b class="c2pt ${d.pts[k]?'bad':''}">${d.pts[k]}</b>`,
    panel(d,ctx,me){if(d.ph!=='pass')return '';const n=c2Sel(d).length;return `<p class="lbl c2lb">اختر 3 أوراق تمرّرها (${c2htDir(d.H,d.off)})</p><div class="row bopts"><button class="btn green" data-ga="pass" ${n===3?'':'disabled'}>مرّر (${n}/3)</button></div>`;},
    canCard:d=>d.ph==='play'||d.ph==='pass',legal:(d,h)=>d.ph==='pass'?cardsOf(d.hands[h]):c2htLegal(d,h),sel:d=>d.ph==='pass'?c2Sel(d).map(c=>cardsOf(d.hands[d.ah]).indexOf(c)):null,
    lastX:d=>{const p=d.lt.c.reduce((x,c)=>x+c2htPen(c),0);return p?`<em style="color:var(--bad)">+${p}</em>`:'';},
    sum(d,ctx){const r=d.sum;return `<div class="panel bsum"><h3>${r.moon>=0?`${c2Name(d,r.moon)} صاد القمر 🌙`:'نقاط الجولة'}</h3>${[...Array(d.H)].map((_,h)=>`<div class="bsr"><span>${c2Name(d,h)}</span><em>+${r.add[h]}</em><b>${d.sc[h]}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2htNext(d));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;const h=d.ah;
    if(a==='card'&&d.ph==='pass'){const c=cardsOf(d.hands[h])[i];if(c)c2Toggle(d,c,3);return;}
    if(a==='pass'&&d.ph==='pass'){const cs=c2Sel(d);if(cs.length!==3)return;S.sel=[];act(c2htPass(d,cs));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[h])[i];if(!c||!c2htLegal(d,h).includes(c))return;act(c2htPlay(d,c));}}});
HELP.c_hearts='الهدف تتجنب النقاط: كل ورقة قلب (كبة) بنقطة، وبنت الأسباتي Q♠ بـ13 نقطة. الورق يتوزع كله بالتساوي (مع 3 لاعبين وأكثر من 4 تنشال كم ورقة ديناري وسباتي صغيرة). قبل كل جولة تختار 3 أوراق تمرّرها: مرة لليمين ومرة لليسار ومرة للي قدامك (مع 4 أيادي)، وجولة بدون تمرير. اللي معه أصغر سباتي يبدأ فيه، وفي أول لمّة ما تنرمى قلوب ولا بنت الأسباتي. لازم تنزل من النوع الأول، وإذا ما عندك ترمي اللي تبي. ما تبدأ بالقلوب لين ينرمى قلب (إلا إذا ما عندك غيرها). أعلى ورقة من النوع الأول تاخذ اللمّة ونقاطها. اللي ياخذ كل الـ26 نقطة «يصيد القمر»: ياخذ صفر والباقين كل واحد 26. لما يوصل أحد 100 تخلص اللعبة ويفوز صاحب أقل نقاط. لاعبين اثنين: كل واحد يلعب يدين متقابلة ونقاطهم تنجمع.';
GAMES.c_hearts.bot=(d,s,lv)=>{if(d.ph==='sum')return c2htNext(d);const h=d.ah,H=cardsOf(d.hands[h]);
  if(d.ph==='pass'){// the queen and the big spades, high hearts, and what empties a short suit
    const sp=H.filter(c=>c[1]==='s').length;const cost=c=>(c==='Qs'?60:0)+((c==='As'||c==='Ks')&&!H.includes('Qs')&&sp<4?40:0)+(c[1]==='h'?10+c2r(c)*2:0)+c2r(c)*2+(H.filter(x=>x[1]===c[1]).length<=2&&c[1]!=='s'?15:0)+(lv===1?Math.random()*40:0);
    return c2htPass(d,H.slice().sort((a,b)=>cost(b)-cost(a)).slice(0,3));}
  const L=c2htLegal(d,h);
  return c2htPlay(d,c2BotAvoid(d,h,L,lv,{pen:c2htPen,win:tk=>c2Win(tk,null),deck:c2htDeck(d.H),risk:(c,un)=>c[1]==='s'&&c2r(c)>=10&&un.includes('Qs')?20:c==='Qs'?60:0}));};
GAMES.c_hearts.botDelay=(d,s,lv)=>d.ph==='sum'?7000:650+rnd(600);

/* =================================================================
   تركس: four hands, four kingdoms of five deals. The kingdom's owner (first the holder of 7♥) deals and chooses, once each,
   one of: ملك الكبة (K♥ -75), البنات (each queen -25), الديناري (each diamond -10), اللطش (each trick -15) and تركس
   (lay out from the jacks up and down; out first +200, then 150, 100, 50). In the king and queens the holder may double
   the card: its taker loses double and the holder gains the single value (taking one's own: -double and the trick's leader
   gains, unless the holder led it). Hearts may not be led in the king deal before only hearts remain.
   4 players alone (or 2 teams of 2 with teams on); other counts play as two teams of opposite hands.
   ================================================================= */
const C2TX_K=['K','Q','D','L','T'],TX_N={K:'ملك الكبة',Q:'البنات',D:'الديناري',L:'اللطش',T:'تركس'};
const c2txPen=(k,c)=>k==='K'?(c==='Kh'?75:0):k==='Q'?(c[0]==='Q'?25:0):k==='D'?(c[1]==='d'?10:0):0;
function c2txDeal(d){const dk=shuffle(c2Deck()),hands=[0,1,2,3].map(h=>c2Sort(dk.slice(h*13,h*13+13).join('')));
  let ow=d.ow;if(ow==null||ow<0)ow=hands.findIndex(x=>cardsOf(x).includes('7h'));
  return {...d,ow,ph:'pick',hands,ct:null,dbl:'',tk:'',lt:null,tw:[0,0,0,0],pd:'',tlog:'',pts:[0,0,0,0],lay:[-1,-1,-1,-1,-1,-1,-1,-1],fin:'',sum:null,
    ah:ow,tl:ow,t0:ow,turn:d.ctl[ow]};}
const c2txLeft=d=>C2TX_K.filter(k=>!(d.used[d.ow]||'').includes(k));
// doubling goes round from the owner: each hand that holds the king (or a queen) says which to double
function c2txPick(d,k){const used=[...d.used];used[d.ow]=(used[d.ow]||'')+k;let nd={...d,used,ct:k,last:`${c2Name(d,d.ow)} اختار ${TX_N[k]}`};
  if(k==='T')return c2txTNext({...nd,ph:'trix'},(d.ow+3)%4);
  if(k==='K'||k==='Q')return c2txDblNext({...nd,ph:'dbl',dq:0},-1);
  return {...nd,ph:'play',ah:d.ow,tl:d.ow,t0:d.ow,turn:d.ctl[d.ow]};}
const c2txDblCards=(d,h)=>cardsOf(d.hands[h]).filter(c=>d.ct==='K'?c==='Kh':c[0]==='Q');
function c2txDblNext(d,from){for(let j=from+1;j<4;j++){const h=(d.ow+j)%4;if(c2txDblCards(d,h).length)return {...d,dq:j,ah:h,turn:d.ctl[h]};}
  return {...d,ph:'play',dq:-1,ah:d.ow,tl:d.ow,t0:d.ow,turn:d.ctl[d.ow]};}
function c2txDbl(d,cs){const h=d.ah;const own=c2txDblCards(d,h);cs=cs.filter(c=>own.includes(c));
  const nd={...d,dbl:d.dbl+cs.map(c=>c+h).join(''),last:cs.length?`${c2Name(d,h)} كبّر ${cs.map(c=>c[0]==='K'?'الشايب':'البنت '+C2SN[c[1]]).join(' و')}`:`${c2Name(d,h)} ما كبّر`};
  return c2txDblNext(nd,d.dq);}
// who doubled card c (or -1): stored as card + hand digit
const c2txDblBy=(d,c)=>{const m=(d.dbl||'').match(/.{3}/g)||[];const x=m.find(z=>z.slice(0,2)===c);return x?+x[2]:-1;};
function c2txLegal(d,h){const H=cardsOf(d.hands[h]),tk=cardsOf(d.tk);if(tk.length)return c2Follow(d.hands[h],tk);
  if(d.ct==='K'){const nh=H.filter(c=>c[1]!=='h');return nh.length?nh:H;}return H;}
function c2txPlay(d,c){return c2Put(d,c,(nd,tk)=>c2Win(tk,null),(nd,w,tk)=>{const pts=[...nd.pts],k=nd.ct,L=nd.lt.f;
  if(k==='L')pts[w]-=15;
  for(const x of tk){const p=c2txPen(k,x);if(!p)continue;const by=c2txDblBy(nd,x);
    if(by<0){pts[w]-=p;continue;}
    if(by!==w){pts[w]-=2*p;pts[by]+=p;}else if(L===w&&tk[0]===x){pts[w]-=p;}else{pts[w]-=2*p;pts[L]+=p;}}
  nd={...nd,pts};const pd=cardsOf(nd.pd);
  const over=k==='K'?pd.includes('Kh'):k==='Q'?pd.filter(x=>x[0]==='Q').length===4:k==='D'?pd.filter(x=>x[1]==='d').length===13:nd.tlog.length===13;
  return over?c2txScore(nd):nd;});}
// trix layout: lay holds for each suit the lowest and highest rank out (-1 before its jack)
const c2txCan=(d,c)=>{const s='shdc'.indexOf(c[1]),lo=d.lay[s*2],hi=d.lay[s*2+1],r=c2r(c);return lo<0?c[0]==='J':r===hi+1||r===lo-1;};
const c2txTLegal=(d,h)=>cardsOf(d.hands[h]).filter(c=>c2txCan(d,c));
function c2txTNext(d,from){// the next hand that still holds cards; one with no move passes by itself
  const msg=[];for(let j=1;j<=4;j++){const h=(from+j)%4;if(!cardsOf(d.hands[h]).length)continue;if(c2txTLegal(d,h).length)return {...d,ah:h,turn:d.ctl[h],last:[d.last,...msg].filter(Boolean).join(' • ')};msg.push(`${c2Name(d,h)} مرّر`);}
  return d;}
function c2txTPlay(d,c){const h=d.ah,s='shdc'.indexOf(c[1]),lay=[...d.lay],r=c2r(c);if(lay[s*2]<0){lay[s*2]=r;lay[s*2+1]=r;}else if(r>lay[s*2+1])lay[s*2+1]=r;else lay[s*2]=r;
  const hands=[...d.hands];hands[h]=c2Rm(hands[h],c);const nd={...d,hands,lay,pd:d.pd+c,last:`${c2Name(d,h)} نزّل ${c[0]==='T'?'10':c[0]}${C2SN[c[1]]}`};
  if(!cardsOf(hands[h]).length){nd.fin=nd.fin+h;nd.last+=` وخلّص ${['أول','ثاني','ثالث'][nd.fin.length-1]||''}`;}
  if(nd.fin.length>=3){const last=[0,1,2,3].find(x=>!nd.fin.includes(String(x)));nd.fin+=last;const pts=[0,0,0,0];[200,150,100,50].forEach((p,i)=>pts[+nd.fin[i]]+=p);return c2txScore({...nd,pts});}
  return c2txTNext(nd,h);}
function c2txScore(d){const sc=d.sc.map((x,h)=>x+d.pts[h]);const deals=d.used.reduce((x,u)=>x+(u||'').length,0);
  const nd={...d,ph:'sum',sc,sum:{add:[...d.pts],ct:d.ct},ah:d.ow,turn:d.ctl[d.ow],last:`خلص ${TX_N[d.ct]}`};
  if(deals>=20){const w=c2EndBy(nd,sc,false);return w||{...nd,sum:{...nd.sum,tie:1}};}
  return nd;}
// after the fifth deal of a kingdom the next owner (to the right) takes over; a tie after 20 deals plays one more kingdom
function c2txNext(d){let ow=d.ow,used=d.used;if((used[ow]||'').length>=5)ow=(ow+1)%4;const k=d.k+1;
  if(used.every(u=>(u||'').length>=5))used=['','','',''];
  return {...c2txDeal({...d,ow,used,k,ctl:d.team?c2Ctl(d.pl.length,4,k,d.out,1):d.ctl}),last:''};}
function c2txLayHTML(d){return `<div class="trx-lay">${'shdc'.split('').map((s,i)=>{const lo=d.lay[i*2],hi=d.lay[i*2+1];
  return `<div class="trx-row"><em class="${'hd'.includes(s)?'rs':''}">${C2SN[s]}</em><span class="lc">${lo<0?'':C2R.slice(lo,hi+1).split('').map(r=>miniCard(r+s).replace('<div class="card','<div data-k="'+r+s+'" class="card')).join('')}</span></div>`;}).join('')}
  ${d.fin?`<div class="trx-fin">${d.fin.split('').map((h,i)=>`<span>${i+1}. ${c2Name(d,+h)}</span>`).join('')}</div>`:''}</div>`;}
GAMES.c_trix=c2IndGame({name:'تركس',lbc:'#5B3A8C',teams:'native',teamsOk:z=>z.length===2&&Math.abs(z[0]-z[1])<=1,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5B3A8C"/><circle cx="50" cy="50" r="40" fill="#6C4AA0"/>${['s','h','d','c'].map((s,i)=>`<g transform="translate(${11+i*20} ${26+(i%2)*6})"><rect width="18" height="26" rx="3" fill="#fff"/><text direction="ltr" x="9" y="18" font-size="13" font-weight="800" text-anchor="middle" fill="${'hd'.includes(s)?'#D43C33':'#2D4763'}">J</text></g>`).join('')}<path d="M26 78l6-10 6 7 6-11 6 11 6-7 6 10z" fill="#F0B429"/><rect x="26" y="78" width="48" height="6" rx="2" fill="#E09E14"/></svg>`,
  init:n=>{const team=n!==4?1:0;return c2txDeal({H:4,team,ctl:c2Ctl(n,4,0,'',team),k:0,ow:-1,used:['','','',''],sc:[0,0,0,0],last:''});},
  start:(d,base)=>{const team=d.pl.length!==4||!!d.tm?1:0;return {...d,team,turn:base.turn};},
  redeal:d=>{if(d.win!=null||d.ph==='sum')return d;const used=[...d.used];if(d.ct)used[d.ow]=used[d.ow].replace(d.ct,'');return {...c2txDeal({...d,used}),last:'انعادت التوزيعة من جديد'};},
  points:d=>c2SeatPts(d,d.sc),
  winText:d=>d.win!=null?`فاز ${d.team&&d.wt!=null?'فريق '+c2TeamName(d,d.wt):(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بعد 4 ممالك`:null,
  onTimeout(d){if(d.ph==='sum')return c2txNext(d);if(d.ph==='pick'){const l=c2txLeft(d);return c2txPick(d,l[rnd(l.length)]);}if(d.ph==='dbl')return c2txDbl(d,[]);
    if(d.ph==='trix'){const L=c2txTLegal(d,d.ah);return c2txTPlay(d,L[rnd(L.length)]);}const L=c2txLegal(d,d.ah);return c2txPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='pick')return s+`${who}: اختر لعبة من مملكتك`;if(d.ph==='dbl')return s+`${who}: تكبّر؟`;if(d.ph==='sum')return s+'انتهت الجولة';
    return s+who+` <small>• ${TX_N[d.ct]}</small>`;},
  render(d,ctx){return c2Frame(d,ctx,{
    head:d=>c2HeadMid(`👑 ${c2Name(d,d.ow)} <small>${d.ct?TX_N[d.ct]:'يختار'} • لعبة ${Math.max(1,(d.used[d.ow]||'').length)} من 5 • ${d.used.reduce((x,u)=>x+(u||'').length,0)||1}/20</small>`),
    info:(d,k)=>{if(d.ph==='sum'||d.ph==='pick')return k===d.ow?'<small>👑</small>':'';const db=(d.dbl.match(/.{3}/g)||[]).filter(x=>+x[2]===k).map(x=>x.slice(0,2));
      return `${db.length?`<span class="trx-dbl">${db.map(miniCard).join('')}</span>`:''}${d.ph==='trix'?'':`<b class="c2pt ${d.pts[k]<0?'bad':''}">${d.pts[k]}</b>`}`;},
    center:d=>d.ph==='trix'?c2txLayHTML(d):d.ph==='pick'||d.ph==='dbl'?'':null,
    panel(d){if(d.ph==='pick'){const l=c2txLeft(d);return `<div class="trx-k">${C2TX_K.map((k,i)=>`<button class="btn ${l.includes(k)?'navy':'done'}" data-ga="pick" data-i="${i}" ${l.includes(k)?'':'disabled'}>${TX_N[k]}</button>`).join('')}</div>`;}
      if(d.ph==='dbl'){const own=c2txDblCards(d,d.ah),sel=c2Sel(d);return `<p class="lbl c2lb">تكبّر ${d.ct==='K'?'الشايب':'البنات'}؟ اللي ياخذ الورقة المكبّرة تنخصم منه ضعف، وأنت تاخذ قيمتها</p><div class="row bopts">${own.map((c,i)=>`<button class="btn ${sel.includes(c)?'red':''}" data-ga="dsel" data-i="${i}">${c[0]==='K'?'الشايب':'البنت'} ${C2SN[c[1]]}</button>`).join('')}<button class="btn green" data-ga="dok">${sel.length?'كبّر':'لا، كمّل'}</button></div>`;}},
    canCard:d=>d.ph==='play'||d.ph==='trix',legal:(d,h)=>d.ph==='trix'?c2txTLegal(d,h):c2txLegal(d,h),
    lastX:d=>{const p=d.lt.c.reduce((x,c)=>x+c2txPen(d.ct,c),0)+(d.ct==='L'?15:0);return p?`<em style="color:var(--bad)">‎-${p}</em>`:'';},
    sum(d,ctx){const r=d.sum;return `<div class="panel bsum"><h3>${TX_N[r.ct]}${r.tie?' • تعادل، نكمل':''}</h3>${[0,1,2,3].map(h=>`<div class="bsr"><span>${c2Name(d,h)}</span><em>${r.add[h]>0?'+':''}${r.add[h]}</em><b>${d.sc[h]}</b></div>`).join('')}
      ${d.team?`<div class="bsr tot"><span>الفرق</span><em>${d.sc[0]+d.sc[2]}</em><em>${d.sc[1]+d.sc[3]}</em></div>`:''}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2txNext(d));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;const h=d.ah;
    if(a==='pick'&&d.ph==='pick'){const k=C2TX_K[i];if(!k||!c2txLeft(d).includes(k))return;act(c2txPick(d,k));return;}
    if(a==='dsel'&&d.ph==='dbl'){const c=c2txDblCards(d,h)[i];if(c)c2Toggle(d,c,4);return;}
    if(a==='dok'&&d.ph==='dbl'){const cs=c2Sel(d);S.sel=[];act(c2txDbl(d,cs));return;}
    if(a==='card'&&d.ph==='trix'){const c=cardsOf(d.hands[h])[i];if(!c||!c2txCan(d,c))return;act(c2txTPlay(d,c));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[h])[i];if(!c||!c2txLegal(d,h).includes(c))return;act(c2txPlay(d,c));}}});
HELP.c_trix='أربع أيادي، كل يد 13 ورقة. اللعبة 4 ممالك، وكل مملكة 5 جولات: صاحب المملكة (أول واحد اللي عنده 7 كبة، وبعده اللي على يمينه) يختار كل جولة لعبة ما لعبها قبل: ملك الكبة (اللي ياخذ الشايب ♥ ينخصم منه 75)، البنات (كل بنت ‎-25)، الديناري (كل ورقة ديناري ‎-10)، اللطش (كل لمّة ‎-15)، والتركس. في الألعاب الأربع الأولى صاحب المملكة يبدأ، ولازم تنزل من النوع الأول، وأعلى ورقة منه تاخذ اللمّة. في ملك الكبة ما تبدأ بالكبة إلا إذا ما عندك غيرها، والجولة تخلص أول ما ينوكل الشايب (والبنات أول ما تنوكل الأربع، والديناري أول ما تخلص الديناري). في ملك الكبة والبنات تقدر «تكبّر» ورقتك قبل اللعب: اللي ياخذها تنخصم منه ضعف وأنت تاخذ قيمتها (ولو أخذتها أنت تنخصم ضعف وياخذ قيمتها اللي بدأ اللمّة، إلا إذا أنت اللي بديت فيها). التركس: تبدأ الصفوف من الولد (J) وتكمل فوق وتحت بالترتيب، ولو ما عندك ورقة تنفع تمرّر. أول من يخلص ورقه ياخذ 200، والثاني 150، والثالث 100، والأخير 50. بعد 20 جولة يفوز صاحب أعلى مجموع. مع 4 لاعبين كل واحد لحاله (أو فريقين لو شغلتوا الفرق)، ومع غيرها يلعبون فريقين: كل اثنين متقابلين فريق ونقاطهم تنجمع.';
GAMES.c_trix.bot=(d,s,lv)=>{if(d.ph==='sum')return c2txNext(d);const h=d.ah,H=cardsOf(d.hands[h]);
  const by=x=>H.filter(c=>c[1]===x);
  if(d.ph==='pick'){const l=c2txLeft(d);if(lv===1)return c2txPick(d,l[rnd(l.length)]);
    const hi=c=>c2r(c)>=9;const risk={K:H.includes('Kh')?(by('h').length>=5?20:75):by('h').filter(hi).length*4+10,
      Q:H.filter(c=>c[0]==='Q').reduce((x,c)=>x+(by(c[1]).length>=5?6:25),0)+12,
      D:by('d').filter(hi).length*14+by('d').length*4,L:H.filter(hi).length*11,T:-(H.filter(c=>c[0]==='J').length*25+H.filter(c=>Math.abs(c2r(c)-9)<=2).length*8)+40};
    return c2txPick(d,l.slice().sort((a,b)=>risk[a]-risk[b])[0]);}
  if(d.ph==='dbl'){const own=c2txDblCards(d,h);return c2txDbl(d,lv===1?[]:own.filter(c=>by(c[1]).length>=(lv===3?5:6)));}
  if(d.ph==='trix'){const L=c2txTLegal(d,h);if(L.length===1||lv===1)return c2txTPlay(d,L[rnd(L.length)]);
    // play the card that keeps my own runs going and opens the least for the others
    const sc=c=>{const r=c2r(c),s=c[1],up=r>=9;let v=0;const nxt=up?r+1:r-1;if(nxt>=0&&nxt<13&&H.includes(C2R[nxt]+s))v+=6;
      if(c[0]==='J')v+=H.filter(x=>x[1]===s).length*2-4;v+=Math.abs(r-9)*.6;return v+(lv===2?Math.random()*3:0);};
    return c2txTPlay(d,L.slice().sort((a,b)=>sc(b)-sc(a))[0]);}
  const L=c2txLegal(d,h),k=d.ct;
  return c2txPlay(d,c2BotAvoid(d,h,L,lv,{pen:c=>c2txPen(k,c),tp:k==='L'?15:0,win:tk=>c2Win(tk,null),mine:c=>c2txDblBy(d,c)===h,
    risk:(c,un)=>k==='K'&&c[1]==='h'&&un.includes('Kh')?3:k==='K'&&c==='Kh'?80:k==='Q'&&c[0]==='Q'?30:k==='D'&&c[1]==='d'?c2r(c):0}));};
GAMES.c_trix.botDelay=(d,s,lv)=>d.ph==='sum'?7000:d.ph==='pick'?1200:650+rnd(600);

/* =================================================================
   استيميشن (Egyptian estimation): each plays alone and must take exactly the tricks he estimated.
   Normal rounds: a call round from the dealer's right (pass, «داش» = zero at no trumps, at most two, or a call of tricks
   and a trump; a call beats a lower number, or the same number in a higher suit: no trumps, ♠, ♥, ♦, ♣). The best caller
   names the trump; the others then estimate in turn, never above his call, and the last one («المخاطر») may not make the
   total equal the tricks. Speed rounds: trumps fixed (no trumps, ♠, ♥, ♦, ♣) and everyone estimates.
   Score: exact = the estimate plus a bonus (caller 20, «مع» 20, risk 20 / 30 / 40, others 10), missed = minus the
   difference minus a penalty (caller 10, «مع» 20, risk 10 / 20 / 30); dash ±23; only one exact +10; the only one who
   missed -10; an estimate of 8 or more doubles the round; a round nobody hits scores nothing and doubles the next one.
   Full game 18 rounds (13 + 5 speed), short 8 (5 + 3). Cards: 13 each up to 4 players, then the pack shared out.
   ================================================================= */
const C2ES_SU=['n','s','h','d','c'];                       // high to low; n = no trumps
const c2esTr=x=>x==='n'?null:x;
const c2esT=H=>Math.min(13,Math.floor(52/H));
const c2esMin=T=>Math.max(1,Math.ceil(T*4/13));
const c2esNum=c=>c?c.v*5+(4-C2ES_SU.indexOf(c.s)):-1;
const c2esSuN=s=>s==='n'?'صن':C2SN[s];
function c2esDeal(d){const H=d.H,T=c2esT(H),dk=shuffle(c2Deck()),ah=(d.dl+1)%H,speed=d.r>d.nr;
  const nd={...d,T,hands:[...Array(H)].map((_,h)=>c2Sort(dk.slice(h*T,h*T+T).join(''))),call:Array(H).fill(-1),cs:Array(H).fill(''),best:null,est:Array(H).fill(-1),
    tr:null,trs:'',hb:-1,risk:-1,tk:'',lt:null,tw:Array(H).fill(0),pd:'',tlog:'',sum:null,ah,tl:ah,t0:ah,turn:d.ctl[ah],eo:''};
  if(speed){const s=C2ES_SU[(d.r-d.nr-1)%5];return {...nd,ph:'est',trs:s,tr:c2esTr(s),hands:nd.hands.map(x=>c2Sort(x,c2esTr(s))),eo:[...Array(H)].map((_,j)=>(ah+j)%H).join(''),ei:0};}
  return {...nd,ph:'call'};}
const c2esDash=d=>d.call.filter(x=>x===0).length;
// call options: pass (-1 shown as «باس»), dash (0), or {v,s}
function c2esCallOK(d,v,s){if(v===0)return c2esDash(d)<2;if(v<c2esMin(d.T)||v>d.T)return false;return c2esNum({v,s})>c2esNum(d.best);}
function c2esCall(d,v,s){const h=d.ah,call=[...d.call],cs=[...d.cs];call[h]=v;cs[h]=v>0?s:'';let best=d.best;if(v>0)best={h,v,s};
  const say=`${c2Name(d,h)}: ${v<0?'باس':v===0?'داش':v+' '+c2esSuN(s)}`;const nx=(h+1)%d.H,done=nx===(d.dl+1)%d.H;
  if(!done)return {...d,call,cs,best,ah:nx,turn:d.ctl[nx],last:say};
  if(!best)return {...c2esDeal(d),last:say+' • ما أحد طلب، نعيد التوزيع'};
  // estimates: everyone but the caller and the dash callers, in turn from the caller's right; the caller's call is his estimate
  const est=[...d.est];est[best.h]=best.v;call.forEach((x,k)=>{if(x===0)est[k]=0;});
  const eo=[...Array(d.H-1)].map((_,j)=>(best.h+1+j)%d.H).filter(k=>call[k]!==0).join('');
  const tr=c2esTr(best.s),nd={...d,call,cs,best,est,trs:best.s,tr,hands:d.hands.map(x=>c2Sort(x,tr)),hb:best.h,eo,ei:0,last:say+` • ${c2Name(d,best.h)} طلب ${best.v} ${c2esSuN(best.s)}`};
  if(!eo.length)return c2esGo(nd);
  return {...nd,ph:'est',ah:+eo[0],turn:d.ctl[+eo[0]]};}
// the values a hand may estimate now: up to the call (normal rounds), and the last one may not make the total T
function c2esOpts(d){const h=d.ah,last=d.ei===d.eo.length-1,mx=d.best?d.best.v:d.T;const sum=d.est.reduce((x,v,k)=>x+(k!==h&&v>0?v:0),0);
  const o=[];for(let v=0;v<=mx;v++)if(!(last&&sum+v===d.T))o.push(v);return o;}
function c2esEst(d,v){const h=d.ah,est=[...d.est];est[h]=v;const ei=d.ei+1,say=`${c2Name(d,h)}: ${v}`;
  if(ei<d.eo.length){const nx=+d.eo[ei];return {...d,est,ei,ah:nx,turn:d.ctl[nx],last:say};}
  let nd={...d,est,ei,risk:h,last:say};
  if(!d.best){const mx=Math.max(...est);nd.hb=+d.eo.split('').find(k=>est[+k]===mx);}
  return c2esGo(nd);}
function c2esGo(d){const h=d.hb;return {...d,ph:'play',ah:h,tl:h,t0:h,turn:d.ctl[h]};}
function c2esPlay(d,c){return c2Put(d,c,(nd,tk)=>c2Win(tk,nd.tr),nd=>nd.tlog.length===nd.T?c2esScore(nd):nd);}
function c2esScore(d){const H=d.H,T=d.T,tot=d.est.reduce((x,v)=>x+v,0),hb=d.hb,hv=d.est[hb],speed=!d.best;
  const ok=d.est.map((e,h)=>d.tw[h]===e),nOk=ok.filter(Boolean).length,dbl=Math.abs(tot-T)>=4;
  const add=Array(H).fill(0),why=Array(H).fill('');
  for(let h=0;h<H;h++){const e=d.est[h],w=d.tw[h],with_=!speed&&h!==hb&&e===hv&&d.call[h]!==0;
    if(!speed&&d.call[h]===0){add[h]=ok[h]?23:-23;why[h]='داش';if(tot<T){add[h]+=ok[h]?10:-10;}continue;}
    let b,p;if(h===hb){b=20;p=10;why[h]='الطالب';}
    else if(h===d.risk&&!speed){if(dbl){b=with_?40:30;p=with_?30:20;why[h]='مخاطر مضاعف';}else{b=with_?30:20;p=with_?20:10;why[h]='المخاطر';}if(with_)why[h]+=' مع';}
    else if(with_){b=20;p=20;why[h]='مع';}else{b=10;p=0;}
    add[h]=ok[h]?e+b:-Math.abs(w-e)-p;}
  if(nOk===1)add[ok.indexOf(true)]+=10;
  if(nOk===H-1&&H>2)add[ok.indexOf(false)]-=10;
  let mul=(d.mul||1)*(d.est.some(e=>e>=Math.ceil(T*8/13))?2:1),nm2=1;
  if(!nOk){add.fill(0);nm2=2;mul=1;}
  const fin=add.map(x=>x*mul),sc=d.sc.map((x,h)=>x+fin[h]),nx=(d.dl+1)%H;
  const nd={...d,ph:'sum',sc,mul:nm2,sum:{add:fin,ok,why,mul,none:!nOk},ah:nx,turn:d.ctl[nx],last:`انتهت الجولة ${d.r}`};
  if(d.r>=d.nr+d.ns){const w=c2EndBy(nd,sc,false);if(w)return w;return {...nd,ns:d.ns+1};}
  return nd;}
function c2esNext(d){return {...c2esDeal({...d,r:d.r+1,k:d.k+1,dl:(d.dl+1)%d.H}),last:''};}
const c2esLen=(d,full)=>({...c2esDeal({...d,nr:full?13:5,ns:full?5:3,r:1}),last:full?'لعبة كاملة: 18 جولة':'لعبة قصيرة: 8 جولات'});
GAMES.c_estim=c2IndGame({name:'استيميشن',lbc:'#1D5C8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1D5C8C"/><circle cx="50" cy="50" r="40" fill="#2670A6"/><g transform="rotate(-12 40 54)"><rect x="22" y="30" width="32" height="46" rx="5" fill="#fff"/><text direction="ltr" x="38" y="59" font-size="20" font-weight="800" text-anchor="middle" fill="#2D4763">7♠</text></g><circle cx="68" cy="40" r="17" fill="#F0B429"/><text direction="ltr" x="68" y="47" font-size="19" font-weight="900" text-anchor="middle" fill="#1D5C8C">=</text><rect x="52" y="64" width="34" height="16" rx="8" fill="#fff"/><text direction="ltr" x="69" y="76" font-size="12" font-weight="900" text-anchor="middle" fill="#1D5C8C">3/3</text></svg>`,
  init:n=>({H:n,team:0,ctl:c2Ctl(n,n,0,'',0),k:0,dl:n-1,sc:Array(n).fill(0),r:0,nr:5,ns:3,mul:1,ph:'len',hands:Array(n).fill(''),tw:Array(n).fill(0),est:Array(n).fill(-1),call:Array(n).fill(-1),cs:Array(n).fill(''),
    tk:'',pd:'',tlog:'',lt:null,ah:0,tl:0,t0:0,T:c2esT(n),turn:0,last:''}),
  start:(d,base)=>{const h=base.turn%d.H;return {...d,ah:h,turn:d.ctl[h]};},
  redeal:d=>d.win!=null||d.ph==='sum'||d.ph==='len'?d:{...c2esDeal(d),last:'انعادت التوزيعة من جديد'},
  points:d=>d.sc.map(x=>x),
  winText:d=>d.win!=null?`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بـ${d.sc[d.win]} نقطة`:null,
  onTimeout(d){if(d.ph==='len')return c2esLen(d,false);if(d.ph==='sum')return c2esNext(d);if(d.ph==='call')return c2esCall(d,-1);if(d.ph==='est'){const o=c2esOpts(d);return c2esEst(d,o[0]);}
    const L=c2Follow(d.hands[d.ah],cardsOf(d.tk));return c2esPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='len')return s+`${who}: اختر طول اللعبة`;if(d.ph==='call')return s+`${who}: الطلب${d.best?` • أعلى طلب ${d.best.v} ${c2esSuN(d.best.s)}`:''}`;
    if(d.ph==='est')return s+`${who}: كم لمّة بتاخذ بالضبط؟${d.ei===d.eo.length-1?' <small>(أنت المخاطر)</small>':''}`;if(d.ph==='play')return s+who;return s+`انتهت الجولة ${d.r}`;},
  render(d,ctx){if(d.ph==='len'){const my=ctx.my;return `<div class="blt c2"><div class="panel bsum"><h3>استيميشن</h3><p>كل واحد لحاله، والمطلوب تاخذ بالضبط عدد اللمّات اللي قلته</p>
      ${my?'<button class="big navy" data-ga="len" data-i="0">لعبة قصيرة: 8 جولات</button><button class="big green" data-ga="len" data-i="1">لعبة كاملة: 18 جولة</button>':`<p class="note">${nameTag(d,d.turn)} يختار طول اللعبة</p>`}</div></div>`;}
    return c2Frame(d,ctx,{
    head:d=>c2HeadMid(`${d.trs?(d.trs==='n'?'صن':c2Su(d.trs)):''} <small>جولة ${d.r} من ${d.nr+d.ns}${d.r>d.nr?' (سريعة)':''} • ${d.T} لمّات${(d.mul||1)>1?' • مضاعفة':''}</small>`),
    info:(d,k)=>{if(d.ph==='sum')return '';if(d.ph==='call')return d.call[k]>0?`<b class="c2bid">${d.call[k]} ${d.cs[k]==='n'?'صن':C2SN[d.cs[k]]}</b>`:d.call[k]===0?'<b class="c2bid">داش</b>':'';
      const e=d.est[k];return e<0?'':`<b class="${d.ph==='play'&&d.tw[k]>e?'c2pt bad':'c2tw'}">${d.ph==='play'?d.tw[k]+'/':''}${e}</b>${k===d.hb?' 👑':''}`;},
    panel(d){if(d.ph==='call'){const sel=Array.isArray(S.sel)&&S.sel[0]==='es:'+c2SelKey(d)?S.sel[1]:null;
        if(sel!=null)return `<p class="lbl c2lb">${sel} لمّات، وش الحكم؟</p>`+c2Btns([...C2ES_SU.map((s,i)=>c2esCallOK(d,sel,s)?[i,s==='n'?'صن':C2SN[s],s==='n'?'navy':'bsuit '+('hd'.includes(s)?'rs':'')]:null).filter(Boolean),[9,'رجوع','']],'csuit');
        const nums=[];for(let v=c2esMin(d.T);v<=d.T;v++)if(C2ES_SU.some(s=>c2esCallOK(d,v,s)))nums.push([v,String(v),'green']);
        return `<p class="lbl c2lb">اطلب عدد لمّات وحكم، أو داش (صفر بدون حكم)</p>`+c2Btns([[-1,'باس',''],...(c2esCallOK(d,0)?[[0,'داش','navy']]:[]),...nums],'call');}
      if(d.ph==='est')return `<p class="lbl c2lb">كم لمّة بتاخذ؟${d.ei===d.eo.length-1?' (المجموع ما يصير '+d.T+')':''}</p>`+c2Btns(c2esOpts(d).map(v=>[v,String(v),'green']),'est');},
    canCard:d=>d.ph==='play',legal:(d,h)=>c2Follow(d.hands[h],cardsOf(d.tk)),
    sum(d,ctx){const r=d.sum;return `<div class="panel bsum"><h3>${r.none?'ما أحد جابها بالضبط: الجولة الجاية مضاعفة':`نتيجة الجولة ${d.r}${r.mul>1?' (×'+r.mul+')':''}`}</h3>${[...Array(d.H)].map((_,h)=>`<div class="bsr"><span>${c2Name(d,h)}</span><em>${d.tw[h]}/${d.est[h]} ${r.ok[h]?'✅':'❌'} <small>${r.why[h]}</small></em><b>${r.add[h]>0?'+':''}${r.add[h]} → ${d.sc[h]}</b></div>`).join('')}
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2esNext(d));return;}if(a==='len'&&d.ph==='len'){act(c2esLen(d,i===1));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='call'&&d.ph==='call'){if(i===-1){act(c2esCall(d,-1));return;}if(i===0){if(c2esCallOK(d,0))act(c2esCall(d,0));return;}if(!C2ES_SU.some(s=>c2esCallOK(d,i,s)))return;S.sel=['es:'+c2SelKey(d),i];render();return;}
    if(a==='csuit'&&d.ph==='call'){const v=Array.isArray(S.sel)&&S.sel[0]==='es:'+c2SelKey(d)?S.sel[1]:null;S.sel=[];if(i===9||v==null){render();return;}const s=C2ES_SU[i];if(!s||!c2esCallOK(d,v,s)){render();return;}act(c2esCall(d,v,s));return;}
    if(a==='est'&&d.ph==='est'){if(!c2esOpts(d).includes(i))return;act(c2esEst(d,i));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!c2Follow(d.hands[d.ah],cardsOf(d.tk)).includes(c))return;act(c2esPlay(d,c));}}});
HELP.c_estim='كل واحد يلعب لحاله، والهدف تاخذ بالضبط عدد اللمّات اللي قلته. أول ما تبدأ تختارون طول اللعبة: قصيرة (5 جولات عادية و3 سريعة) أو كاملة (13 عادية و5 سريعة). مع 4 لاعبين أو أقل كل واحد 13 ورقة، ومع أكثر يتقسم الورق بالتساوي. الجولة العادية: الطلب يبدأ من يمين الموزّع ويلف مرة: تقول باس، أو «داش» (يعني ما بتاخذ ولا لمّة، وبالكثير اثنين بالجولة)، أو تطلب عدد لمّات (4 أو أكثر) مع حكم. الطلب يغلب اللي أقل منه بالعدد، أو نفس العدد بحكم أعلى: صن (بدون حكم) ثم ♠ ثم ♥ ثم ♦ ثم ♣. صاحب أعلى طلب يصير الطالب وحكمه هو الحكم. بعدها الباقين كل واحد يقول تقديره بالترتيب (ما يتعدى طلب الطالب، واللي يساويه اسمه «مع»)، وآخر واحد «المخاطر» ما يقدر يخلي المجموع يساوي عدد اللمّات. الجولات السريعة: الحكم محدد (صن، ♠، ♥، ♦، ♣) وكلكم تقولون تقديركم مباشرة. الطالب يبدأ اللعب، ولازم تنزل من النوع الأول. النقاط: اللي يجيبها بالضبط ياخذ تقديره + 10 (الطالب +20، اللي «مع» +20، المخاطر +20 أو +30 إذا كان «مع» أو بعيد عن المجموع بـ4 أو أكثر، و+40 للاثنين). اللي ما يجيبها ينخصم منه الفرق وعليه زيادة: الطالب ‎-10، اللي «مع» ‎-20، المخاطر ‎-10 أو ‎-20 أو ‎-30. الداش: ‎+23 أو ‎-23. لو واحد بس جابها ياخذ 10 زيادة، ولو كلهم جابوها إلا واحد ينخصم منه 10. لو أحد قدّر 8 أو أكثر تتضاعف الجولة، ولو ما أحد جابها بالضبط ما تنحسب وتتضاعف اللي بعدها. بعد آخر جولة يفوز صاحب أعلى مجموع.';
GAMES.c_estim.bot=(d,s,lv)=>{if(d.ph==='len')return c2esLen(d,false);if(d.ph==='sum')return c2esNext(d);const h=d.ah,H=cardsOf(d.hands[h]),k=d.T/13;
  const ev=tr=>c2EstP(H,tr,d.H,d.T)+(lv>1?.2:0);
  if(d.ph==='call'){let bs='n',bv=ev(null)*.95;for(const x of 'shdc'){const v=ev(x);if(v>bv){bv=v;bs=x;}}
    const want=Math.round(bv+c2Lv(lv)*.8);
    if(lv>=2&&bv<.5*k+.2&&c2esCallOK(d,0)&&!H.some(c=>c2r(c)>=11))return c2esCall(d,0);
    if(want>=c2esMin(d.T)){for(const s of C2ES_SU)if(c2esCallOK(d,want,s)&&(s===bs||C2ES_SU.indexOf(s)<C2ES_SU.indexOf(bs)&&lv===1))return c2esCall(d,want,s);
      if(c2esCallOK(d,want,bs))return c2esCall(d,want,bs);}
    return c2esCall(d,-1);}
  if(d.ph==='est'){const o=c2esOpts(d);const e=Math.round(ev(d.tr)+c2Lv(lv)*.8);const pick=o.slice().sort((a,b)=>Math.abs(a-e)-Math.abs(b-e))[0];return c2esEst(d,pick);}
  const L=c2Follow(d.hands[h],cardsOf(d.tk)),want=d.tw[h]<d.est[h];
  return c2esPlay(d,c2BotWin(d,h,L,lv,{T:d.tr,str:c=>(c[1]===d.tr?100:0)+c2r(c),win:tk=>c2Win(tk,d.tr),mate:(a,b)=>a===b,deck:c2Deck(),want,draw:false}));};
GAMES.c_estim.botDelay=(d,s,lv)=>d.ph==='sum'?7000:d.ph==='play'?650+rnd(600):900+rnd(700);

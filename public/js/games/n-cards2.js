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
    h+=`<div class="c2seat ${r===0?'me':''} ${o.on===k?'on':''} ${o.mark&&o.mark(k)?'mk':''}" style="left:${(50+41*x).toFixed(1)}%;top:${(50+(r===0?43:39)*y).toFixed(1)}%;--c:${col(d,d.ctl[k])}"><span class="c2nm">${c2Name(d,k)}</span>${o.info?`<span class="c2inf">${o.info(k)}</span>`:''}${r&&cnt?`<i class="c2bk">${cnt}</i>`:''}</div>`;}
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
const c2Lv=lv=>lv===1?Math.random()*3-1.5:lv===2?Math.random()*1.2-.6:0;

/* =================================================================
   طرنيب: four hands in two teams, 13 cards each. Bids 7 to 13 go round until three pass; the buyer names the trump
   (the tarneeb) and leads. Made: the team scores its tricks (16 for all 13, 26 for a bid of 13); failed: it loses the bid
   and the other team scores its tricks (13 bid and failed: -16, the others double). First team to 31 wins.
   ================================================================= */
function tnDeal(d){const dk=shuffle(c2Deck()),ah=(d.dl+1)%4;
  return {...d,ph:'bid',hands:[0,1,2,3].map(h=>c2Sort(dk.slice(h*13,h*13+13).join(''))),pa:'0000',best:null,bids:[-1,-1,-1,-1],tr:null,
    t0:ah,tl:ah,tk:'',lt:null,tw:[0,0,0,0],pd:'',tlog:'',sum:null,ah,turn:d.ctl[ah]};}
function tnBid(d,v){const h=d.ah,bids=[...d.bids];bids[h]=v;let pa=d.pa,best=d.best;if(!v)pa=setAt(pa,h,'1');else best={h,v};
  const say=`${c2Name(d,h)}: ${v||'باس'}`,live=[0,1,2,3].filter(x=>pa[x]!=='1');
  if(best&&(best.v===13||(live.length===1&&live[0]===best.h)))return {...d,pa,best,bids,ph:'trump',ah:best.h,turn:d.ctl[best.h],last:say+` • ${c2Name(d,best.h)} اشترى بـ ${best.v}`};
  if(!live.length)return {...tnDeal(d),last:'الكل قال باس، نعيد التوزيع'};
  let x=h;do x=(x+1)%4;while(pa[x]==='1');return {...d,pa,best,bids,ah:x,turn:d.ctl[x],last:say};}
const tnOpts=d=>[0,...[7,8,9,10,11,12,13].filter(v=>!d.best||v>d.best.v)];
function tnTrump(d,s){const h=d.best.h,hands=d.hands.map(x=>c2Sort(x,s));return {...d,hands,tr:s,ph:'play',t0:h,tl:h,ah:h,turn:d.ctl[h],last:`${c2Name(d,h)} اختار الطرنيب ${C2SN[s]}`};}
const tnWinF=d=>(nd,tk)=>c2Win(tk,d.tr);
function tnPlay(d,c){return c2Put(d,c,tnWinF(d),nd=>nd.tlog.length===13?tnScore(nd):nd);}
function tnScore(d){const b=d.best,t=b.h%2,o=1-t,won=d.tw[t]+d.tw[t+2],opp=13-won,add=[0,0],made=won>=b.v;
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
  if(d.ph==='play')h+=c2Last(d,o.lastX?o.lastX(d):'');
  const my=ctx.my&&mine.includes(ah)&&d.ctl[ah]===d.turn;
  if(d.ph==='sum')h+=o.sum(d,ctx,me);
  else{if(my&&o.panel)h+=o.panel(d,ctx,me)||'';else if(o.wait)h+=o.wait(d,me)||'';
    if(watch)h+=c2Backs(cardsOf(d.hands[me]).length);
    else{const can=my&&o.canCard(d,me);const L=can?o.legal(d,me):[];h+=c2Hand(d,me,L,can,o.sel?o.sel(d,me):null);}}
  return h+'</div>';}

GAMES.c_tarneeb=c2TeamGame({deal:tnDeal,G:{name:'طرنيب',lbc:'#8C2F39',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8C2F39"/><circle cx="50" cy="54" r="38" fill="#A63D47"/><g transform="rotate(-16 36 54)"><rect x="18" y="28" width="34" height="48" rx="5" fill="#fff"/><text x="35" y="58" font-size="22" font-weight="800" text-anchor="middle" fill="#2D4763">A♠</text></g><g transform="rotate(14 64 54)"><rect x="48" y="28" width="34" height="48" rx="5" fill="#fff"/><text x="65" y="58" font-size="22" font-weight="800" text-anchor="middle" fill="#D43C33">K♥</text></g><circle cx="78" cy="22" r="14" fill="#F0B429"/><text x="78" y="28" font-size="16" font-weight="900" text-anchor="middle" fill="#7A2430">13</text></svg>`,
  init:n=>tnDeal({H:4,team:1,ctl:c2Ctl(n,4,0,'',1),k:0,dl:3,sc:[0,0],last:''}),
  onTimeout(d){if(d.ph==='bid')return tnBid(d,0);if(d.ph==='trump')return tnTrump(d,'shdc'[rnd(4)]);if(d.ph==='sum')return c2NextTeam(d,tnDeal);
    const L=c2Follow(d.hands[d.ah],cardsOf(d.tk));return tnPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')return s+`${who}: المزايدة من 7 إلى 13${d.best?` • أعلى طلب ${d.best.v}`:''}`;
    if(d.ph==='trump')return s+`${who}: اختر الطرنيب`;
    if(d.ph==='play')return s+who;return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{
    head:(d,me)=>c2Head(d,me,d.tr?`طرنيب ${c2Su(d.tr)}${d.best?` <u>${d.best.v}</u>`:''}`:'<small>المزايدة</small>'),
    info:(d,k)=>d.ph==='bid'||d.ph==='trump'?(d.bids[k]>0?`<b class="c2bid">${d.bids[k]}</b>`:d.bids[k]===0?'<small>باس</small>':''):d.ph==='sum'?'':`<b class="c2tw">${d.tw[k]}</b>${d.best&&d.best.h===k?' 👑':''}`,
    panel(d,ctx,me){if(d.ph==='bid')return c2Btns(tnOpts(d).map(v=>[v,v?String(v):'باس',v?'green':'']),'bid');
      if(d.ph==='trump')return `<p class="lbl c2lb">اختر الطرنيب</p>`+c2Btns('shdc'.split('').map((s,i)=>[i,C2SN[s],'bsuit '+('hd'.includes(s)?'rs':'')]),'trump');},
    canCard:d=>d.ph==='play',legal:(d,h)=>c2Follow(d.hands[h],cardsOf(d.tk)),
    sum(d,ctx){const r=d.sum,t=d.best.h%2;return `<div class="panel bsum"><h3>${r.made?`${c2TeamName(d,t)} جابوا طلبهم (${d.best.v}) ✅`:`${c2TeamName(d,t)} انكسروا ❌`}</h3>
      <div class="bsr"><span></span><b>${c2TeamName(d,0)}</b><b>${c2TeamName(d,1)}</b></div>
      <div class="bsr"><span>اللمّات</span><em>${r.tr[0]}</em><em>${r.tr[1]}</em></div>
      <div class="bsr tot"><span>النقاط</span><em>${r.add[0]>0?'+':''}${r.add[0]}</em><em>${r.add[1]>0?'+':''}${r.add[1]}</em></div>
      <div class="bsr"><span>المجموع</span><b>${d.sc[0]}</b><b>${d.sc[1]}</b></div>
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2NextTeam(d,tnDeal));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='bid'&&d.ph==='bid'){if(!tnOpts(d).includes(i))return;act(tnBid(d,i));return;}
    if(a==='trump'&&d.ph==='trump'){const s='shdc'[i];if(!s)return;act(tnTrump(d,s));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!c2Follow(d.hands[d.ah],cardsOf(d.tk)).includes(c))return;act(tnPlay(d,c));}}}});
HELP.c_tarneeb='أربع أيادي: كل اثنين متقابلين فريق، وكل يد تاخذ 13 ورقة. المزايدة تبدأ من يمين الموزّع وتلف عكس عقارب الساعة: كل واحد يطلب عدد لمّات (من 7 إلى 13) أعلى من اللي قبله أو يقول باس، واللي يقول باس يطلع من المزايدة. لو الكل قال باس تنعاد التوزيعة. آخر واحد باقي يشتري ويختار الطرنيب (الحكم) ويبدأ اللعب. لازم تنزل من نفس النوع اللي نزل أول، وإذا ما عندك تقدر تطرنب أو ترمي أي ورقة. أعلى طرنيب ياكل اللمّة، وإذا ما نزل طرنيب ياكلها أعلى ورقة من النوع الأول. إذا جاب الفريق المشتري طلبه ياخذ عدد لمّاته (والكبوت 13 لمّة = 16، وطلب 13 وجابه = 26) والخصم ما ياخذ شي. وإذا انكسر ينخصم منه طلبه والخصم ياخذ لمّاته (طلب 13 وانكسر: ‎-16 والخصم ياخذ ضعف لمّاته). أول فريق يوصل 31 يفوز. لاعبين اثنين: كل واحد يلعب يدين فريقه. ثلاثة: اللي لحاله يلعب يدين فريقه. من 5 لاعبين: أعضاء الفريق يتناوبون على أياديه جولة بعد جولة.';

/* the bot: bids from what its hand can take with its best suit as trumps plus a share for its partner, and plays to win
   the tricks its team needs (draws the trumps when it bought, feeds its partner, ruffs) */
GAMES.c_tarneeb.bot=(d,s,lv)=>{if(d.ph==='sum')return c2NextTeam(d,tnDeal);const h=d.ah,H=cardsOf(d.hands[h]);
  if(d.ph==='bid'||d.ph==='trump'){let bs='s',bv=-1;for(const x of 'shdc'){const v=c2Est(H,x);if(v>bv){bv=v;bs=x;}}
    if(d.ph==='trump')return tnTrump(d,bs);
    const mate=d.best&&d.best.h%2===h%2;const team=bv+[0,3,3.2,3.3][lv]+c2Lv(lv)+(d.bids[(h+2)%4]>0?.8:0);
    const want=Math.min(13,Math.floor(team));const o=tnOpts(d);if(mate&&want<d.best.v+2)return tnBid(d,0);
    const nx=o.find(v=>v>0&&v<=want);return tnBid(d,nx||0);}
  const L=c2Follow(d.hands[h],cardsOf(d.tk));
  return tnPlay(d,c2BotWin(d,h,L,lv,{T:d.tr,str:c=>(c[1]===d.tr?100:0)+c2r(c),win:tk=>c2Win(tk,d.tr),mate:(a,b)=>a%2===b%2,deck:c2Deck(),draw:d.best.h%2===h%2}));};
GAMES.c_tarneeb.botDelay=(d,s,lv)=>d.ph==='sum'?7000:d.ph==='play'?650+rnd(600):900+rnd(700);

/* =================================================================
   سبيتة (spades): partnership, spades always trumps. Every hand bids 0 (nil) to 13; a team's contract is the sum of its
   non-nil bids. Made: 10 a trick of the contract + 1 a trick over (bags; every 10 bags cost 100). Failed: -10 a trick.
   Nil: +100 when that hand takes nothing, else -100. Spades may not be led before one was played on another suit.
   First team to 500 wins; a team down to -200 loses.
   ================================================================= */
function spDeal(d){const dk=shuffle(c2Deck()),ah=(d.dl+1)%4;
  return {...d,ph:'bid',hands:[0,1,2,3].map(h=>c2Sort(dk.slice(h*13,h*13+13).join(''),'s')),bids:[-1,-1,-1,-1],tr:'s',brk:false,
    t0:ah,tl:ah,tk:'',lt:null,tw:[0,0,0,0],pd:'',tlog:'',sum:null,ah,turn:d.ctl[ah]};}
function spBid(d,v){const h=d.ah,bids=[...d.bids];bids[h]=v;const say=`${c2Name(d,h)}: ${v?v:'نِل (صفر)'}`;
  if(bids.every(x=>x>=0)){const f=d.t0;return {...d,bids,ph:'play',ah:f,tl:f,turn:d.ctl[f],last:say};}
  const nx=(h+1)%4;return {...d,bids,ah:nx,turn:d.ctl[nx],last:say};}
function spLegal(d,h){const H=cardsOf(d.hands[h]),tk=cardsOf(d.tk);if(tk.length)return c2Follow(d.hands[h],tk);
  if(d.brk)return H;const ns=H.filter(c=>c[1]!=='s');return ns.length?ns:H;}
function spPlay(d,c){const tk=cardsOf(d.tk);const brk=d.brk||(c[1]==='s'&&tk.length&&tk[0][1]!=='s')||(c[1]==='s'&&!tk.length);
  return c2Put({...d,brk},c,(nd,t)=>c2Win(t,'s'),nd=>nd.tlog.length===13?spScore(nd):nd);}
function spScore(d){const add=[0,0],bags=[...(d.bags||[0,0])],det=[[],[]];
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
const spOpts=()=>[0,1,2,3,4,5,6,7,8,9,10,11,12,13];
GAMES.c_spades=c2TeamGame({deal:spDeal,G:{name:'سبيتة',lbc:'#24324A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#24324A"/><circle cx="50" cy="50" r="40" fill="#2F4363"/><path transform="translate(50 47) scale(5.2)" d="${SUITP.s}" fill="#fff"/><rect x="26" y="74" width="48" height="14" rx="7" fill="#F0B429"/><text x="50" y="85" font-size="11" font-weight="900" text-anchor="middle" fill="#24324A">500</text></svg>`,
  init:n=>spDeal({H:4,team:1,ctl:c2Ctl(n,4,0,'',1),k:0,dl:3,sc:[0,0],bags:[0,0],last:''}),
  onTimeout(d){if(d.ph==='bid')return spBid(d,Math.max(1,Math.round(c2Est(cardsOf(d.hands[d.ah]),'s'))));if(d.ph==='sum')return c2NextTeam(d,spDeal);
    const L=spLegal(d,d.ah);return spPlay(d,L[rnd(L.length)]);},
  points:d=>d.pl.map((_,s)=>`${d.sc[s%2]}`),
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')return s+`${who}: كم لمّة تطلب؟`;if(d.ph==='play')return s+who+(d.brk?'':' <small>• الأسباتي ما انكسر</small>');return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{
    head:(d,me)=>c2Head(d,me,`${c2Su('s')} <small>زيادات ${(d.bags||[0,0])[me%2]}</small>`),
    info:(d,k)=>d.bids[k]<0?'':`<b class="c2bid">${d.ph==='play'?`${d.tw[k]}/`:''}${d.bids[k]===0?'نِل':d.bids[k]}</b>`,
    panel(d){if(d.ph==='bid')return `<p class="lbl c2lb">كم لمّة بتاخذ؟ (صفر = نِل)</p>`+c2Btns(spOpts().map(v=>[v,v?String(v):'نِل',v?'green':'navy']),'bid');},
    canCard:d=>d.ph==='play',legal:(d,h)=>spLegal(d,h),
    sum(d,ctx){const r=d.sum;return `<div class="panel bsum"><h3>نتيجة الجولة</h3>
      <div class="bsr"><span></span><b>${c2TeamName(d,0)}</b><b>${c2TeamName(d,1)}</b></div>
      <div class="bsr"><span>اللمّات</span><em>${r.tr[0]}</em><em>${r.tr[1]}</em></div>
      <div class="bsr"><span>العقد</span><em>${r.det[0].join('<br>')||'-'}</em><em>${r.det[1].join('<br>')||'-'}</em></div>
      <div class="bsr tot"><span>النقاط</span><em>${r.add[0]>0?'+':''}${r.add[0]}</em><em>${r.add[1]>0?'+':''}${r.add[1]}</em></div>
      <div class="bsr"><span>المجموع</span><b>${d.sc[0]}</b><b>${d.sc[1]}</b></div>
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2NextTeam(d,spDeal));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='bid'&&d.ph==='bid'){if(!(i>=0&&i<=13))return;act(spBid(d,i));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!spLegal(d,d.ah).includes(c))return;act(spPlay(d,c));}}}});
HELP.c_spades='أربع أيادي: كل اثنين متقابلين فريق، والأسباتي ♠ دايم هو الحكم. كل يد تاخذ 13 ورقة، وكل واحد يطلب كم لمّة بياخذ (من 0 إلى 13)، وطلب الفريق مجموع طلبات اللاعبين. الصفر اسمه «نِل»: إذا ما أخذ صاحبه ولا لمّة ياخذ فريقه 100، وإذا أخذ ولو وحدة ينخصم 100. لازم تنزل من النوع الأول، وإذا ما عندك تقدر تقطع بالأسباتي. ما تبدأ بالأسباتي لين ينكسر (ينزل أسباتي على نوع ثاني) إلا إذا ما عندك غيره. إذا جاب الفريق طلبه ياخذ 10 عن كل لمّة طلبها، وكل لمّة زيادة بنقطة، وكل 10 زيادات تنخصم 100. وإذا ما جابه ينخصم 10 عن كل لمّة طلبها. أول فريق يوصل 500 يفوز، واللي ينزل إلى ‎-200 يخسر. لاعبين اثنين: كل واحد يلعب يدين فريقه. ثلاثة: اللي لحاله يلعب يدين فريقه. من 5 لاعبين: أعضاء الفريق يتناوبون على أياديه.';
GAMES.c_spades.bot=(d,s,lv)=>{if(d.ph==='sum')return c2NextTeam(d,spDeal);const h=d.ah,H=cardsOf(d.hands[h]);
  if(d.ph==='bid'){const e=c2Est(H,'s')+c2Lv(lv)*.7;const hiS=H.some(c=>c[1]==='s'&&c2r(c)>=10);
    if(lv>=2&&e<.7&&!hiS&&H.filter(c=>c[1]==='s').length<=3&&d.bids[(h+2)%4]!==0)return spBid(d,0);return spBid(d,Math.max(1,Math.min(13,Math.round(e))));}
  const L=spLegal(d,h),t=h%2,con=[t,t+2].reduce((x,y)=>x+(d.bids[y]>0?d.bids[y]:0),0),got=[t,t+2].reduce((x,y)=>x+(d.bids[y]>0?d.tw[y]:0),0);
  const nil=d.bids[h]===0,want=!nil&&!(lv===3&&got>=con&&con>0);
  return spPlay(d,c2BotWin(d,h,L,lv,{T:'s',str:c=>(c[1]==='s'?100:0)+c2r(c),win:tk=>c2Win(tk,'s'),mate:(a,b)=>a%2===b%2&&d.bids[b]!==0,deck:c2Deck(),want,draw:false}));};
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
const KT_RK4={s:'6789TJQKA',c:'6789TJQKA',h:'789TJQKA',d:'789TJQKA'};
const ktDeck=H=>H===4?[...'shdc'].flatMap(s=>[...KT_RK4[s]].map(r=>r+s)).concat(['XR','XB']):c2Deck().concat(['XR','XB']);
const ktSuit=(d,c)=>c2IsJ(c)?d.tr:c[1];
const ktStr=(d,c)=>c==='XR'?1000:c==='XB'?998:c[1]===d.tr?(c[0]==='A'?999:500+c2r(c)):c2r(c);
function ktWin(d,tk){const led=ktSuit(d,tk[0]);let w=-1,bv=-1;tk.forEach((c,i)=>{const s=ktSuit(d,c);const v=s===d.tr||c2IsJ(c)?ktStr(d,c):s===led?ktStr(d,c):-1;if(v>bv){bv=v;w=i;}});return w;}
function ktDeal(d){const dk=shuffle(ktDeck(d.H)),ah=(d.dl+1)%d.H;
  return {...d,ph:'bid',hands:[...Array(d.H)].map((_,h)=>c2Sort(dk.slice(h*9,h*9+9).join(''))),bids:Array(d.H).fill(-1),best:null,tr:null,
    t0:ah,tl:ah,tk:'',lt:null,tw:Array(d.H).fill(0),pd:'',tlog:'',sum:null,ah,turn:d.ctl[ah]};}
const KT_N={5:'باب',6:'ستة',7:'سبعة',8:'ثمانية',9:'بوان'};
function ktOpts(d){const last=d.ah===d.dl,b=d.best?d.best.v:4,o=[5,6,7,8,9].filter(v=>v>b);return last&&!d.best?o:[0,...o];}
function ktBid(d,v){const h=d.ah,bids=[...d.bids];bids[h]=v;let best=d.best;if(v)best={h,v,mz:h===d.dl&&!d.best&&v===5};
  const say=`${c2Name(d,h)}: ${v?KT_N[v]+(best.mz&&best.h===h?' (ملزوم)':''):'طاف'}`;
  if(h===d.dl)return {...d,bids,best,ph:'trump',ah:best.h,turn:d.ctl[best.h],last:say+` • ${c2Name(d,best.h)} اشترى ${KT_N[best.v]}`};
  const nx=(h+1)%d.H;return {...d,bids,best,ah:nx,turn:d.ctl[nx],last:say};}
function ktTrump(d,s){const h=d.best.h;return {...d,hands:d.hands.map(x=>c2Sort(x,s)),tr:s,ph:'play',t0:h,tl:h,ah:h,turn:d.ctl[h],last:`${c2Name(d,h)} اختار الحكم ${C2SN[s]}`};}
function ktLegal(d,h){const H=cardsOf(d.hands[h]),tk=cardsOf(d.tk),T=d.tr;
  if(!tk.length){const side=h%2===d.best.h%2,pd=cardsOf(d.pd),open=['A','K','Q','J'].every(r=>pd.includes(r+T));
    const ok=c=>!c2IsJ(c)||open||(side&&d.best.v===9)||(side&&d.best.v===8&&c==='XR');const L=H.filter(ok);return L.length?L:H;}
  const led=ktSuit(d,tk[0]),f=H.filter(c=>!c2IsJ(c)&&c[1]===led);return f.length?[...f,...H.filter(c2IsJ)]:H;}
function ktPlay(d,c){return c2Put(d,c,(nd,tk)=>ktWin(nd,tk),nd=>{const t=nd.best.h%2,got=nd.tw.reduce((x,n,h)=>x+(h%2===t?n:0),0),lost=nd.tlog.length-got;
  return got>=nd.best.v||lost>9-nd.best.v?ktScore(nd,got>=nd.best.v):nd;});}
function ktScore(d,made){const b=d.best,t=b.h%2,o=1-t,add=[0,0];if(made)add[t]=b.v===9?36:b.v;else add[o]=b.mz?5:2*b.v;
  const sc=[d.sc[0]+add[0],d.sc[1]+add[1]],nx=(d.dl+1)%d.H;
  const nd={...d,ph:'sum',sc,sum:{add,made,tr:[0,1].map(x=>d.tw.reduce((a,n,h)=>a+(h%2===x?n:0),0))},ah:nx,turn:d.ctl[nx],last:made?`${c2TeamName(d,t)} جابوا ${KT_N[b.v]}`:`${c2TeamName(d,t)} انكسروا`};
  if(made&&b.v===9&&d.k===0)return c2WinTeam(nd,t);
  for(const x of [0,1])if((sc[x]>=101&&sc[x]>sc[1-x])||(sc[x]>=51&&sc[1-x]===0))return c2WinTeam(nd,x);
  return nd;}
GAMES.c_kout=c2TeamGame({deal:ktDeal,G:{name:'كوت',lbc:'#0F6E6E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#0F6E6E"/><circle cx="50" cy="54" r="38" fill="#168383"/><g transform="rotate(-14 36 52)"><rect x="18" y="26" width="34" height="48" rx="5" fill="#fff"/><path d="M27 58c0-9 4-15 8-20 4 5 8 11 8 20z" fill="#4AB1E8"/><circle cx="35" cy="37" r="2.6" fill="#F0B429"/><rect x="26" y="57" width="18" height="4" rx="2" fill="#F0B429"/></g><g transform="rotate(12 64 52)"><rect x="48" y="26" width="34" height="48" rx="5" fill="#fff"/><text x="65" y="57" font-size="22" font-weight="800" text-anchor="middle" fill="#D43C33">A♥</text></g><text x="50" y="94" font-size="13" font-weight="900" text-anchor="middle" fill="#fff">بوان</text></svg>`,
  init:n=>{const H=n<=4?4:6;return ktDeal({H,team:1,ctl:c2Ctl(n,H,0,'',1),k:0,dl:H-1,sc:[0,0],last:''});},
  onTimeout(d){if(d.ph==='bid'){const o=ktOpts(d);return ktBid(d,o[0]);}if(d.ph==='trump')return ktTrump(d,'shdc'[rnd(4)]);if(d.ph==='sum')return c2NextTeam(d,ktDeal);
    const L=ktLegal(d,d.ah);return ktPlay(d,L[rnd(L.length)]);},
  status(d,ctx){const me=!ctx.local&&d.turn===ctx.v;let s=d.last?`<small>${d.last}</small><br>`:'';const who=me?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
    if(d.ph==='bid')return s+`${who}: الشراء${d.best?` • أعلى طلب ${KT_N[d.best.v]}`:''}${d.ah===d.dl&&!d.best?' (لازم تشتري)':''}`;
    if(d.ph==='trump')return s+`${who}: اختر الحكم`;if(d.ph==='play')return s+who;return s+'انتهت الجولة';},
  render(d,ctx){return c2Frame(d,ctx,{cls:d.H>4?'kt6':'',
    head:(d,me)=>c2Head(d,me,d.tr?`حكم ${c2Su(d.tr)} <u>${KT_N[d.best.v]}</u>`:`<small>كوت بو ${d.H===4?'أربعة':'ستة'}</small>`),
    info:(d,k)=>d.ph==='bid'||d.ph==='trump'?(d.bids[k]>0?`<b class="c2bid">${KT_N[d.bids[k]]}</b>`:d.bids[k]===0?'<small>طاف</small>':''):d.ph==='sum'?'':`<b class="c2tw">${d.tw[k]}</b>${d.best&&d.best.h===k?' 👑':''}`,
    panel(d){if(d.ph==='bid')return c2Btns(ktOpts(d).map(v=>[v,v?KT_N[v]:'طاف',v?'green':'']),'bid');
      if(d.ph==='trump')return `<p class="lbl c2lb">اختر الحكم</p>`+c2Btns('shdc'.split('').map((s,i)=>[i,C2SN[s],'bsuit '+('hd'.includes(s)?'rs':'')]),'trump');},
    lastX:d=>{const t=d.best.h%2,got=d.tw.reduce((x,n,h)=>x+(h%2===t?n:0),0);return `<em>${got}/${d.best.v}</em>`;},
    canCard:d=>d.ph==='play',legal:(d,h)=>ktLegal(d,h),
    sum(d,ctx){const r=d.sum,t=d.best.h%2;return `<div class="panel bsum"><h3>${r.made?`${c2TeamName(d,t)} جابوا ${KT_N[d.best.v]} ✅`:`${c2TeamName(d,t)} انكسروا ❌`}</h3>
      <div class="bsr"><span></span><b>${c2TeamName(d,0)}</b><b>${c2TeamName(d,1)}</b></div>
      <div class="bsr"><span>اللمّات</span><em>${r.tr[0]}</em><em>${r.tr[1]}</em></div>
      <div class="bsr tot"><span>النقاط</span><em>+${r.add[0]}</em><em>+${r.add[1]}</em></div>
      <div class="bsr"><span>المجموع</span><b>${d.sc[0]}</b><b>${d.sc[1]}</b></div>
      ${ctx.my&&d.win==null?'<button class="big green" data-ga="next">وزّع الجولة التالية</button>':''}</div>`;}});},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='next'&&d.ph==='sum'){act(c2NextTeam(d,ktDeal));return;}
    if(d.ph==='sum'||d.ctl[d.ah]!==d.turn)return;
    if(a==='bid'&&d.ph==='bid'){if(!ktOpts(d).includes(i))return;act(ktBid(d,i));return;}
    if(a==='trump'&&d.ph==='trump'){const s='shdc'[i];if(!s)return;act(ktTrump(d,s));return;}
    if(a==='card'&&d.ph==='play'){const c=cardsOf(d.hands[d.ah])[i];if(!c||!ktLegal(d,d.ah).includes(c))return;act(ktPlay(d,c));}}}});
HELP.c_kout='الكوت لعبة كويتية بفريقين. لين 4 لاعبين: «كوت بو أربعة» بأربع أيادي (كل اثنين متقابلين فريق) والورق من الستة للإكة بدون الستة الحمر ومعها جوكرين. من 5 لاعبين: «كوت بو ستة» بست أيادي، ثلاثة ضد ثلاثة، والكوتشينة كاملة مع جوكرين. كل يد تاخذ 9 أوراق. الشراء يبدأ من يمين الموزّع ويلف مرة وحدة: باب (5) أو ستة أو سبعة أو ثمانية أو بوان (9)، وكل طلب لازم يكون أعلى من اللي قبله، أو تقول طاف. إذا الكل طاف لازم الموزّع يشتري (ملزوم). اللي اشترى يختار الحكم ويبدأ. الترتيب: الجوكر الكبير، بعده إكة الحكم، بعدها الجوكر الصغير، وبعدها باقي الحكم. لازم تنزل من النوع الأول، والجوكر تقدر تنزله في أي لمّة. ما تبدأ بالجوكر إلا إذا نزلت الإكة والشايب والبنت والولد من الحكم، أو إذا فريقك شاري بوان (أي جوكر) أو ثمانية (الكبير بس)، وإذا بدأت فيه لازم الباقين ينزلون حكم. إذا جاب الفريق طلبه ياخذه (البوان بـ36)، وإذا انكسر ياخذ الخصم ضعف الطلب (والملزوم 5). الجولة تخلص أول ما يبان الفوز أو الكسر. يفوز اللي يوصل 101، أو 51 والخصم صفر، أو اللي يجيب بوان في أول جولة. مع لاعبين أو ثلاثة: الواحد يلعب أكثر من يد لفريقه، ومع أكثر من 6 يتناوبون على الأيادي.';
GAMES.c_kout.bot=(d,s,lv)=>{if(d.ph==='sum')return c2NextTeam(d,ktDeal);const h=d.ah,H=cardsOf(d.hands[h]);
  const est=T=>{let v=0;for(const c of H){if(c==='XR')v+=1;else if(c==='XB')v+=.85;else if(c[1]===T)v+=c[0]==='A'?.95:c[0]==='K'?.7:c[0]==='Q'?.5:.35;else v+=c[0]==='A'?.75:c[0]==='K'?.3:0;}
    const n=H.filter(c=>c[1]===T).length;return v+Math.max(0,n-3)*.3;};
  if(d.ph==='bid'||d.ph==='trump'){let bs='s',bv=-1;for(const x of 'shdc'){const v=est(x);if(v>bv){bv=v;bs=x;}}
    if(d.ph==='trump')return ktTrump(d,bs);
    const o=ktOpts(d),team=bv+(d.H===4?[0,2,2.2,2.3][lv]:[0,3.6,3.8,4][lv])+c2Lv(lv);const mate=d.best&&d.best.h%2===h%2;
    const pick=o.filter(v=>v>0&&v<=Math.floor(team));if(!pick.length||(mate&&pick[0]<d.best.v+2))return ktBid(d,o[0]);return ktBid(d,pick[0]);}
  const L=ktLegal(d,h);
  return ktPlay(d,c2BotWin(d,h,L,lv,{T:d.tr,suit:c=>ktSuit(d,c),str:c=>{const v=ktStr(d,c);return ktSuit(d,c)===d.tr?v+2000:v;},win:tk=>ktWin(d,tk),mate:(a,b)=>a%2===b%2,deck:ktDeck(d.H),draw:d.best.h%2===h%2}));};
GAMES.c_kout.botDelay=GAMES.c_tarneeb.botDelay;

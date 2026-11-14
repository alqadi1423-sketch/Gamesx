'use strict';
/* n-tiles2: traditional tile and card games: أوكي، الدومينو الخمسات، قطار الدومينو، الأحمق، جن رمي، غولف الورق.
   Every top-level name starts with k2/K2. Hands and the stock are hidden online (mask); the stock is shuffled on the host and
   every draw happens inside a click the host replays, so nobody can pick what comes next. */

/* ---------- shared ---------- */
const K2R='A23456789TJQK';
const k2rv=c=>K2R.indexOf(c[0])+1;                       // A 1 .. K 13
const k2Hide=x=>typeof x==='string'?'?'.repeat(x.length):Array.isArray(x)?x.map(k2Hide):x;
const k2Rm=(h,c)=>{const a=cardsOf(h),i=a.indexOf(c);if(i>=0)a.splice(i,1);return a.join('');};
const k2Sort=h=>cardsOf(h).sort((a,b)=>'shdc'.indexOf(a[1])-'shdc'.indexOf(b[1])||k2rv(a)-k2rv(b)).join('');
const K2SN={s:'♠',h:'♥',d:'♦',c:'♣'};
const k2Lab=c=>`<bdi class="k2lab ${'hd'.includes(c[1])?'rs':''}">${c[0]==='T'?'10':c[0]}${K2SN[c[1]]}</bdi>`;
const k2Who=(d,ctx)=>!ctx.local&&d.turn===ctx.v?'<b class="yt">دورك</b>':`دور ${nameTag(d,d.turn)}`;
const k2Prev=(d,s)=>{const n=d.pl.length;for(let k=1;k<n;k++){const p=(s-k+n)%n;if(d.out[p]!=='1')return p;}return s;};
// the seats in a strip: the one on turn lit, each with what the game wants to say about it
function k2Seats(d,f,on){return `<div class="k2seats">${d.pl.map((_,s)=>`<span class="k2seat ${(on?on(s):d.turn===s&&d.win==null)?'on':''} ${d.out[s]==='1'?'done':''}" style="--c:${col(d,s)}"><b>${nm(d,s)}</b>${f(s)}</span>`).join('')}</div>`;}
const k2Btns=(xs,ga)=>`<div class="row k2acts">${xs.map(([i,t,cls,dis])=>`<button class="btn ${cls||''}" data-ga="${ga}" data-i="${i}" ${dis?'disabled':''}>${t}</button>`).join('')}</div>`;
// a selection that belongs to one moment of the game (it is dropped as soon as the hand or the turn changes)
const k2Key=(d,t,h)=>[t,d.gid,d.turn,d.ph||'',(h||'').length].join(':');
const k2Sel=(d,t,h)=>Array.isArray(S.sel)&&S.sel[0]===k2Key(d,t,h)?S.sel.slice(1):[];
const k2Next=(d,txt)=>d.win==null?`<button class="big green k2go" data-ga="next">${txt||'الجولة التالية'}</button>`:'';
// best seats by a score (hi: higher is better); all the seats sharing the best
function k2Best(d,sc,hi){const al=aliveSeats(d);const b=hi?Math.max(...al.map(s=>sc[s])):Math.min(...al.map(s=>sc[s]));return al.filter(s=>sc[s]===b);}
const k2Win=(d,ws)=>({...d,win:ws[0],wins:ws});

/* =================================================================
   أوكي (Okey, the Turkish/Levantine tile rummy; pagat.com rules). 106 tiles: 1-13 in four colours twice, and two false jokers
   (two sets with 5-8 players). A tile turned up is the indicator; the tile of its colour one higher is the okey (13 -> 1), a
   wild tile, and the false jokers stand for the okey's own face. The player after the dealer gets 15 tiles and opens by
   discarding; everyone else holds 14. A turn: take the previous player's discard or the next stock tile, then discard.
   Win by discarding the 15th tile and showing 14 tiles all in sets (3-4 of a number, all colours different) and runs (3+ of a
   colour in order, 12-13-1 allowed, 13-1-2 not), or seven pairs. Everyone starts with 20: a win costs every other player 2,
   a win by discarding the okey or with pairs 4 (both 8), showing the indicator's twin before your first draw costs the
   others 1. A stock that runs out ends the deal with no score. The game ends when a score reaches 0: highest wins.
   ================================================================= */
const K2ON='123456789abcd',K2OC={r:'#CF2E28',y:'#C98A00',b:'#1C6FC0',k:'#1E2B3A'},K2OCN={r:'الأحمر',y:'الأصفر',b:'الأزرق',k:'الأسود'};
const k2on=t=>K2ON.indexOf(t[1])+1;
const k2okOf=ind=>ind[0]+K2ON[k2on(ind)%13];
const k2okSet=n=>{const a=[];for(let s=0;s<(n>4?2:1);s++){for(const c of 'rybk')for(const x of K2ON)a.push(c+x,c+x);a.push('jj','jj');}return a;};
const k2okTiles=h=>cardsOf(h);
// an okey tile drawn on wood-cream plastic: the number in its colour over a little crescent; the false joker a green clover
function k2okFace(t,ok){if(t==='??')return '<svg class="k2tf" viewBox="0 0 30 42" aria-hidden="true"><rect x="1" y="1" width="28" height="40" rx="4" class="bk"/><circle cx="15" cy="21" r="7" class="bk2"/></svg>';
  if(t==='jj')return '<svg class="k2tf" viewBox="0 0 30 42" aria-hidden="true"><rect x="1" y="1" width="28" height="40" rx="4" class="fc"/><g fill="#2E8B57" transform="translate(15 19)"><circle cx="0" cy="-5" r="4.4"/><circle cx="-5" cy="0" r="4.4"/><circle cx="5" cy="0" r="4.4"/><circle cx="0" cy="5" r="4.4"/></g><path d="M15 24v9" stroke="#2E8B57" stroke-width="2" stroke-linecap="round"/></svg>';
  const c=K2OC[t[0]],n=k2on(t);
  return `<svg class="k2tf" viewBox="0 0 30 42" aria-hidden="true"><rect x="1" y="1" width="28" height="40" rx="4" class="fc"/><text x="15" y="22" text-anchor="middle" font-size="${n>9?15:17}" font-weight="900" fill="${c}">${n}</text><path d="M11.5 30a4.3 4.3 0 1 0 7 0a3.4 3.4 0 1 1 -7 0z" fill="${c}"/>${t===ok?'<path d="M22 4l1.3 2.7 3 .4-2.2 2 .5 3-2.6-1.4-2.6 1.4.5-3-2.2-2 3-.4z" fill="#F0B429" stroke="#9A6A00" stroke-width=".5"/>':''}</svg>`;}
const k2okT=(t,ok,cls,attr)=>`<${attr?'button':'div'} class="k2t ${t===ok?'okey':''} ${cls||''}" ${attr||''}>${k2okFace(t,ok)}</${attr?'button':'div'}>`;
/* the meld search: the largest number of tiles that fit in sets and runs (wild okeys fill gaps). Tiles are normalised: a real
   okey tile is a wild '*', a false joker plays as the okey's face. Returns the melds in tile codes and the tiles left over. */
function k2okSolve(tiles,ok,cap){const C='rybk',cnt=[0,1,2,3].map(()=>Array(15).fill(0));let W=0,N=0;
  for(const t of tiles){if(t===ok)W++;else{const u=t==='jj'?ok:t;cnt[C.indexOf(u[0])][k2on(u)]++;N++;}}
  let best={cov:-1,melds:[],dead:[],w:W},nodes=0;const cur=[],dead=[];cap=cap||30000;
  const code=(c,n)=>{const u=C[c]+K2ON[n-1];return u===ok?'jj':u;};
  function go(w,left,cov){if(++nodes>cap)return;
    let f=null;for(let c=0;c<4&&!f;c++)for(let n=1;n<=13;n++)if(cnt[c][n]){f=[c,n];break;}
    if(!f){const tot=cov+(cur.length?w:0);if(tot>best.cov)best={cov:tot,melds:cur.map(m=>m.slice()),dead:dead.slice(),w:cur.length?0:w};return;}
    if(cov+left+w<=best.cov)return;
    const [c,n]=f;cnt[c][n]--;
    // sets: this tile with any other colours of its number, wilds making it up to 3 (or 4)
    const oth=[0,1,2,3].filter(x=>x!==c&&cnt[x][n]);
    for(let m=0;m<(1<<oth.length);m++){const use=oth.filter((_,j)=>m&(1<<j));const k=1+use.length;if(k>4)continue;
      for(let ww=Math.max(0,3-k);ww<=Math.min(w,4-k);ww++){if(k+ww<3)continue;use.forEach(x=>cnt[x][n]--);
        cur.push([code(c,n),...use.map(x=>code(x,n)),...Array(ww).fill('*')]);go(w-ww,left-1-use.length,cov+k+ww);cur.pop();use.forEach(x=>cnt[x][n]++);}}
    // runs of its colour through it: wilds below it (smaller tiles of the colour are gone already), naturals or wilds above
    for(let a=n;a>=Math.max(1,n-w);a--){const below=n-a;let ww=below,used=[],run=[...Array(below).fill('*'),code(c,n)];
      for(let p=n+1;p<=14;p++){if(a===1&&p===14)break;const pn=p===14?1:p;
        if(cnt[c][pn]){cnt[c][pn]--;used.push(pn);run.push(code(c,pn));}else if(ww<w){ww++;run.push('*');}else break;
        if(run.length>=3){cur.push(run.slice());go(w-ww,left-1-used.length,cov+run.length);cur.pop();}}
      used.forEach(pn=>cnt[c][pn]++);}
    // or leave it out
    dead.push(code(c,n));go(w,left-1,cov);dead.pop();cnt[c][n]++;}
  go(W,N,0);best.melds=best.melds.map(m=>m.map(x=>x==='*'?ok:x));return best;}
// seven pairs of identical tiles (a wild okey pairs with anything)
function k2okPairs(tiles,ok){const m={};let w=0;for(const t of tiles){if(t===ok)w++;else{const u=t==='jj'?ok:t;m[u]=(m[u]||0)+1;}}
  let pr=0,single=0;for(const u in m){pr+=Math.floor(m[u]/2);single+=m[u]%2;}const use=Math.min(w,single);return pr+use+Math.floor((w-use)/2);}
const K2OKC={};
function k2okWins(tiles,ok){if(tiles.length!==14)return null;const k=ok+tiles.slice().sort().join('');if(k in K2OKC)return K2OKC[k];
  let r=null;if(k2okSolve(tiles,ok).cov===14)r='m';else if(k2okPairs(tiles,ok)>=7)r='p';
  const ks=Object.keys(K2OKC);if(ks.length>400)delete K2OKC[ks[0]];return K2OKC[k]=r;}
// which tile of a 15-tile hand finishes it (preferring the okey itself for the double win)
function k2okFinish(h,ok){const ts=k2okTiles(h);let got=null;for(const t of [...new Set(ts)]){const r=k2okWins(k2Rm(h,t).match(/.{2}/g)||[],ok);if(r&&(!got||t===ok))got={t,r};}return got;}
function k2okDeal(d){const n=d.pl.length,all=shuffle(k2okSet(n));const ii=all.findIndex(t=>t!=='jj');const ind=all.splice(ii,1)[0];
  const st=nextSeat(d,d.dl),hands=Array(n).fill('');for(let s=0;s<n;s++)if(d.out[s]!=='1')hands[s]=all.splice(0,s===st?15:14).join('');
  return {...d,hands,dk:all.join(''),ind,ok:k2okOf(ind),disc:Array(n).fill(''),ph:'disc',turn:st,fst:'0'.repeat(n),shown:'0'.repeat(n),lt:'',sum:null,last:''};}
const k2okNext=d=>k2okDeal({...d,dl:nextSeat(d,d.dl)});
function k2okEnd(d,w,t,kind){const s=w,hands=[...d.hands];hands[s]=k2Rm(hands[s],t);const byOk=t===d.ok,pay=(kind==='p'?4:2)*(byOk?2:1);
  const pts=d.pts.map((x,k)=>k===s||d.out[k]==='1'?x:x-pay);const arr=kind==='m'?k2okSolve(cardsOf(hands[s]),d.ok).melds:null;
  const nd={...d,hands,disc:d.disc.map((x,k)=>k===s?x+t:x),pts,ph:'sum',sum:{w:s,pay,kind,byOk,arr},turn:s,
    last:`${nameTag(d,s)} قفل${kind==='p'?' بالأزواج':''}${byOk?' ورمى الأوكي':''}! الباقين −${pay}`};
  if(pts.some(x=>x<=0))return k2Win(nd,k2Best(nd,pts,true));return nd;}
function k2okDraw(d,from){const s=d.turn,hands=[...d.hands];let t,dk=d.dk,disc=d.disc;
  if(from==='take'){const p=k2Prev(d,s);t=disc[p].slice(-2);if(!t)return d;disc=disc.map((x,k)=>k===p?x.slice(0,-2):x);}
  else{if(!dk)return {...d,ph:'sum',sum:{w:-1},last:'خلصت الكومة، الجولة بدون نقاط'};t=dk.slice(0,2);dk=dk.slice(2);}
  hands[s]+=t;return {...d,hands,dk,disc,ph:'disc',fst:setAt(d.fst,s,'1'),lt:from==='take'?t:'',last:`${nameTag(d,s)} ${from==='take'?'أخذ الحجر المرمي':'سحب من الكومة'}`};}
function k2okDisc(d,t){const s=d.turn;const hands=[...d.hands];hands[s]=k2Rm(hands[s],t);
  return {...d,hands,disc:d.disc.map((x,k)=>k===s?x+t:x),ph:'draw',fst:setAt(d.fst,s,'1'),turn:nextSeat(d,s),lt:'',last:`${nameTag(d,s)} رمى حجر`};}
function k2okShow(d,s){if(d.fst[s]!=='0'||d.shown[s]!=='0'||!cardsOf(d.hands[s]).includes(d.ind))return d;
  return {...d,shown:setAt(d.shown,s,'1'),pts:d.pts.map((x,k)=>k===s||d.out[k]==='1'?x:x-1),last:`${nameTag(d,s)} ورّى المؤشر، الباقين −1`};}
const k2okCanShow=(d,s)=>d.ph!=='sum'&&d.fst[s]==='0'&&d.shown[s]==='0'&&cardsOf(d.hands[s]||'').includes(d.ind);
// the rack laid out by melds (best arrangement), by colour or by number; the buttons keep the index into the hand
function k2okOrder(h,ok,mode){const ts=k2okTiles(h).map((t,i)=>({t,i}));const key=t=>t==='jj'?ok:t;
  if(mode==='n')return ts.sort((a,b)=>k2on(key(a.t))-k2on(key(b.t))||key(a.t).localeCompare(key(b.t))||(a.t===ok)-(b.t===ok));
  if(mode==='c')return ts.sort((a,b)=>(a.t===ok)-(b.t===ok)||'rybk'.indexOf(key(a.t)[0])-'rybk'.indexOf(key(b.t)[0])||k2on(key(a.t))-k2on(key(b.t)));
  if(ts.some(x=>x.t==='??'))return ts;
  const r=k2okSolve(ts.map(x=>x.t),ok,8000),left=ts.slice(),out=[];
  for(const m of r.melds){for(const c of m){const j=left.findIndex(x=>x.t===c);if(j>=0)out.push(left.splice(j,1)[0]);}out.push(null);}
  return [...out,...left.sort((a,b)=>'rybk'.indexOf(key(a.t)[0])-'rybk'.indexOf(key(b.t)[0])||k2on(key(a.t))-k2on(key(b.t)))];}
GAMES.k_okey={name:'أوكي',cat:'cards',lbc:'#B5651D',teams:'none',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C27A2C"/><rect x="8" y="62" width="84" height="22" rx="5" fill="#7A4718"/><rect x="8" y="62" width="84" height="5" rx="2" fill="#9A5E26"/>${[['r','7',12],['y','8',33],['b','9',54],['jj','',75]].map(([c,n,x],i)=>`<g transform="translate(${x} ${22+(i%2)*3})"><rect width="19" height="40" rx="4" fill="#FFF8E6" stroke="#D9C49A" stroke-width="1.5"/>${c==='jj'?'<g fill="#2E8B57" transform="translate(9.5 18)"><circle cy="-4" r="3.4"/><circle cx="-4" r="3.4"/><circle cx="4" r="3.4"/><circle cy="4" r="3.4"/></g>':`<text x="9.5" y="22" text-anchor="middle" font-size="16" font-weight="900" fill="${K2OC[c]}">${n}</text><circle cx="9.5" cy="31" r="3" fill="${K2OC[c]}"/>`}</g>`).join('')}</svg>`,
  init:n=>({dl:n-1,hands:Array(n).fill(''),dk:'',ind:'r1',ok:'r2',disc:Array(n).fill(''),ph:'disc',pts:Array(n).fill(20),fst:'0'.repeat(n),shown:'0'.repeat(n),lt:'',sum:null,last:''}),
  start:d=>k2okDeal(d),
  mask:(d,v)=>d.win!=null?d:{...d,hands:d.hands.map((h,s)=>s===v||(d.ph==='sum'&&d.sum&&d.sum.w===s)?h:k2Hide(h)),dk:k2Hide(d.dk)},
  redeal:d=>d.win!=null?d:{...k2okDeal(d),last:'انعادت الجولة من جديد'},
  net:{local:['tile','sort']},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.pts.slice(),
  winText:d=>`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بأعلى نقاط (${d.pts[d.win]})`,
  onTimeout(d){if(d.ph==='sum')return k2okNext(d);if(d.ph==='draw')return k2okDraw(d,'stock');const t=d.lt||cardsOf(d.hands[d.turn]).filter(x=>x!==d.ok).pop();return k2okDisc(d,t);},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+k2Who(d,ctx)+(d.ph==='draw'?': اسحب من الكومة أو خذ الحجر المرمي':': ارمِ حجر');},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v&&d.ph!=='sum',ok=d.ok,p=k2Prev(d,d.turn);
    let h=`<div class="k2 k2ok">${k2Seats(d,s=>`<i>${cardsOf(d.hands[s]).length}</i><em>${d.pts[s]}</em>`)}`;
    h+=`<div class="k2felt k2okt"><div class="k2okc"><div class="k2stk"><${my&&d.ph==='draw'?'button data-ga="draw"':'div'} class="k2pile">${k2okT('??',ok)}<small>${d.dk.length/2}</small></${my&&d.ph==='draw'?'button':'div'}><span>الكومة</span></div>
      <div class="k2stk"><div class="k2ind">${k2okT(d.ind,'')}</div><span>المؤشر</span></div><div class="k2stk"><div class="k2ind">${k2okT(ok,ok)}</div><span>الأوكي</span></div></div>
      <div class="k2okd">${d.pl.map((_,s)=>{const top=d.disc[s].slice(-2),take=my&&d.ph==='draw'&&s===p&&top;
        return `<span class="k2dsc ${take?'can':''}" style="--c:${col(d,s)}"><small>${nm(d,s)}</small>${top?`<${take?'button data-ga="take"':'div'} class="k2dt" data-k="dk${s}-${d.disc[s].length}">${k2okT(top,ok)}</${take?'button':'div'}>`:'<i class="k2emp"></i>'}</span>`;}).join('')}</div></div>`;
    if(d.ph==='sum'){const r=d.sum;h+='<div class="panel k2sum">';
      if(r.w<0)h+='<h3>خلصت الكومة بدون قفلة</h3><p>الجولة بدون نقاط</p>';
      else{h+=`<h3>${nameTag(d,r.w)} قفل ${r.kind==='p'?'بسبع أزواج':''}${r.byOk?' برمي الأوكي':''} 🏆</h3><p>كل واحد غيره −${r.pay}</p>`;
        const hs=cardsOf(d.hands[r.w]);if(r.arr&&!hs.includes('??'))h+=`<div class="k2melds">${r.arr.map(m=>`<span class="k2meld">${m.map(t=>k2okT(t,ok,'sm')).join('')}</span>`).join('')}</div>`;
        else if(!hs.includes('??'))h+=`<div class="k2melds"><span class="k2meld">${k2okOrder(d.hands[r.w],ok,'n').map(x=>k2okT(x.t,ok,'sm')).join('')}</span></div>`;}
      h+=`<div class="k2tot">${d.pl.map((_,s)=>`<span style="--c:${col(d,s)}">${nm(d,s)} <b>${d.pts[s]}</b></span>`).join('')}</div>${ctx.my?k2Next(d):''}</div>`;return h+'</div>';}
    if(v<0||d.hands[v]==null)return h+'</div>';
    const hs=d.hands[v],sel=my?k2Sel(d,'ok',hs):[],si=sel.length?sel[0]:-1,mode=S.k2okm||'m';
    const fin=my&&d.ph==='disc'?k2okFinish(hs,ok):null;
    const ids=handIds(cardsOf(hs),'kt'+v+'-');
    h+=`<div class="k2rack">${k2okOrder(hs,ok,mode).map(x=>x?k2okT(x.t,ok,(x.i===si?'sel':'')+(d.lt&&x.t===d.lt&&my?' new':''),`data-ga="tile" data-i="${x.i}" id="${ids[x.i]}"`):'<i class="k2gap"></i>').join('')}</div>`;
    h+=`<div class="k2sorts">${[['m','مجموعات'],['c','ألوان'],['n','أرقام']].map(([k,t])=>`<button class="sm ${mode===k?'go':''}" data-ga="sort" data-i="${'mcn'.indexOf(k)}">${t}</button>`).join('')}</div>`;
    if(my){const st=si>=0?cardsOf(hs)[si]:null,xs=[];
      if(d.ph==='disc'){xs.push([0,st?'ارمِ الحجر':'اختر حجر ترميه','navy',!st]);const w=st?k2okWins(cardsOf(k2Rm(hs,st)),ok):null;if(w)xs.push([1,'اقفل! 🏆','green']);}
      if(k2okCanShow(d,v))xs.push([2,'ورّهم المؤشر (−1 للباقين)','blue']);
      if(d.ph==='draw'&&!d.dk)xs.push([3,'خلصت الكومة','red']);
      h+=k2Btns(xs,'act');if(fin&&!(st&&k2okWins(cardsOf(k2Rm(hs,st)),ok)))h+='<p class="hint k2hint">🔔 عندك قفلة! اختر الحجر الزايد</p>';}
    return h+'</div>';},
  click(a,i,d,ctx){if(a==='sort'){S.k2okm='mcn'[i]||'m';render();return;}
    if(!ctx.my)return;const s=d.turn;if(a==='next'){if(d.ph==='sum')act(k2okNext(d));return;}if(d.ph==='sum')return;const hs=d.hands[s];
    if(a==='tile'){const t=cardsOf(hs)[i];if(!t)return;const sel=k2Sel(d,'ok',hs);S.sel=sel[0]===i?[]:[k2Key(d,'ok',hs),i];render();return;}
    if(a==='draw'){if(d.ph!=='draw')return;S.sel=[];act(k2okDraw(d,'stock'));return;}
    if(a==='take'){if(d.ph!=='draw'||!d.disc[k2Prev(d,s)])return;S.sel=[];act(k2okDraw(d,'take'));return;}
    if(a==='act'){if(i===2){act(k2okShow(d,s));return;}if(i===3){if(d.ph==='draw'&&!d.dk)act(k2okDraw(d,'stock'));return;}
      if(d.ph!=='disc')return;const sel=k2Sel(d,'ok',hs),t=sel.length?cardsOf(hs)[sel[0]]:null;if(!t)return;S.sel=[];
      if(i===1){const w=k2okWins(cardsOf(k2Rm(hs,t)),d.ok);if(w)act(k2okEnd(d,s,t,w));return;}act(k2okDisc(d,t));}}};
HELP.k_okey='أوكي التركية بـ106 حجر: من 1 لين 13 بأربع ألوان (كل حجر مرتين) وحجرين «أوكي مزيّف» عليهم وردة. (من 5 لاعبين وفوق نلعب بطقمين.) ينقلب حجر يسمونه المؤشر، والحجر اللي بعده بنفس اللون هو الأوكي (بعد 13 يرجع 1): الأوكي جوكر يصير أي حجر، وعليه نجمة ذهبية في يدك. الأوكي المزيّف يلعب بقيمة الأوكي نفسه بالضبط. اللي بعد الموزّع ياخذ 15 حجر ويبدأ يرمي، والباقين 14. في دورك: خذ الحجر اللي رماه اللي قبلك أو اسحب من الكومة، وبعدها ارمِ حجر. تقفل لما ترمي الحجر الـ15 وتكون الـ14 الباقية كلها مجموعات: نفس الرقم بألوان مختلفة (3 أو 4)، أو تسلسل بنفس اللون (3 وفوق، و12-13-1 يمشي بس 13-1-2 لا)، أو سبع أزواج متطابقة. الكل يبدأ بـ20 نقطة: لما أحد يقفل ينقص من كل واحد غيره 2، ولو قفل برمي الأوكي أو بالأزواج 4، والاثنين مع بعض 8. لو عندك نفس حجر المؤشر وورّيته قبل أول سحبة لك ينقص من الباقين 1. لو خلصت الكومة الجولة تنعاد بدون نقاط. أول ما توصل نقاط أحد صفر تخلص اللعبة ويفوز صاحب أعلى نقاط. أزرار «مجموعات، ألوان، أرقام» ترتّب لك الحجار بس.';
// the bot: keeps the hand that fits the most tiles in sets and runs (pairs when it has many), takes a discard only when it
// adds a tile to a meld, never throws the okey, and (hard) throws tiles nobody can use any more first
function k2okVal(ts,ok,dead){const r=k2okSolve(ts,ok,6000);let v=r.cov*10;const L=r.dead.map(x=>x==='jj'?ok:x);
  for(let a=0;a<L.length;a++)for(let b=a+1;b<L.length;b++){const x=L[a],y=L[b];if(x===y)v+=1.2;else if(x[1]===y[1])v+=2.2;else if(x[0]===y[0]){const g=Math.abs(k2on(x)-k2on(y));if(g===1)v+=2.6;else if(g===2)v+=1.6;}}
  const pr=k2okPairs(ts,ok);if(pr>=5)v=Math.max(v,pr*19);return v+(dead?-L.reduce((x,t)=>x+(dead[t]||0)*.3,0):0);}
function k2okBestDisc(hs,ok,lv,dead){const ts=cardsOf(hs);const opts=[...new Set(ts)].filter(t=>t!==ok||ts.every(x=>x===ok));
  const sc=opts.map(t=>({t,v:k2okVal(cardsOf(k2Rm(hs,t)),ok,lv===3?dead:null)+(t==='jj'?-6:0)+(lv===1?Math.random()*14:lv===2?Math.random()*4:0)}));
  sc.sort((a,b)=>b.v-a.v);return sc[0];}
GAMES.k_okey.bot=(d,s,lv)=>{if(d.ph==='sum')return k2okNext(d);let nd=d;if(k2okCanShow(d,s))nd=k2okShow(d,s);const ok=d.ok;
  const dead={};for(const x of d.disc)for(const t of cardsOf(x))dead[t]=(dead[t]||0)+1;
  if(nd.ph==='draw'){const p=k2Prev(d,s),top=d.disc[p].slice(-2);
    if(top&&d.dk){const now=k2okVal(cardsOf(d.hands[s]),ok),w=k2okBestDisc(d.hands[s]+top,ok,lv,dead);
      if(top===ok||k2okFinish(d.hands[s]+top,ok)||w.t!==top&&w.v>=now+(lv===1?2:5))return k2okDraw(nd,'take');}
    return k2okDraw(nd,'stock');}
  const hs=d.hands[s],f=k2okFinish(hs,ok);if(f&&(lv>1||Math.random()<.7))return k2okEnd(nd,s,f.t,f.r);
  return k2okDisc(nd,k2okBestDisc(hs,ok,lv,dead).t);};
GAMES.k_okey.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(700);

/* ---------- dominoes: tiles of up to 12 pips, drawn like the domino game in cards.js (same classes) ---------- */
const K2DN='0123456789abc',k2dn=ch=>K2DN.indexOf(ch);
const k2dT=(a,b)=>a<=b?K2DN[a]+K2DN[b]:K2DN[b]+K2DN[a];
const k2dSet=m=>{const a=[];for(let x=0;x<=m;x++)for(let y=x;y<=m;y++)a.push(k2dT(x,y));return a;};
const k2dPip=t=>k2dn(t[0])+k2dn(t[1]);
const k2dDbl=t=>t[0]===t[1];
const K2PIP=(()=>{const c=[[10,10]],d2=[[5,5],[15,15]],c4=[[5,5],[15,5],[5,15],[15,15]],s6=[[5,4],[15,4],[5,10],[15,10],[5,16],[15,16]];
  const r=(xs,ys)=>xs.flatMap(x=>ys.map(y=>[x,y]));
  return [[],c,d2,[...d2,[10,10]],c4,[...c4,[10,10]],s6,[...s6,[10,10]],r([5,15],[3.5,8,12,16.5]),r([4.5,10,15.5],[4.5,10,15.5]),
    [...r([4,16],[3.5,8,12,16.5]),[10,6.5],[10,13.5]],[...r([4,16],[3.5,8,12,16.5]),[10,4.5],[10,10],[10,15.5]],r([4,10,16],[3.5,8,12,16.5])];})();
const K2PC=['#1E2B3A','#1E2B3A','#1E2B3A','#1E2B3A','#1E2B3A','#1E2B3A','#1E2B3A','#7A3E9D','#1C6FC0','#2E8B57','#C0392B','#B7651D','#0F6E6E'];
const k2Half=(n,x,y,col)=>K2PIP[n].map(([a,b])=>`<circle cx="${a+x}" cy="${b+y}" r="${n>9?1.55:n>6?1.75:1.95}"${col?` style="fill:${K2PC[n]}"`:''}/>`).join('');
// t read as written (first half left/top); col: coloured pips by number, as the double-twelve sets have
const k2dH=(t,w,col)=>`<svg class="dsv" viewBox="0 0 40 20" width="${w||48}" aria-hidden="true"><path class="dl" d="M20 2.6V17.4"/><circle class="dp" cx="20" cy="10" r="1.15"/><g class="dpp">${k2Half(k2dn(t[0]),0,0,col)}${k2Half(k2dn(t[1]),20,0,col)}</g></svg>`;
const k2dV=(t,h,col)=>`<svg class="dsv" viewBox="0 0 20 40" height="${h||76}" aria-hidden="true"><path class="dl" d="M2.6 20H17.4"/><circle class="dp" cx="10" cy="20" r="1.15"/><g class="dpp">${k2Half(k2dn(t[0]),0,0,col)}${k2Half(k2dn(t[1]),0,20,col)}</g></svg>`;
// a tile on the table: doubles stand across the line
const k2dOn=(t,cls,col,k)=>`<span class="dom ${k2dDbl(t)?'dbl':''} ${cls||''}"${k?` data-k="${k}"`:''}>${k2dDbl(t)?k2dV(t,44,col):k2dH(t,44,col)}</span>`;
function k2dHand(d,v,legal,my,sel,col,ga){const hs=cardsOf(d.hands[v]||'');const ids=handIds(hs,'kd'+v+'-');
  return `<div class="hand dhand k2dh">${hs.map((t,i)=>t==='??'?`<span class="dom k2dbk" id="${ids[i]}"></span>`:my&&legal.includes(i)?`<button class="dom pick ${sel===i?'sel':''}" id="${ids[i]}" data-ga="${ga||'tile'}" data-i="${i}">${k2dV(t,70,col)}</button>`:`<button class="dom ${my?'dim':''}" id="${ids[i]}" disabled>${k2dV(t,70,col)}</button>`).join('')}</div>`;}
const k2dDeal=(d,m,k)=>{const n=d.pl.length,all=shuffle(k2dSet(m)),hands=Array(n).fill('');for(let s=0;s<n;s++)if(d.out[s]!=='1')hands[s]=all.splice(0,k).join('');return {hands,bone:all.join('')};};
const k2dDraw=(d,s)=>{const j=rnd(d.bone.length/2)*2,t=d.bone.slice(j,j+2),hands=[...d.hands];hands[s]+=t;return {...d,hands,bone:d.bone.slice(0,j)+d.bone.slice(j+2),dt:t};};

/* =================================================================
   الدومينو الخمسات (All Fives with a spinner, pagat.com). Double-six for 2-4 players (9, 7, 5 tiles), double-nine for 5-8.
   The first double played is the spinner: once both its sides are covered its two other sides open, so the layout can have
   four ends. After every tile, if the open ends add up to a multiple of 5 the player scores it (a double at an end counts
   both halves; the spinner counts both ends until both its sides are covered). No playable tile: draw until one plays or the
   boneyard is empty, then pass. Going out scores the others' pips rounded to the nearest 5; a block gives the lowest hand
   the others' pips. Four players play in partnerships (opposite). First to 150.
   ================================================================= */
const K2FV=150;
const k2fSide=(d,s)=>d.tm?d.tm[s]:d.pairs?s%2:s;
const k2fSides=d=>[...new Set(d.pl.map((_,s)=>k2fSide(d,s)))];
const k2fSi=(d,s)=>k2fSides(d).indexOf(k2fSide(d,s));
const k2fMax=n=>n>4?9:6;
const k2fCnt=n=>({2:9,3:7,4:5,5:8,6:7,7:6,8:5})[n]||5;
// the open ends: [end id, value, what it counts]
function k2fEnds(d){const L=cardsOf(d.L);if(!L.length)return [];const si=d.si,e=[];
  if(L.length===1){const t=L[0];return [['l',k2dn(t[0]),k2dDbl(t)?k2dn(t[0])*2:k2dn(t[0])],['r',k2dn(t[1]),k2dDbl(t)?0:k2dn(t[1])]];}
  const lt=L[0],rt=L[L.length-1];e.push(['l',k2dn(lt[0]),k2dDbl(lt)?k2dn(lt[0])*2:k2dn(lt[0])]);e.push(['r',k2dn(rt[1]),k2dDbl(rt)?k2dn(rt[1])*2:k2dn(rt[1])]);
  if(si>0&&si<L.length-1){const sv=k2dn(L[si][0]);for(const [k,A] of [['u',d.U],['d',d.D]]){const a=cardsOf(A);if(!a.length)e.push([k,sv,0]);else{const t=a[a.length-1];e.push([k,k2dn(t[1]),k2dDbl(t)?k2dn(t[1])*2:k2dn(t[1])]);}}}
  return e;}
const k2fSum=d=>k2fEnds(d).reduce((x,e)=>x+e[2],0);
// where tile t may go: a list of end ids
function k2fFits(d,t){if(!d.L)return ['r'];const a=k2dn(t[0]),b=k2dn(t[1]);return k2fEnds(d).filter(e=>e[1]===a||e[1]===b).map(e=>e[0]).filter((x,i,A)=>A.indexOf(x)===i);}
function k2fPlace(d,t,end){const a=k2dn(t[0]),b=k2dn(t[1]);let L=cardsOf(d.L),U=cardsOf(d.U),D=cardsOf(d.D),si=d.si;
  if(!L.length){L=[t];if(k2dDbl(t))si=0;}
  else{const ev=k2fEnds(d).find(e=>e[0]===end)[1];const o=a===ev?K2DN[a]+K2DN[b]:K2DN[b]+K2DN[a];// o[0] touches the end
    if(end==='r'){L.push(o);if(si<0&&k2dDbl(t))si=L.length-1;}
    else if(end==='l'){L.unshift(o[1]+o[0]);if(si>=0)si++;else if(k2dDbl(t))si=0;}
    else if(end==='u')U.push(o);else D.push(o);}
  return {...d,L:L.join(''),U:U.join(''),D:D.join(''),si};}
const k2fRound=x=>Math.round(x/5)*5;
function k2fPlay(d,i,end){const s=d.turn,hs=cardsOf(d.hands[s]),t=hs[i];if(!t||!k2fFits(d,t).includes(end))return d;
  const hands=[...d.hands];hs.splice(i,1);hands[s]=hs.join('');let nd={...k2fPlace(d,t,end),hands,ps:0,lp:{s,t,end},dt:''};
  const sum=k2fSum(nd),got=sum>0&&sum%5===0?sum:0;const sc=[...d.sc];if(got)sc[k2fSi(d,s)]+=got;
  nd={...nd,sc,last:`${nameTag(d,s)} نزّل ${k2dn(t[0])}|${k2dn(t[1])}${got?` وسجّل ${got} 🎯`:''}`};
  if(got&&sc[k2fSi(d,s)]>=K2FV)return k2fEndGame({...nd,ph:'sum',sum:{w:s,add:k2fSides(d).map((_,j)=>j===k2fSi(d,s)?got:0),pips:d.pl.map((_,q)=>k2fPips(nd,q))}},k2fSide(d,s));
  if(!hs.length)return k2fHandEnd(nd,s);
  return {...nd,turn:nextSeat(nd,s)};}
const k2fPips=(d,s)=>cardsOf(d.hands[s]).reduce((x,t)=>x+k2dPip(t),0);
function k2fHandEnd(d,w){const sides=k2fSides(d),sc=[...d.sc];let add=sides.map(()=>0),msg;
  if(w>=0){const tot=d.pl.reduce((x,_,s)=>x+(d.out[s]!=='1'&&k2fSide(d,s)!==k2fSide(d,w)?k2fPips(d,s):0),0);add[k2fSi(d,w)]=k2fRound(tot);msg=`${nameTag(d,w)} خلّص قطعه`;}
  else{const al=aliveSeats(d),bySide=sides.map(t=>al.filter(s=>k2fSide(d,s)===t).reduce((x,s)=>x+k2fPips(d,s),0)),mn=Math.min(...bySide),lo=sides.filter((_,i)=>bySide[i]===mn);
    msg='انقفل اللعب';if(lo.length===1){const i=sides.indexOf(lo[0]);add[i]=k2fRound(bySide.reduce((x,v,j)=>j===i?x:x+v,0));w=al.find(s=>k2fSide(d,s)===lo[0]);}
    else if(lo.length===2&&sides.length===3){const third=bySide.findIndex(v=>v!==mn);const half=k2fRound(bySide[third]/2);lo.forEach(t=>add[sides.indexOf(t)]=half);w=-1;}else w=-1;}
  add.forEach((x,i)=>sc[i]+=x);const nd={...d,sc,ph:'sum',sum:{w,add,pips:d.pl.map((_,s)=>k2fPips(d,s))},last:msg};
  const hi=Math.max(...sc);if(hi>=K2FV){const top=sides.filter((_,i)=>sc[i]===hi);if(top.length===1)return k2fEndGame(nd,top[0]);}
  return nd;}
function k2fEndGame(d,t){const ws=d.pl.map((_,s)=>s).filter(s=>k2fSide(d,s)===t);return k2Win(d,ws);}
function k2fDeal(d){const n=d.pl.length,m=k2fMax(n),x=k2dDeal(d,m,k2fCnt(n));const al=aliveSeats(d);const st=d.lead>=0&&d.out[d.lead]!=='1'?d.lead:al[rnd(al.length)];
  return {...d,...x,L:'',U:'',D:'',si:-1,ps:0,lp:null,dt:'',ph:'play',sum:null,turn:st,last:''};}
const k2fNext=d=>k2fDeal({...d,lead:d.sum&&d.sum.w>=0&&!cardsOf(d.hands[d.sum.w]).length?d.sum.w:-1});
const k2fLegal=(d,s)=>cardsOf(d.hands[s]).map((t,i)=>k2fFits(d,t).length?i:-1).filter(i=>i>=0);
function k2fTable(d){const L=cardsOf(d.L),lp=d.lp;if(!L.length)return '<div class="table k2dtab"><p class="note">أول قطعة تفتح اللعب، وأول دبل يصير «الدوّار»</p><span class="bone"><i></i>المخزن '+d.bone.length/2+'</span></div>';
  const isLp=(arm,i,n)=>!!lp&&(arm==='L'?(lp.end==='l'&&i===0)||(lp.end==='r'&&i===n-1):lp.end===arm&&i===n-1);
  const arm=(A,k,lab)=>{const a=cardsOf(A);return a.length?`<div class="k2arm"><small>${lab}</small><div class="chain" style="direction:ltr">${a.map((t,i)=>k2dOn(t,isLp(k,i,a.length)?'lp':'',false,k+i+t)).join('')}</div></div>`:'';};
  const E=k2fEnds(d),sum=k2fSum(d);
  return `<div class="table k2dtab"><div class="chain" style="direction:ltr">${L.map((t,i)=>k2dOn(t,(i===d.si?'spin ':'')+(isLp('L',i,L.length)?'lp':''),false,'L'+t)).join('')}</div>${arm(d.U,'u','⬆ الفرع الأول')}${arm(d.D,'d','⬇ الفرع الثاني')}
    <div class="ends k2ends" style="direction:ltr">${E.map(e=>`<span>${({l:'يسار',r:'يمين',u:'فرع ١',d:'فرع ٢'})[e[0]]} <b>${e[1]}</b></span>`).join('')}<span class="k2sum5 ${sum%5===0&&sum?'ok':''}">المجموع <b>${sum}</b></span></div>
    <span class="bone"><i></i>المخزن ${d.bone.length/2}</span></div>`;}
const K2FEN={l:'⬅ يسار',r:'يمين ➡',u:'⬆ الفرع ١',d:'⬇ الفرع ٢'};
GAMES.k_fives={name:'الدومينو الخمسات',cat:'cards',lbc:'#6B4F3A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7E5D44"/><circle cx="50" cy="50" r="40" fill="#2E9A62"/><g transform="translate(50 50)">${[0,90].map(r=>`<g transform="rotate(${r})"><rect x="-32" y="-8" width="64" height="16" rx="4" fill="#FFFDF7" stroke="#2D4763" stroke-width="1.5"/></g>`).join('')}<rect x="-9" y="-9" width="18" height="18" rx="3" fill="#F0B429"/></g><text x="50" y="57" font-size="18" font-weight="900" text-anchor="middle" fill="#5A3B00">5</text>${[[25,50],[75,50],[50,25],[50,75]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="#2D4763"/>`).join('')}</svg>`,
  init:n=>({pairs:n===4,hands:Array(n).fill(''),bone:'',L:'',U:'',D:'',si:-1,ps:0,lp:null,dt:'',sc:[],lead:-1,ph:'play',sum:null,last:''}),
  start:d=>{const x={...d,pairs:!d.tm&&d.pl.length===4};return k2fDeal({...x,sc:k2fSides(x).map(()=>0)});},
  mask:(d,v)=>d.win!=null||d.ph==='sum'?d:{...d,hands:d.hands.map((h,s)=>s===v?h:k2Hide(h)),bone:k2Hide(d.bone),dt:d.turn===v?d.dt:''},
  redeal:d=>d.win!=null?d:{...k2fDeal(d),last:'انعادت الجولة من جديد'},
  net:{local:['tile']},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.pl.map((_,s)=>d.sc[k2fSi(d,s)]),
  winText:d=>`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بـ${d.sc[k2fSi(d,d.win)]} نقطة`,
  pass(d){const ps=d.ps+1,nd={...d,ps,last:`${nameTag(d,d.turn)} مرّر`};if(ps>=aliveSeats(d).length)return k2fHandEnd(nd,-1);return {...nd,turn:nextSeat(d,d.turn)};},
  onTimeout(d){if(d.ph==='sum')return k2fNext(d);const L=k2fLegal(d,d.turn);if(L.length){const t=cardsOf(d.hands[d.turn])[L[0]];return k2fPlay(d,L[0],k2fFits(d,t)[0]);}
    if(d.bone)return k2dDraw(d,d.turn);return GAMES.k_fives.pass(d);},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='sum')return s+'انتهت الجولة';return s+k2Who(d,ctx)+` • الهدف ${K2FV}`;},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v,my=ctx.my&&d.turn===v&&d.ph==='play';
    let h=`<div class="k2 k2fv">${k2Seats(d,s=>`<i>${cardsOf(d.hands[s]).length}</i><em>${d.sc[k2fSi(d,s)]}</em>${d.pairs&&!d.tm?`<u>${s%2?'🔷':'🔶'}</u>`:''}`,s=>d.turn===s&&d.ph==='play'&&d.win==null)}${k2fTable(d)}`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel k2sum"><h3>${r&&r.w>=0?nameTag(d,r.w)+(cardsOf(d.hands[r.w]).length?' أقل نقاط':' خلّص قطعه')+' 🏆':'انقفل اللعب بتعادل'}</h3>
      ${d.pl.map((_,s)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>${r?r.pips[s]:0} بالقطع</em><b>${d.sc[k2fSi(d,s)]}</b></div>`).join('')}
      <div class="k2tot">${r?k2fSides(d).map((t,i)=>r.add[i]?`<span style="--c:${col(d,d.pl.findIndex((_,s)=>k2fSide(d,s)===t))}">+${r.add[i]}</span>`:'').join(''):''}</div>${ctx.my?k2Next(d):''}</div>`;return h+'</div>';}
    if(v<0)return h+'</div>';const L=my?k2fLegal(d,v):[],sel=my?k2Sel(d,'fv',d.hands[v]):[],si=sel.length?sel[0]:-1;
    if(my&&si>=0){const t=cardsOf(d.hands[v])[si];h+=k2Btns([...k2fFits(d,t).map(e=>['lrud'.indexOf(e),K2FEN[e],'navy']),[9,'رجوع','soft']],'end');}
    else if(my&&!L.length)h+=k2Btns([[0,d.bone?'اسحب من المخزن':'مرّر',d.bone?'blue':'navy']],d.bone?'draw':'pass');
    h+=`<p class="lbl hlbl">قطعك (${k2fPips(d,v)} نقطة)</p>`+k2dHand(d,v,L,my,si);
    return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.turn;if(a==='next'){if(d.ph==='sum')act(k2fNext(d));return;}if(d.ph!=='play')return;const hs=d.hands[s];
    if(a==='draw'){if(!d.bone||k2fLegal(d,s).length)return;act({...k2dDraw(d,s),last:`${nameTag(d,s)} سحب من المخزن`});return;}
    if(a==='pass'){if(d.bone||k2fLegal(d,s).length)return;act(GAMES.k_fives.pass(d));return;}
    if(a==='tile'){const t=cardsOf(hs)[i];if(!t)return;const f=k2fFits(d,t);if(!f.length)return;if(f.length===1){S.sel=[];act(k2fPlay(d,i,f[0]));return;}S.sel=[k2Key(d,'fv',hs),i];render();return;}
    if(a==='end'){const sel=k2Sel(d,'fv',hs);S.sel=[];if(i===9||!sel.length){render();return;}const e='lrud'[i];if(!e)return;act(k2fPlay(d,sel[0],e));}}};
HELP.k_fives='دومينو الخمسات (أول فايفز): من 2 لين 4 لاعبين بطقم الدبل ستة (9 قطع لكل واحد لو اثنين، 7 لو ثلاثة، 5 لو أربعة)، ومن 5 وفوق بطقم الدبل تسعة. الأربعة يلعبون فريقين: كل اثنين متقابلين (أو حسب الفرق لو شغّلتوها). أول دبل ينلعب يصير «الدوّار»: لما تنلعب قطعة على جنبيه الاثنين ينفتح منه فرعين، فيصير للعب أربع أطراف. بعد كل قطعة تنجمع الأطراف المفتوحة، ولو المجموع من مضاعفات الخمسة (5، 10، 15…) تاخذه نقاط على طول. الدبل في الطرف ينحسب بنصّينه، والدوّار ينحسب بطرفينه لين يتغطى جنبيه. لو ما عندك قطعة تمشي لازم تسحب من المخزن لين تلقى، ولو خلص المخزن تمرّر. اللي يخلّص قطعه ياخذ مجموع نقاط قطع الخصوم مقرّب لأقرب خمسة ويبدأ الجولة الجاية، ولو انقفل اللعب صاحب أقل نقاط ياخذ نقاط الباقين. أول من يوصل 150 يفوز (المشهور بين 150 و250).';
// the bot: the move that scores most now, minus what it hands the next foe (a sum he can make a multiple of 5 from the tiles
// it has not seen), plus a little for dumping heavy tiles and keeping ends it can answer
GAMES.k_fives.bot=(d,s,lv)=>{if(d.ph==='sum')return k2fNext(d);const hs=cardsOf(d.hands[s]),L=k2fLegal(d,s);
  if(!L.length)return d.bone?{...k2dDraw(d,s),last:`${nameTag(d,s)} سحب من المخزن`}:GAMES.k_fives.pass(d);
  const seen=new Set([...hs,...cardsOf(d.L),...cardsOf(d.U),...cardsOf(d.D)].map(t=>k2dT(k2dn(t[0]),k2dn(t[1]))));
  const unseen=k2dSet(k2fMax(d.pl.length)).filter(t=>!seen.has(t));const nx=nextSeat(d,s),foe=k2fSide(d,nx)!==k2fSide(d,s);
  const opts=[];for(const i of L){const t=hs[i];for(const e of k2fFits(d,t)){const nd=k2fPlace(d,t,e),sum=k2fSum(nd);let v=sum%5===0&&sum?sum:0;
    if(lv>1){let risk=0;const p=Math.min(1,cardsOf(d.hands[nx]).length*1.4/Math.max(1,unseen.length));for(const u of unseen)for(const e2 of k2fFits(nd,u)){const s2=k2fSum(k2fPlace(nd,u,e2));if(s2%5===0&&s2)risk=Math.max(risk,s2*p);}v-=foe?risk*.8:-risk*.3;}
    v+=k2dPip(t)*.25+(k2dDbl(t)?1:0);const rest=hs.filter((_,j)=>j!==i);v+=k2fEnds(nd).filter(x=>rest.some(r=>r.includes(K2DN[x[1]]))).length*.6;
    opts.push({i,e,v:v+Math.random()*(lv===1?8:.3)});}}
  const m=lvRand(lv)?pickR(opts):opts.sort((a,b)=>b.v-a.v)[0];return k2fPlay(d,m.i,m.e);};
GAMES.k_fives.botDelay=(d,s,lv)=>d.ph==='sum'?6000:800+rnd(600);

/* =================================================================
   قطار الدومينو (the Mexican Train family; rules as in Wikipedia / Galt). Double-twelve: 15 tiles each up to 4 players, 12 for
   5-6, 10 for 7-8. Round 1 starts from the 12-12 in the station, each later round from the next lower double. Each player has
   a train from the station; the public train is open to everyone. A turn: one tile on your own train, on the public train,
   or on any train with a marker. Cannot play: draw one; if it plays, play it, else pass and put your marker on your train
   (it comes off when you play on it). A double must be covered: its player plays again, and until it is covered nobody may
   play anywhere else (no need when every tile of that number is down). Round ends when someone goes out or nobody can play.
   Pips left are added to your total; lowest total wins. Short game: 4 rounds (12 down to 9), or all 13.
   ================================================================= */
const k2tCnt=n=>n<=4?15:n<=6?12:10;
const k2tEndV=(d,k)=>{const A=k==='m'?d.mx:d.tr[k];return A?k2dn(A[A.length-1]):d.eng;};
// trains seat s may play on now
function k2tTrains(d,s){if(d.dbl)return [d.dbl.k];const ks=['m'];d.pl.forEach((_,o)=>{if(d.out[o]==='1')return;if(o===s||d.mk[o]==='1')ks.push(o);});return ks;}
const k2tFits=(d,s,t)=>k2tTrains(d,s).filter(k=>{const e=k2tEndV(d,k);return k2dn(t[0])===e||k2dn(t[1])===e;});
const k2tLegal=(d,s)=>cardsOf(d.hands[s]).map((t,i)=>k2tFits(d,s,t).length?i:-1).filter(i=>i>=0);
// every tile of number v is down: a double of v needs no cover
const k2tAllDown=(d,v)=>[d.mx,...d.tr].reduce((x,A)=>x+cardsOf(A).filter(t=>t.includes(K2DN[v])).length,0)+(d.eng===v?1:0)>=13;
function k2tPlay(d,i,k){const s=d.turn,hs=cardsOf(d.hands[s]),t=hs[i];if(!t||!k2tFits(d,s,t).includes(k))return d;
  const e=k2tEndV(d,k),o=k2dn(t[0])===e?t:t[1]+t[0];hs.splice(i,1);const hands=[...d.hands];hands[s]=hs.join('');
  let nd={...d,hands,ps:0,dt:'',drew:0,lp:k};
  if(k==='m')nd.mx=d.mx+o;else{nd.tr=d.tr.map((x,j)=>j===k?x+o:x);if(k===s)nd.mk=setAt(d.mk,s,'0');}
  const where=k==='m'?'القطار العام':k===s?'قطاره':`قطار ${nm(d,k)}`;nd.last=`${nameTag(d,s)} نزّل ${k2dn(t[0])}|${k2dn(t[1])} على ${where}`;
  if(!hs.length)return k2tRoundEnd(nd,s);
  if(k2dDbl(t)&&!k2tAllDown(nd,k2dn(t[0]))){nd.dbl={k,v:k2dn(t[0])};nd.last+='، ولازم يتغطى الدبل';return nd;}
  nd.dbl=null;return {...nd,turn:nextSeat(nd,s)};}
function k2tPass(d){const s=d.turn,ps=d.ps+1,nd={...d,ps,drew:0,dt:'',mk:setAt(d.mk,s,'1'),last:`${nameTag(d,s)} ما عنده ومرّر، وقطاره صار مفتوح 🚩`};
  if(!d.bone&&ps>=aliveSeats(d).length)return k2tRoundEnd(nd,-1);return {...nd,turn:nextSeat(d,s)};}
function k2tDrawOne(d){const s=d.turn,nd={...k2dDraw(d,s),drew:1,last:`${nameTag(d,s)} سحب قطعة`};
  // a drawn tile that does not play: the turn is over at once
  return k2tFits(nd,s,nd.dt).length?nd:k2tPass(nd);}
function k2tRoundEnd(d,w){const pips=d.pl.map((_,s)=>cardsOf(d.hands[s]).reduce((x,t)=>x+k2dPip(t),0));const sc=d.sc.map((x,s)=>x+(d.out[s]==='1'?0:pips[s]));
  const nd={...d,sc,ph:'sum',sum:{w,pips},dbl:null,last:w>=0?`${nameTag(d,w)} خلّص قطعه 🚂`:'انقفل اللعب'};
  if(d.rd+1>=d.nr)return k2Win(nd,k2Best(nd,sc,false));return nd;}
function k2tDeal(d){const n=d.pl.length,eng=12-d.rd,all=k2dSet(12).filter(t=>t!==k2dT(eng,eng));const sh=shuffle(all),hands=Array(n).fill('');
  for(let s=0;s<n;s++)if(d.out[s]!=='1')hands[s]=sh.splice(0,k2tCnt(n)).join('');const st=(d.dl+d.rd)%n;
  return {...d,eng,hands,bone:sh.join(''),tr:Array(n).fill(''),mx:'',mk:'0'.repeat(n),dbl:null,ps:0,drew:0,dt:'',lp:null,ph:'play',sum:null,turn:d.out[st]==='1'?nextSeat(d,st):st};}
const k2tNext=d=>k2tDeal({...d,rd:d.rd+1,last:''});
function k2tRow(d,k,v,can){const A=cardsOf(k==='m'?d.mx:d.tr[k]),open=k==='m'||d.mk[k]==='1',lp=d.lp===k;
  const show=A.slice(-4),more=A.length-show.length,need=d.dbl&&d.dbl.k===k;
  const lab=k==='m'?'🚂 القطار العام':`${nm(d,k)}${k===v?' (قطارك)':''}`;
  return `<div class="k2trow ${k===d.turn&&k!=='m'?'on':''} ${need?'need':''}" style="--c:${k==='m'?'#F0B429':col(d,k)}"><span class="k2tlab">${lab}${open&&k!=='m'?' 🚩':''}</span>
    <div class="k2tline">${more?`<em>+${more}</em>`:''}${show.map((t,j)=>k2dOn(t,lp&&j===show.length-1?'lp':'',true,'t'+k+'-'+(more+j))).join('')}<span class="k2tend">${k2tEndV(d,k)}</span></div>
    ${can?`<button class="btn k2here" data-ga="tr" data-i="${k==='m'?99:k}">هنا</button>`:''}</div>`;}
GAMES.k_train={name:'قطار الدومينو',cat:'cards',lbc:'#8E3B2E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#A9483A"/><g fill="#FFFDF7" stroke="#2D4763" stroke-width="1.5">${[0,72,144,216,288].map(r=>`<rect x="-6" y="-44" width="12" height="24" rx="3" transform="translate(50 50) rotate(${r})"/>`).join('')}</g><g>${[0,72,144,216,288].map((r,i)=>`<circle cx="0" cy="-38" r="2.2" fill="${K2PC[8+i%5]}" transform="translate(50 50) rotate(${r})"/><circle cx="0" cy="-26" r="2.2" fill="${K2PC[8+(i+2)%5]}" transform="translate(50 50) rotate(${r})"/>`).join('')}</g><circle cx="50" cy="50" r="14" fill="#F0B429" stroke="#9A6A00" stroke-width="2"/><path d="M42 54h16v-6h-4v-5h-5v5h-7z" fill="#5A3B00"/><circle cx="45" cy="56" r="2" fill="#5A3B00"/><circle cx="55" cy="56" r="2" fill="#5A3B00"/></svg>`,
  init:n=>({dl:0,rd:0,nr:4,eng:12,hands:Array(n).fill(''),bone:'',tr:Array(n).fill(''),mx:'',mk:'0'.repeat(n),dbl:null,ps:0,drew:0,dt:'',lp:null,sc:Array(n).fill(0),ph:'opt',sum:null,last:''}),
  mask:(d,v)=>d.win!=null||d.ph==='sum'?d:{...d,hands:d.hands.map((h,s)=>s===v?h:k2Hide(h)),bone:k2Hide(d.bone),dt:d.turn===v?d.dt:''},
  redeal:d=>d.win!=null||d.ph==='opt'?d:{...k2tDeal(d),last:'انعادت الجولة من جديد'},
  net:{local:['tile']},
  viewer:d=>d.win!=null||d.ph==='opt'?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.sc.slice(),
  winText:d=>`فاز ${(d.wins||[d.win]).map(s=>nm(d,s)).join(' و')} بأقل مجموع (${d.sc[d.win]})`,
  onTimeout(d){if(d.ph==='opt')return k2tDeal({...d,nr:4,dl:d.turn});if(d.ph==='sum')return k2tNext(d);const s=d.turn,L=k2tLegal(d,s);
    if(L.length)return k2tPlay(d,L[0],k2tFits(d,s,cardsOf(d.hands[s])[L[0]])[0]);if(d.bone&&!d.drew)return k2tDrawOne(d);return k2tPass(d);},
  status(d,ctx){const s=d.last?`<small>${d.last}</small><br>`:'';if(d.ph==='opt')return 'كم جولة نلعب؟';if(d.ph==='sum')return s+'انتهت الجولة';
    return s+k2Who(d,ctx)+` • جولة ${d.rd+1} من ${d.nr}`+(d.dbl?' • غطّ الدبل':'');},
  render(d,ctx){const v=ctx.local?d.turn:ctx.v;let h=`<div class="k2 k2tr">${k2Seats(d,s=>`<i>${cardsOf(d.hands[s]).length}</i><em>${d.sc[s]}</em>`,s=>d.turn===s&&d.ph==='play'&&d.win==null)}`;
    if(d.ph==='opt')return h+`<div class="panel k2opt"><h3>قطار الدومينو</h3><p>كل جولة تبدأ من دبل أصغر من اللي قبلها</p>${ctx.my?k2Btns([[4,'قصيرة: 4 جولات','navy'],[13,'كاملة: 13 جولة','blue']],'nr'):'<p class="note">ننتظر اختيار عدد الجولات</p>'}</div></div>`;
    const my=ctx.my&&d.turn===v&&d.ph==='play';const sel=my?k2Sel(d,'tr',d.hands[v]):[],si=sel.length?sel[0]:-1;const st=si>=0?cardsOf(d.hands[v])[si]:null;const can=st?k2tFits(d,v,st):[];
    h+=`<div class="k2felt k2tfelt"><div class="k2hub"><span class="dom dbl eng">${k2dV(k2dT(d.eng,d.eng),48,true)}</span><small>المحطة</small><span class="bone"><i></i>المخزن ${d.bone.length/2}</span></div>${['m',...d.pl.map((_,s)=>s).filter(s=>d.out[s]!=='1')].map(k=>k2tRow(d,k,v,can.includes(k))).join('')}</div>`;
    if(d.ph==='sum'){const r=d.sum;h+=`<div class="panel k2sum"><h3>${r.w>=0?nameTag(d,r.w)+' خلّص قطعه 🚂':'انقفل اللعب'}</h3>${d.pl.map((_,s)=>`<div class="bsr"><span>${nameTag(d,s)}</span><em>+${r.pips[s]}</em><b>${d.sc[s]}</b></div>`).join('')}${ctx.my?k2Next(d):''}</div>`;return h+'</div>';}
    if(v<0)return h+'</div>';const L=my?k2tLegal(d,v):[];
    if(my&&!L.length)h+=k2Btns([[0,d.bone&&!d.drew?'اسحب قطعة':'مرّر وافتح قطارك',d.bone&&!d.drew?'blue':'navy']],d.bone&&!d.drew?'draw':'pass');
    else if(my&&st)h+='<p class="hint k2hint">اختر القطار من فوق (زر «هنا»)</p>';
    h+=`<p class="lbl hlbl">قطعك (${cardsOf(d.hands[v]).reduce((x,t)=>x+k2dPip(t),0)} نقطة)</p>`+k2dHand(d,v,L,my,si,true);return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.turn;
    if(a==='nr'){if(d.ph!=='opt'||![4,13].includes(i))return;act(k2tDeal({...d,nr:i,dl:d.turn}));return;}
    if(a==='next'){if(d.ph==='sum')act(k2tNext(d));return;}if(d.ph!=='play')return;const hs=d.hands[s];
    if(a==='draw'){if(!d.bone||d.drew||k2tLegal(d,s).length)return;act(k2tDrawOne(d));return;}
    if(a==='pass'){if(k2tLegal(d,s).length||(d.bone&&!d.drew))return;act(k2tPass(d));return;}
    if(a==='tile'){const t=cardsOf(hs)[i];if(!t)return;const f=k2tFits(d,s,t);if(!f.length)return;if(f.length===1){S.sel=[];act(k2tPlay(d,i,f[0]));return;}S.sel=[k2Key(d,'tr',hs),i];render();return;}
    if(a==='tr'){const sel=k2Sel(d,'tr',hs);S.sel=[];if(!sel.length)return;act(k2tPlay(d,sel[0],i===99?'m':i));}}};
HELP.k_train='قطار الدومينو بطقم الدبل 12: لين 4 لاعبين كل واحد 15 قطعة، 5 و6 لاعبين 12، 7 و8 لاعبين 10. أول جولة تبدأ من دبل 12 في «المحطة» وكل جولة بعدها من الدبل اللي أصغر منه. كل لاعب عنده قطار يطلع من المحطة، وفيه «القطار العام» يلعب عليه الكل. في دورك نزّل قطعة وحدة: على قطارك، أو على القطار العام، أو على قطار أي لاعب عليه علم 🚩. لو ما عندك اسحب قطعة، ولو مشت نزّلها، ولو ما مشت تمرّر وينحط علم على قطارك فيقدر الكل يلعب عليه، والعلم يشيله أول ما تلعب على قطارك. لو نزّلت دبل لازم يتغطى: تلعب مرة ثانية على نفس الدبل، ولو ما قدرت تسحب، ولو ما مشت تمرّر ويصير على اللي بعدك يغطيه، ومحد يلعب في مكان ثاني لين يتغطى (إلا إذا كل قطع هالرقم نازلة). الجولة تخلص لما أحد يخلّص قطعه أو ينقفل اللعب، وكل واحد تنحسب عليه نقاط قطعه. بعد آخر جولة يفوز صاحب أقل مجموع. تختارون بالبداية: قصيرة 4 جولات أو كاملة 13.';
// longest chain from end e through the tiles (a small search with a node cap)
function k2tChain(ts,e,cap){let best=[],nodes=0;const used=Array(ts.length).fill(false),cur=[];
  const go=x=>{if(++nodes>cap)return;if(cur.length>best.length)best=cur.slice();for(let i=0;i<ts.length;i++){if(used[i])continue;const t=ts[i],a=k2dn(t[0]),b=k2dn(t[1]);if(a!==x&&b!==x)continue;used[i]=true;cur.push(i);go(a===x?b:a);cur.pop();used[i]=false;}};
  go(e);return best;}
// the bot: keeps the longest chain it can build on its own train for itself, plays its other tiles on the public train and
// open trains first (heavy ones first), covers doubles, and (hard) plays on foes' open trains when they are close to out
GAMES.k_train.bot=(d,s,lv)=>{if(d.ph==='opt')return k2tDeal({...d,nr:4,dl:d.turn});if(d.ph==='sum')return k2tNext(d);const hs=cardsOf(d.hands[s]),L=k2tLegal(d,s);
  if(!L.length)return d.bone&&!d.drew?k2tDrawOne(d):k2tPass(d);
  const chain=lv>1?k2tChain(hs,k2tEndV(d,s),4000):[];const opts=[];
  for(const i of L)for(const k of k2tFits(d,s,hs[i])){const t=hs[i];let v=k2dPip(t)*.4;
    if(k===s)v+=chain[0]===i?6:chain.includes(i)?-3:2;else v+=chain.includes(i)?-4:3;
    if(k2dDbl(t)){const rest=hs.filter((_,j)=>j!==i);v+=rest.some(r=>r.includes(t[0]))?5:-6;}
    if(k!=='m'&&k!==s&&lv===3)v+=cardsOf(d.hands[k]).length<=3?2:0;if(d.mk[s]==='1'&&k===s)v+=3;
    opts.push({i,k,v:v+Math.random()*(lv===1?6:.3)});}
  const m=lvRand(lv)?pickR(opts):opts.sort((a,b)=>b.v-a.v)[0];return k2tPlay(d,m.i,m.k);};
GAMES.k_train.botDelay=(d,s,lv)=>d.ph==='sum'?6000:d.ph==='opt'?900:800+rnd(600);

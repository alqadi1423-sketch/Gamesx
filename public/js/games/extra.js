'use strict';
/* reversi for many players, old maid, colour memory */

/* ---------- reversi ---------- */
const RVS={2:8,3:9,4:10,5:11,6:11,7:12,8:12};
const DIR8=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
function revFlips(b,z,i,p){if(b[i]!=='.')return [];const r=Math.floor(i/z),c=i%z,ps=String(p);const out=[];
  for(const [dr,dc] of DIR8){const line=[];let rr=r+dr,cc=c+dc;while(rr>=0&&rr<z&&cc>=0&&cc<z){const v=b[rr*z+cc];if(v==='.')break;if(v===ps){if(line.length)out.push(...line);break;}line.push(rr*z+cc);rr+=dr;cc+=dc;}}
  return out;}
const revAny=(b,z,p)=>{for(let i=0;i<z*z;i++)if(b[i]==='.'&&revFlips(b,z,i,p).length)return true;return false;};
GAMES.rev={name:'عطيل',cat:'board',lbc:'#1F6B4A',onTimeout:d=>{const n=d.pl.length;for(let k=1;k<=n;k++){const s=(d.turn+k)%n;if(d.out[s]!=='1'&&revAny(d.b,d.z,s))return {...d,turn:s};}return {...d,win:mostPts(cntSeat(d.b,n).map((x,s)=>d.out[s]==='1'?-1:x))};},
  // a player left: the turn goes to the first seat from here that can place a disc, or the game ends
  onSkip:d=>d.win!=null?d:GAMES.rev.onTimeout({...d,turn:(d.turn+d.pl.length-1)%d.pl.length}),
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E8B5E"/>${[1,2,3].map(k=>`<path d="M${k*25} 0V100M0 ${k*25}H100" stroke="#1F6B4A" stroke-width="2"/>`).join('')}<circle cx="37.5" cy="37.5" r="10" fill="#fff"/><circle cx="62.5" cy="62.5" r="10" fill="#fff"/><circle cx="62.5" cy="37.5" r="10" fill="#2D4763"/><circle cx="37.5" cy="62.5" r="10" fill="#2D4763"/><circle cx="62.5" cy="12.5" r="10" fill="#EC6158"/></svg>`,
  init:n=>{const z=RVS[n]||12;const b=Array(z*z).fill('.');const m=(z-1)/2;
    if(n===2){const a=Math.floor(m),c=Math.ceil(m);b[a*z+a]='0';b[c*z+c]='0';b[a*z+c]='1';b[c*z+a]='1';}
    else{const cells=[...Array(z*z).keys()].map(i=>({i,r:Math.floor(i/z)-m,c:i%z-m})).sort((x,y)=>(x.r*x.r+x.c*x.c)-(y.r*y.r+y.c*y.c)).slice(0,2*n).sort((x,y)=>Math.atan2(x.r,x.c)-Math.atan2(y.r,y.c));
      cells.forEach((o,k)=>b[o.i]=String(k%n));}
    return {z,b:b.join('')};},
  points:d=>cntSeat(d.b,d.pl.length),status:(d,ctx)=>turnTxt(d,ctx),
  winExtra(d){const c=cntSeat(d.b,d.pl.length);return 'القطع: '+c.map((x,s)=>`${nm(d,s)} ${x}`).join('، ');},
  render(d,ctx){const z=d.z,t=d.turn;
    // last move, kept on this phone only (S.rvL): the cell that was empty in the board seen before and holds a disc now
    let L=S.rvL;if(!L||L.gid!==d.gid||L.b!==d.b){let pl=-1;if(L&&L.gid===d.gid&&L.b.length===d.b.length)for(let i=0;i<d.b.length;i++)if(L.b[i]==='.'&&d.b[i]!=='.'){pl=i;break;}L=S.rvL={gid:d.gid,b:d.b,pl};}
    // a disc is keyed by its owner, so a flipped one is a new node and turns over; a legal cell shows a soft dot in the mover's colour
    return `<div class="cellgrid revb" style="grid-template-columns:repeat(${z},minmax(0,1fr));--c:${col(d,t)}">${[...d.b].map((v,i)=>{
      if(v!=='.')return `<div class="cg rc ${i===L.pl?'last':''}" style="--d:${col(d,+v)}"><i class="rd" data-k="${v}"></i></div>`;
      const ok=ctx.my&&revFlips(d.b,z,i,t).length;return `<button class="cg rc ${ok?'ok':''}" data-ga="m" data-i="${i}" ${ok?'':'disabled'}></button>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const z=d.z,t=d.turn;const f=revFlips(d.b,z,i,t);if(!f.length)return;let b=setAt(d.b,i,String(t));f.forEach(k=>b=setAt(b,k,String(t)));
    let out=d.out;const n=d.pl.length;for(let s=0;s<n;s++)if(out[s]!=='1'&&!b.includes(String(s)))out=setAt(out,s,'1');
    let nx=-1;for(let k=1;k<=n;k++){const s=(t+k)%n;if(out[s]!=='1'&&revAny(b,z,s)){nx=s;break;}}
    const al=aliveSeats(d,out);
    if(nx<0||al.length===1){act({...d,b,out,win:mostPts(cntSeat(b,n).map((x,s)=>out[s]==='1'?-1:x))});return;}
    act({...d,b,out,turn:nx});
  }
};

/* the bot: corners are gold, the squares next to an empty corner are poison, edges are good, and fewer moves left to the
   others is better. Two players: a hard bot looks three moves ahead (the last few empty squares to the end); more players: one ahead */
function revW(z,b,i){const r=Math.floor(i/z),c=i%z,e=x=>x===0||x===z-1;if(e(r)&&e(c))return 100;
  const k=[[0,0],[0,z-1],[z-1,0],[z-1,z-1]].find(([a,q])=>Math.abs(a-r)<=1&&Math.abs(q-c)<=1);
  if(k)return b[k[0]*z+k[1]]==='.'?(r===k[0]||c===k[1]?-20:-40):12;
  if(e(r)||e(c))return 10;return r===1||c===1||r===z-2||c===z-2?-2:1;}
function revMoves(b,z,p){const m=[];for(let i=0;i<z*z;i++)if(b[i]==='.'){const f=revFlips(b,z,i,p);if(f.length)m.push([i,f]);}return m;}
function revPut(b,z,p,i,f){const a=b.split('');a[i]=String(p);for(const k of f)a[k]=String(p);return a.join('');}
function revEval(b,z,me,n,mob){let v=0;for(let i=0;i<z*z;i++){if(b[i]==='.')continue;const w=revW(z,b,i);v+=b[i]===String(me)?w:-w/(n-1);}return v+(mob||0);}
function revAB(b,z,me,p,dep,al,be,end){const ms=revMoves(b,z,p),o=1-p;
  if(!ms.length){const om=revMoves(b,z,o);if(!om.length){const c=cntSeat(b,2);return (c[me]-c[1-me])*1000;}if(!dep)return revEval(b,z,me,2,(p===me?-1:1)*om.length*4);return revAB(b,z,me,o,dep-1,al,be,end);}
  if(!dep){const om=revMoves(b,z,o).length;return revEval(b,z,me,2,(p===me?1:-1)*(ms.length-om)*4);}
  let v=p===me?-1e9:1e9;for(const [i,f] of ms){const x=revAB(revPut(b,z,p,i,f),z,me,o,dep-1,al,be,end);
    if(p===me){if(x>v)v=x;if(v>al)al=v;}else{if(x<v)v=x;if(v<be)be=v;}if(al>=be)break;}return v;}
GAMES.rev.bot=(d,s,lv)=>{const z=d.z,n=d.pl.length,ms=revMoves(d.b,z,s);if(!ms.length)return GAMES.rev.onTimeout(d);
  let pick;if(lvRand(lv))pick=pickR(ms);
  else if(lv===1)pick=ms.sort((a,b)=>b[1].length-a[1].length+Math.random()*3-1.5)[0];
  else if(n===2&&lv===3){const empty=[...d.b].filter(c=>c==='.').length,dep=empty<=7?empty:3;let bv=-1e9;
    for(const [i,f] of ms){const v=revAB(revPut(d.b,z,s,i,f),z,s,1-s,dep-1,-1e9,1e9)+Math.random();if(v>bv){bv=v;pick=[i,f];}}}
  else{const nx=nextSeat(d,s);let bv=-1e9;for(const [i,f] of ms){const b=revPut(d.b,z,s,i,f);const v=revEval(b,z,s,n,lv===3?-revMoves(b,z,nx).length*3:0)+Math.random()*(lv===3?.5:4);if(v>bv){bv=v;pick=[i,f];}}}
  return botDo(d,s,'m',pick[0]);};

/* ---------- old maid ---------- */
function omPairs(cards){const by={};cards.forEach(c=>{(by[c[0]]=by[c[0]]||[]).push(c);});const keep=[];for(const r in by){const a=by[r];if(a.length%2)keep.push(a[a.length-1]);}return keep;}
GAMES.oldmaid={outDone:true,name:'الشايب',cat:'cards',lbc:'#7B3F61',noTimer:true,hide:{seat:['hands']},points:d=>d.hands.map((h,s)=>d.out[s]==='1'?'خلّص ✓':h.length/2+' ورق'),
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#9C527C"/><rect x="18" y="22" width="34" height="50" rx="6" fill="#4AB1E8" stroke="#fff" stroke-width="3" transform="rotate(-12 35 47)"/><rect x="46" y="22" width="36" height="54" rx="6" fill="#fff" transform="rotate(8 64 49)"/><text x="64" y="60" font-size="26" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(8 64 49)">K♠</text></svg>`,
  init:n=>{let hands;do{const dk=shuffle(deck52().filter(c=>!['Kh','Kd','Kc'].includes(c)));const hs=Array(n).fill(0).map(()=>[]);dk.forEach((c,k)=>hs[k%n].push(c));
      hands=hs.map(h=>shuffle(omPairs(h)).join(''));}while(hands.filter(h=>h).length<2);
    return {hands,fin:[],last:''};},
  // whoever is dealt only pairs has finished before the first draw
  start:d=>{let out=d.out;const fin=[];d.hands.forEach((h,s)=>{if(!h){out=setAt(out,s,'1');fin.push(s);}});if(!fin.length)return d;
    return {...d,out,fin,turn:out[d.turn]==='1'?nextSeat(d,d.turn,out):d.turn,last:`${fin.map(s=>nm(d,s)).join(' و')} طلع ورقه كله أزواج وخلّص`};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  winText:d=>d.win!=null&&d.loser!=null?`${nm(d,d.win)} خلّص أول، و${nm(d,d.loser)} علق معه الشايب`:null,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s='';
    if(d.win!=null||v<0)return s;
    const tg=nextSeat(d,d.turn);const my=ctx.my&&d.turn===v;
    // the felt: the next player's cards face down to draw from (or a fan of how many they hold while waiting)
    const th=cardsOf(d.hands[tg]);
    s+=`<div class="omt" style="--c:${col(d,tg)}"><div class="ompr">${d.pr?`<span data-k="p${d.pr}">${cardsOf(d.pr).map(miniCard).join('')}</span><small>زوج ${nm(d,d.pw)} طلع</small>`:''}</div><p class="lbl">${my&&tg!==d.turn?`اسحب ورقة من ${nameTag(d,tg)}`:`ورق ${nameTag(d,tg)}`}</p><div class="hand omfrom">${my&&tg!==d.turn?th.map((c,i)=>`<button class="card back pick" data-ga="take" data-i="${i}" aria-label="ورقة ${i+1}"></button>`).join(''):th.map(()=>'<div class="card back"></div>').join('')}</div></div>`;
    // each card keeps its node (id), so the card just drawn flies in
    s+=`<p class="lbl hlbl">أوراقك</p><div class="hand omhand">${cardsOf(d.hands[v]).map(c=>`<span id="om${v}${c}">${cardHTML(c)}</span>`).join('')||'<span class="note">خلّصت</span>'}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,tg=nextSeat(d,t);if(tg===t)return;const th=cardsOf(d.hands[tg]);const c=th.splice(i,1)[0];if(!c)return;
    const mine=omPairs([...cardsOf(d.hands[t]),c]);const paired=mine.length<cardsOf(d.hands[t]).length+1;
    const hands=[...d.hands];hands[tg]=th.join('');hands[t]=shuffle(mine).join('');let out=d.out,fin=[...d.fin];
    // the pair laid down is public, as at a real table
    const pr=paired?c+cardsOf(d.hands[t]).find(x=>x[0]===c[0]):'';
    for(const s of [t,tg])if(out[s]!=='1'&&!hands[s].length){out=setAt(out,s,'1');fin.push(s);}
    const al=aliveSeats(d,out);
    const last=`${nm(d,t)} سحب من ${nm(d,tg)}${paired?' وطلّع زوج':''}`;
    if(al.length<=1){act({...d,hands,out,fin,pr,pw:t,win:fin[0]??'d',loser:al[0]??null,last});return;}
    act({...d,hands,out,fin,pr,pw:t,turn:nextSeat(d,t,out),last});
  }
};

/* ---------- colour memory ---------- */
const SIM=['#E5483F','#3D8FD8','#3FAE5C','#F0B429'];
GAMES.simon={name:'تحدي الألوان',cat:'mind',lbc:'#3B3F8C',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4B50A8"/><path d="M50 50L50 12A38 38 0 0 1 88 50Z" fill="#E5483F"/><path d="M50 50L88 50A38 38 0 0 1 50 88Z" fill="#3D8FD8"/><path d="M50 50L50 88A38 38 0 0 1 12 50Z" fill="#3FAE5C"/><path d="M50 50L12 50A38 38 0 0 1 50 12Z" fill="#F0B429"/><circle cx="50" cy="50" r="13" fill="#2D4763"/></svg>`,
  init:()=>({seq:'',last:''}),
  status(d,ctx){const ss=S.simon,my=ctx.my;let s=(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx)+`<br><small>طول السلسلة: ${d.seq.length}. كرر السلسلة كاملة وبعدها زيد لون جديد، واللي يغلط يطلع</small>`;
    if(my&&ss)s+='<br><b>'+(ss.phase==='show'?'ركّز…':ss.inp.length<d.seq.length?`كرر (${ss.inp.length} من ${d.seq.length})`:'زيد لون جديد')+'</b>';return s;},
  key:d=>d.gid+':'+d.seq.length+':'+d.turn+':'+d.out,
  render(d,ctx){if(ctx.my&&(!S.simon||S.simon.key!==this.key(d)))S.simon={key:this.key(d),phase:d.seq.length?'show':'input',inp:[],run:false};
    const ok=ctx.my&&S.simon&&S.simon.phase==='input',lit=ctx.my&&S.simon?S.simon.lit:null;
    // a round device: four pads around a hub that shows the sequence's length; a lit pad brightens and glows
    return `<div class="simon ${ok?'in':''}">${SIM.map((c,k)=>`<button class="simp s${k} ${k===lit?'on':''}" data-ga="p" data-i="${k}" style="--c:${c}" ${ok?'':'disabled'} aria-label="لون ${k+1}"></button>`).join('')}<div class="shub"><b>${d.seq.length}</b></div></div>`;},
  after(d,ctx){const ss=S.simon;if(!ctx.my||!ss||ss.phase!=='show'||ss.run||app.querySelector('.cover'))return;ss.run=true;const key=ss.key;const seq=[...d.seq].map(Number);let k=0;
    const flash=()=>{if(!S.simon||S.simon.key!==key)return;if(k>=seq.length){S.simon.phase='input';S.simon.lit=null;render();return;}
      S.simon.lit=seq[k];render();
      const on=Math.max(280,520-seq.length*18),off=Math.max(120,220-seq.length*8);
      setTimeout(()=>{if(!S.simon||S.simon.key!==key)return;S.simon.lit=null;render();k++;setTimeout(flash,off);},on);};
    setTimeout(flash,500);},
  click(a,k,d,ctx){const ss=S.simon;if(!ctx.my||!ss||ss.phase!=='input')return;const t=d.turn;const pos=ss.inp.length;
    const tap=ss.tap=(ss.tap||0)+1;ss.lit=k;setTimeout(()=>{if(S.simon===ss&&ss.tap===tap){ss.lit=null;render();}},180);
    if(pos<d.seq.length){if(+d.seq[pos]!==k){const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);S.simon=null;
        act({...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),last:`${nm(d,t)} غلط عند اللون ${pos+1} وطلع`});return;}
      ss.inp.push(k);render();return;}
    S.simon=null;act({...d,seq:d.seq+k,turn:nextSeat(d,t),last:`${nm(d,t)} كرر ${d.seq.length} وزاد لون`});}
};

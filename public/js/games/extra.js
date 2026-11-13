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
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E8B5E"/>${[1,2,3].map(k=>`<path d="M${k*25} 0V100M0 ${k*25}H100" stroke="#1F6B4A" stroke-width="2"/>`).join('')}<circle cx="37.5" cy="37.5" r="10" fill="#fff"/><circle cx="62.5" cy="62.5" r="10" fill="#fff"/><circle cx="62.5" cy="37.5" r="10" fill="#2D4763"/><circle cx="37.5" cy="62.5" r="10" fill="#2D4763"/><circle cx="62.5" cy="12.5" r="10" fill="#EC6158"/></svg>`,
  init:n=>{const z=RVS[n]||12;const b=Array(z*z).fill('.');const m=(z-1)/2;
    if(n===2){const a=Math.floor(m),c=Math.ceil(m);b[a*z+a]='0';b[c*z+c]='0';b[a*z+c]='1';b[c*z+a]='1';}
    else{const cells=[...Array(z*z).keys()].map(i=>({i,r:Math.floor(i/z)-m,c:i%z-m})).sort((x,y)=>(x.r*x.r+x.c*x.c)-(y.r*y.r+y.c*y.c)).slice(0,2*n).sort((x,y)=>Math.atan2(x.r,x.c)-Math.atan2(y.r,y.c));
      cells.forEach((o,k)=>b[o.i]=String(k%n));}
    return {z,b:b.join('')};},
  points:d=>cntSeat(d.b,d.pl.length),status:(d,ctx)=>turnTxt(d,ctx),
  winExtra(d){const c=cntSeat(d.b,d.pl.length);return 'القطع: '+c.map((x,s)=>`${nm(d,s)} ${x}`).join('، ');},
  render(d,ctx){const z=d.z,t=d.turn;
    return `<div class="cellgrid" style="grid-template-columns:repeat(${z},minmax(0,1fr));background:#1F6B4A;gap:2px">${[...d.b].map((v,i)=>{
      if(v!=='.')return `<div class="cg" style="background:#2E8B5E;padding:8%">${disc(col(d,+v))}</div>`;
      const ok=ctx.my&&revFlips(d.b,z,i,t).length;return `<button class="cg" style="background:#2E8B5E;padding:30%" data-ga="m" data-i="${i}" ${ok?'':'disabled'}>${ok?`<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${col(d,t)}" opacity=".45"/></svg>`:''}</button>`;}).join('')}</div>`;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const z=d.z,t=d.turn;const f=revFlips(d.b,z,i,t);if(!f.length)return;let b=setAt(d.b,i,String(t));f.forEach(k=>b=setAt(b,k,String(t)));
    let out=d.out;const n=d.pl.length;for(let s=0;s<n;s++)if(out[s]!=='1'&&!b.includes(String(s)))out=setAt(out,s,'1');
    let nx=-1;for(let k=1;k<=n;k++){const s=(t+k)%n;if(out[s]!=='1'&&revAny(b,z,s)){nx=s;break;}}
    const al=aliveSeats(d,out);
    if(nx<0||al.length===1){act({...d,b,out,win:mostPts(cntSeat(b,n).map((x,s)=>out[s]==='1'?-1:x))});return;}
    act({...d,b,out,turn:nx});
  }
};

/* ---------- old maid ---------- */
function omPairs(cards){const by={};cards.forEach(c=>{(by[c[0]]=by[c[0]]||[]).push(c);});const keep=[];for(const r in by){const a=by[r];if(a.length%2)keep.push(a[a.length-1]);}return keep;}
GAMES.oldmaid={name:'الشايب',cat:'cards',lbc:'#7B3F61',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#9C527C"/><rect x="18" y="22" width="34" height="50" rx="6" fill="#4AB1E8" stroke="#fff" stroke-width="3" transform="rotate(-12 35 47)"/><rect x="46" y="22" width="36" height="54" rx="6" fill="#fff" transform="rotate(8 64 49)"/><text x="64" y="60" font-size="26" font-weight="800" fill="#2D4763" text-anchor="middle" transform="rotate(8 64 49)">K♠</text></svg>`,
  init:n=>{const dk=shuffle(deck52().filter(c=>!['Kh','Kd','Kc'].includes(c)));const hands=Array(n).fill(0).map(()=>[]);dk.forEach((c,k)=>hands[k%n].push(c));
    return {hands:hands.map(h=>shuffle(omPairs(h)).join('')),fin:[],last:''};},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  winText:d=>d.win!=null&&d.loser!=null?`${nm(d,d.win)} خلّص أول، و${nm(d,d.loser)} علق معه الشايب`:null,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s=`<div class="score" style="gap:4px">${d.pl.map((r,i)=>`<span class="chip" style="background:${col(d,i)};opacity:${d.out[i]==='1'?.4:1}">${!ctx.local&&i===ctx.v?'أنت':nm(d,i)} ${d.hands[i].length/2}${d.out[i]==='1'?' ✓':''}</span>`).join('')}</div>`;
    if(d.win!=null||v<0)return s;
    const tg=nextSeat(d,d.turn);const my=ctx.my&&d.turn===v;
    if(my&&tg!==d.turn)s+=`<p class="lbl" style="text-align:center">اسحب ورقة من ${nameTag(d,tg)}</p><div class="hand">${cardsOf(d.hands[tg]).map((c,i)=>`<button class="card back pick" data-ga="take" data-i="${i}"></button>`).join('')}</div>`;
    s+=`<p class="lbl" style="text-align:center">أوراقك</p><div class="hand">${cardsOf(d.hands[v]).map(c=>cardHTML(c)).join('')||'<span class="note">خلّصت</span>'}</div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,tg=nextSeat(d,t);if(tg===t)return;const th=cardsOf(d.hands[tg]);const c=th.splice(i,1)[0];if(!c)return;
    const mine=omPairs([...cardsOf(d.hands[t]),c]);const paired=mine.length<cardsOf(d.hands[t]).length+1;
    const hands=[...d.hands];hands[tg]=th.join('');hands[t]=shuffle(mine).join('');let out=d.out,fin=[...d.fin];
    for(const s of [t,tg])if(out[s]!=='1'&&!hands[s].length){out=setAt(out,s,'1');fin.push(s);}
    const al=aliveSeats(d,out);
    const last=`${nm(d,t)} سحب من ${nm(d,tg)}${paired?' وطلّع زوج':''}`;
    if(al.length<=1){act({...d,hands,out,fin,win:fin[0]??'d',loser:al[0]??null,last});return;}
    act({...d,hands,out,fin,turn:nextSeat(d,t,out),last});
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
    const ok=ctx.my&&S.simon&&S.simon.phase==='input';
    return `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;width:min(100%,320px)">${SIM.map((c,k)=>`<button class="simp" data-ga="p" data-i="${k}" style="aspect-ratio:1;border-radius:${['14px 160px 14px 14px','160px 14px 14px 14px','14px 14px 160px 14px','14px 14px 14px 160px'][k]};background:${c};opacity:.75;transition:opacity .15s,transform .15s" ${ok?'':'disabled'}></button>`).join('')}</div>`;},
  after(d,ctx){const ss=S.simon;if(!ctx.my||!ss||ss.phase!=='show'||ss.run||app.querySelector('.cover'))return;ss.run=true;const key=ss.key;const seq=[...d.seq].map(Number);let k=0;
    const flash=()=>{if(!S.simon||S.simon.key!==key)return;if(k>=seq.length){S.simon.phase='input';render();return;}
      const el=app.querySelectorAll('.simp')[seq[k]];if(el){el.style.opacity='1';el.style.transform='scale(1.06)';}
      setTimeout(()=>{const e2=app.querySelectorAll('.simp')[seq[k]];if(e2){e2.style.opacity='.75';e2.style.transform='';}k++;setTimeout(flash,220);},520);};
    setTimeout(flash,500);},
  click(a,k,d,ctx){const ss=S.simon;if(!ctx.my||!ss||ss.phase!=='input')return;const t=d.turn;const pos=ss.inp.length;
    const el=app.querySelectorAll('.simp')[k];if(el){el.style.opacity='1';setTimeout(()=>{el.style.opacity='.75';},180);}
    if(pos<d.seq.length){if(+d.seq[pos]!==k){const out=setAt(d.out,t,'1');const al=aliveSeats(d,out);S.simon=null;
        act({...d,out,win:al.length===1?al[0]:null,turn:nextSeat(d,t,out),last:`${nm(d,t)} غلط عند اللون ${pos+1} وطلع`});return;}
      ss.inp.push(k);render();return;}
    S.simon=null;act({...d,seq:d.seq+k,turn:nextSeat(d,t),last:`${nm(d,t)} كرر ${d.seq.length} وزاد لون`});}
};

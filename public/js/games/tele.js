'use strict';
/* «ارسم وخمّن»: everyone writes a sentence, the next player draws it, the next guesses the drawing,
   and so on. Each player keeps what they made in their own private part; at the end everyone sees every chain. */

const DRC=['#2D4763','#E5483F','#3D8FD8','#3FAE5C','#F0B429','#8E44AD'];
const DALP='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const DMAX=700; // points per drawing, keeps every message small
const encDraw=st=>st.filter(s=>s.p.length).map(s=>s.c+s.p.map(([x,y])=>DALP[x]+DALP[y]).join('')).join('.');
const decDraw=str=>!str?[]:String(str).split('.').map(t=>({c:+t[0]||0,p:(t.slice(1).match(/../g)||[]).map(q=>[DALP.indexOf(q[0]),DALP.indexOf(q[1])])}));
const strokeSVG=s=>s.p.length===1?`<circle cx="${s.p[0][0]}" cy="${s.p[0][1]}" r="0.9" fill="${DRC[s.c]}"/>`:`<polyline points="${s.p.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${DRC[s.c]}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const drawSVG=str=>`<svg viewBox="0 0 63 63" class="drw">${decDraw(str).map(strokeSVG).join('')}</svg>`;
const teleRounds=n=>n<=3?4:Math.min(n,8);
const teleHist=(d,seat,r)=>{const p=S.priv[d.pl[seat]];return p&&p.gid===d.gid&&p.hist?p.hist[r]:undefined;};
function teleDraw(d,v){const k=d.gid+':'+d.rd+':'+v;if(!S.dr||S.dr.key!==k)S.dr={key:k,strokes:[],c:0};return S.dr;}

GAMES.tele={name:'ارسم وخمّن',cat:'quiz',lbc:'#D35400',noTimer:true,
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E67E22"/><rect x="14" y="16" width="72" height="56" rx="8" fill="#fff"/><path d="M24 58c8-20 16-22 22-8s14 10 20-12" stroke="#2D4763" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="66" cy="32" r="6" fill="#F0B429"/><path d="M60 80l22-22 6 6-22 22h-6z" fill="#2D4763"/></svg>`,
  init:n=>({rd:0,R:teleRounds(n),res:''}),
  privInit:()=>({hist:{}}),
  viewer:d=>simulViewer(d),coverMsg:()=>'',
  winText:()=>'خلصت! شوفوا وش صار للجمل 😂',
  status(d,ctx){if(d.win!=null)return '';const r=d.rd;const what=r===0?'اكتب جملة':r%2?'ارسم الجملة':'خمّن الرسمة';
    return simulStatus(d,ctx,`<small>خطوة ${r+1} من ${d.R}: ${what}</small><br>`);},
  render(d,ctx){
    if(d.win!=null)return this.album(d);
    if(!ctx.my)return ctx.v>=0&&hasPicked(d,ctx.v)?'<div class="spd"><div class="spdt">✓ أرسلت</div><p class="note">ننتظر الباقين</p></div>':'';
    const r=d.rd,n=d.pl.length,v=ctx.v,prevSeat=(v-1+n)%n,prev=r>0?teleHist(d,prevSeat,r-1):null;
    if(r===0)return `<div class="qbox" style="font-size:20px">اكتب جملة، واللي بعدك بيرسمها ✏️</div><input class="field" data-draft="tw" maxlength="80" value="${escH(S.draft.tw||'')}" placeholder="مثلًا: قطوة تشرب شاي على القمر" autocomplete="off"><button class="btn red wide" data-ga="send">أرسل</button>`;
    if(r%2){const st=teleDraw(d,v);
      return `<div class="qbox" style="font-size:20px"><small style="font-size:14px;color:var(--mut)">ارسم هذي الجملة:</small><br>${prev?escH(prev):'(ما وصلت جملة، ارسم أي شي يعجبك)'}</div>
      <svg viewBox="0 0 63 63" class="drw pad" id="pad">${st.strokes.map(strokeSVG).join('')}</svg>
      <div class="tools">${DRC.map((c,k)=>`<button class="tcol ${st.c===k?'on':''}" style="background:${c}" data-ga="col" data-i="${k}"></button>`).join('')}<button class="sm" data-ga="undo">↶ تراجع</button><button class="sm" data-ga="clr">مسح</button></div>
      <button class="btn red wide" data-ga="send" ${st.strokes.length?'':'disabled'}>خلصت الرسمة</button>`;}
    return `<div class="qbox" style="font-size:20px">وش هذي الرسمة؟ 🤔</div>${prev?drawSVG(prev):'<p class="note">(ما وصلت رسمة، اكتب أي جملة)</p>'}
      <input class="field" data-draft="tw" maxlength="80" value="${escH(S.draft.tw||'')}" placeholder="اكتب تخمينك" autocomplete="off"><button class="btn red wide" data-ga="send">أرسل</button>`;
  },
  album(d){const n=d.pl.length;let s='<div class="album">';
    for(let c=0;c<n;c++){s+=`<div class="chainc"><h3>قصة ${nameTag(d,c)}</h3>`;
      for(let r=0;r<d.R;r++){const seat=(c+r)%n;const x=teleHist(d,seat,r);
        s+=`<div class="step"><small style="color:${col(d,seat)}">${nm(d,seat)} ${r===0?'كتب':r%2?'رسم':'خمّن'}</small>${r%2?(x?drawSVG(x):'<p class="note">(ما رسم)</p>'):`<div class="bub">${x?escH(x):'…'}</div>`}</div>`;}
      s+='</div>';}
    return s+'</div>';},
  click(a,i,d,ctx){if(!ctx.my)return;const v=ctx.v;
    if(d.rd%2){const st=teleDraw(d,v);
      if(a==='col'){st.c=i;render();return;}
      if(a==='undo'){st.strokes.pop();render();return;}
      if(a==='clr'){st.strokes=[];render();return;}}
    if(a!=='send')return;let content;
    if(d.rd%2){const st=teleDraw(d,v);if(!st.strokes.length)return;content=encDraw(st.strokes);}
    else{content=String(S.draft.tw||'').trim().slice(0,80);if(!content){toast('اكتب شي أول');return;}delete S.draft.tw;}
    const r=d.pl[v];const p=S.priv[r]||{};setPriv(r,{...p,gid:d.gid,rd:d.rd,pick:1,hist:{...(p.gid===d.gid&&p.hist||{}),[d.rd]:content}});
  },
  resolve(d,picks){const rd=d.rd+1;return {...d,rd,win:rd>=d.R?'d':null};},
  after(d,ctx){const pad=document.getElementById('pad');if(!pad||!ctx.my||pad._on)return;pad._on=1;const st=teleDraw(d,ctx.v);
    const total=()=>st.strokes.reduce((a,s)=>a+s.p.length,0);
    const pt=e=>{const b=pad.getBoundingClientRect();return [Math.max(0,Math.min(63,Math.round((e.clientX-b.left)/b.width*63))),Math.max(0,Math.min(63,Math.round((e.clientY-b.top)/b.height*63)))];};
    let cur=null,el=null;
    pad.addEventListener('pointerdown',e=>{if(total()>=DMAX){toast('الرسمة وصلت حدها');return;}e.preventDefault();pad.setPointerCapture(e.pointerId);S.holdRender=true;
      cur={c:st.c,p:[pt(e)]};st.strokes.push(cur);el=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      el.setAttribute('fill','none');el.setAttribute('stroke',DRC[cur.c]);el.setAttribute('stroke-width','1.4');el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');
      el.setAttribute('points',cur.p.map(p=>p.join(',')).join(' '));pad.appendChild(el);});
    pad.addEventListener('pointermove',e=>{if(!cur)return;const p=pt(e),l=cur.p[cur.p.length-1];if(p[0]===l[0]&&p[1]===l[1])return;if(total()>=DMAX)return;cur.p.push(p);el.setAttribute('points',cur.p.map(q=>q.join(',')).join(' '));});
    const end=()=>{if(!cur)return;cur=null;el=null;S.holdRender=false;render();};
    pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
  }
};

/* ---------- «وين شخصيتك؟»: every player's character hides under a cup, the cups shuffle, pick yours ---------- */
GAMES.cups={...spdBase({name:'وين شخصيتك؟',lbc:'#6C3483',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#884EA0"/>${[18,50,82].map((x,k)=>`<path d="M${x-13} 72L${x-9} 34H${x+9}L${x+13} 72Z" fill="${k===1?'#F5B041':'#F8C471'}" stroke="#6E2C00" stroke-width="2"/>`).join('')}<circle cx="50" cy="84" r="7" fill="#EC6158"/></svg>`,
  title:'شخصيتك بتنحط تحت كوب، والأكواب بتتحرك. ركّز ووين ما وقفت اختار كوبها',
  start(d,st){st.phase='show';st.run=false;},
  view(d,ctx,st){const P=GAMES.cups.plan(d);const m=P.m;const me=ctx.v;
    const pos=st.phase==='go'?P.end:P.start;
    return `<div class="cupsw"><div class="cups" id="cups">${Array(m).fill(0).map((_,k)=>{const ch=k<d.pl.length?d.pl[k]:-1;
      return `<button class="cupb" data-ga="pick" data-i="${k}" style="left:${pos[k]*(100/m)}%;width:${100/m}%" ${st.phase==='go'?'':'disabled'}><span class="cupc">${ch>=0?`<i style="background:${COLS[ch]}">${pname(ch).replace(/&[^;]+;/g,'').charAt(0)}</i>`:''}</span><span class="cup"></span></button>`;}).join('')}</div></div>
      <p class="note">${st.phase==='go'?'اختار الكوب اللي تحته شخصيتك':'ركّز على شخصيتك'} <b style="color:${col(d,me)}">●</b></p>`;},
  click(a,k,d,ctx,st){if(a!=='pick'||st.phase!=='go')return;const P=GAMES.cups.plan(d);spdSubmit(d,ctx,k===ctx.v);}}),
  plan(d){const m=d.pl.length+1+(d.rd>2?1:0);const R=srng(d,'cup'+d.rd);const start=[...Array(m).keys()];const pos=[...start];const swaps=[];
    const nsw=6+d.rd*3;for(let i=0;i<nsw;i++){let a=Math.floor(R()*m),b=Math.floor(R()*(m-1));if(b>=a)b++;swaps.push([a,b]);
      const ka=pos.indexOf(a),kb=pos.indexOf(b);pos[ka]=b;pos[kb]=a;}
    return {m,start,end:pos,swaps,speed:Math.max(220,520-d.rd*70)};},
  resolve(d,picks){const pts=[...d.pts];const ok=[];picks.forEach((p,s)=>{if(p&&p.ok){pts[s]++;ok.push(nm(d,s));}});const rd=d.rd+1;
    return {...d,pts,rd,res:ok.length?`لقوا شخصياتهم: ${ok.join('، ')}`:'محد لقى شخصيته 😅',win:rd>=SPD_ROUNDS?mostPts(pts):null};},
  after(d,ctx){if(!ctx.my)return;const st=spdState(d,ctx.v);if(st.phase!=='show'||st.run)return;const box=document.getElementById('cups');if(!box)return;st.run=true;S.holdRender=true;
    const P=GAMES.cups.plan(d);const cups=[...box.querySelectorAll('.cupb')];const pos=[...P.start];const m=P.m;
    box.classList.add('lift');
    const place=()=>cups.forEach((c,k)=>{c.style.left=(pos[k]*(100/m))+'%';});
    let i=0;const step=()=>{if(!S.sp||S.sp.key!==st.key){S.holdRender=false;return;}
      if(i>=P.swaps.length){setTimeout(()=>{st.phase='go';st.t0=performance.now();S.holdRender=false;render();},300);return;}
      const [a,b]=P.swaps[i++];const ka=pos.indexOf(a),kb=pos.indexOf(b);pos[ka]=b;pos[kb]=a;cups.forEach(c=>c.style.transitionDuration=P.speed+'ms');place();setTimeout(step,P.speed+40);};
    setTimeout(()=>{box.classList.remove('lift');setTimeout(step,500);},1600);}
};

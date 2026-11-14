'use strict';
/* combat games: arena brawl, tank artillery, dice wars, sword duel, tapping battle */

function fighterSVG(c,pose){
  const dk=shade(c,-.32),lt=shade(c,.4),O='stroke="#1F2A36" stroke-width="1.5" stroke-linejoin="round"';
  const def=pose==='def',atk=pose==='atk'||pose==='spc';
  const shield=`<path d="M0 0H15V12C15 18 7.5 22 7.5 22S0 18 0 12Z" fill="${c}" ${O}/><path d="M7.5 3V18M2.5 9H12.5" stroke="#F0B429" stroke-width="2"/>`;
  const sword=`<path d="M0 0L2 -27L4 0Z" fill="${pose==='spc'?'#FFE08A':'#DDE3E8'}" stroke="#1F2A36" stroke-width="1.2"/><rect x="-3" y="0" width="10" height="3" rx="1.5" fill="#6B4B2E"/><rect x="0.6" y="3" width="2.8" height="6" fill="#3B2A1A"/>`;
  return `<svg viewBox="0 0 80 84" class="fsvg ${pose||''}">
  ${pose==='heal'?'<circle cx="40" cy="44" r="34" fill="#3FAE5C" opacity=".18"/><text x="10" y="22" font-size="11" fill="#3FAE5C" font-weight="900">+</text><text x="64" y="30" font-size="13" fill="#3FAE5C" font-weight="900">+</text>':''}
  ${pose==='spc'?'<circle cx="40" cy="44" r="34" fill="#F5B041" opacity=".22"/>':''}
  <ellipse cx="40" cy="80" rx="22" ry="3.5" fill="rgba(0,0,0,.18)"/>
  <path d="M27 34L19 70Q40 64 61 70L53 34Z" fill="${dk}"/>
  <path d="M32 58L30 76H37.5L39.5 60M40.5 60L42.5 76H50L48 58" fill="#3B4A5C" ${O}/><path d="M28 76H38.5V79.5H27ZM41.5 76H52V79.5H41.5Z" fill="#1F2A36"/>
  <path d="M27 36Q40 30 53 36L51 60H29Z" fill="${c}" ${O}/><path d="M33 38Q40 35 47 38L46 51H34Z" fill="${lt}" opacity=".55"/>
  <rect x="29" y="55.5" width="22" height="4.5" rx="2" fill="#6B4B2E"/><rect x="37.8" y="55" width="4.4" height="5.5" rx="1" fill="#F0B429"/>
  <circle cx="40" cy="24" r="10" fill="#F2D2B6" ${O}/>
  <path d="M29.5 25C28.5 12 51.5 12 50.5 25L50.5 21C50.5 9.5 29.5 9.5 29.5 21Z" fill="#B7C2CC" ${O}/><path d="M30 21.5H50V24.5H30Z" fill="#7F8C99"/>
  <path d="M40 11C40 6 44 3 48 4C45 5 43 8 43 11" fill="${c}" ${O}/>
  <circle cx="36" cy="27.5" r="1.4" fill="#1F2A36"/><circle cx="44" cy="27.5" r="1.4" fill="#1F2A36"/><path d="M37 31.5Q40 ${pose==='dead'?'30':'33'} 43 31.5" stroke="#1F2A36" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <g transform="${def?'translate(32.5 34)':'translate(12 38)'}">${shield}</g>
  <g class="sw" transform="${atk?'translate(56 40) rotate(-62)':'translate(56 46) rotate(8)'}">${sword}</g>
  <circle cx="${atk?56:57}" cy="${atk?41:47}" r="3" fill="#F2D2B6" ${O}/></svg>`;
}

/* ---------- arena brawl (everyone picks an action at once) ---------- */
const ARA={atk:['⚔️','هجوم'],def:['🛡️','دفاع'],heal:['💚','علاج'],spc:['💥','خاصة ⚡3']};
GAMES.arena={name:'حلبة القتال',cat:'fight',lbc:'#922B21',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B03A2E"/><circle cx="50" cy="50" r="38" fill="#E6B0AA"/><circle cx="50" cy="50" r="30" fill="#F5B7B1"/><path d="M28 72L62 30M38 72L72 30" stroke="#2D4763" stroke-width="6" stroke-linecap="round"/><path d="M26 68l10 6M60 26l10 6" stroke="#F0B429" stroke-width="6" stroke-linecap="round"/></svg>`,
  init:n=>({rd:0,hp:Array(n).fill(100),en:Array(n).fill(1),anim:null,res:'',maxRd:20}),
  points:d=>d.hp.map(h=>Math.max(0,h)+'❤'),
  viewer:d=>simulViewer(d),coverMsg:d=>d.res||'',
  status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${d.rd+1} من ${d.maxRd}</small><br>`),
  winExtra:d=>d.res,
  render(d,ctx){const v=ctx.v;const fresh=d.anim&&once('ar'+d.gid+d.rd);const choosing=ctx.my&&S.arA&&(S.arA==='atk'||S.arA==='spc');
    const n=d.pl.length,cols=n<=3?n:n===4?2:n<=6?3:4;
    let s=`<div class="arena" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${d.pl.map((r,i)=>{const a=d.anim&&d.anim[i];const dead=d.out[i]==='1';const pose=dead?'dead':a?a.a:'';
      const tg=choosing&&!dead&&i!==v&&!sameTeam(d,i,v);
      return `<${tg?'button':'div'} class="fcard ${dead?'dead':''} ${tg?'tgt':''} ${fresh&&a&&a.dmg?'hit':''}" ${tg?`data-ga="tgt" data-i="${i}"`:''} style="--c:${col(d,i)}">
        ${fighterSVG(col(d,i),pose)}${fresh&&a&&(a.dmg||a.heal)?`<span class="dmg ${a.heal&&!a.dmg?'heal':''}">${a.dmg?'-'+a.dmg:'+'+a.heal}</span>`:''}
        <b>${!ctx.local&&i===v?'أنت':nm(d,i)}</b><div class="hpb ${d.hp[i]<=25?'low':''}"><i style="width:${Math.max(0,d.hp[i])}%;background:${d.hp[i]>50?'#3FAE5C':d.hp[i]>25?'#F0B429':'#E5483F'}"></i><em>${Math.max(0,d.hp[i])}</em></div>
        <div class="enp">${[0,1,2].map(k=>`<i class="${k<d.en[i]?'on':''}"></i>`).join('')}</div></${tg?'button':'div'}>`;}).join('')}</div>`;
    if(d.win!=null)return s;
    if(ctx.my){if(choosing)s+=`<p class="hint" style="text-align:center">اختار مين تهاجم</p><div class="acts"><button class="btn navy" data-ga="cancel">رجوع</button></div>`;
      else s+=`<div class="acts">${Object.entries(ARA).map(([k,[e,t]])=>`<button class="btn ${k==='atk'?'red':k==='def'?'navy':k==='heal'?'':'blue'}" style="${k==='heal'?'background:#3FAE5C':''}" data-ga="act" data-i="${['atk','def','heal','spc'].indexOf(k)}" ${k==='spc'&&d.en[v]<3?'disabled':''}>${e} ${t}</button>`).join('')}</div>`;}
    else if(v>=0&&hasPicked(d,v))s+='<p class="note" style="text-align:center">✓ اخترت حركتك، ننتظر الباقين</p>';
    return s;},
  click(a,i,d,ctx){if(!ctx.my)return;
    if(a==='cancel'){S.arA=null;render();return;}
    if(a==='act'){const k=['atk','def','heal','spc'][i];if(k==='atk'||k==='spc'){const ts=targets(d,ctx.v);if(ts.length===1){S.arA=null;simulPick(d,ctx.v,{a:k,t:ts[0]});return;}S.arA=k;render();return;}S.arA=null;simulPick(d,ctx.v,{a:k});return;}
    if(a==='tgt'&&S.arA){const k=S.arA;S.arA=null;simulPick(d,ctx.v,{a:k,t:i});}},
  resolve(d,picks){const n=d.pl.length,R=srng(d,'ar'+d.rd);const hp=[...d.hp],en=[...d.en];const dmg=Array(n).fill(0),heal=Array(n).fill(0);
    const def=picks.map(p=>p&&p.a==='def');
    picks.forEach((p,s)=>{if(!p||d.out[s]==='1')return;if(p.a==='heal')heal[s]=Math.min(15,100-hp[s]);});
    picks.forEach((p,s)=>{if(!p||d.out[s]==='1')return;let a=p.a;if(a==='spc'&&en[s]<3)a='atk';const t=p.t;if((a==='atk'||a==='spc')&&t!=null&&d.out[t]!=='1'){
      if(a==='spc'){dmg[t]+=28+Math.floor(R()*6);}else{const base=12+Math.floor(R()*7);if(def[t]){dmg[t]+=Math.round(base/3);dmg[s]+=4;}else dmg[t]+=base;}}});
    let out=d.out;const anim=[];
    for(let s=0;s<n;s++){if(d.out[s]==='1'){anim.push(null);continue;}hp[s]=Math.min(100,hp[s]+heal[s])-dmg[s];const p=picks[s];
      en[s]=p&&p.a==='spc'&&d.en[s]>=3?0:Math.min(3,en[s]+1);if(hp[s]<=0){hp[s]=0;out=setAt(out,s,'1');}anim.push({a:p?p.a:'',dmg:dmg[s],heal:heal[s]});}
    const al=aliveSeats(d,out);const rd=d.rd+1;let win=null;
    if(al.length===1)win=al[0];else if(!al.length)win='d';else if(rd>=d.maxRd)win=mostPts(hp.map((h,s)=>out[s]==='1'?-1:h));
    const res=d.pl.map((r,s)=>anim[s]&&anim[s].dmg?`${nm(d,s)} -${anim[s].dmg}`:'').filter(Boolean).join('، ')||'محد انضرب';
    return {...d,hp,en,out,rd,anim,res,win};}
};

/* ---------- tanks (aim, fire, watch the shell fly) ---------- */
const TK_G=20,TKS=1.6;
function tkHeight(h,x){x=Math.max(0,Math.min(100,x));const a=Math.floor(x),b=Math.min(100,a+1);return h[a]+(h[b]-h[a])*(x-a);}
function tkY(d,s){return tkHeight(d.h,d.tx[s]);}
const tkAng=(d,t)=>S.draft.angs!=null?180-(+S.draft.angs):(d.ang[t]??45);
// like the angle, each tank keeps the power it last fired with, so a bot's aim never shows up on a human's slider
const tkPow=(d,t)=>+(S.draft.pow??(d.pw||[])[t]??60);
const tkAngTxt=a=>a<=90?`${a}° →`:`${180-a}° ←`;
function tkTip(d,s,ang){const r=ang*Math.PI/180,x=d.tx[s],g=tkY(d,s);return {x:x+Math.cos(r)*3.4*TKS,y:g+3.1*TKS+Math.sin(r)*3.4*TKS};}
function tkFire(d,s,ang,pow){
  const rad=ang*Math.PI/180,v=pow*0.45;const tp=tkTip(d,s,ang);let x=tp.x,y=tp.y,vx=Math.cos(rad)*v,vy=Math.sin(rad)*v;const ax=d.wind*0.6,dt=0.02;const path=[[+x.toFixed(1),+y.toFixed(1)]];let hit=null;
  for(let k=0;k<900;k++){vx+=ax*dt;vy-=TK_G*dt;x+=vx*dt;y+=vy*dt;if(k%2===0)path.push([+x.toFixed(1),+y.toFixed(1)]);
    if(x<-5||x>105||y<-10)break;
    for(let t=0;t<d.pl.length;t++){if(d.out[t]==='1'||(t===s&&k<12))continue;if(Math.hypot(x-d.tx[t],y-(tkY(d,t)+1.6*TKS))<2.2*TKS){hit={x,y};break;}}
    if(hit)break;if(x>=0&&x<=100&&y<=tkHeight(d.h,x)){hit={x,y:tkHeight(d.h,x)};break;}}
  path.push(hit?[+hit.x.toFixed(1),+hit.y.toFixed(1)]:[+x.toFixed(1),+y.toFixed(1)]);
  if(path.length>60){const st=(path.length-1)/59;const q=[];for(let j=0;j<60;j++)q.push(path[Math.round(j*st)]);path.length=0;path.push(...q);}
  const hp=[...d.hp],h=[...d.h];const hits=[];
  if(hit){for(let t=0;t<d.pl.length;t++){if(d.out[t]==='1')continue;const dist=Math.hypot(hit.x-d.tx[t],hit.y-(tkY(d,t)+1.6*TKS));if(dist<8){const dm=Math.round(45*(1-dist/8))+(dist<3?10:0);if(dm>0){hp[t]=Math.max(0,hp[t]-dm);hits.push({s:t,dmg:dm});}}}
    for(let xx=Math.max(0,Math.floor(hit.x-6));xx<=Math.min(100,Math.ceil(hit.x+6));xx++){const dz=Math.sqrt(Math.max(0,36-(xx-hit.x)**2))*0.7;h[xx]=+Math.max(2,Math.min(h[xx],hit.y-dz+2)).toFixed(1);}}
  return {path,hit,hp,h,hits};
}
function tankSVG(d,i,ang,on){const x=d.tx[i],y=60-tkY(d,i),c=col(d,i),a=ang*Math.PI/180,dk=shade(c,-.35);
  return `<g class="tank ${on?'on':''}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${TKS})">
    <line x1="0" y1="-3.1" x2="${(Math.cos(a)*3.4).toFixed(2)}" y2="${(-3.1-Math.sin(a)*3.4).toFixed(2)}" stroke="#2D4763" stroke-width=".75" stroke-linecap="round"/>
    <path d="M-1.5 -2.5A1.5 1.5 0 0 1 1.5 -2.5Z" fill="${c}" stroke="#1F2A36" stroke-width=".2"/>
    <path d="M-2.8 -1.2H2.8L2.1 -2.6H-2.1Z" fill="${c}" stroke="#1F2A36" stroke-width=".2"/><path d="M-2 -2.3H2" stroke="${shade(c,.4)}" stroke-width=".25"/>
    <rect x="-3.1" y="-1.3" width="6.2" height="1.4" rx=".7" fill="${dk}" stroke="#1F2A36" stroke-width=".2"/>${[-2.2,-.75,.75,2.2].map(w=>`<circle cx="${w}" cy="-.6" r=".42" fill="#B7C2CC"/>`).join('')}
    <path d="M-1.05 -2.75A1.15 1.15 0 0 1 .35 -3.8" stroke="rgba(255,255,255,.6)" stroke-width=".28" fill="none" stroke-linecap="round"/><path d="M-2.6 -1.45H2.6" stroke="rgba(0,0,0,.2)" stroke-width=".22"/>
    <rect x="-3.1" y="-5.5" width="6.2" height="1.1" rx=".55" fill="rgba(20,30,40,.55)" stroke="#fff" stroke-width=".18"/><rect x="-3" y="-5.4" width="${(6*d.hp[i]/100).toFixed(2)}" height=".9" rx=".45" fill="${d.hp[i]>50?'#2ECC71':d.hp[i]>25?'#F4D03F':'#E74C3C'}"/>${on?'<path class="tkon" d="M-1.05 -8.7H1.05L0 -7.1Z" fill="#FFD84D" stroke="#1F2A36" stroke-width=".18" stroke-linejoin="round"/>':''}</g>`;}
GAMES.tanks={name:'معركة الدبابات',cat:'fight',lbc:'#4D5656',
  icon:`<svg viewBox="0 0 100 100"><defs><linearGradient id="tks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#85C1E9"/><stop offset="1" stop-color="#D6EAF8"/></linearGradient></defs><rect width="100" height="100" fill="url(#tks)"/><path d="M0 76Q25 60 50 72T100 66V100H0Z" fill="#58D68D"/><path d="M0 84Q30 76 60 84T100 80V100H0Z" fill="#45B39D"/><rect x="18" y="60" width="20" height="9" rx="3" fill="#EC6158"/><path d="M28 62L40 52" stroke="#2D4763" stroke-width="3"/><path d="M42 50Q60 20 74 52" stroke="#2D4763" stroke-width="2" stroke-dasharray="3 3" fill="none"/><circle cx="76" cy="58" r="6" fill="#F5B041"/></svg>`,
  init:n=>{const ph=[Math.random()*6,Math.random()*6,Math.random()*6];const h=[];for(let x=0;x<=100;x++)h.push(+Math.max(6,Math.min(36,20+7*Math.sin(x/9+ph[0])+5*Math.sin(x/4.3+ph[1])+3*Math.sin(x/2.1+ph[2]))).toFixed(1));
    const slots=shuffle(Array(n).fill(0).map((_,i)=>n===1?50:8+i*(84/(n-1))));return {h,tx:slots,hp:Array(n).fill(100),ang:slots.map(x=>x<50?50:130),wind:rnd(9)-4,shot:null,sid:0,turns:0};},
  points:d=>d.hp.map(h=>h+'❤'),
  status:(d,ctx)=>(d.shot&&d.shot.msg?`<small>${d.shot.msg}</small><br>`:'')+turnTxt(d,ctx),
  onTimeout:d=>({...d,turn:nextSeat(d,d.turn),wind:rnd(9)-4}),
  render(d,ctx){const my=ctx.my;const t=d.turn;const ang=tkAng(d,t),pow=tkPow(d,t);
    const Y=y=>60-y;const terr='M0 60 '+d.h.map((y,x)=>`L${x} ${Y(y).toFixed(1)}`).join(' ')+' L100 60Z';const w=d.wind;
    let s=`<svg viewBox="0 0 100 60" class="tanks" id="tkf"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E8ED0"/><stop offset=".7" stop-color="#A9D4F2"/><stop offset="1" stop-color="#E6F3FB"/></linearGradient><linearGradient id="grd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6BCF7F"/><stop offset=".12" stop-color="#3DAA5A"/><stop offset="1" stop-color="#1E6B3C"/></linearGradient></defs>
      <rect width="100" height="60" fill="url(#sky)"/><circle cx="86" cy="10" r="4.5" fill="#FDF2B3"/><circle cx="86" cy="10" r="7" fill="#FDF2B3" opacity=".25"/>
      <path d="M0 40Q15 28 30 36T60 32T100 34V60H0Z" fill="#8FC1E3" opacity=".55"/>
      <g class="clouds ${w>0?'r':w<0?'l':''}" style="--sp:${w?Math.max(6,30-Math.abs(w)*5):0}s"><g opacity=".9"><ellipse cx="20" cy="12" rx="6" ry="2.4" fill="#fff"/><ellipse cx="23" cy="10.5" rx="3.5" ry="2.4" fill="#fff"/></g><g opacity=".75"><ellipse cx="62" cy="7" rx="5" ry="1.9" fill="#fff"/><ellipse cx="60" cy="5.8" rx="2.8" ry="1.9" fill="#fff"/></g></g>
      <path d="${terr}" fill="url(#grd)"/><path d="${'M'+d.h.map((y,x)=>`${x} ${Y(y).toFixed(1)}`).join(' L')}" fill="none" stroke="#8BE09A" stroke-width=".5" opacity=".8"/>`;
    d.pl.forEach((r,i)=>{if(d.out[i]==='1')return;s+=tankSVG(d,i,i===t&&my?ang:d.ang[i],i===t&&d.win==null);});
    if(my){const tp=tkTip(d,t,ang),a=ang*Math.PI/180,L=3+pow/9;s+=`<line id="aim" x1="${tp.x.toFixed(2)}" y1="${Y(tp.y).toFixed(2)}" x2="${(tp.x+Math.cos(a)*L).toFixed(2)}" y2="${(Y(tp.y)-Math.sin(a)*L).toFixed(2)}" stroke="#fff" stroke-width=".7" stroke-dasharray="1.2 1" stroke-linecap="round"/>`;}
    s+=`<g id="fx"></g><g transform="translate(50 5.5)"><rect x="-9" y="-3" width="18" height="5.4" rx="2.7" fill="rgba(255,255,255,.75)"/><text y="1.1" font-size="3.3" text-anchor="middle" fill="#1B4F72" font-weight="800">💨 ${w===0?'هادي':(w>0?'→ ':'← ')+Math.abs(w)}</text></g></svg>`;
    if(my)s+=`<div class="aimc"><label>الاتجاه <b id="angv">${tkAngTxt(ang)}</b><input type="range" min="0" max="180" value="${180-ang}" data-draft="angs" dir="ltr"></label><label>القوة <b id="powv">${pow}</b><input type="range" min="10" max="100" value="${pow}" data-draft="pow" dir="ltr"></label></div><button class="btn red wide" data-ga="fire">💥 أطلق</button>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||a!=='fire')return;const t=d.turn;const ang=tkAng(d,t),pow=tkPow(d,t);
    const r=tkFire(d,t,ang,pow);let out=d.out;r.hp.forEach((h,s)=>{if(h<=0&&out[s]!=='1')out=setAt(out,s,'1');});
    const al=aliveSeats(d,out);const turns=d.turns+1;let win=null;if(al.length===1)win=al[0];else if(!al.length)win='d';else if(turns>=12*d.pl.length)win=mostPts(r.hp.map((h,s)=>out[s]==='1'?-1:h));
    const angs=[...d.ang];angs[t]=ang;const pw=d.pl.map((_,s)=>(d.pw||[])[s]??60);pw[t]=pow;const msg=`${nm(d,t)} أطلق`+(r.hits.length?`: ${r.hits.map(x=>`${nm(d,x.s)} -${x.dmg}`).join('، ')}`:' وما صاب');
    S.draft.angs=undefined;S.draft.pow=undefined;
    act({...d,h:r.h,hp:r.hp,out,ang:angs,pw,shot:{path:r.path,hit:r.hit,hits:r.hits,msg},sid:d.sid+1,turns,wind:rnd(9)-4,turn:win==null?nextSeat(d,t,out):t,win});},
  after(d,ctx){const f=document.getElementById('tkf');if(!f)return;
    const upd=()=>{const d=S.st.d,ctx=mkCtx();if(!d||!d.tx)return;const t=d.turn,ang=tkAng(d,t),pow=tkPow(d,t);const av=document.getElementById('angv'),pv=document.getElementById('powv');if(av)av.textContent=tkAngTxt(ang);if(pv)pv.textContent=pow;
      const el=document.getElementById('aim');if(el){const tp=tkTip(d,t,ang),a=ang*Math.PI/180,L=3+pow/9;el.setAttribute('x1',tp.x.toFixed(2));el.setAttribute('y1',(60-tp.y).toFixed(2));el.setAttribute('x2',(tp.x+Math.cos(a)*L).toFixed(2));el.setAttribute('y2',(60-tp.y-Math.sin(a)*L).toFixed(2));}
      const tk=f.querySelector('.tank.on line');if(tk&&ctx.my){tk.setAttribute('x2',(Math.cos(ang*Math.PI/180)*3.4).toFixed(2));tk.setAttribute('y2',(-3.1-Math.sin(ang*Math.PI/180)*3.4).toFixed(2));}};
    app.querySelectorAll('.aimc input').forEach(inp=>{if(inp._b)return;inp._b=1;inp.addEventListener('input',()=>upd());});
    if(d.shot&&once('tk'+d.gid+d.sid)){const fx=document.getElementById('fx');if(!fx)return;S.holdRender=true;const P=d.shot.path;const ns='http://www.w3.org/2000/svg';
      const mk=(tag,at)=>{const e=document.createElementNS(ns,tag);for(const k in at)e.setAttribute(k,at[k]);fx.appendChild(e);return e;};
      const trail=mk('polyline',{fill:'none',stroke:'rgba(255,255,255,.75)','stroke-width':'.45','stroke-dasharray':'1 .8'});
      const ball=mk('circle',{r:'1',fill:'#1F2A36',stroke:'#fff','stroke-width':'.3'});
      mk('circle',{cx:P[0][0],cy:60-P[0][1],r:'1.6',fill:'#FDF2B3',class:'flash'});sfx('tap');
      let k=0;const pts=[];const stepT=Math.max(10,1000/P.length);
      const go=()=>{if(k>=P.length){ball.remove();const h=d.shot.hit;if(h){const cx=h.x,cy=60-h.y;mk('circle',{cx,cy,r:'1.2',fill:'#F39C12',class:'boom'});mk('circle',{cx,cy,r:'1',fill:'none',stroke:'#fff','stroke-width':'.5',class:'shock'});
          for(let j=0;j<8;j++){const an=j/8*Math.PI*2;mk('circle',{cx,cy,r:'.45',fill:j%2?'#7a5230':'#F5B041',class:'deb',style:`--dx:${(Math.cos(an)*6).toFixed(1)}px;--dy:${(Math.sin(an)*5-3).toFixed(1)}px`});}
          f.classList.add('quake');sfx('lose');}
        setTimeout(()=>{f.classList.remove('quake');S.holdRender=false;if(S.renderPending)render();},750);return;}
        const [x,y]=P[k++];ball.setAttribute('cx',x);ball.setAttribute('cy',60-y);pts.push(x+','+(60-y));trail.setAttribute('points',pts.join(' '));setTimeout(go,stepT);};
      go();}}
};

/* ---------- dice wars ---------- */
const DW_W=7,DW_H=8;
function dwNb(i){const r=Math.floor(i/DW_W),c=i%DW_W,o=r%2?[[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]]:[[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
  return o.map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>rr>=0&&rr<DW_H&&cc>=0&&cc<DW_W).map(([rr,cc])=>rr*DW_W+cc);}
function dwLargest(own,s){const seen=new Set();let best=0;const ss=String(s);for(let i=0;i<own.length;i++){if(own[i]!==ss||seen.has(i))continue;let n=0;const st=[i];seen.add(i);while(st.length){const k=st.pop();n++;for(const b of dwNb(k))if(own[b]===ss&&!seen.has(b)){seen.add(b);st.push(b);}}best=Math.max(best,n);}return best;}
function dwEnd(d){const t=d.turn,ts=String(t);let dice=[...d.dice].map(Number);let add=dwLargest(d.own,t);const mine=[...d.own].map((o,i)=>o===ts?i:-1).filter(i=>i>=0);
  let guard=0;while(add>0&&guard++<500){const c=mine.filter(i=>dice[i]<8);if(!c.length)break;dice[c[rnd(c.length)]]++;add--;}
  const turns=(d.turns||0)+1;let win=null;if(turns>=30*d.pl.length){const c=d.pl.map((r,s)=>d.out[s]==='1'?-1:[...d.own].filter(o=>o===String(s)).length);win=mostPts(c);}
  S.dwSel=null;return {...d,dice:dice.join(''),turns,win,turn:nextSeat(d,t),last:{msg:`${nm(d,t)} خلّص دوره وأخذ ${dwLargest(d.own,t)} زهرات تعزيز`}};}
GAMES.dwars={name:'حرب الزهر',cat:'fight',lbc:'#1A5276',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#21618C"/>${[[24,30,'#EC6158'],[50,30,'#4AB1E8'],[76,30,'#EC6158'],[37,52,'#4AB1E8'],[63,52,'#4CB97F'],[24,74,'#4CB97F'],[50,74,'#EC6158'],[76,74,'#4AB1E8']].map(([x,y,c])=>`<path d="M${x} ${y-13}l11 6.5v13l-11 6.5l-11-6.5v-13z" fill="${c}" stroke="#fff" stroke-width="2"/>`).join('')}<rect x="44" y="44" width="12" height="12" rx="3" fill="#fff"/><circle cx="47.5" cy="47.5" r="1.4" fill="#2D4763"/><circle cx="52.5" cy="52.5" r="1.4" fill="#2D4763"/></svg>`,
  init:n=>{const N=DW_W*DW_H;const own=Array(N).fill('.');const cells=shuffle([...Array(N).keys()].filter(()=>Math.random()>0.1));const per=Math.floor(cells.length/n);
    cells.slice(0,per*n).forEach((c,k)=>own[c]=String(k%n));const dice=Array(N).fill(0);
    for(let s=0;s<n;s++){const mine=own.map((o,i)=>o===String(s)?i:-1).filter(i=>i>=0);mine.forEach(i=>dice[i]=1);let extra=Math.round(per*1.6);while(extra>0){const i=mine[rnd(mine.length)];if(dice[i]<8){dice[i]++;extra--;}}}
    return {own:own.join(''),dice:dice.join(''),last:null,sid:0};},
  points:d=>d.pl.map((r,s)=>[...d.own].filter(o=>o===String(s)).length+'⬢'),
  onTimeout:d=>dwEnd(d),
  status:(d,ctx)=>(d.last&&d.last.msg?`<small>${d.last.msg}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const my=ctx.my,t=d.turn,ts=String(t);let sel=my?S.dwSel:null;if(sel!=null&&(d.own[sel]!==ts||+d.dice[sel]<2))sel=null;const targets=sel!=null?new Set(dwNb(sel).filter(b=>d.own[b]!=='.'&&d.own[b]!==ts&&!sameTeam(d,+d.own[b],t))):new Set();
    const w=100/(DW_W+0.5),r=w/Math.sqrt(3),vh=(DW_H-1)*1.5*r+2*r;
    const hex=(cx,cy)=>[0,1,2,3,4,5].map(k=>{const a=Math.PI/180*(60*k-90);return (cx+r*0.97*Math.cos(a)).toFixed(2)+','+(cy+r*0.97*Math.sin(a)).toFixed(2);}).join(' ');
    let s=`<svg viewBox="0 0 100 ${vh.toFixed(1)}" class="dwmap">`;
    for(let i=0;i<d.own.length;i++){const o=d.own[i];if(o==='.')continue;const rr=Math.floor(i/DW_W),cc=i%DW_W;const cx=w/2+cc*w+(rr%2?w/2:0),cy=r+rr*1.5*r;const n=+d.dice[i];
      const mine=o===ts,can=my&&((mine&&n>1)||targets.has(i));const cls=`${sel===i?'sel':''} ${targets.has(i)?'tg':''} ${d.last&&(d.last.a===i||d.last.b===i)&&once('dw'+d.gid+d.sid+'_'+i)?'flash':''}`;
      s+=`<g class="hx ${cls}" ${can?`data-ga="cell" data-i="${i}"`:''}><polygon points="${hex(cx,cy)}" fill="${sel===i?COLS[d.pl[+o]]:LIGHT[d.pl[+o]]}" stroke="${COLS[d.pl[+o]]}" stroke-width="${sel===i||targets.has(i)?1.1:.5}"/>
        ${n>=4?`<rect x="${(cx-1.6).toFixed(2)}" y="${(cy-3.6).toFixed(2)}" width="4.8" height="4.8" rx="1" fill="#E3E9F0" stroke="#2D4763" stroke-width=".22"/>`:''}<rect x="${(cx-2.4).toFixed(2)}" y="${(cy-2.05).toFixed(2)}" width="4.8" height="4.8" rx="1" fill="#9FB0C2"/><rect x="${(cx-2.4).toFixed(2)}" y="${(cy-2.6).toFixed(2)}" width="4.8" height="4.8" rx="1" fill="#fff" stroke="#2D4763" stroke-width=".22"/><text x="${cx.toFixed(2)}" y="${(cy+1.2).toFixed(2)}" text-anchor="middle" font-size="3.6" font-weight="800" fill="#2D4763">${n}</text></g>`;}
    s+='</svg>';
    if(d.last&&d.last.ra){const L=d.last;const sa=L.ra.reduce((a,b)=>a+b,0),sb=L.rb.reduce((a,b)=>a+b,0);const fresh=once('dwr'+d.gid+d.sid);
      s+=`<div class="dwroll ${fresh?'shake':''}"><div class="${L.win?'w':''}" style="--c:${col(d,L.sa)}"><b>${nm(d,L.sa)}</b><span>${L.ra.map(x=>`<i class="dice">${diceSVG(x)}</i>`).join('')}</span><em>${sa}</em></div><strong>${L.win?'🏆':'🛡️'}</strong><div class="${L.win?'':'w'}" style="--c:${col(d,L.sb)}"><b>${nm(d,L.sb)}</b><span>${L.rb.map(x=>`<i class="dice">${diceSVG(x)}</i>`).join('')}</span><em>${sb}</em></div></div>`;}
    if(my)s+=`<div class="acts">${sel!=null?'<button class="btn navy" data-ga="unsel">إلغاء</button>':''}<button class="btn blue" data-ga="end">إنهاء الدور ⏭</button></div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my)return;const t=d.turn,ts=String(t);
    if(a==='unsel'){S.dwSel=null;render();return;}
    if(a==='end'){S.dwSel=null;act(dwEnd(d));return;}
    if(a!=='cell')return;
    if(d.own[i]===ts){S.dwSel=+d.dice[i]>1?(S.dwSel===i?null:i):null;render();return;}
    const from=S.dwSel;if(from==null||!dwNb(from).includes(i)||d.own[i]==='.'||d.own[i]===ts||sameTeam(d,+d.own[i],t))return;
    const na=+d.dice[from],nb=+d.dice[i];const ra=Array(na).fill(0).map(()=>1+rnd(6)),rb=Array(nb).fill(0).map(()=>1+rnd(6));const win=ra.reduce((x,y)=>x+y,0)>rb.reduce((x,y)=>x+y,0);
    const def=+d.own[i];let own=d.own,dice=d.dice;
    if(win){own=setAt(own,i,ts);dice=setAt(setAt(dice,i,String(na-1)),from,'1');}else dice=setAt(dice,from,'1');
    let out=d.out;if(!own.includes(String(def)))out=setAt(out,def,'1');const al=aliveSeats(d,out);
    S.dwSel=win&&na-1>1?i:null;
    act({...d,own,dice,out,sid:d.sid+1,last:{a:from,b:i,sa:t,sb:def,ra,rb,win,msg:`${nm(d,t)} هاجم ${nm(d,def)} و${win?'انتصر':'خسر'}`},win:al.length===1?al[0]:null});}
};

/* ---------- sword duel (quick draw) ---------- */
GAMES.duel=spdBase({name:'مبارزة السيوف',lbc:'#17202A',icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#1B2631"/><circle cx="70" cy="28" r="14" fill="#F9E79F"/><path d="M0 78H100V100H0Z" fill="#273746"/><path d="M22 80l10-30 6 30M70 80l-8-30-8 30" fill="#0B0F14"/><path d="M34 52l20-24M60 52l-18-22" stroke="#D5DBDB" stroke-width="3" stroke-linecap="round"/></svg>`,
  art:'<div class="duel prev"><span class="stars"></span><span class="moon"></span><span class="hills"></span><span class="sam l"></span><span class="sam r"></span></div>',
  title:'المبارزة تبدأ بصمت. لما تطلع «!» اسحب سيفك بأسرع ما يمكن، واللي يسحب قبلها يخسر الجولة',
  start(d,st){st.phase='wait';const wait=1800+Math.random()*3000;st.timer=setTimeout(()=>{if(S.sp===st){st.phase='go';st.t0=performance.now();render();}},wait);},
  view(d,ctx,st){if(st.phase==='wait'||st.phase==='go')return `<button class="duel ${st.phase}" data-ga="tap"><span class="stars"></span><span class="moon"></span><span class="hills"></span><span class="sam l"></span><span class="sam r"></span><b>${st.phase==='go'?'!':''}</b></button>`;return waitCard();},
  click(a,i,d,ctx,st){if(a!=='tap')return;if(st.phase==='wait'){clearTimeout(st.timer);st.t0=performance.now();toast('سحبت بدري! خسرت الجولة');spdSubmit(d,ctx,false);return;}if(st.phase==='go'){sfx('pop');spdSubmit(d,ctx,true);}}});
GAMES.duel.cat='fight';

/* ---------- tapping battle ---------- */
GAMES.tapwar={...spdBase({name:'معركة الضغط',lbc:'#1E8449',icon:iconE('#27AE60','👊'),art:'<div class="tapbtn prev">👊</div>',title:'عندك 5 ثواني. اضغط الزر بأسرع وأكثر ما تقدر',
  start(d,st){st.phase='go';st.n=0;st.t0=performance.now();const v=+st.key.split(':').pop();st.timer=setTimeout(()=>{if(S.sp!==st)return;// left the game or round meanwhile: the hold and the pick belong to something else now
    S.holdRender=false;st.phase='sent';const nd=S.st.d;if(nd&&nd.gid===d.gid&&nd.rd===d.rd)simulPick(d,v,{ok:true,ms:st.n});else render();},5000);},
  view(d,ctx,st){return `<div class="spd tw"><div class="memnum" id="tapn">${st.n||0}</div><button class="tapbtn" data-ga="tap">👊 اضغط!</button><div class="tbar" style="margin-top:12px"><i id="tapt" style="width:100%"></i></div></div>`;},
  click(a,i,d,ctx,st){if(a!=='tap'||st.phase!=='go')return;st.n++;const el=document.getElementById('tapn');if(el){el.textContent=st.n;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}}}),
  cat:'fight',
  resolve(d,picks){const pts=[...d.pts];const v=picks.map(p=>p&&p.ok?p.ms:-1);const mx=Math.max(...v);const top=v.map((x,s)=>x===mx&&x>0?s:-1).filter(s=>s>=0);if(top.length===1)pts[top[0]]++;
    const rd=d.rd+1;return {...d,pts,rd,res:d.pl.map((r,s)=>v[s]>=0?`${nm(d,s)} ${v[s]} ضغطة`:'').filter(Boolean).join('، ')+(top.length===1?`. الأقوى: ${nm(d,top[0])}`:''),win:rd>=SPD_ROUNDS?mostPts(pts):null};},
  after(d,ctx){const el=document.getElementById('tapt');const st=S.sp;if(!el||!st||st.phase!=='go')return;S.holdRender=true;const left=Math.max(0,5000-(performance.now()-st.t0));
    el.style.transition='none';el.style.width=(left/50)+'%';void el.offsetWidth;el.style.transition=`width ${left}ms linear`;el.style.width='0%';}
};

'use strict';
/* «جكارو» part 2: the approved wooden board and glass marbles, the cards (direction A «كلاسيكي بلمسة»), the turn flow,
   the motion, the bots, and GAMES.jakaro. The rules engine is n-jakaro.js (window.JKX). */
(()=>{
const X=window.JKX;const {JK_RULES,LVS,EVK,POWERS,LUCK,RANKS,SU,isRed,SP,HR,MR,D2R,rot,add,unit,lft,r1,geo,sidesOf,armOf,partner,teamOf,Lg,cellOf,xy,R,
  occOf,homeAll,ctl,fwd,back,cardOpts,allPlays,CN,playCard,throwCard,passCard,guard,nextTurn,jkInit,jkStart,levelPref,setPref,teamPass}=X;
const f=r1;const ENG='#D7B68A';
// glass marbles in the players' own colours (engine COLS)
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
const glassC=c=>mix(c,'#000000',.12);

/* ================= the static art: injected once into the page, used by <use> ================= */
let DEF=null;const DB={};
function defsEl(){if(DEF&&document.body.contains(DEF))return DEF;DEF=document.createElement('div');DEF.setAttribute('aria-hidden','true');DEF.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  let g='';for(let i=0;i<64;i++){const x=-470+i*15+(i*37%11),w=.6+((i*53)%10)/9;let d=`M${x} -480`;for(let y=-480;y<480;y+=120){const dx=((i*17+y)%23)-11;d+=`q${f(dx*.6)} 60 ${f(dx*.2)} 120`;}
    g+=`<path d="${d}" stroke="${i%3?'#3E2212':'#A0683F'}" stroke-opacity="${i%3?.22:.18}" stroke-width="${f(w*(i%5?1.4:3.2))}" fill="none"/>`;}
  const ms=COLS.map((c0,i)=>{const c=glassC(c0);return `<radialGradient id="jkgm${i}" cx=".38" cy=".34" r=".72"><stop offset="0" stop-color="${mix(c,'#ffffff',.55)}"/><stop offset=".45" stop-color="${c}"/><stop offset=".9" stop-color="${mix(c,'#000000',.45)}"/><stop offset="1" stop-color="${mix(c,'#000000',.6)}"/></radialGradient><radialGradient id="jkgi${i}" cx=".68" cy=".72" r=".45"><stop offset="0" stop-color="${mix(c,'#ffffff',.6)}" stop-opacity=".85"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    <g id="jkm${i}"><ellipse cx="4.3" cy="5.7" rx="15" ry="12.8" fill="url(#jkmsh)"/><circle r="13.5" fill="url(#jkgm${i})"/><circle r="13.5" fill="url(#jkgi${i})"/><path d="M-7.4 2q6.8-9.5 14.2-2.7" fill="none" stroke="${mix(c,'#ffffff',.7)}" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="-4.9" cy="-5.4" rx="4" ry="2.7" fill="#fff" opacity=".9" transform="rotate(-35 -4.9 -5.4)"/><circle cx="5.7" cy="6.8" r="1.35" fill="#fff" opacity=".55"/><circle r="13.5" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".8"/></g>`;}).join('');
  DEF.innerHTML=`<svg width="0" height="0"><defs>
<linearGradient id="jkwal" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#7B4A2A"/><stop offset=".35" stop-color="#5E361D"/><stop offset=".6" stop-color="#734427"/><stop offset="1" stop-color="#55301A"/></linearGradient>
<linearGradient id="jksheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".3" stop-color="#fff" stop-opacity=".02"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="jkhole" cx=".58" cy=".62" r=".62"><stop offset="0" stop-color="#DEC193"/><stop offset=".65" stop-color="#C9A673"/><stop offset="1" stop-color="#8E6A40"/></radialGradient>
<radialGradient id="jkrec" cx=".55" cy=".58" r=".6"><stop offset="0" stop-color="#DDBF90"/><stop offset=".85" stop-color="#CFAE7C"/><stop offset="1" stop-color="#A9844F"/></radialGradient>
<radialGradient id="jkmsh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1A0E06" stop-opacity=".55"/><stop offset="1" stop-color="#1A0E06" stop-opacity="0"/></radialGradient>
<g id="jkgrain">${g}</g><g id="jkh"><circle r="11.5" fill="url(#jkhole)"/><path d="M-9.2 -5.2a11.5 11.5 0 0 1 16.1 -5.7" fill="none" stroke="#3B2311" stroke-opacity=".45" stroke-width="1.6"/></g>
<g id="jkhp"><circle r="10" fill="url(#jkhole)"/><path d="M-8 -4.5a10 10 0 0 1 14 -5" fill="none" stroke="#3B2311" stroke-opacity=".45" stroke-width="1.6"/></g>${ms}</defs></svg>`;
  document.body.appendChild(DEF);return DEF;}
const SUIT={h:'M0 .38C-.06 .3-.5 .04-.5-.17C-.5-.42-.12-.47 0-.24C.12-.47 .5-.42 .5-.17C.5 .04 .06 .3 0 .38Z',d:'M0-.5L.36 0L0 .5L-.36 0Z',
 s:'M0-.5C.12-.3 .5-.1 .5 .12C.5 .33 .22 .38 .07 .22C.09 .34 .15 .43 .23 .5H-.23C-.15 .43-.09 .34-.07 .22C-.22 .38-.5 .33-.5 .12C-.5-.1-.12-.3 0-.5Z',
 c:'M-.07 .16C-.2 .34-.5 .3-.5 .06C-.5-.14-.27-.2-.14-.08C-.24-.3-.13-.5 0-.5C.13-.5 .24-.3 .14-.08C.27-.2 .5-.14 .5 .06C.5 .3 .2 .34 .07 .16C.09 .33 .15 .43 .23 .5H-.23C-.15 .43-.09 .33-.07 .16Z'};
const ptsD=(p,k=1)=>'M'+p.map(([x,y])=>f(x*k)+' '+f(y*k)).join('L')+'Z';
// the board of B sides, drawn once (walnut laminate, routed holes, engraved numbers, suns, pens, suits, handles, pocket)
function boardDef(B){if(DB[B]&&document.getElementById('jkb'+B))return;const host=defsEl().querySelector('defs');const G=geo(B),N=B;let v='';const poly=G.poly;
  [[18,26,.06],[12,18,.09],[7,11,.12],[3,5,.16]].forEach(([dx,dy,o])=>v+=`<path d="${ptsD(poly,1.012)}" transform="translate(${dx} ${dy})" fill="#3A2614" opacity="${o}"/>`);
  v+=`<path d="${ptsD(poly)}" fill="#C9A673" stroke="#B48F5C" stroke-width="2"/><path d="${ptsD(poly,.988)}" fill="#E1C597"/>`;
  v+=`<clipPath id="jkclip${N}"><path d="${ptsD(poly,.976)}"/></clipPath><g clip-path="url(#jkclip${N})"><path d="${ptsD(poly,.976)}" fill="url(#jkwal)"/><use href="#jkgrain" transform="scale(${f(G.ap/440*1.05)})"/><path d="${ptsD(poly,.976)}" fill="url(#jksheen)"/></g>`;
  const pa=124*(1+(N-4)*.16);const th=G.th;const rec=(()=>{const ls=[];for(let k=0;k<N;k++){const s=90*D2R+k*th;ls.push([Math.cos(s),Math.sin(s),pa]);const c=s+th/2;ls.push([Math.cos(c),Math.sin(c),pa*(1+(1/Math.cos(th/2)-1)*.285)]);}
    const pts=[];for(let i=0;i<ls.length;i++){const [ux,uy,d1]=ls[i],[vx,vy,d2]=ls[(i+1)%ls.length],det=ux*vy-uy*vx;pts.push([(d1*vy-d2*uy)/det,(ux*d2-vx*d1)/det]);}return pts;})();
  if(N>4){const rr=pa*1.5;let d='';const m=2*N;for(let i=0;i<m*2;i++){const t=i*Math.PI/m,r=i%2?rr*.86:rr;d+=(i?'L':'M')+f(r*Math.cos(t))+' '+f(r*Math.sin(t));}v+=`<path d="${d}Z" fill="none" stroke="${ENG}" stroke-width="2.4" opacity=".8"/>`;}
  v+=`<path d="${ptsD(rec)}" fill="url(#jkrec)"/><path d="${ptsD(rec)}" fill="none" stroke="#7A5530" stroke-opacity=".55" stroke-width="3" transform="translate(-1.5 -1.5)"/>`;
  for(const k of [1,1+N/2]){const c=rot({x:G.A.x-202,y:G.A.y+55},k*th);v+=`<g transform="translate(${f(c.x)} ${f(c.y)}) rotate(${f(k*th/D2R)})"><rect x="-66" y="-13" width="132" height="26" rx="13" fill="#E9E1D3" stroke="#C9A673" stroke-width="4"/></g>`;}
  const sts=['h','c','d','s','h','c','d','s'];for(let k=0;k<N;k++){const p=rot({x:G.A.x-216,y:G.A.y-4},k*th);v+=`<path d="${SUIT[sts[k]]}" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(k*th/D2R)}) scale(84)" fill="none" stroke="${ENG}" stroke-width=".032"/>`;}
  for(const pn of G.pens){v+=`<rect x="-31" y="-31" width="62" height="62" rx="12" fill="none" stroke="${ENG}" stroke-width="2.6" transform="translate(${f(pn.c.x)} ${f(pn.c.y)}) rotate(${f(pn.a)})"/>`;pn.holes.forEach(h=>v+=`<use href="#jkhp" x="${f(h.x)}" y="${f(h.y)}"/>`);}
  G.track.forEach((p,i)=>{if(p.no===0){let d='';for(let j=0;j<16;j++){const a=j*Math.PI/8,r=j%2?17:23;d+=(j?'L':'M')+f(p.x+r*Math.cos(a))+' '+f(p.y+r*Math.sin(a));}v+=`<path d="${d}Z" fill="none" stroke="${ENG}" stroke-width="2.2"/>`;}
    v+=`<use href="#jkh" x="${f(p.x)}" y="${f(p.y)}"/>`;
    if(p.no>0){const nx=G.track[(i+1)%G.L],pv=G.track[(i-1+G.L)%G.L],d=unit({x:nx.x-pv.x,y:nx.y-pv.y}),o=lft(d),q=add(p,o,22);
      v+=`<text x="${f(q.x)}" y="${f(q.y+5)}" font-size="14" text-anchor="middle" fill="${ENG}" font-family="Arial,Helvetica,sans-serif" transform="rotate(${f(Math.atan2(d.y,d.x)/D2R+180)} ${f(q.x)} ${f(q.y)})">${p.no}</text>`;}});
  G.lanes.forEach(l=>l.forEach(p=>v+=`<use href="#jkh" x="${f(p.x)}" y="${f(p.y)}"/>`));
  const el=document.createElementNS('http://www.w3.org/2000/svg','g');el.id='jkb'+B;el.innerHTML=v;host.appendChild(el);DB[B]=1;}

/* ================= cards, direction A «كلاسيكي بلمسة» ================= */
const PIPS={A:[[.5,.5]],2:[[.5,.2],[.5,.8]],3:[[.5,.2],[.5,.5],[.5,.8]],4:[[.3,.2],[.7,.2],[.3,.8],[.7,.8]],5:[[.3,.2],[.7,.2],[.5,.5],[.3,.8],[.7,.8]],
 6:[[.3,.2],[.7,.2],[.3,.5],[.7,.5],[.3,.8],[.7,.8]],7:[[.3,.2],[.7,.2],[.5,.35],[.3,.5],[.7,.5],[.3,.8],[.7,.8]],8:[[.3,.2],[.7,.2],[.5,.35],[.3,.5],[.7,.5],[.5,.65],[.3,.8],[.7,.8]],
 9:[[.3,.2],[.7,.2],[.3,.4],[.7,.4],[.5,.5],[.3,.6],[.7,.6],[.3,.8],[.7,.8]],T:[[.3,.2],[.7,.2],[.5,.3],[.3,.4],[.7,.4],[.3,.6],[.7,.6],[.5,.7],[.3,.8],[.7,.8]]};
const ICON={
 start:c=>`<ellipse cy="7.5" rx="8.5" ry="2.8" fill="none" stroke="${c}" stroke-width="1.8"/><circle cy="-.5" r="4.6" fill="${c}"/><path d="M0-7.5v-4M-3-9l3-3 3 3" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`,
 back:c=>`<path d="M7 4A7.5 7.5 0 1 1 3.5-6.8" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><path d="M1-10.5l3.6 3.5-4.6 1.8" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
 any:c=>`<circle cx="-6.5" cy="4" r="3.6" fill="${c}"/><circle cx="6.5" cy="4" r="3.6" fill="${c}" opacity=".6"/><circle cy="-6" r="3.6" fill="${c}" opacity=".8"/>`,
 split:c=>`<path d="M0 10V2M0 2L-7-6M0 2L7-6" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-7.5" cy="-7.5" r="3.4" fill="${c}"/><circle cx="7.5" cy="-7.5" r="3.4" fill="${c}"/>`,
 burn:c=>`<path d="M0 11C-7 11-9 5-7 0C-6 3-4 4-3.5 2C-5-3-2-8 2-11C1-6 4-5 5-8C8-4 9 2 7 6C6 9 3 11 0 11Z" fill="${c}"/>`,
 swap:c=>`<path d="M-9-3.5h15M3-7.5l4 4-4 4M9 3.5h-15M-3 7.5l-4-4 4-4" fill="none" stroke="${c}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`,
 any2:c=>`<path d="M0-10l2.6 6.6 7 .6-5.4 4.6 1.7 6.9L0 5.1l-5.9 3.6 1.7-6.9-5.4-4.6 7-.6z" fill="${c}"/>`};
// the special power of a card on this level (for the medallion and the words)
function kindOf(lv,c){const r=c[0],Rl=JK_RULES[lv]||JK_RULES.c;if(r==='X')return 'any2';if(r==='A'||r==='K')return 'start';if(r==='4')return 'back';if(r==='5')return 'any';if(r==='7')return 'split';
  if(r==='T')return 'burn';if(r==='J')return Rl.redJack11&&isRed(c)?null:'swap';if(r==='Q')return Rl.redQueenBurn&&isRed(c)?'burn':null;return null;}
function powerWords(d,c){const r=c[0],Rl=R(d),red=isRed(c);
  if(r==='X')return 'جوكر: يصير أي ورقة تبيها';if(r==='A')return 'طلّع حبة، أو امشِ ١ أو ١١';if(r==='K')return Rl.kTramples?'طلّع حبة، أو امشِ ١٣ وتدعس اللي بطريقك':'طلّع حبة، أو امشِ ١٣';
  if(r==='4')return d.luck==='fourIsEight'?'ارجع ٨ لورا (ورقة الحظ)':'ارجع ٤ لورا';if(r==='5')return Rl.fiveAny?'امشِ ٥ بأي حبة على الطريق، حتى حبة خصمك':'امشِ ٥';
  if(r==='7')return 'قسّم ٧ بين حبتين، أو كاملة لحبة';if(r==='T')return Rl.tenBurn?'امشِ ١٠، أو احرق على اللي بعدك':'امشِ ١٠';
  if(r==='J')return Rl.redJack11&&red?'الولد الأحمر: امشِ ١١':'بدّل حبتك بأي حبة على الطريق';if(r==='Q')return Rl.redQueenBurn&&red?'البنت الحمرا: تحرق ورقة من اللي بعدك':`امشِ ${d.luck==='longQueen'?'١٥':'١٢'}`;
  return `امشِ ${({2:'٢',3:'٣',6:'٦',8:'٨',9:'٩'})[r]||r}`;}
function court(r,s,w,h,c){const x0=w*.2,y0=h*.15,iw=w*.6,ih=h*.7,cx=w/2,hy=y0+ih/2;const robe=r==='K'?'#C8102E':r==='Q'?'#1B4FA0':'#C8102E',trim='#E8B530',alt=r==='Q'?'#C8102E':'#1B4FA0';
  const half=`<g><path d="M${f(cx-iw*.42)} ${f(hy)}q0-${f(ih*.2)} ${f(iw*.42)}-${f(ih*.22)}q${f(iw*.42)} ${f(ih*.02)} ${f(iw*.42)} ${f(ih*.22)}z" fill="${robe}"/><path d="M${f(cx-iw*.14)} ${f(hy)}l${f(iw*.14)}-${f(ih*.2)}l${f(iw*.14)} ${f(ih*.2)}z" fill="${alt}"/><path d="M${f(cx-iw*.42)} ${f(hy-ih*.02)}h${f(iw*.84)}" stroke="${trim}" stroke-width="2"/><circle cx="${f(cx)}" cy="${f(hy-ih*.3)}" r="${f(iw*.16)}" fill="#F5D3A8" stroke="#6B4423" stroke-width=".8"/>${r==='J'?`<path d="M${f(cx-iw*.2)} ${f(hy-ih*.36)}q${f(iw*.2)}-${f(ih*.14)} ${f(iw*.4)} 0z" fill="${alt}"/>`:`<path d="M${f(cx-iw*.17)} ${f(hy-ih*.38)}l${f(iw*.04)}-${f(ih*.1)}l${f(iw*.07)} ${f(ih*.05)}l${f(iw*.06)}-${f(ih*.07)}l${f(iw*.06)} ${f(ih*.07)}l${f(iw*.07)}-${f(ih*.05)}l${f(iw*.04)} ${f(ih*.1)}z" fill="${trim}"/>`}<path d="${SUIT[s]}" transform="translate(${f(cx+iw*.3)} ${f(hy-ih*.36)}) scale(${f(iw*.16)})" fill="${c}"/></g>`;
  return `<rect x="${f(x0)}" y="${f(y0)}" width="${f(iw)}" height="${f(ih)}" fill="#FBF6EA" stroke="${c}" stroke-width="1.2"/>${half}<g transform="rotate(180 ${f(cx)} ${f(hy)})">${half}</g>`;}
const CC={};
// one card face (w×h, top-left at 0,0); lv decides which medallion it shows
function face(c,lv,w,h){const k=c+lv+w;if(CC[k])return CC[k];const r=c[0],s=c[1],red=isRed(c),ink=red?'#C8102E':'#151515';let v=`<rect width="${w}" height="${h}" rx="${f(w*.07)}" fill="#fff" stroke="#CFC8BA"/>`;
  if(r==='X'){v+=`<text x="${f(w/2)}" y="${f(h*.56)}" font-size="${f(w*.2)}" font-weight="800" text-anchor="middle" fill="${ink}">جوكر</text><path d="${ICON_STAR}" transform="translate(${f(w/2)} ${f(h*.32)}) scale(${f(w*.03)})" fill="${ink}"/><text x="${f(w*.12)}" y="${f(h*.15)}" font-size="${f(w*.15)}" font-weight="800" fill="${ink}" font-family="Georgia,serif" direction="ltr" text-anchor="middle">★</text>`;}
  else{if(r==='J'||r==='Q'||r==='K')v+=court(r,s,w,h,ink);
    else{const big=r==='A';for(const [px,py] of PIPS[r]){const x=w*(.18+px*.64),y=h*(.12+py*.76),sz=big?w*.48:w*.19,fl=py>.55&&!big;v+=`<path d="${SUIT[s]}" transform="translate(${f(x)} ${f(y)})${fl?' rotate(180)':''} scale(${f(sz)})" fill="${ink}"/>`;}}
    const lab=r==='T'?'10':r;const idx=`<text x="${f(w*.115)}" y="${f(h*.15)}" font-size="${f(w*(lab.length>1?.19:.22))}" font-weight="700" text-anchor="middle" fill="${ink}" font-family="Georgia,'Times New Roman',serif" direction="ltr" letter-spacing="-1">${lab}</text><path d="${SUIT[s]}" transform="translate(${f(w*.115)} ${f(h*.23)}) scale(${f(w*.11)})" fill="${ink}"/>`;
    v+=idx+`<g transform="rotate(180 ${w/2} ${h/2})">${idx}</g>`;}
  const kd=kindOf(lv,c);if(kd){const Rr=w*.135,cx=w*.84,cy=h*.105,m=`<g transform="translate(${f(cx)} ${f(cy)})"><circle r="${f(Rr+1.6)}" fill="#E2B648"/><circle r="${f(Rr)}" fill="#5E361D"/><g transform="scale(${f(Rr*1.5/24)})">${ICON[kd]('#F4DDB2')}</g></g>`;v+=m+`<g transform="rotate(180 ${w/2} ${h/2})">${m}</g>`;}
  return CC[k]=v;}
const ICON_STAR='M0-10l2.6 6.6 7 .6-5.4 4.6 1.7 6.9L0 5.1l-5.9 3.6 1.7-6.9-5.4-4.6 7-.6z';
function backA(w,h){let p='';for(let y=12;y<h-6;y+=12)for(let x=12;x<w-6;x+=12)p+=`M${x} ${y-4.5}l1.4 3.1 3.1 1.4-3.1 1.4-1.4 3.1-1.4-3.1-3.1-1.4 3.1-1.4z`;
  return `<rect width="${w}" height="${h}" rx="${f(w*.07)}" fill="#fff" stroke="#CFC8BA"/><rect x="4" y="4" width="${w-8}" height="${h-8}" rx="${f(w*.05)}" fill="#8E1A2B"/><path d="${p}" fill="#E2B648" opacity=".5"/><rect x="7" y="7" width="${w-14}" height="${h-14}" rx="${f(w*.04)}" fill="none" stroke="#E2B648" stroke-width="1.3"/><circle cx="${w/2}" cy="${h/2}" r="${f(w*.18)}" fill="#8E1A2B" stroke="#E2B648" stroke-width="1.5"/><path d="${SUIT.s}" transform="translate(${w/2} ${h/2}) scale(${f(w*.16)})" fill="#E2B648"/>`;}
// a card placed with its bottom centre at (x,y), turned a, lifted when selected
function cardG(c,lv,o){const w=o.w,h=o.h;return `<g transform="translate(${f(o.x)} ${f(o.y)}) rotate(${f(o.rot||0)})"${o.cls?` class="${o.cls}"`:''}${o.ga?` data-ga="${o.ga}" data-i="${o.i}"`:''}><g transform="translate(${-w/2} ${-h})">
  <rect x="1.5" y="3.5" width="${w}" height="${h}" rx="${f(w*.07)}" fill="#3A2614" opacity="${o.dis?.12:.26}"/>${o.sel?`<rect x="-6" y="-6" width="${w+12}" height="${h+12}" rx="${f(w*.12)}" fill="#FFC933" opacity=".35"/><rect x="-3.5" y="-3.5" width="${w+7}" height="${h+7}" rx="${f(w*.1)}" fill="none" stroke="#FFB300" stroke-width="3.5"/>`:''}
  ${c?face(c,o.lv||lv,w,h):backA(w,h)}${o.dis?`<rect width="${w}" height="${h}" rx="${f(w*.07)}" fill="#EDE7DC" opacity=".6"/>`:''}</g></g>`;}

/* ================= view helpers ================= */
const MS=d=>d.pl.length;
const gIdx=(s,k)=>s*4+k;
const validD=d=>d&&Array.isArray(d.mb)&&Array.isArray(d.hd)&&Array.isArray(d.hd[0]||[])&&typeof d.lv==='string'&&d.mb.length===d.pl.length*4;
function jkSel(d){const key=d.gid+':'+d.np+':'+d.turn+':'+d.ph+':'+(d.pu||[]).join('');if(!S.jk||S.jk.key!==key)S.jk={key};return S.jk;}
// the options for the card the player picked (with the joker's rank and the power card's toggle)
function selOpts(d,s,sel){const c=(d.hd[s]||[])[sel.ci];if(c==null)return [];if(c[0]==='X'&&!sel.as)return [];
  const pw=sel.pw&&d.pw&&d.pw[s]&&!d.pu[s]?d.pw[s]:null;return cardOpts(d,s,c,{as:sel.as,pw:pw==='push2'||pw==='reverse'?pw:null});}
// the move the selection points at, when it is complete
function pickOpt(d,s,sel,opts){if(sel.opt)return sel.opt;return null;}
const sameO=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/* ================= render ================= */
const VB=d=>geo(sidesOf(MS(d))).vb;
function board(d,ctx,sel,opts,live){const n=MS(d),B=sidesOf(n),G=geo(B);boardDef(B);const [vx,vy,vw,vh]=G.vb,Rl=R(d),L=G.L;
  const occ=occOf(d),cs=ctl(d,d.turn);
  // what can be tapped, and the preview of the chosen move
  const tap=new Set(),pv=[];let focus=[],tags='';const opt=sel&&sel.opt;
  if(live&&opts.length&&!opt){const want=pickWant(d,sel,opts);for(const g of want)tap.add(g);for(const g of want){const s=Math.floor(g/4),k=g%4;focus.push(xy(d,s,k,d.mb[g]));}}
  if(live&&opt){const pr=previewOf(d,opt);pv.push(...pr.items);focus.push(...pr.pts);}
  if(live&&!opt&&sel&&sel.k!=null){const g=cs*4+sel.k;focus=[xy(d,cs,sel.k,d.mb[g])];for(const x of tap){const s=Math.floor(x/4),k=x%4;focus.push(xy(d,s,k,d.mb[x]));}}
  // zoom on the move (the real board stays the same; the camera moves)
  const full=S.jkFull||!live||(!opts.length&&!opt);let tf='';let z=1,fx=0,fy=0;
  if(!full&&focus.length){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of focus){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
    const zMax=Math.max(1.5,(n<=4?2.5:n<=6?3.3:4.1)),pad=90;z=Math.min(zMax,vw/Math.max(x1-x0+pad*2,1),vh/Math.max(y1-y0+pad*2,1));z=Math.max(1,z);fx=(x0+x1)/2;fy=(y0+y1)/2;if(z<1.35)z=1;
    const cx=vx+vw/2,cy=vy+vh/2;let tx=cx-fx*z,ty=cy-fy*z;if(z>1)tf=`transform:translate(${f(tx)}px,${f(ty)}px) scale(${f(z)})`;}
  let v=`<svg class="jkb" viewBox="${f(vx)} ${f(vy)} ${f(vw)} ${f(vh)}" role="img" aria-label="لوح الجكارو"><g class="jkz" style="${tf||'transform:none'}"><use href="#jkb${B}"/>`;
  // الحريف: the event holes, marked from the start
  if(Rl.events)for(let k=0;k<B;k++)for(const [no,t] of EVK){const p=G.track[k*19+no];v+=`<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="${HR+5}" fill="none" stroke="${{boost:'#2EA3F2',trap:'#FF5A36',shield:'#4CAF50'}[t]}" stroke-width="3"/><text x="16" y="-12" font-size="15">${{boost:'🌀',trap:'🪤',shield:'🛡'}[t]}</text></g>`;}
  // the pile in the pocket: the last cards played
  (d.pile||[]).forEach(([c,s],i,aa)=>{v+=`<g${i===aa.length-1?` class="jkpl"`:''} transform="translate(${[-14,10,-2][i]||0} ${[-6,4,-2][i]||0}) rotate(${[-12,8,-3][i]||0}) scale(.9)">${cardG(c,d.lv,{x:0,y:61,w:86,h:122})}</g>`;});
  // the last move: a soft ring where each marble landed
  if(d.mv&&d.win==null)for(const m of d.mv.moves||[]){if(m.to==null||m.to<0)continue;const q=xy(d,m.s,m.k,m.to);v+=`<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${MR+5}" fill="${COLS[d.pl[m.s]]}" fill-opacity=".22" stroke="#FFE7B8" stroke-width="2" stroke-opacity=".8"/>`;}
  v+=pv.filter(x=>x.under).map(x=>x.svg).join('');
  // the marbles: one <use> each
  for(let s=0;s<n;s++)for(let k=0;k<4;k++){const g=gIdx(s,k),p=d.mb[g],q=xy(d,s,k,p),can=tap.has(g),isSel=sel&&((sel.k!=null&&s===cs&&k===sel.k)||(sel.o!=null&&s===sel.o&&k===sel.ok&&sel.ok!=null));
    v+=`<g id="jkm-${s}-${k}" class="jkmb ${can?'can':''}" style="transform:translate(${f(q.x)}px,${f(q.y)}px)"${can?` data-ga="mb" data-i="${g}"`:''}>${can?`<circle r="${MR+16}" fill="transparent"/><circle r="${MR+9}" fill="#FFD54A" opacity=".28"/><circle r="${MR+5}" fill="none" stroke="#FFD54A" stroke-width="3.4"/>`:''}${isSel?`<circle r="${MR+8}" fill="none" stroke="#FFB300" stroke-width="4"/>`:''}${d.sh&&d.sh[g]==='1'?`<circle r="${MR+6}" fill="none" stroke="#4CAF50" stroke-width="3" stroke-dasharray="4 3"/>`:''}<use href="#jkm${d.pl[s]}"/></g>`;}
  v+=pv.filter(x=>!x.under).map(x=>x.svg).join('');
  v+=`</g>`;
  // the mini map while zoomed
  if(tf){const u=vw/360,ms=86*u/Math.max(vw,vh),mw=vw*ms,mh=vh*ms,ox=vx+8*u,oy=vy+8*u;const cx=vx+vw/2,cy=vy+vh/2,rx=fx-(vw/2)/z,ry=fy-(vh/2)/z;
    v+=`<g class="jkmini" transform="translate(${f(ox+mw/2)} ${f(oy+mh/2)})"><circle r="${f(Math.max(mw,mh)/2+5*u)}" fill="#F6F1E8" stroke="#D8CBB4" stroke-width="${f(2*u)}"/><g transform="scale(${f(ms)})"><use href="#jkb${B}"/><rect x="${f(rx)}" y="${f(ry)}" width="${f(vw/z)}" height="${f(vh/z)}" fill="none" stroke="#FF8A00" stroke-width="${f(2.5*u/ms)}" rx="6"/></g></g>`;}
  return v+'</svg>';}
// which marbles the next tap may pick, given the selection so far
function pickWant(d,sel,opts){const cs=ctl(d,d.turn),out=new Set();
  if(sel.g){for(let k=0;k<4;k++){const p=d.mb[cs*4+k];if(p>=0&&p<Lg(d))out.add(cs*4+k);}return out;}
  for(const o of opts){
    if(o.t==='o'){const k=[0,1,2,3].find(k=>d.mb[cs*4+k]<0);if(sel.k==null)out.add(cs*4+k);}
    else if(o.t==='f'||o.t==='b'){if(sel.k==null)out.add(cs*4+o.k);}
    else if(o.t==='f5'){if(sel.k==null)out.add(o.o*4+o.k);}
    else if(o.t==='7'){if(sel.k==null)out.add(cs*4+o.k);else if(o.k===sel.k&&sel.a!=null&&o.a===sel.a&&o.k2!=null)out.add(cs*4+o.k2);}
    else if(o.t==='j'){if(sel.k==null)out.add(cs*4+o.k);else if(o.k===sel.k)out.add(o.o*4+o.ok);}}
  return out;}
// the dotted path, the ghost marble where it lands, a target on a marble it captures
function previewOf(d,opt){const items=[],pts=[];const cs=ctl(d,d.turn);
  const dots=(s,k,from,to,bk,c)=>{const L=Lg(d);let p=from;const n=bk?((from-to+L)%L):(to-from+(to<from?L:0));for(let i=1;i<n;i++){p=bk?((from-i)%L+L)%L:from+i;let pp=p;if(!bk&&from<L&&pp>=L&&to<L)pp-=L;const q=xy(d,s,k,pp);pts.push(q);items.push({svg:`<circle cx="${f(q.x)}" cy="${f(q.y)}" r="4.2" fill="#FFF6D8" stroke="${c||'#E0A800'}" stroke-width="1.6"/>`});}};
  const ghost=(s,k,p,lab,c)=>{const q=xy(d,s,k,p);pts.push(q);items.push({svg:`<g transform="translate(${f(q.x)} ${f(q.y)})" opacity=".6"><use href="#jkm${d.pl[s]}"/></g><circle cx="${f(q.x)}" cy="${f(q.y)}" r="${MR+4}" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="4 3"/>`});if(lab)items.push({svg:tagS(q.x,q.y+44,lab,c)});};
  const target=m=>{const q=xy(d,m.s,m.k,m.p!=null?m.p:d.mb[m.s*4+m.k]);items.push({svg:`<g transform="translate(${f(q.x)} ${f(q.y)})"><circle r="${MR+6}" fill="none" stroke="#FF3347" stroke-width="3" stroke-dasharray="7 4"/><path d="M0 ${-MR-13}v8M0 ${MR+13}v-8M${-MR-13} 0h8M${MR+13} 0h-8" stroke="#FF3347" stroke-width="3" stroke-linecap="round"/></g>`});};
  const one=(m,c,lab)=>{if(!m)return;pts.push(xy(d,m.s,m.k,m.from));dots(m.s,m.k,m.from,m.to,m.back,c);m.kills.forEach(target);ghost(m.s,m.k,m.to,lab,m.kills.length?'#FF3347':c);};
  const occ=occOf(d);
  if(opt.t==='o')one(X.outMove(d,cs,occ),null,'طلعة');
  else if(opt.t==='f')one(fwd(d,cs,opt.k,opt.n,occ,opt.tr?{tr:1}:null),null,(opt.n)+(opt.tr?' 💥':''));
  else if(opt.t==='b')one(back(d,cs,opt.k,opt.n,occ),null,'↶ '+opt.n);
  else if(opt.t==='f5')one(fwd(d,opt.o,opt.k,5,occ,{wrap:!teamOf(d,cs).includes(opt.o)}),null,'5');
  else if(opt.t==='7'){const tr=d.luck==='sevenTramples'?{tr:1}:null;const m1=fwd(d,cs,opt.k,opt.a,occ,tr);one(m1,'#E0A800',String(opt.a));if(opt.k2!=null&&m1){const d2=X.doMove(d,m1);one(fwd(d2,cs,opt.k2,7-opt.a,occOf(d2),tr),'#2E9E5B',String(7-opt.a));}}
  else if(opt.t==='j'){const a=xy(d,cs,opt.k,d.mb[cs*4+opt.k]),b=xy(d,opt.o,opt.ok,d.mb[opt.o*4+opt.ok]);pts.push(a,b);const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,cx=mx-dy*.35,cy=my+dx*.35;
    items.push({svg:`<path d="M${f(a.x)} ${f(a.y)}Q${f(cx)} ${f(cy)} ${f(b.x)} ${f(b.y)}" fill="none" stroke="#FFD54A" stroke-width="7" opacity=".45" stroke-linecap="round"/><path d="M${f(a.x)} ${f(a.y)}Q${f(cx)} ${f(cy)} ${f(b.x)} ${f(b.y)}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/>`,under:1});
    const L=Lg(d),pa=d.mb[cs*4+opt.k],gain=((cellOf(d,opt.o,d.mb[opt.o*4+opt.ok])-cellOf(d,cs,pa))%L+L)%L;items.push({svg:tagS((a.x+b.x)/2,(a.y+b.y)/2,'⇄ '+(gain<=L/2?'تكسب '+gain:'ترجع '+(L-gain)),'#FFD54A',1)});}
  else if(opt.t==='tb'||opt.t==='rq'){}
  return {items,pts};}
function tagS(x,y,t,c,dark){const fs=15,w=t.length*fs*.56+20,h=fs+12;return `<g transform="translate(${f(x)} ${f(y)})"><rect x="${f(-w/2)}" y="${-h/2}" width="${f(w)}" height="${h}" rx="${h/2}" fill="${c||'#fff'}"/><text y="${f(fs*.36)}" font-size="${fs}" font-weight="800" text-anchor="middle" fill="${c&&!dark?'#fff':'#2A1A0E'}">${t}</text></g>`;}
// the player strip around the board: KH kids, cards left, partners, whose turn
function seats(d,ctx,top,extra){const n=MS(d),G=geo(sidesOf(n));const rows=[...Array(n).keys()].map(s=>({s,p:G.pens[armOf(n,s)].c})).filter(x=>top?x.p.y<0:x.p.y>=0).sort((a,b)=>b.p.x-a.p.x);
  if(!rows.length&&!extra)return '';return `<div class="jkseats">${extra?`<div class="jklvs">${extra}</div>`:''}${rows.map(({s})=>{const me=ctx&&ctx.v===s,cs=ctl(d,s),home=[0,1,2,3].filter(k=>d.mb[s*4+k]>=Lg(d)).length;
    return `<div class="jks ${n>=6?'xs':''} ${d.turn===s&&d.win==null?'turn':''} ${d.out[s]==='1'?'gone':''}" style="--c:${COLS[d.pl[s]]}"><i class="av">${KH.face({who:d.pl[s],size:28,ring:1,bg:COLS[d.pl[s]]})}</i><span><b>${me?'أنت':nm(d,s)}</b><small><i class="dot"></i>🂠 ${(d.hd[s]||[]).length} · ${home}/4${cs!==s?' · يلعب لشريكه':''}</small></span>${d.team&&partner(d,s)>=0&&ctx&&ctx.v>=0&&partner(d,ctx.v)===s?'<em>🤝</em>':''}</div>`;}).join('')}</div>`;}
// the hand, fanned like real cards (RTL: the first card on the right)
function handSVG(d,s,sel,ok,mode,lv,small){const hd=d.hd[s]||[],n=hd.length;if(!n)return '';const w=small?50:n>5?58:64,h=Math.round(w*1.42),gap=Math.min(small?46:58,300/Math.max(1,n-1));
  const order=[...hd.keys()].reverse().sort((a,b)=>(a===sel.ci)-(b===sel.ci));let v='';
  for(const i of order){const t=(n-1)/2-i,x=195+t*gap,a=-t*5,y=h+22+t*t*2.4-(sel.ci===i?18:0);v+=cardG(hd[i],lv,{x,y,rot:a,w,h,sel:sel.ci===i,dis:mode==='play'&&!ok[i],ga:'card',i});}
  return `<svg class="jkhand" viewBox="0 0 390 ${h+34}" role="group" aria-label="ورقك">${v}</svg>`;}

function jkRender(d,ctx){if(!validD(d))return `<div class="jkwrap"><p class="hint">هذي جولة من نسخة قديمة من جكارو</p><button class="btn red wide" data-a="again">ابدأ جولة جديدة</button></div>`;
  const n=MS(d),s0=d.turn,my=ctx.my&&d.win==null,v0=ctx.local?s0:ctx.v,Rl=R(d);const sel=my?jkSel(d):{};
  const fresh=!(d.np>0)&&!(d.pp||[]).some(Boolean)&&d.win==null;
  let h=`<div class="jkwrap">`;
  // the rule level: picked before the first card by the host (or on one phone), shown to all
  const canLv=fresh&&(S.mode!=='online'||(ctx.v>=0&&d.pl[ctx.v]===S.me&&amHost()));
  if(fresh)h+=`<div class="jklv">${fresh?LVS.map(k=>`<button class="seg ${d.lv===k?'on':''}" data-ga="lv" data-i="${LVS.indexOf(k)}" ${canLv?'':'disabled'}>${JK_RULES[k].ic} ${JK_RULES[k].name}</button>`).join(''):`<span class="lvb">${Rl.ic} ${Rl.name}</span>${d.luck?`<span class="lvb luck">🍀 ${LUCK[d.luck]}</span>`:''}`}</div>`;
  if(fresh&&!canLv&&S.mode==='online')h+=`<p class="note jkc">صاحب الغرفة يختار المستوى قبل أول ورقة</p>`;
  // a banner for the moments of الحريف and the power cards: everybody sees them
  const ev=d.mv&&(d.mv.evs||[]).length?d.mv.evs[d.mv.evs.length-1]:null;
  if(d.win==null&&ev)h+=`<div class="jkban ${ev.t}" data-k="jkban${d.mv.sid}">${{boost:'🌀 دفعة! الحبة تقدّمت ٣',trap:'🪤 فخ! الحبة رجعت ٤',shield:'🛡 درع لين دوره الجاي'}[ev.t]}</div>`;
  else if(d.win==null&&d.mv&&d.mv.pw)h+=`<div class="jkban shield" data-k="jkbanp${d.mv.sid}">⚡ كرت الحريف: ترس</div>`;
  h+=seats(d,ctx,true,fresh?'':`<span class="lvb">${Rl.ic} ${Rl.name}${d.luck?' 🍀':''}</span>`);
  const cards=v0>=0?(d.hd[v0]||[]):[];
  // what this player may do now
  let opts=[],plays=[],ok=[],mode='wait';
  if(my){if(d.ph==='pass')mode='pass';else if(d.ph==='throw')mode='throw';else{mode='play';plays=allPlays(d,s0,false);ok=cards.map((c,i)=>plays.some(p=>p[0]===i)||(c[0]==='X'&&cardOpts(d,s0,c).length>0));if(!plays.length)mode='burn';
      if(mode==='play'&&sel.ci!=null)opts=selOpts(d,s0,sel);}}
  h+=board(d,ctx,sel,opts,my&&mode==='play'&&sel.ci!=null);
  h+=seats(d,ctx,false);
  if(d.win==null&&v0>=0){
    const cs=ctl(d,s0);let hint='',btns='';
    if(!my)hint=`<span class="note">${d.ph==='throw'?`${nm(d,s0)} يرمي ورقة`:d.ph==='pass'?`${nm(d,s0)} يعطي شريكه ورقة`:`دور ${nm(d,s0)}`}</span>`;
    else if(mode==='pass'){hint=`🤝 اختر ورقة تعطيها ${nm(d,partner(d,s0))}`;btns=`<button class="btn go wide" data-ga="pass" ${sel.ci==null?'disabled':''}>أعطِ شريكك الورقة</button>`;}
    else if(mode==='throw'){hint=`🔥 ${nm(d,d.ret)} لعب العشرة عليك: ارمِ ورقة`;btns=`<button class="btn red wide" data-ga="throw" ${sel.ci==null?'disabled':''}>ارمِ الورقة</button>`;}
    else if(mode==='burn'){hint='ما عندك حركة 😕 اختر ورقة تحرقها';btns=`<button class="btn red wide" data-ga="burn" ${sel.ci==null?'disabled':''}>🔥 احرق${sel.ci!=null?' '+CN(cards[sel.ci]):''}</button>`;}
    else{const c=cards[sel.ci];
      if(cs!==s0)hint=`حباتك وصلت 🎉 تلعب الحين بحبات ${nm(d,cs)}. `;
      if(sel.g)hint+='⚡ ترس: اختر حبتك اللي تحميها';
      else if(c==null)hint+='دورك، اختر ورقة';
      else if(c[0]==='X'&&!sel.as)hint+='الجوكر يصير أي ورقة: اختر وش يصير';
      else{hint+=`<b>${CN(c[0]==='X'?sel.as+'s':c).replace(/[♠♥♦♣]/,'')}:</b> ${powerWords(d,c[0]==='X'?sel.as+'h':c)}`;
        if(!opts.length)hint+=' (ما تمشي الحين)';
        else if(sel.opt)hint+=' ✓';}
      // step chips: the joker's rank, 1 or 11, the 7 split, the 10 or red queen burn
      let chips='';
      if(c&&c[0]==='X'&&!sel.g)chips+=`<div class="jkchips">${RANKS.split('').map((r,i)=>`<button class="chip ${sel.as===r?'on':''}" data-ga="as" data-i="${i}">${r==='T'?'10':r}</button>`).join('')}</div>`;
      if(c&&opts.length&&!sel.opt){const amts=amtChoices(d,sel,opts);if(amts.length>1)chips+=`<div class="jkchips">${amts.map(a=>`<button class="chip" data-ga="amt" data-i="${a}">${a}</button>`).join('')}</div>`;
        if(sel.split)chips+=splitHTML(sel);
        for(const o of opts)if(o.t==='tb'||o.t==='rq')chips+=`<div class="jkchips"><button class="chip burn" data-ga="${o.t}">🔥 احرق على ${nm(d,o.to)}</button></div>`;}
      // الحريف: the hidden power card
      if(Rl.powerCard&&d.pw&&d.pw[s0]&&!d.pu[s0])chips+=`<div class="jkchips"><button class="chip pw ${sel.pw||sel.g?'on':''}" data-ga="pw">⚡ كرت الحريف: ${POWERS[d.pw[s0]]}</button></div>`;
      const sub=sel.opt?optWords(d,sel.opt):'';
      btns=chips+`<div class="jkacts"><button class="btn undo" data-ga="undo" ${sel.ci==null&&!sel.g?'disabled':''} aria-label="تراجع">↶</button><button class="btn go jkgo" data-ga="go" ${sel.opt?'':'disabled'}>${sel.opt?'حرّك':'اختر'}${sub?`<small>${sub}</small>`:''}</button>${my?`<button class="btn sm jkfull" data-ga="full">${S.jkFull?'🔍 قرّب':'⤢ اللوح كامل'}</button>`:''}</div>`;}
    const small=my&&mode==='play'&&sel.ci!=null&&(sel.split||(cards[sel.ci]&&cards[sel.ci][0]==='X'));
    h+=`<p class="hint jkhint">${hint}</p>`+handSVG(d,v0,my?sel:{},ok,my?mode:'wait',d.lv,small)+btns;}
  return h+'</div>';}
function amtChoices(d,sel,opts){if(sel.k==null)return [];const c=[];for(const o of opts){if(o.t==='f'&&o.k===sel.k&&!c.includes(o.n))c.push(o.n);}return c.length>1?c:[];}
function splitHTML(sel){let v='<div class="jksplit"><small>كم خطوة للحبة الأولى؟ والباقي للثانية</small><div class="jkrail">';for(let a=1;a<=7;a++)v+=`<button class="nb ${sel.a===a?'on':''}" data-ga="amt" data-i="${a}">${a}<i>${a<7?7-a:'كاملة'}</i></button>`;return v+'</div></div>';}
function optWords(d,o){const L=Lg(d);if(o.t==='o')return 'تطلّع حبة';if(o.t==='tb'||o.t==='rq')return `تحرق على ${nm(d,o.to)}`;if(o.t==='j')return `تبدّل مع حبة ${nm(d,o.o)}`;
  if(o.t==='7')return o.k2!=null?`${o.a} + ${7-o.a}`:'٧ لحبة وحدة';if(o.t==='b')return `ترجع ${o.n}`;if(o.t==='f5')return `تمشّي حبة ${nm(d,o.o)} ٥`;
  const m=fwd(d,ctl(d,d.turn),o.k,o.n,occOf(d),o.tr?{tr:1}:null);return `تمشي ${o.n}`+(m&&m.kills.length?`، تقتل ${m.kills.map(x=>'حبة '+nm(d,x.s)).join(' و')}`:'')+(m&&m.to>=L?'، تدخل الحارة':'');}

/* ================= clicks ================= */
function click(a,i,d,ctx){if(!validD(d))return;
  if(a==='full'){S.jkFull=!S.jkFull;window.render();return;}
  if(a==='lv'){const fresh=!(d.np>0)&&!(d.pp||[]).some(Boolean);if(!fresh||!LVS[i])return;if(S.mode==='online'&&!(amHost()&&ctx.v>=0&&d.pl[ctx.v]===S.me))return;
    const lv=LVS[i];setPref(lv);try{if(typeof setCfg==='function'&&isHost())setCfg({jklv:lv});}catch(e){}
    const base=jkInit(d.pl.length,lv);act(jkStart({...d,...base,lv,gid:d.gid,st:d.st,turn:d.st,pl:d.pl,out:d.out,win:null}));return;}
  if(!ctx.my)return;const s=d.turn,sel=jkSel(d),cards=d.hd[s]||[];
  if(a==='card'){if(cards[i]==null)return;S.jk={key:sel.key,ci:sel.ci===i?null:i,pw:sel.pw&&sel.ci!==i?sel.pw:null};
    const c=cards[i];if(S.jk.ci!=null&&d.ph==='play'&&c[0]!=='X'){const o=selOpts(d,s,S.jk);autoPick(d,S.jk,o);}window.render();return;}
  if(a==='pass'&&d.ph==='pass'&&sel.ci!=null){act(passCard(d,sel.ci));return;}
  if(a==='throw'&&d.ph==='throw'&&sel.ci!=null){act(throwCard(d,sel.ci));return;}
  if(a==='burn'&&d.ph==='play'&&sel.ci!=null&&!allPlays(d,s,false).length){act(playCard(d,sel.ci,null));return;}
  if(a==='undo'){if(sel.opt){sel.opt=null;if(sel.k2!=null||sel.ok!=null){sel.k2=null;sel.o=null;sel.ok=null;}else if(sel.a!=null&&sel.split){sel.a=null;}else sel.k=null;}
    else if(sel.a!=null){sel.a=null;}else if(sel.k!=null){sel.k=null;sel.split=0;}else if(sel.g){sel.g=0;}else if(sel.as){sel.as=null;}else S.jk={key:sel.key};window.render();return;}
  if(a==='pw'){const p=d.pw&&d.pw[s];if(!p||d.pu[s])return;if(p==='guard'){S.jk={key:sel.key,g:sel.g?0:1};}else{sel.pw=sel.pw?null:p;sel.k=null;sel.opt=null;sel.a=null;sel.split=0;}window.render();return;}
  if(a==='go'){if(!sel.opt||sel.ci==null)return;const o=selOpts(d,s,sel).find(x=>sameO(x,sel.opt));if(!o)return;act(playCard(d,sel.ci,{...o,...(sel.as?{as:sel.as}:{})}));return;}
  if(sel.ci==null&&!sel.g)return;
  const opts=sel.g?[]:selOpts(d,s,sel),cs=ctl(d,s);
  if(a==='as'){sel.as=RANKS[i]||null;sel.k=null;sel.opt=null;autoPick(d,sel,selOpts(d,s,sel));window.render();return;}
  if(a==='tb'||a==='rq'){const o=opts.find(x=>x.t===a);if(o){sel.opt=o;sel.k=null;}window.render();return;}
  if(a==='amt'){if(sel.split){if(i===7){const o=opts.find(x=>x.t==='7'&&x.k===sel.k&&x.a===7);if(o)sel.opt=o;}else{sel.a=i;sel.opt=null;}}
    else{const o=opts.find(x=>x.t==='f'&&x.k===sel.k&&x.n===i);if(o)sel.opt=o;}window.render();return;}
  if(a==='mb'){const ms=Math.floor(i/4),mk=i%4;
    if(sel.g){if(ms===cs&&d.mb[i]>=0&&d.mb[i]<Lg(d))act(guard(d,mk));return;}
    const c=cards[sel.ci],r=c&&(c[0]==='X'?sel.as:c[0]);
    if(r==='7'){if(sel.k==null){if(ms===cs&&opts.some(o=>o.t==='7'&&o.k===mk)){sel.k=mk;sel.split=1;sel.a=null;const only=opts.filter(o=>o.k===mk);if(only.length===1)sel.opt=only[0];}}
      else if(sel.a!=null&&ms===cs){const o=opts.find(o=>o.t==='7'&&o.k===sel.k&&o.a===sel.a&&o.k2===mk);if(o)sel.opt=o;}window.render();return;}
    if(opts.some(o=>o.t==='j')){if(sel.k==null){if(ms===cs&&opts.some(o=>o.t==='j'&&o.k===mk))sel.k=mk;}else{const o=opts.find(o=>o.t==='j'&&o.k===sel.k&&o.o===ms&&o.ok===mk);if(o){sel.o=ms;sel.ok=mk;sel.opt=o;}}window.render();return;}
    if(d.mb[i]<0&&ms===cs){const o=opts.find(o=>o.t==='o');if(o){sel.k=mk;sel.opt=o;}window.render();return;}
    const mine=opts.filter(o=>(o.t==='f'||o.t==='b')&&ms===cs&&o.k===mk||o.t==='f5'&&o.o===ms&&o.k===mk);
    if(mine.length===1){sel.k=ms===cs?mk:null;if(mine[0].t==='f5'){sel.o=ms;sel.ok=mk;}sel.opt=mine[0];}else if(mine.length>1){sel.k=mk;sel.opt=null;}
    window.render();return;}}
// a card with a single possible move picks it at once (still waiting for «حرّك»)
function autoPick(d,sel,opts){if(opts.length===1&&opts[0].t!=='7'){const o=opts[0];sel.opt=o;if(o.k!=null&&(o.t==='f'||o.t==='b'||o.t==='o'||o.t==='j'))sel.k=o.k;if(o.t==='f5'){sel.o=o.o;sel.ok=o.k;}if(o.t==='j'){sel.o=o.o;sel.ok=o.ok;}if(o.t==='o')sel.k=[0,1,2,3].find(k=>d.mb[ctl(d,d.turn)*4+k]<0);}}

/* ================= motion (motion-spec.md): transform/opacity, steps ≤ 450 ms, lite: a short jump ================= */
const liteOn2=()=>{try{return document.documentElement.classList.contains('lite')||matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return true;}};
const Tf=(p,s=1)=>`translate(${f(p.x)}px,${f(p.y)}px) scale(${s})`;
function after(d){if(!validD(d))return;const m=d.mv;if(!m||!once('jk'+d.gid+'_'+m.sid))return;const el=id=>document.getElementById(id);
  const moves=(m.moves||[]).filter(x=>el(`jkm-${x.s}-${x.k}`));
  if(liteOn2()){if((m.kills||[]).length)sfx('lose');else if(moves.length)sfx('pop');return;}
  // the card lands in the pocket from the player's side of the table (380 ms)
  const pc=app.querySelector('.jkpl');if(pc&&m.card){try{pc.animate([{transform:'translate(0px,240px) rotate(-10deg) scale(1.5)',opacity:.2},{transform:'none',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.7,.3,1)',composite:'add'});}catch(e){}}
  // the win: the team's marbles pulse one after another
  if(d.win!=null){(d.wins||[d.win]).forEach((s,j)=>[0,1,2,3].forEach(k=>{const e=el(`jkm-${s}-${k}`);if(!e)return;const b=e.style.transform;try{e.animate([{transform:b},{transform:b+' scale(1.35)'},{transform:b}],{duration:220,delay:(j*4+k)*70});}catch(x){}}));}
  if(!moves.length&&!(m.kills||[]).length){if(m.card)sfx('tap');return;}
  const L=Lg(d);let t0=0;const anims=[];S.holdRender=true;const ani=(e,kf,o)=>{try{anims.push(e.animate(kf,{fill:'backwards',easing:'ease-in-out',...o}));}catch(x){}};
  if(m.swap&&moves.length>=2){const a=moves[0],b=moves[1];const pa=xy(d,a.s,a.k,a.from),pb=xy(d,b.s,b.k,b.from),qa=xy(d,a.s,a.k,a.to),qb=xy(d,b.s,b.k,b.to);
    ani(el(`jkm-${a.s}-${a.k}`),[{transform:Tf(pa)},{transform:Tf({x:(pa.x+qa.x)/2+(qa.y-pa.y)*.25,y:(pa.y+qa.y)/2-(qa.x-pa.x)*.25},1.25),offset:.5},{transform:Tf(qa)}],{duration:420});
    ani(el(`jkm-${b.s}-${b.k}`),[{transform:Tf(pb)},{transform:Tf({x:(pb.x+qb.x)/2-(qb.y-pb.y)*.25,y:(pb.y+qb.y)/2+(qb.x-pb.x)*.25},1.25),offset:.5},{transform:Tf(qb)}],{duration:420});t0=440;sfx('pop');}
  else for(const x of moves){const e=el(`jkm-${x.s}-${x.k}`);const pts=[];
      if(x.from<0)pts.push(xy(d,x.s,x.k,-1),xy(d,x.s,x.k,0));
      else{const back=x.back,n=back?((x.from-x.to+L)%L):((x.to-x.from+(x.to<x.from&&x.from<L?L:0)));pts.push(xy(d,x.s,x.k,x.from));for(let i=1;i<=n;i++){let p=back?((x.from-i)%L+L)%L:x.from+i;if(!back&&x.from<L&&p>=L&&x.to<L)p-=L;pts.push(xy(d,x.s,x.k,p));}}
      if(pts.length<2)continue;const steps=pts.length-1,st=Math.max(55,Math.min(120,Math.floor(Math.min(900,1100-t0)/steps)));const kf=[];
      for(let i=0;i<steps;i++){kf.push({transform:Tf(pts[i]),offset:i/steps},{transform:Tf({x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2-6},1.16),offset:(i+.5)/steps});}kf.push({transform:Tf(pts[steps]),offset:1});
      ani(e,kf,{duration:st*steps,delay:t0,easing:'linear'});t0+=st*steps;}
  // captures: the victim knocked, then its arc back to the pen
  for(const k of m.kills||[]){const e=el(`jkm-${k.s}-${k.k}`);if(!e)continue;const a=xy(d,k.s,k.k,k.from),b=xy(d,k.s,k.k,-1),mid={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-80};
    ani(e,[{transform:Tf(a)},{transform:Tf(a,1.35),offset:.2},{transform:Tf(mid,1.3),offset:.6},{transform:Tf(b)}],{duration:Math.min(420,1150-t0),delay:Math.min(t0,700)});}
  if((m.kills||[]).length)setTimeout(()=>sfx('lose'),Math.min(t0,700));
  const total=Math.min(1180,t0+((m.kills||[]).length?440:0)+60);setTimeout(()=>sfx('pop'),Math.min(t0,1100));
  setTimeout(()=>{S.holdRender=false;if(S.renderPending)window.render();},total);}

/* ================= bots: read the rule flags, partner-aware ================= */
const JKC={A:3,K:3,J:3,7:2.5,4:2,5:1.5,T:1.5,Q:1,X:4};
function evalD(d,s,lv){const n=MS(d),L=Lg(d),team=teamOf(d,s);let v=0;
  const pos=q=>q<0?-L*.25:q>=L?L+30+(q-L)*4:q;
  const occ=occOf(d);
  for(let p=0;p<n;p++){if(d.out[p]==='1')continue;const mine=team.includes(p);for(let k=0;k<4;k++){const q=d.mb[p*4+k];v+=(mine?1:-(lv===3?.9:.6))*pos(q);
      // hard also counts how exposed a marble stands: an opponent 1–13 holes behind can land on it with one card
      if(lv===3&&mine&&q>0&&q<L){const c=cellOf(d,p,q);let hit=0;for(let t=1;t<=13;t++){const o=occ[(c-t+L)%L];if(o&&!team.includes(o.s)&&d.out[o.s]!=='1')hit++;}if(hit)v-=(q+L*.15)*Math.min(1,.3*hit);
        // a marble that blocks its partner's way on its own start costs a little
        if(q===0)v-=3;}}}
  return v;}
function botPlay(d,s,lv){const plays=allPlays(d,s,R(d).powerCard&&lv>1);const hd=d.hd[s]||[];
  if(!plays.length){const i=hd.map((c,i)=>[i,JKC[c[0]]||0]).sort((a,b)=>a[1]-b[1])[0][0];return playCard(d,i,null);}
  if(lv===1&&Math.random()<.4)return playCard(d,...pickR(plays));
  // the power card «ترس»: shield the most threatened marble now and then (it does not end the turn)
  if(R(d).powerCard&&d.pw[s]==='guard'&&!d.pu[s]&&lv>1&&Math.random()<.25){const cs=ctl(d,s);const best=[0,1,2,3].filter(k=>d.mb[cs*4+k]>0&&d.mb[cs*4+k]<Lg(d)).sort((a,b)=>d.mb[cs*4+b]-d.mb[cs*4+a])[0];if(best!=null)return guard(d,best);}
  let cand=plays;if(cand.length>500)cand=cand.slice().sort(()=>Math.random()-.5).slice(0,500);// a node cap: never more than 500 tries
  const base=evalD(d,s,lv);let best=null,bv=-1e18;
  for(const [i,o] of cand){let nd;try{nd=playCard(d,i,o);}catch(e){continue;}if(nd.win!=null&&(nd.wins||[]).includes(s))return nd;
    let v=evalD(nd,s,lv)-base-(JKC[hd[i][0]]||0)*(lv===3?2.2:lv===2?1:0)+(o.pw?-6:0)+Math.random()*(lv===1?18:lv===2?4:1);
    if(o.t==='tb'||o.t==='rq')v+=lv===3?7:3;if(nd.turn===s&&nd.ph==='play')v+=lv===3?8:3;
    if(v>bv){bv=v;best=nd;}}
  return best||playCard(d,plays[0][0],plays[0][1]);}
function bot(d,s,lv){if(!validD(d)||d.win!=null||d.turn!==s)return undefined;const hd=d.hd[s]||[];if(!hd.length)return nextTurn(d,nextSeat(d,s));
  if(d.ph==='pass'){const p=partner(d,s);const pen=[0,1,2,3].some(k=>d.mb[p*4+k]<0);const val=c=>(c[0]==='A'||c[0]==='K')&&pen?-5:-(JKC[c[0]]||0);
    const i=lv===1?rnd(hd.length):hd.map((c,i)=>[i,val(c)]).sort((a,b)=>a[1]-b[1])[0][0];return passCard(d,i);}
  if(d.ph==='throw'){const i=lv===1?rnd(hd.length):hd.map((c,i)=>[i,JKC[c[0]]||0]).sort((a,b)=>a[1]-b[1])[0][0];return throwCard(d,i);}
  return botPlay(d,s,lv);}

/* ================= the game ================= */
const JKICON=`<svg viewBox="0 0 100 100"><defs><linearGradient id="jkiw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8A5530"/><stop offset="1" stop-color="#4E2C16"/></linearGradient><radialGradient id="jkir" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#ffd0d0"/><stop offset=".5" stop-color="#D9233A"/><stop offset="1" stop-color="#6E0F1B"/></radialGradient><radialGradient id="jkib" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#d6e8ff"/><stop offset=".5" stop-color="#1E6BDB"/><stop offset="1" stop-color="#0E3570"/></radialGradient></defs><rect width="100" height="100" fill="#F1E6D2"/><path d="M28 6H72L94 28V72L72 94H28L6 72V28Z" fill="url(#jkiw)" stroke="#E1C597" stroke-width="3"/>${[...Array(10).keys()].map(i=>`<circle cx="${22+i*6.2}" cy="${70-Math.abs(i-4.5)*3.4}" r="2.4" fill="#D9BC8E"/>`).join('')}<path d="M50 30l3 6 6.5 1-4.7 4.6 1.1 6.5L50 45l-5.9 3.1 1.1-6.5-4.7-4.6 6.5-1z" fill="none" stroke="#D7B68A" stroke-width="1.6"/><circle cx="31" cy="66" r="7" fill="url(#jkir)"/><circle cx="69" cy="64" r="7" fill="url(#jkib)"/><g transform="translate(58 18) rotate(12)"><rect width="22" height="31" rx="3" fill="#fff" stroke="#CFC8BA"/><text x="4" y="11" font-size="9" font-weight="700" fill="#C8102E" font-family="Georgia,serif">7</text><circle cx="17" cy="6" r="4" fill="#5E361D" stroke="#E2B648"/></g></svg>`;
GAMES.jakaro={name:'جكارو',cat:'board',lbc:'#7B4A2A',icon:JKICON,
  teams:'native',teamsOk:(z,n)=>n>=4&&n%2===0&&z.length===n/2&&z.every(x=>x===2),
  init:n=>jkInit(n,levelPref()),start:d=>jkStart(d),
  hide:{seat:['hd','pp','pw'],all:['deck']},
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>(d&&d.last)||'',
  points:d=>validD(d)?d.pl.map((r,s)=>{const L=Lg(d);let f=0;for(let k=0;k<4;k++)if(d.mb[s*4+k]>=L)f++;return f+'/4'+(d.team?' 🤝'+(s%(d.pl.length/2)+1):'');}):d.pl.map(()=>''),
  status(d,ctx){if(!validD(d))return turnTxt(d,ctx);return (d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx);},
  render:jkRender,click,after,bot,
  botDelay:(d,s,lv)=>validD(d)&&!(d.np>0)&&!(d.pp||[]).some(Boolean)?3200:900+rnd(500),
  onTimeout:d=>{if(!validD(d))return {...d,turn:nextSeat(d,d.turn)};const s=d.turn,nd=bot(d,s,2);return nd===undefined?{...d,turn:nextSeat(d,s)}:nd;},
  // a player who left: alone, their marbles go home; in teams the partner plays them later. A team with nobody left loses.
  onSkip(nd){if(!validD(nd))return nd;const n=MS(nd),L=Lg(nd);if(!nd.team)nd={...nd,mb:nd.mb.map((p,i)=>nd.out[Math.floor(i/4)]==='1'&&p>=0&&p<L?-1:p)};
    const al=aliveSeats(nd);if(nd.team&&al.length&&al.every(x=>x%(n/2)===al[0]%(n/2)))return {...nd,win:al[0],wins:al};
    if(!nd.team&&al.length===1)return {...nd,win:al[0],wins:al};
    let t=nd.turn;if(nd.ph==='throw'&&nd.out[nd.tb]==='1')nd={...nd,ph:'play',tb:-1};if(nd.ph==='pass')nd={...nd,ph:'play',pp:nd.pl.map(()=>''),hd:nd.hd.map((h,s)=>h.concat(nd.pp[s]?[nd.pp[s]]:[]))};
    return nextTurn(nd,nd.out[t]==='1'?nextSeat(nd,t):t,nd.last);},
  // the room's host left while hands were hidden: the marbles stay, everybody still in gets a new hand
  redeal(d){if(!validD(d)||d.win!=null)return d;let nd={...d,hd:d.hd.map(()=>[]),deck:[],di:0,ph:'play',pp:d.pl.map(()=>''),tb:-1};nd=X.deal(nd);if(nd.ph==='pass')nd={...nd,ph:'play'};
    return {...nd,turn:d.out[d.turn]==='1'?nextSeat(nd,d.turn):d.turn,last:'وزّعنا ورق جديد 🃏'};}};

/* ================= the rules text, for the level in play ================= */
const HELPC='كل لاعب عنده ٤ حبات زجاج في مربع بيته، و١٩ خانة على لوح الخشب، والهدف تدخّل حباتك الأربع الحارة (٤ خانات من زاويتك للنص). الورق يحرك الحبات: ٤ ثم ٤ ثم ٥ ورقات من شدّة وحدة (٦ لاعبين: شدّتين ناقص ٨ و٥-٥-٦، و٨ لاعبين: شدّتين). الإكة والشايب يطلّعون حبة على البيس ✹. الإكة ١ أو ١١، والشايب ١٣، والبنت ١٢. الولد يبدّل حبتك بأي حبة على الطريق، مو على بيسها. العشرة ١٠، أو تحرق على اللي بعدك: يرمي ورقة ويروح دوره. السبعة تقسمها على حبتين. الخمسة تمشّي أي حبة على الطريق ٥ حتى حبة خصمك. الأربعة ٤ لورا، ومن البيس تختصر عليك اللفة. توقف على حبة أحد ترجع بيتها، حتى حبة شريكك. حبتك على بيسها محمية وتسد على الكل. ما تنقز على حبّك، وحبتين ورا بعض سد. تدخل الحارة بالعدد بالضبط. لازم تلعب إذا تقدر، وإلا تحرق ورقة. مع ٤ أو ٦ أو ٨ تلعبون فرق كل اثنين متقابلين، وإذا وصلت حباتك تكمل بحبات شريكك. مع ٢ أو ٣ أو ٥ أو ٧ كل واحد لحاله. اختار الورقة، بعدها الحبة، وشوف وين تنزل، بعدين «حرّك»، وتقدر ترجع بـ ↶ قبل ما تأكد.';
const HELPM='مخمخة: كل قوانين الكلاسيكي، وفوقها: الشايب يدعس كل حبة في طريقه الـ١٣ ويرجّعها بيتها حتى حبّك، وما يتعدى حبة على بيسها. البنت الحمرا تحرق ورقة عشوائية من اللي بعدك ويروح دوره، والسودا ١٢. الولد الأحمر يمشي ١١، والأسود يبدّل. أول كل توزيعة كل واحد يعطي شريكه ورقة مقلوبة. وفيه جوكرين بكل شدّة، كل واحد يلعب كأنه أي ورقة تبيها.';
const HELPH='الحريف: كل قوانين المخمخة، وفوقها مفاجآت من عندنا تنكشف للكل: ٣ خانات بكل ضلع معلّمة: 🌀 دفعة +٣، 🪤 فخ يرجّعك ٤، 🛡 درع يحميك لين دورك الجاي، تشتغل إذا وقفت عليها بالضبط. كل لاعب ياخذ كرت حريف مخفي يلعبه مرة باللعبة: «دفعة +٢» أو «عكس» مع ورقة، أو «ترس» يحمي حبة. أول كل توزيعة تنقلب ورقة حظ للجولة كلها، مثل «السبعة تدعس». وإذا قتلت خصم تلعب ورقة زيادة، مرة وحدة بالدور.';
try{Object.defineProperty(HELP,'jakaro',{configurable:true,enumerable:true,get(){const d=S&&S.st&&S.st.g==='jakaro'?S.st.d:null;const lv=d&&d.lv||levelPref();return HELPC+(lv==='m'?' '+HELPM:lv==='h'?' '+HELPM+' '+HELPH:'')+(lv==='c'?' (المستوى: كلاسيكي. فيه بعد «مخمخة» و«الحريف» تختارونها قبل أول ورقة)':'');}});}catch(e){HELP.jakaro=HELPC;}
window.JKUI={evalD,botPlay,bot,face,cardG,kindOf,powerWords};
})();

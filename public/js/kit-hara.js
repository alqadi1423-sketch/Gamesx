'use strict';
/* =====================================================================================================
   KH: «عدّة الحارة», the shared kit for the real-life street games (غميضة الحارة first, more to come).
   Everything lives under one global, KH. Nothing here touches game state; games call it while rendering.

   Art (strings of SVG, drawn on a night neighbourhood, top-down with 3/4 Najdi facades):
     KH.art.roof(x,y,w,h,o)      a flat roof with stepped parapet; o.face = height of the south facade under it,
                                 o.wins=[dx..], o.doors=[[dx,colour]..], o.par/o.roof/o.notch colours
     KH.art.court(x,y,w,h)       an open courtyard (حوش) inside a roof
     KH.art.door(x,y,w,col)      a door seen from above on a wall edge
     KH.art.car(x,y,col,s) KH.art.trailer(x,y) KH.art.barrel(x,y,c) KH.art.crate(x,y,s,r)
     KH.art.palm(x,y,s,r) KH.art.tree(x,y,r,c) KH.art.lamp(x,y) KH.art.pool(x,y,r) KH.art.tank(x,y)
     KH.art.shed(x,y,w,h) KH.art.tent(x,y,w,h) KH.art.field(x,y,w,h) KH.art.shop(x,y,w,h,o) KH.art.ruin(x,y,w,h)
     KH.art.defs()               the gradients/symbols the art needs (put once at the top of an art SVG)
     KH.bg(id,w,h,inner)         turns a finished art SVG into a CSS background (class "kh-bg-<id>"), made once a page:
                                 the static map costs no DOM nodes and is never diffed by the engine's morph
   The cast (app-wide characters, one kid per player colour, core.js COLS order):
     KH.CAST[i]                  {n name, g 'b'|'g', c colour, skin, m default mouth, t personality}: 0 حمود (cap), 1 سعود (ghutra),
                                 2 نورة (hijab), 3 سارة (glasses, braid), 4 ريم (pigtails), 5 بدر (taqiyah), 6 لولوة (hijab, flower), 7 ناصر (shemagh)
     KH.kid({who|seat|c,pose,mood,outfit,acc,hat,s,flip,x,y})  one kid, a <g> of 3–7 <use>s (~300 bytes) for inside an <svg>:
                                 pose stand | walk | peek | cheer | caught | sad | think | count | torch | wave;
                                 mood s | g | o | sad | k | hm; outfit apron | sport | dealer | thobe | host | coat | gi | lab | smock | sailor;
                                 acc (held) mic | pawn | crownp | dice | rod | pencil | brush | book | lens | sword | watch | gavel | flag |
                                 balloon | bow | dart | cue | club | bball | bowl | oar | tile | piece | trophy | letter | coin | dallah | spoon |
                                 buzzer | cards, (on the body) glove | ball; hat chefhat | crown | fedora | bulb | helmet
     KH.face({who,size,ring,mood,hat}) a standalone round avatar <svg> (player strip, lobby, results)
     KH.fig(inner,{vb,cls,w,h})  kids as a standalone <svg> for HTML (the default box holds one standing kid with a hat)
     KH.faceImg(o) KH.kidImg(o,{vb,cls,style})  the same face / kid as one element (<kh-p class="khi">) showing a picture made once
                                 per look and kept as a CSS rule: what the app's shell uses, no SVG nodes in the page
     KH.sprite(pose,x,y,o)       the same kids by pose, plus the other figures: sil | mom | cat | dog | grocer
     Templates go into one hidden <svg><defs> on the page, each the first time it is used (KH.need); a game dresses the cast
     with OUTFIT/ACC entries (js/cast-themes.js picks them per game) or adds its own with KH.extend({outfit,acc}) (namespaced keys)
   The cast in the shell (core.js): KH.kidOf(role) the player's kid (picked avatar, else their colour's kid), KH.pface(role,o),
     KH.pkid(role,o,{vb,cls}) (pictures, in the player's colour), KH.lkSet(seat,kid) (one phone), KH.homeScene()
   Effects:
     KH.beam(x,y,ang,len)        the seeker's torch light
     KH.say(x,y,text,o)          a speech bubble (SVG), tail at x,y; o.fill/o.col/o.fs/o.dx
     KH.burst(x,y,text,o)        a star burst («لقيتك!»)
   Paths:
     KH.graph({pos,edges})       pos=[[x,y]..]; edges=[[a,b,[[x,y]..waypoints]]..] -> {pos,adj,D,path(a,b),pts(a,b),edge(a,b)}
                                 D[a][b] = number of footpath steps between nodes (BFS)
     KH.walk(el,pts,o)           moves an element along points with transform only (150–250 ms a segment, ≤1.2 s);
                                 o.step() is called at every node (for footsteps); ≤450 ms in lite mode, none with reduced motion
   UI:
     KH.banner(text,o) KH.card(icon,title,text,o)   HTML pieces (styles in css/kit-hara.css)
   Sound (Web Audio, tiny synths, silent when muted):
     KH.snd(kind)  kind: step | heart | found | safe | meow | bark | count | call | whoosh | tick
   Misc: KH.lite() (lite mode or reduced motion), KH.f (round to 0.1), KH.T (translate group), KH.OL (outline colour)
   ===================================================================================================== */
const KH=(()=>{
  const OL='#17233A';
  const f=n=>Math.round(n*10)/10;
  const T=(x,y,c,s=1,r=0)=>`<g transform="translate(${f(x)} ${f(y)})${r?` rotate(${f(r)})`:''}${s!==1?` scale(${s})`:''}">${c}</g>`;
  const st=(w=1.6)=>` stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const lite=()=>{try{return (typeof liteOn==='function'&&liteOn())||matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};

  /* ---------------- art ---------------- */
  const C={ground:'#2B3852',yard:'#334260',walk:'#45567A',asph:'#1B2537',par:'#D6B588',roof:'#AC8A61',notch:'#EED7AE',court:'#7B6247',face:'#A9835B',faceD:'#8E6B48',green:'#2C7151',green2:'#3B9467'};
  const shadow=(x,y,w,h,r=4,d=6)=>`<rect x="${x+d}" y="${y+d}" width="${w}" height="${h}" rx="${r}" fill="#060B16" opacity=".5"/>`;
  function facade(x,y,w,h,o={}){let tri='';for(let i=x+8;i<x+w-8;i+=9)tri+=`M${i} ${y+7}l3-4 3 4z`;
    let s=`<rect x="${x}" y="${y-2}" width="${w}" height="${h+2}" rx="3" fill="${o.fc||C.face}"${st(1.8)}/><path d="${tri}" fill="#4A3424" opacity=".7"/><path d="M${x+1} ${y+h-3}h${w-2}" stroke="${C.faceD}" stroke-width="4"/>`;
    for(const wx of o.wins||[])s+=`<rect x="${x+wx-4}" y="${y+6}" width="8" height="${h-10}" rx="1.5" fill="${o.dark?'#22304A':'#FFD27A'}"${st(1.2)}/>`;
    for(const [dx,col] of o.doors||[])s+=`<rect x="${x+dx-7}" y="${y+3}" width="14" height="${h-2}" rx="2" fill="${col||'#7A4A2A'}"${st(1.4)}/><path d="M${x+dx} ${y+4}v${h-4}" stroke="#000" stroke-opacity=".25"/><circle cx="${x+dx-3}" cy="${y+h/2+2}" r="1.1" fill="#F0B429"/><circle cx="${x+dx+3}" cy="${y+h/2+2}" r="1.1" fill="#F0B429"/>`;
    return s;}
  function roof(x,y,w,h,o={}){const par=o.par||C.par,rf=o.roof||C.roof,fh=o.face||0;
    let s=shadow(x,y,w,h+fh,4,o.d||7)+`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${par}"${st(1.8)}/>`+
      `<rect x="${x+6}" y="${y+6}" width="${w-12}" height="${h-12}" rx="2" fill="${rf}"/>`+
      `<rect x="${x+3}" y="${y+3}" width="${w-6}" height="${h-6}" rx="2" fill="none" stroke="${o.notch||C.notch}" stroke-width="2.6" stroke-dasharray="5 3.5"/>`;
    if(fh)s+=facade(x,y+h,w,fh,o);return s;}
  const court=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${C.court}"${st(1.6)}/><path d="M${x+2} ${y+h-1}V${y+2}H${x+w-1}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="7"/><path d="M${x} ${y+h/2}h${w}M${x+w/2} ${y}v${h}" stroke="#000" stroke-opacity=".12"/>`;
  const door=(x,y,w=16,col='#2E8B6A')=>`<rect x="${x-w/2-3}" y="${y-4}" width="${w+6}" height="8" rx="2" fill="#E8D2AA"${st(1.2)}/><rect x="${x-w/2}" y="${y-2.5}" width="${w}" height="5" rx="1.5" fill="${col}"${st(1.1)}/>`;
  const FR=[0,51,103,154,206,257,309];
  const palmSym=`<symbol id="p" viewBox="-24 -24 48 48" overflow="visible"><g fill="${C.green2}"${st(1.4)}>${FR.map(a=>`<path transform="rotate(${a})" d="M0 0q8-6 22-3q-10 1-14 6q-4 2-8-3z"/>`).join('')}</g><g fill="none" stroke="#1F5A3E">${FR.map(a=>`<path transform="rotate(${a})" d="M2 0q9-3 18-2"/>`).join('')}</g><circle r="3.5" fill="#8A5A2B"${st(1.3)}/></symbol>`;
  const palm=(x,y,s=1,r=0)=>`<ellipse cx="${f(x+8*s)}" cy="${f(y+9*s)}" rx="${f(18*s)}" ry="${f(14*s)}" fill="#060B16" opacity=".4"/><use href="#p" x="${f(x-24*s)}" y="${f(y-24*s)}" width="${f(48*s)}" height="${f(48*s)}"${r?` transform="rotate(${r} ${x} ${y})"`:''}/>`;
  const tree=(x,y,r=16,c=C.green2)=>`<circle cx="${x+5}" cy="${y+6}" r="${r}" fill="#060B16" opacity=".45"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"${st(1.6)}/><circle cx="${f(x-r*.3)}" cy="${f(y-r*.3)}" r="${f(r*.45)}" fill="#fff" opacity=".13"/>`;
  const car=(x,y,col,s=1)=>T(x,y,`<rect x="-29" y="-11" width="62" height="28" rx="10" fill="#060B16" opacity=".45"/><rect x="-32" y="-15" width="64" height="30" rx="11" fill="${col}"${st(1.8)}/>`+
    `<path d="M8 -12l8 3v18l-8 3z" fill="#2B3F5E"${st(1.3)}/><path d="M-17 -11l-6 3v16l6 3z" fill="#2B3F5E"${st(1.3)}/><rect x="-15" y="-11" width="22" height="22" rx="4" fill="#fff" opacity=".25"/>`+
    `<circle cx="29" cy="-9" r="2.4" fill="#FFE9A8"/><circle cx="29" cy="9" r="2.4" fill="#FFE9A8"/><rect x="-33" y="-11" width="3" height="5" rx="1" fill="#EC6158"/><rect x="-33" y="6" width="3" height="5" rx="1" fill="#EC6158"/>`,s);
  function trailer(x,y,s=1){let ribs='';for(let i=-52;i<36;i+=8)ribs+=`M${i} -14v28`;
    return T(x,y,`<rect x="-56" y="-12" width="128" height="32" rx="4" fill="#060B16" opacity=".5"/><rect x="-60" y="-16" width="100" height="32" rx="3" fill="#E58A3A"${st(1.8)}/><path d="${ribs}" stroke="#A85E22" stroke-width="2"/>`+
      `<rect x="42" y="-14" width="26" height="28" rx="6" fill="#F4F6FA"${st(1.8)}/><path d="M60 -11v22" stroke="#2B3F5E" stroke-width="5" stroke-linecap="round"/><rect x="40" y="-6" width="4" height="12" fill="#5D6E86"/>`,s);}
  const barrel=(x,y,c='#3B7FC4')=>`<circle cx="${x+4}" cy="${y+5}" r="10" fill="#060B16" opacity=".5"/><circle cx="${x}" cy="${y}" r="10" fill="${c}"${st(1.6)}/><circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/><circle cx="${x+3}" cy="${y-3}" r="1.8" fill="${OL}"/>`;
  const crate=(x,y,s=18,r=0)=>T(x,y,`<rect x="${-s/2+4}" y="${-s/2+5}" width="${s}" height="${s}" fill="#060B16" opacity=".5"/><rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" rx="2" fill="#C98F58"${st(1.5)}/><path d="M${-s/2+2} ${-s/2+2}L${s/2-2} ${s/2-2}M${-s/2+2} ${s/2-2}L${s/2-2} ${-s/2+2}" stroke="#8A5A2B" stroke-width="2"/>`,1,r);
  const lamp=(x,y)=>`<circle cx="${x}" cy="${y}" r="6.5" fill="#FFE7A0"${st(1.6)}/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>`;
  const pool=(x,y,r=70)=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r*.85)}" fill="url(#g)"/>`;
  const tank=(x,y)=>`<ellipse cx="${x+8}" cy="${y+14}" rx="22" ry="17" fill="#060B16" opacity=".5"/><path d="M${x-14} ${y+4}l-6 12M${x+22} ${y+4}l6 12M${x-10} ${y+10}h30" stroke="${OL}" stroke-width="1.8"/><circle cx="${x}" cy="${y}" r="21" fill="#9FB3C8"${st(1.8)}/><circle cx="${x}" cy="${y}" r="15" fill="#B9CBDD" stroke="#7F93A8" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="4.5" fill="#5D6E86"${st(1.2)}/>`;
  function shed(x,y,w,h){let c='';for(let i=x+4;i<x+w-2;i+=6)c+=`M${i} ${y+4}v${h-8}`;
    return shadow(x,y,w,h+18)+`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#8297AE"${st(1.8)}/><path d="${c}" stroke="#5F7590" stroke-width="2"/>`+facade(x,y+h,w,18,{fc:'#7F93A8'})+`<rect x="${x+12}" y="${y+h+2}" width="${w-24}" height="14" rx="2" fill="#5D6E86"${st(1.3)}/><path d="M${x+14} ${y+h+7}h${w-28}M${x+14} ${y+h+11}h${w-28}" stroke="#45566E"/>`;}
  function tent(x,y,w,h){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#3C4A61"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${C.par}" stroke-width="6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none"${st(1.4)}/>`+
    `<path d="M${x+12} ${y+12}h${w*.55}v${h*.36}h-${w*.55}z" fill="#2A2733"${st(1.6)}/><path d="M${x+12} ${y+12+h*.18}h${w*.55}M${x+12+w*.18} ${y+12}v${h*.36}M${x+12+w*.36} ${y+12}v${h*.36}" stroke="#4A4458" stroke-width="2"/>`+
    `<circle cx="${x+w-22}" cy="${y+h-22}" r="8" fill="#5D6E86"${st(1.4)}/><path d="M${x+w-26} ${y+h-21}l4-8 4 8q-4 3-8 0z" fill="#F28C38"/>`+pool(x+w-22,y+h-22,28)+
    `<path d="M${x+4} ${y+4}H${x+w-4}" stroke="#FFD27A" stroke-width="3" stroke-linecap="round" stroke-dasharray="0 9"/>`;}
  function field(x,y,w,h){let r='';for(let i=y+12;i<y+h-6;i+=13)r+=`M${x+10} ${i}h${w-20}`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.green}"/><path d="${r}" stroke="#4AA373" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="#C98F58" stroke-width="2.4" stroke-dasharray="7 4"/>`;}
  function shop(x,y,w,h,o={}){return roof(x,y,w,h,{roof:'#9C7D59',face:o.face||24})+`<rect x="${x+12}" y="${y+14}" width="${w*.28}" height="18" rx="2" fill="#7F93A8"${st(1.2)}/><rect x="${x+w*.55}" y="${y+16}" width="${w*.3}" height="14" rx="2" fill="#7F93A8"${st(1.2)}/>`+
    `<rect x="${x+4}" y="${y+h+3}" width="${w-8}" height="${(o.face||24)-8}" rx="2" fill="#FFD27A"${st(1.4)}/><rect x="${x+w/2-8}" y="${y+h+3}" width="16" height="${(o.face||24)-6}" rx="1" fill="#6B4A2E"${st(1)}/>`+
    (o.awning?`<path d="M${x} ${y+h+(o.face||24)+4}h${w}" stroke="#F4F6FA" stroke-width="10"/><path d="M${x} ${y+h+(o.face||24)+4}h${w}" stroke="#EC6158" stroke-width="10" stroke-dasharray="8 8"/><path d="M${x} ${y+h+(o.face||24)+9.5}h${w}M${x} ${y+h+(o.face||24)-1}h${w}" stroke="${OL}" stroke-width="1.4"/>`:'');}
  function ruin(x,y,w,h){return roof(x,y,w,h,{par:'#9E8A72',roof:'#6F6152',notch:'#B9A68C'})+`<path d="M${x+14} ${y+22}l14 6 8-10 12 14 10-6" fill="none" stroke="${OL}" stroke-width="1.6"/><path d="M${x+w-36} ${y+h-34}q10-8 18 2q4 10-8 12q-12 0-10-14z" fill="#141B29"${st(1.2)}/>`+
    `<path d="M${x} ${y+h/2}h8M${x+w-4} ${y+10}v14M${x+w/2-8} ${y}h16" stroke="${C.yard}" stroke-width="7"/><rect x="${x+20}" y="${y+h-14}" width="16" height="4" fill="#8A5A2B" transform="rotate(20 ${x+28} ${y+h-12})"/>`;}
  const defs=()=>`<defs><radialGradient id="g"><stop offset="0" stop-color="#FFD873" stop-opacity=".5"/><stop offset=".55" stop-color="#FFC24A" stop-opacity=".15"/><stop offset="1" stop-color="#FFC24A" stop-opacity="0"/></radialGradient><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#050A14" stop-opacity="0"/><stop offset="1" stop-color="#050A14" stop-opacity=".55"/></radialGradient>${palmSym}</defs>`;
  const BG={};
  function bg(id,w,h,inner){if(BG[id])return 'kh-bg-'+id;BG[id]=1;try{const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
    const el=document.createElement('style');el.id='kh-bg-'+id;el.textContent=`.kh-bg-${id}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g,'%27').replace(/\(/g,'%28').replace(/\)/g,'%29')}")}`;document.head.appendChild(el);}catch(e){}return 'kh-bg-'+id;}

  /* ---------------- the cast: 8 kids, one per player colour (core.js COLS), drawn once as templates ----------------
     A kid is a few <use>s: a body pose (shirt in --kc, skin in --ks), an outfit layer, the kid's own head, a mouth for the
     mood, an accessory. Heads carry each kid's look: hair, headwear, eyes, personality */
  const sk='var(--ks,#F2C29B)',kc='var(--kc,#EC6158)',s2=w=>` stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const CAST=[
    {n:'حمود',g:'b',c:'#EC6158',skin:'#F2C29B',m:'k',t:'شقي وسريع'},
    {n:'سعود',g:'b',c:'#4AB1E8',skin:'#E0A577',m:'s',t:'هادي ويفكر'},
    {n:'نورة',g:'g',c:'#4CB97F',skin:'#F5CBA7',m:'s',t:'ذكية وتلاحظ كل شي'},
    {n:'سارة',g:'g',c:'#EDB02F',skin:'#C98A5E',m:'g',t:'تحب الألغاز'},
    {n:'ريم',g:'g',c:'#9C7BD6',skin:'#F2C29B',m:'g',t:'نشيطة وما تهدى'},
    {n:'بدر',g:'b',c:'#F2874B',skin:'#D99A6C',m:'g',t:'ضحوك'},
    {n:'لولوة',g:'g',c:'#E57AAE',skin:'#E8B48C',m:'s',t:'لطيفة وشجاعة'},
    {n:'ناصر',g:'b',c:'#2FB3AA',skin:'#B07750',m:'k',t:'واثق وهادي'}];
  const face=(r=11,cy=0)=>`<circle cy="${cy}" r="${r}" fill="${sk}"${s2(1.6)}/>`;
  const ears=`<circle cx="-11" cy="1.5" r="3" fill="${sk}"${s2(1.3)}/><circle cx="11" cy="1.5" r="3" fill="${sk}"${s2(1.3)}/>`;
  const eyes=(o={})=>{const y=o.y||.8,px=o.px||0;let e=`<ellipse cx="-4.2" cy="${y}" rx="3" ry="3.5" fill="#fff"/><ellipse cx="4.2" cy="${y}" rx="3" ry="3.5" fill="#fff"/><circle cx="${f(-4+px)}" cy="${y+.6}" r="1.8" fill="${OL}"/><circle cx="${f(4.4+px)}" cy="${y+.6}" r="1.8" fill="${OL}"/><circle cx="${f(-3.4+px)}" cy="${y-.3}" r=".6" fill="#fff"/><circle cx="${f(5+px)}" cy="${y-.3}" r=".6" fill="#fff"/>`;
    if(o.lash)e+=`<path d="M-7 ${y-2.6}l-1.6-1.2M7 ${y-2.6}l1.6-1.2" stroke="${OL}" stroke-width="1.2" stroke-linecap="round"/>`;
    if(o.brow)e+=`<path d="${o.brow}" fill="none" stroke="${o.bc||'#3A2A22'}" stroke-width="1.5" stroke-linecap="round"/>`;
    if(o.smile)e=`<path d="M-7 ${y+.5}q2.8-3 5.6 0M1.4 ${y+.5}q2.8-3 5.6 0" fill="none"${s2(1.6)}/>`;
    return e;};
  const blush=(o=.35)=>`<circle cx="-7.4" cy="4.4" r="2" fill="#EC6158" opacity="${o}"/><circle cx="7.4" cy="4.4" r="2" fill="#EC6158" opacity="${o}"/>`;
  const HEADS=[
    // حمود: red cap, brim forward, hair tufts, cheeky raised brow
    ears+face()+`<path d="M-11 -2q-2 4 1 6M11 -2q2 4-1 6" fill="none" stroke="#3A2A22" stroke-width="2.4" stroke-linecap="round"/><path d="M-11.8 -1.2A11.8 11.8 0 0 1 11.8 -1.2Z" fill="${kc}"${s2(1.6)}/><path d="M3 -3.6h12a2.6 2.6 0 0 1 0 5.2H3z" fill="${kc}"${s2(1.6)}/><circle cy="-12" r="2" fill="${kc}"${s2(1.3)}/>`+eyes({brow:'M-7 -3.6l4.6-.6M2 -4.4l5-1.6'})+blush(),
    // سعود: white ghutra over the head and shoulders, calm half-closed eyes
    `<path d="M-14.5 16V0a14.5 14.5 0 0 1 29 0v16h-5.5V6h-18v10z" fill="#FAFBFD"${s2(1.6)}/>`+face(10,1.5)+`<path d="M-11 -3.5q11-10 22 0v-3q-11-10-22 0z" fill="#FAFBFD"${s2(1.4)}/><path d="M-11 -5q11-9 22 0" fill="none" stroke="#C8D3E0" stroke-width="1"/>`+eyes({y:1.6,brow:'M-6.6 -1.4h4M2.6 -1.4h4'})+blush(.3),
    // نورة: green hijab framing a round face, lashes
    `<path d="M-14 16V0a14 14 0 0 1 28 0v16z" fill="${kc}"${s2(1.6)}/><ellipse cy="1.8" rx="9" ry="10" fill="${sk}"${s2(1.4)}/><path d="M-9 -4q9-7 18 0" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/>`+eyes({y:1.8,lash:1})+blush(.4),
    // سارة: dark hair with a side braid, round glasses, a yellow hair tie
    `<path d="M9 2q8 5 5 16" fill="none" stroke="#3A2A22" stroke-width="4.4" stroke-linecap="round"/><circle cx="13.6" cy="15" r="2.2" fill="${kc}"${s2(1.1)}/>`+ears+face()+`<path d="M-11.6 1q-1-12 11.6-12.6Q11.6-11.6 11.6 1q-6-7-13-5.6Q-6 -6-11.6 1z" fill="#3A2A22"${s2(1.4)}/>`+eyes({y:1.6})+`<circle cx="-4.2" cy="1.8" r="4.2" fill="none"${s2(1.4)}/><circle cx="4.2" cy="1.8" r="4.2" fill="none"${s2(1.4)}/><path d="M-.6 1.6h1.2" stroke="${OL}" stroke-width="1.4"/>`+blush(.3),
    // ريم: two pigtails with purple bows, freckles
    `<path d="M-11 -2q-9 2-8 12M11 -2q9 2 8 12" fill="none" stroke="#5A3A22" stroke-width="5" stroke-linecap="round"/><path d="M-15 -4l-4-3v6zM-15 -4l4-3v6zM15 -4l4-3v6zM15 -4l-4-3v6z" fill="${kc}"${s2(1.2)}/>`+face()+`<path d="M-11.4 0q0-12 11.4-12T11.4 0q-4-6-11.4-6T-11.4 0z" fill="#5A3A22"${s2(1.4)}/>`+eyes({y:1.6,lash:1})+`<g fill="#B5654A" opacity=".55"><circle cx="-7" cy="5" r=".8"/><circle cx="-5.4" cy="6.2" r=".8"/><circle cx="7" cy="5" r=".8"/><circle cx="5.4" cy="6.2" r=".8"/></g>`,
    // بدر: white knitted taqiyah, chubby laughing face
    ears+face(11.6)+`<path d="M-10.6 -3q0-9.6 10.6-9.6T10.6 -3z" fill="#FAFBFD"${s2(1.5)}/><path d="M-9 -5.5h18M-7.5 -8.5h15" stroke="#C8D3E0" stroke-width="1.2" stroke-dasharray="1.6 1.6"/>`+eyes({smile:1,y:1.2})+blush(.5),
    // لولوة: pink hijab with a little white flower
    `<path d="M-14 16V0a14 14 0 0 1 28 0v16z" fill="${kc}"${s2(1.6)}/><ellipse cy="1.8" rx="9" ry="10" fill="${sk}"${s2(1.4)}/><g transform="translate(10 -8)"><circle r="3.4" fill="#fff"${s2(1)}/><circle r="1.3" fill="#F0B429"/></g>`+eyes({y:1.8,lash:1,px:-.6})+blush(.45),
    // ناصر: red-and-white shemagh, steady brows
    `<path d="M-14.5 16V0a14.5 14.5 0 0 1 29 0v16h-5.5V6h-18v10z" fill="#FAFBFD"${s2(1.6)}/><path d="M-13 14V0M-9 14V-6M13 14V0M9 14V-6M-13.5 -1h27M-13 6h4M9 6h4M-13 11h4M9 11h4" stroke="#D9443F" stroke-width="1.3" stroke-dasharray="1.4 1.8"/>`+face(10,1.5)+`<path d="M-11 -3.5q11-10 22 0v-3q-11-10-22 0z" fill="#FAFBFD"${s2(1.4)}/><path d="M-10 -4.5q10-8 20 0" fill="none" stroke="#D9443F" stroke-width="1.4" stroke-dasharray="1.4 1.6"/>`+eyes({y:1.8,brow:'M-7 -1.4l4.4.8M2.6 -.6l4.4-.8'})];
  const MOUTH={s:`<path d="M-2.6 5.6q2.6 2 5.2 0" fill="none"${s2(1.4)}/>`,g:`<path d="M-4 4.6q4 5.2 8 0z" fill="${OL}"/><path d="M-2.4 7q2.4 1.2 4.8 0" fill="none" stroke="#EC6158" stroke-width="1.2"/>`,
    o:`<ellipse cy="6.4" rx="2.2" ry="2.6" fill="${OL}"/>`,sad:`<path d="M-2.8 7q2.8-2.2 5.6 0" fill="none"${s2(1.4)}/>`,k:`<path d="M-2.4 6q3 1.6 5.6-1" fill="none"${s2(1.4)}/>`,hm:`<path d="M-2.2 6.2h4.4" fill="none"${s2(1.4)}/>`};
  const legsWalk=`<path d="M-3 -16l-5 13M3 -16l5 13" stroke="${sk}" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="-9" cy="-2" rx="4.6" ry="2.8" fill="#fff"${s2(1.3)}/><ellipse cx="9.5" cy="-2" rx="4.6" ry="2.8" fill="#fff"${s2(1.3)}/>`;
  const legsStand=`<path d="M-4 -16v13M4 -16v13" stroke="${sk}" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="-5" cy="-2" rx="4.6" ry="2.8" fill="#fff"${s2(1.3)}/><ellipse cx="5" cy="-2" rx="4.6" ry="2.8" fill="#fff"${s2(1.3)}/>`;
  const torso=`<path d="M-9 -24h18l1 9h-8l-2-3-2 3h-8z" fill="#2D4763"${s2(1.4)}/><path d="M-10 -22q-1-14 10-14t10 14z" fill="${kc}"${s2(1.6)}/><path d="M-4 -35.5l4 4 4-4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>`;
  const hand=(x,y)=>`<circle cx="${x}" cy="${y}" r="3.3" fill="${sk}"${s2(1.3)}/>`;
  const arm=d=>`<path d="${d}" fill="none" stroke="${kc}" stroke-width="5" stroke-linecap="round"/>`;
  const shadowK=`<ellipse rx="14" ry="3.5" fill="#000" opacity=".3"/>`;
  // bodies, without the head (the head sits at 0,-45)
  const BODY={
    stand:shadowK+legsStand+arm('M-8 -31l-4 11M8 -31l4 11')+hand(-12.5,-19)+hand(12.5,-19)+torso,
    walk:shadowK+legsWalk+arm('M-8 -31l-6 9M8 -31l6 9')+hand(-14,-21)+hand(14,-21)+torso,
    cheer:shadowK+legsStand+arm('M-8 -31l-7 -13M8 -31l7 -13')+hand(-15.5,-45)+hand(15.5,-45)+torso,
    caught:shadowK+legsStand+arm('M-8 -31q-9-6-6-17M8 -31q9-6 6-17')+hand(-12,-50)+hand(12,-50)+torso,
    sad:shadowK+legsStand+arm('M-8 -30l-2 12M8 -30l2 12')+hand(-10,-17)+hand(10,-17)+torso,
    think:shadowK+legsStand+arm('M-8 -31l-4 11')+hand(-12.5,-19)+torso+arm('M8 -31q6 4 0 -4')+hand(4,-37),
    count:shadowK+legsStand+torso,
    wave:shadowK+legsStand+arm('M-8 -31l-4 11')+hand(-12.5,-19)+torso+arm('M8 -31l8 -11')+hand(16.5,-43),
    torch:shadowK+legsWalk+arm('M-8 -31q-6 6-4 12')+arm('M7 -31l12 2')+`<g transform="translate(20 -29)"><rect x="-1" y="-3" width="12" height="6" rx="2" fill="#5D6E86"${s2(1.3)}/><rect x="10" y="-4.5" width="4" height="9" rx="1.5" fill="#F0B429"${s2(1.3)}/></g>`+hand(19,-29)+torso};
  const POSE_MOOD={cheer:'g',caught:'o',sad:'sad',think:'hm',count:'s',wave:'g'};
  const POSE_LOOK={torch:1,walk:1};
  // outfits (over the shirt) and accessories, so every game can dress the cast its own way (js/cast-themes.js picks them per game)
  const OUTFIT={
    apron:`<path d="M-7 -33h14v19h-14z" fill="#fff"${s2(1.3)}/><path d="M-3 -24h6v4h-6z" fill="none" stroke="#C8D3E0" stroke-width="1.2"/><path d="M-7 -30l-3-4M7 -30l3-4" stroke="#fff" stroke-width="1.6"/>`,
    sport:`<path d="M-10 -26h20" stroke="#fff" stroke-width="2.4"/><text y="-28" font-size="7" font-weight="800" fill="#fff" text-anchor="middle">10</text>`,
    dealer:`<path d="M-9 -22q0-10 4-13l5 8 5-8q4 3 4 13z" fill="#1F2A40"${s2(1.2)}/><path d="M-3.4 -33l3.4 2 3.4-2v4l-3.4-2-3.4 2z" fill="#B23A3A"${s2(1)}/>`,
    thobe:`<path d="M-10 -22q-1-14 10-14t10 14l1 19h-22z" fill="#FAFBFD"${s2(1.5)}/><path d="M0 -33v10" stroke="#C8D3E0" stroke-width="1.2"/>`,
    // a quiz host's jacket and bow tie
    host:`<path d="M-10 -22q-1-14 10-14t10 14z" fill="#2D3A5C"${s2(1.5)}/><path d="M-3.8 -35.6l3.8 10 3.8-10z" fill="#fff"/><path d="M-3.2 -33.2l3.2 1.8 3.2-1.8v3.6l-3.2-1.8-3.2 1.8z" fill="#EC6158"${s2(.9)}/>`,
    // a detective's trench coat (المافيا)
    coat:`<path d="M-10 -22q-1-14 10-14t10 14l1 12h-22z" fill="#C9A16E"${s2(1.4)}/><path d="M0 -35v24M-10.4 -20h20.8" stroke="#8A6A4A" stroke-width="1.5"/><path d="M-4 -35.4l4 5 4-5" fill="none" stroke="#8A6A4A" stroke-width="1.3"/>`,
    // a karate gi with a black belt (fights)
    gi:`<path d="M-10 -22q-1-14 10-14t10 14z" fill="#FAFBFD"${s2(1.5)}/><path d="M-5 -35.4l7 11M5 -35.4l-5.6 8.6" stroke="#C8D3E0" stroke-width="1.4"/><path d="M-10.2 -22.4h20.4" stroke="#2A2F45" stroke-width="3"/><path d="M3 -22l2 5M3 -22l-1 5" stroke="#2A2F45" stroke-width="1.6" stroke-linecap="round"/>`,
    // an open lab coat (science)
    lab:`<path d="M-10 -22q-1-14 10-14t10 14l1 9h-22z" fill="#FAFBFD"${s2(1.4)}/><path d="M-3.6 -35.5l3.6 8 3.6-8v22h-7.2z" fill="${kc}"/><path d="M4.4 -30h3.4v4h-3.4z" fill="none" stroke="#9FB3C8" stroke-width="1"/><path d="M5.6 -31.6v3" stroke="#2F80ED" stroke-width="1.2"/>`,
    // a painter's smock with paint drops (drawing games)
    smock:`<path d="M-8 -34h16v20h-16z" fill="#F4F6FA"${s2(1.3)}/><circle cx="-4" cy="-27" r="1.7" fill="#EC6158"/><circle cx="3" cy="-23" r="1.7" fill="#4AB1E8"/><circle cx="-1.6" cy="-19" r="1.7" fill="#F0B429"/>`,
    // a sailor collar (ships)
    sailor:`<path d="M-8 -35.5l8 9 8-9q3 3 2 6l-10 8-10-8q-1-3 2-6z" fill="#2F80ED"${s2(1.2)}/><path d="M-6.4 -32.4l6.4 7 6.4-7" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M-2 -25l2 3 2-3z" fill="#EC6158"/>`};
  /* accessories. Where one sits (ACC_AT): h held in the right hand (drawn around the hand at 0,0, which is drawn over its handle;
     KH.kid moves it with the pose), H on the head (head coordinates, also on KH.face), b on the body */
  const hnd=`<circle r="3.3" fill="${sk}"${s2(1.3)}/>`;
  const HELD={
    mic:`<path d="M0 1l-3.4-10" stroke="#2A2F45" stroke-width="3.6" stroke-linecap="round"/><circle cx="-4.4" cy="-12.8" r="4.5" fill="#C9D3DE"${s2(1.3)}/><path d="M-7.6 -13.8l6.4 2M-6.6 -16.4l5 1.8" stroke="#8A99AA" stroke-width="1"/><path d="M-5.4 -7.8l3.6-1.2" stroke="#EC6158" stroke-width="2"/>`,
    pawn:`<path d="M-5 -3h10l-2-4h-1.6l-.4-4.2a3.4 3.4 0 1 0-2 0l-.4 4.2H-3z" fill="#FAFBFD"${s2(1.3)}/>`,
    crownp:`<path d="M-5 -3h10l-1.4-4.6h-7.2zM-4.6 -7.6l-.8-6 2.8 2.4L0 -15.4l2.6 4.2 2.8-2.4-.8 6z" fill="#F0B429"${s2(1.2)}/>`,
    dice:`<g transform="rotate(-12 0 -8)"><rect x="-5.5" y="-13.5" width="11" height="11" rx="2.6" fill="#fff"${s2(1.3)}/><circle cx="-2.5" cy="-10.5" r="1.25" fill="#EC6158"/><circle cy="-8" r="1.25" fill="#EC6158"/><circle cx="2.5" cy="-5.5" r="1.25" fill="#EC6158"/></g>`,
    rod:`<path d="M-1 2L14 -30" stroke="#8A5A2B" stroke-width="2.4" stroke-linecap="round"/><path d="M14 -30q5 12 3.4 25" fill="none" stroke="#5F7590" stroke-width=".9"/><path d="M13.6 -2.6q4-4 8 0q-4 4-8 0zM21.6 -2.6l3-3v6z" fill="#4AB1E8"${s2(1)}/>`,
    pencil:`<g transform="rotate(22)"><rect x="-2.2" y="-15" width="4.4" height="16" fill="#F0B429"${s2(1.1)}/><path d="M-2.2 -15l2.2-4.6 2.2 4.6z" fill="#F2C29B"${s2(1.1)}/><path d="M-.6 -18.2l.6-1.4.6 1.4z" fill="${OL}"/><rect x="-2.2" y="1" width="4.4" height="3" rx="1" fill="#EC6158"${s2(1.1)}/></g>`,
    brush:`<g transform="rotate(20)"><path d="M0 3V-12" stroke="#C98F58" stroke-width="2.8" stroke-linecap="round"/><path d="M-2 -12h4l-.4 2.6h-3.2z" fill="#9FB3C8"/><path d="M-2 -12q.4-6 2-8.4q1.6 2.4 2 8.4z" fill="#EC6158"${s2(1)}/></g>`,
    book:`<rect x="-7" y="-14" width="13" height="16" rx="1.6" fill="#2F80ED"${s2(1.3)}/><path d="M-4 -14v16" stroke="#fff" stroke-width="1.2" opacity=".6"/><path d="M-1 -9h5M-1 -6h5" stroke="#fff" stroke-width="1.1"/>`,
    lens:`<path d="M-1 1l5-8.6" stroke="#8A5A2B" stroke-width="3" stroke-linecap="round"/><circle cx="6.4" cy="-13" r="6" fill="#CDEAFA" fill-opacity=".75" stroke="#5D6E86" stroke-width="2"/><circle cx="6.4" cy="-13" r="7" fill="none"${s2(1)}/><path d="M3.4 -15.4q2-2.2 4.6-1.6" fill="none" stroke="#fff" stroke-width="1.3"/>`,
    sword:`<path d="M.4 -3L2.4 -27" stroke="${OL}" stroke-width="5.6" stroke-linecap="round"/><path d="M.4 -3L2.4 -27" stroke="#CFE8F7" stroke-width="3.4" stroke-linecap="round"/><path d="M-4.4 -3.6h9" stroke="${OL}" stroke-width="4.4" stroke-linecap="round"/><path d="M-4.4 -3.6h9" stroke="#F0B429" stroke-width="2.4" stroke-linecap="round"/>`,
    watch:`<circle cx="1" cy="-10.4" r="6.4" fill="#fff"${s2(1.4)}/><path d="M1 -10.4V-14.4M1 -10.4l2.8 1.6" stroke="${OL}" stroke-width="1.3" stroke-linecap="round"/><rect x="-.5" y="-19.6" width="3" height="2.8" rx=".8" fill="#EC6158"${s2(1)}/>`,
    gavel:`<path d="M-1 1l7-12" stroke="#8A5A2B" stroke-width="2.6" stroke-linecap="round"/><rect x="1" y="-19" width="12" height="6" rx="1.6" fill="#B07750"${s2(1.3)} transform="rotate(30 7 -16)"/>`,
    flag:`<path d="M0 3V-26" stroke="#5D6E86" stroke-width="1.8" stroke-linecap="round"/><path d="M0 -26h13l-3 5 3 5H0z" fill="#2E9E5B"${s2(1.2)}/><path d="M3 -21h6" stroke="#fff" stroke-width="1.2"/>`,
    balloon:`<path d="M0 0q-3-8 1.4-15.6" fill="none" stroke="#5F7590" stroke-width=".9"/><ellipse cx="2" cy="-24" rx="7" ry="8.4" fill="${kc}"${s2(1.4)}/><path d="M.4 -15.4l1.6-1.4 1.6 1.4z" fill="${kc}"${s2(1)}/><path d="M-1.6 -27q1-3 3.6-3.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>`,
    bow:`<path d="M3 -18q10 13 0 26" fill="none" stroke="#8A5A2B" stroke-width="2.6" stroke-linecap="round"/><path d="M3 -18V8" stroke="#C8D3E0" stroke-width=".9"/><path d="M-8 -5h16" stroke="#5D6E86" stroke-width="1.3"/><path d="M8 -5l-3-2v4z" fill="#5D6E86"/><path d="M-8 -5l-2-2.4M-8 -5l-2 2.4" stroke="#EC6158" stroke-width="1.4"/>`,
    dart:`<g transform="rotate(-30)"><path d="M0 -1V-14" stroke="#5D6E86" stroke-width="1.8"/><path d="M0 -14l-1.4-5h2.8z" fill="#5D6E86"/><path d="M0 1l-3.4 4h6.8z" fill="#EC6158"${s2(1)}/></g>`,
    cue:`<path d="M-5 9L15 -30" stroke="${OL}" stroke-width="3.8" stroke-linecap="round"/><path d="M-5 9L15 -30" stroke="#C98F58" stroke-width="2.2" stroke-linecap="round"/><path d="M13.4 -26.8L15 -30" stroke="#F4F6FA" stroke-width="2.2" stroke-linecap="round"/>`,
    club:`<path d="M-1 -2L4 15" stroke="#9FB3C8" stroke-width="2.2" stroke-linecap="round"/><path d="M2.6 14l7 1.6-1 3.2-7-1.4z" fill="#5D6E86"${s2(1)}/>`,
    bball:`<circle cx="3" cy="-9" r="7" fill="#F2874B"${s2(1.4)}/><path d="M-4 -9h14M3 -16v14M-1.6 -14.4q4.6 5.4 0 10.8M7.6 -14.4q-4.6 5.4 0 10.8" fill="none" stroke="${OL}" stroke-width=".9"/>`,
    bowl:`<circle cx="3" cy="-6" r="7" fill="#2F3D5C"${s2(1.4)}/><circle cx="1" cy="-9.4" r="1.1" fill="#9FB3C8"/><circle cx="4.2" cy="-10" r="1.1" fill="#9FB3C8"/><circle cx="2.8" cy="-7" r="1.1" fill="#9FB3C8"/>`,
    oar:`<path d="M-6 -22L6 10" stroke="#C98F58" stroke-width="2.4" stroke-linecap="round"/><path d="M4 6l5 12-3.6 1.4-4.4-12z" fill="#C98F58"${s2(1.2)}/>`,
    tile:`<g transform="rotate(-10)"><rect x="-5" y="-21" width="10" height="19" rx="2" fill="#FAFBFD"${s2(1.3)}/><path d="M-3.4 -11.5h6.8" stroke="${OL}" stroke-width="1"/><circle cy="-16.4" r="1.25" fill="${OL}"/><circle cx="-2" cy="-8.2" r="1.15" fill="${OL}"/><circle cx="2" cy="-5" r="1.15" fill="${OL}"/></g>`,
    piece:`<path d="M-6 -17h4a2.6 2.6 0 1 1 4 0h4v4.4a2.6 2.6 0 1 1 0 4V-4h-12z" fill="#F0B429"${s2(1.3)}/>`,
    trophy:`<path d="M-5 -21h10v4q0 6-5 6t-5-6z" fill="#F0B429"${s2(1.2)}/><path d="M-5 -19q-4 0-3 3t3 2M5 -19q4 0 3 3t-3 2" fill="none" stroke="#E5A81F" stroke-width="1.4"/><path d="M-1.4 -11h2.8v4h-2.8zM-4 -7h8v2.6h-8z" fill="#E5A81F"${s2(1)}/>`,
    letter:`<rect x="-6.4" y="-19" width="12.8" height="13.4" rx="2.6" fill="#FFF4D6"${s2(1.3)}/><text y="-9.6" font-size="10" font-weight="800" fill="${OL}" text-anchor="middle">ب</text>`,
    coin:`<path d="M-3 -17l-2.4-3h10.8l-2.4 3q7 4 6 10.4q-1 5-8 5t-8-5q-1-6.4 6-10.4z" fill="#E3B486"${s2(1.3)}/><circle cy="-8" r="3.6" fill="#F0B429"${s2(1)}/><path d="M-3 -17h6" stroke="#8A5A2B" stroke-width="1.4"/>`,
    dallah:`<path d="M2 -13q5-1 8-8" fill="none" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/><path d="M2 -13q5-1 8-8" fill="none" stroke="#F0B429" stroke-width="1.8" stroke-linecap="round"/><path d="M-5 -2q-2-9 3.4-12v-3h3.2v3q5.4 3 3.4 12z" fill="#F0B429"${s2(1.3)}/><path d="M-3.6 -8h7.2" stroke="#C98F0E" stroke-width="1.2"/><circle cy="-19" r="1.7" fill="#F0B429"${s2(1)}/>`,
    spoon:`<path d="M-1 2L4 -11" stroke="#C98F58" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="5.6" cy="-15.4" rx="3.2" ry="4.6" fill="#C98F58"${s2(1.2)} transform="rotate(20 5.6 -15.4)"/>`,
    buzzer:`<rect x="-6.4" y="-8" width="12.8" height="7" rx="2" fill="#2D4763"${s2(1.3)}/><path d="M-4.6 -8.4a4.6 3.4 0 0 1 9.2 0z" fill="#EC6158"${s2(1.2)}/>`};
  const HEAD={
    chefhat:`<path d="M-8 -9v-4q-5-1-4-6t6-3q2-5 6-5t6 5q5-2 6 3t-4 6v4z" fill="#fff"${s2(1.3)}/>`,
    crown:`<path d="M-8.6 -10l-1.6-9 5 4.4L0 -21.4l5.2 6.8 5-4.4-1.6 9z" fill="#F0B429"${s2(1.3)}/><circle cy="-13.4" r="1.5" fill="#EC6158"/><path d="M-8 -11.6h16" stroke="#C98F0E" stroke-width="1.2"/>`,
    fedora:`<path d="M-15 -7.6q15-4.4 30 0q-2 2.6-15 2.6t-15-2.6z" fill="#3A3446"${s2(1.2)}/><path d="M-9 -8.4q-1-9.6 9-10.2q10 .6 9 10.2q-9-2.4-18 0z" fill="#3A3446"${s2(1.3)}/><path d="M-9 -10.6q9-2.6 18 0" stroke="#B23A3A" stroke-width="2"/>`,
    bulb:`<g transform="translate(14 -19)"><path d="M-7 -5l-2-1.6M7 -5l2-1.6M0 -7.6v-2.6" stroke="#F0B429" stroke-width="1.4" stroke-linecap="round"/><circle r="4.8" fill="#FFE38A"${s2(1.2)}/><rect x="-2" y="4" width="4" height="3" rx=".8" fill="#9FB3C8"${s2(1)}/></g>`,
    helmet:`<path d="M-12.6 -1q0-13 12.6-13t12.6 13z" fill="${kc}"${s2(1.4)}/><path d="M-12.6 -1H6l8 2.4" fill="none"${s2(1.4)}/><path d="M0 -14v13" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`};
  const ACC={
    glove:`<path d="M10 -31l8 -6" stroke="#8A5A2B" stroke-width="6" stroke-linecap="round"/><path d="M15 -40q4-6 9-2l-2 6z" fill="#8A6A4A"${s2(1.2)}/><circle cx="21" cy="-40" r="1" fill="${OL}"/>`,
    ball:`<circle cx="14" cy="-6" r="6" fill="#fff"${s2(1.3)}/><path d="M11 -9l3 3 3-3M14 -6v5" fill="none" stroke="${OL}" stroke-width="1"/>`,
    cards:`<rect x="10" y="-26" width="8" height="11" rx="1.5" fill="#fff"${s2(1.2)} transform="rotate(12 14 -20)"/><rect x="13" y="-26" width="8" height="11" rx="1.5" fill="#fff"${s2(1.2)} transform="rotate(26 17 -20)"/><path d="M17 -21l1.2 2 2-.8z" fill="#EC6158"/>`};
  const ACC_AT={glove:'b',ball:'b',cards:'h'};
  for(const k in HELD){ACC[k]=`<g transform="translate(12.5 -19)">${HELD[k]}${hnd}</g>`;ACC_AT[k]='h';}
  for(const k in HEAD){ACC[k]=HEAD[k];ACC_AT[k]='H';}
  // the hand that holds an accessory in each pose (drawn for the standing right hand and moved by the difference; a thinker
  // has the right hand on the chin, so the thing goes to the left one)
  const HAND={stand:[12.5,-19],walk:[14,-21],cheer:[15.5,-45],caught:[12,-50],sad:[10,-17],think:[-12.5,-19],torch:[19,-29],wave:[16.5,-43],count:[12.5,-19]};
  const OTHERS={
    peekhands:hand(-11,6.5)+hand(11,6.5),
    eyeshands:`<rect x="-12" y="-49" width="11" height="7" rx="3.5" fill="${sk}"${s2(1.3)}/><rect x="1" y="-49" width="11" height="7" rx="3.5" fill="${sk}"${s2(1.3)}/>`,
    sil:`<path d="M-9.7 6.5A11 11 0 1 1 9.7 6.5Z" fill="#0B1222" stroke="#FFE38A" stroke-width="1.6"/><ellipse cx="-4" cy="1.5" rx="2.4" ry="2.8" fill="#FFE38A"/><ellipse cx="4" cy="1.5" rx="2.4" ry="2.8" fill="#FFE38A"/><circle cx="-11" cy="6.5" r="3.4" fill="#0B1222"/><circle cx="11" cy="6.5" r="3.4" fill="#0B1222"/>`,
    mom:`<ellipse rx="12" ry="3" fill="#000" opacity=".3"/><path d="M-10 0q-2-28 10-30q12 2 10 30z" fill="#2A2F45"${s2(1.6)}/><circle cy="-38" r="9.5" fill="#2A2F45"${s2(1.6)}/><ellipse cy="-37" rx="6" ry="6.8" fill="#E0A577"/><path d="M-3.4 -38.5q1.2-1.4 2.4 0M1 -38.5q1.2-1.4 2.4 0" fill="none"${s2(1.2)}/><ellipse cy="-33.8" rx="1.8" ry="1.6" fill="${OL}"/><path d="M6 -24q8-4 4-12" fill="none" stroke="#2A2F45" stroke-width="5" stroke-linecap="round"/><circle cx="8" cy="-36" r="2.8" fill="#E0A577"${s2(1.1)}/>`,
    cat:`<path d="M6 -2q12 0 10-14" fill="none" stroke="#3A3446" stroke-width="3.4" stroke-linecap="round"/><path d="M-8 0q-2-14 5-16h6q7 2 5 16z" fill="#3A3446"${s2(1.2)}/><path d="M-7 -14l-1-8 5 4h6l5-4-1 8q0 6-7 6t-7-6z" fill="#3A3446"${s2(1.2)}/><ellipse cx="-3" cy="-14" rx="1.6" ry="2" fill="#F7D046"/><ellipse cx="3" cy="-14" rx="1.6" ry="2" fill="#F7D046"/>`,
    dog:`<path d="M-14 -10q-6-6-4-12" fill="none" stroke="#B9814D" stroke-width="3.4" stroke-linecap="round"/><rect x="-16" y="-17" width="26" height="12" rx="6" fill="#C98F58"${s2(1.4)}/><path d="M-12 -6v6M-4 -6v6M2 -6v6M7 -6v6" stroke="#C98F58" stroke-width="3.4" stroke-linecap="round"/><circle cx="11" cy="-20" r="7.5" fill="#C98F58"${s2(1.4)}/><path d="M7 -26q-5 2-4 10" fill="#8A5A2B"${s2(1.2)}/><ellipse cx="17.5" cy="-18" rx="3.6" ry="2.6" fill="#E3B486"${s2(1.2)}/><circle cx="20" cy="-19" r="1.4" fill="${OL}"/><circle cx="12" cy="-22" r="1.3" fill="${OL}"/>`,
    grocer:`<path d="M-14 22q0-14 14-14t14 14z" fill="#F4F6FA"${s2(1.4)}/><path d="M-12 8q-2-20 12-20t12 20l-4 6v-14h-16v14z" fill="#fff"${s2(1.4)}/><path d="M-12 -4h24" stroke="#E2535A" stroke-width="1.5" stroke-dasharray="2 2"/><ellipse cy="2" rx="8" ry="9" fill="#C98A5E"/><path d="M-10 -8q10-6 20 0" stroke="#111" stroke-width="3" fill="none"/><circle cx="-3" cy="1" r="1.4" fill="${OL}"/><circle cx="3" cy="1" r="1.4" fill="${OL}"/><path d="M-5 5q5 6 10 0" fill="#3a2a22"/>`};
  /* every template, by id. The page gets one hidden <svg><defs>, and a template goes into it the first time something uses it
     (KH.need): the home screen pays for the five heads it shows, not for the whole wardrobe */
  const PART={};HEADS.forEach((h,i)=>PART['h'+i]=h);
  for(const [p,o] of [['m-',MOUTH],['b-',BODY],['o-',OUTFIT],['a-',ACC],['',OTHERS]])for(const k in o)PART[p+k]=o[k];
  let DEF=null;const HAVE=new Set();
  function ensureDefs(){if(typeof document==='undefined'||!document.body)return null;if(DEF&&DEF.isConnected)return DEF;HAVE.clear();DEF=null;
    try{const d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML=`<svg width="0" height="0"><defs><linearGradient id="kh-beam"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".85"/><stop offset="1" stop-color="#FFE38A" stop-opacity="0"/></linearGradient><radialGradient id="kh-glow"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".75"/><stop offset="1" stop-color="#FFC24A" stop-opacity="0"/></radialGradient></defs></svg>`;
      document.body.appendChild(d);DEF=d.querySelector('defs');}catch(e){DEF=null;}return DEF;}
  function need(id){if(HAVE.has(id)&&DEF&&DEF.isConnected)return;const el=ensureDefs();if(!el||!PART[id])return;HAVE.add(id);
    try{el.insertAdjacentHTML('beforeend',`<g id="kh-${id}">${PART[id]}</g>`);}catch(e){}}
  const U=(id,tr)=>{need(id);return `<use href="#kh-${id}"${tr?` transform="${tr}"`:''}/>`;};
  const castOf=o=>{const w=o.who!=null?o.who:o.seat!=null?o.seat:o.c?Math.max(0,CAST.findIndex(x=>x.c.toLowerCase()===String(o.c).toLowerCase())):0;return ((w%8)+8)%8;};
  const hatOf=o=>o.hat&&ACC_AT[o.hat]==='H'?o.hat:o.acc&&ACC_AT[o.acc]==='H'?o.acc:null;
  /* KH.kid({who|seat|c, pose, mood, outfit, acc, hat, s, flip, x, y}): one kid as SVG (a <g> to put inside an <svg>), 3 to 7 <use>s.
     who: the cast member (0..7, the player's colour index); c overrides the shirt colour; pose: stand | walk | peek | cheer |
     caught | sad | think | count | torch | wave; mood: s | g | o | sad | k | hm (mouth); outfit: a key of OUTFIT;
     acc: a key of ACC (held in the hand, or on the body); hat: a head accessory (crown, chefhat, fedora, bulb, helmet) */
  // o.inline: the parts written out in place, the kid's colours written in (for an image, KH.pic), instead of <use>s
  const SKV='var(--ks,#F2C29B)',KCV='var(--kc,#EC6158)';
  const inl=(kc1,ks1)=>(id,tr)=>PART[id]?`<g${tr?` transform="${tr}"`:''}>${PART[id].split(KCV).join(kc1).split(SKV).join(ks1)}</g>`:'';
  function kid(o={}){const w=castOf(o),K=CAST[w],pose=o.pose||'stand',mood=o.mood||POSE_MOOD[pose]||K.m,s=o.s||1,u=o.inline?inl(o.c||K.c,K.skin):U;
    const st=o.inline?'':` style="--kc:${o.c||K.c};--ks:${K.skin}"`;const tr=`translate(${f(o.x||0)} ${f(o.y||0)}) scale(${f((o.flip?-s:s)*100)/100} ${f(s*100)/100})${o.r?` rotate(${f(o.r)})`:''}`;
    const hat=hatOf(o),head=u('h'+w)+u('m-'+(MOUTH[mood]?mood:'s'))+(hat?u('a-'+hat):'');
    if(pose==='peek')return `<g transform="${tr}"${st}>${head}${u('peekhands')}</g>`;
    const b=BODY[pose]?pose:'stand',acc=o.acc&&ACC[o.acc]&&ACC_AT[o.acc]!=='H'?o.acc:null;
    let ac='';if(acc){const hp=HAND[b]||HAND.stand,dx=f(hp[0]-12.5),dy=f(hp[1]+19);ac=u('a-'+acc,ACC_AT[acc]==='h'&&(dx||dy)?`translate(${dx} ${dy})`:'');}
    return `<g transform="${tr}"${st}>${u('b-'+b)}${o.outfit&&OUTFIT[o.outfit]?u('o-'+o.outfit):''}<g transform="translate(0 -45)">${head}</g>${pose==='count'?u('eyeshands'):''}${ac}</g>`;}
  /* KH.extend({outfit:{key:svg},acc:{key:svg}}): a game adds its own outfits and accessories (namespaced keys, e.g. 'job-chef',
     drawn in body coordinates like glove/ball); they go into the page the first time they are used, like every template.
     Existing keys are never replaced */
  function extend(o={}){for(const k in o.outfit||{})if(!OUTFIT[k]){OUTFIT[k]=o.outfit[k];PART['o-'+k]=o.outfit[k];}
    for(const k in o.acc||{})if(!ACC[k]){ACC[k]=o.acc[k];ACC_AT[k]='b';PART['a-'+k]=o.acc[k];}}
  // a round face for avatars inside a game's own markup: a standalone small <svg>; o.hat adds a head accessory
  const faceVB=o=>hatOf(o)?'-20 -24 40 40':'-17 -18 34 34';
  const faceIn=(o,u)=>{const w=castOf(o),hat=hatOf(o);return `${o.ring?`<circle cy="-1" r="16.5" fill="${o.bg||o.c||CAST[w].c}"/>`:''}${u('h'+w)}${u('m-'+(MOUTH[o.mood]?o.mood:CAST[w].m))}${hat?u('a-'+hat):''}`;};
  const face1=(o={})=>{const w=castOf(o);
    return `<svg class="kh-face${o.cls?' '+o.cls:''}" viewBox="${faceVB(o)}" width="${o.size||32}" height="${o.size||32}" aria-hidden="true"><g style="--kc:${o.c||CAST[w].c};--ks:${CAST[w].skin}">${faceIn(o,U)}</g></svg>`;};
  // the old single entry point: kid poses go to kid(), the other figures are plain templates
  function sprite(pose,x,y,o={}){if(BODY[pose]||pose==='peek')return kid({...o,pose,x,y});const sc=(o.s||1)*(o.flip?-1:1),s=o.s||1;need(pose);
    return `<use href="#kh-${pose}" transform="translate(${f(x)} ${f(y)}) scale(${f(sc*100)/100} ${f(s*100)/100})"${o.cls?` class="${o.cls}"`:''}/>`;}
  // a kid (or a few) as a standalone <svg> for a game's own HTML; the default box holds a standing kid with a hat, o.vb crops it
  const BOX='-27 -78 54 82';
  const fig=(inner,o={})=>`<svg class="kh-fig${o.cls?' '+o.cls:''}" viewBox="${o.vb||BOX}"${o.w?` width="${o.w}" height="${o.h||o.w}"`:''} aria-hidden="true">${inner}</svg>`;
  /* pictures for the app's shell: a face or a kid drawn once into an SVG image and kept as a CSS class (one rule a look, added
     the first time the look is needed), so a player strip, a status card or a result sheet adds one plain element and no
     <use> or SVG nodes to the page: nothing for a re-render to compare and nothing for the browser to lay out inside it */
  const PIC=new Map();let PSH=null,PN=0;
  function pic(key,mk,vb){let c=PIC.get(key);if(c)return c;c='khi-'+(++PN);
    try{if(!PSH){const el=document.createElement('style');el.id='kh-pics';document.head.appendChild(el);PSH=el.sheet;}
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" font-family="Tahoma,Arial,sans-serif">${mk()}</svg>`;
      PSH.insertRule(`.${c}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g,'%27').replace(/\(/g,'%28').replace(/\)/g,'%29')}")}`,PSH.cssRules.length);}catch(e){}
    PIC.set(key,c);return c;}
  const kk=(o,ks)=>ks.map(k=>o[k]==null?'':o[k]).join('|');
  const KEYS=['who','c','pose','mood','outfit','acc','hat','r','flip'];
  // KH.faceImg(o) / KH.kidImg(o,{vb,cls}): the same face and kid as an element with the picture (class "khi")
  const faceImg=(o={})=>`<kh-p class="khi${o.cls?' '+o.cls:''} ${pic('f|'+kk(o,['who','c','mood','hat','ring','bg']),()=>faceIn(o,inl(o.c||CAST[castOf(o)].c,CAST[castOf(o)].skin)),faceVB(o))}" aria-hidden="true"></kh-p>`;
  const kidImg=(o={},b={})=>`<kh-p class="khi${b.cls?' '+b.cls:''} ${pic('k|'+kk(o,KEYS)+'|'+(b.vb||BOX),()=>kid({...o,x:0,y:0,s:1,inline:true}),b.vb||BOX)}"${b.style?` style="${b.style}"`:''} aria-hidden="true"></kh-p>`;

  /* ---------------- the cast in the app's shell (core.js): every player is a kid ----------------
     A player's kid: online, the avatar they picked (presence av KID_AV+k, accepted by emoji.js EMJ_AV), else the kid of their colour;
     on one phone, the kid picked on the setup row (localStorage alaabna.lkid), else the kid of the seat's colour. The shirt (and a
     hijab) always takes the player's colour: the colour stays the player's identity */
  const KID_AV=100;let LK=null;
  const lkGet=()=>{if(LK)return LK;try{const a=JSON.parse(localStorage.getItem('alaabna.lkid')||'[]');LK=Array.isArray(a)?a.slice(0,8):[];}catch(e){LK=[];}return LK;};
  function lkSet(r,k){const a=lkGet().slice();while(a.length<8)a.push(-1);a[r]=k===r?-1:k;LK=a;try{localStorage.setItem('alaabna.lkid',JSON.stringify(a));}catch(e){}}
  const avKid=a=>Number.isInteger(a)&&a>=KID_AV&&a<KID_AV+8?a-KID_AV:-1;
  function kidOf(r){if(!(Number.isInteger(r)&&r>=0&&r<8))return 0;
    try{if(S.mode==='local'){const v=lkGet()[r];if(Number.isInteger(v)&&v>=0&&v<8)return v;}
      else if(S.mode==='online'){const k=avKid(r===S.me?myAv():S.avs[r]);if(k>=0)return k;}}catch(e){}return r;}
  const colOf=r=>typeof COLS!=='undefined'&&COLS[r]?COLS[r]:CAST[kidOf(r)].c;
  // a player's face and kid (pictures), in the player's colour
  const pface=(r,o={})=>faceImg({...o,who:kidOf(r),c:colOf(r)});
  const pkid=(r,o={},b)=>kidImg({...o,who:kidOf(r),c:colOf(r)},b);
  // the home screen: four kids peek over the top of the four ways to play (a different four each time the app opens; a finite
  // pop-up once, none in lite mode). The strip ends at the tiles' top edge: the kids' chins hide behind it, their hands hold it
  const HOME=(()=>{const a=[0,1,2,3,4,5,6,7];for(let i=7;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,4);})();
  // The first screen paints without them; they come in on the next frame (so the home shows as fast as before)
  let homeOn=false;
  function homeScene(){if(!homeOn){if(homeOn===false){homeOn=null;const go=()=>{homeOn=true;try{if(S.mode===null)render();}catch(e){}};
      try{requestAnimationFrame(()=>setTimeout(go,0));}catch(e){setTimeout(go,30);}}return '<div class="kh-home" aria-hidden="true"></div>';}
    const at=[[56,1,-7],[120,3,4],[244,2,-4],[306,0,7]];
    return `<div class="kh-home" aria-hidden="true">${at.map(([x,dy,r],i)=>kidImg({who:HOME[i],pose:'peek',mood:i===1?'g':null,r},{cls:'kp',vb:'-24 -24 48 34',style:`--i:${i};left:${f((x-24*1.55)/3.6)}%;bottom:${f(-(0.5+dy)/0.46)}%`})).join('')}</div>`;}
  const beam=(x,y,ang,len=110,spread=34)=>(ensureDefs(),`<path transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})" d="M0 -3L${len} ${-spread}Q${len+16} 0 ${len} ${spread}L0 3Z" fill="url(#kh-beam)"/>`);
  // text width: measured with the game font once it is loaded (cached), estimated before that
  const TW={};let twc=null;
  const tw=(t,fs)=>{t=String(t);const k=fs+'|'+t;if(TW[k])return TW[k];const est=[...t].length*fs*.5+4;
    try{if(typeof document==='undefined'||!document.fonts||!document.fonts.check(`800 ${fs}px 'Baloo Bhaijaan 2'`))return est;twc=twc||document.createElement('canvas').getContext('2d');twc.font=`800 ${fs}px 'Baloo Bhaijaan 2'`;return TW[k]=Math.ceil(twc.measureText(t).width)+4;}catch(e){return est;}};
  function say(x,y,text,o={}){const fs=o.fs||13,w=o.w||tw(text,fs)+16,h=fs+12,dx=o.dx||0,b=-9,fill=o.fill||'#FFF4D6',c=o.col||OL;
    return T(x,y,`<path d="M0 0L${f(dx-6)} ${b}H${f(dx+6)}Z" fill="${fill}"${s2(1.6)}/><rect x="${f(dx-w/2)}" y="${b-h}" width="${f(w)}" height="${h}" rx="${f(h/2)}" fill="${fill}"${s2(1.6)}/><path d="M${f(dx*.2)} -2.6L${f(dx-4.4)} ${b+1}H${f(dx+4.4)}Z" fill="${fill}"/><text x="${f(dx)}" y="${f(b-h/2+fs*.36)}" font-size="${fs}" font-weight="800" fill="${c}" text-anchor="middle">${text}</text>`);}
  function burst(x,y,text,o={}){let d='';const n=14;for(let i=0;i<n*2;i++){const a=Math.PI*i/n,r=i%2?26:34;d+=(i?'L':'M')+f(Math.cos(a)*r*1.45)+' '+f(Math.sin(a)*r*.72);}
    return T(x,y,`<path d="${d}Z" fill="${o.c||'#EC6158'}"${s2(2)}/><text y="5.5" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">${text}</text>`,o.s||1);}

  /* ---------------- paths ---------------- */
  function graph(g){const n=g.pos.length,adj=Array.from({length:n},()=>[]),E={};
    for(const [a,b,w] of g.edges){adj[a].push(b);adj[b].push(a);E[a+'-'+b]=w||[];E[b+'-'+a]=(w||[]).slice().reverse();}
    const D=[],P=[];for(let a=0;a<n;a++){const dist=Array(n).fill(99),prev=Array(n).fill(-1),q=[a];dist[a]=0;
      while(q.length){const x=q.shift();for(const y of adj[x])if(dist[y]>dist[x]+1){dist[y]=dist[x]+1;prev[y]=x;q.push(y);}}D.push(dist);P.push(prev);}
    const path=(a,b)=>{if(a===b)return [a];const out=[b];let x=b;while(x!==a&&x>=0){x=P[a][x];if(x<0)return [a,b];out.push(x);}return out.reverse();};
    const edge=(a,b)=>[g.pos[a],...(E[a+'-'+b]||[]),g.pos[b]];
    const pts=(a,b)=>{const nodes=path(a,b);const out=[g.pos[nodes[0]]];for(let i=1;i<nodes.length;i++)out.push(...edge(nodes[i-1],nodes[i]).slice(1));return out;};
    return {pos:g.pos,adj,D,path,pts,edge};}
  // walk an element along points with transform only; each point is [x,y] in the element's user units
  function walk(el,pts,o={}){let rm=false;try{rm=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}if(!el||!pts||pts.length<2||rm||!el.animate)return null;
    // lite mode: the same walk, shorter (one quick move instead of a stroll)
    if(lite())o={...o,max:Math.min(o.max||1200,450),step:null};
    const seg=[];let tot=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);tot+=l;}if(!(tot>0))return null;
    const per=Math.max(Math.min(150,(o.max||1200)/seg.length),Math.min(250,(o.max||1200)/seg.length)),dur=Math.min(o.max||1200,per*seg.length);
    let acc=0;const kf=[{transform:`translate(${pts[0][0]}px,${pts[0][1]}px)`,offset:0}];
    for(let i=1;i<pts.length;i++){acc+=seg[i-1];kf.push({transform:`translate(${pts[i][0]}px,${pts[i][1]}px)`,offset:Math.min(1,acc/tot)});}
    try{el.classList.add('walking');const an=el.animate(kf,{duration:dur,easing:'linear',delay:o.delay||0});
      if(o.step){const n=Math.min(8,seg.length);for(let i=0;i<n;i++)setTimeout(o.step,(o.delay||0)+i*dur/n);}
      an.onfinish=an.oncancel=()=>{try{el.classList.remove('walking');}catch(e){}if(o.done)o.done();};return an;}catch(e){return null;}}

  /* ---------------- ui ---------------- */
  const banner=(text,o={})=>`<div class="kh-banner ${o.cls||''}"${o.k?` data-k="${o.k}"`:''}>${o.icon?`<i>${o.icon}</i>`:''}<span>${text}</span></div>`;
  const card=(icon,title,text,o={})=>`<div class="kh-card ${o.cls||''}"${o.k?` data-k="${o.k}"`:''}><i>${icon}</i><span>${title?`<b>${title}</b>`:''}${text?`<small>${text}</small>`:''}</span></div>`;

  /* ---------------- sound ---------------- */
  let ac=null;
  function snd(kind){try{if(typeof S!=='undefined'&&S.mute)return;ac=ac||(typeof actx!=='undefined'&&actx)||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){return;}
    const t0=ac.currentTime;
    const tone=(fr,dur,o={})=>{const os=ac.createOscillator(),g=ac.createGain();os.type=o.type||'triangle';os.frequency.setValueAtTime(fr,t0+(o.at||0));if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t0+(o.at||0)+dur);
      const v=o.v||.14;g.gain.setValueAtTime(.0001,t0+(o.at||0));g.gain.exponentialRampToValueAtTime(v,t0+(o.at||0)+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+(o.at||0)+dur);os.connect(g).connect(ac.destination);os.start(t0+(o.at||0));os.stop(t0+(o.at||0)+dur+.03);};
    const noise=(dur,o={})=>{const n=Math.floor(ac.sampleRate*dur),b=ac.createBuffer(1,n,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);
      const s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=b;fl.type='lowpass';fl.frequency.value=o.f||900;g.gain.value=o.v||.12;s.connect(fl).connect(g).connect(ac.destination);s.start(t0+(o.at||0));};
    switch(kind){
      case 'step':noise(.05,{f:500,v:.09});break;
      case 'heart':tone(62,.12,{type:'sine',v:.35});tone(55,.14,{type:'sine',v:.28,at:.2});break;
      case 'found':tone(880,.08,{v:.16});tone(660,.1,{at:.08,v:.16});tone(990,.18,{at:.18,v:.18});break;
      case 'safe':tone(523,.1);tone(659,.1,{at:.1});tone(784,.2,{at:.2});break;
      case 'meow':tone(700,.32,{to:420,type:'sawtooth',v:.05});break;
      case 'bark':noise(.09,{f:700,v:.18});noise(.09,{f:700,v:.16,at:.18});tone(180,.08,{type:'square',v:.05});break;
      case 'count':tone(440,.07,{type:'sine',v:.1});break;
      case 'call':tone(660,.22,{type:'sine',v:.12});tone(880,.32,{type:'sine',v:.12,at:.24});break;
      case 'whoosh':noise(.25,{f:1600,v:.08});break;
      case 'tick':tone(1200,.03,{type:'square',v:.04});break;}}

  return {OL,f,T,st,lite,C,art:{roof,facade,court,door,car,trailer,barrel,crate,palm,tree,lamp,pool,tank,shed,tent,field,shop,ruin,defs},bg,CAST,kid,face:face1,sprite,fig,beam,say,burst,tw,graph,walk,banner,card,snd,ensureDefs,need,extend,
    OUTFIT:Object.keys(OUTFIT),ACC:Object.keys(ACC),faceImg,kidImg,KID_AV,kidOf,lkSet,pface,pkid,homeScene};
})();

/* =====================================================================================================
   More of the kit, first used by «طاق طاق طاقية» (n-taqiya.js). Additive: nothing above changes.
     KH.sit({who|c,pose,mood,s,flip,x,y})  a kid sitting cross-legged on the floor (head at 0,-33):
                                 pose sit | situp (one hand up) | sitcheer (both up) | sitlook (hand at the head, turning)
     KH.cap(x,y,kind,s)          the cap («طاقية»): kind cap (white, knitted) | gold | fake (a patched rag)
     KH.sprite('sleepcat',x,y)   a ginger cat curled up asleep (works through KH.sprite like the other figures)
     KH.art.moon(x,y) KH.art.lights(x0,y0,x1,y1,sag,n,off) KH.art.rug(cx,cy,rx,ry) KH.art.jar(x,y) KH.art.stairs(x,y,w,h)
     KH.art.icecart(x,y)         the courtyard pieces: moon with its glow, a string of coloured bulbs, a round rug, a water
                                 jar (زير), stairs up to the roof, the ice-cream seller's cart
     KH.art.defs2()              the gradients the pieces above need (once per art SVG, next to KH.art.defs())
   ===================================================================================================== */
Object.assign(KH,(()=>{
  const OL=KH.OL,f=KH.f,T=KH.T,s2=w=>` stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const sk='var(--ks,#F2C29B)',kc='var(--kc,#EC6158)';
  const hand=(x,y)=>`<circle cx="${x}" cy="${y}" r="3.3" fill="${sk}"${s2(1.3)}/>`;
  const arm=d=>`<path d="${d}" fill="none" stroke="${kc}" stroke-width="5" stroke-linecap="round"/>`;
  const legs=`<ellipse rx="19" ry="4.5" fill="#000" opacity=".32"/><path d="M-18 -3q-1-9 7-11h22q8 2 7 11q-7 3-18 3t-18-3z" fill="#2D4763"${s2(1.4)}/>`+
    `<path d="M-14 -5q7 5 15 1M14 -5q-7 5-15 1" fill="none" stroke="${sk}" stroke-width="4.6" stroke-linecap="round"/><ellipse cx="-5.5" cy="-2.2" rx="4.4" ry="2.7" fill="#fff"${s2(1.3)}/><ellipse cx="5.5" cy="-2.2" rx="4.4" ry="2.7" fill="#fff"${s2(1.3)}/>`;
  const torso=`<path d="M-10 -11q-1-14 10-14t10 14z" fill="${kc}"${s2(1.6)}/><path d="M-4 -24.5l4 4 4-4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>`;
  const SIT={sit:legs+arm('M-8 -19q-6 4-8 9M8 -19q6 4 8 9')+hand(-15.5,-9)+hand(15.5,-9)+torso,
    situp:legs+arm('M-8 -19q-6 4-8 9')+hand(-15.5,-9)+torso+arm('M8 -20l8 -12')+hand(16.5,-33),
    sitcheer:legs+torso+arm('M-8 -20l-8 -12M8 -20l8 -12')+hand(-16.5,-33)+hand(16.5,-33),
    sitlook:legs+arm('M-8 -19q-6 4-8 9')+hand(-15.5,-9)+torso+arm('M8 -20q8 -2 6 -12')+hand(13.5,-33)};
  const SIT_MOOD={sitcheer:'g',sitlook:'o'};
  const capBody=(fill,dot,extra)=>`<ellipse cy="3" rx="11" ry="3.4" fill="#000" opacity=".3"/><path d="M-10 1.5a10 9.5 0 0 1 20 0q-10 4-20 0z" fill="${fill}"${s2(1.5)}/><path d="M-8.2 -2.5q8.2 3 16.4 0M-6 -6q6 2.4 12 0" fill="none" stroke="${dot}" stroke-width="1.3" stroke-dasharray="1.6 1.6"/>${extra}`;
  const CAPS={cap:capBody('#FAFBFD','#B9C6D6',`<path d="M-10 1.5q10 4 20 0" fill="none" stroke="#C8D3E0" stroke-width="1.6"/>`),
    gold:capBody('#FFD24D','#C98F1A',`<path d="M-5 -5.5l1.2 2.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
    fake:capBody('#E7DCC8','#B49B78',`<path d="M-1 -8l3 6M3 -8l-3 6" stroke="#C0612B" stroke-width="1.3"/><rect x="2" y="-4" width="6" height="5" rx="1" fill="#C9B48E"${s2(1)}/>`)};
  const SLEEPCAT=`<ellipse cy="5" rx="19" ry="5" fill="#000" opacity=".3"/><path d="M14 4q6 6-4 8.5q-10 1.5-16-1" fill="none" stroke="${OL}" stroke-width="6.4" stroke-linecap="round"/><path d="M14 4q6 6-4 8.5q-10 1.5-16-1" fill="none" stroke="#E39B4E" stroke-width="4" stroke-linecap="round"/>`+
    `<ellipse cx="2" cy="1" rx="15" ry="9.5" fill="#E39B4E"${s2(1.5)}/><path d="M3 -7.5q2 4 0 8M8 -6q2 4 0 8M13 -3.5q1.5 3 0 6" fill="none" stroke="#B5652A" stroke-width="2" stroke-linecap="round"/>`+
    `<path d="M-15 -4l-1-8 5 4z" fill="#E39B4E"${s2(1.3)}/><path d="M-6 -6l3-7 2 6z" fill="#E39B4E"${s2(1.3)}/><circle cx="-9" cy="-1" r="7.5" fill="#E39B4E"${s2(1.5)}/><ellipse cx="-9" cy="2.6" rx="3.6" ry="2.4" fill="#FBE3C4"/>`+
    `<path d="M-14 -1.6q1.8 1.6 3.4 0M-7.6 -1.6q1.8 1.6 3.4 0" fill="none" stroke="${OL}" stroke-width="1.3" stroke-linecap="round"/><path d="M-9.8 1.2h1.6l-.8 1z" fill="#D9534F"/>`;
  let done=false;
  function ensure(){KH.ensureDefs();if(typeof document==='undefined'||!document.body||(done&&document.getElementById('kh-sit-sit')))return;done=true;
    try{const d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';const g=(id,c)=>`<g id="kh-${id}">${c}</g>`;
      d.innerHTML=`<svg width="0" height="0"><defs>${Object.keys(SIT).map(k=>g('sit-'+k,SIT[k])).join('')}${Object.keys(CAPS).map(k=>g('cap-'+k,CAPS[k])).join('')}${g('sleepcat',SLEEPCAT)}</defs></svg>`;document.body.appendChild(d);}catch(e){}}
  const castOf=o=>{const w=o.who!=null?o.who:o.c?Math.max(0,KH.CAST.findIndex(x=>x.c.toLowerCase()===String(o.c).toLowerCase())):0;return ((w%8)+8)%8;};
  function sit(o={}){ensure();const w=castOf(o),K=KH.CAST[w],pose=SIT[o.pose]?o.pose:'sit',mood=o.mood||SIT_MOOD[pose]||K.m,s=o.s||1;
    return `<g transform="translate(${f(o.x||0)} ${f(o.y||0)}) scale(${f((o.flip?-s:s)*100)/100} ${f(s*100)/100})" style="--kc:${o.c||K.c};--ks:${K.skin}"><use href="#kh-sit-${pose}"/><g transform="translate(0 -33)">${(KH.need('h'+w),KH.need('m-'+mood),'')}<use href="#kh-h${w}"/><use href="#kh-m-${mood}"/></g></g>`;}
  const cap=(x,y,kind='cap',s=1)=>{ensure();return `<use href="#kh-cap-${CAPS[kind]?kind:'cap'}" transform="translate(${f(x)} ${f(y)})${s!==1?` scale(${s})`:''}"/>`;};
  const sprite0=KH.sprite;const sprite=(pose,x,y,o={})=>{if(pose==='sleepcat')ensure();return sprite0(pose,x,y,o);};
  // courtyard pieces (plain SVG strings)
  const BULB=['#FFD873','#EC6158','#7FD3FF','#7BEA9C','#FFB37A'];
  const defs2=()=>`<defs>${BULB.map((c,i)=>`<radialGradient id="khb${i}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}<radialGradient id="khmg"><stop offset=".2" stop-color="#FFF1C1" stop-opacity=".35"/><stop offset="1" stop-color="#FFF1C1" stop-opacity="0"/></radialGradient><radialGradient id="khrug" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#7E2A33"/><stop offset="1" stop-color="#5E1F28"/></radialGradient></defs>`;
  const moon=(x,y)=>`<circle cx="${x}" cy="${y}" r="62" fill="url(#khmg)"/><circle cx="${x}" cy="${y}" r="17" fill="#FFF1C1"${s2(1.4)}/><circle cx="${x-5}" cy="${y-4}" r="3.6" fill="#EAD9A2"/><circle cx="${x+6}" cy="${y+5}" r="2.6" fill="#EAD9A2"/><circle cx="${x+3}" cy="${y-8}" r="1.6" fill="#EAD9A2"/>`;
  function lights(x0,y0,x1,y1,sag,n,off=0){const cx=(x0+x1)/2,cy=(y0+y1)/2+sag;let s=`<path d="M${x0} ${y0}Q${f(cx)} ${f(cy)} ${x1} ${y1}" fill="none" stroke="#0A101C" stroke-width="1.6"/>`,g='',b='';
    for(let i=1;i<n;i++){const t=i/n,x=f((1-t)*(1-t)*x0+2*t*(1-t)*cx+t*t*x1),y=f((1-t)*(1-t)*y0+2*t*(1-t)*cy+t*t*y1),k=(i+off)%BULB.length;
      g+=`<circle cx="${x}" cy="${f(y+5)}" r="11" fill="url(#khb${k})"/>`;b+=`<path d="M${x} ${y}v2" stroke="#0A101C" stroke-width="2"/><ellipse cx="${x}" cy="${f(y+5)}" rx="3" ry="3.8" fill="${BULB[k]}" stroke="#0A101C"/><circle cx="${f(x-.9)}" cy="${f(y+3.8)}" r="1" fill="#fff" opacity=".85"/>`;}
    return s+g+b;}
  const rug=(cx,cy,rx,ry)=>`<ellipse cx="${cx}" cy="${cy+6}" rx="${rx+4}" ry="${ry+4}" fill="#000" opacity=".25"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#khrug)"${s2(1.8)}/>`+
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx-8}" ry="${f(ry-7)}" fill="none" stroke="#E2B65A" stroke-width="2.2" stroke-dasharray="2 5"/><ellipse cx="${cx}" cy="${cy}" rx="${f(rx*.62)}" ry="${f(ry*.55)}" fill="none" stroke="#E2B65A" stroke-opacity=".7" stroke-width="1.6"/><ellipse cx="${cx}" cy="${cy}" rx="${f(rx*.56)}" ry="${f(ry*.47)}" fill="#2D3E66" opacity=".55"/>`;
  const jar=(x,y)=>`<ellipse cx="${x}" cy="${y+18}" rx="13" ry="5" fill="#000" opacity=".3"/><path d="M${x-10} ${y}q-6 16 10 18q16-2 10-18z" fill="#B97A4A"${s2(1.4)}/><ellipse cx="${x}" cy="${y}" rx="8" ry="3" fill="#7A4A2A"${s2(1.2)}/>`;
  function stairs(x,y,w,h){let s='';const st=h/5;for(let i=0;i<5;i++)s+=`<rect x="${x}" y="${f(y+h-(i+1)*st)}" width="${f(w-i*w*.11)}" height="${f(st+1)}" fill="${i%2?'#C9A577':'#D6B588'}"${s2(1.2)}/>`;return s;}
  const icecart=(x,y)=>T(x,y,`<ellipse cy="15" rx="32" ry="6" fill="#000" opacity=".3"/><rect x="-22" y="-14" width="46" height="27" rx="5" fill="#FAFBFD"${s2(1.8)}/><path d="M-22 -4h46" stroke="#EE7FB3" stroke-width="5"/><circle cx="-10" cy="14" r="5" fill="#45567A"${s2(1.6)}/><circle cx="14" cy="14" r="5" fill="#45567A"${s2(1.6)}/>`+
    `<path d="M2 -14v-12" stroke="${OL}" stroke-width="2"/><path d="M-24 -24a26 13 0 0 1 52 0z" fill="#EC6158"/><path d="M-11 -34l4 10M2 -37v13M15 -34l-4 10" stroke="#fff" stroke-width="5"/><path d="M-24 -24a26 13 0 0 1 52 0z" fill="none"${s2(1.8)}/>`+
    `<path d="M-2 4l4 10 4-10z" fill="#E2B65A"${s2(1.3)}/><circle cx="2" cy="2" r="4.5" fill="#EE7FB3"${s2(1.3)}/>`);
  return {sit,cap,sprite,ensureDefs2:ensure,art:{...KH.art,moon,lights,rug,jar,stairs,icecart,defs2}};
})());

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
   The cast (app-wide characters, one kid per player colour, core.js COLS order), drawn on a skeleton rig (2026-11 design):
     KH.CAST[i]                  {n name, g 'b'|'g', c colour, skin, m default mood, t personality, and the rig's look: hair, top,
                                 low, ...}: 0 حمود (red cap), 1 سعود (short hair, fringe), 2 نورة (ponytail, green headband),
                                 3 سارة (glasses, braid), 4 ريم (pigtails), 5 بدر (taqiyah), 6 لولوة (wavy hair, flower clip), 7 ناصر (quiff)
     KH.kid({who|seat|c,pose,mood,outfit,acc,hat,s,flip,x,y,lod})  one kid for inside an <svg>: one <use> of a picture made once
                                 per look; ground at 0,0, about 58 units tall:
                                 pose stand | walk | peek | cheer | caught | sad | think | count | torch | wave | hold |
                                 sit | situp | sitcheer | sitlook; mood s | k | g | o | sad | hm (the face: brows carry it);
                                 outfit apron | sport | dealer | thobe | host | coat | gi | lab | smock | sailor;
                                 acc (held) mic | pawn | crownp | dice | rod | pencil | brush | book | lens | sword | watch | gavel | flag |
                                 balloon | bow | dart | cue | club | bball | bowl | oar | tile | piece | trophy | letter | coin | dallah | spoon |
                                 buzzer | cards | glove, (by the feet) ball; hat chefhat | crown | fedora | bulb | helmet
     KH.face({who,size,ring,mood,hat}) a standalone round avatar <svg> (player strip, lobby, results)
     KH.sit({who|c,pose,mood,s,flip,x,y})  a kid sitting cross-legged (head near 0,-32): pose sit | situp | sitcheer | sitlook
     KH.fig(inner,{vb,cls,w,h})  kids as a standalone <svg> for HTML (the default box holds one standing kid with a hat)
     KH.faceImg(o) KH.kidImg(o,{vb,cls,style})  the same face / kid as one element (<kh-p class="khi">) showing a picture made once
                                 per look and kept as a CSS rule: what the app's shell uses, no SVG nodes in the page
     KH.sprite(pose,x,y,o)       the same kids by pose, plus the other figures: sil | mom | cat | dog | grocer
     A game dresses the cast with OUTFIT/ACC entries (js/cast-themes.js picks them per game) or adds its own with
     KH.extend({outfit,acc}) (namespaced keys; KH.cloth has the helpers to draw clothes on the rig)
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


  /* ---------------- the cast: 8 kids, one per player colour (core.js COLS), drawn on a skeleton rig ----------------
     The owner's approved design (2026-11): about three heads tall, one continuous body driven by a skeleton (shoulder,
     elbow, wrist, hip, knee, ankle), small low dark eyes and brows that carry the mood. A kid is drawn in "rig units"
     (ground at y 0, the head's centre at 0,-109, about 135 tall) and shown at RS of that, so in a game's own SVG a standing
     kid is about as tall as before (ground at 0, head centre near 0,-47). Every limb, the torso and the head are drawn
     twice: an outline pass (everything navy with a wide stroke, class kr-bo / kr-sil) and then the fill pass, so the
     parts melt into one shape with no seams. The paint lives in one stylesheet (RIGCSS, kr-* classes) that goes inside each
     picture: a look is always shown as a picture made once (KH.kid, KH.face, KH.kidImg, KH.faceImg), never as live parts */
  const kc='var(--kc,#EC6158)',s2=w=>` stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // RS: rig units to kid units; HS: a held thing (drawn in the old kid scale) to rig units, a little smaller than before to
  // suit the slimmer hands
  const INK='#22374F',RS=.43,HS=f(.8/RS);
  const r1=v=>Math.round(v*10)/10;
  const CAST=[
    {n:'حمود',g:'b',c:'#EC6158',skin:'#F2C29B',m:'k',t:'شقي وسريع',id:'hamood',cd:'#C9463F',hair:'#5A3A2A',low:'shorts',lowc:'#3E5F8E',top:'tee',shoe:'#FFFFFF',shoeA:'#EC6158',w:1,brow:'cheeky'},
    {n:'سعود',g:'b',c:'#4AB1E8',skin:'#E0A577',m:'s',t:'هادي ويفكر',id:'saud',cd:'#2F8FC6',hair:'#2B211C',low:'thobe',lowc:'#F4F7FA',top:'vest',shoe:'#7A5236',shoeA:'#5B3B26',w:1,brow:'calm'},
    {n:'نورة',g:'g',c:'#4CB97F',skin:'#F5CBA7',m:'s',t:'ذكية وتلاحظ كل شي',id:'noura',cd:'#2F9561',hair:'#3A2A22',low:'pants',lowc:'#34507A',top:'long',shoe:'#FFFFFF',shoeA:'#4CB97F',w:1,brow:'soft'},
    {n:'سارة',g:'g',c:'#EDB02F',skin:'#C98A5E',m:'s',t:'تحب الألغاز',id:'sara',cd:'#C98E14',hair:'#2A1D18',low:'skirt',lowc:'#3D5C8C',legc:'#2B3A55',top:'long',shoe:'#8A5A3C',shoeA:'#EDB02F',w:1,brow:'soft'},
    {n:'ريم',g:'g',c:'#9C7BD6',skin:'#F2C29B',m:'s',t:'نشيطة وما تهدى',id:'reem',cd:'#7A58B8',hair:'#4A3026',low:'pants',lowc:'#3A4F7D',top:'long',shoe:'#FFFFFF',shoeA:'#9C7BD6',w:.96,brow:'happy',small:.92},
    {n:'بدر',g:'b',c:'#F2874B',skin:'#D99A6C',m:'s',t:'ضحوك',id:'badr',cd:'#D16A2E',hair:'#2B201B',low:'shorts',lowc:'#8C7A5C',top:'tee',shoe:'#FFFFFF',shoeA:'#F2874B',w:1.16,brow:'happy'},
    {n:'لولوة',g:'g',c:'#E57AAE',skin:'#E8B48C',m:'s',t:'لطيفة وشجاعة',id:'lulwa',cd:'#C65A8E',hair:'#3A2A22',low:'skirt',lowc:'#E57AAE',legc:'#B95C8C',top:'long',shoe:'#FFFFFF',shoeA:'#E57AAE',w:1,brow:'soft',dress:1},
    {n:'ناصر',g:'b',c:'#2FB3AA',skin:'#B07750',m:'k',t:'واثق وهادي',id:'nasser',cd:'#1E8F87',hair:'#1F1713',low:'thobe',lowc:'#F4F7FA',top:'vest',shoe:'#3A2B22',shoeA:'#22191A',w:1,brow:'steady'}];
  // the old moods (mouths) are faces now: s smile, k cheeky (the kid's own smile), g happy, o caught out, sad, hm thinking
  const MOOD={s:'normal',k:'normal',g:'eager',o:'surp',sad:'sad',hm:'think',normal:'normal',eager:'eager',win:'win',surp:'surp',think:'think'};
  const P=(cls,d,x='')=>`<path class="${cls}" d="${d}"${x}/>`;
  const E=(cls,cx,cy,rx,ry,x='')=>`<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${x}/>`;
  const Ci=(cls,cx,cy,r,x='')=>`<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"${x}/>`;
  const HU=44;
  const SK={neckY:-88,hipY:-48,hipX:7,thigh:21,shin:20,shX:14,shY:-83,ua:19,fa:18,head:-21};
  const V=(x,y)=>({x,y});
  const dirOf=deg=>{const r=deg*Math.PI/180;return V(-Math.sin(r),Math.cos(r));};
  function chain(o,ra,rb,L1,L2,m){const d1=dirOf(ra),d2=dirOf(ra+rb);
    const p1=V(o.x+m*d1.x*L1,o.y+d1.y*L1),p2=V(p1.x+m*d2.x*L2,p1.y+d2.y*L2);return {p:[o,p1,p2],a2:ra+rb,m};}
  const K=.86;
  function bez(ch,t){const [a,b,c]=ch.p;const c1=V(a.x+(b.x-a.x)*K,a.y+(b.y-a.y)*K),c2=V(c.x+(b.x-c.x)*K,c.y+(b.y-c.y)*K);
    const u=1-t,A=u*u*u,Bq=3*u*u*t,Cq=3*u*t*t,D=t*t*t;
    const p=V(A*a.x+Bq*c1.x+Cq*c2.x+D*c.x,A*a.y+Bq*c1.y+Cq*c2.y+D*c.y);
    let dx=3*u*u*(c1.x-a.x)+6*u*t*(c2.x-c1.x)+3*t*t*(c.x-c2.x),dy=3*u*u*(c1.y-a.y)+6*u*t*(c2.y-c1.y)+3*t*t*(c.y-c2.y);
    let l=Math.hypot(dx,dy);if(l<1e-6){dx=c.x-a.x;dy=c.y-a.y;l=Math.hypot(dx,dy)||1;}
    return {p,t:V(dx/l,dy/l),n:V(-dy/l,dx/l)};}
  const fx=v=>r1(v);
  // tapered shape along a chain between t0..t1. w(t) is a function of the limb's global t.
  function limb(ch,t0,t1,w,o={}){
    const N=Math.max(6,Math.round((t1-t0)*13)),L=[],R=[];
    for(let i=0;i<=N;i++){const t=t0+(t1-t0)*i/N,s=bez(ch,t),ww=w(t);L.push(V(s.p.x+s.n.x*ww,s.p.y+s.n.y*ww));R.push(V(s.p.x-s.n.x*ww,s.p.y-s.n.y*ww));}
    const cap=(t,dir)=>{const s=bez(ch,t),ww=w(t),pts=[];for(let k=1;k<6;k++){const a=k/6*Math.PI;const nx=s.n.x*Math.cos(a)+dir*s.t.x*Math.sin(a),ny=s.n.y*Math.cos(a)+dir*s.t.y*Math.sin(a);
        pts.push(V(s.p.x+nx*ww*(dir>0?1:-1)*(dir>0?1:1),s.p.y+ny*ww));}return pts;};
    // end cap: from L[N] around the front to R[N]
    const endCap=()=>{const s=bez(ch,t1),ww=w(t1),pts=[];for(let k=1;k<6;k++){const a=k/6*Math.PI;pts.push(V(s.p.x+ww*(s.n.x*Math.cos(a)+s.t.x*Math.sin(a)),s.p.y+ww*(s.n.y*Math.cos(a)+s.t.y*Math.sin(a))));}return pts;};
    const startCap=()=>{const s=bez(ch,t0),ww=w(t0),pts=[];for(let k=1;k<6;k++){const a=k/6*Math.PI;pts.push(V(s.p.x+ww*(-s.n.x*Math.cos(a)-s.t.x*Math.sin(a)),s.p.y+ww*(-s.n.y*Math.cos(a)-s.t.y*Math.sin(a))));}return pts;};
    const pl=a=>a.map(q=>`${fx(q.x)} ${fx(q.y)}`).join(' ');
    const ec=o.flatEnd?[]:endCap(), sc=o.flatStart?[]:startCap();
    const fill=`M${pl(L)} ${ec.length?pl(ec)+' ':''}${pl(R.slice().reverse())} ${sc.length?pl(sc):''}Z`.replace(/ (?=-)/g,'');
    let contour='';
    if(o.contourFrom!=null){const ci=Math.max(0,Math.round((o.contourFrom-t0)/(t1-t0)*N));
      if(ci<N) contour=o.openEnd?`M${pl(L.slice(ci))}M${pl(R.slice(ci))}`.replace(/ (?=-)/g,''):`M${pl(L.slice(ci))} ${ec.length?pl(ec)+' ':''}${pl(R.slice(ci).reverse())}`.replace(/ (?=-)/g,'');}
    const cuff=o.flatEnd?`M${pl([L[N],R[N]])}`:'';
    return {fill,contour,cuff};
  }
  const PATH=(cls,d)=>d?`<path class="${cls}" d="${d}"/>`:'';

  /* per-kid clothing data */
  function dress(k){
    const sleeve = k.top==='tee'?[0,.36]:[0,.86];
    const legCov = k.low==='shorts'?[0,.44]:(k.low==='pants'?[0,.9]:(k.low==='skirt'?[0,.9]:null));
    const legCls = k.low==='shorts'||k.low==='pants'?'f-lo':(k.low==='skirt'?'f-lg':null);
    return {sleeve,legCov,legCls,slCls:k.top==='vest'?'f-sl':'f-kc'};
  }

  /* the body of one kid in a pose. returns markup for both passes and the head transform */
  function bodyMarkup(k,pose,u,o={}){const fit=o.fit||{};
    const w=k.w, X=v=>r1(v*w), D=dress(k);
    const sitY=pose.sit?34:0, tor=pose.torso||0, hipY=SK.hipY+sitY;
    const torsoT=`translate(0 ${sitY}) rotate(${tor} 0 ${SK.hipY})`;
    const N=SK.neckY;
    // torso hem by garment
    const hem = k.top==='tee'?-46 : (k.top==='vest'?-50 : (k.id==='noura'?-37:(k.low==='skirt'?-52:-44)));
    const torso=`M${X(-6)} ${N+.6}C${X(-2)} ${N+1.8} ${X(2)} ${N+1.8} ${X(6)} ${N+.6}C${X(11.6)} ${N-.2} ${X(16.8)} ${N+2.6} ${X(16.8)} ${N+8.6}C${X(16.6)} ${N+15} ${X(13.4)} -68 ${X(13.5)} -61.6C${X(13.6)} -56 ${X(15.8)} ${hem-7} ${X(15.6)} ${hem-2}C${X(15.4)} ${hem+.6} ${X(13.2)} ${hem+1} ${X(11)} ${hem+1}Q0 ${hem+2.8} ${X(-11)} ${hem+1}C${X(-13.2)} ${hem+1} ${X(-15.4)} ${hem+.6} ${X(-15.6)} ${hem-2}C${X(-15.8)} ${hem-7} ${X(-13.6)} -56 ${X(-13.5)} -61.6C${X(-13.4)} -68 ${X(-16.6)} ${N+15} ${X(-16.8)} ${N+8.6}C${X(-16.8)} ${N+2.6} ${X(-11.6)} ${N-.2} ${X(-6)} ${N+.6}Z`;
    let defs=`<clipPath id="c${u}t"><path d="${torso}"/></clipPath>`;
    // ---- arms (torso frame) ----
    const shX=X(SK.shX), shY=SK.shY-((pose.shrug&&1)?pose.shrug:0);
    const armW=t=>(4.4-1.3*t+.3*Math.sin(Math.PI*Math.min(1,t*1.6)))*w;
    const armCh=(side,a)=>{const [sa,el]=a;
      if(pose.walk&&!(pose.prop&&side===1)) return chain(V(side*shX,shY),-sa,-el,SK.ua,SK.fa,1);
      return chain(V(side*shX,shY),-sa,el,SK.ua,SK.fa,side);};
    const handUse=(ch,cls)=>`<use class="${cls||''}" href="#kh-hand" transform="translate(${fx(ch.p[2].x)} ${fx(ch.p[2].y)}) scale(${ch.m} 1) rotate(${fx(ch.a2)})"/>`;
    const arm=(side,front)=>{const ch=armCh(side,side===1?pose.armR:pose.armL);
      const skin=limb(ch,0,1,armW,{openEnd:1,contourFrom:front?Math.max(.3,D.sleeve[1]-.02):null});
      const slv=limb(ch,D.sleeve[0],D.sleeve[1],t=>armW(t)+(k.top==='tee'?1.2+2.2*t/.36:1.1)*w,{flatEnd:1,contourFrom:front?(k.top==='tee'?.13:.3):null});
      let s=PATH('f-sk',skin.fill)+PATH(D.slCls,slv.fill);
      if(front) s+=PATH('ct',skin.contour)+PATH('ct',slv.contour)+PATH('ct',slv.cuff);
      // a held thing (o.held: old-scale art around the fist) goes under the hand, so the hand closes over its handle
      if(o.held&&o.held.side===side){const a=ch.a2*Math.PI/180,hx=ch.p[2].x-ch.m*5.5*Math.sin(a),hy=ch.p[2].y+5.5*Math.cos(a);s+=`<g transform="translate(${fx(hx)} ${fx(hy)}) scale(${HS})">${o.held.svg}</g>`;}
      s+=handUse(ch,'')+(front?handUse(ch,'cu'):'');
      if(pose.prop&&side===1) s+=`<use href="#${pose.prop}" transform="translate(${fx(ch.p[2].x)} ${fx(ch.p[2].y+9)})"/>`;
      return s;};
    // ---- legs (world frame) ----
    const legW=t=>(5.6-1.9*t+.45*Math.sin(Math.PI*Math.min(1,Math.max(0,(t-.45)*2))))*w;
    const legCh=(side,a)=>{const [ha,kn]=a;const m=pose.walk?1:side;return chain(V(side*X(SK.hipX),hipY),-ha,kn,SK.thigh,SK.shin,m);};
    const shoeUse=(ch,cls)=>`<use class="${cls||''}" href="#kh-shoe" transform="translate(${fx(ch.p[2].x)} ${fx(ch.p[2].y)}) ${pose.sit?`scale(${-ch.m*.95} .95) rotate(-8)`:`scale(${ch.m} 1) rotate(${fx(ch.a2*.5)})`}"/>`;
    const legPiece=(ch,t0,front)=>{
      const skin=limb(ch,t0,1,legW,{contourFrom:front?Math.max(t0,.18):null,flatStart:t0>0});
      let s=PATH('f-sk',skin.fill);
      if(D.legCov){const c=limb(ch,Math.max(t0,D.legCov[0]),D.legCov[1],t=>legW(t)+(k.low==='shorts'?1.6:1.1)*w,{flatEnd:1,flatStart:t0>0,contourFrom:front?Math.max(t0,.18):null});
        s+=PATH(D.legCls,c.fill)+(front?PATH('ct',c.contour)+PATH('ct',c.cuff):'');}
      s+=shoeUse(ch,'')+(front?PATH('ct',skin.contour)+shoeUse(ch,'cu'):'');
      return s;};
    const chR=legCh(1,pose.legR), chL=legCh(-1,pose.legL);
    // ---- lower garment ----
    let lower='', shinsAfter='';
    const skirtish=k.low==='thobe'||k.low==='skirt';
    if(!skirtish){
      const pel=`M${X(-15)} ${hipY-7}H${X(15)}C${X(16.4)} ${hipY-3} ${X(15.8)} ${hipY+2} ${X(12.5)} ${hipY+5.5}Q0 ${hipY+7.6} ${X(-12.5)} ${hipY+5.5}C${X(-15.8)} ${hipY+2} ${X(-16.4)} ${hipY-3} ${X(-15)} ${hipY-7}Z`;
      lower=PATH('f-lo',pel);
    } else {
      const kR=chR.p[1],kL=chL.p[1],aR=chR.p[2],aL=chL.p[2];
      const Ty=-60+sitY;
      let Hy,hwR,hwL;
      if(pose.sit){Hy=Math.max(kR.y,kL.y)+3;hwR=Math.max(kR.x,kL.x)+5;hwL=Math.min(kR.x,kL.x)-5;}
      else{Hy=hipY+30;const cx=((kR.x+kL.x)/2)*.7+((aR.x+aL.x)/2)*.25;const base=(k.dress?21.5:(k.low==='skirt'?20:19.6))*w;
        const spread=Math.max(0,(Math.abs(kR.x-kL.x)-2*SK.hipX*w))*.35;hwR=cx+base+spread;hwL=cx-base-spread;}
      const tw=X(14.2);
      const sk=`M${-tw} ${Ty}C${r1(-tw-1.6*w)} ${Ty+9} ${r1(hwL+1.2)} ${r1(Hy-11)} ${r1(hwL)} ${r1(Hy-1.6)}Q${r1(hwL)} ${r1(Hy+.8)} ${r1(hwL+3)} ${r1(Hy+.9)}Q${r1((hwL+hwR)/2)} ${r1(Hy+3.4)} ${r1(hwR-3)} ${r1(Hy+.9)}Q${r1(hwR)} ${r1(Hy+.8)} ${r1(hwR)} ${r1(Hy-1.6)}C${r1(hwR-1.2)} ${r1(Hy-11)} ${r1(tw+1.6*w)} ${Ty+9} ${tw} ${Ty}Z`;
      defs+=`<clipPath id="c${u}s"><path d="${sk}"/></clipPath>`;
      const cls=k.low==='thobe'?'f-lo':(k.dress?'f-kc':'f-lo');
      const mid=(hwL+hwR)/2;
      lower=PATH(cls,sk)+`<g clip-path="url(#c${u}s)">${PATH('sh',`M${r1(mid+4)} ${Ty-2}C${r1(mid+7)} ${r1(Hy-16)} ${r1(hwR-4)} ${r1(Hy-6)} ${r1(hwR-3)} ${r1(Hy+6)}L${r1(hwR+10)} ${r1(Hy+6)}L${r1(hwR+10)} ${Ty-2}Z`)}`+
        (k.low==='thobe'?PATH('f-kc',`M${r1(hwL-4)} ${r1(Hy-4.6)}H${r1(hwR+4)}V${r1(Hy+6)}H${r1(hwL-4)}Z`)+PATH('ln d',`M${r1(hwL-2)} ${r1(Hy-4.6)}Q${r1(mid)} ${r1(Hy-3.2)} ${r1(hwR+2)} ${r1(Hy-4.6)}`):'')+`</g>`+
        PATH('ln d',pose.sit?`M${r1(mid-8)} ${r1(Hy-12)}Q${r1(mid-9)} ${r1(Hy-6)} ${r1(mid-7)} ${r1(Hy-1)}`:`M${r1(mid+3.5)} ${Ty+16}Q${r1(mid+5)} ${r1(Hy-12)} ${r1((mid+hwR)/2)} ${r1(Hy-3)}M${r1(mid-5)} ${Ty+20}Q${r1(mid-6)} ${r1(Hy-10)} ${r1((mid+hwL)/2+1)} ${r1(Hy-2)}`)+
        (k.low==='skirt'&&!k.dress?PATH('f-kd d',`M${-tw} ${Ty}H${tw}V${Ty+3}H${-tw}Z`):'');
    }
    // ---- torso deco ----
    let deco='';
    if(k.top==='tee'){
      deco+=PATH('f-kd d',`M${X(-5.4)} ${N+1.2}Q0 ${N+6.4} ${X(5.4)} ${N+1.2}Q0 ${N+3.4} ${X(-5.4)} ${N+1.2}Z`)+PATH('ln d',`M${X(-5.4)} ${N+1.2}Q0 ${N+6.4} ${X(5.4)} ${N+1.2}`);
      if(k.id==='hamood') deco+=`<g class="d">${PATH('f-hl','M0-74.4L1.5-71.2 5-70.8 2.4-68.4 3.1-64.9 0-66.6-3.1-64.9-2.4-68.4-5-70.8-1.5-71.2Z')}</g>`;
      if(k.id==='badr') deco+=`<g class="d">${PATH('f-hl',`M${X(-16)}-66h${X(32)}v3.2h${X(-32)}Z`)}</g>`;
    }
    if(k.top==='long'){
      deco+=PATH('ln d',`M${X(-5.2)} ${N+1}Q0 ${N+5} ${X(5.2)} ${N+1}`);
      if(k.id==='reem') deco+=`<g class="d">${PATH('f-hl',`M${X(-6.2)} ${N+.4}Q-3 ${N+8} 0 ${N+4}Q3 ${N+8} ${X(6.2)} ${N+.4}Q0 ${N+3} ${X(-6.2)} ${N+.4}Z`)}</g>`;
      if(k.id==='sara') deco+=`<g class="d">${Ci('f-kd',0,-74,1.1)+Ci('f-kd',0,-68,1.1)+Ci('f-kd',0,-62,1.1)}</g>`;
      if(k.id==='noura') deco+=PATH('ln d',`M${X(-13)} -45Q0 -43 ${X(13)} -45`);
      if(k.dress) deco+=PATH('ln d',`M${X(-14)} -61Q0 -58.6 ${X(14)} -61`);
    }
    let vest='';
    if(k.top==='vest'){
      const pan=`M${X(-26)} ${N-8}L${X(-6)} ${N-1}L${X(-2.2)} -68L${X(-2.4)} ${hem+4}L${X(-26)} ${hem+4}Z`;
      vest=PATH('f-kc',pan)+PATH('f-kc',pan.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g,(m0,a,b)=>`${r1(-a)} ${b}`));
      deco+=`<g clip-path="url(#c${u}t)">${vest}</g>`;
      deco+=PATH('ln d',`M${X(-7.6)} ${N}L${X(-3.8)} -68L${X(-4)} ${hem}M${X(7.6)} ${N}L${X(3.8)} -68L${X(4)} ${hem}`).replace('class="ln d"','class="ln d" style="stroke:var(--kd);stroke-width:1.9"');
      deco+=PATH('ln d',`M${X(-6)} ${N-.6}L${X(-2.2)} -68L${X(-2.4)} ${hem}M${X(6)} ${N-.6}L${X(2.2)} -68L${X(2.4)} ${hem}`);
      deco+=Ci('f-hl d',0,-78,1)+Ci('f-hl d',0,-72,1);
      defs+=`<clipPath id="c${u}y"><circle cx="${-shX}" cy="${SK.shY}" r="${r1(7.6*w)}"/><circle cx="${shX}" cy="${SK.shY}" r="${r1(7.6*w)}"/></clipPath>`;
    }
    const torsoS=PATH('f-sk',`M-4.6 ${N-7}H4.6V${N+4}H-4.6Z`)+PATH(k.top==='vest'?'f-lo':'f-kc',torso)+deco+(fit.deco?`<g clip-path="url(#c${u}t)">${fit.deco}</g>`:'')+
      `<g clip-path="url(#c${u}t)">${PATH('sh',`M${X(7)} ${N-4}C${X(13)} -70 ${X(12.6)} -58 ${X(9.6)} ${hem+4}L${X(30)} ${hem+4}L${X(30)} ${N-4}Z`)}</g>`;
    const vestTop = (k.top==='vest' ? `<g clip-path="url(#c${u}t)"><g clip-path="url(#c${u}y)">${vest}</g></g>` : '');
    // ---- assemble in draw order ----
    const back=pose.back||[];
    const legOrder = pose.walk ? (Math.sin((o.phase||0)*2*Math.PI)>0?[['R',chR],['L',chL]]:[['L',chL],['R',chR]]) : [['R',chR],['L',chL]];
    let s='';
    back.forEach(n=>{s+=`<g transform="${torsoT}">${arm(n==='armR'?1:-1,false)}</g>`;});
    if(pose.sit&&skirtish){
      legOrder.forEach(([n,ch])=>{s+=legPiece(ch,0,false);});
      s+=lower;
      legOrder.forEach(([n,ch])=>{s+=legPiece(ch,.55,true);});
    } else {
      legOrder.forEach(([n,ch],j)=>{s+=legPiece(ch,0,true);});
      s+=lower;
    }
    s+=`<g transform="${torsoT}">${torsoS}${fit.over||''}`;
    // pose.over: the hands are on the head or the face, so the front arms are drawn after the head (top)
    let top='';['armL','armR'].filter(n=>!back.includes(n)).forEach(n=>{const a=arm(n==='armR'?1:-1,true);if(pose.over)top+=a;else s+=a;});
    s+=vestTop+`</g>`;
    return {s,defs,torsoT,top};
  }
  /* ---------- heads ---------- */
  // head local coordinates: centre (0,0); face rx 22.5 ry 20.5. Eyes sit ~57% down (y=+2.5).
  const FACE=(w=1)=>{const a=r1(22.5*w);return `M0-20.5C${r1(a*.58)}-20.5 ${a}-12.6 ${a} -.6C${r1(a+.4)} 10.6 ${r1(a*.62)} 20.5 0 20.5C${r1(-a*.62)} 20.5 ${r1(-a-.4)} 10.6 ${-a}-.6C${-a}-12.6 ${r1(-a*.58)}-20.5 0-20.5Z`;};
  const EYE_Y=2.6, EYE_X=8.6;

  function headDefs(k,i){
    const id=`kh-k${i}`, fw=k.id==='badr'?1.08:(k.id==='reem'?1.02:1);
    const face=FACE(fw), ex=r1(EYE_X*fw), ax=r1(22.5*fw);
    let back='', front='', over='';
    const ears=`${E('f-sk',r1(-ax+.6),3.4,4.2,4.8)}${E('f-sk',r1(ax-.6),3.4,4.2,4.8)}${P('ln d',`M${r1(-ax-.6)} 1.6Q${r1(-ax-2)} 4 ${-ax} 6M${r1(ax+.6)} 1.6Q${r1(ax+2)} 4 ${ax} 6`)}`;
    const clipF=`${id}-cf`;
    let defs=`<clipPath id="${clipF}"><path d="${face}"/></clipPath>`;
    switch(k.id){
    case 'hamood':
      back=ears+P('f-hr','M-21.6-4C-24-1-23.6 4-21 5.6L-18 1ZM21.6-4C24-1 23.6 4 21 5.6L18 1Z');
      front=P('f-hr','M-20-5.4C-19-2-16.6 0-14.8-.4C-15.6-2-15.6-3.6-15-5ZM-8-7C-7-3.6-3.6-2.6-2-3.4C-3.4-4.6-3.6-6-3.4-7.4Z')+
        // cap crown (two soft seams), button, bill turned a little to his left
        P('f-kc','M-22.4-5.4C-23.4-18.6-13.4-25.6 0-25.6C13.4-25.6 23.4-18.6 22.4-5.4C14-8.6-14-8.6-22.4-5.4Z')+
        `<g clip-path="url(#${id}-cap)">${P('sh','M7-28C13-22 15-14 14-7L28-7L28-28Z')}</g>`+
        P('ln d','M-1-25C-2.6-19-2.6-13-2-8.4M-12-22.6Q-15.4-16-15.6-8',' style="stroke-width:1;opacity:var(--dop,.7)"')+
        `<g class="d">${P('f-hl','M-13-19Q-8-23.4-2-23.8',' style="fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;opacity:var(--dop,.35)"')}</g>`+
        Ci('f-kd',0,-25.6,2)+
        P('f-kc','M-21-7.6C-12-11.6 8-12.6 23-8.6C28.6-7 29.4-2.6 26-1.6C18-4.2 2-5 -10-3.4C-16-2.6-20.4-2.4-22.4-3.6C-24-4.8-23.6-6.6-21-7.6Z')+
        P('f-kd','M-22.4-3.6C-20.4-2.4-16-2.6-10-3.4C2-5 18-4.2 26-1.6C27.4-2 28.2-3 28.4-4C20-5.6 2-6.2-10-5C-16-4.4-20.6-4-22.6-4.6Z');
      defs+=`<clipPath id="${id}-cap"><path d="M-22.4-5.4C-23.4-18.6-13.4-25.6 0-25.6C13.4-25.6 23.4-18.6 22.4-5.4Z"/></clipPath>`;
      // plaster on cheek
      over=`<g class="d" transform="translate(14.6 9.6) rotate(-28)">${P('f-pl','M-4.2-1.8H4.2A1.8 1.8 0 0 1 4.2 1.8H-4.2A1.8 1.8 0 0 1-4.2-1.8Z')}${P('ln','M-1.2-.8V.8M1.2-.8V.8',' style="stroke-width:.7"')}</g>`;
      break;
    case 'saud': { // swappable head part: neat short crop, soft fringe swept to his right (no ghutra, per the owner)
      back=ears+P('f-hr','M-22.8-5C-24.2-.6-23.8 3-22.4 4.4L-20.6-.6ZM22.8-5C24.2-.6 23.8 3 22.4 4.4L20.6-.6Z');
      front=P('f-hr','M-22.4 0C-24-15.4-13.6-23.6 0-23.6C13.6-23.6 24-15.4 22.4 0C21.6-3.6 20.4-6 18.6-7.2C15.6-6 12-6.4 9.4-8.4C6.8-6.6 2.6-6.6-.2-8.8C-3.2-6.8-7.6-7-10.4-9.2C-12.6-7.4-15.8-6.6-18.4-7C-20.2-5.4-21.6-3-22.4 0Z')+
        P('ln d','M-10.4-9.2Q-8.6-13-9.6-17M-.2-8.8Q1.6-12.6 1-16.6M9.4-8.4Q11.4-11.6 11.4-15',' style="stroke-width:.85;opacity:var(--dop,.75)"')+
        `<g class="d">${P('ln','M-12-17.6Q-4-21.6 6-20.6',' style="stroke:#ffffff;opacity:.26;stroke-width:1.7"')}</g>`;
      break;}
    case 'nasser': { // short hair with a small quiff and a side part
      back=ears+P('f-hr','M-22.6-6C-24.4-1-24-3.4-22.4 3.4L-20.4-1ZM22.6-6C24.4-1 24-3.4 22.4 3.4L20.4-1Z');
      front=P('f-hr','M-22.2 0C-24.2-15-14-23.6-3-23.8C-1-28.6 8-30.4 14.4-26.6C19.6-23.6 23.6-15 22.2 0C21.2-4.4 19.4-7.4 16.6-9C12-7.4 4-7.6-3.6-10.8C-9.6-8.2-15.4-6.8-18.6-6.6C-20.4-4.8-21.6-2.6-22.2 0Z')+
        P('ln d','M-3.6-10.8Q-1.4-17-3-23.8M2-12Q6-19 12-24',' style="stroke-width:.9"')+
        `<g class="d">${P('ln','M-14-17Q-9-21.4-4-21.6M4-26Q9-27.6 13-25.4',' style="stroke:#ffffff;opacity:.28;stroke-width:1.6"')}</g>`;
      break;}
    case 'noura': { // straight hair pulled into a high ponytail (hang part) + green headband
      back=ears+P('f-hr','M-23.4 2C-25.4-15-14-25.6 0-25.6C14-25.6 25.4-15 23.4 2C22.8 6 21.8 8.6 20.4 10L-20.4 10C-21.8 8.6-22.8 6-23.4 2Z');
      front=P('f-hr','M-22.8 1C-24.6-15-13.4-23.4 0-23.4C13.4-23.4 24.6-15 22.8 1C21.4-4 19-7.6 15.6-9.6C10-6.4 2-5.4-5.4-7C-9.4-7.6-13-7.8-15.4-7C-18.6-5.6-21.4-2.6-22.8 1Z')+
        P('ln d','M15.6-9.6Q8-13 1-12.4M-5.4-7Q-10-12-15-12.6',' style="stroke-width:.9"')+
        P('f-kc','M-22.6-8.6C-19-20.4 19-20.4 22.6-8.6L21.4-5.2C17.6-15.4-17.6-15.4-21.4-5.2Z')+
        `<g class="d">${P('ln','M-14-14.6Q0-19.8 14-14.6',' style="stroke:#ffffff;opacity:.45;stroke-width:1"')}</g>`;
      break;}
    case 'lulwa': { // wavy shoulder-length hair (back mass is a hang part) + flower clip
      back='';
      front=P('f-hr','M-23.6 6C-25.6-13-14-24.4 0-24.4C14-24.4 25.6-13 23.6 6C23.4 10 24 13 22.6 16.6C20.6 13.4 19.6 9 19.2 4.4C18.6-1.6 16.6-6.6 12.8-9.6C9-6.8 4-7-.4-10.8C-4.6-7-9.6-6.8-13-9.4C-16.6-6.6-18.6-1.6-19.2 4.4C-19.6 9-20.6 13.4-22.6 16.6C-24 13-23.4 10-23.6 6Z')+
        P('ln d','M-.4-10.8Q-1-17-2-22.4M12.8-9.6Q16-6 17.6 0M-13-9.4Q-16-6-17.6 0',' style="stroke-width:.9"')+
        `<g class="d">${P('ln','M-15-15Q-9-20.6-3-21.4M5-21Q11-20 15-16',' style="stroke:#ffffff;opacity:.3;stroke-width:1.6"')}</g>`+
        `<g transform="translate(16.6 -12.4)">${[0,72,144,216,288].map(a=>E('f-wh',0,-3.2,2.5,3.3,` transform="rotate(${a})"`)).join('')}${Ci('f-fc',0,0,1.9)}</g>`;
      break;}
    case 'sara': {
      const hb='M-23.6 4C-26-14-15-25.6 0-25.6C15-25.6 26-14 23.6 4C22.6 12 21 16 19 18H-19C-21 16-22.6 12-23.6 4Z';
      back=ears+P('f-hr',hb);
      front=P('f-hr','M-22.8 4C-24.8-14-14-23 0-23C14-23 24.8-14 22.8 4C21.4-2 18.4-6 14.4-8.4C9.6-6.6 2-6.4-6-9.6C-10.4-6-14.6-4-17-3.8C-19.6-1.6-21.6 1.2-22.8 4Z')+
        P('ln d','M-6-9.6Q2-16 10-21M14.4-8.4Q18-13 20-12',' style="stroke-width:.9"')+
        `<g class="d">${P('ln','M-6-20Q2-23.4 10-20.6',' style="stroke:#ffffff;opacity:.35;stroke-width:1.6"')}</g>`;
      // round glasses (thin frame, lenses not white)
      over=`<g>${Ci('gl',-EYE_X,EYE_Y,5.2)}${Ci('gl',EYE_X,EYE_Y,5.2)}${P('ln','M-3.4 2Q0 .6 3.4 2M-13.8 1.6L-20.6 0M13.8 1.6L20.6 0',' style="stroke-width:1.2"')}${P('ln d','M-11.4 .2L-9.6-1.6M5.8 .2L7.6-1.6',' style="stroke:#fff;opacity:.8;stroke-width:.9"')}</g>`;
      break;}
    case 'reem': {
      const hb='M-23.6 2C-25.6-15-14-25.6 0-25.6C14-25.6 25.6-15 23.6 2C22.6 7 21 10 19 12H-19C-21 10-22.6 7-23.6 2Z';
      back=ears+P('f-hr',hb);
      front=P('f-hr','M-23 1C-24.6-15-13.4-23.2 0-23.2C13.4-23.2 24.6-15 23 1C22-3 20.6-6 18.6-7.8C17.2-6 15-5.4 13-6.2C11.4-4.6 8.4-4.2 6.2-5.6C4-4 .6-4-1.6-5.8C-3.6-4-6.8-4-8.6-5.8C-10.8-4.2-13.6-4.6-15-6.4C-17.4-5.2-19.4-5.6-20.4-7C-21.8-5-22.6-2-23 1Z')+
        `<g class="d">${P('ln','M-8-19Q0-21.6 8-19',' style="stroke:#ffffff;opacity:.3;stroke-width:1.6"')}</g>`;
      over=`<g class="d">${[[-12.6,8.2],[-15.2,7],[-13.8,10.6],[12.6,8.2],[15.2,7],[13.8,10.6]].map(([x,y])=>Ci('fr',x,y,.65)).join('')}</g>`;
      break;}
    case 'badr': {
      back=ears+P('f-hr','M-23.2-6C-25-1-24.4 3-22.6 4.6L-20-2ZM23.2-6C25-1 24.4 3 22.6 4.6L20-2Z');
      front=P('f-hr','M-21-8C-19-5-16-4-12-4.6C-6-5.4 6-5.4 12-4.6C16-4 19-5 21-8Z')+
        P('f-wh','M-22.2-7C-23-19.6-13-26 0-26C13-26 23-19.6 22.2-7C14-10.4-14-10.4-22.2-7Z')+
        `<g clip-path="url(#${id}-tq)">${P('sh','M8-28C14-22 16-14 15-7L28-7L28-28Z')}<g class="d">${[-20.4,-15.6,-11.2].map(y=>P('knit',`M-22 ${y}Q0 ${r1(y-7)} 22 ${y}`,' style="stroke-dasharray:.1 2.4;stroke-width:1.3"')).join('')}</g></g>`+
        P('f-wh','M-22.8-7.4C-14-11.2 14-11.2 22.8-7.4L22.6-4.4C14-8 -14-8-22.6-4.4Z')+P('ln d','M-20-6.2Q0-10 20-6.2',' style="stroke-dasharray:1.2 1.6;stroke-width:.8"');
      defs+=`<clipPath id="${id}-tq"><path d="M-22.2-7C-23-19.6-13-26 0-26C13-26 23-19.6 22.2-7Z"/></clipPath>`;
      over='';
      break;}
    }
    // face base with a soft cel shadow on the far cheek and under the hat
    const faceG=`${P('f-sk',face)}<g clip-path="url(#${clipF})">${P('sh',`M${r1(ax*.55)}-22C${r1(ax*1.02)}-10 ${r1(ax*.98)} 10 ${r1(ax*.36)} 23L40 23L40-22Z`)}</g>`;
    defs+=`<g id="${id}-hb">${back}</g><g id="${id}-hf">${faceG}</g><g id="${id}-ht">${front}</g><g id="${id}-ho">${over}</g>`;
    return defs;
  }

  /* ---------- faces: eyes, brows, mouth swap by expression ---------- */
  function features(k,expr,turn=0){
    const fw=k.id==='badr'?1.08:1, ex=r1(EYE_X*fw), t=turn, ey=EYE_Y;
    let s='';
    const eye=(x,y,sx=1,sy=1)=>`${E('ink',x,y,r1(2.3*sx),r1(3*sy))}${Ci('hl',r1(x+.8),r1(y-1.1),.85)}`;
    const happyEye=(x,y)=>P('ln eye',`M${x-2.6} ${y+.8}Q${x} ${y-2.6} ${x+2.6} ${y+.8}`);
    const brow=(x,y,rot,len=2.6)=>P('ln br',`M${r1(x-len)} ${y}Q${x} ${r1(y-1.4)} ${r1(x+len)} ${y}`,` transform="rotate(${rot} ${x} ${y})"`);
    const L=-ex+t, R=ex+t;
    // brows per personality
    const bset={cheeky:[[-6,4],[6,-12]],calm:[[0,0],[0,0]],soft:[[4,-2],[-4,2]],happy:[[6,-6],[-6,6]],steady:[[-4,6],[4,-6]]}[k.brow];
    let by=-4.4, by2=null, b=bset, eyes='', mouth='';
    const my=11.4;
    if(expr==='normal'){
      if(k.id==='saud') eyes=P('ink',`M${L-2.6} ${ey-.4}Q${L} ${ey-1.4} ${L+2.6} ${ey-.4}Q${L+2.4} ${ey+3} ${L} ${ey+3}Q${L-2.4} ${ey+3} ${L-2.6} ${ey-.4}ZM${R-2.6} ${ey-.4}Q${R} ${ey-1.4} ${R+2.6} ${ey-.4}Q${R+2.4} ${ey+3} ${R} ${ey+3}Q${R-2.4} ${ey+3} ${R-2.6} ${ey-.4}Z`)+Ci('hl',L+.9,ey+.8,.7)+Ci('hl',R+.9,ey+.8,.7);
      else eyes=eye(L,ey)+eye(R,ey);
      mouth = k.id==='hamood' ? P('ln mo',`M${t-3.6} ${my-.4}Q${t+.4} ${my+2.6} ${t+4} ${my-1.6}`)
            : k.id==='nasser' ? P('ln mo',`M${t-3} ${my}Q${t} ${my+1.8} ${t+3} ${my}`)
            : P('ln mo',`M${t-3.2} ${my-.6}Q${t} ${my+2.6} ${t+3.2} ${my-.6}`);
    } else if(expr==='eager'){
      eyes=eye(L,ey-.2,1.12,1.12)+eye(R,ey-.2,1.12,1.12)+Ci('hl',L-.9,ey+1.2,.45)+Ci('hl',R-.9,ey+1.2,.45);
      b=[[-8,-2],[8,2]].map((v,j)=>[v[0]+(bset[j][0]*.3),0]); by=-6.4;
      mouth=P('f-mo',`M${t-3.6} ${my-1.4}Q${t} ${my-.6} ${t+3.6} ${my-1.4}Q${t+3} ${my+3.6} ${t} ${my+3.6}Q${t-3} ${my+3.6} ${t-3.6} ${my-1.4}Z`)+P('f-tg',`M${t-1.8} ${my+2.6}Q${t} ${my+1.2} ${t+1.8} ${my+2.6}Q${t} ${my+3.6} ${t-1.8} ${my+2.6}Z`);
    } else if(expr==='sad'){
      eyes=`${E('ink',L,ey+.8,2.1,2.5)}${E('ink',R,ey+.8,2.1,2.5)}${Ci('hl',L+.7,ey,.6)}${Ci('hl',R+.7,ey,.6)}`;
      b=[[-16,0],[16,0]]; by=-3.4;
      mouth=P('ln mo',`M${t-3} ${my+1.4}Q${t} ${my-1.2} ${t+3} ${my+1.4}`);
      s+=P('f-tear d',`M${R+3.6} ${ey+3}q-1.4 2.4 0 3.2q1.4-.8 0-3.2z`);
    } else if(expr==='win'){
      eyes=happyEye(L,ey)+happyEye(R,ey);
      b=[[8,0],[-8,0]]; by=-6.6;
      mouth=P('f-mo',`M${t-4.6} ${my-2}Q${t} ${my-1} ${t+4.6} ${my-2}Q${t+4} ${my+4.6} ${t} ${my+4.6}Q${t-4} ${my+4.6} ${t-4.6} ${my-2}Z`)+
        (k.id==='reem'?P('f-wh',`M${t-3.6} ${my-1.6}Q${t} ${my-1} ${t+3.6} ${my-1.6}L${t+3.2} ${my}H${t+.8}V${my-1.1}H${t-.8}V${my}H${t-3.2}Z`):P('f-wh',`M${t-3.8} ${my-1.7}Q${t} ${my-1} ${t+3.8} ${my-1.7}L${t+3.4} ${my-.2}Q${t} ${my+.4} ${t-3.4} ${my-.2}Z`))+
        P('f-tg',`M${t-2.4} ${my+3.4}Q${t} ${my+1.6} ${t+2.4} ${my+3.4}Q${t} ${my+4.8} ${t-2.4} ${my+3.4}Z`);
    } else if(expr==='surp'){ // caught out: round eyes, brows up high, a small round mouth
      eyes=eye(L,ey-.3,1.16,1.18)+eye(R,ey-.3,1.16,1.18);
      b=[[-6,0],[6,0]]; by=-7.6;
      mouth=E('f-mo',t,my+.8,2.3,2.9);
    } else if(expr==='think'){ // thinking: eyes up to one side, one brow up, the mouth pushed aside
      eyes=eye(r1(L+1.1),ey-.7)+eye(r1(R+1.1),ey-.7);
      b=[[-12,0],[6,0]]; by2=[-6.8,-4.2];
      mouth=P('ln mo',`M${t-1.6} ${my+.6}Q${t+1.2} ${my-.4} ${t+3.6} ${my-.6}`);
    }
    const brows=brow(L,by2?by2[0]:by,b[0][0])+brow(R,by2?by2[1]:by,b[1][0]);
    const blush=E('bl',-ex-4.6+t*.6,8.4,3.6,2.2)+E('bl',ex+4.6+t*.6,8.4,3.6,2.2);
    let extra='';
    if(k.id==='badr'&&expr!=='sad') extra+=P('ln d',`M${t+6.6} ${my-1.6}q.9.5.6 1.5`,' style="stroke-width:.8;opacity:var(--dop,.7)"'); // dimple
    if(k.id==='noura'&&expr!=='win') extra+=P('ln d',`M${L-2.6} ${ey-1.8}l-1.4-1M${R+2.6} ${ey-1.8}l1.4-1`,' style="stroke-width:.9"'); // lashes
    if(k.id==='lulwa'&&expr!=='win') extra+=P('ln d',`M${L-2.6} ${ey-1.8}l-1.2-1.2M${R+2.6} ${ey-1.8}l1.2-1.2`,' style="stroke-width:.9"');
    const nose=P('ln d',`M${t-.8} ${7.2}q.8.6 1.6 0`,' style="stroke-width:.9;opacity:var(--dop,.6)"');
    return blush+eyes+brows+nose+mouth+extra+s;
  }

  function hangDefs(k,i){
    const id=`kh-k${i}`;
    if(k.id==='sara') return `<g id="${id}-braid">${[0,6.4,12.8].map((y,j)=>E('f-hr',0,y+3,4.4-j*.4,4))}${P('ln d','M-3 3.4Q0 6 3 3.4M-3 9.8Q0 12.4 3 9.8',' style="stroke-width:.8"')}${E('f-kc',0,19.6,3.2,2)}${P('f-hr','M-2.4 20.6C-3.4 24-1.6 27 0 27.6C1.6 27 3.4 24 2.4 20.6Z')}</g>`;
    if(k.id==='noura') return `<g id="${id}-pony">${P('f-hr','M-3-3C3-6 9-3 10 4C11.6 12 9.6 22 6.6 30C5.4 33 3 34.4 1 33.4C3.4 27 4.4 20 3 12C2 6-.6 3-4 1.6Z')}${P('ln d','M4 6Q7 16 4.4 27',' style="stroke-width:.8"')}${E('f-kc',-1,-.4,3.6,3,' transform="rotate(30 -1 -.4)"')}</g>`;
    if(k.id==='lulwa') return `<g id="${id}-back">${P('f-hr','M-24.6 0C-26-16-14-26 0-26C14-26 26-16 24.6 0C25.6 8 28.6 14 27.6 21C26.8 25.6 23.6 27.4 20.6 26C19 29 14.8 29.6 12.6 27.4C10.2 29.6 5 29.6 2.4 27.4H-2.4C-5 29.6-10.2 29.6-12.6 27.4C-14.8 29.6-19 29-20.6 26C-23.6 27.4-26.8 25.6-27.6 21C-28.6 14-25.6 8-24.6 0Z')}${P('ln d','M-22 10Q-24.4 18-21 24M22 10Q24.4 18 21 24',' style="stroke-width:.9"')}</g>`;
    if(k.id==='reem') return `<g id="${id}-tail">${P('f-hr','M-2-2C-8 0-10 8-8 15C-6.6 19-3.6 21.4-1 21C-3 16-2 10 1 4C2.4 1 1-2.6-2-2Z')}${P('ln d','M-5 4Q-7 10-5 16',' style="stroke-width:.8"')}</g><g id="${id}-bow">${P('f-kc','M0 0L-5.6-3.6C-7-4.2-7.6-3-7.6-1.6V1.6C-7.6 3-7 4.2-5.6 3.6ZM0 0L5.6-3.6C7-4.2 7.6-3 7.6-1.6V1.6C7.6 3 7 4.2 5.6 3.6Z')}${Ci('f-kd',0,0,1.8)}</g>`;
    return '';
  }
  // the paint: one class a colour role, each fill falls back to the outline colour (--o) in the outline pass
  const RIGCSS=`.kr{--sw:4.6;--cw:3;--iw:1.3}.kr-bo,.kr-sil{--o:${INK};stroke:${INK};stroke-width:var(--sw);stroke-linejoin:round;stroke-linecap:round;--dop:0;--cuo:0}`+
    `.kr-ol{--o:${INK};stroke:${INK};stroke-width:var(--cw);stroke-linejoin:round;--dop:0}.kr-ct{fill:none;stroke:${INK};stroke-width:var(--iw);stroke-linecap:round;stroke-linejoin:round;opacity:var(--dop,1)}`+
    `.kr-cu{--o:none;stroke:${INK};stroke-width:var(--iw);stroke-linejoin:round;--dop:0;opacity:var(--cuo,1)}.kr-gnd{fill:${INK};opacity:.12}`+
    [['f-sk','var(--ks)'],['f-kc','var(--kc)'],['f-kd','var(--kd)'],['f-sl','var(--sl)'],['f-lo','var(--lo)'],['f-lg','var(--lg)'],['f-hr','var(--hr)'],['f-wh','#FBFCFD'],['f-shoe','var(--shoe)'],['f-shoeA','var(--shoeA)'],
     ['f-pl','#F7DDB4'],['f-tq','#FBFCFD'],['f-fc','#F4C542'],['f-mo','#7A2E3A'],['f-tg','#F08A8A'],['f-tear','#8FD0F5'],['ink',INK],['hl','#FFFFFF']].map(([c,v])=>`.kr-${c}{fill:var(--o,${v})}`).join('')+
    `.kr-f-hl{fill:var(--o,#FFFFFF);opacity:var(--dop,.9)}.kr-bl{fill:#F2797B;opacity:var(--dop,.32)}.kr-fr{fill:#B9714E;opacity:var(--dop,.55)}.kr-sh{fill:var(--o,${INK});opacity:var(--dop,.13)}`+
    `.kr-ln{fill:none;stroke:${INK};stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;opacity:var(--dop,1)}.kr-br{stroke-width:1.7}.kr-mo{stroke-width:1.5}.kr-eye{stroke-width:1.8}`+
    `.kr-knit{fill:none;stroke:#C9D3DD;stroke-width:.9;stroke-linecap:round;opacity:var(--dop,1)}.kr-gl{fill:var(--o,#FFFFFF);fill-opacity:var(--dop,.18);stroke:${INK};stroke-width:1.3}`;
  // the rig's markup names its classes short (P('f-sk',…)); they get the kr- prefix once, when a template is made
  const KR=s=>s.replace(/class="([^"]*)"/g,(m,c)=>`class="${c.split(' ').filter(Boolean).map(x=>/^kr-/.test(x)?x:'kr-'+x).join(' ')}"`);
  // the shared parts: the mitten hand (wrist at 0,0, pointing down), the shoe (ankle at 0,0, toe to +x), the avatar circle
  let RB=null;const RIGBASE=()=>RB||(RB=KR(`<g id="kh-hand">${P('f-sk','M-3.2-.6C-4.2 1-4.4 2.4-4.6 3.2C-6.6 3-7.4 4.8-6.2 6.2C-5.4 7-4.6 7.2-4.2 7.4C-3.6 9.4-1.6 10.8.6 10.8C3.2 10.8 4.6 8.6 4.6 6.2C4.6 3 3.6.6 1.2-.6C-.6-1.2-2.4-1.2-3.2-.6Z')}${P('ln d','M-4.3 4.2Q-3.1 5.3-3.7 6.9M1.6 8Q3 7.4 3.4 5.8',' style="stroke-width:.9"')}</g>`+
    `<g id="kh-shoe">${P('f-shoe','M-4.6-1.8C-5.8 1.4-5.6 4.8-3.8 6C-.8 7.4 5.4 7.4 8.2 6C10 5 9.6 2 7.4.6C5.6-.4 4-1 3.2-3Z')}${P('f-shoeA','M-5.2 3.6C-5 4.8-4.6 5.4-3.8 6C-.8 7.4 5.4 7.4 8.2 6C9 5.6 9.4 5 9.6 4.2C6 5.6-1.6 5.6-5.2 3.6Z')}${P('ln d','M1.6-1Q4-.2 5 1.8',' style="stroke-width:.9"')}</g>`)+
    `<clipPath id="kh-avc"><circle cy="-1" r="16.5"/></clipPath>`);
  const KD=[],KIDDEFS=i=>KD[i]||(KD[i]=KR(headDefs(CAST[i],i)+hangDefs(CAST[i],i)));
  // a colour a little darker (the shirt's shade when a player's colour is not the kid's own)
  const dark=(c,k=.8)=>{const m=/^#([0-9a-f]{6})$/i.exec(String(c));if(!m)return c;const n=parseInt(m[1],16);
    return '#'+[16,8,0].map(b=>Math.round(((n>>b)&255)*k).toString(16).padStart(2,'0')).join('');};
  // the colours of one kid in a player's colour c (CSS custom properties, inherited by the template)
  const vars=(w,c)=>{const k=CAST[w],kc=c||k.c;return `--kc:${kc};--kd:${kc===k.c?k.cd:dark(kc)};--ks:${k.skin};--hr:${k.hair};--lo:${k.low==='thobe'?'#E9EEF4':k.lowc};--lg:${k.legc||k.lowc};--sl:${k.top==='vest'?'#E9EEF4':kc};--shoe:${k.shoe};--shoeA:${k.shoeA}`;};

  /* poses. Arms [shoulder angle out from hanging, elbow bend], legs [hip angle out, knee bend]; R is the viewer's right (the
     hand that holds things). head tilts the head, turn moves the face, torso leans, back draws an arm behind the body, sit
     folds the legs. Some are solved from where the wrist should be (ik), so the hands land on the chin, the eyes, the head */
  const ik=(tx,ty,out=1)=>{const L1=SK.ua,L2=SK.fa,d=Math.min(L1+L2-.5,Math.max(Math.abs(L1-L2)+.5,Math.hypot(tx,ty))),ph=Math.atan2(tx,ty),
    g=Math.acos((L1*L1+d*d-L2*L2)/(2*L1*d)),a=ph+out*g,ex=L1*Math.sin(a),ey=L1*Math.cos(a),b=Math.atan2(tx-ex,ty-ey),D=180/Math.PI;return [r1(a*D),r1((a-b)*D)];};
  // a wrist target in rig units (x on the kid's own side, so one target serves both hands) from the shoulder
  const at=(x,y,out)=>ik(x-SK.shX,y-SK.shY,out);
  const HOLD=[30,-74];
  const POSES={
    stand:{armR:[15,6],armL:[15,6],legR:[2,0],legL:[2,0]},
    wave:{armR:[118,-62],armL:[9,10],legR:[3,0],legL:[1,0],head:-4,torso:-2,expr:'eager'},
    cheer:{armR:[140,-8],armL:[140,-8],legR:[7,0],legL:[7,0],bob:-2,expr:'win',shrug:2},
    hold:{armR:HOLD,armL:[15,6],legR:[3,0],legL:[3,0],head:5,expr:'eager'},
    sad:{armR:[8,14],armL:[8,14],legR:[1,0],legL:[1,0],head:8,torso:2,expr:'sad'},
    caught:{over:1,armR:at(20,-118,-1),armL:at(20,-118,-1),legR:[5,0],legL:[5,0],head:0,expr:'surp',shrug:2},
    think:{armR:at(7,-79,1),armL:[12,8],legR:[2,0],legL:[3,0],head:5,turn:2,expr:'think'},
    count:{over:1,armR:at(12,-103,-1),armL:at(12,-103,-1),legR:[2,0],legL:[2,0],head:6,expr:'normal'},
    torch:{armR:at(36,-66,-1),armL:[12,14],legR:[9,4],legL:[-3,10],torso:-3,head:-3,turn:2},
    sit:{armR:[18,52],armL:[18,52],legR:[76,158],legL:[76,158],sit:1},
    situp:{armR:[150,-10],armL:[18,52],legR:[76,158],legL:[76,158],sit:1,expr:'eager'},
    sitcheer:{armR:[140,-8],armL:[140,-8],legR:[76,158],legL:[76,158],sit:1,expr:'win',shrug:2},
    sitlook:{over:1,armR:at(22,-117,-1),armL:[18,52],legR:[76,158],legL:[76,158],sit:1,head:-7,turn:-3,expr:'surp'}};
  function walkPose(p){const s=Math.sin(p*2*Math.PI),c=Math.cos(p*2*Math.PI),lift=v=>Math.max(0,v);
    return {walk:1,turn:3,legR:[-16*s,28*lift(s)+5],legL:[16*s,28*lift(-s)+5],armR:[16*s+8,18],armL:[-16*s-8,18],bob:-Math.abs(c)*2,torso:3,head:-2+s*1.5,back:[s>0?'armR':'armL']};}
  POSES.walk=walkPose(.2);
  const POSE_MOOD={cheer:'win',caught:'surp',sad:'sad',think:'think',count:'normal',wave:'eager',sitcheer:'win',sitlook:'surp',situp:'eager'};
  // the hand a held thing goes in: the right one, except a thinker's (that one is on the chin)
  const HELD_SIDE={think:-1};

  const HANG={ // hair that hangs from the head: [layer, part, x, y, rest angle, swing amount, mirror]
    sara:[['F','braid',-17,10,12,1]],reem:[['B','tail',-21,-6,20,1],['B','tail',21,-6,20,-1,1]],noura:[['B','pony',17,-14,-8,1]],lulwa:[['B','back',0,0,0,0]]};
  const hangStr=(k,id,layer)=>(HANG[k.id]||[]).filter(h=>h[0]===layer).map(h=>`<g transform="translate(${h[2]} ${h[3]})${h[6]?' scale(-1 1)':''} rotate(${h[4]})"><use href="#${id}-${h[1]}"/></g>`).join('');
  const three=c=>`<use class="kr-sil" href="#${c}"/><use class="kr-ol" href="#${c}"/><use href="#${c}"/>`,two=c=>`<use class="kr-bo" href="#${c}"/><use href="#${c}"/>`;
  // a head's own parts (and a hat: old head coordinates, a head of radius 11, drawn 2.05 times over this head and a little up)
  const headIn=(w,expr,turn,hat)=>{const k=CAST[w],id=`kh-k${w}`;return `<use href="#${id}-hb"/><use href="#${id}-hf"/><g>${KR(features(k,expr,turn))}</g><use href="#${id}-ht"/><use href="#${id}-ho"/>`+
    (k.id==='reem'?`<use href="#${id}-bow" transform="translate(-19 -10) rotate(-20)"/><use href="#${id}-bow" transform="translate(19 -10) rotate(20)"/>`:'')+(hat?`<g transform="translate(0 -3.4) scale(2.05)">${hat}</g>`:'');};
  let UID=0;
  /* one kid in rig units: the body for the pose, the outfit (fit: {k: clothes, v: colours, deco: on the shirt, over: over the
     body}), a thing held (held: {side, svg}) and a hat. Its own clip paths and parts sit in its <defs> */
  function rigKid(w,o){const K0=CAST[w],fit=o.fit||{},k=fit.k?{...K0,...(typeof fit.k==='function'?fit.k(K0):fit.k)}:K0,u='kh'+(++UID);
    let pose=POSES[o.pose]||POSES.stand;if(o.held&&o.pose==='stand')pose={...pose,armR:HOLD};
    const expr=o.expr||pose.expr||'normal',turn=pose.turn||0,B=bodyMarkup(k,pose,u,{phase:.2,fit,held:o.held});
    const headT=`${B.torsoT} translate(0 ${SK.neckY}) rotate(${pose.head||0}) translate(0 ${SK.head})`,id=`kh-k${w}`;
    const hb=hangStr(k,id,'B'),hf=hangStr(k,id,'F');
    // the body is written once and used twice (outline pass, then fill pass)
    let defs=B.defs+`<g id="u${u}s">${B.s}</g>`+(B.top?`<g id="u${u}t" transform="${B.torsoT}">${B.top}</g>`:'')+`<g id="u${u}h" transform="${headT}">${headIn(w,expr,turn,o.hat)}</g>`;
    if(hb)defs+=`<g id="u${u}b" transform="${headT}">${hb}</g>`;if(hf)defs+=`<g id="u${u}f" transform="${headT}">${hf}</g>`;
    const gnd=`<ellipse class="gnd" cy="1" rx="${pose.sit?34:r1(20*k.w)}" ry="3.6"/>`,sc=k.small||1;
    // the outfit's colours (fit.v) are for the clothes only: the head keeps its own (a headband, a cap, bows in the kid's colour)
    const cv=x=>fit.v?`<g style="${fit.v}">${x}</g>`:x;
    return `<defs>${KR(defs)}</defs>`+KR(gnd)+`<g transform="${sc!==1?`scale(${sc}) `:''}translate(0 ${r1(pose.bob||0)})">${hb?three(`u${u}b`):''}${cv(two(`u${u}s`))}${three(`u${u}h`)}${hf?three(`u${u}f`):''}${B.top?cv(two(`u${u}t`)):''}</g>`;}
  // a head alone, centred at 0,0 in rig units (body: the shoulders under it too, for a round avatar)
  function rigHead(w,o){const k=CAST[w],id=`kh-k${w}`,u='kh'+(++UID),hb=hangStr(k,id,'B'),hf=hangStr(k,id,'F');
    const B=o.body?bodyMarkup(k,POSES.stand,u):null;
    let defs=(B?B.defs+`<g id="h${u}s" transform="translate(0 ${-(SK.neckY+SK.head)})">${B.s}</g>`:'')+`<g id="h${u}">${headIn(w,o.expr||'normal',0,o.hat)}</g>`;if(hb)defs+=`<g id="h${u}b">${hb}</g>`;if(hf)defs+=`<g id="h${u}f">${hf}</g>`;
    return `<defs>${KR(defs)}</defs>${hb?three(`h${u}b`):''}${B?two(`h${u}s`):''}${three(`h${u}`)}${hf?three(`h${u}f`):''}`;}

  /* ---------------- the wardrobe ----------------
     An outfit is clothes on the rig, not a sticker: {k: the kind of top/bottom (top tee|long|vest, low shorts|pants|skirt|
     thobe; an object, or a function of the kid), v: colours (CSS custom properties: --kc shirt, --kd its shade, --sl sleeves,
     --lo trousers or thobe; a string, or a function of the kid), deco: drawn on the shirt (clipped to it), over: drawn over the
     body under the front arms}. All in rig units: the neck at 0,-88, shoulders at ±14,-83, the shirt's hem near y -46, the
     hips at -48, knees near -27, ankles near -8. cl(d,fill) is a piece of cloth (its fill joins the outline pass, so it gets
     the kid's outline), ln(d) a thin seam */
  const cl=(d,fill)=>`<path style="fill:var(--o,${fill})" d="${d}"/><path class="ln" d="${d}"/>`,ln=(d,w)=>`<path class="ln" d="${d}"${w?` style="stroke-width:${w}"`:''}/>`;
  // a path mirrored left to right (absolute M/L/C/Q points only)
  const mir=d=>d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g,(m,a,b)=>`${r1(-a)} ${b}`);
  const WHITE='--kc:#FAFBFD;--kd:#D5DEE8;--sl:#FAFBFD';
  const OUTFIT={
    apron:{over:cl('M-12.6 -79H12.6L14 -31Q0 -27.6 -14 -31Z','#FFFFFF')+ln('M-10.6 -79L-6.4 -89.4M10.6 -79L6.4 -89.4',1.6)+ln('M-6 -58h12v7.6h-12z')},
    sport:{k:K=>({top:'tee',low:K.g==='g'?'pants':'shorts'}),v:K=>K.low==='skirt'?'--lo:#3D5C8C':'',deco:cl('M-22 -67h44v4.4h-44z','#FFFFFF')+`<text y="-71" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">10</text>`},
    dealer:{deco:cl('M-22 -92L-5.6 -88L-2.4 -66L-2.4 -38L-22 -38Z','#1F2A40')+cl(mir('M-22 -92L-5.6 -88L-2.4 -66L-2.4 -38L-22 -38Z'),'#1F2A40'),over:cl('M0 -85.6L-6 -89V-82.2ZM0 -85.6L6 -89V-82.2Z','#B23A3A')},
    thobe:{k:K=>K.g==='b'?{top:'long',low:'thobe'}:{top:'long'},v:K=>WHITE+(K.g==='b'?';--lo:#F4F7FA':''),deco:ln('M0 -86.4v15')},
    // a quiz host's jacket, white shirt and bow tie
    host:{k:{top:'long'},v:'--kc:#2D3A5C;--kd:#222C47;--sl:#2D3A5C',deco:cl('M-6.6 -89L0 -64L6.6 -89Z','#FFFFFF'),over:cl('M0 -84.6L-6 -88V-81.2ZM0 -84.6L6 -88V-81.2Z','#EC6158')},
    // a detective's trench coat (المافيا)
    coat:{k:{top:'long'},v:'--kc:#C9A16E;--kd:#A9824F;--sl:#C9A16E',deco:cl('M-22 -56h44v4.6h-44z','#8A6A4A')+ln('M-7.6 -88L0 -74L7.6 -88M0 -74V-40',1.4),
      over:cl('M-15.6 -52L-19.6 -25Q0 -21.4 19.6 -25L15.6 -52Z','#C9A16E')+ln('M0 -50V-23.6',1.2)},
    // a karate gi with a black belt (fights)
    gi:{k:{top:'long',low:'pants'},v:WHITE+';--lo:#F2F5F9',deco:ln('M-8 -88.6L7 -62M8 -88.6L-1 -74',1.4),over:cl('M-15.6 -54H15.6V-49H-15.6Z','#2A2F45')+`<path d="M4 -50l3 10M4 -50l-2 10" stroke="#2A2F45" stroke-width="2.6" stroke-linecap="round"/>`},
    // an open lab coat (science)
    lab:{k:{top:'long'},v:'--sl:#FAFBFD',over:cl('M-17.4 -86C-13 -89 -9 -89 -6.4 -87.6L-3.4 -62L-4.4 -30L-19.4 -30Z','#FAFBFD')+cl(mir('M-17.4 -86C-13 -89 -9 -89 -6.4 -87.6L-3.4 -62L-4.4 -30L-19.4 -30Z'),'#FAFBFD')+
      ln('M7.4 -72h7v6h-7z')+`<path d="M9.6 -75v6" stroke="#2F80ED" stroke-width="1.6" stroke-linecap="round"/>`},
    // a painter's smock with paint drops (drawing games)
    smock:{over:cl('M-15.6 -84Q0 -79 15.6 -84L18.6 -35Q0 -31 -18.6 -35Z','#F4F6FA')+`<circle cx="-7" cy="-66" r="2.6" fill="#EC6158"/><circle cx="5" cy="-56" r="2.6" fill="#4AB1E8"/><circle cx="-2" cy="-45" r="2.6" fill="#F0B429"/>`},
    // a sailor collar (ships)
    sailor:{deco:cl('M-19 -89L0 -68L19 -89L21 -78L0 -60L-21 -78Z','#2F80ED')+`<path d="M-15.4 -84.6L0 -67M15.4 -84.6L0 -67" fill="none" stroke="#fff" stroke-width="1.4"/>`+cl('M-3 -66l3 5 3-5z','#EC6158')}};
  // an outfit made as a picture in the old sticker frame (torso y -36..-15, x ±10) still fits on the shirt
  const oldFit=s=>({over:`<g transform="translate(0 -16) scale(1.6 2)">${s}</g>`});
  /* accessories. h: held in a hand, drawn around the fist at 0,0 in the old kid scale (the hand closes over it); H: on the
     head, in old head coordinates (a head of radius 11 at 0,0); o: on the clothes (rig units, like an outfit's over: a
     stethoscope, a camera on the chest); b: on the body, in kid coordinates (KH.kid's own units, e.g. a ball at the feet).
     One accessory may have several (a chef's hat and his spatula) */
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
    buzzer:`<rect x="-6.4" y="-8" width="12.8" height="7" rx="2" fill="#2D4763"${s2(1.3)}/><path d="M-4.6 -8.4a4.6 3.4 0 0 1 9.2 0z" fill="#EC6158"${s2(1.2)}/>`,
    // cards fanned in the hand
    cards:`<g transform="translate(-14 20)"><rect x="10" y="-26" width="8" height="11" rx="1.5" fill="#fff"${s2(1.2)} transform="rotate(12 14 -20)"/><rect x="13" y="-26" width="8" height="11" rx="1.5" fill="#fff"${s2(1.2)} transform="rotate(26 17 -20)"/><path d="M17 -21l1.2 2 2-.8z" fill="#EC6158"/></g>`,
    // a falconer's glove with the falcon on it
    glove:`<path d="M-4.6 1.4l-1.6 7h12.4l-1.6-7z" fill="#8A6A4A"${s2(1.2)}/><path d="M-3.6 -3q-1-7 4.4-9.6q5.6 1.4 4.6 9.6q-4.4 2-9 0z" fill="#9A7350"${s2(1.2)}/><circle cx="1.6" cy="-14.4" r="3.4" fill="#9A7350"${s2(1.2)}/><path d="M4.6 -14.4l2.6 1-2.4 1.2z" fill="#F0B429"${s2(.9)}/><circle cx="2.4" cy="-15" r=".8" fill="${OL}"/><path d="M-2 -6q2 2 5 0" fill="none" stroke="#6E5038" stroke-width="1"/>`,
    // the seeker's torch (غميضة الحارة), pointing ahead
    torch:`<g transform="rotate(-24)"><rect x="-2.6" y="-2.3" width="9.6" height="4.6" rx="1.6" fill="#5D6E86"${s2(1.1)}/><rect x="6.6" y="-3.6" width="3.4" height="7.2" rx="1.2" fill="#F0B429"${s2(1.1)}/></g>`};
  const HEAD={
    chefhat:`<path d="M-8 -9v-4q-5-1-4-6t6-3q2-5 6-5t6 5q5-2 6 3t-4 6v4z" fill="#fff"${s2(1.3)}/>`,
    crown:`<path d="M-8.6 -10l-1.6-9 5 4.4L0 -21.4l5.2 6.8 5-4.4-1.6 9z" fill="#F0B429"${s2(1.3)}/><circle cy="-13.4" r="1.5" fill="#EC6158"/><path d="M-8 -11.6h16" stroke="#C98F0E" stroke-width="1.2"/>`,
    fedora:`<path d="M-15 -7.6q15-4.4 30 0q-2 2.6-15 2.6t-15-2.6z" fill="#3A3446"${s2(1.2)}/><path d="M-9 -8.4q-1-9.6 9-10.2q10 .6 9 10.2q-9-2.4-18 0z" fill="#3A3446"${s2(1.3)}/><path d="M-9 -10.6q9-2.6 18 0" stroke="#B23A3A" stroke-width="2"/>`,
    bulb:`<g transform="translate(14 -19)"><path d="M-7 -5l-2-1.6M7 -5l2-1.6M0 -7.6v-2.6" stroke="#F0B429" stroke-width="1.4" stroke-linecap="round"/><circle r="4.8" fill="#FFE38A"${s2(1.2)}/><rect x="-2" y="4" width="4" height="3" rx=".8" fill="#9FB3C8"${s2(1)}/></g>`,
    helmet:`<path d="M-12.6 -1q0-13 12.6-13t12.6 13z" fill="${kc}"${s2(1.4)}/><path d="M-12.6 -1H6l8 2.4" fill="none"${s2(1.4)}/><path d="M0 -14v13" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`};
  const ACC={ball:{b:`<circle cx="13" cy="-5" r="5.4" fill="#fff"${s2(1.3)}/><path d="M10.2 -7.8l2.8 2.8 2.8-2.8M13 -5v4.6" fill="none" stroke="${OL}" stroke-width="1"/>`}};
  for(const k in HELD)ACC[k]={h:HELD[k]};
  for(const k in HEAD)ACC[k]={H:HEAD[k]};
  const ACC_AT=k=>{const a=ACC[k];return !a?null:a.H&&!a.h&&!a.b&&!a.o?'H':a.h?'h':'b';};
  const OTHERS={
    sil:`<path d="M-9.7 6.5A11 11 0 1 1 9.7 6.5Z" fill="#0B1222" stroke="#FFE38A" stroke-width="1.6"/><ellipse cx="-4" cy="1.5" rx="2.4" ry="2.8" fill="#FFE38A"/><ellipse cx="4" cy="1.5" rx="2.4" ry="2.8" fill="#FFE38A"/><circle cx="-11" cy="6.5" r="3.4" fill="#0B1222"/><circle cx="11" cy="6.5" r="3.4" fill="#0B1222"/>`,
    mom:`<ellipse rx="12" ry="3" fill="#000" opacity=".3"/><path d="M-10 0q-2-28 10-30q12 2 10 30z" fill="#2A2F45"${s2(1.6)}/><circle cy="-38" r="9.5" fill="#2A2F45"${s2(1.6)}/><ellipse cy="-37" rx="6" ry="6.8" fill="#E0A577"/><path d="M-3.4 -38.5q1.2-1.4 2.4 0M1 -38.5q1.2-1.4 2.4 0" fill="none"${s2(1.2)}/><ellipse cy="-33.8" rx="1.8" ry="1.6" fill="${OL}"/><path d="M6 -24q8-4 4-12" fill="none" stroke="#2A2F45" stroke-width="5" stroke-linecap="round"/><circle cx="8" cy="-36" r="2.8" fill="#E0A577"${s2(1.1)}/>`,
    cat:`<path d="M6 -2q12 0 10-14" fill="none" stroke="#3A3446" stroke-width="3.4" stroke-linecap="round"/><path d="M-8 0q-2-14 5-16h6q7 2 5 16z" fill="#3A3446"${s2(1.2)}/><path d="M-7 -14l-1-8 5 4h6l5-4-1 8q0 6-7 6t-7-6z" fill="#3A3446"${s2(1.2)}/><ellipse cx="-3" cy="-14" rx="1.6" ry="2" fill="#F7D046"/><ellipse cx="3" cy="-14" rx="1.6" ry="2" fill="#F7D046"/>`,
    dog:`<path d="M-14 -10q-6-6-4-12" fill="none" stroke="#B9814D" stroke-width="3.4" stroke-linecap="round"/><rect x="-16" y="-17" width="26" height="12" rx="6" fill="#C98F58"${s2(1.4)}/><path d="M-12 -6v6M-4 -6v6M2 -6v6M7 -6v6" stroke="#C98F58" stroke-width="3.4" stroke-linecap="round"/><circle cx="11" cy="-20" r="7.5" fill="#C98F58"${s2(1.4)}/><path d="M7 -26q-5 2-4 10" fill="#8A5A2B"${s2(1.2)}/><ellipse cx="17.5" cy="-18" rx="3.6" ry="2.6" fill="#E3B486"${s2(1.2)}/><circle cx="20" cy="-19" r="1.4" fill="${OL}"/><circle cx="12" cy="-22" r="1.3" fill="${OL}"/>`,
    grocer:`<path d="M-14 22q0-14 14-14t14 14z" fill="#F4F6FA"${s2(1.4)}/><path d="M-12 8q-2-20 12-20t12 20l-4 6v-14h-16v14z" fill="#fff"${s2(1.4)}/><path d="M-12 -4h24" stroke="#E2535A" stroke-width="1.5" stroke-dasharray="2 2"/><ellipse cy="2" rx="8" ry="9" fill="#C98A5E"/><path d="M-10 -8q10-6 20 0" stroke="#111" stroke-width="3" fill="none"/><circle cx="-3" cy="1" r="1.4" fill="${OL}"/><circle cx="3" cy="1" r="1.4" fill="${OL}"/><path d="M-5 5q5 6 10 0" fill="#3a2a22"/>`};
  /* the page's parts. One hidden <svg><defs> holds what the page has used so far, each piece put in the first time it is
     needed (KH.need for the other figures; the rig's shared parts, a kid's head, and every look a game has drawn): the home
     screen pays for the kids it shows. A look (a kid in a pose, a mood and clothes) is one template, so a kid on the page is
     one <use> and the same markup on every render: nothing for the engine's morph to redo */
  let DEF=null;const HAVE=new Set();
  function ensureDefs(){if(typeof document==='undefined'||!document.body)return null;if(DEF&&DEF.isConnected)return DEF;HAVE.clear();DEF=null;
    try{const d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML=`<svg width="0" height="0"><defs><linearGradient id="kh-beam"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".85"/><stop offset="1" stop-color="#FFE38A" stop-opacity="0"/></linearGradient><radialGradient id="kh-glow"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".75"/><stop offset="1" stop-color="#FFC24A" stop-opacity="0"/></radialGradient></defs></svg>`;
      document.body.appendChild(d);DEF=d.querySelector('defs');}catch(e){DEF=null;}return DEF;}
  // put(name, make): the markup make() returns goes into the page's defs once (a name says it is there)
  function put(name,mk){if(HAVE.has(name)&&DEF&&DEF.isConnected)return;const el=ensureDefs();if(!el)return;HAVE.add(name);
    try{el.insertAdjacentHTML('beforeend',mk());}catch(e){}}
  const need=id=>{if(OTHERS[id])put(id,()=>`<g id="kh-${id}">${OTHERS[id]}</g>`);};
  const castOf=o=>{const w=o.who!=null?o.who:o.seat!=null?o.seat:o.c?Math.max(0,CAST.findIndex(x=>x.c.toLowerCase()===String(o.c).toLowerCase())):0;return ((w%8)+8)%8;};
  const hatOf=o=>o.hat&&ACC_AT(o.hat)==='H'?o.hat:o.acc&&ACC[o.acc]&&ACC[o.acc].H?o.acc:null;
  const exprOf=(o,w,pose)=>MOOD[o.mood]||(pose&&POSE_MOOD[pose])||MOOD[CAST[w].m]||'normal';
  const LOD=['','--sw:6.2;--cw:4.2;--iw:1.9','--sw:7.6;--cw:5.2;--iw:2.5'];
  const fitOf=(name,w)=>{const F=OUTFIT[name];if(!F)return null;const K=CAST[w];return {...F,k:F.k,v:typeof F.v==='function'?F.v(K):F.v};};
  /* a look as kid coordinates (KH.kid's units: the ground at 0,0, about 58 tall): the rig at RS, a body accessory over it.
     peek is a head (as big as a face's) with two hands holding on to the edge in front of it */
  function kidMk(w,o){const pose=o.pose==='peek'||POSES[o.pose]?o.pose:'stand',hat=hatOf(o),H=hat?ACC[hat].H:'',a=o.acc&&ACC[o.acc]||null;
    const expr=exprOf(o,w,pose),lod=LOD[o.lod]||'';let s;
    if(pose==='peek'){const hand=x=>`<use href="#kh-hand" transform="translate(${x} 19) rotate(180) scale(1.25)"/>`,hh=hand(-22.4)+hand(22.4);
      s=`<g transform="scale(.49)">${rigHead(w,{expr,hat:H})}<g class="kr-bo">${hh}</g>${hh}<g class="kr-cu">${hh}</g></g>`;}
    else{let fit=fitOf(o.outfit,w);if(a&&a.o)fit={...(fit||{}),over:((fit&&fit.over)||'')+a.o};
      s=`<g transform="scale(${RS})">${rigKid(w,{pose,expr,fit,hat:H,held:a&&a.h?{side:HELD_SIDE[pose]||1,svg:a.h}:pose==='torch'?{side:1,svg:HELD.torch}:null})}</g>`+(a&&a.b?a.b:'');}
    return `<g class="kr"${lod?` style="${lod}"`:''}>${s}</g>`;}
  // a round face (face coordinates: 34 wide, the player's colour circle at 0,-1 r 16.5); with ring, the shoulders show in the circle
  const FS=.559;
  function faceMk(w,o){const hat=hatOf(o),H=hat?ACC[hat].H:'',expr=exprOf(o,w);
    const head=`<g transform="translate(0 -2.1) scale(${FS})">${rigHead(w,{expr,body:!!o.ring})}</g>`;
    const hs=H?`<g transform="translate(0 -2.1) scale(${FS})"><g transform="translate(0 -3.4) scale(2.05)"><g class="kr-bo">${H}</g>${H}</g></g>`:'';
    return `<g class="kr">${o.ring?`<g clip-path="url(#kh-avc)">${head}</g>`:head}${hs}</g>`;}
  // a look's template in the page: one id a look (the colours stay outside it, so the same look serves every player colour)
  /* a look in a game's SVG is a picture too: one <image> in the page's defs (the look drawn once, in its colours, as an SVG
     image the browser paints as vectors), and every kid of that look one <use> of it. The kid's many parts never reach the
     page: one node a look in the defs, one a kid on screen, the same markup on every render */
  const TPL=new Map();let TN=0;
  const KBOX=[-46,-94,92,106],PBOX=[-32,-36,64,56];
  function tpl(key,w,c,vb,mk){let id=TPL.get(key);if(!id){id='kh-L'+(++TN);TPL.set(key,id);}const [x,y,W,H]=vb;
    put(id,()=>`<image id="${id}" x="${x}" y="${y}" width="${W}" height="${H}" href="data:image/svg+xml,${uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${W}" height="${H}" font-family="Tahoma,Arial,sans-serif">${picOf(w,c,mk())}</svg>`)}"/>`);return id;}
  const KEYS=['who','c','pose','mood','outfit','acc','hat','r','flip','lod'];
  const kk=(o,ks)=>ks.map(k=>o[k]==null?'':o[k]).join('|');
  /* KH.kid({who|seat|c, pose, mood, outfit, acc, hat, s, flip, x, y, lod}): one kid as SVG (a <g> with one <use>, for inside an
     <svg>). who: the cast member (0..7, the player's colour index); c: the shirt colour (the player's); pose: stand | walk | peek |
     cheer | caught | sad | think | count | torch | wave | hold | sit | situp | sitcheer | sitlook; mood: s | k | g | o | sad | hm;
     outfit: a key of OUTFIT; acc: a key of ACC (held, on the head, or on the body); hat: a head accessory; lod 1|2 thicker lines */
  function kid(o={}){const w=castOf(o),pose=o.pose||'stand',s=o.s||1;
    const tr=`translate(${f(o.x||0)} ${f(o.y||0)}) scale(${f((o.flip?-s:s)*100)/100} ${f(s*100)/100})${o.r?` rotate(${f(o.r)})`:''}`;
    const id=tpl('k|'+kk({...o,pose,r:null,flip:null},KEYS),w,o.c,pose==='peek'?PBOX:KBOX,()=>kidMk(w,{...o,pose}));
    return `<use href="#${id}" transform="${tr}"/>`;}
  /* KH.extend({outfit:{key:…},acc:{key:…}}): a game adds its own outfits and accessories (namespaced keys, e.g. 'job-chef').
     An outfit is an object like OUTFIT's (or an old sticker string for the shirt); an accessory {h, H, b} like ACC's (or a
     string: on the body, in kid coordinates). They go into the page the first time they are used. Existing keys stay */
  function extend(o={}){for(const k in o.outfit||{})if(!OUTFIT[k]){const v=o.outfit[k];OUTFIT[k]=typeof v==='string'?oldFit(v):v;}
    for(const k in o.acc||{})if(!ACC[k]){const v=o.acc[k];ACC[k]=typeof v==='string'?{b:v}:v;}}
  // a round face for avatars inside a game's own markup: a standalone small <svg>; o.hat adds a head accessory
  const faceVB=o=>hatOf(o)?'-23 -33 46 46':'-17 -18 34 34';
  const ring=(o,w)=>o.ring?`<circle cy="-1" r="16.5" fill="${o.bg||o.c||CAST[w].c}"/>`:'';
  const face1=(o={})=>{const w=castOf(o),id=tpl('f|'+kk(o,['who','c','mood','hat','ring','bg']),w,o.c,faceVB(o).split(' ').map(Number),()=>ring(o,w)+faceMk(w,o));
    return `<svg class="kh-face${o.cls?' '+o.cls:''}" viewBox="${faceVB(o)}" width="${o.size||32}" height="${o.size||32}" aria-hidden="true"><use href="#${id}"/></svg>`;};
  // the old single entry point: kid poses go to kid(), the other figures are plain templates
  function sprite(pose,x,y,o={}){if(POSES[pose]||pose==='peek')return kid({...o,pose,x,y});const sc=(o.s||1)*(o.flip?-1:1),s=o.s||1;need(pose);
    return `<use href="#kh-${pose}" transform="translate(${f(x)} ${f(y)}) scale(${f(sc*100)/100} ${f(s*100)/100})"${o.cls?` class="${o.cls}"`:''}/>`;}
  // KH.sit({who|c, pose, mood, s, flip, x, y}): a kid sitting cross-legged on the floor (head near 0,-32):
  // pose sit | situp (one hand up) | sitcheer (both up) | sitlook (hand at the head, turning)
  const sit=(o={})=>kid({...o,pose:/^sit/.test(o.pose||'')&&POSES[o.pose]?o.pose:'sit'});
  // a kid (or a few) as a standalone <svg> for a game's own HTML; the default box holds a standing kid with a hat, o.vb crops it
  const BOX='-27 -78 54 82';
  const fig=(inner,o={})=>`<svg class="kh-fig${o.cls?' '+o.cls:''}" viewBox="${o.vb||BOX}"${o.w?` width="${o.w}" height="${o.h||o.w}"`:''} aria-hidden="true">${inner}</svg>`;
  /* pictures for the app's shell: a face or a kid drawn once into an SVG image and kept as a CSS class (one rule a look, added
     the first time the look is needed), so a player strip, a status card or a result sheet adds one plain element and no
     <use> or SVG nodes to the page: nothing for a re-render to compare and nothing for the browser to lay out inside it.
     The picture carries the rig's paint and the kid's parts with it */
  const PIC=new Map();let PSH=null,PN=0;
  // a picture as a data URI: double quotes become single ones and only what would end or break the URL is escaped (% # < >
  // and line ends, and a backslash for CSS): about half the size of encodeURIComponent, and quick to make
  const UE={'%':'%25','#':'%23','<':'%3C','>':'%3E','\n':'%0A','\\':'%5C'};
  const uri=svg=>svg.replace(/"/g,"'").replace(/[%#<>\n\\]/g,c=>UE[c]);
  function pic(key,mk,vb){let c=PIC.get(key);if(c)return c;c='khi-'+(++PN);
    try{if(!PSH){const el=document.createElement('style');el.id='kh-pics';document.head.appendChild(el);PSH=el.sheet;}
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" font-family="Tahoma,Arial,sans-serif">${mk()}</svg>`;
      PSH.insertRule(`.${c}{background-image:url("data:image/svg+xml,${uri(svg)}")}`,PSH.cssRules.length);}catch(e){}
    PIC.set(key,c);return c;}

  const picOf=(w,c,inner)=>`<style>${RIGCSS}</style><defs>${RIGBASE()}${KIDDEFS(w)}</defs><g style="${vars(w,c)}">${inner}</g>`;
  // KH.faceImg(o) / KH.kidImg(o,{vb,cls}): the same face and kid as an element with the picture (class "khi")
  const faceImg=(o={})=>{const w=castOf(o);return `<kh-p class="khi${o.cls?' '+o.cls:''} ${pic('f|'+kk(o,['who','c','mood','hat','ring','bg']),()=>picOf(w,o.c,ring(o,w)+faceMk(w,o)),faceVB(o))}" aria-hidden="true"></kh-p>`;};
  const kidImg=(o={},b={})=>{const w=castOf(o),pose=o.pose||'stand';
    return `<kh-p class="khi${b.cls?' '+b.cls:''} ${pic('k|'+kk(o,KEYS)+'|'+(b.vb||BOX),()=>picOf(w,o.c,`<g transform="${o.flip?'scale(-1 1)':''}${o.r?` rotate(${f(o.r)})`:''}">${kidMk(w,{...o,pose})}</g>`),b.vb||BOX)}"${b.style?` style="${b.style}"`:''} aria-hidden="true"></kh-p>`;};

  /* ---------------- the cast in the app's shell (core.js): every player is a kid ----------------
     A player's kid: online, the avatar they picked (presence av KID_AV+k, accepted by emoji.js EMJ_AV), else the kid of their colour;
     on one phone, the kid picked on the setup row (localStorage alaabna.lkid), else the kid of the seat's colour. The shirt (and the
     kid's own touches of colour: حمود's cap, نورة's headband, ريم's bows) always takes the player's colour: the colour stays
     the player's identity */
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

  return {OL,f,T,st,lite,C,art:{roof,facade,court,door,car,trailer,barrel,crate,palm,tree,lamp,pool,tank,shed,tent,field,shop,ruin,defs},bg,CAST,kid,face:face1,sprite,fig,beam,say,burst,tw,graph,walk,banner,card,snd,ensureDefs,need,extend,sit,cloth:{cl,ln,mir},
    POSES:Object.keys(POSES),OUTFIT:Object.keys(OUTFIT),ACC:Object.keys(ACC),faceImg,kidImg,KID_AV,kidOf,lkSet,pface,pkid,homeScene};
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
  const capBody=(fill,dot,extra)=>`<ellipse cy="3" rx="11" ry="3.4" fill="#000" opacity=".3"/><path d="M-10 1.5a10 9.5 0 0 1 20 0q-10 4-20 0z" fill="${fill}"${s2(1.5)}/><path d="M-8.2 -2.5q8.2 3 16.4 0M-6 -6q6 2.4 12 0" fill="none" stroke="${dot}" stroke-width="1.3" stroke-dasharray="1.6 1.6"/>${extra}`;
  const CAPS={cap:capBody('#FAFBFD','#B9C6D6',`<path d="M-10 1.5q10 4 20 0" fill="none" stroke="#C8D3E0" stroke-width="1.6"/>`),
    gold:capBody('#FFD24D','#C98F1A',`<path d="M-5 -5.5l1.2 2.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
    fake:capBody('#E7DCC8','#B49B78',`<path d="M-1 -8l3 6M3 -8l-3 6" stroke="#C0612B" stroke-width="1.3"/><rect x="2" y="-4" width="6" height="5" rx="1" fill="#C9B48E"${s2(1)}/>`)};
  const SLEEPCAT=`<ellipse cy="5" rx="19" ry="5" fill="#000" opacity=".3"/><path d="M14 4q6 6-4 8.5q-10 1.5-16-1" fill="none" stroke="${OL}" stroke-width="6.4" stroke-linecap="round"/><path d="M14 4q6 6-4 8.5q-10 1.5-16-1" fill="none" stroke="#E39B4E" stroke-width="4" stroke-linecap="round"/>`+
    `<ellipse cx="2" cy="1" rx="15" ry="9.5" fill="#E39B4E"${s2(1.5)}/><path d="M3 -7.5q2 4 0 8M8 -6q2 4 0 8M13 -3.5q1.5 3 0 6" fill="none" stroke="#B5652A" stroke-width="2" stroke-linecap="round"/>`+
    `<path d="M-15 -4l-1-8 5 4z" fill="#E39B4E"${s2(1.3)}/><path d="M-6 -6l3-7 2 6z" fill="#E39B4E"${s2(1.3)}/><circle cx="-9" cy="-1" r="7.5" fill="#E39B4E"${s2(1.5)}/><ellipse cx="-9" cy="2.6" rx="3.6" ry="2.4" fill="#FBE3C4"/>`+
    `<path d="M-14 -1.6q1.8 1.6 3.4 0M-7.6 -1.6q1.8 1.6 3.4 0" fill="none" stroke="${OL}" stroke-width="1.3" stroke-linecap="round"/><path d="M-9.8 1.2h1.6l-.8 1z" fill="#D9534F"/>`;
  let done=false;
  function ensure(){KH.ensureDefs();if(typeof document==='undefined'||!document.body||(done&&document.getElementById('kh-cap-cap')))return;done=true;
    try{const d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';const g=(id,c)=>`<g id="kh-${id}">${c}</g>`;
      d.innerHTML=`<svg width="0" height="0"><defs>${Object.keys(CAPS).map(k=>g('cap-'+k,CAPS[k])).join('')}${g('sleepcat',SLEEPCAT)}</defs></svg>`;document.body.appendChild(d);}catch(e){}}
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
  return {cap,sprite,ensureDefs2:ensure,art:{...KH.art,moon,lights,rug,jar,stairs,icecart,defs2}};
})());

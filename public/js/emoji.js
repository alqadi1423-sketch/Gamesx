'use strict';
/* our own emoji: one look on every phone (Unicode emoji differ between phones). Each is a small flat SVG in the app's palette,
   viewBox 0 0 64 64, no ids or filters, so it can show many times on one screen. A reaction, a chat sticker and an avatar travel
   as an index into EMJ only, never as markup: KEEP THE ORDER, add new ones at the end. */
const EMJ=(()=>{
  const N='#2D4763',R='#EC6158',B='#4AB1E8',G='#F0B429',GD='#D99A1B';
  const face=(c,d)=>`<circle cx="32" cy="35" r="26" fill="${d||GD}"/><circle cx="32" cy="32" r="26" fill="${c||'#F7C548'}"/><ellipse cx="23" cy="16" rx="9" ry="4.5" fill="#fff" opacity=".35"/>`;
  const eyes=(y,r)=>`<circle cx="23" cy="${y||28}" r="${r||4}" fill="${N}"/><circle cx="41" cy="${y||28}" r="${r||4}" fill="${N}"/>`;
  const happy=`<path d="M16 29q6-7 12 0M36 29q6-7 12 0" stroke="${N}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const cheeks=`<circle cx="15" cy="38" r="4" fill="${R}" opacity=".3"/><circle cx="49" cy="38" r="4" fill="${R}" opacity=".3"/>`;
  const ln=(d,c,w)=>`<path d="${d}" stroke="${c||N}" stroke-width="${w||4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // a speech bubble with a word in it (the text stickers)
  const word=(t,c,dk,fs,ink)=>`<path d="M9 13h46a7 7 0 0 1 7 7v21a7 7 0 0 1-7 7H28l-11 9 1-9H9a7 7 0 0 1-7-7V20a7 7 0 0 1 7-7z" fill="${dk}" transform="translate(0 3)"/><path d="M9 13h46a7 7 0 0 1 7 7v21a7 7 0 0 1-7 7H28l-11 9 1-9H9a7 7 0 0 1-7-7V20a7 7 0 0 1 7-7z" fill="${c}"/><rect x="8" y="17" width="26" height="5" rx="2.5" fill="#fff" opacity=".25"/><text x="32" y="${fs>17?38:37}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${ink||'#fff'}">${t}</text>`;
  const L=[
   ['ضحك',face()+happy+`<path d="M17 37h30q-2 16-15 16T17 37z" fill="${N}"/><path d="M24 48q8-6 16 0q-4 4-8 4t-8-4z" fill="${R}"/><path d="M8 27q-5 7 0 10q5-3 0-10zM56 27q-5 7 0 10q5-3 0-10z" fill="${B}"/>`],
   ['واو',face()+ln('M15 19q5-4 10-1M39 18q5-3 10 1',N,3)+`<circle cx="23" cy="29" r="5.5" fill="${N}"/><circle cx="41" cy="29" r="5.5" fill="${N}"/><circle cx="24.5" cy="27" r="1.8" fill="#fff"/><circle cx="42.5" cy="27" r="1.8" fill="#fff"/><ellipse cx="32" cy="46" rx="6" ry="8" fill="${N}"/>`],
   ['معصّب',face('#F07A6E','#C9483F')+ln('M14 21l12 5M50 21l-12 5',N,4.5)+eyes(30)+ln('M22 48q10-8 20 0')],
   ['زعلان',face()+ln('M15 25l10-4M49 25l-10-4',N,3.5)+eyes(31)+ln('M23 48q9-7 18 0')+`<path d="M44 36q-4 7 0 9q4-2 0-9z" fill="${B}"/>`],
   ['أفكر',face()+ln('M15 20l10 1M39 16q5-2 10 2',N,3.5)+`<circle cx="25" cy="27" r="4" fill="${N}"/><circle cx="43" cy="26" r="4" fill="${N}"/>`+ln('M25 45l13-3')+`<path d="M30 63c-3 0-5-3-4-6l3-6c1-2 4-3 6-2l9 4c3 1 4 4 3 7-2 3-5 4-8 3z" fill="#F7C548" stroke="${GD}" stroke-width="2.5"/>`],
   ['تصفيق',`<g transform="rotate(-18 24 36)"><rect x="13" y="16" width="20" height="36" rx="10" fill="#F7C548" stroke="${GD}" stroke-width="3"/>`+ln('M19 19v9M23.5 18v10M28 19v9',GD,2)+`</g><g transform="rotate(18 40 36)"><rect x="31" y="16" width="20" height="36" rx="10" fill="#F7C548" stroke="${GD}" stroke-width="3"/>`+ln('M36 19v9M40.5 18v10M45 19v9',GD,2)+`</g>`+ln('M8 13l4 5M32 4v7M56 13l-4 5',R,3.5)],
   ['نار',`<path d="M32 4c5 11 19 17 19 34a19 19 0 0 1-38 0c0-9 5-13 9-16 0 6 2 9 6 10-2-11 0-19 4-28z" fill="${R}"/><path d="M32 29c3 6 10 9 10 17a10 10 0 0 1-20 0c0-7 6-10 10-17z" fill="${G}"/><path d="M32 43c2 3 4 4 4 7a4 4 0 0 1-8 0c0-3 2-4 4-7z" fill="#FFF3C4"/>`],
   ['حب',`<path d="M32 58S7 43 7 25a13 13 0 0 1 25-5 13 13 0 0 1 25 5c0 18-25 33-25 33z" fill="#C9483F" transform="translate(0 3)"/><path d="M32 58S7 43 7 25a13 13 0 0 1 25-5 13 13 0 0 1 25 5c0 18-25 33-25 33z" fill="${R}"/><ellipse cx="19" cy="22" rx="5" ry="3.5" fill="#fff" opacity=".4" transform="rotate(-30 19 22)"/>`],
   ['رهيب',face()+`<path d="M10 22h44v5c0 8-5 12-11 12s-9-4-10-9h-2c-1 5-4 9-10 9s-11-4-11-12z" fill="${N}"/><path d="M15 26h8M40 26h8" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>`+ln('M22 46q10 8 20 0')],
   ['غمزة',face()+ln('M16 29q6-5 12 0')+`<circle cx="41" cy="28" r="4.5" fill="${N}"/>`+cheeks+`<path d="M21 41q11 11 22 0z" fill="${N}"/><path d="M33 46q5 6 9 1z" fill="${R}"/>`],
   ['يبكي',face()+ln('M16 27q6 5 12 0M36 27q6 5 12 0',N,3.5)+`<path d="M17 31h7v26h-7zM40 31h7v26h-7z" fill="${B}" opacity=".9"/><path d="M24 50q4-6 8-3t8 3" stroke="${N}" stroke-width="4" fill="none" stroke-linecap="round"/>`],
   ['نعسان',face()+ln('M16 30q6 4 12 0M36 30q6 4 12 0',N,3.5)+`<ellipse cx="32" cy="45" rx="4" ry="3" fill="${N}"/>`+ln('M43 6h9l-9 9h9',B,3)+ln('M53 18h6l-6 6h6',B,2.5)],
   ['زهر',`<rect x="7" y="11" width="50" height="50" rx="13" fill="#B9C6D4"/><rect x="7" y="7" width="50" height="50" rx="13" fill="#fff"/><circle cx="21" cy="25" r="5" fill="${N}"/><circle cx="43" cy="25" r="5" fill="${N}"/><circle cx="32" cy="32" r="3.5" fill="${R}"/><circle cx="17" cy="38" r="3" fill="${R}" opacity=".35"/><circle cx="47" cy="38" r="3" fill="${R}" opacity=".35"/>`+ln('M23 42q9 7 18 0',N,3.5)],
   ['ورقة',`<g transform="rotate(-9 32 32)"><rect x="13" y="9" width="38" height="52" rx="7" fill="#B9C6D4"/><rect x="13" y="6" width="38" height="52" rx="7" fill="#fff" stroke="${N}" stroke-width="2.5"/><text x="21" y="21" text-anchor="middle" font-size="12" font-weight="900" fill="${R}">A</text><path d="M32 45s-11-7-11-14a5.5 5.5 0 0 1 11-2 5.5 5.5 0 0 1 11 2c0 7-11 14-11 14z" fill="${R}"/></g>`],
   ['جمل',`<path d="M9 41c0-8 5-13 12-13 3-9 10-12 15-6 3 4 6 6 10 6h1V17c0-4 3-7 7-7h2c2 0 4 2 4 4s-2 3-4 3h-1v21c0 6-4 9-9 9H14c-3 0-5-2-5-6z" fill="#D9A55B"/><path d="M15 46v14M23 47v13M39 47v13M46 46v14" stroke="#B07C3A" stroke-width="4.5" stroke-linecap="round"/><path d="M24 29q6-9 12-2l-2 4H24z" fill="${R}"/><circle cx="55" cy="14" r="1.8" fill="${N}"/>`],
   ['دلة',`<path d="M23 40C14 40 10 31 5 24l4-2c4 6 8 12 15 12z" fill="#D4930F"/><path d="M41 31c8 0 11 6 10 12s-5 9-9 9" stroke="${N}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M21 58h22l-3-19c3-2 4-6 3-11H21c-1 5 0 9 3 11z" fill="${G}"/><path d="M24 28l3-8h10l3 8z" fill="#D4930F"/><path d="M26 20q6-11 12 0z" fill="${G}"/><circle cx="32" cy="7" r="3" fill="#D4930F"/><rect x="21" y="45" width="22" height="4" fill="${N}" opacity=".25"/><rect x="25" y="31" width="4" height="11" rx="2" fill="#fff" opacity=".35"/>`],
   ['صقر',`<path d="M12 60c0-24 9-44 28-44 9 0 15 6 15 13l-9 6c-2-3-6-4-8-2 4 7 4 18-3 27z" fill="#8A5A2B"/><path d="M28 60c7-7 9-18 5-25-7 1-13 12-13 25z" fill="#EED3A8"/><path d="M55 29l4 7c0 4-3 7-6 7l-7-8z" fill="${G}"/><circle cx="43" cy="26" r="5" fill="${G}"/><circle cx="44" cy="26" r="2.6" fill="${N}"/>`+ln('M35 29q-3 6 1 11',`#5E3B1A`,3)],
   ['تاج',`<path d="M7 47L11 17l12 12 9-19 9 19 12-12 4 30z" fill="${G}"/><rect x="7" y="45" width="50" height="11" rx="4" fill="#D4930F"/><circle cx="11" cy="16" r="4" fill="${G}"/><circle cx="32" cy="9" r="4" fill="${G}"/><circle cx="53" cy="16" r="4" fill="${G}"/><circle cx="32" cy="37" r="5" fill="${R}"/><circle cx="18" cy="39" r="3.5" fill="${B}"/><circle cx="46" cy="39" r="3.5" fill="${B}"/>`],
   ['كأس',`<path d="M19 15H8c0 13 6 20 15 20M45 15h11c0 13-6 20-15 20" stroke="#D4930F" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18 7h28v17c0 13-6 22-14 22S18 37 18 24z" fill="${G}"/><path d="M24 12v12c0 6 2 11 5 14" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".45"/><rect x="28" y="45" width="8" height="7" fill="#D4930F"/><rect x="17" y="51" width="30" height="9" rx="3" fill="${N}"/>`],
   ['تمام',`<rect x="7" y="30" width="13" height="27" rx="3" fill="${B}"/><path d="M20 31l9-15c2-4 9-3 9 2v9h13c4 0 7 4 6 8l-4 17c-1 3-3 5-6 5H20z" fill="#F7C548" stroke="${GD}" stroke-width="3" stroke-linejoin="round"/>`+ln('M40 41h12M39 49h11',GD,2.5)],
   ['كفو',word('كفو',G,'#C98F0E',20,N)+`<path d="M54 4l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="${R}"/>`],
   ['ههههه',word('ههههه','#4AB1E8','#2F86BC',16)],
   ['يا حظك',word('يا حظك','#4CB97F','#36835A',15)],
   ['غشاش؟',word('غشاش؟',R,'#C9483F',16)],
   ['صبر',word('صبر',N,'#1B2E44',20)],
   ['تحدي',word('تحدي','#F2874B','#C9632D',19)+`<path d="M52 2l-6 10h5l-4 9 9-12h-5l4-7z" fill="${G}"/>`],
   ['دورك',word('دورك','#9C7BD6','#7556AF',19)],
   ['باي',word('باي','#2FB3AA','#22837C',20)],
   ['يلا',word('يلا','#E57AAE','#B95583',20)],
   ['حظ أوفر',word('حظ أوفر','#6C7A89','#4C5866',14)]];
  return L.map(([n,s])=>({n,svg:`<svg viewBox="0 0 64 64" aria-hidden="true">${s}</svg>`}));
})();
// the faces and characters (not the word stickers) can be an avatar, and so can the kids of the cast: 100+k is KH.CAST[k]
// (kit-hara.js KID_AV; drawn in the player's colour). An avatar travels as this number only (presence av), checked against this list
const EMJ_AV=[...EMJ.map((_,i)=>i).filter(i=>i<20),100,101,102,103,104,105,106,107];
const emoOk=i=>Number.isInteger(i)&&i>=0&&i<EMJ.length;
const emoSVG=i=>emoOk(i)?EMJ[i].svg:'';

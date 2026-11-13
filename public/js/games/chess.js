'use strict';
/* two-sided board games: chess and Arabic dama. With more than two players the seats split into two teams
   (even seats against odd seats) and the members of a team take turns moving for their side. */

/* ---------- teams ---------- */
// members still playing (seats that left or were skipped are out)
const tmSeats=(d,side)=>d.pl.map((_,s)=>s).filter(s=>s%2===side&&(d.out||'')[s]!=='1');
const tmNow=(d,side)=>{const m=tmSeats(d,side);return m.length?m[(d.tr[side]||0)%m.length]:d.turn;};
// after `side` moved: its next member moves next time, and the other side's current member moves now
function tmPass(d,side){const tr=[...d.tr];tr[side]=(tr[side]+1)%(tmSeats(d,side).length||1);return {tr,turn:tmNow({...d,tr},1-side)};}
const tmName=(d,side)=>{const m=tmSeats(d,side);return m.length===1?nameTag(d,m[0]):m.map(s=>nameTag(d,s)).join(' و');};
const tmWin=(d,side)=>{let m=tmSeats(d,side);if(!m.length)m=d.pl.map((_,s)=>s).filter(s=>s%2===side);return {win:m[0],wins:m};};
// a member left (skip or kick): each side keeps its rotation on the member due next (or the next one still here);
// a side with nobody left loses. While a double is offered (tavla) the asked side acts
function tmSkip(nd,d){d=d||nd;if(nd.win!=null)return {...nd,end:'left'};
  for(const side of [0,1])if(!tmSeats(nd,side).length)return {...nd,...tmWin(nd,1-side),end:'left'};
  const tr=[0,1].map(side=>{const o=tmSeats(d,side),m=tmSeats(nd,side),k=(d.tr[side]||0)%(o.length||1);
    for(let j=0;j<o.length;j++){const x=o[(k+j)%o.length];if(m.includes(x))return m.indexOf(x);}return 0;});
  const x={...nd,tr};return {...x,turn:tmNow(x,x.ph==='dbl'?1-x.sd:x.sd)};}
const tmMySide=(d,ctx)=>ctx.local?d.sd:(ctx.v>=0?ctx.v%2:0);

/* ---------- chess ---------- */
// board: 64 chars, row 0 is rank 8. Upper case white (side 0), lower case black (side 1)
const CH0='rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR';
const chSide=p=>p==='.'?-1:(p<'a'?0:1);
const N8=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],K8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const RD=[[-1,0],[1,0],[0,-1],[0,1]],BD=[[-1,-1],[-1,1],[1,-1],[1,1]];
function chAttacked(b,sq,by){
  const r=sq>>3,c=sq&7,at=(rr,cc)=>rr<0||rr>7||cc<0||cc>7?null:b[rr*8+cc];
  const P=by?'p':'P',Nn=by?'n':'N',Kk=by?'k':'K',B=by?'b':'B',R=by?'r':'R',Q=by?'q':'Q';
  const pr=by?r-1:r+1;if(at(pr,c-1)===P||at(pr,c+1)===P)return true;
  for(const [dr,dc] of N8)if(at(r+dr,c+dc)===Nn)return true;
  for(const [dr,dc] of K8)if(at(r+dr,c+dc)===Kk)return true;
  for(const [dirs,a,q] of [[RD,R,Q],[BD,B,Q]])for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8){const v=b[rr*8+cc];if(v!=='.'){if(v===a||v===q)return true;break;}rr+=dr;cc+=dc;}}
  return false;}
const chKing=(b,s)=>b.indexOf(s?'k':'K');
const chCheck=(b,s)=>chAttacked(b,chKing(b,s),1-s);
function chPseudo(d,s){const b=d.b,out=[];
  for(let f=0;f<64;f++){const p=b[f];if(chSide(p)!==s)continue;const r=f>>3,c=f&7,t=p.toLowerCase();
    const add=(to,x)=>out.push({f,t:to,...(x||{})});
    const ok=(rr,cc)=>rr>=0&&rr<8&&cc>=0&&cc<8;
    if(t==='p'){const dr=s?1:-1,start=s?1:6,last=s?7:0;const one=(r+dr)*8+c;
      const push=(to,x)=>{if((to>>3)===last)for(const pr of 'qrbn')add(to,{...x,pr});else add(to,x);};
      if(ok(r+dr,c)&&b[one]==='.'){push(one);if(r===start&&b[one+dr*8]==='.')add(one+dr*8,{dbl:1});}
      for(const dc of [-1,1]){if(!ok(r+dr,c+dc))continue;const to=(r+dr)*8+c+dc;
        if(chSide(b[to])===1-s)push(to);else if(to===d.ep)add(to,{ep:1});}}
    else if(t==='n'||t==='k'){for(const [dr,dc] of (t==='n'?N8:K8)){const rr=r+dr,cc=c+dc;if(!ok(rr,cc))continue;const to=rr*8+cc;if(chSide(b[to])!==s)add(to);}
      if(t==='k'&&f===(s?4:60)&&!chAttacked(b,f,1-s)){const K=s?'k':'K',Qs=s?'q':'Q';
        if(d.cr.includes(K)&&b[f+1]==='.'&&b[f+2]==='.'&&b[f+3]===(s?'r':'R')&&!chAttacked(b,f+1,1-s)&&!chAttacked(b,f+2,1-s))add(f+2,{cs:'k'});
        if(d.cr.includes(Qs)&&b[f-1]==='.'&&b[f-2]==='.'&&b[f-3]==='.'&&b[f-4]===(s?'r':'R')&&!chAttacked(b,f-1,1-s)&&!chAttacked(b,f-2,1-s))add(f-2,{cs:'q'});}}
    else{const dirs=t==='r'?RD:t==='b'?BD:[...RD,...BD];
      for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(ok(rr,cc)){const to=rr*8+cc,v=b[to];if(v==='.')add(to);else{if(chSide(v)!==s)add(to);break;}rr+=dr;cc+=dc;}}}}
  return out;}
function chApply(d,m){let b=[...d.b];const p=b[m.f],s=chSide(p),cap=b[m.t]!=='.'||m.ep;
  b[m.t]=m.pr?(s?m.pr:m.pr.toUpperCase()):p;b[m.f]='.';
  if(m.ep)b[m.t+(s?-8:8)]='.';
  if(m.cs==='k'){b[m.f+1]=b[m.f+3];b[m.f+3]='.';}if(m.cs==='q'){b[m.f-1]=b[m.f-4];b[m.f-4]='.';}
  let cr=d.cr;const strip=ch=>{cr=cr.replace(ch,'');};
  if(p==='K'){strip('K');strip('Q');}if(p==='k'){strip('k');strip('q');}
  for(const [sq,ch] of [[63,'K'],[56,'Q'],[7,'k'],[0,'q']])if(m.f===sq||m.t===sq)strip(ch);
  return {b:b.join(''),cr,ep:m.dbl?(m.f+m.t)/2:-1,hm:(p.toLowerCase()==='p'||cap)?0:d.hm+1,cap};}
function chLegal(d,s){return chPseudo(d,s).filter(m=>!chCheck(chApply(d,m).b,s));}
function chKey(b,sd,cr,ep){let h=2166136261;const t=b+sd+cr+ep;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function chNoMate(b){const p=[...b].filter(x=>x!=='.'&&x.toLowerCase()!=='k');
  if(!p.length)return true;if(p.length===1&&'bnBN'.includes(p[0]))return true;
  if(p.every(x=>x.toLowerCase()==='b')){const cols=new Set();[...b].forEach((x,i)=>{if(x.toLowerCase()==='b')cols.add(((i>>3)+(i&7))%2);});return cols.size===1;}
  return false;}
const CHN={k:'الملك',q:'الوزير',r:'القلعة',b:'الفيل',n:'الحصان',p:'الجندي'};
function chMove(d,m){const s=d.sd,a=chApply(d,m),ns=1-s;const key=chKey(a.b,ns,a.cr,a.ep);
  const hist=a.hm===0?[key]:[...(d.hist||[]),key].slice(-110);
  // an own draw offer stays for the opponent's turn; moving instead of accepting declines the opponent's offer
  const nd={...d,b:a.b,cr:a.cr,ep:a.ep,hm:a.hm,hist,sd:ns,lm:[m.f,m.t],offer:d.offer===s?s:null,...tmPass(d,s)};
  const p=d.b[m.f].toLowerCase();const sq='abcdefgh'[m.t&7]+(8-(m.t>>3));
  nd.last=m.cs?`${tmName(d,s)} بيّت ${m.cs==='k'?'قصير':'طويل'}`:`${CHN[p]} إلى ${sq}${a.cap?' وأكل '+CHN[(m.ep?'p':d.b[m.t]).toLowerCase()]:''}${m.pr?' وترقى '+CHN[m.pr]:''}`;
  const moves=chLegal(nd,ns),chk=chCheck(a.b,ns);
  if(!moves.length){if(chk)return {...nd,...tmWin(d,s),end:'mate'};return {...nd,win:'d',end:'stale'};}
  if(chNoMate(a.b))return {...nd,win:'d',end:'mat'};
  if(a.hm>=100)return {...nd,win:'d',end:'50'};
  if(hist.filter(k=>k===key).length>=3)return {...nd,win:'d',end:'rep'};
  if(chk)nd.last+=' • كش ملك';
  return nd;}
// piece drawings
const CHP={
  p:'<circle cx="20" cy="12" r="5.5"/><path d="M14 30c0-6 3-9 6-11 3 2 6 5 6 11z"/><rect x="11" y="30" width="18" height="5" rx="2"/>',
  r:'<path d="M11 8h4v3h3V8h4v3h3V8h4v7l-3 3v9l3 3v5H11v-5l3-3v-9l-3-3z"/>',
  n:'<path d="M13 35v-5c0-5 4-7 5-11l-6 2-2-4 8-8c2-2 4-3 7-2 5 2 6 8 6 14v14z"/><circle cx="20" cy="13" r="1.4" class="eye"/>',
  b:'<circle cx="20" cy="6.5" r="2.5"/><path d="M20 9c5 4 7 8 7 12 0 3-2 5-4 6h-6c-2-1-4-3-4-6 0-4 2-8 7-12z"/><path d="M21.5 14l-3 5" class="cut"/><rect x="11" y="29" width="18" height="6" rx="2"/>',
  q:'<path d="M9 13l4 13h14l4-13-6 6-5-10-5 10z"/><circle cx="9" cy="12" r="2.2"/><circle cx="31" cy="12" r="2.2"/><circle cx="20" cy="8" r="2.2"/><rect x="11" y="27" width="18" height="8" rx="2"/>',
  k:'<path d="M18.5 3h3v3h3v3h-3v3h-3V9h-3V6h3z"/><path d="M10 18c0-4 4-6 10-6s10 2 10 6l-3 9H13z"/><rect x="11" y="27" width="18" height="8" rx="2"/>'};
const chPiece=p=>{const s=chSide(p),t=p.toLowerCase();return `<svg viewBox="0 0 40 40" class="chp ${s?'bk':'wh'}">${CHP[t]}</svg>`;};
GAMES.chess={name:'شطرنج',cat:'board',lbc:'#5B4632',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9A66B"/>${[0,1,2,3].map(r=>[0,1,2,3].map(c=>(r+c)%2?`<rect x="${c*25}" y="${r*25}" width="25" height="25" fill="#8B6B43"/>`:'').join('')).join('')}<g transform="translate(18 14) scale(1.6)" fill="#fff" stroke="#2D4763" stroke-width="1.6" stroke-linejoin="round">${CHP.k}</g></svg>`,
  init:n=>({b:CH0,sd:0,cr:'KQkq',ep:-1,hm:0,hist:[chKey(CH0,0,'KQkq',-1)],tr:[0,0],lm:null,offer:null,last:''}),
  start:d=>({...d,turn:0}),// white (seat 0) always opens, also in later rounds
  onSkip:tmSkip,
  onTimeout(d){const ms=chLegal(d,d.sd);return chMove(d,ms[rnd(ms.length)]);},
  points:d=>d.pl.map((_,s)=>s%2?'الأسود':'الأبيض'),
  winText(d){if(d.win==='d')return ({stale:'تعادل: ما عنده حركة وملكه مو مكشوش',mat:'تعادل: القطع ما تكفي لكش مات',50:'تعادل: 50 نقلة بدون أكل ولا حركة جندي',rep:'تعادل: نفس الوضع تكرر 3 مرات',agree:'تعادل بالاتفاق'})[d.end]||'تعادل';
    const side=d.win%2;return `فاز ${side?'الأسود':'الأبيض'}${d.end==='mate'?' كش مات':d.end==='resign'?' بالاستسلام':d.end==='left'?'، الخصم طلع':''}`;},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';
    s+=`${ctx.local||d.turn!==ctx.v?`دور ${tmName(d,d.sd)}`:'<b class="yt">دورك</b>'} <span class="chside ${d.sd?'bk':''}">${d.sd?'الأسود':'الأبيض'}</span>`;
    if(chCheck(d.b,d.sd))s+=' <b class="chk">كش!</b>';return s;},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=!ctx.local&&tmMySide(d,ctx)===1;
    const sel=S.chSel!=null&&S.chSel.k===d.hist.length+':'+d.b?S.chSel.f:null;
    const legal=my?chLegal(d,s):[];const tg=sel!=null?legal.filter(m=>m.f===sel):[];
    const kc=chCheck(d.b,s)?chKing(d.b,s):-1;
    const order=[...Array(64).keys()];if(flip)order.reverse();
    let h=`<div class="chwrap">${chTaken(d,flip?0:1)}<div class="chb">`;
    for(const i of order){const r=i>>3,c=i&7,dark=(r+c)%2,p=d.b[i];
      const t=tg.find(m=>m.t===i),mv=legal.some(m=>m.f===i);
      const cls=['sq',dark?'dk':'lt',d.lm&&d.lm.includes(i)?'lm':'',sel===i?'sel':'',i===kc?'kc':'',t?(p!=='.'||t.ep?'cap':'to'):''].join(' ');
      const lab=(flip?r===0:r===7)?`<i class="fl">${'abcdefgh'[c]}</i>`:'',lab2=(flip?c===7:c===0)?`<i class="rk">${8-r}</i>`:'';
      const can=my&&(t||mv||sel!=null);
      h+=`<${can?'button':'div'} class="${cls}" ${can?`data-ga="sq" data-i="${i}"`:''}>${p!=='.'?chPiece(p):''}${lab}${lab2}</${can?'button':'div'}>`;}
    h+=`</div>${chTaken(d,flip?1:0)}</div>`;
    if(my&&S.chPromo&&S.chPromo.k===d.hist.length+':'+d.b)h+=`<p class="lbl" style="text-align:center">رقّ الجندي إلى</p><div class="chpro">${'qrbn'.split('').map(x=>`<button data-ga="pro" data-i="${'qrbn'.indexOf(x)}">${chPiece(s?x:x.toUpperCase())}<span>${CHN[x]}</span></button>`).join('')}</div>`;
    if(my){h+=`<div class="row chact">${d.offer!=null&&d.offer!==s?'<button class="btn green" data-ga="draw" data-i="1">أقبل التعادل</button>':`<button class="btn" data-ga="draw" data-i="0" ${d.offer===s?'disabled':''}>${d.offer===s?'عرضت تعادل':'اعرض تعادل'}</button>`}<button class="btn" data-ga="resign">استسلم</button></div>`;}
    else if(d.offer!=null&&d.win==null)h+=`<p class="note">${d.offer?'الأسود':'الأبيض'} عرض تعادل</p>`;
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.sd,k=d.hist.length+':'+d.b;
    if(a==='resign'){if(!S.chSure){S.chSure=1;toast('اضغط استسلم مرة ثانية للتأكيد');setTimeout(()=>{S.chSure=0;},2500);return;}S.chSure=0;act({...d,...tmWin(d,1-s),end:'resign',last:`${tmName(d,s)} استسلم`});return;}
    if(a==='draw'){if(i===1&&d.offer===1-s){act({...d,win:'d',end:'agree'});return;}if(d.offer==null)act({...d,offer:s,last:`${tmName(d,s)} عرض تعادل`});return;}
    if(a==='pro'){const P=S.chPromo;if(!P||P.k!==k)return;S.chPromo=null;S.chSel=null;const m=chLegal(d,s).find(x=>x.f===P.f&&x.t===P.t&&x.pr==='qrbn'[i]);if(m)act(chMove(d,m));return;}
    if(a!=='sq')return;const legal=chLegal(d,s);const sel=S.chSel&&S.chSel.k===k?S.chSel.f:null;
    if(sel!=null){const ms=legal.filter(m=>m.f===sel&&m.t===i);
      if(ms.length){if(ms[0].pr){S.chPromo={k,f:sel,t:i};render();return;}S.chSel=null;S.chPromo=null;act(chMove(d,ms[0]));return;}}
    S.chPromo=null;S.chSel=legal.some(m=>m.f===i)&&sel!==i?{k,f:i}:null;render();}
};
function chTaken(d,side){// pieces of `side` that are off the board
  const full={p:8,n:2,b:2,r:2,q:1};const on={};for(const p of d.b)if(chSide(p)===side){const t=p.toLowerCase();on[t]=(on[t]||0)+1;}
  let h='';for(const t of 'qrbnp'){const k=Math.max(0,full[t]-(on[t]||0));for(let j=0;j<k;j++)h+=chPiece(side?t:t.toUpperCase());}
  return `<div class="chtk">${h}</div>`;}

/* ---------- dama (Arabic / Turkish draughts) ---------- */
// board: 64 chars, '0'/'1' men of side 0 (bottom, moves up) / side 1, 'A'/'B' kings, '.' empty
const DM0='........'+'11111111'+'11111111'+'........'+'........'+'00000000'+'00000000'+'........';
const dmSide=p=>p==='0'||p==='A'?0:p==='1'||p==='B'?1:-1,dmKing=p=>p==='A'||p==='B';
const DMD=[[-1,0],[1,0],[0,-1],[0,1]];
function dmDirs(p){if(dmKing(p))return DMD;return dmSide(p)===0?[[-1,0],[0,-1],[0,1]]:[[1,0],[0,-1],[0,1]];}
// all capture sequences from square f: each is {path:[squares], caps:[squares]}; pieces leave as they are jumped
function dmCaps(b,f,p,last){const r0=f>>3,c0=f&7,s=dmSide(p),out=[];
  for(const [dr,dc] of dmDirs(p)){if(last&&dmKing(p)&&dr===-last[0]&&dc===-last[1])continue;
    let r=r0+dr,c=c0+dc;
    if(dmKing(p))while(r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]==='.'){r+=dr;c+=dc;}
    if(!(r>=0&&r<8&&c>=0&&c<8)||dmSide(b[r*8+c])!==1-s)continue;const cap=r*8+c;
    let lr=r+dr,lc=c+dc;const lands=[];
    while(lr>=0&&lr<8&&lc>=0&&lc<8&&b[lr*8+lc]==='.'){lands.push(lr*8+lc);if(!dmKing(p))break;lr+=dr;lc+=dc;}
    for(const to of lands){const nb=[...b];nb[f]='.';nb[cap]='.';nb[to]=p;const more=dmCaps(nb.join(''),to,p,[dr,dc]);
      if(more.length)for(const m of more)out.push({path:[to,...m.path],caps:[cap,...m.caps]});else out.push({path:[to],caps:[cap]});}}
  return out;}
function dmMoves(b,s){let caps=[];for(let f=0;f<64;f++){const p=b[f];if(dmSide(p)!==s)continue;for(const m of dmCaps(b,f,p))caps.push({f,...m});}
  if(caps.length){const mx=Math.max(...caps.map(m=>m.caps.length));return caps.filter(m=>m.caps.length===mx);}
  const out=[];for(let f=0;f<64;f++){const p=b[f];if(dmSide(p)!==s)continue;const r0=f>>3,c0=f&7;
    for(const [dr,dc] of dmDirs(p)){let r=r0+dr,c=c0+dc;while(r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]==='.'){out.push({f,path:[r*8+c],caps:[]});if(!dmKing(p))break;r+=dr;c+=dc;}}}
  return out;}
function dmApply(d,m){const b=[...d.b];const p=b[m.f];b[m.f]='.';m.caps.forEach(x=>b[x]='.');const to=m.path[m.path.length-1];
  const s=dmSide(p),row=to>>3;b[to]=(!dmKing(p)&&row===(s?7:0))?(s?'B':'A'):p;return {b:b.join(''),crown:b[to]!==p};}
const dmCount=(b,s)=>[...b].filter(p=>dmSide(p)===s).length;
GAMES.dama={name:'داما',cat:'board',lbc:'#7A3B2E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8C994"/>${[1,2,3].map(k=>`<path d="M${k*25} 0V100M0 ${k*25}H100" stroke="#A97D45" stroke-width="2"/>`).join('')}<circle cx="37.5" cy="37.5" r="10" fill="#2D4763"/><circle cx="62.5" cy="37.5" r="10" fill="#2D4763"/><circle cx="37.5" cy="62.5" r="10" fill="#fff" stroke="#A97D45" stroke-width="2"/><circle cx="62.5" cy="62.5" r="10" fill="#fff" stroke="#A97D45" stroke-width="2"/><circle cx="62.5" cy="62.5" r="4" fill="#EDB02F"/></svg>`,
  init:()=>({b:DM0,sd:0,tr:[0,0],lm:null,quiet:0,last:''}),
  start:d=>({...d,turn:0}),
  onSkip:tmSkip,
  onTimeout(d){const ms=dmMoves(d.b,d.sd);return dmDo(d,ms[rnd(ms.length)]);},
  points:d=>d.pl.map((_,s)=>(s%2?'الأسود ':'الأبيض ')+dmCount(d.b,s%2)),
  winText(d){if(d.win==='d')return d.end==='km'?'تعادل: شيخ ضد قطعة وحدة':d.end==='q'?'تعادل: 50 نقلة بدون أكل':'تعادل';return `فاز ${d.win%2?'الأسود':'الأبيض'}${d.end==='block'?'، الخصم ما عنده حركة':''}${d.end==='resign'?' بالاستسلام':''}${d.end==='left'?'، الخصم طلع':''}`;},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';s+=`${ctx.local||d.turn!==ctx.v?`دور ${tmName(d,d.sd)}`:'<b class="yt">دورك</b>'} <span class="chside ${d.sd?'bk':''}">${d.sd?'الأسود':'الأبيض'}</span>`;
    const ms=dmMoves(d.b,d.sd);if(ms[0]&&ms[0].caps.length)s+=`<br><small>الأكل إجباري${ms[0].caps.length>1?`، وبأكبر عدد (${ms[0].caps.length})`:''}</small>`;return s;},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=!ctx.local&&tmMySide(d,ctx)===1;
    const k=d.b+d.sd;const ms=my?dmMoves(d.b,s):[];const P=S.dm&&S.dm.k===k?S.dm:null;
    // the move is built one jump at a time: P.f start, P.path squares chosen so far
    const okNow=ms.filter(m=>P&&m.f===P.f&&P.path.every((x,j)=>m.path[j]===x));
    const at=P?(P.path.length?P.path[P.path.length-1]:P.f):null;
    const nexts=new Set(okNow.map(m=>m.path[P.path.length]).filter(x=>x!=null));
    const starts=new Set(ms.map(m=>m.f));
    const gone=new Set();if(P)okNow[0]&&okNow[0].caps.slice(0,P.path.length).forEach(x=>gone.add(x));
    const order=[...Array(64).keys()];if(flip)order.reverse();
    let h=`<div class="chwrap"><div class="chb dmb">`;
    for(const i of order){let p=d.b[i];if(P&&i===P.f&&P.path.length)p='.';if(P&&i===at&&P.path.length)p=d.b[P.f];
      const cls=['sq',d.lm&&d.lm.includes(i)?'lm':'',at===i?'sel':'',nexts.has(i)?'to':'',gone.has(i)?'gone':''].join(' ');
      const can=my&&(nexts.has(i)||(!P||!P.path.length)&&starts.has(i));
      h+=`<${can?'button':'div'} class="${cls}" ${can?`data-ga="sq" data-i="${i}"`:''}>${p!=='.'?`<span class="dmp ${dmSide(p)?'bk':'wh'}">${dmKing(p)?'<b>♛</b>':''}</span>`:''}</${can?'button':'div'}>`;}
    h+='</div></div>';
    if(my&&P&&P.path.length)h+='<div class="row chact"><button class="btn" data-ga="undo">تراجع عن الأكلة</button></div>';
    if(my)h+=`<div class="row chact"><button class="btn" data-ga="resign">استسلم</button></div>`;
    return h;},
  click(a,i,d,ctx){if(!ctx.my)return;const s=d.sd,k=d.b+d.sd,ms=dmMoves(d.b,s);
    if(a==='resign'){if(!S.chSure){S.chSure=1;toast('اضغط استسلم مرة ثانية للتأكيد');setTimeout(()=>{S.chSure=0;},2500);return;}S.chSure=0;act({...d,...tmWin(d,1-s),end:'resign',last:`${tmName(d,s)} استسلم`});return;}
    if(a==='undo'){S.dm=null;render();return;}
    let P=S.dm&&S.dm.k===k?S.dm:null;
    if(!P||!P.path.length){if(ms.some(m=>m.f===i)&&(!P||P.f!==i)){S.dm={k,f:i,path:[]};render();return;}if(!P){return;}}
    const okNow=ms.filter(m=>m.f===P.f&&P.path.every((x,j)=>m.path[j]===x)&&m.path[P.path.length]===i);
    if(!okNow.length){if(!P.path.length){S.dm=null;render();}return;}
    const path=[...P.path,i];const done=okNow.find(m=>m.path.length===path.length);
    if(done&&okNow.every(m=>m.path.length===path.length)){S.dm=null;act(dmDo(d,done));return;}
    S.dm={k,f:P.f,path};render();}
};
function dmDo(d,m){const s=d.sd,a=dmApply(d,m),ns=1-s;const to=m.path[m.path.length-1];
  const quiet=m.caps.length?0:d.quiet+1;
  const nd={...d,b:a.b,sd:ns,lm:[m.f,...m.path],quiet,...tmPass(d,s),last:`${tmName(d,s)}${m.caps.length?` أكل ${m.caps.length}`:' تحرك'}${a.crown?' وصار عنده شيخ':''}`};
  if(!dmMoves(a.b,ns).length)return {...nd,...tmWin(d,s),end:dmCount(a.b,ns)?'block':'all'};
  const pc=s=>[...a.b].filter(p=>dmSide(p)===s);const w=pc(0),k=pc(1);
  if((w.length===1&&k.length===1)&&(dmKing(w[0])!==dmKing(k[0])))return {...nd,win:'d',end:'km'};
  if(quiet>=100)return {...nd,win:'d',end:'q'};
  return nd;}

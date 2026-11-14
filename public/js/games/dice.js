'use strict';
/* dice and luck: five dice, liar's dice, shut the box, camel race, lucky boxes */

// one die: held dice lift with a gold ring, a die that was just rolled tumbles in (class roll), and an empty die is a ghost
const dieBtn=(n,held,attrs,cls,id)=>`<${attrs?'button':'div'} ${id?`id="${id}"`:''} class="dice ${held?'held':''} ${n?'':'ghost'} ${cls||''}" ${attrs||''}>${diceSVG(n||5)}</${attrs?'button':'div'}>`;

/* ---------- five dice ---------- */
const YC=['الآحاد','الاثنينات','الثلاثات','الأربعات','الخمسات','الستات','ثلاثة متشابهة','أربعة متشابهة','فل هاوس','تسلسل صغير','تسلسل كبير','خمسة متشابهة','الحظ'];
function yScore(k,dice){const d=[...dice].map(Number);const c=[0,0,0,0,0,0,0];d.forEach(x=>c[x]++);const sum=d.reduce((a,b)=>a+b,0);const mx=Math.max(...c);
  const has=s=>s.every(x=>c[x]>0);
  if(k<6)return c[k+1]*(k+1);
  if(k===6)return mx>=3?sum:0;if(k===7)return mx>=4?sum:0;
  if(k===8)return c.includes(3)&&c.includes(2)?25:0;
  if(k===9)return has([1,2,3,4])||has([2,3,4,5])||has([3,4,5,6])?30:0;
  if(k===10)return has([1,2,3,4,5])||has([2,3,4,5,6])?40:0;
  if(k===11)return mx===5?50:0;return sum;}
const yTotal=card=>{const up=card.slice(0,6).reduce((a,b)=>a+Math.max(b,0),0);return card.slice(0,13).reduce((a,b)=>a+Math.max(b,0),0)+(up>=63?35:0)+100*(card[13]||0);};
// official Yahtzee extras: a further Yahtzee earns 100 when the Yahtzee box holds 50, and it plays as a joker
const yIsY=dice=>dice!=='00000'&&[...dice].every(x=>x===dice[0]);
function yOpts(card,dice){const free=[...Array(13).keys()].filter(k=>card[k]<0);if(!yIsY(dice)||card[11]<0)return free.map(k=>[k,yScore(k,dice)]);
  const f=+dice[0]-1;if(card[f]<0)return [[f,yScore(f,dice)]];
  const low=free.filter(k=>k>=6);if(low.length)return low.map(k=>[k,k===8?25:k===9?30:k===10?40:yScore(k,dice)]);
  return free.map(k=>[k,0]);}
// the game ends when every seat still playing has filled all 13 boxes; seats that left never win
const yWin=(d,cards)=>cards.every((c,s)=>d.out[s]==='1'||c.slice(0,13).every(x=>x>=0))?mostPts(cards.map((c,s)=>d.out[s]==='1'?-1:yTotal(c))):null;
function yPut(card,k,dice){const c=[...card];const o=yOpts(card,dice).find(x=>x[0]===k);if(!o)return null;if(yIsY(dice)&&card[11]===50)c[13]=(c[13]||0)+1;c[k]=o[1];return c;}
GAMES.yatzy={name:'خمس زهرات',cat:'cards',lbc:'#B03A48',
  // online the dice are thrown on the host's phone, so nobody picks their own numbers
  net:{host:['roll']},
  // nothing is hidden here: if the room's host leaves, the game goes on from where it was
  redeal:d=>d,onTimeout:d=>{const t=d.turn;const cards=d.cards.map(c=>[...c]);const empty=cards[t].map((v,k)=>k<13&&v<0?k:-1).filter(k=>k>=0);let best=empty[0];if(!empty.length)return {...d,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:yWin(d,cards)};if(d.rolls){const o=yOpts(cards[t],d.dice);const b=o.reduce((x,y)=>y[1]>x[1]?y:x);cards[t]=yPut(cards[t],b[0],d.dice);}else cards[t][best]=0;return {...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:yWin(d,cards)};},
  // a player who leaves takes his roll with him, and if he was the last one still playing the game ends
  onSkip(nd,d){let x=nd.turn!==d.turn?{...nd,dice:'00000',held:'00000',rolls:0}:nd;if(x.win!=null)return x;const win=yWin(x,x.cards);if(win!=null)return {...x,win};
    if(x.cards[x.turn].slice(0,13).every(v=>v>=0))x={...x,turn:nextSeat(x,x.turn,x.out.split('').map((c,s)=>c==='1'||x.cards[s].slice(0,13).every(v=>v>=0)?'1':'0').join(''))};return x;},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D5505F"/>${[[14,16],[52,12],[30,50],[64,48],[22,78]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="26" height="26" rx="6" fill="#fff" transform="rotate(${k*9-18} ${x+13} ${y+13})"/><circle cx="${x+13}" cy="${y+13}" r="4" fill="#2D4763"/>`).join('')}</svg>`,
  init:n=>({dice:'00000',held:'00000',rolls:0,cards:Array(n).fill(0).map(()=>Array(13).fill(-1)),last:''}),
  points:d=>d.cards.map(yTotal),status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>'المجموع: '+d.cards.map((c,s)=>`${nm(d,s)} ${yTotal(c)}`).join('، '),
  render(d,ctx){const t=d.turn;const card=d.cards[t];S.rolled=false;
    // a roll is new the first time it is drawn (also for bots and online players): those dice tumble, held ones stay put
    const filled=card.filter(v=>v>=0).length,fresh=d.rolls>0&&d.win==null&&once(`yz${d.gid}_${t}_${filled}_${d.rolls}_${d.dice}`);
    let s=`<div class="ytray ${fresh&&yIsY(d.dice)?"yz":""}">${[...d.dice].map((x,i)=>dieBtn(d.rolls?+x:0,d.rolls>0&&d.held[i]==='1',ctx.my&&d.rolls>0&&d.rolls<3?`data-ga="hold" data-i="${i}"`:'',fresh&&d.held[i]!=='1'?'roll':'')).join('')}</div>`;
    s+=`<div class="acts"><button class="btn yroll" style="background:${col(d,t)}" data-ga="roll" ${ctx.my&&d.rolls<3?'':'disabled'}>ارمِ (${3-d.rolls} باقي)<span class="yleft">${[0,1,2].map(k=>`<i class="${k<3-d.rolls?'on':''}"></i>`).join('')}</span></button></div>`;
    const up=card.slice(0,6).reduce((a,b)=>a+Math.max(b,0),0);const opts=d.rolls?yOpts(card,d.dice):[];
    const best=opts.length?Math.max(...opts.map(o=>o[1])):0;
    if(d.rolls&&yIsY(d.dice)&&card[11]>=0)s+=`<p class="hint" style="text-align:center">خمسة متشابهة مرة ثانية!${card[11]===50?' +100 مكافأة،':''} وتنحسب جوكر</p>`;
    const row=k=>{const n=YC[k],v=card[k];const op=opts.find(x=>x[0]===k);const pv=op?op[1]:0;const lab=`<span>${k<6?`<i class="yi">${diceSVG(k+1)}</i>`:''}${n}</span>`;
      return v>=0?`<div class="yc done">${lab}<b>${v}</b></div>`:`<button class="yc ${d.rolls&&op?(pv?(pv===best?'pv top':'pv'):'zero'):''}" data-ga="score" data-i="${k}" ${ctx.my&&d.rolls&&op?'':'disabled'}>${lab}<b>${d.rolls?pv:''}</b></button>`;};
    s+=`<div class="ysheet ycard" style="--c:${col(d,t)}"><div class="ycol">${[0,1,2,3,4,5].map(row).join('')}<div class="ybon ${up>=63?'got':''}"><span>المكافأة</span><div class="ybar"><i style="width:${Math.min(100,Math.round(up/63*100))}%"></i></div><b>${up>=63?'+35':up+'/63'}</b></div></div>
      <div class="ycol">${[6,7,8,9,10,11,12].map(row).join('')}</div>
      <div class="ytot">${card[13]?`<span class="yxb">مكافأة الخمسة <b>+${card[13]*100}</b></span>`:''}<span>المجموع</span><b>${yTotal(card)}</b></div></div>`;
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn;
    if(a==='hold'){if(!d.rolls||d.rolls>=3)return;act({...d,held:setAt(d.held,i,d.held[i]==='1'?'0':'1')});return;}
    if(a==='roll'){if(d.rolls>=3)return;S.rolled=true;const dice=[...d.dice].map((x,k)=>d.held[k]==='1'&&d.rolls?x:String(1+rnd(6))).join('');act({...d,dice,rolls:d.rolls+1});return;}
    if(a==='score'){if(!d.rolls||d.cards[t][i]>=0)return;const cards=d.cards.map(c=>[...c]);const nc=yPut(cards[t],i,d.dice);if(!nc)return;cards[t]=nc;
      const got=nc[i],xb=(nc[13]||0)>(d.cards[t][13]||0);
      act({...d,cards,dice:'00000',held:'00000',rolls:0,turn:nextSeat(d,t),win:yWin(d,cards),last:`${nm(d,t)} سجّل ${got} في ${YC[i]}`+(xb?' و+100 مكافأة 🎉':got>=40||(i===11&&got)?' 🎉':!got?' 😬':'')});}
  }
};

/* yatzy bots. Hard: every throw is weighed by what it can still become. A box is worth its score minus what it usually
   brings in a game (YPAR), so a zero goes where it costs least and the upper boxes lean towards the 63 bonus.
   yV(card,0) values each of the 252 sets of five dice when scored now; yV(card,1) and yV(card,2) with one or two throws to come
   (exact odds over every part that can be kept) */
const YPAR=[1.9,5.3,8.6,12.2,15.7,19.2,21.7,13.1,22.6,29.5,32.7,16.9,22];
const YB=(()=>{let T=null;return ()=>{if(T)return T;
  const ms=m=>{const o=[];const rec=(f,left,c)=>{if(f===5){o.push([...c.slice(0,5),left]);return;}for(let x=0;x<=left;x++){c[f]=x;rec(f+1,left-x,c);}};rec(0,m,[0,0,0,0,0,0]);return o;};
  const fact=[1,1,2,6,24,120],out=[0,1,2,3,4,5].map(m=>ms(m).map(c=>[c,fact[m]/c.reduce((a,x)=>a*fact[x],1)/6**m]));
  const st=ms(5),id=new Map(st.map((c,i)=>[c.join(''),i])),str=st.map(c=>c.map((x,f)=>String(f+1).repeat(x)).join(''));
  const keeps=st.map(c=>{const ks=[];const rec=(f,k)=>{if(f===6){const n=k.reduce((a,b)=>a+b,0);ks.push({k:[...k],t:out[5-n].map(([o,p])=>[id.get(k.map((x,j)=>x+o[j]).join('')),p])});return;}for(let x=0;x<=c[f];x++){k[f]=x;rec(f+1,k);}};rec(0,[0,0,0,0,0,0]);return ks;});
  return T={st,id,str,keeps};};})();
function yEff(card,k,v,dice){let e=v-YPAR[k];if(yIsY(dice)&&card[11]===50)e+=100;
  if(k<6){const up=card.slice(0,6).reduce((a,b)=>a+Math.max(b,0),0);if(up<63){e+=.6*(v-3*(k+1));if(up+v>=63)e+=22;}}
  return e;}
const yBest=(card,dice)=>{let b=null;for(const [k,v] of yOpts(card,dice)){const e=yEff(card,k,v,dice);if(!b||e>b[1])b=[k,e];}return b;};
const YVC={};
function yV(card,left){const key=card.join(',')+'|'+left;if(YVC[key])return YVC[key];const T=YB();let V;
  if(!left)V=T.str.map(x=>yBest(card,x)[1]);else{const P=yV(card,left-1);V=T.keeps.map(ks=>Math.max(...ks.map(K=>K.t.reduce((a,[j,p])=>a+p*P[j],0))));}
  if(Object.keys(YVC).length>40)for(const k in YVC)delete YVC[k];return YVC[key]=V;}
// the dice to keep: the part of the throw with the best value after the throws still left (all five means score now)
function yKeep(card,dice,left){const T=YB(),c=[0,0,0,0,0,0];for(const x of dice)c[+x-1]++;const P=yV(card,left-1);let best=null;
  for(const K of T.keeps[T.id.get(c.join(''))]){const v=K.t.reduce((a,[j,p])=>a+p*P[j],0);if(!best||v>best.v+1e-9)best={v,k:K.k};}
  const need=[...best.k];return [...dice].map(x=>need[+x-1]-->0?'1':'0').join('');}
GAMES.yatzy.bot=(d,s,lv)=>{const card=d.cards[s];
  if(d.rolls===0)return botDo(d,s,'roll',0);
  if(lv>1&&!(lv===2&&Math.random()<.15)){
    if(d.rolls<3){const keep=yKeep(card,d.dice,lv===3?3-d.rolls:1);if(keep!=='11111'){if(keep!==d.held)return {...d,held:keep};return botDo(d,s,'roll',0);}}
    return botDo(d,s,'score',yBest(card,d.dice)[0]);}
  // easy: keeps the face it has most of (or a run), and often scores in a so-so box
  const dice=[...d.dice].map(Number);const cnt=[0,0,0,0,0,0,0];dice.forEach(x=>cnt[x]++);
  const best=yOpts(card,d.dice).sort((a,b)=>b[1]-a[1])[0];const good=best&&((best[0]>=8&&best[1]>0)||best[1]>=25);
  if(d.rolls<3&&!good&&!lvRand(lv)){const f=cnt.indexOf(Math.max(...cnt.slice(1)));const st=[1,2,3,4,5,6].filter(x=>cnt[x]);const run=st.length>=4&&card[10]<0;
    const keep=dice.map((x,i)=>run?(dice.indexOf(x)===i?'1':'0'):(x===f?'1':'0')).join('');if(keep!==d.held)return {...d,held:keep};return botDo(d,s,'roll',0);}
  if(d.rolls<3&&lvRand(lv)&&Math.random()<.5)return botDo(d,s,'roll',0);
  const o=yOpts(card,d.dice);const w=k=>k<6?(k+1)*3:[25,30,20,30,35,40,45,22][k-6]||20;
  return botDo(d,s,'score',o.sort((a,b)=>(b[1]-w(b[0])*.6)-(a[1]-w(a[0])*.6))[0][0]);};

/* ---------- liar's dice ---------- */
// Perudo rules: ones are wild; to switch to ones you may halve the count (rounded up), to leave ones you need double plus one
function liarOk(prev,q,f){if(!prev)return f!==1&&q>=1;if(prev.f!==1){if(f===1)return q>=Math.ceil(prev.q/2);return q>prev.q||(q===prev.q&&f>prev.f);}
  if(f===1)return q>prev.q;return q>=prev.q*2+1;}
GAMES.liar={name:'زهر الكذب',cat:'cards',lbc:'#4A3A6B',points:d=>d.n.map(x=>x+' 🎲'),onTimeout:d=>{const b=d.bid?(d.bid.f===1?{q:d.bid.q+1,f:1,s:d.turn}:{q:d.bid.q+1,f:d.bid.f,s:d.turn}):{q:1,f:2,s:d.turn};return {...d,bid:b,turn:nextSeat(d,d.turn)};},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5E4A8A"/><path d="M20 70Q50 20 80 70Z" fill="#3B2D59"/><rect x="30" y="56" width="18" height="18" rx="4" fill="#fff"/><rect x="52" y="56" width="18" height="18" rx="4" fill="#fff"/><circle cx="39" cy="65" r="3" fill="#2D4763"/><circle cx="57" cy="61" r="2.5" fill="#2D4763"/><circle cx="65" cy="69" r="2.5" fill="#2D4763"/><text x="50" y="40" font-size="22" font-weight="800" fill="#FFD84D" text-anchor="middle">؟</text></svg>`,
  init:n=>({r:0,n:Array(n).fill(n>4?4:5),bid:null,last:''}),
  privInit:(d,r)=>{const s=d.pl.indexOf(r);const k=s>=0?d.n[s]:0;return {r:d.r,dice:Array(k).fill(0).map(()=>1+rnd(6)).join('')};},
  privStale:(d,p)=>p.r!==d.r,
  // online, the dice stay with the host and their owner: «كذاب» and «بالضبط» count them on the host; nobody sets their own dice
  net:{host:['call','calza'],local:['qu','qd','f']},privOk:()=>false,
  // the room's host left and the hidden dice with it: everyone keeps their count and throws again for a new round
  redeal:d=>({...d,r:d.r+1,bid:null,last:'صاحب الغرفة طلع، رمينا الزهر من جديد'}),
  viewer:d=>d.win!=null?null:d.turn,
  coverMsg:d=>d.last||'',
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  render(d,ctx){const v=ctx.local?(d.win!=null?0:ctx.v):ctx.v;
    let s='';
    // the bid on a little plaque: count × face, and who made it
    // the last call: every cup lifted, the dice that counted lit up, and who lost a die
    if(!d.bid&&d.rv&&d.rv.dice){const R=d.rv,hitF=x=>+x===R.f||(R.f!==1&&+x===1);
      s+=`<div class="lrv" id="lrv${d.r}"><div class="lrv-h"><b>${R.k==='calza'?'بالضبط؟':'كذاب؟'}</b> المزايدة ${R.q} × <span class="dice">${diceSVG(R.f)}</span> • كان فيه <b class="${R.cnt>=R.q?'ok':'no'}">${R.cnt}</b></div>
        <div class="lrv-rows">${R.dice.map((x,i)=>x?`<div class="lrv-r ${R.ls===i?'ls':''}" style="--c:${col(d,i)}"><i>${nm(d,i)}</i><span>${[...x].map((v,j)=>`<span class="dice ${hitF(v)?'hit':''}" style="--j:${j}">${diceSVG(+v)}</span>`).join('')}</span>${R.ls===i?'<em>−1 🎲</em>':''}</div>`:'').join('')}</div></div>`;}
    s+=d.bid?`<div class="lbid" id="lb${d.r}_${d.bid.q}_${d.bid.f}" style="--c:${col(d,d.bid.s)}"><small>المزايدة</small><b>${d.bid.q}</b><em>×</em><span class="dice">${diceSVG(d.bid.f)}</span><i>من ${nm(d,d.bid.s)}</i></div>`:'<div class="lbid none"><small>ما فيه مزايدة للحين</small></div>';
    // the table: everyone's cup with how many dice is still under it, then your own dice
    const p=v>=0?ctx.priv[d.pl[v]]:null;
    s+=`<div class="ltable"><div class="lcups">${d.pl.map((r,i)=>{const c=col(d,i),dead=d.out[i]==='1';
      return `<div class="lcup ${dead?'out':''} ${d.turn===i&&d.win==null&&!dead?'on':''}" style="--c:${c}"><svg viewBox="0 0 60 58"><ellipse cx="30" cy="52" rx="25" ry="4.5" fill="rgba(0,0,0,.28)"/><path d="M9 47L15 8Q30 3 45 8L51 47Q30 54 9 47Z" fill="${c}"/><path d="M15 8Q30 3 45 8L44.3 14Q30 9 15.7 14Z" fill="${shade(c,-.3)}"/><path d="M9 47Q30 54 51 47L51.6 51Q30 58 8.4 51Z" fill="${shade(c,-.35)}"/><path d="M19.5 17L16 42" stroke="rgba(255,255,255,.5)" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(22 20) scale(.4)">${SHP[r]('rgba(255,255,255,.92)')}</g></svg><span class="lcn">${'<i></i>'.repeat(Math.max(0,d.n[i]))}</span></div>`;}).join('')}</div>`;
    // a new round: your own dice tumble out of the cup once
    const lfresh=p&&p.r===d.r&&once(`lr${d.gid}_${d.r}_${v}`);
    if(p&&p.r===d.r)s+=`<p class="lbl">زهراتك</p><div class="ldice">${[...p.dice].map((x,i)=>dieBtn(+x,false,'',lfresh?'roll':'',`ld${d.r}_${i}`)).join('')}</div>`;
    s+='</div>';
    if(v<0)return s;
    if(ctx.my){const total=d.n.reduce((a,b,i)=>a+(d.out[i]==='1'?0:b),0);const minQ=d.bid?(d.bid.f===1?d.bid.q:Math.ceil(d.bid.q/2)):1;S.lq=Math.max(S.lq||minQ,minQ);S.lq=Math.min(S.lq,total);S.lf=S.lf||(d.bid?d.bid.f:2);
      s+=`<div class="stepper"><span>العدد</span><button data-ga="qd">−</button><b>${S.lq}</b><button data-ga="qu">+</button></div><div class="row lfaces">${[1,2,3,4,5,6].map(f=>`<button class="dice ${S.lf===f?'sel':''}" data-ga="f" data-i="${f}">${diceSVG(f)}</button>`).join('')}</div>
      <div class="acts"><button class="btn blue" data-ga="bid">زايد</button>${d.bid?'<button class="btn red" data-ga="call">كذاب!</button><button class="btn navy" data-ga="calza">بالضبط!</button>':''}</div><p class="note">الواحد جوكر يحسب مع أي وجه</p>`;}
    return s;},
  click(a,i,d,ctx){
    if(a==='qu'){S.lq=(S.lq||1)+1;render();return;}if(a==='qd'){S.lq=Math.max(1,(S.lq||1)-1);render();return;}if(a==='f'){S.lf=i;render();return;}
    if(!ctx.my)return;const t=d.turn;
    if(a==='bid'){const q=S.lq,f=S.lf;if(!liarOk(d.bid,q,f)){toast(!d.bid&&f===1?'ما تبدأ المزايدة على الواحد':d.bid&&d.bid.f===1&&f!==1?`من الواحد لازم ${d.bid.q*2+1} أو أكثر`:'لازم تزايد أعلى من اللي قبلك');return;}
      S.lq=null;S.lf=null;act({...d,bid:{q,f,s:t},turn:nextSeat(d,t),last:`${nm(d,t)} زايد: ${q} زهرات وجهها ${f}`});return;}
    if((a==='call'||a==='calza')&&d.bid){let cnt=0,missing=false;const all=[];d.pl.forEach((r,s)=>{if(d.out[s]==='1')return;const p=S.priv[r];if(!p||p.r!==d.r){missing=true;return;}cnt+=[...p.dice].filter(x=>+x===d.bid.f||(d.bid.f!==1&&+x===1)).length;all.push(`${nm(d,s)} ${p.dice}`);});
      if(missing){toast('انتظر الباقين');return;}
      // the dice of the round stay open on the table until the next bid: everyone sees what was there
      const rv={q:d.bid.q,f:d.bid.f,s:d.bid.s,by:t,k:a,cnt,dice:d.pl.map((r,x)=>d.out[x]==='1'?'':(S.priv[r]||{}).dice||'')};
      if(a==='calza'){const n=[...d.n],start=d.pl.length>4?4:5,hit=cnt===d.bid.q;let out=d.out;if(hit)n[t]=Math.min(start,n[t]+1);else{n[t]--;if(n[t]<=0)out=setAt(out,t,'1');}const al=aliveSeats(d,out);S.lq=null;S.lf=null;
        act({...d,n,out,r:d.r+1,bid:null,rv:{...rv,ls:hit?-1:t},turn:out[t]==='1'?nextSeat(d,t,out):t,win:al.length===1?al[0]:null,last:`${nm(d,t)} قال بالضبط! كان فيه ${cnt}، ${hit?'وصدق ورجعت له زهرة 🎯':'وغلط وخسر زهرة'}. (${all.join('، ')})`});return;}
      const loser=cnt>=d.bid.q?t:d.bid.s;const n=[...d.n];n[loser]--;let out=d.out;if(n[loser]<=0)out=setAt(out,loser,'1');const al=aliveSeats(d,out);
      S.lq=null;S.lf=null;
      act({...d,n,out,r:d.r+1,bid:null,rv:{...rv,ls:loser},turn:out[loser]==='1'?nextSeat(d,loser,out):loser,win:al.length===1?al[0]:null,
        last:`${nm(d,t)} قال كذاب! كان فيه ${cnt} من وجه ${d.bid.f}، فخسر ${nm(d,loser)} زهرة. (${all.join('، ')})`});}
  }
};

/* liar's dice bots: the odds that a bid is true, from the bot's own dice and the dice it cannot see.
   Hard also reads the last bid (whoever bid a face likely holds some of it), calls when calling loses less often
   than raising would, says «بالضبط» when the exact count is likely, and now and then bluffs on a face it lacks */
function binTail(n,p,k){if(k<=0)return 1;if(k>n)return 0;let pm=Math.pow(1-p,n),t=0;for(let i=0;i<=n;i++){if(i>=k)t+=pm;pm=pm*(n-i)/(i+1)*p/(1-p);}return Math.min(1,t);}
function binPmf(n,p,k){if(k<0||k>n)return 0;let c=1;for(let i=0;i<k;i++)c=c*(n-i)/(i+1);return c*Math.pow(p,k)*Math.pow(1-p,n-k);}
GAMES.liar.bot=(d,s,lv)=>{const p0=S.priv[d.pl[s]];const mine=p0&&p0.r===d.r?[...p0.dice].map(Number):[];
  const total=d.n.reduce((a,b,i)=>a+(d.out[i]==='1'?0:b),0),unseen=total-mine.length;
  const have=f=>mine.filter(x=>x===f||(f!==1&&x===1)).length,pf=f=>f===1?1/6:1/3;
  const told=f=>lv===3&&d.bid&&d.bid.s!==s&&(d.bid.f===f||(f!==1&&d.bid.f===1));
  const P=(q,f)=>{const k=q-have(f);const x=binTail(unseen,pf(f),k);return told(f)?.55*x+.45*binTail(unseen,pf(f),k-1):x;};
  const bid=(q,f)=>{S.lq=q;S.lf=f;return botDo(d,s,'bid',0);};
  if(lv===1||lv===2){const exp=f=>have(f)+unseen*pf(f);
    if(d.bid){const doubt=d.bid.q-exp(d.bid.f);if(doubt>[0,2.5,1.2][lv]||(lv===1&&Math.random()<.08))return botDo(d,s,'call',0);}
    const faces=[2,3,4,5,6].sort((a,b)=>exp(b)-exp(a));let f=lv===1&&Math.random()<.3?pickR([2,3,4,5,6]):faces[0],q=Math.max(1,Math.floor(exp(f)));
    if(d.bid&&!liarOk(d.bid,q,f)){q=d.bid.f===1?d.bid.q*2+1:d.bid.q+(f>d.bid.f?0:1);if(!liarOk(d.bid,q,f))q=d.bid.q+1;}
    if(!liarOk(d.bid,q,f)){f=d.bid?Math.max(2,d.bid.f):2;q=d.bid?d.bid.q+1:1;}
    return bid(q,f)||(d.bid?botDo(d,s,'call',0):undefined);}
  // hard: every legal raise worth a look (the two lowest counts on each face) and how likely each one is
  const cands=[];for(let f=1;f<=6;f++){if(!d.bid&&f===1)continue;let q=1;while(q<=total&&!liarOk(d.bid,q,f))q++;for(let k=0;k<2&&q+k<=total;k++)cands.push({q:q+k,f,p:P(q+k,f)+(have(f)?.02*have(f):0)});}
  if(!d.bid){const f=[2,3,4,5,6].sort((a,b)=>have(b)-have(a)||b-a)[Math.random()<.12?1+rnd(2):0];let q=1;while(q<total&&P(q+1,f)>=.62)q++;return bid(q,f);}
  const pT=P(d.bid.q,d.bid.f),pX=binPmf(unseen,pf(d.bid.f),d.bid.q-have(d.bid.f));
  cands.sort((a,b)=>b.p-a.p||a.q-b.q);const best=cands[0];
  // calling loses when the bid is true; raising loses about as often as the raise is false and someone calls it
  if(pX>.4&&pX>pT*.75&&Math.random()<.8)return botDo(d,s,'calza',0);
  if(!best||pT<(1-best.p)*.85)return botDo(d,s,'call',0);
  const bluff=Math.random()<.1&&cands.find(c=>c.p>.42&&!have(c.f));const c=bluff||best;
  return bid(c.q,c.f)||botDo(d,s,'call',0);};

/* ---------- shut the box ---------- */
function canMake(open,sum){const a=[];for(let k=1;k<=9;k++)if(open[k-1]==='1')a.push(k);const f=(i,s)=>s===0||(i<a.length&&s>0&&(f(i+1,s-a[i])||f(i+1,s)));return f(0,sum);}
const boxScore=b=>[...b].reduce((x,c,k)=>x+(c==='1'?k+1:0),0);
// everyone has finished: lowest box wins, seats that left count as 99
const shutWin=d=>{const sc=d.boxes.map((bb,s)=>d.out[s]==='1'?99:boxScore(bb));const mn=Math.min(...sc);const top=sc.map((x,s)=>x===mn?s:-1).filter(s=>s>=0);return top.length===1?top[0]:'d';};
const shutOut=(d,done)=>d.out.split('').map((c,s)=>c==='1'||done[s]==='1'?'1':'0').join('');
GAMES.shut={name:'أغلق الصندوق',cat:'cards',lbc:'#6B4226',
  // online the dice are thrown on the host's phone
  net:{host:['roll','roll1']},redeal:d=>d,onTimeout:d=>{const t=d.turn;const done=setAt(d.done,t,'1');const o2=shutOut(d,done);return {...d,done,roll:0,dice:'',turn:nextSeat(d,t,o2),win:o2.includes('0')?null:shutWin(d)};},
  // the next player never inherits the roll of a player who left, finished players get no extra turn, and the game ends when nobody is left to play
  onSkip(nd,d){let x=nd.turn!==d.turn?{...nd,roll:0,dice:''}:nd;if(x.win!=null)return x;const o2=shutOut(x,x.done);if(!o2.includes('0'))return {...x,roll:0,dice:'',win:shutWin(x)};
    if(o2[x.turn]==='1')x={...x,roll:0,dice:'',turn:nextSeat(x,x.turn,o2)};return x;},
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8C5A34"/><rect x="8" y="30" width="84" height="40" rx="6" fill="#5B3A20"/>${[1,2,3,4,5,6,7,8,9].map(k=>`<rect x="${10+(k-1)*9}" y="${k%3?34:44}" width="7.5" height="${k%3?30:20}" rx="2" fill="${k%3?'#F3D9AE':'#C9A15B'}"/>`).join('')}</svg>`,
  init:n=>({boxes:Array(n).fill('111111111'),done:'0'.repeat(n),roll:0,dice:'',last:''}),
  points:d=>d.boxes.map((b,s)=>d.done[s]==='1'?boxScore(b):'…'),status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>d.boxes.map((b,s)=>`${nm(d,s)} ${boxScore(b)}`).join('، '),
  render(d,ctx){const t=d.turn,b=d.boxes[t];S.sel=S.sel||[];const sel=S.sel.reduce((a,x)=>a+x,0);const small=b.slice(6)==='000';S.rolled=false;
    // tiles that were up the last time this box was drawn flip down now (remembered on this screen only, the state is not touched)
    const pk=d.gid+'_'+t;S.shPrev=S.shPrev||{};const prev=S.shPrev[pk]||b;S.shPrev[pk]=b;
    const anim=!!d.dice&&once(`sh${d.gid}_${t}_${b}_${d.dice}_${d.done}`);const live=ctx.my&&d.roll;
    let s=`<p class="lbl" style="text-align:center">صندوق ${nameTag(d,t)}</p><div class="sbox ${live?'live':''}">${[...b].map((c,k)=>c==='1'?`<button class="stile ${S.sel.includes(k+1)?'sel':''}" data-ga="tile" data-i="${k+1}" ${live?'':'disabled'}>${k+1}</button>`:`<div class="stile shut ${prev[k]==='1'?'flip':''}"><span>${k+1}</span></div>`).join('')}</div>`;
    const dv=d.dice?[...d.dice].map(Number):[5,2];const canR=ctx.my&&!d.roll&&d.win==null;
    s+=`<div class="stray">${dv.map(x=>tapDie(x,canR,col(d,t),anim?'roll':'')).join('')}${d.roll?`<b class="rollsum">= ${d.roll}</b>`:''}</div>`;
    if(ctx.my){if(!d.roll){if(small)s+=`<div class="acts"><button class="btn navy" data-ga="roll1">ارمِ زهرة وحدة بس</button></div>`;}
      else s+=`<div class="acts"><button class="btn blue" data-ga="ok" ${sel===d.roll?'':'disabled'}>اقفلها (${sel} من ${d.roll})</button></div>`;}
    return s;},
  click(a,i,d,ctx){
    if(!ctx.my)return;const t=d.turn,b=d.boxes[t];
    if(a==='tile'){S.sel=S.sel||[];S.sel=S.sel.includes(i)?S.sel.filter(x=>x!==i):[...S.sel,i];render();return;}
    if(a==='roll'||a==='roll1'){if(d.roll)return;S.rolled=true;S.sel=[];const dice=a==='roll'?String(1+rnd(6))+String(1+rnd(6)):String(1+rnd(6));const roll=[...dice].reduce((x,c)=>x+ +c,0);
      if(!canMake(b,roll)){const done=setAt(d.done,t,'1');const o2=shutOut(d,done);
        act({...d,dice,roll:0,done,turn:nextSeat(d,t,o2),last:`${nm(d,t)} طلع ${roll} وما يقدر يقفل، نتيجته ${boxScore(b)}`,win:o2.includes('0')?null:shutWin(d)});return;}
      act({...d,dice,roll});return;}
    if(a==='ok'){S.sel=S.sel||[];if(S.sel.reduce((x,y)=>x+y,0)!==d.roll)return;let nb=b;S.sel.forEach(k=>nb=setAt(nb,k-1,'0'));S.sel=[];const boxes=[...d.boxes];boxes[t]=nb;
      if(nb==='000000000'){act({...d,boxes,roll:0,dice:'',win:t,last:`${nm(d,t)} قفل الصندوق كامل!`});return;}
      act({...d,boxes,roll:0});}
  }
};

/* shut the box bots. Every box is one of 512 sets of open tiles (bit k = tile k+1).
   shutDP(T) gives, for each set, the best expected outcome over all the throws and choices still to come:
   with no target it is the final score to keep as low as possible; with a target T (the best score someone already finished on)
   it is the chance to end under T (closing everything always counts) */
const SH2=[0,0,1,2,3,4,5,6,5,4,3,2,1].map(x=>x/36),SHDP={};
const shSum=m=>{let t=0;for(let k=0;k<9;k++)if(m>>k&1)t+=k+1;return t;};
function shutDP(T){const key=T==null?'e':T;if(SHDP[key])return SHDP[key];const V=new Float64Array(512),win=T!=null;
  const end=m=>win?(m===0||shSum(m)<T?1:0):shSum(m);
  const after=(m,r)=>{let b=null;for(let c=m;c;c=(c-1)&m)if(shSum(c)===r){const v=V[m^c];if(b===null||(win?v>b:v<b))b=v;}return b===null?end(m):b;};
  for(let m=1;m<512;m++){const two=SH2.reduce((a,p,r)=>p?a+p*after(m,r):a,0);let v=two;
    if(!(m&448)){let one=0;for(let r=1;r<=6;r++)one+=after(m,r)/6;v=win?Math.max(v,one):Math.min(v,one);}V[m]=v;}
  V[0]=win?1:0;return SHDP[key]=V;}
const shMask=b=>[...b].reduce((a,c,k)=>a|(c==='1'?1<<k:0),0);
// the target for seat s: the lowest box of those who already finished (none: keep the score low)
const shTarget=(d,s)=>{const f=d.boxes.map((b,x)=>x!==s&&d.done[x]==='1'&&d.out[x]!=='1'?boxScore(b):null).filter(x=>x!=null);return f.length?Math.min(...f):null;};
GAMES.shut.bot=(d,s,lv)=>{const b=d.boxes[s],m=shMask(b),small=b.slice(6)==='000';
  const V=lv===3?shutDP(shTarget(d,s)):lv===2?shutDP(null):null,win=lv===3&&shTarget(d,s)!=null;
  if(!d.roll){let one=small&&lv>1;
    if(V&&small){let a=0,o=0;const best=(mm,r)=>{let x=null;for(let c=mm;c;c=(c-1)&mm)if(shSum(c)===r){const v=V[mm^c];if(x===null||(win?v>x:v<x))x=v;}return x===null?(win?(mm===0||shSum(mm)<shTarget(d,s)?1:0):shSum(mm)):x;};
      for(let r=2;r<=12;r++)a+=SH2[r]*best(m,r);for(let r=1;r<=6;r++)o+=best(m,r)/6;one=win?o>a:o<a;}
    return botDo(d,s,one?'roll1':'roll',0);}
  const open=[...b].map((c,k)=>c==='1'?k+1:0).filter(Boolean);const sets=[];
  const go=(i,sum,set)=>{if(sum===d.roll){sets.push([...set]);return;}if(sum>d.roll||i<0)return;go(i-1,sum+open[i],[...set,open[i]]);go(i-1,sum,set);};go(open.length-1,0,[]);
  if(!sets.length)return GAMES.shut.onTimeout(d);
  let pick;if(!V)pick=lvRand(lv)||Math.random()<.5?pickR(sets):sets.sort((x,y)=>x.length-y.length)[0];
  else{const val=set=>V[m^set.reduce((a,k)=>a|1<<(k-1),0)];pick=sets.sort((x,y)=>win?val(y)-val(x):val(x)-val(y))[0];}
  S.sel=pick;return botDo(d,s,'ok',0);};

/* ---------- camel race: five racing camels, bet on the leg, the coins decide ----------
   On your turn either shake the pyramid (a random camel that has not moved this leg runs 1 to 3 steps
   and you earn a coin) or take the best betting card left for a camel. A camel that lands on others climbs
   on top, and a camel carries every camel riding on it. When all five have moved the leg is scored:
   a card on the leader pays its value, on the second camel 1, on any other camel it costs 1.
   The race ends when a camel crosses the finish; the richest player wins. */
const CML=[['#E5483F','الأحمر'],['#3D8FD8','الأزرق'],['#3FAE5C','الأخضر'],['#F0B429','الأصفر'],['#ECEFF1','الأبيض']];
const CTRACK=16,CTILES=[5,3,2];
// camel order on the track: furthest first, and on the same square the one on top first
const cRank=cam=>[0,1,2,3,4].sort((a,b)=>cam[b][0]-cam[a][0]||cam[b][1]-cam[a][1]);
function cMove(cam,c,r){const [p,h]=cam[c];const ride=[0,1,2,3,4].filter(x=>cam[x][0]===p&&cam[x][1]>=h).sort((a,b)=>cam[a][1]-cam[b][1]);
  const to=p+r;const base=[0,1,2,3,4].filter(x=>!ride.includes(x)&&cam[x][0]===to).length;const n=cam.map(x=>[...x]);ride.forEach((x,k)=>{n[x]=[to,base+k];});return n;}
function cLegScore(d,cam){const rk=cRank(cam);const co=[...d.co];const lines=[];
  for(const [s,c,v] of d.bt){const g=rk[0]===c?v:rk[1]===c?1:-1;co[s]=Math.max(0,co[s]+g);lines.push(`${nm(d,s)} ${g>0?'+':''}${g}`);}
  return {co,msg:`انتهى الشوط، المتصدر ${CML[rk[0]][1]}`+(lines.length?`: ${lines.join('، ')}`:'')};}
function cNewLeg(d){return {dl:'00000',tk:[0,0,0,0,0],bt:[],lg:(d.lg||0)+1};}
GAMES.camel={name:'سباق الهجن',cat:'cards',lbc:'#B8860B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8C16A"/><path d="M0 74Q25 64 50 74T100 74V100H0Z" fill="#D9A441"/><text x="50" y="66" font-size="44" text-anchor="middle">🐪</text></svg>`,
  init:n=>{let cam=[0,1,2,3,4].map(()=>[0,0]);const ord=shuffle([0,1,2,3,4]);for(const c of ord){const p=rnd(3);const h=cam.filter((x,k)=>k!==c&&ord.indexOf(k)<ord.indexOf(c)&&x[0]===p).length;cam[c]=[p,h];}
    return {cam,co:Array(n).fill(3),...cNewLeg({}),ld:null,last:''};},
  points:d=>d.co,
  // online the pyramid is shaken on the host's phone, so no player can choose the camel or the steps
  net:{host:['roll','bet']},redeal:d=>d,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+(d.win==null?`<small>الشوط ${d.lg}</small> • `:'')+turnTxt(d,ctx),
  winExtra:d=>'الفلوس: '+d.pl.map((r,s)=>`${nm(d,s)} ${d.co[s]} 🪙`).join('، '),
  render(d,ctx){const my=ctx.my&&d.win==null;const rk=cRank(d.cam);
    const chip=(c,big)=>`<span class="cm ${big?'big':''}" style="--c:${CML[c][0]}">🐪</span>`;
    // the track bends: squares 1 to 8 on the top row, 9 to 16 back along the bottom row
    const cell=p=>{const here=[0,1,2,3,4].filter(c=>d.cam[c][0]===p).sort((a,b)=>d.cam[a][1]-d.cam[b][1]);const moved=d.ld&&here.includes(d.ld[0]);
      return `<div class="ct ${moved?'mv':''}"><small>${p+1}</small><div class="cst">${here.map(c=>chip(c)).join('')}</div></div>`;};
    const top=[...Array(8).keys()].map(cell).join(''),bot=[...Array(8).keys()].map(k=>cell(15-k)).join('');
    const over=[0,1,2,3,4].filter(c=>d.cam[c][0]>=CTRACK);
    let s=`<div class="ctrack"><div class="crow">${top}</div><div class="crow">${bot}</div><div class="cfin">🏁 ${over.length?over.sort((a,b)=>d.cam[b][1]-d.cam[a][1]).map(c=>chip(c)).join(''):'خط النهاية'}</div></div>`;
    s+=`<div class="cpyr">${[0,1,2,3,4].map(c=>{const v=d.dl[c];return `<span class="cd ${v!=='0'?'done':''} ${d.ld&&d.ld[0]===c?'last':''}" style="--c:${CML[c][0]}">${v==='0'?'?':v}</span>`;}).join('')}
      <button class="btn red" data-ga="roll" ${my?'':'disabled'}>🎲 هز الهرم <small>+1 🪙</small></button></div>`;
    s+=`<p class="lbl" style="text-align:center;margin:8px 0 4px">راهن على مين يتصدر الشوط</p><div class="cbets">${[0,1,2,3,4].map(c=>{const t=d.tk[c];const v=CTILES[t];const pos=rk.indexOf(c)+1;
      return `<button class="cbet" style="--c:${CML[c][0]}" data-ga="bet" data-i="${c}" ${my&&v?'':'disabled'}>${chip(c,1)}<b>${v?v:'—'}</b><small>${pos===1?'الأول':pos===2?'الثاني':'المركز '+pos}</small></button>`;}).join('')}</div>`;
    const mine=d.bt.filter(b=>b[0]===(ctx.local?d.turn:ctx.v));
    if(d.bt.length)s+=`<div class="cmine">${d.bt.map(([x,c,v])=>`<span style="--c:${col(d,x)}">${nm(d,x)} ${chip(c)} ${v}</span>`).join('')}</div>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='bet'){const v=CTILES[d.tk[i]];if(!v)return;const tk=[...d.tk];tk[i]++;act({...d,tk,bt:[...d.bt,[t,i,v]],ld:null,turn:nextSeat(d,t),last:`${nm(d,t)} راهن على ${CML[i][1]} بـ${v}`});return;}
    if(a!=='roll')return;const left=[0,1,2,3,4].filter(c=>d.dl[c]==='0');const c=left[rnd(left.length)],r=1+rnd(3);
    const cam=cMove(d.cam,c,r);const co=[...d.co];co[t]++;let x={...d,cam,co,dl:setAt(d.dl,c,String(r)),ld:[c,r],last:`${nm(d,t)} هز الهرم: ${CML[c][1]} مشى ${r}`};
    const fin=[0,1,2,3,4].some(k=>cam[k][0]>=CTRACK);
    if(fin||!x.dl.includes('0')){const sc=cLegScore(x,cam);x={...x,co:sc.co,last:x.last+' • '+sc.msg};
      if(fin){act({...x,win:mostPts(x.co),last:x.last+` • ${CML[cRank(cam)[0]][1]} فاز بالسباق 🏁`});return;}x={...x,...cNewLeg(x)};}
    act({...x,turn:nextSeat(d,t)});},
  onTimeout:d=>{const left=[0,1,2,3,4].filter(c=>d.dl[c]==='0');return {...d,turn:nextSeat(d,d.turn),last:`${nm(d,d.turn)} فوّت دوره`};}
};

/* ---------- lucky boxes: push your luck ----------
   Open boxes one by one and collect their coins in your bag; a ×2 box doubles the bag.
   Stop whenever you like and keep the bag, but a bomb empties it and ends your turn.
   When only bombs are left the richest player wins. */
// what is inside a box is decided only when it is opened (nb bombs and nx ×2 boxes are still hidden among the closed ones),
// so the shared state never holds where the bombs are
const luckLeft=d=>{let cl=0;for(let i=0;i<d.op.length;i++)if(d.op[i]==='.')cl++;const bomb=Math.min(cl,d.nb||0);return {safe:cl-bomb,bomb};};
// only bombs are left: the closed boxes show them and the richest player wins
function luckEnd(d){const {safe}=luckLeft(d);return safe?d:{...d,box:[...d.box].map((v,i)=>d.op[i]==='.'?'b':v).join(''),win:mostPts(d.pts)};}
function luckBank(d){const t=d.turn,pts=[...d.pts];pts[t]+=d.bag;return luckEnd({...d,pts,bag:0,turn:nextSeat(d,t),last:`${nm(d,t)} أخذ غنيمته ${d.bag} 💰`});}
GAMES.luck={name:'صناديق الحظ',cat:'cards',lbc:'#A5373F',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C9464F"/>${[[14,20],[54,20],[14,58],[54,58]].map(([x,y],k)=>`<rect x="${x}" y="${y}" width="32" height="26" rx="4" fill="${k===3?'#2D4763':'#F2C14E'}"/><rect x="${x+13}" y="${y}" width="6" height="26" fill="${k===3?'#1d2f44':'#D9A441'}"/>`).join('')}<text x="70" y="78" font-size="16" text-anchor="middle">💣</text></svg>`,
  init:n=>{const k=16+2*n;return {box:'?'.repeat(k),nb:3+Math.floor(n/2),nx:2,op:'.'.repeat(k),pts:Array(n).fill(0),bag:0,last:''};},
  // online a box is opened on the host's phone, so no player can choose what is inside
  net:{host:['m','bank']},redeal:d=>d,
  points:d=>d.pts,
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  render(d,ctx){const k=d.box.length,c=k<=20?5:6;const {safe,bomb}=luckLeft(d);const my=ctx.my&&d.win==null;
    let s=`<div class="lbag ${d.bag?'on':''}"><div class="lb-bag"><small>الكيس</small><b data-k="b${d.bag}">${d.bag} 💰</b></div><div><small>باقي</small><b>${safe+bomb} 🎁</b></div><div class="lb-bm"><small>القنابل</small><b>${bomb} 💣</b></div></div>`;
    // closed boxes are wrapped gifts; an opened one shows its coins in the opener's colour, ×2, or the bomb
    s+=`<div class="lgrid ${my?'live':''}" style="grid-template-columns:repeat(${c},minmax(0,1fr))">${[...d.box].map((v,i)=>{const o=d.op[i];
      if(o==='.')return `<button class="gbox ${d.win!=null&&v==='b'?'bomb':''}" data-ga="m" data-i="${i}" ${my?'':'disabled'} aria-label="صندوق">${d.win!=null&&v==='b'?'<span>💣</span>':''}</button>`;
      return `<div class="gbox op ${v==='b'?'boom':v==='x'?'dbl':''}" style="--c:${col(d,+o)};--l:${lit(d,+o)}">${v==='b'?'<span>💥</span>':`<b class="ltr">${v==='x'?'×2':'+'+v}</b>`}</div>`;}).join('')}</div>`;
    if(my)s+=`<div class="acts"><button class="btn green" data-ga="bank" ${d.bag?'':'disabled'}>💰 خذ الغنيمة ${d.bag?`(+${d.bag})`:''}</button></div><p class="note lb-tip">افتح صندوق كمان أو خذ اللي في الكيس. القنبلة تضيّع الكيس كله</p>`;
    return s;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const t=d.turn;
    if(a==='bank'){if(d.bag)act(luckBank(d));return;}
    if(a!=='m'||!Number.isInteger(i)||d.op[i]!=='.')return;const shut=[...d.op].filter(c=>c==='.').length;
    const nb=d.nb||0,nx=d.nx||0,r=rnd(shut);const v=r<nb?'b':r<nb+nx?'x':String(1+rnd(6));
    const op=setAt(d.op,i,String(t)),box=setAt(d.box,i,v),x={...d,op,box,nb:nb-(v==='b'?1:0),nx:nx-(v==='x'?1:0)};
    if(v==='b'){act(luckEnd({...x,bag:0,turn:nextSeat(d,t),last:`💥 ${nm(d,t)} فتح قنبلة وضاع كيسه (${d.bag})`}));return;}
    const bag=v==='x'?Math.max(2,d.bag*2):d.bag+ +v;const nd={...x,bag,last:`${nm(d,t)} ${v==='x'?'ضاعف كيسه ×2':'لقى '+v}`};
    if(!luckLeft(nd).safe){act(luckBank(nd));return;}act(nd);},
  onTimeout:d=>d.bag?luckBank(d):{...d,turn:nextSeat(d,d.turn)}
};

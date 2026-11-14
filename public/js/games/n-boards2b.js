'use strict';
/* boards2, second file: hex, go, xiangqi, star halma, mahbusa. Shares the helpers of n-boards2.js (b2Board, b2Think…) */

/* ================= السداسي: hex ================= */
// an n×n rhombus of hexagons; red (side 0) joins top and bottom, blue (side 1) joins left and right. Never a draw.
// After the first stone the second side may swap: the stone changes colour and is mirrored to its own side
const b2hxNb=(n,i)=>{const r=i/n|0,c=i%n,o=[];for(const [dr,dc] of [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n)o.push(rr*n+cc);}return o;};
const B2HXNB={};const b2hxN=(n,i)=>(B2HXNB[n]||(B2HXNB[n]=[...Array(n*n)].map((_,k)=>b2hxNb(n,k))))[i];
// the chain that joins the two edges of side s, or null
function b2hxWin(b,n,s){const c=String(s),start=[],prev=new Map();for(let k=0;k<n;k++){const i=s?k*n:k;if(b[i]===c){start.push(i);prev.set(i,-1);}}
  while(start.length){const i=start.shift();const r=i/n|0,cc=i%n;if(s?cc===n-1:r===n-1){const L=[];for(let x=i;x>=0;x=prev.get(x))L.push(x);return L;}
    for(const q of b2hxN(n,i))if(b[q]===c&&!prev.has(q)){prev.set(q,i);start.push(q);}}return null;}
// the fewest stones side s still needs (own stones cost nothing, two own stones joined by a free bridge count as joined)
const B2HXBR=[[-1,-1,2,[-1,0],[0,-1]],[-2,1,0,[-1,0],[-1,1]],[-1,2,0,[-1,1],[0,1]],[1,1,0,[0,1],[1,0]],[2,-1,0,[1,-1],[1,0]],[1,-2,0,[0,-1],[1,-1]]];
function b2hxDist(b,n,s){const c=String(s),e=String(1-s),N=n*n,D=new Int16Array(N).fill(999);const dq=[];
  const push=(i,v,front)=>{if(v<D[i]){D[i]=v;front?dq.unshift(i):dq.push(i);}};
  for(let k=0;k<n;k++){const i=s?k*n:k;if(b[i]!==e)push(i,b[i]===c?0:1,b[i]===c);
    // a stone on the second line with both edge points free is already joined to the edge
    const j=s?k*n+1:n+k;if(b[j]===c){const a=s?[k*n,(k+1)*n]:[k,k+1];if(a.every(x=>x>=0&&x<N&&(s?x%n===0:x<n)&&b[x]==='.'))push(j,0,true);}}
  while(dq.length){const i=dq.shift(),v=D[i],r=i/n|0,cc=i%n;if(s?cc===n-1:r===n-1)return v;
    if(b[i]===c&&(s?cc===n-2&&r>0&&b[i+1]==='.'&&b[i-n+1]==='.':r===n-2&&cc>0&&b[i+n]==='.'&&b[i+n-1]==='.'))return v;
    for(const q of b2hxN(n,i)){if(b[q]===e)continue;push(q,v+(b[q]===c?0:1),b[q]===c);}
    if(b[i]===c)for(const [dr,dc,,x,y] of B2HXBR){const rr=r+dr,c2=cc+dc,ra=r+x[0],ca=cc+x[1],rb=r+y[0],cb=cc+y[1];
      if(rr<0||rr>=n||c2<0||c2>=n||ra<0||ra>=n||ca<0||ca>=n||rb<0||rb>=n||cb<0||cb>=n)continue;const q=rr*n+c2;
      if(b[q]===c&&b[ra*n+ca]==='.'&&b[rb*n+cb]==='.')push(q,v,true);}}
  let best=999;for(let k=0;k<n;k++){const i=s?k*n+n-1:(n-1)*n+k;if(D[i]<best)best=D[i];}return best;}
const b2hxEv=(b,n,s)=>{const me=b2hxDist(b,n,s),op=b2hxDist(b,n,1-s);if(me===0||op>=999)return 1e5;if(op===0||me>=999)return -1e5;return (op-me)*100;};
function b2hxThink(d,lv){const n=d.n,s=d.sd,c=String(s),b=d.b,N=n*n;const free=[];for(let i=0;i<N;i++)if(b[i]==='.')free.push(i);
  if(!d.nmv){const ctr=(n-1)/2;const ring=free.filter(i=>{const r=i/n|0,k=i%n,dd=Math.max(Math.abs(r-ctr),Math.abs(k-ctr));return dd>=1.5&&dd<=2.5;});return {i:b2Rnd(ring)};}
  // the second side swaps a strong first stone (one near the middle)
  if(d.nmv===1&&!d.swp&&lv>1){const f=b.search(/[01]/),r=f/n|0,k=f%n,ctr=(n-1)/2;if(Math.max(Math.abs(r-ctr),Math.abs(k-ctr))<=n/4)return {swap:1};}
  const ns=[0,140,40,4][lv];const sc=free.map(i=>{const nb=setAt(b,i,c);return {i,v:b2hxEv(nb,n,s)+Math.random()*ns};}).sort((x,y)=>y.v-x.v);
  if(lv<3||sc[0].v>5e4)return sc[0];
  let best=sc[0],bv=-Infinity,budget=1600;const o=String(1-s);
  for(const m of sc.slice(0,10)){const nb=setAt(b,m.i,c);let worst=Infinity;
    const rep=[];for(let i=0;i<N;i++)if(nb[i]==='.')rep.push(i);
    for(const r of rep){if(budget--<=0)break;const v=b2hxEv(setAt(nb,r,o),n,s);if(v<worst)worst=v;if(worst<=bv)break;}
    if(worst>bv){bv=worst;best=m;}if(budget<=0)break;}
  return best;}
function b2hxDo(d,m){const s=d.sd,n=d.n;
  if(m.swap){const f=d.b.search(/[01]/),r=f/n|0,k=f%n,t=k*n+r;const b=setAt(setAt(d.b,f,'.'),t,'1');return b2Pass(d,s,{b,swp:1,lm:[t],nmv:(d.nmv||0)+1,last:`${tmName(d,s)} بدّل: صار الحجر الأول له`});}
  const b=setAt(d.b,m.i,String(s));const ln=b2hxWin(b,n,s);const x={...d,b,lm:[m.i],nmv:(d.nmv||0)+1,last:`${tmName(d,s)} حط حجر`};
  if(ln)return b2Won({...x,ln},s,'join');return b2Pass(x,s);}
const b2hxGeo=n=>{const w=10,h=w*.866,W=(n-1)*w*1.5+w*2+4,H=(n-1)*h+h*2+4;const xy=[...Array(n*n)].map((_,i)=>{const r=i/n|0,c=i%n;return [w+2+c*w+r*w/2,h+2+r*h];});return {w,h,W,H,xy};};
const B2HXBG={};
function b2hxBg(n){if(B2HXBG[n])return B2HXBG[n];const {w,W,H,xy}=b2hxGeo(n);const R=w/1.732;
  const hexP=([x,y])=>[0,1,2,3,4,5].map(k=>{const a=Math.PI/6+k*Math.PI/3;return `${(x+R*Math.cos(a)).toFixed(2)},${(y+R*Math.sin(a)).toFixed(2)}`;}).join(' ');
  let g='';for(let i=0;i<n*n;i++)g+=`<polygon points="${hexP(xy[i])}"/>`;
  const p=(i,dx,dy)=>`${(xy[i][0]+dx).toFixed(1)} ${(xy[i][1]+dy).toFixed(1)}`;
  const top=`M${p(0,-w*.5,-R*1.1)}L${p(n-1,w*.5,-R*1.1)}`,bot=`M${p(n*n-n,-w*.5,R*1.1)}L${p(n*n-1,w*.5,R*1.1)}`,lef=`M${p(0,-w*.62,-R*.4)}L${p(n*n-n,-w*.62,R*.4)}`,rig=`M${p(n-1,w*.62,-R*.4)}L${p(n*n-1,w*.62,R*.4)}`;
  return B2HXBG[n]=`<svg viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" aria-hidden="true"><path d="${top}${bot}" class="b2hr"/><path d="${lef}${rig}" class="b2hb"/><g class="b2hc">${g}</g></svg>`;}
const B2HXN=['الأحمر','الأزرق'];
GAMES.b_hex={...B2TEAM,name:'السداسي',cat:'board',lbc:'#C2453A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F2E3C6"/><path d="M8 18H70" stroke="#D8473C" stroke-width="7" stroke-linecap="round"/><path d="M30 84H92" stroke="#D8473C" stroke-width="7" stroke-linecap="round"/><path d="M8 26L30 76" stroke="#2F7DB3" stroke-width="7" stroke-linecap="round"/><path d="M70 26L92 76" stroke="#2F7DB3" stroke-width="7" stroke-linecap="round"/>${[[30,32],[42,44],[48,58],[60,70]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#D8473C"/>`).join('')}${[[24,52],[60,42],[72,50]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#2F7DB3"/>`).join('')}</svg>`,
  init:()=>({n:9,b:'.'.repeat(81),sd:0,tr:[0,0],swp:0,nmv:0,lm:null,ln:null,mvn:0,last:''}),
  onTimeout(d){const free=[...d.b].map((v,i)=>v==='.'?i:-1).filter(i=>i>=0);return b2hxDo(d,{i:b2Rnd(free)});},
  points:d=>d.pl.map((_,s)=>s%2?'🔵 يمين ويسار':'🔴 فوق وتحت'),
  winText:d=>b2WinTxt(d,B2HXN,{join:'وصل الطرفين'}),
  status:(d,ctx)=>b2Stat(d,ctx,B2HXN,d.sd?'• وصّل اليمين باليسار':'• وصّل فوق بتحت',-1).replace('class="chside ','class="chside hx'+d.sd+' '),
  render(d,ctx){const my=ctx.my,n=d.n,{W,H,xy,w}=b2hxGeo(n);const ln=new Set(d.ln||[]);
    const pts=xy.map(([x,y],i)=>{const v=d.b[i];const tap=my&&v==='.';return {q:i,x,y,i:tap?i:null,c:(d.lm&&d.lm[0]===i?'lm lmt':'')+(ln.has(i)?' won':''),p:v!=='.'?`<i class="b2s hx${v}"></i>`:''};});
    let h=b2Board('b2hx bd-b2',W,H,w*.98,b2hxBg(n),pts,false,my);
    if(my&&d.nmv===1&&d.sd===1&&!d.swp)h+='<div class="row chact"><button class="btn green" data-ga="swap">بدّل (خذ الحجر الأول)</button></div>';
    if(my&&!d.nmv)h+=`<div class="row chact"><button class="btn ${n===9?'green':''}" data-ga="size" data-i="9">لوحة 9×9</button><button class="btn ${n===11?'green':''}" data-ga="size" data-i="11">لوحة 11×11</button></div>`;
    return h+b2ResignBtn(ctx);},
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);
    if(a==='size'){if(!d.nmv&&(i===9||i===11)&&i!==d.n)act({...d,n:i,b:'.'.repeat(i*i),mvn:(d.mvn||0)+1,last:`صارت اللوحة ${i}×${i}`});return;}
    if(a==='swap'){if(d.nmv===1&&d.sd===1&&!d.swp)act(b2hxDo(d,{swap:1}));return;}
    if(a==='pt'&&d.b[i]==='.')act(b2hxDo(d,{i}));},
  bot(d,s,lv){return b2hxDo(d,b2hxThink(d,lv));},
  botDelay:()=>500+rnd(400)};
HELP.b_hex='السداسي (هيكس): لوحة معيّن من خلايا سداسية (9×9 أو 11×11 تختارونها قبل أول حجر). الأحمر يبي يوصّل الطرف اللي فوق بالطرف اللي تحت، والأزرق يوصّل اليمين باليسار. كل دور تحط حجر واحد في أي خلية فاضية، والحجر ما يتحرك ولا ينأكل. أول واحد يسوي سلسلة متصلة من حجاره بين طرفيه يفوز، وما فيه تعادل أبد. عشان البداية تكون عادلة: بعد أول حجر للأحمر، الأزرق يقدر يضغط «بدّل» وياخذ الحجر الأول لنفسه (ينقلب لونه وينعكس مكانه لجهته)، وبعدها يلعب الأحمر. الأحمر يبدأ. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= قو: go 9×9 ================= */
// area scoring (stones plus surrounded points), komi 7.5 for white, no suicide, simple ko. Two passes in a row stop play:
// the dead stones are marked (a guess first), both sides agree, and the score is counted. Black (side 0) starts
const B2GN=9,B2GK=7.5;
const B2GNB=[...Array(81)].map((_,i)=>{const r=i/9|0,c=i%9,o=[];if(r>0)o.push(i-9);if(r<8)o.push(i+9);if(c>0)o.push(i-1);if(c<8)o.push(i+1);return o;});
function b2goGroup(a,i){const c=a[i],st=[i],seen=new Set([i]);let libs=0;const ls=new Set();
  for(let k=0;k<st.length;k++){for(const q of B2GNB[st[k]]){if(seen.has(q))continue;if(a[q]==='.'){if(!ls.has(q)){ls.add(q);libs++;}}else if(a[q]===c){seen.add(q);st.push(q);}}}return {st,libs};}
// a stone of side s at i: the new board and the stones taken, or null (taken point, suicide, ko)
function b2goPlay(b,i,s,ko){if(b[i]!=='.'||i===ko)return null;const a=[...b],c=String(s),e=String(1-s);a[i]=c;const caps=[];
  for(const q of B2GNB[i])if(a[q]===e){const g=b2goGroup(a,q);if(!g.libs)for(const x of g.st){a[x]='.';caps.push(x);}}
  const g=b2goGroup(a,i);if(!g.libs)return null;let nko=-1;if(caps.length===1&&g.st.length===1&&g.libs===1)nko=caps[0];return {b:a.join(''),caps,ko:nko};}
const b2goLegal=(b,s,ko)=>{const o=[];for(let i=0;i<81;i++)if(b[i]==='.'&&b2goPlay(b,i,s,ko))o.push(i);return o;};
// area: alive stones, and the empty (or dead) regions that touch one colour only
function b2goArea(b,dead){const a=[...b].map((v,i)=>dead&&dead[i]==='1'?'.':v),own=Array(81).fill(-1),sc=[0,0],seen=new Uint8Array(81);
  for(let i=0;i<81;i++){if(a[i]!=='.'){own[i]=+a[i];sc[+a[i]]++;continue;}if(seen[i])continue;const st=[i],reg=[];seen[i]=1;const who=new Set();
    while(st.length){const q=st.pop();reg.push(q);for(const x of B2GNB[q]){if(a[x]==='.'){if(!seen[x]){seen[x]=1;st.push(x);}}else who.add(+a[x]);}}
    if(who.size===1){const w=[...who][0];sc[w]+=reg.length;for(const q of reg)own[q]=w;}}
  return {sc,own};}
/* fast playouts on a typed board (0 empty, 1 black, 2 white) for the bots and the dead-stone guess */
function b2goMC(){const B=new Int8Array(81),mark=new Int32Array(81);let gen=1;
  const libs=(i)=>{const c=B[i];gen++;const st=[i];mark[i]=gen;let L=0;const lm=gen;while(st.length){const q=st.pop();for(const x of B2GNB[q]){if(mark[x]===lm)continue;if(B[x]===0){mark[x]=lm;L++;if(L>1)return L;}else if(B[x]===c){mark[x]=lm;st.push(x);}}}return L;};
  const kill=(i)=>{const c=B[i],st=[i];B[i]=0;let n=1;while(st.length){const q=st.pop();for(const x of B2GNB[q])if(B[x]===c){B[x]=0;n++;st.push(x);}}return n;};
  const eye=(i,c)=>{for(const x of B2GNB[i])if(B[x]!==c)return false;return true;};
  // play colour c (1/2) at i if legal and not filling its own eye: true when played
  const play=(i,c,ko)=>{if(B[i]!==0||i===ko.v||eye(i,c))return false;B[i]=c;const e=3-c;let took=0,last=-1;
    for(const x of B2GNB[i])if(B[x]===e&&libs(x)===0){took+=kill(x);last=x;}
    if(libs(i)===0){B[i]=0;return false;}ko.v=took===1&&libs(i)===1?last:-1;return true;};
  return {B,play,
    run(b,c0,ko0,first,maxM){for(let i=0;i<81;i++)B[i]=b[i]==='.'?0:b[i]==='0'?1:2;const ko={v:ko0};let c=c0,ps=0;const seq=[];
      if(first!=null){if(first>=0){if(!play(first,c,ko))return null;}seq.push(first);c=3-c;}
      const emp=[];for(let k=0;k<maxM&&ps<2;k++){emp.length=0;for(let i=0;i<81;i++)if(B[i]===0)emp.push(i);let done=false;
        for(let t=emp.length;t>0;t--){const j=Math.floor(Math.random()*t);const i=emp[j];emp[j]=emp[t-1];if(play(i,c,ko)){seq.push(i*4+c);done=true;break;}}
        ps=done?0:ps+1;c=3-c;}
      return seq;},
    // owner of each point at the end of a playout: a stone, or the colour around an empty point
    owner(){const o=new Int8Array(81);for(let i=0;i<81;i++){if(B[i]){o[i]=B[i];continue;}let a=0;for(const x of B2GNB[i])a|=B[x];o[i]=a===1||a===2?a:0;}return o;}};}
// a guess at the dead stones: those whose point ends as the other colour's in most playouts
function b2goDead(b,s,ko,n){const M=b2goMC(),cnt=new Int16Array(81*3);for(let k=0;k<n;k++){M.run(b,s+1,ko,null,160);const o=M.owner();for(let i=0;i<81;i++)cnt[i*3+o[i]]++;}
  return [...b].map((v,i)=>v==='.'?'0':(cnt[i*3+(v==='0'?2:1)]>n*.6?'1':'0')).join('');}
function b2goScore(d){const A=b2goArea(d.b,d.dead);return [A.sc[0],A.sc[1]+B2GK];}
function b2goToMark(d,why){const dead=b2goDead(d.b,d.sd,d.ko,70);return {...d,ph:'mark',dead,ok:0,ps:0,mvn:(d.mvn||0)+1,last:why};}
function b2goDo(d,m){const s=d.sd;
  if(m.pass){const ps=(d.ps||0)+1;const nd=b2Pass(d,s,{ps,ko:-1,lm:null,lc:[],nmv:(d.nmv||0)+1,last:`${tmName(d,s)} مرّر`});
    return ps>=2?b2goToMark(nd,'مرّروا الاثنين: علّموا الحجار الميتة ووافقوا على النتيجة'):nd;}
  const r=b2goPlay(d.b,m.i,s,d.ko);if(!r)return d;const cap=[...d.cap];cap[s]+=r.caps.length;
  const nd=b2Pass(d,s,{b:r.b,ko:r.ko,ps:0,cap,lm:[m.i],lc:r.caps.map(q=>[q,s?1:0]),nmv:(d.nmv||0)+1,last:`${tmName(d,s)} حط حجر${r.caps.length?` وأكل ${r.caps.length}`:''}`});
  return nd.nmv>=240?b2goToMark(nd,'طالت اللعبة: علّموا الحجار الميتة ووافقوا على النتيجة'):nd;}
function b2goTog(d,i){if(d.b[i]==='.')return d;const g=b2goGroup([...d.b],i).st;const v=d.dead[i]==='1'?'0':'1';let dead=d.dead;for(const q of g)dead=setAt(dead,q,v);return {...d,dead,ok:0,mvn:(d.mvn||0)+1,last:`${tmName(d,d.sd)} غيّر علامة مجموعة`};}
function b2goOk(d){const s=d.sd;if(!d.ok)return b2Pass(d,s,{ok:1,last:`${tmName(d,s)} وافق على النتيجة، الحين دور الثاني`});
  const [k,w]=b2goScore(d);return b2Won({...d,res:[k,w]},k>w?0:1,'score');}
function b2goResume(d){return {...d,ph:'play',dead:null,ok:0,ps:0,rz:(d.rz||0)+1,mvn:(d.mvn||0)+1,last:`${tmName(d,d.sd)} يبي يكمّل اللعب`};}
// the bot: flat Monte Carlo with all-moves-as-first (AMAF) statistics, a fixed number of playouts per level
function b2goThink(d,lv){const s=d.sd,me=s+1,b=d.b;const cands=b2goLegal(b,s,d.ko).filter(i=>{for(const q of B2GNB[i])if(b[q]!==String(s))return true;return false;});
  if(!cands.length)return {pass:1};const N=[0,120,500,1400][lv]||500,M=b2goMC();
  const K=cands.length,W=new Float32Array(K),V=new Float32Array(K),AW=new Float32Array(81),AV=new Float32Array(81),idx=new Int16Array(81).fill(-1);cands.forEach((i,k)=>{idx[i]=k;});
  let total=0;const win=()=>{const o=M.owner();let sc=0;for(let i=0;i<81;i++)if(o[i]===1)sc++;else if(o[i]===2)sc--;sc-=B2GK;return me===1?sc>0:sc<0;};
  for(let n=0;n<N;n++){let k;if(n<K)k=n;else{let bv=-1;for(let j=0;j<K;j++){const v=W[j]/V[j]+.6*Math.sqrt(Math.log(total)/V[j]);if(v>bv){bv=v;k=j;}}}
    const seq=M.run(b,me,d.ko,cands[k],140);total++;if(!seq){V[k]++;continue;}const w=win()?1:0;V[k]++;W[k]+=w;
    const seen=new Uint8Array(81);for(let j=1;j<seq.length;j++){const x=seq[j],i=x>>2,c=x&3;if(c!==me||seen[i])continue;seen[i]=1;if(idx[i]>=0){AV[i]++;AW[i]+=w;}}}
  let best=0,bv=-1,top=0;for(let k=0;k<K;k++){const i=cands[k],bt=Math.sqrt(300/(3*V[k]+300));const mc=W[k]/V[k],am=AV[i]?AW[i]/AV[i]:mc;const v=(1-bt)*mc+bt*am+(lv===1?Math.random()*.25:0);if(v>bv){bv=v;best=k;}if(mc>top)top=mc;}
  // nothing worth playing: pass (also when the other side passed and the board is already won)
  if(top<.04&&d.nmv>30)return {pass:1};if(d.ps&&d.nmv>20){const [k,w]=b2goScore({...d,dead:b2goDead(b,s,d.ko,40)});if(s?w>k:k>w)return {pass:1};}
  return {i:cands[best]};}
const B2GXY=[...Array(81)].map((_,i)=>[6+(i%9)*11,6+(i/9|0)*11]);
const B2GBG=`<svg viewBox="0 0 100 100" aria-hidden="true"><g class="b2ln">${[...Array(9)].map((_,k)=>b2Line([6,6+k*11],[94,6+k*11])+b2Line([6+k*11,6],[6+k*11,94])).join('')}</g><g class="b2dt">${[20,24,56,60,40].map(i=>`<circle cx="${B2GXY[i][0]}" cy="${B2GXY[i][1]}" r="1.3"/>`).join('')}</g></svg>`;
const B2GON=['الأسود','الأبيض'];
GAMES.b_go={...B2TEAM,name:'قو',cat:'board',lbc:'#3B3B3B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E3B76B"/><g stroke="#6B4A1E" stroke-width="2">${[0,1,2,3,4].map(k=>`<path d="M${14+k*18} 14V86M14 ${14+k*18}H86"/>`).join('')}</g>${[[32,32],[50,32],[32,50],[68,68]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8" fill="#22272E"/>`).join('')}${[[50,50],[68,50],[50,68]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8" fill="#FBFAF5" stroke="#8A7350" stroke-width="1.2"/>`).join('')}</svg>`,
  init:()=>({b:'.'.repeat(81),sd:0,tr:[0,0],ko:-1,ps:0,cap:[0,0],ph:'play',dead:null,ok:0,rz:0,nmv:0,lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){if(d.ph==='mark')return b2goOk(d);const ms=b2goLegal(d.b,d.sd,d.ko).filter(i=>B2GNB[i].some(q=>d.b[q]!==String(d.sd)));return b2goDo(d,ms.length?{i:b2Rnd(ms)}:{pass:1});},
  points:d=>d.pl.map((_,s)=>`${s%2?'⚪':'⚫'} أكل ${d.cap[s%2]}`),
  winText(d){if(d.end==='score'&&d.res){const [k,w]=d.res;return `فاز ${k>w?'الأسود':'الأبيض'}: ${k} مقابل ${w}`;}return b2WinTxt(d,B2GON,{});},
  status(d,ctx){if(d.ph==='mark'){const [k,w]=b2goScore(d);return b2Stat(d,ctx,B2GON,`<br><small>اضغط مجموعة عشان تعلّمها ميتة أو حية • الأسود ${k}، الأبيض ${w}</small>`,0);}
    return b2Stat(d,ctx,B2GON,d.ps?'<br><small>الخصم مرّر: إذا مرّرت تنتهي اللعبة</small>':'',0);},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=b2Flip(d,ctx);const mark=d.ph==='mark';const lg=my&&!mark?new Set(b2goLegal(d.b,s,d.ko)):new Set();
    const own=mark?b2goArea(d.b,d.dead).own:null;
    const pts=B2GXY.map(([x,y],i)=>{const v=d.b[i];const dd=mark&&d.dead&&d.dead[i]==='1';const tap=my&&(mark?v!=='.':lg.has(i));
      let p=v!=='.'?b2Stone(v==='0'?1:0,'go'+(dd?' dead':'')):b2Ghost(d,i).replace(' b2gh',' go b2gh');
      if(mark&&own[i]>=0&&(v==='.'||dd))p+=`<u class="b2tr t${own[i]}"></u>`;
      return {q:i,x,y,i:tap?i:null,c:(d.lm&&d.lm[0]===i?'lm lmt':'')+(i===d.ko&&!mark?' ko':'')+(tap&&!mark?' gp':''),p};});
    let h=b2Board('b2go bd-b2',100,100,10.6,B2GBG,pts,flip,my);
    if(my&&mark)h+=`<div class="row chact"><button class="btn green" data-ga="ok">${d.ok?'أوافق، احسبوا النتيجة':'موافق على العلامات'}</button><button class="btn" data-ga="resume">كمّلوا اللعب</button></div>`;
    else if(my)h+=`<div class="row chact"><button class="btn" data-ga="pass">مرّر</button><button class="btn" data-ga="resign">استسلم</button></div>`;
    return h;},
  after:d=>b2Fly('go',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);
    if(d.ph==='mark'){if(a==='pt')act(b2goTog(d,i));else if(a==='ok')act(b2goOk(d));else if(a==='resume')act(b2goResume(d));return;}
    if(a==='pass'){act(b2goDo(d,{pass:1}));return;}if(a==='pt'&&b2goPlay(d.b,i,d.sd,d.ko))act(b2goDo(d,{i}));},
  bot(d,s,lv){if(d.ph==='mark'){const est=b2goDead(d.b,d.sd,-1,lv===1?30:90);
      // its own guess first; once the other side agreed it accepts, unless that marking loses a game it would win
      if(d.ok){if(lv>1&&(d.rz||0)<2){const me=d.sd,[k,w]=b2goScore(d),[k2,w2]=b2goScore({...d,dead:est});if((me?w>k:k>w)!==(me?w2>k2:k2>w2)&&(me?w2>k2:k2>w2))return b2goResume(d);}return b2goOk(d);}
      return b2goOk({...d,dead:est});}
    return b2goDo(d,b2goThink(d,lv));},
  botDelay:()=>500+rnd(400)};
HELP.b_go='قو (لوحة 9×9): الأسود يبدأ، وكل دور تحط حجر على تقاطع فاضي، والحجر ما يتحرك. الحجار المتلاصقة بالخطوط مجموعة وحدة، والتقاطعات الفاضية اللي جنبها «أنفاس». إذا سكّرت كل أنفاس مجموعة للخصم تاكلها وتشيلها. ما يجوز تحط حجر ما له أنفاس إلا إذا ياكل. «الكو»: ما يجوز ترجع تاكل حجر واحد مكان ما انأكل منك على طول (العب مكان ثاني أول). تقدر تمرّر دورك، وإذا مرّر الاثنين ورا بعض توقف اللعبة: تطلع علامة على الحجار الميتة (تقدرون تعدلونها بالضغط عليها)، وكل واحد يوافق، وبعدها تنحسب النتيجة بالمساحة: حجارك الحية + التقاطعات الفاضية اللي محاوطها أنت بس. الأبيض ياخذ 7.5 نقطة زيادة (كومي) لأن الأسود بدأ، فما فيه تعادل. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= الشطرنج الصيني: xiangqi ================= */
// 9 files × 10 ranks of points, row 0 at the top (black). Upper case red (side 0, starts, bottom), lower case black.
// K general, A advisor, E elephant, H horse, R chariot, C cannon, P soldier
const B2XQ0='rheakaehr'+'.........'+'.c.....c.'+'p.p.p.p.p'+'.........'+'.........'+'P.P.P.P.P'+'.C.....C.'+'.........'+'RHEAKAEHR';
const b2xqSide=p=>p==='.'?-1:p<'a'?0:1;
const b2xqPal=(r,c,s)=>c>=3&&c<=5&&(s?r<=2:r>=7);
const B2XQO=[[-1,0],[1,0],[0,-1],[0,1]],B2XQX=[[-1,-1],[-1,1],[1,-1],[1,1]];
const B2XQH=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];// target, leg
function b2xqPseudo(B,s){const o=[];
  for(let f=0;f<90;f++){const p=B[f];if(b2xqSide(p)!==s)continue;const r=f/9|0,c=f%9,t=p.toLowerCase();
    const add=(rr,cc)=>{if(rr<0||rr>9||cc<0||cc>8)return;const q=rr*9+cc;if(b2xqSide(B[q])!==s)o.push(f*90+q);};
    if(t==='k'){for(const [dr,dc] of B2XQO)if(b2xqPal(r+dr,c+dc,s))add(r+dr,c+dc);}
    else if(t==='a'){for(const [dr,dc] of B2XQX)if(b2xqPal(r+dr,c+dc,s))add(r+dr,c+dc);}
    else if(t==='e'){for(const [dr,dc] of B2XQX){const rr=r+2*dr,cc=c+2*dc;if(rr<0||rr>9||cc<0||cc>8||(s?rr>4:rr<5))continue;if(B[(r+dr)*9+c+dc]==='.')add(rr,cc);}}
    else if(t==='h'){for(const [dr,dc,lr,lc] of B2XQH){const rr=r+dr,cc=c+dc;if(rr<0||rr>9||cc<0||cc>8)continue;if(B[(r+lr)*9+c+lc]==='.')add(rr,cc);}}
    else if(t==='r'||t==='c'){for(const [dr,dc] of B2XQO){let rr=r+dr,cc=c+dc,jump=false;while(rr>=0&&rr<=9&&cc>=0&&cc<=8){const q=rr*9+cc,v=B[q];
          if(!jump){if(v==='.')o.push(f*90+q);else{if(t==='r'){if(b2xqSide(v)!==s)o.push(f*90+q);break;}jump=true;}}
          else if(v!=='.'){if(b2xqSide(v)!==s)o.push(f*90+q);break;}rr+=dr;cc+=dc;}}}
    else{const fw=s?1:-1;add(r+fw,c);if(s?r>=5:r<=4){add(r,c-1);add(r,c+1);}}}
  return o;}
// is the point sq attacked by side `by` (used for the generals: a general seen down an open file counts too)
function b2xqAtt(B,sq,by){const r=sq/9|0,c=sq%9;const R=by?'r':'R',C=by?'c':'C',K=by?'k':'K',H=by?'h':'H',P=by?'p':'P';
  for(const [dr,dc] of B2XQO){let rr=r+dr,cc=c+dc,n=0;while(rr>=0&&rr<=9&&cc>=0&&cc<=8){const v=B[rr*9+cc];if(v!=='.'){if(n===0){if(v===R||(v===K&&dc===0))return true;}else{if(v===C)return true;break;}n++;}rr+=dr;cc+=dc;}}
  for(const [dr,dc,lr,lc] of B2XQH){const hr=r-dr,hc=c-dc;if(hr<0||hr>9||hc<0||hc>8||B[hr*9+hc]!==H)continue;if(B[(hr+lr)*9+hc+lc]==='.')return true;}
  const pr=by?r-1:r+1;if(pr>=0&&pr<=9&&B[pr*9+c]===P)return true;
  for(const dc of [-1,1]){const cc=c+dc;if(cc<0||cc>8)continue;if(B[r*9+cc]===P&&(by?r>=5:r<=4))return true;}
  return false;}
function b2xqLegal(b,s){const B=[...b],K=s?'k':'K',o=[];for(const m of b2xqPseudo(B,s)){const f=(m/90)|0,t=m%90,cap=B[t];B[t]=B[f];B[f]='.';
    const k=B[t]===K?t:B.indexOf(K);if(!b2xqAtt(B,k,1-s))o.push(m);B[f]=B[t];B[t]=cap;}return o;}
const b2xqCheck=(b,s)=>b2xqAtt([...b],b.indexOf(s?'k':'K'),1-s);
const b2xqMat=b=>/[RHCPrhcp]/.test(b);
const B2XQV={k:0,a:200,e:200,h:400,r:900,c:450,p:100};
function b2xqScore(B){let v=0;for(let i=0;i<90;i++){const p=B[i];if(p==='.')continue;const t=p.toLowerCase(),s=p===t?1:0,r=i/9|0,c=i%9;let x=B2XQV[t];
    if(t==='p'){const adv=s?r-3:6-r;if(adv>=2)x+=70+(c>=3&&c<=5?30:0)+(adv>=4&&adv<=6?20:0);}
    else if(t==='h'){x+=12-(Math.abs(c-4)+Math.abs(r-4.5))*3;}
    else if(t==='c'&&c===4)x+=15;else if(t==='r'){const adv=s?r:9-r;if(adv>=5)x+=15;}
    v+=s?-x:x;}return v;}
function b2xqThink(d,lv){const B=[...d.b];let side=d.sd,nodes=0,lim=Infinity;const STOP={},Ks=[B.indexOf('K'),B.indexOf('k')];
  const cap=[0,2500,15000,45000][lv],maxD=[0,1,3,6][lv],ns=[0,160,30,4][lv],qsOn=lv>1;
  const make=m=>{const f=(m/90)|0,t=m%90,u={f,t,c:B[t]};B[t]=B[f];B[f]='.';if(B[t]==='K')Ks[0]=t;else if(B[t]==='k')Ks[1]=t;side=1-side;return u;};
  const undo=u=>{side=1-side;B[u.f]=B[u.t];B[u.t]=u.c;if(B[u.f]==='K')Ks[0]=u.f;else if(B[u.f]==='k')Ks[1]=u.f;};
  const bad=()=>b2xqAtt(B,Ks[1-side],side);// the side that just moved left its general attacked
  const sorted=ms=>{const a=ms.map(m=>{const t=m%90,v=B[t];return {m,o:v==='.'?0:B2XQV[v.toLowerCase()]*10-B2XQV[B[(m/90)|0].toLowerCase()]/10+1};});a.sort((x,y)=>y.o-x.o);return a;};
  const ev=()=>{const v=b2xqScore(B);return side?-v:v;};
  function qs(a,b,ply){if(++nodes>lim)throw STOP;const st=ev();if(!qsOn||st>=b||ply>16)return st;if(st>a)a=st;
    for(const {m,o} of sorted(b2xqPseudo(B,side))){if(o<=0)break;const u=make(m);if(bad()){undo(u);continue;}const v=-qs(-b,-a,ply+1);undo(u);if(v>=b)return v;if(v>a)a=v;}return a;}
  function nega(dep,a,b,ply){if(++nodes>lim)throw STOP;const inC=b2xqAtt(B,Ks[side],1-side);if(inC&&ply<8)dep++;if(dep<=0)return qs(a,b,ply);
    let any=false,best=-Infinity;for(const {m} of sorted(b2xqPseudo(B,side))){const u=make(m);if(bad()){undo(u);continue;}any=true;const v=-nega(dep-1,-b,-a,ply+1);undo(u);
      if(v>best)best=v;if(v>a)a=v;if(a>=b)break;}
    return any?best:-(B2W-ply);}// no move at all loses, in check or not
  const root=b2xqLegal(d.b,side).map(m=>({m,n:Math.random()*ns,v:0}));if(!root.length)return null;if(root.length===1)return root[0].m;
  let best=root[0].m;
  for(let dep=1;dep<=maxD;dep++){lim=dep===1?Infinity:cap;let bv=-Infinity,bm=null;
    try{for(const o of root){const u=make(o.m);try{o.v=-nega(dep-1,-Infinity,-(bv-o.n),1)+o.n;}finally{undo(u);}if(o.v>bv){bv=o.v;bm=o.m;}}}
    catch(e){if(e!==STOP)throw e;if(bm!=null)best=bm;break;}
    best=bm;root.sort((x,y)=>y.v-x.v);if(Math.abs(bv)>B2W/2)break;}
  return best;}
const B2XQN={k:'الملك',a:'المستشار',e:'الفيل',h:'الحصان',r:'العربة',c:'المدفع',p:'الجندي'};
const B2XQC={K:'帥',A:'仕',E:'相',H:'傌',R:'俥',C:'炮',P:'兵',k:'將',a:'士',e:'象',h:'馬',r:'車',c:'砲',p:'卒'};
function b2xqDo(d,m){const s=d.sd,f=(m/90)|0,t=m%90,p=d.b[f],cap=d.b[t];const b=b2m9Set(d.b,f,t,p);const quiet=cap!=='.'?0:(d.quiet||0)+1;
  const key=b+(1-s);const hist=cap!=='.'?[key]:[...(d.hist||[]),key].slice(-120);
  const nd=b2Pass(d,s,{b,quiet,hist,lm:[f,t],lc:cap!=='.'?[[t,1-s]]:[],last:`${tmName(d,s)} حرّك ${B2XQN[p.toLowerCase()]}${cap!=='.'?' وأكل '+B2XQN[cap.toLowerCase()]:''}`});
  if(!b2xqLegal(b,1-s).length)return {...nd,...tmWin(d,s),end:b2xqCheck(b,1-s)?'mate':'stale'};
  if(!b2xqMat(b))return {...nd,win:'d',end:'mat'};if(quiet>=120)return {...nd,win:'d',end:'q'};if(b2Rep(hist,key)>=3)return {...nd,win:'d',end:'rep'};
  if(b2xqCheck(b,1-s))nd.last+=' • كش';return nd;}
const B2XQXY=[...Array(90)].map((_,i)=>[6+(i%9)*11,6+(i/9|0)*11]);
const B2XQBG=(()=>{const P=(c,r)=>[6+c*11,6+r*11];let g='';for(let r=0;r<10;r++)g+=b2Line(P(0,r),P(8,r));
  for(let c=0;c<9;c++){if(c===0||c===8)g+=b2Line(P(c,0),P(c,9));else{g+=b2Line(P(c,0),P(c,4))+b2Line(P(c,5),P(c,9));}}
  g+=b2Line(P(3,0),P(5,2))+b2Line(P(5,0),P(3,2))+b2Line(P(3,7),P(5,9))+b2Line(P(5,7),P(3,9));
  return `<svg viewBox="0 0 100 111" aria-hidden="true"><g class="b2ln">${g}</g><text x="28" y="57.6" class="b2rv">النهر</text><text x="72" y="57.6" class="b2rv">النهر</text></svg>`;})();
const B2XQS=['الأحمر','الأسود'];
GAMES.b_xiangqi={...B2TEAM,name:'الشطرنج الصيني',cat:'board',lbc:'#B0342B',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#E8C27E"/><g stroke="#7A4A22" stroke-width="1.8">${[0,1,2,3,4].map(k=>`<path d="M${10+k*20} 6V94M6 ${10+k*20}H94"/>`).join('')}</g><circle cx="50" cy="66" r="19" fill="#FBF0DA" stroke="#B0342B" stroke-width="3"/><text x="50" y="75" font-size="24" font-weight="700" text-anchor="middle" fill="#B0342B">帥</text><circle cx="30" cy="28" r="14" fill="#FBF0DA" stroke="#2D3B4C" stroke-width="2.5"/><text x="30" y="35" font-size="18" font-weight="700" text-anchor="middle" fill="#2D3B4C">車</text><circle cx="72" cy="30" r="14" fill="#FBF0DA" stroke="#2D3B4C" stroke-width="2.5"/><text x="72" y="37" font-size="18" font-weight="700" text-anchor="middle" fill="#2D3B4C">馬</text></svg>`,
  init:()=>({b:B2XQ0,sd:0,tr:[0,0],quiet:0,hist:[],lm:null,lc:[],mvn:0,last:''}),
  onTimeout(d){return b2xqDo(d,b2Rnd(b2xqLegal(d.b,d.sd)));},
  points:d=>d.pl.map((_,s)=>s%2?'⚫ الأسود':'🔴 الأحمر'),
  winText:d=>b2WinTxt(d,B2XQS,{mate:'كش مات',stale:'الخصم ما عنده حركة',mat:'تعادل: ما بقى قطع تهاجم',q:'تعادل: 60 حركة لكل واحد بدون أكل',rep:'تعادل: نفس الوضع تكرر 3 مرات'}),
  status(d,ctx){const P=b2Sel(d);let t=b2xqCheck(d.b,d.sd)?' <b class="chk">كش!</b>':'';if(P&&d.b[P.f]!=='.')t+=`<br><small>اخترت ${B2XQN[d.b[P.f].toLowerCase()]}</small>`;return b2Stat(d,ctx,B2XQS,t);},
  render(d,ctx){const my=ctx.my,s=d.sd,flip=b2Flip(d,ctx),P=b2Sel(d),lg=my?b2xqLegal(d.b,s):[];const f=P?P.f:-1;
    const mv=new Set(lg.map(m=>(m/90)|0)),to=new Set(lg.filter(m=>((m/90)|0)===f).map(m=>m%90));const kc=b2xqCheck(d.b,s)?d.b.indexOf(s?'k':'K'):-1;
    const pts=B2XQXY.map(([x,y],i)=>{const v=d.b[i];const tap=my&&(mv.has(i)||to.has(i));const cs=b2Cls(d,i,{sel:f,to,mv:P?null:mv})+(i===kc?' kc':'')+(to.has(i)&&v!=='.'?' cap':'');
      const p=v!=='.'?`<i class="b2s xq s${b2xqSide(v)}"><b>${B2XQC[v]}</b></i>`:b2Ghost(d,i).replace('b2s ','b2s xq ');return {q:i,x,y,i:tap?i:null,c:cs,p};});
    return b2Board('b2xq bd-b2',100,111,10.2,B2XQBG,pts,flip,my)+'<p class="note b2xql">帥將 ملك • 仕士 مستشار • 相象 فيل • 傌馬 حصان • 俥車 عربة • 炮砲 مدفع • 兵卒 جندي</p>'+b2ResignBtn(ctx);},
  after:d=>b2Fly('xq',d),
  click(a,i,d,ctx){if(!ctx.my)return;if(a==='resign')return b2Resign(d);if(a!=='pt')return;const lg=b2xqLegal(d.b,d.sd),P=b2Sel(d);
    if(P){const m=lg.find(x=>((x/90)|0)===P.f&&x%90===i);if(m!=null){S.b2=null;act(b2xqDo(d,m));return;}}
    b2Pick(d,lg.some(x=>((x/90)|0)===i)&&(!P||P.f!==i)?{f:i}:null);},
  bot(d,s,lv){const m=b2xqThink(d,lv);return m!=null?b2xqDo(d,m):GAMES.b_xiangqi.onTimeout(d);},
  botDelay:()=>500+rnd(500)};
HELP.b_xiangqi='الشطرنج الصيني: القطع على التقاطعات، والأحمر تحت ويبدأ. الملك والمستشارين ما يطلعون من القصر (المربع اللي فيه الخطوط المائلة): الملك خطوة مستقيمة والمستشار خطوة مائلة. الفيل يمشي نقطتين مائل بالضبط وما يعدي النهر، وإذا النقطة اللي بالنص فيها قطعة ما يقدر. الحصان خطوة مستقيمة وبعدها خطوة مائلة، وإذا فيه قطعة لاصقة فيه بهالاتجاه ينسد طريقه. العربة مثل القلعة. المدفع يمشي مثل القلعة، بس عشان ياكل لازم يقفز فوق قطعة وحدة بالضبط. الجندي خطوة لقدام، وبعد ما يعدي النهر يقدر يمشي يمين ويسار بعد، وما يرجع. ما يجوز الملكين يواجهون بعض على نفس الخط بدون قطعة بينهم، ولا تخلي ملكك مكشوش. اللي ما عنده حركة يخسر (كش مات أو محبوس). تعادل إذا تكرر الوضع 3 مرات، أو 60 حركة لكل واحد بدون أكل، أو ما بقى قطع تهاجم. الحروف على القطع صينية: 帥將 ملك، 仕士 مستشار، 相象 فيل، 傌馬 حصان، 俥車 عربة، 炮砲 مدفع، 兵卒 جندي. إذا أكثر من لاعبين: فريقين يتناوبون.';

/* ================= القفز: star halma (Chinese checkers) ================= */
// 121 holes of a six-pointed star (cube coordinates q+r+s=0). Every side starts with 10 marbles in one point of the star
// and races them to the opposite point. 2..6 sides; with 7 or 8 players there are 4 sides and two players share a side
const B2HMP=(()=>{const P=[];for(let r=-8;r<=8;r++)for(let q=-8;q<=8;q++){const s=-q-r;if(Math.abs(s)>8)continue;if((q>=-4&&r>=-4&&s>=-4)||(q<=4&&r<=4&&s<=4))P.push([q,r,s]);}return P;})();
const B2HMI=new Map(B2HMP.map((p,i)=>[p[0]+','+p[1],i]));
const B2HMDR=[[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
const B2HMNB=B2HMP.map(([q,r])=>B2HMDR.map(([dq,dr])=>{const x=B2HMI.get((q+dq)+','+(r+dr));return x==null?-1:x;}));
const b2hmTri=(k,[q,r,s])=>[r<=-5,q>=5,s<=-5,r>=5,q<=-5,s>=5][k];
const B2HMTIP=[[4,-8,4],[8,-4,-4],[4,4,-8],[-4,8,-4],[-8,4,4],[-4,-4,8]];
const B2HMCOR={2:[3,0],3:[3,1,5],4:[3,4,0,1],5:[3,4,5,0,1],6:[3,4,5,0,1,2]};
const B2HMTR=[0,1,2,3,4,5].map(k=>B2HMP.map((p,i)=>b2hmTri(k,p)?i:-1).filter(i=>i>=0));
const b2hmDist=(i,k)=>{const [q,r,s]=B2HMP[i],[a,b,c]=B2HMTIP[k];return (Math.abs(q-a)+Math.abs(r-b)+Math.abs(s-c))/2;};
const b2hmK=n=>n<=6?n:4;
const b2hmGoal=(d,k)=>(B2HMCOR[d.K][k]+3)%6;
// the sides and the players of each (seat s plays for side s%K)
const b2hmSeats=(d,k)=>d.pl.map((_,s)=>s).filter(s=>s%d.K===k&&(d.out||'')[s]!=='1');
const b2hmNow=(d,k)=>{const m=b2hmSeats(d,k);return m.length?m[(d.tr[k]||0)%m.length]:d.turn;};
function b2hmNext(d,k){for(let j=1;j<=d.K;j++){const x=(k+j)%d.K;if(b2hmSeats(d,x).length)return x;}return k;}
function b2hmPass(d,k){const tr=[...d.tr];tr[k]=(tr[k]+1)%(b2hmSeats(d,k).length||1);const x={...d,tr};const ns=b2hmNext(x,k);return {tr,sd:ns,turn:b2hmNow(x,ns)};}
const b2hmWin=(d,k)=>{let m=b2hmSeats(d,k);if(!m.length)m=d.pl.map((_,s)=>s).filter(s=>s%d.K===k);return {win:m[0],wins:m};};
const b2hmCol=(d,k)=>col(d,k<d.pl.length?k:0);
const b2hmName=(d,k)=>{const m=b2hmSeats(d,k);return (m.length?m:[k]).map(s=>nameTag(d,s)).join(' و');};
// where marble i of side k can go: one step to a free neighbour, or a chain of hops over single marbles. A marble already
// in its goal stays inside it. Each place keeps the way there (for the slide)
function b2hmDests(b,i,k,goal){const out=new Map();const inG=b2hmTri(goal,B2HMP[i]);const ok=t=>!inG||b2hmTri(goal,B2HMP[t]);
  for(const n of B2HMNB[i])if(n>=0&&b[n]==='.'&&ok(n))out.set(n,[i,n]);
  const prev=new Map([[i,-1]]),q=[i];while(q.length){const x=q.shift();for(let dI=0;dI<6;dI++){const m=B2HMNB[x][dI];if(m<0||m===i||b[m]==='.')continue;const t=B2HMNB[m][dI];
      if(t<0||t===i||b[t]!=='.'||prev.has(t))continue;prev.set(t,x);q.push(t);if(ok(t)&&!out.has(t)){const p=[];for(let y=t;y>=0;y=prev.get(y))p.unshift(y);out.set(t,p);}}}
  return out;}
function b2hmMoves(b,k,goal){const o=[],c=String(k);for(let i=0;i<121;i++){if(b[i]!==c)continue;for(const [t,p] of b2hmDests(b,i,k,goal))o.push({f:i,t,p});}return o;}
const b2hmIn=(b,k,goal)=>B2HMTR[goal].filter(i=>b[i]===String(k)).length;
function b2hmDone(b,k,goal){const T=B2HMTR[goal];return T.every(i=>b[i]!=='.')&&T.some(i=>b[i]===String(k));}
function b2hmInit(n){const K=b2hmK(n);const b=Array(121).fill('.');B2HMCOR[K].forEach((c,k)=>{for(const i of B2HMTR[c])b[i]=String(k);});return {K,b:b.join('')};}
function b2hmDo(d,m){const k=d.sd,goal=b2hmGoal(d,k);const b=m?b2m9Set(d.b,m.f,m.t,String(k)):d.b;
  const x={...d,b,lm:m?m.p:null,nmv:(d.nmv||0)+1,mvn:(d.mvn||0)+1,last:m?`${b2hmName(d,k)} ${m.p.length>2?`قفز ${m.p.length-1} قفزات`:'تحرّك'}`:`${b2hmName(d,k)} ما عنده حركة`};
  if(m&&b2hmDone(b,k,goal))return {...x,...b2hmWin(d,k),end:'goal'};
  // a very long game ends: most marbles home wins, then the shortest way left
  if(x.nmv>=130*d.K){let bk=-1,bv=-1e9;for(let j=0;j<d.K;j++){if(!b2hmSeats(d,j).length)continue;const g=b2hmGoal(d,j);let v=b2hmIn(b,j,g)*1000;for(let i=0;i<121;i++)if(b[i]===String(j))v-=b2hmDist(i,g);if(v>bv){bv=v;bk=j;}}
    return {...x,...b2hmWin(d,bk),end:'long'};}
  return {...x,...b2hmPass(d,k)};}
// how good the marbles of side k stand: the way left to the far tip, the last marble counts extra, marbles home count
function b2hmVal(b,k,goal){let v=0,mx=0;const c=String(k);for(let i=0;i<121;i++){if(b[i]!==c)continue;const x=b2hmDist(i,goal);v-=x;if(x>mx)mx=x;if(b2hmTri(goal,B2HMP[i]))v+=2;}return v-mx*1.2;}
function b2hmThink(d,lv){const k=d.sd,goal=b2hmGoal(d,k),c=String(k);const ms=b2hmMoves(d.b,k,goal);if(!ms.length)return null;
  const ns=[0,6,1.2,.15][lv];for(const m of ms){const b=b2m9Set(d.b,m.f,m.t,c);m.v=b2hmDone(b,k,goal)?1e5:b2hmVal(b,k,goal)+Math.random()*ns;}
  ms.sort((x,y)=>y.v-x.v);if(lv<3||ms[0].v>=1e5)return lv===1&&Math.random()<.3?b2Rnd(ms.slice(0,Math.ceil(ms.length/2))):ms[0];
  // hard: the best dozen, each with the best next move of the same side (the others are not modelled)
  let best=ms[0],bv=-Infinity,budget=3000;for(const m of ms.slice(0,12)){const b=b2m9Set(d.b,m.f,m.t,c);let nx=-Infinity;
    for(const m2 of b2hmMoves(b,k,goal)){if(budget--<=0)break;const v=b2hmVal(b2m9Set(b,m2.f,m2.t,c),k,goal);if(v>nx)nx=v;}
    const v=m.v*.4+(nx===-Infinity?m.v:nx)*.6;if(v>bv){bv=v;best=m;}}return best;}
const B2HMXY=B2HMP.map(([q,r])=>[72+(q+r/2)*10,83+r*8.66]);
const B2HMBG={};
function b2hmBg(d){const key=d.K+':'+d.pl.map((_,s)=>col(d,s)).join();if(B2HMBG[key])return B2HMBG[key];
  const P=(q,r)=>`${(72+(q+r/2)*10).toFixed(1)},${(83+r*8.66).toFixed(1)}`;
  let g=`<polygon points="${P(4.6,-9.2)} ${P(4.6,4.6)} ${P(-9.2,4.6)}" class="b2hst"/><polygon points="${P(-4.6,9.2)} ${P(-4.6,-4.6)} ${P(9.2,-4.6)}" class="b2hst"/>`;
  // each side's home point and goal point are tinted with its colour (a soft triangle around the ten holes)
  B2HMCOR[d.K].forEach((c,k)=>{const fill=b2hmCol(d,k);for(const t of [c,(c+3)%6]){const T=B2HMTR[t],cor=T.filter(i=>B2HMNB[i].filter(n=>T.includes(n)).length<=2).map(i=>B2HMXY[i]);
      const cx=cor.reduce((a,p)=>a+p[0],0)/3,cy=cor.reduce((a,p)=>a+p[1],0)/3;
      g+=`<polygon points="${cor.map(([x,y])=>`${(cx+(x-cx)*1.5).toFixed(1)},${(cy+(y-cy)*1.5).toFixed(1)}`).join(' ')}" fill="${fill}" opacity="${t===c?.3:.17}" stroke="${fill}" stroke-width="5" stroke-linejoin="round"/>`;}});
  g+=`<g class="b2hh">${B2HMXY.map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.1"/>`).join('')}</g>`;
  return B2HMBG[key]=`<svg viewBox="0 0 144 166" aria-hidden="true">${g}</svg>`;}
GAMES.b_halma={teams:'none',name:'القفز',cat:'board',lbc:'#3F7FBF',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4A8FD4"/><polygon points="50,6 88,72 12,72" fill="#F1DDB2"/><polygon points="50,94 12,28 88,28" fill="#F1DDB2"/>${[[50,16,'#E5483F'],[45,25,'#E5483F'],[55,25,'#E5483F'],[50,84,'#3FAE5C'],[45,75,'#3FAE5C'],[55,75,'#3FAE5C'],[20,33,'#EDB02F'],[80,67,'#9C7BD6'],[30,50,'#9C7BD6'],[62,45,'#E5483F']].map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="4.6" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`).join('')}</svg>`,
  init:n=>({...b2hmInit(n),tr:Array(b2hmK(n)).fill(0),sd:0,nmv:0,lm:null,mvn:0,last:''}),
  start:d=>({...d,turn:b2hmNow(d,0)}),
  onSkip(nd,d){if(nd.win!=null)return {...nd,end:'left'};const live=[...Array(nd.K).keys()].filter(k=>b2hmSeats(nd,k).length);
    if(live.length===1)return {...nd,...b2hmWin(nd,live[0]),end:'left'};let x={...nd};if(!b2hmSeats(x,x.sd).length)x.sd=b2hmNext(x,x.sd);return {...x,turn:b2hmNow(x,x.sd)};},
  onTimeout(d){const m=b2hmThink(d,1);return b2hmDo(d,m);},
  points:d=>d.pl.map((_,s)=>{const k=s%d.K;return `🎯 ${b2hmIn(d.b,k,b2hmGoal(d,k))}/10`;}),
  winText(d){const k=d.win%d.K;return `فاز ${b2hmName(d,k)}${d.end==='goal'?': وصّل كل كراته':d.end==='long'?': طالت اللعبة وعنده أكثر كرات واصلة':d.end==='left'?'، الباقين طلعوا':''}`;},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';const me=!ctx.local&&d.turn===ctx.v;
    return s+`${me?'<b class="yt">دورك</b>':`دور ${b2hmName(d,d.sd)}`} <i class="b2hmc" style="--c:${b2hmCol(d,d.sd)}"></i> • وصّل كراتك للرأس المقابل`;},
  render(d,ctx){const my=ctx.my,k=d.sd,goal=b2hmGoal(d,k),P=b2Sel(d),c=String(k);let to=new Map(),mv=new Set();
    if(my){for(let i=0;i<121;i++)if(d.b[i]===c&&b2hmDests(d.b,i,k,goal).size)mv.add(i);if(P)to=b2hmDests(d.b,P.f,k,goal);}
    const L=d.lm||[];const pts=B2HMXY.map(([x,y],i)=>{const v=d.b[i];const tap=my&&(mv.has(i)||to.has(i));
      return {q:i,x,y,i:tap?i:null,c:b2Cls(d,i,{sel:P?P.f:-1,to:new Set(to.keys()),mv:P?null:mv}),p:v!=='.'?`<i class="b2s hm" style="--c:${b2hmCol(d,+v)}"></i>`:''};});
    return b2Board('b2hm bd-b2',144,166,8.4,b2hmBg(d),pts,false,my)+(my&&!mv.size?'<div class="row chact"><button class="btn" data-ga="skip">ما عندي حركة، مرّر</button></div>':'');},
  after:d=>b2Fly('hm',d),
  click(a,i,d,ctx){if(!ctx.my)return;const k=d.sd,goal=b2hmGoal(d,k),P=b2Sel(d);if(a==='skip'){if(!b2hmMoves(d.b,k,goal).length)act(b2hmDo(d,null));return;}if(a!=='pt')return;
    if(P){const ds=b2hmDests(d.b,P.f,k,goal);if(ds.has(i)){S.b2=null;act(b2hmDo(d,{f:P.f,t:i,p:ds.get(i)}));return;}}
    b2Pick(d,d.b[i]===String(k)&&b2hmDests(d.b,i,k,goal).size&&(!P||P.f!==i)?{f:i}:null);},
  bot(d,s,lv){return b2hmDo(d,b2hmThink(d,lv));},
  botDelay:()=>400+rnd(350)};
HELP.b_halma='القفز (الداما الصينية على النجمة): كل واحد عنده 10 كرات في رأس من رؤوس النجمة، والهدف تنقلها كلها للرأس المقابل. في دورك تحرّك كرة وحدة: يا خطوة لنقطة جارة فاضية، يا قفزات: تقفز فوق كرة وحدة لاصقة (لك أو لغيرك) لنقطة فاضية وراها مباشرة، وتكمل قفز من هناك بأي اتجاه قد ما تبي. ما فيه أكل. الكرة اللي توصل للرأس المقابل ما تطلع منه. أول واحد يمتلي رأسه المقابل بكراته (حتى لو فيه كرات لغيره ما طلعت) يفوز. تنلعب من 2 إلى 6 أطراف، وإذا كنتوا 7 أو 8 يصيرون 4 أطراف وكل اثنين يتناوبون على طرف. إذا طالت اللعبة جدًا يفوز اللي واصل له كرات أكثر.';

/* ================= المحبوسة: mahbusa ================= */
// the Arab pinning game on the backgammon board (like Greek plakoto and Bulgarian tapa, without the "mother" rule).
// a0/a1: checkers of each side on index 0..23 (point idx+1 for side 0). Side 0 runs 23 -> 0 and bears off below 0,
// side 1 runs 0 -> 23. No hitting: a checker landing on a single enemy checker pins it there (pin[i] is the pinned side)
const b2mbOf=(t,s)=>s?t.a1:t.a0;
const b2mbFree=(t,s,i)=>b2mbOf(t,s)[i]-(t.pin[i]===s?1:0);
function b2mbHome(t,s){const a=b2mbOf(t,s);for(let i=0;i<24;i++)if(a[i]&&(s?i<18:i>5))return false;return true;}
// one checker of side s from point index `from` with one die: the landing index, 24 for borne off, or null
function b2mbStep(t,s,from,die){if(b2mbFree(t,s,from)<=0)return null;const to=from+(s?die:-die);
  if(to>=0&&to<=23){const o=b2mbOf(t,1-s),me=b2mbOf(t,s);if(!o[to]||t.pin[to]===1-s)return to;if(o[to]===1&&!me[to])return to;return null;}
  if(!b2mbHome(t,s))return null;if(s?to===24:to===-1)return 24;
  const a=b2mbOf(t,s);for(let i=0;i<24;i++)if(a[i]&&(s?i<from:i>from))return null;return 24;}
function b2mbMove(t,s,from,to){const a0=[...t.a0],a1=[...t.a1],pin=[...t.pin],off=[...t.off];const me=s?a1:a0,o=s?a0:a1;let pinned=false;
  me[from]--;if(!me[from]&&pin[from]===1-s)pin[from]=-1;
  if(to===24)off[s]++;else{if(o[to]===1&&!me[to]&&pin[to]===-1){pin[to]=1-s;pinned=true;}me[to]++;}
  return {a0,a1,pin,off,pinned};}
function b2mbSingles(t,s,dice){const out=[],seen=new Set();for(const die of dice){if(seen.has(die))continue;seen.add(die);
  for(let f=0;f<24;f++){const to=b2mbStep(t,s,f,die);if(to!=null)out.push({from:f,to,die});}}return out;}
const b2mbKey=(t,dice)=>t.a0.join(',')+'|'+t.a1.join(',')+'|'+t.pin.join(',')+'|'+dice.join('');
function b2mbDepth(t,s,dice,memo){if(!dice.length)return 0;const k=b2mbKey(t,dice);if(memo.has(k))return memo.get(k);let best=0;
  for(const m of b2mbSingles(t,s,dice)){const nt=b2mbMove(t,s,m.from,m.to),rest=[...dice];rest.splice(rest.indexOf(m.die),1);best=Math.max(best,1+b2mbDepth(nt,s,rest,memo));if(best===dice.length)break;}
  memo.set(k,best);return best;}
// as in backgammon: play as many dice as possible, and the larger one when only one can be played
function b2mbAllowed(t,s,dice){const memo=new Map(),mx=b2mbDepth(t,s,dice,memo);if(!mx)return [];
  let c=b2mbSingles(t,s,dice).filter(m=>{const nt=b2mbMove(t,s,m.from,m.to),rest=[...dice];rest.splice(rest.indexOf(m.die),1);return 1+b2mbDepth(nt,s,rest,memo)===mx;});
  if(mx===1&&dice.length===2&&dice[0]!==dice[1]){const big=Math.max(...dice);if(c.some(m=>m.die===big))c=c.filter(m=>m.die===big);}return c;}
const b2mbT=d=>({a0:d.a0,a1:d.a1,pin:d.pin,off:d.off});
function b2mbNoMove(d,s,dice){return b2Pass(d,s,{ph:'roll',dice,mv:[],last:`${tmName(d,s)} رمى ${dice[0]} و${dice[1]} وما عنده حركة`});}
function b2mbRolled(d,dice){const s=d.sd,mv=dice[0]===dice[1]?[dice[0],dice[0],dice[0],dice[0]]:[...dice];
  if(!b2mbAllowed(b2mbT(d),s,mv).length)return b2mbNoMove(d,s,dice);return {...d,ph:'move',dice,mv,mvn:(d.mvn||0)+1,last:`${tmName(d,s)} رمى ${dice[0]} و${dice[1]}`};}
function b2mbOpen(d,r){const o=[...d.op];o[d.sd]=r;
  if(d.sd===0)return {...d,op:o,sd:1,turn:tmNow(d,1),mvn:(d.mvn||0)+1,last:`${tmName(d,0)} رمى ${r}`};
  if(o[0]===o[1])return {...d,op:[0,0],sd:0,turn:tmNow(d,0),mvn:(d.mvn||0)+1,last:`تعادل ${r} و${r}، ارموا مرة ثانية`};
  const s=o[0]>o[1]?0:1,dice=[o[0],o[1]];const nd={...d,op:o,sd:s,turn:tmNow(d,s),ph:'move',dice,mv:dice,mvn:(d.mvn||0)+1,last:`${tmName(d,s)} يبدأ بـ ${o[0]} و${o[1]}`};
  return b2mbAllowed(b2mbT(nd),s,dice).length?nd:b2mbNoMove(nd,s,dice);}
function b2mbPlay(d,m){const s=d.sd,t=b2mbMove(d,s,m.from,m.to),mv=[...d.mv];mv.splice(mv.indexOf(m.die),1);
  let nd={...d,...t,mv,lm:[m.from,m.to,s],hp:t.pinned?m.to:-1,mvn:(d.mvn||0)+1,last:`${tmName(d,s)} لعب ${d.dice[0]} و${d.dice[1]}${t.pinned?' وحبس حجر 🔒':''}`};delete nd.pinned;
  if(t.off[s]===15){const k=d.off[1-s]?1:2;return {...nd,...tmWin(d,s),wpts:k,end:k>1?'mars':'',ph:'end'};}
  const left=mv.length?b2mbAllowed(b2mbT(nd),s,mv):[];if(!left.length)nd={...nd,ph:'roll',mv:[],sd:1-s,...tmPass(d,s)};return nd;}
function b2mbAuto(d){const me=d.sd;let x=d,g=0;while(g++<8&&x.win==null){
    if(x.ph==='open'){x=b2mbOpen(x,1+rnd(6));if(x.ph!=='move'||x.sd!==me)break;continue;}if(x.sd!==me)break;
    if(x.ph==='roll'){x=b2mbRolled(x,[1+rnd(6),1+rnd(6)]);if(x.ph!=='move')break;continue;}
    if(x.ph==='move'){const a=b2mbAllowed(b2mbT(x),me,x.mv);if(!a.length)break;x=b2mbPlay(x,b2Rnd(a));if(x.sd!==me)break;continue;}break;}return x;}
/* bot: plans the whole roll, then judges the race, the pins (a checker pinned far from home is worth a lot), safe points,
   and single checkers the other side can land on with a share of its 36 rolls. Hard also averages the other side's best answer */
function b2mbPips(t,s){const a=b2mbOf(t,s);let p=0;for(let i=0;i<24;i++)p+=a[i]*(s?24-i:i+1);return p;}
function b2mbJudge(t,s,lv){const o=1-s;let v=b2mbPips(t,o)-b2mbPips(t,s)+(t.off[s]-t.off[o])*3;
  for(let i=0;i<24;i++){const p=t.pin[i];if(p===o)v+=14+(o?24-i:i+1)*.9+(o?i<6:i>17)*14;else if(p===s)v-=14+(s?24-i:i+1)*.9+(s?i<6:i>17)*14;
    const me=b2mbOf(t,s)[i];if(me>=2&&p!==s)v+=3+((s?i>=18:i<=5)?2:0);}
  // own single checkers the other side can reach and pin
  const wt=[0,.3,.6,.8][lv]||.6,src=[];const oa=b2mbOf(t,o);for(let i=0;i<24;i++)if(oa[i]-(t.pin[i]===o?1:0)>0)src.push(i);
  const ma=b2mbOf(t,s);for(let i=0;i<24;i++){if(ma[i]!==1||oa[i])continue;const ds=src.map(q=>o?i-q:q-i).filter(x=>x>0&&x<=24);if(!ds.length)continue;
    let hits=0;for(const r of TVR)if(r.some(x=>ds.includes(x)))hits++;v-=wt*hits/36*(16+(s?24-i:i+1)*.9);}
  return v;}
function b2mbPlans(d,s){const out=new Map();const rec=(t,dice,first,dep)=>{const al=dice.length?b2mbAllowed(t,s,dice):[];
    if(!al.length||dep>=4){const k=b2mbKey(t,[])+'|'+t.off;if(!out.has(k))out.set(k,{t,first});return;}
    const seen=new Set();for(const m of al){const sk=m.from+':'+m.die;if(seen.has(sk))continue;seen.add(sk);const nt=b2mbMove(t,s,m.from,m.to),rest=[...dice];rest.splice(rest.indexOf(m.die),1);rec(nt,rest,first||m,dep+1);}};
  rec(b2mbT(d),d.mv,null,0);return [...out.values()].filter(x=>x.first);}
function b2mbReply(t,o,lv,cap){let tot=0,w=0;for(let a=1;a<=6;a++)for(let b=a;b<=6;b++){const k=a===b?1:2,mv=a===b?[a,a,a,a]:[a,b];let bo=-1e9;
    for(const x of b2mbPlans({...t,mv},o)){if(cap.n--<=0)break;const v=x.t.off[o]===15?1e5:b2mbJudge(x.t,o,lv);if(v>bo)bo=v;}if(bo===-1e9)bo=b2mbJudge(t,o,lv);tot-=bo*k;w+=k;}return tot/w;}
// where the j-th checker of a stack on point p (1..24 as side 0 counts, 25 borne off) sits, in board units
const B2MB={W:340,H:280,PW:24,L:6,BAR:20,OFF:26,TOP:8,CR:10.5};
function b2mbXY(flip,p,side,j){const {H,PW,L,BAR,OFF,TOP,CR}=B2MB,offX=L+12*PW+BAR+8;j=Math.max(0,j);
  if(p===25){const low=(side===0)!==flip;return [offX+(OFF-6)/2,(low?H-TOP-6-j*7:TOP+2+j*7)+2.7];}
  const q=flip?25-p:p,bottom=q<=12,k=bottom?12-q:q-13;j=Math.min(j,4);return [L+k*PW+(k<6?0:BAR)+PW/2,bottom?H-TOP-CR-.5-j*21:TOP+CR+.5+j*21];}
function b2mbBoard(d,flip,srcs,sel,dests,my){const {W,H,PW,L,BAR,OFF,TOP,CR}=B2MB,TH=112,fw=6*PW,offX=L+12*PW+BAR+8;
  const view=p=>flip?25-p:p,xOf=q=>{const bottom=q<=12,k=bottom?12-q:q-13;return L+k*PW+(k<6?0:BAR);};const sy=(bottom,j)=>bottom?H-TOP-CR-.5-j*21:TOP+CR+.5+j*21;
  const stroke=['#6E5A3E','#0E151F'],ink=['#2D4763','#F4F0E6'];
  let g=`<svg viewBox="0 0 ${W} ${H}" class="tvb bd-tv b2mb"><defs><linearGradient id="mbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7F4E2C"/><stop offset="1" stop-color="#4E2A14"/></linearGradient><linearGradient id="mbf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EFE0BF"/><stop offset="1" stop-color="#DCC495"/></linearGradient>`+
    `<radialGradient id="mbc0" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F1EADB"/><stop offset="1" stop-color="#CDBF9F"/></radialGradient><radialGradient id="mbc1" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#A3504A"/><stop offset=".55" stop-color="#7A2B26"/><stop offset="1" stop-color="#4A1512"/></radialGradient></defs>`;
  g+=`<rect width="${W}" height="${H}" rx="12" fill="url(#mbw)"/>`;for(const x of [L,L+fw+BAR])g+=`<rect x="${x}" y="${TOP}" width="${fw}" height="${H-2*TOP}" rx="3" fill="url(#mbf)"/>`;
  g+=`<rect x="${L+fw+3}" y="${TOP}" width="${BAR-6}" height="${H-2*TOP}" rx="3" fill="rgba(0,0,0,.2)"/><rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="#3E200D"/>`;
  for(let q=1;q<=24;q++){const x=xOf(q),bottom=q<=12,y0=bottom?H-TOP:TOP,y1=bottom?H-TOP-TH:TOP+TH;g+=`<path d="M${x+.8} ${y0}L${x+PW/2} ${y1}L${x+PW-.8} ${y0}Z" fill="${q%2?'#B5523A':'#2F6F62'}"/>`;}
  const chk=(cx,cy,side,n,cls,q,lock)=>`<g class="tvk ${cls||''}"${q!=null?` data-q="${q}"`:''}><circle cx="${cx}" cy="${cy+1.6}" r="${CR}" fill="rgba(0,0,0,.28)"/><circle cx="${cx}" cy="${cy}" r="${CR}" fill="url(#mbc${side})" stroke="${stroke[side]}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${CR-3.4}" fill="none" stroke="${side?'rgba(255,255,255,.18)':'rgba(110,90,62,.32)'}" stroke-width="1.2"/>${lock?`<path d="M${cx-3.6} ${cy-.6}h7.2v5.6h-7.2zM${cx-2.2} ${cy-.6}v-2.2a2.2 2.2 0 0 1 4.4 0v2.2" fill="none" stroke="#FFD84D" stroke-width="1.4"/>`:''}${n?`<text x="${cx}" y="${cy+4.3}" font-size="12" font-weight="800" text-anchor="middle" fill="${ink[side]}">${n}</text>`:''}</g>`;
  const lmTo=d.lm?d.lm[1]:null;
  for(let i=0;i<24;i++){const p=i+1,n0=d.a0[i],n1=d.a1[i];if(!n0&&!n1)continue;const q=view(p),x=xOf(q)+PW/2,bottom=q<=12;const pn=d.pin[i];
    const top=pn>=0?1-pn:n0?0:1,n=top?n1:n0;let j=0;
    if(pn>=0){g+=chk(x,sy(bottom,0),pn,0,'pnd'+(d.hp===i?' fresh':''),null,true);j=1;}
    const shown=Math.min(n,5-j);for(let k=0;k<shown;k++){const last=k===shown-1;const cls=last?(sel===i?'sel':my&&srcs.has(i)&&sel==null?'mv':lmTo===i?'lmc':''):'';
      g+=chk(x,sy(bottom,j+k),top,last&&n>shown?n:0,cls,last?p:null,false);}}
  for(const side of [0,1]){const n=d.off[side];if(!n)continue;const low=(side===0)!==flip,ox=offX+(OFF-6)/2;
    for(let j=0;j<n;j++){const y=low?H-TOP-6-j*7:TOP+2+j*7;g+=`<rect ${j===n-1?`data-q="o${side}" `:''}x="${ox-8.5}" y="${y}" width="17" height="5.4" rx="2.2" fill="url(#mbc${side})" stroke="${stroke[side]}" stroke-width=".8"/>`;}}
  if(my){for(const i of srcs){const q=view(i+1),x=xOf(q),bottom=q<=12;g+=`<rect x="${x}" y="${bottom?H/2:TOP}" width="${PW}" height="${H/2-TOP}" fill="#FFD84D" opacity="${sel===i?.22:.07}" class="tvhit" data-ga="pt" data-i="${i}"/>`;}
    for(const i of dests){if(i===24){g+=`<rect x="${offX}" y="${TOP}" width="${OFF-6}" height="${H-2*TOP}" rx="5" fill="#4CB97F" opacity=".55" class="tvhit" data-ga="pt" data-i="24"/>`;continue;}
      const q=view(i+1),x=xOf(q),bottom=q<=12,cnt=d.a0[i]+d.a1[i],j=Math.min(cnt,4);
      g+=`<rect x="${x}" y="${bottom?H/2:TOP}" width="${PW}" height="${H/2-TOP}" fill="#4CB97F" opacity=".16" class="tvhit" data-ga="pt" data-i="${i}"/><circle cx="${x+PW/2}" cy="${sy(bottom,j)}" r="${CR-.5}" fill="#4CB97F" fill-opacity=".45" stroke="#fff" stroke-width="1.6" stroke-dasharray="3.2 2.2" class="tvgh" data-ga="pt" data-i="${i}"/>`;}}
  return g+'</svg>';}
const B2MB0=()=>{const a0=Array(24).fill(0),a1=Array(24).fill(0);a0[23]=15;a1[0]=15;return {a0,a1,pin:Array(24).fill(-1),off:[0,0]};};
GAMES.b_mahbusa={...B2TEAM,name:'المحبوسة',cat:'board',lbc:'#7A2B26',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#5A2E16"/><rect x="6" y="8" width="88" height="84" rx="4" fill="#EBD8AE"/><rect x="47" y="8" width="6" height="84" fill="#5A2E16"/>${[0,1,2].map(k=>`<path d="M${9+k*13} 10l6 34 6-34z" fill="${k%2?'#2F6F62':'#B5523A'}"/><path d="M${56+k*13} 90l6-34 6 34z" fill="${k%2?'#B5523A':'#2F6F62'}"/>`).join('')}<circle cx="70" cy="34" r="9" fill="#7A2B26" stroke="#3A100D" stroke-width="1.5"/><circle cx="70" cy="56" r="9" fill="#fff" stroke="#6E5A3E" stroke-width="1.5"/><circle cx="70" cy="56" r="9" fill="none"/><path d="M65 55h10v7h-10zM67 55v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#E0A42A" stroke-width="2"/></svg>`,
  init:()=>({...B2MB0(),sd:0,tr:[0,0],ph:'open',op:[0,0],dice:[0,0],mv:[],hp:-1,lm:null,mvn:0,last:''}),
  onSkip(nd,d){const x=tmSkip(nd,d);return x.win!=null?{...x,ph:'end'}:x;},
  onTimeout:d=>b2mbAuto(d),
  // the dice are thrown on the host; choosing a checker stays on the phone
  net:{host:['roll','open'],ui:['b2']},
  points:d=>d.pl.map((_,s)=>`${s%2?'🟤':'⚪'} برّا ${d.off[s%2]}`),
  winText(d){if(d.win==='d')return 'تعادل';const sd=d.win%2;return `فاز ${sd?'الأحمر':'الأبيض'}${d.end==='mars'?' مارس (نقطتين)':d.end==='resign'?' بالاستسلام':d.end==='left'?'، الخصم طلع':''}`;},
  status(d,ctx){let s=d.last?`<small>${d.last}</small><br>`:'';const me=!ctx.local&&d.turn===ctx.v;const who=me?'<b class="yt">دورك</b>':`دور ${tmName(d,d.sd)}`;
    const side=`<span class="chside ${d.sd?'mbr':''}">${d.sd?'الأحمر':'الأبيض'}</span>`;
    if(d.ph==='open')return s+`${who} ${side}: ارمِ زهرة وحدة، الأعلى يبدأ`;if(d.ph==='roll')return s+`${who} ${side}: ارمِ الزهر`;
    const pinned=d.pin.filter(x=>x===d.sd).length;return s+`${who} ${side}: باقي ${d.mv.join(' و')}${pinned?` • عندك ${pinned} محبوس`:''}`;},
  render(d,ctx){const s=d.sd,my=ctx.my,flip=b2Flip(d,ctx),al=d.ph==='move'&&my?b2mbAllowed(b2mbT(d),s,d.mv):[];const P=b2Sel(d),sel=P?P.f:null;
    const dests=new Set(al.filter(m=>m.from===sel).map(m=>m.to)),srcs=new Set(al.map(m=>m.from));
    let h=b2mbBoard(d,flip,srcs,sel,dests,my)+'<div class="tvbar">';
    if(d.ph==='open')h+=`<div class="tvop">${[0,1].map(x=>`<div><small>${x?'الأحمر':'الأبيض'}</small>${tapDie(d.op[x]||6,my&&s===x,COLS[d.pl[tmNow(d,x)]],'tvs','open')}</div>`).join('')}</div>`;
    else if(d.ph==='roll')h+=`${tapDie(d.dice[0]||6,my,col(d,d.turn))}${tapDie(d.dice[1]||6,my,col(d,d.turn))}`;
    else if(d.ph==='move'){const dbl=d.dice[0]===d.dice[1],used=dbl?4-d.mv.length:2-d.mv.length;
      h+=(dbl?[0,1,2,3]:[0,1]).map(j=>`<div class="tapd ${j<used?'used':''} ${used?'':'roll'}" style="--c:${col(d,d.turn)}">${diceSVG(d.dice[dbl?0:j])}</div>`).join('');}
    return h+'</div>'+(my&&d.ph!=='open'?b2ResignBtn(ctx):'');},
  after(d,ctx){const k=d.gid+':'+(d.mvn||0);if(S.b2mbFx===k)return;S.b2mbFx=k;const L=d.lm;if(!L||bdStill()||d.ph==='open')return;
    const svg=app.querySelector('svg.b2mb');if(!svg)return;const flip=b2Flip(d,ctx),[f,t,s]=L;const own=i=>i<24?b2mbOf(d,s)[i]-(d.pin[i]===s?1:0)+(d.pin[i]>=0?1:0):0;
    const to=t===24?b2mbXY(flip,25,s,d.off[s]-1):b2mbXY(flip,t+1,s,own(t)-1),from=b2mbXY(flip,f+1,s,own(f));
    const el=svg.querySelector(`[data-q="${t===24?'o'+s:t+1}"]`);if(!el||!el.animate)return;
    try{el.animate([{transform:`translate(${(from[0]-to[0]).toFixed(1)}px,${(from[1]-to[1]).toFixed(1)}px)`},{transform:'none'}],{duration:300,easing:'cubic-bezier(.3,.75,.35,1)'});}catch(e){}},
  click(a,i,d,ctx){const s=d.sd;if(!ctx.my)return;if(a==='resign'){if(d.ph!=='open')b2Resign(d);return;}
    if(a==='open'&&d.ph==='open'){act(b2mbOpen(d,1+rnd(6)));return;}
    if(a==='roll'&&d.ph==='roll'){S.b2=null;act(b2mbRolled(d,[1+rnd(6),1+rnd(6)]));return;}
    if(a!=='pt'||d.ph!=='move')return;const al=b2mbAllowed(b2mbT(d),s,d.mv),P=b2Sel(d),sel=P?P.f:null;
    const go=(f,t)=>{const m=al.filter(x=>x.from===f&&x.to===t).reduce((x,y)=>y.die<x.die?y:x);S.b2=null;act(b2mbPlay(d,m));};
    if(sel!=null&&al.some(m=>m.from===sel&&m.to===i)){go(sel,i);return;}
    if(al.some(m=>m.from===i)&&sel!==i){const ds=[...new Set(al.filter(m=>m.from===i).map(m=>m.to))];if(ds.length===1){go(i,ds[0]);return;}b2Pick(d,{f:i});return;}
    b2Pick(d,null);},
  bot(d,s,lv){const side=d.sd;if(d.ph==='open')return b2mbOpen(d,1+rnd(6));if(d.ph==='roll')return b2mbRolled(d,[1+rnd(6),1+rnd(6)]);
    if(d.ph!=='move')return b2mbAuto(d);const al=b2mbAllowed(b2mbT(d),side,d.mv);if(!al.length)return b2mbAuto(d);
    if(lv===1&&Math.random()<.35)return b2mbPlay(d,b2Rnd(al));
    const k=d.gid+':'+b2mbKey(d,d.mv);const P=S.b2mbPlan;if(P&&P.k===k){const m=al.find(x=>x.from===P.m.from&&x.to===P.m.to&&x.die===P.m.die);if(m)return b2mbPlay(d,m);}
    const ns=[0,8,3,.5][lv];let best=null,bv=-1e9;const all=b2mbPlans(d,side);for(const x of all){x.v=b2mbJudge(x.t,side,lv)+Math.random()*ns;if(x.v>bv){bv=x.v;best=x;}}
    if(lv===3&&all.length>1){all.sort((a,b)=>b.v-a.v);bv=-1e9;const cap={n:6000};for(const x of all.slice(0,5)){const v=x.t.off[side]===15?1e6:b2mbReply(x.t,1-side,lv,cap);if(v>bv){bv=v;best=x;}if(cap.n<=0)break;}}
    if(!best)return b2mbPlay(d,al[0]);const nd=b2mbPlay(d,best.first);S.b2mbPlan=null;
    if(nd.ph==='move'&&nd.sd===side){const rest=b2mbPlans(nd,side).find(x=>b2mbKey(x.t,[])===b2mbKey(best.t,[])&&x.t.off+''===best.t.off+'');if(rest)S.b2mbPlan={k:nd.gid+':'+b2mbKey(nd,nd.mv),m:rest.first};}
    return nd;},
  botDelay:(d)=>d.ph==='move'?450+rnd(300):700+rnd(400)};
HELP.b_mahbusa='المحبوسة: على لوحة الطاولة، وكل واحد عنده 15 حجر تبدأ كلها في أول خانة من طريقه (الخانة 24 من جهته)، والاثنين يمشون بعكس بعض لين يوصلون بيتهم (آخر 6 خانات) ويطلّعونها. في البداية كل واحد يرمي زهرة والأعلى يبدأ بالرقمين، والدبل يتلعب أربع مرات، ولازم تستخدم الزهرين إذا تقدر (وإذا ما تقدر إلا واحد لازم الأكبر). ما فيه ضرب: إذا نزلت على خانة فيها حجر واحد للخصم تحبسه تحت حجرك 🔒، والمحبوس ما يتحرك لين يمشي آخر حجر للي حابسه من فوقه. ما تنزل على خانة فيها حجرين أو أكثر للخصم، ولا على خانة الخصم حابس فيها حجر لك. ما تطلّع حجارك إلا إذا كل الـ15 صارت في بيتك (المحبوس منها يحسب). أول واحد يطلّع كل حجاره يفوز: نقطة، أو نقطتين (مارس) إذا الخصم ما طلّع ولا حجر. إذا أكثر من لاعبين: فريقين يتناوبون.';

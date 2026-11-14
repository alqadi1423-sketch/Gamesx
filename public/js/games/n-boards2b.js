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

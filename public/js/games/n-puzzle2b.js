'use strict';
/* puzzles2, part 2: futoshiki, cage arithmetic, hitori and star battle. The race itself (u2Game) and the board helpers are in n-puzzle2.js */

/* ---------- latin squares: domains as bit masks (bit v = value v), every row and column holds 1..n once ---------- */
const u2Bits=m=>{let c=0;while(m){m&=m-1;c++;}return c;};
const u2Low=m=>31-Math.clz32(m&-m);
// how many ways the domains can be finished (up to lim); extra(dom) adds a puzzle's own rule: -1 on a clash, true when it narrowed something
function lsCount(n,dom0,extra,lim,cap,rand){const N=n*n;let nodes=0;const sols=[];
  const rows=u2Rng(n,r=>u2Rng(n,c=>r*n+c)),cols=u2Rng(n,c=>u2Rng(n,r=>r*n+c)),units=[...rows,...cols];
  function prop(D){let ch=true;while(ch){ch=false;
      for(const u of units){let seen=0;for(const i of u){const m=D[i];if(!m)return false;if((m&(m-1))===0){if(seen&m)return false;seen|=m;}}
        for(const i of u){const m=D[i];if((m&(m-1))!==0&&(m&seen)){D[i]=m&~seen;if(!D[i])return false;ch=true;}}
        for(let v=1;v<=n;v++){const b=1<<v;let k=-1,c=0;for(const i of u)if(D[i]&b){c++;k=i;}if(!c)return false;if(c===1&&D[k]!==b){D[k]=b;ch=true;}}}
      if(extra){const r=extra(D);if(r===-1)return false;if(r)ch=true;}}
    return true;}
  (function go(D){if(sols.length>=lim||++nodes>cap)return;if(!prop(D))return;let best=-1,bc=99;for(let i=0;i<N;i++){const c=u2Bits(D[i]);if(c>1&&c<bc){bc=c;best=i;}}
    if(best<0){sols.push(D.map(u2Low).join(''));return;}
    const vs=[];for(let v=1;v<=n;v++)if(D[best]&(1<<v))vs.push(v);if(rand)u2Sh(vs);
    for(const v of vs){const E=D.slice();E[best]=1<<v;go(E);if(sols.length>=lim)return;}})(dom0.slice());
  return {sols,nodes,cut:nodes>cap};}
const lsFull=n=>((1<<(n+1))-2);
const lsDom=(n,g)=>[...g].map(x=>x==='.'||x==='0'?lsFull(n):1<<+x);
// repeats in a row or column of a filled-in board ('0' empty)
function lsClash(n,v){const bad=new Set();for(let i=0;i<n*n;i++){if(v[i]==='0')continue;const r=Math.floor(i/n),c=i%n;for(let k=0;k<n;k++){const a=r*n+k,b=k*n+c;if(a!==i&&v[a]===v[i]){bad.add(i);}if(b!==i&&v[b]===v[i])bad.add(i);}}return bad;}
const lsLatin=(n,s)=>s.length===n*n&&[...s].every(x=>+x>=1&&+x<=n)&&lsClash(n,s).size===0;

/* ---------- number entry shared by the number puzzles: pick a cell, then a digit (or notes) ---------- */
const u2NInit=pz=>({v:pz.g.replace(/\./g,'0'),m:Array(pz.n*pz.n).fill(0)});
function u2NTap(a,i,pz,st,n,peers){const w=st.w;
  if(a==='c'){if(i>=0&&i<n*n&&pz.g[i]==='.'){st.cur=i;}return false;}
  if(a==='pm'){st.pm=i?1:0;return false;}
  if(a==='n'&&st.cur!=null&&i>=0&&i<=n){const c=st.cur;u2Push(st);
    if(i===0){w.v=setAt(w.v,c,'0');w.m[c]=0;return true;}
    if(st.pm){if(w.v[c]!=='0')return false;w.m[c]^=1<<i;return false;}
    w.v=setAt(w.v,c,w.v[c]===String(i)?'0':String(i));
    // the digit leaves the notes of its row and column
    if(w.v[c]!=='0'){if(peers){for(const k of peers(c))w.m[k]&=~(1<<i);}else{const r=Math.floor(c/n),cc=c%n;for(let k=0;k<n;k++){w.m[r*n+k]&=~(1<<i);w.m[k*n+cc]&=~(1<<i);}}}
    return true;}
  return false;}
const u2Notes=(m,n)=>m?`<small class="u2nt">${u2Rng(n,k=>m&(1<<(k+1))?k+1:'').filter(Boolean).join(' ')}</small>`:'';
const u2Pad=(n,st,k)=>`<div class="u2np" style="--k:${k||n+1}">${u2Rng(n,k=>`<button class="btn navy" data-ga="n" data-i="${k+1}">${k+1}</button>`).join('')}<button class="btn soft" data-ga="n" data-i="0" aria-label="امسح">⌫</button></div>${u2Seg('pm',[[0,'✍️ رقم'],[1,'✏️ ملاحظات']],st.pm?1:0)}`;

/* ========== 6. فوتوشيكي (futoshiki): a latin square with greater/smaller signs between neighbours ========== */
// signs: h has n-1 per row ('l' left smaller, 'g' left bigger, '.'), v has n-1 per column ('u' top smaller, 'd' top bigger, '.')
function fuRel(pz){const n=pz.n,R=[];for(let r=0;r<n;r++)for(let c=0;c<n-1;c++){const s=pz.h[r*(n-1)+c];if(s==='l')R.push([r*n+c,r*n+c+1]);if(s==='g')R.push([r*n+c+1,r*n+c]);}
  for(let c=0;c<n;c++)for(let r=0;r<n-1;r++){const s=pz.v[c*(n-1)+r];if(s==='u')R.push([r*n+c,(r+1)*n+c]);if(s==='d')R.push([(r+1)*n+c,r*n+c]);}return R;}
// [a,b] means a < b: a stays under b's biggest, b over a's smallest
const fuExtra=R=>D=>{let ch=false;for(const [a,b] of R){const hb=31-Math.clz32(D[b]),la=u2Low(D[a]);const na=D[a]&((1<<hb)-1),nb=D[b]&~((1<<(la+1))-1);if(!na||!nb)return -1;if(na!==D[a]||nb!==D[b]){D[a]=na;D[b]=nb;ch=true;}}return ch;};
function fuCount(pz,lim,cap){return lsCount(pz.n,lsDom(pz.n,pz.g),fuExtra(fuRel(pz)),lim,cap);}
function fuGen(lv){const n=[0,4,5,6][lv];
  for(let t=0;t<40;t++){const sol=lsCount(n,Array(n*n).fill(lsFull(n)),null,1,5000,true).sols[0];if(!sol)continue;const S_=[...sol].map(Number);
    let h='',v='';for(let r=0;r<n;r++)for(let c=0;c<n-1;c++)h+=S_[r*n+c]<S_[r*n+c+1]?'l':'g';for(let c=0;c<n;c++)for(let r=0;r<n-1;r++)v+=S_[r*n+c]<S_[(r+1)*n+c]?'u':'d';
    const pz={n,g:'.'.repeat(n*n),h,v};const uniq=()=>{const r=fuCount(pz,2,6000);return r.sols.length===1&&!r.cut;};
    // givens until the signs pin it down, then signs and givens go while the answer stays the only one
    for(const i of u2Sh(u2Rng(n*n))){if(uniq())break;pz.g=setAt(pz.g,i,sol[i]);}if(!uniq())continue;
    const keepSigns=[0,.6,.4,.22][lv];const sl=u2Sh([...u2Rng(h.length,i=>['h',i]),...u2Rng(v.length,i=>['v',i])]);let left=sl.length;
    for(const [k,i] of sl){if(left<=sl.length*keepSigns)break;const old=pz[k];pz[k]=setAt(old,i,'.');if(uniq())left--;else pz[k]=old;}
    for(const i of u2Sh(u2Rng(n*n))){if(pz.g[i]==='.')continue;const old=pz.g;pz.g=setAt(old,i,'.');if(!uniq())pz.g=old;}
    return pz;}
  return null;}
function fuCheck(pz,s){const n=pz.n;if(!lsLatin(n,s))return false;for(let i=0;i<n*n;i++)if(pz.g[i]!=='.'&&pz.g[i]!==s[i])return false;return fuRel(pz).every(([a,b])=>+s[a]<+s[b]);}
GAMES.u_futo=u2Game({name:'فوتوشيكي',cls:'fu',lbc:'#6A4C93',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#7A5AA6"/><rect x="12" y="12" width="76" height="76" rx="8" fill="#F6F0FF"/><g font-weight="900" text-anchor="middle"><text x="30" y="42" font-size="20" fill="#3C2A5A">2</text><text x="50" y="40" font-size="16" fill="#E8833A">&lt;</text><text x="70" y="42" font-size="20" fill="#3C2A5A">3</text><text x="30" y="62" font-size="15" fill="#E8833A">∨</text><text x="30" y="82" font-size="20" fill="#3C2A5A">1</text><text x="50" y="80" font-size="16" fill="#E8833A">&lt;</text><text x="70" y="82" font-size="20" fill="#9C7BD6">?</text></g></svg>`,
  title:'رتّب الأرقام وانتبه لعلامات أكبر وأصغر',goal:'كل رقم مرة وحدة بكل صف وعمود، والعلامة بين خانتين لازم تصدق.',lvTxt:['','4×4','5×5','6×6'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=4?240000:pz.n<=5?420000:600000,botT:pz=>[...pz.g].filter(x=>x==='.').length*2.6,
  gen:fuGen,check:fuCheck,solve:pz=>fuCount(pz,1,200000).sols[0]||null,
  spoil:(pz,s)=>{const i=[...pz.g].findIndex(x=>x==='.');const j=i+1<s.length?i+1:i-1;return s.slice(0,Math.min(i,j))+s[Math.max(i,j)]+s[Math.min(i,j)]+s.slice(Math.max(i,j)+1);},
  init:u2NInit,sub:(pz,w)=>w.v.includes('0')?'':w.v,tap:(a,i,pz,st)=>u2NTap(a,i,pz,st,pz.n),
  view(pz,w,st){const n=pz.n,bad=lsClash(n,w.v),R=fuRel(pz);const badR=new Set();R.forEach(([a,b],k)=>{if(w.v[a]!=='0'&&w.v[b]!=='0'&&+w.v[a]>=+w.v[b]){badR.add(a+'_'+b);bad.add(a);bad.add(b);}});
    const sg=(a,b,ch)=>`<em class="${badR.has(a+'_'+b)||badR.has(b+'_'+a)?'bad':''}">${ch}</em>`;let s='';
    for(let r=0;r<n;r++){for(let c=0;c<n;c++){const i=r*n+c,fx=pz.g[i]!=='.';
        s+=`<button class="u2fc ${fx?'fx':''} ${st.cur===i?'cur':''} ${bad.has(i)?'bad':''}" data-ga="c" data-i="${i}" ${fx?'disabled':''}>${w.v[i]!=='0'?w.v[i]:u2Notes(w.m[i],n)}</button>`;
        if(c<n-1){const h=pz.h[r*(n-1)+c];s+=h==='l'?sg(i,i+1,'&lt;'):h==='g'?sg(i+1,i,'&gt;'):'<em></em>';}}
      if(r<n-1)for(let c=0;c<n;c++){const vv=pz.v[c*(n-1)+r],i=r*n+c;s+=(vv==='u'?sg(i,i+n,'∧'):vv==='d'?sg(i+n,i,'∨'):'<em></em>')+(c<n-1?'<em></em>':'');}}
    return `<div class="u2fu" style="grid-template-columns:${'minmax(0,1fr) 16px '.repeat(n-1)}minmax(0,1fr)">${s}</div>${u2Pad(n,st)}`;}});
HELP.u_futo='الكل ياخذ نفس اللغز بنفس الوقت. عبّ اللوحة بالأرقام من 1 لين حجمها (مثلًا 1 لين 5 في 5×5): كل رقم يجي مرة وحدة بكل صف ومرة وحدة بكل عمود. العلامة بين خانتين تقول مين أكبر: «&lt;» الخانة اللي يسارها أصغر، و«∧» اللي فوق أصغر من اللي تحت. المس خانة وبعدين رقم من تحت (ولمسة على نفس الرقم تمسحه). «ملاحظات» تخليك تكتب احتمالات صغيرة بالخانة. التكرار والعلامة الغلط يصيرون أحمر. أول ما تكمل صح تنرسل لحالها. المستويات 4×4 و5×5 و6×6. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 7. حساب الأقفاص (cage arithmetic): a latin square split into cages, each with a target and an operation ========== */
// pz.k: cage letter per cell, pz.t: target per cage, pz.o: operation per cage (+ - x / =)
const CC_OP={'+':'+','-':'−','x':'×','/':'÷','=':''};
function ccCages(pz){const m={};[...pz.k].forEach((ch,i)=>{(m[ch]=m[ch]||[]).push(i);});return Object.keys(m).sort().map((ch,j)=>({cells:m[ch],t:pz.t[j],o:pz.o[j]}));}
function ccFits(o,t,vals){if(o==='=')return vals[0]===t;if(o==='+')return vals.reduce((a,b)=>a+b,0)===t;if(o==='x')return vals.reduce((a,b)=>a*b,1)===t;
  const [a,b]=vals;if(o==='-')return Math.abs(a-b)===t;if(o==='/')return Math.max(a,b)===t*Math.min(a,b);return false;}
// every way to fill a cage (two cells of a cage on one line differ)
function ccTuples(n,cg){const cs=cg.cells,out=[],cur=[];(function go(k){if(k===cs.length){if(ccFits(cg.o,cg.t,cur))out.push(cur.slice());return;}
    for(let v=1;v<=n;v++){let ok=true;for(let j=0;j<k;j++){const a=cs[j],b=cs[k];if(cur[j]===v&&(Math.floor(a/n)===Math.floor(b/n)||a%n===b%n)){ok=false;break;}}if(ok){cur[k]=v;go(k+1);}}})(0);return out;}
const ccExtra=(n,cgs)=>{const T=cgs.map(cg=>ccTuples(n,cg));return D=>{let ch=false;cgs.forEach((cg,j)=>{const nm=cg.cells.map(()=>0);
    for(const tp of T[j]){if(tp.every((v,k)=>D[cg.cells[k]]&(1<<v)))tp.forEach((v,k)=>{nm[k]|=1<<v;});}
    cg.cells.forEach((i,k)=>{const x=D[i]&nm[k];if(x!==D[i]){D[i]=x;ch=true;}});});if(cgs.some(cg=>cg.cells.some(i=>!D[i])))return -1;return ch;};};
function ccCount(pz,lim,cap){return lsCount(pz.n,Array(pz.n*pz.n).fill(lsFull(pz.n)),ccExtra(pz.n,ccCages(pz)),lim,cap);}
function ccGen(lv){const n=[0,4,5,6][lv];
  for(let t=0;t<200;t++){const sol=[...lsCount(n,Array(n*n).fill(lsFull(n)),null,1,5000,true).sols[0]].map(Number);
    // cages grow from random cells: mostly two or three cells, a few singles and fours
    const id=Array(n*n).fill(-1);let cg=0;const cages=[];
    for(const i of u2Sh(u2Rng(n*n))){if(id[i]>=0)continue;const want=[1,2,2,2,3,3,3,4][u2R(8)]-(lv===1&&Math.random()<.3?1:0);const cells=[i];id[i]=cg;
      while(cells.length<want){const nb=[];for(const c of cells){const r=Math.floor(c/n),cc=c%n;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,c2=cc+dc;if(rr>=0&&rr<n&&c2>=0&&c2<n&&id[rr*n+c2]<0)nb.push(rr*n+c2);}}if(!nb.length)break;const j=nb[u2R(nb.length)];id[j]=cg;cells.push(j);}
      cages.push(cells);cg++;}
    if(cages.filter(c=>c.length===1).length>[0,3,2,2][lv])continue;
    const ops=[],tg=[];for(const cells of cages){const vals=cells.map(i=>sol[i]);let o;
      if(cells.length===1)o='=';else if(cells.length===2){const a=Math.max(...vals),b=Math.min(...vals);o=a%b===0&&Math.random()<.5?'/':Math.random()<.55?'-':Math.random()<.5?'+':'x';}
      else o=Math.random()<.55?'+':'x';
      ops.push(o);tg.push(o==='='?vals[0]:o==='+'?vals.reduce((a,b)=>a+b,0):o==='x'?vals.reduce((a,b)=>a*b,1):o==='-'?Math.abs(vals[0]-vals[1]):Math.max(...vals)/Math.min(...vals));}
    // cage letters in reading order of their first cell
    const order=[];id.forEach(c=>{if(!order.includes(c))order.push(c);});const L='abcdefghijklmnopqrstuvwxyz0123456789';
    const pz={n,k:id.map(c=>L[order.indexOf(c)]).join(''),t:order.map(c=>tg[c]),o:order.map(c=>ops[c]).join('')};
    const r=ccCount(pz,2,8000);if(r.sols.length===1&&!r.cut)return pz;}
  return null;}
function ccCheck(pz,s){const n=pz.n;if(!lsLatin(n,s))return false;return ccCages(pz).every(cg=>ccFits(cg.o,cg.t,cg.cells.map(i=>+s[i])));}
GAMES.u_cage=u2Game({name:'حساب الأقفاص',cls:'cc',lbc:'#1E8C7E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#22A08F"/><rect x="12" y="12" width="76" height="76" rx="6" fill="#F2FBF8"/><path d="M12 50H50V88M50 12V31H88M69 31V88" stroke="#145E54" stroke-width="4" fill="none"/><g font-weight="900" fill="#145E54" font-size="11"><text x="16" y="25">6+</text><text x="54" y="25">2÷</text><text x="16" y="63">12×</text><text x="73" y="44">1−</text></g><g font-size="17" font-weight="900" fill="#E8833A" text-anchor="middle"><text x="31" y="44">2</text><text x="59" y="71">3</text></g></svg>`,
  title:'عبّ الأقفاص: كل قفص رقمه وعمليته',goal:'كل رقم مرة وحدة بكل صف وعمود، وأرقام كل قفص تعطي رقمه بالعملية المكتوبة.',lvTxt:['','4×4','5×5','6×6'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=4?300000:pz.n<=5?480000:720000,botT:pz=>pz.n*pz.n*2.5,
  gen:ccGen,check:ccCheck,solve:pz=>ccCount(pz,1,300000).sols[0]||null,
  spoil:(pz,s)=>{const n=pz.n;return s.slice(n)+s.slice(0,n);},
  init:pz=>u2NInit({n:pz.n,g:'.'.repeat(pz.n*pz.n)}),sub:(pz,w)=>w.v.includes('0')?'':w.v,tap:(a,i,pz,st)=>u2NTap(a,i,{g:'.'.repeat(pz.n*pz.n)},st,pz.n),
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0)return false;st.cur=c.i;return 'r';},
  view(pz,w,st){const n=pz.n,cgs=ccCages(pz),bad=lsClash(n,w.v);const head={},cbad=new Set();
    cgs.forEach(cg=>{head[cg.cells[0]]=cg.t+CC_OP[cg.o];const vals=cg.cells.map(i=>+w.v[i]);if(vals.every(x=>x)&&!ccFits(cg.o,cg.t,vals))cg.cells.forEach(i=>cbad.add(i));});
    const k=pz.k;return u2Grid('cc',n,n,i=>{const r=Math.floor(i/n),c=i%n;
      const e=`${c<n-1&&k[i]!==k[i+1]?' br':''}${r<n-1&&k[i]!==k[i+n]?' bb':''}`;
      return [`${e} ${st.cur===i?'cur':''} ${bad.has(i)||cbad.has(i)?'bad':''}`,`${head[i]?`<u>${head[i]}</u>`:''}${w.v[i]!=='0'?`<b>${w.v[i]}</b>`:u2Notes(w.m[i],n)}`];})+u2Pad(n,st);}});
HELP.u_cage='الكل ياخذ نفس اللغز بنفس الوقت. عبّ اللوحة بالأرقام من 1 لين حجمها: كل رقم مرة وحدة بكل صف ومرة وحدة بكل عمود. اللوحة مقسومة أقفاص بخطوط عريضة، وفي زاوية كل قفص رقم وعملية: أرقام القفص لازم تعطي هالرقم بهالعملية (+ جمع، × ضرب، − الفرق بين رقمين، ÷ قسمة الكبير على الصغير)، والقفص اللي خانة وحدة رقمه مكتوب. الرقم يتكرر بنفس القفص إذا مو بنفس الصف أو العمود. المس خانة وبعدين رقم، و«ملاحظات» للاحتمالات. التكرار والقفص الغلط يصيرون أحمر. أول ما تكمل صح تنرسل لحالها. المستويات 4×4 و5×5 و6×6. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 8. هيتوري (hitori): shade repeats away; shaded cells never touch and the rest stays in one piece ========== */
function hiOk(n,sh){for(let i=0;i<n*n;i++)if(sh[i]){const r=Math.floor(i/n),c=i%n;if(c<n-1&&sh[i+1]||r<n-1&&sh[i+n])return false;}
  const st=[sh.indexOf(0)],seen=new Uint8Array(n*n);if(st[0]<0)return false;seen[st[0]]=1;let k=1;
  while(st.length){const i=st.pop(),r=Math.floor(i/n),c=i%n;for(const j of [r>0?i-n:-1,r<n-1?i+n:-1,c>0?i-1:-1,c<n-1?i+1:-1])if(j>=0&&!sh[j]&&!seen[j]){seen[j]=1;k++;st.push(j);}}
  return k===sh.filter(x=>!x).length;}
// solutions (shade strings) up to lim: only cells that repeat in their row or column may be shaded
function hiCount(pz,lim,cap){const n=pz.n,g=[...pz.g].map(x=>parseInt(x,36));const N=n*n;let nodes=0;const sols=[];
  const peers=u2Rng(N,i=>{const r=Math.floor(i/n),c=i%n,o=[];for(let k=0;k<n;k++){if(k!==c&&g[r*n+k]===g[i])o.push(r*n+k);if(k!==r&&g[k*n+c]===g[i])o.push(k*n+c);}return o;});
  const nb=u2Rng(N,i=>{const r=Math.floor(i/n),c=i%n;return [r>0?i-n:-1,r<n-1?i+n:-1,c>0?i-1:-1,c<n-1?i+1:-1].filter(j=>j>=0);});
  const s0=Array(N).fill(-1);peers.forEach((p,i)=>{if(!p.length)s0[i]=0;});
  // -1 open, 0 kept, 1 shaded
  function prop(s){let ch=true;while(ch){ch=false;for(let i=0;i<N;i++){
      if(s[i]===1){for(const j of nb[i]){if(s[j]===1)return false;if(s[j]<0){s[j]=0;ch=true;}}}
      if(s[i]===0){for(const j of peers[i]){if(s[j]===0)return false;if(s[j]<0){s[j]=1;ch=true;}}}}}
    // the kept and open cells must still hang together
    const st=[s.findIndex(x=>x!==1)],seen=new Uint8Array(N);seen[st[0]]=1;let k=1;while(st.length){const i=st.pop();for(const j of nb[i])if(s[j]!==1&&!seen[j]){seen[j]=1;k++;st.push(j);}}
    return k===s.filter(x=>x!==1).length;}
  (function go(s){if(sols.length>=lim||++nodes>cap)return;if(!prop(s))return;const i=s.indexOf(-1);
    if(i<0){if(hiOk(n,s))sols.push(s.join(''));return;}for(const v of [1,0]){const t=s.slice();t[i]=v;go(t);if(sols.length>=lim)return;}})(s0);
  return {sols,nodes,cut:nodes>cap};}
function hiGen(lv){const n=[0,5,6,8][lv];
  for(let t=0;t<300;t++){const L=[...lsCount(n,Array(n*n).fill(lsFull(n)),null,1,5000,true).sols[0]].map(Number);
    const sh=Array(n*n).fill(0);for(const i of u2Sh(u2Rng(n*n))){if(Math.random()>.55)continue;sh[i]=1;if(!hiOk(n,sh))sh[i]=0;}
    // a shaded cell takes a number seen in its row or column
    const g=L.slice();sh.forEach((x,i)=>{if(!x)return;const r=Math.floor(i/n),c=i%n,opt=[];for(let k=0;k<n;k++){if(!sh[r*n+k])opt.push(L[r*n+k]);if(!sh[k*n+c])opt.push(L[k*n+c]);}g[i]=opt[u2R(opt.length)];});
    const pz={n,g:g.map(x=>x.toString(36)).join('')};const r=hiCount(pz,2,20000);if(r.sols.length===1&&!r.cut&&sh.filter(Boolean).length>=n)return pz;}
  return null;}
function hiCheck(pz,s){const n=pz.n;if(s.length!==n*n||!/^[01]+$/.test(s))return false;const sh=[...s].map(Number);if(!hiOk(n,sh))return false;
  for(let i=0;i<n*n;i++){if(sh[i])continue;const r=Math.floor(i/n),c=i%n;for(let k=0;k<n;k++){if(k!==c&&!sh[r*n+k]&&pz.g[r*n+k]===pz.g[i])return false;if(k!==r&&!sh[k*n+c]&&pz.g[k*n+c]===pz.g[i])return false;}}return true;}
function hiBad(pz,w){const n=pz.n,bad=new Set();for(let i=0;i<n*n;i++){const r=Math.floor(i/n),c=i%n;
    if(w[i]==='1'){if(c<n-1&&w[i+1]==='1'){bad.add(i);bad.add(i+1);}if(r<n-1&&w[i+n]==='1'){bad.add(i);bad.add(i+n);}continue;}
    if(w[i]==='2')for(let k=0;k<n;k++){if(k!==c&&w[r*n+k]==='2'&&pz.g[r*n+k]===pz.g[i])bad.add(i);if(k!==r&&w[k*n+c]==='2'&&pz.g[k*n+c]===pz.g[i])bad.add(i);}}return bad;}
GAMES.u_hito=u2Game({name:'هيتوري',cls:'hi',lbc:'#B5473A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C4533F"/><rect x="12" y="12" width="76" height="76" rx="6" fill="#FFF6EC"/>${[[0,0,'3'],[0,1,'1',1],[0,2,'2'],[1,0,'1'],[1,1,'3'],[1,2,'3',1],[2,0,'2',1],[2,1,'2'],[2,2,'1']].map(([r,c,t,s])=>`${s?`<rect x="${15+c*24}" y="${15+r*24}" width="22" height="22" rx="4" fill="#3B2A28"/>`:''}<text x="${26+c*24}" y="${32+r*24}" font-size="16" font-weight="900" fill="${s?'#8b6d66':'#3B2A28'}" text-anchor="middle">${t}</text>`).join('')}</svg>`,
  title:'ظلّل الأرقام المكررة',goal:'ما يتكرر رقم بصف أو عمود، والمظلل ما يتلامس، والباقي كله متصل.',lvTxt:['','5×5','6×6','8×8'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=5?240000:pz.n<=6?360000:600000,botT:pz=>pz.n*pz.n*1.6,
  gen:hiGen,check:hiCheck,solve:pz=>hiCount(pz,1,200000).sols[0]||null,
  spoil:(pz,s)=>{const i=s.indexOf('1');return i<0?'':setAt(s,i,'0');},
  init:pz=>'0'.repeat(pz.n*pz.n),sub:(pz,w)=>w.replace(/2/g,'0'),
  tap(a,i,pz,st){if(a==='md'&&(i===1||i===2))st.md=i;return false;},
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0)return false;u2Push(st);const md=String(st.md||1);st.w=setAt(st.w,c.i,st.w[c.i]===md?'0':md);return true;},
  view(pz,w,st){const n=pz.n,bad=hiBad(pz,w);const sh=[...w].map(x=>x==='1'?1:0);const split=sh.some(Boolean)&&!hiOk(n,sh)&&!bad.size;
    return u2Grid('hi',n,n,i=>[`s${w[i]} ${bad.has(i)?'bad':''}`,parseInt(pz.g[i],36)])+`<p class="note u2n">${split?'الخانات البيضا لازم تكون متصلة':bad.size?'فيه غلط بالخانات الحمرا':''}</p>${u2Seg('md',[[1,'⬛ ظلّل'],[2,'◯ ثبّت']],st.md||1)}`;}});
HELP.u_hito='الكل ياخذ نفس اللوحة بنفس الوقت. ظلّل خانات عشان ما يبقى أي رقم مكرر بصف أو عمود بين الخانات اللي ما تظللت. الشروط: الخانات المظللة ما تلامس بعض من الجنب (بالقطري عادي)، وكل الخانات اللي ما تظللت لازم تكون متصلة ببعض قطعة وحدة. اختار «ظلّل» والمس الخانة، و«ثبّت ◯» تحط دايرة على الخانة اللي متأكد إنها تبقى (تساعدك بس). الغلط يصير أحمر. أول ما تكمل صح تنرسل لحالها. المستويات 5×5 و6×6 و8×8. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 9. النجوم (star battle): one star in every row, column and region, and no two stars touch ========== */
// placements up to lim: a star per row, column and region, none touching (also corner to corner)
function sbCount(pz,lim,cap){const n=pz.n,rg=[...pz.r].map(x=>parseInt(x,36));let nodes=0;const sols=[];const col=new Uint8Array(n),reg=new Uint8Array(n),pos=[];
  (function go(r){if(sols.length>=lim||++nodes>cap)return;if(r===n){sols.push(u2Rng(n*n,i=>pos[Math.floor(i/n)]===i%n?1:0).join(''));return;}
    // a region with no free cell left in the rows below is a dead end
    for(let c=0;c<n;c++){if(col[c]||reg[rg[r*n+c]])continue;if(r&&Math.abs(pos[r-1]-c)<=1)continue;col[c]=1;reg[rg[r*n+c]]=1;pos[r]=c;
      let ok=true;for(let q=0;q<n&&ok;q++){if(reg[q])continue;let f=false;for(let i=(r+1)*n;i<n*n&&!f;i++)if(rg[i]===q&&!col[i%n])f=true;if(!f)ok=false;}
      if(ok)go(r+1);col[c]=0;reg[rg[r*n+c]]=0;if(sols.length>=lim)return;}})(0);
  return {sols,nodes,cut:nodes>cap};}
// 8×8 comes from the bank below (made by this generator, too slow to run on a phone), turned or mirrored
function sbGen(lv){const n=[0,5,6,8][lv];
  if(lv===3&&typeof SB_BANK!=='undefined'){const r=SB_BANK[u2Pick('sb3',SB_BANK.length)],t=u2Sym(8,u2R(8));return {n,r:t.map(i=>r[i]).join('')};}
  for(let t=0;t<4000;t++){const pos=[];(function go(r){if(r===n)return true;for(const c of u2Sh(u2Rng(n))){if(pos.includes(c)||r&&Math.abs(pos[r-1]-c)<=1)continue;pos[r]=c;if(go(r+1))return true;}pos.length=r;return false;})(0);
    if(pos.length<n)continue;const rg=Array(n*n).fill(-1);pos.forEach((c,r)=>{rg[r*n+c]=r;});
    // regions grow from their star, a random free neighbour at a time
    let left=n*n-n;while(left){const fr=[];rg.forEach((q,i)=>{if(q<0)return;const r=Math.floor(i/n),c=i%n;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n&&rg[rr*n+cc]<0)fr.push([rr*n+cc,q]);}});
      const [i,q]=fr[u2R(fr.length)];rg[i]=q;left--;}
    const pz={n,r:rg.map(x=>x.toString(36)).join('')};const r=sbCount(pz,2,30000);if(r.sols.length===1&&!r.cut)return pz;}
  return null;}
function sbCheck(pz,s){const n=pz.n;if(s.length!==n*n||!/^[01]+$/.test(s))return false;const st=u2Rng(n*n).filter(i=>s[i]==='1');if(st.length!==n)return false;
  const rs=new Set(st.map(i=>Math.floor(i/n))),cs=new Set(st.map(i=>i%n)),gs=new Set(st.map(i=>pz.r[i]));if(rs.size<n||cs.size<n||gs.size<n)return false;
  return st.every(a=>st.every(b=>a===b||Math.abs(Math.floor(a/n)-Math.floor(b/n))>1||Math.abs(a%n-b%n)>1));}
function sbBad(pz,w){const n=pz.n,st=u2Rng(n*n).filter(i=>w[i]==='1'),bad=new Set();
  for(const a of st)for(const b of st){if(a>=b)continue;const ra=Math.floor(a/n),rb=Math.floor(b/n),ca=a%n,cb=b%n;if(ra===rb||ca===cb||pz.r[a]===pz.r[b]||Math.abs(ra-rb)<=1&&Math.abs(ca-cb)<=1){bad.add(a);bad.add(b);}}return bad;}
const SB_COL=['#FFD59E','#BFE3FF','#CDEFC0','#F8C8DF','#DCCFFF','#FFF0A0','#B9EDE6','#E6D5BE'];
GAMES.u_star=u2Game({name:'النجوم',cls:'sb',lbc:'#C78A12',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D79A1E"/><rect x="12" y="12" width="76" height="76" rx="6" fill="#FFF4D6"/><path d="M12 50H44V88M44 12V31H88M66 31V88" stroke="#8A5A0B" stroke-width="4" fill="none"/>${[[24,24],[76,44],[30,70]].map(([x,y])=>`<path transform="translate(${x} ${y})" d="M0-9l2.6 5.6 6.1.7-4.5 4.2 1.2 6L0 4.5-5.4 7.5l1.2-6-4.5-4.2 6.1-.7z" fill="#E8833A"/>`).join('')}</svg>`,
  title:'نجمة وحدة بكل صف وعمود ومنطقة',goal:'والنجوم ما تلامس بعض أبد، ولا حتى بالقطري.',lvTxt:['','5×5','6×6','8×8'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=5?240000:pz.n<=6?360000:600000,botT:pz=>pz.n*pz.n*1.3,
  gen:sbGen,check:sbCheck,solve:pz=>sbCount(pz,1,500000).sols[0]||null,
  spoil:(pz,s)=>{const i=s.indexOf('1');return setAt(setAt(s,i,'0'),(i+1)%s.length,'1');},
  init:pz=>'0'.repeat(pz.n*pz.n),sub:(pz,w)=>w.replace(/2/g,'0'),
  tap(a,i,pz,st){if(a==='md'&&(i===1||i===2))st.md=i;return false;},
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0)return false;u2Push(st);const md=String(st.md||1);st.w=setAt(st.w,c.i,st.w[c.i]===md?'0':md);return true;},
  view(pz,w,st){const n=pz.n,bad=sbBad(pz,w),r=pz.r,k=[...w].filter(x=>x==='1').length;
    return u2Grid('sb',n,n,i=>{const rr=Math.floor(i/n),c=i%n;return [`${c<n-1&&r[i]!==r[i+1]?' br':''}${rr<n-1&&r[i]!==r[i+n]?' bb':''} s${w[i]} ${bad.has(i)?'bad':''}" style="--rc:${SB_COL[parseInt(r[i],36)]}`,w[i]==='1'?'★':w[i]==='2'?'•':''];})
      +`<p class="note u2n">★ ${k} من ${n}</p>${u2Seg('md',[[1,'★ نجمة'],[2,'• فاضي']],st.md||1)}`;}});
HELP.u_star='الكل ياخذ نفس اللوحة بنفس الوقت. اللوحة مقسومة مناطق ملونة بعددها نفس عدد الصفوف. حط نجمة وحدة بالضبط بكل صف، ونجمة وحدة بكل عمود، ونجمة وحدة بكل منطقة، وما تلامس نجمة نجمة ثانية أبد (لا من الجنب ولا بالقطري). اختار «نجمة» والمس الخانة، و«فاضي •» تعلّم الخانات اللي ما فيها نجمة (تساعدك بس). النجوم اللي تكسر قاعدة تصير حمرا. أول ما تكمل صح تنرسل لحالها. المستويات 5×5 و6×6 و8×8. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';
// star battle 8×8: 40 regions, each checked to have one answer (made with sbGen and sbCount)
const SB_BANK=["1110444411144444122244441224444355564444555666667766666677777766","1133330015333332153333225533633355546633555466667554666677746666","0211114422213344222333442333333466333554666665746666677766667777","2001111122211111222111112235511177775514777756667777566677777766","4422222044411220444312224443222244442522444555224666522276666222","2223111022333111423333314333336643333665433366556666665566667655","1122022211222232112222334142233344422633544266335444666654447766","1120002212222222122224443362444566664445666645556666445566664447","3320021133202211332222113333224433332444533333445366333357766333","1122003341122333442233334666635546665357666655576666555766666677","0022111122221111222211113222611132266644332665553366667766666777","2222201122222111222222312222223344422233444552226666522276666222","2011111120511131255514335555443455554444555546665556666655666667","1133302211333222333332223333522243435572444555774445777644557777","0000333311003333111333225553332255533342555773775556777755577777","0003331103333341333332413333324453333444566333746663377466677774","0021111120211111222115553225555532255554622555556666555566665577","0111111101111111221111142551344425114444555544665555446655554776","0001222201112222332222223332222233324446333557663377776777777777","2221011322211113222444132224444322224444222544446777774477777744","0011111433111114333124443334444455554444555555445555566655557776","1110000011100000111020004111100344177000445770604477776644776666","0001111102111111221111112333331133333451333334553333645533366475","4000011140003311422233314443333344443533444445334444456647444446","0000002211000222122222223322224433334444333666553333666733366677","1110022211111122114112223344112244441112444551114444776644444776","0112222233142222334422223344552244445522444555554445556644457766","0000111122224111424444444444444344444444555444445555564477555664","1220244412222444122224442222344425544444555554445555566455555677","1111110011111100111111123115555244455555444455556644555566444755","1110002211112222111122243111224455555444555555775555567755555777","1110222211122222111322223333222253555245555555556555555755555557","1111110011111222114552221144535211445555664755554647755544477555","2220211122222211222225354422253544225555555555556555555565577555","2203333122233331223333312223333346333333466363574666677746777777","3322110033221114333224443555444435554444555766445557664455776666","1001111111111111233133142333333433333444333355543333576633337777","0000211133002111330221113344466533444665344666553446665536666657","2211100422211144222111442222434452244444556444447666444476666666","0000000011000022300004423000044266065544666655546666557766667777"];

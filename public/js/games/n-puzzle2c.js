'use strict';
/* puzzles2, part 3: kakuro, numberlink, slitherlink and the Arabic word search. Kakuro, numberlink and slitherlink come from banks
   made with the generators below and checked to have one answer only (each is also turned or mirrored when dealt); the word search
   is made on the spot. The race itself (u2Game) is in n-puzzle2.js */

/* ========== 10. كاكورو (kakuro): sums across and down, no digit twice in a run ========== */
// pz.k: per cell '#' black or '.' white; pz.x: [cell, across sum, down sum] for the black cells that carry a clue
function kkRuns(pz){const w=pz.w,h=pz.h,runs=[];const clue={};for(const [i,a,dn] of pz.x)clue[i]=[a,dn];
  for(let i=0;i<w*h;i++){if(pz.k[i]!=='#')continue;const r=Math.floor(i/w),c=i%w,cl=clue[i]||[0,0];
    if(c<w-1&&pz.k[i+1]==='.'){const cells=[];for(let j=i+1;j%w!==0&&pz.k[j]==='.';j++)cells.push(j);runs.push({cells,t:cl[0],d:0,at:i});}
    if(r<h-1&&pz.k[i+w]==='.'){const cells=[];for(let j=i+w;j<w*h&&pz.k[j]==='.';j+=w)cells.push(j);runs.push({cells,t:cl[1],d:1,at:i});}}
  return runs;}
// the digit sets (as masks) of length len that add up to t
const KKC={};
function kkCombos(len,t){const k=len+':'+t;if(KKC[k])return KKC[k];const out=[];(function go(v,left,s,m){if(left===0){if(s===t)out.push(m);return;}for(let d=v;d<=9;d++){if(s+d>t)break;go(d+1,left-1,s+d,m|1<<d);}})(1,len,0,0);return KKC[k]=out;}
function kkCount(pz,lim,cap){const N=pz.w*pz.h,runs=kkRuns(pz);let nodes=0;const sols=[];const byCell=u2Rng(N,()=>[]);runs.forEach((r,j)=>r.cells.forEach(i=>byCell[i].push(j)));
  const C=runs.map(r=>kkCombos(r.cells.length,r.t));const D0=u2Rng(N,i=>pz.k[i]==='.'?1022:0);
  function prop(D){let ch=true;while(ch){ch=false;
      for(let j=0;j<runs.length;j++){const cs=runs[j].cells;let fixed=0;for(const i of cs){const m=D[i];if((m&(m-1))===0){if(fixed&m)return false;fixed|=m;}}
        let any=0;const ok=C[j].filter(cm=>(cm&fixed)===fixed&&cs.every(i=>D[i]&cm));if(!ok.length)return false;for(const cm of ok)any|=cm;
        for(const i of cs){let m=D[i]&any;if((m&(m-1))!==0)m&=~fixed;if(!m)return false;if(m!==D[i]){D[i]=m;ch=true;}}
        // a digit only one cell of the run can take, in every combination that is left
        let must=1022;for(const cm of ok)must&=cm;for(let d=1;d<=9;d++){const b=1<<d;if(!(must&b)||(fixed&b))continue;const where=cs.filter(i=>D[i]&b);if(!where.length)return false;if(where.length===1&&D[where[0]]!==b){D[where[0]]=b;ch=true;}}}}
    return true;}
  (function go(D){if(sols.length>=lim||++nodes>cap)return;if(!prop(D))return;let best=-1,bc=99;for(let i=0;i<N;i++){if(!D[i])continue;const c=u2Bits(D[i]);if(c>1&&c<bc){bc=c;best=i;}}
    if(best<0){sols.push(D.map(m=>m?u2Low(m):0).join(''));return;}for(let v=1;v<=9;v++)if(D[best]&(1<<v)){const E=D.slice();E[best]=1<<v;go(E);if(sols.length>=lim)return;}})(D0);
  return {sols,nodes,cut:nodes>cap};}
// a layout: black frame on the top row and left column, black cells inside so every run is 2..maxRun long and all white cells connect
function kkLayout(w,h,dens,maxRun){for(let t=0;t<500;t++){const k=Array(w*h).fill('.');for(let i=0;i<w;i++)k[i]='#';for(let r=0;r<h;r++)k[r*w]='#';
    for(let r=1;r<h;r++)for(let c=1;c<w;c++){if(Math.random()<dens){k[r*w+c]='#';const j=(h-r)*w+(w-c);if(j<w*h&&(h-r)>=1&&(w-c)>=1)k[j]='#';}}
    const s=k.join('');const pz={w,h,k:s,x:[]};const runs=kkRuns(pz);
    if(runs.some(r=>r.cells.length<2||r.cells.length>maxRun))continue;
    // every white cell sits in one across and one down run
    let bad=false;for(let i=0;i<w*h;i++)if(s[i]==='.'){const a=runs.filter(r=>r.cells.includes(i));if(a.length!==2){bad=true;break;}}if(bad)continue;
    const wh=u2Rng(w*h).filter(i=>s[i]==='.');if(wh.length<(w-1)*(h-1)*.55)continue;const seen=new Set([wh[0]]),st=[wh[0]];
    while(st.length){const i=st.pop();for(const j of [i-1,i+1,i-w,i+w])if(j>=0&&j<w*h&&s[j]==='.'&&!seen.has(j)&&(Math.abs(j-i)===w||Math.floor(j/w)===Math.floor(i/w))){seen.add(j);st.push(j);}}
    if(seen.size===wh.length)return s;}return null;}
function kkGen(w,h,dens,maxRun,tries){for(let t=0;t<(tries||200);t++){const k=kkLayout(w,h,dens,maxRun);if(!k)continue;const pz0={w,h,k,x:[]},runs=kkRuns(pz0);
    // digits that never repeat in a run, then the sums
    const v=Array(w*h).fill(0);const cells=u2Rng(w*h).filter(i=>k[i]==='.');const runOf=u2Rng(w*h,()=>[]);runs.forEach((r,j)=>r.cells.forEach(i=>runOf[i].push(j)));
    // each run leans to small or big digits, so its sum has few ways to be made
    const lean=runs.map(()=>Math.random()<.5?-1:1);const order=i=>{const l=runOf[i].reduce((a,j)=>a+lean[j],0);const ds=u2Sh(u2Rng(9,x=>x+1));return l?ds.sort((a,b)=>l*(b-a)+(Math.random()-.5)*5):ds;};
    let n=0;const ok=(function go(p){if(++n>20000)return false;if(p===cells.length)return true;const i=cells[p];for(const d of order(i)){if(runOf[i].some(j=>runs[j].cells.some(c=>v[c]===d)))continue;v[i]=d;if(go(p+1))return true;v[i]=0;}return false;})(0);
    if(!ok)continue;const x={};runs.forEach(r=>{const s=r.cells.reduce((a,i)=>a+v[i],0);(x[r.at]=x[r.at]||[r.at,0,0])[r.d?2:1]=s;});
    const pz={w,h,k,x:Object.values(x).sort((a,b)=>a[0]-b[0])};const c=kkCount(pz,2,40000);if(c.sols.length===1&&!c.cut)return pz;}return null;}
function kkCheck(pz,s){const N=pz.w*pz.h;if(s.length!==N)return false;for(let i=0;i<N;i++){if(pz.k[i]==='.'?!/[1-9]/.test(s[i]):s[i]!=='0')return false;}
  return kkRuns(pz).every(r=>{const ds=r.cells.map(i=>+s[i]);return new Set(ds).size===ds.length&&ds.reduce((a,b)=>a+b,0)===r.t;});}
// turning a kakuro over its diagonal swaps across and down
function kkFlip(pz){const w=pz.w,h=pz.h,k=u2Rng(w*h,i=>{const r=Math.floor(i/h),c=i%h;return pz.k[c*w+r];}).join('');return {w:h,h:w,k,x:pz.x.map(([i,a,d])=>[(i%w)*h+Math.floor(i/w),d,a]).sort((a,b)=>a[0]-b[0])};}

/* ========== 11. وصّل الأرقام (numberlink): join each pair, paths never cross and fill the board ========== */
// pz.g: '.' or a letter per cell (the two ends of a pair share it). Solutions are counted on links: each cell joins its right and
// lower neighbour or not; an end has one link, any other cell two, links never close a loop or join two different pairs
function nlCount(pz,lim,cap){const n=pz.n,N=n*n,g=pz.g;let nodes=0;const sols=[];const par=u2Rng(N),lab=u2Rng(N,i=>g[i]==='.'?null:g[i]);
  const R=new Uint8Array(N),Dn=new Uint8Array(N);
  const find=x=>{while(par[x]!==x)x=par[x];return x;};
  const need=i=>g[i]==='.'?2:1;
  (function go(i){if(sols.length>=lim||++nodes>cap)return;
    if(i===N){sols.push(u2Rng(N,k=>R[k]+2*Dn[k]).join(''));return;}
    const r=Math.floor(i/n),c=i%n,has=(c>0?R[i-1]:0)+(r>0?Dn[i-n]:0),want=need(i)-has;if(want<0||want>2)return;
    const opts=[];if(want===0)opts.push([0,0]);if(want===1){if(c<n-1)opts.push([1,0]);if(r<n-1)opts.push([0,1]);}if(want===2&&c<n-1&&r<n-1)opts.push([1,1]);
    for(const [a,b] of opts){
      // links to cells that are already full are not allowed
      if(a&&(need(i+1)-((r>0?Dn[i+1-n]:0))<1))continue;if(b&&need(i+n)<1)continue;
      const saved=[];let ok=true;const join=(x,y)=>{const px=find(x),py=find(y);if(px===py)return false;const lx=lab[px],ly=lab[py];if(lx&&ly&&lx!==ly)return false;saved.push([py,par[py],px,lab[px]]);par[py]=px;lab[px]=lx||ly;return true;};
      if(a&&!join(i,i+1))ok=false;if(ok&&b&&!join(i,i+n))ok=false;
      // the cell above, now finished, must not leave a dead piece: a finished piece needs both ends
      if(ok){R[i]=a;Dn[i]=b;go(i+1);R[i]=0;Dn[i]=0;}
      while(saved.length){const [py,pp,px,lx]=saved.pop();par[py]=pp;lab[px]=lx;}
      if(sols.length>=lim)return;}})(0);
  return {sols,nodes,cut:nodes>cap};}
// the paths of a link solution, from each pair's first end
function nlPaths(pz,s){const n=pz.n,N=n*n,adj=u2Rng(N,()=>[]);for(let i=0;i<N;i++){const v=+s[i];if(v&1){adj[i].push(i+1);adj[i+1].push(i);}if(v&2){adj[i].push(i+n);adj[i+n].push(i);}}
  const out={};for(let i=0;i<N;i++){const L=pz.g[i];if(L==='.'||out[L])continue;const p=[i];let prev=-1,cur=i;for(let k=0;k<N;k++){const nx=adj[cur].find(j=>j!==prev);if(nx==null)break;p.push(nx);prev=cur;cur=nx;if(pz.g[nx]!=='.')break;}out[L]=p;}return out;}
const NL_CH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
// a random cover of the board by paths, longer ones first; the ends become the puzzle
function nlGen(n,pairs,tries){for(let t=0;t<(tries||3000);t++){const N=n*n,id=Array(N).fill(-1),paths=[];const nb=i=>{const r=Math.floor(i/n),c=i%n;return [r>0?i-n:-1,r<n-1?i+n:-1,c>0?i-1:-1,c<n-1?i+1:-1].filter(j=>j>=0);};
    const freeN=i=>nb(i).filter(j=>id[j]<0).length;let guard=0;
    while(id.includes(-1)&&guard++<200){const fr=u2Rng(N).filter(i=>id[i]<0);const mn=Math.min(...fr.map(freeN));const st=u2Sh(fr.filter(i=>freeN(i)===mn))[0];
      const p=[st];id[st]=paths.length;const len=3+u2R(Math.max(2,Math.round(N/pairs)));
      while(p.length<len){const h=p[p.length-1];const c=nb(h).filter(j=>id[j]<0);if(!c.length)break;const m=Math.min(...c.map(freeN));const pick=u2Sh(c.filter(j=>freeN(j)===m||Math.random()<.3))[0];id[pick]=paths.length;p.push(pick);}
      paths.push(p);}
    // single cells join a neighbouring path at its end
    let fixed=true;for(const p of paths){if(p.length>=2)continue;const i=p[0];const host=paths.find(q=>q!==p&&q.length>=2&&(nb(i).includes(q[0])||nb(i).includes(q[q.length-1])));if(!host){fixed=false;break;}
      if(nb(i).includes(host[0]))host.unshift(i);else host.push(i);p.length=0;}
    if(!fixed)continue;const ps=paths.filter(p=>p.length>=2);if(ps.length<pairs-1||ps.length>pairs+1||ps.filter(p=>p.length<3).length>(n<6?1:0))continue;
    const g=Array(N).fill('.');ps.forEach((p,k)=>{g[p[0]]=g[p[p.length-1]]='abcdefghij'[k];});const pz={n,g:g.join('')};const c=nlCount(pz,2,200000);if(c.sols.length===1&&!c.cut)return pz;}return null;}
// a player's answer: one path per pair, cells in base-64, pairs joined by '|'
function nlCheck(pz,s){const n=pz.n,N=n*n,used=new Uint8Array(N);const L=[...new Set(pz.g.replace(/\./g,''))].sort();const ps=s.split('|');if(ps.length!==L.length)return false;
  for(let k=0;k<L.length;k++){const p=[...ps[k]].map(ch=>NL_CH.indexOf(ch));if(p.length<2||p.some(i=>i<0||i>=N))return false;
    const ends=u2Rng(N).filter(i=>pz.g[i]===L[k]);if(!(p[0]===ends[0]&&p[p.length-1]===ends[1]||p[0]===ends[1]&&p[p.length-1]===ends[0]))return false;
    for(let j=0;j<p.length;j++){const i=p[j];if(used[i])return false;used[i]=1;if(j&&!(Math.abs(i-p[j-1])===n||Math.abs(i-p[j-1])===1&&Math.floor(i/n)===Math.floor(p[j-1]/n)))return false;if(j>0&&j<p.length-1&&pz.g[i]!=='.')return false;}}
  return used.every(Boolean);}

/* ========== 12. سليذرلينك (slitherlink): one loop around the dots; a number says how many of its four sides the loop uses ========== */
// edges: horizontal ones first ((h+1) rows of w), then vertical ones (h rows of w+1)
const slkE=(w,h)=>({H:(h+1)*w,V:h*(w+1)});
const slkHE=(w,r,c)=>r*w+c,slkVE=(w,h,r,c)=>(h+1)*w+r*(w+1)+c;
function slkCellE(w,h,i){const r=Math.floor(i/w),c=i%w;return [slkHE(w,r,c),slkHE(w,r+1,c),slkVE(w,h,r,c),slkVE(w,h,r,c+1)];}
function slkVertE(w,h,r,c){const o=[];if(c>0)o.push(slkHE(w,r,c-1));if(c<w)o.push(slkHE(w,r,c));if(r>0)o.push(slkVE(w,h,r-1,c));if(r<h)o.push(slkVE(w,h,r,c));return o;}
// one loop that meets every clue
function slkLoop(w,h,e){const E=e.length;const on=u2Rng(E).filter(k=>e[k]===1);if(!on.length)return false;
  for(let r=0;r<=h;r++)for(let c=0;c<=w;c++){const d=slkVertE(w,h,r,c).filter(k=>e[k]===1).length;if(d!==0&&d!==2)return false;}
  // walk the loop from one edge: it must use every lit edge
  const ends=k=>k<(h+1)*w?[[Math.floor(k/w),k%w],[Math.floor(k/w),k%w+1]]:(()=>{const j=k-(h+1)*w,r=Math.floor(j/(w+1)),c=j%(w+1);return [[r,c],[r+1,c]];})();
  const seen=new Set([on[0]]);let [a,b]=ends(on[0]);let cur=b,prev=on[0];for(let s=0;s<E;s++){const nx=slkVertE(w,h,cur[0],cur[1]).find(k=>e[k]===1&&k!==prev);if(nx==null)return false;if(seen.has(nx))break;seen.add(nx);const [p,q]=ends(nx);cur=p[0]===cur[0]&&p[1]===cur[1]?q:p;prev=nx;}
  return seen.size===on.length;}
function slkCount(pz,lim,cap){const w=pz.w,h=pz.h,{H,V}=slkE(w,h),E=H+V;let nodes=0;const sols=[];
  const cellE=u2Rng(w*h,i=>slkCellE(w,h,i)),verts=[];for(let r=0;r<=h;r++)for(let c=0;c<=w;c++)verts.push(slkVertE(w,h,r,c));
  const cons=[];pz.c.split('').forEach((ch,i)=>{if(ch!=='.')cons.push({es:cellE[i],lo:+ch,hi:+ch});});verts.forEach(es=>cons.push({es,v:1}));
  const byE=u2Rng(E,()=>[]);cons.forEach((k,j)=>k.es.forEach(x=>byE[x].push(j)));
  // -1 unknown, 0 off, 1 on
  function prop(e,q){while(q.length){const j=q.pop(),k=cons[j];let on=0,un=0;for(const x of k.es){if(e[x]===1)on++;else if(e[x]<0)un++;}
      if(k.v){if(on>2||on===1&&un===0)return false;let set=-1;if(on===2&&un)set=0;else if(on===1&&un===1)set=1;else if(on===0&&un===1)set=0;
        if(set>=0)for(const x of k.es)if(e[x]<0){e[x]=set;for(const jj of byE[x])q.push(jj);}}
      else{if(on>k.hi||on+un<k.lo)return false;let set=-1;if(on===k.hi&&un)set=0;else if(on+un===k.lo&&un)set=1;if(set>=0)for(const x of k.es)if(e[x]<0){e[x]=set;for(const jj of byE[x])q.push(jj);}}}
    return true;}
  // a closed loop that does not use every lit edge (or leaves a clue short) is a dead end
  function small(e){const on=u2Rng(E).filter(k=>e[k]===1);if(!on.length)return false;const g=new Map();const vk=(r,c)=>r*(w+1)+c;
    const ends=k=>k<H?[vk(Math.floor(k/w),k%w),vk(Math.floor(k/w),k%w+1)]:(()=>{const j=k-H,r=Math.floor(j/(w+1)),c=j%(w+1);return [vk(r,c),vk(r+1,c)];})();
    for(const k of on){const [a,b]=ends(k);(g.get(a)||g.set(a,[]).get(a)).push(b);(g.get(b)||g.set(b,[]).get(b)).push(a);}
    const seen=new Set();for(const s of g.keys()){if(seen.has(s))continue;let closed=true,cnt=0;const st=[s];seen.add(s);while(st.length){const v=st.pop();cnt++;const nb=g.get(v);if(nb.length<2)closed=false;for(const x of nb)if(!seen.has(x)){seen.add(x);st.push(x);}}
      if(closed&&cnt<g.size)return true;if(closed&&e.includes(-1)){/* the whole lit part is one loop: everything else must be off */const t=e.map(x=>x<0?0:x);if(!slkOk(t))return true;}}return false;}
  const slkOk=t=>cons.every(k=>{const on=k.es.filter(x=>t[x]===1).length;return k.v?on===0||on===2:on===k.lo;});
  (function go(e){if(sols.length>=lim||++nodes>cap)return;if(small(e))return;const i=e.indexOf(-1);
    if(i<0){if(slkLoop(w,h,e))sols.push(e.join(''));return;}
    for(const v of [1,0]){const f=e.slice();f[i]=v;if(prop(f,[...byE[i]]))go(f);if(sols.length>=lim)return;}})((()=>{const e=Array(E).fill(-1);return prop(e,u2Rng(cons.length))?e:Array(E).fill(-2);})());
  return {sols,nodes,cut:nodes>cap};}
// a loop from a region of cells that is in one piece, has no holes and never touches itself at a corner
function slkGen(w,h,keep,tries){for(let t=0;t<(tries||300);t++){const N=w*h,inR=new Uint8Array(N);const s0=u2R(N);inR[s0]=1;const target=Math.round(N*(.38+Math.random()*.2));let cnt=1,guard=0;
    const nb=i=>{const r=Math.floor(i/w),c=i%w;return [r>0?i-w:-1,r<h-1?i+w:-1,c>0?i-1:-1,c<w-1?i+1:-1].filter(j=>j>=0);};
    const holeFree=()=>{// outside cells (with the frame) must all connect
      const out=new Uint8Array(N),st=[];for(let i=0;i<N;i++){const r=Math.floor(i/w),c=i%w;if(!inR[i]&&(r===0||c===0||r===h-1||c===w-1)){out[i]=1;st.push(i);}}
      while(st.length){const i=st.pop();for(const j of nb(i))if(!inR[j]&&!out[j]){out[j]=1;st.push(j);}}for(let i=0;i<N;i++)if(!inR[i]&&!out[i])return false;
      for(let r=0;r<h-1;r++)for(let c=0;c<w-1;c++){const a=inR[r*w+c],b=inR[r*w+c+1],d=inR[(r+1)*w+c],e=inR[(r+1)*w+c+1];if(a===e&&b===d&&a!==b)return false;}return true;};
    while(cnt<target&&guard++<N*20){const fr=[];for(let i=0;i<N;i++)if(inR[i])for(const j of nb(i))if(!inR[j])fr.push(j);const j=fr[u2R(fr.length)];inR[j]=1;if(holeFree())cnt++;else inR[j]=0;}
    if(!holeFree())continue;
    const clue=u2Rng(N,i=>{const r=Math.floor(i/w),c=i%w;let k=0;for(const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){const o=rr>=0&&rr<h&&cc>=0&&cc<w?inR[rr*w+cc]:0;if(o!==inR[i])k++;}return k;});
    const pz={w,h,c:clue.join('')};const c0=slkCount(pz,2,8000);if(c0.sols.length!==1)continue;
    for(const i of u2Sh(u2Rng(N))){if([...pz.c].filter(x=>x!=='.').length<=N*keep)break;const old=pz.c;pz.c=setAt(old,i,'.');const c1=slkCount(pz,2,1000);if(c1.sols.length!==1||c1.cut)pz.c=old;}
    return pz;}return null;}
function slkCheck(pz,s){const w=pz.w,h=pz.h,{H,V}=slkE(w,h);if(s.length!==H+V||!/^[01]+$/.test(s))return false;const e=[...s].map(Number);if(!slkLoop(w,h,e))return false;
  return [...pz.c].every((ch,i)=>ch==='.'||slkCellE(w,h,i).filter(k=>e[k]===1).length===+ch);}

/* ---------- the games of part 3 ---------- */
// kakuro bank entries: "size#cells|cell,across,down;…"
function kkDec(s){const p=s.indexOf('#'),w=s.slice(0,p);const [k,x]=s.slice(p+1).split('|');return {w:+w,h:+w,k,x:x.split(';').map(t=>t.split(',').map(Number))};}
function kkDeal(lv){const B=KK_BANK[lv];let pz=kkDec(B[u2Pick('kk'+lv,B.length)]);if(Math.random()<.5)pz=kkFlip(pz);return pz;}
// the cells of the runs a cell is in (for the notes)
const kkPeers=pz=>{const runs=kkRuns(pz);return c=>runs.filter(r=>r.cells.includes(c)).flatMap(r=>r.cells);};
function kkBad(pz,v){const bad=new Set();for(const r of kkRuns(pz)){const ds=r.cells.map(i=>+v[i]),f=ds.filter(Boolean);
    r.cells.forEach((i,k)=>{if(ds[k]&&ds.filter(x=>x===ds[k]).length>1)bad.add(i);});
    const sum=f.reduce((a,b)=>a+b,0);if(sum>r.t||f.length===ds.length&&sum!==r.t)r.cells.forEach(i=>{if(+v[i])bad.add(i);});}return bad;}
GAMES.u_kakuro=u2Game({name:'كاكورو',cls:'kk',lbc:'#2E5E8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3570A8"/><rect x="12" y="12" width="76" height="76" rx="6" fill="#1F3550"/>${[[1,1,'3'],[1,2,'1'],[2,1,'9'],[2,2,'7']].map(([r,c,t])=>`<rect x="${13+c*25}" y="${13+r*25}" width="24" height="24" fill="#F5F9FF"/><text x="${25+c*25}" y="${31+r*25}" font-size="16" font-weight="900" fill="#2F80C2" text-anchor="middle">${t}</text>`).join('')}<path d="M13 38l24 24M38 13l24 24M13 63l24 24" stroke="#7FA6CF" stroke-width="1.5"/><g font-size="9" font-weight="900" fill="#FFE08A"><text x="16" y="58">12</text><text x="44" y="31">4</text><text x="69" y="31">8</text><text x="16" y="83">16</text></g></svg>`,
  title:'عبّ الخانات بأرقام مجموعها يساوي الرقم',goal:'كل سلسلة بيضا مجموعها الرقم اللي قبلها، وما يتكرر فيها رقم.',lvTxt:['','5×5','6×6','8×8'],
  size:pz=>pz.w+'×'+pz.h,cap:pz=>pz.w<=5?300000:pz.w<=6?480000:720000,botT:pz=>[...pz.k].filter(x=>x==='.').length*3,
  gen:kkDeal,check:kkCheck,solve:pz=>kkCount(pz,1,300000).sols[0]||null,
  spoil:(pz,s)=>{const i=pz.k.indexOf('.');return setAt(s,i,String(s[i]%9+1));},
  init:pz=>({v:pz.k.replace(/\./g,'0'),m:Array(pz.w*pz.h).fill(0)}),sub:(pz,w)=>w.v.includes('0')&&[...w.v].some((x,i)=>x==='0'&&pz.k[i]==='.')?'':w.v.replace(/#/g,'0'),
  tap:(a,i,pz,st)=>u2NTap(a,i,{g:pz.k},st,9,kkPeers(pz)),
  drag(kind,c,pz,st){if(kind!=='down'||c.i<0||pz.k[c.i]!=='.')return false;st.cur=c.i;return 'r';},
  view(pz,w,st){const W=pz.w,cl={};for(const [i,a,dn] of pz.x)cl[i]=[a,dn];const bad=kkBad(pz,w.v);
    return u2Grid('kk',W,pz.h,i=>{if(pz.k[i]==='#'){const x=cl[i];return [x?'bk cl':'bk',x?`${x[0]?`<sup>${x[0]}</sup>`:''}${x[1]?`<sub>${x[1]}</sub>`:''}`:''];}
      return [`${st.cur===i?'cur':''} ${bad.has(i)?'bad':''}`,w.v[i]!=='0'?`<b>${w.v[i]}</b>`:u2Notes(w.m[i],9)];})+u2Pad(9,st,5);}});
HELP.u_kakuro='مثل الكلمات المتقاطعة بس بالأرقام. الكل ياخذ نفس اللغز بنفس الوقت. عبّ كل خانة بيضا برقم من 1 لين 9. كل سلسلة خانات بيضا ورا بعض (أفقية أو عمودية) قبلها خانة غامقة فيها رقم: الرقم فوق الخط القطري مجموع السلسلة الأفقية اللي على يمينها، والرقم تحت الخط مجموع السلسلة العمودية اللي تحتها. وما يتكرر رقم بنفس السلسلة. المس خانة وبعدين رقم، و«ملاحظات» للاحتمالات. التكرار والمجموع الغلط يصيرون أحمر. أول ما تكمل صح تنرسل لحالها. المستويات 5×5 و6×6 و8×8. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

const NL_COL=['#EC6158','#3C9BD9','#3FAE5C','#E9A21F','#8E6BCB','#F07A3A','#E066A3','#1FA59C','#8A6E4B','#5E7690'];
// a bank puzzle, turned or mirrored, with its pairs numbered afresh in reading order
function nlDeal(lv){const B=NL_BANK[lv],g=B[u2Pick('nl'+lv,B.length)],n=Math.round(Math.sqrt(g.length)),t=u2Sym(n,u2R(8));
  const order=[];const g2=t.map(i=>g[i]);g2.forEach(x=>{if(x!=='.'&&!order.includes(x))order.push(x);});return {n,g:g2.map(x=>x==='.'?'.':'abcdefghij'[order.indexOf(x)]).join('')};}
const nlLetters=pz=>[...new Set(pz.g.replace(/\./g,''))].sort();
function nlSub(pz,p){const L=nlLetters(pz);return L.map((l,k)=>(p[k]||[]).map(i=>NL_CH[i]).join('')).join('|');}
const nlAdj=(n,a,b)=>Math.abs(a-b)===n||Math.abs(a-b)===1&&Math.floor(a/n)===Math.floor(b/n);
// a path is done when it runs from one end of its pair to the other
const nlDone=(pz,p,k)=>{const L=nlLetters(pz)[k];return p.length>1&&pz.g[p[0]]===L&&pz.g[p[p.length-1]]===L&&p[0]!==p[p.length-1];};
// the finger moves the path of the pair it started on; it may cut another path, never an end of another pair
function nlTo(pz,st,j){const w=st.w,k=st.dk;if(k==null)return false;const p=w.p[k],n=pz.n,head=p[p.length-1];if(j===head)return false;
  const at=p.indexOf(j);if(at>=0){p.length=at+1;return true;}
  if(!nlAdj(n,head,j)||nlDone(pz,p,k))return false;const L=nlLetters(pz);if(pz.g[j]!=='.'&&pz.g[j]!==L[k])return false;
  w.p.forEach((q,m)=>{if(m===k)return;const x=q.indexOf(j);if(x>=0)q.length=x;});p.push(j);return true;}
GAMES.u_link=u2Game({name:'وصّل الأرقام',cls:'nl',lbc:'#2C8A86',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E9A95"/><rect x="12" y="12" width="76" height="76" rx="8" fill="#F3FBFA"/><path d="M27 27H73V50" stroke="#EC6158" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 50V73H73" stroke="#3C9BD9" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${[[27,27,'#EC6158','1'],[73,50,'#EC6158','1'],[27,50,'#3C9BD9','2'],[73,73,'#3C9BD9','2']].map(([x,y,c,t])=>`<circle cx="${x}" cy="${y}" r="9" fill="${c}"/><text x="${x}" y="${y+4.5}" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">${t}</text>`).join('')}</svg>`,
  title:'وصّل كل رقمين متشابهين وعبّ اللوحة',goal:'الخطوط ما تتقاطع، ولازم تمر بكل الخانات.',lvTxt:['','5×5','6×6','7×7'],
  size:pz=>pz.n+'×'+pz.n,cap:pz=>pz.n<=5?240000:pz.n<=6?360000:480000,botT:pz=>pz.n*pz.n*1.1,
  gen:nlDeal,check:nlCheck,
  solve(pz){const c=nlCount(pz,1,2000000);if(!c.sols.length)return null;const P=nlPaths(pz,c.sols[0]);return nlLetters(pz).map(l=>P[l].map(i=>NL_CH[i]).join('')).join('|');},
  spoil:(pz,s)=>s.replace(/\|[^|]*$/,m=>m.slice(0,-1)),
  init:pz=>({p:nlLetters(pz).map(()=>[])}),sub:(pz,w)=>w.p.every((p,k)=>nlDone(pz,p,k))?nlSub(pz,w.p):'',tap:()=>false,
  drag(kind,c,pz,st){const w=st.w,L=nlLetters(pz);if(kind==='up'){const was=st.dk!=null;st.dk=null;return was;}if(c.i<0)return false;const i=c.i;
    if(kind==='down'){st.dk=null;const e=L.indexOf(pz.g[i]);if(e>=0){u2Push(st);st.dk=e;w.p[e]=[i];w.p.forEach((q,m)=>{if(m===e)return;const x=q.indexOf(i);if(x>=0)q.length=x;});return 'r';}
      const k=w.p.findIndex(q=>q.includes(i));if(k>=0){u2Push(st);st.dk=k;w.p[k].length=w.p[k].indexOf(i)+1;return 'r';}return false;}
    if(st.dk==null)return false;
    // a quick finger may skip cells: walk there along the row or column
    const p=w.p[st.dk],head=p[p.length-1],n=pz.n;let ch=false;if(p.includes(i))return nlTo(pz,st,i)?'r':false;
    const r0=Math.floor(head/n),c0=head%n,r1=Math.floor(i/n),c1=i%n;if(r0===r1||c0===c1){const step=r0===r1?(c1>c0?1:-1):(r1>r0?n:-n);let x=head;while(x!==i){x+=step;if(!nlTo(pz,st,x))break;ch=true;}}
    return ch?'r':false;},
  view(pz,w){const n=pz.n,U=10,L=nlLetters(pz),X=i=>(i%n+.5)*U,Y=i=>(Math.floor(i/n)+.5)*U;let s='';
    const used=new Set();w.p.forEach(p=>p.forEach(i=>used.add(i)));
    w.p.forEach((p,k)=>{if(p.length>1)s+=`<polyline class="pl" points="${p.map(i=>X(i)+','+Y(i)).join(' ')}" style="stroke:${NL_COL[k]}"/>`;});
    let tint='';w.p.forEach((p,k)=>p.forEach(i=>{tint+=`<rect x="${i%n*U}" y="${Math.floor(i/n)*U}" width="${U}" height="${U}" fill="${NL_COL[k]}" opacity=".16"/>`;}));
    let dots='';for(let i=0;i<n*n;i++){const k=L.indexOf(pz.g[i]);if(k<0)continue;dots+=`<circle cx="${X(i)}" cy="${Y(i)}" r="${U*.36}" fill="${NL_COL[k]}" class="${nlDone(pz,w.p[k],k)?'dn':''}"/><text x="${X(i)}" y="${Y(i)+U*.15}">${k+1}</text>`;}
    let gl='';for(let k=1;k<n;k++)gl+=`M${k*U} 0V${n*U}M0 ${k*U}H${n*U}`;
    const done=w.p.filter((p,k)=>nlDone(pz,p,k)).length;
    return `<div class="u2nlw"><svg class="u2nl" id="u2g-nl" data-ud="nl" data-w="${n}" data-h="${n}" viewBox="0 0 ${n*U} ${n*U}">${tint}<path class="gl" d="${gl}"/>${s}${dots}</svg></div><p class="note u2n">وصّلت ${done} من ${L.length} • الخانات ${used.size} من ${n*n}</p>`;}});
HELP.u_link='الكل ياخذ نفس اللوحة بنفس الوقت. فيها أزواج دواير ملونة بأرقام. اسحب إصبعك من دايرة لين الدايرة اللي نفس رقمها عشان ترسم خط بينهم من خانة لخانة (مو بالقطري). الخطوط ما تتقاطع ولا تمر على دايرة ثانية، ولازم في الآخر كل خانات اللوحة تكون مليانة بالخطوط. تقدر تكمل خط من نصه، ولو مرّيت على خط ثاني ينقطع. أول ما تكمل صح تنرسل لحالها. المستويات 5×5 و6×6 و7×7. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

// the edge nearest to a point of the board (x,y in cell units from the top left dot), or -1 when it is far from all
function slkNear(w,h,x,y){const rx=Math.round(x),ry=Math.round(y),dx=Math.abs(x-rx),dy=Math.abs(y-ry);
  if(dy<=dx){const r=ry,c=Math.floor(x);if(r>=0&&r<=h&&c>=0&&c<w&&dy<.38)return slkHE(w,r,c);}
  else{const c=rx,r=Math.floor(y);if(c>=0&&c<=w&&r>=0&&r<h&&dx<.38)return slkVE(w,h,r,c);}return -1;}
GAMES.u_slither=u2Game({name:'سليذرلينك',cls:'sk',lbc:'#4A4A8C',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#55559E"/><rect x="12" y="12" width="76" height="76" rx="8" fill="#F6F5FF"/><path d="M25 25H75V50H50V75H25Z" stroke="#2D2D6B" stroke-width="5" fill="none" stroke-linejoin="round"/>${u2Rng(16,i=>`<circle cx="${25+i%4*16.7}" cy="${25+Math.floor(i/4)*16.7}" r="2.5" fill="#2D2D6B"/>`).join('')}<g font-size="13" font-weight="900" fill="#E8833A" text-anchor="middle"><text x="33.5" y="38">2</text><text x="66.5" y="38">3</text><text x="33.5" y="71">3</text><text x="66.5" y="71">0</text></g></svg>`,
  title:'ارسم حلقة وحدة حول النقاط',goal:'الرقم يقول كم ضلع من أضلاع مربعه داخل بالحلقة.',lvTxt:['','5×5','6×6','7×7'],
  size:pz=>pz.w+'×'+pz.h,cap:pz=>pz.w<=5?300000:pz.w<=6?480000:600000,botT:pz=>pz.w*pz.h*2,
  gen(lv){const n=[0,5,6,7][lv];for(;;){const pz=slkGen(n,n,[0,.55,.45,.38][lv],60);if(pz)return pz;}},check:slkCheck,
  solve:pz=>slkCount(pz,1,400000).sols[0]||null,spoil:(pz,s)=>{const i=s.indexOf('1');return setAt(s,i,'0');},
  init:pz=>{const {H,V}=slkE(pz.w,pz.h);return '0'.repeat(H+V);},sub:(pz,w)=>w.replace(/2/g,'0'),tap:()=>false,
  // a tap draws a side (again: a cross, again: nothing); a drag carries the same mark over the sides it crosses
  drag(kind,c,pz,st){if(kind==='up'){const was=st.pv!=null;st.pv=null;return was;}const e=slkNear(pz.w,pz.h,c.x-.5,c.y-.5);if(e<0)return false;
    if(kind==='down'){u2Push(st);const v=st.w[e];st.pv=v==='0'?'1':v==='1'?'2':'0';st.w=setAt(st.w,e,st.pv);return 'r';}
    if(st.pv==null||st.w[e]===st.pv)return false;st.w=setAt(st.w,e,st.pv);return 'r';},
  view(pz,w){const W=pz.w,H=pz.h,U=10,{H:HE}=slkE(W,H);let on='',x='';
    const ends=k=>k<HE?[k%W,Math.floor(k/W),k%W+1,Math.floor(k/W)]:(()=>{const j=k-HE,r=Math.floor(j/(W+1)),c=j%(W+1);return [c,r,c,r+1];})();
    for(let k=0;k<w.length;k++){if(w[k]==='0')continue;const [a,b,c,d]=ends(k);if(w[k]==='1')on+=`M${a*U} ${b*U}L${c*U} ${d*U}`;else{const mx=(a+c)/2*U,my=(b+d)/2*U;x+=`M${mx-1.4} ${my-1.4}l2.8 2.8m0 -2.8l-2.8 2.8`;}}
    const badV=[];for(let r=0;r<=H;r++)for(let c=0;c<=W;c++){if(slkVertE(W,H,r,c).filter(k=>w[k]==='1').length>2)badV.push([c,r]);}
    let cl='';[...pz.c].forEach((ch,i)=>{if(ch==='.')return;const k=slkCellE(W,H,i).filter(e=>w[e]==='1').length;cl+=`<text x="${(i%W+.5)*U}" y="${(Math.floor(i/W)+.5)*U+3.6}" class="${k>+ch?'bad':k===+ch&&+ch>0?'ok':''}">${ch}</text>`;});
    let dots='';for(let r=0;r<=H;r++)for(let c=0;c<=W;c++)dots+=`<circle cx="${c*U}" cy="${r*U}" r="1.1"/>`;
    return `<div class="u2skw"><svg class="u2sk" id="u2g-sk" data-ud="sk" data-w="${W+1}" data-h="${H+1}" viewBox="${-U/2} ${-U/2} ${(W+1)*U} ${(H+1)*U}">${cl}<path class="on" d="${on}"/><path class="x" d="${x}"/><g class="dt">${dots}</g>${badV.map(([c,r])=>`<circle class="bv" cx="${c*U}" cy="${r*U}" r="2.2"/>`).join('')}</svg></div>`;}});
HELP.u_slither='الكل ياخذ نفس اللوحة بنفس الوقت. ارسم حلقة وحدة مقفلة تمشي على الخطوط بين النقاط، ما تتفرع ولا تقطع نفسها. الرقم داخل المربع يقول كم ضلع من أضلاعه الأربعة داخل بالحلقة (0 يعني ولا ضلع)، والمربع اللي بدون رقم ممكن أي عدد. المس الضلع عشان ترسمه، لمسة ثانية تحط عليه ✕ (يعني متأكد إنه مو بالحلقة)، والثالثة تمسحه، وتقدر تسحب إصبعك عشان ترسم أكثر من ضلع. الرقم يصير أخضر لما يكتمل وأحمر لما يزيد. أول ما تكمل الحلقة صح تنرسل لحالها. المستويات 5×5 و6×6 و7×7. كل جولة: اللي حلها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';

/* ========== 13. البحث عن الكلمات (Arabic word search): every word is in the grid exactly once ========== */
const WS_TH=[['حيوانات','أسد نمر فيل زرافة حصان جمل غزال ذئب ثعلب أرنب قرد نعامة تمساح سنجاب فهد حمار بقرة خروف قطة سلحفاة ضفدع قنفذ'],
  ['فواكه','تفاح موز برتقال عنب رمان مانجو خوخ مشمش تين تمر بطيخ فراولة كمثرى أناناس كرز ليمون جوافة'],
  ['خضار','جزر بطاطس طماطم خيار بصل ثوم فلفل باذنجان كوسا ملفوف سبانخ بامية فجل قرنبيط شمندر'],
  ['ألوان','أحمر أزرق أخضر أصفر أسود أبيض بني وردي رمادي برتقالي بنفسجي ذهبي فضي كحلي'],
  ['مهن','طبيب مهندس معلم طيار نجار حداد خباز شرطي ممرض مزارع رسام كاتب صياد طباخ خياط صيدلي فلاح'],
  ['أشياء البيت','باب نافذة سرير كرسي طاولة مطبخ ثلاجة فرن سجادة مصباح مرآة خزانة وسادة ستارة مكنسة'],
  ['المدرسة','قلم كتاب دفتر مسطرة ممحاة حقيبة سبورة طباشير فصل مكتبة مقلمة فرجار'],
  ['البحر','سمك حوت موجة شاطئ رمل صدف مرجان قارب سفينة مرساة شراع جزيرة أخطبوط دلفين لؤلؤ قرش'],
  ['الفضاء','شمس قمر نجم كوكب مجرة صاروخ مذنب نيزك مدار هلال كسوف خسوف مريخ زحل عطارد'],
  ['الطقس','مطر ثلج رعد برق غيم سحاب ضباب رياح عاصفة غبار ندى حرارة إعصار'],
  ['الرياضة','كرة ملعب هدف حكم سباحة جري تنس سلة مرمى فريق ميدالية كأس سباق فروسية'],
  ['جسم الإنسان','رأس عين أذن أنف قدم قلب كتف ركبة إصبع شعر لسان معدة ظهر رقبة جبهة'],
  ['الملابس','ثوب شماغ عقال قميص بنطال حذاء جورب قبعة معطف فستان عباءة وشاح حزام غترة'],
  ['الطيور','صقر نسر حمام عصفور بومة ببغاء بطة دجاجة ديك غراب طاووس نورس هدهد بلبل كناري'],
  ['المواصلات','سيارة قطار طائرة حافلة دراجة سفينة قارب شاحنة مترو عربة زورق مركبة'],
  ['الأكلات','خبز أرز كبسة حليب جبن عسل بيض لحم شوربة سمبوسة هريس جريش مرقوق لقيمات مندي حمص فلافل'],
  ['مدن عربية','جدة مكة أبها تبوك حائل جازان نجران دبي مسقط صلالة بيروت بغداد دمشق مراكش صنعاء'],
];
// filler letters by how often they show up in words
const WS_FILL=(()=>{const f={ا:9,ل:6,م:6,ر:6,ن:5,ي:5,و:5,ت:5,ب:5,س:4,ع:3,ح:3,ف:3,د:3,ق:3,ك:3,ج:2,ص:2,ط:2,ش:2,خ:2,ز:2,ه:2,ة:1,غ:1,ض:1,ث:1,ذ:1,ظ:1,أ:1};let s='';for(const c in f)s+=c.repeat(f[c]);return s;})();
const WS_D8=[[0,-1],[1,0],[1,-1],[1,1],[0,1],[-1,0],[-1,1],[-1,-1]];
// all the places a word reads in the grid (any of the 8 ways), each as a set of cells
function wsFind(n,g,word){const L=[...word],out=[];for(let i=0;i<n*n;i++){if(g[i]!==L[0])continue;const r=Math.floor(i/n),c=i%n;
    for(const [dr,dc] of WS_D8){let ok=true;for(let k=1;k<L.length&&ok;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||cc<0||rr>=n||cc>=n||g[rr*n+cc]!==L[k])ok=false;}
      if(ok)out.push([i,(r+dr*(L.length-1))*n+c+dc*(L.length-1)]);}}
  // a word that reads the same both ways is found twice on the same cells
  const key=([a,b])=>Math.min(a,b)+'_'+Math.max(a,b);return [...new Map(out.map(x=>[key(x),x])).values()];}
function wsGen(lv){const n=[0,8,10,12][lv],k=[0,6,8,10][lv],dirs=WS_D8.slice(0,[0,2,4,8][lv]);
  for(let t=0;t<200;t++){const th=WS_TH[u2Pick('ws',WS_TH.length)];let ws=u2Sh(th[1].split(' ').filter(x=>[...x].length>=3&&[...x].length<=n));
    // no word inside another (either way round)
    const pick=[];for(const x of ws){if(pick.length>=k)break;const rx=[...x].reverse().join('');if(pick.some(y=>y.includes(x)||x.includes(y)||y.includes(rx)||rx.includes(y)))continue;pick.push(x);}
    if(pick.length<k)continue;pick.sort((a,b)=>b.length-a.length);const g=Array(n*n).fill('');let ok=true;
    for(const x of pick){const L=[...x];let put=false;for(let tr=0;tr<300&&!put;tr++){const [dr,dc]=dirs[u2R(dirs.length)],r=u2R(n),c=u2R(n),er=r+dr*(L.length-1),ec=c+dc*(L.length-1);if(er<0||ec<0||er>=n||ec>=n)continue;
        let fit=true;for(let j=0;j<L.length&&fit;j++){const v=g[(r+dr*j)*n+c+dc*j];if(v&&v!==L[j])fit=false;}if(!fit)continue;for(let j=0;j<L.length;j++)g[(r+dr*j)*n+c+dc*j]=L[j];put=true;}
      if(!put){ok=false;break;}}
    if(!ok)continue;
    for(let f=0;f<40;f++){const gg=g.map(x=>x||WS_FILL[u2R(WS_FILL.length)]).join('');if(pick.every(x=>wsFind(n,gg,x).length===1))return {n,g:gg,w:pick.slice().sort(),t:th[0],lv};}}
  return null;}
function wsRead(n,g,a,b){const ra=Math.floor(a/n),ca=a%n,rb=Math.floor(b/n),cb=b%n,dr=Math.sign(rb-ra),dc=Math.sign(cb-ca),len=Math.max(Math.abs(rb-ra),Math.abs(cb-ca))+1;
  if(a===b||!(ra===rb||ca===cb||Math.abs(rb-ra)===Math.abs(cb-ca)))return null;let s='';for(let k=0;k<len;k++)s+=g[(ra+dr*k)*n+ca+dc*k];return s;}
function wsCheck(pz,s){const ps=s.split(',');if(ps.length!==pz.w.length)return false;const got=new Set();
  for(const p of ps){const m=/^(\d+)-(\d+)$/.exec(p);if(!m)return false;const a=+m[1],b=+m[2];if(a>=pz.n*pz.n||b>=pz.n*pz.n)return false;const x=wsRead(pz.n,pz.g,a,b);if(!x||!pz.w.includes(x)||got.has(x))return false;got.add(x);}
  return got.size===pz.w.length;}
const WS_COL=['#F2A33A','#4AB1E8','#4CB97F','#EC6158','#9C7BD6','#E57AAE','#2FB3AA','#E9C21F','#8A6E4B','#5E7690'];
GAMES.u_words=u2Game({name:'البحث عن الكلمات',cls:'ws',lbc:'#9A5B2E',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#B06A35"/><rect x="12" y="12" width="76" height="76" rx="8" fill="#FFF7EA"/><rect x="18" y="22" width="64" height="16" rx="8" fill="#F2A33A" opacity=".55"/><rect x="62" y="40" width="16" height="44" rx="8" fill="#4AB1E8" opacity=".5"/><g font-size="13" font-weight="900" fill="#5B3416" text-anchor="middle"><text x="26" y="35">ر</text><text x="42" y="35">م</text><text x="58" y="35">ل</text><text x="74" y="35">ب</text><text x="26" y="56">ك</text><text x="42" y="56">ن</text><text x="70" y="56">ت</text><text x="26" y="77">س</text><text x="42" y="77">ع</text><text x="70" y="77">ين</text></g></svg>`,
  title:'لقِ كل الكلمات المخبّاة',goal:'اسحب إصبعك على الكلمة من أول حرف لآخر حرف.',lvTxt:['','8×8','10×10','12×12'],
  size:pz=>pz.n+'×'+pz.n+' • '+pz.t,cap:pz=>pz.n<=8?240000:pz.n<=10?360000:480000,botT:pz=>pz.w.length*(pz.n<=8?6:pz.n<=10?8:10),
  gen(lv){for(;;){const pz=wsGen(lv);if(pz)return pz;}},check:wsCheck,
  solve:pz=>pz.w.map(x=>{const f=wsFind(pz.n,pz.g,x)[0];return f?f[0]+'-'+f[1]:'';}).join(','),
  spoil:(pz,s)=>s.split(',').slice(1).join(','),
  init:()=>({f:[]}),sub:(pz,w)=>w.f.length===pz.w.length?w.f.map(x=>x[1]+'-'+x[2]).join(','):'',tap:()=>false,
  drag(kind,c,pz,st){const n=pz.n,i=c.i;
    if(kind==='down'){if(i<0)return false;st.sa=i;st.sb=i;return 'r';}
    if(kind==='move'){if(st.sa==null||i<0||i===st.sb)return false;if(wsRead(n,pz.g,st.sa,i)!=null){st.sb=i;return 'r';}return false;}
    // up: a drag picks its line; a tap is the first or the last letter of a line
    const a=st.sa,b=st.sb;st.sa=st.sb=null;if(a==null)return false;let from=a,to=b;
    if(a===b){if(st.an==null||st.an===a){st.an=st.an===a?null:a;return 'r';}from=st.an;to=a;}
    st.an=null;const x=wsRead(n,pz.g,from,to);if(x&&pz.w.includes(x)&&!st.w.f.some(f=>f[0]===x)){u2Push(st);st.w.f.push([x,from,to]);try{sfx('pop');}catch(e){}return true;}
    st.miss=Date.now();return 'r';},
  view(pz,w,st){const n=pz.n,U=10,X=i=>(i%n+.5)*U,Y=i=>(Math.floor(i/n)+.5)*U;const line=(a,b,c,cls)=>`<line class="${cls}" x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" style="stroke:${c}"/>`;
    let ov=w.f.map((f,k)=>line(f[1],f[2],WS_COL[pz.w.indexOf(f[0])%WS_COL.length],'fd')).join('');
    if(st.sa!=null&&st.sb!=null&&st.sa!==st.sb)ov+=line(st.sa,st.sb,'#2D4763','cur');if(st.an!=null)ov+=`<circle class="an" cx="${X(st.an)}" cy="${Y(st.an)}" r="${U*.42}"/>`;
    const found=new Set(w.f.map(f=>f[0]));
    return u2Grid('ws',n,n,i=>['',pz.g[i]],'',`<svg class="u2wso" viewBox="0 0 ${n*U} ${n*U}" aria-hidden="true">${ov}</svg>`)+
      `<div class="u2wl">${pz.w.map(x=>`<span class="${found.has(x)?'ok':''}" style="--c:${WS_COL[pz.w.indexOf(x)%WS_COL.length]}">${x}</span>`).join('')}</div><p class="note u2n">${found.size} من ${pz.w.length}${pz.lv===1?' • الكلمات من اليمين لليسار أو من فوق لتحت':pz.lv===2?' • وفيه كلمات بالقطري':' • بكل الاتجاهات، حتى بالمقلوب'}</p>`;}});
HELP.u_words='الكل ياخذ نفس الشبكة بنفس الوقت. تحت الشبكة كلمات من موضوع واحد (حيوانات، فواكه، مهن…)، وكل كلمة مخبّاة بالشبكة مرة وحدة بس. اسحب إصبعك من أول حرف بالكلمة لآخر حرف (أو المس أول حرف وبعدين آخر حرف) بخط مستقيم. السهل: الكلمات من اليمين لليسار أو من فوق لتحت. المتوسط: وبالقطري بعد. الصعب: بكل الاتجاهات حتى بالمقلوب. الكلمة اللي تلقاها تتلون وتنشطب من القائمة. أول ما تلقى كل الكلمات تنرسل لحالها. كل جولة: اللي خلّصها نقطة والأسرع نقطتين، والأكثر نقاط يفوز (والتعادل يكسره الأقل وقت). ومع الفرق تنجمع نقاط الفريق.';
// numberlink 5×5, 6×6, 7×7: each checked to have one answer when every cell is used (made with nlGen and nlCount)
const NL_BANK={"1":["a....c...ad.ecb.e......db",".d..a.....ed.ab.eb..c.c..","..c...a.ee.b.d...cb.a...d","c.ed.b..e...c..bd..aa....","ab.bc......c....d.d...aee","....a.b...ac.c..d.....db.","c.....d.ee..db.a..cb....a","a...b..c....b...ac.d..d..",".ce....d..a..de.bc..a...b","....bbc..a..d..dc...a....","a.b.ba....c..d..deec.....","..d.a..cd.c.be......be.a.","a.......b..bca.c..e.d..de","..a.a.de.c....b.e....dcb.","a......aee..bd.cb.d.c....","..c.cb...b.ad.....d.a..ee","..eecc.....d.db.....a.a.b","a....b........a.cd.bd...c","a..ab..e....dbce..c.....d",".......deea.d....c..acb.b","..d..c...eb.d....ce.ba..a","...e...de.b.dc..c...ba..a","b.......c.cd..ba.da......","a...c.cd....bd.a...eb.e..","....b.cde.b...ea.c.d....a",".a.eb...d.ae......b.dc..c","....a.ab..d.e..c.deb....c","a..b....b.adc....e....dec","....d..e.ce.....bdc.ba..a","acb.b........ed.c...ad.e.","....a.....baded.c..e.b..c","d.dcaee....b.a..c.....b..","a..b..dacb.c....d.....e.e","c..b..d....ee..c.ad.a.b..",".bc...de.c......a.deb...a","..eda.e....c.d....ba..c.b","..dcaee...b.....dc....ba.","d..db..ec.ae........acb..","ba......b.d.c..d.e....eca","ab.c........d.....d.a.bc."],"2":["b..bca........fed.cf.....e.d.......a","a...abf.b.......dc.f..c....d...e.e..",".....a.cb.........af.e.....dc.fe..db",".ac........c.ef..d.f.e........abb.d.","a.b.bc.......d......cfef...d...ae...","b...cd....d...bfe..c..fe...a..a.....",".....a.df.......e.a..f..bdec.c.....b",".fe..a.........f.....deacd.c.....b.b","a.c...bad....f.e...ef........c...b.d","a.......e.cd.e...b.d......a.c.b.....","adc..c.....b...fe.........f...a.d.eb","a......cb.....e.ab.ef...cd....d...f.",".....a.b...c...ed.a.......dce...b...","af.f.e.....d.be......c..a..d..b....c","a......f..e..f..c...d..a.e...cdb...b","..a....cd..........ef.d..f..e.cb..ba","a..a.cb..b...dc..........ef.e...d..f","...ad..ed.....c..c....b...e...a..ffb","eff..a....b.eda.c....d........c...b.","...b...b.ca.e.....d.f.c...efd......a","b.fe...f..a..be.....d.d.c.........ca","...ca..f......de..d.f.....e.c.b...ba",".....dde......bf.e.cf..cb.....a....a",".....e.bad.......e..d.....c.b.a....c",".fb..b.c...cf..e.....dda.e....a.....","a....a....dbef.dc........ef..b.....c","a..b..c.aed........fef.........c..db","b....d.d..c..e.....fef.......cba...a","..d.ca....b.ed......c...fef.ab......","...c...f....fc.ba...e..b.d.....ed..a","a....a.c...b..b.cde.............e.d.",".ba....d.......fd.....e.bfe.c.c...a.","a.....ed..c....d..fe...a.f....c..b.b","a.....c..d...f..ab.e....f..cd.e.b...","cb...a.d......e....ef....f...a..cd.b","bf.f......a..ed....b....c..de.....ca","b....a.ac..f.b..e....f...ce..d..d...","..a..a..b....c.df....e....e.f.b...cd","f.b...f..c.....e...de.........a.adcb","...cf.c.be.......d....f.aba.e......d"],"3":["....d..c...c.......da.bef.............g...bgf..ea","...e..ad..fg..c..........fg...de......c.abb......","a.....e..d....a....g.d..f...ce.g..f.....cbb......",".d.c..a.....c....gb..d...f..e.g.h...h.f..a.e....b","cd......fe......gf...c..g...b....ed.......a....ab","ab....b.d..deca......fe........h.g..gh..c.....f..","....c.a.deg...c..fg.......ab.e.......d.b....f....","dc....a.d.....gfef..............ecag.b..........b","b..a....d...b.de.......c.g..........f.e......fgca","..ab....de.fg.....g..............b....efc.a....dc","b..c.d..f.b.c.....d....g.......eegaaf............","d.....ae.g.......f......g.dae.h..cbf..h...c....b.","bbg..hc..h.g..e.e.........f.ad.fc........d......a","ed....d...e..f.gf...c....g...bc.........baa......","......bb..ce....gf.fe.....gda.h..h..cd..........a","abef..c.....g........a....g......fc.bd.e........d",".....dbeg.f....h.....h...e..fg..cd......b.a.a...c","............dcbacb........f.....f....g..gda..e..e","c.g...d..h.d.....h.fe....f....c.g.eab....b......a","ac....c.fg.g.......ed.b.f.....d..e.........a....b","b...a.ad....bce....d.......c...gh.gf..e.hf.......",".....bcb..d...........afe..c.g..f...g...e.a....d.","...g..b..f.b..eg..fca.......d...e......d....c...a","....bf..e...e.b.d....a...g.f.c....g..c.hh.a.d....","a.ac..d.......c..h..eh..fgd....g...fe....bb......","......b.bc...c....f......e.ag.g..e..f.........dda","a...a....c..g...b....b....gf....c..d...dfe....e..","cd.a..a.....gb....hf...g......h.e.......f.cdeb...","ac......g.d..c.f..f..a..g.e.be...........d......b","......aabe...eb.....fc.fg.....g..h..d.h.d..c.....","..dfb.a.f..g....eh.............g.......hb.dec.ca.","a.............dfe..abf.g..c.g......e...d..c.....b","e..e.daf....c..g....a..d...b........f.b.c...g....","....dea..ge.....f........fc..d.g..........cb..b.a","..d..a..dc........e..e...gc.fg...b..h.h.....f..ba","b.....ea...g........d..egf....f......d....abc...c",".b....a...a..f..c..h..b.f.g.c..g.h...e..ed..d....","..h.b..h.g...b..d.......a.c.fg......e...c..f.e.da","ab......cd..d......f....g........gb..e..fea.c....","e......f...eb..gh..d..h...c.........gf.dc.a....ab"]};
// kakuro 5×5, 6×6, 8×8: each checked to have one answer (made with kkGen and kkCount)
const KK_BANK={"1":["5#######..###...###...###..|1,0,17;2,0,10;5,11,0;8,0,18;10,20,0;14,0,14;16,21,0;22,7,0","5#######..###...###...###..|1,0,17;2,0,12;5,16,0;8,0,6;10,12,0;14,0,5;16,6,0;22,6,0","5#########..##...#...##..##|3,0,11;4,0,13;7,15,6;11,7,10;15,6,0;20,12,0","5#######...##...###...##...|1,0,3;2,0,26;3,0,13;5,7,0;10,17,0;14,0,11;16,8,0;21,21,0","5#########..##...#...##..##|3,0,6;4,0,14;7,8,12;11,16,16;15,10,0;20,14,0","5#########..##...#...##..##|3,0,14;4,0,10;7,12,19;11,6,6;15,22,0;20,9,0","5#######...##...###...##...|1,0,11;2,0,27;3,0,13;5,7,0;10,23,0;14,0,6;16,9,0;21,18,0","5#######..###...###...###..|1,0,11;2,0,7;5,3,0;8,0,8;10,18,0;14,0,4;16,6,0;22,3,0","5########..##....#....##..#|2,0,14;3,0,26;6,7,4;9,0,17;10,15,0;15,26,0;21,13,0","5########...##...#...##...#|2,0,22;3,0,14;4,0,13;6,8,0;11,22,10;15,23,0;20,6,0","5########..##....#....##..#|2,0,25;3,0,17;6,3,14;9,0,8;10,30,0;15,14,0;21,17,0","5#########..##...#...##..##|3,0,19;4,0,4;7,5,18;11,20,14;15,24,0;20,6,0","5#######..###...###...###..|1,0,3;2,0,20;5,10,0;8,0,6;10,7,0;14,0,6;16,14,0;22,4,0","5#########..##...#...##..##|3,0,18;4,0,4;7,12,24;11,17,4;15,11,0;20,10,0","5#######..###...###...###..|1,0,12;2,0,7;5,5,0;8,0,12;10,21,0;14,0,4;16,6,0;22,3,0","5#######..###...###...###..|1,0,14;2,0,6;5,6,0;8,0,6;10,12,0;14,0,16;16,14,0;22,10,0","5#######..###...###...###..|1,0,5;2,0,19;5,13,0;8,0,12;10,10,0;14,0,9;16,6,0;22,16,0","5########...##...#...##...#|2,0,27;3,0,14;4,0,12;6,8,0;11,21,6;15,21,0;20,9,0","5#########..##...#...##..##|3,0,10;4,0,6;7,10,15;11,7,17;15,14,0;20,17,0","5########...##...#...##...#|2,0,10;3,0,29;4,0,5;6,8,0;11,16,10;15,10,0;20,20,0","5#######..###....#....###..|1,0,12;2,0,11;5,3,0;8,0,14;9,0,24;10,29,0;15,13,0;22,16,0","5#########..##...#...##..##|3,0,10;4,0,14;7,9,24;11,23,13;15,12,0;20,17,0","5#######...##...###...##...|1,0,10;2,0,13;3,0,25;5,8,0;10,21,0;14,0,12;16,23,0;21,8,0","5########...##...#...##...#|2,0,27;3,0,11;4,0,4;6,17,0;11,7,3;15,12,0;20,9,0","5#########..#....#....#..##|3,0,19;4,0,17;6,0,24;7,17,12;10,13,0;15,30,0;20,12,0","5########...#....#....#...#|2,0,11;3,0,13;4,0,12;6,6,23;10,28,0;15,15,0;20,10,0","5########...##...#...##...#|2,0,20;3,0,15;4,0,6;6,6,0;11,7,16;15,21,0;20,23,0","5#######...##...###...##...|1,0,7;2,0,15;3,0,28;5,9,0;10,23,0;14,0,10;16,20,0;21,8,0","5#########..##...#...##..##|3,0,18;4,0,7;7,12,6;11,7,3;15,11,0;20,4,0","5#######..###....#....###..|1,0,10;2,0,19;5,7,0;8,0,7;9,0,15;10,28,0;15,10,0;22,6,0","5#######..###...###...###..|1,0,6;2,0,12;5,3,0;8,0,24;10,22,0;14,0,10;16,10,0;22,17,0","5#######..###...###...###..|1,0,10;2,0,20;5,5,0;8,0,24;10,24,0;14,0,6;16,22,0;22,9,0","5#######..###...###...###..|1,0,9;2,0,24;5,8,0;8,0,14;10,23,0;14,0,11;16,24,0;22,3,0","5#########..##...#...##..##|3,0,18;4,0,15;7,17,19;11,24,16;15,10,0;20,17,0","5#######..###...###...###..|1,0,17;2,0,14;5,17,0;8,0,11;10,17,0;14,0,15;16,9,0;22,14,0","5#########..#....#....#..##|3,0,16;4,0,6;6,0,24;7,6,11;10,13,0;15,27,0;20,11,0","5########...##...#...##...#|2,0,10;3,0,24;4,0,4;6,9,0;11,10,16;15,14,0;20,21,0","5#########..##...#...##..##|3,0,7;4,0,7;7,5,6;11,6,10;15,16,0;20,3,0","5#######..###...###...###..|1,0,6;2,0,19;5,14,0;8,0,23;10,18,0;14,0,3;16,11,0;22,8,0","5#######...##...###...##...|1,0,13;2,0,12;3,0,29;5,20,0;10,12,0;14,0,14;16,13,0;21,23,0"],"2":["6###########..##....##...##....##..###|4,0,14;5,0,10;8,0,16;9,3,21;13,29,0;19,7,16;24,22,0;30,16,0","6#########...##....##..#..##....##...#|2,0,34;3,0,7;4,0,35;7,22,8;12,14,0;17,0,15;18,15,0;21,12,17;25,30,0;31,23,0","6##########...###...##...##...###...##|3,0,22;4,0,12;5,0,5;8,7,0;14,6,11;19,15,4;24,20,0;30,6,0","6##########..##.....#..#..#.....##..##|3,0,13;4,0,24;7,0,10;8,17,30;11,0,15;12,31,0;18,16,0;21,6,3;24,17,0;31,8,0","6########..#..#.....##...##.....#..#..|1,0,7;2,0,23;4,0,17;5,0,5;6,3,0;9,3,21;12,34,0;19,11,9;23,0,5;24,15,0;30,17,0;33,4,0","6##########..###....#..#..#....###..##|3,0,3;4,0,13;8,3,12;11,0,7;13,10,15;18,8,0;21,4,3;24,24,0;31,4,0","6########..#..#.....##...##.....#..#..|1,0,17;2,0,15;4,0,15;5,0,10;6,12,0;9,4,19;12,21,0;19,14,12;23,0,11;24,27,0;30,8,0;33,13,0","6#########..####....#..#..#....####..#|2,0,29;3,0,11;7,10,0;10,0,15;11,0,15;13,30,11;18,17,0;21,12,3;24,12,0;32,3,0","6########..#..#.....##...##.....#..#..|1,0,10;2,0,31;4,0,17;5,0,9;6,3,0;9,4,18;12,34,0;19,24,6;23,0,5;24,17,0;30,11,0;33,3,0","6#########..####....#..#..#....####..#|2,0,26;3,0,3;7,10,0;10,0,27;11,0,3;13,11,10;18,7,0;21,9,6;24,24,0;32,14,0","6##########...##....#..#..#....##...##|3,0,3;4,0,26;5,0,7;8,12,22;13,23,22;18,6,0;21,3,11;24,30,0;30,17,0","6#########..###....##..#..##....###..#|2,0,15;3,0,4;7,4,15;10,0,11;12,12,0;17,0,9;18,17,0;21,8,11;25,10,0;32,14,0","6########..#..#.....##...##.....#..#..|1,0,15;2,0,18;4,0,18;5,0,11;6,14,0;9,17,19;12,20,0;19,8,10;23,0,4;24,29,0;30,4,0;33,3,0","6#########..###...###.....###...###..#|2,0,23;3,0,20;7,15,17;12,20,0;16,0,22;17,0,8;18,31,0;26,9,0;32,15,0","6##########..##....##..#..##....##..##|3,0,9;4,0,29;7,0,9;8,15,26;12,27,0;17,0,16;18,4,0;21,15,7;25,28,0;31,7,0","6########...###....###...###....###...|1,0,12;2,0,29;3,0,32;6,15,0;10,0,10;12,27,0;19,20,0;23,0,8;25,23,0;32,6,0","6##########..####...#.....#...####..##|3,0,31;4,0,6;8,6,0;11,0,5;13,0,10;14,12,8;18,29,0;24,9,0;31,4,0","6#########..###....##..#..##....###..#|2,0,28;3,0,5;7,10,9;10,0,27;12,16,0;17,0,9;18,17,0;21,5,3;25,25,0;32,8,0","6########..#..#.....##...##.....#..#..|1,0,3;2,0,32;4,0,19;5,0,7;6,4,0;9,4,7;12,15,0;19,19,17;23,0,6;24,29,0;30,17,0;33,3,0","6#########..###...###.....###...###..#|2,0,6;3,0,31;7,10,13;12,7,0;16,0,8;17,0,5;18,20,0;26,17,0;32,9,0","6##########..##....##..#..##....##..##|3,0,12;4,0,17;7,0,12;8,8,17;12,11,0;17,0,17;18,13,0;21,17,6;25,28,0;31,4,0","6#########..###.....#..#..#.....###..#|2,0,13;3,0,7;7,3,21;10,0,29;11,0,15;12,32,0;18,6,0;21,13,10;24,35,0;32,6,0","6#########..###.....#..#..#.....###..#|2,0,26;3,0,7;7,10,22;10,0,27;11,0,13;12,33,0;18,14,0;21,17,3;24,17,0;32,7,0","6###########..##....##...##....##..###|4,0,23;5,0,17;8,0,11;9,14,13;13,27,0;19,6,3;24,13,0;30,7,0","6########..#..#.....##...##.....#..#..|1,0,5;2,0,26;4,0,15;5,0,14;6,13,0;9,12,6;12,15,0;19,6,10;23,0,5;24,15,0;30,17,0;33,3,0","6########..#..#.....##...##.....#..#..|1,0,3;2,0,35;4,0,18;5,0,16;6,6,0;9,17,6;12,21,0;19,15,3;23,0,11;24,21,0;30,8,0;33,4,0","6########..#..#.....##...##.....#..#..|1,0,3;2,0,34;4,0,31;5,0,9;6,10,0;9,15,24;12,29,0;19,21,10;23,0,16;24,23,0;30,14,0;33,15,0","6########...###....##..#..##....###...|1,0,22;2,0,10;3,0,9;6,20,0;10,0,13;12,11,0;17,0,17;18,11,0;21,3,3;25,13,0;32,16,0","6#########..###...###.....###...###..#|2,0,6;3,0,34;7,11,9;12,12,0;16,0,21;17,0,8;18,17,0;26,24,0;32,14,0","6##########..###....#..#..#....###..##|3,0,12;4,0,25;8,10,15;11,0,4;13,21,5;18,13,0;21,7,4;24,10,0;31,4,0","6##########...###...##...##...###...##|3,0,31;4,0,6;5,0,10;8,6,0;14,20,21;19,19,8;24,10,0;30,21,0","6#########...##....##..#..##....##...#|2,0,19;3,0,17;4,0,16;7,22,17;12,23,0;17,0,17;18,10,0;21,9,3;25,19,0;31,6,0","6########..#..#.....##...##.....#..#..|1,0,17;2,0,28;4,0,22;5,0,11;6,16,0;9,3,14;12,27,0;19,23,11;23,0,7;24,35,0;30,3,0;33,3,0","6#########..###....##..#..##....###..#|2,0,17;3,0,17;7,12,8;10,0,29;12,22,0;17,0,17;18,15,0;21,17,15;25,26,0;32,11,0","6##########...##....#..#..#....##...##|3,0,3;4,0,24;5,0,10;8,7,12;13,12,11;18,4,0;21,15,12;24,11,0;30,23,0","6##########...###...##...##...###...##|3,0,21;4,0,13;5,0,12;8,6,0;14,22,6;19,6,5;24,15,0;30,8,0","6##########..####...#.....#...####..##|3,0,15;4,0,23;8,13,0;11,0,9;13,0,17;14,9,6;18,32,0;24,11,0;31,5,0","6#########..####....#.....#....####..#|2,0,26;3,0,19;7,3,0;10,0,14;11,0,10;13,13,16;18,35,0;24,29,0;32,5,0","6#########..###.....#..#..#.....###..#|2,0,10;3,0,13;7,8,23;10,0,26;11,0,15;12,27,0;18,8,0;21,17,12;24,34,0;32,5,0","6##########..###....#.....#....###..##|3,0,32;4,0,13;8,13,11;11,0,13;13,19,11;18,15,0;24,28,0;31,5,0"],"3":["8############..####....#..#..#....##.....##....#..#..#....####..##|3,0,15;4,0,42;9,0,14;10,17,15;14,0,26;15,0,7;16,15,0;21,4,12;24,11,0;27,25,7;33,17,9;39,0,4;40,28,0;45,5,9;48,5,0;51,20,0;59,13,0","8###############..#..##...#..#...##.......##...#..#...##..#..#####|6,0,37;7,0,3;9,0,16;10,0,36;13,8,19;16,17,0;20,19,9;24,3,0;27,7,24;31,0,13;32,41,0;41,21,17;45,16,0;48,22,0;53,8,0;56,12,0","8##########..#..###.....####...######...######...####.....###..#..|1,0,5;2,0,9;4,0,28;5,0,15;8,3,0;11,8,12;16,31,0;25,6,0;29,0,8;34,7,0;38,0,18;43,12,7;47,0,9;50,34,0;58,7,0;61,3,0","8##########..###..#...#...#......####...####......#...#...#..###..|1,0,21;2,0,10;6,0,8;7,0,5;8,14,0;11,0,35;13,3,21;16,20,0;20,6,20;24,21,0;34,23,7;38,0,22;39,0,15;41,39,17;48,16,0;52,24,0;56,9,0;61,6,0","8############..#####.....##..##..##...#...##..##..##.....#####..##|3,0,17;4,0,15;10,17,33;13,0,23;14,0,21;17,32,5;24,11,0;27,0,7;28,10,0;31,0,10;32,7,0;36,23,0;41,6,0;44,0,12;45,7,8;49,34,0;59,4,0","8##########..#..###.......##...#..##..#..##..#...##.......###..#..|1,0,4;2,0,38;4,0,7;5,0,12;8,10,0;11,5,12;14,0,24;15,0,9;16,29,0;25,9,0;29,4,24;33,17,17;36,11,7;40,16,0;43,19,15;47,0,13;48,42,0;58,7,0;61,13,0","8###########..#..##......##..#..#####...#####..#..##......##..#..#|2,0,21;3,0,8;5,0,14;6,0,16;9,16,8;12,14,15;16,23,0;24,13,0;27,3,30;34,12,0;38,0,17;39,0,13;42,14,17;45,17,13;49,39,0;57,14,0;60,7,0","8##############..##..##...#....#..##.....##..#....#...##..##..####|5,0,14;6,0,25;9,0,16;10,0,27;12,14,0;15,0,8;16,8,0;19,0,5;20,9,20;24,23,0;29,12,11;33,16,16;39,0,11;40,11,0;43,27,15;48,24,0;53,7,0;57,17,0","8#############...###.....###..#...#..###..#...#..###.....###...###|4,0,16;5,0,15;6,0,39;10,0,27;11,23,13;17,31,0;23,0,3;25,7,17;28,19,0;32,14,0;35,0,19;37,5,6;40,24,0;44,6,16;49,32,0;57,10,0","8##########..###..#....#..#.......##..#..##.......#..#....#..###..|1,0,11;2,0,36;6,0,39;7,0,15;8,17,0;11,0,18;12,0,17;13,17,0;16,14,0;21,9,10;24,41,0;33,16,19;36,3,14;39,0,10;40,30,0;48,15,0;51,20,0;56,3,0;61,4,0","8##########..##..##..#....#....#..##..#..##..#....#....#..##..##..|1,0,19;2,0,32;5,0,6;6,0,41;8,3,0;12,14,12;15,0,7;16,15,0;19,14,17;24,27,0;29,13,12;33,17,13;36,10,8;39,0,11;40,7,0;43,16,4;48,18,0;53,6,0;57,10,0;61,12,0","8##########..##..##..#...###...#..#...#...#..#...###...#..##..##..|1,0,5;2,0,29;5,0,4;6,0,34;8,3,0;12,3,5;16,12,0;19,10,10;23,0,9;25,6,17;29,15,16;32,23,0;36,20,14;40,12,0;43,22,11;47,0,12;49,15,0;53,4,0;57,9,0;61,12,0","8##########...#..##.......###..#..##.....##..#..###.......##..#...|1,0,5;2,0,12;3,0,28;5,0,15;6,0,23;8,8,0;12,13,18;15,0,13;16,42,0;26,8,12;29,15,10;33,23,5;40,10,0;43,6,4;46,0,8;47,0,13;48,30,0;57,4,0;60,7,0","8###########...####....#..#..#....###...###....#..#..#....####...#|2,0,22;3,0,9;4,0,32;9,12,16;14,0,5;15,0,10;16,29,0;21,3,9;24,12,0;27,28,3;33,0,8;34,6,3;38,0,17;39,0,6;40,14,0;45,10,16;48,3,0;51,29,0;59,10,0","8##########..##..##......###...#..#..###..#..#...###......##..##..|1,0,11;2,0,34;5,0,13;6,0,40;8,3,0;11,0,3;12,16,14;16,35,0;23,0,17;25,16,17;29,17,0;32,16,0;36,0,5;37,14,14;40,17,0;43,16,7;47,0,10;49,28,0;57,4,0;61,3,0","8##########..######..#..####......#...#...#......####..#..######..|1,0,16;2,0,18;8,17,0;12,0,4;13,0,23;16,8,0;19,3,29;22,0,28;23,0,13;25,35,4;32,15,0;36,24,14;40,21,0;47,0,17;50,15,0;53,13,0;61,15,0","8##########..#..###..#....##...#..##.....##..#...##....#..###..#..|1,0,13;2,0,23;4,0,37;5,0,6;8,11,0;11,3,0;14,0,21;15,0,12;16,14,0;19,15,17;25,20,0;29,14,11;33,18,4;40,3,0;43,19,11;47,0,3;48,14,0;53,4,0;58,15,0;61,8,0","8##########..###..#....#..##...#..##.....##..#...##..#....#..###..|1,0,10;2,0,31;6,0,35;7,0,20;8,9,0;11,0,6;12,0,15;13,4,0;16,10,0;21,15,0;25,6,0;29,10,8;33,15,18;40,13,0;43,18,0;47,0,3;48,8,0;51,11,0;56,17,0;61,10,0","8##########..#..###.....####..#..###..#..###..#..####.....###..#..|1,0,16;2,0,23;4,0,11;5,0,36;8,17,0;11,17,39;16,21,0;22,0,33;25,17,0;28,17,0;33,12,0;36,16,0;41,7,0;44,11,3;47,0,3;50,19,0;58,5,0;61,5,0","8##########..#..###......###...#..#..###..#..#...###......###..#..|1,0,13;2,0,28;4,0,9;5,0,16;8,8,0;11,10,7;14,0,21;16,23,0;23,0,7;25,20,16;29,3,0;32,13,0;36,0,24;37,8,7;40,16,0;43,20,10;47,0,7;49,23,0;58,16,0;61,5,0","8##########..#..###.......###..#..###...###..#..###.......###..#..|1,0,10;2,0,8;4,0,35;5,0,13;8,3,0;11,17,23;14,0,3;15,0,6;16,41,0;26,11,0;29,3,6;33,0,11;34,12,12;40,17,0;43,5,3;46,0,15;47,0,6;48,28,0;58,5,0;61,9,0","8###########..##..##...#..###....###..#..###....###..#...##..##..#|2,0,3;3,0,35;6,0,14;7,0,6;9,10,0;12,0,13;13,11,0;17,18,0;21,3,17;26,14,30;33,16,0;36,7,5;41,24,8;46,0,12;48,12,0;51,7,0;56,9,0;60,12,0","8##############...#..#....#....#####.....#####....#....#..#...####|5,0,17;6,0,15;7,0,7;9,0,14;10,0,10;12,18,33;16,9,0;19,30,7;24,17,0;29,0,13;30,0,23;33,30,0;39,0,10;41,0,17;42,0,10;43,30,8;48,27,0;53,11,0;56,12,0","8#############..####......##...#..#..###..#..#...##......####..###|4,0,19;5,0,3;10,0,15;11,6,8;14,0,21;15,0,19;17,27,0;25,9,9;29,5,0;32,5,0;36,0,7;37,16,5;40,10,0;43,7,16;48,24,0;58,13,0","8#############...####....####..#..#...#...#..#..####....####...###|4,0,6;5,0,5;6,0,11;11,6,16;18,10,0;23,0,10;25,0,15;26,12,10;29,3,19;32,11,0;36,22,23;40,12,0;43,16,13;49,15,0;57,21,0","8###########..#####.......#..#....###...###....#..#.......#####..#|2,0,22;3,0,14;9,17,14;12,0,34;13,0,7;14,0,13;15,0,10;16,39,0;24,11,0;27,28,19;33,0,6;34,14,16;38,0,19;39,0,3;40,18,0;45,9,8;48,41,0;60,8,0","8##########..###..#..#....#.....####.....####.....#....#..#..###..|1,0,20;2,0,29;6,0,9;7,0,15;8,14,0;12,0,16;13,15,16;16,17,0;19,12,16;24,32,0;30,0,29;33,20,0;39,0,24;41,0,5;42,21,8;48,18,0;53,17,0;56,6,0;61,15,0","8##########..###..#..##...#..#...###.....###...#..#...##..#..###..|1,0,6;2,0,41;6,0,42;7,0,9;8,8,0;13,17,22;16,3,0;20,17,18;24,12,0;27,22,12;33,30,0;39,0,21;41,9,11;45,14,0;48,9,0;53,17,0;56,17,0;61,7,0","8###########..######..##..###..#..#.......#..#..###..##..######..#|2,0,3;3,0,19;9,4,0;14,0,8;15,0,16;17,7,0;20,0,21;21,4,0;25,0,21;26,17,9;29,8,18;32,31,0;40,14,0;43,17,0;46,0,17;48,6,0;52,11,0;60,13,0","8###########..##..##..#...#..#..###.......###..#..#...#..##..##..#|2,0,23;3,0,13;6,0,3;7,0,4;9,6,0;13,4,18;17,17,11;20,10,23;24,17,0;27,17,18;30,0,10;31,0,16;32,30,0;41,0,17;42,17,10;45,9,12;48,24,0;52,9,0;56,11,0;60,7,0","8##############..#####...###...#..#.......#..#...###...#####..####|5,0,4;6,0,16;12,3,28;18,0,17;19,6,13;23,0,4;25,8,3;29,4,15;32,32,0;40,5,0;43,23,6;49,20,0;57,5,0","8##########...#####....#..###..#..##.....##..#..###..#....#####...|1,0,15;2,0,3;3,0,30;8,18,0;12,0,35;14,0,8;15,0,4;16,25,0;21,4,0;26,15,24;29,3,12;33,29,17;40,17,0;43,12,0;46,0,12;47,0,10;48,15,0;51,23,0;60,9,0","8##########..##..##.......###..#..##.....##..#..###.......##..##..|1,0,13;2,0,4;5,0,17;6,0,18;8,12,0;11,0,6;12,17,33;15,0,5;16,32,0;26,5,13;29,3,12;33,17,3;40,3,0;43,12,5;46,0,13;47,0,17;48,30,0;57,11,0;61,17,0","8############..#..#.......#..#..###.......###..#..#.......#..#..##|3,0,17;4,0,32;6,0,16;7,0,7;9,0,24;10,15,11;13,11,12;16,41,0;24,11,0;27,4,24;30,0,23;31,0,16;32,40,0;41,0,11;42,15,5;45,16,17;48,42,0;56,3,0;59,17,0","8###########..######...#..###.....##..#..##.....###..#...######..#|2,0,3;3,0,26;9,11,0;12,0,3;14,0,22;15,0,4;17,7,0;21,10,33;26,22,19;33,10,3;36,14,6;40,31,0;46,0,13;48,4,0;51,8,0;60,15,0","8############..#####.....##..#....#..###..#....#..##.....#####..##|3,0,4;4,0,22;10,8,15;13,0,7;14,0,30;17,31,23;23,0,11;24,9,0;27,14,0;32,8,0;35,0,6;36,0,19;37,17,0;40,25,0;45,7,16;49,17,0;59,17,0","8##########..#...##.......###..#..###...###..#..###.......##...#..|1,0,17;2,0,7;4,0,28;5,0,3;6,0,8;8,10,0;11,6,23;15,0,5;16,36,0;26,12,0;29,4,20;33,0,13;34,19,21;40,17,0;43,14,10;46,0,15;47,0,6;48,33,0;57,11,0;61,14,0","8##########...##..#...##..##...#..##.....##..#...##..##...#..##...|1,0,3;2,0,40;3,0,14;6,0,42;7,0,23;8,9,0;13,10,0;16,6,0;20,0,14;21,17,0;25,24,0;29,16,20;33,21,12;40,16,0;43,19,0;47,0,15;48,3,0;52,24,0;56,8,0;60,10,0","8##########..##..##...#..####..#..#.......#..#..####..#...##..##..|1,0,14;2,0,4;5,0,17;6,0,28;8,6,0;11,0,16;12,14,0;16,18,0;20,17,20;23,0,9;25,0,6;26,6,28;29,13,11;32,41,0;40,6,0;43,13,11;46,0,13;47,0,8;49,17,0;52,21,0;57,8,0;61,5,0","8##########..#..###.......###..#..#.......#..#..###.......###..#..|1,0,13;2,0,11;4,0,30;5,0,8;8,16,0;11,3,24;14,0,17;15,0,6;16,33,0;25,0,17;26,12,9;29,9,10;32,41,0;40,3,0;43,8,3;46,0,6;47,0,11;48,30,0;58,7,0;61,3,0"]};

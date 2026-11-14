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
    const pz={w,h,c:clue.join('')};const c0=slkCount(pz,2,30000);if(c0.sols.length!==1)continue;
    for(const i of u2Sh(u2Rng(N))){if([...pz.c].filter(x=>x!=='.').length<=N*keep)break;const old=pz.c;pz.c=setAt(old,i,'.');const c1=slkCount(pz,2,30000);if(c1.sols.length!==1||c1.cut)pz.c=old;}
    return pz;}return null;}
function slkCheck(pz,s){const w=pz.w,h=pz.h,{H,V}=slkE(w,h);if(s.length!==H+V||!/^[01]+$/.test(s))return false;const e=[...s].map(Number);if(!slkLoop(w,h,e))return false;
  return [...pz.c].every((ch,i)=>ch==='.'||slkCellE(w,h,i).filter(k=>e[k]===1).length===+ch);}

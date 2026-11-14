'use strict';
/* words2, part 2: the poetry duel (المساجلة) and the letter races: the letter grid, the letter hive, the longest word,
   the word ladder and the mini crossword. Shared helpers come from n-words2.js. */

/* ---------- a timed race: everyone plays the same puzzle on their own phone, the clock starts on «ابدأ» ---------- */
const w2RKey=(d,v)=>d.gid+':'+d.rd+':'+v;
function w2RSt(d,v){const k=w2RKey(d,v);if(!S.w2r||S.w2r.key!==k)S.w2r={key:k,ph:'ready'};return S.w2r;}
// hand in this phone's result once (the clock, «خلصت» or a solved puzzle)
function w2RSend(d,v,pick){const st=w2RSt(d,v);if(st.ph==='sent')return;clearTimeout(st.tm);st.ph='sent';const cur=S.st.d;if(!cur||cur.gid!==d.gid||cur.rd!==d.rd)return;simulPick(cur,v,pick);}
function w2Race(o){const R=o.rounds;
  const G={name:o.name,cat:'words',lbc:o.lbc,icon:o.icon,
    init:n=>({rd:0,pts:Array(n).fill(0),res:'',...(o.init?o.init(n):{})}),
    viewer:simulViewer,coverMsg:d=>d.res||'',
    points:d=>d.pts,
    status:(d,ctx)=>simulStatus(d,ctx,`<small>جولة ${Math.min(d.rd+1,R)} من ${R}</small><br>`,true),
    winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
    render(d,ctx){const last=d.rd>0?o.summary(d,ctx):'';
      if(d.win!=null)return `<div class="w2 w2race">${last}</div>`;
      if(!ctx.my)return `<div class="w2 w2race">${ctx.v>=0&&hasPicked(d,ctx.v)?'<div class="w2sent"><b>✓</b>أرسلت، ننتظر الباقين</div>':''}${qzWho(d,ctx)}${last}</div>`;
      const st=w2RSt(d,ctx.v);
      if(st.ph==='ready')return `<div class="w2 w2race"><div class="w2ready"><div class="w2ri">${o.icon}</div><b>${o.title}</b><span class="w2rd">جولة ${d.rd+1} من ${R} • ${Math.round(o.T(d)/1000)} ثانية</span><button class="btn red wide" data-ga="start">جاهز، ابدأ</button></div>${last}</div>`;
      if(st.ph==='go'&&Date.now()>st.t0+o.T(d)+300){setTimeout(()=>{if(S.w2r===st&&st.ph==='go')w2RSend(d,ctx.v,o.timeUp(d,st));},0);}
      return `<div class="w2 w2race">${w2Clock(st.t0+o.T(d),o.T(d),'var(--ok)')}${o.view(d,ctx,st)}</div>`;},
    click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const st=w2RSt(d,ctx.v);
      if(a==='start'){if(st.ph!=='ready')return;st.ph='go';st.t0=Date.now();o.begin(d,st);const v=ctx.v;st.tm=setTimeout(()=>{if(S.w2r===st&&st.ph==='go'){w2RSend(d,v,o.timeUp(d,st));render();}},o.T(d)+50);render();return;}
      if(st.ph!=='go')return;
      if(a==='quit'){w2RSend(d,ctx.v,o.timeUp(d,st));render();return;}
      o.click(a,i,d,ctx,st);},
    resolve(d,picks){const nd=o.resolve(d,picks);const rd=d.rd+1;return {...nd,rd,win:rd>=R?mostPts(nd.pts):null};},
    botPick:o.botPick,net:o.net};
  return G;}
// what every seat earned this round, one row each, best first
function w2RaceRows(d,rows){return `<div class="w2rows">${rows.sort((a,b)=>b.g-a.g).map(r=>`<div class="w2row" style="--c:${col(d,r.s)}"><i></i><b>${escH(nm(d,r.s))}</b><span>${r.t}</span><em>${r.g>0?'+'+r.g:'0'}</em></div>`).join('')}</div>`;}
const w2Len=w=>[...w].length;
// points for a word by its length: 3 letters 1, 4 letters 2, 5 letters 3, 6 letters 5, longer 8
const w2WPts=w=>{const n=w2Len(w);return n<3?0:n===3?1:n===4?2:n===5?3:n===6?5:8;};

/* ---------- شبكة الحروف: words from touching letters of a 5×5 grid ---------- */
const W2GZ=5;
// letters by how often they appear in our words; ة only now and then, since it can only end a word
const W2GBAG=(()=>{const f={ا:16,ل:8,م:9,ر:11,ن:10,ي:8,و:6,ت:7,ب:8,س:6,ع:5,ح:5,ف:4,د:4,ق:4,ك:4,ة:3,ج:3,ص:3,ط:3,ش:2,خ:2,ز:2,ه:2,غ:1,ض:1,ث:1,ذ:1,ظ:1};let s='';for(const c in f)s+=c.repeat(f[c]);return s;})();
let W2PRE=null;
function w2Pre(){if(W2PRE)return W2PRE;const L=w2Lex();const pre=new Set(),all=new Set();for(const t of L.tiles.keys()){if(t.length<3)continue;all.add(t);for(let k=1;k<=t.length;k++)pre.add(t.slice(0,k));}W2PRE={pre,all};return W2PRE;}
const w2Nb=(i,Z)=>{const r=Math.floor(i/Z),c=i%Z,o=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<Z&&cc>=0&&cc<Z)o.push(rr*Z+cc);}return o;};
function w2GridWords(g){const P=w2Pre(),Z=W2GZ,out=new Set();let n=0;
  const dfs=(i,s,used)=>{if(++n>60000)return;s+=g[i];if(!P.pre.has(s))return;if(s.length>=3&&P.all.has(s))out.add(s);used.add(i);for(const j of w2Nb(i,Z))if(!used.has(j))dfs(j,s,used);used.delete(i);};
  for(let i=0;i<Z*Z;i++)dfs(i,'',new Set());return [...out].sort((a,b)=>b.length-a.length||a.localeCompare(b));}
// a word lies on the grid if a path of touching letters spells it
function w2OnGrid(g,w){const Z=W2GZ;const t=[...w];const go=(i,k,used)=>{if(g[i]!==t[k])return false;if(k===t.length-1)return true;used.add(i);for(const j of w2Nb(i,Z))if(!used.has(j)&&go(j,k+1,used))return true;used.delete(i);return false;};
  for(let i=0;i<Z*Z;i++)if(go(i,0,new Set()))return true;return false;}
const W2GC={};
// the round's grid: drawn from the game's seed (the host's), the richest of a few tries
function w2Grid(d,rd){const k=d.gid+':'+rd;if(W2GC[k])return W2GC[k];const R=srng(d,'grid'+rd);let best=null;
  for(let t=0;t<14;t++){const g=[...Array(W2GZ*W2GZ)].map(()=>W2GBAG[Math.floor(R()*W2GBAG.length)]);
    // ة in a corner or edge reads best, and two of them are one too many
    if(g.filter(c=>c==='ة').length>1)continue;const ws=w2GridWords(g);if(!best||ws.length>best.ws.length)best={g,ws};if(ws.length>=45)break;}
  return W2GC[k]=best;}
GAMES.w_grid=w2Race({name:'شبكة الحروف',lbc:'#B8742A',rounds:3,T:()=>90000,title:'كوّن كلمات من حروف متلاصقة (حتى بالقطري)',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#D88F3A"/><rect x="10" y="10" width="80" height="80" rx="12" fill="#8A5A2B"/>${['ق','ل','م','ب','ح','ر','ن','ي','ت'].map((c,k)=>{const x=16+(k%3)*24,y=16+Math.floor(k/3)*24;const on=[0,1,2,5].includes(k);return `<rect x="${x}" y="${y}" width="20" height="20" rx="5" fill="${on?'#FFE08A':'#FFF4DE'}"/><text x="${x+10}" y="${y+15}" font-size="12" font-weight="900" fill="#5A3B12" text-anchor="middle">${c}</text>`;}).join('')}<path d="M74 26 L50 26 L26 26 L26 50" stroke="#EC6158" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></svg>`,
  begin(d,st){st.path=[];st.found=[];},
  timeUp:(d,st)=>({w:(st.found||[]).slice(0,80)}),
  view(d,ctx,st){const G=w2Grid(d,d.rd);const p=st.path||[];const w=p.map(i=>G.g[i]).join('');const last=p[p.length-1];
    const nb=last==null?null:new Set(w2Nb(last,W2GZ));
    return `<div class="w2gw">${w2TypedBox(w,'المس الحروف بالترتيب')}</div><div class="w2grid" style="--z:${W2GZ}">${G.g.map((c,i)=>{const k=p.indexOf(i);return `<button class="w2gt ${k>=0?'on':''} ${i===last?'last':''} ${nb&&nb.has(i)&&k<0?'nb':''}" data-ga="t" data-i="${i}">${c}${k>=0?`<small>${k+1}</small>`:''}</button>`;}).join('')}</div>
      <div class="w2acts"><button class="btn soft" data-ga="clr" ${p.length?'':'disabled'}>مسح</button><button class="btn" data-ga="ok" ${p.length>=3?'':'disabled'}>أرسل الكلمة</button></div>
      <div class="w2found"><b>${st.found.length}</b> ${st.found.length>10||!st.found.length?'كلمة':'كلمات'}${st.found.map(x=>`<span>${escH(x)}</span>`).join('')}</div><button class="btn soft w2quit" data-ga="quit">خلصت</button>`;},
  click(a,i,d,ctx,st){const G=w2Grid(d,d.rd);const p=st.path;
    if(a==='clr'){st.path=[];render();return;}
    if(a==='t'){if(!(i>=0&&i<G.g.length))return;const k=p.indexOf(i);
      if(k===p.length-1&&p.length>=3){GAMES.w_grid.click('ok',0,d,ctx);return;}
      if(k>=0)st.path=p.slice(0,k+1);else if(!p.length||w2Nb(p[p.length-1],W2GZ).includes(i))st.path=[...p,i];else st.path=[i];render();return;}
    if(a==='ok'){const w=p.map(j=>G.g[j]).join('');st.path=[];if(w2Len(w)<3){render();return;}
      if(st.found.includes(w))toast('لقيتها قبل');else if(!w2Known(w))toast(`«${w}» مو بالقاموس`);else{st.found=[w,...st.found];try{sfx('pop');}catch(e){}}render();}},
  resolve(d,picks){const G=w2Grid(d,d.rd);const ws=picks.map(p=>{const a=p&&Array.isArray(p.w)?p.w:[];const o=[];for(const w of a){if(typeof w!=='string'||o.includes(w)||o.length>=80)continue;if(w2Len(w)>=3&&w2OnGrid(G.g,w)&&w2Known(w))o.push(w);}return o;});
    const cnt={};ws.forEach(a=>a.forEach(w=>cnt[w]=(cnt[w]||0)+1));const pts=[...d.pts];
    // a word only one player found earns its full points; a shared one earns 1
    const lw=ws.map((a,s)=>{let g=0;const l=a.map(w=>{const x=cnt[w]>1?1:w2WPts(w);g+=x;return w+':'+x;});pts[s]+=g;return l.slice(0,40).join(' ');});
    const miss=G.ws.filter(w=>!cnt[w]).slice(0,6).join(' ');
    return {...d,pts,lw,miss,res:d.pl.map((r,s)=>`${nm(d,s)} +${lw[s]?lw[s].split(' ').reduce((a,x)=>a+(+x.split(':')[1]||0),0):0}`).join('، ')};},
  summary(d){const lw=d.lw||[];const rows=d.pl.map((r,s)=>{const l=(lw[s]||'').split(' ').filter(Boolean).map(x=>x.split(':'));const g=l.reduce((a,x)=>a+(+x[1]||0),0);
      return {s,g,t:l.length?l.slice(0,8).map(([w,x])=>`<i class="${+x===1&&w2WPts(w)>1?'sh':''}">${escH(w)}</i>`).join('')+(l.length>8?`<i>+${l.length-8}</i>`:''):'<i>—</i>'};});
    return `<div class="w2sum"><div class="w2sh">الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${w2RaceRows(d,rows)}${d.miss?`<p class="w2miss">كلمات فاتتكم: ${d.miss.split(' ').map(w=>`<b>${escH(w)}</b>`).join(' ')}</p>`:''}</div>`;},
  // a bot finds a share of the grid's words: easy mostly short ones
  botPick(d,s,lv){const ws=w2Grid(d,d.rd).ws;const frac=[0,.18,.35,.6][lv]+Math.random()*.12,cap=[0,9,16,28][lv];const pool=lv===1?ws.filter(w=>w.length<=4):ws;
    return {w:w2Shuf(pool).slice(0,Math.max(1,Math.min(cap,Math.round(pool.length*frac))))};}
});
HELP.w_grid='الكل يلعب على نفس الشبكة بنفس الوقت، وكل واحد على جواله (أو بالدور على نفس الجوال). اضغط «ابدأ» وعندك 90 ثانية: المس حروف متلاصقة (يمين، يسار، فوق، تحت أو بالقطري) عشان تكوّن كلمة من 3 حروف أو أكثر، وما تستخدم نفس الخانة مرتين بالكلمة، وبعدين «أرسل الكلمة» (أو المس آخر حرف مرة ثانية). الكلمة من 3 حروف بنقطة، 4 بنقطتين، 5 بثلاث، 6 بخمس، وأطول بثمان، والكلمة اللي لقاها غيرك بعد تنحسب بنقطة وحدة بس. التاء المربوطة لها خانة لحالها. ثلاث جولات والأكثر نقاط يفوز.';

/* ---------- خلية الحروف: seven letters, one in the middle that every word must use ---------- */
const W2HC={};
function w2Hive(d,rd){const k=d.gid+':'+rd;if(W2HC[k])return W2HC[k];const R=srng(d,'hive'+rd);const L=w2Lex();
  const T=[...L.tiles.keys()].filter(t=>t.length>=3&&t.indexOf('ة')<0);const seeds=T.filter(t=>new Set(t).size>=6);let best=null;
  for(let tr=0;tr<30;tr++){const s=seeds[Math.floor(R()*seeds.length)];const set=[...new Set(s)];
    for(const c of 'المرنبتي'){if(set.length>=7)break;if(!set.includes(c))set.push(c);}const ls=set.slice(0,7);
    for(const c of w2Shuf(ls,R)){const ws=T.filter(t=>t.includes(c)&&[...t].every(x=>ls.includes(x)));
      if(!best||ws.length>best.ws.length)best={ls:ls.filter(x=>x!==c),c,ws:ws.sort((a,b)=>b.length-a.length)};}
    if(best&&best.ws.length>=22)break;}
  return W2HC[k]=best;}
const w2HvPts=(w,H)=>{const n=w2Len(w);let p=n<3?0:n===3?1:n===4?2:n===5?3:n;if([H.c,...H.ls].every(c=>w.includes(c)))p+=5;return p;};
GAMES.w_hive=w2Race({name:'خلية الحروف',lbc:'#C9921B',rounds:2,T:()=>120000,title:'كوّن كلمات من الحروف السبعة، وكل كلمة لازم فيها حرف النص',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F2B632"/>${[[50,50,'م',1],[50,24,'ل'],[72,37,'ع'],[72,63,'ب'],[50,76,'ة'],[28,63,'ا'],[28,37,'ر']].map(([x,y,c,m])=>`<path d="M${x-12} ${y}l6-11h12l6 11-6 11h-12z" fill="${m?'#8A5A00':'#FFF3D0'}" stroke="#C98A10" stroke-width="2"/><text x="${x}" y="${y+5}" font-size="13" font-weight="900" fill="${m?'#FFE08A':'#8A5A00'}" text-anchor="middle">${c}</text>`).join('')}</svg>`,
  begin(d,st){st.cur='';st.found=[];st.ord=null;},
  timeUp:(d,st)=>({w:(st.found||[]).slice(0,80)}),
  view(d,ctx,st){const H=w2Hive(d,d.rd);const ord=st.ord||H.ls;const pos=[[0,-1],[.87,-.5],[.87,.5],[0,1],[-.87,.5],[-.87,-.5]];
    const cell=(c,x,y,m)=>`<button class="w2hx ${m?'mid':''}" style="--x:${x};--y:${y}" data-ga="kk" data-i="${W2KA.indexOf(c)}">${c}</button>`;
    const score=st.found.reduce((a,w)=>a+w2HvPts(w,H),0);
    return `${w2TypedBox(st.cur||'',`كل كلمة فيها «${H.c}»`)}<div class="w2kb w2hive" data-ok="ok">${cell(H.c,0,0,1)}${ord.map((c,k)=>cell(c,pos[k][0],pos[k][1])).join('')}</div>
      <div class="w2acts"><button class="btn soft" data-ga="kdel" aria-label="امسح">⌫</button><button class="btn soft" data-ga="mix" aria-label="لخبط">🔀</button><button class="btn" data-ga="ok" ${w2Len(st.cur||'')>=3?'':'disabled'}>أرسل</button></div>
      <div class="w2found"><b>${score}</b> نقطة • ${st.found.length} من ${H.ws.length}${st.found.map(x=>`<span>${escH(x)}</span>`).join('')}</div><button class="btn soft w2quit" data-ga="quit">خلصت</button>`;},
  click(a,i,d,ctx,st){const H=w2Hive(d,d.rd);const all=[H.c,...H.ls];
    if(a==='kk'){const c=W2KA[i];if(!c||!all.includes(c==='ى'?'ي':c))return;if(w2Len(st.cur)<12)st.cur+=c;render();return;}
    if(a==='kdel'){st.cur=[...st.cur].slice(0,-1).join('');render();return;}
    if(a==='mix'){st.ord=w2Shuf(H.ls);render();return;}
    if(a==='ok'){const w=st.cur;st.cur='';if(w2Len(w)<3){toast('أقل شي 3 حروف');render();return;}
      if(!w.includes(H.c))toast(`لازم فيها «${H.c}»`);else if(st.found.includes(w))toast('لقيتها قبل');else if(!w2Known(w))toast(`«${w}» مو بالقاموس`);
      else{st.found=[w,...st.found];const p=w2HvPts(w,H);if(p>w2Len(w))toast('كل الحروف! +5 🌟');try{sfx('pop');}catch(e){}}render();}},
  resolve(d,picks){const H=w2Hive(d,d.rd);const all=[H.c,...H.ls];
    const ws=picks.map(p=>{const a=p&&Array.isArray(p.w)?p.w:[];const o=[];for(const w of a){if(typeof w!=='string'||o.includes(w)||o.length>=80)continue;if(w2Len(w)>=3&&w.includes(H.c)&&[...w].every(c=>all.includes(c))&&w2Known(w))o.push(w);}return o;});
    const cnt={};ws.forEach(a=>a.forEach(w=>cnt[w]=(cnt[w]||0)+1));const pts=[...d.pts];
    const lw=ws.map((a,s)=>{let g=0;const l=a.map(w=>{const x=cnt[w]>1?1:w2HvPts(w,H);g+=x;return w+':'+x;});pts[s]+=g;return l.slice(0,40).join(' ');});
    return {...d,pts,lw,miss:H.ws.filter(w=>!cnt[w]).slice(0,6).join(' '),res:''};},
  summary:d=>w2GridSum(d),
  botPick(d,s,lv){const ws=w2Hive(d,d.rd).ws;const frac=[0,.15,.32,.55][lv]+Math.random()*.1,cap=[0,8,15,26][lv];const pool=lv===1?ws.filter(w=>w.length<=4):ws;
    return {w:w2Shuf(pool).slice(0,Math.max(1,Math.min(cap,Math.round(pool.length*frac))))};}
});
const w2GridSum=d=>{const lw=d.lw||[];const rows=d.pl.map((r,s)=>{const l=(lw[s]||'').split(' ').filter(Boolean).map(x=>x.split(':'));const g=l.reduce((a,x)=>a+(+x[1]||0),0);
    return {s,g,t:l.length?l.slice(0,8).map(([w,x])=>`<i>${escH(w)}</i>`).join('')+(l.length>8?`<i>+${l.length-8}</i>`:''):'<i>—</i>'};});
  return `<div class="w2sum"><div class="w2sh">الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${w2RaceRows(d,rows)}${d.miss?`<p class="w2miss">كلمات فاتتكم: ${d.miss.split(' ').map(w=>`<b>${escH(w)}</b>`).join(' ')}</p>`:''}</div>`;};
HELP.w_hive='سبعة حروف، واحد منها بالنص. اضغط «ابدأ» وعندك دقيقتين تكوّن فيها أكبر عدد من الكلمات (3 حروف أو أكثر) من هالحروف بس، وتقدر تكرر الحرف، بس كل كلمة لازم فيها حرف النص. الكلمة من 3 حروف بنقطة، 4 بنقطتين، 5 بثلاث، والأطول بعدد حروفها، واللي تجمع الحروف السبعة كلها لها 5 زيادة. الكلمة اللي لقاها غيرك بعد تنحسب بنقطة وحدة. جولتين والأكثر نقاط يفوز.';

/* ---------- سلّم الكلمات: from one three-letter word to another, one letter at a time ---------- */
let W2L3=null;
function w2L3(){if(W2L3)return W2L3;const L=w2Lex();const ws=[...L.tiles.keys()].filter(t=>t.length===3&&t.indexOf('ة')<0);const set=new Set(ws);const nb={};
  for(const w of ws){nb[w]=[];for(let i=0;i<3;i++)for(const c of W2TL){if(c===w[i]||c==='ة')continue;const x=w.slice(0,i)+c+w.slice(i+1);if(set.has(x))nb[w].push(x);}}
  W2L3={ws,set,nb};return W2L3;}
function w2Bfs(a){const G=w2L3();const D={[a]:0},P={},q=[a];while(q.length){const w=q.shift();for(const x of G.nb[w])if(D[x]==null){D[x]=D[w]+1;P[x]=w;q.push(x);}}return {D,P};}
const W2LC={};
function w2Ladder(d,rd){const k=d.gid+':'+rd;if(W2LC[k])return W2LC[k];const R=srng(d,'lad'+rd);const G=w2L3();const want=[3,4,5][rd]||4;let got=null;
  for(let t=0;t<60&&!got;t++){const a=G.ws[Math.floor(R()*G.ws.length)];if(G.nb[a].length<2)continue;const {D,P}=w2Bfs(a);const far=Object.keys(D).filter(x=>D[x]===want);if(!far.length)continue;
    const b=far[Math.floor(R()*far.length)];const path=[b];while(path[0]!==a)path.unshift(P[path[0]]);got={a,b,n:want,path};}
  if(!got){const a='كتب',{D,P}=w2Bfs(a);const b=Object.keys(D).find(x=>D[x]===3);const path=[b];while(path[0]!==a)path.unshift(P[path[0]]);got={a,b,n:3,path};}
  return W2LC[k]=got;}
const w2LDisp=t=>{const L=w2Lex();const w=L.tiles.get(t);return w||t;};
GAMES.w_ladder=w2Race({name:'سلّم الكلمات',lbc:'#5A7D2E',rounds:3,T:()=>120000,title:'وصّل الكلمة الأولى بالأخيرة، وكل خطوة تغيّر حرف واحد وتطلع كلمة صحيحة',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#79A63E"/><path d="M28 8v86M72 8v86" stroke="#7A4A2A" stroke-width="6" stroke-linecap="round"/>${['قلم','قلب','كلب'].map((w,k)=>`<rect x="31" y="${14+k*27}" width="38" height="18" rx="5" fill="${k===2?'#FFE08A':'#FFF8EA'}"/><text x="50" y="${27+k*27}" font-size="13" font-weight="900" fill="#3E5A1E" text-anchor="middle">${w}</text>`).join('')}</svg>`,
  begin(d,st){const P=w2Ladder(d,d.rd);st.ch=[P.a];st.pos=-1;},
  timeUp:(d,st)=>({ok:0,n:(st.ch||[]).length-1,ms:0}),
  view(d,ctx,st){const P=w2Ladder(d,d.rd);const cur=st.ch[st.ch.length-1];
    return `<div class="w2lad-top"><span class="w2lw a">${escH(w2LDisp(P.a))}</span><i>←</i><span class="w2lw b">${escH(w2LDisp(P.b))}</span><small>أقصر حل: ${P.n} خطوات</small></div>
      <div class="w2steps">${st.ch.slice(0,-1).map((w,k)=>`<span data-k="s${k}">${escH(w2LDisp(w))}</span>`).join('<i>←</i>')}</div>
      <div class="w2cur">${[...cur].map((c,k)=>`<button class="w2lt ${st.pos===k?'sel':''} ${P.b[k]===c?'ok':''}" data-ga="pos" data-i="${k}">${c}</button>`).join('')}</div>
      <p class="w2lead">${st.pos<0?'المس الحرف اللي تبي تغيّره':'اختر الحرف الجديد'}</p>${w2Kb({ga:'kk',dis:c=>st.pos<0||'ءئؤةى'.includes(c)||c===cur[st.pos]})}
      <div class="w2acts"><button class="btn soft" data-ga="undo" ${st.ch.length>1?'':'disabled'}>رجوع خطوة</button><button class="btn soft" data-ga="quit">استسلم</button></div>`;},
  click(a,i,d,ctx,st){const P=w2Ladder(d,d.rd);const cur=st.ch[st.ch.length-1];
    if(a==='pos'){if(i>=0&&i<3){st.pos=st.pos===i?-1:i;render();}return;}
    if(a==='undo'){if(st.ch.length>1)st.ch=st.ch.slice(0,-1);st.pos=-1;render();return;}
    if(a==='kk'){if(st.pos<0)return;const c=W2KA[i];if(!c||'ءئؤةى'.includes(c))return;const x=cur.slice(0,st.pos)+c+cur.slice(st.pos+1);if(x===cur)return;
      if(st.ch.includes(x)){toast('مريت عليها قبل');return;}if(!w2L3().set.has(x)&&!w2Known(x)){toast(`«${x}» مو بالقاموس`);return;}
      st.ch=[...st.ch,x];st.pos=-1;try{sfx('pop');}catch(e){}
      if(x===P.b){w2RSend(d,ctx.v,{ok:1,n:st.ch.length-1,ms:Math.round(Date.now()-st.t0)});}render();}},
  resolve(d,picks){const P=w2Ladder(d,d.rd);const ok=picks.map(p=>p&&p.ok&&Number.isFinite(p.ms)&&Number.isInteger(p.n)&&p.n>=P.n?{ms:Math.max(0,p.ms),n:p.n}:null);
    const fast=ok.map((x,s)=>x?[s,x.ms]:null).filter(Boolean).sort((a,b)=>a[1]-b[1]);const pts=[...d.pts];
    const lr=ok.map((x,s)=>{if(!x)return '0';let g=3+(x.n===P.n?1:0)+(fast.length&&fast[0][0]===s&&(fast.length===1||fast[1][1]>fast[0][1])?1:0);pts[s]+=g;return g+':'+x.n+':'+Math.round(x.ms/100)/10;});
    return {...d,pts,lr,res:''};},
  summary(d){const P=w2Ladder(d,d.rd-1);const rows=d.pl.map((r,s)=>{const x=String((d.lr||[])[s]||'0').split(':');return {s,g:+x[0]||0,t:x.length>1?`${x[1]} خطوات • ${x[2]} ث`:'ما وصل'};});
    return `<div class="w2sum"><div class="w2sh">الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${w2RaceRows(d,rows)}<p class="w2miss">حل قصير: ${P.path.map(w=>`<b>${escH(w2LDisp(w))}</b>`).join(' ← ')}</p></div>`;},
  botPick(d,s,lv){const P=w2Ladder(d,d.rd);const ok=Math.random()<[0,.5,.75,.93][lv]-(P.n-3)*.08;if(!ok)return {ok:0,n:0,ms:0};
    return {ok:1,n:P.n+(lv===3?(Math.random()<.2?1:0):lv===2?rnd(2):rnd(4)),ms:[0,60000,38000,22000][lv]+rnd([0,50000,40000,25000][lv])};}
});
HELP.w_ladder='كل جولة لها كلمة بداية وكلمة نهاية (من ثلاث حروف). اضغط «ابدأ»، والمس الحرف اللي تبي تغيّره واختر بداله حرف، بشرط تطلع كلمة صحيحة ما مريت عليها. كمّل لين توصل كلمة النهاية. عندك دقيقتين: الوصول بـ3 نقاط، والوصول بأقصر عدد خطوات بنقطة زيادة، والأسرع وصول بنقطة زيادة. ثلاث جولات (كل وحدة أطول من اللي قبلها) والأكثر نقاط يفوز.';

/* ---------- كلمات متقاطعة: a mini crossword everyone solves at once ---------- */
const W2XCL=`قلم:أداة نكتب بها
باب:يُفتح ويُغلق عند الدخول
بحر:ماء مالح واسع
نهر:ماء عذب يجري
جبل:أعلى من التل
شمس:نجم يضيء النهار
قمر:ينير السماء في الليل
نجم:يلمع في السماء ليلًا
ورد:زهر جميل الرائحة
تمر:ثمر النخل
موز:فاكهة صفراء طويلة
عنب:فاكهة تنمو في عناقيد
تين:فاكهة سُمّيت بها سورة في القرآن
لبن:مشروب أبيض من الحليب
عسل:تصنعه النحل
ملح:نرشّه على الطعام
سكر:حلو يذوب في الشاي
خبز:يُصنع من الدقيق ويُخبز
جمل:سفينة الصحراء
أسد:ملك الغابة
نمر:حيوان مفترس جلده مخطط
فيل:أضخم حيوان على اليابسة
قرد:يقلّد الإنسان ويحب الموز
ديك:يصيح عند الفجر
بطة:طائر يعوم على الماء
نحل:حشرات تصنع العسل
نمل:حشرات صغيرة تعمل جماعة
حوت:أضخم حيوان في البحر
سمك:يعيش في الماء ويتنفس بالخياشيم
طير:له جناحان وريش
عين:نبصر بها
أذن:نسمع بها
أنف:نشم به
قلب:يضخ الدم في الجسم
كتف:يصل الذراع بالجسم
ساق:بين الركبة والقدم
بيت:منزل
سقف:أعلى الغرفة
درج:نصعد عليه للدور الثاني
كرة:نلعب بها القدم
كوب:نشرب فيه
صحن:نضع فيه الطعام
قدر:إناء نطبخ فيه
فرن:نخبز فيه
نار:تحرق وتدفئ
ثلج:ماء متجمد
مطر:ينزل من السحاب
ريح:هواء متحرك
غيم:سحاب
رمل:حبات صغيرة في الصحراء
حجر:صخرة صغيرة
ذهب:معدن أصفر ثمين
عيد:يوم فرح بعد رمضان
سنة:اثنا عشر شهرًا
شهر:ثلاثون يومًا تقريبًا
يوم:أربع وعشرون ساعة
ليل:وقت الظلام
فجر:أول ضوء في النهار
عصر:الوقت بين الظهر والمغرب
علم:راية الوطن
درس:حصة في المدرسة
ولد:ابن
بنت:ابنة
أخت:بنت أبيك وأمك
عمة:أخت الأب
خال:أخو الأم
خالة:أخت الأم
طفل:صغير السن
شيخ:كبير السن
حلو:عكس مُرّ
حار:عكس بارد
كبير:عكس صغير
صغير:عكس كبير
طويل:عكس قصير
قصير:عكس طويل
سريع:عكس بطيء
جديد:عكس قديم
قديم:عكس جديد
بارد:عكس حار
نظيف:عكس وسخ
سعيد:فرحان
حزين:عكس سعيد
كتاب:نقرأ فيه
دفتر:نكتب فيه الواجب
مكتب:طاولة الكتابة في العمل
مدرسة:مكان التعلم
معلم:يشرح الدروس للطلاب
طالب:يتعلم في المدرسة
طبيب:يعالج المرضى
مزارع:يزرع الأرض
خباز:يصنع الخبز
نجار:يصنع من الخشب
سيارة:لها أربع عجلات
قطار:يسير على سكة
سفينة:تبحر في البحر
قارب:سفينة صغيرة
جسر:نعبر عليه فوق النهر
شارع:طريق في المدينة
مدينة:أكبر من القرية
قرية:أصغر من المدينة
سوق:مكان البيع والشراء
مسجد:مكان الصلاة
مطبخ:مكان الطبخ في البيت
حديقة:فيها أشجار وزهور
شجرة:لها جذع وأغصان
نخلة:شجرة التمر
زهرة:وردة
غصن:فرع من الشجرة
ورقة:خضراء على الشجر
تفاح:فاكهة حمراء أو خضراء
رمان:فاكهة حباتها حمراء
ليمون:ثمر حامض أصفر
بصل:يدمّع العين عند تقطيعه
ثوم:رائحته قوية ويُطبخ مع البصل
جزر:خضار برتقالي يحبه الأرنب
فول:حبوب تؤكل مدمّسة في الفطور
عدس:حبوب تُطبخ منها الشوربة
قمح:يُطحن ويصير دقيقًا
حليب:تعطينا إياه البقرة
قهوة:مشروب عربي يُقدّم مع التمر
عصير:مشروب من الفواكه
بيض:تضعه الدجاجة
جبن:يُصنع من الحليب
زيت:نقلي فيه الطعام
لحم:من الخروف أو البقر
دجاج:طيور تُربّى في المزرعة
خروف:له صوف
حصان:يركبه الفارس
غزال:حيوان رشيق سريع
أرنب:أذناه طويلتان
ثعلب:حيوان مكّار
نسر:طائر جارح كبير
صقر:طائر يصيد به العرب
حمامة:طائر رمز للسلام
عصفور:طائر صغير يغرّد
نحلة:تصنع العسل
نملة:حشرة صغيرة نشيطة
فراشة:حشرة أجنحتها ملونة
بقرة:تعطينا الحليب
كلب:حارس وفيّ
قطة:حيوان أليف يموء
بحيرة:ماء يحيط به اليابس
جزيرة:يابسة يحيط بها الماء
وادي:مجرى بين الجبال
كهف:مغارة في الجبل
نور:ضوء
ظلام:عكس النور
صباح:أول النهار
صيف:فصل الحر
ربيع:فصل الزهور
خريف:فصل تتساقط فيه الأوراق
برق:ضوء في السماء يسبق الرعد
رعد:صوت في السماء وقت المطر
ريشة:تكسو جسم الطائر
شباك:نافذة
كرسي:نجلس عليه
سرير:ننام عليه
مفتاح:نفتح به القفل
قفل:يُفتح بالمفتاح
ساعة:نعرف بها الوقت
جرس:يرن
هاتف:نتصل به
رسالة:نرسلها لصديق
صورة:نلتقطها بالكاميرا
لون:الأحمر واحد منها
أحمر:لون الطماطم
أزرق:لون السماء
أخضر:لون العشب
أصفر:لون الليمون
أبيض:لون الحليب
أسود:لون الليل
بني:لون الخشب
رقم:عدد
واحد:أول الأعداد
عشرة:عدد أصابع اليدين
ألف:عشر مئات
سلام:تحية
صبر:مفتاح الفرج
عقل:نفكر به
حلم:نراه في المنام
نوم:راحة في الليل
لعب:يحبه الأطفال
رسم:لوحة بالألوان
كتب:جمع كتاب
لغة:نتكلم ونكتب بها
حرف:جزء من الكلمة
كلمة:تتكون من حروف
سطر:خط من الكلام في الصفحة
بطل:شجاع ينتصر
فوز:عكس الخسارة
سباق:منافسة في الجري
ملعب:مكان المباراة
هدف:يسجله اللاعب في المرمى
فريق:مجموعة لاعبين
مدرب:يدرّب الفريق
سفر:رحلة إلى مكان بعيد
مطار:تهبط فيه الطائرات
فندق:ينزل فيه المسافرون
خيمة:بيت من قماش في البر
حطب:خشب نوقد به النار
دلة:إبريق القهوة العربية
فنجان:كوب القهوة الصغير
ضيف:زائر نكرمه
كرم:اشتهر به حاتم الطائي
جار:يسكن بجوارك
صديق:رفيق وفيّ
وجه:فيه العينان والأنف والفم
شعر:ينبت على الرأس
لسان:نتذوق به
ضرس:سن تطحن الطعام
ظفر:في طرف الإصبع
ركبة:مفصل في منتصف الرجل
قدم:نمشي عليها
جلد:يغطي الجسم
عظم:منه يتكون الهيكل
بطن:فيها المعدة
ظهر:عكس البطن
صدر:فيه القلب والرئتان
طماطم:حمراء في السلطة
بطيخ:فاكهة صيفية خضراء من الخارج
مشمش:فاكهة برتقالية صغيرة
توت:ثمر صغير أحمر أو أسود
كرز:ثمرة حمراء صغيرة لها نواة
خوخ:فاكهة ناعمة صيفية
جوز:له قشرة صلبة
لوز:من المكسرات
ملعقة:نأكل بها الشوربة
سكين:نقطع بها
شوكة:نأكل بها المعكرونة
كيس:نضع فيه المشتريات
علبة:صندوق صغير
حقيبة:نحمل فيها الكتب
قميص:لباس له أزرار
ثوب:لباس الرجل في الخليج
خاتم:يُلبس في الإصبع
فضة:معدن أبيض ثمين
حديد:معدن قوي
خشب:من جذوع الشجر
زجاج:تُصنع منه النوافذ
ورق:نكتب عليه
لعبة:يلعب بها الطفل
دمية:لعبة على شكل إنسان
بالون:ننفخه في الحفلات
هدية:نقدّمها في المناسبات
فرح:سرور
ضحك:يدل على السرور
نافذة:ندخل منها الهواء والضوء
غرفة:جزء من البيت له باب
سلم:نصعد عليه
مرآة:نرى فيها وجوهنا
شمعة:تضيء وتذوب
مصباح:يضيء الغرفة
وسادة:نضع عليها رؤوسنا
حبل:نربط به
مقص:نقص به الورق
إبرة:نخيط بها
خيط:يدخل في الإبرة
مشط:نسرّح به الشعر
صابون:نغسل به أيدينا
منشفة:نجفف بها الجسم`;
const W2XPZ=["3,1,0,249;0,2,1,92;0,0,0,229;0,0,1,222;1,4,1,39;1,4,0,144;0,6,1,158", "3,1,0,66;1,2,1,125;1,4,1,24;1,4,0,2;0,6,1,60;1,0,0,213;0,0,1,50", "3,1,0,127;3,4,1,26;4,4,0,15;3,1,1,69;5,0,0,233;2,6,1,244;1,2,1,254;1,0,0,179", "3,1,0,82;3,1,1,186;1,4,1,233;5,1,0,84;2,4,0,206;1,6,1,119;1,2,1,62;1,0,0,11", "3,1,0,159;3,1,1,100;3,3,1,59;0,4,1,198;1,2,0,150;5,3,0,101;3,6,1,213", "3,1,0,99;1,2,1,57;0,4,1,186;0,4,0,40;1,0,0,37;3,1,1,95;6,0,0,154;0,6,1,242", "3,1,0,138;3,2,1,77;6,0,0,111;1,3,1,132;1,1,1,199;4,0,1,178;1,3,0,148;0,5,1,210", "3,1,0,231;2,3,1,21;3,1,1,50;0,5,1,240;0,4,0,200;5,0,0,160", "3,1,0,66;1,2,1,154;0,4,1,108;0,3,0,73;2,4,0,33;2,6,1,138;5,4,0,39", "3,1,0,153;0,4,1,135;1,2,1,118;0,3,0,171;1,0,0,47;0,0,1,185;2,4,0,164;2,6,1,91", "3,1,0,118;1,4,1,240;1,2,1,135;1,0,0,30;2,4,0,14;2,6,1,184;0,0,1,181", "3,1,0,110;0,4,1,208;1,1,1,114;0,4,0,225;0,6,1,106;3,3,1,19;5,2,0,192;1,0,0,7", "3,1,0,136;0,4,1,243;3,2,1,101;6,1,0,194;0,3,0,51;0,1,1,110;1,0,0,49", "3,1,0,220;0,3,1,234;3,1,1,196;1,1,0,252;3,4,1,104;5,0,0,65;5,4,0,172;4,6,1,18", "3,1,0,143;2,4,1,68;2,1,1,221;2,4,0,54;0,6,1,195;0,4,0,60;4,4,0,65;4,5,1,175", "3,1,0,126;1,4,1,32;1,2,1,177;1,1,0,251;3,1,1,66;5,1,0,184", "3,1,0,247;0,2,1,92;0,2,0,100;0,4,1,119;1,0,0,171;2,4,0,61;0,6,1,22;0,0,1,177", "3,1,0,218;1,2,1,124;1,0,0,67;3,3,1,63;2,5,1,9;5,1,0,84;0,0,1,187", "3,1,0,232;3,2,1,84;6,2,0,1;5,0,0,63;1,1,1,239;2,4,1,112;4,4,0,124;3,6,1,64", "3,1,0,134;1,5,1,216;3,1,1,52;0,3,1,79;0,1,0,129;5,0,0,85", "3,1,0,142;1,4,1,3;1,2,1,222;1,4,0,7;0,6,1,6;3,1,1,160;5,1,0,227;1,0,0,245", "3,1,0,146;2,4,1,26;3,1,1,216;5,0,0,126;4,4,0,164;1,2,1,14;4,6,1,145;1,1,0,152", "3,1,0,135;2,2,1,141;5,1,0,185;1,4,1,140;1,4,0,0;1,6,1,15", "3,1,0,220;3,3,1,101;1,1,1,248;5,2,0,238;1,1,0,227;4,5,1,206", "3,1,0,118;1,2,1,86;1,1,0,64;2,4,1,149;5,4,0,58;4,6,1,38;2,4,0,49;0,5,1,214", "3,1,0,161;3,4,1,193;5,2,0,232;1,1,1,206;1,3,1,62;1,3,0,1;0,5,1,253", "3,1,0,82;1,2,1,83;2,4,1,17;1,0,0,8;0,0,1,224;2,4,0,237;2,6,1,151", "3,1,0,128;3,3,1,32;1,4,1,65;1,2,1,224;1,4,0,223;5,3,0,57;3,1,1,107;4,5,1,38", "3,1,0,155;1,2,1,46;3,3,1,16;1,0,0,48;5,1,0,195;3,1,1,229", "3,1,0,230;3,3,1,151;0,4,1,243;3,1,1,120;1,2,0,152;6,0,0,244;5,3,0,77;4,5,1,47", "3,1,0,105;2,1,1,259;0,4,1,136;1,2,0,48;5,1,0,235;0,4,0,180;2,4,0,181;2,6,1,24", "3,1,0,226;3,4,1,212;0,5,1,136;1,2,1,130;5,4,0,10;0,4,0,53;4,6,1,114", "3,1,0,247;2,2,1,203;0,4,1,230;0,3,0,80;2,4,0,151;2,6,1,42", "3,1,0,106;2,2,1,216;0,4,1,211;2,4,0,215;1,6,1,259;0,3,0,22;5,3,0,99", "3,1,0,95;1,2,1,252;2,4,1,190;1,0,0,69;2,4,0,37;0,6,1,148;0,0,1,124;5,0,0,235", "3,1,0,197;1,2,1,122;2,4,1,178;3,1,1,189;1,0,0,38;0,0,1,42;4,4,0,56;3,6,1,45", "3,1,0,82;1,1,1,23;1,4,1,102;4,4,0,256;1,0,0,212;3,6,1,219;3,2,1,221;6,4,0,68", "3,1,0,162;1,1,1,166;2,3,1,87;0,5,1,228;5,3,0,36;1,0,0,204;1,4,0,189", "3,1,0,259;3,4,1,115;0,5,1,174;0,2,0,149;3,1,1,10;5,3,0,146;4,6,1,9", "3,1,0,142;2,3,1,121;0,5,1,153;0,3,0,29;1,1,1,201;1,0,0,158;5,0,0,171", "3,1,0,87;0,4,1,231;0,2,0,173;3,1,1,67;5,0,0,175;2,4,0,55;2,6,1,194", "3,1,0,90;1,2,1,211;1,0,0,16;0,0,1,182;2,4,1,81;5,4,0,25;3,6,1,136", "3,1,0,208;0,2,1,85;1,4,1,129;4,4,0,36;0,0,0,180;2,4,0,172;0,6,1,0;0,0,1,131", "3,1,0,163;0,3,1,72;3,2,1,8;5,0,0,143;0,2,0,168;4,0,1,145;0,5,1,152;1,1,1,254", "3,1,0,94;2,1,1,96;0,4,1,127;1,3,0,107;3,3,1,55;5,3,0,10"];
let W2XC=null;
const w2Xcl=()=>W2XC||(W2XC=W2XCL.trim().split('\n').map(l=>{const i=l.indexOf(':');return {w:l.slice(0,i),c:l.slice(i+1),t:w2T(l.slice(0,i))};}));
const W2XG={};
// a puzzle as cells: the grid cut to its letters, the numbered clues (across reads right to left)
function w2Xw(id){if(W2XG[id])return W2XG[id];const C=w2Xcl();const pl=(W2XPZ[id]||W2XPZ[0]).split(';').map(x=>x.split(',').map(Number));
  const cells={};for(const [r,c,dn,i] of pl){const t=C[i].t;for(let k=0;k<t.length;k++)cells[(r+(dn?k:0))+','+(c+(dn?0:k))]=t[k];}
  const ks=Object.keys(cells).map(k=>k.split(',').map(Number));const r0=Math.min(...ks.map(x=>x[0])),c0=Math.min(...ks.map(x=>x[1]));
  const H=Math.max(...ks.map(x=>x[0]))-r0+1,W=Math.max(...ks.map(x=>x[1]))-c0+1;const g=Array(H*W).fill('');for(const [r,c] of ks)g[(r-r0)*W+(c-c0)]=cells[r+','+c];
  const starts=[...new Set(pl.map(([r,c])=>(r-r0)*W+(c-c0)))].sort((a,b)=>a-b);
  const words=pl.map(([r,c,dn,i])=>{const s=(r-r0)*W+(c-c0);const cs=[...Array(C[i].t.length)].map((_,k)=>s+(dn?k*W:k));return {dn,cs,n:starts.indexOf(s)+1,clue:C[i].c,w:C[i].w};}).sort((a,b)=>a.dn-b.dn||a.n-b.n);
  return W2XG[id]={W,H,g,words,starts};}
const w2XId=(d,rd)=>{const x=d.xs&&d.xs[rd];return Number.isInteger(x)&&x>=0&&x<W2XPZ.length?x:Math.floor(srng(d,'xw'+rd)()*W2XPZ.length);};
const w2XWord=(X,cell,dn)=>X.words.find(w=>w.dn===dn&&w.cs.includes(cell));
GAMES.w_cross=w2Race({name:'كلمات متقاطعة',lbc:'#2D5B8C',rounds:2,T:()=>180000,title:'حل الكلمات المتقاطعة قبل الكل',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3B76B3"/>${[[0,1],[1,1],[2,1],[3,1],[1,0],[1,2],[1,3],[3,2],[3,3],[2,3]].map(([r,c])=>`<rect x="${14+c*18}" y="${14+r*18}" width="17" height="17" rx="2" fill="#fff"/>`).join('')}${[['ق',1,1],['ل',1,2],['م',1,3],['ب',0,1]].map(([t,r,c])=>`<text x="${22.5+c*18}" y="${28+r*18}" font-size="12" font-weight="900" fill="#2D5B8C" text-anchor="middle">${t}</text>`).join('')}<rect x="14" y="88" width="72" height="5" rx="2.5" fill="#FFE08A"/></svg>`,
  init:n=>({xs:w2Deal('xw',[...Array(W2XPZ.length).keys()],2)}),
  begin(d,st){const X=w2Xw(w2XId(d,d.rd));st.f=X.g.map(()=>'');st.sel=X.words[0].cs[0];st.dn=X.words[0].dn;st.pen=0;},
  timeUp(d,st){const X=w2Xw(w2XId(d,d.rd));const n=X.g.filter(Boolean).length;const ok=X.g.filter((c,i)=>c&&st.f[i]===c).length;return {ok:0,f:Math.round(ok/n*100)/100,ms:0};},
  view(d,ctx,st){const X=w2Xw(w2XId(d,d.rd));const cw=w2XWord(X,st.sel,st.dn)||w2XWord(X,st.sel,1-st.dn);const on=new Set(cw?cw.cs:[]);
    const grid=`<div class="w2xg" style="--w:${X.W};--h:${X.H}">${X.g.map((c,i)=>{if(!c)return '<i class="w2xb"></i>';const n=X.starts.indexOf(i)+1;const f=st.f[i];
      return `<button class="w2xc ${i===st.sel?'sel':''} ${on.has(i)?'on':''} ${f&&f===c&&st.chk?'ok':''}" data-ga="c" data-i="${i}">${n&&X.words.some(w=>w.cs[0]===i)?`<small>${n}</small>`:''}${f?escH(f):''}</button>`;}).join('')}</div>`;
    const list=dn=>X.words.filter(w=>w.dn===dn).map(w=>`<button class="w2xl ${cw===w?'on':''} ${w.cs.every(i=>st.f[i]===X.g[i])?'done':''}" data-ga="cl" data-i="${X.words.indexOf(w)}"><b>${w.n}</b>${escH(w.clue)}<small>(${w.cs.length})</small></button>`).join('');
    return `<div class="w2xclue">${cw?`<b>${cw.n} ${cw.dn?'عمودي':'أفقي'}</b> ${escH(cw.clue)}`:''}</div>${grid}${w2Kb({ga:'kk',ok:'hint',okTxt:'اكشف حرف',noEnter:true,dis:c=>'ءئؤى'.includes(c)})}
      <div class="w2xls"><div><h4>أفقي</h4>${list(0)}</div><div><h4>عمودي</h4>${list(1)}</div></div><p class="note">كشف الحرف يزيد وقتك 10 ثواني${st.pen?` (كشفت ${st.pen})`:''}</p><button class="btn soft w2quit" data-ga="quit">استسلم</button>`;},
  click(a,i,d,ctx,st){const X=w2Xw(w2XId(d,d.rd));
    const step=k=>{const w=w2XWord(X,st.sel,st.dn);if(!w)return;const j=w.cs.indexOf(st.sel)+k;if(j>=0&&j<w.cs.length)st.sel=w.cs[j];};
    const done=()=>{if(X.g.every((c,j)=>!c||st.f[j]===c)){try{sfx('win');}catch(e){}w2RSend(d,ctx.v,{ok:1,f:1,ms:Math.round(Date.now()-st.t0+st.pen*10000)});}};
    if(a==='c'){if(!X.g[i])return;if(i===st.sel&&w2XWord(X,i,1-st.dn))st.dn=1-st.dn;else{st.sel=i;if(!w2XWord(X,i,st.dn))st.dn=1-st.dn;}render();return;}
    if(a==='cl'){const w=X.words[i];if(!w)return;st.dn=w.dn;st.sel=w.cs.find(j=>st.f[j]!==X.g[j])??w.cs[0];render();return;}
    if(a==='kk'){const c0=W2KA[i];if(!c0||'ءئؤى'.includes(c0))return;st.f[st.sel]=c0;step(1);render();done();return;}
    if(a==='kdel'){if(!st.f[st.sel])step(-1);st.f[st.sel]='';render();return;}
    if(a==='hint'){const w=w2XWord(X,st.sel,st.dn);const j=(w?w.cs:[st.sel]).find(k=>st.f[k]!==X.g[k]);const k=j!=null?j:X.g.findIndex((c,k2)=>c&&st.f[k2]!==c);if(k<0)return;st.f[k]=X.g[k];st.pen++;st.sel=k;render();done();}},
  resolve(d,picks){const p=picks.map(x=>x&&typeof x==='object'?{ok:!!x.ok,f:Math.max(0,Math.min(1,+x.f||0)),ms:Math.max(0,+x.ms||0)}:null);
    const fast=p.map((x,s)=>x&&x.ok?[s,x.ms]:null).filter(Boolean).sort((a,b)=>a[1]-b[1]);const pts=[...d.pts];
    const lr=p.map((x,s)=>{if(!x)return '0';let g=x.ok?3+(fast[0][0]===s&&(fast.length===1||fast[1][1]>fast[0][1])?2:0):Math.round(x.f*2);pts[s]+=g;return g+':'+(x.ok?1:0)+':'+(x.ok?Math.round(x.ms/100)/10:Math.round(x.f*100));});
    return {...d,pts,lr,res:''};},
  summary(d){const X=w2Xw(w2XId(d,d.rd-1));const rows=d.pl.map((r,s)=>{const x=String((d.lr||[])[s]||'0').split(':');return {s,g:+x[0]||0,t:x.length<2?'—':x[1]==='1'?`حلها بـ${x[2]} ث`:`حل ${x[2]}٪`};});
    return `<div class="w2sum"><div class="w2sh">الجولة ${d.win!=null?'الأخيرة':d.rd}</div>${w2RaceRows(d,rows)}<p class="w2miss">الكلمات: ${X.words.map(w=>`<b>${escH(w.w)}</b>`).join(' ')}</p></div>`;},
  botPick(d,s,lv){const ok=Math.random()<[0,.4,.68,.88][lv];if(!ok)return {ok:0,f:Math.round(([0,.3,.55,.75][lv]+Math.random()*.2)*100)/100,ms:0};
    return {ok:1,f:1,ms:[0,120000,80000,50000][lv]+rnd([0,55000,50000,40000][lv])};}
});
HELP.w_cross='كل جولة كلمات متقاطعة صغيرة، والكل يحلها بنفس الوقت. اضغط «ابدأ»: المس خانة (ولمسة ثانية تقلب بين أفقي وعمودي)، أو المس التلميح من القائمة، واكتب الحروف. الأفقي ينقرأ من اليمين لليسار، والعمودي من فوق لتحت، والتاء المربوطة لها خانتها. «اكشف حرف» يحط لك حرف صح بس يزيد وقتك 10 ثواني. اللي يحلها كلها ياخذ 3 نقاط، والأسرع حل يزيد نقطتين، واللي ما خلّص ياخذ نقطة أو نقطتين حسب اللي حله. جولتين والأكثر نقاط يفوز.';

/* ---------- المساجلة: a hand of real verses; play one that starts with the letter the last verse ended on ----------
   One line: the rhyme letter (الرويّ) the verse ends on | the poet | first half | second half | n for Nabati verses.
   The classical verses are famous ones with a sure attribution; the Nabati ones as their poets' pages quote them. */
const W2PO=`م|المتنبي|الخيلُ والليلُ والبيداءُ تعرفني|والسيفُ والرمحُ والقرطاسُ والقلمُ
م|المتنبي|على قدرِ أهلِ العزمِ تأتي العزائمُ|وتأتي على قدرِ الكرامِ المكارمُ
د|المتنبي|إذا أنتَ أكرمتَ الكريمَ ملكتَهُ|وإنْ أنتَ أكرمتَ اللئيمَ تمرّدا
ن|المتنبي|ما كلُّ ما يتمنّى المرءُ يدركُهُ|تجري الرياحُ بما لا تشتهي السفنُ
م|المتنبي|أنا الذي نظرَ الأعمى إلى أدبي|وأسمعتْ كلماتي مَن بهِ صممُ
م|المتنبي|إذا رأيتَ نيوبَ الليثِ بارزةً|فلا تظنّنَّ أنَّ الليثَ يبتسمُ
ب|المتنبي|أعزُّ مكانٍ في الدُّنى سرجُ سابحٍ|وخيرُ جليسٍ في الزمانِ كتابُ
م|المتنبي|إذا غامرتَ في شرفٍ مرومِ|فلا تقنعْ بما دونَ النجومِ
م|المتنبي|وإذا كانتِ النفوسُ كبارًا|تعبتْ في مرادِها الأجسامُ
م|المتنبي|ذو العقلِ يشقى في النعيمِ بعقلِهِ|وأخو الجهالةِ في الشقاوةِ ينعمُ
ل|المتنبي|وإذا أتتكَ مذمّتي من ناقصٍ|فهي الشهادةُ لي بأنّي كاملُ
د|المتنبي|عيدٌ بأيّةِ حالٍ عدتَ يا عيدُ|بما مضى أم بأمرٍ فيكَ تجديدُ
م|المتنبي|يا أعدلَ الناسِ إلا في معاملتي|فيكَ الخصامُ وأنتَ الخصمُ والحكمُ
د|المتنبي|وما الدهرُ إلا من رواةِ قصائدي|إذا قلتُ شعرًا أصبحَ الدهرُ منشدا
ن|المتنبي|وإذا لم يكنْ منَ الموتِ بُدٌّ|فمنَ العجزِ أن تكونَ جبانا
ل|المتنبي|ومن يكُ ذا فمٍ مرٍّ مريضٍ|يجدْ مرًّا بهِ الماءَ الزلالا
ي|المتنبي|كفى بكَ داءً أن ترى الموتَ شافيا|وحسبُ المنايا أن يكنَّ أمانيا
ن|المتنبي|صحبَ الناسُ قبلنا ذا الزمانا|وعناهمْ من شأنِهِ ما عنانا
د|المتنبي|بذا قضتِ الأيامُ ما بينَ أهلِها|مصائبُ قومٍ عندَ قومٍ فوائدُ
م|المتنبي|ولم أرَ في عيوبِ الناسِ عيبًا|كنقصِ القادرينَ على التمامِ
م|المتنبي|ومنَ العداوةِ ما ينالُكَ نفعُهُ|ومنَ الصداقةِ ما يضرُّ ويؤلمُ
م|المتنبي|وما انتفاعُ أخي الدنيا بناظرِهِ|إذا استوتْ عندَهُ الأنوارُ والظلمُ
م|المتنبي|سيعلمُ الجمعُ ممّن ضمَّ مجلسُنا|بأنّني خيرُ من تسعى بهِ قدمُ
ل|المتنبي|لولا المشقّةُ سادَ الناسُ كلُّهمُ|الجودُ يُفقرُ والإقدامُ قتّالُ
ل|المتنبي|وما التأنيثُ لاسمِ الشمسِ عيبٌ|ولا التذكيرُ فخرٌ للهلالِ
ل|المتنبي|فإنْ تفقِ الأنامَ وأنتَ منهمْ|فإنَّ المسكَ بعضُ دمِ الغزالِ
م|المتنبي|إذا كانَ ما تنويهِ فعلًا مضارعًا|مضى قبلَ أن تُلقى عليهِ الجوازمُ
م|المتنبي|شرُّ البلادِ مكانٌ لا صديقَ بهِ|وشرُّ ما يكسبُ الإنسانُ ما يَصِمُ
م|المتنبي|إذا ترحّلتَ عن قومٍ وقد قدروا|ألّا تفارقَهمْ فالراحلونَ همُ
م|المتنبي|وكمْ من عائبٍ قولًا صحيحًا|وآفتُهُ منَ الفهمِ السقيمِ
م|المتنبي|حتى رجعتُ وأقلامي قوائلُ لي|المجدُ للسيفِ ليسَ المجدُ للقلمِ
ن|المتنبي|أفاضلُ الناسِ أغراضٌ لذا الزمنِ|يخلو منَ الهمِّ أخلاهمْ منَ الفطنِ
ي|المتنبي|إذا الجودُ لم يُرزقْ خلاصًا منَ الأذى|فلا الحمدُ مكسوبًا ولا المالُ باقيا
د|المتنبي|فلا مجدَ في الدنيا لمن قلَّ مالُهُ|ولا مالَ في الدنيا لمن قلَّ مجدُهُ
م|المتنبي|من يهنْ يسهلِ الهوانُ عليهِ|ما لجرحٍ بميّتٍ إيلامُ
ل|المتنبي|وأتعبُ من ناداكَ من لا تجيبُهُ|وأغيظُ من عاداكَ من لا تشاكلُ
ن|المتنبي|ولكنَّ الفتى العربيَّ فيها|غريبُ الوجهِ واليدِ واللسانِ
م|المتنبي|إذا ساءَ فعلُ المرءِ ساءتْ ظنونُهُ|وصدّقَ ما يعتادُهُ من توهّمِ
ل|المتنبي|إذا اعتادَ الفتى خوضَ المنايا|فأهونُ ما يمرُّ بهِ الوحولُ
ل|المتنبي|رماني الدهرُ بالأرزاءِ حتى|فؤادي في غشاءٍ من نبالِ
ن|المتنبي|بمَ التعلّلُ لا أهلٌ ولا وطنُ|ولا نديمٌ ولا كأسٌ ولا سكنُ
ب|المتنبي|طوى الجزيرةَ حتى جاءني خبرٌ|فزعتُ فيهِ بآمالي إلى الكذبِ
ب|أبو تمام|السيفُ أصدقُ إنباءً منَ الكتبِ|في حدِّهِ الحدُّ بينَ الجدِّ واللعبِ
ل|أبو تمام|نقّلْ فؤادَكَ حيثُ شئتَ منَ الهوى|ما الحبُّ إلا للحبيبِ الأوّلِ
د|أبو تمام|وإذا أرادَ اللهُ نشرَ فضيلةٍ|طُويتْ أتاحَ لها لسانَ حسودِ
د|أبو تمام|لولا اشتعالُ النارِ فيما جاورتْ|ما كانَ يُعرفُ طيبُ عَرْفِ العودِ
د|أبو تمام|وطولُ مقامِ المرءِ في الحيِّ مُخلِقٌ|لديباجتيهِ فاغتربْ تتجدّدِ
د|أبو تمام|فإنّي رأيتُ الشمسَ زيدتْ محبّةً|إلى الناسِ أن ليستْ عليهمْ بسرمدِ
ر|أبو فراس الحمداني|سيذكرني قومي إذا جدَّ جدُّهمْ|وفي الليلةِ الظلماءِ يُفتقدُ البدرُ
ر|أبو فراس الحمداني|أراكَ عصيَّ الدمعِ شيمتُكَ الصبرُ|أما للهوى نهيٌ عليكَ ولا أمرُ
ر|أبو فراس الحمداني|ونحنُ أناسٌ لا توسّطَ بيننا|لنا الصدرُ دونَ العالمينَ أو القبرُ
ر|أبو فراس الحمداني|تهونُ علينا في المعالي نفوسُنا|ومن خطبَ الحسناءَ لم يُغلِها المهرُ
ب|أحمد شوقي|وما نيلُ المطالبِ بالتمنّي|ولكنْ تؤخذُ الدنيا غِلابا
ب|أحمد شوقي|وإنّما الأممُ الأخلاقُ ما بقيتْ|فإنْ همُ ذهبتْ أخلاقُهمْ ذهبوا
ل|أحمد شوقي|قمْ للمعلّمِ وفِّهِ التبجيلا|كادَ المعلّمُ أن يكونَ رسولا
ن|أحمد شوقي|دقّاتُ قلبِ المرءِ قائلةٌ لهُ|إنَّ الحياةَ دقائقٌ وثواني
س|أحمد شوقي|وطني لو شُغلتُ بالخلدِ عنهُ|نازعتني إليهِ في الخلدِ نفسي
ن|أحمد شوقي|مخطئٌ من ظنَّ يومًا|أنَّ للثعلبِ دينا
ء|أحمد شوقي|نظرةٌ فابتسامةٌ فسلامٌ|فكلامٌ فموعدٌ فلقاءُ
ء|أحمد شوقي|وُلدَ الهدى فالكائناتُ ضياءُ|وفمُ الزمانِ تبسّمٌ وثناءُ
ق|حافظ إبراهيم|الأمُّ مدرسةٌ إذا أعددتَها|أعددتَ شعبًا طيّبَ الأعراقِ
ت|حافظ إبراهيم|أنا البحرُ في أحشائِهِ الدرُّ كامنٌ|فهلْ ساءلوا الغوّاصَ عن صدفاتي
ت|حافظ إبراهيم|رجعتُ لنفسي فاتّهمتُ حصاتي|وناديتُ قومي فاحتسبتُ حياتي
ر|أبو القاسم الشابي|إذا الشعبُ يومًا أرادَ الحياةَ|فلا بدَّ أن يستجيبَ القدرْ
ر|أبو القاسم الشابي|ومن يتهيّبْ صعودَ الجبالِ|يعشْ أبدَ الدهرِ بينَ الحُفَرْ
ء|أبو القاسم الشابي|سأعيشُ رغمَ الداءِ والأعداءِ|كالنسرِ فوقَ القمّةِ الشمّاءِ
ل|إيليا أبو ماضي|أيّهذا الشاكي وما بكَ داءٌ|كنْ جميلًا ترَ الوجودَ جميلا
م|إيليا أبو ماضي|قالَ السماءُ كئيبةٌ وتجهّما|قلتُ ابتسمْ يكفي التجهّمُ في السما
ل|أبو العلاء المعري|وإنّي وإنْ كنتُ الأخيرَ زمانُهُ|لآتٍ بما لم تستطعْهُ الأوائلُ
د|أبو العلاء المعري|خفّفِ الوطءَ ما أظنُّ أديمَ الـ|أرضِ إلا من هذهِ الأجسادِ
م|زهير بن أبي سلمى|ومن يجعلِ المعروفَ من دونِ عرضِهِ|يفرْهُ ومن لا يتّقِ الشتمَ يُشتمِ
م|زهير بن أبي سلمى|ومهما تكنْ عندَ امرئٍ من خليقةٍ|وإنْ خالَها تخفى على الناسِ تُعلمِ
م|زهير بن أبي سلمى|سئمتُ تكاليفَ الحياةِ ومن يعشْ|ثمانينَ حولًا لا أبا لكَ يسأمِ
م|زهير بن أبي سلمى|لسانُ الفتى نصفٌ ونصفٌ فؤادُهُ|فلمْ يبقَ إلا صورةُ اللحمِ والدمِ
م|زهير بن أبي سلمى|وأعلمُ علمَ اليومِ والأمسِ قبلَهُ|ولكنّني عن علمِ ما في غدٍ عَمِ
د|طرفة بن العبد|ستُبدي لكَ الأيامُ ما كنتَ جاهلًا|ويأتيكَ بالأخبارِ من لم تزوّدِ
د|طرفة بن العبد|وظلمُ ذوي القربى أشدُّ مضاضةً|على المرءِ من وقعِ الحسامِ المهنّدِ
ل|امرؤ القيس|قفا نبكِ من ذكرى حبيبٍ ومنزلِ|بسقطِ اللوى بينَ الدخولِ فحوملِ
ل|امرؤ القيس|مِكرٍّ مِفرٍّ مقبلٍ مدبرٍ معًا|كجلمودِ صخرٍ حطّهُ السيلُ من علِ
ل|امرؤ القيس|وليلٍ كموجِ البحرِ أرخى سدولَهُ|عليَّ بأنواعِ الهمومِ ليبتلي
م|عنترة بن شداد|هلّا سألتِ الخيلَ يا ابنةَ مالكٍ|إن كنتِ جاهلةً بما لم تعلمي
ب|عنترة بن شداد|لا يحملُ الحقدَ من تعلو بهِ الرتبُ|ولا ينالُ العلا من طبعُهُ الغضبُ
م|عنترة بن شداد|يخبرْكِ من شهدَ الوقيعةَ أنّني|أغشى الوغى وأعفُّ عندَ المغنمِ
ل|لبيد بن ربيعة|ألا كلُّ شيءٍ ما خلا اللهَ باطلُ|وكلُّ نعيمٍ لا محالةَ زائلُ
ع|لبيد بن ربيعة|وما المالُ والأهلونَ إلا ودائعٌ|ولا بدَّ يومًا أن تُردَّ الودائعُ
ء|الإمام الشافعي|دعِ الأيامَ تفعلُ ما تشاءُ|وطبْ نفسًا إذا حكمَ القضاءُ
ن|الإمام الشافعي|نعيبُ زمانَنا والعيبُ فينا|وما لزمانِنا عيبٌ سوانا
ك|الإمام الشافعي|ما حكَّ جلدَكَ مثلُ ظفرِكْ|فتولَّ أنتَ جميعَ أمرِكْ
د|الإمام الشافعي|تغرّبْ عنِ الأوطانِ في طلبِ العلا|وسافرْ ففي الأسفارِ خمسُ فوائدِ
ف|الإمام الشافعي|إذا المرءُ لا يرعاكَ إلا تكلّفًا|فدعهُ ولا تُكثرْ عليهِ التأسّفا
ب|أبو العتاهية|ألا ليتَ الشبابَ يعودُ يومًا|فأخبرَهُ بما فعلَ المشيبُ
د|أبو العتاهية|إنَّ الشبابَ والفراغَ والجِدَهْ|مفسدةٌ للمرءِ أيُّ مفسدهْ
م|البحتري|أتاكَ الربيعُ الطلقُ يختالُ ضاحكًا|منَ الحسنِ حتى كادَ أن يتكلّما
ن|بشار بن برد|يا قومُ أذني لبعضِ الحيِّ عاشقةٌ|والأذنُ تعشقُ قبلَ العينِ أحيانا
ب|بشار بن برد|إذا كنتَ في كلِّ الأمورِ معاتبًا|صديقَكَ لم تلقَ الذي لا تعاتبُهْ
ب|النابغة الذبياني|ولستَ بمستبقٍ أخًا لا تلمُّهُ|على شعثٍ أيُّ الرجالِ المهذّبُ
ع|النابغة الذبياني|فإنّكَ كالليلِ الذي هوَ مدركي|وإنْ خلتُ أنَّ المنتأى عنكَ واسعُ
س|الحطيئة|من يفعلِ الخيرَ لا يعدمْ جوازيَهُ|لا يذهبُ العرفُ بينَ اللهِ والناسِ
س|الحطيئة|دعِ المكارمَ لا ترحلْ لبغيتِها|واقعدْ فإنّكَ أنتَ الطاعمُ الكاسي
ن|جرير|إنَّ العيونَ التي في طرفِها حَوَرٌ|قتلْننا ثمَّ لم يحيينَ قتلانا
ر|علي بن الجهم|عيونُ المها بينَ الرصافةِ والجسرِ|جلبنَ الهوى من حيثُ أدري ولا أدري
ن|ابن زيدون|أضحى التنائي بديلًا من تدانينا|ونابَ عن طيبِ لقيانا تجافينا
ن|أبو البقاء الرندي|لكلِّ شيءٍ إذا ما تمَّ نقصانُ|فلا يُغرَّ بطيبِ العيشِ إنسانُ
ل|ابن الوردي|اعتزلْ ذكرَ الأغاني والغزلْ|وقلِ الفصلَ وجانبْ من هزلْ
ل|ابن الوردي|لا تقلْ أصلي وفصلي أبدًا|إنّما أصلُ الفتى ما قد حصلْ
ك|ابن مالك|قالَ محمدٌ هوَ ابنُ مالكِ|أحمدُ ربّي اللهَ خيرَ مالكِ
ل|الطغرائي|أصالةُ الرأيِ صانتني عنِ الخطلِ|وحليةُ الفضلِ زانتني لدى العطلِ
ل|الطغرائي|غاضَ الوفاءُ وفاضَ الغدرُ وانفرجتْ|مسافةُ الخُلفِ بينَ القولِ والعملِ
ل|كعب بن زهير|بانتْ سعادُ فقلبي اليومَ متبولُ|متيّمٌ إثرَها لم يُفدَ مكبولُ
د|المقنّع الكندي|وإنَّ الذي بيني وبينَ بني أبي|وبينَ بني عمّي لمختلفٌ جدّا
ر|حاتم الطائي|أماويَّ إنَّ المالَ غادٍ ورائحٌ|ويبقى منَ المالِ الأحاديثُ والذكرُ
ل|السموأل|إذا المرءُ لم يدنسْ منَ اللؤمِ عرضُهُ|فكلُّ رداءٍ يرتديهِ جميلُ
ل|السموأل|تعيّرنا أنّا قليلٌ عديدُنا|فقلتُ لها إنَّ الكرامَ قليلُ
س|صالح بن عبد القدوس|والشيخُ لا يتركُ أخلاقَهُ|حتى يُوارى في ثرى رمسِهِ
م|المتنبي|مَن أطاقَ التماسَ شيءٍ غلابًا|واغتصابًا لم يلتمسْهُ سؤالا
ء|المتنبي|ما الخِلُّ إلا من أودُّ بقلبِهِ|وأرى بطرفٍ لا يرى بسوائِهِ
م|المتنبي|مالي أكتّمُ حبًّا قد برى جسدي|وتدّعي حبَّ سيفِ الدولةِ الأممُ
م|المتنبي|ما أبعدَ العيبَ والنقصانَ عن شرفي|أنا الثريّا وذانِ الشيبُ والهرمُ
ل|أبو تمام|مَن كانَ مرعى عزمِهِ وهمومِهِ|روضُ الأمانيّ لم يزلْ مهزولا
ب|الإمام الشافعي|ما في المقامِ لذي عقلٍ وذي أدبٍ|من راحةٍ فدعِ الأوطانَ واغتربِ
ل|المتنبي|لا خيلَ عندكَ تهديها ولا مالُ|فليُسعدِ النطقُ إن لم يُسعدِ الحالُ
ب|أبو العتاهية|لِدوا للموتِ وابنوا للخرابِ|فكلّكمُ يصيرُ إلى ذهابِ
ن|امرؤ القيس|لمن طللٌ أبصرتُهُ فشجاني|كخطِّ زبورٍ في عسيبِ يماني
ع|لبيد بن ربيعة|لعمرُكَ ما تدري الضواربُ بالحصى|ولا زاجراتُ الطيرِ ما اللهُ صانعُ
د|طرفة بن العبد|لعمرُكَ إنَّ الموتَ ما أخطأَ الفتى|لكالطِّوَلِ المُرخى وثِنياهُ باليدِ
ر|المتنبي|دعِ النفسَ تأخذْ وسعَها قبلَ بينِها|فمفترقٌ جارانِ دارُهما العمرُ
ل|المتنبي|نحنُ أدرى وقد سألنا بنجدٍ|أطويلٌ طريقُنا أم يطولُ
ل|المتنبي|نصيبُكَ في حياتِكَ من حبيبٍ|نصيبُكَ في منامِكَ من خيالِ
م|المتنبي|بليتُ بلى الأطلالِ إن لم أقفْ بها|وقوفَ شحيحٍ ضاعَ في التُّربِ خاتمُهْ
م|الإمام الشافعي|رأيتُ العلمَ صاحبُهُ شريفٌ|وإن ولدتْهُ آباءٌ لئامُ
م|المتنبي|رِدي حياضَ الردى يا نفسُ واتّركي|حياضَ خوفِ الردى للشاءِ والنعمِ
ر|أبو الحسن التهامي|حكمُ المنيّةِ في البريّةِ جاري|ما هذهِ الدنيا بدارِ قرارِ
د|راشد الخلاوي|يقول الخلاوي الذي ما يكوده|جديد البنا من غاليات القصايد|n
د|راشد الخلاوي|فمن عوّد العين الرقاد تعوّدت|ومن عوّد العين المساري تعاود|n
د|راشد الخلاوي|نعدّ الليالي والليالي تعدّنا|والأعمار تفنى والليالي بزايد|n
ل|محسن الهزاني|دع لذيذ الكرى وانتبه ثم صلْ|واستقم في الدجى وابتهل ثم قلْ|n
ل|محسن الهزاني|يا مجيب الدعا يا عظيم الجلال|يا لطيفٍ بنا دائمٍ لم يزلْ|n
ب|محسن الهزاني|لا حزن يعقوبٍ ولا صبر أيوب|حزني ولا صبري على تلع الارقاب|n
ل|محسن الهزاني|الغنى والرضا والهدى والتقى|والعفو والعفو ثم حسن العملْ|n
ه|بديوي الوقداني|سواجع الشوق باتت في أغانيها|تتلو فنون الهوى والوجد يمليها|n
ف|محمد بن لعبون|حيّ المنازل جنوب السيف|ممتدة الطول مصفوفة|n
ف|محمد بن لعبون|دار الخدم والكرم والضيف|دار المناعير معروفة|n
د|عبدالله بن سبيل|لا تاخذ الدنيا خراصٍ وهقوات|يقطعك من نقل الصميل البراد|n
م|محمد العوني|كالزند يعطي نار إلى صك بالحجر|يعلق منه قبس الوقود مديم|n`;
let W2PV=null;
const w2Need=r=>r==='ء'||r==='ئ'||r==='ؤ'?'ا':r==='ة'?'ه':r==='ى'?'ي':r;
function w2Pv(){if(W2PV)return W2PV;W2PV=W2PO.trim().split('\n').map(l=>{const p=l.split('|');return {r:p[0],p:p[1],a:p[2],b:p[3],nb:p[4]==='n',s:w2N(p[2]).replace(/[^ء-ي]/g,'')[0]};});return W2PV;}
const w2PoHand=n=>n<=3?6:n<=5?5:4;
// the letter the next verse must start with; a letter no verse starts with leaves the next player free
const w2PoNeed=id=>{const v=w2Pv()[id];const c=w2Need(v.r);return w2Pv().some(x=>x.s===c)?c:'';};
const w2PoOk=(d,id)=>id>=0&&!!w2Pv()[id]&&(!d.need||w2Pv()[id].s===d.need);
// a player who has no fitting verse (even after drawing) passes, and the next one may say any verse
const w2PoOpen=(d,s,why)=>({...w2PoTurn(d,s),need:'',ps:d.ps+1,last:`${nm(d,s)} ${why}، والحرف انفتح`});
const w2PoTurn=(d,s)=>({...d,turn:nextSeat(d,s),drew:0});
function w2PoPlay(d,s,i){const id=d.h[s][i];const h=d.h.map((x,k)=>k===s?x.filter((_,j)=>j!==i):x);const V=w2Pv()[id];
  const nd={...d,h,tb:[...d.tb,id],by:[...d.by,s],need:w2PoNeed(id),ps:0,last:`${nm(d,s)} قال بيت ${escH(V.p)}`};
  return h[s].length?w2PoTurn(nd,s):{...nd,win:s,last:`${nm(d,s)} خلّص أبياته`};}
GAMES.w_poem={name:'المساجلة',cat:'words',lbc:'#6B4226',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8C5A33"/><rect x="14" y="16" width="62" height="70" rx="6" fill="#F7E7C6" transform="rotate(-6 45 51)"/><rect x="22" y="14" width="62" height="70" rx="6" fill="#FFF6E2"/><path d="M30 34h22M58 34h18M30 46h18M54 46h22M30 62h22M58 62h18M30 74h18M54 74h22" stroke="#B08A55" stroke-width="3" stroke-linecap="round"/><path d="M90 6c-12 10-24 26-30 44l4 2c8-16 18-30 30-40z" fill="#2D4763"/><path d="M60 50l-3 9 7-6z" fill="#2D4763"/></svg>`,
  init(n){const ids=w2Shuf([...w2Pv().keys()]);const H=w2PoHand(n);const h=[...Array(n)].map((_,s)=>ids.slice(s*H,s*H+H));return {h,dk:ids.slice(n*H),tb:[],by:[],need:'',drew:0,ps:0,last:''};},
  // every hand is seen only by its owner, the pile by nobody
  hide:{seat:['h'],all:['dk']},
  viewer:d=>d.win!=null?null:d.turn,coverMsg:d=>d.last||'',
  points:d=>d.h.map(x=>x.length),
  status:(d,ctx)=>(d.last?`<small>${d.last}</small><br>`:'')+turnTxt(d,ctx),
  winExtra:d=>`انقال ${d.tb.length} ${d.tb.length>10||d.tb.length<3?'بيت':'أبيات'}`,
  redeal:d=>d.win!=null?d:{...d,...GAMES.w_poem.init(d.pl.length),last:'انعادت التوزيعة من جديد'},
  render(d,ctx){const V=w2Pv(),v=ctx.v;const card=(id,cls,extra,ga)=>{const x=V[id];if(!x)return '';
      return `<${ga?'button':'div'} class="w2vs ${cls||''}" ${ga||''} data-k="v${id}"><span class="w2vl s">${x.s}</span><p><span>${escH(x.a)}</span><span>${escH(x.b)}</span></p><span class="w2vp">${escH(x.p)}${x.nb?' • نبطي':''}</span><span class="w2vl r">${x.r}</span>${extra||''}</${ga?'button':'div'}>`;};
    let h=`<div class="w2 w2po"><div class="w2ch-top"><span class="w2chip"><i>📜</i>الكومة ${d.dk.length}</span><span class="w2need ${d.need?'':'free'}" id="pn${d.tb.length}"><small>${d.need?'البيت يبدأ بـ':'البيت'}</small><b>${d.need||'أي بيت'}</b></span></div>`;
    const n=d.tb.length;if(n){h+=`<div class="w2tbl">${d.tb.slice(-2).map((id,k,a)=>{const s=d.by[n-a.length+k];return card(id,k===a.length-1?'top':'old','<i class="w2by" style="--c:'+col(d,s)+'">'+nm(d,s)+'</i>');}).join('')}</div>`;}
    else if(d.win==null)h+=`<p class="w2empty">${nm(d,d.turn)} يفتتح المساجلة بأي بيت</p>`;
    const hand=v!=null&&v>=0?d.h[v]:null;const mine=ctx.my&&d.win==null&&d.turn===v;
    if(hand&&hand.length&&hand.every(id=>id>=0)){const can=hand.some(id=>w2PoOk(d,id));
      h+=`<div class="w2hand"><div class="w2sh">أبياتك ${hand.length}</div>${hand.map((id,i)=>{const ok=mine&&w2PoOk(d,id);return card(id,ok?'can':mine?'no':'','',ok?`data-ga="p" data-i="${i}"`:'');}).join('')}</div>`;
      if(mine&&!can)h+=`<div class="w2acts">${!d.drew&&d.dk.length?'<button class="btn" data-ga="dr">اسحب بيت</button>':''}${d.drew||!d.dk.length?'<button class="btn soft" data-ga="ps">مرّر</button>':''}</div>`;}
    else if(d.win==null)h+=`<p class="note">${nm(d,d.turn)} يدوّر بيت…</p>`;
    return h+'</div>';},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;const s=d.turn;if(!d.h[s]||d.h[s].some(x=>x<0))return;
    if(a==='p'){if(!w2PoOk(d,d.h[s][i]))return;act(w2PoPlay(d,s,i));return;}
    if(a==='dr'){if(d.drew||!d.dk.length||d.dk[0]<0||d.h[s].some(id=>w2PoOk(d,id)))return;const id=d.dk[0];const h=d.h.map((x,k)=>k===s?[...x,id]:x);
      const nd={...d,h,dk:d.dk.slice(1),drew:1,last:`${nm(d,s)} سحب بيت`};act(w2PoOk(d,id)?nd:w2PoOpen(nd,s,'سحب بيت وما ناسبه'));return;}
    if(a==='ps'){if(!(d.drew||!d.dk.length))return;act(w2PoOpen(d,s,'ما عنده بيت'));}},
  onTimeout(d){const s=d.turn;const i=d.h[s].findIndex(id=>w2PoOk(d,id));if(i>=0)return w2PoPlay(d,s,i);
    if(!d.drew&&d.dk.length){const id=d.dk[0];return w2PoOpen({...d,h:d.h.map((x,k)=>k===s?[...x,id]:x),dk:d.dk.slice(1)},s,'خلص وقته وسحب بيت');}
    return w2PoOpen(d,s,'خلص وقته');},
  onSkip:(nd,d)=>({...nd,drew:0}),
  botDelay:(d,s,lv)=>[0,2600,2100,1700][lv]+rnd(800),
  // hard: the verse whose last letter starts the fewest verses the others may still hold (from what it can see)
  bot(d,s,lv){const V=w2Pv();const h=d.h[s];const ok=h.map((id,i)=>[id,i]).filter(([id])=>w2PoOk(d,id));
    if(!ok.length)return botDo(d,s,!d.drew&&d.dk.length?'dr':'ps',0);
    if(lvRand(lv)||lv===1&&Math.random()<.5)return w2PoPlay(d,s,pickR(ok)[1]);
    const seen=new Set([...h,...d.tb]);const left=c=>V.filter((x,id)=>!seen.has(id)&&x.s===c).length;
    const sc=ok.map(([id,i])=>{const c=w2PoNeed(id);const mine=h.filter(x=>x!==id&&V[x].s===c).length;return [i,(c?left(c):30)-mine*(lv===3?2:0)+Math.random()*(lv===3?.5:3)];});
    sc.sort((a,b)=>a[1]-b[1]);return w2PoPlay(d,s,sc[0][0]);}
};
HELP.w_poem='كل لاعب ينعطى أبيات شعر حقيقية (فصيح ونبطي) مكتوب عليها قايلها. اللي يبدأ يقول أي بيت، وبعده كل واحد لازم يقول بيت يبدأ بالحرف اللي انتهى فيه البيت اللي قبله (الرويّ، يعني الحرف اللي تنبني عليه القافية، والهمزة تنحسب ألف). إذا ما عندك بيت مناسب اسحب بيت من الكومة: إذا ناسبك قوله، وإذا ما ناسبك يروح الدور واللي بعدك يقول أي بيت يبيه. أول واحد يخلّص أبياته يفوز. ومع الفرق يفوز الفريق كله مع اللي فاز.';

/* ---------- أطول كلمة: nine letters picked one by one (a long vowel or another letter), then everyone builds the longest word ---------- */
const W2LGV='اااااووويييي',W2LGC=W2GBAG.replace(/[اوي]/g,'');
const w2LgCnt=L=>{const v=[...L].filter(c=>'اوي'.includes(c)).length;return {v,c:L.length-v};};
// at least 3 long vowels and 4 other letters: a kind is closed once it is full, or when the rest must go to the other kind
function w2LgCan(L){const {v,c}=w2LgCnt(L),left=9-L.length;return {v:left>0&&v<5&&left>Math.max(0,4-c),c:left>0&&c<6&&left>Math.max(0,3-v)};}
function w2LgAdd(d,kind){const can=w2LgCan(d.L);if(!can[kind])kind=kind==='v'?'c':'v';if(!can[kind])return d;const pool=kind==='v'?W2LGV:W2LGC;const ch=pool[rnd(pool.length)];const L=d.L+ch;
  return L.length>=9?{...d,L,ph:'play',ts:Date.now(),last:''}:{...d,L,ts:Date.now(),last:''};}
let W2LGB={};
function w2LgWords(L){if(W2LGB[L])return W2LGB[L];const cnt={};for(const c of L)cnt[c]=(cnt[c]||0)+1;const out=[];
  for(const t of w2Lex().tiles.keys()){if(t.length<3||t.length>9)continue;const c2={...cnt};let ok=true;for(const c of t){if(!c2[c]){ok=false;break;}c2[c]--;}if(ok)out.push(t);}
  out.sort((a,b)=>b.length-a.length);if(Object.keys(W2LGB).length>20)W2LGB={};return W2LGB[L]=out;}
const w2LgFits=(L,w)=>{const cnt={};for(const c of L)cnt[c]=(cnt[c]||0)+1;for(const c of w){if(!cnt[c])return false;cnt[c]--;}return true;};
const W2LGT=45000;
function w2LgSum(d){if(!d.lr)return '';const rows=d.pl.map((r,s)=>{const [w,g]=String(d.lr[s]||':0').split(':');return {s,g:+g||0,t:w?`<i>${escH(w2LDisp(w))}</i> ${w2Len(w)} حروف`:'ما ثبّت كلمة'};});
  return `<div class="w2sum"><div class="w2sh">حروف الجولة: <b class="w2pl">${escH(d.pL||'')}</b></div>${w2RaceRows(d,rows)}${d.best?`<p class="w2miss">أطول كلمة نعرفها منها: <b>${escH(w2LDisp(d.best))}</b> (${w2Len(d.best)})</p>`:''}</div>`;}
GAMES.w_long={name:'أطول كلمة',cat:'words',lbc:'#A23B5A',
  icon:`<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#C24E72"/>${['م','س','ت','ش','ف','ى'].map((c,k)=>`<rect x="${8+k*14.5}" y="30" width="13" height="18" rx="3" fill="${k%2?'#FFE0EA':'#fff'}"/><text x="${14.5+k*14.5}" y="44" font-size="11" font-weight="900" fill="#7A2340" text-anchor="middle">${c}</text>`).join('')}<path d="M10 64h80" stroke="#FFE08A" stroke-width="5" stroke-linecap="round"/><path d="M10 58v12M90 58v12" stroke="#FFE08A" stroke-width="4" stroke-linecap="round"/><text x="50" y="88" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">مستشفى</text></svg>`,
  init:n=>({r:0,R:4,L:'',pL:'',ph:'pick',rd:0,pts:Array(n).fill(0),lr:null,best:'',ts:0,last:''}),
  start:d=>({...d,ts:Date.now()}),
  simulNow:d=>d.ph==='play',viewer:d=>d.win==null&&d.ph==='play'?simulViewer(d):null,coverMsg:()=>'',
  // the letters are drawn on the host: a tap on a letter kind goes there; building the word stays on the phone
  net:{local:['t','bk','clr','start','keep','go']},
  points:d=>d.pts,
  status(d,ctx){if(d.ph==='play')return simulStatus(d,ctx,`<small>الجولة ${d.r+1} من ${d.R}</small><br>`,true);
    return `<small>الجولة ${d.r+1} من ${d.R}</small><br>${!ctx.local&&ctx.v===d.turn?'<b class="yt">اختر الحروف</b>':`${nameTag(d,d.turn)} يختار الحروف`}`;},
  winExtra:d=>'النقاط: '+d.pts.map((x,s)=>`${nm(d,s)} ${x}`).join('، '),
  host(d){if(d.ph!=='pick')return null;if(Date.now()-d.ts>15000||goneLong(d.pl[d.turn])){const {v}=w2LgCnt(d.L);return w2LgAdd(d,v<3&&Math.random()<.5?'v':'c');}return null;},
  onTimeout:d=>d.ph==='pick'?w2LgAdd(d,'c'):d,
  render(d,ctx){const slots=`<div class="w2lslots">${[...Array(9)].map((_,k)=>`<i class="${d.L[k]?'on':''} ${d.L[k]&&'اوي'.includes(d.L[k])?'vw':''}" data-k="${d.L[k]?'l':''}">${d.L[k]||''}</i>`).join('')}</div>`;
    if(d.win!=null)return `<div class="w2 w2lg">${w2LgSum(d)}</div>`;
    if(d.ph==='pick'){const can=w2LgCan(d.L);
      return `<div class="w2 w2lg">${slots}${ctx.my?`<div class="w2acts"><button class="btn w2vb" data-ga="v" ${can.v?'':'disabled'}>حرف مد<small>ا و ي</small></button><button class="btn w2cb" data-ga="c" ${can.c?'':'disabled'}>حرف ثاني<small>باقي الحروف</small></button></div><p class="note">الحرف نفسه يطلع بالقرعة. لازم 3 حروف مد على الأقل و4 من الباقي</p>`:`<p class="note">${nm(d,d.turn)} يختار الحروف…</p>`}${w2LgSum(d)}</div>`;}
    if(!ctx.my)return `<div class="w2 w2lg">${slots}${ctx.v>=0&&hasPicked(d,ctx.v)?'<div class="w2sent"><b>✓</b>أرسلت، ننتظر الباقين</div>':''}${qzWho(d,ctx)}</div>`;
    const st=w2RSt(d,ctx.v);
    if(st.ph==='ready')return `<div class="w2 w2lg">${slots}<div class="w2ready"><b>كوّن أطول كلمة من هالحروف (كل حرف مرة)</b><span class="w2rd">${W2LGT/1000} ثانية</span><button class="btn red wide" data-ga="start">جاهز، ابدأ</button></div></div>`;
    if(st.ph==='go'&&Date.now()>st.t0+W2LGT+300)setTimeout(()=>{if(S.w2r===st&&st.ph==='go')w2RSend(d,ctx.v,st.keep||'');},0);
    const w=(st.sel||[]).map(i=>d.L[i]).join('');
    return `<div class="w2 w2lg">${w2Clock(st.t0+W2LGT,W2LGT,'var(--ok)')}${w2TypedBox(w,'المس الحروف')}<div class="w2ltiles">${[...d.L].map((c,i)=>`<button class="w2lt ${st.sel.includes(i)?'used':''} ${'اوي'.includes(c)?'vw':''}" data-ga="t" data-i="${i}" ${st.sel.includes(i)?'disabled':''}>${c}</button>`).join('')}</div>
      <div class="w2acts"><button class="btn soft" data-ga="bk" aria-label="امسح">⌫</button><button class="btn soft" data-ga="clr">مسح</button><button class="btn" data-ga="keep" ${w.length>=3?'':'disabled'}>ثبّت الكلمة</button></div>
      <div class="w2keep">${st.keep?`كلمتك: <b>${escH(w2LDisp(st.keep))}</b> (${w2Len(st.keep)} حروف)، دوّر أطول أو اضغط «خلصت»`:'ثبّت أطول كلمة تلقاها، وتقدر تغيّرها لين يخلص الوقت'}</div><button class="btn red wide" data-ga="go">خلصت</button></div>`;},
  click(a,i,d,ctx){if(!ctx.my||d.win!=null)return;
    if(d.ph==='pick'){if(a!=='v'&&a!=='c')return;if(!w2LgCan(d.L)[a])return;act(w2LgAdd(d,a));return;}
    const st=w2RSt(d,ctx.v);
    if(a==='start'){if(st.ph!=='ready')return;st.ph='go';st.t0=Date.now();st.sel=[];st.keep='';const v=ctx.v;st.tm=setTimeout(()=>{if(S.w2r===st&&st.ph==='go'){w2RSend(d,v,st.keep||'');render();}},W2LGT+50);render();return;}
    if(st.ph!=='go')return;
    if(a==='t'){if(i>=0&&i<9&&!st.sel.includes(i))st.sel=[...st.sel,i];render();return;}
    if(a==='bk'){st.sel=st.sel.slice(0,-1);render();return;}
    if(a==='clr'){st.sel=[];render();return;}
    if(a==='keep'){const w=st.sel.map(j=>d.L[j]).join('');if(w.length<3)return;if(!w2Known(w)){toast(`«${w}» مو بالقاموس`);return;}
      if(st.keep&&w2Len(st.keep)>w2Len(w)){toast('عندك كلمة أطول مثبتة');return;}st.keep=w;st.sel=[];try{sfx('pop');}catch(e){}render();return;}
    if(a==='go'){w2RSend(d,ctx.v,st.keep||'');render();}},
  resolve(d,picks){const ws=picks.map(p=>typeof p==='string'&&w2Len(p)>=3&&w2Len(p)<=9&&w2LgFits(d.L,p)&&w2Known(p)?p:'');const mx=Math.max(0,...ws.map(w2Len));const pts=[...d.pts];
    // a word earns its length, and the longest of the round 2 more
    const lr=ws.map((w,s)=>{const g=w?w2Len(w)+(w2Len(w)===mx?2:0):0;pts[s]+=g;return w+':'+g;});const best=w2LgWords(d.L)[0]||'';
    const r=d.r+1;const base={...d,pts,lr,best,pL:d.L,rd:d.rd+1,last:''};
    if(r>=d.R)return {...base,win:mostPts(pts)};
    return {...base,r,L:'',ph:'pick',turn:nextSeat(d,d.turn),ts:Date.now()};},
  onSkip:(nd,d)=>nd.ph==='pick'?{...nd,ts:Date.now()}:nd,
  botDelay:(d,s,lv)=>900+rnd(700),
  bot(d,s,lv){if(d.ph!=='pick')return d;const {v}=w2LgCnt(d.L);const can=w2LgCan(d.L);let k=Math.random()<(v<3?.45:v<4?.25:.06)?'v':'c';if(!can[k])k=k==='v'?'c':'v';return botDo(d,s,k,0);},
  // hard finds one of the longest words, medium a middling one, easy a short one (and sometimes none)
  botPick(d,s,lv){const ws=w2LgWords(d.L);if(!ws.length||lv===1&&Math.random()<.15)return '';
    if(lv===3)return Math.random()<.8?ws[0]:ws[Math.min(ws.length-1,1+rnd(2))];
    if(lv===2)return ws[Math.min(ws.length-1,Math.floor(ws.length*.15)+rnd(Math.max(1,Math.floor(ws.length*.3))))];
    const sh=ws.filter(w=>w.length<=4);return sh.length?pickR(sh):pickR(ws);}
};
HELP.w_long='كل جولة واحد منكم يختار تسع حروف وحدة وحدة: «حرف مد» (ا و ي) أو «حرف ثاني»، والحرف نفسه يطلع بالقرعة (لازم 3 حروف مد على الأقل و4 من الباقي). بعدها الكل يضغط «ابدأ» وعنده 45 ثانية يكوّن أطول كلمة من هالحروف، وكل حرف ينستخدم مرة وحدة، ويثبّتها. الكلمة الصحيحة تاخذ نقاط بعدد حروفها، وأطول كلمة بالجولة تاخذ نقطتين زيادة. أربع جولات (كل جولة يختار الحروف واحد غير)، والأكثر نقاط يفوز.';

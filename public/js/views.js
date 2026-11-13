'use strict';
/* What each device may see of a game. A secret game says what is hidden (G.hide, G.mask, G.privShow, G.net);
   the acting host keeps the whole state and shows every seat only its own view. Pure helpers, no network here. */
// catches act()/setPriv() during a click the host replays for a player, or a click this phone tries first (bots keep ACT_CAP)
let NET_CAP=null;
const isSecretG=G=>!!(G&&(G.hide||G.mask||G.privShow||G.net));
// a hidden value keeps its shape (a hand of 5 cards is still 5 cards long) but none of its content
function maskVal(x){if(typeof x==='string')return '?'.repeat(x.length);if(typeof x==='number')return -1;if(typeof x==='boolean')return false;if(Array.isArray(x))return x.map(maskVal);return null;}
// the game state as seat `seat` may see it (-1: someone with no seat, i.e. everybody)
function viewOf(G,d,seat){if(!d||!G)return d;if(G.mask)return G.mask(d,seat);const H=G.hide;if(!H)return d;
  if(H.open?H.open(d):d.win!=null)return d;const v={...d};
  for(const f of H.seat||[])if(Array.isArray(d[f]))v[f]=d[f].map((x,s)=>s===seat?x:maskVal(x));
  for(const f of H.all||[])if(f in d)v[f]=maskVal(d[f]);return v;}
// what seat `seat` may see of role `role`'s private part p: its own part whole, the others only as "picked" markers
function privFor(G,d,seat,role,p){if(!p)return null;const own=seat>=0&&!!d&&d.pl[seat]===role;
  if(G&&G.privShow)return G.privShow(d,seat,role,p,own);
  if(own||(d&&d.win!=null))return p;return {gid:p.gid,rd:p.rd,...(p.pick!=null?{pick:1}:{})};}
const jsEq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// the changes from the public state to one seat's view: {k:val} for a changed key, {'@k':{i:val}} for changed places of a
// list of the same length, {'!k':1} for a key the view does not have
function dPatch(pub,v){const o={};if(!v||typeof v!=='object')return o;pub=pub||{};
  for(const k of Object.keys(v)){const a=pub[k],b=v[k];if(b===undefined){if(k in pub)o['!'+k]=1;continue;}if(jsEq(a,b))continue;
    if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){const m={};b.forEach((x,i)=>{if(!jsEq(x,a[i]))m[i]=x===undefined?null:x;});o['@'+k]=m;}
    else o[k]=b;}
  for(const k of Object.keys(pub))if(!(k in v)&&pub[k]!==undefined)o['!'+k]=1;
  return o;}
function applyPatch(pub,dp){if(!pub||typeof pub!=='object'||!dp||typeof dp!=='object')return pub;const o={...pub};
  for(const k of Object.keys(dp)){if(k==='__proto__')continue;
    if(k[0]==='@'){const n=k.slice(1),m=dp[k];if(!Array.isArray(o[n])||!m||typeof m!=='object')continue;const arr=o[n].slice();
      for(const i of Object.keys(m)){const j=+i;if(Number.isInteger(j)&&j>=0&&j<arr.length)arr[j]=m[i];}o[n]=arr;}
    else if(k[0]==='!')delete o[k.slice(1)];
    else if(k!=='constructor'&&k!=='prototype')o[k]=dp[k];}
  return o;}
/* the per-phone UI state a click may read or change (selection, typed words, chosen colour…) */
const UIK=['draft','sel','tgt','wild','dside','gw','mm','lq','lf','jk','hd','blSuit','unoSaid','simon','sp','mcell','mprops','arA','dwSel'];
const UIDEF={gw:false,tgt:null,wild:null,dside:null,mm:[],sel:[],simon:null,lq:null,lf:null,sp:null,mcell:null,mprops:false,jk:null,arA:null,dwSel:null};
const uiKeys=G=>[...new Set([...UIK,...((G&&G.net&&G.net.ui)||[])])];
// the draft fields that belong to the phone, not to a game click
const DRAFT_OWN=/^(chat|q|myname|ln\d)$/;
const jclone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function uiSnap(G){const o={};for(const k of uiKeys(G)){const v=S[k];if(v===undefined)continue;
    if(k==='draft'){const dr={};for(const n of Object.keys(v||{}))if(!DRAFT_OWN.test(n))dr[n]=v[n];o.draft=dr;}else o[k]=v;}
  let j;try{j=JSON.stringify(o);}catch(e){return {};}
  if(j.length>2048){delete o.draft;j=JSON.stringify(o);}if(j.length>2048)return {};
  return JSON.parse(j);}
// puts a UI snapshot back on this phone; the phone's own draft fields (chat, search, names) stay as they are
function uiLoad(G,ui){ui=ui||{};for(const k of uiKeys(G)){
    if(k==='draft'){const keep={};for(const n of Object.keys(S.draft||{}))if(DRAFT_OWN.test(n))keep[n]=S.draft[n];S.draft={...(jclone(ui.draft)||{}),...keep};continue;}
    if(k in ui)S[k]=jclone(ui[k]);else if(k in UIDEF)S[k]=jclone(UIDEF[k]);else delete S[k];}}
// only the UI keys a host sent back (ack u), each made safe; the draft is merged
function uiApply(G,u){if(!u||typeof u!=='object')return;const ks=uiKeys(G);
  for(const k of Object.keys(u)){if(!ks.includes(k))continue;let v;try{v=cleanVal(u[k],0);}catch(e){continue;}
    if(k==='draft'){const keep={};for(const n of Object.keys(S.draft||{}))if(DRAFT_OWN.test(n))keep[n]=S.draft[n];S.draft={...(v&&typeof v==='object'?v:{}),...keep};}
    else S[k]=v;}}
// mkCtx's online branch, for seat v with this set of private parts
function ctxFor(d,v,priv){const G=GAMES[S.st.g];const extra=G&&G.canAct?G.canAct(d,priv):true;
  if(G&&isSimul(G,d)){const ok=v!=null&&v>=0&&d.out[v]!=='1'&&d.win==null&&!hasPicked(d,v);return {local:false,v,priv,my:ok&&extra,simul:true};}
  return {local:false,v,priv,my:d.win==null&&extra&&d.turn===v};}
/* host side: runs one player's click on the whole state, as that player, with the UI that player had.
   Nothing it does reaches this phone: its move, private part, toasts and UI changes are caught and handed back */
function sandboxClick(G,d,seat,a,i,ui){
  const ks=uiKeys(G),sv={},had={};for(const k of ks){had[k]=k in S;sv[k]=S[k];}
  const me=S.me,tt=window.toast,rr=window.render,hr=S.holdRender,hv=S.holdVK,rp=S.renderPending,cap=NET_CAP;
  const list=[];let err=null,res=null;
  try{uiLoad(G,ui);const ui0=uiSnap(G);
    S.me=d.pl[seat];window.toast=t=>{if(list.length<6)list.push(String(t).slice(0,120));};window.render=()=>{};S.holdRender=true;NET_CAP={v:undefined,pv:null};
    try{G.click(a,i,d,ctxFor(d,seat,S.priv));}catch(e){err=e;}
    const after=uiSnap(G),u={};for(const k of ks){if(k==='draft'&&!('draft' in after))continue;if(!jsEq(after[k],ui0[k]))u[k]=after[k]===undefined?null:after[k];}
    res={v:NET_CAP.v,pv:NET_CAP.pv,toasts:list.slice(0,3),u,err};}
  finally{NET_CAP=cap;for(const k of ks){if(had[k])S[k]=sv[k];else delete S[k];}S.me=me;window.toast=tt;window.render=rr;S.holdRender=hr;S.holdVK=hv;S.renderPending=rp;}
  return res;}
/* the few public moves a game lets a player make when it is not their turn (the game's own click allows exactly these):
   blackjack's next hand, answering a monopoly trade (or taking one's own offer back), answering a backgammon double */
const OFFTURN={
  bj:(d,n,s)=>d.ph==='done'&&(s===d.turn||s===aliveSeats(d)[0]),
  mono:(d,n,s)=>!!d.offer&&(s===d.offer.to||s===d.offer.from)&&n.offer==null,
  tavla:(d,n,s)=>d.ph==='dbl'&&s===tmNow(d,1-d.sd)};
// may seat `seat` move now? the rule the screen uses (ctx.my: its turn, or its pick in a simultaneous round), or one of the above
function canPropose(old,nd,seat){if(seat<0)return false;
  try{if(ctxFor(old,seat,S.priv).my)return true;}catch(e){}
  const f=OFFTURN[S.st.g];try{return !!(f&&f(old,nd,seat));}catch(e){return false;}}
// a move a player proposes in a public game: same round, same players, nobody comes back in, the round is still on,
// and the player could make a move now (a phone that is not on turn cannot hand the host a board, or a win, of its own)
function validateProposal(old,nd,role){
  if(!old||!nd||old.win!=null||nd.gid!==old.gid||!jsEq(nd.pl,old.pl)||(nd.st??null)!==(old.st??null))return false;
  if(typeof nd.out!=='string'||nd.out.length!==old.out.length)return false;
  for(let s=0;s<old.out.length;s++)if(old.out[s]==='1'&&nd.out[s]!=='1')return false;
  return old.pl.includes(role)&&canPropose(old,nd,old.pl.indexOf(role));}

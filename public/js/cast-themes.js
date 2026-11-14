'use strict';
/* =====================================================================================================
   «شخصيات كل لعبة»: the kids of the neighbourhood (kit-hara.js KH.CAST) dressed for each of the 222 games.
   One table: a default for each category (core.js CATS) and an override for the games that call for their own look.
   A theme (all optional):
     o, a, hat   what the players' kids wear, hold and put on their head in this game (KH.kid outfit / acc / hat)
     pp          the pose of the kid whose turn it is (stand, think...)
     h           the game's host: a kid of the cast (0..7, else one picked by the game's id), drawn in their own colour; ho, ha, hh
                 their outfit, held thing, hat;
                 hp their pose while the game runs
     m           (a category) its mascot, shown by the category's title in the game list
     wh          the winner's hat (a crown for chess); w the host's line for a win
   Where it shows (core.js): the status card (the kid whose turn it is, dressed for the game, or the host when everyone plays at
   once), the result sheet (the winner cheering beside the trophy, the host reacting, the podium kids), the «دورك!» banner, the
   pass-the-phone cover and the stats page. Nothing here reads or changes a game's state beyond whose turn it is and who won:
   it only draws, as pictures (KH.kidImg): a kid on screen is one plain element whose picture is made once per look.
   ===================================================================================================== */
const CASTX=(()=>{
  const CAT={
    board:{m:7,o:'thobe',a:'pawn',pp:'think',ha:'pawn',hp:'think',w:'حركة معلّم!'},
    cards:{m:5,o:'dealer',a:'cards',ho:'dealer',ha:'cards',w:'ورقك ذهب!'},
    dice:{m:0,a:'dice',ha:'dice',w:'الزهر معك!'},
    party:{m:6,a:'balloon',ha:'dallah',w:'جمعة حلوة!'},
    quiz:{m:1,a:'buzzer',ho:'host',ha:'mic',w:'إجابة صح!'},
    words:{m:2,a:'pencil',ha:'letter',w:'كلمة كفو!'},
    mind:{m:3,a:'lens',pp:'think',ha:'lens',hh:'bulb',hp:'think',w:'عقل ذهب!'},
    puzzle:{m:4,a:'piece',pp:'think',ha:'piece',hp:'think',w:'حلّيتها!'},
    speed:{m:0,o:'sport',a:'watch',ho:'sport',ha:'watch',w:'أسرع من البرق!'},
    fight:{m:7,o:'gi',a:'sword',ho:'gi',ha:'sword',w:'بطل الحلبة!'},
    sport:{m:5,o:'sport',a:'ball',ho:'sport',ha:'trophy',w:'بطل!'}};
  // the games with a look of their own (anything not given here comes from the category)
  const paper={a:'pencil'},tiles={o:null,a:'tile',ha:'tile',w:'قفلتها!'},lab={ho:'lab'},flag={a:'flag'},sheikh={ho:'thobe'};
  const G={
    // boards: the thinkers; chess crowns its winner
    chess:{wh:'crown',ha:'crownp',w:'كش ملك!'},b_xiangqi:{wh:'crown',ha:'crownp',w:'كش ملك!'},b_tablut:{wh:'crown',w:'الملك نجا!'},g_kings:{wh:'crown'},
    dama:{w:'داما!'},rev:{w:'قلبتها عليهم!'},b_mancala:{a:'coin',w:'جمعت الحب!'},
    tavla:{a:'dice',ha:'dice',h:5,w:'شيش بيش!'},ludo:{a:'dice',ha:'dice',w:'وصلت البيت!'},snakes:{a:'dice',ha:'dice',w:'وصلت فوق!'},jakaro:{a:'cards',ha:'cards'},
    mono:{o:'apron',a:'coin',h:5,ho:'apron',ha:'coin',hp:'stand',w:'تاجر الحارة!'},
    sea:{o:'sailor',a:'lens',h:1,ho:'sailor',ha:'flag',hp:'stand',w:'غرّقت الأسطول!'},
    ttt:paper,uxo:paper,dots:paper,c4:{a:'pawn'},cw:{a:'brush',w:'لوّنتها!'},g_cycles:{o:'sport',a:'flag'},
    // cards and tiles
    bj:{w:'بلاك جاك!'},baloot:{w:'صكّة!'},hand:{w:'نزلت!'},oldmaid:{w:'نجيت من الشايب!'},uno:{w:'آخر ورقة!'},
    domino:tiles,k_fives:tiles,k_train:tiles,k_okey:tiles,
    // dice
    camel:{o:'thobe',a:'flag',h:7,ho:'thobe',ha:'flag',w:'هجنك سبقت!'},d_ship:{o:'sailor',ho:'sailor',w:'وصل القبطان!'},
    d_foot:{o:'sport',a:'ball',ho:'sport',w:'جوووول!'},d_golf:{a:'club'},d_beetle:{a:'pencil',w:'خنفستك كملت!'},
    // party
    mafia:{o:'coat',hat:'fedora',a:'lens',h:3,ho:'coat',hh:'fedora',ha:'lens',hp:'think',w:'انكشف السر!'},
    tele:{o:'smock',a:'brush',h:6,ho:'smock',ha:'brush',w:'رسمة فنان!'},p_fake:{o:'smock',a:'brush',h:6,ho:'smock',ha:'brush',w:'كشفنا المزيف!'},
    p_auction:{a:'coin',ha:'gavel',hp:'stand',w:'بيعت!'},
    p_potato:{o:'apron',hat:'chefhat',a:'spoon',ho:'apron',hh:'chefhat',ha:'spoon',w:'نجيت من البطاطا!'},
    bingo:{a:'pencil',ha:'mic',w:'بنقو!'},p_mime:{a:null,ha:'mic'},p_qa:{ha:'mic'},p_20q:{a:'lens',hh:'bulb'},p_who:{hat:'bulb'},
    luck:{a:'coin',w:'الحظ معك!'},cups:{a:null},rps:{a:null,w:'غلبتهم!'},
    hide:{a:null,ha:null,h:0,hp:'count',w:'لقيتهم!'},
    // quizzes: one host with a microphone, contestants with buzzers
    sci:lab,z_space:lab,z_body:lab,z_invent:lab,z_animal:lab,
    islam:sheikh,z_hist:{ho:'thobe',a:'book'},z_lugha:{a:'book'},z_saudi:{ho:'thobe',a:'flag'},
    caps:flag,geo:flag,z_flags:flag,z_kora:{o:'sport',a:'ball'},z_sport:{o:'sport',a:'ball'},
    math:paper,z_logic:paper,two3:paper,lowu:paper,z_riddle:{hat:'bulb'},z_emoji:{hat:'bulb'},
    // words
    prov:{o:'thobe',a:'book',ho:'thobe',ha:'book',w:'مثل في محله!'},w_poem:{o:'thobe',a:'book',ho:'thobe',ha:'book',w:'بيت يسوى!'},
    w_cross:{a:'pencil'},w_crypt:{a:'lens'},w_grid:{a:'lens'},w_hive:{a:'letter'},scr:{a:'letter'},
    // mind
    guess:{hat:'bulb'},num:{hat:'bulb'},mm:{a:'lens'},wires:{a:'lens',w:'فكّيت القنبلة!'},treasure:{a:'lens',ha:'coin',w:'لقيت الكنز!'},
    nim:paper,c31:paper,g_sim:paper,g_lines:paper,g_notakto:paper,g_swallow:paper,g_hacken:paper,
    // puzzles
    sudo:paper,u_kakuro:paper,u_nono:paper,u_futo:paper,u_cage:paper,u_bin:paper,u_hito:paper,u_star:paper,u_slither:paper,u_link:paper,
    memory:{hat:'bulb'},nmem:{hat:'bulb'},mines:{a:'flag',w:'نظّفت الحقل!'},u_maze:{o:'sport',a:null},u_words:{a:'lens'},u_light:{hat:'bulb'},
    // speed
    s_pop:{a:'balloon'},typing:{a:'pencil'},s_sum:{a:'pencil'},s_letter:{a:'letter'},s_cword:{a:'brush'},stroop:{a:'brush'},
    // fights
    tanks:{hat:'helmet',hh:'helmet',a:'flag',o:null,ho:null},dwars:{a:'dice',ha:'dice'},
    // sports: each with its own gear
    r_arch:{a:'bow',ha:'bow',w:'في الهدف!'},r_bowl:{a:'bowl',ha:'bowl',w:'سترايك!'},r_darts:{a:'dart',ha:'dart',w:'في النص!'},
    r_dhow:{o:'sailor',a:'oar',ho:'sailor',ha:'oar',w:'وصلنا الميناء!'},r_falcon:{o:'thobe',a:'glove',ho:'thobe',ha:'glove',w:'صقرك صاد!'},
    r_fish:{o:null,a:'rod',ho:null,ha:'rod',w:'صيدة كبيرة!'},r_golf:{a:'club',ha:'club',w:'في الحفرة!'},r_hoops:{a:'bball',ha:'bball',w:'سلّة!'},
    r_hop:{a:null},r_horse:{hat:'helmet',hh:'helmet',a:'flag',w:'خيلك سبقت!'},r_jump:{hat:'helmet',hh:'helmet',a:null},
    r_pen:{a:'ball',w:'جوووول!'},r_pool:{a:'cue',ha:'cue',w:'دخلت الكرة!'}};
  const T={};
  // every game has its own host: the one named here, else a kid of the cast picked by the game's name (the category dresses them)
  const hostOf=g=>{let h=7;for(const ch of String(g))h=(h*31+ch.charCodeAt(0))>>>0;return h%8;};
  function theme(g){if(T[g])return T[g];let c='board';try{c=catOf(g);}catch(e){}const o=G[g]||{};return T[g]={...(CAT[c]||CAT.board),h:hostOf(g),...o};}
  const ok=()=>typeof KH!=='undefined';
  const BUST='-27 -76 54 62';
  const seatWon=(d,s)=>typeof d.win==='number'&&(d.win===s||(Array.isArray(d.wins)&&d.wins.includes(s)));
  const turnSeat=(G,d)=>{if(!G||isSimul(G,d)||(typeof G.noTurn==='function'?G.noTurn(d):G.noTurn))return -1;const s=d.turn;return Number.isInteger(s)&&d.pl[s]!=null&&d.out[s]!=='1'?s:-1;};
  // a kid as a picture element (KH.kidImg / KH.pkid): the game's host in their own colour, or a player's kid in theirs
  const host=(t,b,pose,mood)=>KH.kidImg({who:t.h,pose:pose||t.hp||'stand',mood,outfit:t.ho,acc:t.ha,hat:t.hh},b);
  const player=(t,r,b,pose,o={})=>KH.pkid(r,{pose,outfit:t.o,acc:t.a,hat:t.hat,...o},b);
  // the status card: the kid whose turn it is in the game's outfit (the host when everyone plays at once), the winner cheering
  function status(g,d,ctx){if(!ok()||!d)return '';try{const t=theme(g),G=GAMES[g],b={cls:'kh-st',vb:BUST};
    if(d.win!=null)return typeof d.win==='number'&&d.pl[d.win]!=null?player(t,d.pl[d.win],b,'cheer',{hat:t.wh||t.hat}):host(t,b,'think');
    const s=turnSeat(G,d);return s>=0?player(t,d.pl[s],b,t.pp||'stand',{mood:!ctx.local&&s===ctx.v?'g':null}):host(t,b);}catch(e){console.error(e);return '';}}
  // the result sheet: the winner raises the game's thing beside the trophy, the host reacts with the game's line
  function top(g,d,ctx,mine){if(!ok()||!d)return '';try{const t=theme(g),l={cls:'kh-rs l'},r={cls:'kh-rs r'};
    if(typeof d.win==='number'&&d.pl[d.win]!=null)return player(t,d.pl[d.win],l,'cheer',{hat:t.wh||t.hat})+host(t,r,mine?'cheer':'sad',mine?'g':'sad')+`<b class="kh-bub">${mine?t.w:'المرة الجاية لك!'}</b>`;
    return (d.pl[0]!=null?player(t,d.pl[0],l,'think'):'')+(d.pl[1]!=null?player(t,d.pl[1],r,'think'):host(t,r,'think'))+'<b class="kh-bub">ولا أحد غلب!</b>';}catch(e){console.error(e);return '';}}
  // a kid on the podium: the round's winner cheers, the others think or sulk
  function pod(g,d,r,first){if(!ok())return '';const t=theme(g),s=d.pl.indexOf(r),w=seatWon(d,s);
    return player(t,r,{cls:'rs-kid'+(first?' p1k':''),vb:'-27 -76 54 80'},w?'cheer':d.win==='d'||first?'think':'sad',{hat:w?t.wh||t.hat:t.hat});}
  // the «دورك!» banner: your kid waves, dressed for the game
  function turn(g,d,v){if(!ok()||!d||d.pl[v]==null)return '';try{return player(theme(g),d.pl[v],{cls:'ytb-k',vb:BUST},'wave');}catch(e){return '';}}
  // pass the phone: the next kid peeks up from the bottom of the screen
  function cover(d,v){if(!ok()||!d||d.pl[v]==null)return '';try{return KH.pkid(d.pl[v],{pose:'peek',hat:theme(S.st.g).hat},{cls:'cv-kid',vb:'-24 -26 48 36'});}catch(e){return '';}}
  // the game list: each category's mascot by its title, dressed like the category's host
  function cat(c){if(!ok()||!CAT[c])return '';const t=CAT[c];return KH.kidImg({who:t.m,outfit:t.ho,acc:t.ha,hat:t.hh},{cls:'kh-cat',vb:BUST});}
  // the stats page: this phone's kid (the avatar picked online, else حمود), cheering when there are wins
  function stats(t){if(!ok())return '';let k=0;try{const a=myAv();if(a>=KH.KID_AV&&a<KH.KID_AV+8)k=a-KH.KID_AV;}catch(e){}const K=KH.CAST[k];
    return `<div class="kh-stat">${KH.kidImg({who:k,pose:t.w?'cheer':'wave',acc:t.w?'trophy':null},{cls:'kh-sk'})}<p><b>${t.w?'كفو عليك!':t.n?'قربت تفوز!':'يلا نلعب!'}</b><small>${K.n} ${K.g==='g'?(t.w?'فخورة فيك':'تنتظرك'):(t.w?'فخور فيك':'ينتظرك')}</small></p></div>`;}
  return {theme,status,top,pod,turn,cover,stats,cat,CAT,G};
})();

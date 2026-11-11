/* v25 Part 3 · Hand-History Import. Everything runs on-device: no uploads, no network.
   Bundled JSON is never modified. Imported hands and stat deltas live in two additive keys
   and are applied on top of the bundled data at load:
     gtoTrainer.importedSpots.v1   candidate spots (seed schema plus importMeta / reviewReason)
     gtoTrainer.profileDeltas.v1   {version, aliases, imports:[{id, at, files, handIds, players, spotIds}]}
   The parser is a line-for-line port of scripts/import-hand-history.py so counts match the bundled profiles. */
const importKeys={spots:'gtoTrainer.importedSpots.v1',deltas:'gtoTrainer.profileDeltas.v1'};
const IMPORT_COUNTERS=['vpip','pfr','rfi','rfi_btn','rfi_sb','open_limp_when_first_in','iso_raise_vs_limp','bb_fold_vs_open','bb_3bet_vs_open','three_bet','fold_to_3bet','four_bet_vs_3bet','cbet_flop','barrel_turn','barrel_river','fold_to_cbet','raise_vs_cbet','fold_to_bet_flop','fold_to_bet_turn','fold_to_bet_river','check_raise','wtsd','wsd','showdown_weak_hands','river_aggression_weak_at_showdown','all_in_hands'];
const IMPORT_NOT_COUNTABLE=[['aggression_factor','a ratio whose historical bet and call counts are not stored, so new actions cannot be added to it'],['sizing.open_raise_bb_median','a median; raw historical open sizes are not stored, so it cannot be pooled'],['sizing.three_bet_bb_median','a median; raw historical 3-bet sizes are not stored, so it cannot be pooled'],['sizing.bet_pct_pot_median','a median; raw historical bet sizes are not stored, so it cannot be pooled']];
const importDriverLabels={cbet_flop:'Flop c-bet %',fold_to_cbet:'Folds to a c-bet %',fold_to_bet_flop:'Folds to a flop bet %',fold_to_bet_turn:'Folds to a turn bet %',fold_to_bet_river:'Folds to a river bet %',river_aggression_weak_at_showdown:'Weak hands in shown-down river bets %',wsd:'Wins at showdown %',showdown_weak_hands:'Shows a pair or worse at showdown %',barrel_turn:'Turn barrel %',barrel_river:'River barrel %'};
const IMPORT_BASELINE_NOTE='Fill from solver data for this table size; none is bundled.';
const IMPORT_BET_OPTIONS=['check','bet_33pct','bet_50pct','bet_66pct','bet_75pct','bet_100pct'],IMPORT_FACING_OPTIONS=['fold','call','raise'];
/* The six postflop templates. A candidate is graded only when: the decision has the template's shape,
   the hero hand fits the template's rule text, every driver stat has n of at least 100, and the villain's
   current numbers actually show the tendency the template is named for (the `shows` test).
   Answers and why-text mirror the seed spots exactly. The thresholds in `shows` are the one place to tune. */
const IMPORT_TEMPLATES={
 defend_vs_wide_cbet:{refs:['cbet_flop','fold_to_cbet'],shows:s=>s.cbet_flop.pct>=60,need:'a flop c-bet rate of at least 60%',
  answer:c=>c.strong?{best:'raise',acceptable:['raise','call'],forbidden:[]}:c.pair||c.draw?{best:'call',acceptable:['call'],forbidden:[]}:{best:'fold',acceptable:['fold'],forbidden:[]},
  why:(v,s)=>`${v} c-bets ${importNum(s.cbet_flop.pct)}% of the time (n=${s.cbet_flop.n}) and folds to c-bets ${importNum(s.fold_to_cbet.pct)}% (n=${s.fold_to_cbet.n}), so his bets include a lot of air. Continue with a piece or a draw.`},
 stab_vs_low_cbettor:{refs:['cbet_flop','fold_to_bet_flop'],shows:s=>s.cbet_flop.pct<=45&&s.fold_to_bet_flop.pct>(s.fold_to_bet_flop.benchmark_pct??100),need:'a flop c-bet rate of 45% or less and flop folds above the break-even benchmark',
  answer:()=>({best:'bet_50pct',acceptable:['bet_50pct','bet_66pct'],forbidden:['check']}),
  why:(v,s)=>`${v} c-bets only ${importNum(s.cbet_flop.pct)}% (n=${s.cbet_flop.n}) and folds to flop bets ${importNum(s.fold_to_bet_flop.pct)}% (n=${s.fold_to_bet_flop.n}). After he checks, bet.`},
 barrel_vs_over_folder:{refs:['fold_to_bet_turn'],shows:s=>s.fold_to_bet_turn.pct>(s.fold_to_bet_turn.benchmark_pct??100),need:'turn folds above the break-even benchmark',
  answer:()=>({best:'bet_66pct',acceptable:['bet_66pct','bet_75pct'],forbidden:['check']}),
  why:(v,s)=>`${v} folds to turn bets ${importNum(s.fold_to_bet_turn.pct)}% of the time versus a ${importBench(s.fold_to_bet_turn)}% benchmark (n=${s.fold_to_bet_turn.n}). Keep betting the turn.`},
 river_vs_value_heavy_bettor:{refs:['river_aggression_weak_at_showdown','wsd'],shows:s=>s.river_aggression_weak_at_showdown.pct<=30,need:'weak hands in 30% or fewer of shown-down river bets',
  answer:c=>c.strong?{best:'call',acceptable:['call','raise'],forbidden:[]}:c.topPair?{best:'call',acceptable:['call'],forbidden:[]}:{best:'fold',acceptable:['fold'],forbidden:[]},
  why:(v,s)=>`Only ${importNum(s.river_aggression_weak_at_showdown.pct)}% of ${v}'s shown-down river bets were weak hands (n=${s.river_aggression_weak_at_showdown.n}) and he wins ${importNum(s.wsd.pct)}% of showdowns. Fold bluff-catchers and call with top pair or better.`},
 river_bluff_vs_over_folder:{refs:['fold_to_bet_river'],shows:s=>s.fold_to_bet_river.pct>(s.fold_to_bet_river.benchmark_pct??100),need:'river folds above the break-even benchmark',
  answer:()=>({best:'bet_66pct',acceptable:['bet_50pct','bet_66pct','bet_75pct'],forbidden:['check']}),
  why:(v,s)=>`${v} folds to river bets ${importNum(s.fold_to_bet_river.pct)}% of the time versus a ${importBench(s.fold_to_bet_river)}% benchmark (n=${s.fold_to_bet_river.n}). Bet your missed hands.`},
 thin_value_vs_caller:{refs:['showdown_weak_hands'],shows:s=>s.showdown_weak_hands.pct>=50,need:'a pair or worse at 50% or more of showdowns',
  answer:()=>({best:'bet_33pct',acceptable:['bet_33pct','bet_50pct'],forbidden:['check']}),
  why:(v,s)=>`${v} shows a pair or worse at ${importNum(s.showdown_weak_hands.pct)}% of showdowns (n=${s.showdown_weak_hands.n}), so he pays off thin value bets.`}
};
let importBase=null,importedSpots=[],profileDeltas={version:1,aliases:{},imports:[]},lastImportReport=null,importApplyError=null;
const importNum=x=>Number.isInteger(x)?x.toFixed(1):String(x);
const importBench=st=>(st.benchmark_approximate?'~':'')+importNum(st.benchmark_pct);
// Matches Python round(x, 1), including round-half-even on exact ties, so totals agree with the bundled importer.
function importRound1(x){const t=x*10,f=Math.floor(t);if(t-f===.5)return (f%2===0?f:f+1)/10;return Number(x.toFixed(1))}
const importStatus=n=>n>=100?'graded':n>=30?'lean':'hidden';
const hhCents=s=>Math.round(parseFloat(s)*100);
const hhCard=c=>/^[2-9TJQKA][shdc]$/.test(c);

/* ---------- parser (port of scripts/import-hand-history.py parse) ---------- */
function hhWeak(cards){
 const ranks=cards.map(c=>'23456789TJQKA'.indexOf(c[0])+2),counts={};for(const r of ranks)counts[r]=(counts[r]||0)+1;
 const flush=['s','h','d','c'].some(s=>cards.filter(c=>c[1]===s).length>=5),rs=new Set(ranks);if(rs.has(14))rs.add(1);
 let straight=false;for(let n=1;n<=10;n++)if([0,1,2,3,4].every(i=>rs.has(n+i)))straight=true;
 const v=Object.values(counts);return !flush&&!straight&&Math.max(...v)<=2&&v.filter(n=>n===2).length<=1;
}
function parseHand(block){
 const hid=/^PokerStars Hand #(\d+)/.exec(block)?.[1];if(!hid)throw Error('Missing hand ID');
 const header=block.split('*** HOLE CARDS ***')[0],seats={},stacks={};
 for(const m of header.matchAll(/^Seat (\d+): (.*?) \(\$([\d.]+) in chips\)[ \t]*$/gm)){seats[m[1]]=m[2];stacks[m[2]]=hhCents(m[3])}
 if(!Object.keys(seats).length)throw Error('Missing seats');
 const bseat=/Seat #(\d+) is the button/.exec(header)?.[1],button=seats[bseat];if(!button)throw Error('Missing button seat');
 const sb=/^(.*?): posts small blind \$([\d.]+)/m.exec(header),bb=/^(.*?): posts big blind \$([\d.]+)/m.exec(header);if(!bb)throw Error('Missing big blind');
 const sbName=sb?sb[1]:null,bbName=bb[1],bbAmount=hhCents(bb[2]),names=new Set(Object.values(seats));
 const counts=[],bench={},count=(name,key,yes)=>counts.push([name,key,yes?1:0]);
 const active=new Set(names),allin=new Set(),contrib=new Map(),total=new Map(),wins=new Map(),vpip=new Set(),pfr=new Set(),flags=new Set(),limpers=new Set(),riverBettors=new Set(),known={},events=[],unparsed=[];
 let street='pre',raises=0,opener=null,preAggressor=null,voluntary=false,checked=new Set(),checkraiseSeen=new Set(),aggression=null,flopCbet=null,turnBarrel=null,flopSeen=new Set(),board=[];
 const get=(m,k)=>m.get(k)||0,add=(m,k,v)=>m.set(k,get(m,k)+v),pot=()=>[...total.values()].reduce((a,b)=>a+b,0),maxContrib=()=>Math.max(0,...contrib.values());
 for(const line of block.split('*** SUMMARY ***')[0].split('\n').slice(2)){
  if(line.startsWith('*** FLOP ***')||line.startsWith('*** TURN ***')||line.startsWith('*** RIVER ***')){
   street=line.includes('FLOP')?'flop':line.includes('TURN')?'turn':'river';board=line.match(/\b[2-9TJQKA][shdc]\b/g)||[];
   if(street==='flop')flopSeen=new Set(active);
   contrib.clear();checked=new Set();checkraiseSeen=new Set();aggression=null;continue;
  }
  let m=/^Dealt to (.*?) \[(.*?)\]/.exec(line);if(m){known[m[1]]=m[2].split(' ');continue}
  m=/^Uncalled bet \(\$([\d.]+)\) returned to (.*)$/.exec(line);if(m){const a=hhCents(m[1]),n=m[2].trim();add(total,n,-a);add(contrib,n,-a);continue}
  m=/^(.*?) collected \$([\d.]+) from (?:side |main )?pot/.exec(line);if(m){add(wins,m[1],hhCents(m[2]));continue}
  m=/^(.*?): shows \[(.*?)\]/.exec(line);if(m){known[m[1]]=m[2].split(' ');continue}
  m=/^(.*?): (posts small blind|posts big blind|posts the ante|folds|checks|calls|bets|raises)(.*)$/.exec(line);
  if(!m){if(line.includes(': ')&&!/^(Seat |Table |PokerStars)/.test(line)&&![': mucks',": doesn't show",': sits out',': is sitting out'].some(w=>line.includes(w)))unparsed.push(line);continue}
  const name=m[1],action=m[2],tail=m[3];if(!names.has(name))throw Error('Unknown action player '+name);
  const nums=[...tail.matchAll(/\$([\d.]+)/g)].map(x=>x[1]);let amount=0;
  if(action.startsWith('posts')){amount=hhCents(nums[0]);add(contrib,name,amount);add(total,name,amount);continue}
  const before=pot(),facing=maxContrib()-get(contrib,name);
  if(street==='pre'){
   if(action==='calls'||action==='raises')vpip.add(name);
   if(action==='raises')pfr.add(name);
   if(!voluntary&&!flags.has('rfi|'+name)){
    flags.add('rfi|'+name);count(name,'rfi',action==='raises');count(name,'open_limp_when_first_in',action==='calls');
    if(name===button)count(name,'rfi_btn',action==='raises');
    if(name===sbName)count(name,'rfi_sb',action==='raises');
   }
   if(raises===0&&limpers.size&&!flags.has('iso|'+name)){flags.add('iso|'+name);count(name,'iso_raise_vs_limp',action==='raises')}
   if(raises===1&&facing>0&&name!==opener&&!flags.has('3bet|'+name)){
    flags.add('3bet|'+name);count(name,'three_bet',action==='raises');
    if(name===bbName){count(name,'bb_fold_vs_open',action==='folds');count(name,'bb_3bet_vs_open',action==='raises')}
   }
   if(raises===2&&name===opener&&facing>0&&!flags.has('vs3bet|'+name)){flags.add('vs3bet|'+name);count(name,'fold_to_3bet',action==='folds');count(name,'four_bet_vs_3bet',action==='raises')}
  }else{
   if(facing>0){
    const key='fold_to_bet_'+street;count(name,key,action==='folds');((bench[name]??={})[key]=(bench[name][key]||0)+(aggression?aggression.benchmark:0));
    if(street==='flop'&&aggression?.cbet){count(name,'fold_to_cbet',action==='folds');count(name,'raise_vs_cbet',action==='raises')}
    if(checked.has(name)&&!checkraiseSeen.has(name)){checkraiseSeen.add(name);count(name,'check_raise',action==='raises')}
   }
   if(facing===0&&maxContrib()===0&&!flags.has(street+'|'+name)){
    flags.add(street+'|'+name);
    if(street==='flop'&&name===preAggressor)count(name,'cbet_flop',action==='bets');
    if(street==='turn'&&name===flopCbet)count(name,'barrel_turn',action==='bets');
    if(street==='river'&&name===turnBarrel)count(name,'barrel_river',action==='bets');
   }
  }
  let to=null;
  if(action==='folds')active.delete(name);
  else if(action==='checks')checked.add(name);
  else{
   if(action==='raises'){if(nums.length!==2)throw Error('Malformed raise: '+line);to=hhCents(nums[1]);amount=to-get(contrib,name)}else amount=hhCents(nums[0]);
   if(amount<0)throw Error('Negative contribution');
   add(contrib,name,amount);add(total,name,amount);if(tail.includes('all-in'))allin.add(name);
   if(street==='pre'){
    voluntary=true;if(action==='calls'&&raises===0)limpers.add(name);
    if(action==='raises'){raises++;preAggressor=name;if(raises===1)opener=name}
   }else if(action==='bets'||action==='raises'){
    const isCbet=street==='flop'&&name===preAggressor&&aggression===null&&action==='bets';
    aggression={benchmark:100*amount/(before+amount),cbet:isCbet};
    if(isCbet)flopCbet=name;
    if(street==='turn'&&name===flopCbet&&action==='bets')turnBarrel=name;
    if(street==='river'&&action==='bets')riverBettors.add(name);
   }
  }
  events.push({player:name,street,action,facing,amount,to,potBefore:before,board:board.slice()});
 }
 if(unparsed.length)throw Error('Unparsed action line: '+unparsed[0]);
 const showdown=active.size>=2&&board.length===5&&block.includes('*** SHOW DOWN ***');
 for(const n of [...names].sort()){
  count(n,'vpip',vpip.has(n));count(n,'pfr',pfr.has(n));count(n,'all_in_hands',allin.has(n));
  if(flopSeen.has(n))count(n,'wtsd',showdown&&active.has(n));
  if(showdown&&active.has(n)){
   count(n,'wsd',get(wins,n)>0);
   if(known[n]){const weak=hhWeak(known[n].concat(board));count(n,'showdown_weak_hands',weak);if(riverBettors.has(n))count(n,'river_aggression_weak_at_showdown',weak)}
  }
 }
 const sp=/^Total pot \$([\d.]+) \| Rake \$([\d.]+)/m.exec(block),won=[...wins.values()].reduce((a,b)=>a+b,0);
 if(!sp||pot()!==hhCents(sp[1])||won!==pot()-hhCents(sp[2]))throw Error('Pot does not reconcile with the summary');
 if(hhCents(sp[2])!==0)throw Error('Raked hand (profiles are no-rake)');
 return {id:hid,seats,stacks,bseat,button,sbName,bbName,bb:bbAmount,names:[...names],events,known,counts,bench,showdown,potCents:pot()};
}
function splitHands(text){return String(text).replace(/\r\n?/g,'\n').split(/(?=^PokerStars Hand #)/m).filter(b=>b.startsWith('PokerStars Hand #'))}
// Per-log-name totals for a set of parsed hands: {name:{hands, seatSum, stats:{key:{num,n}}, bench:{key:sum}}}.
function tallyHands(hands){
 const out={},get=n=>out[n]??={hands:0,seatSum:0,stats:Object.fromEntries(IMPORT_COUNTERS.map(k=>[k,{num:0,n:0}])),bench:{}};
 for(const h of hands){
  for(const n of h.names){const p=get(n);p.hands++;p.seatSum+=h.names.length}
  for(const [n,k,yes] of h.counts){const s=get(n).stats[k];s.n++;s.num+=yes}
  for(const [n,b] of Object.entries(h.bench))for(const [k,v] of Object.entries(b))get(n).bench[k]=(get(n).bench[k]||0)+v;
 }
 return out;
}

/* ---------- storage and apply-at-load ---------- */
function importRead(){
 let spots=[],deltas={version:1,aliases:{},imports:[]};
 try{const v=JSON.parse(localStorage.getItem(importKeys.spots));if(Array.isArray(v))spots=v.filter(validImportedSpot)}catch{}
 try{const v=JSON.parse(localStorage.getItem(importKeys.deltas));if(validDeltas(v))deltas=v}catch{}
 return {spots,deltas};
}
function validDeltas(v){return !!v&&typeof v==='object'&&Array.isArray(v.imports)&&v.imports.every(i=>i&&typeof i.id==='string'&&Array.isArray(i.handIds)&&i.players&&typeof i.players==='object'&&Object.values(i.players).every(p=>p&&Number.isFinite(p.hands)&&p.hands>=0&&p.stats&&Object.values(p.stats).every(s=>Number.isInteger(s.num)&&Number.isInteger(s.n)&&s.num>=0&&s.n>=s.num)))}
function validImportedSpot(s){
 try{
  const cards=s.heroHand.concat(s.board);
  return typeof s.id==='string'&&s.kind==='villain_real'&&[4,6].includes(s.tableSize)&&typeof s.villain==='string'&&s.heroHand.length===2&&cards.every(hhCard)&&new Set(cards).size===cards.length&&['flop','turn','river'].includes(s.street)&&Array.isArray(s.history)&&s.history.every(x=>typeof x==='string')&&Array.isArray(s.options)&&s.options.length>=2&&s.options.every(o=>IMPORT_BET_OPTIONS.includes(o)||IMPORT_FACING_OPTIONS.includes(o))&&Number.isFinite(s.potBb)&&Number.isFinite(s.toCallBb)&&s.source?.type==='hand_history'&&!!s.importMeta&&Array.isArray(s.importMeta.refs)&&(s.whatTigerDid===undefined||s.options.includes(s.whatTigerDid));
 }catch{return false}
}
function importWrite(spots,deltas){
 const prev=[localStorage.getItem(importKeys.spots),localStorage.getItem(importKeys.deltas)];
 try{localStorage.setItem(importKeys.spots,JSON.stringify(spots));localStorage.setItem(importKeys.deltas,JSON.stringify(deltas));return true}
 catch{try{for(const [i,k] of [importKeys.spots,importKeys.deltas].entries())if(prev[i]===null)localStorage.removeItem(k);else localStorage.setItem(k,prev[i])}catch{}return false}
}
function importStatAt(profiles,ref){
 const [who,...path]=String(ref).split('.'),name=Object.keys(profiles.players).find(n=>n.toLowerCase()===who);if(!name)return null;
 const p=profiles.players[name];return path[0]==='sizing'?p.sizing?.[path[1]]??null:p.stats?.[path.at(-1)]??p.sizing?.[path.at(-1)]??null;
}
// Port of refresh_text: swap the old displayed numbers for the current ones, leaving the sentence untouched.
function importRefreshText(text,refs,oldP,newP){
 const rep={};
 for(const ref of refs){
  const a=importStatAt(oldP,ref),b=importStatAt(newP,ref);if(!a||!b)continue;
  if(a.pct!=null&&b.pct!=null)rep[importNum(a.pct)+'%']=importNum(b.pct)+'%';
  rep['n='+a.n]='n='+b.n;
  if(a.benchmark_pct!=null&&b.benchmark_pct!=null)rep[importNum(a.benchmark_pct)+'%']=(b.benchmark_approximate?'~':'')+importNum(b.benchmark_pct)+'%';
 }
 const keys=Object.keys(rep).filter(k=>rep[k]!==k).sort((x,y)=>y.length-x.length);if(!keys.length)return text;
 const pattern=new RegExp('(?<![\\d.])(?:'+keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?!\\d)','g');
 return String(text).replace(pattern,(m,at,all)=>{const r=rep[m];return r.startsWith('~')&&all[at-1]==='~'?r.slice(1):r});
}
function importDriverStat(villain,key){
 const st=opponentProfiles.players[villain].stats[key],d={ref:villain.toLowerCase()+'.'+key,label:importDriverLabels[key]||key,value_pct:st.pct,n:st.n,status:importStatus(st.n)};
 if(st.benchmark_pct!==undefined){d.benchmark_pct=st.benchmark_pct;if(st.benchmark_approximate)d.benchmark_approximate=true}
 return d;
}
// The grading rule. Re-run whenever profile counts change so numbers, text and status always agree.
function gradeImportedSpot(s){
 const meta=s.importMeta,tpl=IMPORT_TEMPLATES[s.template],player=opponentProfiles.players[s.villain];if(!player)return false;
 const refs=(tpl?tpl.refs:meta.refs).filter(k=>player.stats[k]);s.driverStats=refs.map(k=>importDriverStat(s.villain,k));
 delete s.exploit;delete s.reviewReason;s.status='review';
 if(!tpl){s.reviewReason='No existing template matches this decision.';return true}
 const stats=Object.fromEntries(tpl.refs.map(k=>[k,player.stats[k]])),short=tpl.refs.filter(k=>!stats[k]||stats[k].n<100);
 if(short.length){s.reviewReason=`Shape matches “${villainData.templates[s.template].title}”, but ${short.map(k=>(importDriverLabels[k]||k)+' has n='+(stats[k]?.n??0)).join(' and ')} (graded needs n of at least 100).`;return true}
 if(!tpl.shows(stats)){s.reviewReason=`Shape matches “${villainData.templates[s.template].title}”, but ${s.villain}’s current stats do not show the tendency (needs ${tpl.need}).`;return true}
 const a=tpl.answer(meta.handClass||{});
 s.exploit={best:a.best,acceptable:a.acceptable,forbidden:a.forbidden,why:tpl.why(s.villain,stats),rule:villainData.templates[s.template].rule};s.status='graded';return true;
}
function applyDeltasToProfiles(){
 const old=importBase.profiles,totals={};
 for(const imp of profileDeltas.imports)for(const [name,p] of Object.entries(imp.players)){
  const t=totals[name]??={hands:0,stats:{},bench:{}};t.hands+=p.hands;
  for(const [k,s] of Object.entries(p.stats)){const x=t.stats[k]??={num:0,n:0};x.num+=s.num;x.n+=s.n}
  for(const [k,v] of Object.entries(p.bench||{}))t.bench[k]=(t.bench[k]||0)+v;
 }
 for(const [name,t] of Object.entries(totals)){
  const target=opponentProfiles.players[name];if(!target)continue;target.hands+=t.hands;
  for(const k of IMPORT_COUNTERS){
   const a=target.stats[k],b=t.stats[k];if(!a||!b||!b.n)continue;const oldN=a.n;
   a.num+=b.num;a.n+=b.n;a.pct=a.n?importRound1(100*a.num/a.n):0;
   if(a.benchmark_pct!==undefined&&t.bench[k]!==undefined){a.benchmark_pct=importRound1((a.benchmark_pct*oldN+t.bench[k])/a.n);a.benchmark_approximate=true}
  }
 }
 if(!Object.keys(totals).length)return;
 // Refresh displayed numbers in study notes and seed drills. Seeded best / acceptable actions are never touched.
 for(const [name,p] of Object.entries(opponentProfiles.players)){
  if(!old.players[name])continue;
  for(const note of p.study_notes||[]){
   const refs=[note.stat_ref];if(String(note.stat_ref).endsWith('.fold_to_3bet'))refs.push(name.toLowerCase()+'.four_bet_vs_3bet');
   note.rule=importRefreshText(note.rule,refs,old,opponentProfiles);const st=importStatAt(opponentProfiles,note.stat_ref);if(st){note.n=st.n;note.status=importStatus(st.n)}
  }
 }
 for(const s of villainData.spots){
  const refs=s.driverStats.map(d=>d.ref);
  for(const f of ['why','rule'])s.exploit[f]=importRefreshText(s.exploit[f],refs,old,opponentProfiles);
  for(const d of s.driverStats){
   const st=importStatAt(opponentProfiles,d.ref);if(!st)continue;d.n=st.n;d.status=importStatus(st.n);
   if('value_pct' in d)d.value_pct=st.pct;else d.value=st.value;
   if('benchmark_pct' in d){d.benchmark_pct=st.benchmark_pct;if(st.benchmark_approximate)d.benchmark_approximate=true}
  }
  s.status=importStatus(Math.min(...s.driverStats.map(d=>d.n)));
 }
}
// Called from init() before SpotEngine.load, and again after every import or removal.
function applyImports(){
 if(!importBase)importBase={profiles:structuredClone(opponentProfiles),spots:structuredClone(villainData)};
 const fresh=()=>{opponentProfiles=structuredClone(importBase.profiles);villainData=structuredClone(importBase.spots)};
 fresh();importApplyError=null;
 try{const stored=importRead();profileDeltas=stored.deltas;profileDeltas.aliases??={};applyDeltasToProfiles();importedSpots=stored.spots.filter(gradeImportedSpot)}
 catch(e){fresh();importedSpots=[];importApplyError=String(e?.message||e)}
}
function importedSpotList(){return importedSpots}
function findImportedSpot(id){return importedSpots.find(s=>s.id===id)||null}

/* ---------- candidate spots ---------- */
function importAliases(){
 const map={};for(const [name,p] of Object.entries(importBase?.profiles.players||opponentProfiles.players)){const log=p.latest_session?.log_name;if(log&&log!==name)map[log]=name}
 return {...map,...(profileDeltas.aliases||{})};
}
function parseAliasText(text){
 const out={},bad=[];
 for(const part of String(text||'').split(/[,\n]/).map(x=>x.trim()).filter(Boolean)){const m=/^(.+?)\s*=\s*(.+)$/.exec(part);if(m&&opponentProfiles.players[m[2].trim()])out[m[1].trim()]=m[2].trim();else bad.push(part)}
 return {map:out,bad};
}
function hhPositions(h){
 const order=Object.keys(h.seats).map(Number).sort((a,b)=>a-b),n=order.length,start=order.indexOf(Number(h.bseat)),clock=order.slice(start+1).concat(order.slice(0,start+1)).map(s=>h.seats[s]),pos={};
 if(n===2){pos[h.button]='BTN/SB';for(const x of clock)if(x!==h.button)pos[x]='BB';return pos}
 const middle=clock.filter(x=>x!==h.button&&x!==h.sbName&&x!==h.bbName),labels=['LJ','HJ','CO'].slice(-middle.length);
 middle.forEach((x,i)=>pos[x]=middle.length>3?(i<middle.length-3?'EP':['LJ','HJ','CO'][i-(middle.length-3)]):labels[i]);
 pos[h.button]='BTN';if(h.sbName)pos[h.sbName]='SB';pos[h.bbName]='BB';return pos;
}
// Made-hand class from ranks and suits only. No ranges, no equity.
function hhHandClass(hole,board){
 const R='23456789TJQKA',rank=c=>R.indexOf(c[0]),hr=hole.map(rank),br=board.map(rank),all=hole.concat(board),top=[...new Set(br)].sort((a,b)=>b-a),bc=r=>br.filter(x=>x===r).length;
 const suits=s=>all.filter(c=>c[1]===s).length,flush=['s','h','d','c'].some(s=>suits(s)>=5&&hole.some(c=>c[1]===s)),rs=new Set(all.map(rank).map(r=>r+2));if(rs.has(14))rs.add(1);
 const hset=new Set(hr.map(r=>r+2));if(hset.has(14))hset.add(1);
 let straight=false,sdraw=false;for(let n=1;n<=10;n++){const w=[0,1,2,3,4].map(i=>n+i),have=w.filter(x=>rs.has(x)).length,mine=w.some(x=>hset.has(x)&&!br.some(b=>b+2===x||x===1&&b===12));if(have===5&&mine)straight=true;if(have===4&&mine)sdraw=true}
 const pocket=hr[0]===hr[1],hits=[...new Set(hr)].filter(r=>bc(r)>0),set=pocket&&bc(hr[0])>0,trips=hits.some(r=>bc(r)>=2),twoPair=!pocket&&hits.length===2;
 const strong=flush||straight||set||trips||twoPair;let pair=null,kicker=null;
 if(!strong){
  if(pocket)pair=hr[0]>top[0]?'top':top.length>1&&hr[0]>top[1]?'second':'weak';
  else if(hits.length===1){pair=hits[0]===top[0]?'top':hits[0]===top[1]?'second':'weak';kicker=hr.find(r=>r!==hits[0])}
 }
 const fdraw=board.length<5&&['s','h','d','c'].some(s=>suits(s)===4&&hole.some(c=>c[1]===s)),draw=board.length<5&&!strong&&(fdraw||sdraw);
 return {strong,pair:!!pair,topPair:pair==='top',secondPair:pair==='second',weakTopPair:pair==='top'&&!pocket&&kicker!==null&&kicker<R.indexOf('J'),draw,air:!strong&&!pair,label:strong?'two pair or better':pair?pair+' pair':draw?'draw':'no pair'};
}
function hhTemplateFor(dp,c){
 if(dp.street==='flop'&&dp.facing>0&&dp.cbet)return 'defend_vs_wide_cbet';
 if(dp.street==='flop'&&dp.facing===0&&dp.villainRaisedPre&&dp.villainChecked&&!c.strong&&!c.topPair)return 'stab_vs_low_cbettor';
 if(dp.street==='turn'&&dp.facing===0&&dp.heroBetFlopCalled&&!c.strong&&!c.topPair)return 'barrel_vs_over_folder';
 if(dp.street==='river'&&dp.facing>0)return 'river_vs_value_heavy_bettor';
 if(dp.street==='river'&&dp.facing===0&&c.air)return 'river_bluff_vs_over_folder';
 if(dp.street==='river'&&dp.facing===0&&(c.secondPair||c.weakTopPair))return 'thin_value_vs_caller';
 return null;
}
// One candidate per hand: the first decision that can be graded now, else the first that fits a template, else the last decision.
function buildCandidate(h,file,alias){
 const hero=villainData.meta.hero,canon=n=>alias[n]||n,heroLog=h.names.find(n=>canon(n)===hero);if(!heroLog)return {skip:'no-hero'};
 const hole=h.known[heroLog];if(!hole||hole.length!==2||!hole.every(hhCard))return {skip:'no-cards'};
 const pos=hhPositions(h),bb=h.bb,fmt=c=>(c/bb).toFixed(1)+'bb',who=n=>`${canon(n)} (${pos[n]||'?'})`,history=[],active=new Set(h.names),points=[];
 let street='pre',preAggressor=null,streetState=null,flopFirstBettor=null,flopRaised=false,flopCallers=new Set(),prevAggressor=null;
 for(const e of h.events){
  if(e.street!==street){prevAggressor=streetState?.lastAggressor||prevAggressor;street=e.street;streetState={checked:new Set(),lastAggressor:null,aggressions:0,lastOther:null};history.push(`--- ${street.toUpperCase()} [${e.board.join(' ')}]`)}
  if(e.player===heroLog&&street!=='pre'){
   const others=[...active].filter(n=>n!==heroLog);let villain=null;
   if(e.facing>0)villain=streetState.lastAggressor;
   else villain=others.length===1?others[0]:streetState.lastOther||[prevAggressor,preAggressor].find(n=>n&&n!==heroLog&&active.has(n))||others[0]||null;
   if(villain)points.push({street,board:e.board,history:history.slice(),potBefore:e.potBefore,facing:e.facing,action:e.action,amount:e.amount,villain,
    cbet:street==='flop'&&e.facing>0&&villain===preAggressor&&streetState.aggressions===1,villainRaisedPre:villain===preAggressor,villainChecked:streetState.checked.has(villain),
    heroBetFlopCalled:flopFirstBettor===heroLog&&!flopRaised&&flopCallers.has(villain)});
  }
  history.push(`${who(e.player)} ${e.action==='raises'?'raises to '+fmt(e.to):e.action==='calls'||e.action==='bets'?e.action+' '+fmt(e.amount):e.action}`);
  if(e.action==='folds')active.delete(e.player);
  if(street==='pre'){if(e.action==='raises')preAggressor=e.player}
  else{
   if(e.action==='checks')streetState.checked.add(e.player);
   if(e.action==='bets'||e.action==='raises'){streetState.lastAggressor=e.player;streetState.aggressions++;if(street==='flop'){if(e.action==='bets'&&!flopFirstBettor)flopFirstBettor=e.player;if(e.action==='raises')flopRaised=true}}
   if(street==='flop'&&e.action==='calls')flopCallers.add(e.player);
   if(e.player!==heroLog)streetState.lastOther=e.player;
  }
 }
 if(!points.length)return {skip:'no-decision'};
 const scored=points.map(dp=>{const villain=canon(dp.villain),tracked=!!opponentProfiles.players[villain]&&villain!==hero,c=hhHandClass(hole,dp.board),template=tracked?hhTemplateFor(dp,c):null,tpl=IMPORT_TEMPLATES[template];let gradable=false;
  if(tpl){const st=Object.fromEntries(tpl.refs.map(k=>[k,opponentProfiles.players[villain].stats[k]]));gradable=tpl.refs.every(k=>st[k]&&st[k].n>=100)&&tpl.shows(st)}
  return {dp,villain,tracked,c,template,gradable}});
 const pick=scored.find(x=>x.gradable)||scored.find(x=>x.template)||scored.filter(x=>x.tracked).at(-1);
 if(!pick)return {skip:'untracked',villain:canon(points.at(-1).villain)};
 const {dp,villain,c,template}=pick,n=h.names.length,tableSize=n<=4?4:6,cards=hole.concat(dp.board);if(!dp.board.every(hhCard)||new Set(cards).size!==cards.length)return {skip:'bad-cards'};
 const pct=dp.potBefore?100*dp.amount/dp.potBefore:0,did=dp.action==='folds'?'fold':dp.action==='calls'?'call':dp.action==='raises'?'raise':dp.action==='checks'?'check':pct>=25&&pct<=125?['bet_33pct','bet_50pct','bet_66pct','bet_75pct','bet_100pct'][[33,50,66,75,100].map(x=>Math.abs(x-pct)).reduce((b,d,i,a)=>d<a[b]?i:b,0)]:null;
 const streetName=dp.street[0].toUpperCase()+dp.street.slice(1),refs=dp.facing>0?(dp.street==='flop'?['cbet_flop']:dp.street==='turn'?['barrel_turn']:['barrel_river','wsd']):['fold_to_bet_'+dp.street];
 const spot={kind:'villain_real',...(template?{template}:{}),title:template?villainData.templates[template].title:`${streetName} decision ${dp.facing>0?'facing a bet':'with the action on you'}`,villain,tableSize,effectiveStackBb:Math.round(Math.min(h.stacks[heroLog],h.stacks[dp.villain])/bb),heroPos:pos[heroLog]||'?',villainPos:pos[dp.villain]||'?',street:dp.street,heroHand:hole,board:dp.board,history:dp.history,potBb:Number((dp.potBefore/bb).toFixed(1)),toCallBb:Number((dp.facing/bb).toFixed(1)),options:dp.facing>0?IMPORT_FACING_OPTIONS.slice():IMPORT_BET_OPTIONS.slice(),baseline:null,baselineNote:IMPORT_BASELINE_NOTE,driverStats:[],source:{type:'hand_history',file,psHandId:Number(h.id)},...(did?{whatTigerDid:did}:{}),tags:[template||dp.street,villain.toLowerCase(),'real','imported'],...(n!==tableSize?{tableSizeNote:`Dealt ${n}-handed at the time; the ${tableSize}-handed toggle is the nearest match.`}:{}),status:'review',importMeta:{handClass:c,refs,rawAction:dp.action+(dp.action==='bets'?` ${Math.round(pct)}% pot`:'')}};
 return {spot,unmapped:!did};
}

/* ---------- import run ---------- */
function importKnownHandIds(){
 const ids=new Set();for(const s of importBase.spots.spots)if(s.source?.psHandId)ids.add(String(s.source.psHandId));
 for(const s of importedSpots)ids.add(String(s.source.psHandId));for(const i of profileDeltas.imports)for(const id of i.handIds)ids.add(String(id));return ids;
}
// The bundled profiles already count every hand in this ID range (max - hands_analyzed + 1 .. max).
function importBundledRange(){const m=importBase.profiles.meta,max=Number(m?.latest_session?.hand_id_max),n=Number(m?.hands_analyzed);return Number.isFinite(max)&&Number.isFinite(n)?[max-n+1,max]:null}
function runImport(sources,aliasText){
 const report={at:Date.now(),files:[],parsed:0,unparseable:[],duplicates:0,duplicatesBundled:0,players:[],absent:[],notCountable:IMPORT_NOT_COUNTABLE.map(([stat,why])=>({stat,why})),newPlayers:[],graded:0,review:0,unmapped:[],untracked:[],noHero:0,noDecision:0,noCards:0,aliasBad:[],stored:false,error:null};
 const typed=aliasText===undefined?{map:profileDeltas.aliases||{},bad:[]}:parseAliasText(aliasText);report.aliasBad=typed.bad;
 const prevAliases=profileDeltas.aliases,known=importKnownHandIds(),range=importBundledRange(),accepted=[];
 profileDeltas.aliases=typed.map;const alias=importAliases();
 for(const src of sources){
  const blocks=splitHands(src.text),f={name:src.name,hands:0,found:blocks.length,note:''};report.files.push(f);
  if(!blocks.length){f.note='No PokerStars-format hands found. Nothing from this file was stored.';continue}
  for(const block of blocks){
   const first=block.split('\n')[0].slice(0,140),id=/^PokerStars Hand #(\d+)/.exec(block)[1],inBundle=range&&Number(id)>=range[0]&&Number(id)<=range[1];
   if(known.has(id)||inBundle){report.duplicates++;if(inBundle&&!known.has(id))report.duplicatesBundled++;continue}
   try{const h=parseHand(block);known.add(id);accepted.push({h,file:src.name});f.hands++;report.parsed++}catch(e){report.unparseable.push({file:src.name,line:first,reason:String(e.message||e)})}
  }
  if(!f.hands)f.note=`0 new hands parsed from ${f.found} found. Nothing from this file was stored.`;
 }
 if(!accepted.length){profileDeltas.aliases=prevAliases;lastImportReport=report;return report}
 // Step 1: opponent stat updates (tracked players only; counts are only ever added).
 const tally=tallyHands(accepted.map(a=>a.h)),players={};
 for(const [log,p] of Object.entries(tally)){
  const name=alias[log]||log;if(!opponentProfiles.players[name]){report.newPlayers.push({name:log,hands:p.hands});continue}
  const t=players[name]??={hands:0,seatSum:0,stats:Object.fromEntries(IMPORT_COUNTERS.map(k=>[k,{num:0,n:0}])),bench:{}};t.hands+=p.hands;t.seatSum+=p.seatSum;
  for(const k of IMPORT_COUNTERS){t.stats[k].num+=p.stats[k].num;t.stats[k].n+=p.stats[k].n}
  for(const [k,v] of Object.entries(p.bench))t.bench[k]=(t.bench[k]||0)+v;
 }
 const before=structuredClone(opponentProfiles),prevDeltas=structuredClone({...profileDeltas,aliases:prevAliases}),prevSpots=structuredClone(importedSpots),prevRaw=[localStorage.getItem(importKeys.spots),localStorage.getItem(importKeys.deltas)];
 const imp={id:'imp'+report.at.toString(36)+Math.random().toString(36).slice(2,6),at:report.at,files:report.files.filter(f=>f.hands).map(f=>({name:f.name,hands:f.hands})),handIds:accepted.map(a=>a.h.id),players,spotIds:[]};
 const nextDeltas={version:1,aliases:typed.map,imports:profileDeltas.imports.concat(imp)};
 if(!importWrite(prevSpots,nextDeltas)){profileDeltas.aliases=prevAliases;report.error='Storage is full or unavailable. Nothing from this import was stored.';lastImportReport=report;return report}
 applyImports();
 // Step 2: candidate spots, graded against the profiles as they stand after step 1.
 const seq={},created=[];for(const s of importedSpots){const m=/^(.*-imported)-(\d+)$/.exec(s.id);if(m)seq[m[1]]=Math.max(seq[m[1]]||0,Number(m[2]))}
 for(const {h,file} of accepted){
  let c;try{c=buildCandidate(h,file,importAliases())}catch(e){report.unparseable.push({file,line:'Hand #'+h.id+' (stats counted, no spot)',reason:String(e.message||e)});continue}
  if(c.skip){if(c.skip==='no-hero')report.noHero++;else if(c.skip==='no-decision')report.noDecision++;else if(c.skip==='untracked')report.untracked.push({hand:h.id,villain:c.villain});else report.noCards++;continue}
  const s=c.spot,prefix=`${s.villain.toLowerCase()}-${(s.template||s.street).replace(/_/g,'-')}-imported`;seq[prefix]=(seq[prefix]||0)+1;
  const spot={id:`${prefix}-${seq[prefix]}`,...s};if(!gradeImportedSpot(spot)||!validImportedSpot(spot))continue;
  created.push(spot);if(c.unmapped)report.unmapped.push({hand:h.id,id:spot.id,action:s.importMeta.rawAction});
 }
 imp.spotIds=created.map(s=>s.id);const nextSpots=importedSpots.concat(created);
 if(!importWrite(nextSpots,nextDeltas)){
  try{for(const [i,k] of [importKeys.spots,importKeys.deltas].entries())if(prevRaw[i]===null)localStorage.removeItem(k);else localStorage.setItem(k,prevRaw[i])}catch{}
  applyImports();report.error='Storage is full or unavailable. Nothing from this import was stored.';lastImportReport=report;return report;
 }
 applyImports();report.stored=true;report.importId=imp.id;
 report.graded=created.filter(s=>findImportedSpot(s.id)?.status==='graded').length;report.review=created.length-report.graded;
 report.regraded=prevSpots.filter(o=>o.status!=='graded'&&findImportedSpot(o.id)?.status==='graded').length;
 for(const [name,t] of Object.entries(players)){
  const cur=opponentProfiles.players[name].stats,was=before.players[name].stats;
  report.players.push({name,hands:t.hands,totalHands:opponentProfiles.players[name].hands,updated:IMPORT_COUNTERS.filter(k=>t.stats[k].n>0&&cur[k]).map(k=>({stat:k,added:t.stats[k].n,outcomes:t.stats[k].num,n:cur[k].n,pct:cur[k].pct,wasPct:was[k].pct})),noOpportunities:IMPORT_COUNTERS.filter(k=>!t.stats[k].n||!cur[k])});
 }
 report.absent=Object.keys(opponentProfiles.players).filter(n=>!players[n]);
 try{SpotEngine.load(villainData,opponentProfiles)}catch(e){report.error='Data check after import failed: '+e.message}
 lastImportReport=report;return report;
}
function removeImport(id){
 const imp=profileDeltas.imports.find(i=>i.id===id);if(!imp)return false;
 const drop=new Set(imp.spotIds||[]),next={...profileDeltas,imports:profileDeltas.imports.filter(i=>i.id!==id)};
 if(!importWrite(importedSpots.filter(s=>!drop.has(s.id)),next))return false;applyImports();if(lastImportReport?.importId===id)lastImportReport=null;return true;
}

/* ---------- review mode (ungraded imported spots) ---------- */
function reviewGrade(){return {score:null,classification:'review',exploitScore:null,baselineScore:null,status:'review'}}
function reviewFeedbackHTML(s,f){
 const did=s.whatTigerDid,same=did&&did===f.pick;
 return `<div class="verdict"><strong>Review hand</strong><span class="grade">Not scored</span></div><p>Your answer: <strong>${esc(optionLabel(f.pick))}</strong></p><p><strong>What Tiger did:</strong> ${did?esc(optionLabel(did))+(same?' · same as your answer':' · different from your answer'):'not mapped to the option list ('+esc(s.importMeta?.rawAction||'unknown')+')'}</p><p class="notice">Review mode: ${esc(s.reviewReason||'No exploit answer is attached to this imported hand.')} Nothing is scored: no points, no XP, no mistake-queue entry.</p>${driverStatsHTML(s)}<p class="source">Imported real hand · ${s.tableSize}-handed study · ${esc(s.source.file)} · Hand #${esc(s.source.psHandId)}</p>`;
}

/* ---------- UI: Villain Study home ---------- */
const statName=k=>(typeof statLabels!=='undefined'&&statLabels[k])||k;
function importReportHTML(r){
 if(!r)return '';
 const li=a=>a.map(x=>`<li>${x}</li>`).join(''),made=r.graded+r.review;
 return `<div class="import-report" id="import-report" aria-live="polite"><h4>Import report · ${esc(new Date(r.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</h4>${r.error?`<p class="notice import-error">${esc(r.error)}</p>`:''}${!r.parsed&&!r.error?'<p class="notice">No new hands were parsed, so nothing was stored.</p>':''}
<div class="import-metrics"><div><strong>${r.files.length}</strong><span>${r.files.length===1?'File read':'Files read'}</span></div><div><strong>${r.parsed}</strong><span>Hands parsed</span></div><div><strong>${r.duplicates}</strong><span>Duplicates skipped</span></div><div><strong>${r.unparseable.length}</strong><span>Unparseable</span></div><div><strong>${made}</strong><span>Spots created</span></div></div>
<p><strong>Candidates:</strong> ${r.graded} graded · ${r.review} review${r.regraded?` · ${countLabel(r.regraded,'earlier review spot')} now graded after the stat update`:''}.</p>
<ul class="import-files">${li(r.files.map(f=>`${esc(f.name)}: ${f.found} found, ${f.hands} new${f.note?' · <span class="import-warn">'+esc(f.note)+'</span>':''}`))}</ul>
${r.duplicates?`<p class="source">${r.duplicates} duplicate ${r.duplicates===1?'hand':'hands'} skipped${r.duplicatesBundled?` (${r.duplicatesBundled} already counted in the bundled profiles)`:''}. Duplicates never change a count.</p>`:''}
${r.unparseable.length?`<details open><summary>Skipped as unparseable · ${r.unparseable.length}</summary><ul>${li(r.unparseable.map(u=>`<code>${esc(u.line)}</code><br><span class="source">${esc(u.file)} · ${esc(u.reason)}</span>`))}</ul></details>`:''}
${r.players.map(p=>`<details><summary>${esc(p.name)} · ${countLabel(p.hands,'hand')} added · ${p.totalHands.toLocaleString()} total · ${countLabel(p.updated.length,'stat')} updated</summary><div class="stat-table-wrap"><table class="opponent-stats"><thead><tr><th>Stat</th><th>Opportunities added</th><th>Outcomes added</th><th>New total n</th><th>Rate</th></tr></thead><tbody>${p.updated.map(u=>`<tr><th>${esc(statName(u.stat))}</th><td>${u.added}</td><td>${u.outcomes}</td><td>${u.n}</td><td>${importNum(u.wasPct)}% → ${importNum(u.pct)}%</td></tr>`).join('')}</tbody></table></div>${p.noOpportunities.length?`<p class="source">Not updated, no opportunities in the import: ${p.noOpportunities.map(k=>esc(statName(k))).join(' · ')}.</p>`:''}</details>`).join('')}
${r.stored?`<details><summary>Stats not updated, with reasons</summary><ul>${li(r.notCountable.map(x=>`${esc(x.stat)}: not observable as a count from raw text (${esc(x.why)}).`).concat(r.absent.length?[`No update for ${r.absent.map(esc).join(', ')}: did not appear in the import.`]:[]))}</ul></details>`:''}
${r.newPlayers.length?`<p class="notice"><strong>New players seen, not added:</strong> ${r.newPlayers.map(p=>`${esc(p.name)} (${countLabel(p.hands,'hand')})`).join(' · ')}. If one of these is a log name for a tracked player, remove this import, add it to the name mapping (for example <code>${esc(r.newPlayers[0].name)}=Alex</code>), and import again.</p>`:''}
${r.aliasBad.length?`<p class="notice">Name mapping entries ignored (use LogName=ProfileName with an existing profile): ${r.aliasBad.map(esc).join(' · ')}</p>`:''}
${r.unmapped.length?`<details open><summary>What Tiger did could not be mapped · ${r.unmapped.length}</summary><ul>${li(r.unmapped.map(u=>`Hand #${esc(u.hand)} → ${esc(u.id)}: ${esc(u.action)}. Spot created without it.`))}</ul></details>`:''}
${r.stored?`<p class="source">Hands with no spot: ${r.noDecision} with no postflop decision for ${esc(villainData.meta.hero)} · ${r.noHero} without ${esc(villainData.meta.hero)} (stats only) · ${r.untracked.length} against an untracked player${r.noCards?` · ${r.noCards} without usable hole cards`:''}.</p>`:''}</div>`;
}
function importPanelHTML(){
 if(!importBase)return '';
 const alias=Object.entries(importAliases()).map(([a,b])=>a+'='+b).join(', '),imports=profileDeltas.imports.slice().reverse(),review=importedSpots.filter(s=>s.status==='review').length;
 return `<section class="panel import-panel" id="import-panel"><h3>Import hand histories</h3><p class="muted">Add new real hands and fresh opponent counts from PokerStars-format hand-history text, the same format as the logs behind the bundled spots. Files are read on this device. Nothing is uploaded.</p>${importApplyError?`<p class="notice import-error">Stored import data could not be applied (${esc(importApplyError)}). The bundled data is in use.</p>`:''}
<div class="import-inputs"><label>Hand-history files<input type="file" id="hh-files" multiple accept=".txt,text/plain" aria-label="Hand-history files"></label><label>Or paste hand-history text<textarea id="hh-paste" rows="5" spellcheck="false" placeholder="PokerStars Hand #…"></textarea></label><label>Name mapping (log name = profile name)<input type="text" id="hh-alias" value="${esc(alias)}" autocomplete="off" spellcheck="false"></label><div class="choices"><button class="primary" data-import-run>Import</button></div></div>
<p class="source">Hero: ${esc(villainData.meta.hero)}. Hands without the hero update opponent stats only. Hands already in the bundled data or in an earlier import are skipped as duplicates. Graded spots need an existing template match and every driver stat at n of at least 100; everything else is playable in review mode, unscored.</p>
${importReportHTML(lastImportReport)}
${imports.length?`<h4>Imported so far · ${importedSpots.length-review} graded · ${review} review</h4>${imports.map(i=>`<div class="setting"><div>${esc(i.files.map(f=>f.name).join(', ')||'Pasted text')} · ${countLabel(i.handIds.length,'hand')} · ${countLabel((i.spotIds||[]).length,'spot')}<p class="source">${esc(new Date(i.at).toLocaleString())} · stat updates for ${esc(Object.keys(i.players).join(', ')||'no tracked players')}</p></div><button data-import-remove="${esc(i.id)}">Remove import</button></div>`).join('')}`:''}</section>`;
}
async function importFromUI(){
 const files=[...(document.querySelector('#hh-files')?.files||[])],paste=document.querySelector('#hh-paste')?.value||'',alias=document.querySelector('#hh-alias')?.value,sources=[];
 for(const f of files){try{sources.push({name:f.name.replace(/\.txt$/i,''),text:await f.text()})}catch{sources.push({name:f.name,text:''})}}
 if(paste.trim())sources.push({name:'Pasted text',text:paste});
 if(!sources.length){toast('Choose hand-history files or paste text first.');return}
 runImport(sources,alias);villainSetup();document.getElementById('import-report')?.scrollIntoView({block:'nearest'});
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-import-run')){importFromUI();return}
 if(b.dataset.importRemove){if(!confirm('Remove this import? Its spots and its stat updates are taken back out. Your drill history is kept.'))return;toast(removeImport(b.dataset.importRemove)?'Import removed. Bundled counts plus your other imports are active.':'Could not remove the import.');villainSetup()}
});

/* ---------- backup (Export / Import JSON) ---------- */
function importExportData(){const s=importRead();return {importedSpots:s.spots,profileDeltas:s.deltas}}
function importRestoreData(obj){
 if(obj.importedSpots===undefined&&obj.profileDeltas===undefined)return '';
 if(!validDeltas(obj.profileDeltas)||!Array.isArray(obj.importedSpots))return 'Hand-history import data in this backup was invalid and was skipped.';
 if(!importWrite(obj.importedSpots.filter(validImportedSpot),obj.profileDeltas))return 'Hand-history import data could not be stored.';
 applyImports();try{SpotEngine.load(villainData,opponentProfiles)}catch{}
 return `Hand-history imports restored: ${countLabel(profileDeltas.imports.length,'import')}, ${countLabel(importedSpots.length,'spot')}.`;
}

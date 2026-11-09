/* Exact heads-up Hold'em arithmetic. No ranges or strategy are solved. */
(function(root){
'use strict';
const ranks='23456789TJQKA',suits='shdc',deck=[...ranks].flatMap(r=>[...suits].map(s=>r+s));
const rank=c=>ranks.indexOf(c[0])+2;
function straight(rs){const set=new Set(rs);if(set.has(14))set.add(1);for(let hi=14;hi>=5;hi--)if([0,1,2,3,4].every(n=>set.has(hi-n)))return hi;return 0}
function value(category,rs){let result=category;for(let i=0;i<5;i++)result=result*15+(rs[i]||0);return result}
function rankHand(cards){
 const counts=new Map(),bySuit={s:[],h:[],d:[],c:[]};for(const c of cards){const r=rank(c);counts.set(r,(counts.get(r)||0)+1);bySuit[c[1]].push(r)}
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),desc=[...counts.keys()].sort((a,b)=>b-a),flush=Object.values(bySuit).find(rs=>rs.length>=5);
 if(flush){const sf=straight(flush);if(sf)return value(8,[sf])}
 if(groups[0][1]===4)return value(7,[groups[0][0],...desc.filter(r=>r!==groups[0][0]).slice(0,1)]);
 const trips=groups.filter(g=>g[1]>=3),pairs=groups.filter(g=>g[1]>=2);
 if(trips.length){const pair=pairs.find(g=>g[0]!==trips[0][0]);if(pair)return value(6,[trips[0][0],pair[0]])}
 if(flush)return value(5,flush.sort((a,b)=>b-a).slice(0,5));
 const st=straight(desc);if(st)return value(4,[st]);
 if(trips.length)return value(3,[trips[0][0],...desc.filter(r=>r!==trips[0][0]).slice(0,2)]);
 if(pairs.length>=2){const ps=pairs.map(g=>g[0]).sort((a,b)=>b-a).slice(0,2);return value(2,[...ps,desc.find(r=>!ps.includes(r))])}
 if(pairs.length)return value(1,[pairs[0][0],...desc.filter(r=>r!==pairs[0][0]).slice(0,3)]);
 return value(0,desc.slice(0,5));
}
function remaining(s){const known=[...s.cards,...s.board,...s.villainCards];if(new Set(known).size!==known.length||known.some(c=>!deck.includes(c)))throw Error('Invalid or duplicate card');return deck.filter(c=>!known.includes(c))}
function enumerate(s){if(![3,4].includes(s.board.length))throw Error('Expected a flop or turn');const rest=remaining(s);let wins=0,ties=0,losses=0,runouts=0;function score(runout){const b=[...s.board,...runout],a=rankHand([...s.cards,...b]),v=rankHand([...s.villainCards,...b]);runouts++;if(a>v)wins++;else if(a===v)ties++;else losses++}if(s.board.length===3){for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++)score([rest[i],rest[j]])}else for(const c of rest)score([c]);return {wins,ties,losses,runouts,equity:(wins+ties/2)/runouts*100}}
// A draw-completing card is not a clean out when villain still wins (or ties).
function drawCards(s){
 const available=remaining(s);
 // New pool: derive every completion from the actual hero + board, not a typed rank list.
 // Retain legacy descriptors for already-saved review spots and the existing call pack.
 if(!s.drawType)return available.filter(c=>(s.drawSuit&&c[1]===s.drawSuit)||(s.drawRanks||[]).includes(c[0]));
 return available.filter(c=>{const hand=[...s.cards,...s.board,c],rs=hand.map(rank),flush=Object.values(hand.reduce((a,c)=>(a[c[1]]=(a[c[1]]||0)+1,a),{})).some(n=>n>=5),run=!!straight(rs);return s.drawType==='flush'?flush:s.drawType==='combo'?(flush||run):run});
}
function isCleanOut(s,c){const board=[...s.board,c];return rankHand([...s.cards,...board])>rankHand([...s.villainCards,...board])}
function outCards(s){return drawCards(s).filter(c=>isCleanOut(s,c))}
function analyze(s){const candidates=drawCards(s),outs=candidates.filter(c=>isCleanOut(s,c)),excluded=candidates.filter(c=>!outs.includes(c)).map(c=>{const board=[...s.board,c],heroValue=rankHand([...s.cards,...board]),villainValue=rankHand([...s.villainCards,...board]),names=['high card','a pair','two pair','three of a kind','a straight','a flush','a full house','four of a kind','a straight flush'];return {card:c,villainHand:names[Math.floor(villainValue/(15**5))],tie:heroValue===villainValue}}),multiplier=s.board.length===3?4:2;return {outsVersion:2,outs,excluded,drawCompleters:candidates,count:outs.length,multiplier,rule:outs.length*multiplier,adjusted:multiplier===4&&outs.length>=9?outs.length*4-(outs.length-8):null,...enumerate(s)}}
// Refresh old saved review snapshots without changing historical progress rows.
function refresh(s){if(s.math?.outsVersion!==2)s.math=analyze(s);return s.math}

const legacySeeds=[
 {cards:['8h','7h'],board:['Ah','Kd','4h'],villainCards:['Ac','Kc'],villainMade:'two pair',draw:'Flush',drawSuit:'h'},
 {cards:['Jc','Td'],board:['Qs','9h','2c'],villainCards:['As','Qd'],villainMade:'top pair',draw:'Open-ended straight',drawRanks:['8','K']},
 {cards:['Kc','Qc'],board:['Jd','9s','4h'],villainCards:['Ah','Jc'],villainMade:'top pair',draw:'Gutshot (needs a ten)',drawRanks:['T']},
 {cards:['Jh','Th'],board:['Qh','9h','2c'],villainCards:['Ad','Qd'],villainMade:'top pair',draw:'Flush + open-ended combo',drawSuit:'h',drawRanks:['8','K']},
 {cards:['8h','7h'],board:['Ah','Kd','4h','3c'],villainCards:['Ac','Kc'],villainMade:'two pair',draw:'Flush',drawSuit:'h'},
 {cards:['6c','5c'],board:['7d','8s','Kh'],villainCards:['Kd','Qh'],villainMade:'top pair',draw:'Open-ended straight',drawRanks:['4','9']}
];
function scenario(seed,drill,id,extra={}){const s={...seed,...extra,kind:'equity',spot:'Equity Lab',hero:'BB',villain:'BTN',drill,id:'equity-'+id,source:'Exact math · enumerated runouts · rule of 2 and 4',label:'Equity Lab'};s.math=analyze(s);return s}
const seeds=[{"poolId":"F04","cards":["Kc","Qc"],"board":["Jd","9s","4h"],"villainCards":["Ah","Jc"],"villainMade":"top pair","draw":"Gutshot (needs a ten)","drawType":"gutshot"},{"poolId":"F06","cards":["Tc","9d"],"board":["Jh","8s","2c"],"villainCards":["Qh","Qd"],"villainMade":"overpair","draw":"Open-ended straight with blocked outs","drawType":"straight"},{"poolId":"F08","cards":["Jc","Td"],"board":["Qs","9h","2c"],"villainCards":["As","Qd"],"villainMade":"top pair","draw":"Open-ended straight","drawType":"straight"},{"poolId":"F09","cards":["8h","7h"],"board":["Ah","Kd","4h"],"villainCards":["As","Qc"],"villainMade":"top pair","draw":"Flush","drawType":"flush"},{"poolId":"F10","cards":["Th","9h"],"board":["Jh","7h","Ac"],"villainCards":["8c","8d"],"villainMade":"pair of eights","draw":"Flush + gutshot with blocked outs","drawType":"combo"},{"poolId":"F12","cards":["Th","9h"],"board":["Jh","7h","Ac"],"villainCards":["Ad","Qc"],"villainMade":"top pair","draw":"Flush + gutshot","drawType":"combo"},{"poolId":"F15","cards":["Jh","Th"],"board":["Qh","9h","2c"],"villainCards":["Ad","Qd"],"villainMade":"top pair","draw":"Flush + open-ended combo","drawType":"combo"},{"poolId":"F08D","cards":["Jc","9d"],"board":["Ks","Th","7c"],"villainCards":["Ac","Kd"],"villainMade":"top pair","draw":"Double gutshot","drawType":"straight"},{"poolId":"T04","cards":["Kc","Qc"],"board":["Jd","9s","4h","2d"],"villainCards":["Ah","Jc"],"villainMade":"top pair","draw":"Gutshot (needs a ten)","drawType":"gutshot"},{"poolId":"T08","cards":["Jc","Td"],"board":["Qs","9h","2c","3d"],"villainCards":["As","Qd"],"villainMade":"top pair","draw":"Open-ended straight","drawType":"straight"},{"poolId":"T09","cards":["8h","7h"],"board":["Ah","Kd","4h","3c"],"villainCards":["As","Qc"],"villainMade":"top pair","draw":"Flush","drawType":"flush"},{"poolId":"T12","cards":["Th","9h"],"board":["Jh","7h","Ac","2d"],"villainCards":["Ad","Qc"],"villainMade":"top pair","draw":"Flush + gutshot","drawType":"combo"},{"poolId":"T08D","cards":["Jc","9d"],"board":["Ks","Th","7c","2h"],"villainCards":["Ac","Kd"],"villainMade":"top pair","draw":"Double gutshot","drawType":"straight"},{"poolId":"T04S","cards":["Tc","9d"],"board":["Qh","8s","2c","3d"],"villainCards":["Qs","Qd"],"villainMade":"set of queens","draw":"Gutshot (needs a jack)","drawType":"gutshot"},{"poolId":"T08P","cards":["8h","7h"],"board":["Kh","Kd","4h","2c"],"villainCards":["Qc","Qd"],"villainMade":"two pair, kings and queens","draw":"Flush on a paired board","drawType":"flush"},{"poolId":"T12S","cards":["Qs","Ts"],"board":["Js","6s","Ad","3c"],"villainCards":["Ac","9d"],"villainMade":"top pair","draw":"Flush + gutshot","drawType":"combo"}];
const pool=seeds.map(seed=>scenario(seed,'Count the Outs','pool-'+seed.poolId));
const scenarios=pool.flatMap(s=>['Count the Outs','Estimate Equity'].map((drill,j)=>({...s,drill,id:'equity-pool-'+s.poolId+'-'+j})));
scenarios.push(scenario(legacySeeds[0],'Decide the Call','call-1',{pot:20,bet:10}),scenario(legacySeeds[2],'Decide the Call','call-2',{pot:20,bet:15}),scenario({...legacySeeds[1],board:[...legacySeeds[1].board,'3d']},'Decide the Call','call-3',{pot:30,bet:10}));
// Plan a complete shuffled bag with alternating streets and different adjacent counts.
// Backtracking prevents a greedy last-card dead end; no seed can repeat before exhaustion.
function shuffled(values,rng){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function createRotation({random=Math.random,state=null}={}){
 const byId=new Map(pool.map(s=>[s.poolId,s]));
 const signature=pool.map(s=>s.poolId+':'+s.board.length+':'+s.math.count).join('|');
 let bag=[],last=null;
 function compatible(a,b){return !a||(a.board.length!==b.board.length&&a.math.count!==b.math.count)}
 if(state?.signature===signature&&Array.isArray(state.bag)&&state.bag.every(id=>byId.has(id))&&new Set(state.bag).size===state.bag.length&&(!state.last||byId.has(state.last))){let prev=state.last?byId.get(state.last):null;if(state.bag.every(id=>{const s=byId.get(id),ok=compatible(prev,s);prev=s;return ok})){bag=[...state.bag];last=state.last||null}}
 function plan(){const search=(left,prev)=>{if(!left.length)return [];for(const s of shuffled(left.filter(x=>compatible(prev,x)),random)){const tail=search(left.filter(x=>x.poolId!==s.poolId),s);if(tail)return [s.poolId,...tail]}return null};const result=search(pool,last?byId.get(last):null);if(!result)throw Error('Equity rotation cannot satisfy street/count constraints');return result}
 return {next(drill){if(!bag.length)bag=plan();const id=bag.shift();last=id;const base=byId.get(id);return structuredClone({...base,drill,id:'equity-pool-'+id+'-'+(drill==='Estimate Equity'?1:0)})},snapshot(){return {signature,bag:[...bag],last}}};
}

function gradeEstimate(estimate,rule){const diff=Math.abs(estimate-rule);return diff<=3?1:diff<=6?.5:0}
function grade(s,pick){const m=refresh(s);if(s.drill==='Count the Outs'){const d=Math.abs(pick.outs-m.count),score=d===0?1:d===1?.5:0;return {pick,score,estimateScore:null,verdict:score===1?'Correct':score===.5?'Close':'Mistake'}}const estimateScore=gradeEstimate(pick.estimate,m.rule);if(s.drill==='Estimate Equity')return {pick,score:estimateScore,estimateScore,verdict:estimateScore===1?'Correct':estimateScore===.5?'Close':'Mistake'};const required=s.bet/(s.pot+2*s.bet)*100,ruleCall=m.rule>=required,exactCall=m.equity>=required,borderline=ruleCall!==exactCall,decisionScore=borderline||pick.decision===(exactCall?'Call':'Fold')?1:0,score=(estimateScore+decisionScore)/2;return {pick,score,estimateScore,decisionScore,required,borderline,exactAction:exactCall?'Call':'Fold',verdict:score===1?'Correct':score>0?'Partial credit':'Mistake'}}
const API={deck,rankHand,remaining,enumerate,drawCards,isCleanOut,outCards,analyze,refresh,legacySeeds,seeds,pool,scenarios,createRotation,gradeEstimate,grade};if(typeof module!=='undefined')module.exports=API;else root.EquityMath=API;
})(typeof globalThis!=='undefined'?globalThis:this);

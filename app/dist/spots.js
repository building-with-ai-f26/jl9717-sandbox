/* Pure, data-driven spot engine. No generated poker answers. */
const SpotEngine=(()=>{
 const status=n=>n>=100?'graded':n>=30?'lean':'hidden';
 function sample(s){return s.driverStats?.length?status(Math.min(...s.driverStats.map(d=>d.n))):'hidden'}
 function load(data,profiles){
  if(!Array.isArray(data.spots)||!data.templates)throw Error('Invalid spots data');const ids=new Set();
  for(const s of data.spots){
   if(typeof s.id!=='string'||ids.has(s.id)||!['villain_real','villain_fabricated','baseline'].includes(s.kind)||![4,6].includes(s.tableSize)||!Array.isArray(s.options)||!s.options.length||!Array.isArray(s.heroHand)||s.heroHand.length!==2||!Array.isArray(s.board))throw Error('Invalid spot '+s.id);ids.add(s.id);
   const cards=s.heroHand.concat(s.board);if(new Set(cards).size!==cards.length||cards.some(c=>!/^[2-9TJQKA][shdc]$/.test(c)))throw Error('Invalid cards '+s.id);
   if(!profiles.players[s.villain]||!data.templates[s.template]||!s.exploit?.acceptable?.length||s.exploit.acceptable.some(a=>!s.options.includes(a))||!s.options.includes(s.exploit.best))throw Error('Invalid exploit '+s.id);
   for(const d of s.driverStats){const [name,...path]=d.ref.split('.'),key=path.at(-1),p=Object.entries(profiles.players).find(([n])=>n.toLowerCase()===name)?.[1],stat=p?.stats[key]||p?.sizing[key];if(!stat||stat.n!==d.n||(stat.pct??stat.value)!==(d.value_pct??d.value))throw Error('Stat does not match profile: '+d.ref)}
  }return data;
 }
 function baselineAccepts(s,a){const b=s.baseline;if(!b)return null;if(b.frequencies)return (b.frequencies[a]||0)>=.1;return b.action===a&&(b.freq===undefined||b.freq>=.1)}
 function grade(s,a,mode='exploit'){
  if(!s.options.includes(a))throw Error('Unknown action');const evidence=sample(s),base=baselineAccepts(s,a),exploit=s.exploit.acceptable.includes(a);
  if(evidence==='hidden')return {score:null,classification:'hidden',exploitScore:null,baselineScore:null,status:evidence};
  if(mode==='baseline')return {score:base===null?null:Number(base),classification:base===null?'baseline_unavailable':base?'correct':'baseline_miss',baselineScore:base===null?null:Number(base),exploitScore:null,status:evidence};
  if(evidence==='lean')return {score:null,classification:'lean',exploitScore:null,baselineScore:null,status:evidence};
  // Feature C defines an intentional deviation as matching the exploit, not baseline.
  // Feature D also exempts a baseline-only answer in Both mode. Record either direction explicitly.
  const deviation=mode==='both'&&base!==null&&base!==exploit;
  return {score:deviation?null:Number(exploit),classification:deviation?'intentional_deviation':exploit?'correct':'exploit_miss',deviation:deviation?(exploit?'exploit_over_baseline':'baseline_over_exploit'):null,baselineScore:base===null?null:Number(base),exploitScore:Number(exploit),status:evidence};
 }
 function adapter(s){return {...s,kind:'baseline',tableSize:s.tableSize||6,stackBb:100,rake:0,heroPos:s.hero,villainPos:s.villain,heroHand:s.cards,options:Object.keys(s.frequencies||{}),baseline:{frequencies:s.frequencies,source:s.source}}}
 function createPicker({random=Math.random,recent=[]}={}){let last=recent.slice(-20);return {next(pool,misses=[]){const eligible=pool.filter(s=>sample(s)!=='hidden'&&!last.includes(s.id));if(!eligible.length)return null;const weights=eligible.map(s=>1+Math.min(5,misses.filter(m=>m.spot?.id===s.id).reduce((n,m)=>n+(m.misses||1),0))),total=weights.reduce((a,b)=>a+b,0);let r=random()*total,i=0;for(;i<weights.length-1&&r>=weights[i];i++)r-=weights[i];let s=eligible[i];last.push(s.id);last=last.slice(-20);return structuredClone(s)},snapshot:()=>last.slice()}}
 return {status,sample,load,grade,adapter,createPicker,baselineAccepts};
})();

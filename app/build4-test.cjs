const fs=require('fs'),vm=require('vm'),assert=require('assert');
function boot(root){const listeners={},storage={},container={innerHTML:'',classList:{toggle(){}},querySelector(){return null}},ctx={console,structuredClone,Date,Math,Set,Map,WeakSet,Blob,URL,setTimeout:()=>{},window:{scrollTo(){}},navigator:{},document:{querySelector(){return container},querySelectorAll(){return[]},getElementById(){return null},addEventListener(k,f){(listeners[k]??=[]).push(f)},body:{classList:{toggle(){}},append(){}},createElement(){return{remove(){}}}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},fetch:async p=>({json:async()=>JSON.parse(fs.readFileSync(root+'/dist/'+p))})};vm.createContext(ctx);for(const f of ['equity.js','equity-ui.js','spots.js','notebook.js','exploit-ranges.js','exploit-range-ui.js','villain-ui.js',...(fs.existsSync(root+'/dist/presentation.js')?['presentation.js']:[]),'app.js'])vm.runInContext(fs.readFileSync(root+'/dist/'+f,'utf8'),ctx);return {ctx,storage,container,listeners};}

const current=boot('.');setImmediate(()=>{
 const run=s=>vm.runInContext(s,current.ctx);
 run("settings.tableSize=4;selectedMode=0;filters={};settings.length=10;");
 // Landing CTA uses the real registered click handler.
 const button={disabled:false,dataset:{},hasAttribute:k=>k==='data-landing-start'};
 for(const f of current.listeners.click)f({target:{closest:selector=>selector==='button'?button:null}});
 assert.equal(run('screen'),'session');assert.equal(run('session.total'),10);assert.equal(run('session.current.tableSize'),4);
 assert(current.container.innerHTML.includes('data-answer='));
 for(const n of [0,4,5,7,8,10]){const rows=Array.from({length:10},(_,i)=>({score:i<n?1:0}));current.ctx.rows=rows;const c=run('resultCopy(rows)');assert.equal(c.clear,n>=8);assert.equal(c.heading==='STAGE CLEAR',n>=8);assert(c.text.includes(String(10-n)));if(n<5)assert(!/nicely|clean|stage clear/i.test(c.text))}
 let explanations=0;for(const d of run('allRangeData()'))for(const c of d.cells){current.ctx.spot={kind:'pre',hand:c.hand,hero:d.hero,villain:d.villain,spot:d.spot,tableSize:d.tableSize||6,openSize:d.openSize||2.5,threeSize:d.threeSize||10,frequencies:c.frequencies};const text=run('preflopExplanation(spot)');assert(!/strength tier unavailable|not solver output/i.test(text));assert(text.includes(c.hand));if(d.spot==='RFI')assert.equal(run("actionLabel(spot,'Call')"),'Limp');explanations++}
 for(const c of run('learn')){
  current.ctx.card=c;
  const q=run('quizSpot(card)');
  assert.equal(q.cardId,c.id);
  assert.equal(new Set(q.options).size,4);
  assert(!q.question.startsWith('Which statement matches'));
  assert.equal(run('conceptSpots').find(([id,prompt])=>id===c.id&&prompt===q.question)[2][0],q.options[q.answer]);
 }
 run('charts()');assert.equal((current.container.innerHTML.match(/Baseline ranges are constructed from the stated spec \(four-handed baseline, 2026-11-04\); they are not solver output\./g)||[]).length,1);
 run('showCard(1)');assert(current.container.innerHTML.includes('Practice this: Equity Lab'));
 assert(run('coverageNoticeHTML()').includes('4-handed coverage is partial'));run('settings.tableSize=6');assert(run('coverageNoticeHTML()').includes('4-bet responses'));
 assert(!run("spotDisplayName('defend_vs_wide_3bettor')").includes('_'));
 assert.equal(run("displayGrade('Blunder')"),'Miss');assert.equal(run("displayGrade('Perfect')"),'Perfect');
 for(const s of run('villainData.spots').filter(s=>SpotEngineSafe(s))){current.ctx.spot=s;const html=run('villainDecisionStats(spot)');for(const d of s.driverStats)assert(html.includes('n='+d.n));if(s.whatTigerDid){const verb=/^(check|fold|call|raise|bet)/i.exec(s.whatTigerDid)?.[1],best=s.exploit.best;if(verb==='call'&&best==='fold'||verb==='check'&&best.startsWith('bet_'))assert(run('loggedActionNote(spot)').includes('In the real hand'))}}
 console.log('PASS Build 4: real one-click CTA, result tier boundaries/mistake counts, '+explanations+' reasons, bare concept options, disclosure once, practice link, actual coverage, human labels, visible verdict, decision stats and logged-action mismatch.');
});function SpotEngineSafe(s){return s.driverStats&&s.exploit}

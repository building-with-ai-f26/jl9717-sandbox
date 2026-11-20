const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('dist/data/four-handed-baselines.json'));
const byId=id=>data.find(d=>d.id===id),sb=byId('baseline-4-SB-rfi'),bb=byId('baseline-4-BB-vs-SB-limp'),iso=byId('baseline-4-SB-vs-BB-iso');
const cell=(d,h)=>d.cells.find(c=>c.hand===h),combo=h=>h.length===2?6:h.endsWith('s')?4:12;
assert.deepStrictEqual(Object.keys(sb.targets),['Raise','Limp','Fold']);
assert.deepStrictEqual(Object.fromEntries(Object.keys(sb.targets).map(a=>[a,sb.cells.reduce((n,c)=>n+combo(c.hand)*c.frequencies[a],0)])),{Raise:258,Limp:652,Fold:416});
for(const [a,target] of Object.entries({Raise:21,Limp:48,Fold:31}))assert(Math.abs(sb.targets[a]-target)<=2);
for(const h of ['AA','KK','AKs','87s','76s','65s','K9o'])assert.equal(cell(sb,h).action,'Limp',h);
assert.equal(cell(sb,'KTo').action,'Raise');assert(!iso.eligible.includes('KTo'));
assert(iso.eligible.every(h=>cell(sb,h).action==='Limp'));for(const h of ['87s','76s','65s','K9o'])assert.equal(cell(iso,h).action,'Call',h);
for(const h of ['AA','KK','AKs','A3o'])assert.equal(cell(iso,h).action,'Raise',h);
assert(bb.cells.every(c=>['Raise','Check'].includes(c.action)));assert(Math.abs(bb.targets.Raise-15)<2);
assert(!fs.existsSync('dist/four-handed-charts.js')&&!fs.existsSync('dist/data/four-handed-reference.json'));
for(const f of ['dist/app.js','dist/index.html','dist/sw.js'])assert(!/chartLibrary|referenceCharts|four-handed-reference|Published 4-max reference|raked/i.test(fs.readFileSync(f,'utf8')),f);
const stored={'gtoTrainer.progress.v1':'[{"at":123,"kind":"pre","position":"BTN","score":0.5,"spot":"RFI"}]','gtoTrainer.mistakes.v1':'[]'},before=JSON.stringify(stored),listeners={},app={innerHTML:'',remove(){},classList:{toggle(){}}};
const ctx={console,structuredClone,Date,Math,Set,Map,Blob,URL,setTimeout:()=>{},window:{scrollTo(){}},navigator:{},document:{querySelector:s=>['.modal','.toast'].includes(s)?null:app,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:(k,fn)=>(listeners[k]??=[]).push(fn),body:{classList:{toggle(){}},append(){}},createElement:()=>({remove(){}})},localStorage:{getItem:k=>stored[k]??null,setItem:(k,v)=>stored[k]=v},fetch:async p=>({json:async()=>JSON.parse(fs.readFileSync('dist/'+p))})};vm.createContext(ctx);for(const f of ['equity.js','equity-ui.js','spots.js','notebook.js','exploit-ranges.js','exploit-range-ui.js','villain-ui.js','presentation.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
setImmediate(async()=>{for(const [k,v] of Object.entries(JSON.parse(before)))assert.equal(stored[k],v,'boot preserves existing storage byte-for-byte');ctx.keydown=listeners.keydown[0];await vm.runInContext(`(async()=>{
 const assert=(x,m)=>{if(!x)throw Error(m)};
 settings.tableSize=4;selectedMode=1;filters={choice:'SB'};assert(eligibleDatasets().length===2,'SB includes first-in and iso response');setup();assert(app.innerHTML.includes('vs BB iso-raise'),'SB selector');
 filters={choice:'BB'};assert(eligibleDatasets().length===4,'BB three opens plus limp');setup();assert(app.innerHTML.includes('vs SB limp'),'BB selector');
 filters.matchup='BB|SB|Facing a Limp';assert(eligibleDatasets().length===1&&eligibleDatasets()[0].spot==='Facing a Limp','limp filter');
 selectedMode=0;filters={};const ds=eligibleDatasets();assert(ds.length===10&&ds.some(d=>d.spot==='Facing a Limp')&&ds.some(d=>d.spot==='SB vs BB iso-raise'),'Quick pool includes new nodes');
 const make=(id,hand)=>{const d=fourHandedBaselines.find(x=>x.id===id),c=d.cells.find(x=>x.hand===hand),s={...preSpot([d]),hand,cards:handCards(hand),frequencies:c.frequencies};session={index:0,total:10,current:s,feedback:null,used:new Set(),answers:[],size:d.betSizes[0]};screen='session';return s};
 let s=make('baseline-4-SB-rfi','AA');renderSession();assert(app.innerHTML.includes('data-answer="Limp"')&&!app.innerHTML.includes('data-answer="Call"'),'Limp distinct action');keydown({key:'c',target:{tagName:'BODY'}});assert(session.feedback.score===1&&session.feedback.reason.includes('limps AA'),'C limps trap correctly');
 s=make('baseline-4-BB-vs-SB-limp','72o');renderSession();assert(app.innerHTML.includes('data-answer="Check"')&&!app.innerHTML.includes('data-answer="Fold"')&&!app.innerHTML.includes('data-answer="Call"'),'no fold/call against limp');keydown({key:'f',target:{tagName:'BODY'}});assert(!session.feedback,'F never folds against limp');keydown({key:'c',target:{tagName:'BODY'}});assert(session.feedback.score===1&&session.feedback.reason.includes('checks 72o'),'C checks for free');
 s=make('baseline-4-SB-vs-BB-iso','K9o');renderSession();assert(app.innerHTML.includes('Limp-call')&&app.innerHTML.includes('Limp-raise')&&app.innerHTML.includes('Iso-raised 4bb')&&app.innerHTML.includes('Pot 5.0bb'),'iso actions and pot');answer('Call');assert(session.feedback.score===1,'K9o limp-call');
 s=make('baseline-4-SB-vs-BB-iso','A3o');answer('Raise');assert(session.feedback.score===1,'A3o limp-raise');
 // New-node solver override and restoration, including eligible node and new action validation.
 for(const id of ['baseline-4-SB-rfi','baseline-4-BB-vs-SB-limp','baseline-4-SB-vs-BB-iso']){const d=structuredClone(fourHandedBaselines.find(x=>x.id===id));d.source='TEST ONLY';const v=validateRanges({ranges:[d]}).ranges[0];await importRanges({text:async()=>JSON.stringify({ranges:[d]})});assert(rangesFor().find(x=>rangeNode(x)===rangeNode(d)).label==='Imported solver export','new node overridden');removeRangeImport(v.id);assert(rangesFor().find(x=>rangeNode(x)===rangeNode(d)).id===id,'new node restored')}
 assert(progress[0].at===123&&progress[0].score===.5,'legacy record retained');
})()`,ctx);console.log('PASS no-rake v2: exact SB combos/assignments; reachable limp response; BB never folds; new actions/keyboard/pots; both position filters and Quick pool; all three node imports restore; pre-existing storage preserved.');});

// v25: Study Plan composition/lifecycle, session log, review snapshots, export/import. Run: node v25-test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const storage={},failKeys=new Set();
const stub=()=>({innerHTML:'',textContent:'',value:'8',classList:{toggle(){}},querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},reportValidity:()=>true,remove(){},click(){},focus(){},setAttribute(){},getAttribute(){return null}});
const container=stub();
const ctx={console,structuredClone,Date,Math,Set,Map,WeakSet,Blob,URL,assert,confirm:()=>true,setTimeout:()=>{},window:{scrollTo(){}},navigator:{},document:{querySelector(){return container},querySelectorAll(){return[]},getElementById(){return null},addEventListener(){},body:{classList:{toggle(){}},append(){}},createElement(){return stub()}},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{if(failKeys.has(k)){failKeys.delete(k);throw Error('quota')}storage[k]=v}},fetch:async p=>({json:async()=>JSON.parse(fs.readFileSync(__dirname+'/dist/'+p))})};
ctx.storage=storage;ctx.failKeys=failKeys;ctx.container=container;vm.createContext(ctx);
const files=fs.readFileSync(__dirname+'/dist/index.html','utf8').match(/<script src="([^"]+)" defer>/g).map(x=>x.match(/src="([^"]+)"/)[1]);
assert(files.indexOf('study-plan.js')>0&&files.indexOf('study-plan.js')<files.indexOf('app.js'),'study-plan.js loads before app.js');
for(const f of files)vm.runInContext(fs.readFileSync(__dirname+'/dist/'+f,'utf8'),ctx);
assert(fs.readFileSync(__dirname+'/dist/sw.js','utf8').includes('"study-plan.js"'),'service worker lists study-plan.js');
setTimeout(()=>{vm.runInContext(`
const events=[];window.posthog={capture:(event,properties)=>events.push({event,properties})};
const best=s=>{for(const p of (s.kind==='post'?(s.bet?['Fold','Call','Raise']:['Check','Bet']):preflopActions(s)))if(evaluate(s,p,sizing(s)[0]).score===1)return p;return preflopActions(s)[0]};
const worst=s=>{for(const p of (s.kind==='post'?(s.bet?['Fold','Call','Raise']:['Check','Bet']):preflopActions(s)))if(evaluate(s,p,sizing(s)[0]).score===0)return p;return null};
function play(right=true){const s=session.current;if(s.kind?.startsWith('villain_'))answerVillain(right?s.exploit.best:s.options.find(o=>!s.exploit.acceptable.includes(o))||s.options[0]);else if(s.kind==='equity'){container.value=String(right?(s.drill==='Count the Outs'?EquityMath.refresh(s).count:EquityMath.refresh(s).rule):99);submitEquity('Call')}else if(s.kind==='quiz')answer(right?s.answer:(s.answer+1)%s.options.length);else answer(right?best(s):(worst(s)||best(s)))}
const runOk=items=>{for(let i=2;i<items.length;i++)if(items[i].pool===items[i-1].pool&&items[i].pool===items[i-2].pool)return false;return true};
const count=(p,k)=>p.items.filter(i=>i.pool===k).length;
const keyOf=i=>i.ref.mistakeId||i.ref.dataset&&i.ref.dataset+':'+i.ref.hand||i.ref.id||i.ref.cardId!==undefined&&'quiz:'+i.ref.cardId||null;

// 1. New user: Starter plan made of Quick Drill spots.
assert.equal(settings.tableSize,4);
let plan=todaysPlan();
assert(plan.starter&&plan.items.length===10&&plan.items.every(i=>i.pool==='Q'&&i.kind==='pre'),'starter plan');
assert.equal(plan.date,day()+':4');assert.deepEqual(JSON.parse(storage['gtoTrainer.studyPlan.v1']).items,plan.items);
assert(studyPlanCardHTML().includes('Starter plan · 10 decisions')&&studyPlanCardHTML().includes('data-plan-rebuild')&&!studyPlanCardHTML().includes('data-mode='));
assert.deepEqual([...familyMenuHTML().matchAll(/data-mode="(\\d+)"/g)].map(x=>+x[1]),[6,4,0,1,2,5,10,3,9,8,7],'mode ids untouched');

// 2. A normal Quick Drill session is logged and reviewable; existing behavior intact.
selectedMode=0;filters={};start();
for(let i=0;i<10;i++){play(false);advance()}
assert.equal(screen,'results');assert.equal(progress.length,10);
let log=JSON.parse(storage['gtoTrainer.sessionLog.v1']);
assert(log.length===1&&log[0].modeLabel==='Quick Drill'&&log[0].partial===false&&log[0].tableSize===4&&log[0].answers.length===10&&typeof log[0].id==='string'&&!isNaN(new Date(log[0].dateISO)));
for(const a of log[0].answers)assert(a.id&&a.kind==='pre'&&a.cards.length===2&&a.options.length>=2&&a.pick&&typeof a.score==='number'&&a.grade&&a.explanation&&a.frequencies.length&&a.ref.dataset,'snapshot fields');
assert(container.innerHTML.includes('Review hands')&&container.innerHTML.includes('data-review-row="9"'));
summary();assert.equal(JSON.parse(storage['gtoTrainer.sessionLog.v1']).length,1,'re-render does not log twice');
const queued=mistakes.length;assert(queued>=4,'mistakes queued '+queued);

// 3. Composition with mistakes, leaks and quiz history.
const now=Date.now();
for(let i=0;i<25;i++)progress.push({at:now,tableSize:4,kind:'pre',position:'BTN',spot:'RFI',mode:'Quick Drill',score:i<5?1:0,hand:'x'});
for(let i=0;i<25;i++)progress.push({at:now,tableSize:4,kind:'post',position:'BB',spot:'Facing a Bet',mode:'Postflop Trainer',score:i<10?1:0,hand:'P1-0'});
for(let i=0;i<30;i++)progress.push({at:now,tableSize:4,kind:'villain',position:'CO',spot:'big_open_defense',mode:'Villain Study',score:0,hand:'v'});
progress.push({at:now,tableSize:4,kind:'quiz',position:'Concepts',spot:'Concept Quiz',mode:'Concept Quiz',score:0,hand:'quiz-18-0.5'},{at:now,tableSize:4,kind:'quiz',position:'Concepts',spot:'Concept Quiz',mode:'Concept Quiz',score:1,hand:'quiz-0-0.5'});
const leakNames=planLeaks().map(x=>x.name);assert.equal(leakNames[0],'big_open_defense');assert.equal(planGenerator('big_open_defense'),null,'villain template has no listed generator: skipped');
for(const [len,N] of [[10,10],['endless',15],[20,20]]){
 settings.length=len;rebuildStudyPlan();plan=planStore();const cap=Math.floor(N*.4),A=Math.min(cap,queued);
 assert(!plan.starter&&plan.items.length===N,'length '+N);assert.equal(count(plan,'A'),A);assert.equal(count(plan,'B'),cap+(cap-A));assert.equal(count(plan,'C'),N-count(plan,'A')-count(plan,'B'));assert.equal(count(plan,'Q'),0);
 assert(runOk(plan.items),'no more than two in a row from one pool');
 const keys=plan.items.map(keyOf).filter(Boolean);assert.equal(new Set(keys).size,keys.length,'no repeated spot or question');
 assert.deepEqual(plan.items.filter(i=>i.pool==='A').map(i=>i.ref.mistakeId),mistakes.slice(0,A).map(m=>m.id),'oldest mistakes first, order kept');
 const cats=new Set(plan.items.filter(i=>i.pool==='B').map(i=>i.cat));assert(cats.size===2&&[...cats].every(c=>leakNames.slice(1,4).includes(c)),'two worst leak categories with a generator: '+[...cats]);
 const c=plan.items.filter(i=>i.pool==='C').map(i=>i.ref.cardId);assert(c.every(id=>id!==18&&id!==0),'never-attempted concepts come first');
}
for(let t=0;t<300;t++){const g={A:Array.from({length:Math.floor(Math.random()*9)},()=>({pool:'A'})),B:Array.from({length:Math.floor(Math.random()*9)},()=>({pool:'B'})),C:Array.from({length:Math.floor(Math.random()*9)},()=>({pool:'C'})),Q:[]},out=planInterleave(g),n=[g.A.length,g.B.length,g.C.length],max=Math.max(...n),sum=n[0]+n[1]+n[2];assert.equal(out.length,sum);if(max<=2*(sum-max+1))assert(runOk(out),'interleave '+n)}
settings.length=10;rebuildStudyPlan();plan=planStore();

// 4. Play the plan through the real handlers.
events.length=0;const dailyBefore=storage['gtoTrainer.daily.v1'],before=progress.length,firstA=plan.items.find(i=>i.pool==='A').ref.mistakeId;
container.innerHTML='';startStudyPlan();
assert(!planStore().started===false&&!studyPlanCardHTML().includes('data-plan-rebuild'),'no rebuild once started');
rebuildStudyPlan();assert.equal(planStore(),plan,'rebuild refused after start');
assert(container.innerHTML.includes('Study Plan · item 1 of 10'));
let scored=0;const pools=[];
for(let i=0;i<10;i++){const item=plan.items[i];pools.push(item.pool);assert.equal(session.index,i);
 if(item.pool==='A'){assert.equal(selectedMode,4);assert.equal(session.reviewId,item.ref.mistakeId)}
 if(item.pool==='C')assert(session.current.kind==='quiz'&&session.current.id.startsWith('quiz-'+item.ref.cardId+'-'));
 play(true);if(session.feedback.score!==null)scored++;
 assert(container.innerHTML.includes(item.pool==='A'?'From your mistake queue':item.pool==='B'?'Leak drill: ':'Concept review'),'source line '+item.pool);
 assert.equal(JSON.parse(storage['gtoTrainer.studyPlan.v1']).done,i+1);advance()}
assert.equal(screen,'results');assert(planStore().completed&&planStore().done===10);
assert.equal(progress.length,before+scored);assert.equal(storage['gtoTrainer.daily.v1'],dailyBefore,'plan answers never touch Daily Hand');
assert.equal(mistakes.find(m=>m.id===firstA).consecutive,1,'pool A follows mistake-review rules');
const modesUsed=new Set(progress.slice(before).map(r=>r.mode));assert(modesUsed.has('Mistake Review')&&modesUsed.has('Concept Quiz'),'rows keep their home mode');
assert.deepEqual(events.filter(e=>e.event==='mode_selected'),[{event:'mode_selected',properties:{mode:'Study Plan'}}]);
assert.deepEqual(events.filter(e=>e.event==='drill_completed'),[{event:'drill_completed',properties:{mode:'Study Plan'}}]);
assert.equal(events.filter(e=>e.event==='drill_answered').length,scored);assert(events.every(e=>['mode_selected','drill_answered','drill_completed'].includes(e.event)),'no new event names');
assert(container.innerHTML.includes('by source')&&container.innerHTML.includes('Mistake review')&&container.innerHTML.includes('Leak drills')&&container.innerHTML.includes('Concepts')&&container.innerHTML.includes('Review hands'));
assert(studyPlanCardHTML().includes('Done today')&&studyPlanCardHTML().includes('data-mascot-state="sleep"'));
log=JSON.parse(storage['gtoTrainer.sessionLog.v1']);assert(log.length===2&&log[1].modeLabel==='Study Plan'&&log[1].answers.length===10&&!log[1].partial);
events.length=0;startStudyPlan();assert.equal(screen,'results');assert.equal(events.length,0,'viewing finished results fires nothing');assert.equal(JSON.parse(storage['gtoTrainer.sessionLog.v1']).length,2);

// 5. Second pass on the same queue retires a pool A mistake after 2 consecutive correct (new day).
const realDay=day;planCache.date='2000-01-01:4';savePlan();plan=todaysPlan();assert(plan.date===day()+':4'&&plan.done===0&&!plan.started,'new calendar day builds a new plan');
if(plan.items.some(i=>i.ref.mistakeId===firstA)){startStudyPlan();while(screen==='session'){play(true);advance()}assert(!mistakes.some(m=>m.id===firstA),'retired after two consecutive correct')}

// 6. Save & quit mid-plan, resume at the first unanswered item; per-table-size plans coexist.
settings.tableSize=6;events.length=0;let six=todaysPlan();assert(six.date===day()&&six.alt&&six.alt.date===day()+':4','4-handed plan parked');
startStudyPlan();for(let i=0;i<3;i++){play(i>0);advance()}
logSession(true);session=null;
log=JSON.parse(storage['gtoTrainer.sessionLog.v1']);assert(log.at(-1).partial===true&&log.at(-1).answers.length===3&&log.at(-1).tableSize===6);
assert(studyPlanCardHTML().includes('3 of '+six.items.length+' done'));
startStudyPlan();assert.equal(session.index,3);assert(container.innerHTML.includes('Study Plan · item 4 of '));assert.equal(events.filter(e=>e.event==='mode_selected').length,1,'mode_selected once per plan');
session=null;settings.tableSize=4;assert.equal(todaysPlan().date,day()+':4');assert.equal(todaysPlan().alt.done,3);

// 7. Review cards re-render from the snapshot alone, for every kind, and escape everything.
const all=JSON.parse(storage['gtoTrainer.sessionLog.v1']).flatMap(e=>e.answers),kinds=new Set(all.map(a=>a.kind));
selectedMode=10;filters={grading:'exploit'};start();for(let i=0;i<10&&screen==='session';i++){play(i%2===0);advance()}
selectedMode=9;filters={choice:'All Drills'};start();for(let i=0;i<10&&screen==='session';i++){play(i%2===0);advance()}
selectedMode=3;filters={choice:'Facing a Bet'};start();for(let i=0;i<10&&screen==='session';i++){play(i%2===0);advance()}
const full=JSON.parse(storage['gtoTrainer.sessionLog.v1']).flatMap(e=>e.answers);for(const k of ['pre','post','quiz','equity','villain'])assert(full.some(a=>a.kind===k),'logged kind '+k);
const gradeSpy=SpotEngine.grade,evalSpy=evaluate,eqSpy=EquityMath.grade;let graded=0;SpotEngine.grade=(...a)=>{graded++;return gradeSpy(...a)};EquityMath.grade=(...a)=>{graded++;return eqSpy(...a)};
for(const [i,a] of full.entries()){const html=reviewCardHTML(a,i);assert(html.includes('class="verdict')&&html.includes('data-drill-again="'+i+'"')&&!html.includes('could not be displayed'),'card '+a.kind);
 if(a.kind==='villain')assert(html.includes('Exploit vs ')&&html.includes('driver-stats')&&a.exploit.why&&a.exploit.rule&&a.driverStats.length);
 if(a.kind==='pre'||a.kind==='post')assert(html.includes('class="freq"')&&html.includes('Your pick: '+a.pickRaw));
 if(a.kind==='equity')assert(html.includes('equity-figures')&&html.includes('Exact (enumerated)'));
 if(a.kind==='quiz')assert(html.includes('Your pick')&&html.includes(esc(a.correct)))}
assert.equal(graded,0,'review never re-runs grading');SpotEngine.grade=gradeSpy;EquityMath.grade=eqSpy;
const evil={kind:'pre',label:'<img src=x onerror=1>',pick:'<b>',grade:'<i>',score:1,verdict:'<script>',explanation:'<script>alert(1)</script>',cards:['<x>','As'],frequencies:[['<Raise>',.5]],pickRaw:'"x',freqReadout:'<u>',view:[['verdict'],['freq'],['expl'],['p','<p>'],['src','<s>'],['stats'],['villain'],['figs',[['<a>','<b>']]]],driverStats:[{status:'"><x',label:'<l>',text:'<t>'}]};
const evilHTML=reviewListHTML([evil],'t')+reviewCardHTML(evil,0);assert(!/<(img|script|b|i|u|x|s|l|t|a)[ >]/.test(evilHTML.replace(/<(\\/?)(section|div|span|button|p|h3|strong|svg|path)\\b[^>]*>/g,'')),'imported snapshot text is escaped');
assert(reviewCardHTML({kind:'pre',view:'nope',cards:5},0).includes('review-card'));

// 8. Drill this spot again: one-spot session, new decision, logged session untouched.
for(const k of ['pre','post','quiz','equity','villain']){const a=full.find(a=>a.kind===k&&(k!=='villain'||a.score!==null)),logBefore=storage['gtoTrainer.sessionLog.v1'],n=progress.length;
 drillSpotAgain(a);assert(screen==='session'&&session.total===1&&session.current.id===a.id,'again '+k);play(true);assert.equal(progress.length,n+1,'recorded as a new decision '+k);advance();assert.equal(screen,'results');
 const after=JSON.parse(storage['gtoTrainer.sessionLog.v1']);assert.equal(JSON.stringify(after.slice(0,-1)),JSON.stringify(JSON.parse(logBefore)),'earlier log entries never edited');assert.equal(after.at(-1).answers.length,1)}

// 9. Cap of 50, quota fallback, silent failure.
logCache=Array.from({length:60},(_,i)=>({id:'f'+i,dateISO:new Date().toISOString(),modeLabel:'Quick Drill',tableSize:4,partial:false,answers:[{kind:'pre',score:1}]}));
selectedMode=0;filters={};start();play(true);logSession(true);session=null;log=JSON.parse(storage['gtoTrainer.sessionLog.v1']);assert(log.length===50&&log[0].id==='f11'&&log.at(-1).partial===true,'50 most recent kept');
failKeys.add('gtoTrainer.sessionLog.v1');start();play(true);logSession(true);session=null;log=JSON.parse(storage['gtoTrainer.sessionLog.v1']);assert(log.length===25,'quota: oldest dropped, one retry');
const frozen=storage['gtoTrainer.sessionLog.v1'];localStorage.setItem=(k,v)=>{if(k==='gtoTrainer.sessionLog.v1')throw Error('quota');storage[k]=v};start();play(true);advance();assert.equal(storage['gtoTrainer.sessionLog.v1'],frozen);assert.equal(session.feedback,null,'drilling continues when the log cannot be written');session=null;
localStorage.setItem=(k,v)=>{storage[k]=v};

// 10. Progress page, session review screen, export and import.
showProgress();assert(container.innerHTML.includes('Recent sessions')&&container.innerHTML.includes('data-session-review=')&&container.innerHTML.includes('partial')&&container.innerHTML.includes('data-study-plan'));
reviewSessionId=logStore().at(-1).id;go('sessionReview');assert(container.innerHTML.includes('Session review')&&container.innerHTML.includes('data-review-row="0"'));
const backup=JSON.parse(JSON.stringify({version:1,progress,mistakes,villainProgress,...exportExtras()}));assert(Array.isArray(backup.sessionLog)&&backup.studyPlan.date);
(async()=>{
 const keep=storage['gtoTrainer.sessionLog.v1'];const old={version:1,progress:backup.progress,mistakes:backup.mistakes};
 await importProgress({text:async()=>JSON.stringify(old)});assert.equal(storage['gtoTrainer.sessionLog.v1'],keep,'older backup imports cleanly; log kept');assert(container.textContent.includes('contained no session log'));
 logCache=[];saveLog();planCache=null;delete storage['gtoTrainer.studyPlan.v1'];
 await importProgress({text:async()=>JSON.stringify(backup)});assert.equal(JSON.parse(storage['gtoTrainer.sessionLog.v1']).length,backup.sessionLog.length);assert.equal(JSON.parse(storage['gtoTrainer.studyPlan.v1']).date,backup.studyPlan.date);assert(container.textContent.includes('Session log restored'));
 console.log('PASS v25: starter plan; 40/40/remainder composition with shortfall flow at 10/15/20; two-in-a-row rule; uniqueness; real-handler plan run (records, mistake rules, Daily untouched, exact analytics payloads); resume; per-table plans; session log shape, partial, cap 50, quota fallback; snapshot review for 5 kinds without regrading; escaping; drill-again; export/import with and without session log.');
})().catch(e=>{console.error(e);process.exitCode=1});
`,ctx)},50);

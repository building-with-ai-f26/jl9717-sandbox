/* v25 · Study Plan (Part 1) and per-hand Session Review (Part 2).
   Additive only: no grading, frequency, acceptable-answer, or content changes.
   Loaded before app.js like the other feature files; app.js calls in through ext().
   New storage keys: gtoTrainer.studyPlan.v1, gtoTrainer.sessionLog.v1. */
let planCache,logCache,reviewSets={},reviewSessionId=null,showAllSessions=false;
const planPoolNames={A:'Mistake review',B:'Leak drills',C:'Concepts',Q:'Quick Drill'};
const planPreSpots=['RFI','Facing an Open','Facing a 3-Bet','Facing a 4-Bet','Facing a Limp','SB vs BB iso-raise'],planPostSpots=['Facing a Bet','C-Bet or Check','River Decisions'];
const planKind=k=>String(k||'').startsWith('villain')?'villain':k;
const reviewCardOk=c=>typeof c==='string'&&/^[2-9TJQKA][shdc]$/.test(c);

/* ---------- storage ---------- */
function validPlan(p){return !!p&&typeof p==='object'&&typeof p.date==='string'&&Array.isArray(p.items)&&Number.isFinite(p.done)&&p.items.every(i=>i&&typeof i.kind==='string'&&i.ref&&typeof i.ref==='object'&&['A','B','C','Q'].includes(i.pool))}
function planStore(){if(planCache===undefined){const p=read('studyPlan',null);planCache=validPlan(p)?p:null}return planCache}
function savePlan(){if(planCache)write('studyPlan',planCache)}
function validLogEntry(e){return !!e&&typeof e==='object'&&typeof e.id==='string'&&typeof e.dateISO==='string'&&Array.isArray(e.answers)&&e.answers.every(a=>a&&typeof a==='object'&&typeof a.kind==='string')}
function logStore(){if(!logCache){const v=read('sessionLog',[]);logCache=Array.isArray(v)?v.filter(validLogEntry):[]}return logCache}
// Quota rule from the spec: drop the oldest entries, retry once, then continue silently.
function saveLog(){const put=()=>localStorage.setItem(K.sessionLog,JSON.stringify(logCache));try{put()}catch{try{logCache.splice(0,Math.max(1,Math.ceil(logCache.length/2)));put()}catch{}}}

/* ---------- Part 1: composition ---------- */
function planDayKey(){return settings.tableSize===6?day():day()+':4'}
function planLength(){const n=Number(settings.length);return n===10||n===20?n:15}
function planLeaks(){return aggregate('spot').concat(positionBreakdown()).filter(x=>x.n>=20).sort((a,b)=>a.score-b.score)}
function planPositionRanges(seat){const four=settings.tableSize===4;return rangesFor().filter(d=>d.hero===seat&&(four?seat==='BB'?['Facing an Open','Facing a Limp'].includes(d.spot):seat==='SB'?['RFI','SB vs BB iso-raise'].includes(d.spot):d.spot==='RFI':seat==='BB'?d.spot==='Facing an Open':d.spot==='RFI'))}
// Maps a Progress-page leak category to the existing drill generator for it. null = no generator.
function planGenerator(name){
 if(planPreSpots.includes(name)){const ds=rangesFor().filter(d=>d.spot===name);return ds.length?{type:'pre',mode:2,ds}:null}
 if(seatsFor(settings.tableSize).includes(name)){const ds=planPositionRanges(name);return ds.length?{type:'pre',mode:1,ds}:null}
 if(planPostSpots.includes(name))return {type:'post',mode:3,pack:planPostSpots.indexOf(name)};
 if(name==='Equity Lab')return {type:'equity',mode:9};
 if(name==='Concept Quiz')return {type:'quiz',mode:7};
 return null;
}
function planDrawPre(ds,used,i){
 const sequence=['boundary','clear','boundary','trap','clear','boundary','clear','boundary','trap','boundary'],pool=[];
 for(const d of ds)for(const c of d.cells){if(d.eligible&&!d.eligible.includes(c.hand))continue;const id=d.id+':'+c.hand;if(!used.has(id))pool.push({id,d,c,type:c.classification||classify(d,c)})}
 if(!pool.length)return null;const typed=pool.filter(p=>p.type===sequence[i%10]),p=rand(typed.length?typed:pool);used.add(p.id);
 return {kind:'pre',ref:{dataset:p.d.id,hand:p.c.hand}};
}
// Never-attempted cards first (notes order), then cards from the lowest-scoring groups.
function planQuizOrder(){
 const by={};for(const r of progress)if(r.kind==='quiz'){const m=/^quiz-(\d+)-/.exec(String(r.hand||''));if(m)(by[m[1]]??=[]).push(r.score)}
 const groupScore=g=>{const s=learn.filter(c=>c.group===g).flatMap(c=>by[c.id]||[]);return s.length?s.reduce((a,b)=>a+b,0)/s.length:Infinity};
 const fresh=learn.filter(c=>!by[c.id]),groups=[...new Set(learn.map(c=>c.group))].map((g,i)=>({g,i,score:groupScore(g)})).sort((a,b)=>a.score-b.score||a.i-b.i);
 return {cards:fresh.concat(groups.flatMap(x=>learn.filter(c=>c.group===x.g&&by[c.id]))),hasHistory:Object.keys(by).length>0};
}
function planDrawQuiz(order,used){const c=order.find(c=>!used.has('quiz:'+c.id));if(!c)return null;used.add('quiz:'+c.id);return {kind:'quiz',ref:{cardId:c.id}}}
// One fixed rule: never more than 2 items from the same pool in a row (when the mix allows it).
function planInterleave(groups){
 const q={};for(const k of Object.keys(groups))q[k]=groups[k].slice();
 const out=[],left=()=>Object.keys(q).filter(k=>q[k].length);let runPool=null,run=0;
 const feasible=()=>{const ks=left(),total=ks.reduce((n,k)=>n+q[k].length,0);return ks.every(k=>q[k].length<=2*(total-q[k].length+1)-(k===runPool?run:0))};
 while(left().length){
  let cands=left().filter(k=>!(k===runPool&&run>=2));if(!cands.length)cands=left();
  const order=cands.map(k=>({k,w:Math.random()*q[k].length})).sort((a,b)=>b.w-a.w).map(x=>x.k);let pick=null;
  for(const k of order){const item=q[k].shift(),prev=[runPool,run];run=k===runPool?run+1:1;runPool=k;if(feasible()){pick=item;break}q[k].unshift(item);[runPool,run]=prev}
  if(!pick){const k=cands.slice().sort((a,b)=>q[b].length-q[a].length)[0];pick=q[k].shift();run=k===runPool?run+1:1;runPool=k}
  out.push(pick);
 }
 return out;
}
function generateStudyPlan(date){
 const N=planLength(),used=new Set(),cap=Math.floor(N*.4),groups={A:[],B:[],C:[],Q:[]};
 const queue=mistakes.filter(m=>m&&m.spot&&rowSize(m.spot)===settings.tableSize&&(m.spot.kind!=='pre'||rowSize(m.spot)===6||rangesFor(4).some(d=>d.id===m.spot.dataset)));
 const leaks=planLeaks().map(x=>({name:x.name,gen:planGenerator(x.name)})).filter(x=>x.gen).slice(0,2),quiz=planQuizOrder();
 const starter=!queue.length&&!leaks.length&&!quiz.hasHistory&&!progress.some(p=>rowSize(p)===settings.tableSize);
 if(!starter){
  // Pool A: mistake queue, oldest first, up to 40%.
  for(const m of queue.slice(0,cap)){used.add(m.spot.id);groups.A.push({kind:planKind(m.spot.kind),ref:{mistakeId:m.id},pool:'A',mode:4})}
  // Pool B: the two worst leak categories that have a generator; A's shortfall flows here.
  const targetB=cap+(cap-groups.A.length);let active=leaks.slice(),turn=0;
  while(groups.B.length<targetB&&active.length){
   const leak=active[turn%active.length],g=leak.gen;let item=null;
   if(g.type==='pre')item=planDrawPre(g.ds,used,groups.B.length);
   else if(g.type==='post'){const s=packs[g.pack].filter(s=>!used.has(s.id));if(s.length){const p=rand(s);used.add(p.id);item={kind:'post',ref:{id:p.id}}}}
   else if(g.type==='equity')item={kind:'equity',ref:{drill:'All Drills'}};
   else if(g.type==='quiz')item=planDrawQuiz(quiz.cards,used);
   if(item){groups.B.push({...item,pool:'B',mode:g.mode,cat:leak.name});turn++}else active=active.filter(x=>x!==leak);
  }
  // Pool C: concepts take the remainder, including any shortfall from A and B.
  while(groups.A.length+groups.B.length+groups.C.length<N){const item=planDrawQuiz(quiz.cards,used);if(!item)break;groups.C.push({...item,pool:'C',mode:7})}
 }
 // Final fallback (and the whole Starter plan): Quick Drill spots.
 const all=rangesFor();while(groups.A.length+groups.B.length+groups.C.length+groups.Q.length<N){const item=planDrawPre(all,used,groups.Q.length);if(!item)break;groups.Q.push({...item,pool:'Q',mode:0})}
 return {date,items:planInterleave(groups),done:0,completed:false,started:false,starter,tableSize:settings.tableSize};
}
// One plan per calendar day and table size. The other table size's same-day plan is parked under alt.
function todaysPlan(){
 const key=planDayKey(),p=planStore();if(p&&p.date===key)return p;
 const today=day(),strip=x=>{if(!x)return null;const {alt,...rest}=x;return rest},keep=p&&String(p.date).startsWith(today)?strip(p):null;
 planCache=p?.alt?.date===key?{...p.alt}:generateStudyPlan(key);if(keep)planCache.alt=keep;else delete planCache.alt;
 savePlan();return planCache;
}
function planSummaryText(plan){
 if(plan.starter)return 'Quick Drill warm-up while your data builds';
 const n=k=>plan.items.filter(i=>i.pool===k).length,parts=[];
 if(n('A'))parts.push(n('A')+' review');if(n('B'))parts.push(n('B')+(n('B')===1?' leak drill':' leak drills'));if(n('C'))parts.push(n('C')+(n('C')===1?' concept':' concepts'));if(n('Q'))parts.push(n('Q')+' warm-up');
 return parts.join(' · ');
}
function planStateText(plan){const n=plan.items.length;return plan.completed?'✓ Done today':plan.started?`${plan.done} of ${n} done`:`${plan.starter?'Starter plan':'Today’s plan'} · ${countLabel(n,'decision')}`}

/* ---------- Part 1: entry points ---------- */
function studyPlanCardHTML(){
 let plan;try{plan=todaysPlan()}catch{return ''}if(!plan)return '';const n=plan.items.length;
 return `<div class="plan-card-wrap"><button class="mode plan-card ${plan.completed?'mode-done':''}" data-study-plan ${n?'':'disabled'}><h3>Study Plan</h3><p>One session built from your own data: missed spots, biggest leaks, weakest concepts.</p>${n?`<span class="mode-state ${plan.completed?'check-good':''}">${planStateText(plan)}</span><span class="source">${plan.completed?'Tap to see today’s results':plan.started?'Tap to pick up where you left off':esc(planSummaryText(plan))}</span>${plan.completed?mascotHTML('sleep','empty'):''}`:`<span class="mode-state">No ${settings.tableSize}-handed data loaded</span>`}</button>${n&&!plan.started?'<button class="text-link plan-rebuild" data-plan-rebuild>Rebuild plan</button>':''}</div>`;
}
function progressPlanHTML(){
 let plan;try{plan=todaysPlan()}catch{return ''}if(!plan||!plan.items.length)return '';
 return `<section class="panel plan-panel"><div class="stats-row"><h3>Study Plan</h3><span class="source">${planStateText(plan)}</span></div><p class="muted">${plan.completed?'Today’s plan is finished. A new one is built tomorrow from your updated mistakes and leaks.':esc(planSummaryText(plan))+'. Built once a day from your mistake queue, your two biggest leaks, and your weakest concepts.'}</p><div class="choices"><button class="primary" data-study-plan>${plan.completed?'See today’s plan results':plan.started?'Resume today’s plan':'Build today’s plan'}</button>${!plan.started?'<button data-plan-rebuild>Rebuild plan</button>':''}</div></section>`;
}
function rebuildStudyPlan(){const p=planStore();if(!p||p.started||p.date!==planDayKey())return;const alt=p.alt;planCache=generateStudyPlan(p.date);if(alt)planCache.alt=alt;savePlan();(screen==='progress'?showProgress:home)();toast('Plan rebuilt from your latest data.')}
function planRows(plan){return plan.items.filter(i=>i.answered&&!i.skipped).map(i=>({score:i.score,kind:i.kind}))}
function startStudyPlan(){
 const plan=todaysPlan();if(!plan||!plan.items.length){toast('No '+settings.tableSize+'-handed data loaded for a plan.');return}
 if(plan.completed){session={index:plan.items.length,total:plan.items.length,used:new Set(),answers:[],current:null,feedback:null,plan:true,viewOnly:true,logged:true,planRef:plan,snaps:[],planRows:planRows(plan)};summary();return}
 if(!plan.started){plan.started=true;savePlan();captureAnalytics('mode_selected',{mode:'Study Plan'})}
 session={index:plan.done,total:plan.items.length,used:new Set(),answers:[],current:null,feedback:null,size:null,reviewId:null,plan:true,planRef:plan,snaps:[]};
 planNextSpot();
}
function planPreSpot(ref,size){const d=rangesFor(size).find(d=>d.id===ref.dataset),c=d?.cells.find(c=>c.hand===ref.hand);return c?preSpot([{...d,cells:[c],eligible:null}]):null}
function planSpotFor(item){
 filters={};session.reviewId=null;
 if(item.pool==='A'){const m=mistakes.find(m=>m.id===item.ref.mistakeId&&rowSize(m.spot)===settings.tableSize);if(m){selectedMode=4;session.reviewId=m.id;session.used.add('review:'+m.id);return structuredClone(m.spot)}}
 else if(item.kind==='pre'){const s=planPreSpot(item.ref);if(s){selectedMode=[0,1,2].includes(item.mode)?item.mode:0;return s}}
 else if(item.kind==='post'){const s=packs.flat().find(s=>s.id===item.ref.id);if(s){selectedMode=3;return JSON.parse(JSON.stringify(s))}}
 else if(item.kind==='quiz'){const c=learn.find(c=>c.id===item.ref.cardId);if(c){selectedMode=7;filters={choice:'All groups'};return quizSpot(c)}}
 else if(item.kind==='equity'){selectedMode=9;filters={choice:equityFilters.includes(item.ref.drill)?item.ref.drill:'All Drills'};return equitySpot()}
 // The planned spot is gone (mistake retired elsewhere, range import removed): swap in a Quick Drill spot.
 selectedMode=0;session.reviewId=null;const s=preSpot(rangesFor());if(s){item.kind='pre';item.pool='Q';item.mode=0;delete item.cat;item.ref={dataset:s.dataset,hand:s.hand}}return s;
}
function planNextSpot(){
 const plan=session.planRef;if(session.index>=session.total){finishStudyPlan();return}
 session.feedback=null;session.size=null;session.reviewId=null;const item=plan.items[session.index];let spot=null;try{spot=planSpotFor(item)}catch{}
 if(!spot){item.answered=true;item.skipped=true;planSync(plan);session.index++;planNextSpot();return}
 spot.tableSize??=settings.tableSize;spot.stackBb??=100;spot.rake??=0;session.current=spot;session.used.add(spot.id);if(spot.kind!=='quiz'&&spot.kind!=='equity')session.size=sizing(spot)[0];session.equityDraft='';screen='session';renderSession();
}
function planSync(plan){plan.done=plan.items.filter(i=>i.answered).length;plan.completed=plan.done>=plan.items.length;if(planCache===plan)savePlan()}
function finishStudyPlan(){
 const plan=session.planRef;session.planRows=planRows(plan);
 // Same completion event name as every mode, labeled "Study Plan"; marked so summary() does not fire it twice.
 if(session.snaps?.length&&!analyticsCompletedSessions.has(session)){analyticsCompletedSessions.add(session);captureAnalytics('drill_completed',{mode:'Study Plan'})}
 summary();
}
function planHeaderLabel(){return session?.plan&&!session.viewOnly?`Study Plan · item ${session.index+1} of ${session.total}`:''}
function planSourceText(item){return item?.pool==='A'?'From your mistake queue':item?.pool==='B'?'Leak drill: '+seatLabel(item.cat||'practice'):item?.pool==='C'?'Concept review':'Quick Drill warm-up'}
function planSourceLineHTML(){if(!session?.plan||!session.feedback||session.viewOnly)return '';return `<p class="source plan-source">${esc(planSourceText(session.planRef.items[session.index]))}</p>`}
function planBreakdownHTML(){
 if(!session?.plan)return '';const plan=session.planRef,rows=['A','B','C','Q'].map(k=>{const a=plan.items.filter(i=>i.pool===k&&i.answered&&!i.skipped),scored=a.filter(i=>Number.isFinite(i.score));return {k,n:a.length,score:scored.length?scored.reduce((s,i)=>s+i.score,0)/scored.length:null}}).filter(r=>r.n);
 if(!rows.length)return '';
 return `<section class="panel plan-breakdown"><h3>${plan.starter?'Starter plan':'Study Plan'} · by source</h3>${rows.map(r=>`<div><div class="stats-row"><span>${planPoolNames[r.k]}</span><span>${r.score===null?'Not scored':pct(r.score)+' weighted accuracy'} · ${countLabel(r.n,'decision')}</span></div><div class="statbar"><i style="width:${(r.score||0)*100}%"></i></div></div>`).join('')}</section>`;
}

/* ---------- Part 2: answer snapshots (rendered values, captured at answer time) ---------- */
function snapshotAnswer(s,f){
 const size=s.tableSize||settings.tableSize,base={at:Date.now(),id:s.id,tableSize:size,score:f.score??null};
 if(s.kind?.startsWith('villain_')){
  if(!s.exploit)return {...base,kind:'villain',verdict:'Review hand',grade:'Review',gradeText:'Not scored',label:`${s.villain} · ${s.title}`,sub:`Tiger ${s.heroPos} vs ${s.villain} ${s.villainPos} · ${s.street} · ${size}-handed · imported`,pot:`Pot ${s.potBb}bb · To call ${s.toCallBb}bb`,cards:s.heroHand,board:s.board,history:s.history,options:s.options.map(optionLabel),pick:optionLabel(f.pick),
   driverStats:s.driverStats.map(d=>({status:SpotEngine.status(d.n),label:d.label,text:`${d.value_pct}% of observed opportunities · n=${d.n}${d.benchmark_pct!==undefined?' · '+(d.benchmark_approximate?'~':'')+d.benchmark_pct+'% break-even folds':''}`})),
   view:[['verdict'],['lv','Your answer: ',optionLabel(f.pick)],['lv','','What Tiger did:',' '+(s.whatTigerDid?optionLabel(s.whatTigerDid):'not mapped to the option list')],['p','Review mode: '+(s.reviewReason||'no exploit answer attached.')+' Nothing was scored.'],['stats'],['src',`Imported real hand · ${s.tableSize}-handed study · ${s.source.file} · Hand #${s.source.psHandId}`]],ref:{id:s.id,gradingMode:'review'}};
  const pre=ExploitRanges.isPre(s),verdict=f.classification==='lean'?'Lean read, small sample':f.classification==='intentional_deviation'?'Intentional deviation':f.classification==='baseline_unavailable'?'Baseline unavailable':f.score===1?'Correct':f.classification==='baseline_miss'?'Baseline miss':'Exploit miss';
  let why=s.exploit.why;if(pre)try{why=villainPreflopExplanation(s)}catch{}
  const b=s.baseline,freqs=b&&(b.frequencies||{[b.action]:b.freq??1});
  return {...base,kind:'villain',verdict,grade:verdict,gradeText:f.score===null?'Not scored':f.score+' / 1 point',label:`${s.villain} · ${s.title}`,sub:`Tiger ${s.heroPos} vs ${s.villain} ${s.villainPos} · ${s.street} · ${size}-handed`,pot:`Pot ${s.potBb}bb · To call ${s.toCallBb}bb`,cards:s.heroHand,board:s.board,history:s.history,options:s.options.map(optionLabel),pick:optionLabel(f.pick),layout:pre?'pre':'post',
   exploit:{villain:s.villain,best:optionLabel(s.exploit.best),acceptable:s.exploit.acceptable.map(optionLabel),why,rule:s.exploit.rule},
   baseline:b?{text:Object.entries(freqs).map(([a,v])=>optionLabel(a)+' '+pct(v)).join(' · '),source:`${b.source} · ${s.tableSize}-handed`,agree:SpotEngine.baselineAccepts(s,s.exploit.best)?'Baseline and exploit agree on the best action.':'Baseline and exploit differ on the best action.'}:null,
   driverStats:s.driverStats.map(d=>({status:SpotEngine.status(d.n),label:d.label,text:`${d.value_pct!==undefined?d.value_pct+'% of observed opportunities':d.value+'bb median'} · n=${d.n}${d.benchmark_pct!==undefined?' · '+(d.benchmark_approximate?'~':'')+d.benchmark_pct+'% break-even folds':''}`})),
   view:[['verdict'],['lv','Your answer: ',optionLabel(f.pick)],['villain'],['stats'],...(s.whatTigerDid?[['lv','','What Tiger did:',' '+s.whatTigerDid]]:[]),['src',`Exploit read, not solver output · ${s.tableSize}-handed study · ${s.source.file||s.source.type||'Constructed template'}${s.source.psHandId?' · Hand #'+s.source.psHandId:''}`]],
   ref:{id:s.id,gradingMode:s.gradingMode||'exploit'}};
 }
 if(s.kind==='equity'){
  const m=EquityMath.refresh(s),count=s.drill==='Count the Outs',view=[['verdict']];
  if(count)view.push(['lv',`Your count: ${f.pick.outs} · Clean outs: `,String(m.count)]);
  view.push(['lv','',`${m.count} clean outs:`,' '+m.outs.map(faceText).join(' ')+'.']);
  if(m.excluded.length)view.push(['dirty',m.excluded.map(x=>[faceText(x.card),` completes your draw but ${x.tie?'only ties the shown hand':`gives villain ${x.villainHand}`}. Excluded from the count.`])]);
  view.push(['p','Clean outs put you ahead on the next card. On the flop, villain can still redraw on the river. Overcards and pair improvements are excluded.']);
  view.push(['figs',[...(f.pick.estimate!==undefined?[['Your estimate',eqPercent(f.pick.estimate)]]:[]),['Rule of 2/4',m.rule+'%'],['Exact (enumerated)',eqPercent(m.equity)],...(f.required!==undefined?[['Pot odds required',eqPercent(f.required)]]:[])]]);
  view.push(['p',`${m.count} × ${m.multiplier} = ${m.rule}% (${m.multiplier===4?'flop · two cards to come':'turn · one card to come'}).`]);
  if(m.multiplier===4&&m.count>=9)view.push(['lv',`The raw rule of 4 drifts high at nine or more outs. Common adjustment: ${m.count} × 4 − (${m.count} − 8) = `,m.adjusted+'%',`. The drill grades the raw ${m.rule}% estimate.`]);
  view.push(['p',`Exact equity is ${(m.equity-m.rule)>=0?'higher':'lower'} by ${Math.abs(m.equity-m.rule).toFixed(1)} points: it counts every showdown result, including pair improvements, backdoors, redraws, and ties; the shortcut estimates from your clean outs.`]);
  if(s.drill==='Decide the Call'){view.push(['p',`${f.borderline?'Borderline: the rule and the exact number disagree here. Either Call or Fold earns full decision credit.':`Exact equity ${m.equity>=f.required?'meets':'is below'} the ${eqPercent(f.required)} price: ${f.exactAction}.`} Your decision: ${f.pick.decision}.`]);view.push(['p',`Estimate: ${f.estimateScore} / 1 · Decision: ${f.decisionScore} / 1. Each step contributes half the total score.`])}
  view.push(['src',`${m.runouts} ${s.board.length===3?'two-card runouts':'rivers'} · ${m.wins} wins · ${m.ties} ties · ${m.losses} losses · ties count as half a win.`],['src',`Exact math · enumerated runouts · rule of 2 and 4 · ${size}-handed`]);
  const {math,...spot}=s;
  return {...base,kind:'equity',verdict:f.verdict,grade:f.verdict,gradeText:f.score+' / 1 point',label:`${s.drill} · ${s.draw}`,sub:`${s.board.length===3?'Flop · two cards to come':'Turn · one card to come'} · villain shows ${s.villainMade}`,pot:s.bet?`Pot ${s.pot}bb · Bet ${s.bet}bb`:'',cards:s.cards,board:s.board,villainCards:s.villainCards,options:s.drill==='Decide the Call'?['Fold','Call']:[],pick:count?countLabel(f.pick.outs,'out'):f.pick.estimate+'%'+(f.pick.decision?' · '+f.pick.decision:''),view,ref:{spot:structuredClone(spot)}};
 }
 if(s.kind==='quiz')return {...base,kind:'quiz',verdict:f.verdict,grade:f.grade,gradeText:f.grade,label:quizCopy(s,s.question),sub:'Concept quiz · '+s.source,question:quizCopy(s,s.question),options:s.options.map(o=>quizCopy(s,o)),pickIndex:f.pick,pick:quizCopy(s,s.options[f.pick]),correct:quizCopy(s,s.options[s.answer]),explanation:quizCopy(s,f.reason),view:[['verdict'],['b',quizCopy(s,s.options[s.answer])],['expl'],['src',`${s.label} · ${s.source} · ${size}-handed`]],ref:{spot:structuredClone(s)}};
 const post=s.kind==='post',sized=['Raise','Bet'].includes(f.pick),entries=Object.entries(s.frequencies||{}).filter(([,v])=>v>.0001);
 return {...base,kind:s.kind,verdict:f.verdict,grade:f.grade,gradeText:f.grade,hand:s.hand,
  label:post?`${s.cards.join(' ')} on ${s.board.join(' ')} · ${s.spot}`:`${s.hand} · ${seatShort(s.hero)}${s.villain?' vs '+seatShort(s.villain):''} · ${s.spot}`,
  sub:post?`${s.spot} · ${s.hero==='BTN'?'In position':'Out of position'} · ${size}-handed`:`${seatShort(s.hero)}${s.villain?' vs '+seatShort(s.villain):''} · ${s.spot} · ${size}-handed`,
  pot:`Pot ${s.pot.toFixed(1)}bb${s.bet?` · Bet ${s.bet.toFixed(1)}bb`:''}${s.equity!==undefined?` · Assumed equity ${pct(s.equity)}`:''}`,line:s.line,cards:s.cards,board:s.board,
  options:post?(s.bet?['Fold','Call','Raise']:['Check','Bet']):preflopActions(s).map(a=>actionLabel(s,a)),pick:(post?f.pick:actionLabel(s,f.pick))+(sized&&session?.size?` ${session.size}${post?'% pot':'bb'}`:''),pickRaw:f.pick,
  frequencies:entries,freqReadout:post?entries.map(([a,v])=>`${a} ${pct(v)}`).join(' · '):handReadout(s.hand,s.frequencies),explanation:post?f.reason:preflopExplanation(s),
  view:[['verdict'],['freq'],['expl'],...(f.sizeNote?[['p',f.sizeNote]]:[]),['src',`${post?s.engine||'Heuristic strategy · exact math':s.label} · ${s.source} · ${size}-handed`]],
  ref:post?{id:s.id}:{dataset:s.dataset,hand:s.hand}};
}
// Called by the three answer handlers after the existing record() path has run.
function afterAnswer(s,f){
 if(!session||!s||!f)return;
 try{(session.snaps??=[]).push(snapshotAnswer(s,f))}catch{}
 try{if(session.plan&&!session.viewOnly){const plan=session.planRef,item=plan.items[session.index];if(item){item.answered=true;item.score=f.score??null;planSync(plan)}}}catch{}
}
function logSession(partial){
 try{
  if(!session||session.logged||!session.snaps?.length)return;session.logged=true;
  const finished=!!session.feedback&&session.index+1>=session.total,log=logStore();
  log.push({id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),dateISO:new Date().toISOString(),modeLabel:session.plan?'Study Plan':modes[selectedMode][0],tableSize:settings.tableSize,partial:!!partial&&!finished,answers:session.snaps.slice(),...(session.plan?{planDate:session.planRef.date}:{})});
  if(log.length>50)log.splice(0,log.length-50);saveLog();
 }catch{}
}

/* ---------- Part 2: review UI ---------- */
const reviewScore=n=>n===null||n===undefined||!Number.isFinite(Number(n))?'Not scored':countLabel(Number(n),'point');
function reviewBlocksHTML(a){
 return (Array.isArray(a.view)?a.view:[]).map(b=>{switch(b[0]){
  case 'verdict':return `<div class="verdict ${a.score===0?'bad':''}"><strong>${esc(a.verdict)}</strong><span class="grade">${esc(a.gradeText??a.grade)}</span></div>`;
  case 'p':return `<p>${esc(b[1])}</p>`;
  case 'b':return `<p><strong>${esc(b[1])}</strong></p>`;
  case 'lv':return `<p>${esc(b[1])}<strong>${esc(b[2])}</strong>${esc(b[3]||'')}</p>`;
  case 'expl':return `<p>${esc(a.explanation)}</p>`;
  case 'src':return `<div class="source">${esc(b[1])}</div>`;
  case 'freq':{const e=(a.frequencies||[]).filter(x=>Array.isArray(x)&&Number.isFinite(x[1]));return `<div class="freq" aria-label="${esc(a.freqReadout)}">${e.map(([act,v])=>`<span class="${act===a.pickRaw||String(act).includes('Bet')&&a.pickRaw==='Raise'?'picked':''}" style="width:${Math.max(0,Math.min(1,v))*100}%;background:${Object.hasOwn(colors,act)?colors[act]:'var(--call)'}">${v>=.07?esc(act)+' '+pct(v):''}</span>`).join('')}</div><div class="source">${esc(a.freqReadout)} · Your pick: ${esc(a.pickRaw)}</div>`}
  case 'figs':return `<div class="equity-figures">${b[1].map(([l,v])=>`<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
  case 'dirty':return `<div class="dirty-outs"><strong>Not a clean out</strong>${b[1].map(([c,t])=>`<p><span class="excluded-card">${esc(c)}</span>${esc(t)}</p>`).join('')}</div>`;
  case 'stats':return `<div class="driver-stats">${(a.driverStats||[]).map(d=>`<div><span class="sample-badge ${['graded','lean','hidden'].includes(d.status)?d.status:''}">${esc(d.status)}</span> <strong>${esc(d.label)}</strong><p>${esc(d.text)}</p></div>`).join('')}</div>`;
  case 'villain':{const x=a.exploit||{},bl=a.baseline,exploit=`<section><h3>Exploit vs ${esc(x.villain)}</h3><p><strong>${esc(x.best)}</strong></p><p>Acceptable: ${(x.acceptable||[]).map(esc).join(' · ')}</p><p>${esc(x.why)}</p><p class="source">${esc(x.rule)}</p></section>`,base=bl?`<p><strong>Baseline:</strong> ${esc(bl.text)} when you hold this hand in this spot.</p><p class="source">${esc(bl.source)}</p>`:'';
   return a.layout==='pre'?exploit+(bl?`<section><h3>Your hand’s grading baseline</h3>${base}</section>`:'')+'<p class="source">The interactive range grid is not stored. Drill this spot again to browse the full range.</p>':`<div class="comparison">${exploit}<section><h3>Baseline</h3>${bl?base+`<p>${esc(bl.agree)}</p>`:'<p class="notice">No baseline loaded for this table size.</p>'}</section></div>`}
  default:return '';
 }}).join('');
}
function reviewContextHTML(a){
 const cards=x=>Array.isArray(x)?x.filter(reviewCardOk):[];let h=a.sub?`<p class="review-sub">${esc(a.sub)}</p>`:'';
 if(a.kind==='quiz')return h+`<p class="review-question">${esc(a.question)}</p><ol class="review-options">${(a.options||[]).map((o,i)=>`<li class="${i===a.pickIndex?'picked':''}">${esc(o)}${i===a.pickIndex?' <span class="tag">Your pick</span>':''}</li>`).join('')}</ol>`;
 const hc=cards(a.cards),vc=cards(a.villainCards),bc=cards(a.board),group=(label,list)=>list.length?`<div><span class="source">${label}</span><div class="board">${list.map(card).join('')}</div></div>`:'';
 h+=`<div class="review-cards">${group('YOU',hc)}${group('VILLAIN',vc)}${group('BOARD',bc)}</div>`;
 if(a.pot)h+=`<p class="review-pot">${esc(a.pot)}</p>`;
 if(a.line)h+=`<p class="review-line">${esc(a.line)}</p>`;
 if(Array.isArray(a.history)&&a.history.length)h+=`<details class="review-history"><summary>Action to this decision</summary><ol>${a.history.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`;
 if(Array.isArray(a.options)&&a.options.length)h+=`<p class="source">Options shown: ${a.options.map(esc).join(' · ')}</p>`;
 return h;
}
function reviewCardHTML(a,i){try{return `<div class="review-card">${reviewContextHTML(a)}<div class="review-feedback">${reviewBlocksHTML(a)}</div><button class="primary review-again" data-drill-again="${i}">Drill this spot again ${svgIcon('next')}</button></div>`}catch{return '<div class="review-card"><p class="muted">This entry could not be displayed.</p></div>'}}
function reviewListHTML(answers,key,title='Review hands'){
 reviewSets[key]=answers;if(!answers?.length)return '';
 return `<section class="panel review-panel"><div class="stats-row"><h3>${esc(title)}</h3><span class="source">${countLabel(answers.length,'decision')}</span></div><p class="source">Tap a row to reopen its feedback exactly as it was shown.</p><div class="review-list" data-review-set="${esc(key)}">${answers.map((a,i)=>`<div class="review-item"><button class="review-row" data-review-row="${i}" aria-expanded="false" aria-controls="review-${esc(key)}-${i}"><span class="review-num">${i+1}</span><span class="review-label">${esc(a.label)}</span><span class="review-pick">${esc(a.pick)}</span><span class="review-grade ${a.score===1?'good':a.score===0?'bad':''}">${esc(a.grade)}</span><span class="review-score">${reviewScore(a.score)}</span><span class="stat-chevron" aria-hidden="true">▾</span></button><div class="review-detail" id="review-${esc(key)}-${i}" hidden></div></div>`).join('')}</div></section>`;
}
// Inline accordion: expands in place, one open at a time, no modal, no scroll shift.
function toggleReviewRow(button){
 const list=button.closest('[data-review-set]');if(!list)return;
 const x=window.scrollX,y=window.scrollY,opening=button.getAttribute('aria-expanded')!=='true',answers=reviewSets[list.dataset.reviewSet]||[];
 for(const other of list.querySelectorAll('.review-row[aria-expanded="true"]')){other.setAttribute('aria-expanded','false');const d=other.parentElement.querySelector('.review-detail');if(d){d.hidden=true;d.innerHTML=''}}
 if(opening){const i=Number(button.dataset.reviewRow),detail=button.parentElement.querySelector('.review-detail'),a=answers[i];if(detail&&a){detail.innerHTML=reviewCardHTML(a,i);detail.hidden=false;button.setAttribute('aria-expanded','true')}}
 window.scrollTo(x,y);
}
function spotFromSnapshot(a){
 const r=a.ref||{};
 if(a.kind==='pre')return planPreSpot(r,a.tableSize===6?6:4);
 if(a.kind==='post'){const s=packs.flat().find(s=>s.id===r.id);return s?JSON.parse(JSON.stringify(s)):null}
 if(a.kind==='villain'){const s=villainData?.spots.find(s=>s.id===r.id)||ext('findImportedSpot',r.id)||null;if(!s||s.status!=='review'&&SpotEngine.sample(s)==='hidden')return null;const spot=withBaseline(structuredClone(s));spot.gradingMode=s.status==='review'?'review':['exploit','baseline','both'].includes(r.gradingMode)?r.gradingMode:'exploit';return spot}
 if(a.kind==='quiz'){const s=r.spot;return s&&Array.isArray(s.options)&&s.options.every(o=>typeof o==='string')&&Number.isInteger(s.answer)&&typeof s.question==='string'?{...structuredClone(s),kind:'quiz'}:null}
 if(a.kind==='equity'){const s=r.spot,cards=s&&[s.cards,s.board,s.villainCards].every(Array.isArray)?s.cards.concat(s.board,s.villainCards):null;if(!cards||!cards.every(reviewCardOk)||new Set(cards).size!==cards.length||!equityFilters.includes(s.drill))return null;const spot={...structuredClone(s),kind:'equity'};delete spot.math;EquityMath.refresh(spot);return spot}
 return null;
}
// Starts a fresh one-spot session through the normal record path. The logged session is never edited.
function drillSpotAgain(a){
 let spot=null;try{spot=spotFromSnapshot(a)}catch{}
 if(!spot){toast('That spot is no longer available in the loaded data.');return}
 selectedMode={pre:0,post:3,quiz:7,equity:9,villain:10}[a.kind];captureModeSelected();filters={};
 session={index:0,total:1,used:new Set([spot.id]),answers:[],current:spot,feedback:null,size:null,reviewId:null,snaps:[]};
 spot.tableSize??=settings.tableSize;if(spot.kind!=='quiz'&&spot.kind!=='equity')session.size=sizing(spot)[0];session.equityDraft='';screen='session';renderSession();window.scrollTo(0,0);
}
function resultsExtrasHTML(){
 if(!session)return '';let answers=session.snaps||[];
 if(session.plan){const logged=logStore().filter(e=>e.planDate===session.planRef.date).flatMap(e=>e.answers);if(logged.length>=answers.length)answers=logged}
 return reviewListHTML(answers,'results');
}
const sessionDate=iso=>{const d=new Date(iso);return isNaN(d)?'':d.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})};
function recentSessionsHTML(){
 const log=logStore().slice().reverse(),shown=showAllSessions?log:log.slice(0,8);
 return `<section class="panel recent-sessions"><div class="stats-row"><h3>Recent sessions</h3><span class="source">${log.length?`Last ${countLabel(log.length,'session')} · up to 50 kept`:'Up to 50 kept on this browser'}</span></div>${log.length?`<div class="session-list">${shown.map(e=>`<button class="session-row" data-session-review="${esc(e.id)}"><span class="session-date">${esc(sessionDate(e.dateISO))}</span><span class="session-mode">${esc(e.modeLabel)}${e.partial?' <span class="tag">partial</span>':''}</span><span class="session-meta">${e.tableSize===6?6:4}-handed · ${countLabel(e.answers.length,'decision')} · ${accuracy(e.answers)}${accuracy(e.answers)==='—'?'':' weighted accuracy'}</span><span class="session-open" aria-hidden="true">${svgIcon('next')}</span></button>`).join('')}</div>${log.length>8?`<button class="text-link" data-sessions-all>${showAllSessions?'Show fewer':'Show all '+log.length+' sessions'}</button>`:''}`:'<p class="muted">Finish or save a session and it shows up here, reviewable hand by hand.</p>'}</section>`;
}
function showSessionReview(){
 const e=logStore().find(e=>e.id===reviewSessionId);if(!e){go('progress');return}
 const misses=e.answers.filter(a=>a.score===0||a.kind==='equity'&&a.score<1).length;
 shell(`<div class="page"><button class="back" data-go="progress">${svgIcon('back')} Progress</button><div class="eyebrow">Session review</div><h1>${esc(e.modeLabel)}</h1><p class="muted">${esc(sessionDate(e.dateISO))} · ${e.tableSize===6?6:4}-handed${e.partial?' · <span class="tag">partial</span> saved before the session finished':''}</p><div class="metrics"><div class="metric"><strong>${e.answers.length}</strong><span>Decisions</span></div><div class="metric"><strong>${accuracy(e.answers)}</strong><span>Weighted accuracy</span></div><div class="metric"><strong>${misses}</strong><span>${misses===1?'Mistake':'Mistakes'}</span></div></div>${reviewListHTML(e.answers,'log')}</div>`,'Progress');
}

/* ---------- Export / import extras ---------- */
function exportExtras(){return {sessionLog:logStore(),studyPlan:planStore(),...(ext('importExportData')||{})}}
function importExtras(obj){
 const notes=[];
 if(Array.isArray(obj.sessionLog)){const ok=obj.sessionLog.filter(validLogEntry).slice(-50);logCache=ok;saveLog();notes.push(`Session log restored: ${countLabel(ok.length,'session')}${ok.length<obj.sessionLog.length?' (invalid entries skipped)':''}.`)}
 else notes.push('This backup contained no session log; the session log on this browser was kept.');
 if(validPlan(obj.studyPlan)){planCache=obj.studyPlan;savePlan();notes.push('Study plan restored.')}
 const hh=ext('importRestoreData',obj);if(hh)notes.push(hh);
 return notes.join(' ');
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-study-plan')){startStudyPlan();return}
 if(b.hasAttribute('data-plan-rebuild')){rebuildStudyPlan();return}
 if(b.dataset.reviewRow!==undefined){toggleReviewRow(b);return}
 if(b.dataset.drillAgain!==undefined){const a=(reviewSets[b.closest('[data-review-set]')?.dataset.reviewSet]||[])[Number(b.dataset.drillAgain)];if(a)drillSpotAgain(a);return}
 if(b.dataset.sessionReview){reviewSessionId=b.dataset.sessionReview;go('sessionReview');return}
 if(b.hasAttribute('data-sessions-all')){showAllSessions=!showAllSessions;showProgress()}
});

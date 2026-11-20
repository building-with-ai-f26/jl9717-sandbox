// v25 Part 3: hand-history import. Fixture: data-imports/80loss_11-5.txt, checked against the independent Python audit. Run: node import-test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const raw=fs.readFileSync(__dirname+'/data-imports/80loss_11-5.txt','utf8'),audit=JSON.parse(fs.readFileSync(__dirname+'/data-imports/session-2026-11-05-audit.json','utf8'));
const hashData=()=>crypto.createHash('sha256').update(fs.readdirSync(__dirname+'/dist/data').sort().map(f=>fs.readFileSync(__dirname+'/dist/data/'+f)).join('')).digest('hex'),dataBefore=hashData();
function boot(storage){
 const stub=()=>({innerHTML:'',textContent:'',value:'',files:[],classList:{toggle(){}},querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},reportValidity:()=>true,remove(){},click(){},focus(){},scrollIntoView(){}}),container=stub();
 const ctx={console,structuredClone,Date,Math,Set,Map,WeakSet,Blob,URL,assert,confirm:()=>true,setTimeout:()=>{},window:{scrollTo(){}},navigator:{},document:{querySelector(){return container},querySelectorAll(){return[]},getElementById(){return null},addEventListener(){},body:{classList:{toggle(){}},append(){}},createElement(){return stub()}},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=String(v)},removeItem:k=>{delete storage[k]}},fetch:async p=>({json:async()=>JSON.parse(fs.readFileSync(__dirname+'/dist/'+p))})};
 ctx.container=container;ctx.storage=storage;vm.createContext(ctx);
 for(const f of fs.readFileSync(__dirname+'/dist/index.html','utf8').match(/<script src="([^"]+)" defer>/g).map(x=>x.match(/src="([^"]+)"/)[1]))vm.runInContext(fs.readFileSync(__dirname+'/dist/'+f,'utf8'),ctx);
 return ctx;
}
const storage={},ctx=boot(storage),wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await wait(60);const run=s=>vm.runInContext(s,ctx);ctx.raw=raw;ctx.audit=audit;
assert(fs.readFileSync(__dirname+'/dist/sw.js','utf8').includes('"import-ui.js"'));
run(`
// 1. Parser parity with scripts/import-hand-history.py on the real session (every counter, every player).
const hands=splitHands(raw).map(parseHand),tally=tallyHands(hands);assert.equal(hands.length,150);
let compared=0;for(const [log,a] of Object.entries(audit.players)){const t=tally[log];assert.equal(t.hands,a.new_hands,log);assert.equal(t.seatSum,a.seat_sum,log);
 for(const k of IMPORT_COUNTERS){assert.equal(t.stats[k].num,a.stats[k].num,log+' '+k+' num');assert.equal(t.stats[k].n,a.stats[k].n,log+' '+k+' n');if(a.stats[k].n)assert.equal(importRound1(100*t.stats[k].num/t.stats[k].n),a.stats[k].pct,log+' '+k+' pct');if(a.stats[k].benchmark_pct!==undefined&&a.stats[k].n)assert.equal(importRound1(t.bench[k]/t.stats[k].n),a.stats[k].benchmark_pct,log+' '+k+' benchmark');compared++}}
assert.equal(Object.keys(tally).length,Object.keys(audit.players).length);
globalThis.out=['Parser parity: 150/150 hands parsed and pot-reconciled; '+compared+' player-stat counters equal the Python audit ('+Object.keys(audit.players).join(', ')+').'];

// 2. The fixture as-is is already inside the bundled profiles: every hand is a duplicate and nothing is stored.
const base=structuredClone(opponentProfiles),seedAnswers=JSON.stringify(villainData.spots.map(s=>[s.id,s.exploit.best,s.exploit.acceptable,s.exploit.forbidden,s.heroHand,s.board,s.options]));
let r=runImport([{name:'80loss_11-5',text:raw}]);
assert(r.parsed===0&&r.duplicates===150&&r.duplicatesBundled===150&&!r.stored&&r.files[0].note.includes('Nothing from this file was stored'));
assert.equal(Object.keys(storage).filter(k=>k.includes('imported')||k.includes('profileDeltas')).length,0,'nothing stored');assert.equal(JSON.stringify(opponentProfiles),JSON.stringify(base));
out.push('Unchanged fixture: 150 found, 0 new, 150 duplicates (already counted in the bundled profiles), nothing stored.');

// 3. Same session with fresh hand IDs (+10000) plus a junk file, one broken hand, and one hand with an unknown player.
const blocks=splitHands(raw.replace(/Hand #2500000(\\d{5})/g,(m,d)=>'Hand #2500000'+String(Number(d)+10000).padStart(5,'0')));
const broken=blocks[3].replace(/Total pot \\$[\\d.]+/,'Total pot $999.99'),strangerAt=blocks.findIndex((b,i)=>i>10&&/^Ben: folds$/m.test(b.split('*** FLOP')[0])&&!b.includes('*** FLOP')),stranger=blocks[strangerAt].replace(/\\bBen\\b/g,'Stranger');
const fresh=blocks.map((b,i)=>i===3?broken:i===strangerAt?stranger:b).join('\\n\\n');
r=runImport([{name:'session-b',text:fresh},{name:'notes',text:'not a hand history at all'}]);
assert(r.stored&&!r.error,r.error);globalThis.mainReport=importReportHTML(r);assert.equal(r.files.length,2);assert.equal(r.parsed,149);assert.equal(r.duplicates,0);
assert(r.unparseable.length===1&&r.unparseable[0].line.startsWith('PokerStars Hand #')&&r.unparseable[0].reason.includes('reconcile'));
assert(r.files[1].hands===0&&r.files[1].note.includes('Nothing from this file was stored'));
assert.deepEqual(r.newPlayers.map(p=>p.name),['Stranger']);assert(!opponentProfiles.players.Stranger,'new player is not added');
assert.deepEqual(r.players.map(p=>p.name).sort(),['Alex','Ben','Ruining','Tiger']);assert.deepEqual(r.absent,['Rob']);
assert.deepEqual(r.notCountable.map(x=>x.stat),['aggression_factor','sizing.open_raise_bb_median','sizing.three_bet_bb_median','sizing.bet_pct_pot_median']);
const expect=tallyHands(splitHands(fresh).filter((b,i)=>i!==3).map(parseHand)),alias=importAliases();assert.deepEqual(alias,{'K Bon':'Alex','Crawfish':'Ruining'});
for(const [log,t] of Object.entries(expect)){const name=alias[log]||log;if(name==='Stranger')continue;const now=opponentProfiles.players[name],was=base.players[name];assert.equal(now.hands,was.hands+t.hands);
 for(const k of IMPORT_COUNTERS){assert.equal(now.stats[k].n,was.stats[k].n+t.stats[k].n,name+' '+k);assert.equal(now.stats[k].num,was.stats[k].num+t.stats[k].num);assert(now.stats[k].n>=was.stats[k].n&&now.stats[k].num>=was.stats[k].num,'counts never decrease')}
 assert.equal(JSON.stringify(now.sizing),JSON.stringify(was.sizing));assert.equal(JSON.stringify(now.stats.aggression_factor),JSON.stringify(was.stats.aggression_factor))}
assert.equal(JSON.stringify(opponentProfiles.players.Rob),JSON.stringify(base.players.Rob));
for(const need of ['vpip','pfr','rfi','fold_to_3bet','cbet_flop','fold_to_cbet'])assert(r.players.find(p=>p.name==='Ben').updated.some(u=>u.stat===need&&u.added>0&&u.n===opponentProfiles.players.Ben.stats[need].n),'minimum stat '+need);
SpotEngine.load(villainData,opponentProfiles);
assert.equal(JSON.stringify(villainData.spots.map(s=>[s.id,s.exploit.best,s.exploit.acceptable,s.exploit.forbidden,s.heroHand,s.board,s.options])),seedAnswers,'seeded answers and cards untouched');
const benSeed=villainData.spots.find(s=>s.id==='ben-three-bet-bluff-vs-non-folder-real-1'),f3=opponentProfiles.players.Ben.stats.fold_to_3bet;assert(benSeed.driverStats[0].n===f3.n&&benSeed.exploit.why.includes('(n='+f3.n+')')&&benSeed.exploit.why.includes(importNum(f3.pct)+'%'),'seed evidence text follows the counts');
out.push('Fresh-ID import: 2 files read, 149 hands parsed, 1 unparseable ('+r.unparseable[0].reason+'), 0 duplicates, new player Stranger listed and not added, Rob untouched.');
out.push('Stat updates: '+r.players.map(p=>p.name+' +'+p.hands+' hands, '+p.updated.length+' stats').join('; ')+'.');
out.push('Example: Ben vpip n '+base.players.Ben.stats.vpip.n+' -> '+opponentProfiles.players.Ben.stats.vpip.n+', fold_to_3bet n '+base.players.Ben.stats.fold_to_3bet.n+' -> '+f3.n+' ('+base.players.Ben.stats.fold_to_3bet.pct+'% -> '+f3.pct+'%).');

// 4. Candidate spots: seed schema, grading rule, ids, sources.
const seed=villainData.spots.find(s=>s.kind==='villain_real'),spots=importedSpotList();assert.equal(spots.length,r.graded+r.review);assert(spots.length>20,'candidates '+spots.length);
assert.equal(new Set(spots.map(s=>s.id)).size,spots.length);assert.equal(new Set(spots.map(s=>s.source.psHandId)).size,spots.length,'one candidate per hand');
const byTpl={};
for(const s of spots){
 for(const k of Object.keys(seed))if(!['difficulty','exploit','tableSizeNote','whatTigerDid','template'].includes(k))assert(k in s,s.id+' missing '+k);assert(!('difficulty' in s));
 assert(/^[a-z]+-[a-z0-9-]+-imported-\\d+$/.test(s.id)&&s.id.startsWith(s.villain.toLowerCase()+'-'));assert(s.kind==='villain_real'&&s.tags.includes('imported')&&s.baseline===null&&s.baselineNote===seed.baselineNote);
 assert(s.source.type==='hand_history'&&s.source.file==='session-b'&&s.source.psHandId>250000012000);assert(opponentProfiles.players[s.villain]&&s.villain!=='Tiger');
 assert([4,6].includes(s.tableSize)&&s.board.length===({flop:3,turn:4,river:5})[s.street]&&s.history.some(h=>h.startsWith('--- '+s.street.toUpperCase()+' ['))&&s.history.every(h=>/^(--- (FLOP|TURN|RIVER) \\[|.+ \\((BTN|SB|BB|CO|HJ|LJ|EP|BTN\\/SB)\\) (folds|checks|calls [\\d.]+bb|bets [\\d.]+bb|raises to [\\d.]+bb)$)/.test(h)),s.id+' history');
 assert(s.potBb>0&&(s.toCallBb>0)===s.options.includes('fold')&&s.options.every(o=>['fold','call','raise','check','bet_33pct','bet_50pct','bet_66pct','bet_75pct','bet_100pct'].includes(o)));
 if(s.whatTigerDid!==undefined)assert(s.options.includes(s.whatTigerDid));
 for(const d of s.driverStats){const st=opponentProfiles.players[s.villain].stats[d.ref.split('.')[1]];assert(st.n===d.n&&st.pct===d.value_pct,'driver stat is the post-import value')}
 if(s.status==='graded'){const t=villainData.templates[s.template];assert(t&&s.exploit.rule===t.rule&&s.options.includes(s.exploit.best)&&s.exploit.acceptable.includes(s.exploit.best)&&s.exploit.acceptable.every(a=>s.options.includes(a))&&s.exploit.forbidden.every(a=>s.options.includes(a))&&s.driverStats.every(d=>d.n>=100)&&s.exploit.why.includes('n='+s.driverStats[0].n));assert.equal(JSON.stringify(s.options),JSON.stringify(t.options));assert.equal(SpotEngine.sample(s),'graded');byTpl[s.template]=(byTpl[s.template]||0)+1}
 else{assert(s.status==='review'&&!s.exploit&&s.reviewReason)}
}
assert.equal(spots.filter(s=>s.status==='graded').length,r.graded);
out.push('Candidates: '+spots.length+' spots from 149 hands = '+r.graded+' graded + '+r.review+' review. Graded by template: '+(Object.entries(byTpl).map(([k,n])=>k+' '+n).join(', ')||'none')+'. Hands with no spot: '+r.noDecision+' no postflop hero decision, '+r.noHero+' without hero, '+r.untracked.length+' vs untracked player. Unmapped hero actions: '+r.unmapped.length+'.');
const g=spots.find(s=>s.status==='graded');if(g)out.push('Sample graded spot: '+JSON.stringify({id:g.id,villain:g.villain,street:g.street,heroHand:g.heroHand,board:g.board,potBb:g.potBb,toCallBb:g.toCallBb,exploit:g.exploit,whatTigerDid:g.whatTigerDid,psHandId:g.source.psHandId}));
const first=spots[0];out.push('Sample history ('+first.id+', '+first.status+'): '+first.history.join(' | ')+' => pot '+first.potBb+'bb, to call '+first.toCallBb+'bb, Tiger: '+first.whatTigerDid);

// 5. Duplicate protection: importing the same text again changes nothing.
const snap=JSON.stringify(opponentProfiles),storedSpots=storage['gtoTrainer.importedSpots.v1'];
r=runImport([{name:'session-b-again',text:fresh}]);assert(r.parsed===0&&r.duplicates===149&&!r.stored&&r.unparseable.length===1);assert.equal(JSON.stringify(opponentProfiles),snap);assert.equal(storage['gtoTrainer.importedSpots.v1'],storedSpots);
out.push('Re-import of the same text: 149 duplicates skipped, 0 parsed, counts and spots unchanged.');

// 6. Unmapped hero action: an oversized bet is listed and the spot is still created without whatTigerDid.
const big=splitHands(fresh).find(b=>/^Tiger: bets \\$/m.test(b.split('*** FLOP')[1]||''));
if(big){const h=parseHand(big.replace(/#2500000(\\d{5})/,(m,d)=>'#2500000'+(Number(d)+20000)));const e=h.events.find(e=>e.player==='Tiger'&&e.action==='bets');e.amount=e.potBefore*4;const c=buildCandidate(h,'x',importAliases());if(c.spot&&c.spot.importMeta.rawAction.startsWith('bets'))assert(c.unmapped&&!('whatTigerDid' in c.spot),'unmapped bet')}

// 7. Villain Study: review spots are playable, unscored, no XP, no mistake entry, no analytics; graded ones grade normally.
const events=[];window.posthog={capture:(e,p)=>events.push(e)};settings.tableSize=4;selectedMode=10;filters={kind:'Imported',grading:'exploit'};
const pool=villainPool();assert(pool.length&&pool.every(s=>s.importMeta)&&pool.some(s=>s.status==='review'));villainSetup();assert(container.innerHTML.includes('Import hand histories')&&container.innerHTML.includes('review (imported, unscored)')&&container.innerHTML.includes('Remove import'));
const rv=structuredClone(pool.find(s=>s.status==='review'&&s.whatTigerDid));rv.gradingMode='review';const p0=progress.length,m0=mistakes.length,v0=villainProgress.length;
session={index:0,total:1,used:new Set(),answers:[],current:rv,feedback:null,reviewId:null};screen='session';answerVillain(rv.options[0]);
assert(session.feedback.score===null&&session.feedback.classification==='review');assert.equal(progress.length,p0,'no XP');assert.equal(mistakes.length,m0,'no mistake entry');assert.equal(villainProgress.length,v0+1);assert(villainProgress.at(-1).classification==='review'&&villainProgress.at(-1).score===null);
assert(!events.includes('drill_answered'));assert(container.innerHTML.includes('What Tiger did:')&&container.innerHTML.includes('Not scored')&&container.innerHTML.includes('driver-stats')&&container.innerHTML.includes('review mode'));
assert(session.snaps.length===1&&reviewCardHTML(session.snaps[0],0).includes('Review hand'),'session review handles review spots');
if(g){const gs=structuredClone(g);gs.gradingMode='exploit';session={index:0,total:1,used:new Set(),answers:[],current:gs,feedback:null,reviewId:null};answerVillain(gs.exploit.best);assert(session.feedback.score===1&&session.feedback.classification==='correct');assert.equal(progress.length,p0+1)}
filters={};let seenReview=0;session={index:0,total:Infinity,used:new Set(),answers:[]};for(let i=0;i<200;i++){const s=villainSpot();if(s?.status==='review'){seenReview++;assert.equal(s.gradingMode,'review')}}assert(seenReview>0,'review spots are dealt in Villain Study');
showProgress();
globalThis.snapAfter=JSON.stringify(opponentProfiles);globalThis.baseJSON=JSON.stringify(base);globalThis.reportHTML=importReportHTML(lastImportReport);
`);
// 8. Persistence: a fresh load applies both keys on top of the bundled files, which are never modified.
const reportFull=vm.runInContext(`r=runImport([{name:'more',text:''}]);importReportHTML(r)`,ctx);assert(reportFull.includes('nothing was stored'));
const ctx2=boot(storage);await wait(60);
assert.equal(vm.runInContext('JSON.stringify(opponentProfiles)',ctx2),ctx.snapAfter,'reload reproduces the same profile counts');
assert.equal(vm.runInContext('importedSpotList().length',ctx2),vm.runInContext('importedSpotList().length',ctx));
assert(Object.keys(storage).includes('gtoTrainer.importedSpots.v1')&&Object.keys(storage).includes('gtoTrainer.profileDeltas.v1'));
assert.equal(hashData(),dataBefore,'bundled JSON files unchanged');
// 9. Backup round trip, then removing the import restores the bundled numbers exactly.
const backup=vm.runInContext('JSON.stringify({version:1,progress:[],mistakes:[],...exportExtras()})',ctx2),storage3={},ctx3=boot(storage3);await wait(60);ctx3.backup=backup;
await vm.runInContext('importProgress({text:async()=>backup})',ctx3);if(process.env.DBG)console.log(vm.runInContext('var o9=JSON.parse(backup);[validDeltas(o9.profileDeltas),Array.isArray(o9.importedSpots),o9.importedSpots.length,importRestoreData(o9),profileDeltas.imports.length,importApplyError].join(" | ")',ctx3));assert.equal(vm.runInContext('JSON.stringify(opponentProfiles)',ctx3),ctx.snapAfter,'backup restores imports');
vm.runInContext('removeImport(profileDeltas.imports[0].id)',ctx2);assert.equal(vm.runInContext('JSON.stringify(opponentProfiles)',ctx2),ctx.baseJSON,'removal restores bundled counts');assert.equal(vm.runInContext('importedSpotList().length',ctx2),0);
// 10. Acceptance criteria 6 and 7, on a clean import of the fixture under fresh hand IDs (+10000), in a fresh browser state.
const files0=Object.fromEntries(fs.readdirSync(__dirname+'/dist/data').map(f=>[f,fs.readFileSync(__dirname+'/dist/data/'+f)]));
const ctx4=boot({});await wait(60);ctx4.raw=raw;ctx4.audit=audit;
const ac=vm.runInContext(`(()=>{
 const lines=[],fresh=raw.replace(/Hand #2500000(\\d{5})/g,(m,d)=>'Hand #2500000'+String(Number(d)+10000).padStart(5,'0')),base=structuredClone(opponentProfiles);
 const r=runImport([{name:'80loss_11-5-fresh-ids',text:fresh}]);assert(r.stored&&r.parsed===150&&!r.unparseable.length&&!r.newPlayers.length);
 // AC6a: known hand #250000002299 (imported as #250000012299), expected values worked out by hand from the raw text.
 const k=importedSpotList().find(s=>s.source.psHandId===250000012299);
 assert.deepEqual({heroPos:k.heroPos,villainPos:k.villainPos,villain:k.villain,street:k.street,potBb:k.potBb,toCallBb:k.toCallBb,options:k.options,whatTigerDid:k.whatTigerDid,source:k.source,heroHand:k.heroHand,board:k.board,effectiveStackBb:k.effectiveStackBb,tableSize:k.tableSize},
  {heroPos:'BTN',villainPos:'SB',villain:'Ben',street:'flop',potBb:49,toCallBb:21,options:['fold','call','raise'],whatTigerDid:'call',source:{type:'hand_history',file:'80loss_11-5-fresh-ids',psHandId:250000012299},heroHand:['9d','Kc'],board:['9h','3s','6d'],effectiveStackBb:145,tableSize:4});
 assert.deepEqual(k.history,['Ruining (CO) calls 1.0bb','Tiger (BTN) calls 1.0bb','Ben (SB) raises to 7.0bb','Alex (BB) calls 6.0bb','Ruining (CO) calls 6.0bb','Tiger (BTN) calls 6.0bb','--- FLOP [9h 3s 6d]','Ben (SB) bets 21.0bb','Alex (BB) folds','Ruining (CO) folds']);assert(!('tableSizeNote' in k));
 lines.push('AC6 known hand #250000002299: heroPos BTN, villainPos SB (Ben), pot 49bb, to call 21bb, options fold/call/raise, whatTigerDid call, psHandId 250000012299, effective stack 145bb. All equal the hand-computed values ($24.50 pot and $10.50 to call at $0.50 big blind).');
 // AC6b: every countable stat moves by exactly the amount in the independent Python audit.
 const alias={'K Bon':'Alex','Crawfish':'Ruining'};let moved=0;
 for(const [log,a] of Object.entries(audit.players)){const name=alias[log]||log;for(const key of IMPORT_COUNTERS){const now=opponentProfiles.players[name].stats[key],was=base.players[name].stats[key];assert.equal(now.n-was.n,a.stats[key].n,name+' '+key+' n');assert.equal(now.num-was.num,a.stats[key].num,name+' '+key+' num');moved++}assert.equal(opponentProfiles.players[name].hands-base.players[name].hands,a.new_hands)}
 lines.push('AC6 stat amounts: '+moved+' counters across Ben, Alex, Tiger, Ruining moved by exactly the audit amounts. Listed minimum stats (opportunities added / outcomes added / new total n):');
 for(const p of r.players)lines.push('  '+p.name+': '+['vpip','pfr','rfi','fold_to_3bet','cbet_flop','fold_to_cbet'].map(s=>{const u=p.updated.find(u=>u.stat===s);return s+' +'+u.added+'/+'+u.outcomes+'/'+u.n}).join(', '));
 // AC6c: second import of the same file.
 const before=JSON.stringify(opponentProfiles),spotsBefore=storage['gtoTrainer.importedSpots.v1'],r2=runImport([{name:'80loss_11-5-fresh-ids',text:fresh}]);
 assert(r2.parsed===0&&r2.duplicates===150&&!r2.stored);assert.equal(JSON.stringify(opponentProfiles),before);assert.equal(storage['gtoTrainer.importedSpots.v1'],spotsBefore);
 lines.push('AC6 second import of the same file: 150 of 150 skipped as duplicates, 0 parsed, counts and spots unchanged.');
 // AC7: both review causes, answered through the real handler.
 settings.tableSize=4;selectedMode=10;filters={kind:'Imported',grading:'exploit'};const pool=villainPool();
 for(const [label,pick] of [['matches no template',s=>s.status==='review'&&!s.template],['driver stat under n=100',s=>s.status==='review'&&s.template&&/has n=\\d+/.test(s.reviewReason)]]){
  const src=pool.find(pick);assert(src,'fixture has a spot that '+label);assert(!src.exploit&&src.status==='review');
  const s=structuredClone(src);s.gradingMode='review';const p0=progress.length,m0=JSON.stringify(mistakes),v0=villainProgress.length;
  session={index:0,total:1,used:new Set(),answers:[],current:s,feedback:null,reviewId:null};screen='session';answerVillain(s.options[0]);
  assert.equal(session.feedback.score,null);assert.equal(progress.length,p0);assert.equal(JSON.stringify(mistakes),m0);assert.equal(villainProgress.length,v0+1);assert.equal(villainProgress.at(-1).score,null);assert.equal(villainProgress.at(-1).classification,'review');
  assert(container.innerHTML.includes('Review hand')&&container.innerHTML.includes('Not scored')&&container.innerHTML.includes('What Tiger did:'));
  lines.push('AC7 '+label+': '+src.id+' ('+(src.driverStats.map(d=>d.label+' n='+d.n).join(', ')||'no driver stats')+') is in the Villain Study pool as review; answered: score null, XP rows +0, mistake queue unchanged, villain progress +1 row marked review.');
 }
 assert.equal(xpDisplay().includes(progress.length+' XP'),true);
 // Completion-report item 4: the import report for the fixture, as text.
 lines.push('','IMPORT REPORT (fixture 80loss_11-5 under fresh hand IDs)','Files read: '+r.files.length+' ('+r.files.map(f=>f.name+': '+f.found+' found, '+f.hands+' new').join('; ')+')','Hands parsed: '+r.parsed,'Skipped as unparseable: '+r.unparseable.length,'Duplicates skipped: '+r.duplicates,'New players seen: '+(r.newPlayers.map(p=>p.name).join(', ')||'none'),'Candidates created: '+(r.graded+r.review)+' ('+r.graded+' graded, '+r.review+' review)','Hands with no spot: '+r.noDecision+' no postflop hero decision, '+r.noHero+' without hero, '+r.untracked.length+' vs untracked player','whatTigerDid not mapped: '+(r.unmapped.map(u=>'Hand #'+u.hand+' -> '+u.id+' ('+u.action+'), spot created without it').join('; ')||'none'),'Per-player stat updates (stat: opportunities added, new total n):');
 for(const p of r.players){lines.push('  '+p.name+' (+'+p.hands+' hands, '+p.totalHands+' total): '+p.updated.map(u=>u.stat+' +'+u.added+' -> '+u.n).join('; '));if(p.noOpportunities.length)lines.push('    not updated, no opportunities in the import: '+p.noOpportunities.join(', '))}
 lines.push('Stats not updated, with reasons:');for(const x of r.notCountable)lines.push('  '+x.stat+': not observable as a count from raw text ('+x.why+')');lines.push('  '+r.absent.join(', ')+': all stats, player did not appear in the import');
 return lines.join('\\n')})()`,ctx4);
for(const [f,b] of Object.entries(files0))assert(b.equals(fs.readFileSync(__dirname+'/dist/data/'+f)),'bundled file changed: '+f);assert.equal(fs.readdirSync(__dirname+'/dist/data').length,Object.keys(files0).length);
ctx.out.push('',ac,'AC6 bundled JSON: all '+Object.keys(files0).length+' files in dist/data byte-identical after the imports.');
const html=ctx.mainReport;for(const need of ['Files read','Hands parsed','Duplicates skipped','Unparseable','Skipped as unparseable','Opportunities added','New total n','Stats not updated, with reasons','New players seen, not added','graded ·','review'])assert(html.includes(need),'report section: '+need);
console.log(ctx.out.join('\n'));console.log('PASS import: parser parity with the Python audit; duplicate protection (bundled range, earlier imports); additive counts for tracked players only; seed answers frozen and seed evidence refreshed; candidate schema and grading rule; review mode unscored; persistence on reload with bundled JSON untouched; backup round trip; removal.');
})().catch(e=>{console.error(e);process.exitCode=1});

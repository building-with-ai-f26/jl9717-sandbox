/* v23 presentation only: no grading, data, analytics, or storage mutations. */
function countLabel(n,unit='hand'){return `${n} ${unit}${n===1?'':'s'}`}
function dailyDisplayState(){const key=settings.tableSize===6?day():day()+':4',done=Math.min(2,daily[key]?.answers?.length||0);return {done,remaining:2-done,complete:done===2,label:done===2?'✓ Done today':done===1?'1 of 2 done':'2 spots remaining today'}}
function modeCardHTML(i){const state=i===6?dailyDisplayState():null,queue=i===4?mistakes.filter(m=>rowSize(m.spot)===settings.tableSize).length:null;return `<button ${i===6?'id="today-daily"':i===4?'id="today-review"':''} class="mode ${state?.complete?'mode-done':''}" data-mode="${i}"><h3>${modes[i][0]}</h3>${i===0?'<span class="mode-subtitle">Mixed warm-up</span>':''}<p>${i===0?'10 hands, every seat. Mixed spots drawn from the preflop trainers.':landingDescriptions[i]}</p>${state?`<span class="mode-state ${state.complete?'check-good':''}">${state.label}</span>${state.done===1?'<span class="source">1 spot remaining today</span>':''}${state.complete?mascotHTML('sleep','empty'):''}`:queue!==null?`<span class="mode-state">${countLabel(queue,'spot')} in review</span>${!queue?mascotHTML('sleep','empty'):''}`:''}</button>`}
function familyMenuHTML(){return `<section class="landing-modes" id="practice-modes" tabindex="-1"><section class="menu-family today-strip" aria-labelledby="family-today"><h2 id="family-today" class="eyebrow">TODAY</h2><div class="modes">${(typeof studyPlanCardHTML==='function'?studyPlanCardHTML():'')+[6,4].map(modeCardHTML).join('')}</div></section>${[['PREFLOP',[0,1,2,5,10]],['POSTFLOP',[3]],['EQUITY LAB',[9]],['STUDY',[8,7]]].map(([name,ids],index)=>`<section class="menu-family" aria-labelledby="family-${index}"><h2 class="eyebrow" id="family-${index}">${name}</h2><div class="modes">${ids.map(modeCardHTML).join('')}</div></section>`).join('')}</section>`}
function positionBreakdown(){return aggregate('position').filter(x=>['LJ','HJ','CO','BTN','SB','BB'].includes(x.name))}
function categoryBreakdown(){const rows=progress.filter(x=>rowSize(x)===settings.tableSize),categories=[['Preflop',x=>x.kind==='pre'||x.kind==='villain'&&villainData.spots.some(s=>s.id===x.hand&&ExploitRanges.isPre(s))],['Postflop',x=>x.kind==='post'||x.kind==='villain'&&villainData.spots.some(s=>s.id===x.hand&&!ExploitRanges.isPre(s))],['Equity Lab',x=>x.kind==='equity'],['Concepts',x=>x.kind==='quiz']];return categories.map(([name,match])=>{const a=rows.filter(match);return {name,n:a.length,score:a.reduce((sum,x)=>sum+x.score,0)/a.length,unit:name==='Concepts'?'question':'hand'}}).filter(x=>x.n)}
function mascotState(f){if(!f)return 'idle';if(f.grade==='Perfect'||f.grade===undefined&&f.score===1)return 'celebrate';if(f.score>0&&f.score<1)return 'nod';if(f.grade==='Blunder'||f.grade===undefined&&f.score===0)return 'ouch';return 'idle'}
function mascotHTML(state='idle',placement='table'){
 const labels={idle:'Tiger seated at the table',celebrate:'Tiger celebrating',ouch:'Tiger wincing',nod:'Tiger nodding',clear:'Tiger celebrating stage clear',sleep:'Tiger resting'};
 const head=tiger.slice(tiger.indexOf('>')+1,tiger.lastIndexOf('</svg>'));
 const eyes=state==='ouch'?'<path d="M4 7h1v1H4zm1 1h1v1H5zm0-1h1v1H5zm-1 1h1v1H4zm5-1h1v1H9zm1 1h1v1h-1zm0-1h1v1h-1zm-1 1h1v1H9z"/>':state==='celebrate'||state==='clear'?'<path d="M4 7h2v1H4zm-1 1h1v1H3zm3 0h1v1H6zm3-1h2v1H9zm-1 1h1v1H8zm3 0h1v1h-1z"/>':state==='nod'||state==='sleep'?'<path d="M3 8h3v1H3zm5 0h3v1H8z"/>':'<path d="M4 7h1v2H4zm5 0h1v2H9z"/>';
 return `<figure class="table-mascot mascot-${placement}" data-mascot-state="${state}" role="img" aria-label="${labels[state]}"><svg viewBox="0 0 24 30" shape-rendering="crispEdges" aria-hidden="true"><path fill="#151c16" d="M4 16h16v12H4z"/><path fill="#506642" d="M5 17h14v9H5z"/><path fill="#ed9b45" d="M7 15h10v9H7zM5 24h6v3H5zm8 0h6v3h-6z"/><path fill="#f2e7bf" d="M10 17h4v6h-4z"/><path fill="#151c16" d="M7 17h2v1H7zm8 0h2v1h-2zM7 20h2v1H7zm8 0h2v1h-2zM4 28h2v2H4zm14 0h2v2h-2z"/><g transform="translate(4 ${state==='nod'?2:1})">${head}<path fill="#ed9b45" d="M3 7h4v2H3zm5 0h4v2H8z"/><g fill="#151c16">${eyes}</g></g><path fill="#ed9b45" d="${state==='celebrate'||state==='clear'?'M2 13h3v7H2zm17 0h3v7h-3z':'M5 18h3v4H5zm11 0h3v4h-3z'}"/><path fill="#f2e7bf" d="${state==='celebrate'||state==='clear'?'M2 12h3v2H2zm17 0h3v2h-3z':'M5 21h3v2H5zm11 0h3v2h-3z'}"/></svg>${placement==='table'?'<figcaption>TABLE TIGER</figcaption>':''}</figure>`;
}
function tablePresenceHTML(body,f){return `<div class="table-presence"><div class="table-presence-content">${body}</div><aside class="companion-seat">${mascotHTML(mascotState(f))}</aside></div>`}
function preflopContext(s){const seats=s.tableSize===4?['CO','BTN','SB','BB']:['LJ','HJ','CO','BTN','SB','BB'];if(s.spot==='RFI')return `${s.hero} opening first in, with ${seats.length-seats.indexOf(s.hero)-1} ${seats.length-seats.indexOf(s.hero)-1===1?'player':'players'} behind`;if(s.spot==='Facing a Limp')return `${s.hero} facing ${s.villain}’s limp to 1bb`;if(s.spot==='SB vs BB iso-raise')return `${s.hero} facing ${s.villain}’s iso-raise to 4bb after limping`;if(s.spot==='Facing a 3-Bet')return `${s.hero} facing ${s.villain}’s 3-bet to ${s.threeSize}bb after opening to ${s.openSize}bb`;if(s.spot==='Facing a 4-Bet')return `${s.hero} facing ${s.villain}’s 4-bet`;return `${s.hero} facing ${s.villain}’s open to ${s.openSize}bb`}
function frequencyText(f){return Number((100*f).toFixed(4))+'%'}
function handClassLabel(hand){return hand.length===2?'pair':hand.endsWith('s')?'suited hand':'offsuit hand'}
function preflopReason(s){
 const h=s.hand||'', ranks='23456789TJQKA', hi=ranks.indexOf(h[0]), lo=ranks.indexOf(h[1]);
 const pair=h.length===2, suited=h.endsWith('s'), connected=suited&&hi-lo<=2;
 const texture=pair?(hi>=8?'high pair':'small pair'):connected?'connected suited hand':suited?'suited hand':lo>=8?'offsuit broadway':'offsuit hand';
 const seats=['LJ','HJ','CO','BTN','SB','BB'];
 const order=p=>p==='SB'?-2:p==='BB'?-1:seats.indexOf(p);
 const relation=s.spot==='RFI'?`first in from ${s.hero}`:`${order(s.hero)>order(s.villain)?'in':'out of'} position from ${s.hero} against ${s.villain}`;
 const best=Object.entries(s.frequencies||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
 const fold=best==='Fold', passive=['Call','Check','Limp'].includes(best);
 const price=s.spot==='Facing a 3-Bet'?s.threeSize:s.openSize;
 const faced=Number.isFinite(price)&&price>0?` facing ${price}bb`:'';
 const exposure=`${relation}${s.spot==='RFI'?'':faced}`;
 let claim;
 if(s.spot==='RFI'){
  claim=fold?'folding avoids opening into stronger hands behind':best==='Limp'?'completing keeps the pot small':'opening can win the blinds or build a pot when called';
 }else if(s.spot==='Facing a Limp'){
  claim=best==='Check'?'checking takes the free flop':'isolating builds value and puts pressure on the limper';
 }else if(s.spot==='SB vs BB iso-raise'){
  claim=fold?'the price is too high to continue':passive?'calling keeps the pot from growing further':'limp-raising builds value or puts pressure on the isolation range';
 }else if(['Facing a 3-Bet','Facing a 4-Bet'].includes(s.spot)){
  claim=fold?'the tighter re-raising range makes domination too costly':passive?'calling keeps weaker hands in the re-raiser’s range':'re-raising builds value or pressures the opposing range with blockers';
 }else{
  claim=fold?'stronger pairs and kickers limit the value of defending':passive?'the price makes defending worthwhile':'3-betting builds value or pressures the opening range with blockers';
 }
 if(pair)return `With ${h}, a ${texture}, ${claim} ${exposure}.`;
 if(suited)return `For ${h}, a ${texture} ${exposure}, ${claim}.`;
 return `${exposure[0].toUpperCase()+exposure.slice(1)}, ${claim} with ${h} (${texture}).`;
}
function publicFeedbackCopy(text){return String(text||'').replace(/[^.!?]*strength tier unavailable[^.!?]*[.!?]?/gi,'').replace(/[^.!?]*not solver output[^.!?]*[.!?]?/gi,'').trim()}
function preflopExplanation(s){
 const entries=Object.entries(s.frequencies||{}).filter(([,f])=>f>0),mixed=entries.length>1;
 return `${preflopReason(s)} ${s.hand} · ${s.tableSize||settings.tableSize}-handed · ${preflopContext(s)}. ${mixed?'This is a mix:':'The chart uses'} ${entries.map(([a,f])=>actionLabel(s,a)+' '+frequencyText(f)).join(' · ')} when you hold this hand.`;
}
function resultCopy(rows){const scored=rows.filter(x=>Number.isFinite(x.score)),rate=scored.length?scored.reduce((n,x)=>n+x.score,0)/scored.length:0,mistakes=rows.filter(x=>x.score===0||(x.kind==='equity'&&x.score<1)).length;return {clear:scored.length>0&&rate>=.8,heading:scored.length===0?'Session complete':rate>=.8?'STAGE CLEAR':rate>=.5?'Session complete':'Tough session',text:scored.length===0?`Session complete. ${countLabel(mistakes,'mistake')} to review.`:rate>=.8?`Nicely played. ${countLabel(mistakes,'mistake')} to review.`:rate>=.5?`Session complete. ${countLabel(mistakes,'spot')} to review.`:`Tough session. The ${countLabel(mistakes,'mistake')} below ${mistakes===1?'is':'are'} where the learning is.`}}
function villainPreflopExplanation(s){
 const hand=ExploitRanges.handClass(s.heroHand),ctx=ExploitRanges.context(s),maps=exploitRangeMaps(s),cell=maps.exploit?.cells.find(c=>c.hand===hand),base=`${hand} (${handClassLabel(hand)}) · ${s.heroPos} vs ${s.villainPos} (${s.villain}), ${ctx.kind}${ctx.openSize?' · open '+ctx.openSize+'bb':''}${ctx.threeSize?' · 3-bet '+ctx.threeSize+'bb':''}`;
 if(!cell)return base+'. Specificity unavailable: no matching per-hand exploit map.';
 const frequencies=cell.frequencies,allocation=frequencies?Object.entries(frequencies).filter(([,f])=>f>0).map(([a,f])=>exploitActionLabel(s,a)+' '+frequencyText(f)).join(' · '):`${exploitActionLabel(s,cell.primary)} 100% primary grid allocation`;
 return `${base}. When you hold this hand: ${allocation}. Seeded preferred action: ${optionLabel(s.exploit.best)}; acceptable actions remain ${s.exploit.acceptable.map(optionLabel).join(' / ')}. The profile rule and seeded precedence decide this ${handClassLabel(hand)}’s allocation at these seats. ${cell.reachable?'':'This earlier-action node is not reached by the displayed range.'} ${!frequencies?'The pure grid allocation is a display construction, not a solved frequency or a change to acceptable-action grading.':''}`;
}

/* Build 4 presentation/content helpers. Internal actions, grading and data stay unchanged. */
function displayGrade(grade){return grade==='Blunder'?'Miss':grade}
function spotDisplayName(name){return villainData?.templates?.[name]?.title||String(name).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase())}
function sizingTipHTML(){let dismissed=false;try{dismissed=localStorage.getItem('gtoTrainer.sizingTip.dismissed')==='1'}catch{}return session?.index===0&&!dismissed?'<div class="sizing-tip"><span>Tip: number keys 1-5 pick a size.</span><button data-dismiss-sizing-tip aria-label="Dismiss sizing tip">Dismiss</button></div>':''}
document.addEventListener('click',e=>{if(!e.target.closest('[data-dismiss-sizing-tip]'))return;try{localStorage.setItem('gtoTrainer.sizingTip.dismissed','1')}catch{}e.target.closest('.sizing-tip')?.remove()});
function coverageNoticeHTML(){const rs=rangesFor(),n=settings.tableSize,missing=[];if(n===4&&!rs.some(d=>d.hero==='BTN'&&d.villain==='CO'&&d.spot==='Facing an Open'))missing.push('some open defenses');if(!rs.some(d=>d.spot==='Facing a 3-Bet'))missing.push('3-bet responses');if(!rs.some(d=>d.spot==='Facing a 4-Bet'))missing.push('4-bet responses');return missing.length?`<p class="coverage-note" role="note">${n}-handed coverage is partial: ${missing.join(' and ')} are not drilled yet. See Settings for the full missing-groups list.</p>`:''}
function villainStatLines(spot){
 const player=opponentProfiles?.players[spot.villain];
 // Seeded grading uses driverStats for evidence. Imported rules declare their own refs.
 const evidence=spot.driverStats||[];
 const refs=spot.importMeta
  ?(IMPORT_TEMPLATES[spot.template]?.refs||[]).map(key=>evidence.find(d=>d.ref.split('.').at(-1)===key)||{ref:key,label:importDriverLabels[key]||key})
  :evidence;
 const rows=refs.slice(0,3).map(driver=>{
  const path=driver.ref.split('.');
  const key=path.at(-1);
  const sizing=path.includes('sizing')||driver.value!==undefined;
  const stat=(sizing?player?.sizing:player?.stats)?.[key];
  const value=sizing?stat?.value:stat?.pct;
  return {label:driver.label,stat,value,sizing};
 });
 if(!rows.some(row=>row.stat?.n>0&&row.value!=null))return [`No graded stats for ${spot.villain} in this spot yet. Decide on the baseline line.`];
 return rows.map(({label,stat,value,sizing})=>{
  const prefix=`${spot.villain} · ${label}:`;
  if(!stat?.n||value==null)return `${prefix} (no data)`;
  if(stat.n<30)return `${prefix} not enough data (n=${stat.n})`;
  return `${prefix} ${value}${sizing?'bb':'%'} (n=${stat.n})`;
 });
}
function villainDecisionStats(s){
 return `<section class="villain-decision-stats" aria-label="Stats for this decision">${villainStatLines(s).map(line=>`<span>${esc(line)}</span>`).join('')}</section>`;
}
function loggedActionNote(s){
 if(!s.whatTigerDid||!s.exploit)return '';
 const text=String(s.whatTigerDid),verb=/^\s*(check|fold|call|raise|bet)/i.exec(text)?.[1]?.toLowerCase();
 const canonical=value=>{const a=String(value).toLowerCase().replace(/-/g,'');return a==='check_or_fold'?(s.toCallBb>0?'fold':'check'):a.startsWith('bet_')?'bet':a.startsWith('raise_')||a.includes('bet')&&a!=='bet'?'raise':a};
 let preferred=s.exploit.best,why=s.exploit.rule;
 if(s.gradingMode==='baseline'&&s.baseline){const frequencies=s.baseline.frequencies||{[s.baseline.action]:s.baseline.freq??1};preferred=Object.entries(frequencies).sort((a,b)=>b[1]-a[1])[0][0];why='the loaded baseline selects this action at this decision'}
 if(verb&&verb===canonical(preferred))return '';
 return `<p class="logged-action-note">In the real hand, Tiger ${esc(text)}; the ${s.gradingMode==='baseline'?'baseline':'exploit'} line here is ${esc(optionLabel(preferred))} because ${esc(why).replace(/[.]$/,'')}.</p>`;
}
const conceptDefinitions=[
 'The effective stack divided by the pot before the next betting decision.',
 'The average share of the pot a hand receives if the remaining cards are dealt repeatedly, before future betting choices.',
 'The probability-weighted money won minus the probability-weighted money lost across repeated decisions.',
 'A raise against one or more limpers intended to play a larger pot against a narrower field.',
 'Earlier folds can leave stronger cards in the remaining players’ hands, so a standard push calculation can be too loose.',
 'Multiply clean outs by two with one card to come, or by four with two cards to come, for a quick percentage estimate.',
 'Express all money amounts relative to the current pot so bet sizes can be compared across stakes.',
 'The fraction of folds needed for a pure bluff to break even, found by dividing the risk by risk plus reward.',
 'The share of a defending range that continues to keep an opponent’s zero-showdown bluffs from profiting automatically.',
 'At the boundary of a simplified defending range, its weakest continuing hand is approximately indifferent to folding.',
 'When another player may raise behind, the immediate price overstates how often a caller can reach showdown at that price.',
 'Potential later winnings help speculative hands, but position and future pressure determine how often their raw winning chances become money.',
 'An unopened pot permits a broader range than a pot where an earlier player has already chosen to continue.',
 'Hands near the boundary can split between actions rather than using the same action every time.',
 'A deliberately wider opening range can fold more often to a re-raise without forcing every added hand to defend.',
 'Outside the small blind, raising first in usually gains value and a chance to win immediately that simply calling gives up.',
 'First-in play in the small blind can split into raising, completing, and folding; completing may retain strong traps.',
 'At a passive table with little isolation and frequent multiway pots, speculative hands may profit from calling behind limpers.',
 'A big-blind re-raise can be stronger than a small-blind re-raise because the former can also call medium-strength hands.',
 'Against a polarized button re-raise, calling can retain its bluffs; the notes prefer less re-raising than against a cutoff.',
 'More raw winning probability does not automatically favor raising: narrowing the opposing range may reduce later profitability.',
 'When an early opener and a later re-raiser have different widths, the tighter player anchors the cold re-raising tier.',
 'Against opponents who call too often, use strong, broadly valuable re-raises; blocker-heavy bluffs need opponents to fold.',
 'Against Ben’s wide aggression and reluctance to fold, call more and reserve re-raises for value.'
];
function bareConceptDefinition(c){let text=conceptDefinitions[c.id]||c.text.replace(/^[^:]+:\s*/,''),aliases=[c.title.split(' (')[0],...Array.from(c.title.matchAll(/\(([^)]+)\)/g),m=>m[1])].filter(x=>x.length>1&&x.length<55);for(const term of aliases){const safe=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp('\\b'+safe+'\\b','gi'),'the concept')}return text}

const conceptSpots = [
 [0, "BTN calls preflop, leaving 48bb behind in a 12bb flop pot. Which number describes how much room the players have for future bets?", ["SPR of 4", "SPR of 5", "SPR of 3", "SPR of 6"], "The remaining 48bb covers the 12bb pot four times."],
 [1, "BB checks the turn and wins 18 of 50 equally likely rivers with no ties. What share of the pot belongs to BB on average if both check down?", ["36% equity", "18% equity", "50% equity", "64% equity"], "Eighteen wins out of 50 rivers produce a 36% share."],
 [2, "BTN bets $50 into $100 on the river and BB wins 40% when calling. What does calling earn relative to folding?", ["+$30 EV", "−$10 EV", "+$10 EV", "+$60 EV"], "Forty percent of the $150 available to win minus sixty percent of the $50 risk gives +$30."],
 [3, "CO calls 1bb and BTN makes it 5bb before either blind acts. How should BTN classify the raise?", ["Isolation raise", "Squeeze", "3-bet", "Cold 4-bet"], "BTN raises over a limp without any previous raise in the pot."],
 [4, "At a full table, six players fold before SB considers a marginal shove. A model that treats folded cards as random recommends shoving. What omitted effect can make that too loose?", ["Bunching effect", "Blocker effect", "Equity denial", "Range advantage"], "Earlier folds can remove disproportionate numbers of weak cards, changing the distribution left for BB."],
 [5, "BTN has nine clean outs after BB bets the turn. What is the quick estimate with only the river to come?", ["18% equity", "36% equity", "9% equity", "27% equity"], "Nine outs times two estimates the chance of hitting on the one remaining card."],
 [6, "BTN bets $12 into $24 at one table and $45 into $90 at another. How should both sizes be recorded for comparison?", ["Half pot", "Third pot", "Two-thirds pot", "Three-quarters pot"], "Both bets risk exactly one-half of the pot before the bet."],
 [7, "BTN risks 6bb to win a 12bb river pot with no showdown value. What fold rate makes this bet break even?", ["33⅓%", "25%", "50%", "66⅔%"], "The bluff risks 6bb out of the 18bb sum of risk and reward, so its alpha is 33⅓%."],
 [8, "SB bets 5bb into 10bb on the river. In the simplified model against a zero-equity bluff, how much of BB’s range must continue to deny auto-profit?", ["66⅔%", "25%", "33⅓%", "75%"], "The minimum defense frequency is the complement of the 5 ÷ 15 break-even fold rate."],
 [9, "On the river, BB’s weakest call earns 0bb versus folding, while stronger calls earn more. Which relationship has the range reached?", ["Indifference at the margin", "Range advantage", "Complete equity realization", "Polarization"], "The final continuing hand earns exactly the same as folding, so the two actions converge at the boundary."],
 [10, "BTN needs 20% equity at the current price, but calls only get through 70% of the time because BB may raise. Under the notes’ simplified adjustment, what threshold applies?", ["About 28.6%", "About 14%", "About 20%", "About 30%"], "Dividing the 20% immediate threshold by the 70% chance the price holds gives about 28.6%."],
 [11, "BB has a small pair and expects BTN to pay off a set, but often folds before showdown on misses. What best describes these two effects?", ["Implied odds and poor realization", "Direct odds and full realization", "Reverse implied odds and strong realization", "Fold equity and direct odds"], "Future payoff on hits improves implied odds, while being pushed off misses reduces realized equity."],
 [12, "CO can profitably open a marginal suited hand, but HJ has already raised. What changes the comparison for CO?", ["A stronger opposing distribution", "A weaker opposing distribution", "A looser opening threshold", "An unchanged entry threshold"], "HJ has already selected hands worth opening instead of holding an unrestricted random hand."],
 [13, "CO’s chart raises a hand 40% and folds it 60% in the same unopened spot. What role does that hand have?", ["Mixed threshold hand", "Pure value opener", "Pure open-fold", "Mandatory blocker bluff"], "Both listed actions have positive frequency at the boundary of CO’s range."],
 [14, "BTN adds marginal opens because the blinds fold too often, then faces a normal SB re-raise. How should the added hands affect BTN’s response in the notes?", ["Fold a larger share", "Call a larger share", "Re-raise a larger share", "Keep each action’s share fixed"], "The extra opens were profitable against folds, so BTN can release them after SB shows strength."],
 [15, "Everyone folds to CO, who puts in exactly 1bb without raising. Which action did CO take?", ["Open-limp", "Overlimp", "Cold-call", "Complete from the small blind"], "CO is first to enter voluntarily and only matches the big blind."],
 [16, "Action folds to SB, and the chart includes premiums among some 1bb completions. What purpose can that serve?", ["Protect the completing range", "Cap the completing range", "Give up the completing range", "Turn the completing range into pure value"], "Including strong hands lets SB complete weak hands without making the whole line weak."],
 [17, "Two players limp and BB rarely raises. BTN holds a small suited connector and expects a multiway pot. Which adjustment fits the notes?", ["Overlimp selectively", "Open-limp selectively", "Squeeze selectively", "Cold-call selectively"], "BTN can enter cheaply behind existing limpers when isolation pressure is low."],
 [18, "CO opens and sees a re-raise from either blind. In the notes, BB can flat medium hands more often than SB. Which adjustment follows?", ["Defend tighter against BB", "Defend wider against BB", "Defend equally against both", "Defend tighter against SB"], "BB’s ability to flat medium hands makes its re-raising range stronger in the notes’ comparison."],
 [19, "LJ opens and faces a polarized BTN re-raise rather than a CO re-raise. Which adjustment retains more of BTN’s weak hands?", ["Shift some re-raises to calls", "Shift some calls to re-raises", "Shift some calls to folds", "Shift some re-raises to folds"], "Calling lets BTN keep its weak re-raises instead of forcing them out."],
 [20, "CO could re-raise with a raw equity edge, but doing so folds weak hands and lets the opener jam back. Why can calling still win more?", ["Better equity realization", "More immediate fold equity", "Lower showdown equity", "A stronger opposing range"], "Calling can preserve weaker opponents’ hands and avoid a jam that denies access to future cards."],
 [21, "LJ opens to 2.5bb, BTN raises to 8bb, and BB has yet to act voluntarily. What is BB’s raise to 22bb called?", ["Cold 4-bet", "Squeeze", "Isolation raise", "Cold 3-bet"], "BB makes the fourth bet of the round after two other players raised."],
 [22, "CO calls re-raises too often. Which BTN construction best benefits from that tendency?", ["Linear value-heavy 3-bet", "Polarized value-and-bluff 3-bet", "Bluff-heavy 3-bet", "Flat-only defense"], "Strong adjacent hands gain value against CO’s wide calls while bluff-heavy raises seldom win immediately."],
 [23, "Ben re-raises often and rarely releases hands after raising. What adjustment fits a playable BTN hand at the margin between calling and bluff re-raising?", ["Call more and re-raise for value", "Bluff re-raise more and call less", "Fold more and bluff re-raise more", "Bluff re-raise more and value re-raise less"], "Calls retain Ben’s weak hands while value re-raises benefit from his reluctance to fold."],
 [3, "CO opens to 2.5bb and BTN makes it 8bb with no caller in between. What is BTN’s action?", ["3-bet", "Squeeze", "Isolation raise", "Cold 4-bet"], "BTN makes the first re-raise, following the big blind and CO’s open."],
 [3, "CO opens to 2.5bb, BTN calls, and SB raises to 12bb. What is SB’s action?", ["Squeeze", "Isolation raise", "Cold 4-bet", "Open raise"], "SB re-raises an opener and a caller, putting pressure on both ranges."],
 [21, "CO opens to 2.5bb, BTN raises to 8bb, and CO makes it 22bb. What is CO’s last action?", ["4-bet", "Cold 4-bet", "Squeeze", "5-bet"], "CO makes the fourth bet after already entering as the opener."],
 [11, "BTN opens to 2bb, SB folds, and BB calls 1bb with a modest suited hand that plays well after the flop. What chiefly justifies the call?", ["Defending on price", "Trapping with a premium", "Calling for set value", "Calling to induce a squeeze"], "BB pays only 1bb and closes the action with a hand that can make useful draws."],
 [12, "BTN calls CO with A9o and both pair their ace, but CO holds AJ. What problem does BTN face?", ["Domination", "A kicker tie", "An overpair", "A counterfeit pair"], "Both players share top pair, but CO’s higher kicker wins the comparison."],
 [20, "BTN calls a CO open, the blinds fold, and both players reach the flop. What is BTN’s positional relationship?", ["In position on all streets", "Out of position on all streets", "In position on the flop only", "In position on the river only"], "CO must act before BTN on every postflop street in this heads-up pot."],
 [1, "BB faces BTN’s 5bb bet into 10bb on the river. What share of the final pot does BB need to make calling break even?", ["25% pot odds", "33⅓% pot odds", "50% pot odds", "20% pot odds"], "BB pays 5bb for a final 20bb pot if it calls."],
 [22, "BTN holds top two pair and bets the river because BB often pays with one pair. What is the primary purpose?", ["Value bet", "Pure bluff", "Semi-bluff", "Block bet"], "BTN expects worse hands to call and add money to a pot BTN usually wins."],
 [22, "BTN misses a flush on the river and bets to make BB release a better pair. What is the action?", ["Pure bluff", "Thin value bet", "Semi-bluff", "Protection bet"], "There are no cards left to improve, so BTN relies on making a better hand fold."],
 [22, "BTN bets the turn with a flush draw and no pair, hoping BB folds immediately. What is the action?", ["Semi-bluff", "Pure bluff", "Thin value bet", "Block bet"], "BTN can win on a fold now or complete the flush after a call."],
 [7, "BTN bets a missed draw and BB folds a better hand. Which source of profit actually paid off?", ["Fold equity", "Showdown equity", "Implied odds", "Direct pot odds"], "BTN won by getting BB to give up the pot before showdown."],
 [12, "CO opens and BB calls. The flop is A-K-4 rainbow, and CO’s entire opening distribution has more strong holdings and higher average equity. What describes CO’s edge across all hands?", ["Range advantage", "Positional advantage", "Blocker advantage", "Sizing advantage"], "The advantage described is the higher average equity of CO’s distribution on this board."]
];

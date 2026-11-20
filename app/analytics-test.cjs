const fs=require('fs'),vm=require('vm'),assert=require('assert');let stored={},container={innerHTML:'',classList:{toggle(){}},querySelector(){return null}},ctx={console,structuredClone,Date,Math,Set,Map,Blob,URL,confirm:()=>false,setTimeout:()=>{},window:{scrollTo(){}},navigator:{},document:{querySelector(){return container},querySelectorAll(){return[]},getElementById(){return null},addEventListener(){},body:{classList:{toggle(){}},append(){}},createElement(){return{remove(){}}}},localStorage:{getItem:k=>stored[k]||null,setItem:(k,v)=>stored[k]=v},fetch:async p=>({json:async()=>JSON.parse(fs.readFileSync('dist/'+p))})};vm.createContext(ctx);for(let f of ['equity.js','equity-ui.js','spots.js','notebook.js','exploit-ranges.js','exploit-range-ui.js','villain-ui.js','presentation.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);setImmediate(()=>{vm.runInContext(`
const events=[];window.posthog={capture:(event,properties)=>events.push({event,properties})};
selectedMode=0;captureModeSelected();
if(events[0].event!=='mode_selected'||events[0].properties.mode!=='Quick Drill')throw Error('mode event');
for(const mode of [0,3,7,9,10]){selectedMode=mode;for(const score of [1,.5,0,null])captureDrillAnswered({score});}
const answered=events.filter(e=>e.event==='drill_answered');
if(answered.length!==15||answered.some((e,i)=>e.properties.correct!==(i%3===0)))throw Error('full/partial/miss/unscored');
session={answers:[{}]};captureDrillCompleted();captureDrillCompleted();
if(events.filter(e=>e.event==='drill_completed').length!==1)throw Error('duplicate completion');
session={answers:[]};captureDrillCompleted();
if(events.filter(e=>e.event==='drill_completed').length!==1)throw Error('empty completion');
for(const posthog of [undefined,{}, {capture(){throw Error('blocked')}}]){window.posthog=posthog;captureModeSelected();captureDrillAnswered({score:1});session={answers:[{}]};captureDrillCompleted();}
// Exercise actual answer handlers, not only the analytics helper.
const recorded=[];window.posthog={capture:(event,properties)=>recorded.push({event,properties})};
selectedMode=7;session={feedback:null,current:{kind:'quiz'},answers:[]};evaluate=()=>({score:.5});record=()=>{};feedbackBlip=()=>{};renderSession=()=>{};
answer(0);answer(0);if(recorded.length!==1||recorded[0].properties.correct!==false)throw Error('answer guard');
selectedMode=10;session={feedback:null,current:{kind:'villain_real'},answers:[]};SpotEngine.grade=()=>({score:1});recordVillain=()=>{};renderVillain=()=>{};
answerVillain('call');answerVillain('call');if(recorded.length!==2||recorded[1].properties.mode!=='Villain Study')throw Error('villain hook');
selectedMode=9;session={feedback:null,current:{kind:'equity',drill:'Count the Outs'},answers:[]};EquityMath.grade=()=>({score:0});renderEquity=()=>{};document.querySelector=()=>({value:'8',reportValidity:()=>true});
submitEquity();submitEquity();if(recorded.length!==3||recorded[2].properties.mode!=='Equity Lab')throw Error('equity hook');
`,ctx);console.log('PASS analytics: mode labels, full/partial/miss/unscored, one completion, empty guard, absent/blocked/throwing SDK, and actual answer handlers.');});

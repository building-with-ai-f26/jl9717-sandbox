/* Presentation only: all drill engines continue to receive big-blind values. */
(()=>{
 if(typeof document.createTreeWalker!=='function'||typeof MutationObserver==='undefined')return;
 const key='gtoTrainer.displayUnits.v1';let pref={dollars:false,sb:1,bb:2};
 try{const p=JSON.parse(localStorage.getItem(key));if(p&&Number.isFinite(p.sb)&&Number.isFinite(p.bb)&&p.sb>0&&p.bb>=p.sb)pref={dollars:p.dollars===true,sb:p.sb,bb:p.bb}}catch{}
 const originals=new WeakMap();
 const money=n=>'$'+(Math.round(n*pref.bb*100)/100).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
 function convert(text){return text.replace(/\b(\d+(?:\.\d+)?)(?:\s*([–−-])\s*(\d+(?:\.\d+)?))?\s*(?:bb|big blinds?)\b/gi,(_,n,d,end)=>end?money(+n)+'–'+money(+end):money(+n))}
 function save(){try{localStorage.setItem(key,JSON.stringify(pref))}catch{}}
 function refresh(){
  const root=document.querySelector('main.session');if(!root)return;
  // Concept quiz answers contain learning content, not live chip amounts.
  if(root.querySelector('.quiz'))return;
  let controls=root.querySelector('.display-units');if(!controls){controls=document.createElement('div');controls.className='display-units';controls.innerHTML='<button type="button" data-unit-toggle aria-pressed="false">Show dollars</button><label>Small blind $<input data-unit-sb aria-label="Small blind in dollars" type="number" min="0.01" step="0.01"></label><label>Big blind $<input data-unit-bb aria-label="Big blind in dollars" type="number" min="0.01" step="0.01"></label><span class="source">Display only</span>';root.querySelector('.session-head')?.after(controls);controls.querySelector('[data-unit-sb]').value=pref.sb;controls.querySelector('[data-unit-bb]').value=pref.bb}
  const toggle=controls.querySelector('[data-unit-toggle]');const label=pref.dollars?'Show BB':'Show dollars';if(toggle.textContent!==label)toggle.textContent=label;toggle.setAttribute('aria-pressed',String(pref.dollars));
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){
   if(node.parentElement.closest('.display-units,script,style,input,textarea,select'))continue;
   const remembered=originals.get(node);if(!remembered||node.nodeValue!==remembered.shown)originals.set(node,{base:node.nodeValue,shown:node.nodeValue});
   const item=originals.get(node),next=pref.dollars?convert(item.base):item.base;if(node.nodeValue!==next)node.nodeValue=next;item.shown=next;
  }
 }
 document.addEventListener('click',e=>{if(!e.target.closest('[data-unit-toggle]'))return;pref.dollars=!pref.dollars;save();refresh()});
 const updateBlinds=e=>{if(!e.target.matches('[data-unit-sb],[data-unit-bb]'))return;const box=e.target.closest('.display-units'),sb=+box.querySelector('[data-unit-sb]').value,bb=+box.querySelector('[data-unit-bb]').value;if(!(Number.isFinite(sb)&&Number.isFinite(bb)&&sb>0&&bb>=sb)){e.target.setCustomValidity('Use positive blinds with the big blind at least the small blind.');e.target.reportValidity();return}for(const input of box.querySelectorAll('input'))input.setCustomValidity('');pref.sb=sb;pref.bb=bb;save();refresh()};document.addEventListener('change',updateBlinds);document.addEventListener('input',e=>{if(e.target.matches('[data-unit-sb],[data-unit-bb]')&&Number(e.target.value)>0)updateBlinds(e)});
 const observer=new MutationObserver(()=>{observer.disconnect();try{refresh()}finally{observer.observe(document.getElementById('app'),{childList:true,subtree:true,characterData:true})}});observer.observe(document.getElementById('app'),{childList:true,subtree:true,characterData:true});refresh();
})();

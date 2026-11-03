import json,re,pathlib
from scipy.optimize import linprog
root=pathlib.Path(__file__).parent/'dist'; data=root/'data';data.mkdir(exist_ok=True)
ranks='AKQJT98765432'; hands=[a+b+('s' if i<j else 'o' if i>j else '') for i,a in enumerate(ranks) for j,b in enumerate(ranks)]
# Canonicalize the lower triangle to high-rank first.
hands=[a+b+'s' if i<j else b+a+'o' if i>j else a+b for i,a in enumerate(ranks) for j,b in enumerate(ranks)]
def combos(h):return 6 if len(h)==2 else 4 if h.endswith('s') else 12
def strength(h):
 a,b=[14-ranks.index(x) for x in h[:2]]
 return (a*3+25 if a==b else a*2+b+(5 if h.endswith('s') else 0)+(4 if a-b==1 else 0)+(4 if a==14 else 0))
def expand(s):
 out=set()
 for token in s.split(', '):
  if '+' not in token:out.add(token);continue
  t=token[:-1];a,b=t[:2]
  if len(t)==2:out|={r+r for r in ranks[:ranks.index(a)+1]}
  else:out|={a+r+t[-1] for r in ranks[ranks.index(a)+1:ranks.index(b)+1]}
 return out
seeds=['66+, A3s+, K8s+, Q9s+, J9s+, T9s, ATo+, KJo+, QJo','55+, A2s+, K6s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, ATo+, KTo+, QTo+','33+, A2s+, K3s+, Q6s+, J8s+, T7s+, 97s+, 87s, 76s, A8o+, KTo+, QTo+, JTo','33+, A2s+, K2s+, Q3s+, J4s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, A4o+, K8o+, Q9o+, J9o+, T8o+, 98o'];seeds.append(seeds[-1])
datasets=[]
def save(d):
 d.update(game="No-Limit Hold'em cash; no rake",stack=100)
 for c in d['cells']:
  c['frequency']=max(c['frequencies'].values()); c['action']=max(c['frequencies'],key=c['frequencies'].get)
 (data/(d['id']+'.json')).write_text(json.dumps(d,indent=2));datasets.append(d)
rfi={}
for pos,seed,target in zip(['LJ','HJ','CO','BTN','SB'],seeds,[17.6,22.3,29.1,43.6,43.5]):
 chosen=expand(seed);before=sum(combos(h) for h in chosen)/13.26; changes=[]
 # Respect original hand lists, adjust weakest suited K/Q first; only use other border hands if needed.
 while abs(sum(combos(h) for h in chosen)/13.26-target)>0.75:
  remove=sum(combos(h) for h in chosen)/13.26>target
  candidates=[h for h in hands if (h in chosen)==remove and len(h)==3]
  if pos=='SB' and remove:candidates=[h for h in candidates if h.endswith('o')]
  else:
   kq=[h for h in candidates if h.endswith('s') and h[0] in 'KQ']
   if kq:candidates=kq
  h=min(candidates,key=strength) if remove else max(candidates,key=strength)
  if remove:chosen.remove(h)
  else:chosen.add(h)
  changes.append(('removed ' if remove else 'added ')+h)
 rfi[pos]=chosen
 save(dict(id='rfi-'+pos,spot='RFI',hero=pos,villain=None,targets={'Raise':target},source='Pokalab targets · PokerTube hand-list seed',label='Published seed, simplified and adjusted',notes=f'Seed {before:.2f}%; target {target}%. Adjustments: '+(', '.join(changes) or 'none')+('. SB excludes published limps; raise-or-fold subset.' if pos=='SB' else ''),cells=[dict(hand=h,frequencies={'Raise':1 if h in chosen else 0,'Fold':0 if h in chosen else 1}) for h in hands]))
# Construct 3-action distributions with exact combo-weighted marginal targets.
def construct(id,spot,hero,villain,targets,allowed=None,fixed=None,source='',notes=''):
 acts=list(targets);weights=[combos(h)*(1 if allowed is None or h in allowed else 0) for h in hands];den=sum(weights);n=len(hands);cost=[];bounds=[]
 for h,w in zip(hands,weights):
  st=strength(h);suited=h.endswith('s');pair=len(h)==2
  for a in acts:
   if a in ['Raise','4-Bet','3-Bet']:v=-st-(6 if h in ['A5s','A4s','A3s','65s','76s','87s','98s','T9s'] else 0)
   elif a=='Call':v=-st*.65-(8 if suited or pair else 0)
   else:v=0
   cost.append(v*max(w,1));bound=(0,1)
   if not w:bound=(1,1) if a=='Fold' else (0,0)
   if fixed and h in fixed and a in fixed[h]:bound=(fixed[h][a],fixed[h][a])
   bounds.append(bound)
 eq=[];b=[]
 for i in range(n):eq.append([1 if k//len(acts)==i else 0 for k in range(n*len(acts))]);b.append(1)
 for j,a in enumerate(acts):eq.append([weights[k//len(acts)] if k%len(acts)==j else 0 for k in range(n*len(acts))]);b.append(targets[a]/100*den)
 sol=linprog(cost,A_eq=eq,b_eq=b,bounds=bounds,method='highs');assert sol.success,(id,sol.message)
 cells=[dict(hand=h,frequencies={a:round(float(sol.x[i*len(acts)+j]),8) for j,a in enumerate(acts)}) for i,h in enumerate(hands)]
 save(dict(id=id,spot=spot,hero=hero,villain=villain,targets=targets,denominator='opener range' if allowed else 'all hands',eligible=list(allowed) if allowed else hands,source=source,label='Constructed from published frequencies · heuristic allocation',notes=notes,cells=cells))
positions=['LJ','HJ','CO','BTN','SB','BB']
for vi,vill in enumerate(positions[:-1]):
 for hero in positions[vi+1:]:
  fixed={};three=6.5 if vill in ['LJ','HJ'] else 10 if vill=='CO' else 15;call=3 if hero=='BTN' else 14 if hero=='BB' else 4
  src='Beyond GTO · Appendix A2 aggregate bands';notes='Seat-specific target selected within the published 3-bet band; call allocation and individual hands are heuristic, not a solved matchup.'
  if hero=='BTN' and vill=='CO':
   three=12.5;call=3;src='Poker Academy · BTN vs CO named frequencies; remaining allocation heuristic'
   for h in ['AA','KK','QQ','AKs','AQs','AKo']:fixed[h]={'3-Bet':1,'Call':0,'Fold':0}
   for h,f in [('AJo',.95),('KJs',.86),('KQo',.84),('T9s',.87),('65s',.85)]:fixed[h]={'3-Bet':f,'Call':0,'Fold':1-f}
   for h in ['A8s','A7s','A6s','A5s','A4s','A3s']:fixed[h]={'3-Bet':.85,'Call':0,'Fold':.15}
   for h,f in [('ATs',.74),('AJs',.54)]:fixed[h]={'Call':f,'3-Bet':1-f,'Fold':0}
   notes='A8s–A3s use 85% within the published 77–99% band (heuristic selection); residual cells are constructed. Named hand frequencies retained.'
  construct('open-'+hero+'-'+vill,'Facing an Open',hero,vill,{'3-Bet':three,'Call':call,'Fold':100-three-call},fixed=fixed,source=src,notes=notes)
for pos in positions[:-1]:
 # Rates refer to hands opened, not all 1,326 combinations.
 allowed=rfi[pos];den=sum(combos(h) for h in allowed);core=expand('QQ+, AKs, AKo');four=max(16,100*sum(combos(h) for h in core)/den+.5);fold=25
 fixed={h:{'4-Bet':1,'Call':0,'Fold':0} for h in core}
 construct('three-'+pos,'Facing a 3-Bet',pos,'BTN' if pos not in ['BTN','SB'] else 'BB',{'4-Bet':four,'Call':100-fold-four,'Fold':fold},allowed,fixed,'Beyond GTO · aggregate response bands','Conditional on the opening range. 25% fold and 16% 4-bet chosen from the published bands; per-hand distribution is heuristic. Tiger’s UTG study-note frequencies are taught separately, not substituted for this chart.')
(data/'index.json').write_text(json.dumps([{'id':d['id'],'spot':d['spot'],'hero':d['hero'],'villain':d['villain']} for d in datasets]))
# Preserve every A5 bullet as its own study card.
spec=(pathlib.Path(__file__).parent/'docs'/'build-spec.md').read_text();a5=spec.split('**A5. Study content pack')[1].split('## Appendix B')[0];group='';cards=[]
for line in a5.splitlines():
 if line.startswith(('Concepts:','Math:','Preflop heuristics:','Position principles:','Personal Exploit Notes')):group=line.split(':')[0].title()
 if line.startswith('- '):
  text=line[2:];title=text.split(':')[0] if ':' in text[:100] else text.split('.')[0];title=title[:100]
  cards.append(dict(id=len(cards),group=group,title=title,text=text,source="Tiger's study notes",label='Personal exploit notes, not GTO' if group.startswith('Personal') else 'Personal notes, not solver output'))
(data/'learn.json').write_text(json.dumps(cards,indent=2))
sources=spec.split('## Appendix B: Sources')[1].split('## Out of scope')[0];(data/'sources.json').write_text(json.dumps([x[2:] for x in sources.splitlines() if x.startswith('- ')]))
print('Generated',len(datasets),'grids;',len(cards),'study cards')
for d in datasets:
 if d['spot']=='RFI':print(d['hero'],sum(combos(c['hand'])*c['frequencies']['Raise'] for c in d['cells'])/13.26,d['notes'])

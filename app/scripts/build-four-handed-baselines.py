"""Encode the user-supplied 2026-11-04 baseline spec; no solver claims."""
import json
from pathlib import Path
ranks='AKQJT98765432'
hands=[a+b if i==j else a+b+'s' if i<j else b+a+'o' for i,a in enumerate(ranks) for j,b in enumerate(ranks)]
def expand(text):
 out=set()
 for token in text.replace(' ','').split(','):
  if not token: continue
  if '-' in token:
   a,b=token.split('-')
   if len(a)==2: out.update(r+r for r in ranks[min(ranks.index(a[0]),ranks.index(b[0])):max(ranks.index(a[0]),ranks.index(b[0]))+1])
   else:
    assert a[0]==b[0] and a[2]==b[2]
    out.update(a[0]+r+a[2] for r in ranks[min(ranks.index(a[1]),ranks.index(b[1])):max(ranks.index(a[1]),ranks.index(b[1]))+1])
  elif token.endswith('+'):
   a=token[:-1]
   if len(a)==2: out.update(r+r for r in ranks[:ranks.index(a[0])+1])
   else: out.update(a[0]+r+a[2] for r in ranks[ranks.index(a[0])+1:ranks.index(a[1])+1])
  else: out.add(token)
 assert out<=set(hands),out-set(hands)
 return out
rows=[
 ('CO',None,'22+, A2s+, A7o+, K6s+, K9o+, Q8s+, QTo+, J8s+, JTo, T8s+, 98s, 97s+, 87s, 86s+, 76s, 75s+, 65s, 64s+, 54s',''),
 ('BTN',None,'22+, A2s+, A2o+, K2s+, K7o+, Q6s+, Q8o+, J7s+, J8o+, T7s+, T8o+, 97s+, 98o, 87s, 86s+, 76s, 75s+, 65s, 64s+, 54s, 53s+, 43s',''),
 ('SB',None,'22+, A2s+, A2o+, K5s+, K9o+, Q7s+, Q9o+, J8s+, J9o+, T8s+, T9o, 98s, 97s+, 87s, 86s+, 76s, 75s+, 65s, 64s+, 54s, 53s+',''),
 ('SB','CO','JJ+, AQs+, AKo, ATs, A2s-A5s, KQs',''),
 ('SB','BTN','TT+, AJs+, AQo+, A2s-A5s, KQs, QJs',''),
 ('BB','CO','JJ+, AQs+, AKo, A2s-A5s, KQs','22-TT, A2s-AJs, ATo-AQo, K9s+, KQo, Q9s+, QJo, J9s+, JTo, KTo, QTo, T8s+, 98s, 97s+, 87s, 86s+, 76s, 75s+, 65s, 64s+, 54s'),
 ('BB','BTN','TT+, AJs+, AQo+, AKs, A2s-A5s, KQs, QJs','22-99, A2s-ATs, A9o-AJo, K8s+, K9o+, Q8s+, Q9o+, J8s+, J9o+, T8s+, T9o, 97s+, 98o, 87s, 86s+, 76s, 75s+, 65s, 64s+, 54s, 53s+, 43s'),
 ('BB','SB','TT+, AJs+, AQo+, AKs, A2s-A5s, KQs','22-99, A2s-ATs, A8o-AJo, K7s+, K9o+, Q7s+, Q9o+, J7s+, J9o+, T7s+, T9o, 97s+, 98o, 87s, 86s+, 76s, 75s+, 65s, 64s+, 54s, 53s+, 43s, 32s')]
combo=lambda h:6 if len(h)==2 else 4 if h.endswith('s') else 12
result=[]
for hero,villain,raise_text,call_text in rows:
 aggressive=expand(raise_text); calls=expand(call_text)-aggressive
 action='3-Bet' if villain else 'Raise'; actions=[action]+(['Call'] if hero=='BB' else [])+['Fold']
 cells=[]
 for hand in hands:
  chosen=action if hand in aggressive else 'Call' if hand in calls else 'Fold'
  cells.append(dict(hand=hand,action=chosen,frequencies={a:int(a==chosen) for a in actions}))
 totals={a:sum(combo(c['hand'])*c['frequencies'][a] for c in cells)/1326*100 for a in actions}
 d=dict(id='baseline-4-'+hero+('-vs-'+villain if villain else '-rfi'),tableSize=4,stackBb=100,rake=0,anteBb=0,hero=hero,villain=villain,spot='Facing an Open' if villain else 'RFI',label='Constructed baseline ranges',source='User-supplied four-handed baseline spec · 2026-11-04 · not solver output',notes='Constructed baseline ranges, not solver output. Listed hands use a single action; unlisted hands fold. Percentages are computed from the supplied hand lists, not approximate targets.',reason='Constructed baseline ranges, not solver output. This decision follows the supplied hand list for this exact seat and spot.',openSize=3 if villain=='SB' or not villain and hero=='SB' else 2.5,betSizes=[12 if villain=='SB' else 10] if villain else [3 if hero=='SB' else 2.5],targets=totals,cells=cells)
 if villain:d.update(pot=3.5 if villain=='SB' else 4,line=f'{villain} opens to {d["openSize"]}bb. Action is on you.')
 result.append(d)
 print(hero,('vs '+villain) if villain else 'RFI',', '.join(f'{a}: {n:.2f}%' for a,n in totals.items()))
# Spec v2, with the user's explicit overlap/reachability corrections.
def reset_grid(d, groups, eligible=None):
 actions=list(groups)
 seen=set()
 for a,group in groups.items():
  assert not seen & group,(a,seen & group)
  seen |= group
 assert seen==set(hands)
 d['cells']=[dict(hand=h,action=next(a for a,g in groups.items() if h in g),frequencies={a:int(h in g) for a,g in groups.items()}) for h in hands]
 if eligible is not None:
  d['eligible']=[h for h in hands if h in eligible]
  d['denominator']='limp range'
 den=sum(combo(h) for h in (eligible if eligible is not None else hands))
 d['targets']={a:sum(combo(h) for h in group if eligible is None or h in eligible)/den*100 for a,group in groups.items()}

sb=next(d for d in result if d['hero']=='SB' and d['spot']=='RFI')
raises=expand('66+, A2s+, A7o+, K9s+, KTo+, QTs+, QJo, J9s+, T8s+')-{'AA','KK','AKs'}
limps=expand('AA, KK, AKs, 22-55, K2s-K8s, Q2s-Q9s, J2s-J8s, T2s-T7s, 92s-97s, 82s-86s, 72s-75s, 62s-64s, 52s-53s, 42s-43s, 32s, A2o-A6o, K5o-K9o, Q6o-QTo, J7o-JTo, T7o-T9o, 96o-98o, 85o-87o, 75o-76o, 64o-65o, 54o, 87s, 76s, 65s')
assert not raises & limps
reset_grid(sb,{'Raise':raises,'Limp':limps,'Fold':set(hands)-raises-limps})
sb['notes']='Constructed baseline ranges, not solver output. Raise to 3bb; limp by completing to 1bb. AA, KK and AKs limp as traps. KTo raises; 87s, 76s and 65s limp. SB acts out of position postflop against BB.'
sb['reason']=sb['notes']

iso=expand('77+, A7s+, A9o+, A2s-A5s, KTs+, KQo, QJs, JTs, 87s, 76s')
bb=dict(id='baseline-4-BB-vs-SB-limp',tableSize=4,stackBb=100,rake=0,anteBb=0,hero='BB',villain='SB',spot='Facing a Limp',openSize=1,betSizes=[4],pot=2,line='Folded to SB, who completes to 1bb. Check to see a free flop, or iso-raise to 4bb total.',label='Constructed baseline ranges',source='User-supplied no-rake limp and check spec · 2026-11-04 · not solver output',notes='Constructed baseline ranges, not solver output. BB iso-raises to 4bb total with listed hands and checks every other hand. Checking is free; BB never folds against the limp.',reason='Checking sees a free flop. The constructed baseline iso-raises the listed hands to 4bb total and checks all others.')
reset_grid(bb,{'Raise':iso,'Check':set(hands)-iso})
result.append(bb)

reraises=expand('AA, KK, AKs, A3o')
calls=expand('22-55, A2o, A4o-A6o, K5s-K8s, Q7s-Q9s, J8s, T7s, 97s, 87s, 76s, 65s, K9o, QTo, JTo, T9o, 98o')
assert (reraises|calls)<=limps
response=dict(id='baseline-4-SB-vs-BB-iso',tableSize=4,stackBb=100,rake=0,anteBb=0,hero='SB',villain='BB',spot='SB vs BB iso-raise',openSize=1,threeSize=4,betSizes=[12],pot=5,line='You completed to 1bb. BB iso-raises to 4bb total. Fold, call 3bb more, or limp-raise to 12bb total.',label='Constructed baseline ranges',source=bb['source'],notes='Constructed baseline ranges, not solver output. Only hands in the SB limp range reach this node; dim cells are outside that range. Raise means limp-raise to 12bb total (a constructed 3× sizing); Call means limp-call 3bb more. KTo never limps and cannot reach this node. SB acts out of position postflop.',reason='The constructed SB limp response traps with AA, KK and AKs and adds A3o as a limp-raise. Listed continuing hands limp-call; the remaining SB limp range folds. SB acts out of position postflop.')
reset_grid(response,{'Raise':reraises,'Call':calls,'Fold':set(hands)-reraises-calls},limps)
result.append(response)
print('Spec v2 SB first-in:',sb['targets'])
print('BB vs SB limp:',bb['targets'])
print('SB vs BB iso-raise (conditional on limp):',response['targets'])
Path('dist/data/four-handed-baselines.json').write_text(json.dumps(result,separators=(',',':'))+'\n')

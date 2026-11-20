"""Deterministic Nov 13 import; Tiger and the three tracked opponent profiles change."""
import ast,copy,hashlib,importlib.util,json,re,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('parser',ROOT/'scripts/import-hand-history.py');parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
raw=(ROOT/'data-imports/220win_Poker_Now_pglT4wkdb5ousO4_11-13.txt').read_text();hands,players=parser.parse(raw)
legacy=json.loads((ROOT/'data-imports/profiles-before-2026-11-13.json').read_text());profiles=copy.deepcopy(legacy)
assert len(hands)==127 and [int(h['id']) for h in hands]==list(range(250000002437,250000002564))
assert int(legacy['meta']['latest_session']['hand_id_max'])<int(hands[0]['id'])
for name in ['Alex','Ruining','Ben','Tiger']:
 p=players[name];target=profiles['players'][name];target['hands']+=p['hands']
 target['latest_session']={'date':'2026-11-13','source_file':'220win_Poker_Now_pglT4wkdb5ousO4_11-13.txt','log_name':name,'hands':p['hands'],'avg_table_size':p['avg_table_size'],'stats':p['stats'],'sizing':p['sizing']}
 for k in parser.COUNTERS:
  a=target['stats'][k];b=p['stats'][k];old_n=a['n'];a['num']+=b['num'];a['n']+=b['n'];a['pct']=round(100*a['num']/a['n'],1) if a['n'] else 0
  if 'benchmark_pct' in a and b['n']:a['benchmark_pct']=round((a['benchmark_pct']*old_n+p['benchmark_sums'][k])/a['n'],1);a['benchmark_approximate']=True
# Reuse the established numerical evidence refresher, without running the older build.
tree=ast.parse((ROOT/'scripts/import-hand-history.py').read_text());build=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='build')
for n in build.body:
 if isinstance(n,ast.FunctionDef) and n.name in ['stat_at','refresh_text']:exec(compile(ast.Module(body=[n],type_ignores=[]),'<existing evidence refresher>','exec'))
for name in ['Alex','Ruining','Ben','Tiger']:
 for note in profiles['players'][name]['study_notes']:
  refs=[note['stat_ref']]
  if refs[0].endswith('.fold_to_3bet'):refs.append(name.lower()+'.four_bet_vs_3bet')
  note['rule']=refresh_text(note['rule'],refs);st=stat_at(profiles,note['stat_ref']);note['n']=st['n'];note['status']='graded' if st['n']>=100 else 'lean' if st['n']>=30 else 'hidden'
spots=json.loads((ROOT/'data-imports/villain-seeds-before-2026-11-13.json').read_text())
for s in spots['spots']:
 if s['villain'] not in ['Alex','Ruining','Ben']:continue
 refs=[d['ref'] for d in s['driverStats']]
 for f in ['why','rule']:s['exploit'][f]=refresh_text(s['exploit'][f],refs)
 for d in s['driverStats']:
  st=stat_at(profiles,d['ref']);d['n']=st['n'];d['status']='graded' if st['n']>=100 else 'lean' if st['n']>=30 else 'hidden'
  d['value_pct' if 'value_pct' in d else 'value']=st['pct' if 'value_pct' in d else 'value']
  if 'benchmark_pct' in d:d['benchmark_pct']=st['benchmark_pct'];d['benchmark_approximate']=st.get('benchmark_approximate',False)
 s['status']='graded' if min(d['n'] for d in s['driverStats'])>=100 else 'lean' if min(d['n'] for d in s['driverStats'])>=30 else 'hidden'
profiles['meta'].update(hands_analyzed=2563,sessions=15,source='13 historical PokerNow sessions (May 24–Jun 27 2025), plus Nov 5 and Nov 13 2026 · 15 sessions · 2,563 unique hands',confirmed_aliases=parser.ALIASES,latest_session={'date':'2026-11-13','file':'220win_Poker_Now_pglT4wkdb5ousO4_11-13.txt','hands':127,'sha256':hashlib.sha256(raw.encode()).hexdigest(),'hand_id_min':hands[0]['id'],'hand_id_max':hands[-1]['id'],'seat_counts':dict(collections.Counter(h['seats'] for h in hands))})
profiles['caveats'][0]='Data covers 15 sessions and 2,563 unique hands, through Nov 13 2026. The latest game was 2–5-handed; actual seats and stack sizes are retained in the source audit.'
profiles['caveats'].append('Nov 13 updates Alex, Ruining, Ben and Tiger’s My leaks profile. Stephan is table context, not a new profile. Historical sizing medians and aggression ratios are not pooled from summary medians.')
for f,obj in [('dist/data/opponent_profiles.json',profiles),('dist/data/villain_spots_seed.json',spots)]: (ROOT/f).write_text(json.dumps(obj,indent=1)+'\n')
audit={'hands':len(hands),'pot_reconciled_hands':len(hands),'sha256':hashlib.sha256(raw.encode()).hexdigest(),'added':{n:players[n]['hands'] for n in ['Alex','Ruining','Ben','Tiger']},'excluded_profiles':['Stephan'],'players':players,'hand_ids':[h['id'] for h in hands]}
(ROOT/'data-imports/session-2026-11-13-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps(audit['added']))

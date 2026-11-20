"""Reproducible, additive import of PokerStars-format study logs.
Legacy numerators/denominators are retained. Rounded medians/AF are never pooled.
Raw logs and immutable legacy snapshot stay outside the public dist directory.
"""
import collections,copy,hashlib,json,re,statistics
from decimal import Decimal
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COUNTERS=['vpip','pfr','rfi','rfi_btn','rfi_sb','open_limp_when_first_in','iso_raise_vs_limp','bb_fold_vs_open','bb_3bet_vs_open','three_bet','fold_to_3bet','four_bet_vs_3bet','cbet_flop','barrel_turn','barrel_river','fold_to_cbet','raise_vs_cbet','fold_to_bet_flop','fold_to_bet_turn','fold_to_bet_river','check_raise','wtsd','wsd','showdown_weak_hands','river_aggression_weak_at_showdown','all_in_hands']
def cents(s):return int(Decimal(s)*100)
def weak(cards):
 ranks=["23456789TJQKA".index(c[0])+2 for c in cards];counts=collections.Counter(ranks)
 flush=any(sum(c[1]==s for c in cards)>=5 for s in 'shdc')
 rs=set(ranks);rs|={1} if 14 in rs else set();straight=any(set(range(n,n+5))<=rs for n in range(1,11))
 return not flush and not straight and max(counts.values())<=2 and sum(n==2 for n in counts.values())<=1

def parse(text):
 players={};hands=[];seen=set()
 def profile(name):
  if name not in players:players[name]={'hands':0,'seat_sum':0,'stats':{k:{'num':0,'n':0} for k in COUNTERS},'benchmark_sums':collections.defaultdict(float),'opens':[],'threebets':[],'bets':{s:[] for s in ['flop','turn','river']},'aggressive':0,'calls':0,'net_cents':0}
  return players[name]
 def count(name,key,yes):p=profile(name)['stats'][key];p['n']+=1;p['num']+=int(bool(yes))
 for block in re.split(r'(?=^PokerStars Hand #)',text,flags=re.M):
  if not block.startswith('PokerStars'):continue
  hid=re.match(r'PokerStars Hand #(\d+)',block)[1]
  if hid in seen:raise ValueError('Duplicate hand ID '+hid)
  seen.add(hid);header=block.split('*** HOLE CARDS ***')[0]
  seats={int(i):n for i,n,stack in re.findall(r'^Seat (\d+): (.*?) \(\$([\d.]+) in chips\)$',header,re.M)}
  if not seats:raise ValueError('Missing seats '+hid)
  button=seats[int(re.search(r'Seat #(\d+) is the button',header)[1])]
  sb=re.search(r'^(.*?): posts small blind \$([\d.]+)',header,re.M);bb=re.search(r'^(.*?): posts big blind \$([\d.]+)',header,re.M)
  if not bb:raise ValueError('Missing big blind '+hid)
  sb_name,bb_name=sb[1] if sb else None,bb[1];bb_amount=cents(bb[2]);names=set(seats.values())
  for n in sorted(names):p=profile(n);p['hands']+=1;p['seat_sum']+=len(names)
  active=set(names);allin=set();street='pre';contrib=collections.defaultdict(int);total=collections.defaultdict(int);wins=collections.defaultdict(int);vpip=set();pfr=set();flags=set();raises=0;opener=None;pre_aggressor=None;limpers=set();voluntary=False;checked=set();checkraise_seen=set();aggression=None;flop_cbet=None;turn_barrel=None;river_bettors=set();flop_seen=set();board=[];known={};events=[];unparsed=[]
  def pot():return sum(total.values())
  for line in block.split('*** SUMMARY ***')[0].splitlines()[2:]:
   if line.startswith('*** FLOP ***') or line.startswith('*** TURN ***') or line.startswith('*** RIVER ***'):
    street='flop' if 'FLOP' in line else 'turn' if 'TURN' in line else 'river'
    board=re.findall(r'\b[2-9TJQKA][shdc]\b',line)
    if street=='flop':flop_seen=active.copy()
    contrib=collections.defaultdict(int);checked=set();checkraise_seen=set();aggression=None;continue
   m=re.match(r'Dealt to (.*?) \[(.*?)\]',line)
   if m:known[m[1]]=m[2].split();continue
   m=re.match(r'Uncalled bet \(\$([\d.]+)\) returned to (.*)',line)
   if m:amount=cents(m[1]);total[m[2]]-=amount;contrib[m[2]]-=amount;continue
   m=re.match(r'(.*?) collected \$([\d.]+) from (?:side )?pot',line)
   if m:wins[m[1]]+=cents(m[2]);continue
   m=re.match(r'(.*?): shows \[(.*?)\]',line)
   if m:known[m[1]]=m[2].split();continue
   m=re.match(r'(.*?): (posts small blind|posts big blind|posts the ante|folds|checks|calls|bets|raises)(.*)',line)
   if not m:
    if ': ' in line and not line.startswith(('Seat ','Table ','PokerStars')) and not any(w in line for w in [': mucks',': doesn\'t show',': sits out',': is sitting out']):unparsed.append(line)
    continue
   name,action,tail=m.groups()
   if name not in names:raise ValueError('Unknown action player '+name+' '+hid)
   nums=re.findall(r'\$([\d.]+)',tail);amount=0
   if action.startswith('posts'):amount=cents(nums[0]);contrib[name]+=amount;total[name]+=amount;continue
   before=pot();facing=max(contrib.values(),default=0)-contrib[name]
   if street=='pre':
    if action in ['calls','raises']:vpip.add(name)
    if action=='raises':pfr.add(name)
    if not voluntary and ('rfi',name) not in flags:
     flags.add(('rfi',name));count(name,'rfi',action=='raises');count(name,'open_limp_when_first_in',action=='calls')
     if name==button:count(name,'rfi_btn',action=='raises')
     if name==sb_name:count(name,'rfi_sb',action=='raises')
    if raises==0 and limpers and ('iso',name) not in flags:
     flags.add(('iso',name));count(name,'iso_raise_vs_limp',action=='raises')
    if raises==1 and facing>0 and name!=opener and ('3bet',name) not in flags:
     flags.add(('3bet',name));count(name,'three_bet',action=='raises')
     if name==bb_name:count(name,'bb_fold_vs_open',action=='folds');count(name,'bb_3bet_vs_open',action=='raises')
    if raises==2 and name==opener and facing>0 and ('vs3bet',name) not in flags:
     flags.add(('vs3bet',name));count(name,'fold_to_3bet',action=='folds');count(name,'four_bet_vs_3bet',action=='raises')
   else:
    if facing>0:
     key='fold_to_bet_'+street;count(name,key,action=='folds');profile(name)['benchmark_sums'][key]+=aggression['benchmark']
     if street=='flop' and aggression.get('cbet'):
      count(name,'fold_to_cbet',action=='folds');count(name,'raise_vs_cbet',action=='raises')
     if name in checked and name not in checkraise_seen:
      checkraise_seen.add(name);count(name,'check_raise',action=='raises')
    if facing==0 and max(contrib.values(),default=0)==0 and (street,name) not in flags:
     flags.add((street,name))
     if street=='flop' and name==pre_aggressor:count(name,'cbet_flop',action=='bets')
     if street=='turn' and name==flop_cbet:count(name,'barrel_turn',action=='bets')
     if street=='river' and name==turn_barrel:count(name,'barrel_river',action=='bets')
    if action in ['bets','raises']:profile(name)['aggressive']+=1
    elif action=='calls':profile(name)['calls']+=1
   if action=='folds':active.remove(name)
   elif action=='checks':checked.add(name)
   elif action in ['calls','bets','raises']:
    if action=='raises':
     if len(nums)!=2:raise ValueError('Malformed raise '+hid+' '+line)
     amount=cents(nums[1])-contrib[name]
    else:amount=cents(nums[0])
    if amount<0:raise ValueError('Negative contribution '+hid)
    contrib[name]+=amount;total[name]+=amount
    if 'all-in' in tail:allin.add(name)
    if street=='pre':
     voluntary=True
     if action=='calls' and raises==0:limpers.add(name)
     if action=='raises':
      raises+=1;pre_aggressor=name
      if raises==1:opener=name;profile(name)['opens'].append(contrib[name]/bb_amount)
      if raises==2:profile(name)['threebets'].append(contrib[name]/bb_amount)
    elif action in ['bets','raises']:
     is_cbet=street=='flop' and name==pre_aggressor and aggression is None and action=='bets'
     aggression={'benchmark':100*amount/(before+amount),'cbet':is_cbet}
     if is_cbet:flop_cbet=name
     if street=='turn' and name==flop_cbet and action=='bets':turn_barrel=name
     if street=='river' and action=='bets':river_bettors.add(name)
     if action=='bets':profile(name)['bets'][street].append(100*amount/before)
   events.append({'player':name,'street':street,'action':action,'facing':facing,'amount':amount,'pot_before':before})
  if unparsed:raise ValueError('Unparsed action lines '+hid+': '+repr(unparsed))
  showdown=bool(len(active)>=2 and len(board)==5 and '*** SHOW DOWN ***' in block)
  for n in sorted(names):
   count(n,'vpip',n in vpip);count(n,'pfr',n in pfr);count(n,'all_in_hands',n in allin)
   if n in flop_seen:count(n,'wtsd',showdown and n in active)
   if showdown and n in active:
    count(n,'wsd',wins[n]>0)
    if n in known:
     is_weak=weak(known[n]+board);count(n,'showdown_weak_hands',is_weak)
     if n in river_bettors:count(n,'river_aggression_weak_at_showdown',is_weak)
   profile(n)['net_cents']+=wins[n]-total[n]
  summary_pot=re.search(r'^Total pot \$([\d.]+) \| Rake \$([\d.]+)',block,re.M)
  if not summary_pot or pot()!=cents(summary_pot[1]) or sum(wins.values())!=pot()-cents(summary_pot[2]):raise ValueError('Pot reconciliation failed '+hid+': '+str((pot(),sum(wins.values()),summary_pot.groups() if summary_pot else None)))
  if cents(summary_pot[2])!=0:raise ValueError('Expected no-rake game '+hid)
  hands.append({'id':hid,'players':sorted(names),'seats':len(names),'events':events,'pot_cents':pot(),'showdown':showdown})
 for n,p in players.items():
  for k,v in p['stats'].items():
   v['pct']=round(100*v['num']/v['n'],1) if v['n'] else 0
   if k in p['benchmark_sums'] and v['n']:v['benchmark_pct']=round(p['benchmark_sums'][k]/v['n'],1)
  total=p['aggressive']+p['calls'];p['stats']['aggression_factor']={'value':round(p['aggressive']/p['calls'],2) if p['calls'] else None,'n':total,'aggressive':p['aggressive'],'calls':p['calls']}
  median=lambda xs:round(statistics.median(xs),1) if xs else None
  p['sizing']={'open_raise_bb_median':{'value':median(p['opens']),'n':len(p['opens'])},'three_bet_bb_median':{'value':median(p['threebets']),'n':len(p['threebets'])},'bet_pct_pot_median':{s:median(xs) for s,xs in p['bets'].items()},'bets_counted':{s:len(xs) for s,xs in p['bets'].items()}}
  p['avg_table_size']=round(p['seat_sum']/p['hands'],1)
 return hands,players

ALIASES = {'K Bon': 'Alex', 'Crawfish': 'Ruining'}

def build():
 legacy=json.loads((ROOT/'data-imports/profiles-through-2025-06-27.json').read_text());profiles=copy.deepcopy(legacy)
 raw=(ROOT/'data-imports/80loss_11-5.txt').read_text();hands,new=parse(raw)
 legacy_ids=set(str(250000000000+i) for i in range(1,2287))
 assert len(hands)==150 and not legacy_ids.intersection(h['id'] for h in hands)
 for log_name,p in new.items():
  name=ALIASES.get(log_name,log_name)
  latest={'date':'2026-11-05','source_file':'80loss_11-5.txt','log_name':log_name,'hands':p['hands'],'avg_table_size':p['avg_table_size'],'stats':p['stats'],'sizing':p['sizing']}
  if name not in profiles['players']:
   profiles['players'][name]={'hands':p['hands'],'avg_table_size':p['avg_table_size'],'stats':p['stats'],'sizing':p['sizing'],'study_notes':[{'rule':f"Latest-session VPIP is {p['stats']['vpip']['pct']}% over {p['hands']} hands. This is a descriptive observation; no exploit drills have been constructed for this player yet.",'stat_ref':name.lower()+'.vpip','n':p['hands'],'status':'graded' if p['hands']>=100 else 'lean','template':None}],'identity_note':'Kept under the log name; no confirmed match in the saved alias map.','latest_session':latest}
   continue
  target=profiles['players'][name];target['hands']+=p['hands'];target['latest_session']=latest;target['historical_avg_table_size']=target['avg_table_size']
  for k in COUNTERS:
   a=target['stats'][k];b=p['stats'][k];old_n=a['n'];a['num']+=b['num'];a['n']+=b['n'];a['pct']=round(100*a['num']/a['n'],1) if a['n'] else 0
   if 'benchmark_pct' in a and b['n']:
    a['benchmark_pct']=round((a['benchmark_pct']*old_n+p['benchmark_sums'][k])/a['n'],1);a['benchmark_approximate']=True
  target['stats']['aggression_factor']['scope_note']='Historical sessions through Jun 27 2025; latest-session ratio is shown separately.'
  target['sizing']['scope_note']='Historical sessions through Jun 27 2025. Raw historical samples are unavailable; these medians are not pooled with the latest session.'
 # Refresh numerical references in descriptive notes and existing drills without changing answers.
 def stat_at(obj,ref):
  who,*path=ref.split('.');name=next(n for n in obj['players'] if n.lower()==who)
  value=obj['players'][name]
  for key in path:value=value[key] if key in value else value.get('stats',{}).get(key,value.get('sizing',{}).get(key))
  return value
 def refresh_text(text,refs):
  replacements={}
  for ref in refs:
   try:a=stat_at(legacy,ref);b=stat_at(profiles,ref)
   except (StopIteration,KeyError):continue
   if a.get('pct') is not None and b.get('pct') is not None:replacements[str(a['pct'])+'%']=str(b['pct'])+'%'
   replacements['n='+str(a['n'])]='n='+str(b['n'])
   if a.get('benchmark_pct') is not None and b.get('benchmark_pct') is not None:replacements[str(a['benchmark_pct'])+'%']=('~' if b.get('benchmark_approximate') else '')+str(b['benchmark_pct'])+'%'
  if not replacements:return text
  pattern=r'(?<![\d.])(?:'+'|'.join(re.escape(k) for k in sorted(replacements,key=len,reverse=True))+r')(?!\d)'
  return re.sub(pattern,lambda m:replacements[m.group()],text)
 for name,p in profiles['players'].items():
  if name not in legacy['players']:continue
  refs=[name.lower()+'.'+k for k in legacy['players'][name]['stats']]
  for note in p['study_notes']:
   note_refs=[note['stat_ref']]
   if note['stat_ref'].endswith('.fold_to_3bet'):note_refs.append(name.lower()+'.four_bet_vs_3bet')
   note['rule']=refresh_text(note['rule'],note_refs);st=stat_at(profiles,note['stat_ref']);note['n']=st['n'];note['status']='graded' if st['n']>=100 else 'lean' if st['n']>=30 else 'hidden'
 profiles['meta'].update(hands_analyzed=2436,sessions=14,source='13 historical PokerNow sessions (May 24–Jun 27 2025), plus 150 hands from Nov 5 2026 · 14 sessions · 2,436 unique hands',latest_session={'date':'2026-11-05','file':'80loss_11-5.txt','hands':150,'sha256':hashlib.sha256(raw.encode()).hexdigest(),'hand_id_min':hands[0]['id'],'hand_id_max':hands[-1]['id'],'seat_counts':dict(collections.Counter(h['seats'] for h in hands))},historical_avg_table_size=legacy['meta']['avg_table_size'])
 profiles['caveats']=['Data covers 14 sessions and 2,436 unique hands: May 24–Jun 27 2025 plus Nov 5 2026. The latest session was 2–4-handed; most hands were 3–4-handed and effective stacks vary.','Count-based percentages combine historical and latest-session opportunities. Historical average table sizes, aggression ratios and sizing medians are labeled separately; medians cannot be pooled from summaries.','Combined bluff benchmarks are approximate where the historical benchmark was already rounded. Benchmarks are break-even calculations, not solver output.','Confirmed aliases: K Bon is Alex; Crawfish is Ruining. Their latest-session hands are included in the corresponding existing profiles.','Stats are descriptive. Existing exploit answers remain rule-based, not solver-verified.']
 spots=json.loads((ROOT/'data-imports/villain-seeds-before-2026-11-05.json').read_text())
 for s in spots['spots']:
  refs=[d['ref'] for d in s['driverStats']]
  for field in ['why','rule']:s['exploit'][field]=refresh_text(s['exploit'][field],refs)
  for d in s['driverStats']:
   st=stat_at(profiles,d['ref']);d['n']=st['n'];d['status']='graded' if st['n']>=100 else 'lean' if st['n']>=30 else 'hidden'
   if 'value_pct' in d:d['value_pct']=st['pct']
   else:d['value']=st['value']
   if 'benchmark_pct' in d:
    d['benchmark_pct']=st['benchmark_pct']
    if st.get('benchmark_approximate'):d['benchmark_approximate']=True
  s['status']='graded' if min(d['n'] for d in s['driverStats'])>=100 else 'lean' if min(d['n'] for d in s['driverStats'])>=30 else 'hidden'
 (ROOT/'dist/data/opponent_profiles.json').write_text(json.dumps(profiles,indent=1)+'\n');(ROOT/'dist/data/villain_spots_seed.json').write_text(json.dumps(spots,indent=1)+'\n')
 audit={'session':'80loss_11-5.txt','hands':150,'historical_hands':2286,'combined_hands':2436,'dedupe':'Historical IDs verified against hand_id_map.csv: 250000000001–250000002286; new IDs 250000002287–250000002436. No overlap. Rebuild uses immutable snapshots, so rerunning cannot double-count.','confirmed_aliases':ALIASES,'players':{n:{'canonical_player':ALIASES.get(n,n),'new_hands':p['hands'],'seat_sum':p['seat_sum'],'stats':p['stats'],'sizing':p['sizing'],'net_cents':p['net_cents']} for n,p in new.items()},'pot_reconciled_hands':150,'all_rake_zero':True,'source_sha256':hashlib.sha256(raw.encode()).hexdigest()}
 (ROOT/'data-imports/session-2026-11-05-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
 print(json.dumps({n:{'hands_added':p['hands'],'vpip':p['stats']['vpip'],'pfr':p['stats']['pfr'],'three_bet':p['stats']['three_bet'],'net':p['net_cents']/100} for n,p in new.items()},indent=2))
 return hands,new,profiles
if __name__=='__main__':build()

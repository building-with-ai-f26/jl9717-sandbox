import contextlib,copy,importlib.util,io,json,subprocess,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('importer',Path(__file__).with_name('import-hand-history.py'));imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)
ROOT=Path(__file__).resolve().parents[1]
class ImportTest(unittest.TestCase):
 def setUp(self):
  self.raw=(ROOT/'data-imports/80loss_11-5.txt').read_text()
  self.hands,self.players=imp.parse(self.raw)
 def test_complete_and_reconciled(self):
  self.assertEqual(len(self.hands),150);self.assertEqual(len({h['id'] for h in self.hands}),150)
  self.assertEqual({n:p['hands'] for n,p in self.players.items()},{'Ben':150,'Tiger':149,'K Bon':149,'Crawfish':98})
  self.assertEqual(sum(p['net_cents'] for p in self.players.values()),0)
  self.assertEqual(self.players['Tiger']['net_cents'],-7952)
  self.assertEqual(sum(h['seats'] for h in self.hands),546)
  for p in self.players.values():
   for k,v in p['stats'].items():
    if 'num' in v:self.assertTrue(0<=v['num']<=v['n'],k)
 def test_duplicate_is_rejected(self):
  first=self.raw.split('PokerStars Hand #250000002288:')[0]
  with self.assertRaisesRegex(ValueError,'Duplicate'):imp.parse(first+first)
 def test_first_hand_manually_checked(self):
  first=self.raw.split('PokerStars Hand #250000002288:')[0];hands,p=imp.parse(first)
  self.assertEqual(p['Ben']['stats']['vpip']['num'],1);self.assertEqual(p['Tiger']['stats']['vpip']['num'],0)
  self.assertEqual(p['K Bon']['stats']['rfi'],{'num':1,'n':1,'pct':100.0})
  self.assertEqual(p['K Bon']['stats']['cbet_flop'],{'num':1,'n':1,'pct':100.0})
  self.assertEqual(p['Ben']['stats']['fold_to_cbet'],{'num':1,'n':1,'pct':100.0})
  self.assertEqual(p['Ben']['stats']['three_bet'],{'num':0,'n':1,'pct':0.0})
  self.assertEqual(p['K Bon']['sizing']['open_raise_bb_median'],{'value':12.5,'n':1})
  self.assertAlmostEqual(p['Ben']['benchmark_sums']['fold_to_bet_flop'],100*9.56/(12.75+9.56))
  self.assertEqual(p['K Bon']['net_cents'],650)
 def test_dead_small_blind_is_not_invented(self):
  hand=next(h for h in self.hands if h['id']=='250000002314')
  self.assertEqual(hand['seats'],3);self.assertNotIn('Tiger',hand['players']);self.assertEqual(hand['pot_cents'],2650)
 def test_showdown_categories(self):
  self.assertTrue(imp.weak('As Ad 2c 4h 7c 9d Jh'.split()))
  self.assertFalse(imp.weak('As Ad 2c 2h 7c 9d Jh'.split()))
  self.assertFalse(imp.weak('As 2d 3c 4h 5c 9d Jh'.split()))
  self.assertFalse(imp.weak('As 8s 2s 4s 7s 9d Jh'.split()))
 def test_additive_and_idempotent(self):
  with contextlib.redirect_stdout(io.StringIO()):_,_,new=imp.build()
  old=json.loads((ROOT/'data-imports/profiles-through-2025-06-27.json').read_text())
  self.assertEqual(new['meta']['hands_analyzed'],2436)
  for n in ['Rob']:self.assertEqual(new['players'][n],old['players'][n])
  self.assertEqual(set(new['players']),set(old['players']))
  self.assertNotIn('K Bon',new['players']);self.assertNotIn('Crawfish',new['players'])
  for n,log_name in [('Ben','Ben'),('Tiger','Tiger'),('Alex','K Bon'),('Ruining','Crawfish')]:
   self.assertEqual(new['players'][n]['hands'],old['players'][n]['hands']+self.players[log_name]['hands'])
   self.assertEqual(new['players'][n]['latest_session']['log_name'],log_name)
   for k in imp.COUNTERS:
    a,b,c=old['players'][n]['stats'][k],new['players'][n]['stats'][k],self.players[log_name]['stats'][k]
    self.assertEqual(b['n'],a['n']+c['n']);self.assertEqual(b['num'],a['num']+c['num'])
   for k,v in old['players'][n]['sizing'].items():self.assertEqual(new['players'][n]['sizing'][k],v)
  files=['dist/data/opponent_profiles.json','dist/data/villain_spots_seed.json','data-imports/session-2026-11-05-audit.json']
  first={f:(ROOT/f).read_bytes() for f in files}
  with contextlib.redirect_stdout(io.StringIO()):imp.build()
  self.assertEqual(first,{f:(ROOT/f).read_bytes() for f in files})
 def test_seeded_answers_remain_fixed(self):
  old=json.loads((ROOT/'data-imports/villain-seeds-before-2026-11-05.json').read_text());new=json.loads((ROOT/'dist/data/villain_spots_seed.json').read_text())
  self.assertEqual(len(old['spots']),len(new['spots']))
  for a,b in zip(old['spots'],new['spots']):
   for k in ['id','heroHand','history','options','template','villain','tableSize']:self.assertEqual(a[k],b[k])
   for k in ['best','acceptable','forbidden']:self.assertEqual(a['exploit'][k],b['exploit'][k])
if __name__=='__main__':unittest.main()

"""Extract factual cell actions from the source chart's raster grids.
Usage: python3 scripts/extract-fourmax.py /path/to/4-max-cash-game-ranges.pdf
Original artwork and PDF are not redistributed.
"""
import sys,json,hashlib
from pathlib import Path
from collections import Counter
import fitz,numpy as np,scipy.ndimage as ndi
from PIL import Image
from io import BytesIO
source=Path(sys.argv[1]);doc=fitz.open(source)
# Image IDs and legend combo totals transcribed from the source, not fitted targets.
# n = denominator of the displayed decision node, out of 1,326 initial combos.
charts=[
(2,'CO RFI','CO',None,'RFI',['Raise',None,'Fold'],{'Raise':390,'Fold':936},1326),
(3,'CO vs BTN 3-bet','CO','BTN','Facing a 3-Bet',['4-Bet','Call','Fold'],{'4-Bet':82,'Call':86,'Fold':222},390),
(4,'CO vs SB 3-bet','CO','SB','Facing a 3-Bet',['4-Bet','Call','Fold'],{'4-Bet':44,'Call':144,'Fold':202},390),
(5,'CO vs BB 3-bet','CO','BB','Facing a 3-Bet',['4-Bet','Call','Fold'],{'4-Bet':38,'Call':158,'Fold':194},390),
(6,'BTN RFI','BTN',None,'RFI',['Raise',None,'Fold'],{'Raise':602,'Fold':724},1326),
(7,'BTN vs CO RFI','BTN','CO','Facing an Open',['3-Bet','Call','Fold'],{'3-Bet':160,'Call':102,'Fold':1064},1326),
(8,'BTN vs SB 3-bet','BTN','SB','Facing a 3-Bet',['4-Bet','Call','Fold'],{'4-Bet':38,'Call':284,'Fold':280},602),
(9,'BTN vs BB 3-bet','BTN','BB','Facing a 3-Bet',['4-Bet','Call','Fold'],{'4-Bet':34,'Call':288,'Fold':280},602),
(12,'SB RFI','SB',None,'RFI',['Raise','Limp','Fold'],{'Raise':322,'Limp':504,'Fold':500},1326),
(13,'SB vs CO RFI','SB','CO','Facing an Open',['3-Bet',None,'Fold'],{'3-Bet':160,'Fold':1166},1326),
(14,'SB vs BTN RFI','SB','BTN','Facing an Open',['3-Bet',None,'Fold'],{'3-Bet':218,'Fold':1108},1326),
(15,'SB vs CO RFI / BTN 3-bet','SB','BTN','Cold 4-Bet',['4-Bet',None,'Fold'],{'4-Bet':74,'Fold':1252},1326),
(16,'SB limp vs BB raise','SB','BB','Limp Defense',['Raise','Call','Fold'],{'Raise':78,'Call':194,'Fold':228},500),
(17,'SB RFI vs BB 3-bet','SB','BB','Facing a 3-Bet',['4-Bet','Call','Fold'],{'4-Bet':38,'Call':92,'Fold':192},322),
(20,'BB vs CO RFI','BB','CO','Facing an Open',['3-Bet','Call','Fold'],{'3-Bet':144,'Call':458,'Fold':724},1326),
(21,'BB vs BTN RFI','BB','BTN','Facing an Open',['3-Bet','Call','Fold'],{'3-Bet':170,'Call':596,'Fold':560},1326),
(22,'BB vs SB limp','BB','SB','Limp Defense',['Raise','Check','Fold'],{'Raise':536,'Check':790,'Fold':0},1326),
(23,'BB vs SB RFI','BB','SB','Facing an Open',['3-Bet','Call','Fold'],{'3-Bet':218,'Call':640,'Fold':468},1326),
(24,'BB vs CO RFI / BTN 3-bet','BB','BTN','Cold 4-Bet',['4-Bet',None,'Fold'],{'4-Bet':74,'Fold':1252},1326),
(25,'BB vs BTN RFI / SB 3-bet','BB','SB','Cold 4-Bet',['4-Bet',None,'Fold'],{'4-Bet':88,'Fold':1238},1326),
]
ranks='AKQJT98765432';out=[]
for xref,title,hero,villain,spot,actions,expected,den in charts:
 im=Image.open(BytesIO(doc.extract_image(xref)['image'])).convert('RGB');a=np.asarray(im).astype(int)
 mask=(a.max(2)-a.min(2)>100)&(a.max(2)>150);labels,n=ndi.label(mask);objects=ndi.find_objects(labels)
 components=[(s[1].start,s[0].start,s[1].stop-s[1].start,s[0].stop-s[0].start) for s in objects if s[0].start<20 and s[1].stop-s[1].start>15 and s[0].stop-s[0].start>15]
 pitch=components[0][2]+4;left=components[0][0]-(pitch if xref==17 else 0);top=components[0][1]
 cells=[];counts=Counter()
 for i in range(13):
  for j in range(13):
   hand=ranks[i]+ranks[j] if i==j else ranks[min(i,j)]+ranks[max(i,j)]+('s' if i<j else 'o')
   x=left+j*pitch;y=top+i*pitch;sub=a[y+2:y+pitch-6,x+2:x+pitch-6];sat=(sub.max(2)-sub.min(2)>100)&(sub.max(2)>150)
   counts_px=[int(((sub.argmax(2)==channel)&sat).sum()) for channel in [0,2,1]]
   color=int(np.argmax(counts_px)) if max(counts_px)>sub.shape[0]*sub.shape[1]*.25 else None
   if color is None:action='Fold' if den==1326 else 'Not in range'
   else:action=actions[color]
   if action is None:raise ValueError((title,hand,'Unexpected color'))
   cells.append({'hand':hand,'action':action,'frequencies':{} if action=='Not in range' else {action:1}})
   if action!='Not in range':counts[action]+=6 if i==j else 4 if i<j else 12
 print(title,dict(counts),'expected',expected,'grid',left,top,pitch)
 assert dict(counts)=={k:v for k,v in expected.items() if v},(title,counts,expected)
 assert sum(counts.values())==den
 out.append({'id':'pc4-'+str(xref),'title':title,'hero':hero,'villain':villain,'spot':spot,'tableSize':4,'stackBb':100,'rake':{'pct':5,'capBb':1.5},'referenceOnly':True,'nodeCombos':den,'sourceCombos':expected,'cells':cells,'sourcePage':3 if xref<12 else 4 if xref<20 else 5})
result={'source':{'publisher':'PokerCoaching','title':'4-Max Implementable GTO Charts','url':'https://poker-coaching.s3.amazonaws.com/tools/preflop-charts/4-max-cash-game-ranges.pdf','listingUrl':'https://pokercoaching.com/tools_old/downloadable-preflop-charts/','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'retrieved':'2026-11-03','openBb':2.5,'sbOpenBb':3,'ipThreeBetBb':8.5,'oopThreeBetBb':10,'fourBetBb':23,'sbLimpRaiseBb':3.5,'bbVsSbThreeBetBb':9,'rakePct':5,'rakeCapBb':1.5,'ante':0},'charts':out}
Path('dist/data/four-handed-reference.json').write_text(json.dumps(result,indent=2)+'\n')

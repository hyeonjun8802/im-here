"""Assemble actually-captured screenshots next to target. Never fake game renders."""
from pathlib import Path
from PIL import Image,ImageDraw
base=Path(__file__).resolve().parent.parent
path=base/'docs/qa/character/actual_browser';out=base/'docs/qa/character'
items=['front.png','three_quarter.png','side.png','rain_front.png']
missing=[x for x in items if not (path/x).exists()]
if missing:raise SystemExit('Real game screenshots missing: '+str(missing)+'; run `npm run qa:browser-character` on a GPU-capable machine.')
ref=Image.open(base/'public/assets/character/ref/character_target.png').convert('RGB')
can=Image.new('RGB',(450*5,740),'#142128');d=ImageDraw.Draw(can)
for i,name in enumerate(['SOURCE TARGET']+items):
 img=ref if i==0 else Image.open(path/items[i-1]).convert('RGB')
 img.thumbnail((445,690))
 ox=i*450+(450-img.width)//2;can.paste(img,(ox,45+(690-img.height)//2));d.text((i*450+12,12),name,fill='#f0eee7')
out_file=out/'actual_browser_vs_target.png';can.save(out_file);print(out_file)

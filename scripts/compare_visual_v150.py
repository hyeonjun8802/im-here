"""Side-by-side visual audit sheet — NOT a quantitative similarity score.
Requires actual screenshots captured by qa_visual_v150.mjs on a running GPU browser.
"""
from PIL import Image,ImageOps,ImageDraw,ImageFont
from pathlib import Path
R=Path(__file__).resolve().parents[1];q=R/'docs/qa';live=q/'live-v150'
case='02_dusk'
ref=q/'reference_target_dawn.jpg';old=q/'reference_game_v140.jpg';now=live/(case+'.png')
if not now.exists():raise SystemExit('Missing REAL browser screenshot: '+str(now)+'\nRun npm run qa:visual-v150 first.')
if not ref.exists() or not old.exists():raise SystemExit('Missing reference files')
size=(510,600);out=Image.new('RGB',(510*3,665),(14,21,27));dr=ImageDraw.Draw(out)
for i,(p,label) in enumerate([(ref,'GOAL: ART REFERENCE'),(old,'BASELINE: USER v1.4 SCREEN'),(now,'NEW: ACTUAL v1.5 WEBGL')]):
 im=Image.open(p).convert('RGB');im=ImageOps.contain(im,size,method=Image.Resampling.LANCZOS)
 x=i*510+(510-im.width)//2;y=38+(600-im.height)//2;out.paste(im,(x,y));dr.text((i*510+15,12),label,fill=(240,240,230));
out.save(live/'visual_comparison_v150.jpg',quality=91)
print('Comparison written:',live/'visual_comparison_v150.jpg')

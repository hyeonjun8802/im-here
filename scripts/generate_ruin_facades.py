#!/usr/bin/env python3
"""Original locally-generated atlas for 3D parallax ruin-building fallback geometry.
These are not captured or extracted from the user's imagegen reference.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, random, math
root=Path(__file__).resolve().parents[1]/'public/assets/materials/city';root.mkdir(parents=True,exist_ok=True)
W,H=512,1024
for variant in range(4):
 rng=random.Random(16082+variant*793)
 tone=[(84,87,83),(73,77,80),(96,94,84),(68,77,74)][variant]
 y,x=np.mgrid[0:H,0:W];noise=np.random.default_rng(2820+variant).normal(0,11,(H,W))
 streak=(np.sin(x*.041+y*.0014)*2.8+np.sin(x*.11)*1.6)
 arr=np.zeros((H,W,3),np.uint8)
 for c in range(3): arr[:,:,c]=np.clip(tone[c]+noise+streak-(y/H)*12,0,255)
 image=Image.fromarray(arr,'RGB');light=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(image);e=ImageDraw.Draw(light)
 rows=17+variant*2;cols=7+variant%2
 bay=W/cols;floor=H/rows
 for i in range(rows):
  floorY=i*floor
  d.rectangle((0,int(floorY),W,int(floorY+4)),fill=(52,55,53))
  d.line((0,int(floorY+6),W,int(floorY+6)),fill=(122,121,112),width=2)
  for j in range(cols):
   wx=j*bay+bay*.19;wy=floorY+floor*.16
   wr=bay*.62;wh=floor*.67
   # broken windows alternate with boarded-up or stained windows
   cracked=rng.random()<.19 + (i<3)*.16
   lit=rng.random()<.045
   c=(32,42,49) if not cracked else (22,27,27)
   d.rectangle((int(wx),int(wy),int(wx+wr),int(wy+wh)),fill=c)
   d.rectangle((int(wx+3),int(wy+3),int(wx+wr-3),int(wy+wh-4)),outline=(104,116,118),width=2)
   # mullion and side reflection
   d.line((int(wx+wr*.52),int(wy),int(wx+wr*.52),int(wy+wh)),fill=(48,58,60),width=3)
   d.line((int(wx+4),int(wy+3),int(wx+4),int(wy+wh-3)),fill=(121,124,118),width=1)
   if cracked:
    d.polygon([(wx+5,wy+wh*.15),(wx+wr*.61,wy+wh*.42),(wx+wr*.38,wy+wh*.92),(wx+4,wy+wh*.83)],fill=(18,27,26))
    d.line([(wx+wr*.15,wy+wh*.2),(wx+wr*.53,wy+wh*.69),(wx+wr*.88,wy+wh*.3)],fill=(117,119,112),width=2)
   if lit:
    e.rectangle((int(wx+3),int(wy+3),int(wx+wr*.5),int(wy+wh-4)),fill=(250,157+rng.randrange(0,35),83))
    d.rectangle((int(wx+3),int(wy+3),int(wx+wr*.5),int(wy+wh-4)),fill=(125,96,58))
   if rng.random()<.14:
    d.line([(wx+bay*.2,wy+wh*.2),(wx+bay*.15,wy+wh*.7)],fill=(23,35,23),width=5)
 for _ in range(650):
  px=rng.randrange(W);py=rng.randrange(H);rad=rng.randrange(1,5)
  d.ellipse((px-rad,py-rad//2,px+rad,py+rad//2),fill=(54+rng.randrange(0,15),53+rng.randrange(0,14),45+rng.randrange(0,12)))
 # Overgrowth clusters most common on edges and higher levels.
 for cluster in range(30+variant*7):
  xx=rng.choice([rng.randrange(0,45),rng.randrange(W-45,W),rng.randrange(0,W)])
  yy=rng.randrange(0,H)
  if yy>H*.5 and rng.random()<.7:continue
  for v in range(rng.randint(8,27)):
   px=xx+rng.randint(-25,25);py=yy+rng.randint(-35,35);r=rng.randint(2,8)
   if 0<px<W and 0<py<H:
    d.ellipse((px-r,py-r//2,px+r,py+r//2),fill=(27+rng.randrange(0,20),49+rng.randrange(0,32),28+rng.randrange(0,19)))
 image.save(root/f'facade_{variant}.jpg',quality=90,subsampling=0,optimize=True)
 light=light.filter(ImageFilter.GaussianBlur(.6));light.save(root/f'facade_{variant}_emissive.jpg',quality=88)
 print('Generated:',variant)

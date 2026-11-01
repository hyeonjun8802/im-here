#!/usr/bin/env python3
"""Use ONLY cloudy sky pixels from prior AFTERDAY reference panoramas.
No photographed/illustrated buildings remain: all moving city silhouettes are 3D.
"""
from PIL import Image
import numpy as np
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/assets/materials'
out=root/'sky_only';out.mkdir(parents=True,exist_ok=True)
for weather in ['dusk','noon','storm','night']:
 im=np.array(Image.open(root/f'skyline_{weather}.jpg').convert('RGB'))
 w=im.shape[1];hh=512
 # Crop only upper atmosphere, before any skyline/rooftop pixels.
 source=im[:106,:,:]
 # Fixed palette derived from the same source sky to avoid hard cuts.
 bottom=np.array({'dusk':[189,151,144],'noon':[140,181,207], 'storm':[67,86,112], 'night':[21,34,55]}[weather],float)
 target=np.zeros((hh,w,3),np.uint8)
 top=source[0].astype(float)
 for y in range(hh):
  sample=source[min(105,round(y/350*105))].astype(float)
  t=min(1,max(0,(y-175)/210));t=t*t*(3-2*t)
  base=(1-t)*sample+t*bottom[None,:]
  target[y,:,:]=np.clip(base,0,255).astype(np.uint8)
 # Wrap seam softly to avoid a vertical stripe at 360°.
 seam=96
 for x in range(seam):
  k=x/seam
  a=target[:,x].astype(float);b=target[:,w-seam+x].astype(float)
  mid=((1-k)*b+k*a).astype(np.uint8)
  target[:,x]=mid;target[:,w-seam+x]=mid
 Image.fromarray(target).save(out/f'sky_{weather}.jpg',quality=89,optimize=True)
 print(weather,'only sky: ',(w,hh))

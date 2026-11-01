#!/usr/bin/env python3
"""Author reproducible seamless-ish source maps for AFTERDAY's articulated 3D survivor.
These are procedural PBR approximations and NOT photographs/normal-map scanning.
All assets are generated locally, no external licenses or network required.
"""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
out=root/'public/assets/materials/character/premium'
out.mkdir(parents=True,exist_ok=True)
N=768
rng=np.random.default_rng(120231)
y,x=np.mgrid[0:N,0:N].astype('float32')
models={
 'jacket_field':((91,99,83),'weave',.88,0.36),
 'cargo_trousers':((73,81,72),'weave',.89,0.40),
 'backpack_canvas':((80,83,64),'coarse',.90,0.45),
 'scarf_wool':((56,57,53),'wool',.97,0.44),
 'aged_leather':((87,67,52),'leather',.83,0.50),
 'boots_rubber':((44,44,42),'rubber',.79,0.44),
 'hair_fiber':((39,36,33),'hair',.78,0.32),
 'weathered_skin':((171,125,99),'skin',.77,0.20),
 'scuffed_metal':((121,122,114),'metal',.58,0.50),
}
def smoothnoise(radius):
 a=(rng.random((N,N))*255).astype('uint8')
 im=Image.fromarray(a,'L').filter(ImageFilter.GaussianBlur(radius))
 a=np.asarray(im,dtype='float32')
 return (a-a.mean())/(a.std()+1e-3)
large=smoothnoise(30);mid=smoothnoise(7);tiny=smoothnoise(1.1)
for name,(base,typ,rough,boost) in models.items():
 noise=.50*mid+.25*large+.25*tiny
 height=(noise*.14).astype('float32')
 if typ in ('weave','coarse'):
  sz=7 if typ=='weave' else 12
  w=np.sin(x*np.pi*2/sz)*np.cos(y*np.pi*2/sz)
  ribs=np.cos(x*np.pi*2/(sz*2))*np.cos(y*np.pi*2/(sz*2))
  height+=w*.23+ribs*.06;noise+=w*.26
 elif typ=='wool':
  w=np.sin((x+y*.43)*np.pi/3.8)*np.cos((y-x*.22)*np.pi/4.1)
  height+=w*.16;noise+=w*.12
 elif typ=='leather':
  h=np.sin(x*.039+mid*.8)*np.sin(y*.051+mid*.6)
  height+=h*.12+mid*.04;noise+=h*.18
 elif typ=='rubber':
  dots=(np.sin(x*.2)*np.sin(y*.2))
  height+=dots*.13;noise+=dots*.07
 elif typ=='hair':
  strands=np.sin(x*.18+np.sin(y*.034)*.9)*.6+np.sin(x*.47+y*.04)*.2
  height+=strands*.18;noise+=strands*.18
 elif typ=='skin':
  pores=np.sin(x*.61)*np.sin(y*.52)
  height+=pores*.045;noise+=pores*.03
 elif typ=='metal':
  scratches=np.sin((x+y*.05)*.42)*.24
  height+=scratches*.08;noise+=scratches*.13
 shade=noise*8.1
 if typ=='skin': shade*=.55
 if typ=='metal':shade*=1.5
 rgb=np.clip(np.array(base,dtype='float32')[None,None,:]+shade[...,None]*np.array([1.2,.95,.78])[None,None,:],0,255).astype('uint8')
 Image.fromarray(rgb,'RGB').save(out/f'{name}_base.jpg',quality=87,subsampling=0,optimize=True)
 gy,gx=np.gradient(height)
 v=np.stack([-gx*boost,-gy*boost,np.ones_like(gx)],axis=-1)
 v/=np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-5)
 norm=np.clip((v*.5+.5)*255,0,255).astype('uint8')
 Image.fromarray(norm,'RGB').save(out/f'{name}_normal.jpg',quality=87,subsampling=0,optimize=True)
 rr=np.clip((rough+noise*.022)*255,0,255).astype('uint8')
 Image.fromarray(rr,'L').save(out/f'{name}_rough.jpg',quality=88,optimize=True)
 print(name, 'complete')
# neutral material atlas preview (reference only - not an in-game billboard)
preview=Image.new('RGB',(4*330,3*350),(26,34,37));draw=ImageDraw.Draw(preview)
for i,name in enumerate(models):
 cx=i%4*330;cy=i//4*350
 tile=Image.open(out/f'{name}_base.jpg').resize((300,300))
 preview.paste(tile,(cx+15,cy+15))
 draw.text((cx+17,cy+321),name.replace('_',' ').upper(),fill=(222,218,201))
preview.save(root/'docs/V120_CHARACTER_PBR_CONTACT.png')

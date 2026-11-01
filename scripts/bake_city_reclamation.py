#!/usr/bin/env python3
"""Deterministic city material bake. Original facade atlases stay untouched.

Requires Pillow and numpy. Rebuilds ONLY the four weathered facade atlases and
one alpha-cut ivy sheet used by the actual Three.js instanced 3D scene.
"""
from pathlib import Path
import math
import random
import numpy as np
from PIL import Image, ImageDraw

DIR=Path(__file__).resolve().parents[1]/'public/assets/materials/city'
RNG=random.Random(20261031)

def noise(w,h,seed):
    rng=np.random.default_rng(seed)
    small=Image.fromarray((rng.random((max(3,h//31),max(3,w//31)))*255).astype(np.uint8),'L')
    return np.asarray(small.resize((w,h),Image.Resampling.BICUBIC),dtype=np.float32)/255.0

for k in range(4):
    src=Image.open(DIR/f'facade_{k}.jpg').convert('RGB')
    w,h=src.size
    arr=np.asarray(src,dtype=np.float32).copy()
    n1=noise(w,h,k+25);n2=noise(w,h,k+46)
    # Water staining and biological patina. These alter the diffuse material,
    # preserving windows and masonry detail rather than covering it with decals.
    wet=np.clip((n1-.26)*1.65,0,1)
    algae=np.clip((n2-.53)*2.1,0,1)
    aging=(.73+wet*.17)[:,:,None]
    arr*=aging
    arr=arr*(1-algae[:,:,None]*.23)+np.array([35,54,39])[None,None,:]*algae[:,:,None]*.23
    out=Image.fromarray(np.uint8(np.clip(arr,0,255)),'RGB')
    ink=Image.new('RGBA',(w,h),(0,0,0,0))
    d=ImageDraw.Draw(ink)
    rng=random.Random(490+k*53)
    # Subtle downward runoff: grime follows gravity along real wall facades.
    for i in range(135):
        x=rng.randrange(w); y=rng.randrange(h)
        length=rng.randrange(25,190)
        width=rng.choice([1,1,2,3,5,8])
        d.line([(x,y),(x+rng.randint(-4,4),min(h,y+length))],fill=(24,36,27,rng.randint(13,50)),width=width)
    # Hairline fractures. Natural dark cracks branch rather than clean grid lines.
    for i in range(34):
        x=rng.randrange(w);y=rng.randrange(h)
        path=[(x,y)]
        for j in range(rng.randint(3,8)):
            x+=rng.randint(-9,9);y+=rng.randint(7,18)
            path.append((x,y))
        d.line(path,fill=(12,21,21,rng.randint(40,85)),width=rng.choice([1,1,2]))
    out=Image.alpha_composite(out.convert('RGBA'),ink).convert('RGB')
    out.save(DIR/f'facade_reclaimed_{k}.jpg',quality=91,optimize=True)

# Dense, naturally feathered climbing foliage. A cutout, not a flat rectangle.
w,h=512,768
art=Image.new('RGBA',(w,h));d=ImageDraw.Draw(art)
rng=random.Random(7812)
for branch in range(24):
    startx=rng.uniform(20,w-20)
    length=rng.uniform(260,h*.91)
    drift=rng.uniform(-.28,.28)
    phase=rng.uniform(0,math.tau)
    path=[]
    steps=round(length/9)
    for t in range(steps):
        y=t*9
        x=startx+drift*y+math.sin(t*.24+phase)*15
        path.append((x,y))
    stem=(193,208,178,180)
    d.line(path,fill=stem,width=rng.choice([2,3,3,4]),joint='curve')
    for t,(x,y) in enumerate(path):
        if t<2 or rng.random()<.14:continue
        side=-1 if t%2 else 1
        leafx=x+side*rng.uniform(5,21)
        leafy=y+rng.uniform(-9,9)
        lengthLeaf=rng.uniform(8,24)
        widthLeaf=rng.uniform(4,10)
        theta=(rng.uniform(-.5,.6)+(0 if side>0 else math.pi))
        vx=math.cos(theta)*lengthLeaf; vy=math.sin(theta)*lengthLeaf
        nx=-vy/lengthLeaf*widthLeaf;ny=vx/lengthLeaf*widthLeaf
        p0=(x,y);tip=(leafx+vx,leafy+vy)
        polygon=[p0,(leafx+nx,leafy+ny),tip,(leafx-nx,leafy-ny)]
        d.polygon(polygon,fill=(rng.randint(190,235),rng.randint(206,237),rng.randint(168,206),rng.randint(178,240)))
        d.line([p0,tip],fill=(139,161,125,150),width=1)
# Keep source texture one alpha-cut image; all world variation via 3D transforms.
art.save(DIR/'ivy_reclaimed.png',optimize=True)
# Seamlessly tileable low-frequency field for ground fog: texture fetches are
# cheaper than procedural noise hashing in each translucent fragment on phones.
grid=np.random.default_rng(6138).random((24,24))
tile=np.empty((256,256),dtype=np.uint8)
for y in range(256):
    yy=y/256*24;j=int(yy);fy=yy-j;fy=fy*fy*(3-2*fy)
    for x in range(256):
        xx=x/256*24;i=int(xx);fx=xx-i;fx=fx*fx*(3-2*fx)
        a=grid[j%24,i%24]*(1-fx)+grid[j%24,(i+1)%24]*fx
        b=grid[(j+1)%24,i%24]*(1-fx)+grid[(j+1)%24,(i+1)%24]*fx
        tile[y,x]=int((a*(1-fy)+b*fy)*255)
Image.fromarray(tile,'L').save(DIR/'ground_fog_noise.png',optimize=True)
print('baked: 4 aged facade atlases + ivy + ground fog noise')

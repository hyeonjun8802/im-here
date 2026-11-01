#!/usr/bin/env python3
"""Deterministic local PBR-ish art baking; no internet/external services."""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

ROOT=Path(__file__).resolve().parents[1]/'public/assets/materials/cinematic'
ROOT.mkdir(parents=True,exist_ok=True)
S=2048
rng=np.random.default_rng(30777)

def fbm(size,scales):
    base=np.zeros((size,size),np.float32)
    for grid,weight in scales:
        tile=rng.random((grid,grid)).astype(np.float32)
        noise=cv2.resize(tile,(size,size),interpolation=cv2.INTER_CUBIC)
        base+=((noise-.5)*2)*weight
    return base

noise=fbm(S,[(5,11),(11,10),(23,8),(53,5),(107,3),(421,1.5)])
fine=rng.standard_normal((S,S)).astype(np.float32)*1.2
Y,X=np.mgrid[0:S,0:S].astype(np.float32)
# Concrete has irregular oxidized staining and softened values, not a bright white grid.
base=np.stack([99+noise*.79+fine,102+noise*.69+fine,92+noise*.66+fine],axis=2)
# Organic water staining, darker edges and pooled maintenance patches.
edge=(np.exp(-X/170)+np.exp(-(S-X)/180)+np.exp(-Y/190)+np.exp(-(S-Y)/190))
base-=edge[:,:,None]*np.array([11.5,10.0,8.0],np.float32)
wet=np.clip((fbm(S,[(4,.65),(13,.25),(37,.12)])+.23)*2.1,0,1)
wet=cv2.GaussianBlur(wet.astype(np.float32),(0,0),5)
wet*=np.clip(0.42+edge*.42,0,1)
base-=wet[:,:,None]*np.array([15,15,13],np.float32)
# Moss grows in damp and sheltered cracks, not in repeated equally spaced green polygons.
moss=np.clip(fbm(S,[(8,.6),(30,.25),(87,.15)])+.18,0,1)*np.clip(edge*.58,0,1)
moss_mask=moss>.31
base[moss_mask]=base[moss_mask]*.52+np.array([37,60,31],np.float32)*.48

im=Image.fromarray(np.uint8(np.clip(base,0,255)),'RGB')
draw=ImageDraw.Draw(im,'RGB')
# Several large seams, staggered repairs. No 9x9 perfect square grid.
seams=[]
for row in range(1,5):
    y=int(row*S/5+rng.integers(-25,25));pts=[]
    for x in range(-5,S+30,64):pts.append((x,y+int(4*np.sin(x*.004+row))+int(rng.integers(-3,4))))
    seams.append(pts)
for col in range(1,5):
    x=int(col*S/5+rng.integers(-60,60))
    ys=range(-10,S+10,77)
    seams.append([(x+int(7*np.sin(y*.003+col))+int(rng.integers(-4,5)),y) for y in ys])
for pts in seams:
    draw.line(pts,fill=(52,56,51),width=4,joint='curve')
    shifted=[(x+3,y+2) for x,y in pts]
    draw.line(shifted,fill=(124,121,105),width=2,joint='curve')
# Branched hairline concrete cracks (low-contrast, natural geometry)
for k in range(155):
    x=int(rng.integers(30,S-30));y=int(rng.integers(30,S-30))
    angle=float(rng.random()*6.283)
    pts=[(x,y)]
    for j in range(int(rng.integers(4,15))):
        angle+=float(rng.normal(0,.35));step=int(rng.integers(6,20));x+=int(step*np.cos(angle));y+=int(step*np.sin(angle));pts.append((x,y))
    draw.line(pts,fill=(55+int(k%5),59+int(k%4),54+int(k%7)),width=1 if k%4 else 2)
# Asphalt repair strips laid at accidental angles.
for i in range(18):
    x=int(rng.integers(80,S-80));y=int(rng.integers(80,S-80));w=int(rng.integers(30,230));h=int(rng.integers(7,39));angle=float(rng.uniform(-40,40))
    patch=Image.new('RGBA',(w,h),(35,40,38,int(rng.integers(100,175))))
    patch=patch.rotate(angle,expand=True,resample=Image.Resampling.BICUBIC)
    im.paste(patch,(x,y),patch)
# Unpredictable rust bleed around metal anchors / drainage edges.
draw=ImageDraw.Draw(im,'RGBA')
for i in range(260):
    x=int(rng.random()*S);y=int(rng.random()*S)
    if rng.random()>.35 and not (x<130 or x>S-130 or y<130 or y>S-130):continue
    radius=int(rng.integers(2,17));c=(90,48,32,int(rng.integers(13,52)))
    draw.ellipse((x-radius,y-radius/2,x+radius,y+radius/2),fill=c)
# Fine grit and aggregate roughness
arr=np.asarray(im,dtype=np.float32)
grains=rng.random((S,S))
arr[grains>.996]=arr[grains>.996]*.72
arr[grains<.002]=np.minimum(230,arr[grains<.002]*1.20)
arr=np.uint8(np.clip(arr,0,255))
Image.fromarray(arr,'RGB').save(ROOT/'roof_cinematic_albedo.jpg',quality=92,subsampling=0)

# Bake pseudo-geometry normals from a multi-band height field + hairline seam relief.
gray=cv2.cvtColor(arr,cv2.COLOR_RGB2GRAY).astype(np.float32)
height=gaussian_filter(gray,1.1)*.6+fbm(S,[(25,9),(102,2.2)])
gx=cv2.Sobel(height,cv2.CV_32F,1,0,ksize=3)/80
gy=cv2.Sobel(height,cv2.CV_32F,0,1,ksize=3)/80
norm=np.stack([-gx,-gy,np.ones_like(gx)*1.55],axis=2)
norm/=np.maximum(np.linalg.norm(norm,axis=2,keepdims=True),1e-5)
norm=np.uint8(np.clip((norm*.5+.5)*255,0,255))
Image.fromarray(norm,'RGB').save(ROOT/'roof_cinematic_normal.jpg',quality=92)
rough=np.uint8(np.clip(210+noise*.65+fine*2-(wet*16),110,250))
Image.fromarray(rough,'L').save(ROOT/'roof_cinematic_roughness.png',optimize=True)
Image.fromarray(np.uint8(np.clip(wet*205+20,0,255)),'L').save(ROOT/'roof_wetmask.png',optimize=True)

# Camp dust & wet concrete alpha overlay: avoids simple solid blue pancake puddles.
# Photorealistic cloud bank sprites with correct transparent alpha / soft boundaries.
size=512
rng=np.random.default_rng(52026)
noiseA=fbm(size,[(4,.55),(9,.28),(19,.16),(41,.08)])
xg,yg=np.meshgrid(np.linspace(-1,1,size),np.linspace(-1,1,size));
shape=np.exp(-(xg**2*2.6+yg**2*5.8))*1.2
alpha=np.clip((shape+noiseA*.53-.12)*1.25,0,1)
alpha=cv2.GaussianBlur(alpha,(0,0),1.5)
rgba=np.empty((size,size,4),np.uint8)
rgba[:,:,:3]=np.clip(208+noiseA[:,:,None]*17,0,255)
rgba[:,:,3]=np.uint8(alpha*238)
Image.fromarray(rgba,'RGBA').save(ROOT/'cloudbank_alpha.png',optimize=True)
print('Generated',len(list(ROOT.iterdir())),'cinematic textures at',ROOT)
# Low-frequency equirectangular lighting probe: neutral daylight / warm sky, not a game background.
# Used for specular response on galvanized tanks, puddles and patched metal.
W,H=1024,512
row=np.linspace(0,1,H)[:,None,None]
top=np.array([91,116,133.],np.float32).reshape((1,1,3))
horizon=np.array([177,163,133.],np.float32).reshape((1,1,3))
ground=np.array([51,61,59.],np.float32).reshape((1,1,3))
mix=np.clip(row/.51,0,1)
sky=top*(1-mix)+horizon*mix
sky=sky*(1-np.clip((row-.52)*5,0,1))+ground*np.clip((row-.52)*5,0,1)
sky=np.repeat(sky,W,axis=1)
xx=np.linspace(0,1,W)[None,:,None]
bright=np.exp(-((xx-.32)**2/.004+(row-.47)**2/.0018))
sky=np.clip(sky+bright*np.array([78,66,45.],np.float32),0,255)
Image.fromarray(np.uint8(sky),'RGB').save(ROOT/'sky_light_probe.jpg',quality=88)

"""Original game's damaged-concrete albedo remaster (no flat tile grid).
The base is the already-authored AFTERDAY advanced PBR concrete, NOT a 2D sky
replacement. Derived normal and roughness maps remain native game textures.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import cv2

ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'public/assets/materials/advanced/roof_concrete_albedo.jpg'
dst=ROOT/'public/assets/materials/cinematic'
size=2048
rng=np.random.default_rng(20261031)
img=Image.open(src).convert('RGB').resize((size,size),Image.Resampling.BICUBIC)
base=np.array(img,dtype=np.float32)
# Multi-scale color variation; no evenly spaced lines or repeated blue puddles.
small=rng.normal(0,1,(32,32)).astype('float32')
medium=rng.normal(0,1,(150,150)).astype('float32')
small=cv2.resize(small,(size,size),interpolation=cv2.INTER_CUBIC)
medium=cv2.resize(medium,(size,size),interpolation=cv2.INTER_CUBIC)
fine=rng.normal(0,1,(size,size)).astype('float32')
noise=(small*5.0+medium*2.3+fine*1.9)[...,None]
base=np.clip(base+noise,0,255)
# High-res material stays neutral; coloration comes from real scene lighting.
base[:,:,0]*=.94;base[:,:,1]*=.97;base[:,:,2]*=.96
albedo=np.uint8(np.clip(base,0,255))
Image.fromarray(albedo,'RGB').save(dst/'roof_cinematic_albedo.jpg',quality=92,subsampling=0)
# Lighting normal from high-pass height, preserving weathering over smooth lumps.
gray=cv2.cvtColor(albedo,cv2.COLOR_RGB2GRAY).astype('float32')/255.0
hgt=cv2.GaussianBlur(gray,(0,0),2.2)*.85+cv2.GaussianBlur(gray,(0,0),.6)*.15
sx=cv2.Sobel(hgt,cv2.CV_32F,1,0,ksize=3)*1.65
sy=cv2.Sobel(hgt,cv2.CV_32F,0,1,ksize=3)*1.65
xyz=np.dstack((-sx,-sy,np.ones_like(sx)));xyz/=np.maximum(np.linalg.norm(xyz,axis=2,keepdims=True),1e-6)
normal=np.uint8(np.clip((xyz*.5+.5)*255,0,255))
Image.fromarray(normal,'RGB').save(dst/'roof_cinematic_normal.jpg',quality=90,subsampling=0)
# Concrete is primarily matte; some polished wet paths appear only via simulation.
rough=np.clip(210+small*10+medium*8+fine*3,140,245).astype('uint8')
Image.fromarray(rough,'L').save(dst/'roof_cinematic_roughness.png',optimize=True)
print('Regenerated:',dst/'roof_cinematic_albedo.jpg')

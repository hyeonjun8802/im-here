#!/usr/bin/env python3
"""Organic wearable shell pieces mounted to the existing articulated survivor.
Produces GLB cloth geometry (not screenshots/decoration) for torso, sleeve, thigh,
and calf. The original joints keep their sit/walk/guitar/radio animation.
"""
from pathlib import Path
import numpy as np
from PIL import Image
import trimesh
from trimesh.visual.texture import TextureVisuals
from trimesh.visual.material import PBRMaterial
R=Path(__file__).resolve().parent.parent
T=R/'public/assets/materials/character/premium/jacket_field_base.jpg'
BASE=Image.open(T).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
# Original ground color: weathered olive forest green, not cartoon neon camouflage.
a=np.asarray(BASE).astype(float)
a=np.clip(a*.72+np.array([69.,77.,59.]).reshape(1,1,3)*.28,0,255).astype('uint8')
map_img=Image.fromarray(a)
map_img.save(R/'public/assets/character/ref/field_suit_v160.jpg',quality=91)
# Tangent-space cloth micro normal (subtle weave rather than generic flat plastic).
# This does not produce geometry displacement; the rounded garment geometry
# already carries the silhouette and folds, while PBR normal adds fine texture.
hw=512
y,x=np.mgrid[:hw,:hw]
weave=(np.sin(x*2*np.pi/5)*.34+np.sin(y*2*np.pi/7)*.28)+np.random.default_rng(416).normal(0,.17,(hw,hw))
dy,dx=np.gradient(weave)
n=np.dstack([-dx*.18,-dy*.18,np.ones_like(dx)])
n/=np.linalg.norm(n,axis=2,keepdims=True)
normal=Image.fromarray(np.uint8(np.clip(n*.5+.5,0,1)*255),'RGB')
normal.save(R/'public/assets/character/ref/field_suit_normal_v160.png',optimize=True)
mat=PBRMaterial(baseColorTexture=map_img,normalTexture=normal,baseColorFactor=(255,255,255,255),metallicFactor=0,roughnessFactor=.92,doubleSided=True,name='Organic worn olive jacket PBR')

def shape(name,rings,seed=0):
  # rings: (y, x-radius, z-radius, x-skew, z-skew), stitched flexible polygon
  # surface with rounded fabric volume and tiny organic folds.
  n=64;verts=[];uv=[];faces=[]
  for i,(h,rx,rz,xoff,zoff) in enumerate(rings):
   for j in range(n+1):
    th=j/n*2*np.pi
    wrinkle=.008*np.cos(th*6.2 + h*17+seed)+.006*np.sin(th*11+h*9+seed)
    x=xoff+np.cos(th)*(rx+wrinkle)
    z=zoff+np.sin(th)*(rz+wrinkle*.55)
    verts.append((x,h,z));uv.append((j/n*2.5,i/(len(rings)-1)*2.8))
  for i in range(len(rings)-1):
   for j in range(n):
    k=i*(n+1)+j;faces.extend(((k,k+1,k+n+1),(k+1,k+n+2,k+n+1)))
  g=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
  g.visual=TextureVisuals(uv=np.array(uv),material=mat)
  g.metadata['name']=name
  return g

sc=trimesh.Scene()
coat=[(-.30,.44,.338,0,0),(-.23,.46,.35,0,0),(-.06,.47,.36,0,0),(.12,.45,.36,0,0),(.32,.448,.348,0,.005),(.51,.464,.36,0,.001),(.67,.49,.373,0,0),(.81,.45,.345,0,-.02),(.89,.36,.32,0,-.025),(.98,.19,.22,0,-.02)]
# Field coat broadens at shoulders, with tailored waist and free hem.
sc.add_geometry(shape('Organic Jacket Shell',coat),node_name='Organic Jacket Shell')
sleeve=[(-.66,.181,.181,0,.0),(-.58,.199,.187,0,0),(-.46,.218,.207,0,0),(-.28,.230,.222,0,0),(-.14,.246,.238,0,.0),(.00,.252,.240,0,.01),(.11,.20,.198,0,.005)]
sc.add_geometry(shape('Organic Arm Sleeve',sleeve,1.45),node_name='Organic Arm Sleeve')
thigh=[(-.61,.217,.202,0,0),(-.50,.235,.22,0,0),(-.36,.259,.239,0,0),(-.19,.258,.23,0,0),(-.04,.251,.223,0,0),(.12,.21,.205,0,0)]
sc.add_geometry(shape('Organic Thigh Trouser',thigh,2.7),node_name='Organic Thigh Trouser')
calf=[(-.55,.177,.159,0,0),(-.42,.190,.178,0,0),(-.28,.203,.183,0,0),(-.13,.207,.183,0,0),(.02,.217,.185,0,0),(.10,.19,.175,0,0)]
sc.add_geometry(shape('Organic Calf Trouser',calf,3.1),node_name='Organic Calf Trouser')
file=R/'public/assets/models/character/afterday_survivor_suit_reference_v160.glb'
file.write_bytes(sc.export(file_type='glb'))
re=trimesh.load(file,force='scene')
print('OUTPUT',file,'bytes',file.stat().st_size,'parts',list(re.geometry),'triangles',sum(len(g.faces) for g in re.geometry.values()))

#!/usr/bin/env python3
"""Build actual, offline GLB assets for the only AFTERDAY rooftop.
Procedural, UV-mapped authored-style assets; not sourced from GitHub and not scanned PBR.
GitHub city models remain separate with their original license.
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image
import trimesh
from trimesh.visual.texture import TextureVisuals
from trimesh.visual.material import PBRMaterial
ROOT=Path(__file__).resolve().parents[1]
PBR=ROOT/'public/assets/materials/advanced'
OUT=ROOT/'public/assets/models/afterday'
OUT.mkdir(parents=True,exist_ok=True)

def pbr(name,texture=None,color=None,rough=.82,metal=0,normal=None):
    kw={'name':name,'metallicFactor':metal,'roughnessFactor':rough,'doubleSided':True}
    if color: kw['baseColorFactor']=list(color)
    if texture:kw['baseColorTexture']=Image.open(PBR/texture).convert('RGB')
    if normal:kw['normalTexture']=Image.open(PBR/normal).convert('RGB')
    return PBRMaterial(**kw)

cloth=pbr('weathered olive woven canvas','tarp_canvas_albedo.jpg',rough=.86,normal='tarp_canvas_normal.jpg')
clothPatch=pbr('patched olive canvas','tarp_canvas_albedo.jpg',color=(175,187,157,255),rough=.90)
wood=pbr('reclaimed timber','reclaimed_wood_albedo.jpg',rough=.92,normal='reclaimed_wood_normal.jpg')
steel=pbr('oxidized galvanized steel','galvanized_rust_albedo.jpg',rough=.63,metal=.35,normal='galvanized_rust_normal.jpg')
metal=pbr('dull silver galvanized metal',color=(163,168,158,255),rough=.49,metal=.44)
rust=pbr('rusted painted steel',color=(130,85,57,255),rough=.76,metal=.26)
concrete=pbr('concrete anchor',color=(117,118,108,255),rough=.95,metal=0)
black=pbr('aged rubber',color=(43,47,43,255),rough=.90)
linen=pbr('faded cotton cloth',color=(153,145,117,255),rough=.96)
sheet=pbr('washed linen mattress fitted sheet',color=(205,199,174,255),rough=.98)
sheetSeam=pbr('aged cotton stitching',color=(129,122,97,255),rough=.98)
quilt=pbr('olive heavy canvas cover', 'tarp_canvas_albedo.jpg',color=(175,183,156,255),rough=.94)
label=pbr('aged ration labels',color=(192,175,131,255),rough=.95)
blackInk=pbr('stencilled worn markings',color=(54,63,53,255),rough=.98)
glass=pbr('weathered amber glass',color=(220,149,70,255),rough=.38,metal=0)

class Model:
 def __init__(self):self.scene=trimesh.Scene();self.idx=0
 def add(self,mesh,name,material,uv=None):
  mesh=mesh.copy();verts=mesh.vertices
  if uv is None:
   uv=np.column_stack([(verts[:,0]+verts[:,2])*.20,(verts[:,1]+verts[:,2])*.20])
  mesh.visual=TextureVisuals(uv=np.asarray(uv,dtype=np.float64),material=material)
  self.scene.add_geometry(mesh,node_name=f'{name}_{self.idx}',geom_name=f'geometry_{self.idx}')
  self.idx+=1
 def box(self,name,size,pos,material,rot=0):
  mesh=trimesh.creation.box(extents=size)
  if rot:
   mesh.apply_transform(trimesh.transformations.rotation_matrix(rot,(0,1,0)))
  mesh.apply_translation(pos)
  self.add(mesh,name,material)
 def rod(self,name,a,b,r,material,sides=12):
  a=np.array(a,dtype=float);b=np.array(b,dtype=float);vec=b-a
  leng=np.linalg.norm(vec)
  if leng<1e-5:return
  mesh=trimesh.creation.cylinder(radius=r,height=leng,sections=sides)
  align=trimesh.geometry.align_vectors([0,0,1],vec/leng)
  mesh.apply_transform(align);mesh.apply_translation((a+b)*.5)
  self.add(mesh,name,material)
 def tube(self,name,center,major,minor,material,axis='y',segs=32,ring=8):
  vertices=[];faces=[]
  for i in range(segs):
   t=i*2*math.pi/segs
   for j in range(ring):
    p=j*2*math.pi/ring
    rad=major+minor*math.cos(p)
    if axis=='y':v=[center[0]+rad*math.cos(t),center[1]+minor*math.sin(p),center[2]+rad*math.sin(t)]
    else:v=[center[0]+rad*math.cos(t),center[1]+rad*math.sin(t),center[2]+minor*math.sin(p)]
    vertices.append(v)
  for i in range(segs):
   for j in range(ring):
    a=i*ring+j;b=((i+1)%segs)*ring+j;c=i*ring+(j+1)%ring;d=((i+1)%segs)*ring+(j+1)%ring
    faces.extend([[a,b,c],[c,b,d]])
  mesh=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
  self.add(mesh,name,material)
 def clothGrid(self,name,xrange,zrange,fn,material,nx=38,nz=30):
  xyz=[];uv=[];faces=[]
  for i in range(nx+1):
   xx=xrange[0]+(xrange[1]-xrange[0])*i/nx
   for j in range(nz+1):
    zz=zrange[0]+(zrange[1]-zrange[0])*j/nz
    xyz.append([xx,fn(xx,zz),zz]);uv.append([i/nx*1.8,j/nz*1.8])
  for i in range(nx):
   for j in range(nz):
    a=i*(nz+1)+j;b=a+nz+1
    faces.extend([[a,a+1,b],[a+1,b+1,b]])
  m=trimesh.Trimesh(vertices=xyz,faces=faces,process=False)
  self.add(m,name,material,uv)
 def batch_boxes(self,name,entries,material):
  """Combine same-material tiny pieces into ONE draw call rather than hundreds."""
  geo=[]
  for size,pos in entries:
   m=trimesh.creation.box(extents=size);m.apply_translation(pos);geo.append(m)
  if geo:self.add(trimesh.util.concatenate(geo),name,material)
 def soft_pillow(self,name,center,half_sizes,material):
  """Rounded volumetric cotton pillow, not a hard rectangular block."""
  m=trimesh.creation.icosphere(subdivisions=4,radius=1.0)
  # A superellipsoid cross-section forms a soft cotton pillow with rounded
  # rectangular corners; a pure ellipsoid looked like a flat beach stone.
  coords=m.vertices.copy()
  coords[:,0]=np.sign(coords[:,0])*np.abs(coords[:,0])**.63
  coords[:,2]=np.sign(coords[:,2])*np.abs(coords[:,2])**.63
  coords[:,1]=np.sign(coords[:,1])*np.abs(coords[:,1])**.80
  m.vertices=coords*np.asarray(half_sizes)+np.asarray(center)
  self.add(m,name,material)
 def export(self,name):
  p=OUT/name;self.scene.export(p,file_type='glb');a=trimesh.load(p,force='scene')
  sz=a.bounds[1]-a.bounds[0]
  print('GLB',name,'size',p.stat().st_size,'meshes',len(a.geometry),'bounds',np.round(sz,2))

# ---- SHELTER ------------------------------------------------------------
g=Model()
g.box('elevated timber pallet floor',[11.0,.28,9.3],[0,.19,0],wood)
for xx in np.arange(-5,5.1,.75):
 g.box('pallet slat',[.62,.09,9.2],[xx,.39,0],wood)
for x in [-4.7,4.7]:
 for z in [-4.0,4.0]:
  g.rod('scavenged steel tent pole',[x,.2,z],[x,4.55,z],.075,rust)
  g.box('concrete rope anchor',[.44,.23,.46],[x*1.35,.15,z*1.2],concrete)
# Roof ridge along Z, with asymmetric stretched side slopes; side fabric hangs from eaves.
def roof(x,z):
 slope=1-abs(x)/6
 return 3.54+2.25*slope-.22*np.sin((z+5)*np.pi/10)+.055*np.sin(3*z+x*2.1)+.06*np.sin(5*x+1.1*z)
g.clothGrid('tensioned rainproof canopy',(-6.0,6.0),(-5.05,5.05),roof,cloth,48,42)
for z in [-4.8,0,4.8]:
 g.rod('central ridge guide',[-.01,roof(0,z),z],[.01,roof(0,z)+.015,z],.035,metal)
for z in [-4.9,4.9]:
 for x in [-5.8,5.8]:
  g.rod('guy rope',[x,roof(x,z),z],[x*1.34,.19,z*1.19],.028,linen)
  g.tube('grommet',[x,roof(x,z),z],.10,.03,metal)
for x in [-4.7,4.7]:
 for z in [-3.9,3.9]:
  g.rod('awning cross brace',[x,4.40,z],[0,5.6,z],.033,steel)
# Sidewall curtains are VERTICAL 3D cloth, not extra horizontal roof sheets.
# Leave front and rear open for the survivor to walk through.
for side in [-1,1]:
 xyz=[];uv=[];faces=[];ny,nz=14,28
 for i in range(ny+1):
  t=i/ny
  for j in range(nz+1):
   f=j/nz;z=-4.65+f*6.5
   x=side*(5.55+.075*np.sin(t*5+f*12))
   y=.85+t*(2.7+.18*np.sin(f*6))
   xyz.append([x,y,z]);uv.append([f*1.3,t])
 for i in range(ny):
  for j in range(nz):
   a=i*(nz+1)+j;b=a+nz+1
   faces.extend([[a,a+1,b],[a+1,b+1,b]])
 g.add(trimesh.Trimesh(vertices=xyz,faces=faces,process=False),'vertical rain curtain',clothPatch,uv)
# Cotton pallet bed and pillow, separate from roof.
g.box('narrow sleeping pallet',[3.45,.27,1.72],[-2.2,.68,1.65],wood)
# The original sleeping pallet is still the authoritative hitbox; expose its
# clean cotton surface. Previously a full-size rigid box hid the bed entirely.
# Keep these original two GLB node names/order stable for gameplay bindings.
g.box('folded sleeping blanket',[.72,.11,1.52],[-.86,.91,1.65],quilt)
g.soft_pillow('pillow',[-3.33,1.04,1.65],[.47,.145,.65],clothPatch)
# Worn fitted sheet and its piping add a readable mattress silhouette.
g.clothGrid('wrinkled ivory fitted sheet',(-3.86,-.53),(.86,2.44),
  lambda x,z:.852+.009*math.sin((x+3.86)*5.0)+.008*math.cos((z-1.65)*10),sheet,26,14)
# Folded camping blanket: visible stitching, layered fabric and a foot-edge binding.
g.batch_boxes('mattress cotton perimeter piping',[
 ((3.33,.025,.027),(-2.20,.853,z)) for z in [.86,2.44]]+[
 ((.027,.025,1.54),(x,.853,1.65)) for x in [-3.86,-.54]],sheetSeam)
g.batch_boxes('quilt stitch rows',[
 ((.018,.006,1.44),(x,.976,1.65)) for x in [-1.12,-.88,-.65]],sheetSeam)
# Underpillow seams stay in GLB local coordinates; they don't attach to the actor.
g.batch_boxes('pillow corner tabs',[
 ((.13,.028,.09),(x,1.01,z)) for x in [-3.67,-2.99] for z in [1.13,2.17]],sheetSeam)
# Three subtly different repair patches and wind-worn double-layer seams on canopy.
for xx,zz,scale in [(-3.1,-1.2,.7),(1.8,2.2,.9),(3.6,-2.3,.6)]:
  g.clothGrid('sewn tarp repair patch',(xx-scale,xx+scale),(zz-scale*.5,zz+scale*.5),
    lambda x,z:roof(x,z)+.024,clothPatch,6,5)
g.batch_boxes('small ration stickers',[
 ((.30,.018,.014),(2.2+(i%4)*.62,2.92,-2.72+(i//4)*.83)) for i in range(10)],label)

# Repair equipment shelf and boxes inside shelter
for x in [2.0,4.4]:
 for z in [-3.4,0]:g.rod('shelving frame',[x,.35,z],[x,3.0,z],.05,rust)
for h in [.75,1.6,2.48]:g.box('storage shelf',[3.10,.14,3.5],[3.2,h,-1.75],wood)
for i in range(10):
 x=2.2+(i%4)*.62;z=-2.9+(i//4)*.83
 g.box('salvage tins and rations',[.44,.28+(i%3)*.16,.35],[x,2.72+(i%3)*.03,z],steel)
# Cords and hanging lights with small glass globes
for i in range(7):
 x=-4.1+i*1.28;zz=4.30
 g.rod('lamp cable',[x,4.4,zz],[x,4.02,zz],.018,black)
 sph=trimesh.creation.icosphere(subdivisions=2,radius=.125);sph.apply_translation([x,4.02,zz]);g.add(sph,'camp light glass',glass)
g.export('afterday_shelter_pbr.glb')

# ---- WATER COLLECTION + PURIFICATION -----------------------------------
g=Model()
for a in [math.pi/4,3*math.pi/4,5*math.pi/4,7*math.pi/4]:
 x=math.cos(a)*2.3;z=math.sin(a)*2.3
 g.rod('welded water frame leg',[x,.10,z],[x,5.10,z],.15,rust)
 g.box('concrete footing',[.52,.20,.55],[x,.14,z],concrete)
for y in [1.05,2.25]:
 g.rod('water frame horizontal steel',[-2.1,y,2.1],[2.1,y,2.1],.11,steel)
 g.rod('water frame horizontal steel',[2.1,y,-2.1],[2.1,y,2.1],.11,steel)
# tank body cylindrical, steel ribs, round hatch. Default primitive Z-axis -> rotate to y.
body=trimesh.creation.cylinder(radius=2.72,height=5.65,sections=56)
body.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]));body.apply_translation([0,5.4,0]);g.add(body,'galvanized potable tank',steel)
for y in np.linspace(2.8,8.02,8):g.tube('rolled galvanized reinforcement rib',[0,float(y),0],2.76,.074,metal)
g.tube('cap rim',[0,8.23,0],2.69,.095,metal)
g.rod('hatch cylinder',[0,8.2,0],[0,8.47,0],.42,steel,20)
g.tube('hatch locking rim',[0,8.51,0],.45,.045,rust)
# back service ladder and feet, pipes, valve wheel and tap logically connected
for x in [-.37,.37]:g.rod('water tank ladder rail',[x,1.4,-2.92],[x,8.30,-2.92],.047,metal)
for y in np.arange(1.6,8.3,.57):g.rod('water tank ladder step',[-.37,float(y),-2.92],[.37,float(y),-2.92],.04,metal)
g.rod('tank drain pipe',[2.55,3.25,.4],[4.1,3.25,.4],.18,steel)
g.rod('filter pipe vertical',[4.1,3.25,.4],[4.1,1.7,.4],.17,steel)
g.rod('filter pipe horizontal',[4.1,1.7,.4],[5.2,1.7,.4],.18,steel)
g.tube('red manual valve wheel',[4.23,2.75,.4],.42,.055,rust,'z',24,6)
g.rod('valve stem',[4.1,2.75,.4],[4.5,2.75,.4],.05,metal)
g.box('weather sealed pump cabinet',[1.1,1.4,.9],[4.25,1.4,1.5],steel)
g.box('small water gauge',[.17,1.13,.4],[2.90,5.9,.65],black)
g.box('protected glass gauge',[.12,.92,.25],[3.02,5.9,.65],glass)
# supply bucket next to potable tap
bucket=trimesh.creation.cylinder(radius=.35,height=.6,sections=24)
bucket.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]));bucket.apply_translation([5.20,.5,.4]);g.add(bucket,'collection bucket',metal)
g.tube('bucket rolled lip',[5.2,.81,.4],.36,.022,metal)
# Thin oxide trails follow the steel wall, not freestanding sticks.
oxide=[]
for i in range(22):
 a=(i+.3)*2*math.pi/22
 r=2.741
 x,z=r*math.cos(a),r*math.sin(a)
 y=3.05+(i%7)*.65
 oxide.append(( [.055,.31+.055*(i%4),.055],[x,y,z] ))
g.batch_boxes('old welded water stains on circumference',oxide,rust)
# Paint band and readable inspection marks make the huge cylinder identifiable.
g.batch_boxes('water inspection legend',[
 ((.65,.16,.018),(0,6.35,2.75)),
 ((.65,.05,.018),(0,6.05,2.75)),
 ((.22,.045,.018),(-.22,5.91,2.75)),
 ((.22,.045,.018),(.22,5.91,2.75))],label)
g.export('afterday_water_tank_pbr.glb')

# ---- SUPPLY BOXES -------------------------------------------------------
g=Model()
for i in range(5):
 x=(i%3)*1.45;z=(i//3)*2.;h=1.45 if i%2==0 else 1.2
 g.box('gasket storage box',[1.23,h,1.28],[x,h*.5+.16,z],wood if i%2 else steel)
 g.box('gasket cover',[1.3,.16,1.34],[x,h+.19,z],black)
 for side in [-1,1]:
  g.box('metal corner',[.084,h,.10],[x+side*.57,h*.5+.15,z+.63],metal)
  g.box('metal corner',[.084,h,.10],[x+side*.57,h*.5+.15,z-.63],metal)
 for xx in [-.27,.27]:g.box('lid latch',[.21,.32,.06],[x+xx,h+.035,z+.70],rust)
 g.box('recessed lock',[.20,.21,.07],[x,h-.15,z+.71],metal)
 g.rod('side grip',[x-.48,h*.6,z-.65],[x+.48,h*.6,z-.65],.034,black)
# Stencilled supply labeling and recessed-grip plates are physically part of
# the imported GLB rather than attached to hidden procedural fallbacks.
labels=[];stripes=[]
for i in range(5):
 x=(i%3)*1.45;z=(i//3)*2.;h=1.45 if i%2==0 else 1.2
 labels.append(((.67,.33,.026),(x,h*.57,z+.665)))
 for k in range(3):
  stripes.append(((.38-.07*k,.021,.027),(x,h*.57+.08-k*.085,z+.69)))
g.batch_boxes('worn paper provision inventory placards',labels,label)
g.batch_boxes('tiny stencil strip marks',stripes,blackInk)
g.export('afterday_storage_pbr.glb')

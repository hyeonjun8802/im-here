#!/usr/bin/env python3
"""Refine AFTERDAY bearded-survivor GLB: softer cheek/ear/brow and reduced clothing volume.
No image billboards and no flat face: every visible character component is 3D geometry.
Neutral, local Y-up and looking along +Z. Rig joints use glTF named node pivots.
"""
from __future__ import annotations
from pathlib import Path
import math, numpy as np, trimesh
from PIL import Image
from scipy.ndimage import gaussian_filter
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb'
OUT.parent.mkdir(parents=True,exist_ok=True)
S=trimesh.Scene()
COUNT=0
MATERIALS={}
TEXTURE_NAMES=('coat','pants','cap','leather','boot','scarf','beard','skin','glove','hair')
MAT_IMAGES={}
def woven_normal_map(image, strength=.013):
    # Actual tangent-space normal map from source albedo luminance; PBR receives both.
    grey=np.asarray(image.convert('L'),dtype=np.float32)
    dy,dx=np.gradient(gaussian_filter(grey, .65))
    nx=-dx*strength;ny=-dy*strength
    nz=np.ones_like(nx)
    norm=np.sqrt(nx*nx+ny*ny+nz*nz)
    rgb=np.stack([(nx/norm*.5+.5)*255,(ny/norm*.5+.5)*255,(nz/norm*.5+.5)*255],axis=-1)
    return Image.fromarray(np.clip(rgb,0,255).astype('uint8'),'RGB')

def procedural_material_image(name,hexc):
    """Seamless subtle albedo texture; all files embed in the GLB, no external download."""
    h=hexc.lstrip('#');c=np.array([int(h[i:i+2],16) for i in (0,2,4)],dtype=float)
    size=384
    seed=sum((k+1)*ord(ch) for k,ch in enumerate(name))
    rng=np.random.default_rng(seed)
    fine=rng.normal(0,1,(size,size));large=gaussian_filter(rng.normal(0,1,(size,size)),sigma=9,mode='wrap')
    large=large/(np.std(large)+1e-6)
    if 'coat' in name or 'pants' in name or 'scarf' in name or 'cap' in name:
       y,x=np.mgrid[0:size,0:size]
       threads=np.sin(x*np.pi/2)*.6+np.cos(y*np.pi/2)*.6
       shade=1+fine*.020+large*.034+threads*.018
    elif 'beard' in name or 'hair' in name:
       y,x=np.mgrid[0:size,0:size]
       threads=np.sin(x*.54+y*.12)*.5 + np.sin(x*.24-y*.15)*.2
       shade=1+fine*.032+large*.100+threads*.120
    elif 'skin' in name:
       shade=1+fine*.010+large*.015
    else:shade=1+fine*.016+large*.045
    arr=np.clip(c[None,None,:]*shade[:,:,None],0,255).astype('uint8')
    img=Image.fromarray(arr,'RGB');MAT_IMAGES[name]=img
    return img

def mat(name,hexc,rough=.85,metal=0):
    h=hexc.lstrip('#');rgb=[int(h[i:i+2],16) for i in (0,2,4)]
    key=name.lower()
    if any(t in key for t in TEXTURE_NAMES):
        tex=procedural_material_image(name,hexc)
        # baseColorFactor is white because the texture already holds the material tint.
        m=PBRMaterial(name=name,baseColorFactor=[255,255,255,255],baseColorTexture=tex,
            metallicFactor=metal,roughnessFactor=rough,
            normalTexture=woven_normal_map(tex) if any(k in key for k in ("coat","cap","pants","scarf","leather","boot")) else None,
            doubleSided=False)
    else:
        m=PBRMaterial(name=name,baseColorFactor=rgb+[255],metallicFactor=metal,roughnessFactor=rough,doubleSided=False)
    MATERIALS[name]=m
    return m
SKIN=mat('warm skin · sculpted not drawn','#d6a17b',.92)
SKIN_SHADE=mat('skin shadow','#c08c6d')
NOSE=mat('nose skin','#e0ab83')
BEARD=mat('black beard · charcoal','#282320')
BEARD_SHADE=mat('beard shadows','#1d1a19')
BEARD_EDGE=mat('beard outer hair','#41352f')
HAIR=mat('short black hair','#24211e')
BROW=mat('eyebrows','#26201b')
EYE_WHITE=mat('ivory sclera','#dfd3c4',.55)
IRIS=mat('brown iris','#2d2017',.38)
PUPIL=mat('pupil','#151311',.26)
CATCH=mat('catchlight','#fcf5e6',.3)
# Artist-approved front jacket image is baked as albedo onto a curved GLB body.
# This is real 3D mesh texture mapping, NOT an image plane or a billboard.
REF=Path(__file__).resolve().parents[1]/'docs/qa/APPROVED_CHARACTER_TURNAROUND.png'
refimage=Image.open(REF).convert('RGB')
coat_front=refimage.crop((71,375,264,639)).resize((480,512),Image.Resampling.LANCZOS)
# Side/back use a subtle palette-matched fabric atlas.
side_tex=procedural_material_image('coat reverse textile','#667252').resize((480,512))
coat_atlas=Image.new('RGB',(960,512))
coat_atlas.paste(coat_front,(0,0));coat_atlas.paste(side_tex,(480,0))
COAT_ART=PBRMaterial(name='approved character jacket photo-baked fabric',baseColorFactor=[255]*4,
                     baseColorTexture=coat_atlas,normalTexture=woven_normal_map(coat_atlas,.008),
                     roughnessFactor=.93,metallicFactor=0,doubleSided=False)
MATERIALS['approved jacket atlas']=COAT_ART;MAT_IMAGES[COAT_ART.name]=coat_atlas
CAP=mat('worn brown cap','#4a4136')
CAP_BRIM=mat('cap visor','#40362d')
CAP_PATCH=mat('patched cap crest','#725f49')
COAT=mat('olive scavenger coat','#687454')
COAT_SHADE=mat('coat seams','#566147')
COAT_LIGHT=mat('coat high seam','#768262')
SHIRT=mat('dark undershirt','#353b35')
SCARF=mat('woven beige scarf','#ab9b7a')
SCARF_SHADE=mat('scarf shadow','#887b61')
PANTS=mat('weathered grey brown pants','#8b7b69')
PANTS_LIGHT=mat('pants fold high','#998875')
LEATHER=mat('old brown leather','#544032')
LEATHER_EDGE=mat('leather edge','#7d5f43')
GLOVE=mat('black work gloves','#292b27')
BOOT=mat('muddy worn boots','#3d342d')
BOOT_EDGE=mat('boot stitching','#b0a28d')
METAL=mat('brushed metal','#8c8980',.54,.55)
BRASS=mat('aged brass','#ac8b53',.52,.65)

# glTF rig nodes. A child of a named joint remains transformable in Three.js.
def T(x=0,y=0,z=0):
 m=np.eye(4);m[:3,3]=[x,y,z];return m
for name,parent,t in [
 ('RigRoot','world',(0,0,0)),
 ('Torso','RigRoot',(0,1.28,0)),
 ('Head','RigRoot',(0,2.38,.07)),
 ('UpperArm_L','RigRoot',(-.64,1.73,0)),('UpperArm_R','RigRoot',(.64,1.73,0)),
 ('UpperLeg_L','RigRoot',(-.31,1.12,0)),('UpperLeg_R','RigRoot',(.31,1.12,0)),
 ('Knee_L','UpperLeg_L',(0,-.43,0)),('Knee_R','UpperLeg_R',(0,-.43,0)),
 ]:
 S.graph.update(frame_to=name,frame_from=parent,matrix=T(*t))

def add(mesh,material,parent,name,position=None):
 global COUNT
 if position is not None: mesh.apply_translation(position)
 if material is COAT_ART:
    pts=mesh.vertices.astype(float)
    # Front projected UV from original art; right half is back and side fabric.
    front=pts[:,2]>0.05
    u=np.where(front, .5*np.clip((pts[:,0]+.65)/1.30,0,1),
               .5+.5*np.clip((pts[:,0]+.65)/1.30,0,1))
    v=np.clip((pts[:,1]+.49)/1.02,0,1)
    mesh.visual=TextureVisuals(uv=np.column_stack((u,v)),material=material)
 elif material.name in MAT_IMAGES:
    pts=mesh.vertices.astype(float);center=pts.mean(axis=0);delta=pts-center
    uu=(np.arctan2(delta[:,0],delta[:,2])/(math.pi*2))+.5
    lo=pts[:,1].min();hi=pts[:,1].max()
    vv=(pts[:,1]-lo)/(hi-lo+1e-10)
    mesh.visual=TextureVisuals(uv=np.column_stack((uu,vv)),material=material)
 else:
    mesh.visual=TextureVisuals(material=material)
 geomname=f'{name}_{COUNT:03d}'
 S.add_geometry(mesh,geom_name=geomname,node_name=geomname,parent_node_name=parent)
 COUNT+=1
 return mesh

def ball(parent,name,xyz,scale,material,section=30):
 m=trimesh.creation.uv_sphere(radius=1,count=[section,section]);m.vertices*=np.array(scale)
 return add(m,material,parent,name,xyz)

def roundbox(parent,name,center,ext,material,radius=0.08):
 # smoothly rounded cuboid as 3D superellipsoid; no sharp BoxGeometry seams
 u=np.linspace(-np.pi/2,np.pi/2,21)
 v=np.linspace(0,2*np.pi,42,endpoint=False)
 verts=[]
 expo=max(.30,min(.9,radius/max(ext)*4.0))
 def sgnpow(x,e):return np.sign(x)*np.abs(x)**e
 for a in u:
  for b in v:
   cu=sgnpow(np.cos(a),expo);su=sgnpow(np.sin(a),expo)
   verts.append([ext[0]/2*cu*sgnpow(np.cos(b),expo),ext[1]/2*su,ext[2]/2*cu*sgnpow(np.sin(b),expo)])
 faces=[];n=len(v)
 for i in range(len(u)-1):
  for j in range(n):
   a=i*n+j;b=i*n+(j+1)%n;c=(i+1)*n+j;d=(i+1)*n+(j+1)%n
   faces.extend([(a,c,b),(b,c,d)])
 mesh=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=False)
 mesh.fix_normals()
 return add(mesh,material,parent,name,center)

def path(parent,name,points,r,material,sides=9,seg=6):
 """Rounded swept-tube; oriented smoothly so it reads as cloth trim / hair."""
 pp=np.array(points,float);samples=[]
 for i in range(len(pp)-1):
  p0=pp[max(0,i-1)];p1=pp[i];p2=pp[i+1];p3=pp[min(len(pp)-1,i+2)]
  for k in range(seg):
   t=k/seg
   samples.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
 samples.append(pp[-1]);samples=np.array(samples)
 verts=[];faces=[]
 for i,p in enumerate(samples):
  direction=samples[min(i+1,len(samples)-1)]-samples[max(0,i-1)]
  direction/=np.linalg.norm(direction)+1e-9
  ref=np.array([0,1,0]) if abs(direction[1])<.95 else np.array([1,0,0])
  axis=np.cross(direction,ref);axis/=np.linalg.norm(axis)+1e-9
  axis2=np.cross(direction,axis)
  for j in range(sides):
   a=j*2*math.pi/sides
   rr=r*(.65+.35*math.sin(math.pi*(i+.7)/(len(samples)+.4))**.45)
   verts.append(p+rr*(axis*math.cos(a)+axis2*math.sin(a)))
  if i:
   for j in range(sides):
    a=(i-1)*sides+j;b=(i-1)*sides+(j+1)%sides;c=i*sides+j;d=i*sides+(j+1)%sides
    faces.extend([(a,b,c),(b,d,c)])
 mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 mesh.fix_normals()
 return add(mesh,material,parent,name)

def disk(parent,name,xyz,radius,height,material,axis='y',n=40):
 m=trimesh.creation.cylinder(radius=radius,height=height,sections=n)
 if axis=='z':m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
 return add(m,material,parent,name,xyz)

# -------------------------------------------------------
# AFTERDAY v1.9.3: reference-shaped soft garment silhouette.
# The jacket is ONE continuous lofted surface; not overlapping armor ellipsoids.
# -------------------------------------------------------
def garment_loft(parent, name, rings, material, segments=72):
    verts=[]; faces=[]
    for y,rx,rz,cz in rings:
        for j in range(segments):
            a=2*math.pi*j/segments
            verts.append((rx*math.cos(a),y,cz+rz*math.sin(a)))
    for k in range(len(rings)-1):
        for j in range(segments):
            i=k*segments+j; n=k*segments+(j+1)%segments
            q=(k+1)*segments+j;r=(k+1)*segments+(j+1)%segments
            faces.extend([(i,n,q),(n,r,q)])
    bottom=len(verts);verts.append((0,rings[0][0],rings[0][3]))
    top=len(verts);verts.append((0,rings[-1][0],rings[-1][3]))
    for j in range(segments):
        faces.append((bottom,j,(j+1)%segments))
        n=(len(rings)-1)*segments+j;nn=(len(rings)-1)*segments+(j+1)%segments
        faces.append((top,nn,n))
    mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    mesh.fix_normals()
    return add(mesh,material,parent,name)

# Both jacket and waistband follow the approved brown/olive silhouette.
garment_loft('Torso','premium continuous jacket body',[
 (-.49,.474,.355,-.012),(-.44,.523,.391,-.005),(-.27,.571,.425,-.005),
 (-.06,.604,.443,0),(.16,.610,.446,0),(.33,.558,.412,-.005),
 (.445,.49,.379,-.008),(.53,.37,.320,-.006)
],COAT_ART)
# Small inset zip opening: no fake plate that crosses character abdomen.
ball('Torso','dark narrow shirt collar',(0,.385,.360),(.152,.195,.055),SHIRT,28)
path('Torso','subdued jacket zipper',[(0,.34,.438),(0,.15,.466),(0,-.14,.461),(0,-.43,.397)],.011,METAL,8,6)
for s in (-1,1):
    # Make chest volume part of jacket, not separate floating padded shoulders.
    ball('Torso','soft tailored shoulder',(s*.454,.258,-.015),(.079,.101,.124),COAT,30)
    roundbox('Torso','small low profile coat pocket',(s*.327,-.006,.451),(.208,.171,.038),COAT_SHADE,.026)
    roundbox('Torso','thin pocket flap',(s*.327,.083,.475),(.209,.039,.032),COAT_LIGHT,.017)
    path('Torso','pocket lower seam',[(s*.235,-.085,.477),(s*.327,-.091,.479),(s*.411,-.082,.464)],.008,COAT_LIGHT,7,5)
    path('Torso','jacket edge seam',[(s*.065,.40,.422),(s*.073,.12,.482),(s*.068,-.24,.457),(s*.065,-.46,.398)],.009,COAT_SHADE,8,6)
    # Small leather backpack harness, carefully placed flush to garment.
    path('Torso','subtle backpack harness',[(s*.36,.50,.020),(s*.395,.29,.305),(s*.383,-.04,.405),(s*.363,-.32,.370)],.030,LEATHER,8,7)
    # Minimized field utility pouch, not a ball stuck to the hips.
    roundbox('Torso','compact tool pouch',(s*.536,-.36,.017),(.174,.223,.174),LEATHER,.053)
    roundbox('Torso','utility pouch flap',(s*.536,-.245,.102),(.153,.052,.035),LEATHER_EDGE,.022)
# Gentle layered scarf rolls below chin, not crossing nose/eyes.
ball('Torso','low profile coat collar',(0,.495,-.01),(.395,.098,.350),COAT_SHADE,32)
for i,(y,w,h,depth) in enumerate(((.542,.426,.086,.370),(.621,.411,.082,.351),(.688,.387,.067,.335))):
    ball('Torso','soft scarf fold',(0,y,.014+i*.002),(w,h,depth),SCARF if i!=1 else SCARF_SHADE,32)
# Distinct compact utilitarian pack with real strap, not blocky high-poly armor.
ball('Torso','compact rucksack',(0,.025,-.440),(.377,.463,.202),LEATHER,40)
roundbox('Torso','rucksack low profile flap',(0,.238,-.611),(.475,.227,.067),LEATHER_EDGE,.062)
path('Torso','fabric jacket lower hem',[(-.42,-.468,.220),(-.2,-.478,.373),(0,-.48,.395),(.2,-.478,.373),(.42,-.468,.220)],.011,COAT_SHADE,8,6)

# Approved short arm; softly rounded sleeve from natural dropped shoulders.
def tailored_sleeve(parent,side):
    # All cross-sections follow a smooth bell-to-wrist taper.
    rings=[(.025,.157,.158),(-.070,.193,.190),(-.165,.188,.181),
           (-.310,.172,.163),(-.463,.147,.141),(-.575,.119,.119)]
    n=48;verts=[];faces=[];cx=side*.010
    for y,rx,rz in rings:
        for j in range(n):
            a=2*math.pi*j/n
            verts.append((cx+rx*math.cos(a),y,.004+rz*math.sin(a)))
    for k in range(len(rings)-1):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+j;d=(k+1)*n+(j+1)%n
            faces.extend([(a,b,c),(b,d,c)])
    top=len(verts);verts.append((cx,.025,.004));bottom=len(verts);verts.append((cx,-.575,.004))
    for j in range(n):
        faces.extend([(top,j,(j+1)%n),(bottom,(len(rings)-1)*n+(j+1)%n,(len(rings)-1)*n+j)])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False);m.fix_normals()
    return add(m,COAT,parent,'slim work sleeve')
for side,s in [('L',-1),('R',1)]:
    p='UpperArm_'+side
    tailored_sleeve(p,s)
    ball(p,'smooth fabric sleeve shell',(0,-.272,.003),(.190,.310,.190),COAT,32)
    ball(p,'folded cuff',(0,-.570,.012),(.142,.086,.140),COAT_LIGHT,28)
    ball(p,'work glove',(0,-.692,.052),(.143,.143,.141),GLOVE,28)
    ball(p,'small thumb',(s*.136,-.658,.136),(.059,.073,.071),GLOVE,24)
    path(p,'sleeve rolled seam',[(-.126,-.552,.101),(0,-.565,.155),(.126,-.552,.101)],.008,COAT_SHADE,8,6)
    roundbox(p,'subtle shoulder field patch',(s*.012,-.145,.179),(.169,.118,.022),COAT_SHADE,.026)
# Subtle fabric sculpt folds follow gravity; high-quality curved lines rather than bolts.
for s in (-1,1):
    path('Torso','soft jacket side fold',[(s*.49,.18,.226),(s*.535,-.08,.236),(s*.490,-.37,.234)],.008,COAT_SHADE,7,6)
    path('Torso','small elbow fold',[(s*.48,.21,.27),(s*.50,.10,.28)],.007,COAT_LIGHT,7,5)

# Two visible tan cargo trouser legs with soft fabric folds and brown knee pads.
for side,s in [('L',-1),('R',1)]:
    thigh='UpperLeg_'+side; knee='Knee_'+side
    ball(thigh,'tailored sand cargo thigh',(0,-.246,.008),(.263,.330,.270),PANTS,36)
    ball(knee,'soft fabric shin',(0,-.225,.015),(.241,.300,.246),PANTS,32)
    ball(knee,'folded ankle trouser cuff',(0,-.450,.028),(.242,.114,.238),PANTS_LIGHT,30)
    # Brown pads are flat, curved cloth patches, never inflated oval armor.
    roundbox(thigh,'flat cargo knee reinforcement',(0,-.424,.290),(.355,.211,.052),LEATHER,.052)
    roundbox(thigh,'small outer cargo pocket',(s*.234,-.122,.087),(.072,.190,.173),PANTS_LIGHT,.038)
    path(thigh,'cargo side seam',[(s*.249,-.02,.104),(s*.270,-.15,.10),(s*.252,-.35,.10)],.008,PANTS_LIGHT,7,5)
    # Soft boot with flatter tread; target has chunky but compact brown boots.
    roundbox(knee,'weathered thick sole',(0,-.584,.117),(.530,.135,.658),BOOT,.09)
    ball(knee,'leather ankle boot',(0,-.504,.043),(.233,.198,.245),BOOT,32)
    roundbox(knee,'boot rounded toe',(0,-.552,.272),(.448,.126,.297),BOOT,.093)
    path(knee,'boot toe seam',[(-.210,-.548,.355),(0,-.560,.416),(.210,-.548,.355)],.012,BOOT_EDGE,8,6)
    for j in range(4):
       y=-.415+j*.043
       path(knee,'flat boot laces',[(-.080,y,.310),(0,y-.008,.355),(.080,y,.310)],.008,BOOT_EDGE,7,4)

# -------------------------------------------------------
# Human-ish stylized adult head. All round volumes, no face decal planes.
# Face is genuinely curved front surface + cheek, nose, chin geometry.
# -------------------------------------------------------
# Main skull cheeks broad + chin taper (adult; face lower half covered by beard)
skull=trimesh.creation.uv_sphere(radius=1,count=[56,44])
v=skull.vertices.copy();x=v[:,0];y=v[:,1];z=v[:,2]
# round head, broad forehead, slightly narrowed jaw, front brow bulge
v[:,0]*=.49*(.96+.075*np.clip(y,0,1))
v[:,1]*=.56
v[:,2]*=.42*(1+.12*np.maximum(z,0)*(1-y*y))
skull.vertices=v
add(skull,SKIN,'Head','sculpted adult head')
# ears are genuinely three-dimensional
for s in (-1,1):
 ball('Head','small anatomical ear',(s*.47,-.055,-.008),(.066,.114,.064),SKIN,28)
 # removed separate oval inner-ear blob; neutral anatomical ear silhouette instead
 # cheeks add soft facial contour instead of flat face
 # exaggerated cheek spheres removed; cheek contour is sculpted into skull surface
 # eyebrow ridge above eyes, eye aperture integrated at surface
 # removed protruding brow ridge; relaxed subtle single eyebrow line only
 # sockets, short curved eyelids, eye spheres (not flat PNG stickers)
 ball('Head','small calm sclera',(s*.188,.085,.425),(.097,.072,.030),EYE_WHITE,32)
 ball('Head','natural brown iris',(s*.188,.085,.453),(.050,.053,.014),IRIS,28)
 ball('Head','small dark pupil',(s*.188,.085,.467),(.033,.035,.010),PUPIL,24)
 ball('Head','tiny subtle catchlight',(s*.172,.105,.478),(.004,.004,.003),CATCH,18)
 path('Head','unobtrusive eyelid upper',[(s*.127,.114,.439),(s*.16,.124,.449),(s*.213,.121,.451),(s*.248,.108,.434)],.011,SKIN_SHADE)
 path('Head','thin relaxed eyebrow',[(s*.12,.207,.408),(s*.16,.217,.418),(s*.214,.215,.411),(s*.262,.203,.386)],.019,BROW)
# bridge and rounded tip sculpted, beard will cover lower chin
ball('Head','soft nose bridge',(0,-.043,.422),(.049,.110,.036),NOSE,28)
ball('Head','soft nose tip',(0,-.148,.477),(.077,.062,.059),NOSE,30)
for s in (-1,1):ball('Head','small nostril wings',(s*.068,-.17,.483),(.035,.024,.038),SKIN_SHADE,20)
# A unified carved beard surface, not three disconnected black balloons.
# Vary small volumes smoothly to produce a believable jaw silhouette.
from skimage.measure import marching_cubes

def sculpted_full_beard():
    nx=88;ny=75;nz=85
    X,Y,Z=np.mgrid[-.56:.56:complex(nx),-.76:.04:complex(ny),-.10:.68:complex(nz)]
    def ellipse(center,radius):
        sx=(X-center[0])/radius[0];sy=(Y-center[1])/radius[1];sz=(Z-center[2])/radius[2]
        return (np.sqrt(sx*sx+sy*sy+sz*sz)-1)*min(radius)
    shapes=[
      ellipse((0,-.336,.194),(.385,.234,.285)),
      ellipse((0,-.496,.222),(.245,.177,.260)),
      ellipse((-.317,-.259,.210),(.113,.174,.160)),
      ellipse((.317,-.259,.210),(.113,.174,.160)),
    ]
    def smin(a,b,k):
        h=np.maximum(k-np.abs(a-b),0)/k
        return np.minimum(a,b)-h*h*k*.25
    f=shapes[0]
    for other in shapes[1:]:f=smin(f,other,.115)
    v,tri,_,_=marching_cubes(f,level=0.0,spacing=(1.12/(nx-1),.80/(ny-1),.78/(nz-1)))
    v+=np.array([-.56,-.76,-.10])
    m=trimesh.Trimesh(vertices=v,faces=tri,process=False);m.fix_normals()
    return add(m,BEARD,'Head','single unified sculpted black beard')
sculpted_full_beard()
# Two modest moustache lobes give a clear mouth without separate giant black beads.
for side,s in [('L',-1),('R',1)]:
    ball('Head','connected moustache',(s*.112,-.250,.478),(.124,.041,.051),BEARD_SHADE,30)
    path('Head','beard cheek flow',[(s*.39,-.15,.238),(s*.390,-.28,.330),(s*.306,-.453,.361)],.011,BEARD_EDGE,8,5)
# Sparse subtle hair flow on actual curved jaw, still a single primary beard mass.
for side,sgn in [('L',-1),('R',1)]:
    for j in range(4):
        x=sgn*(.07+j*.071)
        z=.459-j*.025
        path('Head','fine sculpted beard directional grooves',[(x,-.328,z),(x+sgn*.009,-.398,z-.023),(x+sgn*.010,-.476,z-.067)],
             .009,BEARD_EDGE,7,5)
ball('Head','soft lower lip',(0,-.277,.491),(.059,.023,.021),SKIN_SHADE,24)
# Short black hair with tiny front strands tucked beneath structured cap.
for side,s in [('L',-1),('R',1)]:
    ball('Head','black side-hair tucked under cap',(s*.393,.275,.044),(.114,.149,.177),HAIR,28)
    path('Head','short dark sideburn',[(s*.445,.185,.150),(s*.444,.04,.223),(s*.401,-.092,.224)],.022,HAIR,8,5)
# subtle bangs visible below visor; do not cover eyes with long sharp spikes
for x0,dx,length in [(-.27,.06,.105),(-.15,.03,.133),(-.037,.033,.109),(.086,-.039,.135),(.207,-.064,.106)]:
    path('Head','forehead black fringe',[(x0,.313,.401),(x0+dx*.5,.257,.434),(x0+dx,.313-length,.429)],.027,HAIR,9,6)
# v1.9.2: a genuine baseball cap, not a puffed beret / flat pancake.
# Build a crown from lofted rounded-rectangular rings: straight-ish sidewalls,
# a *flat broad top*, and a moderately curved bill. All coordinates are local Head.
def angular_cap_crown():
    # (height, horizontal radius, depth radius, center-z) -- upright crown + flattened top
    rings=[(.215,.467,.426,-.034),(.305,.495,.449,-.030),
           (.415,.502,.454,-.034),(.540,.485,.433,-.037),
           (.633,.459,.405,-.042),(.672,.435,.380,-.044)]
    n=96
    verts=[]
    for yi,xr,zr,zc in rings:
        # superellipse: slightly squared-off crown; round corners, no sharp crate look
        for i in range(n):
            a=2*math.pi*i/n
            def sq(v,p=.76): return math.copysign(abs(v)**p, v)
            x=xr*sq(math.cos(a)); z=zc+zr*sq(math.sin(a))
            verts.append((x,yi+0.012*math.cos(a)**2,z))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(n):
            a=j*n+i;bb=j*n+(i+1)%n;c=(j+1)*n+i;d=(j+1)*n+(i+1)%n
            faces.append((a,bb,c));faces.append((bb,d,c))
    # closing the top as a flat panel (no round top bun)
    top=len(verts);verts.append((0,.677,-.044))
    for i in range(n):faces.append((top,(len(rings)-1)*n+i,(len(rings)-1)*n+(i+1)%n))
    # close lower boundary for consistent face winding
    bottom=len(verts);verts.append((0,.218,-.034))
    for i in range(n): faces.append((bottom,(i+1)%n,i))
    m=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)
    m.fix_normals()
    return add(m,CAP,'Head','cap sculpted crown')

def curved_cap_bill():
    # One smoothly curved *thin* visor (not a big ellipsoid pressing on the eyebrows).
    segments=36; layers=9;verts=[]
    for h in (0.0,-.033):  # upper and lower surfaces
        for row in range(layers):
            t=row/(layers-1)
            for i in range(segments+1):
                x=(i/segments*2-1)*.483
                e=abs(x)/.483
                # front edge swings forward in center, winds back near temples
                front=.767-.375*(e**1.8)
                back=.291-.015*e
                z=back+(front-back)*t
                y=.314 - .033*t + .040*(e*e) + .007*math.cos(math.pi*t)
                verts.append((x,y+h,z))
    faces=[];L=(segments+1)*layers
    for layer in (0,1):
        off=layer*L
        for j in range(layers-1):
            for i in range(segments):
                a=off+j*(segments+1)+i;b=a+1;c=a+(segments+1);d=c+1
                if layer==0:faces.extend(((a,c,b),(b,c,d)))
                else: faces.extend(((a,b,c),(b,d,c)))
    for j in range(layers-1):
        for i in (0,segments):
            a=j*(segments+1)+i;b=(j+1)*(segments+1)+i
            faces.extend(((a,b,a+L),(b,b+L,a+L)))
    for i in range(segments):
        for j in (0,layers-1):
            a=j*(segments+1)+i;b=a+1
            faces.extend(((a,a+L,b),(b,a+L,b+L)))
    m=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)
    m.fix_normals()
    return add(m,CAP_BRIM,'Head','structured baseball cap bill')

angular_cap_crown()
curved_cap_bill()
# A soft seam and small square cloth patch, without extra crown bumps.
path('Head','brim edge stitching',[(-.46,.33,.42),(-.27,.294,.674),(0,.284,.763),(.27,.294,.674),(.46,.33,.42)],.008,CAP_PATCH,8,5)
roundbox('Head','cap stitched patch',(0,.49,.426),(.172,.105,.017),CAP_PATCH,.028)
path('Head','crown front center seam',[(0,.569,.393),(0,.631,.351),(0,.666,.30)],.007,LEATHER_EDGE,7,5)
path('Head','cap rear adjustment',[(-.14,.278,-.449),(0,.273,-.472),(.14,.278,-.449)],.013,LEATHER_EDGE)
# A single mildly oversized collar under the head, without face-occluding scarf
# Neck scarf is attached to torso, below beard. No z-fighting overlap on face.

# Match reference head-to-body ratio: scale only Head rig's local Y axis.
# Head still has the same parent and name; all hats, hair, face and beard inherit the scale.
H=np.eye(4); H[1,1]=.87;H[:3,3]=[0,2.38,.07]
S.graph.update(frame_to='Head',frame_from='RigRoot',matrix=H)

# add 3D accessory prop for guitar separately in-game, not to every frame
# metadata for game acceptance checks
S.metadata.update({'afterday_version':'1.9.3-premium-pass-2','character':'approved short-limbed bearded adult, brown baseball cap, olive field jacket',
 'coordinate_system':'Y up, forward +Z','license':'Original generated geometry',
 'rig_nodes':['RigRoot','Torso','Head','UpperArm_L','UpperArm_R','UpperLeg_L','UpperLeg_R','Knee_L','Knee_R']})
blob=S.export(file_type='glb',include_normals=True)
OUT.write_bytes(blob)
vertices=sum(len(g.vertices) for g in S.geometry.values());faces=sum(len(g.faces) for g in S.geometry.values())
print('GLB',OUT,'bytes',len(blob),'meshes',len(S.geometry),'vertices',vertices,'triangles',faces)
print('bounds',S.bounds)

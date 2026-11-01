#!/usr/bin/env python3
"""AFTERDAY 2.0: single, restrained short-limbed GLB survivor. Face artwork is
UV mapped onto a CURVED 3D face, not duplicated procedural facial anatomy.
Reference: user-approved turnaround. All textures embedded in GLB.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals
import trimesh, numpy as np, math

ROOT=Path(__file__).resolve().parent.parent
REF=ROOT/'docs/qa/APPROVED_CHARACTER_TURNAROUND.png'
OUT=ROOT/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb'
QA=ROOT/'docs/qa/v200'; QA.mkdir(parents=True,exist_ok=True)
scene=trimesh.Scene(); count=0

def T(x=0,y=0,z=0):
    m=np.eye(4);m[:3,3]=[x,y,z];return m

# Pivot layout intentionally unchanged: v1.9.3's seat solver and activity system
# attach to these exact nodes. Feet stay at local ground y approximately -0.25.
for name,parent,p in [
 ('RigRoot','world',(0,0,0)),('Torso','RigRoot',(0,1.28,0)),
 ('Head','RigRoot',(0,2.38,.07)),
 ('UpperArm_L','RigRoot',(-.56,1.72,0)),('UpperArm_R','RigRoot',(.56,1.72,0)),
 ('UpperLeg_L','RigRoot',(-.31,1.12,0)),('UpperLeg_R','RigRoot',(.31,1.12,0)),
 ('Knee_L','UpperLeg_L',(0,-.43,0)),('Knee_R','UpperLeg_R',(0,-.43,0))]:
    scene.graph.update(frame_to=name,frame_from=parent,matrix=T(*p))

def material(name,color,rough=.86,metal=.0,texture=None,alpha=False):
    c=color.lstrip('#');rgb=[int(c[i:i+2],16) for i in (0,2,4)]
    kwargs=dict(name=name,roughnessFactor=rough,metallicFactor=metal,doubleSided=alpha)
    if texture is not None:
        kwargs['baseColorFactor']=[255]*4
        kwargs['baseColorTexture']=texture
        if alpha:kwargs['alphaMode']='BLEND'
    else:kwargs['baseColorFactor']=rgb+[255]
    return PBRMaterial(**kwargs)

ref=Image.open(REF).convert('RGB')
def ref_fabric(label,box):
    img=ref.crop(box).resize((384,384),Image.Resampling.LANCZOS)
    img.save(QA/('fabric_'+label+'.jpg'),quality=90)
    return material('reference based matte '+label,'#ffffff',.96,texture=img)

skin=material('warm softly shaded face','#cb9673')
olive=ref_fabric('olive_sleeve',(30,421,92,555))
olive_dark=material('subtle coat seam','#485240')
shirt=material('matte charcoal shirt','#41443d')
scarf=ref_fabric('scarf',(94,371,265,431))
# Pants use a flat woven sample rather than giant repeated knee-pad stripes.
pants=ref_fabric('brown_trousers',(110,593,140,622))
cap=ref_fabric('brown_cap',(86,135,264,220))
cap_edge=material('cap brim underside','#332e28')
hair=material('short black hair','#24211f')
beard=material('beard side silhouette dark','#2d2624')
gloves=ref_fabric('work_gloves',(24,548,82,632))
boots=ref_fabric('leather_boots',(89,762,153,868))
leather=material('small backpack brown','#57483c')
metal=material('aged grey metal','#7e7b72',.64,.3)

# Art reference is owned by the AFTERDAY package. Face features are deliberately
# NOT modelled as eyeball, cheekbone, eyebrow, nose or beard blobs.
# The artist-approved front view is cropped; no generated face features.
face=ref.crop((89,210,290,418)).resize((640,640),Image.Resampling.LANCZOS).convert('RGBA')
mask=Image.new('L',(640,640),0)
md=ImageDraw.Draw(mask)
md.ellipse((22,9,619,635),fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(21))
face.putalpha(mask)
face.save(QA/'approved_face_curved_texture.png')
face_mat=material('artist approved facial features on curved face','#ffffff',.94,texture=face,alpha=True)

# Narrow wear pattern, not painted on giant physical patch meshes.
cloth=Image.new('RGB',(512,512),(98,108,82));d=ImageDraw.Draw(cloth)
rng=np.random.default_rng(20261031)
px=np.asarray(cloth,dtype=np.int16)
noise=rng.normal(0,2.5,(512,512,1))
px=np.uint8(np.clip(px+noise,0,255));cloth=Image.fromarray(px,'RGB');d=ImageDraw.Draw(cloth)
# central zipper and small low-contrast stitching only. UV does not force these
# features on the face; cloth tone is useful from any camera angle.
for x in (256,258):d.line([(x,42),(x,489)],fill=(118,122,97),width=2)
for x0 in (76,355):
 d.rounded_rectangle((x0,308,x0+77,379),radius=8,outline=(77,85,64),width=3)
 d.line([(x0+10,321),(x0+67,321)],fill=(126,128,103),width=2)
cloth.save(QA/'jacket_painted_detail_texture.jpg')
cloth_mat=material('low detail workwear PBR fabric','#ffffff',.93,texture=cloth)

def attach(mesh,mat,parent,name,uv=None,offset=None):
    global count
    if offset is not None:mesh.apply_translation(offset)
    if uv is None and mat.baseColorTexture is not None:
        p=np.asarray(mesh.vertices);cen=p.mean(0);delta=p-cen
        uu=np.arctan2(delta[:,0],delta[:,2])/(2*np.pi)+.5
        vv=(p[:,1]-p[:,1].min())/(np.ptp(p[:,1])+1e-9)
        uv=np.column_stack((uu,vv))
    mesh.visual=TextureVisuals(material=mat,uv=uv)
    key=f'{name}_{count:02d}'
    scene.add_geometry(mesh,geom_name=key,node_name=key,parent_node_name=parent)
    count+=1
    return key

def ellipsoid(parent,name,pos,radii,mat,segments=42):
    m=trimesh.creation.uv_sphere(radius=1,count=[segments,segments])
    m.vertices*=np.asarray(radii)
    return attach(m,mat,parent,name,offset=pos)

def rounded_box(parent,name,center,ext,mat,exp=.76):
    # Superellipsoid blends silhouette edges without giant rounded-padding blobs.
    nt=34;nl=64;verts=[];faces=[]
    def powr(v,e):return np.sign(v)*abs(v)**e
    for i,a in enumerate(np.linspace(-math.pi/2,math.pi/2,nt)):
        for j in range(nl):
            b=2*math.pi*j/nl
            verts.append((ext[0]/2*powr(math.cos(a),exp)*powr(math.cos(b),exp),
                          ext[1]/2*powr(math.sin(a),exp),
                          ext[2]/2*powr(math.cos(a),exp)*powr(math.sin(b),exp)))
    for i in range(nt-1):
        for j in range(nl):
            a=i*nl+j;b=i*nl+(j+1)%nl;c=(i+1)*nl+j;d=(i+1)*nl+(j+1)%nl
            faces.extend([(a,b,c),(b,d,c)])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False);m.fix_normals()
    return attach(m,mat,parent,name,offset=center)

def loft(parent,name,rings,mat,n=72):
    verts=[];faces=[]
    for y,rx,rz,cz in rings:
        for j in range(n):
            a=2*math.pi*j/n;verts.append((rx*math.cos(a),y,cz+rz*math.sin(a)))
    for i in range(len(rings)-1):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n;c=(i+1)*n+j;d=(i+1)*n+(j+1)%n
            faces.extend([(a,b,c),(b,d,c)])
    # Cap rings with polygons; correct face normal via repair.
    verts.extend([(0,rings[0][0],rings[0][3]),(0,rings[-1][0],rings[-1][3])]);bi=len(verts)-2;ti=bi+1
    for j in range(n):
        faces.extend([(bi,j,(j+1)%n),(ti,(len(rings)-1)*n+(j+1)%n,(len(rings)-1)*n+j)])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False);m.fix_normals()
    return attach(m,mat,parent,name)

# Body: one olive coat shell, short arms. Tiny visual details are painted.
loft('Torso','clean continuous olive jacket',[
 (-.14,.49,.32,0),(-.08,.55,.39,0),(.23,.60,.42,.015),
 (.52,.57,.39,.015),(.70,.51,.34,.007),(.84,.40,.31,.003)],cloth_mat)
rounded_box('Torso','very thin dark inside collar',(0,.85,0),(.69,.12,.55),shirt,.87)
# A single understated scarf with two slim curves, no monumental ring.
ellipsoid('RigRoot','flat neck gaiter', (0,2.19,.03),(.40,.13,.32),scarf,36)
# User-approved cloth design is ART, not bulky 3D pouches. A thin surface
# hugging the genuinely 3D jacket preserves pockets and zipper, while keeping
# a clean torso silhouette from all directions.
coat_photo=ref.crop((100,410,278,600)).resize((640,640),Image.Resampling.LANCZOS).convert('RGBA')
coat_mask=Image.new('L',(640,640),0)
cm=ImageDraw.Draw(coat_mask);cm.ellipse((25,18,616,624),fill=255)
coat_mask=coat_mask.filter(ImageFilter.GaussianBlur(20));coat_photo.putalpha(coat_mask)
coat_photo.save(QA/'approved_jacket_texture.png')
coat_photo_mat=material('approved lightweight fabric jacket painting','#ffffff',.91,texture=coat_photo,alpha=True)
vv=[];ff=[];tt=[];radials=28;steps=88
vv.append((0,.34,.447));tt.append((.5,.5))
for r in range(1,radials+1):
    a=r/radials
    for j in range(steps):
        theta=j*2*math.pi/steps
        x=.53*a*math.cos(theta);y=.34+.48*a*math.sin(theta)
        z=.415*math.sqrt(max(.04,1-(x/.60)**2))+.022
        vv.append((x,y,z));tt.append((.5+.5*a*math.cos(theta),.5+.5*a*math.sin(theta)))
for j in range(steps):ff.append((0,1+(j+1)%steps,1+j))
for k in range(radials-1):
    p=1+k*steps;q=p+steps
    for j in range(steps):
        a=p+j;b=p+(j+1)%steps;c=q+j;d=q+(j+1)%steps
        ff.extend([(a,b,c),(b,d,c)])
photo_mesh=trimesh.Trimesh(vertices=vv,faces=ff,process=False);photo_mesh.fix_normals()
attach(photo_mesh,coat_photo_mat,'Torso','reference jacket graphics on curved torso',uv=np.array(tt))
# Keep the back plain; previous bulbous pack produced an artificial oval cut-out.

# Head with no separate ear/cheek/eyebrow/nose geometry. Very slightly
# flattened front curvature provides a readable 3D face from side views.
ellipsoid('Head','single rounded human head',(0,.035,.0),(.50,.54,.382),skin,64)
# Face patch is a curved elliptical surface, UV from approved artwork. No flat billboard.
verts=[];faces=[];uv=[];rings=30;around=96
verts.append((0,.02,.415));uv.append((.5,.5))
for r in range(1,rings+1):
    t=r/rings
    for j in range(around):
        a=2*math.pi*j/around
        x=.487*t*math.cos(a);y=.035+.51*t*math.sin(a)
        zz=.385*math.sqrt(max(.005,1-(x/.51)**2-((y-.035)/.56)**2))+.034
        # modest bridge for face lighting, no huge protruding nose
        zz+=.017*math.exp(-((x/.12)**2+((y-.025)/.16)**2))
        verts.append((x,y,zz));uv.append((.5+.5*t*math.cos(a),.5+.5*t*math.sin(a)))
for j in range(around):faces.append((0,1+(j+1)%around,1+j))
for k in range(rings-1):
    p=1+k*around;q=p+around
    for j in range(around):
        a=p+j;b=p+(j+1)%around;c=q+j;d=q+(j+1)%around
        faces.extend([(a,b,c),(b,d,c)])
face_mesh=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)
face_mesh.fix_normals();attach(face_mesh,face_mat,'Head','approved face texture on one curved mesh',uv=np.asarray(uv))
# Subdued black under-cap silhouette only. No spiked hair tube collection.
ellipsoid('Head','compact dark hair behind cap',(0,.325,-.045),(.49,.29,.365),hair,40)
# Back of head is also covered by hair, not bare white skin. A single half-shell
# replaces the old dozens of angular floating hair clumps.
hair_rear=trimesh.creation.uv_sphere(radius=1,count=[48,48])
hair_rear.vertices *= np.array([.505,.54,.396]);hair_rear.vertices+=np.array([0,.035,-.014])
keep=np.all(hair_rear.vertices[hair_rear.faces][:,:,2]<.018,axis=1)
hair_rear.update_faces(keep);hair_rear.remove_unreferenced_vertices();hair_rear.fix_normals()
attach(hair_rear,hair,'Head','single clean rear hairstyle shell')

# Do NOT add bead-like ears, beard lobes or cheek volumes. The UV painting handles it.

# Flat structured baseball cap; the crown's top is planar, not bread-shaped.
loft('Head','structured cap crown',[
 (.39,.48,.39,-.035),(.45,.53,.43,-.03),(.61,.51,.41,-.03),
 (.75,.46,.37,-.035),(.78,.40,.32,-.03),(.784,.16,.13,-.025)],cap)
# Simple curved visor projected forward along +Z.
verts=[];faces=[];nu=36
for l in range(4):
    s=l/3
    for i in range(nu+1):
        t=-1+2*i/nu;x=.515*t*(1-.15*s)
        z=.34+.32*s-.08*t*t
        y=.423+.032*t*t-.028*s
        verts.append((x,y,z))
for l in range(3):
    for i in range(nu):
        a=l*(nu+1)+i;b=a+1;c=a+nu+1;d=c+1
        faces.extend([(a,b,c),(b,d,c)])
m=trimesh.Trimesh(vertices=verts,faces=faces,process=False);m.fix_normals()
attach(m,cap,'Head','flattened extended cap brim')
# Thin visor underface, slight thickness without a huge bulb.
rounded_box('Head','visor thin edge',(0,.41,.505),(.92,.025,.30),cap_edge,.93)
rounded_box('Head','subtle embroidered cap rectangle',(0,.62,.407),(.23,.10,.012),leather,.95)

# Arms and legs shaped as one softly tapered piece per region, slim and short.
for side,xx in [('L',-.56),('R',.56)]:
    loft('UpperArm_'+side,'single continuous short coat sleeve',[
        (.14,.13,.14,0),(.035,.175,.18,0),(-.10,.185,.18,.005),(-.24,.18,.18,.01),
        (-.46,.155,.16,.015),(-.61,.125,.13,.03)],olive,n=48)
    ellipsoid('UpperArm_'+side,'one compact work glove',(0,-.68,.08),(.155,.16,.145),gloves,40)
for side,xx in [('L',-.31),('R',.31)]:
    loft('UpperLeg_'+side,'single compact upper trouser',[ 
        (.12,.17,.20,0),(.025,.23,.245,0),(-.11,.255,.25,0),
        (-.32,.245,.25,.01),(-.53,.225,.23,.01)],pants,n=48)
    loft('Knee_'+side,'single straight lower trouser',[ 
        (.13,.20,.21,0),(.01,.225,.235,0),(-.18,.22,.225,0),
        (-.40,.21,.22,.0),(-.57,.18,.195,0)],pants,n=48)
    # Preserve established seat geometry test's boots matching (both names).
    rounded_box('Knee_'+side,'weathered thick sole boot',(0,-.72,.18),(.45,.32,.72),boots,.76)

# No separate padding, giant cheeks, 3D eyebrow tubes, zipper forest or dangling
# accessory objects. These elements were the reason the previous model looked odd.
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_bytes(scene.export(file_type='glb'))
print('GLB:',OUT,'mesh_parts:',count,'bytes:',OUT.stat().st_size,'nodes:',len(scene.graph.nodes))
for n in ['RigRoot','Torso','Head','UpperArm_L','UpperArm_R','UpperLeg_L','UpperLeg_R','Knee_L','Knee_R']:
 assert n in scene.graph.nodes,n
loaded=trimesh.load(OUT,force='scene')
assert len(loaded.geometry)==count
box=loaded.bounds;print('bounds',box.tolist(),'size',(box[1]-box[0]).tolist())
assert 2.5 < box[1][1]-box[0][1] < 3.6

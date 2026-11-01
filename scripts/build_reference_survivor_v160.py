#!/usr/bin/env python3
"""AFTERDAY v1.6 character head: reference-projected curved GLB (not a photo billboard).
Source: original user-approved generated AFTERDAY character design reference.
The baked face is front-angle biased; back/sides are 3D geometry and new materials.
"""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
import trimesh
from scipy.interpolate import PchipInterpolator
from trimesh.visual.texture import TextureVisuals,SimpleMaterial

ROOT=Path(__file__).resolve().parent.parent
REF=ROOT/'public/assets/character/ref/character_target.png'
OUT=ROOT/'public/assets/models/character'
OUT.mkdir(parents=True,exist_ok=True)
TEXTURES=ROOT/'public/assets/character/ref'
PIC=Image.open(REF).convert('RGB')
rng=np.random.default_rng(83291)

def atlas_face():
    W,H=2048,1024
    yy,xx=np.ogrid[:H,:W]
    # Warm, desaturated skin color matching the reference image.
    noise=rng.normal(0,1.6,(H,W,1))
    skin=np.clip(np.array([189,145,117],dtype=float).reshape(1,1,3) + noise - np.abs(xx-W*.5)[...,None]/W*17 + (yy/H-.5)[...,None]*6,0,255).astype(np.uint8)
    atlas=Image.fromarray(skin,'RGB')
    # This is original, user supplied AI-design artwork, not someone else's photograph.
    # Place a facial region over the physical frontal surface's UVs.
    crop=PIC.crop((440,157,637,322)).resize((830,810),Image.Resampling.LANCZOS)
    # Lightly blend side borders to avoid the flat rectangular pasted-photo look.
    cr=np.asarray(crop).astype(float)
    # Shadow reduction prevents image baked highlights from contradicting realtime lights.
    cr=np.clip((cr-112)*.84+135,0,255).astype('uint8')
    crop=Image.fromarray(cr,'RGB')
    layer=Image.new('RGBA',(W,H),(0,0,0,0))
    mask=np.zeros((810,830),np.uint8)
    sy,sx=np.ogrid[:810,:830]
    ux=np.clip(np.minimum(sx,829-sx)/110,0,1)
    vy=np.clip(np.minimum(sy,809-sy)/100,0,1)
    fade=(ux**.7)*(vy**.6)
    mask[:]=np.asarray(np.clip(fade*255,0,255),dtype=np.uint8)
    # Original image's face is in the front-facing hemisphere only.
    layer.paste(crop,(609,116),Image.fromarray(mask))
    atlas=Image.alpha_composite(atlas.convert('RGBA'),layer).convert('RGB')
    atlas.save(TEXTURES/'face_projection_v160.jpg',quality=93,optimize=True)
    return atlas

def material(name,color=(255,255,255),image=None,rough=.83,metal=0.0):
    return SimpleMaterial(image=image,diffuse=tuple(color)+(255,),roughnessFactor=float(rough),metallicFactor=float(metal),name=name)

def mesh_from_uv(verts,faces,uv,name,material):
    m=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)
    m.visual=TextureVisuals(uv=np.asarray(uv),material=material)
    m.metadata['name']=name
    return m

def hair_cap():
    verts=[];faces=[];uv=[];cols=80;rows=23
    for j in range(rows+1):
        lat=.21+(np.pi/2-.21)*j/rows
        r=np.cos(lat)
        for i in range(cols+1):
            a=-np.pi+2*np.pi*i/cols
            # loosely sculpted black hair shell with oval undercut
            x=.385*r*np.sin(a)
            z=.340*r*np.cos(a)-.022
            y=.105+.505*np.sin(lat)+.020*np.sin(a*7+lat*11)*r
            verts.append((x,y,z));uv.append((i/cols,j/rows))
    for j in range(rows):
        for i in range(cols):
            k=j*(cols+1)+i;faces.extend([(k,k+1,k+cols+1),(k+1,k+cols+2,k+cols+1)])
    return mesh_from_uv(verts,faces,uv,'Sculpted dark layered hair shell',material('Hair base', (37,32,30),rough=.91))

def head_mesh(atlas):
    verts=[];faces=[];uv=[];nlon=128;nlat=64
    for j in range(nlat+1):
        lat=-np.pi/2+np.pi*j/nlat; sy=np.sin(lat);rad=np.cos(lat)
        for i in range(nlon+1):
            a=-np.pi+2*np.pi*i/nlon
            taper=1-.17*max(0,-sy)**1.5
            x=.375*rad*np.sin(a)*taper
            y=.090+.455*sy
            z=.313*rad*np.cos(a)+.01
            # sculpted cheek volume and a softly integrated, non-beak nose bridge.
            front=max(0,np.cos(a))
            cheek=np.exp(-((abs(x)-.22)/.115)**2-((y-.075)/.17)**2)*.018*front
            bridge=np.exp(-(x/.064)**2-((y-.036)/.18)**2)*.038*front
            z+=cheek+bridge
            # Correct glTF v against the atlas; not a front-facing card.
            verts.append((x,y,z));uv.append((i/nlon,j/nlat))
    for j in range(nlat):
        for i in range(nlon):
            k=j*(nlon+1)+i
            faces.extend([(k,k+1,k+nlon+1),(k+1,k+nlon+2,k+nlon+1)])
    return mesh_from_uv(verts,faces,uv,'Single continuous human head – reference projected UV',material('Reference facial albedo',image=atlas,rough=.94))

def ellipsoid(center,scale,color,name,sub=3):
    m=trimesh.creation.icosphere(subdivisions=sub,radius=1.0)
    m.apply_scale(scale);m.apply_translation(center)
    m.visual=TextureVisuals(uv=np.zeros((len(m.vertices),2)),material=material(name,color))
    return m

def tapered_strand(points,radii,name,tint,ns=9):
    points=np.asarray(points,dtype=float)
    tt=np.linspace(0,1,len(points));dense=np.linspace(0,1,max(15,len(points)*4))
    points=np.stack([PchipInterpolator(tt,points[:,a])(dense) for a in range(3)],axis=1)
    radii=PchipInterpolator(tt,np.asarray(radii,dtype=float))(dense)
    verts=[];faces=[];uv=[]
    for i,p in enumerate(points):
        tangent=points[min(i+1,len(points)-1)]-points[max(0,i-1)]
        tangent=tangent/(np.linalg.norm(tangent)+1e-8)
        base=np.array([0.,1.,0.]) if abs(tangent[1])<.9 else np.array([1.,0.,0.])
        across=np.cross(tangent,base);across/=np.linalg.norm(across)
        up=np.cross(tangent,across)
        for j in range(ns):
            th=2*np.pi*j/ns
            verts.append(p+radii[i]*(np.cos(th)*across+.7*np.sin(th)*up))
            uv.append((j/ns,i/max(1,len(points)-1)))
    for i in range(len(points)-1):
        for j in range(ns):
            a=i*ns+j;b=i*ns+(j+1)%ns;c=(i+1)*ns+j;d=(i+1)*ns+(j+1)%ns
            faces.extend([(a,b,c),(b,d,c)])
    return mesh_from_uv(verts,faces,uv,name,material(name,tint))

def build():
    atlas=atlas_face();sc=trimesh.Scene()
    def push(mesh,name):sc.add_geometry(mesh,node_name=name,geom_name=name)
    push(head_mesh(atlas),'01 Face continuous UV sculpt')
    push(hair_cap(),'02 Hair sculpt')
    # Anatomically subordinate ears; no duplicate giant anime eye meshes.
    for s in [-1,1]:
        push(ellipsoid([s*.365,.052,.006],[.052,.105,.050],(174,124,100),f'{"L" if s<0 else "R"} ear',3),f'03 {s:+} Ear')
        push(ellipsoid([s*.36,.059,.052],[.023,.059,.013],(140,95,80),f'{s:+} ear shadow',2),f'04 {s:+} Inner ear')
    # Sculpted swept bangs, diverse directions/lengths (not a fence of vertical spikes).
    # Layered taper pipes provide organic 360-degree volume while retaining the
    # user-approved charcoal, asymmetrically side-parted hairstyle.
    for i in range(23):
        t=i/22
        x=-.336+.672*t
        q=np.sin(i*2.19)
        ytop=.60+.045*np.cos(t*np.pi*.95)+.022*np.sin(i*1.6)
        sweep=.095+.10*(1-t)
        terminal=.295+.067*np.sin(i*.93) - (.055 if i in (8,12,16) else 0)
        points=[(x*.70,ytop,.010),
                (x*.78+.014*q,.575,.16),
                (x*.90+.042*q,.492,.279),
                (x+sweep+.032*q, .392,.327),
                (x+sweep+.060*q,terminal,.342-.025*abs(t-.5))]
        push(tapered_strand(points,[.045,.047,.039,.027,.001],f'Combed swept hair {i}',(30+i%4*3,28+i%4*3,27+i%4*3),11),f'10_Hair_{i:02}')
    # Sparse curved flyaway strands soften the outline, with tapered rounded tips.
    for i in range(10):
        a=i*2.399
        x=np.sin(a)*.27
        z=np.cos(a)*.16-.11
        points=[(x,.585,z),(x+.06*np.sin(a),.65,z+.03),(x+.13*np.sin(a),.59,z+.07),(x+.15*np.sin(a),.49,z+.09)]
        push(tapered_strand(points,[.028,.028,.015,.001],f'Tousled crown hair {i}',(33+i%4*3,31+i%4*3,30+i%4*3),8),f'11_Flyaway_{i:02}')
    for side in [-1,1]:
        for i in range(6):
            z=-.16+i*.067
            points=[(side*.26,.50,z-.04),(side*.357,.41,z),(side*.38,.23,z+.015),(side*.345,.07,z+.029)]
            push(tapered_strand(points,[.035,.038,.022,.001],f'Temple hair {side} {i}',(32+i%3*3,30+i%3*3,29+i%3*3),9),f'20_Temple_{side}_{i:02}')
    # Right cheek: a small aged cloth dressing faithfully present in reference.
    dressing=trimesh.creation.box(extents=[.116,.061,.009])
    # Face looks towards positive Z and the bandage sits just below eye on wearer's left.
    dressing.apply_transform(trimesh.transformations.rotation_matrix(-.17,[0,0,1]))
    dressing.apply_translation([.228,-.035,.289]);dressing.visual=TextureVisuals(uv=np.zeros((len(dressing.vertices),2)),material=material('Weathered cheek plaster',(198,170,139)))
    push(dressing,'30 Cheek plaster')
    file=OUT/'afterday_survivor_head_reference_v160.glb'
    file.write_bytes(sc.export(file_type='glb'))
    print('OUTPUT',file,'bytes',file.stat().st_size,'geometries',len(sc.geometry),'triangles',sum(len(g.faces) for g in sc.geometry.values()))
    loaded=trimesh.load(file,force='scene');print('GLB_IMPORTED',len(loaded.geometry),'BOUNDS',loaded.bounds)
    return file

if __name__=='__main__':build()

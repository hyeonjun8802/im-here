#!/usr/bin/env python3
from pathlib import Path
import numpy as np, cv2, trimesh
from PIL import Image, ImageDraw, ImageFont

P=Path('/mnt/data/AFTERDAY_v360_work')
OUT=P/'docs/qa/v360_props'; OUT.mkdir(parents=True,exist_ok=True)
G=trimesh.load(P/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb', force='scene')
T=trimesh.transformations.translation_matrix
R=trimesh.transformations.euler_matrix

def apply(name,parent,pos,rx=0,ry=0,rz=0):
    G.graph.update(frame_to=name, frame_from=parent, matrix=T(pos)@R(rx,ry,rz,'sxyz'))

def reset_pose():
    apply('RigRoot','world',(0,0,0),0,0,0)
    apply('UpperArm_L','RigRoot',(-.64,1.73,0),0,0,0)
    apply('UpperArm_R','RigRoot',(.64,1.73,0),0,0,0)
    apply('UpperLeg_L','RigRoot',(-.31,1.12,0),0,0,0)
    apply('UpperLeg_R','RigRoot',(.31,1.12,0),0,0,0)
    apply('Knee_L','UpperLeg_L',(0,-.43,0),0,0,0)
    apply('Knee_R','UpperLeg_R',(0,-.43,0),0,0,0)

CASES={
 'eat': dict(rootY=-.3814, arms={'L':(-0.72,0,0.18), 'R':(-1.52,0,-0.36)}, legs=True,
             props=[('bowl','UpperArm_L',(-.09,-.92,.20),(np.pi*1.02,.18,-.34)), ('ration','UpperArm_R',(.08,-.84,.28),(-.52,.06,.46))],
             cam=(3.9,1.95,6.6), title='EAT · Bowl and ration align to both hands'),
 'drink': dict(rootY=.012, arms={'L':(-0.16,0,0.12), 'R':(-1.048,0,-0.290)}, legs=False,
               props=[('canteen','UpperArm_R',(.08,-.81,.28),(-1.205,.10,.345))],
               cam=(3.8,2.0,6.4), title='DRINK · Canteen reaches the mouth from the right hand'),
 'radio': dict(rootY=.012, arms={'L':(-0.18,0,0.18), 'R':(-1.55,0,-0.48)}, legs=False,
               props=[('radio','UpperArm_R',(.12,-1.02,.10),(.28,.05,-.08))],
               cam=(3.7,2.0,6.7), title='RADIO · Hand-held radio stays at the right hand'),
 'guitar': dict(rootY=-.3814, arms={'L':(-1.05,0,-0.34), 'R':(-0.692,0,-0.37)}, legs=True,
                props=[('guitar','Torso',(0,-.14,.58),(-.10,.10,-.74))],
                cam=(4.4,2.0,6.1), title='GUITAR · Instrument stays across the torso and hands'),
}

COLORS={
 'guitar':[152,99,52], 'radio':[75,75,58], 'bowl':[132,126,116], 'ration':[185,156,101], 'canteen':[124,118,106]
}

def prop_mesh(kind):
    parts=[]
    if kind=='radio':
        box=trimesh.creation.box((.18,.31,.115)); parts.append(box)
        ant=trimesh.creation.cylinder(radius=.009, height=.32, sections=10)
        ant.apply_transform(T((.06,.28,0))@R(0,0,-.12,'sxyz'))
        parts.append(ant)
    elif kind=='bowl':
        bowl=trimesh.creation.cylinder(radius=.16,height=.08,sections=24)
        bowl.apply_transform(R(np.pi/2,0,0,'sxyz'))
        parts.append(bowl)
    elif kind=='ration':
        food=trimesh.creation.icosphere(subdivisions=1,radius=.10)
        food.apply_transform(np.diag([1.30,.64,.86,1]))
        parts.append(food)
    elif kind=='canteen':
        body=trimesh.creation.cylinder(radius=.105,height=.27,sections=18); parts.append(body)
        cap=trimesh.creation.cylinder(radius=.032,height=.05,sections=12); cap.apply_transform(T((0,.16,0))); parts.append(cap)
    elif kind=='guitar':
        body=trimesh.creation.icosphere(subdivisions=2,radius=.26); body.apply_transform(np.diag([1.25,1.05,.43,1])); parts.append(body)
        waist=trimesh.creation.icosphere(subdivisions=1,radius=.18); waist.apply_transform(T((0,.20,0))@np.diag([1,.90,.45,1])); parts.append(waist)
        neck=trimesh.creation.box((.13,.72,.085)); neck.apply_transform(T((0,.55,0))); parts.append(neck)
    mesh=trimesh.util.concatenate(parts)
    return mesh

def scene_items():
    items=[]
    for node in G.graph.nodes_geometry:
        tf,gname=G.graph[node]; mesh=G.geometry[gname]
        verts=trimesh.transform_points(mesh.vertices,tf).astype(np.float32)
        face=mesh.faces
        tri=verts[face]
        nn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); nn/=np.linalg.norm(nn,axis=1,keepdims=True)+1e-12
        material=getattr(mesh.visual,'material',None); rgba=(getattr(material,'baseColorFactor',None) or [170,160,140,255]); rgb=np.array(rgba[:3],dtype=np.float32)
        items.append((verts,face,nn,rgb))
    return items

def prop_items(case):
    items=[]
    for kind,node,pos,rot in case['props']:
        mesh=prop_mesh(kind)
        node_tf=G.graph[node][0]
        tf=node_tf @ T(pos) @ R(*rot,'sxyz')
        verts=trimesh.transform_points(mesh.vertices,tf).astype(np.float32)
        face=mesh.faces
        tri=verts[face]
        nn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); nn/=np.linalg.norm(nn,axis=1,keepdims=True)+1e-12
        items.append((verts,face,nn,np.array(COLORS[kind],dtype=np.float32)))
    return items

W,H=690,820
KEY=np.array([.55,.84,1.2]); KEY/=np.linalg.norm(KEY)
FILL=np.array([-.82,.26,.5]); FILL/=np.linalg.norm(FILL)
RIM=np.array([-.15,.65,-.9]); RIM/=np.linalg.norm(RIM)

def render(items,cam,filename,title):
    cam=np.array(cam,float); at=np.array([0,1.46,0])
    forward=(at-cam); forward/=np.linalg.norm(forward)
    right=np.cross(forward,[0,1,0]); right/=np.linalg.norm(right); up=np.cross(right,forward)
    mat=np.array([right,up,forward])
    im=np.zeros((H,W,3),dtype=np.uint8)
    for y in range(H):
        v=y/H; im[y,:,:]=(np.array([24,35,44])*(1-v)+np.array([14,22,28])*v).astype(np.uint8)[::-1]
    cv2.ellipse(im,(W//2,int(H*.86)),(88,11),0,0,360,(18,25,30),-1,cv2.LINE_AA)
    batches=[]
    for verts,face,norms,base in items:
        rel=verts-cam; proj=rel@mat.T; depth=proj[:,2]
        f=H*1.6
        xy=np.column_stack((W/2+proj[:,0]*f/np.maximum(depth,.01), H*.55-proj[:,1]*f/np.maximum(depth,.01))).astype(np.int32)
        tris=xy[face]; face_depth=depth[face].mean(axis=1); cent=verts[face].mean(axis=1)
        facing=(norms*(cam-cent)).sum(axis=1)
        box=((tris[:,:,0].max(1)>=0)&(tris[:,:,0].min(1)<W)&(tris[:,:,1].max(1)>=0)&(tris[:,:,1].min(1)<H))
        vis=(face_depth>0.01)&box&(facing>-.03)
        if not vis.any(): continue
        norms2=norms[vis]; ind=tris[vis]; dd=face_depth[vis]
        diff=(norms2@KEY).clip(0,None)*.70+(norms2@FILL).clip(0,None)*.25+(norms2@RIM).clip(0,None)*.22+.33
        col=np.clip(base[None,:]*diff[:,None],0,255).astype(np.uint8)
        batches.append((ind,dd,col))
    I=np.concatenate([x[0] for x in batches]); D=np.concatenate([x[1] for x in batches]); C=np.concatenate([x[2] for x in batches]); idx=np.argsort(-D)
    for j in idx:
        t=I[j]
        if (t[:,0].max()-t[:,0].min()<1 and t[:,1].max()-t[:,1].min()<1): continue
        cv2.fillConvexPoly(im,t,C[j,::-1].tolist(),lineType=cv2.LINE_AA)
    img=Image.fromarray(cv2.cvtColor(im,cv2.COLOR_BGR2RGB))
    dr=ImageDraw.Draw(img); font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
    dr.rounded_rectangle((16,16,W-16,74),radius=16,fill=(17,26,31,220),outline=(86,100,97))
    dr.text((30,28),title,font=font,fill=(233,225,211))
    img.save(filename)

for key,case in CASES.items():
    reset_pose()
    apply('RigRoot','world',(0,case['rootY'],0),0,0,0)
    for s in ['L','R']:
        ax,_,az=case['arms'][s]
        apply(f'UpperArm_{s}','RigRoot',(-.64 if s=='L' else .64,1.73,0),ax,0,az)
    if case['legs']:
        for s in ['L','R']:
            apply(f'UpperLeg_{s}','RigRoot',(-.31 if s=='L' else .31,1.12,0),-1.16,0,0)
            apply(f'Knee_{s}',f'UpperLeg_{s}',(0,-.43,0),.70,0,0)
    items=scene_items()+prop_items(case)
    render(items,case['cam'],OUT/f'{key}_qa.png',case['title'])

# contact sheet
cards=[Image.open(OUT/f'{k}_qa.png').convert('RGB') for k in ['eat','drink','radio','guitar']]
thumbs=[]
for im in cards:
    c=im.copy(); c.thumbnail((560,360)); thumbs.append(c)
canvas=Image.new('RGB',(2*580,2*390+30),(16,23,29))
for idx,im in enumerate(thumbs):
    x=(idx%2)*580+10; y=(idx//2)*390+20
    canvas.paste(im,(x,y))
canvas.save(OUT/'PROP_ALIGNMENT_QA_V360.png',quality=92)
print('saved',OUT/'PROP_ALIGNMENT_QA_V360.png')

#!/usr/bin/env python3
"""Model-space action-pose captures from actual GLB geometry, never browser screenshots."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import trimesh,numpy as np
from render_simple_survivor_v200 import ROOT,QA,MODEL,render
T=trimesh.transformations.translation_matrix
RX=lambda a:trimesh.transformations.rotation_matrix(a,[1,0,0])
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',21)
POSES={
 'stand':{'rootY':.25,'leg':0,'knee':0,'armL':-.12,'armR':-.12},
 'walk':{'rootY':.25,'leg':.28,'knee':.1,'armL':-.20,'armR':.20},
 'seat':{'rootY':-.15,'leg':-1.16,'knee':.7,'armL':-.22,'armR':-.25},
 'eat':{'rootY':-.15,'leg':-1.16,'knee':.7,'armL':-.88,'armR':-1.06},
 'guitar':{'rootY':-.15,'leg':-1.16,'knee':.7,'armL':-1.05,'armR':-.78},
 'radio':{'rootY':.25,'leg':0,'knee':0,'armL':-.18,'armR':-1.55},
}

def seat_geometry(s):
    def box(name,pos,ext,color):
        mesh=trimesh.creation.box(extents=ext);mesh.apply_translation(pos)
        from trimesh.visual.material import PBRMaterial
        from trimesh.visual.texture import TextureVisuals
        mesh.visual=TextureVisuals(material=PBRMaterial(name=name,baseColorFactor=[int(v) for v in color]+[255],roughnessFactor=.88))
        s.add_geometry(mesh,geom_name=name,node_name=name,parent_node_name='world')
    box('Chair cushion',(0,.8416,-.02),(.83,.09,.71),[69,85,71])
    box('Chair back',(0,1.22,-.35),(.85,.52,.08),[67,79,65])
    for x in (-.34,.34):
        for z in (-.27,.27):box(f'Chair leg {x} {z}',(x,.43,z),(.04,.80,.04),[105,110,99])

def posed(kind,params):
    scene=trimesh.load(MODEL,force='scene')
    scene.graph.update(frame_to='RigRoot',frame_from='world',matrix=T([0,params['rootY'],0]))
    for side,x in [('L',-.31),('R',.31)]:
        thigh=params['leg'] if side=='L' else params['leg']*(-1 if kind=='walk' else 1)
        scene.graph.update(frame_to='UpperLeg_'+side,frame_from='RigRoot',matrix=T([x,1.12,0])@RX(thigh))
        scene.graph.update(frame_to='Knee_'+side,frame_from='UpperLeg_'+side,matrix=T([0,-.43,0])@RX(params['knee']))
    for side,x in [('L',-.56),('R',.56)]:
        scene.graph.update(frame_to='UpperArm_'+side,frame_from='RigRoot',matrix=T([x,1.72,0])@RX(params['arm'+side]))
    if kind in ('seat','eat','guitar'):seat_geometry(scene)
    temp=QA/f'pose_{kind}.glb';temp.write_bytes(scene.export(file_type='glb'))
    img=render(temp,(3.2,1.7,6.3),QA/f'POSE_{kind.upper()}.png')
    temp.unlink()
    return img

if __name__=='__main__':
    out=Image.new('RGB',(3*410,2*600),'#17202a')
    for i,(k,p) in enumerate(POSES.items()):
        img=posed(k,p);img.thumbnail((400,560))
        x=(i%3)*410+(410-img.width)//2;y=(i//3)*600+35
        out.paste(img,(x,y))
        ImageDraw.Draw(out).text((x+8,(i//3)*600+7),k.upper(),fill='#f3e5d1',font=FONT)
    out.save(QA/'ACTUAL_GLB_POSES_OFFLINE.jpg',quality=92)
    print('created',QA/'ACTUAL_GLB_POSES_OFFLINE.jpg')

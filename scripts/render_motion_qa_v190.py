#!/usr/bin/env python3
"""Render geometry from GLB with leg/head/arm joints transformed for action QA.
Offline screenshot of actual GLB geometry, not WebGL/browser QA.
"""
from pathlib import Path
import importlib.util,numpy as np,trimesh
from PIL import Image,ImageDraw,ImageFont
base=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('afterday_glb_renderer',base/'render_3d_qa_v190.py')
R=importlib.util.module_from_spec(spec);spec.loader.exec_module(R)
G=R.G
T=trimesh.transformations.translation_matrix
Rot=lambda r:trimesh.transformations.rotation_matrix(r,[1,0,0])
JOINTS={'RigRoot':('world',(0,0,0)), 'UpperArm_L':('RigRoot',(-.64,1.73,0)),'UpperArm_R':('RigRoot',(.64,1.73,0)),
'UpperLeg_L':('RigRoot',(-.31,1.12,0)),'UpperLeg_R':('RigRoot',(.31,1.12,0)),
'Knee_L':('UpperLeg_L',(0,-.43,0)),'Knee_R':('UpperLeg_R',(0,-.43,0))}
def apply(name,parent,pos,ang):G.graph.update(frame_to=name,frame_from=parent,matrix=T(pos)@Rot(ang))
def stage(kind):
 seated=kind in ('sit','guitar','eat')
 rootY=-.40 if seated else 0
 apply('RigRoot','world',(0,rootY,0),0)
 for s in ['L','R']:
  apply('UpperLeg_'+s,'RigRoot',(-.31 if s=='L' else .31,1.12,0),-.94 if seated else ( .27 if kind=='walk' and s=='L' else -.27 if kind=='walk' else 0))
  apply('Knee_'+s,'UpperLeg_'+s,(0,-.43,0),.70 if seated else 0)
  arm={'sit':(-.20,-.25),'eat':(-.86,-1.03),'guitar':(-1.02,-.78),'radio':(-.12,-1.55),'walk':(-.20,.20)}.get(kind,(-.12,-.12))
  apply('UpperArm_'+s,'RigRoot',(-.64 if s=='L' else .64,1.73,0),arm[0 if s=='L' else 1])
 R.items=R.gather_scene_items(G)

cases=[('sit','front',(0,1.55,7.1)),('sit','side',(7,1.55,.1)),('guitar','three_quarter',(4.4,2,6)),('radio','front',(0,1.55,7.1)),('walk','three_quarter',(4.4,2,6))]
for pose,view,cam in cases:
 stage(pose)
 R.render(cam,f'motion_{pose}_{view}.png')
contacts=Image.new('RGB',(5*378,565),'#141b20');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
for i,(pose,view,_) in enumerate(cases):
 im=Image.open(R.QA/f'motion_{pose}_{view}.png').convert('RGB');im.thumbnail((370,520))
 x=i*378+(378-im.width)//2;contacts.paste(im,(x,35));ImageDraw.Draw(contacts).text((i*378+12,9),f'{pose.upper()} {view}',font=font,fill='#ddd6c8')
contacts.save(R.QA/'CHARACTER_MOTION_GEOMETRY_QA.jpg',quality=93)

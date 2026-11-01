#!/usr/bin/env python3
"""Actual GLB head + garment meshes assembled at the game's joint origins.
This is an OFFLINE VTK inspection, not a game screenshot. Procedural boots,
gloves, backpack, etc. are not represented in this QA image.
"""
import importlib.util
from pathlib import Path
import numpy as np
import trimesh
import vtk
from vtk.util.numpy_support import numpy_to_vtk
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent.parent
QA=ROOT/'docs/qa/character';QA.mkdir(parents=True,exist_ok=True)
sp=importlib.util.spec_from_file_location('qa_head',ROOT/'scripts/offline_character_qa_v160.py');q=importlib.util.module_from_spec(sp);sp.loader.exec_module(q)
HEAD=trimesh.load(ROOT/'public/assets/models/character/afterday_survivor_head_reference_v160.glb',force='scene')
SUIT=trimesh.load(ROOT/'public/assets/models/character/afterday_survivor_suit_reference_v160.glb',force='scene')
entries=[]
for name,g in HEAD.geometry.items():
 c=g.copy();c.apply_translation([0,2.69,.02]);entries.append((name,c))
placements={'Organic Jacket Shell':[[0,1.36,0]],'Organic Arm Sleeve':[[-.51,2.21,0],[.51,2.21,0]],'Organic Thigh Trouser':[[-.255,1.07,0],[.255,1.07,0]],'Organic Calf Trouser':[[-.255,.50,0],[.255,.50,0]]}
for name,g in SUIT.geometry.items():
 for offset in placements[name]:
  c=g.copy();c.apply_translation(offset);entries.append((name,c))

def panel(camera,filename):
 ren=vtk.vtkRenderer();ren.SetBackground(.15,.18,.20)
 win=vtk.vtkRenderWindow();win.OffScreenRenderingOn();win.SetSize(700,1050);win.AddRenderer(ren)
 for name,g in entries:
  mapper=vtk.vtkPolyDataMapper();mapper.SetInputData(q.to_vtk(g));actor=vtk.vtkActor();actor.SetMapper(mapper)
  mat=getattr(g.visual,'material',None)
  tex=getattr(mat,'image',None) if mat is not None else None
  if tex is None and mat is not None:tex=getattr(mat,'baseColorTexture',None)
  if tex is not None:actor.SetTexture(q.vtext(tex));actor.GetProperty().SetColor(1,1,1)
  else:
   diffuse=getattr(mat,'baseColorFactor',None) if mat else None
   if diffuse is None:diffuse=getattr(mat,'diffuse',None) if mat else None
   rgb=(np.array(diffuse[:3],dtype=float)/255) if diffuse is not None else [.51,.48,.42]
   actor.GetProperty().SetColor(*rgb)
  actor.GetProperty().SetInterpolationToPhong();actor.GetProperty().SetAmbient(.20);actor.GetProperty().SetDiffuse(.7);actor.GetProperty().SetSpecular(.12)
  ren.AddActor(actor)
 for xyz,pow in [((-3,7,6),1.15),((5,4,1),.50)]:
  lamp=vtk.vtkLight();lamp.SetPosition(*xyz);lamp.SetFocalPoint(0,1.5,0);lamp.SetIntensity(pow);ren.AddLight(lamp)
 c=ren.GetActiveCamera();c.SetPosition(*camera);c.SetFocalPoint(0,1.66,0);c.SetViewUp(0,1,0);c.SetViewAngle(25);ren.ResetCameraClippingRange();win.Render()
 filt=vtk.vtkWindowToImageFilter();filt.SetInput(win);filt.Update();wr=vtk.vtkPNGWriter();wr.SetFileName(str(QA/filename));wr.SetInputConnection(filt.GetOutputPort());wr.Write();win.Finalize()
 return Image.open(QA/filename).convert('RGB')
front=panel((0,1.9,9.0),'suit_front_glb.png')
three=panel((6,2.1,7.6),'suit_three_quarter_glb.png')
source=Image.open(ROOT/'public/assets/character/ref/character_target.png').convert('RGB')
source.thumbnail((700,1050))
out=Image.new('RGB',(2100,1110),(18,24,28));d=ImageDraw.Draw(out)
for i,(name,img) in enumerate([('REFERENCE DESIGN (2D)',source),('HEAD + SUIT GLBS (FRONT)',front),('HEAD + SUIT GLBS (45 DEG)',three)]):
 x=700*i;out.paste(img,(x+(700-img.width)//2,40));d.text((x+15,13),name,fill='#eeeeee')
out.save(QA/'reference_vs_head_suit_glbs_v160.jpg',quality=92)
print('OUTPUT',QA/'reference_vs_head_suit_glbs_v160.jpg')

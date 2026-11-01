#!/usr/bin/env python3
"""Real shipped GLB geometry/material offline screenshot. Not a gameplay WebGL screenshot."""
import argparse
from pathlib import Path
import vtk

p=argparse.ArgumentParser();p.add_argument('glb');p.add_argument('output');p.add_argument('--detail',choices=['bed','shelter','tank','storage'],default='bed');args=p.parse_args()
W,H=1000,720
rw=vtk.vtkRenderWindow();rw.SetSize(W,H);rw.OffScreenRenderingOn();ren=vtk.vtkRenderer();rw.AddRenderer(ren)
loader=vtk.vtkGLTFImporter();loader.SetFileName(str(Path(args.glb).resolve()));loader.SetRenderWindow(rw);loader.Update()
actors=list(ren.GetActors());print('Imported GLB actors',len(actors))
if args.detail=='bed':
 # Hide tarp canopy but keep the REAL bed geometry, nearby plywood base, and small camp furniture.
 for a in actors:
  bb=a.GetBounds()
  if bb and bb[3]>3.5 and (bb[1]-bb[0])>6 and (bb[5]-bb[4])>6:
   a.SetVisibility(False)
 pos=(-7.6,5.2,9.6);target=(-2.0,.92,1.35);angle=31
elif args.detail=='shelter':pos=(-15,10,14);target=(0,2.0,0);angle=41
elif args.detail=='tank':pos=(14,10,14);target=(0,4.6,0);angle=34
else:pos=(12,8,12);target=(1.5,1.0,1);angle=36
ren.GradientBackgroundOn();ren.SetBackground(.14,.18,.20);ren.SetBackground2(.45,.52,.54)
ren.RemoveAllLights()
for v,color,intensity in [((16,28,21),(1,.85,.69),1.4),((-17,14,-15),(.62,.77,.93),.65)]:
 l=vtk.vtkLight();l.SetLightTypeToSceneLight();l.SetPosition(*v);l.SetFocalPoint(0,0,0);l.SetColor(*color);l.SetIntensity(intensity);ren.AddLight(l)
cam=ren.GetActiveCamera();cam.SetPosition(*pos);cam.SetFocalPoint(*target);cam.SetViewUp(0,1,0);cam.SetViewAngle(angle);ren.ResetCameraClippingRange()
rw.Render();f=vtk.vtkWindowToImageFilter();f.SetInput(rw);f.SetInputBufferTypeToRGB();f.ReadFrontBufferOff();f.Update()
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
wr=vtk.vtkPNGWriter();wr.SetInputConnection(f.GetOutputPort());wr.SetFileName(str(out));wr.Write();print(out)

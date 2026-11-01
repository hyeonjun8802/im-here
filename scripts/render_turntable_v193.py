#!/usr/bin/env python3
"""360° offscreen VTK GLB capture. Honest offline mesh QA, not a Three.js screenshot."""
from pathlib import Path
import vtk,math
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1];qa=root/'docs/qa';qa.mkdir(exist_ok=True)
p=root/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb'
ren=vtk.vtkRenderer();ren.SetBackground(.080,.103,.134);ren.AutomaticLightCreationOff()
win=vtk.vtkRenderWindow();win.OffScreenRenderingOn();win.SetSize(430,580);win.AddRenderer(ren)
imp=vtk.vtkGLTFImporter();imp.SetFileName(str(p));imp.SetRenderWindow(win);imp.Update()
for pos,color,power in [((-4,8,7),(.99,.91,.81),2.1),((5,4,1),(.76,.86,1),1.05),((0,5,-5),(.84,.91,1),.7)]:
 l=vtk.vtkLight();l.SetLightTypeToSceneLight();l.SetPosition(*pos);l.SetFocalPoint(0,1.42,0);l.SetColor(*color);l.SetIntensity(power);l.SetPositional(True);l.SetConeAngle(100);ren.AddLight(l)
for actor in ren.GetActors():
 prop=actor.GetProperty();prop.SetAmbient(.21);prop.SetDiffuse(.83);prop.SetSpecular(.10);prop.SetSpecularPower(18)
c=ren.GetActiveCamera();c.SetFocalPoint(0,1.49,0);c.SetViewUp(0,1,0);c.SetViewAngle(29)
f=vtk.vtkWindowToImageFilter();f.SetInput(win);f.SetInputBufferTypeToRGB()
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
frames=[]
for n in range(18):
 a=2*math.pi*n/18
 c.SetPosition(6.85*math.sin(a),1.75,6.85*math.cos(a));ren.ResetCameraClippingRange();win.Render();f.Modified();f.Update()
 w=vtk.vtkPNGWriter();w.SetInputConnection(f.GetOutputPort());out=qa/f'v193_turntable_{n:02d}.png';w.SetFileName(str(out));w.Write()
 im=Image.open(out).convert('RGB');d=ImageDraw.Draw(im)
 d.text((15,14),f'Actual GLB · {n*20}°',font=font,fill='#fff0d0')
 d.text((15,546),'OFFLINE 3D QA · NOT BROWSER',font=font,fill='#e3d1ba')
 frames.append(im)
frames[0].save(qa/'V193_ACTUAL_GLB_360_TURNTABLE.gif',save_all=True,append_images=frames[1:],duration=170,loop=0,optimize=True)
print(qa/'V193_ACTUAL_GLB_360_TURNTABLE.gif')

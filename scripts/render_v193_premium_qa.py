#!/usr/bin/env python3
"""Actual GLB 3D mesh via VTK offscreen importer, NOT Three.js screenshots."""
from pathlib import Path
import vtk
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'docs/qa';QA.mkdir(exist_ok=True,parents=True)
MODEL=ROOT/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb'
BASE=ROOT/'docs/backup/afterday_bearded_survivor_v192_BEFORE.glb'
VIEWS=[('FRONT',(0,1.58,7.0)),('THREE QUARTER',(4.35,2.1,6.2)),('SIDE',(7.0,1.58,.04)),('BACK',(0,1.58,-7.0))]

def take(path,cam,out):
    ren=vtk.vtkRenderer();ren.SetBackground(.080,.103,.134)
    ren.AutomaticLightCreationOff();ren.SetUseShadows(False)
    win=vtk.vtkRenderWindow();win.OffScreenRenderingOn();win.SetSize(560,735);win.AddRenderer(ren)
    imp=vtk.vtkGLTFImporter();imp.SetFileName(str(path));imp.SetRenderWindow(win);imp.Update()
    # VTK lighting matches a neutral studio with soft sky + right warm key.
    for pos,color,intensity in [((-4,8,7),(.99,.91,.81),2.10),((5,4,1),(.76,.86,1.0),1.05),((0,5,-5),(.84,.91,1),.7)]:
        L=vtk.vtkLight();L.SetLightTypeToSceneLight();L.SetPosition(*pos);L.SetFocalPoint(0,1.42,0)
        L.SetColor(*color);L.SetIntensity(intensity);L.SetPositional(True)
        L.SetConeAngle(100);ren.AddLight(L)
    for actor in ren.GetActors():
        prop=actor.GetProperty()
        prop.SetAmbient(.21);prop.SetDiffuse(.83);prop.SetSpecular(.10);prop.SetSpecularPower(18)
    c=ren.GetActiveCamera();c.SetPosition(*cam);c.SetFocalPoint(0,1.49,0);c.SetViewUp(0,1,0);c.SetViewAngle(29)
    ren.ResetCameraClippingRange();win.Render()
    f=vtk.vtkWindowToImageFilter();f.SetInput(win);f.SetInputBufferTypeToRGB();f.Update()
    w=vtk.vtkPNGWriter();w.SetFileName(str(out));w.SetInputConnection(f.GetOutputPort());w.Write()
    return Image.open(out).convert('RGB')

if __name__=='__main__':
    F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
    rows=[]
    for label,model in [('PREVIOUS v1.9.2',BASE),('NEW v1.9.3',MODEL)]:
        images=[]
        for name,cam in VIEWS:
            key=name.lower().replace(' ','_')
            out=QA/f"v193_{label.lower().split()[0]}_{key}.png"
            im=take(model,cam,out)
            images.append(im)
        row=Image.new('RGB',(4*405,590),'#161f28');draw=ImageDraw.Draw(row)
        for j,(im,(view,_)) in enumerate(zip(images,VIEWS)):
            im.thumbnail((390,547));x=j*405+int((405-im.width)/2)
            row.paste(im,(x,32));draw.text((j*405+10,5),f'{label}  {view}',font=F,fill='#ede2d0')
        rows.append(row)
    review=Image.new('RGB',(4*405,2*590),'#15202a')
    for i,r in enumerate(rows):review.paste(r,(0,i*590))
    review.save(QA/'V193_BEFORE_AFTER_3D_RENDER.jpg',quality=92)
    # reference target is first 300px front and 300px second, third 300px side.
    ref=Image.open(QA/'APPROVED_CHARACTER_TURNAROUND.png').convert('RGB')
    base=Image.open(QA/'v193_new_front.png').convert('RGB')
    approved=ref.crop((17,119,320,855));approved.thumbnail((405,610))
    target=Image.new('RGB',(950,660),'#18242d');dr=ImageDraw.Draw(target)
    target.paste(approved,(int((460-approved.width)/2),38))
    base.thumbnail((460,610));target.paste(base,(470+int((460-base.width)/2),38))
    dr.text((13,8),'APPROVED 2D TURNAROUND',font=F,fill='#e6dcce')
    dr.text((480,8),'NEW ACTUAL 3D GLB (OFFLINE)',font=F,fill='#e6dcce')
    target.save(QA/'V193_APPROVED_VS_GLB_FRONT.jpg',quality=94)
    print('generated',QA/'V193_BEFORE_AFTER_3D_RENDER.jpg')

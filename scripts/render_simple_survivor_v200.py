#!/usr/bin/env python3
"""Offline GLB multiview rendering (VTK). DOES NOT claim browser WebGL rendering."""
from pathlib import Path
import vtk
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'docs/qa/v200';QA.mkdir(exist_ok=True,parents=True)
MODEL=ROOT/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb'
BACKUP=ROOT/'docs/backup/afterday_bearded_survivor_v193_BEFORE.glb'
VIEWS=[('front',(0,1.72,7)),('three_quarter',(4.3,2.1,6.0)),('side',(7,1.7,.05)),('back',(0,1.7,-7))]
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)

def render(path,cam,dest):
    ren=vtk.vtkRenderer();ren.SetBackground(.070,.098,.124)
    win=vtk.vtkRenderWindow();win.OffScreenRenderingOn();win.SetSize(540,730);win.AddRenderer(ren)
    imp=vtk.vtkGLTFImporter();imp.SetFileName(str(path));imp.SetRenderWindow(win);imp.Update()
    for pos,color,level in [((-4,8,7),(.99,.92,.82),1.95),((5,4,1),(.81,.89,1.0),.95),((0,5,-5),(.84,.9,1.0),.75)]:
        light=vtk.vtkLight();light.SetLightTypeToSceneLight();light.SetPosition(*pos);light.SetFocalPoint(0,1.5,0);light.SetColor(*color);light.SetIntensity(level);light.SetPositional(True);light.SetConeAngle(105);ren.AddLight(light)
    for a in ren.GetActors():
        a.GetProperty().SetAmbient(.22);a.GetProperty().SetDiffuse(.82);a.GetProperty().SetSpecular(.09)
    c=ren.GetActiveCamera();c.SetPosition(*cam);c.SetFocalPoint(0,1.56,0);c.SetViewUp(0,1,0);c.SetViewAngle(30)
    ren.ResetCameraClippingRange();win.Render()
    filt=vtk.vtkWindowToImageFilter();filt.SetInput(win);filt.SetInputBufferTypeToRGB();filt.Update()
    writer=vtk.vtkPNGWriter();writer.SetFileName(str(dest));writer.SetInputConnection(filt.GetOutputPort());writer.Write()
    return Image.open(dest).convert('RGB')

def tile(label,im,w=480,h=680):
    out=Image.new('RGB',(w,h),'#151f29');im.thumbnail((w-15,h-42));out.paste(im,((w-im.width)//2,35));ImageDraw.Draw(out).text((12,8),label,font=FONT,fill='#eee2cf');return out

if __name__=='__main__':
    strips=[]
    for title,path in [('OLD v1.9.3',BACKUP),('NEW v2.0',MODEL)]:
        row=Image.new('RGB',(480*4,680),'#151f29')
        for i,(view,cam) in enumerate(VIEWS):
            out=QA/(f'{title.split()[0].lower()}_{view}.png')
            img=tile(title+' · '+view,render(path,cam,out))
            row.paste(img,(i*480,0))
        strips.append(row)
    comparison=Image.new('RGB',(480*4,680*2),'#151f29')
    for i,r in enumerate(strips):comparison.paste(r,(0,i*680))
    comparison.save(QA/'BEFORE_AFTER_MULTIVIEW.jpg',quality=90)
    ref=Image.open(ROOT/'docs/qa/APPROVED_CHARACTER_TURNAROUND.png').convert('RGB')
    ref=ref.crop((16,98,335,872))
    new=Image.open(QA/'new_front.png').convert('RGB')
    ref.thumbnail((490,800));new.thumbnail((490,800))
    sheet=Image.new('RGB',(1000,860),'#19242d');sheet.paste(ref,((500-ref.width)//2,50));sheet.paste(new,(500+(500-new.width)//2,50))
    ImageDraw.Draw(sheet).text((18,15),'APPROVED 2D CHARACTER',font=FONT,fill='white');ImageDraw.Draw(sheet).text((520,15),'NEW REAL GLB · OFFLINE VTK',font=FONT,fill='white')
    sheet.save(QA/'APPROVED_VS_NEW_FACE.jpg',quality=92)
    print('Exported GLB renders:',QA)

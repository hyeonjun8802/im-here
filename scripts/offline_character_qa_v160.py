#!/usr/bin/env python3
"""Render the ACTUAL GLB mesh from multiple camera angles for visual QA.
Uses offscreen VTK, not a browser/Three.js screenshot; preserves the GLB UVs.
"""
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import trimesh
import vtk
from vtk.util.numpy_support import numpy_to_vtk
ROOT=Path(__file__).resolve().parent.parent
F=ROOT/'public/assets/models/character/afterday_survivor_head_reference_v160.glb'
QA=ROOT/'docs/qa/character';QA.mkdir(exist_ok=True,parents=True)
scene=trimesh.load(F,force='scene')

def to_vtk(g):
    poly=vtk.vtkPolyData();points=vtk.vtkPoints();points.SetData(numpy_to_vtk(np.asarray(g.vertices,dtype=np.float32),deep=True));poly.SetPoints(points)
    cells=vtk.vtkCellArray()
    tris=np.asarray(g.faces,dtype=np.int64)
    cells.SetCells(len(tris),numpy_to_vtk(np.column_stack([np.full(len(tris),3),tris]).ravel(),deep=True,array_type=vtk.VTK_ID_TYPE))
    poly.SetPolys(cells)
    normals=vtk.vtkPolyDataNormals();normals.SetInputData(poly);normals.ComputePointNormalsOn();normals.SplittingOff();normals.Update();poly=normals.GetOutput()
    uv=getattr(g.visual,'uv',None)
    if uv is not None and len(uv)==len(g.vertices):
        # VTK uses bottom-up image storage; trimesh glTF v is already correctly orientated.
        coords=numpy_to_vtk(np.asarray(uv,dtype=np.float32),deep=True);coords.SetNumberOfComponents(2);poly.GetPointData().SetTCoords(coords)
    return poly

def vtext(img):
    img=Image.fromarray(np.array(img.convert('RGB')))
    arr=np.asarray(img,dtype=np.uint8)[::-1].copy()
    vtk_img=vtk.vtkImageData();vtk_img.SetDimensions(img.width,img.height,1);vtk_img.AllocateScalars(vtk.VTK_UNSIGNED_CHAR,3)
    vtk_img.GetPointData().SetScalars(numpy_to_vtk(arr.reshape(-1,3),deep=True,array_type=vtk.VTK_UNSIGNED_CHAR))
    t=vtk.vtkTexture();t.SetInputData(vtk_img);t.InterpolateOn();return t

def render(camera_pos,stem):
    ren=vtk.vtkRenderer();ren.SetBackground(.16,.195,.22)
    win=vtk.vtkRenderWindow();win.OffScreenRenderingOn();win.SetSize(650,760);win.SetMultiSamples(6);win.AddRenderer(ren)
    for name,geom in scene.geometry.items():
        m=vtk.vtkPolyDataMapper();m.SetInputData(to_vtk(geom));a=vtk.vtkActor();a.SetMapper(m)
        visual=geom.visual;mat=getattr(visual,'material',None)
        if mat is not None and (getattr(mat,'image',None) is not None or getattr(mat,'baseColorTexture',None) is not None):
            a.SetTexture(vtext(getattr(mat,'image',None) or getattr(mat,'baseColorTexture',None)));a.GetProperty().SetColor(1,1,1)
        else:
            diffuse=getattr(mat,'baseColorFactor',None) if mat is not None else None
            if diffuse is None: diffuse=getattr(mat,'diffuse',None) if mat is not None else None
            if diffuse is None: diffuse=[160,143,126,255]
            a.GetProperty().SetColor(*[float(x)/255 for x in diffuse[:3]])
        a.GetProperty().SetInterpolationToPhong();a.GetProperty().SetAmbient(.14);a.GetProperty().SetDiffuse(.8);a.GetProperty().SetSpecular(.15)
        ren.AddActor(a)
    sun=vtk.vtkLight();sun.SetPosition(-2,4,4);sun.SetFocalPoint(0,.1,0);sun.SetIntensity(1.15);ren.AddLight(sun)
    fill=vtk.vtkLight();fill.SetPosition(3,1.7,2);fill.SetIntensity(.55);ren.AddLight(fill)
    cam=ren.GetActiveCamera();cam.SetPosition(*camera_pos);cam.SetFocalPoint(0,.115,0);cam.SetViewUp(0,1,0);cam.SetViewAngle(26)
    ren.ResetCameraClippingRange();win.Render()
    cap=vtk.vtkWindowToImageFilter();cap.SetInput(win);cap.Update();writer=vtk.vtkPNGWriter();writer.SetFileName(str(QA/(stem+'.png')));writer.SetInputConnection(cap.GetOutputPort());writer.Write();win.Finalize()
    print('saved',stem)

if __name__=='__main__':
    render((0,.13,3.2),'head_front_glb')
    render((2,.17,2.9),'head_three_quarter_glb')
    render((3,.16,.3),'head_profile_glb')
    im=Image.open(ROOT/'public/assets/character/ref/character_target.png').convert('RGB')
    # Target image face comparison at a similar crop size.
    target=im.crop((400,40,680,348)).resize((650,760))
    panels=[target]+[Image.open(QA/(n+'.png')).convert('RGB') for n in ['head_front_glb','head_three_quarter_glb','head_profile_glb']]
    out=Image.new('RGB',(650*4,810),(18,25,29));draw=ImageDraw.Draw(out)
    titles=['REFERENCE ART','ACTUAL GLB FRONT','ACTUAL GLB 45 DEG','ACTUAL GLB PROFILE']
    for i,p in enumerate(panels):out.paste(p,(650*i,50));draw.text((650*i+20,15),titles[i],fill=(236,238,225))
    out.save(QA/'reference_vs_real_3d_v160.jpg',quality=92)

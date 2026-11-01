"""Independent GLB geometry preview via VTK software renderer.
NOT a Three.js gameplay screenshot, NOT a substitute for real browser QA.
Usage: xvfb-run -a python scripts/offline_3d_asset_review_v150.py
"""
import vtk, json, math
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'docs/qa/offline_3d_asset_review_v150.png'
CITY=json.loads((BASE/'docs/qa/city_v150_3d_coordinates.json').read_text())['buildings']
W,H=1200,800
rw=vtk.vtkRenderWindow();rw.SetSize(W,H);rw.OffScreenRenderingOn()
ren=vtk.vtkRenderer();rw.AddRenderer(ren)

def cube(pos,scale,col,opacity=1,cityTexture=None):
 src=vtk.vtkCubeSource();src.SetXLength(scale[0]);src.SetYLength(scale[1]);src.SetZLength(scale[2]);
 mp=vtk.vtkPolyDataMapper();mp.SetInputConnection(src.GetOutputPort());actor=vtk.vtkActor();actor.SetMapper(mp);actor.SetPosition(*pos)
 prop=actor.GetProperty();prop.SetColor(*col);prop.SetOpacity(opacity);prop.SetDiffuse(.52);prop.SetAmbient(.64)
 if cityTexture is not None:actor.SetTexture(cityTexture)
 ren.AddActor(actor);return actor

facadeTex=[]
for i in range(4):
 tex=vtk.vtkTexture();reader=vtk.vtkJPEGReader();reader.SetFileName(str(BASE/f'public/assets/materials/city/facade_{i}.jpg'));tex.SetInputConnection(reader.GetOutputPort());tex.InterpolateOn();facadeTex.append(tex)
# City: identical project coordinates; for software viewport review only use a
# representative subset to keep render responsive. The game uses all 825.
for i,b in enumerate(CITY):
 if (b['layer']=='inner' and i%3!=0) or (b['layer']=='middle' and i%3!=0) or (b['layer']=='outer' and i%4!=0):continue
 d=math.hypot(b['x'],b['z']); t=min(1,(d-150)/850)
 col=(.81-.16*t,.82-.12*t,.79-.08*t)
 cube((b['x'], -39+b['height']/2,b['z']), (b['width'],b['height'],b['depth']),col,cityTexture=facadeTex[b['variant']])
 # A broken roof line, purely geometric roof cap.
 if i%4==0:cube((b['x']+.5,-39+b['height']+.5,b['z']+.3),(b['width']*.4,1,b['depth']*.5),(.25+.2*t,.28+.2*t,.29+.2*t))

# Physically grounded dense urban valley; this is a geometry review, not fog shading.
cube((0,-40.0,0),(2400,1.0,2400),(.22,.26,.27))
# One actual hero rooftop and real image mapped PBR albedo (no flat tile grid).
main=cube((0,-1.9,0),(46,3.8,46),(.35,.36,.35));main.GetProperty().SetAmbient(.21)
plane=vtk.vtkPlaneSource();plane.SetOrigin(-22.8,.055,-22.8);plane.SetPoint1(22.8,.055,-22.8);plane.SetPoint2(-22.8,.055,22.8);plane.SetXResolution(1);plane.SetYResolution(1)
mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(plane.GetOutputPort());mesh=vtk.vtkActor();mesh.SetMapper(mapper)
tex=vtk.vtkTexture();rd=vtk.vtkJPEGReader();rd.SetFileName(str(BASE/'public/assets/materials/cinematic/roof_cinematic_albedo.jpg'));tex.SetInputConnection(rd.GetOutputPort());tex.InterpolateOn();mesh.SetTexture(tex);ren.AddActor(mesh)
# One roof railing only; keep the building isolated as per concept.
for s in [-1,1]:
 cube((0,1.25,s*22.95),(46,.9,.6),(.26,.27,.26))
 cube((s*22.95,1.25,0),(.6,.9,46),(.26,.27,.26))
for s in [-1,1]:
 for j in range(-20,21,5):
  cube((j,3.1,s*22.95),(.10,2.7,.10),(.27,.31,.31))
  cube((s*22.95,3.1,j),(.10,2.7,.10),(.27,.31,.31))

# Preview actual, original game-bundled GLBs, not surrogate primitives.
assets=BASE/'public/assets/models/afterday'
modelSpecs=[('afterday_shelter_pbr.glb',(-8,.18,-6)),('afterday_water_tank_pbr.glb',(16,.18,-13)),('afterday_storage_pbr.glb',(12,.18,10))]
loaded=[]
for name,pos in modelSpecs:
 before=ren.GetActors().GetNumberOfItems()
 imp=vtk.vtkGLTFImporter();imp.SetFileName(str(assets/name));imp.SetRenderWindow(rw);imp.Update()
 new=ren.GetActors().GetNumberOfItems()-before
 # GLTF importer retains actors; identify newly added actors from the returned
 # assembly order. All existing actors are left untouched.
 current=list(ren.GetActors())
 for actor in current[-new:]:actor.AddPosition(*pos)
 loaded.append((name,new))

# Campfire warm emissive body; actual game uses multiple animated flames/point lights.
fire=vtk.vtkSphereSource();fire.SetRadius(.65);fire.SetThetaResolution(30);fire.SetPhiResolution(20)
fmap=vtk.vtkPolyDataMapper();fmap.SetInputConnection(fire.GetOutputPort());f=vtk.vtkActor();f.SetMapper(fmap);f.SetPosition(2,.75,3);f.GetProperty().SetColor(1,.50,.18);f.GetProperty().SetAmbient(1);ren.AddActor(f)
ren.GradientBackgroundOn();ren.SetBackground(.28,.34,.39);ren.SetBackground2(.61,.62,.60)
key=vtk.vtkLight();key.SetLightTypeToSceneLight();key.SetPosition(60,105,20);key.SetFocalPoint(0,0,0);key.SetColor(1,.82,.69);key.SetIntensity(1.3);ren.AddLight(key)
fill=vtk.vtkLight();fill.SetLightTypeToSceneLight();fill.SetPosition(-80,50,-35);fill.SetFocalPoint(0,0,0);fill.SetColor(.67,.75,.86);fill.SetIntensity(.65);ren.AddLight(fill)
cam=ren.GetActiveCamera();cam.SetPosition(79,54,88);cam.SetFocalPoint(0,8,0);cam.SetViewUp(0,1,0);cam.SetViewAngle(48)
ren.ResetCameraClippingRange();rw.Render()
f=vtk.vtkWindowToImageFilter();f.SetInput(rw);f.SetInputBufferTypeToRGB();f.ReadFrontBufferOff();f.Update()
writer=vtk.vtkPNGWriter();writer.SetInputConnection(f.GetOutputPort());writer.SetFileName(str(OUT));writer.Write()
print('offline-render:',OUT,'GLB:',loaded)

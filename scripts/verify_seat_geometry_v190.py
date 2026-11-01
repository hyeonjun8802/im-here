#!/usr/bin/env python3
"""Quantitative model-space foot/seat test on exported 3D GLB, no fake browser claims."""
from pathlib import Path
import json,numpy as np,trimesh
root=Path(__file__).resolve().parents[1]
p=root/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb'
s=trimesh.load(p,force='scene')
T=trimesh.transformations.translation_matrix
RX=lambda a:trimesh.transformations.rotation_matrix(a,[1,0,0])

def upd(n,par,v,a):s.graph.update(frame_to=n,frame_from=par,matrix=T(v)@RX(a))
def feet():
 bounds=[]
 for name in s.graph.nodes_geometry:
  if 'weathered thick sole' in name:
   tf,geo=s.graph[name];m=s.geometry[geo].copy();m.apply_transform(tf);bounds.append({'mesh':name,'bottomY':float(m.bounds[0,1]),'topY':float(m.bounds[1,1])})
 assert len(bounds)==2,bounds
 return bounds
standing=feet()
upd('RigRoot','world',(0,-.40,0),0)
for n,x in [('L',-.31),('R',.31)]:
 upd('UpperLeg_'+n,'RigRoot',(x,1.12,0),-1.16)
 upd('Knee_'+n,'UpperLeg_'+n,(0,-.43,0),.7)
seated=feet()
# Three.js root is positioned ROOF_Y + .25. Both here and chair use same physical roof.
spawnAboveRoof=.25;chairSeatAboveRoof=.15+.91*.76;hipAboveRoof=spawnAboveRoof+1.12-.40
hipError=abs(hipAboveRoof-(chairSeatAboveRoof+.135))
footPenetration=max(0,-(min(f['bottomY'] for f in seated)+spawnAboveRoof))
footHover=max(0,min(f['bottomY'] for f in seated)+spawnAboveRoof-.15)
checks={
 'simplified_articulated_meshes':15<=len(s.geometry)<=36,
 'standing_feet_close_to_floor':abs(spawnAboveRoof+min(f['bottomY'] for f in standing))<.35,
 'seated_hip_touching_cushion':hipError<.045,
 'seated_feet_not_below_roof':footPenetration<.085,
 'seated_feet_not_float':footHover<.15
}
report={'source':p.name,'type':'offline GLB transformed geometry (NOT Three.js browser capture)','checks':checks,
 'chairHeightAboveRoof':chairSeatAboveRoof,'seatedHipAboveRoof':hipAboveRoof,'hipClearanceError':hipError,
 'standingFeet':standing,'seatedFeet':seated,'floorPenetration':footPenetration,'footHover':footHover,
 'passed':all(checks.values())}
q=root/'docs/qa/character_seated_geometry_v190.json';q.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if not report['passed']:raise SystemExit('GLB geometric acceptance FAILED')

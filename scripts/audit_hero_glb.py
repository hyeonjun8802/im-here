#!/usr/bin/env python3
"""QA of self-contained AFTERDAY custom GLB geometry, textures and bounds."""
from pathlib import Path
import json
import trimesh
root=Path(__file__).resolve().parents[1]
folder=root/'public/assets/models/afterday'
report={}
for filename in ['afterday_shelter_pbr.glb','afterday_water_tank_pbr.glb','afterday_storage_pbr.glb']:
 path=folder/filename
 scene=trimesh.load(path,force='scene')
 geometries=list(scene.geometry.values())
 mats={getattr(g.visual.material,'name','') for g in geometries if hasattr(g.visual,'material')}
 textures=sum(bool(getattr(g.visual.material,'baseColorTexture',None)) for g in geometries if hasattr(g.visual,'material'))
 bounds=[list(map(float,scene.bounds[0])),list(map(float,scene.bounds[1]))]
 data={'bytes':path.stat().st_size,'nodes':len(scene.graph.nodes_geometry),'meshes':len(geometries),'triangles':sum(len(g.faces) for g in geometries),'bounds':bounds,'texturedMeshes':textures,'materials':sorted(mats)}
 assert data['meshes']>20 and data['triangles']>500 and data['texturedMeshes']>0
 assert data['bounds'][1][0]-data['bounds'][0][0]<20
 assert data['bounds'][1][2]-data['bounds'][0][2]<16
 report[filename]=data
output=root/'docs/HERO_GLB_AUDIT_V080.json';output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS -',len(report),'local PBR GLB assets; total',sum(r['triangles'] for r in report.values()),'triangles')

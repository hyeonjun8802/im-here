#!/usr/bin/env python3
"""GLB mesh + JOINTS_0/WEIGHTS_0 CPU-skinning screenshot QA.
This renders the REAL skinned character geometry in each action, not a static mesh
and not an actual browser WebGL screenshot. Props are rebuilt from runtime dimensions
and rendered at the exact GLB palm-socket transforms.
"""
import json,struct,math
from pathlib import Path
import numpy as np,cv2,trimesh
from PIL import Image,ImageDraw,ImageFont
from scipy.spatial.transform import Rotation
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/v370_hand_socket';OUT.mkdir(parents=True,exist_ok=True)
b=(ROOT/'public/assets/models/afterday/afterday_bearded_survivor_v190.glb').read_bytes()
js=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+js]); offset=(20+js+3)//4*4
assert b[offset+4:offset+8]==b'BIN\x00'
body=b[offset+8:offset+8+struct.unpack_from('<I',b,offset)[0]]
DT={5120:'i1',5121:'u1',5122:'i2',5123:'u2',5125:'u4',5126:'f4'};SZ={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(n):
 a=g['accessors'][n];v=g['bufferViews'][a['bufferView']];dt=np.dtype('<'+DT[a['componentType']]); k=SZ[a['type']];p=v.get('byteOffset',0)+a.get('byteOffset',0);s=v.get('byteStride',dt.itemsize*k)
 return np.ndarray((a['count'],k),dtype=dt,buffer=body,offset=p,strides=(s,dt.itemsize)).copy()
prim=g['meshes'][0]['primitives'][0];A=prim['attributes'];V=acc(A['POSITION']).astype('f8');I=acc(prim['indices']).reshape(-1,3);J=acc(A['JOINTS_0']).astype('i4');W=acc(A['WEIGHTS_0']).astype('f8');W/=W.sum(axis=1,keepdims=True)
ibm=acc(g['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
names={n.get('name'):i for i,n in enumerate(g['nodes'])};parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
joints=g['skins'][0]['joints'];armIDs={'L':joints.index(names['UpperArm_L']),'R':joints.index(names['UpperArm_R'])}
T=lambda pos:trimesh.transformations.translation_matrix(pos)
def euler(x=0,y=0,z=0):
 m=np.eye(4);m[:3,:3]=Rotation.from_euler('XYZ',[x,y,z]).as_matrix();return m
def node_matrix(i,delta):
 n=g['nodes'][i];x=np.eye(4)
 if 'translation' in n:x=T(n['translation'])
 if 'rotation' in n:
  q=n['rotation'];r=np.eye(4);r[:3,:3]=Rotation.from_quat(q).as_matrix();x=x@r
 if 'scale' in n:x=x@np.diag([*n['scale'],1])
 return x @ delta.get(i,np.eye(4))
def joint_globals(delta):
 cache={}
 def matrix(i):
  if i not in cache:cache[i]=(matrix(parents[i]) if i in parents else np.eye(4)) @ node_matrix(i,delta)
  return cache[i]
 return [matrix(i) for i in joints]
def vskin(mats):
 # Skins use model-space bind-pose mesh vertices and GLB inverseBindMatrices.
 p=np.pad(V,((0,0),(0,1)),constant_values=1);out=np.zeros((len(V),3))
 for ii in range(4):
  for ji in np.unique(J[:,ii]):
   mask=J[:,ii]==ji
   if not mask.any():continue
   out[mask]+=(p[mask]@(mats[ji]@ibm[ji]).T)[:,:3]*W[mask,ii,None]
 return out

def prop_mesh(kind):
 parts=[]
 def add(m,xyz=(0,0,0)):
  m.apply_translation(xyz);parts.append(m)
 if kind=='radio':
  add(trimesh.creation.box(extents=(.18,.31,.115)))
  add(trimesh.creation.cylinder(radius=.009,height=.32,sections=12),(0.06,.28,0))
 if kind=='ration':
  m=trimesh.creation.icosphere(subdivisions=2,radius=.102);m.apply_scale([1.3,.64,.86]);add(m)
 if kind=='bowl':
  add(trimesh.creation.cylinder(radius=.18,height=.065,sections=32))
 if kind=='canteen':
  add(trimesh.creation.cylinder(radius=.10,height=.27,sections=28))
  add(trimesh.creation.cylinder(radius=.032,height=.05,sections=14),(0,.16,0))
 if kind=='guitar':
  m=trimesh.creation.icosphere(subdivisions=2,radius=.3);m.apply_scale([1.23,1.08,.43]);add(m)
  m=trimesh.creation.icosphere(subdivisions=2,radius=.2);m.apply_scale([1,.9,.45]);add(m,(0,.20,0))
  add(trimesh.creation.box(extents=(.13,.72,.085)),(0,.55,0))
 return trimesh.util.concatenate(parts)
colors={'radio':(87,95,67),'ration':(195,161,99),'bowl':(170,156,130),'canteen':(154,146,127),'guitar':(174,117,69)}
def arm_delta(a,b=0):return euler(a,0,b)
def pose_data(kind,t=1):
 bite=1 if t else 0; sip=1 if t else 0
 d={}
 if kind=='eat':
  d[names['UpperArm_L']]=arm_delta(-.78,-.57)
  d[names['UpperArm_R']]=arm_delta(-1.12-1.32*bite,.10+.60*bite)
  root=-.38
 elif kind=='drink':
  d[names['UpperArm_L']]=arm_delta(-.16,.12)
  d[names['UpperArm_R']]=arm_delta(-1.03-1.45*sip,.10+.56*sip)
  root=0
 elif kind=='radio':
  d[names['UpperArm_L']]=arm_delta(-.18,.18)
  d[names['UpperArm_R']]=arm_delta(-2.52,.77)
  root=0
 else:
  d[names['UpperArm_L']]=arm_delta(-1.05,-.34)
  d[names['UpperArm_R']]=arm_delta(-.78,-.37)
  root=-.38
 if kind in ('eat','guitar'):
  for side in ('L','R'):
   d[names[f'UpperLeg_{side}']]=arm_delta(-1.16)
   d[names[f'Knee_{side}']]=arm_delta(.70)
 return d,root

def prop_instances(kind,mats,root):
 instances=[]; jointglobals={n: mats[joints.index(names[n])] for n in ['UpperArm_L','UpperArm_R','Torso']}
 base=T((0,root,0));
 if kind=='eat':prop_list=[('bowl','L',[-.012,.000,.115],[0,0,.04]),('ration','R',[.015,.045,.072],[.06,0,.02])]
 elif kind=='drink':prop_list=[('canteen','R',[.018,.03,.035],[-.52,0,-.06])]
 elif kind=='radio':prop_list=[('radio','R',[.018,.085,.045],[-.04,0,-.10])]
 else:prop_list=[('guitar','Torso',[0,.28,.47],[-.10,.05,-.32])]
 for typ,side,local,rot in prop_list:
  if side=='Torso':tf=base@jointglobals['Torso']@T(local)@euler(*rot)@np.diag([1.04,1.04,1.04,1])
  else:
   bone=jointglobals['UpperArm_'+side]
   q=g['nodes'][names['UpperArm_'+side]]['rotation'];inv=np.eye(4);inv[:3,:3]=Rotation.from_quat(q).inv().as_matrix()
   anchor=(.035,.650,.075) if side=='R' else (-.035,.650,.075)
   tf=base@bone@T(anchor)@inv@T(local)@euler(*rot)
  mesh=prop_mesh(typ);pts=trimesh.transform_points(mesh.vertices,tf)
  instances.append((pts,mesh.faces,np.array(colors[typ],float)))
 return instances

def shaded(cam,vertices,faces,base):
 tri=vertices[faces];n=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-10
 light=np.array((.4,.9,1.15));light/=np.linalg.norm(light)
 return n, np.clip(base[None,:]*(np.maximum(0,n@light)[:,None]*.62+.43),0,255)

def render(out,v,props,kind,root,cam):
 W,H=650,700;im=np.zeros((H,W,3),np.uint8)
 for y in range(H):im[y,:]=(np.array([37,40,43])*(1-y/H)+np.array([21,26,32])*(y/H)).astype('uint8')[::-1]
 look=np.array((0,1.44+root,0.05));cam=np.array(cam,dtype=float);forward=look-cam;forward/=np.linalg.norm(forward);right=np.cross(forward,np.array((0,1,0)));right/=np.linalg.norm(right);up=np.cross(right,forward);mat=np.array([right,up,forward]);f=1050
 allitems=[(v,I,np.array((194,190,176)))] + props
 batches=[]
 for verts,face,base in allitems:
  rel=(verts-cam)@mat.T;depth=rel[:,2];xy=np.array([W/2+rel[:,0]*f/np.maximum(depth,.01), H*.53-rel[:,1]*f/np.maximum(depth,.01)]).T.astype('int32')
  tri=xy[face];faceDepth=depth[face].mean(1);cent=verts[face].mean(1);n,col=shaded(cam,verts,face,base)
  front=(n*(cam-cent)).sum(1)>-.001
  vis=(faceDepth>.02)&front&(tri[:,:,0].max(1)>=0)&(tri[:,:,0].min(1)<W)&(tri[:,:,1].max(1)>=0)&(tri[:,:,1].min(1)<H)
  batches.append((tri[vis],faceDepth[vis],col[vis]))
 polys=np.concatenate([a[0] for a in batches]);depths=np.concatenate([a[1] for a in batches]);cs=np.concatenate([a[2] for a in batches]);order=np.argsort(-depths)
 for idx in order:
  t=polys[idx]
  if t[:,0].max()-t[:,0].min()<1 and t[:,1].max()-t[:,1].min()<1:continue
  cv2.fillConvexPoly(im,t,cs[idx,::-1].tolist(),lineType=cv2.LINE_AA)
 img=Image.fromarray(cv2.cvtColor(im,cv2.COLOR_BGR2RGB));dr=ImageDraw.Draw(img);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',21)
 dr.rounded_rectangle((15,14,W-15,62),radius=10,fill=(17,26,34),outline=(95,111,111));dr.text((26,25),f'{kind.upper()} | skinned GLB / real palm socket',font=font,fill=(232,223,209));img.save(out)

result={}
for kind in ('eat','drink','radio','guitar'):
 delta,root=pose_data(kind)
 mats=joint_globals(delta)
 verts=vskin(mats)+np.array([0,root,0]); props=prop_instances(kind,mats,root)
 # Face +Z, camera slightly above the shoulder from the front-left
 cam=[4.1,2.8+root,6.6]
 render(OUT/f'{kind}.png',verts,props,kind,root,cam)
 result[kind]={'skinned_vertices':len(verts),'props':len(props)}
# 2 x 2 overview
pics=[Image.open(OUT/f'{s}.png') for s in ('eat','drink','radio','guitar')]
sheet=Image.new('RGB',(1300,1400),(20,26,33))
for i,im in enumerate(pics):sheet.paste(im,((i%2)*650,(i//2)*700))
sheet.save(OUT/'V370_HAND_PROP_SKINNED_QA.png')
(OUT/'qa.json').write_text(json.dumps(result,indent=2))
print('QA',OUT/'V370_HAND_PROP_SKINNED_QA.png',result)

# Regression: compare the exact v3.6 shoulder-local coordinates (before)
# against the measured palm socket / action posture in v3.7 (after).
def original_pose(kind):
 d={};root=-.38 if kind=='eat' else 0
 if kind=='eat':
  d[names['UpperArm_L']]=arm_delta(-.72,.18)
  d[names['UpperArm_R']]=arm_delta(-1.52,-.36)
  for side in ('L','R'):
   d[names[f'UpperLeg_{side}']]=arm_delta(-1.16)
   d[names[f'Knee_{side}']]=arm_delta(.70)
 elif kind=='radio':
  d[names['UpperArm_R']]=arm_delta(-1.55,-.48)
  d[names['UpperArm_L']]=arm_delta(-.18,.18)
 return d,root

def original_props(kind,mats,root):
 sideitems={
 'eat':[('bowl','L',[-.09,-.92,.20],[math.pi*1.02,.18,-.34]),('ration','R',[.08,-.84,.28],[-.52,.06,.46])],
 'radio':[('radio','R',[.12,-1.02,.10],[.28,.05,-.08])]
 }
 result=[]
 for typ,side,pos,rot in sideitems[kind]:
  joint=mats[joints.index(names['UpperArm_'+side])]
  mesh=prop_mesh(typ);pts=trimesh.transform_points(mesh.vertices,T((0,root,0))@joint@T(pos)@euler(*rot))
  result.append((pts,mesh.faces,np.array(colors[typ],dtype=float)))
 return result

compare=Image.new('RGB',(1300,1400),(20,26,33))
for i,kind in enumerate(('eat','radio')):
 d,r=original_pose(kind);ms=joint_globals(d)
 oldverts=vskin(ms)+[0,r,0]
 before=OUT/f'{kind}_before_v360.png'
 render(before,oldverts,original_props(kind,ms,r),kind+' v3.6 BEFORE',r,[4.1,2.8+r,6.6])
 imold=Image.open(before);imnew=Image.open(OUT/f'{kind}.png')
 compare.paste(imold,(0,i*700));compare.paste(imnew,(650,i*700))
compare.save(OUT/'V360_V370_BEFORE_AFTER_SKINNED.png')
print('BEFORE AFTER',OUT/'V360_V370_BEFORE_AFTER_SKINNED.png')

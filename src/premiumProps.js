import * as THREE from 'three';
const metal=new THREE.MeshStandardMaterial({color:'#68594b',metalness:.68,roughness:.48});
const paleMetal=new THREE.MeshStandardMaterial({color:'#a4a7a2',metalness:.64,roughness:.45});
const rust=new THREE.MeshStandardMaterial({color:'#7a4531',metalness:.49,roughness:.78});
const rope=new THREE.MeshStandardMaterial({color:'#b4a38b',roughness:.94});
const fabric=new THREE.MeshStandardMaterial({color:'#73705b',roughness:.94,side:THREE.DoubleSide});
const repairedFabric=new THREE.MeshStandardMaterial({color:'#4e5142',roughness:.95,side:THREE.DoubleSide});
const dirtyWhite=new THREE.MeshStandardMaterial({color:'#b3afa0',roughness:.93});
const glazed=new THREE.MeshPhysicalMaterial({color:'#344952',roughness:.26,metalness:.3,clearcoat:.52});
const wood=new THREE.MeshStandardMaterial({color:'#524333',roughness:.9});
function cube(p,s,v,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.position.set(...v);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
function tube(p,a,b,r,m,n=7){const a1=new THREE.Vector3(...a),b1=new THREE.Vector3(...b),delta=b1.clone().sub(a1);const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),n),m);o.position.copy(a1.add(b1).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());o.castShadow=true;p.add(o);return o}
function disk(p,r,depth,at,m,n=20,rot=null){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,n),m);o.position.set(...at);if(rot)o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
function torus(p,r,t,at,m){const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,5,24),m);o.position.set(...at);p.add(o);return o}
function edgeGeometry(p,path,m){for(let i=1;i<path.length;i++)tube(p,path[i-1],path[i],.028,m,5)}
/** Improve already-created survivor objects. Adds detail; NEVER adds roof or full-height neighboring buildings. */
export function upgradeCampFacilities(world){
 const roof=world.ROOF_Y??16;
 const parent=new THREE.Group();parent.name='Premium 3D facilities | ONE survivor rooftop';world.scene.add(parent);
 // Canvas shelter has one supported sloping roof already. Everything here is local to that small canvas.
 const tent=world.shelter;
 const xS=6.0,zS=5.0;
 for(let s of [-1,1]){
  for(let j=-1;j<=1;j++){
   const z=j*3.8;const y=4.95+1.18*(1-Math.abs(s*xS)/6)-.28*Math.sin((z/10+.5)*Math.PI);
   disk(tent,.088,.03,[s*(xS-.1),y,z],metal,10,[Math.PI/2,0,0]);
   tube(tent,[s*(xS-.1),y-.12,z],[s*(xS+1.9),.28,z+(.45*j)],.044,rope);
   cube(tent,[.38,.24,.37],[s*7.9,.20,z+.45*j],dirtyWhite);
  }
 }
 // Fabric seam stitching is baked-looking but remains real fine 3D stitching segments.
 for(const z of [-3.8,0,3.8]){
  for(let i=0;i<30;i++){
   const x=-5.6+i*.38,y=4.95+1.18*(1-Math.abs(x)/6)-.28*Math.sin((z/10+.5)*Math.PI)+.06;
   cube(tent,[.16,.012,.017],[x,y,z+.02],i%3===0?rope:repairedFabric);
  }
 }
 // Visible small fabric repairs, distinct from the canopy's full silhouette.
 for(const [x,z,s] of [[-3,1,1.0],[2.9,-2.0,.9],[.3,3.5,.65]]){
  const y=4.95+1.18*(1-Math.abs(x)/6)-.28*Math.sin((z/10+.5)*Math.PI)+.12;
  const patch=cube(tent,[1.5*s,.018,.87*s],[x,y,z],repairedFabric);patch.rotation.z=(x<0?-.18:.18);patch.castShadow=false;
  for(let i=0;i<5;i++)cube(tent,[.1,.012,.018],[x-.55*s+i*.25*s,y+.016,z+.42*s],rope).castShadow=false;
 }
 // Side flaps hanging INSIDE the tent clearance, not a second roof slab.
 const flap=cube(tent,[.06,2.45,5.8],[-5.0,2.0,1.25],fabric);flap.rotation.z=.05;
 for(let k=0;k<4;k++){const z=-2.8+k*1.8;cube(tent,[.10,.65,.10],[4.2,2.2,z],rust);}
 // Water tank: readable metal ribs, bolts, welded legs, gauge, purification equipment.
 const tank=world.tank;
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+.785,xx=Math.cos(a)*2.1,zz=Math.sin(a)*2.1;
  tube(tank,[xx,.23,zz],[xx,4.7,zz],.12,rust);
  tube(tank,[xx,.23,zz],[-xx,2.25,-zz],.09,metal);
  cube(tank,[.5,.18,.5],[xx,.12,zz],dirtyWhite);
 }
 for(let j=0;j<7;j++)for(let k=0;k<10;k++){
  const a=(k/10)*Math.PI*2+.12;
  const rivet=new THREE.Mesh(new THREE.SphereGeometry(.055,6,4),paleMetal);
  rivet.position.set(Math.cos(a)*2.87,3.1+j*.84,Math.sin(a)*2.87);tank.add(rivet);
 }
 const gauge=cube(tank,[.16,1.55,.43],[2.93,5.7,.6],dirtyWhite);gauge.rotation.y=.07;
 cube(tank,[.09,1.22,.14],[3.055,5.69,.58],glazed);
 disk(tank,.25,.14,[3.08,6.63,.62],metal,12,[0,0,Math.PI/2]);
 for(let i=0;i<6;i++){
  const y=3.0+i*.78;
  tube(tank,[-2.94,y,-1.65],[-3.35,y,-1.65],.045,metal);
 }
 tube(tank,[-3.38,3,-1.65],[-3.38,8,-1.65],.06,metal);
 tube(tank,[-2.86,3,-1.65],[-2.86,8,-1.65],.06,metal);
 const filter=cube(tank,[.7,1.4,.7],[3.92,2.1,1.1],dirtyWhite);
 disk(tank,.45,.14,[3.92,2.86,1.1],metal);
 edgeGeometry(tank,[[2.85,7.5,1],[4.5,7.5,1],[4.5,3.0,1.1],[3.92,3,1.1]],rust);
 edgeGeometry(tank,[[3.92,1.3,1.1],[4.8,1.3,1.1],[4.8,.5,1.3]],metal);
 torus(tank,.42,.065,[4.86,2.1,.6],rust);
 // Supply crates: edge protectors, grab handles and hinges added to the existing chest group.
 const store=world.storage;
 for(let i=0;i<5;i++){
  const x=(i%3)*1.45,z=Math.floor(i/3)*2;
  for(let s of [-1,1]){
   cube(store,[.09,1.28,.09],[x+s*.61,.85,z+.63],metal);
   cube(store,[.09,1.28,.09],[x+s*.61,.85,z-.63],metal);
  }
  cube(store,[.52,.13,.11],[x,1.35,z+.68],metal);
  cube(store,[.19,.35,.10],[x,1.07,z+.7],rust);
 }
 // Charred firewood and stone ring (without closing the playable roof).
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11;
  const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.34,0),i%3?dirtyWhite:metal);
  stone.position.set(2+Math.cos(a)*1.35,roof+.46,3+Math.sin(a)*1.35);stone.rotation.y=a;stone.scale.set(1.2,.52,1);stone.castShadow=true;parent.add(stone);
 }
 // Purposeful roof conduit, clamps and standing gauge — stays close to perimeter.
 for(let j=0;j<4;j++){
  const z=-16+j*3.4;
  tube(parent,[19,roof+.25,z],[19,roof+1.1,z],.11,metal);
  tube(parent,[19,roof+1.1,z],[19,roof+1.1,z+2],.11,metal);
  disk(parent,.19,.13,[19,roof+1.12,z],rust,10,[Math.PI/2,0,0]);
 }
 // Three small weathered drum props, deliberately NOT third-party flat rooftop meshes.
 for(let i=0;i<3;i++){
  const x=9.8+i*1.15,z=16;
  disk(parent,.42,1.0,[x,roof+.74,z],i%2?metal:rust,16);
  torus(parent,.43,.036,[x,roof+1.17,z],paleMetal).rotation.x=Math.PI/2;
 }
 world.premiumFacilities=parent;
 return parent;
}

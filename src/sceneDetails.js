import * as THREE from 'three';
import {installOriginalCot} from './sleepBedding.js';

// 3D set dressing around the ONE survivor rooftop. No adjacent structures.
const mat=(c,r=.86,metal=.08)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:metal});
const palette={dark:mat('#252d2c'),rust:mat('#794834',.88,.48),warmMetal:mat('#776852',.79,.42),canvas:mat('#575b46'),ivory:mat('#aaa58b'),wood:mat('#514132'),plant:mat('#334b2d'),leaf:mat('#4b6940'),light:new THREE.MeshStandardMaterial({color:'#f7c588',emissive:'#f2a54b',emissiveIntensity:2.8,roughness:.32}),glass:mat('#1c3442',.23,.38)};
const rand=n=>{let v=Math.sin(n*127.1+43.93)*43758.5453;return v-Math.floor(v)};
function block(g,size,pos,m,rotY=0){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...pos);o.rotation.y=rotY;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function tube(g,a,b,r,m){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const dir=bv.clone().sub(av),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),6),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());o.castShadow=true;g.add(o);return o;}
function lamp(g,x,y,z,scale=1){const o=new THREE.Mesh(new THREE.SphereGeometry(.12*scale,8,5),palette.light);o.position.set(x,y,z);g.add(o);return o;}

export function decorateHeroRooftop(scene,roofHeight,world){
 const group=new THREE.Group();group.name='Survivor camp detail - SINGLE rooftop';scene.add(group);
 // The bed is used by the survival/sleep system. All other set dressing is
 // optional and is not even constructed on mobile.
 if(world.isMobile){
  world.sleepBedding=installOriginalCot(group,roofHeight);
  world.campDetails=group;
  world.campDetailLights=[];
  return group;
 }
 // Weathered facade ivy: dangling greenery is ATTACHED to the hero building.
 const foliage=new THREE.Group();foliage.name='Climbing vines and reclaimed nature';group.add(foliage);
 // Lanceolate curved leaves instead of low-poly green diamonds; instanced for mobile.
 const leafGeom=new THREE.BufferGeometry();
 leafGeom.setAttribute('position',new THREE.Float32BufferAttribute([
 0,-.48,0, -.25,-.16,.032, -.27,.17,.055, 0,.53,.013,
 .27,.17,.055, .25,-.16,.032, 0,0,.13
 ],3));
 leafGeom.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);
 leafGeom.computeVertexNormals();
 const leafMat=new THREE.MeshStandardMaterial({color:'#78966b',roughness:.78,metalness:0,side:THREE.DoubleSide});
 const ivyCount=world.isMobile?320:640,leaves=new THREE.InstancedMesh(leafGeom,leafMat,ivyCount);leaves.castShadow=false;leaves.receiveShadow=true;leaves.frustumCulled=false;
 const dummy=new THREE.Object3D();let idx=0;
 for(let i=0;i<34;i++){
  const side=i%4,seed=i*17+47,s=(-20+rand(seed)*40),len=3+rand(seed+2)*15;
  const start=[side===0?s:side===1?23:side===2?s:-23,roofHeight+1.7,side===0?23:side===1?s:side===2?-23:s];
  const end=[start[0]+(rand(seed+3)-.5)*1.6,roofHeight+1.7-len,start[2]+(rand(seed+4)-.5)*1.6];
  tube(foliage,start,end,.045,palette.plant);
  for(let j=0;j<Math.floor(ivyCount/34);j++){
   if(idx>=ivyCount)break;const t=j/Math.floor(ivyCount/34),a=j*2.399;dummy.position.set(start[0]+(end[0]-start[0])*t+Math.cos(a)*.52,start[1]-len*t,start[2]+(end[2]-start[2])*t+Math.sin(a)*.52);
   dummy.rotation.set(rand(idx+4)*2,rand(idx+3)*6,rand(idx+2)*2);dummy.scale.set(.5+rand(idx)*.8,.7+rand(idx+7)*.9,.5+rand(idx+9));dummy.updateMatrix();leaves.setMatrixAt(idx,dummy.matrix);leaves.setColorAt(idx,new THREE.Color().setHSL(.22+rand(idx+103)*.07,.22+rand(idx+45)*.16,.30+rand(idx+52)*.18));idx++;
  }
 }
 leaves.count=idx;leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;foliage.add(leaves);
 // Big silhouette detail: high/low roof pipes, conduits, valve clusters and rusty flashing.
 for(let i=0;i<13;i++){const x=-18+i*2.9,z=18+rand(i+50)*3;
  tube(group,[x,roofHeight+.3,z],[x+.5,roofHeight+1.2,z],.085,palette.rust);
  if(i%3===0)tube(group,[x,roofHeight+1.18,z],[x+1.25,roofHeight+1.18,z-.5],.065,palette.warmMetal);
 }
 // A rust-red emergency generator, battered battery bank, fuel cans.
 const equipment=new THREE.Group();equipment.position.set(15,roofHeight+.25,9);group.add(equipment);
 block(equipment,[2.6,1.35,1.65],[0,.7,0],palette.rust);block(equipment,[2.7,.18,1.7],[0,1.4,0],palette.dark);
 for(let i=0;i<8;i++)block(equipment,[.06,.8,.06],[-1.1+i*.3,.7,.87],palette.warmMetal);
 for(const x of [-1,1]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.32,.08,5,12),palette.dark);wheel.position.set(x*.95,.35,.93);equipment.add(wheel)}
 for(let i=0;i<3;i++){const x=14+i*1.45;block(group,[.7,1.2,.65],[x,roofHeight+.82,12],i%2?palette.warmMetal:palette.rust);block(group,[.82,.14,.76],[x,roofHeight+1.52,12],palette.dark)}
 // Solar: non-cosmetic utility array; 3D glass/metal tilt and black cell subdivisions.
 const solar=new THREE.Group();solar.position.set(-14,roofHeight+.24,14);solar.rotation.y=.35;group.add(solar);
 for(let k=0;k<2;k++){
  const x=(k-.5)*3.1;for(const z of [-1.3,1.3])tube(solar,[x,0,z],[x,1.65,z],.08,palette.warmMetal);
  const panel=block(solar,[2.85,.10,3],[x,1.72,0],palette.dark);panel.rotation.x=-.27;
  for(let col=0;col<4;col++)for(let row=0;row<5;row++){
   const cell=block(solar,[.58,.012,.48],[x-1.02+col*.68,1.76+(row-2)*.07,-1.01+row*.53],palette.glass);
   cell.rotation.x=-.27;
  }
 }
 // Workbench with open shelving, crates, tool jars, planks, lamps.
 const bench=new THREE.Group();bench.position.set(5,roofHeight+.25,-13);group.add(bench);
 block(bench,[8.5,.3,2.0],[0,2.0,0],palette.wood);
 for(const x of [-3.8,3.8])for(const z of [-.8,.8])block(bench,[.18,2,.16],[x,1,z],palette.rust);
 block(bench,[8,.18,1.7],[0,.55,0],palette.wood);
 for(let i=0;i<9;i++){let x=-3.5+i*.82;block(bench,[.42,.25,.4],[x,2.25,rand(i+2)*.8-.45],i%2?palette.rust:palette.dark);}
 for(let i=0;i<4;i++){let x=-2.9+i*1.4;block(bench,[1.15,.68,.85],[x,.99,.28],i%2?palette.warmMetal:palette.wood)}
 const workLight=new THREE.PointLight('#fdbd75',world.isMobile?1.3:2.6,15,2);workLight.position.set(5,roofHeight+3.1,-12.3);scene.add(workLight);lamp(bench,2,3,-.4,1.5);
 // Camp crates and tied-up supply piles, purposeful non-uniform composition.
 const boxes=[[-16,-8],[-13,-11],[-18,-5],[-8,14],[12,16],[18,14],[1,-16],[3,-17]];
 boxes.forEach(([x,z],i)=>{const h=.65+rand(i+8)*.68;const c=block(group,[1.5+rand(i+30),h,1.1+rand(i+3)],[x,roofHeight+.3+h/2,z],i%3?palette.wood:palette.warmMetal,rand(i+5)*.6-.3);block(group,[1.4,.08,1],[x,roofHeight+.3+h+.06,z],palette.dark);});
 // One unified inner shelter bed only: permanently present pillow and folded blanket.
 // The previous outer cot location is retired; sleep always targets the inside bed.
 world.sleepBedding=installOriginalCot(group,roofHeight);
 // Warm hanging bulbs on wires around the only rooftop's inner parapet.
 const catenaries=[];const anchor=[[-20,-17],[1,-18],[18,-16],[19,8],[17,19],[-4,19],[-19,17]];
 anchor.forEach(([x,z],i)=>{
  tube(group,[x,roofHeight+.2,z],[x,roofHeight+6,z],.11,palette.rust);
  if(i>0){const [ax,az]=anchor[i-1],dist=Math.hypot(ax-x,az-z),n=Math.max(3,Math.floor(dist/3));
   let previous=[ax,roofHeight+6,az];for(let j=1;j<=n;j++){const f=j/n,yy=roofHeight+6-.85*Math.sin(Math.PI*f),pos=[ax+(x-ax)*f,yy,az+(z-az)*f];tube(group,previous,pos,.025,palette.dark);if(j<n&&j%2===0)lamp(group,pos[0],pos[1]-.18,pos[2],1.5);previous=pos;}
  }
 });
 // Scattered stones, lifted slab edges and rusty debris (not other buildings).
 for(let i=0;i<32;i++){const x=(rand(i+61)-.5)*38,z=(rand(i+91)-.5)*38;if(Math.abs(x)<5&&Math.abs(z)<5)continue;let y=roofHeight+.19;
  block(group,[.28+rand(i)*.7,.06+rand(i+4)*.12,.18+rand(i+2)*.4],[x,y,z],i%4?palette.warmMetal:palette.dark,rand(i+15)*3.1);
 }
 // Warm lamp pools: point lights are authentic 3D sources, independent of backdrop.
 const glowA=new THREE.PointLight('#ffb66e',world.isMobile?1.5:2.2,19,2);glowA.position.set(-8,roofHeight+4,-5);scene.add(glowA);
 const glowB=new THREE.PointLight('#ffc583',world.isMobile?1.1:1.9,21,2);glowB.position.set(14,roofHeight+5,6);scene.add(glowB);
 world.campDetails=group;world.campDetailLights=[glowA,glowB,workLight];return group;
}

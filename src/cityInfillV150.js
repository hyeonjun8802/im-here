import * as THREE from 'three';
import {makeCityInfill, measureInfill} from './cityInfillPlanV150.js';
import {createFracturedTowerGeometry,fracturedRoofHeightAt} from './ruinedBuildingGeometry.js';
import {CITY_COMPOSITION} from './cityComposition.js';
import {finishTexture} from './premiumMaterialFinishV600.js';
/**
 * Physically located, fixed-coordinate 3D background. NOT a billboard.
 * All background tiers share broad, weathered 3D concrete-block silhouettes.
 * Instanced geometry makes the city read as an inhabited volume
 * abandoned long ago, rather than a few isolated tower blocks.
 */
export class CityInfillV150 {
 constructor(world){
  this.world=world;this.root=new THREE.Group();this.root.name='Afterday v1.5 physically dense ruined city';world.scene.add(this.root);
  const plan=makeCityInfill(world.isMobile,world.distantCityPlan||[]);this.plan=plan;
  this.quality=measureInfill(plan);this.materials=[];this.instances=[];
  const targetMinY=CITY_COMPOSITION.groundY;
  const bases=Array.from({length:4},(_,i)=>createFracturedTowerGeometry(i));
  const rooftops=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  // Four multi-storey, detailed window atlas textures already in the project.
  const materialBank=[];
  const facadePairs=Array.from({length:4},(_,v)=>{
    const map=new THREE.TextureLoader().load(`./assets/materials/city/facade_premium_${v}.jpg`);
    const emissive=new THREE.TextureLoader().load(`./assets/materials/city/facade_${v}_emissive.jpg`);
    map.colorSpace=THREE.SRGBColorSpace;emissive.colorSpace=THREE.SRGBColorSpace;
    finishTexture(map,world.isMobile?4:8);
    finishTexture(emissive,world.isMobile?4:8);return {map,emissive};
  });
  for(const layer of ['inner','middle','outer']){
   const mats=[];
   for(let v=0;v<4;v++){
    const {map,emissive:night}=facadePairs[v];
    const tone=layer==='inner'?'#9fa699':layer==='middle'?'#949e98':'#86918d';
    const m=new THREE.MeshStandardMaterial({color:tone,map,emissive:0xffd9a9,emissiveMap:night,emissiveIntensity:0,roughness:.92,metalness:.03});
    mats.push(m);this.materials.push(m);
   }materialBank.push(mats);
  }
  const layers=['inner','middle','outer'];
  const roofColors=['#3c4445','#55564f','#4d5852'];
  const roofMats=roofColors.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.94,metalness:.05}));
  for(let li=0;li<3;li++)for(let vi=0;vi<4;vi++){
   const items=plan.filter(x=>x.layer===layers[li]&&x.variant===vi);
   if(!items.length)continue;
   const mesh=new THREE.InstancedMesh(bases[vi],[materialBank[li][vi],roofMats[li]],items.length);mesh.name=`3D ruined city ${layers[li]} facade variant ${vi}`;
   mesh.castShadow=false;mesh.receiveShadow=false;
   const crowns=new THREE.InstancedMesh(rooftops,roofMats[li],items.length);crowns.castShadow=false;crowns.receiveShadow=false;
   items.forEach((b,i)=>{
    dummy.position.set(b.x,targetMinY,b.z);dummy.rotation.set(0,b.rotation,0);dummy.scale.set(b.width,b.height,b.depth);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    // A ruined, offset concrete service block partially buried in roof growth.
    const scale=.23+.12*(b.kind===2?1:0);
    const roofTop=targetMinY+b.height*fracturedRoofHeightAt(vi,b.kind===1?.17:0,0);
    const serviceHeight=Math.min(.4+b.kind*.3,Math.max(.1,(CITY_COMPOSITION.heroRoofY-1.8-roofTop)*.75));
    dummy.position.set(b.x+(b.kind===1?b.width*.17:0),roofTop+serviceHeight*.5,b.z);
    dummy.rotation.set(0,b.rotation,0);dummy.scale.set(b.width*scale,serviceHeight,b.depth*(b.kind===0?.48:scale));dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;
   mesh.computeBoundingSphere();crowns.computeBoundingSphere();this.root.add(mesh,crowns);this.instances.push(mesh,crowns);
  }
  // Layered skyline never moves during day/night, rain, lightning or reload.
 }
 update(night){for(const m of this.materials)m.emissiveIntensity=night*.64;}
}

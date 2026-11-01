/** In-engine Three.js camera projection audit, not a rendered WebGL screenshot. */
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three/build/three.module.js';
import {planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot,settleContractedCity} from '../src/cityContraction.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
import {CITY_COMPOSITION} from '../src/cityComposition.js';
const rand=n=>{let x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const width=1536,height=940;
const cam=new THREE.PerspectiveCamera(46,width/height,.15,1650);
const target=new THREE.Vector3(0,CITY_COMPOSITION.heroRoofY+3.3,0),radius=79,pitch=1.29,yaw=.78;
const sy=Math.cos(pitch)*radius,rr=Math.sin(pitch)*radius;
cam.position.set(Math.sin(yaw)*rr,target.y+sy,Math.cos(yaw)*rr);cam.lookAt(target);cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
const primary=settleContractedCity(planDistantCity(false,rand).map(contractCitySlot));
const all=[...primary,...makeCityInfill(false,primary)];
const layers={near:[],mid:[],far:[],inner:[],middle:[],outer:[]};
for(const b of all){
 const d=b.depth||b.width*.82,top=CITY_COMPOSITION.groundY+b.height;
 const pts=[];
 for(const x of [-b.width*.5,b.width*.5])for(const z of [-d*.5,d*.5])for(const y of [CITY_COMPOSITION.groundY,top]){
  const rot=b.rotation||0,c=Math.cos(rot),s=Math.sin(rot);
  const proj=new THREE.Vector3(b.x+x*c+z*s,y,b.z-x*s+z*c).project(cam);
  pts.push({x:(proj.x+1)*width/2,y:(1-proj.y)*height/2,z:proj.z});
 }
 const x0=Math.min(...pts.map(p=>p.x)),x1=Math.max(...pts.map(p=>p.x)),y0=Math.min(...pts.map(p=>p.y)),y1=Math.max(...pts.map(p=>p.y));
 if(x1<0||x0>width||y1<0||y0>height||!pts.some(p=>p.z<1&&p.z>-1))continue;
 layers[b.tier||b.layer].push({id:b.id||'primary',x:Math.round(x0),y:Math.round(y0),w:Math.round(x1-x0),h:Math.round(y1-y0),radius:Math.hypot(b.x,b.z),roofTop:top});
}
const vis=Object.values(layers).flat();
const report={camera:{width,height,position:cam.position.toArray(),target:target.toArray()},
 gameBuildingCount:all.length,visible:vis.length,visibleWithin190:vis.filter(x=>x.radius<190).length,
 visibleTallEnough30px:vis.filter(x=>x.h>=30).length,visibleTallEnough60px:vis.filter(x=>x.h>=60).length,
 projected: Object.fromEntries(Object.entries(layers).map(([k,a])=>[k,{count:a.length,medianHeightPx: a.length?a.map(x=>x.h).sort((x,y)=>x-y)[Math.floor(a.length/2)]:0}])),
 bounds:{minHeight:Math.min(...all.map(x=>x.height)),maxHeight:Math.max(...all.map(x=>x.height)),minRadius:Math.min(...all.map(x=>Math.hypot(x.x,x.z))),maxRadius:Math.max(...all.map(x=>Math.hypot(x.x,x.z)))}};
fs.mkdirSync('docs/qa/v270',{recursive:true});
fs.writeFileSync('docs/qa/v270/camera_projection_audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

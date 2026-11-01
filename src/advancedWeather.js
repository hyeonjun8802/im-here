import * as THREE from 'three';
import {lightningEnvelope} from './weatherVisualMath.js';
const PI=Math.PI;
const hash=(n)=>{let x=Math.sin(n*127.1+24.71)*43758.5453;return x-Math.floor(x)};
function cloudTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),img=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const nx=(x-63.5)/63.5,ny=(y-63.5)/63.5;
  const broad=Math.exp(-(nx*nx*1.75+ny*ny*5.0));
  const band=Math.sin(x*.105+Math.sin(y*.08)*.9)*.09+Math.cos(x*.19+y*.12)*.06;
  const a=Math.max(0,Math.min(1,(broad+band-.12)*1.05));
  const i=(y*128+x)*4;img.data[i]=img.data[i+1]=img.data[i+2]=255;img.data[i+3]=Math.round(a*255);
 }
 ctx.putImageData(img,0,0);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function lineSegments(points,material){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return new THREE.LineSegments(g,material)}
function makeBolt(seed=9){const pts=[];let x=0,z=0;const node=[];
 for(let i=0;i<22;i++){
  const y=90-i*3.7,nx=x+(hash(i*31+seed)-.5)*7,nz=z+(hash(i*14+seed)-.5)*5;
  pts.push(x,y,z,nx,y-3.7,nz);node.push([nx,y-3.7,nz]);x=nx;z=nz;
 }
 for(let i=3;i<17;i+=3){let [bx,by,bz]=node[i];for(let j=0;j<5;j++){
  let nx=bx+(hash(seed+i*4+j)-.32)*8,ny=by-2.4,nz=bz+(hash(seed+i*7+j)-.5)*5;
  pts.push(bx,by,bz,nx,ny,nz);bx=nx;by=ny;bz=nz;
 }}
 return pts;
}
/** Truly spatial rain interaction: 3D rings, runoff on hero tower, wind-borne particles, snow and layered sky clouds. */
export class AdvancedWeather {
 constructor(scene, roofY, isMobile){
  this.scene=scene;this.roofY=roofY;this.isMobile=isMobile;this.clock=0;this.wind=0;this.intensity=0;
  this.root=new THREE.Group();this.root.name='Weather-VFX-FX-spatial';scene.add(this.root);
  const ring=new THREE.RingGeometry(.71,1,16);
  const ringMat=new THREE.MeshBasicMaterial({color:'#aac9d5',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  this.splash=new THREE.InstancedMesh(ring,ringMat,isMobile?72:160);this.splash.frustumCulled=false;this.splash.renderOrder=3;this.root.add(this.splash);
  this.dummy=new THREE.Object3D();this.splashSeeds=[];
  for(let i=0;i<this.splash.count;i++){
   const x=(hash(i*13+51)-.5)*40,z=(hash(i*19+76)-.5)*40;
   this.splashSeeds.push({x,z,phase:hash(i*11)*3.4,speed:1.2+hash(i*91)*1.3});
  }
  this.snowPositions=new Float32Array((isMobile?300:750)*3);
  for(let i=0;i<this.snowPositions.length/3;i++){
   this.snowPositions[i*3]=(hash(i*5+14)-.5)*58;
   this.snowPositions[i*3+1]=roofY+hash(i*8+3)*42;
   this.snowPositions[i*3+2]=(hash(i*9+1)-.5)*58;
  }
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(this.snowPositions,3).setUsage(THREE.DynamicDrawUsage));
  this.snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:'#f3f7fa',size:isMobile?.38:.47,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true}));this.snow.frustumCulled=false;this.root.add(this.snow);
  this.streams=[];const flowMat=new THREE.MeshPhysicalMaterial({color:'#98aeb2',transparent:true,opacity:0,metalness:.08,roughness:.18,depthWrite:false,side:THREE.DoubleSide});
  const cylinder=new THREE.CylinderGeometry(.053,.15,10,6,1,true);
  for(let side=0;side<4;side++)for(let i=0;i<3;i++){
   const stream=new THREE.Mesh(cylinder,flowMat);let q=-14+i*14;
   if(side===0)stream.position.set(q,roofY-3.8,23.5);
   else if(side===1)stream.position.set(q,roofY-3.8,-23.5);
   else if(side===2)stream.position.set(23.5,roofY-3.8,q);
   else stream.position.set(-23.5,roofY-3.8,q);
   this.root.add(stream);this.streams.push(stream);
  }
  this.clouds=[];const tex=new THREE.TextureLoader().load('./assets/materials/cinematic/cloudbank_alpha.png');tex.colorSpace=THREE.SRGBColorSpace;
  for(let i=0;i<(isMobile?36:62);i++){
   const a=i*2.3999,r=82+hash(i*67)*178;
   const c=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,color:'#b1bbc8',transparent:true,opacity:.16,depthWrite:false,depthTest:true,fog:false}));
   c.position.set(Math.cos(a)*r,65+hash(i+33)*38,Math.sin(a)*r);
   c.scale.set(45+hash(i+1)*55,15+hash(i+3)*21,1);
   this.root.add(c);this.clouds.push(c);
  }
  this.bolt=lineSegments(makeBolt(8),new THREE.LineBasicMaterial({color:'#e3f5ff',transparent:true,opacity:.96,depthWrite:false}));this.bolt.position.set(184,0,-195);this.bolt.visible=false;this.root.add(this.bolt);
  this.boltOuter=this.bolt.clone();this.boltOuter.material=new THREE.LineBasicMaterial({color:'#70a2ec',transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false});this.boltOuter.scale.set(1.025,1,1.025);this.root.add(this.boltOuter);this.boltOuter.visible=false;
  this.farFlash=new THREE.DirectionalLight('#b6d8ff',0);this.farFlash.position.set(180,130,-170);this.root.add(this.farFlash);
  const count=isMobile?430:900;const debris=new Float32Array(count*3);this.debrisSeeds=[];
  for(let i=0;i<count;i++){
   const a=hash(i+8)*PI*2,t=hash(i*3+20),rr=1.5+Math.pow(t,1.4)*14;
   this.debrisSeeds.push({a,t,rr,offset:hash(i+2)*PI*2});debris[i*3]=Math.cos(a)*rr;debris[i*3+1]=t*58+4;debris[i*3+2]=Math.sin(a)*rr;
  }
  this.debrisPositions=debris;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(debris,3).setUsage(THREE.DynamicDrawUsage));
  this.debris=new THREE.Points(geo,new THREE.PointsMaterial({color:'#747274',size:1.35,transparent:true,opacity:.0,depthWrite:false}));this.debris.position.set(-240,-19,-255);this.debris.frustumCulled=false;this.root.add(this.debris);
  this.lightningTimer=4.6;this.flashTime=0;this.flashPeak=0;this.flashAge=999;this.legacyPrecipitationDisabled=false;
 }
 update(dt,w,night,stormNight){
  this.clock+=dt;
  this.intensity=w.rain;this.wind=w.wind;
  const now=this.clock;
  this.splash.material.opacity=this.legacyPrecipitationDisabled?0:Math.min(.65,w.rain*.59);
  if(!this.legacyPrecipitationDisabled)for(let i=0;i<this.splash.count;i++){
   const p=this.splashSeeds[i],cycle=(now*p.speed+p.phase)%1,life=(1-cycle)*Math.min(1,cycle*7);
   const radius=.11+cycle*.57;
   this.dummy.position.set(p.x,this.roofY+.235,p.z);
   this.dummy.rotation.set(-PI/2,0,0);this.dummy.scale.set(radius*(1+w.rain*.3)*life,radius*(1+w.rain*.3)*life,1);
   this.dummy.updateMatrix();this.splash.setMatrixAt(i,this.dummy.matrix);
  }
  if(!this.legacyPrecipitationDisabled)this.splash.instanceMatrix.needsUpdate=true;
  for(const s of this.streams){s.material.opacity=Math.min(.52,w.wet*.42+w.rain*.17);s.scale.x=.5+w.rain*.6;s.scale.z=.5+w.rain*.6;}
  this.snow.material.opacity=this.legacyPrecipitationDisabled?0:Math.min(.93,w.snow*.89);
  if(w.snow>.002&&!this.legacyPrecipitationDisabled){const p=this.snowPositions;for(let i=0;i<p.length;i+=3){p[i]+=dt*(.7+w.wind*2.3);p[i+1]-=dt*(1.45+hash(i)*1.2);p[i+2]+=Math.sin(now*.45+i)*dt*.2;if(p[i+1]<this.roofY+.3){p[i+1]=this.roofY+30+hash(i+Math.floor(now))*12;p[i]=(hash(i+Math.floor(now)*11)-.5)*57}}this.snow.geometry.attributes.position.needsUpdate=true;}
  for(let i=0;i<this.clouds.length;i++){
   const cloud=this.clouds[i];cloud.position.x+=dt*(.22+w.wind*2.6)*(1+(i%4)*.1);if(cloud.position.x>245)cloud.position.x=-245;
   cloud.material.opacity=(.09+w.cloud*.40)*(1-night*.16);
   cloud.material.color.set(w.storm>.2?'#6e7882':night>.6?'#6e7890':'#d5d6cd');
  }
  this.debris.material.opacity=Math.min(.77,w.tornado*.67);
  this.debris.visible=w.tornado>.008;
  if(this.debris.visible){const p=this.debrisPositions;for(let i=0;i<this.debrisSeeds.length;i++){
   const o=this.debrisSeeds[i],j=i*3,spin=now*(.7+o.t*.7)+o.a;
   const rr=o.rr*(.88+Math.sin(now*1.6+o.offset)*.12);p[j]=Math.cos(spin)*rr;p[j+1]=(o.t*58+now*2.8)%60+3;p[j+2]=Math.sin(spin)*rr;
  }this.debris.geometry.attributes.position.needsUpdate=true;}
  this.lightningTimer-=dt;
  if(w.storm>.4&&this.lightningTimer<=0){this.flashAge=0;this.flashPeak=1;this.lightningTimer=5.6+hash(Math.floor(now*9))*7;
   this.bolt.position.set(hash(Math.floor(now*17))>.5?210:-210,-10,-180);this.boltOuter.position.copy(this.bolt.position);
   this.bolt.geometry.dispose();this.bolt.geometry=lineSegments(makeBolt(Math.floor(now*29)),this.bolt.material).geometry;this.boltOuter.geometry=this.bolt.geometry;
  }
  this.flashAge+=dt;
  const f=lightningEnvelope(this.flashAge);
  this.flashTime=Math.max(0,.32-this.flashAge);
  this.bolt.visible=f>.055;this.boltOuter.visible=f>.055;
  this.bolt.material.opacity=f;
  this.boltOuter.material.opacity=f*.62;
  this.farFlash.intensity=f*5.8*w.storm;
 }
}

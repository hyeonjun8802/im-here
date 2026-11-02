import * as THREE from 'three';
import {depthAtmosphere} from './spatialLayout.js';
import {INFILL_LAYERS} from './cityInfillPlanV150.js';

// Fine 3D distance haze, with cloud banks sitting among building tiers.
// These are depth-tested planes located in the actual world, NOT screen-space
// fog painted over the whole frame. The original rooftop remains unobscured.
const hash=n=>{const a=Math.sin(n*91.719+12.9)*43758.5453;return a-Math.floor(a)};
function cloudTexture(){
 const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');const image=ctx.createImageData(size,size);
 // Multi-frequency smooth field, feathered toward all four edges.
 const val=(x,y)=>hash(x*113+y*191+8);
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
   const smooth=t=>t*t*(3-2*t);const a=smooth(u),b=smooth(v);
   return (val(ix,iy)*(1-a)+val(ix+1,iy)*a)*(1-b)+(val(ix,iy+1)*(1-a)+val(ix+1,iy+1)*a)*b;
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const xx=x/(size-1),yy=y/(size-1);
   let n=noise(xx*4,yy*4)*.53+noise(xx*9,yy*9)*.29+noise(xx*20,yy*20)*.18;
   const feather=Math.pow(Math.max(0,Math.sin(Math.PI*xx)*Math.sin(Math.PI*yy)),.65);
   const alpha=Math.max(0,Math.min(1,(n-.24)*2.25))*feather;
   const p=(y*size+x)*4;image.data[p]=217;image.data[p+1]=229;image.data[p+2]=231;image.data[p+3]=Math.round(alpha*255);
 }
 ctx.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

function rainCurtainTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');
 // Fine, sparse, varying-distance cool rain streaks. NO flat white lines.
 for(let i=0;i<490;i++){
   const x=hash(i*17+7)*256,y=hash(i*29+8)*512;
   const len=10+hash(i*9+17)*49;
   ctx.strokeStyle=`rgba(191,214,229,${(.035+hash(i*5+12)*.14).toFixed(3)})`;
   ctx.lineWidth=.45+hash(i*33+1)*1.05;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1.5+hash(i+6)*6,y+len);ctx.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);
 t.colorSpace=THREE.SRGBColorSpace;return t;
}

export class CityAtmosphere {
 constructor(scene,isMobile){
  this.scene=scene;this.time=0;this.bankTiers=[];this.rainCurtains=[];
  this.cloudTexture=cloudTexture();
  const plane=new THREE.PlaneGeometry(1,1);
  const tierSpecs=[
   {count:isMobile?18:30,min:90,max:300,y:-16,size:[55,115],opacity:.74},
   {count:isMobile?19:34,min:230,max:560,y:-8,size:[72,150],opacity:.92},
   {count:isMobile?17:32,min:430,max:880,y:1,size:[95,205],opacity:1.08}
  ];
  this.bankGeometry=plane;
  for(let tier=0;tier<tierSpecs.length;tier++){
   const spec=tierSpecs[tier],legacyLayer=INFILL_LAYERS[tier],records=[];
   const material=new THREE.MeshBasicMaterial({
    map:this.cloudTexture,color:'#bbcad2',transparent:true,opacity:0,
    depthWrite:false,depthTest:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1
   });
   const mesh=new THREE.InstancedMesh(plane,material,spec.count);
   mesh.name=`Drifting volumetric-looking city mist tier ${tier+1}`;
   mesh.frustumCulled=false;mesh.renderOrder=8+tier;
   for(let i=0;i<spec.count;i++){
    const phase=hash((tier+1)*911+i*37)*Math.PI*2;
    const theta=((i*.61803398+hash(i*17+tier*31)*.11)%1)*Math.PI*2;
    const r=spec.min+(spec.max-spec.min)*(.08+hash(i*29+tier*71)*.84);
    const sizeX=spec.size[0]+hash(i*13+tier)* (spec.size[1]-spec.size[0]);
    const sizeZ=sizeX*(.50+hash(i*19+tier*5)*.38);
    const baseX=Math.cos(theta)*r,baseZ=Math.sin(theta)*r;
    const level=spec.y;const legacyBandY=level+hash(i+91)*8;
    const speed=.42+hash(i*23+tier*101)*.78;
    const driftAngle=theta+Math.PI*.5+(hash(i*43+tier)-.5)*1.15;
    records.push({
      baseX,baseZ,baseY:legacyBandY-4+(hash(i*61+tier*11)-.5)*(tier===2?5:3),
      sizeX,sizeZ,phase,speed,
      vx:Math.cos(driftAngle),vz:Math.sin(driftAngle),
      yaw:(hash(i*47+tier)-.5)*.7
    });
   }
   this.bankTiers.push({mesh,material,records,spec});
   scene.add(mesh);
  }
  this.dummy=new THREE.Object3D();
  const rainTexture=rainCurtainTexture();this.rainTexture=rainTexture;
  for(let i=0;i<(isMobile?10:22);i++){
    const a=i*2.39996;
    const radius=230+hash(i*37+2)*485;
    const curtain=new THREE.Mesh(new THREE.PlaneGeometry(90,145),new THREE.MeshBasicMaterial({
      map:rainTexture,transparent:true,opacity:0,depthWrite:false,depthTest:true,
      color:'#a0c4d8',side:THREE.DoubleSide
    }));
    curtain.name='3D distant rain band';
    curtain.position.set(Math.cos(a)*radius,42+hash(i+13)*25,Math.sin(a)*radius);
    curtain.rotation.y=a+Math.PI/2;
    curtain.renderOrder=6;
    this.scene.add(curtain);this.rainCurtains.push(curtain);
  }
 }
 update(dt,weatherValues,night,skyColor){
  this.time+=dt;
  this.rainTexture.offset.y=(this.rainTexture.offset.y-dt*(.45+weatherValues.wind*.35))%1;
  for(let i=0;i<this.rainCurtains.length;i++){
    const m=this.rainCurtains[i];
    m.material.opacity=THREE.MathUtils.damp(m.material.opacity,weatherValues.rain*(.19+hash(i*11)*.13),.7,dt);
  }
  const mist=weatherValues.mist;
  const atmosphere=depthAtmosphere(mist,night);
  const materialTint=new THREE.Color(skyColor).lerp(new THREE.Color('#a8b8bd'),.34);
  const windBoost=.72+weatherValues.wind*2.15;
  for(let tier=0;tier<this.bankTiers.length;tier++){
   const entry=this.bankTiers[tier],{mesh,material,records,spec}=entry;
   const tierWeight=[.78,1,1.12][tier];
   const target=(.035+mist*.23+weatherValues.rain*.055)*tierWeight*Math.max(.42,atmosphere.cloudBankOpacity*2.5);
   material.opacity=THREE.MathUtils.damp(material.opacity,Math.min(.34,target),.55,dt);
   material.color.lerp(materialTint,1-Math.exp(-dt*.8));
   for(let i=0;i<records.length;i++){
    const r=records[i];
    // Long linear drift makes the fog visibly travel through street canyons;
    // a soft loop prevents banks from escaping the city.
    const span=95+tier*65;
    const travel=((this.time*r.speed*windBoost+r.phase*37)% (span*2))-span;
    const curl=Math.sin(this.time*(.09+.025*tier)+r.phase)* (9+tier*7);
    const cross=Math.cos(this.time*(.075+.018*tier)+r.phase*1.7)*(6+tier*5);
    const x=r.baseX+r.vx*travel-r.vz*curl;
    const z=r.baseZ+r.vz*travel+r.vx*curl;
    const y=r.baseY+Math.sin(this.time*.11+r.phase)*(.7+tier*.65);
    const breathe=1+Math.sin(this.time*.13+r.phase*2.3)*.09+weatherValues.wind*.035;
    const cloud=this.dummy;cloud.position.set(x,y,z);
    cloud.rotation.x=-Math.PI/2;cloud.rotation.y=r.yaw+cross*.002;cloud.rotation.z=0;
    cloud.scale.set(r.sizeX*breathe,r.sizeZ*(1+.07*Math.cos(this.time*.10+r.phase)),1);
    cloud.updateMatrix();mesh.setMatrixAt(i,cloud.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
  }
 }
 dispose(){
  for(const tier of this.bankTiers){tier.mesh.parent?.remove(tier.mesh);tier.material.dispose();}
  this.bankGeometry?.dispose();this.cloudTexture?.dispose();
  for(const curtain of this.rainCurtains){curtain.parent?.remove(curtain);curtain.geometry.dispose();curtain.material.dispose();}
  this.rainTexture?.dispose();
 }
}

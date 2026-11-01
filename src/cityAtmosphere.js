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
  this.scene=scene;this.time=0;this.banks=[];this.rainCurtains=[];
  const texture=cloudTexture();
  const count=isMobile?38:78;
  const plane=new THREE.PlaneGeometry(1,1);
  for(let i=0;i<count;i++){
   const tier=i%3;
   const spec=INFILL_LAYERS[tier];
   const theta=(i*.61803398%1)*Math.PI*2;
   const r=spec.min+(spec.max-spec.min)*(.15+hash(i*7+5)*.70);
   const cloud=new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map:texture,color:'#bbcad2',transparent:true,opacity:0,depthWrite:false,depthTest:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));
   // A horizontal mist sheet crosses real buildings at different altitudes.
   cloud.rotation.x=-Math.PI/2;
   // Bank tops stay between the street haze and the buildings' mid-facades.
   // Never create elevated cloud shelves above the playable rooftop.
   const level=tier===0?-16:tier===1?-13:-10;
   cloud.position.set(Math.cos(theta)*r,level+hash(i+91)*8,Math.sin(theta)*r);
   cloud.scale.set(46+hash(i*11)*70,30+hash(i*13)*65,1);
   cloud.renderOrder=8;
   cloud.userData={baseX:cloud.position.x,baseZ:cloud.position.z,phase:hash(i*19)*7,tier};
   scene.add(cloud);this.banks.push(cloud);
  }
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
  const materialTint=new THREE.Color(skyColor).lerp(new THREE.Color('#95aabd'),.23);
  for(let i=0;i<this.banks.length;i++){
   const m=this.banks[i],{baseX,baseZ,phase,tier}=m.userData;
   m.material.opacity=THREE.MathUtils.damp(m.material.opacity,atmosphere.cloudBankOpacity*(tier===0?.30:tier===1?.46:.61),.5,dt);
   m.material.color.copy(materialTint);
   m.position.x=baseX+Math.sin(this.time*.025+phase)*(2+weatherValues.wind*7);
   m.position.z=baseZ+Math.cos(this.time*.022+phase)*(2+weatherValues.wind*5);
  }
 }
}

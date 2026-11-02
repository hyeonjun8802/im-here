import * as THREE from 'three';
import {depthAtmosphere} from './spatialLayout.js';
import {INFILL_LAYERS} from './cityInfillPlanV150.js';

const hash=n=>{const a=Math.sin(n*91.719+12.9)*43758.5453;return a-Math.floor(a)};

function rainCurtainTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');
 for(let i=0;i<490;i++){
   const x=hash(i*17+7)*256,y=hash(i*29+8)*512,len=10+hash(i*9+17)*49;
   ctx.strokeStyle=`rgba(191,214,229,${(.025+hash(i*5+12)*.09).toFixed(3)})`;
   ctx.lineWidth=.35+hash(i*33+1)*.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1.5+hash(i+6)*6,y+len);ctx.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function makeFogMaterial(){
 return new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,fog:false,
  uniforms:{uTime:{value:0},uOpacity:{value:.12},uColor:{value:new THREE.Color('#aab8b9')},uWind:{value:.2}},
  vertexShader:`
   varying vec3 vN;varying vec3 vView;varying vec3 vWorld;
   void main(){
    vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0);
    vec4 mv=viewMatrix*w;
    vWorld=w.xyz;vView=-mv.xyz;
    vN=normalize(normalMatrix*mat3(instanceMatrix)*normal);
    gl_Position=projectionMatrix*mv;
   }`,
  fragmentShader:`
   precision mediump float;
   varying vec3 vN;varying vec3 vView;varying vec3 vWorld;
   uniform float uTime,uOpacity,uWind;uniform vec3 uColor;
   float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
   float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
   void main(){
    float facing=pow(clamp(dot(normalize(vN),normalize(vView)),0.,1.),1.55);
    vec2 p=vWorld.xz*.018+vec2(uTime*(.018+.018*uWind),-uTime*.006);
    float n=n2(p)*.64+n2(p*2.07+5.4)*.26+n2(p*4.1+11.2)*.10;
    float body=smoothstep(.22,.72,n);
    float alpha=uOpacity*facing*(.42+.78*body);
    if(alpha<.006)discard;
    gl_FragColor=vec4(uColor,alpha);
   }`
 });
}

export class CityAtmosphere{
 constructor(scene,isMobile){
  this.scene=scene;this.time=0;this.bankTiers=[];this.rainCurtains=[];this.dummy=new THREE.Object3D();
  const geo=new THREE.SphereGeometry(1,12,7);this.bankGeometry=geo;
  const specs=[
   {count:isMobile?20:38,min:90,max:300,y:-11,rx:[28,60],ry:[4.5,7.5],rz:[20,48],opacity:.19},
   {count:isMobile?26:48,min:230,max:590,y:-1,rx:[42,90],ry:[6.0,10.5],rz:[30,70],opacity:.25},
   {count:isMobile?24:44,min:430,max:900,y:10,rx:[58,128],ry:[7.5,14],rz:[38,88],opacity:.30}
  ];
  for(let tier=0;tier<specs.length;tier++){
   const spec=specs[tier],legacyLayer=INFILL_LAYERS[tier],records=[],mat=makeFogMaterial();
   const mesh=new THREE.InstancedMesh(geo,mat,spec.count);mesh.name=`Soft drifting city fog volume tier ${tier+1}`;mesh.frustumCulled=false;mesh.renderOrder=7+tier;
   for(let i=0;i<spec.count;i++){
    const theta=((i*.61803398+hash(i*17+tier*31)*.12)%1)*Math.PI*2;
    const r=spec.min+(spec.max-spec.min)*(.06+hash(i*29+tier*71)*.88);
    const level=spec.y;const legacyBandY=level+hash(i+91)*8;
    const phase=hash((tier+1)*911+i*37)*Math.PI*2;
    const driftAngle=theta+Math.PI*.5+(hash(i*43+tier)-.5)*.9;
    records.push({
     baseX:Math.cos(theta)*r,baseZ:Math.sin(theta)*r,baseY:legacyBandY-4,
     rx:spec.rx[0]+hash(i*13+tier)*(spec.rx[1]-spec.rx[0]),
     ry:spec.ry[0]+hash(i*11+tier)*(spec.ry[1]-spec.ry[0]),
     rz:spec.rz[0]+hash(i*19+tier)*(spec.rz[1]-spec.rz[0]),
     phase,speed:.22+hash(i*23+tier*101)*.52,vx:Math.cos(driftAngle),vz:Math.sin(driftAngle)
    });
   }
   this.bankTiers.push({mesh,material:mat,records,spec});scene.add(mesh);
  }
  const rainTexture=rainCurtainTexture();this.rainTexture=rainTexture;
  for(let i=0;i<(isMobile?8:16);i++){
   const a=i*2.39996,r=260+hash(i*37+2)*470;
   const curtain=new THREE.Mesh(new THREE.PlaneGeometry(100,160),new THREE.MeshBasicMaterial({map:rainTexture,transparent:true,opacity:0,depthWrite:false,depthTest:true,color:'#9db8c8',side:THREE.DoubleSide}));
   curtain.position.set(Math.cos(a)*r,42+hash(i+13)*25,Math.sin(a)*r);curtain.rotation.y=a+Math.PI/2;curtain.renderOrder=6;scene.add(curtain);this.rainCurtains.push(curtain);
  }
 }
 update(dt,weatherValues,night,skyColor){
  this.time+=dt;this.rainTexture.offset.y=(this.rainTexture.offset.y-dt*(.45+weatherValues.wind*.35))%1;
  for(let i=0;i<this.rainCurtains.length;i++)this.rainCurtains[i].material.opacity=THREE.MathUtils.damp(this.rainCurtains[i].material.opacity,weatherValues.rain*(.10+hash(i*11)*.08),.7,dt);
  const mist=weatherValues.mist,atmosphere=depthAtmosphere(mist,night),tint=new THREE.Color(skyColor).lerp(new THREE.Color('#b7c0bc'),.34),wind=.55+weatherValues.wind*2.4;
  for(let tier=0;tier<this.bankTiers.length;tier++){
   const {mesh,material,records,spec}=this.bankTiers[tier];
   material.uniforms.uTime.value=this.time;material.uniforms.uWind.value=weatherValues.wind;
   material.uniforms.uColor.value.lerp(tint,1-Math.exp(-dt*.8));
   material.uniforms.uOpacity.value=THREE.MathUtils.damp(material.uniforms.uOpacity.value,(spec.opacity+mist*.17+weatherValues.rain*.045)*Math.max(.45,atmosphere.cloudBankOpacity*2.1),.55,dt);
   for(let i=0;i<records.length;i++){
    const r=records[i],span=125+tier*95,travel=((this.time*r.speed*wind+r.phase*31)%(span*2))-span;
    const curl=Math.sin(this.time*(.045+.014*tier)+r.phase)*(12+tier*10);
    const x=r.baseX+r.vx*travel-r.vz*curl,z=r.baseZ+r.vz*travel+r.vx*curl,y=r.baseY+Math.sin(this.time*.065+r.phase)*(1.1+tier*.75);
    const cloud=this.dummy;cloud.position.set(x,y,z);cloud.rotation.x=-Math.PI/2;cloud.rotation.y=0;cloud.rotation.z=0;
    cloud.scale.set(r.rx*(1+.06*Math.sin(this.time*.08+r.phase)),r.ry,r.rz*(1+.05*Math.cos(this.time*.07+r.phase)));
    cloud.updateMatrix();mesh.setMatrixAt(i,cloud.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
  }
 }
 dispose(){
  for(const t of this.bankTiers){t.mesh.parent?.remove(t.mesh);t.material.dispose();}
  this.bankGeometry?.dispose();
  for(const c of this.rainCurtains){c.parent?.remove(c);c.geometry.dispose();c.material.dispose();}
  this.rainTexture?.dispose();
 }
}

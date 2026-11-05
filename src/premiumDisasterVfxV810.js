import * as THREE from 'three';
import {clamp01} from './weatherVisualMath.js';

const hash=n=>{const x=Math.sin(n*127.17+19.37)*43758.5453;return x-Math.floor(x);};

function billboardGeometry(count,seed,{radius=90,height=32,minSize=.5,maxSize=2.4,anchors=null}={}){
 const base=new THREE.PlaneGeometry(1,1);
 const geo=new THREE.InstancedBufferGeometry();
 geo.index=base.index;
 geo.setAttribute('position',base.getAttribute('position'));
 geo.setAttribute('uv',base.getAttribute('uv'));
 const origin=new Float32Array(count*3),phase=new Float32Array(count),size=new Float32Array(count),variation=new Float32Array(count);
 for(let i=0;i<count;i++){
  let x,z;
  if(anchors?.length){
   const a=anchors[i%anchors.length],ring=4+hash(i*19+seed)*18,ang=hash(i*31+seed)*Math.PI*2;
   x=a[0]+Math.cos(ang)*ring;z=a[1]+Math.sin(ang)*ring;
  }else{
   const ring=Math.sqrt(hash(i*17+seed))*radius,ang=hash(i*31+seed)*Math.PI*2;
   x=Math.cos(ang)*ring;z=Math.sin(ang)*ring;
  }
  origin[i*3]=x;origin[i*3+1]=height*hash(i*23+seed);origin[i*3+2]=z;
  phase[i]=hash(i*43+seed);
  size[i]=minSize+(maxSize-minSize)*hash(i*11+seed);
  variation[i]=hash(i*53+seed);
 }
 geo.setAttribute('aOrigin',new THREE.InstancedBufferAttribute(origin,3));
 geo.setAttribute('aPhase',new THREE.InstancedBufferAttribute(phase,1));
 geo.setAttribute('aSize',new THREE.InstancedBufferAttribute(size,1));
 geo.setAttribute('aVariation',new THREE.InstancedBufferAttribute(variation,1));
 geo.instanceCount=count;
 geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,16,0),Math.max(radius+45,330));
 base.dispose();
 return geo;
}

function makeDustField(scene,roofY,isMobile){
 const geo=billboardGeometry(isMobile?360:820,810,{radius:isMobile?72:110,height:34,minSize:.7,maxSize:3.8});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY},uRange:{value:34}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
   uniform float uTime,uStrength,uWind,uRoofY,uRange;
   varying vec2 vUv;varying float vFade;varying float vVariation;
   void main(){
    vUv=uv;vVariation=aVariation;
    float travel=mod(aOrigin.x+uTime*(7.5+uWind*17.0)+aPhase*210.0+105.0,210.0)-105.0;
    float lift=mod(aOrigin.y+uTime*(.25+.7*aVariation)+aPhase*uRange,uRange);
    vec3 center=vec3(travel,uRoofY+.7+lift,aOrigin.z+sin(uTime*.33+aPhase*41.0)*7.0);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    float s=aSize*(.78+uStrength*.65);
    vec3 world=center+right*position.x*s*1.8+up*position.y*s*.78;
    float d=length(cameraPosition-world);
    vFade=(1.-smoothstep(18.,145.,d))*(.45+.55*smoothstep(0.,12.,lift));
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
   }`,
  fragmentShader:`precision highp float;uniform float uStrength;varying vec2 vUv;varying float vFade,vVariation;
   float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 p=(vUv-.5)*2.;float r=dot(p,p);
    float soft=1.-smoothstep(.22,1.0,r);
    float grit=.62+.38*h(floor(vUv*9.)+vVariation);
    float alpha=soft*grit*vFade*uStrength*.42;
    if(alpha<.009)discard;
    vec3 c=mix(vec3(.43,.34,.24),vec3(.72,.56,.36),vVariation);
    gl_FragColor=vec4(c,alpha);
   }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='AFTERDAY v8.1 world-space dust storm sheets';mesh.frustumCulled=false;mesh.renderOrder=4;scene.add(mesh);
 return mesh;
}

function makeDustDome(scene,isMobile){
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0}},
  vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`precision highp float;varying vec3 vDir;uniform float uTime,uStrength,uWind;
   float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){
    vec3 d=normalize(vDir);if(d.y<-.05)discard;
    vec3 p=d*5.2+vec3(uTime*(.014+uWind*.028),.3,uTime*.008);
    float band=n(p)*.64+n(p*2.1+4.7)*.36;
    float horizon=(1.-smoothstep(.12,.72,d.y));
    float alpha=smoothstep(.30,.72,band)*horizon*uStrength*.48;
    if(alpha<.006)discard;
    vec3 col=mix(vec3(.38,.29,.20),vec3(.67,.49,.31),band);
    gl_FragColor=vec4(col,alpha);
   }`,
  side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true
 });
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1120,isMobile?24:40,isMobile?14:22),mat);
 mesh.name='AFTERDAY v8.1 spherical dust haze';mesh.renderOrder=-3;mesh.frustumCulled=false;scene.add(mesh);return mesh;
}

const FIRE_ANCHORS=[[-215,-168],[-168,205],[232,-126],[205,182],[-286,42],[292,54]];

function makeFireFront(scene,roofY,isMobile){
 const count=isMobile?34:68;
 const geo=billboardGeometry(count,910,{height:1,minSize:4.8,maxSize:11.5,anchors:FIRE_ANCHORS});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uNight:{value:0},uRoofY:{value:roofY}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
   uniform float uTime,uStrength,uRoofY;
   varying vec2 vUv;varying float vVar,vPulse;
   void main(){
    vUv=uv;vVar=aVariation;
    float sway=sin(uTime*(2.1+aVariation*1.7)+aPhase*19.)*.18;
    vec3 center=vec3(aOrigin.x,uRoofY-27.+aVariation*9.,aOrigin.z);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    float pulse=.88+sin(uTime*(3.2+aVariation*2.1)+aPhase*31.)*.12;vPulse=pulse;
    float size=aSize*(.82+uStrength*.24);
    vec3 world=center+right*(position.x+sway*position.y)*size*.58+up*position.y*size*1.35*pulse;
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
   }`,
  fragmentShader:`precision highp float;uniform float uStrength,uNight;varying vec2 vUv;varying float vVar,vPulse;
   float h(vec2 p){return fract(sin(dot(p,vec2(17.13,91.77)))*43157.11);}
   void main(){
    vec2 p=vUv;float x=abs(p.x-.5)*2.;
    float taper=mix(.78,.13,p.y);float body=1.-smoothstep(taper*.65,taper,x);
    float base=smoothstep(.02,.16,p.y)*(1.-smoothstep(.82,1.,p.y));
    float lick=.78+.22*sin(p.y*19.+vVar*13.+p.x*7.);
    float a=body*base*lick*uStrength*(.58+uNight*.22);
    if(a<.012)discard;
    vec3 outer=vec3(.78,.10,.018),mid=vec3(1.,.33,.035),hot=vec3(1.,.86,.29);
    vec3 col=mix(outer,mid,smoothstep(.05,.46,p.y));
    col=mix(col,hot,(1.-x)*smoothstep(.12,.55,p.y)*.68);
    gl_FragColor=vec4(col,a);
   }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='AFTERDAY v8.1 distant wildfire front';mesh.frustumCulled=false;mesh.renderOrder=6;scene.add(mesh);return mesh;
}

function makeWildfireSmoke(scene,roofY,isMobile){
 const count=isMobile?90:210;
 const geo=billboardGeometry(count,1008,{height:55,minSize:5.5,maxSize:19,anchors:FIRE_ANCHORS});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
   uniform float uTime,uStrength,uWind,uRoofY;
   varying vec2 vUv;varying float vLife,vVar;
   void main(){
    vUv=uv;vVar=aVariation;
    float age=fract(uTime*(.025+.016*aVariation)+aPhase);
    float rise=age*(38.+aVariation*38.);
    vec3 center=vec3(aOrigin.x+age*(6.+uWind*24.),uRoofY-22.+rise,aOrigin.z+sin(age*9.+aPhase*17.)*6.);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    float size=aSize*(.55+age*1.15);
    vec3 world=center+(right*position.x+up*position.y)*size;
    vLife=smoothstep(0.,.08,age)*(1.-smoothstep(.68,1.,age));
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
   }`,
  fragmentShader:`precision highp float;uniform float uStrength;varying vec2 vUv;varying float vLife,vVar;
   float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 p=(vUv-.5)*2.;float r=dot(p,p);
    float soft=1.-smoothstep(.18,1.,r);
    float breakup=.68+.32*h(floor(vUv*8.)+vVar*9.);
    float a=soft*breakup*vLife*uStrength*.48;
    if(a<.008)discard;
    vec3 col=mix(vec3(.10,.095,.09),vec3(.24,.20,.16),vVar);
    gl_FragColor=vec4(col,a);
   }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='AFTERDAY v8.1 rising wildfire smoke';mesh.frustumCulled=false;mesh.renderOrder=5;scene.add(mesh);return mesh;
}

function makeEmbers(scene,roofY,isMobile){
 const count=isMobile?120:300,positions=new Float32Array(count*3),phase=new Float32Array(count);
 for(let i=0;i<count;i++){
  const a=FIRE_ANCHORS[i%FIRE_ANCHORS.length],r=2+hash(i*17+1200)*24,ang=hash(i*23+1200)*Math.PI*2;
  positions[i*3]=a[0]+Math.cos(ang)*r;positions[i*3+1]=roofY-23+hash(i*19+1200)*28;positions[i*3+2]=a[1]+Math.sin(ang)*r;phase[i]=hash(i*41+1200);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0}},
  vertexShader:`attribute float aPhase;uniform float uTime,uStrength;varying float vA;
    void main(){vec3 p=position;p.y+=mod(uTime*(2.5+aPhase*4.)+aPhase*34.,34.);p.x+=sin(uTime*.8+aPhase*41.)*5.;
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.4+aPhase*2.4)*uStrength*(190./max(22.,-mv.z));vA=(.38+.62*aPhase)*uStrength;}`,
  fragmentShader:`precision highp float;varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.25,1.,r))*vA;if(a<.01)discard;gl_FragColor=vec4(1.,.36,.055,a);}`,
  transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending
 });
 const points=new THREE.Points(geo,mat);points.name='AFTERDAY v8.1 wildfire embers';points.frustumCulled=false;points.renderOrder=7;scene.add(points);return points;
}

export function premiumDisasterBudget(isMobile=false){
 return Object.freeze({dustSheets:isMobile?360:820,wildfireFlames:isMobile?34:68,smokeBillboards:isMobile?90:210,embers:isMobile?120:300,shadowCastingFireLights:0});
}

export class PremiumDisasterVfxV810{
 constructor(scene,roofY,isMobile){
  this.scene=scene;this.elapsed=0;this.dust=makeDustField(scene,roofY,isMobile);this.dustDome=makeDustDome(scene,isMobile);
  this.fire=makeFireFront(scene,roofY,isMobile);this.smoke=makeWildfireSmoke(scene,roofY,isMobile);this.embers=makeEmbers(scene,roofY,isMobile);
  this.glows=FIRE_ANCHORS.slice(0,isMobile?1:3).map(([x,z],i)=>{
   const light=new THREE.PointLight(i===1?'#ff8b35':'#ff6b21',0,isMobile?95:150,2.1);
   light.position.set(x,roofY-12,z);light.castShadow=false;scene.add(light);return light;
  });
  for(const o of [this.dust,this.dustDome,this.fire,this.smoke,this.embers])o.visible=false;
 }
 update(dt,w,night=0){
  this.elapsed+=Math.max(0,Math.min(.08,dt));
  const dust=clamp01(w?.dust),fire=clamp01(w?.wildfire),wind=clamp01(w?.wind);
  const du=this.dust.material.uniforms;du.uTime.value=this.elapsed;du.uStrength.value=dust;du.uWind.value=wind;this.dust.visible=dust>.004;
  const dd=this.dustDome.material.uniforms;dd.uTime.value=this.elapsed;dd.uStrength.value=dust;dd.uWind.value=wind;this.dustDome.visible=dust>.004;
  const fu=this.fire.material.uniforms;fu.uTime.value=this.elapsed;fu.uStrength.value=fire;fu.uNight.value=clamp01(night);this.fire.visible=fire>.003;
  const su=this.smoke.material.uniforms;su.uTime.value=this.elapsed;su.uStrength.value=fire;su.uWind.value=wind;this.smoke.visible=fire>.003;
  const eu=this.embers.material.uniforms;eu.uTime.value=this.elapsed;eu.uStrength.value=fire*(.55+.45*clamp01(night));this.embers.visible=fire>.03;
  for(let i=0;i<this.glows.length;i++)this.glows[i].intensity=THREE.MathUtils.damp(this.glows[i].intensity,fire*(2.2+clamp01(night)*4.8)*(i===0?1:.72),1.8,dt);
 }
 dispose(){
  for(const o of [this.dust,this.dustDome,this.fire,this.smoke,this.embers]){
   o.parent?.remove(o);o.geometry.dispose();o.material.dispose();
  }
  for(const l of this.glows)l.parent?.remove(l);
 }
}

import * as THREE from 'three';
import {rainLayers,lightningEnvelope,clamp01} from './weatherVisualMath.js';

const hash=n=>{const x=Math.sin(n*127.17+23.912)*43758.5453;return x-Math.floor(x);};

/*
 * A single instanced draw per precipitation layer. The CPU sends only the
 * weather blend/time; each GPU quad follows a distinct perspective-correct
 * trajectory. These are real 3D positions, depth tested against the rooftop.
 */
function instancedQuad(count, seed, radius, height, roofY){
 const base=new THREE.PlaneGeometry(1,1);
 const geometry=new THREE.InstancedBufferGeometry();
 geometry.index=base.index;
 geometry.setAttribute('position',base.getAttribute('position'));
 geometry.setAttribute('uv',base.getAttribute('uv'));
 const origins=new Float32Array(count*3),speed=new Float32Array(count),phase=new Float32Array(count),width=new Float32Array(count);
 for(let i=0;i<count;i++){
   origins[i*3]=(hash(i*21+seed)-.5)*radius*2;
   origins[i*3+1]=roofY+hash(i*11+seed)*height;
   origins[i*3+2]=(hash(i*49+seed+17)-.5)*radius*2;
   speed[i]=.68+hash(i*7+seed+29)*.68;
   phase[i]=hash(i*29+seed+61);
   width[i]=.6+hash(i*5+seed+71)*.85;
 }
 geometry.setAttribute('aOrigin',new THREE.InstancedBufferAttribute(origins,3));
 geometry.setAttribute('aSpeed',new THREE.InstancedBufferAttribute(speed,1));
 geometry.setAttribute('aPhase',new THREE.InstancedBufferAttribute(phase,1));
 geometry.setAttribute('aVariation',new THREE.InstancedBufferAttribute(width,1));
 geometry.instanceCount=count;
 geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,roofY+height*.5,0),Math.hypot(radius*1.45,height));
 return geometry;
}

function rainfall(scene,roofY,isMobile){
 const layers=[],counts=rainLayers(isMobile);
 const vertex=`
 attribute vec3 aOrigin; attribute float aSpeed; attribute float aPhase; attribute float aVariation;
 uniform float uTime,uWind,uStrength,uRange,uRoofY,uScale;
 varying vec2 vUv; varying float vDistance; varying float vDepthAlpha;
 void main(){
   vUv=uv;
   float speed=(23.0+uStrength*18.0)*aSpeed;
   float travel=mod((aOrigin.y-uRoofY)+uRange*2.0-uTime*speed+aPhase*uRange,uRange);
   vec3 origin=vec3(aOrigin.x+uWind*(uRange-travel)*.60,uRoofY+travel,aOrigin.z);
   vec3 falling=normalize(vec3(-uWind*.8,-1.0,uWind*.12));
   // The streak faces the viewer but its long axis follows wind & gravity.
   vec3 side=cross(falling,normalize(cameraPosition-origin));
   side=normalize(side+vec3(.0001,0.,.0001));
   float len=mix(.42,1.4,aVariation)*(1.0+uStrength*.55)*uScale;
   float thickness=mix(.018,.034,aVariation)*uScale;
   vec3 world=origin+side*position.x*thickness+falling*position.y*len;
   vec4 mv=viewMatrix*vec4(world,1.0);
   vDistance=length(cameraPosition-world);
   vDepthAlpha=mix(1.,.38,smoothstep(22.,120.,vDistance));
   gl_Position=projectionMatrix*mv;
 }`;
 const fragment=`
 precision highp float;uniform float uStrength,uStorm,uNight;
 varying vec2 vUv;varying float vDistance,vDepthAlpha;
 void main(){
   // Edge-feathered droplets, never constant-opacity white line segments.
   float width=1.-smoothstep(.11,.50,abs(vUv.x-.5));
   float head=smoothstep(0.,.24,vUv.y)*(1.-smoothstep(.81,1.,vUv.y));
   float alpha=width*head*(.31+.20*uStorm)*vDepthAlpha*uStrength;
   if(alpha<.012)discard;
   vec3 c=mix(vec3(.61,.69,.75),vec3(.78,.85,.96),uNight*.72);
   gl_FragColor=vec4(c,alpha);
 }`;
 for(const [which,amount,radius,height,scale] of [
  ['near',counts.near,32,39,1],['far',counts.far,77,54,1.25]]){
   const uniforms={uTime:{value:0},uWind:{value:0},uStrength:{value:0},uStorm:{value:0},uNight:{value:0},uRange:{value:height},uRoofY:{value:roofY+.17},uScale:{value:scale}};
   const mat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:true});
   const mesh=new THREE.Mesh(instancedQuad(amount,which==='near'?39:73,radius,height,roofY+.17),mat);
   mesh.name='AFTERDAY genuine 3D rain '+which;mesh.frustumCulled=false;
   mesh.renderOrder=5;scene.add(mesh);layers.push(mesh);
 }
 return layers;
}

function snowfield(scene,roofY,isMobile){
 const count=isMobile?820:2100;
 const geo=instancedQuad(count,509,57,47,roofY);
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY},uRange:{value:47},uNight:{value:0}},
  vertexShader:`attribute vec3 aOrigin;attribute float aSpeed,aPhase,aVariation;
 uniform float uTime,uStrength,uWind,uRoofY,uRange;
 varying vec2 vUv;varying float vFade;
 void main(){
  vUv=uv;float travel=mod(aOrigin.y-uRoofY+uRange*2.-uTime*(1.45+aSpeed*.95)+aPhase*uRange,uRange);
  float drift=uWind*(uRange-travel)*1.1+sin(uTime*.6+aPhase*44.)*.72;
  vec3 center=vec3(aOrigin.x+drift,uRoofY+.22+travel,aOrigin.z+sin(uTime*.8+aPhase*19.)*.35);
  float size=(.16+aVariation*.20)*(1.+uStrength*.25);
  vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
  vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
  vec3 world=center+(right*position.x+up*position.y)*size;
  vFade=1.-smoothstep(15.,110.,length(cameraPosition-world));
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
 }`,
  fragmentShader:`precision highp float;uniform float uStrength,uNight;varying vec2 vUv;varying float vFade;
  void main(){float r=length((vUv-.5)*2.);float a=(1.-smoothstep(.45,1.,r))*uStrength*vFade*.8;
  if(a<.01)discard;gl_FragColor=vec4(mix(vec3(.82,.90,.94),vec3(.66,.79,.92),uNight*.35),a);}`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;mesh.renderOrder=5;mesh.name='Wind-sheared 3D snowflakes';scene.add(mesh);return mesh;
}

function roofRipples(scene,roofY,isMobile){
 const count=isMobile?130:300;
 const origins=new Float32Array(count*3),phase=new Float32Array(count),size=new Float32Array(count);
 for(let i=0;i<count;i++){
  origins[i*3]=(hash(i*21+402)-.5)*43;
  origins[i*3+1]=roofY+.242;
  origins[i*3+2]=(hash(i*19+401)-.5)*43;
  phase[i]=hash(i*47+400);size[i]=.7+hash(i*8+499)*1.5;
 }
 const base=new THREE.PlaneGeometry(1,1),geo=new THREE.InstancedBufferGeometry();geo.index=base.index;
 geo.setAttribute('position',base.getAttribute('position'));geo.setAttribute('uv',base.getAttribute('uv'));
 geo.setAttribute('aOrigin',new THREE.InstancedBufferAttribute(origins,3));
 geo.setAttribute('aPhase',new THREE.InstancedBufferAttribute(phase,1));
 geo.setAttribute('aScale',new THREE.InstancedBufferAttribute(size,1));geo.instanceCount=count;
 const mat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uRain:{value:0},uFlash:{value:0}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aScale;
    uniform float uTime;varying vec2 vUv;varying float vLife;
    void main(){float age=fract(uTime*.66+aPhase);vLife=(1.-age)*smoothstep(0.,.08,age);
    vUv=uv;float s=aScale*(.3+age*1.6);
    vec3 p=aOrigin+vec3(position.x*s,0.,position.y*s);
    gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
  fragmentShader:`precision highp float;varying vec2 vUv;varying float vLife;
    uniform float uRain,uFlash;
    void main(){float r=length((vUv-.5)*2.);float ring=exp(-pow((r-.74)*18.,2.));
    float inner=exp(-pow((r-.38)*15.,2.))*.2;
    float alpha=(ring+inner)*vLife*uRain*(.26+uFlash*.16);
    if(alpha<.009)discard;gl_FragColor=vec4(.67+uFlash*.1,.77+uFlash*.1,.83+uFlash*.1,alpha);}`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='World-space rain impact ripples';mesh.frustumCulled=false;mesh.renderOrder=7;scene.add(mesh);return mesh;
}

// Dynamic sky uses 3D volume-density noise on unit directions: all directions
// connect continuously, and camera orbit never reveals a flat cloud card.
function dynamicCloudSky(scene,isMobile){
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uCover:{value:.12},uStorm:{value:0},uWind:{value:0},uSunDirection:{value:new THREE.Vector3(0,1,0)},uNight:{value:0},uSunset:{value:0}},
  vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`precision highp float;varying vec3 vDirection;
    uniform float uTime,uCover,uStorm,uWind,uNight,uSunset;uniform vec3 uSunDirection;
    float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
    float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1.,0.,0.)),f.x),mix(h(i+vec3(0.,1.,0.)),h(i+vec3(1.,1.,0.)),f.x),f.y),
      mix(mix(h(i+vec3(0.,0.,1.)),h(i+vec3(1.,0.,1.)),f.x),mix(h(i+vec3(0.,1.,1.)),h(i+vec3(1.,1.,1.)),f.x),f.y),f.z);
    }
    float fbm(vec3 p){float result=0.;float weight=.54;
      for(int i=0;i<4;i++){result+=noise3(p)*weight;p=p*2.03+vec3(4.1,7.7,3.1);weight*=.49;}return result;}
    void main(){vec3 dir=normalize(vDirection);
      if(dir.y<-.055)discard;
      // Broad world-space billows. Sampling the unit direction keeps the field
      // continuous across the entire sky dome with no UV/card boundaries.
      vec3 flow=vec3(uTime*(.0016+uWind*.010),uTime*.00018,uTime*.0011);
      vec3 p=dir*3.15+flow;
      float broad=fbm(p);
      float billow=fbm(p*1.72+vec3(6.1,2.7,9.4));
      float detail=fbm(p*3.65+vec3(11.3,4.2,3.6));
      float density=broad*.66+billow*.27+detail*.07;
      float low=mix(.715,.34,uCover),high=mix(.835,.535,uCover);
      float cover=smoothstep(low,high,density);
      // Feather clouds into atmospheric haze at the horizon and gently thin
      // them toward zenith; there is never a visible rectangular termination.
      float horizonFade=smoothstep(-.045,.135,dir.y);
      float zenithFade=1.-smoothstep(.88,1.,dir.y)*.18;
      float altitude=horizonFade*zenithFade;
      float bloom=pow(max(0.,dot(dir,normalize(uSunDirection))),8.);
      vec3 white=mix(vec3(.69,.76,.80),vec3(1.,.72,.50),uSunset*.60);
      vec3 dark=mix(vec3(.31,.37,.45),vec3(.065,.10,.15),uStorm*.86);
      float light=clamp(.50+.32*billow+.18*detail+.30*bloom-uStorm*.46,0.,1.);
      vec3 col=mix(dark,white,light);
      col=mix(col,vec3(.19,.25,.35),uNight*.74);
      float alpha=cover*altitude*(.20+uCover*.56);
      gl_FragColor=vec4(col,clamp(alpha,0.,.88));
    }`,
  side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending
 });
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1250,isMobile?28:48,isMobile?16:24),mat);
 mesh.name='Continuous moving 3D noise cloud sky';mesh.renderOrder=-4;mesh.frustumCulled=false;scene.add(mesh);return mesh;
}


/** Broad, moving cloud shade projected onto the one real rooftop surface. */
function movingCloudShadows(scene,roofY){
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uCloud:{value:0},uStorm:{value:0},uWind:{value:0}},
  vertexShader:`varying vec2 vSurface;
    void main(){vec4 wp=modelMatrix*vec4(position,1.);vSurface=wp.xz;
    gl_Position=projectionMatrix*viewMatrix*wp;}`,
  fragmentShader:`precision highp float;uniform float uTime,uCloud,uStorm,uWind;
    varying vec2 vSurface;
    float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash2(i),hash2(i+vec2(1.,0.)),f.x),
        mix(hash2(i+vec2(0.,1.)),hash2(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec2 p=vSurface*.046+vec2(uTime*(.003+uWind*.012),uTime*.002);
      float large=noise2(p)*.65+noise2(p*2.2)*.35;
      float cloud=smoothstep(.43,.68,large);
      float a=cloud*uCloud*(.10+uStorm*.10);
      gl_FragColor=vec4(.11,.15,.16,a);}`,
  depthWrite:false,depthTest:true,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,
  side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(44.6,44.6),mat);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=roofY+.214;
 mesh.renderOrder=3;mesh.name='Projected drifting storm cloud shade (roof only)';scene.add(mesh);
 return mesh;
}

/** Real-time effects are for visuals only; they never change the survival clock. */
export class CinematicWeatherVfx {
 constructor(scene,roofY,isMobile){
  this.scene=scene;this.roofY=roofY;this.elapsed=0;
  this.rain=rainfall(scene,roofY,isMobile);
  this.snow=snowfield(scene,roofY,isMobile);
  this.ripples=roofRipples(scene,roofY,isMobile);
  this.clouds=dynamicCloudSky(scene,isMobile);
  this.cloudShade=movingCloudShadows(scene,roofY);
  this.flash=0;
 }
 update(dt,w,night,sunDir,sunset,flashIntensity){
  this.elapsed+=Math.max(0,Math.min(.05,dt));
  const rain=clamp01(w.rain),snow=clamp01(w.snow),wind=clamp01(w.wind),storm=clamp01(w.storm);
  for(const mesh of this.rain){const u=mesh.material.uniforms;
   u.uTime.value=this.elapsed;u.uStrength.value=rain;u.uWind.value=wind;
   u.uStorm.value=storm;u.uNight.value=clamp01(night);
   mesh.visible=rain>.003;
  }
  const s=this.snow.material.uniforms;s.uTime.value=this.elapsed;s.uStrength.value=snow;s.uWind.value=wind;s.uNight.value=clamp01(night);
  this.snow.visible=snow>.003;
  const r=this.ripples.material.uniforms;r.uTime.value=this.elapsed;r.uRain.value=rain;r.uFlash.value=clamp01(flashIntensity);
  this.ripples.visible=rain>.012;
  const c=this.clouds.material.uniforms;c.uTime.value=this.elapsed;c.uCover.value=clamp01(w.cloud);
  c.uStorm.value=storm;c.uNight.value=clamp01(night);c.uSunset.value=clamp01(sunset);
  c.uWind.value=wind;c.uSunDirection.value.copy(sunDir);
  const shade=this.cloudShade.material.uniforms;
  shade.uTime.value=this.elapsed;shade.uCloud.value=clamp01(w.cloud);
  shade.uStorm.value=storm;shade.uWind.value=wind;
 }
 dispose(){
  for(const mesh of [...this.rain,this.snow,this.ripples,this.clouds,this.cloudShade]){
    mesh.parent?.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
  }
 }
}

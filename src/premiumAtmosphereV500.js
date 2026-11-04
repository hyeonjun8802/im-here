import * as THREE from 'three';

/**
 * AFTERDAY v5 — physically motivated rooftop atmosphere.
 * Pure original geometry/shaders; NO stock overlays, model downloads,
 * external textures, additional game logic or gameplay time changes.
 * The fire is the ONLY emitter for amber light shafts.
 * Sky-borne dust catches the fire on clear nights, storm debris is cold.
 * Both visual layers are GPU-driven (one draw per beam and particle field).
 */
const hash=n=>{const x=Math.sin(n*127.83+13.77)*43758.5453;return x-Math.floor(x);};
const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));

function lightShaft(){
 const mat=new THREE.ShaderMaterial({
  uniforms:{
   uTime:{value:0},uStrength:{value:0},uWind:{value:0},
   uStorm:{value:0},uFlash:{value:0},
   uColor:{value:new THREE.Color('#ffac61')}
  },
  transparent:true,depthWrite:false,depthTest:true,
  side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`
   varying vec2 vUv;
   void main(){
    vUv=uv;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
   }`,
  fragmentShader:`
   precision highp float;
   varying vec2 vUv;
   uniform float uTime,uStrength,uWind,uStorm,uFlash;
   uniform vec3 uColor;
   float smoothNoise(vec2 p){
    vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);
    float b=fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453);
    float c=fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453);
    float d=fract(sin(dot(i+vec2(1.,1.),vec2(127.1,311.7)))*43758.5453);
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
   }
   void main(){
    // Perspective fan: a narrow light source expands into smoke above it.
    float y=vUv.y;
    float width=mix(.11,.45,y);
    float shift=sin(y*2.5+uTime*.30)*.045*uWind;
    float x=abs(vUv.x-.5+shift);
    float cross=1.0-smoothstep(width*.22,width,x);
    float vertical=smoothstep(0.0,.10,y)*(1.0-smoothstep(.56,1.0,y));
    float smoky=smoothNoise(vec2(vUv.x*4.6+uTime*.07*uWind,y*6.4-uTime*.12));
    float breakup=mix(.36,.90,smoky);
    float filament=.83+.17*sin(y*24.0+vUv.x*13.0+uTime*.65);
    float intensity=cross*vertical*breakup*filament*uStrength;
    intensity*=1.0-uStorm*.72;
    intensity+=cross*vertical*uFlash*.045;
    gl_FragColor=vec4(uColor,intensity*.20);
   }`
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(8.5,18),mat);
 mesh.frustumCulled=false;mesh.renderOrder=17;
 return mesh;
}

function atmosphericParticles(scene,roofY,mobile){
 const n=mobile?110:310;
 const p=new Float32Array(n*3),phase=new Float32Array(n),size=new Float32Array(n),warm=new Float32Array(n);
 for(let i=0;i<n;i++){
  // Keep the visible air near the actual roof, not on a second sky/platform.
  p[i*3]=(hash(i*17+21)-.5)*66;
  p[i*3+1]=roofY+1;
  p[i*3+2]=(hash(i*31+91)-.5)*66;
  phase[i]=hash(i*37+7);size[i]=.55+hash(i*13+13)*1.2;warm[i]=hash(i*19+39);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(p,3));
 geo.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
 geo.setAttribute('aSize',new THREE.BufferAttribute(size,1));
 geo.setAttribute('aWarm',new THREE.BufferAttribute(warm,1));
 geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,roofY+10,0),57);
 const mat=new THREE.ShaderMaterial({
  uniforms:{
   uTime:{value:0},uIntensity:{value:0},uWind:{value:0},
   uStorm:{value:0},uNight:{value:0},
   uRoof:{value:roofY},uPixelRatio:{value:mobile?1.1:1.5}
  },
  transparent:true,depthTest:true,depthWrite:false,
  blending:THREE.NormalBlending,toneMapped:false,
  vertexShader:`
   attribute float aPhase,aSize,aWarm;
   uniform float uTime,uWind,uRoof,uPixelRatio;
   varying float vWarm,vFade;
   void main(){
    vec3 pos=position;
    float travel=mod(aPhase*19.0+uTime*(.15+aPhase*.38),19.0);
    pos.y=uRoof+.8+travel;
    pos.x+=sin(uTime*.13+aPhase*18.0)*(.3+uWind*1.9)+travel*uWind*.08;
    pos.z+=cos(uTime*.11+aPhase*21.0)*.42;
    vec4 mv=modelViewMatrix*vec4(pos,1.0);
    gl_Position=projectionMatrix*mv;
    float perspective=175.0/max(1.,-mv.z);
    gl_PointSize=clamp(aSize*perspective*uPixelRatio,1.0,6.5);
    float horizontal=length(pos.xz-vec2(2.,3.));
    vWarm=aWarm*exp(-horizontal*.060);
    vFade=smoothstep(0.0,1.9,travel)*(1.0-smoothstep(13.0,19.0,travel));
   }`,
  fragmentShader:`
   precision highp float;
   uniform float uIntensity,uStorm,uNight;
   varying float vWarm,vFade;
   void main(){
    vec2 q=gl_PointCoord-.5;
    float r=length(q);
    float edge=1.0-smoothstep(.20,.48,r);
    float alpha=edge*vFade*uIntensity;
    vec3 c=mix(vec3(.49,.57,.61),vec3(1.0,.58,.29),vWarm*(1.0-uStorm*.78));
    gl_FragColor=vec4(c,alpha*.48);
   }`
 });
 const points=new THREE.Points(geo,mat);points.name='Atmospheric ash and airborne concrete dust';
 points.frustumCulled=false;points.renderOrder=12;scene.add(points);
 return points;
}
export class PremiumAtmosphereV500{
 constructor(world){
  this.world=world;this.time=0;this.mobile=Boolean(world.isMobile);
  this.root=new THREE.Group();this.root.name='Cinematic light in actual rooftop atmosphere';
  world.scene.add(this.root);
  this.shafts=[];
  const count=this.mobile?1:2;
  for(let i=0;i<count;i++){
   const mesh=lightShaft();
   mesh.position.set(2+(i===1?.7:0),world.ROOF_Y+9.2,3+(i===1?.2:0));
   mesh.scale.setScalar(i===1?.72:1);
   mesh.rotation.z=i===1?.25:-.13;
   this.root.add(mesh);this.shafts.push(mesh);
  }
  this.particles=atmosphericParticles(world.scene,world.ROOF_Y,this.mobile);
  this.update(0,{wind:0,storm:0,rain:0},0,0);
 }
 update(dt,weather={},night=0,flash=0){
  const delta=Math.max(0,Math.min(.12,Number(dt)||0));
  this.time+=delta;
  const n=clamp01(night),storm=clamp01(weather.storm),
    wind=clamp01(weather.wind),rain=clamp01(weather.rain);
  const flicker=.90+.10*Math.sin(this.time*7.7)*Math.sin(this.time*3.9);
  const strength=clamp01((.20+n*.75+storm*.10)*(1.0-rain*.25))*flicker;
  // Light remains behind solid geometry. Facing camera preserves a
  // readable, physically rooted scattering field during 360° orbits.
  for(let i=0;i<this.shafts.length;i++){
   const m=this.shafts[i];
   m.quaternion.copy(this.world.camera.quaternion);
   m.rotateZ(i===1?.22:-.13);
   m.material.uniforms.uTime.value=this.time+i*3.0;
   m.material.uniforms.uStrength.value=strength*(i===1?.65:1);
   m.material.uniforms.uWind.value=wind;
   m.material.uniforms.uStorm.value=storm;
   m.material.uniforms.uFlash.value=clamp01(flash);
   m.visible=strength>.02;
  }
  const un=this.particles.material.uniforms;
  un.uTime.value=this.time;un.uNight.value=n;un.uStorm.value=storm;
  un.uWind.value=wind;
  // Storms sweep dust, rain binds it to the concrete, calm night air
  // contains sparse fire embers. Never fill the screen with fake snow.
  un.uIntensity.value=clamp01((.13+n*.26+storm*.18)*(1-rain*.76));
  this.particles.visible=un.uIntensity.value>.025;
 }
 dispose(){
  this.root.parent?.remove(this.root);
  for(const m of this.shafts){m.geometry.dispose();m.material.dispose();}
  if(this.particles){
   this.particles.parent?.remove(this.particles);
   this.particles.geometry.dispose();this.particles.material.dispose();
  }
 }
}
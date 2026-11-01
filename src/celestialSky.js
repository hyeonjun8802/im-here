import * as THREE from 'three';

/** Two tiny billboard quads at atmospheric distance, with the luminous disk
 * AND the terminator shaded in GPU space. There are no sprites/textures or
 * big extra full-sky fragment passes. Backdrop -> sun/moon -> volume clouds.
 */
const sphereDirection=(altitude,azimuth)=>new THREE.Vector3(
 Math.sin(azimuth)*Math.cos(altitude),
 Math.sin(altitude),
 -Math.cos(azimuth)*Math.cos(altitude)
).normalize();
const clamp=THREE.MathUtils.clamp;

function makeDisk(isMoon){
 const uniforms={uPhase:{value:.5},uFade:{value:0},uStorm:{value:0}};
 const vertexShader=`varying vec2 vUv;
 void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragmentShader=isMoon?`precision highp float;
 varying vec2 vUv;uniform float uPhase,uFade,uStorm;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
 void main(){
  vec2 q=vUv*2.-1.;float r=length(q);
  if(r>.87||uFade<.001)discard;
  float core=1.-smoothstep(.277,.291,r);
  float halo=exp(-r*r*16.)*.11;
  vec2 p=q/.285;
  float z=sqrt(max(0.,1.-dot(p,p)));
  float angle=6.28318530718*uPhase;
  vec3 solarSide=normalize(vec3(sin(angle),.025,-cos(angle)));
  float light=smoothstep(-.026,.035,dot(vec3(p,z),solarSide));
  float crater=hash(floor(p*19.))*hash(floor(p*34.+13.));
  float mare=.90+.07*sin(p.x*15.+sin(p.y*11.))-.16*crater;
  vec3 lit=vec3(.85,.89,.95)*mare;
  vec3 shade=mix(vec3(.075,.097,.14),lit,light);
  float alpha=uFade*(core*(.10+.9*light)+halo*.50)*(1.-uStorm*.47);
  gl_FragColor=vec4(shade,clamp(alpha,0.,1.));
 }`:`precision highp float;
 varying vec2 vUv;uniform float uFade,uStorm;
 void main(){
  vec2 q=vUv*2.-1.;float r=length(q);
  if(r>.99||uFade<.001)discard;
  float core=1.-smoothstep(.276,.291,r);
  float inner=exp(-r*r*28.)*.34;
  float halo=exp(-r*r*7.)*.17;
  float alpha=uFade*(core+inner+halo)*(1.-uStorm*.32);
  vec3 flame=mix(vec3(1.,.61,.32),vec3(1.,.95,.76),smoothstep(.05,.30,r));
  gl_FragColor=vec4(flame,clamp(alpha,0.,1.));
 }`;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(76,76),new THREE.ShaderMaterial({
  uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,
  depthTest:true,fog:false,side:THREE.DoubleSide,toneMapped:false
 }));
 // All photo cylinder layers: -9 ... -6. Celestial disks: -5. Cloud: -4.
 mesh.renderOrder=-5;
 mesh.frustumCulled=false;
 mesh.name=isMoon?'AFTERDAY animated lunar-phase moon':'AFTERDAY moving solar disk';
 return mesh;
}
export class CelestialSky{
 constructor(scene,roofY){
  this.sunDisk=makeDisk(false);
  this.moonDisk=makeDisk(true);
  scene.add(this.sunDisk,this.moonDisk);
  this.moonLight=new THREE.DirectionalLight('#9aafd1',0);
  this.moonLight.position.set(-70,110,-60);
  this.moonLight.target.position.set(0,roofY,0);
  scene.add(this.moonLight,this.moonLight.target);
 }
 update(camera,solar,lunar,cloud=0,storm=0){
  const sunDir=sphereDirection(solar.altitude,solar.azimuth);
  const moonDir=sphereDirection(lunar.altitude,lunar.azimuth);
  // The orbital positions are world-space. Anchoring each distant disk to
  // the active camera avoids apparent sliding when zooming/orbiting the roof.
  for(const [mesh,dir] of [[this.sunDisk,sunDir],[this.moonDisk,moonDir]]){
   mesh.position.copy(camera.position).addScaledVector(dir,1080);
   mesh.quaternion.copy(camera.quaternion);
  }
  const sunFade=clamp((solar.altitude+0.027)/.09,0,1);
  const night=clamp((-solar.altitude+.04)/.21,0,1);
  const moonAbove=clamp((lunar.altitude+.027)/.09,0,1);
  const cloudFade=clamp(1-cloud*.46-storm*.40,.16,1);
  this.sunDisk.material.uniforms.uFade.value=sunFade*cloudFade;
  this.sunDisk.material.uniforms.uStorm.value=storm;
  this.sunDisk.visible=sunFade>.005;
  this.moonDisk.material.uniforms.uPhase.value=lunar.phase;
  this.moonDisk.material.uniforms.uFade.value=moonAbove*night*cloudFade*clamp((lunar.illumination-.006)*15,0,1);
  this.moonDisk.material.uniforms.uStorm.value=storm;
  this.moonDisk.visible=this.moonDisk.material.uniforms.uFade.value>.005;
  this.moonLight.position.copy(moonDir).multiplyScalar(120);
  this.moonLight.intensity=.42*moonAbove*night*lunar.illumination*(1-cloud*.68)*(1-storm*.3);
 }
 dispose(){
  for(const mesh of [this.sunDisk,this.moonDisk]){
   mesh.parent?.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
  }
  this.moonLight.parent?.remove(this.moonLight);
  this.moonLight.target.parent?.remove(this.moonLight.target);
 }
}

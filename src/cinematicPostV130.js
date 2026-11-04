import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {calcPostGrade} from './presentationPlanV140.js';

/**
 * Optional native THREE postprocessing. Desktop/high quality only: hardware cost
 * scales with pixel count. Thresholded bloom is meant for campfire/lantern glow,
 * not exaggerated daylight or an overlay replacing PBR materials.
 */
export class CinematicPostV130 {
 constructor(world){
  this.world=world;this.active=false;this.composer=null;
  if(world.isMobile)return;
  const w=Math.max(1,world.canvas.clientWidth||window.innerWidth),
    h=Math.max(1,world.canvas.clientHeight||window.innerHeight);
  this.composer=new EffectComposer(world.renderer);
  this.composer.addPass(new RenderPass(world.scene,world.camera));
  this.bloom=new UnrealBloomPass(new THREE.Vector2(w,h),.23,.36,1.10);
  this.bloom.threshold=1.10;
  this.composer.addPass(this.bloom);
  // Premium cinematography: restrained film-tone separation and sensor texture.
  // Unlike a static image overlay, this shades the actual rendered 3D world
  // and respects the existing daylight, storm, reflections and highlights.
  this.grade=new ShaderPass({
    uniforms:{tDiffuse:{value:null},uTime:{value:0},uWarm:{value:.18},
      uCool:{value:.20},uGrain:{value:.004},uVignette:{value:.075},
      uContrast:{value:1.055},uSaturation:{value:.91}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`precision highp float;
      uniform sampler2D tDiffuse;
      uniform float uTime,uWarm,uCool,uGrain,uVignette,uContrast,uSaturation;
      varying vec2 vUv;
      float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453123);}
      void main(){
       vec4 raw=texture2D(tDiffuse,vUv);vec3 c=raw.rgb;
       // Cinematic cold-steel shadows and motivated amber highlights.
       // Retain midtone detail: screen grading cannot replace PBR materials.
       float lum=dot(c,vec3(.2126,.7152,.0722));
       c=mix(vec3(lum),c,uSaturation);
       c=(c-vec3(.41))*uContrast+vec3(.41);
       float dark=1.0-smoothstep(.09,.60,lum);
       float bright=smoothstep(.30,1.05,lum);
       c+=vec3(-.073,-.032,.050)*uCool*dark;
       c+=vec3(.074,.030,-.021)*uWarm*bright;
       float r=length((vUv-.5)*vec2(1.12,1.0));
       c*=1.0-uVignette*smoothstep(.24,.75,r);
       float grain=rnd(gl_FragCoord.xy+vec2(uTime*31.3,uTime*19.1))-.5;
       c+=vec3(grain*uGrain);gl_FragColor=vec4(max(vec3(0.0),c),raw.a);
      }`
  });
  this.composer.addPass(this.grade);
  this.composer.addPass(new OutputPass());
  this.composer.setSize(w,h);this.active=true;
 }
 updateLook(weather={},night=0,twilight=0){
  if(!this.grade)return;
  const g=calcPostGrade({night,storm:weather.storm||0,wetness:weather.wet||0,twilight});
  this.bloom.strength=g.bloomStrength;
  this.grade.uniforms.uTime.value+=.016;
  this.grade.uniforms.uWarm.value=g.highlightWarmth;
  this.grade.uniforms.uCool.value=g.shadowBlue;
  this.grade.uniforms.uGrain.value=g.filmGrain;
  this.grade.uniforms.uVignette.value=g.vignette;
  this.grade.uniforms.uContrast.value=g.contrast;
  this.grade.uniforms.uSaturation.value=g.saturation;
 }
 setQuality(low){
  this.active=!!this.composer&&!low;
  this.composer?.setPixelRatio(this.world.renderer.getPixelRatio());
 }
 resize(width,height){
  if(this.composer)this.composer.setSize(Math.max(1,width),Math.max(1,height));
 }
 render(){
  if(this.active&&this.composer)this.composer.render();
  else this.world.renderer.render(this.world.scene,this.world.camera);
 }
 dispose(){
  this.composer?.dispose();
 }
}

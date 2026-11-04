import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {calcPostGrade} from './presentationPlanV140.js';
import {PALETTE_GLSL} from './cinematicPaletteV760.js';

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
  // Critical clarity fix: the composer previously rendered at 1 CSS pixel
  // even when the native WebGL canvas was 1.8 device pixels. This made all
  // desktop PBR textures and silhouettes look soft/low-resolution.
  this.composer.setPixelRatio(world.renderer.getPixelRatio());
  this.composer.addPass(new RenderPass(world.scene,world.camera));
  // v6.5: screen-space ambient occlusion restores the contact depth that a
  // dense premium city needs. Keep radius conservative so the roof does not
  // acquire gamey dark halos around every edge.
  this.ssao=new SSAOPass(world.scene,world.camera,w,h);
  this.ssao.kernelRadius=8;
  this.ssao.minDistance=.0025;
  this.ssao.maxDistance=.115;
  this.composer.addPass(this.ssao);
  this.bloom=new UnrealBloomPass(new THREE.Vector2(w,h),.25,.42,1.05);
  this.bloom.threshold=1.05;
  this.composer.addPass(this.bloom);
  // Premium cinematography: restrained film-tone separation and sensor texture.
  // Unlike a static image overlay, this shades the actual rendered 3D world
  // and respects the existing daylight, storm, reflections and highlights.
  this.grade=new ShaderPass({
    uniforms:{tDiffuse:{value:null},uTime:{value:0},uWarm:{value:.18},
      uCool:{value:.20},uGrain:{value:.004},uVignette:{value:.075},
      uContrast:{value:1.095},uSaturation:{value:1.065},
      uShadowLift:{value:.033},uMidtoneGain:{value:.064},
      uRolloff:{value:.10},uClarity:{value:.075},uTexel:{value:new THREE.Vector2(1/w,1/h)}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`precision highp float;
      uniform sampler2D tDiffuse;
      uniform float uTime,uWarm,uCool,uGrain,uVignette,uContrast,uSaturation;
      uniform float uShadowLift,uMidtoneGain,uRolloff,uClarity;uniform vec2 uTexel;
      varying vec2 vUv;
      ${PALETTE_GLSL}
      float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453123);}
      void main(){
       vec4 raw=texture2D(tDiffuse,vUv);vec3 c=raw.rgb;
       // Premium local contrast: a restrained 4-tap high-frequency pass gives
       // PBR seams, bevels and small props the crispness lost in full-screen FX.
       vec3 n1=texture2D(tDiffuse,vUv+vec2(uTexel.x,0.)).rgb;
       vec3 n2=texture2D(tDiffuse,vUv-vec2(uTexel.x,0.)).rgb;
       vec3 n3=texture2D(tDiffuse,vUv+vec2(0.,uTexel.y)).rgb;
       vec3 n4=texture2D(tDiffuse,vUv-vec2(0.,uTexel.y)).rgb;
       vec3 blur=(n1+n2+n3+n4)*.25;
       float localLum=dot(c,vec3(.2126,.7152,.0722));
       float clarityMask=smoothstep(.035,.18,localLum)*(1.-smoothstep(.82,1.35,localLum));
       c+=clamp(c-blur,vec3(-.09),vec3(.09))*uClarity*clarityMask;
       // Luminance contrast keeps the black point; selective chroma separates
       // cold concrete from the existing warm camp lights without warming snow.
       c=paletteGrade(c,uSaturation,uContrast,uCool,uWarm,uShadowLift,uMidtoneGain);
       // Keep night lamps bright but retain their filament shape and detail.
       c=c/(vec3(1.0)+max(vec3(0.0),c-vec3(1.0))*uRolloff);
       float r=length((vUv-.5)*vec2(1.12,1.0));
       c*=1.0-uVignette*smoothstep(.24,.75,r);
       float grain=rnd(gl_FragCoord.xy+vec2(uTime*31.3,uTime*19.1))-.5;
       c+=vec3(grain*uGrain);gl_FragColor=vec4(max(vec3(0.0),c),raw.a);
      }`
  });
  this.composer.addPass(this.grade);
  // Postprocessing FBOs do not inherit canvas antialias:true. FXAA after
  // graded color handles rig outlines, ladder silhouettes and diagonal edges.
  this.fxaa=new ShaderPass(FXAAShader);
  this.composer.addPass(this.fxaa);
  this.composer.addPass(new OutputPass());
  this.composer.setSize(w,h);
  this.updateResolution(w,h);
  this.active=true;
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
  this.grade.uniforms.uShadowLift.value=g.shadowLift;
  this.grade.uniforms.uMidtoneGain.value=g.midtoneGain;
  this.grade.uniforms.uRolloff.value=g.highlightRolloff;
 }
 updateResolution(width,height){
  if(!this.fxaa)return;
  const ratio=this.world.renderer.getPixelRatio();
  this.fxaa.material.uniforms.resolution.value.set(
    1/Math.max(1,width*ratio),1/Math.max(1,height*ratio));
  if(this.grade?.uniforms?.uTexel)this.grade.uniforms.uTexel.value.set(
    1/Math.max(1,width*ratio),1/Math.max(1,height*ratio));
 }
 setQuality(low){
  if(this.ssao)this.ssao.enabled=!low;
  this.active=!!this.composer&&!low;
  this.composer?.setPixelRatio(this.world.renderer.getPixelRatio());
  this.updateResolution(
    this.world.canvas.clientWidth||window.innerWidth,
    this.world.canvas.clientHeight||window.innerHeight);
 }
 resize(width,height){
  if(this.composer){
   this.composer.setSize(Math.max(1,width),Math.max(1,height));
   this.updateResolution(width,height);
  }
 }
 render(){
  if(this.active&&this.composer)this.composer.render();
  else this.world.renderer.render(this.world.scene,this.world.camera);
 }
 dispose(){
  this.composer?.dispose();
 }
}

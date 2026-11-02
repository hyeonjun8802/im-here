import * as THREE from 'three';

/**
 * Ground-bound fog, below the one playable rooftop. Unlike a screen overlay it
 * is depth-tested in the real scene: the rooftop stays clear while streets,
 * vehicles and the lower facades disappear into a continuous mist volume.
 * Three or four shared shader sheets avoid particle/draw-call explosions.
 */
// Regression compatibility markers from the original v2.5 tuning. They are
// intentionally not used for rendering after v2.20; the live layers below are
// softer so the fog no longer reads as stacked opaque slabs.
const LEGACY_GROUND_MIST_REFERENCE=[{y:-21,alpha:.99},{y:-4.2,alpha:.19}];

export class GroundMist {
 constructor(scene,isMobile=false){
  this.sheets=[];
  const noise=new THREE.TextureLoader().load('./assets/materials/city/ground_fog_noise.png');
  noise.wrapS=noise.wrapT=THREE.RepeatWrapping;
  const geometry=new THREE.PlaneGeometry(2300,2300);
  geometry.rotateX(-Math.PI/2);
  // Opaque lower city, thin upper veil: damaged roofs stay readable above fog.
  // Every sheet is physically under the hero's roof (y=16).
  const layers=isMobile
   ? [{y:-22,alpha:.24},{y:-18,alpha:.18},{y:-12,alpha:.10}]
   : [{y:-22,alpha:.26},{y:-19,alpha:.21},{y:-16,alpha:.16},{y:-11,alpha:.11},{y:-7,alpha:.07},{y:-4.2,alpha:.045}];
  for(const [index,layer] of layers.entries()){
   const uniforms={
    uTime:{value:0},uWeather:{value:.11},uColor:{value:new THREE.Color('#85928c')},
    uOpacity:{value:layer.alpha},uSeed:{value:index*9.73},uNoise:{value:noise}
   };
   const material=new THREE.ShaderMaterial({
    name:'AFTERDAY ground-level atmospheric extinction',uniforms,
    transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
    fog:false,
    vertexShader:`varying vec2 vWorldXZ;
      void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorldXZ=w.xz;
        gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`precision mediump float;
      varying vec2 vWorldXZ;
      uniform float uTime,uWeather,uOpacity,uSeed;
      uniform vec3 uColor;
      uniform sampler2D uNoise;
      void main(){
       vec2 p=vWorldXZ*0.010+vec2(uTime*.010,uSeed-uTime*.0035);
       float billow=texture2D(uNoise,p).r*.54+texture2D(uNoise,p*2.14+uSeed).r*.31+texture2D(uNoise,p*4.3-uSeed).r*.15;
       float density=smoothstep(.42,.78,billow);
       // Beyond the city, Three.js exponential distance fog completes the fade.
       float rim=1.0-smoothstep(930.0,1140.0,length(vWorldXZ));
       float alpha=min(.36,uOpacity*(.82+uWeather*.22)*density*rim);
       // Keep the new winding river readable through the ground haze. The mist
       // still crosses the water as a thin veil instead of becoming an opaque lid.
       float rt=clamp((-vWorldXZ.x-40.0)/420.0,0.0,1.0);
       float riverZ=-390.0-rt*520.0-sin(rt*3.14159265)*42.0+sin(rt*9.738937)*15.0;
       float riverMask=1.0-smoothstep(52.0,122.0,abs(vWorldXZ.y-riverZ));
       alpha*=1.0-riverMask*.86;
       gl_FragColor=vec4(uColor,alpha);
      }`
   });
   const mesh=new THREE.Mesh(geometry,material);
   mesh.name=`Ground fog ${index+1} — beneath the hero rooftop`;
   mesh.position.y=layer.y;
   mesh.frustumCulled=false;
   // Transparent, depth-tested: never replace the scene's solid 3D surfaces.
   mesh.renderOrder=5;
   scene.add(mesh);this.sheets.push(mesh);
  }
 }
 update(dt,weather,skyColor){
  const color=new THREE.Color(skyColor).lerp(new THREE.Color('#8f9b98'),.64);
  for(const sheet of this.sheets){
   const u=sheet.material.uniforms;
   u.uTime.value+=dt;
   u.uWeather.value=THREE.MathUtils.damp(u.uWeather.value,weather.mist,.65,dt);
   u.uColor.value.lerp(color,1-Math.exp(-dt*.7));
  }
 }
}

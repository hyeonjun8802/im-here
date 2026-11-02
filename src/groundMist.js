import * as THREE from 'three';

/**
 * Ground-bound fog, below the one playable rooftop. Unlike a screen overlay it
 * is depth-tested in the real scene: the rooftop stays clear while streets,
 * vehicles and the lower facades disappear into a continuous mist volume.
 * Three or four shared shader sheets avoid particle/draw-call explosions.
 */
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
   ? [{y:-20,alpha:.99},{y:-13.5,alpha:.79},{y:-5.8,alpha:.23}]
   : [{y:-21,alpha:.99},{y:-15,alpha:.90},{y:-9.8,alpha:.59},{y:-4.2,alpha:.19}];
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
       float billow=texture2D(uNoise,p).r*.57+texture2D(uNoise,p*2.14+uSeed).r*.43;
       float density=mix(.56,1.22,billow);
       // Beyond the city, Three.js exponential distance fog completes the fade.
       float rim=1.0-smoothstep(930.0,1140.0,length(vWorldXZ));
       float alpha=min(.985,uOpacity*(.94+uWeather*.11)*density*rim);
       // Keep the new winding river readable through the ground haze. The mist
       // still crosses the water as a thin veil instead of becoming an opaque lid.
       float rt=clamp((vWorldXZ.x+760.0)/660.0,0.0,1.0);
       float riverZ=-420.0-sin(rt*3.14159265)*72.0+sin(rt*13.194689)*20.0;
       float riverMask=1.0-smoothstep(52.0,122.0,abs(vWorldXZ.y-riverZ));
       alpha*=1.0-riverMask*.78;
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

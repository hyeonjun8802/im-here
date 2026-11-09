import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import { RepoAssets } from './assets.js';
import {CITY_MODELS, ROOFTOP_PROPS, ABANDONED_VEHICLES, CITY_TINTS, PROP_TINT, VEHICLE_TINT} from './artDirection.js';
import {solarPositionForSeoul} from './solar.js';
import {moonPositionForSeoul} from './lunar.js';
import {CelestialSky} from './celestialSky.js';
import {SPATIAL_LAYOUT,planDistantCity,depthAtmosphere} from './spatialLayout.js';
import {CityAtmosphere} from './cityAtmosphere.js';
import {decorateHeroRooftop} from './sceneDetails.js';
import {upgradeCampFacilities} from './premiumProps.js';
import {AdvancedWeather} from './advancedWeather.js';
import {CinematicWeatherVfx} from './cinematicWeatherVfx.js';
import {integrateWeather, visualTargets} from './weatherDirector.js';
import {beginTornadoEncounter} from './simulation.js';
import {weatherCloudShadow} from './weatherVisualMath.js';
import {WeatherAudio} from './weatherAudio.js';
import {CinematicStage} from './cinematicStage.js';
import {upgradeSurvivorArt,updateSurvivorArt} from './survivorArt.js';
import {SurvivorLife} from './survivorLife.js';
import {RooftopBotany} from './rooftopBotany.js';
import {PremiumEnvironmentV130} from './premiumEnvironmentV130.js';
import {upgradeSurvivorFinishingV130,animateSurvivorFinishingV130} from './survivorFinishingV130.js';
import {CinematicPostV130} from './cinematicPostV130.js';
import {PremiumAtmosphereV500} from './premiumAtmosphereV500.js';
import {CinematicMomentV510} from './cinematicMomentV510.js';
import {PremiumEventPhysicsV520} from './premiumEventPhysicsV520.js';
import {finishImportedGLB,finishTexture} from './premiumMaterialFinishV600.js';
import {PremiumAssetFinishV620} from './premiumAssetFinishV620.js';
import {PremiumRuinedCityV630} from './premiumRuinedBuildingsV630.js';
import {PremiumStreetV640} from './premiumStreetV640.js';
import {PremiumCinematicCityV650} from './premiumCinematicCityV650.js';
import {AmbientCityCollapseV660} from './ambientCityCollapseV660.js';
import {PremiumFacadeDensityV670} from './premiumFacadeDensityV670.js';
import {PremiumUrbanSilhouetteV680} from './premiumUrbanSilhouetteV680.js';
import {PremiumLandmarkRuinsV690} from './premiumLandmarkRuinsV690.js';
import {PremiumWeatherSurfacesV700} from './premiumWeatherSurfacesV700.js';
import {PremiumNightLightingV710} from './premiumNightLightingV710.js';
import {PremiumCollapseAftermathV720} from './premiumCollapseAftermathV720.js';
import {PremiumMicroSurfaceV730} from './premiumMicroSurfaceV730.js';
import {PremiumWetMaterialV750} from './premiumWetMaterialV750.js';
import {PremiumDisasterVfxV810} from './premiumDisasterVfxV810.js';
import {PremiumStageV140} from './premiumStageV140.js';
import {CityInfillV150} from './cityInfillV150.js';
import {CityReclamation} from './cityReclamation.js';
import {CityArchitecture} from './cityArchitecture.js';
import {GroundMist} from './groundMist.js';
import {contractCitySlot,settleContractedCity} from './cityContraction.js';
import {createFracturedTowerGeometry} from './ruinedBuildingGeometry.js';
import {CITY_COMPOSITION} from './cityComposition.js';
import {BeardedSurvivorV190} from './beardedSurvivorV190.js';
import {ApocalypseSetDressingV201} from './ApocalypseSetDressingV201.js';
import {HorizonWorldExpansionV210} from './HorizonWorldExpansionV210.js';
import {NearTornadoVfx,selectStormBuildings,selectVariedStormBuildings} from './nearTornadoVfx.js';
import {RescueHelicopterVfx} from './rescueHelicopterVfx.js';
import {SupportSurvivorVfx} from './supportSurvivorVfx.js';
import {mobile3DQualityProfile,nextMobile3DAutoFactor,shouldRenderMobile3DFrame} from './mobile3DQuality.js';

const ROOF=CITY_COMPOSITION.heroRoofY;
const clamp=THREE.MathUtils.clamp;
const color=(v)=>new THREE.Color(v);
const RAND=(n)=>{let x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
function mat(hex, rough=.84,metal=.04){return new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});}
const materials={concrete:mat('#777a72'),concreteLight:mat('#83877f'),edge:mat('#515c55'),rust:mat('#94664e',.8,.32),metal:mat('#a6a7a0',.5,.32),wood:mat('#65513e'),tar:mat('#252d2b'),tarp:mat('#585d48'),rope:mat('#a3a087'),soil:mat('#4a3d31'),plant:mat('#556e4b'),lamp: new THREE.MeshStandardMaterial({color:'#f6c177',emissive:'#e58e36',emissiveIntensity:2,roughness:.5})};

// v0.7 authored, seamless, layered PBR textures: albedo, height-derived normal and roughness.
const materialLoader=new THREE.TextureLoader();
const pbr=[['concrete','roof_concrete',3],['concreteLight','roof_concrete',3],['edge','roof_concrete',2],
 ['rust','galvanized_rust',2],['metal','galvanized_rust',2],['wood','reclaimed_wood',2],['tarp','tarp_canvas',1.4]];
function configureTexture(texture,repeat,srgb=false){
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(repeat,repeat);
 finishTexture(texture,8);
 if(srgb) texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
function loadPBR(target,name,repeat){
 const base='./assets/materials/advanced/'+name;
 materialLoader.load(base+'_albedo.jpg',t=>{target.map=configureTexture(t,repeat,true);target.color.set('#ffffff');target.needsUpdate=true;},undefined,()=>{});
 materialLoader.load(base+'_normal.jpg',t=>{target.normalMap=configureTexture(t,repeat);target.normalScale=new THREE.Vector2(.30,.30);target.needsUpdate=true;},undefined,()=>{});
 materialLoader.load(base+'_roughness.png',t=>{target.roughnessMap=configureTexture(t,repeat);target.needsUpdate=true;},undefined,()=>{});
}
for(const [key,name,repeat] of pbr)loadPBR(materials[key],name,repeat);
function loadCinematicRoof(target){
 const base='./assets/materials/cinematic/roof_cinematic';
 materialLoader.load(base+'_albedo.jpg',t=>{target.map=configureTexture(t,1,true);target.color.set('#ffffff');target.needsUpdate=true;},undefined,e=>console.warn('Roof albedo',e));
 materialLoader.load(base+'_normal.jpg',t=>{target.normalMap=configureTexture(t,1);target.normalScale.set(.38,.38);target.needsUpdate=true;},undefined,e=>console.warn('Roof normal',e));
 materialLoader.load(base+'_roughness.png',t=>{target.roughnessMap=configureTexture(t,1);target.needsUpdate=true;},undefined,e=>console.warn('Roof roughness',e));
}
materialLoader.load('./assets/materials/leaves.jpg',t=>{materials.plant.map=configureTexture(t,2,true);materials.plant.needsUpdate=true;});

function box(parent,s,pos,m,rotation){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...s),m);mesh.position.set(...pos);if(rotation)mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cyl(parent,r1,r2,h,pos,m,n=12,rotation){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);mesh.position.set(...pos);if(rotation)mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function beam(parent,a,b,r,m){let A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const len=A.distanceTo(B);const o=cyl(parent,r,r,len,A.clone().add(B).multiplyScalar(.5).toArray(),m,6);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return o;}
function seededNoiseTexture(){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#81817a';ctx.fillRect(0,0,512,512);let seed=6839;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};for(let i=0;i<23000;i++){let v=Math.floor(72+rnd()*56);ctx.fillStyle=`rgba(${v},${v+2},${v-2},${rnd()*.22})`;let x=rnd()*512,y=rnd()*512,r=rnd()*2+0.3;ctx.fillRect(x,y,r,r)}for(let i=0;i<30;i++){let x=rnd()*512,y=rnd()*512;ctx.strokeStyle='rgba(27,36,29,.16)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<6;j++){x+=(rnd()-.5)*18;y+=(rnd()-.5)*16;ctx.lineTo(x,y)}ctx.stroke();}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
export class AfterWorld {
 constructor(canvas,report=()=>{}){
  this.report=report;this.canvas=canvas;this.scene=new THREE.Scene();this.scene.background=color('#283744');this.scene.fog=new THREE.FogExp2('#929b99',.00116);
  // A single low-overhead WebGL context is critical on iOS Safari.
  const mobile=window.innerWidth<800;
  let gpuSafeMode=false;
  try{gpuSafeMode=sessionStorage.getItem('afterday_gpu_safe_mode_v1')==='1';}catch{}
  this.gpuSafeMode=mobile&&gpuSafeMode;
  this.mobileQuality='auto';this.mobileAdaptiveFactor=1;
  this.mobilePerfWindowStarted=0;this.mobilePerfFrames=0;this.mobileMeasuredFps=0;
  this.mobilePerfBootAt=performance.now();
  this._lastMobileRenderAt=0;this.mobileDrawCount=0;
  const mobileProfile=mobile3DQualityProfile({
   quality:'auto',devicePixelRatio:window.devicePixelRatio||1,
   width:innerWidth,height:innerHeight,gpuSafeMode:this.gpuSafeMode
  });
  this.renderer=new THREE.WebGLRenderer({
   // Native MSAA is a one-time WebGL context choice. Normal mobile quality
   // keeps it enabled, while context-loss GPU safe mode remains recoverable.
   canvas,antialias:!this.gpuSafeMode,alpha:false,
   powerPreference:mobile?'default':'high-performance',
   preserveDrawingBuffer:new URLSearchParams(location.search).has('visualqa')
  });
  // Neutral spherical radiance probe supplies real PBR specular response to GLB
  // metal and wet surfaces; it is NOT a 2D substitution for the 3D game world.
  materialLoader.load('./assets/materials/cinematic/sky_light_probe.jpg',tex=>{
   tex.mapping=THREE.EquirectangularReflectionMapping;tex.colorSpace=THREE.SRGBColorSpace;
   this.scene.environment=tex;this.scene.environmentIntensity=.52;
  },undefined,()=>{});
  this.isMobile=mobile;this.ROOF_Y=ROOF;this.renderer.setPixelRatio(mobile?mobileProfile.pixelRatio:Math.min(devicePixelRatio,1.8));this.renderer.setSize(window.innerWidth,window.innerHeight,false);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.28;this.renderer.shadowMap.enabled=!this.gpuSafeMode;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.scene.add(new THREE.HemisphereLight('#cfdad5','#55564f',1.48));this.ambient=this.scene.children[this.scene.children.length-1];
  this.sun=new THREE.DirectionalLight('#ffcf99',3.5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(mobile?mobileProfile.shadowSize:3072,mobile?mobileProfile.shadowSize:3072);Object.assign(this.sun.shadow.camera,{near:1,far:190,left:mobile?-55:-68,right:mobile?55:68,top:mobile?55:68,bottom:mobile?-55:-68});this.sun.shadow.bias=-.00018;this.sun.shadow.normalBias=.025;this.sun.position.set(40,65,25);this.sun.target.position.set(0,ROOF,0);this.scene.add(this.sun,this.sun.target);
  this.fill=new THREE.DirectionalLight('#a3bbcc',.48);this.fill.position.set(-40,28,-38);this.scene.add(this.fill);
  this.fireLight=new THREE.PointLight('#ffb262',11.5,34,2);this.fireLight.position.set(2,ROOF+2.4,3);this.scene.add(this.fireLight);
  this.camera=new THREE.PerspectiveCamera(mobile?51:46,window.innerWidth/window.innerHeight,.15,1650);this.target=new THREE.Vector3(0,ROOF+3.3,0);this.yaw=.78;this.pitch=mobile?1.26:1.29;this.radius=mobile?84:79;this.minRadius=44;this.maxRadius=SPATIAL_LAYOUT.maxCameraRadius;this.setupControls();
  this.weatherAudio=new WeatherAudio();this.cityBuildings=new Map();this.reducedMotion=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);this.assets=new RepoAssets();this.models=[];this.props=[];this.effectObjects=[];this.simulatedWeather='clear';this.previewWeather=null;this.previewHour=null;this.wind=0;this.wetness=.12;this.visualWeather=visualTargets('clear');this.last=performance.now();this.running=false;this.clock=new THREE.Clock();
  this.createEnvironment();this.cityInfill=new CityInfillV150(this);this.cityReclamation=new CityReclamation(this.scene,this.distantCityPlan,this.cityInfill.plan);this.cityArchitecture=new CityArchitecture(this.scene,this.distantCityPlan,this.cityInfill.plan,this.isMobile);this.premiumRuinedCity=new PremiumRuinedCityV630(this);this.premiumStreet=new PremiumStreetV640(this);this.premiumCinematicCity=new PremiumCinematicCityV650(this);this.premiumFacadeDensity=new PremiumFacadeDensityV670(this);this.premiumUrbanSilhouette=new PremiumUrbanSilhouetteV680(this);this.premiumLandmarkRuins=new PremiumLandmarkRuinsV690(this);this.premiumWeatherSurfaces=new PremiumWeatherSurfacesV700(this);this.premiumNightLighting=new PremiumNightLightingV710(this);this.premiumCollapseAftermath=new PremiumCollapseAftermathV720(this);this.ambientCityCollapse=new AmbientCityCollapseV660(this);this.cityAtmosphere=new CityAtmosphere(this.scene,this.isMobile);this.groundMist=new GroundMist(this.scene,this.isMobile);this.createRoof();this.createRoofProps();this.botany=new RooftopBotany(this);decorateHeroRooftop(this.scene,ROOF,this);upgradeCampFacilities(this);this.createSurvivor();this.rescueHelicopterVfx=new RescueHelicopterVfx(this.scene,ROOF);upgradeSurvivorArt(this);upgradeSurvivorFinishingV130(this);this.life=new SurvivorLife(this);this.beardedSurvivor=new BeardedSurvivorV190(this);this.supportSurvivor=new SupportSurvivorVfx(this);this.createWeather();this.premiumDisasterVfx=new PremiumDisasterVfxV810(this.scene,ROOF,this.isMobile);this.createAtmosphericBackdrops();this.celestialSky=new CelestialSky(this.scene,ROOF);this.cinematic=new CinematicStage(this);this.premiumAtmosphere=new PremiumAtmosphereV500(this);this.premiumEnvironment=new PremiumEnvironmentV130(this);this.premiumStage=new PremiumStageV140(this);this.apocalypseSetDressing=new ApocalypseSetDressingV201(this);this.horizonWorld=new HorizonWorldExpansionV210(this);this.premiumAssetFinish=new PremiumAssetFinishV620(this);this.premiumMicroSurface=new PremiumMicroSurfaceV730(this);this.premiumWetMaterial=new PremiumWetMaterialV750(this);this.cinematicPost=new CinematicPostV130(this);this.optimizeMobileDistantShadows();this.cinematicMoment=new CinematicMomentV510(this);this.eventPerformance=new PremiumEventPhysicsV520(this);this.heroAssetPromise=this.loadHeroAssets();this.resize();window.addEventListener('resize',()=>this.resize());
 }
 /**
  * Mobile-only: distant city meshes outside the 1024px hero shadow volume
  * should still render in full colour, but never enter costly shadow passes.
  * Does not hide, merge or reduce geometry or affect PC settings.
  */
 optimizeMobileDistantShadows(){
  this.mobileCulledShadowCasters=0;
  if(!this.isMobile)return;
  this.scene.updateMatrixWorld(true);
  const position=new THREE.Vector3();
  this.scene.traverse(object=>{
   if(!object.isMesh||!object.castShadow)return;
   object.getWorldPosition(position);
   if(Math.hypot(position.x,position.z)>100){
    object.castShadow=false;
    this.mobileCulledShadowCasters++;
   }
  });
 }
 /** Load three locally baked, true 3D GLB models with UVs and embedded PBR textures.
  * Fallback procedural props stay visible if decoding or fetching fails.
  * Hero/prop GLB loaders are unchanged; the background city uses authored ruins.
  */
 async loadHeroAssets(){
  const loader=new GLTFLoader();
  const entries=[
   {file:'afterday_shelter_pbr.glb',old:this.shelter,pos:[-8,ROOF+.30,-6],max:[19,9,15]},
   {file:'afterday_water_tank_pbr.glb',old:this.tank,pos:[16,ROOF+.18,-13],max:[10,12,8]},
   {file:'afterday_storage_pbr.glb',old:this.storage,pos:[12,ROOF+.20,10],max:[8,5,7]}
  ];
  this.heroAssetStatus={loaded:0,failed:[]};
  await Promise.all(entries.map(async ({file,old,pos,max})=>{
   try{
    const result=await loader.loadAsync('./assets/models/afterday/'+file);
    const model=result.scene;
    const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if([size.x,size.y,size.z].some((n,i)=>!Number.isFinite(n)||n<.01||n>max[i]))throw new Error('invalid GLB dimensions: '+size.toArray());
    model.position.set(...pos);model.name='AFTERDAY custom asset: '+file;
    const finish=finishImportedGLB(model,{mobile:this.isMobile});
    model.userData.premiumFinish=finish;
    model.traverse(o=>{if(o.isMesh){
      o.castShadow=true;o.receiveShadow=true;
      if(file==='afterday_shelter_pbr.glb'&&o.name.includes('tensioned rainproof canopy')){
       o.geometry=o.geometry.clone();this.heroCanopyMesh=o;this.heroCanopyVerts=o.geometry.attributes.position.array.slice();
      }
     }});
    this.scene.add(model);old.visible=false;
    if(file==='afterday_shelter_pbr.glb'){
      this.shelterAsset=model;
      this.sleepBedding?.useShelterAsset(model);
      model.visible=Boolean(this.activeKit?.tent);
    }
    this.heroAssetStatus.loaded++;
   }catch(err){this.heroAssetStatus.failed.push(file);console.warn('[AFTERDAY] Procedural fallback active',file,err);}
  }));
 }
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.camera.aspect=w/h;this.camera.fov=w<680?53:48;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.cinematicPost?.resize(w,h)}
 setupControls(){const points=new Map();let lastDist=0;const el=this.canvas;el.style.touchAction='none';let moved=false;
  el.addEventListener('pointerdown',e=>{this.cinematicMoment?.cancel();this.cameraTransition=null;el.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false});
  el.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;const p=points.get(e.pointerId);const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
   if(points.size===1){this.yaw-=dx*.006;this.pitch=clamp(this.pitch+dy*.0035,.25,1.48);if(Math.abs(dx)+Math.abs(dy)>3)moved=true}
   else if(points.size===2){const a=[...points.values()];let dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastDist)this.radius=clamp(this.radius-(dist-lastDist)*.18,this.focusSurvivor?3.55:this.minRadius,this.maxRadius);lastDist=dist;}
  });
  const stop=e=>{if(e.type==='pointerup'&&!moved&&points.size===1&&this.life){const action=this.life.pickFromPointer(e);if(action&&action!=='eat'){this.life.request(action,true)}else if(action==='eat'){this.report('식량을 사용하려면 아래 식사 버튼을 눌러주세요.')}}points.delete(e.pointerId);if(points.size<2)lastDist=0};el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);el.addEventListener('wheel',e=>{e.preventDefault();this.cinematicMoment?.cancel();this.cameraTransition=null;this.radius=clamp(this.radius+e.deltaY*.065,this.focusSurvivor?3.55:this.minRadius,this.maxRadius)},{passive:false});
 }
 addBuilding(model,pos,height,rot=0,tint,slot={tier:'near',width:11}){
  const holder=new THREE.Group();holder.position.set(...pos);holder.rotation.y=rot;
  holder.name=`Afterday city ${slot.tier}: ${slot.id||model}`;
  holder.userData={tier:slot.tier,cityDistance:Math.hypot(pos[0],pos[2])};
  this.scene.add(holder);
  if(slot.id)this.cityBuildings?.set(slot.id,holder);
  // Fixed 3D position. Switching weather changes ONLY fog/light/material response.
  const fallback=this.makeRuinFallback(height,RAND(pos[0]+pos[2]*6),slot.tier,slot.width);
  holder.add(fallback);
  // Authoring rule: the background city is a consistent family of weathered,
  // blunt-topped concrete blocks. Generic remote GLBs include steep skyscraper
  // spires, and asynchronous replacements would break the promised composition.
  // The licensed models remain available to the camp and parked vehicles.
  return holder;
 }
 cityFacadeMaterials(tier,index){
  const variant=index%4,key=tier+'-'+variant;
  if(!this.cityMaterialCache)this.cityMaterialCache=new Map();
  if(this.cityMaterialCache.has(key))return this.cityMaterialCache.get(key);
  const near=tier==='near',far=tier==='far';
  const tint=near?'#aaa9a0':far?'#899ca6':'#9ca6a6';
  const wall=new THREE.MeshPhysicalMaterial({
   color:tint,roughness:near?.88:.94,metalness:near?.025:.035,
   clearcoat:near?.035:0,clearcoatRoughness:.62,
   envMapIntensity:near?1.02:far?.48:.72
  });
  const base=`./assets/materials/city/facade_premium_${variant}`;
  const facadeAniso=this.isMobile?4:near?16:far?4:8;
  materialLoader.load(base+'.jpg',tex=>{tex.colorSpace=THREE.SRGBColorSpace;finishTexture(tex,facadeAniso);wall.map=tex;wall.needsUpdate=true;},undefined,()=>{});
  materialLoader.load(`./assets/materials/city/facade_${variant}_emissive.jpg`,tex=>{tex.colorSpace=THREE.SRGBColorSpace;finishTexture(tex,facadeAniso);wall.emissiveMap=tex;wall.emissive.set('#fff2d0');wall.emissiveIntensity=0;wall.needsUpdate=true;},undefined,()=>{});
  const roof=new THREE.MeshPhysicalMaterial({
   color:tier==='near'?'#4b4e49':'#555e61',roughness:.92,metalness:.025,
   envMapIntensity:near?.72:.48,clearcoat:near?.02:0,clearcoatRoughness:.70
  });
  const result=[wall,wall,roof,roof,wall,wall];this.cityMaterialCache.set(key,result);return result;
 }
 makeRuinFallback(h,seed,tier='near',width=12){
  // Real textured buildings occupy separate 3D positions, making genuine parallax.
  const g=new THREE.Group(),w=width;
  const materialArray=this.cityFacadeMaterials(tier,Math.floor(seed*103));
  const body=new THREE.Mesh(createFracturedTowerGeometry(Math.floor(seed*103)%4),[materialArray[0],materialArray[2]]);
  body.scale.set(w,h,w*.82);body.castShadow=false;body.receiveShadow=false;
  g.add(body);
  const near=tier==='near';
  // Weathered roof equipment/steel and incomplete upper corners.
  const roofHeight=h*.87+.18;
  for(let i=0;i<(near?5:tier==='mid'?3:1);i++){
   const x=(RAND(seed*31+i)-.5)*w*.68;
   const z=(RAND(seed*21+i)-.5)*w*.62;
   const patch=box(g,[w*(.10+RAND(seed+i)*.09),.24+RAND(i+seed)*.48,w*(.11+RAND(seed+i*7)*.1)],
       [x,roofHeight,z],i%2?materials.edge:materials.rust);patch.castShadow=false;
  }
  if(near){
   // Facade depth and damage are actual geometry, not only a dark square texture.
   const trim=mat('#505754',.93,.04),rust=materials.rust;
   for(let j=0;j<4;j++){
    const x=(RAND(j+seed*22)-.5)*w*.7;
    box(g,[.18,h*(.12+RAND(j+seed)*.13),.26],[x,h*(.12+j*.20),w*.416],j%3?trim:rust).castShadow=false;
   }

  }
  return g;
 }
 createEnvironment(){
  // ONE inhabited hero roof. The city itself is a 3D volume, not a 2D wall:
  // Three contracted distance rings preserve genuine parallax and the roof buffer.
  box(this.scene,[2200,1,2200],[0,-24,0],mat('#293d3c'));
  const buildingModels=CITY_MODELS;
  this.distantCityPlan=settleContractedCity(planDistantCity(this.isMobile,RAND).map(contractCitySlot));
  for(const slot of this.distantCityPlan){
    this.addBuilding(buildingModels[slot.modelIndex%buildingModels.length],
      [slot.x,-23.5,slot.z],slot.height,slot.rotation,
      CITY_TINTS[slot.modelIndex%CITY_TINTS.length],slot);
  }
  this.createFarMountains();
  // Abandoned streets remain far from the player; these are only scale cues.
  const debris=mat('#3e4c46');
  for(let i=0;i<32;i++){
    const a=RAND(i+111)*Math.PI*2;
    const r=SPATIAL_LAYOUT.cityMinRadius+36+RAND(i+700)*290;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=.25+RAND(i+811)*.7;
    box(this.scene,[.4+RAND(i+12),h,1.1],[x,-23+h/2,z],i%5?debris:materials.rust,[0,RAND(i+45)*Math.PI,0]);
  }
  const distantRoad=mat('#303735');
  box(this.scene,[17,.08,380],[SPATIAL_LAYOUT.distantRoadOffset,-23.45,0],distantRoad);
  box(this.scene,[380,.08,17],[0,-23.45,SPATIAL_LAYOUT.distantRoadOffset],distantRoad);
  for(let i=0;i<12;i++){
    const roadX=i<6;
    const x=roadX?SPATIAL_LAYOUT.distantRoadOffset+(i%2)*3:((i-6)-2.5)*24;
    const z=roadX?((i-2.5)*24):SPATIAL_LAYOUT.distantRoadOffset+(i%2)*3;
    const holder=new THREE.Group();holder.position.set(x,-23,z);this.scene.add(holder);
    this.assets.instance(ABANDONED_VEHICLES[i%ABANDONED_VEHICLES.length],2.4,{tint:VEHICLE_TINT}).then(mesh=>{
      if(mesh){mesh.rotation.y=roadX?Math.PI/2:0;holder.add(mesh);this.models.push('car');}
    });
  }
 }
 createFarMountains(){
  // Extremely distant REAL 3D ridgeline. No adjacent building, no fake repeated
  // building panorama; the mountain crest has individual world-space vertices.
  const count=184,points=[],uv=[],indices=[];
  for(let i=0;i<=count;i++){
   const a=i/count*Math.PI*2;
   const r=1020+22*Math.sin(a*7)+12*Math.sin(a*23);
   const ridge=31+19*Math.sin(a*3+1.9)+11*Math.sin(a*9.3)+6*Math.sin(a*27);
   points.push(Math.sin(a)*r,ridge,Math.cos(a)*r,Math.sin(a)*(r+26),-52,Math.cos(a)*(r+26));
   uv.push(i/count,1,i/count,0);
   if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+2,k+1,k+3);}
  }
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.setIndex(indices);geom.computeVertexNormals();
  const ridge=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:'#45534d',roughness:1,side:THREE.DoubleSide,flatShading:false}));
  ridge.name='Distant 3D mountain ridge – atmospheric depth';ridge.receiveShadow=false;this.scene.add(ridge);
  // One original communications-tower silhouette on a real distant hill,
  // a geographic cue without reproducing a branded city model.
  const hill=new THREE.Group();hill.name='Distant Seoul hill and communications tower (3D)';
  hill.position.set(-530,-25,-875);this.scene.add(hill);
  const mound=new THREE.Mesh(new THREE.IcosahedronGeometry(105,3),mat('#435849',1));
  mound.scale.set(1.02,.44,1.05);mound.position.y=8;hill.add(mound);
  const metal=mat('#6b7878',.8,.4);
  cyl(hill,2.4,4.5,60,[0,81,0],metal,14);
  cyl(hill,9.5,9.5,9,[0,103,0],mat('#677476',.72,.31),24);
  cyl(hill,3.6,5.2,38,[0,127,0],metal,10);
  cyl(hill,.7,1.2,28,[0,158,0],materials.rust,7);
  const lamp=new THREE.MeshBasicMaterial({color:'#fa6b5b'});
  for(const level of [144,165])cyl(hill,1.0,1.0,.8,[0,level,0],lamp,8);
 }
 createRoof(){
  this.roof=new THREE.Group();this.scene.add(this.roof);
  // Hero building extends DOWN from the single play roof; visible facade is part of
  // the same structure, not a neighboring roof. All rooftop actions stay above.
  this.heroTower=new THREE.Group();this.scene.add(this.heroTower);
  const bottom=-23.5, towerTop=ROOF-1.7, towerHeight=towerTop-bottom;
  const tower=box(this.heroTower,[44.1,towerHeight,44.1],
    [0,bottom+towerHeight/2,0],materials.edge);
  tower.userData.heroBuilding=true;
  // Exposed facade is true 3D geometry but batched by material; >700 tiny
  // individual window meshes previously caused unnecessary mobile draw calls.
  const darkGlass=mat('#303c40',.78,.16),brokenGlass=mat('#566268',.72,.20);
  const façadeGroups=[{name:'dark glass',material:darkGlass,transforms:[]},
    {name:'damaged glass',material:brokenGlass,transforms:[]},
    {name:'repaired mullions',material:materials.concreteLight,transforms:[]},
    {name:'concrete sill',material:materials.concrete,transforms:[]}];
  const push=(type,size,pos,rot=0)=>façadeGroups[type].transforms.push({size,pos,rot});
  for(const side of [-1,1])for(let floor=0;floor<7;floor++){
    const y=bottom+4.2+floor*4.6;
    for(let bay=-3;bay<=3;bay++){
      const t=bay*5.8,front=side*22.08;
      const alternate=(floor*7+bay+25)%7===0;
      push(alternate?1:0,[2.8,2.28,.11],[t,y,front]);
      push(2,[.14,2.68,.26],[t-1.52,y,front]);
      push(2,[.14,2.68,.26],[t+1.52,y,front]);
      push(3,[2.95,.14,.26],[t,y-1.28,front]);
      push(alternate?0:1,[2.8,2.28,.11],[front,y,t],Math.PI/2);
      push(2,[.14,2.68,.26],[front,y,t-1.52],Math.PI/2);
      push(2,[.14,2.68,.26],[front,y,t+1.52],Math.PI/2);
      push(3,[2.95,.14,.26],[front,y-1.28,t],Math.PI/2);
    }
  }
  const instanceDummy=new THREE.Object3D();
  for(const part of façadeGroups){
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),part.material,part.transforms.length);
    mesh.name='Hero tower - '+part.name;mesh.castShadow=false;mesh.receiveShadow=true;
    part.transforms.forEach(({size,pos,rot},i)=>{
      instanceDummy.position.set(...pos);instanceDummy.rotation.set(0,rot,0);instanceDummy.scale.set(...size);
      instanceDummy.updateMatrix();mesh.setMatrixAt(i,instanceDummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();this.heroTower.add(mesh);
  }
  // Water run-off and hanging plants are physically attached to the ONLY tower.
  for(const side of [-1,1]){
    for(let i=-2;i<=2;i++){
      const x=i*8.6;
      beam(this.heroTower,[x,ROOF-.8,side*22.25],
        [x+.38,bottom+5+RAND(i+side+10)*15,side*22.25],.08,materials.rust);
    }
  }
  box(this.roof,[46,2.3,46],[0,ROOF-1.15,0],materials.edge);
  const roofmat=new THREE.MeshPhysicalMaterial({color:'#686e66',roughness:.80,metalness:0,clearcoat:.28,clearcoatRoughness:.42});loadCinematicRoof(roofmat);this.roofSurfaceMaterial=roofmat;box(this.roof,[45.5,.2,45.5],[0,ROOF+.04,0],roofmat);
  // No artificial 9x9 straight-line grid. Realistic nonrepeating concrete is baked
  // into the roof UV atlas. Only physically plausible, sporadic repair strips remain.
  for(let i=0;i<13;i++){
    const x=(RAND(i+1)-.5)*40,z=(RAND(i+91)-.5)*40;
    if(x>-18&&x<-1&&z>-14&&z<0)continue;
    const patch=box(this.roof,[.35+RAND(i+5)*1.6,.012,.12+RAND(i+7)*.24],[x,ROOF+.156,z],materials.tar,[0,RAND(i+4)*6.28,0]);patch.castShadow=false;
  }
  // Thick parapets on all sides, with cracked edges, steel guard rails & braces.
  for(const sign of [-1,1]){
    box(this.roof,[47,2,1.1],[0,ROOF+1,sign*23],materials.concrete);
    box(this.roof,[1.1,2,46],[sign*23,ROOF+1,0],materials.concrete);
    for(let i=-20;i<=20;i+=5){
      cyl(this.roof,.11,.11,2.3,[i,ROOF+3.1,sign*22.9],materials.rust,7);
      cyl(this.roof,.11,.11,2.3,[sign*22.9,ROOF+3.1,i],materials.rust,7);
    }
    beam(this.roof,[-21,ROOF+4.2,sign*22.9],[21,ROOF+4.2,sign*22.9],.085,materials.metal);
    beam(this.roof,[sign*22.9,ROOF+4.2,-21],[sign*22.9,ROOF+4.2,21],.085,materials.metal);
  }
  // Puddles are genuine 3D surface meshes that become visible during rain.
  // Irregular PBR shallow pooling and wetness mask are authored by CinematicStage.
  this.puddles=[];
  // drain channels and pipe apertures
  for(let i=-2;i<=2;i++){box(this.roof,[.65,.04,3.8],[i*7,ROOF+.19,21.6],materials.tar);for(let j=0;j<5;j++)box(this.roof,[.54,.07,.085],[i*7,ROOF+.24,19.9+j*.55],materials.metal)}
 }
 createRoofProps(){
   // Salvaged shelter and robust rope-connected awning
   const sh=new THREE.Group();sh.position.set(-8,ROOF+.3,-6);this.scene.add(sh);this.shelter=sh;
   box(sh,[11,.38,9],[0,.12,0],materials.wood);
   const beams=[[-5,-4.3],[5,-4.3],[-5,4.3],[5,4.3]];
   for(const [x,z] of beams){cyl(sh,.12,.15,5,[x,2.7,z],materials.rust,8);cyl(sh,.25,.28,.25,[x,.2,z],materials.concrete,8);}
   const roofGeom=new THREE.BufferGeometry();const pts=[],ids=[];const W=18,H=12;
   for(let i=0;i<=W;i++)for(let j=0;j<=H;j++){
     const x=(i/W-.5)*12,z=(j/H-.5)*10;
     const ty=4.72+1.70*(1-Math.abs(x)/6)-.38*Math.sin((z/10+.5)*Math.PI)+.18*Math.sin(i*.48+j*.27)+.055*Math.sin(i*2.1+j*1.7);
     pts.push(x,ty,z);
   }
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){const a=i*(H+1)+j,b=a+(H+1);ids.push(a,a+1,b,a+1,b+1,b)}
   roofGeom.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));roofGeom.setIndex(ids);roofGeom.computeVertexNormals();
   const tarpmat=materials.tarp.clone();loadPBR(tarpmat,'tarp_canvas',1.4);this.tarpMaterial=tarpmat;tarpmat.side=THREE.DoubleSide;const roof=new THREE.Mesh(roofGeom,tarpmat);roof.castShadow=true;roof.receiveShadow=true;sh.add(roof);this.tarpMesh=roof;this.tarpVerts=roofGeom.attributes.position.array.slice();
   for(let s of [-1,1]){for(const z of [-4.7,4.7]){beam(sh,[s*5.8,4.98,z],[s*7.2,.15,z*1.18],.045,materials.rope)}}
   // Inner sleeping pallet is supplied by the GLB; no second white mattress.
   for(let i=0;i<4;i++)box(sh,[2.3,.4,1.2],[3.5, .55+i*.37,-2.6],i%2?materials.wood:materials.tar);
   // Rope lights & suspended lanterns.
   for(let i=0;i<8;i++){const x=-5.5+i*1.6;
    cyl(sh,.11,.11,.25,[x,4.94+.12*Math.sin(i),-4.5],materials.lamp,8);
    if(i>0)beam(sh,[x-1.6,5.2,-4.5],[x,5.15,-4.5],.018,materials.tar);
   }
   // water collector
   this.tank=new THREE.Group();this.tank.position.set(16,ROOF+.18,-13);this.scene.add(this.tank);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;cyl(this.tank,.2,.25,2.3,[Math.sin(a)*2.3,1.2,Math.cos(a)*2.3],materials.rust,8)}
   cyl(this.tank,2.8,2.85,5.8,[0,5.5,0],materials.metal,24);
   for(let i=0;i<7;i++)cyl(this.tank,2.95,2.95,.1,[0,2.75+i*.85,0],materials.edge,24);
   cyl(this.tank,2.75,2.75,.25,[0,8.5,0],materials.tar,24);
   cyl(this.tank,.28,.28,1.2,[2.9,3.4,.6],materials.rust,9,[0,0,Math.PI/2]);
   cyl(this.tank,.56,.56,.15,[3.5,3.4,.6],materials.rust,12,[0,0,Math.PI/2]);
   box(this.tank,[1.2,1.5,.24],[-2.5,5.8,0],materials.tar);
   // storage & greenhouse + benches
   const store=new THREE.Group();store.position.set(12,ROOF+.2,10);this.scene.add(store);this.storage=store;
   for(let i=0;i<5;i++){const x=(i%3)*1.45,z=Math.floor(i/3)*2;
     box(store,[1.3,1.55,1.3],[x, .85,z],i%2?materials.wood:materials.rust);
     box(store,[1.35,.13,1.35],[x,1.71,z],materials.tar);
     for(let k of [-1,1])box(store,[.06,1.1,.08],[x+k*.62,.85,z+.66],materials.metal);
   }
   const garden=new THREE.Group();garden.position.set(-13,ROOF+.25,11);this.scene.add(garden);
   for(let j=0;j<3;j++){box(garden,[10,.8,2.2],[0,.45,j*3.2],materials.wood);box(garden,[9.7,.2,2],[0,.91,j*3.2],materials.soil);
    // Real vegetable stems, veined leaves and fruit are instantiated in RooftopBotany.
   }
   // improvised metal stairwell on rooftop
   const stair=new THREE.Group();stair.position.set(12,ROOF+.1,-.6);this.scene.add(stair);
   box(stair,[6,5,6],[0,2.5,0],materials.concrete);
   box(stair,[6.7,.7,6.7],[0,5.4,0],materials.tar);
   box(stair,[2.6,3,.15],[-.6,1.65,3.05],materials.metal);
   beam(stair,[-2.75,5.6,-2.5],[-3,5.6,2.5],.11,materials.rust);
   // fireplace. Fire particles animated in main weather layer.
   const fireRing=new THREE.Group();fireRing.position.set(2,ROOF+.25,3);this.scene.add(fireRing);
   cyl(fireRing,1.2,1.45,.5,[0,.1,0],materials.concrete,12);
   for(let i=0;i<7;i++){let a=i*Math.PI*2/7;beam(fireRing,[Math.cos(a)*.75,.5,Math.sin(a)*.75],[Math.cos(a+1.4)*.8,.45,Math.sin(a+1.4)*.8],.18,materials.wood)}
   this.flames=[];for(let i=0;i<5;i++){const fire=cyl(fireRing,.02,.24,1.2,[Math.sin(i*8)*.24,1.1,Math.cos(i*8)*.22],new THREE.MeshStandardMaterial({color:i%2?'#ffcf80':'#f28d36',emissive:'#ef742c',emissiveIntensity:2.2,transparent:true,opacity:.85}),5);this.flames.push(fire)}
   // place actual GitHub props, safe asynchronous fallbacks already exist in the environment.
   const props=ROOFTOP_PROPS;
   props.forEach(([n,p,h],i)=>this.assets.instance(n,h,{tint:PROP_TINT,maxFootprint:6.5}).then(o=>{
    if(!o)return;
    // Reject accidentally oversized third-party GLB roofs/floors before adding to scene.
    const importedSize=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    if(importedSize.x>6.6 || importedSize.z>6.6 || importedSize.y>11){
      console.warn('[AFTERDAY] Quarantined oversized rooftop model:',n,importedSize);
      return;
    }
    o.position.add(new THREE.Vector3(p[0], ROOF+p[1], p[2]));
    o.rotation.y=(i%4)*Math.PI/2;
    this.scene.add(o);this.props.push(n);
   }));
 }
 createSurvivor(){
  // 3D articulated original fallback survivor; this repository contains no suitable survivor GLB.
  const c=new THREE.Group();this.scene.add(c);this.survivor=c;c.position.set(-1,ROOF+.25,1);
  this.bodyGroup=new THREE.Group();c.add(this.bodyGroup);
  const dark=mat('#292f30'),skin=mat('#b58b6b'),jacket=mat('#535b4c'),belt=mat('#313a34'),boots=mat('#292b29');
  cyl(this.bodyGroup,.48,.64,1.45,[0,1.65,0],jacket,9);
  cyl(this.bodyGroup,.28,.38,.48,[0,2.53,0],skin,10);
  const face=new THREE.Mesh(new THREE.SphereGeometry(.38,12,9),skin);face.position.y=2.87;face.scale.set(.95,1.1,.92);this.bodyGroup.add(face);
  cyl(this.bodyGroup,.41,.31,.2,[0,3.24,0],dark,9);
  box(this.bodyGroup,[.93,.7,.34],[0,1.73,-.54],materials.wood);
  cyl(this.bodyGroup,.55,.59,.17,[0,1.1,0],belt,10);
  this.leftLeg=new THREE.Group();this.rightLeg=new THREE.Group();this.leftLeg.position.set(-.28,1.1,0);this.rightLeg.position.set(.28,1.1,0);this.bodyGroup.add(this.leftLeg,this.rightLeg);
  for(const l of [this.leftLeg,this.rightLeg]){cyl(l,.18,.15,.72,[0,-.39,0],dark,8);box(l,[.37,.25,.53],[0,-.85,.08],boots)}
  this.leftArm=new THREE.Group();this.rightArm=new THREE.Group();this.leftArm.position.set(-.55,2.22,0);this.rightArm.position.set(.55,2.22,0);this.bodyGroup.add(this.leftArm,this.rightArm);
  for(const a of [this.leftArm,this.rightArm]){cyl(a,.2,.14,.75,[0,-.4,0],jacket,9);cyl(a,.14,.14,.21,[0,-.84,0],skin,9)}
  box(this.bodyGroup,[.09,.15,.09],[-.14,2.87,.34],dark);box(this.bodyGroup,[.09,.15,.09],[.14,2.87,.34],dark);
  this.survivorTarget=new THREE.Vector3(-1,ROOF+.25,1);this.survivorMode='idle';this.survivorDelay=0;
 }
 syncSurvivalInventory(game){
  const kit=game?.kit;if(!kit)return;
  this.activeKit=kit;
  this.supportSurvivor?.sync(game);
  if(this.rescueHelicopterVfx?.lastNewsId===null)this.rescueHelicopterVfx.lastNewsId=game.scavenge?.radioNewsId||0;
  // Existing rooftop remains unchanged. Only equipment acquired through
  // expeditions becomes visible, and GLB assets obey exactly the same rule.
  if(this.shelter)this.shelter.visible=Boolean(kit.tent);
  if(this.shelterAsset)this.shelterAsset.visible=Boolean(kit.tent);
  if(this.sleepBedding?.group)this.sleepBedding.group.visible=Boolean(kit.tent);
  if(this.life?.comms)this.life.comms.visible=Boolean(kit.radio);
  if(this.waterFilter)this.waterFilter.visible=Boolean(kit.purifier);
  if(this.botany?.cropLeafMesh)this.botany.cropLeafMesh.visible=Boolean(kit.seeds);
  if(this.botany?.fruitMesh)this.botany.fruitMesh.visible=Boolean(kit.seeds);
  if(this.botany?.stemMesh)this.botany.stemMesh.visible=Boolean(kit.seeds);
 }
 playCinematic(type){
  const played=this.cinematicMoment?.play(type)??false;
  if(played)this.eventPerformance?.play(type);
  return played;
 }
 setAction(action){return this.life?.request(action,true) ?? false;}
 async enableCampMusic(){return this.life?.music.enable();}
 toggleCampMusic(){if(this.life?.music.enabled){this.life.music.disable();return false;}return this.life?.music.enable();}
 createWeather(){
  // Unified, camera-stable atmospheric sky. Earlier four independent photo
  // cylinders created the conspicuous pale horizon band and obscured the moon.
  // Soft clouds are sampled from a single seamless noise field in sky space.
  const g=new THREE.SphereGeometry(1490,48,32);
  // Retain the authored seamless cloud texture as a compatibility/detail asset;
  // rectangular weather cards are no longer used anywhere in the scene.
  const cloudTexture=new THREE.TextureLoader().load('./assets/materials/botany/cloud_volume.png');
  cloudTexture.wrapS=cloudTexture.wrapT=THREE.RepeatWrapping;cloudTexture.anisotropy=4;
  this.skyCloudTexture=cloudTexture;
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,
   uniforms:{uTop:{value:color('#345b83')},uHorizon:{value:color('#9fb7bd')},uBottom:{value:color('#738491')},
    uSun:{value:.7},uSunDir:{value:new THREE.Vector3(.1,.65,.5)},uCloudCover:{value:.2},uTime:{value:0},uNight:{value:0},uStorm:{value:0},uCloudMap:{value:cloudTexture}},
   vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`precision highp float;
    varying vec3 vDir;uniform vec3 uTop,uHorizon,uBottom,uSunDir;
    uniform float uSun,uCloudCover,uTime,uNight,uStorm;uniform sampler2D uCloudMap;
    float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
    float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1.,0.,0.)),f.x),mix(h(i+vec3(0.,1.,0.)),h(i+vec3(1.,1.,0.)),f.x),f.y),
      mix(mix(h(i+vec3(0.,0.,1.)),h(i+vec3(1.,0.,1.)),f.x),mix(h(i+vec3(0.,1.,1.)),h(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
    float fbm(vec3 p){float r=0.;float w=.54;for(int i=0;i<4;i++){r+=noise3(p)*w;p=p*2.03+vec3(4.1,7.7,3.1);w*=.49;}return r;}
    void main(){
     vec3 d=normalize(vDir);float y=d.y;
     float horizon=smoothstep(-.16,.38,y);
     vec3 sky=mix(uHorizon,uTop,pow(horizon,.86));
     sky=mix(uBottom,sky,smoothstep(-.41,-.055,y));
     float sunAngle=max(0.,dot(d,normalize(uSunDir)));
     float scatter=pow(sunAngle,13.);
     sky+=vec3(1.,.48,.17)*scatter*uSun*.24;
     float cover=clamp(uCloudCover+uStorm*.15,0.,1.);
     vec3 flow=vec3(uTime*(.0022+cover*.0031),uTime*.00015,-uTime*.0014);
     vec3 p=d*3.15+flow;
     float broad=fbm(p);
     float billow=fbm(p*1.78+vec3(6.4,2.8,9.1));
     float detail=fbm(p*3.7+vec3(12.2,5.3,2.7));
     float field=broad*.67+billow*.26+detail*.07;
     float cloudShape=smoothstep(mix(.62,.24,cover),mix(.76,.43,cover),field);
     float altitude=smoothstep(-.045,.16,y)*(1.-smoothstep(.88,1.,y)*.22);
     float veil=smoothstep(.50,1.,cover)*smoothstep(-.05,.24,y)*(1.-smoothstep(.62,.95,y))*.24;
     vec3 cloudLight=mix(vec3(.60,.66,.70),vec3(.86,.87,.84),clamp(.34+billow*.58+sunAngle*.22,0.,1.));
     vec3 cloudDark=mix(vec3(.35,.40,.44),vec3(.12,.16,.21),uStorm*.82);
     vec3 cloudColor=mix(cloudDark,cloudLight,clamp(.50+detail*.22-uStorm*.33,0.,1.));
     cloudColor=mix(cloudColor,vec3(.10,.14,.20),uNight*.72);
     float cloudAlpha=max(cloudShape*altitude*(.30+.60*cover),veil);
     sky=mix(sky,cloudColor,clamp(cloudAlpha,0.,.88));
     gl_FragColor=vec4(max(sky,vec3(0.)),1.);
    }`});
  this.sky=new THREE.Mesh(g,m);this.sky.renderOrder=-15;this.scene.add(this.sky);
  // Stars only visible at night
  const stars=new Float32Array(450*3);for(let i=0;i<450;i++){let a=RAND(i+3)*6.28,el=RAND(i+14)*1.2+.11;stars[i*3]=1390*Math.cos(a)*Math.cos(el);stars[i*3+1]=1390*Math.sin(el);stars[i*3+2]=1390*Math.sin(a)*Math.cos(el)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(stars,3));this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:'#d4e4f7',size:1.3,transparent:true,opacity:0,depthWrite:false}));this.scene.add(this.stars);
  this.clouds=[];const cloudMat=new THREE.MeshStandardMaterial({color:'#c7d3d8',transparent:true,opacity:.36,roughness:1,depthWrite:false});
  // Former low-poly sphere clouds were removed; layered soft 3D sprites render in AdvancedWeather.
  const rainCount=this.isMobile?740:1700;const rPos=new Float32Array(rainCount*6);for(let i=0;i<rainCount;i++){let j=i*6;rPos[j]=(RAND(i+1)-.5)*65;rPos[j+1]=ROOF+RAND(i*7+2)*38;rPos[j+2]=(RAND(i*9+2)-.5)*65;rPos[j+3]=rPos[j]-.1;rPos[j+4]=rPos[j+1]-1.25;rPos[j+5]=rPos[j+2];}
  this.rainPos=rPos;const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rPos,3).setUsage(THREE.DynamicDrawUsage));this.rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:'#b9d3e5',transparent:true,opacity:.0,depthWrite:false}));this.rain.frustumCulled=false;this.scene.add(this.rain);
  // Replaced distant cone + ring-stack and static lightning with the new
  // full 3D close-range cinematic vortex and branching storm bolts.
  // 3D dust particles
  const dustPos=new Float32Array(320*3);for(let i=0;i<320;i++){dustPos[i*3]=(RAND(i+300)-.5)*180;dustPos[i*3+1]=ROOF+RAND(i+3004)*30;dustPos[i*3+2]=(RAND(i+3008)-.5)*180}const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dustPos,3).setUsage(THREE.DynamicDrawUsage));this.dustPos=dustPos;this.dust=new THREE.Points(dg,new THREE.PointsMaterial({color:'#9e9980',size:.8,transparent:true,opacity:0,depthWrite:false}));this.scene.add(this.dust);
  this.weatherMix=0;this.hazeLevel=0;this.tornadoFade=0;this.thunderAt=5;this.flashTime=0;
  this.advancedWeather=new AdvancedWeather(this.scene,ROOF,this.isMobile);
  this.advancedWeather.legacyTornadoDisabled=true;
  this.cinematicTornado=new NearTornadoVfx(this);
  // Camera-aware GPU precipitation and continuous weather sky. Replaces the
  // old bright rain lines / constant-opacity snow points, never the gameplay.
  this.advancedWeather.legacyPrecipitationDisabled=true;
  this.weatherVfx=new CinematicWeatherVfx(this.scene,ROOF,this.isMobile);
  // Clouds are now integrated directly into the always-visible base sky shader.
  // Keep the secondary cloud sphere disabled to avoid a second full-screen pass.
  this.weatherVfx.clouds.visible=false;
  this.rain.visible=false;
 }
 createAtmosphericBackdrops(){
  // All sky and moving clouds are rendered in ONE continuous 3D sky dome.
  // Keep the legacy handle for compatibility; no 2D photo cylinder is mounted.
  this.skyWeatherLayers={};
 }
 setWeather(key){if(key==='tornado'&&this.previewWeather==='tornado')this._rerollTornado=true;this.previewWeather=key==='auto'?null:key;}
 async toggleWeatherSound(){return this.weatherAudio.toggle();}
 setHour(value){this.previewHour=value===null?null:Number(value)}
 setLunarPreviewOffset(days=0){this.previewLunarOffset=Number.isFinite(days)?days:0;}
 setCameraView(view='cinematic'){
  // Deliberately interpolate the *existing* 3D camera. Never jump, swap to a
  // portrait image or move the city's actual world-space coordinates.
  const mobile=window.innerWidth<800;
  this.cinematicMoment?.cancel();
  this.focusSurvivor=view==='survivor'||view==='portrait';
  const target=view==='portrait'?{pitch:1.35,radius:mobile?5.4:4.45}:
    view==='survivor'?{pitch:1.21,radius:mobile?14.4:12.5}:
    view==='overhead'?{pitch:.66,radius:mobile?81:74}:
    {pitch:mobile?1.26:1.29,radius:mobile?84:79};
  this.cameraTransition=target;
  this.focusLookHeight=view==='portrait'?2.22:1.9;
  this.cityLookHeight=view==='overhead'?2.1:3.3;
 }
 setQuality(value){
  const quality=['auto','low','high'].includes(value)?value:'auto';
  const mobile=this.isMobile;
  const low=this.gpuSafeMode||quality==='low'||(!mobile&&quality==='auto'&&innerWidth<700);
  if(mobile)this.mobileQuality=quality;
  const profile=mobile?mobile3DQualityProfile({
   quality,devicePixelRatio:window.devicePixelRatio||1,
   width:this.canvas.clientWidth||innerWidth,height:this.canvas.clientHeight||innerHeight,
   gpuSafeMode:this.gpuSafeMode,adaptiveFactor:this.mobileAdaptiveFactor
  }):null;
  const ratio=mobile?profile.pixelRatio:Math.min(devicePixelRatio,low?1.15:1.8);
  if(Math.abs(this.renderer.getPixelRatio()-ratio)>.005)this.renderer.setPixelRatio(ratio);
  const shadowSize=mobile?profile.shadowSize:low?1024:4096;
  // Avoid GPU shadow atlas disposal when only the DPR or quality selector
  // changes between two settings that share the same shadow resolution.
  if(this.sun.shadow.mapSize.x!==shadowSize){
   this.sun.shadow.mapSize.set(shadowSize,shadowSize);
   this.sun.shadow.map?.dispose();
   this.sun.shadow.map=null;
  }
  this.renderer.shadowMap.enabled=!this.gpuSafeMode;
  this.premiumAssetFinish?.setQuality(low);
  this.cinematicPost?.setQuality(low);
  this.resize();
 }
 trackMobilePerformance(){
  if(!this.isMobile||!this.running||this.gpuSafeMode)return;
  const now=performance.now();
  if(now-this.mobilePerfBootAt<12000)return; // Wait for WebGL/GLB warmup.
  if(!this.mobilePerfWindowStarted)this.mobilePerfWindowStarted=now;
  this.mobilePerfFrames++;
  const elapsedMs=now-this.mobilePerfWindowStarted;
  if(elapsedMs<3200)return;
  this.mobileMeasuredFps=Math.round(this.mobilePerfFrames*1000/Math.max(1,elapsedMs));
  if(this.mobileQuality==='auto'){
   const next=nextMobile3DAutoFactor(this.mobileAdaptiveFactor,{
    fps:this.mobileMeasuredFps,frames:this.mobilePerfFrames,elapsedMs
   });
   if(next!==this.mobileAdaptiveFactor){
    this.mobileAdaptiveFactor=next;
    this.setQuality('auto');
   }
  }
  this.mobilePerfWindowStarted=now;this.mobilePerfFrames=0;
 }
 mobilePerformanceSnapshot(){
  const ctx=this.renderer.getContext();
  return {
   quality:this.mobileQuality,pixelRatio:this.renderer.getPixelRatio(),
   fps:this.mobileMeasuredFps,shadowSize:this.sun.shadow.mapSize.x,
   msaa:Boolean(ctx?.getContextAttributes?.()?.antialias),
   drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,
   gpuSafeMode:this.gpuSafeMode,culledShadows:this.mobileCulledShadowCasters||0,
   renderedFrames:this.mobileDrawCount,
   targetFps:this.mobileQuality==='high'?null:30
  };
 }
 update(dt,now,game,cinematicDt=dt){
  this.syncSurvivalInventory(game);
  // Accelerated 2×/4× also advances physical weather and survivor animation.
  dt=Math.min(dt,.12);this.simulatedWeather=game.weather;const preset=this.previewWeather||game.weather;
  const rain=['rain','storm','tornado'].includes(preset),storm=['storm','tornado'].includes(preset),heat=preset==='heat',cold=preset==='cold',dustStorm=preset==='dust',wildfire=preset==='wildfire';
  this.visualWeather=integrateWeather(this.visualWeather,preset,dt,4.7);
  const vw=this.visualWeather;const dustLevel=vw.dust||0,wildfireLevel=vw.wildfire||0;this.weatherMix=vw.rain;
  const solar=solarPositionForSeoul(now,this.previewHour);
  // Real date/time drives both bodies. Preview is visual-only.
  const lunar=moonPositionForSeoul(now+(this.previewLunarOffset||0)*86400000,this.previewHour);
  const sunAltitude=Math.sin(solar.altitude);const night=clamp((.12-sunAltitude)*1.7,0,1),twilight=clamp(1-Math.abs(sunAltitude)*2.7,0,1);
  const hazeTarget=Math.max(vw.mist,dustLevel*.48,wildfireLevel*.84);this.hazeLevel=THREE.MathUtils.damp(this.hazeLevel,hazeTarget,.32,dt);const haze=this.hazeLevel;
  const dayTop=new THREE.Color('#405b6b'),nightTop=new THREE.Color('#0e1824'),stormTop=new THREE.Color('#232c35');const horizon=new THREE.Color('#9caeaf').lerp(new THREE.Color('#d99e72'),twilight*.83).lerp(new THREE.Color('#283a47'),night*.92).lerp(new THREE.Color('#626d72'),haze*.72);
  const top=dayTop.lerp(nightTop,night*.96).lerp(stormTop,haze*.85);
  if(heat){top.lerp(new THREE.Color('#b2ac88'),.38);horizon.lerp(new THREE.Color('#dfb77b'),.5)}if(cold){top.lerp(new THREE.Color('#9bb9cd'),.3)}if(dustStorm){top.lerp(new THREE.Color('#6f6252'),.56);horizon.lerp(new THREE.Color('#b28b59'),.72)}if(wildfire){top.lerp(new THREE.Color('#483f3a'),.58);horizon.lerp(new THREE.Color('#a75a34'),.66)}
  this.sky.material.uniforms.uTop.value.copy(top);this.sky.material.uniforms.uHorizon.value.copy(horizon);this.sky.material.uniforms.uBottom.value.copy(horizon).multiplyScalar(THREE.MathUtils.lerp(.92,.48,night));
  this.sky.material.uniforms.uSun.value=Math.max(0,sunAltitude)*(.28+twilight*.26)*(1-vw.cloud*.7);this.sky.material.uniforms.uCloudCover.value=vw.cloud;this.sky.material.uniforms.uNight.value=night;this.sky.material.uniforms.uStorm.value=vw.storm;this.sky.material.uniforms.uTime.value+=dt;
  this.scene.fog.color.copy(horizon);const disasterFog=depthAtmosphere(haze,night).fogDensity+dustLevel*.00032+wildfireLevel*.00072;this.scene.fog.density=THREE.MathUtils.damp(this.scene.fog.density,disasterFog,.42,dt);
  this.sun.position.set(Math.sin(solar.azimuth)*90,Math.max(-12,sunAltitude*98),-Math.cos(solar.azimuth)*90);this.sky.material.uniforms.uSunDir.value.copy(this.sun.position).normalize();this.sun.intensity=Math.max(.10,3.6*Math.max(0,sunAltitude)+twilight*.9)*(1-haze*.20)*weatherCloudShadow(vw.cloud)*(1-vw.storm*.18)*(1-dustLevel*.42)*(1-wildfireLevel*.28);this.sun.color.set(wildfire?'#ffab72':dustStorm?'#e3bd82':heat?'#ffefb3':twilight>.27?'#ffb46b':'#e9f1ff');this.ambient.intensity=Math.max(.34,1.30-night*.37-haze*.20-vw.storm*.13-dustLevel*.12-wildfireLevel*.15);this.fill.intensity=.47+night*.16+wildfireLevel*.04;
  this.renderer.toneMappingExposure=THREE.MathUtils.lerp(this.renderer.toneMappingExposure,1.27+twilight*.06+night*.035-vw.storm*.035-dustLevel*.08-wildfireLevel*.045,Math.min(1,dt*1.35));
  this.scene.environmentIntensity=.64-night*.16-haze*.07-dustLevel*.08-wildfireLevel*.06;this.fireLight.intensity=(8.4+night*7.0)*(1-vw.rain*.23)*(1+Math.sin(performance.now()*.017)*.08);
  this.stars.material.opacity=THREE.MathUtils.lerp(this.stars.material.opacity,night*.78*(1-vw.cloud*.9)*(1-vw.storm*.8)*(1-dustLevel*.98)*(1-wildfireLevel*.96),Math.min(1,dt));
  // Clouds now fade naturally inside the unified atmospheric shader.
  this.cityAtmosphere.update(dt,vw,night,horizon);this.groundMist.update(dt,vw,horizon);this.cityInfill?.update(night);
  if(this.cityMaterialCache){
   for(const mats of this.cityMaterialCache.values()){
    const m=mats[0];m.emissiveIntensity=THREE.MathUtils.damp(m.emissiveIntensity,Math.max(0,night*.95+vw.storm*.25),.65,dt);
   }
  }
  if(this.campDetailLights)for(const light of this.campDetailLights){light.intensity=light.userData.baseIntensity||light.intensity; if(!light.userData.baseIntensity)light.userData.baseIntensity=light.intensity;light.intensity=light.userData.baseIntensity*(.8+night*.9+storm*.16);}
  const targetCloud=haze?Math.min(.93,.25+haze*.5):heat?.22:.33;
  for(let i=0;i<this.clouds.length;i++){
   const p=this.clouds[i];p.position.x+=dt*(storm?4.3:rain?2.4:.35);if(p.position.x>250)p.position.x=-250;
   for(const m of p.children){m.material.opacity=THREE.MathUtils.lerp(m.material.opacity,targetCloud,Math.min(1,dt*.36));m.material.color.set(haze?'#626c74':'#c5cdd0');}
  }
  this.wetness=THREE.MathUtils.damp(this.wetness,vw.wet,.15,dt);
  if(this.tarpMaterial){this.tarpMaterial.color.setScalar(1-this.wetness*.24);this.tarpMaterial.roughness=.92-this.wetness*.23;}
  if(this.roofSurfaceMaterial){this.roofSurfaceMaterial.roughness=THREE.MathUtils.lerp(.85,.32,this.wetness);this.roofSurfaceMaterial.metalness=THREE.MathUtils.lerp(.035,.10,this.wetness);this.roofSurfaceMaterial.clearcoat=THREE.MathUtils.lerp(.23,.84,this.wetness);this.roofSurfaceMaterial.clearcoatRoughness=THREE.MathUtils.lerp(.47,.12,this.wetness);}
  for(const puddle of this.puddles)puddle.material.opacity=.43*this.wetness;
  // V1.0: do not draw the former screen-bright line rain. The new weatherVfx
  // evaluates individual wind-driven 3D raindrops on the GPU with depth tests.
  this.rain.material.opacity=0;this.rain.visible=false;
  this.dust.material.opacity=0;this.dust.visible=false; // v8.1 premium disaster VFX owns airborne dust.
  // Each tornado onset selects a new intact neighborhood; tracks and ruins survive reloads.
  const tornadoNow=preset==='tornado';
  if(!Array.isArray(game.tornadoDamagedIds))game.tornadoDamagedIds=[];
  // v2 migration: drop the old fixed spawn track, but NEVER clear ruined buildings.
  // Previous saves can contain the legacy fixed IDs even after upgrading the code.
  if(game.tornadoSpawnVersion!==2){
    game.tornadoSpawnVersion=2;
    game.tornadoCurrentSites=[];
    game.tornadoPreviousCenterId=null;
    game.tornadoEncounterActive=false;
    game.tornadoEpisodeDamageCount=0;
    this.onTornadoEncounterChange?.();
  }
  if(!game.tornadoDamagedIds.length&&game.tornadoDamageCount>0){
    game.tornadoDamagedIds=selectStormBuildings(this.distantCityPlan).slice(0,Math.min(3,game.tornadoDamageCount)).map(s=>s.id);
    this.onTornadoEncounterChange?.();
  }
  if(this._tornadoWasActive!==tornadoNow||(tornadoNow&&this._rerollTornado)||
     (tornadoNow&&game.tornadoEncounterActive&&game.tornadoPreview!==Boolean(this.previewWeather==='tornado'))){
    if(tornadoNow){
      if(this._rerollTornado||!(game.tornadoEncounterActive&&game.tornadoCurrentSites?.length)){
        const next=(Number(game.tornadoEncounter)||0)+1;
        const track=selectVariedStormBuildings(this.distantCityPlan,{
          seed:Math.floor(Math.random()*0x7fffffff)+next*7919,
          previousCenterId:game.tornadoPreviousCenterId,
          damagedIds:[...(game.tornadoDamagedIds||[]),...(game.ambientCollapseIds||[])]
        });
        game.tornadoCurrentSites=track.map(s=>s.id);
        game.tornadoPreviousCenterId=track[Math.floor(track.length/2)]?.id||null;
        beginTornadoEncounter(game,now,{preview:!!this.previewWeather});
        this.onTornadoEncounterChange?.();
      }
    }else if(game.tornadoEncounterActive){
      game.tornadoEncounterActive=false;
      this.onTornadoEncounterChange?.();
    }
    this._tornadoWasActive=tornadoNow;this._rerollTornado=false;
  }
  // 3D storm permanently damages the city, including when triggered by weather preview.
  this.tornadoFade=vw.tornado;
  this.advancedWeather.update(dt,vw,night,storm);
  const nearFlash=this.cinematicTornado.update(dt,vw.tornado,{
   persistedCount:game.tornadoEpisodeDamageCount||0,
   permanentIds:game.tornadoDamagedIds,
   trackIds:game.tornadoCurrentSites,
   approach:game.tornadoApproach,
   encounterId:game.tornadoEncounter,
   preview:this.previewWeather==='tornado',
   night,reduceMotion:this.reducedMotion,
   onImpact:(id,index)=>this.onTornadoImpact?.(id,index),
   onRooftopPass:mode=>{if(!this.previewWeather)this.onTornadoClosePass?.(mode);}
  });
  // A fast multi-stroke lightning pulse brightens the actual roof/city lights,
  // not only the bolt sprite. The next frame resets from solar/weather values.
  const lightningStrength=Math.min(1,this.advancedWeather.farFlash.intensity/5.8+nearFlash*.76);
  this.ambient.intensity+=lightningStrength*1.65;
  this.fill.intensity+=lightningStrength*.95;
  this.weatherVfx.update(dt,vw,night,this.sun.position,twilight,lightningStrength);
  this.premiumDisasterVfx?.update(dt,vw,night);
  this.cinematic?.update(dt,vw,night);this.premiumEnvironment?.update(dt,vw,night,performance.now()*.001);updateSurvivorArt(this,vw);animateSurvivorFinishingV130(this,performance.now()*.001,vw.wind||0);this.weatherAudio.update(vw,(this.advancedWeather.flashTime>0 && this.advancedWeather.flashTime>=.105)||nearFlash>.60,preset);
  // SurvivorLife controls physical movement, location-aware gestures and seating.
  this.life.update(dt,now,game,preset);
  this.rescueHelicopterVfx?.update(cinematicDt,game.scavenge?.radioNewsId,game.scavenge?.radioNewsType);
  this.beardedSurvivor?.update(dt,this.life);
  this.supportSurvivor?.update(dt,game);
  this.eventPerformance?.update(cinematicDt,{reducedMotion:this.reducedMotion,weather:preset});
  this.premiumStage?.update(dt,vw,night);
  this.apocalypseSetDressing?.update(dt,vw,night);
  this.horizonWorld?.update(dt,vw,night);
  this.premiumRuinedCity?.update(dt,vw,night);
  this.premiumStreet?.update(dt,vw,night);
  this.premiumCinematicCity?.update(dt,vw,night,twilight);
  this.premiumFacadeDensity?.update(dt,vw,night);
  this.premiumUrbanSilhouette?.update(dt,vw,night,game);
  this.premiumLandmarkRuins?.update(dt,vw,night,game);
  this.premiumWeatherSurfaces?.update(dt,vw,night,lightningStrength);
  this.premiumNightLighting?.update(dt,vw,night,twilight,lightningStrength,lunar,game);
  this.premiumCollapseAftermath?.update(dt,vw,night,game);
  this.ambientCityCollapse?.update(dt,now,game,vw);
  this.premiumAssetFinish?.update(dt,vw,night);
  this.premiumMicroSurface?.update(dt);
  this.premiumWetMaterial?.update(dt,vw);
  const t=performance.now()*.001;
  if(this.tarpMesh){const arr=this.tarpMesh.geometry.attributes.position.array,original=this.tarpVerts;
   for(let i=0;i<arr.length;i+=3)arr[i+1]=original[i+1]+Math.sin(t*2+original[i]*.7+original[i+2])*(.055+vw.wind*.20);
   this.tarpMesh.geometry.attributes.position.needsUpdate=true;
   const normalBucket=Math.floor(t*10/8);
   if(normalBucket!==this._lastTarpNormalBucket){
    this._lastTarpNormalBucket=normalBucket;
    this.tarpMesh.geometry.computeVertexNormals();
   }}
  // Local PBR GLB canopy sways in actual wind, retaining its authored UVs and silhouette.
  if(this.heroCanopyMesh&&this.heroCanopyVerts){
   const p=this.heroCanopyMesh.geometry.attributes.position,base=this.heroCanopyVerts;
   for(let i=0;i<p.array.length;i+=3){
    const x=base[i],z=base[i+2];
    p.array[i+1]=base[i+1]+Math.sin(t*1.3+x*.42+z*.27)*(0.012+vw.wind*.15);
   }
   p.needsUpdate=true;
   const normalBucket=Math.floor(t*8/5);
   if(normalBucket!==this._lastCanopyNormalBucket){
    this._lastCanopyNormalBucket=normalBucket;
    this.heroCanopyMesh.geometry.computeVertexNormals();
   }
  }
  for(let i=0;i<this.flames.length;i++){let f=this.flames[i];f.scale.y=.65+Math.sin(t*9+i*3)*.27;f.rotation.z=Math.sin(t*4+i)*.2;}
  if(this.cameraTransition){
   this.pitch=THREE.MathUtils.damp(this.pitch,this.cameraTransition.pitch,2.7,dt);
   this.radius=THREE.MathUtils.damp(this.radius,this.cameraTransition.radius,3.7,dt);
   if(Math.abs(this.radius-this.cameraTransition.radius)<.05&&Math.abs(this.pitch-this.cameraTransition.pitch)<.008)this.cameraTransition=null;
  }
  if(this.focusSurvivor){this.target.x=THREE.MathUtils.damp(this.target.x,this.survivor.position.x,2.2,dt);this.target.y=THREE.MathUtils.damp(this.target.y,this.ROOF_Y+(this.focusLookHeight||1.9),2.2,dt);this.target.z=THREE.MathUtils.damp(this.target.z,this.survivor.position.z,2.2,dt);}
  else {this.target.x=THREE.MathUtils.damp(this.target.x,0,2.2,dt);this.target.y=THREE.MathUtils.damp(this.target.y,this.ROOF_Y+(this.cityLookHeight||3.3),2.2,dt);this.target.z=THREE.MathUtils.damp(this.target.z,0,2.2,dt);}
  const sy=Math.cos(this.pitch)*this.radius,rr=Math.sin(this.pitch)*this.radius;
  this.camera.position.set(this.target.x+Math.sin(this.yaw)*rr,this.target.y+sy,this.target.z+Math.cos(this.yaw)*rr);
  // A subtle frame vibration communicates tornado scale without shifting
  // collision, clock, or survival state. Respect OS reduced-motion.
  if(!this.reducedMotion){
   const tremor=Math.min(.17,vw.tornado*.038+nearFlash*.10)*(this.isMobile?.45:1);
   this.camera.position.x+=Math.sin(t*15.3)*tremor;
   this.camera.position.y+=Math.sin(t*12.7+1.8)*tremor*.48;
  }
  this.camera.lookAt(this.target);
  this.cinematicMoment?.update(cinematicDt,this.camera,this.target,this.reducedMotion);
  this.premiumAtmosphere?.update(dt,vw,night,lightningStrength);
  this.celestialSky.update(this.camera,solar,lunar,vw.cloud,vw.storm);
  this.cinematicPost?.updateLook(vw,night,twilight);
  // Keep the full simulation/clock/weather updates on every rAF iteration.
  // Only skip redundant GPU submissions on small screens; desktop is untouched.
  const renderNow=performance.now();
  if(shouldRenderMobile3DFrame({
   isMobile:this.isMobile,quality:this.mobileQuality,
   now:renderNow,lastRenderAt:this._lastMobileRenderAt
  })){
   if(this.cinematicPost)this.cinematicPost.render();
   else this.renderer.render(this.scene,this.camera);
   this._lastMobileRenderAt=renderNow;
   this.mobileDrawCount++;
   this.trackMobilePerformance();
  }
 }
 async start(){try{await this.assets.initPromise;}catch{}this.running=true;this.report('GitHub 3D 리소스 로딩 중…');}
 dispose(){this.premiumDisasterVfx?.dispose();this.eventPerformance?.dispose();this.premiumWetMaterial?.dispose();this.premiumMicroSurface?.dispose();this.ambientCityCollapse?.dispose();this.premiumCollapseAftermath?.dispose();this.premiumNightLighting?.dispose();this.premiumWeatherSurfaces?.dispose();this.premiumLandmarkRuins?.dispose();this.premiumUrbanSilhouette?.dispose();this.premiumFacadeDensity?.dispose();this.premiumCinematicCity?.dispose();this.premiumStreet?.dispose();this.premiumRuinedCity?.dispose();this.premiumAssetFinish?.dispose();this.cinematicMoment?.dispose();this.premiumAtmosphere?.dispose();this.supportSurvivor?.dispose();this.rescueHelicopterVfx?.dispose();this.sleepBedding?.dispose();this.beardedSurvivor?.dispose();this.horizonWorld?.dispose();this.apocalypseSetDressing?.dispose();this.cityAtmosphere?.dispose?.();this.premiumStage?.dispose();this.life?.dispose();this.weatherVfx?.dispose();this.cinematicTornado?.dispose();this.celestialSky?.dispose();this.premiumEnvironment?.dispose();this.botany?.dispose();this.skyCloudTexture?.dispose();this.sky?.geometry.dispose();this.sky?.material.dispose();this.cinematicPost?.dispose();this.renderer.dispose()}
}

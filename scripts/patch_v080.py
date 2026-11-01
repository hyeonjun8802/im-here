from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/world.js'
s=p.read_text()
def replace(a,b):
 global s
 n=s.count(a)
 if n!=1:raise RuntimeError(f'Expected one match ({n}) for {a[:90]}')
 s=s.replace(a,b)

replace("import {WeatherAudio} from './weatherAudio.js';", "import {WeatherAudio} from './weatherAudio.js';\nimport {CinematicStage} from './cinematicStage.js';")
replace("const materials={concrete:mat('#777b73'),concreteLight:mat('#929188'),edge:mat('#5b615c'),rust:mat('#855b46',.86,.55),metal:mat('#777e7a',.59,.65),wood:mat('#665647'),tar:mat('#353d3f'),tarp:mat('#686f57'),rope:mat('#a3a087'),soil:mat('#4a3d31'),plant:mat('#556e4b'),lamp:", "const materials={concrete:mat('#777a72'),concreteLight:mat('#83877f'),edge:mat('#515c55'),rust:mat('#94664e',.8,.32),metal:mat('#a6a7a0',.5,.32),wood:mat('#65513e'),tar:mat('#252d2b'),tarp:mat('#585d48'),rope:mat('#a3a087'),soil:mat('#4a3d31'),plant:mat('#556e4b'),lamp:")
replace("for(const [key,name,repeat] of pbr)loadPBR(materials[key],name,repeat);", "for(const [key,name,repeat] of pbr)loadPBR(materials[key],name,repeat);\nfunction loadCinematicRoof(target){\n const base='./assets/materials/cinematic/roof_cinematic';\n materialLoader.load(base+'_albedo.jpg',t=>{target.map=configureTexture(t,1,true);target.color.set('#ffffff');target.needsUpdate=true;},undefined,e=>console.warn('Roof albedo',e));\n materialLoader.load(base+'_normal.jpg',t=>{target.normalMap=configureTexture(t,1);target.normalScale.set(.52,.52);target.needsUpdate=true;},undefined,e=>console.warn('Roof normal',e));\n materialLoader.load(base+'_roughness.png',t=>{target.roughnessMap=configureTexture(t,1);target.needsUpdate=true;},undefined,e=>console.warn('Roof roughness',e));\n}")
replace("this.scene.fog=new THREE.FogExp2('#7c8991',.0018)","this.scene.fog=new THREE.FogExp2('#88918d',.00085)")
replace("this.renderer.toneMappingExposure=1.03", "this.renderer.toneMappingExposure=1.21")
replace("this.scene.add(new THREE.HemisphereLight('#b5ccdc','#262b2b',1.08))", "this.scene.add(new THREE.HemisphereLight('#c3cfcb','#45433c',1.35))")
replace("this.fireLight=new THREE.PointLight('#ffad55',7.5,30,2)","this.fireLight=new THREE.PointLight('#ffb262',11.5,34,2)")
replace("this.camera=new THREE.PerspectiveCamera(mobile?52:44,window.innerWidth/window.innerHeight,.15,950);this.target=new THREE.Vector3(0,ROOF+2,0);this.yaw=.72;this.pitch=mobile?.71:.67;this.radius=mobile?99:70;this.minRadius=42;this.maxRadius=155;this.setupControls();", "this.camera=new THREE.PerspectiveCamera(mobile?52:48,window.innerWidth/window.innerHeight,.15,950);this.target=new THREE.Vector3(0,ROOF+3.3,0);this.yaw=.78;this.pitch=mobile?1.03:1.10;this.radius=mobile?81:76;this.minRadius=44;this.maxRadius=155;this.setupControls();")
replace("this.createEnvironment();this.createRoof();this.createRoofProps();decorateHeroRooftop(this.scene,ROOF,this);upgradeCampFacilities(this);this.createSurvivor();this.createWeather();this.createAtmosphericBackdrops();", "this.createEnvironment();this.createRoof();this.createRoofProps();decorateHeroRooftop(this.scene,ROOF,this);upgradeCampFacilities(this);this.createSurvivor();this.createWeather();this.createAtmosphericBackdrops();this.cinematic=new CinematicStage(this);")
replace("this.camera.fov=w<680?53:44", "this.camera.fov=w<680?53:48")
replace("const roofmat=new THREE.MeshPhysicalMaterial({color:'#ffffff',map:seededNoiseTexture(),roughness:.79,metalness:.03,clearcoat:.36,clearcoatRoughness:.38});loadPBR(roofmat,'roof_concrete',5);", "const roofmat=new THREE.MeshPhysicalMaterial({color:'#686e66',roughness:.80,metalness:0,clearcoat:.28,clearcoatRoughness:.42});loadCinematicRoof(roofmat);")
old="""  // actual tile/expansion-joint geometry and tar patches, avoiding empty grey plane.
  for(let i=-4;i<=4;i++){
    box(this.roof,[.1,.019,44],[i*4.9,ROOF+.161,0],materials.tar);
    box(this.roof,[44,.019,.1],[0,ROOF+.16,i*4.9],materials.tar);
  }
  for(let i=0;i<35;i++){
    const x=(RAND(i+1)-.5)*42,z=(RAND(i+91)-.5)*42;
    if(Math.abs(x)<7&&Math.abs(z)<9)continue;
    const plate=box(this.roof,[1+RAND(i+5)*2,.024,.2+RAND(i+7)*1.2],[x,ROOF+.19,z],i%4?materials.concreteLight:materials.tar,[0,RAND(i+4)*6.28,0]);plate.castShadow=false;
  }
"""
new="""  // No artificial 9x9 straight-line grid. Realistic nonrepeating concrete is baked
  // into the roof UV atlas. Only physically plausible, sporadic repair strips remain.
  for(let i=0;i<13;i++){
    const x=(RAND(i+1)-.5)*40,z=(RAND(i+91)-.5)*40;
    if(x>-18&&x<-1&&z>-14&&z<0)continue;
    const patch=box(this.roof,[.35+RAND(i+5)*1.6,.012,.12+RAND(i+7)*.24],[x,ROOF+.156,z],materials.tar,[0,RAND(i+4)*6.28,0]);patch.castShadow=false;
  }
"""
replace(old,new)
old="""  this.puddles=[];for(let i=0;i<19;i++){const x=(RAND(i*4+40)-.5)*39,z=(RAND(i*2+50)-.5)*39;
    const p=new THREE.Mesh(new THREE.CircleGeometry(1,12),new THREE.MeshPhysicalMaterial({color:'#5f8494',transparent:true,opacity:0,metalness:.16,roughness:.18,clearcoat:.9,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(x,ROOF+.18,z);p.scale.set(1+RAND(i+3)*1.5,.4+RAND(i+82)*.7,1);this.roof.add(p);this.puddles.push(p);}
"""
replace(old,"  // Irregular PBR shallow pooling and wetness mask are authored by CinematicStage.\n  this.puddles=[];\n")
replace("const ty=4.95+1.18*(1-Math.abs(x)/6)-.28*Math.sin((z/10+.5)*Math.PI)+.12*Math.sin(i*2.1+j);", "const ty=4.72+1.70*(1-Math.abs(x)/6)-.38*Math.sin((z/10+.5)*Math.PI)+.18*Math.sin(i*.48+j*.27)+.055*Math.sin(i*2.1+j*1.7);")
replace("this.rain.material.opacity=this.weatherMix*(.55+.20*vw.storm)", "this.rain.material.opacity=this.weatherMix*(.22+.10*vw.storm)")
replace("this.scene.fog.density=THREE.MathUtils.lerp(this.scene.fog.density,.0011+haze*.00135,Math.min(1,dt*.5))", "this.scene.fog.density=THREE.MathUtils.lerp(this.scene.fog.density,.00072+haze*.0008,Math.min(1,dt*.5))")
replace("this.sun.intensity=Math.max(.04,3.0*Math.max(0,sunAltitude)+twilight*.6)*(1-haze*.45-vw.cloud*.18);", "this.sun.intensity=Math.max(.10,3.6*Math.max(0,sunAltitude)+twilight*.9)*(1-haze*.38-vw.cloud*.16);")
replace("this.ambient.intensity=1.04-night*.65-haze*.36;this.fill.intensity=.29+night*.14", "this.ambient.intensity=1.4-night*.56-haze*.23;this.fill.intensity=.50+night*.24")
replace("1.04+twilight*.08-night*.12", "1.22+twilight*.11-night*.15")
replace("this.fireLight.intensity=(5.1+night*4.9)","this.fireLight.intensity=(8.4+night*7.0)")
replace("  this.advancedWeather.update(dt,vw,night,storm);this.weatherAudio.update", "  this.advancedWeather.update(dt,vw,night,storm);this.cinematic?.update(dt,vw,night);this.weatherAudio.update")
# Introduce camera view control without touching survival or time.
replace(" setQuality(value){", " setCameraView(view='cinematic'){\n  const mobile=window.innerWidth<800;\n  this.pitch=view==='overhead'?.66:(mobile?1.03:1.10);\n  this.radius=view==='overhead'?(mobile?81:74):(mobile?81:76);\n  this.target.set(0,ROOF+(view==='overhead'?2.1:3.3),0);\n }\n setQuality(value){")
p.write_text(s)
print('Patched',p,len(s))

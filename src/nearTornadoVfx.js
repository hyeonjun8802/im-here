import * as THREE from 'three';
import {SPATIAL_LAYOUT} from './spatialLayout.js';

/**
 * AFTERDAY tornado set piece: physically placed, camera-orbit-safe 3D storm.
 * Reference direction: a charcoal wall cloud, broad violent funnel, turquoise-white
 * electrical branching and an actual 3D half-collapsed background building.
 * No flat tornado billboard or heroic-roof demolition. Preview never changes saves.
 */
const TAU=Math.PI*2;
const hash=n=>{const t=Math.sin(n*127.13+17.11)*43758.5453123;return t-Math.floor(t);};
const smooth=(a,b,x)=>{const k=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return k*k*(3-2*k);};

export function selectStormBuilding(slots=[]){
  const candidates=slots.filter(s=>s.tier==='mid' || s.tier==='near');
  // Behind the hero roof for the default +X/+Z camera, but visible while orbiting.
  return candidates.reduce((best,s)=>{
    const score=Math.hypot(s.x+91,s.z+96)+Math.abs(s.height-31)*.32;
    return score<(best?.score??Infinity)?{slot:s,score}:best;
  },null)?.slot||null;
}

/** Choose 3 real buildings along a short left-to-right sweep in the ruined city.
 * Never damage the inhabited rooftop; candidates must be outside 72 world units.
 * The previous centerpiece is retained so existing saves can be mapped to it. */
export function selectStormBuildings(slots=[],count=3){
  const center=selectStormBuilding(slots);
  if(!center)return [];
  const qualified=slots.filter(s=>(s.tier==='mid'||s.tier==='near')&&
    s.id!==center.id&&Math.hypot(s.x,s.z)>=72&&
    Math.hypot(s.x-center.x,s.z-center.z)<105&&
    Math.abs(s.z-center.z)<66);
  const byNear=(a,b)=>Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z);
  const left=qualified.filter(s=>s.x<center.x-7).sort(byNear)[0];
  const right=qualified.filter(s=>s.x>center.x+7).sort(byNear)[0];
  const chosen=[center,...[left,right].filter(Boolean)];
  for(const item of qualified.sort(byNear)){
    if(chosen.length>=Math.max(1,count))break;
    if(!chosen.includes(item)&&chosen.every(c=>Math.hypot(c.x-item.x,c.z-item.z)>13))chosen.push(item);
  }
  return chosen.sort((a,b)=>a.x-b.x).slice(0,Math.max(1,count));
}
/**
 * Select a different real-city neighborhood for each encounter.
 * Prefer intact towers, require a three-building sweep, and keep well away
 * from the last tornado center when the city layout permits.
 */
export function selectVariedStormBuildings(slots=[],{seed=1,previousCenterId=null,damagedIds=[]}={}){
  const ruined=new Set(damagedIds);
  const previous=slots.find(s=>s.id===previousCenterId);
  // The actual city is CONTRACTED to 47-235 units. The old near/mid + radius>=150
  // filter produced zero candidates and always returned the fixed legacy path.
  // Use real, visible lots in every city direction, outside the rooftop buffer.
  const minRadius=SPATIAL_LAYOUT.clearZoneRadius+16;
  const pool=slots.filter(s=>['near','mid','far'].includes(s.tier)&&
    Number.isFinite(s.x)&&Number.isFinite(s.z)&&Math.hypot(s.x,s.z)>=minRadius);
  if(!pool.length)return [];
  const bearing=s=>Math.atan2(s.z,s.x);
  const angularDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const candidates=[];
  for(const center of pool){
    const angle=bearing(center),radius=Math.hypot(center.x,center.z);
    const neighbors=pool.filter(s=>{
      if(s.id===center.id)return false;
      const distance=Math.hypot(s.x-center.x,s.z-center.z);
      return distance>16&&distance<142&&
        Math.abs(Math.hypot(s.x,s.z)-radius)<90;
    }).map(s=>({slot:s,turn:angularDifference(bearing(s),angle),
      distance:Math.hypot(s.x-center.x,s.z-center.z)}));
    // Neighbors on either side of the city ring form a real three-tower arc.
    const byNear=(a,b)=>a.distance-b.distance;
    const before=neighbors.filter(p=>p.turn<-.025).sort(byNear)[0]?.slot;
    const after=neighbors.filter(p=>p.turn>.025).sort(byNear)[0]?.slot;
    if(!before||!after)continue;
    const track=[before,center,after];
    candidates.push({center,track,
      broken:track.filter(s=>ruined.has(s.id)).length,
      separation:previous?Math.hypot(center.x-previous.x,center.z-previous.z):Infinity});
  }
  // Even in a sparse modded city, do not silently revert to a fixed coordinate.
  if(!candidates.length){
    const ordered=[...pool].sort((a,b)=>a.id.localeCompare(b.id));
    const first=ordered[Math.floor(hash((Number(seed)||1)*1.991+17)*ordered.length)];
    const nearest=ordered.filter(s=>s.id!==first.id).sort((a,b)=>
      Math.hypot(a.x-first.x,a.z-first.z)-Math.hypot(b.x-first.x,b.z-first.z));
    return [first,...nearest.slice(0,2)];
  }
  // Intact districts first; avoid both the previous center AND nearby districts.
  const fewest=Math.min(...candidates.map(c=>c.broken));
  let choices=candidates.filter(c=>c.broken===fewest);
  if(previous){
    const distant=choices.filter(c=>c.separation>=170);
    if(distant.length)choices=distant;
    else{
      const different=choices.filter(c=>c.center.id!==previous.id);
      if(different.length)choices=different;
    }
  }
  choices.sort((a,b)=>a.center.id.localeCompare(b.center.id));
  const n=Math.abs(Math.floor(Number(seed)||1));
  return choices[Math.floor(hash(n*1.991+17)*choices.length)].track;
}
/** Close but never crossing the one playable roof. */
export function stormTrackPoint(slot){
  const x=slot.x+Math.sign(slot.x||-1)*6,z=slot.z+Math.sign(slot.z||-1)*6;
  const distance=Math.hypot(x,z),factor=Math.max(1,(SPATIAL_LAYOUT.clearZoneRadius+16)/Math.max(1,distance));
  return [x*factor,-23.4,z*factor];
}

function addBox(group,size,position,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  mesh.position.set(...position);mesh.castShadow=false;mesh.receiveShadow=true;
  group.add(mesh);return mesh;
}
function makeLightning(seed){
  const group=new THREE.Group();
  const light=new THREE.MeshBasicMaterial({color:'#e7f9ff',toneMapped:false,depthWrite:false});
  const halo=new THREE.MeshBasicMaterial({color:'#5995d6',transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const path=[];
  let x=(hash(seed*11)-.5)*30,z=(hash(seed*21)-.5)*25;
  for(let i=0;i<=20;i++){
    const y=152-i*7.25;
    x+=(hash(seed+i*13)-.52)*11;
    z+=(hash(seed+i*19)-.5)*9;
    path.push(new THREE.Vector3(x,y,z));
  }
  function branch(points,radius){
    const curve=new THREE.CatmullRomCurve3(points);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),radius*3.1,4,false),halo));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),radius,5,false),light));
  }
  branch(path,.28);
  for(let b=0;b<5;b++){
    const start=2+b*3,points=[path[start].clone()];
    for(let j=0;j<4;j++){
      const last=points[points.length-1],k=start*29+b*37+j+seed;
      points.push(last.clone().add(new THREE.Vector3((hash(k)-.38)*14,-4.4,(hash(k+3)-.5)*11)));
    }
    branch(points,.12);
  }
  group.userData.materials=[light,halo];
  return group;
}
function funnelMaterial(shell){
  const vertex=[
    'varying vec2 vUV;',
    'varying float vBillow;',
    'uniform float uTime;',
    'void main(){',
    ' vUV=uv;',
    ' float h=uv.y;',
    ' float turn=atan(position.z,position.x)+uTime*(.47+float('+shell+')*.13)+h*10.5;',
    ' float curl=sin(h*42.0-turn*5.1+uTime*1.3)*.05+sin(h*73.0+turn*3.4)*.026;',
    ' float radius=mix(8.0,49.0,pow(h,1.30))*(1.0+curl);',
    ' radius*=1.0+float('+shell+')*.085;',
    ' float wobble=sin(h*8.8+uTime*.34)*3.5*h;',
    ' vec3 p=vec3(cos(turn)*radius+wobble,h*166.0,sin(turn)*radius+sin(h*9.4+uTime*.23)*3.0*h);',
    ' vBillow=sin(turn*12.0-h*68.0+uTime*1.5);',
    ' gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);',
    '}'
  ].join('\n');
  const fragment=[
    'precision highp float;',
    'uniform float uTime,uStrength,uFlash;',
    'varying vec2 vUV;',
    'varying float vBillow;',
    'float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    'return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}',
    'void main(){',
    ' vec2 p=vec2(vUV.x*23.0-uTime*.025,vUV.y*8.0+uTime*.10);',
    ' float broad=noise2(p*.71)*.65+noise2(p*2.1)*.35;',
    ' float veins=sin(vUV.y*94.0-vUV.x*49.0-uTime*3.7)*.5+.5;',
    ' float swirl=pow(.5+.5*vBillow,2.0);',
    ' float mass=smoothstep(.22,.72,broad*.61+veins*.15+swirl*.30);',
    ' float low=smoothstep(.0,.09,vUV.y);',
    ' float top=1.0-smoothstep(.91,1.0,vUV.y)*.28;',
    ' float a=mass*low*top*uStrength*'+(shell===0?'.63':shell===1?'.35':'.22')+';',
    ' if(a<.015)discard;',
    ' vec3 graphite=mix(vec3(.052,.073,.085),vec3(.24,.28,.30),broad*.79+swirl*.10);',
    ' vec3 electrical=vec3(.48,.68,.79)*(uFlash*.13);',
    ' gl_FragColor=vec4(graphite+electrical,a);',
    '}'
  ].join('\n');
  return new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uStrength:{value:0},uFlash:{value:0}},
    vertexShader:vertex,fragmentShader:fragment,
    side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:true,
    fog:false
  });
}

export class NearTornadoVfx {
  constructor(world){
    this.world=world;this.scene=world.scene;this.mobile=world.isMobile;
    this.slots=selectStormBuildings(world.distantCityPlan);
    this.track=this.slots.map(s=>new THREE.Vector3(...stormTrackPoint(s)));
    this.clock=0;this.exposure=0;this.strength=0;
    this.lastEncounterId=0;this.roofPassReported=false;
    this.anchor=this.track[0]?.clone()||new THREE.Vector3(-110,-23.4,-116);
    this.impacts=[];this.damageSites=new Map();this.reportedIds=new Set();
    this.root=new THREE.Group();this.root.name='AFTERDAY cinematic close 3D tornado';
    this.root.position.copy(this.anchor);this.root.visible=false;this.scene.add(this.root);
    const cone=new THREE.CylinderGeometry(1,1,1,this.mobile?42:76,this.mobile?30:55,true);
    this.shells=[];
    for(let i=0;i<(this.mobile?2:3);i++){
      const mesh=new THREE.Mesh(cone.clone(),funnelMaterial(i));
      mesh.renderOrder=i+1;mesh.frustumCulled=false;
      this.root.add(mesh);this.shells.push(mesh);
    }
    // Instanced irregular cloud masses: shading variation, actual depth and parallax.
    this.dummy=new THREE.Object3D();
    const smokeGeo=new THREE.IcosahedronGeometry(1,1);
    this.smokeMat=new THREE.MeshStandardMaterial({color:'#3a444b',roughness:1,transparent:true,opacity:.48,depthWrite:false,flatShading:true});
    this.smoke=new THREE.InstancedMesh(smokeGeo,this.smokeMat,this.mobile?90:170);
    this.smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.smoke.frustumCulled=false;this.root.add(this.smoke);
    for(let i=0;i<this.smoke.count;i++){
      const shade=.55+hash(i*13)*.62;
      this.smoke.setColorAt(i,new THREE.Color().setRGB(shade,shade*1.04,shade*1.09));
    }
    this.smoke.instanceColor.needsUpdate=true;
    this.dustMat=new THREE.MeshStandardMaterial({color:'#6c6762',transparent:true,opacity:.66,roughness:1,depthWrite:false});
    this.dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),this.dustMat,this.mobile?54:106);
    this.dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.dust.frustumCulled=false;this.root.add(this.dust);
    const shards=this.mobile?110:250;
    this.shardMat=new THREE.MeshStandardMaterial({color:'#666b6b',metalness:.15,roughness:.9,transparent:true,opacity:.9,depthWrite:false});
    this.shards=new THREE.InstancedMesh(new THREE.BoxGeometry(.62,1.6,.21),this.shardMat,shards);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.shards.frustumCulled=false;this.root.add(this.shards);
    this.lightning=Array.from({length:3},(_,i)=>makeLightning(i+7));
    for(const bolt of this.lightning){bolt.visible=false;this.root.add(bolt);}
    this.flashLight=new THREE.PointLight('#b0d8ff',0,270,1.1);
    this.flashLight.position.set(0,107,0);this.root.add(this.flashLight);
    this.boltAge=100;this.nextBolt=1.65;this.boltIndex=0;
    this.impacts=this.slots.map((slot,index)=>this.getDamageSite(slot,index)).filter(Boolean);
  }
  getDamageSite(slot,index){
    if(!slot)return null;
    if(this.damageSites.has(slot.id))return this.damageSites.get(slot.id);
    const site=this.setupDestruction(slot,this.world.cityBuildings?.get(slot.id),index);
    if(site)this.damageSites.set(slot.id,site);
    return site;
  }
  setStormSites(ids=[]){
    const selected=ids.map(id=>this.world.distantCityPlan.find(s=>s.id===id)).filter(Boolean);
    if(!selected.length)return;
    const old=this.slots.map(s=>s.id).join(',');
    if(old===selected.map(s=>s.id).join(','))return;
    this.slots=selected;
    this.track=selected.map(s=>new THREE.Vector3(...stormTrackPoint(s)));
    this.anchor=this.track[0].clone();this.root.position.copy(this.anchor);
    this.impacts=selected.map((slot,index)=>this.getDamageSite(slot,index)).filter(Boolean);
    this.exposure=0;this.reportedIds.clear();
  }
  setupDestruction(slot,host,index){
    if(!slot||!host)return null;
    const ruined=new THREE.Group();
    ruined.name='AFTERDAY storm damage '+(index+1)+' of 3: '+slot.id;
    ruined.visible=false;this.scene.add(ruined);
    const impact={slot,host,ruined,fragments:[],impactSmoke:null,progress:0};
    const w=slot.width,d=slot.width*.82,h=slot.height;
    ruined.position.copy(host.position);ruined.rotation.copy(host.rotation);
    const facade=new THREE.MeshPhysicalMaterial({
      color:'#727b78',roughness:.91,metalness:.025,envMapIntensity:.62,
      clearcoat:.02,clearcoatRoughness:.72
    });
    const concrete=new THREE.MeshPhysicalMaterial({
      color:'#454b49',roughness:.98,metalness:.01,envMapIntensity:.38
    });
    const rust=new THREE.MeshPhysicalMaterial({
      color:'#6b5046',metalness:.48,roughness:.74,envMapIntensity:.78
    });
    const interior=new THREE.MeshStandardMaterial({color:'#111718',roughness:1,metalness:.01});
    const frame=new THREE.MeshPhysicalMaterial({
      color:'#676e6c',metalness:.64,roughness:.53,envMapIntensity:1.05
    });
    const lower=h*.55;
    const remnant=addBox(ruined,[w,lower,d],[0,lower*.5,0],facade);
    remnant.castShadow=!this.mobile;remnant.receiveShadow=true;

    // v6.3 permanent ruin: actual depth cues remain after the tornado has passed.
    // Dark interior rooms sit behind thick broken slab lips and window frames.
    const windowRows=Math.max(2,Math.min(4,Math.floor(lower/5)));
    for(let row=0;row<windowRows;row++){
      const y=3.0+row*4.4;
      for(let col=0;col<3;col++){
        const x=(col-1)*w*.255+(hash(row*17+col*31+index*13)-.5)*.22;
        const bay=addBox(ruined,[w*.17,1.65,.10],[x,y,d*.505],interior);
        bay.castShadow=false;
        const sill=addBox(ruined,[w*.19,.14,.22],[x,y-.92,d*.515],concrete);sill.castShadow=false;
        for(const sx of [-1,1]){
          const jamb=addBox(ruined,[.11,1.98,.16],[x+sx*w*.095,y,d*.515],frame);jamb.castShadow=false;
        }
      }
    }

    // Half-height remnant, exposed slabs, torn concrete, twisted rebar.
    for(let i=0;i<15;i++){
      const theta=i*TAU/15,rx=Math.cos(theta)*w*.47,rz=Math.sin(theta)*d*.47;
      const top=(.05+.18*hash(i*13+index*7+2))*h;
      const piece=addBox(ruined,[w*(.065+.035*hash(i+91)),top,d*(.055+.025*hash(i+37))],
        [rx,lower+top*.5,rz],i%4?facade:concrete);
      piece.rotation.y=theta+(hash(i+index*7)-.5)*.20;piece.castShadow=!this.mobile;
    }
    for(let i=0;i<5;i++){
      const slab=addBox(ruined,[w*(.62+.08*hash(i+index)),h*.014,d*(.70+.10*hash(i+7+index))],
        [(hash(i+17)-.5)*w*.08,lower+(i+.35)*h*.040,(hash(i+29)-.5)*d*.08],concrete);
      slab.rotation.z=(hash(i+44+index)-.5)*.055;slab.castShadow=!this.mobile;
    }
    for(let i=0;i<(this.mobile?9:15);i++){
      const x=(hash(i*3+index*19)-.5)*w*.75,z=(hash(i*5+7+index*5)-.5)*d*.72;
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(.045,.052,h*(.08+.06*hash(i+12)),6),rust);
      rod.position.set(x,lower+h*(.035+.035*hash(i+8)),z);
      rod.rotation.set((hash(i+31)-.5)*.32,hash(i+51)*TAU,(hash(i+22+index*17)-.5)*.70);
      rod.castShadow=!this.mobile;ruined.add(rod);
    }
    for(let i=0;i<(this.mobile?3:6);i++){
      const beam=addBox(ruined,[w*(.18+.14*hash(i+61)),.16,.18],
        [(hash(i+71)-.5)*w*.58,lower+h*(.07+.04*hash(i+73)),(hash(i+79)-.5)*d*.60],frame);
      beam.rotation.set((hash(i+82)-.5)*.25,hash(i+83)*TAU,(hash(i+84)-.5)*.55);
      beam.castShadow=!this.mobile;
    }
    // Each of the three upper stories breaks into individual falling 3D chunks.
    for(let i=0;i<(this.mobile?15:22);i++){
      const col=i%5,row=Math.floor(i/5);
      const bw=w/5*.92,bh=h*.45/5*.94,bd=d*.64;
      const ox=(col-2)*w/5,oy=lower+(row+.5)*h*.45/5;
      const oz=(hash(i*31+index*11)-.5)*d*.25;
      const chunk=addBox(ruined,[bw,bh,bd],[ox,oy,oz],i%3?facade:concrete);
      const outward=new THREE.Vector3(ox+hash(i*5+index*7)*4,0,oz+(hash(i*7+index*3)-.5)*7).normalize();
      impact.fragments.push({mesh:chunk,start:new THREE.Vector3(ox,oy,oz),
        outward,seed:hash(i*17+9+index*41)});
    }
    const smoke=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),
      new THREE.MeshBasicMaterial({color:'#8b8580',transparent:true,opacity:0,depthWrite:false}),
      this.mobile?16:32);
    smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    smoke.frustumCulled=false;ruined.add(smoke);impact.impactSmoke=smoke;
    return impact;
  }
  updateDestruction(dt,active,persistedCount,previewMode,onImpact=()=>{},permanentIds=null){
    // Staggered impacts: left -> center -> right, as the vortex travels past.
    const previewCount=previewMode&&active?
      [5,11,17].filter(seconds=>this.exposure>=seconds).length:0;
    const count=Math.min(this.impacts.length,Math.max(persistedCount,previewCount));
    // Persist preview impacts at the instant they happen, not when the preview ends.
    if(permanentIds===null){
      if(count>persistedCount)onImpact(count);
    }else{
      const committed=new Set(permanentIds);
      this.impacts.forEach((site,index)=>{
        if(index<count&&!committed.has(site.slot.id)&&!this.reportedIds.has(site.slot.id)){
          this.reportedIds.add(site.slot.id);
          onImpact(site.slot.id,index+1);
        }
      });
      for(const id of committed){
        const slot=this.world.distantCityPlan.find(s=>s.id===id);
        if(slot)this.getDamageSite(slot,-1);
      }
    }
    const committed=new Set(permanentIds||[]);
    for(const impact of this.damageSites.values()){
      const index=this.impacts.indexOf(impact);
      const persisted=permanentIds===null?index>=0&&index<persistedCount:committed.has(impact.slot.id);
      const shouldBreak=persisted||(index>=0&&index<count)||this.reportedIds.has(impact.slot.id);
      if(persisted&&(!active||index<0))impact.progress=1;
      else if(shouldBreak)impact.progress=Math.min(1,impact.progress+dt*.29);
      // Destruction is one-way: no weather change, replay or preview exit repairs a tower.
      const p=impact.progress;
      impact.host.visible=p<=.002;
      this.world.cityArchitecture?.setBuildingDamaged(impact.slot.id,p>.002);
      impact.ruined.visible=p>.002;
      if(p<=.002)continue;
      for(const frag of impact.fragments){
        const q=smooth(0,1,p);
        frag.mesh.position.copy(frag.start).addScaledVector(frag.outward,q*(11+frag.seed*14));
        frag.mesh.position.y=frag.start.y-q*q*(20+frag.seed*18);
        frag.mesh.rotation.set(q*frag.seed*2.1,q*1.5,q*(frag.seed-.5)*3.2);
        frag.mesh.visible=p<.96;
      }
      const smoke=impact.impactSmoke;
      smoke.material.opacity=(1-p)*.36;
      for(let i=0;i<smoke.count;i++){
        const a=hash(i*7+index*17)*TAU,r=(3+hash(i*21)*12)*p;
        this.dummy.position.set(Math.cos(a)*r,impact.slot.height*.52+(hash(i*13)*16)*p,
          Math.sin(a)*r);
        const sz=(.3+p*7)*(1+hash(i*47));
        this.dummy.scale.set(sz,sz*.55,sz);this.dummy.rotation.set(0,0,0);
        this.dummy.updateMatrix();smoke.setMatrixAt(i,this.dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate=true;
    }
  }
  update(dt,weather,{persistedCount=0,permanentIds=null,trackIds=null,approach='distant',encounterId=0,preview=false,night=0,reduceMotion=false,onImpact=()=>{},onRooftopPass=()=>{}}={}){
    dt=Math.min(Math.max(dt,0),.05);
    if(trackIds?.length)this.setStormSites(trackIds);
    if(this.lastEncounterId!==encounterId){
      this.lastEncounterId=encounterId;this.roofPassReported=false;
      this.exposure=0;
    }
    const target=Math.max(0,Math.min(1,Number(weather)||0));
    this.clock+=dt;this.strength=THREE.MathUtils.damp(this.strength,target,1.5,dt);
    this.exposure=target>.5?this.exposure+dt:0;
    this.root.visible=this.strength>.015;
    this.updateDestruction(dt,target>.5,Math.max(0,Math.min(3,Math.floor(persistedCount))),preview,onImpact,permanentIds);
    if(!this.root.visible){this.flashLight.intensity=0;return 0;}
    const t=this.clock,s=this.strength;
    // A minority of actual storms cross the neighboring block or sweep over
    // the SAME playable rooftop. Only background towers are destructible.
    const close=approach==='near'||approach==='direct';
    const guide=this.track[1]||this.anchor;
    const direction=new THREE.Vector3(guide.x,0,guide.z).normalize();
    if(direction.lengthSq()<.001)direction.set(1,0,0);
    const passRadius=approach==='direct'?18:56;
    const rooftopPoint=new THREE.Vector3(direction.x*passRadius,-23.4,direction.z*passRadius);
    const route=close&&this.track.length>=2?
      [this.track[0],this.track[1],rooftopPoint,this.track[this.track.length-1]]:this.track;
    const pathT=this.exposure<=21?
      smooth(0,1,(this.exposure-3)/17):(.5+.5*Math.cos((this.exposure-21)*.20));
    const step=pathT*Math.max(0,route.length-1);
    const segment=Math.min(Math.floor(step),Math.max(0,route.length-2));
    const alpha=smooth(0,1,step-segment);
    const a=route[segment]||this.anchor,b=route[segment+1]||a;
    this.root.position.lerpVectors(a,b,alpha);
    // Exactly one close-pass callback per storm, including when rendering runs
    // at a different FPS or the user has switched to 2x/4x speed.
    if(close&&!preview&&target>.5&&this.exposure>=13&&!this.roofPassReported){
      this.roofPassReported=true;
      onRooftopPass(approach);
    }
    this.root.position.x+=Math.sin(t*.43)*2.1*s;
    this.root.position.z+=Math.cos(t*.36)*1.7*s;
    for(const sh of this.shells){sh.material.uniforms.uTime.value=t;sh.material.uniforms.uStrength.value=s;}
    this.smokeMat.opacity=.41*s;this.dustMat.opacity=.62*s;this.shardMat.opacity=.88*s;
    const spinRate=reduceMotion?.29:.66;
    for(let i=0;i<this.smoke.count;i++){
      const q=hash(i*17+1),h=5+Math.pow(q,.74)*158;
      const angle=i*2.4+t*(spinRate+q*.52)+h*.065;
      const radius=8+Math.pow(h/166,1.4)*48;
      this.dummy.position.set(Math.cos(angle)*radius,h,Math.sin(angle)*radius);
      const size=(2.8+hash(i*39)*5)*(1+h/180);
      this.dummy.scale.set(size*1.55,size*.77,size*1.3);
      this.dummy.rotation.set(t*.07,i*.31+t*.13,t*.04);
      this.dummy.updateMatrix();this.smoke.setMatrixAt(i,this.dummy.matrix);
    }
    this.smoke.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.dust.count;i++){
      const a=i*2.39996+t*(reduceMotion?.36:1.5),r=17+hash(i*13+3)*36;
      this.dummy.position.set(Math.cos(a)*r,1+hash(i*11)*10,Math.sin(a)*r);
      const k=2.4+hash(i*21)*5.8;
      this.dummy.scale.set(k*1.75,k*.5,k*1.36);this.dummy.rotation.set(0,a*.2,0);
      this.dummy.updateMatrix();this.dust.setMatrixAt(i,this.dummy.matrix);
    }
    this.dust.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.shards.count;i++){
      const h=(hash(i*37)*145+t*(reduceMotion?1.1:11)*(1+hash(i*3)))%145;
      const a=i*2.3+t*(reduceMotion?.55:1.6)+h*.055;
      const r=8+Math.pow(h/166,1.1)*39+hash(i*5)*6;
      this.dummy.position.set(Math.cos(a)*r,h,Math.sin(a)*r);
      const k=.35+hash(i*9)*2.7;
      this.dummy.scale.set(k,k*.48,k*.63);
      this.dummy.rotation.set(a*1.7,t*.7+i*.1,t*.9+i*.08);
      this.dummy.updateMatrix();this.shards.setMatrixAt(i,this.dummy.matrix);
    }
    this.shards.instanceMatrix.needsUpdate=true;
    this.boltAge+=dt;this.nextBolt-=dt;
    if(this.nextBolt<=0&&s>.55){
      this.boltAge=0;this.boltIndex=(this.boltIndex+1)%this.lightning.length;
      this.nextBolt=(reduceMotion?5.8:3.3)+hash(Math.floor(t))*1.8;
    }
    const flash=reduceMotion?0:Math.max(0,1-this.boltAge/.22)*Math.exp(-this.boltAge*7)*s;
    this.lightning.forEach((g,i)=>g.visible=i===this.boltIndex&&flash>.08);
    this.flashLight.intensity=flash*(reduceMotion?0:95);
    for(const sh of this.shells)sh.material.uniforms.uFlash.value=flash;
    return flash;
  }
  dispose(){
    // World disposal only releases GPU resources; never resurrect a destroyed tower.
    for(const root of [this.root,...[...this.damageSites.values()].map(i=>i.ruined)]){
      root.traverse(obj=>{
        if(obj.geometry)obj.geometry.dispose();
        if(obj.material){
          for(const m of (Array.isArray(obj.material)?obj.material:[obj.material]))m.dispose();
        }
      });
      root.parent?.remove(root);
    }
  }
}

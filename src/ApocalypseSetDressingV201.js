import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';
import {createFracturedTowerGeometry} from './ruinedBuildingGeometry.js';

const TAU=Math.PI*2;
const GROUND=CITY_COMPOSITION.groundY;
const MAX_CITY_HEIGHT=CITY_COMPOSITION.roofCeilingY-GROUND;
const hash=n=>{const v=Math.sin(n*91.713+17.31)*43758.5453;return v-Math.floor(v);};
const tint=(hex)=>new THREE.Color(hex);

function grimeTexture(seed=1){
 const c=document.createElement('canvas');c.width=256;c.height=512;const x=c.getContext('2d');
 x.fillStyle=['#777a72','#6f746d','#838279','#68716d'][seed%4];x.fillRect(0,0,c.width,c.height);
 const cols=6,rows=14,cellW=c.width/cols,cellH=c.height/rows;
 for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){
  const n=seed*100+r*17+col*31;const broken=hash(n)>.70;
  x.fillStyle=broken?'#151b1b':hash(n+2)>.55?'#27302f':'#3d4744';
  const padX=cellW*.23,padY=cellH*.24;
  x.fillRect(col*cellW+padX,r*cellH+padY,cellW-padX*2,cellH-padY*2);
  if(hash(n+5)>.74){x.fillStyle='rgba(202,126,76,.28)';x.fillRect(col*cellW+padX,r*cellH+padY,2,cellH-padY*2);}
 }
 for(let i=0;i<36;i++){
  const n=seed*901+i*47,px=hash(n)*256,py=hash(n+1)*512;
  x.strokeStyle=`rgba(25,30,27,${.08+hash(n+3)*.17})`;x.lineWidth=.6+hash(n+5)*1.6;
  x.beginPath();x.moveTo(px,py);x.lineTo(px+(hash(n+7)-.5)*70,py+20+hash(n+9)*95);x.stroke();
 }
 for(let i=0;i<18;i++){
  const n=seed*301+i*13;x.fillStyle=`rgba(45,34,27,${.04+hash(n+3)*.10})`;
  x.fillRect(hash(n)*256,hash(n+1)*512,8+hash(n+4)*38,18+hash(n+5)*95);
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=2;return tex;
}

function smokeTexture(){
 const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');
 const g=x.createRadialGradient(48,48,2,48,48,45);g.addColorStop(0,'rgba(60,65,62,.48)');g.addColorStop(.45,'rgba(74,76,72,.20)');g.addColorStop(1,'rgba(90,92,86,0)');
 x.fillStyle=g;x.fillRect(0,0,96,96);return new THREE.CanvasTexture(c);
}

function addInstances(scene,name,geometry,material,records,cast=false){
 const mesh=new THREE.InstancedMesh(geometry,material,records.length);mesh.name=name;const d=new THREE.Object3D();
 records.forEach((r,i)=>{d.position.set(...r.p);d.rotation.set(...(r.r||[0,0,0]));d.scale.set(...(r.s||[1,1,1]));d.updateMatrix();mesh.setMatrixAt(i,d.matrix);if(r.c)mesh.setColorAt(i,r.c);});
 mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);return mesh;
}

/**
 * v2.01 apocalypse pass: more believable urban destruction without replacing any
 * existing gameplay systems. Everything is fixed 3D world-space geometry.
 */
export class ApocalypseSetDressingV201{
 constructor(world){
  this.world=world;this.group=new THREE.Group();this.group.name='AFTERDAY v2.01 apocalypse environment pass';world.scene.add(this.group);
  this.materials=[];this.meshes=[];this.stats={};
  this.makeForegroundRuins();
  this.makeDistantSkyline();
  this.makeExposedHighRiseFrames();
  this.makeStreetStory();
  this.makeRooftopStory();
  this.makeSmoke();
 }
 makeForegroundRuins(){
  const w=this.world,count=w.isMobile?24:38,bases=Array.from({length:4},(_,i)=>createFracturedTowerGeometry(i));
  const byVariant=[[],[],[],[]];
  for(let i=0;i<count;i++){
   const a=i/count*TAU+.18*Math.sin(i*2.11);const radius=145+hash(i*41+4)*92;
   const width=14+hash(i*31+2)*15,depth=width*(.68+hash(i*17+9)*.23),height=Math.min(MAX_CITY_HEIGHT-1.2,22+hash(i*53+7)*15);
   byVariant[i%4].push({p:[Math.sin(a)*radius,GROUND,Math.cos(a)*radius],r:[0,Math.round(hash(i+70)*3)*Math.PI/2,0],s:[width,height,depth]});
  }
  for(let v=0;v<4;v++){
   const tex=grimeTexture(v+1),wall=new THREE.MeshStandardMaterial({color:'#ffffff',map:tex,roughness:.96,metalness:.02}),roof=new THREE.MeshStandardMaterial({color:['#474b46','#514c44','#3f4948','#53534c'][v],roughness:.98});
   this.materials.push(wall,roof);const mesh=addInstances(this.group,`Foreground fractured ruin v${v}`,bases[v],[wall,roof],byVariant[v]);this.meshes.push(mesh);
  }
  const cavities=[],rebar=[],slabs=[];
  for(let i=0;i<(w.isMobile?34:58);i++){
   const a=hash(i*37+1)*TAU,r=150+hash(i*13+4)*85,x=Math.sin(a)*r,z=Math.cos(a)*r;
   const y=GROUND+4+hash(i*29+3)*24,face=hash(i+8)>.5?0:Math.PI/2;
   cavities.push({p:[x,y,z],r:[0,face,0],s:[2.1+hash(i+3)*4,2+hash(i+11)*4.8,.14],c:tint(hash(i)>.4?'#171c1b':'#222826')});
   if(i%2===0)rebar.push({p:[x+(hash(i+1)-.5)*2,y+1.8,z+(hash(i+2)-.5)*2],r:[hash(i+5)*.8,hash(i+4)*TAU,hash(i+6)*.8],s:[.11,2.4+hash(i+9)*4,.11],c:tint('#6b4d3d')});
  }
  for(let i=0;i<(w.isMobile?42:74);i++){
   const a=hash(i*61+12)*TAU,r=136+hash(i*19+6)*120,x=Math.sin(a)*r,z=Math.cos(a)*r;
   slabs.push({p:[x,GROUND+.45+hash(i)*1.4,z],r:[(hash(i+4)-.5)*.7,hash(i+5)*TAU,(hash(i+6)-.5)*.7],s:[2+hash(i+7)*5,.22+hash(i+9)*.55,1.2+hash(i+11)*3.5],c:tint(i%4?'#646760':'#795542')});
  }
  this.meshes.push(addInstances(this.group,'Blown-out facade cavities',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),cavities));
  this.meshes.push(addInstances(this.group,'Exposed rusted reinforcement bars',new THREE.CylinderGeometry(.5,.5,1,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,metalness:.38}),rebar));
  this.meshes.push(addInstances(this.group,'Collapsed concrete floor slabs',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.97}),slabs));
  this.stats.foregroundRuins=count;this.stats.facadeDamage=cavities.length+rebar.length+slabs.length;
 }
 makeExposedHighRiseFrames(){
  const mobile=this.world.isMobile;
  const towers=mobile?10:16;
  const columns=[],floors=[],cross=[],hanging=[];
  for(let i=0;i<towers;i++){
   const a=i/towers*TAU+.24;
   const radius=205+hash(i*71+9)*92;
   const x=Math.sin(a)*radius,z=Math.cos(a)*radius;
   const width=12+hash(i*17+2)*10,depth=9+hash(i*23+4)*8,height=38+hash(i*29+6)*42;
   const levels=5+(i%4);
   const rot=Math.round(hash(i+30)*3)*Math.PI/2;
   const sy=Math.sin(rot),cy=Math.cos(rot);
   const tx=(lx,lz)=>[x+lx*cy+lz*sy,z-lx*sy+lz*cy];
   for(const sx of [-1,1])for(const sz of [-1,1]){
    const [px,pz]=tx(sx*width*.46,sz*depth*.46);
    columns.push({p:[px,GROUND+height*.5,pz],r:[0,rot,0],s:[.55,height,.55],c:tint('#4f514c')});
   }
   for(let l=1;l<levels;l++){
    if((l+i)%5===0)continue;
    const y=GROUND+(height/levels)*l;
    floors.push({p:[x,y,z],r:[0,rot,(hash(i*13+l)-.5)*.04],s:[width,.32,depth],c:tint(l%2?'#555852':'#615a50')});
    if((l+i)%2===0){
     const [x1,z1]=tx(-width*.43,depth*.47),[x2,z2]=tx(width*.43,depth*.47);
     const midx=(x1+x2)/2,midz=(z1+z2)/2,len=Math.hypot(x2-x1,z2-z1);
     cross.push({p:[midx,y+1.5,midz],r:[0,rot,Math.PI/4],s:[.16,len*.68,.16],c:tint('#684d3d')});
    }
   }
   const cableCount=1+(i%2);
   for(let j=0;j<cableCount;j++){
    const [px,pz]=tx((hash(i*7+j)-.5)*width*.7,(hash(i*11+j)-.5)*depth*.7);
    hanging.push({p:[px,GROUND+height*.72,pz],r:[0,0,(hash(i+j+5)-.5)*.18],s:[.06,height*(.13+.08*hash(i+j+8)),.06],c:tint('#343a38')});
   }
  }
  const steel=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.48});
  const concrete=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.98,metalness:.01});
  this.meshes.push(addInstances(this.group,'Exposed ruined high-rise columns',new THREE.BoxGeometry(1,1,1),steel,columns));
  this.meshes.push(addInstances(this.group,'Exposed ruined high-rise floor plates',new THREE.BoxGeometry(1,1,1),concrete,floors));
  this.meshes.push(addInstances(this.group,'Collapsed structural cross bracing',new THREE.CylinderGeometry(.5,.5,1,5),steel,cross));
  this.meshes.push(addInstances(this.group,'Hanging utility cables from ruins',new THREE.CylinderGeometry(.5,.5,1,5),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,metalness:.3}),hanging));
  this.stats.exposedFrames=towers;
 }
 makeStreetStory(){
  const mobile=this.world.isMobile,roadMat=new THREE.MeshStandardMaterial({color:'#242a29',roughness:1});
  const roadRecords=[];for(const z of [-190,190])roadRecords.push({p:[0,GROUND+.04,z],s:[330,.08,14]});for(const x of [-190,190])roadRecords.push({p:[x,GROUND+.04,0],s:[14,.08,330]});
  this.meshes.push(addInstances(this.group,'Broken perimeter streets',new THREE.BoxGeometry(1,1,1),roadMat,roadRecords));
  const carBody=[],carCab=[],barriers=[],poles=[],rubble=[];
  const carPalette=['#4d5551','#6c5149','#535a60','#6b6554','#3f4747'];
  const cars=mobile?26:44;
  for(let i=0;i<cars;i++){
   const vertical=i%2===0,side=i%4<2?-1:1,lane=(side*190)+(hash(i+3)-.5)*7,along=(hash(i*21+7)-.5)*270;
   const x=vertical?lane:along,z=vertical?along:lane,rot=vertical?0:Math.PI/2,c=tint(carPalette[i%carPalette.length]);
   carBody.push({p:[x,GROUND+.46,z],r:[0,rot+(hash(i+11)-.5)*.28,0],s:[1.75,.55,3.5],c});
   carCab.push({p:[x,GROUND+.94,z],r:[0,rot+(hash(i+11)-.5)*.28,0],s:[1.48,.52,1.62],c:c.clone().multiplyScalar(.78)});
  }
  for(let i=0;i<(mobile?34:58);i++){
   const vertical=i%2===0,side=i%4<2?-1:1,lane=(side*190)+(hash(i+4)-.5)*10,along=(hash(i*33+9)-.5)*300;
   const x=vertical?lane:along,z=vertical?along:lane;
   barriers.push({p:[x,GROUND+.42,z],r:[0,(vertical?0:Math.PI/2)+(hash(i+4)-.5)*.35,0],s:[2.3,.72,.45],c:tint(i%3?'#70654f':'#7e4c36')});
   if(i%2===0)poles.push({p:[x+(vertical?5:0),GROUND+3.1,z+(vertical?0:5)],s:[.16,6.2,.16],c:tint('#505753')});
  }
  for(let i=0;i<(mobile?150:260);i++){
   const a=hash(i*19+5)*TAU,r=138+hash(i*7+9)*155;
   rubble.push({p:[Math.sin(a)*r,GROUND+.18+hash(i)*.55,Math.cos(a)*r],r:[hash(i+4)*TAU,hash(i+7)*TAU,hash(i+9)*TAU],s:[.25+hash(i+11)*1.25,.16+hash(i+13)*.65,.22+hash(i+17)*1.1],c:tint(i%5?'#545951':'#765443')});
  }
  this.meshes.push(addInstances(this.group,'Abandoned vehicle bodies',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.75,metalness:.28}),carBody));
  this.meshes.push(addInstances(this.group,'Abandoned vehicle cabins',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.66,metalness:.34}),carCab));
  this.meshes.push(addInstances(this.group,'Improvised street barricades',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.92,metalness:.10}),barriers));
  this.meshes.push(addInstances(this.group,'Dead streetlight poles',new THREE.CylinderGeometry(.5,.5,1,8),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.42}),poles));
  this.meshes.push(addInstances(this.group,'Urban rubble field',new THREE.TetrahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),rubble));
  this.stats.cars=cars;this.stats.streetDebris=rubble.length+barriers.length+poles.length;
 }
 makeRooftopStory(){
  const y=this.world.ROOF_Y+.21,crates=[],sacks=[],scrap=[],cans=[];
  const anchors=[[-19,-15],[-17,-11],[-18,7],[-16,16],[-7,18],[4,18],[17,16],[19,8],[18,-8],[15,-17],[7,-18],[-4,-18]];
  for(let i=0;i<anchors.length;i++){
   const [ax,az]=anchors[i],count=2+(i%3);
   for(let j=0;j<count;j++){
    const x=ax+(hash(i*41+j*7)-.5)*3.2,z=az+(hash(i*53+j*5)-.5)*3.2,h=.55+hash(i*19+j)*.7;
    crates.push({p:[x,y+h*.5,z],r:[0,(hash(i+j+4)-.5)*.7,0],s:[1+hash(i+j)*.8,h,.8+hash(i+j+8)*.6],c:tint((i+j)%4?'#65503c':'#6e5f4c')});
    if(j===0)sacks.push({p:[x+.7,y+.42,z-.45],r:[0,hash(i+2)*TAU,.25],s:[.58,.78,.42],c:tint('#77735f')});
   }
  }
  for(let i=0;i<24;i++){
   const a=hash(i+3)*TAU,r=17+hash(i+7)*4.5,x=Math.sin(a)*r,z=Math.cos(a)*r;
   scrap.push({p:[x,y+.06,z],r:[(hash(i+4)-.5)*.3,hash(i+8)*TAU,(hash(i+9)-.5)*.3],s:[.7+hash(i)*1.6,.08,.45+hash(i+1)*1.1],c:tint(i%3?'#66594c':'#784e39')});
   if(i%3===0)cans.push({p:[x+.5,y+.48,z+.2],r:[0,hash(i+12)*TAU,0],s:[.34,.82,.34],c:tint(i%2?'#6a5945':'#7b4937')});
  }
  this.meshes.push(addInstances(this.group,'Rooftop supply crates',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9}),crates,true));
  this.meshes.push(addInstances(this.group,'Rooftop supply sacks',new THREE.SphereGeometry(.5,8,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),sacks,true));
  this.meshes.push(addInstances(this.group,'Rooftop salvaged sheet metal',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.77,metalness:.28}),scrap,true));
  this.meshes.push(addInstances(this.group,'Rooftop fuel and water cans',new THREE.CylinderGeometry(.5,.5,1,8),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.76,metalness:.20}),cans,true));
  this.stats.rooftopStory=crates.length+sacks.length+scrap.length+cans.length;
 }
 makeDistantSkyline(){
  const w=this.world,count=w.isMobile?18:32,bases=Array.from({length:4},(_,i)=>createFracturedTowerGeometry(i+8));
  const sets=[[],[],[],[]],antennas=[],topDebris=[];
  for(let i=0;i<count;i++){
   const a=i/count*TAU+.11*Math.sin(i*1.73),radius=305+hash(i*43+12)*220;
   const width=17+hash(i*23+3)*22,depth=width*(.62+hash(i*31+4)*.32),height=44+hash(i*57+8)*62;
   const x=Math.sin(a)*radius,z=Math.cos(a)*radius,rot=Math.round(hash(i+90)*3)*Math.PI/2;
   sets[i%4].push({p:[x,GROUND,z],r:[0,rot,0],s:[width,height,depth]});
   if(i%3===0)antennas.push({p:[x,GROUND+height+4,z],r:[0,0,(hash(i+7)-.5)*.18],s:[.16,8+hash(i+4)*9,.16],c:tint('#4b4f4b')});
   if(i%2===0){
    const pieces=2+(i%3);
    for(let j=0;j<pieces;j++)topDebris.push({p:[x+(hash(i*11+j)-.5)*width*.55,GROUND+height*.92+(hash(i*7+j)-.5)*3,z+(hash(i*13+j)-.5)*depth*.55],r:[hash(i+j)*1.2,hash(i+j+2)*TAU,hash(i+j+4)*1.2],s:[1.2+hash(i+j+6)*3,.25+hash(i+j+8)*.8,1+hash(i+j+10)*2.8],c:tint(i%4?'#555852':'#6a5144')});
   }
  }
  for(let v=0;v<4;v++){
   const tex=grimeTexture(v+9),wall=new THREE.MeshStandardMaterial({color:['#777a72','#6a706b','#7b766e','#626b69'][v],map:tex,roughness:.98,metalness:.015}),roof=new THREE.MeshStandardMaterial({color:'#3e4441',roughness:1});
   this.materials.push(wall,roof);this.meshes.push(addInstances(this.group,`Distant fractured high-rise skyline v${v}`,bases[v],[wall,roof],sets[v]));
  }
  this.meshes.push(addInstances(this.group,'Broken skyline antennas and mast silhouettes',new THREE.CylinderGeometry(.5,.5,1,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.84,metalness:.46}),antennas));
  this.meshes.push(addInstances(this.group,'Collapsed high-rise rooftop debris',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.96}),topDebris));
  this.stats.distantHighRises=count;this.stats.skylineDamage=antennas.length+topDebris.length;
 }
 makeSmoke(){
  const count=this.world.isMobile?84:144,pos=new Float32Array(count*3),seed=new Float32Array(count),centers=[[-285,-205],[270,-245],[-350,115],[325,205]];
  for(let i=0;i<count;i++){
   const c=centers[i%centers.length],phase=hash(i*13+7);seed[i]=phase;pos[i*3]=c[0]+(hash(i+1)-.5)*10;pos[i*3+1]=GROUND+5+phase*72;pos[i*3+2]=c[1]+(hash(i+2)-.5)*10;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.PointsMaterial({map:smokeTexture(),color:'#575b57',size:this.world.isMobile?15:18,transparent:true,opacity:.22,depthWrite:false,sizeAttenuation:true,alphaTest:.01});
  const p=new THREE.Points(g,m);p.name='Distant smoke columns from ruined blocks';this.group.add(p);this.smoke=p;this.smokePos=pos;this.smokeSeed=seed;this.smokeCenters=centers;this.materials.push(m);this.stats.smokeParticles=count;
 }
 update(dt,weather,night){
  if(!this.smoke)return;const wind=(weather?.wind||0)*2.2+.24;
  for(let i=0;i<this.smokeSeed.length;i++){
   const j=i*3,c=this.smokeCenters[i%this.smokeCenters.length];this.smokeSeed[i]=(this.smokeSeed[i]+dt*(.012+.008*(i%5)))%1;
   const p=this.smokeSeed[i],sway=Math.sin(p*TAU*1.4+i)*6;
   this.smokePos[j]=c[0]+sway+wind*p*18;this.smokePos[j+1]=GROUND+5+p*78;this.smokePos[j+2]=c[1]+Math.cos(p*TAU+i*.6)*5;
  }
  this.smoke.geometry.attributes.position.needsUpdate=true;
  this.smoke.material.opacity=.15+night*.08+(1-(weather?.rain||0))*.07;
  this.smoke.material.color.set((weather?.storm||0)>.35?'#4c5558':'#575b57');
 }
 dispose(){
  this.group.parent?.remove(this.group);for(const m of this.meshes){m.geometry?.dispose();if(Array.isArray(m.material))m.material.forEach(x=>x.dispose());else m.material?.dispose();}
  for(const mat of this.materials)mat?.map?.dispose?.();this.smoke?.geometry.dispose();this.smoke?.material.map?.dispose();this.smoke?.material.dispose();
 }
}

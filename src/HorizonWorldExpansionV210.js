import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';

const GROUND=CITY_COMPOSITION.groundY;
const TAU=Math.PI*2;
const hash=n=>{const v=Math.sin(n*127.17+31.71)*43758.5453;return v-Math.floor(v);};
const color=v=>new THREE.Color(v);

function farFacadeTexture(seed=1){
 const c=document.createElement('canvas');c.width=96;c.height=192;const x=c.getContext('2d');
 const walls=['#626863','#6c6962','#58615f','#737069'];x.fillStyle=walls[seed%walls.length];x.fillRect(0,0,96,192);
 for(let y=10;y<184;y+=13)for(let col=0;col<6;col++){
  const n=seed*700+y*11+col*37,lit=hash(n)>.82,broken=hash(n+4)>.88;
  x.fillStyle=broken?'#171d1c':lit?'#9a7652':'#293231';
  x.globalAlpha=lit?.64:.88;x.fillRect(7+col*15,y,8,6);
 }
 x.globalAlpha=1;
 for(let i=0;i<18;i++){const n=seed*90+i*17;x.fillStyle='rgba(38,43,39,.12)';x.fillRect(hash(n)*96,hash(n+1)*192,3+hash(n+2)*13,18+hash(n+3)*60);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;return t;
}

function tube(parent,points,radius,material,name,segments=52){
 const curve=new THREE.CatmullRomCurve3(points);
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,6,false),material);
 mesh.name=name;parent.add(mesh);return mesh;
}

function addInstances(parent,name,geometry,material,records){
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);
  mesh.name=name;
  const d=new THREE.Object3D();
  records.forEach((r,i)=>{
    d.position.set(...r.p);d.rotation.set(...(r.r||[0,0,0]));d.scale.set(...(r.s||[1,1,1]));d.updateMatrix();
    mesh.setMatrixAt(i,d.matrix);if(r.c)mesh.setColorAt(i,r.c);
  });
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}

function mountainGeometry(seed=1){
  const g=new THREE.ConeGeometry(1,1,11,5,false);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const angle=Math.atan2(z,x),level=y+.5;
    const rough=1+(hash(seed*311+i*17)-.5)*.22*(1-level*.45)+Math.sin(angle*3+seed)*.035;
    p.setXYZ(i,x*rough,y,z*rough);
  }
  p.needsUpdate=true;g.computeVertexNormals();return g;
}

function ridgeArcGeometry(radius,seed,height,span=1.72,segments=86){
  const pos=[],uv=[],idx=[],center=5*Math.PI/4;
  const p1=seed*.17,p2=seed*.31,p3=seed*.53;
  for(let i=0;i<=segments;i++){
    const t=i/segments,a=center-span*.5+t*span;
    // Continuous low-frequency harmonics: a mountain ridge, not independent
    // random spikes. Small high-frequency terms only texture the silhouette.
    const shape=.48+.22*Math.sin(t*Math.PI*2.1+p1)+.14*Math.sin(t*Math.PI*4.7+p2)+.07*Math.sin(t*Math.PI*9.3+p3)+.035*Math.sin(t*Math.PI*17.1+seed);
    const crest=GROUND+25+height*Math.max(.16,shape);
    const r=radius+18*Math.sin(t*Math.PI*2.4+p2)+7*Math.sin(t*Math.PI*7.2+p3);
    pos.push(Math.sin(a)*r,crest,Math.cos(a)*r,Math.sin(a)*(r+36),GROUND-48,Math.cos(a)*(r+36));
    uv.push(t,1,t,0);
    if(i<segments){const k=i*2;idx.push(k,k+1,k+2,k+2,k+1,k+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function riverGeometry(){
  const segments=44,pos=[],uv=[],idx=[];
  const center=t=>{
    const x=-40-t*420;
    const z=-390-t*520-Math.sin(t*Math.PI)*42+Math.sin(t*TAU*1.55)*15;
    return new THREE.Vector3(x,GROUND+5.2,z);
  };
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=center(t),p0=center(Math.max(0,t-.012)),p1=center(Math.min(1,t+.012));
    const tangent=p1.clone().sub(p0).normalize();
    const side=new THREE.Vector3(-tangent.z,0,tangent.x);
    const width=48+Math.sin(t*Math.PI)*22+hash(i+12)*9;
    const left=p.clone().addScaledVector(side,width),right=p.clone().addScaledVector(side,-width);
    pos.push(left.x,left.y,left.z,right.x,right.y,right.z);uv.push(0,t,1,t);
    if(i<segments){const k=i*2;idx.push(k,k+1,k+2,k+2,k+1,k+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function line(parent,points,material,name){
  const g=new THREE.BufferGeometry().setFromPoints(points);const l=new THREE.Line(g,material);l.name=name;parent.add(l);return l;
}

export class HorizonWorldExpansionV210{
  constructor(world){
    this.world=world;this.group=new THREE.Group();this.group.name='AFTERDAY v2.20 cinematic dense horizon';
    world.scene.add(this.group);this.meshes=[];this.materials=[];this.time=0;
    this.makeFarCity();this.makeRiver();this.makeBridge();this.makeMountainMass();this.makeDistantInfrastructure();
  }

  makeFarCity(){
    const mobile=this.world.isMobile;
    const boxes=[[],[],[],[]],rounds=[],setbacks=[],crowns=[],tanks=[],masts=[];
    const target=mobile?430:760;
    const forward=new THREE.Vector2(-.7071,-.7071),right=new THREE.Vector2(.7071,-.7071);
    let made=0,attempt=0;
    while(made<target&&attempt<target*3.5){
      const i=attempt++;
      const d=310+Math.pow(hash(i*17+4),.86)*790;
      const spread=155+d*.43,lateral=(hash(i*29+8)-.5)*spread*2;
      const x=forward.x*(d+(hash(i*31+2)-.5)*15)+right.x*(lateral+(hash(i*41+7)-.5)*13);
      const z=forward.y*(d+(hash(i*31+2)-.5)*15)+right.y*(lateral+(hash(i*41+7)-.5)*13);
      const rt=THREE.MathUtils.clamp((-x-40)/420,0,1);
      const riverZ=-390-rt*520-Math.sin(rt*Math.PI)*42+Math.sin(rt*TAU*1.55)*15;
      if(Math.abs(z-riverZ)<(d<650?98:74)||hash(i*73+3)>.955)continue;
      const near=d<500,far=d>820,landmark=hash(i*97+6)>.92,round=hash(i*101+3)>.94;
      const w=(near?8:6.5)+hash(i*13+5)*(near?14:11.5),dep=(near?8:6.5)+hash(i*19+9)*(near?13:11);
      let h=(near?20:far?18:19)+Math.pow(hash(i*37+11),.68)*(near?43:far?50:46);
      if(landmark)h+=28+hash(i+77)*46;
      const stepped=landmark||hash(i*59+4)>.80,bodyH=stepped?h*(.76+.08*hash(i+6)):h;
      const rec={p:[x,GROUND+bodyH*.5,z],r:[0,Math.round(hash(i+80)*3)*Math.PI/2,0],s:[w,bodyH,dep],c:color(['#626a66','#6b6860','#555f5e','#716d64','#515a57'][i%5]).multiplyScalar(.87+.11*hash(i+21))};
      if(round)rounds.push(rec);else boxes[(Math.floor(d/150)+i)%4].push(rec);
      if(stepped){
        const topH=h-bodyH;
        setbacks.push({p:[x,GROUND+bodyH+topH*.5,z],r:[0,rec.r[1],0],s:[w*(.54+.14*hash(i+1)),topH,dep*(.54+.14*hash(i+2))],c:rec.c.clone().multiplyScalar(.92)});
      }
      if(made%4===0)crowns.push({p:[x,GROUND+h+1.2,z],s:[w*(.34+.18*hash(i+1)),1.8+hash(i+2)*3.8,dep*(.34+.18*hash(i+3))],c:color('#4f5754')});
      if(made%9===0)tanks.push({p:[x+(hash(i+2)-.5)*w*.35,GROUND+h+2.8,z+(hash(i+4)-.5)*dep*.35],s:[1.4+hash(i)*1.1,4.2,1.4+hash(i+3)*1.1],c:color('#555d59')});
      if(made%14===0)masts.push({p:[x,GROUND+h+6,z],s:[.10,11+hash(i+4)*12,.10],c:color('#4e5654')});
      made++;
    }
    const base=new THREE.BoxGeometry(1,1,1);this.farCityMaterials=[];this.farCityTextures=[];
    for(let t=0;t<4;t++){
      const tex=farFacadeTexture(t+21),mat=new THREE.MeshStandardMaterial({color:'#ffffff',map:tex,roughness:.94,metalness:.025,vertexColors:true,fog:true});
      this.farCityTextures.push(tex);this.farCityMaterials.push(mat);this.materials.push(mat);
      this.meshes.push(addInstances(this.group,`Dense far-city slender block layer ${t+1}`,base,mat,boxes[t]));
    }
    const roundMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.90,metalness:.07,vertexColors:true,fog:true});this.materials.push(roundMat);
    this.meshes.push(addInstances(this.group,'Far-city rounded towers',new THREE.CylinderGeometry(.5,.56,1,12),roundMat,rounds));
    this.meshes.push(addInstances(this.group,'Far-city stepped tower tops',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.92,vertexColors:true,fog:true}),setbacks));
    this.meshes.push(addInstances(this.group,'Far skyline rooftop crowns',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,vertexColors:true}),crowns));
    this.meshes.push(addInstances(this.group,'Far rooftop water tanks',new THREE.CylinderGeometry(.5,.5,1,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,metalness:.14,vertexColors:true}),tanks));
    this.meshes.push(addInstances(this.group,'Far skyline antenna masts',new THREE.CylinderGeometry(.5,.5,1,7),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.78,metalness:.48,vertexColors:true}),masts));
    this.farBuildingCount=made;
  }

  makeRiver(){
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uStorm:{value:0},uNight:{value:0},uWet:{value:0}},
      transparent:false,depthWrite:true,depthTest:true,side:THREE.DoubleSide,
      vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`precision highp float;varying vec2 vUv;varying vec3 vWorld;uniform float uTime,uStorm,uNight,uWet;
        float wave(vec2 p){return sin(p.x*.11+uTime*.65)*.5+sin(p.y*.17-uTime*.42)*.31+sin((p.x+p.y)*.055+uTime*.31)*.19;}
        void main(){float w=wave(vWorld.xz);float glint=.5+.5*sin(vUv.y*165.+w*2.7+uTime*.7);
          vec3 base=mix(vec3(.10,.15,.16),vec3(.23,.27,.26),glint*.20);
          base=mix(base,vec3(.08,.12,.16),uNight*.58+uStorm*.28);
          gl_FragColor=vec4(base,1.);}`
    });
    const river=new THREE.Mesh(riverGeometry(),material);river.name='Visible winding river through distant city';river.renderOrder=0;this.group.add(river);
    this.river=river;this.materials.push(material);this.meshes.push(river);
    const bankMat=new THREE.MeshStandardMaterial({color:'#34443d',roughness:1});
    const banks=[];
    for(let i=0;i<36;i++){
      const t=i/35,x=-40-t*420,z=-390-t*520-Math.sin(t*Math.PI)*42+Math.sin(t*TAU*1.55)*15;
      const w=57+Math.sin(t*Math.PI)*23;
      banks.push({p:[x,GROUND+5.48,z+w+9],r:[0,hash(i)*.25,0],s:[16,.75,9+hash(i+4)*13]});
      banks.push({p:[x,GROUND+5.48,z-w-9],r:[0,hash(i+9)*.25,0],s:[16,.75,9+hash(i+7)*13]});
    }
    this.meshes.push(addInstances(this.group,'Broken green river embankments',new THREE.BoxGeometry(1,1,1),bankMat,banks));
  }

  makeBridge(){
    const bridge=new THREE.Group();bridge.name='Cinematic ruined suspension bridge';
    const cx=-188,cz=-610,deckY=GROUND+14.2;bridge.position.set(cx,0,cz);bridge.rotation.y=2.25;this.group.add(bridge);
    const concrete=new THREE.MeshStandardMaterial({color:'#696e6a',roughness:.92,metalness:.025});
    const asphalt=new THREE.MeshStandardMaterial({color:'#303634',roughness:.97});
    const steel=new THREE.MeshStandardMaterial({color:'#505957',roughness:.80,metalness:.34});
    const rust=new THREE.MeshStandardMaterial({color:'#76584b',roughness:.82,metalness:.40});
    this.materials.push(concrete,asphalt,steel,rust);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(17.5,.75,214),concrete);deck.position.y=deckY;bridge.add(deck);this.meshes.push(deck);
    const road=new THREE.Mesh(new THREE.BoxGeometry(14.8,.18,212),asphalt);road.position.y=deckY+.47;bridge.add(road);this.meshes.push(road);
    const rails=[];for(const side of [-1,1])for(let z=-99;z<=99;z+=11)rails.push({p:[side*8.15,deckY+1.15,z],s:[.18,1.55,9.8],c:color('#5d6866')});
    this.meshes.push(addInstances(bridge,'Bridge weathered guardrails',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.78,metalness:.5,vertexColors:true}),rails));
    const pylons=[];
    for(const z of [-62,62])for(const x of [-8.2,8.2])pylons.push({p:[x,deckY+22,z],s:[1,44,1],c:color('#69716e')});
    this.meshes.push(addInstances(bridge,'Tapered suspension bridge pylons',new THREE.CylinderGeometry(2.2,4.2,1,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.86,vertexColors:true}),pylons));
    for(const z of [-62,62]){
      const archPts=[new THREE.Vector3(-8.2,deckY+41,z),new THREE.Vector3(0,deckY+48,z),new THREE.Vector3(8.2,deckY+41,z)];
      const a=tube(bridge,archPts,.72,steel,'Bridge pylon crown',24);this.meshes.push(a);
    }
    const cableMat=new THREE.MeshStandardMaterial({color:'#505a58',roughness:.74,metalness:.38});
    this.materials.push(cableMat);
    for(const side of [-1,1]){
      const x=side*8.0,pts=[];
      for(let i=0;i<=36;i++){const q=i/36,z=-104+208*q;const arch=deckY+13+35*Math.pow(Math.abs(q-.5)*2,1.75);pts.push(new THREE.Vector3(x,arch,z));}
      const main=tube(bridge,pts,.28,cableMat,`Bridge main cable ${side}`,72);this.meshes.push(main);
      const hangers=[];
      for(let i=2;i<35;i+=3){const q=i/36,z=-104+208*q,arch=deckY+13+35*Math.pow(Math.abs(q-.5)*2,1.75);hangers.push({p:[x,(deckY+1+arch)*.5,z],s:[.08,arch-deckY-1,.08],c:color('#6f7b79')});}
      this.meshes.push(addInstances(bridge,`Bridge hangers ${side}`,new THREE.CylinderGeometry(.5,.5,1,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.65,metalness:.6,vertexColors:true}),hangers));
    }
    const piers=[];for(const z of [-92,-31,31,92])piers.push({p:[0,GROUND+9,z],s:[1,18,1],c:color('#626a66')});
    this.meshes.push(addInstances(bridge,'Bridge river piers',new THREE.CylinderGeometry(2.5,4.6,1,12),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.92,vertexColors:true}),piers));
    // Localized collapse: damaged edge and missing rail sections, not a blocky gap.
    const rubble=[];for(let i=0;i<18;i++)rubble.push({p:[(hash(i)-.5)*12,deckY+.6+(hash(i+2)-.5)*.5,18+(hash(i+4)-.5)*20],r:[hash(i+5)*.4,hash(i+7)*TAU,hash(i+9)*.35],s:[.5+hash(i+1)*1.8,.18+hash(i+3)*.35,.6+hash(i+6)*2.4],c:color(i%3?'#5e625e':'#76594a')});
    this.meshes.push(addInstances(bridge,'Bridge collapse debris',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.95,vertexColors:true}),rubble));
  }

  makeMountainMass(){
    const layers=[
      {radius:1010,height:58,color:'#40504b',opacity:1},
      {radius:1160,height:76,color:'#384844',opacity:1},
      {radius:1320,height:96,color:'#31413e',opacity:1}
    ];
    for(let i=0;i<layers.length;i++){
      const s=layers[i];
      const material=new THREE.MeshBasicMaterial({color:s.color,side:THREE.DoubleSide,fog:true});
      const ridge=new THREE.Mesh(ridgeArcGeometry(s.radius,31+i*47,s.height,1.82-i*.08,this.world.isMobile?64:92),material);
      ridge.name=`Layered distant mountain ridge ${i+1}`;
      ridge.receiveShadow=false;this.group.add(ridge);this.meshes.push(ridge);this.materials.push(material);
    }
  }

  makeDistantInfrastructure(){
    const cranes=[],stacks=[],towers=[];
    const count=this.world.isMobile?12:22;
    for(let i=0;i<count;i++){
      const a=5*Math.PI/4+(hash(i*31)-.5)*1.35,r=560+hash(i*19+3)*340,x=Math.sin(a)*r,z=Math.cos(a)*r;
      if(i%3===0)stacks.push({p:[x,GROUND+31,z],s:[3.5,62,3.5],c:color('#4d5451')});
      else if(i%3===1)towers.push({p:[x,GROUND+42,z],s:[1.2,84,1.2],c:color('#555f5c')});
      else cranes.push({p:[x,GROUND+40,z],s:[1,80,1],c:color('#5d625e')});
    }
    this.meshes.push(addInstances(this.group,'Far industrial smokestacks',new THREE.CylinderGeometry(.5,.7,1,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.94,vertexColors:true}),stacks));
    this.meshes.push(addInstances(this.group,'Far utility towers',new THREE.CylinderGeometry(.5,.5,1,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.38,vertexColors:true}),towers));
    this.meshes.push(addInstances(this.group,'Far construction crane masts',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.34,vertexColors:true}),cranes));
  }

  update(dt,weather,night){
    this.time+=dt;
    if(this.river){
      const u=this.river.material.uniforms;u.uTime.value=this.time;u.uStorm.value=weather?.storm||0;u.uWet.value=weather?.wet||0;u.uNight.value=night||0;
    }
    if(this.farCityMaterials)for(const m of this.farCityMaterials){m.emissive.set('#6d4d36');m.emissiveIntensity=.02+(night||0)*.16;}
  }

  dispose(){
    this.group.parent?.remove(this.group);
    for(const m of this.meshes){m.geometry?.dispose?.();if(Array.isArray(m.material))m.material.forEach(x=>x.dispose?.());else m.material?.dispose?.();}
    for(const m of this.materials)m?.dispose?.();for(const t of this.farCityTextures||[])t.dispose?.();
  }
}

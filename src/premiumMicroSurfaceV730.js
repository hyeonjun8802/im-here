import * as THREE from 'three';

/**
 * AFTERDAY v7.3 — procedural PBR micro-surface library.
 *
 * Existing authored GLBs keep their authored normal/roughness maps untouched.
 * Only procedural Standard/Physical materials without a normal map receive a
 * deterministic high-frequency concrete/asphalt/oxidized-metal normal +
 * roughness pair. Newly-created collapse geometry is discovered periodically.
 *
 * This changes material response only; geometry, game state and save data are
 * never modified.
 */
const hash=n=>{const x=Math.sin(n*197.31+43.17)*43758.5453123;return x-Math.floor(x);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function valueNoise(x,y,seed){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const h=(a,b)=>hash(seed+a*127.1+b*311.7);
  const a=h(ix,iy),b=h(ix+1,iy),c=h(ix,iy+1),d=h(ix+1,iy+1);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a,b,sx),
    THREE.MathUtils.lerp(c,d,sx),sy
  );
}
function fbm(x,y,seed){
  let v=0,a=.55,f=1;
  for(let i=0;i<5;i++){v+=valueNoise(x*f,y*f,seed+i*19.7)*a;f*=2.03;a*=.49;}
  return v;
}
function makeHeight(size,seed,mode){
  const h=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    let n=fbm(u*5.4,v*5.4,seed);
    const fine=fbm(u*26.0,v*26.0,seed+91);
    if(mode==='concrete'){
      const pore=Math.pow(hash((x>>2)*31+(y>>2)*79+seed),8)*.15;
      const crack=Math.abs(Math.sin((u*2.7+v*1.9+fbm(u*4,v*4,seed+31)*.35)*Math.PI*7.0));
      n=n*.72+fine*.23-pore-(crack<.045?.10:0);
    }else if(mode==='asphalt'){
      const aggregate=Math.pow(hash(x*17+y*43+seed+13),2.3);
      n=n*.48+fine*.18+aggregate*.28;
    }else{
      const pit=Math.pow(hash(x*23+y*59+seed+27),6);
      const brush=.5+.5*Math.sin((u*58+fbm(u*3,v*3,seed+7)*2.2)*Math.PI);
      n=n*.56+fine*.16+brush*.10-pit*.22;
    }
    h[y*size+x]=n;
  }
  return h;
}
function makeTextureSet(size,seed,mode){
  const height=makeHeight(size,seed,mode);
  const normal=new Uint8Array(size*size*4);
  const rough=new Uint8Array(size*size*4);
  const strength=mode==='asphalt'?4.6:mode==='metal'?3.0:4.0;
  const sample=(x,y)=>height[((y+size)%size)*size+((x+size)%size)];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const dx=(sample(x+1,y)-sample(x-1,y))*strength;
    const dy=(sample(x,y+1)-sample(x,y-1))*strength;
    const nz=1/Math.sqrt(dx*dx+dy*dy+1);
    normal[i]=Math.round(clamp((-dx*nz*.5+.5)*255,0,255));
    normal[i+1]=Math.round(clamp((-dy*nz*.5+.5)*255,0,255));
    normal[i+2]=Math.round(clamp((nz*.5+.5)*255,0,255));normal[i+3]=255;
    const base=mode==='metal'?.60:mode==='asphalt'?.88:.83;
    const variation=(height[y*size+x]-.5)*(mode==='metal'?.30:.20);
    const rv=Math.round(clamp(base+variation,.28,.99)*255);
    rough[i]=rough[i+1]=rough[i+2]=rv;rough[i+3]=255;
  }
  const nTex=new THREE.DataTexture(normal,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  const rTex=new THREE.DataTexture(rough,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  const repeat=mode==='asphalt'?7:mode==='metal'?9:6;
  for(const tex of [nTex,rTex]){
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(repeat,repeat);
    tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
    tex.generateMipmaps=true;tex.anisotropy=8;tex.needsUpdate=true;
  }
  nTex.name='AFTERDAY v7.3 '+mode+' micro normal';
  rTex.name='AFTERDAY v7.3 '+mode+' micro roughness';
  return {normal:nTex,roughness:rTex};
}

function classify(mesh,material){
  if(!mesh?.isMesh||!material)return null;
  if(!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial)return null;
  if(material.normalMap||material.roughnessMap)return null; // authored material wins.
  if(material.transparent&&material.opacity<.94)return null;
  const n=((mesh.name||'')+' '+(material.name||'')).toLowerCase();
  if(/glass|window|lamp|light|emissive|smoke|dust|fog|cloud|water|wet|puddle|pool|scar|soot|grime|cloth|fabric|canvas|plant|leaf/.test(n))return null;
  if(/asphalt|road|street|curb|ground/.test(n))return 'asphalt';
  if(/steel|metal|rust|iron|rebar|beam|pipe|duct|gantry|scaffold|antenna|cable|utility|frame|axle|vehicle/.test(n))return 'metal';
  if(/concrete|ruin|facade|slab|rubble|building|stump|civic|office|apartment|balcony|parapet|tower|debris/.test(n))return 'concrete';
  return null;
}

export class PremiumMicroSurfaceV730{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.elapsed=0;
    const size=this.mobile?128:256;
    this.sets={
      concrete:makeTextureSet(size,731,'concrete'),
      asphalt:makeTextureSet(size,1731,'asphalt'),
      metal:makeTextureSet(size,2731,'metal')
    };
    this.applied=new WeakSet();this.counts={concrete:0,asphalt:0,metal:0};
    this.applyNew();
  }

  applyNew(){
    this.world.scene.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const list=Array.isArray(o.material)?o.material:[o.material];
      for(const m of list){
        if(!m||this.applied.has(m))continue;
        const kind=classify(o,m);
        if(!kind)continue;
        const set=this.sets[kind];
        m.normalMap=set.normal;m.roughnessMap=set.roughness;
        m.normalMapType=THREE.TangentSpaceNormalMap;
        const scale=kind==='concrete'?.21:kind==='asphalt'?.16:.11;
        m.normalScale?.set?.(scale,scale);
        if(kind==='concrete')m.roughness=clamp(m.roughness??.86,.72,.98);
        else if(kind==='asphalt')m.roughness=clamp(m.roughness??.90,.75,.99);
        else m.roughness=clamp(m.roughness??.62,.35,.88);
        m.needsUpdate=true;this.applied.add(m);this.counts[kind]++;
        this.world.premiumWetMaterial?.registerMaterial(m,kind);
      }
    });
  }

  update(dt){
    this.elapsed+=Math.max(0,Number(dt)||0);
    if(this.elapsed<3.5)return;
    this.elapsed=0;
    // Ambient/tornado collapse systems can create new procedural materials later.
    this.applyNew();
  }

  dispose(){
    for(const set of Object.values(this.sets)){
      set.normal.dispose();set.roughness.dispose();
    }
  }
}

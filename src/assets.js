import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fitModelScale } from './modelSizing.js';
const RAW='https://raw.githubusercontent.com/dgreenheck/simcity-threejs-clone/main/src/public/';
// Models are adapted from dgreenheck/simcity-threejs-clone; original atlas is retained.
export class RepoAssets {
  constructor(){this.loader=new GLTFLoader();this.textureLoader=new THREE.TextureLoader();this.cache=new Map();this.failed=new Set();this.atlas=null;this.loading=0;this.success=0;this.queue=[];this.active=0;this.maxActive=6;this.initPromise=this.init();}
  async init(){const local='./assets/textures/base.png';try{this.atlas=await this.textureLoader.loadAsync(local);}catch{try{this.atlas=await this.textureLoader.loadAsync(RAW+'textures/base.png');}catch{this.atlas=null;}}
    if(this.atlas){this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.magFilter=THREE.NearestFilter;this.atlas.minFilter=THREE.LinearMipmapLinearFilter;this.atlas.flipY=false;for(const task of this.cache.values()){task.then(scene=>scene?.traverse(o=>{if(o.isMesh&&o.material){o.material.map=this.atlas;o.material.needsUpdate=true}})).catch(()=>{})}}}
  throttle(run){return new Promise((resolve,reject)=>{this.queue.push({run,resolve,reject});this.pump();});}
  pump(){while(this.active<this.maxActive&&this.queue.length){const job=this.queue.shift();this.active++;Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{this.active--;this.pump()});}}
  async get(name){if(this.cache.has(name))return this.cache.get(name);const task=this.throttle(()=>this.load(name));this.cache.set(name,task);return task;}
  async load(name){await this.initPromise;const file=name.endsWith('.glb')?name:name+'.glb';const urls=['./assets/models/'+file,RAW+'models/'+file];for(const url of urls){try{const scene=(await this.loader.loadAsync(url)).scene;scene.traverse(obj=>{if(!obj.isMesh)return;obj.castShadow=true;obj.receiveShadow=true;obj.material=new THREE.MeshStandardMaterial({color:0xffffff,map:this.atlas||null,roughness:.92,metalness:.025,side:THREE.DoubleSide});});this.success++;return scene;}catch{}}
    this.failed.add(file);return null;
  }
  // Standardize arbitrary SimCity meshes to target world units, origin = model floor.
  async instance(name, desiredHeight=4,opts={}){
    const original=await this.get(name);if(!original)return null;const clone=original.clone(true);
    // Clone material per placement; never mutate the shared original atlas/material.
    if (opts.tint !== undefined) clone.traverse(obj=>{
      if (obj.isMesh && obj.material) {
        obj.material=obj.material.clone();
        obj.material.color.set(opts.tint);
      }
    });
    const box=new THREE.Box3().setFromObject(clone);const sz=box.getSize(new THREE.Vector3());if(sz.y<.0001||!Number.isFinite(sz.y))return null;
    // Height-only normalization can enlarge flat roof/floor GLBs into a second rooftop.
    // Enforce BOTH height and horizontal-footprint budgets for all instances.
    const scale=fitModelScale(sz,desiredHeight,opts);
    if(!scale)return null;
    clone.scale.multiplyScalar(scale);
    const actual=new THREE.Box3().setFromObject(clone);const c=actual.getCenter(new THREE.Vector3());clone.position.x-=c.x;clone.position.z-=c.z;clone.position.y-=actual.min.y;
    return clone;
  }
}

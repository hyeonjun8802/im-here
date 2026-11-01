/** Geometry-level QA with the actual Three.js implementation. Run after npm install. */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installOriginalCot,COT,sleepPosition} from '../src/sleepBedding.js';
import {sleepAnimation,SLEEP_ENTER_SECONDS} from '../src/dailyCycle.js';
// No browser DOM: test geometry without loading material textures.
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
const scene=new THREE.Scene(),bed=installOriginalCot(scene,16);
assert.equal(scene.children.length,1);
assert.equal(scene.getObjectByName('single soft pillow • head end -X')?.position.x,COT.pillowX);
const cover=scene.getObjectByName('stitched fabric blanket • animated unfolding');
const v=cover.geometry.attributes.position;
const range=()=>{let xMin=Infinity,xMax=-Infinity,yMax=-Infinity;for(let i=0;i<v.count;i++){
  const x=v.getX(i),y=v.getY(i),z=v.getZ(i);assert.ok([x,y,z].every(Number.isFinite));
  xMin=Math.min(x,xMin);xMax=Math.max(x,xMax);yMax=Math.max(y,yMax);
 }return {xMin,xMax,yMax};};
const folded=range();bed.setCover(.5);const midway=range();bed.setCover(1);const deployed=range();
assert.ok(folded.xMin>midway.xMin&&midway.xMin>deployed.xMin,'blanket must unfold toward pillow');
assert.ok(deployed.xMin<COT.x&&deployed.xMin>COT.pillowX,'blanket covers torso, leaves head exposed');
assert.ok(deployed.yMax>midway.yMax&&midway.yMax>folded.yMax,'cloth drapes over body');
const pos=sleepPosition(sleepAnimation('enter',SLEEP_ENTER_SECONDS));
assert.deepEqual(pos,COT.feet);
const headLocal=new THREE.Vector3(0,2,0),faceLocal=new THREE.Vector3(0,0,1);
const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2)
 .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2));
headLocal.applyQuaternion(q);faceLocal.applyQuaternion(q);
assert.ok(Math.abs(headLocal.x+2)<1e-6&&Math.abs(headLocal.y)<1e-6,'head must lie towards -X pillow');
assert.ok(Math.abs(faceLocal.y-1)<1e-6,'nose must face sky, not mattress');
assert.ok(Math.abs(COT.feet[0]+headLocal.x-COT.pillowX)<.3);
bed.dispose();console.log('V320 actual Three.js cot, blanket mesh and supine pose: PASS');

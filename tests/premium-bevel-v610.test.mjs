import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {BEVEL_SEGMENTS,beveledProp} from '../src/premiumBeveledPropsV610.js';

test('close-range PBR storage corners have real rounded geometry rather than image smoothing',()=>{
 const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:'#665d55',roughness:.8});
 const m=beveledProp(root,[2,.4,1.2],[3,2,4],mat,.11);
 assert.equal(BEVEL_SEGMENTS,3);
 assert.equal(root.children.length,1);
 assert.equal(m.material,mat);
 assert.equal(m.castShadow,true);
 assert.equal(m.receiveShadow,true);
 assert.equal(m.position.x,3);
 assert.ok(m.geometry.attributes.position.count>24,'rounded silhouette adds actual vertices');
 assert.ok(m.geometry.attributes.normal,'rounded surface has normals for smooth PBR shading');
 const box=new THREE.Box3().setFromObject(m);
 const dims=box.getSize(new THREE.Vector3());
 assert.ok(Math.abs(dims.x-2)<.002);
 assert.ok(Math.abs(dims.y-.4)<.002);
 assert.ok(Math.abs(dims.z-1.2)<.002);
 m.geometry.dispose();mat.dispose();
});
test('very thin trim caps bevel radius and stays non-degenerate',()=>{
 const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial();
 const m=beveledProp(group,[2.6,3,.15],[0,2,0],mat,.4);
 const positions=m.geometry.attributes.position.array;
 assert.ok(Array.from(positions).every(Number.isFinite));
 const bs=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
 assert.ok(Math.abs(bs.z-.15)<.002);
 m.geometry.dispose();mat.dispose();
});
test('hero-prop geometry is bounded and distant city geometry unchanged',()=>{
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const city=readFileSync(new URL('../src/cityInfillV150.js',import.meta.url),'utf8');
 const count=(world.match(/beveledProp\(/g)||[]).length;
 assert.ok(count>=7&&count<20,'bevels only a handful of near-camera props');
 assert.match(world,/beveledProp\(garden,\[10,\.8,2\.2\]/);
 assert.match(world,/beveledProp\(stair,\[6\.7,\.7,6\.7\]/);
 assert.match(world,/this\.createRoofProps\(\)/);
 assert.doesNotMatch(city,/RoundedBoxGeometry/,'never bevel thousands of background city instances');
});

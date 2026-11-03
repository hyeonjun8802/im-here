import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RescueHelicopterVfx} from '../src/rescueHelicopterVfx.js';

test('a newly obtained radio drop triggers exactly one visual helicopter and parachuted crate',()=>{
 const scene=new THREE.Scene();
 const fx=new RescueHelicopterVfx(scene,50);
 assert.equal(fx.active,false);
 fx.update(.1,0,'');
 assert.equal(fx.active,false);
 fx.update(.1,1,'drop');
 assert.equal(fx.active,true);
 for(let i=0;i<71;i++)fx.update(.1,1,'drop');
 assert.equal(fx.root.visible,true);
 assert.equal(fx.crate.visible,true);
 const x=fx.body.position.x;
 fx.update(.1,1,'drop');
 assert.ok(fx.body.position.x>x);
 for(let i=0;i<200;i++)fx.update(.1,1,'drop');
 assert.equal(fx.active,false);
 assert.equal(fx.root.visible,false);
 fx.update(.1,1,'drop');
 assert.equal(fx.active,false,'same saved event must not replay');
 fx.dispose();
});

test('previously saved helicopter news does not replay on page reload or survivor contacts',()=>{
 const fx=new RescueHelicopterVfx(new THREE.Scene(),50);
 fx.update(.1,42,'drop');
 assert.equal(fx.active,false,'first render only records last saved news');
 fx.update(.1,43,'contact');
 assert.equal(fx.active,false,'survivor radio messages cannot spawn an aircraft');
 fx.update(.1,44,'drop');
 assert.equal(fx.active,true);
 fx.dispose();
});

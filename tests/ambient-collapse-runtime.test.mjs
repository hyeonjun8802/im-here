import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AmbientCityCollapseV660} from '../src/ambientCityCollapseV660.js';
for(const mobile of [true,false])test(`collapse update executes from first frame through settling (${mobile})`,()=>{
 const slot={id:'ruin',x:220,z:180,tier:'mid',width:12,height:35};
 const host=new THREE.Group(),original=new THREE.Group();host.add(original);
 const world={isMobile:mobile,distantCityPlan:[slot],cityBuildings:new Map([[slot.id,host]])};
 const system=new AmbientCityCollapseV660(world),game={startedAt:1,weather:'clear'};
 system.update(.016,1000,game,{});
 assert.ok(game.nextAmbientCollapseAt>1000);
 assert.equal(system.trigger(game,2000),true);
 for(let i=0;i<400;i++)system.update(.016,2000+i*16,game,{storm:.7,wind:.8});
 assert.equal(system.active.length,0);assert.equal(original.visible,false);
 assert.deepEqual(game.ambientCollapseIds,['ruin']);
 assert.ok(host.children.some(o=>o.userData.persistent));
 host.traverse(o=>assert.ok(Number.isFinite(o.position.x)&&Number.isFinite(o.position.y)&&Number.isFinite(o.position.z)));
 system.dispose();
});

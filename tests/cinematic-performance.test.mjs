import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const world=fs.readFileSync('src/world.js','utf8');
test('distant fallback buildings now batch windows instead of thousands of single meshes',()=>{
 assert.match(world,/cityFacadeMaterials\(tier,index\)/);
 assert.match(world,/createFracturedTowerGeometry/);
 assert.match(fs.readFileSync('src/ruinedBuildingGeometry.js','utf8'),/geo\.addGroup/);
 assert.match(world,/new THREE\.InstancedMesh\(new THREE\.BoxGeometry/);
 assert.match(world,/The licensed models remain available to the camp and parked vehicles/);
 assert.doesNotMatch(world,/this\.assets\.instance\(token,height/);
});
test('original hero tower facade is instanced and no building rooftops are added',()=>{
 assert.match(world,/façadeGroups/);
 assert.match(world,/const mesh=new THREE.InstancedMesh\(new THREE.BoxGeometry/);
 const layout=fs.readFileSync('src/spatialLayout.js','utf8');
 assert.match(layout,/heroRoofCount:\s*1/);
});
test('environment reflections and authored canvas wind movement are integrated',()=>{
 assert.match(world,/THREE\.EquirectangularReflectionMapping/);
 assert.match(world,/this\.scene\.environmentIntensity/);
 assert.match(world,/heroCanopyMesh/);
 assert.match(world,/this\.heroCanopyVerts/);
});

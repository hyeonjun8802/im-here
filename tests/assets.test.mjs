import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
test('Original GitHub provenance in manifest',()=>{assert.match(manifest.repository,/dgreenheck\/simcity-threejs-clone/);assert.equal(manifest.license.startsWith('MIT'),true)});
test('Enough actual repository GLB paths selected',()=>{assert.ok(manifest.models.length>=70);assert.equal(new Set(manifest.models).size,manifest.models.length);for(const n of manifest.models)assert.match(n,/^[\w-]+\.glb$/)});
test('Reference texture files',()=>{assert.ok(manifest.textureFiles.includes('base.png'));assert.ok(fs.existsSync('public/assets/materials/concrete.jpg'))});

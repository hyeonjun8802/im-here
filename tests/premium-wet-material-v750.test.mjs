import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PremiumWetMaterialV750, approachWetness} from '../src/premiumWetMaterialV750.js';
import {PremiumMicroSurfaceV730} from '../src/premiumMicroSurfaceV730.js';

function fixture() {
  const world = {scene: new THREE.Scene(), isMobile: true};
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial({roughness: .92, color: '#758184'});
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'concrete building'; world.scene.add(mesh);
  world.premiumMicroSurface = new PremiumMicroSurfaceV730(world);
  world.premiumWetMaterial = new PremiumWetMaterialV750(world);
  return {world, geometry, material, wet: world.premiumWetMaterial, cleanup() {
    world.premiumWetMaterial.dispose(); world.premiumMicroSurface.dispose(); geometry.dispose(); material.dispose();
  }};
}

test('wetting and drying are monotonic, bounded and independent of render frame rate', () => {
  let fine = 0, coarse = 0;
  for (let i = 0; i < 120; i++) fine = approachWetness(fine, 1, 1 / 60);
  for (let i = 0; i < 20; i++) coarse = approachWetness(coarse, 1, .1);
  assert.ok(Math.abs(fine - coarse) < 1e-12);
  assert.ok(fine > .75 && fine < .85);
  const drying = approachWetness(1, 0, .1), wetting = approachWetness(0, 1, .1);
  assert.ok(drying > .98); assert.ok(wetting > 1 - drying);
  for (const dt of [NaN, Infinity, -5, 0]) assert.equal(approachWetness(.4, 1, dt), .4);
  assert.ok(approachWetness(.5, NaN, .1) < .5);
  assert.ok(approachWetness(0, 1, 100) < .1, 'tab-resume time is capped');
});

test('procedural surfaces become damp while maps, color, metalness and shader version stay intact', () => {
  const f = fixture(), m = f.material;
  const before = {normal: m.normalMap, rough: m.roughnessMap, color: m.color.clone(), metal: m.metalness, version: m.version};
  const dryNormal = m.normalScale.clone();
  for (let i = 0; i < 160; i++) f.wet.update(.1, {wet: 1});
  assert.ok(m.roughness >= .58 && m.roughness < .59);
  assert.ok(m.normalScale.x < dryNormal.x && m.normalScale.x > 0);
  assert.equal(m.normalMap, before.normal); assert.equal(m.roughnessMap, before.rough);
  assert.deepEqual(m.color, before.color); assert.equal(m.metalness, before.metal);
  assert.equal(m.version, before.version);
  f.cleanup();
});

test('a full wet/dry cycle restores exact baseline values without accumulating drift', () => {
  const f = fixture(), original = f.material.roughness, normal = f.material.normalScale.clone();
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let i = 0; i < 180; i++) f.wet.update(.1, {wet: 1});
    for (let i = 0; i < 1300; i++) f.wet.update(.1, {wet: 0});
    assert.equal(f.material.roughness, original); assert.deepEqual(f.material.normalScale, normal);
  }
  f.cleanup();
});

test('authored PBR, transparent water and character fabric remain outside the wetting registry', () => {
  const f = fixture(), authoredNormal = new THREE.Texture(), authoredRough = new THREE.Texture();
  const authored = new THREE.MeshStandardMaterial({normalMap: authoredNormal, roughnessMap: authoredRough, roughness: .8});
  const water = new THREE.MeshPhysicalMaterial({transparent: true, opacity: .5, roughness: .1});
  const fabric = new THREE.MeshStandardMaterial({roughness: .95});
  for (const [name, mat] of [['concrete authored building', authored], ['water pool', water], ['canvas jacket', fabric]]) {
    const mesh = new THREE.Mesh(f.geometry, mat); mesh.name = name; f.world.scene.add(mesh);
  }
  f.world.premiumMicroSurface.applyNew();
  for (let i = 0; i < 50; i++) f.wet.update(.1, {wet: 1});
  assert.equal(f.wet.records.size, 1); assert.equal(authored.roughness, .8);
  assert.equal(authored.normalMap, authoredNormal); assert.equal(authored.roughnessMap, authoredRough);
  assert.equal(water.roughness, .1); assert.equal(fabric.roughness, .95);
  f.cleanup(); authored.dispose(); water.dispose(); fabric.dispose(); authoredNormal.dispose(); authoredRough.dispose();
});

test('new collapse materials inherit current wetness once, and disposed materials release their records', () => {
  const f = fixture();
  for (let i = 0; i < 100; i++) f.wet.update(.1, {wet: 1});
  const m = new THREE.MeshStandardMaterial({roughness: .94}), mesh = new THREE.Mesh(f.geometry, m);
  mesh.name = 'concrete collapse rubble'; f.world.scene.add(mesh);
  f.world.premiumMicroSurface.applyNew();
  assert.equal(f.wet.records.size, 2); assert.ok(m.roughness < .60);
  f.world.premiumMicroSurface.applyNew(); assert.equal(f.wet.records.size, 2);
  m.dispose(); assert.equal(f.wet.records.size, 1);
  f.wet.dispose(); f.wet.dispose(); assert.equal(f.wet.records.size, 0);
  assert.equal(f.material.roughness, .92);
  assert.equal(f.wet.registerMaterial(m, 'concrete'), false);
  f.cleanup();
});

test('asphalt and metal retain separate wet roughness and never roughen an already smooth surface', () => {
  const f = fixture(), materials = [];
  for (const [kind, roughness] of [['asphalt', .9], ['metal', .6], ['metal', .2]]) {
    const m = new THREE.MeshStandardMaterial({roughness}); materials.push(m); f.wet.registerMaterial(m, kind);
  }
  for (let i = 0; i < 180; i++) f.wet.update(.1, {wet: 1});
  assert.equal(materials[0].roughness, .42); assert.equal(materials[1].roughness, .35);
  assert.equal(materials[2].roughness, .2);
  f.cleanup(); for (const m of materials) m.dispose();
});

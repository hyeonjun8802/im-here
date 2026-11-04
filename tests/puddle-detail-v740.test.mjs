import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PuddleDetailV740, puddleMask, rippleSlope} from '../src/puddleDetailV740.js';
import {PremiumWeatherSurfacesV700} from '../src/premiumWeatherSurfacesV700.js';

test('puddle edges feather to zero, keep a reflective center and vary by angle', () => {
  assert.equal(puddleMask(.5, .5), 1);
  for (let i = 0; i <= 32; i++) {
    const u = i / 32;
    for (const value of [puddleMask(u, 0), puddleMask(u, 1), puddleMask(0, u), puddleMask(1, u)]) assert.equal(value, 0);
  }
  const edge = Array.from({length: 16}, (_, i) => puddleMask(.5 + .38 * Math.cos(i * Math.PI / 8), .5 + .38 * Math.sin(i * Math.PI / 8)));
  assert.ok(Math.max(...edge) - Math.min(...edge) > .4);
  assert.ok(edge.some(v => v > 0 && v < 1), 'soft alpha edge rather than a cutout');
});

test('rain normals tile spatially and loop without discontinuities', () => {
  for (const t of [0, .13, .49, .91]) for (const u of [0, .21, .75]) {
    const a = rippleSlope(u, .37, t), b = rippleSlope(u + 1, .37, t), c = rippleSlope(u, 1.37, t);
    for (let axis = 0; axis < 2; axis++) {
      assert.ok(Math.abs(a[axis] - b[axis]) < 1e-12);
      assert.ok(Math.abs(a[axis] - c[axis]) < 1e-12);
      assert.ok(Math.abs(a[axis] - rippleSlope(u, .37, t + 1)[axis]) < 1e-12);
    }
  }
  const before = rippleSlope(.2, .4, 1 - 1e-6), after = rippleSlope(.2, .4, 1e-6);
  assert.ok(Math.hypot(before[0] - after[0], before[1] - after[1]) < .001);
});

test('dry weather removes ripple response; rain advances existing textures without shader rebuilds', () => {
  const material = new THREE.MeshPhysicalMaterial(), detail = new PuddleDetailV740(material, true);
  const first = material.normalMap, version = material.version;
  detail.update(.1, 0, 1);
  assert.equal(material.normalScale.length(), 0); assert.equal(material.normalMap, first);
  detail.update(.1, 1, 1);
  assert.ok(material.normalScale.x > 0); assert.notEqual(material.normalMap, first);
  assert.equal(material.clearcoatNormalMap, material.normalMap);
  assert.deepEqual(material.clearcoatNormalScale, material.normalScale);
  for (let i = 0; i < 80; i++) detail.update(.016, 1, 1);
  assert.equal(material.version, version, 'no per-frame shader recompilation');
  assert.ok(detail.frames.includes(material.normalMap));
  detail.update(.1, 1, 0); assert.equal(material.normalScale.length(), 0);
  detail.dispose(); material.dispose();
});

test('mobile detail has a smaller bounded texture budget and deterministic unit normals', () => {
  const mobileMat = new THREE.MeshPhysicalMaterial(), desktopMat = new THREE.MeshPhysicalMaterial();
  const mobile = new PuddleDetailV740(mobileMat, true), desktop = new PuddleDetailV740(desktopMat);
  assert.equal(mobile.frames.length, 8); assert.equal(desktop.frames.length, 12);
  assert.equal(mobile.mask.image.width, 64); assert.equal(desktop.mask.image.width, 128);
  const duplicateMat = new THREE.MeshPhysicalMaterial(), duplicate = new PuddleDetailV740(duplicateMat, true);
  assert.deepEqual(mobile.frames[0].image.data, duplicate.frames[0].image.data);
  for (const frame of mobile.frames) {
    const data = frame.image.data;
    for (let i = 0; i < data.length; i += 4) {
      const length = Math.hypot(data[i] / 127.5 - 1, data[i + 1] / 127.5 - 1, data[i + 2] / 127.5 - 1);
      assert.ok(Math.abs(length - 1) < .014); assert.equal(data[i + 3], 255);
    }
    assert.equal(frame.colorSpace, THREE.NoColorSpace);
  }
  mobile.dispose(); desktop.dispose(); duplicate.dispose(); mobileMat.dispose(); desktopMat.dispose(); duplicateMat.dispose();
});

test('invalid time and weather inputs stay finite and cleanup restores prior maps exactly once', () => {
  const normal = new THREE.Texture(), alpha = new THREE.Texture();
  const mat = new THREE.MeshPhysicalMaterial({normalMap: normal, alphaMap: alpha, normalScale: new THREE.Vector2(.2, .3)});
  const detail = new PuddleDetailV740(mat, true);
  let disposed = 0;
  for (const map of [detail.mask, ...detail.frames]) map.addEventListener('dispose', () => disposed++);
  for (const dt of [NaN, Infinity, -1, 120]) detail.update(dt, Infinity, NaN);
  assert.ok(Number.isFinite(detail.elapsed)); assert.equal(mat.normalScale.length(), 0);
  detail.update(120, 2, 2); assert.ok(detail.elapsed <= .1);
  detail.dispose(); detail.dispose(); detail.update(.1, 1, 1);
  assert.equal(disposed, 9); assert.equal(mat.normalMap, normal); assert.equal(mat.alphaMap, alpha);
  assert.deepEqual(mat.normalScale, new THREE.Vector2(.2, .3));
  normal.dispose(); alpha.dispose(); mat.dispose();
});

test('weather integration reuses existing instances and removes all owned scene objects on disposal', () => {
  const world = {scene: new THREE.Scene(), isMobile: true, ROOF_Y: 80, distantCityPlan: []};
  const wet = new PremiumWeatherSurfacesV700(world);
  const instances = wet.wetPatches.count, sceneObjects = [];
  world.scene.traverse(o => sceneObjects.push(o));
  wet.update(.1, {wet: 0, rain: 0}, 0, 0);
  assert.equal(wet.wetPatches.visible, false); assert.equal(wet.splashes.visible, false);
  wet.update(.1, {wet: 1, rain: 1, storm: 1}, 1, 1);
  assert.equal(wet.wetPatches.visible, true); assert.equal(wet.splashes.visible, true);
  assert.ok(wet.wetMaterial.alphaMap.isDataTexture);
  assert.equal(wet.wetMaterial.normalMap, wet.wetMaterial.clearcoatNormalMap);
  assert.equal(wet.wetPatches.count, instances);
  const after = []; world.scene.traverse(o => after.push(o)); assert.deepEqual(after, sceneObjects);
  wet.dispose(); assert.equal(world.scene.children.length, 0);
});

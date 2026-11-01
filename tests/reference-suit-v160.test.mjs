import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REFERENCE_SUIT_FILE,REFERENCE_SUIT_PARTS} from '../src/referenceSurvivorPlanV160.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/referenceSurvivorV160.js'),'utf8');
const file=path.join(root,'public',REFERENCE_SUIT_FILE.replace(/^\.\/assets\//,'assets/'));
const raw=fs.readFileSync(file);
function glbJSON(data){const jsonLen=data.readUInt32LE(12);return JSON.parse(data.toString('utf8',20,20+jsonLen));}
test('rig-attached organic suit is a real embedded GLB',()=>{assert.equal(raw.toString('utf8',0,4),'glTF');assert.equal(raw.readUInt32LE(4),2);assert.equal(raw.readUInt32LE(8),raw.length);assert.ok(raw.length>200000);});
test('organic GLB has four named garment meshes',()=>{const json=glbJSON(raw);const names=json.meshes.map(x=>x.name);for(const name of REFERENCE_SUIT_PARTS)assert.ok(names.includes(name),name);assert.ok(json.images?.length>=2);assert.ok(json.materials?.some(m=>m.normalTexture),'PBR normal must be embedded in suit GLB');});
test('GLTFLoader connects clothing to existing articulated pivots, not billboard',()=>{for(const t of ['loadSuit()','survivorTorso','leftArm','rightArm','leftLeg','rightLeg','survivorKnees','parent.add(garment)'])assert.ok(source.includes(t),t);});
test('failure retains original appearance',()=>{assert.ok(source.includes("this.suitStatus='fallback'"));assert.ok(source.includes('original articulated clothing retained'));});
test('body and face both use GLTFLoader, original motion preserved',()=>{assert.ok(source.match(/new GLTFLoader\(\)\.loadAsync\(REFERENCE_HEAD_FILE\)/));assert.ok(source.match(/new GLTFLoader\(\)\.loadAsync\(REFERENCE_SUIT_FILE\)/));});

test("experimental suit disabled by default after offline comparison finds design mismatch",()=>{assert.ok(source.includes("get('experimentalSuit')==='1'"));assert.ok(source.includes("this.suitStatus=this.experimentalSuit?'loading':'disabled'"));});

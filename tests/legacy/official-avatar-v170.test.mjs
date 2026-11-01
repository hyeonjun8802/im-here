import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {OFFICIAL_AVATAR,normalizeAvatarHeight,officialAvatarAction} from '../src/avatarProviderV170.js';
const root=process.cwd();
const text=async p=>readFile(join(root,p),'utf8');

test('official free engine is a dependency, not a hand-drawn renderer',async()=>{
 const pkg=JSON.parse(await text('package.json'));
 assert.equal(pkg.dependencies['@pixiv/three-vrm'],'3.5.5');
 assert.equal(pkg.scripts['download:avatar'],'node scripts/download-avatar.mjs');
});
test('provider uses an existing CC0 male humanoid, not an invented avatar',()=>{
 assert.match(OFFICIAL_AVATAR.license,/vroid\.pixiv\.help/);
 assert.match(OFFICIAL_AVATAR.source,/Sakurada_Fumiriya\.vrm/);
 assert.match(OFFICIAL_AVATAR.model,/\.vrm$/);
});
test('normalization handles valid heights and rejects invalid values',()=>{
 assert.equal(normalizeAvatarHeight(1.625),2);
 for(const n of [0,-1,NaN,Infinity,100])assert.throws(()=>normalizeAvatarHeight(n));
});
test('game preserves sitting, walking and radio activity classification',()=>{
 assert.equal(officialAvatarAction({stage:'approach',current:'guitar'}),'walk');
 assert.equal(officialAvatarAction({stage:'perform',current:'eat'}),'seated');
 assert.equal(officialAvatarAction({stage:'perform',current:'guitar'}),'seated');
 assert.equal(officialAvatarAction({stage:'perform',current:'radio'}),'radio');
 assert.equal(officialAvatarAction({stage:'done',current:'radio'}),'idle');
});
test('new avatar hides the entire synthetic survivor rather than stacking faces',async()=>{
 const source=await text('src/officialVRMAvatarV170.js');
 assert.match(source,/VRMLoaderPlugin/);
 assert.match(source,/world\.survivor\.add\(this\.container\)/);
 assert.match(source,/for\(const old of this\.legacy\)old\.visible=false/);
 assert.match(source,/getNormalizedBoneNode/);
 assert.match(source,/this\.vrm\.update\(d\)/);
 assert.doesNotMatch(source,/new THREE\.(SphereGeometry|BoxGeometry|CylinderGeometry)/);
});
test('world integration updates avatar only after simulation action update',async()=>{
 const world=await text('src/world.js');
 assert.match(world,/new OfficialVRMAvatarV170\(this\)/);
 const life=world.indexOf('this.life.update(dt,now,game,preset)');
 const avatar=world.indexOf('this.officialAvatar?.update(dt)');
 assert.ok(life>=0 && avatar>life);
 assert.match(world,/this\.officialAvatar\?\.dispose\(\)/);
});
test('existing asset downloader also installs the CC0 VRM',async()=>{
 const src=await text('scripts/download-assets.mjs');
 assert.match(src,/import\('\.\/download-avatar\.mjs'\)/);
 const installer=await text('scripts/download-avatar.mjs');
 assert.match(installer,/glTF/);
 assert.match(installer,/expectedBytes/);
});

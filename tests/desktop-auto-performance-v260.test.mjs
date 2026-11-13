import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
const w=read('world.js'),finish=read('premiumAssetFinishV620.js'),post=read('cinematicPostV130.js');

test('PC starts in balanced AUTO, manual HIGH is still available',()=>{
 assert.match(w,/this\.resize\(\);if\(!this\.isMobile\)this\.setQuality\('auto'\)/);
 assert.match(w,/const balanced=!mobile&&value==='auto'&&!low/);
 assert.match(w,/low\?1\.15:balanced\?1\.3:1\.8/);
 assert.match(w,/low\?1024:balanced\?2048:4096/);
 assert.match(w,/this\.premiumAssetFinish\?\.setQuality\(low,balanced\)/);
 assert.match(w,/this\.cinematicPost\?\.setQuality\(low,balanced\)/);
});
test('PC AUTO drops SSAO and extra shadow, HIGH retains both',()=>{
 assert.match(post,/setQuality\(low,balanced=false\)/);
 assert.match(post,/this\.ssao\.enabled=!low&&!balanced/);
 assert.match(finish,/setQuality\(low,balanced=false\)/);
 assert.match(finish,/l\.castShadow=!mobile&&!balanced&&l===this\.practical\[0\]/);
});
test('periodic normal rebuild is bounded to once per normal interval',()=>{
 assert.match(w,/this\._lastTarpNormalStep!==step/);
 assert.match(w,/this\._lastCanopyNormalStep!==step/);
 assert.doesNotMatch(w,/if\(Math\.floor\(t\*10\)%8===0\)this\.tarpMesh\.geometry\.computeVertexNormals\(\)/);
});

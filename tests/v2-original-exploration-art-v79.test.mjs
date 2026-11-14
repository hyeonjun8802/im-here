import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ART={
 'map/overview.svg':{bytes:4960,sha:'45e19c9282359803cb55fa946249e4bda5b0ef21db4341a923468db33ad9fe47'},
 'locations/ruined_house.svg':{bytes:2244,sha:'ee8666542a9d4ef28f7aab311440cc04cf57d78654ac05bfff2b081cc84f541b'},
 'locations/convenience_store.svg':{bytes:2128,sha:'847f735f2f80d363e7ef701f25317b5a7928dbe77dfccabb8f417cce10a28549'}
};

test('three production assets now contain verified optimized original v2 map/site artwork',()=>{
 for(const [p,expected] of Object.entries(ART)){
  const svg=read('public/assets/exploration/'+p);
  assert.match(svg,/^<svg[^>]*viewBox="/);
  const encoded=svg.match(/<image href="data:image\/webp;base64,([^"]+)"/)?.[1];
  assert.ok(encoded,p);
  const b=Buffer.from(encoded,'base64');
  assert.equal(b.length,expected.bytes,p);
  assert.equal(b.toString('ascii',0,4),'RIFF',p);
  assert.equal(b.toString('ascii',8,12),'WEBP',p);
  assert.equal(createHash('sha256').update(b).digest('hex'),expected.sha,p);
  const webp=readFileSync(new URL('../public/assets/exploration/'+p.replace(/\.svg$/,'.webp'),import.meta.url));
  assert.equal(createHash('sha256').update(webp).digest('hex'),expected.sha,'production WebP matches v2 source');
  assert.doesNotMatch(svg,/<path |<rect /,p+' must not be a hand-drawn placeholder');
 }
});

test('map black fog exposes the original ruined neighborhood and uses actual v2 location photos',()=>{
 const ui=read('src/explorationMapUiV78.js');
 const css=read('src/explorationMapPolishV79.css');
 assert.match(ui,/map\/overview\.webp/);
 assert.match(ui,/"\+site\.id\+'\.webp'/);
 assert.match(ui,/globalCompositeOperation='destination-out'/);
 assert.match(ui,/reveal\(\.50,\.50,\.22\)/);
 assert.match(ui,/function updateRoute\(\)/);
 assert.match(css,/\.exploration-map__route/);
 assert.match(css,/left:50%;top:50%/);
 assert.match(css,/@media\(max-width:720px\)/);
});

test('the original equipment HUD art and nine-action slot placement remain untouched',()=>{
 const css=read('src/explorationMapPolishV79.css');
 const html=read('index.html');
 assert.match(html,/explorationMapV78\.css"\/><link rel="stylesheet" href="\.\/src\/explorationMapPolishV79\.css"/);
 assert.doesNotMatch(css,/#hud|\.actionbar|\.topbar|\.disaster-forecast|hudAlignmentV1300/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>readFileSync(new URL(p,root));
const html=read('index.html').toString();
const css=read('src/commonUiV1202.css').toString();

test('actual transparent WebP assets are bundled at the game public path',()=>{
 const data={
  'actionbar_frame.webp':[1148,172],
  'warning_frame.webp':[768,117],
  'inventory_frame.webp':[461,308],
 };
 for(const [file,[width,height]] of Object.entries(data)){
  const bytes=read('public/assets/ui/apocalypse-common-v3/'+file);
  assert.ok(bytes.byteLength>1000,file+' must not be empty');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.toString('ascii',12,16),'VP8X');
  assert.equal(bytes.readUIntLE(24,3)+1,width,file+' width');
  assert.equal(bytes.readUIntLE(27,3)+1,height,file+' height');
 }
});

test("no extra action replaces the game\'s original decision handlers",()=>{
 assert.match(html,/commonUiV1202\.css/);
 assert.match(html,/id="survival-kit-action"/);
 assert.match(html,/explore\?\.click\(\)/);
 assert.match(html,/id="drink"/);
 assert.match(html,/id="weather-panel-toggle"/);
 const pos0=html.indexOf('commonUiV1200.css');
 const pos1=html.indexOf('commonUiV1201.css');
 const pos2=html.indexOf('commonUiV1202.css');
 assert.ok(pos0<pos1&&pos1<pos2);
});

test('raster layers are presentation-only and live text stays in DOM',()=>{
 for(const name of ['warning_frame.webp','actionbar_frame.webp','inventory_frame.webp']) assert.ok(css.includes(name));
 assert.match(css,/\.actionbar button\[hidden\]\{display:none!important\}/);
 assert.match(css,/#hud \.warning\.hidden/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/#hud \.survival-kit-action/);
});

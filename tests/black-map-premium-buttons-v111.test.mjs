import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const css=read('src/blackMapPremiumButtonsV111.css');
const html=read('index.html');
const files=[
 'button_primary.webp','button_secondary.webp','tab_active.webp',
 'tab_inactive.webp','button_close.webp'
];
test('five physically committed, valid compact WebP resources are present',()=>{
 let total=0;
 for(const file of files){
  const path=new URL('public/assets/exploration/ui-v111/'+file,base);
  const raw=readFileSync(path);
  assert.equal(raw.toString('ascii',0,4),'RIFF',file);
  assert.equal(raw.toString('ascii',8,12),'WEBP',file);
  assert.ok(raw.length>900&&raw.length<12000,file);
  total+=raw.length;
 }
 assert.ok(total<25000,'total button artwork should remain lean on mobile');
});
test('new real artwork skin loads after v101 without changing older CSS',()=>{
 const oldIndex=html.indexOf('blackMapResourceSkinV101.css');
 const newIndex=html.indexOf('blackMapPremiumButtonsV111.css');
 assert.ok(oldIndex>=0&&newIndex>oldIndex);
 for(const file of files)assert.match(css,new RegExp('ui-v111/'+file.replace('.','\\.') ));
 assert.match(css,/border-image-slice:17 21 17 21 fill!important/);
 assert.match(css,/border-image-repeat:stretch!important/);
});
test('each user action style has distinct dark and readable physical states',()=>{
 assert.match(css,/--blackmap-v111-primary/);
 assert.match(css,/--blackmap-v111-secondary/);
 assert.match(css,/--blackmap-v111-active/);
 assert.match(css,/--blackmap-v111-inactive/);
 assert.match(css,/aria-pressed="true"/);
 assert.match(css,/aria-pressed="false"/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(css,/:disabled/);
 assert.match(css,/:focus-visible/);
});
test('close has only one artwork and masks the legacy painted housing',()=>{
 assert.match(css,/\.exploration-map__heading::after/);
 assert.match(css,/z-index:1/);
 assert.match(css,/z-index:3!important/);
 assert.match(css,/border:0!important;border-image:none!important/);
 assert.match(css,/--blackmap-v111-close/);
 assert.match(css,/#exploration-map-close::before/);
});
test('button visuals are isolated from map geometry, state and nine-slot HUD',()=>{
 const rulesOnly=css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(rulesOnly,/[.#](?:exploration-map__marker|actionbar)|\blocalStorage\b|\bcamera\b/);
 assert.match(css,/\.exploration-map-v78/);
 assert.match(read('src/blackMapResourceSkinV101.css'),/v103 \| Site card/);
});

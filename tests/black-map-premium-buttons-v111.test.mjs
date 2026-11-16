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
test('title stops painting the legacy close housing and retains only the approved X asset',()=>{
 assert.match(css,/v112 design debug/);
 assert.match(css,/\.exploration-map__heading\{\s*position:relative!important;/);
 assert.match(css,/border-image:none!important/);
 assert.match(css,/\.exploration-map__heading::after\{\s*content:none!important;\s*display:none!important;/);
 assert.doesNotMatch(css,/width:clamp\(60px,17vw,78px\)/);
 assert.match(css,/z-index:3!important/);
 assert.match(css,/border:0!important;border-image:none!important/);
 assert.match(css,/--blackmap-v111-close/);
 assert.match(css,/#exploration-map-close::before/);
});
test('mobile UI keeps button states muted, legible, and physically tappable',()=>{
 assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)/);
 assert.match(css,/@media\(hover:none\) and \(pointer:coarse\)/);
 assert.match(css,/:hover:not\(:active\)/);
 assert.match(css,/#exploration-map-daily-shortcut\{\s*min-height:48px!important;\s*font-size:12px!important/);
 assert.match(css,/\.exploration-map__mission-controls\{\s*margin-top:10px!important/);
 assert.match(css,/\.exploration-map__areas\{\s*gap:8px!important/);
 assert.match(css,/width:44px!important;height:44px!important/);
});
test('button visuals are isolated from map geometry, state and nine-slot HUD',()=>{
 const rulesOnly=css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(rulesOnly,/[.#](?:exploration-map__marker|actionbar)|\blocalStorage\b|\bcamera\b/);
 assert.match(css,/\.exploration-map-v78/);
 assert.match(read('src/blackMapResourceSkinV101.css'),/v103 \| Site card/);
});

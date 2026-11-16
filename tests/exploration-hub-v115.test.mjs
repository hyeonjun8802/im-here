import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {explorationHubSummary,explorationHubPosition,installExplorationHubV115} from '../src/explorationHubV115.js';
import {EXPLORATION_SITES,newExplorationMap} from '../src/explorationMapV78.js';
import {completeHudGlyph} from '../src/hudActionGlyphsV1400.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const main=read('src/main.js');

test('new transparent spyglass is a real optimized WEBP resource, not an emoji placeholder',()=>{
 const raw=readFileSync(new URL('../public/assets/ui/exploration_spyglass_v115.webp',import.meta.url));
 assert.equal(raw.toString('ascii',0,4),'RIFF');
 assert.equal(raw.toString('ascii',8,12),'WEBP');
 assert.ok(raw.length>=1000&&raw.length<10000);
 assert.ok(completeHudGlyph('exploration-hub-toggle').startsWith('data:image/svg+xml'));
 const loader=read('src/commonUiAssetsV3.js');
 assert.match(loader,/exploration_spyglass_v115\.webp/);
 assert.match(loader,/'exploration-hub-toggle':'icon_spyglass'/);
});
test('telescope takes music slot and preserves all nine original metal cells',()=>{
 const bar=html.match(/<nav class="actionbar">([\s\S]*?)<\/nav>/)?.[1]||'';
 const ids=[...bar.matchAll(/<button[^>]+id="([^"]+)"[^>]*>/g)]
  .filter(m=>!m[0].includes(' hidden')).map(m=>m[1]);
 assert.deepEqual(ids,['drink','eat','repair','rest','medicine','explore',
  'exploration-hub-toggle','functions-toggle']);
 assert.match(html,/id="exploration-hub-toggle"[^>]*aria-controls="exploration-hub"/);
 assert.doesNotMatch(bar,/id="life-panel-toggle"/);
 const assets=read('src/commonUiAssetsV3.js');
 assert.match(assets,/actionbar\.insertBefore\(reserve,explorationButton\|\|null\)/);
 assert.match(assets,/installResponsiveActionSlots\(actionbar,reserve,repairTank\)/);
});
test('all map, supply and daily decisions are in the one exploration hub',()=>{
 const hub=html.match(/<aside id="exploration-hub"([\s\S]*?)<\/aside>/)?.[1]||'';
 const more=html.match(/<div class="survival-kit-controls">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.match(hub,/id="exploration-open"/);
 assert.match(hub,/id="expedition-toggle"/);
 assert.match(hub,/id="exploration-emergency"/);
 assert.doesNotMatch(more,/id="exploration-open"|id="expedition-toggle"/);
 assert.equal((html.match(/id="exploration-open"/g)||[]).length,1);
 assert.equal((html.match(/id="expedition-toggle"/g)||[]).length,1);
 assert.match(main,/createExplorationMapV78\(/);
 assert.match(main,/openPendingExpedition\(state\)/);
 assert.match(main,/runSurvivalAction\('explore'\)/);
});
test('More contains the real former music actions and links to existing camera and audio',()=>{
 const more=html.match(/<div class="survival-kit-controls">([\s\S]*?)<\/div>/)?.[1]||'';
 for(const id of ['more-life-open','more-camera-open','more-audio-open','weather-panel-toggle'])
  assert.ok(more.includes('id="'+id+'"'),id);
 for(const id of ['follow-survivor-camera','portrait-survivor-camera','camp-music-toggle',
  'life-camera-toggle','close-life','life-panel'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(main,/showLifeFromMore\(section\)/);
 assert.match(main,/\$\('#more-life-open'\)\.addEventListener/);
 assert.match(main,/\$\('#more-camera-open'\)\.addEventListener/);
 assert.match(main,/\$\('#more-audio-open'\)\.addEventListener/);
 assert.match(html,/data-admin-target="more-life-open"/);
});
test('menu progress is derived only from actual existing persisted sites',()=>{
 const s={explorationMap:newExplorationMap()};
 assert.equal(explorationHubSummary(s),'근거리 0/6 · 원거리 0/6');
 const near=EXPLORATION_SITES.find(x=>x.zone==='near');
 s.explorationMap.sites[near.id].completed=true;
 assert.equal(explorationHubSummary(s),'근거리 1/6 · 원거리 0/6');
 s.explorationMap.mission={siteId:near.id};
 assert.match(explorationHubSummary(s),/탐사 진행 중/);
 assert.equal(explorationHubSummary({}),'근거리 0/6 · 원거리 0/6');
});
test('popover placement stays above the eighth action well and within mobile viewport',()=>{
 const r=explorationHubPosition({top:720,right:330},{
  width:334,viewportWidth:390,viewportHeight:844,hudBottom:115
 });
 assert.deepEqual(r,{left:44,bottom:134,width:334,maxHeight:585});
 const narrow=explorationHubPosition({top:600,right:296},{
  width:334,viewportWidth:320,viewportHeight:700,hudBottom:130
 });
 assert.ok(narrow.left>=12&&narrow.left+narrow.width<=308);
 assert.ok(narrow.bottom>100&&narrow.maxHeight>200);
});
test('real controls open and close, delegate existing buttons, and do not touch resources',()=>{
 function node(id,other={}){
  const events={},attrs={};
  return {id,hidden:false,dataset:{},style:{},textContent:'',disabled:false,title:'',
   events,attrs,addEventListener(k,fn){events[k]=fn;},
   setAttribute(k,v){attrs[k]=v;},getAttribute:k=>attrs[k],
   contains(x){return x===this;},getBoundingClientRect(){return {top:700,right:340,bottom:744,width:44,height:44}},
   focus(){},click(){events.click?.({target:this});},...other};
 }
 const els=Object.fromEntries(['exploration-hub-toggle','exploration-hub','exploration-hub-close',
  'exploration-emergency','exploration-hub-progress','expedition-toggle','explore',
  'disaster-forecast'].map(k=>[k,node(k)]));
 els['exploration-hub'].hidden=true;
 els.explore.dataset.supplyReady='true';
 els.explore.title='지금 보급 가능';
 const s={explorationMap:newExplorationMap(),supply:{food:3},scavenge:{pending:null}};
 const root={events:{},getElementById:k=>els[k],addEventListener(k,fn){this.events[k]=fn;}};
 const win={innerWidth:390,innerHeight:844,events:{},addEventListener(k,fn){this.events[k]=fn;}};
 let opened=0,supplyAction=0;
 const hub=installExplorationHubV115({root,win,getState:()=>s,
  onOpen:()=>opened++,onEmergency:()=>supplyAction++});
 els['exploration-hub-toggle'].click();
 assert.equal(opened,1);assert.equal(hub.isOpen(),true);
 assert.equal(els['exploration-hub-toggle'].attrs['aria-expanded'],'true');
 assert.match(els['exploration-hub-progress'].textContent,/근거리 0\/6/);
 els['exploration-emergency'].click();
 assert.equal(supplyAction,1);
 root.events.keydown({key:'Escape'});
 assert.equal(hub.isOpen(),false);
 els['exploration-hub-toggle'].click();
 root.events.pointerdown({target:{notPartOfMenu:true}});
 assert.equal(hub.isOpen(),false);
 assert.equal(s.supply.food,3);
});
test('hub CSS is isolated, readable, no backdrop blur, and honors hidden, buttons and safe areas',()=>{
 const css=read('src/explorationHubV115.css');
 assert.match(css,/\.exploration-hub\[hidden\]/);
 assert.match(css,/display:none!important/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/pointer-events:auto!important/);
 assert.match(css,/-webkit-backdrop-filter:none!important/);
 assert.match(css,/#exploration-hub-toggle/);
 assert.doesNotMatch(css,/\.actionbar\{|\.disaster-forecast\{|save\(|localStorage|camera\.position/);
 assert.match(html,/explorationHubV115\.css/);
 assert.match(main,/installExplorationHubV115\(/);
});

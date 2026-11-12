import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installPremiumHudV1000,premiumForecastX} from '../src/premiumHudV1000.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/hudAlignmentV1300.css');
const source=read('src/commonUiAssetsV3.js');

class Element {
 constructor(tag='div'){
  this.tag=tag;this.className='';this.children=[];this.dataset={};this.attributes={};
  const classes=new Set();
  this.classList={
   add:name=>classes.add(name),
   remove:name=>classes.delete(name),
   contains:name=>classes.has(name),
   toggle:(name,enabled)=>{if(enabled)classes.add(name);else classes.delete(name);return !!enabled;}
  };
  const props=new Map();
  this.style={setProperty:(name,value)=>props.set(name,value),getPropertyValue:name=>props.get(name)||''};
 }
 appendChild(el){this.children.push(el);return el;}
 setAttribute(name,value){this.attributes[name]=value;}
 removeAttribute(name){delete this.attributes[name];if(name==='src')delete this.src;}
}
test('desktop forecast keeps one real upcoming glyph parked beyond 24h then moves it left',()=>{
 const original=globalThis.document;
 globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const root=new Element();
  const forecast=installPremiumHudV1000(root);
  const timeline=root.children.find(x=>x.className==='premium-hud__forecast');
  const glyph=timeline.children.find(x=>x.className==='premium-hud__future-icon');
  const status=timeline.children.find(x=>x.className==='premium-hud__forecast-status');
  const now=1800000000000;
  const s={weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+60*3600000};
  forecast.sync(s,now);
  assert.ok(timeline.classList.contains('has-scheduled'));
  assert.ok(!timeline.classList.contains('has-future'));
  assert.equal(timeline.style.getPropertyValue('--premium-event-x'),premiumForecastX(24).toFixed(4)+'%');
  assert.match(glyph.src,/rain_forecast_icon\.png$/);
  assert.match(status.textContent,/24h 이후/);
  forecast.sync(s,now+42*3600000);
  assert.ok(timeline.classList.contains('has-future'));
  assert.ok(Number.parseFloat(timeline.style.getPropertyValue('--premium-event-x'))<Number(premiumForecastX(24)));
  assert.match(status.textContent,/18h 후/);
  forecast.syncProgress(s,now+43*3600000);
  assert.ok(Number.parseFloat(timeline.style.getPropertyValue('--premium-event-x'))<Number(premiumForecastX(18)));
  forecast.sync({...s,majorDisasterAt:now-1},now);
  assert.ok(!timeline.classList.contains('has-scheduled'));
  assert.ok(!timeline.classList.contains('has-future'));
  assert.equal(glyph.src,undefined);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test('PC cursor visibility is scoped to desktop, does not display an unscheduled weather icon',()=>{
 const section=css.slice(css.indexOf('/* AFTERDAY v22 |'));
 assert.ok(section.startsWith('/* AFTERDAY v22'));
 assert.match(section,/@media \(min-width:1024px\) and \(hover:hover\) and \(pointer:fine\)/);
 assert.match(section,/\.premium-hud__forecast\.has-future \.premium-hud__future-icon\s*\{\s*opacity:1!important/);
 assert.match(section,/\.premium-hud__forecast\.has-scheduled:not\(\.has-future\) \.premium-hud__future-icon\s*\{\s*opacity:\.82!important/);
 assert.match(read('src/premiumHudV1000.js'),/timeline\.classList\.toggle\('has-scheduled',scheduled\)/);
});

test('mobile popup and emergency overflow use the SAME absolute icon center',()=>{
 const section=css.slice(css.indexOf('/* AFTERDAY v22 |'));
 assert.match(section,/@media\(max-width:720px\)/);
 assert.match(section,/\.actionbar\.v3-has-extra-actions\s*\{\s*height:calc\(\(100vw - 8px\) \* 172 \/ 1148\)!important/);
 assert.match(section,/\.actionbar:is\(\.v3-has-extra-actions,:not\(\.v3-has-extra-actions\)\) > button > img\.afterday-v3-action-icon/);
 assert.match(section,/position:absolute!important;\s*left:50%!important;\s*top:calc\(50% \+ 4px\)!important;\s*transform:translate\(-50%,-50%\)!important/);
 assert.match(section,/\.actionbar\.v3-has-extra-actions > button\s*\{\s*font-size:0!important;\s*line-height:0!important/);
 assert.match(section,/button:not\(\[data-v3-sprite\]\) > span/);
 assert.match(source,/new MutationObserver\(syncSlots\)/);
 assert.match(source,/visible>9/);
});

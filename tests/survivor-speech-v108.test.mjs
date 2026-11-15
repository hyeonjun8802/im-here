import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {defaults} from '../src/simulation.js';
import {speechLinesFor,SPEECH_VARIANTS} from '../src/survivorSpeechLinesV108.js';
import {
 speechCandidates,speechSituationSignature,SurvivorSpeechDirectorV108,
 SPEECH_BASE_INTERVAL_MS,SPEECH_EVENT_MIN_GAP_MS
} from '../src/survivorSpeechDirectorV108.js';
import {
 chooseSpeechBubblePlacement,SurvivorSpeechBubbleV108
} from '../src/survivorSpeechBubbleV108.js';

const start=Date.UTC(2026,10,16,1);
const fresh=()=>{
 const s=defaults(start);
 s.supply.food=5;s.supply.water=6;s.supply.parts=4;
 s.facilities.tank=80;s.facilities.shelter=80;s.facilities.storage=80;
 s.health=90;s.food=75;s.water=75;s.sickness=0;
 return s;
};
const keys=(state,life={current:'idle',stage:'idle'},now=start)=>
 speechCandidates(state,life,now).map(c=>c.key);
const speech=(s,key)=>keys(s).includes(key);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('authored Korean lines cover weather, inventory, disaster, mood and actual actions',()=>{
 assert.ok(Object.keys(SPEECH_VARIANTS).length>=65);
 assert.ok(Object.values(SPEECH_VARIANTS).reduce((n,list)=>n+list.length,0)>=130);
 for(const [key,values] of Object.entries(SPEECH_VARIANTS)){
  assert.ok(values.length>=2,key);
  for(const line of values){assert.ok(line.length>=8&&line.length<=90,key);assert.equal(typeof line,'string');}
  assert.deepEqual(speechLinesFor(key),values);
 }
 assert.deepEqual(speechLinesFor('nonexistent'),[]);
});

test('rain and no purifier does not falsely promise clean collected water',()=>{
 const s=fresh();s.weather='rain';s.kit.purifier=false;
 assert.ok(speech(s,'rainNoPurifier'));
 assert.ok(!speech(s,'rainPurifier'));
 assert.ok(!speech(s,'rainBrokenTank'));
});

test('rain with working purifier reacts to actual water tank threshold',()=>{
 const s=fresh();s.weather='rain';s.kit.purifier=true;
 s.facilities.tank=80;
 assert.ok(speech(s,'rainPurifier'));
 s.facilities.tank=39;
 assert.ok(speech(s,'rainBrokenTank'));
 assert.ok(!speech(s,'rainPurifier'));
 s.facilities.tank=40;
 assert.ok(speech(s,'rainPurifier'));
});

test('water inventory full changes rain dialogue only for functional filter',()=>{
 const s=fresh();s.weather='rain';s.kit.purifier=true;s.supply.water=16;
 assert.ok(speech(s,'rainWaterFull'));
 s.kit.purifier=false;
 assert.ok(!speech(s,'rainWaterFull'));
 assert.ok(speech(s,'rainNoPurifier'));
});

test('tent ownership changes thunderstorm message',()=>{
 const s=fresh();s.weather='storm';s.kit.tent=false;
 assert.ok(speech(s,'stormNoTent'));
 s.kit.tent=true;
 assert.ok(speech(s,'stormTent'));
 assert.ok(!speech(s,'stormNoTent'));
});

test('tornado direct, near and distant give different urgent thoughts',()=>{
 const s=fresh();s.weather='tornado';s.tornadoEncounterActive=true;
 s.tornadoApproach='direct';s.kit.tent=false;
 assert.equal(keys(s)[0],'tornadoDirectNoTent');
 s.kit.tent=true;assert.equal(keys(s)[0],'tornadoDirectTent');
 s.tornadoApproach='near';assert.ok(speech(s,'tornadoNear'));
 s.tornadoApproach='distant';assert.ok(speech(s,'tornadoDistant'));
 s.tornadoEncounterActive=false;
 assert.ok(!speech(s,'tornadoDirectTent'));
 assert.ok(speech(s,'tornadoDistant'),'tornado weather still triggers a weather-specific response');
});

test('all extreme-weather branches depend on actual game weather',()=>{
 const s=fresh();s.weather='heat';s.supply.water=1;
 assert.ok(speech(s,'heatLowWater'));
 s.supply.water=8;assert.ok(speech(s,'heatWaterReady'));
 s.weather='cold';s.kit.tent=false;assert.ok(speech(s,'coldNoTent'));
 s.kit.tent=true;assert.ok(speech(s,'coldTent'));
 s.weather='dust';assert.ok(speech(s,'dustTent'));
 s.kit.tent=false;assert.ok(speech(s,'dustNoTent'));
 s.weather='wildfire';s.supply.water=1;assert.ok(speech(s,'wildfireLowWater'));
 s.supply.water=8;assert.ok(speech(s,'wildfireGeneral'));
 s.weather='clear';s.kit.seeds=false;assert.ok(speech(s,'clearWithoutSeeds'));
 s.kit.seeds=true;assert.ok(speech(s,'clearWithSeeds'));
 s.weather='cloud';assert.ok(speech(s,'cloudy'));
});

test('consumable stock and biological satiety/hydration are different fields',()=>{
 const s=fresh();s.supply.food=0;s.kit.seeds=false;
 assert.ok(speech(s,'noFoodNoSeeds'));
 s.kit.seeds=true;assert.ok(speech(s,'noFoodWithSeeds'));
 s.supply.food=7;s.food=17;
 assert.ok(speech(s,'hungry'));
 assert.ok(!speech(s,'noFoodWithSeeds'));
 s.food=90;s.water=15;
 assert.ok(speech(s,'thirsty'));
 s.supply.water=0;
 assert.ok(speech(s,'noWaterStock'));
});

test('facilities, medical stocks, companion status and radio responses use live saved fields',()=>{
 const s=fresh();s.facilities.shelter=20;
 assert.ok(speech(s,'weakShelter'));
 s.facilities.tank=32;assert.ok(speech(s,'weakTank'));
 s.facilities.storage=32;assert.ok(speech(s,'weakStorage'));
 s.health=50;s.supply.medicine=1;assert.ok(speech(s,'medication'));
 s.companion.pending={id:'pending'};assert.ok(speech(s,'companionPending'));
 s.companion.pending=null;s.companion.present=true;assert.ok(speech(s,'companionPresent'));
 s.companion.present=false;s.companion.lost=true;assert.ok(speech(s,'companionLost'));
 s.kit.radio=true;s.scavenge.radioNewsType='silence';s.scavenge.radioNewsDay=2;
 assert.ok(speech(s,'radioSilent'));assert.ok(!speech(s,'radioMissing'));
 s.kit.radio=false;assert.ok(speech(s,'radioMissing'));assert.ok(!speech(s,'radioSilent'));
});

test('actual work stage enables action monologue, not travel or unowned radios',()=>{
 const s=fresh(),life={current:'repair',stage:'perform'};
 assert.ok(keys(s,life).includes('actionsRepair'));
 life.stage='approach';assert.ok(!keys(s,life).includes('actionsRepair'));
 life.current='radio';life.stage='perform';
 assert.ok(!keys(s,life).includes('actionsRadio'));
 s.kit.radio=true;assert.ok(keys(s,life).includes('actionsRadio'));
 life.current='eat';s.supply.food=0;assert.ok(!keys(s,life).includes('actionsEat'));
 s.supply.food=4;assert.ok(keys(s,life).includes('actionsEat'));
});

test('no thought while sleeping or dead, so silent life stages stay silent',()=>{
 const s=fresh();
 assert.deepEqual(keys(s,{current:'sleep',stage:'perform'}),[]);
 assert.deepEqual(keys(s,{current:'sleep',stage:'enter'}),[]);
 assert.deepEqual(keys(s,{current:'sleep',stage:'exit'}),[]);
 s.survivalStatus='dead';assert.deepEqual(keys(s),[]);
});

test('disaster forecast is considered only within actual game-time 2h horizon',()=>{
 const s=fresh();s.majorDisasterAt=start+3600000;
 assert.ok(speech(s,'forecastNear'));
 s.majorDisasterAt=start+3*3600000;
 assert.ok(!speech(s,'forecastNear'));
});

test('selecting contextual speech does not mutate resource state, RNG, travel or world clock',()=>{
 const s=fresh();s.weather='rain';s.kit.purifier=true;s.facilities.tank=19;
 const before=JSON.stringify(s);
 for(let i=0;i<10;i++){
  speechCandidates(s,{current:'repair',stage:'perform'},start+i*1000);
  speechSituationSignature(s);
 }
 assert.equal(JSON.stringify(s),before);
});

test('weather, ownership and danger changes alter the situation fingerprint',()=>{
 const s=fresh(),prev=speechSituationSignature(s);
 s.weather='rain';assert.notEqual(speechSituationSignature(s),prev);
 const rain=speechSituationSignature(s);s.kit.purifier=true;
 assert.notEqual(speechSituationSignature(s),rain);
});

test('director enforces initial delay, non-spam real-time cooldown and event gap',()=>{
 const s=fresh(),d=new SurvivorSpeechDirectorV108();
 assert.equal(d.tick({state:s,gameNow:start,realNow:1000}),null);
 assert.equal(d.tick({state:s,gameNow:start,realNow:4400}),null);
 const one=d.tick({state:s,gameNow:start,realNow:9600});
 assert.ok(one?.text);
 assert.equal(d.tick({state:s,gameNow:start+1000,realNow:9610}),null);
 assert.ok(d.nextAt>=9600+SPEECH_BASE_INTERVAL_MS||d.nextAt>=9600+18000);
 s.weather='tornado';s.tornadoEncounterActive=true;s.tornadoApproach='direct';
 assert.equal(d.tick({state:s,gameNow:start,realNow:11000}),null);
 // Critical change can be spoken after the real-time minimum gap.
 assert.ok(d.tick({state:s,gameNow:start,realNow:9600+SPEECH_EVENT_MIN_GAP_MS+500})?.text);
});

test('first automatic thought becomes eligible after the shortened visible warmup',()=>{
 const s=fresh(),d=new SurvivorSpeechDirectorV108();
 assert.equal(d.tick({state:s,gameNow:start,realNow:1000}),null);
 assert.equal(d.tick({state:s,gameNow:start,realNow:4400}),null);
 assert.ok(d.tick({state:s,gameNow:start,realNow:4600})?.text);
});

test('director is session-memory safe, never writes canonical game save',()=>{
 const saved=new Map();
 const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const s=fresh();
 const d=new SurvivorSpeechDirectorV108({storage});
 d.tick({state:s,gameNow:start,realNow:1000});
 assert.ok(d.tick({state:s,gameNow:start,realNow:11000})?.text);
 assert.deepEqual([...saved.keys()],['AFTERDAY_SPEECH_RECENT_V108']);
 const second=new SurvivorSpeechDirectorV108({storage});
 assert.ok(second.recentTopics.length>0);
});

test('placement keeps actual 3D character bubble within mobile safe canvas area',()=>{
 const place=chooseSpeechBubblePlacement({
  anchorX:160,anchorY:350,width:130,height:45,
  viewWidth:390,viewHeight:800,top:110,bottom:690
 });
 assert.ok(place);
 assert.ok(place.x>=10&&place.x+130<=380);
 assert.ok(place.y>=110&&place.y+45<=690);
});

test('placement avoids overlapping HUD and actionbar; hides rather than screen-centers',()=>{
 const base={anchorX:150,anchorY:350,width:130,height:50,
  viewWidth:390,viewHeight:800,top:110,bottom:690};
 const right=chooseSpeechBubblePlacement(base);
 assert.ok(right);
 const moved=chooseSpeechBubblePlacement({...base,obstacles:[{x:right.x,y:right.y,w:131,h:52}]});
 assert.ok(moved);
 assert.notDeepEqual([right.x,right.y],[moved.x,moved.y]);
 assert.equal(chooseSpeechBubblePlacement({...base,obstacles:[{x:0,y:100,w:390,h:600}]}),null);
 assert.equal(chooseSpeechBubblePlacement({...base,anchorY:50}),null);
 assert.equal(chooseSpeechBubblePlacement({...base,anchorX:-100}),null);
 assert.equal(chooseSpeechBubblePlacement({...base,top:510,bottom:530}),null);
});

test('speech bubble tracks real animated GLB head, moves with it, and hides behind camera',()=>{
 const classList=()=>({add(){},remove(){}});
 const host={appendChild(n){this.node=n;}};
 const element={id:'',className:'',dataset:{},style:{},hidden:true,textContent:'',
  offsetWidth:110,offsetHeight:42,classList:classList(),
  setAttribute(){},remove(){}};
 const rect=(x,y,w,h)=>({left:x,top:y,width:w,height:h});
 const nodes={
  '#disaster-forecast':{hidden:false,getBoundingClientRect:()=>rect(0,0,390,105)},
  '.actionbar':{hidden:false,getBoundingClientRect:()=>rect(0,695,390,105)}
 };
 const doc={body:host,defaultView:{innerWidth:390,innerHeight:800},
  createElement:()=>element,querySelector:k=>nodes[k]||null};
 const camera=new THREE.PerspectiveCamera(48,390/800,.1,200);
 camera.position.set(0,6,16);camera.lookAt(0,2,0);camera.updateMatrixWorld();
 const head=new THREE.Object3D();head.position.set(0,2,0);
 const world={beardedSurvivor:{status:'ready',nodes:{Head:head}},camera,
  canvas:{getBoundingClientRect:()=>rect(0,0,390,800)}};
 const bubble=new SurvivorSpeechBubbleV108({doc});
 assert.equal(bubble.show({text:'물탱크를 확인해야겠네.',group:'equipment'},100),true);
 assert.equal(bubble.update(world,150,false),true);
 const before=element.style.transform;
 head.position.x=-2.5;
 assert.equal(bubble.update(world,200,false),true);
 assert.notEqual(element.style.transform,before);
 head.position.z=30; // behind camera
 assert.equal(bubble.update(world,250,false),false);
 assert.equal(element.hidden,true);
 bubble.dispose();
});

test('speech bubble hides during modal overlay and never blocks touch controls',()=>{
 const module=read('src/survivorSpeechBubbleV108.js');
 const css=read('src/survivorSpeechBubbleV108.css');
 const main=read('src/main.js');
 const html=read('index.html');
 assert.match(module,/bearded\?\.nodes\?\.Head/);
 assert.match(module,/getWorldPosition\(this\.headPosition\)/);
 assert.match(module,/\.project\(camera\)/);
 assert.match(module,/this\.node\.textContent=text/);
 assert.match(main,/survivorSpeechUiBlocked\(\)/);
 assert.match(main,/survivorSpeechBubble\.update\(world,real,blocked/);
 assert.match(main,/survivorSpeech\.tick\(/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/-webkit-backdrop-filter:none!important/);
 assert.match(html,/survivorSpeechBubbleV108\.css/);
 assert.match(html,/id="survivor-speech-toggle"/);
 assert.doesNotMatch(module,/<img|srcset|new THREE\.Sprite|setCameraView|\.supply\.\w+\s*=/);
});

test('speech memory storage access is guarded for restricted/private browsing',()=>{
 const main=read('src/main.js');
 assert.match(main,/try\{speechHistoryStorage=window\.sessionStorage;\}catch\{\}/);
});

test('the character can speak while the CSS-hidden daily chapter or story ticker exists',()=>{
 const main=read('src/main.js');
 const fn=main.slice(main.indexOf('function survivorSpeechUiBlocked(){'),
  main.indexOf('const CHAPTER_CAPTION_MS',main.indexOf('function survivorSpeechUiBlocked(){')));
 assert.ok(!fn.includes("$('#survival-chapter')"));
 assert.ok(!fn.includes("$('#log')"));
 assert.match(fn,/eventBoard\.element\.classList\.contains\('is-choice'\)/);
});

test('one-tap live preview closes settings, selects authentic contextual text and focuses the character',()=>{
 const main=read('src/main.js');
 const html=read('index.html');
 assert.match(html,/id="survivor-speech-preview"/);
 assert.match(main,/speechCandidates\(state,world\.life,gameClock\.virtualNow\)/);
 assert.match(main,/speechLinesFor\(candidate\.key\)\[0\]/);
 assert.match(main,/\$\('#close-weather'\)\.click\(\)/);
 assert.match(main,/world\.setCameraView\('survivor'\)/);
 assert.match(main,/survivorSpeechBubble\.show\(/);
 assert.match(main,/survivorSpeechDiagnostics/);
});

test('mobile placement can recover when the character head is under HUD safe top',()=>{
 const point=chooseSpeechBubblePlacement({
  anchorX:185,anchorY:96,width:115,height:45,
  viewWidth:390,viewHeight:800,top:110,bottom:680
 });
 assert.ok(point);
 assert.ok(point.y>=110);
});

test('fallback anchors at actual world survivor when animated GLB is delayed',()=>{
 const bubble=read('src/survivorSpeechBubbleV108.js');
 assert.match(bubble,/world\.survivor\.getWorldPosition\(this\.headPosition\)/);
 assert.match(bubble,/lastHideReason/);
 assert.match(bubble,/no-safe-space/);
 assert.match(bubble,/Math\.max\(top\+4,anchorY-height\/2\)/);
});

test('world-space speech prefers centered head alignment with arrow matching its X',()=>{
 const w=134,h=46,ax=181,ay=351;
 const pos=chooseSpeechBubblePlacement({
  anchorX:ax,anchorY:ay,width:w,height:h,
  viewWidth:390,viewHeight:800,top:110,bottom:688
 });
 assert.equal(pos.side,'above');
 assert.ok(Math.abs((pos.x+w/2)-ax)<0.001);
 assert.ok(Math.abs((pos.y+h+7)-ay)<0.001);
 const css=read('src/survivorSpeechBubbleV108.css');
 assert.match(css,/var\(--speech-tail-x,50%\)/);
 assert.match(css,/translateX\(-50%\) rotate\(45deg\)/);
 assert.doesNotMatch(css,/left:auto;right:14px/);
});

test('bubble updates at native render-frame cadence and not at a 80ms interval',()=>{
 const main=read('src/main.js');
 const block=main.slice(main.indexOf('// Follow the animated GLB Head'),main.indexOf('requestAnimationFrame(draw);',main.indexOf('// Follow the animated GLB Head')));
 assert.match(block,/survivorSpeechBubble\.update\(world,real,blocked\|\|!survivorSpeechEnabled\)/);
 assert.doesNotMatch(main,/lastSpeechPosition|t-lastSpeechPosition>=80/);
 assert.match(main,/world\.update\(/);
});

test('subpixel speech placement retains fractional coordinates instead of stepping pixels',()=>{
 const p=chooseSpeechBubblePlacement({
  anchorX:187.29,anchorY:368.78,width:131,height:44,
  viewWidth:390,viewHeight:800,top:110,bottom:688
 });
 assert.equal(p.side,'above');
 assert.ok(Math.abs(p.x-Math.round(p.x))>0.01);
 assert.ok(Math.abs(p.y-Math.round(p.y))>0.01);
});

test('speech side does not flip while its previous nearby position remains unobstructed',()=>{
 const args={anchorX:180,anchorY:340,width:120,height:44,
  viewWidth:390,viewHeight:800,top:110,bottom:680};
 const first=chooseSpeechBubblePlacement(args);
 const kept=chooseSpeechBubblePlacement({...args,anchorX:183,preferredSide:first.side});
 assert.equal(kept.side,first.side);
 const alternate=chooseSpeechBubblePlacement({...args,obstacles:[{x:105,y:285,w:150,h:55}],preferredSide:first.side});
 assert.ok(alternate);
 assert.notEqual(alternate.side,first.side);
});

test('RAF motion is smoothed, CSS arrow tracks GLB head and HUD layout cached across frames',()=>{
 const classList=()=>({add(){},remove(){}});
 const transforms={};
 const element={dataset:{},style:{
  setProperty(k,v){transforms[k]=v;}
 },hidden:true,textContent:'',offsetWidth:122,offsetHeight:46,
  classList:classList(),setAttribute(){},remove(){}};
 const rect=(x,y,w,h)=>({left:x,top:y,width:w,height:h});
 let layouts=0;
 const forecast={hidden:false,getBoundingClientRect(){layouts++;return rect(0,0,390,105)}};
 const actionbar={hidden:false,getBoundingClientRect(){layouts++;return rect(0,692,390,108)}};
 const nodes={'#disaster-forecast':forecast,'.actionbar':actionbar};
 const doc={body:{appendChild(){}},defaultView:{innerWidth:390,innerHeight:800},
  createElement:()=>element,querySelector:k=>nodes[k]||null};
 const cam=new THREE.PerspectiveCamera(48,390/800,.1,200);
 cam.position.set(0,6,16);cam.lookAt(0,2,0);cam.updateMatrixWorld();
 const head=new THREE.Object3D();head.position.set(0,2,0);
 const world={beardedSurvivor:{status:'ready',nodes:{Head:head}},camera:cam,
  canvas:{getBoundingClientRect:()=>rect(0,0,390,800)}};
 const bubble=new SurvivorSpeechBubbleV108({doc});
 bubble.show({text:'도시가 너무 조용하네.'},100);
 assert.ok(bubble.update(world,150));
 const first=bubble.followX;const layoutBefore=layouts;
 head.position.x=2;
 assert.ok(bubble.update(world,166));
 assert.notEqual(bubble.followX,first);
 assert.ok(bubble.followX>first);
 assert.equal(layouts,layoutBefore,'no HUD reflow on intermediate RAF');
 assert.ok(transforms['--speech-tail-x']);
 assert.ok(element.style.transform.includes('translate3d('));
 assert.ok(/px,/.test(element.style.transform));
 assert.ok(bubble.update(world,350));
 assert.ok(layouts>layoutBefore,'HUD bounding boxes refresh on slow cadence');
});

test('bubble recovers from a temporary no-space hide without zero-width lock',()=>{
 const mockStyle={setProperty(){}},mockEl={dataset:{},style:mockStyle,hidden:true,textContent:'',
  offsetWidth:120,offsetHeight:42,
  classList:{add(){},remove(){}},setAttribute(){},remove(){}};
 const doc={body:{appendChild(){}},defaultView:{innerWidth:390,innerHeight:800},
  createElement:()=>mockEl,querySelector:()=>null};
 const cam=new THREE.PerspectiveCamera(48,390/800,.1,200);
 cam.position.set(0,6,16);cam.lookAt(0,2,0);cam.updateMatrixWorld();
 const head=new THREE.Object3D();head.position.set(0,2,0);
 const canvas={getBoundingClientRect:()=>({left:0,top:0,width:390,height:800})};
 const world={beardedSurvivor:{status:'ready',nodes:{Head:head}},camera:cam,canvas};
 const bubble=new SurvivorSpeechBubbleV108({doc});
 bubble.show({text:'물탱크를 살펴보자.'},100);
 bubble.cachedLayout={viewWidth:390,viewHeight:800,width:120,height:42,top:110,bottom:680,
  obstacles:[{x:0,y:110,w:390,h:570}]};
 bubble.layoutExpiresAt=400;
 assert.equal(bubble.update(world,150),false);
 assert.equal(mockEl.hidden,true);
 bubble.layoutExpiresAt=0;
 assert.equal(bubble.update(world,500),true);
 assert.equal(mockEl.hidden,false);
 assert.equal(bubble.lastHideReason,null);
});

test('new speech remains separate from canonical HUD, chapter title and game-save schema',()=>{
 const world=read('src/world.js'),sim=read('src/simulation.js'),main=read('src/main.js');
 assert.match(main,/survivorSpeech\.tick/);
 assert.match(main,/survivorSpeechBubble=new SurvivorSpeechBubbleV108/);
 assert.match(main,/world\.update\(/);
 assert.doesNotMatch(sim,/SurvivorSpeechDirectorV108|SpeechBubbleV108/);
 assert.doesNotMatch(world,/SpeechBubbleV108/);
});

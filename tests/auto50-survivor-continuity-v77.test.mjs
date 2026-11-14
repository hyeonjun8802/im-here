import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {shouldAutoAnimateSurvivor,AUTO_ACTION_INTERVAL_MS} from '../src/autoSurvivalV73.js';
import {GAME_SPEEDS} from '../src/gameClock.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function actionHarness(stage='approach'){
 const main=read('src/main.js');
 const start=main.indexOf('function runSurvivalAction(action,isAuto=false){');
 const stop=main.indexOf('/** Reuse regular action validation',start);
 assert.ok(start>0&&stop>start,'must exercise the real gameplay action function');
 const calls={visual:[],cameras:[],saves:0,events:[],balances:0};
 const world={
  life:{stage},
  setAction(action){calls.visual.push(action);return true},
  setCameraView(view){calls.cameras.push(view)},
  syncSurvivalInventory(){},
  playCinematic(){return true}
 };
 const state={supply:{food:4,water:3},events:[],survivalStatus:'alive'};
 const context={
  state,world,eventBoard:null,autoLifeCamera:true,
  gameClock:{virtualNow:123456},
  shouldAutoAnimateSurvivor,
  applyAction(s,action){
   calls.balances++;
   if(action==='eat')s.supply.food--;
   if(action==='drink')s.supply.water--;
   return {good:true,msg:'manual survival action applied'};
  },
  save(){calls.saves++},
  toast(message){calls.events.push(message)}
 };
 vm.createContext(context);
 vm.runInContext(main.slice(start,stop)+'\nthis.perform=runSurvivalAction;',context);
 return {calls,world,state,perform:context.perform};
}

test('50× AUTO actions cannot repeatedly reset approach/enter/perform/exit animations',()=>{
 assert.ok(GAME_SPEEDS.includes(50));
 assert.equal(AUTO_ACTION_INTERVAL_MS,1250);
 for(const stage of ['approach','enter','perform','exit']){
  const h=actionHarness(stage);
  for(let i=0;i<8;i++)h.perform('drink',true);
  assert.equal(h.calls.balances,8,'real resource action still applies with existing rules');
  assert.equal(h.calls.saves,8);
  assert.equal(h.calls.visual.length,0,stage+' stage should not get overwritten');
  assert.equal(h.calls.cameras.length,0,'autoplay never locks survivor-follow camera');
 }
});

test('idle/done character can still start the next visual auto activity and move again',()=>{
 for(const stage of ['idle','done']){
  const h=actionHarness(stage);
  h.perform('drink',true);
  assert.deepEqual(h.calls.visual,['drink']);
  assert.deepEqual(h.calls.cameras,[]);
 }
 assert.equal(shouldAutoAnimateSurvivor(null,'eat'),true);
});

test('manual food interaction retains the established movement and optional close-up',()=>{
 const h=actionHarness('approach');
 h.perform('eat',false);
 assert.deepEqual(h.calls.visual,['eat']);
 assert.deepEqual(h.calls.cameras,['survivor']);
 assert.equal(h.state.supply.food,3);
 assert.equal(h.calls.saves,1);
});

test('AUTO food does not silently force permanent survivor-follow camera',()=>{
 const h=actionHarness('done');
 h.perform('eat',true);
 assert.deepEqual(h.calls.visual,['eat']);
 assert.deepEqual(h.calls.cameras,[]);
 assert.equal(h.world.life.stage,'done');
 const main=read('src/main.js');
 assert.match(main,/if\(action==='eat'&&autoLifeCamera&&!isAuto\)world\?\.setCameraView\('survivor'\)/);
 assert.match(main,/runSurvivalAction\(action,true\)/);
});

test('immediate safety cover can interrupt any action but not normal routine repairs',()=>{
 for(const stage of ['approach','enter','perform','exit']){
  assert.equal(shouldAutoAnimateSurvivor({stage},'take_cover'),true);
  assert.equal(shouldAutoAnimateSurvivor({stage},'secure_supplies'),false);
  assert.equal(shouldAutoAnimateSurvivor({stage},'repair'),false);
  assert.equal(shouldAutoAnimateSurvivor({stage},'eat'),false);
  const h=actionHarness(stage);
  h.perform('take_cover',true);
  assert.deepEqual(h.calls.visual,['shelter']);
  assert.equal(h.calls.saves,1);
 }
});

function lifeEventHarness(stage='perform',manual=false){
 const lifeSrc=read('src/survivorLife.js');
 const start=lifeSrc.indexOf(' listenEvents(game){');
 const end=lifeSrc.indexOf(' animate(dt,phase){',start);
 assert.ok(start>0&&end>start);
 const obj=vm.runInNewContext('({'+lifeSrc.slice(start,end)+'})');
 const attempts=[];
 const life={
  ...obj,manual,stage,current:'repair',lastEvent:'old',
  request(action,manualFlag){attempts.push({action,manualFlag});this.current=action;return true;}
 };
 return {life,attempts};
}

test('passive survival log cannot overwrite walking, seating, sleeping, working or waking',()=>{
 for(const stage of ['approach','enter','perform','exit']){
  const {life,attempts}=lifeEventHarness(stage);
  life.listenEvents({events:['수분을 마셨다']});
  life.listenEvents({events:['식사했다']});
  assert.equal(attempts.length,0,stage+' should remain uninterrupted');
  assert.equal(life.current,'repair');
 }
});

test('a completed/idle routine may still react once to a fresh food/water log',()=>{
 for(const stage of ['idle','done']){
  const {life,attempts}=lifeEventHarness(stage);
  life.listenEvents({events:['식사했다']});
  life.listenEvents({events:['식사했다']});
  assert.equal(attempts.length,1,'same log must not repeat');
  assert.equal(attempts[0].action,'eat');
  assert.equal(attempts[0].manualFlag,false);
 }
});

test('manual motion is unchanged; passive logs cannot interrupt player action',()=>{
 const {life,attempts}=lifeEventHarness('perform',true);
 life.listenEvents({events:['식사했다']});
 assert.equal(attempts.length,0);
});

test('AUTO and event listeners are visual-only; no new save schema or gameplay caps',()=>{
 const main=read('src/main.js'),survivor=read('src/survivorLife.js');
 assert.match(main,/function runSurvivalAction\(action,isAuto=false\)/);
 assert.match(main,/if\(!isAuto\|\|shouldAutoAnimateSurvivor\(world\?\.life,action\)\)/);
 assert.match(survivor,/if\(this\.manual\|\|!\['idle','done'\]\.includes\(this\.stage\)\)return/);
 assert.doesNotMatch(read('src/autoSurvivalV73.js'),/world\.life\.stage=|setCameraView|save\(|localStorage|random\(/);
});

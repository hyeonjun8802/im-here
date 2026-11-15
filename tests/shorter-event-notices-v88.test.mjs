import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
globalThis.document={baseURI:'http://localhost/'};
const {AfterdayEventBoard,EVENT_STYLES,MAX_NON_CHOICE_NOTICE_MS}=
 await import('../src/eventBoard.js');

function noticeFixture(){
 const elements=new Map();
 const query=selector=>{
  if(!elements.has(selector))elements.set(selector,{
   hidden:false,textContent:'',title:'',src:'',setAttribute(){},focus(){}
  });
  return elements.get(selector);
 };
 const el={
  hidden:true,className:'',offsetHeight:0,
  classList:{add(){},remove(){}},
  setAttribute(){},removeAttribute(){},querySelector:query
 };
 const b=Object.create(AfterdayEventBoard.prototype);
 Object.assign(b,{
  element:el,backdrop:{hidden:true},choiceLocked:false,
  activeKey:null,timer:null,seen:[],pendingNoticeSound:false,
  noticeAudio:{pause(){}},playNoticeSound(){}
 });
 return b;
}

test('shortened warning duration is 3s normally and 5s for important actionable danger',()=>{
 assert.equal(MAX_NON_CHOICE_NOTICE_MS,5000);
 for(const k of ['storm','rain','heat','cold','sickness','shortage','theft','supply_cache','milestone']){
  assert.equal(EVENT_STYLES[k].duration,3000,k);
 }
 for(const k of ['tornado','tornadoNear','tornadoDirect','raiders']){
  assert.equal(EVENT_STYLES[k].duration,5000,k);
 }
 for(const k of ['expeditionResult','survivorCall'])
  assert.ok(EVENT_STYLES[k].duration>=3000&&EVENT_STYLES[k].duration<=4000,k);
 assert.equal(EVENT_STYLES.helicopter.duration,4000);
});

test('all optional notice timers actually use shorter configured durations and cap caller overrides',()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 let scheduled=[];
 globalThis.setTimeout=(fn,ms)=>{scheduled.push({fn,ms});return 123;};
 globalThis.clearTimeout=()=>{};
 try{
  for(const [kind,expected] of [
   ['rain',3000],['storm',3000],['sickness',3000],
   ['tornadoNear',5000],['raiders',5000],['companionJoined',4000]
  ]){
   scheduled=[];
   const b=noticeFixture();
   assert.equal(b.show(kind,{silent:true,actionable:true,raiderActive:true}),true);
   assert.equal(scheduled.length,1,kind);
   assert.equal(scheduled[0].ms,expected,kind);
   assert.equal(b.element.hidden,false);
   assert.equal(b.choiceLocked,false);
   scheduled[0].fn();
   assert.equal(b.element.hidden,true,'notice auto-dismissed: '+kind);
  }
  for(const [duration,expected] of [[15000,5000],[10500,5000],[7800,5000],[2400,2400]]){
   scheduled=[];
   const b=noticeFixture();
   b.show('expeditionResult',{duration,silent:true});
   assert.equal(scheduled[0].ms,expected,'override '+duration);
  }
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

test('mandatory expedition and companion decisions are never automatically timed out',()=>{
 const originalSet=globalThis.setTimeout;
 let scheduled=[];
 globalThis.setTimeout=(fn,ms)=>{scheduled.push(ms);return 11;};
 try{
  for(const kind of ['expedition','companionInvite','companionRations']){
   scheduled=[];
   const board=noticeFixture();
   assert.equal(EVENT_STYLES[kind].duration,300000,'legacy persisted duration unchanged');
   assert.equal(board.show(kind,{silent:true}),true);
   assert.equal(board.requiresChoice(),true,kind);
   assert.equal(board.backdrop.hidden,false,kind);
   assert.deepEqual(scheduled,[],kind+' is NOT auto-dismissed');
   assert.equal(board.dismiss(),false,'cannot auto-dismiss mandatory '+kind);
   assert.equal(board.element.hidden,false,kind);
   assert.equal(board.deferChoice(),true,'manual defer permitted: '+kind);
   assert.equal(board.element.hidden,true);
  }
 }finally{globalThis.setTimeout=originalSet;}
});

test('tornado and raider buttons remain available; only notice display duration changes',()=>{
 const js=read('src/eventBoard.js');
 const main=read('src/main.js');
 assert.match(js,/const risky=options.actionable&&\['tornado','tornadoNear','tornadoDirect'\]\.includes\(key\)/);
 assert.match(js,/\.afterday-board-cover'\)\.hidden=!risky/);
 assert.match(js,/\.afterday-board-prepare'\)\.hidden=!risky/);
 assert.match(js,/\.afterday-board-secure'\)\.hidden=!\(key==='raiders'&&options\.raiderActive\)/);
 assert.match(js,/MAX_NON_CHOICE_NOTICE_MS/);
 assert.match(js,/if\(!mandatory\)this\.timer=setTimeout\(\(\)=>this\.dismiss\(\),Math\.min\(/);
 assert.match(main,/\$\('#take-cover'\)\.hidden=!approaching/);
 assert.match(main,/\$\('#secure-supplies'\)\.hidden=!approaching/);
 assert.doesNotMatch(js,/advance\(|applyAction\(|\.supply\.[a-z]+\s*[-+=]/);
});

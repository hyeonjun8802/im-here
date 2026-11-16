import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NOTICE_ANCHOR_IDS,noticeTopFromBounds,installNoticeVerticalAnchor} from '../src/eventNoticePositionV114.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/eventNoticePositionV114.css');
const html=read('index.html');
const board=read('src/eventBoard.css');
const old=read('src/storyCaptionEquipmentV74.css');

test('notice anchor measures the actual weather label, forecast, and three top-right controls',()=>{
 assert.deepEqual(NOTICE_ANCHOR_IDS,[
  '#disaster-forecast','#weather-brief','#speed-toggle','#auto-toggle','#admin-toggle'
 ]);
 assert.equal(noticeTopFromBounds({hudTop:0,visibleBottoms:[97,112,126,126,126]}),136);
 assert.equal(noticeTopFromBounds({hudTop:45,visibleBottoms:[142,158,171]}),136);
 assert.equal(noticeTopFromBounds({hudTop:0,visibleBottoms:[]}),146);
 assert.equal(noticeTopFromBounds({hudTop:0,visibleBottoms:[NaN,Infinity,129]}),139);
});
test('real HUD anchor updates after resize and observation, without changing clock or game state',()=>{
 const updates=[];
 const dummy=(bottom)=>({hidden:false,getBoundingClientRect:()=>({top:bottom-40,bottom,width:80,height:40})});
 const els={'#hud':{
  getBoundingClientRect:()=>({top:10}),
  style:{setProperty:(name,value)=>updates.push([name,value])}
 },'#weather-brief':dummy(166),'#speed-toggle':dummy(168),'#auto-toggle':dummy(170),
 '#admin-toggle':dummy(172),'#disaster-forecast':dummy(110)};
 const listeners={},observers=[];
 class Observer{
  constructor(fn){this.cb=fn;observers.push(this);}
  observe(node){this.seen=(this.seen||[]).concat(node);}
  disconnect(){this.disconnected=true;}
 }
 const win={
  ResizeObserver:Observer,
  getComputedStyle:()=>({display:'block',visibility:'visible'}),
  addEventListener:(name,fn)=>listeners[name]=fn,
  removeEventListener:(name)=>delete listeners[name],
  visualViewport:{addEventListener(){},removeEventListener(){}}
 };
 const doc={querySelector:k=>els[k]||null};
 const stop=installNoticeVerticalAnchor({doc,win});
 assert.deepEqual(updates.at(-1),['--afterday-notice-top','172px']);
 assert.equal(observers.length,1);
 assert.equal(observers[0].seen.length,6);
 listeners.resize();
 assert.equal(updates.length,2);
 observers[0].cb();
 assert.equal(updates.length,3);
 stop();
 assert.equal(observers[0].disconnected,true);
 assert.equal(listeners.resize,undefined);
});
test('CSS moves only non-choice notifications and standard warnings below weather row',()=>{
 assert.match(css,/#hud > \.afterday-board:not\(\.is-choice\)/);
 assert.match(css,/#hud > #warning\.warning:not\(\.hidden\)/);
 assert.match(css,/top:var\(--afterday-notice-top/);
 assert.match(css,/bottom:auto!important/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(max-height:480px\)/);
 assert.doesNotMatch(css,/\.afterday-board\.is-choice\s*\{/);
 assert.match(board,/\.afterday-board\.is-choice\{\s*position:fixed;top:50%/);
 assert.match(old,/body\.afterday-real-ui-v3 #hud > \.afterday-board:not\(\.is-choice\)\{\s*top:auto!important/);
});
test('new override loads last, keeping alert artwork and choice mechanics unchanged',()=>{
 const idxHtml=html.indexOf('src/eventNoticePositionV114.css');
 const idxOld=html.indexOf('src/storyCaptionEquipmentV74.css');
 assert.ok(idxHtml>idxOld);
 assert.match(html,/src\/eventNoticePositionV114\.js/);
 assert.equal((html.match(/id="warning"/g)||[]).length,1);
 assert.equal((html.match(/id="weather-brief"/g)||[]).length,1);
 assert.equal((html.match(/id="speed-toggle"/g)||[]).length,1);
 assert.doesNotMatch(css,/\.actionbar|\.survival-kit|border-color|background:/);
 assert.doesNotMatch(read('src/eventNoticePositionV114.js'),/save\(|localStorage|sessionStorage|applyAction|gameClock/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installResponsiveActionSlots} from '../src/commonUiAssetsV3.js';

const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');

function classes(){
  const set=new Set();
  return {
    toggle(name,enabled){if(enabled)set.add(name);else set.delete(name);},
    contains(name){return set.has(name);}
  };
}

test('PC rain/disaster actions never displace the original nine dock cells',()=>{
  const oldDocument=globalThis.document;
  const oldWindow=globalThis.window;
  const oldObserver=globalThis.MutationObserver;
  let observer;
  const all={};
  const actionbar={
    dataset:{},classList:classes(),buttons:[],
    querySelectorAll(selector){
      assert.equal(selector,':scope > button');
      return this.buttons.filter(button=>button.parentNode===this);
    },
    insertAdjacentElement(position,node){
      assert.equal(position,'afterend');
      this.tray=node;
    }
  };
  function button(id,hidden=false){
    const node={id,hidden,parentNode:actionbar,tagName:'BUTTON',clicks:0};
    node.click=()=>{node.clicks++;};
    all[id]=node;
    actionbar.buttons.push(node);
    return node;
  }
  const base=['drink','eat','repair','rest','medicine','explore',
    'life-panel-toggle','weather-panel-toggle'];
  for(const id of base)button(id);
  for(const id of ['take-cover','secure-supplies','collect-water'])button(id,true);
  const repairTank=button('repair-tank',true);
  const reserve={hidden:false};
  const tray={
    children:[],classList:classes(),attributes:{},
    setAttribute(key,value){this.attributes[key]=value;},
    appendChild(node){
      if(node.parentNode===this)return node;
      node.parentNode=this;
      this.children.push(node);
      return node;
    }
  };
  let resizeHandler;
  globalThis.document={
    getElementById(id){return all[id]||null;},
    createElement(tag){assert.equal(tag,'div');return tray;}
  };
  globalThis.window={
    matchMedia(query){
      assert.equal(query,'(max-width:720px)');
      return {matches:false,addEventListener(type,cb){
        assert.equal(type,'change');resizeHandler=cb;
      }};
    }
  };
  globalThis.MutationObserver=class{
    constructor(cb){observer=cb;}
    observe(){}
  };
  const count=()=>actionbar.querySelectorAll(':scope > button')
    .filter(node=>!node.hidden).length + (reserve.hidden?0:1);

  try{
    const result=installResponsiveActionSlots(actionbar,reserve,repairTank);
    assert.equal(result.tray,tray);
    assert.equal(tray.children.length,3);
    assert.equal(count(),9);
    assert.equal(actionbar.dataset.visibleSlots,'9');
    assert.equal(reserve.hidden,false);
    assert.equal(tray.classList.contains('has-urgent'),false);
    assert.equal(actionbar.classList.contains('v3-has-extra-actions'),false);

    all['collect-water'].hidden=false;
    observer();
    assert.equal(count(),9);
    assert.equal(tray.classList.contains('has-urgent'),true);
    assert.equal(all['collect-water'].parentNode,tray);
    all['collect-water'].click();
    assert.equal(all['collect-water'].clicks,1);

    all['take-cover'].hidden=false;
    all['secure-supplies'].hidden=false;
    observer();
    assert.equal(count(),9);
    assert.equal(tray.children.length,3);
    assert.equal(actionbar.classList.contains('v3-has-extra-actions'),false);

    repairTank.hidden=false;
    observer();
    assert.equal(reserve.hidden,true);
    assert.equal(count(),9);

    for(const id of ['take-cover','secure-supplies','collect-water'])all[id].hidden=true;
    observer();
    assert.equal(count(),9);
    assert.equal(tray.classList.contains('has-urgent'),false);

    resizeHandler();
    assert.equal(tray.children.length,3,'resize must not duplicate or reorder buttons');
    assert.equal(count(),9);
  }finally{
    if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
    if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
    if(oldObserver===undefined)delete globalThis.MutationObserver;else globalThis.MutationObserver=oldObserver;
  }
});

test('PC badge is smaller and desktop urgent tray sits outside nine painted cells',()=>{
  assert.match(css,/\/\* v34 \| PC-only supply badge/);
  assert.match(css,/top:9px!important;[\s\S]*?right:8px!important;[\s\S]*?width:23px!important;/);
  assert.match(css,/@media \(min-width:721px\)[\s\S]*?\.afterday-v3-urgent-actions\.has-urgent/);
  assert.match(css,/\.afterday-v3-urgent-actions > button\[hidden\][\s\S]*?display:none!important;/);
  assert.match(css,/@media \(min-width:1024px\) and \(hover:hover\) and \(pointer:fine\)[\s\S]*?bottom:calc\(16px/);
});

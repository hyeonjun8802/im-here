import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installResponsiveActionSlots} from '../src/commonUiAssetsV3.js';

class FakeNode {
 constructor(id='',tag='div'){
   this.id=id;this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;
   this.hidden=false;this.dataset={};this.attributes={};
   const names=new Set();
   this.classList={
     contains:x=>names.has(x),
     toggle:(x,on)=>{if(on)names.add(x);else names.delete(x);return !!on;}
   };
 }
 get nextSibling(){
   if(!this.parentNode)return null;
   return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null;
 }
 appendChild(node){this.insertBefore(node,null);return node;}
 insertBefore(node,reference){
   if(node.parentNode)node.parentNode.children.splice(node.parentNode.children.indexOf(node),1);
   const at=reference?this.children.indexOf(reference):this.children.length;
   if(at<0)throw Error('reference not a child');
   this.children.splice(at,0,node);node.parentNode=this;return node;
 }
 insertAdjacentElement(position,node){
   assert.equal(position,'afterend');
   if(!this.parentNode)throw Error('no parent');
   this.parentNode.insertBefore(node,this.nextSibling);
 }
 setAttribute(k,v){this.attributes[k]=v;}
 querySelectorAll(selector){
   assert.equal(selector,':scope > button');
   return this.children.filter(node=>node.tagName==='BUTTON');
 }
}
const ids=['drink','eat','take-cover','secure-supplies','repair','rest','medicine','explore','collect-water','repair-tank','life-panel-toggle','weather-panel-toggle'];
const urgent=['take-cover','secure-supplies','collect-water'];
test('rain warning adds a separate emergency control but keeps nine painted menu cells unchanged',()=>{
 const old={document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver};
 const nodes=Object.fromEntries(ids.map(id=>[id,new FakeNode(id,'button')]));
 for(const id of [...urgent,'repair-tank'])nodes[id].hidden=true;
 const parent=new FakeNode('hud'),bar=new FakeNode('actionbar','nav'),reserve=new FakeNode('reserve','span');
 const insertAt=ids.indexOf('life-panel-toggle');
 parent.appendChild(bar);
 for(let i=0;i<ids.length;i++){
   if(i===insertAt)bar.appendChild(reserve);
   bar.appendChild(nodes[ids[i]]);
 }
 const query={matches:true,listeners:[],addEventListener(event,fn){assert.equal(event,'change');this.listeners.push(fn);}};
 globalThis.document={
   getElementById:id=>nodes[id],
   createElement:tag=>new FakeNode('',tag),
   createComment:()=>new FakeNode('','comment')
 };
 globalThis.window={matchMedia:()=>query};
 globalThis.MutationObserver=class{observe(){}};
 try{
   const api=installResponsiveActionSlots(bar,reserve,nodes['repair-tank']);
   const stable=()=>bar.querySelectorAll(':scope > button').filter(n=>!n.hidden).map(n=>n.id);
   const initial=stable();
   assert.equal(initial.length,8);
   assert.equal(reserve.hidden,false);
   assert.equal(bar.dataset.visibleSlots,'9');
   assert.ok(!bar.classList.contains('v3-has-extra-actions'));
   assert.ok(!api.tray.classList.contains('has-urgent'));
   for(const id of urgent)assert.equal(nodes[id].parentNode,api.tray);
   nodes['collect-water'].hidden=false;
   api.syncSlots(); // MutationObserver delivers this callback in the browser.
   assert.deepEqual(stable(),initial,'rain cannot move or reflow primary icons');
   assert.equal(bar.dataset.visibleSlots,'9');
   assert.ok(api.tray.classList.contains('has-urgent'));
   assert.ok(!bar.classList.contains('v3-has-extra-actions'));
   nodes['collect-water'].hidden=true;
   nodes['take-cover'].hidden=false;
   nodes['secure-supplies'].hidden=false;
   api.syncSlots();
   assert.deepEqual(stable(),initial,'tornado warning cannot move primary icons');
   assert.equal(api.tray.children.filter(n=>!n.hidden).length,2);
   nodes['repair-tank'].hidden=false;
   api.syncSlots();
   assert.equal(reserve.hidden,true);
   assert.equal(bar.dataset.visibleSlots,'9','repair replaces the normal reserve, never an extra slot');
   assert.ok(!bar.classList.contains('v3-has-extra-actions'));
   // Rotating to desktop restores the original button nodes and their order.
   query.matches=false;
   query.listeners[0]();
   assert.equal(nodes['collect-water'].parentNode,bar);
   assert.equal(nodes['take-cover'].parentNode,bar);
   assert.deepEqual(bar.querySelectorAll(':scope > button').map(n=>n.id),ids);
   assert.ok(!api.tray.classList.contains('has-urgent'));
 }finally{
   for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
 }
});
test('popup styling cannot replace the nine-slot background or force flex on mobile',()=>{
 const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/commonUiAssetsV3.js',import.meta.url),'utf8');
 const section=css.slice(css.indexOf('/* v23: mobile-only overflow isolation.'));
 assert.ok(section.startsWith('/* v23: mobile-only overflow isolation.'));
 assert.match(section,/@media\(max-width:720px\)/);
 assert.match(section,/\.afterday-v3-urgent-actions\.has-urgent/);
 assert.match(section,/> button\[hidden\]\{\s*display:none!important/);
 assert.match(section,/button > img\.afterday-v3-action-icon\{[\s\S]*?position:static!important/);
 assert.match(js,/const emergencyIds=\['take-cover','secure-supplies','collect-water'\]/);
 assert.match(js,/compactQuery\.addEventListener\('change',placeEmergency\)/);
 assert.match(js,/visible>9/);
});

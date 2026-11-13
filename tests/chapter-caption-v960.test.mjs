import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

function harness(){
 const src=read('src/main.js');
 const a=src.indexOf('const CHAPTER_CAPTION_MS=');
 const b=src.indexOf('const statusBars=',a);
 assert.ok(a>0&&b>a,'Caption controller must precede renderHUD');
 const classes=new Set(['is-hidden']);
 const node={
  textContent:'',classList:{
   add(...names){for(const n of names)classes.add(n)},
   remove(...names){for(const n of names)classes.delete(n)},
   contains(n){return classes.has(n)}
  }
 };
 let next=1;const pending=new Map();
 const sandbox={
  $:selector=>selector==='#survival-chapter'?node:null,
  state:{},
  survivalDailyBriefing:(day)=>({title:'DAY '+day,line:'Story '+day}),
  setTimeout:(fn,ms)=>{const id=next++;pending.set(id,{fn,ms});return id},
  clearTimeout:id=>pending.delete(id)
 };
 vm.createContext(sandbox);
 vm.runInContext(src.slice(a,b)+'\nthis.sync=syncChapterCaption;this.duration=CHAPTER_CAPTION_MS;',sandbox);
 return {node,classes,pending,sync:sandbox.sync,duration:sandbox.duration,
  fire(){assert.equal(pending.size,1);const [id,item]=pending.entries().next().value;pending.delete(id);item.fn();return item.ms;}
 };
}
test('chapter caption appears once and self-hides after 6.5 seconds; HUD render cannot restart it',()=>{
 const h=harness();
 assert.equal(h.duration,6500);
 h.sync(8,false);
 assert.equal(h.node.textContent,'DAY 8 · Story 8');
 assert.ok(h.classes.has('is-visible'));
 assert.equal(h.pending.size,1);
 for(let i=0;i<80;i++)h.sync(8,false);
 assert.equal(h.pending.size,1);
 assert.equal(h.fire(),6500);
 assert.ok(h.classes.has('is-hidden'));
 assert.ok(!h.classes.has('is-visible'));
 for(let i=0;i<80;i++)h.sync(8,false);
 assert.ok(h.classes.has('is-hidden'));
 assert.equal(h.pending.size,0);
 h.sync(9,false);
 assert.equal(h.node.textContent,'DAY 9 · Story 9');
 assert.ok(h.classes.has('is-visible'));
 assert.equal(h.pending.size,1);
 h.sync(9,true);
 assert.ok(h.classes.has('is-hidden'));
 assert.equal(h.pending.size,0);
});
test('central story starts invisible, fades out and never obscures survivor actions',()=>{
 const html=read('index.html'),css=read('src/style.css'),main=read('src/main.js');
 assert.match(html,/id="survival-chapter" class="survival-chapter is-hidden"/);
 assert.match(css,/#survival-chapter\.is-visible\{[\s\S]*?opacity:1!important/);
 assert.match(css,/#survival-chapter\.is-hidden\{[\s\S]*?opacity:0!important/);
 assert.match(css,/transition:opacity \.85s ease/);
 assert.match(main,/syncChapterCaption\(day,dead\)/);
 assert.match(css,/#survival-chapter\{[\s\S]*?pointer-events:none/);
});

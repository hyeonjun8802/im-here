import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const marker='/* v35 | Four top-left stock pictograms only';
const patch=css.slice(css.indexOf(marker));

test('top resource icons use dedicated responsive sizes without resizing numbers or HUD art',()=>{
  assert.ok(patch.startsWith(marker));
  assert.match(patch,/\.survival-hud-stock \.hud-picto\s*\{[\s\S]*?width:clamp\(18px,1\.45vw,22px\)!important;/);
  assert.match(patch,/@media \(min-width:721px\) and \(max-width:1023px\)\s*\{/);
  assert.match(patch,/width:clamp\(13px,1\.7vw,18px\)!important;/);
  assert.match(patch,/@media \(max-width:720px\)\s*\{/);
  assert.match(patch,/width:clamp\(10px,2\.9vw,13px\)!important;/);
  assert.doesNotMatch(patch,/\.survival-hud-stock strong|\.survival-hud-stats|\.actionbar|\.premium-hud__frame/);
});

test('all four live resource counters retain their matching pictograms',()=>{
  for(const [type,id] of [
    ['food','hud-stock-food'],
    ['water','hud-stock-water'],
    ['medicine','hud-stock-medicine'],
    ['parts','hud-stock-parts']
  ]) {
    assert.match(html,new RegExp('hud-picto--'+type+'[^\\n]*?<strong id="'+id+'"'));
  }
});

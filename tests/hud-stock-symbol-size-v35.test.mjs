import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const marker='/* v35 | Four top-left stock pictograms only';
const patch=css.slice(css.indexOf(marker),css.indexOf('/* v36 | PC readability calibrated'));

test('top resource icons use dedicated responsive sizes without resizing numbers or HUD art',()=>{
  assert.ok(patch.startsWith(marker));
  assert.match(patch,/\.survival-hud-stock \.hud-picto\s*\{[\s\S]*?width:clamp\(22px,1\.75vw,28px\)!important;/);
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

test('desktop stock counts are readable without scaling icons, frames or phone layout',()=>{
  const quantityCss=css.slice(css.indexOf('/* v36 | PC readability calibrated'),css.indexOf('/* v38 | Existing companion-status line'));
  assert.match(quantityCss,/@media \(min-width:1024px\) and \(hover:hover\) and \(pointer:fine\)\s*\{/);
  assert.match(quantityCss,/\.survival-hud-stock strong\s*\{/);
  assert.match(quantityCss,/font-size:clamp\(24px,1\.8vw,30px\)!important;/);
  assert.match(quantityCss,/font-variant-numeric:tabular-nums!important;/);
  assert.match(quantityCss,/\.survival-hud-stat-label\s*\{[\s\S]*?font-size:clamp\(15px,1\.2vw,19px\)!important;/);
  assert.match(quantityCss,/\.survival-hud-stat strong\s*\{[\s\S]*?font-size:clamp\(16px,1\.3vw,20px\)!important;/);
  assert.doesNotMatch(quantityCss,/\.hud-picto|\.premium-hud__frame|\.actionbar|@media \(max-width:720px\)/);
});

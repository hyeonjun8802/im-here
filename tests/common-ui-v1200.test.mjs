import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/commonUiV1200.css',import.meta.url),'utf8');

test('v12 common UI is linked after approved v1006 HUD CSS without replacing artwork',()=>{
  assert.match(html,/commonUiV1200\.css/);
  assert.ok(html.indexOf('premiumHudV1004.css') < html.indexOf('commonUiV1200.css'));
  assert.match(html,/hud_compact_mobile_ref_v1006\.png/);
  assert.match(html,/hud_compact_desktop_ref_v1006\.png/);
  for(const n of ['#world','disaster-forecast','survival-day-chip','actionbar','survival-kit','warning']) {
    assert.ok(html.includes(n.replace(/^#/,'')), n+' exists');
  }
});

test('survival-day chip reads authoritative game state and refreshes with HUD',()=>{
  assert.match(main,/dayChip=\$\('#survival-day-chip'\)/);
  assert.match(main,/dayChip\.textContent='생존 '\+day\+'일차'/);
  assert.match(main,/\$\('#days'\)\.textContent='DAY '/);
});

test('HUD frames preserve live actions and responsive safe areas',()=>{
  assert.match(css,/\.actionbar button/);
  assert.match(css,/\.survival-kit/);
  assert.match(css,/\.warning/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/color:#f2e9d8/i);
  assert.ok(!css.includes('display:none!important}.actionbar'));
});

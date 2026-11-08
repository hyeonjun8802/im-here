import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completeHudGlyph,ACTION_GLYPH_IDS} from '../src/hudActionGlyphsV1400.js';
const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
const loader=readFileSync(new URL('../src/commonUiAssetsV3.js',import.meta.url),'utf8');
test('all live HUD icons use complete scalable glyphs rather than clipped atlas crops',()=>{
  for(const name of ['drink','eat','repair','rest','medicine','explore','life-panel-toggle','weather-panel-toggle','reserve']){
    assert.ok(ACTION_GLYPH_IDS.includes(name));
    const url=completeHudGlyph(name);
    assert.match(url,/^data:image\/svg\+xml;charset=utf-8,/);
    const svg=decodeURIComponent(url.split(',')[1]);
    assert.match(svg,/viewBox="0 0 64 64"/);
    assert.match(svg,/<linearGradient/);
    assert.match(svg,/<path/);
    assert.ok(!svg.includes('<image'),'No broken sprite bitmap is embedded');
  }
  assert.match(loader,/icon.src=completeHudGlyph\(id\)/);
  assert.match(loader,/reserveIcon.src=completeHudGlyph\('reserve'\)/);
  assert.match(loader,/button.setAttribute\('aria-label',button.textContent.trim\(\)\)/);
  assert.doesNotMatch(loader,/centeredIconFromAtlas/);
});
test('source circle fill and stock safe region are defined in one last-loaded layer',()=>{
 assert.match(css,/v14 authoritative art-safe layout/);
 assert.match(css,/survival-hud-stock\{\s*left:61%!important;width:33%!important/);
 assert.match(css,/survival-hud-stats\{\s*left:4\.9%!important;width:37%!important/);
 assert.match(css,/premium-hud__current-art\{\s*left:50%!important;top:4%!important;width:17%!important;height:92%!important/);
 assert.match(css,/button\[data-v3-sprite\] > span\{\s*display:none!important/);
});

test('metal frame neutralizer never overpaints the untouched sixth source slot',()=>{
 assert.match(loader,/sourceBar.x\+407,sourceBar.y\+29,118,128/);
 assert.doesNotMatch(loader,/sixthSlot|sourceBar.x\+sixthSlot/);
 assert.match(loader,/bottom_action_bar_neutral/);
});

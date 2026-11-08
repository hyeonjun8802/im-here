import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
test('bottom action glyph ink is lowered inside existing source slot on PC and phone',()=>{
 assert.match(css,/AFTERDAY v18 \| mobile-first premium fit/);
 assert.match(css,/\.actionbar:not\(\.v3-has-extra-actions\) > button > img\.afterday-v3-action-icon,/);
 assert.match(css,/top:calc\(50% \+ 3px\)!important/);
 assert.match(css,/top:calc\(50% \+ 4px\)!important/);
 assert.match(css,/transform:translate\(-50%,-50%\)!important/);
 assert.match(css,/v17 single-layer bottom navigation/);
});
test('equipment metal source has a narrower art-preserving responsive width and proportional contents',()=>{
 assert.match(css,/\.survival-kit:has\(> \.survival-kit-action\)\s*\{\s*width:clamp\(274px,26vw,328px\)!important/);
 assert.match(css,/@media\(max-width:720px\)\{[\s\S]*?width:clamp\(204px,57vw,246px\)!important/);
 assert.match(css,/aspect-ratio:461 \/ 308!important/);
 assert.match(css,/font-size:clamp\(9\.7px,2\.6vw,10\.9px\)!important/);
 assert.match(css,/font-size:clamp\(9\.5px,2\.45vw,10\.6px\)!important/);
});

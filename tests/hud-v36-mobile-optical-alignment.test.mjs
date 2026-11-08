import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/commonUiLayoutV31.css');
const html=read('index.html');
const main=read('src/main.js');

test('iPhone bottom-of-forecast speed button aligns right without resizing it',()=>{
 assert.match(css,/v3\.6 precision HUD alignment/);
 assert.match(css,/@media\(max-width:720px\)\s*\{[\s\S]*?body\.afterday-real-ui-v3 #hud \.topbar \.top-right\s*\{\s*right:8px!important;\s*transform:none!important;/);
 assert.match(css,/body\.afterday-real-ui-v3 #hud \.topbar \.top-right #speed-toggle\s*\{\s*align-self:flex-end!important;/);
 assert.match(css,/\.topbar \.top-right #speed-toggle\{\s*width:48px!important;/);
 assert.match(html,/id="speed-toggle"/);
 assert.match(main,/speedButton\.addEventListener\('click'/);
});
test('weather medallion image alone shifts slightly within the original round frame',()=>{
 assert.match(css,/\.disaster-forecast\.premium-hud-v1000 \.premium-hud__current-art\s*\{\s*left:calc\(50% \+ 3px\)!important;\s*transform:translateX\(-50%\)!important;/);
 assert.match(html,/id="disaster-forecast"/);
 assert.match(html,/disaster-forecast__artwork/);
 assert.doesNotMatch(css.split('v3.6 precision HUD alignment')[1],/\.premium-hud__frame\s*\{/);
 assert.doesNotMatch(css.split('v3.6 precision HUD alignment')[1],/\.premium-hud__forecast\s*\{/);
});

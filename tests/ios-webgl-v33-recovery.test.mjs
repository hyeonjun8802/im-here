import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const world=read('src/world.js');
const main=read('src/main.js');
const css=read('src/commonUiLayoutV31.css');
const atlas=read('src/commonUiAssetsV3.js');

test('mobile Safari renderer enables antialiasing while bounding shadow buffers',()=>{
 assert.match(world,/antialias:!this\.gpuSafeMode/);
 assert.match(world,/this\.gpuSafeMode=mobile&&gpuSafeMode/);
 assert.match(world,/mobile\?mobileProfile\.pixelRatio:Math\.min\(devicePixelRatio,1\.8\)/);
 assert.match(world,/this\.renderer\.shadowMap\.enabled=!this\.gpuSafeMode/);
 assert.match(world,/mobile\?mobileProfile\.shadowSize:3072/);
 assert.match(world,/setQuality\(value\)[\s\S]*?gpuSafeMode/);
});
test('WebGL context loss is recoverable, saves state, does not loop infinitely',()=>{
 assert.match(main,/webglcontextlost/);
 assert.match(main,/event\.preventDefault\(\)/);
 assert.match(main,/webglcontextrestored/);
 assert.match(main,/gpuRecoveryTimer=setTimeout/);
 assert.match(main,/last<90000/);
 assert.match(main,/sessionStorage\.setItem\(GPU_SAFE_KEY,'1'\)/);
 assert.match(main,/if\(!gpuContextLost && foreground\)/);
 assert.match(main,/foreground&&!questPaused&&!gpuContextLost/);
 assert.match(main,/save\(\);\s*gpuRecoveryTimer/);
 assert.match(main,/WebGLShader\|shaderSource\|context lost\|createShader/);
 assert.match(main,/3D 화면 다시 불러오기/);
});
test('mobile selected action glow stays inside the single original metal rail',()=>{
 assert.match(css,/v3\.3 mobile rail/);
 assert.match(css,/actionbar button#explore::before,[\s\S]*?actionbar button\.needs-attention::before\s*\{\s*content:none!important;\s*display:none!important;/);
 assert.match(css,/actionbar button#explore,[\s\S]*?actionbar button\.needs-attention\s*\{[\s\S]*?box-shadow:none!important/);
 assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
 assert.match(atlas,/bottom_action_bar_full/);
 for(const w of [320,355,375,390,414,430,720]){
  const slot=((w-8)*(1-.043))/9;
  const icon=Math.min(27,Math.max(20,w*.052));
  assert.ok(slot>icon+5,'mobile icon fits nine-slot source frame at '+w+'px');
 }
});
test('disaster overflow bar keeps the actual extracted slot images',()=>{
 assert.match(css,/v3\.3 emergency action overflow/);
 assert.match(css,/\.actionbar\.v3-has-extra-actions\{/);
 assert.match(css,/overflow-x:auto!important/);
 assert.match(css,/background:var\(--afterday-v3-bottom_action_bar_neutral/);
 assert.doesNotMatch(css,/background(?:-image)?:var\(--afterday-v3-square_slot_(?:01|selected)\)/);
});

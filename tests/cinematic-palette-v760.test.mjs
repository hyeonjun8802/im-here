import test from 'node:test';
import assert from 'node:assert/strict';
import {warmColorWeight,cinematicLuminance,PALETTE} from '../src/cinematicPaletteV760.js';
test('warm fire is protected while neutral snow and cold concrete remain restrained',()=>{
 assert.equal(warmColorWeight(.5,.5,.5),0);
 assert.equal(warmColorWeight(.2,.3,.4),0);
 assert.ok(warmColorWeight(1,.4,.08)>.95);
 assert.ok(PALETTE.neutralSaturation<PALETTE.warmSaturation);
});
test('luminance contrast preserves black and the neutral pivot without clipped shadows',()=>{
 assert.equal(cinematicLuminance(0),0);
 assert.equal(cinematicLuminance(.22),.22);
 assert.ok(cinematicLuminance(.01)>0);
 assert.ok(cinematicLuminance(.05)<.05);
 assert.ok(cinematicLuminance(.6)>.6);
 let previous=0;
 for(let i=1;i<=400;i++){
  const current=cinematicLuminance(i/100);
  assert.ok(Number.isFinite(current)&&current>previous);previous=current;
 }
});
test('color protection is invariant to light intensity and continuous at neutral colors',()=>{
 const a=warmColorWeight(.8,.4,.2),b=warmColorWeight(1.6,.8,.4);
 assert.ok(Math.abs(a-b)<1e-12);
 assert.ok(warmColorWeight(.50001,.5,.5)<.001);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Three.js ShaderMaterial with fog:true expects built-in fog uniforms;
// our custom particle/veil shaders do not declare or consume those uniforms.
// On WebGL this otherwise throws when the renderer reads fogColor.value.
test('custom cinematic shaders do not request unsupported Three.js fog uniforms',()=>{
  for(const path of [
    'src/premiumCinematicCityV650.js',
    'src/premiumWeatherSurfacesV700.js',
    'src/premiumCollapseAftermathV720.js'
  ]){
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.doesNotMatch(source,/fog\s*:\s*true\b/,path+' must not enable built-in fog');
    assert.match(source,/fog\s*:\s*false\b/,path+' should explicitly disable built-in fog');
  }
});

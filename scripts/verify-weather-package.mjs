import fs from 'node:fs';
import assert from 'node:assert/strict';
for(const path of [
 'src/cinematicWeatherVfx.js', 'src/weatherVisualMath.js','src/advancedWeather.js',
 'src/weatherAudio.js','src/cinematicStage.js','src/cityAtmosphere.js',
 'public/assets/models/afterday/afterday_shelter_pbr.glb',
 'public/assets/models/afterday/afterday_water_tank_pbr.glb',
 'public/assets/models/afterday/afterday_storage_pbr.glb'
])assert.ok(fs.existsSync(path)&&fs.statSync(path).size>100,path);
console.log('PASS: realtime weather source and 3 local PBR GLBs are present.');

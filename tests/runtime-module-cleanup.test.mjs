import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const removed=["src/disasterForecastV800.js","src/avatarMotionV180.js","src/avatarProviderV170.js","src/officialVRMAvatarV170.js","src/referenceSurvivorV160.js","src/referenceSurvivorPlanV160.js","src/performerV140.js","tests/disaster-forecast-v800.test.mjs","tests/reference-suit-v160.test.mjs","tests/release-avatar-motion-v180.test.mjs","tests/legacy/official-avatar-v170.test.mjs","tests/legacy/reference-character-v160.test.mjs","scripts/download-avatar.mjs","scripts/qa_official_vrm_v170.mjs","scripts/qa_reference_character_v160.mjs"];
test('retired implementations stay outside the production runtime and tree',()=>{
  for(const p of removed) assert.equal(existsSync(new URL('../'+p,import.meta.url)),false,p);
});
test('the live main and character entries remain wired to the approved game',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(main,/\.\/premiumHudV1000\.js/);
  assert.match(main,/\.\/world\.js/);
  assert.match(world,/\.\/beardedSurvivorV190\.js/);
  assert.match(html,/survival-quick-info/);
  assert.match(html,/id="speed-toggle"/);
  assert.match(html,/commonUiLayoutV31\.css/);
});

test('legacy forecast behavior is tested via fixture, not shipped in the live src tree',()=>{
  assert.equal(existsSync(new URL('../tests/fixtures/disasterForecastV800.js',import.meta.url)),true);
});

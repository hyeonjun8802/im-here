import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const world=read('world.js');
const camp=read('sceneDetails.js');
const ruins=read('ApocalypseSetDressingV201.js');
const horizon=read('HorizonWorldExpansionV210.js');

test('mobile retains the actual city, lived-in roof, survivor and disaster persistence',()=>{
 assert.ok(world.includes("const mobile=window.innerWidth<800 || Boolean(window.matchMedia?.("));
 assert.ok(world.includes("const mobile=this.isMobile;"));
 assert.match(world,/this\.createEnvironment\(\);/);
 assert.match(world,/this\.cityInfill=new CityInfillV150\(this\);/);
 assert.match(world,/this\.ambientCityCollapse=new AmbientCityCollapseV660\(this\);/);
 assert.match(world,/this\.createRoof\(\);\s*this\.createRoofProps\(\);/);
 assert.match(world,/this\.life=new SurvivorLife\(this\);/);
 assert.match(world,/this\.beardedSurvivor=new BeardedSurvivorV190\(this\);/);
 assert.match(world,/this\.cinematicTornado=new NearTornadoVfx\(this\);/);
 assert.match(world,/this\.heroAssetPromise=this\.loadHeroAssets\(\);/);
 assert.match(camp,/const placeCot=\(\)=>\{world\.sleepBedding=installOriginalCot/);
 assert.match(camp,/if\(world\.isMobile\)\{\s*placeCot\(\);/);
});

test('mobile skips cosmetic-only city and camp construction, not its buildings',()=>{
 assert.match(world,/if\(!this\.isMobile\)\{\s*this\.cityReclamation=new CityReclamation/);
 assert.match(world,/if\(!this\.isMobile\)\{\s*this\.cityAtmosphere=new CityAtmosphere/);
 assert.match(world,/if\(!this\.isMobile\)this\.botany=new RooftopBotany/);
 assert.match(world,/if\(!this\.isMobile\)upgradeCampFacilities/);
 assert.match(world,/if\(!this\.isMobile\)props\.forEach/);
 assert.match(world,/if\(this\.cityAtmosphere\)this\.cityAtmosphere\.update/);
 assert.match(world,/if\(this\.groundMist\)this\.groundMist\.update/);
 assert.match(world,/if\(this\.cinematicPost\)this\.cinematicPost\.render\(\);else this\.renderer\.render/);
});

test('extra skyline modules keep mobile building masses without debris and set dressing',()=>{
 assert.match(ruins,/this\.makeForegroundRuins\(\);\s*this\.makeDistantSkyline\(\);\s*if\(!world\.isMobile\)/);
 assert.match(horizon,/this\.makeFarCity\(\);\s*if\(!world\.isMobile\)/);
 assert.match(ruins,/if\(!w\.isMobile\)\{\s*this\.meshes\.push\(addInstances\(this\.group,'Broken skyline antennas/);
 assert.match(horizon,/if\(!mobile\)\{\s*this\.meshes\.push\(addInstances\(this\.group,'Far rooftop water tanks/);
});

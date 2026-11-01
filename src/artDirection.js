/**
 * AFTERDAY visual identity lock (v0.5.1).
 * GitHub SimCity GLBs are source geometry only: the final world must remain
 * a damaged, empty Seoul-like rooftop survival environment.
 * Keep this file dependency-free so policy can be tested with Node alone.
 */
export const ART_DIRECTION = Object.freeze({
  title: 'AFTERDAY',
  identity: 'weather-driven one-survivor rooftop tamagotchi in ruined Seoul',
  palette: Object.freeze({
    ruinNavy: '#293742', concrete: '#777b73', oliveCanvas: '#686f57',
    oxidizedSteel: '#855b46', charcoal: '#353d3f', moss: '#556e4b', fireAmber: '#f6c177'
  }),
  references: Object.freeze([
    'docs/visual-reference/rooftop_target.png',
    'docs/visual-reference/weather_target.png'
  ]),
  forbidden: Object.freeze([
    'SimCity-style building placement and city-management mechanics',
    'lively populated roads, traffic, operating shops and new urban infrastructure',
    'bright toy/plastic look, cartoon village, fantasy weapons or neon cyberpunk',
    'using concept illustrations as rotating 3D meshes',
    'decorative upgrades, monetization, character-skin collection or combat loop',
    'adjacent or connected foreground rooftops, second survivor camps, rooftop villages'
  ])
});

// Actual models verified by name in dgreenheck/simcity-threejs-clone repository.
// Filtered specifically for post-disaster Seoul-compatible silhouettes.
export const CITY_MODELS = Object.freeze([
  'building-block-4floor-back', 'building-block-4floor-front',
  'building-block-4floor-corner', 'building-block-5floor',
  'building-block-5floor-corner', 'building-block-5floor-front',
  'building-office-balcony', 'building-office-tall', 'building-office',
  'building-office-big', 'building-office-rounded',
  'building-hospital', 'building-school', 'building-house-block-old',
  'building-house-block-big', 'building-skyscraper',
  'skyscraper-large', 'skyscraper-medium', 'skyscraper-small',
  'skyscraper-huge', 'industry-factory-old', 'industry-warehouse',
  'industry-storage', 'building-firestation'
]);

// Reused objects must have a practical purpose in a survivor camp.
export const ROOFTOP_PROPS = Object.freeze([
  ['chair-folding', [-1, 0.20, 8], 1.8],
  ['bench-old', [6, 0.18, 8], 1.65],
  ['bin-wheelie', [16, 0.22, 14], 1.8],
  ['grill-round', [3, 0.26, 3], 1.1],
  ['palette', [16, 0.24, 4], 0.45],
  // Low-poly plant GLBs were retired in v2.9: organic instanced foliage is in RooftopBotany.
  // Solar panels are already modeled as real 3D equipment by sceneDetails.js.
  // Importing solar-panel-house adds an entire house/roof into the camp.
  ['fence-stone-metal', [0, 2, -22], 2],
  // Ground slabs can scale into a giant second roof due to near-zero model height.
  // The playable floor already has cracked concrete and tar patches.
  ['lantern-long', [-3, 0.30, -12], 2],
  ['dryer-outside', [-14, 0.20, -1], 2.2],
  ['dumpster', [18, 0.20, -19], 2.7],
  ['fence-classic', [1, 0.20, -19], 1.9],
  ['fence-big', [-19, 0.20, 10], 2.1],
  ['fence', [-19, 0.20, -7], 2.1],
  ['chair-folding', [1, 0.20, -7], 1.7],
]);

// Vehicles are *abandoned, stationary debris only*, never moving traffic.
export const ABANDONED_VEHICLES = Object.freeze([
  'car-passenger', 'car-hippie-van', 'truck', 'car-truck-dump', 'car-veteran'
]);

export const CITY_TINTS = Object.freeze(['#8f9b88', '#809189', '#939a8b', '#738982']);
export const PROP_TINT = '#b5b6a3';
export const VEHICLE_TINT = '#888e8c';

export function validateArtSelection(manifestModels) {
  const names=new Set(manifestModels.map(name=>name.replace(/\.glb$/, '')));
  const selected=[...CITY_MODELS,...ROOFTOP_PROPS.map(x=>x[0]),...ABANDONED_VEHICLES];
  return selected.filter(name=>!names.has(name));
}

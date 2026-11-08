/* AFTERDAY v14: source-safe complete action glyphs.
 * The legacy 48-sprite atlas remains the single source for METAL FRAMES.
 * Its 64x64 action glyph crops contain truncated art/foreign sprite pixels;
 * these small coherent inline SVGs are intentionally independent of that atlas.
 * Pure icon resources: no HUD state, WebGL, save or input changes.
 */
const gold='#e6dac5';
const dark='#252c30';
const GLYPHS={
 water:'<path d="M32 7C27 17 15 31 15 40a17 17 0 0 0 34 0C49 31 37 17 32 7Z" fill="url(#gold)" /><path d="M24 39c-1 8 3 13 10 14" fill="none" stroke="#fff2da" stroke-width="3" stroke-linecap="round"/>',
 food:'<path d="M12 10v17c0 7 7 9 9 9v17h6V36c3 0 9-2 9-9V10h-4v15h-4V10h-4v15h-4V10Z" fill="url(#gold)"/><path d="M49 10c-8 9-10 19-10 27h8v16h6V10Z" fill="url(#gold)"/>',
 hammer:'<path d="M13 17l11-9 12 5 10 11-9 9-11-10-6 6-7-7Z" fill="url(#gold)"/><path d="M30 30l-16 18c-2 3-2 6 1 8s6 1 8-1l16-18Z" fill="url(#gold)"/>',
 moon:'<path d="M44 9C35 11 29 19 29 30c0 13 9 22 22 22-5 5-12 8-20 8-16 0-27-12-27-27 0-14 11-26 25-27 5-1 11 0 15 3Z" fill="url(#gold)" transform="translate(4 -3) scale(.94)"/>',
 medical:'<rect x="10" y="19" width="44" height="37" rx="5" fill="url(#gold)"/><path d="M23 19v-5c0-4 3-6 7-6h4c4 0 7 2 7 6v5" fill="none" stroke="#f5d4a4" stroke-width="5"/><path d="M28 26h8v8h8v8h-8v8h-8v-8h-8v-8h8Z" fill="#303943" stroke="none"/>',
 crate:'<path d="M9 19h46v35H9Z" fill="url(#gold)"/><path d="M9 19l8-9h30l8 9Z" fill="#e7bf84"/><path d="M19 24v26M45 24v26M14 35h36" fill="none" stroke="#684c33" stroke-width="3"/><path d="M27 19h10v12H27Z" fill="#e8bc7c" stroke="none"/>',
 wrench:'<path d="M46 9a16 16 0 0 0-17 20L11 47a6 6 0 0 0 8 8l18-18a16 16 0 0 0 18-18L44 30l-11-10Z" fill="url(#gold)"/><circle cx="17" cy="49" r="2.8" fill="#51402e" stroke="none"/>',
 music:'<path d="M28 13l26-6v32c0 7-5 12-13 12-6 0-10-3-10-8s4-9 10-10l6-1V19l-14 4v25c0 7-5 12-13 12-7 0-11-3-11-8 0-6 6-10 13-10h4Z" fill="url(#gold)" transform="translate(0 -2) scale(.98)"/>',
 cloud:'<path d="M17 51h31c7 0 12-5 12-12s-5-12-12-12c-1-9-8-16-18-16-9 0-16 6-18 14C6 26 3 31 3 38c0 8 6 13 14 13Z" fill="url(#gold)" transform="translate(2 0) scale(.94)"/>',
 shield:'<path d="M32 7l22 9v14c0 16-10 25-22 30C20 55 10 46 10 30V16Z" fill="url(#gold)"/><path d="M22 33l8 8 14-16" fill="none" stroke="#384857" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
 shelter:'<path d="M9 53l23-43 23 43H9Z" fill="url(#gold)"/><path d="M32 10v43M25 53V40l7-10 7 10v13" fill="none" stroke="#705334" stroke-width="3"/>',
 supply:'<path d="M11 22l21-11 21 11v30L32 62 11 52Z" fill="url(#gold)"/><path d="M11 22l21 12 21-12M32 34v28" fill="none" stroke="#705334" stroke-width="3"/>'
};
const ACTION_TO_GLYPH={
 drink:'water',eat:'food',repair:'hammer',rest:'moon',medicine:'medical',
 explore:'crate','repair-tank':'wrench','life-panel-toggle':'music',
 'weather-panel-toggle':'cloud','take-cover':'shield','secure-supplies':'supply',
 'collect-water':'water',reserve:'wrench'
};
const cache=new Map();
export function completeHudGlyph(name){
 const kind=ACTION_TO_GLYPH[name]||name;
 if(!Object.hasOwn(GLYPHS,kind))throw new Error('Unknown complete HUD glyph: '+name);
 if(cache.has(kind))return cache.get(kind);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">'+
 '<defs><linearGradient id="gold" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="'+gold+'"/><stop offset=".52" stop-color="#b8ad9b"/><stop offset="1" stop-color="#786f63"/></linearGradient></defs>'+
 '<g fill="url(#gold)" stroke="'+dark+'" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">'+GLYPHS[kind]+'</g></svg>';
 const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 cache.set(kind,url);
 return url;
}
export const ACTION_GLYPH_IDS=Object.freeze(Object.keys(ACTION_TO_GLYPH));

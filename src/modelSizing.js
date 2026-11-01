/** Defensive dimensions for imported SimCity GLBs.
 * A flat model with tiny Y extent must never turn into a whole roof slab.
 * Inputs and output are in source-model units; no Three.js dependency.
 */
export function fitModelScale(size, desiredHeight, opts={}) {
  const {x,y,z}=size;
  if(![x,y,z,desiredHeight].every(Number.isFinite) || y<=1e-4 || desiredHeight<=0) return null;
  const maxScale=Number.isFinite(opts.maxScale) ? opts.maxScale : 200;
  const maxFootprint=Number.isFinite(opts.maxFootprint) ? opts.maxFootprint : Infinity;
  if(maxScale<=0 || maxFootprint<=0) return null;
  const horizontal=Math.max(x,z);
  if(horizontal<0) return null;
  const footprintScale=horizontal>0 ? maxFootprint/horizontal : Infinity;
  const scale=Math.min(maxScale,desiredHeight/y,footprintScale);
  return Number.isFinite(scale)&&scale>0?scale:null;
}

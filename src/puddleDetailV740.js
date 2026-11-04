import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Fixed, toroidally wrapped impact sites keep every flipbook frame tileable.
const sites = Array.from({length: 7}, (_, i) => ({
  x: hash(i * 19 + 4), y: hash(i * 31 + 8), phase: hash(i * 43 + 2)
}));

export function puddleMask(u, v) {
  const x = (u - .5) * 2, y = (v - .5) * 2;
  const angle = Math.atan2(y, x), radius = Math.hypot(x, y);
  const edge = .78 + .08 * Math.sin(angle * 3 + .7) + .045 * Math.cos(angle * 7 - .3);
  return 1 - smooth(edge - .14, edge, radius);
}

export function rippleSlope(u, v, phase) {
  let dx = 0, dy = 0;
  for (const site of sites) {
    const life = ((phase + site.phase) % 1 + 1) % 1;
    let x = u - site.x, y = v - site.y;
    x -= Math.round(x); y -= Math.round(y);
    const distance = Math.hypot(x, y);
    if (distance < 1e-6) continue;
    const q = (distance - (.025 + life * .34)) / .023;
    // Derivative of a Gaussian ring: no abrupt births or deaths at loop edges.
    const slope = -2 * q * Math.exp(-q * q) * Math.sin(Math.PI * life) ** 2 * .32;
    dx += slope * x / distance; dy += slope * y / distance;
  }
  return [dx, dy];
}

function texture(data, size, repeat = false) {
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.wrapS = map.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true; map.needsUpdate = true;
  return map;
}

export class PuddleDetailV740 {
  constructor(material, mobile = false) {
    this.material = material; this.elapsed = 0; this.frame = 0;
    const size = mobile ? 64 : 128, count = mobile ? 8 : 12;
    const mask = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, alpha = Math.round(puddleMask((x + .5) / size, (y + .5) / size) * 255);
      mask[i] = mask[i + 1] = mask[i + 2] = alpha; mask[i + 3] = 255;
    }
    this.mask = texture(mask, size);
    this.frames = Array.from({length: count}, (_, frame) => {
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const [dx, dy] = rippleSlope((x + .5) / size, (y + .5) / size, frame / count);
        const inv = 1 / Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
        data[i] = Math.round((-.5 * dx * inv + .5) * 255);
        data[i + 1] = Math.round((-.5 * dy * inv + .5) * 255);
        data[i + 2] = Math.round((.5 * inv + .5) * 255); data[i + 3] = 255;
      }
      return texture(data, size, true);
    });
    this.previous = {alphaMap: material.alphaMap, normalMap: material.normalMap, normalScale: material.normalScale.clone(),
      clearcoatNormalMap: material.clearcoatNormalMap, clearcoatNormalScale: material.clearcoatNormalScale.clone()};
    material.alphaMap = this.mask; material.normalMap = this.frames[0];
    material.clearcoatNormalMap = this.frames[0];
    material.normalScale.set(0, 0); material.clearcoatNormalScale.set(0, 0); material.needsUpdate = true;
    this.disposed = false;
  }

  update(dt, rain, wet) {
    if (this.disposed) return;
    const strength = clamp01(rain) * clamp01(wet);
    this.material.normalScale.setScalar(strength * .40);
    this.material.clearcoatNormalScale.copy(this.material.normalScale);
    if (strength < .001) return;
    // Real elapsed time, capped after backgrounding; independent of game speed.
    this.elapsed += Math.min(.1, Math.max(0, Number(dt) || 0));
    const frame = Math.floor(this.elapsed * 10) % this.frames.length;
    if (frame !== this.frame) {
      this.frame = frame;
      this.material.normalMap = this.frames[frame];
      this.material.clearcoatNormalMap = this.frames[frame];
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.material.alphaMap = this.previous.alphaMap;
    this.material.normalMap = this.previous.normalMap;
    this.material.normalScale.copy(this.previous.normalScale);
    this.material.clearcoatNormalMap = this.previous.clearcoatNormalMap;
    this.material.clearcoatNormalScale.copy(this.previous.clearcoatNormalScale);
    this.material.needsUpdate = true;
    this.mask.dispose(); for (const map of this.frames) map.dispose();
  }
}

// Visual-only dampening for materials owned by the procedural micro-surface pass.
// Authored GLB maps, material colors, metalness and gameplay state stay untouched.
const clamp01 = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const RESPONSE = Object.freeze({
  concrete: {roughness: .58, normal: .78},
  asphalt: {roughness: .42, normal: .66},
  metal: {roughness: .35, normal: .84}
});

export function approachWetness(current, target, dt) {
  const from = clamp01(current), to = clamp01(target);
  const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt)) : 0;
  // Material response softens weather-preview jumps. Drying is slower than wetting.
  const rate = to > from ? .8 : .12;
  const next = to + (from - to) * Math.exp(-rate * seconds);
  return Math.abs(next - to) < 1e-6 ? to : next;
}

export class PremiumWetMaterialV750 {
  constructor(world) {
    this.world = world; this.wetness = 0; this.records = new Map(); this.disposed = false;
    const sets = world.premiumMicroSurface?.sets || {};
    // One initial scan. Later collapse materials are registered by their owner.
    world.scene.traverse(object => {
      if (!object.isMesh) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const [kind, maps] of Object.entries(sets)) {
          if (material?.normalMap === maps.normal && material?.roughnessMap === maps.roughness) {
            this.registerMaterial(material, kind);
          }
        }
      }
    });
  }

  registerMaterial(material, kind) {
    if (this.disposed || this.records.has(material) || !RESPONSE[kind]) return false;
    if (!material?.isMeshStandardMaterial || !material.normalScale || !Number.isFinite(material.roughness)) return false;
    const record = {material, kind, roughness: material.roughness, normalScale: material.normalScale.clone()};
    record.release = () => {
      this.records.delete(material);
      material.removeEventListener('dispose', record.release);
    };
    material.addEventListener('dispose', record.release);
    this.records.set(material, record);
    this.apply(record);
    return true;
  }

  apply(record) {
    const {material, kind, roughness, normalScale} = record, response = RESPONSE[kind];
    // Never polish an already smoother material into a rougher surface.
    const wetRoughness = Math.min(roughness, response.roughness);
    material.roughness = roughness + (wetRoughness - roughness) * this.wetness;
    material.normalScale.copy(normalScale).multiplyScalar(1 + (response.normal - 1) * this.wetness);
  }

  update(dt, weather = {}) {
    if (this.disposed) return;
    const previous = this.wetness;
    this.wetness = approachWetness(previous, weather.wet, dt);
    if (previous === this.wetness) return;
    for (const record of this.records.values()) this.apply(record);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const {material, roughness, normalScale, release} of this.records.values()) {
      material.roughness = roughness; material.normalScale.copy(normalScale);
      material.removeEventListener('dispose', release);
    }
    this.records.clear();
  }
}

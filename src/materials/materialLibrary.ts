import * as THREE from 'three';
import type { MaterialKey } from './materialKeys';
import { createSlateTextures, type SlateTextures } from './slateTexture';
import { createWoodTextures, type WoodTextures } from './woodTexture';

/**
 * Timber is never perfectly uniform: each batten picks one of these shades, which is
 * what makes a wall read as a set of battens rather than as a flat panel.
 */
const VARIANT_SHADES = [1, 0.935, 1.055, 0.885, 1.02, 0.965];
const VARIED_KEYS: MaterialKey[] = ['pineExterior', 'pineInterior', 'structureWood'];

/**
 * Simple, dependency free materials. No external texture is used in this version:
 * every material is a flat colour so it can be swapped for a textured one later
 * without touching any component.
 *
 * DoubleSide is used throughout so that the section mode shows solid cuts
 * instead of see-through shells.
 */
function standard(color: number, options: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, ...options });
}

export class MaterialLibrary {
  private readonly materials: Record<MaterialKey, THREE.Material>;
  private readonly variants = new Map<MaterialKey, THREE.Material[]>();
  private readonly slate: SlateTextures;
  private readonly wood: WoodTextures;

  constructor() {
    this.slate = createSlateTextures();
    this.wood = createWoodTextures();
    const grain = (normalScale: number): THREE.MeshStandardMaterialParameters => ({
      map: this.wood.map,
      normalMap: this.wood.normalMap,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughnessMap: this.wood.roughnessMap
    });
    this.materials = {
      pineExterior: standard(0xd8ad74, { roughness: 0.82, metalness: 0.02, ...grain(0.7) }),
      pineInterior: standard(0xefcd98, { roughness: 0.7, metalness: 0.0, ...grain(0.5) }),
      structureWood: standard(0xc0965d, { roughness: 0.88, metalness: 0.0, ...grain(0.8) }),
      slate: standard(0xffffff, {
        roughness: 0.62,
        metalness: 0.06,
        map: this.slate.map,
        normalMap: this.slate.normalMap,
        normalScale: new THREE.Vector2(1.1, 1.1)
      }),
      glass: standard(0x9fd2de, {
        roughness: 0.05,
        metalness: 0.0,
        transparent: true,
        opacity: 0.26,
        envMapIntensity: 1.2
      }),
      // RAL 7016 anthracite grey, used for every aluminium joinery profile.
      aluminiumAnthracite: standard(0x383e42, { roughness: 0.45, metalness: 0.75 }),
      stoveMetal: standard(0x44494f, { roughness: 0.38, metalness: 0.85 }),
      stoveStones: standard(0x6d6963, { roughness: 0.95, metalness: 0.0, flatShading: true }),
      insulation: standard(0xf0c96b, { roughness: 0.95, transparent: true, opacity: 0.6 }),
      vaporBarrier: standard(0x8fb3cc, { roughness: 0.4, transparent: true, opacity: 0.5 }),
      // The terrain is shaded by vertex colours: lawn near the sauna, dry scrub on
      // the slope, haze in the distance. White base so the colours come through.
      terrain: standard(0xffffff, { roughness: 1.0, vertexColors: true, side: THREE.FrontSide }),
      paving: standard(0xbdb2a1, { roughness: 0.92 }),
      coping: standard(0xcdc4b3, { roughness: 0.85 }),
      poolWater: standard(0x12a4bb, {
        roughness: 0.06,
        metalness: 0.0,
        transparent: true,
        opacity: 0.78
      }),
      poolPlaster: standard(0x9fdde4, { roughness: 0.7 }),
      foliage: standard(0x4a6b36, { roughness: 0.95, flatShading: true }),
      foliageDry: standard(0x5c6b45, { roughness: 0.95, flatShading: true }),
      trunk: standard(0x5b4735, { roughness: 0.95 }),
      sunMarker: new THREE.MeshBasicMaterial({ color: 0xffd98a })
    };

    this.buildVariants();
  }

  /** `variant` picks a shade for materials that have them, and is ignored for the others. */
  get(key: MaterialKey, variant?: number): THREE.Material {
    if (variant === undefined) {
      return this.materials[key];
    }
    const shades = this.variants.get(key);
    if (!shades) {
      return this.materials[key];
    }
    return shades[Math.abs(Math.trunc(variant)) % shades.length];
  }

  /** Scales the slate texture so the courses keep their real size on any roof. */
  setSlateScale(widthMm: number, slopeLengthMm: number): void {
    const { width, height } = this.slate.patchSize;
    for (const texture of [this.slate.map, this.slate.normalMap]) {
      texture.repeat.set(widthMm / width, slopeLengthMm / height);
      texture.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
    for (const shades of this.variants.values()) {
      for (const material of shades) {
        material.dispose();
      }
    }
    this.slate.map.dispose();
    this.slate.normalMap.dispose();
    this.wood.map.dispose();
    this.wood.normalMap.dispose();
    this.wood.roughnessMap.dispose();
  }

  private buildVariants(): void {
    for (const key of VARIED_KEYS) {
      const base = this.materials[key] as THREE.MeshStandardMaterial;
      this.variants.set(
        key,
        VARIANT_SHADES.map((shade) => {
          const material = base.clone();
          material.color.multiplyScalar(shade);
          return material;
        })
      );
    }
  }
}

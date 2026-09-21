import * as THREE from 'three';
import type { MaterialKey } from './materialKeys';

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

  constructor() {
    this.materials = {
      pineExterior: standard(0xc9a06a, { roughness: 0.78, metalness: 0.02 }),
      pineInterior: standard(0xe3c18d, { roughness: 0.65, metalness: 0.0 }),
      structureWood: standard(0xb08a55, { roughness: 0.85, metalness: 0.0 }),
      slate: standard(0x3a4148, { roughness: 0.45, metalness: 0.12 }),
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
  }

  get(key: MaterialKey): THREE.Material {
    return this.materials[key];
  }

  dispose(): void {
    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
  }
}

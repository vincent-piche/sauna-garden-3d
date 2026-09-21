import * as THREE from 'three';
import type { SaunaGeometry } from '../config/derivedGeometry';
import type { SaunaConfig } from '../config/saunaConfig';
import { mm } from '../config/units';
import type { MaterialLibrary } from '../materials/materialLibrary';

export interface WoodPartRecord {
  name: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  quantity: number;
}

/**
 * Shared state for one build pass: geometry cache and timber registry.
 * A new context is created on every rebuild, and disposing it releases
 * every buffer geometry that the previous model allocated.
 */
export class BuildContext {
  private readonly geometries = new Map<string, THREE.BoxGeometry>();
  readonly woodParts = new Map<string, WoodPartRecord>();

  constructor(
    readonly geometry: SaunaGeometry,
    readonly materials: MaterialLibrary
  ) {}

  get config(): SaunaConfig {
    return this.geometry.config;
  }

  /** Box geometry from millimetre dimensions, cached so repeated boards share one buffer. */
  box(xMm: number, yMm: number, zMm: number): THREE.BoxGeometry {
    const key = `${xMm.toFixed(2)}|${yMm.toFixed(2)}|${zMm.toFixed(2)}`;
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(mm(xMm), mm(yMm), mm(zMm));
      this.geometries.set(key, geometry);
    }
    return geometry;
  }

  recordWood(name: string, lengthMm: number, widthMm: number, thicknessMm: number, quantity = 1): void {
    // Cut lengths are rounded up to the next 10 mm, which is how a cut list is read on site.
    const roundedLength = Math.ceil(lengthMm / 10) * 10;
    const key = `${name}|${Math.round(widthMm)}|${Math.round(thicknessMm)}|${roundedLength}`;
    const existing = this.woodParts.get(key);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    this.woodParts.set(key, {
      name,
      lengthMm: roundedLength,
      widthMm: Math.round(widthMm),
      thicknessMm: Math.round(thicknessMm),
      quantity
    });
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }
    this.geometries.clear();
    this.woodParts.clear();
  }
}

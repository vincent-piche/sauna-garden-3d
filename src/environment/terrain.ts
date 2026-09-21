import * as THREE from 'three';
import { mm } from '../config/units';

export interface TerrainShape {
  /** Model Z where the garden stops being flat and starts falling towards the valley. */
  crestZ: number;
  /** Initial gradient of the slope, as a ratio. */
  slope: number;
  /** Total drop the slope converges to, so the valley floor levels out. */
  valleyDrop: number;
  ridgeDistance: number;
  ridgeHeight: number;
  /** Level of the flat garden. */
  groundLevel: number;
}

export interface Footprint {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

const HALF_SIZE = 350000; // mm, far enough to disappear into the haze
const STEPS_PER_SIDE = 80;
const CELL_GROWTH = 1.04;
const CREST_SOFTENING = 4000;

const LAWN = new THREE.Color(0x6f8f46);
const SCRUB = new THREE.Color(0x8d8757);
const HAZE = new THREE.Color(0x93a6ab);

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Smooth approximation of max(0, value), used to round off the crest. */
function softPlus(value: number, softness: number): number {
  const ratio = value / softness;
  return ratio > 30 ? value : softness * Math.log1p(Math.exp(ratio));
}

/**
 * Height of the ground, relative to the garden level.
 *
 * Flat in front of the crest, then an exponential fall that converges to `valleyDrop`,
 * and two distant ridges rising back up to close the view — the horizon line of the
 * photograph. A light undulation keeps the middle ground from looking like a ramp.
 */
export function terrainHeight(x: number, z: number, shape: TerrainShape): number {
  const behind = softPlus(shape.crestZ - z, CREST_SOFTENING);
  const descent = -shape.valleyDrop * (1 - Math.exp((-behind * shape.slope) / shape.valleyDrop));

  // Two ridges rise back out of the valley floor. They are kept narrow and far
  // enough out that they do not fill in the slope itself.
  const farRidge =
    shape.ridgeHeight *
    Math.exp(-(((behind - shape.ridgeDistance) / (shape.ridgeDistance * 0.3)) ** 2)) *
    (0.72 + 0.28 * Math.sin(x / 70000 + 1.3));

  const nearRidge =
    shape.ridgeHeight *
    0.28 *
    Math.exp(-(((behind - shape.ridgeDistance * 0.6) / (shape.ridgeDistance * 0.18)) ** 2)) *
    (0.7 + 0.3 * Math.cos(x / 48000 - 0.6));

  const undulation =
    1400 * Math.sin(x / 24000) * Math.cos(behind / 31000) * smoothstep(0, 14000, behind);

  return descent + farRidge + nearRidge + undulation;
}

/** Grid coordinates whose spacing grows geometrically away from the origin. */
function graduatedCoordinates(): number[] {
  const deltas: number[] = [];
  let delta = 1;
  for (let step = 0; step < STEPS_PER_SIDE; step += 1) {
    deltas.push(delta);
    delta *= CELL_GROWTH;
  }
  const scale = HALF_SIZE / deltas.reduce((total, value) => total + value, 0);

  const positive = [0];
  let accumulated = 0;
  for (const value of deltas) {
    accumulated += value * scale;
    positive.push(accumulated);
  }
  return [...positive.slice(1).map((value) => -value).reverse(), ...positive];
}

function insideFootprint(x: number, z: number, footprint: Footprint): boolean {
  return x >= footprint.xMin && x <= footprint.xMax && z >= footprint.zMin && z <= footprint.zMax;
}

/**
 * Ground mesh. Resolution is concentrated around the sauna — roughly 70 cm cells
 * near the building, growing to about 15 m at the horizon — so a single continuous
 * mesh covers both the garden and the valley without any visible seam.
 *
 * Quads entirely inside `footprint` are dropped, which opens the hole the paved
 * terrace and the pool basin sit in.
 */
export function buildTerrain(shape: TerrainShape, footprint: Footprint | null): THREE.BufferGeometry {
  const coordinates = graduatedCoordinates();
  const size = coordinates.length;

  const positions = new Float32Array(size * size * 3);
  const colors = new Float32Array(size * size * 3);
  const color = new THREE.Color();

  for (let row = 0; row < size; row += 1) {
    const z = coordinates[row];
    for (let column = 0; column < size; column += 1) {
      const x = coordinates[column];
      const index = (row * size + column) * 3;
      const height = shape.groundLevel + terrainHeight(x, z, shape);

      positions[index] = mm(x);
      positions[index + 1] = mm(height);
      positions[index + 2] = mm(z);

      const distance = Math.hypot(x, z);
      color.copy(SCRUB).lerp(LAWN, 1 - smoothstep(7000, 22000, distance));
      color.lerp(HAZE, smoothstep(90000, 330000, distance));
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < size - 1; row += 1) {
    for (let column = 0; column < size - 1; column += 1) {
      if (footprint) {
        const covered =
          insideFootprint(coordinates[column], coordinates[row], footprint) &&
          insideFootprint(coordinates[column + 1], coordinates[row], footprint) &&
          insideFootprint(coordinates[column], coordinates[row + 1], footprint) &&
          insideFootprint(coordinates[column + 1], coordinates[row + 1], footprint);
        if (covered) {
          continue;
        }
      }
      const topLeft = row * size + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + size;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

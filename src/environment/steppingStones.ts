import * as THREE from 'three';
import { mm } from '../config/units';
import type { MaterialLibrary } from '../materials/materialLibrary';
import { layFlat, roundedRect } from './shapes';

export interface SteppingStonePath {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  count: number;
  /** Ground height at a point, so each stone beds into the terrain it stands on. */
  groundAt: (x: number, z: number) => number;
}

const STONE_LENGTH = 480;
const STONE_WIDTH = 360;
const STONE_THICKNESS = 70;
/** Stones sit slightly proud of the lawn, like a paver bedded in the turf. */
const STONE_LIFT = 25;
/** Sideways stagger, as a fraction of a stone's width, so the path reads as a stride
 * rather than a ruled line. */
const STAGGER = 0.55;

function hash(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * A few flat pavers crossing the lawn between the platform step and the pool terrace —
 * a "pas japonais" path rather than a paved strip, staggered and irregular in size so
 * it reads as stepping stones and not as a row of identical tiles.
 */
export function buildSteppingStones(
  path: SteppingStonePath,
  materials: MaterialLibrary,
  collect: (geometry: THREE.BufferGeometry) => void
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Pas japonais';

  const dx = path.toX - path.fromX;
  const dz = path.toZ - path.fromZ;
  const length = Math.hypot(dx, dz);
  if (length === 0 || path.count <= 0) {
    return group;
  }
  const dirX = dx / length;
  const dirZ = dz / length;
  const perpX = -dirZ;
  const perpZ = dirX;

  for (let index = 0; index < path.count; index += 1) {
    // Kept off the very ends: the first and last stride still belong to the step and
    // to the terrace, not to the path between them.
    const t = (index + 1) / (path.count + 1);
    const side = index % 2 === 0 ? 1 : -1;
    const seed = index * 37.13;
    const jitter = (hash(seed) - 0.5) * 0.6;
    const offset = STONE_WIDTH * (STAGGER * side + jitter);
    const centerX = path.fromX + dx * t + perpX * offset;
    const centerZ = path.fromZ + dz * t + perpZ * offset;

    const scale = 0.85 + hash(seed + 11) * 0.3;
    const shape = roundedRect(0, 0, STONE_LENGTH * scale, STONE_WIDTH * scale, STONE_WIDTH * 0.45 * scale);
    const geometry = layFlat(new THREE.ExtrudeGeometry(shape, { depth: STONE_THICKNESS, bevelEnabled: false }));
    collect(geometry);

    const mesh = new THREE.Mesh(geometry, materials.get('stoveStones'));
    mesh.position.set(mm(centerX), mm(path.groundAt(centerX, centerZ) + STONE_LIFT), mm(centerZ));
    mesh.rotation.y = (hash(seed + 23) - 0.5) * 0.9;
    mesh.name = `Pas japonais ${index + 1}`;
    mesh.userData.tag = 'site';
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

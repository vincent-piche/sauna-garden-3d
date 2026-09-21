import * as THREE from 'three';
import { mm } from '../config/units';
import type { MaterialKey } from '../materials/materialKeys';
import type { MaterialLibrary } from '../materials/materialLibrary';

export type TreeKind = 'columnar' | 'spreading' | 'round';

export interface TreeSpec {
  kind: TreeKind;
  x: number;
  z: number;
  /** Total height, in millimetres. */
  height: number;
  /** Canopy radius, in millimetres. */
  radius: number;
  /** Ground level under the tree. */
  groundY: number;
  foliage?: MaterialKey;
  /** Irregular foliage volumes rather than a single cheap shape. */
  detailed?: boolean;
}

const TRUNK_SIDES = 6;

/**
 * Deterministic value in [0, 1] from a point and a seed. Feeding it the vertex position
 * means two vertices that share a position are displaced identically, so the foliage
 * volumes never crack open along their seams.
 */
function hash(x: number, y: number, z: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.13) * 43758.5453;
  return value - Math.floor(value);
}

/** Pushes every vertex along its own radius, turning a sphere into a foliage clump. */
function roughen(geometry: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const noise = hash(vertex.x, vertex.y, vertex.z, seed);
    vertex.multiplyScalar(1 + (noise - 0.5) * amount);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

interface Clump {
  /** Centre, in millimetres, relative to the foot of the tree. */
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Vertical squash: below 1 the clump is flattened. */
  squash: number;
}

function columnarClumps(height: number, radius: number, count: number): Clump[] {
  const clumps: Clump[] = [];
  const base = height * 0.12;
  const span = height - base;
  for (let index = 0; index < count; index += 1) {
    const ratio = index / Math.max(1, count - 1);
    // Widest a third of the way up, tapering to a point: the shape of a cypress.
    const taper = Math.sin((0.25 + ratio * 0.72) * Math.PI) ** 0.6;
    clumps.push({
      x: radius * 0.22 * Math.sin(index * 2.4),
      y: base + span * (0.08 + ratio * 0.86),
      z: radius * 0.22 * Math.cos(index * 1.7),
      radius: radius * (0.55 + 0.75 * taper),
      squash: 1.45
    });
  }
  return clumps;
}

function spreadingClumps(height: number, radius: number, count: number): Clump[] {
  const clumps: Clump[] = [];
  const base = height * 0.42;
  const span = height - base;
  for (let index = 0; index < count; index += 1) {
    const ratio = index / Math.max(1, count - 1);
    const angle = index * 2.399; // golden angle, so the clumps never line up
    const reach = radius * (0.72 - 0.55 * ratio);
    clumps.push({
      x: Math.cos(angle) * reach,
      y: base + span * (0.15 + ratio * 0.78),
      z: Math.sin(angle) * reach,
      radius: radius * (0.62 - 0.26 * ratio),
      squash: 0.55
    });
  }
  return clumps;
}

function roundClumps(height: number, radius: number, count: number): Clump[] {
  const clumps: Clump[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399;
    clumps.push({
      x: Math.cos(angle) * radius * 0.3,
      y: height * (0.42 + 0.22 * (index % 2)),
      z: Math.sin(angle) * radius * 0.3,
      radius: radius * (0.82 - 0.12 * (index % 3)),
      squash: 0.8
    });
  }
  return clumps;
}

/**
 * Trees are overlapping clumps of displaced foliage on a trunk. They are still coarse —
 * they exist to cast a believable shadow and give the scene a scale, not to look like a
 * species — but a cluster of irregular volumes reads as a canopy where a smooth cone
 * only ever read as a cone.
 */
export function buildTree(
  spec: TreeSpec,
  materials: MaterialLibrary,
  collect: (geometry: THREE.BufferGeometry) => void
): THREE.Group {
  const detailed = spec.detailed !== false;
  const detail = detailed ? 2 : 0;
  const group = new THREE.Group();
  group.position.set(mm(spec.x), mm(spec.groundY), mm(spec.z));
  group.name = `Arbre ${spec.kind}`;

  const foliageKey = spec.foliage ?? 'foliage';
  const seed = Math.abs(spec.x * 0.013 + spec.z * 0.029 + spec.height * 0.0007);

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]): void => {
    collect(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(mm(position[0]), mm(position[1]), mm(position[2]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.tag = 'site';
    group.add(mesh);
  };

  const counts: Record<TreeKind, number> = {
    columnar: detailed ? 6 : 3,
    spreading: detailed ? 7 : 3,
    round: detailed ? 3 : 1
  };
  const clumps =
    spec.kind === 'columnar'
      ? columnarClumps(spec.height, spec.radius, counts.columnar)
      : spec.kind === 'spreading'
        ? spreadingClumps(spec.height, spec.radius, counts.spreading)
        : roundClumps(spec.height, spec.radius, counts.round);

  if (spec.kind !== 'round') {
    const trunkHeight = spec.kind === 'columnar' ? spec.height * 0.16 : spec.height * 0.5;
    const trunkRadius = spec.radius * (spec.kind === 'columnar' ? 0.1 : 0.09);
    add(
      new THREE.CylinderGeometry(mm(trunkRadius * 0.75), mm(trunkRadius), mm(trunkHeight), TRUNK_SIDES),
      materials.get('trunk'),
      [0, trunkHeight / 2, 0]
    );
  }

  for (const [index, clump] of clumps.entries()) {
    const geometry = roughen(
      new THREE.IcosahedronGeometry(mm(clump.radius), detail),
      detailed ? 0.34 : 0.18,
      seed + index * 7.77
    );
    geometry.scale(1, clump.squash, 1);
    add(geometry, materials.get(foliageKey, index + Math.round(seed)), [clump.x, clump.y, clump.z]);
  }

  return group;
}

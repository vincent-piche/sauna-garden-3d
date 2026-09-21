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
}

const TRUNK_SIDES = 6;
const CANOPY_SIDES = 9;
const SPREADING_LAYERS = 4;

/**
 * Trees are deliberately coarse volumes: a trunk and one to four cones or blobs.
 * They exist to cast believable shadows and to give the scene a scale, not to look
 * like a species. Height and position are what matters, and both are adjustable.
 */
export function buildTree(
  spec: TreeSpec,
  materials: MaterialLibrary,
  collect: (geometry: THREE.BufferGeometry) => void
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(mm(spec.x), mm(spec.groundY), mm(spec.z));
  group.name = `Arbre ${spec.kind}`;

  const foliage = materials.get(spec.foliage ?? 'foliage');
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number): void => {
    collect(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = mm(y);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.tag = 'site';
    group.add(mesh);
  };

  if (spec.kind === 'round') {
    const geometry = new THREE.IcosahedronGeometry(mm(spec.radius), 1);
    geometry.scale(1, spec.height / (2 * spec.radius), 1);
    add(geometry, foliage, spec.height / 2);
    return group;
  }

  const trunkHeight = spec.kind === 'columnar' ? spec.height * 0.12 : spec.height * 0.38;
  const trunkRadius = spec.radius * (spec.kind === 'columnar' ? 0.1 : 0.09);
  add(
    new THREE.CylinderGeometry(mm(trunkRadius * 0.8), mm(trunkRadius), mm(trunkHeight), TRUNK_SIDES),
    materials.get('trunk'),
    trunkHeight / 2
  );

  if (spec.kind === 'columnar') {
    const canopyHeight = spec.height - trunkHeight;
    add(
      new THREE.ConeGeometry(mm(spec.radius), mm(canopyHeight), CANOPY_SIDES),
      foliage,
      trunkHeight + canopyHeight / 2
    );
    return group;
  }

  // Spreading canopy: flattened tiers, widest at the bottom.
  const canopyBase = trunkHeight * 0.75;
  const canopyHeight = spec.height - canopyBase;
  for (let tier = 0; tier < SPREADING_LAYERS; tier += 1) {
    const ratio = tier / (SPREADING_LAYERS - 1);
    const tierRadius = spec.radius * (1 - 0.62 * ratio);
    const tierHeight = canopyHeight * (0.42 - 0.06 * ratio);
    const tierY = canopyBase + canopyHeight * (0.08 + 0.78 * ratio);
    add(new THREE.ConeGeometry(mm(tierRadius), mm(tierHeight), CANOPY_SIDES), foliage, tierY + tierHeight / 2);
  }
  return group;
}

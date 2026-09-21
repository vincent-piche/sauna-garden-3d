import * as THREE from 'three';
import { mm } from '../config/units';
import type { MaterialKey } from '../materials/materialKeys';
import type { BuildContext } from '../model/buildContext';
import type { LayerTag } from '../model/tags';

/**
 * A timber piece is modelled in its own local frame:
 *   local X = length, local Y = thickness, local Z = width.
 * A board therefore starts flat, and the orientations below rotate it into place.
 */
export const ORIENTATION = {
  /** Flat, running along X. */
  flatAlongX: [0, 0, 0],
  /** Flat, running along Z. */
  flatAlongZ: [0, Math.PI / 2, 0],
  /** On edge (width vertical), running along X. */
  onEdgeAlongX: [Math.PI / 2, 0, 0],
  /** On edge (width vertical), running along Z. */
  onEdgeAlongZ: [-Math.PI / 2, 0, -Math.PI / 2],
  /** Upright, thickness crossing a wall whose normal is Z, width along X. */
  uprightFacingZ: [0, Math.PI / 2, Math.PI / 2],
  /** Upright, thickness crossing a wall whose normal is X, width along Z. */
  uprightFacingX: [0, 0, Math.PI / 2]
} as const satisfies Record<string, readonly [number, number, number]>;

export type Orientation = (typeof ORIENTATION)[keyof typeof ORIENTATION];

export interface WoodPieceParams {
  /** Label used in the bill of materials. */
  name: string;
  length: number;
  width: number;
  thickness: number;
  /** Centre of the piece, in millimetres, in sauna coordinates. */
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  material?: MaterialKey;
  tag: LayerTag;
  /** Set to false for decorative pieces that should not appear in the nomenclature. */
  countInBom?: boolean;
}

/**
 * Single entry point for every timber element of the model.
 * Anything built with this function is automatically part of the bill of materials.
 */
export function createWoodPiece(params: WoodPieceParams, ctx: BuildContext): THREE.Mesh {
  const { name, length, width, thickness, position, rotation, tag } = params;
  const geometry = ctx.box(length, thickness, width);
  const material = ctx.materials.get(params.material ?? 'structureWood');
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(mm(position[0]), mm(position[1]), mm(position[2]));
  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  }
  mesh.name = name;
  mesh.userData.tag = tag;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (params.countInBom !== false) {
    ctx.recordWood(name, length, width, thickness);
  }
  return mesh;
}

export interface PanelParams {
  name: string;
  /** Axis aligned size in millimetres. */
  size: readonly [number, number, number];
  position: readonly [number, number, number];
  material: MaterialKey;
  tag: LayerTag;
}

/** Axis aligned box for the non timber layers (insulation, vapour barrier, glazing, slate). */
export function createPanel(params: PanelParams, ctx: BuildContext): THREE.Mesh {
  const geometry = ctx.box(params.size[0], params.size[1], params.size[2]);
  const mesh = new THREE.Mesh(geometry, ctx.materials.get(params.material));
  mesh.position.set(mm(params.position[0]), mm(params.position[1]), mm(params.position[2]));
  mesh.name = params.name;
  mesh.userData.tag = params.tag;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

import * as THREE from 'three';
import type { WallLayer } from '../config/derivedGeometry';
import type { BuildContext } from '../model/buildContext';
import { splitIntoStrips, subtractRects, type Rect } from './rectangles';
import { createPanel, createWoodPiece, ORIENTATION } from './woodPiece';

/**
 * Fractions of a millimetre added to the drawn thickness of a batten, cycling from one
 * board to the next. The piece stays centred on its layer, so it stands a few tenths of
 * a millimetre proud on both faces: enough for the joints between battens to catch the
 * light, on the inside as well as the outside. The ordered thickness is unchanged.
 */
const BATTEN_RELIEF = [0, 1.6, 0.6, 2, 1];

export interface WallDefinition {
  id: string;
  label: string;
  /** Axis the wall faces. 'z' for the facades, 'x' for the side walls. */
  normalAxis: 'x' | 'z';
  /** Signed coordinate of the outer face of the wall. */
  outerFace: number;
  /** Direction from the outer face towards the interior: +1 or -1. */
  inward: 1 | -1;
  /** Horizontal extent along the in-plane axis (X for facades, Z for side walls). */
  uStart: number;
  uEnd: number;
  /** Top of the wall at a given in-plane position, which follows the roof slope. */
  heightAt(u: number): number;
  /** Openings, expressed in the same (u, height) plane. */
  holes: readonly Rect[];
}

/**
 * Builds one wall as a stack of layers.
 * Every layer is split into vertical strips so that a sloping top and any number of
 * openings are handled by the same code path, whatever the construction mode.
 */
export function buildWall(def: WallDefinition, layers: readonly WallLayer[], ctx: BuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = def.id;

  for (const layer of layers) {
    const layerCenter = def.outerFace + def.inward * (layer.offset + layer.thickness / 2);
    const strips = splitIntoStrips(def.uStart, def.uEnd, layer.stripWidth);

    for (const [index, strip] of strips.entries()) {
      const stripMiddle = (strip.u0 + strip.u1) / 2;
      const fullStrip: Rect = { u0: strip.u0, u1: strip.u1, v0: 0, v1: def.heightAt(stripMiddle) };

      for (const piece of subtractRects(fullStrip, def.holes)) {
        const pieceWidth = piece.u1 - piece.u0;
        const pieceHeight = piece.v1 - piece.v0;
        const uCenter = (piece.u0 + piece.u1) / 2;
        const yCenter = (piece.v0 + piece.v1) / 2;
        const position: [number, number, number] =
          def.normalAxis === 'z' ? [uCenter, yCenter, layerCenter] : [layerCenter, yCenter, uCenter];

        if (layer.kind === 'boards') {
          group.add(
            createWoodPiece(
              {
                name: layer.label,
                length: pieceHeight,
                width: pieceWidth,
                thickness: layer.thickness,
                position,
                rotation: def.normalAxis === 'z' ? ORIENTATION.uprightFacingZ : ORIENTATION.uprightFacingX,
                material: layer.material,
                tag: layer.tag,
                renderThickness: layer.thickness + BATTEN_RELIEF[index % BATTEN_RELIEF.length],
                variant: index
              },
              ctx
            )
          );
        } else {
          const size: [number, number, number] =
            def.normalAxis === 'z'
              ? [pieceWidth, pieceHeight, layer.thickness]
              : [layer.thickness, pieceHeight, pieceWidth];
          group.add(createPanel({ name: layer.label, size, position, material: layer.material, tag: layer.tag }, ctx));
        }
      }
    }
  }

  return group;
}

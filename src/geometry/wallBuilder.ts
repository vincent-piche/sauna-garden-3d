import * as THREE from 'three';
import type { WallLayer } from '../config/derivedGeometry';
import type { BuildContext } from '../model/buildContext';
import { stackCourses, subtractRects, type Rect } from './rectangles';
import { createPanel, createWoodPiece, ORIENTATION } from './woodPiece';

/**
 * Fractions of a millimetre added to the drawn thickness of a batten, cycling from one
 * course to the next. The piece stays centred on its layer, so it stands a few tenths of
 * a millimetre proud on both faces: enough for the joints between battens to catch the
 * light, on the inside as well as the outside. The ordered thickness is unchanged.
 */
const BATTEN_RELIEF = [0, 1.6, 0.6, 2, 1];

const CROSSING_ITERATIONS = 40;

export interface WallDefinition {
  id: string;
  label: string;
  /** Axis the wall faces. 'z' for the facades, 'x' for the side walls. */
  normalAxis: 'x' | 'z';
  /** Signed coordinate of the outer face of the wall. */
  outerFace: number;
  /** Direction from the outer face towards the interior: +1 or -1. */
  inward: 1 | -1;
  /** Horizontal extent along the in-plane axis (X for the facades, Z for the side walls). */
  uStart: number;
  uEnd: number;
  /** Top of the wall at a given in-plane position, which follows the roof slope. */
  heightAt(u: number): number;
  /** Openings, expressed in the same (u, height) plane. */
  holes: readonly Rect[];
}

/**
 * Horizontal extent over which the wall still reaches a given height.
 *
 * Under a mono-pitch roof the top of a side wall is a rake, so the upper courses stop
 * part of the way along. The crossing point is found by bisection, which works for any
 * monotonic roof line rather than assuming a straight one.
 */
function spanUnderRoof(def: WallDefinition, level: number): { u0: number; u1: number } | null {
  const startReaches = def.heightAt(def.uStart) >= level;
  const endReaches = def.heightAt(def.uEnd) >= level;

  if (startReaches && endReaches) {
    return { u0: def.uStart, u1: def.uEnd };
  }
  if (!startReaches && !endReaches) {
    return null;
  }

  let inside = def.uStart;
  let outside = def.uEnd;
  for (let step = 0; step < CROSSING_ITERATIONS; step += 1) {
    const middle = (inside + outside) / 2;
    if ((def.heightAt(middle) >= level) === startReaches) {
      inside = middle;
    } else {
      outside = middle;
    }
  }
  const crossing = (inside + outside) / 2;
  return startReaches ? { u0: def.uStart, u1: crossing } : { u0: crossing, u1: def.uEnd };
}

/**
 * Builds one wall as a stack of layers.
 *
 * Every layer is laid as **horizontal courses**, the way the battens are actually fixed.
 * A course is clipped to the part of the wall that reaches its mid height, which lets the
 * rake of a side wall step across the courses; the step is at most half a course and sits
 * under the roof overhang. Openings are then subtracted from each course, so a course
 * crossing the door simply comes out as two pieces.
 */
export function buildWall(def: WallDefinition, layers: readonly WallLayer[], ctx: BuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = def.id;

  const wallHeight = Math.max(def.heightAt(def.uStart), def.heightAt(def.uEnd));

  for (const layer of layers) {
    const layerCenter = def.outerFace + def.inward * (layer.offset + layer.thickness / 2);
    const courses = stackCourses(wallHeight, layer.stripWidth);

    for (const [index, course] of courses.entries()) {
      const span = spanUnderRoof(def, (course.u0 + course.u1) / 2);
      if (!span) {
        continue;
      }
      const full: Rect = { u0: span.u0, u1: span.u1, v0: course.u0, v1: course.u1 };

      for (const piece of subtractRects(full, def.holes)) {
        const pieceLength = piece.u1 - piece.u0;
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
                length: pieceLength,
                width: pieceHeight,
                thickness: layer.thickness,
                position,
                rotation: def.normalAxis === 'z' ? ORIENTATION.onEdgeAlongX : ORIENTATION.onEdgeAlongZ,
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
              ? [pieceLength, pieceHeight, layer.thickness]
              : [layer.thickness, pieceHeight, pieceLength];
          group.add(createPanel({ name: layer.label, size, position, material: layer.material, tag: layer.tag }, ctx));
        }
      }
    }
  }

  return group;
}

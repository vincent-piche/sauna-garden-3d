import * as THREE from 'three';
import { createPanel } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

const BODY_HEIGHT_RATIO = 0.82;
const BASE_PLATE_HEIGHT = 20;
const BASE_PLATE_MARGIN = 30;
const STONES_PER_ROW = 3;

/**
 * Electric stove, placed by default in the rear right corner seen from the entrance.
 * The whole object is positioned from `geometry.stove`, so moving it later only means
 * changing that placement: no other component depends on where it sits.
 *
 * Dimensions scale mildly with the declared power; they are indicative only and do not
 * represent a validated appliance, nor validated clearances.
 */
export function createSaunaStove(ctx: BuildContext): THREE.Group {
  const stove = ctx.geometry.stove;
  const group = new THREE.Group();
  group.name = 'SaunaStove';

  const bodyHeight = stove.height * BODY_HEIGHT_RATIO;

  group.add(
    createPanel(
      {
        name: 'Poêle – socle',
        size: [stove.width + BASE_PLATE_MARGIN * 2, BASE_PLATE_HEIGHT, stove.depth + BASE_PLATE_MARGIN * 2],
        position: [stove.centerX, BASE_PLATE_HEIGHT / 2, stove.centerZ],
        material: 'stoveMetal',
        tag: 'stove'
      },
      ctx
    )
  );

  group.add(
    createPanel(
      {
        name: 'Poêle – corps',
        size: [stove.width, bodyHeight, stove.depth],
        position: [stove.centerX, BASE_PLATE_HEIGHT + bodyHeight / 2, stove.centerZ],
        material: 'stoveMetal',
        tag: 'stove'
      },
      ctx
    )
  );

  // Stone bed on top, laid out on a deterministic grid so rebuilds stay stable.
  const stoneSize = Math.min(stove.width, stove.depth) / (STONES_PER_ROW + 0.6);
  const stoneY = BASE_PLATE_HEIGHT + bodyHeight + stoneSize * 0.35;
  for (let row = 0; row < STONES_PER_ROW; row += 1) {
    for (let column = 0; column < STONES_PER_ROW; column += 1) {
      const jitter = ((row * STONES_PER_ROW + column) % 3) - 1;
      const scale = 0.8 + ((row + column) % 3) * 0.12;
      group.add(
        createPanel(
          {
            name: 'Poêle – pierres',
            size: [stoneSize * scale, stoneSize * 0.7, stoneSize * scale],
            position: [
              stove.centerX + (column - (STONES_PER_ROW - 1) / 2) * stoneSize * 1.05 + jitter * stoneSize * 0.06,
              stoneY + (jitter === 0 ? stoneSize * 0.12 : 0),
              stove.centerZ + (row - (STONES_PER_ROW - 1) / 2) * stoneSize * 1.05
            ],
            material: 'stoveStones',
            tag: 'stove'
          },
          ctx
        )
      );
    }
  }

  return group;
}

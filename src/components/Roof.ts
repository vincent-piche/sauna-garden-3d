import * as THREE from 'three';
import { mm } from '../config/units';
import { evenPositions } from '../geometry/layout';
import { splitIntoStrips } from '../geometry/rectangles';
import { createPanel, createWoodPiece, ORIENTATION } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

/**
 * Mono-pitch roof, high on the front facade and low on the rear one.
 * The whole roof is built in a tilted group, so every piece inside it can be
 * positioned in a simple flat coordinate system:
 *   local X = across the sauna, local Z = up the slope, local Y = normal to the roof,
 *   local Y = 0 being the underside, i.e. exactly the top of the walls.
 */
export function createRoof(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const config = ctx.config;

  const group = new THREE.Group();
  group.name = 'Roof';
  group.position.set(0, mm((geometry.frontWallHeight + geometry.rearWallHeight) / 2), 0);
  group.rotation.x = -geometry.roofSlopeRad;

  const totalWidth = geometry.width + 2 * config.roofOverhang;
  const slopeLength = (geometry.depth + 2 * config.roofOverhang) / Math.cos(geometry.roofSlopeRad);
  const halfSlope = slopeLength / 2;

  const rafterPositions = evenPositions(
    -totalWidth / 2 + config.standardWoodThickness / 2,
    totalWidth / 2 - config.standardWoodThickness / 2,
    config.rafterSpacing
  );
  for (const x of rafterPositions) {
    group.add(
      createWoodPiece(
        {
          name: 'Toiture – chevron',
          length: slopeLength,
          width: config.roofRafterHeight,
          thickness: config.standardWoodThickness,
          position: [x, config.roofRafterHeight / 2, 0],
          rotation: ORIENTATION.onEdgeAlongZ,
          material: 'structureWood',
          tag: 'roofStructure'
        },
        ctx
      )
    );
  }

  const deckY = config.roofRafterHeight + config.roofDeckThickness / 2;
  for (const strip of splitIntoStrips(-halfSlope, halfSlope, config.standardWoodWidth)) {
    group.add(
      createWoodPiece(
        {
          name: 'Toiture – volige',
          length: totalWidth,
          width: strip.u1 - strip.u0,
          thickness: config.roofDeckThickness,
          position: [0, deckY, (strip.u0 + strip.u1) / 2],
          rotation: ORIENTATION.flatAlongX,
          material: 'structureWood',
          tag: 'roofStructure'
        },
        ctx
      )
    );
  }

  group.add(
    createPanel(
      {
        name: 'Toiture – ardoises',
        size: [totalWidth, config.slateThickness, slopeLength],
        position: [
          0,
          config.roofRafterHeight + config.roofDeckThickness + config.slateThickness / 2,
          0
        ],
        material: 'slate',
        tag: 'roofCover'
      },
      ctx
    )
  );

  return group;
}

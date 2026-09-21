import * as THREE from 'three';
import type { BenchPlacement } from '../config/derivedGeometry';
import type { BuildContext } from '../model/buildContext';
import { distributedCenters, evenPositions } from './layout';
import { createWoodPiece, ORIENTATION } from './woodPiece';

const MAX_LEG_SPACING = 900;
const RAIL_INSET = 60;

/**
 * Slatted bench running along Z: two rails carried by pairs of legs, slats laid across.
 * Everything is cut from the standard timber module.
 */
export function buildBench(label: string, placement: BenchPlacement, ctx: BuildContext): THREE.Group {
  const config = ctx.config;
  const group = new THREE.Group();

  const slatThickness = config.standardWoodThickness;
  const railWidth = config.standardWoodWidth;
  const railY = placement.height - slatThickness - railWidth / 2;
  const legHeight = placement.height - slatThickness - railWidth;

  const zStart = placement.centerZ - placement.length / 2;
  const zEnd = placement.centerZ + placement.length / 2;
  const railX = [
    placement.centerX - placement.depth / 2 + RAIL_INSET,
    placement.centerX + placement.depth / 2 - RAIL_INSET
  ];

  for (const x of railX) {
    group.add(
      createWoodPiece(
        {
          name: `${label} – longeron`,
          length: placement.length,
          width: railWidth,
          thickness: config.standardWoodThickness,
          position: [x, railY, placement.centerZ],
          rotation: ORIENTATION.onEdgeAlongZ,
          material: 'pineInterior',
          tag: 'furniture'
        },
        ctx
      )
    );
  }

  if (legHeight > 0) {
    const legRows = evenPositions(
      zStart + config.standardWoodWidth / 2,
      zEnd - config.standardWoodWidth / 2,
      MAX_LEG_SPACING
    );
    for (const z of legRows) {
      for (const x of railX) {
        group.add(
          createWoodPiece(
            {
              name: `${label} – pied`,
              length: legHeight,
              width: config.standardWoodWidth,
              thickness: config.standardWoodThickness,
              position: [x, legHeight / 2, z],
              rotation: ORIENTATION.uprightFacingX,
              material: 'pineInterior',
              tag: 'furniture'
            },
            ctx
          )
        );
      }
    }
  }

  const slatZ = distributedCenters(zStart, zEnd, config.standardWoodWidth, config.benchSlatGap);
  for (const z of slatZ) {
    group.add(
      createWoodPiece(
        {
          name: `${label} – latte`,
          length: placement.depth,
          width: config.standardWoodWidth,
          thickness: slatThickness,
          position: [placement.centerX, placement.height - slatThickness / 2, z],
          rotation: ORIENTATION.flatAlongX,
          material: 'pineInterior',
          tag: 'furniture'
        },
        ctx
      )
    );
  }

  return group;
}

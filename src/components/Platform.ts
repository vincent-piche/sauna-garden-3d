import * as THREE from 'three';
import { evenPositions } from '../geometry/layout';
import { splitIntoStrips } from '../geometry/rectangles';
import { createWoodPiece, ORIENTATION } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

/**
 * Timber platform the sauna sits on.
 * It is wider and deeper than the sauna: the surplus depth is entirely in front of the
 * door and acts as a step, the surplus width is split evenly on both sides.
 *
 * Deck boards run across the platform (along X), joists run front to back (along Z)
 * underneath them. No footing, no post and no ground anchoring is modelled.
 */
export function createPlatform(ctx: BuildContext): THREE.Group {
  const config = ctx.config;
  const platform = ctx.geometry.platform;
  const group = new THREE.Group();
  group.name = 'Platform';

  const deckTop = platform.topY;
  const deckThickness = config.floorBoardThickness;
  const joistHeight = platform.height - deckThickness;
  const joistCenterY = deckTop - deckThickness - joistHeight / 2;

  const xMin = platform.centerX - platform.width / 2;
  const xMax = platform.centerX + platform.width / 2;
  const zMin = platform.centerZ - platform.depth / 2;
  const zMax = platform.centerZ + platform.depth / 2;

  for (const [index, strip] of splitIntoStrips(zMin, zMax, config.standardWoodWidth).entries()) {
    group.add(
      createWoodPiece(
        {
          name: 'Plateforme – lame de terrasse',
          length: platform.width,
          width: strip.u1 - strip.u0,
          thickness: deckThickness,
          position: [platform.centerX, deckTop - deckThickness / 2, (strip.u0 + strip.u1) / 2],
          rotation: ORIENTATION.flatAlongX,
          material: 'pineExterior',
          tag: 'structure',
          variant: index
        },
        ctx
      )
    );
  }

  for (const x of evenPositions(
    xMin + config.standardWoodThickness / 2,
    xMax - config.standardWoodThickness / 2,
    config.joistSpacing
  )) {
    group.add(
      createWoodPiece(
        {
          name: 'Plateforme – solive',
          length: platform.depth,
          width: joistHeight,
          thickness: config.standardWoodThickness,
          position: [x, joistCenterY, platform.centerZ],
          rotation: ORIENTATION.onEdgeAlongZ,
          material: 'structureWood',
          tag: 'structure'
        },
        ctx
      )
    );
  }

  for (const z of [zMin + config.standardWoodThickness / 2, zMax - config.standardWoodThickness / 2]) {
    group.add(
      createWoodPiece(
        {
          name: 'Plateforme – traverse de rive',
          length: platform.width,
          width: joistHeight,
          thickness: config.standardWoodThickness,
          position: [platform.centerX, joistCenterY, z],
          rotation: ORIENTATION.onEdgeAlongX,
          material: 'structureWood',
          tag: 'structure'
        },
        ctx
      )
    );
  }

  return group;
}

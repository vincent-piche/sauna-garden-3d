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
 *
 * The roof is a full thickness insulated deck, not a hollow shell: a timber ceiling
 * closes the underside, the bays between the rafters are filled, and fascia boards close
 * the eaves. The rafters stay legible from below and are the only thing left in the
 * Structure view.
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

  const liningThickness = config.interiorLiningThickness;
  const rafterBase = liningThickness;
  const deckBase = rafterBase + config.roofRafterHeight;

  // Ceiling boards closing the underside of the roof.
  for (const [index, strip] of splitIntoStrips(-halfSlope, halfSlope, config.standardWoodWidth).entries()) {
    group.add(
      createWoodPiece(
        {
          name: 'Toiture – lambris de sous-face',
          length: totalWidth,
          width: strip.u1 - strip.u0,
          thickness: liningThickness,
          position: [0, liningThickness / 2, (strip.u0 + strip.u1) / 2],
          rotation: ORIENTATION.flatAlongX,
          material: 'pineInterior',
          tag: 'interiorLining',
          variant: index
        },
        ctx
      )
    );
  }

  const rafterPositions = evenPositions(
    -totalWidth / 2 + config.standardWoodThickness / 2,
    totalWidth / 2 - config.standardWoodThickness / 2,
    config.rafterSpacing
  );
  for (const [index, x] of rafterPositions.entries()) {
    group.add(
      createWoodPiece(
        {
          name: 'Toiture – chevron',
          length: slopeLength,
          width: config.roofRafterHeight,
          thickness: config.standardWoodThickness,
          position: [x, rafterBase + config.roofRafterHeight / 2, 0],
          rotation: ORIENTATION.onEdgeAlongZ,
          material: 'structureWood',
          tag: 'roofStructure',
          variant: index
        },
        ctx
      )
    );
  }

  // Insulation filling every bay between two rafters.
  for (let bay = 0; bay < rafterPositions.length - 1; bay += 1) {
    const width = rafterPositions[bay + 1] - rafterPositions[bay] - config.standardWoodThickness;
    if (width <= 1) {
      continue;
    }
    group.add(
      createPanel(
        {
          name: 'Toiture – isolation',
          size: [width, config.roofRafterHeight, slopeLength],
          position: [
            (rafterPositions[bay] + rafterPositions[bay + 1]) / 2,
            rafterBase + config.roofRafterHeight / 2,
            0
          ],
          material: 'insulation',
          tag: 'insulation'
        },
        ctx
      )
    );
  }

  // Fascia boards closing the bays at the top and the bottom of the slope.
  for (const side of [-1, 1] as const) {
    group.add(
      createWoodPiece(
        {
          name: 'Toiture – planche de rive',
          length: totalWidth,
          width: config.roofRafterHeight,
          thickness: config.standardWoodThickness,
          position: [
            0,
            rafterBase + config.roofRafterHeight / 2,
            side * (halfSlope - config.standardWoodThickness / 2)
          ],
          rotation: ORIENTATION.onEdgeAlongX,
          material: 'pineExterior',
          tag: 'roofStructure'
        },
        ctx
      )
    );
  }

  for (const [index, strip] of splitIntoStrips(-halfSlope, halfSlope, config.standardWoodWidth).entries()) {
    group.add(
      createWoodPiece(
        {
          name: 'Toiture – volige',
          length: totalWidth,
          width: strip.u1 - strip.u0,
          thickness: config.roofDeckThickness,
          position: [0, deckBase + config.roofDeckThickness / 2, (strip.u0 + strip.u1) / 2],
          rotation: ORIENTATION.flatAlongX,
          material: 'structureWood',
          tag: 'roofStructure',
          variant: index
        },
        ctx
      )
    );
  }

  // The slate is a texture, so its courses have to keep their real size on any roof.
  ctx.materials.setSlateScale(totalWidth, slopeLength);
  group.add(
    createPanel(
      {
        name: 'Toiture – ardoises',
        size: [totalWidth, config.slateThickness, slopeLength],
        position: [0, deckBase + config.roofDeckThickness + config.slateThickness / 2, 0],
        material: 'slate',
        tag: 'roofCover'
      },
      ctx
    )
  );

  return group;
}

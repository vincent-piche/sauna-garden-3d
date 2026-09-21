import * as THREE from 'three';
import { splitIntoStrips } from '../geometry/rectangles';
import { buildOpeningFrame } from '../geometry/openingFrame';
import { createPanel, createWoodPiece, ORIENTATION } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

const HANDLE_LENGTH = 140;
const HANDLE_SECTION = 30;

/** Ledged timber door on the front facade. Modelled closed. */
export function createDoor(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const config = ctx.config;
  const wallCenterZ = geometry.depth / 2 - geometry.wallThickness / 2;

  const group = new THREE.Group();
  group.name = 'Door';

  const frame = buildOpeningFrame(
    {
      name: 'Porte',
      centerX: geometry.door.center,
      width: geometry.door.width,
      sill: 0,
      height: geometry.door.height,
      wallCenterZ,
      wallThickness: geometry.wallThickness,
      includeSill: false
    },
    ctx
  );
  group.add(frame.group);

  const { clear } = frame;
  const leafBoards = splitIntoStrips(
    clear.centerX - clear.width / 2,
    clear.centerX + clear.width / 2,
    config.standardWoodWidth
  );

  for (const board of leafBoards) {
    group.add(
      createWoodPiece(
        {
          name: 'Porte – lame',
          length: clear.height,
          width: board.u1 - board.u0,
          thickness: config.standardWoodThickness,
          position: [(board.u0 + board.u1) / 2, clear.bottom + clear.height / 2, wallCenterZ],
          rotation: ORIENTATION.uprightFacingZ,
          material: 'pineInterior',
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  // Two ledges stiffen the leaf on the inside face.
  for (const ratio of [0.2, 0.8]) {
    group.add(
      createWoodPiece(
        {
          name: 'Porte – barre',
          length: clear.width,
          width: config.standardWoodWidth,
          thickness: config.standardWoodThickness,
          position: [
            clear.centerX,
            clear.bottom + clear.height * ratio,
            wallCenterZ - config.standardWoodThickness
          ],
          rotation: ORIENTATION.onEdgeAlongX,
          material: 'pineInterior',
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  group.add(
    createPanel(
      {
        name: 'Porte – poignée',
        size: [HANDLE_SECTION, HANDLE_LENGTH, HANDLE_SECTION],
        position: [
          clear.centerX + clear.width / 2 - 120,
          clear.bottom + clear.height * 0.5,
          wallCenterZ + config.standardWoodThickness
        ],
        material: 'stoveMetal',
        tag: 'joinery'
      },
      ctx
    )
  );

  return group;
}

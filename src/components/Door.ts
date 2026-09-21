import * as THREE from 'three';
import { buildOpeningFrame } from '../geometry/openingFrame';
import { createPanel } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

const HANDLE_LENGTH = 320;
const HANDLE_SECTION = 26;
const HANDLE_STANDOFF = 40;

/**
 * Fully glazed entrance door: clear glass in an anthracite grey aluminium sash,
 * set in an aluminium frame of the same colour. Modelled closed.
 */
export function createDoor(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const config = ctx.config;
  const wallCenterZ = geometry.depth / 2 - geometry.wallThickness / 2;
  const profile = config.frameProfileWidth;

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
      frameDepth: geometry.wallThickness,
      profile,
      material: 'aluminiumAnthracite',
      includeSill: false
    },
    ctx
  );
  group.add(frame.group);

  const { clear } = frame;
  const sashDepth = profile;
  const glassWidth = Math.max(0, clear.width - 2 * profile);
  const glassHeight = Math.max(0, clear.height - 2 * profile);

  // Sash: two stiles and two rails around the glass.
  for (const side of [-1, 1] as const) {
    group.add(
      createPanel(
        {
          name: 'Porte – montant de châssis',
          size: [profile, clear.height, sashDepth],
          position: [
            clear.centerX + side * (clear.width / 2 - profile / 2),
            clear.bottom + clear.height / 2,
            wallCenterZ
          ],
          material: 'aluminiumAnthracite',
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  for (const rail of [profile / 2, clear.height - profile / 2]) {
    group.add(
      createPanel(
        {
          name: 'Porte – traverse de châssis',
          size: [glassWidth, profile, sashDepth],
          position: [clear.centerX, clear.bottom + rail, wallCenterZ],
          material: 'aluminiumAnthracite',
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  group.add(
    createPanel(
      {
        name: 'Porte – vitrage',
        size: [glassWidth, glassHeight, config.glazingThickness],
        position: [clear.centerX, clear.bottom + clear.height / 2, wallCenterZ],
        material: 'glass',
        tag: 'glazing'
      },
      ctx
    )
  );

  group.add(
    createPanel(
      {
        name: 'Porte – poignée',
        size: [HANDLE_SECTION, HANDLE_LENGTH, HANDLE_SECTION],
        position: [
          clear.centerX + clear.width / 2 - profile - HANDLE_SECTION,
          clear.bottom + clear.height * 0.45,
          wallCenterZ + sashDepth / 2 + HANDLE_STANDOFF / 2
        ],
        material: 'aluminiumAnthracite',
        tag: 'joinery'
      },
      ctx
    )
  );

  return group;
}

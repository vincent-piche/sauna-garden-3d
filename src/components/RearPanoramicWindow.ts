import * as THREE from 'three';
import { buildOpeningFrame } from '../geometry/openingFrame';
import { createPanel } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

/**
 * Fixed panoramic bay on the rear facade, facing the garden and the valley.
 * Anthracite grey aluminium frame, matching the entrance door.
 */
export function createRearPanoramicWindow(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const config = ctx.config;
  const bay = geometry.window;
  const wallCenterZ = -geometry.depth / 2 + geometry.wallThickness / 2;

  const group = new THREE.Group();
  group.name = 'RearPanoramicWindow';

  const frame = buildOpeningFrame(
    {
      name: 'Baie',
      centerX: bay.center,
      width: bay.width,
      sill: bay.sill,
      height: bay.height,
      wallCenterZ,
      frameDepth: geometry.wallThickness,
      profile: config.frameProfileWidth,
      material: 'aluminiumAnthracite',
      includeSill: true
    },
    ctx
  );
  group.add(frame.group);

  const { clear } = frame;
  group.add(
    createPanel(
      {
        name: 'Baie – vitrage',
        size: [clear.width, clear.height, config.glazingThickness],
        position: [clear.centerX, clear.bottom + clear.height / 2, wallCenterZ],
        material: 'glass',
        tag: 'glazing'
      },
      ctx
    )
  );

  return group;
}

import * as THREE from 'three';
import { buildOpeningFrame } from '../geometry/openingFrame';
import { createPanel } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

const GLASS_THICKNESS = 24;

/** Fixed panoramic bay on the rear facade, facing the garden and the valley. */
export function createRearPanoramicWindow(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
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
      wallThickness: geometry.wallThickness,
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
        size: [clear.width, clear.height, GLASS_THICKNESS],
        position: [clear.centerX, clear.bottom + clear.height / 2, wallCenterZ],
        material: 'glass',
        tag: 'glazing'
      },
      ctx
    )
  );

  return group;
}

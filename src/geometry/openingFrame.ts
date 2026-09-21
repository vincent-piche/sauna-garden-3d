import * as THREE from 'three';
import type { BuildContext } from '../model/buildContext';
import { createWoodPiece, ORIENTATION } from './woodPiece';

export interface OpeningFrameParams {
  name: string;
  /** Opening, expressed in the facade plane (X) and in height (Y). */
  centerX: number;
  width: number;
  sill: number;
  height: number;
  /** Z coordinate of the middle of the wall. */
  wallCenterZ: number;
  wallThickness: number;
  includeSill: boolean;
}

export interface OpeningFrame {
  group: THREE.Group;
  /** Clear opening left inside the lining, where the leaf or the glazing goes. */
  clear: { centerX: number; bottom: number; width: number; height: number };
}

/**
 * Timber lining of an opening. The lining boards are ripped to the wall thickness,
 * which is the one place where the standard 80 mm width cannot be kept.
 */
export function buildOpeningFrame(params: OpeningFrameParams, ctx: BuildContext): OpeningFrame {
  const frameThickness = ctx.config.standardWoodThickness;
  const group = new THREE.Group();
  group.name = `${params.name}Frame`;

  const jambLength = params.height;
  for (const side of [-1, 1] as const) {
    group.add(
      createWoodPiece(
        {
          name: `${params.name} – montant d'huisserie`,
          length: jambLength,
          width: params.wallThickness,
          thickness: frameThickness,
          position: [
            params.centerX + side * (params.width / 2 - frameThickness / 2),
            params.sill + params.height / 2,
            params.wallCenterZ
          ],
          rotation: ORIENTATION.uprightFacingX,
          material: 'pineInterior',
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  group.add(
    createWoodPiece(
      {
        name: `${params.name} – traverse haute`,
        length: params.width,
        width: params.wallThickness,
        thickness: frameThickness,
        position: [params.centerX, params.sill + params.height - frameThickness / 2, params.wallCenterZ],
        rotation: ORIENTATION.flatAlongX,
        material: 'pineInterior',
        tag: 'joinery'
      },
      ctx
    )
  );

  if (params.includeSill) {
    group.add(
      createWoodPiece(
        {
          name: `${params.name} – appui`,
          length: params.width,
          width: params.wallThickness,
          thickness: frameThickness,
          position: [params.centerX, params.sill + frameThickness / 2, params.wallCenterZ],
          rotation: ORIENTATION.flatAlongX,
          material: 'pineInterior',
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  const bottom = params.sill + (params.includeSill ? frameThickness : 0);
  return {
    group,
    clear: {
      centerX: params.centerX,
      bottom,
      width: params.width - 2 * frameThickness,
      height: params.sill + params.height - frameThickness - bottom
    }
  };
}

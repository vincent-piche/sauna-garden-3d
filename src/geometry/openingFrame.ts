import * as THREE from 'three';
import type { MaterialKey } from '../materials/materialKeys';
import type { BuildContext } from '../model/buildContext';
import { createPanel } from './woodPiece';

export interface OpeningFrameParams {
  name: string;
  /** Opening, expressed in the facade plane (X) and in height (Y). */
  centerX: number;
  width: number;
  sill: number;
  height: number;
  /** Z coordinate of the middle of the wall. */
  wallCenterZ: number;
  /** Depth of the frame through the wall. */
  frameDepth: number;
  /** Visible width of one profile. */
  profile: number;
  material: MaterialKey;
  includeSill: boolean;
}

export interface OpeningFrame {
  group: THREE.Group;
  /** Clear opening left inside the frame, where the sash or the fixed glazing goes. */
  clear: { centerX: number; bottom: number; width: number; height: number };
}

/**
 * Frame lining an opening, built from four rectangular profiles.
 * The profiles are aluminium, so they are modelled as panels and are deliberately
 * absent from the timber bill of materials.
 */
export function buildOpeningFrame(params: OpeningFrameParams, ctx: BuildContext): OpeningFrame {
  const { profile, frameDepth, material, wallCenterZ } = params;
  const group = new THREE.Group();
  group.name = `${params.name}Frame`;

  for (const side of [-1, 1] as const) {
    group.add(
      createPanel(
        {
          name: `${params.name} – montant`,
          size: [profile, params.height, frameDepth],
          position: [
            params.centerX + side * (params.width / 2 - profile / 2),
            params.sill + params.height / 2,
            wallCenterZ
          ],
          material,
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  group.add(
    createPanel(
      {
        name: `${params.name} – traverse haute`,
        size: [params.width, profile, frameDepth],
        position: [params.centerX, params.sill + params.height - profile / 2, wallCenterZ],
        material,
        tag: 'joinery'
      },
      ctx
    )
  );

  if (params.includeSill) {
    group.add(
      createPanel(
        {
          name: `${params.name} – traverse basse`,
          size: [params.width, profile, frameDepth],
          position: [params.centerX, params.sill + profile / 2, wallCenterZ],
          material,
          tag: 'joinery'
        },
        ctx
      )
    );
  }

  const bottom = params.sill + (params.includeSill ? profile : 0);
  return {
    group,
    clear: {
      centerX: params.centerX,
      bottom,
      width: params.width - 2 * profile,
      height: params.sill + params.height - profile - bottom
    }
  };
}

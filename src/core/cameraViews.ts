import type { SaunaGeometry } from '../config/derivedGeometry';
import type { ViewMode } from '../model/viewModes';
import type { CameraPose } from './viewer';

export type ViewName =
  | 'exterior'
  | 'interior'
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'top'
  | 'structure'
  | 'section';

export const VIEW_LABELS: Record<ViewName, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  front: 'Front',
  rear: 'Rear',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  structure: 'Structure',
  section: 'Section'
};

export interface ViewPreset extends CameraPose {
  /** Views that also imply a visualisation mode set it here. */
  mode?: ViewMode;
}

/**
 * Camera presets derived from the current dimensions, so they stay correct
 * whatever the sauna size. Left and right are named as seen from the entrance.
 */
export function getViewPreset(view: ViewName, geometry: SaunaGeometry): ViewPreset {
  const { width, depth, frontWallHeight } = geometry;
  const center: [number, number, number] = [0, frontWallHeight / 2, 0];
  const distance = Math.max(width, depth);

  switch (view) {
    case 'exterior':
      return { position: [distance * 1.5, frontWallHeight * 1.15, distance * 1.75], target: center };
    case 'structure':
      return {
        position: [distance * 1.4, frontWallHeight * 1.25, distance * 1.6],
        target: center,
        mode: 'structure'
      };
    case 'section':
      return {
        position: [distance * 1.9, frontWallHeight * 0.9, distance * 0.9],
        target: center,
        mode: 'section'
      };
    case 'interior':
      return {
        position: [0, 1200, depth / 2 - geometry.wallThickness - 250],
        target: [0, geometry.window.sill + geometry.window.height / 2, -depth / 2],
        mode: 'interior'
      };
    case 'front':
      return { position: [0, frontWallHeight * 0.55, depth / 2 + distance * 2], target: center };
    case 'rear':
      return { position: [0, frontWallHeight * 0.55, -depth / 2 - distance * 2], target: center };
    case 'left':
      return { position: [-width / 2 - distance * 2, frontWallHeight * 0.55, 0], target: center };
    case 'right':
      return { position: [width / 2 + distance * 2, frontWallHeight * 0.55, 0], target: center };
    case 'top':
      return { position: [0, frontWallHeight + distance * 2.2, 1], target: [0, 0, 0] };
    default:
      return { position: [distance * 1.5, frontWallHeight, distance * 1.75], target: center };
  }
}

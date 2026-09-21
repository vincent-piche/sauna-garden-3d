import type { LayerTag } from './tags';
import { STRUCTURE_TAGS } from './tags';

export type ViewMode = 'finished' | 'structure' | 'interior' | 'section';

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  finished: 'Finished',
  structure: 'Structure',
  interior: 'Interior',
  section: 'Section'
};

/** Components hidden in interior mode so the inside stays readable from outside. */
const INTERIOR_HIDDEN_COMPONENTS = new Set(['FrontFacade', 'Door']);

export interface VisibilityInput {
  mode: ViewMode;
  tag: LayerTag;
  component: string;
  /** In solid timber mode the walls are the structure, so they stay visible in Structure. */
  solidWood: boolean;
}

export function isPieceVisible({ mode, tag, component, solidWood }: VisibilityInput): boolean {
  switch (mode) {
    case 'structure':
      return (
        (STRUCTURE_TAGS as readonly string[]).includes(tag) ||
        (solidWood && tag === 'exteriorCladding') ||
        tag === 'site'
      );
    case 'interior':
      return !INTERIOR_HIDDEN_COMPONENTS.has(component);
    case 'finished':
    case 'section':
    default:
      return true;
  }
}

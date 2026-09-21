/**
 * Every mesh produced by a component carries a tag.
 * Visualisation modes work exclusively on these tags, so a new component
 * only has to pick the right tag to behave correctly in every view.
 */
export type LayerTag =
  | 'structure'
  | 'exteriorCladding'
  | 'interiorLining'
  | 'insulation'
  | 'vaporBarrier'
  | 'glazing'
  | 'joinery'
  | 'roofStructure'
  | 'roofCover'
  | 'furniture'
  | 'stove'
  | 'site';

export const STRUCTURE_TAGS: readonly LayerTag[] = ['structure', 'roofStructure'];

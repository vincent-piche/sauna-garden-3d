/**
 * Central configuration of the sauna.
 * Every dimension is in millimetres, every angle in degrees, power in watts.
 * No other module is allowed to introduce dimensional constants.
 */

export type ConstructionMode = 'solidWood' | 'insulated';

export interface SaunaConfig {
  /** Exterior envelope, measured on the outside face of the walls. */
  exteriorWidth: number;
  exteriorDepth: number;
  /** Wall top height on the front (entrance / pool) facade. */
  entranceHeight: number;
  /** Mono-pitch roof slope, front (high) towards rear (low). */
  roofSlope: number;

  /** Standard timber module used for everything that can reasonably be built with it. */
  standardWoodLength: number;
  standardWoodWidth: number;
  standardWoodThickness: number;

  /** Front facade opening. */
  doorWidth: number;
  doorHeight: number;

  /** Rear panoramic bay. */
  rearWindowWidth: number;
  rearWindowHeight: number;
  rearWindowSillHeight: number;

  /** Main bench: long enough to lie down on. */
  mainBenchLength: number;
  mainBenchDepth: number;
  mainBenchHeight: number;

  /** Secondary bench: faces the main bench, shorter, clears the stove. */
  secondaryBenchLength: number;
  secondaryBenchDepth: number;
  secondaryBenchHeight: number;
  benchSlatGap: number;

  /** Electric stove. Dimensions are indicative and scale mildly with power. */
  stovePower: number;
  stoveWidth: number;
  stoveDepth: number;
  stoveHeight: number;
  stoveWallClearance: number;

  /** Timber platform the sauna rests on. The extra depth is a step in front of the door. */
  platformWidth: number;
  platformDepth: number;
  platformHeight: number;

  /** Aluminium joinery: visible width of a profile, and glazing thickness. */
  frameProfileWidth: number;
  glazingThickness: number;

  /** Wall build-up. */
  constructionMode: ConstructionMode;
  insulationThickness: number;
  interiorLiningThickness: number;
  vaporBarrierThickness: number;

  /** Framing rhythm. */
  studSpacing: number;
  joistSpacing: number;
  rafterSpacing: number;

  /** Floor and roof build-up. */
  floorBoardThickness: number;
  floorJoistHeight: number;
  roofOverhang: number;
  roofRafterHeight: number;
  roofDeckThickness: number;
  slateThickness: number;

  /** Minimum clear space kept between the two benches. */
  minimumWalkway: number;
  /** Minimum timber kept between an opening and the edge of a facade. */
  minimumJambWidth: number;
  /** Minimum timber kept above an opening. */
  minimumHeadroom: number;

  /** Position of the section plane along X, from the middle of the sauna. */
  sectionOffset: number;
}

export const DEFAULT_SAUNA_CONFIG: SaunaConfig = {
  exteriorWidth: 2000,
  exteriorDepth: 2500,
  entranceHeight: 2200,
  roofSlope: 8,

  standardWoodLength: 2500,
  standardWoodWidth: 80,
  standardWoodThickness: 40,

  doorWidth: 800,
  doorHeight: 1920,

  rearWindowWidth: 1680,
  rearWindowHeight: 1000,
  rearWindowSillHeight: 570,

  mainBenchLength: 2300,
  mainBenchDepth: 600,
  mainBenchHeight: 500,

  secondaryBenchLength: 1400,
  secondaryBenchDepth: 500,
  secondaryBenchHeight: 500,
  benchSlatGap: 15,

  stovePower: 6000,
  stoveWidth: 450,
  stoveDepth: 400,
  stoveHeight: 700,
  stoveWallClearance: 120,

  platformWidth: 2500,
  platformDepth: 3500,
  platformHeight: 200,

  frameProfileWidth: 50,
  glazingThickness: 24,

  constructionMode: 'solidWood',
  insulationThickness: 100,
  interiorLiningThickness: 20,
  vaporBarrierThickness: 4,

  studSpacing: 600,
  joistSpacing: 500,
  rafterSpacing: 600,

  floorBoardThickness: 40,
  floorJoistHeight: 80,
  roofOverhang: 100,
  roofRafterHeight: 80,
  roofDeckThickness: 40,
  slateThickness: 10,

  minimumWalkway: 400,
  minimumJambWidth: 80,
  minimumHeadroom: 60,

  sectionOffset: 0
};

export function cloneConfig(config: SaunaConfig): SaunaConfig {
  return { ...config };
}

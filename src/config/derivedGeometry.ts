import type { SaunaConfig } from './saunaConfig';
import { clamp, degToRad } from './units';
import type { MaterialKey } from '../materials/materialKeys';
import type { LayerTag } from '../model/tags';

/**
 * Orientation convention used everywhere in the project (millimetres, origin at the
 * centre of the footprint, Y = up, finished interior floor at Y = 0):
 *
 *   +Z : front facade  -> pool side, door
 *   -Z : rear facade   -> garden / valley side, panoramic bay
 *   +X : right hand side when looking from the entrance towards the bay
 *   -X : left hand side  (main bench)
 *
 * The mono-pitch roof descends from +Z (high) to -Z (low).
 */

export interface WallLayer {
  id: string;
  label: string;
  /** 'boards' are counted in the bill of materials, 'panel' layers are not timber. */
  kind: 'boards' | 'panel';
  /** Thickness through the wall. */
  thickness: number;
  /** Width of one board or of one modelled strip. */
  stripWidth: number;
  material: MaterialKey;
  tag: LayerTag;
  /** Distance from the outer face of the wall to the outer face of this layer. */
  offset: number;
}

export interface OpeningGeometry {
  width: number;
  height: number;
  sill: number;
  center: number;
}

export interface BenchPlacement {
  length: number;
  depth: number;
  height: number;
  centerX: number;
  centerZ: number;
}

export interface StovePlacement {
  width: number;
  depth: number;
  height: number;
  centerX: number;
  centerZ: number;
  power: number;
}

export interface SaunaGeometry {
  config: SaunaConfig;

  width: number;
  depth: number;
  wallThickness: number;
  layers: WallLayer[];
  /** Zone reserved for wall framing, null when the walls are solid timber. */
  studZone: { offset: number; thickness: number } | null;

  roofSlopeRad: number;
  frontWallHeight: number;
  rearWallHeight: number;
  /** Height of the top of the walls, i.e. the underside of the roof, at a given Z. */
  wallTopHeightAt(z: number): number;

  interiorWidth: number;
  interiorDepth: number;
  interiorXMin: number;
  interiorXMax: number;
  interiorZMin: number;
  interiorZMax: number;

  door: OpeningGeometry;
  window: OpeningGeometry;
  mainBench: BenchPlacement;
  secondaryBench: BenchPlacement;
  stove: StovePlacement;

  floorStructureBottom: number;
  groundLevel: number;

  /** Dimensions that had to be adjusted to stay buildable. Shown in the UI. */
  warnings: string[];
}

const MIN_REAR_WALL_HEIGHT = 1200;
const MIN_SILL_HEIGHT = 50;
const MIN_OPENING_SIZE = 300;
const MIN_BENCH_LENGTH = 400;
const REFERENCE_STOVE_POWER = 6000;

function buildLayers(config: SaunaConfig): { layers: WallLayer[]; studZone: WallLayer | null } {
  const layers: WallLayer[] = [];
  let offset = 0;

  const push = (layer: Omit<WallLayer, 'offset'>): WallLayer => {
    const complete: WallLayer = { ...layer, offset };
    offset += layer.thickness;
    layers.push(complete);
    return complete;
  };

  if (config.constructionMode === 'solidWood') {
    // Solid wall: the standard module laid on edge, its 80 mm face crossing the wall.
    push({
      id: 'solidWood',
      label: 'Paroi bois massif',
      kind: 'boards',
      thickness: config.standardWoodWidth,
      stripWidth: config.standardWoodThickness,
      material: 'pineExterior',
      tag: 'exteriorCladding'
    });
    return { layers, studZone: null };
  }

  push({
    id: 'cladding',
    label: 'Bardage extérieur',
    kind: 'boards',
    thickness: config.standardWoodThickness,
    stripWidth: config.standardWoodWidth,
    material: 'pineExterior',
    tag: 'exteriorCladding'
  });
  const insulation = push({
    id: 'insulation',
    label: 'Isolation',
    kind: 'panel',
    thickness: config.insulationThickness,
    stripWidth: 400,
    material: 'insulation',
    tag: 'insulation'
  });
  push({
    id: 'vaporBarrier',
    label: 'Pare-vapeur',
    kind: 'panel',
    thickness: config.vaporBarrierThickness,
    stripWidth: 600,
    material: 'vaporBarrier',
    tag: 'vaporBarrier'
  });
  push({
    id: 'lining',
    label: 'Lambris intérieur',
    kind: 'boards',
    thickness: config.interiorLiningThickness,
    stripWidth: config.standardWoodWidth,
    material: 'pineInterior',
    tag: 'interiorLining'
  });

  // The framing shares the insulation zone.
  return { layers, studZone: insulation };
}

export function deriveGeometry(config: SaunaConfig): SaunaGeometry {
  const warnings: string[] = [];
  const { layers, studZone } = buildLayers(config);
  const wallThickness = layers.reduce((total, layer) => total + layer.thickness, 0);

  const width = config.exteriorWidth;
  const depth = config.exteriorDepth;
  const frontWallHeight = config.entranceHeight;

  // Keep a usable rear wall: the slope is reduced rather than producing a crushed facade.
  let slopeRad = degToRad(config.roofSlope);
  let rearWallHeight = frontWallHeight - depth * Math.tan(slopeRad);
  if (rearWallHeight < MIN_REAR_WALL_HEIGHT) {
    slopeRad = Math.atan((frontWallHeight - MIN_REAR_WALL_HEIGHT) / depth);
    rearWallHeight = MIN_REAR_WALL_HEIGHT;
    warnings.push(
      `Pente limitée à ${((slopeRad * 180) / Math.PI).toFixed(1)}° pour conserver ${MIN_REAR_WALL_HEIGHT} mm à l'arrière.`
    );
  }

  const wallTopHeightAt = (z: number): number =>
    frontWallHeight - (depth / 2 - z) * Math.tan(slopeRad);

  const maxOpeningWidth = width - 2 * config.minimumJambWidth;

  const doorWidth = clamp(config.doorWidth, MIN_OPENING_SIZE, maxOpeningWidth);
  const doorHeight = clamp(config.doorHeight, MIN_OPENING_SIZE, frontWallHeight - config.minimumHeadroom);
  if (doorWidth !== config.doorWidth || doorHeight !== config.doorHeight) {
    warnings.push(`Porte ajustée à ${Math.round(doorWidth)} × ${Math.round(doorHeight)} mm.`);
  }

  const windowWidth = clamp(config.rearWindowWidth, MIN_OPENING_SIZE, maxOpeningWidth);
  const maxWindowHeight = rearWallHeight - config.minimumHeadroom - MIN_SILL_HEIGHT;
  const windowHeight = clamp(config.rearWindowHeight, MIN_OPENING_SIZE, maxWindowHeight);
  const windowSill = clamp(
    config.rearWindowSillHeight,
    MIN_SILL_HEIGHT,
    Math.max(MIN_SILL_HEIGHT, rearWallHeight - config.minimumHeadroom - windowHeight)
  );
  if (windowWidth !== config.rearWindowWidth || windowHeight !== config.rearWindowHeight) {
    warnings.push(`Baie ajustée à ${Math.round(windowWidth)} × ${Math.round(windowHeight)} mm.`);
  }
  if (Math.abs(windowSill - config.rearWindowSillHeight) > 0.5) {
    warnings.push(`Allège de la baie ramenée à ${Math.round(windowSill)} mm sous la panne basse.`);
  }

  const interiorXMin = -width / 2 + wallThickness;
  const interiorXMax = width / 2 - wallThickness;
  const interiorZMin = -depth / 2 + wallThickness;
  const interiorZMax = depth / 2 - wallThickness;
  const interiorWidth = interiorXMax - interiorXMin;
  const interiorDepth = interiorZMax - interiorZMin;

  const powerScale = Math.cbrt(Math.max(config.stovePower, 1000) / REFERENCE_STOVE_POWER);
  const stoveWidth = config.stoveWidth * powerScale;
  const stoveDepth = config.stoveDepth * powerScale;
  const stoveHeight = config.stoveHeight * powerScale;

  // Bench depths must leave a walkway between the two benches.
  const availableForBenches = interiorWidth - config.minimumWalkway;
  let mainBenchDepth = config.mainBenchDepth;
  let secondaryBenchDepth = config.secondaryBenchDepth;
  if (mainBenchDepth + secondaryBenchDepth > availableForBenches) {
    const ratio = availableForBenches / (mainBenchDepth + secondaryBenchDepth);
    mainBenchDepth = Math.max(250, mainBenchDepth * ratio);
    secondaryBenchDepth = Math.max(250, secondaryBenchDepth * ratio);
    warnings.push(
      `Profondeur des bancs réduite à ${Math.round(mainBenchDepth)} / ${Math.round(secondaryBenchDepth)} mm pour garder ${config.minimumWalkway} mm de passage.`
    );
  }

  const mainBenchLength = clamp(config.mainBenchLength, MIN_BENCH_LENGTH, interiorDepth);
  if (mainBenchLength !== config.mainBenchLength) {
    warnings.push(`Banc principal ramené à ${Math.round(mainBenchLength)} mm (profondeur intérieure).`);
  }

  // The secondary bench stops before the stove, which sits in the rear right corner.
  const stoveFootprintZ = config.stoveWallClearance + stoveDepth + config.stoveWallClearance;
  const maxSecondaryLength = Math.max(MIN_BENCH_LENGTH, interiorDepth - stoveFootprintZ);
  const secondaryBenchLength = clamp(config.secondaryBenchLength, MIN_BENCH_LENGTH, maxSecondaryLength);
  if (secondaryBenchLength !== config.secondaryBenchLength) {
    warnings.push(`Banc secondaire ramené à ${Math.round(secondaryBenchLength)} mm pour dégager le poêle.`);
  }

  const mainBench: BenchPlacement = {
    length: mainBenchLength,
    depth: mainBenchDepth,
    height: config.mainBenchHeight,
    centerX: interiorXMin + mainBenchDepth / 2,
    centerZ: interiorZMax - mainBenchLength / 2
  };

  const secondaryBench: BenchPlacement = {
    length: secondaryBenchLength,
    depth: secondaryBenchDepth,
    height: config.secondaryBenchHeight,
    centerX: interiorXMax - secondaryBenchDepth / 2,
    centerZ: interiorZMax - secondaryBenchLength / 2
  };

  const stove: StovePlacement = {
    width: stoveWidth,
    depth: stoveDepth,
    height: stoveHeight,
    centerX: interiorXMax - config.stoveWallClearance - stoveWidth / 2,
    centerZ: interiorZMin + config.stoveWallClearance + stoveDepth / 2,
    power: config.stovePower
  };

  const floorStructureBottom = -(config.floorBoardThickness + config.floorJoistHeight);

  return {
    config,
    width,
    depth,
    wallThickness,
    layers,
    studZone: studZone ? { offset: studZone.offset, thickness: studZone.thickness } : null,
    roofSlopeRad: slopeRad,
    frontWallHeight,
    rearWallHeight,
    wallTopHeightAt,
    interiorWidth,
    interiorDepth,
    interiorXMin,
    interiorXMax,
    interiorZMin,
    interiorZMax,
    door: { width: doorWidth, height: doorHeight, sill: 0, center: 0 },
    window: { width: windowWidth, height: windowHeight, sill: windowSill, center: 0 },
    mainBench,
    secondaryBench,
    stove,
    floorStructureBottom,
    groundLevel: floorStructureBottom - 50,
    warnings
  };
}

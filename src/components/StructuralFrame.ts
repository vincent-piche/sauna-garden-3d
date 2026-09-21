import * as THREE from 'three';
import { evenPositions } from '../geometry/layout';
import { splitIntoStrips, subtractRects, type Rect } from '../geometry/rectangles';
import { createWoodPiece, ORIENTATION } from '../geometry/woodPiece';
import type { BuildContext } from '../model/buildContext';

const MIN_CRIPPLE_LENGTH = 60;

interface StudWallSpec {
  label: string;
  normalAxis: 'x' | 'z';
  outerFace: number;
  inward: 1 | -1;
  uStart: number;
  uEnd: number;
  heightAt(u: number): number;
  holes: readonly Rect[];
  /** Positions that must carry a stud whatever the spacing, typically opening jambs. */
  forcedStuds: readonly number[];
  hasTopPlate: boolean;
}

function studPositions(spec: StudWallSpec, studWidth: number, spacing: number): number[] {
  const regular = evenPositions(spec.uStart + studWidth / 2, spec.uEnd - studWidth / 2, spacing);
  const forced = [...spec.forcedStuds];
  const kept = regular.filter((u) => forced.every((other) => Math.abs(other - u) > studWidth));
  return [...kept, ...forced].sort((a, b) => a - b);
}

function addStudWall(spec: StudWallSpec, ctx: BuildContext, group: THREE.Group): void {
  const geometry = ctx.geometry;
  const config = ctx.config;
  const zone = geometry.studZone;
  if (!zone) {
    return;
  }

  const studWidth = config.standardWoodWidth;
  const plateThickness = config.standardWoodThickness;
  const normal = spec.outerFace + spec.inward * (zone.offset + zone.thickness / 2);
  const isFacade = spec.normalAxis === 'z';
  const at = (u: number, y: number): [number, number, number] => (isFacade ? [u, y, normal] : [normal, y, u]);
  const plateRotation = isFacade ? ORIENTATION.flatAlongX : ORIENTATION.flatAlongZ;
  const studRotation = isFacade ? ORIENTATION.uprightFacingZ : ORIENTATION.uprightFacingX;
  const spanLength = spec.uEnd - spec.uStart;
  const spanCenter = (spec.uStart + spec.uEnd) / 2;

  group.add(
    createWoodPiece(
      {
        name: `${spec.label} – lisse basse`,
        length: spanLength,
        width: zone.thickness,
        thickness: plateThickness,
        position: at(spanCenter, plateThickness / 2),
        rotation: plateRotation,
        material: 'structureWood',
        tag: 'structure'
      },
      ctx
    )
  );

  if (spec.hasTopPlate) {
    const top = spec.heightAt(spanCenter);
    group.add(
      createWoodPiece(
        {
          name: `${spec.label} – lisse haute`,
          length: spanLength,
          width: zone.thickness,
          thickness: plateThickness,
          position: at(spanCenter, top - plateThickness / 2),
          rotation: plateRotation,
          material: 'structureWood',
          tag: 'structure'
        },
        ctx
      )
    );
  }

  for (const u of studPositions(spec, studWidth, config.studSpacing)) {
    const full: Rect = { u0: u - studWidth / 2, u1: u + studWidth / 2, v0: plateThickness, v1: spec.heightAt(u) };
    for (const segment of subtractRects(full, spec.holes)) {
      const length = segment.v1 - segment.v0;
      if (length < MIN_CRIPPLE_LENGTH) {
        continue;
      }
      group.add(
        createWoodPiece(
          {
            name: `${spec.label} – montant`,
            length,
            width: studWidth,
            thickness: zone.thickness,
            position: at(u, (segment.v0 + segment.v1) / 2),
            rotation: studRotation,
            material: 'structureWood',
            tag: 'structure'
          },
          ctx
        )
      );
    }
  }

  for (const hole of spec.holes) {
    const headerLength = hole.u1 - hole.u0 + 2 * studWidth;
    group.add(
      createWoodPiece(
        {
          name: `${spec.label} – linteau`,
          length: headerLength,
          width: zone.thickness,
          thickness: config.standardWoodWidth,
          position: at((hole.u0 + hole.u1) / 2, hole.v1 + config.standardWoodWidth / 2),
          rotation: plateRotation,
          material: 'structureWood',
          tag: 'structure'
        },
        ctx
      )
    );
    if (hole.v0 > plateThickness + MIN_CRIPPLE_LENGTH) {
      group.add(
        createWoodPiece(
          {
            name: `${spec.label} – traverse d'allège`,
            length: headerLength,
            width: zone.thickness,
            thickness: plateThickness,
            position: at((hole.u0 + hole.u1) / 2, hole.v0 - plateThickness / 2),
            rotation: plateRotation,
            material: 'structureWood',
            tag: 'structure'
          },
          ctx
        )
      );
    }
  }
}

function addFloor(ctx: BuildContext, group: THREE.Group): void {
  const geometry = ctx.geometry;
  const config = ctx.config;
  const joistY = geometry.floorStructureBottom + config.floorJoistHeight / 2;

  for (const sign of [-1, 1] as const) {
    group.add(
      createWoodPiece(
        {
          name: 'Plancher – longrine',
          length: geometry.depth,
          width: config.floorJoistHeight,
          thickness: config.standardWoodThickness,
          position: [sign * (geometry.width / 2 - config.standardWoodThickness / 2), joistY, 0],
          rotation: ORIENTATION.onEdgeAlongZ,
          material: 'structureWood',
          tag: 'structure'
        },
        ctx
      )
    );
  }

  const joistSpan = geometry.width - 2 * config.standardWoodThickness;
  for (const z of evenPositions(
    -geometry.depth / 2 + config.standardWoodThickness / 2,
    geometry.depth / 2 - config.standardWoodThickness / 2,
    config.joistSpacing
  )) {
    group.add(
      createWoodPiece(
        {
          name: 'Plancher – solive',
          length: joistSpan,
          width: config.floorJoistHeight,
          thickness: config.standardWoodThickness,
          position: [0, joistY, z],
          rotation: ORIENTATION.onEdgeAlongX,
          material: 'structureWood',
          tag: 'structure'
        },
        ctx
      )
    );
  }

  for (const strip of splitIntoStrips(-geometry.depth / 2, geometry.depth / 2, config.standardWoodWidth)) {
    group.add(
      createWoodPiece(
        {
          name: 'Plancher – lame',
          length: geometry.width,
          width: strip.u1 - strip.u0,
          thickness: config.floorBoardThickness,
          position: [0, -config.floorBoardThickness / 2, (strip.u0 + strip.u1) / 2],
          rotation: ORIENTATION.flatAlongX,
          material: 'pineInterior',
          tag: 'structure'
        },
        ctx
      )
    );
  }
}

/**
 * Floor structure plus, in insulated mode, the timber framing of the four walls.
 * In solid wood mode the walls are their own structure, so only the floor is framed here.
 */
export function createStructuralFrame(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const config = ctx.config;
  const group = new THREE.Group();
  group.name = 'StructuralFrame';

  addFloor(ctx, group);

  if (!geometry.studZone) {
    return group;
  }

  const door = geometry.door;
  const bay = geometry.window;
  const jamb = config.standardWoodWidth / 2;

  addStudWall(
    {
      label: 'Façade avant',
      normalAxis: 'z',
      outerFace: geometry.depth / 2,
      inward: -1,
      uStart: -geometry.width / 2,
      uEnd: geometry.width / 2,
      heightAt: () => geometry.frontWallHeight,
      holes: [{ u0: door.center - door.width / 2, u1: door.center + door.width / 2, v0: 0, v1: door.height }],
      forcedStuds: [door.center - door.width / 2 - jamb, door.center + door.width / 2 + jamb],
      hasTopPlate: true
    },
    ctx,
    group
  );

  addStudWall(
    {
      label: 'Façade arrière',
      normalAxis: 'z',
      outerFace: -geometry.depth / 2,
      inward: 1,
      uStart: -geometry.width / 2,
      uEnd: geometry.width / 2,
      heightAt: () => geometry.rearWallHeight,
      holes: [
        {
          u0: bay.center - bay.width / 2,
          u1: bay.center + bay.width / 2,
          v0: bay.sill,
          v1: bay.sill + bay.height
        }
      ],
      forcedStuds: [bay.center - bay.width / 2 - jamb, bay.center + bay.width / 2 + jamb],
      hasTopPlate: true
    },
    ctx,
    group
  );

  const sideStart = -geometry.depth / 2 + geometry.wallThickness;
  const sideEnd = geometry.depth / 2 - geometry.wallThickness;
  for (const side of [-1, 1] as const) {
    addStudWall(
      {
        label: 'Mur latéral',
        normalAxis: 'x',
        outerFace: (side * geometry.width) / 2,
        inward: side === -1 ? 1 : -1,
        uStart: sideStart,
        uEnd: sideEnd,
        heightAt: (z) => geometry.wallTopHeightAt(z),
        holes: [],
        forcedStuds: [],
        hasTopPlate: false
      },
      ctx,
      group
    );
  }

  return group;
}

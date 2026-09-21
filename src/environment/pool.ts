import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { mm } from '../config/units';
import type { MaterialLibrary } from '../materials/materialLibrary';
import { createWaterNormals } from '../materials/waterTexture';
import { layFlat, offsetPolygon, poolOutline, roundedRect, toMetres } from './shapes';

export interface PoolLayout {
  /** Reflects the scene instead of merely picking up the sky, at the cost of a render. */
  reflective: boolean;
  centerX: number;
  centerZ: number;
  /** Along X. */
  length: number;
  /** Along Z. */
  width: number;
  depth: number;
  copingWidth: number;
  /** Paved area, in model coordinates. */
  terrace: { xMin: number; xMax: number; zMin: number; zMax: number };
  /** Top of the paving. */
  deckTop: number;
}

const DECK_THICKNESS = 400;
const BASIN_WALL = 120;
const WATER_DROP = 130;
const COPING_LIFT = 4;
const REFLECTION_RESOLUTION = 512;
/** One tile of ripples covers this much water. */
const RIPPLE_SIZE = 2600;

/**
 * In-ground pool and its paved surround.
 *
 * The paving is a slab pierced by the pool, the basin is a ring of walls plus a
 * floor, and the water is a translucent surface just below the coping. The terrain
 * has a matching hole underneath, cut in `buildTerrain`.
 */
export function buildPool(
  layout: PoolLayout,
  materials: MaterialLibrary,
  collect: (geometry: THREE.BufferGeometry) => void
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Pool';

  const outlinePoints = poolOutline(layout.centerX, layout.centerZ, layout.length, layout.width);
  const innerPoints = offsetPolygon(outlinePoints, -BASIN_WALL);
  const copingPoints = offsetPolygon(outlinePoints, layout.copingWidth);

  const inner = new THREE.Shape(innerPoints);
  const copingOutline = new THREE.Shape(copingPoints);

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number, name: string): void => {
    collect(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = mm(y);
    mesh.name = name;
    mesh.userData.tag = 'site';
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Paving slab, pierced by the pool.
  const terraceShape = roundedRect(
    (layout.terrace.xMin + layout.terrace.xMax) / 2,
    (layout.terrace.zMin + layout.terrace.zMax) / 2,
    layout.terrace.xMax - layout.terrace.xMin,
    layout.terrace.zMax - layout.terrace.zMin,
    600
  );
  terraceShape.holes.push(new THREE.Path(outlinePoints));
  const deck = layFlat(
    new THREE.ExtrudeGeometry(terraceShape, { depth: DECK_THICKNESS, bevelEnabled: false })
  );
  add(deck, materials.get('paving'), layout.deckTop - DECK_THICKNESS, 'Terrasse');

  // Coping ring, sitting on the paving.
  const copingShape = copingOutline;
  copingShape.holes.push(new THREE.Path(outlinePoints));
  add(layFlat(new THREE.ShapeGeometry(copingShape, 10)), materials.get('coping'), layout.deckTop + COPING_LIFT, 'Margelle');

  // Basin: a ring of walls and a floor.
  const wallShape = new THREE.Shape(outlinePoints);
  wallShape.holes.push(new THREE.Path(innerPoints));
  const walls = layFlat(new THREE.ExtrudeGeometry(wallShape, { depth: layout.depth, bevelEnabled: false }));
  add(walls, materials.get('poolPlaster'), layout.deckTop - layout.depth, 'Bassin – parois');
  add(
    layFlat(new THREE.ShapeGeometry(inner, 10)),
    materials.get('poolPlaster'),
    layout.deckTop - layout.depth,
    'Bassin – fond'
  );

  const waterLevel = layout.deckTop - WATER_DROP;
  if (layout.reflective) {
    group.add(buildReflectiveWater(layout, inner, waterLevel, collect));
  } else {
    add(layFlat(new THREE.ShapeGeometry(inner, 10)), materials.get('poolWater'), waterLevel, 'Plan d’eau');
  }

  return group;
}

/**
 * Reflective surface. Unlike the rest of the pool its geometry is left standing in its
 * own plane and the mesh carries the rotation, because `Water` derives its mirror plane
 * from the local Z axis of the object.
 *
 * Its shader is its own, so it ignores the section clipping plane.
 */
function buildReflectiveWater(
  layout: PoolLayout,
  outline: THREE.Shape,
  level: number,
  collect: (geometry: THREE.BufferGeometry) => void
): Water {
  const geometry = toMetres(new THREE.ShapeGeometry(outline, 12));
  collect(geometry);

  const normals = createWaterNormals();
  normals.repeat.set(layout.length / RIPPLE_SIZE, layout.width / RIPPLE_SIZE);

  const water = new Water(geometry, {
    textureWidth: REFLECTION_RESOLUTION,
    textureHeight: REFLECTION_RESOLUTION,
    waterNormals: normals,
    sunColor: 0xfff1d8,
    waterColor: 0x0d6f84,
    distortionScale: 1.6,
    fog: true
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = mm(level);
  water.name = 'Plan d’eau';
  water.userData.tag = 'site';
  return water;
}

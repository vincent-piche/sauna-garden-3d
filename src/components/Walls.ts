import * as THREE from 'three';
import { buildWall } from '../geometry/wallBuilder';
import type { BuildContext } from '../model/buildContext';

/**
 * Side walls. They carry no glazing by design: the sauna only opens on the
 * front (door) and rear (panoramic bay) facades.
 * The side walls stop against the facades, which run the full exterior width.
 */
export function createWalls(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const group = new THREE.Group();
  group.name = 'Walls';

  const uStart = -geometry.depth / 2 + geometry.wallThickness;
  const uEnd = geometry.depth / 2 - geometry.wallThickness;
  const heightAt = (z: number): number => geometry.wallTopHeightAt(z);

  group.add(
    buildWall(
      {
        id: 'leftWall',
        label: 'Mur latéral',
        normalAxis: 'x',
        outerFace: -geometry.width / 2,
        inward: 1,
        uStart,
        uEnd,
        heightAt,
        holes: []
      },
      geometry.layers,
      ctx
    )
  );

  group.add(
    buildWall(
      {
        id: 'rightWall',
        label: 'Mur latéral',
        normalAxis: 'x',
        outerFace: geometry.width / 2,
        inward: -1,
        uStart,
        uEnd,
        heightAt,
        holes: []
      },
      geometry.layers,
      ctx
    )
  );

  return group;
}

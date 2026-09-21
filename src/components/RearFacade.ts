import * as THREE from 'three';
import { buildWall } from '../geometry/wallBuilder';
import type { BuildContext } from '../model/buildContext';

/** Rear facade, garden and valley side. Lowest point of the roof, carries the panoramic bay. */
export function createRearFacade(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const bay = geometry.window;

  const wall = buildWall(
    {
      id: 'rearFacade',
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
      ]
    },
    geometry.layers,
    ctx
  );

  const group = new THREE.Group();
  group.name = 'RearFacade';
  group.add(wall);
  return group;
}

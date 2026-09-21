import * as THREE from 'three';
import { buildWall } from '../geometry/wallBuilder';
import type { BuildContext } from '../model/buildContext';

/** Front facade, pool side. Highest point of the mono-pitch roof, carries the door. */
export function createFrontFacade(ctx: BuildContext): THREE.Group {
  const geometry = ctx.geometry;
  const { door } = geometry;

  const wall = buildWall(
    {
      id: 'frontFacade',
      label: 'Façade avant',
      normalAxis: 'z',
      outerFace: geometry.depth / 2,
      inward: -1,
      uStart: -geometry.width / 2,
      uEnd: geometry.width / 2,
      heightAt: () => geometry.frontWallHeight,
      holes: [
        {
          u0: door.center - door.width / 2,
          u1: door.center + door.width / 2,
          v0: 0,
          v1: door.height
        }
      ]
    },
    geometry.layers,
    ctx
  );

  const group = new THREE.Group();
  group.name = 'FrontFacade';
  group.add(wall);
  return group;
}

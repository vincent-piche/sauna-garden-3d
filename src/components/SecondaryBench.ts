import * as THREE from 'three';
import { buildBench } from '../geometry/benchBuilder';
import type { BuildContext } from '../model/buildContext';

/** Lower bench, facing the main one, stopping short of the stove in the rear right corner. */
export function createSecondaryBench(ctx: BuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SecondaryBench';
  group.add(buildBench('Banc secondaire', ctx.geometry.secondaryBench, ctx));
  return group;
}

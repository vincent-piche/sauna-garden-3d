import * as THREE from 'three';
import { buildBench } from '../geometry/benchBuilder';
import type { BuildContext } from '../model/buildContext';

/** Upper bench, along the left wall, long enough to lie down on. */
export function createMainBench(ctx: BuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MainBench';
  group.add(buildBench('Banc principal', ctx.geometry.mainBench, ctx));
  return group;
}

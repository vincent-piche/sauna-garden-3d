import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * Physical sky, and the image based lighting derived from it.
 *
 * The scene used to be lit by `RoomEnvironment`, a studio interior: outdoors that reads
 * as wrong light whatever else is tuned. Here the sky is a Preetham atmospheric model
 * driven by the sun position already computed for the site, and the ambient light is
 * prefiltered from that very sky. Sky, sunlight and ambience therefore always agree.
 *
 * Two identical sky meshes are kept: one visible in the scene, one alone in an offscreen
 * scene used to bake the environment map, since an object cannot live in two scenes.
 */
const SKY_RADIUS = 900; // metres, inside the camera far plane, outside the terrain
/** The baked environment is heavily prefiltered, so a couple of degrees of lag is invisible. */
const REBAKE_THRESHOLD = Math.cos(THREE.MathUtils.degToRad(2));

export interface SkyParameters {
  /** Haze. Low is a crisp mountain sky, high is a hot hazy one. */
  turbidity: number;
  /** Strength of the blue scattering. */
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
}

export const DEFAULT_SKY: SkyParameters = {
  turbidity: 3.4,
  rayleigh: 2.1,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.82
};

export class SkyDome {
  private readonly visible = new Sky();
  private readonly captured = new Sky();
  private readonly captureScene = new THREE.Scene();
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly bakedDirection = new THREE.Vector3(0, -1, 0);
  private environment: THREE.WebGLRenderTarget | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    parameters: SkyParameters = DEFAULT_SKY
  ) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();

    for (const sky of [this.visible, this.captured]) {
      sky.scale.setScalar(SKY_RADIUS);
      const uniforms = sky.material.uniforms;
      uniforms.turbidity.value = parameters.turbidity;
      uniforms.rayleigh.value = parameters.rayleigh;
      uniforms.mieCoefficient.value = parameters.mieCoefficient;
      uniforms.mieDirectionalG.value = parameters.mieDirectionalG;
    }

    this.visible.name = 'Ciel';
    this.scene.add(this.visible);
    this.captureScene.add(this.captured);
  }

  /**
   * Points the sky at the sun and, when it has moved enough, bakes a new environment.
   * The bake costs a few milliseconds, so it is skipped while the sun barely moves.
   */
  update(direction: THREE.Vector3): void {
    this.visible.material.uniforms.sunPosition.value.copy(direction);
    this.captured.material.uniforms.sunPosition.value.copy(direction);

    if (this.environment && this.bakedDirection.dot(direction) > REBAKE_THRESHOLD) {
      return;
    }
    this.bakedDirection.copy(direction);
    this.bake();
  }

  dispose(): void {
    this.scene.remove(this.visible);
    this.environment?.dispose();
    this.pmrem.dispose();
    for (const sky of [this.visible, this.captured]) {
      sky.geometry.dispose();
      sky.material.dispose();
    }
  }

  private bake(): void {
    const previous = this.environment;
    this.environment = this.pmrem.fromScene(this.captureScene);
    this.scene.environment = this.environment.texture;
    previous?.dispose();
  }
}

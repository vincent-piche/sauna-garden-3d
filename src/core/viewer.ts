import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mm } from '../config/units';
import { SkyDome } from './skyDome';

const SHADOW_EXTENT = 32; // metres, wide enough for the trees and their long shadows
const SUN_DISTANCE = 70; // metres
const BASE_FIELD_OF_VIEW = 50; // degrees, horizontal reference
const MAX_FIELD_OF_VIEW = 80;

export interface CameraPose {
  /** Millimetres, in sauna coordinates. */
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

export interface SunState {
  /** Unit vector pointing from the sauna towards the sun, in model space. */
  direction: readonly [number, number, number];
  /** Degrees above the horizon. */
  altitude: number;
}

const DAY_HAZE = new THREE.Color(0xbcd0e2);
const DUSK_HAZE = new THREE.Color(0xc9865a);
const NIGHT_HAZE = new THREE.Color(0x0d1320);
const HIGH_SUN = new THREE.Color(0xfff6ea);
const LOW_SUN = new THREE.Color(0xff9a4e);
/**
 * The atmospheric sky spans a huge dynamic range between dawn and noon, far more than a
 * screen can show. Exposure therefore follows the sun the way a camera would: wide open
 * at first light, stopped right down at midday.
 */
const EXPOSURE_AT_HORIZON = 0.92;
const EXPOSURE_AT_ZENITH = 0.26;
const SUN_INTENSITY = 4.2;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Scene, camera, lighting and the section clipping plane. Knows nothing about the sauna. */
export class Viewer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private readonly sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  private readonly sun: THREE.DirectionalLight;
  private readonly skyDome: SkyDome;
  private readonly sunDirection = new THREE.Vector3();
  private readonly hazeColor = new THREE.Color();
  private readonly haze: THREE.Fog;
  private readonly sunColor = new THREE.Color();
  private animationHandle = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = EXPOSURE_AT_HORIZON;

    this.hazeColor.copy(DAY_HAZE);
    // Fog copies the colour it is given rather than holding on to it, so the instance is
    // kept and its colour updated in place as the light changes.
    this.haze = new THREE.Fog(this.hazeColor, 70, 620);
    this.scene.fog = this.haze;
    this.skyDome = new SkyDome(this.renderer, this.scene);

    this.camera = new THREE.PerspectiveCamera(BASE_FIELD_OF_VIEW, 1, 0.05, 2000);
    this.camera.position.set(4, 2.5, 5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.25;
    this.controls.target.set(0, 1, 0);
    // Touch mapping: one finger orbits, two fingers pan, pinching zooms. DOLLY_PAN
    // resolves the two-finger case from the gesture itself — the separation drives the
    // zoom, the midpoint drives the pan — so both work without a mode to choose.
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    this.sun = new THREE.DirectionalLight(0xfff3e0, SUN_INTENSITY);
    this.sun.position.set(6, 9, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -SHADOW_EXTENT;
    this.sun.shadow.camera.right = SHADOW_EXTENT;
    this.sun.shadow.camera.top = SHADOW_EXTENT;
    this.sun.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 2 * SUN_DISTANCE;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  /**
   * Places the sun and grades the whole lighting from its altitude:
   * warm and grazing near the horizon, neutral and strong high up, dark at night.
   */
  applySun(state: SunState): void {
    const [x, y, z] = state.direction;
    this.sunDirection.set(x, y, z);
    this.sun.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    // The sky itself carries the ambience, so it is driven by the same direction.
    this.skyDome.update(this.sunDirection);

    const daylight = smoothstep(-1, 10, state.altitude);
    const twilight = smoothstep(-8, 3, state.altitude);

    this.sun.intensity = SUN_INTENSITY * daylight;
    this.sun.castShadow = daylight > 0.01;
    this.sunColor.copy(LOW_SUN).lerp(HIGH_SUN, smoothstep(0, 22, state.altitude));
    this.sun.color.copy(this.sunColor);

    // Only the distance haze still needs a colour of its own, to fade into the horizon.
    this.hazeColor.copy(NIGHT_HAZE).lerp(DUSK_HAZE, twilight).lerp(DAY_HAZE, daylight);
    this.haze.color.copy(this.hazeColor);
    this.scene.environmentIntensity = 1;
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      EXPOSURE_AT_HORIZON,
      EXPOSURE_AT_ZENITH,
      smoothstep(-2, 50, state.altitude)
    );
  }

  setSectionEnabled(enabled: boolean, offsetMillimetres: number): void {
    this.sectionPlane.constant = mm(offsetMillimetres);
    this.renderer.clippingPlanes = enabled ? [this.sectionPlane] : [];
  }

  applyPose(pose: CameraPose): void {
    this.camera.position.set(mm(pose.position[0]), mm(pose.position[1]), mm(pose.position[2]));
    this.controls.target.set(mm(pose.target[0]), mm(pose.target[1]), mm(pose.target[2]));
    this.controls.update();
  }

  start(): void {
    const render = (): void => {
      this.animationHandle = requestAnimationFrame(render);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationHandle);
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.skyDome.dispose();
    this.renderer.dispose();
  }

  private readonly handleResize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);
    this.camera.aspect = aspect;
    // In portrait, widen the vertical field so the horizontal one stays constant:
    // without this the sauna would be cropped on a phone held upright.
    this.camera.fov =
      aspect >= 1
        ? BASE_FIELD_OF_VIEW
        : Math.min(
            MAX_FIELD_OF_VIEW,
            (2 * Math.atan(Math.tan((BASE_FIELD_OF_VIEW * Math.PI) / 360) / aspect) * 180) / Math.PI
          );
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}

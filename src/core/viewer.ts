import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mm } from '../config/units';

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

const DAY_SKY = new THREE.Color(0x8fb6da);
const DUSK_SKY = new THREE.Color(0xd98a55);
const NIGHT_SKY = new THREE.Color(0x101728);
const HIGH_SUN = new THREE.Color(0xfff4e2);
const LOW_SUN = new THREE.Color(0xff9340);

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
  private readonly sky: THREE.HemisphereLight;
  private readonly backgroundColor = new THREE.Color();
  private readonly sunColor = new THREE.Color();
  private animationHandle = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.backgroundColor.copy(DAY_SKY);
    this.scene.background = this.backgroundColor;
    this.scene.fog = new THREE.Fog(this.backgroundColor, 60, 600);

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();

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

    this.sky = new THREE.HemisphereLight(0xdfeaf2, 0x53603f, 1.1);
    this.scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
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
    this.sun.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    const daylight = smoothstep(-1, 10, state.altitude);
    const twilight = smoothstep(-8, 3, state.altitude);

    this.sun.intensity = 3.4 * daylight;
    this.sun.castShadow = daylight > 0.01;
    this.sunColor.copy(LOW_SUN).lerp(HIGH_SUN, smoothstep(0, 22, state.altitude));
    this.sun.color.copy(this.sunColor);

    this.backgroundColor.copy(NIGHT_SKY).lerp(DUSK_SKY, twilight).lerp(DAY_SKY, daylight);
    this.sky.intensity = 0.18 + 1.0 * twilight;
    this.scene.environmentIntensity = 0.05 + 0.45 * twilight;
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

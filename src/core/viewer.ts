import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mm } from '../config/units';
import type { MaterialLibrary } from '../materials/materialLibrary';

const GROUND_SIZE = 40; // metres
const SHADOW_EXTENT = 6; // metres

export interface CameraPose {
  /** Millimetres, in sauna coordinates. */
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

/** Scene, camera, lighting and the section clipping plane. Knows nothing about the sauna. */
export class Viewer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private readonly sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  private readonly ground: THREE.Mesh;
  private readonly sun: THREE.DirectionalLight;
  private animationHandle = 0;

  constructor(private readonly canvas: HTMLCanvasElement, materials: MaterialLibrary) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x9fb8c8);
    this.scene.fog = new THREE.Fog(0x9fb8c8, 25, 70);

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    this.camera.position.set(4, 2.5, 5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.25;
    this.controls.target.set(0, 1, 0);

    this.scene.add(new THREE.HemisphereLight(0xdfeaf2, 0x5d6b4c, 1.1));

    this.sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
    this.sun.position.set(6, 9, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -SHADOW_EXTENT;
    this.sun.shadow.camera.right = SHADOW_EXTENT;
    this.sun.shadow.camera.top = SHADOW_EXTENT;
    this.sun.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 30;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      materials.get('ground')
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.userData.tag = 'site';
    this.ground.userData.component = 'Site';
    this.scene.add(this.ground);

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  setGroundLevel(millimetres: number): void {
    this.ground.position.y = mm(millimetres);
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
    this.ground.geometry.dispose();
    this.renderer.dispose();
  }

  private readonly handleResize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}

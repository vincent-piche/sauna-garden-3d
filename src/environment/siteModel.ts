import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { SaunaGeometry } from '../config/derivedGeometry';
import type { RenderConfig } from '../core/renderConfig';
import { mm } from '../config/units';
import type { MaterialLibrary } from '../materials/materialLibrary';
import { buildPool, type PoolLayout } from './pool';
import type { SiteConfig } from './siteConfig';
import { buildSteppingStones } from './steppingStones';
import { sunDirection, sunPosition, type SunObserver, type SunPosition } from './sun';
import { buildTerrain, terrainHeight, type Footprint, type TerrainShape } from './terrain';
import { buildTree, type TreeSpec } from './trees';

const SUN_PATH_RADIUS = 22; // metres
const SUN_PATH_STEP_MINUTES = 10;
const SUN_PATH_FLOOR = -2; // degrees, below which the path is not drawn
const SUN_MARKER_RADIUS = 0.45;
const HOUR_MARKER_RADIUS = 0.16;
/** Paving kept between the pool coping and the lawn on the sauna side. */
const REAR_PAVING = 0;
/** Stepping stones crossing the lawn between the platform step and the pool terrace. */
const STEPPING_STONE_COUNT = 4;

export class SiteModel {
  readonly root = new THREE.Group();

  private readonly terrainGroup = new THREE.Group();
  private readonly decor = new THREE.Group();
  private readonly sunPathGroup = new THREE.Group();
  private readonly poolGeometries: THREE.BufferGeometry[] = [];
  private readonly stoneGeometries: THREE.BufferGeometry[] = [];
  private readonly treeGeometries: THREE.BufferGeometry[] = [];
  private readonly sunPathGeometries: THREE.BufferGeometry[] = [];
  private readonly terrainGeometries: THREE.BufferGeometry[] = [];

  private terrainSignature = '';
  private poolSignature = '';
  private stonesSignature = '';
  private treeSignature = '';
  private sunPathSignature = '';
  private sunMarker: THREE.Mesh | null = null;
  private poolGroup: THREE.Group | null = null;
  private stonesGroup: THREE.Group | null = null;
  private treeGroup: THREE.Group | null = null;
  private water: Water | null = null;
  private shape: TerrainShape | null = null;

  constructor(private readonly materials: MaterialLibrary) {
    this.root.name = 'Site';
    this.root.add(this.terrainGroup, this.decor, this.sunPathGroup);
  }

  /** Ground height at a point, following the modelled terrain. */
  groundAt(x: number, z: number): number {
    return this.shape ? this.shape.groundLevel + terrainHeight(x, z, this.shape) : 0;
  }

  build(site: SiteConfig, sauna: SaunaGeometry, render: RenderConfig): void {
    const shape: TerrainShape = {
      crestZ: -sauna.depth / 2 - site.slopeStart,
      slope: site.gardenSlope / 100,
      valleyDrop: site.valleyDrop,
      ridgeDistance: site.ridgeDistance,
      ridgeHeight: site.ridgeHeight,
      groundLevel: sauna.groundLevel
    };
    this.shape = shape;

    const poolZMin = sauna.depth / 2 + site.poolDistance + site.copingWidth;
    const poolCenterX = site.poolOffsetX;
    const layout: PoolLayout = {
      reflective: render.waterReflections,
      centerX: poolCenterX,
      centerZ: poolZMin + site.poolWidth / 2,
      length: site.poolLength,
      width: site.poolWidth,
      depth: site.poolDepth,
      copingWidth: site.copingWidth,
      terrace: {
        xMin: poolCenterX - site.poolLength / 2 - site.copingWidth - site.terraceMargin,
        xMax: poolCenterX + site.poolLength / 2 + site.copingWidth + site.terraceMargin,
        zMin: poolZMin - site.copingWidth - REAR_PAVING,
        zMax: poolZMin + site.poolWidth + site.copingWidth + site.terraceMargin
      },
      deckTop: sauna.groundLevel + 30
    };

    this.buildTerrainIfNeeded(shape, layout.terrace);
    this.buildDecor(site, sauna, layout, render);
    this.decor.visible = site.showDecor;
  }

  /**
   * Places the sun marker and, when the day or the orientation changed, redraws the
   * arc the sun follows over the site on that date.
   */
  /** Advances anything that animates on its own, currently only the ripples. */
  tick(deltaSeconds: number): void {
    if (this.water) {
      this.water.material.uniforms.time.value += deltaSeconds;
    }
  }

  applySun(site: SiteConfig, position: SunPosition): void {
    if (this.water) {
      const [x, y, z] = sunDirection(position, site.bayAzimuth);
      this.water.material.uniforms.sunDirection.value.set(x, y, z).normalize();
    }

    this.sunPathGroup.visible = site.showSunPath;
    if (!site.showSunPath) {
      return;
    }

    const signature = [site.dayOfYear, site.latitude, site.longitude, site.utcOffset, site.bayAzimuth]
      .map((value) => value.toFixed(3))
      .join('|');
    if (signature !== this.sunPathSignature) {
      this.sunPathSignature = signature;
      this.rebuildSunPath(site);
    }

    if (this.sunMarker) {
      const [x, y, z] = sunDirection(position, site.bayAzimuth);
      this.sunMarker.position.set(x * SUN_PATH_RADIUS, y * SUN_PATH_RADIUS, z * SUN_PATH_RADIUS);
      this.sunMarker.visible = position.altitude > SUN_PATH_FLOOR;
    }
  }

  setDecorVisible(visible: boolean): void {
    this.decor.visible = visible;
  }

  dispose(): void {
    this.clearDecor();
    this.clearSunPath();
    for (const geometry of this.terrainGeometries) {
      geometry.dispose();
    }
    this.terrainGeometries.length = 0;
    this.terrainGroup.clear();
    this.terrainSignature = '';
  }

  private buildTerrainIfNeeded(shape: TerrainShape, footprint: Footprint): void {
    const signature = [
      shape.crestZ,
      shape.slope,
      shape.valleyDrop,
      shape.ridgeDistance,
      shape.ridgeHeight,
      shape.groundLevel,
      footprint.xMin,
      footprint.xMax,
      footprint.zMin,
      footprint.zMax
    ]
      .map((value) => value.toFixed(2))
      .join('|');
    if (signature === this.terrainSignature) {
      return;
    }
    this.terrainSignature = signature;

    for (const geometry of this.terrainGeometries) {
      geometry.dispose();
    }
    this.terrainGeometries.length = 0;
    this.terrainGroup.clear();

    const geometry = buildTerrain(shape, footprint);
    this.terrainGeometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, this.materials.get('terrain'));
    mesh.receiveShadow = true;
    mesh.name = 'Terrain';
    mesh.userData.tag = 'site';
    mesh.userData.component = 'Site';
    this.terrainGroup.add(mesh);
  }

  /**
   * The pool and the trees are rebuilt only when their own parameters change.
   * Without this, dragging any slider of the building would retriangulate the whole
   * decor on every frame.
   */
  private buildDecor(site: SiteConfig, sauna: SaunaGeometry, layout: PoolLayout, render: RenderConfig): void {
    const poolSignature = JSON.stringify(layout);
    if (poolSignature !== this.poolSignature) {
      this.poolSignature = poolSignature;
      this.poolGroup?.removeFromParent();
      dispose(this.poolGeometries);
      this.poolGroup = buildPool(layout, this.materials, (geometry) => this.poolGeometries.push(geometry));
      tagAsSite(this.poolGroup);
      this.water = null;
      this.poolGroup.traverse((object) => {
        if (object instanceof Water) {
          this.water = object;
        }
      });
      this.decor.add(this.poolGroup);
    }

    // Lands on the terrace to the left of the pool's own centreline, mirrored from it
    // across the platform: the shrub placed near the right-hand corner already
    // occupies that side (see treeSpecs), so the path takes the other one.
    const stonesPath = {
      fromX: sauna.platform.centerX,
      fromZ: sauna.platform.centerZ + sauna.platform.depth / 2,
      toX: sauna.platform.centerX - (layout.centerX - sauna.platform.centerX),
      toZ: layout.terrace.zMin,
      count: STEPPING_STONE_COUNT,
      groundAt: (x: number, z: number) => this.groundAt(x, z)
    };
    const stonesSignature = JSON.stringify([
      stonesPath.fromX,
      stonesPath.fromZ,
      stonesPath.toX,
      stonesPath.toZ,
      stonesPath.count,
      this.terrainSignature
    ]);
    if (stonesSignature !== this.stonesSignature) {
      this.stonesSignature = stonesSignature;
      this.stonesGroup?.removeFromParent();
      dispose(this.stoneGeometries);
      this.stonesGroup = buildSteppingStones(stonesPath, this.materials, (geometry) => this.stoneGeometries.push(geometry));
      tagAsSite(this.stonesGroup);
      this.decor.add(this.stonesGroup);
    }

    const specs = this.treeSpecs(site, sauna, render.detailedVegetation);
    const treeSignature = JSON.stringify(specs);
    if (treeSignature !== this.treeSignature) {
      this.treeSignature = treeSignature;
      this.treeGroup?.removeFromParent();
      dispose(this.treeGeometries);
      this.treeGroup = new THREE.Group();
      this.treeGroup.name = 'Végétation';
      for (const spec of specs) {
        this.treeGroup.add(buildTree(spec, this.materials, (geometry) => this.treeGeometries.push(geometry)));
      }
      tagAsSite(this.treeGroup);
      this.decor.add(this.treeGroup);
    }
  }

  /**
   * The vegetation of the photograph, reduced to what matters for the light:
   * the cedar mass on the right, the cypress screen on the left, and the low hedge
   * on the valley side which decides whether the bay really looks out or not.
   */
  private treeSpecs(site: SiteConfig, sauna: SaunaGeometry, detailed: boolean): TreeSpec[] {
    const specs: TreeSpec[] = [];
    const place = (kind: TreeSpec['kind'], x: number, z: number, height: number, radiusRatio: number, foliage?: TreeSpec['foliage']): void => {
      specs.push({
        kind,
        x,
        z,
        height,
        radius: height * radiusRatio,
        groundY: this.groundAt(x, z),
        foliage,
        detailed
      });
    };

    place('spreading', site.cedarDistance, -3000, site.cedarHeight, 0.33, 'foliageDry');
    place('spreading', site.cedarDistance + 4200, -11000, site.cedarHeight * 0.82, 0.3, 'foliage');
    // The four cypresses the sauna is moved towards.
    place('columnar', -site.cypressDistance, -2200, site.cypressHeight, 0.1);
    place('columnar', -site.cypressDistance - 700, 900, site.cypressHeight * 0.92, 0.1);
    place('columnar', -site.cypressDistance - 200, 3900, site.cypressHeight * 0.86, 0.1);
    place('columnar', -site.cypressDistance - 900, 6900, site.cypressHeight * 0.95, 0.1);
    place('columnar', -site.cypressDistance - 2600, -7000, site.cypressHeight * 1.12, 0.08, 'foliageDry');

    if (site.hedgeHeight > 100) {
      const hedgeZ = -sauna.depth / 2 - site.hedgeDistance;
      const halfSpan = sauna.width / 2 + 2600;
      for (let x = -halfSpan; x <= halfSpan + 1; x += 1500) {
        place('round', x, hedgeZ + 300 * Math.sin(x / 1800), site.hedgeHeight, 0.62);
      }
    }

    // A couple of shrubs by the terrace, for scale.
    const poolEdge = site.poolOffsetX + site.poolLength / 2 + site.terraceMargin;
    place('round', poolEdge + 1400, sauna.depth / 2 + site.poolDistance, 1400, 0.7);
    place('round', site.poolOffsetX - site.poolLength / 2 - site.terraceMargin - 1600, sauna.depth / 2 + site.poolDistance + 5200, 1800, 0.65);

    return specs;
  }

  private rebuildSunPath(site: SiteConfig): void {
    this.clearSunPath();
    const observer: SunObserver = {
      latitude: site.latitude,
      longitude: site.longitude,
      utcOffset: site.utcOffset
    };

    const points: THREE.Vector3[] = [];
    const hourMarks: THREE.Vector3[] = [];
    for (let minutes = 0; minutes <= 24 * 60; minutes += SUN_PATH_STEP_MINUTES) {
      const hour = minutes / 60;
      const position = sunPosition(site.dayOfYear, hour, observer);
      if (position.altitude < SUN_PATH_FLOOR) {
        continue;
      }
      const [x, y, z] = sunDirection(position, site.bayAzimuth);
      const point = new THREE.Vector3(x * SUN_PATH_RADIUS, y * SUN_PATH_RADIUS, z * SUN_PATH_RADIUS);
      points.push(point);
      if (minutes % 60 === 0) {
        hourMarks.push(point.clone());
      }
    }

    this.sunPathGroup.position.y = mm(this.shape?.groundLevel ?? 0);

    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.sunPathGeometries.push(geometry);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffce6a }));
      line.name = 'Trajectoire du soleil';
      this.sunPathGroup.add(line);
    }

    const markerGeometry = new THREE.SphereGeometry(HOUR_MARKER_RADIUS, 8, 6);
    this.sunPathGeometries.push(markerGeometry);
    for (const mark of hourMarks) {
      const mesh = new THREE.Mesh(markerGeometry, this.materials.get('sunMarker'));
      mesh.position.copy(mark);
      this.sunPathGroup.add(mesh);
    }

    const sunGeometry = new THREE.SphereGeometry(SUN_MARKER_RADIUS, 16, 12);
    this.sunPathGeometries.push(sunGeometry);
    this.sunMarker = new THREE.Mesh(sunGeometry, this.materials.get('sunMarker'));
    this.sunMarker.name = 'Soleil';
    this.sunPathGroup.add(this.sunMarker);
  }

  private clearDecor(): void {
    this.decor.clear();
    this.poolGroup = null;
    this.stonesGroup = null;
    this.treeGroup = null;
    this.water = null;
    this.poolSignature = '';
    this.stonesSignature = '';
    this.treeSignature = '';
    dispose(this.poolGeometries);
    dispose(this.stoneGeometries);
    dispose(this.treeGeometries);
  }

  private clearSunPath(): void {
    this.sunPathGroup.clear();
    this.sunMarker = null;
    dispose(this.sunPathGeometries);
  }
}

function dispose(geometries: THREE.BufferGeometry[]): void {
  for (const geometry of geometries) {
    geometry.dispose();
  }
  geometries.length = 0;
}

function tagAsSite(group: THREE.Group): void {
  group.traverse((object) => {
    object.userData.component = 'Site';
    object.userData.tag = object.userData.tag ?? 'site';
  });
}

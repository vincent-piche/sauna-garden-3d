import * as THREE from 'three';
import { generateBillOfMaterials, type BillOfMaterials } from '../bom/billOfMaterials';
import { deriveGeometry, type SaunaGeometry } from '../config/derivedGeometry';
import type { SaunaConfig } from '../config/saunaConfig';
import { createDoor } from '../components/Door';
import { createFrontFacade } from '../components/FrontFacade';
import { createMainBench } from '../components/MainBench';
import { createRearFacade } from '../components/RearFacade';
import { createRearPanoramicWindow } from '../components/RearPanoramicWindow';
import { createRoof } from '../components/Roof';
import { createSaunaStove } from '../components/SaunaStove';
import { createSecondaryBench } from '../components/SecondaryBench';
import { createStructuralFrame } from '../components/StructuralFrame';
import { createWalls } from '../components/Walls';
import type { MaterialLibrary } from '../materials/materialLibrary';
import { BuildContext } from './buildContext';
import type { LayerTag } from './tags';
import { isPieceVisible, type ViewMode } from './viewModes';

type ComponentFactory = (ctx: BuildContext) => THREE.Group;

/** Registration order is the only place where the component list is declared. */
const COMPONENTS: ComponentFactory[] = [
  createStructuralFrame,
  createWalls,
  createFrontFacade,
  createRearFacade,
  createDoor,
  createRearPanoramicWindow,
  createRoof,
  createMainBench,
  createSecondaryBench,
  createSaunaStove
];

export class SaunaModel {
  readonly root = new THREE.Group();

  private context: BuildContext | null = null;
  private currentGeometry: SaunaGeometry | null = null;
  private bill: BillOfMaterials | null = null;
  private viewMode: ViewMode = 'finished';

  constructor(private readonly materials: MaterialLibrary) {
    this.root.name = 'Sauna';
  }

  get geometry(): SaunaGeometry {
    if (!this.currentGeometry) {
      throw new Error('SaunaModel.build() must be called before reading the geometry.');
    }
    return this.currentGeometry;
  }

  get billOfMaterials(): BillOfMaterials {
    if (!this.bill) {
      throw new Error('SaunaModel.build() must be called before reading the bill of materials.');
    }
    return this.bill;
  }

  get warnings(): readonly string[] {
    return this.currentGeometry?.warnings ?? [];
  }

  /** Full rebuild. Cheap enough to run on every slider move. */
  build(config: SaunaConfig): void {
    this.clear();

    const geometry = deriveGeometry(config);
    const context = new BuildContext(geometry, this.materials);

    for (const factory of COMPONENTS) {
      const group = factory(context);
      tagComponent(group, group.name);
      this.root.add(group);
    }

    this.context = context;
    this.currentGeometry = geometry;
    this.bill = generateBillOfMaterials(context.woodParts.values(), config);
    this.applyViewMode(this.viewMode);
  }

  applyViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    const solidWood = this.currentGeometry?.config.constructionMode === 'solidWood';
    this.root.traverse((object) => {
      const tag = object.userData.tag as LayerTag | undefined;
      if (!tag) {
        return;
      }
      object.visible = isPieceVisible({
        mode,
        tag,
        component: (object.userData.component as string) ?? '',
        solidWood
      });
    });
  }

  dispose(): void {
    this.clear();
  }

  private clear(): void {
    this.root.clear();
    this.context?.dispose();
    this.context = null;
  }
}

function tagComponent(group: THREE.Group, componentName: string): void {
  group.traverse((object) => {
    object.userData.component = componentName;
  });
}

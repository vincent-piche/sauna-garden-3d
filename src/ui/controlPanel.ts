import { cloneConfig, DEFAULT_SAUNA_CONFIG, type ConstructionMode, type SaunaConfig } from '../config/saunaConfig';
import { loadConfigFromDisk, saveConfigToDisk } from '../io/configFile';
import { VIEW_LABELS, type ViewName } from '../core/cameraViews';
import type { SaunaModel } from '../model/saunaModel';
import { VIEW_MODE_LABELS, type ViewMode } from '../model/viewModes';
import { BomView } from './bomView';
import {
  createButtonRow,
  createSection,
  createSlider,
  el,
  type ButtonRowHandle,
  type SliderHandle
} from './widgets';

type NumericKey = {
  [K in keyof SaunaConfig]: SaunaConfig[K] extends number ? K : never;
}[keyof SaunaConfig];

interface NumericField {
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  enabled?(config: SaunaConfig): boolean;
}

interface FieldGroup {
  title: string;
  fields: NumericField[];
}

const isInsulated = (config: SaunaConfig): boolean => config.constructionMode === 'insulated';

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Volume extérieur',
    fields: [
      { key: 'exteriorWidth', label: 'Largeur', min: 1200, max: 4000, step: 10, unit: 'mm' },
      { key: 'exteriorDepth', label: 'Profondeur', min: 1500, max: 5000, step: 10, unit: 'mm' },
      { key: 'entranceHeight', label: 'Hauteur (avant)', min: 1800, max: 3000, step: 10, unit: 'mm' }
    ]
  },
  {
    title: 'Plateforme',
    fields: [
      { key: 'platformWidth', label: 'Largeur', min: 1500, max: 6000, step: 10, unit: 'mm' },
      { key: 'platformDepth', label: 'Profondeur', min: 1500, max: 8000, step: 10, unit: 'mm' },
      { key: 'platformHeight', label: 'Hauteur', min: 80, max: 800, step: 10, unit: 'mm' }
    ]
  },
  {
    title: 'Toiture',
    fields: [
      { key: 'roofSlope', label: 'Pente', min: 0, max: 25, step: 0.5, unit: '°' },
      { key: 'roofOverhang', label: 'Débord', min: 0, max: 800, step: 10, unit: 'mm' }
    ]
  },
  {
    title: 'Ouvertures',
    fields: [
      { key: 'doorWidth', label: 'Porte – largeur', min: 500, max: 1200, step: 10, unit: 'mm' },
      { key: 'doorHeight', label: 'Porte – hauteur', min: 1400, max: 2400, step: 10, unit: 'mm' },
      { key: 'rearWindowWidth', label: 'Baie – largeur', min: 400, max: 3600, step: 10, unit: 'mm' },
      { key: 'rearWindowHeight', label: 'Baie – hauteur', min: 400, max: 2400, step: 10, unit: 'mm' },
      { key: 'rearWindowSillHeight', label: 'Baie – allège', min: 0, max: 1000, step: 10, unit: 'mm' }
    ]
  },
  {
    title: 'Bancs',
    fields: [
      { key: 'mainBenchLength', label: 'Principal – longueur', min: 800, max: 4000, step: 10, unit: 'mm' },
      { key: 'mainBenchDepth', label: 'Principal – profondeur', min: 300, max: 900, step: 10, unit: 'mm' },
      { key: 'mainBenchHeight', label: 'Principal – hauteur', min: 400, max: 1400, step: 10, unit: 'mm' },
      { key: 'secondaryBenchLength', label: 'Secondaire – longueur', min: 500, max: 3000, step: 10, unit: 'mm' },
      { key: 'secondaryBenchDepth', label: 'Secondaire – profondeur', min: 300, max: 900, step: 10, unit: 'mm' },
      { key: 'secondaryBenchHeight', label: 'Secondaire – hauteur', min: 300, max: 1000, step: 10, unit: 'mm' }
    ]
  },
  {
    title: 'Poêle',
    fields: [{ key: 'stovePower', label: 'Puissance', min: 2000, max: 12000, step: 500, unit: 'W' }]
  },
  {
    title: 'Paroi',
    fields: [
      {
        key: 'insulationThickness',
        label: 'Isolation',
        min: 40,
        max: 240,
        step: 10,
        unit: 'mm',
        enabled: isInsulated
      },
      {
        key: 'interiorLiningThickness',
        label: 'Lambris intérieur',
        min: 10,
        max: 40,
        step: 1,
        unit: 'mm',
        enabled: isInsulated
      }
    ]
  },
  {
    title: 'Menuiseries aluminium',
    fields: [
      { key: 'frameProfileWidth', label: 'Largeur de profilé', min: 20, max: 120, step: 5, unit: 'mm' },
      { key: 'glazingThickness', label: 'Épaisseur du vitrage', min: 6, max: 60, step: 2, unit: 'mm' }
    ]
  },
  {
    title: 'Module bois',
    fields: [
      { key: 'standardWoodLength', label: 'Longueur standard', min: 1500, max: 6000, step: 100, unit: 'mm' },
      { key: 'standardWoodWidth', label: 'Largeur', min: 40, max: 200, step: 5, unit: 'mm' },
      { key: 'standardWoodThickness', label: 'Épaisseur', min: 18, max: 80, step: 1, unit: 'mm' }
    ]
  },
  {
    title: 'Coupe',
    fields: [{ key: 'sectionOffset', label: 'Position du plan', min: -2500, max: 2500, step: 10, unit: 'mm' }]
  }
];

const VIEW_ORDER: ViewName[] = [
  'exterior',
  'interior',
  'front',
  'rear',
  'left',
  'right',
  'top',
  'structure',
  'section'
];

const VIEW_MODE_ORDER: ViewMode[] = ['finished', 'structure', 'interior', 'section'];

const CONSTRUCTION_MODES: Array<{ id: ConstructionMode; label: string }> = [
  { id: 'solidWood', label: 'Solid wood' },
  { id: 'insulated', label: 'Insulated wall' }
];

export interface ControlPanelCallbacks {
  onConfigChange(config: SaunaConfig, key: keyof SaunaConfig): void;
  onView(view: ViewName): void;
  onViewMode(mode: ViewMode): void;
}

export class ControlPanel {
  private readonly sliders = new Map<NumericKey, SliderHandle>();
  private readonly warningsBox = el('div', 'warnings');
  private readonly statusBox = el('div', 'status');
  private readonly bomView: BomView;
  private readonly viewModeRow: ButtonRowHandle<ViewMode>;
  private readonly constructionRow: ButtonRowHandle<ConstructionMode>;
  private config: SaunaConfig;

  constructor(
    container: HTMLElement,
    initialConfig: SaunaConfig,
    private readonly callbacks: ControlPanelCallbacks
  ) {
    this.config = cloneConfig(initialConfig);

    container.append(el('h1', 'app-title', 'Sauna Garden 3D'));
    container.append(
      el('p', 'app-subtitle', 'Modèle paramétrique — façade avant côté piscine, baie arrière côté vallée.')
    );

    const viewSection = createSection(container, 'Vues');
    createButtonRow(
      viewSection,
      VIEW_ORDER.map((view) => ({ id: view, label: VIEW_LABELS[view] })),
      (view) => this.callbacks.onView(view)
    );

    const modeSection = createSection(container, 'Mode de visualisation');
    this.viewModeRow = createButtonRow(
      modeSection,
      VIEW_MODE_ORDER.map((mode) => ({ id: mode, label: VIEW_MODE_LABELS[mode] })),
      (mode) => this.callbacks.onViewMode(mode)
    );

    const constructionSection = createSection(container, 'Mode de construction');
    this.constructionRow = createButtonRow(constructionSection, CONSTRUCTION_MODES, (mode) => {
      this.config = { ...this.config, constructionMode: mode };
      this.constructionRow.setActive(mode);
      this.refreshEnabledState();
      this.callbacks.onConfigChange(this.config, 'constructionMode');
    });
    this.constructionRow.setActive(this.config.constructionMode);

    this.warningsBox.hidden = true;
    container.append(this.warningsBox);

    for (const group of FIELD_GROUPS) {
      const section = createSection(container, group.title);
      for (const field of group.fields) {
        const handle = createSlider(section, {
          label: field.label,
          min: field.min,
          max: field.max,
          step: field.step,
          unit: field.unit,
          value: this.config[field.key],
          onInput: (value) => {
            this.config = { ...this.config, [field.key]: value };
            this.callbacks.onConfigChange(this.config, field.key);
          }
        });
        this.sliders.set(field.key, handle);
      }
    }

    const projectSection = createSection(container, 'Projet');
    const projectRow = el('div', 'button-row');
    projectRow.append(
      this.actionButton('Enregistrer…', () => void this.save()),
      this.actionButton('Ouvrir…', () => void this.load()),
      this.actionButton('Réinitialiser', () => this.reset())
    );
    this.statusBox.hidden = true;
    projectSection.append(projectRow, this.statusBox);

    this.bomView = new BomView(container);
    this.refreshEnabledState();
  }

  /** Refreshes everything that depends on the built model. */
  update(model: SaunaModel): void {
    this.bomView.update(model.billOfMaterials);

    const warnings = model.warnings;
    this.warningsBox.hidden = warnings.length === 0;
    this.warningsBox.replaceChildren();
    if (warnings.length > 0) {
      const list = el('ul');
      for (const warning of warnings) {
        list.append(el('li', undefined, warning));
      }
      this.warningsBox.append(list);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewModeRow.setActive(mode);
  }

  /** Replaces every parameter at once, for instance after loading a file. */
  applyConfig(config: SaunaConfig): void {
    this.config = cloneConfig(config);
    const target = this.config as unknown as Record<string, number>;
    for (const [key, handle] of this.sliders) {
      // The slider clamps to its own range, and the configuration follows it.
      target[key] = handle.setValue(this.config[key]);
    }
    this.constructionRow.setActive(this.config.constructionMode);
    this.refreshEnabledState();
    this.callbacks.onConfigChange(this.config, 'constructionMode');
  }

  private actionButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = el('button', undefined, label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
  }

  private setStatus(message: string, kind: 'info' | 'error'): void {
    this.statusBox.textContent = message;
    this.statusBox.classList.toggle('error', kind === 'error');
    this.statusBox.hidden = false;
  }

  private async save(): Promise<void> {
    const result = await saveConfigToDisk(this.config);
    switch (result.status) {
      case 'saved':
        this.setStatus(`Configuration enregistrée dans ${result.filename}.`, 'info');
        break;
      case 'downloaded':
        this.setStatus(`Configuration téléchargée sous ${result.filename}.`, 'info');
        break;
      case 'cancelled':
        this.setStatus('Enregistrement annulé.', 'info');
        break;
      default:
        this.setStatus(`Échec de l'enregistrement : ${result.message}`, 'error');
    }
  }

  private async load(): Promise<void> {
    const result = await loadConfigFromDisk();
    switch (result.status) {
      case 'loaded':
        this.applyConfig(result.config);
        this.setStatus(`Configuration chargée depuis ${result.filename}.`, 'info');
        break;
      case 'cancelled':
        this.setStatus('Ouverture annulée.', 'info');
        break;
      default:
        this.setStatus(`Fichier illisible : ${result.message}`, 'error');
    }
  }

  private reset(): void {
    this.applyConfig(DEFAULT_SAUNA_CONFIG);
    this.setStatus('Paramètres réinitialisés.', 'info');
  }

  private refreshEnabledState(): void {
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        const handle = this.sliders.get(field.key);
        handle?.setEnabled(field.enabled ? field.enabled(this.config) : true);
      }
    }
  }
}

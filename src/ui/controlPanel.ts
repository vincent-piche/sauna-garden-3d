import { cloneConfig, DEFAULT_SAUNA_CONFIG, type ConstructionMode, type SaunaConfig } from '../config/saunaConfig';
import { VIEW_LABELS, type ViewName } from '../core/cameraViews';
import {
  cloneSiteConfig,
  DEFAULT_SITE_CONFIG,
  type SiteConfig
} from '../environment/siteConfig';
import {
  formatAzimuth,
  formatDayOfYear,
  formatHour,
  type SunPosition,
  type SunTimes
} from '../environment/sun';
import { loadProjectFromDisk, saveProjectToDisk, type SaunaProject } from '../io/configFile';
import type { SaunaModel } from '../model/saunaModel';
import { VIEW_MODE_LABELS, type ViewMode } from '../model/viewModes';
import { BomView } from './bomView';
import {
  createButtonRow,
  createSection,
  createSlider,
  createToggle,
  el,
  formatNumber,
  type ButtonRowHandle,
  type SliderHandle,
  type ToggleHandle
} from './widgets';

type SaunaNumericKey = {
  [K in keyof SaunaConfig]: SaunaConfig[K] extends number ? K : never;
}[keyof SaunaConfig];

type SiteNumericKey = {
  [K in keyof SiteConfig]: SiteConfig[K] extends number ? K : never;
}[keyof SiteConfig];

interface FieldBase {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Replaces the default readout, for dates, hours and bearings. */
  format?(value: number): string;
  enabled?(config: SaunaConfig): boolean;
}

type NumericField =
  | (FieldBase & { scope: 'sauna'; key: SaunaNumericKey })
  | (FieldBase & { scope: 'site'; key: SiteNumericKey });

interface FieldGroup {
  title: string;
  open?: boolean;
  fields: NumericField[];
}

const isInsulated = (config: SaunaConfig): boolean => config.constructionMode === 'insulated';

function building(
  key: SaunaNumericKey,
  label: string,
  min: number,
  max: number,
  step: number,
  unit = 'mm',
  extra: Partial<FieldBase> = {}
): NumericField {
  return { scope: 'sauna', key, label, min, max, step, unit, ...extra };
}

function ground(
  key: SiteNumericKey,
  label: string,
  min: number,
  max: number,
  step: number,
  unit = 'mm',
  extra: Partial<FieldBase> = {}
): NumericField {
  return { scope: 'site', key, label, min, max, step, unit, ...extra };
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Soleil',
    open: true,
    fields: [
      ground('dayOfYear', 'Date', 1, 365, 1, '', { format: formatDayOfYear }),
      ground('hourOfDay', 'Heure', 0, 24, 0.25, '', { format: formatHour })
    ]
  },
  {
    title: 'Volume extérieur',
    open: true,
    fields: [
      building('exteriorWidth', 'Largeur', 1200, 4000, 10),
      building('exteriorDepth', 'Profondeur', 1500, 5000, 10),
      building('entranceHeight', 'Hauteur (avant)', 1800, 3000, 10)
    ]
  },
  {
    title: 'Implantation',
    open: true,
    fields: [
      ground('bayAzimuth', 'Orientation de la baie', 0, 359, 1, '°', { format: formatAzimuth }),
      ground('latitude', 'Latitude', -60, 60, 0.1, '°'),
      ground('longitude', 'Longitude', -180, 180, 0.1, '°'),
      ground('utcOffset', 'Décalage UTC', -12, 14, 1, 'h')
    ]
  },
  {
    title: 'Plateforme',
    fields: [
      building('platformWidth', 'Largeur', 1500, 6000, 10),
      building('platformDepth', 'Profondeur', 1500, 8000, 10),
      building('platformHeight', 'Hauteur', 80, 800, 10)
    ]
  },
  {
    title: 'Toiture',
    fields: [
      building('roofSlope', 'Pente', 0, 25, 0.5, '°'),
      building('roofOverhang', 'Débord', 0, 800, 10)
    ]
  },
  {
    title: 'Ouvertures',
    fields: [
      building('doorWidth', 'Porte – largeur', 500, 1200, 10),
      building('doorHeight', 'Porte – hauteur', 1400, 2400, 10),
      building('rearWindowWidth', 'Baie – largeur', 400, 3600, 10),
      building('rearWindowHeight', 'Baie – hauteur', 400, 2400, 10),
      building('rearWindowSillHeight', 'Baie – allège', 0, 1000, 10)
    ]
  },
  {
    title: 'Bancs',
    fields: [
      building('mainBenchLength', 'Principal – longueur', 800, 4000, 10),
      building('mainBenchDepth', 'Principal – profondeur', 300, 900, 10),
      building('mainBenchHeight', 'Principal – hauteur', 400, 1400, 10),
      building('secondaryBenchLength', 'Secondaire – longueur', 500, 3000, 10),
      building('secondaryBenchDepth', 'Secondaire – profondeur', 300, 900, 10),
      building('secondaryBenchHeight', 'Secondaire – hauteur', 300, 1000, 10)
    ]
  },
  {
    title: 'Poêle',
    fields: [building('stovePower', 'Puissance', 2000, 12000, 500, 'W')]
  },
  {
    title: 'Paroi',
    fields: [
      building('insulationThickness', 'Isolation', 40, 240, 10, 'mm', { enabled: isInsulated }),
      building('interiorLiningThickness', 'Lambris intérieur', 10, 40, 1, 'mm', { enabled: isInsulated })
    ]
  },
  {
    title: 'Menuiseries aluminium',
    fields: [
      building('frameProfileWidth', 'Largeur de profilé', 20, 120, 5),
      building('glazingThickness', 'Épaisseur du vitrage', 6, 60, 2)
    ]
  },
  {
    title: 'Terrain',
    fields: [
      ground('gardenSlope', 'Pente vers la vallée', 0, 60, 1, '%'),
      ground('slopeStart', 'Replat derrière le sauna', 0, 20000, 100),
      ground('valleyDrop', 'Dénivelé total', 5000, 150000, 1000),
      ground('ridgeDistance', 'Distance de la crête', 60000, 800000, 10000),
      ground('ridgeHeight', 'Hauteur de la crête', 0, 120000, 1000)
    ]
  },
  {
    title: 'Piscine et terrasse',
    fields: [
      ground('poolLength', 'Bassin – longueur', 3000, 16000, 100),
      ground('poolWidth', 'Bassin – largeur', 2000, 9000, 100),
      ground('poolDistance', 'Distance au sauna', 500, 15000, 100),
      ground('poolDepth', 'Profondeur', 600, 2500, 50),
      ground('copingWidth', 'Margelle', 200, 900, 10),
      ground('terraceMargin', 'Dallage autour', 0, 6000, 100)
    ]
  },
  {
    title: 'Végétation et masques',
    fields: [
      ground('cedarHeight', 'Cèdre – hauteur', 0, 30000, 500),
      ground('cedarDistance', 'Cèdre – écartement', 2000, 25000, 500),
      ground('cypressHeight', 'Cyprès – hauteur', 0, 25000, 500),
      ground('cypressDistance', 'Cyprès – écartement', 2000, 25000, 500),
      ground('hedgeHeight', 'Haie arrière – hauteur', 0, 4000, 100),
      ground('hedgeDistance', 'Haie arrière – recul', 800, 12000, 100)
    ]
  },
  {
    title: 'Module bois',
    fields: [
      building('standardWoodLength', 'Longueur standard', 1500, 6000, 100),
      building('standardWoodWidth', 'Largeur', 40, 200, 5),
      building('standardWoodThickness', 'Épaisseur', 18, 80, 1)
    ]
  },
  {
    title: 'Coupe',
    fields: [building('sectionOffset', 'Position du plan', -2500, 2500, 10)]
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
  'site',
  'structure',
  'section'
];

const VIEW_MODE_ORDER: ViewMode[] = ['finished', 'structure', 'interior', 'section'];

const CONSTRUCTION_MODES: Array<{ id: ConstructionMode; label: string }> = [
  { id: 'solidWood', label: 'Solid wood' },
  { id: 'insulated', label: 'Insulated wall' }
];

export interface ControlPanelCallbacks {
  onSaunaChange(config: SaunaConfig, key: keyof SaunaConfig): void;
  onSiteChange(site: SiteConfig, key: keyof SiteConfig): void;
  onProjectLoaded(project: SaunaProject): void;
  onView(view: ViewName): void;
  onViewMode(mode: ViewMode): void;
}

export class ControlPanel {
  private readonly sliders = new Map<string, SliderHandle>();
  private readonly warningsBox = el('div', 'warnings');
  private readonly statusBox = el('div', 'status');
  private readonly sunReadout = el('div', 'summary-grid');
  private readonly bomView: BomView;
  private readonly viewModeRow: ButtonRowHandle<ViewMode>;
  private readonly constructionRow: ButtonRowHandle<ConstructionMode>;
  private readonly sunPathToggle: ToggleHandle;
  private readonly decorToggle: ToggleHandle;

  private config: SaunaConfig;
  private site: SiteConfig;

  constructor(
    container: HTMLElement,
    project: SaunaProject,
    private readonly callbacks: ControlPanelCallbacks
  ) {
    this.config = cloneConfig(project.config);
    this.site = cloneSiteConfig(project.site);

    container.append(el('h1', 'app-title', 'Sauna Garden 3D'));
    container.append(
      el('p', 'app-subtitle', 'Modèle paramétrique — façade avant côté piscine, baie arrière sur la vallée.')
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

    const displaySection = createSection(container, 'Environnement');
    const displayRow = el('div', 'button-row');
    this.sunPathToggle = createToggle(displayRow, 'Trajectoire du soleil', this.site.showSunPath, (value) =>
      this.setSiteValue('showSunPath', value)
    );
    this.decorToggle = createToggle(displayRow, 'Décor du jardin', this.site.showDecor, (value) =>
      this.setSiteValue('showDecor', value)
    );
    displaySection.append(displayRow, this.sunReadout);

    const constructionSection = createSection(container, 'Mode de construction');
    this.constructionRow = createButtonRow(constructionSection, CONSTRUCTION_MODES, (mode) => {
      this.config = { ...this.config, constructionMode: mode };
      this.constructionRow.setActive(mode);
      this.refreshEnabledState();
      this.callbacks.onSaunaChange(this.config, 'constructionMode');
    });
    this.constructionRow.setActive(this.config.constructionMode);

    this.warningsBox.hidden = true;
    container.append(this.warningsBox);

    for (const group of FIELD_GROUPS) {
      const section = createSection(container, group.title, { collapsible: true, open: group.open ?? false });
      for (const field of group.fields) {
        this.addSlider(section, field);
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

  /** Readout of the current solar situation. */
  updateSun(position: SunPosition, times: SunTimes): void {
    const rows: Array<[string, string]> = [
      ['Azimut du soleil', formatAzimuth(position.azimuth)],
      ['Hauteur', `${formatNumber(position.altitude)} °`],
      ['Lever', formatHour(times.sunrise)],
      ['Coucher', formatHour(times.sunset)],
      ['Midi solaire', formatHour(times.solarNoon)],
      ['Baie orientée vers', formatAzimuth(this.site.bayAzimuth)]
    ];
    this.sunReadout.replaceChildren();
    for (const [key, value] of rows) {
      this.sunReadout.append(el('span', 'key', key), el('span', 'value', value));
    }
    if (position.altitude <= 0) {
      this.sunReadout.append(el('span', 'key', 'Le soleil'), el('span', 'value', 'est sous l’horizon'));
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewModeRow.setActive(mode);
  }

  /** Replaces every parameter at once, for instance after loading a file. */
  applyProject(project: SaunaProject): void {
    this.config = cloneConfig(project.config);
    this.site = cloneSiteConfig(project.site);

    const saunaTarget = this.config as unknown as Record<string, number>;
    const siteTarget = this.site as unknown as Record<string, number>;
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        const handle = this.sliders.get(`${field.scope}.${field.key}`);
        if (!handle) {
          continue;
        }
        // The slider clamps to its own range, and the configuration follows it.
        if (field.scope === 'sauna') {
          saunaTarget[field.key] = handle.setValue(this.config[field.key]);
        } else {
          siteTarget[field.key] = handle.setValue(this.site[field.key]);
        }
      }
    }

    this.constructionRow.setActive(this.config.constructionMode);
    this.sunPathToggle.setValue(this.site.showSunPath);
    this.decorToggle.setValue(this.site.showDecor);
    this.refreshEnabledState();
    this.callbacks.onProjectLoaded({ config: this.config, site: this.site });
  }

  private addSlider(section: HTMLElement, field: NumericField): void {
    const current = field.scope === 'sauna' ? this.config[field.key] : this.site[field.key];
    const handle = createSlider(section, {
      label: field.label,
      min: field.min,
      max: field.max,
      step: field.step,
      unit: field.unit,
      value: current,
      format: field.format,
      onInput: (value) => {
        if (field.scope === 'sauna') {
          this.config = { ...this.config, [field.key]: value };
          this.callbacks.onSaunaChange(this.config, field.key);
        } else {
          this.site = { ...this.site, [field.key]: value };
          this.callbacks.onSiteChange(this.site, field.key);
        }
      }
    });
    this.sliders.set(`${field.scope}.${field.key}`, handle);
  }

  private setSiteValue(key: 'showSunPath' | 'showDecor', value: boolean): void {
    this.site = { ...this.site, [key]: value };
    this.callbacks.onSiteChange(this.site, key);
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
    const result = await saveProjectToDisk({ config: this.config, site: this.site });
    switch (result.status) {
      case 'saved':
        this.setStatus(`Projet enregistré dans ${result.filename}.`, 'info');
        break;
      case 'downloaded':
        this.setStatus(`Projet téléchargé sous ${result.filename}.`, 'info');
        break;
      case 'cancelled':
        this.setStatus('Enregistrement annulé.', 'info');
        break;
      default:
        this.setStatus(`Échec de l'enregistrement : ${result.message}`, 'error');
    }
  }

  private async load(): Promise<void> {
    const result = await loadProjectFromDisk();
    switch (result.status) {
      case 'loaded':
        this.applyProject(result.project);
        this.setStatus(`Projet chargé depuis ${result.filename}.`, 'info');
        break;
      case 'cancelled':
        this.setStatus('Ouverture annulée.', 'info');
        break;
      default:
        this.setStatus(`Fichier illisible : ${result.message}`, 'error');
    }
  }

  private reset(): void {
    this.applyProject({ config: DEFAULT_SAUNA_CONFIG, site: DEFAULT_SITE_CONFIG });
    this.setStatus('Paramètres réinitialisés.', 'info');
  }

  private refreshEnabledState(): void {
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        const handle = this.sliders.get(`${field.scope}.${field.key}`);
        handle?.setEnabled(field.enabled ? field.enabled(this.config) : true);
      }
    }
  }
}

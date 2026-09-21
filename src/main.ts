import './ui/styles.css';
import { cloneConfig, DEFAULT_SAUNA_CONFIG, type SaunaConfig } from './config/saunaConfig';
import { getViewPreset, type ViewName } from './core/cameraViews';
import { Viewer } from './core/viewer';
import { cloneSiteConfig, DEFAULT_SITE_CONFIG, type SiteConfig } from './environment/siteConfig';
import { SiteModel } from './environment/siteModel';
import { sunDirection, sunPosition, sunTimes, type SunObserver } from './environment/sun';
import type { SaunaProject } from './io/configFile';
import { MaterialLibrary } from './materials/materialLibrary';
import { SaunaModel } from './model/saunaModel';
import type { ViewMode } from './model/viewModes';
import { setupAppShell } from './ui/appShell';
import { ControlPanel } from './ui/controlPanel';

/** Site parameters that only move the sun, and never rebuild any geometry. */
const SUN_ONLY_KEYS = new Set<keyof SiteConfig>([
  'dayOfYear',
  'hourOfDay',
  'latitude',
  'longitude',
  'utcOffset',
  'bayAzimuth',
  'showSunPath'
]);

const canvas = document.querySelector<HTMLCanvasElement>('#viewport');
const panelContainer = document.querySelector<HTMLElement>('#panel');
const panelToggle = document.querySelector<HTMLButtonElement>('#panel-toggle');
const panelBackdrop = document.querySelector<HTMLElement>('#panel-backdrop');
if (!canvas || !panelContainer || !panelToggle || !panelBackdrop) {
  throw new Error('Le document ne contient pas les éléments attendus de la coque.');
}

const materials = new MaterialLibrary();
const viewer = new Viewer(canvas);
const shell = setupAppShell({
  panel: panelContainer,
  toggle: panelToggle,
  backdrop: panelBackdrop
});
const model = new SaunaModel(materials);
const siteModel = new SiteModel(materials);
viewer.scene.add(model.root, siteModel.root);

let config: SaunaConfig = cloneConfig(DEFAULT_SAUNA_CONFIG);
let siteConfig: SiteConfig = cloneSiteConfig(DEFAULT_SITE_CONFIG);
let viewMode: ViewMode = 'finished';
let pendingFrame = 0;
let saunaIsStale = true;
let siteIsStale = true;

const panel = new ControlPanel(
  panelContainer,
  { config, site: siteConfig },
  {
    onSaunaChange(next, key) {
      config = next;
      if (key === 'sectionOffset') {
        // The section plane is a viewer setting: no need to rebuild the geometry.
        applySection();
        return;
      }
      // The site is laid out from the sauna, so it follows any change of the building.
      scheduleRebuild({ sauna: true, site: true });
    },
    onSiteChange(next, key) {
      siteConfig = next;
      if (SUN_ONLY_KEYS.has(key)) {
        updateSun();
        return;
      }
      if (key === 'showDecor') {
        siteModel.setDecorVisible(siteConfig.showDecor);
        return;
      }
      scheduleRebuild({ sauna: false, site: true });
    },
    onProjectLoaded(project: SaunaProject) {
      config = project.config;
      siteConfig = project.site;
      scheduleRebuild({ sauna: true, site: true });
    },
    onView(view) {
      applyView(view);
    },
    onViewMode(mode) {
      setViewMode(mode);
    }
  }
);

function applySection(): void {
  viewer.setSectionEnabled(viewMode === 'section', config.sectionOffset);
}

function setViewMode(mode: ViewMode): void {
  viewMode = mode;
  model.applyViewMode(mode);
  applySection();
  panel.setViewMode(mode);
}

function updateSun(): void {
  const observer: SunObserver = {
    latitude: siteConfig.latitude,
    longitude: siteConfig.longitude,
    utcOffset: siteConfig.utcOffset
  };
  const position = sunPosition(siteConfig.dayOfYear, siteConfig.hourOfDay, observer);
  viewer.applySun({
    direction: sunDirection(position, siteConfig.bayAzimuth),
    altitude: position.altitude
  });
  siteModel.applySun(siteConfig, position);
  panel.updateSun(position, sunTimes(siteConfig.dayOfYear, observer));
}

function rebuild(): void {
  if (saunaIsStale) {
    model.build(config);
    model.applyViewMode(viewMode);
    panel.update(model);
  }
  if (siteIsStale || saunaIsStale) {
    siteModel.build(siteConfig, model.geometry);
  }
  saunaIsStale = false;
  siteIsStale = false;
  applySection();
  updateSun();
}

/** Rebuilds at most once per frame, so dragging a slider stays smooth. */
function scheduleRebuild(what: { sauna: boolean; site: boolean }): void {
  saunaIsStale = saunaIsStale || what.sauna;
  siteIsStale = siteIsStale || what.site;
  if (pendingFrame) {
    return;
  }
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = 0;
    rebuild();
  });
}

function applyView(view: ViewName): void {
  // On a phone the panel covers the scene, so picking a view closes it.
  shell.closeDrawer();
  const preset = getViewPreset(view, model.geometry);
  if (preset.mode) {
    setViewMode(preset.mode);
  } else if (viewMode === 'interior' || viewMode === 'structure' || viewMode === 'section') {
    setViewMode('finished');
  }
  viewer.applyPose(preset);
}

rebuild();
setViewMode('finished');
applyView('exterior');
viewer.start();

if (import.meta.env.DEV) {
  // Debug handle: lets the model be inspected from the browser console during development.
  Object.assign(window, {
    sauna: {
      model,
      siteModel,
      viewer,
      getConfig: () => config,
      getSite: () => siteConfig,
      rebuild: () => scheduleRebuild({ sauna: true, site: true }),
      applyView,
      setViewMode,
      updateSun
    }
  });
}

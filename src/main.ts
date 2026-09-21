import './ui/styles.css';
import { getViewPreset, type ViewName } from './core/cameraViews';
import { Viewer } from './core/viewer';
import { cloneConfig, DEFAULT_SAUNA_CONFIG, type SaunaConfig } from './config/saunaConfig';
import { MaterialLibrary } from './materials/materialLibrary';
import { SaunaModel } from './model/saunaModel';
import type { ViewMode } from './model/viewModes';
import { ControlPanel } from './ui/controlPanel';

const canvas = document.querySelector<HTMLCanvasElement>('#viewport');
const panelContainer = document.querySelector<HTMLElement>('#panel');
if (!canvas || !panelContainer) {
  throw new Error('Le document doit contenir #viewport et #panel.');
}

const materials = new MaterialLibrary();
const viewer = new Viewer(canvas, materials);
const model = new SaunaModel(materials);
viewer.scene.add(model.root);

let config: SaunaConfig = cloneConfig(DEFAULT_SAUNA_CONFIG);
let viewMode: ViewMode = 'finished';
let pendingFrame = 0;

const panel = new ControlPanel(panelContainer, config, {
  onConfigChange(next, key) {
    config = next;
    if (key === 'sectionOffset') {
      // The section plane is a viewer setting: no need to rebuild the geometry.
      applySection();
      return;
    }
    scheduleRebuild();
  },
  onView(view) {
    applyView(view);
  },
  onViewMode(mode) {
    setViewMode(mode);
  }
});

function applySection(): void {
  viewer.setSectionEnabled(viewMode === 'section', config.sectionOffset);
}

function setViewMode(mode: ViewMode): void {
  viewMode = mode;
  model.applyViewMode(mode);
  applySection();
  panel.setViewMode(mode);
}

function rebuild(): void {
  model.build(config);
  model.applyViewMode(viewMode);
  viewer.setGroundLevel(model.geometry.groundLevel);
  applySection();
  panel.update(model);
}

/** Rebuilds at most once per frame, so dragging a slider stays smooth. */
function scheduleRebuild(): void {
  if (pendingFrame) {
    return;
  }
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = 0;
    rebuild();
  });
}

function applyView(view: ViewName): void {
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
  Object.assign(window, { sauna: { model, viewer, getConfig: () => config, rebuild, applyView, setViewMode } });
}

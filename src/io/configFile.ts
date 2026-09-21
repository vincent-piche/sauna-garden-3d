import { cloneConfig, DEFAULT_SAUNA_CONFIG, type SaunaConfig } from '../config/saunaConfig';
import { cloneSiteConfig, DEFAULT_SITE_CONFIG, type SiteConfig } from '../environment/siteConfig';
import { downloadTextFile } from './download';

export const PROJECT_FILE_NAME = 'sauna-projet.json';
const FILE_FORMAT = 'sauna-garden-3d';
const FILE_VERSION = 2;
const MIME_TYPE = 'application/json';

/** Everything a project needs: the building and its site. */
export interface SaunaProject {
  config: SaunaConfig;
  site: SiteConfig;
}

export interface SaunaProjectFile extends SaunaProject {
  format: typeof FILE_FORMAT;
  version: number;
  savedAt: string;
}

export type SaveResult =
  | { status: 'saved'; filename: string }
  | { status: 'downloaded'; filename: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export type LoadResult =
  | { status: 'loaded'; project: SaunaProject; filename: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Minimal shape of the File System Access API, declared locally to avoid lib assumptions. */
interface WritableFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface SaveHandle {
  name?: string;
  createWritable(): Promise<WritableFile>;
}
interface OpenHandle {
  name?: string;
  getFile(): Promise<File>;
}
interface FilePickerApi {
  showSaveFilePicker?(options: unknown): Promise<SaveHandle>;
  showOpenFilePicker?(options: unknown): Promise<OpenHandle[]>;
}

const PICKER_TYPES = [{ description: 'Projet Sauna Garden 3D', accept: { [MIME_TYPE]: ['.json'] } }];

/** String fields and the only values they are allowed to take. */
const ALLOWED_STRINGS: Record<string, readonly string[]> = {
  constructionMode: ['solidWood', 'insulated']
};

function filePickers(): FilePickerApi {
  return window as unknown as FilePickerApi;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function serializeProject(project: SaunaProject): string {
  const payload: SaunaProjectFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    savedAt: new Date().toISOString(),
    config: project.config,
    site: project.site
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Rebuilds one configuration object from untrusted data: every expected key is read
 * individually and type checked, anything else is dropped, and a missing or invalid
 * value keeps its default. It is therefore impossible for a file to produce a
 * configuration the model cannot build.
 */
function sanitise<T extends object>(defaults: T, source: Record<string, unknown>): { value: T; recognised: number } {
  const result = { ...defaults };
  const target = result as unknown as Record<string, unknown>;
  const reference = defaults as unknown as Record<string, unknown>;
  let recognised = 0;

  for (const key of Object.keys(reference)) {
    const fallback = reference[key];
    const value = source[key];

    if (typeof fallback === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) {
        target[key] = value;
        recognised += 1;
      }
    } else if (typeof fallback === 'boolean') {
      if (typeof value === 'boolean') {
        target[key] = value;
        recognised += 1;
      }
    } else if (typeof fallback === 'string') {
      if (typeof value === 'string' && ALLOWED_STRINGS[key]?.includes(value)) {
        target[key] = value;
        recognised += 1;
      }
    }
  }

  return { value: result, recognised };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function parseProject(text: string): SaunaProject {
  const payload = JSON.parse(text) as unknown;
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Le fichier ne contient pas un objet JSON.');
  }
  const wrapper = asRecord(payload);
  // A file without the format envelope is read as a flat set of parameters.
  const configSource = 'config' in wrapper ? asRecord(wrapper.config) : wrapper;
  const siteSource = 'site' in wrapper ? asRecord(wrapper.site) : wrapper;

  const config = sanitise(cloneConfig(DEFAULT_SAUNA_CONFIG), configSource);
  const site = sanitise(cloneSiteConfig(DEFAULT_SITE_CONFIG), siteSource);

  if (config.recognised + site.recognised === 0) {
    throw new Error("Aucun paramètre reconnu : ce fichier n'est pas un projet de sauna.");
  }
  return { config: config.value, site: site.value };
}

/** Writes the project to disk, falling back to a plain download. */
export async function saveProjectToDisk(project: SaunaProject): Promise<SaveResult> {
  const text = serializeProject(project);
  const api = filePickers();

  if (api.showSaveFilePicker) {
    try {
      const handle = await api.showSaveFilePicker({ suggestedName: PROJECT_FILE_NAME, types: PICKER_TYPES });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { status: 'saved', filename: handle.name ?? PROJECT_FILE_NAME };
    } catch (error) {
      if (isAbort(error)) {
        return { status: 'cancelled' };
      }
      return { status: 'error', message: describe(error) };
    }
  }

  downloadTextFile(PROJECT_FILE_NAME, text, MIME_TYPE);
  return { status: 'downloaded', filename: PROJECT_FILE_NAME };
}

/** Reads a project from disk, falling back to a hidden file input. */
export async function loadProjectFromDisk(): Promise<LoadResult> {
  const api = filePickers();

  if (api.showOpenFilePicker) {
    try {
      const [handle] = await api.showOpenFilePicker({ multiple: false, types: PICKER_TYPES });
      if (!handle) {
        return { status: 'cancelled' };
      }
      const file = await handle.getFile();
      return { status: 'loaded', project: parseProject(await file.text()), filename: file.name };
    } catch (error) {
      if (isAbort(error)) {
        return { status: 'cancelled' };
      }
      return { status: 'error', message: describe(error) };
    }
  }

  return await readWithFileInput();
}

function readWithFileInput(): Promise<LoadResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('cancel', () => resolve({ status: 'cancelled' }));
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ status: 'cancelled' });
        return;
      }
      file
        .text()
        .then((text) => resolve({ status: 'loaded', project: parseProject(text), filename: file.name }))
        .catch((error: unknown) => resolve({ status: 'error', message: describe(error) }));
    });

    input.click();
  });
}

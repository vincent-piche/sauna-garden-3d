import { cloneConfig, DEFAULT_SAUNA_CONFIG, type SaunaConfig } from '../config/saunaConfig';
import { downloadTextFile } from './download';

export const CONFIG_FILE_NAME = 'sauna-config.json';
const FILE_FORMAT = 'sauna-garden-3d';
const FILE_VERSION = 1;
const MIME_TYPE = 'application/json';

export interface SaunaConfigFile {
  format: typeof FILE_FORMAT;
  version: number;
  savedAt: string;
  config: SaunaConfig;
}

export type SaveResult =
  | { status: 'saved'; filename: string }
  | { status: 'downloaded'; filename: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export type LoadResult =
  | { status: 'loaded'; config: SaunaConfig; filename: string }
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

const PICKER_TYPES = [
  { description: 'Configuration Sauna Garden 3D', accept: { [MIME_TYPE]: ['.json'] } }
];

function filePickers(): FilePickerApi {
  return window as unknown as FilePickerApi;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function serializeConfig(config: SaunaConfig): string {
  const payload: SaunaConfigFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    savedAt: new Date().toISOString(),
    config
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Reads a configuration file. Unknown keys are ignored and every missing or invalid
 * value falls back to the default, so a hand edited or outdated file can never
 * produce an unbuildable configuration.
 */
export function parseConfig(text: string): SaunaConfig {
  const payload = JSON.parse(text) as unknown;
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Le fichier ne contient pas un objet JSON.');
  }
  const wrapper = payload as Partial<SaunaConfigFile> & Record<string, unknown>;
  const source = (typeof wrapper.config === 'object' && wrapper.config !== null ? wrapper.config : wrapper) as Record<
    string,
    unknown
  >;

  const result = cloneConfig(DEFAULT_SAUNA_CONFIG);
  const target = result as unknown as Record<string, unknown>;
  let recognised = 0;

  for (const key of Object.keys(DEFAULT_SAUNA_CONFIG)) {
    const value = source[key];
    if (key === 'constructionMode') {
      if (value === 'solidWood' || value === 'insulated') {
        target[key] = value;
        recognised += 1;
      }
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      target[key] = value;
      recognised += 1;
    }
  }

  if (recognised === 0) {
    throw new Error("Aucun paramètre reconnu : ce fichier n'est pas une configuration de sauna.");
  }
  return result;
}

/** Writes the configuration to disk, falling back to a plain download. */
export async function saveConfigToDisk(config: SaunaConfig): Promise<SaveResult> {
  const text = serializeConfig(config);
  const api = filePickers();

  if (api.showSaveFilePicker) {
    try {
      const handle = await api.showSaveFilePicker({ suggestedName: CONFIG_FILE_NAME, types: PICKER_TYPES });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { status: 'saved', filename: handle.name ?? CONFIG_FILE_NAME };
    } catch (error) {
      if (isAbort(error)) {
        return { status: 'cancelled' };
      }
      return { status: 'error', message: describe(error) };
    }
  }

  downloadTextFile(CONFIG_FILE_NAME, text, MIME_TYPE);
  return { status: 'downloaded', filename: CONFIG_FILE_NAME };
}

/** Reads a configuration from disk, falling back to a hidden file input. */
export async function loadConfigFromDisk(): Promise<LoadResult> {
  const api = filePickers();

  if (api.showOpenFilePicker) {
    try {
      const [handle] = await api.showOpenFilePicker({ multiple: false, types: PICKER_TYPES });
      if (!handle) {
        return { status: 'cancelled' };
      }
      const file = await handle.getFile();
      return { status: 'loaded', config: parseConfig(await file.text()), filename: file.name };
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
        .then((text) => resolve({ status: 'loaded', config: parseConfig(text), filename: file.name }))
        .catch((error: unknown) => resolve({ status: 'error', message: describe(error) }));
    });

    input.click();
  });
}

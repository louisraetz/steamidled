import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from './atomicWrite.js';
import { log } from '../logging/logger.js';
import {
  mergeSettings,
  parseStoredSettings,
  settingsSchema,
  type Settings,
  type SettingsPatch,
} from '../settings/schema.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const SETTINGS_PATH = join(CONFIG_DIR, 'settings.json');

export type SettingsUpdate =
  | { ok: true; previous: Settings; settings: Settings }
  | { ok: false; reason: 'invalid'; message: string }
  | { ok: false; reason: 'unwritable' };

let current: Settings | null = null;

function readSettingsFile(): Settings {
  if (!existsSync(SETTINGS_PATH)) return parseStoredSettings({}).settings;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch (err) {
    log.warn('storage', `Could not read ${SETTINGS_PATH}, using the default settings`, {
      cause: err,
      hint: 'Fix or delete the file, or change any setting in the web GUI to rewrite it.',
      interactive: () => console.error(`Could not read ${SETTINGS_PATH}, using the default settings.`),
    });
    return parseStoredSettings({}).settings;
  }
  const { settings, invalidFields } = parseStoredSettings(raw);
  for (const field of invalidFields) {
    log.warn('storage', `Invalid "${field}" in ${SETTINGS_PATH}, using the default`, {
      hint: 'Fix the value in the file, or change the setting in the web GUI.',
      interactive: () => console.error(`Invalid "${field}" in ${SETTINGS_PATH}, using the default.`),
    });
  }
  return settings;
}

export function getSettings(): Settings {
  current ??= readSettingsFile();
  return current;
}

function writeSettings(settings: Settings): boolean {
  try {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    writeFileAtomic(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (err) {
    log.error('storage', `Could not save ${SETTINGS_PATH}`, {
      cause: err,
      hint: 'Check that ~/.steam-idler is writable.',
      interactive: () => console.error(`Could not save ${SETTINGS_PATH}: ${(err as Error).message}`),
    });
    return false;
  }
}

export function updateSettings(patch: SettingsPatch): SettingsUpdate {
  const previous = getSettings();
  const result = settingsSchema.safeParse(mergeSettings(previous, patch));
  if (!result.success) {
    return { ok: false, reason: 'invalid', message: result.error.issues[0]?.message ?? 'Invalid settings.' };
  }
  if (!writeSettings(result.data)) return { ok: false, reason: 'unwritable' };
  current = result.data;
  return { ok: true, previous, settings: result.data };
}

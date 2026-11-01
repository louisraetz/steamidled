import { SETTINGS_PATH, SETTINGS_SECTIONS } from '../constants/sections';
import type { SettingsSectionKey } from '../types/settings-section';

export function parseSection(value: string | undefined): SettingsSectionKey | null {
  return SETTINGS_SECTIONS.find((section) => section.value === value)?.value ?? null;
}

export function sectionPath(section: string): string {
  return `${SETTINGS_PATH}/${section}`;
}

export function isSettingsPath(path: string): boolean {
  return path === SETTINGS_PATH || path.startsWith(`${SETTINGS_PATH}/`);
}

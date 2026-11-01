import type { SettingsSectionKey } from '../types/settings-section';

export const SETTINGS_PATH = '/settings';

export const SETTINGS_SECTIONS: readonly { value: SettingsSectionKey; label: string }[] = [
  { value: 'schedule', label: 'Schedule' },
  { value: 'steam', label: 'Steam' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'account', label: 'Account' },
];

export const DEFAULT_SECTION: SettingsSectionKey = 'schedule';

export const RAIL_LABEL = 'Settings sections';

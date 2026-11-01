export type ViewName = 'idling' | 'logs' | 'settings';

export const VIEWS: { value: ViewName; label: string; path: string }[] = [
  { value: 'idling', label: 'Idling', path: '/idling' },
  { value: 'logs', label: 'Logs', path: '/logs' },
  { value: 'settings', label: 'Settings', path: '/settings' },
];

export const DEFAULT_PATH = '/idling';

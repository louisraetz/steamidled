export type ViewName = 'idling' | 'logs' | 'settings';

export const VIEWS: { value: ViewName; label: string; path: string; nested: boolean }[] = [
  { value: 'idling', label: 'Idling', path: '/idling', nested: false },
  { value: 'logs', label: 'Logs', path: '/logs', nested: false },
  { value: 'settings', label: 'Settings', path: '/settings', nested: true },
];

export const DEFAULT_PATH = '/idling';

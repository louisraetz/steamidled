export type ViewName = 'idling' | 'library' | 'logs' | 'settings';

export const VIEWS: { value: ViewName; label: string; path: string }[] = [
  { value: 'idling', label: 'Idling', path: '/idling' },
  { value: 'library', label: 'Library', path: '/library' },
  { value: 'logs', label: 'Logs', path: '/logs' },
  { value: 'settings', label: 'Settings', path: '/settings' },
];

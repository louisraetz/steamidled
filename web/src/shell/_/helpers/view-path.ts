import { DEFAULT_PATH, VIEWS, type ViewName } from '../constants/views';

export function viewFromPath(path: string): ViewName | null {
  return VIEWS.find((view) => view.path === path)?.value ?? null;
}

export function pathForView(view: string): string {
  return VIEWS.find((entry) => entry.value === view)?.path ?? DEFAULT_PATH;
}

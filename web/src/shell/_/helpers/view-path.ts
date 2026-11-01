import { DEFAULT_PATH, VIEWS, type ViewName } from '../constants/views';

function matchesView(path: string, view: (typeof VIEWS)[number]): boolean {
  if (path === view.path) return true;
  return view.nested && path.startsWith(`${view.path}/`);
}

export function viewFromPath(path: string): ViewName | null {
  return VIEWS.find((view) => matchesView(path, view))?.value ?? null;
}

export function pathForView(view: string): string {
  return VIEWS.find((entry) => entry.value === view)?.path ?? DEFAULT_PATH;
}

export function errorMessage(error: Error | null): string | null {
  if (!error) return null;
  const hint = 'hint' in error && typeof error.hint === 'string' ? ` ${error.hint}` : '';
  return `${error.message}${hint}`;
}

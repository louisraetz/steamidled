export function errorText(error: Error, prefix?: string): string {
  const message = error.message.replace(/\.$/, '');
  if (!prefix) return `${message}.`;
  return `${prefix} ${message}.`;
}

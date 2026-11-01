export function draftSummary(added: number, removed: number): string {
  const parts = [];
  if (added > 0) parts.push(`${added} to add`);
  if (removed > 0) parts.push(`${removed} to remove`);
  return parts.join(' · ');
}

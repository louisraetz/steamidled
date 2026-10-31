export function LogHint({ hint }: { hint: string | null }) {
  if (!hint) return null;
  return <p className="text-muted-foreground">Fix: {hint}</p>;
}

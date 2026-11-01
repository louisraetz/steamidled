export function SettingsSectionDescription({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="max-w-prose text-muted-foreground">{text}</p>;
}

export function SessionGain({ value, counting }: { value: string; counting: boolean }) {
  return (
    <span data-counting={counting} className="font-mono text-tertiary data-[counting=true]:text-foreground">
      {value}
    </span>
  );
}

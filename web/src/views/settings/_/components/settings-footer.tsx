import { useDaemonState } from '@/hooks/use-daemon-state';
import { GITHUB_URL } from '@/lib/constants';

export function SettingsFooter() {
  const version = useDaemonState((snapshot) => snapshot.version);
  return (
    <footer className="text-sm text-muted-foreground">
      <span className="font-mono">steamidled</span> <span className="font-mono">{version}</span> ·{' '}
      <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
        GitHub
      </a>
    </footer>
  );
}

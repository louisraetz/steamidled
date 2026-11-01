import { Spinner } from '@/components/ui/spinner';

export function QrScannedNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex flex-col items-center gap-3 px-2 text-center text-foreground animate-in duration-200 ease-out fade-in-0 motion-reduce:animate-none">
      <Spinner className="size-5" />
      <p className="text-balance">Scanned. Approve the sign-in in the Steam app.</p>
    </div>
  );
}

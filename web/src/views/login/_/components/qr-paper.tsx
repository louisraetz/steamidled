import type { ReactNode } from 'react';

export function QrPaper({ scanned, children }: { scanned: boolean; children: ReactNode }) {
  return (
    <div
      data-scanned={scanned}
      className="grid size-54 place-items-center rounded-xl bg-foreground p-3 transition-colors duration-200 ease-out *:col-start-1 *:row-start-1 data-[scanned=true]:bg-muted motion-reduce:transition-none"
    >
      {children}
    </div>
  );
}

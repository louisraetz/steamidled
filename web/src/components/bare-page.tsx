import type { ReactNode } from 'react';
import { Wordmark } from './wordmark';

export function BarePage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-12 items-center sm:h-14">
        <Wordmark />
      </div>
      {children}
    </div>
  );
}

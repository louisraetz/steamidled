import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';

const pageVariants = cva('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', {
  variants: {
    layout: {
      default: 'py-6',
      fill: 'flex min-h-full flex-col pt-6',
      screen: 'flex h-full min-h-0 flex-col pt-6 pb-4',
    },
  },
  defaultVariants: {
    layout: 'default',
  },
});

export function Page({ children, layout }: { children: ReactNode; layout?: 'default' | 'fill' | 'screen' }) {
  return <div className={pageVariants({ layout })}>{children}</div>;
}

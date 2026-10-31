import { useRef, useState } from 'react';
import { COPY_FEEDBACK_MS } from '@/lib/constants';

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return { copied, copy };
}

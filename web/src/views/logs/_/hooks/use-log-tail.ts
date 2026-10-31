import { useLayoutEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/lib/types';
import { isNearBottom } from '../helpers/is-near-bottom';

export function useLogTail(entries: LogEntry[]) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const seenIdRef = useRef(0);
  const [unseen, setUnseen] = useState(0);
  const lastId = entries.at(-1)?.id ?? 0;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (followRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      seenIdRef.current = lastId;
      setUnseen(0);
      return;
    }
    setUnseen(entries.filter((entry) => entry.id > seenIdRef.current).length);
  }, [entries, lastId]);

  const onScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    followRef.current = isNearBottom(viewport);
    if (!followRef.current) return;
    seenIdRef.current = lastId;
    setUnseen(0);
  };

  const jumpToEnd = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    followRef.current = true;
    viewport.scrollTop = viewport.scrollHeight;
    seenIdRef.current = lastId;
    setUnseen(0);
  };

  return { viewportRef, onScroll, unseen, jumpToEnd };
}

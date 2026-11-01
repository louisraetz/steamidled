import { useRef, useState } from 'react';
import { SAVED_FLASH_MS } from '../constants/settings';

export function useSavedFlash<Key extends string>() {
  const [key, setKey] = useState<Key | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = (next: Key) => {
    clearTimeout(timer.current);
    setKey(next);
    timer.current = setTimeout(() => setKey(null), SAVED_FLASH_MS);
  };
  return { key, flash };
}

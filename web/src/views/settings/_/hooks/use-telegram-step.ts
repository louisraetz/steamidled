import { useState } from 'react';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { stepOf } from '../helpers/telegram-step';
import type { TelegramServerState } from '../types/telegram-step';

export function useTelegramStep() {
  const telegram = useDaemonState((snapshot) => snapshot.telegram);
  const [editingFrom, setEditingFrom] = useState<TelegramServerState | null>(null);
  const state = telegram?.state ?? 'off';
  return {
    step: stepOf(state, editingFrom),
    botUsername: telegram?.botUsername ?? null,
    chatLabel: telegram?.chatLabel ?? null,
    startEditing: () => setEditingFrom(state),
    stopEditing: () => setEditingFrom(null),
  };
}

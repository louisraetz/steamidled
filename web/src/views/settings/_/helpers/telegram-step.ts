import type { TelegramServerState, TelegramStep } from '../types/telegram-step';

export function stepOf(state: TelegramServerState, editingFrom: TelegramServerState | null): TelegramStep {
  if (state === 'awaiting-start') return 'waiting';
  if (editingFrom === state) return 'token';
  return state;
}

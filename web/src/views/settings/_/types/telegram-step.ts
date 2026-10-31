import type { TelegramSnapshot } from '@/lib/types';

export type TelegramStep = 'off' | 'token' | 'waiting' | 'connected';

export type TelegramServerState = TelegramSnapshot['state'];

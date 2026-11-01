import type { LoginFlowState } from '@/lib/types';

export type QrChallengeState = Extract<LoginFlowState, { method: 'qr'; status: 'pending' | 'scanned' }>;

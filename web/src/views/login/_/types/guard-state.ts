import type { LoginFlowState } from '@/lib/types';

export type GuardState = Extract<LoginFlowState, { status: 'guard' }>;

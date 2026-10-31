export type LoginStage = 'main' | 'guard' | 'signing-in' | 'expired';

export type PasswordProblem = { kind: 'alert'; title: string; body: string } | { kind: 'field'; message: string } | null;

export type LoginMethod = 'qr' | 'password';

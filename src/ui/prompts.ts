import { select } from '@inquirer/prompts';
import type { AuthMethod } from '../types/index.js';

// Displays authentication method selection prompt
export async function promptAuthMethod(hasStored: boolean): Promise<AuthMethod | 'stored'> {
  const choices: Array<{ name: string; value: AuthMethod | 'stored'; description: string }> = [];

  if (hasStored) {
    choices.push({
      name: 'Use saved login',
      value: 'stored',
      description: 'Login with your saved credentials',
    });
  }

  choices.push(
    {
      name: 'QR Code',
      value: 'qr',
      description: 'Scan QR code with Steam mobile app (recommended)',
    },
    {
      name: 'Username & Password',
      value: 'credentials',
      description: 'Login with your Steam credentials',
    }
  );

  return select({
    message: 'How would you like to login?',
    choices,
  });
}

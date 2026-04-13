import { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } from 'steam-session';
import qrcode from 'qrcode-terminal';
import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import type { SteamClient } from './client.js';
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  hasStoredCredentials,
} from '../storage/credentials.js';
import type { LoginResult, AuthMethod } from '../types/index.js';

// Authenticates via QR code scanned with the Steam mobile app
export async function loginWithQR(client: SteamClient): Promise<LoginResult> {
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient);

  return new Promise((resolve) => {
    session.on('authenticated', async () => {
      const refreshToken = session.refreshToken;
      const accountName = session.accountName;

      if (!refreshToken || !accountName) {
        resolve({ success: false, error: 'Failed to get credentials from QR login' });
        return;
      }

      saveCredentials({
        accountName,
        refreshToken,
      });

      try {
        await client.loginWithRefreshToken(refreshToken, accountName);
        resolve({ success: true, accountName });
      } catch (err) {
        resolve({ success: false, error: (err as Error).message });
      }
    });

    session.on('timeout', () => {
      resolve({ success: false, error: 'QR code timed out' });
    });

    session.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    session.startWithQR().then((result) => {
      if (result.qrChallengeUrl) {
        console.log(chalk.cyan('\nScan this QR code with your Steam mobile app:\n'));
        qrcode.generate(result.qrChallengeUrl);
        console.log(chalk.gray('\nWaiting for approval...\n'));
      }
    });
  });
}

// Authenticates via username and password with Steam Guard support
export async function loginWithCredentials(client: SteamClient): Promise<LoginResult> {
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient);

  const accountName = await input({
    message: 'Steam username:',
  });

  const password = await passwordPrompt({
    message: 'Steam password:',
    mask: '*',
  });

  const spinner = ora('Logging in...').start();

  return new Promise((resolve) => {
    session.on('authenticated', async () => {
      spinner.stop();
      const refreshToken = session.refreshToken;

      if (!refreshToken) {
        resolve({ success: false, error: 'Failed to get refresh token' });
        return;
      }

      saveCredentials({
        accountName,
        refreshToken,
      });

      try {
        await client.loginWithRefreshToken(refreshToken, accountName);
        resolve({ success: true, accountName });
      } catch (err) {
        resolve({ success: false, error: (err as Error).message });
      }
    });

    session.on('timeout', () => {
      spinner.stop();
      resolve({ success: false, error: 'Login timed out' });
    });

    session.on('error', (err) => {
      spinner.stop();
      resolve({ success: false, error: err.message });
    });

    session.on('steamGuardMachineToken', () => {
    });

    session.startWithCredentials({ accountName, password }).then(async (result) => {
      if (result.actionRequired) {
        spinner.stop();
        for (const action of result.validActions || []) {
          if (
            action.type === EAuthSessionGuardType.EmailCode ||
            action.type === EAuthSessionGuardType.DeviceCode
          ) {
            const guardType =
              action.type === EAuthSessionGuardType.EmailCode ? 'email' : 'mobile app';
            console.log(chalk.yellow(`\nSteam Guard code required (${guardType})`));

            const code = await input({
              message: 'Enter Steam Guard code:',
            });

            spinner.start('Verifying code...');

            try {
              await session.submitSteamGuardCode(code);
            } catch (err) {
              spinner.stop();
              resolve({ success: false, error: (err as Error).message });
            }
            break;
          }

          if (action.type === EAuthSessionGuardType.DeviceConfirmation) {
            console.log(
              chalk.yellow('\nPlease confirm the login request on your Steam mobile app...')
            );
            spinner.start('Waiting for confirmation...');
            break;
          }
        }
      }
    }).catch((err) => {
      spinner.stop();
      resolve({ success: false, error: err.message });
    });
  });
}

// Logs in using a previously saved refresh token
export async function loginWithStoredCredentials(client: SteamClient): Promise<LoginResult> {
  const credentials = loadCredentials();

  if (!credentials) {
    return { success: false, error: 'No stored credentials' };
  }

  const spinner = ora(`Logging in as ${chalk.cyan(credentials.accountName)}...`).start();

  try {
    await client.loginWithRefreshToken(credentials.refreshToken, credentials.accountName);
    spinner.succeed(`Logged in as ${chalk.cyan(credentials.accountName)}`);
    return { success: true, accountName: credentials.accountName };
  } catch (err) {
    spinner.fail('Stored credentials expired');
    clearCredentials();
    return { success: false, error: 'Stored credentials expired' };
  }
}

// Checks if stored login credentials exist
export function hasStoredLogin(): boolean {
  return hasStoredCredentials();
}

export { clearCredentials };

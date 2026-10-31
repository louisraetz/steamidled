import { setTimeout as delay } from 'node:timers/promises';
import { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } from 'steam-session';
import qrcode from 'qrcode-terminal';
import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';
import type { SteamClient } from './client.js';
import { createSpinner } from '../ui/spinner.js';
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  hasStoredCredentials,
} from '../storage/credentials.js';
import { INVALID_TOKEN_ERESULTS } from '../constants.js';
import type { LoginResult, StoredCredentials } from '../types/index.js';

export const LOGIN_TIMEOUT_MS = 120_000;
export const GUARD_CODE_ATTEMPTS = 3;
const CLIENT_IDLE_WAIT_MS = 10_000;
const CLIENT_IDLE_POLL_MS = 250;

interface GuardAction {
  type: number;
  detail?: string;
}

async function waitForIdleClient(client: SteamClient): Promise<boolean> {
  const deadline = Date.now() + CLIENT_IDLE_WAIT_MS;
  while (client.isConnected || client.isReconnecting || client.isConnecting) {
    if (Date.now() >= deadline) return false;
    await delay(CLIENT_IDLE_POLL_MS);
  }
  return true;
}

export async function completeLogin(
  client: SteamClient,
  credentials: StoredCredentials
): Promise<LoginResult> {
  if (!(await waitForIdleClient(client))) {
    return {
      success: false,
      error: 'Steam is still busy with the previous session. Try again in a moment.',
    };
  }
  saveCredentials(credentials);
  try {
    await client.loginWithRefreshToken(credentials.refreshToken, credentials.accountName);
    return { success: true, accountName: credentials.accountName };
  } catch (err) {
    const e = err as Error & { eresult?: number };
    return { success: false, error: e.message, eresult: e.eresult };
  }
}

export async function loginWithQR(client: SteamClient): Promise<LoginResult> {
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient);
  session.loginTimeout = LOGIN_TIMEOUT_MS;

  return new Promise((resolve) => {
    session.on('authenticated', async () => {
      const refreshToken = session.refreshToken;
      const accountName = session.accountName;

      if (!refreshToken || !accountName) {
        resolve({ success: false, error: 'Failed to get credentials from QR login' });
        return;
      }

      resolve(await completeLogin(client, { accountName, refreshToken }));
    });

    session.on('remoteInteraction', () => {
      console.log(chalk.gray('  QR scanned — approve the login in the Steam app...'));
    });

    session.on('timeout', () => {
      resolve({ success: false, error: 'QR code timed out' });
    });

    session.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    session
      .startWithQR()
      .then((result) => {
        if (result.qrChallengeUrl) {
          console.log(chalk.cyan('\nScan this QR code with your Steam mobile app:\n'));
          qrcode.generate(result.qrChallengeUrl, { small: true });
          console.log(chalk.gray('\nWaiting for approval...\n'));
        }
      })
      .catch((err: Error) => {
        resolve({ success: false, error: err.message });
      });
  });
}

export async function loginWithCredentials(client: SteamClient): Promise<LoginResult> {
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient);
  session.loginTimeout = LOGIN_TIMEOUT_MS;

  const typedAccountName = await input({
    message: 'Steam username:',
  });

  const password = await passwordPrompt({
    message: 'Steam password:',
    mask: '*',
  });

  const spinner = createSpinner('Logging in...').start();
  const promptAbort = new AbortController();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LoginResult): void => {
      if (settled) return;
      settled = true;
      spinner.stop();
      promptAbort.abort();
      session.cancelLoginAttempt();
      resolve(result);
    };

    const promptGuardCode = async (action: GuardAction): Promise<void> => {
      const isEmail = action.type === EAuthSessionGuardType.EmailCode;
      const source = isEmail ? `email${action.detail ? ` to ${action.detail}` : ''}` : 'mobile app';
      console.log(chalk.yellow(`\nSteam Guard code required (${source})`));

      for (let attempt = 1; attempt <= GUARD_CODE_ATTEMPTS && !settled; attempt++) {
        let code: string;
        try {
          code = await input({ message: 'Enter Steam Guard code:' }, { signal: promptAbort.signal });
        } catch (err) {
          if ((err as Error).name !== 'AbortPromptError') {
            finish({ success: false, error: 'Login cancelled' });
          }
          return;
        }
        spinner.start('Verifying code...');
        try {
          await session.submitSteamGuardCode(code);
          return;
        } catch (err) {
          spinner.stop();
          if (settled || promptAbort.signal.aborted) return;
          const message = (err as Error).message;
          if (attempt === GUARD_CODE_ATTEMPTS) {
            finish({ success: false, error: `Steam Guard failed: ${message}` });
          } else {
            console.log(chalk.red(`  Code rejected (${message}). Try again.`));
          }
        }
      }
    };

    session.on('authenticated', async () => {
      promptAbort.abort();
      const refreshToken = session.refreshToken;
      const accountName = session.accountName || typedAccountName;

      if (!refreshToken) {
        finish({ success: false, error: 'Failed to get refresh token' });
        return;
      }

      finish(await completeLogin(client, { accountName, refreshToken }));
    });

    session.on('timeout', () => {
      finish({ success: false, error: 'Login timed out' });
    });

    session.on('error', (err) => {
      finish({ success: false, error: err.message });
    });

    session
      .startWithCredentials({ accountName: typedAccountName, password })
      .then((result) => {
        if (!result.actionRequired) return;
        spinner.stop();
        const actions = (result.validActions ?? []) as GuardAction[];
        const codeAction = actions.find(
          (a) =>
            a.type === EAuthSessionGuardType.EmailCode || a.type === EAuthSessionGuardType.DeviceCode
        );
        const canConfirm = actions.some((a) => a.type === EAuthSessionGuardType.DeviceConfirmation);
        const canEmailConfirm = actions.some(
          (a) => a.type === EAuthSessionGuardType.EmailConfirmation
        );

        if (canConfirm) {
          console.log(
            chalk.yellow(
              codeAction
                ? '\nConfirm the login in your Steam mobile app, or enter the code below.'
                : '\nPlease confirm the login request on your Steam mobile app...'
            )
          );
        } else if (canEmailConfirm) {
          console.log(chalk.yellow('\nConfirm the login via the link Steam just emailed you...'));
        }
        if (codeAction) {
          void promptGuardCode(codeAction);
        } else {
          spinner.start('Waiting for confirmation...');
        }
      })
      .catch((err: Error) => {
        finish({ success: false, error: err.message });
      });
  });
}

export async function loginWithStoredCredentials(client: SteamClient): Promise<LoginResult> {
  const credentials = loadCredentials();

  if (!credentials) {
    return { success: false, error: 'No stored credentials' };
  }

  const spinner = createSpinner(`Logging in as ${chalk.cyan(credentials.accountName)}...`).start();

  try {
    await client.loginWithRefreshToken(credentials.refreshToken, credentials.accountName);
    spinner.succeed(`Logged in as ${chalk.cyan(credentials.accountName)}`);
    return { success: true, accountName: credentials.accountName };
  } catch (err) {
    const e = err as Error & { eresult?: number };
    if (e.eresult !== undefined && INVALID_TOKEN_ERESULTS.has(e.eresult)) {
      spinner.fail('Stored credentials expired');
      clearCredentials();
      return { success: false, error: 'Stored credentials expired — log in again', eresult: e.eresult };
    }
    const label = e.eresult !== undefined ? `${e.message} (eresult ${e.eresult})` : e.message;
    spinner.fail(`Login failed: ${label}`);
    return {
      success: false,
      error: `${label} — stored credentials kept, retry later`,
      eresult: e.eresult,
    };
  }
}

export function hasStoredLogin(): boolean {
  return hasStoredCredentials();
}

export { clearCredentials };

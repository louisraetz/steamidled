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
import type { LoginResult } from '../types/index.js';

// EResults that mean the stored refresh token itself is bad. Only these justify
// deleting credentials.json — a network blip, Steam outage or rate limit at
// startup must not brick a headless daemon into "run interactively first".
const INVALID_TOKEN_ERESULTS = new Set<number>([
  5, 15, 26, 27, 126, // InvalidPassword, AccessDenied, Revoked, Expired, CachedCredentialInvalid
]);
// steam-session gives up polling after 30s by default — too short to find the
// phone, open the app and approve.
const LOGIN_TIMEOUT_MS = 120_000;
const GUARD_CODE_ATTEMPTS = 3;

interface GuardAction {
  type: number;
  detail?: string;
}

// Authenticates via QR code scanned with the Steam mobile app
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

// Authenticates via username and password with Steam Guard support
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
  // Closes an open Steam Guard code prompt when the login settles another way
  // (phone approval, timeout, error), so two prompts never fight over stdin.
  const promptAbort = new AbortController();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LoginResult): void => {
      if (settled) return;
      settled = true;
      spinner.stop();
      promptAbort.abort();
      // Stop steam-session's polling, or a phone approval after we gave up
      // would still log the client on behind the method picker.
      session.cancelLoginAttempt();
      resolve(result);
    };

    // Asks for a Steam Guard code, re-prompting on a rejected code. Returns
    // silently when the prompt was aborted because the login settled elsewhere.
    const promptGuardCode = async (action: GuardAction): Promise<void> => {
      const isEmail = action.type === EAuthSessionGuardType.EmailCode;
      const source = isEmail ? `email${action.detail ? ` to ${action.detail}` : ''}` : 'mobile app';
      console.log(chalk.yellow(`\nSteam Guard code required (${source})`));

      for (let attempt = 1; attempt <= GUARD_CODE_ATTEMPTS && !settled; attempt++) {
        let code: string;
        try {
          code = await input({ message: 'Enter Steam Guard code:' }, { signal: promptAbort.signal });
        } catch (err) {
          // AbortPromptError: the login settled elsewhere (phone approval,
          // timeout, error). Anything else is Ctrl+C: with email Steam Guard
          // nothing polls, so without this the login would never settle.
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
          // The approval may have landed while this code was in flight: the
          // library then cancels the attempt and this rejection is noise.
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
      // Steam accepted the login (e.g. phone approval): close the code prompt
      // right away so nothing can be submitted into a finished session.
      promptAbort.abort();
      const refreshToken = session.refreshToken;
      // Steam's canonical account name keys the favorites file; the typed one
      // may differ in case and would split favorites across two files.
      const accountName = session.accountName || typedAccountName;

      if (!refreshToken) {
        finish({ success: false, error: 'Failed to get refresh token' });
        return;
      }

      saveCredentials({
        accountName,
        refreshToken,
      });

      try {
        await client.loginWithRefreshToken(refreshToken, accountName);
        finish({ success: true, accountName });
      } catch (err) {
        finish({ success: false, error: (err as Error).message });
      }
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

// Logs in using a previously saved refresh token
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

// Checks if stored login credentials exist
export function hasStoredLogin(): boolean {
  return hasStoredCredentials();
}

export { clearCredentials };

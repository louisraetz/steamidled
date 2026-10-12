import { readFileSync, existsSync, mkdirSync, unlinkSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from './atomicWrite.js';
import type { StoredCredentials } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

// Ensures the config directory exists, creating it if necessary
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

// Saves user credentials to a JSON file for persistent login.
// Owner-only perms (0600) — the file holds a Steam refresh token.
// Returns false (and warns) instead of throwing when the directory is not
// writable, so a login still completes for this session.
export function saveCredentials(credentials: StoredCredentials): boolean {
  try {
    ensureConfigDir();
    writeFileAtomic(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 0o600);
    return true;
  } catch (err) {
    console.error(`Could not save credentials to ${CREDENTIALS_FILE}: ${(err as Error).message}`);
    return false;
  }
}

// A Steam refresh token is a JWT whose payload has iss "steam" and "client" in
// aud. steam-user decodes it inside process.nextTick and throws uncatchably on
// anything else (and logs on anonymously when handed undefined), so a token
// that would not pass its checks is treated as "no credentials" instead.
function isSteamRefreshToken(token: string): boolean {
  const segments = token.split('.');
  if (segments.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8')) as {
      iss?: unknown;
      aud?: unknown;
      sub?: unknown;
    };
    return (
      payload.iss === 'steam' &&
      Array.isArray(payload.aud) &&
      payload.aud.includes('client') &&
      typeof payload.sub === 'string'
    );
  } catch {
    return false;
  }
}

function isValidCredentials(value: unknown): value is StoredCredentials {
  if (!value || typeof value !== 'object') return false;
  const { accountName, refreshToken } = value as Record<string, unknown>;
  return (
    typeof accountName === 'string' &&
    accountName.length > 0 &&
    typeof refreshToken === 'string' &&
    isSteamRefreshToken(refreshToken)
  );
}

// Loads stored credentials from the JSON file, returning null if not found or
// unusable. A corrupt file is removed so the next start does not loop on it; a
// file that merely could not be read (permissions, I/O) is left alone.
export function loadCredentials(): StoredCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }

  // Migrate older world-readable files written before 0600 was enforced.
  try {
    chmodSync(CREDENTIALS_FILE, 0o600);
  } catch {
    // Platforms without POSIX perms (or a perms error) — best effort only.
  }

  let raw: string;
  try {
    raw = readFileSync(CREDENTIALS_FILE, 'utf-8');
  } catch (err) {
    console.error(`Could not read ${CREDENTIALS_FILE}: ${(err as Error).message}`);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!isValidCredentials(parsed)) {
    console.error(`Ignoring unreadable credentials file ${CREDENTIALS_FILE} — log in again.`);
    clearCredentials();
    return null;
  }
  return parsed;
}

// Deletes the stored credentials file
export function clearCredentials(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  } catch (err) {
    console.error(`Could not remove ${CREDENTIALS_FILE}: ${(err as Error).message}`);
  }
}

// Checks if usable stored credentials exist
export function hasStoredCredentials(): boolean {
  return loadCredentials() !== null;
}

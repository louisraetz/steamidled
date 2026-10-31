import { readFileSync, existsSync, mkdirSync, unlinkSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from './atomicWrite.js';
import type { StoredCredentials } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

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

export function loadCredentials(): StoredCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }

  try {
    chmodSync(CREDENTIALS_FILE, 0o600);
  } catch {
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

export function clearCredentials(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  } catch (err) {
    console.error(`Could not remove ${CREDENTIALS_FILE}: ${(err as Error).message}`);
  }
}

export function hasStoredCredentials(): boolean {
  return loadCredentials() !== null;
}

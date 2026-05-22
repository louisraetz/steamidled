import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
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
export function saveCredentials(credentials: StoredCredentials): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

// Loads stored credentials from the JSON file, returning null if not found
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

  try {
    const data = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data) as StoredCredentials;
  } catch {
    return null;
  }
}

// Deletes the stored credentials file
export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}

// Checks if a credentials file exists
export function hasStoredCredentials(): boolean {
  return existsSync(CREDENTIALS_FILE);
}

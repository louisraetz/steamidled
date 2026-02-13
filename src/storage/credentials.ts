import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { StoredCredentials } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

// Ensures the config directory exists, creating it if necessary
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// Saves user credentials to a JSON file for persistent login
export function saveCredentials(credentials: StoredCredentials): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 'utf-8');
}

// Loads stored credentials from the JSON file, returning null if not found
export function loadCredentials(): StoredCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
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

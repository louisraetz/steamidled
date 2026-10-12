import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from './atomicWrite.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');

interface FavoritesData {
  favorites: number[];
  exemptAppId?: number | null;
}

// Constructs the path to an account-specific favorites JSON file
function getFavoritesPath(accountName: string): string {
  return join(CONFIG_DIR, `favorites-${accountName}.json`);
}

// Ensures the config directory exists, creating it if necessary
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

// Reads the favorites file with defaults so writes can preserve sibling fields
function readData(accountName: string): FavoritesData {
  const filePath = getFavoritesPath(accountName);
  if (!existsSync(filePath)) {
    return { favorites: [], exemptAppId: null };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as FavoritesData;
    return {
      favorites: parsed.favorites || [],
      exemptAppId: parsed.exemptAppId ?? null,
    };
  } catch {
    return { favorites: [], exemptAppId: null };
  }
}

// Writes the favorites file. A read-only config dir returns false instead of
// throwing, so a keypress in the selector can never take the idler down.
function writeData(accountName: string, data: FavoritesData): boolean {
  const filePath = getFavoritesPath(accountName);
  try {
    ensureConfigDir();
    writeFileAtomic(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Could not save ${filePath}: ${(err as Error).message}`);
    return false;
  }
}

// Saves the list of favorite game IDs to a JSON file; false if it could not be written
export function saveFavorites(accountName: string, favorites: number[]): boolean {
  const data = readData(accountName);
  data.favorites = favorites;
  return writeData(accountName, data);
}

// Loads favorite game IDs from the JSON file, returning empty array if not found
export function loadFavorites(accountName: string): number[] {
  return readData(accountName).favorites;
}

// Loads the exempt appid (game excluded from the randomizer), or null if none
export function loadExempt(accountName: string): number | null {
  return readData(accountName).exemptAppId ?? null;
}

// Saves the exempt appid (or null to clear); false if it could not be written
export function saveExempt(accountName: string, exemptAppId: number | null): boolean {
  const data = readData(accountName);
  data.exemptAppId = exemptAppId;
  return writeData(accountName, data);
}

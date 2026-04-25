import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
    mkdirSync(CONFIG_DIR, { recursive: true });
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

function writeData(accountName: string, data: FavoritesData): void {
  ensureConfigDir();
  writeFileSync(getFavoritesPath(accountName), JSON.stringify(data, null, 2), 'utf-8');
}

// Saves the list of favorite game IDs to a JSON file
export function saveFavorites(accountName: string, favorites: number[]): void {
  const data = readData(accountName);
  data.favorites = favorites;
  writeData(accountName, data);
}

// Loads favorite game IDs from the JSON file, returning empty array if not found
export function loadFavorites(accountName: string): number[] {
  return readData(accountName).favorites;
}

// Loads the exempt appid (game excluded from the randomizer), or null if none
export function loadExempt(accountName: string): number | null {
  return readData(accountName).exemptAppId ?? null;
}

// Saves the exempt appid (or null to clear)
export function saveExempt(accountName: string, exemptAppId: number | null): void {
  const data = readData(accountName);
  data.exemptAppId = exemptAppId;
  writeData(accountName, data);
}

// Adds a game to the favorites list if not already present
export function addFavorite(accountName: string, appid: number): void {
  const favorites = loadFavorites(accountName);
  if (!favorites.includes(appid)) {
    favorites.push(appid);
    saveFavorites(accountName, favorites);
  }
}

// Removes a game from the favorites list
export function removeFavorite(accountName: string, appid: number): void {
  const favorites = loadFavorites(accountName);
  const index = favorites.indexOf(appid);
  if (index !== -1) {
    favorites.splice(index, 1);
    saveFavorites(accountName, favorites);
  }
}

// Checks if a game is in the favorites list
export function isFavorite(accountName: string, appid: number): boolean {
  const favorites = loadFavorites(accountName);
  return favorites.includes(appid);
}

// Toggles a game's favorite status and returns the new state
export function toggleFavorite(accountName: string, appid: number): boolean {
  const favorites = loadFavorites(accountName);
  const index = favorites.indexOf(appid);

  if (index !== -1) {
    favorites.splice(index, 1);
    saveFavorites(accountName, favorites);
    return false; // No longer a favorite
  } else {
    favorites.push(appid);
    saveFavorites(accountName, favorites);
    return true; // Now a favorite
  }
}

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from './atomicWrite.js';
import { log } from '../logging/logger.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');

interface FavoritesData {
  favorites: number[];
  exemptAppId?: number | null;
}

function getFavoritesPath(accountName: string): string {
  return join(CONFIG_DIR, `favorites-${accountName}.json`);
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

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

function writeData(accountName: string, data: FavoritesData): boolean {
  const filePath = getFavoritesPath(accountName);
  try {
    ensureConfigDir();
    writeFileAtomic(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    log.error('storage', `Could not save ${filePath}`, {
      cause: err,
      hint: 'Check that ~/.steam-idler is writable.',
      interactive: () => console.error(`Could not save ${filePath}: ${(err as Error).message}`),
    });
    return false;
  }
}

export function saveFavorites(accountName: string, favorites: number[]): boolean {
  const data = readData(accountName);
  data.favorites = favorites;
  return writeData(accountName, data);
}

export function loadFavorites(accountName: string): number[] {
  return readData(accountName).favorites;
}

export function loadExempt(accountName: string): number | null {
  return readData(accountName).exemptAppId ?? null;
}

export function saveExempt(accountName: string, exemptAppId: number | null): boolean {
  const data = readData(accountName);
  data.exemptAppId = exemptAppId;
  return writeData(accountName, data);
}

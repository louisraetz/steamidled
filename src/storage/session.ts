import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { writeFileAtomic } from './atomicWrite.js';
import { log } from '../logging/logger.js';
import type { IdlingGame } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');

const savedGameSchema = z.object({
  idleRemainingMs: z.number().nonnegative().nullable().catch(null),
  pauseUntil: z.number().positive().nullable().catch(null),
});

const savedSessionSchema = z.object({
  appIds: z.array(z.number().int().positive()),
  games: z.record(z.string(), savedGameSchema),
  savedAt: z.number(),
});

export type SavedGame = z.infer<typeof savedGameSchema>;
export type SavedSession = z.infer<typeof savedSessionSchema>;

export interface RestoreOptions {
  now: number;
  scheduleEnabled: boolean;
  maxIdleMs: number;
}

function getSessionPath(accountName: string): string {
  return join(CONFIG_DIR, `session-${accountName}.json`);
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function warnUnreadable(filePath: string, cause?: unknown): void {
  log.warn('storage', `Could not read ${filePath}, starting the auto-start games instead`, {
    cause,
    hint: 'Fix or delete the file. steamidled rewrites it with the next selection change.',
  });
}

export function loadSession(accountName: string): SavedSession | null {
  const filePath = getSessionPath(accountName);
  if (!existsSync(filePath)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    warnUnreadable(filePath, err);
    return null;
  }
  const result = savedSessionSchema.safeParse(raw);
  if (!result.success) {
    warnUnreadable(filePath, result.error.issues[0]?.message);
    return null;
  }
  return result.data;
}

export function saveSession(accountName: string, session: SavedSession): boolean {
  const filePath = getSessionPath(accountName);
  try {
    ensureConfigDir();
    writeFileAtomic(filePath, JSON.stringify(session, null, 2));
    return true;
  } catch (err) {
    log.error('storage', `Could not save ${filePath}`, {
      cause: err,
      hint: 'Check that ~/.steam-idler is writable.',
    });
    return false;
  }
}

export function deleteSession(accountName: string): void {
  const filePath = getSessionPath(accountName);
  try {
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch (err) {
    log.error('storage', `Could not remove ${filePath}`, {
      cause: err,
      hint: 'Delete the file by hand or check the permissions of ~/.steam-idler.',
    });
  }
}

export function sessionKey(games: IdlingGame[], scheduleEnabled: boolean): string {
  return JSON.stringify(
    games.map((game) => [game.appid, scheduleEnabled ? game.nextPauseAtMs : null, game.pauseUntil?.getTime() ?? null])
  );
}

export function captureSession(games: IdlingGame[], scheduleEnabled: boolean, now = Date.now()): SavedSession {
  const entries = games.map((game): [string, SavedGame] => [
    String(game.appid),
    {
      idleRemainingMs:
        scheduleEnabled && game.nextPauseAtMs !== null ? Math.max(0, game.nextPauseAtMs - game.accumulatedMs) : null,
      pauseUntil: game.pauseUntil?.getTime() ?? null,
    },
  ]);
  return { appIds: games.map((game) => game.appid), games: Object.fromEntries(entries), savedAt: now };
}

export function restoreSchedule(
  game: IdlingGame,
  saved: SavedGame | undefined,
  { now, scheduleEnabled, maxIdleMs }: RestoreOptions
): 'idling' | 'cooling' {
  if (!saved || !scheduleEnabled || game.nextPauseAtMs === null) return 'idling';
  if (saved.pauseUntil !== null) {
    if (saved.pauseUntil <= now) return 'idling';
    game.pauseUntil = new Date(saved.pauseUntil);
    return 'cooling';
  }
  if (saved.idleRemainingMs !== null) {
    game.nextPauseAtMs = game.accumulatedMs + Math.min(saved.idleRemainingMs, maxIdleMs);
  }
  return 'idling';
}

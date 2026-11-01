import { log } from '../logging/logger.js';
import { describeSettingsChange } from '../settings/describe.js';
import type { PersonaState, Settings, SettingsPatch } from '../settings/schema.js';
import type { SettingsUpdate } from '../storage/settings.js';
import type { SteamGame } from '../types/index.js';
import { countLabel } from '../utils/format.js';

export type RetryNowResult =
  | { ok: true }
  | { ok: false; reason: 'not-waiting' | 'busy' | 'taken-over' }
  | { ok: false; reason: 'rate-limited'; waitMs: number };

export type FlushNowResult =
  | { ok: true }
  | { ok: false; reason: 'busy' }
  | { ok: false; reason: 'too-soon'; waitMs: number };

export interface SessionControlsAccess {
  resume: {
    isWaiting(): boolean;
    hasPendingTimer(): boolean;
    isFlushRelog(): boolean;
    isTakenOver(): boolean;
    rateLimitedAt(): number;
    runNow(): void;
  };
  flush: {
    canFlushNow(): boolean;
    lastRelogAt(): number;
    relog(): boolean;
    rearm(): void;
  };
  library: {
    generation(): number;
    fetch(): Promise<SteamGame[] | null>;
    licensesReady(): boolean;
    apply(games: SteamGame[]): void;
    refreshing(): boolean;
    setRefreshing(refreshing: boolean): void;
  };
  session: {
    appIds(): number[];
    namesOf(appIds: number[]): string[];
    inLibrary(appId: number): boolean;
    keepOnly(appIds: number[]): void;
    stopEmptied(): void;
  };
  settings: {
    update(patch: SettingsPatch): SettingsUpdate;
    rerollIdlePhases(): void;
    applyWatchdog(enabled: boolean): void;
    setPersona(state: PersonaState): void;
    rearmDailyReport(): void;
  };
  rateLimitWaitMs: number;
  manualFlushGapMs: number;
  stateChanged(): void;
}

export function createSessionControls(access: SessionControlsAccess) {
  function retryNow(): RetryNowResult {
    const { resume } = access;
    if (!resume.isWaiting()) return { ok: false, reason: 'not-waiting' };
    if (!resume.hasPendingTimer() || resume.isFlushRelog()) return { ok: false, reason: 'busy' };
    if (resume.isTakenOver()) return { ok: false, reason: 'taken-over' };
    const rateLimitedAt = resume.rateLimitedAt();
    const waitMs = rateLimitedAt + access.rateLimitWaitMs - Date.now();
    if (rateLimitedAt > 0 && waitMs > 0) return { ok: false, reason: 'rate-limited', waitMs };
    log.info('steam', 'Reconnecting now, requested in the web GUI');
    resume.runNow();
    return { ok: true };
  }

  function flushNow(): FlushNowResult {
    const { flush } = access;
    if (!flush.canFlushNow()) return { ok: false, reason: 'busy' };
    const lastRelogAt = flush.lastRelogAt();
    const waitMs = lastRelogAt + access.manualFlushGapMs - Date.now();
    if (lastRelogAt > 0 && waitMs > 0) return { ok: false, reason: 'too-soon', waitMs };
    if (!flush.relog()) return { ok: false, reason: 'busy' };
    flush.rearm();
    log.info('idle', 'Committing playtime now, requested in the web GUI');
    return { ok: true };
  }

  function dropVanishedGames(): void {
    const { session } = access;
    const vanished = session.appIds().filter((appId) => !session.inLibrary(appId));
    if (vanished.length === 0) return;
    log.warn('idle', `Stopped ${countLabel(vanished.length, 'game')} that left your library: ${session.namesOf(vanished).join(', ')}`, {
      hint: 'Steam no longer lists them for this account. Add them again if they come back.',
    });
    const remaining = session.appIds().filter((appId) => session.inLibrary(appId));
    if (remaining.length === 0) {
      session.stopEmptied();
      return;
    }
    session.keepOnly(remaining);
  }

  async function reloadLibrary(): Promise<void> {
    const { library } = access;
    const games = await library.fetch();
    if (!games) return;
    if (!library.licensesReady()) {
      log.warn('steam', "Steam hasn't sent the full license list yet, kept the current library and every idling game", {
        hint: 'Refresh again in a minute.',
      });
      return;
    }
    library.apply(games);
    dropVanishedGames();
  }

  function refreshLibrary(): boolean {
    const { library } = access;
    if (library.refreshing()) return false;
    library.setRefreshing(true);
    const generation = library.generation();
    access.stateChanged();
    void reloadLibrary()
      .catch((err: unknown) => {
        log.warn('steam', "Couldn't refresh the library", {
          cause: err,
          hint: 'Try again in a minute. The games you idle keep running.',
        });
      })
      .finally(() => {
        if (generation !== library.generation()) return;
        library.setRefreshing(false);
        access.stateChanged();
      });
    return true;
  }

  function applySettingsChange(previous: Settings, next: Settings): void {
    const { settings } = access;
    if (!previous.schedule.enabled && next.schedule.enabled) settings.rerollIdlePhases();
    if (previous.flushIntervalHours !== next.flushIntervalHours) access.flush.rearm();
    if (previous.watchdog !== next.watchdog) settings.applyWatchdog(next.watchdog);
    if (previous.personaState !== next.personaState) settings.setPersona(next.personaState);
    if (previous.dailyReportHour !== next.dailyReportHour) settings.rearmDailyReport();
  }

  function updateSettings(patch: SettingsPatch): SettingsUpdate {
    const result = access.settings.update(patch);
    if (!result.ok) return result;
    const changes = describeSettingsChange(result.previous, result.settings);
    applySettingsChange(result.previous, result.settings);
    if (changes.length > 0) log.info('idle', `Settings saved: ${changes.join(', ')}`);
    access.stateChanged();
    return result;
  }

  return { retryNow, flushNow, refreshLibrary, updateSettings };
}

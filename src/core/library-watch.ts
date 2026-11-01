import { log } from '../logging/logger.js';

export interface LibraryWatchAccess {
  generation(): number;
  isLive(): boolean;
  librarySignature(): string | null;
  currentSignature(): string | null;
  waitForLicenseInfo(timeoutMs: number): Promise<boolean>;
  refresh(): boolean;
  debounceMs: number;
  minGapMs: number;
  readyTimeoutMs: number;
}

export function createLibraryWatch(access: LibraryWatchAccess) {
  let timer: NodeJS.Timeout | null = null;
  let lastRunAt = 0;

  function cancel(): void {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function stillWanted(generation: number): boolean {
    return access.isLive() && generation === access.generation();
  }

  async function run(generation: number): Promise<void> {
    timer = null;
    if (!stillWanted(generation) || access.currentSignature() === access.librarySignature()) return;
    lastRunAt = Date.now();
    const ready = await access.waitForLicenseInfo(access.readyTimeoutMs);
    if (!stillWanted(generation)) return;
    if (!ready) {
      log.warn('steam', "Steam didn't send the details for your new licenses in time, skipped the automatic library update", {
        hint: 'Refresh the library by hand in a minute.',
      });
      return;
    }
    access.refresh();
  }

  function licensesChanged(signature: string): void {
    if (!access.isLive() || signature === access.librarySignature()) return;
    cancel();
    const generation = access.generation();
    const delayMs = Math.max(access.debounceMs, lastRunAt + access.minGapMs - Date.now());
    timer = setTimeout(() => void run(generation), delayMs);
  }

  function libraryApplied(): void {
    const current = access.currentSignature();
    if (current !== null) licensesChanged(current);
  }

  return { licensesChanged, libraryApplied, cancel };
}

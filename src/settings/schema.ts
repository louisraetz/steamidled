import { z } from 'zod';

export const IDLE_HOURS = { min: 1, max: 2160 } as const;
export const COOLDOWN_HOURS = { min: 1, max: 720 } as const;
export const REPORT_HOUR = { min: 0, max: 23 } as const;
export const FLUSH_INTERVAL_OPTIONS = [1, 2, 4, 6, 8, 12] as const;
export const PERSONA_STATES = ['online', 'away', 'offline'] as const;
export const SCHEDULE_PROFILE_IDS = ['weekend', 'daily', 'grinder'] as const;
export const SCHEDULE_PROFILE_OPTIONS = [...SCHEDULE_PROFILE_IDS, 'custom'] as const;
export const DEFAULT_SCHEDULE_PROFILE = 'daily' satisfies ScheduleProfileId;
export const SCHEDULE_RANGE_FIELDS = ['idleMinHours', 'idleMaxHours', 'cooldownMinHours', 'cooldownMaxHours'] as const;

export type ScheduleProfileId = (typeof SCHEDULE_PROFILE_IDS)[number];
export type ScheduleProfile = (typeof SCHEDULE_PROFILE_OPTIONS)[number];
export type ScheduleRangeField = (typeof SCHEDULE_RANGE_FIELDS)[number];
export type ScheduleRanges = Record<ScheduleRangeField, number>;

export interface ScheduleProfileDefinition {
  label: string;
  ranges: ScheduleRanges;
}

export const SCHEDULE_PROFILES: Record<ScheduleProfileId, ScheduleProfileDefinition> = {
  weekend: {
    label: 'Weekend',
    ranges: { idleMinHours: 24, idleMaxHours: 72, cooldownMinHours: 96, cooldownMaxHours: 144 },
  },
  daily: {
    label: 'Daily',
    ranges: { idleMinHours: 72, idleMaxHours: 240, cooldownMinHours: 24, cooldownMaxHours: 72 },
  },
  grinder: {
    label: 'Grinder',
    ranges: { idleMinHours: 480, idleMaxHours: 1440, cooldownMinHours: 6, cooldownMaxHours: 24 },
  },
};

export const idleHoursSchema = z
  .number()
  .int('Use whole hours.')
  .min(IDLE_HOURS.min, `Idle phases last at least ${IDLE_HOURS.min} hour.`)
  .max(IDLE_HOURS.max, `Idle phases last at most ${IDLE_HOURS.max / 24} days.`);

export const cooldownHoursSchema = z
  .number()
  .int('Use whole hours.')
  .min(COOLDOWN_HOURS.min, `Cooldowns last at least ${COOLDOWN_HOURS.min} hour.`)
  .max(COOLDOWN_HOURS.max, `Cooldowns last at most ${COOLDOWN_HOURS.max / 24} days.`);

export const flushIntervalSchema = z.literal(FLUSH_INTERVAL_OPTIONS, {
  error: `Pick one of ${FLUSH_INTERVAL_OPTIONS.join(', ')} hours.`,
});

export const scheduleProfileSchema = z.enum(SCHEDULE_PROFILE_OPTIONS, {
  error: 'Pick weekend, daily, grinder or custom.',
});

export const personaStateSchema = z.enum(PERSONA_STATES, { error: 'Pick online, away or offline.' });

export const reportHourSchema = z
  .number()
  .int('Pick a full hour.')
  .min(REPORT_HOUR.min, 'Pick an hour between 0 and 23.')
  .max(REPORT_HOUR.max, 'Pick an hour between 0 and 23.');

function storedRangeCount(schedule: Partial<ScheduleRanges>): number {
  return SCHEDULE_RANGE_FIELDS.filter((field) => schedule[field] !== undefined).length;
}

function isOrdered(min: number | undefined, max: number | undefined): boolean {
  return min === undefined || max === undefined || min <= max;
}

export const scheduleSchema = z
  .object({
    enabled: z.boolean(),
    profile: scheduleProfileSchema,
    idleMinHours: idleHoursSchema.optional(),
    idleMaxHours: idleHoursSchema.optional(),
    cooldownMinHours: cooldownHoursSchema.optional(),
    cooldownMaxHours: cooldownHoursSchema.optional(),
  })
  .refine((schedule) => [0, SCHEDULE_RANGE_FIELDS.length].includes(storedRangeCount(schedule)), {
    message: 'Send the idle and cooldown ranges together.',
    path: ['idleMinHours'],
  })
  .refine((schedule) => schedule.profile !== 'custom' || storedRangeCount(schedule) > 0, {
    message: 'Custom needs an idle and a cooldown range.',
    path: ['profile'],
  })
  .refine((schedule) => isOrdered(schedule.idleMinHours, schedule.idleMaxHours), {
    message: "The shortest idle phase can't be longer than the longest.",
    path: ['idleMinHours'],
  })
  .refine((schedule) => isOrdered(schedule.cooldownMinHours, schedule.cooldownMaxHours), {
    message: "The shortest cooldown can't be longer than the longest.",
    path: ['cooldownMinHours'],
  });

export const settingsSchema = z.object({
  schedule: scheduleSchema,
  flushIntervalHours: flushIntervalSchema,
  watchdog: z.boolean(),
  personaState: personaStateSchema,
  dailyReportHour: reportHourSchema,
});

export const settingsPatchSchema = z
  .object({
    schedule: z
      .object({
        enabled: z.boolean().optional(),
        profile: scheduleProfileSchema.optional(),
        idleMinHours: idleHoursSchema.optional(),
        idleMaxHours: idleHoursSchema.optional(),
        cooldownMinHours: cooldownHoursSchema.optional(),
        cooldownMaxHours: cooldownHoursSchema.optional(),
      })
      .strict()
      .optional(),
    flushIntervalHours: flushIntervalSchema.optional(),
    watchdog: z.boolean().optional(),
    personaState: personaStateSchema.optional(),
    dailyReportHour: reportHourSchema.optional(),
  })
  .strict();

export type Settings = z.infer<typeof settingsSchema>;
export type ScheduleSettings = Settings['schedule'];
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type PersonaState = Settings['personaState'];
export type FlushIntervalHours = Settings['flushIntervalHours'];

export const DEFAULT_SETTINGS: Settings = {
  schedule: {
    enabled: true,
    profile: DEFAULT_SCHEDULE_PROFILE,
  },
  flushIntervalHours: 4,
  watchdog: true,
  personaState: 'online',
  dailyReportHour: 0,
};

export interface StoredSettings {
  settings: Settings;
  invalidFields: string[];
  legacySchedule: boolean;
}

const LEGACY_SCHEDULE_RANGES: ScheduleRanges = {
  idleMinHours: 168,
  idleMaxHours: 720,
  cooldownMinHours: 100,
  cooldownMaxHours: 200,
};

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readField<T>(raw: RawRecord, key: string, schema: z.ZodType<T>, fallback: T, invalid: string[], path: string): T {
  if (raw[key] === undefined) return fallback;
  return schema
    .catch(() => {
      invalid.push(path);
      return fallback;
    })
    .parse(raw[key]);
}

function readPair(
  raw: RawRecord,
  keys: readonly [string, string],
  schema: z.ZodType<number>,
  fallback: readonly [number, number],
  invalid: string[]
): [number, number] {
  const [minKey, maxKey] = keys;
  const min = readField(raw, minKey, schema, fallback[0], invalid, `schedule.${minKey}`);
  const max = readField(raw, maxKey, schema, fallback[1], invalid, `schedule.${maxKey}`);
  if (min <= max) return [min, max];
  invalid.push(`schedule.${minKey}/${maxKey}`);
  return [fallback[0], fallback[1]];
}

function hasStoredRanges(raw: RawRecord): boolean {
  return SCHEDULE_RANGE_FIELDS.some((field) => raw[field] !== undefined);
}

function isLegacySchedule(raw: unknown): boolean {
  return isRecord(raw) && raw.profile === undefined && hasStoredRanges(raw);
}

function readRanges(raw: RawRecord, invalid: string[]): ScheduleRanges | null {
  if (!hasStoredRanges(raw)) return null;
  const fallback = raw.profile === undefined ? LEGACY_SCHEDULE_RANGES : SCHEDULE_PROFILES[DEFAULT_SCHEDULE_PROFILE].ranges;
  const [idleMinHours, idleMaxHours] = readPair(
    raw,
    ['idleMinHours', 'idleMaxHours'],
    idleHoursSchema,
    [fallback.idleMinHours, fallback.idleMaxHours],
    invalid
  );
  const [cooldownMinHours, cooldownMaxHours] = readPair(
    raw,
    ['cooldownMinHours', 'cooldownMaxHours'],
    cooldownHoursSchema,
    [fallback.cooldownMinHours, fallback.cooldownMaxHours],
    invalid
  );
  return { idleMinHours, idleMaxHours, cooldownMinHours, cooldownMaxHours };
}

function readProfile(raw: RawRecord, hasRanges: boolean, invalid: string[]): ScheduleProfile {
  if (raw.profile === undefined) return hasRanges ? 'custom' : DEFAULT_SCHEDULE_PROFILE;
  const parsed = scheduleProfileSchema.safeParse(raw.profile);
  if (parsed.success && (parsed.data !== 'custom' || hasRanges)) return parsed.data;
  invalid.push('schedule.profile');
  return DEFAULT_SCHEDULE_PROFILE;
}

function readSchedule(raw: unknown, invalid: string[]): ScheduleSettings {
  const fallback = DEFAULT_SETTINGS.schedule;
  if (raw === undefined) return { ...fallback };
  if (!isRecord(raw)) {
    invalid.push('schedule');
    return { ...fallback };
  }
  const ranges = readRanges(raw, invalid);
  return {
    enabled: readField(raw, 'enabled', z.boolean(), fallback.enabled, invalid, 'schedule.enabled'),
    profile: readProfile(raw, ranges !== null, invalid),
    ...ranges,
  };
}

export function parseStoredSettings(raw: unknown): StoredSettings {
  const invalid: string[] = [];
  if (!isRecord(raw)) {
    return { settings: structuredClone(DEFAULT_SETTINGS), invalidFields: ['settings'], legacySchedule: false };
  }
  const fallback = DEFAULT_SETTINGS;
  const settings: Settings = {
    schedule: readSchedule(raw.schedule, invalid),
    flushIntervalHours: readField(
      raw,
      'flushIntervalHours',
      flushIntervalSchema,
      fallback.flushIntervalHours,
      invalid,
      'flushIntervalHours'
    ),
    watchdog: readField(raw, 'watchdog', z.boolean(), fallback.watchdog, invalid, 'watchdog'),
    personaState: readField(raw, 'personaState', personaStateSchema, fallback.personaState, invalid, 'personaState'),
    dailyReportHour: readField(raw, 'dailyReportHour', reportHourSchema, fallback.dailyReportHour, invalid, 'dailyReportHour'),
  };
  return { settings, invalidFields: invalid, legacySchedule: isLegacySchedule(raw.schedule) };
}

export function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  return {
    ...current,
    ...patch,
    schedule: { ...current.schedule, ...patch.schedule },
  };
}

export function customRanges(schedule: ScheduleSettings): ScheduleRanges | null {
  const { idleMinHours, idleMaxHours, cooldownMinHours, cooldownMaxHours } = schedule;
  if (idleMinHours === undefined || idleMaxHours === undefined) return null;
  if (cooldownMinHours === undefined || cooldownMaxHours === undefined) return null;
  return { idleMinHours, idleMaxHours, cooldownMinHours, cooldownMaxHours };
}

export function effectiveSchedule(settings: Settings): ScheduleRanges {
  const { profile } = settings.schedule;
  if (profile !== 'custom') return SCHEDULE_PROFILES[profile].ranges;
  return customRanges(settings.schedule) ?? SCHEDULE_PROFILES[DEFAULT_SCHEDULE_PROFILE].ranges;
}

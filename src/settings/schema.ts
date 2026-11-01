import { z } from 'zod';

export const IDLE_HOURS = { min: 1, max: 2160 } as const;
export const COOLDOWN_HOURS = { min: 1, max: 720 } as const;
export const REPORT_HOUR = { min: 0, max: 23 } as const;
export const FLUSH_INTERVAL_OPTIONS = [1, 2, 4, 6, 8, 12] as const;
export const PERSONA_STATES = ['online', 'away', 'offline'] as const;

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

export const personaStateSchema = z.enum(PERSONA_STATES, { error: 'Pick online, away or offline.' });

export const reportHourSchema = z
  .number()
  .int('Pick a full hour.')
  .min(REPORT_HOUR.min, 'Pick an hour between 0 and 23.')
  .max(REPORT_HOUR.max, 'Pick an hour between 0 and 23.');

export const scheduleSchema = z
  .object({
    enabled: z.boolean(),
    idleMinHours: idleHoursSchema,
    idleMaxHours: idleHoursSchema,
    cooldownMinHours: cooldownHoursSchema,
    cooldownMaxHours: cooldownHoursSchema,
  })
  .refine((schedule) => schedule.idleMinHours <= schedule.idleMaxHours, {
    message: "The shortest idle phase can't be longer than the longest.",
    path: ['idleMinHours'],
  })
  .refine((schedule) => schedule.cooldownMinHours <= schedule.cooldownMaxHours, {
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
    idleMinHours: 168,
    idleMaxHours: 720,
    cooldownMinHours: 100,
    cooldownMaxHours: 200,
  },
  flushIntervalHours: 4,
  watchdog: true,
  personaState: 'online',
  dailyReportHour: 0,
};

export interface StoredSettings {
  settings: Settings;
  invalidFields: string[];
}

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

function readSchedule(raw: unknown, invalid: string[]): ScheduleSettings {
  const fallback = DEFAULT_SETTINGS.schedule;
  if (raw === undefined) return { ...fallback };
  if (!isRecord(raw)) {
    invalid.push('schedule');
    return { ...fallback };
  }
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
  return {
    enabled: readField(raw, 'enabled', z.boolean(), fallback.enabled, invalid, 'schedule.enabled'),
    idleMinHours,
    idleMaxHours,
    cooldownMinHours,
    cooldownMaxHours,
  };
}

export function parseStoredSettings(raw: unknown): StoredSettings {
  const invalid: string[] = [];
  if (!isRecord(raw)) {
    return { settings: structuredClone(DEFAULT_SETTINGS), invalidFields: ['settings'] };
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
  return { settings, invalidFields: invalid };
}

export function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  return {
    ...current,
    ...patch,
    schedule: { ...current.schedule, ...patch.schedule },
  };
}

/**
 * Lightweight, zero-dependency Cron Utility for Qonace
 * Supports standard 5-part cron syntax: [minute] [hour] [day-of-month] [month] [day-of-week]
 */

export interface CronPreset {
  id: string;
  label: string;
  cron: string;
  description: string;
  icon?: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { id: 'every-15-min', label: 'Every 15 Minutes', cron: '*/15 * * * *', description: 'Runs every 15 minutes throughout the day' },
  { id: 'hourly', label: 'Every Hour', cron: '0 * * * *', description: 'Runs at the start of every hour' },
  { id: 'daily-9am', label: 'Daily at 9:00 AM', cron: '0 9 * * *', description: 'Runs every morning at 09:00' },
  { id: 'weekdays-9am', label: 'Weekdays at 9:00 AM', cron: '0 9 * * 1-5', description: 'Runs Monday through Friday at 09:00' },
  { id: 'weekly-monday', label: 'Weekly on Monday', cron: '0 9 * * 1', description: 'Runs every Monday morning at 09:00' },
  { id: 'daily-midnight', label: 'Every Night at Midnight', cron: '0 0 * * *', description: 'Runs daily at 00:00 UTC/Local' },
];

/**
 * Validates a 5-part cron expression
 */
export function isValidCron(cron: string): boolean {
  if (!cron || typeof cron !== 'string') return false;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [min, hour, dom, mon, dow] = parts;

  // Basic regex check for standard cron fields: numbers, ranges, steps, lists, and *
  const fieldRegex = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+(,\d+)*)$/;
  return (
    fieldRegex.test(min) &&
    fieldRegex.test(hour) &&
    fieldRegex.test(dom) &&
    fieldRegex.test(mon) &&
    fieldRegex.test(dow)
  );
}

/**
 * Converts a 5-part cron expression into human-readable English
 */
export function cronToHuman(cron: string): string {
  const trimmed = (cron || '').trim();
  const matched = CRON_PRESETS.find((p) => p.cron === trimmed);
  if (matched) return matched.label;

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return 'Custom Schedule';

  const [min, hour, dom, , dow] = parts;

  if (min === '*/15' && hour === '*' && dom === '*' && dow === '*') return 'Every 15 minutes';
  if (min === '*/30' && hour === '*' && dom === '*' && dow === '*') return 'Every 30 minutes';
  if (min === '*/5' && hour === '*' && dom === '*' && dow === '*') return 'Every 5 minutes';
  if (min === '0' && hour === '*' && dom === '*' && dow === '*') return 'Every hour on the hour';

  const hourFormatted = hour.length === 1 ? `0${hour}` : hour;
  const minFormatted = min.length === 1 ? `0${min}` : min;

  if (dow === '1-5' && dom === '*') {
    return `Every weekday at ${hourFormatted}:${minFormatted}`;
  }

  const daysMap: Record<string, string> = {
    '0': 'Sunday',
    '1': 'Monday',
    '2': 'Tuesday',
    '3': 'Wednesday',
    '4': 'Thursday',
    '5': 'Friday',
    '6': 'Saturday',
    '7': 'Sunday',
  };

  if (daysMap[dow] && dom === '*') {
    return `Every ${daysMap[dow]} at ${hourFormatted}:${minFormatted}`;
  }

  if (dom === '*' && dow === '*') {
    return `Daily at ${hourFormatted}:${minFormatted}`;
  }

  if (dom !== '*' && dow === '*') {
    return `Monthly on day ${dom} at ${hourFormatted}:${minFormatted}`;
  }

  return `Custom: ${cron}`;
}

/**
 * Calculates approximate next execution timestamp from now given a cron pattern
 */
export function getNextCronRun(cron: string, fromDate = new Date()): Date {
  const parts = (cron || '').trim().split(/\s+/);
  const now = new Date(fromDate.getTime());

  if (parts.length !== 5) {
    // Default to 1 hour from now if invalid
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  const [min, hour, dom, , dow] = parts;

  // 1. Every N minutes
  if (min.startsWith('*/')) {
    const step = parseInt(min.slice(2), 10) || 15;
    const currentMin = now.getMinutes();
    const nextMin = Math.ceil((currentMin + 1) / step) * step;
    const nextDate = new Date(now);
    if (nextMin >= 60) {
      nextDate.setHours(nextDate.getHours() + 1);
      nextDate.setMinutes(nextMin % 60);
    } else {
      nextDate.setMinutes(nextMin);
    }
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);
    return nextDate;
  }

  // 2. Hourly at minute 0
  if (min === '0' && hour === '*') {
    const nextDate = new Date(now);
    nextDate.setHours(nextDate.getHours() + 1);
    nextDate.setMinutes(0);
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);
    return nextDate;
  }

  // 3. Specific hour and minute
  const targetHour = parseInt(hour, 10);
  const targetMin = parseInt(min, 10);

  if (!isNaN(targetHour) && !isNaN(targetMin)) {
    const nextDate = new Date(now);
    nextDate.setHours(targetHour);
    nextDate.setMinutes(targetMin);
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);

    // Specific day of week (e.g., Monday = 1)
    const targetDow = parseInt(dow, 10);
    if (!isNaN(targetDow)) {
      const currentDow = nextDate.getDay();
      let diff = targetDow - currentDow;
      if (diff < 0 || (diff === 0 && nextDate <= now)) {
        diff += 7;
      }
      nextDate.setDate(nextDate.getDate() + diff);
      return nextDate;
    }

    // Weekdays (1-5)
    if (dow === '1-5') {
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      return nextDate;
    }

    // Daily
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
  }

  // Fallback: 24h from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

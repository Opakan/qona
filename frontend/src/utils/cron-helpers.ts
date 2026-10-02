/**
 * Frontend Cron Helpers for Qonace
 */

export interface CronPreset {
  id: string;
  label: string;
  cron: string;
  description: string;
  badge?: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { id: 'every-15-min', label: 'Every 15 Minutes', cron: '*/15 * * * *', description: 'Runs every 15 min throughout the day', badge: 'High Freq' },
  { id: 'hourly', label: 'Every Hour', cron: '0 * * * *', description: 'Runs at the top of every hour (:00)' },
  { id: 'daily-9am', label: 'Daily at 9:00 AM', cron: '0 9 * * *', description: 'Runs every morning at 09:00', badge: 'Popular' },
  { id: 'weekdays-9am', label: 'Weekdays at 9:00 AM', cron: '0 9 * * 1-5', description: 'Mon - Fri business hours morning run' },
  { id: 'weekly-monday', label: 'Weekly on Monday', cron: '0 9 * * 1', description: 'Weekly trigger every Monday at 09:00' },
  { id: 'daily-midnight', label: 'Every Night at Midnight', cron: '0 0 * * *', description: 'Daily maintenance & batch run at 00:00' },
];

export const TIMEZONES = [
  { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
  { label: 'Africa/Lagos (WAT / GMT+1)', value: 'Africa/Lagos' },
  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
  { label: 'America/New_York (EST / EDT)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PST / PDT)', value: 'America/Los_Angeles' },
  { label: 'Europe/Berlin (CET / CEST)', value: 'Europe/Berlin' },
  { label: 'Asia/Dubai (GST / GMT+4)', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore (SGT / GMT+8)', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (JST / GMT+9)', value: 'Asia/Tokyo' },
];

export function isValidCron(cron: string): boolean {
  if (!cron || typeof cron !== 'string') return false;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const fieldRegex = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+(,\d+)*)$/;
  return parts.every((p) => fieldRegex.test(p));
}

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

  return `Custom: ${cron}`;
}

export function formatNextRunDate(dateStr?: string): string {
  if (!dateStr) return 'Not scheduled';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not scheduled';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Not scheduled';
  }
}

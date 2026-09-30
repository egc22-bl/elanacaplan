const TZ = 'America/Toronto';

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function torontoParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const map = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS[map.weekday],
    ymd: `${map.year}-${map.month}-${String(map.day).padStart(2, '0')}`,
  };
}

export function addDays(ymd, days) {
  const [year, month, day] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function zonedTimeToUtc(ymd, hm) {
  const [year, month, day] = ymd.split('-').map(Number);
  const [hour, minute] = hm.split(':').map(Number);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = torontoParts(new Date(utcMs));
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = desired - asUtc;
    if (diff === 0) return new Date(utcMs);
    utcMs += diff;
  }
  return new Date(utcMs);
}

export function weekdayOf(ymd) {
  return torontoParts(zonedTimeToUtc(ymd, '12:00')).weekday;
}

export function formatShortDate(ymd) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(zonedTimeToUtc(ymd, '12:00'));
  return formatted.replace(',', '');
}

export function formatLongDate(ymd) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(zonedTimeToUtc(ymd, '12:00'));
}

export function nextOccurrence(classItem, now) {
  let ymd = torontoParts(now).ymd;
  for (let i = 0; i < 21; i += 1) {
    if (weekdayOf(ymd) === classItem.weekday) {
      const start = zonedTimeToUtc(ymd, classItem.time);
      if (start > now) return { ymd, start };
    }
    ymd = addDays(ymd, 1);
  }
  throw new Error(`No upcoming date for ${classItem.id}`);
}

export function isInChangeWindow(classItem, ymd, now) {
  const digestAt = zonedTimeToUtc(addDays(ymd, -1), '17:00');
  const classStart = zonedTimeToUtc(ymd, classItem.time);
  return now >= digestAt && now < classStart;
}

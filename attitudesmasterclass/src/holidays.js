import { addDays, nextOccurrence, weekdayOf, zonedTimeToUtc } from './time.js';

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function nthWeekday(year, month, weekday, n) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return ymd(year, month, 1 + offset + (n - 1) * 7);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month, day);
}

function victoriaDay(year) {
  const may24 = new Date(Date.UTC(year, 4, 24));
  const weekday = may24.getUTCDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  return addDays(ymd(year, 5, 24), -back);
}

const cache = new Map();

export function holidaysForYear(year) {
  if (cache.has(year)) return cache.get(year);
  const days = [
    { date: ymd(year, 1, 1), name: "New Year's Day" },
    { date: nthWeekday(year, 2, 1, 3), name: 'Family Day' },
    { date: addDays(easterSunday(year), -2), name: 'Good Friday' },
    { date: victoriaDay(year), name: 'Victoria Day' },
    { date: ymd(year, 7, 1), name: 'Canada Day' },
    { date: nthWeekday(year, 9, 1, 1), name: 'Labour Day' },
    { date: nthWeekday(year, 10, 1, 2), name: 'Thanksgiving' },
    { date: ymd(year, 12, 25), name: 'Christmas Day' },
    { date: ymd(year, 12, 26), name: 'Boxing Day' },
  ];
  cache.set(year, days);
  return days;
}

export function holidayOn(date) {
  const year = Number(String(date).slice(0, 4));
  return holidaysForYear(year).find((day) => day.date === date)
    ?? holidaysForYear(year + 1).find((day) => day.date === date)
    ?? null;
}

export function nextOpenOccurrence(classItem, now) {
  let cursor = now;
  for (let step = 0; step < 12; step += 1) {
    const next = nextOccurrence(classItem, cursor);
    if (!holidayOn(next.ymd)) return next;
    cursor = next.start;
  }
  throw new Error(`No open date for ${classItem.id}`);
}

export function upcomingDates(classItem, now, openCount = 6) {
  const dates = [];
  let cursor = now;
  let open = 0;
  while (open < openCount && dates.length < 24) {
    const next = nextOccurrence(classItem, cursor);
    const holiday = holidayOn(next.ymd);
    dates.push({
      date: next.ymd,
      closed: Boolean(holiday),
      holiday: holiday?.name ?? null,
    });
    if (!holiday) open += 1;
    cursor = next.start;
  }
  return dates;
}

export function isOpenClassDate(classItem, date, now) {
  if (weekdayOf(date) !== classItem.weekday) return false;
  if (holidayOn(date)) return false;
  return zonedTimeToUtc(date, classItem.time) > now;
}

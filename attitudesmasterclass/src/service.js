import { CLASSES, DAY_ORDER, classById } from './classes.js';
import { newId } from './store.js';
import {
  addDays,
  formatLongDate,
  formatShortDate,
  isInChangeWindow,
  nextOccurrence,
  torontoParts,
  weekdayOf,
  zonedTimeToUtc,
} from './time.js';

export function phoneDigits(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function fail(error) {
  return { ok: false, error };
}

function personLine(person, mode = person.mode) {
  const how = mode === 'weekly' ? 'every week' : 'next class only';
  return `${person.name} — ${person.email} — ${person.phone} — ${how}`;
}

export function attends(signup, classItem, ymd) {
  if (signup.classId !== classItem.id) return false;
  const start = zonedTimeToUtc(ymd, classItem.time);
  if (signup.stoppedAt && Date.parse(signup.stoppedAt) <= start.getTime()) return false;
  if (signup.mode === 'once') return signup.startDate === ymd;
  if (ymd < signup.startDate) return false;
  if (signup.skipDates.includes(ymd)) return false;
  return weekdayOf(ymd) === classItem.weekday;
}

function upcomingDate(signup, classItem, now) {
  let ymd = torontoParts(now).ymd;
  for (let step = 0; step < 28; step += 1) {
    const start = zonedTimeToUtc(ymd, classItem.time);
    if (start > now && attends(signup, classItem, ymd)) return { ymd, start };
    ymd = addDays(ymd, 1);
  }
  return null;
}

export function createService({ store, mail, now = () => new Date() }) {
  function rosterLines(classItem, ymd) {
    const people = store.all()
      .filter((row) => attends(row, classItem, ymd))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!people.length) return ['No signups'];
    return people.map((person) => `- ${personLine(person)}`);
  }

  async function sendChange(classItem, ymd, verb, person, mode) {
    if (!isInChangeWindow(classItem, ymd, now())) return;
    const text = [
      `Change — ${classItem.label}`,
      formatLongDate(ymd),
      '',
      `${verb}: ${personLine(person, mode)}`,
      '',
      'Updated list:',
      ...rosterLines(classItem, ymd),
      '',
    ].join('\n');
    await mail.send({
      subject: `Change — ${classItem.label}`,
      text,
    });
  }

  return {
    listClasses() {
      const current = now();
      return {
        days: DAY_ORDER.map((day) => ({
          name: day.name,
          classes: CLASSES.filter((item) => item.weekday === day.weekday).map((item) => {
            const next = nextOccurrence(item, current);
            return {
              id: item.id,
              label: item.label,
              nextDate: next.ymd,
              nextDateLabel: formatShortDate(next.ymd),
            };
          }),
        })),
      };
    },

    async signUp(input) {
      const name = String(input?.name ?? '').trim();
      const email = normalizeEmail(input?.email);
      const phone = String(input?.phone ?? '').trim();
      const digits = phoneDigits(phone);
      const selected = Array.isArray(input?.classes) ? input.classes : [];
      if (!name) return fail('Enter your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter an email address.');
      if (digits.length !== 10) return fail('Enter a phone number.');
      if (!selected.length) return fail('Choose a class.');

      const picks = [];
      const seen = new Set();
      for (const item of selected) {
        const classItem = classById(item?.id);
        if (!classItem || seen.has(classItem.id)) return fail('Choose a class from the list.');
        seen.add(classItem.id);
        picks.push({
          classItem,
          mode: item?.mode === 'weekly' ? 'weekly' : 'once',
        });
      }

      const current = now();
      const saved = [];
      for (const pick of picks) {
        const next = nextOccurrence(pick.classItem, current);
        const existing = store.activeForClass(email, digits, pick.classItem.id);
        if (!existing) {
          const row = {
            id: newId(),
            classId: pick.classItem.id,
            name,
            email,
            phone,
            phoneDigits: digits,
            mode: pick.mode,
            startDate: next.ymd,
            skipDates: [],
            stoppedAt: null,
            createdAt: current.toISOString(),
            updatedAt: current.toISOString(),
          };
          store.insert(row);
          await sendChange(pick.classItem, next.ymd, 'Added', row, pick.mode);
        } else if (existing.mode !== pick.mode) {
          const verb = pick.mode === 'weekly' ? 'Switched to every week' : 'Switched to next class only';
          store.update(existing.id, {
            name,
            phone,
            mode: pick.mode,
            startDate: next.ymd,
            skipDates: [],
            updatedAt: current.toISOString(),
          });
          await sendChange(pick.classItem, next.ymd, verb, { ...existing, name, phone }, pick.mode);
        } else {
          store.update(existing.id, {
            name,
            phone,
            startDate: next.ymd,
            updatedAt: current.toISOString(),
          });
          if (existing.name !== name || existing.phone !== phone) {
            await sendChange(
              pick.classItem,
              next.ymd,
              'Updated',
              { ...existing, name, phone },
              pick.mode,
            );
          }
        }
        saved.push({
          classId: pick.classItem.id,
          label: pick.classItem.label,
          mode: pick.mode,
          dateLabel: formatShortDate(next.ymd),
        });
      }
      return { ok: true, saved };
    },

    lookup(input) {
      const email = normalizeEmail(input?.email);
      const digits = phoneDigits(input?.phone);
      if (!email || digits.length !== 10) return { ok: true, classes: [] };
      const current = now();
      const classes = [];
      for (const row of store.forContact(email, digits)) {
        const classItem = classById(row.classId);
        if (!classItem) continue;
        const next = upcomingDate(row, classItem, current);
        if (!next) continue;
        classes.push({
          classId: row.classId,
          label: classItem.label,
          mode: row.mode,
          nextDateLabel: formatShortDate(next.ymd),
        });
      }
      return { ok: true, classes };
    },

    async cancel(input) {
      const email = normalizeEmail(input?.email);
      const digits = phoneDigits(input?.phone);
      const classItem = classById(input?.classId);
      const row = classItem ? store.activeForClass(email, digits, classItem.id) : null;
      if (!row) return fail("We don't have a signup for that email and phone.");
      const current = now();
      const next = upcomingDate(row, classItem, current);
      if (!next) return fail('That class has no upcoming spot to cancel.');
      const action = input?.action;

      if (action === 'drop') {
        if (row.mode !== 'once') return fail('Choose skip or stop for an every-week class.');
        store.update(row.id, { stoppedAt: current.toISOString(), updatedAt: current.toISOString() });
        await sendChange(classItem, next.ymd, 'Removed', row, 'once');
        return { ok: true };
      }

      if (action === 'skip') {
        if (row.mode !== 'weekly') return fail('This spot is for one class.');
        store.update(row.id, {
          skipDates: [...row.skipDates, next.ymd],
          updatedAt: current.toISOString(),
        });
        await sendChange(classItem, next.ymd, 'Skipped this date', row, 'weekly');
        return { ok: true };
      }

      if (action === 'stop') {
        if (row.mode !== 'weekly') return fail('This spot is for one class.');
        store.update(row.id, { stoppedAt: current.toISOString(), updatedAt: current.toISOString() });
        await sendChange(classItem, next.ymd, 'Stopped every week', row, 'weekly');
        return { ok: true };
      }

      return fail('Choose what to cancel.');
    },

    async digest(at = now()) {
      const parts = torontoParts(at);
      if (parts.hour !== 17) return { ran: false, reason: 'not-5pm', delivered: false };
      const ymd = addDays(parts.ymd, 1);
      const classes = CLASSES.filter((item) => item.weekday === weekdayOf(ymd));
      if (!classes.length) return { ran: false, reason: 'no-classes', delivered: false };
      if (store.wasRosterSent(ymd)) return { ran: false, reason: 'already-sent', delivered: false };

      const lines = [`Tomorrow's classes — ${formatLongDate(ymd)}`, ''];
      for (const classItem of classes) {
        lines.push(classItem.label);
        lines.push(...rosterLines(classItem, ymd));
        lines.push('');
      }
      const text = `${lines.join('\n').trimEnd()}\n`;
      const subject = `Tomorrow's classes — ${formatLongDate(ymd)}`;
      const result = await mail.send({ subject, text });
      if (result.delivered) store.markRosterSent(ymd);
      return {
        ran: true,
        delivered: result.delivered === true,
        suppressed: result.suppressed === true,
        message: { subject, text },
      };
    },
  };
}

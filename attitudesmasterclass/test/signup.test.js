import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { CLASSES } from '../src/classes.js';
import { createMailer } from '../src/mail.js';
import { createHandler } from '../src/server.js';
import { attends, createService } from '../src/service.js';
import { memoryStore } from '../src/store.js';
import { holidayOn, nextOpenOccurrence } from '../src/holidays.js';
import { isInChangeWindow, nextOccurrence, torontoParts, zonedTimeToUtc } from '../src/time.js';

const ballet = CLASSES.find((item) => item.id === 'mon-0920-ballet-12');
const jazz = CLASSES.find((item) => item.id === 'thu-1830-jazz-12');
const wednesdayNoon = zonedTimeToUtc('2026-09-30', '12:00');

function recorder() {
  const messages = [];
  return {
    messages,
    async send(message) {
      messages.push(message);
      return { delivered: false, suppressed: true };
    },
  };
}

function serviceAt(now, mail = recorder()) {
  const store = memoryStore();
  const service = createService({ store, mail, now: () => now });
  return { store, service, mail };
}

test('the fall list has 30 classes and Caddy Superville', () => {
  assert.equal(CLASSES.length, 30);
  const caddy = CLASSES.filter((item) => item.label.includes('Caddy Superville'));
  assert.equal(caddy.length, 3);
  assert.equal(CLASSES.some((item) => item.label.includes('Cately')), false);
  assert.equal(CLASSES.filter((item) => item.label.includes('Caroline Moro-Dalicandro')).length, 5);
  assert.equal(CLASSES.filter((item) => item.label.includes('Tim Turney')).length, 14);
  assert.equal(CLASSES.some((item) => item.label.includes('Tunney')), false);
});

test('next class is this week until that class has started', () => {
  assert.equal(nextOccurrence(ballet, wednesdayNoon).ymd, '2026-10-05');
  const atStart = zonedTimeToUtc('2026-10-05', '09:20');
  assert.equal(nextOccurrence(ballet, atStart).ymd, '2026-10-12');
  assert.equal(holidayOn('2026-10-12').name, 'Thanksgiving');
  assert.equal(nextOpenOccurrence(ballet, atStart).ymd, '2026-10-19');
});

test('change emails wait until 5pm the night before', () => {
  assert.equal(isInChangeWindow(ballet, '2026-10-05', zonedTimeToUtc('2026-10-04', '16:59')), false);
  assert.equal(isInChangeWindow(ballet, '2026-10-05', zonedTimeToUtc('2026-10-04', '17:00')), true);
  assert.equal(isInChangeWindow(ballet, '2026-10-05', zonedTimeToUtc('2026-10-05', '09:20')), false);
  assert.equal(torontoParts(zonedTimeToUtc('2026-10-04', '17:00')).hour, 17);
});

test('a signup before 5pm the night before is saved and not emailed', async () => {
  const { service, mail, store } = serviceAt(wednesdayNoon);
  const result = await service.signUp({
    name: 'Jane Doe',
    email: 'Jane@Example.com',
    phone: '(905) 555-0100',
    classes: [
      { id: ballet.id, mode: 'once', date: '2026-10-05' },
      { id: jazz.id, mode: 'weekly' },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.saved.length, 2);
  assert.equal(result.saved[0].dateLabel, 'Mon Oct 5');
  assert.match(result.saved[1].label, /Thursday, 6:30 pm — Jazz 1 & 2 — Tim Turney \(New\)/);
  assert.equal(store.all().length, 2);
  assert.equal(mail.messages.length, 0);
});

test('the same email and phone updates a class instead of duplicating it', async () => {
  const { service, store } = serviceAt(wednesdayNoon);
  const person = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '905-555-0100',
    classes: [{ id: ballet.id, mode: 'once', date: '2026-10-05' }],
  };
  await service.signUp(person);
  await service.signUp({ ...person, classes: [{ id: ballet.id, mode: 'weekly' }] });
  const active = store.all().filter((row) => !row.stoppedAt);
  assert.equal(active.length, 1);
  assert.equal(active[0].mode, 'weekly');
});

test('a signup after 5pm the night before prepares a change email and does not deliver it in test', async () => {
  let fetches = 0;
  const mail = createMailer({
    env: {
      NODE_ENV: 'test',
      ATTITUDES_ALLOW_EMAIL: 'true',
      RESEND_API_KEY: 'not-a-real-key',
      STUDIO_EMAIL_FROM: 'Attitudes <signup@example.com>',
    },
    fetchImpl: async () => {
      fetches += 1;
      throw new Error('test tried to send email');
    },
  });
  const { service } = serviceAt(zonedTimeToUtc('2026-10-04', '17:30'), mail);
  const result = await service.signUp({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '9055550100',
    classes: [{ id: ballet.id, mode: 'once', date: '2026-10-05' }],
  });
  assert.equal(result.ok, true);
  assert.equal(fetches, 0);
});

test('cancel matches email and phone and can skip one week or stop', async () => {
  const mail = recorder();
  const { service } = serviceAt(wednesdayNoon, mail);
  await service.signUp({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '905-555-0100',
    classes: [
      { id: ballet.id, mode: 'once', date: '2026-10-05' },
      { id: jazz.id, mode: 'weekly' },
    ],
  });
  await service.signUp({
    name: 'Someone Else',
    email: 'jane@example.com',
    phone: '416-555-0199',
    classes: [{ id: ballet.id, mode: 'once', date: '2026-10-05' }],
  });

  const wrong = service.lookup({ email: 'jane@example.com', phone: '4165550000' });
  assert.deepEqual(wrong.classes, []);

  const found = service.lookup({ email: ' JANE@example.com ', phone: '1 (905) 555-0100' });
  assert.equal(found.classes.length, 2);
  assert.equal(found.classes.some((item) => item.label.includes('Someone')), false);

  const dropped = await service.cancel({
    email: 'jane@example.com',
    phone: '9055550100',
    classId: ballet.id,
    date: '2026-10-05',
    action: 'drop',
  });
  assert.equal(dropped.ok, true);

  const skipped = await service.cancel({
    email: 'jane@example.com',
    phone: '9055550100',
    classId: jazz.id,
    action: 'skip',
  });
  assert.equal(skipped.ok, true);
  const afterSkip = service.lookup({ email: 'jane@example.com', phone: '9055550100' });
  assert.equal(afterSkip.classes.length, 1);
  assert.equal(afterSkip.classes[0].nextDateLabel, 'Thu Oct 8');

  const stopped = await service.cancel({
    email: 'jane@example.com',
    phone: '9055550100',
    classId: jazz.id,
    action: 'stop',
  });
  assert.equal(stopped.ok, true);
  assert.equal(service.lookup({ email: 'jane@example.com', phone: '9055550100' }).classes.length, 0);
  assert.equal(mail.messages.length, 0);
});

test('the night-before roster lists every class, including empty ones', async () => {
  const mail = recorder();
  const { service, store } = serviceAt(wednesdayNoon, mail);
  await service.signUp({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '905-555-0100',
    classes: [{ id: ballet.id, mode: 'weekly' }],
  });

  const tooEarly = await service.digest(zonedTimeToUtc('2026-10-04', '16:00'));
  assert.equal(tooEarly.ran, false);

  const quietNight = await service.digest(zonedTimeToUtc('2026-10-01', '17:00'));
  assert.equal(quietNight.reason, 'no-classes');

  const digest = await service.digest(zonedTimeToUtc('2026-10-04', '17:00'));
  assert.equal(digest.ran, true);
  assert.equal(digest.delivered, false);
  assert.equal(digest.suppressed, true);
  assert.match(digest.message.subject, /Monday, October 5, 2026/);
  assert.match(digest.message.text, /Jane Doe — jane@example.com — 905-555-0100 — every week/);
  assert.equal(digest.message.text.split('No signups').length - 1, 8);
  assert.equal(store.wasRosterSent('2026-10-05'), false);
  assert.equal(mail.messages.length, 1);
  assert.equal(mail.messages[0].subject, digest.message.subject);
});

test('a removal inside the change window includes the updated list and is not delivered', async () => {
  const seen = [];
  const mail = {
    async send(message) {
      seen.push(message);
      return { delivered: false, suppressed: true };
    },
  };
  const early = serviceAt(wednesdayNoon, { async send() { return { delivered: false, suppressed: true }; } });
  await early.service.signUp({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '905-555-0100',
    classes: [{ id: ballet.id, mode: 'once', date: '2026-10-05' }],
  });
  const row = early.store.all()[0];
  const laterStore = memoryStore();
  laterStore.insert(row);
  const later = createService({
    store: laterStore,
    mail,
    now: () => zonedTimeToUtc('2026-10-04', '18:00'),
  });
  const result = await later.cancel({
    email: 'jane@example.com',
    phone: '905-555-0100',
    classId: ballet.id,
    date: '2026-10-05',
    action: 'drop',
  });
  assert.equal(result.ok, true);
  assert.equal(seen.length, 1);
  assert.match(seen[0].text, /Removed: Jane Doe/);
  assert.match(seen[0].text, /Updated list:\nNo signups/);
  assert.equal(attends(laterStore.all()[0], ballet, '2026-10-05'), false);
});

test('statutory holidays are closed and cannot be booked', async () => {
  const { service, store, mail } = serviceAt(wednesdayNoon);
  const rejected = await service.signUp({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '905-555-0100',
    classes: [{ id: ballet.id, mode: 'once', date: '2026-10-12' }],
  });
  assert.equal(rejected.ok, false);
  assert.equal(store.all().length, 0);

  await service.signUp({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '905-555-0100',
    classes: [{ id: ballet.id, mode: 'weekly' }],
  });
  const row = store.all()[0];
  assert.equal(row.startDate, '2026-10-05');
  assert.equal(attends(row, ballet, '2026-10-05'), true);
  assert.equal(attends(row, ballet, '2026-10-12'), false);
  assert.equal(attends(row, ballet, '2026-10-19'), true);

  const monday = service.listClasses().days
    .find((day) => day.name === 'Monday').classes
    .find((item) => item.id === ballet.id);
  assert.equal(monday.dates.find((entry) => entry.date === '2026-10-12').holiday, 'Thanksgiving');
  assert.equal(monday.everyWeekDate, '2026-10-05');

  const closedNight = await service.digest(zonedTimeToUtc('2026-10-11', '17:00'));
  assert.equal(closedNight.ran, true);
  assert.match(closedNight.message.text, /No classes — Thanksgiving/);
  assert.equal(closedNight.message.text.includes('Ballet'), false);
  assert.equal(closedNight.message.text.includes('Tim Turney'), false);

  const christmasEve = await service.digest(zonedTimeToUtc('2026-12-24', '17:00'));
  assert.equal(christmasEve.reason, 'no-classes');

  const boxingNight = await service.digest(zonedTimeToUtc('2026-12-25', '17:00'));
  assert.match(boxingNight.message.text, /Boxing Day/);
  assert.equal(boxingNight.message.text.includes('Yoga'), false);
  assert.equal(mail.messages.length, 2);
});

test('the page and routes do not call the mail provider', async () => {
  let fetches = 0;
  const mail = createMailer({
    env: { NODE_ENV: 'test', ATTITUDES_ALLOW_EMAIL: 'true', RESEND_API_KEY: 'x', STUDIO_EMAIL_FROM: 'a@b.c' },
    fetchImpl: async () => {
      fetches += 1;
      throw new Error('test tried to send email');
    },
  });
  const store = memoryStore();
  const service = createService({ store, mail, now: () => wednesdayNoon });
  const server = http.createServer(createHandler({ service, cronSecret: 'secret' }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const page = await fetch(`${base}/`);
    const html = await page.text();
    assert.match(html, /ATTITUDES/);
    assert.match(html, /105 Riviera Drive #10/);
    assert.match(html, /905-415-1104/);
    assert.match(html, /We’ll only contact you if a class is cancelled\./);

    const classes = await (await fetch(`${base}/api/classes`)).json();
    assert.equal(classes.days.reduce((sum, day) => sum + day.classes.length, 0), 30);
    assert.equal(classes.closures.some((day) => day.name === 'Thanksgiving' && day.date === '2026-10-12'), true);

    const signup = await fetch(`${base}/api/signups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '905-555-0100',
        classes: [{ id: ballet.id, mode: 'once', date: '2026-10-05' }],
      }),
    });
    assert.equal(signup.status, 200);

    const denied = await fetch(`${base}/api/roster`, { method: 'POST' });
    assert.equal(denied.status, 401);
    assert.equal(fetches, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

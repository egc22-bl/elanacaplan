import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function newId() {
  return crypto.randomUUID();
}

export function createStore(state, save = () => {}) {
  function persist() {
    save(state);
  }

  return {
    all() {
      return state.signups;
    },
    activeForClass(email, phoneDigits, classId) {
      return state.signups.find((row) => (
        row.email === email
        && row.phoneDigits === phoneDigits
        && row.classId === classId
        && !row.stoppedAt
      )) ?? null;
    },
    weeklyFor(email, phoneDigits, classId) {
      return state.signups.find((row) => (
        row.email === email
        && row.phoneDigits === phoneDigits
        && row.classId === classId
        && row.mode === 'weekly'
        && !row.stoppedAt
      )) ?? null;
    },
    onceOn(email, phoneDigits, classId, date) {
      return state.signups.find((row) => (
        row.email === email
        && row.phoneDigits === phoneDigits
        && row.classId === classId
        && row.mode === 'once'
        && row.startDate === date
        && !row.stoppedAt
      )) ?? null;
    },
    activeOnces(email, phoneDigits, classId) {
      return state.signups.filter((row) => (
        row.email === email
        && row.phoneDigits === phoneDigits
        && row.classId === classId
        && row.mode === 'once'
        && !row.stoppedAt
      ));
    },
    forContact(email, phoneDigits) {
      return state.signups.filter((row) => (
        row.email === email && row.phoneDigits === phoneDigits && !row.stoppedAt
      ));
    },
    insert(row) {
      state.signups.push(row);
      persist();
      return row;
    },
    update(id, patch) {
      const row = state.signups.find((item) => item.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      persist();
      return row;
    },
    wasRosterSent(ymd) {
      return state.rosterSends.includes(ymd);
    },
    markRosterSent(ymd) {
      if (!state.rosterSends.includes(ymd)) state.rosterSends.push(ymd);
      persist();
    },
  };
}

export function memoryStore() {
  return createStore({ signups: [], rosterSends: [] });
}

export function fileStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let state = { signups: [], rosterSends: [] };
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && Array.isArray(parsed.signups) && Array.isArray(parsed.rosterSends)) {
        state = parsed;
      }
    } catch {
      state = { signups: [], rosterSends: [] };
    }
  }
  return createStore(state, (next) => {
    fs.writeFileSync(file, JSON.stringify(next));
  });
}

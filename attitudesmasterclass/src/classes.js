export const DAY_ORDER = [
  { weekday: 1, name: 'Monday' },
  { weekday: 2, name: 'Tuesday' },
  { weekday: 3, name: 'Wednesday' },
  { weekday: 4, name: 'Thursday' },
  { weekday: 6, name: 'Saturday' },
];

function klass(id, weekday, time, label) {
  return { id, weekday, time, label };
}

export const CLASSES = [
  klass('mon-0920-ballet-12', 1, '09:20', 'Monday, 9:20 am — Ballet 1 & 2 — Tim Turney'),
  klass('mon-1030-jazz-3', 1, '10:30', 'Monday, 10:30 am — Jazz 3 — Tim Turney'),
  klass('mon-1145-tap-12', 1, '11:45', 'Monday, 11:45 am — Tap 1 & 2 — Tim Turney'),
  klass('mon-1145-tap-23', 1, '11:45', 'Monday, 11:45 am — Tap 2 & 3 — Caroline Moro-Dalicandro'),
  klass('mon-1830-tap-45', 1, '18:30', 'Monday, 6:30 pm — Tap 4 & 5 — Tim Turney'),
  klass('mon-1830-hiphop-12', 1, '18:30', 'Monday, 6:30 pm — Hip Hop 1 & 2 — Caddy Superville'),
  klass('mon-1940-tap-12', 1, '19:40', 'Monday, 7:40 pm — Tap 1 & 2 — Caroline Moro-Dalicandro (New)'),
  klass('mon-1940-hiphop-34', 1, '19:40', 'Monday, 7:40 pm — Hip Hop 3 & 4 — Caddy Superville'),
  klass('mon-2045-jazzfunk-3', 1, '20:45', 'Monday, 8:45 pm — Jazz Funk 3 — Caddy Superville'),

  klass('tue-1840-jazz-23', 2, '18:40', 'Tuesday, 6:40 pm — Jazz 2 & 3 — Tim Turney'),
  klass('tue-1945-ballet-23', 2, '19:45', 'Tuesday, 7:45 pm — Ballet 2 & 3 — Rachel Ng'),

  klass('wed-0930-lyrical-12', 3, '09:30', 'Wednesday, 9:30 am — Lyrical Jazz 1 & 2 — Tim Turney'),
  klass('wed-1045-tap-4', 3, '10:45', 'Wednesday, 10:45 am — Tap 4 — Tim Turney'),
  klass('wed-1730-lyrical-34', 3, '17:30', 'Wednesday, 5:30 pm — Lyrical Jazz 3 & 4 — Tim Turney'),
  klass('wed-1830-jazz-4', 3, '18:30', 'Wednesday, 6:30 pm — Jazz 4 — Lori Rybak (New)'),
  klass('wed-1940-modern-12', 3, '19:40', 'Wednesday, 7:40 pm — Modern Dance 1 & 2 — Lori Rybak (New)'),
  klass('wed-2045-kpop', 3, '20:45', 'Wednesday, 8:45 pm — K-Pop — Leslie Tsoy'),

  klass('thu-1030-jazz-12', 4, '10:30', 'Thursday, 10:30 am — Jazz 1 & 2 — Tim Turney'),
  klass('thu-1145-tap-3', 4, '11:45', 'Thursday, 11:45 am — Tap 3 — Tim Turney'),
  klass('thu-1830-jazz-12', 4, '18:30', 'Thursday, 6:30 pm — Jazz 1 & 2 — Tim Turney (New)'),
  klass('thu-1830-musical', 4, '18:30', 'Thursday, 6:30 pm — Musical Theatre, Performance — Lisa Elsen'),
  klass('thu-1940-tap-23', 4, '19:40', 'Thursday, 7:40 pm — Tap 2 & 3 — Caroline Moro-Dalicandro (New)'),
  klass('thu-1940-tap-34', 4, '19:40', 'Thursday, 7:40 pm — Tap 3 & 4 — Lisa Elsen'),
  klass('thu-2045-lyrical-12', 4, '20:45', 'Thursday, 8:45 pm — Lyrical Jazz 1 & 2 — Tim Turney (New)'),
  klass('thu-2045-lyrical-3', 4, '20:45', 'Thursday, 8:45 pm — Lyrical Jazz 3 — Lisa Elsen'),

  klass('sat-0945-yoga', 6, '09:45', 'Saturday, 9:45 am — Yoga — Thor Endver'),
  klass('sat-0945-tap-23', 6, '09:45', 'Saturday, 9:45 am — Tap 2 & 3 — Caroline Moro-Dalicandro'),
  klass('sat-1100-jazz-23', 6, '11:00', 'Saturday, 11:00 am — Jazz 2 & 3 — Tim Turney'),
  klass('sat-1100-tap-1', 6, '11:00', 'Saturday, 11:00 am — Tap 1 — Caroline Moro-Dalicandro (New)'),
  klass('sat-1215-lyrical-23', 6, '12:15', 'Saturday, 12:15 pm — Lyrical Jazz 2 & 3 — Tim Turney'),
];

export function classById(id) {
  return CLASSES.find((item) => item.id === id) ?? null;
}

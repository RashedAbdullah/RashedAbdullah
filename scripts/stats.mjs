// Turns the raw numbers into what the card shows. Pure: no network, no clock.
import config from "./config.mjs";

const DAY = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);
const utc = (s) => new Date(`${s}T00:00:00Z`);
export const addDays = (s, n) => iso(new Date(utc(s).getTime() + n * DAY));
/** The instant shifted so that its UTC fields read as Dhaka's clock. */
const local = (instant) => new Date(new Date(instant).getTime() + config.utcOffset * 3_600_000);

/**
 * When each part of the day begins, in minutes after midnight in Dhaka.
 * Karachi angles (18°/18°) and the Hanafi Asr, good to a minute or two.
 */
export function dayParts(dateStr) {
  const rad = Math.PI / 180;
  const n = utc(dateStr).getTime() / DAY + 2440587.5 - 2451545 + 0.25;
  const g = (357.529 + 0.98560028 * n) * rad;
  const q = 280.459 + 0.98564736 * n;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * n) * rad;
  const decl = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad / 15;
  let eqt = q / 15 - ra;
  eqt -= 24 * Math.round(eqt / 24);
  const noon = 12 + config.utcOffset - config.lon / 15 - eqt;
  const lat = config.lat * rad;
  const hours = (alt) =>
    Math.acos((Math.sin(alt * rad) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl))) / rad / 15;
  const asr = Math.atan(1 / (2 + Math.tan(Math.abs(lat - decl)))) / rad;
  return [
    ["Fajr", noon - hours(-18)],
    ["Duha", noon - hours(-0.833)],
    ["Dhuhr", noon],
    ["Asr", noon + hours(asr)],
    ["Maghrib", noon + hours(-0.833)],
    ["Isha", noon + hours(-18)],
  ].map(([name, h]) => ({ name, start: h * 60 }));
}

export function makeStats(data) {
  const today = iso(local(data.now));
  const days = data.days.filter((d) => d.date <= today);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const sum = (a) => a.reduce((s, d) => s + d.count, 0);

  // GitHub's own "last year": 53 columns of weeks starting on Sunday, so the
  // total here is the one on the profile
  const firstDay = addDays(today, -(52 * 7 + utc(today).getUTCDay()));
  const last12 = days.filter((d) => d.date >= firstDay);
  const best = last12.reduce((a, b) => (b.count > a.count ? b : a), { date: today, count: 0 });

  // streaks: a day still empty today doesn't break the current one
  let longest = { length: 0, from: today, to: today };
  let run = 0;
  const joined = iso(local(data.joined));
  for (let d = joined; d <= today; d = addDays(d, 1)) {
    run = (byDate.get(d)?.count ?? 0) > 0 ? run + 1 : 0;
    if (run > longest.length) longest = { length: run, from: addDays(d, 1 - run), to: d };
  }
  let current = 0;
  let d = byDate.get(today)?.count ? today : addDays(today, -1);
  for (; byDate.get(d)?.count; d = addDays(d, -1)) current++;

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const key = iso(new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1 - i, 1))).slice(0, 7);
    months.push({ key, count: sum(days.filter((x) => x.date.startsWith(key))), current: i === 0 });
  }

  const years = [];
  for (let y = +joined.slice(0, 4); y <= +today.slice(0, 4); y++)
    years.push({ year: y, count: sum(days.filter((x) => x.date.startsWith(`${y}-`))) });

  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const day = (config.weekStart + i) % 7;
    return { day, count: sum(last12.filter((x) => utc(x.date).getUTCDay() === day)) };
  });

  const hours = Array(24).fill(0);
  const parts = dayParts(today).map((p) => ({ ...p, count: 0 }));
  for (const c of data.commits) {
    const t = local(c);
    hours[t.getUTCHours()]++;
    const minute = t.getUTCHours() * 60 + t.getUTCMinutes();
    const starts = dayParts(iso(t));
    // after midnight and before Fajr still belongs to Isha
    let i = 5;
    for (let k = 0; k < 6; k++) if (minute >= starts[k].start) i = k;
    parts[i].count++;
  }

  const total = Object.values(data.languages).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(data.languages)
    .map(([name, v]) => ({ name, share: v / total }))
    .sort((a, b) => b.share - a.share);
  const languages = sorted.slice(0, config.languages);
  const rest = sorted.slice(config.languages).reduce((s, l) => s + l.share, 0);
  if (rest > 0.0005) languages.push({ name: "Other", share: rest, other: true });

  return {
    ...data,
    today,
    firstDay,
    byDate,
    total: sum(days),
    total12: sum(last12),
    active12: last12.filter((x) => x.count > 0).length,
    days12: last12.length,
    best,
    longest,
    current,
    months,
    years,
    weekdays,
    hours,
    parts,
    commitCount: data.commits.length,
    languages,
  };
}

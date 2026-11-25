// Draws the card: a leather-bound kitab in Dirasah's colours. Each panel is a
// function of (stats, x, y, width) that returns its markup and height, so the
// wide and the phone card are the same panels arranged differently.
import { readFileSync } from "node:fs";
import config from "./config.mjs";
import { addDays } from "./stats.mjs";

const THEMES = {
  light: {
    paper: "#FBF5EE", edge: "#E4D6C7", ink: "#2A1A1C", muted: "#6F5C55", mark: "#7A1F2B", band: "#FBF5EE",
    l0: "#EADCCF", l1: "#E3B3AF", l2: "#C47478", l3: "#9C3A44", l4: "#651420",
    leather1: "#85242F", leather2: "#5E1620", gold: "#F2B544", plank: "#C9B29B",
  },
  dark: {
    paper: "#1A1012", edge: "#3A2629", ink: "#F6ECE4", muted: "#B7A49C", mark: "#AD4650", band: "#1A1012",
    l0: "#2C1D20", l1: "#5B262D", l2: "#91414A", l3: "#C2686D", l4: "#F0A9A9",
    leather1: "#651A25", leather2: "#3E0E17", gold: "#F2B544", plank: "#4E3538",
  },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const n = (v) => Math.round(v * 100) / 100;
const num = (v) => v.toLocaleString("en-US");
const plural = (v, one, many = `${one}s`) => `${num(v)} ${v === 1 ? one : many}`;
const pct = (v) => (v > 0 && v < 0.01 ? "<1%" : `${Math.round(v * 100)}%`);
const date = (s, year = true) =>
  `${MONTHS[+s.slice(5, 7) - 1]} ${+s.slice(8)}${year ? `, ${s.slice(0, 4)}` : ""}`;
const range = (a, b) => `${date(a, a.slice(0, 4) !== b.slice(0, 4))} to ${date(b)}`;

const text = (x, y, s, cls, attrs = "") => `<text x="${n(x)}" y="${n(y)}" class="${cls}" ${attrs}>${esc(s)}</text>`;
const END = 'text-anchor="end"';
const MID = 'text-anchor="middle"';
const heading = (x, y, w, title, note) =>
  text(x, y + 16, title, "h") + (note ? text(x + w, y + 16, note, "m", END) : "");

/** An eight-pointed star (khatam) around 0,0. */
function star(r, points = 8, inner = 0.765) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const k = i % 2 ? r * inner : r;
    d += `${i ? "L" : "M"}${n(Math.cos(a) * k)} ${n(Math.sin(a) * k)}`;
  }
  return `${d}Z`;
}

/** The gold-tooled medallion (shamsa) of a kitab's cover, Dirasah's mark in its middle. */
function medallion(cx, cy, R) {
  const at = (r, a) => `${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`;
  let petals = "";
  let rays = "";
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N - Math.PI / 2;
    const h = Math.PI / N;
    petals += `M${at(R * 0.8, a - h)}Q${at(R * 0.99, a - h * 0.75)} ${at(R, a)}Q${at(R * 0.99, a + h * 0.75)} ${at(R * 0.8, a + h)}`;
    rays += `<circle cx="${n(Math.cos(a) * R * 1.09)}" cy="${n(Math.sin(a) * R * 1.09)}" r="${n(R * 0.018)}"/>`;
  }
  // {16/6} star lines
  let web = "";
  for (let i = 0; i < N; i++)
    web += `M${at(R * 0.8, (2 * Math.PI * i) / N - Math.PI / 2)}L${at(R * 0.8, (2 * Math.PI * (i + 6)) / N - Math.PI / 2)}`;
  const s = (R * 0.6) / 108;
  return `<g transform="translate(${cx} ${cy})">
<g class="turn"><g fill="none" stroke="var(--gold)" stroke-width="1.2" stroke-linejoin="round">
<path d="${petals}"/><circle r="${n(R * 0.8)}"/><path d="${web}" stroke-width=".8" opacity=".7"/></g>
<g fill="var(--gold)">${rays}</g></g>
<circle r="${n(R * 0.46)}" fill="var(--leather2)" stroke="var(--gold)" stroke-width="1.6"/>
<circle r="${n(R * 0.41)}" fill="none" stroke="var(--gold)" stroke-width=".7" opacity=".7"/>
<g transform="scale(${n(s * 100) / 100}) translate(-58 -65)">
<g fill="#FBF5EE" mask="url(#low)"><rect x="10" y="78" width="82" height="24" rx="5"/><rect x="22" y="52" width="76" height="22" rx="5"/></g>
<path d="M42 44H54V90L48 84L42 90Z" fill="var(--gold)"/>
<g fill="#FBF5EE" mask="url(#top)"><rect x="34" y="28" width="72" height="20" rx="5"/></g></g></g>`;
}

const DEFS = `<mask id="low" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/><path d="M42 44H54V90L48 84L42 90Z" fill="#000" stroke="#000" stroke-width="3" stroke-linejoin="round"/><rect x="76" y="78" width="3" height="24" fill="#000"/><rect x="82" y="52" width="3" height="22" fill="#000"/></mask>
<mask id="top" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/><rect x="90" y="28" width="3" height="20" fill="#000"/></mask>
<linearGradient id="leather" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--leather1)"/><stop offset="1" stop-color="var(--leather2)"/></linearGradient>
<pattern id="tile" width="44" height="44" patternUnits="userSpaceOnUse"><g fill="none" stroke="var(--gold)" stroke-width=".7"><path transform="translate(22 22)" d="${star(15.6)}"/><path d="M22 6.4V0M22 37.6V44M6.4 22H0M37.6 22H44M11 11L0 0M33 11L44 0M11 33L0 44M33 33L44 44"/></g></pattern>
<path id="day" d="${star(6.4)}"/>`;

/** The gold rules tooled around a leather board, a star in each corner. */
function tooling(x, y, w, h) {
  const c = 20;
  const corners = [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]];
  const frame = `M${x + c} ${y}H${x + w - c}Q${x + w - c} ${y + c} ${x + w} ${y + c}V${y + h - c}Q${x + w - c} ${y + h - c} ${x + w - c} ${y + h}H${x + c}Q${x + c} ${y + h - c} ${x} ${y + h - c}V${y + c}Q${x + c} ${y + c} ${x + c} ${y}Z`;
  return `<path d="${frame}" fill="none" stroke="var(--gold)" stroke-width="1.4"/>
<g fill="var(--gold)">${corners.map(([a, b]) => `<path transform="translate(${a} ${b})" d="${star(5.5)}"/>`).join("")}</g>`;
}

/** The streak, written on the book's ribbon. */
function ribbon(s, cx, y, w, h) {
  const x = cx - w / 2;
  return `<g class="drop"><path d="M${x} ${y}H${x + w}V${y + h}L${cx} ${y + h - 20}L${x} ${y + h}Z" fill="var(--gold)"/>
${text(cx, y + h - 64, num(s.current), "rn", MID)}${text(cx, y + h - 40, "day streak", "rl", MID)}</g>`;
}

function figures(s, x, y, w, cols) {
  const items = [
    [num(s.total12), "contributions", "in the last year"],
    [num(s.total), "contributions", `since ${MONTHS[+s.joined.slice(5, 7) - 1]} ${s.joined.slice(0, 4)}`],
    [num(s.longest.length), s.longest.length === 1 ? "day, longest streak" : "days, longest streak", range(s.longest.from, s.longest.to)],
  ];
  const cw = w / cols;
  return items
    .map(([v, a, b], i) => {
      const px = x + cw * (i % cols);
      const py = y + Math.floor(i / cols) * 104;
      return text(px, py + 38, v, "big") + text(px, py + 62, a, "b") + text(px, py + 82, b, "m");
    })
    .join("");
}

function calendar(s, x, y, w, weeks, title) {
  const left = 34;
  const pitch = (w - left) / weeks;
  const k = Math.min(1, pitch / 14);
  const row = Math.max(pitch, 13.6);
  const top = y + 52;
  const first = addDays(s.firstDay, (53 - weeks) * 7);
  let cells = "";
  let labels = "";
  let lastLabel = -9;
  const shown = [...s.byDate.values()].filter((d) => d.date >= first && d.date <= s.today);
  const best = shown.reduce((a, b) => (b.count > a.count ? b : a), { date: s.today, count: 0 });
  const active = shown.filter((d) => d.count > 0).length;
  for (let c = 0; c < weeks; c++) {
    const sunday = addDays(first, c * 7);
    if (+sunday.slice(8) <= 7 && c - lastLabel > 2 && c < weeks - 1) {
      labels += text(x + left + c * pitch, top - 9, MONTHS[+sunday.slice(5, 7) - 1], "s");
      lastLabel = c;
    }
    for (let r = 0; r < 7; r++) {
      const d = addDays(sunday, r);
      if (d > s.today) break;
      const day = s.byDate.get(d);
      const px = x + left + c * pitch + pitch / 2;
      const py = top + r * row + row / 2;
      cells += `<use href="#day" transform="translate(${n(px)} ${n(py)})${k < 1 ? ` scale(${n(k)})` : ""}" class="l${day?.level ?? 0}${d === s.today ? " now" : ""}"${d === s.today ? ' stroke="var(--gold-line)" stroke-width="1.6"' : ""}/>`;
    }
  }
  for (const r of [1, 3, 5]) labels += text(x, top + r * row + row / 2 + 4.5, WEEKDAYS[r], "s");
  const bottom = top + 7 * row + 26;
  let legend = "";
  const ly = bottom + (w < 500 ? 26 : 0);
  const lx = x + w - 5 * 16 - 38;
  for (let i = 0; i < 5; i++) legend += `<use href="#day" transform="translate(${n(lx + i * 16 + 8)} ${n(ly - 5)})" class="l${i}"/>`;
  legend += text(lx - 8, ly, "Less", "s", END) + text(x + w, ly, "More", "s", END);
  const note = `Busiest day: ${date(best.date)}, ${plural(best.count, "contribution")}`;
  return {
    h: ly - y + 4,
    svg: heading(x, y, w, title, plural(active, "active day")) + labels + cells + legend + text(x, bottom, note, "s") ,
  };
}

/** Twelve months as kitabs standing on a shelf. */
function shelf(s, x, y, w) {
  const H = 138;
  const top = y + 56;
  const base = top + H;
  const max = Math.max(1, ...s.months.map((m) => m.count));
  const slot = w / 12;
  const bw = Math.min(30, slot - 7);
  let g = "";
  s.months.forEach((m, i) => {
    const h = Math.max(m.count ? 5 : 2, (m.count / max) * H);
    const bx = x + slot * i + (slot - bw) / 2;
    const by = base - h;
    const r = Math.min(4, h);
    let book = `<path d="M${n(bx)} ${base}V${n(by + r)}Q${n(bx)} ${n(by)} ${n(bx + r)} ${n(by)}H${n(bx + bw - r)}Q${n(bx + bw)} ${n(by)} ${n(bx + bw)} ${n(by + r)}V${base}Z" fill="var(--mark)"/>`;
    if (h > 34)
      for (const b of [by + 9, by + 13.5, base - 11, base - 15.5])
        book += `<rect x="${n(bx)}" y="${n(b)}" width="${n(bw)}" height="1.8" fill="var(--band)"/>`;
    if (h > 74) book += `<path transform="translate(${n(bx + bw / 2)} ${n((by + base) / 2)})" d="${star(Math.min(7, bw / 3.6))}" fill="var(--gold)"/>`;
    g += `<g>${book}</g>`;
    g += text(bx + bw / 2, by - 8, num(m.count), m.count === max ? "v" : "s", MID);
    g += text(bx + bw / 2, base + 25, MONTHS[+m.key.slice(5) - 1], m.current ? "v" : "s", MID);
  });
  g += `<rect x="${x}" y="${base}" width="${w}" height="6" rx="2" fill="var(--plank)"/>`;
  return { h: base + 30 - y, svg: heading(x, y, w, "The shelf of months", "one kitab each") + g };
}

/** Kitabs lying down, one per row: [label, share of the longest, value]. */
function lying(x, y, w, rows, labelW, valueW, rowH) {
  const track = w - labelW - valueW;
  return rows
    .map(([label, k, value, marked], i) => {
      const py = y + i * rowH;
      const bh = 18;
      const bw = Math.max(4, k * track);
      const bx = x + labelW;
      let g = `<path d="M${bx} ${py}H${n(bx + bw - 4)}Q${n(bx + bw)} ${py} ${n(bx + bw)} ${py + 4}V${py + bh - 4}Q${n(bx + bw)} ${py + bh} ${n(bx + bw - 4)} ${py + bh}H${bx}Z" fill="var(--mark)"/>`;
      if (bw > 44)
        for (const b of [bw - 9, bw - 13.5]) g += `<rect x="${n(bx + b)}" y="${py}" width="1.8" height="${bh}" fill="var(--band)"/>`;
      if (marked && bw > 44)
        g += `<path d="M${bx + 16} ${py - 4}H${bx + 25}V${py + bh + 8}L${bx + 20.5} ${py + bh + 3.5}L${bx + 16} ${py + bh + 8}Z" fill="var(--gold)" stroke="var(--paper)" stroke-width="1.5"/>`;
      return `${text(x, py + 14, label, "b")}${g}${text(bx + bw + 9, py + 14, value, "v")}`;
    })
    .join("");
}

function volumes(s, x, y, w) {
  const years = s.years.slice(-5);
  const max = Math.max(1, ...years.map((v) => v.count));
  const rows = [...years].reverse().map((v, i) => [String(v.year), v.count / max, num(v.count), i === 0]);
  const H = 168;
  const rowH = H / Math.max(4, rows.length);
  return {
    h: 56 + H,
    svg: heading(x, y, w, "Volumes", "by year") + lying(x, y + 56, w, rows, 48, 54, rowH),
  };
}

function languages(s, x, y, w) {
  const max = Math.max(0.01, ...s.languages.map((l) => l.share));
  const rows = s.languages.map((l, i) => [l.name, l.share / max, pct(l.share), i === 0]);
  const repos = s.publicRepos + s.privateRepos;
  return {
    h: 50 + rows.length * 34,
    svg:
      heading(x, y, w, "Languages", `in ${plural(repos, "repository", "repositories")}`) +
      lying(x, y + 56, w, rows, 98, 48, 34),
  };
}

/** Commits around the clock, and by which prayer opened that part of the day. */
function day(s, x, y, w) {
  const R0 = 36;
  const R1 = 82;
  const cx = x + 100;
  const cy = y + 150;
  const max = Math.max(1, ...s.hours);
  const peak = s.hours.indexOf(max);
  const ang = (h) => (h / 24) * 2 * Math.PI - Math.PI / 2;
  const p = (r, a) => `${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
  let g = `<circle cx="${cx}" cy="${cy}" r="${R1 + 5}" fill="none" stroke="var(--edge)"/>`;
  s.hours.forEach((c, h) => {
    const a0 = ang(h) + 0.035;
    const a1 = ang(h + 1) - 0.035;
    const r = R0 + Math.max(c ? 2 : 1, (c / max) * (R1 - R0));
    g += `<path d="M${p(R0, a0)}L${p(r, a0)}A${n(r)} ${n(r)} 0 0 1 ${p(r, a1)}L${p(R0, a1)}A${R0} ${R0} 0 0 0 ${p(R0, a0)}Z" fill="var(--${c ? "mark" : "l0"})"/>`;
  });
  // the five prayers and sunrise, today, on the rim
  for (const t of s.parts) {
    const a = ang(t.start / 60);
    g += `<path transform="translate(${p(R1 + 5, a)})" d="${star(t.name === "Duha" ? 3.2 : 5)}" fill="var(--gold-line)" stroke="var(--paper)" stroke-width="1.2"/>`;
  }
  g += `<circle cx="${cx}" cy="${cy}" r="${R0 - 5}" fill="none" stroke="var(--edge)"/>`;
  const clock = (h) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
  g += text(cx, cy - 3, "peak", "s", MID) + text(cx, cy + 14, clock(peak), "v", MID);
  g += text(cx, cy - R1 - 14, "midnight", "s", MID) + text(cx, cy + R1 + 25, "noon", "s", MID);
  const lx = x + 226;
  const total = Math.max(1, s.commitCount);
  const top = Math.max(...s.parts.map((t) => t.count));
  s.parts.forEach((t, i) => {
    const ly = y + 72 + i * 31;
    const cls = t.count === top ? "v" : "b";
    g += `<line x1="${lx}" x2="${x + w}" y1="${ly + 11}" y2="${ly + 11}" stroke="var(--edge)"/>`;
    g += text(lx, ly, `${t.name}`, cls) + text(x + w, ly, pct(t.count / total), "v", END);
  });
  return { h: 267, svg: heading(x, y, w, "Between the prayers", `${num(s.commitCount)} commits`) + g };
}

function week(s, x, y, w) {
  const H = 108;
  const base = y + 56 + H;
  const max = Math.max(1, ...s.weekdays.map((d) => d.count));
  const slot = w / 7;
  const bw = 24;
  let g = `<line x1="${x}" x2="${x + w}" y1="${base}" y2="${base}" stroke="var(--plank)"/>`;
  s.weekdays.forEach((d, i) => {
    const h = Math.max(2, (d.count / max) * H);
    const bx = x + slot * i + (slot - bw) / 2;
    const by = base - h;
    g += `<g><path d="M${n(bx)} ${base}V${n(by + 12)}Q${n(bx)} ${n(by + 5)} ${n(bx + bw / 2)} ${n(by)}Q${n(bx + bw)} ${n(by + 5)} ${n(bx + bw)} ${n(by + 12)}V${base}Z" fill="var(--mark)"/></g>`;
    g += text(bx + bw / 2, by - 8, num(d.count), d.count === max ? "v" : "s", MID);
    g += text(bx + bw / 2, base + 20, WEEKDAYS[d.day], d.count === max ? "v" : "s", MID);
  });
  return { h: base + 24 - y, svg: heading(x, y, w, "The week", "in the last year") + g };
}

function records(s, x, y, w) {
  const bestMonth = s.months.reduce((a, b) => (b.count > a.count ? b : a));
  const rows = [
    ["Public repositories", num(s.publicRepos)],
    s.privateRepos ? ["Private repositories", num(s.privateRepos)] : null,
    ["Stars earned", num(s.stars)],
    s.followers ? ["Followers", num(s.followers)] : null,
    ["Pull requests, last year", num(s.prs)],
    s.reviews ? ["Code reviews, last year", num(s.reviews)] : null,
    s.issues ? ["Issues opened, last year", num(s.issues)] : null,
    ["Best month", `${MONTHS[+bestMonth.key.slice(5) - 1]} ${bestMonth.key.slice(0, 4)}`],
    ["Average, active day", (s.total12 / Math.max(1, s.active12)).toFixed(1)],
  ].filter(Boolean).slice(0, 6);
  const rowH = 25.5;
  const g = rows
    .map(([a, b], i) => {
      const py = y + 58 + i * rowH;
      return `<line x1="${x}" x2="${x + w}" y1="${n(py + 8)}" y2="${n(py + 8)}" stroke="var(--edge)"/>${text(x, py, a, "b")}${text(x + w, py, b, "v", END)}`;
    })
    .join("");
  return { h: 188, svg: heading(x, y, w, "Records") + g };
}

function style(theme) {
  const vars = (t) => Object.entries(THEMES[t]).map(([k, v]) => `--${k}:${v}`).join(";") + `;--gold-line:${t === "light" ? "#C98A12" : "#F2B544"}`;
  const font = (w) =>
    `@font-face{font-family:R;font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(new URL(`fonts/roboto-${w}.woff2`, import.meta.url)).toString("base64")}) format("woff2")}`;
  return `<style>${font(400)}${font(700)}
svg{${vars(theme === "auto" ? "light" : theme)}}
${theme === "auto" ? `@media (prefers-color-scheme:dark){svg{${vars("dark")}}}` : ""}
text{font-family:R,Roboto,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;font-size:14px;fill:var(--ink)}
.h{font-size:18px;font-weight:700}.b{font-size:15px}.v{font-size:14px;font-weight:700}.m{fill:var(--muted)}.s{font-size:13px;fill:var(--muted)}
.big{font-size:42px;font-weight:700;letter-spacing:-.5px}
.name{font-size:44px;font-weight:700;fill:#FBF5EE;letter-spacing:-.5px}.tag{font-size:18px;fill:#F2B544}.on{font-size:15px;fill:#F3DDD6}.onb{font-size:15px;font-weight:700;fill:#FBF5EE}
.rn{font-size:36px;font-weight:700;fill:#2A1A1C}.rl{font-size:14px;fill:#2A1A1C}
.l0{fill:var(--l0)}.l1{fill:var(--l1)}.l2{fill:var(--l2)}.l3{fill:var(--l3)}.l4{fill:var(--l4)}
@media (prefers-reduced-motion:no-preference){
.drop{transform-box:fill-box;transform-origin:50% 0;animation:sway 7s ease-in-out infinite alternate}
.now{animation:glow 2.4s ease-in-out infinite alternate}
.turn{animation:turn 160s linear infinite}}
@keyframes sway{from{transform:skewX(0)}to{transform:skewX(1.6deg)}}@keyframes glow{to{stroke-opacity:.25}}@keyframes turn{to{transform:rotate(360deg)}}</style>`;
}

function shell(s, w, h, theme, body) {
  const label = `${s.name} on GitHub: ${plural(s.total12, "contribution")} in the last year, ${num(s.total)} in all, a current streak of ${plural(s.current, "day")} and a longest of ${num(s.longest.length)}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${n(h)}" width="${w}" height="${n(h)}" role="img" aria-label="${esc(label)}">
${style(theme)}<defs>${DEFS}<clipPath id="card"><rect width="${w}" height="${n(h)}" rx="18"/></clipPath></defs>
<g clip-path="url(#card)"><rect width="${w}" height="${n(h)}" fill="var(--paper)"/>${body}</g>
<rect x=".5" y=".5" width="${w - 1}" height="${n(h - 1)}" rx="17.5" fill="none" stroke="var(--edge)"/></svg>
`;
}

const board = (y, w, h) =>
  `<rect y="${n(y)}" width="${w}" height="${h}" fill="url(#leather)"/><rect y="${n(y)}" width="${w}" height="${h}" fill="url(#tile)" opacity=".09"/>`;

const since = (s) => `On GitHub since ${MONTHS[+s.joined.slice(5, 7) - 1]} ${s.joined.slice(0, 4)}`;

function footer(s, y, w, pad, mobile) {
  const h = mobile ? 92 : 64;
  const b = config.building;
  const left = `<text x="${pad}" y="${n(y + (mobile ? 40 : 38))}" class="on">Building <tspan class="onb">${esc(b.name)}</tspan>, ${esc(b.url)}</text>`;
  const note = `Redrawn every night, last on ${date(s.today)}`;
  return {
    h,
    svg: board(y, w, h) + `<rect y="${n(y)}" width="${w}" height="3" fill="var(--gold)"/>` + left +
      (mobile ? text(pad, y + 66, note, "on") : text(w - pad, y + 38, note, "on", END)),
  };
}

function desktop(s, theme) {
  const W = 840;
  const P = 40;
  const I = W - P * 2;
  const gap = 48;
  const half = (I - gap) / 2;
  const head = 216;
  let y = head;
  let body = ribbon(s, 690, head - 10, 92, 136);
  body += board(0, W, head) + tooling(14, 14, W - 28, head - 28);
  body += medallion(690, head / 2, 76);
  body += text(P + 12, 88, s.name, "name") + text(P + 12, 122, config.tagline, "tag");
  body += `<text x="${P + 12}" y="164" class="on">@${esc(s.login)}<tspan dx="20">${esc(config.place)}</tspan><tspan dx="20">${esc(since(s))}</tspan></text>`;
  y += 34;
  body += figures(s, P, y, 590, 3);
  y += 122;
  const put = (panel) => ((body += panel.svg), panel.h);
  y += put(calendar(s, P, y, I, 53, "A year, day by day")) + 44;
  y += Math.max(put(shelf(s, P, y, 490)), put(volumes(s, P + 490 + gap - 8, y, I - 490 - gap + 8))) + 44;
  y += Math.max(put(languages(s, P, y, half)), put(day(s, P + half + gap, y, half))) + 44;
  y += Math.max(put(week(s, P, y, half)), put(records(s, P + half + gap, y, half))) + 44;
  const f = footer(s, y, W, P, false);
  return shell(s, W, y + f.h, theme, body + f.svg);
}

function phone(s, theme) {
  const W = 420;
  const P = 24;
  const I = W - P * 2;
  const head = 344;
  let y = head;
  let body = ribbon(s, 338, head - 10, 92, 128);
  body += board(0, W, head) + tooling(12, 12, W - 24, head - 24);
  body += medallion(W / 2, 112, 72);
  body += text(W / 2, 240, s.name, "name", `${MID} style="font-size:36px"`) + text(W / 2, 270, config.tagline, "tag", `${MID} style="font-size:17px"`);
  body += text(W / 2, 302, `@${s.login}, ${config.place}`, "on", MID);
  y += 34;
  const items = figures(s, P, y, I, 1);
  body += items;
  y += 104 * 3 + 12;
  const put = (panel) => ((body += panel.svg), (y += panel.h + 44));
  put(calendar(s, P, y, I, 24, "The last 24 weeks"));
  put(shelf(s, P, y, I));
  put(volumes(s, P, y, I));
  put(languages(s, P, y, I));
  put(day(s, P, y, I));
  put(week(s, P, y, I));
  put(records(s, P, y, I));
  const f = footer(s, y, W, P, true);
  return shell(s, W, y + f.h, theme, body + f.svg);
}

export const drawCard = (s, { theme, mobile }) => (mobile ? phone(s, theme) : desktop(s, theme));

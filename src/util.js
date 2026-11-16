// Small helpers: distance, time, money, names, matching.

import { STREET_POINTS } from "./streets.js";
import { HOOD, PLACES } from "./config.js";

export function metersBetween(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** "Next door", "350 ft", "0.4 mi" */
export function distanceLabel(m) {
  if (!Number.isFinite(m)) return "";
  if (m < 45) return "Next door";
  const ft = m * 3.281;
  if (ft < 1000) return `${Math.round(ft / 10) * 10} ft`;
  const mi = m / 1609.34;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

/** About 80 meters a minute on foot. */
export const walkTime = (m) => (!Number.isFinite(m) || m < 45 ? "" : `${Math.max(1, Math.round(m / 80))} min walk`);

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return "Yesterday";
  if (s < 604800) return `${Math.round(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();

/** "Tonight 6:30 PM", "Tomorrow 6:30 AM", "Sat 4:00 PM", "Nov 30, 10:00 AM" */
export function eventWhen(startIso, endIso) {
  if (!startIso) return "";
  const s = new Date(startIso);
  const now = new Date();
  const time = s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const tomorrow = new Date(now.getTime() + 86400000);
  let day;
  if (endIso && new Date(startIso) <= now && new Date(endIso) >= now) return `Happening now · until ${new Date(endIso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (sameDay(s, now)) day = s.getHours() >= 17 ? "Tonight" : "Today";
  else if (sameDay(s, tomorrow)) day = "Tomorrow";
  else if (s - now < 7 * 86400000 && s > now) day = s.toLocaleDateString(undefined, { weekday: "long" });
  else day = s.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

/** "4–8 PM", "9:30–11 AM", "11 AM–1 PM" — the way Apple Calendar writes times. */
export function timeRange(startIso, endIso) {
  const fmt = (d, withPeriod) => {
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes();
    return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""}${withPeriod ? (d.getHours() < 12 ? " AM" : " PM") : ""}`;
  };
  const s = new Date(startIso);
  if (!endIso) return fmt(s, true);
  const e = new Date(endIso);
  const samePeriod = s.getHours() < 12 === e.getHours() < 12;
  return `${fmt(s, !samePeriod)}–${fmt(e, true)}`;
}

/** { day: "SAT", date: "21" } for calendar badges */
export function dateBadge(iso) {
  const d = new Date(iso);
  return { day: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(), date: String(d.getDate()) };
}

export const money = (n) => `$${Math.round(n || 0).toLocaleString("en-US")}`;
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "Neighbor";
export const initials = (name) =>
  String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** The real street a point is on, from every street segment in the neighborhood. */
export function nearestStreet(p) {
  let best = null;
  let bestD = Infinity;
  for (const [name, lat, lng] of STREET_POINTS) {
    const d = metersBetween(p, { lat, lng });
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return bestD < 250 ? best : HOOD.name;
}

/** Where a post is: a named place if it's at one (a park, the library), otherwise the author's street. */
export function whereLabel(p, author) {
  for (const place of PLACES) if (metersBetween(p, place) < 160) return place.name;
  return author?.street || HOOD.name;
}

const STOP = new Set(("a an the any anyone anybody have has for to of my me i can could need someone lend borrow please this that with and or is it on in do you some " +
  "afternoon weekend day today tomorrow use would just really does know week morning evening tonight monday tuesday wednesday thursday friday saturday sunday " +
  "few hours hour while thanks thank who where car won start help thing stuff get got dead died broke broken new old big small out our your party house good recommendations").split(" "));

/** Words worth matching in a request: "Anyone have a ladder?" → ["ladder"] */
export function keywords(text) {
  return [...new Set(String(text).toLowerCase().match(/[a-z]+/g) || [])]
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(es|s)$/, ""));
}

/** Whole-word match on a post's title and category ("carry" must not match "car"). */
export function matches(post, words) {
  const own = new Set((`${post.title} ${post.category}`.toLowerCase().match(/[a-z]+/g) || []).map((w) => w.replace(/(es|s)$/, "")));
  return words.some((w) => own.has(w));
}

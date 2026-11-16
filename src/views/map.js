// The neighborhood map: one pin per post, colored by kind. Urgent alerts pulse; events show their date.

import L from "leaflet";
import { store } from "../db.js";
import { app, me, here, nav } from "../state.js";
import { icon } from "../ui/icons.js";
import { kindOf } from "../ui/kinds.js";
import { HOOD, HOOD_BOUNDS } from "../config.js";

const GLIDE = { duration: 0.9, easeLinearity: 0.2 };

let map;
const markers = new Map(); // post id → marker
const keys = new Map(); // post id → what the pin shows (redraw only on change)
let meMarker;
let highlighted = null;

export function initMap(el) {
  map = L.map(el, {
    zoomControl: false, minZoom: 13, maxZoom: 19,
    // Fine-grained, gentle zooming so scroll-wheel and trackpad zoom glide instead of jumping.
    zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 110, wheelDebounceTime: 24,
    maxBounds: HOOD_BOUNDS, maxBoundsViscosity: 0.85, inertiaDeceleration: 2600,
  }).setView([HOOD.lat, HOOD.lng], HOOD.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  updateMap();
  return map;
}

export const getMap = () => map;

// The map is hidden on phones unless the Map tab is open; moving a hidden (zero-size) map throws.
const visible = () => Boolean(map && map.getContainer().offsetWidth > 0 && map.getContainer().offsetHeight > 0);
function safely(fn) {
  if (!visible()) return;
  try {
    fn();
  } catch (err) {
    console.warn("Map move skipped:", err);
  }
}

// Posts at the same spot (same author's home) fan out in a small circle so every pin can be tapped.
function spread(posts) {
  const groups = new Map();
  for (const p of posts) {
    const k = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const pos = new Map();
  for (const list of groups.values()) {
    list.forEach((p, i) => {
      if (list.length === 1) return pos.set(p.id, [p.lat, p.lng]);
      const a = (i / list.length) * Math.PI * 2;
      const r = 0.00012 + list.length * 0.000006;
      pos.set(p.id, [p.lat + Math.sin(a) * r, p.lng + Math.cos(a) * r * 1.27]);
    });
  }
  return pos;
}

function pinHtml(p, mode, delay) {
  const k = kindOf(p);
  const urgent = p.kind === "alert" && p.urgent && p.status !== "done";
  const label = p.kind === "event" ? `<span class="pin-label">${new Date(p.starts_at).toLocaleDateString(undefined, { weekday: "short" })}</span>` : "";
  return `<span class="pin ${mode}${urgent ? " urgent" : ""}${p.status !== "open" ? " dim" : ""}" style="--h:${k.hue};--d:${delay}ms">` +
    `<span class="pin-face">${icon(k.icon, 15, 2.2)}</span>${label}</span>`;
}

let firstDraw = true;

export function updateMap() {
  if (!map) return;
  const visible = store.posts.filter((p) => app.layers.has(p.kind) && !(p.kind === "alert" && p.status === "done") && !(p.kind === "ask" && p.status === "done"));
  const pos = spread(visible);
  const shown = new Set();
  let order = 0;
  for (const p of visible) {
    shown.add(p.id);
    const key = `${p.kind}|${p.status}|${p.urgent}|${p.starts_at}`;
    let m = markers.get(p.id);
    const latlng = pos.get(p.id);
    if (!m) {
      const iconObj = L.divIcon({ html: pinHtml(p, firstDraw ? "drop" : "pop", firstDraw ? order++ * 14 : 0), className: "pin-wrap", iconSize: [36, 36], iconAnchor: [18, 18] });
      m = L.marker(latlng, { icon: iconObj, title: p.title, riseOnHover: true, keyboard: true, zIndexOffset: p.urgent ? 800 : 0 }).addTo(map);
      m.on("click", () => nav.openPost(p.id));
      markers.set(p.id, m);
    } else if (keys.get(p.id) !== key) {
      m.setIcon(L.divIcon({ html: pinHtml(p, "pop", 0), className: "pin-wrap", iconSize: [36, 36], iconAnchor: [18, 18] }));
    }
    m.setLatLng(latlng);
    keys.set(p.id, key);
  }
  firstDraw = false;
  for (const [id, m] of markers) {
    if (!shown.has(id)) {
      m.remove();
      markers.delete(id);
      keys.delete(id);
    }
  }

  const you = me();
  if (you) {
    const meKey = `${you.hue}|${you.lat}|${you.lng}`;
    const iconObj = L.divIcon({ html: `<span class="pin-me" style="--h:${you.hue}"><span>You</span></span>`, className: "pin-wrap", iconSize: [48, 48], iconAnchor: [24, 24] });
    if (!meMarker) meMarker = L.marker([you.lat, you.lng], { icon: iconObj, zIndexOffset: 1000, interactive: false, keyboard: false }).addTo(map);
    else if (meMarker.options.meKey !== meKey) meMarker.setIcon(iconObj).setLatLng([you.lat, you.lng]);
    meMarker.options.meKey = meKey;
  } else if (meMarker) {
    meMarker.remove();
    meMarker = null;
  }
}

export function highlightPin(postId) {
  if (highlighted === postId) return;
  const prev = markers.get(highlighted);
  prev?.getElement()?.querySelector(".pin")?.classList.remove("hi");
  prev?.setZIndexOffset(0);
  highlighted = postId;
  const m = markers.get(postId);
  m?.getElement()?.querySelector(".pin")?.classList.add("hi");
  m?.setZIndexOffset(900);
}

export function flyToPost(p) {
  if (!p) return;
  safely(() => {
    const m = markers.get(p.id);
    map.flyTo(m ? m.getLatLng() : L.latLng(p.lat, p.lng), Math.max(map.getZoom(), 16.5), GLIDE);
  });
}

export function flyTo(point, zoom = 17) {
  if (point) safely(() => map.flyTo([point.lat, point.lng], zoom, GLIDE));
}

export function centerOnMe(animate = true) {
  const p = here();
  if (!map) return;
  if (!visible()) {
    pendingCenter = me() ? [p.lat, p.lng, 15.5] : [HOOD.lat, HOOD.lng, HOOD.zoom];
    return;
  }
  safely(() => (me() ? (animate ? map.flyTo([p.lat, p.lng], 15.5, GLIDE) : map.setView([p.lat, p.lng], 15.5)) : map.setView([HOOD.lat, HOOD.lng], HOOD.zoom, { animate })));
}

/** Shows every pin in Mountain House at once. */
export function fitHood(animate = true) {
  safely(() => {
    const pts = [...markers.values()].map((m) => m.getLatLng());
    const opts = { paddingTopLeft: [30, 130], paddingBottomRight: [70, 30] };
    if (!pts.length) map.setView([HOOD.lat, HOOD.lng], HOOD.zoom);
    else if (animate) map.flyToBounds(L.latLngBounds(pts), { ...GLIDE, ...opts });
    else map.fitBounds(L.latLngBounds(pts), { ...opts, animate: false });
  });
}

let pendingCenter = null;

export function refreshSize() {
  if (!visible()) return;
  map.invalidateSize({ animate: false });
  if (pendingCenter) {
    const [lat, lng, z] = pendingCenter;
    pendingCenter = null;
    map.setView([lat, lng], z, { animate: false });
  }
}

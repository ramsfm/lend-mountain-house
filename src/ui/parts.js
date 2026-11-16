// Shared building blocks: avatars, tiles, sheets, toasts, sound, motion and confetti.

import { h, fill, reducedMotion } from "./dom.js";
import { iconEl } from "./icons.js";
import { kindOf } from "./kinds.js";
import { initials } from "../util.js";

export function avatar(n, size = 40) {
  return h("span", { class: "avatar", style: { "--h": n?.hue ?? 210, "--s": `${size}px` }, "aria-hidden": "true" }, initials(n?.name));
}

/** A row of overlapping faces, e.g. who's going to an event. */
export function faces(people, max = 5, size = 26) {
  const shown = people.slice(0, max);
  return h(
    "span",
    { class: "faces", style: { "--s": `${size}px` } },
    shown.map((p) => avatar(p, size)),
    people.length > max ? h("span", { class: "faces-more" }, `+${people.length - max}`) : null,
  );
}

/** A post's picture: its photo, or its category icon on the kind's color. */
export function tile(post, size = 60) {
  const k = kindOf(post);
  const el = h("span", { class: `tile${post.urgent && post.status !== "done" ? " urgent" : ""}`, style: { "--h": k.hue, "--s": `${size}px` }, "aria-hidden": "true" });
  if (post.photo_url) el.append(h("img", { src: post.photo_url, alt: "", loading: "lazy", decoding: "async" }));
  else el.append(iconEl(post.category in CATEGORY_ICON_FALLBACK ? CATEGORY_ICON_FALLBACK[post.category] : post.category, Math.round(size * 0.44), 1.7));
  return el;
}
const CATEGORY_ICON_FALLBACK = { recommendation: "recommendation" };

export function kindChip(kind, { solid = false } = {}) {
  const k = kindOf({ kind });
  return h("span", { class: `kind-chip${solid ? " solid" : ""}`, style: { "--h": k.hue } }, iconEl(k.icon, 13, 2.2), k.tag || k.label);
}

const THREAD_STATUS = {
  requested: ["Requested", "amber"],
  accepted: ["Accepted", "green"],
  done: ["Done", "gray"],
  declined: ["Declined", "gray"],
};
export function statusPill(status, kind) {
  let [label, tone] = THREAD_STATUS[status] || [status, "gray"];
  if (status === "accepted" && kind === "lend") label = "Borrowed";
  if (status === "done" && kind === "lend") label = "Returned";
  if (status === "done" && kind === "free") label = "Picked up";
  if (status === "done" && kind === "sell") label = "Sold";
  if (status === "done" && kind === "ask") label = "Solved";
  return h("span", { class: `pill ${tone}` }, label);
}

export function empty(iconName, title, body, action) {
  return h("div", { class: "empty" }, h("span", { class: "empty-icon" }, iconEl(iconName, 26, 1.7)), h("b", {}, title), body ? h("p", {}, body) : null, action || null);
}

// ---------- Sheets: a bottom sheet on phones, a dialog on desktop ----------

let openSheets = [];

export function sheet(build, { label = "Details", size = "" } = {}) {
  const panel = h("div", { class: `sheet ${size}`, role: "dialog", "aria-modal": "true", "aria-label": label, tabindex: "-1" });
  const backdrop = h("div", { class: "backdrop", onclick: (e) => e.target === backdrop && close() }, panel);
  const lastFocus = document.activeElement;

  function close() {
    if (!backdrop.isConnected || backdrop.classList.contains("closing")) return;
    openSheets = openSheets.filter((s) => s !== api);
    backdrop.classList.add("closing");
    setTimeout(() => backdrop.remove(), 230);
    if (!openSheets.length) document.body.classList.remove("locked");
    lastFocus?.focus?.({ preventScroll: true });
    api.onClose?.();
  }
  function rebuild() {
    const top = panel.scrollTop;
    fill(panel, h("span", { class: "grabber", "aria-hidden": "true" }), build(api));
    panel.scrollTop = top;
  }
  const api = { close, rebuild, panel, onClose: null };
  rebuild();
  document.body.append(backdrop);
  document.body.classList.add("locked");
  openSheets.push(api);
  swipeToClose(panel, close);
  requestAnimationFrame(() => (panel.querySelector("[autofocus]") || panel).focus({ preventScroll: true }));
  return api;
}

export const closeTopSheet = () => openSheets.at(-1)?.close();
export const anySheetOpen = () => openSheets.length > 0;
export const openSheetsList = () => openSheets;

export function sheetHead(title, close, subtitle, leading) {
  return h(
    "div",
    { class: "sheet-head" },
    leading || null,
    h("div", { class: "sheet-head-text" }, h("h2", {}, title), subtitle ? h("p", {}, subtitle) : null),
    h("button", { type: "button", class: "icon-btn close", "aria-label": "Close", onclick: close }, iconEl("x", 18, 2.2)),
  );
}

function swipeToClose(panel, close) {
  let y0 = 0, dy = 0, t0 = 0, active = false;
  panel.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || panel.scrollTop > 0 || e.target.closest("input, textarea, select, .chips, .scroller")) return;
    active = true; y0 = e.clientY; dy = 0; t0 = performance.now();
  });
  panel.addEventListener("pointermove", (e) => {
    if (!active) return;
    dy = Math.max(0, e.clientY - y0);
    if (dy > 4) {
      panel.style.transition = "none";
      panel.style.transform = `translateY(${dy}px)`;
    }
  });
  const end = () => {
    if (!active) return;
    active = false;
    const v = dy / Math.max(1, performance.now() - t0);
    panel.style.transition = "transform .3s cubic-bezier(.22,1,.36,1)";
    if (dy > 120 || v > 0.6) {
      panel.style.transform = "translateY(100%)";
      setTimeout(close, 160);
    } else panel.style.transform = "";
  };
  panel.addEventListener("pointerup", end);
  panel.addEventListener("pointercancel", end);
}

// ---------- Toasts ----------

let toastEl, toastTimer;
export function toast(text, { action, onAction, avatarOf, tone } = {}) {
  if (!toastEl) {
    toastEl = h("div", { class: "toast", role: "status", "aria-live": "polite" });
    document.body.append(toastEl);
  }
  toastEl.className = `toast${tone ? ` ${tone}` : ""}`;
  fill(
    toastEl,
    avatarOf ? avatar(avatarOf, 30) : null,
    h("span", { class: "toast-text" }, text),
    action ? h("button", { type: "button", class: "toast-action", onclick: () => { onAction?.(); toastEl.classList.remove("show"); } }, action) : null,
  );
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), action ? 5500 : 2800);
}

// ---------- Sound, touch and motion ----------

let audio;
export function chime(urgent = false) {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") return;
    const t = audio.currentTime;
    const notes = urgent ? [987.8, 987.8, 987.8] : [880, 1318.5];
    notes.forEach((f, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      const at = t + i * (urgent ? 0.16 : 0.09);
      o.type = urgent ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(urgent ? 0.1 : 0.07, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + (urgent ? 0.25 : 0.5));
      o.connect(g).connect(audio.destination);
      o.start(at);
      o.stop(at + 0.55);
    });
  } catch {}
}
window.addEventListener("pointerdown", () => {
  try {
    audio ??= new AudioContext();
    audio.resume();
  } catch {}
}, { once: true });

export const haptic = (pattern = 10) => {
  try {
    // Browsers only allow vibration after the person has tapped the page.
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(pattern);
  } catch {}
};

/** Counts a number up smoothly, from its previous value. */
export function countTo(el, value, format = (n) => Math.round(n).toLocaleString("en-US")) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = value;
  if (from === value || reducedMotion()) {
    el.textContent = format(value);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 1000);
    el.textContent = format(from + (value - from) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  if (from && value > from) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }
}

/** A short burst of confetti from an element (or the middle of the screen). */
export function confetti(from) {
  if (reducedMotion()) return;
  const canvas = h("canvas", { class: "confetti" });
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const r = from?.getBoundingClientRect?.();
  const x0 = r ? r.left + r.width / 2 : innerWidth / 2;
  const y0 = r ? r.top + r.height / 2 : innerHeight / 2.4;
  const colors = ["#12a150", "#3ddc84", "#ffcf4d", "#ff7a59", "#5b8cff", "#c77dff", "#ff5fa2"];
  const bits = Array.from({ length: 110 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const v = 7 + Math.random() * 10;
    return { x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.45, c: colors[(Math.random() * colors.length) | 0], round: Math.random() < 0.3 };
  });
  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.33; b.vx *= 0.985; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 1900);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.c;
      if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2, 0, 6.3); ctx.fill(); } else ctx.fillRect(-b.w / 2, -b.h / 4, b.w, b.h / 2);
      ctx.restore();
    }
    if (t < 1900) requestAnimationFrame(frame);
    else canvas.remove();
  })(start);
}

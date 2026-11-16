// Cards used everywhere: square cover cards for shelves, round people cards, and list rows.

import { h } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { tile, avatar } from "../ui/parts.js";
import { kindOf, CATEGORY_LABELS } from "../ui/kinds.js";
import { store } from "../db.js";
import { app, here, nav } from "../state.js";
import { metersBetween, distanceLabel, timeAgo, money, firstName, dateBadge, eventWhen, whereLabel } from "../util.js";
import { highlightPin } from "./map.js";

export const goingTo = (postId, type = "going") => store.reactions.filter((r) => r.post_id === postId && r.type === type);
export const isNewPost = (p) => Date.now() - new Date(p.created_at) < 3 * 3600e3;

/** The short status or price shown at the end of a row. */
function endMeta(p) {
  const done = p.status === "done";
  switch (p.kind) {
    case "lend":
      return p.status === "claimed" ? h("span", { class: "pill gray" }, "Lent out") : h("span", { class: "meta-strong" }, `Saves ${money(p.value_usd)}`);
    case "free":
      return p.status !== "open" ? h("span", { class: "pill gray" }, "Claimed") : h("span", { class: "meta-strong" }, "Free");
    case "sell":
      return done ? h("span", { class: "pill gray" }, "Sold") : h("span", { class: "meta-strong" }, money(p.price_usd));
    case "help":
      return h("span", { class: "meta-strong" }, p.price_usd ? money(p.price_usd) : "Free");
    case "event": {
      const b = dateBadge(p.starts_at);
      return h("span", { class: "date-badge" }, h("b", {}, b.day), h("span", {}, b.date));
    }
    case "alert":
      return done ? h("span", { class: "pill gray" }, "Resolved") : p.urgent ? h("span", { class: "pill red" }, h("i", { class: "live-dot" }), "Urgent") : h("span", { class: "time" }, timeAgo(p.created_at));
    case "ask":
      return done ? h("span", { class: "pill green" }, "Solved") : h("span", { class: "time" }, timeAgo(p.created_at));
  }
  return null;
}

export function subline(p) {
  const author = store.neighbors.get(p.author_id);
  if (p.kind === "event") {
    const n = goingTo(p.id).length;
    return [eventWhen(p.starts_at, p.ends_at), n ? `${n} going` : ""].filter(Boolean).join(" · ");
  }
  const who = p.author_id === app.meId ? "You" : firstName(author?.name);
  return [who, whereLabel(p, author), p.author_id === app.meId ? "" : distanceLabel(metersBetween(here(), p))].filter(Boolean).join(" · ");
}

const hover = (id) => ({ onmouseenter: () => highlightPin(id), onmouseleave: () => highlightPin(null), onfocus: () => highlightPin(id), onblur: () => highlightPin(null) });

/** A list row (tracklist style). */
export function postCard(p, { showKind = true } = {}) {
  return h(
    "button",
    { type: "button", class: `card-row${app.fresh.has(p.id) ? " fresh" : ""}${p.status === "done" ? " faded" : ""}`, "data-post": p.id, onclick: () => nav.openPost(p.id), ...hover(p.id) },
    tile(p, 52),
    h(
      "span",
      { class: "card-main" },
      h("span", { class: "card-title" }, h("span", { class: "card-title-text" }, p.title), isNewPost(p) && p.status === "open" ? h("span", { class: "new-badge" }, "New") : null),
      h("span", { class: "card-sub" }, showKind ? h("span", { class: "kind-text", style: { "--h": kindOf(p).hue } }, kindOf(p).tag) : null, h("span", { class: "card-sub-text" }, subline(p))),
    ),
    h("span", { class: "card-end" }, endMeta(p)),
  );
}

/** A square cover card for shelves. */
export function coverCard(p, { sub } = {}) {
  return h(
    "button",
    { type: "button", class: "cover-card", onclick: () => nav.openPost(p.id), ...hover(p.id) },
    h(
      "span",
      { class: "cover" },
      tile(p, 152),
      isNewPost(p) && p.status === "open" ? h("span", { class: "cover-badge new-badge" }, "New") : null,
      h("span", { class: "cover-go", "aria-hidden": "true" }, iconEl("chev", 20, 3)),
    ),
    h("b", {}, p.title),
    h("span", {}, sub ?? subline(p)),
  );
}

/** A wide card for "Happening now": the title sits on the art, like a featured playlist. */
export function featureCard(p) {
  const k = kindOf(p);
  const urgent = p.urgent && p.status !== "done";
  const label = p.kind === "alert" ? CATEGORY_LABELS[p.category] : "Event";
  return h(
    "button",
    { type: "button", class: "cover-card wide", onclick: () => nav.openPost(p.id), ...hover(p.id) },
    h(
      "span",
      { class: "cover" },
      h("span", { class: `now-art${urgent ? " urgent" : ""}`, style: { "--h": k.hue } }, iconEl(p.kind === "alert" ? p.category : k.icon, 110, 1.5), h("em", {}, urgent ? h("i", { class: "live-dot" }) : null, label), h("strong", {}, p.title)),
      h("span", { class: "cover-go", "aria-hidden": "true" }, iconEl("chev", 20, 3)),
    ),
    h("span", {}, p.kind === "event" ? eventWhen(p.starts_at, p.ends_at) : `${timeAgo(p.created_at)} · ${whereLabel(p, store.neighbors.get(p.author_id))}`),
  );
}

/** A round card for a neighbor, like an artist. */
export function personCard(n, sub) {
  return h("button", { type: "button", class: "cover-card round", onclick: () => nav.openNeighbor(n.id) }, h("span", { class: "cover" }, avatar(n, 152)), h("b", {}, n.name), h("span", {}, sub));
}

/** A horizontal shelf with Spotify-style arrow buttons, so it works with a mouse, not just a trackpad. */
export function shelfRow(items) {
  const row = h("div", { class: "scroller shelf" }, items);
  const prev = h("button", { type: "button", class: "shelf-arrow prev", "aria-label": "Scroll left", tabindex: "-1" }, iconEl("back", 20, 2.8));
  const next = h("button", { type: "button", class: "shelf-arrow next", "aria-label": "Scroll right", tabindex: "-1" }, iconEl("chev", 20, 2.8));
  const update = () => {
    const max = row.scrollWidth - row.clientWidth - 2;
    prev.hidden = row.scrollLeft <= 2;
    next.hidden = row.scrollLeft >= max;
  };
  const by = (dir) => row.scrollBy({ left: dir * Math.max(240, row.clientWidth * 0.8), behavior: "smooth" });
  prev.addEventListener("click", () => by(-1));
  next.addEventListener("click", () => by(1));
  row.addEventListener("scroll", update, { passive: true });
  requestAnimationFrame(update);
  new ResizeObserver(update).observe(row);
  return h("div", { class: "shelf-wrap" }, row, prev, next);
}

// Home: a greeting, quick-access tiles, Wrapped, and shelves of the neighborhood's best right now.
// Plus collection pages ("Borrow", "Free"...) that open from the tiles.

import { h, fill } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, empty } from "../ui/parts.js";
import { KINDS, KIND_ORDER, CATEGORY_LABELS } from "../ui/kinds.js";
import { store } from "../db.js";
import { app, here, me, nav, savePrefs } from "../state.js";
import { metersBetween, money, firstName, plural, eventWhen, distanceLabel } from "../util.js";
import { HOOD } from "../config.js";
import { postCard, coverCard, featureCard, personCard, goingTo, shelfRow } from "./cards.js";
import { itemStory } from "./stories.js";

const open = (p) => p.status !== "done";

export function greeting() {
  const h24 = new Date().getHours();
  return h24 < 5 ? "Good evening" : h24 < 12 ? "Good morning" : h24 < 17 ? "Good afternoon" : "Good evening";
}

function shelf(title, items, { sub, more } = {}) {
  if (!items.length) return null;
  return [
    h("div", { class: "shelf-head" }, h("div", {}, h("h2", {}, title), sub ? h("p", {}, sub) : null), more ? h("button", { type: "button", class: "text-btn", onclick: more }, "Show all") : null),
    shelfRow(items),
  ];
}

function byDistance(list) {
  const o = here();
  return list.sort((a, b) => metersBetween(o, a) - metersBetween(o, b));
}

function happening() {
  const now = Date.now();
  const alerts = store.posts.filter((p) => p.kind === "alert" && open(p) && (p.urgent || now - new Date(p.created_at) < 3 * 3600e3)).sort((a, b) => b.urgent - a.urgent);
  const events = store.posts.filter((p) => p.kind === "event" && new Date(p.ends_at || p.starts_at) > now && new Date(p.starts_at) - now < 7 * 86400e3).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  return [...alerts, ...events].slice(0, 8);
}

// ---------- Home ----------

export function renderHome(root) {
  if (app.collection) return renderCollection(root, app.collection);
  const you = me();
  const posts = store.posts;
  const count = (k) => posts.filter((p) => p.kind === k && open(p)).length;
  const urgentCount = posts.filter((p) => p.kind === "alert" && p.urgent && open(p)).length;

  const chips = h(
    "div",
    { class: "chips scroller", role: "group", "aria-label": "Show" },
    ["all", "lend", "free", "help", "event", "sell", "ask", "alert"].map((k) =>
      h("button", { type: "button", class: `chip${app.kind === k ? " on" : ""}`, "aria-pressed": String(app.kind === k), onclick: () => { app.kind = app.kind === k && k !== "all" ? "all" : k; nav.render(); } }, k === "all" ? "All" : KINDS[k].plural),
    ),
  );

  const top = h("div", { class: "home-top" }, chips);

  // A single kind chosen with the chips: a simple, sortable list.
  if (app.kind !== "all") {
    const list = posts.filter((p) => p.kind === app.kind);
    const o = here();
    list.sort((a, b) => (a.status === "done") - (b.status === "done") || (app.sort === "near" ? metersBetween(o, a) - metersBetween(o, b) : new Date(b.created_at) - new Date(a.created_at)));
    fill(
      root,
      h("div", { class: "home-bg", style: { "--page-h": KINDS[app.kind].hue } }),
      top,
      h(
        "div",
        { class: "shelf-head" },
        h("div", {}, h("h2", {}, KINDS[app.kind].plural), h("p", {}, `${plural(list.filter(open).length, "post")} in ${HOOD.name}`)),
        h("button", { type: "button", class: "text-btn", onclick: () => { app.sort = app.sort === "new" ? "near" : "new"; savePrefs(); nav.render(); } }, app.sort === "new" ? "Newest" : "Nearest", iconEl("chev", 13, 2.8)),
      ),
      list.length ? h("div", { class: "cards" }, list.map((p) => postCard(p, { showKind: false }))) : empty(KINDS[app.kind].icon, "Nothing here yet", "Be the first to post one.", h("button", { type: "button", class: "btn primary", onclick: () => nav.compose({ kind: app.kind }) }, "Create")),
    );
    return;
  }

  const quick = [
    ["lend", "Borrow"], ["free", "Free stuff"], ["help", "Get help"], ["event", "Events"], ["alert", "Alerts"], ["ask", "Requests"],
  ].map(([k, label]) =>
    h(
      "button",
      { type: "button", class: `quick-tile${k === "alert" && urgentCount ? " urgent" : ""}`, onclick: () => nav.openCollection(k) },
      h("span", { class: "quick-art", style: { "--h": KINDS[k].hue } }, iconEl(KINDS[k].icon, 24, 2)),
      h("span", { class: "quick-name" }, label),
      h("span", { class: "quick-count" }, k === "alert" && urgentCount ? `${urgentCount} urgent` : String(count(k))),
    ),
  );

  const s = store.stats;
  const wrapped = h(
    "button",
    { type: "button", class: "wrapped-card", onclick: () => nav.openWrapped() },
    h("span", { class: "wrapped-text" }, h("span", { class: "wrapped-kicker" }, `${HOOD.name} Wrapped`), h("b", {}, `${money(s.dollars_saved)} saved by sharing`), h("span", {}, "See your neighborhood's year in ordinary acts")),
    h("span", { class: "wrapped-play", "aria-hidden": "true" }, iconEl("chev", 26, 3)),
  );

  const lend = byDistance(posts.filter((p) => p.kind === "lend" && open(p))).slice(0, 12);
  const most = posts
    .filter((p) => p.kind === "lend")
    .map((p) => ({ p, st: itemStory(p) }))
    .filter((x) => x.st.count > 0)
    .sort((a, b) => b.st.count - a.st.count || b.st.saved - a.st.saved)
    .slice(0, 10);
  const free = byDistance(posts.filter((p) => p.kind === "free" && p.status === "open"));
  const helpers = [];
  for (const p of byDistance(posts.filter((x) => x.kind === "help" && open(x)))) {
    const n = store.neighbors.get(p.author_id);
    if (n && !helpers.some((x) => x.n.id === n.id)) helpers.push({ n, p });
  }
  const events = posts.filter((p) => p.kind === "event" && new Date(p.ends_at || p.starts_at) > Date.now()).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const sell = byDistance(posts.filter((p) => p.kind === "sell" && open(p)));
  const asks = posts.filter((p) => p.kind === "ask" && open(p)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

  fill(
    root,
    h("div", { class: "home-bg", style: { "--page-h": 141 } }),
    top,
    h("h1", { class: "greeting" }, `${greeting()}${you ? `, ${firstName(you.name)}` : ""}`),
    h("div", { class: "quick" }, quick),
    wrapped,
    shelf("Happening now", happening().map(featureCard), { sub: "Alerts and events in the neighborhood", more: () => nav.openCollection("event") }),
    shelf("Borrow near you", lend.map((p) => coverCard(p, { sub: `${firstName(store.neighbors.get(p.author_id)?.name)} · ${distanceLabel(metersBetween(here(), p))} · saves ${money(p.value_usd)}` })), { more: () => nav.openCollection("lend") }),
    shelf("Most borrowed", most.map(({ p, st }) => coverCard(p, { sub: `Borrowed ${plural(st.count, "time")} · saved ${money(st.saved)}` })), { sub: "Ordinary things that have earned their keep" }),
    shelf("Free right now", free.map((p) => coverCard(p)), { more: () => nav.openCollection("free") }),
    shelf("Neighbors who help", helpers.map(({ n, p }) => personCard(n, p.title)), { more: () => nav.openCollection("help") }),
    shelf("Coming up", events.map((p) => coverCard(p, { sub: `${eventWhen(p.starts_at, p.ends_at)} · ${goingTo(p.id).length} going` })), { more: () => nav.openCollection("event") }),
    shelf("For sale nearby", sell.map((p) => coverCard(p, { sub: `${money(p.price_usd)} · ${firstName(store.neighbors.get(p.author_id)?.name)}` })), { more: () => nav.openCollection("sell") }),
    asks.length ? [h("div", { class: "shelf-head" }, h("div", {}, h("h2", {}, "Neighbors are asking"), h("p", {}, "Can you help?")), h("button", { type: "button", class: "text-btn", onclick: () => nav.openCollection("ask") }, "Show all")), h("div", { class: "cards" }, asks.map((p) => postCard(p, { showKind: false })))] : null,
    h("p", { class: "fine" }, `${s.neighbors} neighbors on ${s.streets} streets · ${HOOD.place}`),
  );
}

// ---------- A kind's page ----------

const BLURB = {
  lend: "Tools, gear and gadgets your neighbors will lend you.",
  ask: "Things neighbors need. Maybe you have one.",
  help: "Skills and favors neighbors are offering.",
  free: "Free to a good home, food included.",
  sell: "For sale nearby. No shipping, no waste.",
  event: "Block parties, runs, yard sales and more.",
  alert: "Lost pets, outages, packages and safety notices.",
};

export function renderCollection(root, kind) {
  const k = KINDS[kind];
  const o = here();
  const list = store.posts
    .filter((p) => p.kind === kind)
    .sort((a, b) => (a.status === "done") - (b.status === "done") || (kind === "alert" ? b.urgent - a.urgent : 0) || (kind === "event" ? new Date(a.starts_at) - new Date(b.starts_at) : app.sort === "near" ? metersBetween(o, a) - metersBetween(o, b) : new Date(b.created_at) - new Date(a.created_at)));
  const active = list.filter(open).length;
  fill(
    root,
    h(
      "header",
      { class: "collection-head", style: { "--h": k.hue } },
      h("button", { type: "button", class: "back", "aria-label": "Back", onclick: () => nav.back() }, iconEl("back", 20, 2.6)),
      h("div", { class: "collection-art" }, iconEl(k.icon, 80, 1.5)),
      h("p", { class: "kicker" }, "Collection"),
      h("h1", {}, k.plural),
      h("p", {}, BLURB[kind]),
      h("p", {}, `${HOOD.name} · ${plural(active, kind === "event" ? "upcoming event" : "post")}`),
    ),
    h(
      "div",
      { class: "collection-actions" },
      h("button", { type: "button", class: "play", "aria-label": `Create a ${k.tag.toLowerCase()} post`, title: "Create", onclick: () => nav.compose({ kind }) }, iconEl("plus", 26, 3)),
      kind !== "event" ? h("button", { type: "button", class: "text-btn", onclick: () => { app.sort = app.sort === "new" ? "near" : "new"; savePrefs(); nav.render(); } }, app.sort === "new" ? "Newest first" : "Nearest first", iconEl("chev", 13, 2.8)) : null,
    ),
    list.length ? h("div", { class: "cards" }, list.map((p) => postCard(p, { showKind: false }))) : empty(k.icon, "Nothing here yet", "Be the first to post one.", h("button", { type: "button", class: "btn primary", onclick: () => nav.compose({ kind }) }, "Create")),
  );
}

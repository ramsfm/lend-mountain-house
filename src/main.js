import "leaflet/dist/leaflet.css";
import "./style.css";

import { h, fill, reducedMotion } from "./ui/dom.js";
import { icon, iconEl } from "./ui/icons.js";
import { avatar, toast, chime, haptic, confetti, closeTopSheet, anySheetOpen, openSheetsList } from "./ui/parts.js";
import { KINDS, KIND_ORDER, kindOf } from "./ui/kinds.js";
import { store, loadAll, subscribe, onChange, loadLastMessages, leaveTyping } from "./db.js";
import { app, me, rememberMe, nav } from "./state.js";
import { firstName, timeAgo, money } from "./util.js";
import { HOOD } from "./config.js";
import { initMap, updateMap, refreshSize, centerOnMe, fitHood } from "./views/map.js";
import { renderHome } from "./views/home.js";
import { renderSearch } from "./views/search.js";
import { renderLibrary } from "./views/library.js";
import { openWrapped } from "./views/wrapped.js";
import { renderInbox, renderChat, refreshThread, myThreads, needsMe } from "./views/inbox.js";
import { renderYou } from "./views/you.js";
import { openPost, openNeighbor, renderPost } from "./views/post.js";
import { openCompose } from "./views/compose.js";
import { openOnboarding } from "./views/onboard.js";

const $ = (id) => document.getElementById(id);
const view = $("view");
const mapHost = $("map-host");
const libraryEl = $("library");
const searchInput = $("top-search");
const badge = document.querySelector("#inbox-btn .badge");
const desktop = { matches: true }; // Lend is a desktop app

for (const el of document.querySelectorAll("[data-icon]")) el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 22, Number(el.dataset.stroke) || 1.9);

// ---------- The map and its controls (always in the map area; shown full-screen on phones in the Map tab) ----------

const mapEl = h("div", { id: "map", class: "map" });
const layerBar = h("div", { class: "layers scroller", role: "group", "aria-label": "Show on map" });
function drawLayers() {
  fill(
    layerBar,
    KIND_ORDER.map((k) =>
      h(
        "button",
        {
          type: "button",
          class: `layer${app.layers.has(k) ? " on" : ""}`,
          style: { "--h": KINDS[k].hue },
          "aria-pressed": String(app.layers.has(k)),
          onclick: () => {
            app.layers.has(k) ? app.layers.delete(k) : app.layers.add(k);
            if (!app.layers.size) KIND_ORDER.forEach((x) => app.layers.add(x));
            drawLayers();
            updateMap();
          },
        },
        iconEl(KINDS[k].icon, 14, 2.2),
        KINDS[k].plural,
      ),
    ),
  );
}
mapHost.append(
  mapEl,
  h("div", { class: "map-title" }, iconEl("map", 18, 2.2), "Mountain House"),
  layerBar,
  h(
    "div",
    { class: "map-tools" },
    h("button", { type: "button", class: "map-tool", "aria-label": "Show the whole neighborhood", title: "Whole neighborhood", onclick: fitHood }, iconEl("compass", 20, 2)),
    h("button", { type: "button", class: "map-tool", "aria-label": "Center on my home", title: "My home", onclick: () => centerOnMe() }, iconEl("locate", 20, 2)),
  ),
);

function placeMap() {
  refreshSize();
  setTimeout(refreshSize, 60);
}

// ---------- Navigation ----------

let lastScreen = "";
let pendingRender = false; // a live update arrived while you were typing in search
const stack = []; // where "Back" returns to: { tab, collection, postId, scroll }
const scrollY = () => (desktop.matches ? view.scrollTop : window.scrollY);
const scrollTo = (y) => (desktop.matches ? view.scrollTo({ top: y }) : window.scrollTo({ top: y }));

function go(tab) {
  if (tab === "create") return compose();
  app.tab = tab;
  app.chatId = null;
  app.postId = null;
  app.collection = null;
  if (tab !== "home") app.kind = "all";
  if (tab !== "search") {
    app.query = "";
    searchInput.value = "";
  }
  stack.length = 0;
  render();
  scrollTo(0);
}

function push() {
  stack.push({ tab: app.tab, collection: app.collection, postId: app.postId, chatId: app.chatId, scroll: scrollY() });
}

function showPost(id) {
  if (app.postId === id) return;
  push();
  app.postId = id;
  app.chatId = null;
  render();
  scrollTo(0);
}

function openCollection(kind) {
  push();
  if (app.tab !== "home" && app.tab !== "search") app.tab = "home";
  app.collection = kind;
  app.postId = null;
  render();
  scrollTo(0);
}

function back() {
  const prev = stack.pop();
  if (!prev) {
    app.postId = null;
    app.collection = null;
    render();
    return;
  }
  Object.assign(app, { tab: prev.tab, collection: prev.collection, postId: prev.postId, chatId: prev.chatId });
  render();
  requestAnimationFrame(() => scrollTo(prev.scroll || 0));
}

function openChat(id) {
  if (app.postId) push();
  app.tab = "inbox";
  app.chatId = id;
  app.postId = null;
  app.collection = null;
  render();
}

function render() {
  if (!me()) return;
  $("home-btn").classList.toggle("on", app.tab === "home" && !app.postId && !app.collection);
  document.body.dataset.tab = app.tab;
  document.body.classList.toggle("in-chat", Boolean(app.chatId));
  if (!app.chatId) leaveTyping();

  pendingRender = false;
  document.body.classList.toggle("on-page", Boolean(app.postId || app.collection));
  if (app.postId) renderPost(view, app.postId);
  else if (app.tab === "home" || app.tab === "map") renderHome(view);
  else if (app.tab === "search") app.collection ? renderHome(view) : renderSearch(view);
  else if (app.tab === "inbox") app.chatId ? renderChat(view, app.chatId) : renderInbox(view);
  else if (app.tab === "you") renderYou(view, { onMoveHome: () => openOnboarding({ mode: "move", onDone: render }), onSwitch: switchNeighbor });

  onScroll();
  const screen = `${app.tab}:${app.chatId || ""}:${app.postId || ""}:${app.collection || ""}`;
  if (screen !== lastScreen && lastScreen && !reducedMotion()) {
    if (screen.split(":").slice(0, 1)[0] !== lastScreen.split(":")[0] || app.postId || app.collection) view.scrollTop = view.scrollTop;
    // Sections rise in one after another, like a page settling into place.
    [...view.children].filter((el) => !el.classList.contains("home-bg")).slice(0, 9).forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 460, delay: i * 38, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }),
    );
  }
  // After moving to a new screen, the main view takes keyboard focus so Space / Page Down / arrows scroll it.
  if (screen !== lastScreen && !document.activeElement?.matches?.("input, textarea") && !anySheetOpen()) view.focus({ preventScroll: true });
  lastScreen = screen;

  renderLibrary(libraryEl);
  updateMap();
  drawChrome();
}

function drawChrome() {
  const you = me();
  $("me-btn").replaceChildren(you ? avatar(you, 36) : "");
  const count = new Set([...app.unread, ...myThreads().filter(needsMe).map((t) => t.id)]).size;
  badge.hidden = !count;
  badge.textContent = count > 9 ? "9+" : String(count);
  document.title = count ? `(${count}) Lend` : "Lend";
}

const compose = (opts) => openCompose(opts || {});
Object.assign(nav, { go, back, showPost, openCollection, openChat, openPost, openNeighbor, openWrapped, compose, render, placeMap });

$("me-btn").addEventListener("click", () => go("you"));
$("compose-btn").addEventListener("click", () => compose());
$("home-btn").addEventListener("click", () => go("home"));
$("inbox-btn").addEventListener("click", () => go("inbox"));

// Search lives in the top bar, like Spotify: typing shows results in the main view.
searchInput.addEventListener("focus", () => {
  if (app.tab !== "search" || app.postId || app.collection) {
    const q = searchInput.value;
    go("search");
    app.query = q;
    searchInput.value = q;
    render();
  }
});
searchInput.addEventListener("input", () => {
  app.query = searchInput.value;
  if (app.tab !== "search" || app.postId || app.collection) {
    app.postId = null;
    app.collection = null;
    app.tab = "search";
  }
  render();
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    app.query = "";
    searchInput.blur();
    render();
  }
});

function welcome() {
  render();
  confetti();
  haptic([10, 40, 10]);
}

function switchNeighbor() {
  if (!confirm("Join as a different neighbor on this device? Your current profile stays in the neighborhood.")) return;
  rememberMe(null);
  app.tab = "home";
  app.chatId = null;
  app.unread.clear();
  updateMap();
  openOnboarding({ mode: "join", onDone: welcome });
}

// ---------- Live updates and notifications ----------

function fresh(id) {
  app.fresh.add(id);
  setTimeout(() => app.fresh.delete(id), 4500);
}

onChange((c) => {
  if (!me()) return;
  const r = c.row || {};
  const who = (id) => store.neighbors.get(id);
  const name = (id) => firstName(who(id)?.name);
  const mineThread = (t) => t && (t.owner_id === app.meId || t.starter_id === app.meId);

  if (c.table === "stats") {
    if (app.tab === "home" && !app.postId && !anySheetOpen() && !document.activeElement?.matches?.("input, textarea")) render();
    return;
  }

  // New posts from others
  if (c.table === "posts" && c.isNew && r.author_id !== app.meId) {
    fresh(r.id);
    const k = kindOf(r);
    if (r.kind === "alert" && r.urgent) {
      chime(true);
      haptic([60, 40, 60, 40, 60]);
      toast(`Urgent: ${r.title}`, { tone: "urgent", avatarOf: who(r.author_id), action: "View", onAction: () => openPost(r.id) });
    } else {
      if (["alert", "event", "ask"].includes(r.kind)) chime();
      const text = r.kind === "alert" ? `Alert: ${r.title}` : `${name(r.author_id)} posted “${r.title}”`;
      toast(text, { avatarOf: who(r.author_id), action: "View", onAction: () => openPost(r.id) });
    }
    startNowbar(true);
  }

  // Conversations
  if (c.table === "threads" && mineThread(r)) {
    const k = kindOf(r);
    if (c.isNew && r.owner_id === app.meId && r.starter_id !== app.meId) {
      app.unread.add(r.id);
      chime(r.kind === "alert");
      const verb = { lend: "wants to borrow", ask: "can help with", help: "requested", free: "would like", sell: "is interested in", alert: "responded to" }[r.kind] || "replied to";
      const text = `${name(r.starter_id)} ${verb} “${r.title}”`;
      toast(text, { tone: r.kind === "alert" ? "urgent" : "", avatarOf: who(r.starter_id), action: "Open", onAction: () => openChat(r.id) });
    } else if (!c.isNew && r.starter_id === app.meId && app.chatId !== r.id && ["accepted", "declined", "done"].includes(r.status)) {
      app.unread.add(r.id);
      chime();
      const yes = { lend: `${name(r.owner_id)} said yes. You can borrow “${r.title}”.`, help: `${name(r.owner_id)} can help you.`, free: `${name(r.owner_id)} says it's yours.`, ask: `${name(r.owner_id)} accepted your help.` }[r.kind] || `${name(r.owner_id)} replied.`;
      toast(r.status === "accepted" ? yes : r.status === "done" ? `“${r.title}” is marked done.` : `${name(r.owner_id)} can't this time.`, { avatarOf: who(r.owner_id), action: "Open", onAction: () => openChat(r.id) });
      if (r.status === "accepted") confetti();
    }
    if (["accepted", "done"].includes(r.status)) startNowbar(true);
  }

  // Messages
  if (c.table === "messages" && c.isNew) {
    const t = store.threads.find((x) => x.id === r.thread_id);
    if (mineThread(t) && r.sender_id !== app.meId) {
      fresh(r.id);
      chime();
      if (app.chatId === r.thread_id && document.visibilityState === "visible") refreshThread(view, r.thread_id);
      else {
        app.unread.add(r.thread_id);
        toast(`${name(r.sender_id)}: ${r.body}`, { avatarOf: who(r.sender_id), action: "Reply", onAction: () => openChat(r.thread_id) });
      }
    } else if (app.chatId === r.thread_id) refreshThread(view, r.thread_id);
    drawChrome();
    if (app.tab === "inbox" && !app.chatId) renderInbox(view);
    return;
  }

  // Reactions on your posts
  if (c.table === "reactions" && c.isNew && r.neighbor_id !== app.meId) {
    const p = store.posts.find((x) => x.id === r.post_id);
    if (p && p.author_id === app.meId) {
      const text = { going: `${name(r.neighbor_id)} is going to ${p.title}`, seen: `${name(r.neighbor_id)} saw it: ${p.title}`, same: `${name(r.neighbor_id)} is affected too`, thanks: `${name(r.neighbor_id)} said thanks` }[r.type];
      chime(r.type === "seen");
      toast(text, { tone: r.type === "seen" ? "urgent" : "", avatarOf: who(r.neighbor_id), action: "View", onAction: () => openPost(p.id) });
    }
  }

  // Keep an open post page live (RSVP counts, status), unless someone is typing in it.
  if (app.postId && (r.post_id === app.postId || r.id === app.postId) && !document.activeElement?.matches?.("input, textarea") && !anySheetOpen()) {
    const y = scrollY();
    renderPost(view, app.postId);
    scrollTo(y);
    updateMap();
    drawChrome();
    return;
  }

  if (c.table === "messages") return;
  if (anySheetOpen() && !["threads"].includes(c.table)) {
    updateMap();
    drawChrome();
    return;
  }
  // The open conversation changed status: redraw it, keeping whatever you've typed.
  if (c.table === "threads" && app.chatId === r.id) {
    const input = view.querySelector(".chat-input");
    const draft = input?.value || "";
    const hadFocus = document.activeElement === input;
    renderChat(view, app.chatId).then(() => {
      const again = view.querySelector(".chat-input");
      if (again && draft) {
        again.value = draft;
        again.dispatchEvent(new Event("input"));
      }
      if (again && hadFocus) again.focus({ preventScroll: true });
    });
    updateMap();
    drawChrome();
    return;
  }
  if (document.activeElement?.matches?.(".chat-input, textarea, .field")) {
    pendingRender = true;
    updateMap();
    drawChrome();
    return;
  }
  render();
});

// ---------- Keyboard ----------

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (anySheetOpen()) closeTopSheet();
    else if (app.postId || app.collection) back();
    else if (app.chatId) go("inbox");
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey || !me() || anySheetOpen() || document.body.classList.contains("onboarding")) return;
  if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
  if (e.key === "/") {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  } else if (e.key === "n" || e.key === "c") {
    e.preventDefault();
    compose();
  } else if (["1", "2", "3", "4"].includes(e.key)) {
    go(["home", "search", "inbox", "you"][Number(e.key) - 1]);
    if (e.key === "2") searchInput.focus();
  }
});

view.addEventListener("focusout", () => setTimeout(() => pendingRender && !document.activeElement?.matches?.("input, textarea") && render(), 0));

// The top bar on Home fills in as you scroll, like Spotify.
const onScroll = () => document.body.classList.toggle("scrolled", scrollY() > 24);
view.addEventListener("scroll", onScroll, { passive: true });

// ---------- Live bar ("now playing" for the neighborhood) ----------

const nowbar = $("nowbar");
let nowTimer;
let nowIndex = 0;
let nowEvents = [];

function nowEventsList() {
  const name = (id) => firstName(store.neighbors.get(id)?.name);
  const ev = [];
  for (const t of store.threads) {
    if (!["accepted", "done"].includes(t.status)) continue;
    const text = { lend: `${name(t.starter_id)} borrowed ${name(t.owner_id)}'s ${t.title.toLowerCase()}`, help: `${name(t.owner_id)} helped ${name(t.starter_id)}`, free: `${name(t.starter_id)} picked up ${t.title.toLowerCase()}`, ask: `${name(t.starter_id)} helped ${name(t.owner_id)} out`, sell: `${name(t.starter_id)} bought from ${name(t.owner_id)}` }[t.kind];
    if (text) ev.push({ at: t.updated_at, who: t.starter_id, text, post: t.post_id, kind: t.kind });
  }
  for (const p of store.posts) ev.push({ at: p.created_at, who: p.author_id, text: p.kind === "alert" ? `Alert: ${p.title}` : `${name(p.author_id)} posted \u201c${p.title}\u201d`, post: p.id, kind: p.kind });
  return ev.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12);
}

function drawNow() {
  const e = nowEvents[nowIndex % nowEvents.length];
  if (!e) return;
  const n = store.neighbors.get(e.who);
  const st = store.stats;
  nowbar.style.setProperty("--h", KINDS[e.kind]?.hue ?? 141);
  nowbar.dataset.post = e.post || "";
  nowbar.replaceChildren(
    h("div", { class: "now-left" }, h("span", { class: "nowbar-cover" }, n ? avatar(n, 56) : iconEl("swap", 22, 2.4)), h("span", { class: "nowbar-text" }, h("b", {}, e.text), h("span", {}, `${timeAgo(e.at)} · ${n?.street || HOOD.name}`))),
    h(
      "div",
      { class: "now-mid" },
      h("div", { class: "now-stats" }, h("span", {}, h("b", {}, money(st.dollars_saved)), " saved"), h("span", {}, h("b", {}, String(st.shares)), " shared"), h("span", {}, h("b", {}, `${Math.round(Number(st.kg_saved))} kg`), " not bought"), h("span", {}, h("b", {}, String(st.favors)), " favors")),
      h("div", { class: "now-progress" }, h("i", { style: { "--dur": "4200ms" } })),
    ),
    h("div", { class: "now-right" }, h("span", { class: "now-hint" }, "Live in Mountain House"), h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")), h("span", { class: "nowbar-live" }, "Live")),
  );
}

function startNowbar(fromTop = false) {
  nowEvents = nowEventsList();
  if (fromTop) nowIndex = 0;
  drawNow();
  clearInterval(nowTimer);
  nowTimer = setInterval(() => {
    nowIndex++;
    drawNow();
  }, 4200);
}
nowbar.addEventListener("click", () => nowbar.dataset.post && openPost(nowbar.dataset.post));
nowbar.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && nowbar.dataset.post && openPost(nowbar.dataset.post));

// ---------- Start ----------

async function boot() {
  try {
    await loadAll();
  } catch (err) {
    fill(view, h("div", { class: "boot" }, h("p", {}, "Couldn't reach the neighborhood. Check your internet connection."), h("button", { type: "button", class: "btn primary", onclick: () => location.reload() }, "Try again")));
    return;
  }
  $("app").removeAttribute("aria-busy");
  initMap(mapEl);
  drawLayers();
  subscribe((status) => {
    const live = $("live");
    live.classList.toggle("on", status === "SUBSCRIBED");
    nowbar.classList.toggle("offline", status !== "SUBSCRIBED");
    live.title = status === "SUBSCRIBED" ? "Live: updates from neighbors appear instantly" : "Reconnecting…";
  });
  if (app.meId && !store.neighbors.has(app.meId)) rememberMe(null);
  startNowbar();
  if (me()) {
    await loadLastMessages(myThreads().map((t) => t.id)).catch(() => {});
    render();
    fitHood(false);
  } else {
    fill(view);
    openOnboarding({ mode: "join", onDone: welcome });
  }
}

boot();

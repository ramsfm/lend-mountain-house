// Search: a big search box, and a colorful "Browse all" grid when you haven't typed anything.

import { h, fill } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { empty } from "../ui/parts.js";
import { KINDS, KIND_ORDER, CATEGORY_LABELS } from "../ui/kinds.js";
import { store } from "../db.js";
import { app, nav } from "../state.js";
import { postCard, personCard, shelfRow } from "./cards.js";

const BROWSE_CATEGORIES = [
  ["tools", 28], ["kitchen", 350], ["kids", 285], ["pets", 18], ["tutoring", 230], ["food", 45],
  ["party", 320], ["garden", 110], ["outdoors", 170], ["tech", 205], ["moving", 260], ["lost_pet", 4],
];

function hit(p, q) {
  const a = store.neighbors.get(p.author_id);
  return `${p.title} ${p.body || ""} ${CATEGORY_LABELS[p.category] || ""} ${a?.name || ""} ${a?.street || ""} ${KINDS[p.kind].tag} ${KINDS[p.kind].plural}`.toLowerCase().includes(q);
}

export function renderSearch(root) {
  const q = app.query.trim().toLowerCase();
  const input = h("input", {
    type: "search", class: "search-input", value: app.query, placeholder: "What do you need?", "aria-label": "Search the neighborhood",
    oninput: (e) => {
      app.query = e.target.value;
      const pos = e.target.selectionStart;
      nav.render();
      const again = root.querySelector(".search-input");
      again?.focus();
      again?.setSelectionRange(pos, pos);
    },
  });
  const clear = app.query ? h("button", { type: "button", class: "search-clear", "aria-label": "Clear", onclick: () => { app.query = ""; nav.render(); root.querySelector(".search-input")?.focus(); } }, iconEl("x", 18, 2.6)) : null;

  let body;
  if (q) {
    const posts = store.posts.filter((p) => hit(p, q)).sort((a, b) => (a.status === "done") - (b.status === "done") || new Date(b.created_at) - new Date(a.created_at));
    const people = [...store.neighbors.values()].filter((n) => `${n.name} ${n.street} ${n.bio || ""}`.toLowerCase().includes(q)).slice(0, 10);
    body = posts.length || people.length
      ? [
          people.length ? [h("div", { class: "section-title" }, h("span", {}, "Neighbors")), shelfRow(people.map((n) => personCard(n, n.street)))] : null,
          posts.length ? [h("div", { class: "section-title" }, h("span", {}, "Posts"), h("span", { class: "muted" }, String(posts.length))), h("div", { class: "cards" }, posts.map((p) => postCard(p)))] : null,
        ]
      : empty("search", `Nothing for “${app.query.trim()}” yet`, "Ask your neighbors. Someone probably has one.", h("button", { type: "button", class: "btn primary", onclick: () => nav.compose({ kind: "ask", title: `Anyone have ${app.query.trim()}?` }) }, "Ask neighbors"));
  } else {
    body = [
      h("div", { class: "section-title" }, h("span", {}, "Browse by kind")),
      h("div", { class: "browse" }, KIND_ORDER.map((k) => h("button", { type: "button", class: "browse-tile", style: { "--h": KINDS[k].hue }, onclick: () => nav.openCollection(k) }, KINDS[k].plural, h("span", { class: "browse-art" }, iconEl(KINDS[k].icon, 34, 2))))),
      h("div", { class: "section-title" }, h("span", {}, "Browse all")),
      h("div", { class: "browse" }, BROWSE_CATEGORIES.map(([c, hue]) => h("button", { type: "button", class: "browse-tile", style: { "--h": hue }, onclick: () => { app.query = CATEGORY_LABELS[c]; const box = document.getElementById("top-search"); if (box) box.value = app.query; nav.render(); } }, CATEGORY_LABELS[c], h("span", { class: "browse-art" }, iconEl(c, 34, 2))))),
    ];
  }

  fill(root, h("h1", { class: "search-title" }, q ? `Results for \u201c${app.query.trim()}\u201d` : "Browse the neighborhood"), body);
}

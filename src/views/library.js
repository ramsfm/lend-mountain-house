// "Your Library": the left column. The neighborhood's collections, your conversations and your posts.

import { h, fill } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, tile } from "../ui/parts.js";
import { KINDS, KIND_ORDER } from "../ui/kinds.js";
import { store } from "../db.js";
import { app, nav } from "../state.js";
import { money, firstName, plural, timeAgo } from "../util.js";
import { HOOD } from "../config.js";
import { myThreads, needsMe } from "./inbox.js";

const TABS = [
  ["hood", "Browse"],
  ["chats", "Chats"],
  ["mine", "Your posts"],
];

export function renderLibrary(el) {
  app.lib ??= "hood";
  const threads = myThreads();
  const unreadCount = threads.filter((t) => app.unread.has(t.id) || needsMe(t)).length;

  const pills = h(
    "div",
    { class: "lib-pills scroller", role: "tablist" },
    TABS.map(([id, label]) =>
      h("button", { type: "button", role: "tab", "aria-selected": String(app.lib === id), class: `chip${app.lib === id ? " on" : ""}`, onclick: () => { app.lib = id; renderLibrary(el); } }, label, id === "chats" && unreadCount ? h("span", { class: "lib-dot", style: { marginLeft: "2px" } }) : null),
    ),
  );

  let items = [];
  if (app.lib === "hood") {
    const s = store.stats;
    items.push(
      h(
        "button",
        { type: "button", class: "lib-item", onclick: () => nav.openWrapped() },
        h("span", { class: "lib-art wrap-art" }, iconEl("sparkle", 22, 2)),
        h("span", { class: "lib-text" }, h("span", { class: "lib-title" }, `${HOOD.name} Wrapped`), h("span", { class: "lib-sub" }, `Story · ${money(s.dollars_saved)} saved together`)),
      ),
    );
    for (const k of KIND_ORDER) {
      const open = store.posts.filter((p) => p.kind === k && p.status !== "done");
      const urgent = k === "alert" ? open.filter((p) => p.urgent).length : 0;
      items.push(
        h(
          "button",
          { type: "button", class: `lib-item${app.collection === k && !app.postId ? " on" : ""}`, onclick: () => nav.openCollection(k) },
          h("span", { class: "lib-art", style: { "--h": KINDS[k].hue } }, iconEl(KINDS[k].icon, 22, 2)),
          h("span", { class: "lib-text" }, h("span", { class: "lib-title" }, KINDS[k].plural), h("span", { class: "lib-sub" }, `Collection · ${plural(open.length, k === "event" ? "event" : "post")}`)),
          urgent ? h("span", { class: "lib-urgent" }, `${urgent} urgent`) : null,
        ),
      );
    }
  } else if (app.lib === "chats") {
    if (!threads.length) {
      items.push(h("div", { class: "lib-empty" }, h("b", {}, "No conversations yet"), h("p", {}, "Ask to borrow something, offer help, or reply to a request."), h("button", { type: "button", class: "btn small primary", onclick: () => nav.go("home") }, "Explore")));
    }
    for (const t of threads) {
      const iOwn = t.owner_id === app.meId;
      const other = store.neighbors.get(iOwn ? t.starter_id : t.owner_id);
      const post = store.posts.find((p) => p.id === t.post_id) || { kind: t.kind, category: "other", title: t.title };
      const last = store.lastMsg.get(t.id);
      const fresh = app.unread.has(t.id) || needsMe(t);
      items.push(
        h(
          "button",
          { type: "button", class: `lib-item${app.chatId === t.id ? " on" : ""}`, onclick: () => nav.openChat(t.id) },
          h("span", { class: "lib-art" }, tile(post, 48), avatar(other, 22)),
          h("span", { class: "lib-text" }, h("span", { class: "lib-title" }, t.title), h("span", { class: "lib-sub" }, `${firstName(other?.name)} · ${last ? `${last.sender_id === app.meId ? "You: " : ""}${last.body}` : timeAgo(t.updated_at)}`)),
          fresh ? h("span", { class: "lib-dot", "aria-label": "New" }) : null,
        ),
      );
    }
  } else {
    const mine = store.posts.filter((p) => p.author_id === app.meId);
    if (!mine.length) {
      items.push(h("div", { class: "lib-empty" }, h("b", {}, "Lend your first thing"), h("p", {}, "A drill, a tent, a skill, extra lemons. It's easier than you think."), h("button", { type: "button", class: "btn small primary", onclick: () => nav.compose() }, "Create post")));
    }
    for (const p of mine) {
      items.push(
        h(
          "button",
          { type: "button", class: `lib-item${app.postId === p.id ? " on" : ""}`, onclick: () => nav.openPost(p.id) },
          h("span", { class: "lib-art" }, tile(p, 48)),
          h("span", { class: "lib-text" }, h("span", { class: "lib-title" }, p.title), h("span", { class: "lib-sub" }, `${KINDS[p.kind].tag} · ${p.status === "done" ? "Done" : timeAgo(p.created_at)}`)),
        ),
      );
    }
  }

  const list = el.querySelector(".lib-list");
  const keep = list?.scrollTop || 0;
  fill(
    el,
    h(
      "div",
      { class: "lib-head" },
      h("h2", {}, iconEl("users", 22, 2), "Your Library"),
      h("button", { type: "button", class: "icon-btn", "aria-label": "Create post", title: "Create post", onclick: () => nav.compose() }, iconEl("plus", 20, 2.6)),
    ),
    pills,
    h("div", { class: "lib-list" }, items),
  );
  el.querySelector(".lib-list").scrollTop = keep;
}

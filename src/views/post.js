// The detail sheet for any post, with the right action for its kind, plus a neighbor's profile sheet.

import { h } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, faces, tile, kindChip, sheet, sheetHead, toast, confetti, haptic, empty } from "../ui/parts.js";
import { KINDS, kindOf, CATEGORY_LABELS, ALERT_ACTIONS } from "../ui/kinds.js";
import { store, startThread, react, updatePost, deletePost } from "../db.js";
import { app, me, here, nav } from "../state.js";
import { metersBetween, distanceLabel, walkTime, money, firstName, timeAgo, eventWhen, plural, whereLabel, timeRange } from "../util.js";
import { postCard, coverCard, goingTo, shelfRow } from "./cards.js";
import { itemStory } from "./stories.js";
import { flyToPost, flyTo } from "./map.js";

const WHEN = ["Today", "Tomorrow", "This weekend", "Next week"];

/** How much a neighbor has done for others, in one line. */
export function reputation(nId) {
  const done = store.threads.filter((t) => t.owner_id === nId && ["accepted", "done"].includes(t.status));
  const lent = done.filter((t) => t.kind === "lend").length;
  // Helping = doing a favor you offered, or answering someone else's request.
  const helped = done.filter((t) => t.kind === "help").length + store.threads.filter((t) => t.starter_id === nId && t.kind === "ask" && ["accepted", "done"].includes(t.status)).length;
  const gave = done.filter((t) => t.kind === "free").length;
  return { lent, helped, gave, line: [lent && `lent ${plural(lent, "time")}`, helped && `helped ${plural(helped, "neighbor")}`, gave && `gave away ${plural(gave, "thing")}`].filter(Boolean).join(" · ") };
}

function authorRow(author) {
  const d = metersBetween(here(), author);
  const rep = reputation(author.id).line;
  return h(
    "button",
    { type: "button", class: "author", onclick: () => nav.openNeighbor(author.id) },
    avatar(author, 46),
    h(
      "span",
      { class: "author-text" },
      h("b", {}, author.name),
      h("span", {}, [author.street, author.id === app.meId ? "" : distanceLabel(d), walkTime(d)].filter(Boolean).join(" · ")),
      rep ? h("span", { class: "rep" }, iconEl("heart", 12, 2.4), rep) : null,
    ),
    iconEl("chev", 18, 2),
  );
}

function facts(p) {
  const f = [];
  if (p.kind === "lend") f.push([money(p.value_usd), "not spent"], [`${Number(p.weight_kg)} kg`, "not bought"], [p.status === "claimed" ? "Lent out" : "Available", "right now"]);
  if (p.kind === "free") f.push(["Free", "to keep"], [p.status === "open" ? "Available" : "Claimed", "right now"], [timeAgo(p.created_at), "posted"]);
  if (p.kind === "sell") f.push([money(p.price_usd), "asking"], [p.status === "done" ? "Sold" : "Available", "right now"], [timeAgo(p.created_at), "posted"]);
  if (p.kind === "help") f.push([p.price_usd ? money(p.price_usd) : "Free", p.price_usd ? "per visit" : "for neighbors"], [CATEGORY_LABELS[p.category], "skill"], [String(reputation(p.author_id).helped), reputation(p.author_id).helped === 1 ? "neighbor helped" : "neighbors helped"]);
  if (p.kind === "event") {
    const s = new Date(p.starts_at);
    f.push([s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), "date"], [timeRange(p.starts_at, p.ends_at), "time"], [String(goingTo(p.id).length), "going"]);
  }
  if (p.kind === "alert") f.push([CATEGORY_LABELS[p.category], "type"], [timeAgo(p.created_at), "posted"], [p.status === "done" ? "Resolved" : p.urgent ? "Urgent" : "Active", "status"]);
  if (p.kind === "ask") f.push([CATEGORY_LABELS[p.category], "needs"], [timeAgo(p.created_at), "asked"], [p.status === "done" ? "Solved" : "Open", "status"]);
  return f.length ? h("div", { class: "facts" }, f.map(([b, s]) => h("div", {}, h("b", {}, b), h("span", {}, s)))) : null;
}

/** The when-chips + message + send block used by lend, help, free, sell, ask and some alerts. */
function requestBlock(p, ctx, { verb, message, withWhen }) {
  let when = WHEN[0];
  const whenRow = h("div", { class: "chips wrap", role: "radiogroup", "aria-label": "When?" });
  const drawWhen = () =>
    whenRow.replaceChildren(...WHEN.map((w) => h("button", { type: "button", role: "radio", "aria-checked": String(w === when), class: `chip${w === when ? " on" : ""}`, onclick: () => { when = w; drawWhen(); } }, w)));
  drawWhen();
  const note = h("textarea", { class: "field", rows: 2, maxlength: 500, "aria-label": "Message" });
  note.value = message;
  const send = h("button", { type: "button", class: "btn primary block big" }, verb);
  send.addEventListener("click", async () => {
    send.disabled = true;
    send.textContent = "Sending…";
    try {
      const t = await startThread({ post: p, starterId: app.meId, when: withWhen ? when : null, message: note.value.trim() });
      haptic([10, 30, 10]);
      toast(`Sent to ${firstName(store.neighbors.get(p.author_id)?.name)}.`, { avatarOf: store.neighbors.get(p.author_id) });
      nav.openChat(t.id);
    } catch (err) {
      send.disabled = false;
      send.textContent = verb;
      toast(err.message);
    }
  });
  return h(
    "div",
    { class: "request" },
    withWhen ? [h("label", { class: "label" }, "When?"), whenRow] : null,
    h("label", { class: "label" }, "Message"),
    note,
    send,
  );
}

function reactButton(p, type, label, onLabel, iconName) {
  const mine = store.reactions.some((r) => r.post_id === p.id && r.neighbor_id === app.meId && r.type === type);
  return h(
    "button",
    {
      type: "button",
      class: `btn block big ${mine ? "done" : "primary"}`,
      "aria-pressed": String(mine),
      onclick: async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          await react(p.id, app.meId, type, !mine);
          if (!mine) {
            haptic([10, 30, 10]);
            if (type === "going") confetti(btn);
          }
        } catch (err) {
          toast(err.message);
        }
      },
    },
    iconEl(mine ? "check" : iconName, 18, 2.4),
    mine ? onLabel : label,
  );
}

function actions(p, ctx) {
  const k = kindOf(p);
  const author = store.neighbors.get(p.author_id);
  const mine = p.author_id === app.meId;
  const name = firstName(author?.name);

  if (mine) {
    const closeLabel = { lend: null, ask: "Mark as solved", help: null, free: "Mark as taken", sell: "Mark as sold", event: null, alert: "Mark as resolved" }[p.kind];
    return h(
      "div",
      { class: "owner-actions" },
      closeLabel && p.status !== "done"
        ? h("button", { type: "button", class: "btn primary", onclick: async () => { await updatePost(p.id, { status: "done" }); confetti(); toast("Done. Nice."); } }, iconEl("check", 18, 2.4), closeLabel)
        : null,
      h("button", {
        type: "button",
        class: "btn ghost danger",
        onclick: async () => {
          if (!confirm(`Remove "${p.title}"?`)) return;
          await deletePost(p.id);
          ctx.close();
          toast("Removed.");
        },
      }, iconEl("trash", 18, 2), "Remove"),
    );
  }

  const open = store.threads.find((t) => t.post_id === p.id && t.starter_id === app.meId && ["requested", "accepted"].includes(t.status));
  if (open) return h("button", { type: "button", class: "btn primary block big", onclick: () => nav.openChat(open.id) }, iconEl("inbox", 18, 2), "Open your conversation");

  switch (p.kind) {
    case "lend":
      return [p.status === "claimed" ? h("p", { class: "note warn" }, iconEl("clock", 15, 2.2), "It's lent out right now. Ask to be next.") : null,
        requestBlock(p, ctx, { verb: "Ask to borrow", withWhen: true, message: `Hi ${name}! Could I borrow your ${p.title.toLowerCase()}? I'll bring it right back.` })];
    case "help":
      return requestBlock(p, ctx, { verb: "Request help", withWhen: true, message: `Hi ${name}! I'd love your help with this. When works for you?` });
    case "free":
      return p.status !== "open"
        ? h("p", { class: "note" }, "Someone already claimed this one.")
        : requestBlock(p, ctx, { verb: "I'll take it", message: `Hi ${name}! I'd love this. When can I pick it up?` });
    case "sell":
      return p.status === "done" ? h("p", { class: "note" }, "This sold.") : requestBlock(p, ctx, { verb: "Message seller", message: `Hi ${name}! Is this still available?` });
    case "ask":
      return p.status === "done" ? h("p", { class: "note good" }, iconEl("check", 15, 2.4), "Solved. Thanks, neighbors.") : requestBlock(p, ctx, { verb: "I can help", message: `Hi ${name}! I can help with this. When works for you?` });
    case "event":
      return new Date(p.ends_at || p.starts_at) < Date.now() ? h("p", { class: "note" }, "This event has ended.") : reactButton(p, "going", "I'm going", "You're going", "calendar");
    case "alert": {
      if (p.status === "done") return h("p", { class: "note good" }, iconEl("check", 15, 2.4), "Resolved.");
      const a = ALERT_ACTIONS[p.category] || ALERT_ACTIONS.safety;
      if (a.chat && !a.reaction) return requestBlock(p, ctx, { verb: a.label, message: a.chat });
      if (a.chat && a.reaction) {
        // Lost pet: mark "seen" and open a chat with where you saw it.
        const msg = h("textarea", { class: "field", rows: 2, maxlength: 500, "aria-label": "Where did you see it?" });
        msg.value = `${a.chat} `;
        const send = h("button", { type: "button", class: "btn primary block big urgent" }, iconEl("eye", 18, 2.2), a.label);
        send.addEventListener("click", async () => {
          send.disabled = true;
          try {
            await react(p.id, app.meId, a.reaction, true);
            const t = await startThread({ post: p, starterId: app.meId, message: msg.value.trim() });
            haptic([10, 30, 10]);
            toast(`${name} has been told. Thank you.`, { avatarOf: author });
            nav.openChat(t.id);
          } catch (err) {
            send.disabled = false;
            toast(err.message);
          }
        });
        return h("div", { class: "request" }, h("label", { class: "label" }, "Where did you see it?"), msg, send);
      }
      return reactButton(p, a.reaction, a.label, a.reaction === "same" ? "You're affected too" : "Thanks sent", a.reaction === "same" ? "outage" : "heart");
    }
  }
  return null;
}

function reactionsLine(p) {
  const people = (type) => store.reactions.filter((r) => r.post_id === p.id && r.type === type).map((r) => store.neighbors.get(r.neighbor_id)).filter(Boolean);
  const line = (list, text) => (list.length ? h("div", { class: "reacted" }, faces(list, 6, 28), h("span", {}, text(list))) : null);
  const names = (list) => (list.length === 1 ? firstName(list[0].name) : `${firstName(list[0].name)} and ${list.length - 1} other${list.length > 2 ? "s" : ""}`);
  return [
    line(people("going"), (l) => `${names(l)} ${l.length === 1 ? "is" : "are"} going`),
    line(people("seen"), (l) => `${names(l)} saw it`),
    line(people("same"), (l) => `${names(l)} ${l.length === 1 ? "is" : "are"} affected too`),
    line(people("thanks"), (l) => `${names(l)} said thanks`),
  ];
}

/** A post as a full page: gradient header in its color, big cover, one clear action, and its story. */
export function renderPost(root, postId) {
  const p = store.posts.find((x) => x.id === postId);
  if (!p) {
    root.replaceChildren(empty("x", "This post was removed", "", h("button", { type: "button", class: "btn", onclick: () => nav.back() }, "Go back")));
    return;
  }
  const k = kindOf(p);
  const author = store.neighbors.get(p.author_id);
  const story = itemStory(p);
  const d = metersBetween(here(), p);
  const more = store.posts.filter((x) => x.author_id === p.author_id && x.id !== p.id && x.status !== "done").slice(0, 10);
  const ctx = { close: () => nav.back() };

  root.replaceChildren(
    h(
      "article",
      { class: "post-page", style: { "--h": k.hue } },
      h(
        "header",
        { class: "post-head" },
        h("button", { type: "button", class: "back", "aria-label": "Back", onclick: () => nav.back() }, iconEl("back", 20, 2.6)),
        h("div", { class: "post-cover" }, p.photo_url ? h("img", { src: p.photo_url, alt: p.title }) : tile(p, 236)),
        h(
          "div",
          { class: "post-info" },
          h("p", { class: "post-kicker" }, [k.tag, CATEGORY_LABELS[p.category]].filter(Boolean).join(" · ")),
          h("h1", { class: "post-title" }, p.title),
          author
            ? h("div", { class: "post-byline" }, h("button", { type: "button", onclick: () => nav.openNeighbor(author.id) }, avatar(author, 24), h("b", {}, author.id === app.meId ? "You" : author.name)), h("span", { class: "muted" }, [whereLabel(p, author), author.id === app.meId ? "" : distanceLabel(d)].filter(Boolean).join(" · ")))
            : null,
          h("p", { class: "post-meta" }, p.kind === "event" ? eventWhen(p.starts_at, p.ends_at) : `Posted ${timeAgo(p.created_at).toLowerCase()}`),
          p.urgent && p.status !== "done" ? h("div", { class: "post-tags" }, h("span", { class: "pill red" }, h("i", { class: "live-dot" }), "Urgent")) : null,
        ),
      ),
      h(
        "div",
        { class: "post-body-wrap" },
        h(
          "section",
          { class: "story", "aria-label": "Its story" },
          h("p", { class: "story-kicker" }, p.kind === "lend" ? "This item's story" : p.kind === "event" ? "Who's coming" : "In the neighborhood"),
          h("p", { class: "story-line" }, story.line),
          h("p", { class: "story-sub" }, story.sub),
          story.people.length ? h("div", { class: "story-people" }, faces(story.people, 5, 24), h("span", {}, `${firstName(story.people[0].name)}${story.people.length > 1 ? ` and ${plural(story.people.length - 1, "other")}` : ""} ${p.kind === "lend" ? "borrowed it" : "were helped"}`)) : null,
        ),
        h("div", { class: "post-actions" }, actions(p, ctx)),
        facts(p),
        p.body ? h("p", { class: "post-body" }, p.body) : null,
        reactionsLine(p),
        author ? authorRow(author) : null,
        more.length ? [h("div", { class: "shelf-head" }, h("div", {}, h("h2", {}, `More from ${author.id === app.meId ? "you" : firstName(author.name)}`))), shelfRow(more.map((x) => coverCard(x)))] : null,
      ),
    ),
  );
}

export function openPost(postId) {
  const p = store.posts.find((x) => x.id === postId);
  if (!p) return toast("That post isn't here anymore.");
  flyToPost(p);
  nav.showPost(postId);
}

// ---------- A neighbor's page ----------

export function openNeighbor(nId) {
  const n = store.neighbors.get(nId);
  if (!n) return;
  flyTo(n);
  sheet((api) => {
    const posts = store.posts.filter((p) => p.author_id === n.id && p.status !== "done");
    const rep = reputation(n.id);
    return h(
      "div",
      {},
      sheetHead(n.id === app.meId ? "You" : n.name, api.close, [n.street, n.id === app.meId ? "" : distanceLabel(metersBetween(here(), n))].filter(Boolean).join(" · ")),
      h("div", { class: "profile-mini" }, avatar(n, 64), h("div", {}, n.bio ? h("p", {}, n.bio) : null, rep.line ? h("p", { class: "rep" }, iconEl("heart", 13, 2.4), rep.line) : null)),
      h("div", { class: "section-title" }, h("span", {}, posts.length ? `${plural(posts.length, "post")}` : "Nothing posted right now")),
      posts.length ? h("div", { class: "cards" }, posts.map((p) => postCard(p))) : null,
    );
  }, { label: n.name });
}

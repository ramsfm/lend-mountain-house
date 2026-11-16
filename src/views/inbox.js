// Conversations: one per request, offer or reply, with the right buttons for each kind.

import { h, fill } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, tile, statusPill, empty, toast, confetti, haptic, kindChip } from "../ui/parts.js";
import { KINDS, kindOf } from "../ui/kinds.js";
import { store, loadMessages, sendMessage, setThreadStatus, updatePost, joinTyping, leaveTyping } from "../db.js";
import { app, nav } from "../state.js";
import { timeAgo, firstName, money } from "../util.js";

export const myThreads = () => store.threads.filter((t) => t.owner_id === app.meId || t.starter_id === app.meId);
/** The post's author always gives the yes. */
export const needsMe = (t) => t.status === "requested" && t.owner_id === app.meId && t.kind !== "sell" && t.kind !== "alert";

const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function lineFor(t) {
  const iOwn = t.owner_id === app.meId;
  const other = firstName(store.neighbors.get(iOwn ? t.starter_id : t.owner_id)?.name);
  if (t.status === "requested") {
    if (iOwn) return { lend: `${other} wants to borrow it`, ask: `${other} can help`, help: `${other} requested your help`, free: `${other} would like it`, sell: `${other} is interested`, alert: `${other} responded` }[t.kind] || `${other} messaged you`;
    return `Waiting for ${other}`;
  }
  if (t.status === "declined") return `With ${other}`;
  if (t.kind === "lend") return iOwn ? `Lent to ${other}` : `Borrowed from ${other}`;
  return `With ${other}`;
}

function threadRow(t) {
  const iOwn = t.owner_id === app.meId;
  const other = store.neighbors.get(iOwn ? t.starter_id : t.owner_id);
  const post = store.posts.find((p) => p.id === t.post_id) || { kind: t.kind, category: "other", title: t.title };
  const last = store.lastMsg.get(t.id);
  const when = last && new Date(last.created_at) > new Date(t.updated_at) ? last.created_at : t.updated_at;
  return h(
    "button",
    { type: "button", class: `card-row thread-row${app.unread.has(t.id) ? " unread" : ""}`, onclick: () => nav.openChat(t.id) },
    h("span", { class: "stack" }, tile(post, 52), avatar(other, 24)),
    h(
      "span",
      { class: "card-main" },
      h("span", { class: "card-title" }, h("span", { class: "card-title-text" }, t.title)),
      h("span", { class: "card-sub plain" }, h("b", {}, lineFor(t)), last ? ` · ${last.sender_id === app.meId ? "You: " : ""}${last.body}` : ""),
    ),
    h("span", { class: "card-end col" }, statusPill(t.status, t.kind), h("span", { class: "time" }, timeAgo(when))),
  );
}

export function renderInbox(root) {
  leaveTyping();
  const all = myThreads();
  const answer = all.filter(needsMe);
  const active = all.filter((t) => !needsMe(t) && ["requested", "accepted"].includes(t.status));
  const done = all.filter((t) => ["done", "declined"].includes(t.status));
  const group = (title, list, accent) =>
    list.length ? [h("div", { class: `section-title${accent ? " accent" : ""}` }, h("span", {}, accent ? h("i", { class: "live-dot" }) : null, title), h("span", { class: "muted" }, String(list.length))), h("div", { class: "cards" }, list.map(threadRow))] : null;
  fill(
    root,
    h("h1", { class: "view-title" }, "Inbox"),
    h("p", { class: "view-sub" }, "Everything you're borrowing, lending, giving and helping with."),
    all.length
      ? [group("Needs your answer", answer, true), group("In progress", active), group("Earlier", done)]
      : empty("inbox", "No conversations yet", "Borrow something, offer help, or RSVP to an event, and it shows up here.", h("button", { type: "button", class: "btn primary", onclick: () => nav.go("home") }, "Explore the neighborhood")),
  );
}

// ---------- One conversation ----------

let typingTimer;

export async function renderChat(root, threadId) {
  const t = store.threads.find((x) => x.id === threadId);
  if (!t) {
    fill(root, empty("inbox", "Conversation not found", "", h("button", { type: "button", class: "btn", onclick: () => nav.go("inbox") }, "Back to inbox")));
    return;
  }
  app.unread.delete(threadId);
  const k = kindOf(t);
  const iOwn = t.owner_id === app.meId;
  const other = store.neighbors.get(iOwn ? t.starter_id : t.owner_id);
  const post = store.posts.find((p) => p.id === t.post_id);
  const o = firstName(other?.name);

  const thread = h("div", { class: "thread", role: "log", "aria-live": "polite" });
  const typing = h("div", { class: "typing", hidden: true }, avatar(other, 26), h("span", { class: "dots", "aria-label": `${o} is typing` }, h("i"), h("i"), h("i")));
  const input = h("input", { class: "chat-input", placeholder: `Message ${o}`, maxlength: 1000, "aria-label": "Message", enterkeyhint: "send", autocomplete: "off" });
  const send = h("button", { type: "button", class: "send idle", "aria-label": "Send" }, iconEl("send", 18, 2.4));

  const announceTyping = joinTyping(threadId, app.meId, () => {
    typing.hidden = false;
    thread.scrollTop = thread.scrollHeight;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => (typing.hidden = true), 3200);
  });

  async function submit() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send.classList.add("idle");
    haptic(8);
    try {
      await sendMessage(t.id, app.meId, text);
      refreshThread(root, threadId);
    } catch (err) {
      input.value = text;
      toast(err.message);
    }
  }
  send.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });
  input.addEventListener("input", () => {
    send.classList.toggle("idle", !input.value.trim());
    if (input.value.trim()) announceTyping();
  });

  const act = (label, status, note, cls = "", after) =>
    h("button", {
      type: "button",
      class: `btn small ${cls}`,
      onclick: async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          await setThreadStatus(t, status, app.meId, note);
          await after?.();
          if (["accepted", "done"].includes(status)) {
            confetti(btn);
            haptic([10, 40, 10]);
          }
          if (status === "done" && t.value_usd && ["lend", "free"].includes(t.kind)) toast(`The neighborhood just saved ${money(t.value_usd)}.`);
        } catch (err) {
          toast(err.message);
          btn.disabled = false;
        }
      },
    }, label);

  let actions = null;
  if (t.status === "requested" && iOwn && t.kind === "sell")
    actions = act("Mark as sold", "done", "It's yours! Thanks.", "primary", () => post && updatePost(post.id, { status: "done" }));
  else if (t.status === "requested" && iOwn && t.kind === "alert")
    actions = act("Mark resolved", "done", "Resolved. Thank you so much!", "primary", () => post && updatePost(post.id, { status: "done" }));
  else if (t.status === "requested" && iOwn)
    actions = [
      act(k.decline, "declined", { lend: "Sorry, I can't lend it this time.", ask: "Thanks so much, but I've got it sorted now.", help: "Sorry, I can't make it this time.", free: "Sorry, it's already spoken for." }[t.kind], "ghost"),
      act(k.accept, "accepted", { lend: `Yes! Come by whenever works ${t.when_label ? t.when_label.toLowerCase() : "for you"}.`, ask: "Yes please, thank you! When can we meet?", help: `Happy to help ${t.when_label ? t.when_label.toLowerCase() : "soon"}!`, free: "It's yours! Come grab it anytime." }[t.kind], "primary"),
    ];
  else if (t.status === "requested") actions = h("span", { class: "muted small" }, iconEl("clock", 15, 2), `Waiting for ${o} to answer`);
  else if (t.status === "accepted" && iOwn) actions = act(k.finish || "Mark as done", "done", { lend: "Got it back. Thanks for taking care of it!", help: "All done. Thanks, neighbor!", free: "Glad it found a good home!", ask: "Thank you so much for the help!" }[t.kind], "primary");
  else if (t.status === "accepted") actions = h("span", { class: "muted small" }, iconEl("check", 15, 2.4), `${o} will mark it done`);
  else if (t.status === "done")
    actions = h("span", { class: "saved" }, iconEl("leaf", 16, 2), t.value_usd && ["lend", "free"].includes(t.kind) ? `${money(t.value_usd)} not spent${Number(t.weight_kg) ? `, ${Number(t.weight_kg)} kg not bought` : ""}` : "Shared in the neighborhood");

  fill(
    root,
    h(
      "div",
      { class: "chat" },
      h(
        "header",
        { class: "chat-head" },
        h("button", { type: "button", class: "icon-btn", "aria-label": "Back to inbox", onclick: () => nav.go("inbox") }, iconEl("back", 22, 2.2)),
        h("button", { type: "button", class: "chat-person", onclick: () => other && nav.openNeighbor(other.id) }, avatar(other, 38), h("span", { class: "chat-who" }, h("b", {}, other?.name || "Neighbor"), h("span", {}, other?.street || ""))),
      ),
      h(
        "div",
        { class: "chat-post" },
        post ? h("button", { type: "button", class: "plain", onclick: () => nav.openPost(post.id), "aria-label": `Open ${post.title}` }, tile(post, 48)) : tile({ kind: t.kind, category: "other" }, 48),
        h("span", { class: "card-main" }, h("span", { class: "card-title" }, h("span", { class: "card-title-text" }, t.title)), h("span", { class: "card-sub" }, kindChip(t.kind), t.when_label ? h("span", { class: "card-sub-text" }, t.when_label) : null)),
        statusPill(t.status, t.kind),
      ),
      actions ? h("div", { class: "chat-actions" }, actions) : null,
      h("div", { class: "thread-wrap" }, thread, typing),
      h("div", { class: "chat-compose" }, input, send),
    ),
  );

  const messages = store.messages.get(threadId) || (await loadMessages(threadId));
  if (app.chatId !== threadId) return;
  drawThread(thread, messages, other);
  if (matchMedia("(pointer: fine)").matches) input.focus({ preventScroll: true });
}

function drawThread(thread, messages, other) {
  let lastDay = "";
  const nodes = [];
  messages.forEach((m, i) => {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) {
      lastDay = day;
      nodes.push(h("div", { class: "day" }, day === new Date().toDateString() ? "Today" : new Date(m.created_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })));
    }
    const mine = m.sender_id === app.meId;
    const next = messages[i + 1];
    const tail = !next || next.sender_id !== m.sender_id || new Date(next.created_at) - new Date(m.created_at) > 300000;
    nodes.push(
      h(
        "div",
        { class: `msg${mine ? " mine" : ""}${tail ? " tail" : ""}${app.fresh.has(m.id) ? " fresh" : ""}` },
        !mine && tail ? avatar(other, 26) : h("span", { class: "spacer" }),
        h("span", { class: "bubble-col" }, h("span", { class: "bubble" }, m.body), tail ? h("span", { class: "meta" }, clock(m.created_at)) : null),
      ),
    );
  });
  if (!messages.length) nodes.push(h("p", { class: "muted small center" }, "Say hi and agree on a time."));
  thread.replaceChildren(...nodes);
  thread.scrollTop = thread.scrollHeight;
}

export function refreshThread(root, threadId) {
  const thread = root.querySelector(".thread");
  const t = store.threads.find((x) => x.id === threadId);
  if (!thread || !t) return false;
  const typing = root.querySelector(".typing");
  if (typing) typing.hidden = true;
  const other = store.neighbors.get(t.owner_id === app.meId ? t.starter_id : t.owner_id);
  drawThread(thread, store.messages.get(threadId) || [], other);
  return true;
}

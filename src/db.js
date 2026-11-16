// All data lives in Supabase. This file loads it, keeps a live copy in memory,
// and merges in changes from other neighbors the moment they happen.

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export const store = {
  neighbors: new Map(),
  posts: [],
  threads: [],
  reactions: [], // { post_id, neighbor_id, type }
  messages: new Map(), // thread id → messages, oldest first
  lastMsg: new Map(), // thread id → newest message
  stats: { shares: 0, dollars_saved: 0, kg_saved: 0, favors: 0, events: 0, neighbors: 0, posts: 0, streets: 0 },
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = (change) => listeners.forEach((fn) => fn(change));

/** Turns database errors into one plain sentence a person can act on. */
function friendly(error) {
  const msg = String(error?.message || error || "");
  if (/fetch|network|load failed|connection/i.test(msg)) return "Couldn't reach the neighborhood. Check your connection and try again.";
  if (/violates check constraint/i.test(msg)) return "Something in that is too long or not allowed. Shorten it and try again.";
  if (/row-level security|permission/i.test(msg)) return "You can't change that.";
  return "Something went wrong. Please try again.";
}

function check({ data, error }) {
  if (error) {
    console.warn("Database error:", error);
    throw new Error(friendly(error));
  }
  return data;
}

export async function loadAll() {
  const [n, p, t, r, s] = await Promise.all([
    sb.from("neighbors").select("*"),
    sb.from("posts").select("*").order("created_at", { ascending: false }),
    sb.from("threads").select("*").order("updated_at", { ascending: false }),
    sb.from("reactions").select("post_id,neighbor_id,type,created_at"),
    sb.from("street_stats").select("*").single(),
  ]);
  store.neighbors = new Map(check(n).map((x) => [x.id, x]));
  store.posts = check(p);
  store.threads = check(t);
  store.reactions = check(r);
  store.stats = check(s);
}

export async function refreshStats() {
  const { data } = await sb.from("street_stats").select("*").single();
  if (data) {
    store.stats = data;
    emit({ table: "stats" });
  }
}

export async function loadMessages(threadId) {
  const rows = check(await sb.from("messages").select("*").eq("thread_id", threadId).order("created_at"));
  store.messages.set(threadId, rows);
  return rows;
}

export async function loadLastMessages(threadIds) {
  if (!threadIds.length) return;
  const { data } = await sb.from("messages").select("*").in("thread_id", threadIds).order("created_at", { ascending: false }).limit(500);
  for (const m of data || []) if (!store.lastMsg.has(m.thread_id)) store.lastMsg.set(m.thread_id, m);
}

// ---------- Merging a change (ours or anyone else's) ----------

function upsert(list, row, sortKey) {
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = { ...list[i], ...row };
  else list.unshift(row);
  if (sortKey) list.sort((a, b) => new Date(b[sortKey]) - new Date(a[sortKey]));
  return i < 0;
}

const reactionKey = (r) => `${r.post_id}|${r.neighbor_id}|${r.type}`;
let statsTimer;

function apply(table, type, row, old) {
  let isNew = false;
  if (table === "neighbors") {
    if (type === "DELETE") store.neighbors.delete(old?.id);
    else {
      isNew = !store.neighbors.has(row.id);
      store.neighbors.set(row.id, { ...store.neighbors.get(row.id), ...row });
    }
  } else if (table === "posts") {
    if (type === "DELETE") store.posts = store.posts.filter((x) => x.id !== old?.id);
    else isNew = upsert(store.posts, row);
  } else if (table === "threads") {
    if (type === "DELETE") store.threads = store.threads.filter((x) => x.id !== old?.id);
    else isNew = upsert(store.threads, row, "updated_at");
  } else if (table === "reactions") {
    const r = row || old;
    const exists = store.reactions.some((x) => reactionKey(x) === reactionKey(r));
    if (type === "DELETE") store.reactions = store.reactions.filter((x) => reactionKey(x) !== reactionKey(r));
    else if (!exists) {
      store.reactions.push(r);
      isNew = true;
    }
  } else if (table === "messages") {
    if (type === "DELETE" || !row) {
      for (const [id, list] of store.messages) {
        const i = list.findIndex((m) => m.id === old?.id);
        if (i >= 0) list.splice(i, 1);
        if (store.lastMsg.get(id)?.id === old?.id) store.lastMsg.delete(id);
      }
    } else {
      const prev = store.lastMsg.get(row.thread_id);
      if (!prev || new Date(row.created_at) >= new Date(prev.created_at)) store.lastMsg.set(row.thread_id, row);
      const list = store.messages.get(row.thread_id);
      if (list && !list.some((m) => m.id === row.id)) {
        list.push(row);
        isNew = true;
      } else if (!list) isNew = true;
    }
  }
  if (["threads", "posts", "neighbors"].includes(table)) {
    clearTimeout(statsTimer);
    statsTimer = setTimeout(refreshStats, 250);
  }
  emit({ table, type, row: row || old || {}, isNew });
}

export function subscribe(onStatus) {
  sb.channel("hood")
    .on("postgres_changes", { event: "*", schema: "public" }, (p) =>
      apply(p.table, p.eventType, p.new && Object.keys(p.new).length ? p.new : null, p.old),
    )
    .subscribe((status) => onStatus?.(status));
}

// ---------- Writes ----------

async function insert(table, values) {
  const row = check(await sb.from(table).insert(values).select().single());
  apply(table, "INSERT", row);
  return row;
}
async function update(table, id, values) {
  const row = check(await sb.from(table).update(values).eq("id", id).select().single());
  apply(table, "UPDATE", row);
  return row;
}

export const joinHood = (v) => insert("neighbors", v);
export const updateNeighbor = (id, v) => update("neighbors", id, v);
export const createPost = (v) => insert("posts", v);
export const updatePost = (id, v) => update("posts", id, v);
export const sendMessage = (threadId, senderId, body) => insert("messages", { thread_id: threadId, sender_id: senderId, body });

export async function deletePost(id) {
  check(await sb.from("posts").delete().eq("id", id));
  apply("posts", "DELETE", null, { id });
}

export async function startThread({ post, starterId, when, message }) {
  const t = await insert("threads", {
    post_id: post.id, kind: post.kind, title: post.title, owner_id: post.author_id, starter_id: starterId,
    when_label: when || null, value_usd: post.value_usd || 0, weight_kg: post.weight_kg || 0,
  });
  store.messages.set(t.id, []);
  if (message) await sendMessage(t.id, starterId, message);
  return t;
}

export async function setThreadStatus(thread, status, byId, note) {
  const t = await update("threads", thread.id, { status });
  if (note) await sendMessage(thread.id, byId, note);
  return t;
}

export async function react(postId, neighborId, type, on) {
  const r = { post_id: postId, neighbor_id: neighborId, type };
  if (on) {
    check(await sb.from("reactions").upsert(r, { onConflict: "post_id,neighbor_id,type", ignoreDuplicates: true }));
    apply("reactions", "INSERT", { ...r, created_at: new Date().toISOString() });
  } else {
    check(await sb.from("reactions").delete().match(r));
    apply("reactions", "DELETE", null, r);
  }
}

export async function uploadPhoto(file, ownerId) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  const path = `${ownerId}/${crypto.randomUUID()}.jpg`;
  check(await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }));
  return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
}

// ---------- "Typing…" (broadcast only; nothing stored) ----------

let typingChannel = null;
export function joinTyping(threadId, meId, onTyping) {
  leaveTyping();
  typingChannel = sb.channel(`typing:${threadId}`, { config: { broadcast: { self: false } } });
  typingChannel.on("broadcast", { event: "typing" }, ({ payload }) => payload?.who !== meId && onTyping());
  typingChannel.subscribe();
  let last = 0;
  return () => {
    if (!typingChannel || Date.now() - last < 1500) return;
    last = Date.now();
    typingChannel.send({ type: "broadcast", event: "typing", payload: { who: meId } });
  };
}
export function leaveTyping() {
  if (typingChannel) sb.removeChannel(typingChannel);
  typingChannel = null;
}

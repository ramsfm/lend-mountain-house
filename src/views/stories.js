// The numbers behind "ordinary things, elevated": each item's own story, and the neighborhood's Wrapped.

import { store } from "../db.js";
import { money, firstName, plural, timeAgo } from "../util.js";

const shared = (t) => ["accepted", "done"].includes(t.status);

/** An item's life so far: how many neighbors it has served and what it has saved them. */
export function itemStory(p) {
  const threads = store.threads.filter((t) => t.post_id === p.id && shared(t));
  const people = [...new Set(threads.map((t) => t.starter_id))].map((id) => store.neighbors.get(id)).filter(Boolean);
  const saved = threads.reduce((s, t) => s + (["lend", "free"].includes(t.kind) ? t.value_usd : 0), 0);
  const going = store.reactions.filter((r) => r.post_id === p.id && r.type === "going").length;
  const kg = threads.reduce((s, t) => s + Number(t.weight_kg || 0), 0);

  let line = "";
  let sub = `Shared ${timeAgo(p.created_at).toLowerCase()}`;
  if (p.kind === "lend") {
    line = threads.length
      ? `Borrowed ${plural(threads.length, "time")}, saving neighbors ${money(saved)}.`
      : `Ready for its first borrower. Whoever's first saves ${money(p.value_usd)}.`;
    if (kg) sub = `${Math.round(kg * 10) / 10} kg of new stuff never bought · ${sub.toLowerCase()}`;
  } else if (p.kind === "help") {
    line = threads.length ? `Helped ${plural(threads.length, "neighbor")} so far.` : "Waiting to help the first neighbor.";
  } else if (p.kind === "free") {
    line = p.status === "open" ? `Free to a good home. Worth about ${money(p.value_usd)}.` : `Found a new home${people[0] ? ` with ${firstName(people[0].name)}` : ""}.`;
  } else if (p.kind === "event") {
    line = going ? `${plural(going, "neighbor")} ${going === 1 ? "is" : "are"} going.` : "Be the first to say you're going.";
  } else if (p.kind === "ask") {
    line = p.status === "done" ? "Solved by a neighbor." : "Someone nearby probably has this.";
  } else if (p.kind === "alert") {
    const responses = store.reactions.filter((r) => r.post_id === p.id && r.type !== "going").length;
    line = responses ? `${plural(responses, "neighbor")} responded.` : "Neighbors are being notified.";
  } else if (p.kind === "sell") {
    line = "Sold locally means no shipping and no waste.";
  }
  return { line, sub, people, count: threads.length, saved };
}

/** The neighborhood's year so far, for Wrapped. */
export function wrappedData() {
  const s = store.stats;
  const done = store.threads.filter(shared);

  // Most borrowed item
  const byPost = new Map();
  for (const t of done) if (t.kind === "lend" && t.post_id) byPost.set(t.post_id, (byPost.get(t.post_id) || 0) + 1);
  const topPostId = [...byPost.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPost = topPostId ? store.posts.find((p) => p.id === topPostId[0]) : null;

  // Most generous neighbors (lent, gave or helped)
  const giving = new Map();
  for (const t of done) {
    const giver = t.kind === "ask" ? t.starter_id : t.owner_id;
    if (["lend", "free", "help", "ask"].includes(t.kind)) giving.set(giver, (giving.get(giver) || 0) + 1);
  }
  const topNeighbors = [...giving.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ n: store.neighbors.get(id), count: n })).filter((x) => x.n);

  // Busiest street
  const byStreet = new Map();
  for (const t of done) {
    const st = store.neighbors.get(t.owner_id)?.street;
    if (st) byStreet.set(st, (byStreet.get(st) || 0) + 1);
  }
  const streets = [...byStreet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const going = store.reactions.filter((r) => r.type === "going").length;
  return { s, topPost, topPostCount: topPostId?.[1] || 0, topNeighbors, streets, going };
}

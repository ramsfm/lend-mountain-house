// Neighborhood Wrapped: a full-screen story of what ordinary sharing added up to.
// Tap right for next, left for back; it advances by itself; Escape closes.

import { h, reducedMotion } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, tile, toast, confetti, haptic } from "../ui/parts.js";
import { money, firstName, plural } from "../util.js";
import { HOOD } from "../config.js";
import { store } from "../db.js";
import { wrappedData } from "./stories.js";

const THEMES = [
  ["#1db954", "#b9f6ca66", "#04471d88"],
  ["#5038a0", "#ff8de466", "#1b0f4a88"],
  ["#e13300", "#ffd36b66", "#6b100088"],
  ["#0d72ea", "#84f0ff66", "#05265a88"],
  ["#af2896", "#ffb3f066", "#3d063388"],
  ["#148a08", "#d4ff6b66", "#05370088"],
  ["#e8115b", "#ffc8a066", "#5a052088"],
  ["#121212", "#1ed76055", "#5038a055"],
];

function slides() {
  const w = wrappedData();
  const s = w.s;
  const list = [];
  list.push({ kicker: `${HOOD.name} Wrapped`, title: "Your neighborhood had a year.", text: "Ordinary things, shared between neighbors. Here's what they added up to." });
  list.push({ kicker: "Together you saved", big: money(s.dollars_saved), text: "by borrowing from each other instead of buying new." });
  list.push({ kicker: "And kept", big: `${Math.round(Number(s.kg_saved))} kg`, text: "of brand-new stuff out of shopping carts, because someone nearby already had one." });
  if (w.topPost) {
    const owner = store.neighbors.get(w.topPost.author_id);
    list.push({ art: tile(w.topPost, 160), kicker: "Most borrowed", title: w.topPost.title, text: `Borrowed ${plural(w.topPostCount, "time")}. Thank you, ${firstName(owner?.name)}.` });
  }
  if (w.topNeighbors.length) {
    list.push({
      kicker: "Most generous neighbors",
      rows: w.topNeighbors.map((x, i) => h("div", { class: "wr-row", style: { animationDelay: `${0.25 + i * 0.12}s` } }, h("span", {}, String(i + 1)), avatar(x.n, 40), h("span", {}, x.n.name), h("small", {}, plural(x.count, "share")))),
    });
  }
  if (w.streets.length) {
    list.push({
      kicker: "Most generous street",
      title: w.streets[0][0],
      text: `${plural(w.streets[0][1], "thing")} shared from its homes.`,
      rows: w.streets.slice(1).map((st, i) => h("div", { class: "wr-row", style: { animationDelay: `${0.8 + i * 0.12}s` } }, h("span", {}, String(i + 2)), h("span", {}, st[0]), h("small", {}, plural(st[1], "share")))),
    });
  }
  list.push({ kicker: "Neighbors helping neighbors", big: String(s.favors), title: s.favors === 1 ? "favor done" : "favors done", text: `And ${plural(w.going, "RSVP")} to ${plural(s.events, "neighborhood event")}.` });
  list.push({ kicker: `${s.neighbors} neighbors · ${s.streets} streets`, title: "Ordinary things. Extraordinary neighbors.", text: "Lend something this week. Someone nearby needs it.", outro: true });
  return list;
}

export function openWrapped() {
  const all = slides();
  const DUR = 5200;
  let i = 0;
  let timer = null;
  const bars = h("div", { class: "wr-bars" }, all.map(() => h("i")));
  const stage = h("div", { class: "wrapped-stage" });
  const root = h("div", { class: "wrapped", role: "dialog", "aria-modal": "true", "aria-label": `${HOOD.name} Wrapped` }, stage);
  document.body.append(root);
  document.body.classList.add("locked");

  function close() {
    clearTimeout(timer);
    window.removeEventListener("keydown", onKey);
    root.classList.add("closing");
    setTimeout(() => root.remove(), 250);
    document.body.classList.remove("locked");
  }
  function go(n) {
    if (n < 0) n = 0;
    if (n >= all.length) return close();
    i = n;
    draw();
  }
  function share() {
    const s = store.stats;
    const text = `${HOOD.name} Wrapped: we saved ${money(s.dollars_saved)} and kept ${Math.round(Number(s.kg_saved))} kg of new stuff out of carts by sharing with neighbors. Ordinary things, extraordinary neighbors.`;
    if (navigator.share && matchMedia("(pointer: coarse)").matches) navigator.share({ text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => toast("Copied. Share it with your neighbors."), () => toast("Couldn't copy."));
  }
  function draw() {
    clearTimeout(timer);
    const sl = all[i];
    const [bg, b1, b2] = THEMES[i % THEMES.length];
    [...bars.children].forEach((b, n) => {
      b.className = n < i ? "done" : n === i ? "now" : "";
      b.style.setProperty("--dur", `${DUR}ms`);
    });
    stage.replaceChildren(
      h(
        "section",
        { class: "wr-slide", style: { "--bg": bg, "--blob1": b1, "--blob2": b2 } },
        sl.art ? h("div", { class: "wr-art" }, sl.art) : null,
        h("p", { class: "wr-kicker" }, sl.kicker),
        sl.big ? h("p", { class: "wr-big" }, sl.big) : null,
        sl.title ? h("h2", { class: "wr-title" }, sl.title) : null,
        sl.text ? h("p", { class: "wr-text" }, sl.text) : null,
        sl.rows ? h("div", { class: "wr-list" }, sl.rows) : null,
      ),
      bars,
      h("div", { class: "wr-top" }, h("span", { class: "wr-brand" }, h("span", { class: "brand-mark" }, iconEl("swap", 14, 2.6)), "Lend"), h("button", { type: "button", class: "wr-close", "aria-label": "Close", onclick: close }, iconEl("x", 24, 2.4))),
      h("button", { type: "button", class: "wr-tap prev", "aria-label": "Previous", onclick: () => go(i - 1) }),
      h("button", { type: "button", class: "wr-tap next", "aria-label": "Next", onclick: () => go(i + 1) }),
      sl.outro ? h("div", { class: "wr-foot" }, h("button", { type: "button", class: "btn", onclick: share }, iconEl("share", 18, 2.4), "Share"), h("button", { type: "button", class: "btn", onclick: close }, "Done")) : null,
    );
    if (sl.outro) {
      confetti();
      haptic([10, 40, 10]);
    } else if (!reducedMotion()) timer = setTimeout(() => go(i + 1), DUR);
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" || e.key === " ") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
  }
  window.addEventListener("keydown", onKey);
  draw();
}

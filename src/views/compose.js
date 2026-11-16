// One "+" for everything: pick a kind, and the form adapts to it.

import { h, fill } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { tile, sheet, sheetHead, toast, confetti, haptic } from "../ui/parts.js";
import { KINDS, KIND_ORDER, CATEGORY_LABELS, CATEGORY_KG } from "../ui/kinds.js";
import { store, createPost, uploadPhoto } from "../db.js";
import { app, me, here, nav } from "../state.js";
import { keywords, matches, metersBetween, distanceLabel, firstName } from "../util.js";

function nextSaturday4pm() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(16, 0, 0, 0);
  return d;
}
const pad = (n) => String(n).padStart(2, "0");
const dateValue = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function openCompose({ kind = null, title = "" } = {}) {
  const you = me();
  const state = { kind, title, body: "", category: null, value: "", price: "", paid: false, urgent: false, file: null, date: dateValue(nextSaturday4pm()), start: "16:00", end: "18:00" };

  sheet((s) => (state.kind ? form(s) : picker(s)), { label: "Post something", size: "tall" });

  function picker(s) {
    return h(
      "div",
      { class: "compose" },
      sheetHead("What would you like to post?", s.close, "Everyone in the neighborhood will see it."),
      h(
        "div",
        { class: "kind-grid" },
        KIND_ORDER.map((k) =>
          h(
            "button",
            {
              type: "button",
              class: "kind-tile",
              style: { "--h": KINDS[k].hue },
              onclick: () => {
                state.kind = k;
                state.category = KINDS[k].categories[0];
                state.urgent = k === "alert";
                haptic(8);
                s.rebuild();
              },
            },
            h("span", { class: "kind-icon" }, iconEl(KINDS[k].icon, 22, 2)),
            h("b", {}, KINDS[k].label),
            h("span", {}, KINDS[k].blurb),
          ),
        ),
      ),
    );
  }

  function form(s) {
    const k = KINDS[state.kind];
    state.category ??= k.categories[0];
    const err = h("p", { class: "field-error", role: "alert" });

    const title = h("input", { class: "field big", maxlength: 80, placeholder: k.placeholder, value: state.title, autofocus: true, "aria-label": "Title" });
    title.addEventListener("input", () => {
      state.title = title.value;
      err.textContent = "";
      if (state.kind === "ask") drawMatches();
    });
    const body = h("textarea", { class: "field", rows: 3, maxlength: 600, placeholder: state.kind === "alert" ? "What happened, where, and how people can help." : "Details that help neighbors.", "aria-label": "Details" });
    body.value = state.body;
    body.addEventListener("input", () => (state.body = body.value));

    const cats = h("div", { class: "chips wrap", role: "radiogroup", "aria-label": "Category" });
    const drawCats = () =>
      cats.replaceChildren(
        ...k.categories.map((c) =>
          h("button", {
            type: "button", role: "radio", "aria-checked": String(c === state.category), class: `chip${c === state.category ? " on" : ""}`,
            onclick: () => {
              state.category = c;
              if (state.kind === "alert") state.urgent = ["lost_pet", "found_pet", "safety"].includes(c);
              s.rebuild();
            },
          }, iconEl(c, 15, 2), CATEGORY_LABELS[c]),
        ),
      );
    drawCats();

    const photo = h("button", { type: "button", class: "photo-pick", "aria-label": "Add a photo" }, state.file ? h("img", { src: URL.createObjectURL(state.file), alt: "Your photo" }) : [iconEl("camera", 24, 1.8), h("span", {}, "Add a photo"), h("span", { class: "muted" }, "Optional")]);
    const picker = h("input", { type: "file", accept: "image/*", hidden: true });
    photo.addEventListener("click", () => picker.click());
    picker.addEventListener("change", () => {
      state.file = picker.files[0] || null;
      s.rebuild();
    });

    const money = (key, label, hint) => {
      const input = h("input", { class: "field", type: "number", min: 0, max: 100000, inputmode: "numeric", placeholder: hint, value: state[key], "aria-label": label });
      input.addEventListener("input", () => (state[key] = input.value));
      return [h("label", { class: "label" }, label), h("div", { class: "money-field" }, h("span", {}, "$"), input)];
    };

    const extra = [];
    if (state.kind === "lend") extra.push(money("value", "What would it cost to buy?", "120"));
    if (state.kind === "free") extra.push(money("value", "Roughly what is it worth?", "20"));
    if (state.kind === "sell") extra.push(money("price", "Price", "40"));
    if (state.kind === "help") {
      extra.push(
        h("label", { class: "label" }, "Price"),
        h("div", { class: "segmented" },
          h("button", { type: "button", class: state.paid ? "" : "on", onclick: () => { state.paid = false; s.rebuild(); } }, "Free for neighbors"),
          h("button", { type: "button", class: state.paid ? "on" : "", onclick: () => { state.paid = true; s.rebuild(); } }, "Paid"),
        ),
        state.paid ? money("price", "Price per visit", "20") : null,
      );
    }
    if (state.kind === "event") {
      const date = h("input", { class: "field", type: "date", value: state.date, "aria-label": "Date" });
      const start = h("input", { class: "field", type: "time", value: state.start, "aria-label": "Starts" });
      const end = h("input", { class: "field", type: "time", value: state.end, "aria-label": "Ends" });
      date.addEventListener("input", () => (state.date = date.value));
      start.addEventListener("input", () => (state.start = start.value));
      end.addEventListener("input", () => (state.end = end.value));
      extra.push(h("label", { class: "label" }, "When"), h("div", { class: "row3" }, date, start, end));
    }
    if (state.kind === "alert") {
      extra.push(
        h("label", { class: "toggle" },
          h("input", { type: "checkbox", checked: state.urgent, onchange: (e) => (state.urgent = e.target.checked) }),
          h("span", { class: "toggle-ui" }),
          h("span", {}, h("b", {}, "Urgent"), h("span", { class: "muted" }, "Notifies everyone nearby right away and pulses on the map.")),
        ),
      );
    }

    const matchBox = h("div", { class: "live-matches", "aria-live": "polite" });
    function drawMatches() {
      const words = keywords(state.title);
      const found = words.length ? store.posts.filter((p) => ["lend", "free", "help", "sell"].includes(p.kind) && p.status === "open" && p.author_id !== app.meId && matches(p, words)).slice(0, 4) : [];
      fill(
        matchBox,
        found.length
          ? h("div", { class: "matches" },
              h("span", { class: "matches-title" }, iconEl("sparkle", 15, 2), "Already in the neighborhood"),
              found.map((p) => {
                const a = store.neighbors.get(p.author_id);
                return h("button", { type: "button", class: "match", onclick: () => nav.openPost(p.id) }, tile(p, 36), h("span", {}, h("b", {}, p.title), h("span", {}, `${KINDS[p.kind].label} · ${firstName(a?.name)} · ${distanceLabel(metersBetween(here(), p))}`)));
              }))
          : null,
      );
    }
    if (state.kind === "ask") drawMatches();

    const post = h("button", { type: "button", class: `btn primary block big${state.kind === "alert" && state.urgent ? " urgent" : ""}` }, state.kind === "alert" ? "Post alert" : "Post");
    post.addEventListener("click", async () => {
      if (!state.title.trim()) {
        err.textContent = "Give it a short title.";
        title.focus();
        return;
      }
      if (state.kind === "sell" && !(Number(state.price) > 0)) {
        err.textContent = "Add a price.";
        return;
      }
      post.disabled = true;
      post.textContent = state.file ? "Uploading photo…" : "Posting…";
      try {
        const photo_url = state.file ? await uploadPhoto(state.file, you.id) : null;
        let starts_at = null, ends_at = null;
        if (state.kind === "event") {
          starts_at = new Date(`${state.date}T${state.start || "16:00"}`).toISOString();
          const end = new Date(`${state.date}T${state.end || "18:00"}`);
          ends_at = (end > new Date(starts_at) ? end : new Date(new Date(starts_at).getTime() + 2 * 3600e3)).toISOString();
        }
        const row = await createPost({
          author_id: you.id, kind: state.kind, category: state.category, title: state.title.trim(), body: state.body.trim() || null, photo_url,
          value_usd: Math.max(0, Math.round(Number(state.value) || 0)),
          price_usd: state.kind === "sell" || (state.kind === "help" && state.paid) ? Math.round(Number(state.price) || 0) : state.kind === "help" ? 0 : null,
          weight_kg: ["lend", "free"].includes(state.kind) ? CATEGORY_KG[state.category] || 2 : 0,
          starts_at, ends_at, urgent: state.kind === "alert" && state.urgent, lat: you.lat, lng: you.lng,
        });
        s.close();
        haptic([10, 30, 10]);
        confetti();
        toast(state.kind === "alert" && state.urgent ? "Alert sent. Neighbors are being notified." : "Posted. Your neighbors can see it now.");
        app.fresh.add(row.id);
        setTimeout(() => app.fresh.delete(row.id), 4000);
        nav.openPost(row.id);
      } catch (e) {
        post.disabled = false;
        post.textContent = "Try again";
        err.textContent = e.message;
      }
    });
    title.addEventListener("keydown", (e) => e.key === "Enter" && post.click());

    return h(
      "div",
      { class: "compose", style: { "--h": k.hue } },
      sheetHead(`New ${k.label.toLowerCase()}`, s.close, k.blurb,
        h("button", { type: "button", class: "icon-btn", "aria-label": "Choose a different kind", onclick: () => { state.kind = null; state.category = null; s.rebuild(); } }, iconEl("back", 20, 2.2))),
      h("label", { class: "label" }, state.kind === "ask" ? "What do you need?" : "Title"),
      title,
      err,
      matchBox,
      h("label", { class: "label" }, state.kind === "alert" ? "Type" : "Category"),
      cats,
      extra,
      h("label", { class: "label" }, "Details", h("span", { class: "muted" }, " Optional")),
      body,
      state.kind !== "event" ? [h("label", { class: "label" }, "Photo"), photo, picker] : null,
      post,
    );
  }
}

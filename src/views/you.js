// You: your profile, what you've done for the neighborhood, badges, your posts and settings.

import { h, fill } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, sheet, sheetHead, toast, empty } from "../ui/parts.js";
import { store, updateNeighbor } from "../db.js";
import { app, me, nav } from "../state.js";
import { money, plural } from "../util.js";
import { postCard } from "./cards.js";
import { reputation } from "./post.js";

export const HUES = [4, 24, 42, 120, 160, 195, 215, 255, 285, 325];

export function hueChooser(get, set) {
  const wrap = h("div", { class: "hues", role: "radiogroup", "aria-label": "Your color" });
  const draw = () =>
    wrap.replaceChildren(...HUES.map((hue) => h("button", { type: "button", role: "radio", "aria-checked": String(hue === get()), "aria-label": `Color ${hue}`, class: `hue${hue === get() ? " on" : ""}`, style: { "--h": hue }, onclick: () => { set(hue); draw(); } })));
  draw();
  return wrap;
}

function badges(nId) {
  const rep = reputation(nId);
  const mine = store.posts.filter((p) => p.author_id === nId);
  const going = store.reactions.filter((r) => r.neighbor_id === nId && r.type === "going").length;
  return [
    { icon: "sparkle", name: "Joined", desc: "Part of the neighborhood", got: true },
    { icon: "swap", name: "First share", desc: "Lent something once", got: rep.lent >= 1 },
    { icon: "trophy", name: "Super lender", desc: "Lent 5 times", got: rep.lent >= 5 },
    { icon: "hand", name: "Helping hand", desc: "Helped 3 neighbors", got: rep.helped >= 3 },
    { icon: "gift", name: "Giver", desc: "Gave something away", got: rep.gave >= 1 },
    { icon: "calendar", name: "Host", desc: "Hosted an event", got: mine.some((p) => p.kind === "event") },
    { icon: "users", name: "Social", desc: "Went to 3 events", got: going >= 3 },
    { icon: "bell", name: "Lookout", desc: "Posted an alert", got: mine.some((p) => p.kind === "alert") },
  ];
}

export function renderYou(root, { onMoveHome, onSwitch }) {
  const you = me();
  const rep = reputation(you.id);
  const saved = store.threads.filter((t) => t.owner_id === you.id && ["accepted", "done"].includes(t.status) && ["lend", "free"].includes(t.kind)).reduce((s, t) => s + t.value_usd, 0);
  const posts = store.posts.filter((p) => p.author_id === you.id);
  const b = badges(you.id);
  const got = b.filter((x) => x.got).length;

  fill(
    root,
    h(
      "section",
      { class: "me-card", style: { "--h": you.hue } },
      avatar(you, 128),
      h("p", { class: "me-kicker" }, "Profile"),
      h("div", { class: "me-text" }, h("h1", {}, you.name), h("p", {}, [you.street, rep.line].filter(Boolean).join(" · ")), h("p", { class: "muted" }, you.bio || "Add a line so neighbors know you.")),
      h("button", { type: "button", class: "btn small", onclick: () => editProfile() }, "Edit profile"),
    ),
    h(
      "div",
      { class: "me-stats" },
      h("div", {}, h("b", {}, String(rep.lent)), h("span", {}, rep.lent === 1 ? "time lent" : "times lent")),
      h("div", {}, h("b", {}, String(rep.helped)), h("span", {}, rep.helped === 1 ? "neighbor helped" : "neighbors helped")),
      h("div", {}, h("b", {}, money(saved)), h("span", {}, "saved others")),
    ),
    h("div", { class: "section-title" }, h("span", {}, "Badges"), h("span", { class: "muted" }, `${got} of ${b.length}`)),
    h("div", { class: "badges" }, b.map((x) => h("div", { class: `badge${x.got ? " got" : ""}`, title: x.desc }, h("span", { class: "badge-icon" }, iconEl(x.got ? x.icon : "lock", 20, 2)), h("b", {}, x.name), h("span", {}, x.desc)))),
    h("div", { class: "section-title" }, h("span", {}, "Your posts"), posts.length ? h("span", { class: "muted" }, String(posts.length)) : null),
    posts.length
      ? h("div", { class: "cards" }, posts.map((p) => postCard(p)))
      : empty("plus", "You haven't posted yet", "Lend a tool, offer a skill, give something away, or host something.", h("button", { type: "button", class: "btn primary", onclick: () => nav.compose() }, "Post something")),
    h(
      "div",
      { class: "settings" },
      h("button", { type: "button", class: "setting", onclick: onMoveHome }, iconEl("pin", 20), h("span", {}, "Move my home pin"), iconEl("chev", 18, 2)),
      h("button", { type: "button", class: "setting", onclick: onSwitch }, iconEl("refresh", 20), h("span", {}, "Join as a different neighbor"), iconEl("chev", 18, 2)),
    ),
    h("p", { class: "fine" }, "Lend is a hackathon demo. Anyone with the link can see the neighborhood. Shortcuts: / search · N new post · 1–4 tabs."),
  );
}

function editProfile() {
  const you = me();
  let hue = you.hue;
  sheet((s) => {
    const name = h("input", { class: "field", maxlength: 40, value: you.name, "aria-label": "Your name" });
    const bio = h("input", { class: "field", maxlength: 140, value: you.bio || "", placeholder: "Gardener, baker, weekend fixer…", "aria-label": "A line about you" });
    const save = h("button", {
      type: "button", class: "btn primary block big",
      onclick: async () => {
        if (!name.value.trim()) return name.focus();
        save.disabled = true;
        try {
          await updateNeighbor(you.id, { name: name.value.trim(), bio: bio.value.trim() || null, hue });
          s.close();
          toast("Profile updated.");
        } catch (e) {
          save.disabled = false;
          toast(e.message);
        }
      },
    }, "Save");
    return h("div", { class: "form" }, sheetHead("Your profile", s.close), h("label", { class: "label" }, "Name"), name, h("label", { class: "label" }, "A line about you"), bio, h("label", { class: "label" }, "Color"), hueChooser(() => hue, (v) => (hue = v)), save);
  }, { label: "Your profile" });
}

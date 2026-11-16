// Joining: your name and color, then where home is on the map (which also names your street).

import { h } from "../ui/dom.js";
import { iconEl } from "../ui/icons.js";
import { avatar, toast } from "../ui/parts.js";
import { store, joinHood, updateNeighbor } from "../db.js";
import { rememberMe, me, nav } from "../state.js";
import { money, nearestStreet } from "../util.js";
import { getMap, centerOnMe } from "./map.js";
import { hueChooser, HUES } from "./you.js";
import { HOOD } from "../config.js";

export function openOnboarding({ mode = "join", onDone }) {
  document.body.classList.add("onboarding");
  const layer = h("div", { class: "onboard", role: "dialog", "aria-modal": "true", "aria-label": mode === "join" ? "Join your neighborhood" : "Move your home pin" });
  document.body.append(layer);
  let name = "";
  let hue = HUES[Math.floor(Math.random() * HUES.length)];

  function finish() {
    document.body.classList.remove("onboarding", "placing");
    layer.classList.add("closing");
    setTimeout(() => layer.remove(), 300);
    nav.placeMap();
    centerOnMe(false);
    onDone?.();
  }

  function welcome() {
    const s = store.stats;
    const input = h("input", { class: "field big", maxlength: 40, placeholder: "Your first name", autocomplete: "given-name", "aria-label": "Your name" });
    const face = h("span", { class: "face" });
    const drawFace = () => face.replaceChildren(avatar({ name: input.value.trim() || "?", hue }, 56));
    const err = h("p", { class: "field-error", role: "alert" });
    const go = () => {
      name = input.value.trim();
      if (!name) {
        err.textContent = "What should your neighbors call you?";
        input.focus();
        return;
      }
      place();
    };
    input.addEventListener("keydown", (e) => e.key === "Enter" && go());
    input.addEventListener("input", () => {
      err.textContent = "";
      drawFace();
    });
    drawFace();
    layer.replaceChildren(
      h(
        "div",
        { class: "welcome" },
        h("span", { class: "brand" }, h("span", { class: "brand-mark" }, iconEl("swap", 20, 2.4)), "Lend"),
        h("h1", {}, "Ordinary things. Extraordinary neighbors."),
        h("p", { class: "lede" }, "The ladder in a garage, extra lemons, an hour of free time. Lend turns everyday things into a neighborhood that looks out for each other."),
        h(
          "div",
          { class: "proof" },
          h("span", {}, h("b", {}, String(s.neighbors)), " neighbors"),
          h("span", {}, h("b", {}, String(s.shares)), " things shared"),
          h("span", {}, h("b", {}, money(s.dollars_saved)), " not spent"),
        ),
        h("div", { class: "who" }, face, input),
        err,
        h("label", { class: "label" }, "Pick your color"),
        hueChooser(() => hue, (v) => { hue = v; drawFace(); }),
        h("button", { type: "button", class: "btn primary block big", onclick: go }, "Continue", iconEl("chev", 18, 2.4)),
        h("p", { class: "fine" }, `${HOOD.place} · No password, no email`),
      ),
    );
    requestAnimationFrame(() => input.focus());
  }

  function place() {
    document.body.classList.add("placing");
    nav.placeMap();
    const map = getMap();
    const you = me();
    if (you && mode === "move") map.setView([you.lat, you.lng], 18);
    else map.setView([HOOD.lat, HOOD.lng], 17);

    const streetLine = h("p", { class: "place-street" });
    const updateStreet = () => (streetLine.textContent = `On ${nearestStreet(map.getCenter())}`);
    map.on("move", updateStreet);
    updateStreet();

    const locate = h("button", { type: "button", class: "btn" }, iconEl("locate", 18, 2), "Use my location");
    locate.addEventListener("click", () => {
      if (!navigator.geolocation) return toast("Your browser can't share location. Drag the map instead.");
      locate.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (p) => { map.flyTo([p.coords.latitude, p.coords.longitude], 18, { duration: 0.8 }); locate.disabled = false; },
        () => { locate.disabled = false; toast("Couldn't get your location. Drag the map instead."); },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });

    const done = h("button", { type: "button", class: "btn primary" }, mode === "join" ? "Join the neighborhood" : "Save");
    done.addEventListener("click", async () => {
      const c = map.getCenter();
      done.disabled = true;
      done.textContent = mode === "join" ? "Joining…" : "Saving…";
      try {
        if (mode === "join") {
          const row = await joinHood({ name, hue, lat: c.lat, lng: c.lng, street: nearestStreet(c) });
          rememberMe(row.id);
          map.off("move", updateStreet);
          finish();
          toast(`Welcome to ${HOOD.name}, ${name}.`);
        } else {
          await updateNeighbor(you.id, { lat: c.lat, lng: c.lng, street: nearestStreet(c) });
          map.off("move", updateStreet);
          finish();
          toast("Home pin moved.");
        }
      } catch (err) {
        done.disabled = false;
        done.textContent = mode === "join" ? "Join the neighborhood" : "Save";
        toast(err.message);
      }
    });

    layer.replaceChildren(
      h("div", { class: "crosshair", "aria-hidden": "true" }, h("span", { class: "pin-me", style: { "--h": hue } }, h("span", {}, "You")), h("i")),
      h(
        "div",
        { class: "place" },
        mode === "join" ? h("button", { type: "button", class: "icon-btn", "aria-label": "Back", onclick: () => { document.body.classList.remove("placing"); nav.placeMap(); welcome(); } }, iconEl("back", 20, 2.2)) : null,
        h("div", { class: "place-text" }, h("h2", {}, "Where's home?"), h("p", { class: "place-sub" }, "Drag the map so the pin sits on your home."), streetLine),
        h("div", { class: "place-actions" }, locate, done),
        mode === "move" ? h("button", { type: "button", class: "btn ghost", onclick: () => { map.off("move", updateStreet); finish(); } }, "Cancel") : null,
      ),
    );
  }

  if (mode === "join") welcome();
  else place();
}

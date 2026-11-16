// Who "you" are on this device, and where you are in the app.
import { store } from "./db.js";
import { HOOD } from "./config.js";

export const app = {
  meId: null,
  tab: "home", // home | search | map | inbox | you
  postId: null, // a post page open on top of the current tab
  collection: null, // a kind's page ("Borrow", "Free"...) open from Home
  chatId: null,
  kind: "all",
  range: "all",
  sort: "new", // new | near
  query: "",
  layers: new Set(["lend", "ask", "help", "free", "sell", "event", "alert"]),
  unread: new Set(),
  fresh: new Set(),
};

try {
  app.meId = localStorage.getItem("lend.me");
  const saved = JSON.parse(localStorage.getItem("lend.prefs") || "{}");
  if (saved.range) app.range = saved.range;
  if (saved.sort) app.sort = saved.sort;
} catch {}

export function savePrefs() {
  try {
    localStorage.setItem("lend.prefs", JSON.stringify({ range: app.range, sort: app.sort }));
  } catch {}
}

export const me = () => store.neighbors.get(app.meId) || null;
export const here = () => me() || HOOD;

export function rememberMe(id) {
  app.meId = id;
  try {
    if (id) localStorage.setItem("lend.me", id);
    else localStorage.removeItem("lend.me");
  } catch {}
}

// The router lives in main.js; views reach it through here to avoid import cycles.
export const nav = { go() {}, back() {}, showPost() {}, openChat() {}, openPost() {}, openCollection() {}, openNeighbor() {}, openWrapped() {}, compose() {}, render() {}, placeMap() {} };

# Lend

**Ordinary things. Extraordinary neighbors.**

Lend is a live neighborhood app for Mountain House, California. Neighbors borrow, ask, help, give away, sell, gather and look out for each other, all on one live map.

**Try it:** https://lend-mountain-house.web.app

Built solo at BayValleyHacks 2026 for the theme *Elevate the Ordinary*.

## What it does

- **Seven kinds of posts:** Borrow, Requests, Help, Free, For sale, Events and Alerts (lost pets, outages, packages, safety).
- **Live map:** every post is a pin on a real map of Mountain House. Urgent alerts pulse red for everyone.
- **Requests and chat:** ask to borrow, offer help or claim something free, then work it out in a private chat with accept, decline and "returned" steps.
- **Real-time:** new posts, messages and status changes reach every neighbor in under a second, with no refresh.
- **Impact:** tracks dollars saved and kilograms of new stuff never bought, and gives every item its own story ("borrowed 6 times").
- **Mountain House Wrapped:** a Spotify Wrapped-style recap of the neighborhood's year.
- **Ten-second join:** first name, a color and your home on the map. No password, no email.

## How it's built

| Part | Tool |
|---|---|
| App | Vanilla JavaScript (ES modules), bundled with [Vite](https://vitejs.dev) |
| Data and live updates | [Supabase](https://supabase.com): Postgres, Realtime and Storage |
| Map | [Leaflet](https://leafletjs.com) with [OpenStreetMap](https://www.openstreetmap.org) tiles |
| Street data | 625 points on real Mountain House streets from OpenStreetMap (ODbL) |
| Hosting | Firebase Hosting |

Built with the help of an AI coding assistant (Claude Code).

### Project layout

```
index.html          App shell
src/main.js         Router, live notifications, keyboard shortcuts, bottom live bar
src/db.js           Loads data from Supabase, merges live changes, all writes
src/state.js        App state and navigation
src/config.js       Supabase settings, the neighborhood and its real places
src/streets.js      Real Mountain House street points (OpenStreetMap)
src/util.js         Distances, times, money, nearest street
src/ui/             DOM helper, icons, the seven kinds, shared pieces (toasts, sheets, confetti)
src/views/          Home, collections, search, post pages, compose, chat, profile, map, Wrapped
src/style.css       The design system (Spotify-style layout, frosted glass)
```

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5174.

## Note

This is a hackathon build. The database is open (no sign-in), so anyone with the link can post, edit or delete. Real accounts and locked-down permissions come before a real launch.

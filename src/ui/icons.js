// One icon family: 24px grid, rounded strokes.

const P = {
  // kinds
  swap: '<path d="M7 7.5h12l-3.5-3.5M17 16.5H5l3.5 3.5"/>',
  ask: '<path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.3-4A8 8 0 1 1 20 11.5z"/><path d="M10 9.3a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4M12 15h.01"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5v-6a1.5 1.5 0 0 1 3 0V11"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v6.5"/><path d="M17 12V9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-4.6-2.2L4 15.8a1.6 1.6 0 0 1 2.4-2.1L8 15"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12M12 8v12.5"/><path d="M12 8C10.5 5 7 4.5 7 6.5S10 8 12 8zM12 8c1.5-3 5-3.5 5-1.5S14 8 12 8z"/>',
  tag: '<path d="M3.5 12.2V5a1.5 1.5 0 0 1 1.5-1.5h7.2a1.5 1.5 0 0 1 1 .4l7.4 7.4a1.5 1.5 0 0 1 0 2.1l-7.2 7.2a1.5 1.5 0 0 1-2.1 0l-7.4-7.4a1.5 1.5 0 0 1-.4-1z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  // categories
  tools: '<path d="M14.7 6.3a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="m5 5 3 3M3.5 6.5l3-3 3 3-3 3z"/>',
  kitchen: '<path d="M4 11h16v1.5a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 4 12.5z"/><path d="M8 8c0-1.2 1-1.5 1-3M12 8c0-1.2 1-1.5 1-3M16 8c0-1.2 1-1.5 1-3"/>',
  garden: '<path d="M12 20v-7"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 15c0-3-2.5-5.5-7-5.5 0 3 2.5 5.5 7 5.5z"/>',
  outdoors: '<path d="M3 20 12 5l9 15z"/><path d="m12 20-3-5h6z"/>',
  kids: '<circle cx="12" cy="7.5" r="3"/><path d="M6.5 20a5.5 5.5 0 0 1 11 0"/><path d="M9.5 14.5h5"/>',
  party: '<path d="M5 20 9 8l7 7z"/><path d="M14 4v2M19 9h2M17.5 5.5l-1.5 1.5M13 9.5c1-1 2.5-1 3.5 0"/>',
  tech: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
  home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  books: '<path d="M5 4.5h5.5A1.5 1.5 0 0 1 12 6v14a1.5 1.5 0 0 0-1.5-1.5H5z"/><path d="M19 4.5h-5.5A1.5 1.5 0 0 0 12 6v14a1.5 1.5 0 0 1 1.5-1.5H19z"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.7 0-3 2.2-3 5s1.3 4 3 4v9"/>',
  clothes: '<path d="M8 3.5 4 6l1.5 4L7 9.5V20h10V9.5l1.5.5L20 6l-4-2.5a4 4 0 0 1-8 0z"/>',
  tutoring: '<path d="m3 9 9-4.5L21 9l-9 4.5z"/><path d="M7 11v4.5c1.5 1.3 3.2 2 5 2s3.5-.7 5-2V11M21 9v5"/>',
  pets: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="16" cy="7" r="1.8"/><circle cx="19" cy="11" r="1.8"/><path d="M8 17c0-3 2-5.5 4.5-5.5S17 14 17 17c0 2-1.5 3-3 2.5-1-.3-1.5-.6-2-.6s-1 .3-2 .6c-1.5.5-2-.5-2-2.5z"/>',
  yard: '<path d="M4 20h16M6 20V14M10 20v-8M14 20v-6M18 20v-9"/><path d="M6 14c0-2 1-3 3-3"/>',
  moving: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  repair: '<path d="M14.7 6.3a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/>',
  sewing: '<path d="M19 5 8.5 15.5"/><circle cx="7" cy="17" r="2"/><path d="M15 4l5 5"/>',
  childcare: '<circle cx="9" cy="6" r="2.5"/><circle cx="16.5" cy="9" r="2"/><path d="M4.5 20a4.5 4.5 0 0 1 9 0M13 20a3.5 3.5 0 0 1 7 0"/>',
  sport: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6c3 2.5 3 9.5 0 12M18 6c-3 2.5-3 9.5 0 12"/>',
  market: '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 20.5v-6h6v6"/>',
  meetup: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0"/>',
  lost_pet: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="16" cy="7" r="1.8"/><circle cx="19" cy="11" r="1.8"/><path d="M8 17c0-3 2-5.5 4.5-5.5S17 14 17 17c0 2-1.5 3-3 2.5-1-.3-1.5-.6-2-.6s-1 .3-2 .6c-1.5.5-2-.5-2-2.5z"/>',
  found_pet: '<path d="M12 20s-7-4.2-7-9.8A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7 2.8c0 5.6-7 9.8-7 9.8z"/>',
  outage: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  package: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.3l8.4 4.5"/>',
  safety: '<path d="M12 3.5 5.5 6v5.2c0 4.2 2.8 7.9 6.5 9.3 3.7-1.4 6.5-5.1 6.5-9.3V6z"/><path d="M12 8.5v4.5M12 16h.01"/>',
  roads: '<path d="M8 3 5 21M16 3l3 18M12 4v3M12 10.5v3M12 17v3"/>',
  recommendation: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  other: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M4 11h16M9 7V5h6v2"/>',
  // interface
  map: '<path d="m3 6.5 6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  inbox: '<path d="M4 13.5 6.3 6A2 2 0 0 1 8.2 4.5h7.6A2 2 0 0 1 17.7 6l2.3 7.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  send: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/>',
  leaf: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1.1 1.6 2.5 1.9 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5"/>',
  heart: '<path d="M12 19.5s-7.5-4.3-7.5-10A4.3 4.3 0 0 1 12 6.6a4.3 4.3 0 0 1 7.5 2.9c0 5.7-7.5 10-7.5 10z"/>',
  sparkle: '<path d="M12 4.5l1.6 4.3 4.4 1.7-4.4 1.7L12 16.5l-1.6-4.3L6 10.5l4.4-1.7z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5V9H15"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M15.5 4.8a3.2 3.2 0 0 1 0 6.4M17.5 13.6a6 6 0 0 1 3.5 5.9"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3.5M8.5 20h7M9.5 20l.5-3.5h4l.5 3.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  share: '<path d="M12 14V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
};

export function icon(name, size = 20, stroke = 1.8) {
  return `<svg class="i" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.other}</svg>`;
}

export function iconEl(name, size, stroke) {
  const t = document.createElement("template");
  t.innerHTML = icon(name, size, stroke);
  return t.content.firstChild;
}

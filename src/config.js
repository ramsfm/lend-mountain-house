// Public settings. The publishable key is meant to ship in browser code;
// what it can do is limited by the database's row-level security rules.
export const SUPABASE_URL = "https://ukbniglbkyhywzompvkh.supabase.co";
export const SUPABASE_KEY = "sb_publishable_oFQRy6KpNscGGi7TVgj4bA_zseSIKpv";

// The neighborhood: Mountain House, California (San Joaquin County).
// Neighbors live in every village, so the map opens on the whole community.
export const HOOD = { name: "Mountain House", place: "Mountain House, CA", lat: 37.7737, lng: -121.5452, zoom: 14 };
// The community's edges (with a little room), used to keep the map from wandering off.
export const HOOD_BOUNDS = [[37.738, -121.572], [37.812, -121.52]];

// Real community places (OpenStreetMap), used for events and alerts.
export const PLACES = [
  { name: "Bethany Park", lat: 37.77423, lng: -121.54917 },
  { name: "Altamont Park", lat: 37.7823, lng: -121.54835 },
  { name: "Mountain House Creek Recreation Area", lat: 37.77717, lng: -121.54862 },
  { name: "Central Park", lat: 37.78071, lng: -121.54096 },
  { name: "Mountain House Library", lat: 37.77925, lng: -121.53986 },
  { name: "Wicklund Park", lat: 37.77187, lng: -121.53798 },
  { name: "Questa Park", lat: 37.79027, lng: -121.5507 },
];

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, push, set, onValue, get, child } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "foodprebook-a25d8.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://foodprebook-a25d8-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "foodprebook-a25d8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "foodprebook-a25d8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "800850531009",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:800850531009:web:67b97f503e09a99f16fa40",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Y4MS8FGJJG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // analytics may not be available in some environments (SSR/test)
  // swallow errors silently
  // console.warn('Firebase analytics not available', e);
}

const db = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export the database instance
export { db };

export async function addRestaurant(restaurant: { name: string; region?: string }) {
  const restaurantsRef = ref(db, "restaurants");
  const newRef = push(restaurantsRef);
  await set(newRef, restaurant);
  return newRef.key;
}

export function subscribeRestaurants(callback: (data: any[]) => void) {
  const restaurantsRef = ref(db, "restaurants");
  onValue(restaurantsRef, (snapshot: any) => {
    const val = snapshot.val();
    if (!val) return callback([]);
    const list = Object.entries(val).map(([key, value]) => ({ id: key, ...(value as any) }));
    callback(list);
  });
}

export async function fetchRestaurants() {
  const restaurantsRef = ref(db, "restaurants");
  const snap = await get(restaurantsRef);
  const val = snap.val();
  if (!val) return [];
  return Object.entries(val).map(([key, value]) => ({ id: key, ...(value as any) }));
}

// Authentication helpers
export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGooglePopup() {
  return signInWithPopup(auth, googleProvider);
}

// Create new auth user (email/password)
export async function signUp(email: string, password: string) {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  return res;
}

export async function updateUserDisplayName(name: string) {
  if (!auth) return;
  const user = auth.currentUser as any;
  if (!user) return;
  try {
    await updateProfile(user, { displayName: name });
  } catch (e) {
    // ignore profile update errors
    console.warn('updateUserDisplayName failed', e);
  }
}

// Return current user's ID token (used for calling protected server endpoints)
export async function getIdToken(): Promise<string | null> {
  try {
    const user = auth.currentUser as any;
    if (!user) return null;
    return await user.getIdToken();
  } catch (e) {
    return null;
  }
}

// Helper to POST JSON to server endpoints with Bearer token if available
export async function apiPostWithToken(path: string, body: any) {
  const token = await getIdToken();
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  const txt = await res.text();
  let json: any = null;
  try { json = JSON.parse(txt); } catch (e) { json = txt; }
  if (!res.ok) throw new Error((json && json.message) ? json.message : `Request failed: ${res.status}`);
  return json;
}

// Map firebase auth error codes to friendly messages
export function translateAuthError(err: any) {
  if (!err) return 'Authentication failed.';
  const code = err.code || '';
  switch (code) {
    case 'auth/wrong-password':
      return 'Invalid username or password.';
    case 'auth/user-not-found':
      return 'Account does not exist. Please sign up first.';
    case 'auth/email-already-in-use':
      return 'Account already exists for this email.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    default:
      return err.message || 'Authentication failed.';
  }
}

// Orders and messaging helpers
export function subscribeOrders(callback: (orders: any[]) => void) {
  const ordersRef = ref(db, 'orders');
  return onValue(ordersRef, (snap: any) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([key, v]) => ({ id: key, ...(v as any) }));
    callback(list);
  });
}

export function subscribeOrdersForRestaurants(restaurantIds: string[], callback: (orders: any[]) => void) {
  const ordersRef = ref(db, 'orders');
  return onValue(ordersRef, (snap: any) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([key, v]) => ({ id: key, ...(v as any) }))
      .filter((o) => restaurantIds.includes(o.restaurantId));
    callback(list);
  });
}

export async function sendMessageToOrder(orderId: string, message: string, from: string) {
  const mRef = ref(db, `messages/${orderId}`);
  const newRef = push(mRef);
  await set(newRef, { text: message, from, ts: Date.now() });
  return newRef.key;
}

export function subscribeMessages(orderId: string, callback: (msgs: any[]) => void) {
  const mRef = ref(db, `messages/${orderId}`);
  return onValue(mRef, (snap: any) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([key, v]) => ({ id: key, ...(v as any) }));
    callback(list);
  });
}

// Persist a basic profile for the authenticated user in Realtime DB under /users/{uid}
export async function createUserProfile(
  user: any,
  role: 'customer' | 'business' = 'customer',
  additionalDetails?: { firstName?: string; lastName?: string; email?: string },
  displayName?: string
) {
  if (!user) return;
  const uid = user.uid;
  if (!uid) return;
  const profileRef = ref(db, `users/${uid}`);
  const profile: any = {
    uid,
    email: additionalDetails?.email || user.email || null,
    displayName: displayName || user.displayName || null,
    photoURL: user.photoURL || null,
    role: role || 'customer',
    createdAt: Date.now(),
    firstName: additionalDetails?.firstName || null,
    lastName: additionalDetails?.lastName || null,
  };
  // write the profile (overwrite/ensure latest)
  await set(profileRef, profile);
  return profile;
}

// Add a function to save user profile details to the database
export async function saveUserProfile(uid: string, profile: { firstName: string; lastName: string; email: string }) {
  const userRef = ref(db, `users/${uid}`);
  await set(userRef, profile);
}

// Check whether a user profile exists in /users for the given email (case-insensitive)
export async function userExists(email?: string) {
  if (!email) return false;
  const e = email.toLowerCase();
  const usersRef = ref(db, 'users');
  const snap = await get(usersRef);
  const val = snap.val() || {};
  let found = false;
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.email && typeof node.email === 'string' && node.email.toLowerCase() === e) found = true;
    for (const k of Object.keys(node)) {
      if (found) break;
      walk(node[k]);
    }
  }
  walk(val);
  return found;
}

export function onAuthChanged(callback: (user: any) => void) {
  return onAuthStateChanged(auth, (user) => callback(user));
}

export function signOutUser() {
  return signOut(auth);
}

// Location helpers
export function writeLocation(userId: string, lat: number, lng: number) {
  const locRef = ref(db, `locations/${userId}`);
  return set(locRef, { lat, lng, ts: Date.now() });
}

export function subscribeLocations(callback: (data: Record<string, any>) => void) {
  const locRef = ref(db, "locations");
  return onValue(locRef, (snap: any) => {
    const val = snap.val() || {};
    callback(val);
  });
}

// business users helpers (stored in Realtime Database under /businessUsers)
export async function addBusinessUser(email: string) {
  const buRef = ref(db, `businessUsers`);
  const newRef = push(buRef);
  await set(newRef, { email });
  return newRef.key;
}

export async function fetchBusinessUsers(): Promise<string[]> {
  const buRef = ref(db, `businessUsers`);
  const snap = await get(buRef);
  const val = snap.val();
  if (!val) return [];
  // The DB may store business users nested under categories (e.g. businessUsers/restaurantOwners/{id: { email }})
  // Walk the value recursively and collect any `email` fields we find.
  const emails = new Set<string>();
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if ('email' in node && typeof node.email === 'string') emails.add(node.email.toLowerCase());
    for (const k of Object.keys(node)) {
      walk(node[k]);
    }
  }
  walk(val);
  return Array.from(emails);
}

export function subscribeBusinessUsers(callback: (emails: string[]) => void) {
  const buRef = ref(db, `businessUsers`);
  return onValue(buRef, (snap: any) => {
    const val = snap.val() || {};
    const emails = new Set<string>();
    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      if ('email' in node && typeof node.email === 'string') emails.add(node.email.toLowerCase());
      for (const k of Object.keys(node)) {
        walk(node[k]);
      }
    }
    walk(val);
    callback(Array.from(emails));
  });
}

// Restaurant owners mapping helpers
export async function setRestaurantOwner(restaurantId: string, email: string) {
  const rRef = ref(db, `restaurantOwners/${restaurantId}`);
  return set(rRef, { email });
}

export async function fetchRestaurantOwners(): Promise<Record<string, string>> {
  // Try root-level `restaurantOwners` first, then fallback/merge with `businessUsers/restaurantOwners`.
  const out: Record<string, string> = {};
  try {
    const rRef = ref(db, `restaurantOwners`);
    const snap = await get(rRef);
    const val = snap.val() || {};
    Object.entries(val).forEach(([key, v]) => {
      const em = (v as any)?.email;
      if (em) out[key] = em;
    });
  } catch (e) {
    // ignore
  }
  try {
    const nestedRef = ref(db, `businessUsers/restaurantOwners`);
    const snap2 = await get(nestedRef);
    const val2 = snap2.val() || {};
    Object.entries(val2).forEach(([key, v]) => {
      const em = (v as any)?.email;
      if (em) out[key] = em;
    });
  } catch (e) {
    // ignore
  }
  return out;
}

export function subscribeRestaurantOwners(callback: (map: Record<string, string>) => void) {
  const out: Record<string, string> = {};
  const rRef = ref(db, `restaurantOwners`);
  const nestedRef = ref(db, `businessUsers/restaurantOwners`);

  // helper to merge a snapshot value into out and call callback
  function mergeAndEmit(val: any) {
    if (!val || typeof val !== 'object') return;
    Object.entries(val).forEach(([key, v]) => {
      const em = (v as any)?.email;
      if (em) out[key] = em;
    });
    callback({ ...out });
  }

  const unsub1 = onValue(rRef, (snap: any) => {
    const val = snap.val() || {};
    // reset and merge both sources on any update
    Object.keys(out).forEach((k) => delete out[k]);
    mergeAndEmit(val);
  });

  const unsub2 = onValue(nestedRef, (snap: any) => {
    const val = snap.val() || {};
    // reset and merge both sources on any update
    Object.keys(out).forEach((k) => delete out[k]);
    mergeAndEmit(val);
  });

  // return combined unsubscribe
  return () => {
    try { unsub1 && (unsub1 as any)(); } catch (e) {}
    try { unsub2 && (unsub2 as any)(); } catch (e) {}
  };
}

// Fetch a user's profile object stored under /users/{uid}
export async function fetchUserProfile(uid: string) {
  if (!uid) return null;
  const pRef = ref(db, `users/${uid}`);
  const snap = await get(pRef);
  const val = snap.val();
  if (!val) return null;
  return val;
}

export default { app, db };

// Helper: map restaurant id to a friendly name using the local attached_assets list as fallback
import localRestaurantsData from '../../../attached_assets/restaurants-list.json';

export async function getLocalRestaurantName(id: string) {
  if (!id) return id;
  try {
    const list = localRestaurantsData as any;
    const items: any[] = (list && (list.default && list.default.restaurants)) || (list && list.restaurants) || [];
    const lower = id.toLowerCase();
    for (const it of items) {
      const nm = (it.name || '').toLowerCase();
      if (nm === lower || nm.replace(/\s+/g, '-') === lower || nm.replace(/\s+/g, '') === lower) return it.name;
    }
    return id;
  } catch (e) {
    return id;
  }
}

// Generate a canonical restaurant id (slug) from a human-friendly name or id
export function canonicalRestaurantId(input: string): string {
  if (!input) return 'default';
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\((.*?)\)/g, '') // remove parenthetical qualifiers like (Near Mysore)
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics to hyphen
    .replace(/^-+|-+$/g, ''); // trim hyphens
}

// Import restaurant list for email validation helper
import restaurantsList from '../../../attached_assets/restaurants-list.json';

// Add a function to validate if the email is associated with a restaurant
export function isEmailAssociatedWithRestaurant(email: string): boolean {
  return restaurantsList.restaurants.some(
    (restaurant) => restaurant.email && restaurant.email.toLowerCase() === email.toLowerCase()
  );
}

// Try to require firebase-admin dynamically. If it's not installed or configured,
// export stub functions so the server can still compile and run in development.
import fs from 'fs';

let admin: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  admin = require('firebase-admin');
} catch (e) {
  console.warn('firebase-admin not available; backend firebase operations will be disabled.');
}

function initAdmin() {
  if (!admin) return null;
  if (admin.apps && admin.apps.length) return admin.app();

  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (svcJson) {
    try {
      const cred = JSON.parse(svcJson);
      return admin.initializeApp({ credential: admin.credential.cert(cred), databaseURL: process.env.FIREBASE_DATABASE_URL });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', e);
    }
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    return admin.initializeApp({ credential: admin.credential.cert(keyPath), databaseURL: process.env.FIREBASE_DATABASE_URL });
  }

  try {
    return admin.initializeApp({ credential: admin.credential.applicationDefault(), databaseURL: process.env.FIREBASE_DATABASE_URL });
  } catch (e) {
    console.error('Failed to initialize firebase-admin', e);
    return null;
  }
}

const app = initAdmin();
const db = app ? admin.database() : null;

export async function ensureBusinessUser(email: string) {
  if (!db) throw new Error('firebase-admin not initialized');
  if (!email) return;
  const ref = db.ref('businessUsers');
  const snap = await ref.once('value');
  const val = snap.val() || {};
  const exists = Object.values(val).some((v: any) => v.email === email);
  if (exists) return true;
  const newRef = ref.push();
  await newRef.set({ email });
  return true;
}

// Verify an ID token (returns decoded token) using firebase-admin
export async function verifyIdToken(idToken: string) {
  if (!admin) throw new Error('firebase-admin not available');
  if (!admin.auth) throw new Error('firebase-admin auth not available');
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    throw err;
  }
}

// Check whether a business email exists anywhere under /businessUsers (recursive, case-insensitive)
export async function businessEmailExists(email: string) {
  if (!db) throw new Error('firebase-admin not initialized');
  if (!email) return false;
  const buRef = db.ref('businessUsers');
  const snap = await buRef.once('value');
  const val = snap.val() || {};
  const target = email.toLowerCase();
  let found = false;
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if ('email' in node && typeof node.email === 'string' && node.email.toLowerCase() === target) {
      found = true;
      return;
    }
    for (const k of Object.keys(node)) {
      if (found) break;
      walk(node[k]);
    }
  }
  walk(val);
  return found;
}

export async function setRestaurantOwnerBackend(restaurantId: string, email: string) {
  if (!db) throw new Error('firebase-admin not initialized');
  if (!restaurantId) throw new Error('restaurantId required');
  if (!email) throw new Error('email required');

  try {
    // check existence in /businessUsers (case-insensitive, recursive)
    const exists = await businessEmailExists(email);
    if (!exists) {
      const err: any = new Error('Business user does not exist.');
      err.code = 'BUSINESS_USER_MISSING';
      throw err;
    }

    const rRef = db.ref(`restaurantOwners/${restaurantId}`);
    await rRef.set({ email });
    return true;
  } catch (err) {
    // rethrow to let caller handle
    throw err;
  }
}

export default app;

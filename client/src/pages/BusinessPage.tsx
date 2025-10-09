import React, { useEffect, useState } from 'react';
import { signInWithGooglePopup, signIn, onAuthChanged, subscribeLocations, signOutUser, fetchBusinessUsers, addBusinessUser, subscribeBusinessUsers, createUserProfile, userExists, isEmailAssociatedWithRestaurant } from '@/lib/firebase';
import { Header } from '@/components/Header';

// allowed business emails (hardcoded). You can move this to Firestore if desired.
const allowedBusinessEmails = [
  'owner@example.com',
  'manager@example.com'
];

export default function BusinessPage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Record<string, any>>({});
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      (async () => {
        if (!u) {
          setUser(null);
          return;
        }
        try {
          const { fetchUserProfile } = await import('@/lib/firebase');
          const profile = await fetchUserProfile(u.uid);
          if (profile) {
            const merged = { ...u, displayName: profile.displayName || u.displayName, role: profile.role || 'customer', email: profile.email || u.email, photoURL: profile.photoURL || u.photoURL, uid: u.uid } as any;
            // enforce business role for this page
            if (merged.role !== 'business') {
              try { await signOutUser(); } catch (e) {}
              setUser(null);
              setError('You are not authorized to access the business dashboard.');
              return;
            }
            setUser(merged);
            try { (window as any).__CURRENT_USER__ = merged; } catch (e) {}
          } else {
            // no profile — sign out and request signup
            try { await signOutUser(); } catch (e) {}
            setUser(null);
            setError('Account does not exist. Please sign up first.');
          }
        } catch (e) {
          console.warn('fetchUserProfile failed', e);
          // fallback to auth user but still require business role if present in token (best-effort)
          setUser(u);
        }
      })();
    });
    return () => unsub && (unsub as any)();
  }, []);

  useEffect(() => {
    const unsub = subscribeLocations((data) => setLocations(data));
    return () => unsub && (unsub as any)();
  }, []);

  useEffect(() => {
    // subscribe to businessUsers list
    const unsub = subscribeBusinessUsers((emails) => setAllowedEmails(emails));
    // also initial fetch
    fetchBusinessUsers().then((list) => setAllowedEmails(list)).catch(console.error);
    return () => unsub && (unsub as any)();
  }, []);

  // initialize Mapbox and render customer markers live — subscribe to DB directly
  useEffect(() => {
    const token = (window as any).MAPBOX_TOKEN;
    if (!token) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: 'business-map', style: 'mapbox://styles/mapbox/streets-v11', center: [77.0527803, 12.6065], zoom: 10 });
    const dest = new mapboxgl.Marker({ color: 'red' }).setLngLat([77.0527803, 12.6065]).addTo(map);

    const markers: Record<string, any> = {};

    // listen to realtime DB directly via subscribeLocations helper
    const unsub = subscribeLocations((data) => {
      Object.entries(data || {}).forEach(([uid, v]) => {
        const lat = v?.lat;
        const lng = v?.lng;
        if (lat == null || lng == null) return;
        if (markers[uid]) {
          markers[uid].setLngLat([lng, lat]);
        } else {
          markers[uid] = new mapboxgl.Marker({ color: 'blue' }).setLngLat([lng, lat]).addTo(map);
        }
      });
    });

    return () => {
      if (unsub && typeof unsub === 'function') unsub();
      try { map.remove(); } catch (e) {}
    };
  }, []);

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (err) {
      console.error(err);
    }
    try {
      setUser(null);
    } catch (e) {}
    try {
      // clear global if used by other pages
      (window as any).__CURRENT_USER__ = null;
    } catch (e) {}
    // redirect to homepage
    try {
      window.location.href = '/';
    } catch (e) {}
  }

  async function handleGoogle() {
    try {
      const res = await signInWithGooglePopup();
      const email = (res.user?.email || '').toLowerCase();
      const allowed = !!email && (allowedEmails.map((e) => e.toLowerCase()).includes(email) || isEmailAssociatedWithRestaurant(email));
      if (!allowed) {
        setError('You don\'t have access');
        try { await signOutUser(); } catch (e) { console.error(e); }
        return;
      }
      // ensure profile exists (auto-create if missing) and set role to business
      try { await createUserProfile(res.user, 'business'); } catch (e) { console.error(e); }
    } catch (err: any) {
      try {
        const { translateAuthError } = await import('@/lib/firebase');
        setError(translateAuthError(err));
      } catch (e) {
        setError(err.message || String(err));
      }
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const pass = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      const res = await signIn(email, pass);
      const em = (res.user?.email || '').toLowerCase();
      const allowed = !!em && (allowedEmails.map((e) => e.toLowerCase()).includes(em) || isEmailAssociatedWithRestaurant(em));
      if (!allowed) {
        setError('You don\'t have access');
        try { await signOutUser(); } catch (err) {}
        return;
      }
      try { await createUserProfile(res.user, 'business'); } catch (e) { console.error(e); }
    } catch (err: any) {
      try {
        const { translateAuthError } = await import('@/lib/firebase');
        setError(translateAuthError(err));
      } catch (e) {
        setError(err.message || String(err));
      }
    }
  }

  async function seedAllowed() {
    // dev helper: add two allowed business emails
    try {
      await addBusinessUser('owner@example.com');
      await addBusinessUser('manager@example.com');
      const list = await fetchBusinessUsers();
      setAllowedEmails(list);
    } catch (err) {
      console.error(err);
    }
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Business Login</h1>
        {error && <div className="text-red-500">{error}</div>}
        <button onClick={handleGoogle} className="btn mb-4">Sign in with Google</button>
        <form onSubmit={handleEmail} className="space-y-2">
          <input name="email" placeholder="email" className="input" />
          <input name="password" type="password" placeholder="password" className="input" />
          <button className="btn" type="submit">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header moved to app root */}

      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Business dashboard</h1>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p>Signed in as {user.displayName || user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <button className="btn btn-sm" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
        <div id="business-map" style={{ height: 600 }} />
      </main>
    </div>
  );
}

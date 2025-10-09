import React, { useEffect, useState } from 'react';
import { signInWithGooglePopup, signIn, writeLocation, onAuthChanged, signOutUser, subscribeLocations, createUserProfile, userExists, subscribeOrders, subscribeMessages } from '@/lib/firebase';
import { Header } from '@/components/Header';

export default function CustomerPage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthChanged((u) => setUser(u));
    return () => unsub && (unsub as any)();
  }, []);

  useEffect(() => {
    let watchId: number | null = null;
    if (user) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          writeLocation(user.uid, lat, lng).catch(console.error);
        }, (err) => {
          setError(err.message);
        }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }) as unknown as number;
      }
    }
    return () => {
      if (watchId !== null && navigator.geolocation && typeof navigator.geolocation.clearWatch === 'function') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeOrders((list) => {
      const mine = list.filter((o) => o.customerUid === user.uid || o.customerEmail === user.email);
      setMyOrders(mine);
      // subscribe to messages for first order
      if (mine[0]) {
        const unsubMsgs = subscribeMessages(mine[0].id, (msgs) => setMessages(msgs));
        (window as any).__UNSUB_MSGS__ = unsubMsgs;
      }
    });
    return () => { if (unsub && typeof unsub === 'function') unsub(); const u = (window as any).__UNSUB_MSGS__; if (u) u(); };
  }, [user]);

  // Mapbox: show destination marker and update user's marker locally
  useEffect(() => {
    if (!user) return;
    const token = (window as any).MAPBOX_TOKEN;
    if (!token) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: 'customer-map', style: 'mapbox://styles/mapbox/streets-v11', center: [77.0527803, 12.6065], zoom: 12 });
    const dest = new mapboxgl.Marker({ color: 'red' }).setLngLat([77.0527803, 12.6065]).addTo(map);

    let userMarker: any = null;
    // subscribe to locations and update user's own marker when their DB entry changes
    const unsub = subscribeLocations((data) => {
      const me = data?.[user.uid];
      if (!me) return;
      const lat = me.lat;
      const lng = me.lng;
      if (userMarker) {
        userMarker.setLngLat([lng, lat]);
      } else {
        userMarker = new mapboxgl.Marker({ color: 'blue' }).setLngLat([lng, lat]).addTo(map);
      }
      map.setCenter([lng, lat]);
    });

    return () => {
      try { map.remove(); } catch (e) {}
      if (unsub && typeof unsub === 'function') unsub();
    };
  }, [user]);

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGoogle() {
    try {
      const res = await signInWithGooglePopup();
      const em = res.user?.email || '';
      const exists = await userExists(em);
      if (!exists) {
        // profile must exist before allowing login
        try { await signOutUser(); } catch (e) {}
        setError('Account does not exist. Please sign up first.');
        return;
      }
      try { await createUserProfile(res.user, 'customer'); } catch (e) { console.error(e); }
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
      const exists = await userExists(email);
      if (!exists) {
        setError('Account does not exist. Please sign up first.');
        return;
      }
      const res = await signIn(email, pass);
      try { await createUserProfile(res.user, 'customer'); } catch (e) { console.error(e); }
    } catch (err: any) {
      try {
        const { translateAuthError } = await import('@/lib/firebase');
        setError(translateAuthError(err));
      } catch (e) {
        setError(err.message || String(err));
      }
    }
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Customer Login</h1>
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
      <Header
        currentUser={user}
        onSignOut={handleSignOut} // Ensures logout functionality
      />

      <main className="p-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Customer dashboard</h1>
          <div>
            <button className="btn btn-ghost" onClick={async () => { try { await signOutUser(); setUser(null); } catch (e) { console.error(e); } }}>Sign out</button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Customer dashboard</h1>
        </div>
      <p className="mb-2">Your live location is being sent to the server.</p>
      <section className="mb-4">
        <h2 className="text-lg font-semibold">My Orders</h2>
        {myOrders.length ? (
          <ul className="mt-2 space-y-2">
            {myOrders.map((o) => (
              <li key={o.id} className="p-2 border rounded">
                <div>Order {o.id} — Restaurant: {o.restaurantId}</div>
                <div>Paid: {o.amountPaid || o.amount}</div>
                <div className="text-xs text-muted-foreground">ETA: {o.eta ? new Date(o.eta).toLocaleTimeString() : '—'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">No active orders</div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Messages</h2>
        {messages.length ? (
          <div className="space-y-2 mt-2">
            {messages.map((m) => (
              <div key={m.id} className="p-2 border rounded">
                <div className="text-sm font-medium">{m.from}</div>
                <div className="text-sm">{m.text}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.ts || 0).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-2">No messages</div>
        )}
      </section>
      <div id="customer-map" style={{ height: 400 }} />
      </main>
    </div>
  );
}

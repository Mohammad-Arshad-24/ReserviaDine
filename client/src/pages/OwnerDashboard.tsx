import React, { useEffect, useMemo, useState } from 'react';
import { subscribeLocations, fetchRestaurantOwners, subscribeRestaurantOwners, sendMessageToOrder, subscribeMessages, signOutUser, getLocalRestaurantName, onAuthChanged, fetchUserProfile, canonicalRestaurantId } from '@/lib/firebase';
import { subscribeOrdersForRestaurant, updateOrderStatus, type Order, deleteOrder } from '@/lib/orders';
import { Header } from '@/components/Header';
// static import of local restaurant list for reliable bundling
import localRestaurantsData from '../../../attached_assets/restaurants-list.json';

interface OwnerDashboardProps {
  currentUser?: any;
}
export default function OwnerDashboard({ currentUser }: OwnerDashboardProps) {
  const [user, setUser] = useState<any>(currentUser || null);
  const [accessChecking, setAccessChecking] = useState<boolean>(true);
  const [accessGranted, setAccessGranted] = useState<boolean>(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [ownersMap, setOwnersMap] = useState<Record<string, string>>({});
  const [myRestaurants, setMyRestaurants] = useState<{ id: string; name: string }[]>([]);
    const [localRestaurants, setLocalRestaurants] = useState<Array<{ name: string; email?: string }>>([]);
  const [locations, setLocations] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});
  const [selectedOrderMessages, setSelectedOrderMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [lastMessageSent, setLastMessageSent] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // simple client-side user detection (Auth handled globally in App)
  useEffect(() => {
    // read current user from window (App keeps currentUser in global state and passes via window for pages)
    try {
      // @ts-ignore
      setUser((window as any).__CURRENT_USER__ || null);
    } catch (e) { }
  }, []);

  // Access gate using statically imported restaurant list (wait for user before deciding)
  useEffect(() => {
    setAccessChecking(true);
    setAccessError(null);
    setAccessGranted(false);
    try {
      const mod = localRestaurantsData as any;
      const data: any = (mod && mod.default) ? mod.default : mod;
      const restaurants: any[] = (data && Array.isArray(data.restaurants)) ? data.restaurants : [];
      if (!restaurants.length) {
        throw new Error('Invalid restaurant-list.json');
      }
      // if auth not loaded yet, keep waiting
      const email = (user?.email || '').toLowerCase();
      if (!email) {
        setAccessChecking(true);
        return;
      }
      const allowed = restaurants.some((r: any) => (r?.email || '').toLowerCase() === email);
      setAccessGranted(allowed);
      setAccessChecking(false);
      if (!allowed) {
        setAccessError('Access Denied. Redirecting…');
        setTimeout(() => { try { window.location.href = '/#/business-login'; } catch (e) {} }, 2000);
      }
    } catch (err: any) {
      setAccessChecking(false);
      setAccessError(err?.message || 'Failed to verify access');
    }
  }, [user]);

  // ensure OwnerDashboard picks up auth state if page loaded standalone
  useEffect(() => {
    let unsub: any = null;
    try {
      unsub = onAuthChanged((u) => {
        (async () => {
          if (!u) {
            setUser(null);
            return;
          }
          try {
            const profile = await fetchUserProfile(u.uid);
            if (profile) {
              const merged = { ...u, displayName: profile.displayName || u.displayName, role: profile.role || 'customer', email: profile.email || u.email, photoURL: profile.photoURL || u.photoURL, uid: u.uid };
              setUser(merged as any);
            } else {
              setUser(u);
            }
          } catch (e) {
            setUser(u);
          }
        })();
      });
    } catch (e) {}
    return () => { try { unsub && unsub(); } catch (e) {} };
  }, []);

  // Note: Avoid returning early before all hooks are declared to keep hook order stable.

  useEffect(() => {
    const unsub = subscribeRestaurantOwners((map) => setOwnersMap(map));
    fetchRestaurantOwners().then((m) => setOwnersMap(m)).catch(() => {});
    return () => { if (unsub && typeof unsub === 'function') unsub(); };
  }, []);

  useEffect(() => {
    // compute my restaurants from ownersMap and window user
    if (!user) return;
      (async () => {
        const ownedSet: Record<string, { id: string; name: string }> = {};

        // owners from DB mapping (accept both plain email and { email }) and normalize id to canonical name
        Object.entries(ownersMap).forEach(([id, email]) => {
          try {
            const em = (typeof email === 'string' ? email : (email as any)?.email || '').toLowerCase();
            if (em && em === (user.email || '').toLowerCase()) {
              let friendly = id;
              try {
                const mod = localRestaurantsData as any;
                const items: any[] = (mod && (mod.default && mod.default.restaurants)) || (mod && mod.restaurants) || [];
                const match = items.find((it) => (it.email || '').toLowerCase() === em);
                if (match?.name) friendly = match.name;
              } catch (e) {}
              const canonical = canonicalRestaurantId(friendly);
              ownedSet[canonical] = { id: canonical, name: friendly };
            }
          } catch (e) {}
        });

        // owners from local attached_assets/restaurants-list.json (static import)
        try {
          const mod = localRestaurantsData as any;
          const items: any[] = (mod && (mod.default && mod.default.restaurants)) || (mod && mod.restaurants) || [];
          items.forEach((it) => {
            const em = (it.email || '').toLowerCase();
            if (em && em === (user.email || '').toLowerCase()) {
              const friendly = (it.name || it.id || '').toString();
              const canonical = canonicalRestaurantId(friendly);
              if (friendly) ownedSet[canonical] = { id: canonical, name: friendly };
            }
          });
          // also store local restaurants for display
          setLocalRestaurants(items.map((i) => ({ name: i.name, email: i.email })));
        } catch (e) {
          // fallback to previously read localRestaurants state
        }

        setMyRestaurants(Object.values(ownedSet));
      })();
  }, [ownersMap, user]);

  // resolve friendly names for any restaurant ids we know about
  useEffect(() => {
    (async () => {
      const ids = new Set<string>();
      myRestaurants.forEach((r) => ids.add(r.id));
      orders.forEach((o) => ids.add(o.restaurantId));
      const toResolve = Array.from(ids).filter((id) => !nameCache[id]);
      if (!toResolve.length) return;
      const newCache = { ...nameCache };
      await Promise.all(toResolve.map(async (id) => {
        try {
          const nm = await getLocalRestaurantName(id);
          newCache[id] = nm || id;
        } catch (e) {
          newCache[id] = id;
        }
      }));
      setNameCache(newCache);
    })();
  }, [myRestaurants, orders]);

  useEffect(() => {
    if (!myRestaurants || !myRestaurants.length) {
      setOrders([]);
      return;
    }

    const unsubscribers = myRestaurants.map(restaurant => {
      return subscribeOrdersForRestaurant(restaurant.id, (restaurantOrders: Order[]) => {
        setOrders(prev => {
          const others = prev.filter(o => o.restaurantId !== restaurant.id);
          return [...others, ...restaurantOrders];
        });
      });
    });

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') try { unsub(); } catch (e) {}
      });
    };
  }, [myRestaurants.map(r => r.id).join('|')]);

  useEffect(() => {
    const unsub = subscribeLocations((data) => setLocations(data));
    return () => { if (unsub && typeof unsub === 'function') unsub(); };
  }, []);

  // Debug: surface orders raw for verification (hidden in UI, console only)
  useEffect(() => {
    try { console.log('[OwnerDashboard] myRestaurants', myRestaurants, 'orders', orders); } catch (e) {}
  }, [myRestaurants, orders]);

  // Added the `handleSignOut` function and passed it to the Header component.
  async function handleSignOut() {
    try {
      await signOutUser();
      try { window.location.href = '/'; } catch (e) {}
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header moved to app root to avoid duplicates */}
      <Header
        currentUser={user}
        onSignOut={handleSignOut} // Ensures logout functionality
        hideTrackOrders={true} // Hide Track orders button in owner dashboard
      />

      {/* decorative background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-gradient-to-bl from-secondary/10 to-transparent rounded-full blur-3xl opacity-60"></div>
      </div>

      <section className="p-8">
        {/* Access gate UI layered within the main render to preserve hook order */}
        {accessChecking ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Verifying access…</div>
          </div>
        ) : !accessGranted ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 font-semibold">{accessError || 'Access Denied'}</div>
              <div className="text-xs text-muted-foreground mt-1">You will be redirected shortly.</div>
            </div>
          </div>
        ) : null}

        {(!accessChecking && accessGranted) && (
          <>
            <h1 className="text-2xl font-bold mb-4">Owner Dashboard</h1>
            {user && user.role === 'business' ? (
              <div className="mb-4 text-sm"><strong>Business</strong></div>
            ) : null}

            <section className="mb-6 business-dashboard-text">
              <h2 className="text-lg font-semibold">Summary</h2>
              <div className="mt-2 text-sm">Total orders across your restaurants: <strong>{orders.length}</strong></div>
              <div className="mt-2 text-sm">
                <div className="font-medium mb-1">Recent Orders</div>
                <div className="space-y-2">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="p-2 border rounded business-dashboard-text">
                      <div className="text-sm">#{order.id.slice(-6)} • {nameCache[order.restaurantId] || order.restaurantName}</div>
                      <div className="text-xs">Customer: {order.customerPhone || ''}</div>
                      <div className="text-xs">Status: {order.status.toUpperCase()} • ₹{order.totalAmount}</div>
                      <div className="text-xs mt-1">Items:</div>
                      <div className="text-xs">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.name} x{it.quantity}</span>
                            <span>₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      {/* Account details removed from page body; use header controls only */}
      {!user && !accessChecking ? (
        <p className="mb-4">No signed in user detected. Open the main app, sign in, then come back.</p>
      ) : null}

      <section className="mb-6">
        <h2 className="text-lg font-semibold">My Restaurants</h2>
        {myRestaurants.length ? (
          <ul className="mt-2 space-y-2">
            {myRestaurants.map((r) => (
              <li key={r.id} className="p-2 border rounded hover:shadow-lg hover:translate-y-[-2px] transition-transform">{nameCache[r.id] || r.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">No restaurants assigned to you yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Live Customers</h2>
        <div className="space-y-2 text-sm">
          {orders.length ? (
            <div className="space-y-3">
              <div className="text-sm mb-2">Total orders: {orders.length}</div>
                {orders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg hover:shadow-lg hover:translate-y-[-2px] transition-transform bg-white text-black">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-lg">Order #{order.id.slice(-6)}</div>
                      <div className="text-sm">Restaurant: {nameCache[order.restaurantId] || order.restaurantName}</div>
                      <div className="text-sm">Customer: {order.customerPhone || ''}</div>
                      {!order.customerPhone ? (
                        <div className="text-xs text-red-600 mt-1">Phone not provided</div>
                      ) : null}
                      <div className="text-sm">Status: <span className={`px-2 py-1 rounded text-xs font-medium bg-gray-100 text-black`}>{order.status.toUpperCase()}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">₹{order.totalAmount}</div>
                      <div className="text-sm">{order.paymentMethod}</div>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-2">Items:</div>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Customer Location */}
                  {order.customerLocation && (
                    <div className="mb-3 p-2 bg-gray-100 rounded">
                      <div className="text-sm font-medium mb-1">📍 Customer Location</div>
                      <div className="text-xs">
                        Lat: {order.customerLocation.lat.toFixed(4)}, Lng: {order.customerLocation.lng.toFixed(4)}
                      </div>
                      {order.customerLocation.address && (
                        <div className="text-xs">{order.customerLocation.address}</div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button 
                      className="btn btn-sm bg-green-600 text-white hover:bg-green-700" 
                      onClick={() => {
                        if (order.customerLocation) {
                          const url = `https://www.google.com/maps?q=${order.customerLocation.lat},${order.customerLocation.lng}`;
                          window.open(url, '_blank');
                        } else {
                          alert('No location available for this customer yet.');
                        }
                      }}
                    >
                      🗺️ Show Location
                    </button>
                    <button 
                      className="btn btn-sm bg-orange-600 text-white hover:bg-orange-700"
                      onClick={async () => {
                        // Update order status
                        const newStatus = order.status === 'confirmed' ? 'preparing' : 
                                         order.status === 'preparing' ? 'ready' : 'delivered';
                        try {
                          await updateOrderStatus(order.id, newStatus);
                          console.log('Order status updated to:', newStatus);
                        } catch (error) {
                          console.error('Failed to update order status:', error);
                        }
                      }}
                    >
                      {order.status === 'confirmed' ? 'Start Preparing' : 
                       order.status === 'preparing' ? 'Mark Ready' : 'Mark Delivered'}
                    </button>
                    <button 
                      className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                      onClick={async () => {
                        if (!confirm('Delete this order?')) return;
                        try { await deleteOrder(order.id); } catch (e) { console.error(e); }
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Created: {new Date(order.createdAt).toLocaleString()}
                    {order.estimatedDeliveryTime && (
                      <span> • ETA: {order.estimatedDeliveryTime} minutes</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No orders for your restaurants.</p>
          )}
        </div>
      </section>

      {/* Chat removed per request */}
      </section>
      <footer className="border-t mt-12 py-8 text-center text-muted-foreground">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm">© 2025 Reservia Dine Business. Manage your restaurants and orders here.</p>
        </div>
      </footer>
    </div>
  );
}

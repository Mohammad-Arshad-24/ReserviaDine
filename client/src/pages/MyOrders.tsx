import { useEffect, useState } from 'react';
import { subscribeOrdersForCustomer, subscribeOrders, type Order, getOrder } from '@/lib/orders';
import { onAuthChanged } from '@/lib/firebase';
import { OrderStatus } from '@/components/OrderStatus';

export default function MyOrders() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = onAuthChanged((u) => setUser(u));
    return () => { try { unsub && (unsub as any)(); } catch (e) {} };
  }, []);

  useEffect(() => {
    let unsub: any = null;
    (async () => {
      const email = (user?.email || '').toLowerCase();
      const sessionId = (() => { try { return sessionStorage.getItem('clientSessionId') || ''; } catch (e) { return ''; } })();
      if (user?.uid) {
        // Subscribe to all orders, then filter by uid OR email to include legacy orders
        unsub = subscribeOrders((list) => {
          const mine = (list || []).filter((o) => {
            const byUid = (o as any).customerId === user.uid || (o as any).customerUid === user.uid;
            const byEmail = ((o as any).customerEmail || '').toLowerCase() === email;
            const bySession = sessionId && (o as any).clientSessionId === sessionId;
            return byUid || byEmail || bySession;
          });
          const sorted = mine.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setOrders(sorted);
        });
      } else {
        // fallback for anonymous/new session: show last order + recent order ids
        try {
          const results: Order[] = [] as any;
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem('lastOrder') : null;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.id) {
              const o = await getOrder(parsed.id);
              if (o) results.push(o);
            }
          }
          const listRaw = typeof window !== 'undefined' ? window.localStorage.getItem('recentOrders') : null;
          const ids: string[] = listRaw ? JSON.parse(listRaw) : [];
          for (const id of ids) {
            try { const o = await getOrder(id); if (o) results.push(o as any); } catch (e) {}
          }
          const uniq = Object.values(results.reduce((m: any, o: any) => { m[o.id] = o; return m; }, {}));
          const sorted = (uniq as Order[]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setOrders(sorted);
        } catch (e) {}
      }
    })();
    return () => { try { unsub && (unsub as any)(); } catch (e) {} };
  }, [user?.uid, user?.email]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      {!user ? (
        <div className="text-sm text-muted-foreground">Please sign in to view your orders.</div>
      ) : orders.length === 0 ? (
        <div className="text-sm text-muted-foreground">You have no orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="p-4 border rounded flex items-center justify-between">
              <div>
                <div className="font-semibold">#{String(o.id).slice(-6)} • {o.restaurantName}</div>
                <div className="text-sm text-muted-foreground">{o.items?.length || 0} item(s) • ₹{o.totalAmount}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-black">{String(o.status).toUpperCase()}</span>
                <button
                  className="btn btn-sm"
                  onClick={() => setExpanded((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                >
                  {expanded[o.id] ? 'Hide' : 'Track'}
                </button>
              </div>
              {expanded[o.id] ? (
                <div className="mt-4 w-full">
                  <OrderStatus
                    status={(o.status === 'delivered' ? 'ready' : (o.status as any))}
                    estimatedTime={o.estimatedDeliveryTime || 15}
                    orderId={`#${String(o.id).slice(-6)}`}
                  />
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">Items</div>
                    <div className="space-y-1">
                      {(o.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{it.name} x{it.quantity}</span>
                          <span>₹{(it.price || 0) * (it.quantity || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



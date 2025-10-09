import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorks } from "@/components/HowItWorks";
import { MenuGrid } from "@/components/MenuGrid";
import { CartSidebar, type CartItem } from "@/components/CartSidebar";
import { AuthModal } from "@/components/AuthModal";
import { PaymentModal } from "@/components/PaymentModal";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderTracking from "@/pages/OrderTracking";
import MyOrders from "@/pages/MyOrders";
import { onAuthChanged, signOutUser, subscribeRestaurantOwners, fetchRestaurantOwners, signUp, createUserProfile, fetchBusinessUsers, signInWithGooglePopup, userExists, signIn, isEmailAssociatedWithRestaurant, getLocalRestaurantName, canonicalRestaurantId } from "@/lib/firebase";
import restaurantsList from "../../attached_assets/restaurants-list.json";
import { updateUserDisplayName } from "@/lib/firebase";
import { LocationTracker } from "@/components/LocationTracker";
import { OrderStatus } from "@/components/OrderStatus";
import type { MenuItem } from "@/components/MenuCard";
import { subscribeRestaurants } from "@/lib/firebase";
import RestaurantView from "@/components/RestaurantView";
import NotFound from "@/pages/not-found";
import BusinessPage from "@/pages/BusinessPage";
import mysoreImg from "@assets/generated_images/bangalore-mysore.png";
import OwnerDashboard from "@/pages/OwnerDashboard";
import chennaiImg from "@assets/generated_images/bangalore-chennai.png";
import mumbaiImg from "@assets/generated_images/bangalore-mumbai.png";
import { cart } from "@/lib/cart";
import { createOrder, updateOrderCustomerLocation, upsertOrderContext, subscribeOrderById, subscribeOrdersForCustomer } from "@/lib/orders";

// initial placeholder restaurants to show until firebase populates them
const menuItems: MenuItem[] = [
  { id: "1", name: "Bangalore-Mysore", description: "", price: 0, image: mysoreImg as unknown as string, category: "Restaurants" },
  { id: "2", name: "Bangalore-Chennai", description: "", price: 0, image: chennaiImg as unknown as string, category: "Restaurants" },
  { id: "3", name: "Bangalore-Mumbai", description: "", price: 0, image: mumbaiImg as unknown as string, category: "Restaurants" },
];

function HomePage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [restaurantOwners, setRestaurantOwners] = useState<Record<string, string>>({});
  const [hasOrdered, setHasOrdered] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"confirmed" | "preparing" | "ready">("confirmed");
  const [restaurants, setRestaurants] = useState<any[] | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderStatus, setLastOrderStatus] = useState<'confirmed' | 'preparing' | 'ready'>('confirmed');
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = cart.subscribe(({ items, open }) => {
      // Convert CartEntry[] to CartItem[]
      const cartItems: CartItem[] = items.map(item => ({
        ...item,
        description: '',
        category: 'Food',
        prepTime: 15,
        image: item.image || ''
      }));
      setCartItems(cartItems);
      setIsCartOpen(open);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // If a previous flow requested auth, open the modal
    try {
      if (localStorage.getItem('forceAuth') === '1') {
        setIsAuthOpen(true);
        localStorage.removeItem('forceAuth');
      }
    } catch (e) {}
    try {
      const unsub = onAuthChanged((u) => {
        // ensure signed-in accounts have a profile in /users; otherwise sign them out
        (async () => {
          if (!u) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            return;
          }
          try {
            const exists = await userExists(u.email || '');
            if (!exists) {
              // Auto-create a basic profile on first login to prevent immediate sign-out
              try {
                await createUserProfile(u, 'customer');
              } catch (e) {
                console.warn('Auto profile creation failed', e);
              }
            }
            // load canonical profile from /users/{uid} and attach role/displayName
            try {
              const { fetchUserProfile } = await import('@/lib/firebase');
              const profile = await fetchUserProfile(u.uid);
              if (profile) {
                // prefer server-stored profile fields
                const merged = { ...u, displayName: profile.displayName || u.displayName, role: profile.role || 'customer', email: profile.email || u.email, photoURL: profile.photoURL || u.photoURL, uid: u.uid };
                setCurrentUser(merged as any);
              } else {
                setCurrentUser(u);
              }
            } catch (e) {
              // if fetch profile fails, fall back to auth user
              console.warn('fetchUserProfile failed', e);

        // expose current user on window for standalone pages that read it (OwnerDashboard, etc.)
        useEffect(() => {
          try {
            // @ts-ignore
            (window as any).__CURRENT_USER__ = currentUser;
          } catch (e) {}
        }, [currentUser]);
              setCurrentUser(u);
            }

            setIsAuthenticated(true);
            setAuthError(null);
          } catch (err) {
            console.error('Auth existence check failed', err);
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
        })();
      });

      // subscribe to restaurantOwners mapping
      const unsubOwners = subscribeRestaurantOwners((map) => setRestaurantOwners(map));
      // initial fetch as well
      fetchRestaurantOwners().then((m) => setRestaurantOwners(m)).catch(() => {});

      return () => {
        try { unsub && (unsub as any)(); } catch (e) {}
        try { unsubOwners && (unsubOwners as any)(); } catch (e) {}
      };
    } catch (e) {}
  }, []);

  // Load last order if present to show tracker after refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastOrder');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          setHasOrdered(true);
          setOrderStatus('confirmed');
          setLastOrderId(parsed.id);
        }
      }
    } catch (e) {}
  }, []);

  // Subscribe to last order for live status updates
  useEffect(() => {
    if (!lastOrderId) return;
    const unsub = subscribeOrderById(lastOrderId, (ord) => {
      if (!ord) return;
      if (ord.status === 'confirmed' || ord.status === 'preparing' || ord.status === 'ready') {
        setOrderStatus(ord.status);
        setLastOrderStatus(ord.status);
      }
    });
    return () => { try { unsub && (unsub as any)(); } catch (e) {} };
  }, [lastOrderId]);

  // Subscribe to all orders for the current user
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeOrdersForCustomer(currentUser.uid, (orders) => {
      // sort latest first
      const sorted = (orders || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMyOrders(sorted);
      try { setHasOrdered(!!sorted.length); } catch (e) {}
    });
    return () => { try { unsub && (unsub as any)(); } catch (e) {} };
  }, [currentUser?.uid]);

  // temporary: alert any auth error so it's immediately visible during testing
  useEffect(() => {
    if (authError) {
      try { alert(authError); } catch (e) { console.warn('Alert failed', e); }
    }
  }, [authError]);

  const handleAddToCart = (item: MenuItem) => {
    cart.addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      // prefer an attached restaurantId if item carries it; fallback to item.category/name grouping
      restaurantId: (item as any).restaurantId || (item as any).restaurant?.id || 'default'
    });
    console.log("Added to cart:", item.name);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    cart.updateQuantity(itemId, quantity);
  };

  const handleRemoveItem = (itemId: string) => {
    cart.removeItem(itemId);
  };

  const handleCheckout = () => {
    // Immediate confirmation flow: create order now, clear cart, and show order status
    (async () => {
      try {
        // Enforce authentication prior to placing orders
        if (!currentUser?.uid) {
          setAuthError('Please sign in to place an order.');
          setIsAuthOpen(true);
          return;
        }
        let customerPhone = '';
        try { customerPhone = localStorage.getItem('customerPhone') || ''; } catch (e) {}
        const rawId = cartItems[0]?.restaurantId || '';
        let normalizedName = rawId ? await getLocalRestaurantName(rawId) : '';
        if (!normalizedName || normalizedName === 'default' || /^r\d+$/i.test(rawId)) {
          try {
            const primary = (restaurantsList as any)?.restaurants?.find((r: any) => r.email && r.email.length);
            normalizedName = primary?.name || 'Maddur tiffins';
          } catch (e) {}
        }
        const firstItemRestaurantName = normalizedName;
        const firstItemRestaurantId = canonicalRestaurantId(normalizedName);
        const orderData = {
          customerId: currentUser?.uid,
          customerName: currentUser?.displayName || currentUser?.email || 'Customer',
          customerEmail: currentUser?.email || '',
          customerPhone,
          restaurantId: firstItemRestaurantId,
          restaurantName: firstItemRestaurantName,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            restaurantId: firstItemRestaurantId
          })),
          totalAmount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          status: 'confirmed' as const,
          paymentMethod: 'deposit',
          estimatedDeliveryTime: 30,
          clientSessionId: (() => { try { return sessionStorage.getItem('clientSessionId') || (() => { const id = Math.random().toString(36).slice(2); sessionStorage.setItem('clientSessionId', id); return id; })(); } catch (e) { return 'sess'; } })()
        };
        const orderId = await createOrder(orderData);
        try { await upsertOrderContext(orderId, orderData as any); } catch (e) {}
        try {
          localStorage.setItem('lastOrder', JSON.stringify({ id: orderId, ...orderData }));
          const listRaw = localStorage.getItem('recentOrders');
          const ids: string[] = listRaw ? JSON.parse(listRaw) : [];
          const next = Array.from(new Set([orderId, ...ids])).slice(0, 20);
          localStorage.setItem('recentOrders', JSON.stringify(next));
        } catch (e) {}
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              await updateOrderCustomerLocation(orderId, {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            () => {}
          );
        }
        cart.clear();
        setHasOrdered(true);
        setOrderStatus('confirmed');
        setLastOrderId(orderId);
        try { alert('Order confirmed'); } catch (e) {}
      } catch (e) {
        console.error('Immediate order confirm failed', e);
      } finally {
        setIsCartOpen(false);
      }
    })();
  };

  const handlePaymentSuccess = async (paymentMethod: string) => {
    console.log("Payment successful with method:", paymentMethod);
    
    try {
      // Create order in Firebase
      // choose restaurant context from cart items (majority or first)
      const firstItemRestaurantId = cartItems[0]?.restaurantId || 'default';
      const firstItemRestaurantName = cartItems[0]?.restaurantId || 'Selected Restaurant';
      const orderData = {
        customerId: currentUser?.uid || 'anonymous',
        customerName: currentUser?.displayName || currentUser?.email || 'Customer',
        customerEmail: currentUser?.email || '',
        customerPhone: '',
        restaurantId: firstItemRestaurantId,
        restaurantName: firstItemRestaurantName,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          restaurantId: item.restaurantId || firstItemRestaurantId
        })),
        totalAmount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'confirmed' as const,
        paymentMethod,
        estimatedDeliveryTime: 30, // 30 minutes
        clientSessionId: (() => { try { return sessionStorage.getItem('clientSessionId') || (() => { const id = Math.random().toString(36).slice(2); sessionStorage.setItem('clientSessionId', id); return id; })(); } catch (e) { return 'sess'; } })()
      };
      
      const orderId = await createOrder(orderData);
      console.log("Order created with ID:", orderId);
      try {
        const listRaw = localStorage.getItem('recentOrders');
        const ids: string[] = listRaw ? JSON.parse(listRaw) : [];
        const next = Array.from(new Set([orderId, ...ids])).slice(0, 20);
        localStorage.setItem('recentOrders', JSON.stringify(next));
      } catch (e) {}

      // Update customer location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await updateOrderCustomerLocation(orderId, {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => console.warn('Could not get location for order:', error)
        );
      }
      
    } catch (error) {
      console.error('Failed to create order:', error);
    }
    
    cart.clear();
    setHasOrdered(true);
    setOrderStatus("confirmed");
    setTimeout(() => setOrderStatus("preparing"), 3000);
  };

  // Removed hosted gateway redirect handler

  const handleLogin = async (email: string, password: string) => {
    console.log("Login:", email, password);
    try {
      const exists = await userExists(email);
      if (!exists) {
        setAuthError('Account does not exist. Please sign up first.');
        setIsAuthOpen(true);
        return;
      }
      const res = await signIn(email, password);
      if (res && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        setIsAuthOpen(false);
        setAuthError(null);
      }
    } catch (err: any) {
      console.error('Login failed', err);
      try {
        // translate common firebase auth errors
        const { translateAuthError } = await import('@/lib/firebase');
        setAuthError(translateAuthError(err));
      } catch (e) {
        setAuthError(err?.message || 'Login failed');
      }
      setIsAuthOpen(true);
    }
  };

  const handleSignup = (email: string, password: string, name: string, role: 'customer' | 'business' = 'customer') => {
    // perform email/password signup and create profile
    (async () => {
      try {
        // If signing up as business, verify email is present in businessUsers allowlist
        if (role === 'business') {
          try {
            const allowed = await fetchBusinessUsers();
            const em = (email || '').toLowerCase();
            const inDb = allowed.map((e) => e.toLowerCase()).includes(em);
            const inLocal = em ? isEmailAssociatedWithRestaurant(em) : false;
            if (!em || (!inDb && !inLocal)) {
              setAuthError("You don't have access");
              setIsAuthOpen(true);
              return;
            }
          } catch (e) {
            console.error('Failed to verify business allowlist', e);
            setAuthError('Failed to verify business allowlist');
            setIsAuthOpen(true);
            return;
          }
        }

        const res = await signUp(email, password);
        if (res && res.user) {
          // update auth user displayName and create profile
          try { await updateUserDisplayName(name); } catch (e) {}
          await createUserProfile(res.user, role, { firstName: name, lastName: '', email: res.user.email || '' });
          setIsAuthenticated(true);
          setIsAuthOpen(false);
          setAuthError(null);
        }
      } catch (err: any) {
        console.error('Signup failed', err);
        try {
          const { translateAuthError } = await import('@/lib/firebase');
          setAuthError(translateAuthError(err));
        } catch (e) {
          setAuthError(err?.message || 'Signup failed');
        }
        setIsAuthOpen(true);
      }
    })();
  };

  const handleGoogleAuth = async (role: "customer" | "business") => {
    try {
      const res = await signInWithGooglePopup();
      const user = res.user;
      // if business role, verify email is allowed
      if (role === 'business') {
        try {
          const allowed = await fetchBusinessUsers();
          const em = (user.email || '').toLowerCase();
          const inDb = allowed.map((e) => e.toLowerCase()).includes(em);
          const inLocal = em ? isEmailAssociatedWithRestaurant(em) : false;
          if (!em || (!inDb && !inLocal)) {
            console.warn('Business login blocked for', em);
            // sign out and show access message
            setAuthError("You don't have access");
            try { await signOutUser(); } catch (e) {}
            setIsAuthOpen(true);
            return;
          }
        } catch (e) {
          console.error('Failed to verify business allowlist', e);
        }
      }
      // create/update profile record
      try { await createUserProfile(user, role); } catch (e) { console.error('createUserProfile failed', e); }
      setIsAuthenticated(true);
      setIsAuthOpen(false);
      console.log('Signed in with Google as', role);
    } catch (e) {
      console.error('Google sign-in failed', e);
    }
  };

  const handleAuthClick = () => {
    // Open the centralized AuthModal; actual login/signup handled inside
    setIsAuthOpen(true);
    setAuthError(null);
  };

  const cartItemCount = cart.getCount();

  // If signed in as business, show owner dashboard as the single homepage
  if (currentUser && currentUser.role === 'business') {
    return <OwnerDashboard currentUser={currentUser} />;
  }

  // main homepage UI for customers / anonymous

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartItemCount={cartItemCount}
        onCartClick={() => setIsCartOpen(true)}
        onAuthClick={handleAuthClick}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onSignOut={async () => { await signOutUser(); setIsAuthenticated(false); setCurrentUser(null); }}
        ownedRestaurants={currentUser ? Object.entries(restaurantOwners).filter(([id, email]) => (email || '').toLowerCase() === (currentUser.email || '').toLowerCase()).map(([id]) => {
          const found = restaurants && restaurants.find((r: any) => r.id === id);
          return { id, name: found ? found.name : id };
        }) : []}
      />

      <main>
        <HeroSection onGetStarted={() => setIsAuthOpen(true)} />
        <HowItWorks />
        {/* removed external login links per request */}
        <MenuGrid items={restaurants && restaurants.length ? restaurants : menuItems} onAddToCart={handleAddToCart} />

        {/* TODO: All orders list for the current customer can be added here by subscribing to orders filtered by customerId */}

        {hasOrdered && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center font-[var(--font-accent)]">
                Track Your Orders
              </h2>
              <div className="grid gap-6">
                {myOrders.map((o) => (
                  <OrderStatus
                    key={o.id}
                    status={(o.status === 'delivered' ? 'ready' : o.status) as any}
                    estimatedTime={o.estimatedDeliveryTime || 15}
                    orderId={`#${String(o.id).slice(-6)}`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {currentUser && myOrders.length ? (
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold mb-4">Your Orders</h3>
              <div className="space-y-3">
                {myOrders.map((o) => (
                  <div key={o.id} className="p-4 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-semibold">#{String(o.id).slice(-6)} • {o.restaurantName}</div>
                      <div className="text-sm text-muted-foreground">{o.items?.length || 0} item(s) • ₹{o.totalAmount}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-black">{String(o.status).toUpperCase()}</span>
                      <button className="btn btn-sm" onClick={() => { try { localStorage.setItem('lastOrder', JSON.stringify(o)); setHasOrdered(true); setLastOrderId(o.id); } catch (e) {} }}>Track</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8 mt-24">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p className="text-sm">
            © 2025 Reservia Dine. Skip the wait, enjoy your meal.
          </p>
        </div>
      </footer>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => { setIsAuthOpen(false); setAuthError(null); }}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGoogleLogin={(role) => handleGoogleAuth(role)}
        onGoogleSignup={(role) => handleGoogleAuth(role)}
        currentUser={currentUser}
        onSignOut={async () => { await signOutUser(); setIsAuthenticated(false); setCurrentUser(null); }}
        ownedRestaurants={currentUser ? Object.entries(restaurantOwners).filter(([id, email]) => email === currentUser.email).map(([id]) => {
          const found = restaurants && restaurants.find((r: any) => r.id === id);
          return { id, name: found ? found.name : id };
        }) : []}
        authError={authError}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
  <Route path="/owner-dashboard">
    {() => <OwnerDashboard currentUser={(window as any).__CURRENT_USER__ || null} />}
  </Route>
      <Route path="/business-login" component={BusinessPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/orders" component={MyOrders} />
      <Route path="/order-tracking/:id" component={OrderTracking} />
      <Route path="/restaurant/:name">
        {({ name }: any) => <RestaurantView name={decodeURIComponent(name)} onBack={() => window.history.back()} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [isGlobalCartOpen, setIsGlobalCartOpen] = useState(false);
  const [globalCartItems, setGlobalCartItems] = useState<CartItem[]>([] as any);
  useEffect(() => {
    try {
      const unsub = cart.subscribe((s) => {
        setCartCount((s.items || []).reduce((n, it) => n + (it.quantity || 0), 0));
        // keep a copy of items and open state for global cart sidebar
        const items = (s.items || []).map((item: any) => ({
          ...item,
          description: '',
          category: 'Food',
          prepTime: 15,
          image: item.image || ''
        }));
        setGlobalCartItems(items);
        setIsGlobalCartOpen(!!s.open);
      });
      return () => { try { unsub && (unsub as any)(); } catch (e) {} };
    } catch (e) {}
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          {/* Global fixed header visible on all routes */}
          <Header
            cartItemCount={cartCount}
            onCartClick={() => { try { cart.open(); } catch (e) {} }}
            onAuthClick={() => { try { window.location.href = '/'; } catch (e) {} }}
          />
          {/* spacer to offset fixed header height */}
          <div style={{ height: 64 }} />
          <Router />
          {/* Global Cart Sidebar available on all routes */}
          <CartSidebar
            isOpen={isGlobalCartOpen}
            onClose={() => { try { cart.close(); setIsGlobalCartOpen(false); } catch (e) {} }}
            items={globalCartItems}
            onUpdateQuantity={(itemId, qty) => { try { cart.updateQuantity(itemId, qty); } catch (e) {} }}
            onRemoveItem={(itemId) => { try { cart.removeItem(itemId); } catch (e) {} }}
            onCheckout={() => {
              // Immediate confirmation for global cart as well
              (async () => {
                try {
                  // Enforce authentication for global cart checkout
                  const cu = (window as any).__CURRENT_USER__;
                  if (!cu || !cu.uid) {
                    try { localStorage.setItem('forceAuth', '1'); } catch (e) {}
                    try { alert('Please sign in to place an order.'); } catch (e) {}
                    try { window.location.href = '/#/' } catch (e) {}
                    return;
                  }
                  const rawId = globalCartItems[0]?.restaurantId || '';
                  let normalizedName = rawId ? await getLocalRestaurantName(rawId) : '';
                  if (!normalizedName || normalizedName === 'default' || /^r\d+$/i.test(rawId)) {
                    try {
                      const primary = (restaurantsList as any)?.restaurants?.find((r: any) => r.email && r.email.length);
                      normalizedName = primary?.name || 'Maddur tiffins';
                    } catch (e) {}
                  }
                  const firstItemRestaurantName = normalizedName;
                  const firstItemRestaurantId = canonicalRestaurantId(normalizedName);
                  let customerPhone = '';
                  try { customerPhone = localStorage.getItem('customerPhone') || ''; } catch (e) {}
                  const orderData = {
                    customerId: cu.uid,
                    customerName: cu.displayName || cu.email || 'Customer',
                    customerEmail: cu.email || '',
                    customerPhone,
                    restaurantId: firstItemRestaurantId,
                    restaurantName: firstItemRestaurantName,
                    items: globalCartItems.map(item => ({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      quantity: item.quantity,
                      image: item.image,
                      restaurantId: firstItemRestaurantId
                    })),
                    totalAmount: globalCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
                    status: 'confirmed' as const,
                    paymentMethod: 'deposit',
                    estimatedDeliveryTime: 30,
                    clientSessionId: (() => { try { return sessionStorage.getItem('clientSessionId') || (() => { const id = Math.random().toString(36).slice(2); sessionStorage.setItem('clientSessionId', id); return id; })(); } catch (e) { return 'sess'; } })()
                  } as any;
                  const orderId = await createOrder(orderData);
                  try { await upsertOrderContext(orderId, orderData as any); } catch (e) {}
                  try { localStorage.setItem('lastOrder', JSON.stringify({ id: orderId, ...orderData })); } catch (e) {}
                  try {
                    const listRaw = localStorage.getItem('recentOrders');
                    const ids: string[] = listRaw ? JSON.parse(listRaw) : [];
                    const next = Array.from(new Set([orderId, ...ids])).slice(0, 20);
                    localStorage.setItem('recentOrders', JSON.stringify(next));
                  } catch (e) {}
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        await updateOrderCustomerLocation(orderId, {
                          lat: position.coords.latitude,
                          lng: position.coords.longitude
                        });
                      },
                      () => {}
                    );
                  }
                  cart.clear();
                  alert('Order confirmed');
                  try { window.location.href = '/#/' } catch (e) {}
                } catch (e) {
                  console.error('Immediate order confirm failed', e);
                } finally {
                  try { cart.close(); setIsGlobalCartOpen(false); } catch (e) {}
                }
              })();
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

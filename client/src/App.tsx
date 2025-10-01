import { useState } from "react";
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
import { LocationTracker } from "@/components/LocationTracker";
import { OrderStatus } from "@/components/OrderStatus";
import type { MenuItem } from "@/components/MenuCard";
import pastaImage from "@assets/generated_images/Pasta_dish_menu_item_347c5def.png";
import burgerImage from "@assets/generated_images/Burger_menu_item_fcae8e07.png";
import saladImage from "@assets/generated_images/Salad_bowl_menu_item_6d87ac80.png";
import dessertImage from "@assets/generated_images/Chocolate_dessert_menu_item_76c0ab6e.png";
import smoothieImage from "@assets/generated_images/Smoothie_bowl_menu_item_1aac5e6f.png";
import NotFound from "@/pages/not-found";

const menuItems: MenuItem[] = [
  {
    id: "1",
    name: "Creamy Pasta Alfredo",
    description: "Fresh pasta tossed in rich cream sauce with parmesan cheese and herbs",
    price: 299,
    image: pastaImage,
    category: "Main Course",
    prepTime: 15,
  },
  {
    id: "2",
    name: "Gourmet Burger",
    description: "Juicy beef patty with melted cheese, crispy bacon, lettuce, and tomato",
    price: 349,
    image: burgerImage,
    category: "Main Course",
    prepTime: 20,
  },
  {
    id: "3",
    name: "Fresh Garden Salad",
    description: "Mixed greens, cherry tomatoes, cucumber, avocado with house dressing",
    price: 199,
    image: saladImage,
    category: "Appetizer",
    prepTime: 10,
  },
  {
    id: "4",
    name: "Chocolate Delight",
    description: "Rich chocolate dessert with fresh berries and mint garnish",
    price: 179,
    image: dessertImage,
    category: "Dessert",
    prepTime: 5,
  },
  {
    id: "5",
    name: "Smoothie Bowl",
    description: "Fresh fruits, granola, chia seeds with vibrant toppings",
    price: 229,
    image: smoothieImage,
    category: "Appetizer",
    prepTime: 8,
  },
];

function HomePage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"confirmed" | "preparing" | "ready">("confirmed");

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    console.log("Added to cart:", item.name);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleCheckout = () => {
    console.log("Proceeding to checkout with items:", cartItems);
    setIsCartOpen(false);
    setHasOrdered(true);
    setOrderStatus("confirmed");
    setTimeout(() => setOrderStatus("preparing"), 3000);
  };

  const handleLogin = (email: string, password: string) => {
    console.log("Login:", email, password);
    setIsAuthenticated(true);
    setIsAuthOpen(false);
  };

  const handleSignup = (email: string, password: string, name: string) => {
    console.log("Signup:", email, password, name);
    setIsAuthenticated(true);
    setIsAuthOpen(false);
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartItemCount={cartItemCount}
        onCartClick={() => setIsCartOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
        isAuthenticated={isAuthenticated}
      />

      <main>
        <HeroSection onGetStarted={() => setIsAuthOpen(true)} />
        <HowItWorks />
        <MenuGrid items={menuItems} onAddToCart={handleAddToCart} />

        {hasOrdered && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center font-[var(--font-accent)]">
                Track Your Order
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <OrderStatus status={orderStatus} estimatedTime={15} orderId="#QE12345" />
                <LocationTracker
                  onArrival={() => {
                    console.log("Customer arrived!");
                    setOrderStatus("ready");
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8 mt-24">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p className="text-sm">
            © 2025 QuickEats. Skip the wait, enjoy your meal.
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

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { ShoppingCart, MapPin } from "lucide-react";
import appLogo from "@assets/generated_images/logo.jpeg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountsDropdown } from "./AccountsDropdown";
import { useState } from "react";

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  onAuthClick?: () => void; // simplified to open central AuthModal
  isAuthenticated?: boolean;
  currentUser?: any;
  onSignOut?: () => void;
  ownedRestaurants?: { id: string; name: string }[];
  hideTrackOrders?: boolean; // Hide the Track orders button
}

export function Header({
  cartItemCount = 0,
  onCartClick,
  onAuthClick,
  isAuthenticated = false,
  currentUser,
  onSignOut,
  ownedRestaurants,
  hideTrackOrders = false,
}: HeaderProps) {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);
  let lastOrderId: string | null = null;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('lastOrder') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      lastOrderId = parsed?.id || null;
    }
  } catch (e) {}

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="h-8 w-8 rounded-md overflow-hidden flex items-center justify-center bg-black">
              <img src={appLogo as unknown as string} alt="Reservia Dine" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold font-[var(--font-accent)]">
              Reservia Dine
            </h1>
            {currentUser?.role === 'business' ? (
              <span className="ml-1 sm:ml-2 text-xs px-1 sm:px-2 py-0.5 rounded bg-amber-100 text-amber-900">Business</span>
            ) : null}
            <a href="/" className="ml-2 sm:ml-4 text-xs sm:text-sm underline">Home</a>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hover-elevate active-elevate-2"
            data-testid="button-location"
          >
            <MapPin className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick}
              className="hover-elevate active-elevate-2"
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                data-testid="badge-cart-count"
              >
                {cartItemCount}
              </Badge>
            )}
          </div>

          {!hideTrackOrders && (
            <a href="/orders" className="ml-1 sm:ml-2">
              <Button variant="secondary" size="sm" className="text-xs sm:text-sm">Track orders</Button>
            </a>
          )}

          <AccountsDropdown
            currentUser={currentUser}
            onSignOut={onSignOut}
            onAuthClick={onAuthClick}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </header>
  );
}

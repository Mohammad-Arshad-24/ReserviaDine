import { ShoppingCart, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  onAuthClick?: () => void;
  isAuthenticated?: boolean;
}

export function Header({
  cartItemCount = 0,
  onCartClick,
  onAuthClick,
  isAuthenticated = false,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Q</span>
            </div>
            <h1 className="text-xl font-semibold font-[var(--font-accent)]">
              QuickEats
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <ThemeToggle />

          <Button
            variant={isAuthenticated ? "ghost" : "default"}
            size="icon"
            onClick={onAuthClick}
            className="hover-elevate active-elevate-2"
            data-testid="button-auth"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

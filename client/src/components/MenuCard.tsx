import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";
import { cart as globalCart } from '@/lib/cart';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  prepTime?: number;
}

interface MenuCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem) => void;
  // optional restaurant context so quantity can be shown per-branch
  restaurantId?: string;
}

export function MenuCard({ item, onAddToCart, restaurantId }: MenuCardProps) {
  const [quantity, setQuantity] = useState<number>(0);

  useEffect(() => {
    // compute current quantity for this item (optionally scoped to restaurantId)
    function updateFromState(s: { items: any[] }) {
      const q = (s.items || []).filter((it: any) => it.id === item.id && (restaurantId ? it.restaurantId === restaurantId : true)).reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
      setQuantity(q);
    }
    // initialize
    try { updateFromState({ items: globalCart.getItems() }); } catch (e) {}
    const unsub = globalCart.subscribe((s) => updateFromState(s));
    return () => unsub && unsub();
  }, [item.id, restaurantId]);
  return (
    <Card
      className="overflow-hidden hover-elevate transition-all duration-300 group"
      data-testid={`card-menu-${item.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {item.prepTime && (
          <Badge
            variant="secondary"
            className="absolute top-3 right-3"
            data-testid={`badge-prep-time-${item.id}`}
          >
            {item.prepTime} min
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg font-[var(--font-accent)]" data-testid={`text-item-name-${item.id}`}>
            {item.name}
          </h3>
          <span className="text-lg font-bold text-primary whitespace-nowrap" data-testid={`text-price-${item.id}`}>
            ₹{item.price}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${item.id}`}>
          {item.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {quantity > 0 ? (
          <div className="flex items-center w-full gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                const newQty = Math.max(0, quantity - 1);
                try { globalCart.updateQuantity(item.id, newQty); } catch (e) {}
              }}
              data-testid={`button-decrease-inline-${item.id}`}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-10 text-center" data-testid={`text-quantity-inline-${item.id}`}>{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                const newQty = quantity + 1;
                try { globalCart.updateQuantity(item.id, newQty); } catch (e) {}
              }}
              data-testid={`button-increase-inline-${item.id}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <div className="ml-auto text-sm font-semibold">₹{item.price * quantity}</div>
          </div>
        ) : (
          <Button
            className="w-full hover-elevate active-elevate-2"
            onClick={() => {
              if (typeof onAddToCart === 'function') {
                try { onAddToCart(item); } catch (e) { console.warn('onAddToCart handler failed', e); }
              } else {
                try { globalCart.addItem({ id: item.id, name: item.name, price: item.price, image: item.image, restaurantId }); } catch (e) { console.warn('globalCart.addItem failed', e); }
              }
            }}
            data-testid={`button-add-${item.id}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

import React, { useEffect, useState } from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MenuItem } from "./MenuCard";

export interface CartItem extends MenuItem {
  quantity: number;
  // optional restaurantId carried through from add-to-cart for owner routing
  restaurantId?: string;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onRemoveItem?: (itemId: string) => void;
  onCheckout?: () => void;
}

export function CartSidebar({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartSidebarProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deposit = Math.round(subtotal * 0.3);
  const balanceDue = subtotal - deposit;
  const [phone, setPhone] = useState<string>('');
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('customerPhone') : '';
      setPhone(saved || '');
    } catch (e) {}
  }, []);
  const phoneValid = !!(phone && /[0-9]{7,15}/.test(phone));

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="overlay-cart"
      />
      
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l z-50 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="font-[var(--font-accent)]">Your Cart</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-cart"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              items.map((item) => (
                <Card key={item.id} className="overflow-hidden" data-testid={`cart-item-${item.id}`}>
                  <div className="flex gap-3 p-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate" data-testid={`text-cart-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm text-primary font-semibold mt-1" data-testid={`text-cart-item-price-${item.id}`}>
                        ₹{item.price}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity?.(item.id, Math.max(0, item.quantity - 1))}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto"
                          onClick={() => onRemoveItem?.(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
            {/* Phone input */}
            {items.length > 0 ? (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1" htmlFor="phone">Contact Phone <span className="text-red-600">*</span></label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); try { window.localStorage.setItem('customerPhone', e.target.value); } catch (e) {} }}
                  placeholder="Enter phone number"
                  className={`w-full px-3 py-2 border rounded outline-none text-black ${phoneValid ? 'border-green-500' : 'border-red-500'} bg-yellow-50`}
                />
                {!phoneValid ? (
                  <div className="text-xs text-red-600 mt-1">Phone number is required to confirm order.</div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </ScrollArea>

        {items.length > 0 && (
          <CardFooter className="border-t flex-col gap-3 p-4">
            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold" data-testid="text-subtotal">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Advance Deposit (30%)</span>
                <span className="font-semibold" data-testid="text-deposit">₹{deposit}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Balance at Pickup</span>
                <span className="font-bold" data-testid="text-balance">₹{balanceDue}</span>
              </div>
            </div>
            <Button
              className="w-full hover-elevate active-elevate-2"
              size="lg"
            onClick={() => { if (!phoneValid) return; onCheckout && onCheckout(); }}
              data-testid="button-checkout"
            disabled={!phoneValid}
            >
              Confirm Pre-Order (₹{deposit})
            </Button>
          </CardFooter>
        )}
      </div>
    </>
  );
}

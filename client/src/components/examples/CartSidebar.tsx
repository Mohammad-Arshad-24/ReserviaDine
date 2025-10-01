import { useState } from "react";
import { ThemeProvider } from "../ThemeProvider";
import { CartSidebar, type CartItem } from "../CartSidebar";
import { Button } from "@/components/ui/button";
import pastaImage from "@assets/generated_images/Pasta_dish_menu_item_347c5def.png";
import burgerImage from "@assets/generated_images/Burger_menu_item_fcae8e07.png";

export default function CartSidebarExample() {
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<CartItem[]>([
    {
      id: "1",
      name: "Creamy Pasta Alfredo",
      description: "Fresh pasta in rich cream sauce",
      price: 299,
      image: pastaImage,
      category: "Main Course",
      quantity: 2,
    },
    {
      id: "2",
      name: "Gourmet Burger",
      description: "Juicy beef patty",
      price: 349,
      image: burgerImage,
      category: "Main Course",
      quantity: 1,
    },
  ]);

  return (
    <ThemeProvider>
      <div className="bg-background p-8 min-h-screen">
        <Button onClick={() => setIsOpen(true)}>Open Cart</Button>
        <CartSidebar
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          items={items}
          onUpdateQuantity={(id, qty) => {
            setItems((prev) =>
              qty === 0
                ? prev.filter((item) => item.id !== id)
                : prev.map((item) =>
                    item.id === id ? { ...item, quantity: qty } : item
                  )
            );
          }}
          onRemoveItem={(id) => {
            setItems((prev) => prev.filter((item) => item.id !== id));
          }}
          onCheckout={() => console.log("Checkout")}
        />
      </div>
    </ThemeProvider>
  );
}

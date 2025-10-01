import { ThemeProvider } from "../ThemeProvider";
import { MenuCard } from "../MenuCard";
import pastaImage from "@assets/generated_images/Pasta_dish_menu_item_347c5def.png";

export default function MenuCardExample() {
  const item = {
    id: "1",
    name: "Creamy Pasta Alfredo",
    description: "Fresh pasta in rich cream sauce with parmesan and herbs",
    price: 299,
    image: pastaImage,
    category: "Main Course",
    prepTime: 15,
  };

  return (
    <ThemeProvider>
      <div className="bg-background p-8">
        <div className="max-w-sm">
          <MenuCard
            item={item}
            onAddToCart={(item) => console.log("Added to cart:", item)}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

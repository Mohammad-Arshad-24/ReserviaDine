import { ThemeProvider } from "../ThemeProvider";
import { MenuGrid } from "../MenuGrid";
import pastaImage from "@assets/generated_images/Pasta_dish_menu_item_347c5def.png";
import burgerImage from "@assets/generated_images/Burger_menu_item_fcae8e07.png";
import saladImage from "@assets/generated_images/Salad_bowl_menu_item_6d87ac80.png";
import dessertImage from "@assets/generated_images/Chocolate_dessert_menu_item_76c0ab6e.png";

export default function MenuGridExample() {
  const items = [
    {
      id: "1",
      name: "Creamy Pasta Alfredo",
      description: "Fresh pasta in rich cream sauce",
      price: 299,
      image: pastaImage,
      category: "Main Course",
      prepTime: 15,
    },
    {
      id: "2",
      name: "Gourmet Burger",
      description: "Juicy beef patty with premium toppings",
      price: 349,
      image: burgerImage,
      category: "Main Course",
      prepTime: 20,
    },
    {
      id: "3",
      name: "Fresh Garden Salad",
      description: "Mixed greens with house dressing",
      price: 199,
      image: saladImage,
      category: "Appetizer",
      prepTime: 10,
    },
    {
      id: "4",
      name: "Chocolate Delight",
      description: "Rich chocolate dessert with berries",
      price: 179,
      image: dessertImage,
      category: "Dessert",
      prepTime: 5,
    },
  ];

  return (
    <ThemeProvider>
      <div className="bg-background">
        <MenuGrid
          items={items}
          onAddToCart={(item) => console.log("Added:", item)}
        />
      </div>
    </ThemeProvider>
  );
}

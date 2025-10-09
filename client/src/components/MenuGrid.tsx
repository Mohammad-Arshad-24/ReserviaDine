import { useState } from "react";
import { useLocation } from "wouter";
import { MenuCard, type MenuItem } from "./MenuCard";
import RestaurantCard from "./RestaurantCard";
import mysoreImg from "@assets/generated_images/bangalore-mysore.png";
import chennaiImg from "@assets/generated_images/bangalore-chennai.png";
import mumbaiImg from "@assets/generated_images/bangalore-mumbai.png";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface MenuGridProps {
  items: MenuItem[];
  onAddToCart?: (item: MenuItem) => void;
}

export function MenuGrid({ items, onAddToCart }: MenuGridProps) {
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [, setLocation] = useLocation();

  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((item) => item.category === selectedCategory);

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-[var(--font-accent)]">
            Our Restaurants
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose a region and select a restaurant
          </p>
        </div>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="mb-8"
        >
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="all" data-testid="tab-all">
              All Items
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                data-testid={`tab-${category.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isRestaurantLike = item.price === 0 || !item.price;
            if (isRestaurantLike) {
              // determine image: prefer provided image, otherwise map by name
              const provided = (item as any).image;
              const image = provided
                || (item.name && item.name.toLowerCase().includes("mysore") ? mysoreImg
                : item.name && item.name.toLowerCase().includes("chennai") ? chennaiImg
                : item.name && item.name.toLowerCase().includes("mumbai") ? mumbaiImg
                : undefined);

              return (
                <div key={item.id} onClick={() => setLocation(`/restaurant/${encodeURIComponent(item.name)}`)}>
                  <RestaurantCard name={item.name} image={image} />
                </div>
              );
            }

            return (
              <MenuCard key={item.id} item={item} onAddToCart={onAddToCart} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

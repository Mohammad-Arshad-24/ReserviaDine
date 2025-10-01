import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

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
}

export function MenuCard({ item, onAddToCart }: MenuCardProps) {
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
        <Button
          className="w-full hover-elevate active-elevate-2"
          onClick={() => onAddToCart?.(item)}
          data-testid={`button-add-${item.id}`}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}

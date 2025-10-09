import { Card, CardContent } from "@/components/ui/card";

interface Props {
  name: string;
  image?: string;
  onClick?: () => void;
  distance?: string;
}

export default function RestaurantCard({ name, image, onClick, distance }: Props) {
  return (
    <Card className="hover-elevate cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground">Image Placeholder</span>
          </div>
        )}
      </div>
      <CardContent>
        <h3 className="font-semibold text-lg">{name}</h3>
        {distance ? <p className="text-sm text-muted-foreground">{distance}</p> : null}
      </CardContent>
    </Card>
  );
}

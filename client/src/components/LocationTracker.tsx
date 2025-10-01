import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LocationTrackerProps {
  restaurantLat?: number;
  restaurantLng?: number;
  onArrival?: () => void;
}

export function LocationTracker({
  restaurantLat = 28.6139,
  restaurantLng = 77.2090,
  onArrival,
}: LocationTrackerProps) {
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!tracking) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        const dist = calculateDistance(userLat, userLng, restaurantLat, restaurantLng);
        setDistance(dist);

        if (dist < 0.1) {
          onArrival?.();
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking, restaurantLat, restaurantLng, onArrival]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const enableTracking = () => {
    if ("geolocation" in navigator) {
      setTracking(true);
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const progress = distance ? Math.max(0, Math.min(100, 100 - distance * 10)) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-[var(--font-accent)]">
          <Navigation className="h-5 w-5 text-primary" />
          Location Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!tracking ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Enable location tracking so we can prepare your order when you're nearby
            </p>
            <Button
              onClick={enableTracking}
              className="hover-elevate active-elevate-2"
              data-testid="button-enable-tracking"
            >
              Enable Location Tracking
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Distance to restaurant</span>
              <Badge variant="secondary" data-testid="badge-distance">
                {distance !== null ? `${distance.toFixed(2)} km` : "Calculating..."}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-distance" />
            <div className="text-sm text-muted-foreground">
              {distance !== null && distance < 0.5 && (
                <div className="text-primary font-semibold animate-pulse">
                  Almost there! We're preparing your order.
                </div>
              )}
              {distance !== null && distance >= 0.5 && (
                <div>On your way... We'll start preparing soon.</div>
              )}
            </div>
            {userLocation && (
              <div className="text-xs text-muted-foreground">
                Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

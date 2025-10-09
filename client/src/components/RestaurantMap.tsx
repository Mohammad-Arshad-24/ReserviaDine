import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./RouteMap.css";

// Function to draw road-based route using OSRM (Open Source Routing Machine)
async function drawRoadBasedRoute(routePoints: [number, number][], map: L.Map) {
  // Check if map exists and is valid
  if (!map) {
    console.warn('Invalid map instance provided to drawRoadBasedRoute');
    return null;
  }
  
  try {
    // Convert coordinates to the format expected by OSRM (lng,lat)
    const coordinates = routePoints.map(point => `${point[1]},${point[0]}`).join(';');
    
    // Use OSRM API for routing (free and no API key required)
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeGeometry = route.geometry;
        
        // Draw the road-based route
        const routeLine = L.geoJSON(routeGeometry, {
          style: {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 10'
          }
        }).addTo(map);
        
        // Add route information
        const distance = route.distance; // in meters
        const duration = route.duration; // in seconds
        
        // No route label - clean map without text
        
        // Add start and end markers (without text)
        if (routePoints.length > 0) {
          // Start marker
          L.marker(routePoints[0], {
            icon: L.divIcon({
              html: '<div class="route-start"></div>',
              className: 'route-start',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map);
          
          // End marker
          L.marker(routePoints[routePoints.length - 1], {
            icon: L.divIcon({
              html: '<div class="route-end"></div>',
              className: 'route-end',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map);
        }
        
        // Add restaurant markers along the route (without numbers)
        routePoints.forEach((point, index) => {
          if (index > 0 && index < routePoints.length - 1) {
            L.marker(point, {
              icon: L.divIcon({
                html: `<div class="restaurant-marker"></div>`,
                className: 'restaurant-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            }).addTo(map);
          }
        });
        
        return routeLine;
      }
    }
  } catch (error) {
    console.warn('Failed to get road-based route, falling back to straight line:', error);
  }
  
  // Fallback to straight line if API fails
  if (!map) {
    console.warn('Cannot draw fallback route - invalid map instance');
    return null;
  }
  
  const routeLine = L.polyline(routePoints, {
    color: '#3b82f6',
    weight: 4,
    opacity: 0.8,
    dashArray: '10, 10'
  }).addTo(map);
  
  // No route label - clean map without text
  
  return routeLine;
}

interface RestaurantInfo {
  id?: string;
  name: string;
  map?: string;
  lat?: number;
  lng?: number;
}

interface Props {
  className?: string;
  restaurants?: RestaurantInfo[];
  selectedId?: string | null;
  onUserLocation?: (lat: number, lng: number) => void;
  liveTracking?: boolean;
  userLocation?: { lat: number; lng: number };
  distances?: Record<string, number>;
}

export default function RestaurantMap({ className, restaurants = [], selectedId = null, onUserLocation, liveTracking = false, userLocation, distances }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const watchIdRef = useRef<number | null>(null);

  // try to extract lat/lng from various Google Maps URL patterns
  function parseLatLngFromGoogleMaps(url?: string): [number, number] | null {
    if (!url) return null;
    // pattern: @lat,lng
    let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    // pattern: !3dlat!4dlng
    m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    // fallback: find first pair of decimal coordinates
    m = url.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    return null;
  }

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current).setView([13.0827, 80.2707], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add restaurant markers
    const bounds: any[] = [];

    // clear previous markersRef entries (except map instance)
    markersRef.current = {};

    const routePoints: [number, number][] = [];
    
    restaurants.forEach((r) => {
      let coords: [number, number] | null = null;
      
      // Use provided lat/lng if available, otherwise parse from map URL
      if (r.lat && r.lng) {
        coords = [r.lat, r.lng];
      } else {
        coords = parseLatLngFromGoogleMaps(r.map);
      }
      
      if (!coords) return;
      
      const marker = L.marker(coords as any).addTo(map);
      
      // Create popup content with distance if available
      let popupContent = `<div><strong>${r.name}</strong>`;
      if (r.id && distances && distances[r.id]) {
        popupContent += `<br/>📍 ${distances[r.id]} km away`;
      }
      if (r.map) {
        popupContent += `<br /><a href="${r.map}" target="_blank" rel="noreferrer">Open in Maps</a>`;
      }
      popupContent += `</div>`;
      
      marker.bindPopup(popupContent);
      if (r.id) markersRef.current[r.id] = marker;
      bounds.push(coords as any);
      
      // Add to route points for line drawing
      routePoints.push(coords);
    });

    // Draw road-based route if we have multiple points (Bangalore to Mysore route)
    if (routePoints.length > 1 && map) {
      // Call the route drawing function asynchronously
      drawRoadBasedRoute(routePoints, map).catch(error => {
        console.warn('Failed to draw road-based route:', error);
      });
    }

    if (bounds.length) {
      try {
        const latlngs = bounds.map((b) => L.latLng(b[0], b[1]));
        const bb = L.latLngBounds(latlngs);
        map.fitBounds(bb, { padding: [50, 50] });
      } catch (e) {
        // ignore
      }
    }

    // If user location is provided, add user marker immediately
    if (userLocation) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], { 
        radius: 8, 
        color: "#1d4ed8", 
        fillColor: "#3b82f6", 
        fillOpacity: 0.9 
      }).addTo(map);
      userMarker.bindPopup("You are here");
      markersRef.current["__user"] = userMarker;
    } else {
      // try to locate user and show marker; do NOT override fitBounds here — we'll recompute when location found
      map.locate({ setView: false, maxZoom: 16 });
    }

    function onLocationFound(e: any) {
      // add or update a distinct user marker
      if (markersRef.current["__user"]) {
        try {
          markersRef.current["__user"].setLatLng(e.latlng);
        } catch (err) {
          // ignore
        }
      } else {
        const userMarker = L.circleMarker(e.latlng, { radius: 8, color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9 }).addTo(map);
        userMarker.bindPopup("You are here");
        markersRef.current["__user"] = userMarker;
      }

      // report user's location back to parent
      if (typeof onUserLocation === "function") {
        try {
          onUserLocation(e.latlng.lat, e.latlng.lng);
        } catch (err) {
          // ignore callback errors
        }
      }

      // recompute bounds to include restaurants and user
      const latlngs: any[] = [];
      Object.values(markersRef.current).forEach((m: any) => {
        try {
          const ll = m.getLatLng();
          if (ll) latlngs.push(ll);
        } catch (err) {
          // some markers may be circleMarkers; they still have getLatLng
        }
      });

      if (latlngs.length) {
        try {
          const bb = L.latLngBounds(latlngs);
          map.fitBounds(bb, { padding: [50, 50] });
        } catch (err) {
          // ignore
        }
      }
    }

    function onLocationError() {
      // user may disallow location; ignore
    }

    map.on("locationfound", onLocationFound);
    map.on("locationerror", onLocationError);

    mapInstanceRef.current = map;

    // helper: compute haversine distance (km)
    function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Removed permanent distance tooltips to avoid rare _leaflet_pos timing errors

    // set up continuous watchPosition for live updates if requested
    if (liveTracking && navigator && navigator.geolocation && typeof navigator.geolocation.watchPosition === "function") {
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            // reuse same logic as onLocationFound but avoid opening tooltips/popups here
            const e = { latlng: L.latLng(lat, lng) } as any;
            onLocationFound(e);
          },
          () => {
            // geolocation error — ignore
          },
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
        );
        // watchPosition returns number id
        watchIdRef.current = id as unknown as number;
      } catch (err) {
        // ignore
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      }
      // clear geolocation watch if set
      try {
        if (watchIdRef.current !== null && navigator && navigator.geolocation && typeof navigator.geolocation.clearWatch === "function") {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      } catch (err) {
        // ignore
      }
    };
  }, [restaurants, liveTracking]);

  // when selectedId changes, open popup and center
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current[selectedId];
    if (marker) {
      const latlng = marker.getLatLng();
      map.setView(latlng, 15);
      marker.openPopup();
    }
  }, [selectedId]);

  return (
    <div className={className}>
      <div ref={mapRef} style={{ height: 380, width: "100%" }} />
    </div>
  );
}

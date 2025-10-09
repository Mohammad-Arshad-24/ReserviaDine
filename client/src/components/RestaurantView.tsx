import { useState, useMemo, useEffect } from "react";
import RestaurantCard from "./RestaurantCard";
import RestaurantMap from "./RestaurantMap";
import { subscribeRestaurantOwners, fetchRestaurantOwners } from "@/lib/firebase";
import { MenuCard, type MenuItem } from "./MenuCard";
import { cart as globalCart } from '@/lib/cart';
import mysoreImg from "@assets/generated_images/bangalore-mysore.png";
import chennaiImg from "@assets/generated_images/bangalore-chennai.png";
import mumbaiImg from "@assets/generated_images/bangalore-mumbai.png";
import pastaImg from "@assets/generated_images/Pasta_dish_menu_item_347c5def.png";
import burgerImg from "@assets/generated_images/Burger_menu_item_fcae8e07.png";
import saladImg from "@assets/generated_images/Salad_bowl_menu_item_6d87ac80.png";
import dessertImg from "@assets/generated_images/Chocolate_dessert_menu_item_76c0ab6e.png";

// Load all generated images (jpg/png) from attached assets at build-time and expose as URLs
const generatedImages = import.meta.glob(
  '@assets/generated_images/*.{png,jpg,jpeg}',
  { eager: true, as: 'url' }
);

function normalizeKey(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeWords(v: string): string[] {
  return (v || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Build a fast lookup from normalized basename -> url
const imageUrlByNormalizedBasename: Record<string, string> = Object.entries(generatedImages).reduce((acc, [path, url]) => {
  const parts = path.split('/');
  const basename = parts[parts.length - 1] || path;
  const normalized = normalizeKey(basename.replace(/\.(png|jpg|jpeg)$/i, ''));
  acc[normalized] = url as string;
  return acc;
}, {} as Record<string, string>);

function getGeneratedImageFor(restaurantName: string): string | undefined {
  const target = normalizeKey(restaurantName);

  // 1) Exact normalized basename match
  if (imageUrlByNormalizedBasename[target]) return imageUrlByNormalizedBasename[target];

  // 2) Fuzzy contains: pick the first whose key contains the target or vice versa
  const entry = Object.entries(imageUrlByNormalizedBasename).find(([key]) =>
    key.includes(target) || target.includes(key)
  );
  if (entry) return entry[1];

  return undefined;
}

// Fuzzy match for menu item names: case-insensitive, word-based token containment
function getGeneratedMenuImageFor(label: string): string | undefined {
  const queryWords = normalizeWords(label);
  if (!queryWords.length) return undefined;

  let bestKey: string | null = null;
  let bestScore = 0;

  for (const [key, url] of Object.entries(imageUrlByNormalizedBasename)) {
    const keyWords = normalizeWords(key);
    // score = number of query words contained in key
    let score = 0;
    for (const w of queryWords) {
      if (key.includes(w) || keyWords.includes(w)) score++;
    }
    // slight boost if filename hints at menu item
    if (/(menu|item|dish|food)/.test(key)) score += 0.25;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  // require at least 1 matching token
  if (bestKey && bestScore >= 1) {
    return imageUrlByNormalizedBasename[bestKey];
  }
  return undefined;
}

interface Props {
  name: string;
  onBack?: () => void;
}

export default function RestaurantView({ name, onBack }: Props) {
  // if the user opened Bangalore-Mysore, show these four specific restaurants
  type RestaurantEntry = { id: string; name: string; image: string; map?: string; lat?: number; lng?: number };

  function parseLatLngFromGoogleMaps(url?: string): [number, number] | null {
    if (!url) return null;
    let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    m = url.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    return null;
  }

  function haversineDistance([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
    // returns distance in kilometers
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // Earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // derive a thumbnail image using Google maps static API alternative (via gmaps share link -> use a generic thumbnail fallback)
  function thumbnailFromMapUrl(url?: string, fallback?: string) {
    if (!url) return fallback || chennaiImg;
    // Best-effort: parse coordinates and show a static OpenStreetMap tile snapshot via maptiler demo (no key).
    const coords = parseLatLngFromGoogleMaps(url);
    if (coords) {
      const [lat, lng] = coords;
      // Static map tile proxy using Maps Static-like tile server (open-source demo). If blocked, fallback provided.
      const tile = `https://tile.openstreetmap.org/12/${Math.floor((lng + 180) / 360 * Math.pow(2,12))}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180))/Math.PI)/2 * Math.pow(2,12))}.png`;
      return tile;
    }
    return fallback || chennaiImg;
  }

  const restaurants: RestaurantEntry[] = useMemo(() => {
    const basePath = "/generated_images/";
  
    const base = name.includes("Mysore")
      ? [
          { id: "r1", name: "Adyar Ananda Bhavan (Bangalore)", image: getGeneratedImageFor("A2B") || `${basePath}A2B.jpg`, map: "https://www.google.com/maps/place/Adyar+Ananda+Bhavan+-+A2B/@12.9537996,77.5438053,17z/", routeOrder: 1 },
          { id: "r2", name: "Ginger Lake View (Bangalore)", image: getGeneratedImageFor("Ginger Lake View") || `${basePath}GINGERLAKEVIEW.jpg`, map: "https://www.google.com/maps/place/Ginger+Lake+View/@12.9072451,77.4909134,17z/", routeOrder: 2 },
          { id: "r3", name: "Nisarga family Dhaba (Midway)", image: getGeneratedImageFor("Nisarga family Dhaba") || `${basePath}NISARGAFAMILYDHABA.jpg`, map: "https://www.google.com/maps/place/Nisarga+family+Dhaba/@12.8811063,77.4473349,17z/", routeOrder: 3 },
          { id: "r4", name: "Maddur Tiffins (Near Mysore)", image: getGeneratedImageFor("Maddur Tiffins") || `${basePath}MADDURTIFFINS.jpg`, map: "https://www.google.com/maps/place/Maddur+Tiffanys+@+shivapura/@12.6065,77.0527803,17z/", routeOrder: 4 },
        ]
      : name.includes("Chennai")
      ? [
          { id: "c1", name: "Swadh Restaurant", image: getGeneratedImageFor("Swadh Restaurant") || `${basePath}SWADHRESTAURANT.jpg`, map: "https://www.google.com/maps/place/Swadh+Restaurant+%26+Catering/@12.8633536,77.4329125,17z/" },
          { id: "c2", name: "Saisangeet Vegetarian Restaurant", image: getGeneratedImageFor("Saisangeet Vegetarian Restaurant") || `${basePath}SAISANGEETVEGETARIANRESTAURANT.jpg`, map: "https://www.google.com/maps/place/Saisangeet+Vegetarian+Restaurant/@12.719523,78.662488,17z/" },
          { id: "c3", name: "Bell24 Family Restaurant", image: getGeneratedImageFor("Bell24 Family Restaurant") || `${basePath}BELL24FAMILYRESTAURANT.jpg`, map: "https://www.google.com/maps/place/Bell24+Family+Resturant/@12.9901928,77.4522631,17z/" },
          { id: "c4", name: "Devaras Restaurant", image: getGeneratedImageFor("Devaras Restaurant") || `${basePath}DEVARASRESTAURANT.jpg`, map: "https://www.google.com/maps/place/Devaras+Restaurant/@13.0030975,77.553595,17z/" },
        ]
      : name.includes("Mumbai")
      ? [
          { id: "m1", name: "Hotel Opal", image: getGeneratedImageFor("Hotel Opal") || `${basePath}HOTELOPAL.jpg`, map: "https://www.google.com/maps/place/Hotel+Opal/@16.7032829,74.2506455,17z/" },
          { id: "m3", name: "Kamat Upahar", image: getGeneratedImageFor("Kamat Upahar") || `${basePath}KAMATUPAHAR.jpg`, map: "https://www.google.com/maps/place/Kamat+Upahar/@13.0623833,77.4753898,17z/" },
          { id: "m4", name: "Hotel Rama Krishna", image: getGeneratedImageFor("Hotel Rama Krishna") || `${basePath}HOTELRAMAKRISHNA.jpg`, map: "https://www.google.com/maps/place/Hotel+Rama+Krishna/@18.7536943,73.4047211,17z/" },
        ]
      : [
          { id: "r1", name: `${name} - Branch 1`, image: getGeneratedImageFor(name) || `${basePath}DEFAULT.jpg` },
          { id: "r2", name: `${name} - Branch 2`, image: getGeneratedImageFor(name) || `${basePath}DEFAULT.jpg` },
          { id: "r3", name: `${name} - Branch 3`, image: getGeneratedImageFor(name) || `${basePath}DEFAULT.jpg` },
        ];
  
    return base.map((r) => {
      const coords = parseLatLngFromGoogleMaps((r as any).map);
      if (coords) return { ...r, lat: coords[0], lng: coords[1] };
      return r;
    });
  }, [name]);
  

  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [imageByRestaurantId, setImageByRestaurantId] = useState<Record<string, string>>({});
  const [menuImageById, setMenuImageById] = useState<Record<string, string>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [liveTracking, setLiveTracking] = useState<boolean>(true);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [distances, setDistances] = useState<Record<string, number>>({});

  // subscribe to owners mapping from Realtime DB
  useMemo(() => {
    try {
      const unsub = subscribeRestaurantOwners((map) => {
        setOwners(map);
      });
      // also initial fetch
      fetchRestaurantOwners().then((m) => {
        setOwners(m);
      }).catch(() => {});
      return () => {
        try { if (unsub && typeof unsub === 'function') unsub(); } catch (e) {}
      };
    } catch (e) {
      // ignore if firebase not configured
    }
  }, []);

  // per-restaurant menus (example variation)
  const menusByRestaurant: Record<string, MenuItem[]> = {
    r1: [
      { id: "r1-dosa", name: "Masala Dosa", description: "Crispy dosa with potato masala", price: 95, image: "https://images.unsplash.com/photo-1628294896516-3cbbf0f0030f?q=80&w=800&auto=format&fit=crop", category: "South Indian", prepTime: 10 },
      { id: "r1-idli", name: "Idli Sambar", description: "Steamed idlis with sambar", price: 70, image: "https://images.unsplash.com/photo-1601050690498-8d8f1c0a285e?q=80&w=800&auto=format&fit=crop", category: "South Indian", prepTime: 8 },
      { id: "r1-coffee", name: "Filter Coffee", description: "Strong filter coffee", price: 45, image: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=800&auto=format&fit=crop", category: "Beverages", prepTime: 3 },
    ],
    r2: [
      { id: "r2-paratha", name: "Aloo Paratha", description: "Stuffed paratha with curd & pickle", price: 120, image: "https://images.unsplash.com/photo-1605472491100-8a3bfa2a3430?q=80&w=800&auto=format&fit=crop", category: "North Indian", prepTime: 12 },
      { id: "r2-paneer", name: "Paneer Butter Masala", description: "Creamy tomato gravy with paneer", price: 210, image: "https://images.unsplash.com/photo-1631452180519-47863a689c9f?q=80&w=800&auto=format&fit=crop", category: "Main Course", prepTime: 15 },
      { id: "r2-roti", name: "Tandoori Roti (2)", description: "Fresh from the tandoor", price: 40, image: "https://images.unsplash.com/photo-1596797038530-2c1072290f18?q=80&w=800&auto=format&fit=crop", category: "Breads", prepTime: 6 },
    ],
    r3: [
      { id: "r3-biryani", name: "Veg Biryani", description: "Aromatic basmati with veggies", price: 180, image: "https://images.unsplash.com/photo-1604908176997-4312b2a06c3b?q=80&w=800&auto=format&fit=crop", category: "Main Course", prepTime: 18 },
      { id: "r3-vada", name: "Medu Vada", description: "Crispy lentil donuts with chutney", price: 80, image: "https://images.unsplash.com/photo-1617195737497-2f1a0e07bba1?q=80&w=800&auto=format&fit=crop", category: "South Indian", prepTime: 8 },
      { id: "r3-tea", name: "Masala Chai", description: "Spiced Indian tea", price: 35, image: "https://images.unsplash.com/photo-1523906630133-f6934a1ab1f3?q=80&w=800&auto=format&fit=crop", category: "Beverages", prepTime: 3 },
    ],
    r4: [
      { id: "r4-poori", name: "Poori Bhaji", description: "Fluffy pooris with aloo bhaji", price: 110, image: "https://images.unsplash.com/photo-1615486363874-0ac83d6f52ff?q=80&w=800&auto=format&fit=crop", category: "Breakfast", prepTime: 12 },
      { id: "r4-dosa", name: "Butter Dosa", description: "Golden dosa with butter", price: 105, image: "https://images.unsplash.com/photo-1628294896516-3cbbf0f0030f?q=80&w=800&auto=format&fit=crop", category: "South Indian", prepTime: 10 },
      { id: "r4-coffee", name: "Filter Coffee", description: "Classic filter coffee", price: 45, image: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=800&auto=format&fit=crop", category: "Beverages", prepTime: 3 },
    ],
    c1: [
      { id: "c1-dosa", name: "Ghee Dosa", description: "Crispy dosa with ghee", price: 110, image: "https://images.unsplash.com/photo-1628294896516-3cbbf0f0030f?q=80&w=800&auto=format&fit=crop", category: "South Indian" },
      { id: "c1-idli", name: "Rava Idli", description: "Semolina idli", price: 85, image: "https://images.unsplash.com/photo-1601050690498-8d8f1c0a285e?q=80&w=800&auto=format&fit=crop", category: "South Indian" },
    ],
    c2: [
      { id: "c2-paratha", name: "Paneer Paratha", description: "Stuffed paneer paratha", price: 140, image: "https://images.unsplash.com/photo-1605472491100-8a3bfa2a3430?q=80&w=800&auto=format&fit=crop", category: "North Indian" },
      { id: "c2-tea", name: "Masala Chai", description: "Spiced tea", price: 35, image: "https://images.unsplash.com/photo-1523906630133-f6934a1ab1f3?q=80&w=800&auto=format&fit=crop", category: "Beverages" },
    ],
    c3: [
      { id: "c3-biryani", name: "Veg Biryani", description: "Aromatic biryani", price: 185, image: "https://images.unsplash.com/photo-1604908176997-4312b2a06c3b?q=80&w=800&auto=format&fit=crop", category: "Main Course" },
      { id: "c3-roti", name: "Butter Roti (2)", description: "Tandoori roti", price: 45, image: "https://images.unsplash.com/photo-1596797038530-2c1072290f18?q=80&w=800&auto=format&fit=crop", category: "Breads" },
    ],
    c4: [
      { id: "c4-paneer", name: "Paneer Butter Masala", description: "Paneer in rich gravy", price: 220, image: "https://images.unsplash.com/photo-1631452180519-47863a689c9f?q=80&w=800&auto=format&fit=crop", category: "Main Course" },
      { id: "c4-tea", name: "Masala Chai", description: "Spiced tea", price: 35, image: "https://images.unsplash.com/photo-1523906630133-f6934a1ab1f3?q=80&w=800&auto=format&fit=crop", category: "Beverages" },
    ],
    m1: [
      { id: "m1-thali", name: "Veg Thali", description: "Assorted Indian platter", price: 220, image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop", category: "Main Course" },
      { id: "m1-tea", name: "Masala Chai", description: "Spiced tea", price: 35, image: "https://images.unsplash.com/photo-1523906630133-f6934a1ab1f3?q=80&w=800&auto=format&fit=crop", category: "Beverages" },
    ],
    m3: [
      { id: "m3-biryani", name: "Veg Biryani", description: "Aromatic basmati", price: 190, image: "https://images.unsplash.com/photo-1604908176997-4312b2a06c3b?q=80&w=800&auto=format&fit=crop", category: "Main Course" },
      { id: "m3-roti", name: "Tandoori Roti (2)", description: "Tandoor special", price: 40, image: "https://images.unsplash.com/photo-1596797038530-2c1072290f18?q=80&w=800&auto=format&fit=crop", category: "Breads" },
    ],
    m4: [
      { id: "m4-dosa", name: "Masala Dosa", description: "Crispy dosa", price: 100, image: "https://images.unsplash.com/photo-1628294896516-3cbbf0f0030f?q=80&w=800&auto=format&fit=crop", category: "South Indian" },
      { id: "m4-tea", name: "Masala Chai", description: "Spiced tea", price: 35, image: "https://images.unsplash.com/photo-1523906630133-f6934a1ab1f3?q=80&w=800&auto=format&fit=crop", category: "Beverages" },
    ],
  };

  // Get user location and calculate distances
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          // Calculate distances to all restaurants
          const newDistances: Record<string, number> = {};
          restaurants.forEach(restaurant => {
            if (restaurant.lat && restaurant.lng) {
              const distance = haversineDistance(
                [location.lat, location.lng],
                [restaurant.lat, restaurant.lng]
              );
              newDistances[restaurant.id] = Math.round(distance * 100) / 100; // Round to 2 decimal places
            }
          });
          setDistances(newDistances);
        },
        (error) => {
          console.warn('Error getting location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [restaurants]);

  useEffect(() => {
    if (!restaurants.length) {
      console.warn(`No restaurants found for the name: ${name}`);
    }
  }, [restaurants, name]);

  const handleAddToCart = (item: MenuItem) => {
    globalCart.addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      restaurantId: selectedBranch || restaurants[0]?.id || name || 'unknown',
    });
  };

  // Enhancement: download exact Google photo for each restaurant and swap image to local path (/images/...)
  useEffect(() => {
    (async () => {
      for (const r of restaurants) {
        if (!r || !r.name) continue;
        // if we've already stored a local image path for this id, skip
        if (imageByRestaurantId[r.id]) continue;
        try {
          const q = encodeURIComponent(r.name);
          const lat = r.lat ? `&lat=${r.lat}` : '';
          const lng = r.lng ? `&lng=${r.lng}` : '';
          const resp = await fetch(`/api/place-photo/download?q=${q}${lat}${lng}`);
          if (!resp.ok) continue;
          const data = await resp.json();
          const localPath = data?.imagePath;
          if (localPath) {
            setImageByRestaurantId((prev) => ({ ...prev, [r.id]: localPath }));
          }
        } catch (e) {}
      }
    })();
  }, [restaurants]);

  // Download menu item images to local when a branch is selected
  useEffect(() => {
    (async () => {
      if (!selectedBranch) return;
      const list = menusByRestaurant[selectedBranch] || [];
      for (const m of list) {
        if (!m?.image) continue;
        if (menuImageById[m.id]) continue;
        try {
          const resp = await fetch('/api/download-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: m.image, name: `${selectedBranch}-${m.id}` })
          });
          if (!resp.ok) continue;
          const data = await resp.json();
          const localPath = data?.imagePath;
          if (localPath) setMenuImageById((prev) => ({ ...prev, [m.id]: localPath }));
        } catch (e) {}
      }
    })();
  }, [selectedBranch]);

  function getMenuFallbackImage(name: string): string | undefined {
    const n = (name || '').toLowerCase();
    if (n.includes('pasta')) return pastaImg as unknown as string;
    if (n.includes('burger')) return burgerImg as unknown as string;
    if (n.includes('salad')) return saladImg as unknown as string;
    if (n.includes('dessert') || n.includes('chocolate')) return dessertImg as unknown as string;
    // try generated images by normalized basename
    const gen = getGeneratedMenuImageFor(name) || getGeneratedImageFor(name);
    if (gen) return gen;
    return undefined;
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{name}</h2>
          <button className="text-sm text-muted-foreground" onClick={onBack}>Back</button>
        </div>

        {!selectedBranch ? (
          <div className="space-y-6">
            {/* Location and Map Section */}
            {userLocation && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-2">📍 Your Location</h3>
                <p className="text-sm text-gray-600">
                  Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                </p>
                <div className="mt-4">
                  <RestaurantMap 
                    userLocation={userLocation} 
                    restaurants={restaurants.filter(r => r.lat && r.lng)} 
                    distances={distances}
                  />
                </div>
              </div>
            )}
            
            {/* Route Information */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-2">🚗 {name} Route</h3>
              <p className="text-sm text-gray-600 mb-3">
                Follow the road-based route, stopping at restaurants along the way.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Start Point</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>End Point</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Restaurants: {restaurants.length}</span>
                </div>
              </div>
            </div>

            {/* Restaurants Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {restaurants.map((r, index) => (
                <div key={r.id} className="space-y-2">
                  <div onClick={() => setSelectedBranch(r.id)} className="cursor-pointer group">
                    <div className="relative">
                      <RestaurantCard name={r.name} image={imageByRestaurantId[r.id] || r.image} />
                      {/* Route position indicator */}
                      <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {index + 1}
                      </div>
                    </div>
                    {distances[r.id] && (
                      <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        <span>📍 {distances[r.id]} km away</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Stop {index + 1}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {index === 0 ? 'Starting point' : 
                       index === restaurants.length - 1 ? 'Final destination' : 
                       'Route stop'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{restaurants.find(r => r.id === selectedBranch)?.name}</h3>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setSelectedBranch(null)}>Back</button>
                <button className="btn" onClick={onBack}>All Restaurants</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(menusByRestaurant[selectedBranch as string] || []).map((m) => {
                const resolvedImage = menuImageById[m.id]
                  || getGeneratedMenuImageFor(m.name)
                  || getMenuFallbackImage(m.name)
                  || m.image;
                return (
                  <MenuCard
                    key={m.id}
                    item={{ ...m, image: resolvedImage }}
                    onAddToCart={() => handleAddToCart(m)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

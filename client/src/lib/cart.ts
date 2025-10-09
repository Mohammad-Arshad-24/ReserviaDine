type MenuItemMinimal = { id: string; name: string; price: number; image?: string; restaurantId?: string };

interface CartEntry extends MenuItemMinimal {
  quantity: number;
}

type Subscriber = (state: { items: CartEntry[]; open: boolean }) => void;

const STORAGE_KEY = 'qe_cart_v1';

function readStorage(): CartEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartEntry[];
  } catch (e) {
    return [];
  }
}

function writeStorage(items: CartEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
}

let items: CartEntry[] = readStorage();
let open = false;
const subs: Subscriber[] = [];

function notify() {
  subs.forEach((s) => {
    try { s({ items: [...items], open }); } catch (e) {}
  });
}

export const cart = {
  getItems() {
    return [...items];
  },
  getCount() {
    return items.reduce((s, it) => s + it.quantity, 0);
  },
  subscribe(fn: Subscriber) {
    subs.push(fn);
    fn({ items: [...items], open });
    return () => {
      const i = subs.indexOf(fn);
      if (i >= 0) subs.splice(i, 1);
    };
  },
  addItem(m: MenuItemMinimal, qty = 1) {
    // treat uniqueness by id + restaurantId to allow same menu id across restaurants
  // debug omitted in production
    const found = items.find((i) => i.id === m.id && i.restaurantId === m.restaurantId);
    if (found) found.quantity += qty;
    else items.push({ ...m, quantity: qty });
    // do not auto-open cart; leave visibility unchanged
    writeStorage(items);
    notify();
  },
  updateQuantity(id: string, qty: number) {
    items = items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)).filter(i => i.quantity > 0);
    writeStorage(items);
    notify();
  },
  removeItem(id: string) {
    items = items.filter((i) => i.id !== id);
    writeStorage(items);
    notify();
  },
  clear() {
    items = [];
    writeStorage(items);
    notify();
  },
  toggleOpen() {
    open = !open;
    notify();
  },
  open() { open = true; notify(); },
  close() { open = false; notify(); },
};

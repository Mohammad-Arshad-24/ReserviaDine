import { ref, push, set, onValue, get, update } from "firebase/database";
import { canonicalRestaurantId } from './firebase';
import { db } from './firebase';
import { remove } from "firebase/database";
import { db } from "./firebase";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurantId: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  customerLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  paymentMethod: string;
  estimatedDeliveryTime?: number;
  clientSessionId?: string;
}

// Create a new order
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ordersRef = ref(db, 'orders');
  const newOrderRef = push(ordersRef);
  
  const order: Order = {
    ...orderData,
    id: newOrderRef.key!,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await set(newOrderRef, order);
  return order.id;
}

// Subscribe to orders for a specific restaurant
export function subscribeOrdersForRestaurant(restaurantId: string, callback: (orders: Order[]) => void) {
  const ordersRef = ref(db, 'orders');
  return onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const target = canonicalRestaurantId((restaurantId || '').toString());
    const orders = Object.entries(data)
      .map(([key, order]: any) => ({ id: order?.id || key, ...(order || {}) }))
      .filter((order: any) => {
        const byId = canonicalRestaurantId((order.restaurantId || '').toString()) === target;
        const byName = canonicalRestaurantId((order.restaurantName || '').toString()) === target;
        return byId || byName;
      })
      .map((order: any) => ({ ...order })) as Order[];
    
    callback(orders);
  });
}

// Subscribe to all orders
export function subscribeOrders(callback: (orders: Order[]) => void) {
  const ordersRef = ref(db, 'orders');
  return onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    
    const orders = Object.values(data) as Order[];
    callback(orders);
  });
}

// Subscribe to orders for a specific customer id
export function subscribeOrdersForCustomer(customerId: string, callback: (orders: Order[]) => void) {
  const ordersRef = ref(db, 'orders');
  return onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    const list = Object.entries(data)
      .map(([key, v]: any) => ({ id: v?.id || key, ...(v || {}) }))
      .filter((o: any) => (o.customerId || '') === customerId) as Order[];
    callback(list);
  });
}

// Subscribe to a single order by id
export function subscribeOrderById(orderId: string, callback: (order: Order | null) => void) {
  const orderRef = ref(db, `orders/${orderId}`);
  return onValue(orderRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback(null); return; }
    callback(data as Order);
  });
}

// Update order status
export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const orderRef = ref(db, `orders/${orderId}`);
  await update(orderRef, { status, updatedAt: Date.now() });
}

// Get order by ID
export async function getOrder(orderId: string): Promise<Order | null> {
  const orderRef = ref(db, `orders/${orderId}`);
  const snapshot = await get(orderRef);
  return snapshot.val();
}

// Update customer location for an order
export async function updateOrderCustomerLocation(orderId: string, location: { lat: number; lng: number; address?: string }): Promise<void> {
  const orderRef = ref(db, `orders/${orderId}`);
  await update(orderRef, { customerLocation: location, updatedAt: Date.now() });
}

// Ensure core order context exists; if fields are missing, write them without overwriting existing ones
export async function upsertOrderContext(orderId: string, context: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const orderRef = ref(db, `orders/${orderId}`);
  const snap = await get(orderRef);
  const existing = snap.val() || {};
  const payload: any = {};
  if (!existing.restaurantId && context.restaurantId) payload.restaurantId = canonicalRestaurantId(String(context.restaurantId));
  if (!existing.restaurantName && context.restaurantName) payload.restaurantName = context.restaurantName;
  if (!existing.items && context.items) payload.items = context.items;
  if (!existing.totalAmount && typeof context.totalAmount === 'number') payload.totalAmount = context.totalAmount;
  if (!existing.status && context.status) payload.status = context.status;
  if (!existing.paymentMethod && context.paymentMethod) payload.paymentMethod = context.paymentMethod;
  if (!existing.customerId && context.customerId) payload.customerId = context.customerId;
  if (!existing.customerEmail && context.customerEmail) payload.customerEmail = context.customerEmail;
  if (!existing.customerName && context.customerName) payload.customerName = context.customerName;
  if (!existing.customerPhone && context.customerPhone) payload.customerPhone = context.customerPhone;
  if (!existing.clientSessionId && context.clientSessionId) payload.clientSessionId = context.clientSessionId;
  if (Object.keys(payload).length) {
    payload.updatedAt = Date.now();
    await update(orderRef, payload);
  }
}

// Delete an order by id
export async function deleteOrder(orderId: string): Promise<void> {
  const orderRef = ref(db, `orders/${orderId}`);
  await remove(orderRef);
}

// Update customer phone number
export async function updateOrderCustomerPhone(orderId: string, phone: string): Promise<void> {
  const orderRef = ref(db, `orders/${orderId}`);
  await update(orderRef, { customerPhone: phone, updatedAt: Date.now() });
}





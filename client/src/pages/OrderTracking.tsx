import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getOrder } from '@/lib/orders';

export default function OrderTracking() {
	const [order, setOrder] = useState<any>(null);
	const [location] = useLocation();
	useEffect(() => {
		const id = (location.match(/\/order-tracking\/(.+)$/) || [])[1];
		(async () => {
			if (!id) return;
			try { const o = await getOrder(id); setOrder(o); } catch (e) {}
		})();
	}, [location]);

	if (!order) return <div className="p-4">Loading order...</div>;

	return (
		<div className="p-4 max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Order Tracking</h1>
			<div className="p-4 border rounded bg-white">
				<div className="mb-2">Order ID: <strong>{order.id}</strong></div>
				<div className="mb-2">Restaurant: {order.restaurantName}</div>
				<div className="mb-2 text-black">Status: {order.status}</div>
				<div className="mb-2">Items:</div>
				<div className="space-y-1 mb-3">
					{(order.items || []).map((it: any, idx: number) => (
						<div key={idx} className="flex justify-between text-sm">
							<span>{it.name} x{it.quantity}</span>
							<span>₹{(it.price || 0) * (it.quantity || 0)}</span>
						</div>
					))}
				</div>
				<div className="mb-2">Total: ₹{order.totalAmount}</div>
				{order.customerLocation ? (
					<div className="text-sm text-gray-600">Location: {order.customerLocation.lat}, {order.customerLocation.lng}</div>
				) : (
					<div className="text-sm text-gray-600">No location available for this customer yet.</div>
				)}
			</div>
		</div>
	);
}





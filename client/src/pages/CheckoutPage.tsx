import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Lock, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createOrder, updateOrderCustomerLocation } from "@/lib/orders";
import { getLocalRestaurantName, canonicalRestaurantId } from "@/lib/firebase";

export default function CheckoutPage() {
	const [orderData, setOrderData] = useState<any>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [paymentData, setPaymentData] = useState({ cardNumber: "", cardName: "", expiry: "", cvv: "" });
	const [method, setMethod] = useState<'card' | 'upi'>('card');
	const [authChecked, setAuthChecked] = useState(false);

	useEffect(() => {
		try {
			// Block checkout if not authenticated
			const cu = (window as any).__CURRENT_USER__;
			if (!cu || !cu.uid) {
				try { localStorage.setItem('forceAuth', '1'); } catch (e) {}
				window.location.href = '/#/'
				return;
			}
			setAuthChecked(true);
			const data = localStorage.getItem("currentOrder");
			if (data) setOrderData(JSON.parse(data));
			else window.location.href = "/";
		} catch (e) {
			window.location.href = "/";
		}
	}, []);

	async function handlePayment(e: React.FormEvent) {
		e.preventDefault();
		setIsProcessing(true);
		// simulate processing
		await new Promise((r) => setTimeout(r, 1200));

		const cu = (window as any).__CURRENT_USER__;
		if (!cu || !cu.uid) {
			try { localStorage.setItem('forceAuth', '1'); } catch (e) {}
			setIsProcessing(false);
			window.location.href = '/#/'
			return;
		}
		const baseOrder = {
			customerId: cu.uid,
			customerName: cu.displayName || cu.email || 'Customer',
			customerEmail: cu.email || '',
			restaurantId: '',
			restaurantName: '',
			items: (orderData?.items || []).map((it: any) => ({ id: it.id, name: it.name, price: it.price, quantity: it.quantity, image: it.image, restaurantId: '' })),
			totalAmount: Number(orderData?.depositAmount || 0) + Number(orderData?.remainingAmount || 0) || (orderData?.subtotal || 0),
			status: 'confirmed' as const,
			paymentMethod: method,
			estimatedDeliveryTime: 30
		};

		// normalize restaurant id/name
		try {
			const rawId = orderData?.restaurant?.id || orderData?.restaurantId || '';
			const friendly = await getLocalRestaurantName(rawId || (orderData?.restaurant?.name || orderData?.restaurantName || ''));
			(baseOrder as any).restaurantName = friendly || 'Selected Restaurant';
			(baseOrder as any).restaurantId = canonicalRestaurantId(friendly || rawId || '');
			(baseOrder as any).items = (baseOrder.items || []).map((it: any) => ({ ...it, restaurantId: (baseOrder as any).restaurantId }));
		} catch (e) {}

		async function finalizeAndRedirect(loc?: { lat: number; lng: number }) {
			try {
				const createdId = await createOrder({ ...baseOrder, customerLocation: loc } as any);
				if (loc && createdId) {
					await updateOrderCustomerLocation(createdId, loc);
				}
			} catch (e) {}
			try { localStorage.removeItem('currentOrder'); } catch (e) {}
			window.location.href = `/order-tracking/${createdId}`;
		}

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => finalizeAndRedirect({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
				() => finalizeAndRedirect()
			);
		} else {
			await finalizeAndRedirect();
		}
	}

	if (!orderData) return <div>Loading...</div>;

	return (
		<div className="min-h-screen pb-8">
			<header className="bg-card border-b sticky top-0 z-50 backdrop-blur-lg bg-card/80">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<Button variant="ghost" size="icon" onClick={() => window.history.back()}>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<h1 className="text-lg font-semibold">Checkout</h1>
					</div>
				</div>
			</header>

			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div>
						<h2 className="text-2xl font-bold mb-6">Order Summary</h2>
						<Card className="mb-6">
							<CardHeader>
								<div className="flex items-center gap-4">
									<img src={orderData.restaurant?.image} alt={orderData.restaurant?.name} className="w-16 h-16 rounded-lg object-cover" />
									<div>
										<CardTitle>{orderData.restaurant?.name}</CardTitle>
										<CardDescription className="flex items-center gap-3 mt-1">
											<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{orderData.restaurant?.distance}</span>
											<span className="flex items-center gap-1"><Clock className="h-3 w-3" />{orderData.restaurant?.prepTime}</span>
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{(orderData.items || []).map((item: any) => (
										<div key={item.id} className="flex justify-between text-sm">
											<span className="text-muted-foreground">{item.quantity}x {item.name}</span>
											<span className="font-semibold">₹{(item.price * item.quantity)}</span>
										</div>
									))}
									<Separator />
									<div className="flex justify-between">
										<span className="font-semibold">Subtotal</span>
										<span className="font-bold">₹{orderData.subtotal}</span>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-2 border-primary/50">
							<CardHeader>
								<CardTitle className="text-lg">Payment Breakdown</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
									<div>
										<p className="font-semibold">Pay Now (Deposit)</p>
										<p className="text-xs text-muted-foreground">Confirms your order</p>
									</div>
									<Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">₹{orderData.depositAmount}</Badge>
								</div>
								<div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
									<div>
										<p className="font-semibold">Pay at Pickup</p>
										<p className="text-xs text-muted-foreground">When you arrive</p>
									</div>
									<span className="text-lg font-bold">₹{orderData.remainingAmount}</span>
								</div>
							</CardContent>
						</Card>
					</div>

		<div>
						<h2 className="text-2xl font-bold mb-6">Payment Details</h2>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Card Information</CardTitle>
								<CardDescription>Enter your payment details</CardDescription>
							</CardHeader>
							<form onSubmit={handlePayment}>
								<CardContent className="space-y-4">
									<div className="flex gap-3 text-sm">
										<label className={`px-3 py-2 rounded border ${method==='card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
											<input type="radio" name="method" className="mr-2" checked={method==='card'} onChange={() => setMethod('card')} />Card
										</label>
										<label className={`px-3 py-2 rounded border ${method==='upi' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
											<input type="radio" name="method" className="mr-2" checked={method==='upi'} onChange={() => setMethod('upi')} />UPI
										</label>
									</div>
									<div className="space-y-2">
										<Label htmlFor="cardNumber">Card Number</Label>
										<Input id="cardNumber" placeholder="1234 5678 9012 3456" value={paymentData.cardNumber} onChange={(e) => setPaymentData((p) => ({ ...p, cardNumber: e.target.value }))} required maxLength={19} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="cardName">Cardholder Name</Label>
										<Input id="cardName" placeholder="JOHN DOE" value={paymentData.cardName} onChange={(e) => setPaymentData((p) => ({ ...p, cardName: e.target.value.toUpperCase() }))} required />
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="expiry">Expiry Date</Label>
											<Input id="expiry" placeholder="MM/YY" value={paymentData.expiry} onChange={(e) => setPaymentData((p) => ({ ...p, expiry: e.target.value }))} required maxLength={5} />
										</div>
										<div className="space-y-2">
											<Label htmlFor="cvv">CVV</Label>
											<Input id="cvv" placeholder="123" type="password" value={paymentData.cvv} onChange={(e) => setPaymentData((p) => ({ ...p, cvv: e.target.value }))} required maxLength={3} />
										</div>
									</div>
									<div className="bg-muted/30 p-4 rounded-lg flex items-start gap-3 mt-6">
										<Lock className="h-5 w-5 text-green-600 mt-0.5" />
										<div className="text-sm">
											<p className="font-semibold mb-1">Secure Payment</p>
											<p className="text-muted-foreground">Your payment information is encrypted and secure</p>
										</div>
									</div>
									<Button type="submit" className="w-full h-12 text-lg font-semibold mt-6" disabled={isProcessing}>{isProcessing ? 'Processing Payment...' : `Pay ₹${orderData.depositAmount} Now`}</Button>
									<p className="text-xs text-center text-muted-foreground mt-4">By confirming payment, you agree to location tracking for order preparation timing</p>
								</CardContent>
							</form>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

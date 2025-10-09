import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CreditCard, Smartphone, Wallet } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentSuccess: (paymentMethod: string) => void;
}

export function PaymentModal({ isOpen, onClose, totalAmount, onPaymentSuccess }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [useStripe, setUseStripe] = useState(false);

  const paymentMethods = [
    { id: "card", name: "Credit/Debit Card", icon: CreditCard },
    { id: "upi", name: "UPI Payment", icon: Smartphone },
    { id: "wallet", name: "Digital Wallet", icon: Wallet },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      if (useStripe) {
        // basic Stripe checkout: request session then redirect
        const resp = await fetch('/api/payments/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] })
        });
        const data = await resp.json();
        if (data?.url) {
          window.location.href = data.url;
          return; // redirecting
        }
      } else {
        // Simulated local payment
        await new Promise(resolve => setTimeout(resolve, 1200));
        onPaymentSuccess(selectedMethod);
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 text-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Payment</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Amount</span>
              <span className="text-2xl font-bold text-green-700">₹{totalAmount}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Select Payment Method</h3>
          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    selectedMethod === method.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{method.name}</span>
                </button>
              );
            })}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={useStripe} onChange={(e) => setUseStripe(e.target.checked)} />
            Use Stripe test checkout (requires server key)
          </label>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? "Processing..." : `Pay ₹${totalAmount}`}
          </Button>
        </div>

        {isProcessing && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <p className="text-sm text-gray-600 mt-2">Processing your payment...</p>
          </div>
        )}
      </div>
          <div className="mt-3 space-y-2 text-xs text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useStripe} onChange={(e) => setUseStripe(e.target.checked)} />
              Use Stripe test checkout
            </label>
          </div>
    </div>
  );
}



import { ThemeProvider } from "../ThemeProvider";
import { OrderStatus } from "../OrderStatus";

export default function OrderStatusExample() {
  return (
    <ThemeProvider>
      <div className="bg-background p-8">
        <div className="max-w-md mx-auto space-y-8">
          <OrderStatus status="preparing" estimatedTime={15} orderId="#12345" />
        </div>
      </div>
    </ThemeProvider>
  );
}

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderStatusType = "confirmed" | "preparing" | "ready";

interface OrderStatusProps {
  status: OrderStatusType;
  estimatedTime?: number;
  orderId?: string;
}

const statusSteps = [
  { key: "confirmed", label: "Payment Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing Order", icon: Clock },
  { key: "ready", label: "Ready for Pickup", icon: CheckCircle2 },
];

export function OrderStatus({ status, estimatedTime = 20, orderId = "#12345" }: OrderStatusProps) {
  const currentStepIndex = statusSteps.findIndex((step) => step.key === status);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-[var(--font-accent)]">Order Status</CardTitle>
          <Badge variant="secondary" data-testid="badge-order-id">
            {orderId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="relative">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`status-icon-${step.key}`}
                  >
                    {isCompleted ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`absolute left-1/2 top-10 w-0.5 h-6 -translate-x-1/2 ${
                        index < currentStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <div className="font-semibold" data-testid={`status-label-${step.key}`}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {step.key === "preparing" && `Estimated time: ${estimatedTime} min`}
                      {step.key === "ready" && "Your order is ready!"}
                      {step.key === "confirmed" && "We've received your order"}
                    </div>
                  )}
                </div>
                {isCurrent && (
                  <Badge className="mt-2" data-testid="badge-current-status">
                    Current
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

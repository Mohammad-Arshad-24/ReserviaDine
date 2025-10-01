import { ShoppingBag, MapPin, PackageCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: ShoppingBag,
    title: "Order & Pay Deposit",
    description: "Browse the menu, select your dishes, and pay a small advance to confirm your order.",
  },
  {
    icon: MapPin,
    title: "We Track Your Location",
    description: "As you head to the restaurant, we monitor your location to time your order perfectly.",
  },
  {
    icon: PackageCheck,
    title: "Pick Up Instantly",
    description: "Arrive and your meal is ready! Pay the balance and enjoy your food immediately.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-[var(--font-accent)]">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to skip the wait and get your food faster
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="p-8 hover-elevate transition-all duration-300"
                data-testid={`card-step-${index + 1}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-sm font-semibold text-primary mb-2">
                    Step {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 font-[var(--font-accent)]">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

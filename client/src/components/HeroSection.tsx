import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@assets/generated_images/Hero_image_restaurant_pickup_f64616dd.png";

interface HeroSectionProps {
  onGetStarted?: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative w-full h-[500px] sm:h-[600px] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Fresh restaurant meal pickup"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 font-[var(--font-accent)]">
            Skip the Wait,
            <br />
            <span className="gradient-text">Pre-Order & Go</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-xl">
            Pay a small advance, and we'll have your order ready the moment you arrive. 
            No more waiting in line.
          </p>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="text-base hover-elevate active-elevate-2"
            data-testid="button-get-started"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

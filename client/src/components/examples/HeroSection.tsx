import { ThemeProvider } from "../ThemeProvider";
import { HeroSection } from "../HeroSection";

export default function HeroSectionExample() {
  return (
    <ThemeProvider>
      <div className="bg-background">
        <HeroSection onGetStarted={() => console.log("Get started clicked")} />
      </div>
    </ThemeProvider>
  );
}

import { ThemeProvider } from "../ThemeProvider";
import { HowItWorks } from "../HowItWorks";

export default function HowItWorksExample() {
  return (
    <ThemeProvider>
      <div className="bg-background">
        <HowItWorks />
      </div>
    </ThemeProvider>
  );
}

import { ThemeProvider } from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="p-8 bg-background">
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

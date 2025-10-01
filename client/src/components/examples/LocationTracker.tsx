import { ThemeProvider } from "../ThemeProvider";
import { LocationTracker } from "../LocationTracker";

export default function LocationTrackerExample() {
  return (
    <ThemeProvider>
      <div className="bg-background p-8">
        <div className="max-w-md mx-auto">
          <LocationTracker
            onArrival={() => console.log("Customer arrived!")}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

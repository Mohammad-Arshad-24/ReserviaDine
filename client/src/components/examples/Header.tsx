import { ThemeProvider } from "../ThemeProvider";
import { Header } from "../Header";

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Header
          cartItemCount={3}
          onCartClick={() => console.log("Cart clicked")}
          onAuthClick={() => console.log("Auth clicked")}
          isAuthenticated={false}
        />
      </div>
    </ThemeProvider>
  );
}

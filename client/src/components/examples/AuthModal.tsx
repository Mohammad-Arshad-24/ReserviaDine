import { useState } from "react";
import { ThemeProvider } from "../ThemeProvider";
import { AuthModal } from "../AuthModal";
import { Button } from "@/components/ui/button";

export default function AuthModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <ThemeProvider>
      <div className="bg-background p-8 min-h-screen">
        <Button onClick={() => setIsOpen(true)}>Open Auth Modal</Button>
        <AuthModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onLogin={(email, password) => console.log("Login:", email, password)}
          onSignup={(email, password, name) => console.log("Signup:", email, password, name)}
        />
      </div>
    </ThemeProvider>
  );
}

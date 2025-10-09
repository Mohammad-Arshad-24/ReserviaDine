import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (email: string, password: string) => void;
  onSignup?: (email: string, password: string, name: string, role: "customer" | "business") => void;
  onGoogleLogin?: (role: "customer" | "business") => void;
  onGoogleSignup?: (role: "customer" | "business") => void;
  currentUser?: any;
  onSignOut?: () => void;
  ownedRestaurants?: { id: string; name: string }[];
  authError?: string | null;
}

export function AuthModal({ isOpen, onClose, onLogin, onSignup, onGoogleLogin, onGoogleSignup, currentUser, onSignOut, ownedRestaurants, authError }: AuthModalProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [role, setRole] = useState<"customer" | "business">("customer");

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin?.(loginEmail, loginPassword);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    onSignup?.(signupEmail, signupPassword, signupName, role);
  };

  const handleGoogleLogin = () => {
    onGoogleLogin?.(role);
  };

  const handleGoogleSignup = () => {
    onGoogleSignup?.(role);
  };

  // signOut helper invoked from modal UI
  const handleSignOutClick = () => {
    onSignOut?.();
    onClose();
  };

  // Update styles for role selection buttons
  const roleButtonStyle = "text-black"; // Set font color to black

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="overlay-auth"
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
            data-testid="button-close-auth"
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader>
            <CardTitle className="text-2xl font-[var(--font-accent)]">Welcome to Reservia Dine</CardTitle>
            <CardDescription>Login or create an account to get started</CardDescription>
          </CardHeader>
          {/* show authentication errors from parent */}
          {(authError) ? (
            <div className="px-4">
              <div className="text-sm text-red-600 mb-2">{authError}</div>
            </div>
          ) : null}
          <CardContent>
            {currentUser ? (
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
                  ) : null}
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{currentUser.displayName || currentUser.email}</div>
                    <div className="text-sm text-muted-foreground">{currentUser.email}</div>
                    {/* Owned restaurants links will be injected by parent via ownedRestaurants prop */}
                  </div>
                  <div>
                    <Button variant="ghost" onClick={() => { onSignOut?.(); onClose(); }} data-testid="button-signout">
                      Sign out
                    </Button>
                  </div>
                </div>
                {/* Owned restaurants list (if provided) */}
                {ownedRestaurants && ownedRestaurants.length ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium">My Restaurants</div>
                    <ul className="mt-2 space-y-1">
                      {ownedRestaurants.map((r) => (
                        <li key={r.id}>
                          <a className="text-sm underline" href={`/restaurant/${encodeURIComponent(r.name)}`}>{r.name}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md border ${role === "customer" ? "bg-primary text-white" : "bg-white"} ${roleButtonStyle}`}
                    onClick={() => setRole("customer")}
                    data-testid="role-customer"
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md border ${role === "business" ? "bg-primary text-white" : "bg-white"} ${roleButtonStyle}`}
                    onClick={() => setRole("business")}
                    data-testid="role-business"
                  >
                    Business
                  </button>
                </div>

                <Tabs defaultValue="login">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                    <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        data-testid="button-google-login"
                      >
                        Sign in with Google ({role === "customer" ? "Customer" : "Business"})
                      </Button>

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="your@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            data-testid="input-login-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            data-testid="input-login-password"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full hover-elevate active-elevate-2"
                          data-testid="button-login-submit"
                        >
                          Login
                        </Button>
                      </form>
                    </div>
                  </TabsContent>

                  <TabsContent value="signup">
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignup}
                        data-testid="button-google-signup"
                      >
                        Sign up with Google ({role === "customer" ? "Customer" : "Business"})
                      </Button>

                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Full Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            required
                            data-testid="input-signup-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="your@email.com"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            required
                            data-testid="input-signup-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                            data-testid="input-signup-password"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full hover-elevate active-elevate-2"
                          data-testid="button-signup-submit"
                        >
                          Create Account
                        </Button>
                      </form>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

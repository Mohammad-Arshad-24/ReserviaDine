import { User, Moon, Sun, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./ThemeProvider";

interface AccountsDropdownProps {
  currentUser?: any;
  onSignOut?: () => void;
  onAuthClick?: () => void;
  isAuthenticated?: boolean;
}

export function AccountsDropdown({
  currentUser,
  onSignOut,
  onAuthClick,
  isAuthenticated = false,
}: AccountsDropdownProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover-elevate active-elevate-2"
          data-testid="button-accounts"
        >
          {isAuthenticated && currentUser?.email ? (
            <div 
              className="h-5 w-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold" 
              title={currentUser.email}
            >
              {(currentUser.email || '').charAt(0).toUpperCase()}
            </div>
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="sr-only">Account menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated && currentUser ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {currentUser.displayName || currentUser.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser.email}
                </p>
                {currentUser.role === 'business' && (
                  <p className="text-xs leading-none text-amber-600 font-medium">
                    Business Account
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              <span>Switch to {theme === "light" ? "dark" : "light"} mode</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              <span>Switch to {theme === "light" ? "dark" : "light"} mode</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAuthClick}>
              <User className="mr-2 h-4 w-4" />
              <span>Sign in</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

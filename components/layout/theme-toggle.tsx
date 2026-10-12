"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  variant?: "icon" | "dropdown" | "compact";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-full text-muted-foreground ${className}`}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  // Single click toggle for mobile / compact headers
  if (variant === "icon" || variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors ${className}`}
        title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700 transition-transform rotate-0 scale-100" />
        )}
      </Button>
    );
  }

  // Dropdown variant with System option
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer ${className}`}
        aria-label="Theme menu"
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-sky-400" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="text-xs cursor-pointer flex items-center gap-2"
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="text-xs cursor-pointer flex items-center gap-2"
        >
          <Moon className="h-3.5 w-3.5 text-sky-400" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="text-xs cursor-pointer flex items-center gap-2"
        >
          <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

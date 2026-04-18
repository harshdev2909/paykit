"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="relative"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {!mounted ? (
        <span className="size-4" aria-hidden />
      ) : (
        <>
          <Sun
            className={`size-4 ${isDark ? "absolute scale-0 opacity-0" : "scale-100 opacity-100"}`}
            aria-hidden
          />
          <Moon
            className={`size-4 ${isDark ? "scale-100 opacity-100" : "absolute scale-0 opacity-0"}`}
            aria-hidden
          />
        </>
      )}
    </Button>
  );
}

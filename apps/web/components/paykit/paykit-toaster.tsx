"use client";

import * as React from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

/** Bottom-right toasts, 4s, semantic left strip via classNames */
export function PayKitToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      theme={mounted && resolvedTheme === "light" ? "light" : "dark"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-[var(--paykit-border)] bg-card text-foreground shadow-lg [transition-timing-function:var(--ease-paykit)]",
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
          success: "border-l-4 border-l-[var(--paykit-semantic-settled)]",
          error: "border-l-4 border-l-[var(--paykit-semantic-failed)]",
          warning: "border-l-4 border-l-[var(--paykit-semantic-pending)]",
          info: "border-l-4 border-l-[var(--paykit-accent)]",
        },
      }}
      closeButton
    />
  );
}

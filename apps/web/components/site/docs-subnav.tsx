"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/docs/quickstart", label: "Quickstart", match: (p: string) => p.startsWith("/docs/quickstart") },
  { href: "/docs", label: "HTTP API", match: (p: string) => p === "/docs" },
  { href: "/docs/sdk", label: "JavaScript SDK", match: (p: string) => p.startsWith("/docs/sdk") },
];

export function DocsSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Documentation sections">
      {links.map(({ href, label, match }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium [transition-duration:var(--duration-standard)] [transition-timing-function:var(--ease-paykit)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paykit-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            match(pathname) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

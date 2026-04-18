"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import * as React from "react";

type NavItem = { href: string; label: string };

const packageItems: NavItem[] = [
  { href: "/docs/packages", label: "All packages" },
  { href: "/docs/packages/x402-middleware", label: "@h4rsharma/paykit-x402-middleware" },
  { href: "/docs/packages/agent-wallet", label: "@h4rsharma/paykit-agent-wallet-sdk" },
  { href: "/docs/packages/receipts", label: "@h4rsharma/paykit-receipts" },
].sort((a, b) => a.label.localeCompare(b.label));

const restItems: NavItem[] = [
  { href: "/docs/rest/authentication", label: "Authentication" },
  { href: "/docs/rest/events", label: "Events (SSE)" },
  { href: "/docs/rest/receipts", label: "Receipts" },
  { href: "/docs/rest/wallets", label: "Wallets" },
  { href: "/docs/rest/webhooks", label: "Webhooks" },
  { href: "/docs/rest/x402", label: "x402" },
].sort((a, b) => a.label.localeCompare(b.label));

const referenceItems: NavItem[] = [
  { href: "/docs/reference/changelog", label: "Changelog" },
  { href: "/docs/reference/error-codes", label: "Error codes" },
  { href: "/docs/reference/signed-receipts", label: "Signed receipts" },
  { href: "/docs/reference/spending-policies", label: "Spending policies" },
].sort((a, b) => a.label.localeCompare(b.label));

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Get started",
    items: [
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/what-is-x402", label: "What is x402?" },
    ],
  },
  {
    label: "Packages",
    items: packageItems,
  },
  {
    label: "REST API",
    items: restItems,
  },
  {
    label: "Reference",
    items: referenceItems,
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 px-3 py-4" aria-label="Documentation">
      <Link
        href="/docs"
        onClick={onNavigate}
        className={cn(
          "block rounded-md px-2 py-1.5 text-sm font-medium",
          pathname === "/docs" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        )}
      >
        Overview
      </Link>
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {g.label}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm leading-snug transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--paykit-border)] px-4 py-3 lg:hidden">
        <span className="text-sm font-medium">Docs menu</span>
        <button
          type="button"
          className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="docs-sidebar-drawer"
        >
          <Menu className="size-5" />
          <span className="sr-only">Open docs navigation</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="docs-sidebar-drawer"
            className="absolute bottom-0 left-0 top-0 w-[min(100%,280px)] overflow-y-auto border-r border-border bg-background shadow-lg"
          >
            <div className="flex items-center justify-end border-b border-border p-2">
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden w-[220px] shrink-0 border-r border-[var(--paykit-border)] bg-muted/20 lg:block">
        <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}

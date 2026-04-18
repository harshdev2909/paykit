"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Key, BookOpen, LayoutDashboard } from "lucide-react";

const nav = [
  { href: "/developers", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/api-keys", label: "API keys", icon: Key },
  { href: "/developers/docs", label: "Docs", icon: BookOpen },
];

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="flex h-14 items-center justify-between px-4 md:px-8">
          <Link href="/" className="font-semibold">
            PayKit
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Merchant Dashboard
          </Link>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

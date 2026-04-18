"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/paykit/theme-toggle";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="text-foreground underline-offset-4 hover:underline" href="/docs">
                  Docs
                </Link>
              </li>
              <li>
                <Link className="text-foreground underline-offset-4 hover:underline" href="/demo">
                  Demo
                </Link>
              </li>
              <li>
                <Link className="text-foreground underline-offset-4 hover:underline" href="/dashboard">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link className="text-foreground underline-offset-4 hover:underline" href="/docs/reference/changelog">
                  Status
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resources</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  className="text-foreground underline-offset-4 hover:underline"
                  href="https://github.com/harshdev2909/paykit"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  className="text-foreground underline-offset-4 hover:underline"
                  href="https://www.npmjs.com/search?q=%40h4rsharma"
                  target="_blank"
                  rel="noreferrer"
                >
                  npm
                </a>
              </li>
              <li>
                <Link className="text-foreground underline-offset-4 hover:underline" href="/docs/reference/changelog">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Community</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a className="text-foreground underline-offset-4 hover:underline" href="https://discord.gg/stellar" target="_blank" rel="noreferrer">
                  Discord
                </a>
              </li>
              <li>
                <a className="text-foreground underline-offset-4 hover:underline" href="https://x.com/PayKit_official" target="_blank" rel="noreferrer">
                  X
                </a>
              </li>
              <li>
                <a className="text-foreground underline-offset-4 hover:underline" href="mailto:harshsharmaa990@gmail.com">
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">Built on Stellar</p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}

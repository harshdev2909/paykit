import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";

export const metadata: Metadata = {
  title: "Packages · PayKit",
  description: "npm packages for x402 middleware, agent wallets, and receipt verification.",
};

export default function PackagesIndexPage() {
  const pkgs = [
    {
      href: "/docs/packages/x402-middleware",
      name: "@h4rsharma/paykit-x402-middleware",
      desc: "Express-compatible paywall middleware for HTTP 402 flows.",
    },
    {
      href: "/docs/packages/agent-wallet",
      name: "@h4rsharma/paykit-agent-wallet-sdk",
      desc: "Create custodial agent wallets and attach payments to outbound fetch.",
    },
    {
      href: "/docs/packages/receipts",
      name: "@h4rsharma/paykit-receipts",
      desc: "Verify signed receipts (JWS) from settle and dashboard exports.",
    },
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Packages</h1>
        <p className="mt-2 text-muted-foreground">
          Aggregator <code className="font-mono text-xs">@h4rsharma/paykit-sdk</code> re-exports these packages if you prefer one
          dependency.
        </p>
      </div>
      <ul className="space-y-3">
        {pkgs.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="block rounded-lg border border-[var(--paykit-border)] bg-card px-4 py-3 transition-colors hover:border-[var(--paykit-accent)]/40"
            >
              <p className="font-mono text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
      <DocsPageFooter docsPathSegment="packages" />
    </div>
  );
}

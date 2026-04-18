import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";

export const metadata: Metadata = {
  title: "Changelog · PayKit docs",
  description: "Documentation and API surface changes.",
};

export default function DocsReferenceChangelogPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          High-level history of PayKit docs and public HTTP routes. For semantic versioning of npm packages, see each package&apos;s registry page.
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">2026-04 — Docs</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Split SDK overview into package pages under <code className="font-mono text-xs">/docs/packages</code>.</li>
            <li>Added REST reference for <code className="font-mono text-xs">/v1/wallets</code>, <code className="font-mono text-xs">/v1/x402</code>,{" "}
              <code className="font-mono text-xs">/v1/receipts</code>, <code className="font-mono text-xs">/v1/webhooks</code>, and SSE <code className="font-mono text-xs">/events/stream</code>.</li>
            <li>Quickstart with Node, Next.js, and Python tabs; searchable docs (⌘K).</li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">Earlier</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Interactive demo route with Turnstile-gated prompts and live transaction log.</li>
            <li>x402 verify/settle routes and Postgres-backed receipts.</li>
          </ul>
        </div>
      </section>

      <DocsPageFooter docsPathSegment="reference/changelog" />
    </article>
  );
}

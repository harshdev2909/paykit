import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";

export const metadata: Metadata = {
  title: "Error codes · PayKit API",
  description: "HTTP status and JSON error shapes for the REST API.",
};

export default function DocsReferenceErrorCodesPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Error codes</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          PayKit uses conventional HTTP status codes. Error bodies are JSON with an <code className="font-mono text-xs">error</code> field (string or
          validation details).
        </p>
      </header>

      <section>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/80">
              <td className="py-2 pr-4 font-mono text-xs">400</td>
              <td className="py-2">Malformed JSON, missing required fields, or invalid query parameters (often Zod flatten in <code className="font-mono text-xs">error</code>).</td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="py-2 pr-4 font-mono text-xs">401</td>
              <td className="py-2">Missing API key, invalid key, or wrong <code className="font-mono text-xs">Authorization</code> format.</td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="py-2 pr-4 font-mono text-xs">404</td>
              <td className="py-2">Wallet or receipt not found for the authenticated merchant; webhook subscription missing; replay with no receipts.</td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="py-2 pr-4 font-mono text-xs">429</td>
              <td className="py-2">Rate limited (global API limiter). Retry with backoff.</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono text-xs">500</td>
              <td className="py-2">Unexpected failure — <code className="font-mono text-xs">{`{ "error": "message" }`}</code>. Contact support if persistent.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">CORS preflight</h2>
        <p className="text-sm text-muted-foreground">
          If the browser reports a network error on POST, verify your origin is allow-listed and that preflight receives{" "}
          <code className="font-mono text-xs">204</code>/<code className="font-mono text-xs">200</code> with the expected headers.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="reference/error-codes" />
    </article>
  );
}

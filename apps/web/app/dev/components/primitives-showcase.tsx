"use client";

import * as React from "react";
import { Inbox, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  AddressPill,
  AmountDisplay,
  CodeBlock,
  EmptyState,
  LiveX402FlowStrip,
  PolicyChip,
  ReceiptCard,
  StatusBadge,
  TerminalBlock,
} from "@/components/paykit";
import { Button } from "@/components/ui/button";

const TAB_SAMPLES = [
  {
    id: "node",
    label: "Node",
    language: "typescript",
    code: `import { paywall } from "@paykit/x402-middleware";\n\napp.use("/api/", paywall({ amount: "0.01", asset: "USDC" }));`,
  },
  {
    id: "next",
    label: "Next.js",
    language: "typescript",
    code: `// app/api/forecast/route.ts\nexport const POST = paywallHandler({ path: "/api/forecast" });`,
  },
  {
    id: "python",
    label: "Python",
    language: "python",
    code: `# FastAPI — placeholder\n@app.middleware("http")\nasync def x402_middleware(request: Request, call_next):\n    ...`,
  },
];

export function PrimitivesShowcase() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-16 px-6 pb-24 pt-10 md:px-12">
      <header className="space-y-2 border-b border-[var(--paykit-border)] pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Phase A</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Design system & primitives</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          PayKit UI kit for x402 + Stellar. Electric violet accent, hairline borders, Geist Sans/Mono. Motion uses{" "}
          <code className="font-mono text-[12px] text-foreground">cubic-bezier(0.22, 1, 0.36, 1)</code> only.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="s-code">
        <h2 id="s-code" className="text-lg font-semibold tracking-tight">
          Code block
        </h2>
        <CodeBlock language="bash" code={`curl -i https://api.example.com/paid \\\n  -H "Authorization: Bearer pk_…"`} highlightedLines={[1]} />
        <CodeBlock tabs={TAB_SAMPLES} language="typescript" defaultTab="node" />
      </section>

      <section className="space-y-4" aria-labelledby="s-term">
        <h2 id="s-term" className="text-lg font-semibold tracking-tight">
          Terminal block
        </h2>
        <TerminalBlock
          lines={[
            "curl -sI https://api.example.com/paid",
            "curl -sI https://api.example.com/paid -H 'X-PAYMENT: …'",
          ]}
          typingAnimation
        />
      </section>

      <section className="space-y-4" aria-labelledby="s-flow">
        <h2 id="s-flow" className="text-lg font-semibold tracking-tight">
          Live x402 flow strip
        </h2>
        <LiveX402FlowStrip />
      </section>

      <section className="space-y-4" aria-labelledby="s-misc">
        <h2 id="s-misc" className="text-lg font-semibold tracking-tight">
          Address, amount, status, policy
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <AddressPill address="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" />
          <AmountDisplay value="0.02" asset="USDC" />
          <StatusBadge status="settled" />
          <StatusBadge status="pending" />
          <StatusBadge status="failed" />
        </div>
        <div className="flex flex-wrap gap-2">
          <PolicyChip>Daily cap: $10 USDC</PolicyChip>
          <PolicyChip>Domain: api.openweather.com</PolicyChip>
          <PolicyChip>Session expires in 42m</PolicyChip>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="s-receipt">
        <h2 id="s-receipt" className="text-lg font-semibold tracking-tight">
          Receipt card
        </h2>
        <ReceiptCard
          fromAddress="GB6HI6XJ5IRC5WXD7A2XK53YEE2UYFD2FE4TR46EKZQH5GUJBKOYEUVD"
          toAddress="GBAN7SR2J7IPNN6JETG3AAUQN3PAJ4NOMLOHIYIOLSTHIFFUCV4TSW55"
          amount="0.02"
          asset="USDC"
          domain="api.demo.paykit.dev"
          path="/weather"
          txHash="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234"
          status="settled"
          createdAt={new Date()}
          signedReceiptPreview="eyJhbGciOiJlUzI1NiJ9.eyJzdWIiOiJyZWNlaXB0In0…"
          onReplayWebhook={() => toast.message("Replay queued (demo)")}
        />
      </section>

      <section className="space-y-4" aria-labelledby="s-empty">
        <h2 id="s-empty" className="text-lg font-semibold tracking-tight">
          Empty state
        </h2>
        <EmptyState
          icon={Inbox}
          title="No receipts yet"
          description="Call a paywalled endpoint with a valid X-PAYMENT header. Receipts show up here in real time."
          action={
            <Button type="button" size="sm" className="font-mono text-xs">
              Open docs
            </Button>
          }
        />
      </section>

      <section className="space-y-4" aria-labelledby="s-toast">
        <h2 id="s-toast" className="text-lg font-semibold tracking-tight">
          Toast
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => toast.success("Settled on testnet")}>
            Success
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toast.error("Settlement failed")}>
            Error
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toast.warning("Retry scheduled")}>
            Warning
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-[var(--paykit-border)] p-6 text-center" aria-hidden>
        <Sparkles className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">End of Phase A component lab</p>
      </section>
    </div>
  );
}

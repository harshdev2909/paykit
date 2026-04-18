"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const flowSteps = [
  {
    title: "Agent sends request",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
        <code>{`GET https://api.example.com/weather?city=mumbai`}</code>
      </pre>
    ),
  },
  {
    title: "402 Payment Required",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
        <code>{`HTTP/1.1 402 Payment Required
WWW-Authenticate: X-PAYMENT
Content-Type: application/json

{ "scheme": "x402", "network": "stellar:testnet",
  "asset": "USDC", "amount": "0.01",
  "payTo": "GB...M6E", "nonce": "..." }`}</code>
      </pre>
    ),
  },
  {
    title: "Agent signs & retries",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
        <code>{`GET /weather?city=mumbai
X-PAYMENT: eyJzY2hlbWUiOiJ4NDAyIiwi... (auth entry)`}</code>
      </pre>
    ),
  },
  {
    title: "200 OK + signed receipt",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
        <code>{`HTTP/1.1 200 OK
X-PAYMENT-RESPONSE: rcpt_01HF9Z... (signed JWS)
Content-Type: application/json

{ "temp": 32, "city": "mumbai" }`}</code>
      </pre>
    ),
  },
];

function FlowCard({
  index,
  reduced,
  title,
  children,
}: {
  index: number;
  reduced: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="min-w-0 flex-1"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{
        duration: 0.3,
        delay: reduced ? 0 : index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="mt-3 flex-1">{children}</div>
      </div>
    </motion.div>
  );
}

export function FlowStrip() {
  const reduced = useReducedMotion();

  return (
    <section className="w-full border-y border-border bg-muted/20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">How a paid request actually works.</h2>
        <div className="mt-10 hidden gap-2 md:flex md:items-stretch md:justify-between">
          {flowSteps.map((step, i) => (
            <div key={step.title} className="flex min-w-0 flex-1 items-stretch gap-2">
              <FlowCard index={i} reduced={!!reduced} title={step.title}>
                {step.body}
              </FlowCard>
              {i < flowSteps.length - 1 && (
                <div className="flex shrink-0 items-center text-muted-foreground">
                  <ChevronRight className="size-5" aria-hidden />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-4 md:hidden">
          {flowSteps.map((step, i) => (
            <FlowCard key={step.title} index={i} reduced={!!reduced} title={step.title}>
              {step.body}
            </FlowCard>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          Under 5 seconds, end to end. The agent stayed within its policy. The receipt is cryptographically verifiable.
        </p>
      </div>
    </section>
  );
}

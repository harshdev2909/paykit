"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/paykit/use-reduced-motion";

export type FlowStep = {
  id: string;
  label: string;
  http: string;
};

const DEFAULT_STEPS: FlowStep[] = [
  {
    id: "req",
    label: "Request",
    http: "GET /forecast\nAccept: application/json",
  },
  {
    id: "402",
    label: "402",
    http: "HTTP/1.1 402 Payment Required\nWWW-Authenticate: x402 …",
  },
  {
    id: "pay",
    label: "Pay",
    http: "Authorization: X-PAYMENT: <facilitator payload>",
  },
  {
    id: "ok",
    label: "200 + Receipt",
    http: "HTTP/1.1 200 OK\nX-PAYMENT-RECEIPT: <signed JWS>",
  },
];

export type LiveX402FlowStripProps = {
  steps?: FlowStep[];
  className?: string;
};

export function LiveX402FlowStrip({ steps = DEFAULT_STEPS, className }: LiveX402FlowStripProps) {
  const reduced = usePrefersReducedMotion();
  const [reveal, setReveal] = React.useState(reduced ? steps.length : 0);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (reduced) {
      setReveal(steps.length);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const timeouts: number[] = [];
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        let i = 0;
        const next = () => {
          if (cancelled) return;
          i += 1;
          setReveal((r) => Math.max(r, i));
          if (i < steps.length) {
            timeouts.push(window.setTimeout(next, 400));
          }
        };
        timeouts.push(window.setTimeout(next, 120));
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      timeouts.forEach((t) => window.clearTimeout(t));
      obs.disconnect();
    };
  }, [reduced, steps.length]);

  return (
    <div ref={ref} className={cn("flex w-full min-h-[140px] flex-col gap-3 md:min-h-[120px] md:flex-row md:flex-wrap md:items-stretch", className)}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <article
            className={cn(
              "min-w-0 flex-1 rounded-lg border border-[var(--paykit-border)] bg-card p-3 transition-[opacity,transform,border-color] [transition-duration:var(--duration-enter)] [transition-timing-function:var(--ease-paykit)] md:min-w-[140px] md:flex-[1_1_18%]",
              reveal >= idx + 1
                ? "border-[var(--paykit-accent)]/40 opacity-100 md:translate-x-0"
                : "opacity-40 md:translate-x-[-4px]",
            )}
            style={{
              transitionDelay: reduced ? "0ms" : `${idx * 80}ms`,
            }}
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{step.label}</p>
            <pre className="font-mono text-[11px] leading-snug whitespace-pre-wrap text-foreground md:text-[12px]">
              {step.http}
            </pre>
          </article>
          {idx < steps.length - 1 && (
            <div className="flex h-6 items-center justify-center md:h-auto md:w-6 md:self-center" aria-hidden>
              <ArrowRight className="size-4 rotate-90 text-muted-foreground md:rotate-0" strokeWidth={1.5} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

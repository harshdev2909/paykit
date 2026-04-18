"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/paykit/use-reduced-motion";

const SESSION_KEY = "paykit_terminal_played_once";

export type TerminalBlockProps = {
  lines: string[];
  className?: string;
  minHeight?: string;
  /** Type out content on first viewport entry; only once per browser session */
  typingAnimation?: boolean;
  typingMsPerChar?: number;
};

export function TerminalBlock({
  lines,
  className,
  minHeight = "min-h-[220px]",
  typingAnimation = false,
  typingMsPerChar = 12,
}: TerminalBlockProps) {
  const reduced = usePrefersReducedMotion();
  const fullText = lines.join("\n");
  const [visible, setVisible] = React.useState(() => (typingAnimation && !reduced ? "" : fullText));
  const [played, setPlayed] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const hasTypedRef = React.useRef(false);

  React.useEffect(() => {
    if (!typingAnimation || reduced) {
      setVisible(fullText);
      return;
    }
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
      setVisible(fullText);
      setPlayed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const timeouts: number[] = [];
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || hasTypedRef.current) return;
        hasTypedRef.current = true;
        let i = 0;
        const tick = () => {
          if (cancelled) return;
          if (i <= fullText.length) {
            setVisible(fullText.slice(0, i));
            i += 1;
            timeouts.push(window.setTimeout(tick, typingMsPerChar));
          } else {
            sessionStorage.setItem(SESSION_KEY, "1");
            setPlayed(true);
          }
        };
        tick();
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      timeouts.forEach((t) => window.clearTimeout(t));
      obs.disconnect();
    };
  }, [typingAnimation, reduced, fullText, typingMsPerChar]);

  return (
    <div ref={ref} className={cn("relative rounded-lg border border-[var(--paykit-border)] bg-[var(--paykit-code-bg)]", minHeight, className)}>
      <div className="border-b border-[var(--paykit-border)] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Terminal</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground [tab-size:2]">
        <code>
          {visible.split("\n").map((line, idx) => (
            <span key={idx} className="block">
              <span className="mr-2 select-none text-muted-foreground/80">$</span>
              <span>{line}</span>
            </span>
          ))}
          {!played && typingAnimation && !reduced && (
            <span className="inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-[var(--paykit-accent)]" aria-hidden />
          )}
        </code>
      </pre>
    </div>
  );
}

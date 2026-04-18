"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCookie, setCookie } from "@/lib/cookies";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DOCS_TAB_COOKIE = "paykit_docs_code_tab";

export type CodeTab = { id: string; label: string; code: string; language?: string };

export type CodeBlockProps = {
  language?: string;
  /** Ignored when `tabs` is set */
  code?: string;
  className?: string;
  /** 1-based line numbers to emphasize */
  highlightedLines?: number[];
  showLineNumbers?: boolean;
  minHeight?: string;
  /** Tabbed variant; persists last selection in `paykit_docs_code_tab` */
  tabs?: CodeTab[];
  /** When using `tabs`, default tab id if cookie missing */
  defaultTab?: string;
};

function splitLines(code: string): string[] {
  return code.replace(/\n$/, "").split("\n");
}

function CodeBlockInner({
  language = "text",
  code,
  className,
  highlightedLines,
  showLineNumbers = false,
  minHeight = "min-h-[180px]",
}: Omit<CodeBlockProps, "tabs">) {
  const lines = splitLines(code ?? "");
  const highlightSet = new Set(highlightedLines ?? []);

  const copy = async () => {
    await navigator.clipboard.writeText(code ?? "");
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border border-[var(--paykit-border)] bg-[var(--paykit-code-bg)]",
        minHeight,
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--paykit-border)] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
        <CopyButton onCopy={copy} />
      </div>
      <pre className="overflow-x-auto p-4 pb-4 font-mono text-[13px] leading-relaxed text-foreground [tab-size:2]">
        <code>
          {lines.map((line, i) => {
            const n = i + 1;
            const hi = highlightSet.has(n);
            return (
              <span key={n} className="block">
                {showLineNumbers && (
                  <span
                    className="mr-4 inline-block w-8 select-none text-right text-muted-foreground/70"
                    aria-hidden
                  >
                    {n}
                  </span>
                )}
                <span className={cn(hi && "bg-[var(--paykit-accent)]/15 text-foreground")}>{line || " "}</span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

function CopyButton({ onCopy }: { onCopy: () => void | Promise<void> }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await onCopy();
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors [transition-duration:var(--duration-standard)] [transition-timing-function:var(--ease-paykit)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paykit-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      aria-label="Copy code"
    >
      {done ? <Check className="size-4 text-[var(--paykit-semantic-settled)]" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}

export function CodeBlock({
  language = "text",
  code = "",
  className,
  highlightedLines,
  showLineNumbers,
  minHeight,
  tabs,
  defaultTab,
}: CodeBlockProps) {
  const firstId = tabs?.[0]?.id ?? "";
  const [activeTab, setActiveTab] = React.useState(() => defaultTab ?? firstId);

  React.useEffect(() => {
    if (!tabs?.length) return;
    const fromCookie = getCookie(DOCS_TAB_COOKIE);
    const pick = tabs.find((t) => t.id === fromCookie)?.id ?? defaultTab ?? firstId;
    setActiveTab(pick);
  }, [tabs, defaultTab, firstId]);

  if (tabs?.length) {
    return (
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setCookie(DOCS_TAB_COOKIE, v);
        }}
        className="w-full gap-3"
      >
        <TabsList variant="line" className="h-8 w-full max-w-full justify-start gap-1 overflow-x-auto border-b border-[var(--paykit-border)] bg-transparent p-0">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="rounded-none border-0 px-3 text-xs data-[state=active]:shadow-none">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-0 outline-none">
            <CodeBlockInner
              language={t.language ?? language}
              code={t.code}
              className={className}
              highlightedLines={highlightedLines}
              showLineNumbers={showLineNumbers}
              minHeight={minHeight}
            />
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  return (
    <CodeBlockInner
      language={language}
      code={code}
      className={className}
      highlightedLines={highlightedLines}
      showLineNumbers={showLineNumbers}
      minHeight={minHeight}
    />
  );
}

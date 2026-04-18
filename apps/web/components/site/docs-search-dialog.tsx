"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Index } from "flexsearch";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DOCS_SEARCH_RECORDS } from "@/lib/docs/search-records";

export function DocsSearchDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<number[]>([]);

  const indexRef = React.useRef<Index | null>(null);

  React.useEffect(() => {
    const idx = new Index({ preset: "memory", tokenize: "forward" });
    DOCS_SEARCH_RECORDS.forEach((r) => {
      idx.add(r.id, `${r.title} ${r.tags.join(" ")} ${r.body}`);
    });
    indexRef.current = idx;
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const idx = indexRef.current;
    if (!idx) return;
    const raw = idx.search(query, { limit: 12 }) as unknown;
    let ids: number[] = [];
    if (Array.isArray(raw)) {
      ids = typeof raw[0] === "number" ? (raw as number[]) : (raw as number[][]).flat();
    }
    setResults(ids.filter((x): x is number => typeof x === "number"));
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const items = results
    .map((id) => DOCS_SEARCH_RECORDS.find((r) => r.id === id))
    .filter(Boolean) as typeof DOCS_SEARCH_RECORDS;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-[var(--paykit-border)] bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground",
          "transition-colors hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paykit-accent)] focus-visible:ring-offset-2",
        )}
      >
        <Search className="size-3.5" aria-hidden />
        Search docs
        <kbd className="pointer-events-none ml-2 hidden rounded border border-border bg-background px-1 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">Search documentation</DialogTitle>
          <div className="border-b border-[var(--paykit-border)] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and topics…"
              className="w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground"
              aria-label="Search documentation"
            />
          </div>
          <ul className="max-h-[min(60vh,360px)] overflow-y-auto p-2" role="listbox">
            {query.trim() && items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
            ) : null}
            {items.map((r) => (
              <li key={r.id} role="option">
                <button
                  type="button"
                  onClick={() => go(r.href)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium text-foreground">{r.title}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{r.href}</span>
                </button>
              </li>
            ))}
            {!query.trim() ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">Type to search the docs index.</li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

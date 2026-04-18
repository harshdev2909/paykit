import { DocsSubnav } from "@/components/site/docs-subnav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--paykit-border)] bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <DocsSubnav />
        </div>
      </div>
      {children}
    </div>
  );
}

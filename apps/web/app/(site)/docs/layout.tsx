import { DocsLayoutShell } from "@/components/site/docs-layout-shell";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col">
      <DocsLayoutShell>{children}</DocsLayoutShell>
    </div>
  );
}

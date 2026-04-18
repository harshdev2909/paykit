import { Loader2 } from "lucide-react";

export function PageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
      <Loader2 className="size-8 animate-spin text-[var(--paykit-accent)]" aria-hidden />
      <p className="max-w-xs text-center text-sm">{label}</p>
    </div>
  );
}

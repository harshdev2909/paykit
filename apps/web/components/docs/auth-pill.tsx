export function ApiKeyRequiredPill({ required }: { required: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        required
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          : "border-border bg-muted/60 text-muted-foreground"
      }`}
    >
      {required ? "Requires API key" : "Public"}
    </span>
  );
}

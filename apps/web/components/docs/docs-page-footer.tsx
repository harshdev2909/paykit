import { DOCS_LAST_UPDATED, docsGitHubEditUrl } from "@/lib/docs/config";
import { cn } from "@/lib/utils";

type DocsPageFooterProps = {
  /** Path under `app/(site)/docs/` without leading slash — use "" for docs home `page.tsx`. */
  docsPathSegment: string;
  className?: string;
};

export function DocsPageFooter({ docsPathSegment, className }: DocsPageFooterProps) {
  const edit = docsGitHubEditUrl(docsPathSegment);

  return (
    <footer className={cn("mt-16 border-t border-[var(--paykit-border)] pt-8 text-sm text-muted-foreground", className)}>
      <p>
        Last updated {DOCS_LAST_UPDATED}
        {edit ? (
          <>
            {" · "}
            <a href={edit} className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              Edit on GitHub
            </a>
          </>
        ) : null}
      </p>
    </footer>
  );
}

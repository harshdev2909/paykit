/** Set `NEXT_PUBLIC_DOCS_GITHUB_EDIT_BASE` to the folder that contains each route's `page.tsx` — e.g.
 * `https://github.com/acme/paykit/edit/main/apps/web/app/(site)/docs`
 */
export function docsGitHubEditUrl(docsPathSegment: string): string | null {
  const base = process.env.NEXT_PUBLIC_DOCS_GITHUB_EDIT_BASE?.replace(/\/$/, "");
  if (!base) return null;
  if (!docsPathSegment) {
    return `${base}/page.tsx`;
  }
  return `${base}/${docsPathSegment}/page.tsx`;
}

export const DOCS_LAST_UPDATED = "2026-04-18";

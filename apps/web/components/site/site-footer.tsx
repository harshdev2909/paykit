import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-foreground">PayKit</p>
          <p className="mt-2 text-sm text-muted-foreground">Built on Stellar</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/docs">
                Documentation
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/demo">
                Demo
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/dashboard">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Developers</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/playground">
                API playground
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/docs/quickstart">
                Quickstart
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/docs/packages">
                Packages
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/developers">
                Developer platform
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

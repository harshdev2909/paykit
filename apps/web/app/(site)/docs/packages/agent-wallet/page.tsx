import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "paykit-agent-wallet-sdk · PayKit",
  description: "Custodial agent wallet client for PayKit.",
};

function BetaPill() {
  return (
    <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Beta
    </span>
  );
}

export default function PackageAgentWalletPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 id="paykit-agent-wallet-sdk" className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          @h4rsharma/paykit-agent-wallet-sdk
          <BetaPill />
        </h1>
        <p className="mt-2 text-muted-foreground">
          <code className="font-mono text-xs">createAgentWallet(opts?)</code> returns a wallet handle with policy-aware{" "}
          <code className="font-mono text-xs">fetch</code>.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Install</h2>
        <CodeBlock language="bash" code={`npm install @h4rsharma/paykit-agent-wallet-sdk`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Example</h2>
        <CodeBlock
          language="typescript"
          code={`import { createAgentWallet } from "@h4rsharma/paykit-agent-wallet-sdk";

const wallet = await createAgentWallet({
  apiKey: process.env.PAYKIT_KEY,
  policy: { dailyCap: "10.00", allowedDomains: ["api.example.com"] },
});

await wallet.fetch("https://api.example.com/paid-resource");`}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold">REST endpoints used</h2>
        <p className="text-sm text-muted-foreground">
          <Link href="/docs/rest/wallets" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            /v1/wallets
          </Link>{" "}
          for creation, policy updates, signing.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="packages/agent-wallet" />
    </article>
  );
}

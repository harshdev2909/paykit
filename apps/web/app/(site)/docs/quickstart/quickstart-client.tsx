"use client";

import * as React from "react";
import Link from "next/link";

import { CodeBlock } from "@/components/paykit/code-block";
import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { getCookie, setCookie } from "@/lib/cookies";

const LANG_COOKIE = "paykit_docs_lang";

const INSTALL = `npm install @h4rsharma/paykit-x402-middleware`;

const NODE_PROTECT = `import express from "express";
import { paywall } from "@h4rsharma/paykit-x402-middleware";

const app = express();

app.get("/weather",
  paywall({
    price: "0.01",
    asset: "USDC",
    network: "stellar:testnet",
    apiKey: process.env.PAYKIT_KEY
  }),
  (req, res) => res.json({ temp: 32, city: req.query.city })
);

app.listen(8080);`;

const NEXT_PROTECT = `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Minimal route — in production, invoke the same paywall/facilitator flow as Express (verify + settle via PayKit API). */
export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city") ?? "";
  return NextResponse.json({ temp: 32, city });
}

// For App Router, run paywall validation in middleware or delegate to a small Express sidecar;
// the middleware package targets Express first-class; see the Node tab for the canonical snippet.`;

const PY_PROTECT = `from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route("/weather", methods=["GET"])
def weather():
    payment = request.headers.get("X-PAYMENT", "").strip()
    if not payment:
        return jsonify({"error": "payment_required"}), 402, {"WWW-Authenticate": "x402"}
    return jsonify({"temp": 32, "city": request.args.get("city", "")})

if __name__ == "__main__":
    app.run(port=8080)`;

const CURL_NO_PAY = `curl -i http://127.0.0.1:8080/weather`;

const NODE_AGENT = `import { createAgentWallet } from "@h4rsharma/paykit-agent-wallet-sdk";

const wallet = await createAgentWallet({
  apiKey: process.env.PAYKIT_KEY,
  policy: { dailyCap: "10.00" }
});

const res = await wallet.fetch("http://127.0.0.1:8080/weather?city=mumbai");
console.log(await res.json(), res.headers.get("x-payment-response"));`;

const NEXT_AGENT = `// Call your protected route after obtainining X-PAYMENT from PayKit wallets API / agent SDK.
// Agent wallet SDK is optimized for Node runtimes that can hold merchant keys securely.
const res = await fetch("http://127.0.0.1:8080/weather?city=mumbai", {
  headers: {
    // "x-payment": "<from PayKit signing flow>",
  },
});
console.log(await res.json(), res.headers.get("x-payment-response"));`;

const PY_AGENT = `import os
import requests

base = "http://127.0.0.1:8080"
headers = {"x-api-key": os.environ["PAYKIT_KEY"]}

# Create wallet (example — use dashboard or POST /v1/wallets with your server key)
r = requests.get(f"{base}/weather?city=mumbai", headers=headers)
print(r.status_code, r.text)`;

const VERIFY = `import { verifyReceipt } from "@h4rsharma/paykit-receipts";

const receipt = await verifyReceipt(res.headers.get("x-payment-response"));
// receipt.amount === "0.01", receipt.status === "settled"`;

export function QuickstartClient() {
  const [lang, setLang] = React.useState<"node" | "next" | "python">("node");

  React.useEffect(() => {
    const c = getCookie(LANG_COOKIE);
    if (c === "next" || c === "python" || c === "node") setLang(c);
  }, []);

  function setLangPersist(next: "node" | "next" | "python") {
    setLang(next);
    setCookie(LANG_COOKIE, next);
  }

  return (
    <>
      <div className="space-y-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Quickstart</h1>
          <p className="mt-2 text-muted-foreground">Ship a paid API endpoint in 5 minutes.</p>
        </header>

        <GlobalLangTabs lang={lang} setLang={setLangPersist} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="mr-2 font-mono text-[13px] text-muted-foreground">1</span>
            Get an API key
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Open{" "}
            <Link href="/dashboard/api-keys" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              Dashboard → API keys
            </Link>{" "}
            and create a key. Keys start with{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">pk_test_</code> or{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">pk_live_</code> and are sent as{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">x-api-key</code> or{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Authorization: Bearer</code>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="mr-2 font-mono text-[13px] text-muted-foreground">2</span>
            Install
          </h2>
          <CodeBlock language="bash" code={INSTALL} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="mr-2 font-mono text-[13px] text-muted-foreground">3</span>
            Protect an endpoint
          </h2>
          <LangPanel lang={lang} node={NODE_PROTECT} next={NEXT_PROTECT} python={PY_PROTECT} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="mr-2 font-mono text-[13px] text-muted-foreground">4</span>
            Test with curl
          </h2>
          <p className="text-sm text-muted-foreground">
            Without a payment header you should see status <code className="font-mono text-xs">402</code>, a{" "}
            <code className="font-mono text-xs">WWW-Authenticate: x402</code> challenge, and JSON describing accepted payment methods.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <CodeBlock language="bash" code={CURL_NO_PAY} />
            <CodeBlock
              language="text"
              code={`Expected: HTTP/1.1 402 Payment Required
WWW-Authenticate: x402
Content-Type: application/json

{ "error": "payment_required", ... }`}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="mr-2 font-mono text-[13px] text-muted-foreground">5</span>
            Pay from an agent wallet
          </h2>
          <LangPanel lang={lang} node={NODE_AGENT} next={NEXT_AGENT} python={PY_AGENT} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="mr-2 font-mono text-[13px] text-muted-foreground">6</span>
            Verify the receipt
          </h2>
          <CodeBlock language="typescript" code={VERIFY} />
        </section>

        <nav className="flex flex-wrap gap-4 border-t border-[var(--paykit-border)] pt-8 text-sm">
          <Link href="/docs/what-is-x402" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            Next: What is x402? →
          </Link>
          <Link href="/docs/rest/authentication" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            Full REST reference →
          </Link>
        </nav>
      </div>

      <DocsPageFooter docsPathSegment="quickstart" />
    </>
  );
}

function GlobalLangTabs({
  lang,
  setLang,
}: {
  lang: "node" | "next" | "python";
  setLang: (v: "node" | "next" | "python") => void;
}) {
  const opts = [
    { id: "node" as const, label: "Node" },
    { id: "next" as const, label: "Next.js" },
    { id: "python" as const, label: "Python" },
  ];
  return (
    <div className="rounded-lg border border-[var(--paykit-border)] bg-muted/20 px-4 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Code examples</p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Implementation language">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={lang === o.id}
            onClick={() => setLang(o.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              lang === o.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-[var(--paykit-border)]"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LangPanel({
  lang,
  node,
  next,
  python,
}: {
  lang: "node" | "next" | "python";
  node: string;
  next: string;
  python: string;
}) {
  const code = lang === "node" ? node : lang === "next" ? next : python;
  const language = lang === "python" ? "python" : "typescript";
  return <CodeBlock language={language} code={code} />;
}

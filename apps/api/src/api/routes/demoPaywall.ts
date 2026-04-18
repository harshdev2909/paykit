import { Router, Request, Response } from "express";
import { config } from "../../config";

const router = Router();

function payToSync(): string {
  return (
    config.demo.payToAddress ||
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
  );
}

function challenge(amount: string, resourcePath: string) {
  const host = config.demo.resourceHost;
  const resource = `https://${host}${resourcePath}`;
  return {
    error: "payment_required",
    accepts: [
      {
        scheme: "exact",
        network: `stellar:${config.stellar.network}`,
        asset: "USDC",
        amount,
        payTo: payToSync(),
        resource,
      },
    ],
  };
}

function send402(res: Response, amount: string, resourcePath: string): void {
  res
    .status(402)
    .set({
      "WWW-Authenticate": "x402",
      "Content-Type": "application/json",
    })
    .json(challenge(amount, resourcePath));
}

function paid(req: Request): boolean {
  const token = req.header("x-payment") ?? req.header("X-PAYMENT");
  return !!token?.trim();
}

/** GET /_demo/btc — $0.01 USDC */
router.get("/btc", async (req: Request, res: Response) => {
  if (!paid(req)) {
    send402(res, "0.01", "/_demo/btc");
    return;
  }
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { headers: { Accept: "application/json" } },
    );
    const j = (await r.json()) as { bitcoin?: { usd?: number } };
    const usd = typeof j.bitcoin?.usd === "number" ? j.bitcoin.usd : 0;
    res.json({ asset: "BTC", usd, at: new Date().toISOString() });
  } catch {
    res.status(502).json({ error: "price_upstream_failed" });
  }
});

/** POST /_demo/translate — $0.02 USDC */
router.post("/translate", async (req: Request, res: Response) => {
  if (!paid(req)) {
    send402(res, "0.02", "/_demo/translate");
    return;
  }
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const target = typeof req.body?.target === "string" ? req.body.target : "ja";
  if (!text.trim()) {
    res.status(400).json({ error: "missing_text" });
    return;
  }
  try {
    const q = encodeURIComponent(text.slice(0, 500));
    const pair = encodeURIComponent(`en|${target}`);
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${pair}`;
    const r = await fetch(url);
    const j = (await r.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = j.responseData?.translatedText ?? text;
    res.json({ translated, source: "en", target });
  } catch {
    res.status(502).json({ error: "translate_upstream_failed" });
  }
});

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function summarizeWithLlm(text: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key && text.length > 0) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Summarize in 2-4 short sentences. Plain text only." },
            { role: "user", content: text.slice(0, 12000) },
          ],
          max_tokens: 200,
        }),
      });
      const j = (await r.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const out = j.choices?.[0]?.message?.content?.trim();
      if (out) return out;
    } catch {
      /* fall through */
    }
  }
  return text.slice(0, 400);
}

/** POST /_demo/summarize — $0.05 USDC */
router.post("/summarize", async (req: Request, res: Response) => {
  if (!paid(req)) {
    send402(res, "0.05", "/_demo/summarize");
    return;
  }
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    res.status(400).json({ error: "invalid_url" });
    return;
  }
  try {
    const r = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": "PayKitDemo/1.0",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const html = await r.text();
    const plain = stripHtml(html);
    const summary = await summarizeWithLlm(plain);
    res.json({ summary, url });
  } catch {
    res.status(502).json({ error: "summarize_failed" });
  }
});

/** GET /_demo/expensive — $1.00 USDC (policy demo) */
router.get("/expensive", (req: Request, res: Response) => {
  if (!paid(req)) {
    send402(res, "1.00", "/_demo/expensive");
    return;
  }
  res.json({ ok: true });
});

export default router;

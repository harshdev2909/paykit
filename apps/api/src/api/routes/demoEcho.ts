import { Router, Request, Response } from "express";
import { config } from "../../config";

/**
 * Public echo paywall — returns HTTP 402 until `X-PAYMENT` is present (any non-empty value unlocks for the demo).
 * Matches the resource URLs advertised to humans (`https://api.demo.paykit.dev/...`).
 */
const router = Router();

function payTo(): string {
  return (
    config.demo.payToAddress ||
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
  );
}

function challenge(amount: string, pathSuffix: string) {
  const host = config.demo.resourceHost;
  const resource = `https://${host}${pathSuffix}`;
  return {
    error: "payment_required",
    accepts: [
      {
        scheme: "exact",
        network: `stellar:${config.stellar.network}`,
        asset: "USDC",
        amount,
        payTo: payTo(),
        resource,
      },
    ],
  };
}

function echoHandler(amount: string, pathSuffix: string) {
  return (req: Request, res: Response): void => {
    const token = req.header("x-payment") ?? req.header("X-PAYMENT");
    if (!token?.trim()) {
      res
        .status(402)
        .set({
          "WWW-Authenticate": "x402",
          "Content-Type": "application/json",
        })
        .json(challenge(amount, pathSuffix));
      return;
    }

    const body =
      pathSuffix === "/btc-price"
        ? { pair: "BTC-USD", price: 98234.12, source: "demo" }
        : pathSuffix === "/translate"
          ? { translated: "こんにちは", target: "ja", source: "demo" }
          : pathSuffix === "/summarize"
            ? { summary: "Hacker News front page contains tech threads.", source: "demo" }
            : { ok: true, demo: pathSuffix };

    res.status(200).json(body);
  };
}

router.get("/btc-price", echoHandler("0.02", "/btc-price"));
router.get("/translate", echoHandler("0.02", "/translate"));
router.get("/summarize", echoHandler("0.03", "/summarize"));
router.get("/overspend", echoHandler("1.00", "/overspend"));

export default router;

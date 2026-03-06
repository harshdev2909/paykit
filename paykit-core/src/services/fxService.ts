/**
 * Cross-border FX routing — quote for USD → USDC (and other pairs).
 * Uses swap quote when destination is a crypto asset.
 */

import { getSwapQuote } from "./swapQuoteService";
import { Wallet } from "../database/models";

const USD_TO_USDC_RATE = 1; // 1:1 for stablecoin
const SUPPORTED_FX_PAIRS: Array<{ from: string; to: string }> = [
  { from: "USD", to: "USDC" },
  { from: "USDC", to: "USD" },
  { from: "USD", to: "XLM" },
  { from: "USDC", to: "XLM" },
  { from: "XLM", to: "USDC" },
];

export interface FxQuoteParams {
  from: string;
  to: string;
  amount: string;
  walletId?: string;
}

export interface FxQuoteResult {
  from: string;
  to: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  route: string[];
}

export async function getFxQuote(params: FxQuoteParams): Promise<FxQuoteResult> {
  const from = params.from.toUpperCase();
  const to = params.to.toUpperCase();
  const amount = String(params.amount);
  if (!amount || parseFloat(amount) <= 0) throw new Error("Amount must be positive");
  const pair = SUPPORTED_FX_PAIRS.find((p) => p.from === from && p.to === to);
  if (!pair) {
    throw new Error(`Unsupported FX pair: ${from} → ${to}. Supported: USD/USDC/XLM combinations.`);
  }
  if (from === "USD" && to === "USDC") {
    return {
      from: "USD",
      to: "USDC",
      fromAmount: amount,
      toAmount: amount,
      rate: String(USD_TO_USDC_RATE),
      route: ["USD", "USDC"],
    };
  }
  if (from === "USDC" && to === "USD") {
    return {
      from: "USDC",
      to: "USD",
      fromAmount: amount,
      toAmount: amount,
      rate: "1",
      route: ["USDC", "USD"],
    };
  }
  if (params.walletId && (from === "USDC" || from === "XLM") && (to === "USDC" || to === "XLM")) {
    const wallet = await Wallet.findById(params.walletId).select("publicKey").lean().exec();
    if (wallet) {
      const quote = await getSwapQuote({
        destination: wallet.publicKey,
        sendAsset: from,
        sendAmount: amount,
        destAsset: to,
      });
      return {
        from,
        to,
        fromAmount: amount,
        toAmount: quote.estimatedAmountOut ?? amount,
        rate: quote.pathAvailable ? String(parseFloat(quote.estimatedAmountOut) / parseFloat(amount)) : "0",
        route: [from, to],
      };
    }
  }
  if (from === "USD" && to === "XLM") {
    return {
      from: "USD",
      to: "XLM",
      fromAmount: amount,
      toAmount: amount,
      rate: "1",
      route: ["USD", "USDC", "XLM"],
    };
  }
  return {
    from,
    to,
    fromAmount: amount,
    toAmount: amount,
    rate: "1",
    route: [from, to],
  };
}

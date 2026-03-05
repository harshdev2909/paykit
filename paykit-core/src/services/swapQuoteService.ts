import { findStrictSendPaths, selectBestPath } from "./liquidityRouter";
import { getAssetByCode } from "../stellar/assets";

export interface SwapQuoteParams {
  destination: string;
  sendAsset: string;
  sendAmount: string;
  destAsset: string;
}

export interface SwapQuoteResult {
  fromAsset: string;
  toAsset: string;
  sendAmount: string;
  estimatedAmountOut: string;
  pathAvailable: boolean;
}

export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResult> {
  const sendAsset = getAssetByCode(params.sendAsset);
  const destAsset = getAssetByCode(params.destAsset);
  const paths = await findStrictSendPaths(
    sendAsset,
    params.sendAmount,
    params.destination,
    destAsset
  );
  const bestPath = selectBestPath(paths);
  if (!bestPath) {
    return {
      fromAsset: params.sendAsset,
      toAsset: params.destAsset,
      sendAmount: params.sendAmount,
      estimatedAmountOut: "0",
      pathAvailable: false,
    };
  }
  return {
    fromAsset: params.sendAsset,
    toAsset: params.destAsset,
    sendAmount: params.sendAmount,
    estimatedAmountOut: bestPath.destination_amount,
    pathAvailable: true,
  };
}

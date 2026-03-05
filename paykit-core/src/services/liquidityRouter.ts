import { Asset } from "@stellar/stellar-sdk";
import { getStellarServer } from "../stellar/server";

export interface PaymentPathRecord {
  path: Array<{ asset_code: string; asset_issuer: string; asset_type: string }>;
  source_amount: string;
  source_asset_type: string;
  source_asset_code: string;
  source_asset_issuer: string;
  destination_amount: string;
  destination_asset_type: string;
  destination_asset_code: string;
  destination_asset_issuer: string;
}

function pathRecordToAsset(assetType: string, assetCode: string, assetIssuer: string): Asset {
  if (assetType === "native" || !assetCode) {
    return Asset.native();
  }
  return new Asset(assetCode, assetIssuer);
}

/**
 * Find payment paths for strict send: we send exactly sendAmount of sendAsset,
 * destination receives at least destMin of destAsset.
 * Returns paths from Horizon ordered by best destination amount (desc).
 */
export async function findStrictSendPaths(
  sourceAsset: Asset,
  sourceAmount: string,
  destination: string,
  destAsset: Asset
): Promise<PaymentPathRecord[]> {
  const server = getStellarServer();
  const response = await server.strictSendPaths(sourceAsset, sourceAmount, destination).call();
  const records = response.records as PaymentPathRecord[];

  const destAssetCode = destAsset.getCode();
  const destAssetIssuer = (destAsset.getIssuer && destAsset.getIssuer()) ?? "";

  const matching = records.filter((r) => {
    if (destAssetCode === "native" || destAssetCode === "XLM") {
      return r.destination_asset_type === "native";
    }
    return (
      r.destination_asset_type === "credit_alphanum4" &&
      r.destination_asset_code === destAssetCode &&
      r.destination_asset_issuer === destAssetIssuer
    );
  });

  return matching.sort((a, b) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount));
}

/**
 * Select best path by destination amount (highest).
 */
export function selectBestPath(paths: PaymentPathRecord[]): PaymentPathRecord | null {
  if (paths.length === 0) return null;
  return paths[0];
}

/**
 * Convert Horizon path record to Stellar Asset[] for the path payment operation.
 */
export function pathRecordToPathAssets(record: PaymentPathRecord): Asset[] {
  return record.path.map((p) => pathRecordToAsset(p.asset_type, p.asset_code, p.asset_issuer));
}

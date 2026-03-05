import { Asset } from "@stellar/stellar-sdk";
import { config } from "../config";

export const NATIVE_ASSET_CODE = "XLM";
export const USDC_ASSET_CODE = "USDC";
export const PYUSD_ASSET_CODE = "PYUSD";

export function getNativeAsset(): Asset {
  return Asset.native();
}

export function getUsdcAsset(): Asset {
  return new Asset(USDC_ASSET_CODE, config.stellar.usdcIssuer);
}

export function getPyusdAsset(): Asset {
  if (!config.stellar.pyusdIssuer) {
    throw new Error("PYUSD not configured: set STELLAR_PYUSD_ISSUER");
  }
  return new Asset(PYUSD_ASSET_CODE, config.stellar.pyusdIssuer);
}

export function getAssetByCode(code: string): Asset {
  const upper = code.toUpperCase();
  if (upper === NATIVE_ASSET_CODE) {
    return getNativeAsset();
  }
  if (upper === USDC_ASSET_CODE) {
    return getUsdcAsset();
  }
  if (upper === PYUSD_ASSET_CODE) {
    return getPyusdAsset();
  }
  throw new Error(`Unsupported asset: ${code}. Supported: XLM, USDC, PYUSD`);
}

export function isNativeAsset(code: string): boolean {
  return code.toUpperCase() === NATIVE_ASSET_CODE;
}

export function isTreasuryAsset(code: string): boolean {
  const u = code.toUpperCase();
  return u === NATIVE_ASSET_CODE || u === USDC_ASSET_CODE || u === PYUSD_ASSET_CODE;
}

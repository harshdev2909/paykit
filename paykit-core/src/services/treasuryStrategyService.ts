/**
 * Smart treasury strategies — Conservative, Balanced, Yield Max.
 * Allocation breakdown and expected APY for dashboard display.
 */

export const TREASURY_STRATEGIES = [
  {
    id: "conservative",
    name: "Conservative",
    description: "Lower risk, stable returns",
    expectedApy: "4.5",
    allocation: [
      { label: "RWAs", percent: 80 },
      { label: "Liquidity", percent: 20 },
    ],
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Mix of yield and liquidity",
    expectedApy: "6.2",
    allocation: [
      { label: "Lending", percent: 50 },
      { label: "RWAs", percent: 30 },
      { label: "Liquidity", percent: 20 },
    ],
  },
  {
    id: "yield_max",
    name: "Yield Max",
    description: "Maximum yield, higher variance",
    expectedApy: "8.0",
    allocation: [
      { label: "Lending", percent: 40 },
      { label: "LP", percent: 40 },
      { label: "RWAs", percent: 20 },
    ],
  },
] as const;

export type StrategyId = (typeof TREASURY_STRATEGIES)[number]["id"];

import { TreasuryAccount } from "../database/models";

export async function getStrategies(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    expectedApy: string;
    allocation: Array<{ label: string; percent: number }>;
  }>
> {
  return TREASURY_STRATEGIES.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    expectedApy: s.expectedApy,
    allocation: [...s.allocation],
  }));
}

export async function enableStrategy(
  treasuryAccountId: string,
  strategy: StrategyId
): Promise<{ treasuryAccountId: string; strategy: string }> {
  const account = await TreasuryAccount.findById(treasuryAccountId).exec();
  if (!account) throw new Error("Treasury account not found");
  const valid = TREASURY_STRATEGIES.some((s) => s.id === strategy);
  if (!valid) throw new Error("Invalid strategy. Use conservative, balanced, or yield_max.");
  account.strategy = strategy;
  await account.save();
  return { treasuryAccountId, strategy };
}

export async function getTreasuryStrategy(treasuryAccountId: string): Promise<string | null> {
  const account = await TreasuryAccount.findById(treasuryAccountId).select("strategy").lean().exec();
  return account?.strategy ?? null;
}

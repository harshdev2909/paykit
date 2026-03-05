/**
 * Yield provider interface — compatible with DeFi protocols (e.g. Blend Protocol).
 * Implementations plug in concrete protocols.
 */
export interface YieldProvider {
  deposit(asset: string, amount: string): Promise<{ positionId?: string }>;
  withdraw(asset: string, amount: string): Promise<{ amount: string }>;
  getYieldRate(asset: string): Promise<{ apy: string }>;
  getPosition(asset: string): Promise<{
    principal: string;
    yieldEarned: string;
    total: string;
    apy: string;
  }>;
}

/**
 * In-memory / stub implementation for architecture compatibility.
 * Production would wire to Blend or another protocol via Soroban or Horizon.
 */
export class StubYieldProvider implements YieldProvider {
  private positions: Map<string, { principal: string; yieldEarned: string }> = new Map();

  async deposit(asset: string, amount: string): Promise<{ positionId?: string }> {
    const key = asset;
    const existing = this.positions.get(key) ?? { principal: "0", yieldEarned: "0" };
    const newPrincipal = (parseFloat(existing.principal) + parseFloat(amount)).toFixed(7);
    this.positions.set(key, { ...existing, principal: newPrincipal });
    return { positionId: `pos_${key}_${Date.now()}` };
  }

  async withdraw(asset: string, amount: string): Promise<{ amount: string }> {
    const key = asset;
    const pos = this.positions.get(key);
    if (!pos) return { amount: "0" };
    const withdrawAmount = Math.min(parseFloat(amount), parseFloat(pos.principal));
    const newPrincipal = (parseFloat(pos.principal) - withdrawAmount).toFixed(7);
    this.positions.set(key, { ...pos, principal: newPrincipal });
    return { amount: withdrawAmount.toFixed(7) };
  }

  async getYieldRate(asset: string): Promise<{ apy: string }> {
    return { apy: "0" };
  }

  async getPosition(asset: string): Promise<{
    principal: string;
    yieldEarned: string;
    total: string;
    apy: string;
  }> {
    const pos = this.positions.get(asset) ?? { principal: "0", yieldEarned: "0" };
    const total = (parseFloat(pos.principal) + parseFloat(pos.yieldEarned)).toFixed(7);
    return {
      principal: pos.principal,
      yieldEarned: pos.yieldEarned,
      total,
      apy: "0",
    };
  }
}

let defaultProvider: YieldProvider | null = null;

export function getYieldProvider(): YieldProvider {
  if (!defaultProvider) {
    defaultProvider = new StubYieldProvider();
  }
  return defaultProvider;
}

export function setYieldProvider(provider: YieldProvider): void {
  defaultProvider = provider;
}

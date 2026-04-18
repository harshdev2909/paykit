"use client";

export interface BalanceItem {
  asset: string;
  balance: string;
}

export function BalanceList({ balances }: { balances: BalanceItem[] }) {
  return (
    <ul className="space-y-2">
      {balances.map((b) => (
        <li
          key={b.asset}
          className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
        >
          <span className="font-medium">{b.asset}</span>
          <span className="font-mono">{b.balance}</span>
        </li>
      ))}
    </ul>
  );
}

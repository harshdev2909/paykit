import { DemoInteractive } from "./demo-interactive";

export default function DemoPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-4 py-10 md:py-14">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Interactive demo</h1>
        <p className="max-w-2xl text-muted-foreground">
          A custodial agent wallet on Stellar testnet pays HTTP 402 echo routes, then receipts show up here in real time
          over SSE — same flows as production, without signing up.
        </p>
      </header>
      <DemoInteractive />
    </div>
  );
}

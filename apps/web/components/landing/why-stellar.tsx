"use client";

export function WhyStellar() {
  const stats = [
    { value: "~$0.00001", label: "Network fee per transaction" },
    { value: "<5s", label: "End-to-end settlement" },
    { value: "99.99%", label: "Uptime since network launch" },
    { value: "Native", label: "USDC, PYUSD, USDY support" },
  ];
  return (
    <section className="border-y border-border bg-muted/15 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">Why Stellar.</h2>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono text-2xl font-medium tracking-tight text-foreground md:text-3xl">{s.value}</p>
              <p className="mt-2 text-xs text-muted-foreground md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          x402 only works if the fee doesn&apos;t exceed the payment. Stellar&apos;s ~$0.00001 base fee keeps ~99% of a $0.001 payment intact. On most other networks, the fee would swallow the payment.
        </p>
      </div>
    </section>
  );
}

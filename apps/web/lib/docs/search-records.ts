export type DocsSearchRecord = {
  id: number;
  title: string;
  href: string;
  tags: string[];
  /** Extra text for indexing */
  body: string;
};

export const DOCS_SEARCH_RECORDS: DocsSearchRecord[] = [
  {
    id: 0,
    title: "Quickstart",
    href: "/docs/quickstart",
    tags: ["get started", "install", "curl", "paywall"],
    body: "Ship a paid API endpoint in five minutes npm install middleware agent wallet receipt verify",
  },
  {
    id: 1,
    title: "What is x402?",
    href: "/docs/what-is-x402",
    tags: ["http 402", "payment required", "www-authenticate"],
    body: "HTTP 402 Payment Required machine-readable payment challenge facilitator Stellar",
  },
  {
    id: 2,
    title: "All packages",
    href: "/docs/packages",
    tags: ["npm", "sdk", "javascript"],
    body: "@h4rsharma paykit npm packages middleware agent wallet receipts",
  },
  {
    id: 3,
    title: "paykit-x402-middleware",
    href: "/docs/packages/x402-middleware",
    tags: ["express", "next.js", "paywall"],
    body: "paywall middleware HTTP 402 protect routes",
  },
  {
    id: 4,
    title: "paykit-agent-wallet-sdk",
    href: "/docs/packages/agent-wallet",
    tags: ["custodial", "fetch", "policy"],
    body: "createAgentWallet fetch interceptor spending policy",
  },
  {
    id: 5,
    title: "paykit-receipts",
    href: "/docs/packages/receipts",
    tags: ["jws", "verify", "signed receipt"],
    body: "verifyReceipt signed receipts merchant keys",
  },
  {
    id: 6,
    title: "Authentication",
    href: "/docs/rest/authentication",
    tags: ["api key", "x-api-key", "bearer"],
    body: "Authenticate REST API merchant key pk_test pk_live Authorization header",
  },
  {
    id: 7,
    title: "Wallets API",
    href: "/docs/rest/wallets",
    tags: ["agent wallet", "policy", "fund", "sign"],
    body: "POST GET PATCH wallets fund policy sign create list custodial Stellar",
  },
  {
    id: 8,
    title: "x402 API",
    href: "/docs/rest/x402",
    tags: ["verify", "settle", "supported"],
    body: "x402 verify settle supported networks assets facilitator",
  },
  {
    id: 9,
    title: "Receipts API",
    href: "/docs/rest/receipts",
    tags: ["list", "get receipt", "postgres"],
    body: "GET receipts list settled failed merchant scoped",
  },
  {
    id: 10,
    title: "Webhooks API",
    href: "/docs/rest/webhooks",
    tags: ["register", "replay", "delivery"],
    body: "POST webhooks subscription events receipt settled replay URL secret",
  },
  {
    id: 11,
    title: "Events (SSE)",
    href: "/docs/rest/events",
    tags: ["sse", "stream", "realtime"],
    body: "GET events stream server-sent events EventSource merchant events",
  },
  {
    id: 12,
    title: "Spending policies",
    href: "/docs/reference/spending-policies",
    tags: ["daily cap", "allowlist", "agent policy"],
    body: "Agent wallet policy caps domains Soroban spending policy JSON",
  },
  {
    id: 13,
    title: "Signed receipts",
    href: "/docs/reference/signed-receipts",
    tags: ["jws", "x-payment-response"],
    body: "Signed JWS receipt header settle verification merchant signing keys",
  },
  {
    id: 14,
    title: "Error codes",
    href: "/docs/reference/error-codes",
    tags: ["401", "404", "429", "500"],
    body: "HTTP errors API validation rate limit",
  },
  {
    id: 15,
    title: "Changelog",
    href: "/docs/reference/changelog",
    tags: ["release", "version"],
    body: "Documentation and API changes history",
  },
  {
    id: 16,
    title: "HTTP API overview",
    href: "/docs",
    tags: ["reference", "v1"],
    body: "PayKit REST API v1 overview entry point",
  },
];

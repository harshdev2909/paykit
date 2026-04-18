/**
 * Deploy `paykit_spending_policy.wasm` to Soroban testnet using @stellar/stellar-sdk RPC:
 * 1) upload WASM, 2) create contract instance (no constructor args; call `initialize` separately).
 *
 * Prerequisites: `pnpm run build:wasm`, funded testnet account, and DEPLOYER_SECRET in
 * `.env.testnet` and/or `.env` (loaded in that order; `.env` overrides).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  Address,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");

config({ path: join(packageRoot, ".env.testnet") });
config({ path: join(packageRoot, ".env"), override: true });

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing ${name}: set it in contracts/spending-policy/.env.testnet and/or .env`,
    );
  }
  return v;
}

async function waitSuccess(server: rpc.Server, hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  for (let i = 0; i < 90; i++) {
    const tx = await server.getTransaction(hash);
    if (tx.status === "SUCCESS") {
      return tx as rpc.Api.GetSuccessfulTransactionResponse;
    }
    if (tx.status === "FAILED") {
      throw new Error(`Transaction failed: ${JSON.stringify(tx)}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${hash}`);
}

async function submitInvoke(
  server: rpc.Server,
  passphrase: string,
  keypair: Keypair,
  op: ReturnType<typeof Operation.invokeHostFunction>,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  let account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: passphrase,
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${JSON.stringify(sim)}`);
  }
  const built = rpc.assembleTransaction(tx, sim).build();
  built.sign(keypair);
  const sent = await server.sendTransaction(built);
  if (!sent.hash) {
    throw new Error(`sendTransaction: ${JSON.stringify(sent)}`);
  }
  return waitSuccess(server, sent.hash);
}

async function main(): Promise<void> {
  const passphrase =
    process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
  const rpcUrl =
    process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const wasmRel =
    process.env.WASM_PATH ?? "target/wasm32v1-none/release/paykit_spending_policy.wasm";
  const wasmPath = resolve(packageRoot, wasmRel);

  const secret = requireEnv("DEPLOYER_SECRET");
  const keypair = Keypair.fromSecret(secret);
  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http:") });

  const wasm = readFileSync(wasmPath);
  const wasmHash = createHash("sha256").update(wasm).digest();

  console.error(`Uploading WASM (${wasm.length} bytes) from ${wasmPath}…`);
  const uploadResult = await submitInvoke(
    server,
    passphrase,
    keypair,
    Operation.uploadContractWasm({ wasm }),
  );
  console.error(`Upload ledger=${uploadResult.latestLedger}; tx=${uploadResult.txHash}`);

  const deployerAddr = Address.account(keypair.rawPublicKey());
  console.error("Creating contract instance…");
  const createResult = await submitInvoke(
    server,
    passphrase,
    keypair,
    Operation.createCustomContract({
      address: deployerAddr,
      wasmHash,
      constructorArgs: [],
    }),
  );
  console.error(`Create ledger=${createResult.latestLedger}; tx=${createResult.txHash}`);

  if (!createResult.returnValue) {
    console.error(
      "No returnValue on create tx; inspect meta for:",
      createResult.txHash,
    );
    process.exit(2);
  }
  console.log(Address.fromScVal(createResult.returnValue).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

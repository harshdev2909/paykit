import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";
import { Wallet } from "../database/models";
import { TreasuryAccount } from "../database/models";
import { createWallet } from "../wallet/walletService";
import { getStellarServer } from "../stellar/server";
import { config } from "../config";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface CreateMultisigTreasuryRequest {
  name: string;
  signers: string[];
  threshold: number;
}

export interface CreateMultisigTreasuryResult {
  id: string;
  name: string;
  walletId: string;
  publicKey: string;
  isMultisig: true;
  signers: { signer: string; weight: number }[];
  threshold: number;
  createdAt: Date;
}

export async function createMultisigTreasury(
  req: CreateMultisigTreasuryRequest
): Promise<CreateMultisigTreasuryResult> {
  if (req.signers.length < 2 || req.threshold < 1 || req.threshold > req.signers.length) {
    throw new Error("Invalid multisig: need at least 2 signers and threshold between 1 and signers.length");
  }
  const walletResult = await createWallet(undefined);
  const wallet = await Wallet.findById(walletResult.id).exec();
  if (!wallet) throw new Error("Wallet not created");
  const keypair = await import("../wallet/walletService").then((m) => m.getKeypairForWallet(wallet._id.toString()));
  const server = getStellarServer();
  const sourceAccount = await server.loadAccount(wallet.publicKey);
  const networkPassphrase = config.stellar.network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
  const signerWeights = req.signers.map((s) => ({ signer: s, weight: 1 }));
  const thresh = Math.min(req.threshold, 255);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.setOptions({
            masterWeight: 0,
            lowThreshold: thresh,
            medThreshold: thresh,
            highThreshold: thresh,
          })
        );
      for (const { signer } of signerWeights) {
        txBuilder.addOperation(
          Operation.setOptions({
            signer: { ed25519PublicKey: signer, weight: 1 },
          })
        );
      }
      const tx = txBuilder.setTimeout(30).build();
      tx.sign(keypair);
      await server.submitTransaction(tx);
      const treasury = await TreasuryAccount.create({
        name: req.name,
        walletId: wallet._id,
        publicKey: wallet.publicKey,
        isMultisig: true,
        signerWeights,
        thresholds: { low: thresh, medium: thresh, high: thresh },
      });
      return {
        id: treasury._id.toString(),
        name: treasury.name,
        walletId: walletResult.id,
        publicKey: treasury.publicKey,
        isMultisig: true,
        signers: signerWeights,
        threshold: thresh,
        createdAt: treasury.createdAt,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError ?? new Error("Multisig treasury creation failed after retries");
}

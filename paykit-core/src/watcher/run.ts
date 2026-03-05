import { connectDatabase } from "../database/connection";
import { refreshWalletPublicKeys, startPaymentStream } from "./transactionWatcher";

async function main(): Promise<void> {
  await connectDatabase();
  await refreshWalletPublicKeys();
  setInterval(refreshWalletPublicKeys, 60_000);

  console.log("Transaction watcher started. Listening to Horizon payment stream.");
  startPaymentStream();
}

main().catch((err) => {
  console.error("Watcher failed to start:", err);
  process.exit(1);
});

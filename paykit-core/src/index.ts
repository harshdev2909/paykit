import app from "./api";
import { connectDatabase } from "./database/connection";
import { seedPlans } from "./database/seedPlans";
import { config } from "./config";
import { processNextWebhookFromQueue } from "./services/webhookService";
import { refreshWalletPublicKeys, startPaymentStream } from "./watcher/transactionWatcher";

async function main(): Promise<void> {
  await connectDatabase();
  await seedPlans();
  await refreshWalletPublicKeys();
  setInterval(refreshWalletPublicKeys, 45_000);
  startPaymentStream();
  app.listen(config.port, () => {
    console.log(`PayKit API listening on port ${config.port}`);
  });
  setInterval(() => {
    processNextWebhookFromQueue().catch(() => {});
  }, 5000);
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

import { UsageMetrics } from "../database/models";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function recordApiCall(organizationId: string): Promise<void> {
  const month = currentMonth();
  await UsageMetrics.findOneAndUpdate(
    { organizationId, month },
    { $inc: { apiCalls: 1 } },
    { upsert: true, new: true }
  ).exec();
}

export async function recordPaymentVolume(organizationId: string, amount: string): Promise<void> {
  const month = currentMonth();
  const doc = await UsageMetrics.findOne({ organizationId, month }).lean().exec();
  const current = doc ? parseFloat((doc as { paymentsVolume: string }).paymentsVolume || "0") : 0;
  const add = parseFloat(amount) || 0;
  await UsageMetrics.findOneAndUpdate(
    { organizationId, month },
    { $set: { paymentsVolume: String(current + add) } },
    { upsert: true }
  ).exec();
}

export async function recordCheckoutSession(organizationId: string): Promise<void> {
  const month = currentMonth();
  await UsageMetrics.findOneAndUpdate(
    { organizationId, month },
    { $inc: { checkoutSessions: 1 } },
    { upsert: true }
  ).exec();
}

export async function getUsageForMonth(organizationId: string, month?: string): Promise<{ apiCalls: number; paymentsVolume: string; checkoutSessions: number }> {
  const m = month ?? currentMonth();
  const doc = await UsageMetrics.findOne({ organizationId, month: m }).lean().exec();
  if (!doc) {
    return { apiCalls: 0, paymentsVolume: "0", checkoutSessions: 0 };
  }
  const d = doc as { apiCalls: number; paymentsVolume: string; checkoutSessions: number };
  return {
    apiCalls: d.apiCalls ?? 0,
    paymentsVolume: d.paymentsVolume ?? "0",
    checkoutSessions: d.checkoutSessions ?? 0,
  };
}

import { Plan } from "./models";

const PLANS = [
  { slug: "free" as const, name: "Free", price: 0, txFee: 0, rateLimitPerSec: 10, apiRequestsPerMonth: 1000, features: ["basic_payments"] },
  { slug: "pro" as const, name: "Pro", price: 29, txFee: 0.005, rateLimitPerSec: 50, apiRequestsPerMonth: 50_000, features: ["payments", "wallet"] },
  { slug: "premium" as const, name: "Premium", price: 99, txFee: 0.003, rateLimitPerSec: 200, apiRequestsPerMonth: 500_000, features: ["payments", "wallet", "treasury", "checkout"] },
  { slug: "enterprise" as const, name: "Enterprise", price: 0, txFee: 0, rateLimitPerSec: 500, apiRequestsPerMonth: -1, features: ["all", "custom_limits"] },
];

export async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    await Plan.findOneAndUpdate(
      { slug: plan.slug },
      { $set: plan },
      { upsert: true, new: true }
    ).exec();
  }
}

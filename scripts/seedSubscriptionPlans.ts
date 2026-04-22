import { db } from "../server/db";
import { subscriptionPlans } from "../shared/schema";
import { SUBSCRIPTION_PLANS, subscriptionService } from "../server/subscriptionService";
import { sql } from "drizzle-orm";

async function seedSubscriptionPlans() {
  console.log("🌱 Seeding subscription plans...");

  try {
    // Clear existing plans (optional - comment out if you want to keep existing plans)
    await db.delete(subscriptionPlans);
    console.log("✓ Cleared existing plans");

    // Note: Stripe price IDs are now hardcoded in SUBSCRIPTION_PLANS
    // These are from the new Stripe test account configured in Replit Secrets
    console.log("✓ Using Stripe price IDs from SUBSCRIPTION_PLANS constant");

    // Insert plans into database
    const plans = [
      {
        name: SUBSCRIPTION_PLANS.FREE.name,
        displayName: SUBSCRIPTION_PLANS.FREE.displayName,
        price: SUBSCRIPTION_PLANS.FREE.price,
        interval: 'month',
        stripePriceId: SUBSCRIPTION_PLANS.FREE.stripePriceId,
        maxFiles: SUBSCRIPTION_PLANS.FREE.maxFiles,
        maxPasswords: SUBSCRIPTION_PLANS.FREE.maxPasswords,
        features: SUBSCRIPTION_PLANS.FREE.features,
        isActive: true,
      },
      {
        name: SUBSCRIPTION_PLANS.BASIC_MONTHLY.name,
        displayName: SUBSCRIPTION_PLANS.BASIC_MONTHLY.displayName,
        price: SUBSCRIPTION_PLANS.BASIC_MONTHLY.price,
        interval: SUBSCRIPTION_PLANS.BASIC_MONTHLY.interval,
        stripePriceId: SUBSCRIPTION_PLANS.BASIC_MONTHLY.stripePriceId,
        maxFiles: SUBSCRIPTION_PLANS.BASIC_MONTHLY.maxFiles,
        maxPasswords: SUBSCRIPTION_PLANS.BASIC_MONTHLY.maxPasswords,
        features: SUBSCRIPTION_PLANS.BASIC_MONTHLY.features,
        isActive: true,
      },
      {
        name: SUBSCRIPTION_PLANS.PLUS_MONTHLY.name,
        displayName: SUBSCRIPTION_PLANS.PLUS_MONTHLY.displayName,
        price: SUBSCRIPTION_PLANS.PLUS_MONTHLY.price,
        interval: SUBSCRIPTION_PLANS.PLUS_MONTHLY.interval,
        stripePriceId: SUBSCRIPTION_PLANS.PLUS_MONTHLY.stripePriceId,
        maxFiles: SUBSCRIPTION_PLANS.PLUS_MONTHLY.maxFiles,
        maxPasswords: SUBSCRIPTION_PLANS.PLUS_MONTHLY.maxPasswords,
        features: SUBSCRIPTION_PLANS.PLUS_MONTHLY.features,
        isActive: true,
      },
    ];

    // Insert plans
    for (const plan of plans) {
      await db.insert(subscriptionPlans).values(plan);
      console.log(`✓ Created plan: ${plan.displayName}`);
    }

    console.log("\n✅ Successfully seeded subscription plans!");
    console.log(`\nPlans created:`);
    console.log(`  1. ${SUBSCRIPTION_PLANS.FREE.displayName} - $${SUBSCRIPTION_PLANS.FREE.price / 100}/month`);
    console.log(`  2. ${SUBSCRIPTION_PLANS.BASIC_MONTHLY.displayName} - $${SUBSCRIPTION_PLANS.BASIC_MONTHLY.price / 100}/month`);
    console.log(`  3. ${SUBSCRIPTION_PLANS.PLUS_MONTHLY.displayName} - $${SUBSCRIPTION_PLANS.PLUS_MONTHLY.price / 100}/month`);
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedSubscriptionPlans();

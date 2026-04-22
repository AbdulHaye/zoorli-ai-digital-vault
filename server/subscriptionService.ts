import Stripe from "stripe";

// Initialize Stripe only if credentials are available
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia" as any,
    })
  : null;

// Helper to check if Stripe is configured
function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY to enable subscription features.",
    );
  }
  return stripe;
}

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "free",
    displayName: "Free",
    description: "Intelligence for everyday tasks",
    price: 0,
    interval: "month",
    maxFiles: 10,
    maxFileSize: 5 * 1024 * 1024, // 5MB in bytes
    maxPasswords: 20,
    maxAIPrompts: 20,
    stripePriceId: null,
    features: ["Upload 10 files per month", "20 prompts per month"],
    trialDays: 0, // No trial for free plan
  },
  BASIC_MONTHLY: {
    name: "basic",
    displayName: "Basic",
    description: "More access to advanced intelligence",
    price: 997, // $9.97 in cents
    interval: "month",
    maxFiles: 100,
    maxFileSize: 15 * 1024 * 1024, // 15MB in bytes
    maxPasswords: 200,
    maxAIPrompts: 500,
    stripePriceId: "price_1SLQXvP7PiwxdBzDzLndco8H",
    features: ["Upload 100 files per month", "500 prompts per month"],
    trialDays: 30,
  },
  PLUS_MONTHLY: {
    name: "plus",
    displayName: "Plus",
    description: "Secure, collaborative workspace for teams",
    price: 1997, // $19.97 in cents
    interval: "month",
    maxFiles: 999999, // Very high number for unlimited
    maxFileSize: 25 * 1024 * 1024, // 25MB per file
    maxPasswords: 999999, // Very high number for unlimited
    maxAIPrompts: 999999, // Very high number for unlimited
    stripePriceId: "price_1SLQZaP7PiwxdBzDquOM273o",
    features: ["Unlimited files", "Unlimited prompts"],
    trialDays: 30,
  },
};

export class SubscriptionService {
  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return stripe !== null;
  }

  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(
    email: string,
    name: string,
    userId: string,
  ): Promise<Stripe.Customer> {
    const stripeClient = requireStripe();
    return await stripeClient.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    userId: string,
    trialDays: number = 30,
  ): Promise<Stripe.Checkout.Session> {
    const stripeClient = requireStripe();
    return await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: {
        userId,
      },
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          userId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  /**
   * Create a subscription directly (for server-side setup)
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays: number = 30,
  ): Promise<Stripe.Subscription> {
    const stripeClient = requireStripe();
    return await stripeClient.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      trial_period_days: trialDays,
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripeClient = requireStripe();
    return await stripeClient.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Update a subscription (upgrade/downgrade)
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<Stripe.Subscription> {
    const stripeClient = requireStripe();
    const subscription =
      await stripeClient.subscriptions.retrieve(subscriptionId);

    return await stripeClient.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "always_invoice",
    });
  }

  /**
   * Cancel a subscription at period end
   */
  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    const stripeClient = requireStripe();
    return await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    const stripeClient = requireStripe();
    return await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Cancel a subscription immediately
   */
  async cancelSubscriptionImmediately(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    const stripeClient = requireStripe();
    return await stripeClient.subscriptions.cancel(subscriptionId);
  }

  /**
   * Create a Stripe price for a plan
   */
  async createPrice(
    planName: string,
    amount: number,
    interval: "month" | "year",
    productName: string,
  ): Promise<Stripe.Price> {
    const stripeClient = requireStripe();
    // First create or retrieve the product
    const products = await stripeClient.products.list({ limit: 100 });
    let product = products.data.find((p) => p.name === productName);

    if (!product) {
      product = await stripeClient.products.create({
        name: productName,
        description: `Zorli AI Vault - ${productName}`,
      });
    }

    // Create the price
    return await stripeClient.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: "usd",
      recurring: {
        interval,
      },
      metadata: {
        plan: planName,
      },
    });
  }

  /**
   * Create customer portal session for managing subscription
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const stripeClient = requireStripe();
    return await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Handle invoice payment failure - set grace period
   */
  async handlePaymentFailure(subscriptionId: string): Promise<Date> {
    // Set 7-day grace period
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    return gracePeriodEnd;
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    const stripeClient = requireStripe();
    return await stripeClient.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const stripeClient = requireStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    return stripeClient.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}

export const subscriptionService = new SubscriptionService();

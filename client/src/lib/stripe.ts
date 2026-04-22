import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('Missing VITE_STRIPE_PUBLIC_KEY environment variable')
}

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '')

export interface PaymentIntent {
  id: string
  client_secret: string
  amount: number
  currency: string
  status: string
}

export interface Subscription {
  id: string
  customer_id: string
  status: string
  current_period_start: number
  current_period_end: number
  client_secret?: string
}

export class StripeService {
  // Create payment intent for one-time payments
  static async createPaymentIntent(amount: number, currency = 'usd'): Promise<PaymentIntent> {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create payment intent')
    }

    return response.json()
  }

  // Get or create subscription
  static async getOrCreateSubscription(): Promise<Subscription> {
    const response = await fetch('/api/get-or-create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get or create subscription')
    }

    return response.json()
  }

  // Get customer portal URL
  static async getCustomerPortal(): Promise<{ url: string }> {
    const response = await fetch('/api/customer-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get customer portal URL')
    }

    return response.json()
  }
}
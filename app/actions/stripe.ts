"use server"

import Stripe from "stripe"

// Handle missing API key gracefully
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY not found in environment variables")
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-04-30.basil",
    })
  : null

export async function createCheckoutSession(): Promise<{ url: string | null; error?: string }> {
  if (!stripe) {
    return { url: null, error: "Maksujärjestelmä ei ole käytettävissä" }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Summari Unlimited",
              description: "Rajaton käyttö + kaikki premium-ominaisuudet",
              images: ["https://summari.fi/logo.png"],
            },
            unit_amount: 1900, // 19.00 EUR in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/`,
      metadata: {
        product: "summari_unlimited",
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    })

    return { url: session.url }
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return { url: null, error: "Maksujärjestelmässä tapahtui virhe" }
  }
}

export async function verifyPayment(sessionId: string): Promise<{ success: boolean; customerId?: string }> {
  if (!stripe) {
    return { success: false }
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === "paid") {
      return { success: true, customerId: session.customer as string }
    }

    return { success: false }
  } catch (error) {
    console.error("Payment verification error:", error)
    return { success: false }
  }
}

export async function createPortalSession(customerId: string): Promise<{ url: string | null }> {
  if (!stripe) {
    return { url: null }
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/`,
    })

    return { url: session.url }
  } catch (error) {
    console.error("Portal session error:", error)
    return { url: null }
  }
}

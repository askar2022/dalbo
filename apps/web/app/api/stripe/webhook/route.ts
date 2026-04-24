import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "../../../../lib/stripe";
import { getSupabaseServiceRoleClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET in the web app environment.");
  }

  return webhookSecret;
}

async function updateOrderById(
  orderId: string,
  payload: Record<string, string | null>,
) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("orders") as any).update(payload).eq("id", orderId);

  if (error) {
    throw error;
  }
}

async function updateOrderFromSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await updateOrderById(orderId, {
    payment_status: session.payment_status === "paid" ? "paid" : "pending",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    paid_at: session.payment_status === "paid" ? new Date().toISOString() : null,
  });
}

async function updateOrderFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  paymentStatus: "failed" | "cancelled",
) {
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    return;
  }

  await updateOrderById(orderId, {
    payment_status: paymentStatus,
    status: "cancelled",
    stripe_payment_intent_id: paymentIntent.id,
  });
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new NextResponse("Missing Stripe signature.", { status: 400 });
    }

    const stripe = getStripeClient();
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await updateOrderFromSession(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await updateOrderById(orderId, {
            payment_status: "cancelled",
            status: "cancelled",
            stripe_checkout_session_id: session.id,
          });
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await updateOrderById(orderId, {
            payment_status: "failed",
            status: "cancelled",
            stripe_checkout_session_id: session.id,
          });
        }
        break;
      }
      case "payment_intent.payment_failed":
        await updateOrderFromPaymentIntent(
          event.data.object as Stripe.PaymentIntent,
          "failed",
        );
        break;
      case "payment_intent.canceled":
        await updateOrderFromPaymentIntent(
          event.data.object as Stripe.PaymentIntent,
          "cancelled",
        );
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Unable to process Stripe webhook.",
      { status: 400 },
    );
  }
}

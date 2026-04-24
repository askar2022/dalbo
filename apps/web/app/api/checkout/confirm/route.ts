import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "../../../../lib/stripe";
import {
  getSupabaseAuthClient,
  getSupabaseServiceRoleClient,
} from "../../../../lib/supabase-server";

export const runtime = "nodejs";

type ConfirmBody = {
  sessionId?: string;
};

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const authClient = getSupabaseAuthClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Unable to verify the signed-in user." }, { status: 401 });
    }

    const body = (await request.json()) as ConfirmBody;

    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing Stripe session id." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId, {
      expand: ["payment_intent"],
    });

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json({ error: "Stripe session is missing an order id." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, payment_status")
      .eq("id", orderId)
      .maybeSingle<{ id: string; customer_id: string; payment_status: string }>();

    if (orderError) {
      throw orderError;
    }

    if (!order || order.customer_id !== user.id) {
      return NextResponse.json({ error: "Order not found for this customer." }, { status: 404 });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const isPaid = session.payment_status === "paid";

    const updatePayload = {
      payment_status: isPaid ? "paid" : order.payment_status === "cancelled" ? "cancelled" : "pending",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: isPaid ? new Date().toISOString() : null,
    };

    const { error: updateError } = await (supabase.from("orders") as any)
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      paymentStatus: updatePayload.payment_status,
      orderId: order.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to confirm Stripe payment right now.",
      },
      { status: 500 },
    );
  }
}

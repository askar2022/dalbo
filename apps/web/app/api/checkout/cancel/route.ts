import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAuthClient,
  getSupabaseServiceRoleClient,
} from "../../../../lib/supabase-server";

type CancelBody = {
  orderId?: string;
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

    const body = (await request.json()) as CancelBody;

    if (!body.orderId) {
      return NextResponse.json({ error: "Missing order id." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, payment_status")
      .eq("id", body.orderId)
      .maybeSingle<{ id: string; customer_id: string; payment_status: string }>();

    if (orderError) {
      throw orderError;
    }

    if (!order || order.customer_id !== user.id) {
      return NextResponse.json({ error: "Order not found for this customer." }, { status: 404 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({ paymentStatus: "paid", orderId: order.id });
    }

    const { error: updateError } = await (supabase.from("orders") as any)
      .update({
        payment_status: "cancelled",
        status: "cancelled",
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ paymentStatus: "cancelled", orderId: order.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to cancel this pending checkout.",
      },
      { status: 500 },
    );
  }
}

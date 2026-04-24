import { NextRequest, NextResponse } from "next/server";
import { calculateOrderPricing, toStripeAmount } from "../../../lib/order-pricing";
import { getStripeClient } from "../../../lib/stripe";
import {
  getSupabaseAuthClient,
  getSupabaseServiceRoleClient,
} from "../../../lib/supabase-server";

export const runtime = "nodejs";

type CheckoutRequestItem = {
  menuItemId: string;
  quantity: number;
};

type CheckoutRequestBody = {
  restaurantId?: string;
  deliveryAddressId?: string | null;
  notes?: string | null;
  items?: CheckoutRequestItem[];
};

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function normalizeItems(items: CheckoutRequestItem[]) {
  const quantitiesByMenuItemId = new Map<string, number>();

  for (const item of items) {
    if (!item.menuItemId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Each cart item must include a valid menu item id and quantity.");
    }

    quantitiesByMenuItemId.set(
      item.menuItemId,
      (quantitiesByMenuItemId.get(item.menuItemId) ?? 0) + item.quantity,
    );
  }

  return Array.from(quantitiesByMenuItemId.entries()).map(([menuItemId, quantity]) => ({
    menuItemId,
    quantity,
  }));
}

export async function POST(request: NextRequest) {
  let createdOrderId: string | null = null;

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

    const body = (await request.json()) as CheckoutRequestBody;

    if (!body.restaurantId) {
      return NextResponse.json({ error: "A restaurant is required for checkout." }, { status: 400 });
    }

    if (!body.items?.length) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    const normalizedItems = normalizeItems(body.items);
    const supabase = getSupabaseServiceRoleClient();

    const [{ data: restaurant, error: restaurantError }, { data: address, error: addressError }] =
      await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, is_open")
          .eq("id", body.restaurantId)
          .maybeSingle<{ id: string; name: string; is_open: boolean }>(),
        body.deliveryAddressId
          ? supabase
              .from("customer_addresses")
              .select("id")
              .eq("id", body.deliveryAddressId)
              .eq("customer_id", user.id)
              .maybeSingle<{ id: string }>()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (restaurantError) {
      throw restaurantError;
    }

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    if (!restaurant.is_open) {
      return NextResponse.json(
        { error: "This restaurant is currently closed for orders." },
        { status: 400 },
      );
    }

    if (addressError) {
      throw addressError;
    }

    if (body.deliveryAddressId && !address) {
      return NextResponse.json(
        { error: "Delivery address not found for this customer." },
        { status: 400 },
      );
    }

    const menuItemIds = normalizedItems.map((item) => item.menuItemId);
    const { data: menuItems, error: menuItemsError } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available, restaurant_id")
      .eq("restaurant_id", restaurant.id)
      .in("id", menuItemIds);

    if (menuItemsError) {
      throw menuItemsError;
    }

    const menuItemRows =
      (menuItems as
        | Array<{
            id: string;
            name: string;
            price: number;
            is_available: boolean;
            restaurant_id: string;
          }>
        | null) ?? [];

    if (menuItemRows.length !== menuItemIds.length) {
      return NextResponse.json(
        { error: "Some cart items no longer belong to this restaurant." },
        { status: 400 },
      );
    }

    const menuItemsById = new Map(menuItemRows.map((item) => [item.id, item]));
    const unavailableItem = menuItemRows.find((item) => !item.is_available);

    if (unavailableItem) {
      return NextResponse.json(
        { error: `${unavailableItem.name} is no longer available.` },
        { status: 400 },
      );
    }

    const cartItems = normalizedItems.map((item) => {
      const menuItem = menuItemsById.get(item.menuItemId);

      if (!menuItem) {
        throw new Error("A cart item could not be found in the restaurant menu.");
      }

      return {
        id: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(menuItem.price),
      };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const pricing = calculateOrderPricing(subtotal);

    const { data: order, error: orderError } = await (supabase.from("orders") as any)
      .insert({
        customer_id: user.id,
        restaurant_id: restaurant.id,
        delivery_address_id: body.deliveryAddressId ?? null,
        status: "placed",
        subtotal: pricing.subtotal,
        delivery_fee: pricing.deliveryFee,
        service_fee: pricing.serviceFee,
        commission_amount: pricing.commissionAmount,
        payment_status: "pending",
        notes: body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (orderError) {
      throw orderError;
    }

    createdOrderId = order.id;

    const { error: orderItemsError } = await (supabase.from("order_items") as any).insert(
      cartItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    );

    if (orderItemsError) {
      throw orderItemsError;
    }

    const stripe = getStripeClient();
    const successUrl = new URL("/dashboard/customer", request.nextUrl.origin);
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    const cancelUrl = new URL("/dashboard/customer", request.nextUrl.origin);
    cancelUrl.searchParams.set("checkout", "cancelled");
    cancelUrl.searchParams.set("order_id", order.id);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: user.email ?? undefined,
      metadata: {
        orderId: order.id,
        userId: user.id,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          userId: user.id,
        },
      },
      line_items: [
        ...cartItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: toStripeAmount(item.unitPrice),
            product_data: {
              name: item.name,
            },
          },
        })),
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: toStripeAmount(pricing.serviceFee),
            product_data: {
              name: "Dalbo service fee",
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: toStripeAmount(pricing.deliveryFee),
            product_data: {
              name: "Delivery fee",
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    const updatePayload: Record<string, string> = {
      stripe_checkout_session_id: session.id,
    };

    if (typeof session.payment_intent === "string") {
      updatePayload.stripe_payment_intent_id = session.payment_intent;
    }

    const { error: sessionUpdateError } = await (supabase.from("orders") as any)
      .update(updatePayload)
      .eq("id", order.id);

    if (sessionUpdateError) {
      throw sessionUpdateError;
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    if (createdOrderId) {
      try {
        const supabase = getSupabaseServiceRoleClient();
        await (supabase.from("orders") as any).delete().eq("id", createdOrderId);
      } catch {
        // Leave the pending row in place if cleanup fails.
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start Stripe checkout right now.",
      },
      { status: 500 },
    );
  }
}

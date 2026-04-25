import twilio from "twilio";
import { getSupabaseServiceRoleClient } from "./supabase-server";

export type RestaurantOrderNotificationPreference =
  | "dashboard"
  | "email"
  | "sms"
  | "email_and_sms";

type RestaurantAlertContext = {
  orderId: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  placedAt: string;
  notes: string | null;
  customerName: string | null;
  restaurantName: string;
  restaurantPhone: string | null;
  restaurantOwnerId: string;
  notificationPreference: RestaurantOrderNotificationPreference;
  items: Array<{
    item_name: string;
    quantity: number;
    line_total: number;
  }>;
  restaurantNotifiedAt: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getOrderAlertFromEmail() {
  const fromEmail = process.env.ORDER_ALERT_FROM_EMAIL || process.env.SECURITY_ALERT_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("Missing ORDER_ALERT_FROM_EMAIL or SECURITY_ALERT_FROM_EMAIL.");
  }

  return fromEmail;
}

function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  return apiKey;
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN.");
  }

  if (!messagingServiceSid && !fromNumber) {
    throw new Error("Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER.");
  }

  return {
    accountSid,
    authToken,
    messagingServiceSid: messagingServiceSid || null,
    fromNumber: fromNumber || null,
  };
}

function buildItemLines(context: RestaurantAlertContext) {
  return context.items
    .map(
      (item) =>
        `${item.quantity} x ${item.item_name} (${formatCurrency(Number(item.line_total))})`,
    )
    .join("\n");
}

function buildEmailCopy(context: RestaurantAlertContext) {
  const notesLine = context.notes ? `Customer notes: ${context.notes}` : "Customer notes: None";
  const customerLine = context.customerName ? `Customer: ${context.customerName}` : "Customer: New Dalbo customer";
  const itemsHtml = context.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;color:#0f172a;">${escapeHtml(`${item.quantity} x ${item.item_name}`)}</td>
          <td style="padding:10px 0;color:#0f172a;text-align:right;">${escapeHtml(
            formatCurrency(Number(item.line_total)),
          )}</td>
        </tr>
      `,
    )
    .join("");

  return {
    subject: `New Dalbo order for ${context.restaurantName}`,
    text: [
      `New paid order for ${context.restaurantName}.`,
      customerLine,
      `Placed: ${formatDateTime(context.placedAt)}`,
      `Order ID: ${context.orderId}`,
      "",
      "Items:",
      buildItemLines(context),
      "",
      `Subtotal: ${formatCurrency(context.subtotal)}`,
      `Service fee: ${formatCurrency(context.serviceFee)}`,
      `Delivery fee: ${formatCurrency(context.deliveryFee)}`,
      `Total paid: ${formatCurrency(context.total)}`,
      notesLine,
      "",
      "Open the Dalbo restaurant dashboard to confirm and prepare the order.",
    ].join("\n"),
    html: `
      <div style="background:#fffaf5;padding:32px;font-family:Arial,sans-serif;color:#334155;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <div style="background:#ff6200;padding:24px 28px;color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Dalbo</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">New paid order</h1>
            <p style="margin:10px 0 0;font-size:15px;line-height:1.6;">
              ${escapeHtml(context.restaurantName)} just received a new order.
            </p>
          </div>
          <div style="padding:28px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:0 0 8px;color:#64748b;">Restaurant</td><td style="padding:0 0 8px;text-align:right;color:#0f172a;font-weight:600;">${escapeHtml(context.restaurantName)}</td></tr>
              <tr><td style="padding:0 0 8px;color:#64748b;">Customer</td><td style="padding:0 0 8px;text-align:right;color:#0f172a;font-weight:600;">${escapeHtml(context.customerName || "New Dalbo customer")}</td></tr>
              <tr><td style="padding:0 0 8px;color:#64748b;">Placed</td><td style="padding:0 0 8px;text-align:right;color:#0f172a;font-weight:600;">${escapeHtml(formatDateTime(context.placedAt))}</td></tr>
              <tr><td style="padding:0 0 8px;color:#64748b;">Order ID</td><td style="padding:0 0 8px;text-align:right;color:#0f172a;font-weight:600;">${escapeHtml(context.orderId)}</td></tr>
            </table>
            <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:20px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:8px;">Order items</div>
              <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
            </div>
            <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:20px;">
              <p style="margin:0 0 8px;">Subtotal: <strong>${escapeHtml(formatCurrency(context.subtotal))}</strong></p>
              <p style="margin:0 0 8px;">Service fee: <strong>${escapeHtml(formatCurrency(context.serviceFee))}</strong></p>
              <p style="margin:0 0 8px;">Delivery fee: <strong>${escapeHtml(formatCurrency(context.deliveryFee))}</strong></p>
              <p style="margin:0;color:#0f172a;font-size:16px;">Total paid: <strong>${escapeHtml(formatCurrency(context.total))}</strong></p>
            </div>
            <div style="margin-top:20px;border-radius:16px;background:#f8fafc;padding:16px;">
              <p style="margin:0 0 8px;color:#0f172a;font-weight:700;">Customer notes</p>
              <p style="margin:0;line-height:1.6;">${escapeHtml(context.notes || "No customer notes.")}</p>
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

function buildSmsCopy(context: RestaurantAlertContext) {
  const firstItems = context.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.item_name}`)
    .join(", ");

  return [
    `Dalbo: New paid order for ${context.restaurantName}.`,
    context.customerName ? `Customer: ${context.customerName}.` : null,
    `Items: ${firstItems}${context.items.length > 3 ? ", ..." : ""}.`,
    `Total: ${formatCurrency(context.total)}.`,
    "Open the dashboard to confirm and prepare it.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function sendEmailAlert(context: RestaurantAlertContext, email: string) {
  const apiKey = getResendApiKey();
  const fromEmail = getOrderAlertFromEmail();
  const copy = buildEmailCopy(context);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Restaurant order email failed: ${errorBody}`);
  }
}

async function sendSmsAlert(context: RestaurantAlertContext, phone: string) {
  const config = getTwilioConfig();
  const client = twilio(config.accountSid, config.authToken);
  const payload = {
    to: phone,
    body: buildSmsCopy(context),
    ...(config.messagingServiceSid
      ? { messagingServiceSid: config.messagingServiceSid }
      : { from: config.fromNumber as string }),
  };

  await client.messages.create(payload);
}

async function getRestaurantAlertContext(orderId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, payment_status, subtotal, delivery_fee, service_fee, total, placed_at, notes, customer_id, restaurant_id, restaurant_notified_at, restaurants(name, phone, owner_id, order_notification_preference)",
    )
    .eq("id", orderId)
    .maybeSingle<
      | {
          id: string;
          status: string;
          payment_status: string;
          subtotal: number | null;
          delivery_fee: number | null;
          service_fee: number | null;
          total: number;
          placed_at: string;
          notes: string | null;
          customer_id: string | null;
          restaurant_id: string;
          restaurant_notified_at: string | null;
          restaurants:
            | {
                name: string;
                phone: string | null;
                owner_id: string;
                order_notification_preference: RestaurantOrderNotificationPreference | null;
              }
            | Array<{
                name: string;
                phone: string | null;
                owner_id: string;
                order_notification_preference: RestaurantOrderNotificationPreference | null;
              }>
            | null;
        }
      | null
    >();

  if (orderError) {
    throw orderError;
  }

  if (!order) {
    return null;
  }

  const restaurant = Array.isArray(order.restaurants) ? order.restaurants[0] : order.restaurants;

  if (!restaurant) {
    return null;
  }

  const [itemsResult, customerProfileResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("item_name, quantity, line_total")
      .eq("order_id", orderId),
    order.customer_id
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.customer_id)
          .maybeSingle<{ full_name: string | null }>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (customerProfileResult.error) {
    throw customerProfileResult.error;
  }

  return {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.payment_status,
    subtotal: Number(order.subtotal ?? 0),
    deliveryFee: Number(order.delivery_fee ?? 0),
    serviceFee: Number(order.service_fee ?? 0),
    total: Number(order.total),
    placedAt: order.placed_at,
    notes: order.notes,
    customerName: customerProfileResult.data?.full_name ?? null,
    restaurantName: restaurant.name,
    restaurantPhone: restaurant.phone,
    restaurantOwnerId: restaurant.owner_id,
    notificationPreference: restaurant.order_notification_preference ?? "dashboard",
    items: (itemsResult.data ?? []) as RestaurantAlertContext["items"],
    restaurantNotifiedAt: order.restaurant_notified_at,
  } satisfies RestaurantAlertContext;
}

export async function notifyRestaurantAboutOrder(orderId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const context = await getRestaurantAlertContext(orderId);

  if (!context || context.paymentStatus !== "paid" || context.restaurantNotifiedAt) {
    return;
  }

  const claimedAt = new Date().toISOString();
  const { data: claimedOrder, error: claimError } = await (supabase.from("orders") as any)
    .update({ restaurant_notified_at: claimedAt })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    .is("restaurant_notified_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  if (!claimedOrder) {
    return;
  }

  try {
    const wantsEmail =
      context.notificationPreference === "email" ||
      context.notificationPreference === "email_and_sms";
    const wantsSms =
      context.notificationPreference === "sms" ||
      context.notificationPreference === "email_and_sms";

    if (wantsEmail) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(context.restaurantOwnerId);

      if (userError) {
        throw userError;
      }

      if (!user?.email) {
        throw new Error("The restaurant owner account is missing an email address.");
      }

      await sendEmailAlert(context, user.email);
    }

    if (wantsSms) {
      if (!context.restaurantPhone) {
        throw new Error("The restaurant profile is missing a phone number for SMS alerts.");
      }

      await sendSmsAlert(context, context.restaurantPhone);
    }
  } catch (error) {
    await (supabase.from("orders") as any)
      .update({ restaurant_notified_at: null })
      .eq("id", orderId)
      .eq("restaurant_notified_at", claimedAt);

    throw error;
  }
}

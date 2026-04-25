import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAuthClient,
  getSupabaseServiceRoleClient,
} from "../../../../lib/supabase-server";

export const runtime = "nodejs";

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: "Unable to verify the signed-in admin." }, { status: 401 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle<{ role: "customer" | "driver" | "food_place" | "admin"; full_name: string | null }>();

    if (profileError) {
      throw profileError;
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Only admin accounts can open this dashboard." }, { status: 403 });
    }

    const openOrderStatuses = ["placed", "confirmed", "preparing", "ready", "picked_up"];
    const [
      customerCountResult,
      driverCountResult,
      foodPlaceCountResult,
      adminCountResult,
      liveOrdersCountResult,
      deliveredOrdersCountResult,
      ratingsCountResult,
      recentOrdersResult,
      restaurantsResult,
      driversResult,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "driver"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "food_place"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .in("status", openOrderStatuses),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .eq("status", "delivered"),
      supabase.from("order_ratings").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id, status, payment_status, total, placed_at, customer_id, driver_id, restaurants(name)")
        .order("placed_at", { ascending: false })
        .limit(8),
      supabase
        .from("restaurants")
        .select("id, name, phone, is_open, order_notification_preference, rating_average, rating_count")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("drivers")
        .select("user_id, vehicle_type, is_online, is_verified, rating_average, rating_count")
        .limit(12),
    ]);

    const results = [
      customerCountResult,
      driverCountResult,
      foodPlaceCountResult,
      adminCountResult,
      liveOrdersCountResult,
      deliveredOrdersCountResult,
      ratingsCountResult,
      recentOrdersResult,
      restaurantsResult,
      driversResult,
    ];

    for (const result of results) {
      if ("error" in result && result.error) {
        throw result.error;
      }
    }

    const recentOrders =
      (recentOrdersResult.data as Array<{
        id: string;
        status: string;
        payment_status: string | null;
        total: number;
        placed_at: string;
        customer_id: string | null;
        driver_id: string | null;
        restaurants: { name: string } | { name: string }[] | null;
      }> | null) ?? [];
    const drivers =
      (driversResult.data as Array<{
        user_id: string;
        vehicle_type: string | null;
        is_online: boolean;
        is_verified: boolean;
        rating_average: number | null;
        rating_count: number | null;
      }> | null) ?? [];
    const relatedProfileIds = [
      ...new Set(
        [...recentOrders.map((order) => order.customer_id), ...recentOrders.map((order) => order.driver_id), ...drivers.map((driver) => driver.user_id)].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ];
    const relatedProfilesResult =
      relatedProfileIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", relatedProfileIds)
        : { data: [], error: null };

    if (relatedProfilesResult.error) {
      throw relatedProfilesResult.error;
    }

    const profilesById = ((relatedProfilesResult.data ?? []) as Array<{ id: string; full_name: string | null }>).reduce<
      Record<string, { full_name: string | null }>
    >((accumulator, item) => {
      accumulator[item.id] = { full_name: item.full_name };
      return accumulator;
    }, {});

    return NextResponse.json({
      adminName: profile.full_name,
      counts: {
        customers: customerCountResult.count ?? 0,
        drivers: driverCountResult.count ?? 0,
        foodPlaces: foodPlaceCountResult.count ?? 0,
        admins: adminCountResult.count ?? 0,
        liveOrders: liveOrdersCountResult.count ?? 0,
        deliveredOrders: deliveredOrdersCountResult.count ?? 0,
        ratings: ratingsCountResult.count ?? 0,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        paymentStatus: order.payment_status ?? "pending",
        total: Number(order.total),
        placedAt: order.placed_at,
        restaurantName: Array.isArray(order.restaurants)
          ? (order.restaurants[0]?.name ?? "Restaurant")
          : (order.restaurants?.name ?? "Restaurant"),
        customerName: order.customer_id ? (profilesById[order.customer_id]?.full_name ?? "Customer") : "Customer",
        driverName: order.driver_id ? (profilesById[order.driver_id]?.full_name ?? "Driver") : "Unassigned",
      })),
      restaurants: ((restaurantsResult.data ?? []) as Array<{
        id: string;
        name: string;
        phone: string | null;
        is_open: boolean;
        order_notification_preference: "dashboard" | "email" | "sms" | "email_and_sms" | null;
        rating_average: number | null;
        rating_count: number | null;
      }>).map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone,
        isOpen: restaurant.is_open,
        notificationPreference: restaurant.order_notification_preference ?? "dashboard",
        ratingAverage: Number(restaurant.rating_average ?? 0),
        ratingCount: Number(restaurant.rating_count ?? 0),
      })),
      drivers: drivers.map((driver) => ({
        id: driver.user_id,
        name: profilesById[driver.user_id]?.full_name ?? "Driver",
        vehicleType: driver.vehicle_type,
        isOnline: driver.is_online,
        isVerified: driver.is_verified,
        ratingAverage: Number(driver.rating_average ?? 0),
        ratingCount: Number(driver.rating_count ?? 0),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load the admin dashboard right now.",
      },
      { status: 500 },
    );
  }
}

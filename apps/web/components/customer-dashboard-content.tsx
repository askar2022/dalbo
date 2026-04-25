"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import {
  getCustomerMediaPublicUrl,
  getDriverMediaPublicUrl,
  getFoodMediaPublicUrl,
} from "../lib/media";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { calculateOrderPricing } from "../lib/order-pricing";

type RestaurantRow = {
  id: string;
  name: string;
  description: string | null;
  address_text: string | null;
  is_open: boolean;
  image_path: string | null;
  rating_average: number;
  rating_count: number;
};

type DashboardData = {
  userId: string;
  customerProfile: CustomerProfileRow | null;
  restaurants: RestaurantRow[];
  activeOrders: number;
  savedAddresses: number;
  addresses: AddressRow[];
  recentOrders: RecentOrderRow[];
};

type CustomerProfileRow = {
  id: string;
  full_name: string | null;
  profile_photo_path: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
};

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category_id: string | null;
  image_path: string | null;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type AddressRow = {
  id: string;
  label: string | null;
  address_text: string;
  is_default: boolean;
};

type RecentOrderItemRow = {
  order_id: string;
  item_name: string;
  quantity: number;
  line_total: number;
};

type RecentOrderRow = {
  id: string;
  status: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  placed_at: string;
  restaurant_id: string;
  restaurant_name: string;
  driver_id: string | null;
  driver_profile_photo_path: string | null;
  driver_car_photo_path: string | null;
  driver_plate_photo_path: string | null;
  driver_license_plate: string | null;
  driver_vehicle_type: string | null;
  driver_rating_average: number;
  driver_rating_count: number;
  restaurant_rating_average: number;
  restaurant_rating_count: number;
  customer_driver_rating: OrderRatingRow | null;
  customer_restaurant_rating: OrderRatingRow | null;
  items: RecentOrderItemRow[];
};

type OrderRatingRow = {
  order_id: string;
  target_type: "driver" | "restaurant";
  target_id: string;
  stars: number;
  review: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPaymentStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRatingAverage(value: number) {
  return value > 0 ? value.toFixed(1) : "New";
}

function getRatingDraftKey(orderId: string, targetType: "driver" | "restaurant") {
  return `${orderId}:${targetType}`;
}

export function CustomerDashboardContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    data?: DashboardData;
    message?: string;
  }>({ status: "loading" });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [menuState, setMenuState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    categories: CategoryRow[];
    menuItems: MenuItemRow[];
    message?: string;
  }>({
    status: "idle",
    categories: [],
    menuItems: [],
  });
  const [cartRestaurantId, setCartRestaurantId] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [checkoutState, setCheckoutState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoPreviewUrl, setCustomerPhotoPreviewUrl] = useState("");
  const [profileState, setProfileState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { stars: string; review: string }>>(
    {},
  );
  const [ratingState, setRatingState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    orderId?: string;
    targetType?: "driver" | "restaurant";
  }>({ status: "idle" });

  async function uploadCustomerPhoto(file: File) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      throw new Error("No active session found.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/customer/upload-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    const payload = (await response.json()) as { path?: string; error?: string };

    if (!response.ok || !payload.path) {
      throw new Error(payload.error || "Unable to upload the customer photo right now.");
    }

    return payload.path;
  }

  async function loadDashboard() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error("No active session found.");
      }

      const [
        customerProfileResult,
        restaurantsResult,
        activeOrdersResult,
        savedAddressesResult,
        addressesResult,
        recentOrdersResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, profile_photo_path")
          .eq("id", session.user.id)
          .maybeSingle<CustomerProfileRow>(),
        supabase
          .from("restaurants")
          .select("id, name, description, address_text, is_open, image_path, rating_average, rating_count")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", session.user.id)
          .eq("payment_status", "paid")
          .in("status", ["placed", "confirmed", "preparing", "ready", "picked_up"]),
        supabase
          .from("customer_addresses")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", session.user.id),
        supabase
          .from("customer_addresses")
          .select("id, label, address_text, is_default")
          .eq("customer_id", session.user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(
            "id, status, payment_status, subtotal, delivery_fee, service_fee, total, placed_at, restaurant_id, driver_id, restaurants(name)",
          )
          .eq("customer_id", session.user.id)
          .order("placed_at", { ascending: false })
          .limit(5),
      ]);

      if (customerProfileResult.error) {
        throw customerProfileResult.error;
      }

      if (restaurantsResult.error) {
        throw restaurantsResult.error;
      }

      if (activeOrdersResult.error) {
        throw activeOrdersResult.error;
      }

      if (savedAddressesResult.error) {
        throw savedAddressesResult.error;
      }

      if (addressesResult.error) {
        throw addressesResult.error;
      }

      if (recentOrdersResult.error) {
        throw recentOrdersResult.error;
      }

      const restaurants = (restaurantsResult.data ?? []) as RestaurantRow[];
      const initialRestaurantId = restaurants[0]?.id ?? "";
      const addresses = (addressesResult.data ?? []) as AddressRow[];
      const preferredAddressId =
        addresses.find((address) => address.is_default)?.id ?? addresses[0]?.id ?? "";
      const rawRecentOrders =
        (recentOrdersResult.data as Array<{
          id: string;
          status: string;
          payment_status: string | null;
          subtotal: number | null;
          delivery_fee: number | null;
          service_fee: number | null;
          total: number;
          placed_at: string;
          restaurant_id: string;
          driver_id: string | null;
          restaurants: { name: string } | { name: string }[] | null;
        }> | null) ?? [];
      const orderIds = rawRecentOrders.map((order) => order.id);
      const driverIds = rawRecentOrders
        .map((order) => order.driver_id)
        .filter((value): value is string => Boolean(value));

      const recentOrderItemsResult =
        orderIds.length > 0
          ? await supabase
              .from("order_items")
              .select("order_id, item_name, quantity, line_total")
              .in("order_id", orderIds)
          : { data: [], error: null };

      if (recentOrderItemsResult.error) {
        throw recentOrderItemsResult.error;
      }

      const driversResult =
        driverIds.length > 0
          ? await supabase
              .from("drivers")
              .select(
                "user_id, license_plate, vehicle_type, profile_photo_path, car_photo_path, plate_photo_path, rating_average, rating_count",
              )
              .in("user_id", driverIds)
          : { data: [], error: null };

      if (driversResult.error) {
        throw driversResult.error;
      }

      const customerRatingsResult =
        orderIds.length > 0
          ? await supabase
              .from("order_ratings")
              .select("order_id, target_type, target_id, stars, review")
              .eq("rater_user_id", session.user.id)
              .in("order_id", orderIds)
          : { data: [], error: null };

      if (customerRatingsResult.error) {
        throw customerRatingsResult.error;
      }

      const recentOrderItems = (recentOrderItemsResult.data ?? []) as RecentOrderItemRow[];
      const driversByUserId = ((driversResult.data ?? []) as Array<{
        user_id: string;
        license_plate: string | null;
        vehicle_type: string | null;
        profile_photo_path: string | null;
        car_photo_path: string | null;
        plate_photo_path: string | null;
        rating_average: number | null;
        rating_count: number | null;
      }>).reduce<
        Record<
          string,
          {
            license_plate: string | null;
            vehicle_type: string | null;
            profile_photo_path: string | null;
            car_photo_path: string | null;
            plate_photo_path: string | null;
            rating_average: number;
            rating_count: number;
          }
        >
      >((accumulator, driver) => {
        accumulator[driver.user_id] = {
          license_plate: driver.license_plate,
          vehicle_type: driver.vehicle_type,
          profile_photo_path: driver.profile_photo_path,
          car_photo_path: driver.car_photo_path,
          plate_photo_path: driver.plate_photo_path,
          rating_average: Number(driver.rating_average ?? 0),
          rating_count: Number(driver.rating_count ?? 0),
        };
        return accumulator;
      }, {});
      const ratingsByOrderAndTarget = ((customerRatingsResult.data ?? []) as OrderRatingRow[]).reduce<
        Record<string, OrderRatingRow>
      >((accumulator, rating) => {
        accumulator[getRatingDraftKey(rating.order_id, rating.target_type)] = rating;
        return accumulator;
      }, {});
      const itemsByOrderId = recentOrderItems.reduce<Record<string, RecentOrderItemRow[]>>(
        (accumulator, item) => {
          accumulator[item.order_id] ??= [];
          accumulator[item.order_id].push(item);
          return accumulator;
        },
        {},
      );

      const recentOrders: RecentOrderRow[] = rawRecentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        payment_status: order.payment_status ?? "pending",
        subtotal: Number(order.subtotal ?? 0),
        delivery_fee: Number(order.delivery_fee ?? 0),
        service_fee: Number(order.service_fee ?? 0),
        total: Number(order.total),
        placed_at: order.placed_at,
        restaurant_id: order.restaurant_id,
        restaurant_name: Array.isArray(order.restaurants)
          ? (order.restaurants[0]?.name ?? "Restaurant")
          : (order.restaurants?.name ?? "Restaurant"),
        driver_id: order.driver_id,
        driver_profile_photo_path: order.driver_id
          ? (driversByUserId[order.driver_id]?.profile_photo_path ?? null)
          : null,
        driver_car_photo_path: order.driver_id
          ? (driversByUserId[order.driver_id]?.car_photo_path ?? null)
          : null,
        driver_plate_photo_path: order.driver_id
          ? (driversByUserId[order.driver_id]?.plate_photo_path ?? null)
          : null,
        driver_license_plate: order.driver_id
          ? (driversByUserId[order.driver_id]?.license_plate ?? null)
          : null,
        driver_vehicle_type: order.driver_id
          ? (driversByUserId[order.driver_id]?.vehicle_type ?? null)
          : null,
        driver_rating_average: order.driver_id
          ? (driversByUserId[order.driver_id]?.rating_average ?? 0)
          : 0,
        driver_rating_count: order.driver_id
          ? (driversByUserId[order.driver_id]?.rating_count ?? 0)
          : 0,
        restaurant_rating_average: restaurants.find((restaurant) => restaurant.id === order.restaurant_id)
          ?.rating_average ?? 0,
        restaurant_rating_count: restaurants.find((restaurant) => restaurant.id === order.restaurant_id)
          ?.rating_count ?? 0,
        customer_driver_rating: order.driver_id
          ? (ratingsByOrderAndTarget[getRatingDraftKey(order.id, "driver")] ?? null)
          : null,
        customer_restaurant_rating:
          ratingsByOrderAndTarget[getRatingDraftKey(order.id, "restaurant")] ?? null,
        items: itemsByOrderId[order.id] ?? [],
      }));

      setRatingDrafts(
        recentOrders.reduce<Record<string, { stars: string; review: string }>>((accumulator, order) => {
          if (order.customer_driver_rating) {
            accumulator[getRatingDraftKey(order.id, "driver")] = {
              stars: String(order.customer_driver_rating.stars),
              review: order.customer_driver_rating.review ?? "",
            };
          }

          if (order.customer_restaurant_rating) {
            accumulator[getRatingDraftKey(order.id, "restaurant")] = {
              stars: String(order.customer_restaurant_rating.stars),
              review: order.customer_restaurant_rating.review ?? "",
            };
          }

          return accumulator;
        }, {}),
      );
      setSelectedRestaurantId((current) => current || initialRestaurantId);
      setSelectedAddressId((current) => current || preferredAddressId);
      setState({
        status: "ready",
        data: {
          userId: session.user.id,
          customerProfile: customerProfileResult.data ?? null,
          restaurants,
          activeOrders: activeOrdersResult.count ?? 0,
          savedAddresses: savedAddressesResult.count ?? 0,
          addresses,
          recentOrders,
        },
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load customer dashboard data right now.",
      });
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [supabase]);

  useEffect(() => {
    if (!customerPhotoFile) {
      setCustomerPhotoPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(customerPhotoFile);
    setCustomerPhotoPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [customerPhotoFile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStateParam = params.get("checkout");
    const sessionId = params.get("session_id");
    const cancelledOrderId = params.get("order_id");

    if (!checkoutStateParam) {
      return;
    }

    let isMounted = true;

    async function syncCheckoutState() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No active session found.");
        }

        if (checkoutStateParam === "success" && sessionId) {
          const response = await fetch("/api/checkout/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          });
          const payload = (await response.json()) as { paymentStatus?: string; error?: string };

          if (!response.ok) {
            throw new Error(payload.error || "Unable to confirm your payment.");
          }

          if (!isMounted) {
            return;
          }

          setCheckoutState({
            status: payload.paymentStatus === "paid" ? "success" : "error",
            message:
              payload.paymentStatus === "paid"
                ? "Payment confirmed. Your order is now live for the restaurant."
                : "Payment is still processing. Refresh in a moment if it does not update.",
          });
        }

        if (checkoutStateParam === "cancelled" && cancelledOrderId) {
          const response = await fetch("/api/checkout/cancel", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ orderId: cancelledOrderId }),
          });
          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            throw new Error(payload.error || "Unable to cancel your pending checkout.");
          }

          if (!isMounted) {
            return;
          }

          setCheckoutState({
            status: "error",
            message: "Checkout was cancelled. Your order was not sent to the restaurant.",
          });
        }

        await loadDashboard();

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("checkout");
        nextUrl.searchParams.delete("session_id");
        nextUrl.searchParams.delete("order_id");
        window.history.replaceState({}, "", nextUrl.toString());
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCheckoutState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Unable to sync your Stripe checkout state.",
        });
      }
    }

    void syncCheckoutState();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSaveCustomerPhoto() {
    const userId = state.data?.userId;

    if (!userId) {
      return;
    }

    if (!customerPhotoFile) {
      setProfileState({
        status: "error",
        message: "Choose a profile photo before saving.",
      });
      return;
    }

    setProfileState({ status: "submitting" });

    try {
      const profilePhotoPath = await uploadCustomerPhoto(customerPhotoFile);
      const { error } = await (supabase.from("profiles") as any)
        .update({ profile_photo_path: profilePhotoPath })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      setProfileState({
        status: "success",
        message: "Customer profile photo saved.",
      });
      setCustomerPhotoFile(null);
      await loadDashboard();
    } catch (error) {
      setProfileState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to save the customer photo right now.",
      });
    }
  }

  async function handleSubmitCustomerRating(
    order: RecentOrderRow,
    targetType: "driver" | "restaurant",
  ) {
    const draftKey = getRatingDraftKey(order.id, targetType);
    const draft = ratingDrafts[draftKey];
    const stars = Number(draft?.stars ?? "0");
    const targetId = targetType === "driver" ? order.driver_id : order.restaurant_id;

    if (!targetId) {
      return;
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      setRatingState({
        status: "error",
        orderId: order.id,
        targetType,
        message: "Choose a star rating from 1 to 5.",
      });
      return;
    }

    setRatingState({
      status: "submitting",
      orderId: order.id,
      targetType,
    });

    const { error } = await (supabase.from("order_ratings") as any).upsert(
      {
        order_id: order.id,
        rater_user_id: state.data?.userId,
        rater_role: "customer",
        target_type: targetType,
        target_id: targetId,
        stars,
        review: draft?.review?.trim() ? draft.review.trim() : null,
      },
      { onConflict: "order_id,rater_user_id,target_type,target_id" },
    );

    if (error) {
      setRatingState({
        status: "error",
        orderId: order.id,
        targetType,
        message: error.message,
      });
      return;
    }

    setRatingState({
      status: "success",
      orderId: order.id,
      targetType,
      message: `${targetType === "driver" ? "Driver" : "Restaurant"} rating saved.`,
    });
    await loadDashboard();
  }

  const restaurants = state.data?.restaurants ?? [];
  const customerProfile = state.data?.customerProfile ?? null;
  const addresses = state.data?.addresses ?? [];
  const recentOrders = state.data?.recentOrders ?? [];
  const openRestaurants = restaurants.filter((restaurant) => restaurant.is_open).length;
  const selectedRestaurant =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? restaurants[0] ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadRestaurantMenu() {
      if (!selectedRestaurantId) {
        setMenuState({
          status: "idle",
          categories: [],
          menuItems: [],
        });
        setSelectedCategoryId("all");
        return;
      }

      setMenuState((current) => ({
        ...current,
        status: "loading",
        message: undefined,
      }));

      const [categoriesResult, menuItemsResult] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name, sort_order")
          .eq("restaurant_id", selectedRestaurantId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("id, name, description, price, is_available, category_id, image_path")
          .eq("restaurant_id", selectedRestaurantId)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (categoriesResult.error) {
        setMenuState({
          status: "error",
          categories: [],
          menuItems: [],
          message: categoriesResult.error.message,
        });
        return;
      }

      if (menuItemsResult.error) {
        setMenuState({
          status: "error",
          categories: [],
          menuItems: [],
          message: menuItemsResult.error.message,
        });
        return;
      }

      setSelectedCategoryId("all");
      setMenuState({
        status: "ready",
        categories: categoriesResult.data ?? [],
        menuItems: menuItemsResult.data ?? [],
      });
    }

    void loadRestaurantMenu();

    return () => {
      isMounted = false;
    };
  }, [selectedRestaurantId, supabase]);

  const filteredMenuItems =
    selectedCategoryId === "all"
      ? menuState.menuItems
      : menuState.menuItems.filter((item) => item.category_id === selectedCategoryId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const customerPhotoUrl = getCustomerMediaPublicUrl(customerProfile?.profile_photo_path);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const checkoutPricing = calculateOrderPricing(cartSubtotal);
  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ?? addresses[0] ?? null;
  const selectedRestaurantMenuCount = menuState.menuItems.length;
  const selectedRestaurantAvailableCount = menuState.menuItems.filter((item) => item.is_available).length;
  const completedOrderCount = recentOrders.filter((order) => order.payment_status === "paid").length;

  function handleSelectRestaurant(restaurantId: string) {
    setSelectedRestaurantId(restaurantId);

    if (cartRestaurantId && cartRestaurantId !== restaurantId) {
      setCartRestaurantId("");
      setCartItems([]);
    }
  }

  function handleAddToCart(item: MenuItemRow) {
    setCartRestaurantId(selectedRestaurantId);
    setCartItems((current) => {
      const existingItem = current.find((cartItem) => cartItem.id === item.id);

      if (!existingItem) {
        return [
          ...current,
          {
            id: item.id,
            name: item.name,
            price: Number(item.price),
            quantity: 1,
          },
        ];
      }

      return current.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem,
      );
    });
  }

  function handleUpdateCartQuantity(itemId: string, nextQuantity: number) {
    setCartItems((current) => {
      if (nextQuantity <= 0) {
        return current.filter((item) => item.id !== itemId);
      }

      return current.map((item) =>
        item.id === itemId ? { ...item, quantity: nextQuantity } : item,
      );
    });
  }

  async function handleCheckout() {
    if (!selectedRestaurantId || cartItems.length === 0) {
      return;
    }

    setCheckoutState({
      status: "submitting",
      message: undefined,
    });

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error("No active session found.");
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          restaurantId: selectedRestaurantId,
          deliveryAddressId: selectedAddressId || null,
          notes: orderNotes || null,
          items: cartItems.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Unable to start Stripe checkout.");
      }

      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setCheckoutState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to place your order right now.",
      });
    }
  }

  return (
    <DashboardShell
      eyebrow="Customer dashboard"
      title="Pick a food place, build your cart, and check out faster."
      description="Browse live restaurants, jump into the menu you want, and place a real Dalbo order with Stripe-backed checkout."
      stats={[
        {
          label: "Open places",
          value: state.status === "loading" ? "..." : String(openRestaurants),
        },
        {
          label: "Saved addresses",
          value: state.status === "loading" ? "..." : String(state.data?.savedAddresses ?? 0),
        },
        {
          label: "Cart items",
          value: String(cartCount),
        },
      ]}
      actions={[
        {
          title: "Choose a restaurant card",
          description: "Tap any food place below to refresh the featured menu and start building an order.",
        },
        {
          title: "Use category chips",
          description: "Filter quickly between menu sections and add items without leaving the page.",
        },
        {
          title: "Review and pay",
          description: "Your cart stays visible beside the menu so checkout feels more like a real ordering app.",
        },
      ]}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Marketplace</h2>
          <p className="text-sm leading-6 text-slate-600">
            Browse live food places, open a menu, and keep your cart moving from selection to
            checkout in one flow.
          </p>
        </div>

        {state.status === "loading" ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Loading restaurants from Supabase...
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.message}
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <section className="overflow-hidden rounded-[32px] bg-[#0b1020] text-white">
              <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                <div className="space-y-4">
                  <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-orange-200">
                    Browse all food places
                  </span>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      {selectedRestaurant
                        ? `Selected restaurant: ${selectedRestaurant.name}`
                        : "Choose from all restaurants"}
                    </h3>
                    <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                      {selectedRestaurant?.description ||
                        "Browse restaurants, compare menus, and head to checkout without leaving the customer dashboard."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                      {openRestaurants} open now
                    </span>
                    <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                      {state.data?.savedAddresses ?? 0} saved addresses
                    </span>
                    <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                      {recentOrders.length} recent orders
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                    <p className="text-sm font-semibold text-orange-200">Delivery spot</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {selectedAddress?.label || "Choose address"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {selectedAddress?.address_text ||
                        "Select a saved delivery address before checking out."}
                    </p>
                  </article>
                  <article className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                    <p className="text-sm font-semibold text-orange-200">Ready to browse</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {selectedRestaurant ? selectedRestaurantMenuCount : 0} menu items
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {selectedRestaurantAvailableCount} available right now from the selected food
                      place.
                    </p>
                  </article>
                </div>
              </div>
            </section>

            {restaurants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
                <h3 className="font-semibold">No restaurants yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Insert at least one row into `public.restaurants` to populate the customer
                  marketplace.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">Choose a food place</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Pick from the restaurants below to refresh the featured menu.
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{restaurants.length} available</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {restaurants.map((restaurant) => {
                      const isSelected = restaurant.id === selectedRestaurantId;

                      return (
                        <button
                          key={restaurant.id}
                          type="button"
                          onClick={() => handleSelectRestaurant(restaurant.id)}
                          className={`rounded-[28px] border p-5 text-left transition ${
                            isSelected
                              ? "border-orange-300 bg-orange-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-orange-200 hover:bg-[#fffaf5]"
                          }`}
                        >
                          {restaurant.image_path ? (
                            <img
                              src={getFoodMediaPublicUrl(restaurant.image_path) ?? ""}
                              alt={restaurant.name}
                              className="mb-4 h-40 w-full rounded-[22px] object-cover"
                            />
                          ) : (
                            <div className="mb-4 flex h-40 items-center justify-center rounded-[22px] bg-[#fff7f1] text-sm font-semibold text-orange-600">
                              No cover photo yet
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-slate-900">{restaurant.name}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {restaurant.description ||
                                  "Add a restaurant description in Supabase to show cuisine, style, or offers."}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                restaurant.is_open
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {restaurant.is_open ? "Open now" : "Closed"}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                            <span>
                              {formatRatingAverage(restaurant.rating_average)} stars ({restaurant.rating_count})
                            </span>
                            <span className="font-semibold text-orange-600">
                              {isSelected ? "Selected" : "View menu"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-6">
                    <section className="rounded-[32px] border border-slate-200 bg-white p-6">
                      {selectedRestaurant ? (
                        <div className="space-y-6">
                          {selectedRestaurant.image_path ? (
                            <img
                              src={getFoodMediaPublicUrl(selectedRestaurant.image_path) ?? ""}
                              alt={selectedRestaurant.name}
                              className="h-56 w-full rounded-[28px] object-cover"
                            />
                          ) : null}
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                  Selected restaurant
                                </span>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    selectedRestaurant.is_open
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {selectedRestaurant.is_open ? "Taking orders" : "Currently closed"}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-3xl font-semibold tracking-tight">
                                  {selectedRestaurant.name}
                                </h3>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                                  {selectedRestaurant.description ||
                                    "This restaurant is ready to appear here once a richer description is added in Supabase."}
                                </p>
                              </div>
                              <p className="text-sm text-slate-500">
                                {selectedRestaurant.address_text || "Address not added yet"}
                              </p>
                              <p className="text-sm font-medium text-slate-600">
                                Rating: {formatRatingAverage(selectedRestaurant.rating_average)} stars (
                                {selectedRestaurant.rating_count})
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[320px] lg:grid-cols-1">
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  Available items
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-900">
                                  {selectedRestaurantAvailableCount}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  Categories
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-900">
                                  {menuState.categories.length}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  In your cart
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-900">{cartCount}</p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  Rating
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-900">
                                  {formatRatingAverage(selectedRestaurant.rating_average)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedCategoryId("all")}
                              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                selectedCategoryId === "all"
                                  ? "bg-[#ff6200] text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              All menu
                            </button>
                            {menuState.categories.map((category) => (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => setSelectedCategoryId(category.id)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                  selectedCategoryId === category.id
                                    ? "bg-[#ff6200] text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {category.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-6">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">Menu</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Add available dishes to your cart and keep building the order.
                          </p>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {filteredMenuItems.length} items shown
                        </p>
                      </div>

                      {menuState.status === "loading" ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          Loading categories and menu items...
                        </div>
                      ) : null}

                      {menuState.status === "error" ? (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          {menuState.message}
                        </div>
                      ) : null}

                      {menuState.status === "ready" && filteredMenuItems.length === 0 ? (
                        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                          No menu items found for this restaurant yet.
                        </div>
                      ) : null}

                      {menuState.status === "ready" && filteredMenuItems.length > 0 ? (
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                          {filteredMenuItems.map((item) => {
                            const itemQuantityInCart =
                              cartItems.find((cartItem) => cartItem.id === item.id)?.quantity ?? 0;

                            return (
                              <article
                                key={item.id}
                                className="rounded-[28px] border border-slate-200 bg-[#fffaf5] p-5"
                              >
                                {item.image_path ? (
                                  <img
                                    src={getFoodMediaPublicUrl(item.image_path) ?? ""}
                                    alt={item.name}
                                    className="mb-4 h-44 w-full rounded-[22px] object-cover"
                                  />
                                ) : (
                                  <div className="mb-4 flex h-44 items-center justify-center rounded-[22px] bg-white text-sm font-semibold text-slate-400">
                                    Photo coming soon
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-lg font-semibold text-slate-900">{item.name}</h4>
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                          item.is_available
                                            ? "bg-green-100 text-green-700"
                                            : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {item.is_available ? "Available" : "Unavailable"}
                                      </span>
                                    </div>
                                    <p className="text-sm leading-6 text-slate-600">
                                      {item.description || "No description yet."}
                                    </p>
                                  </div>
                                  {itemQuantityInCart > 0 ? (
                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                      {itemQuantityInCart} in cart
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Price
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">
                                      {formatCurrency(Number(item.price))}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(item)}
                                    disabled={!item.is_available || !selectedRestaurant?.is_open}
                                    className="rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Add to cart
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-6">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">Recent orders</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Orders placed from this dashboard appear here after checkout.
                          </p>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {recentOrders.length} recent orders
                        </p>
                      </div>

                      {recentOrders.length === 0 ? (
                        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                          No orders yet.
                        </div>
                      ) : (
                        <div className="mt-5 grid gap-4">
                          {recentOrders.map((order) => {
                            const driverPhotoUrl = getDriverMediaPublicUrl(order.driver_profile_photo_path);
                            const driverCarPhotoUrl = getDriverMediaPublicUrl(order.driver_car_photo_path);
                            const driverPlatePhotoUrl = getDriverMediaPublicUrl(order.driver_plate_photo_path);
                            const driverDraftKey = getRatingDraftKey(order.id, "driver");
                            const restaurantDraftKey = getRatingDraftKey(order.id, "restaurant");
                            const driverDraft = ratingDrafts[driverDraftKey] ?? { stars: "", review: "" };
                            const restaurantDraft = ratingDrafts[restaurantDraftKey] ?? {
                              stars: "",
                              review: "",
                            };

                            return (
                              <article key={order.id} className="rounded-2xl bg-slate-50 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <p className="font-semibold">{order.restaurant_name}</p>
                                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                        {formatStatus(order.status)}
                                      </span>
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                          order.payment_status === "paid"
                                            ? "bg-green-100 text-green-700"
                                            : order.payment_status === "pending"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {formatPaymentStatus(order.payment_status)}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                      Placed {formatDateTime(order.placed_at)}
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatCurrency(order.total)}
                                  </p>
                                </div>
                                <p className="mt-3 text-sm text-slate-600">
                                  Items {formatCurrency(order.subtotal)} + service{" "}
                                  {formatCurrency(order.service_fee)} + delivery{" "}
                                  {formatCurrency(order.delivery_fee)}
                                </p>

                                <div className="mt-4 grid gap-2">
                                  {order.items.map((item) => (
                                    <div
                                      key={`${order.id}-${item.item_name}`}
                                      className="flex items-center justify-between gap-3 text-sm text-slate-600"
                                    >
                                      <span>
                                        {item.quantity} x {item.item_name}
                                      </span>
                                      <span>{formatCurrency(Number(item.line_total))}</span>
                                    </div>
                                  ))}
                                </div>

                                {order.driver_id ? (
                                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          Assigned driver
                                        </p>
                                        <p className="mt-1 text-sm text-slate-600">
                                          Check the driver photo, car picture, and plate before pickup.
                                        </p>
                                      </div>
                                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                        {order.driver_vehicle_type || "Vehicle assigned"}
                                      </span>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-slate-600">
                                      Driver rating: {formatRatingAverage(order.driver_rating_average)} stars (
                                      {order.driver_rating_count})
                                    </p>

                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                      <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                          Driver
                                        </p>
                                        {driverPhotoUrl ? (
                                          <img
                                            src={driverPhotoUrl}
                                            alt="Assigned driver"
                                            className="mt-3 h-40 w-full rounded-2xl object-cover"
                                          />
                                        ) : (
                                          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                                            Driver photo not uploaded yet.
                                          </div>
                                        )}
                                      </div>

                                      <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                          Car
                                        </p>
                                        {driverCarPhotoUrl ? (
                                          <img
                                            src={driverCarPhotoUrl}
                                            alt="Assigned car"
                                            className="mt-3 h-40 w-full rounded-2xl object-cover"
                                          />
                                        ) : (
                                          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                                            Car picture not uploaded yet.
                                          </div>
                                        )}
                                      </div>

                                      <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                          Plate
                                        </p>
                                        {driverPlatePhotoUrl ? (
                                          <img
                                            src={driverPlatePhotoUrl}
                                            alt="Assigned plate"
                                            className="mt-3 h-40 w-full rounded-2xl object-cover"
                                          />
                                        ) : (
                                          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                                            Plate picture not uploaded yet.
                                          </div>
                                        )}
                                        <p className="mt-3 text-sm font-semibold text-slate-900">
                                          Plate number: {order.driver_license_plate || "Not added yet"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {order.status === "delivered" ? (
                                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                    {order.driver_id ? (
                                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                              Rate driver
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                              Share how the driver handled your delivery.
                                            </p>
                                          </div>
                                          {order.customer_driver_rating ? (
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                              Saved
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="mt-4 space-y-3">
                                          <select
                                            value={driverDraft.stars}
                                            onChange={(event) =>
                                              setRatingDrafts((current) => ({
                                                ...current,
                                                [driverDraftKey]: {
                                                  ...driverDraft,
                                                  stars: event.target.value,
                                                },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                                          >
                                            <option value="">Select stars</option>
                                            {[5, 4, 3, 2, 1].map((value) => (
                                              <option key={value} value={value}>
                                                {value} star{value === 1 ? "" : "s"}
                                              </option>
                                            ))}
                                          </select>
                                          <textarea
                                            value={driverDraft.review}
                                            onChange={(event) =>
                                              setRatingDrafts((current) => ({
                                                ...current,
                                                [driverDraftKey]: {
                                                  ...driverDraft,
                                                  review: event.target.value,
                                                },
                                              }))
                                            }
                                            rows={3}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                                            placeholder="Optional review for the driver"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleSubmitCustomerRating(order, "driver")}
                                            disabled={
                                              ratingState.status === "submitting" &&
                                              ratingState.orderId === order.id &&
                                              ratingState.targetType === "driver"
                                            }
                                            className="rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
                                          >
                                            {ratingState.status === "submitting" &&
                                            ratingState.orderId === order.id &&
                                            ratingState.targetType === "driver"
                                              ? "Saving..."
                                              : "Save driver rating"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}

                                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">
                                            Rate restaurant
                                          </p>
                                          <p className="mt-1 text-sm text-slate-600">
                                            Share how the restaurant handled the order.
                                          </p>
                                        </div>
                                        {order.customer_restaurant_rating ? (
                                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                            Saved
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-3 text-sm font-medium text-slate-600">
                                        Restaurant rating: {formatRatingAverage(order.restaurant_rating_average)} stars
                                        ({order.restaurant_rating_count})
                                      </p>
                                      <div className="mt-4 space-y-3">
                                        <select
                                          value={restaurantDraft.stars}
                                          onChange={(event) =>
                                            setRatingDrafts((current) => ({
                                              ...current,
                                              [restaurantDraftKey]: {
                                                ...restaurantDraft,
                                                stars: event.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                                        >
                                          <option value="">Select stars</option>
                                          {[5, 4, 3, 2, 1].map((value) => (
                                            <option key={value} value={value}>
                                              {value} star{value === 1 ? "" : "s"}
                                            </option>
                                          ))}
                                        </select>
                                        <textarea
                                          value={restaurantDraft.review}
                                          onChange={(event) =>
                                            setRatingDrafts((current) => ({
                                              ...current,
                                              [restaurantDraftKey]: {
                                                ...restaurantDraft,
                                                review: event.target.value,
                                              },
                                            }))
                                          }
                                          rows={3}
                                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                                          placeholder="Optional review for the restaurant"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSubmitCustomerRating(order, "restaurant")}
                                          disabled={
                                            ratingState.status === "submitting" &&
                                            ratingState.orderId === order.id &&
                                            ratingState.targetType === "restaurant"
                                          }
                                          className="rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
                                        >
                                          {ratingState.status === "submitting" &&
                                          ratingState.orderId === order.id &&
                                          ratingState.targetType === "restaurant"
                                            ? "Saving..."
                                            : "Save restaurant rating"}
                                        </button>
                                      </div>
                                    </div>
                                    {ratingState.message && ratingState.orderId === order.id ? (
                                      <p
                                        className={`lg:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                                          ratingState.status === "error"
                                            ? "bg-red-50 text-red-700"
                                            : "bg-green-50 text-green-700"
                                        }`}
                                      >
                                        {ratingState.message}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="space-y-6 xl:sticky xl:top-6">
                    <section className="rounded-[32px] border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">Your profile</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Add a customer profile picture for your Dalbo account.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                          {customerPhotoPreviewUrl || customerPhotoUrl ? (
                            <img
                              src={customerPhotoPreviewUrl || customerPhotoUrl || ""}
                              alt={customerProfile?.full_name || "Customer profile"}
                              className="h-56 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-56 items-center justify-center text-sm font-semibold text-slate-500">
                              No customer photo yet
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          {customerProfile?.full_name || "Customer account"}
                        </div>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            Profile picture
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => setCustomerPhotoFile(event.target.files?.[0] ?? null)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 focus:border-orange-400"
                          />
                        </label>

                        {profileState.message ? (
                          <p
                            className={`rounded-2xl px-4 py-3 text-sm ${
                              profileState.status === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {profileState.message}
                          </p>
                        ) : null}

                        <button
                          type="button"
                          onClick={handleSaveCustomerPhoto}
                          disabled={profileState.status === "submitting"}
                          className="w-full rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
                        >
                          {profileState.status === "submitting"
                            ? "Saving photo..."
                            : "Save profile picture"}
                        </button>
                      </div>
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">Your cart</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            {cartRestaurantId && selectedRestaurant
                              ? `Ordering from ${selectedRestaurant.name}`
                              : "Add items to begin an order."}
                          </p>
                        </div>
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {cartCount} items
                        </span>
                      </div>

                      {cartItems.length === 0 ? (
                        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                          Your cart is empty.
                        </div>
                      ) : (
                        <div className="mt-5 space-y-4">
                        {cartItems.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {formatCurrency(item.price)} each
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateCartQuantity(item.id, item.quantity - 1)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                              >
                                -
                              </button>
                              <span className="min-w-8 text-center text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateCartQuantity(item.id, item.quantity + 1)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="rounded-2xl bg-[#0b1020] p-4 text-white">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                              <span>Subtotal</span>
                              <span>{formatCurrency(checkoutPricing.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                              <span>Service fee</span>
                              <span>{formatCurrency(checkoutPricing.serviceFee)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                              <span>Delivery fee</span>
                              <span>{formatCurrency(checkoutPricing.deliveryFee)}</span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-700 pt-4">
                            <span className="text-sm text-slate-200">Estimated total</span>
                            <span className="text-lg font-semibold">
                              {formatCurrency(checkoutPricing.total)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            Card payment opens Stripe checkout. Only paid orders move into the live
                            order flow for the restaurant.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              Delivery address
                            </span>
                            <select
                              value={selectedAddressId}
                              onChange={(event) => setSelectedAddressId(event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                            >
                              <option value="">No saved address yet</option>
                              {addresses.map((address) => (
                                <option key={address.id} value={address.id}>
                                  {address.label ? `${address.label} - ` : ""}
                                  {address.address_text}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="mt-4 block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              Delivery notes
                            </span>
                            <textarea
                              value={orderNotes}
                              onChange={(event) => setOrderNotes(event.target.value)}
                              className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                              placeholder="Leave at the door, call on arrival, or add special instructions."
                            />
                          </label>

                          {checkoutState.message ? (
                            <p
                              className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                                checkoutState.status === "error"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              {checkoutState.message}
                            </p>
                          ) : null}

                          <button
                            type="button"
                            onClick={handleCheckout}
                            disabled={
                              checkoutState.status === "submitting" ||
                              !selectedRestaurant?.is_open ||
                              cartItems.length === 0
                            }
                            className="mt-4 w-full rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {checkoutState.status === "submitting"
                              ? "Opening checkout..."
                              : selectedRestaurant?.is_open
                                ? "Pay with card"
                                : "Restaurant is closed"}
                          </button>
                        </div>
                        </div>
                      )}
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

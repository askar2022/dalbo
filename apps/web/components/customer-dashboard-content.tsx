"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type RestaurantRow = {
  id: string;
  name: string;
  description: string | null;
  address_text: string | null;
  is_open: boolean;
};

type DashboardData = {
  restaurants: RestaurantRow[];
  activeOrders: number;
  savedAddresses: number;
  addresses: AddressRow[];
  recentOrders: RecentOrderRow[];
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
  total: number;
  placed_at: string;
  restaurant_id: string;
  restaurant_name: string;
  items: RecentOrderItemRow[];
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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
        restaurantsResult,
        activeOrdersResult,
        savedAddressesResult,
        addressesResult,
        recentOrdersResult,
      ] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, description, address_text, is_open")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", session.user.id)
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
          .select("id, status, total, placed_at, restaurant_id, restaurants(name)")
          .eq("customer_id", session.user.id)
          .order("placed_at", { ascending: false })
          .limit(5),
      ]);

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
          total: number;
          placed_at: string;
          restaurant_id: string;
          restaurants: { name: string } | { name: string }[] | null;
        }> | null) ?? [];
      const orderIds = rawRecentOrders.map((order) => order.id);

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

      const recentOrderItems = (recentOrderItemsResult.data ?? []) as RecentOrderItemRow[];
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
        total: Number(order.total),
        placed_at: order.placed_at,
        restaurant_id: order.restaurant_id,
        restaurant_name: Array.isArray(order.restaurants)
          ? (order.restaurants[0]?.name ?? "Restaurant")
          : (order.restaurants?.name ?? "Restaurant"),
        items: itemsByOrderId[order.id] ?? [],
      }));

      setSelectedRestaurantId((current) => current || initialRestaurantId);
      setSelectedAddressId((current) => current || preferredAddressId);
      setState({
        status: "ready",
        data: {
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

  const restaurants = state.data?.restaurants ?? [];
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
          .select("id, name, description, price, is_available, category_id")
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
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const deliveryFee = 3.99;

      const { data: order, error: orderError } = await (supabase
        .from("orders") as any)
        .insert({
          customer_id: session.user.id,
          restaurant_id: selectedRestaurantId,
          delivery_address_id: selectedAddressId || null,
          status: "placed",
          subtotal,
          delivery_fee: deliveryFee,
          notes: orderNotes || null,
        })
        .select("id")
        .single();

      if (orderError) {
        throw orderError;
      }

      const { error: orderItemsError } = await (supabase.from("order_items") as any).insert(
        cartItems.map((item) => ({
          order_id: order.id,
          menu_item_id: item.id,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      );

      if (orderItemsError) {
        throw orderItemsError;
      }

      setCartItems([]);
      setCartRestaurantId("");
      setOrderNotes("");
      setCheckoutState({
        status: "success",
        message: "Order placed successfully. The restaurant dashboard can now see it.",
      });
      await loadDashboard();
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
      title="Order food, track deliveries, and manage saved addresses."
      description="This dashboard now reads from Supabase so customers can choose a food place, browse menu items, and build a cart before checkout is wired."
      stats={[
        {
          label: "Food places",
          value: state.status === "loading" ? "..." : String(restaurants.length),
        },
        {
          label: "Active orders",
          value: state.status === "loading" ? "..." : String(state.data?.activeOrders ?? 0),
        },
        {
          label: "Cart items",
          value: String(cartCount),
        },
      ]}
      actions={[
        {
          title: "Pick a restaurant",
          description: "The selected restaurant now controls which categories and menu items are shown below.",
        },
        {
          title: "Build the cart",
          description: "Customers can now add menu items locally and submit a real order into Supabase.",
        },
        {
          title: "Track recent orders",
          description: "Placed orders now appear below so customers can confirm that checkout worked.",
        },
      ]}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Marketplace and menu browser</h2>
          <p className="text-sm leading-6 text-slate-600">
            This section is connected to `public.restaurants`, `public.menu_categories`, and
            `public.menu_items`, so customers can move from browsing restaurants into a real menu.
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
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-orange-50 p-4">
                <h3 className="font-semibold">Open right now</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {openRestaurants} of {restaurants.length} food places are currently marked open.
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold">Saved addresses</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You already have {state.data?.savedAddresses ?? 0} saved address entries linked
                  to this customer profile.
                </p>
              </article>
            </div>

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
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Select restaurant
                        </span>
                        <select
                          value={selectedRestaurantId}
                          onChange={(event) => handleSelectRestaurant(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                        >
                          {restaurants.map((restaurant) => (
                            <option key={restaurant.id} value={restaurant.id}>
                              {restaurant.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedRestaurant ? (
                        <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{selectedRestaurant.name}</h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                selectedRestaurant.is_open
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {selectedRestaurant.is_open ? "Open" : "Closed"}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-slate-600">
                            {selectedRestaurant.description ||
                              "Add a restaurant description in Supabase to show cuisine, style, or special offers."}
                          </p>
                          <p className="text-sm text-slate-600">
                            {selectedRestaurant.address_text || "Address not added yet"}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Menu</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Browse available categories and add items to the cart.
                          </p>
                        </div>

                        <select
                          value={selectedCategoryId}
                          onChange={(event) => setSelectedCategoryId(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                          disabled={menuState.status !== "ready"}
                        >
                          <option value="all">All categories</option>
                          {menuState.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
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
                        <div className="mt-5 grid gap-4">
                          {filteredMenuItems.map((item) => (
                            <article
                              key={item.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-semibold">{item.name}</h4>
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
                                  <p className="text-sm font-semibold text-slate-900">
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
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <aside className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Cart</h3>
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
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-200">Estimated subtotal</span>
                            <span className="text-lg font-semibold">
                              {formatCurrency(cartTotal)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-300">
                            Delivery fee is currently fixed for the MVP. The button below now
                            creates `orders` and `order_items` in Supabase.
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
                            disabled={checkoutState.status === "submitting"}
                            className="mt-4 w-full rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {checkoutState.status === "submitting"
                              ? "Placing order..."
                              : "Place order"}
                          </button>
                        </div>
                      </div>
                    )}
                  </aside>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Recent orders</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Orders placed from this dashboard appear here immediately after checkout.
                      </p>
                    </div>
                  </div>

                  {recentOrders.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      No orders yet.
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4">
                      {recentOrders.map((order) => (
                        <article key={order.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold">{order.restaurant_name}</p>
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                  {formatStatus(order.status)}
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
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

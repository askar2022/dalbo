"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type RestaurantRow = {
  id: string;
  name: string;
  description: string | null;
  address_text: string | null;
  is_open: boolean;
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

type FoodPlaceDashboardData = {
  restaurants: RestaurantRow[];
  categories: CategoryRow[];
  menuItems: MenuItemRow[];
  openOrders: number;
  incomingOrders: IncomingOrderRow[];
};

type IncomingOrderItemRow = {
  order_id: string;
  item_name: string;
  quantity: number;
  line_total: number;
};

type IncomingOrderRow = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  placed_at: string;
  notes: string | null;
  items: IncomingOrderItemRow[];
};

const initialRestaurantForm = {
  name: "",
  description: "",
  phone: "",
  addressText: "",
  latitude: "",
  longitude: "",
};

const initialCategoryForm = {
  name: "",
  sortOrder: "0",
};

const initialMenuItemForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
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

function getNextOrderStatus(status: string) {
  if (status === "placed") return "confirmed";
  if (status === "confirmed") return "preparing";
  if (status === "preparing") return "ready";
  return null;
}

export function FoodPlaceDashboardContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    data?: FoodPlaceDashboardData;
    userId?: string;
    message?: string;
  }>({ status: "loading" });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [menuItemForm, setMenuItemForm] = useState(initialMenuItemForm);
  const [formState, setFormState] = useState<{
    type?: "restaurant" | "category" | "menuItem";
    status?: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [orderState, setOrderState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    orderId?: string;
  }>({ status: "idle" });

  async function loadDashboard(preferredRestaurantId?: string) {
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

      const { data: restaurants, error: restaurantsError } = await supabase
        .from("restaurants")
        .select("id, name, description, address_text, is_open")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (restaurantsError) {
        throw restaurantsError;
      }

      const restaurantRows = (restaurants ?? []) as RestaurantRow[];
      const resolvedRestaurantId =
        preferredRestaurantId && restaurantRows.some((restaurant) => restaurant.id === preferredRestaurantId)
          ? preferredRestaurantId
          : restaurantRows[0]?.id ?? "";

      const [categoriesResult, menuItemsResult, openOrdersResult, incomingOrdersResult] = await Promise.all([
        resolvedRestaurantId
          ? supabase
              .from("menu_categories")
              .select("id, name, sort_order")
              .eq("restaurant_id", resolvedRestaurantId)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        resolvedRestaurantId
          ? supabase
              .from("menu_items")
              .select("id, name, description, price, is_available, category_id")
              .eq("restaurant_id", resolvedRestaurantId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        restaurantRows.length > 0
          ? supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .in(
                "restaurant_id",
                restaurantRows.map((restaurant) => restaurant.id),
              )
              .in("status", ["placed", "confirmed", "preparing", "ready", "picked_up"])
          : Promise.resolve({ count: 0, error: null }),
        restaurantRows.length > 0
          ? supabase
              .from("orders")
              .select(
                "id, restaurant_id, status, subtotal, delivery_fee, total, placed_at, notes, restaurants(name)",
              )
              .in(
                "restaurant_id",
                restaurantRows.map((restaurant) => restaurant.id),
              )
              .in("status", ["placed", "confirmed", "preparing", "ready", "picked_up"])
              .order("placed_at", { ascending: false })
              .limit(12)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (menuItemsResult.error) {
        throw menuItemsResult.error;
      }

      if (openOrdersResult.error) {
        throw openOrdersResult.error;
      }

      if (incomingOrdersResult.error) {
        throw incomingOrdersResult.error;
      }

      const rawOrders =
        (incomingOrdersResult.data as Array<{
          id: string;
          restaurant_id: string;
          status: string;
          subtotal: number;
          delivery_fee: number;
          total: number;
          placed_at: string;
          notes: string | null;
          restaurants: { name: string } | { name: string }[] | null;
        }> | null) ?? [];
      const orderIds = rawOrders.map((order) => order.id);
      const orderItemsResult =
        orderIds.length > 0
          ? await supabase
              .from("order_items")
              .select("order_id, item_name, quantity, line_total")
              .in("order_id", orderIds)
          : { data: [], error: null };

      if (orderItemsResult.error) {
        throw orderItemsResult.error;
      }

      const incomingOrderItems = (orderItemsResult.data ?? []) as IncomingOrderItemRow[];
      const itemsByOrderId = incomingOrderItems.reduce<Record<string, IncomingOrderItemRow[]>>(
        (accumulator, item) => {
          accumulator[item.order_id] ??= [];
          accumulator[item.order_id].push(item);
          return accumulator;
        },
        {},
      );

      const incomingOrders: IncomingOrderRow[] = rawOrders.map((order) => ({
        id: order.id,
        restaurant_id: order.restaurant_id,
        restaurant_name: Array.isArray(order.restaurants)
          ? (order.restaurants[0]?.name ?? "Restaurant")
          : (order.restaurants?.name ?? "Restaurant"),
        status: order.status,
        subtotal: Number(order.subtotal),
        delivery_fee: Number(order.delivery_fee),
        total: Number(order.total),
        placed_at: order.placed_at,
        notes: order.notes,
        items: itemsByOrderId[order.id] ?? [],
      }));

      setSelectedRestaurantId(resolvedRestaurantId);
      setState({
        status: "ready",
        userId: session.user.id,
        data: {
          restaurants: restaurantRows,
          categories: (categoriesResult.data ?? []) as CategoryRow[],
          menuItems: (menuItemsResult.data ?? []) as MenuItemRow[],
          openOrders: openOrdersResult.count ?? 0,
          incomingOrders,
        },
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load your Food Place dashboard right now.",
      });
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleCreateRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.userId) {
      return;
    }

    setFormState({ type: "restaurant", status: "submitting" });

    const payload = {
      owner_id: state.userId,
      name: restaurantForm.name,
      description: restaurantForm.description || null,
      phone: restaurantForm.phone || null,
      address_text: restaurantForm.addressText || null,
      latitude: restaurantForm.latitude ? Number(restaurantForm.latitude) : null,
      longitude: restaurantForm.longitude ? Number(restaurantForm.longitude) : null,
      is_open: true,
    };

    const { data, error } = await supabase
      .from("restaurants")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setFormState({ type: "restaurant", status: "error", message: error.message });
      return;
    }

    setRestaurantForm(initialRestaurantForm);
    setFormState({
      type: "restaurant",
      status: "success",
      message: "Restaurant created successfully.",
    });
    await loadDashboard(data.id);
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRestaurantId) {
      setFormState({
        type: "category",
        status: "error",
        message: "Create or select a restaurant first.",
      });
      return;
    }

    setFormState({ type: "category", status: "submitting" });

    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: selectedRestaurantId,
      name: categoryForm.name,
      sort_order: Number(categoryForm.sortOrder || "0"),
    });

    if (error) {
      setFormState({ type: "category", status: "error", message: error.message });
      return;
    }

    setCategoryForm(initialCategoryForm);
    setFormState({
      type: "category",
      status: "success",
      message: "Category created successfully.",
    });
    await loadDashboard(selectedRestaurantId);
  }

  async function handleCreateMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRestaurantId) {
      setFormState({
        type: "menuItem",
        status: "error",
        message: "Create or select a restaurant first.",
      });
      return;
    }

    setFormState({ type: "menuItem", status: "submitting" });

    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: selectedRestaurantId,
      category_id: menuItemForm.categoryId || null,
      name: menuItemForm.name,
      description: menuItemForm.description || null,
      price: Number(menuItemForm.price),
      is_available: true,
    });

    if (error) {
      setFormState({ type: "menuItem", status: "error", message: error.message });
      return;
    }

    setMenuItemForm(initialMenuItemForm);
    setFormState({
      type: "menuItem",
      status: "success",
      message: "Menu item created successfully.",
    });
    await loadDashboard(selectedRestaurantId);
  }

  async function handleUpdateOrderStatus(orderId: string, nextStatus: string) {
    setOrderState({
      status: "submitting",
      orderId,
      message: undefined,
    });

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (error) {
      setOrderState({
        status: "error",
        orderId,
        message: error.message,
      });
      return;
    }

    setOrderState({
      status: "success",
      orderId,
      message: `Order updated to ${formatStatus(nextStatus)}.`,
    });
    await loadDashboard(selectedRestaurantId);
  }

  const restaurants = state.data?.restaurants ?? [];
  const categories = state.data?.categories ?? [];
  const menuItems = state.data?.menuItems ?? [];
  const incomingOrders = state.data?.incomingOrders ?? [];
  const selectedRestaurant =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null;

  return (
    <DashboardShell
      eyebrow="Food Place dashboard"
      title="Manage your restaurant, menus, and order operations from the web."
      description="This dashboard now creates real restaurant and menu data in Supabase, so your marketplace can be managed from the app instead of SQL."
      stats={[
        {
          label: "Restaurants",
          value: state.status === "loading" ? "..." : String(restaurants.length),
        },
        {
          label: "Menu items",
          value: state.status === "loading" ? "..." : String(menuItems.length),
        },
        {
          label: "Open orders",
          value: state.status === "loading" ? "..." : String(state.data?.openOrders ?? 0),
        },
      ]}
      actions={[
        {
          title: "Create your restaurant",
          description: "Food place users can now create their own restaurant record directly from the dashboard.",
        },
        {
          title: "Add categories and menu items",
          description: "Once a restaurant exists, this page can seed the category and item catalog for customers to browse.",
        },
        {
          title: "Incoming orders board",
          description: "Placed customer orders now appear below, and staff can push them through the prep flow.",
        },
      ]}
    >
      <div className="space-y-8">
        {state.status === "loading" ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Loading restaurant tools...
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.message}
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Incoming orders</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              New customer checkouts now appear here. Move each order from placed to confirmed,
              then preparing, then ready for pickup.
            </p>
          </div>

          {orderState.message ? (
            <p
              className={`rounded-2xl px-4 py-3 text-sm ${
                orderState.status === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {orderState.message}
            </p>
          ) : null}

          {incomingOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              No incoming orders yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {incomingOrders.map((order) => {
                const nextStatus = getNextOrderStatus(order.status);

                return (
                  <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{order.restaurant_name}</h3>
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          Placed {formatDateTime(order.placed_at)}
                        </p>
                        <p className="text-sm text-slate-600">Order ID: {order.id}</p>
                      </div>

                      <div className="space-y-2 text-sm md:text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(order.total)}</p>
                        <p className="text-slate-600">
                          Subtotal {formatCurrency(order.subtotal)} + delivery {formatCurrency(order.delivery_fee)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {order.items.map((item) => (
                        <div
                          key={`${order.id}-${item.item_name}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        >
                          <span>
                            {item.quantity} x {item.item_name}
                          </span>
                          <span>{formatCurrency(Number(item.line_total))}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">Notes:</span> {order.notes}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {nextStatus ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, nextStatus)}
                          disabled={
                            orderState.status === "submitting" && orderState.orderId === order.id
                          }
                          className="rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
                        >
                          {orderState.status === "submitting" && orderState.orderId === order.id
                            ? "Updating..."
                            : `Mark as ${formatStatus(nextStatus)}`}
                        </button>
                      ) : (
                        <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                          Waiting for driver pickup
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Restaurant setup</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create a restaurant record tied to the signed-in food place owner. The owner can
              then manage categories and menu items for that restaurant.
            </p>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateRestaurant}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Restaurant name</span>
              <input
                value={restaurantForm.name}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                placeholder="Dalbo Kitchen"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
              <input
                value={restaurantForm.phone}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                placeholder="+1 555 0100"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={restaurantForm.description}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, description: event.target.value }))
                }
                className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                placeholder="Fresh burgers, wraps, fries, and drinks for fast delivery."
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Address</span>
              <input
                value={restaurantForm.addressText}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, addressText: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                placeholder="221B Baker Street"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Latitude</span>
              <input
                value={restaurantForm.latitude}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, latitude: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                placeholder="32.085300"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Longitude</span>
              <input
                value={restaurantForm.longitude}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, longitude: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                placeholder="34.781800"
              />
            </label>

            <div className="md:col-span-2 flex flex-col gap-3">
              {formState.type === "restaurant" && formState.message ? (
                <p
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    formState.status === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {formState.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={formState.type === "restaurant" && formState.status === "submitting"}
                className="rounded-2xl bg-[#ff6200] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
              >
                {formState.type === "restaurant" && formState.status === "submitting"
                  ? "Creating restaurant..."
                  : "Create restaurant"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Restaurant catalog</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose which owned restaurant you want to manage, then add menu categories and
              items below.
            </p>
          </div>

          {restaurants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              No restaurant has been created for this food place user yet.
            </div>
          ) : (
            <div className="space-y-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Active restaurant
                </span>
                <select
                  value={selectedRestaurantId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedRestaurantId(nextId);
                    void loadDashboard(nextId);
                  }}
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
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">{selectedRestaurant.name}</p>
                  <p className="mt-2">{selectedRestaurant.description || "No description yet."}</p>
                  <p className="mt-2">{selectedRestaurant.address_text || "No address yet."}</p>
                </div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-2">
                <form className="space-y-4 rounded-3xl border border-slate-200 p-5" onSubmit={handleCreateCategory}>
                  <div>
                    <h3 className="text-lg font-semibold">Add category</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Categories organize the menu for customers and restaurant staff.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
                    <input
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      placeholder="Burgers"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Sort order</span>
                    <input
                      type="number"
                      value={categoryForm.sortOrder}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    />
                  </label>

                  {formState.type === "category" && formState.message ? (
                    <p
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        formState.status === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {formState.message}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={formState.type === "category" && formState.status === "submitting"}
                    className="rounded-2xl bg-[#0b1020] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
                  >
                    {formState.type === "category" && formState.status === "submitting"
                      ? "Saving category..."
                      : "Create category"}
                  </button>
                </form>

                <form className="space-y-4 rounded-3xl border border-slate-200 p-5" onSubmit={handleCreateMenuItem}>
                  <div>
                    <h3 className="text-lg font-semibold">Add menu item</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Menu items will appear on the customer dashboard once menu browsing is connected.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Item name</span>
                    <input
                      value={menuItemForm.name}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      placeholder="Classic Burger"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                    <textarea
                      value={menuItemForm.description}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      placeholder="Beef patty, lettuce, tomato, and house sauce."
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={menuItemForm.price}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({
                            ...current,
                            price: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                        placeholder="12.99"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
                      <select
                        value={menuItemForm.categoryId}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({
                            ...current,
                            categoryId: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      >
                        <option value="">No category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {formState.type === "menuItem" && formState.message ? (
                    <p
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        formState.status === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {formState.message}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={formState.type === "menuItem" && formState.status === "submitting"}
                    className="rounded-2xl bg-[#ff6200] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
                  >
                    {formState.type === "menuItem" && formState.status === "submitting"
                      ? "Saving item..."
                      : "Create menu item"}
                  </button>
                </form>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold">Categories</h3>
                  <div className="mt-4 space-y-3">
                    {categories.length === 0 ? (
                      <p className="text-sm text-slate-600">No categories yet.</p>
                    ) : (
                      categories.map((category) => (
                        <div key={category.id} className="rounded-2xl bg-slate-50 p-4">
                          <p className="font-semibold">{category.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Sort order: {category.sort_order}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold">Menu items</h3>
                  <div className="mt-4 space-y-3">
                    {menuItems.length === 0 ? (
                      <p className="text-sm text-slate-600">No menu items yet.</p>
                    ) : (
                      menuItems.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{item.name}</p>
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
                          <p className="mt-2 text-sm text-slate-600">
                            {item.description || "No description yet."}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { getFoodMediaPublicUrl } from "../lib/media";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type RestaurantRow = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address_text: string | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
  image_path: string | null;
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
  service_fee: number;
  commission_amount: number;
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

function createRestaurantFormFromRow(restaurant: RestaurantRow | null) {
  return {
    name: restaurant?.name ?? "",
    description: restaurant?.description ?? "",
    phone: restaurant?.phone ?? "",
    addressText: restaurant?.address_text ?? "",
    latitude: restaurant?.latitude != null ? String(restaurant.latitude) : "",
    longitude: restaurant?.longitude != null ? String(restaurant.longitude) : "",
  };
}

function createMenuItemFormFromRow(item: MenuItemRow | null) {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(Number(item.price)) : "",
    categoryId: item?.category_id ?? "",
  };
}

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
  const [restaurantEditForm, setRestaurantEditForm] = useState(initialRestaurantForm);
  const [menuItemEditForm, setMenuItemEditForm] = useState(initialMenuItemForm);
  const [restaurantImageFile, setRestaurantImageFile] = useState<File | null>(null);
  const [menuItemImageFile, setMenuItemImageFile] = useState<File | null>(null);
  const [restaurantEditImageFile, setRestaurantEditImageFile] = useState<File | null>(null);
  const [menuItemEditImageFile, setMenuItemEditImageFile] = useState<File | null>(null);
  const [restaurantImagePreviewUrl, setRestaurantImagePreviewUrl] = useState("");
  const [menuItemImagePreviewUrl, setMenuItemImagePreviewUrl] = useState("");
  const [restaurantEditImagePreviewUrl, setRestaurantEditImagePreviewUrl] = useState("");
  const [menuItemEditImagePreviewUrl, setMenuItemEditImagePreviewUrl] = useState("");
  const [editingMenuItemId, setEditingMenuItemId] = useState("");
  const [formState, setFormState] = useState<{
    type?:
      | "restaurant"
      | "restaurantUpdate"
      | "restaurantAvailability"
      | "category"
      | "menuItem"
      | "menuItemUpdate"
      | "menuItemDelete"
      | "menuItemAvailability";
    status?: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [orderState, setOrderState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    orderId?: string;
  }>({ status: "idle" });

  async function uploadFoodPlaceImage(file: File, kind: "restaurant" | "menu-item") {
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
    formData.append("kind", kind);
    formData.append("file", file);

    const response = await fetch("/api/food-place/upload-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    const payload = (await response.json()) as { path?: string; error?: string };

    if (!response.ok || !payload.path) {
      throw new Error(payload.error || "Unable to upload the image right now.");
    }

    return payload.path;
  }

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
        .select("id, name, description, phone, address_text, latitude, longitude, is_open, image_path")
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
              .select("id, name, description, price, is_available, category_id, image_path")
              .eq("restaurant_id", resolvedRestaurantId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        restaurantRows.length > 0
          ? supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("payment_status", "paid")
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
                "id, restaurant_id, status, subtotal, delivery_fee, service_fee, commission_amount, total, placed_at, notes, restaurants(name)",
              )
              .eq("payment_status", "paid")
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
          service_fee: number | null;
          commission_amount: number | null;
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
        service_fee: Number(order.service_fee ?? 0),
        commission_amount: Number(order.commission_amount ?? 0),
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

  useEffect(() => {
    if (!restaurantImageFile) {
      setRestaurantImagePreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(restaurantImageFile);
    setRestaurantImagePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [restaurantImageFile]);

  useEffect(() => {
    if (!menuItemImageFile) {
      setMenuItemImagePreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(menuItemImageFile);
    setMenuItemImagePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [menuItemImageFile]);

  useEffect(() => {
    if (!restaurantEditImageFile) {
      setRestaurantEditImagePreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(restaurantEditImageFile);
    setRestaurantEditImagePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [restaurantEditImageFile]);

  useEffect(() => {
    if (!menuItemEditImageFile) {
      setMenuItemEditImagePreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(menuItemEditImageFile);
    setMenuItemEditImagePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [menuItemEditImageFile]);

  async function handleCreateRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.userId) {
      return;
    }

    setFormState({ type: "restaurant", status: "submitting" });

    let imagePath: string | null = null;

    try {
      if (restaurantImageFile) {
        imagePath = await uploadFoodPlaceImage(restaurantImageFile, "restaurant");
      }
    } catch (error) {
      setFormState({
        type: "restaurant",
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to upload the restaurant image right now.",
      });
      return;
    }

    const payload = {
      owner_id: state.userId,
      name: restaurantForm.name,
      description: restaurantForm.description || null,
      phone: restaurantForm.phone || null,
      address_text: restaurantForm.addressText || null,
      latitude: restaurantForm.latitude ? Number(restaurantForm.latitude) : null,
      longitude: restaurantForm.longitude ? Number(restaurantForm.longitude) : null,
      is_open: true,
      image_path: imagePath,
    };

    const { data, error } = await (supabase
      .from("restaurants") as any)
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setFormState({ type: "restaurant", status: "error", message: error.message });
      return;
    }

    setRestaurantForm(initialRestaurantForm);
    setRestaurantImageFile(null);
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

    const { error } = await (supabase.from("menu_categories") as any).insert({
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

    let imagePath: string | null = null;

    try {
      if (menuItemImageFile) {
        imagePath = await uploadFoodPlaceImage(menuItemImageFile, "menu-item");
      }
    } catch (error) {
      setFormState({
        type: "menuItem",
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to upload the menu image right now.",
      });
      return;
    }

    const { error } = await (supabase.from("menu_items") as any).insert({
      restaurant_id: selectedRestaurantId,
      category_id: menuItemForm.categoryId || null,
      name: menuItemForm.name,
      description: menuItemForm.description || null,
      price: Number(menuItemForm.price),
      is_available: true,
      image_path: imagePath,
    });

    if (error) {
      setFormState({ type: "menuItem", status: "error", message: error.message });
      return;
    }

    setMenuItemForm(initialMenuItemForm);
    setMenuItemImageFile(null);
    setFormState({
      type: "menuItem",
      status: "success",
      message: "Menu item created successfully.",
    });
    await loadDashboard(selectedRestaurantId);
  }

  async function handleUpdateRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRestaurantId || !selectedRestaurant) {
      return;
    }

    setFormState({ type: "restaurantUpdate", status: "submitting" });

    let imagePath = selectedRestaurant.image_path;

    try {
      if (restaurantEditImageFile) {
        imagePath = await uploadFoodPlaceImage(restaurantEditImageFile, "restaurant");
      }
    } catch (error) {
      setFormState({
        type: "restaurantUpdate",
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to upload the restaurant image right now.",
      });
      return;
    }

    const { error } = await (supabase.from("restaurants") as any)
      .update({
        name: restaurantEditForm.name,
        description: restaurantEditForm.description || null,
        phone: restaurantEditForm.phone || null,
        address_text: restaurantEditForm.addressText || null,
        latitude: restaurantEditForm.latitude ? Number(restaurantEditForm.latitude) : null,
        longitude: restaurantEditForm.longitude ? Number(restaurantEditForm.longitude) : null,
        image_path: imagePath,
      })
      .eq("id", selectedRestaurantId);

    if (error) {
      setFormState({ type: "restaurantUpdate", status: "error", message: error.message });
      return;
    }

    setRestaurantEditImageFile(null);
    setFormState({
      type: "restaurantUpdate",
      status: "success",
      message: "Restaurant details updated successfully.",
    });
    await loadDashboard(selectedRestaurantId);
  }

  async function handleToggleRestaurantAvailability() {
    if (!selectedRestaurant) {
      return;
    }

    setFormState({ type: "restaurantAvailability", status: "submitting" });

    const { error } = await (supabase.from("restaurants") as any)
      .update({ is_open: !selectedRestaurant.is_open })
      .eq("id", selectedRestaurant.id);

    if (error) {
      setFormState({
        type: "restaurantAvailability",
        status: "error",
        message: error.message,
      });
      return;
    }

    setFormState({
      type: "restaurantAvailability",
      status: "success",
      message: selectedRestaurant.is_open
        ? "Restaurant marked as closed."
        : "Restaurant marked as open.",
    });
    await loadDashboard(selectedRestaurantId);
  }

  function startEditingMenuItem(item: MenuItemRow) {
    setEditingMenuItemId(item.id);
    setMenuItemEditForm(createMenuItemFormFromRow(item));
    setMenuItemEditImageFile(null);
  }

  function cancelEditingMenuItem() {
    setEditingMenuItemId("");
    setMenuItemEditForm(initialMenuItemForm);
    setMenuItemEditImageFile(null);
  }

  async function handleUpdateMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMenuItemId || !editingMenuItem) {
      return;
    }

    setFormState({ type: "menuItemUpdate", status: "submitting" });

    let imagePath = editingMenuItem.image_path;

    try {
      if (menuItemEditImageFile) {
        imagePath = await uploadFoodPlaceImage(menuItemEditImageFile, "menu-item");
      }
    } catch (error) {
      setFormState({
        type: "menuItemUpdate",
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to upload the menu image right now.",
      });
      return;
    }

    const { error } = await (supabase.from("menu_items") as any)
      .update({
        name: menuItemEditForm.name,
        description: menuItemEditForm.description || null,
        price: Number(menuItemEditForm.price),
        category_id: menuItemEditForm.categoryId || null,
        image_path: imagePath,
      })
      .eq("id", editingMenuItemId);

    if (error) {
      setFormState({ type: "menuItemUpdate", status: "error", message: error.message });
      return;
    }

    setFormState({
      type: "menuItemUpdate",
      status: "success",
      message: "Menu item updated successfully.",
    });
    cancelEditingMenuItem();
    await loadDashboard(selectedRestaurantId);
  }

  async function handleToggleMenuItemAvailability(item: MenuItemRow) {
    setFormState({ type: "menuItemAvailability", status: "submitting" });

    const { error } = await (supabase.from("menu_items") as any)
      .update({ is_available: !item.is_available })
      .eq("id", item.id);

    if (error) {
      setFormState({
        type: "menuItemAvailability",
        status: "error",
        message: error.message,
      });
      return;
    }

    setFormState({
      type: "menuItemAvailability",
      status: "success",
      message: item.is_available
        ? `${item.name} marked as unavailable.`
        : `${item.name} marked as available.`,
    });
    await loadDashboard(selectedRestaurantId);
  }

  async function handleDeleteMenuItem(item: MenuItemRow) {
    if (!window.confirm(`Delete ${item.name}? This removes it from the menu.`)) {
      return;
    }

    setFormState({ type: "menuItemDelete", status: "submitting" });

    const { error } = await (supabase.from("menu_items") as any).delete().eq("id", item.id);

    if (error) {
      setFormState({
        type: "menuItemDelete",
        status: "error",
        message: error.message,
      });
      return;
    }

    if (editingMenuItemId === item.id) {
      cancelEditingMenuItem();
    }

    setFormState({
      type: "menuItemDelete",
      status: "success",
      message: `${item.name} deleted from the menu.`,
    });
    await loadDashboard(selectedRestaurantId);
  }

  async function handleUpdateOrderStatus(orderId: string, nextStatus: string) {
    setOrderState({
      status: "submitting",
      orderId,
      message: undefined,
    });

    const { error } = await (supabase
      .from("orders") as any)
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
  const selectedRestaurantImageUrl = getFoodMediaPublicUrl(selectedRestaurant?.image_path);
  const editingMenuItem =
    menuItems.find((item) => item.id === editingMenuItemId) ?? null;
  const editingMenuItemImageUrl = getFoodMediaPublicUrl(editingMenuItem?.image_path);

  useEffect(() => {
    setRestaurantEditForm(createRestaurantFormFromRow(selectedRestaurant));
    setRestaurantEditImageFile(null);
  }, [selectedRestaurant]);

  return (
    <DashboardShell
      eyebrow="Food Place dashboard"
      title="Manage your restaurant, upload food photos, and keep orders moving."
      description="Food place owners can set up their storefront, upload menu images, and manage live order flow from one Dalbo page."
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
          title: "Set up the storefront",
          description: "Add the restaurant details customers see first, including a cover image for the food place.",
        },
        {
          title: "Upload menu photos",
          description: "Add menu items with images so the customer marketplace feels more like a real ordering app.",
        },
        {
          title: "Run the kitchen flow",
          description: "Incoming orders stay on the same page so staff can move each order from placed to ready.",
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
                        <div className="space-y-1 text-slate-600">
                          <p>
                            Customer paid {formatCurrency(order.subtotal)} + service{" "}
                            {formatCurrency(order.service_fee)} + delivery{" "}
                            {formatCurrency(order.delivery_fee)}
                          </p>
                          <p>
                            Restaurant keeps {formatCurrency(order.subtotal - order.commission_amount)} after{" "}
                            {formatCurrency(order.commission_amount)} commission
                          </p>
                        </div>
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
              Create the storefront tied to this food place login, including the main photo that
              customers will see while browsing all restaurants.
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

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Restaurant cover photo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setRestaurantImageFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 focus:border-orange-400"
              />
              <p className="mt-2 text-xs text-slate-500">
                Upload JPG, PNG, or WebP up to 5 MB.
              </p>
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
              {restaurantImagePreviewUrl ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <img
                    src={restaurantImagePreviewUrl}
                    alt="Restaurant cover preview"
                    className="h-56 w-full object-cover"
                  />
                </div>
              ) : null}

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
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    {selectedRestaurantImageUrl ? (
                      <img
                        src={selectedRestaurantImageUrl}
                        alt={selectedRestaurant.name}
                        className="h-52 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-[#fff7f1] text-sm font-semibold text-orange-600">
                        Upload a restaurant cover photo
                      </div>
                    )}
                    <div className="space-y-4 p-5 text-sm text-slate-600">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-slate-900">{selectedRestaurant.name}</p>
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
                        <button
                          type="button"
                          onClick={handleToggleRestaurantAvailability}
                          disabled={
                            formState.type === "restaurantAvailability" &&
                            formState.status === "submitting"
                          }
                          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {formState.type === "restaurantAvailability" &&
                          formState.status === "submitting"
                            ? "Saving..."
                            : selectedRestaurant.is_open
                              ? "Mark closed"
                              : "Mark open"}
                        </button>
                      </div>
                      <p>{selectedRestaurant.description || "No description yet."}</p>
                      <p>{selectedRestaurant.address_text || "No address yet."}</p>
                    </div>
                  </div>

                  <form
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2"
                    onSubmit={handleUpdateRestaurant}
                  >
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-slate-900">Edit restaurant details</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Update the restaurant profile, cover photo, and storefront details customers
                        use while browsing.
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Restaurant name</span>
                      <input
                        value={restaurantEditForm.name}
                        onChange={(event) =>
                          setRestaurantEditForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
                      <input
                        value={restaurantEditForm.phone}
                        onChange={(event) =>
                          setRestaurantEditForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                      <textarea
                        value={restaurantEditForm.description}
                        onChange={(event) =>
                          setRestaurantEditForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Address</span>
                      <input
                        value={restaurantEditForm.addressText}
                        onChange={(event) =>
                          setRestaurantEditForm((current) => ({
                            ...current,
                            addressText: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Latitude</span>
                      <input
                        value={restaurantEditForm.latitude}
                        onChange={(event) =>
                          setRestaurantEditForm((current) => ({ ...current, latitude: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Longitude</span>
                      <input
                        value={restaurantEditForm.longitude}
                        onChange={(event) =>
                          setRestaurantEditForm((current) => ({ ...current, longitude: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-medium text-slate-700">New cover photo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => setRestaurantEditImageFile(event.target.files?.[0] ?? null)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 focus:border-orange-400"
                      />
                    </label>

                    {(restaurantEditImagePreviewUrl || selectedRestaurantImageUrl) && (
                      <div className="md:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                        <img
                          src={restaurantEditImagePreviewUrl || selectedRestaurantImageUrl || ""}
                          alt="Restaurant edit preview"
                          className="h-56 w-full object-cover"
                        />
                      </div>
                    )}

                    {formState.type === "restaurantUpdate" && formState.message ? (
                      <p
                        className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                          formState.status === "error"
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {formState.message}
                      </p>
                    ) : null}

                    {formState.type === "restaurantAvailability" && formState.message ? (
                      <p
                        className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                          formState.status === "error"
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {formState.message}
                      </p>
                    ) : null}

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={formState.type === "restaurantUpdate" && formState.status === "submitting"}
                        className="rounded-2xl bg-[#0b1020] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
                      >
                        {formState.type === "restaurantUpdate" && formState.status === "submitting"
                          ? "Saving changes..."
                          : "Save restaurant changes"}
                      </button>
                    </div>
                  </form>
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
                      Menu items appear in the customer marketplace, so add a strong name, clear
                      description, and a photo when possible.
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

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Food photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setMenuItemImageFile(event.target.files?.[0] ?? null)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 focus:border-orange-400"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Optional, but recommended for the customer menu.
                    </p>
                  </label>

                  {menuItemImagePreviewUrl ? (
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                      <img
                        src={menuItemImagePreviewUrl}
                        alt="Menu item preview"
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  ) : null}

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
                  {["menuItemAvailability", "menuItemDelete"].includes(formState.type ?? "") &&
                  formState.message ? (
                    <p
                      className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                        formState.status === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {formState.message}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    {menuItems.length === 0 ? (
                      <p className="text-sm text-slate-600">No menu items yet.</p>
                    ) : (
                      menuItems.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                          {item.image_path ? (
                            <img
                              src={getFoodMediaPublicUrl(item.image_path) ?? ""}
                              alt={item.name}
                              className="mb-4 h-40 w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-400">
                              No food image yet
                            </div>
                          )}
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
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => startEditingMenuItem(item)}
                              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                            >
                              Edit item
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMenuItemAvailability(item)}
                              disabled={
                                formState.type === "menuItemAvailability" &&
                                formState.status === "submitting"
                              }
                              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:opacity-60"
                            >
                              {item.is_available ? "Mark unavailable" : "Mark available"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMenuItem(item)}
                              disabled={
                                formState.type === "menuItemDelete" &&
                                formState.status === "submitting"
                              }
                              className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              Delete item
                            </button>
                          </div>

                          {editingMenuItemId === item.id ? (
                            <form className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={handleUpdateMenuItem}>
                              <div>
                                <h4 className="font-semibold text-slate-900">Edit menu item</h4>
                                <p className="mt-1 text-sm text-slate-600">
                                  Update the name, price, description, category, and food photo.
                                </p>
                              </div>

                              <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">Item name</span>
                                <input
                                  value={menuItemEditForm.name}
                                  onChange={(event) =>
                                    setMenuItemEditForm((current) => ({ ...current, name: event.target.value }))
                                  }
                                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                                  required
                                />
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                                <textarea
                                  value={menuItemEditForm.description}
                                  onChange={(event) =>
                                    setMenuItemEditForm((current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                                />
                              </label>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                  <span className="mb-2 block text-sm font-medium text-slate-700">Price</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={menuItemEditForm.price}
                                    onChange={(event) =>
                                      setMenuItemEditForm((current) => ({
                                        ...current,
                                        price: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                                    required
                                  />
                                </label>

                                <label className="block">
                                  <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
                                  <select
                                    value={menuItemEditForm.categoryId}
                                    onChange={(event) =>
                                      setMenuItemEditForm((current) => ({
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

                              <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">Replace food photo</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(event) => setMenuItemEditImageFile(event.target.files?.[0] ?? null)}
                                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 focus:border-orange-400"
                                />
                              </label>

                              {(menuItemEditImagePreviewUrl || editingMenuItemImageUrl) && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                  <img
                                    src={menuItemEditImagePreviewUrl || editingMenuItemImageUrl || ""}
                                    alt="Menu item edit preview"
                                    className="h-48 w-full object-cover"
                                  />
                                </div>
                              )}

                              {formState.type === "menuItemUpdate" && formState.message ? (
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

                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="submit"
                                  disabled={
                                    formState.type === "menuItemUpdate" &&
                                    formState.status === "submitting"
                                  }
                                  className="rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700] disabled:opacity-60"
                                >
                                  {formState.type === "menuItemUpdate" &&
                                  formState.status === "submitting"
                                    ? "Saving changes..."
                                    : "Save item changes"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingMenuItem}
                                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : null}
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

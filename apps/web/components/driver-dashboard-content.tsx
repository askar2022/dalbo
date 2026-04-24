"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type DriverProfileRow = {
  user_id: string;
  vehicle_type: string | null;
  is_online: boolean;
  is_verified: boolean;
};

type DeliveryItemRow = {
  order_id: string;
  item_name: string;
  quantity: number;
  line_total: number;
};

type DeliveryJobRow = {
  id: string;
  status: string;
  total: number;
  placed_at: string;
  notes: string | null;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string | null;
  delivery_address_id: string | null;
  delivery_address_text: string | null;
  delivery_address_label: string | null;
  items: DeliveryItemRow[];
};

type DriverDashboardData = {
  profile: DriverProfileRow | null;
  availableJobs: DeliveryJobRow[];
  activeDeliveries: DeliveryJobRow[];
  deliveredCount: number;
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

function getNextDriverStatus(status: string) {
  if (status === "ready") {
    return "picked_up";
  }

  if (status === "picked_up") {
    return "delivered";
  }

  return null;
}

export function DriverDashboardContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    userId?: string;
    data?: DriverDashboardData;
    message?: string;
  }>({ status: "loading" });
  const [vehicleType, setVehicleType] = useState("");
  const [profileState, setProfileState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [jobState, setJobState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    orderId?: string;
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

      const [profileResult, availableJobsResult, activeDeliveriesResult, deliveredCountResult] =
        await Promise.all([
          supabase
            .from("drivers")
            .select("user_id, vehicle_type, is_online, is_verified")
            .eq("user_id", session.user.id)
            .maybeSingle<DriverProfileRow>(),
          supabase
            .from("orders")
            .select(
              "id, status, total, placed_at, notes, restaurant_id, delivery_address_id, restaurants(name, address_text)",
            )
            .is("driver_id", null)
            .eq("status", "ready")
            .order("placed_at", { ascending: true }),
          supabase
            .from("orders")
            .select(
              "id, status, total, placed_at, notes, restaurant_id, delivery_address_id, restaurants(name, address_text)",
            )
            .eq("driver_id", session.user.id)
            .in("status", ["ready", "picked_up"])
            .order("placed_at", { ascending: true }),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("driver_id", session.user.id)
            .eq("status", "delivered"),
        ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (availableJobsResult.error) {
        throw availableJobsResult.error;
      }

      if (activeDeliveriesResult.error) {
        throw activeDeliveriesResult.error;
      }

      if (deliveredCountResult.error) {
        throw deliveredCountResult.error;
      }

      const availableRows =
        (availableJobsResult.data as Array<{
          id: string;
          status: string;
          total: number;
          placed_at: string;
          notes: string | null;
          restaurant_id: string;
          delivery_address_id: string | null;
          restaurants: { name: string; address_text: string | null } | { name: string; address_text: string | null }[] | null;
        }> | null) ?? [];
      const activeRows =
        (activeDeliveriesResult.data as Array<{
          id: string;
          status: string;
          total: number;
          placed_at: string;
          notes: string | null;
          restaurant_id: string;
          delivery_address_id: string | null;
          restaurants: { name: string; address_text: string | null } | { name: string; address_text: string | null }[] | null;
        }> | null) ?? [];

      const allOrderIds = [...availableRows, ...activeRows].map((order) => order.id);
      const activeAddressIds = activeRows
        .map((order) => order.delivery_address_id)
        .filter((value): value is string => Boolean(value));

      const [orderItemsResult, addressesResult] = await Promise.all([
        allOrderIds.length > 0
          ? supabase
              .from("order_items")
              .select("order_id, item_name, quantity, line_total")
              .in("order_id", allOrderIds)
          : Promise.resolve({ data: [], error: null }),
        activeAddressIds.length > 0
          ? supabase
              .from("customer_addresses")
              .select("id, label, address_text")
              .in("id", activeAddressIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (orderItemsResult.error) {
        throw orderItemsResult.error;
      }

      if (addressesResult.error) {
        throw addressesResult.error;
      }

      const deliveryOrderItems = (orderItemsResult.data ?? []) as DeliveryItemRow[];
      const itemsByOrderId = deliveryOrderItems.reduce<Record<string, DeliveryItemRow[]>>(
        (accumulator, item) => {
          accumulator[item.order_id] ??= [];
          accumulator[item.order_id].push(item);
          return accumulator;
        },
        {},
      );

      const deliveryAddresses = (addressesResult.data ?? []) as Array<{
        id: string;
        label: string | null;
        address_text: string;
      }>;
      const addressesById = deliveryAddresses.reduce<
        Record<string, { label: string | null; address_text: string }>
      >((accumulator, address) => {
        accumulator[address.id] = {
          label: address.label,
          address_text: address.address_text,
        };
        return accumulator;
      }, {});

      const toDeliveryJob = (order: {
        id: string;
        status: string;
        total: number;
        placed_at: string;
        notes: string | null;
        restaurant_id: string;
        delivery_address_id: string | null;
        restaurants: { name: string; address_text: string | null } | { name: string; address_text: string | null }[] | null;
      }): DeliveryJobRow => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        placed_at: order.placed_at,
        notes: order.notes,
        restaurant_id: order.restaurant_id,
        restaurant_name: Array.isArray(order.restaurants)
          ? (order.restaurants[0]?.name ?? "Restaurant")
          : (order.restaurants?.name ?? "Restaurant"),
        restaurant_address: Array.isArray(order.restaurants)
          ? (order.restaurants[0]?.address_text ?? null)
          : (order.restaurants?.address_text ?? null),
        delivery_address_id: order.delivery_address_id,
        delivery_address_text: order.delivery_address_id
          ? (addressesById[order.delivery_address_id]?.address_text ?? null)
          : null,
        delivery_address_label: order.delivery_address_id
          ? (addressesById[order.delivery_address_id]?.label ?? null)
          : null,
        items: itemsByOrderId[order.id] ?? [],
      });

      setVehicleType(profileResult.data?.vehicle_type ?? "");
      setState({
        status: "ready",
        userId: session.user.id,
        data: {
          profile: profileResult.data ?? null,
          availableJobs: availableRows.map(toDeliveryJob),
          activeDeliveries: activeRows.map(toDeliveryJob),
          deliveredCount: deliveredCountResult.count ?? 0,
        },
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load the driver dashboard right now.",
      });
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleSaveDriverProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.userId) {
      return;
    }

    setProfileState({ status: "submitting" });

    const nextOnlineState = state.data?.profile?.is_online ?? true;
    const { error } = await (supabase.from("drivers") as any).upsert(
      {
        user_id: state.userId,
        vehicle_type: vehicleType || null,
        is_online: nextOnlineState,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setProfileState({
        status: "error",
        message: error.message,
      });
      return;
    }

    setProfileState({
      status: "success",
      message: "Driver profile saved.",
    });
    await loadDashboard();
  }

  async function handleToggleOnline() {
    if (!state.userId) {
      return;
    }

    setProfileState({ status: "submitting" });
    const nextOnlineState = !(state.data?.profile?.is_online ?? false);

    const { error } = await (supabase.from("drivers") as any).upsert(
      {
        user_id: state.userId,
        vehicle_type: vehicleType || null,
        is_online: nextOnlineState,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setProfileState({
        status: "error",
        message: error.message,
      });
      return;
    }

    setProfileState({
      status: "success",
      message: nextOnlineState ? "Driver is now online." : "Driver is now offline.",
    });
    await loadDashboard();
  }

  async function handleAcceptJob(order: DeliveryJobRow) {
    if (!state.userId) {
      return;
    }

    setJobState({
      status: "submitting",
      orderId: order.id,
    });

    const { data, error } = await supabase
      .from("orders")
      .update({
        driver_id: state.userId,
      })
      .eq("id", order.id)
      .is("driver_id", null)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: error?.message || "This delivery may already have been claimed.",
      });
      return;
    }

    const assignmentResult = await (supabase.from("driver_assignments") as any).upsert(
      {
        order_id: order.id,
        driver_id: state.userId,
        status: "accepted",
      },
      { onConflict: "order_id" },
    );

    if (assignmentResult.error) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: assignmentResult.error.message,
      });
      return;
    }

    setJobState({
      status: "success",
      orderId: order.id,
      message: "Delivery accepted.",
    });
    await loadDashboard();
  }

  async function handleUpdateDelivery(order: DeliveryJobRow, nextStatus: "picked_up" | "delivered") {
    if (!state.userId) {
      return;
    }

    setJobState({
      status: "submitting",
      orderId: order.id,
    });

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", order.id)
      .eq("driver_id", state.userId);

    if (error) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: error.message,
      });
      return;
    }

    const assignmentStatus = nextStatus === "picked_up" ? "picked_up" : "delivered";
    const assignmentResult = await (supabase.from("driver_assignments") as any).upsert(
      {
        order_id: order.id,
        driver_id: state.userId,
        status: assignmentStatus,
      },
      { onConflict: "order_id" },
    );

    if (assignmentResult.error) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: assignmentResult.error.message,
      });
      return;
    }

    setJobState({
      status: "success",
      orderId: order.id,
      message: `Delivery marked as ${formatStatus(nextStatus)}.`,
    });
    await loadDashboard();
  }

  const profile = state.data?.profile ?? null;
  const availableJobs = state.data?.availableJobs ?? [];
  const activeDeliveries = state.data?.activeDeliveries ?? [];
  const deliveredCount = state.data?.deliveredCount ?? 0;

  return (
    <DashboardShell
      eyebrow="Driver dashboard"
      title="Accept delivery jobs, update trip status, and manage driver availability."
      description="This dashboard now runs a real delivery workflow on top of Supabase: go online, accept ready orders, pick them up, and mark them delivered."
      stats={[
        {
          label: "Available jobs",
          value: state.status === "loading" ? "..." : String(availableJobs.length),
        },
        {
          label: "Active deliveries",
          value: state.status === "loading" ? "..." : String(activeDeliveries.length),
        },
        {
          label: "Delivered",
          value: state.status === "loading" ? "..." : String(deliveredCount),
        },
      ]}
      actions={[
        {
          title: "Create driver profile",
          description: "The first save creates the row in `public.drivers`, which unlocks online status and delivery work.",
        },
        {
          title: "Claim ready jobs",
          description: "Available jobs come from restaurant orders marked `ready` and not yet claimed by a driver.",
        },
        {
          title: "Move trip forward",
          description: "Once accepted, drivers can mark the trip as picked up and then delivered.",
        },
      ]}
    >
      <div className="space-y-8">
        {state.status === "loading" ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Loading driver tools...
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.message}
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Driver availability</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Save the driver profile once, then go online to start receiving ready delivery jobs.
            </p>
          </div>

          <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={handleSaveDriverProfile}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Vehicle type</span>
              <input
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                placeholder="Scooter, bike, or car"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                Status: {profile?.is_online ? "Online" : "Offline"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                Verification: {profile?.is_verified ? "Verified" : "Pending"}
              </span>
            </div>

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

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={profileState.status === "submitting"}
                className="rounded-2xl bg-[#0b1020] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                {profileState.status === "submitting" ? "Saving..." : "Save driver profile"}
              </button>
              <button
                type="button"
                onClick={handleToggleOnline}
                disabled={profileState.status === "submitting"}
                className="rounded-2xl bg-[#18a957] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#128447] disabled:opacity-60"
              >
                {profile?.is_online ? "Go offline" : "Go online"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Available jobs</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              These are restaurant orders that are ready for pickup and have not yet been claimed.
            </p>
          </div>

          {jobState.message ? (
            <p
              className={`rounded-2xl px-4 py-3 text-sm ${
                jobState.status === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}
            >
              {jobState.message}
            </p>
          ) : null}

          {availableJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              No ready jobs are waiting for a driver right now.
            </div>
          ) : (
            <div className="grid gap-4">
              {availableJobs.map((job) => (
                <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{job.restaurant_name}</h3>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Ready
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Pickup at {job.restaurant_address || "Restaurant address not added yet"}
                      </p>
                      <p className="text-sm text-slate-600">Placed {formatDateTime(job.placed_at)}</p>
                    </div>

                    <div className="space-y-2 text-sm md:text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(job.total)}</p>
                      <p className="text-slate-600">Order ID: {job.id}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {job.items.map((item) => (
                      <div
                        key={`${job.id}-${item.item_name}`}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      >
                        <span>
                          {item.quantity} x {item.item_name}
                        </span>
                        <span>{formatCurrency(Number(item.line_total))}</span>
                      </div>
                    ))}
                  </div>

                  {job.notes ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">Notes:</span> {job.notes}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleAcceptJob(job)}
                      disabled={
                        !profile?.is_online ||
                        (jobState.status === "submitting" && jobState.orderId === job.id)
                      }
                      className="rounded-2xl bg-[#18a957] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#128447] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {jobState.status === "submitting" && jobState.orderId === job.id
                        ? "Accepting..."
                        : profile?.is_online
                          ? "Accept delivery"
                          : "Go online to accept"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Active deliveries</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Once you claim a job, it moves here so you can mark pickup and delivery completion.
            </p>
          </div>

          {activeDeliveries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              No active deliveries yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {activeDeliveries.map((job) => {
                const nextStatus = getNextDriverStatus(job.status);

                return (
                  <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{job.restaurant_name}</h3>
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            {formatStatus(job.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          Pickup: {job.restaurant_address || "Restaurant address not added yet"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Dropoff:{" "}
                          {job.delivery_address_text
                            ? `${job.delivery_address_label ? `${job.delivery_address_label} - ` : ""}${job.delivery_address_text}`
                            : "Address becomes available after claim and policy update."}
                        </p>
                        <p className="text-sm text-slate-600">Placed {formatDateTime(job.placed_at)}</p>
                      </div>

                      <div className="space-y-2 text-sm md:text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(job.total)}</p>
                        <p className="text-slate-600">Order ID: {job.id}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {job.items.map((item) => (
                        <div
                          key={`${job.id}-${item.item_name}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        >
                          <span>
                            {item.quantity} x {item.item_name}
                          </span>
                          <span>{formatCurrency(Number(item.line_total))}</span>
                        </div>
                      ))}
                    </div>

                    {job.notes ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">Notes:</span> {job.notes}
                      </div>
                    ) : null}

                    {nextStatus ? (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateDelivery(job, nextStatus as "picked_up" | "delivered")
                          }
                          disabled={jobState.status === "submitting" && jobState.orderId === job.id}
                          className="rounded-2xl bg-[#18a957] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#128447] disabled:opacity-60"
                        >
                          {jobState.status === "submitting" && jobState.orderId === job.id
                            ? "Updating..."
                            : `Mark as ${formatStatus(nextStatus)}`}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

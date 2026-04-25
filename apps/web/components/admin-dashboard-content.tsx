"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type AdminDashboardData = {
  adminName: string | null;
  counts: {
    customers: number;
    drivers: number;
    foodPlaces: number;
    admins: number;
    liveOrders: number;
    deliveredOrders: number;
    ratings: number;
  };
  recentOrders: Array<{
    id: string;
    status: string;
    paymentStatus: string;
    total: number;
    placedAt: string;
    restaurantName: string;
    customerName: string;
    driverName: string;
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    phone: string | null;
    isOpen: boolean;
    notificationPreference: "dashboard" | "email" | "sms" | "email_and_sms";
    ratingAverage: number;
    ratingCount: number;
  }>;
  drivers: Array<{
    id: string;
    name: string;
    vehicleType: string | null;
    isOnline: boolean;
    isVerified: boolean;
    ratingAverage: number;
    ratingCount: number;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRating(value: number, count: number) {
  if (count === 0) {
    return "No ratings yet";
  }

  return `${value.toFixed(1)} stars (${count})`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNotificationPreferenceLabel(value: AdminDashboardData["restaurants"][number]["notificationPreference"]) {
  switch (value) {
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "email_and_sms":
      return "Email + SMS";
    default:
      return "Dashboard only";
  }
}

export function AdminDashboardContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    data: AdminDashboardData | null;
    message: string | null;
  }>({
    status: "loading",
    data: null,
    message: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          throw new Error("Sign in again to open the admin dashboard.");
        }

        const response = await fetch("/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json()) as AdminDashboardData | { error?: string };

        if (!response.ok) {
          throw new Error("error" in payload ? payload.error ?? "Unable to load admin data." : "Unable to load admin data.");
        }

        if (isMounted) {
          setState({
            status: "ready",
            data: payload as AdminDashboardData,
            message: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            data: null,
            message: error instanceof Error ? error.message : "Unable to load the admin dashboard.",
          });
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  if (state.status === "loading" || !state.data) {
    return (
      <DashboardShell
        eyebrow="Admin dashboard"
        title="Loading platform controls"
        description="Pulling the latest orders, partners, and platform health for your admin view."
        stats={[
          { label: "Platform users", value: "--" },
          { label: "Live orders", value: "--" },
          { label: "Ratings", value: "--" },
        ]}
        actions={[
          {
            title: "Review incoming activity",
            description: "Check live orders, restaurants, drivers, and platform health from one place.",
          },
          {
            title: "Handle partner requests",
            description: "Driver and restaurant account requests are still coming in by email for now.",
          },
        ]}
      >
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Loading admin data...
        </div>
      </DashboardShell>
    );
  }

  if (state.status === "error") {
    return (
      <DashboardShell
        eyebrow="Admin dashboard"
        title="Admin dashboard unavailable"
        description="The admin page could not load platform data right now."
        stats={[
          { label: "Platform users", value: "--" },
          { label: "Live orders", value: "--" },
          { label: "Ratings", value: "--" },
        ]}
        actions={[
          {
            title: "Check environment variables",
            description: "The admin API needs the Supabase service role key available in the web app environment.",
          },
          {
            title: "Confirm your role",
            description: "Only users with the admin role in the profiles table can open this page.",
          },
        ]}
      >
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {state.message ?? "Unable to load the admin dashboard."}
        </div>
      </DashboardShell>
    );
  }

  const totalUsers =
    state.data.counts.customers +
    state.data.counts.drivers +
    state.data.counts.foodPlaces +
    state.data.counts.admins;

  return (
    <DashboardShell
      eyebrow="Admin dashboard"
      title={state.data.adminName ? `Welcome back, ${state.data.adminName}` : "Dalbo admin center"}
      description="Monitor users, active orders, partner operations, and delivery quality from one protected dashboard."
      stats={[
        { label: "Platform users", value: totalUsers.toString() },
        { label: "Live orders", value: state.data.counts.liveOrders.toString() },
        { label: "Ratings", value: state.data.counts.ratings.toString() },
      ]}
      actions={[
        {
          title: "Check account request emails",
          description: "Driver and restaurant requests still arrive by email, so the admin dashboard focuses on review and operations for now.",
        },
        {
          title: "Watch delivery trust",
          description: `${state.data.counts.deliveredOrders} paid orders have been completed and ${state.data.counts.ratings} ratings have been submitted.`,
        },
        {
          title: "Review partner quality",
          description: "Use restaurant notification settings, driver verification state, and ratings to spot follow-up work quickly.",
        },
      ]}
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Customers</p>
            <p className="mt-3 text-3xl font-bold">{state.data.counts.customers}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Drivers</p>
            <p className="mt-3 text-3xl font-bold">{state.data.counts.drivers}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Restaurants</p>
            <p className="mt-3 text-3xl font-bold">{state.data.counts.foodPlaces}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Admins</p>
            <p className="mt-3 text-3xl font-bold">{state.data.counts.admins}</p>
          </article>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Recent orders</h2>
            <p className="mt-2 text-sm text-slate-600">
              Track the latest customer orders, payment state, and driver assignment.
            </p>
          </div>

          <div className="space-y-3">
            {state.data.recentOrders.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                No orders have been placed yet.
              </div>
            ) : (
              state.data.recentOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">{order.restaurantName}</p>
                      <p className="text-sm text-slate-600">
                        {order.customerName} • Driver: {order.driverName}
                      </p>
                      <p className="text-sm text-slate-500">{formatDate(order.placedAt)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm font-medium">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                        {order.status.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                        {order.paymentStatus.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Restaurant operations</h2>
            <p className="mt-2 text-sm text-slate-600">
              Review notification preferences, phone coverage, and restaurant ratings.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {state.data.restaurants.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                No restaurant profiles are available yet.
              </div>
            ) : (
              state.data.restaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {restaurant.phone ?? "No phone number saved"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        restaurant.isOpen
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {restaurant.isOpen ? "Open" : "Closed"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      {getNotificationPreferenceLabel(restaurant.notificationPreference)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      {formatRating(restaurant.ratingAverage, restaurant.ratingCount)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Driver operations</h2>
            <p className="mt-2 text-sm text-slate-600">
              See which drivers are online, verified, and earning strong delivery ratings.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {state.data.drivers.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                No driver profiles are available yet.
              </div>
            ) : (
              state.data.drivers.map((driver) => (
                <article key={driver.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{driver.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {driver.vehicleType ? `Vehicle: ${driver.vehicleType}` : "Vehicle type not set"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm font-semibold">
                      <span
                        className={`rounded-full px-3 py-1 ${
                          driver.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {driver.isOnline ? "Online" : "Offline"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          driver.isVerified ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {driver.isVerified ? "Verified" : "Needs review"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-700">
                      {formatRating(driver.ratingAverage, driver.ratingCount)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

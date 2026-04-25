"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { getCustomerMediaPublicUrl, getDriverMediaPublicUrl } from "../lib/media";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type DriverProfileRow = {
  user_id: string;
  vehicle_type: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expires_on: string | null;
  profile_photo_path: string | null;
  car_photo_path: string | null;
  plate_photo_path: string | null;
  rating_average: number | null;
  rating_count: number | null;
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
  customer_id: string | null;
  customer_name: string | null;
  customer_profile_photo_path: string | null;
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

const initialDriverProfileForm = {
  vehicleType: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleColor: "",
  licensePlate: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceExpiresOn: "",
};

function createDriverProfileForm(profile: DriverProfileRow | null) {
  return {
    vehicleType: profile?.vehicle_type ?? "",
    vehicleMake: profile?.vehicle_make ?? "",
    vehicleModel: profile?.vehicle_model ?? "",
    vehicleColor: profile?.vehicle_color ?? "",
    licensePlate: profile?.license_plate ?? "",
    insuranceProvider: profile?.insurance_provider ?? "",
    insurancePolicyNumber: profile?.insurance_policy_number ?? "",
    insuranceExpiresOn: profile?.insurance_expires_on ?? "",
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

function formatRatingAverage(value: number | null | undefined) {
  return value && value > 0 ? value.toFixed(1) : "New";
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
  const [hasAcceptedInsuranceNotice, setHasAcceptedInsuranceNotice] = useState(false);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    userId?: string;
    data?: DriverDashboardData;
    message?: string;
  }>({ status: "loading" });
  const [driverProfileForm, setDriverProfileForm] = useState(initialDriverProfileForm);
  const [driverPhotoFile, setDriverPhotoFile] = useState<File | null>(null);
  const [driverPhotoPreviewUrl, setDriverPhotoPreviewUrl] = useState("");
  const [carPhotoFile, setCarPhotoFile] = useState<File | null>(null);
  const [carPhotoPreviewUrl, setCarPhotoPreviewUrl] = useState("");
  const [platePhotoFile, setPlatePhotoFile] = useState<File | null>(null);
  const [platePhotoPreviewUrl, setPlatePhotoPreviewUrl] = useState("");
  const [profileState, setProfileState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [jobState, setJobState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    orderId?: string;
  }>({ status: "idle" });

  async function uploadDriverImage(file: File, kind: "profile" | "car" | "plate") {
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

    const response = await fetch("/api/driver/upload-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    const payload = (await response.json()) as { path?: string; error?: string };

    if (!response.ok || !payload.path) {
      throw new Error(payload.error || "Unable to upload the driver image right now.");
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

      const [profileResult, availableJobsResult, activeDeliveriesResult, deliveredCountResult] =
        await Promise.all([
          supabase
            .from("drivers")
            .select(
              "user_id, vehicle_type, vehicle_make, vehicle_model, vehicle_color, license_plate, insurance_provider, insurance_policy_number, insurance_expires_on, profile_photo_path, car_photo_path, plate_photo_path, rating_average, rating_count, is_online, is_verified",
            )
            .eq("user_id", session.user.id)
            .maybeSingle<DriverProfileRow>(),
          supabase
            .from("orders")
            .select(
              "id, status, total, placed_at, notes, restaurant_id, customer_id, delivery_address_id, restaurants(name, address_text)",
            )
            .is("driver_id", null)
            .eq("payment_status", "paid")
            .eq("status", "ready")
            .order("placed_at", { ascending: true }),
          supabase
            .from("orders")
            .select(
              "id, status, total, placed_at, notes, restaurant_id, customer_id, delivery_address_id, restaurants(name, address_text)",
            )
            .eq("driver_id", session.user.id)
            .eq("payment_status", "paid")
            .in("status", ["ready", "picked_up"])
            .order("placed_at", { ascending: true }),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("driver_id", session.user.id)
            .eq("payment_status", "paid")
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
          customer_id: string | null;
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
          customer_id: string | null;
          delivery_address_id: string | null;
          restaurants: { name: string; address_text: string | null } | { name: string; address_text: string | null }[] | null;
        }> | null) ?? [];

      const allOrderIds = [...availableRows, ...activeRows].map((order) => order.id);
      const activeAddressIds = activeRows
        .map((order) => order.delivery_address_id)
        .filter((value): value is string => Boolean(value));
      const activeCustomerIds = activeRows
        .map((order) => order.customer_id)
        .filter((value): value is string => Boolean(value));

      const [orderItemsResult, addressesResult, customerProfilesResult] = await Promise.all([
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
        activeCustomerIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, full_name, profile_photo_path")
              .in("id", activeCustomerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (orderItemsResult.error) {
        throw orderItemsResult.error;
      }

      if (addressesResult.error) {
        throw addressesResult.error;
      }

      if (customerProfilesResult.error) {
        throw customerProfilesResult.error;
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
      const customerProfilesById = ((customerProfilesResult.data ?? []) as Array<{
        id: string;
        full_name: string | null;
        profile_photo_path: string | null;
      }>).reduce<Record<string, { full_name: string | null; profile_photo_path: string | null }>>(
        (accumulator, profile) => {
          accumulator[profile.id] = {
            full_name: profile.full_name,
            profile_photo_path: profile.profile_photo_path,
          };
          return accumulator;
        },
        {},
      );

      const toDeliveryJob = (order: {
        id: string;
        status: string;
        total: number;
        placed_at: string;
        notes: string | null;
        restaurant_id: string;
        customer_id: string | null;
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
        customer_id: order.customer_id,
        customer_name: order.customer_id
          ? (customerProfilesById[order.customer_id]?.full_name ?? null)
          : null,
        customer_profile_photo_path: order.customer_id
          ? (customerProfilesById[order.customer_id]?.profile_photo_path ?? null)
          : null,
        delivery_address_id: order.delivery_address_id,
        delivery_address_text: order.delivery_address_id
          ? (addressesById[order.delivery_address_id]?.address_text ?? null)
          : null,
        delivery_address_label: order.delivery_address_id
          ? (addressesById[order.delivery_address_id]?.label ?? null)
          : null,
        items: itemsByOrderId[order.id] ?? [],
      });

      setDriverProfileForm(createDriverProfileForm(profileResult.data ?? null));
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

  useEffect(() => {
    if (!driverPhotoFile) {
      setDriverPhotoPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(driverPhotoFile);
    setDriverPhotoPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [driverPhotoFile]);

  useEffect(() => {
    if (!carPhotoFile) {
      setCarPhotoPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(carPhotoFile);
    setCarPhotoPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [carPhotoFile]);

  useEffect(() => {
    if (!platePhotoFile) {
      setPlatePhotoPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(platePhotoFile);
    setPlatePhotoPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [platePhotoFile]);

  async function handleSaveDriverProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.userId) {
      return;
    }

    if (!driverProfileForm.licensePlate.trim()) {
      setProfileState({
        status: "error",
        message: "Enter the car plate number before saving the driver profile.",
      });
      return;
    }

    setProfileState({ status: "submitting" });

    let profilePhotoPath = state.data?.profile?.profile_photo_path ?? null;
    let carPhotoPath = state.data?.profile?.car_photo_path ?? null;
    let platePhotoPath = state.data?.profile?.plate_photo_path ?? null;

    try {
      if (driverPhotoFile) {
        profilePhotoPath = await uploadDriverImage(driverPhotoFile, "profile");
      }

      if (carPhotoFile) {
        carPhotoPath = await uploadDriverImage(carPhotoFile, "car");
      }

      if (platePhotoFile) {
        platePhotoPath = await uploadDriverImage(platePhotoFile, "plate");
      }
    } catch (error) {
      setProfileState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to upload the driver images right now.",
      });
      return;
    }

    const nextOnlineState = state.data?.profile?.is_online ?? true;
    const { error } = await (supabase.from("drivers") as any).upsert(
      {
        user_id: state.userId,
        vehicle_type: driverProfileForm.vehicleType || null,
        vehicle_make: driverProfileForm.vehicleMake || null,
        vehicle_model: driverProfileForm.vehicleModel || null,
        vehicle_color: driverProfileForm.vehicleColor || null,
        license_plate: driverProfileForm.licensePlate || null,
        insurance_provider: driverProfileForm.insuranceProvider || null,
        insurance_policy_number: driverProfileForm.insurancePolicyNumber || null,
        insurance_expires_on: driverProfileForm.insuranceExpiresOn || null,
        profile_photo_path: profilePhotoPath,
        car_photo_path: carPhotoPath,
        plate_photo_path: platePhotoPath,
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
    setDriverPhotoFile(null);
    setCarPhotoFile(null);
    setPlatePhotoFile(null);
    await loadDashboard();
  }

  async function handleToggleOnline() {
    if (!state.userId) {
      return;
    }

    if (!hasAcceptedInsuranceNotice) {
      setProfileState({
        status: "error",
        message: "You must accept the insurance warning before going online.",
      });
      return;
    }

    if (!(driverProfileForm.licensePlate || state.data?.profile?.license_plate || "").trim()) {
      setProfileState({
        status: "error",
        message: "Add the car plate number before going online.",
      });
      return;
    }

    if (
      !driverPhotoFile &&
      !state.data?.profile?.profile_photo_path &&
      !carPhotoFile &&
      !state.data?.profile?.car_photo_path &&
      !platePhotoFile &&
      !state.data?.profile?.plate_photo_path
    ) {
      setProfileState({
        status: "error",
        message: "Upload the driver photo, car picture, and clear plate picture before going online.",
      });
      return;
    }

    if (!driverPhotoFile && !state.data?.profile?.profile_photo_path) {
      setProfileState({
        status: "error",
        message: "Upload the driver picture before going online.",
      });
      return;
    }

    if (!carPhotoFile && !state.data?.profile?.car_photo_path) {
      setProfileState({
        status: "error",
        message: "Upload the car picture before going online.",
      });
      return;
    }

    if (!platePhotoFile && !state.data?.profile?.plate_photo_path) {
      setProfileState({
        status: "error",
        message: "Upload a clear plate picture before going online.",
      });
      return;
    }

    setProfileState({ status: "submitting" });
    const nextOnlineState = !(state.data?.profile?.is_online ?? false);

    const { error } = await (supabase.from("drivers") as any).upsert(
      {
        user_id: state.userId,
        vehicle_type: driverProfileForm.vehicleType || null,
        vehicle_make: driverProfileForm.vehicleMake || null,
        vehicle_model: driverProfileForm.vehicleModel || null,
        vehicle_color: driverProfileForm.vehicleColor || null,
        license_plate: driverProfileForm.licensePlate || null,
        insurance_provider: driverProfileForm.insuranceProvider || null,
        insurance_policy_number: driverProfileForm.insurancePolicyNumber || null,
        insurance_expires_on: driverProfileForm.insuranceExpiresOn || null,
        profile_photo_path: state.data?.profile?.profile_photo_path ?? null,
        car_photo_path: state.data?.profile?.car_photo_path ?? null,
        plate_photo_path: state.data?.profile?.plate_photo_path ?? null,
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

    if (!driverPhotoFile && !state.data?.profile?.profile_photo_path) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: "Upload the driver picture before claiming deliveries.",
      });
      return;
    }

    if (!carPhotoFile && !state.data?.profile?.car_photo_path) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: "Upload the car picture before claiming deliveries.",
      });
      return;
    }

    if (!platePhotoFile && !state.data?.profile?.plate_photo_path) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: "Upload a clear plate picture before claiming deliveries.",
      });
      return;
    }

    if (!hasAcceptedInsuranceNotice) {
      setJobState({
        status: "error",
        orderId: order.id,
        message: "Accept the insurance warning before claiming deliveries.",
      });
      return;
    }

    setJobState({
      status: "submitting",
      orderId: order.id,
    });

    const { data, error } = await (supabase
      .from("orders") as any)
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

    const { error } = await (supabase
      .from("orders") as any)
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
  const readyToPickUpCount = activeDeliveries.filter((job) => job.status === "ready").length;
  const onTheRoadCount = activeDeliveries.filter((job) => job.status === "picked_up").length;
  const driverPhotoUrl = getDriverMediaPublicUrl(profile?.profile_photo_path);
  const carPhotoUrl = getDriverMediaPublicUrl(profile?.car_photo_path);
  const platePhotoUrl = getDriverMediaPublicUrl(profile?.plate_photo_path);

  return (
    <DashboardShell
      eyebrow="Driver dashboard"
      title="Go online, claim delivery jobs, and keep every trip moving."
      description="Run the driver workflow from one page: manage your availability, accept ready pickups, confirm handoff, and finish each delivery cleanly."
      stats={[
        {
          label: "Ready jobs",
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
          title: "Set your driver status",
          description: "Save the driver profile once, then go online only when you are ready to claim jobs.",
        },
        {
          title: "Claim ready pickups",
          description: "Ready jobs come from paid restaurant orders that are waiting for the next available driver.",
        },
        {
          title: "Finish the route",
          description: "After pickup, update the delivery status again when the order reaches the customer.",
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

        {state.status === "ready" ? (
          <section className="overflow-hidden rounded-[32px] bg-[#0b1020] text-white">
            <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
              <div className="space-y-4">
                <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-green-200">
                  Driver dispatch
                </span>
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {profile?.is_online ? "You are online and ready for new jobs." : "Go online when you are ready to deliver."}
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    Keep an eye on ready pickups, active trips, and completed deliveries from one dispatch-style dashboard.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                    Status: {profile?.is_online ? "Online" : "Offline"}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                    Verification: {profile?.is_verified ? "Verified" : "Pending"}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                    Vehicle: {profile?.vehicle_type || driverProfileForm.vehicleType || "Not set"}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-slate-100">
                    Rating: {formatRatingAverage(profile?.rating_average)} ({profile?.rating_count ?? 0})
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                  <p className="text-sm font-semibold text-green-200">Ready to claim</p>
                  <p className="mt-3 text-3xl font-bold text-white">{availableJobs.length}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Restaurant orders are ready and still waiting for a driver.
                  </p>
                </article>
                <article className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                  <p className="text-sm font-semibold text-green-200">On your route</p>
                  <p className="mt-3 text-3xl font-bold text-white">{activeDeliveries.length}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {readyToPickUpCount} waiting at pickup and {onTheRoadCount} already on the road.
                  </p>
                </article>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Driver availability</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Save the driver profile once, then go online to start receiving ready delivery jobs.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={handleSaveDriverProfile}>
              <div>
                <h3 className="text-lg font-semibold">Driver profile</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add the driver photo, car details, and insurance information used for dispatch and driver verification.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Driver photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setDriverPhotoFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-green-100 file:px-4 file:py-2 file:font-semibold file:text-green-700 focus:border-green-400"
                />
              </label>

              {driverPhotoPreviewUrl || driverPhotoUrl ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <img
                    src={driverPhotoPreviewUrl || driverPhotoUrl || ""}
                    alt="Driver profile preview"
                    className="h-56 w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Car picture</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setCarPhotoFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-green-100 file:px-4 file:py-2 file:font-semibold file:text-green-700 focus:border-green-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Clear plate picture
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setPlatePhotoFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-green-100 file:px-4 file:py-2 file:font-semibold file:text-green-700 focus:border-green-400"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {carPhotoPreviewUrl || carPhotoUrl ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <img
                      src={carPhotoPreviewUrl || carPhotoUrl || ""}
                      alt="Car preview"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Upload a car picture so customers can recognize the vehicle.
                  </div>
                )}

                {platePhotoPreviewUrl || platePhotoUrl ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <img
                      src={platePhotoPreviewUrl || platePhotoUrl || ""}
                      alt="Plate preview"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Upload a clear plate picture so the customer can match the car plate.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Vehicle type</span>
                  <input
                    value={driverProfileForm.vehicleType}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        vehicleType: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="Scooter, bike, or car"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Car plate number</span>
                  <input
                    value={driverProfileForm.licensePlate}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        licensePlate: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="ABC-1234"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Vehicle make</span>
                  <input
                    value={driverProfileForm.vehicleMake}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        vehicleMake: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="Toyota"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Vehicle model</span>
                  <input
                    value={driverProfileForm.vehicleModel}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        vehicleModel: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="Corolla"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Vehicle color</span>
                  <input
                    value={driverProfileForm.vehicleColor}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        vehicleColor: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="White"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Insurance provider</span>
                  <input
                    value={driverProfileForm.insuranceProvider}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        insuranceProvider: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="State Farm"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Policy number</span>
                  <input
                    value={driverProfileForm.insurancePolicyNumber}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        insurancePolicyNumber: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                    placeholder="POL-123456"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Insurance expiry date</span>
                  <input
                    type="date"
                    value={driverProfileForm.insuranceExpiresOn}
                    onChange={(event) =>
                      setDriverProfileForm((current) => ({
                        ...current,
                        insuranceExpiresOn: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-400"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Insurance warning</p>
                <p className="mt-2 leading-6">
                  Dalbo does not cover driver insurance. If you are delivering food to customers, you
                  are fully responsible for your own vehicle insurance and delivery coverage.
                </p>
                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={hasAcceptedInsuranceNotice}
                    onChange={(event) => setHasAcceptedInsuranceNotice(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <span>
                    I understand Dalbo does not provide insurance and I am using my own insurance
                    coverage while delivering food.
                  </span>
                </label>
              </div>

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
                  disabled={profileState.status === "submitting" || !hasAcceptedInsuranceNotice}
                  className="rounded-2xl bg-[#18a957] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#128447] disabled:opacity-60"
                >
                  {profile?.is_online ? "Go offline" : "Go online"}
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold">Driver summary</h3>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {driverProfileForm.vehicleMake || profile?.vehicle_make || "Vehicle make not set"}{" "}
                    {driverProfileForm.vehicleModel || profile?.vehicle_model || ""}
                  </p>
                  <p className="mt-2">
                    Type: {driverProfileForm.vehicleType || profile?.vehicle_type || "Not set"}
                  </p>
                  <p className="mt-1">
                    Plate: {driverProfileForm.licensePlate || profile?.license_plate || "Not set"}
                  </p>
                  <p className="mt-1">
                    Color: {driverProfileForm.vehicleColor || profile?.vehicle_color || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Insurance</p>
                  <p className="mt-2">
                    Provider: {driverProfileForm.insuranceProvider || profile?.insurance_provider || "Not set"}
                  </p>
                  <p className="mt-1">
                    Policy: {driverProfileForm.insurancePolicyNumber || profile?.insurance_policy_number || "Not set"}
                  </p>
                  <p className="mt-1">
                    Expires: {driverProfileForm.insuranceExpiresOn || profile?.insurance_expires_on || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Driver rating</p>
                  <p className="mt-2">
                    Average: {formatRatingAverage(profile?.rating_average)} stars
                  </p>
                  <p className="mt-1">Ratings received: {profile?.rating_count ?? 0}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Car picture</p>
                    {carPhotoPreviewUrl || carPhotoUrl ? (
                      <img
                        src={carPhotoPreviewUrl || carPhotoUrl || ""}
                        alt="Saved car"
                        className="mt-3 h-40 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <p className="mt-2">No car picture uploaded yet.</p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Plate picture</p>
                    {platePhotoPreviewUrl || platePhotoUrl ? (
                      <img
                        src={platePhotoPreviewUrl || platePhotoUrl || ""}
                        alt="Saved plate"
                        className="mt-3 h-40 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <p className="mt-2">No plate picture uploaded yet.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Ready jobs
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{availableJobs.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Waiting pickup
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{readyToPickUpCount}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Delivered total
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{deliveredCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Ready pickups</h2>
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
                      <div className="flex flex-wrap items-center gap-3">
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

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleAcceptJob(job)}
                      disabled={
                        !hasAcceptedInsuranceNotice ||
                        !profile?.is_online ||
                        (jobState.status === "submitting" && jobState.orderId === job.id)
                      }
                      className="rounded-2xl bg-[#18a957] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#128447] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {jobState.status === "submitting" && jobState.orderId === job.id
                        ? "Accepting..."
                        : !hasAcceptedInsuranceNotice
                          ? "Accept insurance warning first"
                        : profile?.is_online
                          ? "Accept delivery"
                          : "Go online to accept"}
                    </button>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Dropoff: {job.delivery_address_text || "Shown after the job is accepted"}
                    </div>
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
                const customerPhotoUrl = getCustomerMediaPublicUrl(job.customer_profile_photo_path);

                return (
                  <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
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

                    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Customer details</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Confirm the customer photo before dropoff.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {job.customer_name || "Customer"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        {customerPhotoUrl ? (
                          <img
                            src={customerPhotoUrl}
                            alt={job.customer_name || "Customer"}
                            className="h-28 w-28 rounded-3xl object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-center text-xs font-semibold text-slate-500">
                            No customer photo
                          </div>
                        )}

                        <div className="space-y-2 text-sm text-slate-600">
                          <p>
                            <span className="font-semibold text-slate-900">Customer:</span>{" "}
                            {job.customer_name || "Name not added yet"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Dropoff:</span>{" "}
                            {job.delivery_address_text
                              ? `${job.delivery_address_label ? `${job.delivery_address_label} - ` : ""}${job.delivery_address_text}`
                              : "Address not available yet"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {nextStatus ? (
                      <div className="mt-4 flex flex-wrap gap-3">
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
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          {job.status === "ready"
                            ? "Next step: pick up the order from the restaurant."
                            : "Next step: complete the dropoff for the customer."}
                        </div>
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

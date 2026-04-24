export type AppRole = "customer" | "driver" | "food_place" | "admin";

export const roleRoutes: Record<AppRole, string> = {
  customer: "/dashboard/customer",
  driver: "/dashboard/driver",
  food_place: "/dashboard/food-place",
  admin: "/dashboard/food-place",
};

export function getDashboardRoute(role: AppRole) {
  return roleRoutes[role] ?? "/dashboard/customer";
}

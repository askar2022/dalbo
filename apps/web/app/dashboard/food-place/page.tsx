import { FoodPlaceDashboardContent } from "../../../components/food-place-dashboard-content";
import { ProtectedDashboard } from "../../../components/protected-dashboard";

export default function FoodPlaceDashboardPage() {
  return (
    <ProtectedDashboard expectedRole="food_place">
      <FoodPlaceDashboardContent />
    </ProtectedDashboard>
  );
}

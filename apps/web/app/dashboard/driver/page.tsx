import { DriverDashboardContent } from "../../../components/driver-dashboard-content";
import { ProtectedDashboard } from "../../../components/protected-dashboard";

export default function DriverDashboardPage() {
  return (
    <ProtectedDashboard expectedRole="driver">
      <DriverDashboardContent />
    </ProtectedDashboard>
  );
}

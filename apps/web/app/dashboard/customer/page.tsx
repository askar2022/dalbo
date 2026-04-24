import { CustomerDashboardContent } from "../../../components/customer-dashboard-content";
import { ProtectedDashboard } from "../../../components/protected-dashboard";

export default function CustomerDashboardPage() {
  return (
    <ProtectedDashboard expectedRole="customer">
      <CustomerDashboardContent />
    </ProtectedDashboard>
  );
}

import { AdminDashboardContent } from "../../../components/admin-dashboard-content";
import { ProtectedDashboard } from "../../../components/protected-dashboard";

export default function AdminDashboardPage() {
  return (
    <ProtectedDashboard expectedRole="admin">
      <AdminDashboardContent />
    </ProtectedDashboard>
  );
}

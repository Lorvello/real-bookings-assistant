import { SecurityAuditDashboard } from '@/components/admin/SecurityAuditDashboard';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function SecurityAudit() {
  return (
    <DashboardLayout>
      <SecurityAuditDashboard />
    </DashboardLayout>
  );
}

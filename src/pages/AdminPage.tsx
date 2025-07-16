import { UserSubscriptionManager } from '@/components/admin/UserSubscriptionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage user subscriptions and subscription tiers
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This is an admin interface for managing user subscriptions. Use with caution.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Database Functions Available</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>admin_update_user_subscription</strong> - Update user subscription status and tier</p>
            <p><strong>admin_extend_trial</strong> - Extend trial period for testing</p>
            <p><strong>get_user_subscription_details</strong> - Get detailed user subscription information</p>
            <p><strong>update_existing_users_retroactively</strong> - Update existing users with trial dates</p>
          </div>
        </CardContent>
      </Card>

      <UserSubscriptionManager />
    </div>
  );
}
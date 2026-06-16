
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { QRCodeDisplay } from '@/components/profile/QRCodeDisplay';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const qrValue = React.useMemo(() => {
    if (profile?.qr_code_data) return profile.qr_code_data;
    if (user?.id) {
      return JSON.stringify({ user_id: user.id, app: 'bookingassistant', type: 'user_profile' });
    }
    return '';
  }, [profile?.qr_code_data, user?.id]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-foreground">Loading Profile...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="bg-background min-h-full p-3 md:p-8">
        <div className="mb-4 md:mb-8">
          <div className="surface-raised rounded-2xl p-3 md:p-6">
            <h1 className="text-lg md:text-3xl font-semibold tracking-[-0.02em] text-foreground mb-1 md:mb-2">
              Profile
            </h1>
            <p className="text-muted-foreground text-xs md:text-base">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="surface-raised rounded-xl p-3 md:p-6">
          <h2 className="text-base md:text-xl font-semibold text-foreground mb-4 md:mb-6">Account Information</h2>
          
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-foreground mb-1 md:mb-2">
                Email
              </label>
              <div className="w-full px-3 md:px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-foreground text-sm md:text-base">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-foreground mb-1 md:mb-2">
                User ID
              </label>
              <div className="w-full px-3 md:px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-foreground font-mono text-xs md:text-sm">
                {user.id}
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-foreground mb-1 md:mb-2">
                Account Created
              </label>
              <div className="w-full px-3 md:px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-foreground text-sm md:text-base">
                {new Date(user.created_at).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="surface-raised rounded-xl p-3 md:p-6 mt-4 md:mt-6">
          <h2 className="text-base md:text-xl font-semibold text-foreground mb-4 md:mb-2">Your QR code</h2>
          {profileLoading ? (
            <div className="h-40 bg-background/60 border border-white/[0.08] rounded-lg animate-pulse" />
          ) : (
            <QRCodeDisplay data={qrValue} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

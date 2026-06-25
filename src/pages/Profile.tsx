
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, QrCode, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/DashboardLayout';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { QRCodeDisplay } from '@/components/profile/QRCodeDisplay';
import { cn } from '@/lib/utils';

/**
 * Copy-to-clipboard control reusing the canonical idiom shipped on the WhatsApp
 * Booking Assistant surface (R-B11): copied-state Copy/Check swap, a sonner toast,
 * a 2s reset, and the `min-w-11 md:min-w-0` 44px mobile tap target (desktop 32px,
 * byte-identical). The icon swap is the (B) micro-interaction (no transform, so
 * inherently reduced-motion-safe); the ghost Button carries the focus-visible ring.
 */
const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant="ghost"
      size="icon"
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      className="shrink-0 min-w-11 md:min-w-0 hover:bg-white/[0.06]"
    >
      {copied ? (
        <Check className="h-4 w-4 text-accent-foreground" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
};

/** Read-only account field: label over a hairline value box, with an optional copy action. */
const ReadOnlyField: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}> = ({ label, value, mono, copyable }) => (
  <div>
    <p className="mb-1 block text-xs font-medium text-foreground md:mb-2 md:text-sm">{label}</p>
    <div className="flex items-start gap-2">
      <div
        className={cn(
          'min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground md:px-4 md:text-base',
          mono && 'break-all font-mono text-xs md:text-sm',
        )}
      >
        {value}
      </div>
      {copyable && value ? <CopyButton value={value} label={label} /> : null}
    </div>
  </div>
);

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
            <div className="w-8 h-8 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-foreground">Loading Profile...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const createdAt = new Date(user.created_at);
  const accountCreated = Number.isNaN(createdAt.getTime())
    ? 'Not available'
    : createdAt.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

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

        <div className="space-y-4 md:space-y-6">
          <SettingsSection title="Account Information" icon={User}>
            <div className="space-y-3 md:space-y-4">
              <ReadOnlyField label="Email" value={user.email ?? ''} copyable />
              <ReadOnlyField label="User ID" value={user.id} mono copyable />
              <ReadOnlyField label="Account Created" value={accountCreated} />
            </div>
          </SettingsSection>

          <SettingsSection title="Your QR code" icon={QrCode}>
            {profileLoading ? (
              <div className="h-40 bg-background/60 border border-white/[0.08] rounded-lg animate-pulse" />
            ) : (
              <QRCodeDisplay data={qrValue} />
            )}
          </SettingsSection>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

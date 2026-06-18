import React from 'react';
import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '../SettingsSection';
import { SettingsField } from '../SettingsField';
import { CountryPhoneInput } from '../CountryPhoneInput';

interface ProfileSectionProps {
  fullName: string;
  email: string;
  phone: string;
  /** Only the editable fields flow up; email is read-only (login identity). */
  onChange: (field: 'full_name' | 'phone', value: string) => void;
}

/**
 * Pure presentational "Your profile" section (PREMIUM_DESIGN_PLAYBOOK §6 Settings).
 * No hooks, no auth — the orchestrator (UserManagement) owns local state + save, so
 * the no-auth harness can mount this against plain mock state. Replaces the old
 * hand-rolled `bg-background rounded-lg p-6 border` grid with the shared section +
 * field rhythm so Profile sits flush with every other Settings tab.
 */
export function ProfileSection({ fullName, email, phone, onChange }: ProfileSectionProps) {
  return (
    <SettingsSection
      icon={User}
      title="Your profile"
      description="Your personal details for this workspace. Only you can see these."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SettingsField label="Full name" htmlFor="profile-full-name">
          <Input
            id="profile-full-name"
            value={fullName}
            onChange={(e) => onChange('full_name', e.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </SettingsField>

        {/* Email is read-only on purpose: it is the LOGIN identity (auth.users.email).
            The old editable field only wrote public.users.email and never touched
            Supabase Auth, so the shown email and the actual login could silently
            diverge. Until a verified email-change flow exists, show the real login
            email read-only so it can never lie. */}
        <SettingsField
          label="Email"
          htmlFor="profile-email"
          description="Your login email. To change it, contact support."
        >
          <Input
            id="profile-email"
            type="email"
            value={email}
            readOnly
            disabled
            aria-label="Login email (read-only)"
            className="cursor-not-allowed text-muted-foreground"
          />
        </SettingsField>

        <SettingsField label="Phone number" htmlFor="profile-phone" className="md:col-span-2">
          <CountryPhoneInput
            inputId="profile-phone"
            value={phone}
            onChange={(value) => onChange('phone', value)}
          />
        </SettingsField>
      </div>
    </SettingsSection>
  );
}

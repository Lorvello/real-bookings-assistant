import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { SettingsSection } from './SettingsSection';
import { SettingsField } from './SettingsField';

export const SetPasswordSection: React.FC = () => {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is Google-only (no password set)
  const isGoogleOnlyAccount = (): boolean => {
    if (!user) return false;
    
    const providers = user.app_metadata?.providers as string[] | undefined;
    const provider = user.app_metadata?.provider as string | undefined;
    
    // User is Google-only if:
    // 1. Only provider is 'google' OR
    // 2. Providers array only contains 'google'
    return (
      (provider === 'google' && (!providers || !providers.includes('email'))) ||
      (providers && providers.length === 1 && providers[0] === 'google')
    ) || false;
  };

  const validatePassword = (): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSetPassword = async () => {
    const validationError = validatePassword();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // First, update the password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) {
        throw authError;
      }

      // Then, mark password_added = true in the users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ password_added: true })
        .eq('id', user?.id);

      if (dbError) {
        console.error('Error updating password_added flag:', dbError);
        // Don't throw - password was set successfully, just the flag failed
      }

      setPassword('');
      setConfirmPassword('');
      
      // Refetch profile to update the UI
      await refetch();
      
      toast({
        title: "Password Set Successfully",
        description: "You can now sign in with your email and password.",
      });
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Error Setting Password",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if:
  // 1. Profile not loaded yet
  // 2. Password was already added (database flag)
  // 3. Not a Google-only account
  if (!profile || profile.password_added === true || !isGoogleOnlyAccount()) {
    return null;
  }

  return (
    <SettingsSection
      icon={Lock}
      title="Add email/password login"
      description="Your account was created with Google. Add a password to also sign in with your email address."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.08] px-3.5 py-2.5 text-sm text-accent-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>After setting a password, you can sign in with either Google or your email and password.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SettingsField
            label="New password"
            htmlFor="new-password"
            description="At least 8 characters, with an uppercase, a lowercase and a number."
          >
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                placeholder="Enter a strong password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </SettingsField>

          <SettingsField label="Confirm password" htmlFor="confirm-password">
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </SettingsField>
        </div>

        <Button
          onClick={handleSetPassword}
          loading={isSubmitting}
          disabled={!password || !confirmPassword}
          className="w-full sm:w-auto"
        >
          <Lock className="mr-2 h-4 w-4" />
          Set password
        </Button>
      </div>
    </SettingsSection>
  );
};

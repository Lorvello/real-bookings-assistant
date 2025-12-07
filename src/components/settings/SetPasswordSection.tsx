import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Lock, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

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
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-blue-900/30 rounded-lg">
          <Lock className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Add Email/Password Login</h3>
          <p className="text-sm text-gray-400 mt-1">
            Your account was created with Google. Add a password to also sign in with your email address.
          </p>
        </div>
      </div>

      <Alert className="bg-blue-900/20 border-blue-700 mb-4">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200">
          After setting a password, you can sign in with either Google or your email/password.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium text-gray-300 mb-2">
            New Password
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white pr-10"
              placeholder="Enter a strong password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            At least 8 characters, including uppercase, lowercase, and a number
          </p>
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white pr-10"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          onClick={handleSetPassword}
          disabled={isSubmitting || !password || !confirmPassword}
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Setting Password...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Set Password
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

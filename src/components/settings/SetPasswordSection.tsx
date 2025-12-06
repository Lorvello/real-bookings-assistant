import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Lock, Info, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SetPasswordSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGoogleOnlyAccount, setIsGoogleOnlyAccount] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);

  // Check if user is Google-only (no password set)
  useEffect(() => {
    const checkAuthProvider = async () => {
      if (!user) return;
      
      // Check user's app_metadata for providers
      const providers = user.app_metadata?.providers as string[] | undefined;
      const provider = user.app_metadata?.provider as string | undefined;
      
      // User is Google-only if:
      // 1. Only provider is 'google' OR
      // 2. Providers array only contains 'google'
      const isGoogleOnly = 
        (provider === 'google' && (!providers || !providers.includes('email'))) ||
        (providers && providers.length === 1 && providers[0] === 'google');
      
      setIsGoogleOnlyAccount(isGoogleOnly);
    };

    checkAuthProvider();
  }, [user]);

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
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setPasswordSet(true);
      setPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Password Set Successfully",
        description: "You can now sign in with your email and password.",
      });

      // Update local state to reflect that user now has password
      setIsGoogleOnlyAccount(false);
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

  // Don't render if still checking or not a Google-only account
  if (isGoogleOnlyAccount === null || isGoogleOnlyAccount === false) {
    return null;
  }

  if (passwordSet) {
    return (
      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="h-5 w-5" />
          <span className="font-medium">Password added successfully!</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          You can now sign in with your email address and password.
        </p>
      </div>
    );
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

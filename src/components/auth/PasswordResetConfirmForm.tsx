import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PasswordInput } from '@/components/ui/password-input';
import { validatePassword } from '@/utils/passwordValidation';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const PasswordResetConfirmForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if we have the required tokens
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      toast({
        title: "Invalid Reset Link",
        description: "This password reset link is invalid or has expired. Please request a new one.",
        variant: "destructive",
      });
      navigate('/forgot-password');
    }
  }, [searchParams, navigate, toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0] || 'Password does not meet security requirements';
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log('[PasswordReset] Updating password');
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('[PasswordReset] Update error:', error);
        
        if (error.message.includes('token')) {
          toast({
            title: "Reset Link Expired",
            description: "This password reset link has expired. Please request a new one.",
            variant: "destructive",
          });
          navigate('/forgot-password');
          return;
        }
        
        handleError(error, 'Password update');
        return;
      }

      console.log('[PasswordReset] Password updated successfully');
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now sign in with your new password.",
      });

      // Sign out to ensure clean state, then redirect to login
      await supabase.auth.signOut();
      navigate('/login');

    } catch (error) {
      console.error('[PasswordReset] Unexpected error:', error);
      handleError(error, 'Password update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-card border-border shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Set New Password
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-2">
            <PasswordInput
              label="New Password"
              placeholder="Enter your new password"
              value={password}
              onChange={setPassword}
              showStrengthIndicator={true}
              required={true}
              error={errors.password}
            />
          </div>

          <div className="space-y-2">
            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required={true}
              error={errors.confirmPassword}
            />
            
            {confirmPassword && password === confirmPassword && (
              <div className="flex items-center space-x-1 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Passwords match</span>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
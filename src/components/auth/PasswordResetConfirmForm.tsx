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
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse both tokens and errors from URL
  const parseUrlParams = () => {
    console.log("🔍 Current URL:", window.location.href);
    console.log("🔍 URL hash:", window.location.hash);
    console.log("🔍 URL search:", window.location.search);
    
    // Try hash fragments first (standard for Supabase auth)
    const hash = window.location.hash.substring(1);
    let params = new URLSearchParams(hash);
    
    // Fallback to search params if no tokens in hash
    if (!params.get('access_token') && !params.get('error') && window.location.search) {
      console.log("🔍 No tokens/errors in hash, checking search params");
      params = new URLSearchParams(window.location.search);
    }
    
    const tokens = {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      type: params.get('type')
    };
    
    const errors = {
      error: params.get('error'),
      error_code: params.get('error_code'),
      error_description: params.get('error_description')
    };
    
    console.log("🔍 Extracted tokens:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      type: tokens.type,
      accessTokenLength: tokens.access_token?.length || 0,
      refreshTokenLength: tokens.refresh_token?.length || 0,
      source: hash ? 'hash' : 'search'
    });
    
    console.log("🔍 Extracted errors:", errors);
    
    return { tokens, errors };
  };

  useEffect(() => {
    // Parse both tokens and errors from URL
    const { tokens, errors } = parseUrlParams();
    const { access_token, refresh_token, type } = tokens;
    
    console.log("🔍 Token validation:", {
      hasTokens: !!(access_token && refresh_token),
      isRecoveryType: type === 'recovery',
      currentPath: window.location.pathname,
      hasErrors: !!(errors.error)
    });
    
    // Check for URL-based errors first (like expired links)
    if (errors.error) {
      console.log("❌ Error in URL:", errors);
      
      let errorMessage = "Er is een probleem opgetreden met de reset link.";
      let errorDescription = "Probeer opnieuw een nieuwe reset link aan te vragen.";
      
      if (errors.error_code === 'otp_expired' || errors.error === 'access_denied') {
        errorMessage = "Reset Link Verlopen";
        errorDescription = "Deze wachtwoord reset link is verlopen. Reset links zijn slechts 1 uur geldig. Vraag een nieuwe aan.";
      } else if (errors.error_description) {
        errorDescription = decodeURIComponent(errors.error_description.replace(/\+/g, ' '));
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      });
      
      // Stay on this page instead of redirecting, so user sees the error message
      // They can manually navigate to forgot-password if needed
      return;
    }
    
    if (!access_token || !refresh_token || type !== 'recovery') {
      console.log("❌ Invalid tokens or type, redirecting to forgot-password");
      
      // Check if user came from wrong domain redirect
      const currentDomain = window.location.origin;
      const expectedDomain = 'https://bookingsassistant.com';
      
      if (currentDomain !== expectedDomain) {
        console.log("⚠️  Domain mismatch detected:", { currentDomain, expectedDomain });
        toast({
          title: "Domain Configuration Issue",
          description: "You were redirected from an incorrect domain. Please check your Supabase Auth URL configuration.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invalid Reset Link",
          description: "This password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
      }
      navigate('/forgot-password');
      return;
    }

    // Set the session with the tokens from the URL
    console.log("✅ Setting session with tokens from URL");
    supabase.auth.setSession({
      access_token,
      refresh_token
    }).then(({ data, error }) => {
      if (error) {
        console.error("❌ Session setting error:", error);
        toast({
          title: "Session Error",
          description: "Failed to establish reset session. Please try again.",
          variant: "destructive",
        });
        navigate('/forgot-password');
      } else {
        console.log("✅ Session set successfully:", data.session?.user?.email);
      }
    });
  }, [navigate, toast]);

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
        
        if (error.message.includes('token') || error.message.includes('session')) {
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
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
  const [hasValidTokens, setHasValidTokens] = useState<boolean | null>(null);

  // Parse both tokens and errors from URL
  const parseUrlParams = () => {
    console.log("🔍 Current URL:", window.location.href);
    console.log("🔍 URL hash:", window.location.hash);
    console.log("🔍 URL search:", window.location.search);
    
    // Try hash fragments first (standard for Supabase auth)
    const hash = window.location.hash.substring(1);
    let params = new URLSearchParams(hash);
    let source = 'hash';
    
    // Fallback to search params if no auth-related tokens in hash
    if (!params.get('access_token') && !params.get('error') && !params.get('type') && window.location.search) {
      console.log("🔍 No auth tokens in hash, checking search params");
      params = new URLSearchParams(window.location.search);
      source = 'search';
    }
    
    const tokens = {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      type: params.get('type'),
      token: params.get('token'), // Sometimes Supabase uses 'token' instead
    };
    
    const errors = {
      error: params.get('error'),
      error_code: params.get('error_code'),
      error_description: params.get('error_description')
    };
    
    console.log("🔍 Extracted tokens:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasToken: !!tokens.token,
      type: tokens.type,
      accessTokenLength: tokens.access_token?.length || 0,
      refreshTokenLength: tokens.refresh_token?.length || 0,
      tokenLength: tokens.token?.length || 0,
      source
    });
    
    console.log("🔍 Extracted errors:", errors);
    
    return { tokens, errors };
  };

  useEffect(() => {
    // Parse both tokens and errors from URL
    const { tokens, errors } = parseUrlParams();
    const { access_token, refresh_token, type, token } = tokens;
    
    console.log("🔍 Token validation:", {
      hasAccessRefreshTokens: !!(access_token && refresh_token),
      hasToken: !!token,
      isRecoveryType: type === 'recovery',
      currentPath: window.location.pathname,
      hasErrors: !!(errors.error)
    });
    
    // Check for URL-based errors first (like expired links)
    if (errors.error) {
      console.log("❌ Error in URL:", errors);
      setHasValidTokens(false);
      
      let errorMessage = "Problem with Reset Link";
      let errorDescription = "Please request a new reset link.";
      
      if (errors.error_code === 'otp_expired' || errors.error === 'access_denied') {
        errorMessage = "Reset Link Expired";
        errorDescription = "This password reset link has expired. Reset links are only valid for 1 hour. Please request a new one.";
      } else if (errors.error_description) {
        errorDescription = decodeURIComponent(errors.error_description.replace(/\+/g, ' '));
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      });
      
      // Don't return immediately - still show the manual mode
      setHasValidTokens(false);
      return;
    }
    
    // Check if we have valid tokens (multiple patterns)
    const hasValidTokenPattern = 
      (access_token && refresh_token) || // Standard pattern
      (token && type === 'recovery') ||  // Alternative pattern
      type === 'recovery'; // Recovery type indicates this is a reset flow
    
    if (!hasValidTokenPattern) {
      console.log("❌ No valid tokens found - showing manual mode");
      setHasValidTokens(false);
      return;
    }

    // We have valid tokens - proceed with token mode
    console.log("✅ Valid tokens found - setting session");
    setHasValidTokens(true);
    
    // If we have access/refresh tokens, set the session
    if (access_token && refresh_token) {
      supabase.auth.setSession({
        access_token,
        refresh_token
      }).then(({ data, error }) => {
        if (error) {
          console.error("❌ Session setting error:", error);
          setHasValidTokens(false);
          toast({
            title: "Session Error",
            description: "Failed to establish reset session. The reset link may be invalid or expired.",
            variant: "destructive",
          });
        } else {
          console.log("✅ Session set successfully:", data.session?.user?.email);
        }
      });
    }
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

  // Show loading state while checking tokens
  if (hasValidTokens === null) {
    return (
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking reset link...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show password reset form if we have valid tokens
  if (hasValidTokens === true) {
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
  }

  // Show information screen for users who navigated directly (no tokens)
  return (
    <Card className="w-full max-w-md bg-card border-border shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Reset Your Password
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          How to reset your password
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              No reset link detected
            </p>
            <p className="text-sm text-muted-foreground">
              To reset your password, you need to click on the reset link from the email we sent you.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Follow these steps:</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <span className="font-medium text-foreground">1.</span>
              <span>Go to the "Forgot Password" page</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-medium text-foreground">2.</span>
              <span>Enter your email address</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-medium text-foreground">3.</span>
              <span>Check your email for the reset link</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-medium text-foreground">4.</span>
              <span>Click the "Reset Password" button in the email</span>
            </li>
          </ol>
        </div>

        <div className="flex flex-col space-y-2 pt-4">
          <Button 
            onClick={() => navigate('/forgot-password')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Go to Forgot Password
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
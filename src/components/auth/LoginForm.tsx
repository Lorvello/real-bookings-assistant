import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PasswordInput } from './PasswordInput';
import { GoogleAuthButton } from './GoogleAuthButton';
import { validateEmail } from '@/utils/inputSanitization';
import { InfoIcon, ArrowLeft } from 'lucide-react';
import { formatDistance } from 'date-fns';
import ReCAPTCHA from 'react-google-recaptcha';

interface LastLoginInfo {
  login_time: string;
  location_city?: string;
  location_country?: string;
  device_type?: string;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [lastLoginInfo, setLastLoginInfo] = useState<LastLoginInfo | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Load last login info when email changes
  useEffect(() => {
    const loadLastLogin = async () => {
      if (!formData.email || !validateEmail(formData.email).valid) return;

      try {
        // Get the user ID first
        const { data: userData } = await supabase
          .from('login_history')
          .select('login_time, location_city, location_country, user_id')
          .eq('success', true)
          .order('login_time', { ascending: false })
          .limit(1);

        if (userData && userData.length > 0) {
          setLastLoginInfo(userData[0] as LastLoginInfo);
        }
      } catch (error) {
        console.error('Failed to load last login info:', error);
      }
    };

    const timeoutId = setTimeout(loadLastLogin, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate and sanitize email
    const emailResult = validateEmail(formData.email);
    
    if (!emailResult.valid) {
      toast({
        title: "Validation Error",
        description: emailResult.errors[0] || "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.password) {
      toast({
        title: "Validation Error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    // Show CAPTCHA after 3 failed attempts
    if (failedAttempts >= 3 && !captchaToken) {
      setShowCaptcha(true);
      toast({
        title: "Verification Required",
        description: "Please complete the CAPTCHA to continue",
        variant: "default",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[Login] Starting email login for:', emailResult.value);
      
      // Sign in with remember device option
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailResult.value!,
        password: formData.password
      });

      if (error) {
        console.error('[Login] Email login error:', error);
        
        // Increment failed attempts
        setFailedAttempts(prev => prev + 1);
        
        // Show CAPTCHA on 3rd failure
        if (failedAttempts + 1 >= 3) {
          setShowCaptcha(true);
        }
        
        // Handle email not confirmed - redirect to verification
        if (error.message === 'email_not_confirmed') {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email address before signing in.",
            variant: "destructive",
          });
          navigate('/verify-email', { state: { email: emailResult.value } });
          return;
        }
        
        // Handle invalid_credentials - could be wrong email or wrong password
        if (error.message === 'Invalid login credentials' || error.message.toLowerCase().includes('invalid') && error.message.toLowerCase().includes('credentials')) {
          toast({
            title: "Invalid Credentials",
            description: (
              <div className="space-y-2">
                <p>The email or password you entered is incorrect.</p>
                <p className="text-sm">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => navigate('/signup', { state: { email: emailResult.value } })}
                    className="text-primary underline hover:text-primary/80 font-medium"
                  >
                    Sign up here
                  </button>
                </p>
              </div>
            ),
            variant: "destructive",
          });
          return;
        }
        
        const errorMessages = {
          'too_many_requests': 'Too many login attempts. Please wait 15 minutes and try again.',
          'signup_disabled': 'Account creation is currently disabled. Please contact support.',
          'email_address_invalid': 'Please enter a valid email address.',
          'weak_password': 'Password does not meet security requirements.',
          'user_not_found': 'No account found with this email address. Please check your email or create a new account.',
          'account_suspended': 'Your account has been suspended. Please contact support for assistance.',
          'network_request_failed': 'Network connection failed. Please check your internet connection and try again.'
        };
        
        const userFriendlyMessage = errorMessages[error.message as keyof typeof errorMessages] || 
          (error.message.includes('network') ? 'Connection failed. Please check your internet and try again.' : 
           'Unable to sign in. Please try again or contact support if the issue continues.');
        
        toast({
          title: "Sign In Failed",
          description: userFriendlyMessage,
          variant: "destructive",
        });
        return;
      }

      console.log('[Login] Email login successful:', data);
      
      // Reset failed attempts on success
      setFailedAttempts(0);
      setShowCaptcha(false);
      
      // Clear any stale password reset markers to prevent redirect issues
      sessionStorage.removeItem('password-reset-requested');
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('[Login] Unexpected login error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-card border-border shadow-xl relative">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <CardHeader className="text-center pt-12">
        <CardTitle className="text-2xl font-bold text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your AI booking assistant
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Show last login info */}
        {lastLoginInfo && (
          <Alert className="mb-4">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Last login</AlertTitle>
            <AlertDescription>
              {formatDistance(new Date(lastLoginInfo.login_time), new Date(), { addSuffix: true })}
              {lastLoginInfo.location_city && lastLoginInfo.location_country && (
                <> from {lastLoginInfo.location_city}, {lastLoginInfo.location_country}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email Address
            </Label>
            <Input 
              type="email" 
              id="email" 
              required 
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              autoComplete="email"
              placeholder="Enter your email" 
            />
          </div>
          
          <PasswordInput
            id="password"
            value={formData.password}
            onChange={handleInputChange}
            disabled={loading}
            required
          />

          {/* CAPTCHA after 3 failed attempts */}
          {showCaptcha && (
            <div className="mt-4">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                onChange={setCaptchaToken}
              />
            </div>
          )}

          {/* Remember this device */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberDevice"
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
            />
            <Label htmlFor="rememberDevice" className="text-sm text-muted-foreground cursor-pointer">
              Remember this device for 30 days
            </Label>
          </div>

          <Button
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 mt-6"
            style={{ backgroundColor: '#10B981' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleAuthButton mode="signin" />
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 underline">
            Forgot your password?
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-primary hover:text-primary/80 underline">
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

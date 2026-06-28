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
import { nl as nlDateLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import ReCAPTCHA from 'react-google-recaptcha';

interface LastLoginInfo {
  login_time: string;
  location_city?: string;
  location_country?: string;
  device_type?: string;
}

export const LoginForm: React.FC = () => {
  const { t, i18n } = useTranslation('auth');
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
        title: t('auth.login.toastValidationError', 'Validation Error'),
        description: emailResult.errors[0] || t('auth.login.toastValidEmail', 'Please enter a valid email address'),
        variant: "destructive",
      });
      return;
    }

    if (!formData.password) {
      toast({
        title: t('auth.login.toastValidationError', 'Validation Error'),
        description: t('auth.login.toastEnterPassword', 'Please enter your password'),
        variant: "destructive",
      });
      return;
    }

    // Show CAPTCHA after 3 failed attempts
    if (failedAttempts >= 3 && !captchaToken) {
      setShowCaptcha(true);
      toast({
        title: t('auth.login.toastVerifReq', 'Verification Required'),
        description: t('auth.login.toastCaptcha', 'Please complete the CAPTCHA to continue'),
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
            title: t('auth.login.toastEmailNotVerifiedTitle', 'Email Not Verified'),
            description: t('auth.login.toastEmailNotVerifiedDesc', 'Please verify your email address before signing in.'),
            variant: "destructive",
          });
          navigate('/verify-email', { state: { email: emailResult.value } });
          return;
        }
        
        // Handle invalid_credentials - could be wrong email or wrong password
        if (error.message === 'Invalid login credentials' || error.message.toLowerCase().includes('invalid') && error.message.toLowerCase().includes('credentials')) {
          toast({
            title: t('auth.login.toastInvalidCredTitle', 'Invalid Credentials'),
            description: (
              <div className="space-y-2">
                <p>{t('auth.login.toastInvalidCredDesc', 'The email or password you entered is incorrect.')}</p>
                <p className="text-sm">
                  {t('auth.login.noAccount', "Don't have an account?")}{' '}
                  <button
                    onClick={() => navigate('/signup', { state: { email: emailResult.value } })}
                    className="text-primary underline hover:text-primary/80 font-medium"
                  >
                    {t('auth.login.signupHere', 'Sign up here')}
                  </button>
                </p>
              </div>
            ),
            variant: "destructive",
          });
          return;
        }
        
        const errorMessages = {
          'too_many_requests': t('auth.login.errTooMany', 'Too many login attempts. Please wait 15 minutes and try again.'),
          'signup_disabled': t('auth.login.errSignupDisabled', 'Account creation is currently disabled. Please contact support.'),
          'email_address_invalid': t('auth.login.errEmailInvalid', 'Please enter a valid email address.'),
          'weak_password': t('auth.login.errWeakPassword', 'Password does not meet security requirements.'),
          'user_not_found': t('auth.login.errUserNotFound', 'No account found with this email address. Please check your email or create a new account.'),
          'account_suspended': t('auth.login.errSuspended', 'Your account has been suspended. Please contact support for assistance.'),
          'network_request_failed': t('auth.login.errNetwork', 'Network connection failed. Please check your internet connection and try again.')
        };

        const userFriendlyMessage = errorMessages[error.message as keyof typeof errorMessages] ||
          (error.message.includes('network') ? t('auth.login.errConnFailed', 'Connection failed. Please check your internet and try again.') :
           t('auth.login.errGeneric', 'Unable to sign in. Please try again or contact support if the issue continues.'));

        toast({
          title: t('auth.login.toastSignInFailed', 'Sign In Failed'),
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
        title: t('auth.login.toastWelcomeTitle', 'Welcome back!'),
        description: t('auth.login.toastWelcomeDesc', 'You have successfully logged in.'),
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('[Login] Unexpected login error:', error);
      toast({
        title: t('auth.login.toastErrorTitle', 'Error'),
        description: t('auth.login.toastSomethingWrong', 'Something went wrong. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] shadow-2xl shadow-black/40 backdrop-blur relative">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('auth.login.back', 'Back')}
      </Button>
      <CardHeader className="text-center pt-12">
        <CardTitle className="text-2xl font-bold text-foreground">
          {t('auth.login.title', 'Welcome Back')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('auth.login.subtitle', 'Sign in to your AI booking assistant')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Show last login info */}
        {lastLoginInfo && (
          <Alert className="mb-4">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>{t('auth.login.lastLogin', 'Last login')}</AlertTitle>
            <AlertDescription>
              {formatDistance(new Date(lastLoginInfo.login_time), new Date(), { addSuffix: true, locale: i18n.language === 'nl' ? nlDateLocale : undefined })}
              {lastLoginInfo.location_city && lastLoginInfo.location_country && (
                <>{t('auth.login.lastLoginFrom', ' from {{city}}, {{country}}', { city: lastLoginInfo.location_city, country: lastLoginInfo.location_country })}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              {t('auth.login.email', 'Email Address')}
            </Label>
            <Input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              autoComplete="email"
              placeholder={t('auth.login.emailPlaceholder', 'Enter your email')}
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
              aria-label={t('auth.login.rememberDeviceAria', 'Remember this device for 30 days')}
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
            />
            <Label htmlFor="rememberDevice" className="text-sm text-muted-foreground cursor-pointer">
              {t('auth.login.rememberDevice', 'Remember this device for 30 days')}
            </Label>
          </div>

          <Button
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 mt-6"
            style={{ backgroundColor: '#10B981' }}
          >
            {loading ? t('auth.login.signingIn', 'Signing In...') : t('auth.login.signIn', 'Sign In')}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.login.orContinue', 'or continue with')}</span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleAuthButton mode="signin" />
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 underline">
            {t('auth.login.forgotPassword', 'Forgot your password?')}
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.login.noAccount', "Don't have an account?")}{' '}
            <Link to="/signup" className="font-medium text-primary hover:text-primary/80 underline">
              {t('auth.login.signUp', 'Sign up')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

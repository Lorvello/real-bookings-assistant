import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserRegistration } from '@/hooks/useUserRegistration';
import { CheckCircle, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { validatePassword } from '@/utils/passwordValidation';
import { validateEmail, validatePhoneNumber, sanitizeText } from '@/utils/inputSanitization';

interface SignupFormData {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const initialFormData: SignupFormData = {
  fullName: '',
  email: '',
  phone: '',
  countryCode: '+31',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
};

const countryCodes = [
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+1', country: 'United States' },
  { code: '+34', country: 'Spain' },
  { code: '+39', country: 'Italy' }
];

export const StreamlinedSignup: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const { registerUser, loading } = useUserRegistration();
  const [formData, setFormData] = useState<SignupFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill email if passed from login page
  useEffect(() => {
    const state = location.state as { email?: string } | null;
    if (state?.email) {
      setFormData(prev => ({ ...prev, email: state.email }));
    }
  }, [location.state]);

  const updateFormData = (field: keyof SignupFormData, value: string | boolean) => {
    let processedValue = value;
    
    // Apply new validation API for better security
    if (typeof value === 'string') {
      if (field === 'email') {
        const result = validateEmail(value, { allowEmpty: true });
        processedValue = result.sanitized;
      } else if (field === 'phone') {
        const result = validatePhoneNumber(value, { allowEmpty: true, defaultCountry: 'NL' });
        processedValue = result.sanitized;
      } else if (field === 'fullName') {
        const result = sanitizeText(value, { allowEmpty: true, maxLength: 200 });
        processedValue = result.sanitized;
      } else {
        const result = sanitizeText(value, { allowEmpty: true });
        processedValue = result.sanitized;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t('auth.signup.errFullName', 'Full name is required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('auth.signup.errEmailRequired', 'Email address is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.signup.errEmailInvalid', 'Please enter a valid email address');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('auth.signup.errPhone', 'Phone number is required');
    }

    if (!formData.password) {
      newErrors.password = t('auth.signup.errPasswordRequired', 'Password is required');
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0] || t('auth.signup.errPasswordWeak', 'Password does not meet security requirements');
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.signup.errConfirmRequired', 'Please confirm your password');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.signup.errPasswordsNoMatch', 'Passwords do not match');
    }


    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = t('auth.signup.errTerms', 'You must agree to the terms and privacy policy');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.countryCode + formData.phone
      };

      const result = await registerUser(registrationData);
      
      if (result.success) {
        // Clear any stale password reset markers to prevent redirect issues
        sessionStorage.removeItem('password-reset-requested');
        // No session yet (email confirmation required) -> show the verify page,
        // not the auth-gated dashboard (which would bounce to /login). With
        // mailer_autoconfirm on, a session exists and we go straight to setup.
        if (result.needsEmailVerification) {
          navigate('/verify-email', { state: { email: formData.email } });
        } else {
          navigate('/dashboard');
        }
      } else {
        // Handle specific registration errors
        let errorMessage = result.error || t('auth.signup.errRegistration', 'Registration failed. Please try again.');

        if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
          errorMessage = t('auth.signup.errAccountExists', 'An account with {{email}} already exists. Try signing in instead.', { email: formData.email });
          setErrors({
            general: errorMessage,
            email: t('auth.signup.errEmailAlreadyRegistered', 'This email is already registered')
          });
        } else if (result.error?.includes('invalid email')) {
          setErrors({
            general: t('auth.signup.errEmailInvalidGeneral', 'Please enter a valid email address.'),
            email: t('auth.signup.errEmailInvalidFormat', 'Invalid email format')
          });
        } else if (result.error?.includes('password')) {
          setErrors({
            general: t('auth.signup.errPasswordRequirementsGeneral', 'Password does not meet security requirements.'),
            password: t('auth.signup.errPasswordTooWeak', 'Password too weak')
          });
        } else {
          setErrors({ general: errorMessage });
        }
      }
    } catch (error) {
      setErrors({ general: t('auth.signup.errUnexpected', 'An unexpected error occurred. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full justify-center">
      <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] shadow-2xl shadow-black/40 backdrop-blur relative">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('auth.signup.back', 'Back')}
        </Button>
        <CardHeader className="text-center pt-12">
          <CardTitle className="text-2xl font-bold text-foreground">
            {t('auth.signup.title', 'Create Your Account')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('auth.signup.subtitle', 'Set up your WhatsApp booking assistant account - complete business setup after registration')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* General Error */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.signup.fullName', 'Full Name *')}</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
                placeholder={t('auth.signup.fullNamePlaceholder', 'Enter your full name')}
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.signup.email', 'Email Address *')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder={t('auth.signup.emailPlaceholder', 'Enter your email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.signup.phone', 'Phone Number *')}</Label>
              <div className="flex">
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) => updateFormData('countryCode', value)}
                >
                  <SelectTrigger className="w-[110px]" aria-label={t('auth.signup.countryCodeAria', 'Country dialing code')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder={t('auth.signup.phonePlaceholder', 'Enter phone number')}
                  className={`ml-2 flex-1 ${errors.phone ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <PasswordInput
                label={t('auth.signup.passwordLabel', 'Password')}
                placeholder={t('auth.signup.passwordPlaceholder', 'Create a strong password (8+ chars, numbers, special chars)')}
                value={formData.password}
                onChange={(value) => updateFormData('password', value)}
                showStrengthIndicator={true}
                required={true}
                error={errors.password}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.signup.confirmPassword', 'Confirm Password *')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  placeholder={t('auth.signup.confirmPasswordPlaceholder', 'Confirm your password')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={showConfirmPassword
                    ? t('auth.passwordInput.hidePassword', 'Hide password')
                    : t('auth.passwordInput.showPassword', 'Show password')}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center space-x-1 text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{t('auth.signup.passwordsMatch', 'Passwords match')}</span>
                </div>
              )}
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>


            {/* Terms and Privacy */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  aria-label={t('auth.signup.agreeAria', 'I agree to the Terms of Service and Privacy Policy')}
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => updateFormData('agreeToTerms', checked as boolean)}
                />
                <Label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed">
                  {t('auth.signup.agreePrefix', 'I agree to the')}{' '}
                  <Link to="/terms-of-service" className="text-primary hover:text-primary/80 underline">
                    {t('auth.signup.terms', 'Terms of Service')}
                  </Link>{' '}
                  {t('auth.signup.and', 'and')}{' '}
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80 underline">
                    {t('auth.signup.privacy', 'Privacy Policy')}
                  </Link>
                </Label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-red-500">{errors.agreeToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 mt-6"
              style={{ backgroundColor: '#10B981' }}
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.signup.creating', 'Creating Account...')}
                </>
              ) : (
                t('auth.signup.startTrial', 'Start 30-Day Free Trial')
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('auth.signup.orSignUp', 'or sign up with')}</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <GoogleAuthButton mode="signup" />
          </form>

          {/* Trust Indicator */}
          <div className="text-sm text-muted-foreground text-center mt-3">
            {t('auth.signup.trust', 'Cancel anytime • No credit card required')}
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.signup.haveAccount', 'Already have an account?')}{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80 underline"
              >
                {t('auth.signup.signIn', 'Sign in')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
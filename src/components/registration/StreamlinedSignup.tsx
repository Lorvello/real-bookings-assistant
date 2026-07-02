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
import type { CountryCode } from 'libphonenumber-js';

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

// Maps the signup form's dial-code dropdown (formData.countryCode) to the
// ISO 3166-1 alpha-2 code libphonenumber-js expects as defaultCountry, so a
// bare national-format phone number is parsed against the country the user
// actually selected instead of always assuming NL.
const DIAL_CODE_TO_COUNTRY: Record<string, CountryCode> = {
  '+31': 'NL',
  '+32': 'BE',
  '+49': 'DE',
  '+33': 'FR',
  '+44': 'GB',
  '+1': 'US',
  '+34': 'ES',
  '+39': 'IT'
};

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
    // P1-COUNTRYCODE-STALE: when the country-code dropdown changes AFTER the
    // phone number was already typed, the previously-normalized value (which
    // was resolved against the OLD country) must be re-normalized against the
    // NEWLY selected country here too, not just on the phone field's own
    // onChange. Without this, switching +31 -> +44 with no further edit to
    // the phone field silently kept the stale +31-prefixed value.
    let phoneRenormalized: string | undefined;

    // Apply new validation API for better security
    if (typeof value === 'string') {
      if (field === 'email') {
        const result = validateEmail(value, { allowEmpty: true });
        processedValue = result.sanitized;
      } else if (field === 'phone') {
        // Resolve defaultCountry from the user's selected dial-code dropdown
        // (formData.countryCode), not a hardcoded 'NL', so a national-format
        // number typed under e.g. a +44 selection normalizes to a correct UK
        // E.164 number instead of being mis-parsed as Dutch.
        const defaultCountry = DIAL_CODE_TO_COUNTRY[formData.countryCode] || 'NL';
        const result = validatePhoneNumber(value, { allowEmpty: true, defaultCountry });
        processedValue = result.sanitized;
      } else if (field === 'countryCode') {
        // Re-run phone normalization against the newly-selected country so an
        // already-typed number never submits stale-prefixed for the country
        // the user picked last.
        //
        // formData.phone is already E.164 (has an explicit "+" calling code
        // from the OLD selection) by the time the phone field's own onChange
        // has run once. libphonenumber-js ALWAYS honors an explicit "+"
        // calling code over the defaultCountry hint, so simply re-parsing
        // formData.phone as-is against the new country is a no-op (it stays
        // "+31...", GB or not). Strip the OLD selection's calling-code prefix
        // first (formData.countryCode, the dropdown value BEFORE this change)
        // to recover the bare national digits, then re-normalize those digits
        // against the NEW country so the "+" prefix actually changes.
        const oldDialCode = formData.countryCode;
        const nationalDigits = formData.phone.startsWith(oldDialCode)
          ? formData.phone.slice(oldDialCode.length)
          : formData.phone;
        const defaultCountry = DIAL_CODE_TO_COUNTRY[value] || 'NL';
        const result = validatePhoneNumber(nationalDigits, { allowEmpty: true, defaultCountry });
        phoneRenormalized = result.sanitized;
        processedValue = value;
      } else if (field === 'fullName') {
        // P4-NAMESPACE fix: sanitizeText() is shared with the booking-flow Zod
        // .transform() (bookingSchema.ts / usePublicBookingCreation.tsx) which is
        // only evaluated once at submit time there, so its unconditional .trim()
        // is harmless in that context. Here it runs on EVERY keystroke via
        // updateFormData, so a live-typed "Robert Achterberg" trims back to
        // "Robert" the instant the trailing space lands, silently eating every
        // inter-word space as the user types (see P4-NAMESPACE, IUX R14/R15).
        // Keep every security-relevant transform sanitizeText does (HTML-escape,
        // control-char strip, zero-width-char strip via its own .sanitized
        // output) but restore the plain-whitespace trim() would have removed.
        // Safe because trim() ONLY strips whitespace characters, and whitespace
        // is never itself a sanitize target (not touched by the HTML-escape,
        // control-char, or zero-width-char passes above), so re-attaching the
        // ORIGINAL leading/trailing whitespace onto the already-sanitized,
        // already-escaped core cannot reintroduce anything sanitizeText removed.
        // handleSubmit() applies a final .trim() before this reaches the API, so
        // a value that happens to still have a trailing space when the user
        // clicks submit never leaks a stray space into the stored full name.
        const result = sanitizeText(value, { allowEmpty: true, maxLength: 200 });
        const leadingWs = value.match(/^\s*/)?.[0] ?? '';
        const trailingWs = value.match(/\s*$/)?.[0] ?? '';
        processedValue = (leadingWs + result.sanitized + trailingWs).slice(0, 200);
      } else {
        const result = sanitizeText(value, { allowEmpty: true });
        processedValue = result.sanitized;
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
      ...(phoneRenormalized !== undefined ? { phone: phoneRenormalized } : {})
    }));

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
    } else {
      // P1-COUNTRYCODE-STALE defense in depth: updateFormData() keeps
      // formData.phone re-normalized against the selected country on every
      // phone keystroke AND every dropdown change, so by the time we get
      // here it should already be a valid E.164 number for the selected
      // country. Re-validate at submit time anyway (against the CURRENTLY
      // selected country) as a backstop, so a stale or otherwise malformed
      // value can never silently reach registerUser() even if some future
      // code path stops keeping formData.phone in sync.
      const defaultCountry = DIAL_CODE_TO_COUNTRY[formData.countryCode] || 'NL';
      const phoneCheck = validatePhoneNumber(formData.phone, { defaultCountry });
      if (!phoneCheck.valid) {
        newErrors.phone = t('auth.signup.errPhoneInvalid', 'Please enter a valid phone number for the selected country');
      }
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
        // P4-NAMESPACE: updateFormData() intentionally keeps live-typed interior/
        // trailing spaces in formData.fullName (see the comment there) so the
        // field no longer eats spaces while the user types. Final .trim() here
        // matches validateForm()'s own required-field check (which already
        // trims) so a name that happens to end mid-typing right after a space
        // never submits with a stray trailing space.
        fullName: formData.fullName.trim(),
        // formData.phone is already sanitized to a full E.164 number (incl.
        // country calling code) by validatePhoneNumber() in updateFormData();
        // prepending formData.countryCode here double-counted the dialing
        // code (e.g. "+31" + "+31600000399" -> "+31+31600000399").
        phone: formData.phone
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
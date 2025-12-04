import React, { useState, useEffect } from 'react';
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

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    
    strength = checks.filter(Boolean).length;
    
    if (strength < 2) return { level: 'weak', color: 'bg-red-500', text: 'Weak' };
    if (strength < 4) return { level: 'medium', color: 'bg-yellow-500', text: 'Medium' };
    return { level: 'strong', color: 'bg-green-500', text: 'Strong' };
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0] || 'Password does not meet security requirements';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }


    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and privacy policy';
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
        navigate('/dashboard');
      } else {
        // Handle specific registration errors
        let errorMessage = result.error || 'Registration failed. Please try again.';
        
        if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
          errorMessage = `An account with ${formData.email} already exists. Try signing in instead.`;
          setErrors({ 
            general: errorMessage,
            email: 'This email is already registered'
          });
        } else if (result.error?.includes('invalid email')) {
          setErrors({ 
            general: 'Please enter a valid email address.',
            email: 'Invalid email format'
          });
        } else if (result.error?.includes('password')) {
          setErrors({ 
            general: 'Password does not meet security requirements.',
            password: 'Password too weak'
          });
        } else {
          setErrors({ general: errorMessage });
        }
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
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
            Create Your Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Set up your WhatsApp booking assistant account - complete business setup after registration
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
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
                placeholder="Enter your full name"
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="Enter your email"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex">
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) => updateFormData('countryCode', value)}
                >
                  <SelectTrigger className="w-[110px]">
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
                  placeholder="Enter phone number"
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
                label="Password *"
                placeholder="Create a strong password (8+ chars, numbers, special chars)"
                value={formData.password}
                onChange={(value) => updateFormData('password', value)}
                showStrengthIndicator={true}
                required={true}
                error={errors.password}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center space-x-1 text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Passwords match</span>
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
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => updateFormData('agreeToTerms', checked as boolean)}
                />
                <Label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms-of-service" className="text-primary hover:text-primary/80 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80 underline">
                    Privacy Policy
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
                  Creating Account...
                </>
              ) : (
                'Start 30-Day Free Trial'
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or sign up with</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <GoogleAuthButton mode="signup" />
          </form>

          {/* Trust Indicator */}
          <div className="text-sm text-muted-foreground text-center mt-3">
            Cancel anytime • No credit card required
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-medium text-primary hover:text-primary/80 underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
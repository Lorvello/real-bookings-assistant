import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { useUserRegistration } from '@/hooks/useUserRegistration';
import { CheckCircle, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { validatePassword } from '@/utils/passwordValidation';
import { sanitizeUserInput } from '@/utils/inputSanitization';

interface SignupFormData {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  agreeToTerms: boolean;
}

const initialFormData: SignupFormData = {
  fullName: '',
  email: '',
  phone: '',
  countryCode: '+31',
  password: '',
  confirmPassword: '',
  businessName: '',
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
  const { registerUser, loading } = useUserRegistration();
  const [formData, setFormData] = useState<SignupFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof SignupFormData, value: string | boolean) => {
    let sanitizedValue = value;
    
    // Apply input sanitization for security
    if (typeof value === 'string') {
      if (field === 'email') {
        sanitizedValue = sanitizeUserInput(value, 'email');
      } else if (field === 'phone') {
        sanitizedValue = sanitizeUserInput(value, 'phone');
      } else if (field === 'fullName' || field === 'businessName') {
        sanitizedValue = sanitizeUserInput(value, 'business');
      } else {
        sanitizedValue = sanitizeUserInput(value, 'text');
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
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

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
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
        businessName: formData.businessName,
        businessType: 'consultant', // Default type
        businessAddress: {
          street: '',
          number: '',
          postal: '',
          city: '',
          country: 'Nederland'
        },
        businessEmail: formData.email,
        serviceTypes: [],
        availability: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: null,
          sunday: null
        },
        phone: formData.countryCode + formData.phone
      };

      const result = await registerUser(registrationData);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setErrors({ general: result.error || 'Registration failed. Please try again.' });
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
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Start Your Free Trial
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Create your WhatsApp booking assistant account
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

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => updateFormData('businessName', e.target.value)}
                placeholder="Enter your business name"
                className={errors.businessName ? 'border-red-500' : ''}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName}</p>
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
                  <Link to="/terms" className="text-primary hover:text-primary/80 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:text-primary/80 underline">
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
                'Start 7-Day Free Trial'
              )}
            </Button>
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
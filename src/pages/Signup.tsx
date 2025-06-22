
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserRegistration } from '@/hooks/useUserRegistration';

const Signup = () => {
  const navigate = useNavigate();
  const { registerUser, loading } = useUserRegistration();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    businessName: '',
    businessType: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validatie
    if (formData.password !== formData.confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (formData.password.length < 6) {
      setError('Wachtwoord moet minimaal 6 karakters lang zijn');
      return;
    }

    if (!formData.email || !formData.fullName || !formData.businessName || !formData.businessType) {
      setError('Alle velden zijn verplicht');
      return;
    }

    try {
      console.log('[Signup] Starting registration for:', formData.email);
      
      const result = await registerUser({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        businessName: formData.businessName,
        businessType: formData.businessType
      });

      if (result.success) {
        console.log('[Signup] Registration successful, redirecting to profile');
        navigate('/profile');
      } else {
        console.error('[Signup] Registration failed:', result.error);
        setError(result.error || 'Registratie gefaald');
      }
    } catch (error: any) {
      console.error('[Signup] Unexpected error:', error);
      setError('Er is een onverwachte fout opgetreden tijdens registratie');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Account Aanmaken</CardTitle>
          <CardDescription className="text-center">
            Maak je account aan om te beginnen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Volledige Naam *</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Voer je volledige naam in"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Bedrijfsnaam *</Label>
              <Input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={formData.businessName}
                onChange={handleInputChange}
                placeholder="Voer je bedrijfsnaam in"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Type Bedrijf *</Label>
              <Input
                id="businessType"
                name="businessType"
                type="text"
                required
                value={formData.businessType}
                onChange={handleInputChange}
                placeholder="bijv. kapper, restaurant, tandarts, fitness, schoonheidssalon..."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="naam@voorbeeld.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimaal 6 karakters"
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig Wachtwoord *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Herhaal je wachtwoord"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Account aanmaken...
                </>
              ) : (
                'Account Aanmaken'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Heb je al een account?{' '}
              <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                Inloggen
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;

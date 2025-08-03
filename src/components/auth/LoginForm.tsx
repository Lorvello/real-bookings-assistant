import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PasswordInput } from './PasswordInput';
import { validatePassword } from '@/utils/passwordValidation';
import { sanitizeUserInput } from '@/utils/inputSanitization';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize inputs for security
    const sanitizedEmail = sanitizeUserInput(formData.email, 'email');
    
    // Basic validation
    if (!sanitizedEmail || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[Login] Starting email login for:', sanitizedEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: formData.password
      });

      if (error) {
        console.error('[Login] Email login error:', error);
        
        // Handle email not confirmed - redirect to verification
        if (error.message === 'email_not_confirmed') {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email address before signing in.",
            variant: "destructive",
          });
          navigate('/verify-email', { state: { email: sanitizedEmail } });
          return;
        }
        
        const errorMessages = {
          'invalid_credentials': 'Invalid email or password. Please check your credentials and try again.',
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
    <Card className="w-full max-w-md bg-card border-border shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your AI booking assistant
        </CardDescription>
      </CardHeader>
      
      <CardContent>
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

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 mt-6"
            style={{ backgroundColor: '#10B981' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
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

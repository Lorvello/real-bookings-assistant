import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    business: ''
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[Signup] User already logged in, redirecting to profile');
        navigate('/profile');
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    
    try {
      console.log('[Signup] Starting Google signup...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
        }
      });

      if (error) {
        console.error('[Signup] Google signup error:', error);
        toast({
          title: "Google Signup Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('[Signup] Google signup initiated successfully:', data);
      // User will be redirected to Google, then back to our callback
      
    } catch (error) {
      console.error('[Signup] Unexpected Google signup error:', error);
      toast({
        title: "Error",
        description: "Something went wrong with Google signup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[Signup] Starting email signup for:', formData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            business_name: formData.business
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('[Signup] Email signup error:', error);
        
        const errorMessages = {
          'user_already_registered': 'This email is already registered. Please try logging in instead.',
          'weak_password': 'Password is too weak. Please choose a stronger password.',
          'invalid_email': 'Please enter a valid email address.'
        };
        
        toast({
          title: "Signup Error",
          description: errorMessages[error.message as keyof typeof errorMessages] || error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('[Signup] Signup response:', data);

      if (data.user) {
        if (data.user.email_confirmed_at) {
          // Email is already confirmed (auto-confirm is enabled)
          console.log('[Signup] Email auto-confirmed, redirecting to profile');
          toast({
            title: "Welcome!",
            description: "Your account has been created successfully!",
          });
          navigate('/profile?success=email_signup');
        } else {
          // Email confirmation required
          console.log('[Signup] Email confirmation required');
          toast({
            title: "Check your email!",
            description: `We've sent a confirmation link to ${formData.email}. Click the link to complete your signup.`,
            duration: 7000,
          });
          // Stay on signup page with success message
        }
      } else {
        console.log('[Signup] No user returned from signup');
        toast({
          title: "Something went wrong",
          description: "Please try again or contact support if the problem persists.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[Signup] Unexpected signup error:', error);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-20 px-4">
        <div className="flex justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
              <p className="text-gray-600">Get started with your AI booking assistant</p>
            </div>
            
            <div className="mb-6">
              <Button 
                onClick={handleGoogleSignup}
                disabled={googleLoading || loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 py-3 flex items-center justify-center gap-3"
                variant="outline"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Connecting with Google...' : 'Continue with Google'}
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
            
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input 
                  type="text" 
                  id="name" 
                  required 
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Enter your full name" 
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input 
                  type="email" 
                  id="email" 
                  required 
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Enter your email" 
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input 
                  type="password" 
                  id="password" 
                  required 
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Create a password" 
                />
              </div>
              
              <div>
                <label htmlFor="business" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input 
                  type="text" 
                  id="business" 
                  value={formData.business}
                  onChange={handleInputChange}
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Enter your organization name" 
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  id="terms" 
                  name="terms" 
                  type="checkbox" 
                  required 
                  disabled={loading || googleLoading}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed" 
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <a href="#" className="text-green-600 hover:text-green-500">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-green-600 hover:text-green-500">Privacy Policy</a>
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={loading || googleLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Start Your 7-Day Free Trial Now'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

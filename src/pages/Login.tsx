
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    // Handle URL parameters for error messages
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error) {
      const errorMessages = {
        'oauth_failed': 'Login failed. Please try again.',
        'session_failed': 'Session could not be established. Please try again.',
        'unexpected': 'An unexpected error occurred. Please try again.',
        'callback_failed': 'Login callback failed. Please try again.'
      };
      
      toast({
        title: "Login Error",
        description: errorMessages[error as keyof typeof errorMessages] || 'Login failed. Please try again.',
        variant: "destructive",
      });
    }
    
    if (message === 'please_login') {
      toast({
        title: "Please Log In",
        description: "Please log in to access your account.",
      });
    }

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[Login] User already logged in, redirecting to profile');
        navigate('/profile');
      }
    };
    
    checkUser();
  }, [searchParams, toast, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[Login] Starting email login for:', formData.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        console.error('[Login] Email login error:', error);
        
        const errorMessages = {
          'invalid_credentials': 'Invalid email or password. Please check your credentials and try again.',
          'email_not_confirmed': 'Please check your email and click the confirmation link before logging in.',
          'too_many_requests': 'Too many login attempts. Please wait a moment and try again.'
        };
        
        toast({
          title: "Login Error",
          description: errorMessages[error.message as keyof typeof errorMessages] || error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('[Login] Email login successful:', data);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate('/profile');
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-20 px-4">
        <div className="flex justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your AI booking assistant</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
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
                  disabled={loading}
                  autoComplete="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Enter your email" 
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    id="password" 
                    required 
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                    autoComplete="current-password"
                    style={{ 
                      fontFamily: showPassword ? 'inherit' : 'text-security-disc, -webkit-text-security-disc, monospace',
                      WebkitTextSecurity: showPassword ? 'none' : 'disc'
                    }}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                    placeholder="Enter your password" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-green-600 hover:text-green-500">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

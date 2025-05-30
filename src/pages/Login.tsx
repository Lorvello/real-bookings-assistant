
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error) {
      const errorMessages = {
        'oauth_failed': 'OAuth login mislukt. Probeer opnieuw.',
        'session_failed': 'Sessie kon niet worden aangemaakt. Probeer opnieuw.',
        'unexpected': 'Er ging iets mis. Probeer opnieuw.',
        'callback_failed': 'Login callback mislukt. Probeer opnieuw.'
      };
      
      toast({
        title: "Login Fout",
        description: errorMessages[error as keyof typeof errorMessages] || 'Login mislukt. Probeer opnieuw.',
        variant: "destructive",
      });
    }
    
    if (message === 'please_login') {
      toast({
        title: "Inloggen Vereist",
        description: "Log in om toegang te krijgen tot je account.",
      });
    }

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[Login] User already logged in, redirecting to dashboard');
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

  const handleGoogleLogin = async () => {
    if (googleLoading || loading) return;
    
    setGoogleLoading(true);
    
    try {
      console.log('[Login] Starting simple Google login');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile'
        }
      });

      if (error) {
        console.error('[Login] Google OAuth error:', error);
        toast({
          title: "Google Login Fout",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[Login] Unexpected Google login error:', error);
      toast({
        title: "Fout",
        description: "Er ging iets mis met Google login. Probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
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
          'invalid_credentials': 'Ongeldige email of wachtwoord. Controleer je gegevens en probeer opnieuw.',
          'email_not_confirmed': 'Controleer je email en klik op de bevestigingslink voordat je inlogt.',
          'too_many_requests': 'Te veel loginpogingen. Wacht even en probeer opnieuw.'
        };
        
        toast({
          title: "Login Fout",
          description: errorMessages[error.message as keyof typeof errorMessages] || error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('[Login] Email login successful:', data);
      toast({
        title: "Welkom terug!",
        description: "Je bent succesvol ingelogd.",
      });
      navigate('/profile');
    } catch (error) {
      console.error('[Login] Unexpected login error:', error);
      toast({
        title: "Fout",
        description: "Er ging iets mis. Probeer opnieuw.",
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welkom Terug</h1>
              <p className="text-gray-600">Log in bij je AI booking assistent</p>
            </div>
            
            <div className="mb-6">
              <Button 
                onClick={handleGoogleLogin}
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
                {googleLoading ? 'Inloggen met Google...' : 'Doorgaan met Google'}
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Of doorgaan met email</span>
              </div>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Adres
                </label>
                <input 
                  type="email" 
                  id="email" 
                  required 
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Voer je email in" 
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Wachtwoord
                </label>
                <input 
                  type="password" 
                  id="password" 
                  required 
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  placeholder="Voer je wachtwoord in" 
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading || googleLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Inloggen...' : 'Inloggen'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Nog geen account?{' '}
                <Link to="/signup" className="font-medium text-green-600 hover:text-green-500">
                  Registreren
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

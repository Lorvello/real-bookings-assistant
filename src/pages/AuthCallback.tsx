
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Since we've removed OAuth, this callback is no longer needed
    // Redirect to profile page with a message
    toast({
      title: "Redirecting",
      description: "OAuth has been replaced with direct Cal.com integration",
    });
    
    navigate('/profile');
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting...
        </h2>
        <p className="text-gray-600">
          You're being redirected to your profile
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;

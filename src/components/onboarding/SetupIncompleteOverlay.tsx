import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SetupIncompleteOverlayProps {
  children: React.ReactNode;
}

export const SetupIncompleteOverlay: React.FC<SetupIncompleteOverlayProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Background content */}
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
            <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Complete Setup To Edit This Area
            </h2>
            <p className="text-gray-400 mb-6">
              Finish your business setup to access all features and start managing your bookings.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              <Settings className="h-4 w-4 mr-2" />
              Complete Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};